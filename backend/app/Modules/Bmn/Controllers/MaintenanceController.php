<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\AssetMaintenance;
use App\Modules\Bmn\Services\MaintenanceService;
use App\Modules\Bmn\Requests\StoreAssetMaintenanceRequest;
use Exception;

class MaintenanceController extends Controller
{
    public function __construct(private MaintenanceService $maintenanceService) {}

    public function index(Request $request)
    {
        $query = AssetMaintenance::with('asset')->latest();
        return response()->json($query->paginate(20));
    }

    public function record(StoreAssetMaintenanceRequest $request, string $assetId)
    {
        try {
            $maintenance = $this->maintenanceService->recordMaintenance($assetId, $request->validated());
            return response()->json(['message' => 'Nota Servis aset telah dicatat.', 'data' => $maintenance], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
