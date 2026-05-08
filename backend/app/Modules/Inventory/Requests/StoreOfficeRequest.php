<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOfficeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nama_kantor' => ['required', 'string', 'max:255'],
            'lokasi' => ['nullable', 'string', 'max:255'],
            // Menembus modul Kepegawaian untuk validasi identitas Kepala Kantor
            'penanggung_jawab_id' => ['nullable', 'uuid', 'exists:kpg_employees,id'],
        ];
    }
}
