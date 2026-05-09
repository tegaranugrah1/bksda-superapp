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
}
