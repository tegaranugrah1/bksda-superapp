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

    // 2. Admin approves with uploaded PDF scan for Formulir and Surat Izin
    $fakeFormulir = UploadedFile::fake()->create('scan_formulir_cuti.pdf', 300, 'application/pdf');
    $fakeSuratIzin = UploadedFile::fake()->create('surat_izin_tte.pdf', 500, 'application/pdf');

    $reqApprove = Request::create("/api/kepegawaian/leave-requests/{$leaveReqA->id}/approve", 'POST', [
        'nomor_surat' => 'SI.999/K.18/TU/PEG/10/2026',
        'catatan_atasan' => 'Disetujui lengkap dengan stempel',
    ], [], [
        'file_scan_formulir' => $fakeFormulir,
        'file_scan_surat_izin' => $fakeSuratIzin,
    ]);
    $reqApprove->setUserResolver(fn() => $adminUser);
    Auth::login($adminUser);

    $approveRes = $controller->adminApprove($reqApprove, $leaveReqA->id);
    assert($approveRes->getStatusCode() === 200, "Approval should return 200");

    $leaveReqA->refresh();
    assert($leaveReqA->status === 'DISETUJUI', "Status should be DISETUJUI");
    assert($leaveReqA->nomor_pengajuan === 'SI.999/K.18/TU/PEG/10/2026', "Official number should be updated");
    assert(!empty($leaveReqA->scan_formulir_path), "scan_formulir_path must be populated");
    assert(!empty($leaveReqA->scan_surat_izin_path), "scan_surat_izin_path must be populated");
    assert(Storage::disk('local')->exists($leaveReqA->scan_formulir_path), "Formulir file must exist in local storage");
    assert(Storage::disk('local')->exists($leaveReqA->scan_surat_izin_path), "Surat Izin file must exist in local storage");
    assert($leaveReqA->scan_formulir_nama === 'scan_formulir_cuti.pdf', "Formulir original name must match");
    assert($leaveReqA->scan_surat_izin_nama === 'surat_izin_tte.pdf', "Surat Izin original name must match");
    assert($leaveReqA->scan_surat_path === $leaveReqA->scan_surat_izin_path, "Legacy scan_surat_path must match scan_surat_izin_path");
    echo "[PASS] 1. adminApprove with both scans succeeded and stored securely\n";

    // 3. IDOR Check: Employee B attempts to view Employee A's scans -> MUST BE 404
    $userB = User::where('username', $empB->nip)->first() ?: User::factory()->create(['username' => $empB->nip]);
    
    // Check IDOR on scan-formulir
    $reqUserBFormulir = Request::create("/api/me/leave-requests/{$leaveReqA->id}/scan-formulir", 'GET');
    $reqUserBFormulir->setUserResolver(fn() => $userB);
    $idorBlockedFormulir = false;
    try {
        $controller->myViewScanFormulir($reqUserBFormulir, $leaveReqA->id);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        $idorBlockedFormulir = true;
    }
    assert($idorBlockedFormulir, "Employee B must NOT access Employee A's scan formulir (IDOR prevention)");

    // Check IDOR on scan-surat-izin
    $reqUserBSuratIzin = Request::create("/api/me/leave-requests/{$leaveReqA->id}/scan-surat-izin", 'GET');
    $reqUserBSuratIzin->setUserResolver(fn() => $userB);
    $idorBlockedSuratIzin = false;
    try {
        $controller->myViewScanSuratIzin($reqUserBSuratIzin, $leaveReqA->id);
    } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
        $idorBlockedSuratIzin = true;
    }
    assert($idorBlockedSuratIzin, "Employee B must NOT access Employee A's scan surat izin (IDOR prevention)");
    echo "[PASS] 2. IDOR Prevention: Other employee cannot access either scan file\n";

    // 4. Owner Check: Employee A views both scans -> SUCCESS
    $userA = User::where('username', $empA->nip)->first() ?: User::factory()->create(['username' => $empA->nip]);
    $reqUserAFormulir = Request::create("/api/me/leave-requests/{$leaveReqA->id}/scan-formulir", 'GET');
    $reqUserAFormulir->setUserResolver(fn() => $userA);
    $streamAFormulir = $controller->myViewScanFormulir($reqUserAFormulir, $leaveReqA->id);
    assert($streamAFormulir->getStatusCode() === 200, "Owner employee should be able to view scan formulir");

    $reqUserASuratIzin = Request::create("/api/me/leave-requests/{$leaveReqA->id}/scan-surat-izin", 'GET');
    $reqUserASuratIzin->setUserResolver(fn() => $userA);
    $streamASuratIzin = $controller->myViewScanSuratIzin($reqUserASuratIzin, $leaveReqA->id);
    assert($streamASuratIzin->getStatusCode() === 200, "Owner employee should be able to view scan surat izin");
    echo "[PASS] 3. Owner Authorization: Employee A can view both of their own scans\n";

    // 5. Admin View Scan Check (both binary stream and JSON preview mode)
    $streamAdminFormulir = $controller->adminViewScanFormulir($leaveReqA->id);
    assert($streamAdminFormulir->getStatusCode() === 200, "Admin can view scan formulir");
    $streamAdminSuratIzin = $controller->adminViewScanSuratIzin($leaveReqA->id);
    assert($streamAdminSuratIzin->getStatusCode() === 200, "Admin can view scan surat izin");

    // Check preview JSON mode (same as Surat Masuk)
    $reqPreview = Request::create("/api/kepegawaian/leave-requests/{$leaveReqA->id}/scan-surat-izin?preview=1", 'GET');
    $jsonPreview = $controller->adminViewScanSuratIzin($reqPreview, $leaveReqA->id);
    assert($jsonPreview->getStatusCode() === 200, "Preview mode returns 200");
    $previewData = $jsonPreview->getData(true);
    assert(!empty($previewData['data_url']) && str_starts_with($previewData['data_url'], 'data:application/pdf;base64,'), "Preview returns valid base64 data_url");
    echo "[PASS] 4. Admin View: Kepegawaian admin can view both scans (stream & preview JSON)\n";

    // 6. Admin Upload / Replace Scan
    $newFakeSuratIzin = UploadedFile::fake()->create('surat_izin_v2.pdf', 600, 'application/pdf');
    $reqUploadScan = Request::create("/api/kepegawaian/leave-requests/{$leaveReqA->id}/upload-scan", 'POST', [], [], [
        'file_scan_surat_izin' => $newFakeSuratIzin,
    ]);
    $reqUploadScan->setUserResolver(fn() => $adminUser);
    $uploadRes = $controller->adminUploadScan($reqUploadScan, $leaveReqA->id);
    assert($uploadRes->getStatusCode() === 200, "Upload replacement scan should succeed");
    $leaveReqA->refresh();
    assert($leaveReqA->scan_surat_izin_nama === 'surat_izin_v2.pdf', "Surat izin name should update");
    echo "[PASS] 5. Admin Upload / Replace Scan works seamlessly\n";

    // 7. Approval without scan (optional scan check)
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
    assert($leaveReqB->scan_formulir_path === null, "scan_formulir_path should remain null");
    assert($leaveReqB->scan_surat_izin_path === null, "scan_surat_izin_path should remain null");
    echo "[PASS] 6. Optional scan: Approval without scan files works properly\n";
} finally {
    // Guaranteed rollback so no test records ever persist in the database
    DB::rollBack();
}

echo "ALL LEAVE SCAN SECURITY CHECKS PASSED!\n";
