<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetMaintenance;
use Illuminate\Http\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ExportController extends Controller
{
    public function assets(): Response
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Katalog Aset BMN');

        // Header
        $headers = ['No', 'Kode Barang', 'NUP', 'Nama Barang', 'Merk/Tipe', 'Tahun', 'Kondisi', 'Nilai Perolehan', 'Nilai Buku', 'Lokasi', 'Penanggung Jawab'];
        $sheet->fromArray($headers, null, 'A1');

        // Data
        $assets = Asset::with('penanggungJawab')->get();
        $rows = [];
        foreach ($assets as $i => $asset) {
            $rows[] = [
                $i + 1,
                $asset->kode_barang,
                $asset->nup,
                $asset->nama_barang,
                $asset->merk_tipe,
                $asset->tahun_perolehan,
                $asset->kondisi,
                $asset->nilai_perolehan,
                $asset->nilai_buku,
                $asset->lokasi_spesifik,
                $asset->penanggungJawab?->nama ?? '-',
            ];
        }
        $sheet->fromArray($rows, null, 'A2');

        // Auto size columns
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Katalog_Aset_BKSDA.xlsx';
        $tempPath = storage_path('app/temp/'.$filename);

        if (! is_dir(dirname($tempPath))) {
            mkdir(dirname($tempPath), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function loans(): Response
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Riwayat Pinjam Pakai');

        $headers = ['No', 'Kode Barang', 'Nama Barang', 'Peminjam', 'NIP', 'Tanggal Pinjam', 'Tanggal Kembali', 'Status', 'Keterangan'];
        $sheet->fromArray($headers, null, 'A1');

        $loans = AssetLoan::with(['asset', 'borrower'])->get();
        $rows = [];
        foreach ($loans as $i => $loan) {
            $rows[] = [
                $i + 1,
                $loan->asset?->kode_barang ?? '-',
                $loan->asset?->nama_barang ?? '-',
                $loan->borrower?->nama ?? '-',
                $loan->borrower?->nip ?? '-',
                $loan->tanggal_pinjam?->format('Y-m-d'),
                $loan->tanggal_kembali?->format('Y-m-d'),
                $loan->status,
                $loan->keterangan ?? '-',
            ];
        }
        $sheet->fromArray($rows, null, 'A2');

        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Lalu_Lintas_Peminjaman_BMN.xlsx';
        $tempPath = storage_path('app/temp/'.$filename);

        if (! is_dir(dirname($tempPath))) {
            mkdir(dirname($tempPath), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    public function maintenances(): Response
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Riwayat Pemeliharaan');

        $headers = ['No', 'Kode Barang', 'Nama Barang', 'Tanggal Service', 'Jenis Perawatan', 'Biaya', 'Vendor', 'Keterangan'];
        $sheet->fromArray($headers, null, 'A1');

        $maintenances = AssetMaintenance::with('asset')->get();
        $rows = [];
        foreach ($maintenances as $i => $m) {
            $rows[] = [
                $i + 1,
                $m->asset?->kode_barang ?? '-',
                $m->asset?->nama_barang ?? '-',
                $m->tanggal_maintenance?->format('Y-m-d'),
                $m->jenis_maintenance ?? '-',
                $m->biaya ?? 0,
                $m->vendor ?? '-',
                $m->keterangan ?? '-',
            ];
        }
        $sheet->fromArray($rows, null, 'A2');

        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $filename = 'Laporan_Biaya_Servis_BMN.xlsx';
        $tempPath = storage_path('app/temp/'.$filename);

        if (! is_dir(dirname($tempPath))) {
            mkdir(dirname($tempPath), 0755, true);
        }

        $writer->save($tempPath);

        return response()->download($tempPath, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
