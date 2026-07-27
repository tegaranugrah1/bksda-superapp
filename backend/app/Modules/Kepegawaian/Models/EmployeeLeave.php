<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeLeave extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kpg_employee_leaves';

    protected $fillable = [
        'employee_id',
        'year',
        'hak_cuti_n',
        'sisa_cuti_n1',
        'cuti_terpakai_n1',
        'sisa_cuti_n2',
        'cuti_terpakai_n2',
        'cuti_terpakai_n0',
        'catatan',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'hak_cuti_n' => 'integer',
        'sisa_cuti_n1' => 'integer',
        'cuti_terpakai_n1' => 'integer',
        'sisa_cuti_n2' => 'integer',
        'cuti_terpakai_n2' => 'integer',
        'cuti_terpakai_n0' => 'integer',
    ];

    protected $appends = [
        'hak_n1_diakui',
        'hak_n2_diakui',
        'total_hak_cuti',
        'sisa_cuti_tersedia',
        'is_eligible_24_days',
    ];

    /**
     * Sisa cuti N-1 yang diakui di tahun berjalan N (Maksimal 6 Hari Sesuai PerBKN 24/2017)
     */
    public function getHakN1DiakuiAttribute(): int
    {
        return min(6, max(0, (int) $this->sisa_cuti_n1));
    }

    /**
     * Hak Cuti N-2 yang diakui (Akumulasi 24 Hari)
     * Syarat: 0 hari terpakai di N-1 dan 0 hari terpakai di N-2, serta sisa N-1 >= 12 dan sisa N-2 >= 12.
     */
    public function getIsEligible24DaysAttribute(): bool
    {
        return (int) $this->cuti_terpakai_n1 === 0
            && (int) $this->cuti_terpakai_n2 === 0
            && (int) $this->sisa_cuti_n1 >= 12
            && (int) $this->sisa_cuti_n2 >= 12;
    }

    public function getHakN2DiakuiAttribute(): int
    {
        return $this->is_eligible_24_days ? 6 : 0;
    }

    /**
     * Total Hak Cuti Tahun Berjalan N (PerBKN 24/2017 & 7/2021)
     * Hak N (12) + Hak N-1 (Max 6) + Hak N-2 (6 jika eligible 24 hari, else 0)
     */
    public function getTotalHakCutiAttribute(): int
    {
        $n = (int) ($this->hak_cuti_n ?: 12);
        return $n + $this->hak_n1_diakui + $this->hak_n2_diakui;
    }

    /**
     * Sisa Cuti Tersedia Saat Ini (N)
     */
    public function getSisaCutiTersediaAttribute(): int
    {
        return max(0, $this->total_hak_cuti - (int) $this->cuti_terpakai_n0);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
