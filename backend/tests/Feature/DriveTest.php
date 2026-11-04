<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\DriveAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriveTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');
    }

    /**
     * Test DriveAccess unit role matrix.
     */
    public function test_drive_access_unit_role_matrix(): void
    {
        $unitBerau = DriveUnit::where('slug', 'skw-1-berau')->first();
        $unitTenggarong = DriveUnit::where('slug', 'skw-2-tenggarong')->first();

        // 1. Super Admin is manager on both
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'username' => 'super',
            'email' => 'super@gmail.com',
            'password' => Hash::make('secret'),
            'role' => 'super_admin',
        ]);
        $this->assertEquals('manager', DriveAccess::unitRole($superAdmin, $unitBerau));
        $this->assertEquals('manager', DriveAccess::unitRole($superAdmin, $unitTenggarong));

        // 2. Berau employee auto-matches Berau as editor, but null on Tenggarong
        $userBerau = User::create([
            'name' => 'Pegawai Berau',
            'username' => '199001012015011001',
            'email' => 'berau@gmail.com',
            'password' => Hash::make('secret'),
            'role' => 'user',
        ]);

        Employee::create([
            'nip' => '199001012015011001',
            'nama_lengkap' => 'Pegawai Berau',
            'satuan_kerja' => 'Seksi Konservasi Wilayah I Berau',
        ]);

        $this->assertEquals('editor', DriveAccess::unitRole($userBerau, $unitBerau));
        $this->assertNull(DriveAccess::unitRole($userBerau, $unitTenggarong));
    }

    /**
     * Test folder creation and authorization.
     */
    public function test_folder_creation_and_authorization(): void
    {
        $user = User::create([
            'name' => 'User Personal',
            'username' => 'userpers',
            'email' => 'pers@gmail.com',
            'password' => Hash::make('secret'),
            'role' => 'user',
        ]);

        Sanctum::actingAs($user);

        // 1. Create personal folder -> OK
        $resPersonal = $this->postJson('/api/drive/folders', [
            'name' => 'Dokumen Pribadi',
        ]);
        $resPersonal->assertStatus(201);
        $this->assertDatabaseHas('drive_folders', [
            'name' => 'Dokumen Pribadi',
            'user_id' => $user->id,
            'unit_id' => null,
        ]);

        // 2. Create in restricted unit without access -> 403
        $unitSecret = DriveUnit::where('slug', 'skw-3-balikpapan')->first();

        $resForbidden = $this->postJson('/api/drive/folders', [
            'name' => 'Folder Rahasia',
            'unit_id' => $unitSecret->id,
        ]);
        $resForbidden->assertStatus(403);
    }

    /**
     * Test upload initialization and quota enforcement.
     */
    public function test_upload_init_quota_enforcement(): void
    {
        $user = User::create([
            'name' => 'Quota User',
            'username' => 'quotauser',
            'email' => 'quota@gmail.com',
            'password' => Hash::make('secret'),
            'role' => 'user',
            'drive_quota_bytes' => 1000, // Very small quota: 1000 bytes
        ]);

        Sanctum::actingAs($user);

        // Upload exceeding quota -> 422
        $resOver = $this->postJson('/api/drive/upload/init', [
            'name' => 'huge_video.mp4',
            'size' => 5000,
            'mime' => 'video/mp4',
        ]);
        $resOver->assertStatus(422);

        // Upload within quota -> 200 with presigned url
        $resOk = $this->postJson('/api/drive/upload/init', [
            'name' => 'small_doc.pdf',
            'size' => 500,
            'mime' => 'application/pdf',
        ]);
        $resOk->assertStatus(200);
        $this->assertNotEmpty($resOk->json('upload_id'));
        $this->assertNotEmpty($resOk->json('s3_key'));
    }

    /**
     * Test download URL inline vs attachment security header.
     */
    public function test_download_url_inline_disposition(): void
    {
        $user = User::create([
            'name' => 'Viewer User',
            'username' => 'vieweruser',
            'email' => 'viewer@gmail.com',
            'password' => Hash::make('secret'),
            'role' => 'user',
        ]);

        $pdfFile = DriveFile::create([
            'user_id' => $user->id,
            'name' => 'Laporan.pdf',
            's3_key' => 'personal/1/2026/test.pdf',
            'size_bytes' => 1024,
            'mime_type' => 'application/pdf',
        ]);

        Sanctum::actingAs($user);

        $res = $this->getJson("/api/drive/files/{$pdfFile->id}/url");
        $res->assertStatus(200);
        $this->assertTrue($res->json('is_inline'));
    }
}
