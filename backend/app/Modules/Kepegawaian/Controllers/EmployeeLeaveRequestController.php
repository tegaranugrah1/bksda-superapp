<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeLeave;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use App\Modules\Surat\Models\SuratKeluar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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

        return DB::transaction(function () use ($employee, $id) {
            Employee::lockForLeaveUpdate($employee->id);
            $leaveReq = EmployeeLeaveRequest::where('employee_id', $employee->id)->lockForUpdate()->findOrFail($id);

            if (! in_array(strtoupper($leaveReq->status), ['PENGAJUAN', 'PENDING'], true)) {
                return response()->json([
                    'message' => 'Hanya permohonan cuti yang masih berstatus PENGAJUAN yang dapat dibatalkan.',
                ], 422);
            }

            $leaveReq->delete();

            return response()->json([
                'message' => 'Permohonan cuti berhasil dibatalkan.',
            ]);
        });
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

        DB::beginTransaction();
        try {
            $employee = Employee::lockForLeaveUpdate($employee->id);
            $leaveType = LeaveType::forEmployee($validated['jenis_cuti'], $employee);
            $validated['jenis_cuti'] = $leaveType->nama;

            $start = Carbon::parse($validated['tanggal_mulai'])->startOfDay();
            $end = Carbon::parse($validated['tanggal_selesai'])->startOfDay();

            if ($start->year !== $end->year) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Pengajuan cuti tidak boleh lintas tahun kalender. Silakan ajukan terpisah per tahun anggaran sesuai PerBKN 24/2017.',
                ], 422);
            }

            if ($start->year < 2000 || $start->year > 2100) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Tahun pengajuan cuti tidak valid.',
                ], 422);
            }

            // Calculate working days or calendar days based on LeaveType configuration
            $jumlahHari = $leaveType->countDays($start, $end);

            if ($jumlahHari < 1) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Rentang tanggal yang dipilih jatuh pada hari libur akhir pekan (0 hari kerja). Silakan pilih tanggal hari kerja aktif.',
                ], 422);
            }

            if ($leaveType && $leaveType->maks_hari && $jumlahHari > $leaveType->maks_hari) {
                DB::rollBack();
                return response()->json([
                    'message' => "Jumlah hari cuti ({$jumlahHari} hari) melebihi batas maksimal untuk jenis cuti {$leaveType->nama} ({$leaveType->maks_hari} hari).",
                ], 422);
            }

            if ($jumlahHari > 365) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Durasi pengajuan cuti tunggal tidak boleh melebihi 365 hari.',
                ], 422);
            }

            $year = $start->year;

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
            $isTahunan = $leaveType->potong_kuota_tahunan;
            if ($isTahunan && $jumlahHari > $availableQuota) {
                $msg = $pendingDays > 0
                    ? "Jumlah hari cuti ({$jumlahHari} hari) melebihi sisa hak cuti tahunan yang belum diajukan ({$availableQuota} hari tersisa dari total {$totalQuota} hari, {$pendingDays} hari sedang dalam proses pengajuan)."
                    : "Jumlah hari cuti ({$jumlahHari} hari) melebihi total sisa cuti tahunan yang tersedia ({$totalQuota} hari).";
                DB::rollBack();
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
                DB::rollBack();
                return response()->json([
                    'message' => 'Anda sudah memiliki permohonan cuti aktif pada rentang tanggal tersebut.',
                ], 422);
            }

            $atasan = $this->getAtasanLangsung($employee->satuan_kerja ?? '');
            $kepalaBalai = $this->getKepalaBalai();

            $leaveReq = EmployeeLeaveRequest::create([
                'employee_id' => $employee->id,
                'nomor_pengajuan' => null, // Saat pengajuan belum ada nomornya dahulu, nanti diisi oleh admin kepegawaian
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

            try {
                app(\App\Services\PortalNotificationService::class)->notifyAdmins(
                    'kepegawaian',
                    'Pengajuan Cuti Baru',
                    "Pengajuan {$leaveReq->jenis_cuti} baru oleh {$employee->nama_lengkap}.",
                    'cuti',
                    'cuti',
                    (string) $leaveReq->id
                );
            } catch (\Throwable $e) {
                // Non-blocking notification failure
            }

            return response()->json([
                'message' => 'Pengajuan Cuti berhasil disimpan!',
                'data' => $leaveReq->load('employee'),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException|\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
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
        $query = EmployeeLeaveRequest::with(['employee', 'suratKeluar'])
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
        $paginated = $query->paginate($perPage)->toArray();

        $baseCountQuery = EmployeeLeaveRequest::query();
        if ($year = (int) $request->input('year')) {
            if ($year >= 2000 && $year <= 2100) {
                $baseCountQuery->whereYear('tanggal_mulai', $year);
            }
        }
        $rawCounts = $baseCountQuery
            ->selectRaw("UPPER(COALESCE(status, 'PENGAJUAN')) as status_key, COUNT(*) as total")
            ->groupByRaw("UPPER(COALESCE(status, 'PENGAJUAN'))")
            ->pluck('total', 'status_key');

        $paginated['summary_counts'] = [
            'all' => (int) $rawCounts->sum(),
            'PENGAJUAN' => (int) (($rawCounts['PENGAJUAN'] ?? 0) + ($rawCounts['PENDING'] ?? 0)),
            'DISETUJUI' => (int) (($rawCounts['DISETUJUI'] ?? 0) + ($rawCounts['APPROVED'] ?? 0)),
            'DITOLAK' => (int) (($rawCounts['DITOLAK'] ?? 0) + ($rawCounts['REJECTED'] ?? 0)),
        ];

        return response()->json($paginated);
    }

    /**
     * Admin View Specific Leave Request Detail
     */
    public function adminShow(int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::with(['employee', 'suratKeluar'])->findOrFail($id);
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
            'catatan_atasan' => 'nullable|string|max:1000',
        ]);

        $newStatus = strtoupper($validated['status']);

        DB::beginTransaction();
        try {
            Employee::lockForLeaveUpdate($leaveReq->employee_id);
            $leaveReq = EmployeeLeaveRequest::lockForUpdate()->findOrFail($id);
            $oldStatus = strtoupper($leaveReq->status);
            $oldNote = $leaveReq->catatan_atasan;
            $isTahunan = $leaveReq->isAnnual();
            $isOldApproved = in_array($oldStatus, ['DISETUJUI', 'APPROVED'], true);
            $isNewApproved = in_array($newStatus, ['DISETUJUI', 'APPROVED'], true);

            if ($isTahunan && $isNewApproved && ! $isOldApproved) {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::forEmployeeYear($leaveReq->employee_id, $year);
                if (! $leaveBalance->exists) {
                    $leaveBalance->save();
                }
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

            $catatanUpdate = array_key_exists('catatan_atasan', $validated) && $validated['catatan_atasan'] !== null
                ? strip_tags(trim($validated['catatan_atasan']))
                : $leaveReq->catatan_atasan;
            if ($isNewApproved && empty($catatanUpdate)) {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
                    ->where('year', $year)
                    ->first();
                $sisaCutiTersedia = $leaveBalance ? $leaveBalance->sisa_cuti_tersedia : 12;
                $catatanUpdate = "Sisa Cuti = {$sisaCutiTersedia} Hari";
            }

            $leaveReq->update([
                'status' => $newStatus,
                'status_pertimbangan_atasan' => $newStatus,
                'status_pertimbangan_pejabat' => $newStatus,
                'catatan_atasan' => $catatanUpdate,
            ]);

            DB::commit();

            try {
                event(new \App\Events\AdminInboxChanged('kepegawaian', 'status_updated', (string) $leaveReq->id));
            } catch (\Throwable $e) {
                // Log and continue gracefully
            }

            try {
                if ($oldStatus !== $newStatus || $oldNote !== $catatanUpdate) {
                    $isApproved = in_array($newStatus, ['DISETUJUI', 'APPROVED'], true);
                    $statusText = $isApproved ? 'Disetujui' : (in_array($newStatus, ['DITOLAK', 'REJECTED'], true) ? 'Ditolak' : $newStatus);
                    $notifTitle = "Permohonan Cuti {$statusText}";
                    $notifMsg = $isApproved
                        ? "Pengajuan {$leaveReq->jenis_cuti} Anda telah disetujui resmi. Surat Izin Resmi dapat langsung dilihat atau dicetak."
                        : "Pengajuan {$leaveReq->jenis_cuti} Anda ({$leaveReq->tanggal_mulai} s/d {$leaveReq->tanggal_selesai}) telah {$statusText}.".(!empty($catatanUpdate) ? " Catatan: {$catatanUpdate}" : '');

                    app(\App\Services\PortalNotificationService::class)->notifyEmployee(
                        $leaveReq->employee_id,
                        $notifTitle,
                        $notifMsg,
                        'cuti',
                        'cuti',
                        (string) $leaveReq->id,
                        ['status' => $newStatus, 'leave_id' => $leaveReq->id]
                    );
                }
            } catch (\Throwable $e) {
                // Log and continue gracefully
            }

            return response()->json([
                'message' => 'Status pengajuan cuti berhasil diperbarui',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal mengubah status pengajuan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memproses permohonan cuti.',
            ], 500);
        }
    }

    /**
     * Admin Approve Leave Request with optional scan file upload & optional official number update
     */
    public function adminApprove(Request $request, int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::findOrFail($id);

        $validated = $request->validate([
            'file_scan_formulir' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
            'file_scan_surat_izin' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
            'file_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
            'nomor_surat' => 'nullable|string|max:255',
            'catatan_atasan' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            Employee::lockForLeaveUpdate($leaveReq->employee_id);
            $leaveReq = EmployeeLeaveRequest::lockForUpdate()->findOrFail($id);
            $oldStatus = strtoupper($leaveReq->status);
            $newStatus = 'DISETUJUI';
            $isTahunan = $leaveReq->isAnnual();
            $isOldApproved = in_array($oldStatus, ['DISETUJUI', 'APPROVED'], true);

            if ($isTahunan && !$isOldApproved) {
                $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::forEmployeeYear($leaveReq->employee_id, $year);
                if (! $leaveBalance->exists) {
                    $leaveBalance->save();
                }

                if ($leaveReq->jumlah_hari > $leaveBalance->sisa_cuti_tersedia) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Saldo cuti tidak mencukupi',
                        'message' => "Sisa hak cuti pegawai hanya tersisa {$leaveBalance->sisa_cuti_tersedia} hari, tidak mencukupi untuk permohonan {$leaveReq->jumlah_hari} hari.",
                    ], 422);
                }
                $leaveBalance->increment('cuti_terpakai_n0', $leaveReq->jumlah_hari);
            }

            $updateData = [
                'status' => $newStatus,
                'status_pertimbangan_atasan' => $newStatus,
                'status_pertimbangan_pejabat' => $newStatus,
            ];

            if (!empty($validated['nomor_surat'])) {
                $updateData['nomor_pengajuan'] = strip_tags(trim($validated['nomor_surat']));
            }

            if (isset($validated['catatan_atasan'])) {
                $updateData['catatan_atasan'] = strip_tags(trim($validated['catatan_atasan']));
            }

            $updateData = array_merge($updateData, $this->storeLeaveScanFiles($request, $leaveReq));

            $leaveReq->fill($updateData);
            $notificationChanged = $leaveReq->isDirty(array_keys($updateData));
            $leaveReq->save();

            DB::commit();

            if (!empty($updateData['scan_surat_izin_path'])) {
                \App\Jobs\ArchiveOfficialDocument::dispatch(
                    'cuti',
                    $leaveReq->id,
                    'local',
                    $updateData['scan_surat_izin_path'],
                    $updateData['scan_surat_izin_nama'] ?? null,
                    null,
                    $leaveReq->employee?->user?->id ?? Auth::id()
                );
            }

            try {
                event(new \App\Events\AdminInboxChanged('kepegawaian', 'approved', (string) $leaveReq->id));
            } catch (\Throwable $e) {
                // Log and continue gracefully
            }

            try {
                if ($notificationChanged) {
                    $notifTitle = 'Permohonan Cuti Disetujui';
                    $notifMsg = "Pengajuan {$leaveReq->jenis_cuti} Anda telah disetujui resmi. Surat Izin Resmi dapat langsung dilihat atau dicetak.";

                    app(\App\Services\PortalNotificationService::class)->notifyEmployee(
                        $leaveReq->employee_id,
                        $notifTitle,
                        $notifMsg,
                        'cuti',
                        'cuti',
                        (string) $leaveReq->id,
                        ['status' => 'DISETUJUI', 'leave_id' => $leaveReq->id]
                    );
                }
            } catch (\Throwable $e) {
                // Log and continue gracefully
            }

            return response()->json([
                'message' => 'Permohonan cuti berhasil disetujui.',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal menyetujui pengajuan cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat menyetujui permohonan cuti.',
            ], 500);
        }
    }

    /**
     * Admin Upload / Replace Scan on existing leave request
     */
    public function adminUploadScan(Request $request, int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::findOrFail($id);

        $request->validate([
            'file_scan_formulir' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
            'file_scan_surat_izin' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
            'file_scan' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
        ]);

        if (!$request->hasFile('file_scan_formulir') && !$request->hasFile('file_scan_surat_izin') && !$request->hasFile('file_scan')) {
            return response()->json(['message' => 'Pilih setidaknya satu berkas scan untuk diunggah.'], 422);
        }

        DB::beginTransaction();
        try {
            Employee::lockForLeaveUpdate($leaveReq->employee_id);
            $leaveReq = EmployeeLeaveRequest::lockForUpdate()->findOrFail($id);
            $updateData = $this->storeLeaveScanFiles($request, $leaveReq);
            $leaveReq->update($updateData);

            DB::commit();

            if (!empty($updateData['scan_surat_izin_path'])) {
                \App\Jobs\ArchiveOfficialDocument::dispatch(
                    'cuti',
                    $leaveReq->id,
                    'local',
                    $updateData['scan_surat_izin_path'],
                    $updateData['scan_surat_izin_nama'] ?? null,
                    null,
                    $leaveReq->employee?->user?->id ?? Auth::id()
                );
            }

            return response()->json([
                'message' => 'Berkas scan surat cuti berhasil diunggah.',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal mengunggah berkas scan',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat mengunggah berkas.',
            ], 500);
        }
    }

    /**
     * Store uploaded formulir / surat izin scan files and clean up replaced files.
     */
    private function storeLeaveScanFiles(Request $request, EmployeeLeaveRequest $leaveReq): array
    {
        $updateData = [];
        if ($request->hasFile('file_scan_formulir')) {
            $fileFormulir = $request->file('file_scan_formulir');
            if ($leaveReq->scan_formulir_path && Storage::disk('local')->exists($leaveReq->scan_formulir_path)) {
                Storage::disk('local')->delete($leaveReq->scan_formulir_path);
            }
            $updateData['scan_formulir_path'] = Storage::disk('local')->putFile('cuti_scans/formulir', $fileFormulir);
            $updateData['scan_formulir_nama'] = basename(str_replace('\\', '/', $fileFormulir->getClientOriginalName()));
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
            $safeOrigName = basename(str_replace('\\', '/', $suratIzinFile->getClientOriginalName()));
            $updateData['scan_surat_izin_path'] = $path;
            $updateData['scan_surat_izin_nama'] = $safeOrigName;
            $updateData['scan_surat_path'] = $path;
            $updateData['scan_surat_nama'] = $safeOrigName;
        }

        if (! empty($updateData)) {
            $updateData['scan_surat_uploaded_at'] = Carbon::now();
            $updateData['scan_surat_uploaded_by'] = Auth::id();
        }

        return $updateData;
    }

    /**
     * Helper to return file response (inline/preview JSON base64 or binary stream)
     */
    private function respondScanFile(?Request $request, string $path, string $nama)
    {
        $disk = Storage::disk('local');
        if (!$path || !$disk->exists($path)) {
            return response()->json(['message' => 'Berkas scan cuti belum diunggah atau tidak ditemukan.'], 404);
        }

        $request = $request ?: request();

        $safeName = basename(str_replace('\\', '/', $nama));
        $safeName = preg_replace('/[^\x20-\x7E]/', '_', $safeName);
        $safeName = str_replace(['"', "\r", "\n", '/', '\\', ';'], '_', $safeName);
        $safeName = trim($safeName) ?: 'berkas_cuti.pdf';

        $rawMime = strtolower((string) ($disk->mimeType($path) ?: 'application/pdf'));
        $mime = ($rawMime === 'application/pdf' || in_array($rawMime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true))
            ? $rawMime
            : 'application/pdf';

        // Mode pratinjau (JSON base64 data_url) - mencegah download otomatis & hook IDM
        if ($request && ($request->query('preview') || $request->wantsJson())) {
            return response()->json([
                'mime_type' => $mime,
                'file_name' => $safeName,
                'data_url' => "data:{$mime};base64," . base64_encode($disk->get($path)),
            ], 200, ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']);
        }

        return $disk->response($path, $safeName, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . $safeName . '"',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function respondLeaveScan(?Request $request, EmployeeLeaveRequest $leaveReq, string $mode)
    {
        if ($mode === 'formulir') {
            if (! $leaveReq->scan_formulir_path) {
                return response()->json(['message' => 'Berkas scan formulir cuti belum diunggah atau tidak ditemukan.'], 404);
            }
            return $this->respondScanFile($request, $leaveReq->scan_formulir_path, $leaveReq->scan_formulir_nama ?: "Formulir_Cuti_{$leaveReq->id}.pdf");
        }

        $path = $leaveReq->scan_surat_izin_path ?: $leaveReq->scan_surat_path;
        $nama = $leaveReq->scan_surat_izin_nama ?: ($leaveReq->scan_surat_nama ?: "Surat_Izin_{$leaveReq->id}.pdf");

        if ($mode === 'surat_izin') {
            return $path
                ? $this->respondScanFile($request, $path, $nama)
                : response()->json(['message' => 'Berkas surat izin cuti resmi belum diunggah atau tidak ditemukan.'], 404);
        }

        if ($path) {
            return $this->respondScanFile($request, $path, $nama);
        }
        if ($leaveReq->scan_formulir_path) {
            return $this->respondScanFile($request, $leaveReq->scan_formulir_path, $leaveReq->scan_formulir_nama ?: "Formulir_Cuti_{$leaveReq->id}.pdf");
        }
        return response()->json(['message' => 'Berkas scan cuti belum diunggah atau tidak ditemukan.'], 404);
    }

    private function findMyLeaveRequest(Request $request, int $id): EmployeeLeaveRequest|JsonResponse
    {
        $employee = Employee::where('nip', $request->user()?->username)->first();
        if (! $employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan.'], 403);
        }

        return EmployeeLeaveRequest::where('id', $id)
            ->where('employee_id', $employee->id)
            ->firstOrFail();
    }

    /**
     * Admin View Scan Formulir
     */
    public function adminViewScanFormulir($requestOrId, $optionalId = null)
    {
        $request = $requestOrId instanceof Request ? $requestOrId : request();
        $id = $requestOrId instanceof Request ? (int) $optionalId : (int) $requestOrId;
        return $this->respondLeaveScan($request, EmployeeLeaveRequest::findOrFail($id), 'formulir');
    }

    /**
     * Admin View Scan Surat Izin Resmi
     */
    public function adminViewScanSuratIzin($requestOrId, $optionalId = null)
    {
        $request = $requestOrId instanceof Request ? $requestOrId : request();
        $id = $requestOrId instanceof Request ? (int) $optionalId : (int) $requestOrId;
        return $this->respondLeaveScan($request, EmployeeLeaveRequest::findOrFail($id), 'surat_izin');
    }

    /**
     * Admin View / Stream Scan File (defaults to Surat Izin, fallback to Formulir)
     */
    public function adminViewScan($requestOrId, $optionalId = null)
    {
        $request = $requestOrId instanceof Request ? $requestOrId : request();
        $id = $requestOrId instanceof Request ? (int) $optionalId : (int) $requestOrId;
        return $this->respondLeaveScan($request, EmployeeLeaveRequest::findOrFail($id), 'any');
    }

    /**
     * Portal Employee View Scan Formulir (Strict Ownership Protected)
     */
    public function myViewScanFormulir(Request $request, int $id)
    {
        $leaveReq = $this->findMyLeaveRequest($request, $id);
        return $leaveReq instanceof JsonResponse ? $leaveReq : $this->respondLeaveScan($request, $leaveReq, 'formulir');
    }

    /**
     * Portal Employee View Scan Surat Izin Resmi (Strict Ownership Protected)
     */
    public function myViewScanSuratIzin(Request $request, int $id)
    {
        $leaveReq = $this->findMyLeaveRequest($request, $id);
        return $leaveReq instanceof JsonResponse ? $leaveReq : $this->respondLeaveScan($request, $leaveReq, 'surat_izin');
    }

    /**
     * Portal Employee View / Stream Scan File
     */
    public function myViewScan(Request $request, int $id)
    {
        $leaveReq = $this->findMyLeaveRequest($request, $id);
        return $leaveReq instanceof JsonResponse ? $leaveReq : $this->respondLeaveScan($request, $leaveReq, 'any');
    }

    /**
     * Admin Edit Leave Request Details
     */
    public function adminUpdate(Request $request, int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::findOrFail($id);

        $validated = $request->validate([
            'nomor_pengajuan' => 'nullable|string|max:255',
            'jenis_cuti' => 'required|string|max:150',
            'alasan_cuti' => 'required|string|max:1000',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'alamat_menjalankan_cuti' => 'required|string|max:500',
            'telepon' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]+$/'],
            'masa_kerja' => 'nullable|string|max:100',
        ]);

        $start = Carbon::parse($validated['tanggal_mulai'])->startOfDay();
        $end = Carbon::parse($validated['tanggal_selesai'])->startOfDay();

        DB::beginTransaction();
        try {
            $employee = Employee::lockForLeaveUpdate($leaveReq->employee_id);
            $leaveReq = EmployeeLeaveRequest::lockForUpdate()->findOrFail($id);
            $leaveType = LeaveType::forEmployee(
                $validated['jenis_cuti'],
                $employee
            );
            $validated['jenis_cuti'] = $leaveType->nama;

            if ($start->year !== $end->year) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Pengajuan cuti tidak boleh lintas tahun kalender. Silakan sesuaikan per tahun anggaran sesuai PerBKN 24/2017.',
                ], 422);
            }

            if ($start->year < 2000 || $start->year > 2100) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Tahun pengajuan cuti tidak valid.',
                ], 422);
            }

            $newJumlahHari = $leaveType->countDays($start, $end);

            if ($newJumlahHari < 1) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Rentang tanggal yang dipilih jatuh pada hari libur akhir pekan (0 hari kerja). Silakan pilih tanggal hari kerja aktif.',
                ], 422);
            }

            if ($leaveType && $leaveType->maks_hari && $newJumlahHari > $leaveType->maks_hari) {
                DB::rollBack();
                return response()->json([
                    'message' => "Jumlah hari cuti ({$newJumlahHari} hari) melebihi batas maksimal untuk jenis cuti {$leaveType->nama} ({$leaveType->maks_hari} hari).",
                ], 422);
            }

            if ($newJumlahHari > 365) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Durasi pengajuan cuti tunggal tidak boleh melebihi 365 hari.',
                ], 422);
            }

            $oldJumlahHari = $leaveReq->jumlah_hari;
            $oldIsTahunan = $leaveReq->isAnnual();
            $newIsTahunan = $leaveType->potong_kuota_tahunan;

            if ($oldIsTahunan && in_array(strtoupper($leaveReq->status), ['DISETUJUI', 'APPROVED'], true)) {
                $oldYear = Carbon::parse($leaveReq->tanggal_mulai)->year;
                $leaveBalance = EmployeeLeave::forEmployeeYear($leaveReq->employee_id, $oldYear);
                $leaveBalance->fill(['cuti_terpakai_n0' => max(0, (int) $leaveBalance->cuti_terpakai_n0 - $oldJumlahHari)])->save();
            }

            $updateFields = [
                'jenis_cuti' => strip_tags(trim($validated['jenis_cuti'])),
                'alasan_cuti' => strip_tags(trim($validated['alasan_cuti'])),
                'jumlah_hari' => $newJumlahHari,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'alamat_menjalankan_cuti' => strip_tags(trim($validated['alamat_menjalankan_cuti'])),
                'telepon' => isset($validated['telepon']) ? strip_tags(trim($validated['telepon'])) : null,
                'masa_kerja' => isset($validated['masa_kerja']) ? strip_tags(trim($validated['masa_kerja'])) : $leaveReq->masa_kerja,
            ];
            if (array_key_exists('nomor_pengajuan', $validated)) {
                $updateFields['nomor_pengajuan'] = !empty($validated['nomor_pengajuan']) ? strip_tags(trim($validated['nomor_pengajuan'])) : null;
            }

            if ($newIsTahunan && in_array(strtoupper($leaveReq->status), ['DISETUJUI', 'APPROVED'], true)) {
                $newYear = Carbon::parse($validated['tanggal_mulai'])->year;
                $leaveBalance = EmployeeLeave::forEmployeeYear($leaveReq->employee_id, $newYear);
                if (! $leaveBalance->exists) {
                    $leaveBalance->save();
                }
                if ($newJumlahHari > $leaveBalance->sisa_cuti_tersedia) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Saldo cuti tidak mencukupi',
                        'message' => "Sisa hak cuti pegawai hanya tersisa {$leaveBalance->sisa_cuti_tersedia} hari, tidak mencukupi untuk permohonan {$newJumlahHari} hari.",
                    ], 422);
                }
                $leaveBalance->increment('cuti_terpakai_n0', $newJumlahHari);
            }

            $leaveReq->update($updateFields);

            DB::commit();

            return response()->json([
                'message' => 'Pengajuan cuti berhasil diperbarui',
                'data' => $leaveReq->fresh('employee'),
            ]);
        } catch (\Illuminate\Validation\ValidationException|\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
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
            Employee::lockForLeaveUpdate($leaveReq->employee_id);
            $leaveReq = EmployeeLeaveRequest::lockForUpdate()->findOrFail($id);
            $isTahunan = $leaveReq->isAnnual();

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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
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

    /**
     * Preview Data & Suggested Auto Number for Surat Izin Cuti Resmi
     */
    /**
     * Teks tahun akumulasi cuti tahunan (N-2, N-1, N) untuk butir 1 Surat Izin Cuti
     */
    private function resolveTahunCutiText(EmployeeLeaveRequest $leaveReq): ?string
    {
        if (! $leaveReq->isAnnual()) {
            return null;
        }

        $currentN = (int) Carbon::parse($leaveReq->tanggal_mulai)->year;
        $sisaN1 = (int) ($leaveReq->sisa_n1 ?? 0);
        $sisaN2 = (int) ($leaveReq->sisa_n2 ?? 0);

        if ($sisaN1 === 0 && $sisaN2 === 0) {
            $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)->where('year', $currentN)->first();
            $sisaN1 = (int) ($leaveBalance->hak_n1_diakui ?? 0);
            $sisaN2 = (int) ($leaveBalance->hak_n2_diakui ?? 0);
        }

        $years = [];
        if ($sisaN2 > 0) {
            $years[] = "tahun " . ($currentN - 2);
        }
        if ($sisaN1 > 0) {
            $years[] = "tahun " . ($currentN - 1);
        }

        if (empty($years)) {
            return null;
        }

        $years[] = "tahun " . $currentN;
        if (count($years) === 2) {
            return "untuk " . $years[0] . " dan " . $years[1];
        }

        $last = array_pop($years);
        return "untuk " . implode(', ', $years) . " dan " . $last;
    }

    public function previewSuratIzin(int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::with('employee')->findOrFail($id);

        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->format('m');

        // Check if there's already an existing nomor or SuratKeluar
        $existingNomor = $leaveReq->nomor_pengajuan;
        $suratKeluar = $leaveReq->surat_keluar_id ? SuratKeluar::find($leaveReq->surat_keluar_id) : null;
        if ($suratKeluar && $suratKeluar->no_surat) {
            $existingNomor = $suratKeluar->no_surat;
        }

        // Calculate next sequence for SI in this current year
        $existingCount = DB::table('surat_keluar')
            ->whereYear('tanggal_surat', $currentYear)
            ->where(function ($q) {
                $q->where('template_type', 'surat_izin_cuti')
                  ->orWhere('no_surat', 'like', 'SI.%');
            })
            ->count();

        $leaveCount = DB::table('kpg_employee_leave_requests')
            ->whereYear('created_at', $currentYear)
            ->where('nomor_pengajuan', 'like', 'SI.%')
            ->where('id', '!=', $id)
            ->count();

        $seq = max($existingCount, $leaveCount) + 1;
        $suggestedNomor = "SI.{$seq}/K.18/TU/PEG.11.01/B/{$currentMonth}/{$currentYear}";

        $defaultComponents = [
            'nomor_urut' => (string) $seq,
            'kode_unit' => '/K.18/TU/',
            'klasifikasi' => 'PEG.11.01',
            'bulan_tahun' => "/B/{$currentMonth}/{$currentYear}",
        ];

        $activeComponents = $defaultComponents;
        if ($existingNomor) {
            if (preg_match('/^SI\.?\s*(\d*)\s*(\/[^\/]+\/[^\/]+\/)\s*([A-Za-z0-9\.]+)\s*(\/B\/[^\/]+\/[^\/]+)/i', $existingNomor, $m)) {
                $activeComponents = [
                    'nomor_urut' => $m[1],
                    'kode_unit' => $m[2],
                    'klasifikasi' => $m[3],
                    'bulan_tahun' => $m[4],
                ];
            } elseif (preg_match('/^SI\.?\s*([^\/\s]+)\s*(\/[^\/]+\/[^\/]+\/)?\s*([A-Za-z0-9\.]+)?\s*(\/B\/.+)?/i', $existingNomor, $m)) {
                $activeComponents = [
                    'nomor_urut' => $m[1] ?: (string) $seq,
                    'kode_unit' => $m[2] ?: '/K.18/TU/',
                    'klasifikasi' => $m[3] ?: 'PEG.11.01',
                    'bulan_tahun' => $m[4] ?: "/B/{$currentMonth}/{$currentYear}",
                ];
            }
        }

        $existingTanggalSurat = null;
        if ($leaveReq->surat_keluar_id) {
            $sk = SuratKeluar::find($leaveReq->surat_keluar_id);
            if ($sk && $sk->tanggal_surat) {
                $existingTanggalSurat = Carbon::parse($sk->tanggal_surat)->format('Y-m-d');
            }
        }

        $kepalaBalai = $this->getKepalaBalai();
        $terbilangHari = $this->terbilang((int) $leaveReq->jumlah_hari);

        $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
        $leaveBalance = EmployeeLeave::where('employee_id', $leaveReq->employee_id)
            ->where('year', $year)
            ->first();

        $currentAvailable = $leaveBalance ? $leaveBalance->sisa_cuti_tersedia : 12;
        $isTahunan = $leaveReq->isAnnual();
        $isOldApproved = in_array(strtoupper($leaveReq->status), ['DISETUJUI', 'APPROVED'], true);

        // Jika belum disetujui dan cuti tahunan, sisa cuti setelah disetujui berkurang jumlah_hari
        $sisaCutiSetelahDisetujui = ($isTahunan && !$isOldApproved)
            ? max(0, $currentAvailable - (int) $leaveReq->jumlah_hari)
            : $currentAvailable;

        $defaultCatatan = "Sisa Cuti = {$sisaCutiSetelahDisetujui} Hari";

        return response()->json([
            'suggested_nomor' => $existingNomor ?: $suggestedNomor,
            'default_nomor' => $suggestedNomor,
            'suggested_tanggal_surat' => $existingTanggalSurat ?: Carbon::now()->format('Y-m-d'),
            'default_catatan' => $defaultCatatan,
            'sisa_cuti' => $sisaCutiSetelahDisetujui,
            'components' => $activeComponents,
            'default_components' => $defaultComponents,
            'is_already_generated' => (bool) $leaveReq->surat_keluar_id,
            'surat_keluar_id' => $leaveReq->surat_keluar_id,
            'request' => $leaveReq,
            'terbilang_hari' => $terbilangHari,
            'kepala_balai' => $kepalaBalai,
            'tahun_cuti_text' => $this->resolveTahunCutiText($leaveReq),
        ]);
    }

    /**
     * Generate or Regenerate Surat Izin Cuti Resmi (SuratKeluar)
     */
    public function generateSuratIzin(Request $request, int $id): JsonResponse
    {
        $leaveReq = EmployeeLeaveRequest::with('employee')->findOrFail($id);

        $validated = $request->validate([
            'nomor_surat' => 'required|string|max:255',
            'catatan_atasan' => 'nullable|string|max:1000',
            'klasifikasi' => 'nullable|string|max:50',
            'tanggal_surat' => 'nullable|date',
        ]);

        $nomorSurat = strip_tags(trim($validated['nomor_surat']));

        DB::beginTransaction();
        try {
            Employee::lockForLeaveUpdate($leaveReq->employee_id);
            $leaveReq = EmployeeLeaveRequest::with('employee')->lockForUpdate()->findOrFail($id);
            $oldStatus = strtoupper($leaveReq->status);
            $newStatus = 'DISETUJUI';
            $isTahunan = $leaveReq->isAnnual();
            $isOldApproved = in_array($oldStatus, ['DISETUJUI', 'APPROVED'], true);

            $year = Carbon::parse($leaveReq->tanggal_mulai)->year;
            $leaveBalance = EmployeeLeave::forEmployeeYear($leaveReq->employee_id, $year);
            if (! $leaveBalance->exists) {
                $leaveBalance->save();
            }

            // If not already approved and is Cuti Tahunan, deduct quota
            if ($isTahunan && !$isOldApproved) {
                if ($leaveReq->jumlah_hari > $leaveBalance->sisa_cuti_tersedia) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Saldo cuti tidak mencukupi',
                        'message' => "Sisa hak cuti pegawai hanya tersisa {$leaveBalance->sisa_cuti_tersedia} hari, tidak mencukupi untuk permohonan {$leaveReq->jumlah_hari} hari.",
                    ], 422);
                }
                $leaveBalance->increment('cuti_terpakai_n0', $leaveReq->jumlah_hari);
            }

            // Hitung sisa cuti setelah disetujui untuk default catatan jika catatan kosong
            $sisaCutiTersedia = $leaveBalance->fresh()->sisa_cuti_tersedia;
            $fallbackCatatan = "Sisa Cuti = {$sisaCutiTersedia} Hari";

            $inputCatatan = isset($validated['catatan_atasan']) ? strip_tags(trim($validated['catatan_atasan'])) : null;
            $existingCatatan = $leaveReq->catatan_atasan ? trim($leaveReq->catatan_atasan) : null;
            $catatan = !empty($inputCatatan) ? $inputCatatan : (!empty($existingCatatan) ? $existingCatatan : $fallbackCatatan);

            $kepalaBalai = $this->getKepalaBalai();
            $terbilangHari = $this->terbilang((int) $leaveReq->jumlah_hari);

            $tglSuratCarbon = !empty($validated['tanggal_surat'])
                ? Carbon::parse($validated['tanggal_surat'])
                : Carbon::now();

            $tglMulaiFormatted = Carbon::parse($leaveReq->tanggal_mulai)->translatedFormat('d F Y');
            $tglSelesaiFormatted = Carbon::parse($leaveReq->tanggal_selesai)->translatedFormat('d F Y');
            $tglSuratFormatted = $tglSuratCarbon->translatedFormat('d F Y');

            // Find Kepala Balai employee id for penandatangan_id if available
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $kbEmployee = Employee::where('jabatan', $likeOp, '%Kepala Balai%')
                ->where('is_active', true)
                ->first();

            $payload = [
                'templateType' => 'surat_izin_cuti',
                'nomor' => $nomorSurat,
                'kotaTanggal' => 'Samarinda, ' . $tglSuratFormatted,
                'jenisCuti' => $leaveReq->jenis_cuti,
                'jumlahHari' => $leaveReq->jumlah_hari,
                'terbilangHari' => $terbilangHari,
                'tanggalMulai' => $tglMulaiFormatted,
                'tanggalSelesai' => $tglSelesaiFormatted,
                'tahunCutiText' => $this->resolveTahunCutiText($leaveReq),
                'pegawai' => [
                    'nama' => $leaveReq->employee ? $leaveReq->employee->nama_lengkap : '-',
                    'nip' => $leaveReq->employee ? $leaveReq->employee->nip : '-',
                    'pangkatGol' => $leaveReq->employee ? ($leaveReq->employee->pangkat_golongan ?? '-') : '-',
                    'jabatan' => $leaveReq->employee ? ($leaveReq->employee->jabatan ?? '-') : '-',
                    'satuanKerja' => 'Balai Konservasi Sumber Daya Alam Kalimantan Timur',
                ],
                'jabatanPenandatangan' => 'Kepala Balai,',
                'namaPenandatangan' => $kepalaBalai['nama'],
                'nipPenandatangan' => $kepalaBalai['nip'],
                'paragraf' => [],
                'tembusan' => [],
            ];

            // Create or update SuratKeluar
            $suratKeluar = ($leaveReq->surat_keluar_id ? SuratKeluar::find($leaveReq->surat_keluar_id) : null) ?? new SuratKeluar();

            $kodeKlasifikasi = !empty($validated['klasifikasi'])
                ? strip_tags(trim($validated['klasifikasi']))
                : 'PEG.11.01';

            $suratKeluar->fill([
                'no_surat' => $nomorSurat,
                'kode_klasifikasi' => $kodeKlasifikasi,
                'tanggal_surat' => $tglSuratCarbon->format('Y-m-d'),
                'tujuan_surat' => $leaveReq->employee ? $leaveReq->employee->nama_lengkap : 'Pegawai Balai KSDA',
                'perihal' => 'Surat Izin ' . $leaveReq->jenis_cuti . ' - ' . ($leaveReq->employee ? $leaveReq->employee->nama_lengkap : ''),
                'sifat' => 'Biasa',
                'template_type' => 'surat_izin_cuti',
                'status' => 'signed',
                'document_payload' => $payload,
                'penandatangan_id' => $kbEmployee ? $kbEmployee->id : null,
                'created_by' => Auth::id() ?: 1,
            ]);
            $suratKeluar->save();

            $previousApproval = [$leaveReq->status, $leaveReq->nomor_pengajuan, $leaveReq->catatan_atasan, $leaveReq->surat_keluar_id];
            // Update EmployeeLeaveRequest
            $leaveReq->update([
                'status' => $newStatus,
                'status_pertimbangan_atasan' => $newStatus,
                'status_pertimbangan_pejabat' => $newStatus,
                'nomor_pengajuan' => $nomorSurat,
                'surat_keluar_id' => $suratKeluar->id,
                'catatan_atasan' => $catatan,
            ]);

            $notificationChanged = $previousApproval !== [$leaveReq->status, $leaveReq->nomor_pengajuan, $leaveReq->catatan_atasan, $leaveReq->surat_keluar_id]
                || $suratKeluar->wasRecentlyCreated
                || $suratKeluar->wasChanged(array_diff(array_keys($suratKeluar->getAttributes()), ['created_at', 'updated_at']));
            DB::commit();

            try {
                event(new \App\Events\AdminInboxChanged('kepegawaian', 'approved', (string) $leaveReq->id));
            } catch (\Throwable $e) {
                // Log and continue gracefully
            }

            try {
                if ($notificationChanged) {
                    $notifTitle = 'Permohonan Cuti Disetujui';
                    $notifMsg = "Pengajuan {$leaveReq->jenis_cuti} Anda telah disetujui resmi. Surat Izin Resmi dapat langsung dilihat atau dicetak.".($nomorSurat ? " (Nomor: {$nomorSurat})" : '');

                    app(\App\Services\PortalNotificationService::class)->notifyEmployee(
                        $leaveReq->employee_id,
                        $notifTitle,
                        $notifMsg,
                        'cuti',
                        'cuti',
                        (string) $leaveReq->id,
                        ['status' => 'DISETUJUI', 'leave_id' => $leaveReq->id, 'nomor_surat' => $nomorSurat]
                    );
                }
            } catch (\Throwable $e) {
                // Log and continue gracefully
            }

            return response()->json([
                'message' => 'Surat Izin Cuti Resmi berhasil diterbitkan!',
                'data' => $leaveReq->fresh(['employee', 'suratKeluar']),
                'surat_keluar_id' => $suratKeluar->id,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal menerbitkan surat izin cuti',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem.',
            ], 500);
        }
    }

    /**
     * Minimal Terbilang Helper (Indonesian Numbers)
     */
    private function terbilang(int $angka): string
    {
        $bilang = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
        if ($angka < 12) {
            return $bilang[$angka] ?? (string) $angka;
        } elseif ($angka < 20) {
            return $this->terbilang($angka - 10) . ' belas';
        } elseif ($angka < 100) {
            return $this->terbilang((int) ($angka / 10)) . ' puluh' . ($angka % 10 ? ' ' . $this->terbilang($angka % 10) : '');
        } elseif ($angka < 200) {
            return 'seratus' . ($angka - 100 ? ' ' . $this->terbilang($angka - 100) : '');
        } elseif ($angka < 1000) {
            return $this->terbilang((int) ($angka / 100)) . ' ratus' . ($angka % 100 ? ' ' . $this->terbilang($angka % 100) : '');
        }
        return (string) $angka;
    }
}
