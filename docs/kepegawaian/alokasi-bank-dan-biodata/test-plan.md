# Rencana Pengujian Komprehensif (Comprehensive Test Plan): Alokasi Bank, Sanitasi Kontak, & Navigasi Pegawai

**Modul**: Kepegawaian & Pengaturan Uang Makan  
**Versi Dokumen**: 1.1.0 (ditambah Audit Akar §3.5)  
**Tanggal**: 3 November 2026  
**Target Kualitas**: 10 / 10 (Zero Finding, Zero Flakiness, Full Regression Guard)  

---

## 1. Tujuan Pengujian & Filosofi `/ponytail`

Pengujian ini dirancang untuk memverifikasi secara mendalam dan objektif seluruh perubahan yang telah dibuat pada modul Kepegawaian dan Pengaturan Uang Makan.

Sesuai filosofi `/ponytail`, setiap test case harus:
1. Menguji **jalur kritis riil** (bukan pengujian teoritis atau boilerplate kosong).
2. Memverifikasi pengaman batas trust boundary (*security & permissions*).
3. Meninggalkan **test runner runnable yang bersih, cepat, dan deterministik** (tanpa dependensi mock yang rapuh).

---

## 2. Matriks Rencana Pengujian (Test Scope Matrix)

Pengujian dibagi ke dalam 4 dimensi pengujian utama:

```
[ Dimensi 1: Security Test ] ──► RBAC 401/403, XSS Injection, SQLi Path Parameter, In-Use Delete Guard
[ Dimensi 2: Backend Test  ] ──► Registered Banks CRUD, Batch Bank Transfer, Dash Sanitization, Audit Logs
[ Dimensi 3: Frontend Test ] ──► TypeScript Compilation, Pagination State Logic, Safe Page Bounds
[ Dimensi 4: E2E Playwright] ──► Real Browser Flow: Settings 10/20/50/all, Bank Modal, Employee Edit Page
```

---

## 3. Rincian Kasus Uji (Test Cases Breakdown)

### 3.1. Security Test Suite (PHPUnit)
File target: `backend/tests/Feature/EmployeeBankAllocationSecurityTest.php`

| Kode TC | Skenario Pengujian | Input / Vektor Serangan | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **TC-SEC-01** | Akses Unauthenticated (Tanpa Login) | Request ke seluruh endpoint mutasi bank tanpa Bearer Token | `401 Unauthorized` |
| **TC-SEC-02** | Akses Regular User (Role: `user`) | Request POST/PUT/DELETE bank menggunakan token staf biasa | `403 Forbidden` |
| **TC-SEC-03** | Pencegahan Stored XSS pada Nama Bank | `{"nama_bank": "<script>alert(1)</script>"}` | `422 Unprocessable` / Karakter tag dibersihkan |
| **TC-SEC-04** | Pencegahan SQL Injection pada Path Delete | `DELETE /registered-banks/BRI' OR '1'='1` | `404 / 422` tanpa syntax error database |
| **TC-SEC-05** | Proteksi Hapus Bank Aktif (*In-Use Guard*) | `DELETE /registered-banks/BRI` (masih ada 109 pegawai) | `422 Unprocessable` ("masih digunakan oleh X pegawai") |
| **TC-SEC-06** | Otorisasi Akses Modul Kepegawaian | User memiliki role `admin` namun modulnya hanya `bmn` | `403 Forbidden` |

### 3.2. Backend Functional Test Suite (PHPUnit)
File target: `backend/tests/Feature/EmployeeBankAllocationSecurityTest.php`

| Kode TC | Skenario Pengujian | Prosedur Uji | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **TC-BE-01** | Ambil Daftar Bank Terdaftar (`GET`) | Call `GET /api/kepegawaian/settings/registered-banks` | `200 OK`, memuat BRI (109) dan Mandiri (43) |
| **TC-BE-02** | Registrasi Bank Baru Valid (`POST`) | Call `POST /registered-banks` payload `{"nama_bank": "BSI"}` | `200 OK`, bank BSI tersimpan di database |
| **TC-BE-03** | Penolakan Bank Duplikat | Call `POST /registered-banks` dengan nama `bri` (lowercase) | `422 Unprocessable` ("sudah terdaftar") |
| **TC-BE-04** | Hapus Bank Bersih (0 Pegawai Aktif) | Daftarkan `TEST_BANK`, pastikan 0 pegawai, lalu hapus | `200 OK`, bank terhapus dari `kpg_registered_banks` |
| **TC-BE-05** | Batch Update Bank Pegawai | Kirim array `employee_ids` dan target `Mandiri` | `200 OK`, `nama_bank` seluruh target berubah di DB |
| **TC-BE-06** | Sanitasi Kolom Kontak (`telepon = '-'`) | Update pegawai via `PUT /employees/{id}` telepon `"-"` | `200 OK`, kolom `telepon` di DB menjadi `null` |

### 3.3. Frontend Logic & Type-Safety Test Suite
Alat: `npx tsc --noEmit` & Component Unit Verification

| Kode TC | Skenario Pengujian | Logika Pengujian | Ekspektasi Hasil |
| :--- | :--- | :--- | :--- |
| **TC-FE-01** | Verifikasi Strict Type-Check | Menjalankan `npx tsc --noEmit` di seluruh frontend | `0 errors` (Lolos kompilasi bersih) |
| **TC-FE-02** | Logika Pagination State | Ubah `perPage` ke `10`, `20`, `50`, dan `"all"` | Slice data terbagi presisi sesuai ukuran halaman |
| **TC-FE-03** | Auto-Reset ke Halaman 1 | Pada halaman 3, ketik kata kunci pencarian di input | Halaman aktif langsung kembali ke Halaman 1 |
| **TC-FE-04** | Pembersihan Placeholder Kontak | Buka edit profil pegawai dengan `telepon = null` | Field form terisi string kosong `""` (bukan `"-"`) |

### 3.4. End-to-End (E2E) Browser Test Suite (Playwright)
File target: `frontend/tests/kepegawaian-bank-allocation.playwright.cjs`

| Kode TC | Skenario Browser Riil | Langkah Interaksi Pengguna | Kriteria Kelulusan |
| :--- | :--- | :--- | :--- |
| **TC-E2E-01** | Buka Pengaturan Alokasi Bank | Akses `/kepegawaian/settings?tab=uang_makan&sub=banks` | Header dan kartu statistik bank tampil normal |
| **TC-E2E-02** | Interaksi Dropdown Pagination | Pilih opsi `20 baris`, `50 baris`, `10 baris`, `Semua` | Jumlah baris tabel berubah seketika tanpa reload |
| **TC-E2E-03** | Navigasi Halaman & Page Pills | Klik tombol `Berikutnya`, `Sebelumnya`, dan pill nomor `2` | Baris data berganti sesuai rentang halaman aktif |
| **TC-E2E-04** | Alur Tambah & Hapus Bank | Buka modal `+ Tambah Bank`, input bank uji, cek daftar | Bank baru muncul di UI dan opsi terdaftar |
| **TC-E2E-05** | Form Edit Detail Pegawai | Buka `/kepegawaian/employees/63`, klik `Edit Biodata` | Field nomor WhatsApp kosong bersih dan dropdown bank memuat bank terdaftar |

---

## 3.5. Audit Akar (Root-Cause Audit) — Revisi 1.1 (3 Nov 2026)

> [!IMPORTANT]
> Rencana v1.0 di atas **hanya menguji permukaan**: tiap endpoint diuji sendiri-sendiri, status HTTP-nya dicek, dan selesai. Tidak ada test yang mengikuti data **dari DB → API → state frontend → payload balik → Excel**. Hasil trace kode end-to-end dan query DB langsung menemukan bug yang lolos dari semua 21 test v1.0.

### 3.5.1. Bukti Data Riil (query DB lokal, 3 Nov 2026)

| Metrik | Nilai | Catatan |
| :--- | :--- | :--- |
| Pegawai aktif per bank | BRI 109, Mandiri 43 | Angka BRI **termasuk 33 MMP** |
| Jenis (`Employee::scopeOfJenis`) | PNS 98, PPPK 21, MMP 33 | Total 152 |
| MMP per bank | BRI 33 | Semua MMP otomatis jadi BRI (default kolom) |
| ASN di daftar sync user | PNS 92 (53 BRI + 39 Mandiri), PPPK 21 | **6 PNS aktif tidak ada di daftar user** → tetap BRI default, belum dikonfirmasi |
| ASN dengan `nomor_rekening` kosong | **119 dari 119** | Nominatif bank akan keluar dengan kolom rekening kosong semua |
| Literal `"-"` tersisa | 0 | Migrasi pembersihan berhasil |
| Kolom `kpg_employee_histories` | `id, employee_id, user_id, action, changes, notes, created_at` | **Tidak ada** `field_name/old_value/new_value` seperti yang ditulis di `security.md` §2.5 v1.0 |

### 3.5.2. Temuan Akar

| # | Lokasi | Akar Masalah | Dampak Nyata | Kenapa v1.0 Tidak Menangkap |
| :--- | :--- | :--- | :--- | :--- |
| **R1** 🔴 | [`uang-makan/page.tsx` `normalizeEmployeeItem`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/uang-makan/page.tsx#L248-L287) | Return object **tidak menyertakan** `nama_bank`, `nomor_rekening` (padahal backend `AttendanceReconcilerService` L211-212 mengirimnya, dan tipe `ReconciledEmployeeItem` L61-62 punya field-nya) | (a) `sheetCategoryStats` L191 selalu `isMandiri=false` → kartu PNS_MNDRI & PPPK_MNDRI **selalu 0**. (b) `storeBatch` & `exportExcel` menerima item tanpa bank → backend fallback `?? 'BRI'` (Controller L272, Export L78) → **semua pegawai masuk sheet BRI, sheet Mandiri kosong** | v1.0 tidak menyentuh halaman `/kepegawaian/uang-makan` sama sekali; hanya menguji halaman Settings |
| **R2** 🔴 | [`MealAllowanceController::getEmployeeBanks`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php#L559-L579) & [`getRegisteredBanks`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php#L656-L661) | Klasifikasi pakai `str_contains(pangkat_golongan,'PPPK')` sendiri, **mengabaikan** `Employee::scopeOfJenis` / accessor `jenis_pegawai` yang sudah ada | 33 MMP berlabel **PNS**, ikut filter "Hanya PNS", dan menggelembungkan hitungan BRI dari 76 ASN → 109 | TC-BE-01 justru **mengunci angka salah** (BRI 109) sebagai ekspektasi |
| **R3** 🔴 | [`batchUpdateEmployeeBanks`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php#L601-L643) | Raw `Employee::whereIn()->update()` — melewati `EmployeeRequest` dan `EmployeeHistory::create` di `EmployeeController` L265 | (a) Ubah bank/rekening/HP dari Settings **tanpa jejak audit**. (b) `"-"` masuk lagi ke DB (sanitasi hanya ada di `EmployeeRequest` L44-54). (c) `employee_ids.*` tanpa `exists` → ID fiktif diam-diam diabaikan, pesan sukses tetap "N data berhasil" | TC-BE-06 hanya menguji jalur `PUT /employees/{id}`, bukan jalur batch — jalur yang sebenarnya dipakai halaman Settings |
| **R4** 🟠 | `batchUpdateEmployeeBanks` L606 **dan** [`EmployeeRequest`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php#L105) | `nama_bank` hanya `string|max:50`, **tidak divalidasi** terhadap `kpg_registered_banks` di kedua jalur tulis | Master bank tidak punya makna sebagai pengaman; bank liar bisa masuk lewat API langsung atau modal free-text (R5) | v1.0 menganggap master bank = pengaman, tanpa test penolakan |
| **R5** 🟠 | [`MealAllowanceHolidaysTab.tsx` L1384](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/settings/_components/MealAllowanceHolidaysTab.tsx#L1384) | Modal "Edit Rekening Pegawai" masih punya `<input>` free-text "Atau ketik nama bank lain…" | Jalur UI untuk R4 | E2E v1.0 hanya klik dropdown, tidak mencoba input bebas |
| **R6** 🟠 | [`storeRegisteredBank`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php#L687-L699) | `strip_tags` lalu simpan; tanpa regex karakter | `<script>alert(1)</script>` → tersimpan sebagai bank **`alert(1)`** dengan `201`. `security.md` v1.0 mengklaim ada regex — **klaim itu salah** | TC-SEC-03 ekspektasinya ambigu ("422 / tag dibersihkan") sehingga perilaku salah pun dianggap lulus |
| **R7** 🟡 | `getEmployeeBanks` L550-551, L556, L590-591 | `like "%{$s}%"` tanpa `addcslashes` dan tanpa `ilike` (case-sensitive di PostgreSQL); filter `bank` & `total_mandiri/total_bri` exact-match case-sensitive | Cari "agung" tidak menemukan "AGUNG"; input `%`/`_` jadi wildcard; bank "MANDIRI" (huruf besar) tidak terhitung di `total_mandiri`. `EmployeeController` L66/L130 sudah benar — pola ini tinggal dipakai ulang | Tidak ada test pencarian |
| **R8** 🟡 | [`MealAllowanceExcelExport` L77](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/MealAllowanceExcelExport.php#L77) & `uang-makan/page.tsx` L190 | Deteksi PPPK pakai `golongan` mengandung "PPPK" saja, sedangkan sumber kebenaran `Employee::getIsPppkAttribute` juga memakai NIP digit 13-14 = `21`, `p3k`, `golongan …` | Saat ini 0 kasus (dicek di DB), tapi pegawai PPPK baru dengan golongan "Golongan IX" akan masuk sheet **PNS**. Laten | — |
| **R9** 🟡 | Dokumen v1.0 | `security.md` §2.1 (regex) dan §2.5 (kolom audit) menggambarkan implementasi yang **tidak ada** | Dokumen memberi rasa aman palsu | — |
| **D1** ℹ️ | Data | 119/119 ASN belum punya nomor rekening; 6 PNS di luar daftar sync | Bukan bug kode, tapi export Nominatif belum layak dikirim ke bank | — |

> [!NOTE]
> Yang **sudah benar** (diverifikasi, tidak perlu diubah): semua endpoint tulis bank ada di grup `role:super_admin,admin` + `module.access:kepegawaian` ([api.php L96-L144](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Routes/api.php#L96-L144)); `destroyRegisteredBank` sudah pakai binding parameter dan in-use guard; `GET /registered-banks` terbuka untuk semua user modul (L49) memang disengaja untuk dropdown.

### 3.5.3. Arah Perbaikan (Satu Tempat per Akar, sesuai `/ponytail`)

| Akar | Perbaikan Minimum | Kenapa di situ |
| :--- | :--- | :--- |
| R1 | Tambah `nama_bank`, `nomor_rekening` ke return `normalizeEmployeeItem` (2 baris) | Satu-satunya pintu data reconcile & batch lama (L413, L650) — semua konsumen ikut benar |
| R2 | Pakai `$emp->jenis_pegawai` + `->ofJenis()` yang sudah ada; MMP dikeluarkan dari daftar alokasi & hitungan bank (atau ditampilkan sebagai grup MMP — **perlu keputusan user**) | Reuse helper, hapus logika duplikat |
| R3 + R4 | Validasi `nama_bank` → `Rule::exists('kpg_registered_banks','nama_bank')`, `employee_ids.*` → `exists:kpg_employees,id`, sanitasi `"-"`, lalu loop update per model + `EmployeeHistory::create` dalam transaksi (data ±150 baris, aman) | Menyamakan jalur batch dengan jalur `EmployeeController::update` |
| R5 | Hapus input free-text; pakai dropdown `registeredBanks` | Jalur UI R4 tertutup |
| R6 | Tambah `regex:/^[A-Za-z0-9 .&\-]+$/` di validasi → 422 | Tolak, jangan diam-diam ubah input |
| R7 | Salin pola `addcslashes` + `ilike` dari `EmployeeController` | Reuse |
| R8 | Kirim `jenis_pegawai` dari reconciler, export & frontend membaca field itu | Satu sumber kebenaran |
| R9 | Koreksi `security.md` & `design.md` | Dokumen sesuai kode |

### 3.5.4. Test Case Tambahan Tingkat Akar

| Kode TC | Akar | Skenario | Ekspektasi |
| :--- | :--- | :--- | :--- |
| **TC-ROOT-01** | R1 | Unit: panggil `normalizeEmployeeItem` dengan item reconcile ber-`nama_bank: "Mandiri"` | Output tetap memuat `nama_bank` & `nomor_rekening` |
| **TC-ROOT-02** | R1 | E2E `/kepegawaian/uang-makan`: reconcile bulan berjalan | Kartu PNS_MNDRI + PPPK_MNDRI = jumlah ASN Mandiri di DB (≈43 − MMP Mandiri), bukan 0 |
| **TC-ROOT-03** | R1 | Feature: `POST /uang-makan/batches` lalu `GET /batches/{id}` dengan payload persis dari frontend | `nama_bank` tiap item = nilai di `kpg_employees`, tidak ada yang jatuh ke `'BRI'` |
| **TC-ROOT-04** | R1 | Feature: `POST /uang-makan/export-excel`, baca file dengan PhpSpreadsheet | Sheet `PNS_MNDRI`, `PPPK_MNDRI`, `Nominatif Mandiri` berisi baris; jumlah baris = jumlah pegawai Mandiri di payload |
| **TC-ROOT-05** | R2 | Feature: `GET /settings/employee-banks?group=pns` dengan fixture 1 PNS, 1 PPPK (NIP digit 13-14 `21`, golongan tanpa kata PPPK), 1 MMP | Hanya PNS yang kembali; PPPK berlabel PPPK; MMP tidak berlabel PNS |
| **TC-ROOT-06** | R2 | Feature: `GET /registered-banks` dengan fixture di atas | `count` hanya ASN (aturan sesuai keputusan R2) |
| **TC-ROOT-07** | R3 | Feature: `PUT /employee-banks/batch` ubah bank 2 pegawai | 2 baris baru di `kpg_employee_histories` dengan `changes` memuat bank lama→baru dan `user_id` admin |
| **TC-ROOT-08** | R3 | Feature: batch `single_update` dengan `telepon: "-"`, `nomor_rekening: "-"` | DB menyimpan `null` |
| **TC-ROOT-09** | R3 | Feature: batch dengan `employee_ids: [999999]` | `422`, bukan `200 "1 data berhasil"` |
| **TC-ROOT-10** | R4 | Feature: batch & `PUT /employees/{id}` dengan `nama_bank: "BANK_LIAR"` | Keduanya `422` |
| **TC-ROOT-11** | R5 | E2E: buka modal Edit Rekening Pegawai | Tidak ada input free-text bank; hanya opsi dari `registeredBanks` |
| **TC-ROOT-12** | R6 | Feature: `POST /registered-banks` dengan `<script>alert(1)</script>`, `BRI'; DROP TABLE x;--`, `<img src=x onerror=1>` | Semua `422`, tabel tidak bertambah |
| **TC-ROOT-13** | R7 | Feature: search `agung` (huruf kecil) dan `%` | `agung` menemukan "AGUNG SUSENO"; `%` tidak mengembalikan semua pegawai |
| **TC-ROOT-14** | R8 | Feature export: item PPPK dengan golongan "Golongan IX" | Masuk sheet PPPK |
| **TC-ROOT-15** | D1 | Self-check data: jumlah ASN aktif tanpa rekening & ASN di luar daftar sync | Dilaporkan sebagai peringatan, bukan gagal |

### 3.5.5. Koreksi Test Case v1.0

| TC Lama | Masalah | Koreksi |
| :--- | :--- | :--- |
| TC-BE-01 | Mengunci angka BRI 109 / Mandiri 43 yang memuat 33 MMP | Ekspektasi dihitung dari fixture, bukan angka DB hidup |
| TC-SEC-03 | "422 / tag dibersihkan" — dua hasil berbeda dianggap sama-sama lulus | Wajib `422` (lihat TC-ROOT-12) |
| TC-SEC-05 | Bergantung pada data DB hidup ("masih 109 pegawai") | Pakai fixture `RefreshDatabase` |
| TC-BE-06 | Hanya jalur `EmployeeController` | Ditambah jalur batch (TC-ROOT-08) |
| TC-FE-02/03 | "Component unit verification" tanpa alat yang jelas — frontend tidak punya runner unit test | Logika pagination diuji lewat E2E Playwright (TC-E2E-02/03); tidak menambah dependensi test runner baru |

---

## 4. Evaluasi Objektif Kesiapan Skor 10/10

Untuk menyatakan suite pengujian telah mencapai nilai **10 / 10**, sistem harus memenuhi seluruh kriteria berikut:

- [ ] **Security Suite**: 6/6 test case keamanan lulus hijau (`assertStatus(401/403/422)` lolos).
- [ ] **Backend Suite**: 6/6 test case fungsional lulus hijau (database rollback otomatis).
- [ ] **Frontend Suite**: 0 TypeScript error, 0 console reference error di browser.
- [ ] **E2E Playwright Suite**: 5/5 skenario browser headless lulus dengan tangkapan layar verifikasi (*artifact screenshots*).
- [ ] **Regression Free**: Seluruh pengujian modul lain (`MealAllowanceSecurityAndReconciliationTest`) tetap 100% lulus.
- [ ] **Root Suite (v1.1)**: TC-ROOT-01 s.d. TC-ROOT-14 lulus; TC-ROOT-15 menghasilkan laporan data.

**Skor objektif rencana**:
- v1.0 (hanya §3.1–3.4): **5/10** — cakupan endpoint lengkap, tapi tidak ada test alur data lintas lapisan, ekspektasi beberapa TC mengunci perilaku salah, dan 3 bug 🔴 lolos.
- v1.1 (+ §3.5): **9/10** — semua akar yang ditemukan punya test. Sisa 1 poin: verifikasi file Excel nominatif oleh bendahara/bank (format kolom resmi) tidak bisa diotomasi dan butuh uji terima manual.

---

## 5. Alat & Perintah Eksekusi Pengujian

```powershell
# 1. Eksekusi Test Backend & Security
cd backend
php artisan test tests/Feature/EmployeeBankAllocationSecurityTest.php

# 2. Eksekusi Type Check Frontend
cd ../frontend
npx tsc --noEmit

# 3. Eksekusi E2E Playwright
node tests/kepegawaian-bank-allocation.playwright.cjs

# 4. Sinkronisasi Knowledge Graph AST
cd ..
graphify update .
```
