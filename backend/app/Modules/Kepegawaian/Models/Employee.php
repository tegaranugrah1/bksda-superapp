<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Employee extends Model
{
    // Menggunakan SoftDeletes agar record tidak hilang (Rule 3.6)
    use HasFactory, SoftDeletes;

    // Rule 3.7: Prefix kpg_
    protected $table = 'kpg_employees';

    // Rule 1.3: Keamanan tingkat tinggi, tolak semua input KECUALI daftar di bawah ini
    protected $fillable = [
        'nip',
        'nama_lengkap',
        'jabatan',
        'pangkat_golongan',
        'satuan_kerja',
        'is_active',
        'foto_profil',
    ];

    // Konversi otomatis string 0/1 dari database menjadi boolean true/false di PHP
    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * RELASI (Rule 6.1)
     * Pegawai (Employee) mungkin memiliki 1 Akun Aplikasi (User).
     * Relasi ini tidak menggunakan employee_id seperti biasa,
     * melainkan menjodohkan NIP pegawai dengan Username di tabel User.
     *
     * Argumen ke-2: Foreign Key di tabel tujuan (users.username)
     * Argumen ke-3: Local Key di tabel sumber (employees.nip)
     */
    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'username', 'nip');
    }

    /**
     * LOCAL SCOPE (Penyederhanaan Query)
     * Daripada menulis Employee::where('is_active', true)->get() berulang-ulang,
     * developer cukup menulis Employee::active()->get()
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
