# Issue #046 — Backend — Inventory Migrations (Sistem Logistik)

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-inventory`
> **Priority**: 🔴 Critical (Fondasi arsitektur Manajemen Persediaan BKSDA)
> **Complexity**: 🔴 High (5 Tabel berelasi ketat dengan perhitungan matematis terdistribusi)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #001 (Setup Dasar)

---

## Branch

```
issue/046-backend-inventory-migrations
```

## Deskripsi

Selamat datang di **Fase 4: Modul Inventory (Persediaan)**! 📦
Modul ini bertugas melacak setiap batang pulpen, rim kertas, hingga perlengkapan lapangan yang keluar-masuk (Logistik Mutasi).

Berdasarkan permintaan *User*, konsep gudang raksasa (*Warehouse*) yang biasanya dipakai di ranah komersial kini **diganti penyebutannya menjadi KANTOR (Office)**. Karena dalam ekosistem pemerintahan BKSDA, barang logistik disebar ke berbagai "Kantor" (Contoh: Kantor Balai Besar, Kantor Seksi Konservasi Wilayah I, Kantor Resort A, dsb).

Pada Issue ini, kita akan menciptakan **5 Buah Cetak Biru (Migrations)** sekaligus secara berurutan agar tidak terjadi *Crash Relational*:
1. `inv_categories` (Kategori Barang: ATK, Kebersihan, Lapangan).
2. `inv_offices` (Kantor Lokasi Penyimpanan Barang).
3. `inv_items` (Master Data Barang, ditautkan ke Kategori).
4. `inv_inventory_stocks` (Kartu Stok: Jembatan yang menautkan kuantitas spesifik suatu *Item* di sebuah *Kantor* tertentu).
5. `inv_stock_transactions` (Log Jejak Mutasi Masuk/Keluar: Wajib mencatat rekam jejak jumlah masuk, saldo sisa, dan siapa yang meminta barang).

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Inventory/Migrations`.
- [ ] Berisi 5 buah file migrasi yang penamaannya (*Timestamp*) harus berurutan secara logis agar proses *Migrate* tidak menabrak *Foreign Key*.
- [ ] Menggunakan format UUID mutlak (Rule Arsitektur BKSDA).
- [ ] Menyematkan *Prefix* `inv_` pada semua nama tabel untuk menghindari bentrokan dengan modul lain (Rule 3.7).
- [ ] Memiliki kolom `employee_id` pada tabel mutasi untuk mencatat secara presisi Pegawai mana yang mengambil/meminta barang tersebut (Relasi Lintas Modul ke Fase 2).
- [ ] Dilarang menghapus riwayat barang yang sudah dipakai, gunakan `softDeletes()`.

---

## Langkah Demi Langkah

> ⚠️ **Peringatan untuk AI/Programmer**: Ganti `[TIMESTAMP_X]` di bawah ini dengan format tanggal yang valid (contoh: `2024_05_05_000001`). Pastikan urutan detiknya (01, 02, 03, dst) berurut ke bawah!

### 1. Kategori Barang (`inv_categories`)
**Nama File:** `backend/app/Modules/Inventory/Migrations/[TIMESTAMP_1]_create_inv_categories_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_kategori'); // Misal: ATK, Elektronik Ringan
            $table->text('deskripsi')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_categories');
    }
};
```

### 2. Kantor Penyimpanan (`inv_offices`) -> *Pengganti Warehouse*
**Nama File:** `backend/app/Modules/Inventory/Migrations/[TIMESTAMP_2]_create_inv_offices_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_offices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_kantor'); // Misal: Kantor Seksi Wilayah I
            $table->string('lokasi')->nullable();
            // Opsional: Relasi ke penanggung jawab kantor (Mengarah ke Modul Kepegawaian)
            $table->foreignUuid('penanggung_jawab_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_offices');
    }
};
```

### 3. Master Data Barang (`inv_items`)
**Nama File:** `backend/app/Modules/Inventory/Migrations/[TIMESTAMP_3]_create_inv_items_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('inv_categories')->restrictOnDelete();
            
            $table->string('kode_barang')->unique(); // Barcode SKU internal
            $table->string('nama_barang');
            $table->string('satuan', 50); // Pcs, Rim, Box, Lembar
            $table->integer('min_stock')->default(0); // Peringatan jika stok hampir habis
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_items');
    }
};
```

### 4. Peta Stok Logistik (`inv_inventory_stocks`)
**Nama File:** `backend/app/Modules/Inventory/Migrations/[TIMESTAMP_4]_create_inv_inventory_stocks_table.php`

**Konsep:** Barang A bisa berada di Kantor Pusat berjumlah 10, dan di Kantor Resort berjumlah 5.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_inventory_stocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('office_id')->constrained('inv_offices')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('inv_items')->cascadeOnDelete();
            
            $table->integer('quantity')->default(0); // Jumlah fisik di kantor tersebut
            $table->timestamps();
            
            // Pencegahan Duplikasi: Di satu kantor, tidak boleh ada 2 catatan stok untuk barang yang sama
            $table->unique(['office_id', 'item_id'], 'inv_office_item_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_inventory_stocks');
    }
};
```

### 5. Jejak Mutasi & Pengeluaran (`inv_stock_transactions`)
**Nama File:** `backend/app/Modules/Inventory/Migrations/[TIMESTAMP_5]_create_inv_stock_transactions_table.php`

**Konsep:** Log anti-korupsi. Setiap ada pensil yang keluar/masuk, di data kapan, oleh Admin siapa, sisa saldonya berapa, dan diminta oleh Pegawai siapa (jika mutasi keluar).

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('office_id')->constrained('inv_offices')->cascadeOnDelete();
            $table->foreignUuid('item_id')->constrained('inv_items')->cascadeOnDelete();
            
            // Jenis Mutasi
            $table->enum('type', ['in', 'out', 'adjustment']);
            
            $table->integer('quantity'); // Jumlah yang keluar/masuk
            $table->integer('remaining_stock'); // Saldo akhir setelah transaksi (Wajib ada untuk audit)
            $table->text('keterangan')->nullable();
            
            // Siapa Admin yang mengetik transaksi ini (Sistem Keamanan)
            $table->foreignUuid('user_id')->constrained('users')->restrictOnDelete();
            
            // Jika barang keluar, dicatat Pegawai siapa yang meminta/mengambilnya (Lintas Modul)
            $table->foreignUuid('employee_id')->nullable()->constrained('kpg_employees')->nullOnDelete();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_transactions');
    }
};
```

---

## Troubleshooting

### Q: `php artisan migrate` mengalami *Error "relation kpg_employees does not exist"*.

**Artinya:** Kamu menjalankan proyek ini di *database* yang belum menjalankan migrasi Fase 2.
**Solusi:** Pastikan `kpg_employees` benar-benar ada. Modul Inventory meraba batas wilayah Kepegawaian. Jika komputermu di-*reset*, jalankan `php artisan migrate:fresh --seed` agar semua fondasi sebelumnya terbangun kembali.

### Q: Kenapa `inv_inventory_stocks` tidak punya `softDeletes`?

**Artinya:** Desain arsitektur sengaja diatur efisien.
**Solusi:** Tabel itu hanyalah papan skor nilai (*Scoreboard*) berjalan. Jika sebuah barang dihapus, riwayat hidupnya ada di `inv_items` (punya SoftDelete). Dan setiap pergerakannya diabadikan secara permanen di `inv_stock_transactions` (Tidak punya *Delete* sama sekali, karena audit log tidak boleh dibuang).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): logistics and office infrastructure migrations" \
  --body "Pembuatan 5 cetak biru relasional untuk mendikte distribusi stok Barang antar Kantor BKSDA. Dilengkapi audit saldo dan integrasi kepegawaian. Detail di docs/issues/046-backend-inventory-migrations.md" \
  --label "backend,database,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/046-backend-inventory-migrations
```

### Step 3: Kerjakan

Salin kelima berkas migrasi PHP di atas ke dalam *folder* yang diinstruksikan. Pastikan urutan angka penamaan *(timestamp)* pada nama file dari urutan ke-1 hingga ke-5 benar-benar menaik secara kronologis.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(inventory): logistics and office infrastructure migrations (#46)"
git push -u origin issue/046-backend-inventory-migrations
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): logistics and office infrastructure migrations (#46)" \
  --body "## Summary
Meluncurkan kerangka arsitektur logistik untuk melacak pendistribusian aset Persediaan ke berbagai Kantor di bawah naungan BKSDA.

## Changes
- Pembuatan 5 Entitas: \`Categories\`, \`Offices\` (Pengganti Warehouses), \`Items\`, \`InventoryStocks\`, \`StockTransactions\`.
- Penerapan kunci komposit unik pada \`inventory_stocks\` untuk kekebalan duplikasi.
- Menjalin relasi \`employee_id\` (Lintas Modul) untuk menunjuk personil pengambil persediaan.

## Rules Compliance
- [x] Transmutasi seluruh entitas menggunakan prefiks \`inv_\` (Rule 3.7).
- [x] Pemasangan \`remaining_stock\` dan \`user_id\` sebagai jangkar Anti-Fraud / Audit.

Closes #46" \
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
Kita membuka gerbang Modul 4 (Inventory). Kata *Warehouse* dicoret dan diganti murni menggunakan *Offices* (Kantor) agar sesuai dengan regulasi operasional pemerintah.

## Task

Kerjakan Issue #046 (Backend — Inventory Migrations).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/046-backend-inventory-migrations.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `backend/app/Modules/Inventory/Migrations`.
3. Buat 5 file migrasi baru (urutkan berdasarkan *timestamp* buatanmu yang beruntun per detik) dan tempelkan kode skema cetak biru di atas ke masing-masing file tanpa merubah deklarasi `Blueprint`-nya.
4. Jangan jalankan perintah bawaan `php artisan make:migration` biasa, buatlah filenya di dalam kerangka struktur Modular ini.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
