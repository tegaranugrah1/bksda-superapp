<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\MealAllowanceBatch;
use App\Modules\Kepegawaian\Models\MealAllowanceItem;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MealAllowanceSecurityAndReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $regularUser;
    protected Employee $employeeSyafey;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Admin Actor with Kepegawaian module access
        $this->adminUser = User::create([
            'name' => 'Admin Kepegawaian',
            'username' => 'admin_kpg',
            'email' => 'admin_kpg@bksda.local',
            'password' => Hash::make('Password123!'),
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
            'is_active' => true,
        ]);

        // 2. Setup Regular Employee Actor (No admin privileges)
        $this->regularUser = User::create([
            'name' => 'Pegawai Biasa',
            'username' => 'staf_biasa',
            'email' => 'staf_biasa@bksda.local',
            'password' => Hash::make('Password123!'),
            'role' => 'user',
            'access_modules' => ['kepegawaian'],
            'is_active' => true,
        ]);

        // 3. Setup Employee Profile in DB
        $this->employeeSyafey = Employee::create([
            'nip' => '200009222024211004',
            'nama_lengkap' => 'Achmad Syafey N',
            'jabatan' => 'Polhut Terampil',
            'pangkat_golongan' => 'PPPK Golongan V',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
            'is_active' => true,
        ]);
    }

    /**
     * Test 1: Unauthenticated user is blocked (401 Unauthorized)
     */
    public function test_unauthenticated_user_cannot_access_reconciliation_endpoints(): void
    {
        $response = $this->postJson('/api/kepegawaian/uang-makan/reconcile', []);
        $response->assertStatus(401);

        $responseBatches = $this->getJson('/api/kepegawaian/uang-makan/batches');
        $responseBatches->assertStatus(401);
    }

    /**
     * Test 2: Regular user (role:user) is forbidden (403 Forbidden)
     */
    public function test_regular_user_without_admin_role_is_forbidden(): void
    {
        Sanctum::actingAs($this->regularUser);

        $response = $this->postJson('/api/kepegawaian/uang-makan/reconcile', []);
        $response->assertStatus(403);

        $responseBatches = $this->getJson('/api/kepegawaian/uang-makan/batches');
        $responseBatches->assertStatus(403);
    }

    /**
     * Test 3: Malicious file upload is blocked (MIME/extension validation)
     */
    public function test_malicious_file_upload_is_rejected(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Upload a malicious php/exe file pretending to be attendance
        $fakeScript = UploadedFile::fake()->create('exploit.php', 10, 'application/x-php');

        $response = $this->postJson('/api/kepegawaian/uang-makan/reconcile', [
            'files' => [$fakeScript],
            'month' => 9,
            'year' => 2026,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['files.0']);
    }

    /**
     * Test 4: SIKADIR Parser & Golden Checksum Verification
     */
    public function test_sikadir_parser_correctly_reads_html_xls_matrix(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Build a mock SIKADIR HTML export content matching real SIKADIR table
        $mockSikadirHtml = '
        <html>
        <head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head>
        <body>
            <table>
                <tr><td>IA</td><td>DAFTAR ABSENSI TUNJANGAN KINERJA PEGAWAI</td></tr>
            </table>
            <table>
                <tr><td>NAMA</td><td>Achmad Syafey N</td></tr>
                <tr><td>NIP</td><td>200009222024211004</td></tr>
                <tr><td>JABATAN</td><td>POLHUT TERAMPIL</td></tr>
                <tr><td>KELAS JABATAN</td><td>5</td></tr>
                <tr><td>GOLONGAN</td><td></td></tr>
                <tr><td>BULAN</td><td>September 2026</td><td colspan="5">Uang Makan : 3; Jumlah Kehadiran : 3</td></tr>
            </table>
            <table class="wbo">
                <tbody>
                    <tr><td>1</td><td>01/09/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>
                    <tr><td>2</td><td>02/09/2026</td><td>Wfo</td><td>07:35</td><td>16:05</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>
                    <tr><td>3</td><td>03/09/2026</td><td>Wfo</td><td>07:31</td><td>16:02</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>
                </tbody>
            </table>
        </body>
        </html>';

        $file = UploadedFile::fake()->createWithContent('syafey_presensi.xls', $mockSikadirHtml);

        $response = $this->postJson('/api/kepegawaian/uang-makan/reconcile', [
            'files' => [$file],
            'month' => 9,
            'year' => 2026,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.items.0.nip', '200009222024211004');
        $response->assertJsonPath('data.items.0.jml_hadir', 3);
        $response->assertJsonPath('data.items.0.tarif_harian', 35000);
        $response->assertJsonPath('data.items.0.uang_makan_bruto', 105000);
        $response->assertJsonPath('data.items.0.potongan_pph21', 0);
        $response->assertJsonPath('data.items.0.uang_makan_netto', 105000);
    }

    /**
     * Test 5: Reconciler automatically overrides Hadir to PD when Surat Tugas exists
     */
    public function test_attendance_reconciler_overrides_hadir_to_pd_when_st_exists(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. Create an active approved Surat Tugas for Syafey on 2026-09-02 to 2026-09-03
        $st = AssignmentLetter::create([
            'id' => (string) Str::uuid(),
            'nomor_surat' => 'ST.888/BKSDA/2026',
            'maksud_tujuan' => 'Patroli Pengamanan Kawasan Konservasi',
            'tanggal_mulai' => '2026-09-02',
            'tanggal_selesai' => '2026-09-03',
            'sumber_dana' => 'dipa',
            'status' => 'approved',
        ]);

        // Attach employee to ST
        $st->employees()->attach($this->employeeSyafey->id, [
            'peran' => 'Pelaksana',
        ]);

        // 2. Prepare SIKADIR presensi where day 1, 2, 3 are all marked Hadir
        $mockSikadirHtml = '
        <html>
        <body>
            <table>
                <tr><td>NAMA</td><td>Achmad Syafey N</td></tr>
                <tr><td>NIP</td><td>200009222024211004</td></tr>
                <tr><td>JABATAN</td><td>POLHUT TERAMPIL</td></tr>
                <tr><td>KELAS JABATAN</td><td>5</td></tr>
                <tr><td>BULAN</td><td>September 2026</td></tr>
            </table>
            <table class="wbo">
                <tbody>
                    <tr><td>1</td><td>01/09/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>
                    <tr><td>2</td><td>02/09/2026</td><td>Wfo</td><td>07:35</td><td>16:05</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>
                    <tr><td>3</td><td>03/09/2026</td><td>Wfo</td><td>07:31</td><td>16:02</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr>
                </tbody>
            </table>
        </body>
        </html>';

        $file = UploadedFile::fake()->createWithContent('syafey_st_override.xls', $mockSikadirHtml);

        $response = $this->postJson('/api/kepegawaian/uang-makan/reconcile', [
            'files' => [$file],
            'month' => 9,
            'year' => 2026,
        ]);

        $response->assertStatus(200);
        $data = $response->json('data.items.0');

        // Day 1 should remain H
        $status1 = is_array($data['daily_matrix']['1']) ? $data['daily_matrix']['1']['status'] : $data['daily_matrix']['1'];
        $this->assertEquals('H', str_replace('*', '', $status1));

        // Day 2 and 3 should be overridden to PD
        $status2 = is_array($data['daily_matrix']['2']) ? $data['daily_matrix']['2']['status'] : $data['daily_matrix']['2'];
        $this->assertEquals('PD', str_replace('*', '', $status2));

        $status3 = is_array($data['daily_matrix']['3']) ? $data['daily_matrix']['3']['status'] : $data['daily_matrix']['3'];
        $this->assertEquals('PD', str_replace('*', '', $status3));

        // Overrides count: 2 days overridden
        $this->assertCount(2, $data['override_logs']);
        $this->assertEquals(1, $data['jml_hadir']); // Only day 1 gets meal allowance
        $this->assertEquals(2, $data['jml_pd']);
        $this->assertEquals(35000, $data['uang_makan_bruto']); // 1 day * 35.000
    }

    /**
     * Test 6: Batch Storage, Retrieval, and Deletion Lifecycle
     */
    public function test_batch_crud_lifecycle(): void
    {
        Sanctum::actingAs($this->adminUser);

        $batchPayload = [
            'title' => 'Uang Makan September 2026 Periode 1',
            'month' => 9,
            'year' => 2026,
            'days_in_month' => 30,
            'items' => [
                [
                    'nip' => '200009222024211004',
                    'nama' => 'Achmad Syafey N',
                    'jabatan' => 'Polhut Terampil',
                    'golongan' => 'PPPK Golongan V',
                    'tarif' => 35000,
                    'pph_rate' => 0.0,
                    'daily_matrix' => ['1' => 'H', '2' => 'PD*', '3' => 'H'],
                    'override_logs' => [],
                    'total_working_days' => 22,
                    'total_hadir' => 2,
                    'total_pd' => 1,
                    'total_cuti' => 0,
                    'total_sakit' => 0,
                    'total_izin' => 0,
                    'total_alpa' => 0,
                    'total_bruto' => 70000,
                    'total_pph' => 0,
                    'total_netto' => 70000,
                ],
            ],
        ];

        // Store batch
        $createResp = $this->postJson('/api/kepegawaian/uang-makan/batches', $batchPayload);
        $createResp->assertStatus(201);
        $batchId = $createResp->json('data.id');

        $this->assertDatabaseHas('kpg_meal_allowance_batches', [
            'id' => $batchId,
            'nama_batch' => 'Uang Makan September 2026 Periode 1',
            'total_netto' => 70000,
        ]);

        $this->assertDatabaseHas('kpg_meal_allowance_items', [
            'batch_id' => $batchId,
            'nip' => '200009222024211004',
            'jml_hadir' => 2,
        ]);

        // Get batches list (paginated)
        $listResp = $this->getJson('/api/kepegawaian/uang-makan/batches');
        $listResp->assertStatus(200);
        $this->assertEquals(1, $listResp->json('data.total'));

        // Show single batch
        $showResp = $this->getJson("/api/kepegawaian/uang-makan/batches/{$batchId}");
        $showResp->assertStatus(200);
        $showResp->assertJsonPath('data.items.0.nip', '200009222024211004');

        // Delete batch
        $delResp = $this->deleteJson("/api/kepegawaian/uang-makan/batches/{$batchId}");
        $delResp->assertStatus(200);

        $this->assertDatabaseMissing('kpg_meal_allowance_batches', ['id' => $batchId]);
        $this->assertDatabaseMissing('kpg_meal_allowance_items', ['batch_id' => $batchId]);
    }

    /**
     * Test 7: Excel Export returns valid binary spreadsheet
     */
    public function test_export_excel_returns_xlsx_stream(): void
    {
        Sanctum::actingAs($this->adminUser);

        $exportPayload = [
            'month' => 9,
            'year' => 2026,
            'days_in_month' => 30,
            'items' => [
                [
                    'nip' => '200009222024211004',
                    'nama' => 'Achmad Syafey N',
                    'jabatan' => 'Polhut Terampil',
                    'golongan' => 'PPPK Golongan V',
                    'tarif' => 35000,
                    'pph_rate' => 0.0,
                    'daily_matrix' => ['1' => 'H', '2' => 'H'],
                    'override_logs' => [],
                    'total_working_days' => 22,
                    'total_hadir' => 2,
                    'total_pd' => 0,
                    'total_cuti' => 0,
                    'total_sakit' => 0,
                    'total_izin' => 0,
                    'total_alpa' => 0,
                    'total_bruto' => 70000,
                    'total_pph' => 0,
                    'total_netto' => 70000,
                ],
            ],
        ];

        $response = $this->post('/api/kepegawaian/uang-makan/export-excel', $exportPayload);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition') ?? '');
    }

    /**
     * Test 8: Multiple files with different months are rejected with MISMATCHED_PERIODS notification
     */
    public function test_mismatched_periods_in_multiple_files_is_rejected(): void
    {
        Sanctum::actingAs($this->adminUser);

        $htmlSept = '
        <html><body>
            <table><tr><td>NAMA</td><td>Pegawai A</td></tr><tr><td>NIP</td><td>199001012015011001</td></tr><tr><td>BULAN</td><td>September 2026</td></tr></table>
            <table class="wbo"><tbody><tr><td>1</td><td>01/09/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr></tbody></table>
        </body></html>';

        $htmlOct = '
        <html><body>
            <table><tr><td>NAMA</td><td>Pegawai B</td></tr><tr><td>NIP</td><td>199202022018022002</td></tr><tr><td>BULAN</td><td>Oktober 2026</td></tr></table>
            <table class="wbo"><tbody><tr><td>1</td><td>01/10/2026</td><td>Wfo</td><td>07:30</td><td>16:00</td><td></td><td></td><td></td><td></td><td></td><td>Hadir</td></tr></tbody></table>
        </body></html>';

        $fileSept = UploadedFile::fake()->createWithContent('presensi_september.xls', $htmlSept);
        $fileOct = UploadedFile::fake()->createWithContent('presensi_oktober.xls', $htmlOct);

        $response = $this->postJson('/api/kepegawaian/uang-makan/reconcile', [
            'files' => [$fileSept, $fileOct],
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('success', false);
        $response->assertJsonPath('error_code', 'MISMATCHED_PERIODS');
        $this->assertCount(2, $response->json('groups'));
    }

    /**
     * Test 9: Calendar endpoint returns days, holidays, and cuti bersama SKB 3 Menteri
     */
    public function test_calendar_endpoint_returns_holidays_and_cuti_bersama(): void
    {
        Sanctum::actingAs($this->adminUser);

        // Maret 2026 has Nyepi, Idul Fitri, and Cuti Bersama
        $response = $this->getJson('/api/kepegawaian/uang-makan/calendar?year=2026&month=3');

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('data.year', 2026);
        $response->assertJsonPath('data.month', 3);
        $response->assertJsonPath('data.days_in_month', 31);
        $holidays = $response->json('data.holidays');
        $this->assertNotEmpty($holidays);

        // Future year 2028 test: Agustus 2028 automatically knows 17 Agustus (Hari Kemerdekaan RI)
        $resp2028 = $this->getJson('/api/kepegawaian/uang-makan/calendar?year=2028&month=8');
        $resp2028->assertStatus(200);
        $resp2028->assertJsonPath('data.holidays.17.name', 'Hari Kemerdekaan RI');
    }

    /**
     * Test 10: Holiday Settings CRUD and RBAC Security
     */
    public function test_holiday_settings_crud_and_security(): void
    {
        // 1. Regular user is forbidden
        Sanctum::actingAs($this->regularUser);
        $this->getJson('/api/kepegawaian/settings/holidays?year=2027')->assertStatus(403);
        $this->postJson('/api/kepegawaian/settings/holidays', [
            'tanggal' => '2027-05-15',
            'nama' => 'Libur Kustom',
        ])->assertStatus(403);

        // 2. Admin can create, list, and delete
        Sanctum::actingAs($this->adminUser);

        // Create
        $storeResp = $this->postJson('/api/kepegawaian/settings/holidays', [
            'tanggal' => '2027-05-15',
            'nama' => 'Hari Libur Kustom BKSDA',
            'is_cuti_bersama' => true,
        ]);
        $storeResp->assertStatus(200);
        $storeResp->assertJsonPath('success', true);
        $holidayId = $storeResp->json('data.id');

        $this->assertDatabaseHas('kpg_holidays', [
            'id' => $holidayId,
            'tanggal' => '2027-05-15',
            'tahun' => 2027,
            'nama' => 'Hari Libur Kustom BKSDA',
            'is_cuti_bersama' => 1,
        ]);

        // List
        $listResp = $this->getJson('/api/kepegawaian/settings/holidays?year=2027');
        $listResp->assertStatus(200);
        $this->assertTrue(collect($listResp->json('data.holidays'))->contains('nama', 'Hari Libur Kustom BKSDA'));

        // Delete
        $delResp = $this->deleteJson("/api/kepegawaian/settings/holidays/{$holidayId}");
        $delResp->assertStatus(200);
        $this->assertDatabaseMissing('kpg_holidays', ['id' => $holidayId]);
    }

    /**
     * Test 11: Employee Bank Settings Batch Update & Allowlist Validation
     */
    public function test_employee_bank_settings_batch_update_and_security(): void
    {
        // 1. Regular user is forbidden
        Sanctum::actingAs($this->regularUser);
        $this->getJson('/api/kepegawaian/settings/employee-banks')->assertStatus(403);
        $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->employeeSyafey->id],
            'nama_bank' => 'Mandiri',
        ])->assertStatus(403);

        // 2. Admin with empty employee_ids should be rejected
        Sanctum::actingAs($this->adminUser);
        $invalidResp = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [],
            'nama_bank' => 'BSI',
        ]);
        $invalidResp->assertStatus(422);
        $invalidResp->assertJsonValidationErrors(['employee_ids']);

        // 3. Admin batch update to BSI (Bank Syariah Indonesia) & Mandiri
        $bsiResp = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->employeeSyafey->id],
            'nama_bank' => 'BSI',
        ]);
        $bsiResp->assertStatus(200);
        $this->assertDatabaseHas('kpg_employees', [
            'id' => $this->employeeSyafey->id,
            'nama_bank' => 'BSI',
        ]);

        $validResp = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->employeeSyafey->id],
            'nama_bank' => 'Mandiri',
        ]);
        $validResp->assertStatus(200);
        $this->assertDatabaseHas('kpg_employees', [
            'id' => $this->employeeSyafey->id,
            'nama_bank' => 'Mandiri',
        ]);

        // 4. Admin single update with account number and phone
        $singleResp = $this->putJson('/api/kepegawaian/settings/employee-banks/batch', [
            'employee_ids' => [$this->employeeSyafey->id],
            'single_update' => true,
            'nama_bank' => 'BRI',
            'nomor_rekening' => '012345678901234',
            'telepon' => '081234567890',
        ]);
        $singleResp->assertStatus(200);
        $this->assertDatabaseHas('kpg_employees', [
            'id' => $this->employeeSyafey->id,
            'nama_bank' => 'BRI',
            'nomor_rekening' => '012345678901234',
            'telepon' => '081234567890',
        ]);
    }

    /**
     * Test 12: Excel Export creates 4 Matrix Sheets (PNS_BRI, PNS_MNDRI, PPPK_MNDRI, PPPK_BRI) + 2 Nominatif Sheets
     */
    public function test_export_excel_creates_four_matrix_sheets_and_two_nominatif_sheets(): void
    {
        Sanctum::actingAs($this->adminUser);

        $exportPayload = [
            'month' => 9,
            'year' => 2026,
            'days_in_month' => 30,
            'items' => [
                [
                    'nip' => '198001012005011001',
                    'nama' => 'PNS Rekening BRI',
                    'jabatan' => 'Pengendali Ekosistem Hutan',
                    'golongan' => 'Penata Muda (III/a)',
                    'nama_bank' => 'BRI',
                    'tarif' => 37000,
                    'pph_rate' => 5.0,
                    'daily_matrix' => ['1' => 'H'],
                    'total_working_days' => 22,
                    'total_hadir' => 1,
                    'total_bruto' => 37000,
                    'total_pph' => 1850,
                    'total_netto' => 35150,
                ],
                [
                    'nip' => '198202022006021002',
                    'nama' => 'PNS Rekening Mandiri',
                    'jabatan' => 'Polhut Ahli Muda',
                    'golongan' => 'Penata (III/c)',
                    'nama_bank' => 'Mandiri',
                    'tarif' => 37000,
                    'pph_rate' => 5.0,
                    'daily_matrix' => ['1' => 'H'],
                    'total_working_days' => 22,
                    'total_hadir' => 1,
                    'total_bruto' => 37000,
                    'total_pph' => 1850,
                    'total_netto' => 35150,
                ],
                [
                    'nip' => '200009222024211004',
                    'nama' => 'PPPK Rekening Mandiri',
                    'jabatan' => 'Polhut Terampil',
                    'golongan' => 'PPPK Golongan V',
                    'nama_bank' => 'Mandiri',
                    'tarif' => 35000,
                    'pph_rate' => 0.0,
                    'daily_matrix' => ['1' => 'H'],
                    'total_working_days' => 22,
                    'total_hadir' => 1,
                    'total_bruto' => 35000,
                    'total_pph' => 0,
                    'total_netto' => 35000,
                ],
                [
                    'nip' => '200101012024211005',
                    'nama' => 'PPPK Rekening BRI',
                    'jabatan' => 'Penyuluh Kehutanan',
                    'golongan' => 'PPPK Golongan VII',
                    'nama_bank' => 'BRI',
                    'tarif' => 35000,
                    'pph_rate' => 0.0,
                    'daily_matrix' => ['1' => 'H'],
                    'total_working_days' => 22,
                    'total_hadir' => 1,
                    'total_bruto' => 35000,
                    'total_pph' => 0,
                    'total_netto' => 35000,
                ],
            ],
        ];

        $response = $this->post('/api/kepegawaian/uang-makan/export-excel', $exportPayload);
        $response->assertStatus(200);

        // Save output to temporary file and inspect sheets with PhpOffice
        $tempPath = tempnam(sys_get_temp_dir(), 'um_export_');
        file_put_contents($tempPath, $response->streamedContent());

        $reader = new \PhpOffice\PhpSpreadsheet\Reader\Xlsx();
        $spreadsheet = $reader->load($tempPath);
        $sheetNames = $spreadsheet->getSheetNames();

        @unlink($tempPath);

        $expectedSheets = [
            'PNS_BRI',
            'PNS_MNDRI',
            'PPPK_MNDRI',
            'PPPK_BRI',
            'Nominatif Mandiri',
            'Nominatif BRI',
        ];

        $this->assertEquals($expectedSheets, $sheetNames);
    }
    public function test_employee_meal_allowances_history_endpoint_returns_data(): void
    {
        Sanctum::actingAs($this->adminUser);

        $batch = MealAllowanceBatch::create([
            'periode_bulan' => '2026-10',
            'nama_batch' => 'Uang Makan Oktober 2026',
            'total_pegawai' => 1,
            'total_hari_kerja' => 22,
            'total_bruto' => 814000,
            'total_pph21' => 40700,
            'total_netto' => 773300,
            'status' => 'final',
            'created_by' => $this->adminUser->id,
        ]);

        MealAllowanceItem::create([
            'batch_id' => $batch->id,
            'employee_id' => $this->employeeSyafey->id,
            'nip' => $this->employeeSyafey->nip,
            'nama_lengkap' => $this->employeeSyafey->nama_lengkap,
            'jabatan' => $this->employeeSyafey->jabatan,
            'jenis_pegawai' => 'PNS',
            'satuan_kerja' => $this->employeeSyafey->satuan_kerja,
            'golongan' => 'Golongan III/a',
            'nama_bank' => 'BRI',
            'nomor_rekening' => '012345678901234',
            'tarif_harian' => 37000,
            'persen_pph21' => 5,
            'jml_hari_kerja' => 22,
            'jml_hadir' => 20,
            'jml_pd' => 2,
            'uang_makan_bruto' => 814000,
            'potongan_pph21' => 40700,
            'uang_makan_netto' => 773300,
            'daily_matrix' => ['2026-10-01' => 'H', '2026-10-02' => 'PD'],
        ]);

        $response = $this->getJson("/api/kepegawaian/employees/{$this->employeeSyafey->id}/meal-allowances");
        $response->assertStatus(200)
            ->assertJsonPath('data.0.nama_bank', 'BRI')
            ->assertJsonPath('data.0.uang_makan_netto', '773300.00')
            ->assertJsonPath('data.0.batch.periode_bulan', '2026-10');
    }
    public function test_registered_banks_crud_and_validation(): void
    {
        Sanctum::actingAs($this->adminUser);

        // 1. GET registered banks (seeded BRI & Mandiri)
        $res = $this->getJson('/api/kepegawaian/settings/registered-banks');
        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        // 2. POST new bank (BSI)
        $storeRes = $this->postJson('/api/kepegawaian/settings/registered-banks', [
            'nama_bank' => 'BSI',
        ]);
        $storeRes->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nama_bank', 'BSI');

        // 3. Try deleting BRI which is used by active employees (should fail with 422)
        $delBriRes = $this->deleteJson('/api/kepegawaian/settings/registered-banks/BRI');
        $delBriRes->assertStatus(422)
            ->assertJsonPath('success', false);

        // 4. Delete BSI which has 0 employees (should succeed with 200)
        $delBsiRes = $this->deleteJson('/api/kepegawaian/settings/registered-banks/BSI');
        $delBsiRes->assertStatus(200)
            ->assertJsonPath('success', true);
    }
}
