# Desain Arsitektur & Teknis (System Design): Alokasi Rekening Bank Modular, Sanitasi Kontak, & Navigasi Pegawai

**Modul**: Kepegawaian & Pengaturan Uang Makan  
**Versi**: 1.0.0  
**Tanggal**: 3 November 2026  
**Status**: Architecture Design Document  

---

## 1. Arsitektur Komponen & Alur Data

Modul Alokasi Rekening Bank dan Pengelolaan Profil Pegawai menghubungkan tiga lapisan sistem:

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (Next.js 16 + React 19)"]
        SettingsPage["/kepegawaian/settings\n(MealAllowanceHolidaysTab)"]
        EmployeeDetailPage["/kepegawaian/employees/[id]\n(Employee Detail & Bio Edit)"]
        BankThemes["bank-themes.ts\n(Pure CSS Badge Styling)"]
        PaginationEngine["In-Memory Pagination\n(slice, page pills, batch selection)"]
    end

    subgraph Backend ["Backend (Laravel 11 + Sanctum)"]
        MealAllowanceCtrl["MealAllowanceController\n(registeredBanks, batchUpdate)"]
        EmployeeCtrl["EmployeeController\n(show, update, uploadPhoto)"]
        EmpRequest["EmployeeRequest\n(Sanitize '-' to null)"]
    end

    subgraph Database ["Database (PostgreSQL 16)"]
        TableBanks[("kpg_registered_banks\n(id, nama_bank, timestamps)")]
        TableEmployees[("kpg_employees\n(id, nama_lengkap, nama_bank, telepon, ...)")]
        TableHistories[("kpg_employee_histories\n(Audit trail perubahan data)")]
    end

    SettingsPage -->|GET /registered-banks| MealAllowanceCtrl
    SettingsPage -->|POST/DELETE bank| MealAllowanceCtrl
    SettingsPage -->|PUT /employee-banks/batch| MealAllowanceCtrl
    EmployeeDetailPage -->|GET /registered-banks| MealAllowanceCtrl
    EmployeeDetailPage -->|PUT /employees/[id]| EmployeeCtrl

    MealAllowanceCtrl --> TableBanks
    MealAllowanceCtrl --> TableEmployees
    EmployeeCtrl --> EmpRequest
    EmpRequest --> TableEmployees
    EmployeeCtrl --> TableHistories
```

---

## 2. Skema Basis Data (Database Schema)

### 2.1. Tabel `kpg_registered_banks`
Tabel master untuk menyimpan opsi bank yang didaftarkan secara modular oleh admin instansi:

```sql
CREATE TABLE kpg_registered_banks (
    id BIGSERIAL PRIMARY KEY,
    nama_bank VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- Index otomatis dibuat pada kolom unik nama_bank
CREATE UNIQUE INDEX kpg_registered_banks_nama_bank_unique ON kpg_registered_banks (nama_bank);
```

**Seed Default**:
1. `BRI` (Bank Rakyat Indonesia)
2. `Mandiri` (Bank Mandiri)

### 2.2. Kolom Terkait pada Tabel `kpg_employees`
```sql
ALTER TABLE kpg_employees ADD COLUMN IF NOT EXISTS nama_bank VARCHAR(50) DEFAULT 'BRI';
ALTER TABLE kpg_employees ADD COLUMN IF NOT EXISTS telepon VARCHAR(50) NULL;
ALTER TABLE kpg_employees ADD COLUMN IF NOT EXISTS nomor_rekening VARCHAR(50) NULL;
ALTER TABLE kpg_employees ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL;
```

---

## 3. Kontrak Antarmuka REST API

### 3.1. `GET /api/kepegawaian/settings/registered-banks`
Mengembalikan daftar seluruh bank terdaftar beserta jumlah pegawai aktif yang terikat pada masing-masing bank.

- **Autentikasi**: Bearer Token (Sanctum)
- **Role**: `super_admin`, `admin`, `user`
- **Response Format (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nama_bank": "BRI",
      "count": 109
    },
    {
      "id": 2,
      "nama_bank": "Mandiri",
      "count": 43
    }
  ]
}
```

### 3.2. `POST /api/kepegawaian/settings/registered-banks`
Mendaftarkan bank baru ke sistem.

- **Autentikasi**: Bearer Token (Sanctum)
- **Role**: `super_admin`, `admin`
- **Request Body**:
```json
{
  "nama_bank": "BSI"
}
```
- **Response (200 OK / 201 Created)**:
```json
{
  "success": true,
  "message": "Bank BSI berhasil didaftarkan"
}
```
- **Error Response (422 Unprocessable Content)**:
```json
{
  "success": false,
  "message": "Nama bank BSI sudah terdaftar sebelumnya"
}
```

### 3.3. `DELETE /api/kepegawaian/settings/registered-banks/{bank}`
Menghapus bank terdaftar jika sudah tidak digunakan.

- **Autentikasi**: Bearer Token (Sanctum)
- **Role**: `super_admin`, `admin`
- **Path Parameter**: `{bank}` (string nama bank)
- **Logika Pengaman**:
```php
$activeCount = Employee::where('is_active', true)
    ->whereRaw('UPPER(TRIM(nama_bank)) = ?', [strtoupper(trim($bank))])
    ->count();

if ($activeCount > 0) {
    return response()->json([
        'success' => false,
        'message' => "Bank {$bank} tidak dapat dihapus karena masih digunakan oleh {$activeCount} pegawai aktif. Pindahkan alokasi rekening mereka terlebih dahulu."
    ], 422);
}
```

### 3.4. `PUT /api/kepegawaian/settings/employee-banks/batch`
Memindahkan beberapa pegawai sekaligus ke bank baru dalam 1 transaksi.

- **Request Body**:
```json
{
  "employee_ids": [10, 15, 22],
  "nama_bank": "Mandiri"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "3 pegawai berhasil dialokasikan ke Bank Mandiri"
}
```

---

## 4. Desain Antarmuka Pengguna & Pagination

### 4.1. Algoritma Pagination In-Memory
Karena jumlah pegawai aktif BKSDA Kaltim saat ini berada pada kisaran 152 pegawai, kalkulasi pagination dilakukan secara in-memory menggunakan React `useMemo`:

```typescript
// 1. Hitung total item & total halaman
const totalItems = filteredEmployees.length;
const totalPages = perPage === "all" ? 1 : Math.max(1, Math.ceil(totalItems / Number(perPage)));
const safePage = Math.min(page, totalPages);

// 2. Potong data sesuai rentang aktif
const paginatedEmployees = useMemo(() => {
  if (perPage === "all") return filteredEmployees;
  const num = Number(perPage);
  const start = (safePage - 1) * num;
  return filteredEmployees.slice(start, start + num);
}, [filteredEmployees, safePage, perPage]);

// 3. Rentang label yang ditampilkan ke pengguna
const startItem = totalItems === 0 ? 0 : perPage === "all" ? 1 : (safePage - 1) * Number(perPage) + 1;
const endItem = perPage === "all" ? totalItems : Math.min(safePage * Number(perPage), totalItems);
```

### 4.2. Navigasi Halaman Cerdas (*Page Pills with Ellipsis*)
Jika total halaman $\le 7$, seluruh nomor halaman ditampilkan (`1 2 3 4 5 6 7`). Jika total halaman $> 7$, sistem menampilkan jendela fokus di sekitar halaman aktif dengan elipsis:
```typescript
Array.from({ length: totalPages }, (_, idx) => idx + 1)
  .filter((p) => {
    if (totalPages <= 7) return true;
    return p === 1 || p === totalPages || Math.abs(p - safePage) <= 1;
  });
```

### 4.3. Skema Pewarnaan Badge Bank Dinamis (`bank-themes.ts`)
Setiap bank memiliki token visual yang konsisten antar halaman tanpa library eksternal:
- **BRI**: `border-blue-200 bg-blue-50 text-blue-700`
- **Mandiri**: `border-indigo-200 bg-indigo-50 text-indigo-700`
- **BSI**: `border-emerald-200 bg-emerald-50 text-emerald-700`
- **Bankaltimtara**: `border-amber-200 bg-amber-50 text-amber-800`
- **BNI**: `border-teal-200 bg-teal-50 text-teal-700`
- **BCA**: `border-sky-200 bg-sky-50 text-sky-700`

---

## 5. Analisis Prinsip Senior Dev `/ponytail` & Catatan Plafon (*Ceilings*)

Sesuai filosofi `/ponytail`, arsitektur ini meminimalkan kode dengan memilih *ladder* tertinggi:

1. **Rung 1 (YAGNI)**: Tidak membuat tabel riwayat perubahan opsi bank terpisah atau tabel relasi pivot M-to-N yang kompleks. Cukup tabel master `kpg_registered_banks` dan kolom denormalized `nama_bank` di `kpg_employees`.
2. **Rung 2 (Reuse)**: Menggunakan kembali helper notifikasi `toast.success` dari `sonner` dan modal konfirmasi native tanpa menginstal plugin dialog baru.
3. **Rung 3 (Stdlib / Native)**: Slicing array native JavaScript `Array.prototype.slice()` untuk pagination tabel dan regex bawaan PHP untuk normalisasi nama.
4. **Catatan Plafon Resmi (`ponytail:` comments)**:
   - `# ponytail: in-memory pagination ceiling at ~1,000 employees; switch to server-side paginated API (?page=&per_page=) if employee roster scales beyond Balai & Resors.`
   - `# ponytail: case-insensitive uppercase matching for bank names; if multi-tenant bank branching is needed, add bank_code.`

---

## 6. Pelanggaran `/ponytail` yang Ditemukan Audit (3 Nov 2026)

Detail lengkap & test-nya ada di [test-plan.md §3.5](./test-plan.md). Ringkasnya, desain di atas dilanggar di implementasi oleh **logika duplikat yang menyimpang dari helper yang sudah ada**:

| Rung dilanggar | Lokasi | Yang seharusnya dipakai ulang |
| :--- | :--- | :--- |
| Reuse (R2, R8) | `getEmployeeBanks`, `getRegisteredBanks`, `MealAllowanceExcelExport`, `uang-makan/page.tsx` menebak PNS/PPPK dari string golongan | `Employee::scopeOfJenis` / accessor `jenis_pegawai` (sudah membedakan PNS, PPPK, MMP) |
| Reuse (R3) | `batchUpdateEmployeeBanks` raw update | Sanitasi `EmployeeRequest` + `EmployeeHistory::create` di `EmployeeController::update` |
| Reuse (R7) | `getEmployeeBanks` `like` mentah | Pola `addcslashes` + `ilike` di `EmployeeController` L66/L130 |
| Fallback yang menyembunyikan bug (R1) | `?? 'BRI'` di `storeBatch` L272, Export L78, Reconciler L211, `getEmployeeBanks` L580 | Fallback boleh di satu titik (kolom DB default `'BRI'`); di hilir justru menutupi data yang hilang |

---

## 7. Cetak Biru Spesifikasi Perbaikan Teknis (Remediation Technical Blueprint)

Sebagai sumber acuan tunggal (*single source of truth*) dalam implementasi perbaikan akar, berikut adalah spesifikasi perubahan per berkas:

### 7.1. Frontend Uang Makan — [`frontend/src/app/kepegawaian/uang-makan/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/uang-makan/page.tsx)
* **Target Fungsi**: `normalizeEmployeeItem(it: any): ReconciledEmployeeItem` (Baris 248–287)
* **Akar Masalah**: Objek yang dikembalikan memotong `nama_bank` dan `nomor_rekening`.
* **Spesifikasi Perbaikan**:
```typescript
// Tambahkan 2 baris ke return object normalizeEmployeeItem:
return {
  nip: it.nip,
  nama: it.nama_lengkap ?? it.nama ?? "",
  jabatan: it.jabatan ?? "",
  golongan: it.golongan ?? "",
  nama_bank: it.nama_bank || "BRI",       // <-- Ditambahkan
  nomor_rekening: it.nomor_rekening || "", // <-- Ditambahkan
  tarif,
  pph_rate,
  daily_matrix: daily,
  // ... field metrik kehadiran lainnya tetap utuh
};
```
* **Hasil**:
  1. `sheetCategoryStats` (L189-205) membaca `it.nama_bank` dengan benar $\rightarrow$ kartu `PNS_MNDRI` & `PPPK_MNDRI` menampilkan angka aktual.
  2. `handleSaveBatch` & `handleExportExcel` mengirim payload lengkap berisi `nama_bank` dan `nomor_rekening` ke backend $\rightarrow$ ekspor Excel menempatkan pegawai ke sheet Mandiri dan BRI secara presisi.

### 7.2. Backend Controller — [`backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php)
Empat metode pada controller ini diperbaiki untuk membasmi akar R2, R3, R4, R6, dan R7:

1. **`getEmployeeBanks(Request $request)` (L540–595)**:
   - **SQL Injection Wildcard & Case-Sensitivity (R7)**: Ganti `where('nama_lengkap', 'like', "%{$s}%")` dengan helper `addcslashes($s, '%_\\')` dan driver-aware ILIKE:
     ```php
     $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
     $escaped = addcslashes($s, '%_\\');
     $query->where(function ($q) use ($escaped, $likeOp) {
         $q->where('nama_lengkap', $likeOp, "%{$escaped}%")
           ->orWhere('nip', $likeOp, "%{$escaped}%");
     });
     ```
   - **Filter Group PNS / PPPK / MMP (R2)**: Gunakan `Employee::scopeOfJenis`:
     ```php
     if ($request->filled('group')) {
         $g = strtoupper($request->input('group'));
         if (in_array($g, ['PNS', 'PPPK', 'MMP'])) {
             $query->ofJenis($g);
         }
     }
     ```
   - **Klasifikasi Pegawai (R2)**: Gunakan accessor bawaan model `$emp->jenis_pegawai` (bukan tebakan manual string golongan):
     ```php
     'jenis_pegawai' => $emp->jenis_pegawai, // 'PNS', 'PPPK', atau 'MMP'
     ```

2. **`batchUpdateEmployeeBanks(Request $request)` (L601–643)**:
   - **Validasi Master Bank & Exists ID (R3, R4)**:
     ```php
     $validated = $request->validate([
         'employee_ids' => ['required', 'array', 'min:1'],
         'employee_ids.*' => ['required', 'integer', 'exists:kpg_employees,id'],
         'nama_bank' => ['nullable', 'string', 'max:50', 'exists:kpg_registered_banks,nama_bank'],
         'nomor_rekening' => ['nullable', 'string', 'max:50'],
         'telepon' => ['nullable', 'string', 'max:30'],
         'single_update' => ['nullable', 'boolean'],
     ]);
     ```
   - **Sanitasi Tanda Strip `"-"` (R3)**:
     ```php
     $cleanRek = isset($validated['nomor_rekening']) ? trim(strip_tags($validated['nomor_rekening'])) : null;
     if ($cleanRek === '-' || $cleanRek === '') $cleanRek = null;
     $cleanTelp = isset($validated['telepon']) ? trim(strip_tags($validated['telepon'])) : null;
     if ($cleanTelp === '-' || $cleanTelp === '') $cleanTelp = null;
     ```
   - **Audit Trail `EmployeeHistory` (R3)**: Jalankan per model dalam DB::transaction untuk mencatat riwayat perubahan:
     ```php
     DB::transaction(function () use ($ids, $updateData, $request) {
         $employees = Employee::whereIn('id', $ids)->get();
         foreach ($employees as $emp) {
             $changes = [];
             foreach ($updateData as $col => $newVal) {
                 if ($emp->{$col} !== $newVal) {
                     $changes[$col] = ['old' => $emp->{$col}, 'new' => $newVal];
                 }
             }
             if (!empty($changes)) {
                 $emp->update($updateData);
                 EmployeeHistory::create([
                     'employee_id' => $emp->id,
                     'user_id' => $request->user()?->id,
                     'action' => 'update_bank_allocation',
                     'changes' => json_encode($changes),
                     'notes' => 'Pembaruan alokasi rekening bank / kontak via Pengaturan',
                 ]);
             }
         }
     });
     ```

3. **`getRegisteredBanks()` (L649–681)**:
   - Hitungan pegawai aktif per bank diselaraskan hanya untuk pegawai ASN atau dilaporkan secara terpisah untuk kategori MMP agar tidak menggelembungkan total ASN.

4. **`storeRegisteredBank(Request $request)` (L687–729)**:
   - **Pencegahan XSS / Payload Junk (R6)**: Tambahkan validasi regex alfanumerik yang menolak tag script/HTML dengan HTTP 422:
     ```php
     $validated = $request->validate([
         'nama_bank' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9 .&\-]+$/'],
     ], [
         'nama_bank.regex' => 'Nama bank hanya boleh memuat huruf, angka, spasi, titik, ampersand (&), dan tanda hubung (-).',
     ]);
     $bankName = strtoupper(trim(strip_tags($validated['nama_bank'])));
     ```

### 7.3. Backend Request — [`backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php)
* **Target Validasi**: `rules()` (L105)
* **Spesifikasi Perbaikan**:
  ```php
  'nama_bank' => ['nullable', 'string', 'max:50', 'exists:kpg_registered_banks,nama_bank'],
  ```
  Ini mengunci bahwa form edit profil individu di `/kepegawaian/employees/[id]` juga wajib menggunakan bank yang telah terdaftar di master bank.

### 7.4. Backend Export Service — [`backend/app/Modules/Kepegawaian/Services/MealAllowanceExcelExport.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/MealAllowanceExcelExport.php)
* **Target Deteksi**: Baris 77–80
* **Spesifikasi Perbaikan**: Menggunakan field `jenis_pegawai` yang dikirim dari rekonsiliasi frontend/backend:
  ```php
  // Gunakan field eksplisit jika tersedia, fallback ke helper pemeriksaan model
  $typePrefix = ($item['jenis_pegawai'] ?? null) === 'PPPK' || str_contains($gol, 'PPPK') ? 'PPPK' : 'PNS';
  ```

### 7.5. Frontend Settings Modal — [`frontend/src/app/kepegawaian/settings/_components/MealAllowanceHolidaysTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/settings/_components/MealAllowanceHolidaysTab.tsx)
* **Target**: Modal Edit Rekening Pegawai (Baris 1380–1390)
* **Spesifikasi Perbaikan**: Hapus elemen input bebas (*free-text* `<input placeholder="Atau ketik nama bank lain...">`). Seluruh pemilihan bank wajib berasal dari dropdown master `registeredBanks`. Jika admin membutuhkan bank baru, admin diarahkan menggunakan tombol `+ Tambah Bank` pada tab Kelola Opsi Bank.

