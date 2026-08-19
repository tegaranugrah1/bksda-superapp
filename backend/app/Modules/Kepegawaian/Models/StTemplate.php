<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class StTemplate extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'type',
        'menimbang',
        'dasar',
        'default_signer_employee_id',
        'default_signer_name',
        'default_signer_nip',
        'configuration',
        'is_system',
        'is_active',
        'is_default',
        'version',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'menimbang' => 'array',
        'dasar' => 'array',
        'configuration' => 'array',
        'is_system' => 'boolean',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'version' => 'integer',
    ];

    public function defaultSigner(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'default_signer_employee_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(StTemplateVersion::class, 'st_template_id');
    }
}
