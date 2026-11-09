<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Modules\Bmn\Controllers\LoanController;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Kepegawaian\Controllers\EmployeeController;
use App\Modules\Kepegawaian\Controllers\EmployeeLeaveController;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
use App\Modules\SuratTugas\Services\AssignmentLetterConflictService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

echo "========================================================\n";
echo " Running Employee Lifecycle & Departure Self-Check\n";
echo "========================================================\n";

DB::beginTransaction();

try {
    $today = Carbon::today('Asia/Makassar');

    // Setup dummy admin user
    $admin = User::firstOrCreate(
        ['username' => 'admin_test_lifecycle'],
        [
            'name' => 'Admin Test Lifecycle',
            'email' => 'admin_test@test.local',
            'password' => bcrypt('secret123'),
            'role' => 'super_admin',
            'is_active' => true,
        ]
    );
    Auth::login($admin);

    // Setup test employee
    $nip = 'TEST_' . Str::random(8);
    $employee = Employee::create([
        'nip' => $nip,
        'nama_lengkap' => 'Budi Pegawai Test',
        'satuan_kerja' => 'BKSDA Kaltim',
        'is_active' => true,
        'is_pppk' => false,
        'is_mmp' => false,
    ]);

    // Setup linked user
    $user = User::create([
        'username' => $nip,
        'name' => 'Budi Pegawai Test',
        'email' => strtolower($nip) . '@test.local',
        'password' => bcrypt('secret123'),
        'role' => 'pegawai',
        'is_active' => true,
    ]);

    // Create a dummy token for user
    $token = $user->createToken('test-token')->plainTextToken;
    assert($user->tokens()->count() > 0, 'User should have at least 1 active token');

    // -------------------------------------------------------------------------
    // TEST 1: Scheduled Deactivation in Future (EMP-06, EMP-07)
    // -------------------------------------------------------------------------
    $futureTmt = $today->copy()->addDays(20);
    $employee->applyLifecycleStatus(
        'deactivate',
        'pensiun',
        $futureTmt->format('Y-m-d'),
        'Pensiun per bulan depan',
        $admin
    );
    $employee->refresh();
    $user->refresh();

    assert($employee->is_active === true, 'T1 FAIL: Employee should remain active before future TMT');
    assert($employee->inactive_reason === 'pensiun', 'T1 FAIL: Inactive reason should be pensiun');
    assert($employee->inactive_effective_date->format('Y-m-d') === $futureTmt->format('Y-m-d'), 'T1 FAIL: Effective date mismatch');
    assert($employee->isEffectiveActive() === true, 'T1 FAIL: Employee should be effective active today');
    assert($employee->isEffectiveActive($futureTmt) === false, 'T1 FAIL: Employee should NOT be effective active on TMT');
    assert($employee->isScheduledInactive() === true, 'T1 FAIL: isScheduledInactive should be true');
    assert($employee->status_badge['state'] === 'scheduled_inactive', 'T1 FAIL: status_badge state should be scheduled_inactive');
    assert($user->is_active === true, 'T1 FAIL: Linked user should remain active before future TMT');
    echo " [PASS] Test 1: Future scheduled deactivation leaves employee & user active today.\n";

    // -------------------------------------------------------------------------
    // TEST 2: Cancel Scheduled Deactivation (EMP-10)
    // -------------------------------------------------------------------------
    $employee->applyLifecycleStatus(
        'cancel_schedule',
        null,
        null,
        'Pembatalan jadwal pensiun',
        $admin
    );
    $employee->refresh();

    assert($employee->is_active === true, 'T2 FAIL: Employee should be active after cancel_schedule');
    assert($employee->inactive_reason === null, 'T2 FAIL: Inactive reason should be null');
    assert($employee->inactive_effective_date === null, 'T2 FAIL: Inactive effective date should be null');
    assert($employee->isScheduledInactive() === false, 'T2 FAIL: isScheduledInactive should be false');
    assert($employee->status_badge['state'] === 'active', 'T2 FAIL: status_badge state should be active');
    echo " [PASS] Test 2: Scheduled deactivation cancellation properly resets schedule.\n";

    // -------------------------------------------------------------------------
    // TEST 3: Deactivate Today (EMP-01) -> immediate revocation & user deactivation
    // -------------------------------------------------------------------------
    $user->createToken('test-token-2');
    $employee->applyLifecycleStatus(
        'deactivate',
        'mengundurkan_diri',
        $today->format('Y-m-d'),
        'Mengundurkan diri per hari ini',
        $admin
    );
    $employee->refresh();
    $user->refresh();

    assert($employee->is_active === false, 'T3 FAIL: Employee should be inactive');
    assert($employee->inactive_reason === 'mengundurkan_diri', 'T3 FAIL: Inactive reason should be mengundurkan_diri');
    assert($employee->inactive_effective_date->format('Y-m-d') === $today->format('Y-m-d'), 'T3 FAIL: Effective date should be today');
    assert($employee->isEffectiveActive() === false, 'T3 FAIL: Employee should NOT be effective active');
    assert($employee->status_badge['state'] === 'inactive', 'T3 FAIL: status_badge state should be inactive');
    assert($user->is_active === false, 'T3 FAIL: Linked user should be deactivated immediately');
    assert($user->tokens()->count() === 0, 'T3 FAIL: All personal access tokens should be revoked');

    $history = EmployeeHistory::where('employee_id', $employee->id)->latest('id')->first();
    assert($history !== null, 'T3 FAIL: EmployeeHistory should be recorded');
    assert($history->action === 'DEACTIVATE_EMPLOYEE', 'T3 FAIL: History action should be DEACTIVATE_EMPLOYEE');
    assert(isset($history->changes['is_active']), 'T3 FAIL: History changes should record is_active');
    echo " [PASS] Test 3: Immediate deactivation sets inactive, disables user, revokes tokens, logs audit.\n";

    // -------------------------------------------------------------------------
    // TEST 4: Artisan Command Idempotency (EMP-08)
    // -------------------------------------------------------------------------
    // Create an employee whose TMT was reached today but is still is_active=true (simulating pending scheduler run)
    $nipSch = 'SCH_' . Str::random(8);
    $empSch = Employee::create([
        'nip' => $nipSch,
        'nama_lengkap' => 'Pegawai Terjadwal Test',
        'is_active' => true,
        'inactive_reason' => 'pensiun',
        'inactive_effective_date' => $today->copy()->subDay()->format('Y-m-d'), // Yesterday
    ]);
    $userSch = User::create([
        'username' => $nipSch,
        'name' => 'Pegawai Terjadwal Test',
        'email' => strtolower($nipSch) . '@test.local',
        'password' => bcrypt('secret123'),
        'role' => 'pegawai',
        'is_active' => true,
    ]);
    $userSch->createToken('sch-token');

    $exitCode1 = Artisan::call('employee:apply-lifecycle');
    assert($exitCode1 === 0, 'T4 FAIL: Command should exit with code 0');
    $empSch->refresh();
    $userSch->refresh();
    assert($empSch->is_active === false, 'T4 FAIL: Scheduler should set is_active=false');
    assert($userSch->is_active === false, 'T4 FAIL: Scheduler should deactivate user');
    assert($userSch->tokens()->count() === 0, 'T4 FAIL: Scheduler should revoke tokens');

    // Run again to ensure idempotency
    $exitCode2 = Artisan::call('employee:apply-lifecycle');
    assert($exitCode2 === 0, 'T4 FAIL: Second command run should exit cleanly with 0');
    echo " [PASS] Test 4: Artisan command employee:apply-lifecycle operates idempotently.\n";

    // -------------------------------------------------------------------------
    // TEST 5: Reactivate (EMP-12) -> user remains inactive
    // -------------------------------------------------------------------------
    $employee->applyLifecycleStatus(
        'reactivate',
        null,
        null,
        'Diaktifkan kembali sesuai SK baru',
        $admin
    );
    $employee->refresh();
    $user->refresh();

    assert($employee->is_active === true, 'T5 FAIL: Employee should be active after reactivate');
    assert($employee->inactive_reason === null, 'T5 FAIL: Reason should be cleared');
    assert($employee->inactive_effective_date === null, 'T5 FAIL: Effective date should be cleared');
    assert($user->is_active === false, 'T5 FAIL: Linked user MUST remain inactive until IAM explicitly enables it');
    echo " [PASS] Test 5: Reactivation restores employee active while keeping user account inactive for IAM control.\n";

    // -------------------------------------------------------------------------
    // TEST 6: BMN Clearance Check & Loan Guard (BMN-01, BMN-04)
    // -------------------------------------------------------------------------
    // Make employee inactive
    $employee->applyLifecycleStatus('deactivate', 'pensiun', $today->format('Y-m-d'), 'Pensiun', $admin);
    $employee->refresh();

    $empController = app(EmployeeController::class);
    $bmnClearance = $empController->bmnClearance(new Request(), $employee->id);
    $clearanceData = $bmnClearance->getData(true);
    assert($clearanceData['status'] === 'success', 'T6 FAIL: bmnClearance should succeed');
    assert(isset($clearanceData['data']['unique_asset_count']), 'T6 FAIL: unique_asset_count should be set');
    assert($clearanceData['data']['status_check'] === 'ok', 'T6 FAIL: status_check should be ok');

    // Verify LoanController guard
    $loanController = app(LoanController::class);
    $asset = Asset::first();
    assert($asset !== null, 'Asset should exist for testing');

    $fakeRequest = new Request([
        'asset_ids' => [$asset->id],
        'borrower_employee_id' => $employee->id,
        'loan_date' => $today->format('Y-m-d'),
    ]);
    $loanResp = $loanController->store($fakeRequest);
    assert($loanResp->status() === 422, 'T6 FAIL: LoanController should reject inactive employee with 422');
    echo " [PASS] Test 6: BMN clearance endpoint works and new loan to inactive employee is rejected (422).\n";

    // -------------------------------------------------------------------------
    // TEST 7: Surat Tugas Conflict Detection (ST-01)
    // -------------------------------------------------------------------------
    $conflictService = app(AssignmentLetterConflictService::class);
    $stConflict = $conflictService->checkConflicts(
        [['id' => $employee->id]],
        $today->format('Y-m-d'),
        $today->copy()->addDays(3)->format('Y-m-d')
    );
    assert($stConflict['has_conflict'] === true, 'T7 FAIL: Inactive employee should trigger conflict in ST');
    assert($stConflict['conflicts'][0]['type'] === 'inactive_employee', 'T7 FAIL: Conflict type must be inactive_employee');
    echo " [PASS] Test 7: Surat Tugas conflict detection blocks inactive employee assignments.\n";

    // -------------------------------------------------------------------------
    // TEST 8: Force Delete Protection (HIST-01)
    // -------------------------------------------------------------------------
    assert($employee->hasOperationalHistory() === true, 'T8 FAIL: Employee with history records must return hasOperationalHistory=true');
    $delResp = $empController->forceDestroy(new Request(), $employee->id);
    assert($delResp->status() === 422, 'T8 FAIL: forceDestroy on employee with operational history must return 422');
    echo " [PASS] Test 8: Historical data protected against hard delete (forceDestroy blocked with 422).\n";

    // -------------------------------------------------------------------------
    // TEST 9: Controller Validation Guards (EMP-02, EMP-03, EMP-04)
    // -------------------------------------------------------------------------
    // EMP-02: Invalid reason
    $invalidReasonCaught = false;
    try {
        $empController->updateLifecycle(new Request([
            'action' => 'deactivate',
            'inactive_reason' => 'invalid_reason_xyz',
            'inactive_effective_date' => $today->format('Y-m-d'),
        ]), $employee->id);
    } catch (ValidationException $e) {
        $invalidReasonCaught = true;
    }
    assert($invalidReasonCaught, 'T9 FAIL: Invalid reason should throw ValidationException');

    // EMP-03: Backdate without notes
    $backdateCaught = false;
    try {
        $empController->updateLifecycle(new Request([
            'action' => 'deactivate',
            'inactive_reason' => 'pensiun',
            'inactive_effective_date' => '2020-01-01',
            'notes' => '',
        ]), $employee->id);
    } catch (ValidationException $e) {
        $backdateCaught = true;
    }
    assert($backdateCaught, 'T9 FAIL: Backdate without notes should throw ValidationException');

    // EMP-04: Self-deactivation prevention
    $adminEmployee = Employee::create([
        'nip' => $admin->username,
        'nama_lengkap' => 'Admin Self Test',
        'satuan_kerja' => 'BKSDA Kaltim',
        'is_active' => true,
    ]);
    $selfReq = new Request([
        'action' => 'deactivate',
        'inactive_reason' => 'mengundurkan_diri',
        'inactive_effective_date' => $today->format('Y-m-d'),
    ]);
    $selfReq->setUserResolver(fn() => $admin);
    $selfResp = $empController->updateLifecycle($selfReq, $adminEmployee->id);
    assert($selfResp->status() === 403, 'T9 FAIL: Self deactivation should return 403 Forbidden');
    echo " [PASS] Test 9: Controller validation correctly rejects invalid reasons, unnoted backdates, and self-deactivation.\n";

    // -------------------------------------------------------------------------
    // TEST 10: Cuti Boundary Protection (CUTI-01)
    // -------------------------------------------------------------------------
    $leaveController = app(EmployeeLeaveController::class);
    // Scheduled deactivation on future date
    $empLeave = Employee::create([
        'nip' => 'LEAVE_' . Str::random(8),
        'nama_lengkap' => 'Pegawai Cuti Test',
        'satuan_kerja' => 'BKSDA Kaltim',
        'is_active' => true,
        'inactive_reason' => 'habis_kontrak',
        'inactive_effective_date' => $today->copy()->addDays(10)->format('Y-m-d'),
    ]);

    $leaveResp = $leaveController->storeRecord(new Request([
        'tanggal_pengajuan' => $today->format('Y-m-d'),
        'jenis_cuti' => 'Cuti Tahunan',
        'jumlah_hari' => 10,
        'tanggal_mulai' => $today->copy()->addDays(5)->format('Y-m-d'),
        'tanggal_selesai' => $today->copy()->addDays(15)->format('Y-m-d'), // crosses TMT at +10 days
        'alasan_cuti' => 'Liburan',
    ]), $empLeave->id);

    assert($leaveResp->status() === 422, 'T10 FAIL: Leave ending after TMT must return 422');
    echo " [PASS] Test 10: Leave records crossing TMT boundary are strictly blocked (422).\n";

} finally {
    DB::rollBack();
}

echo "========================================================\n";
echo " ALL 10 EMPLOYEE LIFECYCLE SELF-CHECKS PASSED!\n";
echo "========================================================\n";
