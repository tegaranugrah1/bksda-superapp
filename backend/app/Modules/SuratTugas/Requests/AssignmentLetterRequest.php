<?php

namespace App\Modules\SuratTugas\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignmentLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'maksud_tujuan' => 'required|string|min:10',
            'dasar_hukum' => 'nullable|string',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'tempat_tujuan' => 'nullable|string|max:255',
            'sumber_dana' => 'required|string',
            'sumber_dana_other' => 'nullable|string',
            'template_type' => 'nullable|string|max:50',
            'penandatangan_nama' => 'nullable|string|max:255',
            'penandatangan_nip' => 'nullable|string|max:50',
            'employees' => 'required|array|min:1',
            'employees.*.id' => 'required|exists:kpg_employees,id',
            'employees.*.peran' => 'nullable|string|max:100',
        ];

        if ($this->isMethod('post') || $this->hasFile('file_surat')) {
            $rules['file_surat'] = 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|max:10240';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'employees.min' => 'Surat Tugas tidak sah jika tidak ada pegawai yang berangkat.',
            'tanggal_selesai.after_or_equal' => 'Tanggal kembali tidak boleh mendahului tanggal keberangkatan.',
            'file_surat.mimes' => 'Berkas wajib berformat PDF, JPG, atau PNG.',
            'file_surat.max' => 'Ukuran berkas PDF tidak boleh melebihi 10 Megabyte.',
        ];
    }
}
