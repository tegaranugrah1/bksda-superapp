<?php

namespace App\Modules\Kepegawaian\Requests;

use App\Modules\Kepegawaian\Enums\StTemplateType;
use Illuminate\Validation\Rule;

class UpdateStTemplateRequest extends StoreStTemplateRequest
{
    public function rules(): array
    {
        $templateId = $this->route('id');

        return array_replace(parent::rules(), [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'nullable', 'string', 'max:100', 'alpha_dash', Rule::unique('st_templates', 'code')->ignore($templateId)],
            'type' => ['sometimes', 'required', Rule::enum(StTemplateType::class)],
        ]);
    }
}
