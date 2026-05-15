<?php

namespace App\Modules\Bmn\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'bmn_assets';

    protected $fillable = [
        'id', 'jenis_bmn', 'kode_satker', 'nama_satker', 'kode_barang', 'nup', 'nup_lama',
        'nama_barang', 'status_bmn', 'merk', 'tipe', 'merk_tipe', 'kondisi', 'umur_aset',
        'intra_extra', 'henti_guna', 'status_sbsn', 'status_bmn_idle', 'status_kemitraan',
        'bpybds', 'usulan_barang_hilang', 'usulan_barang_rb', 'usul_hapus', 'hibah_dktp',
        'konsensi_jasa', 'properti_investasi', 'jenis_dokumen', 'no_dokumen', 'no_bpkp',
        'no_polisi', 'status_sertifikasi', 'jenis_sertipikat', 'no_sertifikat', 'nama',
        'tanggal_buku_pertama', 'tanggal_perolehan', 'tanggal_pengapusan',
        'nilai_perolehan_pertama', 'nilai_mutasi', 'nilai_perolehan', 'nilai_penyusutan', 'nilai_buku',
        'luas_tanah_seluruhnya', 'luas_tanah_bangunan', 'luas_tanah_sarana', 'luas_lahan_kosong',
        'luas_bangunan', 'luas_tapak_bangunan', 'luas_pemanfaatan', 'jumlah_lantai', 'jumlah_foto',
        'status_penggunaan', 'no_psp', 'tanggal_psp', 'alamat', 'rt_rw', 'kelurahan_desa',
        'kecamatan', 'kab_kota', 'kode_kab_kota', 'provinsi', 'kode_provinsi', 'kode_pos',
        'sbsk', 'optimalisasi', 'penghuni', 'pengguna', 'kode_kpknl', 'uraian_kpknl',
        'uraian_kanwil_djkn', 'nama_kl', 'nama_e1', 'nama_korwil', 'kode_register', 'lokasi_ruang',
        'jenis_identitas', 'no_identitas', 'no_stnk', 'nama_pengguna', 'status_pmk',
        'status_foto_geotag', 'foto_geotag_url', 'foto_belakang_path',
        'foto_kiri_path', 'foto_kanan_path', 'foto_lokasi_path',
        'tahun_perolehan', 'lokasi_spesifik', 'employee_id', 'foto_url', 'keterangan',
        'tanggal_pajak_stnk', 'tanggal_ganti_plat',
    ];

    protected $casts = [
        'nilai_perolehan' => 'decimal:2',
        'nilai_buku' => 'decimal:2',
        'nilai_penyusutan' => 'decimal:2',
        'nilai_perolehan_pertama' => 'decimal:2',
        'nilai_mutasi' => 'decimal:2',
        'tahun_perolehan' => 'integer',
        'umur_aset' => 'integer',
        'jumlah_lantai' => 'integer',
        'jumlah_foto' => 'integer',
        'tanggal_perolehan' => 'date',
        'tanggal_buku_pertama' => 'date',
        'tanggal_pengapusan' => 'date',
        'tanggal_psp' => 'date',
        'tanggal_pajak_stnk' => 'date',
        'tanggal_ganti_plat' => 'date',
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
