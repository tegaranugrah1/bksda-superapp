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
        if (! empty($filters['search']) && is_string($filters['search'])) {
            $trimmed = trim($filters['search']);
            if ($trimmed !== '') {
                $pattern = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $trimmed) . '%';
                $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
                $query->where(function ($builder) use ($pattern, $likeOp) {
                    $builder->whereRaw("no_agenda {$likeOp} ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("no_surat_masuk {$likeOp} ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("no_surat_balasan {$likeOp} ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("asal_surat {$likeOp} ? ESCAPE '!'", [$pattern])
                        ->orWhereRaw("perihal {$likeOp} ? ESCAPE '!'", [$pattern])
                        ->orWhereHas('attachments', fn ($attachments) => $attachments->whereRaw("original_name {$likeOp} ? ESCAPE '!'", [$pattern]));
                });
            }
        }

        if (! empty($filters['kategori']) && is_string($filters['kategori']) && in_array($filters['kategori'], self::CATEGORIES, true)) {
            $query->where('kategori', $filters['kategori']);
        }

        $statusBalasan = is_string($filters['status_balasan'] ?? null) ? $filters['status_balasan'] : '';
        if ($statusBalasan === 'replied') {
            $query->where(function ($builder) {
                $builder->where(function ($q) {
                    $q->whereNotNull('no_surat_balasan')->where('no_surat_balasan', '!=', '');
                })->orWhereHas('attachments', fn ($q) => $q->where('type', 'reply'));
            });
        } elseif ($statusBalasan === 'pending') {
            $query->where(function ($builder) {
                $builder->whereNull('no_surat_balasan')->orWhere('no_surat_balasan', '');
            })->whereDoesntHave('attachments', fn ($q) => $q->where('type', 'reply'));
        }

        if (! empty($filters['start_date']) && is_string($filters['start_date'])) {
            $query->whereDate('tanggal_diterima', '>=', $filters['start_date']);
        }

        if (! empty($filters['end_date']) && is_string($filters['end_date'])) {
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
