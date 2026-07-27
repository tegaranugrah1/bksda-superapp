<?php

namespace App\Modules\Surat\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SuratKeluarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'no_surat' => 'required|string|max:255',
            'kode_klasifikasi' => 'nullable|string|max:100',
            'tanggal_surat' => 'required|date',
            'tujuan_surat' => 'required|string|max:255',
            'perihal' => 'required|string',
            'sifat' => 'nullable|string|max:100',
            'lampiran' => 'nullable|string|max:255',
            'penandatangan_id' => 'nullable|exists:kpg_employees,id',
            'file_surat' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:10240',
        ];
    }
}
