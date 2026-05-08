<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Photo extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_photos';

    protected $fillable = [
        'judul',
        'deskripsi',
        'file_path',
        'album',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];
}
