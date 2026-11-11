<?php

namespace App\Modules\SuratTugas\Services;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AssignmentLetterConflictService
{
    /**
     * Check schedule conflicts for assigned employees against active Surat Tugas and approved Cuti.
     *
     * @param array $employees List of employee items: [['id' => 1, 'tanggal_mulai' => '...', 'tanggal_selesai' => '...'], ...] or integer IDs
     * @param string|null $defaultTanggalMulai Default start date if not set per employee
     * @param string|null $defaultTanggalSelesai Default end date if not set per employee
     * @param string|null $excludeLetterId Assignment letter UUID/ID to exclude (for edit/update mode)
     * @return array ['has_conflict' => bool, 'conflicts' => array]
     */
    public function checkConflicts(
        array $employees,
        ?string $defaultTanggalMulai,
        ?string $defaultTanggalSelesai,
        ?string $excludeLetterId = null,
        bool $canViewDetails = false
    ): array {
        if ($defaultTanggalMulai && $defaultTanggalSelesai) {
            Validator::make(['tanggal_mulai' => $defaultTanggalMulai, 'tanggal_selesai' => $defaultTanggalSelesai], [
                'tanggal_mulai' => 'date', 'tanggal_selesai' => 'date|after_or_equal:tanggal_mulai',
            ])->validate();
        }
        if (empty($employees)) {
            return ['has_conflict' => false, 'conflicts' => []];
        }

        $cleanExcludeId = $excludeLetterId ? preg_replace('/^st-/', '', (string) $excludeLetterId) : null;
        $conflicts = [];

        // Normalize employee inputs and extract valid numeric IDs
        $normalizedList = [];
        foreach ($employees as $item) {
            $id = is_array($item) ? ($item['id'] ?? null) : $item;
            if (!$id || !is_numeric($id)) {
                continue; // Skip PM / Buruh / non-employee IDs
            }
            $empId = (int) $id;
            $mulai = (is_array($item) && !empty($item['tanggal_mulai'])) ? $item['tanggal_mulai'] : $defaultTanggalMulai;
            $selesai = (is_array($item) && !empty($item['tanggal_selesai'])) ? $item['tanggal_selesai'] : ($defaultTanggalSelesai ?: $mulai);

            if ($mulai) {
                Validator::make(['employees' => [$empId => ['tanggal_mulai' => $mulai, 'tanggal_selesai' => $selesai]]], [
                    'employees.*.tanggal_mulai' => 'required|date',
                    'employees.*.tanggal_selesai' => 'required|date|after_or_equal:employees.*.tanggal_mulai',
                ])->validate();
                $normalizedList[$empId] = [
                    'id' => $empId,
                    'mulai' => substr((string) $mulai, 0, 10),
                    'selesai' => substr((string) ($selesai ?: $mulai), 0, 10),
                ];
            }
        }

        if (empty($normalizedList)) {
            return ['has_conflict' => false, 'conflicts' => []];
        }

        // Fetch employee info for human-readable messages and lifecycle check
        $employeesMap = Employee::whereIn('id', array_keys($normalizedList))
            ->get(['id', 'nama_lengkap', 'is_active', 'inactive_effective_date', 'inactive_reason'])
            ->keyBy('id');

        $activeStStatuses = ['pending', 'approved', 'published', 'diterbitkan', 'completed'];
        $activeLeaveStatuses = ['approved', 'disetujui'];

        foreach ($normalizedList as $empId => $data) {
            $emp = $employeesMap[$empId] ?? null;
            $empName = $emp?->nama_lengkap ?? "Pegawai ID {$empId}";
            $reqMulai = $data['mulai'];
            $reqSelesai = $data['selesai'];

            // 0. Check Employee Lifecycle (non-active or TMT during/before assignment)
            if ($emp && ! $emp->is_active) {
                $reasonLabel = $emp->inactive_reason ? " ({$emp->inactive_reason})" : '';
                $conflicts[] = [
                    'employee_id' => $empId,
                    'employee_name' => $empName,
                    'type' => 'inactive_employee',
                    'reference_id' => null,
                    'nomor' => 'STATUS_NONAKTIF',
                    'keterangan' => "Pegawai '{$empName}' tidak dapat ditugaskan karena berstatus nonaktif{$reasonLabel}.",
                    'status' => 'nonaktif',
                    'tanggal_mulai' => $reqMulai,
                    'tanggal_selesai' => $reqSelesai,
                    'range_formatted' => 'Status Non-Aktif',
                ];
                continue;
            }

            if ($emp && $emp->inactive_effective_date) {
                $tmt = $emp->inactive_effective_date->toDateString();
                if ($reqSelesai >= $tmt) {
                    $conflicts[] = [
                        'employee_id' => $empId,
                        'employee_name' => $empName,
                        'type' => 'tmt_inactive_conflict',
                        'reference_id' => null,
                        'nomor' => 'TMT_NONAKTIF',
                        'keterangan' => "Pegawai '{$empName}' memiliki jadwal TMT nonaktif per {$tmt} di dalam atau sebelum periode dinas.",
                        'status' => 'terjadwal_nonaktif',
                        'tanggal_mulai' => $reqMulai,
                        'tanggal_selesai' => $reqSelesai,
                        'range_formatted' => "TMT Nonaktif: {$tmt}",
                    ];
                    continue;
                }
            }

            // 1. Check conflicts with other active Assignment Letters
            $stQuery = DB::table('st_assignment_letters as sal')
                ->join('st_assignment_letter_employees as sale', 'sal.id', '=', 'sale.assignment_letter_id')
                ->where('sale.employee_id', $empId)
                ->whereNull('sal.deleted_at')
                ->whereIn(DB::raw('LOWER(sal.status)'), $activeStStatuses)
                ->whereRaw('COALESCE(sale.tanggal_mulai, sal.tanggal_mulai) <= ?', [$reqSelesai])
                ->whereRaw('COALESCE(sale.tanggal_selesai, sal.tanggal_selesai, sale.tanggal_mulai, sal.tanggal_mulai) >= ?', [$reqMulai]);

            if ($cleanExcludeId) {
                $stQuery->where('sal.id', '!=', $cleanExcludeId);
            }

            $stConflicts = $stQuery->select([
                'sal.id',
                'sal.nomor_surat',
                'sal.maksud_tujuan',
                'sal.status',
                DB::raw('COALESCE(sale.tanggal_mulai, sal.tanggal_mulai) as effective_mulai'),
                DB::raw('COALESCE(sale.tanggal_selesai, sal.tanggal_selesai, sale.tanggal_mulai, sal.tanggal_mulai) as effective_selesai'),
            ])->get();

            foreach ($stConflicts as $st) {
                $existingMulai = substr((string) $st->effective_mulai, 0, 10);
                $existingSelesai = substr((string) $st->effective_selesai, 0, 10);
                $rangeFormatted = $existingMulai === $existingSelesai
                    ? $this->formatDateHuman($existingMulai)
                    : $this->formatDateHuman($existingMulai) . ' s/d ' . $this->formatDateHuman($existingSelesai);

                $conflicts[] = [
                    'employee_id' => $empId,
                    'employee_name' => $empName,
                    'type' => 'surat_tugas',
                    'reference_id' => $canViewDetails ? $st->id : null,
                    'nomor' => $canViewDetails ? $st->nomor_surat : null,
                    'keterangan' => $canViewDetails ? $st->maksud_tujuan : 'Penugasan Aktif',
                    'status' => $st->status,
                    'tanggal_mulai' => $existingMulai,
                    'tanggal_selesai' => $existingSelesai,
                    'range_formatted' => $rangeFormatted,
                    'message' => "{$empName}: Ada Surat Tugas aktif pada {$rangeFormatted}.",
                ];
            }

            // 2. Check conflicts with active approved Leave (Cuti)
            $leaveConflicts = DB::table('kpg_employee_leave_requests')
                ->where('employee_id', $empId)
                ->whereNull('deleted_at')
                ->whereIn(DB::raw('LOWER(status)'), $activeLeaveStatuses)
                ->where('tanggal_mulai', '<=', $reqSelesai)
                ->whereRaw('COALESCE(tanggal_selesai, tanggal_mulai) >= ?', [$reqMulai])
                ->select([
                    'id',
                    'nomor_pengajuan',
                    'jenis_cuti',
                    'alasan_cuti',
                    'status',
                    'tanggal_mulai',
                    'tanggal_selesai',
                ])->get();

            foreach ($leaveConflicts as $leave) {
                $leaveMulai = substr((string) $leave->tanggal_mulai, 0, 10);
                $leaveSelesai = substr((string) ($leave->tanggal_selesai ?: $leave->tanggal_mulai), 0, 10);
                $rangeFormatted = $leaveMulai === $leaveSelesai
                    ? $this->formatDateHuman($leaveMulai)
                    : $this->formatDateHuman($leaveMulai) . ' s/d ' . $this->formatDateHuman($leaveSelesai);


                $conflicts[] = [
                    'employee_id' => $empId,
                    'employee_name' => $empName,
                    'type' => 'cuti',
                    'reference_id' => $canViewDetails ? $leave->id : null,
                    'nomor' => $canViewDetails ? $leave->nomor_pengajuan : null,
                    'keterangan' => $canViewDetails ? $leave->alasan_cuti : 'Cuti Aktif',
                    'status' => $leave->status,
                    'tanggal_mulai' => $leaveMulai,
                    'tanggal_selesai' => $leaveSelesai,
                    'range_formatted' => $rangeFormatted,
                    'message' => "{$empName}: Sedang Cuti Aktif pada {$rangeFormatted}.",
                ];
            }
        }

        return [
            'has_conflict' => !empty($conflicts),
            'conflicts' => $conflicts,
        ];
    }

    private function formatDateHuman(string $date): string
    {
        try {
            return Carbon::parse($date)->isoFormat('D MMM Y');
        } catch (\Throwable) {
            return $date;
        }
    }
}
