<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class EmployeeLeaveRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kpg_employee_leave_requests';

    protected $fillable = [
        'employee_id',
        'nomor_pengajuan',
        'tanggal_pengajuan',
        'jenis_cuti',
        'alasan_cuti',
        'jumlah_hari',
        'tanggal_mulai',
        'tanggal_selesai',
        'alamat_menjalankan_cuti',
        'telepon',
        'masa_kerja',
        'sisa_n2',
        'sisa_n1',
        'sisa_n0',
        'status',
        'status_pertimbangan_atasan',
        'status_pertimbangan_pejabat',
        'kasubbag_nama',
        'kasubbag_nip',
        'kepala_balai_nama',
        'kepala_balai_nip',
        'catatan_atasan',
    ];

    protected $casts = [
        'tanggal_pengajuan' => 'date:Y-m-d',
        'tanggal_mulai' => 'date:Y-m-d',
        'tanggal_selesai' => 'date:Y-m-d',
        'jumlah_hari' => 'integer',
        'sisa_n2' => 'integer',
        'sisa_n1' => 'integer',
        'sisa_n0' => 'integer',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
