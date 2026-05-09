<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetMaintenance;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        // Total aset (tidak termasuk yang di-disposed)
        $totalAsset = Asset::count();

        // Total nilai perolehan semua aset aktif
        $totalAssetValue = Asset::sum('nilai_perolehan');

        // Distribusi kondisi aset
        $assetByCondition = Asset::select('kondisi', DB::raw('count(*) as total'))
            ->groupBy('kondisi')
            ->pluck('total', 'kondisi')
            ->toArray();

        // Distribusi per kode barang (kategori)
        $assetByCategory = Asset::select('kode_barang', DB::raw('count(*) as total'))
            ->groupBy('kode_barang')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn($row) => [
                'kode_barang' => $row->kode_barang,
                'total' => $row->total
            ]);

        // Transaksi terakhir (peminjaman + pemeliharaan)
        $recentLoans = AssetLoan::with('asset:id,nama_barang,kode_barang', 'borrower:id,nama')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($loan) => [
                'type' => 'loan',
                'id' => $loan->id,
                'asset' => $loan->asset?->nama_barang,
                'borrower' => $loan->borrower?->nama,
                'tanggal' => $loan->tanggal_pinjam?->toDateString(),
                'status' => $loan->status
            ]);

        $recentMaintenances = AssetMaintenance::with('asset:id,nama_barang,kode_barang')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn($m) => [
                'type' => 'maintenance',
                'id' => $m->id,
                'asset' => $m->asset?->nama_barang,
                'tanggal' => $m->tanggal_maintenance?->toDateString(),
                'keterangan' => $m->keterangan
            ]);

        // Gabungkan dan urutkan berdasarkan tanggal
        $recentTransactions = $recentLoans->merge($recentMaintenances)
            ->sortByDesc('tanggal')
            ->take(10)
            ->values();

        return response()->json([
            'total_asset' => $totalAsset,
            'total_asset_value' => (float) $totalAssetValue,
            'asset_by_condition' => $assetByCondition,
            'asset_by_category' => $assetByCategory,
            'recent_transactions' => $recentTransactions
        ]);
    }
}
