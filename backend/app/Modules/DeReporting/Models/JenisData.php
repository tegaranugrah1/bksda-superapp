<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JenisData extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_jenis_data';

    protected $fillable = [
        'kategori_id',
        'koordinator_id',
        'nama',
    ];

    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'kategori_id');
    }

    public function koordinator()
    {
        return $this->belongsTo(Koordinator::class, 'koordinator_id');
    }

    public function laporanInternal()
    {
        return $this->hasMany(Internal::class, 'jenis_data_id');
    }
}
