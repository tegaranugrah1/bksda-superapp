<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuctionBatchEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bmn_auction_batch_id' => $this->bmn_auction_batch_id,
            'bmn_asset_id' => $this->bmn_asset_id,
            'actor_id' => $this->actor_id,
            'actor_name' => $this->actor ? ($this->actor->name ?? $this->actor->nama_lengkap ?? null) : null,
            'action' => $this->action,
            'previous_values' => $this->previous_values,
            'new_values' => $this->new_values,
            'notes' => $this->notes,
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
        ];
    }
}
