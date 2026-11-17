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
    private function isScopedToOwnLetters(Request $request): bool
    {
        return ! $request->user()?->isAdminFor('surat');
    }

    private function findAuthorizedSuratKeluar(Request $request, int $id): SuratKeluar
    {
        $suratKeluar = SuratKeluar::findOrFail($id);
        if ($this->isScopedToOwnLetters($request) && (int) $suratKeluar->created_by !== (int) $request->user()?->id) {
            abort(403, 'Anda hanya dapat mengakses surat keluar yang Anda input sendiri.');
        }

        return $suratKeluar;
    }

    public function index(Request $request): JsonResponse
    {
        $query = SuratKeluar::with(['penandatangan', 'creator'])
            ->orderBy('id', 'desc');

        if ($this->isScopedToOwnLetters($request)) {
            $query->where('created_by', (int) $request->user()?->id);
        }

        if ($request->filled('search')) {
            $pattern = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim((string) $request->input('search'))) . '%';
            $query->where(function ($q) use ($pattern) {
                $q->whereRaw("no_surat LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("tujuan_surat LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("perihal LIKE ? ESCAPE '!'", [$pattern]);
            });
        }

        $perPageParam = $request->input('per_page', 15);
        if ($perPageParam === 'all') {
            $items = $query->limit(1000)->get();
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

    private function storeUploadedFile(SuratKeluarRequest $request): ?string
    {
        if (! $request->hasFile('file_surat')) {
            return null;
        }
        $file = $request->file('file_surat');
        $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'pdf');
        return $file->storeAs('surat/keluar', uniqid('surat_keluar_') . '.' . $ext, 'local');
    }

    public function store(SuratKeluarRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $newFilePath = $this->storeUploadedFile($request);
        if ($newFilePath) {
            $validated['file_path'] = $newFilePath;
        }
        $validated['created_by'] = $request->user()?->id;

        try {
            $suratKeluar = SuratKeluar::create($validated);
        } catch (\Throwable $e) {
            if ($newFilePath && Storage::disk('local')->exists($newFilePath)) {
                Storage::disk('local')->delete($newFilePath);
            }
            throw $e;
        }

        return response()->json([
            'message' => 'Surat Keluar berhasil disimpan.',
            'data' => $suratKeluar->load(['penandatangan', 'creator']),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $suratKeluar = $this->findAuthorizedSuratKeluar($request, $id)->load(['penandatangan', 'creator']);

        return response()->json([
            'data' => $suratKeluar,
        ]);
    }

    public function downloadFile(Request $request, int $id)
    {
        $suratKeluar = $this->findAuthorizedSuratKeluar($request, $id);
        if (! $suratKeluar->file_path || ! Storage::disk('local')->exists($suratKeluar->file_path)) {
            return response()->json(['message' => 'Berkas surat keluar tidak ditemukan.'], 404);
        }

        return Storage::disk('local')->response($suratKeluar->file_path, basename($suratKeluar->file_path), [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    public function update(SuratKeluarRequest $request, int $id): JsonResponse
    {
        $suratKeluar = $this->findAuthorizedSuratKeluar($request, $id);
        $validated = $request->validated();
        $oldFilePath = $suratKeluar->file_path;
        $newFilePath = $this->storeUploadedFile($request);
        if ($newFilePath) {
            $validated['file_path'] = $newFilePath;
        }

        try {
            $suratKeluar->update($validated);
        } catch (\Throwable $e) {
            if ($newFilePath && Storage::disk('local')->exists($newFilePath)) {
                Storage::disk('local')->delete($newFilePath);
            }
            throw $e;
        }

        if ($newFilePath && $oldFilePath && $oldFilePath !== $newFilePath && Storage::disk('local')->exists($oldFilePath)) {
            Storage::disk('local')->delete($oldFilePath);
        }

        return response()->json([
            'message' => 'Surat Keluar berhasil diperbarui.',
            'data' => $suratKeluar->fresh(['penandatangan', 'creator']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $suratKeluar = $this->findAuthorizedSuratKeluar($request, $id);
        $suratKeluar->delete();

        return response()->json([
            'message' => 'Surat Keluar berhasil dihapus.',
        ]);
    }
}
