<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FirstAuctionResultsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('bmn.auction.finalize');
    }

    public function rules(): array
    {
        return [
            'assets' => ['required', 'array', 'min:1'],
            'assets.*.bmn_asset_id' => ['required', 'string', 'uuid'],
            'assets.*.first_auction_is_sold' => ['required', 'boolean'],
            'assets.*.first_auction_price' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            foreach ($this->input('assets', []) as $index => $asset) {
                $isSold = $asset['first_auction_is_sold'] ?? false;
                $price = $asset['first_auction_price'] ?? null;

                if ($isSold && is_null($price)) {
                    $validator->errors()->add("assets.$index.first_auction_price", 'Harga terbentuk wajib diisi untuk aset terjual.');
                }
            }
        });
    }
}
