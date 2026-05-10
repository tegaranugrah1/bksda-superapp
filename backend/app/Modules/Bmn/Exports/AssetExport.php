<?php

namespace App\Modules\Bmn\Exports;

use App\Modules\Bmn\Models\Asset;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AssetExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return Asset::with('penanggungJawab')->latest()->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Kode Barang',
            'NUP',
            'Nama Barang',
            'Merk/Tipe',
            'Tahun Perolehan',
            'Kondisi',
            'Nilai Perolehan',
            'Lokasi Spesifik',
            'Penanggung Jawab',
            'Tanggal Dicatat',
        ];
    }

    public function map($asset): array
    {
        return [
            $asset->id,
            $asset->kode_barang,
            $asset->nup,
            $asset->nama_barang,
            $asset->merk_tipe,
            $asset->tahun_perolehan,
            $asset->kondisi,
            $asset->nilai_perolehan,
            $asset->lokasi_spesifik,
            $asset->penanggungJawab ? $asset->penanggungJawab->nama_lengkap : 'N/A',
            $asset->created_at->format('d/m/Y H:i'),
        ];
    }
}
