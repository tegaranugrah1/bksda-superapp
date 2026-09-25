<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $nip Nomor Induk Pegawai. Digunakan untuk link ke table users.username
 * @property string $nama_lengkap
 * @property string|null $jabatan
 * @property string|null $pangkat_golongan Contoh: Penata Tk. I (III/d)
 * @property string|null $satuan_kerja Contoh: SKW I / Resor Konservasi Wilayah
 * @property bool $is_active Apakah pegawai masih aktif bekerja
 * @property string|null $foto_profil
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read User|null $user
 *
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee active()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee newModelQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee newQuery()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee onlyTrashed()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee query()
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereCreatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereDeletedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereFotoProfil($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereId($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereIsActive($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereJabatan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereNamaLengkap($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereNip($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee wherePangkatGolongan($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereSatuanKerja($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee whereUpdatedAt($value)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee withTrashed(bool $withTrashed = true)
 * @method static \Illuminate\Database\Eloquent\Builder<static>|Employee withoutTrashed()
 *
 * @mixin \Eloquent
 */
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

    protected $appends = [
        'is_seksi',
        'seksi_wilayah',
    ];

    /**
     * Accessor: Cek apakah pegawai bertugas di Seksi Konservasi Wilayah (I, II, atau III)
     */
    public function getIsSeksiAttribute(): bool
    {
        if (empty($this->satuan_kerja)) {
            return false;
        }

        $sk = strtolower($this->satuan_kerja);

        // Jika Kantor Balai KSDA -> Bukan Seksi
        if (str_contains($sk, 'kantor balai') || str_contains($sk, 'balai')) {
            return false;
        }

        // Jika memuat seksi / skw / wilayah / berau / tenggarong / balikpapan
        return str_contains($sk, 'seksi')
            || str_contains($sk, 'skw')
            || str_contains($sk, 'wilayah')
            || str_contains($sk, 'berau')
            || str_contains($sk, 'tenggarong')
            || str_contains($sk, 'balikpapan');
    }

    /**
     * Accessor: Nomor romawi Seksi Wilayah ('I', 'II', 'III', atau null)
     */
    public function getSeksiWilayahAttribute(): ?string
    {
        if (! $this->is_seksi) {
            return null;
        }

        $sk = strtolower($this->satuan_kerja);

        // Periksa Wilayah III / Balikpapan terlebih dahulu untuk menghindari collision substring
        if (str_contains($sk, 'wilayah iii') || str_contains($sk, 'wil iii') || str_contains($sk, 'balikpapan') || str_contains($sk, 'seksi 3') || str_contains($sk, 'seksi iii')) {
            return 'III';
        }

        // Periksa Wilayah II / Tenggarong
        if (str_contains($sk, 'wilayah ii') || str_contains($sk, 'wil ii') || str_contains($sk, 'tenggarong') || str_contains($sk, 'seksi 2') || str_contains($sk, 'seksi ii')) {
            return 'II';
        }

        // Periksa Wilayah I / Berau
        if (str_contains($sk, 'wilayah i') || str_contains($sk, 'wil i') || str_contains($sk, 'berau') || str_contains($sk, 'seksi 1') || str_contains($sk, 'seksi i')) {
            return 'I';
        }

        return null;
    }

    /**
     * Exclude administrator pusat from employee listings globally
     */
    protected static function booted(): void
    {
        static::addGlobalScope('excludeAdminPusat', function ($builder) {
            $builder->where('nip', '!=', '198001012005011001')
                ->where('nama_lengkap', 'NOT LIKE', '%Administrator Pusat%')
                ->where('nama_lengkap', 'NOT LIKE', '%administrator%');
        });
    }

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

    /**
     * RELASI: Riwayat Penugasan (Surat Tugas)
     * Mengambil daftar surat tugas yang melibatkan pegawai ini.
     */
    public function assignmentLetters(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            \App\Modules\SuratTugas\Models\AssignmentLetter::class,
            'st_assignment_letter_employees',
            'employee_id',
            'assignment_letter_id'
        )
            ->using(\App\Modules\SuratTugas\Models\AssignmentLetterEmployee::class)
            ->withPivot('peran')
            ->withTimestamps();
    }

    public function leaves(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmployeeLeave::class, 'employee_id');
    }
}
