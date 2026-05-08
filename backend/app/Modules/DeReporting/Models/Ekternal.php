<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ekternal extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_ekternals';

    protected $fillable = [
        'nama_pelapor',
        'instansi',
        'email',
        'no_hp',
        'judul_laporan',
        'file_path',
        'deskripsi',
        // ip_address dan status TIDAK di-fillable — diisi oleh sistem, bukan user
    ];

    /**
     * Atribut yang hanya bisa diisi oleh sistem (bukan dari request user).
     * ip_address: diisi otomatis dari $request->ip()
     * status: diisi oleh admin saat review
     */
}
