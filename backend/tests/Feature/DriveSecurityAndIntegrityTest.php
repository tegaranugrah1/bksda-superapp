<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class DriveSecurityAndIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;
    private User $otherUser;
    private User $admin;
    private DriveUnit $unitA;
    private DriveUnit $unitB;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');

        $this->owner = User::create([
            'name' => 'Owner Pegawai',
            'username' => '199001012020011001',
            'email' => 'owner@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'user',
            'is_active' => true,
            'drive_quota_bytes' => 10485760, // 10 MB
        ]);

        $this->otherUser = User::create([
            'name' => 'Pegawai Lain',
            'username' => '199101012020011002',
            'email' => 'other@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'user',
            'is_active' => true,
            'drive_quota_bytes' => 10485760, // 10 MB
        ]);

        $this->admin = User::create([
            'name' => 'Super Admin',
            'username' => 'admin_drive',
            'email' => 'admin@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->unitA = DriveUnit::create([
            'slug' => 'unit-a',
            'name' => 'Unit A',
            'storage_quota_bytes' => 10485760, // 10 MB
        ]);

        $this->unitB = DriveUnit::create([
            'slug' => 'unit-b',
            'name' => 'Unit B',
            'storage_quota_bytes' => 1024, // 1 KB (untuk uji kuota penuh)
        ]);

        $this->unitA->members()->attach($this->owner->id, ['role' => 'manager']);
        $this->unitA->members()->attach($this->otherUser->id, ['role' => 'viewer']);
        $this->unitB->members()->attach($this->owner->id, ['role' => 'manager']);
    }

    public function test_bulk_upload_35_files_does_not_hit_429_and_is_isolated_from_general_api(): void
    {
        $this->actingAs($this->owner);

        for ($i = 1; $i <= 35; $i++) {
            $init = $this->postJson('/api/drive/upload/init', [
                'name' => "bulk_{$i}.pdf",
                'size' => 128,
                'mime' => 'application/pdf',
            ]);
            $init->assertStatus(200);

            Storage::disk('drive')->put($init->json('s3_key'), str_repeat('P', 128));

            $complete = $this->postJson('/api/drive/upload/complete', [
                'upload_id' => $init->json('upload_id'),
            ]);
            $complete->assertStatus(201);
        }

        // General route /api/me must not be throttled by drive_upload bucket
        $this->getJson('/api/me')->assertStatus(200);
        $this->assertEquals(35, DriveFile::where('user_id', $this->owner->id)->count());
    }

    public function test_complete_upload_rejects_missing_s3_object_duplicate_complete_and_quota_bypass(): void
    {
        $this->actingAs($this->owner);

        // 1. Missing S3 object -> 422 (no ghost file)
        $init1 = $this->postJson('/api/drive/upload/init', [
            'name' => 'ghost.pdf',
            'size' => 500,
            'mime' => 'application/pdf',
        ])->assertStatus(200);

        $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $init1->json('upload_id'),
        ])->assertStatus(422);
        $this->assertEquals(0, DriveFile::count());

        // 2. Spoofed tiny init size (10 bytes) with S3 object > 10 MB quota -> 422 + S3 object deleted
        $init2 = $this->postJson('/api/drive/upload/init', [
            'name' => 'huge.bin',
            'size' => 10,
            'mime' => 'application/octet-stream',
        ])->assertStatus(200);

        Storage::disk('drive')->put($init2->json('s3_key'), str_repeat('X', 10485761)); // 10 MB + 1 B
        $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $init2->json('upload_id'),
        ])->assertStatus(422);
        $this->assertFalse(Storage::disk('drive')->exists($init2->json('s3_key')));

        // 3. Valid upload + duplicate complete -> 201 then 409
        $init3 = $this->postJson('/api/drive/upload/init', [
            'name' => 'valid.txt',
            'size' => 50,
            'mime' => 'text/plain',
        ])->assertStatus(200);

        Storage::disk('drive')->put($init3->json('s3_key'), str_repeat('A', 50));
        $this->postJson('/api/drive/upload/complete', ['upload_id' => $init3->json('upload_id')])->assertStatus(201);
        $this->postJson('/api/drive/upload/complete', ['upload_id' => $init3->json('upload_id')])->assertStatus(409);
        $this->assertEquals(1, DriveFile::count());
    }

    public function test_unit_id_cannot_be_spoofed_when_uploading_to_personal_folder_and_abort_frees_quota(): void
    {
        $this->actingAs($this->owner);

        $personalFolder = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => null,
            'name' => 'Pribadi',
        ]);

        // Attempt to spoof unit_id = unitA while targeting personalFolder
        $init = $this->postJson('/api/drive/upload/init', [
            'name' => 'doc.txt',
            'size' => 9437184, // 9 MB of 10 MB
            'mime' => 'text/plain',
            'folder_id' => $personalFolder->id,
            'unit_id' => $this->unitA->id,
        ])->assertStatus(200);

        $upload = DriveUpload::findOrFail($init->json('upload_id'));
        $this->assertNull($upload->unit_id);

        // Next 2 MB upload blocked due to 9 MB reservation
        $this->postJson('/api/drive/upload/init', [
            'name' => 'doc2.txt',
            'size' => 2097152,
            'mime' => 'text/plain',
        ])->assertStatus(422);

        // Abort frees reservation immediately
        $this->postJson("/api/drive/upload/{$upload->id}/abort")->assertStatus(200);

        $this->postJson('/api/drive/upload/init', [
            'name' => 'doc2.txt',
            'size' => 2097152,
            'mime' => 'text/plain',
        ])->assertStatus(200);
    }

    public function test_trashed_files_still_count_toward_quota_and_restoring_child_from_trashed_folder_is_not_orphaned(): void
    {
        $this->actingAs($this->owner);

        $folder = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => null,
            'name' => 'Folder Rahasia',
        ]);

        $file = DriveFile::create([
            'user_id' => $this->owner->id,
            'unit_id' => null,
            'folder_id' => $folder->id,
            'name' => 'besar.pdf',
            's3_key' => 'personal/test/besar.pdf',
            'size_bytes' => 9437184, // 9 MB of 10 MB
            'mime_type' => 'application/pdf',
        ]);

        // Trash folder recursively
        $this->deleteJson("/api/drive/folder/{$folder->id}")->assertStatus(200);
        $this->assertSoftDeleted('drive_folders', ['id' => $folder->id]);
        $this->assertSoftDeleted('drive_files', ['id' => $file->id]);

        // Trashed file must still consume quota (cannot upload 2 MB more)
        $this->postJson('/api/drive/upload/init', [
            'name' => 'bypass.pdf',
            'size' => 2097152,
            'mime' => 'application/pdf',
        ])->assertStatus(422);

        // Search must not leak trashed folder's child
        $searchRes = $this->getJson('/api/drive?space=my&search=besar')->assertStatus(200);
        $this->assertCount(0, $searchRes->json('files'));

        // Restore ONLY the child file while parent folder stays trashed -> moved to root, visible in index
        $this->postJson("/api/drive/file/{$file->id}/restore")->assertStatus(200);
        $file->refresh();
        $this->assertNull($file->deleted_at);
        $this->assertNull($file->folder_id);

        $indexRes = $this->getJson('/api/drive?space=my')->assertStatus(200);
        $this->assertCount(1, $indexRes->json('files'));
    }

    public function test_force_delete_restricted_folder_deletes_descendants_without_leaking_to_unit_root(): void
    {
        $this->actingAs($this->owner);

        $restricted = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'name' => 'Resor Terbatas',
            'is_restricted' => true,
        ]);

        $secretFile = DriveFile::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'folder_id' => $restricted->id,
            'name' => 'intel_rahasia.pdf',
            's3_key' => 'units/unit-a/intel.pdf',
            'size_bytes' => 512,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($secretFile->s3_key, 'secret');

        $this->deleteJson("/api/drive/folder/{$restricted->id}")->assertStatus(200);
        $this->deleteJson("/api/drive/folder/{$restricted->id}/force")->assertStatus(200);

        $this->assertDatabaseMissing('drive_files', ['id' => $secretFile->id]);
        $this->assertFalse(Storage::disk('drive')->exists($secretFile->s3_key));

        // Viewer in Unit A must see 0 files at root
        $this->actingAs($this->otherUser);
        $unitRes = $this->getJson("/api/drive?space={$this->unitA->id}")->assertStatus(200);
        $this->assertCount(0, $unitRes->json('files'));
    }

    public function test_internal_share_in_personal_folder_candidates_and_per_item_can_write(): void
    {
        $this->actingAs($this->owner);

        $personalFolder = DriveFolder::create([
            'user_id' => $this->owner->id,
            'name' => 'Private Folder',
        ]);

        $file = DriveFile::create([
            'user_id' => $this->owner->id,
            'folder_id' => $personalFolder->id,
            'name' => 'shared_doc.pdf',
            's3_key' => 'personal/shared.pdf',
            'size_bytes' => 256,
            'mime_type' => 'application/pdf',
        ]);

        // Candidates endpoint accessible to regular user & returns users.id
        $candRes = $this->getJson('/api/drive/shares/candidates')->assertStatus(200);
        $this->assertTrue(collect($candRes->json('data'))->contains('id', $this->otherUser->id));

        // Share as viewer to otherUser
        $this->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'internal',
            'target_type' => 'user',
            'target_id' => $this->otherUser->id,
            'role' => 'viewer',
        ])->assertStatus(201);

        $this->actingAs($this->otherUser);
        $sharedRes = $this->getJson('/api/drive?space=my&filter=shared_with_me')->assertStatus(200);
        $this->assertCount(1, $sharedRes->json('files'));
        $this->assertFalse($sharedRes->json('files.0.can_write'));
        $this->assertFalse($sharedRes->json('can_write'));

        // Viewer can download URL but cannot rename
        $this->getJson("/api/drive/files/{$file->id}/url")->assertStatus(200);
        $this->putJson("/api/drive/file/{$file->id}/rename", ['name' => 'hacked.pdf'])->assertStatus(403);

        // Upgrade share to editor -> otherUser can rename
        $this->actingAs($this->owner);
        $this->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'internal',
            'target_type' => 'user',
            'target_id' => $this->otherUser->id,
            'role' => 'editor',
        ])->assertStatus(201);

        $this->actingAs($this->otherUser);
        $this->putJson("/api/drive/file/{$file->id}/rename", ['name' => 'edited.pdf'])->assertStatus(200);
    }

    public function test_move_folder_updates_descendants_unit_id_checks_quota_and_transfer_ownership_works(): void
    {
        $this->actingAs($this->owner);

        $parent = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'name' => 'Parent',
        ]);
        $child = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'parent_id' => $parent->id,
            'name' => 'Child',
        ]);
        $file = DriveFile::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'folder_id' => $child->id,
            'name' => 'nested.pdf',
            's3_key' => 'units/unit-a/nested.pdf',
            'size_bytes' => 4096, // > unitB 1 KB quota
            'mime_type' => 'application/pdf',
        ]);

        // Moving 4 KB folder to Unit B (1 KB quota) -> 422
        $this->postJson("/api/drive/folders/{$parent->id}/move", [
            'destination_unit_id' => $this->unitB->id,
        ])->assertStatus(422);

        // Increase Unit B quota -> move succeeds and updates child & file unit_id
        $this->unitB->update(['storage_quota_bytes' => 10485760]);
        $this->postJson("/api/drive/folders/{$parent->id}/move", [
            'destination_unit_id' => $this->unitB->id,
        ])->assertStatus(200);

        $this->assertEquals($this->unitB->id, $child->fresh()->unit_id);
        $this->assertEquals($this->unitB->id, $file->fresh()->unit_id);

        // Non-owner cannot transfer ownership -> 403
        $this->actingAs($this->otherUser);
        $this->postJson("/api/drive/folder/{$parent->id}/transfer-ownership", [
            'target_user_id' => $this->otherUser->id,
        ])->assertStatus(403);

        // Owner transfers folder ownership recursively to otherUser -> 200
        $this->actingAs($this->owner);
        $this->postJson("/api/drive/folder/{$parent->id}/transfer-ownership", [
            'target_user_id' => $this->otherUser->id,
        ])->assertStatus(200);

        $this->assertEquals($this->otherUser->id, $parent->fresh()->user_id);
        $this->assertEquals($this->otherUser->id, $child->fresh()->user_id);
        $this->assertEquals($this->otherUser->id, $file->fresh()->user_id);
    }

    public function test_security_audit_hardened_boundaries(): void
    {
        // 1. Non-Drive 'admin' (only BMN access) cannot complete another user's upload
        $nonDriveAdmin = User::create([
            'name' => 'Admin BMN Only',
            'username' => '199201012020011099',
            'email' => 'bmnadmin@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'is_active' => true,
        ]);

        $this->actingAs($this->owner);
        $init = $this->postJson('/api/drive/upload/init', [
            'name' => 'rahasia.pdf',
            'size' => 100,
            'mime' => 'application/pdf',
            'unit_id' => $this->unitA->id,
        ])->assertStatus(200);

        Storage::disk('drive')->put($init->json('s3_key'), '%PDF-1.4 test payload');

        $this->actingAs($nonDriveAdmin);
        $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $init->json('upload_id'),
        ])->assertStatus(403);

        // 2. Revoked mid-upload write access cannot complete upload; S3 object is cleaned up
        $this->actingAs($this->owner);
        $this->unitA->members()->updateExistingPivot($this->owner->id, ['role' => 'viewer']);
        $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $init->json('upload_id'),
        ])->assertStatus(403);
        $this->assertFalse(Storage::disk('drive')->exists($init->json('s3_key')));
        $this->unitA->members()->updateExistingPivot($this->owner->id, ['role' => 'editor']);

        // 3. Dangerous active extension (.svg / XML) rejected even if MIME looks like XML/plain text
        $svgInit = $this->postJson('/api/drive/upload/init', [
            'name' => 'xss_payload.svg',
            'size' => 64,
            'mime' => 'image/svg+xml',
        ])->assertStatus(200);
        Storage::disk('drive')->put($svgInit->json('s3_key'), '<?xml version="1.0"?><svg onload="alert(1)"/>');
        $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $svgInit->json('upload_id'),
        ])->assertStatus(422);
        $this->assertFalse(Storage::disk('drive')->exists($svgInit->json('s3_key')));

        // 4. Cross-space index bypass blocked: cannot read Unit B quota using own personal folder_id
        $otherPersonalFolder = DriveFolder::create([
            'user_id' => $this->otherUser->id,
            'unit_id' => null,
            'name' => 'Pribadi Other',
        ]);
        $this->actingAs($this->otherUser);
        $this->getJson("/api/drive?space={$this->unitB->id}&folder_id={$otherPersonalFolder->id}")
            ->assertStatus(403);
        $this->actingAs($this->owner);

        // 5. Restoring a file inside a trashed restricted folder is refused so it never leaks to unit root
        $restricted = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'name' => 'Resor Isolasi',
            'is_restricted' => true,
        ]);
        $childRestricted = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'parent_id' => $restricted->id,
            'name' => 'Sub Shared',
            'is_restricted' => true,
        ]);
        $secretDoc = DriveFile::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'folder_id' => $restricted->id,
            'name' => 'sandi_resor.pdf',
            's3_key' => 'units/unit-a/sandi_resor.pdf',
            'size_bytes' => 128,
            'mime_type' => 'application/pdf',
        ]);

        // Breadcrumbs on shared subfolder stop at unreadable restricted ancestor
        DriveShare::create([
            'folder_id' => $childRestricted->id,
            'user_id' => $this->otherUser->id,
            'share_type' => 'internal',
            'role' => 'viewer',
            'created_by' => $this->owner->id,
        ]);
        $this->actingAs($this->otherUser);
        $crumbRes = $this->getJson("/api/drive?space={$this->unitA->id}&folder_id={$childRestricted->id}")
            ->assertStatus(200);
        $crumbIds = collect($crumbRes->json('breadcrumbs'))->pluck('id')->all();
        $this->assertSame([$childRestricted->id], $crumbIds);

        // Trash restricted parent & attempt restoring child file -> must fail with 422
        $this->actingAs($this->owner);
        $this->deleteJson("/api/drive/folder/{$restricted->id}")->assertStatus(200);
        $this->postJson("/api/drive/file/{$secretDoc->id}/restore")->assertStatus(422);

        // 6. Former collaborator whose write access was revoked cannot delete an existing share
        $pubShare = DriveShare::create([
            'file_id' => $secretDoc->id,
            'share_type' => 'public',
            'role' => 'viewer',
            'token' => 'deadbeefdeadbeefdeadbeefdeadbeef',
            'created_by' => $this->otherUser->id,
        ]);
        $this->actingAs($this->otherUser);
        $this->deleteJson("/api/drive/shares/{$pubShare->id}")->assertStatus(403);

        // 7. Signed ZIP download rejects deactivated user without falling back to folder owner
        $activeZipFolder = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'name' => 'Active Zip Target',
        ]);
        $this->otherUser->update(['is_active' => false]);
        $zipUrl = URL::temporarySignedRoute('drive.folder.download_zip', now()->addMinutes(10), [
            'id' => $activeZipFolder->id,
            'u' => $this->otherUser->id,
        ]);
        $this->get($zipUrl)->assertStatus(403);
        $this->otherUser->update(['is_active' => true]);

        // 8. createFolder with personal parent_id + foreign unit_id must NOT bypass unit authorization
        $this->actingAs($this->otherUser);
        $bypassFolderRes = $this->postJson('/api/drive/folders', [
            'name' => 'Cross Unit Injection',
            'parent_id' => $otherPersonalFolder->id,
            'unit_id' => $this->unitA->id,
        ])->assertStatus(201);
        $this->assertNull($bypassFolderRes->json('folder.unit_id'));

        // 9. Unit editor (non-owner, non-DriveAdmin) cannot exfiltrate colleague's unit folder into Personal Drive via destination_parent_id
        $this->actingAs($this->owner);
        $colleagueUnitFolder = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'name' => 'Colleague Unit Folder',
        ]);
        $colleagueUnitFile = DriveFile::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'folder_id' => $colleagueUnitFolder->id,
            'name' => 'colleague_doc.pdf',
            's3_key' => 'units/unit-a/colleague_doc.pdf',
            'size_bytes' => 512,
            'mime_type' => 'application/pdf',
        ]);
        $unitAEditor = User::create([
            'name' => 'Unit A Editor',
            'username' => '199301012020011077',
            'email' => 'unitaeditor@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'user',
            'is_active' => true,
        ]);
        $this->unitA->members()->attach($unitAEditor->id, ['role' => 'editor']);
        $editorPersonalFolder = DriveFolder::create([
            'user_id' => $unitAEditor->id,
            'unit_id' => null,
            'name' => 'Editor Personal',
        ]);

        $this->actingAs($unitAEditor);
        $this->postJson("/api/drive/folders/{$colleagueUnitFolder->id}/move", [
            'destination_parent_id' => $editorPersonalFolder->id,
        ])->assertStatus(403);

        // 10. Unit editor cannot hijack/move colleague's file into Personal Drive
        $this->postJson("/api/drive/files/{$colleagueUnitFile->id}/move", [
            'destination_folder_id' => $editorPersonalFolder->id,
        ])->assertStatus(403);

        // 11. Collaborator with editor share on a file inside a restricted folder cannot move it out to unrestricted unit root
        $restrictedParent = DriveFolder::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'name' => 'Restricted Leak Guard',
            'is_restricted' => true,
        ]);
        $restrictedSecret = DriveFile::create([
            'user_id' => $this->owner->id,
            'unit_id' => $this->unitA->id,
            'folder_id' => $restrictedParent->id,
            'name' => 'rahasia_satwa.pdf',
            's3_key' => 'units/unit-a/rahasia_satwa.pdf',
            'size_bytes' => 256,
            'mime_type' => 'application/pdf',
        ]);
        DriveShare::create([
            'file_id' => $restrictedSecret->id,
            'user_id' => $unitAEditor->id,
            'share_type' => 'internal',
            'role' => 'editor',
            'created_by' => $this->owner->id,
        ]);
        $this->postJson("/api/drive/files/{$restrictedSecret->id}/move", [
            'destination_unit_id' => $this->unitA->id,
        ])->assertStatus(403);
    }
}
