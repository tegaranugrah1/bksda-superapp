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

    // 5. Test previewSuratIzin and generateSuratIzin with N-1
    $reqCtrl = app(\App\Modules\Kepegawaian\Controllers\EmployeeLeaveRequestController::class);
    $prevResp1 = $reqCtrl->previewSuratIzin($data1['id']);
    assert($prevResp1->getStatusCode() === 200, 'previewSuratIzin should return 200');
    $prevData1 = json_decode($prevResp1->getContent(), true);
    assert($prevData1['tahun_cuti_text'] === 'untuk tahun 2025 dan tahun 2026', 'previewSuratIzin N-1 should be "untuk tahun 2025 dan tahun 2026"');

    $adminUser = \App\Models\User::first();
    if ($adminUser) {
        \Illuminate\Support\Facades\Auth::login($adminUser);
    }
    $genReq = Request::create("/api/kepegawaian/leave-requests/{$data1['id']}/generate-surat-izin", 'POST', [
        'nomor_surat' => 'SI.100/K.18/TU/PEG.11.01/B/03/2026',
    ]);
    $genResp = $reqCtrl->generateSuratIzin($genReq, $data1['id']);
    if ($genResp->getStatusCode() !== 200) {
        echo "Error in generateSuratIzin: " . $genResp->getContent() . "\n";
    }
    assert($genResp->getStatusCode() === 200, 'generateSuratIzin should return 200');
    $genData = json_decode($genResp->getContent(), true)['data'];
    $skPayload = $genData['surat_keluar']['document_payload'];
    assert($skPayload['tahunCutiText'] === 'untuk tahun 2025 dan tahun 2026', 'document_payload tahunCutiText should be "untuk tahun 2025 dan tahun 2026"');

    // 6. Test with N-2 and N-1
    $reqN2 = EmployeeLeaveRequest::find($data2['id']);
    $reqN2->update(['sisa_n1' => 2, 'sisa_n2' => 3]);
    $prevResp2 = $reqCtrl->previewSuratIzin($data2['id']);
    $prevData2 = json_decode($prevResp2->getContent(), true);
    assert($prevData2['tahun_cuti_text'] === 'untuk tahun 2024, tahun 2025 dan tahun 2026', 'previewSuratIzin N-2 & N-1 should be "untuk tahun 2024, tahun 2025 dan tahun 2026"');

    // 7. Test with N only (sisa_n1 = 0, sisa_n2 = 0)
    $leave->update(['sisa_cuti_n1' => 0, 'sisa_cuti_n2' => 0]);
    $reqN0Only = EmployeeLeaveRequest::find($data2['id']);
    $reqN0Only->update(['sisa_n1' => 0, 'sisa_n2' => 0]);
    $prevResp0 = $reqCtrl->previewSuratIzin($data2['id']);
    $prevData0 = json_decode($prevResp0->getContent(), true);
    assert($prevData0['tahun_cuti_text'] === null, 'previewSuratIzin N only should be null');

    echo "PASS: Ponytail Leave Balance Snapshot Check completed successfully!\n";
} finally {
    DB::rollBack();
}
