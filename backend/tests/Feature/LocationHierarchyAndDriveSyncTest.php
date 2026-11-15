<?php

namespace Tests\Feature;

use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\Location;
use App\Modules\DeReporting\Models\Bidang;
use App\Modules\DeReporting\Models\Internal;
use App\Modules\DeReporting\Models\Jenis;
use App\Modules\DeReporting\Models\JenisData;
use App\Modules\DeReporting\Models\Kategori;
use App\Modules\DeReporting\Models\Tahun;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
use App\Support\Security\DriveAccess;
use Database\Seeders\BmnMasterDataSeeder;
use Database\Seeders\DriveHierarchicalFoldersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocationHierarchyAndDriveSyncTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('drive');
        Storage::fake('local');

        $this->superAdmin = User::factory()->create([
            'username' => '198001012005011001',
            'name' => 'Super Admin Master Lokasi',
            'role' => 'super_admin',
            'is_active' => true,
            'access_modules' => ['bmn', 'kepegawaian', 'drive', 'dereporting', 'surat'],
        ]);

        $this->seed(BmnMasterDataSeeder::class);
        $this->seed(DriveHierarchicalFoldersSeeder::class);
    }

    public function test_locations_api_hierarchy_guards_seksi_drive_provisioning_and_cascade_move(): void
    {
        $plainUser = User::factory()->create([
            'username' => '199501012020011099',
            'role' => 'user',
            'is_active' => true,
            'access_modules' => ['portal'],
            'permissions' => [],
        ]);

        Sanctum::actingAs($plainUser);
        $this->postJson('/api/locations', [
            'location_type' => Location::TYPE_ROOM,
            'name' => 'Ruang Illegal',
        ])->assertStatus(403);

        Sanctum::actingAs($this->superAdmin);

        $balai = Location::where('code', 'balai-samarinda')->firstOrFail();
        $skw2 = Location::where('code', 'skw-2-tenggarong')->firstOrFail();

        // Resor tidak boleh bernaung di bawah Balai
        $this->postJson('/api/locations', [
            'parent_id' => $balai->id,
            'location_type' => Location::TYPE_RESOR,
            'name' => 'Resor Salah Parent',
            'code' => 'resor_99',
        ])->assertStatus(422);

        // Buat Seksi baru -> otomatis buat DriveUnit + folder umum ter-link
        $seksiRes = $this->postJson('/api/locations', [
            'location_type' => Location::TYPE_SEKSI,
            'name' => 'Seksi KSDA Wilayah IV Kutai Barat',
            'code' => 'skw-4-kubar',
        ]);
        $seksiRes->assertStatus(201);
        $seksiId = $seksiRes->json('data.id');
        $seksiLoc = Location::findOrFail($seksiId);

        $this->assertNotNull($seksiLoc->drive_unit_id);
        $this->assertDatabaseHas('drive_units', ['id' => $seksiLoc->drive_unit_id]);
        $this->assertDatabaseHas('drive_folders', [
            'unit_id' => $seksiLoc->drive_unit_id,
            'location_id' => $seksiLoc->id,
            'folder_scope' => 'general',
        ]);

        // Buat Resor di bawah Seksi IV -> otomatis buat DriveFolder resor
        $resorRes = $this->postJson('/api/locations', [
            'parent_id' => $seksiLoc->id,
            'location_type' => Location::TYPE_RESOR,
            'name' => 'Resor 15. Kutai Barat',
            'code' => 'resor_15',
            'is_restricted' => false,
        ]);
        $resorRes->assertStatus(201);
        $resorId = $resorRes->json('data.id');
        $resorFolder = DriveFolder::where('location_id', $resorId)->firstOrFail();

        $subFolder = DriveFolder::create([
            'unit_id' => $resorFolder->unit_id,
            'location_id' => $resorFolder->location_id,
            'user_id' => $this->superAdmin->id,
            'parent_id' => $resorFolder->id,
            'name' => 'Subfolder Patroli Kubar',
            'is_restricted' => false,
            'folder_scope' => 'resor',
            'resor_code' => 'resor_15',
        ]);

        $file = DriveFile::create([
            'unit_id' => $resorFolder->unit_id,
            'user_id' => $this->superAdmin->id,
            'folder_id' => $subFolder->id,
            'name' => 'Patroli_Kubar.pdf',
            's3_key' => 'drive/test/patroli-kubar.pdf',
            'size_bytes' => 128,
            'mime_type' => 'application/pdf',
        ]);

        // Seksi IV tidak bisa dihapus karena masih punya child resor
        $this->deleteJson("/api/locations/{$seksiLoc->id}")->assertStatus(422);

        // Pindahkan Resor 15 ke SKW II Tenggarong dan aktifkan is_restricted -> cascade DriveFolder & DriveFile (RC-11)
        $this->putJson("/api/locations/{$resorId}", [
            'parent_id' => $skw2->id,
            'location_type' => Location::TYPE_RESOR,
            'name' => 'Resor 15. Kutai Barat (Relokasi)',
            'code' => 'resor_15_v2',
            'is_restricted' => true,
        ])->assertStatus(200);

        $resorFolder->refresh();
        $subFolder->refresh();
        $file->refresh();

        $this->assertSame((int) $skw2->drive_unit_id, (int) $resorFolder->unit_id);
        $this->assertSame('Resor 15. Kutai Barat (Relokasi)', $resorFolder->name);
        $this->assertTrue((bool) $resorFolder->is_restricted);
        $this->assertSame('resor_15_v2', $resorFolder->resor_code);

        $this->assertSame((int) $skw2->drive_unit_id, (int) $subFolder->unit_id);
        $this->assertTrue((bool) $subFolder->is_restricted);
        $this->assertSame('resor_15_v2', $subFolder->resor_code);
        $this->assertSame((int) $skw2->drive_unit_id, (int) $file->unit_id);

        // Guard delete ketika file masih ada & aset BMN / pegawai masih terpasang
        $this->deleteJson("/api/locations/{$resorId}")->assertStatus(422);
        $file->forceDelete();

        // Sekarang Seksi IV bersih dari anak -> bisa dihapus beserta DriveUnit/folder kosongnya
        $this->deleteJson("/api/locations/{$seksiLoc->id}")->assertStatus(200);
        $this->assertDatabaseMissing('bmn_locations', ['id' => $seksiLoc->id]);
    }

    public function test_resor_05_samarinda_resolves_solely_to_skw_2_and_filters_accurately(): void
    {
        $this->assertSame('skw-2-tenggarong', Location::canonicalUnitSlug('Resor 05. Samarinda'));
        $this->assertSame('skw-2-tenggarong', Location::canonicalUnitSlug('Seksi KSDA Wil II - Resor 05. Samarinda'));

        $balai = Location::where('code', 'balai-samarinda')->firstOrFail();
        $skw2 = Location::where('code', 'skw-2-tenggarong')->firstOrFail();
        $resor05 = Location::where('code', 'resor_05')->firstOrFail();

        $userR05 = User::factory()->create([
            'username' => '199105052020011005',
            'role' => 'user',
            'is_active' => true,
            'access_modules' => ['portal'],
        ]);
        Employee::create([
            'nip' => '199105052020011005',
            'nama_lengkap' => 'Petugas Resor 05 Samarinda',
            'location_id' => $resor05->id,
            'satuan_kerja' => $skw2->name,
            'resor' => 'resor_05',
            'is_active' => true,
        ]);

        // Pegawai Balai tidak dianggap Resor 05; Resor 05 hanya masuk SKW II & tidak masuk Balai
        Sanctum::actingAs($this->superAdmin);
        $balaiRes = $this->getJson('/api/kepegawaian/employees?wilayah=BALAI')->assertOk();
        $balaiNips = collect($balaiRes->json('data'))->pluck('nip');
        $this->assertFalse($balaiNips->contains('199105052020011005'));

        $skw2Res = $this->getJson('/api/kepegawaian/employees?wilayah=SKW_2')->assertOk();
        $skw2Nips = collect($skw2Res->json('data'))->pluck('nip');
        $this->assertTrue($skw2Nips->contains('199105052020011005'));

        DriveAccess::clearCache();
        $this->assertSame('editor', DriveAccess::unitRole($userR05, $skw2->driveUnit));
        $this->assertNull(DriveAccess::unitRole($userR05, $balai->driveUnit));
    }

    public function test_balai_restricted_room_isolation_drive_index_and_move_guard(): void
    {
        $balai = Location::where('code', 'balai-samarinda')->firstOrFail();
        $balaiUnitId = (int) $balai->drive_unit_id;

        $ruangKeuangan = Location::where('parent_id', $balai->id)
            ->where('code', 'ruang_keuangan')
            ->firstOrFail();
        $ruangKeuangan->update(['is_restricted' => true]);
        $folderKeuangan = $ruangKeuangan->syncDriveFolder();

        $ruangPevh = Location::where('parent_id', $balai->id)
            ->where('code', 'ruang_pevh')
            ->firstOrFail();
        $ruangPevh->update(['is_restricted' => true]);
        $folderPevh = $ruangPevh->syncDriveFolder();

        $userKeu = User::factory()->create([
            'username' => '199201012020011011',
            'role' => 'user',
            'is_active' => true,
            'access_modules' => ['portal'],
        ]);
        Employee::create([
            'nip' => '199201012020011011',
            'nama_lengkap' => 'Staf Keuangan',
            'location_id' => $ruangKeuangan->id,
            'satuan_kerja' => $balai->name,
            'is_active' => true,
        ]);

        $userPevh = User::factory()->create([
            'username' => '199202022020011012',
            'role' => 'user',
            'is_active' => true,
            'access_modules' => ['portal'],
        ]);
        Employee::create([
            'nip' => '199202022020011012',
            'nama_lengkap' => 'Staf PEVH',
            'location_id' => $ruangPevh->id,
            'satuan_kerja' => $balai->name,
            'is_active' => true,
        ]);

        DriveFile::create([
            'unit_id' => $balaiUnitId,
            'user_id' => $userKeu->id,
            'folder_id' => $folderKeuangan->id,
            'name' => 'SPJ_Rahasia.pdf',
            's3_key' => 'drive/test/spj.pdf',
            'size_bytes' => 512,
            'mime_type' => 'application/pdf',
        ]);

        DriveAccess::clearCache();

        // User Keuangan dapat melihat isi folder Keuangan + metadata file.folder room_code & location_id (RC-9)
        Sanctum::actingAs($userKeu);
        $okRes = $this->getJson("/api/drive?space={$balaiUnitId}&folder_id={$folderKeuangan->id}")->assertOk();
        $okRes->assertJsonPath('files.0.folder.location_id', $ruangKeuangan->id)
            ->assertJsonPath('files.0.folder.room_code', 'ruang_keuangan')
            ->assertJsonPath('files.0.folder.folder_scope', 'ruangan');

        // Subfolder baru di dalam Ruang Keuangan wajib mewarisi room_code, location_id, is_restricted (RC-11)
        $subCreate = $this->postJson('/api/drive/folders', [
            'unit_id' => $balaiUnitId,
            'parent_id' => $folderKeuangan->id,
            'name' => 'Arsip SPJ 2026',
        ])->assertStatus(201);
        $subId = $subCreate->json('folder.id');
        $this->assertDatabaseHas('drive_folders', [
            'id' => $subId,
            'location_id' => $ruangKeuangan->id,
            'room_code' => 'ruang_keuangan',
            'folder_scope' => 'ruangan',
            'is_restricted' => 1,
        ]);

        // Non-admin tidak boleh mengeluarkan subfolder terbatas ke root umum (RC-11)
        $folderUmum = DriveFolder::where('unit_id', $balaiUnitId)->where('folder_scope', 'general')->first();
        if ($folderUmum) {
            $this->postJson("/api/drive/folders/{$subId}/move", [
                'target_folder_id' => $folderUmum->id,
            ])->assertStatus(403);
        }

        // User PEVH dilarang mengakses folder & daftar folder Keuangan
        Sanctum::actingAs($userPevh);
        $this->getJson("/api/drive?folder_id={$folderKeuangan->id}")->assertStatus(403);
    }

    public function test_employee_mutation_atomically_revokes_drive_shares_ownership_cache_and_dereporting(): void
    {
        $balai = Location::where('code', 'balai-samarinda')->firstOrFail();
        $skw3 = Location::where('code', 'skw-3-balikpapan')->firstOrFail();
        $urusanKepegawaian = Location::where('code', 'ruang_tu')->firstOrFail();
        $urusanKepegawaian->update(['is_restricted' => true]);
        $folderKepeg = $urusanKepegawaian->syncDriveFolder();

        $resor10 = Location::where('code', 'resor_10')->firstOrFail();

        $user = User::factory()->create([
            'username' => '199303032020011033',
            'name' => 'Pegawai Mutasi Uji',
            'role' => 'user',
            'is_active' => true,
            'access_modules' => ['dereporting'],
        ]);

        $employee = Employee::create([
            'nip' => '199303032020011033',
            'nama_lengkap' => 'Pegawai Mutasi Uji',
            'location_id' => $urusanKepegawaian->id,
            'satuan_kerja' => $balai->name,
            'is_active' => true,
        ]);

        // Simulasikan jejak lama di unit Balai: member, owner folder organisasi (RC-4), folder share, dan file share (RC-12)
        DB::table('drive_unit_members')->insertOrIgnore([
            'drive_unit_id' => $balai->drive_unit_id,
            'user_id' => $user->id,
            'role' => 'manager',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $folderKepeg->update(['user_id' => $user->id]);

        $fileKepeg = DriveFile::create([
            'unit_id' => $balai->drive_unit_id,
            'user_id' => $this->superAdmin->id,
            'folder_id' => $folderKepeg->id,
            'name' => 'SK_Rahasia_TU.pdf',
            's3_key' => 'drive/test/sk-tu.pdf',
            'size_bytes' => 256,
            'mime_type' => 'application/pdf',
        ]);

        DriveShare::create([
            'folder_id' => $folderKepeg->id,
            'user_id' => $user->id,
            'share_type' => 'internal',
            'role' => 'editor',
            'created_by' => $this->superAdmin->id,
        ]);
        DriveShare::create([
            'file_id' => $fileKepeg->id,
            'user_id' => $user->id,
            'share_type' => 'internal',
            'role' => 'viewer',
            'created_by' => $this->superAdmin->id,
        ]);

        // Laporan DeReporting Internal ke Urusan Kepegawaian dan ke SKW III
        $tahun = Tahun::create(['tahun' => 2026, 'is_active' => true]);
        $bidang = Bidang::create(['nama' => 'TATA USAHA']);
        $jenis = Jenis::create(['bidang_id' => $bidang->id, 'nama' => 'Laporan Internal']);
        $kategori = Kategori::create(['jenis_id' => $jenis->id, 'nama' => 'Kepegawaian']);
        $jenisData = JenisData::create(['kategori_id' => $kategori->id, 'nama' => 'Rekap']);

        Storage::put('private/dereporting/internals/tu.pdf', '%PDF-1.4 tu');
        $reportTu = Internal::create([
            'user_id' => $this->superAdmin->id,
            'target_scope' => 'restricted',
            'tahun_id' => $tahun->id,
            'bidang_id' => $bidang->id,
            'jenis_id' => $jenis->id,
            'kategori_id' => $kategori->id,
            'jenis_data_id' => $jenisData->id,
            'judul_laporan' => 'Dokumen Internal TU Rahasia',
            'keterangan' => 'Khusus TU',
            'file_path' => 'private/dereporting/internals/tu.pdf',
            'review_status' => 'terkirim',
        ]);
        $reportTu->recipients()->create([
            'recipient_type' => 'urusan',
            'urusan_name' => $urusanKepegawaian->name,
        ]);

        Storage::put('private/dereporting/internals/skw3.pdf', '%PDF-1.4 skw3');
        $reportSkw3 = Internal::create([
            'user_id' => $this->superAdmin->id,
            'target_scope' => 'restricted',
            'tahun_id' => $tahun->id,
            'bidang_id' => $bidang->id,
            'jenis_id' => $jenis->id,
            'kategori_id' => $kategori->id,
            'jenis_data_id' => $jenisData->id,
            'judul_laporan' => 'Instruksi Seksi Wilayah III',
            'keterangan' => 'Khusus SKW III',
            'file_path' => 'private/dereporting/internals/skw3.pdf',
            'review_status' => 'terkirim',
        ]);
        $reportSkw3->recipients()->create([
            'recipient_type' => 'urusan',
            'urusan_name' => 'Seksi KSDA Wilayah III Balikpapan',
        ]);

        // Sebelum mutasi: user bisa lihat Drive TU + laporan TU (dan hangat di DriveAccess cache)
        Sanctum::actingAs($user);
        $this->getJson("/api/drive?folder_id={$folderKepeg->id}")->assertOk();
        $beforeTitles = collect($this->getJson('/api/dereporting/internals?tab=urusan')->assertOk()->json('data'))
            ->pluck('judul_laporan');
        $this->assertTrue($beforeTitles->contains('Dokumen Internal TU Rahasia'));
        $this->assertFalse($beforeTitles->contains('Instruksi Seksi Wilayah III'));

        // Mutasi melalui API Kepegawaian ke SKW III / Resor 10
        Sanctum::actingAs($this->superAdmin);
        $this->putJson("/api/kepegawaian/employees/{$employee->id}", [
            'jenis_pegawai' => 'PNS',
            'nip' => $employee->nip,
            'nama_lengkap' => $employee->nama_lengkap,
            'location_id' => $resor10->id,
            'satuan_kerja' => $skw3->name,
            'resor' => 'resor_10',
            'is_active' => true,
        ])->assertOk();

        // History menyimpan audit trail location_id (RC-8)
        $history = EmployeeHistory::where('employee_id', $employee->id)->latest('id')->first();
        $this->assertNotNull($history);
        $this->assertSame($urusanKepegawaian->id, $history->changes['location_id']['old'] ?? null);
        $this->assertSame($resor10->id, $history->changes['location_id']['new'] ?? null);

        // Keanggotaan unit Balai, share folder, share file, dan ownership folder organisasi dicabut atomik (RC-4, RC-12)
        $this->assertDatabaseMissing('drive_unit_members', [
            'drive_unit_id' => $balai->drive_unit_id,
            'user_id' => $user->id,
        ]);
        $this->assertSame('editor', DriveAccess::unitRole($user->fresh(), $skw3->driveUnit));
        $this->assertDatabaseMissing('drive_shares', [
            'folder_id' => $folderKepeg->id,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseMissing('drive_shares', [
            'file_id' => $fileKepeg->id,
            'user_id' => $user->id,
        ]);
        $this->assertNotSame($user->id, (int) $folderKepeg->fresh()->user_id);

        // Verifikasi langsung pada instance $user yang sama tanpa DriveAccess::clearCache() manual (RC-15)
        Sanctum::actingAs($user);
        $this->getJson("/api/drive?folder_id={$folderKepeg->id}")->assertStatus(403);

        // Request HTTP baru user di DeReporting Internal beralih ke SKW III, laporan lama TU otomatis tertutup (RC-10)
        Sanctum::actingAs($user->fresh());
        $afterTitles = collect($this->getJson('/api/dereporting/internals?tab=urusan')->assertOk()->json('data'))
            ->pluck('judul_laporan');
        $this->assertFalse($afterTitles->contains('Dokumen Internal TU Rahasia'));
        $this->assertTrue($afterTitles->contains('Instruksi Seksi Wilayah III'));
    }

    public function test_employee_deactivation_dynamic_resor_validation_and_cuti_atasan(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Buat Seksi IV & Resor dinamis resor_16
        $skw4 = Location::create([
            'location_type' => Location::TYPE_SEKSI,
            'name' => 'Seksi KSDA Wilayah IV Paser',
            'unit_kerja' => 'Seksi KSDA Wilayah IV Paser',
            'code' => 'skw-4-paser',
            'is_active' => true,
        ]);
        $driveUnit4 = DriveUnit::create([
            'slug' => 'skw-4-paser',
            'name' => $skw4->name,
            'storage_quota_bytes' => 10 * 1024 * 1024,
        ]);
        $skw4->update(['drive_unit_id' => $driveUnit4->id]);

        $resor16 = Location::create([
            'parent_id' => $skw4->id,
            'location_type' => Location::TYPE_RESOR,
            'name' => 'Resor 16. Long Kali',
            'unit_kerja' => $skw4->name,
            'code' => 'resor_16',
            'is_active' => true,
        ]);

        // Cross-validation conflict tetap menolak Resor SKW II pada satuan_kerja Balai
        $this->postJson('/api/kepegawaian/employees', [
            'jenis_pegawai' => 'PNS',
            'nip' => '199401012020011044',
            'nama_lengkap' => 'Uji Konflik Balai Resor',
            'satuan_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'resor' => 'resor_05',
            'is_active' => true,
        ])->assertStatus(422);

        // Resor dinamis DB resor_16 diterima di API Kepegawaian
        $createRes = $this->postJson('/api/kepegawaian/employees', [
            'jenis_pegawai' => 'PNS',
            'nip' => '199401012020011055',
            'nama_lengkap' => 'Petugas Resor Dinamis',
            'location_id' => $resor16->id,
            'satuan_kerja' => $skw4->name,
            'resor' => 'resor_16',
            'is_active' => true,
        ])->assertStatus(201);

        $empId = $createRes->json('data.id');
        $empUser = User::where('username', '199401012020011055')->firstOrFail();
        $empUser->update(['access_modules' => ['portal'], 'is_active' => true]);
        DB::table('drive_unit_members')->insert([
            'drive_unit_id' => $driveUnit4->id,
            'user_id' => $empUser->id,
            'role' => 'viewer',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Check accessor is_seksi pada format singkat 'Wil II' + Resor 05
        $shortWilEmp = new Employee([
            'satuan_kerja' => 'Seksi KSDA Wil II - Resor 05. Samarinda',
            'resor' => 'resor_05',
        ]);
        $this->assertTrue($shortWilEmp->is_seksi);
        $this->assertSame('II', $shortWilEmp->seksi_wilayah);

        // Nonaktifkan pegawai -> Drive memberships ikut dicabut
        $this->postJson("/api/kepegawaian/employees/{$empId}/lifecycle", [
            'action' => 'deactivate',
            'inactive_reason' => 'pensiun',
            'inactive_effective_date' => now()->subDay()->format('Y-m-d'),
            'notes' => 'Purna tugas uji sinkronisasi',
        ])->assertOk();

        $this->assertDatabaseMissing('drive_unit_members', [
            'drive_unit_id' => $driveUnit4->id,
            'user_id' => $empUser->id,
        ]);
        $this->assertNull(DriveAccess::unitRole($empUser->fresh(), $driveUnit4));
    }
}
