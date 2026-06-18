<?php

namespace App\Modules\SuratTugas\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublicSuratTugasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'maksud_tujuan' => 'required|string|min:10',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'tempat_tujuan' => 'required|string|max:255',
            'employee_ids' => 'required|array|min:1',
            'employee_ids.*' => 'required|uuid|exists:kpg_employees,id',
            'sumber_dana' => 'required|string|max:100',
            'dasar_surat' => 'nullable|file|mimes:pdf,jpg,jpeg,png|extensions:pdf,jpg,jpeg,png|max:10240',
        ];
    }

    public function messages(): array
    {
        return [
            'employee_ids.required' => 'Pilih minimal satu pegawai untuk ditugaskan.',
            'employee_ids.min' => 'Pilih minimal satu pegawai untuk ditugaskan.',
            'tanggal_selesai.after_or_equal' => 'Tanggal kembali tidak boleh mendahului tanggal keberangkatan.',
            'dasar_surat.mimes' => 'Berkas wajib berformat PDF, JPG, atau PNG.',
            'dasar_surat.max' => 'Ukuran berkas tidak boleh melebihi 10 Megabyte.',
        ];
    }
}
