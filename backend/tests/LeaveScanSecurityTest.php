<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

echo "Running Leave Scan Security & Authorization Self-Check...\n";

Storage::fake('local');

$adminUser = User::where('role', 'super_admin')->first() ?: User::first();
$controller = app(EmployeeLeaveRequestController::class);

// Find two distinct employees
$employees = Employee::has('user')->take(2)->get();
if ($employees->count() < 2) {
    $employees = Employee::take(2)->get();
}
$empA = $employees[0];
$empB = $employees[1] ?? $employees[0];

DB::beginTransaction();
try {
    // 1. Create a test leave request for Employee A with status PENGAJUAN
    $leaveReqA = EmployeeLeaveRequest::create([
        'employee_id' => $empA->id,
        'nomor_pengajuan' => 'CUTI/TEST/001',
        'tanggal_pengajuan' => '2026-10-21',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'Keperluan Keluarga',
        'jumlah_hari' => 2,
        'tanggal_mulai' => '2026-11-02',
        'tanggal_selesai' => '2026-11-03',
        'alamat_menjalankan_cuti' => 'Samarinda',
        'status' => 'PENGAJUAN',
    ]);

    // 2. Admin approves with uploaded PDF scan
    $fakePdf = UploadedFile::fake()->create('surat_izin_resmi_101.pdf', 500, 'application/pdf');

    $reqApprove = Request::create("/api/kepegawaian/leave-requests/{$leaveReqA->id}/approve", 'POST', [
        'nomor_surat' => 'SI.999/K.18/TU/PEG/10/2026',
        'catatan_atasan' => 'Disetujui lengkap dengan stempel',
    ], [], [
        'file_scan' => $fakePdf,
    ]);
    $reqApprove->setUserResolver(fn() => $adminUser);
    Auth::login($adminUser);

    $approveRes = $controller->adminApprove($reqApprove, $leaveReqA->id);
    assert($approveRes->getStatusCode() === 200, "Approval should return 200");

    $leaveReqA->refresh();
    assert($leaveReqA->status === 'DISETUJUI', "Status should be DISETUJUI");
    assert($leaveReqA->nomor_pengajuan === 'SI.999/K.18/TU/PEG/10/2026', "Official number should be updated");
    assert(!empty($leaveReqA->scan_surat_path), "scan_surat_path must be populated");
    assert(Storage::disk('local')->exists($leaveReqA->scan_surat_path), "File must exist in local storage");
    assert($leaveReqA->scan_surat_nama === 'surat_izin_resmi_101.pdf', "Original file name must match");
    echo "[PASS] 1. adminApprove with file_scan succeeded and stored securely\n";

    // 3. IDOR Check: Employee B attempts to view Employee A's scan -> MUST BE FORBIDDEN / 404
    $userB = User::where('username', $empB->nip)->first() ?: User::factory()->create(['username' => $empB->nip]);
    $reqUserB = Request::create("/api/me/leave-requests/{$leaveReqA->id}/scan", 'GET');
    $reqUserB->setUserResolver(fn() => $userB);

    $idorBlocked = false;
    try {
        $controller->myViewScan($reqUserB, $leaveReqA->id);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        $idorBlocked = true;
    }
    assert($idorBlocked, "Employee B must NOT be able to access Employee A's leave scan (IDOR prevention)");
    echo "[PASS] 2. IDOR Prevention: Other employee cannot access scan\n";

    // 4. Owner Check: Employee A views their own scan -> SUCCESS
    $userA = User::where('username', $empA->nip)->first() ?: User::factory()->create(['username' => $empA->nip]);
    $reqUserA = Request::create("/api/me/leave-requests/{$leaveReqA->id}/scan", 'GET');
    $reqUserA->setUserResolver(fn() => $userA);

    $streamA = $controller->myViewScan($reqUserA, $leaveReqA->id);
    assert($streamA->getStatusCode() === 200, "Owner employee should be able to view scan");
    echo "[PASS] 3. Owner Authorization: Employee A can view their own scan\n";

    // 5. Admin View Scan Check
    $streamAdmin = $controller->adminViewScan($leaveReqA->id);
    assert($streamAdmin->getStatusCode() === 200, "Admin can view leave scan");
    echo "[PASS] 4. Admin View: Kepegawaian admin can view scan\n";

    // 6. Approval without scan (optional scan check)
    $leaveReqB = EmployeeLeaveRequest::create([
        'employee_id' => $empA->id,
        'nomor_pengajuan' => 'CUTI/TEST/002',
        'tanggal_pengajuan' => '2026-10-21',
        'jenis_cuti' => 'Cuti Sakit',
        'alasan_cuti' => 'Rawat Inap',
        'jumlah_hari' => 3,
        'tanggal_mulai' => '2026-11-10',
        'tanggal_selesai' => '2026-11-12',
        'alamat_menjalankan_cuti' => 'Balikpapan',
        'status' => 'PENGAJUAN',
    ]);

    $reqApproveNoFile = Request::create("/api/kepegawaian/leave-requests/{$leaveReqB->id}/approve", 'POST', []);
    $reqApproveNoFile->setUserResolver(fn() => $adminUser);
    $approveNoFileRes = $controller->adminApprove($reqApproveNoFile, $leaveReqB->id);
    assert($approveNoFileRes->getStatusCode() === 200, "Approve without file should succeed");

    $leaveReqB->refresh();
    assert($leaveReqB->status === 'DISETUJUI', "Status should be DISETUJUI even without scan");
    assert($leaveReqB->scan_surat_path === null, "scan_surat_path should remain null");
    echo "[PASS] 5. Optional scan: Approval without scan file works properly\n";
} finally {
    // Guaranteed rollback so no test records ever persist in the database
    DB::rollBack();
}

echo "ALL LEAVE SCAN SECURITY CHECKS PASSED!\n";
