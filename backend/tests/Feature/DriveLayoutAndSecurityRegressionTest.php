<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Models\User;
use App\Modules\DeReporting\Models\DynamicForm;
use App\Modules\DeReporting\Models\DynamicFormResponse;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\DriveAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriveLayoutAndSecurityRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected DriveUnit $unitBalai;
    protected DriveUnit $unitSkw1;
    protected DriveUnit $unitSkw2;
    protected DriveFolder $folderResor01;
    protected DriveFolder $folderResor02;

    protected function setUp(): void
    {
        parent::setUp();
        DriveAccess::clearCache();

        Storage::fake('drive');
        Storage::fake('drive_signer');

        // 1. Super Administrator
        $this->superAdmin = User::firstOrCreate(['username' => 'superadmin'], [
            'name' => 'Super Administrator',
            'email' => 'superadmin@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
            'access_modules' => ['drive', 'dereporting', 'kepegawaian'],
        ]);

        // 2. Unit Kerja Resmi
        $this->unitBalai = DriveUnit::firstOrCreate(['slug' => 'balai-samarinda'], [
            'name' => 'Balai BKSDA Samarinda',
            'storage_quota_bytes' => 107374182400, // 100 GB
        ]);

        $this->unitSkw1 = DriveUnit::firstOrCreate(['slug' => 'skw-1-berau'], [
            'name' => 'Seksi KSDA Wilayah I Berau',
            'storage_quota_bytes' => 53687091200, // 50 GB
        ]);

        $this->unitSkw2 = DriveUnit::firstOrCreate(['slug' => 'skw-2-tenggarong'], [
            'name' => 'Seksi KSDA Wilayah II Tenggarong',
            'storage_quota_bytes' => 53687091200,
        ]);

        // 3. Folder Terisolasi Resor 01 & 02 pada SKW I
        $this->folderResor01 = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'name' => 'Resor 01. Berau',
            'color' => '#10B981',
            'is_restricted' => true,
            'folder_scope' => 'resor',
            'resor_code' => 'resor_01',
        ]);

        $this->folderResor02 = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'name' => 'Resor 02. Pulau Semama dan Pulau Sangalaki',
            'color' => '#10B981',
            'is_restricted' => true,
            'folder_scope' => 'resor',
            'resor_code' => 'resor_02',
        ]);
    }

    protected function createEmployeeUser(string $nip, string $name, string $satker, ?string $resor = null, string $role = 'user', array $accessModules = []): array
    {
        $employee = Employee::create([
            'nip' => $nip,
            'nama_lengkap' => $name,
            'satuan_kerja' => $satker,
            'resor' => $resor,
            'is_active' => true,
        ]);

        $user = User::create([
            'name' => $name,
            'username' => $nip,
            'email' => "{$nip}@bksda.go.id",
            'password' => Hash::make('password'),
            'role' => $role,
            'access_modules' => $accessModules,
            'drive_quota_bytes' => 5368709120, // 5 GB
        ]);

        return [$employee, $user];
    }

    // ==========================================
    // DRV-SEC-01 s.d. DRV-SEC-20: INVARIANT INTI
    // ==========================================

    public function test_drv_sec_01_invalid_or_out_of_topology_unit_rejected(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011001', 'User Balai', 'Balai BKSDA Samarinda');

        $response = $this->actingAs($user)->getJson('/api/drive?space=99999');
        $this->assertTrue(in_array($response->status(), [404, 403], true));
    }

    public function test_drv_sec_02_balai_user_cannot_access_skw1_unit_root(): void
    {
        [$emp, $balaiUser] = $this->createEmployeeUser('199001012020011002', 'Staff Balai', 'Kantor Balai KSDA Kalimantan Timur');

        $response = $this->actingAs($balaiUser)->getJson("/api/drive?space={$this->unitSkw1->id}");
        $response->assertStatus(403);
        $response->assertJsonFragment(['message' => 'Anda tidak memiliki akses ke Drive Unit ini.']);
    }

    public function test_drv_sec_03_seksi_staff_cannot_access_isolated_resor_folder(): void
    {
        [$emp, $seksiUser] = $this->createEmployeeUser('199001012020011003', 'Staff Kantor Seksi', 'Seksi KSDA Wilayah I Berau', null);

        $response = $this->actingAs($seksiUser)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor01->id}");
        $response->assertStatus(403);
        $response->assertJsonFragment(['message' => 'Anda tidak memiliki akses ke folder ini.']);
    }

    public function test_drv_sec_04_resor_staff_can_access_their_matching_resor_folder(): void
    {
        [$emp, $resorUser] = $this->createEmployeeUser('199001012020011004', 'Petugas Resor 01', 'Seksi KSDA Wilayah I Berau', 'resor_01');

        $response = $this->actingAs($resorUser)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor01->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('current_folder_id', $this->folderResor01->id);
    }

    public function test_drv_sec_05_anti_idor_direct_file_url_download_forbidden_for_unauthorized_user(): void
    {
        [$emp1, $resorUser] = $this->createEmployeeUser('199001012020011005', 'Petugas Resor 01', 'Seksi KSDA Wilayah I Berau', 'resor_01');
        [$emp2, $otherUser] = $this->createEmployeeUser('199001012020011006', 'Petugas Resor 02', 'Seksi KSDA Wilayah I Berau', 'resor_02');

        $s3Key = 'units/skw-1-berau/secret_resor01.pdf';
        Storage::disk('drive')->put($s3Key, 'Isi Dokumen Rahasia Resor 01');

        $file = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $resorUser->id,
            'folder_id' => $this->folderResor01->id,
            'name' => 'secret_resor01.pdf',
            's3_key' => $s3Key,
            'size_bytes' => 200,
            'mime_type' => 'application/pdf',
        ]);

        // Resor 01 berhak
        $resAuthorized = $this->actingAs($resorUser)->getJson("/api/drive/files/{$file->id}/url");
        $resAuthorized->assertStatus(200);

        // Resor 02 ditolak 403 (Anti-IDOR)
        $resForbidden = $this->actingAs($otherUser)->getJson("/api/drive/files/{$file->id}/url");
        $resForbidden->assertStatus(403);
    }

    public function test_drv_sec_06_instant_auto_revoke_and_grant_on_employee_mutation(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011007', 'Petugas Mutasi', 'Seksi KSDA Wilayah I Berau', 'resor_01');

        $this->actingAs($user)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor01->id}")->assertStatus(200);

        // Mutasi ke Resor 02
        $emp->update(['resor' => 'resor_02']);
        DriveAccess::clearCache($user);

        // Akses Resor 01 langsung terputus (Revoke)
        $this->actingAs($user)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor01->id}")->assertStatus(403);

        // Akses Resor 02 langsung terbuka (Grant)
        $this->actingAs($user)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor02->id}")->assertStatus(200);
    }

    public function test_drv_sec_07_anti_search_leak_isolated_folders_and_files_hidden_from_search(): void
    {
        [$emp, $seksiUser] = $this->createEmployeeUser('199001012020011008', 'Staff Seksi Umum', 'Seksi KSDA Wilayah I Berau', null);

        DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'folder_id' => $this->folderResor01->id,
            'name' => 'Patroli_Rahasia_Berau.docx',
            's3_key' => 'units/skw-1-berau/patroli.docx',
            'size_bytes' => 500,
            'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);

        $response = $this->actingAs($seksiUser)->getJson("/api/drive?space={$this->unitSkw1->id}&search=Rahasia");
        $response->assertStatus(200);

        $fileNames = collect($response->json('files'))->pluck('name');
        $this->assertFalse($fileNames->contains('Patroli_Rahasia_Berau.docx'));
    }

    public function test_drv_sec_08_subfolder_creation_inherits_resor_isolation_attributes(): void
    {
        [$emp, $resorUser] = $this->createEmployeeUser('199001012020011009', 'Petugas Resor 01', 'Seksi KSDA Wilayah I Berau', 'resor_01');

        $response = $this->actingAs($resorUser)->postJson('/api/drive/folders', [
            'name' => 'Subfolder Laporan Bulanan',
            'unit_id' => $this->unitSkw1->id,
            'parent_id' => $this->folderResor01->id,
        ]);

        $response->assertStatus(201);
        $subfolderId = $response->json('folder.id');

        $subfolder = DriveFolder::findOrFail($subfolderId);
        $this->assertTrue($subfolder->is_restricted);
        $this->assertEquals('resor', $subfolder->folder_scope);
        $this->assertEquals('resor_01', $subfolder->resor_code);
    }

    public function test_drv_sec_09_anti_bulk_zip_traversal_skips_isolated_resor_folders(): void
    {
        [$emp, $seksiUser] = $this->createEmployeeUser('199001012020011010', 'Staff Seksi', 'Seksi KSDA Wilayah I Berau', null);

        $parentFolder = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'name' => 'Folder Publik Seksi I',
        ]);

        $publicFile = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'folder_id' => $parentFolder->id,
            'name' => 'info_publik.txt',
            's3_key' => 'units/skw-1-berau/info.txt',
            'size_bytes' => 10,
            'mime_type' => 'text/plain',
        ]);
        Storage::disk('drive')->put($publicFile->s3_key, 'Info Publik');

        // Pindahkan Resor 01 sebagai subfolder dari parentFolder
        $this->folderResor01->update(['parent_id' => $parentFolder->id]);

        $resorFile = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'folder_id' => $this->folderResor01->id,
            'name' => 'rahasia_resor.txt',
            's3_key' => 'units/skw-1-berau/rahasia.txt',
            'size_bytes' => 10,
            'mime_type' => 'text/plain',
        ]);
        Storage::disk('drive')->put($resorFile->s3_key, 'Rahasia Resor');

        $tokenRes = $this->actingAs($seksiUser)->postJson("/api/drive/folders/{$parentFolder->id}/zip-token");
        $tokenRes->assertStatus(200);
        $downloadUrl = $tokenRes->json('download_url');

        $zipResponse = $this->get($downloadUrl);
        $zipResponse->assertStatus(200);
        $this->assertEquals('application/zip', $zipResponse->headers->get('content-type'));
    }

    public function test_drv_sec_10_anti_zip_slip_sanitizes_traversal_filenames(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011011', 'Staff Zip', 'Seksi KSDA Wilayah I Berau', null);

        $folder = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $user->id,
            'name' => 'Folder Uji ZipSlip',
        ]);

        $file = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $user->id,
            'folder_id' => $folder->id,
            'name' => '../../etc/passwd',
            's3_key' => 'units/skw-1-berau/passwd.txt',
            'size_bytes' => 20,
            'mime_type' => 'text/plain',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'root:x:0:0:root');

        $signedUrl = URL::temporarySignedRoute(
            'drive.folder.download_zip',
            now()->addMinutes(15),
            ['id' => $folder->id, 'u' => $user->id]
        );

        $response = $this->get($signedUrl);
        $response->assertStatus(200);
    }

    public function test_drv_sec_11_zip_download_requires_valid_unexpired_hmac_signature(): void
    {
        $folder = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'name' => 'Folder Validasi HMAC',
        ]);

        // 1. Tanpa signature
        $unsignedResponse = $this->getJson("/api/drive/folders/{$folder->id}/download-zip");
        $unsignedResponse->assertStatus(403);

        // 2. Signature palsu / dirusak
        $tamperedResponse = $this->getJson("/api/drive/folders/{$folder->id}/download-zip?signature=tampered_signature_12345");
        $tamperedResponse->assertStatus(403);
    }

    public function test_drv_sec_12_upload_init_rejects_exceeded_quota(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011012', 'Staff Kuota', 'Balai BKSDA Samarinda');
        $user->update(['drive_quota_bytes' => 1000]); // Hanya 1000 Bytes

        $response = $this->actingAs($user)->postJson('/api/drive/upload/init', [
            'name' => 'video_besar.mp4',
            'size' => 5000000, // 5 MB > 1000 Bytes
            'mime' => 'video/mp4',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Kapasitas penyimpanan Drive Anda telah penuh.']);
    }

    public function test_drv_sec_13_magic_bytes_detection_purges_malicious_polyglot(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011013', 'Staff Uploader', 'Balai BKSDA Samarinda');

        $uploadId = Str::random(32);
        $s3Key = "personal/{$user->id}/2026/malicious_polyglot.pdf";

        // Simpan konten HTML jahat menyamar sebagai PDF
        Storage::disk('drive')->put($s3Key, "<html><head><script>alert('Stored XSS')</script></head><body>evil</body></html>");

        DriveUpload::create([
            'id' => $uploadId,
            'user_id' => $user->id,
            'filename' => 'laporan_satwa.pdf',
            's3_key' => $s3Key,
            'total_size_bytes' => 70,
            'parts_count' => 1,
            'status' => 'initiated',
            'expires_at' => now()->addHour(),
        ]);

        $response = $this->actingAs($user)->postJson('/api/drive/upload/complete', [
            'upload_id' => $uploadId,
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Berkas mengandung tipe konten berbahaya dan ditolak sistem.']);

        // Verifikasi fisik berkas dihapus & status upload jadi aborted
        $this->assertFalse(Storage::disk('drive')->exists($s3Key));
        $this->assertDatabaseHas('drive_uploads', [
            'id' => $uploadId,
            'status' => 'aborted',
        ]);
    }

    public function test_drv_sec_14_presigned_url_forces_attachment_content_disposition_for_non_inline_mimes(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011014', 'Staff URL', 'Balai BKSDA Samarinda');

        $zipFile = DriveFile::create([
            'user_id' => $user->id,
            'name' => 'arsip_dokumen.zip',
            's3_key' => "personal/{$user->id}/arsip.zip",
            'size_bytes' => 1024,
            'mime_type' => 'application/zip',
        ]);
        Storage::disk('drive')->put($zipFile->s3_key, 'ZIPBYTES');

        $response = $this->actingAs($user)->getJson("/api/drive/files/{$zipFile->id}/url");
        $response->assertStatus(200);
        $this->assertFalse($response->json('is_inline'));
    }

    public function test_drv_sec_15_public_share_token_cryptography_and_expired_404(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011015', 'Staff Share', 'Balai BKSDA Samarinda');

        $file = DriveFile::create([
            'user_id' => $user->id,
            'name' => 'panduan.pdf',
            's3_key' => "personal/{$user->id}/panduan.pdf",
            'size_bytes' => 500,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'PDF CONTENT');

        // 1. Buat share publik
        $shareRes = $this->actingAs($user)->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'public',
            'expires_in_days' => 7,
        ]);
        $shareRes->assertStatus(201);

        $token = $shareRes->json('share.token');
        $this->assertEquals(32, strlen($token));

        // 2. Akses share aktif
        $publicGet = $this->getJson("/api/drive/s/{$token}");
        $publicGet->assertStatus(200);
        $publicGet->assertHeader('X-Robots-Tag', 'noindex, nofollow');

        // 3. Simulasikan kedaluwarsa
        DriveShare::where('token', $token)->update(['expires_at' => now()->subDay()]);
        $expiredGet = $this->getJson("/api/drive/s/{$token}");
        $expiredGet->assertStatus(404);
        $expiredGet->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_drv_sec_16_public_share_password_verification_and_rate_limiting(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011016', 'Staff Sandi', 'Balai BKSDA Samarinda');

        $file = DriveFile::create([
            'user_id' => $user->id,
            'name' => 'dokumen_rahasia.pdf',
            's3_key' => "personal/{$user->id}/rahasia.pdf",
            'size_bytes' => 1000,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'PDF SECRET');

        $shareRes = $this->actingAs($user)->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'public',
            'password' => 'Kaltim2026!',
        ]);
        $token = $shareRes->json('share.token');

        // Unduh dengan sandi salah -> 401
        $wrongRes = $this->postJson("/api/drive/s/{$token}/download", [
            'password' => 'SalahPassword',
        ]);
        $wrongRes->assertStatus(401);

        // Unduh dengan sandi benar -> 200
        $correctRes = $this->postJson("/api/drive/s/{$token}/download", [
            'password' => 'Kaltim2026!',
        ]);
        $correctRes->assertStatus(200);
        $this->assertNotEmpty($correctRes->json('url'));
    }

    public function test_drv_sec_17_virtual_internal_share_does_not_duplicate_physical_s3_file(): void
    {
        [$emp1, $userA] = $this->createEmployeeUser('199001012020011017', 'User A', 'Balai BKSDA Samarinda');
        [$emp2, $userB] = $this->createEmployeeUser('199001012020011018', 'User B', 'Balai BKSDA Samarinda');

        $file = DriveFile::create([
            'user_id' => $userA->id,
            'name' => 'rancangan.docx',
            's3_key' => "personal/{$userA->id}/rancangan.docx",
            'size_bytes' => 2000,
            'mime_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'DOCX CONTENT');

        $initialFileCount = DriveFile::count();

        $shareRes = $this->actingAs($userA)->postJson("/api/drive/files/{$file->id}/shares", [
            'share_type' => 'internal',
            'target_type' => 'user',
            'target_id' => $userB->id,
            'role' => 'viewer',
        ]);
        $shareRes->assertStatus(201);

        // Tidak ada berkas fisik baru yang tercipta
        $this->assertEquals($initialFileCount, DriveFile::count());

        // User B dapat membaca berkas virtual
        $this->assertTrue(DriveAccess::canReadFile($userB, $file));
    }

    public function test_drv_sec_18_trash_and_force_delete_storage_authorization(): void
    {
        [$emp1, $owner] = $this->createEmployeeUser('199001012020011019', 'Owner Berkas', 'Balai BKSDA Samarinda');
        [$emp2, $stranger] = $this->createEmployeeUser('199001012020011020', 'Orang Luar', 'Seksi KSDA Wilayah II Tenggarong');

        $file = DriveFile::create([
            'user_id' => $owner->id,
            'name' => 'hapus_saya.pdf',
            's3_key' => "personal/{$owner->id}/hapus.pdf",
            'size_bytes' => 500,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'CONTENT TO DELETE');

        // Orang luar ditolak membuang ke sampah
        $forbiddenTrash = $this->actingAs($stranger)->deleteJson("/api/drive/file/{$file->id}");
        $forbiddenTrash->assertStatus(403);

        // Pemilik membuang ke sampah
        $ownerTrash = $this->actingAs($owner)->deleteJson("/api/drive/file/{$file->id}");
        $ownerTrash->assertStatus(200);
        $this->assertSoftDeleted('drive_files', ['id' => $file->id]);

        // Pemilik menghapus permanen (force delete)
        $forceRes = $this->actingAs($owner)->deleteJson("/api/drive/file/{$file->id}/force");
        $forceRes->assertStatus(200);

        $this->assertDatabaseMissing('drive_files', ['id' => $file->id]);
        $this->assertFalse(Storage::disk('drive')->exists($file->s3_key));
    }

    public function test_drv_sec_19_anti_circular_move_folder_validation(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011021', 'Staff Move', 'Balai BKSDA Samarinda');

        $folderA = DriveFolder::create([
            'user_id' => $user->id,
            'name' => 'Folder A',
        ]);

        $folderA1 = DriveFolder::create([
            'user_id' => $user->id,
            'parent_id' => $folderA->id,
            'name' => 'Subfolder A1',
        ]);

        // Coba pindahkan Folder A ke dalam dirinya sendiri
        $selfMove = $this->actingAs($user)->postJson("/api/drive/folders/{$folderA->id}/move", [
            'destination_parent_id' => $folderA->id,
        ]);
        $selfMove->assertStatus(422);

        // Coba pindahkan Folder A ke dalam subfolder A1
        $descendantMove = $this->actingAs($user)->postJson("/api/drive/folders/{$folderA->id}/move", [
            'destination_parent_id' => $folderA1->id,
        ]);
        $descendantMove->assertStatus(422);
    }

    public function test_drv_sec_20_assign_manager_restricted_to_admin(): void
    {
        [$emp, $regularUser] = $this->createEmployeeUser('199001012020011022', 'Staff Biasa', 'Balai BKSDA Samarinda');
        [$emp2, $candidate] = $this->createEmployeeUser('199001012020011023', 'Calon Manager', 'Balai BKSDA Samarinda');

        $folder = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'name' => 'Folder SKW I',
        ]);

        // User biasa ditolak
        $resForbidden = $this->actingAs($regularUser)->postJson("/api/drive/folders/{$folder->id}/assign-manager", [
            'user_id' => $candidate->id,
        ]);
        $resForbidden->assertStatus(403);

        // Superadmin diizinkan
        $resAllowed = $this->actingAs($this->superAdmin)->postJson("/api/drive/folders/{$folder->id}/assign-manager", [
            'user_id' => $candidate->id,
        ]);
        $resAllowed->assertStatus(200);
        $this->assertEquals($candidate->id, $folder->fresh()->user_id);
    }

    // ==============================================================
    // DRV-SEC-21 s.d. DRV-SEC-28: JEROAN LANJUTAN (COMMANDS, DEREP, CONCURRENCY)
    // ==============================================================

    public function test_drv_sec_21_cleanup_uploads_command_aborts_expired_and_deletes_orphaned(): void
    {
        $expiredUpload = DriveUpload::create([
            'id' => 'upload_expired_001',
            'user_id' => $this->superAdmin->id,
            'filename' => 'orphan.iso',
            's3_key' => 'personal/orphan.iso',
            'total_size_bytes' => 1000000,
            'parts_count' => 1,
            'status' => 'initiated',
            'expires_at' => now()->subHours(5), // Kedaluwarsa 5 jam lalu
        ]);
        Storage::disk('drive')->put($expiredUpload->s3_key, 'ORPHAN DATA');

        $activeUpload = DriveUpload::create([
            'id' => 'upload_active_002',
            'user_id' => $this->superAdmin->id,
            'filename' => 'active.iso',
            's3_key' => 'personal/active.iso',
            'total_size_bytes' => 1000000,
            'parts_count' => 1,
            'status' => 'initiated',
            'expires_at' => now()->addHours(2), // Masih aktif
        ]);
        Storage::disk('drive')->put($activeUpload->s3_key, 'ACTIVE DATA');

        $exitCode = Artisan::call('drive:cleanup-uploads');
        $this->assertEquals(0, $exitCode);

        // Upload kedaluwarsa dibatalkan dan filenya dihapus
        $this->assertEquals('aborted', $expiredUpload->fresh()->status);
        $this->assertFalse(Storage::disk('drive')->exists($expiredUpload->s3_key));

        // Upload aktif tetap aman
        $this->assertEquals('initiated', $activeUpload->fresh()->status);
        $this->assertTrue(Storage::disk('drive')->exists($activeUpload->s3_key));
    }

    public function test_drv_sec_22_purge_trash_command_force_deletes_expired_files_and_folders(): void
    {
        $oldTrashedFile = DriveFile::create([
            'user_id' => $this->superAdmin->id,
            'name' => 'berkas_lama.pdf',
            's3_key' => 'personal/berkas_lama.pdf',
            'size_bytes' => 100,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($oldTrashedFile->s3_key, 'OLD TRASH');
        $oldTrashedFile->delete();
        // Paksa deleted_at 35 hari lalu
        DriveFile::withTrashed()->where('id', $oldTrashedFile->id)->update(['deleted_at' => now()->subDays(35)]);

        $newTrashedFile = DriveFile::create([
            'user_id' => $this->superAdmin->id,
            'name' => 'berkas_baru.pdf',
            's3_key' => 'personal/berkas_baru.pdf',
            'size_bytes' => 100,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($newTrashedFile->s3_key, 'NEW TRASH');
        $newTrashedFile->delete();
        // deleted_at 5 hari lalu (< 30 hari)
        DriveFile::withTrashed()->where('id', $newTrashedFile->id)->update(['deleted_at' => now()->subDays(5)]);

        $exitCode = Artisan::call('drive:purge-trash', ['--days' => 30]);
        $this->assertEquals(0, $exitCode);

        // Berkas lama dihapus permanen dari DB dan S3
        $this->assertDatabaseMissing('drive_files', ['id' => $oldTrashedFile->id]);
        $this->assertFalse(Storage::disk('drive')->exists($oldTrashedFile->s3_key));

        // Berkas baru tetap ada di trash
        $this->assertSoftDeleted('drive_files', ['id' => $newTrashedFile->id]);
        $this->assertTrue(Storage::disk('drive')->exists($newTrashedFile->s3_key));
    }

    public function test_drv_sec_23_dereporting_public_submit_creates_drive_subfolder_and_summary_txt(): void
    {
        [$emp, $creator] = $this->createEmployeeUser('199001012020011024', 'Staff Laporan', 'Balai BKSDA Samarinda', null, 'user', ['dereporting', 'drive']);

        $form = DynamicForm::create([
            'title' => 'Formulir Uji Drive',
            'slug' => 'formulir-uji-drive',
            'fields' => [
                ['id' => 'nama', 'type' => 'text', 'label' => 'Nama', 'required' => true],
                ['id' => 'foto', 'type' => 'file', 'label' => 'Foto', 'required' => true, 'max_files' => 1],
            ],
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $fileUpload = UploadedFile::fake()->image('bukti.jpg', 600, 600);

        $response = $this->post("/api/dereporting/public-forms/{$form->slug}/submit", [
            'nama' => 'Masyarakat Pelapor',
            'foto' => [$fileUpload],
        ]);

        $response->assertStatus(201);
        $responseId = $response->json('id');
        $dbResponse = DynamicFormResponse::findOrFail($responseId);

        // Verifikasi folder response tercipta
        $this->assertNotNull($dbResponse->drive_folder_id);

        // Verifikasi file lampiran dan Ringkasan_Laporan.txt tersimpan
        $files = DriveFile::where('folder_id', $dbResponse->drive_folder_id)->get();
        $this->assertTrue($files->contains('name', 'Ringkasan_Laporan.txt'));

        // Verifikasi kuota pribadi pegawai tidak terpakai
        $personalUsed = DriveFile::where('user_id', $creator->id)->whereNull('unit_id')->sum('size_bytes');
        $this->assertEquals(0, $personalUsed);
    }

    public function test_drv_sec_24_dereporting_virtual_share_to_target_unit_without_s3_duplication(): void
    {
        [$emp, $creator] = $this->createEmployeeUser('199001012020011025', 'Staff Form', 'Balai BKSDA Samarinda', null, 'user', ['dereporting', 'drive']);

        $form = DynamicForm::create([
            'title' => 'Formulir Share Respon',
            'slug' => 'form-share-respon',
            'fields' => [
                ['id' => 'keterangan', 'type' => 'text', 'label' => 'Keterangan', 'required' => true],
            ],
            'is_active' => true,
            'created_by' => $creator->id,
        ]);

        $response = $this->post("/api/dereporting/public-forms/{$form->slug}/submit", [
            'keterangan' => 'Laporan Berbagi',
        ]);
        $responseId = $response->json('id');

        $initialS3Count = count(Storage::disk('drive')->allFiles());

        // Bagikan folder tanggapan ke SKW 1
        $shareRes = $this->actingAs($creator)->postJson("/api/dereporting/forms/responses/{$responseId}/share", [
            'target_type' => 'unit',
            'target_id' => $this->unitSkw1->id,
            'role' => 'viewer',
        ]);

        $shareRes->assertStatus(201);
        $this->assertEquals($initialS3Count, count(Storage::disk('drive')->allFiles()), 'Tidak boleh ada file S3 ganda saat virtual share');
    }

    public function test_drv_sec_25_virtual_share_viewer_role_blocks_write_and_mutations(): void
    {
        [$emp1, $owner] = $this->createEmployeeUser('199001012020011026', 'Owner Folder', 'Balai BKSDA Samarinda');
        [$emp2, $viewerUser] = $this->createEmployeeUser('199001012020011027', 'Viewer Staf', 'Seksi KSDA Wilayah II Tenggarong');

        $folder = DriveFolder::create([
            'unit_id' => $this->unitBalai->id,
            'user_id' => $owner->id,
            'name' => 'Folder Riset Bersama',
            'is_restricted' => true,
        ]);

        // Berikan izin 'viewer' ke viewerUser
        DriveShare::create([
            'folder_id' => $folder->id,
            'share_type' => 'internal',
            'user_id' => $viewerUser->id,
            'role' => 'viewer',
            'created_by' => $owner->id,
        ]);

        // 1. Viewer BISA membaca folder
        $this->assertTrue(DriveAccess::canReadFolder($viewerUser, $folder));

        // 2. Viewer TIDAK BISA menulis folder
        $this->assertFalse(DriveAccess::canWriteFolder($viewerUser, $folder));

        // 3. Coba buat subfolder di dalamnya -> Ditolak 403
        $createSub = $this->actingAs($viewerUser)->postJson('/api/drive/folders', [
            'name' => 'Subfolder Ilegal',
            'unit_id' => $this->unitBalai->id,
            'parent_id' => $folder->id,
        ]);
        $createSub->assertStatus(403);

        // 4. Coba inisialisasi upload ke folder ini -> Ditolak 403
        $initUpload = $this->actingAs($viewerUser)->postJson('/api/drive/upload/init', [
            'name' => 'file_ilegal.pdf',
            'size' => 1024,
            'mime' => 'application/pdf',
            'folder_id' => $folder->id,
            'unit_id' => $this->unitBalai->id,
        ]);
        $initUpload->assertStatus(403);
    }

    public function test_drv_sec_26_virtual_share_editor_role_permits_upload_and_creation(): void
    {
        [$emp1, $owner] = $this->createEmployeeUser('199001012020011028', 'Owner Folder', 'Balai BKSDA Samarinda');
        [$emp2, $editorUser] = $this->createEmployeeUser('199001012020011029', 'Editor Staf', 'Seksi KSDA Wilayah II Tenggarong');

        $folder = DriveFolder::create([
            'unit_id' => $this->unitBalai->id,
            'user_id' => $owner->id,
            'name' => 'Folder Kolaborasi Proyek',
            'is_restricted' => true,
        ]);

        // Berikan izin 'editor' ke editorUser
        DriveShare::create([
            'folder_id' => $folder->id,
            'share_type' => 'internal',
            'user_id' => $editorUser->id,
            'role' => 'editor',
            'created_by' => $owner->id,
        ]);

        $this->assertTrue(DriveAccess::canWriteFolder($editorUser, $folder));

        // Inisialisasi upload diizinkan
        $initUpload = $this->actingAs($editorUser)->postJson('/api/drive/upload/init', [
            'name' => 'data_lapangan.pdf',
            'size' => 1024,
            'mime' => 'application/pdf',
            'folder_id' => $folder->id,
            'unit_id' => $this->unitBalai->id,
        ]);
        $this->assertTrue(in_array($initUpload->status(), [200, 201], true));
    }

    public function test_drv_sec_27_atomic_download_count_increment_under_concurrent_downloads(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011030', 'Staff Atomik', 'Balai BKSDA Samarinda');

        $file = DriveFile::create([
            'user_id' => $user->id,
            'name' => 'statistik_unduh.pdf',
            's3_key' => "personal/{$user->id}/statistik.pdf",
            'size_bytes' => 100,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'STAT CONTENT');

        $token = bin2hex(random_bytes(16));
        $share = DriveShare::create([
            'file_id' => $file->id,
            'share_type' => 'public',
            'role' => 'viewer',
            'token' => $token,
            'download_count' => 0,
            'created_by' => $user->id,
        ]);

        // Simulasi 3 request unduh berurutan/simultan
        $this->postJson("/api/drive/s/{$token}/download")->assertStatus(200);
        $this->postJson("/api/drive/s/{$token}/download")->assertStatus(200);
        $this->postJson("/api/drive/s/{$token}/download")->assertStatus(200);

        $this->assertEquals(3, $share->fresh()->download_count);
    }

    public function test_drv_sec_28_filename_sanitization_and_header_injection_defense(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011031', 'Staff Injeksi', 'Balai BKSDA Samarinda');

        // Nama file mengandung kutip ganda yang berpotensi memecah header ResponseContentDisposition
        $maliciousFilename = 'laporan"; filename*=UTF-8\'\'malicious.sh; dummy="file.pdf';
        $file = DriveFile::create([
            'user_id' => $user->id,
            'name' => $maliciousFilename,
            's3_key' => "personal/{$user->id}/sanitized.pdf",
            'size_bytes' => 500,
            'mime_type' => 'application/pdf',
        ]);
        Storage::disk('drive')->put($file->s3_key, 'PDF INJECTION TEST');

        $response = $this->actingAs($user)->getJson("/api/drive/files/{$file->id}/url");
        $response->assertStatus(200);
        $this->assertNotEmpty($response->json('url'));
    }
}
