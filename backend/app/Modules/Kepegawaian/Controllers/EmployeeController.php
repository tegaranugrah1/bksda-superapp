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

            // store() secara otomatis membuat nama file acak (Hash) sesuai Rule 4.3.
            // Di Laravel 11, default disk adalah 'local' yang mengarah ke `storage/app/private/` (Rule 4.4).
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

        return response()->json([
            'message' => 'Detail pegawai ditemukan.',
            'data' => $employee,
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
            ->limit(50)
            ->get(['id', 'nama_lengkap', 'nip', 'jabatan', 'unit_kerja']);

        return response()->json([
            'data' => $employees->map(function ($emp) {
                return [
                    'id' => $emp->id,
                    'name' => $emp->nama_lengkap,
                    'nip' => $emp->nip,
                    'department' => $emp->unit_kerja,
                    'position' => $emp->jabatan,
                ];
            }),
        ]);
    }
}
