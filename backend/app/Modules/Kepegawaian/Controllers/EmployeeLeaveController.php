<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmployeeLeaveController extends Controller
{
    /**
     * Get Leave Balance for specific employee and year
     */
    public function show(Request $request, int $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);
        $year = (int) $request->input('year', date('Y'));

        $approvedDays = (int) \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
            ->where('status', 'DISETUJUI')
            ->where('jenis_cuti', 'LIKE', '%Tahunan%')
            ->whereYear('tanggal_mulai', $year)
            ->sum('jumlah_hari');

        $leave = EmployeeLeave::where('employee_id', $employeeId)
            ->where('year', $year)
            ->first();

        if ($leave) {
            if ((int) $leave->cuti_terpakai_n0 !== $approvedDays) {
                $leave->update(['cuti_terpakai_n0' => $approvedDays]);
                $leave->refresh();
            }
        } else {
            // Check previous year record if any to prefill defaults
            $prevLeave = EmployeeLeave::where('employee_id', $employeeId)
                ->where('year', $year - 1)
                ->first();

            $prev2Leave = EmployeeLeave::where('employee_id', $employeeId)
                ->where('year', $year - 2)
                ->first();

            // Create in-memory draft if not saved in DB yet
            $leave = new EmployeeLeave([
                'employee_id' => $employeeId,
                'year' => $year,
                'hak_cuti_n' => 12,
                'sisa_cuti_n1' => $prevLeave ? max(0, $prevLeave->sisa_cuti_tersedia) : 0,
                'cuti_terpakai_n1' => $prevLeave ? (int) $prevLeave->cuti_terpakai_n0 : 0,
                'sisa_cuti_n2' => $prev2Leave ? max(0, $prev2Leave->sisa_cuti_tersedia) : 0,
                'cuti_terpakai_n2' => $prev2Leave ? (int) $prev2Leave->cuti_terpakai_n0 : 0,
                'cuti_terpakai_n0' => $approvedDays,
                'catatan' => null,
            ]);
        }

        return response()->json([
            'data' => $leave,
            'employee' => [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'nama_lengkap' => $employee->nama_lengkap,
            ],
        ]);
    }

    /**
     * Store or Update Leave Balance for employee
     */
    public function store(Request $request, int $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'year' => 'required|integer|min:2000|max:2100',
            'hak_cuti_n' => 'nullable|integer|min:0|max:30',
            'sisa_cuti_n1' => 'nullable|integer|min:0|max:30',
            'cuti_terpakai_n1' => 'nullable|integer|min:0|max:30',
            'sisa_cuti_n2' => 'nullable|integer|min:0|max:30',
            'cuti_terpakai_n2' => 'nullable|integer|min:0|max:30',
            'cuti_terpakai_n0' => 'nullable|integer|min:0|max:30',
            'catatan' => 'nullable|string|max:1000',
        ]);

        $year = (int) $validated['year'];

        DB::beginTransaction();
        try {
            $leave = EmployeeLeave::updateOrCreate(
                [
                    'employee_id' => $employeeId,
                    'year' => $year,
                ],
                [
                    'hak_cuti_n' => $validated['hak_cuti_n'] ?? 12,
                    'sisa_cuti_n1' => $validated['sisa_cuti_n1'] ?? 0,
                    'cuti_terpakai_n1' => $validated['cuti_terpakai_n1'] ?? 0,
                    'sisa_cuti_n2' => $validated['sisa_cuti_n2'] ?? 0,
                    'cuti_terpakai_n2' => $validated['cuti_terpakai_n2'] ?? 0,
                    'cuti_terpakai_n0' => $validated['cuti_terpakai_n0'] ?? 0,
                    'catatan' => $validated['catatan'] ?? null,
                    'updated_by' => $request->user()?->id,
                ]
            );

            DB::commit();

            return response()->json([
                'message' => 'Data Cuti Pegawai berhasil diperbarui.',
                'data' => $leave->fresh(),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal memperbarui data cuti',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
