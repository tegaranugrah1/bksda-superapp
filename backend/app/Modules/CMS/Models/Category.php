<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_categories';

    protected $fillable = [
        'nama',
        'slug',
        'tipe',
        'urutan',
    ];

    protected $casts = [
        'urutan' => 'integer',
    ];

    /** Berita yang termasuk kategori ini */
    public function informasi()
    {
        return $this->hasMany(Informasi::class, 'category_id');
    }
}
