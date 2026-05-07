<?php

namespace App\Modules\SuratTugas\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class AssignmentLetterEmployee extends Pivot
{
    protected $table = 'st_assignment_letter_employees';

    public $incrementing = true;
}
