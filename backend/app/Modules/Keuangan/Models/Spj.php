<?php

namespace App\Modules\Keuangan\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Spj extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'keuangan_spj';

    protected $fillable = [
        'nomor_spj',
        'tipe_anggaran',
        'nama_kegiatan',
        'nomor_spt',
        'surat_tugas_id',
        'sumber_dana',
        'kode_awp',
        'satuan_kerja',
        'asal',
        'tujuan',
        'tanggal_mulai',
        'tanggal_selesai',
        'pejabat_ppk',
        'pejabat_pdo',
        'pejabat_verifikator',
        'pejabat_kasubbag',
        'recipients',
        'total_anggaran',
        'employee_count',
        'status',
        'created_by_user_id',
        'creator_name',
    ];

    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
        'pejabat_ppk' => 'array',
        'pejabat_pdo' => 'array',
        'pejabat_verifikator' => 'array',
        'pejabat_kasubbag' => 'array',
        'recipients' => 'array',
        'total_anggaran' => 'float',
        'employee_count' => 'integer',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
