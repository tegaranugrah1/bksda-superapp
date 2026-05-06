# Issue #077 — Backend — DeReporting Migrations (Fondasi Data Pelaporan Eksternal)

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-dereporting`
> **Priority**: 🔴 Critical (Skema Relasional Bertingkat Paling Rumit di Sistem)
> **Complexity**: 🔴 High (9 Tabel Master + Tabel Transaksional dengan Keterikatan Berlapis)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #004 (Database Config)

---

## Branch

```
issue/077-backend-dereporting-migrations
```

## Deskripsi

Selamat datang di **Fase 6: Modul DeReporting**! 📊

Berbeda dengan Modul BMN atau Logistik yang mengandalkan kalkulasi angka, tantangan utama Modul DeReporting terletak pada **Struktur Hirarki Master Data** yang sangat dalam (hingga 4 lapis berantai). Laporan tidak akan bisa diinput jika data Bidang, Jenis, Kategori, dan Jenis Data belum terhubung sempurna bak sebuah rantai besi.

Pada **Issue #077** ini, kita akan meletakkan bata pertama *(Database Migrations)* untuk membangun keseluruhan "Rak Lemari Laporan" tersebut. Kita akan mencetak **9 Tabel Master** dan **2 Tabel Transaksi Laporan (Internal & Eksternal)**. Semuanya diwajibkan menggunakan prefiks (awalan) `dr_` untuk mengisolasi wilayah modul ini dari modul lainnya.

**ATURAN MUTLAK (Project Rule 3.3)**: 
Dilarang keras menghapus Master Data jika sudah ada laporan yang terkait. Oleh sebab itu, seluruh `foreignId` pada modul ini WAJIB menggunakan pengunci `onDelete('restrict')`, BUKAN `cascade`.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/DeReporting/Migrations`.
- [ ] Tersedia migrasi untuk 7 Tabel Master berprefiks `dr_` (Tahun, Bidang, Koordinator, Jenis, Kategori, JenisData, Anggaran).
- [ ] Tersedia migrasi untuk Laporan Internal (`dr_internals`) yang merantai seluruh tabel master di atas.
- [ ] Tersedia migrasi untuk Laporan Publik Eksternal (`dr_ekternals`) yang melayani form unggahan masyakarat tanpa login.
- [ ] Lolos pengujian kompilasi: `php artisan migrate:status`.

---

## Panduan Implementasi Cerdas

Masuk ke markas besar DeReporting:
```bash
mkdir -p backend/app/Modules/DeReporting/Migrations
```

### 1. Fondasi Master Data Tingkat 1 (Bidang, Koordinator, Tahun, Anggaran)
Buat file *Migration* (Contoh format penamaan: `2024_01_01_000001_create_dr_master_level_1_tables.php`):

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tahun Pelaporan
        Schema::create('dr_tahun', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->integer('tahun')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. Bidang (Level Teratas)
        Schema::create('dr_bidang', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100)->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. Koordinator / Penanggung Jawab
        Schema::create('dr_koordinator', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 150)->unique();
            $table->timestamps();
            $table->softDeletes();
        });

        // 4. Sumber Anggaran
        Schema::create('dr_anggaran', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama', 100)->unique();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_anggaran');
        Schema::dropIfExists('dr_koordinator');
        Schema::dropIfExists('dr_bidang');
        Schema::dropIfExists('dr_tahun');
    }
};
```

### 2. Rantai Master Data Tingkat 2 & 3 (Jenis, Kategori, Jenis Data)
Buat file `2024_01_01_000002_create_dr_master_level_2_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Level 2: Jenis (Terkait Bidang)
        Schema::create('dr_jenis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bidang_id')->constrained('dr_bidang')->onDelete('restrict');
            $table->string('nama', 150);
            $table->timestamps();
            $table->softDeletes();
            
            // Cegah Nama Jenis yang sama di dalam satu Bidang
            $table->unique(['bidang_id', 'nama']);
        });

        // Level 3: Kategori (Terkait Jenis)
        Schema::create('dr_kategori', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('jenis_id')->constrained('dr_jenis')->onDelete('restrict');
            $table->string('nama', 200);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['jenis_id', 'nama']);
        });

        // Level 4: Jenis Data (Terkait Kategori & Koordinator)
        Schema::create('dr_jenis_data', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('kategori_id')->constrained('dr_kategori')->onDelete('restrict');
            $table->foreignUuid('koordinator_id')->nullable()->constrained('dr_koordinator')->onDelete('restrict');
            $table->string('nama', 255);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['kategori_id', 'nama']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dr_jenis_data');
        Schema::dropIfExists('dr_kategori');
        Schema::dropIfExists('dr_jenis');
    }
};
```

### 3. Eksekusi Laporan Internal & Eksternal
Buat file `2024_01_01_000003_create_dr_reports_tables.php`:

```php
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
            
            // Tracker Kemanan
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
```

---

## Troubleshooting

### Q: Migrasi menolak berjalan dengan pesan error `Failed to open stream` saat dipanggil via `artisan migrate`!

**Artinya:** Laravel belum mengetahui rute eksistensi folder isolasi modul yang baru saja kamu buat.
**Solusi:** Karena *ServiceProvider* milik Modul DeReporting belum diciptakan (Di Issue 079 besok), laravel mengabaikan folder ini. Kamu bisa menguji coba *Database* mu berjalan secara manual dengan melempar parameter khusus langsung ke terminal:
```bash
php artisan migrate --path="app/Modules/DeReporting/Migrations"
```
Jika semuanya lulus *Migrating*, maka struktur kerjamu sudah sempurna!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): architect deeply nested relational schemas for hierarchical reporting structures" \
  --body "Merancang pangkalan data level berat untuk melayani Modul Laporan (DeReporting). Mengimplementasikan 4 derajat hierarki relasional menggunakan \`uuid\` serta mengkunci integritas data masa lampau menggunakan metode \`onDelete('restrict')\`. Detail di docs/issues/077-backend-dereporting-migrations.md" \
  --label "backend,database,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/077-backend-dereporting-migrations
```

### Step 3: Kerjakan

Pahat ketiga wujud kepingan *Migration* tersebut. Pastikan tidak ada satupun kata `cascade` pada fungsi `onDelete()`, dan semua penamaan tabel berawalan `dr_`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): architect deeply nested relational schemas for hierarchical reporting structures (#77)"
git push -u origin issue/077-backend-dereporting-migrations
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): architect deeply nested relational schemas for hierarchical reporting structures (#77)" \
  --body "## Summary
Pancangan bata pertama dari Modul Raksasa: Sistem Pelaporan Kinerja Bertingkat *(DeReporting)*.

## Changes
- Pembuatan 3 gelombang \`Migrations\` berisi pemetaan relasional untuk 9 Master Data.
- Pembuatan fondasi rantai *(Chained Integrity)*: Bidang -> Jenis -> Kategori -> JenisData.
- Pembuatan tabel isolasi pelaporan internal \`dr_internals\` serta tabel pelaporan tanpa-login (Publik) \`dr_ekternals\` yang dibekali perisai identitas \`ip_address\`.

## Rules Compliance
- [x] Sesuai Doktrin Integritas Penghapusan (Rule 3.3): Secara mutlak mengharamkan taktik kotor \`onDelete('cascade')\`. Seluruh Master Data diatur dengan \`onDelete('restrict')\` untuk memastikan Laporan bulan lalu tidak terbelah jika nama sebuah 'Bidang' dihapus sepihak.

Closes #77" \
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
Modul BMN telah tertutup di Fase 5. Sekarang kita masuk ke Modul baru: DeReporting (Fase 6). Modul ini terkenal dengan kerumitan tabel berantainya (Master Data yang mengakar dalam). Kita akan membangun Database-nya.

## Task

Kerjakan Issue #077 (Backend — DeReporting Migrations).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/077-backend-dereporting-migrations.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke fondasi bumi di `backend/app/Modules/DeReporting/Migrations`.
3. Pahat ketiga file cetak biru `Migration` di atas (Level 1, Level 2, dan Reports) persis sesuai rujukan. Jangan lupakan pemanggil `uuid()` sebagai fondasi kunci utama!
4. Validasi rute database-mu menggunakan bantuan taktik manual `php artisan migrate --path=...` yang ada di seksi *Troubleshooting*.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
