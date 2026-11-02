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
}
