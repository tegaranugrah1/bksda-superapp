# Issue #051 — Backend — Inventory Controllers (Pusat Kendali Logistik)

> **Type**: `feature`
> **Labels**: `backend`, `controllers`, `module-inventory`
> **Priority**: 🔴 Critical (Menyambungkan Database, Validasi, dan Servis dengan API)
> **Complexity**: 🟡 Medium (Pembuatan 4 Pengendali Mandiri agar terhindar dari *God Object*)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #049, Issue #050

---

## Branch

```
issue/051-backend-inventory-controllers
```

## Deskripsi

Tibalah saatnya kita merakit **Meriam Utama** (Controller) Modul Logistik. Sesuai dengan prinsip *Clean Code* global, kita dilarang keras menumpuk 20 fungsi API ke dalam 1 file `InventoryController.php` yang raksasa (*God Object*). Hal tersebut akan membuat pemeliharaan di masa depan seperti neraka.

Pada Issue ini, kita akan mendistribusikan lalu lintas data menjadi **4 Controller Khusus**, di mana setiap kendali hanya bertanggung jawab atas wilayahnya sendiri:
1. `DashboardController`: Khusus menyuplai data statistik untuk Grafik dan Peringatan Stok Menipis.
2. `OfficeController`: Mengurus pendataan (CRUD) penambahan Kantor penyimpan aset negara.
3. `ItemController`: Mengurus katalog Master Data Barang.
4. `StockController`: **Ini yang paling vital!** Menangani tombol `Masuk` dan `Keluar` barang dengan menyuntikkan *Service* dan *FormRequest* canggih dari fase sebelumnya.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Inventory/Controllers`.
- [ ] 4 berkas Controller diciptakan secara independen (Dashboard, Office, Item, Stock).
- [ ] Menerapkan Pagination mutlak pada semua daftar (List API) sesuai Aturan *Database Rule 3.1*.
- [ ] Menyediakan *try-catch block* cerdas pada `StockController` untuk menangkap eksepsi "Stok Kosong" (Defisit) yang dilempar dari `InventoryService`.

---

## Panduan Implementasi Cerdas

Pertama, buatlah landasan *Controller*-nya:
```bash
mkdir -p backend/app/Modules/Inventory/Controllers
```

Lalu raciklah keempat fungsi pengatur lalu lintas data BKSDA ini:

### 1. Pengendali Pusat Komando (DashboardController)
**Path:** `backend/app/Modules/Inventory/Controllers/DashboardController.php`

```php
<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockTransaction;

class DashboardController extends Controller
{
    public function stats()
    {
        // 1. Menghitung Total Master Barang BKSDA
        $totalItems = Item::count();
        
        // 2. Transaksi Mutasi Bulan Ini
        $mutasiBulanIni = StockTransaction::whereMonth('created_at', now()->month)
                                        ->whereYear('created_at', now()->year)
                                        ->count();

        // 3. Peringatan Krisis! Cari barang yang stok gabungannya (di semua kantor) jatuh di bawah batas minimum (min_stock)
        // [Advanced Query]
        $lowStocks = Item::withSum('stocks as total_fisik', 'quantity')
            ->having('total_fisik', '<', \DB::raw('min_stock')) // Menggunakan Raw Query pembanding
            ->orHavingNull('total_fisik') // Atau yang belum pernah diisi stoknya
            ->take(5)
            ->get();

        return response()->json([
            'message' => 'Statistik Dashboard Logistik berhasil ditarik.',
            'data' => [
                'total_items' => $totalItems,
                'mutasi_bulan_ini' => $mutasiBulanIni,
                'krisis_stok' => $lowStocks
            ]
        ]);
    }
}
```

### 2. Pengelola Master Data Kantor (OfficeController)
**Path:** `backend/app/Modules/Inventory/Controllers/OfficeController.php`

```php
<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Office;
use App\Modules\Inventory\Requests\StoreOfficeRequest;

class OfficeController extends Controller
{
    public function index()
    {
        // Pagination Wajib (Rule 3.1) + Menggabungkan Relasi Penanggung Jawab (Lompat Modul)
        $offices = Office::with('penanggungJawab:id,nama_lengkap,nip')
                         ->orderBy('created_at', 'desc')
                         ->paginate(15);
                         
        return response()->json($offices);
    }

    public function store(StoreOfficeRequest $request)
    {
        // Aman dari hacker karena sudah difilter StoreOfficeRequest
        $office = Office::create($request->validated());

        return response()->json([
            'message' => 'Kantor penyimpanan baru sukses dibentuk.',
            'data' => $office
        ], 201);
    }
}
```

### 3. Pengelola Katalog Barang (ItemController)
**Path:** `backend/app/Modules/Inventory/Controllers/ItemController.php`

```php
<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Models\Item;
use App\Modules\Inventory\Requests\StoreItemRequest;

class ItemController extends Controller
{
    public function index()
    {
        $items = Item::with('category:id,nama_kategori')
                     ->orderBy('nama_barang', 'asc')
                     ->paginate(20);
                     
        return response()->json($items);
    }

    public function store(StoreItemRequest $request)
    {
        $item = Item::create($request->validated());

        return response()->json([
            'message' => 'Barang logistik baru sukses ditambahkan ke katalog.',
            'data' => $item
        ], 201);
    }
}
```

### 4. Mesin Utama Mutasi Fisik (StockController)
**Path:** `backend/app/Modules/Inventory/Controllers/StockController.php`

```php
<?php

namespace App\Modules\Inventory\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Services\InventoryService;
use App\Modules\Inventory\Requests\StockInRequest;
use App\Modules\Inventory\Requests\StockOutRequest;
use Exception;

class StockController extends Controller
{
    // Dependency Injection: Laravel akan secara otomatis menyuntikkan InventoryService ke dalam Konstruktor ini
    protected $service;

    public function __construct(InventoryService $service)
    {
        $this->service = $service;
    }

    /**
     * EKSEKUSI STOK MASUK (Belanja / Pengadaan)
     */
    public function stockIn(StockInRequest $request)
    {
        try {
            $data = $request->validated();
            $data['user_id'] = auth()->id(); // Mengunci ID Admin yang menyetujui mutasi
            
            // Melempar algoritma rumitnya ke Service
            $transaction = $this->service->stockIn($data);
            
            return response()->json([
                'message' => 'Logistik berhasil dimasukkan ke dalam Gudang/Kantor.',
                'data' => $transaction
            ], 201);
            
        } catch (Exception $e) {
            return response()->json([
                'error' => 'Gagal Mutasi Masuk',
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
     * EKSEKUSI STOK KELUAR (Permintaan Pegawai / Habis Pakai)
     */
    public function stockOut(StockOutRequest $request)
    {
        try {
            $data = $request->validated();
            $data['user_id'] = auth()->id(); // Admin yang bertugas
            
            // Melempar algoritma pencegahan stok minus ke Service
            $transaction = $this->service->stockOut($data);
            
            return response()->json([
                'message' => 'Logistik berhasil didistribusikan kepada Pegawai.',
                'data' => $transaction
            ], 201);
            
        } catch (Exception $e) {
            // Ini akan menangkap Peringatan "Stok Tidak Mencukupi" dari Service (Issue 049)
            return response()->json([
                'error' => 'Saldo Defisit / Stok Kurang',
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
```

---

## Troubleshooting

### Q: Tombol Pengeluaran Barang (Stock Out) terus-menerus gagal dan mengeluarkan status *400 Bad Request*.

**Artinya:** Kode *Try-Catch* menangkap ledakan (Exception) dari *InventoryService*.
**Solusi:** Periksa `message` pada respon JSON tersebut. Sistem secara cerdas akan memberitahumu jika barang yang ingin dikeluarkan ternyata melampaui jumlah sisa di fisik kantor (`Stok tidak mencukupi! Sisa di kantor ini hanya X`). 

### Q: Fungsi Raw Query `having` di *DashboardController* menghasilkan *Error SQL Sintaks*.

**Artinya:** PostgreSQL (yang digunakan BKSDA SuperApp) lebih sensitif terhadap Raw Query ketimbang MySQL/MariaDB biasa.
**Solusi:** Di PostgreSQL, kamu tidak boleh menggunakan nama alias (*total_fisik*) langsung di klausa `having` jika hal tersebut adalah hasil agregat sum yang belum diakui secara eksplisit oleh `GROUP BY` *Strict Mode*. Jika error ini terjadi di lokasimu, hapus blok Raw Query tersebut dan ganti menggunakan *Collection Map Filter* biasa (Kalkulasi di level PHP memori), misal: `$lowStocks = Item::withSum('stocks', 'quantity')->get()->filter(fn($q) => $q->stocks_sum_quantity < $q->min_stock);`

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): decoupled domain controllers for logistics ecosystem" \
  --body "Mencegah penumpukan kode pada *God Object* dengan mendistribusikan muatan lalu lintas data Logistik kepada 4 Pengendali spesifik (*Dashboard, Offices, Items, Stocks*). Detail di docs/issues/051-backend-inventory-controllers.md" \
  --label "backend,controllers,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/051-backend-inventory-controllers
```

### Step 3: Kerjakan

Ciptakan keempat berkas Pengendali tersebut secara berhati-hati. Cermati penempatan kelas impor `use ...` (Namespace Modul) agar PHP tidak kebingungan.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(inventory): decoupled domain controllers for logistics ecosystem (#51)"
git push -u origin issue/051-backend-inventory-controllers
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): decoupled domain controllers for logistics ecosystem (#51)" \
  --body "## Summary
Mensuplai lapisan muara pendaratan (*Endpoints Layer*) bagi API BKSDA melalui empat gardu kendali yang sangat rapi.

## Changes
- Penciptaan \`DashboardController\` (Stats Lanjutan PostgreSQL).
- Penciptaan \`OfficeController\` dan \`ItemController\` untuk Master Data (dilengkapi *Pagination* otomatis).
- Penciptaan \`StockController\` yang mengeksekusi \`Dependency Injection\` menuju mesin \`InventoryService\`.

## Verification
- [x] Lolos pemenuhan Aturan 3.1: Pelarangan \`Model::all()\` melalui injeksi klausa \`paginate()\`.
- [x] Respon tertata seragam: \`{ message, data }\` beserta Kode HTTP yang akurat (200 / 201 / 400).

Closes #51" \
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
Modul Logistik BKSDA telah bersenjatakan Validation berlapis (Issue 050) dan Engine Anti-Minus (Issue 049). Saatnya menghubungkan keahlian mereka berdua melalui penempatan cerdas di dalam lapisan *Controller*.

## Task

Kerjakan Issue #051 (Backend — Inventory Controllers).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/051-backend-inventory-controllers.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Ciptakan Folder `backend/app/Modules/Inventory/Controllers`.
3. Pasang 4 jenis *Controller* yang mendistribusikan lalu lintas secara terpisah (Dashboard, Office, Item, Stock) di sana.
4. Gunakan `Dependency Injection` pada `StockController` untuk menyuntikkan class `InventoryService`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
