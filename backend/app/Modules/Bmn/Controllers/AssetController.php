<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Services\AssetService;
use App\Modules\Bmn\Requests\StoreAssetRequest;
use App\Modules\Bmn\Requests\UpdateAssetRequest;
use App\Modules\Bmn\Requests\DisposeAssetRequest;
use Exception;

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
                  ->orWhere('nup', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    public function store(StoreAssetRequest $request)
    {
        try {
            $asset = $this->assetService->storeAsset($request->validated());
            return response()->json(['message' => 'Aset BMN resmi tercatat.', 'data' => $asset], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function show(string $id)
    {
        $asset = Asset::with(['penanggungJawab', 'loans.borrower', 'maintenances', 'historyUpdates.author'])
            ->findOrFail($id);
        return response()->json(['data' => $asset]);
    }

    public function update(UpdateAssetRequest $request, string $id)
    {
        try {
            $asset = $this->assetService->updateAsset($id, $request->validated(), $request->user()->id);
            return response()->json(['message' => 'Perubahan aset berhasil direkam.', 'data' => $asset]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function dispose(DisposeAssetRequest $request, string $id)
    {
        try {
            $this->assetService->disposeAsset($id, $request->user()->id, $request->alasan_pemutihan);
            return response()->json(['message' => 'Aset berhasil diistirahatkan dari operasional aktif.']);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
