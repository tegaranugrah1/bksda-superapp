<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeIncomingLetter extends \Illuminate\Database\Eloquent\Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kpg_incoming_letters';

    protected $fillable = [
        'no_agenda',
        'no_surat_masuk',
        'tanggal_surat',
        'tanggal_diterima',
        'asal_surat',
        'kategori',
        'perihal',
        'catatan',
        'no_surat_balasan',
        'tanggal_surat_balasan',
        'created_by',
    ];

    protected $casts = [
        'tanggal_surat' => 'date:Y-m-d',
        'tanggal_diterima' => 'date:Y-m-d',
        'tanggal_surat_balasan' => 'date:Y-m-d',
    ];

    public function attachments(): HasMany
    {
        return $this->hasMany(EmployeeIncomingLetterAttachment::class, 'incoming_letter_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
