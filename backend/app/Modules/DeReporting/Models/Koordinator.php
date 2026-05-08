<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Koordinator extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_koordinator';

    protected $fillable = [
        'nama',
    ];

    public function jenisData()
    {
        return $this->hasMany(JenisData::class, 'koordinator_id');
    }

    public function laporanInternal()
    {
        return $this->hasMany(Internal::class, 'koordinator_id');
    }
}
