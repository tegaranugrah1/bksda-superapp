<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leaflet extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_leaflet';

    protected $fillable = [
        'jenis_id',
        'judul',
        'slug',
        'deskripsi',
        'file_path',
        'thumbnail_path',
        'tipe',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    /** Sihir STI: Otomatis filter hanya data bertipe 'leaflet' */
    protected static function booted(): void
    {
        static::addGlobalScope('leaflet', function ($query) {
            $query->where('tipe', 'leaflet');
        });
    }

    /** Otomatis set tipe saat membuat data baru */
    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            $model->tipe = 'leaflet';
        });
    }

    /** Jenis publikasi */
    public function jenis()
    {
        return $this->belongsTo(Jenis::class, 'jenis_id');
    }
}
