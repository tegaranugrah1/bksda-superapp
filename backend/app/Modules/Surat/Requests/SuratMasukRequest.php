<?php

namespace App\Modules\Surat\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SuratMasukRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'tanggal_agenda' => $this->tanggal_agenda ?: null,
            'tanggal_penyelesaian' => $this->tanggal_penyelesaian ?: null,
            'tanggal_surat' => $this->tanggal_surat ?: null,
            'indeks' => $this->indeks ?: null,
            'kode' => $this->kode ?: null,
            'referensi' => $this->referensi ?: null,
        ]);
    }

    public function rules(): array
    {
        return [
            'no_agenda' => 'required|string|max:100',
            'tanggal_agenda' => 'required|date',
            'indeks' => 'nullable|string|max:100',
            'kode' => 'nullable|string|max:100',
            'no_surat' => 'required|string|max:255',
            'referensi' => 'nullable|string|max:255',
            'tanggal_penyelesaian' => 'nullable|date',
            'tanggal_surat' => 'nullable|date',
            'isi_ringkas' => 'nullable|string',
            'asal_surat' => 'nullable|string|max:255',
            'lampiran' => 'nullable|string|max:255',
            'sifat_json' => 'nullable|array',
            'catatan' => 'nullable|string',
            'file_surat' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:10240',

            // Disposisi fields
            'disposisi' => 'nullable|array',
            'disposisi.diteruskan_json' => 'nullable|array',
            'disposisi.instruksi_json' => 'nullable|array',
            'disposisi.catatan' => 'nullable|string',
            'disposisi.ka_subbag_tu_id' => 'nullable|exists:kpg_employees,id',
            'disposisi.kepala_balai_id' => 'nullable|exists:kpg_employees,id',
        ];
    }
}
