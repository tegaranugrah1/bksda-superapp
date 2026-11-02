<?php

namespace App\Modules\Surat\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'indeks' => $this->indeks ? strip_tags(trim((string)$this->indeks)) : null,
            'kode' => $this->kode ? strip_tags(trim((string)$this->kode)) : null,
            'referensi' => $this->referensi ? strip_tags(trim((string)$this->referensi)) : null,
            'no_surat' => $this->no_surat ? strip_tags(trim((string)$this->no_surat)) : null,
            'asal_surat' => $this->asal_surat ? strip_tags(trim((string)$this->asal_surat)) : null,
            'isi_ringkas' => $this->isi_ringkas ? strip_tags(trim((string)$this->isi_ringkas)) : null,
            'lampiran' => $this->lampiran ? strip_tags(trim((string)$this->lampiran)) : null,
            'catatan' => $this->catatan ? strip_tags(trim((string)$this->catatan)) : null,
        ]);
    }

    public function rules(): array
    {
        $routeParam = $this->route('surat_masuk');
        $ignoreId = is_object($routeParam) ? $routeParam->id : $routeParam;

        return [
            'no_agenda' => [
                'required',
                'string',
                'max:100',
                Rule::unique('surat_masuk', 'no_agenda')
                    ->whereNull('deleted_at')
                    ->ignore($ignoreId),
            ],
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

    public function messages(): array
    {
        return [
            'no_agenda.unique' => 'Nomor agenda :input sudah terdaftar pada surat masuk lain.',
        ];
    }
}
