<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Anggaran extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_anggaran';

    protected $fillable = [
        'nama',
    ];

    public function laporanInternal()
    {
        return $this->hasMany(Internal::class, 'anggaran_id');
    }
}
