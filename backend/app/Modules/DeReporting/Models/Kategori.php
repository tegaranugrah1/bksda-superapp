<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Kategori extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_kategori';

    protected $fillable = [
        'jenis_id',
        'nama',
    ];

    public function jenis()
    {
        return $this->belongsTo(Jenis::class, 'jenis_id');
    }

    public function jenisData()
    {
        return $this->hasMany(JenisData::class, 'kategori_id');
    }

    public function laporanInternal()
    {
        return $this->hasMany(Internal::class, 'kategori_id');
    }
}
