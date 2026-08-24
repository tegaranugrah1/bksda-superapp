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
        $letterId = $this->route('id');
        if ($letterId) {
            $letterId = preg_replace('/^st-/', '', (string) $letterId);
        }
        $isDraft = strtolower((string) $this->input('status')) === 'draft';

        $rules = [
            'nomor_surat' => 'nullable|string',
            'kode_surat' => 'nullable|string',
            'tanggal_surat' => 'nullable|date',
            'maksud_tujuan' => $isDraft ? 'nullable|string' : 'required|string|min:5',
            'dasar_hukum' => 'nullable|string',
            'tanggal_mulai' => $isDraft ? 'nullable|date' : 'required|date',
            'tanggal_selesai' => $isDraft ? 'nullable|date' : 'required|date|after_or_equal:tanggal_mulai',
            'tempat_tujuan' => 'nullable|string|max:255',
            'sumber_dana' => $isDraft ? 'nullable|string' : 'required|string',
            'sumber_dana_other' => 'nullable|string',
            'template_type' => 'nullable|string|max:50',
            'template_id' => 'nullable|integer|exists:st_templates,id',
            'menimbang' => 'nullable|array|max:50',
            'menimbang.*.id' => 'required_with:menimbang|string|max:100',
            'menimbang.*.text' => 'required_with:menimbang|string|max:5000',
            'dasar' => 'nullable|array|max:50',
            'dasar.*.id' => 'required_with:dasar|string|max:100',
            'dasar.*.text' => 'required_with:dasar|string|max:5000',
            'tembusan' => 'nullable|array',
            'penandatangan_nama' => 'nullable|string|max:255',
            'penandatangan_nip' => 'nullable|string|max:50',
            'employees' => $isDraft ? 'nullable|array' : 'required|array|min:1',
            'employees.*.id' => 'required_with:employees',
            'employees.*.peran' => 'nullable|string|max:100',
        ];

        if ($this->isMethod('post') || $this->hasFile('file_surat')) {
            $rules['file_surat'] = 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:10240';
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
