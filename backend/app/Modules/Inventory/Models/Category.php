<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inv_categories';

    protected $fillable = [
        'nama_kategori',
        'deskripsi'
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'category_id');
    }
}
