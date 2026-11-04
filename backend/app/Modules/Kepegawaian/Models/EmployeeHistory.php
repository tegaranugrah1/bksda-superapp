<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeHistory extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'kpg_employee_histories';

    protected $fillable = [
        'employee_id',
        'user_id',
        'action',
        'changes',
        'notes',
        'created_at',
    ];

    protected $casts = [
        'changes' => 'array',
        'created_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
