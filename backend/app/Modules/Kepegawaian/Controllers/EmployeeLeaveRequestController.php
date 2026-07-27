<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EmployeeLeaveRequestController extends Controller
{
    /**
     * Get Leave Requests for logged-in user (Portal)
     */
    public function myIndex(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (!$employee) {
            return response()->json(['data' => []]);
        }

        $requests = EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->with('employee')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json(['data' => $requests]);
    }

    /**
     * Store new Leave Request by employee (Portal)
     */
    public function myStore(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (!$employee) {
            return response()->json(['error' => 'Data pegawai tidak ditemukan untuk akun ini'], 404);
        }

        $validated = $request->validate([
            'jenis_cuti' => 'required|string',
            'alasan_cuti' => 'required|string',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'alamat_menjalankan_cuti' => 'required|string',
            'telepon' => 'nullable|string',
        ]);

        $start = Carbon::parse($validated['tanggal_mulai']);
        $end = Carbon::parse($validated['tanggal_selesai']);

        // Calculate working days or total days
        $jumlahHari = $start->diffInDays($end) + 1;

        $year = $start->year;

        // Fetch current leave balance for snapshot
        $leaveBalance = EmployeeLeave::where('employee_id', $employee->id)
            ->where('year', $year)
            ->first();

        $sisaN0 = $leaveBalance ? $leaveBalance->sisa_cuti_tersedia : 12;
        $sisaN1 = $leaveBalance ? $leaveBalance->hak_n1_diakui : 0;
        $sisaN2 = $leaveBalance ? $leaveBalance->hak_n2_diakui : 0;

        $atasan = $this->getAtasanLangsung($employee->satuan_kerja ?? '');
        $kepalaBalai = $this->getKepalaBalai();

        DB::beginTransaction();
        try {
            $leaveReq = EmployeeLeaveRequest::create([
                'employee_id' => $employee->id,
                'nomor_pengajuan' => 'CUTI/' . $year . '/' . sprintf('%03d', EmployeeLeaveRequest::count() + 1),
                'tanggal_pengajuan' => Carbon::now()->format('Y-m-d'),
                'jenis_cuti' => $validated['jenis_cuti'],
                'alasan_cuti' => $validated['alasan_cuti'],
                'jumlah_hari' => $jumlahHari,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => $validated['alamat_menjalankan_cuti'],
                'telepon' => $validated['telepon'] ?? $employee->user?->phone,
                'sisa_n2' => $sisaN2,
                'sisa_n1' => $sisaN1,
                'sisa_n0' => $sisaN0,
                'status' => 'PENGAJUAN',
                'status_pertimbangan_atasan' => 'PENGAJUAN',
                'status_pertimbangan_pejabat' => 'PENGAJUAN',
                'kasubbag_nama' => $atasan['nama'],
                'kasubbag_nip' => $atasan['nip'],
                'kepala_balai_nama' => $kepalaBalai['nama'],
                'kepala_balai_nip' => $kepalaBalai['nip'],
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Pengajuan Cuti berhasil disimpan!',
                'data' => $leaveReq->load('employee'),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal membuat pengajuan cuti',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Inbox Surat Cuti for Admin Kepegawaian (Read-Only List)
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = EmployeeLeaveRequest::with('employee')
            ->orderBy('id', 'desc');

        if ($request->has('search')) {
            $s = $request->input('search');
            $query->whereHas('employee', function ($q) use ($s) {
                $q->where('nama_lengkap', 'like', "%{$s}%")
                    ->orWhere('nip', 'like', "%{$s}%");
            })->orWhere('jenis_cuti', 'like', "%{$s}%")
              ->orWhere('alasan_cuti', 'like', "%{$s}%");
        }

        $requests = $query->paginate($request->input('per_page', 15));

        return response()->json($requests);
    }

    /**
     * Admin View Specific Leave Request Detail
     */
    public function adminShow(int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::with('employee')->findOrFail($id);
        return response()->json(['data' => $leaveReq]);
    }

    /**
     * Admin Update Status (PENGAJUAN -> DISETUJUI / DITOLAK)
     */
    public function adminUpdateStatus(Request $request, int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:PENGAJUAN,DISETUJUI,DITOLAK',
            'catatan_atasan' => 'nullable|string',
        ]);

        $oldStatus = strtoupper($leaveReq->status);
        $newStatus = strtoupper($validated['status']);

        DB::beginTransaction();
        try {
            $isTahunan = str_contains(strtolower($leaveReq->jenis_cuti), 'tahunan');

            if ($isTahunan && $newStatus === 'DISETUJUI' && $oldStatus !== 'DISETUJUI') {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::firstOrCreate(
                    ['employee_id' => $leaveReq->employee_id, 'year' => $year],
                    [
                        'hak_cuti_n' => 12,
                        'sisa_cuti_n1' => 0,
                        'cuti_terpakai_n1' => 0,
                        'sisa_cuti_n2' => 0,
                        'cuti_terpakai_n2' => 0,
                        'cuti_terpakai_n0' => 0,
                    ]
                );
                $leaveBalance->increment('cuti_terpakai_n0', $leaveReq->jumlah_hari);
            } elseif ($isTahunan && $newStatus !== 'DISETUJUI' && $oldStatus === 'DISETUJUI') {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $year)
                    ->first();
                if ($leaveBalance) {
                    $leaveBalance->decrement('cuti_terpakai_n0', $leaveReq->jumlah_hari);
                }
            }

            $leaveReq->update([
                'status' => $newStatus,
                'status_pertimbangan_atasan' => $newStatus,
                'status_pertimbangan_pejabat' => $newStatus,
                'catatan_atasan' => $validated['catatan_atasan'] ?? $leaveReq->catatan_atasan,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Status pengajuan cuti berhasil diperbarui',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal mengubah status pengajuan cuti'], 500);
        }
    }

    /**
     * Admin Edit Leave Request Details
     */
    public function adminUpdate(Request $request, int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::findOrFail($id);

        $validated = $request->validate([
            'jenis_cuti' => 'required|string',
            'alasan_cuti' => 'required|string',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'alamat_menjalankan_cuti' => 'required|string',
            'telepon' => 'nullable|string',
            'masa_kerja' => 'nullable|string',
        ]);

        $start = Carbon::parse($validated['tanggal_mulai']);
        $end = Carbon::parse($validated['tanggal_selesai']);
        $newJumlahHari = $start->diffInDays($end) + 1;

        DB::beginTransaction();
        try {
            $oldJumlahHari = $leaveReq->jumlah_hari;
            $oldIsTahunan = str_contains(strtolower($leaveReq->jenis_cuti), 'tahunan');
            $newIsTahunan = str_contains(strtolower($validated['jenis_cuti']), 'tahunan');

            if ($oldIsTahunan && $leaveReq->status === 'DISETUJUI') {
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $start->year)
                    ->first();
                if ($leaveBalance) {
                    $leaveBalance->decrement('cuti_terpakai_n0', $oldJumlahHari);
                }
            }

            $leaveReq->update([
                'jenis_cuti' => $validated['jenis_cuti'],
                'alasan_cuti' => $validated['alasan_cuti'],
                'jumlah_hari' => $newJumlahHari,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => $validated['alamat_menjalankan_cuti'],
                'telepon' => $validated['telepon'],
                'masa_kerja' => $validated['masa_kerja'] ?? $leaveReq->masa_kerja,
            ]);

            if ($newIsTahunan && $leaveReq->status === 'DISETUJUI') {
                $leaveBalance = EmployeeLeave::firstOrCreate(
                    ['employee_id' => $leaveReq->employee_id, 'year' => $start->year],
                    [
                        'hak_cuti_n' => 12,
                        'sisa_cuti_n1' => 0,
                        'cuti_terpakai_n1' => 0,
                        'sisa_cuti_n2' => 0,
                        'cuti_terpakai_n2' => 0,
                        'cuti_terpakai_n0' => 0,
                    ]
                );
                $leaveBalance->increment('cuti_terpakai_n0', $newJumlahHari);
            }

            DB::commit();

            return response()->json([
                'message' => 'Pengajuan cuti berhasil diperbarui',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal mengedit pengajuan cuti'], 500);
        }
    }

    /**
     * Admin Delete Leave Request
     */
    public function adminDestroy(int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::findOrFail($id);

        DB::beginTransaction();
        try {
            $isTahunan = str_contains(strtolower($leaveReq->jenis_cuti), 'tahunan');

            if ($isTahunan && $leaveReq->status === 'DISETUJUI') {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $year)
                    ->first();
                if ($leaveBalance) {
                    $leaveBalance->decrement('cuti_terpakai_n0', $leaveReq->jumlah_hari);
                }
            }

            $leaveReq->delete();
            DB::commit();

            return response()->json(['message' => 'Pengajuan cuti berhasil dihapus']);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => 'Gagal menghapus pengajuan cuti'], 500);
        }
    }

    private function getAtasanLangsung(string $satuanKerja): array
    {
        $sk = strtolower($satuanKerja);
        if (str_contains($sk, 'wilayah iii') || str_contains($sk, 'balikpapan')) {
            return [
                'nama' => 'BAMBANG HARI TRIMARSITO, S.Si., M.P.',
                'nip' => '19740626 200112 1 004',
            ];
        } elseif (str_contains($sk, 'wilayah ii') || str_contains($sk, 'tenggarong')) {
            return [
                'nama' => 'SURIAWATI HALIM, S.Hut., M.P.',
                'nip' => '19751127 200003 2 001',
            ];
        } elseif (str_contains($sk, 'wilayah i') || str_contains($sk, 'berau')) {
            return [
                'nama' => 'YULIAN SADONO, S.Hut., M.T.',
                'nip' => '19800707 200604 1 003',
            ];
        }

        return [
            'nama' => 'DHENY MARDIONO, S.Hut., M.Sc.',
            'nip' => '19750314 199903 1 004',
        ];
    }

    private function getKepalaBalai(): array
    {
        // Sort by updated_at DESC and id DESC so the latest added/edited record takes precedence
        $kb = Employee::where('jabatan', 'LIKE', '%Kepala Balai%')
            ->where('is_active', true)
            ->orderBy('updated_at', 'desc')
            ->orderBy('id', 'desc')
            ->first();

        if ($kb) {
            return [
                'nama' => strtoupper($kb->nama_lengkap),
                'nip' => $kb->nip,
            ];
        }

        return [
            'nama' => 'M. ARI WIBAWANTO, S.Hut., M.Sc.',
            'nip' => '19740514 199903 1 001',
        ];
    }
}
