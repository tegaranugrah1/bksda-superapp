<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Exports\AssetExport;
use App\Modules\Bmn\Imports\AssetImport;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Requests\DisposeAssetRequest;
use App\Modules\Bmn\Requests\StoreAssetRequest;
use App\Modules\Bmn\Requests\UpdateAssetRequest;
use App\Modules\Bmn\Resources\AssetResource;
use App\Modules\Bmn\Services\AssetService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssetController extends Controller
{
    public function __construct(private AssetService $assetService) {}

    public function index(Request $request)
    {
        $query = Asset::with('penanggungJawab')->latest();

        if ($request->query('status') === 'disposed') {
            $query->onlyTrashed();
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_barang', 'ilike', "%{$search}%")
                    ->orWhere('kode_barang', 'ilike', "%{$search}%")
                    ->orWhere('nup', 'ilike', "%{$search}%")
                    ->orWhere('merk', 'ilike', "%{$search}%")
                    ->orWhere('no_polisi', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('kondisi')) {
            $query->where('kondisi', $request->kondisi);
        }

        if ($request->filled('jenis_bmn')) {
            $query->where('jenis_bmn', $request->jenis_bmn);
        }

        return AssetResource::collection($query->paginate(20));
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
        $asset = Asset::with(['penanggungJawab', 'loans.borrower', 'maintenances', 'historyUpdates.author'])
            ->findOrFail($id);

        return response()->json(['data' => new AssetResource($asset)]);
    }

    public function update(UpdateAssetRequest $request, string $id): JsonResponse
    {
        try {
            $asset = $this->assetService->updateAsset($id, $request->validated(), $request->user()->id);

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

        $count = Asset::whereIn('id', $request->ids)->count();
        Asset::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => "{$count} aset berhasil di-dispose."]);
    }

    public function export(): BinaryFileResponse
    {
        return Excel::download(new AssetExport, 'Katalog_Aset_BKSDA.xlsx');
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:20480',
        ]);

        try {
            $import = new AssetImport;
            Excel::import($import, $request->file('file'));

            return response()->json([
                'message' => "Impor berhasil! {$import->getImportedCount()} aset BMN diproses.",
                'count' => $import->getImportedCount(),
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Gagal mengimpor data: '.$e->getMessage()], 422);
        }
    }
}
