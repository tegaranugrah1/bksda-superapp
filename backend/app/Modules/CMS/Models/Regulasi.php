<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Regulasi extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_regulasi';

    protected $fillable = [
        'jenis_id',
        'judul',
        'slug',
        'nomor',
        'tahun',
        'deskripsi',
        'file_path',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];

    /** Jenis regulasi */
    public function jenis()
    {
        return $this->belongsTo(Jenis::class, 'jenis_id');
    }
}
