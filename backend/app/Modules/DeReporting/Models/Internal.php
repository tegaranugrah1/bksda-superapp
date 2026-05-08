<?php

namespace App\Modules\DeReporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Internal extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_internals';

    protected $fillable = [
        'user_id',
        'tahun_id',
        'bidang_id',
        'jenis_id',
        'kategori_id',
        'jenis_data_id',
        'koordinator_id',
        'anggaran_id',
        'judul_laporan',
        'file_path',
        'keterangan',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function tahun()
    {
        return $this->belongsTo(Tahun::class, 'tahun_id');
    }

    public function bidang()
    {
        return $this->belongsTo(Bidang::class, 'bidang_id');
    }

    public function jenis()
    {
        return $this->belongsTo(Jenis::class, 'jenis_id');
    }

    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'kategori_id');
    }

    public function jenisData()
    {
        return $this->belongsTo(JenisData::class, 'jenis_data_id');
    }

    public function koordinator()
    {
        return $this->belongsTo(Koordinator::class, 'koordinator_id');
    }

    public function anggaran()
    {
        return $this->belongsTo(Anggaran::class, 'anggaran_id');
    }
}
