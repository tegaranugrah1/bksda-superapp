<?php

namespace App\Modules\Bmn\Models;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoveringLetter extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'bmn_covering_letters';

    protected $fillable = [
        'sender_employee_id',
        'generated_by',
        'number',
        'regarding',
        'document_date',
        'recipient_title',
        'recipient_location',
        'items_snapshot',
        'closing_phrase',
        'received_date',
        'show_signatures',
        'sender_snapshot',
        'receiver_snapshot',
        'metadata',
        'notes',
    ];

    protected $casts = [
        'document_date' => 'date',
        'received_date' => 'date',
        'show_signatures' => 'boolean',
        'items_snapshot' => 'array',
        'sender_snapshot' => 'array',
        'receiver_snapshot' => 'array',
        'metadata' => 'array',
    ];

    public function senderEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'sender_employee_id');
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
