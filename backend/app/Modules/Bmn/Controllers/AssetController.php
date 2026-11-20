<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Exports\AssetExport;
use App\Modules\Bmn\Imports\AssetImport;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Bmn\Requests\DisposeAssetRequest;
use App\Modules\Bmn\Requests\StoreAssetRequest;
use App\Modules\Bmn\Requests\UpdateAssetRequest;
use App\Modules\Bmn\Resources\AssetResource;
use App\Modules\Bmn\Services\AssetService;
use App\Support\Security\UploadValidationRules;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssetController extends Controller
{
    public function __construct(private AssetService $assetService) {}

    public function index(Request $request)
    {
        $query = Asset::with(['penanggungJawab', 'tags', 'loans' => function ($q) {
            $q->active()->with('borrower')->latest('tanggal_pinjam');
        }]);

        $isDisposed = $request->query('status') === 'disposed';
        if ($isDisposed) {
            if (! $request->user()?->hasPermission('bmn.asset.dispose')) {
                abort(403, 'Anda tidak memiliki hak akses untuk melihat daftar aset dihapus.');
            }
            $query->onlyTrashed();
        }

        $query->applyCatalogFilters($request->all())
            ->applyCatalogSort($request->input('sort'));

        $perPage = $this->resolvePerPage($request, default: 10, mobileMax: 100, webMax: 2000);
        $assets = $query->paginate($perPage);
        $years = Asset::query()
            ->when($isDisposed, fn ($q) => $q->onlyTrashed())
            ->whereNotNull('tahun_perolehan')
            ->distinct()
            ->orderByDesc('tahun_perolehan')
            ->pluck('tahun_perolehan')
            ->map(fn ($y) => (int) $y)
            ->values()
            ->all();

        return AssetResource::collection($assets)->additional([
            'filter_options' => [
                'years' => $years,
            ],
        ]);
    }

    private function resolvePerPage(Request $request, int $default = 10, int $mobileMax = 100, int $webMax = 500): int
    {
        $requested = max(1, $request->integer('per_page', $default));
        $isMobile = $request->boolean('mobile') || $request->header('X-Client') === 'mobile';

        return min($requested, $isMobile ? $mobileMax : $webMax);
    }

    public function store(StoreAssetRequest $request): JsonResponse
    {
        try {
            $asset = $this->assetService->storeAsset($request->validated());

            return response()->json(['message' => 'Aset BMN resmi tercatat.', 'data' => new AssetResource($asset)], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function show(string $id): JsonResponse
    {
        $asset = Asset::with(['penanggungJawab', 'tags', 'loans.borrower', 'maintenances', 'historyUpdates.author'])
            ->findOrFail($id);

        return response()->json(['data' => new AssetResource($asset)]);
    }

    public function update(UpdateAssetRequest $request, string $id): JsonResponse
    {
        try {
            $asset = $this->assetService->updateAsset($id, $request->validated(), $request->user()->id);
            $asset->load(['penanggungJawab', 'tags', 'loans.borrower', 'maintenances', 'historyUpdates.author']);

            return response()->json(['message' => 'Perubahan aset berhasil direkam.', 'data' => new AssetResource($asset)]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function dispose(DisposeAssetRequest $request, string $id): JsonResponse
    {
        try {
            $this->assetService->disposeAsset($id, $request->user()->id, $request->alasan_pemutihan);

            return response()->json(['message' => 'Aset berhasil diistirahatkan dari operasional aktif.']);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function bulkDispose(Request $request): JsonResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'string']);

        $count = DB::transaction(function () use ($request) {
            $assets = Asset::whereIn('id', $request->ids)->get();
            if ($assets->isEmpty()) {
                return 0;
            }
            $this->assetService->notifyDisposedAssets($assets);
            Asset::whereIn('id', $assets->pluck('id'))->delete();

            return $assets->count();
        });

        return response()->json(['message' => "{$count} aset berhasil di-dispose."]);
    }

    public function bulkRestore(Request $request): JsonResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'string']);

        $count = DB::transaction(function () use ($request) {
            $assets = Asset::onlyTrashed()->whereIn('id', $request->ids)->get();
            if ($assets->isEmpty()) {
                return 0;
            }
            Asset::onlyTrashed()->whereIn('id', $assets->pluck('id'))->restore();
            $this->assetService->notifyRestoredAssets($assets);

            return $assets->count();
        });

        return response()->json(['message' => "{$count} aset berhasil di-restore."]);
    }

    public function bulkForceDelete(Request $request): JsonResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'string']);

        $assets = Asset::onlyTrashed()->whereIn('id', $request->ids)->get();
        $count = $assets->count();

        foreach ($assets as $asset) {
            $asset->forceDelete();
        }

        return response()->json(['message' => "{$count} aset dihapus permanen."]);
    }

    public function bulkUpdateKondisi(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'string',
            'kondisi' => 'required|in:Baik,Rusak Ringan,Rusak Berat',
        ]);

        $userId = $request->user()->id;

        DB::transaction(function () use ($request, $userId) {
            $assets = Asset::whereIn('id', $request->ids)->get();
            foreach ($assets as $asset) {
                $oldKondisi = $asset->kondisi;
                if ($oldKondisi !== $request->kondisi) {
                    AssetUpdate::create([
                        'asset_id' => $asset->id,
                        'user_id' => $userId,
                        'field_changed' => 'kondisi',
                        'old_value' => $oldKondisi,
                        'new_value' => $request->kondisi,
                        'alasan_perubahan' => 'Bulk update kondisi',
                    ]);
                    $this->assetService->notifyConditionCritical($asset, $oldKondisi, $request->kondisi);
                }
            }

            Asset::whereIn('id', $request->ids)->update(['kondisi' => $request->kondisi]);
        });

        return response()->json(['message' => count($request->ids) . " aset diubah ke {$request->kondisi}."]);
    }

    public function verify(Request $request, string $id): JsonResponse
    {
        $asset = Asset::findOrFail($id);
        $asset->update([
            'verified_at' => now(),
            'verified_by' => $request->user()->id,
        ]);

        // Log to history
        AssetUpdate::create([
            'asset_id' => $asset->id,
            'user_id' => $request->user()->id,
            'field_changed' => 'verified_at',
            'old_value' => null,
            'new_value' => now()->toDateTimeString(),
            'alasan_perubahan' => 'Verifikasi BMN',
        ]);

        return response()->json([
            'message' => 'Aset berhasil diverifikasi.',
            'verified_at' => $asset->verified_at->toIso8601String(),
        ]);
    }

    public function export(Request $request): BinaryFileResponse
    {
        return Excel::download(
            new AssetExport(
                includeNupLama: $request->boolean('include_nup_lama', true),
                filters: $request->all()
            ),
            'Katalog_Aset_BKSDA.xlsx'
        );
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => UploadValidationRules::spreadsheet(),
        ]);

        try {
            $import = new AssetImport;
            Excel::import($import, $request->file('file'));
            $this->assetService->notifyBulkAssigned($import->getAssignedByEmployee());

            return response()->json([
                'message' => "Impor berhasil! {$import->getImportedCount()} aset BMN diproses.",
                'count' => $import->getImportedCount(),
            ]);
        } catch (Exception $e) {
            Log::warning('BMN direct asset import failed.', [
                'user_id' => $request->user()?->id,
                'filename' => $request->file('file')?->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Gagal mengimpor data. Pastikan format dan isi template sudah sesuai.'], 422);
        }
    }
}
