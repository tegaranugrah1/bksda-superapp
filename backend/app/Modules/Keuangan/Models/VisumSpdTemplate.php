<?php

namespace App\Modules\Keuangan\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VisumSpdTemplate extends Model
{
    use HasFactory;

    protected $table = 'visum_spd_templates';

    protected $fillable = [
        'name',
        'description',
        'is_default',
        'auto_today_date',
        'data',
        'created_by',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'auto_today_date' => 'boolean',
        'data' => 'array',
    ];
}
