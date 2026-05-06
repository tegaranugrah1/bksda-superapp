# Issue #060 — Backend — BMN Migrations (Fondasi Aset Negara)

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-bmn`
> **Priority**: 🔴 Critical (Tahap Pertama Fase Terbesar BKSDA)
> **Complexity**: 🔴 High (Pembuatan Entitas Data Masif dengan Ratusan Atribut)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #022 (Tabel Kepegawaian untuk Relasi)

---

## Branch

```
issue/060-backend-bmn-migrations
```

## Deskripsi

Selamat datang di neraka pendataan aset negara! Selamat datang di **Phase 5: BMN (Barang Milik Negara)**.

Berbeda dengan barang Logistik/Inventaris (pensil, kertas) yang cepat habis dan dihitung berdasarkan 'jumlah' (Kuantitas), BMN adalah aset bernilai tinggi (Mobil Dinas, Komputer, Genset, Lahan) di mana **1 Aset = 1 ID Spesifik**. Aset BMN memiliki pelacakan ketat hingga ke tingkat penyusutan harga (*Depreciation*).

Pada **Issue #060** ini, tugasmu adalah mencetak desain dasar tabel-tabel tersebut ke dalam pangkalan data (*Database*). Semua nama tabel BMN wajib berawalan `bmn_` sesuai aturan proyek.

Kita akan mencetak 4 buah tabel sekaligus:
1. `bmn_assets`: Tabel Raksasa Penyimpan Master Aset.
2. `bmn_asset_loans`: Tabel Riwayat Peminjaman Aset (Misal: Laptop dinas dipinjam pegawai).
3. `bmn_asset_maintenances`: Tabel Riwayat Perbaikan (Misal: Ganti oli mobil dinas).
4. `bmn_asset_updates`: Tabel Intelijen (Audit). Jika ada yang iseng mengubah harga aset, maka rekam jejak lama dan baru akan tercatat di sini.

---

## Acceptance Criteria

- [ ] Tabel `bmn_assets` tercipta dengan struktur mutlak (UUID, SoftDeletes, dan pembatasan Tipe Data ketat seperti Decimal untuk Nilai Uang).
- [ ] Tabel `bmn_asset_loans` tercipta dan terkait secara relasional *(Foreign Key)* dengan tabel `kpg_employees` (Modul Kepegawaian).
- [ ] Tabel `bmn_asset_maintenances` tercipta.
- [ ] Tabel `bmn_asset_updates` tercipta.
- [ ] Berhasil melewati ujian ketat eksekusi perintah `php artisan migrate`.

---

## Panduan Implementasi Cerdas

Buatlah direktori khusus migrasi BMN jika belum ada (sesuai struktur Modular):
```bash
mkdir -p backend/app/Modules/Bmn/Migrations
```

Lalu, di dalam folder tersebut, buatlah berkas PHP dan isi secara presisi! 
*(Penamaan tanggal di bawah dibuat berurutan agar Laravel mengeksekusinya tidak terbalik).*

### 1. Tabel Raksasa BMN (2024_01_01_000001_create_bmn_assets_table.php)

*(Catatan: Ini adalah versi Essential/MVP. Aset BMN sejatinya memiliki ratusan kolom sesuai excel referensi BPK, namun ini adalah kolom wajibnya).*

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Identitas BMN Negara
            $table->string('kode_barang', 50)->index();
            $table->string('nup', 20)->index()->comment('Nomor Urut Pendaftaran BPK');
            $table->string('nama_barang');
            $table->string('merk_tipe')->nullable();
            
            // Kondisi & Tahun
            $table->integer('tahun_perolehan')->nullable();
            $table->enum('kondisi', ['Baik', 'Rusak Ringan', 'Rusak Berat'])->default('Baik');
            
            // Finansial (Sangat Penting menggunakan Decimal 15 digit, 2 koma)
            $table->decimal('nilai_perolehan', 15, 2)->default(0);
            $table->decimal('nilai_buku', 15, 2)->default(0);
            
            // Keberadaan
            $table->string('lokasi_spesifik')->nullable();
            // Pemegang Saat Ini (Jika sedang dikuasai individu, jika tidak maka NULL artinya ada di gudang)
            $table->foreignUuid('employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            
            // Bukti Visual
            $table->string('foto_url', 1000)->nullable();
            $table->text('keterangan')->nullable();
            
            // Jejak Sistem (Wajib ada di tiap tabel)
            $table->timestamps();
            $table->softDeletes(); // BMN Dilarang Dihapus Permanen! (Aturan BPK)
            
            // Satu kode barang + NUP tidak boleh ada yang kembar di Indonesia!
            $table->unique(['kode_barang', 'nup']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_assets');
    }
};
```

### 2. Tabel Peminjaman (2024_01_01_000002_create_bmn_asset_loans_table.php)

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_loans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            $table->foreignUuid('asset_id')->constrained('bmn_assets')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('kpg_employees')->cascadeOnDelete();
            
            $table->date('tanggal_pinjam');
            $table->date('tanggal_kembali')->nullable()->comment('Kosong jika belum dikembalikan');
            $table->enum('status', ['dipinjam', 'dikembalikan'])->default('dipinjam');
            
            $table->text('keterangan')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_loans');
    }
};
```

### 3. Tabel Pemeliharaan (2024_01_01_000003_create_bmn_asset_maintenances_table.php)

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_maintenances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            $table->foreignUuid('asset_id')->constrained('bmn_assets')->cascadeOnDelete();
            
            $table->date('tanggal_service');
            $table->decimal('biaya', 15, 2)->default(0);
            $table->text('deskripsi');
            $table->string('bukti_nota_url', 1000)->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_maintenances');
    }
};
```

### 4. Tabel Mata-mata Audit (2024_01_01_000004_create_bmn_asset_updates_table.php)

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bmn_asset_updates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            $table->foreignUuid('asset_id')->constrained('bmn_assets')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete(); // Admin yang iseng
            
            $table->string('field_changed'); // Misal: "nilai_perolehan"
            $table->text('old_value')->nullable(); // Misal: "15000000"
            $table->text('new_value')->nullable(); // Misal: "12000000"
            
            $table->string('alasan_perubahan')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bmn_asset_updates');
    }
};
```

---

## Troubleshooting

### Q: Migrasi gagal dengan pesan *'Foreign key constraint is incorrectly formed'* pada `kpg_employees`!

**Artinya:** Urutan muatan (*Loading Order*) Migrasi Modul kamu tertukar.
**Solusi:** Tabel `bmn_asset_loans` mencoba mengaitkan diri ke `kpg_employees`. Namun, jika Modul BMN dijalankan *lebih dulu* oleh Laravel sebelum Modul Kepegawaian, ia akan gagal karena `kpg_employees` belum tercipta! Di dunia Monorepo Modular, pastikan ServiceProvider Modul Kepegawaian didaftarkan lebih awal di file `bootstrap/providers.php` dibandingkan BmnServiceProvider.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): establish rigorous relational schemas for national asset management" \
  --body "Merancang pilar fondasi Database BMN (Barang Milik Negara). Merangkai arsitektur 4 tabel sakral: Assets Master, Loans, Maintenances, dan intelijen Asset Updates berpedoman pada kaidah akutansi (Decimal 15,2). Detail di docs/issues/060-backend-bmn-migrations.md" \
  --label "backend,database,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/060-backend-bmn-migrations
```

### Step 3: Kerjakan

Salin 4 berkas PHP di atas, lalu letakkan di rute pelabuhan Migrasi Modular milik BMN. Lakukan simulasi pemusnahan dan pembangunan ulang Database untuk memastikan arsitekturmu berkelas:
```bash
cd backend
php artisan migrate:fresh --seed
```

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): establish rigorous relational schemas for national asset management (#60)"
git push -u origin issue/060-backend-bmn-migrations
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): establish rigorous relational schemas for national asset management (#60)" \
  --body "## Summary
Pembukaan Fase 5 (BMN). Penerapan pondasi Database berlapis *(Multi-table)* untuk penanganan riwayat aset bernilai tinggi milik negara.

## Changes
- Pembuatan tabel induk \`bmn_assets\` lengkap dengan kunci ganda \`kode_barang\` dan \`nup\`.
- Penerapan \`SoftDeletes\` mutlak guna mencegah lenyapnya riwayat aset BMN.
- Pembuatan tiga tabel pengawal: \`bmn_asset_loans\` (Peminjaman), \`bmn_asset_maintenances\` (Pemeliharaan), dan \`bmn_asset_updates\` (Intelijen Perubahan Nilai).

## Rules Compliance
- [x] Lolos penggunaan standar presisi *Accounting* dengan pemakaian \`decimal('nama', 15, 2)\` yang kebal terhadap erosi angka (Bebas *Floating Point Error*).

Closes #60" \
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
Modul BMN (Barang Milik Negara) adalah modul terbesar dan paling vital. Semua ini dimulai dari fondasi Database.

## Task

Kerjakan Issue #060 (Backend — BMN Migrations).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/060-backend-bmn-migrations.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder wadah persembunyian skema: `backend/app/Modules/Bmn/Migrations`.
3. Ciptakan 4 buah file migrasi yang telah diinstruksikan. Beri nama file secara presisi sesuai dengan contoh agar urutan (*Loading Order*) Laravel tidak kacau.
4. Lakukan pengetesan `php artisan migrate` di terminal `backend`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
