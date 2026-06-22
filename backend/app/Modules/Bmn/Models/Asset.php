<?php

namespace App\Modules\Bmn\Models;

use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

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
        'jenis_identitas', 'no_identitas', 'no_stnk', 'no_mesin', 'no_rangka', 'nama_pengguna', 'status_pmk',
        'status_foto_geotag', 'foto_geotag_url', 'foto_geotag_path', 'foto_depan_path', 'foto_belakang_path',
        'foto_geotag_latitude', 'foto_geotag_longitude', 'foto_geotag_location_note',
        'foto_kiri_path', 'foto_kanan_path', 'foto_lokasi_path',
        'foto_bpkb_1_path', 'foto_bpkb_2_path', 'foto_bpkb_3_path', 'foto_bpkb_4_path',
        'foto_stnk_1_path', 'foto_stnk_2_path',
        'bpkb_document_path', 'bpkb_document_mime', 'bpkb_document_original_name', 'bpkb_preview_path',
        'stnk_document_path', 'stnk_document_mime', 'stnk_document_original_name', 'stnk_preview_path',
        'verified_at', 'verified_by',
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
        'verified_at' => 'datetime',
        'foto_geotag_latitude' => 'decimal:7',
        'foto_geotag_longitude' => 'decimal:7',
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

    public function auctionBatches()
    {
        return $this->belongsToMany(AuctionBatch::class, 'bmn_asset_auction_batch', 'bmn_asset_id', 'bmn_auction_batch_id')
            ->withPivot([
                'id',
                'lot_number',
                'nilai_taksiran',
                'kertas_kerja_data',
                'sort_order',
                'asset_snapshot',
                'freeze_snapshot',
                'first_auction_is_sold',
                'first_auction_price',
                'reauction_is_sold',
                'reauction_price',
                'final_result',
                'final_price',
                'final_auction_date',
                'disposed_at',
            ])
            ->withTimestamps();
    }

    protected static function booted()
    {
        static::forceDeleted(function ($asset) {
            $paths = [
                $asset->foto_geotag_path,
                $asset->foto_depan_path,
                $asset->foto_belakang_path,
                $asset->foto_kiri_path,
                $asset->foto_kanan_path,
                $asset->foto_lokasi_path,
                $asset->foto_bpkb_1_path,
                $asset->foto_bpkb_2_path,
                $asset->foto_bpkb_3_path,
                $asset->foto_bpkb_4_path,
                $asset->foto_stnk_1_path,
                $asset->foto_stnk_2_path,
                $asset->bpkb_document_path,
                $asset->bpkb_preview_path,
                $asset->stnk_document_path,
                $asset->stnk_preview_path,
            ];

            foreach ($paths as $path) {
                if ($path && Storage::exists($path)) {
                    Storage::delete($path);
                }
            }

            foreach ([$asset->bpkb_preview_path, $asset->stnk_preview_path] as $previewPath) {
                if (! $previewPath) {
                    continue;
                }

                $directory = dirname($previewPath);
                $filename = pathinfo($previewPath, PATHINFO_FILENAME);
                foreach (Storage::files($directory) as $path) {
                    if (preg_match('/^'.preg_quote($filename, '/').'-page-\d+\.jpg$/', basename($path)) === 1) {
                        Storage::delete($path);
                    }
                }
            }
        });
    }
}
