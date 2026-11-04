<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use App\Modules\Kepegawaian\Models\StExpenseTemplate;
use App\Modules\Kepegawaian\Services\MealAllowanceExcelExport;
use App\Modules\Kepegawaian\Services\SikadirParserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KepegawaianSecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->employee = Employee::create([
            'nip' => '199001012020121001',
            'nama_lengkap' => 'Pegawai Security Test',
            'jabatan' => 'Staff Kepegawaian',
            'satuan_kerja' => 'Balai KSDA Kalimantan Timur',
            'is_active' => true,
        ]);

        $this->adminUser = User::factory()->create([
            'username' => 'admin_kepegawaian_sec',
            'role' => 'admin',
            'access_modules' => ['kepegawaian'],
        ]);

        LeaveType::create([
            'nama' => 'Cuti Tahunan',
            'kode' => 'CT',
            'hitung_hari' => 'hari_kerja',
            'potong_kuota_tahunan' => true,
            'is_active' => true,
        ]);
    }

    /**
     * 1. Test Spreadsheet Formula Injection in MealAllowanceExcelExport
     */
    public function test_meal_allowance_export_escapes_formula_injection(): void
    {
        $export = new MealAllowanceExcelExport();

        $maliciousItems = [
            [
                'nip' => '199001012020121001',
                'nama_lengkap' => '=cmd|\'/c calc\'!A0',
                'golongan' => '+cmd|dir',
                'tarif_harian' => 41000,
                'persen_pph21' => 5,
                'jml_hari_kerja' => 20,
                'jml_hadir' => 20,
                'daily_matrix' => [
                    1 => ['status' => '-@SUM(1,1)', 'is_holiday' => false, 'is_weekend' => false],
                ],
            ],
        ];

        $spreadsheet = $export->generate($maliciousItems, '2026-06', [
            'nama' => '=ALERT("XSS")',
            'nip' => '19750314 199903 1 004',
            'jabatan' => '@ADMIN',
        ]);

        // Sheet 1 checks
        $sheet1 = $spreadsheet->getSheetByName('Matriks Presensi');
        $namaCell = $sheet1->getCell('B6')->getValue();
        $this->assertStringStartsWith("'", $namaCell, 'Employee name in sheet 1 must be escaped if starting with =');

        $statusCell = $sheet1->getCell('C6')->getValue();
        $this->assertStringStartsWith("'", $statusCell, 'Status cell in sheet 1 must be escaped if starting with -@');

        // Sheet 2 checks
        $sheet2 = $spreadsheet->getSheetByName('Nominatif Uang Makan');
        $namaNomCell = $sheet2->getCell('B6')->getValue();
        $this->assertStringStartsWith("'", $namaNomCell, 'Employee name in sheet 2 must be escaped if starting with =');

        $golNomCell = $sheet2->getCell('D6')->getValue();
        $this->assertStringStartsWith("'", $golNomCell, 'Golongan in sheet 2 must be escaped if starting with +');

        // Check PPh formula is mathematically safe and does not execute arbitrary string concatenation
        $pphFormula = $sheet2->getCell('I6')->getValue();
        $this->assertSame('=G6*(5/100)', $pphFormula);
    }

    /**
     * 2. Test Cross-Calendar-Year Leave is Rejected in storeRecord & updateRecord
     */
    public function test_cross_calendar_year_leave_is_rejected_in_store_and_update_record(): void
    {
        // storeRecord with cross-year dates (2025-12-28 to 2026-01-05)
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/kepegawaian/employees/{$this->employee->id}/leave-records", [
                'tanggal_pengajuan' => '2025-12-20',
                'jenis_cuti' => 'Cuti Tahunan',
                'alasan_cuti' => 'Libur Akhir Tahun Lintas Tahun',
                'jumlah_hari' => 5,
                'tanggal_mulai' => '2025-12-28',
                'tanggal_selesai' => '2026-01-05',
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Penetapan cuti tidak boleh lintas tahun kalender. Silakan catat terpisah per tahun anggaran sesuai PerBKN 24/2017.');

        // Now record a valid single-year leave
        $validResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/kepegawaian/employees/{$this->employee->id}/leave-records", [
                'tanggal_pengajuan' => '2026-06-01',
                'jenis_cuti' => 'Cuti Tahunan',
                'alasan_cuti' => 'Cuti Resmi',
                'jumlah_hari' => 2,
                'tanggal_mulai' => '2026-06-10',
                'tanggal_selesai' => '2026-06-11',
            ]);
        $validResponse->assertStatus(201);
        $recordId = $validResponse->json('data.id');

        // updateRecord with cross-year dates
        $updateResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/kepegawaian/employees/{$this->employee->id}/leave-records/{$recordId}", [
                'tanggal_pengajuan' => '2026-06-01',
                'jenis_cuti' => 'Cuti Tahunan',
                'alasan_cuti' => 'Diubah Lintas Tahun',
                'jumlah_hari' => 10,
                'tanggal_mulai' => '2026-12-28',
                'tanggal_selesai' => '2027-01-05',
            ]);

        $updateResponse->assertStatus(422);
        $updateResponse->assertJsonPath('message', 'Penetapan cuti tidak boleh lintas tahun kalender. Silakan sesuaikan per tahun anggaran sesuai PerBKN 24/2017.');
    }

    /**
     * 3. Test Password Policy on resetPassword
     */
    public function test_reset_password_enforces_minimum_length_policy(): void
    {
        // Create user account for employee
        User::create([
            'username' => $this->employee->nip,
            'name' => $this->employee->nama_lengkap,
            'email' => 'sec_test@bksda.local',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'user',
        ]);

        // Attempt weak password (< 8 chars)
        $response = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/kepegawaian/employees/{$this->employee->id}/reset-password", [
                'password' => '12345',
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['password']);

        // Valid custom password (>= 8 chars)
        $validResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/kepegawaian/employees/{$this->employee->id}/reset-password", [
                'password' => 'P@ssword2026!',
            ]);

        $validResponse->assertStatus(200);
        $this->assertSame('P@ssword2026!', $validResponse->json('temporary_password'));
    }

    /**
     * 4. Test Public StExpenseTemplate Endpoint Does Not Leak Internal User IDs
     */
    public function test_public_expense_templates_masks_user_ids(): void
    {
        StExpenseTemplate::create([
            'name' => 'DIPA BKSDA Kaltim 2026',
            'code' => 'DIPA_2026',
            'category' => 'dipa',
            'is_active' => true,
            'created_by' => $this->adminUser->id,
            'updated_by' => $this->adminUser->id,
        ]);

        // Unauthenticated public request
        $response = $this->getJson('/api/kepegawaian/st-expense-templates/public');
        $response->assertStatus(200);
        $response->assertJsonPath('data.0.created_by', null);
        $response->assertJsonPath('data.0.updated_by', null);

        // Authenticated admin request
        $authResponse = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/kepegawaian/st-expense-templates');
        $authResponse->assertStatus(200);
        $this->assertEquals($this->adminUser->id, $authResponse->json('data.0.created_by'));
    }
}
