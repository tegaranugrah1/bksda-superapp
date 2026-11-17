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
        $cleanText = function (mixed $value): mixed {
            if (! is_string($value)) {
                return $value;
            }
            $cleaned = strip_tags(trim($value));
            return $cleaned === '' ? null : $cleaned;
        };

        $merged = [];
        foreach (['tanggal_agenda', 'tanggal_penyelesaian', 'tanggal_surat'] as $dateField) {
            $val = $this->input($dateField);
            $merged[$dateField] = ($val === '' || $val === null) ? null : $val;
        }
        foreach (['indeks', 'kode', 'referensi', 'no_surat', 'asal_surat', 'isi_ringkas', 'lampiran', 'catatan'] as $textField) {
            if ($this->has($textField)) {
                $merged[$textField] = $cleanText($this->input($textField));
            }
        }

        $disposisi = $this->input('disposisi');
        if (is_array($disposisi) && array_key_exists('catatan', $disposisi) && is_string($disposisi['catatan'])) {
            $disposisi['catatan'] = strip_tags(trim($disposisi['catatan']));
            $merged['disposisi'] = $disposisi;
        }

        $this->merge($merged);
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
            'isi_ringkas' => 'nullable|string|max:10000',
            'asal_surat' => 'nullable|string|max:255',
            'lampiran' => 'nullable|string|max:255',
            'sifat_json' => 'nullable|array|max:20',
            'sifat_json.*' => 'string|max:100',
            'catatan' => 'nullable|string|max:5000',
            'file_surat' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:10240',

            // Disposisi fields
            'disposisi' => 'nullable|array',
            'disposisi.diteruskan_json' => 'nullable|array|max:50',
            'disposisi.diteruskan_json.*' => 'string|max:255',
            'disposisi.instruksi_json' => 'nullable|array|max:50',
            'disposisi.instruksi_json.*' => 'string|max:255',
            'disposisi.catatan' => 'nullable|string|max:5000',
            'disposisi.ka_subbag_tu_id' => 'nullable|integer|exists:kpg_employees,id',
            'disposisi.kepala_balai_id' => 'nullable|integer|exists:kpg_employees,id',
        ];
    }

    public function messages(): array
    {
        return [
            'no_agenda.unique' => 'Nomor agenda :input sudah terdaftar pada surat masuk lain.',
        ];
    }
}
