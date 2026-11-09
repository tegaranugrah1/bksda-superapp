<?php

namespace App\Modules\SuratTugas\Requests;

use App\Modules\Kepegawaian\Requests\StoreStTemplateRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignmentLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->has('maksud_tujuan') && $this->has('nama_kegiatan')) {
            $this->merge(['maksud_tujuan' => $this->input('nama_kegiatan')]);
        }

        $fields = ['maksud_tujuan', 'tempat_tujuan', 'keterangan', 'penandatangan_nama', 'penandatangan_nip', 'nama_plh'];
        $clean = [];
        foreach ($fields as $field) {
            if ($this->has($field)) {
                $raw = $this->input($field);
                if ($raw !== null && ! is_string($raw)) continue;
                $val = trim((string) $raw);
                $clean[$field] = $val !== '' ? strip_tags($val) : null;
            }
        }

        foreach (['menimbang', 'dasar'] as $listField) {
            if ($this->has($listField) && is_array($this->input($listField))) {
                $clean[$listField] = array_map(function ($item) {
                    if (is_array($item)) {
                        if (isset($item['text']) && is_string($item['text'])) {
                            $item['text'] = strip_tags(trim((string) $item['text']));
                        }
                        if (isset($item['id']) && is_string($item['id'])) {
                            $item['id'] = strip_tags(trim((string) $item['id']));
                        }
                    }
                    return $item;
                }, $this->input($listField));
            }
        }

        if ($this->has('tembusan') && is_array($this->input('tembusan'))) {
            $clean['tembusan'] = array_map(function ($item) {
                if (is_array($item)) {
                    if (isset($item['text']) && is_string($item['text'])) {
                        $item['text'] = strip_tags(trim((string) $item['text']));
                    }
                    return $item;
                }
                return is_string($item) ? strip_tags(trim($item)) : $item;
            }, $this->input('tembusan'));
        }

        if ($this->has('template_snapshot') && is_array($this->input('template_snapshot'))) {
            $snapshot = $this->input('template_snapshot');
            if (isset($snapshot['configuration']) && is_array($snapshot['configuration'])) {
                if (isset($snapshot['configuration']['untuk']) && is_array($snapshot['configuration']['untuk'])) {
                    $snapshot['configuration']['untuk'] = array_map(function ($item) {
                        if (is_array($item)) {
                            if (isset($item['text']) && is_string($item['text'])) {
                                $item['text'] = strip_tags(trim((string) $item['text']));
                            }
                            if (isset($item['id']) && is_string($item['id'])) {
                                $item['id'] = strip_tags(trim((string) $item['id']));
                            }
                        }
                        return $item;
                    }, $snapshot['configuration']['untuk']);
                }
                if (isset($snapshot['configuration']['custom_nomor_naskah']) && is_string($snapshot['configuration']['custom_nomor_naskah'])) {
                    $snapshot['configuration']['custom_nomor_naskah'] = strip_tags(
                        trim((string) $snapshot['configuration']['custom_nomor_naskah'])
                    );
                }
            }
            $clean['template_snapshot'] = $snapshot;
        }

        if (!empty($clean)) {
            $this->merge($clean);
        }
    }

    public function rules(): array
    {
        $isDraft = ! $this->is('api/surat-tugas/submit') && strtolower((string) $this->input('status')) === 'draft';

        $rules = [
            'status' => 'nullable|in:draft,pending,approved,rejected,completed,published,diterbitkan,DRAFT,PENDING,APPROVED,REJECTED,COMPLETED,PUBLISHED,DITERBITKAN',
            'nomor_surat' => 'nullable|string',
            'kode_surat' => 'nullable|string',
            'tanggal_surat' => 'nullable|date',
            'maksud_tujuan' => 'nullable|string',
            'dasar_hukum' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date',
            'tempat_tujuan' => 'nullable|string|max:255',
            'sumber_dana' => 'nullable|string',
            'sumber_dana_other' => 'nullable|string',
            'template_type' => 'nullable|string|max:50',
            'template_id' => 'nullable|integer|exists:st_templates,id',
            'task_type_id' => 'nullable|integer|exists:st_task_types,id',
            'sertakan_laporan' => 'nullable|boolean',
            'menimbang' => 'nullable|array|max:50',
            'menimbang.*.id' => 'required_with:menimbang|string|max:100',
            'menimbang.*.text' => 'required_with:menimbang|string|max:5000',
            'dasar' => 'nullable|array|max:50',
            'dasar.*.id' => 'required_with:dasar|string|max:100',
            'dasar.*.text' => 'required_with:dasar|string|max:5000',
            'tembusan' => 'nullable|array|max:50',
            'tembusan.*' => [function ($attribute, $value, $fail) {
                $text = is_array($value) ? ($value['text'] ?? null) : $value;
                if (! is_string($text) || mb_strlen($text) > 500) $fail('Tembusan harus berupa teks maksimal 500 karakter.');
            }],
            'penandatangan_nama' => 'nullable|string|max:255',
            'penandatangan_nip' => 'nullable|string|max:50',
            'employees' => 'nullable|array',
            'employees.*.id' => 'required_with:employees|integer|exists:kpg_employees,id',
            'employees.*.peran' => 'nullable|string|max:100',
            'employees.*.tanggal_mulai' => 'nullable|date',
            'employees.*.tanggal_selesai' => 'nullable|date',
            'nama_plh' => 'nullable|string|max:255',
            'has_seksi_employee' => 'nullable|boolean',
            'jumlah_buruh' => 'nullable|integer|min:0|max:100',
            'tanda_setuju' => 'nullable|string|max:50',
            'keterangan' => 'nullable|string',
            'template_snapshot' => 'nullable|array',
            'template_snapshot.id' => 'nullable|integer',
            'template_snapshot.code' => 'nullable|string|max:100',
            'template_snapshot.name' => 'nullable|string|max:255',
            'template_snapshot.version' => 'nullable|integer',
            'template_snapshot.type' => 'nullable|string|max:100',
            'template_snapshot.menimbang' => 'nullable|array|max:50',
            'template_snapshot.menimbang.*.id' => 'required|string|max:100',
            'template_snapshot.menimbang.*.text' => 'required|string|max:5000',
            'template_snapshot.dasar' => 'nullable|array|max:50',
            'template_snapshot.dasar.*.id' => 'required|string|max:100',
            'template_snapshot.dasar.*.text' => 'required|string|max:5000',
            'template_snapshot.signer' => 'nullable|array:employee_id,name,nip',
            'template_snapshot.signer.*' => Rule::forEach(fn ($value, $attribute) =>
                str_ends_with($attribute, '.employee_id') ? ['nullable', 'integer']
                    : ['nullable', 'string', str_ends_with($attribute, '.nip') ? 'max:50' : 'max:255']),
            ...StoreStTemplateRequest::configurationRules('template_snapshot.configuration'),
        ];

        if (! $isDraft) {
            $rules = array_replace($rules, self::requiredDocumentRules());
        }

        if ($this->isMethod('post') || $this->hasFile('file_surat')) {
            $rules['file_surat'] = 'nullable|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:10240';
        }

        return $rules;
    }

    public static function requiredDocumentRules(): array
    {
        return [
            'maksud_tujuan' => 'required|string|min:5',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'sumber_dana' => 'required|string',
            'employees' => 'required|array|min:1',
            'employees.*.id' => 'required|integer|exists:kpg_employees,id',
        ];
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
