<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Models\StockTransaction;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats()
    {
        // 1. Menghitung Total Master Barang BKSDA
        $totalItems = Item::count();

        // 2. Transaksi Mutasi Bulan Ini
        $mutasiBulanIni = StockTransaction::whereMonth('created_at', now()->month)
                                        ->whereYear('created_at', now()->year)
                                        ->count();

        // 3. Peringatan Krisis! Barang yang stok gabungannya jatuh di bawah batas minimum
        $lowStocks = Item::withSum('stocks', 'quantity')
            ->get()
            ->filter(fn ($q) => ($q->stocks_sum_quantity ?? 0) < $q->min_stock)
            ->take(5)
            ->values();

        return response()->json([
            'message' => 'Statistik Dashboard Logistik berhasil ditarik.',
            'data' => [
                'total_items' => $totalItems,
                'mutasi_bulan_ini' => $mutasiBulanIni,
                'krisis_stok' => $lowStocks
            ]
        ]);
    }
}
