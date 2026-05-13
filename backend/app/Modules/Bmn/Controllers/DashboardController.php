<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetMaintenance;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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
            ->map(fn ($row) => [
                'kode_barang' => $row->kode_barang,
                'total' => $row->total,
            ]);

        // Transaksi terakhir (peminjaman + pemeliharaan)
        $recentLoans = AssetLoan::with('asset:id,nama_barang,kode_barang', 'borrower:id,nama')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($loan) => [
                'type' => 'loan',
                'id' => $loan->id,
                'asset' => $loan->asset?->nama_barang,
                'borrower' => $loan->borrower?->nama,
                'tanggal' => $loan->tanggal_pinjam?->toDateString(),
                'status' => $loan->status,
            ]);

        $recentMaintenances = AssetMaintenance::with('asset:id,nama_barang,kode_barang')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($m) => [
                'type' => 'maintenance',
                'id' => $m->id,
                'asset' => $m->asset?->nama_barang,
                'tanggal' => $m->tanggal_maintenance?->toDateString(),
                'keterangan' => $m->keterangan,
            ]);

        // Gabungkan dan urutkan berdasarkan tanggal
        $recentTransactions = $recentLoans->merge($recentMaintenances)
            ->sortByDesc('tanggal')
            ->take(10)
            ->values();

        // STNK Alerts: kendaraan yang pajak expired atau hampir expired (30 hari)
        $today = now()->toDateString();
        $thirtyDaysLater = now()->addDays(30)->toDateString();

        $stnkExpired = Asset::where('jenis_bmn', 'ALAT ANGKUTAN BERMOTOR')
            ->whereNotNull('tanggal_pajak_stnk')
            ->where('tanggal_pajak_stnk', '<', $today)
            ->select('id', 'nama_barang', 'kode_barang', 'nup', 'merk', 'no_polisi', 'tanggal_pajak_stnk')
            ->get();

        $stnkExpiringSoon = Asset::where('jenis_bmn', 'ALAT ANGKUTAN BERMOTOR')
            ->whereNotNull('tanggal_pajak_stnk')
            ->where('tanggal_pajak_stnk', '>=', $today)
            ->where('tanggal_pajak_stnk', '<=', $thirtyDaysLater)
            ->select('id', 'nama_barang', 'kode_barang', 'nup', 'merk', 'no_polisi', 'tanggal_pajak_stnk')
            ->get();

        $platExpired = Asset::where('jenis_bmn', 'ALAT ANGKUTAN BERMOTOR')
            ->whereNotNull('tanggal_ganti_plat')
            ->where('tanggal_ganti_plat', '<', $today)
            ->select('id', 'nama_barang', 'kode_barang', 'nup', 'merk', 'no_polisi', 'tanggal_ganti_plat')
            ->get();

        return response()->json([
            'total_asset' => $totalAsset,
            'total_asset_value' => (float) $totalAssetValue,
            'asset_by_condition' => $assetByCondition,
            'asset_by_category' => $assetByCategory,
            'recent_transactions' => $recentTransactions,
            'stnk_alerts' => [
                'expired' => $stnkExpired,
                'expiring_soon' => $stnkExpiringSoon,
                'plat_expired' => $platExpired,
            ],
        ]);
    }
}
