<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use Illuminate\Http\Request;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\Kepegawaian\Models\Employee;

echo "=== SELF CHECK PUBLIC SURAT TUGAS ACCESS ===" . PHP_EOL;

// 1. Test GET /api/kepegawaian/employees/select without auth
$req1 = Request::create('/api/kepegawaian/employees/select', 'GET', ['limit' => 5]);
$res1 = $kernel->handle($req1);
echo "1. Employees Select Status: " . $res1->getStatusCode() . PHP_EOL;
assert($res1->getStatusCode() === 200, "Expected 200 for public employees select");
$data1 = json_decode($res1->getContent(), true);
assert(isset($data1['data']) && is_array($data1['data']), "Data array returned");

// 2. Test GET /api/kepegawaian/st-task-types/public without auth
$req2 = Request::create('/api/kepegawaian/st-task-types/public', 'GET');
$res2 = $kernel->handle($req2);
echo "2. Task Types Public Status: " . $res2->getStatusCode() . PHP_EOL;
assert($res2->getStatusCode() === 200, "Expected 200 for public task types");

// 3. Test GET /api/kepegawaian/st-expense-templates/public without auth
$req3 = Request::create('/api/kepegawaian/st-expense-templates/public', 'GET');
$res3 = $kernel->handle($req3);
echo "3. Expense Templates Public Status: " . $res3->getStatusCode() . PHP_EOL;
assert($res3->getStatusCode() === 200, "Expected 200 for public expense templates");

// 4. Test POST /api/surat-tugas/check-conflicts without auth
$emp = Employee::first();
$req4 = Request::create('/api/surat-tugas/check-conflicts', 'POST', [
    'tanggal_mulai' => '2026-11-20',
    'tanggal_selesai' => '2026-11-22',
    'employees' => $emp ? [['id' => $emp->id]] : [],
]);
$req4->headers->set('Accept', 'application/json');
$res4 = $kernel->handle($req4);
echo "4. Check Conflicts Status: " . $res4->getStatusCode() . PHP_EOL;
assert($res4->getStatusCode() === 200, "Expected 200 for check conflicts");

// 5. Test POST /api/surat-tugas/submit without auth (Guest submission)
// Security check: attempt to pass status = 'approved' from unauthenticated guest
$submitPayload = [
    'maksud_tujuan' => 'Pengujian Pengajuan Surat Tugas Publik Tanpa Login',
    'tanggal_mulai' => '2026-11-25',
    'tanggal_selesai' => '2026-11-27',
    'sumber_dana' => 'dipa',
    'tempat_tujuan' => 'Balikpapan',
    'status' => 'approved', // Security audit: guest attempts privilege escalation
    'employees' => $emp ? [['id' => $emp->id]] : [],
];
$req5 = Request::create('/api/surat-tugas/submit', 'POST', $submitPayload);
$req5->headers->set('Accept', 'application/json');
$res5 = $kernel->handle($req5);
echo "5. Public Submit Status: " . $res5->getStatusCode() . PHP_EOL;
assert($res5->getStatusCode() === 201, "Expected 201 for public submit");

$data5 = json_decode($res5->getContent(), true);
$createdLetter = AssignmentLetter::find($data5['data']['id']);
assert($createdLetter !== null, "Letter created in DB");
echo "Created Letter ID: " . $createdLetter->id . ", Status: " . $createdLetter->status . PHP_EOL;

// Security audit assertion: status MUST NOT be 'approved', MUST be forced to 'pending'
assert($createdLetter->status === 'pending', "Status must be forced to 'pending' for guest");
assert($createdLetter->created_by === null, "created_by must be null for guest");

// Cleanup test record
$createdLetter->forceDelete();

echo "=== ALL PUBLIC ACCESS CHECKS PASSED ===" . PHP_EOL;
