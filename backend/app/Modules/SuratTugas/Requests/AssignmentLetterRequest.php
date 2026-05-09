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
            'tempat_tujuan' => 'required|string|max:255',
            'employees' => 'required|array|min:1',
            'employees.*.id' => 'required|uuid|exists:kpg_employees,id',
            'employees.*.peran' => 'nullable|string|max:100',
        ];

        if ($this->isMethod('post') || $this->hasFile('file_surat')) {
            $rules['file_surat'] = 'nullable|file|mimes:pdf|max:10240';
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'employees.min' => 'Surat Tugas tidak sah jika tidak ada pegawai yang berangkat.',
            'tanggal_selesai.after_or_equal' => 'Tanggal kembali tidak boleh mendahului tanggal keberangkatan.',
            'file_surat.mimes' => 'Berkas pindaian surat wajib berformat PDF.',
            'file_surat.max' => 'Ukuran berkas PDF tidak boleh melebihi 10 Megabyte.',
        ];
    }
}
