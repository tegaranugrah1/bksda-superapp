<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Requests\StockInRequest;
use App\Modules\Inventory\Requests\StockOutRequest;
use Exception;

class StockController extends Controller
{
    protected InventoryService $service;

    public function __construct(InventoryService $service)
    {
        $this->service = $service;
    }

    /**
     * EKSEKUSI STOK MASUK (Belanja / Pengadaan)
     */
    public function stockIn(StockInRequest $request)
    {
        try {
            $data = $request->validated();
            $data['user_id'] = auth()->id();

            $transaction = $this->service->stockIn($data);

            return response()->json([
                'message' => 'Logistik berhasil dimasukkan ke dalam Gudang/Kantor.',
                'data' => $transaction
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'error' => 'Gagal Mutasi Masuk',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * EKSEKUSI STOK KELUAR (Permintaan Pegawai / Habis Pakai)
     */
    public function stockOut(StockOutRequest $request)
    {
        try {
            $data = $request->validated();
            $data['user_id'] = auth()->id();

            $transaction = $this->service->stockOut($data);

            return response()->json([
                'message' => 'Logistik berhasil didistribusikan kepada Pegawai.',
                'data' => $transaction
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'error' => 'Saldo Defisit / Stok Kurang',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
