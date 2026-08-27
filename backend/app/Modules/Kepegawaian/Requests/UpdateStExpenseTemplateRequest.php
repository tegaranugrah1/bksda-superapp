<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStExpenseTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:100', Rule::unique('st_expense_templates', 'code')->ignore($id)],
            'category' => ['nullable', 'string', 'in:dipa,kerjasama,hibah_folu,dl1,other'],
            'biaya_text' => ['nullable', 'string'],
            'dasar_text' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'is_default' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ];
    }
}
