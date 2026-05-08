<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Models\User;

class AssetUpdate extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_updates';

    protected $fillable = [
        'asset_id', 'user_id', 'field_changed',
        'old_value', 'new_value', 'alasan_perubahan'
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
