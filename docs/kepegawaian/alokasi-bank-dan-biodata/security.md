# Panduan & Spesifikasi Keamanan (Security Guardrails): Alokasi Rekening Bank Modular & Profil Pegawai

**Modul**: Kepegawaian & Pengaturan Uang Makan  
**Versi**: 1.0.0  
**Tanggal**: 3 November 2026  
**Status**: Active Security Policy  

---

## 1. Matriks Otorisasi RBAC (Role-Based Access Control)

Seluruh akses terhadap data kepegawaian dan pengaturan bank dikendalikan secara ketat oleh middleware `auth:sanctum` dan evaluasi modul `kepegawaian`:

| Operasi / Endpoint | Method | `super_admin` | `admin` (Kepegawaian) | `user` (Pegawai Biasa) | Tamu (Unauthenticated) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Daftar Bank Terdaftar** (`/settings/registered-banks`) | `GET` | ✅ Izinkan (200) | ✅ Izinkan (200) | ✅ Izinkan (200 Read-only) | ❌ 401 Unauthorized |
| **Daftarkan Bank Baru** (`/settings/registered-banks`) | `POST` | ✅ Izinkan (200) | ✅ Izinkan (200) | ❌ 403 Forbidden | ❌ 401 Unauthorized |
| **Hapus Bank Terdaftar** (`/settings/registered-banks/{bank}`) | `DELETE` | ✅ Izinkan (200) | ✅ Izinkan (200) | ❌ 403 Forbidden | ❌ 401 Unauthorized |
| **Batch Alokasi Bank** (`/settings/employee-banks/batch`) | `PUT` | ✅ Izinkan (200) | ✅ Izinkan (200) | ❌ 403 Forbidden | ❌ 401 Unauthorized |
| **Update Profil Pegawai** (`/employees/{id}`) | `PUT` | ✅ Izinkan (200) | ✅ Izinkan (200) | ⚠️ Terbatas (Hanya profil sendiri) | ❌ 401 Unauthorized |
| **Upload Foto Profil** (`/employees/{id}/photo`) | `POST` | ✅ Izinkan (200) | ✅ Izinkan (200) | ⚠️ Terbatas (Hanya foto sendiri) | ❌ 401 Unauthorized |

---

## 2. Mitigasi Vektor Serangan & Pengerasan Keamanan (Hardening)

### 2.1. Pencegahan Cross-Site Scripting (Stored XSS) pada Nama Bank
- **Vektor Potensial**: Penyerang memasukkan payload seperti `<script>alert('xss')</script>` atau `<img src=x onerror=alert(1)>` pada field pendaftaran bank.

> [!WARNING]
> **Koreksi Audit 3 Nov 2026 (R6)**: Regex di bawah **belum ada** di kode. `storeRegisteredBank` saat ini hanya `required|string|max:50` + `strip_tags`, sehingga `<script>alert(1)</script>` tersimpan sebagai bank `alert(1)` (201). Jalur `batchUpdateEmployeeBanks` dan `EmployeeRequest` juga tidak memvalidasi `nama_bank` terhadap `kpg_registered_banks` (R4). Lihat [test-plan.md §3.5](./test-plan.md).

- **Lapisan Pertahanan (target, belum terpasang)**:
  1. *Backend Validation*: Input nama bank divalidasi dengan regex alfanumerik `regex:/^[A-Za-z0-9 .&\-]+$/` dan batasan panjang `max:50` → `422` jika gagal.
  2. *Master Bank sebagai pengaman*: `nama_bank` pada pegawai wajib `Rule::exists('kpg_registered_banks','nama_bank')` di semua jalur tulis.
  3. *Frontend Escaping* (sudah aktif): React 19 / JSX me-render nilai string sebagai text node, mencegah injeksi DOM langsung.

### 2.2. Pencegahan SQL Injection pada Parameter Path Hapus Bank
- **Vektor Potensial**: Penyerang memasukkan payload SQL seperti `BRI' OR '1'='1` pada URL `DELETE /api/kepegawaian/settings/registered-banks/{bank}`.
- **Lapisan Pertahanan**:
  - Penggunaan PDO Prepared Statement melalui Eloquent / Query Builder Laravel:
    ```php
    Employee::where('is_active', true)
        ->whereRaw('UPPER(TRIM(nama_bank)) = ?', [strtoupper(trim($bank))])
        ->count();
    
    DB::table('kpg_registered_banks')
        ->whereRaw('UPPER(TRIM(nama_bank)) = ?', [strtoupper(trim($bank))])
        ->delete();
    ```
  - Tidak ada penggabungan string SQL (*raw concatenation*).

### 2.3. Integritas Data & Pencegahan Orphaned Bank Records
- Sistem melarang keras penghapusan bank yang sedang memiliki pegawai aktif.
- Pengecekan count dilakukan secara atomik di dalam database sebelum perintah `DELETE` dieksekusi. Jika $count > 0$, sistem melempar HTTP 422 Unprocessable Content.

### 2.4. Sanitasi Input Kontak & Karakter Placeholder
- Nilai `"-"` atau string kosong pada nomor telepon, nomor rekening, dan email disanitasi menjadi `null` di [`EmployeeRequest::prepareForValidation`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php#L41-L55) (jalur `PUT /employees/{id}`).

> [!WARNING]
> **Koreksi Audit (R3)**: Jalur `PUT /settings/employee-banks/batch` (dipakai modal Edit Rekening di halaman Settings) **tidak** melewati `EmployeeRequest`, sehingga `"-"` masih bisa tersimpan dari sana.

### 2.5. Audit Trail & Akuntabilitas Perubahan Data
Skema riil `kpg_employee_histories`: `id, employee_id, user_id, action, changes (json), notes, created_at`. Perubahan via `EmployeeController::update` dicatat di kolom `changes` (lama→baru) beserta `user_id`.

> [!WARNING]
> **Koreksi Audit (R3, R9)**: Versi 1.0 dokumen ini menyebut kolom `field_name/old_value/new_value/changed_by` — kolom itu **tidak ada**. Selain itu `batchUpdateEmployeeBanks` memakai raw `whereIn()->update()` sehingga perubahan bank/rekening/HP dari halaman Settings **tidak tercatat sama sekali**.
