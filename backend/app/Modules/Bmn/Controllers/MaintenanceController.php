<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\AssetMaintenance;
use App\Modules\Bmn\Requests\StoreAssetMaintenanceRequest;
use App\Modules\Bmn\Resources\AssetMaintenanceResource;
use App\Modules\Bmn\Services\MaintenanceService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function __construct(private MaintenanceService $maintenanceService) {}

    public function index(Request $request): JsonResponse
    {
        $query = AssetMaintenance::with('asset')->latest();

        return AssetMaintenanceResource::collection($query->paginate(20));
    }

    public function record(StoreAssetMaintenanceRequest $request, string $assetId): JsonResponse
    {
        try {
            $maintenance = $this->maintenanceService->recordMaintenance($assetId, $request->validated());

            return response()->json(['message' => 'Nota Servis aset telah dicatat.', 'data' => new AssetMaintenanceResource($maintenance)], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
