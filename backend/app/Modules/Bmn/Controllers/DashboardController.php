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

        // Distribusi per jenis BMN (lebih informatif dari kode_barang)
        $assetByJenis = Asset::select('jenis_bmn', DB::raw('count(*) as total'), DB::raw('sum(nilai_perolehan) as total_nilai'))
            ->whereNotNull('jenis_bmn')
            ->groupBy('jenis_bmn')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'jenis_bmn' => $row->jenis_bmn,
                'total' => $row->total,
                'total_nilai' => (float) $row->total_nilai,
            ]);

        // Distribusi per lokasi ruang
        $assetByLokasi = Asset::select('lokasi_ruang', DB::raw('count(*) as total'))
            ->whereNotNull('lokasi_ruang')
            ->where('lokasi_ruang', '!=', '')
            ->groupBy('lokasi_ruang')
            ->orderByDesc('total')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'lokasi_ruang' => $row->lokasi_ruang,
                'total' => $row->total,
            ]);

        // Transaksi terakhir (peminjaman + pemeliharaan)
        $recentLoans = AssetLoan::with('asset:id,nama_barang,kode_barang', 'borrower:id,nama_lengkap')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($loan) => [
                'type' => 'loan',
                'id' => $loan->id,
                'asset' => $loan->asset?->nama_barang,
                'borrower' => $loan->borrower?->nama_lengkap,
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
            'asset_by_jenis' => $assetByJenis,
            'asset_by_lokasi' => $assetByLokasi,
            'recent_transactions' => $recentTransactions,
            'stnk_alerts' => [
                'expired' => $stnkExpired,
                'expiring_soon' => $stnkExpiringSoon,
                'plat_expired' => $platExpired,
            ],
        ]);
    }
}
