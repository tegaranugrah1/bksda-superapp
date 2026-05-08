<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tahun extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_tahun';

    protected $fillable = [
        'tahun',
        'is_active',
    ];

    public function laporanInternal()
    {
        return $this->hasMany(Internal::class, 'tahun_id');
    }
}
