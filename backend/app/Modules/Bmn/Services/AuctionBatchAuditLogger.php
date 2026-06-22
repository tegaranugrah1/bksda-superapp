<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\AuctionBatchEvent;
use Illuminate\Support\Facades\Auth;

class AuctionBatchAuditLogger
{
    /**
     * Log an auction batch event.
     *
     * @param string $batchId
     * @param string $action
     * @param string|null $actorId
     * @param string|null $assetId
     * @param array|null $previousValues
     * @param array|null $newValues
     * @param string|null $notes
     * @return AuctionBatchEvent
     */
    public function log(
        string $batchId,
        string $action,
        ?string $actorId = null,
        ?string $assetId = null,
        ?array $previousValues = null,
        ?array $newValues = null,
        ?string $notes = null
    ): AuctionBatchEvent {
        return AuctionBatchEvent::create([
            'bmn_auction_batch_id' => $batchId,
            'action' => $action,
            'actor_id' => $actorId ?? Auth::id(),
            'bmn_asset_id' => $assetId,
            'previous_values' => $previousValues,
            'new_values' => $newValues,
            'notes' => $notes,
            'created_at' => now(),
        ]);
    }
}
