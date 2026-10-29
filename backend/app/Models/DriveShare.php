<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Hash;

class DriveShare extends Model
{
    protected $table = 'drive_shares';

    protected $fillable = [
        'file_id',
        'user_id',
        'unit_id',
        'share_type',
        'role',
        'token',
        'password_hash',
        'expires_at',
        'download_count',
        'created_by',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'download_count' => 'integer',
    ];

    protected $hidden = [
        'password_hash',
    ];

    public function file(): BelongsTo
    {
        return $this->belongsTo(DriveFile::class, 'file_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(DriveUnit::class, 'unit_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function hasPassword(): bool
    {
        return !empty($this->password_hash);
    }

    public function verifyPassword(string $password): bool
    {
        if (empty($this->password_hash)) {
            return true;
        }
        return Hash::check($password, $this->password_hash);
    }
}
