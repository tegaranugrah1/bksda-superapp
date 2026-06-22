<?php

namespace App\Modules\Bmn\Models;

use App\Modules\Bmn\Enums\AuctionAssetFinalResult;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetAuctionBatch extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_auction_batch';

    protected $fillable = [
        'id',
        'bmn_auction_batch_id',
        'bmn_asset_id',
        'lot_number',
        'nilai_taksiran',
        'kertas_kerja_data',
        'sort_order',
        'asset_snapshot',
        'freeze_snapshot',
        'first_auction_is_sold',
        'first_auction_price',
        'reauction_is_sold',
        'reauction_price',
        'final_result',
        'final_price',
        'final_auction_date',
        'disposed_at',
    ];

    protected $casts = [
        'nilai_taksiran' => 'decimal:2',
        'kertas_kerja_data' => 'array',
        'sort_order' => 'integer',
        'asset_snapshot' => 'array',
        'freeze_snapshot' => 'array',
        'first_auction_is_sold' => 'boolean',
        'first_auction_price' => 'decimal:2',
        'reauction_is_sold' => 'boolean',
        'reauction_price' => 'decimal:2',
        'final_result' => AuctionAssetFinalResult::class,
        'final_price' => 'decimal:2',
        'final_auction_date' => 'date',
        'disposed_at' => 'datetime',
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
