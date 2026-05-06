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
        Schema::create('kpg_employees', function (Blueprint $table) {
            $table->id();

            // Identitas Utama
            // NIP PNS umumnya 18 digit, kita beri max 50 untuk jaga-jaga format spasi/dash
            $table->string('nip', 50)->unique()->comment('Nomor Induk Pegawai. Digunakan untuk link ke table users.username');
            $table->string('nama_lengkap');

            // Detail Pekerjaan
            $table->string('jabatan')->nullable();
            $table->string('pangkat_golongan')->nullable()->comment('Contoh: Penata Tk. I (III/d)');
            $table->string('satuan_kerja')->nullable()->comment('Contoh: SKW I / Resor Konservasi Wilayah');

            // Status & Media
            $table->boolean('is_active')->default(true)->comment('Apakah pegawai masih aktif bekerja');
            $table->string('foto_profil')->nullable();

            // Timestamps
            $table->timestamps();

            // Sesuai Rule 3.6 & 6.1: Tidak boleh hard-delete
            $table->softDeletes();

            // ==========================================
            // PERFORMANCE OPTIMIZATION (INDEXING)
            // ==========================================
            // Karena nama akan sering dicari di fitur "Search Pegawai",
            // kita jadikan index agar query tidak membebani CPU database.
            // (NIP tidak perlu di-index manual karena sudah otomatis di-index oleh ->unique())
            $table->index('nama_lengkap');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_employees');
    }
};
