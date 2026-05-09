<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Services\LoanService;
use App\Modules\Bmn\Requests\StoreAssetLoanRequest;
use App\Modules\Bmn\Resources\AssetLoanResource;
use Exception;

class LoanController extends Controller
{
    public function __construct(private LoanService $loanService) {}

    public function index(Request $request): JsonResponse
    {
        $query = AssetLoan::with(['asset', 'borrower'])->latest();
        return AssetLoanResource::collection($query->paginate(20));
    }

    public function borrow(StoreAssetLoanRequest $request, string $assetId): JsonResponse
    {
        try {
            $loan = $this->loanService->borrowAsset($assetId, $request->employee_id, $request->validated());
            return response()->json(['message' => 'Aset berhasil diserahkan ke pegawai.', 'data' => new AssetLoanResource($loan)], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function return(Request $request, string $loanId): JsonResponse
    {
        try {
            $loan = $this->loanService->returnAsset($loanId, $request->all());
            return response()->json(['message' => 'Aset telah kembali ke gudang BKSDA.', 'data' => new AssetLoanResource($loan)]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
