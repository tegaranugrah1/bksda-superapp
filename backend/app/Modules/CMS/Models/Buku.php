<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Buku extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_buku';

    protected $fillable = [
        'jenis_id',
        'judul',
        'slug',
        'deskripsi',
        'penulis',
        'penerbit',
        'tahun_terbit',
        'cover_path',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    /** Jenis publikasi buku ini */
    public function jenis()
    {
        return $this->belongsTo(Jenis::class, 'jenis_id');
    }
}
