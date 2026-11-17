<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
use App\Modules\Kepegawaian\Models\MealAllowanceItem;
use App\Modules\Kepegawaian\Requests\EmployeeRequest;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    /**
     * Rule 3.1: Wajib Pagination dan Search
     */
    public function index(Request $request): JsonResponse
    {
        $baseQuery = Employee::query()
            ->with([
                'location:id,parent_id,location_type,unit_kerja,name,code,is_restricted',
                'location.parent:id,unit_kerja,name,location_type,code',
            ])
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->where('nama_lengkap', 'NOT LIKE', '%admin%')
            ->where('nama_lengkap', 'NOT LIKE', '%magang%')
            ->where('nama_lengkap', 'NOT LIKE', '%superadmin%')
            ->where(function ($q) {
                $q->whereNull('satuan_kerja')
                    ->orWhere('satuan_kerja', 'NOT LIKE', '%pusat%');
            });

        $canViewTrashed = (bool) $request->user()?->isAdminFor('kepegawaian');

        $counts = [
            'total' => (clone $baseQuery)->count(),
            'active' => (clone $baseQuery)->effectiveActive()->count(),
            'pns' => (clone $baseQuery)->effectiveActive()->ofJenis('PNS')->count(),
            'pppk' => (clone $baseQuery)->effectiveActive()->ofJenis('PPPK')->count(),
            'mmp' => (clone $baseQuery)->effectiveActive()->ofJenis('MMP')->count(),
            'scheduled' => (clone $baseQuery)->scheduledInactive()->count(),
            'pensiun' => (clone $baseQuery)->where('inactive_reason', 'pensiun')->count(),
            'inactive' => (clone $baseQuery)->where('is_active', false)->count(),
            'trashed' => $canViewTrashed ? (clone $baseQuery)->onlyTrashed()->count() : 0,
        ];

        $rawStatus = $request->input('status', '');
        $statusFilter = is_string($rawStatus) ? strtolower(trim($rawStatus)) : '';
        $wantsTrashed = $statusFilter === 'trashed' || $request->boolean('trashed');
        if ($wantsTrashed && ! $canViewTrashed) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data pegawai terhapus.');
        }
        $isTrashedView = $canViewTrashed && $wantsTrashed;

        $query = clone $baseQuery;
        if ($isTrashedView) {
            $query->onlyTrashed();
        } elseif ($statusFilter === 'all') {
            // Tampilkan semua (aktif dan nonaktif) jika diminta eksplisit
        } elseif ($statusFilter === 'scheduled') {
            $query->scheduledInactive();
        } elseif ($statusFilter === 'pensiun') {
            $query->where('inactive_reason', 'pensiun');
        } elseif ($statusFilter === 'inactive') {
            $query->where('is_active', false);
        } elseif ($request->has('is_active') && ! $request->has('status')) {
            $query->where('is_active', $request->boolean('is_active'));
        } else {
            // Default (tanpa status atau status=active): hanya pegawai efektif aktif
            $query->effectiveActive();
        }

        $rawJenis = $request->input('jenis_pegawai', '');
        $jenisPegawai = is_string($rawJenis) ? strtoupper(trim($rawJenis)) : '';
        if (in_array($jenisPegawai, ['PNS', 'PPPK', 'P3K', 'MMP'], true)) {
            $query->ofJenis($jenisPegawai);
        }

        $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
        $escapeLike = static fn (string $value): string => '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $value) . '%';
        $rawWilayah = $request->input('wilayah', '');
        $wilayah = is_string($rawWilayah) ? trim($rawWilayah) : '';
        if ($wilayah !== '') {
            $slugMap = [
                'BALAI' => 'balai-samarinda',
                'SKW_1' => 'skw-1-berau',
                'SKW_2' => 'skw-2-tenggarong',
                'SKW_3' => 'skw-3-balikpapan',
            ];

            if (\Illuminate\Support\Str::isUuid($wilayah)) {
                $childLocIds = \App\Modules\Bmn\Models\Location::where('parent_id', $wilayah)->pluck('id')->all();
                $allLocIds = array_merge([$wilayah], $childLocIds);
                $query->whereIn('location_id', $allLocIds);
            } elseif (isset($slugMap[$wilayah])) {
                $slug = $slugMap[$wilayah];
                $parentLoc = \App\Modules\Bmn\Models\Location::where('code', $slug)->first();
                $locIds = $parentLoc
                    ? array_merge([$parentLoc->id], $parentLoc->children()->pluck('id')->all())
                    : [];

                $query->where(function ($q) use ($wilayah, $likeOp, $locIds) {
                    if (! empty($locIds)) {
                        $q->whereIn('location_id', $locIds);
                    }
                    if ($wilayah === 'BALAI') {
                        $q->orWhere(function ($sub) use ($likeOp) {
                            $sub->where('satuan_kerja', $likeOp, '%balai%')
                                ->orWhere('satuan_kerja', $likeOp, '%tata usaha%')
                                ->orWhere(function ($s2) use ($likeOp) {
                                    $s2->where('satuan_kerja', $likeOp, '%samarinda%')
                                        ->where(function ($r) {
                                            $r->whereNull('resor')->orWhere('resor', '!=', 'resor_05');
                                        });
                                });
                        });
                    } elseif ($wilayah === 'SKW_1') {
                        $q->orWhere('satuan_kerja', $likeOp, '%wilayah i %')
                            ->orWhere('satuan_kerja', $likeOp, '%wilayah i')
                            ->orWhere('satuan_kerja', $likeOp, '%wil i%')
                            ->orWhere('satuan_kerja', $likeOp, '%skw i %')
                            ->orWhere('satuan_kerja', $likeOp, '%skw i')
                            ->orWhere('satuan_kerja', $likeOp, '%wilayah 1%')
                            ->orWhere('satuan_kerja', $likeOp, '%berau%')
                            ->orWhereIn('resor', ['resor_01', 'resor_02', 'resor_03']);
                    } elseif ($wilayah === 'SKW_2') {
                        $q->orWhere('satuan_kerja', $likeOp, '%wilayah ii %')
                            ->orWhere('satuan_kerja', $likeOp, '%wilayah ii')
                            ->orWhere('satuan_kerja', $likeOp, '%wil ii%')
                            ->orWhere('satuan_kerja', $likeOp, '%skw ii %')
                            ->orWhere('satuan_kerja', $likeOp, '%skw ii')
                            ->orWhere('satuan_kerja', $likeOp, '%wilayah 2%')
                            ->orWhere('satuan_kerja', $likeOp, '%tenggarong%')
                            ->orWhere('satuan_kerja', $likeOp, '%paser%')
                            ->orWhereIn('resor', ['resor_04', 'resor_05', 'resor_06', 'resor_07', 'resor_08']);
                    } elseif ($wilayah === 'SKW_3') {
                        $q->orWhere('satuan_kerja', $likeOp, '%wilayah iii%')
                            ->orWhere('satuan_kerja', $likeOp, '%wil iii%')
                            ->orWhere('satuan_kerja', $likeOp, '%skw iii%')
                            ->orWhere('satuan_kerja', $likeOp, '%wilayah 3%')
                            ->orWhere('satuan_kerja', $likeOp, '%balikpapan%')
                            ->orWhereIn('resor', ['resor_09', 'resor_10', 'resor_11', 'resor_12', 'resor_13', 'resor_14']);
                    }
                });
            } else {
                $wilayahPattern = $escapeLike($wilayah);
                $resorPatterns = null;
                if (preg_match('/Resor\s+0*(\d+)\.\s*(.+)$/i', $wilayah, $m)) {
                    $resorNum = $m[1];
                    $resorName = trim($m[2]);
                    $resorPatterns = [$escapeLike("Resor KSDA Wilayah {$resorNum}"), $escapeLike($resorName)];
                }
                $query->where(function ($q) use ($wilayahPattern, $resorPatterns, $likeOp) {
                    $q->whereRaw("satuan_kerja {$likeOp} ? ESCAPE '!'", [$wilayahPattern])
                        ->orWhereRaw("resor {$likeOp} ? ESCAPE '!'", [$wilayahPattern])
                        ->orWhereRaw("jabatan {$likeOp} ? ESCAPE '!'", [$wilayahPattern]);
                    if ($resorPatterns) {
                        $q->orWhereRaw("jabatan {$likeOp} ? ESCAPE '!'", [$resorPatterns[0]])
                            ->orWhereRaw("jabatan {$likeOp} ? ESCAPE '!'", [$resorPatterns[1]]);
                    }
                });
            }
        }

        // Ambil parameter pencarian dari URL (?search=... atau ?q=...)
        $rawSearch = $request->input('search') ?? $request->input('q') ?? '';
        $searchTerm = is_string($rawSearch) ? trim($rawSearch) : '';

        if ($searchTerm !== '') {
            $termPattern = $escapeLike($searchTerm);
            $query->where(function ($q) use ($termPattern, $likeOp) {
                $q->whereRaw("nama_lengkap {$likeOp} ? ESCAPE '!'", [$termPattern])
                    ->orWhereRaw("nip {$likeOp} ? ESCAPE '!'", [$termPattern])
                    ->orWhereRaw("jabatan {$likeOp} ? ESCAPE '!'", [$termPattern])
                    ->orWhereRaw("satuan_kerja {$likeOp} ? ESCAPE '!'", [$termPattern]);
            });
        }

        // Ambil data dengan Pagination (default 10 baris per halaman, 'all' = 500)
        $rawPerPageInput = $request->input('per_page', '10');
        $rawPerPage = is_scalar($rawPerPageInput) ? strtolower(trim((string) $rawPerPageInput)) : '10';
        $requestedPerPage = $rawPerPage === 'all' ? 500 : max(1, (int) $rawPerPage);
        $isMobile = $request->boolean('mobile') || $request->header('X-Client') === 'mobile';
        $perPage = min($requestedPerPage, $isMobile ? 100 : 500);
        $employees = $query->orderBy('nama_lengkap', 'asc')->paginate($perPage);

        $actor = $request->user();
        $isAdminActor = (bool) $actor?->isAdminFor('kepegawaian');
        if (! $isAdminActor) {
            $actorNip = trim((string) $actor?->username);
            $employees->getCollection()->each(function (Employee $emp) use ($actorNip) {
                if ($actorNip === '' || trim((string) $emp->nip) !== $actorNip) {
                    $emp->makeHidden(['nama_bank', 'nomor_rekening', 'inactive_notes']);
                }
            });
        }

        // Rule 5.1 & 5.3: Format Response Seragam
        return response()->json([
            'message' => 'Data pegawai berhasil diambil.',
            'data' => $employees->items(),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
                'counts' => $counts,
            ],
        ]);
    }

    /**
     * Rule 1.4 & 4.4: Sanitasi dan Upload File ke RustFS Object Storage
     */
    public function store(EmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $employee = DB::transaction(function () use ($validated, $request) {
            $employee = Employee::create($validated);
            if ($request->hasFile('foto')) {
                $employee->replaceProfilePhoto($request->file('foto'));
            }

            // Auto-create inactive user account with random secure password if it doesn't exist yet
            $nip = trim((string) $employee->nip);
            if ($nip !== '' && ! User::withTrashed()->where('username', $nip)->exists()) {
                User::create([
                    'name' => $employee->nama_lengkap,
                    'username' => $nip,
                    'email' => strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', $nip)) . '@bksda.local',
                    'password' => Str::random(64),
                    'role' => 'user',
                    'is_active' => false,
                ]);
            }

            return $employee;
        });

        return response()->json([
            'message' => 'Data pegawai berhasil ditambahkan.',
            'data' => $employee->fresh(),
        ], 201);
    }

    /**
     * Lihat detail 1 Pegawai
     */
    public function show(Request $request, $id): JsonResponse
    {
        $employee = Employee::with(['user', 'location.parent'])->findOrFail($id);

        $data = $employee->toArray();
        unset($data['user']);
        $data['foto_url'] = $employee->foto_profil ? Storage::url($employee->foto_profil) : null;
        $data['email'] = $employee->email ?? $employee->user?->email ?? null;

        $actor = $request->user();
        $isAdminActor = (bool) $actor?->isAdminFor('kepegawaian');
        $isSelf = $actor && trim((string) $employee->nip) !== '' && trim((string) $employee->nip) === trim((string) $actor->username);
        if (! $isAdminActor && ! $isSelf) {
            unset($data['nama_bank'], $data['nomor_rekening'], $data['inactive_notes']);
        }

        return response()->json([
            'message' => 'Detail pegawai ditemukan.',
            'data' => $data,
        ]);
    }

    /**
     * Update data dan ganti foto jika ada
     */
    public function update(EmployeeRequest $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $currentUser = $request->user();

        // Mencegah akun admin non-super_admin mengubah profil pegawai super_admin
        $oldNip = trim((string) $employee->nip);
        $targetUser = $oldNip !== '' ? User::where('username', $oldNip)->first() : null;
        if ($targetUser && $targetUser->role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Hanya Super Admin yang dapat mengubah data pegawai Super Admin.',
            ], 403);
        }

        $validated = $request->validated();

        $oldEmail = strtolower(trim((string) $employee->email));
        $newEmail = isset($validated['email']) ? strtolower(trim((string) $validated['email'])) : '';
        if ($targetUser && $newEmail !== '' && $newEmail !== $oldEmail) {
            $emailConflict = User::whereRaw('LOWER(email) = ?', [$newEmail])
                ->where('id', '!=', $targetUser->id)
                ->exists();
            if ($emailConflict) {
                return response()->json([
                    'message' => 'Alamat email sudah digunakan oleh akun pengguna lain.',
                    'errors' => ['email' => ['Alamat email sudah digunakan oleh akun pengguna lain.']],
                ], 422);
            }
        }

        $trackedFields = ['nama_lengkap', 'nip', 'jabatan', 'pangkat_golongan', 'satuan_kerja', 'resor', 'location_id', 'masa_kerja', 'nama_bank', 'nomor_rekening', 'telepon', 'email', 'is_active'];
        $employee->loadMissing('location.parent');
        $oldPlacement = [
            'location_id' => $employee->location_id,
            'satuan_kerja' => $employee->satuan_kerja,
            'resor' => $employee->resor,
            'drive_unit_id' => $employee->location?->effectiveDriveUnitId(),
        ];

        $oldValues = [];
        foreach ($trackedFields as $field) {
            $oldValues[$field] = $employee->$field;
        }
        $oldNip = trim((string) $employee->nip);

        // Jika user mengganti foto lama dengan foto baru
        if ($request->hasFile('foto')) {
            $employee->replaceProfilePhoto($request->file('foto'));
        }

        DB::transaction(function () use ($employee, $validated, $trackedFields, $oldValues, $oldNip, $oldPlacement, $targetUser, $currentUser) {
            $employee->update($validated);
            $newNip = trim((string) $employee->nip);

            // Sinkronisasi email ke akun User jika ada (reset verifikasi + sesi bila email berubah)
            if ($targetUser && ! empty($employee->email)) {
                $emailChanged = strtolower(trim((string) $targetUser->email)) !== strtolower(trim((string) $employee->email));
                $targetUser->email = $employee->email;
                if ($emailChanged) {
                    $targetUser->email_verified_at = null;
                    $targetUser->tokens()->delete();
                }
                $targetUser->save();
            }

            // Catat riwayat audit jika ada field biodata yang berubah
            $changes = [];
            foreach ($trackedFields as $field) {
                $newVal = $employee->$field;
                $oldVal = $oldValues[$field];
                if ($oldVal != $newVal) {
                    $changes[$field] = [
                        'old' => $oldVal,
                        'new' => $newVal,
                    ];
                }
            }

            if (! empty($changes)) {
                EmployeeHistory::create([
                    'employee_id' => $employee->id,
                    'user_id' => $currentUser?->id,
                    'action' => 'UPDATE_BIODATA',
                    'changes' => $changes,
                    'created_at' => now(),
                ]);
            }

            if ($oldNip !== '' && $newNip !== '' && $newNip !== $oldNip) {
                User::where('username', $oldNip)->update([
                    'username' => $newNip,
                    'name' => $employee->nama_lengkap,
                ]);
            }

            $freshEmployee = $employee->fresh(['location.parent']);
            $resolvedUser = ($newNip !== '' && $newNip !== $oldNip)
                ? User::where('username', $newNip)->first()
                : ($targetUser ?: ($newNip !== '' ? User::where('username', $newNip)->first() : null));

            \App\Support\Security\DriveAccess::syncEmployeePlacement($freshEmployee, $oldPlacement, $resolvedUser);
        });

        return response()->json([
            'message' => 'Data pegawai berhasil diperbarui.',
            'data' => $employee->fresh(['location.parent']),
        ]);
    }

    /**
     * Ambil riwayat perubahan biodata pegawai untuk Tab Riwayat Perubahan.
     * GET /api/kepegawaian/employees/{id}/histories
     */
    public function histories(Request $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $histories = EmployeeHistory::where('employee_id', $employee->id)
            ->with(['user:id,name,username'])
            ->latest('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $histories,
        ]);
    }

    /**
     * Upload/replace employee photo only.
     * POST /api/kepegawaian/employees/{employee}/photo
     */
    public function updatePhoto(Request $request, $id): JsonResponse
    {
        $request->validate([
            'foto' => UploadValidationRules::image(maxKilobytes: 10240),
        ]);

        $employee = Employee::findOrFail($id);
        $currentUser = $request->user();

        // Mencegah admin non-super_admin mengganti foto super_admin
        $nip = trim((string) $employee->nip);
        $targetUser = $nip !== '' ? User::where('username', $nip)->first() : null;
        if ($targetUser && $targetUser->role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Hanya Super Admin yang dapat mengubah foto profil Super Admin.',
            ], 403);
        }

        $path = $employee->replaceProfilePhoto($request->file('foto'));

        return response()->json([
            'message' => 'Foto pegawai berhasil diperbarui.',
            'foto_url' => Storage::url($path),
        ]);
    }

    /**
     * Rule 3.6: Soft Delete
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        $currentUser = $request->user();
        if ($currentUser && ($currentUser->username === $employee->nip || (int) $currentUser->employee_id === (int) $employee->id)) {
            return response()->json([
                'message' => 'Anda tidak dapat menghapus data pegawai akun Anda sendiri.',
            ], 403);
        }

        // Mencegah admin non-super_admin menghapus akun pegawai super_admin
        $nip = trim((string) $employee->nip);
        $targetUser = $nip !== '' ? User::where('username', $nip)->first() : null;
        if ($targetUser && $targetUser->role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Hanya Super Admin yang dapat menghapus data akun Super Admin.',
            ], 403);
        }

        DB::transaction(function () use ($employee, $nip) {
            // Operasi ini otomatis menjadi Soft Delete karena Trait SoftDeletes di Model (Issue #23)
            $employee->delete();

            // Deactivate associated user account and revoke existing tokens to prevent orphaned login
            if ($nip !== '' && ($user = User::where('username', $nip)->first())) {
                $user->update(['is_active' => false]);
                $user->tokens()->delete();
            }
        });

        app(\App\Modules\Bmn\Services\AssetService::class)->notifyEmployeeBmnClearance($employee, 'penghapusan data pegawai');

        return response()->json([
            'message' => 'Data pegawai berhasil dihapus (soft delete).',
        ]);
    }

    /**
     * POST /api/kepegawaian/employees/{id}/restore
     * Pulihkan data pegawai yang telah di-soft-delete menjadi aktif kembali.
     */
    public function restore($id): JsonResponse
    {
        $employee = Employee::onlyTrashed()->findOrFail($id);
        $employee->restore();
        $employee->update(['is_active' => true]);

        return response()->json([
            'message' => 'Data pegawai berhasil dipulihkan.',
            'data' => $employee->fresh(),
        ]);
    }

    /**
     * DELETE /api/kepegawaian/employees/{id}/force
     * Hapus permanen data pegawai, foto di RustFS, serta akun user terkait.
     */
    public function forceDestroy(Request $request, $id): JsonResponse
    {
        $employee = Employee::withTrashed()->findOrFail($id);

        $currentUser = $request->user();
        if ($currentUser && ($currentUser->username === $employee->nip || (int) $currentUser->employee_id === (int) $employee->id)) {
            return response()->json([
                'message' => 'Anda tidak dapat menghapus permanen data pegawai akun Anda sendiri.',
            ], 403);
        }

        $nip = trim((string) $employee->nip);
        $targetUser = $nip !== '' ? User::withTrashed()->where('username', $nip)->first() : null;
        if ($targetUser && $targetUser->role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Hanya Super Admin yang dapat menghapus permanen akun Super Admin.',
            ], 403);
        }

        // doc.md §8 & HIST-01: Pegawai pensiun/keluar dan pegawai yang memiliki riwayat operasional tidak boleh dihapus permanen
        if ($employee->hasOperationalHistory() || $employee->inactive_reason !== null) {
            return response()->json([
                'message' => 'Pegawai memiliki riwayat operasional atau berstatus purna tugas/keluar sehingga tidak dapat dihapus permanen. Gunakan penonaktifan status untuk mengarsipkan pegawai.',
            ], 422);
        }

        $filesToDelete = [];
        $leaveRequests = EmployeeLeaveRequest::withTrashed()
            ->where('employee_id', $employee->id)
            ->get(['scan_surat_path', 'scan_formulir_path', 'scan_surat_izin_path']);
        foreach ($leaveRequests as $lr) {
            foreach (['scan_surat_path', 'scan_formulir_path', 'scan_surat_izin_path'] as $col) {
                if (! empty($lr->{$col})) {
                    $filesToDelete[] = $lr->{$col};
                }
            }
        }

        DB::transaction(function () use ($employee, $targetUser) {
            if ($targetUser && $targetUser->role !== 'super_admin') {
                $targetUser->tokens()->delete();
                $targetUser->forceDelete();
            }
            $employee->forceDelete();
        });

        Employee::deleteUnreferencedProfilePhoto($employee->foto_profil);
        $localFiles = array_values(array_unique(array_filter($filesToDelete)));
        if ($localFiles !== []) {
            Storage::disk('local')->delete($localFiles);
        }

        return response()->json([
            'message' => 'Data pegawai, akun akses, dan foto profil berhasil dihapus permanen.',
        ]);
    }

    /**
     * Protected select - untuk dropdown di form surat tugas & modul internal
     */
    public function select(Request $request): JsonResponse
    {
        $request->validate([
            'as_of' => ['nullable', 'date'],
        ]);
        $rawSearch = $request->input('q') ?? $request->input('search') ?? '';
        $searchTerm = is_string($rawSearch) ? trim($rawSearch) : '';
        $asOf = ($request->user() && $request->filled('as_of'))
            ? \Illuminate\Support\Carbon::parse($request->input('as_of'))
            : null;

        $query = Employee::query()
            ->effectiveActive($asOf)
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->where('nama_lengkap', 'NOT LIKE', '%superadmin%')
            ->where('nama_lengkap', 'NOT LIKE', '%magang%');

        if ($searchTerm !== '') {
            $termPattern = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $searchTerm) . '%';
            $likeOp = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($termPattern, $likeOp) {
                $q->whereRaw("nama_lengkap {$likeOp} ? ESCAPE '!'", [$termPattern])
                    ->orWhereRaw("nip {$likeOp} ? ESCAPE '!'", [$termPattern]);
            });
        }

        $limit = min(200, max(1, $request->integer('limit', $request->integer('per_page', 200))));

        $employees = $query->orderBy('nama_lengkap', 'asc')
            ->limit($limit)
            ->get(['id', 'nama_lengkap', 'nip', 'jabatan', 'pangkat_golongan', 'satuan_kerja']);

        $isAuth = $request->user() !== null;

        return response()->json([
            'data' => $employees->map(function ($emp) use ($isAuth) {
                $cleanNip = trim((string) $emp->nip);
                $maskedNip = $cleanNip !== ''
                    ? (strlen($cleanNip) > 8
                        ? substr($cleanNip, 0, 4) . str_repeat('*', max(4, strlen($cleanNip) - 8)) . substr($cleanNip, -4)
                        : '****')
                    : '-';
                $displayNip = $isAuth ? $cleanNip : $maskedNip;

                return [
                    'id' => $emp->id,
                    'name' => $emp->nama_lengkap,
                    'nama_lengkap' => $emp->nama_lengkap,
                    'nama' => $emp->nama_lengkap,
                    'nip' => $displayNip,
                    'pangkat_golongan' => $emp->pangkat_golongan,
                    'rank' => $emp->pangkat_golongan,
                    'department' => $emp->satuan_kerja,
                    'satuan_kerja' => $emp->satuan_kerja,
                    'position' => $emp->jabatan,
                    'jabatan' => $emp->jabatan,
                    'is_seksi' => $emp->is_seksi,
                    'seksi_wilayah' => $emp->seksi_wilayah,
                ];
            }),
        ]);
    }

    /**
     * POST /api/kepegawaian/employees/{id}/reset-password
     * Reset password pegawai dan invalidasi token aktif.
     */
    public function resetPassword(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'nullable|string|min:8',
            'mode' => 'nullable|string|in:send_link,generate',
        ]);

        $employee = Employee::findOrFail($id);

        $nip = trim((string) $employee->nip);
        $user = $nip !== '' ? User::where('username', $nip)->first() : null;

        if (!$user) {
            return response()->json([
                'message' => 'Akun user untuk pegawai ini tidak ditemukan.',
            ], 404);
        }

        $currentUser = $request->user();
        $targetIsPrivileged = $user->role === 'super_admin'
            || $user->role === 'admin'
            || in_array('admin', array_values($user->module_roles ?? []), true);
        if ($targetIsPrivileged && $currentUser?->role !== 'super_admin') {
            $msg = $user->role === 'super_admin'
                ? 'Hanya Super Admin yang dapat mereset password akun Super Admin.'
                : 'Hanya Super Admin yang dapat mereset password akun Administrator Modul.';
            return response()->json(['message' => $msg], 403);
        }

        // Mode B: Kirim link reset jika diminta dan user punya email valid
        if ($request->input('mode') === 'send_link' && $user->hasDeliverableEmail()) {
            \Illuminate\Support\Facades\Password::sendResetLink(['email' => $user->email]);
            return response()->json([
                'message' => 'Tautan reset kata sandi telah dikirimkan ke email terverifikasi pegawai (' . $user->email . ').',
            ]);
        }

        // Mode A (Default): Generate password acak 12 karakter & paksa ganti saat login berikutnya
        $customPassword = $request->input('password');
        $temporaryPassword = !empty($customPassword)
            ? (string) $customPassword
            : \Illuminate\Support\Str::password(12);

        $user->forceFill([
            'password' => \Illuminate\Support\Facades\Hash::make($temporaryPassword),
            'must_change_password' => true,
        ])->save();

        // Revoke active sessions / bearer tokens upon password reset
        $user->tokens()->delete();

        // Ponytail: Catat riwayat audit
        EmployeeHistory::create([
            'employee_id' => $employee->id,
            'user_id' => $currentUser?->id,
            'action' => 'RESET_PASSWORD',
            'changes' => [],
            'notes' => 'Reset kata sandi pegawai oleh ' . ($currentUser?->name ?? 'Admin') . ($request->input('mode') === 'send_link' ? ' (kirim link email)' : ' (generate password sementara)'),
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Password berhasil direset. Pegawai wajib menggantinya saat login berikutnya.',
            'temporary_password' => $temporaryPassword,
        ]);
    }

    /**
     * DELETE /api/kepegawaian/employees/{id}/2fa
     * Super admin mereset 2FA pegawai yang kehilangan akses / ganti HP.
     */
    public function reset2Fa(Request $request, $id): JsonResponse
    {
        $currentUser = $request->user();
        if ($currentUser?->role !== 'super_admin') {
            return response()->json(['message' => 'Hanya Super Admin yang berhak mereset 2FA pegawai.'], 403);
        }

        $employee = Employee::findOrFail($id);
        $nip = trim((string) $employee->nip);
        $user = $nip !== '' ? User::where('username', $nip)->first() : null;

        if (! $user) {
            return response()->json(['message' => 'Akun user untuk pegawai ini tidak ditemukan.'], 404);
        }

        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);
        $user->tokens()->delete();

        // Ponytail: Catat riwayat audit
        EmployeeHistory::create([
            'employee_id' => $employee->id,
            'user_id' => $currentUser?->id,
            'action' => 'RESET_2FA',
            'changes' => [],
            'notes' => 'Reset Autentikasi 2 Langkah (2FA) pegawai oleh Super Admin (' . ($currentUser?->name ?? 'Super Admin') . ')',
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Autentikasi 2 Langkah (2FA) untuk ' . ($employee->nama_lengkap ?? $user->name) . ' berhasil direset.',
        ]);
    }

    /**
     * POST /api/kepegawaian/employees/{id}/lifecycle
     * Kelola status lifecycle pegawai: nonaktifkan (pensiun/keluar/dsb), batalkan jadwal, atau aktifkan kembali.
     */
    public function updateLifecycle(Request $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $currentUser = $request->user();

        // EMP-04: Mencegah menonaktifkan akun sendiri
        if ($currentUser && ($currentUser->username === $employee->nip || (int) $currentUser->employee_id === (int) $employee->id)) {
            return response()->json([
                'message' => 'Anda tidak dapat mengubah status lifecycle akun Anda sendiri.',
            ], 403);
        }

        // EMP-04: Mencegah admin non-super_admin menonaktifkan akun super_admin
        $nip = trim((string) $employee->nip);
        $targetUser = $nip !== '' ? User::where('username', $nip)->first() : null;
        if ($targetUser && $targetUser->role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Hanya Super Admin yang dapat mengubah status akun Super Admin.',
            ], 403);
        }

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['deactivate', 'cancel_schedule', 'reactivate'])],
            'inactive_reason' => [
                Rule::requiredIf($request->input('action') === 'deactivate'),
                'nullable',
                'string',
                Rule::in(Employee::ALLOWED_INACTIVE_REASONS),
            ],
            'inactive_effective_date' => [
                Rule::requiredIf($request->input('action') === 'deactivate'),
                'nullable',
                'date_format:Y-m-d',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
                Rule::requiredIf(function () use ($request) {
                    $action = $request->input('action');
                    $reason = $request->input('inactive_reason');
                    $date = $request->input('inactive_effective_date');

                    if ($action === 'reactivate') {
                        return true;
                    }
                    if ($action === 'deactivate') {
                        if ($reason === 'lainnya') {
                            return true;
                        }
                        if (! empty($date)) {
                            $parsed = Carbon::parse($date);
                            if ($parsed->toDateString() < now()->toDateString()) {
                                return true;
                            }
                        }
                    }
                    return false;
                }),
            ],
        ], [
            'notes.required' => 'Catatan wajib diisi jika alasan adalah lainnya, TMT berlaku mundur (backdate), atau saat mengaktifkan kembali pegawai.',
        ]);

        $employee->applyLifecycleStatus(
            action: $validated['action'],
            reason: $validated['inactive_reason'] ?? null,
            effectiveDate: $validated['inactive_effective_date'] ?? null,
            notes: $validated['notes'] ?? null,
            actor: $currentUser
        );

        $actionMessages = [
            'deactivate' => 'Status pegawai berhasil diperbarui.',
            'cancel_schedule' => 'Jadwal penonaktifan berhasil dibatalkan.',
            'reactivate' => 'Pegawai berhasil diaktifkan kembali. Akun portal tetap nonaktif sampai diatur melalui modul IAM.',
        ];

        return response()->json([
            'message' => $actionMessages[$validated['action']] ?? 'Status lifecycle pegawai berhasil diperbarui.',
            'data' => $employee->fresh(),
        ]);
    }

    /**
     * GET /api/kepegawaian/employees/{id}/bmn-clearance
     * Menghitung dan memeriksa tanggungan BMN unik (pinjaman aktif & pegangan langsung) sebelum nonaktif.
     */
    public function bmnClearance(Request $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        try {
            // 1. Pinjaman aktif (status dipinjam atau terlambat)
            $loanAssets = DB::table('bmn_asset_loans')
                ->join('bmn_assets', 'bmn_asset_loans.asset_id', '=', 'bmn_assets.id')
                ->where('bmn_asset_loans.employee_id', $employee->id)
                ->whereIn(DB::raw('LOWER(bmn_asset_loans.status)'), ['dipinjam', 'terlambat'])
                ->select(
                    'bmn_assets.id',
                    'bmn_assets.nama_barang',
                    'bmn_assets.kode_barang',
                    'bmn_assets.nup',
                    DB::raw("'pinjaman' as tipe_tanggungan")
                )
                ->get();

            // 2. Aset yang dipegang langsung (employee_id di bmn_assets)
            $heldAssets = DB::table('bmn_assets')
                ->where('employee_id', $employee->id)
                ->select(
                    'id',
                    'nama_barang',
                    'kode_barang',
                    'nup',
                    DB::raw("'pegangan' as tipe_tanggungan")
                )
                ->get();

            // Gabungkan dan hitung aset unik berdasarkan id
            $allAssets = $loanAssets->concat($heldAssets);
            $uniqueAssets = $allAssets->unique('id')->values();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->nama_lengkap,
                    'unique_asset_count' => $uniqueAssets->count(),
                    'assets' => $uniqueAssets,
                    'status_check' => 'ok',
                ],
            ]);
        } catch (\Throwable $e) {
            // doc.md §7: Jika pembacaan ringkasan BMN gagal, tampilkan status belum dapat diperiksa, bukan angka nol
            return response()->json([
                'status' => 'partial',
                'data' => [
                    'employee_id' => $employee->id,
                    'employee_name' => $employee->nama_lengkap,
                    'unique_asset_count' => null,
                    'assets' => [],
                    'status_check' => 'error',
                    'message' => 'Status tanggungan belum dapat diperiksa.',
                ],
            ]);
        }
    }

    /**
     * GET /api/kepegawaian/employees/{id}/assignment-letters
     * Mengambil riwayat surat tugas khusus untuk pegawai ini
     */
    public function assignmentLetters(Request $request, string $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $user = $request->user();
        $isAdmin = $user && ($user->role === 'super_admin'
            || ($user->isAdminFor('surat_tugas') && array_intersect(['surat_tugas', 'kepegawaian'], $user->access_modules ?? [])));
        $isSelf = $user && trim((string) $employee->nip) !== '' && trim((string) $employee->nip) === trim((string) $user->username);
        if (! $isAdmin && ! $isSelf) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat riwayat surat tugas pegawai lain.');
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 10)));

        $query = $employee->assignmentLetters();
        if (! $isAdmin) {
            $query->where(function ($q) use ($user) {
                $q->whereIn(DB::raw('LOWER(status)'), \App\Modules\SuratTugas\Models\AssignmentLetter::OFFICIAL_STATUSES)
                    ->orWhere('created_by', $user->id);
            });
        }
        $letters = $query->latest()->paginate($perPage);

        return response()->json([
            'message' => 'Riwayat penugasan berhasil diambil.',
            'data' => $letters->items(),
            'meta' => [
                'current_page' => $letters->currentPage(),
                'last_page' => $letters->lastPage(),
                'per_page' => $letters->perPage(),
                'total' => $letters->total(),
            ],
        ]);
    }

    /**
     * GET /api/kepegawaian/employees/{id}/meal-allowances
     * Mengambil riwayat penerimaan uang makan khusus untuk pegawai ini
     */
    public function mealAllowances(Request $request, string $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $user = $request->user();
        $isAdmin = $user && ($user->role === 'super_admin'
            || ($user->isAdminFor('kepegawaian') && in_array('kepegawaian', $user->access_modules ?? [], true)));
        $isSelf = $user && trim((string) $employee->nip) !== '' && trim((string) $employee->nip) === trim((string) $user->username);
        if (! $isAdmin && ! $isSelf) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat riwayat uang makan pegawai lain.');
        }

        $perPage = min(100, max(1, (int) $request->input('per_page', 12)));

        if ($employee->is_mmp) {
            return response()->json([
                'message' => 'Personil Masyarakat Mitra Polhut (MMP) tidak memiliki fasilitas uang makan.',
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $perPage,
                    'total' => 0,
                ],
            ]);
        }

        $items = MealAllowanceItem::with('batch')
            ->where(function ($q) use ($employee) {
                $q->where('employee_id', $employee->id);
                if (!empty($employee->nip)) {
                    $q->orWhere('nip', $employee->nip);
                }
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'message' => 'Riwayat uang makan berhasil diambil.',
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    /**
     * GET /api/kepegawaian/dashboard-stats
     * Mengambil data statistik real-time dari database untuk Kepegawaian Dashboard
     */
    public function dashboardStats(Request $request): JsonResponse
    {
        $isAdminActor = (bool) $request->user()?->isAdminFor('kepegawaian');

        $baseQuery = Employee::query()
            ->with([
                'location:id,parent_id,location_type,unit_kerja,name,code,is_restricted',
                'location.parent:id,unit_kerja,name,location_type,code',
            ])
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->where('nama_lengkap', 'NOT LIKE', '%admin%')
            ->where('nama_lengkap', 'NOT LIKE', '%magang%')
            ->where('nama_lengkap', 'NOT LIKE', '%superadmin%')
            ->where(function ($q) {
                $q->whereNull('satuan_kerja')
                    ->orWhere('satuan_kerja', 'NOT LIKE', '%pusat%');
            });

        // 1. Total & Active Employees + Kategori Breakdown
        $totalEmployees = (clone $baseQuery)->count();
        $activeEmployees = (clone $baseQuery)->where('is_active', true)->count();
        $pnsCount = (clone $baseQuery)->ofJenis('PNS')->count();
        $pppkCount = (clone $baseQuery)->ofJenis('PPPK')->count();
        $mmpCount = (clone $baseQuery)->ofJenis('MMP')->count();
        $activeRate = $totalEmployees > 0 
            ? number_format(($activeEmployees / $totalEmployees) * 100, 1) . '%' 
            : '100%';

        // 2-3 & 5. Query surat tugas / cuti / surat masuk hanya untuk admin kepegawaian
        $activeStCount = 0;
        $pendingStCount = 0;
        $pendingCutiCount = 0;
        $approvedCutiCount = 0;
        $totalSuratMasuk = 0;
        $unrepliedSuratMasuk = 0;
        $recentSt = collect();

        if ($isAdminActor) {
            $activeStCount = AssignmentLetter::whereIn('status', ['DITERBITKAN', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'diterbitkan', 'approved', 'completed', 'published'])->count();
            $pendingStCount = AssignmentLetter::whereIn('status', ['PENDING', 'DRAFT', 'pending', 'draft'])->count();
            $pendingCutiCount = EmployeeLeaveRequest::whereIn(DB::raw('UPPER(status)'), ['PENGAJUAN', 'PENDING'])->count();
            $approvedCutiCount = EmployeeLeaveRequest::whereIn(DB::raw('UPPER(status)'), ['DISETUJUI', 'APPROVED'])->count();
            $totalSuratMasuk = \App\Modules\Kepegawaian\Models\EmployeeIncomingLetter::count();
            $unrepliedSuratMasuk = \App\Modules\Kepegawaian\Models\EmployeeIncomingLetter::where(function ($q) {
                $q->whereNull('no_surat_balasan')->orWhere('no_surat_balasan', '');
            })->count();
        }

        // 4. Sebaran Satuan Kerja (berbasis Master Lokasi & kanonik unit)
        $employeesForStats = (clone $baseQuery)->with('location.parent')->get(['id', 'location_id', 'satuan_kerja', 'resor']);

        $samarindaCount = 0;
        $berauCount = 0;
        $tenggarongCount = 0;
        $balikpapanCount = 0;
        $dynamicSeksiCounts = [];

        foreach ($employeesForStats as $emp) {
            $slug = $emp->canonicalLocationSlug();

            if ($slug === 'skw-3-balikpapan') {
                $balikpapanCount++;
            } elseif ($slug === 'skw-2-tenggarong') {
                $tenggarongCount++;
            } elseif ($slug === 'skw-1-berau') {
                $berauCount++;
            } elseif ($emp->location?->parent?->location_type === \App\Modules\Bmn\Models\Location::TYPE_SEKSI
                || $emp->location?->location_type === \App\Modules\Bmn\Models\Location::TYPE_SEKSI) {
                $seksiLoc = $emp->location?->parent ?? $emp->location;
                $key = $seksiLoc->id;
                if (! isset($dynamicSeksiCounts[$key])) {
                    $dynamicSeksiCounts[$key] = ['code' => $key, 'name' => $seksiLoc->name, 'count' => 0];
                }
                $dynamicSeksiCounts[$key]['count']++;
            } else {
                $samarindaCount++;
            }
        }

        $denom = max(1, $totalEmployees);
        $satkerBreakdown = [
            [
                'code' => 'BALAI',
                'name' => 'Kantor Balai (Samarinda)',
                'count' => $samarindaCount,
                'percentage' => (int) round(($samarindaCount / $denom) * 100),
                'gradient' => 'from-blue-600 to-indigo-600',
                'dot' => 'bg-blue-500',
            ],
            [
                'code' => 'SKW_1',
                'name' => 'Seksi KSDA Wilayah I Berau',
                'count' => $berauCount,
                'percentage' => (int) round(($berauCount / $denom) * 100),
                'gradient' => 'from-sky-500 to-cyan-500',
                'dot' => 'bg-sky-400',
            ],
            [
                'code' => 'SKW_2',
                'name' => 'Seksi KSDA Wilayah II Tenggarong',
                'count' => $tenggarongCount,
                'percentage' => (int) round(($tenggarongCount / $denom) * 100),
                'gradient' => 'from-emerald-500 to-teal-500',
                'dot' => 'bg-emerald-400',
            ],
            [
                'code' => 'SKW_3',
                'name' => 'Seksi KSDA Wilayah III Balikpapan',
                'count' => $balikpapanCount,
                'percentage' => (int) round(($balikpapanCount / $denom) * 100),
                'gradient' => 'from-amber-500 to-orange-500',
                'dot' => 'bg-amber-400',
            ],
        ];

        foreach ($dynamicSeksiCounts as $dyn) {
            $satkerBreakdown[] = [
                'code' => $dyn['code'],
                'name' => $dyn['name'],
                'count' => $dyn['count'],
                'percentage' => (int) round(($dyn['count'] / $denom) * 100),
                'gradient' => 'from-violet-500 to-purple-500',
                'dot' => 'bg-violet-400',
            ];
        }

        // 5. Recent Surat Tugas (admin kepegawaian saja)
        if ($isAdminActor) {
            $recentSt = AssignmentLetter::latest()->take(4)->get()->map(function ($st) {
                return [
                    'id' => 'st-' . $st->id,
                    'title' => $st->maksud_tujuan ?: ($st->nama_kegiatan ?: 'Melaksanakan Perjalanan Dinas'),
                    'tempat_tujuan' => $st->tempat_tujuan ?: 'Kalimantan Timur',
                    'status' => strtoupper($st->status ?: 'DITERBITKAN'),
                    'tanggal_surat' => $st->created_at ? $st->created_at->format('d/m/Y') : 'Terbaru',
                ];
            });
        }

        return response()->json([
            'message' => 'Statistik dashboard kepegawaian berhasil dimuat.',
            'data' => [
                'total_employees' => $totalEmployees,
                'active_employees' => $activeEmployees,
                'pns_count' => $pnsCount,
                'pppk_count' => $pppkCount,
                'mmp_count' => $mmpCount,
                'active_rate' => $activeRate,
                'active_surat_tugas' => $isAdminActor ? $activeStCount : 0,
                'pending_surat_tugas' => $isAdminActor ? $pendingStCount : 0,
                'pending_cuti' => $isAdminActor ? $pendingCutiCount : 0,
                'approved_cuti' => $isAdminActor ? $approvedCutiCount : 0,
                'total_surat_masuk' => $isAdminActor ? $totalSuratMasuk : 0,
                'unreplied_surat_masuk' => $isAdminActor ? $unrepliedSuratMasuk : 0,
                'satker_breakdown' => $satkerBreakdown,
                'recent_activities' => $isAdminActor ? $recentSt : [],
            ],
        ]);
    }
}
