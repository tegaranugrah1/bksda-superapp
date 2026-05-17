<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Requests\EmployeeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
            // Gunakan ILIKE (PostgreSQL) agar pencarian case-insensitive
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nama_lengkap', 'ilike', "%{$searchTerm}%")
                    ->orWhere('nip', 'ilike', "%{$searchTerm}%");
            });
        }

        // Status filter opsional
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Ambil data dengan Pagination (default 10 baris per halaman)
        $perPage = $request->input('per_page', 10);
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

            // store() membuat nama file acak (Hash).
            // Default disk = s3 (RustFS) via FILESYSTEM_DISK env.
            $path = $file->store('employees/foto');
            $validated['foto_profil'] = $path;
        }

        $employee = Employee::create($validated);

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
            $path = $request->file('foto')->store('employees/foto');
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
            'foto' => 'required|image|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $employee = Employee::findOrFail($id);

        // Delete old photo
        if ($employee->foto_profil) {
            Storage::delete($employee->foto_profil);
        }

        $path = $request->file('foto')->store('employees/foto');
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
}
