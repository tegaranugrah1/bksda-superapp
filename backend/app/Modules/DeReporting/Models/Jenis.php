<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Jenis extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_jenis';

    protected $fillable = [
        'bidang_id',
        'nama',
    ];

    public function bidang()
    {
        return $this->belongsTo(Bidang::class, 'bidang_id');
    }

    public function kategori()
    {
        return $this->hasMany(Kategori::class, 'jenis_id');
    }

    public function laporanInternal()
    {
        return $this->hasMany(Internal::class, 'jenis_id');
    }
}
