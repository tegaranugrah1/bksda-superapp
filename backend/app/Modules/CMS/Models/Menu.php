<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Menu extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_menus';

    protected $fillable = [
        'label',
        'url',
        'posisi',
        'parent_id',
        'urutan',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];

    /** Induk menu (jika ini adalah sub-menu) */
    public function parent()
    {
        return $this->belongsTo(Menu::class, 'parent_id');
    }

    /** Anak-anak menu (sub-menu di bawahnya) */
    public function children()
    {
        return $this->hasMany(Menu::class, 'parent_id')->orderBy('urutan');
    }
}
