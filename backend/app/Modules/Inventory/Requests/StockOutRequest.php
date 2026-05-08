<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'office_id' => ['required', 'uuid', 'exists:inv_offices,id'],
            'item_id' => ['required', 'uuid', 'exists:inv_items,id'],

            // WAJIB: Mencatat identitas Pegawai Peminta Barang (Cross-Module ke Kepegawaian)
            'employee_id' => ['required', 'uuid', 'exists:kpg_employees,id'],

            'quantity' => ['required', 'integer', 'min:1'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.required' => 'Wajib memilih siapa Pegawai BKSDA yang mengambil barang ini!',
            'employee_id.exists' => 'Data Pegawai tidak ditemukan di dalam sistem BKSDA.'
        ];
    }
}
