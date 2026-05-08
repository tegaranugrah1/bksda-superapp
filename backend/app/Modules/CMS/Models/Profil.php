<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Profil extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_profil';

    protected $fillable = [
        'judul',
        'slug',
        'konten',
        'thumbnail_path',
        'urutan',
        'is_published',
    ];

    protected $casts = [
        'urutan'       => 'integer',
        'is_published' => 'boolean',
    ];
}
