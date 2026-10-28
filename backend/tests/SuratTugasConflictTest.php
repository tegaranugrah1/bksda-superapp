<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Services\AssignmentLetterConflictService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

echo "Running Surat Tugas Schedule Conflict Self-Check...\n";

$conflictService = app(AssignmentLetterConflictService::class);
$emp = Employee::first();

if (!$emp) {
    echo "No employees in database, skipping.\n";
    exit(0);
}

DB::beginTransaction();
try {
    // 1. Create a baseline assignment letter for Employee on 2026-11-04 s/d 2026-11-07
    $st1 = AssignmentLetter::create([
        'nomor_surat' => 'ST/TEST/001',
        'maksud_tujuan' => 'Pengawasan Lapangan Kutai Barat',
        'tanggal_mulai' => '2026-11-04',
        'tanggal_selesai' => '2026-11-07',
        'status' => 'approved',
    ]);
    $st1->employees()->attach($emp->id, ['peran' => 'Pelaksana']);

    // Check Case A: 2026-11-07 s/d 2026-11-10 -> MUST CONFLICT ON 2026-11-07!
    $resA = $conflictService->checkConflicts(
        [['id' => $emp->id]],
        '2026-11-07',
        '2026-11-10'
    );
    assert($resA['has_conflict'] === true, 'Case A should conflict on boundary date 2026-11-07');
    assert(count($resA['conflicts']) === 1, 'Case A should have 1 conflict');
    assert($resA['conflicts'][0]['type'] === 'surat_tugas', 'Case A conflict type should be surat_tugas');
    echo " [PASS] Case A: Boundary date overlap (4-7 Nov vs 7-10 Nov) properly detected as CONFLICT.\n";

    // Check Case B: 2026-11-08 s/d 2026-11-10 -> MUST NOT CONFLICT
    $resB = $conflictService->checkConflicts(
        [['id' => $emp->id]],
        '2026-11-08',
        '2026-11-10'
    );
    assert($resB['has_conflict'] === false, 'Case B should NOT conflict');
    echo " [PASS] Case B: Non-overlapping date (8-10 Nov) properly passes without conflict.\n";

    // Check Case C: Edit mode (exclude st1 id) -> MUST NOT CONFLICT with itself
    $resC = $conflictService->checkConflicts(
        [['id' => $emp->id]],
        '2026-11-04',
        '2026-11-07',
        $st1->id
    );
    assert($resC['has_conflict'] === false, 'Case C (exclude self) should NOT conflict');
    echo " [PASS] Case C: Edit mode excluding self ID does not falsely trigger self-conflict.\n";

    // Check Case D: Pending status must also trigger conflict
    $stPending = AssignmentLetter::create([
        'nomor_surat' => 'ST/TEST/PENDING',
        'maksud_tujuan' => 'Rapat Koordinasi Balikpapan',
        'tanggal_mulai' => '2026-11-20',
        'tanggal_selesai' => '2026-11-22',
        'status' => 'pending',
    ]);
    $stPending->employees()->attach($emp->id, ['peran' => 'Pelaksana']);

    $resD = $conflictService->checkConflicts(
        [['id' => $emp->id]],
        '2026-11-21',
        '2026-11-25'
    );
    assert($resD['has_conflict'] === true, 'Case D (pending status) should trigger conflict');
    echo " [PASS] Case D: Pending status ST properly detected as blocking conflict.\n";

    // Check Case E: Approved Leave (Cuti) conflict
    $leave = EmployeeLeaveRequest::create([
        'employee_id' => $emp->id,
        'nomor_pengajuan' => 'CUTI/TEST/001',
        'tanggal_pengajuan' => '2026-11-01',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'Keperluan Keluarga',
        'alamat_menjalankan_cuti' => 'Samarinda',
        'tanggal_mulai' => '2026-11-15',
        'tanggal_selesai' => '2026-11-17',
        'jumlah_hari' => 3,
        'status' => 'APPROVED',
    ]);

    $resE = $conflictService->checkConflicts(
        [['id' => $emp->id]],
        '2026-11-16',
        '2026-11-18'
    );
    assert($resE['has_conflict'] === true, 'Case E (approved leave) should trigger conflict');
    assert($resE['conflicts'][0]['type'] === 'cuti', 'Case E conflict type should be cuti');
    echo " [PASS] Case E: Approved leave (Cuti Aktif) properly detected as conflict.\n";

    // Check Case F: Controller checkConflicts endpoint test
    $controller = app(\App\Modules\SuratTugas\Controllers\AssignmentLetterController::class);
    $reqF = \Illuminate\Http\Request::create('/api/surat-tugas/check-conflicts', 'POST', [
        'tanggal_mulai' => '2026-11-04',
        'tanggal_selesai' => '2026-11-06',
        'employee_ids' => [$emp->id],
    ]);
    $responseF = $controller->checkConflicts($reqF);
    assert($responseF->getStatusCode() === 200, 'Controller checkConflicts should return 200');
    $dataF = json_decode($responseF->getContent(), true);
    assert($dataF['has_conflict'] === true, 'Controller checkConflicts should find conflict');
    echo " [PASS] Case F: AssignmentLetterController@checkConflicts API endpoint verified.\n";

    echo "\nAll 5 schedule conflict security checks passed!\n";
} finally {
    DB::rollBack();
}
