<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DriveFile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'unit_id',
        'user_id',
        'folder_id',
        'name',
        's3_key',
        'size_bytes',
        'mime_type',
        'is_starred',
        'source_module',
        'source_id',
    ];

    protected function casts(): array
    {
        return [
            'is_starred' => 'boolean',
            'size_bytes' => 'integer',
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

    public function folder(): BelongsTo
    {
        return $this->belongsTo(DriveFolder::class, 'folder_id');
    }
}
