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
        Schema::create('surat_masuk', function (Blueprint $table) {
            $table->id();
            $table->string('no_agenda')->index();
            $table->date('tanggal_agenda');
            $table->string('indeks')->nullable();
            $table->string('kode')->nullable();
            $table->string('no_surat')->index();
            $table->string('referensi')->nullable();
            $table->date('tanggal_penyelesaian')->nullable();
            $table->date('tanggal_surat')->nullable();
            $table->text('isi_ringkas')->nullable();
            $table->string('asal_surat')->nullable();
            $table->string('lampiran')->nullable();
            $table->json('sifat_json')->nullable();
            $table->text('catatan')->nullable();
            $table->string('file_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('surat_disposisi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('surat_masuk_id')->constrained('surat_masuk')->cascadeOnDelete();
            $table->json('diteruskan_json')->nullable();
            $table->json('instruksi_json')->nullable();
            $table->text('catatan')->nullable();
            $table->foreignId('ka_subbag_tu_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->foreignId('kepala_balai_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('surat_keluar', function (Blueprint $table) {
            $table->id();
            $table->string('no_surat')->index();
            $table->string('kode_klasifikasi')->nullable();
            $table->date('tanggal_surat');
            $table->string('tujuan_surat');
            $table->text('perihal');
            $table->string('sifat')->nullable();
            $table->string('lampiran')->nullable();
            $table->string('file_path')->nullable();
            $table->foreignId('penandatangan_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surat_disposisi');
        Schema::dropIfExists('surat_keluar');
        Schema::dropIfExists('surat_masuk');
    }
};
