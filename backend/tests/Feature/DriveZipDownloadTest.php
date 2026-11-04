<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriveZipDownloadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');

        DriveUnit::firstOrCreate(['slug' => 'balai-samarinda'], [
            'name' => 'Balai BKSDA Samarinda',
            'storage_quota_bytes' => 107374182400,
        ]);
    }

    public function test_zip_token_generates_temporary_signed_url(): void
    {
        $user = User::create([
            'name' => 'User Test',
            'username' => 'user_test',
            'email' => 'user_test@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        $folder = DriveFolder::create([
            'name' => 'Dokumentasi Patroli',
            'user_id' => $user->id,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/drive/folders/{$folder->id}/zip-token");

        $response->assertStatus(200);
        $response->assertJsonStructure(['download_url', 'folder_name', 'expires_in_minutes']);

        $downloadUrl = $response->json('download_url');
        $this->assertStringContainsString('/api/drive/folders/'.$folder->id.'/download-zip', $downloadUrl);
        $this->assertStringContainsString('signature=', $downloadUrl);
    }

    public function test_download_zip_without_valid_signature_is_forbidden(): void
    {
        $user = User::create([
            'name' => 'User Test',
            'username' => 'user_test',
            'email' => 'user_test@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        $folder = DriveFolder::create([
            'name' => 'Berkas Rahasia',
            'user_id' => $user->id,
        ]);

        // Request langsung tanpa tanda tangan URL
        $response = $this->get("/api/drive/folders/{$folder->id}/download-zip");

        $response->assertStatus(403);
    }

    public function test_download_zip_streams_valid_zip_with_anti_zip_slip(): void
    {
        $user = User::create([
            'name' => 'User Test',
            'username' => 'user_test',
            'email' => 'user_test@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        $folder = DriveFolder::create([
            'name' => 'Folder Uji ZIP',
            'user_id' => $user->id,
        ]);

        // Simpan file fisik di disk S3 'drive'
        $s3Key = 'personal/1/test_file.txt';
        Storage::disk('drive')->put($s3Key, 'Isi berkas uji coba zip stream.');

        // Coba nama file berbahaya yang mengandung path traversal (Zip-Slip)
        $file = DriveFile::create([
            'user_id' => $user->id,
            'folder_id' => $folder->id,
            'name' => '../../malicious_traversal.txt',
            's3_key' => $s3Key,
            'size_bytes' => 32,
            'mime_type' => 'text/plain',
        ]);

        // Buat Signed URL yang valid
        $signedUrl = URL::temporarySignedRoute(
            'drive.folder.download_zip',
            now()->addMinutes(15),
            ['id' => $folder->id]
        );

        $response = $this->get($signedUrl);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/zip');

        // Verifikasi integritas ZIP & Proteksi Anti Zip-Slip
        $content = $response->streamedContent();
        $this->assertNotEmpty($content);

        $tempZip = tempnam(sys_get_temp_dir(), 'test_zip_');
        file_put_contents($tempZip, $content);

        $zip = new \ZipArchive();
        $res = $zip->open($tempZip);
        $this->assertTrue($res === true, 'Hasil stream harus berupa berkas ZIP yang valid.');

        $entryCount = $zip->numFiles;
        $this->assertEquals(1, $entryCount);

        $entryName = $zip->getNameIndex(0);
        // Anti-Zip-Slip: Nama berkas tidak boleh mengandung ../
        $this->assertStringNotContainsString('..', $entryName);
        $this->assertEquals('malicious_traversal.txt', $entryName);

        $zip->close();
        @unlink($tempZip);
    }

    public function test_move_file_and_folder_with_anti_circular_protection(): void
    {
        $user = User::create([
            'name' => 'User Test',
            'username' => 'user_test',
            'email' => 'user_test@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        Sanctum::actingAs($user);

        // 1. Buat hierarki folder: Parent -> Child -> GrandChild
        $parentFolder = DriveFolder::create(['name' => 'Parent', 'user_id' => $user->id]);
        $childFolder = DriveFolder::create(['name' => 'Child', 'parent_id' => $parentFolder->id, 'user_id' => $user->id]);
        $grandChild = DriveFolder::create(['name' => 'GrandChild', 'parent_id' => $childFolder->id, 'user_id' => $user->id]);

        // Coba pindahkan Parent ke dalam GrandChild (Sirkular loop)
        $circularResponse = $this->postJson("/api/drive/folders/{$parentFolder->id}/move", [
            'destination_parent_id' => $grandChild->id,
        ]);
        $circularResponse->assertStatus(422);
        $circularResponse->assertJsonFragment([
            'message' => 'Folder tidak dapat dipindahkan ke dalam subfoldernya sendiri.',
        ]);

        // Pindahkan file ke childFolder
        $file = DriveFile::create([
            'user_id' => $user->id,
            'folder_id' => $parentFolder->id,
            'name' => 'laporan.pdf',
            's3_key' => 'personal/1/laporan.pdf',
            'size_bytes' => 1024,
            'mime_type' => 'application/pdf',
        ]);

        $moveFileResponse = $this->postJson("/api/drive/files/{$file->id}/move", [
            'destination_folder_id' => $childFolder->id,
        ]);
        $moveFileResponse->assertStatus(200);

        $this->assertEquals($childFolder->id, $file->fresh()->folder_id);
    }
}
