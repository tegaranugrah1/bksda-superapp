<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AssetType extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_types';

    protected $fillable = [
        'name',
        'category_mode',
        'description',
    ];

    public function assets()
    {
        return $this->hasMany(Asset::class, 'jenis_bmn', 'name');
    }
}
