<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class EmployeeLeaveController extends Controller
{
    /**
     * Get Leave Balance for specific employee and year
     */
    public function show(Request $request, int $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);
        $rawYear = (int) $request->input('year', date('Y'));
        $year = ($rawYear >= 2000 && $rawYear <= 2100) ? $rawYear : (int) date('Y');

        $approvedDays = (int) \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
            ->whereIn('status', ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'])
            ->whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])
            ->whereYear('tanggal_mulai', $year)
            ->sum('jumlah_hari');

        $leave = EmployeeLeave::where('employee_id', $employeeId)
            ->where('year', $year)
            ->first();

        if ($leave) {
            $hasOnlineRequests = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
                ->whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])
                ->whereYear('tanggal_mulai', $year)
                ->exists();
            if ($hasOnlineRequests && (int) $leave->cuti_terpakai_n0 !== $approvedDays) {
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

        $requests = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
            ->orderBy('tanggal_mulai', 'desc')
            ->get();

        return response()->json([
            'data' => $leave,
            'requests' => $requests,
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
                    'catatan' => isset($validated['catatan']) ? strip_tags(trim((string) $validated['catatan'])) : null,
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
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memperbarui data cuti.',
            ], 500);
        }
    }

    /**
     * Store an official leave record for an employee (from Leave Tab / Buku Kendali)
     */
    public function storeRecord(Request $request, int $employeeId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);

        $validated = $request->validate([
            'nomor_pengajuan' => 'nullable|string|max:255',
            'tanggal_pengajuan' => 'required|date',
            'jenis_cuti' => 'required|string|max:100',
            'alasan_cuti' => 'nullable|string|max:500',
            'jumlah_hari' => 'required|integer|min:1|max:365',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'alamat_menjalankan_cuti' => 'nullable|string|max:255',
            'telepon' => 'nullable|string|max:50',
            'catatan_atasan' => 'nullable|string|max:500',
            'status' => 'nullable|string|in:DISETUJUI,APPROVED,PENGAJUAN,DITOLAK',
            'file_scan_formulir' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'file_scan_surat_izin' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'file_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $status = strtoupper($validated['status'] ?? 'DISETUJUI');

        DB::beginTransaction();
        try {
            $scanFormulirPath = null;
            $scanFormulirNama = null;
            $scanSuratIzinPath = null;
            $scanSuratIzinNama = null;

            if ($request->hasFile('file_scan_formulir')) {
                $f = $request->file('file_scan_formulir');
                $scanFormulirPath = Storage::disk('local')->putFile('cuti_scans/formulir', $f);
                $scanFormulirNama = $f->getClientOriginalName();
            }

            $suratIzinFile = $request->file('file_scan_surat_izin') ?: $request->file('file_scan');
            if ($suratIzinFile) {
                $scanSuratIzinPath = Storage::disk('local')->putFile('cuti_scans/surat_izin', $suratIzinFile);
                $scanSuratIzinNama = $suratIzinFile->getClientOriginalName();
            }

            $hasUploaded = $scanFormulirPath || $scanSuratIzinPath;

            $leaveReq = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::create([
                'employee_id' => $employeeId,
                'nomor_pengajuan' => !empty($validated['nomor_pengajuan']) ? strip_tags(trim($validated['nomor_pengajuan'])) : null,
                'tanggal_pengajuan' => $validated['tanggal_pengajuan'],
                'jenis_cuti' => strip_tags(trim($validated['jenis_cuti'])),
                'alasan_cuti' => strip_tags(trim($validated['alasan_cuti'] ?? $validated['jenis_cuti'])),
                'jumlah_hari' => (int) $validated['jumlah_hari'],
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => strip_tags(trim($validated['alamat_menjalankan_cuti'] ?? ($employee->satuan_kerja ?? 'Balikpapan'))),
                'telepon' => strip_tags(trim($validated['telepon'] ?? ($employee->no_hp ?? '-'))),
                'status' => $status,
                'status_pertimbangan_atasan' => $status,
                'status_pertimbangan_pejabat' => $status,
                'catatan_atasan' => isset($validated['catatan_atasan']) ? strip_tags(trim($validated['catatan_atasan'])) : null,
                'scan_formulir_path' => $scanFormulirPath,
                'scan_formulir_nama' => $scanFormulirNama,
                'scan_surat_izin_path' => $scanSuratIzinPath,
                'scan_surat_izin_nama' => $scanSuratIzinNama,
                'scan_surat_path' => $scanSuratIzinPath,
                'scan_surat_nama' => $scanSuratIzinNama,
                'scan_surat_uploaded_at' => $hasUploaded ? Carbon::now() : null,
                'scan_surat_uploaded_by' => $hasUploaded ? Auth::id() : null,
            ]);

            // Sync cuti_terpakai_n0 for the year
            $year = (int) date('Y', strtotime($validated['tanggal_mulai']));
            $approvedDays = (int) \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
                ->whereIn('status', ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'])
                ->whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])
                ->whereYear('tanggal_mulai', $year)
                ->sum('jumlah_hari');

            $leave = EmployeeLeave::where('employee_id', $employeeId)->where('year', $year)->first();
            if (!$leave) {
                $prevLeave = EmployeeLeave::where('employee_id', $employeeId)->where('year', $year - 1)->first();
                $prev2Leave = EmployeeLeave::where('employee_id', $employeeId)->where('year', $year - 2)->first();
                $leave = EmployeeLeave::create([
                    'employee_id' => $employeeId,
                    'year' => $year,
                    'hak_cuti_n' => 12,
                    'sisa_cuti_n1' => $prevLeave ? max(0, $prevLeave->sisa_cuti_tersedia) : 0,
                    'cuti_terpakai_n1' => $prevLeave ? (int) $prevLeave->cuti_terpakai_n0 : 0,
                    'sisa_cuti_n2' => $prev2Leave ? max(0, $prev2Leave->sisa_cuti_tersedia) : 0,
                    'cuti_terpakai_n2' => $prev2Leave ? (int) $prev2Leave->cuti_terpakai_n0 : 0,
                    'cuti_terpakai_n0' => $approvedDays,
                ]);
            } else {
                $leave->update(['cuti_terpakai_n0' => $approvedDays]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Surat izin penetapan cuti berhasil dicatat!',
                'data' => $leaveReq,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal mencatat penetapan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat menyimpan penetapan cuti.',
            ], 500);
        }
    }

    /**
     * Update an official leave record for an employee
     */
    public function updateRecord(Request $request, int $employeeId, int $requestId): JsonResponse
    {
        $employee = Employee::findOrFail($employeeId);
        $leaveReq = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)->findOrFail($requestId);

        $validated = $request->validate([
            'nomor_pengajuan' => 'nullable|string|max:255',
            'tanggal_pengajuan' => 'required|date',
            'jenis_cuti' => 'required|string|max:100',
            'alasan_cuti' => 'nullable|string|max:500',
            'jumlah_hari' => 'required|integer|min:1|max:365',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'alamat_menjalankan_cuti' => 'nullable|string|max:255',
            'telepon' => 'nullable|string|max:50',
            'catatan_atasan' => 'nullable|string|max:500',
            'status' => 'nullable|string|in:DISETUJUI,APPROVED,PENGAJUAN,DITOLAK',
            'file_scan_formulir' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'file_scan_surat_izin' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'file_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        $status = strtoupper($validated['status'] ?? $leaveReq->status);
        $oldYear = (int) date('Y', strtotime($leaveReq->tanggal_mulai));
        $newYear = (int) date('Y', strtotime($validated['tanggal_mulai']));

        DB::beginTransaction();
        try {
            $updatePayload = [
                'nomor_pengajuan' => !empty($validated['nomor_pengajuan']) ? strip_tags(trim($validated['nomor_pengajuan'])) : null,
                'tanggal_pengajuan' => $validated['tanggal_pengajuan'],
                'jenis_cuti' => strip_tags(trim($validated['jenis_cuti'])),
                'alasan_cuti' => strip_tags(trim($validated['alasan_cuti'] ?? $validated['jenis_cuti'])),
                'jumlah_hari' => (int) $validated['jumlah_hari'],
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => strip_tags(trim($validated['alamat_menjalankan_cuti'] ?? ($employee->satuan_kerja ?? 'Balikpapan'))),
                'telepon' => strip_tags(trim($validated['telepon'] ?? ($employee->no_hp ?? '-'))),
                'status' => $status,
                'status_pertimbangan_atasan' => $status,
                'status_pertimbangan_pejabat' => $status,
                'catatan_atasan' => isset($validated['catatan_atasan']) ? strip_tags(trim($validated['catatan_atasan'])) : null,
            ];

            $hasUploaded = false;
            if ($request->hasFile('file_scan_formulir')) {
                $f = $request->file('file_scan_formulir');
                if ($leaveReq->scan_formulir_path && Storage::disk('local')->exists($leaveReq->scan_formulir_path)) {
                    Storage::disk('local')->delete($leaveReq->scan_formulir_path);
                }
                $updatePayload['scan_formulir_path'] = Storage::disk('local')->putFile('cuti_scans/formulir', $f);
                $updatePayload['scan_formulir_nama'] = $f->getClientOriginalName();
                $hasUploaded = true;
            }

            $suratIzinFile = $request->file('file_scan_surat_izin') ?: $request->file('file_scan');
            if ($suratIzinFile) {
                if ($leaveReq->scan_surat_izin_path && Storage::disk('local')->exists($leaveReq->scan_surat_izin_path)) {
                    Storage::disk('local')->delete($leaveReq->scan_surat_izin_path);
                }
                if ($leaveReq->scan_surat_path && Storage::disk('local')->exists($leaveReq->scan_surat_path)) {
                    Storage::disk('local')->delete($leaveReq->scan_surat_path);
                }
                $path = Storage::disk('local')->putFile('cuti_scans/surat_izin', $suratIzinFile);
                $updatePayload['scan_surat_izin_path'] = $path;
                $updatePayload['scan_surat_izin_nama'] = $suratIzinFile->getClientOriginalName();
                $updatePayload['scan_surat_path'] = $path;
                $updatePayload['scan_surat_nama'] = $suratIzinFile->getClientOriginalName();
                $hasUploaded = true;
            }

            if ($hasUploaded) {
                $updatePayload['scan_surat_uploaded_at'] = Carbon::now();
                $updatePayload['scan_surat_uploaded_by'] = Auth::id();
            }

            $leaveReq->update($updatePayload);

            // Sync years
            $yearsToSync = array_unique([$oldYear, $newYear]);
            foreach ($yearsToSync as $y) {
                $approvedDays = (int) \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
                    ->whereIn('status', ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'])
                    ->whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])
                    ->whereYear('tanggal_mulai', $y)
                    ->sum('jumlah_hari');

                $leave = EmployeeLeave::where('employee_id', $employeeId)->where('year', $y)->first();
                if ($leave) {
                    $leave->update(['cuti_terpakai_n0' => $approvedDays]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Penetapan cuti berhasil diperbarui!',
                'data' => $leaveReq->fresh(),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal memperbarui penetapan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memperbarui penetapan cuti.',
            ], 500);
        }
    }

    /**
     * Delete an official leave record for an employee
     */
    public function destroyRecord(Request $request, int $employeeId, int $requestId): JsonResponse
    {
        $leaveReq = \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)->findOrFail($requestId);
        $year = (int) date('Y', strtotime($leaveReq->tanggal_mulai));

        DB::beginTransaction();
        try {
            $leaveReq->delete();

            $approvedDays = (int) \App\Modules\Kepegawaian\Models\EmployeeLeaveRequest::where('employee_id', $employeeId)
                ->whereIn('status', ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'])
                ->whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])
                ->whereYear('tanggal_mulai', $year)
                ->sum('jumlah_hari');

            $leave = EmployeeLeave::where('employee_id', $employeeId)->where('year', $year)->first();
            if ($leave) {
                $leave->update(['cuti_terpakai_n0' => $approvedDays]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Penetapan cuti berhasil dihapus.',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal menghapus penetapan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat menghapus penetapan cuti.',
            ], 500);
        }
    }
}
