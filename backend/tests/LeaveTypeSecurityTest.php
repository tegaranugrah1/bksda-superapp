<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Modules\Kepegawaian\Models\LeaveType;
use Illuminate\Http\Request;

echo "Running LeaveType Security & Logic Self-Check...\n";

// 1. Verify seed data exists
$count = LeaveType::count();
assert($count >= 7, "Expected at least 7 seeded leave types, found $count");
echo "[PASS] 1. Seeded leave types count: $count\n";

// 2. Verify Cuti Tahunan properties
$ct = LeaveType::where('nama', 'Cuti Tahunan')->first();
assert($ct !== null, "Cuti Tahunan not found");
assert($ct->hitung_hari === 'hari_kerja', "Cuti Tahunan must be hari_kerja");
assert($ct->potong_kuota_tahunan === true, "Cuti Tahunan must cut quota");
echo "[PASS] 2. Cuti Tahunan rules verified\n";

// 3. Verify controller input sanitization & XSS stripping
LeaveType::withTrashed()->where('kode', 'CIH')->forceDelete();
$adminUser = User::where('role', 'super_admin')->first() ?: User::first();
$controller = app(\App\Modules\Kepegawaian\Controllers\LeaveTypeController::class);

$mockReq = Request::create('/api/kepegawaian/leave-types', 'POST', [
    'nama' => '<b>Cuti Ibadah Haji</b><script>alert(1)</script>',
    'kode' => 'CIH',
    'hitung_hari' => 'hari_kalender',
    'potong_kuota_tahunan' => false,
    'maks_hari' => 45,
    'keterangan' => '<p>Cuti untuk menunaikan ibadah haji.</p>',
    'is_active' => true,
    'urutan' => 8,
]);
$mockReq->setUserResolver(fn() => $adminUser);

$res = $controller->store($mockReq);
assert($res->getStatusCode() === 201, "Expected 201 status, got " . $res->getStatusCode());

$created = LeaveType::where('kode', 'CIH')->first();
assert($created !== null, "Created leave type not found");
assert(!str_contains($created->nama, '<script>'), "XSS tag must be stripped from nama");
assert(!str_contains($created->nama, '<b>'), "HTML tags must be stripped from nama");
assert($created->nama === 'Cuti Ibadah Haji', "Expected cleaned nama 'Cuti Ibadah Haji', got '{$created->nama}'");
assert(!str_contains($created->keterangan, '<p>'), "HTML tags must be stripped from keterangan");
echo "[PASS] 3. Input validation and XSS sanitization verified\n";

// 4. Test toggleActive
$toggleRes = $controller->toggleActive($created->id);
assert($toggleRes->getStatusCode() === 200);
$created->refresh();
assert($created->is_active === false, "is_active should be toggled to false");
echo "[PASS] 4. toggleActive verified\n";

// 5. Test destroy (soft delete)
$delRes = $controller->destroy($created->id);
assert($delRes->getStatusCode() === 200);
assert(LeaveType::find($created->id) === null, "Deleted item must be soft-deleted and not in regular query");
assert(LeaveType::withTrashed()->find($created->id) !== null, "Deleted item must exist in withTrashed");
$created->forceDelete(); // Clean up test record
echo "[PASS] 5. Soft-delete and cleanup verified\n";

echo "ALL LEAVE TYPE SECURITY CHECKS PASSED!\n";
