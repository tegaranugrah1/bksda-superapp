<?php

namespace App\Modules\SuratTugas\Models;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AssignmentLetter extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'st_assignment_letters';

    protected $fillable = [
        'nomor_surat',
        'dasar_hukum',
        'maksud_tujuan',
        'tanggal_mulai',
        'tanggal_selesai',
        'tempat_tujuan',
        'status',
        'file_surat_path',
        'created_by',
        'approved_by',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(
            Employee::class,
            'st_assignment_letter_employees',
            'assignment_letter_id',
            'employee_id'
        )
        ->using(AssignmentLetterEmployee::class)
        ->withPivot('peran')
        ->withTimestamps();
    }
}
