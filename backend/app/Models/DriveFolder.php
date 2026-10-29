<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DriveFolder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'unit_id',
        'user_id',
        'parent_id',
        'name',
        'color',
        'is_starred',
    ];

    protected function casts(): array
    {
        return [
            'is_starred' => 'boolean',
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(DriveUnit::class, 'unit_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(DriveFolder::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(DriveFolder::class, 'parent_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DriveFile::class, 'folder_id');
    }
}
