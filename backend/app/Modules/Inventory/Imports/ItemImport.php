<?php

namespace App\Modules\Inventory\Imports;

use App\Modules\Inventory\Models\Category;
use App\Modules\Inventory\Models\Item;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;

class ItemImport implements ToModel, WithHeadingRow, WithValidation
{
    protected $categories;

    public function __construct()
    {
        $this->categories = Category::all()->pluck('id', 'nama_kategori')->toArray();
    }

    public function model(array $row)
    {
        $categoryName = $row['kategori'] ?? 'Umum';

        // Find or create category
        if (! isset($this->categories[$categoryName])) {
            $category = Category::create(['nama_kategori' => $categoryName]);
            $this->categories[$categoryName] = $category->id;
        }

        return new Item([
            'category_id' => $this->categories[$categoryName],
            'kode_barang' => $row['kode_barang'],
            'nama_barang' => $row['nama_barang'],
            'satuan' => $row['satuan'] ?? 'Pcs',
            'min_stock' => $row['batas_minimum'] ?? 5,
        ]);
    }

    public function rules(): array
    {
        return [
            'kode_barang' => 'required|unique:inv_items,kode_barang',
            'nama_barang' => 'required',
            'satuan' => 'nullable',
            'batas_minimum' => 'nullable|numeric',
        ];
    }
}
