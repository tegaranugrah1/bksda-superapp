<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeLeaveTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Employee $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'username' => 'admin_test',
            'access_modules' => ['kepegawaian'],
        ]);

        $this->employee = Employee::create([
            'nip' => '199001012020011001',
            'nama_lengkap' => 'Budi Santoso, S.Hut.',
            'jabatan' => 'Pengendali Ekosistem Hutan',
            'satuan_kerja' => 'Kantor Balai KSDA Kaltim',
            'is_active' => true,
        ]);
    }

    public function test_can_calculate_24_day_accumulation_eligible(): void
    {
        $leave = new EmployeeLeave([
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'hak_cuti_n' => 12,
            'sisa_cuti_n1' => 12,
            'cuti_terpakai_n1' => 0,
            'sisa_cuti_n2' => 12,
            'cuti_terpakai_n2' => 0,
            'cuti_terpakai_n0' => 0,
        ]);

        $this->assertTrue($leave->is_eligible_24_days);
        $this->assertEquals(6, $leave->hak_n1_diakui);
        $this->assertEquals(6, $leave->hak_n2_diakui);
        $this->assertEquals(24, $leave->total_hak_cuti);
        $this->assertEquals(24, $leave->sisa_cuti_tersedia);
    }

    public function test_accumulation_resets_to_max_18_when_used_1_day(): void
    {
        $leave = new EmployeeLeave([
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'hak_cuti_n' => 12,
            'sisa_cuti_n1' => 12,
            'cuti_terpakai_n1' => 0,
            'sisa_cuti_n2' => 12,
            'cuti_terpakai_n2' => 1, // 1 day used in N-2
            'cuti_terpakai_n0' => 0,
        ]);

        $this->assertFalse($leave->is_eligible_24_days);
        $this->assertEquals(6, $leave->hak_n1_diakui);
        $this->assertEquals(0, $leave->hak_n2_diakui); // forfeited
        $this->assertEquals(18, $leave->total_hak_cuti);
    }

    public function test_sisa_n1_above_6_is_capped_at_6(): void
    {
        $leave = new EmployeeLeave([
            'employee_id' => $this->employee->id,
            'year' => 2026,
            'hak_cuti_n' => 12,
            'sisa_cuti_n1' => 9, // 9 days remaining last year
            'cuti_terpakai_n1' => 3, // used 3 days
            'sisa_cuti_n2' => 0,
            'cuti_terpakai_n2' => 0,
            'cuti_terpakai_n0' => 2,
        ]);

        $this->assertEquals(6, $leave->hak_n1_diakui); // Capped at 6 days according to PerBKN 24/2017
        $this->assertEquals(18, $leave->total_hak_cuti);
        $this->assertEquals(16, $leave->sisa_cuti_tersedia);
    }

    public function test_api_store_and_show_leave_balance(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/kepegawaian/employees/{$this->employee->id}/leaves", [
                'year' => 2026,
                'hak_cuti_n' => 12,
                'sisa_cuti_n1' => 12,
                'cuti_terpakai_n1' => 0,
                'sisa_cuti_n2' => 12,
                'cuti_terpakai_n2' => 0,
                'cuti_terpakai_n0' => 3,
                'catatan' => 'Test Cuti 24 Hari',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('data.total_hak_cuti', 24);
        $response->assertJsonPath('data.sisa_cuti_tersedia', 21);

        $getRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/kepegawaian/employees/{$this->employee->id}/leaves?year=2026");

        $getRes->assertStatus(200);
        $getRes->assertJsonPath('data.sisa_cuti_tersedia', 21);
    }

    public function test_regular_employee_can_view_own_leave_balance(): void
    {
        $regularUser = User::factory()->create([
            'role' => 'user',
            'username' => $this->employee->nip,
            'access_modules' => [],
        ]);

        $response = $this->actingAs($regularUser, 'sanctum')
            ->getJson("/api/kepegawaian/employees/{$this->employee->id}/leaves?year=2026");

        $response->assertStatus(200);
        $response->assertJsonPath('employee.id', $this->employee->id);
    }
}
