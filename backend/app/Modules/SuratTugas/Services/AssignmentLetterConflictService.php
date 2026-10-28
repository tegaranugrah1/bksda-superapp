<?php

namespace App\Modules\SuratTugas\Services;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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
        ?string $excludeLetterId = null
    ): array {
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

        // Fetch employee info for human-readable messages
        $empNames = Employee::whereIn('id', array_keys($normalizedList))
            ->pluck('nama_lengkap', 'id')
            ->toArray();

        $activeStStatuses = ['pending', 'approved', 'published', 'diterbitkan', 'completed'];
        $activeLeaveStatuses = ['approved', 'disetujui'];

        foreach ($normalizedList as $empId => $data) {
            $empName = $empNames[$empId] ?? "Pegawai ID {$empId}";
            $reqMulai = $data['mulai'];
            $reqSelesai = $data['selesai'];

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

                $noSurat = $st->nomor_surat ?: 'Tanpa Nomor';
                $statusUpper = strtoupper($st->status);

                $conflicts[] = [
                    'employee_id' => $empId,
                    'employee_name' => $empName,
                    'type' => 'surat_tugas',
                    'reference_id' => $st->id,
                    'nomor' => $st->nomor_surat,
                    'keterangan' => $st->maksud_tujuan,
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

                $jenisCuti = $leave->jenis_cuti ?: 'Cuti';

                $conflicts[] = [
                    'employee_id' => $empId,
                    'employee_name' => $empName,
                    'type' => 'cuti',
                    'reference_id' => $leave->id,
                    'nomor' => $leave->nomor_pengajuan,
                    'keterangan' => $leave->alasan_cuti,
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
