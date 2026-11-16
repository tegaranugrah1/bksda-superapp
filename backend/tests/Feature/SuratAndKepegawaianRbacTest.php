<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeIncomingLetter;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\MealAllowanceBatch;
use App\Modules\Kepegawaian\Models\MealAllowanceItem;
use App\Modules\Surat\Models\SuratKeluar;
use App\Modules\Surat\Models\SuratMasuk;
use App\Modules\Surat\Models\SuratTemplate;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuratAndKepegawaianRbacTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $suratAdmin;
    private User $suratUserA;
    private User $suratUserB;
    private User $kpgAdmin;
    private User $kpgUserA;
    private Employee $employeeA;
    private Employee $employeeB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create([
            'username' => 'superadmin_rbac',
            'role' => 'super_admin',
            'is_active' => true,
        ]);

        $this->suratAdmin = User::factory()->create([
            'username' => 'admin_surat_rbac',
            'role' => 'admin',
            'access_modules' => ['surat'],
            'is_active' => true,
        ]);

        $this->suratUserA = User::factory()->create([
            'username' => 'user_a_surat_rbac',
            'role' => 'user',
            'access_modules' => ['surat'],
            'is_active' => true,
        ]);

        $this->suratUserB = User::factory()->create([
            'username' => 'user_b_surat_rbac',
            'role' => 'user',
            'access_modules' => ['surat'],
            'is_active' => true,
        ]);

        $this->employeeA = Employee::create([
            'nip' => '199101012020121001',
            'nama_lengkap' => 'Pegawai A Direktori',
            'jabatan' => 'Polhut Ahli Pertama',
            'pangkat_golongan' => 'Penata Muda (III/a)',
            'satuan_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'nama_bank' => 'BRI',
            'nomor_rekening' => '111122223333',
            'inactive_notes' => 'Catatan Internal A',
            'is_active' => true,
        ]);

        $this->employeeB = Employee::create([
            'nip' => '199202022020121002',
            'nama_lengkap' => 'Pegawai B Rahasia',
            'jabatan' => 'Analis Konservasi',
            'pangkat_golongan' => 'Penata Muda (III/a)',
            'satuan_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'nama_bank' => 'Mandiri',
            'nomor_rekening' => '999988887777',
            'inactive_notes' => 'Catatan Internal B',
            'is_active' => true,
        ]);

        $this->kpgAdmin = User::factory()->create([
            'username' => 'admin_kpg_rbac',
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
            'is_active' => true,
        ]);

        $this->kpgUserA = User::factory()->create([
            'username' => $this->employeeA->nip,
            'role' => 'user',
            'access_modules' => ['kepegawaian'],
            'is_active' => true,
        ]);
    }

    public function test_persuratan_user_can_only_access_and_manage_own_surat_keluar_and_is_blocked_from_surat_masuk_and_settings(): void
    {
        // 1. User A creates a Surat Keluar (manual / tata naskah dinas)
        Sanctum::actingAs($this->suratUserA);
        $createResA = $this->postJson('/api/surat/surat-keluar', [
            'no_surat' => 'S.101/K.18/TU/2026',
            'tanggal_surat' => '2026-11-16',
            'tujuan_surat' => 'Dinas Kehutanan Kaltim',
            'perihal' => 'Surat Keluar Milik User A',
            'sifat' => 'Biasa',
            'template_type' => 'surat_dinas',
        ]);
        $createResA->assertCreated()
            ->assertJsonPath('data.created_by', $this->suratUserA->id);
        $letterAId = $createResA->json('data.id');

        // 2. User B creates another Surat Keluar
        Sanctum::actingAs($this->suratUserB);
        $createResB = $this->postJson('/api/surat/surat-keluar', [
            'no_surat' => 'S.102/K.18/TU/2026',
            'tanggal_surat' => '2026-11-16',
            'tujuan_surat' => 'Balai TN Kutai',
            'perihal' => 'Surat Keluar Milik User B',
            'sifat' => 'Penting',
        ]);
        $createResB->assertCreated();
        $letterBId = $createResB->json('data.id');

        // 3. User A listing Agenda Surat Keluar ONLY sees Letter A
        Sanctum::actingAs($this->suratUserA);
        $listUserA = $this->getJson('/api/surat/surat-keluar');
        $listUserA->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $letterAId);

        // 4. User A can view, update, and delete own Letter A, but gets 403 on Letter B (Anti-IDOR)
        $this->getJson("/api/surat/surat-keluar/{$letterAId}")->assertOk();
        $this->putJson("/api/surat/surat-keluar/{$letterAId}", [
            'no_surat' => 'S.101-REV/K.18/TU/2026',
            'tanggal_surat' => '2026-11-16',
            'tujuan_surat' => 'Dinas Kehutanan Kaltim',
            'perihal' => 'Surat Keluar Milik User A Revisi',
        ])->assertOk();

        $this->getJson("/api/surat/surat-keluar/{$letterBId}")->assertForbidden();
        $this->putJson("/api/surat/surat-keluar/{$letterBId}", [
            'no_surat' => 'S.HACK/2026',
            'tanggal_surat' => '2026-11-16',
            'tujuan_surat' => 'Hack',
            'perihal' => 'Hack',
        ])->assertForbidden();
        $this->deleteJson("/api/surat/surat-keluar/{$letterBId}")->assertForbidden();

        // 5. User A can read active templates for Tata Naskah Dinas, but cannot mutate templates or access Surat Masuk
        $this->getJson('/api/surat/templates')->assertOk();
        $this->postJson('/api/surat/templates', [
            'key' => 'tpl_test',
            'nama' => 'Template Baru',
            'kategori' => 'Tata Naskah Dinas',
        ])->assertForbidden();

        SuratMasuk::create([
            'no_agenda' => '001',
            'tanggal_agenda' => '2026-11-16',
            'no_surat' => 'SM.01/2026',
            'isi_ringkas' => 'Rahasia Masuk',
            'created_by' => $this->suratAdmin->id,
        ]);

        $this->getJson('/api/surat/surat-masuk')->assertForbidden();
        $this->getJson('/api/surat/surat-masuk/next-agenda')->assertForbidden();
        $this->postJson('/api/surat/surat-masuk', [
            'no_agenda' => '002',
            'tanggal_agenda' => '2026-11-16',
            'no_surat' => 'SM.02/2026',
        ])->assertForbidden();

        // 6. Admin Persuratan sees BOTH Letter A and Letter B, can manage Surat Masuk, but is FORBIDDEN from mutating templates (/surat/settings)
        Sanctum::actingAs($this->suratAdmin);
        $listAdmin = $this->getJson('/api/surat/surat-keluar');
        $listAdmin->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/surat/surat-keluar/{$letterBId}")->assertOk();
        $this->getJson('/api/surat/surat-masuk')->assertOk()->assertJsonCount(1, 'data');

        $tpl = SuratTemplate::create([
            'key' => 'tpl_existing',
            'nama' => 'Template Existing',
            'kategori' => 'Tata Naskah Dinas',
            'nomor_prefix' => 'S',
            'kode_klasifikasi' => 'KSA',
            'is_system' => false,
            'is_active' => true,
        ]);

        $this->postJson('/api/surat/templates', [
            'key' => 'tpl_admin_try',
            'nama' => 'Template Admin',
            'kategori' => 'Tata Naskah Dinas',
            'nomor_prefix' => 'S',
            'kode_klasifikasi' => 'KSA',
        ])->assertForbidden();
        $this->putJson("/api/surat/templates/{$tpl->id}", [
            'key' => 'tpl_existing',
            'nama' => 'Diubah Admin',
            'kategori' => 'Tata Naskah Dinas',
            'nomor_prefix' => 'S',
            'kode_klasifikasi' => 'KSA',
        ])->assertForbidden();
        $this->deleteJson("/api/surat/templates/{$tpl->id}")->assertForbidden();
        $this->postJson('/api/surat/templates/reset-defaults')->assertForbidden();

        // 7. Super Admin can mutate templates
        Sanctum::actingAs($this->superAdmin);
        $this->putJson("/api/surat/templates/{$tpl->id}", [
            'key' => 'tpl_existing',
            'nama' => 'Diubah Super Admin',
            'kategori' => 'Tata Naskah Dinas',
            'nomor_prefix' => 'S',
            'kode_klasifikasi' => 'KSA',
            'is_active' => true,
        ])->assertOk();
    }

    public function test_kepegawaian_user_only_sees_directory_biodata_and_cannot_access_other_employees_sensitive_data_or_admin_features(): void
    {
        EmployeeLeave::create([
            'employee_id' => $this->employeeB->id,
            'year' => (int) date('Y'),
            'hak_cuti_n' => 12,
        ]);

        $batch = MealAllowanceBatch::create([
            'periode_bulan' => '2026-11',
            'nama_batch' => 'Uang Makan Nov 2026',
            'total_pegawai' => 1,
            'total_bruto' => 500000,
            'total_pph' => 25000,
            'total_netto' => 475000,
            'created_by' => $this->superAdmin->id,
        ]);
        MealAllowanceItem::create([
            'batch_id' => $batch->id,
            'employee_id' => $this->employeeB->id,
            'nip' => $this->employeeB->nip,
            'nama_lengkap' => $this->employeeB->nama_lengkap,
            'golongan' => 'III',
            'jml_hari_kerja' => 20,
            'jml_hadir' => 15,
            'jml_pd' => 0,
            'tarif_harian' => 37000,
            'uang_makan_bruto' => 555000,
            'persen_pph21' => 5,
            'potongan_pph21' => 27750,
            'uang_makan_netto' => 527250,
        ]);

        $st = AssignmentLetter::create([
            'nomor_surat' => 'ST.100/K.18/TU/2026',
            'maksud_tujuan' => 'Patroli Kawasan',
            'tempat_tujuan' => 'Berau',
            'tanggal_mulai' => '2026-11-10',
            'tanggal_selesai' => '2026-11-12',
            'status' => 'diterbitkan',
            'created_by' => $this->superAdmin->id,
        ]);
        $st->employees()->attach($this->employeeB->id);

        $incoming = EmployeeIncomingLetter::create([
            'no_agenda' => 'AG-01',
            'tanggal_diterima' => '2026-11-16',
            'asal_surat' => 'Kementerian',
            'kategori' => 'Internal',
            'perihal' => 'Surat Kepegawaian',
        ]);

        // 1. User A (role=user with access_modules=['kepegawaian']) views directory list & Employee B detail
        Sanctum::actingAs($this->kpgUserA);

        $listRes = $this->getJson('/api/kepegawaian/employees?per_page=50')->assertOk();
        $empBFromList = collect($listRes->json('data'))->firstWhere('id', $this->employeeB->id);
        $empAFromList = collect($listRes->json('data'))->firstWhere('id', $this->employeeA->id);

        $this->assertNotNull($empBFromList);
        $this->assertArrayNotHasKey('nomor_rekening', $empBFromList);
        $this->assertArrayNotHasKey('nama_bank', $empBFromList);
        $this->assertArrayNotHasKey('inactive_notes', $empBFromList);
        // Self record still has own bank account
        $this->assertSame('111122223333', $empAFromList['nomor_rekening'] ?? null);

        // 2. Detail of Employee B hides bank account & sensitive notes
        $showB = $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}")->assertOk()->json('data');
        $this->assertSame('Pegawai B Rahasia', $showB['nama_lengkap']);
        $this->assertArrayNotHasKey('nomor_rekening', $showB);
        $this->assertArrayNotHasKey('nama_bank', $showB);
        $this->assertArrayNotHasKey('inactive_notes', $showB);

        // 3. User A cannot access Employee B's leaves, assignment letters, meal allowances, or histories (403)
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/leaves")->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/assignment-letters")->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/meal-allowances")->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/histories")->assertForbidden();

        // User A CAN still read own leaves / assignment letters / meal allowances
        $this->getJson("/api/kepegawaian/employees/{$this->employeeA->id}/leaves")->assertOk();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeA->id}/assignment-letters")->assertOk();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeA->id}/meal-allowances")->assertOk();

        // 4. User A cannot access Arsip Surat Masuk Kepegawaian, Create/Edit/Delete Employee, Cuti Inbox, Uang Makan, or Settings
        $this->getJson('/api/kepegawaian/surat-masuk')->assertForbidden();
        $this->getJson("/api/kepegawaian/surat-masuk/{$incoming->id}")->assertForbidden();
        $this->postJson('/api/kepegawaian/employees', [
            'nip' => '199901012025011009',
            'nama_lengkap' => 'Pegawai Ilegal',
        ])->assertForbidden();
        $this->getJson('/api/kepegawaian/leave-requests')->assertForbidden();
        $this->getJson('/api/kepegawaian/uang-makan/batches')->assertForbidden();

        // 5. Dashboard stats for User A hides recent ST activities and internal inbox counts
        $dashUser = $this->getJson('/api/kepegawaian/dashboard-stats')->assertOk()->json('data');
        $this->assertSame(0, $dashUser['active_surat_tugas']);
        $this->assertSame(0, $dashUser['total_surat_masuk']);
        $this->assertSame([], $dashUser['recent_activities']);
    }

    public function test_kepegawaian_admin_can_manage_operations_but_cannot_access_settings_iam_or_force_delete(): void
    {
        Sanctum::actingAs($this->kpgAdmin);

        // 1. Admin CAN view Employee B's full details, bank account, leaves, ST, meal allowances, and Arsip Surat Masuk
        $showB = $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}")->assertOk()->json('data');
        $this->assertSame('999988887777', $showB['nomor_rekening']);
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/leaves")->assertOk();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/assignment-letters")->assertOk();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/meal-allowances")->assertOk();
        $this->getJson('/api/kepegawaian/surat-masuk')->assertOk();

        // 2. Admin CAN soft-delete and restore an employee, but CANNOT force-delete
        $tempEmp = Employee::create([
            'nip' => '199505052022031005',
            'nama_lengkap' => 'Pegawai Sementara',
            'is_active' => true,
        ]);
        $this->deleteJson("/api/kepegawaian/employees/{$tempEmp->id}")->assertOk();
        $this->assertSoftDeleted('kpg_employees', ['id' => $tempEmp->id]);

        $this->deleteJson("/api/kepegawaian/employees/{$tempEmp->id}/force")->assertForbidden();
        $this->postJson("/api/kepegawaian/employees/{$tempEmp->id}/restore")->assertOk();

        // 3. Admin CANNOT access Settings mutations or IAM
        $this->postJson('/api/kepegawaian/st-task-types', ['nama' => 'Tugas Baru'])->assertForbidden();
        $this->postJson('/api/kepegawaian/leave-types', [
            'kode' => 'CBX',
            'nama' => 'Cuti Baru',
            'hitung_hari' => 'hari_kerja',
        ])->assertForbidden();
        $this->getJson('/api/kepegawaian/settings/holidays')->assertForbidden();
        $this->getJson('/api/kepegawaian/settings/employee-banks')->assertForbidden();
        $this->postJson('/api/kepegawaian/settings/registered-banks', ['nama_bank' => 'BTN'])->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/access")->assertForbidden();
        $this->putJson("/api/kepegawaian/employees/{$this->employeeB->id}/access", [
            'role' => 'admin',
            'is_active' => true,
        ])->assertForbidden();

        // 4. Super Admin CAN force-delete, mutate Settings, and manage IAM
        Sanctum::actingAs($this->superAdmin);
        $this->postJson('/api/kepegawaian/st-task-types', [
            'nama' => 'Tugas Patroli Khusus',
            'mode_lokasi' => 'dalam_kawasan',
            'aturan_durasi' => 'fleksibel',
            'keterangan' => 'Patroli Khusus Super Admin',
        ])->assertCreated();
        $this->getJson('/api/kepegawaian/settings/holidays')->assertOk();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/access")->assertOk();

        $this->deleteJson("/api/kepegawaian/employees/{$tempEmp->id}")->assertOk();
        $this->deleteJson("/api/kepegawaian/employees/{$tempEmp->id}/force")->assertOk();
        $this->assertDatabaseMissing('kpg_employees', ['id' => $tempEmp->id]);
    }

    public function test_bmn_rbac_user_admin_and_super_admin_boundaries(): void
    {
        $bmnUser = User::factory()->create([
            'username' => 'user_bmn_rbac',
            'role' => 'user',
            'access_modules' => ['bmn'],
            'permissions' => [],
            'is_active' => true,
        ]);

        $bmnAdmin = User::factory()->create([
            'username' => 'admin_bmn_rbac',
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'permissions' => [],
            'is_active' => true,
        ]);

        $asset = \App\Modules\Bmn\Models\Asset::create([
            'kode_barang' => '3020101001',
            'nup' => '1',
            'nama_barang' => 'Mobil Patroli Hilux',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 450000000,
        ]);

        $tag = \App\Modules\Bmn\Models\Tag::create([
            'name' => 'patroli',
            'label' => '#patroli',
            'color' => 'emerald',
        ]);

        // 1. User BMN (role=user, access_modules=['bmn'], permissions=[])
        // Can read Dashboard, Assets, Asset Detail, Loans, Maintenances, and filter Tags/Locations/AssetTypes
        Sanctum::actingAs($bmnUser);
        $this->getJson('/api/bmn/dashboard/stats')->assertOk();
        $this->getJson('/api/bmn/assets')->assertOk();
        $this->getJson("/api/bmn/assets/{$asset->id}")->assertOk();
        $this->getJson('/api/bmn/loans')->assertOk();
        $this->getJson('/api/bmn/maintenances')->assertOk();
        $this->getJson('/api/bmn/tags')->assertOk();
        $this->getJson('/api/bmn/locations')->assertOk();
        $this->getJson('/api/bmn/asset-types')->assertOk();

        // User BMN is FORBIDDEN from Import Review, Auction Candidates/Batches, Document History/Reports, Asset Mutations, and Master Settings
        $this->getJson('/api/bmn/import-review')->assertForbidden();
        $this->getJson('/api/bmn/auction-candidates')->assertForbidden();
        $this->getJson('/api/bmn/auction-batches')->assertForbidden();
        $this->getJson('/api/bmn/document-histories')->assertForbidden();
        $this->getJson('/api/bmn/usage-agreements')->assertForbidden();
        $this->postJson('/api/bmn/assets', [
            'kode_barang' => '3020101002',
            'nup' => '2',
            'nama_barang' => 'Ilegal',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 1000,
        ])->assertForbidden();
        $this->putJson("/api/bmn/assets/{$asset->id}", ['nama_barang' => 'Diubah User'])->assertForbidden();
        $this->deleteJson("/api/bmn/assets/{$asset->id}/dispose")->assertForbidden();
        $this->postJson("/api/bmn/assets/{$asset->id}/tags", ['tag_ids' => [$tag->id]])->assertForbidden();
        $this->postJson('/api/bmn/tags', ['name' => 'baru', 'color' => 'blue'])->assertForbidden();

        // 2. Admin BMN (role=admin, access_modules=['bmn'], permissions=[])
        // Automatically gets all operational BMN permissions (without needing 16 checkboxes), EXCEPT Settings Master & Force Delete
        Sanctum::actingAs($bmnAdmin);
        $this->getJson('/api/bmn/import-review')->assertOk();
        $this->getJson('/api/bmn/auction-candidates')->assertOk();
        $this->getJson('/api/bmn/auction-batches')->assertOk();
        $this->getJson('/api/bmn/document-histories')->assertOk();
        $this->postJson("/api/bmn/assets/{$asset->id}/tags", ['tag_ids' => [$tag->id]])->assertOk();

        // Admin BMN is FORBIDDEN from Master Settings (/bmn/settings: CRUD Tags, Locations, AssetTypes) and Force Delete
        $this->postJson('/api/bmn/tags', ['name' => 'tag_admin', 'color' => 'blue'])->assertForbidden();
        $this->putJson("/api/bmn/tags/{$tag->id}", ['name' => 'tag_admin_edit', 'color' => 'blue'])->assertForbidden();
        $this->deleteJson("/api/bmn/tags/{$tag->id}")->assertForbidden();
        $this->postJson('/api/bmn/locations', [
            'unit_kerja' => 'Kantor Balai KSDA Kalimantan Timur',
            'name' => 'Ruang Admin Coba',
        ])->assertForbidden();
        $this->postJson('/api/bmn/asset-types', [
            'name' => 'JENIS BARU ADMIN',
            'category_mode' => 'peralatan',
        ])->assertForbidden();
        $this->postJson('/api/bmn/assets/bulk-force-delete', ['ids' => [$asset->id]])->assertForbidden();

        // 3. Super Admin CAN manage Master Settings (Tags, Locations, AssetTypes) and Force Delete
        Sanctum::actingAs($this->superAdmin);
        $this->postJson('/api/bmn/tags', ['name' => 'tag_super', 'color' => 'blue'])->assertCreated();
        $this->postJson('/api/bmn/asset-types', [
            'name' => 'JENIS BARU SUPER',
            'category_mode' => 'peralatan',
        ])->assertCreated();
    }

    public function test_five_user_matrix_across_persuratan_kepegawaian_bmn_and_iam(): void
    {
        // Setup 5 Users: 1 Super Admin, 1 Admin, and 3 Regular Users (each linked to an Employee)
        $emp1 = Employee::create([
            'nip' => '199301012022031001',
            'nama_lengkap' => 'User Satu LimaMatrix',
            'jabatan' => 'PEH Pertama',
            'nama_bank' => 'BRI',
            'nomor_rekening' => '1000000001',
            'inactive_notes' => 'Rahasia Emp 1',
            'is_active' => true,
        ]);
        $emp2 = Employee::create([
            'nip' => '199302022022031002',
            'nama_lengkap' => 'User Dua LimaMatrix',
            'jabatan' => 'Polhut Pertama',
            'nama_bank' => 'Mandiri',
            'nomor_rekening' => '2000000002',
            'inactive_notes' => 'Rahasia Emp 2',
            'is_active' => true,
        ]);
        $emp3 = Employee::create([
            'nip' => '199303032022031003',
            'nama_lengkap' => 'User Tiga LimaMatrix',
            'jabatan' => 'Penyuluh Kehutanan',
            'nama_bank' => 'BSI',
            'nomor_rekening' => '3000000003',
            'inactive_notes' => 'Rahasia Emp 3',
            'is_active' => true,
        ]);

        $admin = User::factory()->create([
            'username' => 'admin_5matrix',
            'role' => 'admin',
            'access_modules' => ['surat', 'kepegawaian', 'bmn'],
            'permissions' => [],
            'is_active' => true,
        ]);

        $users = [
            1 => User::factory()->create([
                'username' => $emp1->nip,
                'role' => 'user',
                'access_modules' => ['surat', 'kepegawaian', 'bmn'],
                'permissions' => [],
                'is_active' => true,
            ]),
            2 => User::factory()->create([
                'username' => $emp2->nip,
                'role' => 'user',
                'access_modules' => ['surat', 'kepegawaian', 'bmn'],
                'permissions' => [],
                'is_active' => true,
            ]),
            3 => User::factory()->create([
                'username' => $emp3->nip,
                'role' => 'user',
                'access_modules' => ['surat', 'kepegawaian', 'bmn'],
                'permissions' => [],
                'is_active' => true,
            ]),
        ];
        $emps = [1 => $emp1, 2 => $emp2, 3 => $emp3];

        // =====================================================================
        // A. MODUL PERSURATAN (5-USER MATRIX)
        // =====================================================================
        $letterIds = [];
        foreach ($users as $idx => $u) {
            Sanctum::actingAs($u);
            $res = $this->postJson('/api/surat/surat-keluar', [
                'no_surat' => "S.50{$idx}/K.18/TU/2026",
                'tanggal_surat' => '2026-11-16',
                'tujuan_surat' => "Tujuan User {$idx}",
                'perihal' => "Perihal Khusus User {$idx}",
                'sifat' => 'Biasa',
                'template_type' => 'nota_dinas',
            ])->assertCreated();
            $letterIds[$idx] = $res->json('data.id');
        }

        // Each of the 3 users ONLY sees their own letter and gets 403 on the other 2 users' letters
        foreach ($users as $idx => $u) {
            Sanctum::actingAs($u);
            $list = $this->getJson('/api/surat/surat-keluar')->assertOk();
            $list->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.id', $letterIds[$idx]);

            foreach ($letterIds as $otherIdx => $otherLetterId) {
                if ($otherIdx === $idx) {
                    $this->getJson("/api/surat/surat-keluar/{$otherLetterId}")->assertOk();
                } else {
                    $this->getJson("/api/surat/surat-keluar/{$otherLetterId}")->assertForbidden();
                    $this->putJson("/api/surat/surat-keluar/{$otherLetterId}", [
                        'no_surat' => 'S.TAMPER/2026',
                        'tanggal_surat' => '2026-11-16',
                        'tujuan_surat' => 'Tamper',
                        'perihal' => 'Tamper',
                    ])->assertForbidden();
                    $this->deleteJson("/api/surat/surat-keluar/{$otherLetterId}")->assertForbidden();
                }
            }

            $this->getJson('/api/surat/surat-masuk')->assertForbidden();
            $this->postJson('/api/surat/templates', ['key' => "k_{$idx}", 'nama' => 'T', 'kategori' => 'Umum'])->assertForbidden();
        }

        // Admin sees all 3 letters, can manage Surat Masuk, but gets 403 on template settings
        Sanctum::actingAs($admin);
        $this->getJson('/api/surat/surat-keluar')->assertOk()->assertJsonCount(3, 'data');
        $this->postJson('/api/surat/templates', ['key' => 'k_adm', 'nama' => 'T', 'kategori' => 'Umum'])->assertForbidden();

        // =====================================================================
        // B. MODUL KEPEGAWAIAN & SURAT TUGAS INBOX (5-USER MATRIX)
        // =====================================================================
        foreach ($users as $idx => $u) {
            Sanctum::actingAs($u);
            // Cannot access trashed employees (SEC-05) or ST management inbox (SEC-01)
            $this->getJson('/api/kepegawaian/employees?status=trashed')->assertForbidden();
            $this->getJson('/api/surat-tugas')->assertForbidden();
            $this->getJson('/api/surat-tugas/status-counts')->assertForbidden();
            $this->getJson('/api/kepegawaian/surat-masuk')->assertForbidden();

            // Directory privacy check across all 3 employees
            foreach ($emps as $otherIdx => $targetEmp) {
                $detail = $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}")->assertOk()->json('data');
                if ($otherIdx === $idx) {
                    $this->assertSame("{$idx}00000000{$idx}", $detail['nomor_rekening'] ?? null);
                    $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}/leaves")->assertOk();
                    $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}/assignment-letters")->assertOk();
                    $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}/meal-allowances")->assertOk();
                } else {
                    $this->assertArrayNotHasKey('nomor_rekening', $detail);
                    $this->assertArrayNotHasKey('nama_bank', $detail);
                    $this->assertArrayNotHasKey('inactive_notes', $detail);
                    $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}/leaves")->assertForbidden();
                    $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}/assignment-letters")->assertForbidden();
                    $this->getJson("/api/kepegawaian/employees/{$targetEmp->id}/meal-allowances")->assertForbidden();
                }
            }
        }

        // Admin Kepegawaian can access ST Inbox, trashed employees, and all 3 employees' details, but NOT Settings/IAM/ForceDelete
        Sanctum::actingAs($admin);
        $this->getJson('/api/kepegawaian/employees?status=trashed')->assertOk();
        $this->getJson('/api/surat-tugas')->assertOk();
        $this->getJson('/api/surat-tugas/status-counts')->assertOk();
        $this->getJson('/api/kepegawaian/settings/holidays')->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$emp1->id}/access")->assertForbidden();

        // =====================================================================
        // C. MODUL BMN (5-USER MATRIX)
        // =====================================================================
        $disposedAsset = \App\Modules\Bmn\Models\Asset::create([
            'kode_barang' => '3020101999',
            'nup' => '99',
            'nama_barang' => 'Aset Rusak Dihapus',
            'kondisi' => 'Rusak Berat',
            'nilai_perolehan' => 10000000,
        ]);
        $disposedAsset->delete();

        foreach ($users as $u) {
            Sanctum::actingAs($u);
            $this->getJson('/api/bmn/assets')->assertOk();
            // SEC-04: User cannot query disposed/trashed assets via ?status=disposed
            $this->getJson('/api/bmn/assets?status=disposed')->assertForbidden();
            $this->getJson('/api/bmn/import-review')->assertForbidden();
            $this->getJson('/api/bmn/auction-candidates')->assertForbidden();
            $this->getJson('/api/bmn/document-histories')->assertForbidden();
            $this->postJson('/api/bmn/tags', ['name' => 'illegal_tag', 'color' => 'red'])->assertForbidden();
        }

        Sanctum::actingAs($admin);
        $this->getJson('/api/bmn/assets?status=disposed')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/bmn/tags', ['name' => 'admin_tag_blocked', 'color' => 'red'])->assertForbidden();
        $this->postJson('/api/bmn/assets/bulk-force-delete', ['ids' => [$disposedAsset->id]])->assertForbidden();

        Sanctum::actingAs($this->superAdmin);
        $this->postJson('/api/bmn/assets/bulk-force-delete', ['ids' => [$disposedAsset->id]])->assertOk();
        $this->assertDatabaseMissing('bmn_assets', ['id' => $disposedAsset->id]);
    }

    public function test_per_module_roles_via_iam_enforce_independent_permissions_across_modules(): void
    {
        $empMixA = Employee::create([
            'nip' => '199401012023011001',
            'nama_lengkap' => 'Mixed Role User A',
            'jabatan' => 'Pranata Komputer',
            'nama_bank' => 'BRI',
            'nomor_rekening' => '444455556666',
            'inactive_notes' => 'Rahasia Mixed A',
            'is_active' => true,
        ]);

        $mixedUserA = User::factory()->create([
            'username' => $empMixA->nip,
            'role' => 'user',
            'access_modules' => ['surat'],
            'permissions' => [],
            'is_active' => true,
        ]);
        $mixedUserA->createToken('stale-token-before-iam');

        // 1. Super Admin configures mixed per-module roles via IAM endpoint:
        //    Persuratan = admin, Kepegawaian = user, BMN = admin
        Sanctum::actingAs($this->superAdmin);
        $iamRes = $this->putJson("/api/kepegawaian/employees/{$empMixA->id}/access", [
            'role' => 'user',
            'is_active' => true,
            'access_modules' => ['surat', 'kepegawaian', 'bmn'],
            'module_roles' => [
                'surat' => 'admin',
                'kepegawaian' => 'user',
                'bmn' => 'admin',
            ],
            'permissions' => [],
        ])->assertOk();

        $iamRes->assertJsonPath('data.role', 'user')
            ->assertJsonPath('data.module_roles.surat', 'admin')
            ->assertJsonPath('data.module_roles.kepegawaian', 'user')
            ->assertJsonPath('data.module_roles.bmn', 'admin');

        $mixedUserA->refresh();
        $this->assertCount(0, $mixedUserA->tokens()->get(), 'Existing tokens must be revoked when module_roles change');
        $this->assertSame('admin', $mixedUserA->roleFor('surat'));
        $this->assertSame('user', $mixedUserA->roleFor('kepegawaian'));
        $this->assertSame('user', $mixedUserA->roleFor('surat_tugas'));
        $this->assertSame('admin', $mixedUserA->roleFor('bmn'));
        $this->assertFalse($mixedUserA->canAccessAdminInbox('kepegawaian'));
        $this->assertFalse($mixedUserA->canAccessAdminInbox('surat_tugas'));
        $this->assertTrue($mixedUserA->canAccessAdminInbox('bmn'));

        // Prepare fixtures across all 3 modules
        $otherSurat = SuratKeluar::create([
            'no_surat' => 'S.901/K.18/TU/2026',
            'tanggal_surat' => '2026-11-16',
            'tujuan_surat' => 'Tujuan Lain',
            'perihal' => 'Surat Milik User A Biasa',
            'sifat' => 'Biasa',
            'created_by' => $this->suratUserA->id,
        ]);
        $bmnAsset = \App\Modules\Bmn\Models\Asset::create([
            'kode_barang' => '3020102001',
            'nup' => '1',
            'nama_barang' => 'Kamera Trap Patroli',
            'kondisi' => 'Baik',
            'nilai_perolehan' => 15000000,
        ]);
        $bmnTag = \App\Modules\Bmn\Models\Tag::create([
            'name' => 'sensor',
            'label' => '#sensor',
            'color' => 'green',
        ]);
        $pendingSt = AssignmentLetter::create([
            'nomor_surat' => 'ST.901/K.18/TU/2026',
            'maksud_tujuan' => 'Survey Lapangan Mixed',
            'tempat_tujuan' => 'Kutai',
            'tanggal_mulai' => '2026-11-20',
            'tanggal_selesai' => '2026-11-21',
            'status' => 'pending',
            'created_by' => $this->superAdmin->id,
        ]);

        // 2. Verify /api/user exposes module_roles for FE auth sync
        Sanctum::actingAs($mixedUserA);
        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.module_roles.surat', 'admin')
            ->assertJsonPath('data.module_roles.kepegawaian', 'user')
            ->assertJsonPath('data.module_roles.bmn', 'admin');

        // 3. Persuratan (admin): sees all users' Surat Keluar + manages Surat Masuk, but NOT Super Admin templates
        $this->getJson('/api/surat/surat-keluar')->assertOk()->assertJsonFragment(['id' => $otherSurat->id]);
        $this->getJson('/api/surat/surat-masuk')->assertOk();
        $this->postJson('/api/surat/surat-masuk', [
            'no_agenda' => '099',
            'tanggal_agenda' => '2026-11-16',
            'no_surat' => 'SM.99/2026',
        ])->assertCreated();
        $this->postJson('/api/surat/templates', [
            'key' => 'tpl_mixed',
            'nama' => 'T',
            'kategori' => 'Umum',
        ])->assertForbidden();

        // 4. Kepegawaian & Surat Tugas (user): blocked from admin ops & other employees' sensitive data
        $showOtherEmp = $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}")->assertOk()->json('data');
        $this->assertArrayNotHasKey('nomor_rekening', $showOtherEmp);
        $this->getJson('/api/kepegawaian/employees?status=trashed')->assertForbidden();
        $this->getJson('/api/kepegawaian/surat-masuk')->assertForbidden();
        $this->getJson('/api/kepegawaian/uang-makan/batches')->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}/leaves")->assertForbidden();
        $this->getJson('/api/surat-tugas')->assertForbidden();
        $this->putJson("/api/surat-tugas/{$pendingSt->id}/approve", ['status' => 'approved'])->assertForbidden();
        $this->getJson("/api/kepegawaian/employees/{$empMixA->id}/leaves")->assertOk();

        // 5. BMN (admin): operational BMN allowed, Master Settings & Force Delete still Super Admin only
        $this->getJson('/api/bmn/import-review')->assertOk();
        $this->getJson('/api/bmn/auction-candidates')->assertOk();
        $this->postJson("/api/bmn/assets/{$bmnAsset->id}/tags", ['tag_ids' => [$bmnTag->id]])->assertOk();
        $this->postJson('/api/bmn/tags', ['name' => 'blocked_tag', 'color' => 'blue'])->assertForbidden();
        $this->postJson('/api/bmn/assets/bulk-force-delete', ['ids' => [$bmnAsset->id]])->assertForbidden();

        // 6. Reverse matrix user: Surat = user, Kepegawaian = admin, BMN = user
        $empMixB = Employee::create([
            'nip' => '199402022023011002',
            'nama_lengkap' => 'Mixed Role User B',
            'jabatan' => 'Analis SDM',
            'is_active' => true,
        ]);
        $mixedUserB = User::factory()->create([
            'username' => $empMixB->nip,
            'role' => 'user',
            'access_modules' => ['surat', 'kepegawaian', 'bmn'],
            'module_roles' => [
                'surat' => 'user',
                'kepegawaian' => 'admin',
                'bmn' => 'user',
            ],
            'permissions' => [],
            'is_active' => true,
        ]);

        Sanctum::actingAs($mixedUserB);
        $this->getJson("/api/surat/surat-keluar/{$otherSurat->id}")->assertForbidden();
        $this->getJson('/api/surat/surat-masuk')->assertForbidden();
        $this->getJson('/api/kepegawaian/employees?status=trashed')->assertOk();
        $this->assertSame('999988887777', $this->getJson("/api/kepegawaian/employees/{$this->employeeB->id}")->assertOk()->json('data.nomor_rekening'));
        $this->getJson('/api/kepegawaian/surat-masuk')->assertOk();
        $this->getJson('/api/surat-tugas')->assertOk();
        $this->getJson('/api/kepegawaian/settings/holidays')->assertForbidden();
        $this->getJson('/api/bmn/assets')->assertOk();
        $this->getJson('/api/bmn/import-review')->assertForbidden();
        $this->postJson("/api/bmn/assets/{$bmnAsset->id}/tags", ['tag_ids' => [$bmnTag->id]])->assertForbidden();
    }
}
