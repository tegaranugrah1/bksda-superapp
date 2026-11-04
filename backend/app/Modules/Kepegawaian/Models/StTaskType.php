<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StTaskType extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nama',
        'kode',
        'mode_lokasi',
        'aturan_durasi',
        'default_sertakan_laporan',
        'contoh_format',
        'keterangan',
        'urutan',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'default_sertakan_laporan' => 'boolean',
        'is_active' => 'boolean',
        'urutan' => 'integer',
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
