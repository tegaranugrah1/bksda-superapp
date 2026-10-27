<?php

namespace App\Modules\Kepegawaian\Requests;

use App\Modules\Kepegawaian\Enums\StTemplateType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['super_admin', 'admin'], true);
    }

    public function rules(): array
    {
        $templateId = $this->route('id');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:100', 'alpha_dash', Rule::unique('st_templates', 'code')->ignore($templateId)],
            'description' => ['nullable', 'string', 'max:2000'],
            'type' => ['sometimes', 'required', Rule::enum(StTemplateType::class)],
            'menimbang' => ['nullable', 'array', 'max:50'],
            'menimbang.*.id' => ['required', 'string', 'max:100'],
            'menimbang.*.text' => ['required', 'string', 'max:5000'],
            'dasar' => ['nullable', 'array', 'max:50'],
            'dasar.*.id' => ['required', 'string', 'max:100'],
            'dasar.*.text' => ['required', 'string', 'max:5000'],
            'default_signer_employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'configuration' => ['nullable', 'array', 'max:50'],
            'configuration.header_title' => ['nullable', 'string', 'max:1000'],
            'configuration.nomor_surat_format' => ['nullable', 'string', 'max:255'],
            'configuration.penutup_text' => ['nullable', 'string', 'max:2000'],
            'configuration.signer_title' => ['nullable', 'string', 'max:255'],
            'configuration.signer_authority_mandate' => ['nullable', 'string', 'max:1000'],
            'configuration.tembusan_label' => ['nullable', 'string', 'max:255'],
            'configuration.tembusan_items' => ['nullable', 'array', 'max:50'],
            'configuration.tembusan_items.*' => ['nullable', 'string', 'max:500'],
            'configuration.kop_image_url' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
