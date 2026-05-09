<?php

namespace App\Modules\DeReporting\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOperatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => 'required|uuid|exists:users,id',
            'bidang_id' => 'required|uuid|exists:dr_bidang,id',
        ];
    }
}
