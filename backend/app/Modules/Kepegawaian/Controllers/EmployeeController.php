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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EmployeeController extends Controller
{
    /**
     * Rule 3.1: Wajib Pagination dan Search
     */
    public function index(Request $request): JsonResponse
    {
        $query = Employee::query();

        // Ambil parameter pencarian dari URL (?search=...)
        $searchTerm = $request->input('search');

        if (! empty($searchTerm)) {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nama_lengkap', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('nip', 'LIKE', "%{$searchTerm}%");
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
     * Rule 1.4 & 4.4: Sanitasi dan Upload File ke Private Storage
     */
    public function store(EmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Jika user melampirkan file foto
        if ($request->hasFile('foto')) {
            $file = $request->file('foto');

            $path = $file->store('employees/foto');
            $validated['foto_profil'] = $path;
        }

        $employee = Employee::create($validated);

        // Re-store photo with proper folder structure after employee is created
        if (isset($validated['foto_profil'])) {
            $oldPath = $validated['foto_profil'];
            $folder = 'employees/' . Str::slug($employee->nama_lengkap) . '/foto-profil';
            $ext = pathinfo($oldPath, PATHINFO_EXTENSION);
            $filename = Str::slug($employee->nama_lengkap) . '_profil.' . $ext;
            $newPath = $folder . '/' . $filename;

            // Move file to proper folder
            if (Storage::exists($oldPath)) {
                Storage::move($oldPath, $newPath);
                $employee->update(['foto_profil' => $newPath]);
            }
        }

        // Auto-create user account with default password '123'
        if (!User::where('username', $employee->nip)->exists()) {
            User::create([
                'name' => $employee->nama_lengkap,
                'username' => $employee->nip,
                'password' => Hash::make('123'),
                'role' => 'pegawai',
            ]);
        }

        return response()->json([
            'message' => 'Data pegawai berhasil ditambahkan.',
            'data' => $employee,
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
        $validated = $request->validated();

        // Jika user mengganti foto lama dengan foto baru
        if ($request->hasFile('foto')) {
            // Hapus foto lama dari server agar tidak jadi file sampah (Orphan file)
            if ($employee->foto_profil) {
                Storage::delete($employee->foto_profil);
            }

            // Simpan foto baru
            $folder = 'employees/' . Str::slug($employee->nama_lengkap) . '/foto-profil';
            $ext = $request->file('foto')->extension();
            $filename = Str::slug($employee->nama_lengkap) . '_profil.' . $ext;
            $path = $request->file('foto')->storeAs($folder, $filename);
            $validated['foto_profil'] = $path;
        }

        $employee->update($validated);

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

        // Delete old photo
        if ($employee->foto_profil) {
            Storage::delete($employee->foto_profil);
        }

        $folder = 'employees/' . Str::slug($employee->nama_lengkap) . '/foto-profil';
        $ext = $request->file('foto')->extension();
        $filename = Str::slug($employee->nama_lengkap) . '_profil.' . $ext;
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
    public function destroy($id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        // Operasi ini otomatis menjadi Soft Delete karena Trait SoftDeletes di Model (Issue #23)
        $employee->delete();

        return response()->json([
            'message' => 'Data pegawai berhasil dihapus (soft delete).',
        ]);
    }

    /**
     * Public select - untuk dropdown di form surat tugas
     * Rate limited: 30 per menit
     */
    public function select(Request $request): JsonResponse
    {
        $searchTerm = $request->input('q', '');

        $query = Employee::query()->where('is_active', true);

        if (! empty($searchTerm)) {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nama_lengkap', 'ilike', "%{$searchTerm}%")
                    ->orWhere('nip', 'ilike', "%{$searchTerm}%");
            });
        }

        $employees = $query->orderBy('nama_lengkap', 'asc')
            ->limit(200)
            ->get(['id', 'nama_lengkap', 'nip', 'jabatan', 'satuan_kerja']);

        return response()->json([
            'data' => $employees->map(function ($emp) {
                return [
                    'id' => $emp->id,
                    'name' => $emp->nama_lengkap,
                    'nip' => $emp->nip,
                    'department' => $emp->satuan_kerja,
                    'position' => $emp->jabatan,
                ];
            }),
        ]);
    }

    /**
     * POST /api/kepegawaian/employees/{id}/reset-password
     * Reset password pegawai ke default '123'
     */
    public function resetPassword($id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        $user = User::where('username', $employee->nip)->first();

        if (!$user) {
            return response()->json([
                'message' => 'Akun user untuk pegawai ini tidak ditemukan.',
            ], 404);
        }

        $user->update([
            'password' => Hash::make('123'),
        ]);

        return response()->json([
            'message' => 'Password berhasil direset ke default.',
        ]);
    }

    /**
     * GET /api/kepegawaian/employees/{id}/assignment-letters
     * Mengambil riwayat surat tugas khusus untuk pegawai ini
     */
    public function assignmentLetters(string $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        $letters = $employee->assignmentLetters()
            ->latest()
            ->paginate(10);

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
        // 1. Total & Active Employees
        $totalEmployees = Employee::count();
        $activeEmployees = Employee::where('is_active', true)->count();
        $activeRate = $totalEmployees > 0 
            ? number_format(($activeEmployees / $totalEmployees) * 100, 1) . '%' 
            : '100%';

        // 2. Surat Tugas Aktif
        $activeStCount = AssignmentLetter::whereIn('status', ['DITERBITKAN', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'diterbitkan', 'approved', 'completed', 'published'])->count();

        // 3. Pending Leave Requests
        $pendingCutiCount = EmployeeLeaveRequest::whereIn('status', ['PENDING', 'pending'])->count();

        // 4. Sebaran Satuan Kerja
        $satkerRaw = Employee::select('satuan_kerja', DB::raw('count(*) as count'))
            ->groupBy('satuan_kerja')
            ->get();

        $samarindaCount = 0;
        $berauCount = 0;
        $tenggarongCount = 0;
        $balikpapanCount = 0;

        foreach ($satkerRaw as $item) {
            $name = strtolower($item->satuan_kerja ?? '');
            if (str_contains($name, 'samarinda') || str_contains($name, 'pusat') || str_contains($name, 'balai')) {
                $samarindaCount += $item->count;
            } elseif (str_contains($name, 'berau') || str_contains($name, 'wilayah i') || str_contains($name, 'wilayah 1')) {
                $berauCount += $item->count;
            } elseif (str_contains($name, 'tenggarong') || str_contains($name, 'wilayah ii') || str_contains($name, 'wilayah 2') || str_contains($name, 'paser')) {
                $tenggarongCount += $item->count;
            } elseif (str_contains($name, 'balikpapan') || str_contains($name, 'wilayah iii') || str_contains($name, 'wilayah 3')) {
                $balikpapanCount += $item->count;
            } else {
                $samarindaCount += $item->count;
            }
        }

        if ($totalEmployees > 0 && ($samarindaCount + $berauCount + $tenggarongCount + $balikpapanCount) === 0) {
            $samarindaCount = (int) round($totalEmployees * 0.35);
            $berauCount = (int) round($totalEmployees * 0.25);
            $tenggarongCount = (int) round($totalEmployees * 0.25);
            $balikpapanCount = max(0, $totalEmployees - ($samarindaCount + $berauCount + $tenggarongCount));
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
