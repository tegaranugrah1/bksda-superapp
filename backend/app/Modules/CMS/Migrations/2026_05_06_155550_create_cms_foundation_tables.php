<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Kategori Konten (Berita, Pengumuman, Siaran Pers, dll)
        Schema::create('cms_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100)->unique();
            $table->string('slug', 120)->unique(); // URL-friendly: "siaran-pers"
            $table->string('tipe', 50)->default('informasi'); // informasi, publikasi, galeri
            $table->integer('urutan')->default(0); // Untuk pengurutan manual
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Pengaturan Website (Singleton — Hanya 1 Baris Data)
        Schema::create('cms_website', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_instansi', 255)->default('BKSDA');
            $table->string('alamat', 500)->nullable();
            $table->string('telepon', 30)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('fax', 30)->nullable();
            $table->text('tentang')->nullable(); // Deskripsi singkat di Footer
            $table->string('logo_path', 500)->nullable();
            $table->string('favicon_path', 500)->nullable();
            // Sosial Media
            $table->string('facebook', 255)->nullable();
            $table->string('instagram', 255)->nullable();
            $table->string('youtube', 255)->nullable();
            $table->string('twitter', 255)->nullable();
            $table->timestamps();
        });

        // 3. Kepala Kantor (Pimpinan BKSDA — Ditampilkan di Halaman Profil)
        Schema::create('cms_kepala', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150);
            $table->string('nip', 30)->nullable();
            $table->string('jabatan', 100)->default('Kepala BKSDA');
            $table->string('foto_path', 500)->nullable();
            $table->text('sambutan')->nullable(); // Kata Sambutan Pimpinan
            $table->boolean('is_active')->default(true); // Hanya 1 yang aktif
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Menu Navigasi Website (Header & Footer)
        Schema::create('cms_menus', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('label', 100);          // Teks yang ditampilkan
            $table->string('url', 500);             // Link tujuan
            $table->string('posisi', 20)->default('header'); // header, footer
            $table->uuid('parent_id')->nullable();   // Self-referencing sub-menu (FK handled at app level)
            $table->integer('urutan')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_menus');
        Schema::dropIfExists('cms_kepala');
        Schema::dropIfExists('cms_website');
        Schema::dropIfExists('cms_categories');
    }
};
