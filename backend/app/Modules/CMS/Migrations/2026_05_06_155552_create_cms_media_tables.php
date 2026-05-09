<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 9. Galeri Foto
        Schema::create('cms_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('judul', 255)->nullable();
            $table->string('deskripsi', 500)->nullable();
            $table->string('file_path', 500);
            $table->string('album', 100)->nullable(); // Pengelompokan album
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 10. Galeri Video (Embed YouTube / Upload)
        Schema::create('cms_videos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('judul', 255);
            $table->string('deskripsi', 500)->nullable();
            $table->string('youtube_url', 500)->nullable();  // Embed YouTube
            $table->string('file_path', 500)->nullable();    // Atau upload langsung
            $table->string('thumbnail_path', 500)->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 11. Pesan Masuk (Kontak Kami / Feedback)
        Schema::create('cms_pesan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150);
            $table->string('email', 100)->nullable();
            $table->string('subjek', 255);
            $table->text('isi');
            $table->string('ip_address', 45)->nullable();
            $table->boolean('is_read')->default(false);   // Sudah dibaca admin?
            $table->timestamps();
            $table->softDeletes();
        });

        // 12. Tautan Penting / Link Terkait
        Schema::create('cms_links', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('judul', 255);
            $table->string('url', 500);
            $table->string('logo_path', 500)->nullable(); // Logo instansi terkait
            $table->integer('urutan')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_links');
        Schema::dropIfExists('cms_pesan');
        Schema::dropIfExists('cms_videos');
        Schema::dropIfExists('cms_photos');
    }
};
