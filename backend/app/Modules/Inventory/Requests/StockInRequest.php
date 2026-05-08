<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Memastikan Kantor & Barang yang dimaksud BENAR-BENAR ADA di sistem!
            'office_id' => ['required', 'uuid', 'exists:inv_offices,id'],
            'item_id' => ['required', 'uuid', 'exists:inv_items,id'],

            // Menggembok kemungkinan Hacker mengirim nilai negatif, misal: -100
            'quantity' => ['required', 'integer', 'min:1'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
