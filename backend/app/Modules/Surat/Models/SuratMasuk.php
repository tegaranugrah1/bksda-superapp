<?php

namespace App\Modules\Surat\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class SuratMasuk extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'surat_masuk';

    protected $fillable = [
        'no_agenda',
        'tanggal_agenda',
        'indeks',
        'kode',
        'no_surat',
        'referensi',
        'tanggal_penyelesaian',
        'tanggal_surat',
        'isi_ringkas',
        'asal_surat',
        'lampiran',
        'sifat_json',
        'catatan',
        'file_path',
        'created_by',
    ];

    protected $casts = [
        'tanggal_agenda' => 'date',
        'tanggal_penyelesaian' => 'date',
        'tanggal_surat' => 'date',
        'sifat_json' => 'array',
    ];

    public function disposisi(): HasOne
    {
        return $table = $this->hasOne(SuratDisposisi::class, 'surat_masuk_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
