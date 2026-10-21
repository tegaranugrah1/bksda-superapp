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
use Illuminate\Validation\Rule;

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

        $query = EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->with(['employee:id,nama_lengkap,nip,jabatan,satuan_kerja,pangkat_golongan'])
            ->orderBy('tanggal_mulai', 'desc')
            ->orderBy('id', 'desc');

        if ($year = (int) $request->input('year')) {
            if ($year >= 2000 && $year <= 2100) {
                $query->whereYear('tanggal_mulai', $year);
            }
        }

        if ($status = $request->input('status')) {
            $s = strtoupper((string) $status);
            if ($s !== 'ALL' && $s !== 'SEMUA') {
                $statuses = match ($s) {
                    'PENDING', 'PENGAJUAN' => ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'],
                    'APPROVED', 'DISETUJUI' => ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'],
                    'REJECTED', 'DITOLAK' => ['DITOLAK', 'REJECTED', 'ditolak', 'rejected'],
                    default => [$s],
                };
                $query->whereIn('status', $statuses);
            }
        }

        $requests = $query->limit(100)->get();

        return response()->json(['data' => $requests]);
    }

    /**
     * Get specific Leave Request detail for logged-in employee (Portal)
     */
    public function myShow(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (! $employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan untuk akun ini'], 404);
        }

        $leaveReq = EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->with(['employee:id,nama_lengkap,nip,jabatan,satuan_kerja,pangkat_golongan'])
            ->findOrFail($id);

        return response()->json(['data' => $leaveReq]);
    }

    /**
     * Get Leave Balance for logged-in employee (Portal)
     */
    public function myBalance(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (!$employee) {
            return response()->json(['error' => 'Data pegawai tidak ditemukan untuk akun ini'], 404);
        }

        return app(EmployeeLeaveController::class)->show($request, $employee->id);
    }

    /**
     * Cancel a pending leave request by employee (Portal)
     */
    public function myDestroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (! $employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan untuk akun ini'], 404);
        }

        $leaveReq = EmployeeLeaveRequest::where('employee_id', $employee->id)->findOrFail($id);

        if (! in_array(strtoupper($leaveReq->status), ['PENGAJUAN', 'PENDING'], true)) {
            return response()->json([
                'message' => 'Hanya permohonan cuti yang masih berstatus PENGAJUAN yang dapat dibatalkan.',
            ], 422);
        }

        $leaveReq->delete();

        return response()->json([
            'message' => 'Permohonan cuti berhasil dibatalkan.',
        ]);
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
            'jenis_cuti' => 'required|string|max:150',
            'alasan_cuti' => 'required|string|max:1000',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'alamat_menjalankan_cuti' => 'required|string|max:500',
            'telepon' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]+$/'],
        ]);

        $leaveType = \App\Modules\Kepegawaian\Models\LeaveType::where('is_active', true)
            ->where(function ($q) use ($validated) {
                $q->where('nama', $validated['jenis_cuti'])
                  ->orWhere('kode', $validated['jenis_cuti']);
            })
            ->first();

        $start = Carbon::parse($validated['tanggal_mulai'])->startOfDay();
        $end = Carbon::parse($validated['tanggal_selesai'])->startOfDay();

        // Calculate working days or calendar days based on LeaveType configuration
        $isHariKerja = $leaveType 
            ? ($leaveType->hitung_hari === 'hari_kerja') 
            : str_contains(strtolower($validated['jenis_cuti']), 'tahunan');

        if ($isHariKerja) {
            $jumlahHari = 0;
            $curr = $start->copy();
            while ($curr->lte($end)) {
                if (!$curr->isWeekend()) {
                    $jumlahHari++;
                }
                $curr->addDay();
            }
        } else {
            $jumlahHari = $start->diffInDays($end) + 1;
        }

        if ($leaveType && $leaveType->maks_hari && $jumlahHari > $leaveType->maks_hari) {
            return response()->json([
                'message' => "Jumlah hari cuti ({$jumlahHari} hari) melebihi batas maksimal untuk jenis cuti {$leaveType->nama} ({$leaveType->maks_hari} hari).",
            ], 422);
        }

        if ($start->year !== $end->year) {
            return response()->json([
                'message' => 'Pengajuan cuti tidak boleh lintas tahun kalender. Silakan ajukan terpisah per tahun anggaran sesuai PerBKN 24/2017.',
            ], 422);
        }

        if ($jumlahHari > 365) {
            return response()->json([
                'message' => 'Durasi pengajuan cuti tunggal tidak boleh melebihi 365 hari.',
            ], 422);
        }

        if ($start->year < 2000 || $start->year > 2100) {
            return response()->json([
                'message' => 'Tahun pengajuan cuti tidak valid.',
            ], 422);
        }

        $year = $start->year;

        // Fetch current leave balance for snapshot
        $leaveBalance = EmployeeLeave::where('employee_id', $employee->id)
            ->where('year', $year)
            ->first();

        $sisaN0 = $leaveBalance ? max(0, ((int) ($leaveBalance->hak_cuti_n ?: 12)) - (int) $leaveBalance->cuti_terpakai_n0) : 12;
        $sisaN1 = $leaveBalance ? $leaveBalance->hak_n1_diakui : 0;
        $sisaN2 = $leaveBalance ? $leaveBalance->hak_n2_diakui : 0;

        $totalQuota = $leaveBalance ? $leaveBalance->sisa_cuti_tersedia : 12;

        $pendingDays = (int) EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'])
            ->whereYear('tanggal_mulai', $year)
            ->whereRaw('LOWER(jenis_cuti) LIKE ?', ['%tahunan%'])
            ->sum('jumlah_hari');

        $availableQuota = max(0, $totalQuota - $pendingDays);
        $isTahunan = $leaveType ? $leaveType->potong_kuota_tahunan : str_contains(strtolower($validated['jenis_cuti']), 'tahunan');
        if ($isTahunan && $jumlahHari > $availableQuota) {
            $msg = $pendingDays > 0
                ? "Jumlah hari cuti ({$jumlahHari} hari) melebihi sisa hak cuti tahunan yang belum diajukan ({$availableQuota} hari tersisa dari total {$totalQuota} hari, {$pendingDays} hari sedang dalam proses pengajuan)."
                : "Jumlah hari cuti ({$jumlahHari} hari) melebihi total sisa cuti tahunan yang tersedia ({$totalQuota} hari).";
            return response()->json([
                'message' => $msg,
            ], 422);
        }

        // Prevent overlapping leave requests
        $overlap = EmployeeLeaveRequest::where('employee_id', $employee->id)
            ->whereIn('status', ['PENGAJUAN', 'DISETUJUI', 'PENDING', 'APPROVED', 'pengajuan', 'disetujui', 'pending', 'approved'])
            ->where(function ($q) use ($validated) {
                $q->whereBetween('tanggal_mulai', [$validated['tanggal_mulai'], $validated['tanggal_selesai']])
                    ->orWhereBetween('tanggal_selesai', [$validated['tanggal_mulai'], $validated['tanggal_selesai']])
                    ->orWhere(function ($sub) use ($validated) {
                        $sub->where('tanggal_mulai', '<=', $validated['tanggal_mulai'])
                            ->where('tanggal_selesai', '>=', $validated['tanggal_selesai']);
                    });
            })->exists();

        if ($overlap) {
            return response()->json([
                'message' => 'Anda sudah memiliki permohonan cuti aktif pada rentang tanggal tersebut.',
            ], 422);
        }

        $atasan = $this->getAtasanLangsung($employee->satuan_kerja ?? '');
        $kepalaBalai = $this->getKepalaBalai();

        DB::beginTransaction();
        try {
            $leaveReq = EmployeeLeaveRequest::create([
                'employee_id' => $employee->id,
                'nomor_pengajuan' => 'CUTI/' . $year . '/' . sprintf('%03d', (EmployeeLeaveRequest::withTrashed()->max('id') ?? 0) + 1),
                'tanggal_pengajuan' => Carbon::now()->format('Y-m-d'),
                'jenis_cuti' => $validated['jenis_cuti'],
                'alasan_cuti' => strip_tags(trim($validated['alasan_cuti'])),
                'jumlah_hari' => $jumlahHari,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => strip_tags(trim($validated['alamat_menjalankan_cuti'])),
                'telepon' => $validated['telepon'] ?? $employee->no_telepon ?? null,
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
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memproses pengajuan cuti.',
            ], 500);
        }
    }

    /**
     * Inbox Surat Cuti for Admin Kepegawaian (Read-Only List)
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = EmployeeLeaveRequest::with('employee')
            ->orderBy('tanggal_mulai', 'desc')
            ->orderBy('id', 'desc');

        if ($year = (int) $request->input('year')) {
            if ($year >= 2000 && $year <= 2100) {
                $query->whereYear('tanggal_mulai', $year);
            }
        }

        if ($status = $request->input('status')) {
            $s = strtoupper((string) $status);
            if ($s !== 'ALL' && $s !== 'SEMUA') {
                $statuses = match ($s) {
                    'PENDING', 'PENGAJUAN' => ['PENGAJUAN', 'PENDING', 'pengajuan', 'pending'],
                    'APPROVED', 'DISETUJUI' => ['DISETUJUI', 'APPROVED', 'disetujui', 'approved'],
                    'REJECTED', 'DITOLAK' => ['DITOLAK', 'REJECTED', 'ditolak', 'rejected'],
                    default => [$s],
                };
                $query->whereIn('status', $statuses);
            }
        }

        $search = trim((string) ($request->input('search') ?? $request->input('q') ?? ''));
        if ($search !== '') {
            $s = addcslashes($search, '%_');
            $likeOp = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($nested) use ($s, $likeOp) {
                $nested->whereHas('employee', function ($q) use ($s, $likeOp) {
                    $q->where('nama_lengkap', $likeOp, "%{$s}%")
                        ->orWhere('nip', $likeOp, "%{$s}%");
                })->orWhere('nomor_pengajuan', $likeOp, "%{$s}%")
                  ->orWhere('jenis_cuti', $likeOp, "%{$s}%")
                  ->orWhere('alasan_cuti', $likeOp, "%{$s}%");
            });
        }

        $requestedPerPage = max(1, (int) $request->input('per_page', 20));
        $perPage = min($requestedPerPage, 100);
        $requests = $query->paginate($perPage);

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
            'status' => 'required|string|in:PENGAJUAN,DISETUJUI,DITOLAK,pengajuan,disetujui,ditolak,Pengajuan,Disetujui,Ditolak',
            'catatan_atasan' => 'nullable|string',
        ]);

        $statusMap = [
            'PENGAJUAN' => 'PENGAJUAN',
            'PENDING' => 'PENGAJUAN',
            'DISETUJUI' => 'DISETUJUI',
            'APPROVED' => 'DISETUJUI',
            'DITOLAK' => 'DITOLAK',
            'REJECTED' => 'DITOLAK',
        ];
        $oldStatus = strtoupper($leaveReq->status);
        $newStatus = $statusMap[strtoupper($validated['status'])] ?? strtoupper($validated['status']);

        DB::beginTransaction();
        try {
            $isTahunan = str_contains(strtolower($leaveReq->jenis_cuti), 'tahunan');
            $isOldApproved = in_array($oldStatus, ['DISETUJUI', 'APPROVED'], true);
            $isNewApproved = in_array($newStatus, ['DISETUJUI', 'APPROVED'], true);

            if ($isTahunan && $isNewApproved && ! $isOldApproved) {
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
                if ($leaveReq->jumlah_hari > $leaveBalance->sisa_cuti_tersedia) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Saldo cuti tidak mencukupi',
                        'message' => "Sisa hak cuti pegawai hanya tersisa {$leaveBalance->sisa_cuti_tersedia} hari, tidak mencukupi untuk permohonan {$leaveReq->jumlah_hari} hari.",
                    ], 422);
                }
                $leaveBalance->increment('cuti_terpakai_n0', $leaveReq->jumlah_hari);
            } elseif ($isTahunan && ! $isNewApproved && $isOldApproved) {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $year)
                    ->first();
                if ($leaveBalance) {
                    $leaveBalance->update(['cuti_terpakai_n0' => max(0, (int) $leaveBalance->cuti_terpakai_n0 - $leaveReq->jumlah_hari)]);
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
            return response()->json([
                'error' => 'Gagal mengubah status pengajuan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memproses permohonan cuti.',
            ], 500);
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

        if ($start->year !== $end->year) {
            return response()->json([
                'message' => 'Pengajuan cuti tidak boleh lintas tahun kalender. Silakan sesuaikan per tahun anggaran sesuai PerBKN 24/2017.',
            ], 422);
        }

        if ($newJumlahHari > 365) {
            return response()->json([
                'message' => 'Durasi pengajuan cuti tunggal tidak boleh melebihi 365 hari.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            $oldJumlahHari = $leaveReq->jumlah_hari;
            $oldIsTahunan = str_contains(strtolower($leaveReq->jenis_cuti), 'tahunan');
            $newIsTahunan = str_contains(strtolower($validated['jenis_cuti']), 'tahunan');

            if ($oldIsTahunan && in_array(strtoupper($leaveReq->status), ['DISETUJUI', 'APPROVED'], true)) {
                $oldYear = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $oldYear)
                    ->first();
                if ($leaveBalance) {
                    $leaveBalance->update(['cuti_terpakai_n0' => max(0, (int) $leaveBalance->cuti_terpakai_n0 - $oldJumlahHari)]);
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

            if ($newIsTahunan && in_array(strtoupper($leaveReq->status), ['DISETUJUI', 'APPROVED'], true)) {
                $newYear = Carbon::parse($validated['tanggal_mulai'])->year;
                $leaveBalance = EmployeeLeave::firstOrCreate(
                    ['employee_id' => $leaveReq->employee_id, 'year' => $newYear],
                    [
                        'hak_cuti_n' => 12,
                        'sisa_cuti_n1' => 0,
                        'cuti_terpakai_n1' => 0,
                        'sisa_cuti_n2' => 0,
                        'cuti_terpakai_n2' => 0,
                        'cuti_terpakai_n0' => 0,
                    ]
                );
                if ($newJumlahHari > $leaveBalance->sisa_cuti_tersedia) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Saldo cuti tidak mencukupi',
                        'message' => "Sisa hak cuti pegawai hanya tersisa {$leaveBalance->sisa_cuti_tersedia} hari, tidak mencukupi untuk permohonan {$newJumlahHari} hari.",
                    ], 422);
                }
                $leaveBalance->increment('cuti_terpakai_n0', $newJumlahHari);
            }

            DB::commit();

            return response()->json([
                'message' => 'Pengajuan cuti berhasil diperbarui',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal mengedit pengajuan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memperbarui pengajuan cuti.',
            ], 500);
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

            if ($isTahunan && in_array(strtoupper($leaveReq->status), ['DISETUJUI', 'APPROVED'], true)) {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $year)
                    ->first();
                if ($leaveBalance) {
                    $leaveBalance->update(['cuti_terpakai_n0' => max(0, (int) $leaveBalance->cuti_terpakai_n0 - $leaveReq->jumlah_hari)]);
                }
            }

            $leaveReq->delete();
            DB::commit();

            return response()->json(['message' => 'Pengajuan cuti berhasil dihapus']);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal menghapus pengajuan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat menghapus pengajuan cuti.',
            ], 500);
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
        $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $kb = Employee::where('jabatan', $likeOp, '%Kepala Balai%')
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
