<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAuctionValuationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('bmn.auction.update');
    }

    public function rules(): array
    {
        return [
            'lot_number' => ['nullable', 'string', 'max:50'],
            'nilai_taksiran' => ['nullable', 'numeric', 'min:0'],
            'kertas_kerja_data' => ['nullable', 'array'],
        ];
    }
}
