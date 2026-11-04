<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tag extends Model
{
    use HasUuids;

    protected $table = 'bmn_tags';

    protected $fillable = [
        'id',
        'parent_id',
        'name',
        'label',
        'color',
        'description',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Tag::class, 'parent_id');
    }

    public function subTags(): HasMany
    {
        return $this->hasMany(Tag::class, 'parent_id')->orderBy('label', 'asc');
    }

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'bmn_asset_tag', 'tag_id', 'asset_id')
            ->withTimestamps();
    }

    public function isMainTag(): bool
    {
        return is_null($this->parent_id);
    }

    public function isSubTag(): bool
    {
        return !is_null($this->parent_id);
    }

    /**
     * Get IDs of this tag and all its sub-tags.
     *
     * @return string[]
     */
    public function getFamilyTagIds(): array
    {
        if ($this->isMainTag()) {
            $subIds = $this->subTags->pluck('id')->toArray();
            return array_merge([$this->id], $subIds);
        }

        return [$this->id];
    }
}
