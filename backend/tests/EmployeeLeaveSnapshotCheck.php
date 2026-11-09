<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use Illuminate\Support\Carbon;
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

    // 8. Test CPNS 1-year tenure rule
    $cpns = Employee::firstOrCreate(
        ['nip' => '199907072025061006'],
        [
            'nama_lengkap' => 'CPNS Pengangkatan Juni 2025',
            'email' => 'cpns2025@bksda.test',
            'status_kepegawaian' => 'CPNS',
            'is_active' => true,
        ]
    );
    assert($cpns->annual_leave_eligible_date->toDateString() === '2026-06-01', 'CPNS eligible date must be 2026-06-01');
    assert(!$cpns->isEligibleForAnnualLeave(Carbon::parse('2025-07-01')), 'CPNS cannot take annual leave in 2025');
    assert(!$cpns->isEligibleForAnnualLeave(Carbon::parse('2026-05-31')), 'CPNS cannot take annual leave before June 1, 2026');
    assert($cpns->isEligibleForAnnualLeave(Carbon::parse('2026-06-01')), 'CPNS is eligible for annual leave on June 1, 2026');

    $leaveCpns2025 = EmployeeLeave::forEmployeeYear($cpns->id, 2025);
    assert($leaveCpns2025->hak_cuti_n === 0, 'CPNS hak_cuti_n in appointment year 2025 must be 0');

    $leaveCpns2026 = EmployeeLeave::forEmployeeYear($cpns->id, 2026);
    assert($leaveCpns2026->hak_cuti_n === 12, 'CPNS hak_cuti_n in eligible year 2026 must be 12');
    assert($leaveCpns2026->sisa_cuti_n1 === 0, 'CPNS first eligible year has 0 N-1 carryover');

    // Attempting storeRecord before June 1, 2026 should be rejected with 422
    $reqCpnsEarly = Request::create("/api/kepegawaian/employees/{$cpns->id}/leave-records", 'POST', [
        'nomor_pengajuan' => 'CUTI-CPNS-EARLY',
        'tanggal_pengajuan' => '2026-03-01',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'Cuti sebelum 1 tahun',
        'jumlah_hari' => 2,
        'tanggal_mulai' => '2026-03-02',
        'tanggal_selesai' => '2026-03-03',
        'status' => 'DISETUJUI',
    ]);
    $respCpnsEarly = $controller->storeRecord($reqCpnsEarly, $cpns->id);
    assert($respCpnsEarly->getStatusCode() === 422, 'storeRecord for CPNS before 1 year tenure must return 422');

    // 9. Test PPPK 1-year tenure & No CAP rule
    $pppk = Employee::firstOrCreate(
        ['nip' => '199601032024212050'],
        [
            'nama_lengkap' => 'PPPK Angkatan 2024',
            'email' => 'pppk2024@bksda.test',
            'status_kepegawaian' => 'PPPK',
            'is_active' => true,
        ]
    );
    assert($pppk->is_pppk === true, 'PPPK model must be recognized as is_pppk');
    assert($pppk->annual_leave_eligible_date->toDateString() === '2025-01-01', 'PPPK eligible date must be 2025-01-01');
    assert(!$pppk->isEligibleForAnnualLeave(Carbon::parse('2024-06-01')), 'PPPK cannot take annual leave in 2024');
    assert($pppk->isEligibleForAnnualLeave(Carbon::parse('2025-01-01')), 'PPPK is eligible for annual leave in 2025');

    $leavePppk2024 = EmployeeLeave::forEmployeeYear($pppk->id, 2024);
    assert($leavePppk2024->hak_cuti_n === 0, 'PPPK hak_cuti_n in appointment year 2024 must be 0');

    $leavePppk2025 = EmployeeLeave::forEmployeeYear($pppk->id, 2025);
    assert($leavePppk2025->hak_cuti_n === 12, 'PPPK hak_cuti_n in year 2025 must be 12');

    // PPPK filing CAP must throw ValidationException
    $capBlocked = false;
    try {
        LeaveType::forEmployee('Cuti Karena Alasan Penting', $pppk);
    } catch (\Illuminate\Validation\ValidationException $e) {
        $capBlocked = true;
    }
    assert($capBlocked, 'PPPK must not be allowed to apply for Cuti Karena Alasan Penting');

    // 10. Test MMP: No leave rights & No bank account
    $mmp = Employee::firstOrCreate(
        ['nip' => 'MMP-999'],
        [
            'nama_lengkap' => 'Mitra Polhut Test',
            'email' => 'mmp999@bksda.test',
            'status_kepegawaian' => 'MMP',
            'nama_bank' => 'BRI',
            'nomor_rekening' => '1234567890',
            'is_active' => true,
        ]
    );
    // Test that saving MMP with bank details resets them to null
    $mmp->nama_bank = 'BRI';
    $mmp->nomor_rekening = '1234567890';
    $mmp->save();
    assert($mmp->is_mmp === true, 'MMP must be recognized as is_mmp');
    assert($mmp->nama_bank === null, 'MMP bank must automatically be null on save');
    assert($mmp->nomor_rekening === null, 'MMP rekening must automatically be null on save');
    assert($mmp->annual_leave_eligible_date === null, 'MMP annual leave eligible date must be null');
    assert(!$mmp->isEligibleForAnnualLeave(), 'MMP is not eligible for annual leave');

    $leaveMmp = EmployeeLeave::forEmployeeYear($mmp->id, 2026);
    assert($leaveMmp->total_hak_cuti === 0, 'MMP total hak cuti must be 0');

    // MMP calling LeaveType::forEmployee must throw ValidationException
    $mmpLeaveBlocked = false;
    try {
        LeaveType::forEmployee('Cuti Tahunan', $mmp);
    } catch (\Illuminate\Validation\ValidationException $e) {
        $mmpLeaveBlocked = true;
    }
    assert($mmpLeaveBlocked, 'MMP calling LeaveType::forEmployee must throw ValidationException');

    // MMP storeRecord must return 422
    $reqMmp = Request::create("/api/kepegawaian/employees/{$mmp->id}/leave-records", 'POST', [
        'nomor_pengajuan' => 'CUTI-MMP',
        'tanggal_pengajuan' => '2026-03-01',
        'jenis_cuti' => 'Cuti Tahunan',
        'alasan_cuti' => 'MMP cuti',
        'jumlah_hari' => 1,
        'tanggal_mulai' => '2026-03-02',
        'tanggal_selesai' => '2026-03-02',
        'status' => 'DISETUJUI',
    ]);
    $respMmp = $controller->storeRecord($reqMmp, $mmp->id);
    assert($respMmp->getStatusCode() === 422, 'storeRecord for MMP must return 422');

    // MMP show leave must return null data
    $respMmpShow = $controller->show(new Request(), $mmp->id);
    assert($respMmpShow->getStatusCode() === 200, 'show for MMP should return 200 with null data');
    $mmpShowData = json_decode($respMmpShow->getContent(), true);
    assert($mmpShowData['data'] === null, 'show for MMP data must be null');

    // MMP mealAllowances must return empty data
    $empCtrl = app(\App\Modules\Kepegawaian\Controllers\EmployeeController::class);
    $respMmpMeal = $empCtrl->mealAllowances(new Request(), (string) $mmp->id);
    assert($respMmpMeal->getStatusCode() === 200, 'mealAllowances for MMP should return 200');
    $mmpMealData = json_decode($respMmpMeal->getContent(), true);
    assert(count($mmpMealData['data']) === 0, 'mealAllowances for MMP data must be empty');

    echo "PASS: Ponytail Leave Balance Snapshot Check completed successfully!\n";
} finally {
    DB::rollBack();
}
