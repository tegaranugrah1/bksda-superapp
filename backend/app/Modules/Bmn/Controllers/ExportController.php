<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetMaintenance;
use Illuminate\Http\Response;
use App\Modules\Bmn\Exports\AssetExport;
use App\Modules\Bmn\Exports\LoanExport;
use App\Modules\Bmn\Exports\MaintenanceExport;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    public function assets(): BinaryFileResponse
    {
        return Excel::download(new AssetExport, 'Katalog_Aset_BKSDA.xlsx');
    }

    public function loans(): BinaryFileResponse
    {
        return Excel::download(new LoanExport, 'Lalu_Lintas_Peminjaman_BMN.xlsx');
    }

    public function maintenances(): BinaryFileResponse
    {
        return Excel::download(new MaintenanceExport, 'Laporan_Biaya_Servis_BMN.xlsx');
    }
}
