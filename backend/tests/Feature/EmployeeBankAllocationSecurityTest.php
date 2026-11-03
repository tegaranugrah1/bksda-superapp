<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
use App\Modules\Kepegawaian\Models\MealAllowanceBatch;
use App\Modules\Kepegawaian\Models\MealAllowanceItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmployeeBankAllocationSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;
    protected User $otherModuleAdmin;
    protected Employee $pnsBri;
    protected Employee $pnsMandiri;
    protected Employee $pppkMandiri;
    protected Employee $mmpBri;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Admin Kepegawaian
        $this->adminUser = User::create([
            'name' => 'Admin Kepegawaian',
            'username' => 'admin_kpg',
            'email' => 'admin_kpg@bksda.local',
            'password' => Hash::make('Password123!'),
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
            'is_active' => true,
        ]);

        // 2. Setup Staf Biasa (Role: user)
        $this->regularUser = User::create([
            'name' => 'Staf Biasa',
            'username' => 'staf_biasa',
            'email' => 'staf_biasa@bksda.local',
            'password' => Hash::make('Password123!'),
            'role' => 'user',
            'access_modules' => ['kepegawaian'],
            'is_active' => true,
        ]);

        // 3. Setup Admin Modul Lain (tanpa akses modul kepegawaian)
        $this->otherModuleAdmin = User::create([
            'name' => 'Admin BMN',
            'username' => 'admin_bmn',
            'email' => 'admin_bmn@bksda.local',
            'password' => Hash::make('Password123!'),
            'role' => 'admin',
            'access_modules' => ['bmn'],
            'is_active' => true,
        ]);

        // 4. Pastikan Master Bank Default Terisi (BRI & Mandiri)
        DB::table('kpg_registered_banks')->updateOrInsert(
            ['nama_bank' => 'BRI'],
            ['created_at' => now(), 'updated_at' => now()]
        );
        DB::table('kpg_registered_banks')->updateOrInsert(
            ['nama_bank' => 'Mandiri'],
            ['created_at' => now(), 'updated_at' => now()]
        );

        // 5. Setup Pegawai Uji
        // 5a. PNS BRI
        $this->pnsBri = Employee::create([
            'nip' => '197503141999031004',
            'nama_lengkap' => 'AGUNG SUSENO, S.PKP',
            'jabatan' => 'Kepala Seksi Wilayah I',
            'pangkat_golongan' => 'Penata Tk. I (III/d)',
            'satuan_kerja' => 'Seksi Wilayah I Berau',
            'nama_bank' => 'BRI',
            'nomor_rekening' => '0123010001',
            'telepon' => '081234567890',
            'is_active' => true,
        ]);

        // 5b. PNS Mandiri
        $this->pnsMandiri = Employee::create([
            'nip' => '198001012005011002',
            'nama_lengkap' => 'BAMBANG HARI TRIMARSITO, S.Si., M.P.',
            'jabatan' => 'Pengendali Ekosistem Hutan Ahli Madya',
            'pangkat_golongan' => 'Pembina (IV/a)',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
            'nama_bank' => 'Mandiri',
            'nomor_rekening' => '1480012345678',
            'telepon' => '081298765432',
            'is_active' => true,
        ]);

        // 5c. PPPK Mandiri (NIP digit 13-14 = '21', golongan = 'Golongan IX' tanpa kata PPPK)
        $this->pppkMandiri = Employee::create([
            'nip' => '199005122024212003',
            'nama_lengkap' => 'A. ALIAH INDAH FITRIAH, S.Hut',
            'jabatan' => 'Penyuluh Kehutanan Ahli Pertama',
            'pangkat_golongan' => 'Golongan IX',
            'satuan_kerja' => 'Seksi Wilayah II Tenggarong',
            'nama_bank' => 'Mandiri',
            'nomor_rekening' => '1480098765432',
            'telepon' => null,
            'is_active' => true,
        ]);

        // 5d. MMP (Masyarakat Mitra Polhut - Tenaga Lapangan)
        $this->mmpBri = Employee::create([
            'nip' => 'MMP-001',
            'nama_lengkap' => 'SURIPTO',
            'jabatan' => 'Masyarakat Mitra Polhut',
            'pangkat_golongan' => null,
            'satuan_kerja' => 'Resor Samboja',
            'nama_bank' => 'BRI',
            'nomor_rekening' => null,
            'telepon' => null,
            'is_active' => true,
        ]);
    }

    // =========================================================================
    // 1. SECURITY TESTS (TC-SEC-01 s.d. TC-SEC-06 & TC-ROOT-12)
    // =========================================================================

    /**
     * TC-SEC-01: Akses Unauthenticated (Tanpa Bearer Token) ditolak 401.
     */
    public function test_tc_sec_01_unauthenticated_requests_are_denied(): void
    {
        $this->postJson('/api/kepegawaian/settings/registered-banks', ['nama_bank' => 'BSI'])
            ->assertStatus(401);

        $this->deleteJson('/api/kepegawaian/settings/registered-banks/BRI')
            ->assertStatus(401);

        $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->pnsBri->id],
            'nama_bank' => 'Mandiri',
        ])->assertStatus(401);
    }

    /**
     * TC-SEC-02: Akses Regular User (Role: user) ditolak 403 Forbidden pada endpoint mutasi.
     */
    public function test_tc_sec_02_regular_user_is_forbidden_from_mutating_banks(): void
    {
        Sanctum::actingAs($this->regularUser);

        $this->postJson('/api/kepegawaian/settings/registered-banks', ['nama_bank' => 'BSI'])
            ->assertStatus(403);

        $this->deleteJson('/api/kepegawaian/settings/registered-banks/BRI')
            ->assertStatus(403);

        $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->pnsBri->id],
            'nama_bank' => 'Mandiri',
        ])->assertStatus(403);
    }

    /**
     * TC-SEC-03 & TC-ROOT-12: Penolakan Stored XSS / SQL Injection pada Nama Bank dengan HTTP 422.
     */
    public function test_tc_sec_03_and_root_12_xss_and_sqli_payloads_in_bank_registration_are_rejected(): void
    {
        Sanctum::actingAs($this->adminUser);

        $maliciousPayloads = [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(document.cookie)>',
            'BRI\'; DROP TABLE kpg_registered_banks;--',
            'Bank<svg onload=alert(1)>',
            'Bank" onmouseover="alert(1)',
        ];

        foreach ($maliciousPayloads as $payload) {
            $response = $this->postJson('/api/kepegawaian/settings/registered-banks', [
                'nama_bank' => $payload,
            ]);

            $response->assertStatus(422)
                ->assertJsonValidationErrors(['nama_bank']);
        }

        // Pastikan tidak ada bank jahat yang tersimpan di database
        $this->assertEquals(2, DB::table('kpg_registered_banks')->count());
    }

    /**
     * TC-SEC-04: Pencegahan SQL Injection pada Path Parameter Hapus Bank.
     */
    public function test_tc_sec_04_sqli_in_path_parameter_does_not_break_query(): void
    {
        Sanctum::actingAs($this->adminUser);

        $sqliPayload = rawurlencode("BRI' OR '1'='1");
        $response = $this->deleteJson("/api/kepegawaian/settings/registered-banks/{$sqliPayload}");

        // Bank dengan nama literal payload tidak ditemukan -> 404, tanpa syntax error database
        $response->assertStatus(404);
        $this->assertEquals(2, DB::table('kpg_registered_banks')->count());
    }

    /**
     * TC-SEC-05: Proteksi Hapus Bank Aktif (In-Use Guard).
     */
    public function test_tc_sec_05_in_use_guard_prevents_deleting_active_bank(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Bank BRI masih digunakan oleh pnsBri dan mmpBri
        $response = $this->deleteJson('/api/kepegawaian/settings/registered-banks/BRI');

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
        $this->assertStringContainsString('masih digunakan oleh', $response->json('message'));

        // Pastikan BRI tidak terhapus
        $this->assertDatabaseHas('kpg_registered_banks', ['nama_bank' => 'BRI']);
    }

    /**
     * TC-SEC-06: Otorisasi Akses Modul Kepegawaian (User admin modul BMN ditolak 403).
     */
    public function test_tc_sec_06_admin_without_kepegawaian_module_access_is_forbidden(): void
    {
        Sanctum::actingAs($this->otherModuleAdmin);

        $this->getJson('/api/kepegawaian/settings/registered-banks')
            ->assertStatus(403);

        $this->getJson('/api/kepegawaian/settings/employee-banks')
            ->assertStatus(403);
    }

    // =========================================================================
    // 2. FUNCTIONAL BACKEND & ROOT INVARIANTS (TC-BE-01 s.d. 06 & ROOT-05 s.d. 14)
    // =========================================================================

    /**
     * TC-BE-01: Memuat daftar bank terdaftar dengan agregasi count pegawai aktif.
     */
    public function test_tc_be_01_get_registered_banks_returns_accurate_counts(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->getJson('/api/kepegawaian/settings/registered-banks');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => ['id', 'nama_bank', 'count'],
                ],
            ]);

        $data = collect($response->json('data'));
        $bri = $data->firstWhere('nama_bank', 'BRI');
        $mandiri = $data->firstWhere('nama_bank', 'Mandiri');

        $expectedBri = Employee::where('is_active', true)->whereRaw('LOWER(nama_bank) = ?', ['bri'])->count();
        $expectedMandiri = Employee::where('is_active', true)->whereRaw('LOWER(nama_bank) = ?', ['mandiri'])->count();

        $this->assertEquals($expectedBri, $bri['count']);
        $this->assertEquals($expectedMandiri, $mandiri['count']);
    }

    /**
     * TC-BE-02 & TC-BE-03: Registrasi bank valid & penolakan duplikasi case-insensitive.
     */
    public function test_tc_be_02_and_03_store_valid_bank_and_reject_case_insensitive_duplicate(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Simpan bank baru
        $res1 = $this->postJson('/api/kepegawaian/settings/registered-banks', [
            'nama_bank' => 'BSI',
        ]);
        $res1->assertStatus(201)
            ->assertJson(['success' => true]);
        $this->assertDatabaseHas('kpg_registered_banks', ['nama_bank' => 'BSI']);

        // 2. Coba simpan bank duplikat huruf kecil
        $res2 = $this->postJson('/api/kepegawaian/settings/registered-banks', [
            'nama_bank' => 'bsi',
        ]);
        $res2->assertStatus(422);

        // 3. Coba simpan bank duplikat 'bri'
        $res3 = $this->postJson('/api/kepegawaian/settings/registered-banks', [
            'nama_bank' => 'bri',
        ]);
        $res3->assertStatus(422);
    }

    /**
     * TC-BE-04: Hapus bank bersih (0 pegawai aktif) berhasil 200 OK.
     */
    public function test_tc_be_04_delete_unused_bank_succeeds(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Daftarkan Bankaltimtara yang belum punya pegawai
        DB::table('kpg_registered_banks')->insert([
            'nama_bank' => 'Bankaltimtara',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->deleteJson('/api/kepegawaian/settings/registered-banks/Bankaltimtara');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('kpg_registered_banks', ['nama_bank' => 'Bankaltimtara']);
    }

    /**
     * TC-ROOT-05 & 06: Klasifikasi dan Filter Group PNS / PPPK / MMP di getEmployeeBanks.
     */
    public function test_tc_root_05_and_06_employee_classification_and_group_filtering(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Panggil semua
        $resAll = $this->getJson('/api/kepegawaian/settings/employee-banks');
        $resAll->assertStatus(200);
        $items = collect($resAll->json('data.items'));

        $pnsItem = $items->firstWhere('id', $this->pnsBri->id);
        $mandiriItem = $items->firstWhere('id', $this->pnsMandiri->id);
        $pppkItem = $items->firstWhere('id', $this->pppkMandiri->id);
        $mmpItem = $items->firstWhere('id', $this->mmpBri->id);

        $this->assertEquals('PNS', $pnsItem['jenis_pegawai']);
        $this->assertEquals('PNS', $mandiriItem['jenis_pegawai']);
        $this->assertEquals('PPPK', $pppkItem['jenis_pegawai']); // Terdeteksi PPPK meski pangkat_golongan 'Golongan IX'
        $this->assertEquals('MMP', $mmpItem['jenis_pegawai']);   // Terdeteksi MMP, BUKAN PNS!

        // 2. Filter group=pns
        $resPns = $this->getJson('/api/kepegawaian/settings/employee-banks?group=pns');
        $pnsItems = collect($resPns->json('data.items'));
        $this->assertTrue($pnsItems->contains('id', $this->pnsBri->id));
        $this->assertTrue($pnsItems->contains('id', $this->pnsMandiri->id));
        $this->assertFalse($pnsItems->contains('id', $this->mmpBri->id));
        $this->assertFalse($pnsItems->contains('id', $this->pppkMandiri->id));

        // 3. Filter group=pppk
        $resPppk = $this->getJson('/api/kepegawaian/settings/employee-banks?group=pppk');
        $pppkItems = collect($resPppk->json('data.items'));
        $this->assertTrue($pppkItems->contains('id', $this->pppkMandiri->id));
        $this->assertFalse($pppkItems->contains('id', $this->pnsBri->id));
        $this->assertFalse($pppkItems->contains('id', $this->mmpBri->id));

        // 4. Filter group=mmp
        $resMmp = $this->getJson('/api/kepegawaian/settings/employee-banks?group=mmp');
        $mmpItems = collect($resMmp->json('data.items'));
        $this->assertTrue($mmpItems->contains('id', $this->mmpBri->id));
        $this->assertFalse($mmpItems->contains('id', $this->pnsBri->id));
        $this->assertFalse($mmpItems->contains('id', $this->pppkMandiri->id));
    }

    /**
     * TC-ROOT-07: batchUpdateEmployeeBanks mencatat audit trail EmployeeHistory secara atomik.
     */
    public function test_tc_root_07_batch_bank_update_creates_employee_history(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->pnsBri->id],
            'nama_bank' => 'Mandiri',
        ]);

        $response->assertStatus(200);

        // Verifikasi perubahan di database
        $this->assertEquals('Mandiri', $this->pnsBri->fresh()->nama_bank);

        // Verifikasi audit trail tercatat
        $history = EmployeeHistory::where('employee_id', $this->pnsBri->id)->first();
        $this->assertNotNull($history);
        $this->assertEquals('UPDATE_BANK_ALLOCATION', $history->action);
        $this->assertEquals($this->adminUser->id, $history->user_id);

        $changes = is_array($history->changes) ? $history->changes : json_decode($history->changes, true);
        $this->assertEquals('BRI', $changes['nama_bank']['old']);
        $this->assertEquals('Mandiri', $changes['nama_bank']['new']);
    }

    /**
     * TC-ROOT-08: batchUpdateEmployeeBanks mensanitasi tanda hubung '-' menjadi null.
     */
    public function test_tc_root_08_batch_update_sanitizes_dash_to_null(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->pnsBri->id],
            'single_update' => true,
            'nomor_rekening' => '-',
            'telepon' => '-',
        ]);

        $response->assertStatus(200);

        $updated = $this->pnsBri->fresh();
        $this->assertNull($updated->nomor_rekening);
        $this->assertNull($updated->telepon);
    }

    /**
     * TC-ROOT-09: batchUpdateEmployeeBanks dengan ID fiktif ditolak 422.
     */
    public function test_tc_root_09_batch_update_rejects_non_existent_employee_id(): void
    {
        Sanctum::actingAs($this->adminUser);

        $response = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [999999],
            'nama_bank' => 'Mandiri',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['employee_ids.0']);
    }

    /**
     * TC-ROOT-10: Validasi Master Bank menolak nama bank yang belum terdaftar.
     */
    public function test_tc_root_10_unregistered_bank_is_rejected_on_both_update_endpoints(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Jalur batchUpdateEmployeeBanks
        $resBatch = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->pnsBri->id],
            'nama_bank' => 'BANK_LIAR_XYZ',
        ]);
        $resBatch->assertStatus(422)
            ->assertJsonValidationErrors(['nama_bank']);

        // 2. Jalur EmployeeController::update via EmployeeRequest
        $resEmp = $this->putJson("/api/kepegawaian/employees/{$this->pnsBri->id}", [
            'nip' => $this->pnsBri->nip,
            'nama_lengkap' => $this->pnsBri->nama_lengkap,
            'nama_bank' => 'BANK_LIAR_XYZ',
        ]);
        $resEmp->assertStatus(422)
            ->assertJsonValidationErrors(['nama_bank']);
    }

    /**
     * TC-ROOT-13: Pencarian aman terhadap SQL wildcard & case-insensitive di PostgreSQL.
     */
    public function test_tc_root_13_search_handles_case_insensitivity_and_wildcards(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Huruf kecil 'agung' harus menemukan 'AGUNG SUSENO'
        $resLower = $this->getJson('/api/kepegawaian/settings/employee-banks?search=agung');
        $resLower->assertStatus(200);
        $this->assertCount(1, $resLower->json('data.items'));
        $this->assertEquals($this->pnsBri->id, $resLower->json('data.items.0.id'));

        // 2. Karakter wildcard '%' tidak boleh mengembalikan semua data jika tidak ada yang mengandung literal '%'
        $resWildcard = $this->getJson('/api/kepegawaian/settings/employee-banks?search=%');
        $resWildcard->assertStatus(200);
        $this->assertCount(0, $resWildcard->json('data.items'));
    }

    /**
     * TC-ROOT-03 & 04: Batch Uang Makan & Export Excel mempertahankan Bank Mandiri.
     */
    public function test_tc_root_03_and_04_batch_preserves_mandiri_and_excel_exports_correctly(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Simpan batch uang makan dengan 1 PNS BRI dan 1 PNS Mandiri
        $batchPayload = [
            'periode_bulan' => '2026-10',
            'nama_batch' => 'Rekonsiliasi Test Oktober 2026',
            'items' => [
                [
                    'employee_id' => $this->pnsBri->id,
                    'nip' => $this->pnsBri->nip,
                    'nama_lengkap' => $this->pnsBri->nama_lengkap,
                    'jabatan' => $this->pnsBri->jabatan,
                    'jenis_pegawai' => 'PNS',
                    'golongan' => 'Penata Tk. I (III/d)',
                    'nama_bank' => 'BRI',
                    'nomor_rekening' => '0123010001',
                    'tarif_harian' => 37000,
                    'persen_pph21' => 5,
                    'jml_hari_kerja' => 22,
                    'jml_hadir' => 20,
                    'jml_pd' => 2,
                    'jml_cuti' => 0,
                    'jml_sakit' => 0,
                    'jml_izin' => 0,
                    'jml_alpa' => 0,
                    'uang_makan_bruto' => 740000,
                    'potongan_pph21' => 37000,
                    'uang_makan_netto' => 703000,
                    'daily_matrix' => ['2026-10-01' => 'H'],
                ],
                [
                    'employee_id' => $this->pnsMandiri->id,
                    'nip' => $this->pnsMandiri->nip,
                    'nama_lengkap' => $this->pnsMandiri->nama_lengkap,
                    'jabatan' => $this->pnsMandiri->jabatan,
                    'jenis_pegawai' => 'PNS',
                    'golongan' => 'Pembina (IV/a)',
                    'nama_bank' => 'Mandiri',
                    'nomor_rekening' => '1480012345678',
                    'tarif_harian' => 41000,
                    'persen_pph21' => 15,
                    'jml_hari_kerja' => 22,
                    'jml_hadir' => 22,
                    'jml_pd' => 0,
                    'jml_cuti' => 0,
                    'jml_sakit' => 0,
                    'jml_izin' => 0,
                    'jml_alpa' => 0,
                    'uang_makan_bruto' => 902000,
                    'potongan_pph21' => 135300,
                    'uang_makan_netto' => 766700,
                    'daily_matrix' => ['2026-10-01' => 'H'],
                ],
            ],
        ];

        // 1. Simpan Batch (TC-ROOT-03)
        $resBatch = $this->postJson('/api/kepegawaian/uang-makan/batches', $batchPayload);
        $resBatch->assertStatus(201);
        $batchId = $resBatch->json('data.id');

        // Pastikan item Mandiri tersimpan sebagai Mandiri di DB, BUKAN BRI
        $itemsInDb = MealAllowanceItem::where('batch_id', $batchId)->get();
        $this->assertEquals(2, $itemsInDb->count());
        $mandiriItem = $itemsInDb->firstWhere('nama_bank', 'Mandiri');
        $this->assertNotNull($mandiriItem);
        $this->assertEquals('1480012345678', $mandiriItem->nomor_rekening);

        // 2. Export Excel (TC-ROOT-04)
        $resExcel = $this->postJson('/api/kepegawaian/uang-makan/export-excel', [
            'month' => 10,
            'year' => 2026,
            'days_in_month' => 31,
            'items' => $batchPayload['items'],
        ]);
        $resExcel->assertStatus(200);
        $resExcel->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }
}
