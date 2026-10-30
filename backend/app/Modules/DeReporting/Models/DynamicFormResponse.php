<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DynamicFormResponse extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_form_responses';

    protected $fillable = [
        'form_id',
        'answers',
        'file_paths',
        'ip_address',
        'drive_folder_id',
    ];

    protected $casts = [
        'answers' => 'array',
        'file_paths' => 'array',
    ];

    public function form(): BelongsTo
    {
        return $this->belongsTo(DynamicForm::class, 'form_id');
    }

    public function driveFolder(): BelongsTo
    {
        return $this->belongsTo(\App\Models\DriveFolder::class, 'drive_folder_id');
    }
}
