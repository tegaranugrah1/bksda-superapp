<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $table = 'kpg_holidays';

    protected $fillable = [
        'tanggal',
        'tahun',
        'nama',
        'is_cuti_bersama',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'is_cuti_bersama' => 'boolean',
    ];
}
