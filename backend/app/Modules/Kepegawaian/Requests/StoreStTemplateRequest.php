<?php

namespace App\Modules\Kepegawaian\Requests;

use App\Modules\Kepegawaian\Enums\StTemplateType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['super_admin', 'admin'], true);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', 'alpha_dash', 'unique:st_templates,code'],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['required', Rule::enum(StTemplateType::class)],
            'menimbang' => ['nullable', 'array', 'max:50'],
            'menimbang.*.id' => ['required', 'string', 'max:100'],
            'menimbang.*.text' => ['required', 'string', 'max:5000'],
            'dasar' => ['nullable', 'array', 'max:50'],
            'dasar.*.id' => ['required', 'string', 'max:100'],
            'dasar.*.text' => ['required', 'string', 'max:5000'],
            'default_signer_employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            ...self::configurationRules(),
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    public static function configurationRules(string $prefix = 'configuration'): array
    {
        $rules = [
            '' => 'nullable|array|max:50',
            '.header_title' => 'nullable|string|max:1000',
            '.nomor_surat_format' => 'nullable|string|max:255',
            '.penutup_text' => 'nullable|string|max:2000',
            '.signer_title' => 'nullable|string|max:255',
            '.signer_authority_mandate' => 'nullable|string|max:1000',
            '.tembusan_label' => 'nullable|string|max:255',
            '.tembusan_items' => 'nullable|array|max:50',
            '.tembusan_items.*' => 'nullable|string|max:500',
            '.kop_image_url' => 'nullable|string|max:1000',
            '.date_format_style' => 'nullable|in:inline,tabular',
            '.tembusan_position' => 'nullable|in:beside,bottom',
            '.sumber_dana' => 'nullable|string|max:255',
            '.klasifikasi' => 'nullable|string|max:255',
            '.default_jenis_tugas' => 'nullable|string|max:255',
            '.default_task_type_id' => 'nullable|integer',
            '.default_sertakan_laporan' => 'nullable|boolean',
            '.default_mode_kegiatan' => 'nullable|in:structured,manual',
            '.default_kegiatan' => 'nullable|string|max:5000',
            '.nomor_numbering_type' => 'nullable|in:st_pattern,naskah_auto',
            '.custom_nomor_naskah' => 'nullable|string|max:255',
            '.input_mode_kegiatan' => 'nullable|in:structured,manual',
            '.biaya_text' => 'nullable|string|max:5000',
            '.judul_lampiran_beda_hari' => 'nullable|string|max:1000',
            '.show_departure_column' => 'nullable|boolean',
            '.employee_departures' => 'nullable|array|max:200',
            '.employee_departures.*' => 'nullable|string|max:255',
            '.employee_dates' => 'nullable|array|max:200',
            '.employee_dates.*' => 'array:mulai,selesai',
            '.employee_dates.*.mulai' => 'nullable|date',
            '.employee_dates.*.selesai' => 'nullable|date',
            '.untuk' => 'nullable|array|max:50',
            '.untuk.*.id' => 'required_with:'.$prefix.'.untuk|string|max:100',
            '.untuk.*.text' => 'required_with:'.$prefix.'.untuk|string|max:5000',
        ];
        return array_combine(array_map(fn ($field) => $prefix.$field, array_keys($rules)), array_values($rules));
    }
}
