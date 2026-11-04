<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class EmployeeLeaveRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'kpg_employee_leave_requests';

    protected $fillable = [
        'employee_id',
        'surat_keluar_id',
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
        'scan_surat_path',
        'scan_surat_nama',
        'scan_surat_uploaded_at',
        'scan_surat_uploaded_by',
        'scan_formulir_path',
        'scan_formulir_nama',
        'scan_surat_izin_path',
        'scan_surat_izin_nama',
    ];

    protected $casts = [
        'tanggal_pengajuan' => 'date:Y-m-d',
        'tanggal_mulai' => 'date:Y-m-d',
        'tanggal_selesai' => 'date:Y-m-d',
        'jumlah_hari' => 'integer',
        'sisa_n2' => 'integer',
        'sisa_n1' => 'integer',
        'sisa_n0' => 'integer',
        'scan_surat_uploaded_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function suratKeluar(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Surat\Models\SuratKeluar::class, 'surat_keluar_id');
    }

    public function isAnnual(): bool
    {
        return (bool) LeaveType::withTrashed()->matchingNameOrCode((string) $this->jenis_cuti)
            ->first()?->potong_kuota_tahunan;
    }

    public function scopeAnnual(Builder $query): Builder
    {
        // Legacy rows may contain a master code; inactive/deleted types still account for past leave.
        $types = LeaveType::withTrashed()->where('potong_kuota_tahunan', true);
        $column = DB::raw('LOWER(TRIM('.$this->qualifyColumn('jenis_cuti').'))');

        return $query->where(function (Builder $annual) use ($types, $column) {
            $annual->whereIn($column, (clone $types)->selectRaw('LOWER(TRIM(nama))'))
                ->orWhereIn($column, (clone $types)->whereNotNull('kode')->selectRaw('LOWER(TRIM(kode))'));
        });
    }
}
