<?php

namespace App\Modules\Kepegawaian\Requests;

use App\Modules\Kepegawaian\Enums\StTemplateType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'super_admin';
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
            'configuration' => ['nullable', 'array', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
