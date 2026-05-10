<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Exports\ItemExport;
use App\Modules\Inventory\Exports\TransactionExport;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    public function items(): BinaryFileResponse
    {
        return Excel::download(new ItemExport, 'Katalog_Barang_Logistik.xlsx');
    }

    public function transactions(Request $request): BinaryFileResponse
    {
        $type = $request->query('type');
        $filename = 'Laporan_Mutasi_Logistik.xlsx';

        if ($type === 'in') {
            $filename = 'Laporan_Barang_Masuk.xlsx';
        }
        if ($type === 'out') {
            $filename = 'Laporan_Barang_Keluar.xlsx';
        }

        return Excel::download(new TransactionExport($type), $filename);
    }
}
