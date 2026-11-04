<?php

namespace App\Modules\Bmn\Exports;

use App\Modules\Bmn\Models\AssetMaintenance;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MaintenanceExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return AssetMaintenance::with('asset')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Kode Barang',
            'Nama Barang',
            'Tanggal Service',
            'Jenis Perawatan',
            'Biaya',
            'Vendor',
            'Keterangan',
        ];
    }

    public function map($m): array
    {
        return $this->sanitizeRow([
            $m->id,
            $m->asset?->kode_barang ?? '-',
            $m->asset?->nama_barang ?? '-',
            $m->tanggal_maintenance?->format('d/m/Y'),
            $m->jenis_maintenance ?? '-',
            $m->biaya ?? 0,
            $m->vendor ?? '-',
            $m->keterangan ?? '-',
        ]);
    }

    private function sanitizeRow(array $row): array
    {
        return array_map(function ($val) {
            if (is_string($val) && preg_match('/^[=+\-@\t\r]/', $val)) {
                return "'" . $val;
            }
            return $val;
        }, $row);
    }
}
