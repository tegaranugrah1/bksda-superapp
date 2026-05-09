<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Jika request memiliki ID (sedang proses EDIT), lewati pengecekan unique untuk ID dirinya sendiri.
        $itemId = $this->route('item');

        return [
            'category_id' => ['required', 'uuid', 'exists:inv_categories,id'],
            'kode_barang' => ['required', 'string', 'max:100', 'unique:inv_items,kode_barang,'.$itemId],
            'nama_barang' => ['required', 'string', 'max:255'],
            'satuan' => ['required', 'string', 'max:50'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
