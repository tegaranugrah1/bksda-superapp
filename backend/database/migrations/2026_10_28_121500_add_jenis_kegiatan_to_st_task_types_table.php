<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('st_task_types')) {
            $exists = DB::table('st_task_types')->where('kode', 'jenis_kegiatan')->exists();
            if (!$exists) {
                $now = now();
                DB::table('st_task_types')->insert([
                    'nama' => 'Pengawasan / Pemeriksaan Pekerjaan',
                    'kode' => 'jenis_kegiatan',
                    'mode_lokasi' => 'luar_wilayah',
                    'aturan_durasi' => 'fleksibel',
                    'default_sertakan_laporan' => true,
                    'contoh_format' => 'Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {kegiatan} dalam rangka {paket} di {tempat}',
                    'keterangan' => 'Penugasan terstruktur untuk pengawasan pekerjaan, pemeriksaan fisik konstruksi, atau paket kontrak sarpras.',
                    'urutan' => 5,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('st_task_types')) {
            DB::table('st_task_types')->where('kode', 'jenis_kegiatan')->delete();
        }
    }
};
