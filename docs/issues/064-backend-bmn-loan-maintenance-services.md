# Issue #064 — Backend — Loan & Maintenance Service (Lalu Lintas Aset)

> **Type**: `feature`
> **Labels**: `backend`, `architecture`, `module-bmn`
> **Priority**: 🔴 Critical (Tata Kelola Peminjaman & Pemeliharaan Aset)
> **Complexity**: 🟡 Medium (Sinkronisasi Silang Antar Tabel BMN)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #061, Issue #063

---

## Branch

```
issue/064-backend-bmn-loan-maintenance-services
```

## Deskripsi

Sebuah mobil dinas BKSDA tidak pernah diam di garasi. Ia dipinjam oleh Pegawai, rusak, masuk bengkel, diperbaiki, lalu dikembalikan. 

Pada **Issue #064** ini, kita membangun dua agen pengatur lalu lintas aset tersebut:
1. **`LoanService`**: Mengatur proses Pinjam (Borrow) dan Kembali (Return). Cerdasnya layanan ini adalah kemampuannya menolak meminjamkan barang yang *sedang* dipegang orang lain. Saat barang dipinjam, *Service* ini akan mengubah identitas sang pemegang (`employee_id`) di tabel induk `bmn_assets` secara otomatis!
2. **`MaintenanceService`**: Mengatur pencatatan servis (Pemeliharaan). Saat mobil turun mesin, nota perbaikan dan total harga akan dicatat di sini.

Kedua kelas ini **WAJIB** dikerjakan di dalam bungkus `DB::transaction`. Jika proses pengembalian barang sukses di tabel peminjaman tapi gagal saat menghapus nama pemegang di tabel Induk Aset, maka seluruh aksinya harus dibatalkan seketika!

---

## Acceptance Criteria

- [ ] Kelas `backend/app/Modules/Bmn/Services/LoanService.php` diciptakan dengan sempurna.
- [ ] Tersedia fungsi `borrowAsset()` yang dapat menolak *(Throw Exception)* jika Aset masih di tangan pegawai lain.
- [ ] Tersedia fungsi `returnAsset()` yang sanggup mencabut ikatan nama Pegawai dari tabel Induk Aset menjadi *NULL*.
- [ ] Kelas `backend/app/Modules/Bmn/Services/MaintenanceService.php` diciptakan.

---

## Panduan Implementasi Cerdas

Keduanya berada di folder yang sama dengan *AssetService* (Issue 063).

### 1. Sistem Kepemilikan Sementara (LoanService.php)
**Path:** `backend/app/Modules/Bmn/Services/LoanService.php`

```php
<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use Illuminate\Support\Facades\DB;
use Exception;

class LoanService
{
    /**
     * PROSES 1: Pegawai Mengajukan Peminjaman Aset (Contoh: Laptop)
     */
    public function borrowAsset(string $assetId, string $employeeId, array $data)
    {
        return DB::transaction(function () use ($assetId, $employeeId, $data) {
            // Pessimistic Locking: Kunci aset ini, jangan sampai 2 admin menekan tombol "Pinjamkan" di milidetik yang sama
            $asset = Asset::lockForUpdate()->findOrFail($assetId);
            
            // Validasi Kunci: Apakah laptop ini masih dibawa orang lain?
            if ($asset->employee_id !== null) {
                throw new Exception('Sistem menolak! Aset ini masih tercatat di bawah tanggung jawab pegawai lain.');
            }

            // 1. Buat Bukti Peminjaman
            $loan = AssetLoan::create([
                'asset_id' => $asset->id,
                'employee_id' => $employeeId,
                'tanggal_pinjam' => $data['tanggal_pinjam'] ?? now()->toDateString(),
                'status' => 'dipinjam',
                'keterangan' => $data['keterangan'] ?? null,
            ]);

            // 2. Modifikasi Induk Aset (Ganti nama pemegangnya!)
            $asset->update(['employee_id' => $employeeId]);

            return $loan;
        });
    }

    /**
     * PROSES 2: Pegawai Mengembalikan Aset
     */
    public function returnAsset(string $loanId, array $data = [])
    {
        return DB::transaction(function () use ($loanId, $data) {
            // Kunci Transaksi Peminjaman ini
            $loan = AssetLoan::lockForUpdate()->findOrFail($loanId);
            
            if ($loan->status === 'dikembalikan') {
                throw new Exception('Buku catatan sudah ditutup. Aset ini sudah lama dikembalikan.');
            }

            // 1. Tutup Buku Peminjaman
            $loan->update([
                'status' => 'dikembalikan',
                'tanggal_kembali' => $data['tanggal_kembali'] ?? now()->toDateString(),
                'keterangan' => ($loan->keterangan ? $loan->keterangan . ' | ' : '') . ($data['catatan_pengembalian'] ?? 'Telah dikembalikan.'),
            ]);

            // 2. Cabut nama Pegawai dari Induk Aset (Kirim aset kembali ke gudang / NULL)
            $asset = Asset::findOrFail($loan->asset_id);
            $asset->update(['employee_id' => null]);

            return $loan;
        });
    }
}
```

### 2. Buku Servis Aset Negara (MaintenanceService.php)
**Path:** `backend/app/Modules/Bmn/Services/MaintenanceService.php`

```php
<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetMaintenance;
use Illuminate\Support\Facades\DB;

class MaintenanceService
{
    /**
     * PROSES 1: Merekam Jasa Perbaikan / Servis
     */
    public function recordMaintenance(string $assetId, array $data)
    {
        return DB::transaction(function () use ($assetId, $data) {
            // Pastikan asetnya memang ada di database kita
            $asset = Asset::findOrFail($assetId);

            // 1. Cetak Nota Servis
            $maintenance = AssetMaintenance::create([
                'asset_id' => $asset->id,
                'tanggal_service' => $data['tanggal_service'],
                'biaya' => $data['biaya'] ?? 0,
                'deskripsi' => $data['deskripsi'],
                'bukti_nota_url' => $data['bukti_nota_url'] ?? null,
            ]);

            // [OPSIONAL/PINTAR]: Jika servis ini membuat "Rusak Berat" menjadi "Baik", ubah kondisi fisik asetnya!
            if (isset($data['kondisi_baru']) && $asset->kondisi !== $data['kondisi_baru']) {
                // Catatan: Pemanggilan update ini idealnya ditangkap oleh Intelijen Audit di AssetService,
                // Namun untuk MVP, ini cukup untuk mengubah fisiknya.
                $asset->update(['kondisi' => $data['kondisi_baru']]);
            }

            return $maintenance;
        });
    }
}
```

---

## Troubleshooting

### Q: Kenapa *LoanService* melemparkan `Exception` biasa, bukan me- *return* respon HTTP 400?

**Artinya:** Pemisahan Ranah Wewenang (*Separation of Concerns*).
**Solusi:** Sebuah *Service* adalah komponen otak buta yang tidak tahu menahu tentang peramban web (*Browser*), JSON, atau HTTP Code. Ia murni bekerja memikirkan logika dan matematika. Adalah tugas *Controller* (yang akan kita bangun di Issue mendatang) untuk memanggil fungsi *borrowAsset* ini dengan blok `try...catch` lalu menerjemahkan `Exception` tersebut menjadi balasan *JSON 400 Bad Request* ke peramban pengguna.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): instantiating asset mobility and maintenance tracking service layer" \
  --body "Merancang arsitektur pengendali lalu lintas Barang Milik Negara (Peminjaman & Pemeliharaan). Mensinkronkan peralihan kepemilikan aset secara real-time pada tabel \`bmn_assets\` berbekal \`Pessimistic Locking\`. Detail di docs/issues/064-backend-bmn-loan-maintenance-services.md" \
  --label "backend,architecture,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/064-backend-bmn-loan-maintenance-services
```

### Step 3: Kerjakan

Cetak dua file pilar intelektual tersebut (`LoanService.php` dan `MaintenanceService.php`) di dalam wadah rahasia `backend/app/Modules/Bmn/Services`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): instantiating asset mobility and maintenance tracking service layer (#64)"
git push -u origin issue/064-backend-bmn-loan-maintenance-services
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): instantiating asset mobility and maintenance tracking service layer (#64)" \
  --body "## Summary
Pembangkitan algoritma pengawal sirkulasi Aset Negara (Peminjaman Pegawai) serta pengawasan Buku Riwayat Pemeliharaan.

## Changes
- Penciptaan \`LoanService\` dengan kapabilitas integrasi lintas-tabel cerdas. Ia mampu secara otonom memanipulasi kolom \`employee_id\` pada \`Asset\` saat peminjaman aktif.
- Pemasangan \`Pessimistic Locking\` pada proses \`borrowAsset()\` demi mencegah insiden aset "Terpinjam Dua Kali" oleh *Race Conditions*.
- Perumusan \`MaintenanceService\` yang merekam injeksi biaya servis BMN secara presisi.

## Rules Compliance
- [x] Lolos doktrin isolasi sistemik (*Transaction Consistency*): Pemisahan penuh antara logika transaksi Database yang ketat dengan logika antar-muka *Controller*.

Closes #64" \
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
Modul BMN sisi Backend baru saja mengantongi `AssetService` sebagai pengatur pencatatan. Namun, aset harus bisa diedarkan *(Pinjam/Kembali)* dan dirawat *(Maintenance)*. Ini membutuhkan kelas kecerdasan *Service* yang spesifik!

## Task

Kerjakan Issue #064 (Backend — LoanService + MaintenanceService).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/064-backend-bmn-loan-maintenance-services.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke folder `backend/app/Modules/Bmn/Services`.
3. Pahat `LoanService.php` dengan merangkul blok perlindungan Ganda (`DB::transaction` dan `lockForUpdate()`).
4. Pahat `MaintenanceService.php` sesuai cetak birunya.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
