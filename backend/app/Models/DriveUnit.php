<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DriveUnit extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'storage_quota_bytes',
    ];

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'drive_unit_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function folders(): HasMany
    {
        return $this->hasMany(DriveFolder::class, 'unit_id');
    }

    public function files(): HasMany
    {
        return $this->hasMany(DriveFile::class, 'unit_id');
    }

    /**
     * Hitung total kapasitas disk yang terpakai oleh berkas aktif di unit ini.
     */
    public function usedStorageBytes(): int
    {
        return (int) $this->files()->whereNull('deleted_at')->sum('size_bytes');
    }
}
