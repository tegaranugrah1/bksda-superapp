<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Modules\Kepegawaian\Models\Employee;

class Asset extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'bmn_assets';

    protected $fillable = [
        'kode_barang', 'nup', 'nama_barang', 'merk_tipe',
        'tahun_perolehan', 'kondisi', 'nilai_perolehan', 'nilai_buku',
        'lokasi_spesifik', 'employee_id', 'foto_url', 'keterangan'
    ];

    protected $casts = [
        'nilai_perolehan' => 'decimal:2',
        'nilai_buku' => 'decimal:2',
        'tahun_perolehan' => 'integer'
    ];

    public function penanggungJawab()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function loans()
    {
        return $this->hasMany(AssetLoan::class, 'asset_id');
    }

    public function maintenances()
    {
        return $this->hasMany(AssetMaintenance::class, 'asset_id');
    }

    public function historyUpdates()
    {
        return $this->hasMany(AssetUpdate::class, 'asset_id');
    }
}
