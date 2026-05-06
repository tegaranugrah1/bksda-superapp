<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    // Mematikan kolom updated_at karena log tidak pernah diedit
    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'method',
        'url',
        'ip_address',
        'status_code',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    /**
     * Relasi ke pembuat log (User)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
