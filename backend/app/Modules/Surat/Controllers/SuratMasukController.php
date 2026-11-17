<?php

namespace App\Modules\Surat\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Surat\Exports\SuratMasukExport;
use App\Modules\Surat\Models\SuratMasuk;
use App\Modules\Surat\Requests\SuratMasukRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class SuratMasukController extends Controller
{
    public function exportExcel(Request $request)
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:255',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'year' => 'nullable|integer|digits:4',
            'month' => 'nullable|integer|between:1,12',
            'sifat' => 'nullable|string|max:100',
        ]);

        $filename = 'Rekap_Surat_Masuk_BKSDA_' . date('Ymd_His') . '.xlsx';
        if (!empty($filters['year'])) {
            $cleanYear = preg_replace('/[^0-9]/', '', (string) $filters['year']);
            $cleanMonth = !empty($filters['month']) ? sprintf('_%02d', (int) $filters['month']) : '';
            if ($cleanYear !== '') {
                $filename = 'Rekap_Surat_Masuk_BKSDA_' . $cleanYear . $cleanMonth . '.xlsx';
            }
        }

        return Excel::download(new SuratMasukExport($filters), $filename);
    }
    public function index(Request $request): JsonResponse
    {
        $query = SuratMasuk::with(['disposisi', 'creator'])
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $pattern = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], trim((string) $request->input('search'))) . '%';
            $query->where(function ($q) use ($pattern) {
                $q->whereRaw("no_surat LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("no_agenda LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("asal_surat LIKE ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("isi_ringkas LIKE ? ESCAPE '!'", [$pattern]);
            });
        }

        $sifat = $request->input('sifat');
        if (is_string($sifat) && trim($sifat) !== '') {
            $query->whereJsonContains('sifat_json', trim($sifat));
        }

        $perPageParam = $request->input('per_page', 10);
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

    public function nextAgenda(Request $request): JsonResponse
    {
        $year = (int) ($request->input('year') ?: date('Y'));
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $maxNumber = DB::table('surat_masuk')
                ->whereYear('tanggal_agenda', $year)
                ->whereNull('deleted_at')
                ->selectRaw("COALESCE(MAX(CAST(NULLIF(regexp_replace(no_agenda, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) as max_val")
                ->value('max_val');
        } else {
            // Driver-agnostic fallback for SQLite in automated tests
            $allAgendas = DB::table('surat_masuk')
                ->whereYear('tanggal_agenda', $year)
                ->whereNull('deleted_at')
                ->pluck('no_agenda');

            $maxNumber = 0;
            foreach ($allAgendas as $agenda) {
                $num = (int) preg_replace('/[^0-9]/', '', (string)$agenda);
                if ($num > $maxNumber) {
                    $maxNumber = $num;
                }
            }
        }

        $next = (int) $maxNumber + 1;

        return response()->json([
            'next_agenda' => (string) $next,
            'year' => $year,
        ]);
    }

    public function locations(): JsonResponse
    {
        $locations = DB::table('bmn_locations')
            ->where('is_active', true)
            ->select('id', 'parent_id', 'location_type', 'name', 'unit_kerja', 'code', 'is_restricted', 'is_active')
            ->orderBy('unit_kerja')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $locations,
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
                $validated['file_path'] = $file->storeAs('surat/masuk', $filename, 'local');
            }

            $validated['created_by'] = $request->user()?->id;

            $suratMasuk = SuratMasuk::create($validated);

            if (!empty($validated['disposisi'])) {
                $suratMasuk->disposisi()->create($validated['disposisi']);
            }

            DB::commit();

            return response()->json([
                'message' => 'Surat Masuk berhasil disimpan.',
                'data' => $suratMasuk->load(['disposisi', 'creator']),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            if (!empty($validated['file_path']) && Storage::disk('local')->exists($validated['file_path'])) {
                Storage::disk('local')->delete($validated['file_path']);
            }
            return response()->json([
                'error' => 'Gagal menyimpan Surat Masuk',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat menyimpan Surat Masuk.',
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

    public function downloadFile(int $id)
    {
        $suratMasuk = SuratMasuk::findOrFail($id);
        if (! $suratMasuk->file_path || ! Storage::disk('local')->exists($suratMasuk->file_path)) {
            return response()->json(['message' => 'Berkas surat masuk tidak ditemukan.'], 404);
        }

        return Storage::disk('local')->response($suratMasuk->file_path, basename($suratMasuk->file_path), [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    public function update(SuratMasukRequest $request, int $id): JsonResponse
    {
        $suratMasuk = SuratMasuk::findOrFail($id);
        $validated = $request->validated();
        $oldFilePath = $suratMasuk->file_path;
        $newFilePath = null;

        DB::beginTransaction();
        try {
            if ($request->hasFile('file_surat')) {
                $file = $request->file('file_surat');
                $ext = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'pdf');
                $filename = uniqid('surat_masuk_') . '.' . $ext;
                $newFilePath = $file->storeAs('surat/masuk', $filename, 'local');
                $validated['file_path'] = $newFilePath;
            }

            $suratMasuk->update($validated);

            if (isset($validated['disposisi'])) {
                $suratMasuk->disposisi()->updateOrCreate(
                    ['surat_masuk_id' => $suratMasuk->id],
                    $validated['disposisi']
                );
            }

            DB::commit();

            if ($newFilePath && $oldFilePath && $oldFilePath !== $newFilePath && Storage::disk('local')->exists($oldFilePath)) {
                Storage::disk('local')->delete($oldFilePath);
            }

            return response()->json([
                'message' => 'Surat Masuk berhasil diperbarui.',
                'data' => $suratMasuk->fresh(['disposisi', 'creator']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($newFilePath && Storage::disk('local')->exists($newFilePath)) {
                Storage::disk('local')->delete($newFilePath);
            }
            return response()->json([
                'error' => 'Gagal memperbarui Surat Masuk',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memperbarui Surat Masuk.',
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
