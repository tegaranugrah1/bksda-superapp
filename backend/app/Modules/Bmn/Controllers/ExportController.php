<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Exports\AssetExport;
use App\Modules\Bmn\Exports\LoanExport;
use App\Modules\Bmn\Exports\MaintenanceExport;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    public function assets(Request $request): BinaryFileResponse
    {
        $includeNupLama = $request->boolean('include_nup_lama', true);
        return Excel::download(new AssetExport($includeNupLama), 'Katalog_Aset_BKSDA.xlsx');
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
