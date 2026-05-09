<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetLoanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'uuid', 'exists:kpg_employees,id'],
            'tanggal_pinjam' => ['required', 'date', 'before_or_equal:today'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'NIP tersebut tidak tercatat di buku Kepegawaian BKSDA.',
        ];
    }
}
