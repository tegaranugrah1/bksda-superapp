<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tabel Batch Perhitungan Uang Makan Bulanan
        Schema::create('kpg_meal_allowance_batches', function (Blueprint $table) {
            $table->id();
            $table->string('periode_bulan', 7); // Format: 'YYYY-MM', misal '2026-09'
            $table->string('nama_batch', 255);  // Contoh: 'Rekapitulasi Uang Makan September 2026'
            $table->integer('total_pegawai')->default(0);
            $table->integer('total_hari_kerja')->default(22);
            $table->decimal('total_bruto', 15, 2)->default(0);
            $table->decimal('total_pph21', 15, 2)->default(0);
            $table->decimal('total_netto', 15, 2)->default(0);
            $table->string('penandatangan_nama', 255)->default('Dheny Mardiono, S.Hut., M.Sc.');
            $table->string('penandatangan_nip', 50)->default('19750314 199903 1 004');
            $table->string('penandatangan_jabatan', 255)->default('Kepala Subbagian Tata Usaha');
            $table->string('status', 50)->default('draft'); // 'draft', 'final', 'dibayarkan'
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('periode_bulan');
            $table->index('status');
        });

        // 2. Tabel Detail Rekap Presensi & Uang Makan per Pegawai
        Schema::create('kpg_meal_allowance_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('kpg_meal_allowance_batches')->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->string('nip', 30);
            $table->string('nama_lengkap', 255);
            $table->string('jabatan', 255)->nullable();
            $table->string('jenis_pegawai', 20)->default('PNS'); // 'PNS', 'PPPK'
            $table->integer('tahun_angkatan')->nullable(); // Ekstraksi digit 9-12 NIP
            $table->string('satuan_kerja', 255)->nullable();
            $table->string('golongan', 50)->nullable();
            $table->string('nama_bank', 50)->nullable()->default('BRI');
            $table->string('nomor_rekening', 100)->nullable();

            // Tarif & Pajak
            $table->decimal('tarif_harian', 10, 2)->default(35000);
            $table->decimal('persen_pph21', 5, 2)->default(0); // 0%, 5%, 15%

            // Rekap Hari Kehadiran
            $table->integer('jml_hari_kerja')->default(0);
            $table->integer('jml_hadir')->default(0);
            $table->integer('jml_pd')->default(0);
            $table->integer('jml_cuti')->default(0);
            $table->integer('jml_sakit')->default(0);
            $table->integer('jml_izin')->default(0);
            $table->integer('jml_alpa')->default(0);

            // Nominal Keuangan
            $table->decimal('uang_makan_bruto', 15, 2)->default(0);
            $table->decimal('potongan_pph21', 15, 2)->default(0);
            $table->decimal('uang_makan_netto', 15, 2)->default(0);

            // Matriks Harian (1-31) & Audit Logs
            $table->jsonb('daily_matrix')->default('{}');
            $table->jsonb('override_logs')->default('[]');

            $table->timestamps();

            $table->index('batch_id');
            $table->index('nip');
            $table->index('employee_id');
            $table->index('jenis_pegawai');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_meal_allowance_items');
        Schema::dropIfExists('kpg_meal_allowance_batches');
    }
};
