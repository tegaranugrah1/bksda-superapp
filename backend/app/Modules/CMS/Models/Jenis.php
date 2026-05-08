<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Jenis extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_jenis';

    protected $fillable = [
        'nama',
        'tipe',
    ];

    /** Buku yang termasuk jenis ini */
    public function buku()
    {
        return $this->hasMany(Buku::class, 'jenis_id');
    }

    /** Regulasi yang termasuk jenis ini */
    public function regulasi()
    {
        return $this->hasMany(Regulasi::class, 'jenis_id');
    }
}
