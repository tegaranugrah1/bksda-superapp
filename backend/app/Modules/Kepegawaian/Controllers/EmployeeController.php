<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Requests\EmployeeRequest;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    /**
     * Rule 3.1: Wajib Pagination dan Search
     */
    public function index(Request $request): JsonResponse
    {
        $query = Employee::query()
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->where('nama_lengkap', 'NOT LIKE', '%admin%')
            ->where('nama_lengkap', 'NOT LIKE', '%magang%')
            ->where('nama_lengkap', 'NOT LIKE', '%superadmin%')
            ->where(function ($q) {
                $q->whereNull('satuan_kerja')
                    ->orWhere('satuan_kerja', 'NOT LIKE', '%pusat%');
            });

        // Ambil parameter pencarian dari URL (?search=... atau ?q=...)
        $searchTerm = trim((string) ($request->input('search') ?? $request->input('q') ?? ''));

        if ($searchTerm !== '') {
            $escapedTerm = addcslashes($searchTerm, '%_');
            $likeOp = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($escapedTerm, $likeOp) {
                $q->where('nama_lengkap', $likeOp, "%{$escapedTerm}%")
                    ->orWhere('nip', $likeOp, "%{$escapedTerm}%");
            });
        }

        // Status filter opsional
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Ambil data dengan Pagination (default 10 baris per halaman)
        $requestedPerPage = max(1, (int) $request->input('per_page', 10));
        $isMobile = $request->boolean('mobile') || $request->header('X-Client') === 'mobile';
        $perPage = min($requestedPerPage, $isMobile ? 100 : 500);
        $employees = $query->orderBy('nama_lengkap', 'asc')->paginate($perPage);

        // Rule 5.1 & 5.3: Format Response Seragam
        return response()->json([
            'message' => 'Data pegawai berhasil diambil.',
            'data' => $employees->items(),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
            ],
        ]);
    }

    /**
     * Rule 1.4 & 4.4: Sanitasi dan Upload File ke RustFS Object Storage
     */
    public function store(EmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('foto')) {
            $file = $request->file('foto');
            $slug = Str::slug($validated['nama_lengkap']) ?: 'emp-' . Str::lower(Str::random(6));
            $folder = 'employees/' . $slug . '/foto-profil';
            $filename = $slug . '_profil.' . ($file->extension() ?: 'jpg');
            $path = $file->storeAs($folder, $filename);
            if ($path) {
                $validated['foto_profil'] = $path;
            }
        }

        $employee = DB::transaction(function () use ($validated) {
            $employee = Employee::create($validated);

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
    public function show($id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        $data = $employee->toArray();
        $data['foto_url'] = $employee->foto_profil ? Storage::url($employee->foto_profil) : null;

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

        // Jika user mengganti foto lama dengan foto baru
        if ($request->hasFile('foto')) {
            // Hapus foto lama dari server agar tidak jadi file sampah (Orphan file)
            if ($employee->foto_profil) {
                Storage::delete($employee->foto_profil);
            }

            // Simpan foto baru
            $folder = 'employees/' . (Str::slug($employee->nama_lengkap) ?: 'emp-' . $employee->id) . '/foto-profil';
            $ext = $request->file('foto')->extension();
            $filename = (Str::slug($employee->nama_lengkap) ?: 'emp-' . $employee->id) . '_profil.' . $ext;
            $path = $request->file('foto')->storeAs($folder, $filename);
            $validated['foto_profil'] = $path;
        }

        $employee->update($validated);
        $newNip = trim((string) $employee->nip);

        if ($oldNip !== '' && $newNip !== '' && $newNip !== $oldNip) {
            User::where('username', $oldNip)->update([
                'username' => $newNip,
                'name' => $employee->nama_lengkap,
            ]);
        }

        return response()->json([
            'message' => 'Data pegawai berhasil diperbarui.',
            'data' => $employee,
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

        // Delete old photo
        if ($employee->foto_profil) {
            Storage::delete($employee->foto_profil);
        }

        $folder = 'employees/' . (Str::slug($employee->nama_lengkap) ?: 'emp-' . $employee->id) . '/foto-profil';
        $ext = $request->file('foto')->extension();
        $filename = (Str::slug($employee->nama_lengkap) ?: 'emp-' . $employee->id) . '_profil.' . $ext;
        $path = $request->file('foto')->storeAs($folder, $filename);
        $employee->update(['foto_profil' => $path]);

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

        // Operasi ini otomatis menjadi Soft Delete karena Trait SoftDeletes di Model (Issue #23)
        $employee->delete();

        // Deactivate associated user account and revoke existing tokens to prevent orphaned login
        if ($nip !== '' && ($user = User::where('username', $nip)->first())) {
            $user->update(['is_active' => false]);
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Data pegawai berhasil dihapus (soft delete).',
        ]);
    }

    /**
     * Protected select - untuk dropdown di form surat tugas & modul internal
     */
    public function select(Request $request): JsonResponse
    {
        $searchTerm = trim((string) ($request->input('q') ?? $request->input('search') ?? ''));

        $query = Employee::query()
            ->where('is_active', true)
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->where('nama_lengkap', 'NOT LIKE', '%superadmin%')
            ->where('nama_lengkap', 'NOT LIKE', '%magang%');

        if (! empty($searchTerm)) {
            $escapedTerm = addcslashes($searchTerm, '%_');
            $likeOp = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($escapedTerm, $likeOp) {
                $q->where('nama_lengkap', $likeOp, "%{$escapedTerm}%")
                    ->orWhere('nip', $likeOp, "%{$escapedTerm}%");
            });
        }

        $limit = min(200, max(1, $request->integer('limit', $request->integer('per_page', 200))));

        $employees = $query->orderBy('nama_lengkap', 'asc')
            ->limit($limit)
            ->get(['id', 'nama_lengkap', 'nip', 'jabatan', 'pangkat_golongan', 'satuan_kerja']);

        return response()->json([
            'data' => $employees->map(function ($emp) {
                return [
                    'id' => $emp->id,
                    'name' => $emp->nama_lengkap,
                    'nama_lengkap' => $emp->nama_lengkap,
                    'nama' => $emp->nama_lengkap,
                    'nip' => $emp->nip,
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
            'password' => ['required', 'string', 'min:8', 'max:255'],
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
        if ($user->role === 'super_admin' && $currentUser?->role !== 'super_admin') {
            return response()->json([
                'message' => 'Hanya Super Admin yang dapat mereset password akun Super Admin.',
            ], 403);
        }

        $user->update([
            'password' => $validated['password'],
        ]);

        // Revoke active sessions / bearer tokens upon password reset
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password berhasil direset.',
        ]);
    }

    /**
     * GET /api/kepegawaian/employees/{id}/assignment-letters
     * Mengambil riwayat surat tugas khusus untuk pegawai ini
     */
    public function assignmentLetters(Request $request, string $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $perPage = min(100, max(1, (int) $request->input('per_page', 10)));

        $letters = $employee->assignmentLetters()
            ->latest()
            ->paginate($perPage);

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
     * GET /api/kepegawaian/dashboard-stats
     * Mengambil data statistik real-time dari database untuk Kepegawaian Dashboard
     */
    public function dashboardStats(): JsonResponse
    {
        $baseQuery = Employee::query()
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->where('nama_lengkap', 'NOT LIKE', '%admin%')
            ->where('nama_lengkap', 'NOT LIKE', '%magang%')
            ->where('nama_lengkap', 'NOT LIKE', '%superadmin%')
            ->where(function ($q) {
                $q->whereNull('satuan_kerja')
                    ->orWhere('satuan_kerja', 'NOT LIKE', '%pusat%');
            });

        // 1. Total & Active Employees
        $totalEmployees = (clone $baseQuery)->count();
        $activeEmployees = (clone $baseQuery)->where('is_active', true)->count();
        $activeRate = $totalEmployees > 0 
            ? number_format(($activeEmployees / $totalEmployees) * 100, 1) . '%' 
            : '100%';

        // 2. Surat Tugas Aktif
        $activeStCount = AssignmentLetter::whereIn('status', ['DITERBITKAN', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'diterbitkan', 'approved', 'completed', 'published'])->count();

        // 3. Pending Leave Requests
        $pendingCutiCount = EmployeeLeaveRequest::whereIn(DB::raw('UPPER(status)'), ['PENGAJUAN', 'PENDING'])->count();

        // 4. Sebaran Satuan Kerja
        $satkerRaw = (clone $baseQuery)
            ->select('satuan_kerja', DB::raw('count(*) as count'))
            ->groupBy('satuan_kerja')
            ->get();

        $samarindaCount = 0;
        $berauCount = 0;
        $tenggarongCount = 0;
        $balikpapanCount = 0;

        foreach ($satkerRaw as $item) {
            $name = strtolower($item->satuan_kerja ?? '');
            if (str_contains($name, 'wilayah iii') || str_contains($name, 'wilayah 3') || str_contains($name, 'balikpapan')) {
                $balikpapanCount += $item->count;
            } elseif (str_contains($name, 'wilayah ii') || str_contains($name, 'wilayah 2') || str_contains($name, 'tenggarong') || str_contains($name, 'paser')) {
                $tenggarongCount += $item->count;
            } elseif (str_contains($name, 'wilayah i') || str_contains($name, 'wilayah 1') || str_contains($name, 'berau')) {
                $berauCount += $item->count;
            } elseif (str_contains($name, 'balai') || str_contains($name, 'samarinda') || str_contains($name, 'tata usaha')) {
                $samarindaCount += $item->count;
            } else {
                $samarindaCount += $item->count;
            }
        }

        $denom = max(1, $totalEmployees);
        $satkerBreakdown = [
            [
                'name' => 'Kantor Balai (Samarinda)',
                'count' => $samarindaCount,
                'percentage' => (int) round(($samarindaCount / $denom) * 100),
                'gradient' => 'from-blue-600 to-indigo-600',
                'dot' => 'bg-blue-500',
            ],
            [
                'name' => 'Seksi KSDA Wilayah I Berau',
                'count' => $berauCount,
                'percentage' => (int) round(($berauCount / $denom) * 100),
                'gradient' => 'from-sky-500 to-cyan-500',
                'dot' => 'bg-sky-400',
            ],
            [
                'name' => 'Seksi KSDA Wilayah II Tenggarong',
                'count' => $tenggarongCount,
                'percentage' => (int) round(($tenggarongCount / $denom) * 100),
                'gradient' => 'from-emerald-500 to-teal-500',
                'dot' => 'bg-emerald-400',
            ],
            [
                'name' => 'Seksi KSDA Wilayah III Balikpapan',
                'count' => $balikpapanCount,
                'percentage' => (int) round(($balikpapanCount / $denom) * 100),
                'gradient' => 'from-amber-500 to-orange-500',
                'dot' => 'bg-amber-400',
            ],
        ];

        // 5. Recent Surat Tugas
        $recentSt = AssignmentLetter::latest()->take(5)->get()->map(function ($st) {
            return [
                'id' => 'st-' . $st->id,
                'title' => $st->maksud_tujuan ?: ($st->nama_kegiatan ?: 'Melaksanakan Perjalanan Dinas'),
                'tempat_tujuan' => $st->tempat_tujuan ?: 'Kalimantan Timur',
                'status' => strtoupper($st->status ?: 'DITERBITKAN'),
                'tanggal_surat' => $st->created_at ? $st->created_at->format('d/m/Y') : 'Terbaru',
            ];
        });

        return response()->json([
            'message' => 'Statistik dashboard kepegawaian berhasil dimuat.',
            'data' => [
                'total_employees' => $totalEmployees,
                'active_employees' => $activeEmployees,
                'active_rate' => $activeRate,
                'active_surat_tugas' => $activeStCount,
                'pending_cuti' => $pendingCutiCount,
                'satker_breakdown' => $satkerBreakdown,
                'recent_activities' => $recentSt,
            ],
        ]);
    }
}
