<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetMaintenanceRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'tanggal_service' => ['required', 'date', 'before_or_equal:today'],
            'biaya' => ['required', 'numeric', 'min:0'],
            'deskripsi' => ['required', 'string', 'max:2000'],
            'bukti_nota_url' => ['nullable', 'string', 'max:1000'],
            'kondisi_baru' => ['nullable', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
        ];
    }
}
