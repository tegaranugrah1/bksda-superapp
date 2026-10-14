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
    ];

    protected $casts = [
        'fields' => 'array',
        'is_active' => 'boolean',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(DynamicFormResponse::class, 'form_id');
    }
}
