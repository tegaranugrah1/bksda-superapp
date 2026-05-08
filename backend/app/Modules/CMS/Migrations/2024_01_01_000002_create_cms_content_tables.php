<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 5. Informasi / Berita (Konten utama website)
        Schema::create('cms_informasi', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->nullable()->constrained('cms_categories')->onDelete('set null');
            $table->foreignUuid('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('judul', 500);
            $table->string('slug', 520)->unique();
            $table->text('konten');                  // Konten HTML dari Rich Text Editor
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('sumber', 255)->nullable(); // Sumber berita (jika dari luar)
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->integer('views_count')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_published');
            $table->index('published_at');
        });

        // 6. Profil Organisasi (Visi, Misi, Sejarah, Struktur)
        Schema::create('cms_profil', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('judul', 255);
            $table->string('slug', 270)->unique();
            $table->text('konten');
            $table->string('thumbnail_path', 500)->nullable();
            $table->integer('urutan')->default(0);
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 7. Kawasan Konservasi (Data Teknis + Peta)
        Schema::create('cms_kawasan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 255);
            $table->string('slug', 270)->unique();
            $table->text('deskripsi');
            $table->string('thumbnail_path', 500)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();   // Koordinat Peta
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('luas_ha', 12, 2)->nullable();     // Luas dalam Hektar
            $table->string('tipe_kawasan', 100)->nullable();   // "Cagar Alam", "Suaka Margasatwa"
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 8. TSL — Tumbuhan & Satwa Liar (Spesies Dilindungi)
        Schema::create('cms_tsl', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_lokal', 255);         // Nama Indonesia
            $table->string('nama_latin', 255)->nullable(); // Nama Ilmiah
            $table->string('slug', 270)->unique();
            $table->text('deskripsi');
            $table->string('thumbnail_path', 500)->nullable();
            $table->string('status_iucn', 50)->nullable(); // CR, EN, VU, NT, LC
            $table->string('tipe', 20)->default('satwa');  // satwa, tumbuhan
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_tsl');
        Schema::dropIfExists('cms_kawasan');
        Schema::dropIfExists('cms_profil');
        Schema::dropIfExists('cms_informasi');
    }
};
