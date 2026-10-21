<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LeaveType extends Model
{
    use SoftDeletes;

    protected $table = 'kpg_leave_types';

    protected $fillable = [
        'nama',
        'kode',
        'hitung_hari',
        'potong_kuota_tahunan',
        'maks_hari',
        'keterangan',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'potong_kuota_tahunan' => 'boolean',
        'is_active' => 'boolean',
        'maks_hari' => 'integer',
        'urutan' => 'integer',
    ];
}
