<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\StTaskType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StTaskTypeController extends Controller
{
    /**
     * Public list of active task types for form submission and ST builder.
     */
    public function publicList(): JsonResponse
    {
        $types = StTaskType::query()
            ->where('is_active', true)
            ->orderBy('urutan', 'asc')
            ->orderBy('id', 'asc')
            ->get(['id', 'nama', 'kode', 'mode_lokasi', 'aturan_durasi', 'default_sertakan_laporan', 'contoh_format', 'keterangan']);

        return response()->json([
            'status' => 'success',
            'data' => $types,
        ]);
    }

    /**
     * Admin index with search & status filter.
     */
    public function index(Request $request): JsonResponse
    {
        $query = StTaskType::query();

        if ($search = trim((string) $request->input('search'))) {
            $escapedSearch = addcslashes($search, '%_');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($escapedSearch, $likeOp) {
                $q->where('nama', $likeOp, "%{$escapedSearch}%")
                  ->orWhere('kode', $likeOp, "%{$escapedSearch}%")
                  ->orWhere('keterangan', $likeOp, "%{$escapedSearch}%");
            });
        }

        if ($status = $request->input('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $items = $query->orderBy('urutan', 'asc')->orderBy('id', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $items,
        ]);
    }

    /**
     * Store new task type (Admin).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kode' => ['nullable', 'string', 'max:100', Rule::unique('st_task_types', 'kode')->whereNull('deleted_at')],
            'mode_lokasi' => ['required', 'string', 'in:luar_wilayah,dalam_kawasan,tempat_saja'],
            'aturan_durasi' => ['required', 'string', 'in:fleksibel,wajib_1_hari'],
            'default_sertakan_laporan' => ['nullable', 'boolean'],
            'contoh_format' => ['nullable', 'string', 'max:1000'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (empty($validated['kode'])) {
            $base = Str::slug($validated['nama'], '_');
            $slug = $base;
            $counter = 1;
            while (StTaskType::where('kode', $slug)->exists()) {
                $slug = "{$base}_{$counter}";
                $counter++;
            }
            $validated['kode'] = $slug;
        }

        $validated['created_by'] = $request->user()?->id;
        $validated['is_active'] = $request->boolean('is_active', true);
        $validated['default_sertakan_laporan'] = $request->boolean('default_sertakan_laporan', true);
        if (isset($validated['nama'])) $validated['nama'] = strip_tags(trim((string) $validated['nama']));
        if (isset($validated['contoh_format'])) $validated['contoh_format'] = strip_tags(trim((string) $validated['contoh_format']));
        if (isset($validated['keterangan'])) $validated['keterangan'] = strip_tags(trim((string) $validated['keterangan']));

        $type = StTaskType::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Jenis tugas berhasil ditambahkan.',
            'data' => $type,
        ], 201);
    }

    /**
     * Update existing task type (Admin).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $type = StTaskType::findOrFail($id);

        $validated = $request->validate([
            'nama' => ['sometimes', 'required', 'string', 'max:255'],
            'kode' => ['sometimes', 'required', 'string', 'max:100', Rule::unique('st_task_types', 'kode')->ignore($type->id)->whereNull('deleted_at')],
            'mode_lokasi' => ['sometimes', 'required', 'string', 'in:luar_wilayah,dalam_kawasan,tempat_saja'],
            'aturan_durasi' => ['sometimes', 'required', 'string', 'in:fleksibel,wajib_1_hari'],
            'default_sertakan_laporan' => ['nullable', 'boolean'],
            'contoh_format' => ['nullable', 'string', 'max:1000'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $validated['updated_by'] = $request->user()?->id;
        if (isset($validated['nama'])) $validated['nama'] = strip_tags(trim((string) $validated['nama']));
        if (isset($validated['contoh_format'])) $validated['contoh_format'] = strip_tags(trim((string) $validated['contoh_format']));
        if (isset($validated['keterangan'])) $validated['keterangan'] = strip_tags(trim((string) $validated['keterangan']));

        $type->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Jenis tugas berhasil diperbarui.',
            'data' => $type,
        ]);
    }

    /**
     * Delete task type (Admin).
     */
    public function destroy(int $id): JsonResponse
    {
        $type = StTaskType::findOrFail($id);
        $type->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Jenis tugas berhasil dihapus.',
        ]);
    }
}
