<?php

namespace App\Modules\Surat\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Surat\Models\SuratKeluar;
use App\Modules\Surat\Requests\SuratKeluarRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SuratKeluarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SuratKeluar::with(['penandatangan', 'creator'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('no_surat', 'like', "%{$search}%")
                  ->orWhere('tujuan_surat', 'like', "%{$search}%")
                  ->orWhere('perihal', 'like', "%{$search}%");
            });
        }

        $perPageParam = $request->input('per_page', 15);
        if ($perPageParam === 'all') {
            $items = $query->get();
            return response()->json([
                'data' => $items,
                'meta' => [
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $items->count(),
                    'total' => $items->count(),
                ],
            ]);
        }

        $requestedPerPage = (int) $perPageParam;
        $perPage = min(max(1, $requestedPerPage), 100);
        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(SuratKeluarRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if ($request->hasFile('file_surat')) {
            $file = $request->file('file_surat');
            $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'pdf');
            $filename = uniqid('surat_keluar_') . '.' . $ext;
            $validated['file_path'] = $file->storeAs('surat/keluar', $filename, 'private');
        }

        $validated['created_by'] = $request->user()?->id;

        $suratKeluar = SuratKeluar::create($validated);

        return response()->json([
            'message' => 'Surat Keluar berhasil disimpan.',
            'data' => $suratKeluar->load(['penandatangan', 'creator']),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $suratKeluar = SuratKeluar::with(['penandatangan', 'creator'])
            ->findOrFail($id);

        return response()->json([
            'data' => $suratKeluar,
        ]);
    }

    public function update(SuratKeluarRequest $request, int $id): JsonResponse
    {
        $suratKeluar = SuratKeluar::findOrFail($id);
        $validated = $request->validated();

        if ($request->hasFile('file_surat')) {
            if ($suratKeluar->file_path && Storage::disk('private')->exists($suratKeluar->file_path)) {
                Storage::disk('private')->delete($suratKeluar->file_path);
            }
            $file = $request->file('file_surat');
            $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'pdf');
            $filename = uniqid('surat_keluar_') . '.' . $ext;
            $validated['file_path'] = $file->storeAs('surat/keluar', $filename, 'private');
        }

        $suratKeluar->update($validated);

        return response()->json([
            'message' => 'Surat Keluar berhasil diperbarui.',
            'data' => $suratKeluar->fresh(['penandatangan', 'creator']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $suratKeluar = SuratKeluar::findOrFail($id);
        $suratKeluar->delete();

        return response()->json([
            'message' => 'Surat Keluar berhasil dihapus.',
        ]);
    }
}
