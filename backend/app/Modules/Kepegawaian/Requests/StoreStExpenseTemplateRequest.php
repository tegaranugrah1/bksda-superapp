<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStExpenseTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['super_admin', 'admin'], true);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', \Illuminate\Validation\Rule::unique('st_expense_templates', 'code')->whereNull('deleted_at')],
            'category' => ['nullable', 'string', 'in:dipa,kerjasama,hibah_folu,dl1,other,DIPA,KERJASAMA,HIBAH_FOLU,DL1,OTHER'],
            'biaya_text' => ['nullable', 'string'],
            'dasar_text' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
