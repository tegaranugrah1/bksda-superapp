<?php

namespace App\Modules\Surat\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SuratKeluarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $payload = $this->input('document_payload');
        if (is_string($payload)) {
            $decoded = json_decode($payload, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $payload = $decoded;
            }
        }

        $this->merge([
            'no_surat' => $this->no_surat ? strip_tags(trim((string) $this->no_surat)) : null,
            'kode_klasifikasi' => $this->kode_klasifikasi ? strip_tags(trim((string) $this->kode_klasifikasi)) : null,
            'tujuan_surat' => $this->tujuan_surat ? strip_tags(trim((string) $this->tujuan_surat)) : null,
            'perihal' => $this->perihal ? strip_tags(trim((string) $this->perihal)) : null,
            'sifat' => $this->sifat ? strip_tags(trim((string) $this->sifat)) : null,
            'lampiran' => $this->lampiran ? strip_tags(trim((string) $this->lampiran)) : null,
            ...(is_array($payload) ? ['document_payload' => $payload] : []),
        ]);
    }

    public function rules(): array
    {
        return [
            'no_surat' => 'required|string|max:255',
            'kode_klasifikasi' => 'nullable|string|max:100',
            'tanggal_surat' => 'required|date',
            'tujuan_surat' => 'required|string|max:255',
            'perihal' => 'required|string|max:2000',
            'sifat' => 'nullable|string|max:100',
            'lampiran' => 'nullable|string|max:255',
            'template_type' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:draft,final,terdaftar,DRAFT,FINAL,TERDAFTAR',
            'document_payload' => [
                'nullable',
                'array',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_array($value) && strlen((string) json_encode($value)) > 524288) {
                        $fail('Ukuran payload dokumen melebihi batas maksimal 512 KB.');
                    }
                },
            ],
            'penandatangan_id' => 'nullable|exists:kpg_employees,id',
            'file_surat' => 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:10240',
        ];
    }
}
