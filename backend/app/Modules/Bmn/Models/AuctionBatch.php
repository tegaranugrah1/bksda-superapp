<?php

namespace App\Modules\Bmn\Models;

use App\Modules\Bmn\Enums\AuctionBatchStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class AuctionBatch extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'bmn_auction_batches';

    protected $fillable = [
        'id',
        'batch_number',
        'name',
        'status',
        'no_surat_persetujuan',
        'tanggal_surat_persetujuan',
        'no_surat_penetapan',
        'tanggal_lelang',
        'reauction_count',
        'no_surat_jadwal_ulang',
        'tanggal_lelang_ulang',
        'reauction_notes',
        'kepala_balai_id',
        'metadata',
        'realized_at',
        'canceled_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => AuctionBatchStatus::class,
        'tanggal_surat_persetujuan' => 'date',
        'tanggal_lelang' => 'date',
        'tanggal_lelang_ulang' => 'date',
        'metadata' => 'array',
        'realized_at' => 'datetime',
        'canceled_at' => 'datetime',
        'reauction_count' => 'integer',
    ];

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'bmn_asset_auction_batch', 'bmn_auction_batch_id', 'bmn_asset_id')
            ->withPivot([
                'id',
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
            ])
            ->withTimestamps()
            ->orderBy('bmn_asset_auction_batch.sort_order');
    }

    public function assetRows(): HasMany
    {
        return $this->hasMany(AssetAuctionBatch::class, 'bmn_auction_batch_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(AuctionBatchEvent::class, 'bmn_auction_batch_id');
    }

    public function isDraft(): bool
    {
        return $this->status === AuctionBatchStatus::DRAFT;
    }

    public function isFinal(): bool
    {
        return $this->status instanceof AuctionBatchStatus && $this->status->isFinal();
    }

    public function isReadOnly(): bool
    {
        return $this->isFinal();
    }
}
