<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MealAllowanceBatch extends Model
{
    use HasFactory;

    protected $table = 'kpg_meal_allowance_batches';

    protected $fillable = [
        'periode_bulan',
        'nama_batch',
        'total_pegawai',
        'total_hari_kerja',
        'total_bruto',
        'total_pph21',
        'total_netto',
        'penandatangan_nama',
        'penandatangan_nip',
        'penandatangan_jabatan',
        'status',
        'created_by',
    ];

    protected $casts = [
        'total_pegawai' => 'integer',
        'total_hari_kerja' => 'integer',
        'total_bruto' => 'decimal:2',
        'total_pph21' => 'decimal:2',
        'total_netto' => 'decimal:2',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(MealAllowanceItem::class, 'batch_id');
    }
}
