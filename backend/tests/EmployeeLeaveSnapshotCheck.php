<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Controllers\EmployeeLeaveController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

echo "Running Ponytail Leave Balance Snapshot Check...\n";

DB::beginTransaction();

try {
    // 1. Create mock employee
    $emp = Employee::create([
        'nip' => 'TEST999999999999',
        'nama_lengkap' => 'Tester Cuti Ponytail',
        'email' => 'tester.cuti@bksda.test',
        'status_kepegawaian' => 'PNS',
        'is_active' => true,
    ]);

    $year = 2026;
    $leave = EmployeeLeave::forEmployeeYear($emp->id, $year);
    $leave->hak_cuti_n = 12;
    $leave->sisa_cuti_n1 = 2;
    $leave->sisa_cuti_n2 = 1;
    $leave->cuti_terpakai_n0 = 0;
    $leave->save();

    $controller = app(EmployeeLeaveController::class);

    // 2. Test storeRecord #1 (3 days)
    $req1 = Request::create("/api/kepegawaian/employees/{$emp->id}/leave-records", 'POST', [
        'nomor_pengajuan' => 'CUTI-TEST-001',
        'tanggal_pengajuan' => '2026-03-01',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'Libur tahunan',
        'jumlah_hari' => 3,
        'tanggal_mulai' => '2026-03-02',
        'tanggal_selesai' => '2026-03-04',
        'status' => 'DISETUJUI',
    ]);

    $resp1 = $controller->storeRecord($req1, $emp->id);
    assert($resp1->getStatusCode() === 201, 'storeRecord should return 201');
    $data1 = json_decode($resp1->getContent(), true)['data'];

    assert((int) $data1['sisa_n0'] === 12, 'First request sisa_n0 should snapshot available 12');
    assert((int) $data1['sisa_n1'] === 2, 'First request sisa_n1 should snapshot 2');
    assert((int) $data1['sisa_n2'] === 0, 'First request sisa_n2 should snapshot 0 (not eligible 24 days)');

    $leave->refresh();
    assert((int) $leave->cuti_terpakai_n0 === 3, 'Leave balance cuti_terpakai_n0 should be 3');

    // 3. Test storeRecord #2 (2 days)
    $req2 = Request::create("/api/kepegawaian/employees/{$emp->id}/leave-records", 'POST', [
        'nomor_pengajuan' => 'CUTI-TEST-002',
        'tanggal_pengajuan' => '2026-04-01',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'Libur lanjutan',
        'jumlah_hari' => 2,
        'tanggal_mulai' => '2026-04-02',
        'tanggal_selesai' => '2026-04-03',
        'status' => 'DISETUJUI',
    ]);

    $resp2 = $controller->storeRecord($req2, $emp->id);
    assert($resp2->getStatusCode() === 201, 'storeRecord #2 should return 201');
    $data2 = json_decode($resp2->getContent(), true)['data'];

    assert((int) $data2['sisa_n0'] === 9, 'Second request sisa_n0 should snapshot available 9 (12 - 3)');
    assert((int) $data2['sisa_n1'] === 2, 'Second request sisa_n1 should snapshot 2');
    assert((int) $data2['sisa_n2'] === 0, 'Second request sisa_n2 should snapshot 0');

    $leave->refresh();
    assert((int) $leave->cuti_terpakai_n0 === 5, 'Leave balance cuti_terpakai_n0 should be 5 (3 + 2)');

    // 4. Test updateRecord on #2
    $updateReq = Request::create("/api/kepegawaian/employees/{$emp->id}/leave-records/{$data2['id']}", 'PUT', [
        'nomor_pengajuan' => 'CUTI-TEST-002-REV',
        'tanggal_pengajuan' => '2026-04-01',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'Libur lanjutan revisi',
        'jumlah_hari' => 4,
        'tanggal_mulai' => '2026-04-02',
        'tanggal_selesai' => '2026-04-05',
        'status' => 'DISETUJUI',
    ]);

    $respUpdate = $controller->updateRecord($updateReq, $emp->id, $data2['id']);
    assert($respUpdate->getStatusCode() === 200, 'updateRecord should return 200');
    $dataUpdate = json_decode($respUpdate->getContent(), true)['data'];

    // Sisa prior to this request should still be 12 - 3 = 9
    assert((int) $dataUpdate['sisa_n0'] === 9, 'Updated request sisa_n0 should still be 9 (12 - 3 other approved days)');
    assert((int) $dataUpdate['sisa_n1'] === 2, 'Updated request sisa_n1 should be 2');

    $leave->refresh();
    assert((int) $leave->cuti_terpakai_n0 === 7, 'Leave balance cuti_terpakai_n0 should now be 7 (3 + 4)');

    echo "PASS: Ponytail Leave Balance Snapshot Check completed successfully!\n";
} finally {
    DB::rollBack();
}
