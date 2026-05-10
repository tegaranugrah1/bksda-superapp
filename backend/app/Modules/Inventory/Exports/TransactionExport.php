<?php

namespace App\Modules\Inventory\Exports;

use App\Modules\Inventory\Models\StockTransaction;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TransactionExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(protected ?string $type = null) {}

    /**
     * @return Collection
     */
    public function collection()
    {
        $query = StockTransaction::with(['item', 'office', 'recipient', 'admin']);

        if ($this->type) {
            $query->where('type', $this->type);
        }

        return $query->latest()->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Tanggal',
            'Tipe',
            'Kantor/Gudang',
            'Barang',
            'Jumlah',
            'Penerima',
            'Admin',
            'Keterangan',
        ];
    }

    public function map($trx): array
    {
        return [
            $trx->id,
            $trx->created_at->format('Y-m-d H:i'),
            strtoupper($trx->type),
            $trx->office->nama_kantor ?? '-',
            $trx->item->nama_barang ?? '-',
            $trx->quantity,
            $trx->recipient->nama ?? '-',
            $trx->admin->name ?? '-',
            $trx->keterangan ?? '-',
        ];
    }
}
