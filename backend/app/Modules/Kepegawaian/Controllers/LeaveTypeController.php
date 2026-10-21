<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\LeaveType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeaveTypeController extends Controller
{
    private function cleanString(?string $val): ?string
    {
        if ($val === null) return null;
        $stripped = preg_replace('#<script(.*?)>(.*?)</script>#is', '', $val);
        $clean = trim(strip_tags($stripped));
        return $clean === '' ? null : $clean;
    }
    /**
     * Display a listing of leave types.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['super_admin', 'admin'], true);

        $query = LeaveType::query();

        // If not admin or 'all' not explicitly requested, return only active leave types
        if (!$isAdmin || !$request->boolean('all')) {
            $query->where('is_active', true);
        }

        if ($request->filled('search')) {
            $search = strip_tags(trim((string) $request->query('search')));
            $likeOp = config('database.default') === 'pgsql' ? 'ILIKE' : 'LIKE';
            $query->where(function ($q) use ($search, $likeOp) {
                $q->where('nama', $likeOp, "%{$search}%")
                  ->orWhere('kode', $likeOp, "%{$search}%")
                  ->orWhere('keterangan', $likeOp, "%{$search}%");
            });
        }

        $items = $query->orderBy('urutan', 'asc')->orderBy('id', 'asc')->get();

        return response()->json([
            'data' => $items,
        ]);
    }

    /**
     * Display the specified leave type.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['super_admin', 'admin'], true);

        $query = LeaveType::query();
        if (!$isAdmin) {
            $query->where('is_active', true);
        }

        $item = $query->findOrFail($id);

        return response()->json([
            'data' => $item,
        ]);
    }

    /**
     * Store a newly created leave type.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:150', Rule::unique('kpg_leave_types', 'nama')->whereNull('deleted_at')],
            'kode' => ['nullable', 'string', 'max:30'],
            'hitung_hari' => ['required', 'string', Rule::in(['hari_kerja', 'hari_kalender'])],
            'potong_kuota_tahunan' => ['required', 'boolean'],
            'maks_hari' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'urutan' => ['nullable', 'integer', 'min:0'],
        ]);

        $item = LeaveType::create([
            'nama' => $this->cleanString($validated['nama']),
            'kode' => !empty($validated['kode']) ? strtoupper($this->cleanString($validated['kode'])) : null,
            'hitung_hari' => $validated['hitung_hari'],
            'potong_kuota_tahunan' => (bool) $validated['potong_kuota_tahunan'],
            'maks_hari' => isset($validated['maks_hari']) ? (int) $validated['maks_hari'] : null,
            'keterangan' => $this->cleanString($validated['keterangan'] ?? null),
            'is_active' => $validated['is_active'] ?? true,
            'urutan' => $validated['urutan'] ?? 0,
        ]);

        return response()->json([
            'message' => 'Jenis cuti berhasil ditambahkan',
            'data' => $item,
        ], 201);
    }

    /**
     * Update the specified leave type.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $item = LeaveType::findOrFail($id);

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:150', Rule::unique('kpg_leave_types', 'nama')->ignore($item->id)->whereNull('deleted_at')],
            'kode' => ['nullable', 'string', 'max:30'],
            'hitung_hari' => ['required', 'string', Rule::in(['hari_kerja', 'hari_kalender'])],
            'potong_kuota_tahunan' => ['required', 'boolean'],
            'maks_hari' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'urutan' => ['nullable', 'integer', 'min:0'],
        ]);

        $item->update([
            'nama' => $this->cleanString($validated['nama']),
            'kode' => !empty($validated['kode']) ? strtoupper($this->cleanString($validated['kode'])) : null,
            'hitung_hari' => $validated['hitung_hari'],
            'potong_kuota_tahunan' => (bool) $validated['potong_kuota_tahunan'],
            'maks_hari' => isset($validated['maks_hari']) ? (int) $validated['maks_hari'] : null,
            'keterangan' => $this->cleanString($validated['keterangan'] ?? null),
            'is_active' => $validated['is_active'] ?? $item->is_active,
            'urutan' => $validated['urutan'] ?? $item->urutan,
        ]);

        return response()->json([
            'message' => 'Jenis cuti berhasil diperbarui',
            'data' => $item,
        ]);
    }

    /**
     * Toggle active status.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $item = LeaveType::findOrFail($id);
        $item->is_active = !$item->is_active;
        $item->save();

        return response()->json([
            'message' => 'Status jenis cuti berhasil diubah',
            'data' => $item,
        ]);
    }

    /**
     * Remove the specified leave type.
     */
    public function destroy(int $id): JsonResponse
    {
        $item = LeaveType::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Jenis cuti berhasil dihapus',
        ]);
    }
}
