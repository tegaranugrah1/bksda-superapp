<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriveDeepRootSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected User $otherUser;
    protected DriveUnit $unit;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');

        $this->user = User::create([
            'name' => 'Staf Test Root',
            'username' => 'staf_root',
            'email' => 'staf_root@bksda.local',
            'password' => Hash::make('secret123'),
            'role' => 'user',
            'access_modules' => [],
        ]);

        $this->otherUser = User::create([
            'name' => 'Attacker User',
            'username' => 'attacker',
            'email' => 'attacker@bksda.local',
            'password' => Hash::make('secret123'),
            'role' => 'user',
            'access_modules' => [],
        ]);

        $this->unit = DriveUnit::firstOrCreate(['slug' => 'balai-samarinda'], [
            'name' => 'Balai BKSDA Samarinda',
            'storage_quota_bytes' => 107374182400, // 100 GB
        ]);

        $this->unit->members()->attach($this->user->id, ['role' => 'editor']);
    }

    /**
     * Root Invariant 1: Cegah pembuatan subfolder di dalam folder induk yang sudah masuk Trash (Anti-Orphaned Node).
     */
    public function test_cannot_create_subfolder_inside_soft_deleted_parent(): void
    {
        Sanctum::actingAs($this->user);

        $parent = DriveFolder::create([
            'name' => 'Parent Folder',
            'user_id' => $this->user->id,
            'unit_id' => $this->unit->id,
        ]);

        // Soft-delete parent folder
        $parent->delete();
        $this->assertSoftDeleted('drive_folders', ['id' => $parent->id]);

        $response = $this->postJson('/api/drive/folders', [
            'name' => 'Orphan Subfolder',
            'parent_id' => $parent->id,
            'unit_id' => $this->unit->id,
        ]);

        $response->assertStatus(404);
        $response->assertJsonFragment(['message' => 'Folder induk tidak ditemukan atau sudah dihapus.']);

        $this->assertDatabaseMissing('drive_folders', [
            'name' => 'Orphan Subfolder',
            'parent_id' => $parent->id,
        ]);
    }

    /**
     * Root Invariant 2: Cegah inisialisasi upload ke dalam folder yang sudah dihapus/trashed.
     */
    public function test_cannot_init_upload_inside_soft_deleted_folder(): void
    {
        Sanctum::actingAs($this->user);

        $folder = DriveFolder::create([
            'name' => 'Target Upload Folder',
            'user_id' => $this->user->id,
            'unit_id' => $this->unit->id,
        ]);

        $folder->delete();

        $response = $this->postJson('/api/drive/upload/init', [
            'name' => 'document.pdf',
            'size' => 1048576,
            'mime' => 'application/pdf',
            'folder_id' => $folder->id,
            'unit_id' => $this->unit->id,
        ]);

        $response->assertStatus(404);
        $response->assertJsonFragment(['message' => 'Folder tujuan tidak ditemukan atau sudah dihapus.']);
    }

    /**
     * Root Invariant 3: Jika folder tujuan dihapus di tengah-tengah proses upload, completeUpload harus abort & bersihkan S3.
     */
    public function test_cannot_complete_upload_if_target_folder_deleted_mid_stream(): void
    {
        Sanctum::actingAs($this->user);

        $folder = DriveFolder::create([
            'name' => 'Active Folder',
            'user_id' => $this->user->id,
            'unit_id' => $this->unit->id,
        ]);

        $initResp = $this->postJson('/api/drive/upload/init', [
            'name' => 'report.pdf',
            'size' => 1048576,
            'mime' => 'application/pdf',
            'folder_id' => $folder->id,
            'unit_id' => $this->unit->id,
        ]);
        $initResp->assertStatus(200);
        $uploadId = $initResp->json('upload_id');
        $s3Key = $initResp->json('s3_key');

        // Simulasikan file sudah di-put ke storage
        Storage::disk('drive')->put($s3Key, 'mock pdf content');

        // Tab lain menghapus folder sebelum upload selesai
        $folder->delete();

        $completeResp = $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $uploadId,
        ]);

        $completeResp->assertStatus(404);
        $completeResp->assertJsonFragment(['message' => 'Folder tujuan telah dihapus sebelum upload selesai.']);

        $this->assertDatabaseHas('drive_uploads', [
            'id' => $uploadId,
            'status' => 'aborted',
        ]);
        $this->assertFalse(Storage::disk('drive')->exists($s3Key));
    }

    /**
     * Root Invariant 4: Cegah pengambilalihan upload milik user lain (Anti-Takeover CWE-284).
     */
    public function test_cannot_complete_upload_of_another_user(): void
    {
        Sanctum::actingAs($this->user);

        $initResp = $this->postJson('/api/drive/upload/init', [
            'name' => 'user_private.pdf',
            'size' => 500000,
            'mime' => 'application/pdf',
            'unit_id' => $this->unit->id,
        ]);
        $uploadId = $initResp->json('upload_id');

        // Pengguna lain mencoba menyelesaikan upload
        Sanctum::actingAs($this->otherUser);

        $completeResp = $this->postJson('/api/drive/upload/complete', [
            'upload_id' => $uploadId,
        ]);

        $completeResp->assertStatus(403);
        $completeResp->assertJsonFragment(['message' => 'Anda tidak memiliki otorisasi untuk menyelesaikan upload ini.']);
    }

    /**
     * Root Invariant 5: Sanitasi nama folder/berkas terhadap OS reserved names (CON, PRN, AUX, NUL), traversal, dan RTL overrides.
     */
    public function test_sanitizes_os_reserved_names_and_rtl_overrides(): void
    {
        Sanctum::actingAs($this->user);

        // 1. Windows Reserved Device 'CON'
        $resp1 = $this->postJson('/api/drive/folders', [
            'name' => 'CON',
            'unit_id' => $this->unit->id,
        ]);
        $resp1->assertStatus(201);
        $this->assertEquals('safe_CON', $resp1->json('folder.name'));

        // 2. Path Traversal & Null Byte
        $resp2 = $this->postJson('/api/drive/folders', [
            'name' => "../../../secret\0_folder",
            'unit_id' => $this->unit->id,
        ]);
        $resp2->assertStatus(201);
        $cleanName = $resp2->json('folder.name');
        $this->assertStringNotContainsString('../', $cleanName);
        $this->assertStringNotContainsString("\0", $cleanName);

        // 3. Rename File with Unicode RTL Override (\u{202E})
        $file = DriveFile::create([
            'unit_id' => $this->unit->id,
            'user_id' => $this->user->id,
            'name' => 'normal.pdf',
            's3_key' => 'units/balai/file.pdf',
            'size_bytes' => 1024,
            'mime_type' => 'application/pdf',
        ]);

        $rtlPayload = "Laporan\u{202E}fdp.exe";
        $resp3 = $this->putJson("/api/drive/file/{$file->id}/rename", [
            'name' => $rtlPayload,
        ]);
        $resp3->assertStatus(200);
        $renamed = $resp3->json('item.name');
        $this->assertStringNotContainsString("\u{202E}", $renamed);
    }
}
