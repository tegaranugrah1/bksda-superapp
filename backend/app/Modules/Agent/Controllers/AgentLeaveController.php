<?php

namespace App\Modules\Agent\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class AgentLeaveController extends Controller
{
    /**
     * Membaca saldo hak cuti resmi pegawai berdasarkan NIP.
     */
    public function getLeaveBalance(string $nip): JsonResponse
    {
        $employee = Employee::where('nip', trim($nip))->where('is_active', true)->first();

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pegawai dengan NIP tersebut tidak ditemukan atau tidak aktif.',
            ], 404);
        }

        $year = (int) Carbon::now()->format('Y');

        $leaveBalance = EmployeeLeave::forEmployeeYear($employee->id, $year);

        $hakN = (int) ($leaveBalance->hak_cuti_n ?? 12);
        $cutiTerpakai = (int) $leaveBalance->cuti_terpakai_n0;
        $sisaN0 = max(0, $hakN - $cutiTerpakai);
        $sisaN1 = (int) $leaveBalance->hak_n1_diakui;
        $sisaN2 = (int) $leaveBalance->hak_n2_diakui;
        $totalTersedia = (int) $leaveBalance->sisa_cuti_tersedia;

        $pendingDays = (int) EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'])
            ->whereYear('tanggal_mulai', $year)
            ->annual()
            ->sum('jumlah_hari');

        $availableToApply = max(0, $totalTersedia - $pendingDays);

        return response()->json([
            'status' => 'success',
            'data' => [
                'employee' => [
                    'id' => $employee->id,
                    'nip' => $employee->nip,
                    'nama_lengkap' => $employee->nama_lengkap,
                    'satuan_kerja' => $employee->satuan_kerja,
                ],
                'year' => $year,
                'hak_cuti_n' => $hakN,
                'sisa_cuti_n0' => $sisaN0,
                'sisa_cuti_n1' => $sisaN1,
                'sisa_cuti_n2' => $sisaN2,
                'total_tersedia' => $totalTersedia,
                'pending_pengajuan' => $pendingDays,
                'sisa_dapat_diajukan' => $availableToApply,
                'can_apply' => $availableToApply > 0,
            ],
        ]);
    }

    /**
     * Pengajuan Cuti Mandiri via Asisten WhatsApp dengan Idempotency Guard & Locking Pesimistik.
     */
    public function submitLeaveRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nip' => 'required|string|max:50',
            'jenis_cuti' => 'nullable|string|max:100',
            'tanggal_mulai' => 'required|date_format:Y-m-d',
            'tanggal_selesai' => 'required|date_format:Y-m-d|after_or_equal:tanggal_mulai',
            'alasan_cuti' => 'required|string|max:1000',
            'alamat_menjalankan_cuti' => 'nullable|string|max:500',
            'telepon' => 'nullable|string|max:50',
            'idempotency_key' => 'nullable|string|max:100',
        ]);

        $employee = Employee::where('nip', trim($validated['nip']))->where('is_active', true)->first();

        if (!$employee) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pegawai dengan NIP tersebut tidak ditemukan.',
            ], 404);
        }

        // 1. Idempotency Check (Mencegah submit ganda akibat sinyal seluler WA)
        $idempotencyKey = $validated['idempotency_key'] ?? null;
        if (!empty($idempotencyKey)) {
            $cached = Cache::get('agent_idem_' . $idempotencyKey);
            if ($cached) {
                return response()->json($cached, 200);
            }
        }

        // Cek duplikasi request yang identik dalam 10 menit terakhir
        $recentDuplicate = EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->where('tanggal_mulai', $validated['tanggal_mulai'])
            ->where('tanggal_selesai', $validated['tanggal_selesai'])
            ->where('created_at', '>=', Carbon::now()->subMinutes(10))
            ->first();

        if ($recentDuplicate) {
            $duplicateResponse = [
                'status' => 'success',
                'message' => 'Permohonan cuti ini sudah pernah diajukan sebelumnya.',
                'data' => [
                    'id' => $recentDuplicate->id,
                    'nomor_tiket' => 'CT-' . Carbon::now()->format('Y') . '-' . str_pad((string) $recentDuplicate->id, 4, '0', STR_PAD_LEFT),
                    'status' => $recentDuplicate->status,
                    'jumlah_hari' => $recentDuplicate->jumlah_hari,
                    'tanggal_mulai' => $recentDuplicate->tanggal_mulai,
                    'tanggal_selesai' => $recentDuplicate->tanggal_selesai,
                ],
            ];
            return response()->json($duplicateResponse, 200);
        }

        $start = Carbon::parse($validated['tanggal_mulai']);
        $end = Carbon::parse($validated['tanggal_selesai']);

        // 2. Validasi Batas Tahun Kalender (PerBKN 24/2017)
        if ($start->year !== $end->year) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tanggal mulai dan selesai cuti tidak boleh berada di tahun kalender yang berbeda (PerBKN 24/2017).',
            ], 422);
        }

        $jenisCuti = $validated['jenis_cuti'] ?? 'Cuti Tahunan';
        $year = $start->year;

        // 3. Pessimistic Lock & Transaksi Pembuatan Cuti
        return DB::transaction(function () use ($employee, $validated, $jenisCuti, $start, $end, $year, $idempotencyKey) {
            $employee = Employee::lockForLeaveUpdate($employee->id);
            abort_unless($employee->is_active, 404, 'Pegawai tidak aktif.');
            $leaveType = LeaveType::forEmployee($jenisCuti, $employee);
            $jumlahHari = $leaveType->countDays($start, $end);
            if ($year < 2000 || $year > 2100 || $jumlahHari < 1 || $jumlahHari > 365
                || ($leaveType->maks_hari && $jumlahHari > $leaveType->maks_hari)) {
                throw \Illuminate\Validation\ValidationException::withMessages(['tanggal_selesai' => 'Durasi cuti tidak sesuai batas jenis cuti atau tahun pengajuan.']);
            }

            // Validasi overlap jadwal cuti aktif
            $overlap = EmployeeLeaveRequest::where('employee_id', $employee->id)
                ->whereNotIn('status', ['DITOLAK', 'BATAL', 'ditolak', 'batal'])
                ->where(function ($query) use ($validated) {
                    $query->whereBetween('tanggal_mulai', [$validated['tanggal_mulai'], $validated['tanggal_selesai']])
                        ->orWhereBetween('tanggal_selesai', [$validated['tanggal_mulai'], $validated['tanggal_selesai']])
                        ->orWhere(function ($sub) use ($validated) {
                            $sub->where('tanggal_mulai', '<=', $validated['tanggal_mulai'])
                                ->where('tanggal_selesai', '>=', $validated['tanggal_selesai']);
                        });
                })->exists();

            if ($overlap) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda sudah memiliki permohonan cuti aktif pada rentang tanggal tersebut.',
                ], 422);
            }

            // Validasi kuota jika cuti tahunan
            $leaveBalance = EmployeeLeave::forEmployeeYear($employee->id, $year);

            $sisaN0 = max(0, (int) ($leaveBalance->hak_cuti_n ?? 12) - (int) $leaveBalance->cuti_terpakai_n0);
            $sisaN1 = $leaveBalance->hak_n1_diakui;
            $sisaN2 = $leaveBalance->hak_n2_diakui;
            $totalQuota = $leaveBalance->sisa_cuti_tersedia;

            $pendingDays = (int) EmployeeLeaveRequest::where('employee_id', $employee->id)
                ->whereIn('status', ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'])
                ->whereYear('tanggal_mulai', $year)
                ->annual()
                ->sum('jumlah_hari');

            $availableQuota = max(0, $totalQuota - $pendingDays);

            if (($leaveType?->potong_kuota_tahunan ?? true) && $jumlahHari > $availableQuota) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Jumlah hari cuti ({$jumlahHari} hari) melebihi sisa kuota yang tersedia ({$availableQuota} hari).",
                ], 422);
            }

            // Simpan permohonan cuti baru
            $leaveReq = EmployeeLeaveRequest::create([
                'employee_id' => $employee->id,
                'nomor_pengajuan' => null,
                'tanggal_pengajuan' => Carbon::now()->format('Y-m-d'),
                'jenis_cuti' => $leaveType->nama,
                'alasan_cuti' => strip_tags(trim($validated['alasan_cuti'])),
                'jumlah_hari' => $jumlahHari,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => strip_tags(trim($validated['alamat_menjalankan_cuti'] ?? ($employee->satuan_kerja ?? 'Kalimantan Timur'))),
                'telepon' => $validated['telepon'] ?? $employee->telepon,
                'sisa_n2' => $sisaN2,
                'sisa_n1' => $sisaN1,
                'sisa_n0' => $sisaN0,
                'status' => 'PENGAJUAN',
                'status_pertimbangan_atasan' => 'PENGAJUAN',
                'status_pertimbangan_pejabat' => 'PENGAJUAN',
                'kasubbag_nama' => 'Kasubbag Tata Usaha',
                'kepala_balai_nama' => 'Kepala Balai KSDA Kaltim',
            ]);

            $nomorTiket = 'CT-' . $year . '-' . str_pad((string) $leaveReq->id, 4, '0', STR_PAD_LEFT);

            $result = [
                'status' => 'success',
                'message' => 'Pengajuan cuti berhasil dibuat melalui asisten WhatsApp Hermes.',
                'data' => [
                    'id' => $leaveReq->id,
                    'nomor_tiket' => $nomorTiket,
                    'status' => $leaveReq->status,
                    'jumlah_hari' => $leaveReq->jumlah_hari,
                    'tanggal_mulai' => $leaveReq->tanggal_mulai,
                    'tanggal_selesai' => $leaveReq->tanggal_selesai,
                ],
            ];

            if (!empty($idempotencyKey)) {
                Cache::put('agent_idem_' . $idempotencyKey, $result, now()->addHours(1));
            }

            return response()->json($result, 201);
        });
    }
}
