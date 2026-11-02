<?php

namespace App\Modules\DeReporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class DynamicForm extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_forms';

    protected $fillable = [
        'title',
        'slug',
        'description',
        'fields',
        'is_active',
        'created_by',
        'drive_folder_id',
        'closed_at',
        'closed_message',
    ];

    protected $casts = [
        'fields' => 'array',
        'is_active' => 'boolean',
        'closed_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function driveFolder(): BelongsTo
    {
        return $this->belongsTo(\App\Models\DriveFolder::class, 'drive_folder_id');
    }

    public function isClosed(): bool
    {
        if (! $this->is_active) {
            return true;
        }

        if ($this->closed_at && now()->greaterThanOrEqualTo($this->closed_at)) {
            return true;
        }

        return false;
    }

    public function responses(): HasMany
    {
        return $this->hasMany(DynamicFormResponse::class, 'form_id');
    }
}
