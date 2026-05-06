# Issue #047 — Backend — Inventory Models (Logika Relasional Logistik)

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-inventory`
> **Priority**: 🔴 Critical (Menghidupkan kerangka tabel menjadi entitas cerdas)
> **Complexity**: 🟡 Medium (Banyaknya jumlah model dan pemetaan relasi antar-fase)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #046

---

## Branch

```
issue/047-backend-inventory-models
```

## Deskripsi

Setelah 5 buah cetak biru (*Migrations*) Kategori, Kantor, Barang, Stok, dan Mutasi selesai dieksekusi oleh mesin SQL pada Issue #046, tabel-tabel tersebut masih berwujud benda mati. Agar *Controller* kita kelak bisa memerintahkannya dengan bahasa yang mudah (ORM), kita harus memasangkan nyawanya melalui perakitan 5 **Models**.

Sesuai dengan mandat *Project Rules*, seluruh model ini:
1. **Rule 1.3 Mutlak**: Dilarang menggunakan `$guarded = []`. Setiap kolom yang diizinkan untuk diisi harus dieja satu-persatu di dalam `$fillable`. Ini menutup celah *Mass Assignment Vulnerability* (Peretasan Injeksi Parameter).
2. **Perlindungan Data (Rule 3.6)**: Model induk (`Category`, `Office`, `Item`) wajib dibekali *Trait* `SoftDeletes` karena data ini terkait erat dengan aset negara yang tidak boleh lenyap riwayatnya.
3. **Penautan Ekosistem (Cross-Module)**: Model `Office` dan `StockTransaction` akan menembakkan panah relasinya (`belongsTo`) menuju ranah Modul Kepegawaian (`kpg_employees`) dan Modul Inti (`users`).

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Inventory/Models`.
- [ ] Model `Category.php` diciptakan dengan relasi 1-ke-Banyak menuju *Items*.
- [ ] Model `Office.php` (Kantor) diciptakan dengan relasi ke *Penanggung Jawab* (Pegawai).
- [ ] Model `Item.php` diciptakan dengan penautan pelindung kategori.
- [ ] Model `InventoryStock.php` diciptakan sebagai perwakilan pivot mutlak jumlah saldo.
- [ ] Model `StockTransaction.php` diciptakan dengan fungsi mutlak sebagai jejak rekam (Audit Trail) dari User dan Employee.

---

## Langkah Demi Langkah Pembentukan Model

Buatlah direktori penyimpanan Model logistik ini terlebih dahulu:
```bash
mkdir -p backend/app/Modules/Inventory/Models
```

Tuliskan 5 buah baris koding Model di bawah ini. Harap perhatikan susunan *Namespace*-nya secara teliti.

### 1. Kategori (Category)
**Path:** `backend/app/Modules/Inventory/Models/Category.php`

```php
<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inv_categories';

    protected $fillable = [
        'nama_kategori',
        'deskripsi'
    ];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'category_id');
    }
}
```

### 2. Kantor Penyimpanan (Office)
**Path:** `backend/app/Modules/Inventory/Models/Office.php`

```php
<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Modules\Kepegawaian\Models\Employee;

class Office extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inv_offices';

    protected $fillable = [
        'nama_kantor',
        'lokasi',
        'penanggung_jawab_id'
    ];

    public function penanggungJawab(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'penanggung_jawab_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(InventoryStock::class, 'office_id');
    }
}
```

### 3. Master Data Barang (Item)
**Path:** `backend/app/Modules/Inventory/Models/Item.php`

```php
<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'inv_items';

    protected $fillable = [
        'category_id',
        'kode_barang',
        'nama_barang',
        'satuan',
        'min_stock'
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(InventoryStock::class, 'item_id');
    }
}
```

### 4. Papan Saldo Fisik (InventoryStock)
**Path:** `backend/app/Modules/Inventory/Models/InventoryStock.php`

```php
<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryStock extends Model
{
    use HasUuids;

    protected $table = 'inv_inventory_stocks';

    protected $fillable = [
        'office_id',
        'item_id',
        'quantity'
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }
}
```

### 5. Jejak Rekam Keluar Masuk (StockTransaction)
**Path:** `backend/app/Modules/Inventory/Models/StockTransaction.php`

```php
<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;

class StockTransaction extends Model
{
    use HasUuids;

    protected $table = 'inv_stock_transactions';

    protected $fillable = [
        'office_id',
        'item_id',
        'type',             // 'in', 'out', 'adjustment'
        'quantity',
        'remaining_stock',  // WAJIB: Mencatat jumlah sisa saat itu
        'keterangan',
        'user_id',          // Siapa admin yang klik simpan
        'employee_id'       // Siapa pegawai yang minta barang
    ];

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'item_id');
    }

    public function admin() // Admin pemroses data
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function recipient() // Penerima/Peminta barang
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
```

---

## Troubleshooting

### Q: IDE saya menyatakan model `Employee` atau `User` tidak ditemukan (*Undefined Type*).

**Artinya:** Kamu melewatkan pemasangan impor antar-wilayah.
**Solusi:** Pastikan klausa `use App\Modules\Kepegawaian\Models\Employee;` dan `use App\Models\User;` bertengger dengan sempurna di bagian paling atas *Header File*. Sistem modular Laravel sangat ketat terhadap struktur alamat *Namespace*.

### Q: Kenapa `StockTransaction` dan `InventoryStock` tidak memakai SoftDeletes?

**Artinya:** Desain sistem menghindari pembengkakan ruang (*Bloat*) dan menjaga integritas Audit.
**Solusi:** Sebuah barang bisa dihapus (Masuk Tong Sampah), tapi sejarah keluar-masuknya dan catatannya tidak boleh dihapus. Itulah kenapa Transaksi dan Kartu Stok mutlak tidak boleh dikenakan *Trait SoftDeletes*.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): relational mapping and strictly typed eloquent models" \
  --body "Menjahit lima model ORM utama Modul Logistik dengan kepatuhan tinggi terhadap Rule 1.3 (Fillable Only) dan merancang arsitektur jembatan relasi lintas wilayah (*Cross-Module Relational Links*). Detail di docs/issues/047-backend-inventory-models.md" \
  --label "backend,database,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/047-backend-inventory-models
```

### Step 3: Kerjakan

Salin baris kode pada ke-5 file Model tersebut. Cek apakah ada garis bawah merah dari Intephense (*IDE*), jika ada, jalankan perintah `composer dump-autoload` untuk memancing registrasi Model.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(inventory): relational mapping and strictly typed eloquent models (#47)"
git push -u origin issue/047-backend-inventory-models
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): relational mapping and strictly typed eloquent models (#47)" \
  --body "## Summary
Aktivasi nyawa penggerak atas struktur logistik dan kantor, merancang navigasi ORM antar model di dalam sistem BKSDA.

## Changes
- Penciptaan \`Category.php\`, \`Office.php\`, \`Item.php\`, \`InventoryStock.php\`, dan \`StockTransaction.php\`.
- Penerapan arsitektur \`SoftDeletes\` pada model Master.
- Penyusunan relasi \`BelongsTo\` untuk pelacakan identitas (*Audit Trail*) mengarah kepada Modul Pegawai dan User Induk.

## Rules Compliance
- [x] Rule 1.3: Penghancuran absolut praktik \`\$guarded = []\` dengan menulis spesifik atribut pada kolom \`\$fillable\`.

Closes #47" \
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
Struktur database (Migrations) Modul Logistik / Inventory sudah ada. Kita harus merangkai 5 Model Eloquent-nya agar bisa dipanggil nanti oleh Controller.

## Task

Kerjakan Issue #047 (Backend — Inventory Models).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/047-backend-inventory-models.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `backend/app/Modules/Inventory/Models` (jika belum ada).
3. Buat dan *copy-paste* masing-masing 5 model di atas (Category, Office, Item, InventoryStock, StockTransaction).
4. Tidak boleh ada 1 pun yang menggunakan fitur kotor `$guarded`. Semua harus memakai daftar atribut eksplisit `$fillable`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
