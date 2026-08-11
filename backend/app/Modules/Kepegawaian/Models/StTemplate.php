<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Model;

class StTemplate extends Model
{
    protected $fillable = [
        'name',
        'menimbang',
        'dasar',
    ];

    protected $casts = [
        'menimbang' => 'array',
        'dasar' => 'array',
    ];
}
