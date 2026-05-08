<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Requests\StockInRequest;
use App\Modules\Inventory\Requests\StockOutRequest;
use Exception;
use Illuminate\Http\Request;

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

    /**
     * RIWAYAT MUTASI (Audit Trail untuk BPK)
     */
    public function history(Request $request)
    {
        $query = \App\Modules\Inventory\Models\StockTransaction::with([
            'item:id,nama_barang,satuan',
            'office:id,nama_kantor',
            'employee:id,nama_lengkap',
            'user:id,name',
        ])->latest();

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        return response()->json($query->paginate(20));
    }
}
