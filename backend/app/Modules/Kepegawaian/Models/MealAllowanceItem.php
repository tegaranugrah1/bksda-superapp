<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MealAllowanceItem extends Model
{
    use HasFactory;

    protected $table = 'kpg_meal_allowance_items';

    protected $fillable = [
        'batch_id',
        'employee_id',
        'nip',
        'nama_lengkap',
        'jabatan',
        'jenis_pegawai',
        'tahun_angkatan',
        'satuan_kerja',
        'golongan',
        'nama_bank',
        'nomor_rekening',
        'tarif_harian',
        'persen_pph21',
        'jml_hari_kerja',
        'jml_hadir',
        'jml_pd',
        'jml_cuti',
        'jml_sakit',
        'jml_izin',
        'jml_alpa',
        'uang_makan_bruto',
        'potongan_pph21',
        'uang_makan_netto',
        'daily_matrix',
        'override_logs',
    ];

    protected $casts = [
        'batch_id' => 'integer',
        'employee_id' => 'integer',
        'tahun_angkatan' => 'integer',
        'tarif_harian' => 'decimal:2',
        'persen_pph21' => 'decimal:2',
        'jml_hari_kerja' => 'integer',
        'jml_hadir' => 'integer',
        'jml_pd' => 'integer',
        'jml_cuti' => 'integer',
        'jml_sakit' => 'integer',
        'jml_izin' => 'integer',
        'jml_alpa' => 'integer',
        'uang_makan_bruto' => 'decimal:2',
        'potongan_pph21' => 'decimal:2',
        'uang_makan_netto' => 'decimal:2',
        'daily_matrix' => 'array',
        'override_logs' => 'array',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MealAllowanceBatch::class, 'batch_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
