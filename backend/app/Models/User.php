<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Modules\DeReporting\Models\Bidang;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;
use Laravel\Sanctum\PersonalAccessToken;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->email)) {
                $base = strtolower(preg_replace('/[^a-zA-Z0-9._-]/', '', (string) $user->username));
                $user->email = ($base !== '' ? $base : Str::uuid()->toString()) . '@bksda.local';
            }
        });

        static::updated(function (User $user) {
            if ($user->wasChanged('email')) {
                $previous = clone $user;
                $previous->email = $user->getRawOriginal('email');
                Password::deleteToken($previous);
                Password::deleteToken($user);
            }
        });
    }

    /**
     * The attributes that are mass assignable.
     * Sesuai Rule 1.3: Dilarang menggunakan $guarded = []
     *
     * @var list<string>
     */
    protected $attributes = ['is_active' => true];

    protected $fillable = [
        'name',
        'username',
        'email',
        'email_verified_at',
        'password',
        'must_change_password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'drive_quota_bytes',
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
        'two_factor_secret',
        'two_factor_recovery_codes',
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
            'must_change_password' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
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
     * @return list<string> Current persistent credentials that may receive private events.
     */
    public function broadcastTokenIds(): array
    {
        // A queued event or retained model may predate the owner's deactivation.
        if (! static::query()->whereKey($this->getKey())->where('is_active', true)->exists()) {
            return [];
        }

        $now = now();
        $expiration = (int) config('sanctum.expiration');

        return $this->tokens()
            ->where(function ($query) use ($now) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', $now);
            })
            ->when($expiration, fn ($query) => $query->where('created_at', '>', $now->copy()->subMinutes($expiration)))
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->all();
    }

    public function canUseBroadcastToken(string $tokenId): bool
    {
        $bearer = request()->bearerToken();
        if (! $bearer) {
            return false;
        }

        // Verify the actual secret even when Sanctum selected a cookie session.
        $token = PersonalAccessToken::findToken($bearer);

        return $token !== null
            && (string) $token->getKey() === $tokenId
            && $token->tokenable_type === $this->getMorphClass()
            && (string) $token->tokenable_id === (string) $this->getKey()
            && in_array($tokenId, $this->broadcastTokenIds(), true);
    }

    public function canAccessAdminInbox(string $module): bool
    {
        if (! in_array($module, ['surat_tugas', 'kepegawaian', 'bmn'], true)) {
            return false;
        }

        $user = static::query()->select(['id', 'role', 'access_modules', 'permissions', 'is_active'])->find($this->getKey());
        if (! $user || ! $user->is_active || ! in_array($user->role, ['admin', 'super_admin'], true)) {
            return false;
        }

        $modules = $user->access_modules ?? [];
        $hasModule = $user->role === 'super_admin'
            || in_array($module, $modules, true)
            || ($module === 'surat_tugas' && in_array('kepegawaian', $modules, true));

        return $hasModule && $user->hasPermission("{$module}.view");
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

        // bmn.asset.force_delete HANYA untuk super_admin
        if ($permission === 'bmn.asset.force_delete') {
            return false;
        }

        // 2. Jika kolom permissions bernilai null atau kosong (empty array), gunakan fallback backward compatibility:
        // Izinkan aksi BMN jika user memiliki akses modul BMN. Aksi penulisan tetap memerlukan role admin.
        if (is_null($this->permissions) || empty($this->permissions)) {
            if (str_starts_with($permission, 'bmn.')) {
                if (str_starts_with($permission, 'bmn.auction.')) {
                    if ($permission === 'bmn.auction.view') {
                        return in_array('bmn', $this->access_modules ?? []);
                    }
                    return $this->role === 'admin' && in_array('bmn', $this->access_modules ?? []);
                }

                $isReadPermission = in_array($permission, ['bmn.view', 'bmn.document.history.view']);
                if ($isReadPermission) {
                    return in_array('bmn', $this->access_modules ?? []);
                }
                return $this->role === 'admin' && in_array('bmn', $this->access_modules ?? []);
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

            if (str_starts_with($permission, 'surat.')) {
                $isReadPermission = in_array($permission, ['surat.view', 'surat.document.view']);
                if ($isReadPermission) {
                    return in_array('surat', $this->access_modules ?? []);
                }
                return $this->role === 'admin' && in_array('surat', $this->access_modules ?? []);
            }

            return false;
        }

        // 3. Cek apakah permission terdaftar di array permissions user
        return in_array($permission, $this->permissions);
    }

    /**
     * Mengecek apakah user memiliki email asli yang sudah terverifikasi dan dapat dikirimi email.
     * Mengikuti security trust boundary: domain internal (.local) atau belum diverifikasi tidak boleh dikirimi email publik.
     */
    public function hasDeliverableEmail(): bool
    {
        return $this->email_verified_at !== null
            && ! empty($this->email)
            && ! str_ends_with(strtolower((string) $this->email), '.local');
    }

    public function employee(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Modules\Kepegawaian\Models\Employee::class, 'nip', 'username');
    }
}
