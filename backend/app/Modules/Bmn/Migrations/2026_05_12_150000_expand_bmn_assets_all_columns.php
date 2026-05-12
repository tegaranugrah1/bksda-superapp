<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            // Drop unique constraint first (will re-add after column changes)
            $table->dropUnique(['kode_barang', 'nup']);

            // Expand existing columns
            $table->string('nup', 50)->change();

            // Add all 80 columns from SIMAK BMN Excel
            $table->string('jenis_bmn')->nullable()->after('id');
            $table->string('kode_satker')->nullable()->after('jenis_bmn');
            $table->string('nama_satker')->nullable()->after('kode_satker');
            $table->string('nup_lama', 50)->nullable()->after('nup');
            $table->string('status_bmn')->nullable()->after('nama_barang');
            $table->string('merk')->nullable()->after('status_bmn');
            $table->string('tipe')->nullable()->after('merk');
            $table->integer('umur_aset')->nullable()->after('kondisi');
            $table->string('intra_extra', 20)->nullable()->after('umur_aset');
            $table->string('henti_guna', 10)->nullable()->after('intra_extra');
            $table->string('status_sbsn')->nullable()->after('henti_guna');
            $table->string('status_bmn_idle')->nullable()->after('status_sbsn');
            $table->string('status_kemitraan')->nullable()->after('status_bmn_idle');
            $table->string('bpybds')->nullable()->after('status_kemitraan');
            $table->string('usulan_barang_hilang')->nullable()->after('bpybds');
            $table->string('usulan_barang_rb')->nullable()->after('usulan_barang_hilang');
            $table->string('usul_hapus')->nullable()->after('usulan_barang_rb');
            $table->string('hibah_dktp')->nullable()->after('usul_hapus');
            $table->string('konsensi_jasa')->nullable()->after('hibah_dktp');
            $table->string('properti_investasi')->nullable()->after('konsensi_jasa');
            $table->string('jenis_dokumen')->nullable()->after('properti_investasi');
            $table->string('no_dokumen')->nullable()->after('jenis_dokumen');
            $table->string('no_bpkp')->nullable()->after('no_dokumen');
            $table->string('no_polisi')->nullable()->after('no_bpkp');
            $table->string('status_sertifikasi')->nullable()->after('no_polisi');
            $table->string('jenis_sertipikat')->nullable()->after('status_sertifikasi');
            $table->string('no_sertifikat')->nullable()->after('jenis_sertipikat');
            $table->string('nama_pemilik')->nullable()->after('no_sertifikat');
            $table->date('tanggal_buku_pertama')->nullable()->after('nama_pemilik');
            $table->date('tanggal_perolehan')->nullable()->after('tanggal_buku_pertama');
            $table->date('tanggal_pengapusan')->nullable()->after('tanggal_perolehan');
            $table->decimal('nilai_perolehan_pertama', 18, 2)->nullable()->after('tanggal_pengapusan');
            $table->decimal('nilai_mutasi', 18, 2)->nullable()->after('nilai_perolehan_pertama');
            // nilai_perolehan already exists
            $table->decimal('nilai_penyusutan', 18, 2)->nullable()->after('nilai_perolehan');
            // nilai_buku already exists
            $table->decimal('luas_tanah_seluruhnya', 15, 2)->nullable()->after('nilai_buku');
            $table->decimal('luas_tanah_bangunan', 15, 2)->nullable()->after('luas_tanah_seluruhnya');
            $table->decimal('luas_tanah_sarana', 15, 2)->nullable()->after('luas_tanah_bangunan');
            $table->decimal('luas_lahan_kosong', 15, 2)->nullable()->after('luas_tanah_sarana');
            $table->decimal('luas_bangunan', 15, 2)->nullable()->after('luas_lahan_kosong');
            $table->decimal('luas_tapak_bangunan', 15, 2)->nullable()->after('luas_bangunan');
            $table->decimal('luas_pemanfaatan', 15, 2)->nullable()->after('luas_tapak_bangunan');
            $table->integer('jumlah_lantai')->nullable()->after('luas_pemanfaatan');
            $table->integer('jumlah_foto')->nullable()->after('jumlah_lantai');
            $table->string('status_penggunaan')->nullable()->after('jumlah_foto');
            $table->string('no_psp')->nullable()->after('status_penggunaan');
            $table->date('tanggal_psp')->nullable()->after('no_psp');
            $table->text('alamat')->nullable()->after('tanggal_psp');
            $table->string('rt_rw', 20)->nullable()->after('alamat');
            $table->string('kelurahan_desa')->nullable()->after('rt_rw');
            $table->string('kecamatan')->nullable()->after('kelurahan_desa');
            $table->string('kab_kota')->nullable()->after('kecamatan');
            $table->string('kode_kab_kota', 20)->nullable()->after('kab_kota');
            $table->string('provinsi')->nullable()->after('kode_kab_kota');
            $table->string('kode_provinsi', 20)->nullable()->after('provinsi');
            $table->string('kode_pos', 10)->nullable()->after('kode_provinsi');
            $table->string('sbsk')->nullable()->after('kode_pos');
            $table->string('optimalisasi')->nullable()->after('sbsk');
            $table->string('penghuni')->nullable()->after('optimalisasi');
            $table->string('pengguna')->nullable()->after('penghuni');
            $table->string('kode_kpknl')->nullable()->after('pengguna');
            $table->string('uraian_kpknl')->nullable()->after('kode_kpknl');
            $table->string('uraian_kanwil_djkn')->nullable()->after('uraian_kpknl');
            $table->string('nama_kl')->nullable()->after('uraian_kanwil_djkn');
            $table->string('nama_e1')->nullable()->after('nama_kl');
            $table->string('nama_korwil')->nullable()->after('nama_e1');
            $table->string('kode_register')->nullable()->after('nama_korwil');
            $table->string('lokasi_ruang')->nullable()->after('kode_register');
            $table->string('jenis_identitas')->nullable()->after('lokasi_ruang');
            $table->string('no_identitas')->nullable()->after('jenis_identitas');
            $table->string('no_stnk')->nullable()->after('no_identitas');
            $table->string('nama_pengguna_bmn')->nullable()->after('no_stnk');
            $table->string('status_pmk')->nullable()->after('nama_pengguna_bmn');
            $table->string('status_foto_geotag')->nullable()->after('status_pmk');

            // Re-add unique (kode_barang + nup)
            $table->unique(['kode_barang', 'nup']);
        });
    }

    public function down(): void
    {
        Schema::table('bmn_assets', function (Blueprint $table) {
            $table->dropUnique(['kode_barang', 'nup']);

            $columns = [
                'jenis_bmn', 'kode_satker', 'nama_satker', 'nup_lama', 'status_bmn',
                'merk', 'tipe', 'umur_aset', 'intra_extra', 'henti_guna',
                'status_sbsn', 'status_bmn_idle', 'status_kemitraan', 'bpybds',
                'usulan_barang_hilang', 'usulan_barang_rb', 'usul_hapus', 'hibah_dktp',
                'konsensi_jasa', 'properti_investasi', 'jenis_dokumen', 'no_dokumen',
                'no_bpkp', 'no_polisi', 'status_sertifikasi', 'jenis_sertipikat',
                'no_sertifikat', 'nama_pemilik', 'tanggal_buku_pertama', 'tanggal_perolehan',
                'tanggal_pengapusan', 'nilai_perolehan_pertama', 'nilai_mutasi', 'nilai_penyusutan',
                'luas_tanah_seluruhnya', 'luas_tanah_bangunan', 'luas_tanah_sarana',
                'luas_lahan_kosong', 'luas_bangunan', 'luas_tapak_bangunan', 'luas_pemanfaatan',
                'jumlah_lantai', 'jumlah_foto', 'status_penggunaan', 'no_psp', 'tanggal_psp',
                'alamat', 'rt_rw', 'kelurahan_desa', 'kecamatan', 'kab_kota', 'kode_kab_kota',
                'provinsi', 'kode_provinsi', 'kode_pos', 'sbsk', 'optimalisasi', 'penghuni',
                'pengguna', 'kode_kpknl', 'uraian_kpknl', 'uraian_kanwil_djkn', 'nama_kl',
                'nama_e1', 'nama_korwil', 'kode_register', 'lokasi_ruang', 'jenis_identitas',
                'no_identitas', 'no_stnk', 'nama_pengguna_bmn', 'status_pmk', 'status_foto_geotag',
            ];
            $table->dropColumn($columns);
            $table->unique(['kode_barang', 'nup']);
        });
    }
};
