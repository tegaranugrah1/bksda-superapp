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
        Schema::create('surat_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('nama');
            $table->string('kategori')->default('Tata Naskah Dinas');
            $table->text('deskripsi')->nullable();
            $table->string('nomor_prefix', 50)->default('S');
            $table->string('kode_klasifikasi', 50)->default('KSA.01.05');
            $table->string('judul_dokumen')->nullable();
            $table->json('default_payload')->nullable();
            $table->boolean('is_system')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surat_templates');
    }
};
