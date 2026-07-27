<?php

namespace App\Modules\Surat\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SuratDisposisi extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'surat_disposisi';

    protected $fillable = [
        'surat_masuk_id',
        'diteruskan_json',
        'instruksi_json',
        'catatan',
        'ka_subbag_tu_id',
        'kepala_balai_id',
    ];

    protected $casts = [
        'diteruskan_json' => 'array',
        'instruksi_json' => 'array',
    ];

    public function suratMasuk(): BelongsTo
    {
        return $this->belongsTo(SuratMasuk::class, 'surat_masuk_id');
    }

    public function kaSubbagTu(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'ka_subbag_tu_id');
    }

    public function kepalaBalai(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'kepala_balai_id');
    }
}
