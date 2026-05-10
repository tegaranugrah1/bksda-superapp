<?php

namespace App\Modules\Inventory\Exports;

use App\Modules\Inventory\Models\Item;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ItemExport implements FromCollection, WithHeadings, WithMapping
{
    /**
     * @return Collection
     */
    public function collection()
    {
        return Item::with('category', 'stocks')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Kategori',
            'Kode Barang',
            'Nama Barang',
            'Satuan',
            'Stok Saat Ini',
            'Batas Minimum',
            'Status Stok',
        ];
    }

    public function map($item): array
    {
        $currentStock = $item->stocks->sum('quantity');
        $status = $currentStock <= $item->min_stock ? 'LOW' : 'NORMAL';
        if ($currentStock <= 0) {
            $status = 'OUT OF STOCK';
        }

        return [
            $item->id,
            $item->category->nama_kategori ?? '-',
            $item->kode_barang,
            $item->nama_barang,
            $item->satuan,
            $currentStock,
            $item->min_stock,
            $status,
        ];
    }
}
