<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class EmployeeIncomingLetter extends \Illuminate\Database\Eloquent\Model
{
    use HasFactory, SoftDeletes;

    public const CATEGORIES = ['Mahasiswa', 'Instansi', 'Internal', 'Masyarakat', 'Lainnya'];

    protected $table = 'kpg_incoming_letters';

    protected $fillable = [
        'no_agenda',
        'no_surat_masuk',
        'tanggal_surat',
        'tanggal_diterima',
        'asal_surat',
        'kategori',
        'perihal',
        'catatan',
        'no_surat_balasan',
        'tanggal_surat_balasan',
        'created_by',
    ];

    protected $casts = [
        'tanggal_surat' => 'date:Y-m-d',
        'tanggal_diterima' => 'date:Y-m-d',
        'tanggal_surat_balasan' => 'date:Y-m-d',
    ];

    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (! empty($filters['search'])) {
            $search = addcslashes(trim((string) $filters['search']), '%_');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($builder) use ($search, $likeOp) {
                $builder->where('no_agenda', $likeOp, "%{$search}%")
                    ->orWhere('no_surat_masuk', $likeOp, "%{$search}%")
                    ->orWhere('no_surat_balasan', $likeOp, "%{$search}%")
                    ->orWhere('asal_surat', $likeOp, "%{$search}%")
                    ->orWhere('perihal', $likeOp, "%{$search}%")
                    ->orWhereHas('attachments', fn ($attachments) => $attachments->where('original_name', $likeOp, "%{$search}%"));
            });
        }

        if (! empty($filters['kategori']) && in_array($filters['kategori'], self::CATEGORIES, true)) {
            $query->where('kategori', $filters['kategori']);
        }

        if (($filters['status_balasan'] ?? '') === 'replied') {
            $query->where(function ($builder) {
                $builder->where(function ($q) {
                    $q->whereNotNull('no_surat_balasan')->where('no_surat_balasan', '!=', '');
                })->orWhereHas('attachments', fn ($q) => $q->where('type', 'reply'));
            });
        } elseif (($filters['status_balasan'] ?? '') === 'pending') {
            $query->where(function ($builder) {
                $builder->whereNull('no_surat_balasan')->orWhere('no_surat_balasan', '');
            })->whereDoesntHave('attachments', fn ($q) => $q->where('type', 'reply'));
        }

        if (! empty($filters['start_date'])) {
            $query->whereDate('tanggal_diterima', '>=', $filters['start_date']);
        }

        if (! empty($filters['end_date'])) {
            $query->whereDate('tanggal_diterima', '<=', $filters['end_date']);
        }

        return $query;
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(EmployeeIncomingLetterAttachment::class, 'incoming_letter_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
