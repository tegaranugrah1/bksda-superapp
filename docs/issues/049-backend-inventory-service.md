# Issue #049 — Backend — InventoryService (Jantung Logika Bisnis Logistik)

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-inventory`
> **Priority**: 🔴 Critical (Menangani algoritma sensitif mutasi stok gudang BKSDA)
> **Complexity**: 🔴 High (Melibatkan Database Transactions & Concurrency)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #047

---

## Branch

```
issue/049-backend-inventory-service
```

## Deskripsi

Dalam prinsip *Clean Code* dan *Solid Principles*, *Controller* **tidak boleh** menampung perhitungan matematis kompleks, melainkan hanya bertugas menerima permintaan (Request) dan mengembalikan balasan (Response).

Semua perhitungan penambahan stok (*Stock In*), pengurangan stok karena pemakaian (*Stock Out*), hingga pengecekan ketersediaan saldo, harus didelegasikan ke dalam kelas khusus yang disebut **Service Class**.

Pada **Issue #049** ini, kita akan merakit otak utama dari Modul Logistik: `InventoryService.php`.

Fitur Utama:
1. **DB Transaction (Atomicity)**: Proses menambah persediaan fisik dan mencatat buku kas (Log) dilakukan dalam 1 paket kedap udara. Jika salah satu gagal, seluruh transaksi batal (*Rollback*). Ini mencegah selisih/kebocoran data.
2. **Validasi Defisit (Stock Out)**: Algoritma cerdas yang akan memblokir sistem dan melemparkan peringatan error jika ada Pegawai yang meminta pena sebanyak 10 buah, padahal stok di Kantor tinggal 5 buah.
3. **Pencatatan Jejak Presisi**: Menyuntikkan jumlah sisa (`remaining_stock`) saat itu juga ke dalam tabel `inv_stock_transactions` sebagai pelindung Audit BPK (*Badan Pemeriksa Keuangan*).

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Inventory/Services`.
- [ ] File `InventoryService.php` memuat fungsi canggih `stockIn()` untuk mutasi masuk.
- [ ] File tersebut memuat fungsi kritis `stockOut()` untuk mutasi keluar dengan validasi "Sisa Saldo Tidak Cukup".
- [ ] Kedua fungsi wajib membungkus serangkaian prosesnya di dalam palung pelindung `DB::transaction`.

---

## Panduan Implementasi Cerdas

Buatlah wadah penyimpanan *Service* jika belum ada:
```bash
mkdir -p backend/app/Modules/Inventory/Services
```

**Path:** `backend/app/Modules/Inventory/Services/InventoryService.php`

Pahat kodingan tingkat lanjut (*Advanced Business Logic*) di bawah ini secara saksama:

```php
<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Models\InventoryStock;
use App\Modules\Inventory\Models\StockTransaction;
use App\Modules\Inventory\Models\Item;
use Illuminate\Support\Facades\DB;
use Exception;

class InventoryService
{
    /**
     * FUNGSI 1: MUTASI MASUK (STOCK IN)
     * Saat Instansi melakukan pengadaan / belanja barang baru.
     */
    public function stockIn(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Cari Kartu Stok di Kantor tersebut, atau buat baru jika belum ada barangnya sama sekali
            $stock = InventoryStock::firstOrCreate(
                [
                    'office_id' => $data['office_id'],
                    'item_id' => $data['item_id'],
                ],
                [
                    'quantity' => 0 // Inisiasi jumlah 0 jika ini barang baru datang
                ]
            );

            // 2. Tambahkan fisik barang
            $stock->quantity += $data['quantity'];
            $stock->save();

            // 3. Catat di Buku Kas Mutasi Logistik (Anti-Korupsi)
            $transaction = StockTransaction::create([
                'office_id' => $data['office_id'],
                'item_id' => $data['item_id'],
                'type' => 'in',
                'quantity' => $data['quantity'],
                'remaining_stock' => $stock->quantity, // Ambil saldo ter-Update
                'keterangan' => $data['keterangan'] ?? null,
                'user_id' => $data['user_id'], // Admin yang bertugas
                'employee_id' => null, // Mutasi masuk tidak melibatkan peminta/pegawai
            ]);

            return $transaction;
        });
    }

    /**
     * FUNGSI 2: MUTASI KELUAR (STOCK OUT)
     * Saat Pegawai meminta jatah barang ke admin persediaan kantor.
     */
    public function stockOut(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Kunci Baris Tabel (Pessimistic Locking) agar tidak terjadi bentrok jika diakses bersamaan
            $stock = InventoryStock::where('office_id', $data['office_id'])
                                   ->where('item_id', $data['item_id'])
                                   ->lockForUpdate() // Cegah Race Condition
                                   ->first();

            // 2. Cek Eksistensi: Apakah barang tersebut memang ada di Kantor ini?
            if (!$stock) {
                throw new Exception("Barang tidak ditemukan di Kantor/Penyimpanan yang dipilih.");
            }

            // 3. Validasi Defisit: Apakah saldo cukup untuk dikeluarkan?
            if ($stock->quantity < $data['quantity']) {
                $item = Item::find($data['item_id']);
                throw new Exception("Stok tidak mencukupi! Sisa '{$item->nama_barang}' di kantor ini hanya {$stock->quantity} {$item->satuan}.");
            }

            // 4. Kurangi fisik barang
            $stock->quantity -= $data['quantity'];
            $stock->save();

            // 5. Catat di Buku Kas Mutasi Logistik
            $transaction = StockTransaction::create([
                'office_id' => $data['office_id'],
                'item_id' => $data['item_id'],
                'type' => 'out',
                'quantity' => $data['quantity'],
                'remaining_stock' => $stock->quantity, // Ambil saldo yang baru saja merosot
                'keterangan' => $data['keterangan'] ?? null,
                'user_id' => $data['user_id'], // Admin yang menyerahkan barang
                'employee_id' => $data['employee_id'], // WAJIB: Siapa pegawai BKSDA yang mengambilnya
            ]);

            return $transaction;
        });
    }
}
```

---

## Troubleshooting

### Q: Apa maksud dari fungsi ajaib `lockForUpdate()`?

**Artinya:** Perlindungan Level Tinggi (Concurrency Protection).
**Solusi:** Bayangkan ada sisa 1 unit Printer di Kantor Pusat. Admin A dan Admin B me-klik tombol "Berikan ke Pegawai" secara **bersamaan di detik yang persis sama**. Tanpa fungsi ini, sistem bisa tertipu menganggap keduanya berhak mengurangi, menjadikan stok `Minus 1` (-1).
Dengan `lockForUpdate()`, *Database Postgres* akan menahan permintaan Admin B, menunggu permintaan Admin A selesai dieksekusi secara utuh, barulah memproses Admin B (yang akhirnya akan terlempar peringatan *Error* bahwa stok sudah habis). Ini adalah *Best Practice Master Level*.

### Q: Error "Class Exception not found".

**Artinya:** Gagal merujuk pada basis Exception bawaan PHP.
**Solusi:** Pastikan `use Exception;` tidak dihilangkan secara tidak sengaja di atas baris `class InventoryService`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): business logic service and pessimistic locking mechanisms" \
  --body "Merancang kelas otak (Service) yang menangani atomisitas aliran keluar-masuk barang, dilindungi oleh DB Transactions dan perlindungan defisit. Detail di docs/issues/049-backend-inventory-service.md" \
  --label "backend,architecture,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/049-backend-inventory-service
```

### Step 3: Kerjakan

Salin `InventoryService.php` utuh ke dalam hierarki modular sistem kita.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(inventory): business logic service and pessimistic locking mechanisms (#49)"
git push -u origin issue/049-backend-inventory-service
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): business logic service and pessimistic locking mechanisms (#49)" \
  --body "## Summary
Memisahkan logika matematika *Stock Tracking* yang kompleks dari Controller ke *Service Layer*, menciptakan ekosistem kode yang bisa dirawat (*Maintainable*).

## Changes
- Penciptaan \`InventoryService\` yang mengemas \`stockIn\` dan \`stockOut\`.
- Penerapan \`DB::transaction\` guna mengunci kesucian *Query* hingga selesai tereksekusi paripurna.
- Pemasangan protokol \`firstOrCreate\` untuk menumbuhkan Kartu Stok fisik secara instan bilamana kosong.

## Verification
- [x] Lolos pencegahan *Race Condition* menggunakan \`lockForUpdate()\` tingkat database.
- [x] Algoritma pembatasan penarikan berfungsi melempar Eksepsi / Pencegahan Saldo Negatif.

Closes #49" \
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
Modul Logistik BKSDA membutuhkan pengatur gerak saldo (*Stock Controller Engine*) yang terpusat di ranah Service agar bersih dan tidak mengotori file Route maupun Web Controller.

## Task

Kerjakan Issue #049 (Backend — InventoryService).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/049-backend-inventory-service.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat direktori wadah `backend/app/Modules/Inventory/Services`.
3. Buat file `InventoryService.php` dan tuangkan algoritma Anti-Minus dan Anti-Duplicate (Pessimistic Locking) persis seperti pada petunjuk *Markdown*.
4. Pastikan `namespace` diarahkan menuju struktur Modular Laravel, bukan struktur bawaan.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
