<?php

namespace App\Modules\Surat\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SuratTemplate extends Model
{
    use HasFactory;

    protected $table = 'surat_templates';

    protected $fillable = [
        'key',
        'nama',
        'kategori',
        'deskripsi',
        'nomor_prefix',
        'kode_klasifikasi',
        'judul_dokumen',
        'default_payload',
        'is_system',
        'is_active',
    ];

    protected $casts = [
        'default_payload' => 'array',
        'is_system' => 'boolean',
        'is_active' => 'boolean',
    ];
}
