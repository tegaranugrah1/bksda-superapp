# Issue #050 — Backend — Inventory FormRequests (Keamanan Input Logistik)

> **Type**: `feature`
> **Labels**: `backend`, `security`, `module-inventory`
> **Priority**: 🔴 Critical (Garda Depan Pencegahan Serangan dan Data Sampah)
> **Complexity**: 🟡 Medium (Deklarasi 4 Berkas Validasi Ketat)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #047, Issue #049

---

## Branch

```
issue/050-backend-inventory-requests
```

## Deskripsi

Jika **InventoryService** (Issue 049) adalah Jantung Pemrosesan, maka **FormRequests** ini adalah *Pintu Gerbang Utama* (Satpam). Berdasarkan **Project Rule 1.4**, kita dilarang keras menelan mentah-mentah data dari pengguna (seperti `$request->all()`) tanpa melalui tahapan sanitasi dan validasi.

Pada Issue ini, kita akan merakit 4 *Form Request Validation* untuk memastikan data yang dikirimkan oleh Aplikasi (React) memiliki format yang tepat, berwujud UUID asli, serta mencegah *bug* dengan memblokir transaksi yang mengandung jumlah Minus/Negatif (-1).

Keempat kelas validasi tersebut adalah:
1. `StoreOfficeRequest` (Validasi pendirian Kantor baru).
2. `StoreItemRequest` (Validasi penambahan Master Data Barang).
3. `StockInRequest` (Validasi form Mutasi Masuk stok logistik).
4. `StockOutRequest` (Validasi form Pengeluaran logistik untuk pegawai).

---

## Acceptance Criteria

- [ ] Folder Modul keamanan input diciptakan: `backend/app/Modules/Inventory/Requests`.
- [ ] Masing-masing dari ke-4 file di atas diciptakan dan *namespace*-nya disesuaikan.
- [ ] Fungsi `authorize()` di semua file diubah agar mengembalikan nilai `true` (karena Otorisasi Hak Akses sudah diurus oleh Middleware di Issue 048).
- [ ] Menerapkan pengecekan basis data lintas tabel (`exists:nama_tabel,id`) untuk UUID yang dikirim.
- [ ] Menerapkan `min:1` pada jumlah kuantitas stok untuk memblokir angka minus maupun nol.

---

## Panduan Implementasi Cerdas

Pertama, buatlah folder tempat berkas keamanan ini bernaung:
```bash
mkdir -p backend/app/Modules/Inventory/Requests
```

Salinlah 4 algoritma pelindung ini ke dalam lokasinya masing-masing.

### 1. Pembangun Kantor (StoreOfficeRequest)
**Path:** `backend/app/Modules/Inventory/Requests/StoreOfficeRequest.php`

```php
<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOfficeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nama_kantor' => ['required', 'string', 'max:255'],
            'lokasi' => ['nullable', 'string', 'max:255'],
            // Menembus modul Kepegawaian untuk validasi identitas Kepala Kantor
            'penanggung_jawab_id' => ['nullable', 'uuid', 'exists:kpg_employees,id'],
        ];
    }
}
```

### 2. Penambahan Barang Baru (StoreItemRequest)
**Path:** `backend/app/Modules/Inventory/Requests/StoreItemRequest.php`

```php
<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Jika request memiliki ID (sedang proses EDIT), lewati pengecekan unique untuk ID dirinya sendiri.
        $itemId = $this->route('item'); // Anggap nama parameternya 'item' di Route nanti

        return [
            'category_id' => ['required', 'uuid', 'exists:inv_categories,id'],
            'kode_barang' => ['required', 'string', 'max:100', 'unique:inv_items,kode_barang,' . $itemId],
            'nama_barang' => ['required', 'string', 'max:255'],
            'satuan' => ['required', 'string', 'max:50'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
```

### 3. Masuknya Persediaan Barang (StockInRequest)
**Path:** `backend/app/Modules/Inventory/Requests/StockInRequest.php`

```php
<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Memastikan Kantor & Barang yang dimaksud BENAR-BENAR ADA di sistem!
            'office_id' => ['required', 'uuid', 'exists:inv_offices,id'],
            'item_id' => ['required', 'uuid', 'exists:inv_items,id'],
            
            // Menggembok kemungkinan Hacker mengirim nilai negatif, misal: -100
            'quantity' => ['required', 'integer', 'min:1'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
```

### 4. Pengeluaran Jatah Pegawai (StockOutRequest)
**Path:** `backend/app/Modules/Inventory/Requests/StockOutRequest.php`

```php
<?php

namespace App\Modules\Inventory\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockOutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'office_id' => ['required', 'uuid', 'exists:inv_offices,id'],
            'item_id' => ['required', 'uuid', 'exists:inv_items,id'],
            
            // WAJIB: Mencatat identitas Pegawai Peminta Barang (Cross-Module ke Kepegawaian)
            'employee_id' => ['required', 'uuid', 'exists:kpg_employees,id'],
            
            'quantity' => ['required', 'integer', 'min:1'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.required' => 'Wajib memilih siapa Pegawai BKSDA yang mengambil barang ini!',
            'employee_id.exists' => 'Data Pegawai tidak ditemukan di dalam sistem BKSDA.'
        ];
    }
}
```

---

## Troubleshooting

### Q: Kenapa repot-repot mengecek `exists:nama_tabel` jika di *Frontend Dropdown* sudah disediakan pilihannya?

**Artinya:** Anda mempertanyakan keamanan level Lapis Dua (*Backend*).
**Solusi:** Sangat terlarang bagi seorang Pemrogram untuk sekadar mempercayai data dari *Frontend*. *Frontend* bisa dengan mudah dijebol via *Postman* atau dikirimkan *UUID* acak secara manual. Klausul `exists` memastikan bahwa *Database* kita tidak disusupi ID gadungan yang akan memicu bentrokan integritas (*500 Internal Server Error / Foreign Key Constraint Failed*).

### Q: Saya mendapat pesan bahwa Class FormRequest tidak ditemukan oleh Editor.

**Artinya:** Terkadang perintah pembuatan manual (*Copy-Paste*) tidak dikenali seketika.
**Solusi:** Ketikkan perintah perbaikan ini: `composer dump-autoload` untuk merapikan indeks sistem (*Autoloader*) milik Laravel.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): secure validation layer for logistics master data and stock mutation" \
  --body "Menyuntikkan FormRequests untuk memastikan ketepatan UUID Cross-Module dan menyaring injeksi nilai kuantitas negatif pada ranah Logistik. Detail di docs/issues/050-backend-inventory-requests.md" \
  --label "backend,security,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/050-backend-inventory-requests
```

### Step 3: Kerjakan

Tuangkan keempat file yang ada di panduan ini secara presisi ke dalam wadahnya masing-masing.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(inventory): secure validation layer for logistics master data and stock mutation (#50)"
git push -u origin issue/050-backend-inventory-requests
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): secure validation layer for logistics master data and stock mutation (#50)" \
  --body "## Summary
Pembangungan Pintu Gerbang lapis dua yang mencegat data tidak masuk akal (Tipe, Range, Keberadaan UUID) sebelum sempat menyentuh logika \`InventoryService\`.

## Changes
- Instalasi \`StoreOfficeRequest\` & \`StoreItemRequest\` untuk Master Data.
- Pemasangan \`StockInRequest\` & \`StockOutRequest\` untuk sirkulasi Saldo Logistik.
- Pembuatan pengalihan logika \`unique\` pada saat Modus *Edit Barang* berlangsung.

## Rules Compliance
- [x] Sesuai dengan Peraturan 1.4: Sanitasi terpusat pada FormRequest, menyisakan Controller bersih dari kerumitan validasi if-else.
- [x] Lolos integrasi cek *Foreign Key Exists* menuju \`kpg_employees\`.

Closes #50" \
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
Modul Logistik BKSDA telah siap pada tingkat Algoritma Service-nya. Namun kita wajib memasang saringan Data Input via Laravel FormRequests agar *Server* kita tidak dirusak oleh nilai aneh (Misal: Stok Minus -500).

## Task

Kerjakan Issue #050 (Backend — Inventory FormRequests).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/050-backend-inventory-requests.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Ciptakan Folder `backend/app/Modules/Inventory/Requests`
3. Susunlah ke-4 berkas pelindung (*FormRequests*): StoreOfficeRequest, StoreItemRequest, StockInRequest, dan StockOutRequest.
4. Pastikan barisan validasi mengikat kuat pada fitur lintas tabel (`exists:tabel,id`) ke entitas Master Data dan Pegawai.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
