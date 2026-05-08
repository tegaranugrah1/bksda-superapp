<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Kepala extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_kepala';

    protected $fillable = [
        'nama',
        'nip',
        'jabatan',
        'foto_path',
        'sambutan',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /** Scope: Hanya tampilkan kepala yang aktif */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
