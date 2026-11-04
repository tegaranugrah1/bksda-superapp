<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriveUpload extends Model
{
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'unit_id',
        'folder_id',
        'filename',
        's3_key',
        'upload_id',
        'total_size_bytes',
        'parts_count',
        'status',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'total_size_bytes' => 'integer',
            'parts_count' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(DriveUnit::class, 'unit_id');
    }
}
