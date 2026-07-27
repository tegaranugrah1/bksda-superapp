<?php

namespace App\Modules\Surat\Models;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SuratKeluar extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'surat_keluar';

    protected $fillable = [
        'no_surat',
        'kode_klasifikasi',
        'tanggal_surat',
        'tujuan_surat',
        'perihal',
        'sifat',
        'lampiran',
        'file_path',
        'penandatangan_id',
        'created_by',
    ];

    protected $casts = [
        'tanggal_surat' => 'date',
    ];

    public function penandatangan(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'penandatangan_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
