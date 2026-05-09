<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AssetMaintenance extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_maintenances';

    protected $fillable = [
        'asset_id', 'tanggal_service', 'biaya', 'deskripsi', 'bukti_nota_url',
    ];

    protected $casts = [
        'tanggal_service' => 'date',
        'biaya' => 'decimal:2',
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}
