<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // LAPORAN INTERNAL (Operator Pegawai BKSDA)
        Schema::create('dr_internals', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Identitas Uploader
            $table->foreignUuid('user_id')->constrained('users')->onDelete('restrict');

            // Rantai Klasifikasi
            $table->foreignUuid('tahun_id')->constrained('dr_tahun')->onDelete('restrict');
            $table->foreignUuid('bidang_id')->constrained('dr_bidang')->onDelete('restrict');
            $table->foreignUuid('jenis_id')->constrained('dr_jenis')->onDelete('restrict');
            $table->foreignUuid('kategori_id')->constrained('dr_kategori')->onDelete('restrict');
            $table->foreignUuid('jenis_data_id')->constrained('dr_jenis_data')->onDelete('restrict');
            $table->foreignUuid('koordinator_id')->nullable()->constrained('dr_koordinator')->onDelete('restrict');
            $table->foreignUuid('anggaran_id')->nullable()->constrained('dr_anggaran')->onDelete('restrict');

            // Berkas Dokumen (Private Storage)
            $table->string('judul_laporan', 255);
            $table->string('file_path', 1000); // Path rahasia storage/app/private/
            $table->string('keterangan')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        // LAPORAN EKSTERNAL (Publik/Masyarakat Tanpa Login)
        Schema::create('dr_ekternals', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Identitas Pelapor (Manual)
            $table->string('nama_pelapor', 150);
            $table->string('instansi', 150)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('no_hp', 20)->nullable();

            // Metadata & File
            $table->string('judul_laporan', 255);
            $table->string('file_path', 1000);
            $table->text('deskripsi')->nullable();

            // Tracker Keamanan
            $table->string('ip_address', 45)->nullable();
            $table->string('status', 50)->default('Menunggu Tinjauan'); // Menunggu, Diterima, Ditolak

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_ekternals');
        Schema::dropIfExists('dr_internals');
    }
};
