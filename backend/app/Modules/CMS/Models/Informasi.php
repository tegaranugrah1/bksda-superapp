<?php

namespace App\Modules\CMS\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Informasi extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_informasi';

    protected $fillable = [
        'category_id',
        'user_id',
        'judul',
        'slug',
        'konten',
        'thumbnail_path',
        'sumber',
        'is_published',
        'published_at',
        'views_count',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'views_count' => 'integer',
    ];

    /** Kategori Berita (Siaran Pers, dll) */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /** Penulis / Admin yang membuat berita */
    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Scope: Hanya tampilkan yang sudah dipublikasikan */
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}
