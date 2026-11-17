<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStExpenseTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdminFor('kepegawaian');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', \Illuminate\Validation\Rule::unique('st_expense_templates', 'code')],
            'category' => ['nullable', 'string', 'in:dipa,kerjasama,hibah_folu,dl1,other,DIPA,KERJASAMA,HIBAH_FOLU,DL1,OTHER'],
            'biaya_text' => ['nullable', 'string', 'max:5000'],
            'dasar_text' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
