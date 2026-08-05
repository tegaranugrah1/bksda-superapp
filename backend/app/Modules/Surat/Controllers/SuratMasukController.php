<?php

namespace App\Modules\Surat\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Surat\Models\SuratMasuk;
use App\Modules\Surat\Requests\SuratMasukRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SuratMasukController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SuratMasuk::with(['disposisi', 'creator'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('no_surat', 'like', "%{$search}%")
                  ->orWhere('no_agenda', 'like', "%{$search}%")
                  ->orWhere('asal_surat', 'like', "%{$search}%")
                  ->orWhere('isi_ringkas', 'like', "%{$search}%");
            });
        }

        if ($request->filled('sifat')) {
            $sifat = $request->input('sifat');
            $query->whereJsonContains('sifat_json', $sifat);
        }

        $requestedPerPage = (int) $request->input('per_page', 10);
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

    public function store(SuratMasukRequest $request): JsonResponse
    {
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            if ($request->hasFile('file_surat')) {
                $file = $request->file('file_surat');
                $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'pdf');
                $filename = uniqid('surat_masuk_') . '.' . $ext;
                $validated['file_path'] = $file->storeAs('surat/masuk', $filename, 'private');
            }

            $validated['created_by'] = $request->user()?->id;

            $noAgenda = $validated['no_agenda'] ?? null;
            if ($noAgenda) {
                $suratMasuk = SuratMasuk::updateOrCreate(
                    ['no_agenda' => $noAgenda],
                    $validated
                );
            } else {
                $suratMasuk = SuratMasuk::create($validated);
            }

            if (!empty($validated['disposisi'])) {
                $suratMasuk->disposisi()->updateOrCreate(
                    ['surat_masuk_id' => $suratMasuk->id],
                    $validated['disposisi']
                );
            }

            DB::commit();

            return response()->json([
                'message' => 'Surat Masuk berhasil disimpan.',
                'data' => $suratMasuk->load(['disposisi', 'creator']),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal menyimpan Surat Masuk',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function show(int $id): JsonResponse
    {
        $suratMasuk = SuratMasuk::with(['disposisi.kaSubbagTu', 'disposisi.kepalaBalai', 'creator'])
            ->findOrFail($id);

        return response()->json([
            'data' => $suratMasuk,
        ]);
    }

    public function update(SuratMasukRequest $request, int $id): JsonResponse
    {
        $suratMasuk = SuratMasuk::findOrFail($id);
        $validated = $request->validated();

        DB::beginTransaction();
        try {
            if ($request->hasFile('file_surat')) {
                if ($suratMasuk->file_path && Storage::disk('private')->exists($suratMasuk->file_path)) {
                    Storage::disk('private')->delete($suratMasuk->file_path);
                }
                $file = $request->file('file_surat');
                $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'pdf');
                $filename = uniqid('surat_masuk_') . '.' . $ext;
                $validated['file_path'] = $file->storeAs('surat/masuk', $filename, 'private');
            }

            $suratMasuk->update($validated);

            if (isset($validated['disposisi'])) {
                $suratMasuk->disposisi()->updateOrCreate(
                    ['surat_masuk_id' => $suratMasuk->id],
                    $validated['disposisi']
                );
            }

            DB::commit();

            return response()->json([
                'message' => 'Surat Masuk berhasil diperbarui.',
                'data' => $suratMasuk->fresh(['disposisi', 'creator']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Gagal memperbarui Surat Masuk',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        $suratMasuk = SuratMasuk::findOrFail($id);
        $suratMasuk->delete();

        return response()->json([
            'message' => 'Surat Masuk berhasil dihapus.',
        ]);
    }
}
