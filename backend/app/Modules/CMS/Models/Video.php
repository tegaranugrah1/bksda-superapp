<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Video extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_videos';

    protected $fillable = [
        'judul',
        'deskripsi',
        'youtube_url',
        'file_path',
        'thumbnail_path',
        'is_published',
    ];

    protected $casts = [
        'is_published' => 'boolean',
    ];
}
