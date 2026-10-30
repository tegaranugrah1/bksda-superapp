<?php

namespace Tests\Feature;

use App\Constants\BksdaConstants;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\DeReporting\Models\DynamicForm;
use App\Modules\DeReporting\Models\DynamicFormResponse;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\DriveAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class DriveHierarchicalResorRBACTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected DriveUnit $unitBalai;
    protected DriveUnit $unitSkw1;
    protected DriveFolder $folderResor01;
    protected DriveFolder $folderResor02;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('drive_signer');

        // 1. Superadmin
        $this->superAdmin = User::create([
            'name' => 'Super Administrator',
            'username' => 'superadmin',
            'email' => 'superadmin@bksda.go.id',
            'password' => Hash::make('password'),
            'role' => 'super_admin',
        ]);

        // 2. Unit Kerja
        $this->unitBalai = DriveUnit::firstOrCreate(['slug' => 'balai-samarinda'], [
            'name' => 'Balai BKSDA Samarinda',
            'storage_quota_bytes' => 107374182400,
        ]);

        $this->unitSkw1 = DriveUnit::firstOrCreate(['slug' => 'skw-1-berau'], [
            'name' => 'Seksi KSDA Wilayah I Berau',
            'storage_quota_bytes' => 53687091200,
        ]);

        // 3. Folder Terisolasi Resor 01 & 02
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

    /**
     * Helper untuk membuat Pegawai dan Akun User terkait.
     */
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
        ]);

        return [$employee, $user];
    }

    /**
     * Skenario 1: Staf Resor 01 dapat mengakses dan mengunggah ke folder Resor 01.
     */
    public function test_resor_staff_can_access_their_own_resor_folder_and_upload(): void
    {
        [$emp, $user] = $this->createEmployeeUser('199001012020011001', 'Budi Resor 01', 'Seksi KSDA Wilayah I Berau', 'resor_01');

        $this->assertTrue(DriveAccess::canReadFolder($user, $this->folderResor01));
        $this->assertTrue(DriveAccess::canWriteFolder($user, $this->folderResor01));

        $response = $this->actingAs($user)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor01->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('current_folder_id', $this->folderResor01->id);
    }

    /**
     * Skenario 2: Staf TU Seksi / Non-Resor tidak berhak melihat atau mengakses folder resor terisolasi.
     */
    public function test_non_resor_staff_or_seksi_staff_cannot_access_isolated_resor_folder(): void
    {
        [$emp, $tuUser] = $this->createEmployeeUser('199101012020011002', 'Siti TU SKW I', 'Seksi KSDA Wilayah I Berau', null);

        $this->assertFalse(DriveAccess::canReadFolder($tuUser, $this->folderResor01));
        $this->assertFalse(DriveAccess::canWriteFolder($tuUser, $this->folderResor01));

        $response = $this->actingAs($tuUser)->getJson("/api/drive?space={$this->unitSkw1->id}&folder_id={$this->folderResor01->id}");
        $response->assertStatus(403);
    }

    /**
     * Skenario 3: Pegawai Kantor Balai tidak dapat mengakses Drive Seksi maupun folder Resor SKW.
     */
    public function test_balai_staff_cannot_access_skw_resor_folders(): void
    {
        [$emp, $balaiUser] = $this->createEmployeeUser('199201012020011003', 'Rudi Balai', 'Kantor Balai KSDA Kalimantan Timur', null);

        $this->assertFalse(DriveAccess::canReadFolder($balaiUser, $this->folderResor01));
        $response = $this->actingAs($balaiUser)->getJson("/api/drive?space={$this->unitSkw1->id}");
        $response->assertStatus(403);
    }

    /**
     * Skenario 4: Anti-IDOR direct file URL download forbidden bagi pengguna tidak berhak.
     */
    public function test_anti_idor_direct_file_url_download_forbidden_for_unauthorized_users(): void
    {
        [$emp1, $resorUser] = $this->createEmployeeUser('199001012020011001', 'Budi Resor 01', 'Seksi KSDA Wilayah I Berau', 'resor_01');
        [$emp2, $otherUser] = $this->createEmployeeUser('199301012020011004', 'Andi Resor 02', 'Seksi KSDA Wilayah I Berau', 'resor_02');

        $s3Key = 'units/skw-1-berau/resor01_secret.pdf';
        Storage::disk('drive')->put($s3Key, 'Dokumen Rahasia Resor 01');

        $file = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $resorUser->id,
            'folder_id' => $this->folderResor01->id,
            'name' => 'rahasia_resor_01.pdf',
            's3_key' => $s3Key,
            'size_bytes' => 100,
            'mime_type' => 'application/pdf',
        ]);

        // Staf Resor 01 berhak mendapatkan signed URL
        $resOk = $this->actingAs($resorUser)->getJson("/api/drive/files/{$file->id}/url");
        $resOk->assertStatus(200);

        // Staf Resor 02 DITOLAK 403 (Anti-IDOR) meskipun tahu ID berkasnya!
        $resForbidden = $this->actingAs($otherUser)->getJson("/api/drive/files/{$file->id}/url");
        $resForbidden->assertStatus(403);
    }

    /**
     * Skenario 5: Anti-Search Leak - Folder dan berkas terisolasi tidak muncul pada hasil pencarian pengguna tidak berhak.
     */
    public function test_anti_search_leak_isolated_folders_and_files_hidden_from_search(): void
    {
        [$emp, $tuUser] = $this->createEmployeeUser('199101012020011002', 'Siti TU SKW I', 'Seksi KSDA Wilayah I Berau', null);

        $response = $this->actingAs($tuUser)->getJson("/api/drive?space={$this->unitSkw1->id}&search=Berau");
        $response->assertStatus(200);

        $folderIds = collect($response->json('folders'))->pluck('id');
        $this->assertFalse($folderIds->contains($this->folderResor01->id), 'Folder Resor 01 tidak boleh bocor pada hasil pencarian!');
    }

    /**
     * Skenario 6: Anti-Bulk ZIP Traversal - Mengunduh folder induk melewati subfolder terisolasi tanpa membocorkannya.
     */
    public function test_anti_bulk_zip_traversal_skips_unauthorized_resor_subfolders(): void
    {
        [$emp, $tuUser] = $this->createEmployeeUser('199101012020011002', 'Siti TU SKW I', 'Seksi KSDA Wilayah I Berau', null);

        // Buat folder publik Seksi I
        $publicFolder = DriveFolder::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'name' => 'Arsip Umum Seksi I',
            'is_restricted' => false,
        ]);

        // Pindahkan Resor 01 menjadi subfolder di dalam folder publik
        $this->folderResor01->update(['parent_id' => $publicFolder->id]);

        $fileInPublic = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $tuUser->id,
            'folder_id' => $publicFolder->id,
            'name' => 'surat_edaran.txt',
            's3_key' => 'units/skw-1-berau/edaran.txt',
            'size_bytes' => 20,
            'mime_type' => 'text/plain',
        ]);
        Storage::disk('drive')->put('units/skw-1-berau/edaran.txt', 'Surat Edaran Publik');

        $fileInResor = DriveFile::create([
            'unit_id' => $this->unitSkw1->id,
            'user_id' => $this->superAdmin->id,
            'folder_id' => $this->folderResor01->id,
            'name' => 'rahasia_resor.txt',
            's3_key' => 'units/skw-1-berau/rahasia.txt',
            'size_bytes' => 20,
            'mime_type' => 'text/plain',
        ]);
        Storage::disk('drive')->put('units/skw-1-berau/rahasia.txt', 'Berkas Rahasia Resor');

        // Minta token ZIP oleh TU User
        $tokenRes = $this->actingAs($tuUser)->postJson("/api/drive/folders/{$publicFolder->id}/zip-token");
        $tokenRes->assertStatus(200);

        $downloadUrl = $tokenRes->json('download_url');
        $zipRes = $this->get($downloadUrl);
        $zipRes->assertStatus(200);

        $content = $zipRes->streamedContent();
        $tempZip = tempnam(sys_get_temp_dir(), 'test_rbac_zip_');
        file_put_contents($tempZip, $content);

        $zip = new \ZipArchive();
        $res = $zip->open($tempZip);
        $this->assertTrue($res === true);

        // Berkas publik ada di ZIP, namun berkas terisolasi resor di-skip
        $this->assertNotFalse($zip->locateName('surat_edaran.txt'));
        $this->assertFalse($zip->locateName('Resor 01. Berau/rahasia_resor.txt'), 'Subfolder terisolasi wajib dilewati dari bulk ZIP unduhan!');
        $zip->close();
        @unlink($tempZip);
    }

    /**
     * Skenario 7: Folder yang dibagikan secara virtual muncul pada filter shared_with_me penerima.
     */
    public function test_shared_with_me_includes_virtual_folder_shares(): void
    {
        [$emp, $targetUser] = $this->createEmployeeUser('199401012020011005', 'Dewi Target Share', 'Kantor Balai KSDA Kalimantan Timur', null);

        // Bagikan folder Resor 01 ke Dewi secara eksplisit
        DriveShare::create([
            'folder_id' => $this->folderResor01->id,
            'user_id' => $targetUser->id,
            'role' => 'viewer',
            'share_type' => 'internal',
            'created_by' => $this->superAdmin->id,
        ]);

        $this->assertTrue(DriveAccess::canReadFolder($targetUser, $this->folderResor01));

        $response = $this->actingAs($targetUser)->getJson('/api/drive?space=my&filter=shared_with_me');
        $response->assertStatus(200);

        $folderIds = collect($response->json('folders'))->pluck('id');
        $this->assertTrue($folderIds->contains($this->folderResor01->id), 'Folder virtual share harus muncul di Dibagikan kepada Saya!');
    }

    /**
     * Skenario 8: DeReporting submission membuat dedicated subfolder dan Ringkasan_Laporan.txt otomatis.
     */
    public function test_dereporting_submission_creates_dedicated_subfolder_and_summary_text(): void
    {
        $form = DynamicForm::create([
            'title' => 'Form Patroli Pengamanan',
            'slug' => 'form-patroli-pengamanan',
            'fields' => [
                ['id' => 'judul_laporan', 'type' => 'text', 'label' => 'Judul Laporan', 'required' => true],
                ['id' => 'nama_petugas', 'type' => 'text', 'label' => 'Nama Petugas', 'required' => true],
                ['id' => 'foto_patroli', 'type' => 'file', 'label' => 'Foto Patroli', 'required' => true, 'max_files' => 2],
            ],
            'is_active' => true,
            'created_by' => $this->superAdmin->id,
        ]);

        $file1 = UploadedFile::fake()->image('patroli1.jpg', 600, 400);

        $payload = [
            'judul_laporan' => 'Patroli Jalur Sungai',
            'nama_petugas' => 'Hendra Polhut',
            'foto_patroli' => [$file1],
        ];

        $res = $this->post("/api/dereporting/public-forms/{$form->slug}/submit", $payload);
        $res->assertStatus(201);

        $responseId = $res->json('id');
        $response = DynamicFormResponse::findOrFail($responseId);

        $this->assertNotNull($response->drive_folder_id);
        $subfolder = DriveFolder::findOrFail($response->drive_folder_id);
        $this->assertStringContainsString('Patroli Jalur Sungai', $subfolder->name);
        $this->assertStringContainsString('Hendra Polhut', $subfolder->name);

        // Verifikasi Ringkasan_Laporan.txt tersimpan di folder laporan
        $summaryFile = DriveFile::where('folder_id', $subfolder->id)
            ->where('source_module', 'dereporting')
            ->where('source_id', "{$responseId}:summary:txt")
            ->first();

        $this->assertNotNull($summaryFile, 'Ringkasan_Laporan.txt otomatis wajib dibuat!');
        $this->assertEquals('Ringkasan_Laporan.txt', $summaryFile->name);
        $this->assertTrue(Storage::disk('drive')->exists($summaryFile->s3_key));
    }

    /**
     * Skenario 9: Ekspor CSV tanggapan DeReporting memuat kolom Link Folder Drive.
     */
    public function test_dereporting_csv_export_contains_direct_subfolder_drive_link(): void
    {
        $form = DynamicForm::create([
            'title' => 'Form Patroli Ringkas',
            'slug' => 'form-patroli-ringkas',
            'fields' => [
                ['id' => 'kegiatan', 'type' => 'text', 'label' => 'Nama Kegiatan'],
            ],
            'is_active' => true,
            'created_by' => $this->superAdmin->id,
        ]);

        $subfolder = DriveFolder::create([
            'unit_id' => $this->unitBalai->id,
            'user_id' => $this->superAdmin->id,
            'name' => '[2026-10-31] - Patroli Uji',
        ]);

        DynamicFormResponse::create([
            'form_id' => $form->id,
            'answers' => ['kegiatan' => 'Pengecekan Patok'],
            'file_paths' => [],
            'drive_folder_id' => $subfolder->id,
        ]);

        $res = $this->actingAs($this->superAdmin)->get("/api/dereporting/forms/{$form->id}/responses/export");
        $res->assertStatus(200);

        $content = $res->streamedContent();
        $this->assertStringContainsString('Link Folder Drive', $content);
        $this->assertStringContainsString("/drive?space=1&folder_id={$subfolder->id}", $content);
    }

    /**
     * Skenario 10: Mutasi Kepegawaian mencabut hak akses lama dan memberikan hak akses baru seketika,
     * serta cross-validation menolak penempatan resor pada pegawai Balai, dan modul Drive Admin berfungsi penuh.
     */
    public function test_kepegawaian_mutation_instantly_auto_revokes_and_auto_grants_resor_drive_access_with_cross_validation(): void
    {
        [$employee, $user] = $this->createEmployeeUser('199505052020011006', 'Joko Mutasi', 'Seksi KSDA Wilayah I Berau', 'resor_01');

        // Awal: Memiliki akses ke Resor 01, tidak ke Resor 02
        $this->assertTrue(DriveAccess::canReadFolder($user, $this->folderResor01));
        $this->assertFalse(DriveAccess::canReadFolder($user, $this->folderResor02));

        // 1. Mutasi ke Resor 02 melalui API Kepegawaian
        $updateRes = $this->actingAs($this->superAdmin)->putJson("/api/kepegawaian/employees/{$employee->id}", [
            'nama_lengkap' => $employee->nama_lengkap,
            'nip' => $employee->nip,
            'satuan_kerja' => 'Seksi KSDA Wilayah I Berau',
            'resor' => 'resor_02',
            'is_active' => true,
        ]);
        $updateRes->assertStatus(200);

        // Hapus memoized user cache jika ada
        DriveAccess::clearCache($user);

        // Akses langsung berubah seketika: Resor 01 auto-revoked, Resor 02 auto-granted!
        $this->assertFalse(DriveAccess::canReadFolder($user, $this->folderResor01), 'Akses Resor 01 wajib dicabut setelah mutasi!');
        $this->assertTrue(DriveAccess::canReadFolder($user, $this->folderResor02), 'Akses Resor 02 wajib diberikan seketika!');

        // 2. Cross-validation: Pegawai Balai DITOLAK jika ditempatkan di resor
        $invalidRes = $this->actingAs($this->superAdmin)->putJson("/api/kepegawaian/employees/{$employee->id}", [
            'nama_lengkap' => $employee->nama_lengkap,
            'nip' => $employee->nip,
            'satuan_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'resor' => 'resor_02',
            'is_active' => true,
        ]);
        $invalidRes->assertStatus(422);

        // 3. Hak Akses Modul 'drive' memberikan akses Admin ke seluruh folder
        $user->update(['access_modules' => ['drive']]);
        $this->assertTrue(DriveAccess::isDriveAdmin($user), 'User dengan access_modules drive harus menjadi Drive Admin');
        $this->assertTrue(DriveAccess::canReadFolder($user, $this->folderResor01));
        $this->assertTrue(DriveAccess::canReadFolder($user, $this->folderResor02));
    }
}
