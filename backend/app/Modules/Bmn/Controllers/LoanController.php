<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Requests\StoreAssetLoanRequest;
use App\Modules\Bmn\Resources\AssetLoanResource;
use App\Modules\Bmn\Services\LoanService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoanController extends Controller
{
    public function __construct(private LoanService $loanService) {}

    /**
     * List loans with filters and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min((int) $request->get('per_page', 10), 100);
        $filters = [
            'status' => $request->get('status'),
        ];

        $loans = $this->loanService->listLoans($filters, $perPage);

        return AssetLoanResource::collection($loans)->response();
    }

    /**
     * Bulk create loans (multi-asset).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'asset_ids' => ['required', 'array', 'min:1'],
            'asset_ids.*' => ['required', 'uuid', 'exists:bmn_assets,id'],
            'borrower_employee_id' => ['required', 'exists:kpg_employees,id'],
            'loan_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:loan_date'],
            'purpose' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $loans = $this->loanService->createLoan($request->all());

            return response()->json([
                'message' => count($loans) . ' aset berhasil dipinjamkan.',
                'data' => AssetLoanResource::collection($loans),
            ], 201);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Legacy: borrow a single asset.
     */
    public function borrow(StoreAssetLoanRequest $request, string $assetId): JsonResponse
    {
        try {
            $loan = $this->loanService->borrowAsset($assetId, $request->employee_id, $request->validated());

            return response()->json([
                'message' => 'Aset berhasil diserahkan ke pegawai.',
                'data' => new AssetLoanResource($loan),
            ], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Update a loan.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'borrower_employee_id' => ['sometimes', 'exists:kpg_employees,id'],
            'loan_date' => ['sometimes', 'date'],
            'due_date' => ['nullable', 'date'],
            'purpose' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $loan = $this->loanService->updateLoan($id, $request->all());

            return response()->json([
                'message' => 'Peminjaman berhasil diperbarui.',
                'data' => new AssetLoanResource($loan),
            ]);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    /**
     * Return an asset.
     */
    public function return(Request $request, string $loanId): JsonResponse
    {
        $request->validate([
            'return_condition' => ['nullable', 'string', 'in:Baik,Rusak Ringan,Rusak Berat'],
        ]);

        try {
            $loan = $this->loanService->returnAsset($loanId, $request->all());

            return response()->json([
                'message' => 'Aset telah kembali ke gudang BKSDA.',
                'data' => new AssetLoanResource($loan),
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * Delete a loan.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $this->loanService->deleteLoan($id);

            return response()->json(['message' => 'Peminjaman berhasil dihapus.']);
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
