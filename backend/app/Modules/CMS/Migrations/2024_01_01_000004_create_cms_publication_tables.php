<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 13. Jenis Publikasi (Kategori khusus dokumen: "Peraturan Gubernur", "SK Menteri")
        Schema::create('cms_jenis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100)->unique();
            $table->string('tipe', 50); // buku, leaflet, poster, regulasi
            $table->timestamps();
            $table->softDeletes();
        });

        // 14. Buku Publikasi
        Schema::create('cms_buku', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('jenis_id')->nullable()->constrained('cms_jenis')->onDelete('set null');
            $table->string('judul', 500);
            $table->string('slug', 520)->unique();
            $table->text('deskripsi')->nullable();
            $table->string('penulis', 255)->nullable();
            $table->string('penerbit', 255)->nullable();
            $table->string('tahun_terbit', 4)->nullable();
            $table->string('cover_path', 500)->nullable(); // PDF untuk diunduh
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 15. Leaflet & Poster (Brosur Digital)
        Schema::create('cms_leaflet', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('jenis_id')->nullable()->constrained('cms_jenis')->onDelete('set null');
            $table->string('judul', 500);
            $table->string('slug', 520)->unique();
            $table->text('deskripsi')->nullable();
            $table->string('file_path', 500);          // Gambar/PDF leaflet
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('tipe', 20)->default('leaflet'); // leaflet, poster
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 16. Regulasi & Peraturan Hukum
        Schema::create('cms_regulasi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('jenis_id')->nullable()->constrained('cms_jenis')->onDelete('set null');
            $table->string('judul', 500);
            $table->string('slug', 520)->unique();
            $table->string('nomor', 100)->nullable();       // "PP No. 7 Tahun 1999"
            $table->string('tahun', 4)->nullable();
            $table->text('deskripsi')->nullable();
            $table->string('file_path', 500)->nullable();    // PDF regulasi
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_regulasi');
        Schema::dropIfExists('cms_leaflet');
        Schema::dropIfExists('cms_buku');
        Schema::dropIfExists('cms_jenis');
    }
};
