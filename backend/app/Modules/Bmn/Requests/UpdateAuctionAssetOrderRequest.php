<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAuctionAssetOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('bmn.auction.update');
    }

    public function rules(): array
    {
        return [
            'ordered_asset_ids' => ['required', 'array', 'min:1'],
            'ordered_asset_ids.*' => ['required', 'string', 'uuid'],
        ];
    }
}
