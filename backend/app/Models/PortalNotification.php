<?php

namespace App\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PortalNotification extends Model
{
    use HasFactory;

    protected $table = 'portal_notifications';

    /**
     * Sesuai Rule 1.3: Dilarang menggunakan $guarded = []
     */
    protected $fillable = [
        'user_id',
        'employee_id',
        'title',
        'message',
        'type',
        'action_tab',
        'reference_id',
        'data',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
