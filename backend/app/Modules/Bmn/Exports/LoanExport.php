<?php

namespace App\Modules\Bmn\Exports;

use App\Modules\Bmn\Models\AssetLoan;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class LoanExport implements FromCollection, WithHeadings, WithMapping
{
    public function collection()
    {
        return AssetLoan::with(['asset', 'borrower'])->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Kode Barang',
            'Nama Barang',
            'Peminjam',
            'NIP',
            'Tanggal Pinjam',
            'Tanggal Kembali',
            'Status',
            'Keterangan',
        ];
    }

    public function map($loan): array
    {
        return [
            $loan->id,
            $loan->asset?->kode_barang ?? '-',
            $loan->asset?->nama_barang ?? '-',
            $loan->borrower?->nama_lengkap ?? '-',
            $loan->borrower?->nip ?? '-',
            $loan->tanggal_pinjam?->format('d/m/Y'),
            $loan->tanggal_kembali?->format('d/m/Y'),
            $loan->status,
            $loan->keterangan ?? '-',
        ];
    }
}
