<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Services\LoanService;
use App\Modules\Bmn\Requests\StoreAssetLoanRequest;
use Exception;

class LoanController extends Controller
{
    public function __construct(private LoanService $loanService) {}

    public function index(Request $request)
    {
        $query = AssetLoan::with(['asset', 'borrower'])->latest();
        return response()->json($query->paginate(20));
    }

    public function borrow(StoreAssetLoanRequest $request, string $assetId)
    {
        try {
            $loan = $this->loanService->borrowAsset($assetId, $request->employee_id, $request->validated());
            return response()->json(['message' => 'Aset berhasil diserahkan ke pegawai.', 'data' => $loan], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function return(Request $request, string $loanId)
    {
        try {
            $loan = $this->loanService->returnAsset($loanId, $request->all());
            return response()->json(['message' => 'Aset telah kembali ke gudang BKSDA.', 'data' => $loan]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
