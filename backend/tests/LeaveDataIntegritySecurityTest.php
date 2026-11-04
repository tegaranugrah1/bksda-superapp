<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Modules\Kepegawaian\Models\LeaveType;
use Illuminate\Support\Facades\DB;

echo "Running Leave Data Integrity & Security Self-Check...\n";

// 1. Verify all jenis_cuti match official active LeaveType names
$validNames = LeaveType::where('is_active', true)->pluck('nama')->toArray();
$records = DB::table('kpg_employee_leave_requests')->select('id', 'jenis_cuti', 'nomor_pengajuan')->get();

$invalid = [];
foreach ($records as $r) {
    if (!in_array($r->jenis_cuti, $validNames)) {
        $invalid[] = "ID {$r->id} ({$r->nomor_pengajuan}): '{$r->jenis_cuti}'";
    }
}

assert(empty($invalid), "Found " . count($invalid) . " leave requests with invalid jenis_cuti:\n" . implode("\n", array_slice($invalid, 0, 10)));
echo "[PASS] 1. All " . count($records) . " records strictly match Master Leave Types: " . implode(', ', $validNames) . "\n";

// 2. Ensure zero occurrences of legacy unstandardized terms
$legacyForbidden = ['Cuti Alasan Penting', 'SUKET IZIN SIKADIR', 'Cuti Bersalin'];
foreach ($legacyForbidden as $forbidden) {
    $found = DB::table('kpg_employee_leave_requests')->where('jenis_cuti', $forbidden)->count();
    assert($found === 0, "Forbidden legacy term '$forbidden' still exists ($found records)");
}
echo "[PASS] 2. Zero legacy unstandardized terms found in database\n";

// 3. Verify specific records that were patched
$anakSakit = DB::table('kpg_employee_leave_requests')->where('alasan_cuti', 'Anak Sakit')->first();
assert($anakSakit !== null && $anakSakit->jenis_cuti === 'Cuti Karena Alasan Penting', "Anak Sakit must be Cuti Karena Alasan Penting");

$sikadir = DB::table('kpg_employee_leave_requests')->where('nomor_pengajuan', 'ND.690/K.18/SKWIII/06/2026')->first();
assert($sikadir !== null && $sikadir->jenis_cuti === 'Cuti Karena Alasan Penting', "Sikadir must be Cuti Karena Alasan Penting");

$haji = DB::table('kpg_employee_leave_requests')->where('nomor_pengajuan', 'SI.162/K.18/TU/PEG/05/2024')->first();
assert($haji !== null && $haji->jenis_cuti === 'Cuti Besar' && $haji->alasan_cuti === 'Menunaikan Ibadah Haji', "Haji must be Cuti Besar with clean reason");

echo "[PASS] 3. Specific patched records verified correctly\n";
echo "ALL LEAVE DATA INTEGRITY CHECKS PASSED!\n";
