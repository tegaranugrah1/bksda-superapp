<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model
{
    use HasUuids;

    protected $table = 'bmn_tags';

    protected $fillable = [
        'id',
        'name',
        'label',
        'color',
        'description',
    ];

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'bmn_asset_tag', 'tag_id', 'asset_id')
            ->withTimestamps();
    }
}
