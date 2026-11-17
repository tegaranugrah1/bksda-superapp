<?php

namespace App\Modules\DeReporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InternalRecipient extends Model
{
    use HasFactory;

    protected $table = 'dr_internal_recipients';

    protected $fillable = [
        'internal_id',
        'recipient_type',
        'user_id',
        'urusan_name',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    public function internal()
    {
        return $this->belongsTo(Internal::class, 'internal_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
