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
        $query = Asset::with(['penanggungJawab', 'loans' => function ($q) {
            $q->active()->with('borrower')->latest('tanggal_pinjam');
        }])->latest();

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

        if ($request->filled('employee_id')) {
            $employeeId = $request->employee_id;
            $employee = \App\Modules\Kepegawaian\Models\Employee::find($employeeId);
            $query->where(function($q) use ($employeeId, $employee) {
                $q->where('employee_id', $employeeId);
                if ($employee && $employee->nama_lengkap) {
                    $fullName = trim($employee->nama_lengkap);
                    
                    // Search full name
                    $q->orWhere('pengguna', 'ilike', '%' . $fullName . '%')
                      ->orWhere('nama_pengguna', 'ilike', '%' . $fullName . '%');
                    
                    // Search name before comma (titles)
                    if (str_contains($fullName, ',')) {
                        $nameParts = explode(',', $fullName);
                        $baseName = trim($nameParts[0]);
                        if (strlen($baseName) > 2) {
                            $q->orWhere('pengguna', 'ilike', '%' . $baseName . '%')
                              ->orWhere('nama_pengguna', 'ilike', '%' . $baseName . '%');
                        }
                    }
                    
                    // Search first two words for better fuzzy match
                    $words = explode(' ', $fullName);
                    if (count($words) >= 2) {
                        $twoWords = $words[0] . ' ' . $words[1];
                        $q->orWhere('pengguna', 'ilike', '%' . $twoWords . '%');
                    }
                }
            });
        }

        if ($request->filled('borrower_id')) {
            $query->whereHas('loans', function ($q) use ($request) {
                $q->active()->where('employee_id', $request->borrower_id);
            });
        }

        if ($request->filled('kondisi')) {
            $query->where('kondisi', $request->kondisi);
        }

        if ($request->filled('jenis_bmn')) {
            $query->where('jenis_bmn', $request->jenis_bmn);
        }

        if ($request->filled('lokasi_ruang')) {
            $query->where('lokasi_ruang', 'ilike', '%' . $request->lokasi_ruang . '%');
        }

        return AssetResource::collection($query->paginate($request->integer('per_page', 10)));
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

    public function bulkRestore(Request $request): JsonResponse
    {
        $request->validate(['ids' => 'required|array|min:1', 'ids.*' => 'string']);

        $count = Asset::onlyTrashed()->whereIn('id', $request->ids)->count();
        Asset::onlyTrashed()->whereIn('id', $request->ids)->restore();

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

        $assets = Asset::whereIn('id', $request->ids)->get();
        $userId = $request->user()->id;

        foreach ($assets as $asset) {
            if ($asset->kondisi !== $request->kondisi) {
                AssetUpdate::create([
                    'asset_id' => $asset->id,
                    'user_id' => $userId,
                    'field_changed' => 'kondisi',
                    'old_value' => $asset->kondisi,
                    'new_value' => $request->kondisi,
                    'alasan_perubahan' => 'Bulk update kondisi',
                ]);
            }
        }

        Asset::whereIn('id', $request->ids)->update(['kondisi' => $request->kondisi]);

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
