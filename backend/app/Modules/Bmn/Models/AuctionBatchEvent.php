<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionBatchEvent extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $table = 'bmn_auction_batch_events';

    protected $fillable = [
        'id',
        'bmn_auction_batch_id',
        'bmn_asset_id',
        'actor_id',
        'action',
        'previous_values',
        'new_values',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'previous_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(AuctionBatch::class, 'bmn_auction_batch_id');
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class, 'bmn_asset_id');
    }
}
