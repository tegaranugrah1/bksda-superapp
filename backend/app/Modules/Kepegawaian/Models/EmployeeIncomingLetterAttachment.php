<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class EmployeeIncomingLetterAttachment extends Model
{
    use HasFactory;

    protected $table = 'kpg_incoming_letter_attachments';

    protected $fillable = [
        'incoming_letter_id',
        'type',
        'original_name',
        'storage_path',
        'mime_type',
        'size',
        'note',
    ];

    public function incomingLetter(): BelongsTo
    {
        return $this->belongsTo(EmployeeIncomingLetter::class, 'incoming_letter_id');
    }
}
