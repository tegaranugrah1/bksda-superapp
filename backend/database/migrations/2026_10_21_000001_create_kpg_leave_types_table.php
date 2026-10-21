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
        if (!Schema::hasTable('kpg_leave_types')) {
            Schema::create('kpg_leave_types', function (Blueprint $table) {
                $table->id();
                $table->string('nama', 150);
                $table->string('kode', 30)->nullable();
                $table->string('hitung_hari', 20)->default('hari_kalender'); // 'hari_kerja' | 'hari_kalender'
                $table->boolean('potong_kuota_tahunan')->default(false);
                $table->integer('maks_hari')->nullable();
                $table->text('keterangan')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('urutan')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index('is_active');
                $table->index('urutan');
            });

            // Seed initial ASN Leave Types standard
            $now = now();
            $defaultTypes = [
                [
                    'nama' => 'Cuti Tahunan',
                    'kode' => 'CT',
                    'hitung_hari' => 'hari_kerja',
                    'potong_kuota_tahunan' => true,
                    'maks_hari' => 12,
                    'urutan' => 1,
                    'is_active' => true,
                    'keterangan' => 'Hak cuti tahunan bagi ASN yang telah bekerja sekurang-kurangnya 1 tahun secara terus menerus (PerBKN 24/2017).',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'nama' => 'Cuti Besar',
                    'kode' => 'CB',
                    'hitung_hari' => 'hari_kalender',
                    'potong_kuota_tahunan' => false,
                    'maks_hari' => 90,
                    'urutan' => 2,
                    'is_active' => true,
                    'keterangan' => 'Hak cuti besar bagi ASN yang telah bekerja paling singkat 5 tahun secara terus menerus.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'nama' => 'Cuti Sakit',
                    'kode' => 'CS',
                    'hitung_hari' => 'hari_kalender',
                    'potong_kuota_tahunan' => false,
                    'maks_hari' => 14,
                    'urutan' => 3,
                    'is_active' => true,
                    'keterangan' => 'Cuti sakit dengan melampirkan surat keterangan dokter yang sah.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'nama' => 'Cuti Melahirkan',
                    'kode' => 'CM',
                    'hitung_hari' => 'hari_kalender',
                    'potong_kuota_tahunan' => false,
                    'maks_hari' => 90,
                    'urutan' => 4,
                    'is_active' => true,
                    'keterangan' => 'Cuti melahirkan untuk persalinan anak pertama sampai dengan anak ketiga.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'nama' => 'Cuti Karena Alasan Penting',
                    'kode' => 'CAP',
                    'hitung_hari' => 'hari_kalender',
                    'potong_kuota_tahunan' => false,
                    'maks_hari' => 30,
                    'urutan' => 5,
                    'is_active' => true,
                    'keterangan' => 'Cuti karena anggota keluarga sakit keras/meninggal dunia, melangsungkan perkawinan, dsb.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'nama' => 'Cuti Bersama',
                    'kode' => 'CBM',
                    'hitung_hari' => 'hari_kerja',
                    'potong_kuota_tahunan' => false,
                    'maks_hari' => null,
                    'urutan' => 6,
                    'is_active' => true,
                    'keterangan' => 'Cuti bersama yang ditetapkan oleh Keputusan Presiden/Pemerintah.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'nama' => 'Cuti di Luar Tanggungan Negara',
                    'kode' => 'CLTN',
                    'hitung_hari' => 'hari_kalender',
                    'potong_kuota_tahunan' => false,
                    'maks_hari' => 1095,
                    'urutan' => 7,
                    'is_active' => true,
                    'keterangan' => 'Cuti di luar tanggungan negara untuk alasan pribadi dan mendesak setelah bekerja sekurang-kurangnya 5 tahun.',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ];

            DB::table('kpg_leave_types')->insert($defaultTypes);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_leave_types');
    }
};
