<?php

namespace App\Modules\Kepegawaian\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveType extends Model
{
    use SoftDeletes;

    protected $table = 'kpg_leave_types';

    protected $fillable = [
        'nama',
        'kode',
        'hitung_hari',
        'potong_kuota_tahunan',
        'maks_hari',
        'keterangan',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'potong_kuota_tahunan' => 'boolean',
        'is_active' => 'boolean',
        'maks_hari' => 'integer',
        'urutan' => 'integer',
    ];

    public static function lockCatalog(bool $write = false): void
    {
        // ponytail: catalog writes wait for active leave transactions; use immutable type IDs
        // if measured contention warrants replacing this table lock.
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::statement('LOCK TABLE kpg_leave_types IN '.($write ? 'SHARE ROW EXCLUSIVE' : 'SHARE').' MODE');
        }
    }

    public function scopeMatchingNameOrCode(Builder $query, string $value): Builder
    {
        $normalized = mb_strtolower(trim($value));

        return $query->where(function (Builder $match) use ($normalized) {
            $match->whereRaw('LOWER(TRIM(nama)) = ?', [$normalized])
                ->orWhereRaw('LOWER(TRIM(kode)) = ?', [$normalized]);
        });
    }

    public static function forEmployee(string $value, Employee $employee): self
    {
        $type = static::where('is_active', true)->matchingNameOrCode($value)->first();
        if (! $type) {
            throw ValidationException::withMessages([
                'jenis_cuti' => ['Pilih jenis cuti aktif yang terdaftar.'],
            ]);
        }

        if ($employee->is_pppk && (strtoupper((string) $type->kode) === 'CAP'
            || str_contains(mb_strtolower($type->nama), 'alasan penting'))) {
            throw ValidationException::withMessages([
                'jenis_cuti' => ['Pegawai PPPK tidak berhak mengajukan Cuti Karena Alasan Penting.'],
            ]);
        }

        return $type;
    }
}
