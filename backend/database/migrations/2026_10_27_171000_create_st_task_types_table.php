<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('st_task_types', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('kode')->unique();
            $table->string('mode_lokasi')->default('luar_wilayah'); // luar_wilayah, dalam_kawasan, tempat_saja
            $table->string('aturan_durasi')->default('fleksibel'); // fleksibel, wajib_1_hari
            $table->boolean('default_sertakan_laporan')->default(true);
            $table->text('contoh_format')->nullable();
            $table->text('keterangan')->nullable();
            $table->integer('urutan')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Add optional task_type_id & sertakan_laporan to st_assignment_letters if not exists
        if (Schema::hasTable('st_assignment_letters')) {
            Schema::table('st_assignment_letters', function (Blueprint $table) {
                if (!Schema::hasColumn('st_assignment_letters', 'task_type_id')) {
                    $table->foreignId('task_type_id')->nullable()->after('template_id')->constrained('st_task_types')->nullOnDelete();
                }
                if (!Schema::hasColumn('st_assignment_letters', 'sertakan_laporan')) {
                    $table->boolean('sertakan_laporan')->default(true)->after('task_type_id');
                }
            });
        }

        // Seed 4 initial default task types
        $now = now();
        DB::table('st_task_types')->insert([
            [
                'nama' => 'Perjalanan Dinas Luar Wilayah',
                'kode' => 'luar_wilayah',
                'mode_lokasi' => 'luar_wilayah',
                'aturan_durasi' => 'fleksibel',
                'default_sertakan_laporan' => true,
                'contoh_format' => 'Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} dalam rangka {kegiatan} di {tempat}',
                'keterangan' => 'Penugasan dinas antar kota/kabupaten dengan kota asal dan kota tujuan spesifik.',
                'urutan' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'nama' => 'Perjalanan Dinas Dalam Kawasan / Wilayah',
                'kode' => 'dalam_kawasan',
                'mode_lokasi' => 'dalam_kawasan',
                'aturan_durasi' => 'fleksibel',
                'default_sertakan_laporan' => true,
                'contoh_format' => 'Melaksanakan perjalanan dinas di {kota} dalam rangka {kegiatan} di {tempat}',
                'keterangan' => 'Penugasan dinas patroli/resort dalam wilayah kerja kota/kabupaten dan kawasan konservasi tanpa rute dari-ke.',
                'urutan' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'nama' => 'Melaksanakan Kegiatan (1 Hari)',
                'kode' => 'kegiatan_1_hari',
                'mode_lokasi' => 'tempat_saja',
                'aturan_durasi' => 'wajib_1_hari',
                'default_sertakan_laporan' => true,
                'contoh_format' => 'Melaksanakan Kegiatan {kegiatan} pada {tempat} di {kota}',
                'keterangan' => 'Penugasan kegiatan berdurasi 1 hari (misal rapat, stok opname, seminar dalam kota).',
                'urutan' => 3,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'nama' => 'Menugaskan Staf',
                'kode' => 'menugaskan_staf',
                'mode_lokasi' => 'tempat_saja',
                'aturan_durasi' => 'fleksibel',
                'default_sertakan_laporan' => true,
                'contoh_format' => 'Menugaskan Staf untuk {kegiatan} pada {tempat} di {kota}',
                'keterangan' => 'Penugasan staf untuk tugas administratif atau fungsional internal.',
                'urutan' => 4,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('st_assignment_letters')) {
            Schema::table('st_assignment_letters', function (Blueprint $table) {
                if (Schema::hasColumn('st_assignment_letters', 'task_type_id')) {
                    $table->dropForeign(['task_type_id']);
                    $table->dropColumn('task_type_id');
                }
                if (Schema::hasColumn('st_assignment_letters', 'sertakan_laporan')) {
                    $table->dropColumn('sertakan_laporan');
                }
            });
        }

        Schema::dropIfExists('st_task_types');
    }
};
