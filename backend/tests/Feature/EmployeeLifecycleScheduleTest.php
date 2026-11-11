<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EmployeeLifecycleScheduleTest extends TestCase
{
    use RefreshDatabase;

    private function scheduledEmployee(): array
    {
        $employee = Employee::create([
            'nip' => '900000000000000091',
            'nama_lengkap' => 'Dummy scheduled employee',
            'is_active' => true,
            'inactive_reason' => 'pensiun',
            'inactive_effective_date' => now()->subDay()->toDateString(),
        ]);
        $user = User::factory()->create(['username' => $employee->nip, 'is_active' => true]);
        $user->createToken('dummy-scheduled-access');

        return [$employee, $user];
    }

    public function test_due_schedule_deactivates_once_and_revokes_access(): void
    {
        [$employee, $user] = $this->scheduledEmployee();

        $this->artisan('employee:apply-lifecycle')->expectsOutput('Selesai. Diproses: 1, Gagal: 0.')->assertSuccessful();
        $this->artisan('employee:apply-lifecycle')->assertSuccessful();

        $this->assertFalse($employee->fresh()->is_active);
        $this->assertFalse($user->fresh()->is_active);
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, EmployeeHistory::where('employee_id', $employee->id)->where('action', 'DEACTIVATE_EMPLOYEE')->count());
    }

    public function test_cancellation_after_candidate_selection_preserves_access(): void
    {
        $this->assertChangedScheduleIsSkipped('cancel_schedule');
    }

    public function test_future_reschedule_after_candidate_selection_preserves_access(): void
    {
        $this->assertChangedScheduleIsSkipped('deactivate');
    }

    private function assertChangedScheduleIsSkipped(string $action): void
    {
        [$employee, $user] = $this->scheduledEmployee();
        $changed = false;
        DB::listen(function (QueryExecuted $query) use ($employee, $action, &$changed) {
            if ($changed || ! str_contains($query->sql, 'select * from "kpg_employees"') || ! str_contains($query->sql, '"inactive_effective_date" <=')) {
                return;
            }

            // Interleave the real admin action after candidate rows are read, before row locking.
            $changed = true;
            $employee->applyLifecycleStatus($action, 'pensiun', now()->addDay()->toDateString(), 'Dummy concurrent schedule change');
        });

        $this->artisan('employee:apply-lifecycle')->expectsOutput('Selesai. Diproses: 0, Gagal: 0.')->assertSuccessful();

        $this->assertTrue($changed, 'The candidate-selection boundary must be exercised.');
        $this->assertTrue($employee->fresh()->is_active);
        $this->assertTrue($user->fresh()->is_active);
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame(0, EmployeeHistory::where('employee_id', $employee->id)->where('action', 'DEACTIVATE_EMPLOYEE')->count());
    }
}
