<?php
// Source-only proposal: parent-reviewed sandbox execution only.
require '/fixtures/seed-e2e.php';
$employee = App\Modules\Kepegawaian\Models\Employee::where('nip', '900000000000000001')->sole();
$employee->update(['telepon' => '+6281111111111']);
App\Modules\Kepegawaian\Models\EmployeeLeave::create([
    'employee_id' => $employee->id, 'year' => (int) date('Y'),
    'hak_cuti_n' => 12, 'cuti_terpakai_n0' => 2,
    'sisa_cuti_n1' => 0, 'cuti_terpakai_n1' => 0,
    'sisa_cuti_n2' => 0, 'cuti_terpakai_n2' => 0,
    'catatan' => 'DUMMY-A-BALANCE-MARKER',
]);
