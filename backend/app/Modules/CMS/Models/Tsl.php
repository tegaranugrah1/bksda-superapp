<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tsl extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_tsl';

    protected $fillable = [
        'nama_lokal',
        'nama_latin',
        'slug',
        'deskripsi',
        'thumbnail_path',
        'status_iucn',
        'tipe',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    /** Scope: Hanya tampilkan satwa */
    public function scopeSatwa($query)
    {
        return $query->where('tipe', 'satwa');
    }

    /** Scope: Hanya tampilkan tumbuhan */
    public function scopeTumbuhan($query)
    {
        return $query->where('tipe', 'tumbuhan');
    }
}
