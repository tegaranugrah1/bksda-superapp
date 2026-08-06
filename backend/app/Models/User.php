<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Modules\DeReporting\Models\Bidang;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     * Sesuai Rule 1.3: Dilarang menggunakan $guarded = []
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'role',
        'access_modules',
        'permissions',
        'is_active',
        'dereporting_role',
        'dereporting_bidang_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     * Sesuai Rule 5.5: Jangan return data sensitif ke response API.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     * Rule 1.5: Password wajib di-hash otomatis
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'access_modules' => 'array', // Mengubah JSON DB menjadi Array PHP
            'permissions' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Relasi ke Bidang DeReporting (Operator)
     */
    public function dereportingBidang()
    {
        return $this->belongsTo(Bidang::class, 'dereporting_bidang_id');
    }

    /**
     * Mengecek apakah user memiliki permission tertentu secara granular
     */
    public function hasPermission(string $permission): bool
    {
        // 1. Super Admin bypass (selalu diizinkan)
        if ($this->role === 'super_admin') {
            return true;
        }

        // 2. Jika kolom permissions bernilai null atau kosong (empty array), gunakan fallback backward compatibility:
        // Izinkan aksi BMN jika user memiliki akses modul BMN. Aksi penulisan tetap memerlukan role admin.
        if (is_null($this->permissions) || empty($this->permissions)) {
            if (str_starts_with($permission, 'bmn.')) {
                if (str_starts_with($permission, 'bmn.auction.')) {
                    if ($permission === 'bmn.auction.view') {
                        return in_array('bmn', $this->access_modules ?? []);
                    }
                    return in_array($this->role, ['admin', 'super_admin']) && in_array('bmn', $this->access_modules ?? []);
                }

                $isReadPermission = in_array($permission, ['bmn.view', 'bmn.document.history.view']);
                if ($isReadPermission) {
                    return in_array('bmn', $this->access_modules ?? []);
                }
                return in_array($this->role, ['admin', 'super_admin']) && in_array('bmn', $this->access_modules ?? []);
            }

            if (str_starts_with($permission, 'kepegawaian.')) {
                $isReadPermission = in_array($permission, ['kepegawaian.view']);
                if ($isReadPermission) {
                    return in_array('kepegawaian', $this->access_modules ?? []);
                }
                return $this->role === 'admin' && in_array('kepegawaian', $this->access_modules ?? []);
            }

            if (str_starts_with($permission, 'surat_tugas.')) {
                $isReadPermission = in_array($permission, ['surat_tugas.view']);
                $hasModuleAccess = in_array('surat_tugas', $this->access_modules ?? [])
                    || in_array('kepegawaian', $this->access_modules ?? []);
                if ($isReadPermission) {
                    return $hasModuleAccess;
                }
                return $this->role === 'admin' && $hasModuleAccess;
            }

            return false;
        }

        // 3. Cek apakah permission terdaftar di array permissions user
        return in_array($permission, $this->permissions);
    }
}
