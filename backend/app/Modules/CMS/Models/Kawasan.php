<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Kawasan extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_kawasan';

    protected $fillable = [
        'nama',
        'slug',
        'deskripsi',
        'thumbnail_path',
        'latitude',
        'longitude',
        'luas_ha',
        'tipe_kawasan',
        'is_published',
    ];

    protected $casts = [
        'latitude'     => 'float',
        'longitude'    => 'float',
        'luas_ha'      => 'float',
        'is_published' => 'boolean',
    ];
}
