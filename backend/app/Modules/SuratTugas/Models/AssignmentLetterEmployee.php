<?php

namespace App\Modules\SuratTugas\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class AssignmentLetterEmployee extends Pivot
{
    protected $table = 'st_assignment_letter_employees';

    public $incrementing = true;

    protected $casts = [
        'tanggal_mulai' => 'date:Y-m-d',
        'tanggal_selesai' => 'date:Y-m-d',
    ];
}
