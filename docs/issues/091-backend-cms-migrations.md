# Issue #091 — Backend — CMS Migrations (Fondasi Raksasa Pengelola Konten Web)

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-cms`
> **Priority**: 🔴 Critical (Fondasi Terluas: 16 Tabel untuk Seluruh Website Publik BKSDA)
> **Complexity**: 🔴 High (Jumlah Tabel Terbanyak di Seluruh Proyek)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #004 (Database Config)

---

## Branch

```
issue/091-backend-cms-migrations
```

## Deskripsi

Selamat datang di **Fase 7: Modul CMS (Content Management System)**! 🌐📰

Modul ini adalah pondasi dari "Wajah Publik BKSDA" — website resmi yang dikunjungi ratusan ribu masyarakat setiap tahunnya. Seluruh Berita, Galeri Foto/Video, Profil Organisasi, Data Kawasan Konservasi, hingga Regulasi Hukum akan dikelola melalui modul ini.

Dengan **16 tabel** yang harus dibangun, ini adalah *Migration* terluas di seluruh proyek BKSDA. Namun jangan panik! Mayoritas tabel CMS berstruktur sederhana (hanya `judul`, `konten`, `gambar`). Kerumitannya terletak pada kuantitas, bukan kompleksitas relasi.

**Strategi Pemecahan:**
Agar AI Pelanjut tidak kewalahan, kita akan memecah 16 tabel ke dalam **4 Gelombang Migration** berdasarkan tema:
1. **Gelombang 1 — Fondasi**: Categories, Website Settings, Kepala Kantor, Menus
2. **Gelombang 2 — Konten Utama**: Informasi (Berita), Profil, Kawasan, TSL
3. **Gelombang 3 — Media**: Photos, Videos, Pesan, Links
4. **Gelombang 4 — Publikasi**: Buku, Leaflet, Poster, Regulasi

**ATURAN MUTLAK (Project Rule 3.7)**: 
Seluruh tabel CMS wajib menggunakan prefiks `cms_` untuk isolasi modul.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/CMS/Migrations`.
- [ ] Tersedia 4 file Migration yang mencakup keseluruhan 16 tabel berprefiks `cms_`.
- [ ] Seluruh tabel konten memiliki kolom `is_published` (boolean) untuk kontrol visibilitas publik.
- [ ] Tabel `cms_photos` dan `cms_videos` memiliki relasi polimorfik (`imageable_type`, `imageable_id`) ATAU relasi langsung ke tabel induk.
- [ ] Lolos pengujian kompilasi: `php artisan migrate --path=app/Modules/CMS/Migrations`.

---

## Panduan Implementasi Cerdas

Masuk ke markas besar CMS:
```bash
mkdir -p backend/app/Modules/CMS/Migrations
```

### Gelombang 1 — Fondasi & Konfigurasi
**File:** `2024_01_01_000001_create_cms_foundation_tables.php`

```php
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
            $table->uuid('parent_id')->nullable();  // Sub-menu (self-referencing)
            $table->integer('urutan')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('parent_id')->references('id')->on('cms_menus')->onDelete('set null');
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
```

### Gelombang 2 — Konten Utama
**File:** `2024_01_01_000002_create_cms_content_tables.php`

```php
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
```

### Gelombang 3 — Media & Komunikasi
**File:** `2024_01_01_000003_create_cms_media_tables.php`

```php
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
```

### Gelombang 4 — Publikasi & Regulasi
**File:** `2024_01_01_000004_create_cms_publication_tables.php`

```php
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
            $table->string('cover_path', 500)->nullable();
            $table->string('file_path', 500)->nullable();  // PDF untuk diunduh
            $table->boolean('is_published')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 15. Leaflet & Poster (Brosur Digital)
        Schema::create('cms_leaflet', function (Blueprint $table) {
            $table->uuid('id')->primary();
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
```

---

## Troubleshooting

### Q: Error `duplicate key value violates unique constraint` saat menjalankan migration!

**Artinya:** Kamu sudah pernah menjalankan sebagian *Migration* sebelumnya dan tabel masih ada.
**Solusi:** Jalankan `php artisan migrate:fresh --path=app/Modules/CMS/Migrations` untuk membersihkan semua tabel CMS dan menata ulang dari awal. **PERINGATAN**: Perintah ini akan menghapus seluruh data di tabel CMS!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): architect comprehensive 16-table content management schema for public website" \
  --body "Membangun fondasi database terluas di seluruh proyek: 16 tabel berprefiks \`cms_\` yang mencakup Berita, Galeri, Kawasan, TSL, Publikasi, Regulasi, dan konfigurasi Website. Dipecah menjadi 4 gelombang *Migration* bertema. Detail di docs/issues/091-backend-cms-migrations.md" \
  --label "backend,database,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/091-backend-cms-migrations
```

### Step 3: Kerjakan

Pahat ke-4 file *Migration* secara berurutan. Pastikan urutan `down()` adalah kebalikan dari `up()` agar *Rollback* tidak meledak karena *Foreign Key Constraint*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(cms): architect comprehensive 16-table content management schema for public website (#91)"
git push -u origin issue/091-backend-cms-migrations
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): architect comprehensive 16-table content management schema for public website (#91)" \
  --body "## Summary
Penancapan fondasi Database Raksasa untuk Modul CMS — Wajah Publik BKSDA.

## Changes
- **Gelombang 1**: Fondasi (\`cms_categories\`, \`cms_website\`, \`cms_kepala\`, \`cms_menus\`)
- **Gelombang 2**: Konten (\`cms_informasi\`, \`cms_profil\`, \`cms_kawasan\`, \`cms_tsl\`)
- **Gelombang 3**: Media (\`cms_photos\`, \`cms_videos\`, \`cms_pesan\`, \`cms_links\`)
- **Gelombang 4**: Publikasi (\`cms_jenis\`, \`cms_buku\`, \`cms_leaflet\`, \`cms_regulasi\`)
- Seluruh tabel konten dibekali \`is_published\` dan \`SoftDeletes\`.

## Rules Compliance
- [x] Lolos Doktrin Isolasi Modular (Project Rule 3.7): Seluruh 16 tabel diisolasi sempurna menggunakan prefiks \`cms_\`.

Closes #91" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Modul CMS adalah pondasi website publik BKSDA. Kita butuh 16 tabel Database berprefiks `cms_` yang dipecah menjadi 4 gelombang Migration.

## Task

Kerjakan Issue #091 (Backend — CMS Migrations).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/091-backend-cms-migrations.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `backend/app/Modules/CMS/Migrations/`.
3. Pahat 4 file Migration secara berurutan (Gelombang 1 → 2 → 3 → 4).
4. Pastikan SELURUH tabel menggunakan prefiks `cms_` dan primary key `uuid`.
5. Validasi dengan `php artisan migrate --path=app/Modules/CMS/Migrations`.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
