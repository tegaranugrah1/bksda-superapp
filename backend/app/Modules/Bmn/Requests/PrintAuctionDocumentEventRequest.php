<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PrintAuctionDocumentEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasPermission('bmn.auction.print');
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
