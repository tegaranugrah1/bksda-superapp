<?php

namespace App\Modules\Bmn\Imports;

use App\Modules\Bmn\Models\Asset;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class AssetImport implements ToModel, WithHeadingRow, WithValidation
{
    public function model(array $row)
    {
        return new Asset([
            'kode_barang' => $row['kode_barang'],
            'nup' => $row['nup'],
            'nama_barang' => $row['nama_barang'],
            'merk_tipe' => $row['merk_tipe'] ?? null,
            'tahun_perolehan' => $row['tahun_perolehan'] ?? null,
            'kondisi' => $row['kondisi'] ?? 'Baik',
            'nilai_perolehan' => $row['nilai_perolehan'] ?? 0,
            'nilai_buku' => $row['nilai_buku'] ?? ($row['nilai_perolehan'] ?? 0),
            'lokasi_spesifik' => $row['lokasi_spesifik'] ?? null,
            'keterangan' => $row['keterangan'] ?? null,
        ]);
    }

    public function rules(): array
    {
        return [
            'kode_barang' => 'required|string',
            'nup' => 'required|string',
            'nama_barang' => 'required|string',
            'kondisi' => 'nullable|in:Baik,Rusak Ringan,Rusak Berat',
            'nilai_perolehan' => 'nullable|numeric',
        ];
    }
}
