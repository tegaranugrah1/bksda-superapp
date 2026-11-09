<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StExpenseTemplate extends Model
{
    use SoftDeletes;

    protected static function booted(): void
    {
        static::saving(function (self $template): void {
            if ($template->is_default && !$template->is_active) {
                throw new \DomainException('Template biaya default harus tetap aktif atau ganti default terlebih dahulu.');
            }
        });
    }

    protected $fillable = [
        'name',
        'code',
        'category',
        'biaya_text',
        'dasar_text',
        'is_active',
        'is_default',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
