# Blueprint & Rencana Implementasi RBAC (`User` vs `Admin` vs `Super Admin`): Modul Persuratan, Kepegawaian, & BMN

**Tanggal:** 2026-11-16  
**Cakupan:** Modul **Persuratan (`/surat`)**, Modul **Kepegawaian (`/kepegawaian`)**, dan Modul **BMN (`/bmn`)**  
**Status Dokumen:** ✅ Selesai Diimplementasikan & Terverifikasi (`User` vs `Admin` vs `Super Admin`)

---

## 1. Ringkasan Eksekutif & Keputusan Hasil `/grill-me`

Berdasarkan sesi wawancara desain (`/grill-me`) dan penelusuran menyeluruh pada codebase (`User.php`, `useRole.ts`, `CheckPermission.php`, `Surat`, dan `Kepegawaian`), berikut adalah **7 keputusan arsitektur** yang telah dikunci:

1. **Model Penentuan Role Tetap 1 Role Global + `access_modules` (Keputusan #1)**:
   - Mempertahankan struktur `users.role` (`user` | `admin` | `super_admin`) ditambah array `users.access_modules` (`["surat", "kepegawaian", "bmn", ...]`) tanpa menambah tabel pivot role per modul baru (sesuai prinsip `/ponytail`).
   - Seorang pegawai dengan `role = "user"` yang diberi akses modul tertentu (`access_modules`) masuk ke modul tersebut dengan kewenangan terbatas (**User Mode**), sedangkan `role = "admin"` masuk sebagai pengelola operasional modul (**Admin Mode**), dan `role = "super_admin"` memiliki otoritas penuh termasuk konfigurasi master & IAM.
2. **Fokus Tahap 1 pada Modul Persuratan & Kepegawaian (Keputusan #4)**:
   - Implementasi pertama difokuskan secara tuntas pada **Modul Persuratan (`/surat`)** dan **Modul Kepegawaian (`/kepegawaian`)**. Modul lain (BMN, Keuangan, DeReporting, Inventory) telah dipetakan rekomendasinya di Bagian 4 untuk sesi `/grill-me` berikutnya.
3. **Persuratan — Fokus `User` Hanya pada Surat Keluar (Keputusan #2)**:
   - Pegawai dengan `role = "user"` + akses modul `surat` **hanya** mengakses fitur Surat Keluar: **Dashboard (Ringkasan Surat Keluar Milik Sendiri)**, **Agenda Surat Keluar (`/surat/keluar`)**, **Input Surat Keluar (`/surat/keluar/create`)**, dan **Tata Naskah Dinas (`/surat/keluar/dinas`)**.
   - Menu **Agenda Surat Masuk (`/surat/masuk`)**, **Input Surat Masuk & Disposisi (`/surat/masuk/create`)**, **Rekapitulasi & Laporan (`/surat/laporan`)**, dan **Pengaturan Template (`/surat/settings`)** disembunyikan dari sidebar `User` dan diblokir di halaman serta endpoint API (`403 Forbidden`).
4. **Persuratan — Isolasi Kepemilikan Surat Keluar `User` (`created_by`) & Hak Kelola Mandiri (Keputusan #3)**:
   - Pada **Agenda Surat Keluar (`/surat/keluar`)** dan **Dashboard (`/surat`)**, `User` hanya melihat daftar dan statistik surat keluar yang diinput oleh dirinya sendiri (`created_by = user.id`).
   - `User` dapat **Melihat, Mencetak, Mengedit, dan Menghapus** surat keluar miliknya sendiri, namun ditolak (`403 Forbidden` anti-IDOR) jika mencoba melihat/mengubah/menghapus surat keluar milik pegawai lain.
   - `Admin` Persuratan dapat melihat dan mengelola **seluruh** Surat Masuk & Surat Keluar dari semua user, serta membuka Rekapitulasi & Laporan, tetapi **tidak bisa membuka Pengaturan Template (`/surat/settings`)**.
5. **Kepegawaian — Batas Akses Direktori & Privasi Data Pegawai bagi `User` (Keputusan #5)**:
   - Pegawai dengan `role = "user"` + akses modul `kepegawaian` hanya melihat menu **Dashboard (`/kepegawaian`)** dan **Daftar Pegawai (`/kepegawaian/employees`)** (menu **Arsip Surat Masuk (`/kepegawaian/surat-masuk`)** dikhususkan bagi `Admin` & `Super Admin`).
   - Di halaman **Detail Pegawai (`/kepegawaian/employees/[id]`)** milik pegawai lain, `User` hanya melihat **Biodata & Kontak Kerja** (NIP, Nama, Kategori, Jabatan, Pangkat/Golongan, Unit Kerja/Resor, Masa Kerja, Email, Telepon/WA, Status).
   - Data sensitif pegawai lain — yaitu **Rekening Bank (`nama_bank`, `nomor_rekening`)**, **Tab Riwayat Penugasan (ST)**, **Tab Cuti Pegawai**, **Tab Presensi & Uang Makan**, dan **Tab Riwayat Perubahan (Audit)** — disembunyikan di UI dan diblokir/disensor di API backend bagi `role = "user"`.
6. **Kepegawaian — Batas Kewenangan `Admin` vs `Super Admin` (Keputusan #6)**:
   - `Admin` Kepegawaian mengelola operasional SDM harian: Tambah/Edit Pegawai, Soft Delete & Restore (`Data Terhapus`), Nonaktifkan/Aktifkan Lifecycle Pensiun/Keluar, Inbox Surat Tugas, Inbox Surat Cuti, Hitung Uang Makan, dan Arsip Surat Masuk.
   - `Admin` **tidak bisa** membuka halaman maupun API mutasi **Setting Kepegawaian (`/kepegawaian/settings`)**, **tidak bisa** mengelola **Manajemen Hak Akses (IAM)**, dan **tidak bisa** melakukan **Hapus Permanen (`forceDestroy`)** pegawai (ketiganya dikunci khusus `Super Admin`).

---

## 2. Matriks RBAC Modul Persuratan (`/surat`)

| Fitur / Halaman / Endpoint | `User` (`role: user` + modul `surat`) | `Admin` (`role: admin` + modul `surat`) | `Super Admin` (`role: super_admin`) |
| :--- | :--- | :--- | :--- |
| **Dashboard Persuratan** (`/surat`) | ✅ Tampil khusus ringkasan & daftar terbaru **Surat Keluar milik sendiri** (`created_by = user.id`); tanpa kartu/daftar Surat Masuk | ✅ Tampil ringkasan penuh Surat Masuk & seluruh Surat Keluar | ✅ Penuh |
| **Agenda Surat Keluar** (`/surat/keluar` & `GET /api/surat/surat-keluar`) | ✅ Hanya menampilkan surat keluar yang diinput sendiri (`WHERE created_by = user.id`) | ✅ Menampilkan seluruh surat keluar dari semua user | ✅ Penuh |
| **Input Surat Keluar Manual** (`/surat/keluar/create` & `POST /api/surat/surat-keluar`) | ✅ Bisa membuat surat keluar manual (`created_by` otomatis terisi `user.id`) | ✅ Bisa membuat surat keluar manual | ✅ Penuh |
| **Tata Naskah Dinas (20 Format)** (`/surat/keluar/dinas` & `GET /api/surat/templates`) | ✅ Bisa memilih template aktif & men-generate/menyimpan surat keluar | ✅ Bisa memilih template aktif & men-generate surat keluar | ✅ Penuh |
| **Detail, Edit, & Hapus Surat Keluar** (`GET/PUT/DELETE /api/surat/surat-keluar/{id}`) | ✅ Hanya boleh untuk surat keluar miliknya sendiri (`created_by === user.id`); `403` jika milik user lain | ✅ Boleh untuk seluruh surat keluar | ✅ Penuh |
| **Agenda Surat Masuk & Disposisi** (`/surat/masuk`, `/surat/masuk/create`, `/api/surat/surat-masuk*`) | ❌ Disembunyikan di sidebar & ditolak `403` di API / redirect di UI | ✅ Penuh (Lihat, Input, Edit, Hapus, Cetak Disposisi, Export Excel) | ✅ Penuh |
| **Rekapitulasi & Laporan** (`/surat/laporan`) | ❌ Disembunyikan di sidebar & redirect ke `/surat` jika diakses langsung | ✅ Bisa membuka Rekapitulasi & Laporan | ✅ Penuh |
| **Pengaturan Template** (`/surat/settings` & `POST/PUT/DELETE /api/surat/templates*`) | ❌ Disembunyikan & ditolak `403` | ❌ Disembunyikan di sidebar, redirect di UI, & ditolak `403` di API (`surat.manage` khusus `super_admin`) | ✅ Penuh (Tambah/Edit/Hapus/Reset Template) |

---

## 3. Matriks RBAC Modul Kepegawaian (`/kepegawaian`)

| Fitur / Halaman / Endpoint | `User` (`role: user` + modul `kepegawaian`) | `Admin` (`role: admin` + modul `kepegawaian`) | `Super Admin` (`role: super_admin`) |
| :--- | :--- | :--- | :--- |
| **Dashboard Kepegawaian** (`/kepegawaian` & `GET /api/kepegawaian/dashboard-stats`) | ✅ Melihat komposisi personil (PNS/PPPK/MMP), keaktifan, & distribusi Satker; kartu pintas ke Inbox ST/Cuti/Surat Masuk & feed ST disembunyikan/non-klik | ✅ Melihat seluruh metrik & pintasan operasional SDM | ✅ Penuh |
| **Daftar Pegawai** (`/kepegawaian/employees` & `GET /api/kepegawaian/employees`) | ✅ Melihat direktori pegawai aktif/pensiun (tanpa tab `Data Terhapus`, tanpa tombol Tambah/Edit/Hapus/Lifecycle/IAM, dan field `nomor_rekening` disensor di API) | ✅ Lihat & kelola daftar pegawai (termasuk tab `Data Terhapus`, Soft Delete, Restore, & Lifecycle; tanpa tombol Hapus Permanen & IAM) | ✅ Penuh (termasuk Hapus Permanen & IAM) |
| **Detail Pegawai** (`/kepegawaian/employees/[id]` & `GET /api/kepegawaian/employees/{id}`) | ✅ Hanya tab **Biodata Lengkap** & kontak kerja (tanpa `nama_bank`/`nomor_rekening`, tanpa tombol Edit); tab **Riwayat Penugasan**, **Cuti**, **Uang Makan**, & **Audit** disembunyikan di UI & diblokir `403` di API untuk pegawai lain | ✅ Melihat semua tab (Biodata, ST, Cuti, Uang Makan, Audit) & bisa Edit Biodata / Reset Password / Reset 2FA / Lifecycle | ✅ Penuh |
| **Tambah Pegawai** (`/kepegawaian/employees/create` & `POST /api/kepegawaian/employees`) | ❌ Disembunyikan & ditolak `403` | ✅ Bisa menambah pegawai baru | ✅ Penuh |
| **Inbox Surat Tugas, Inbox Cuti, & Hitung Uang Makan** (`/kepegawaian/surat-tugas/inbox`, `/cuti`, `/uang-makan`) | ❌ Disembunyikan & ditolak `403` | ✅ Kelola penuh operasional ST, Cuti, & Rekonsiliasi Uang Makan | ✅ Penuh |
| **Arsip Surat Masuk Kepegawaian** (`/kepegawaian/surat-masuk` & `/api/kepegawaian/surat-masuk*`) | ❌ Disembunyikan di sidebar, redirect di UI, & ditolak `403` di API | ✅ Kelola penuh Arsip Surat Masuk Kepegawaian | ✅ Penuh |
| **Hapus Permanen Pegawai** (`DELETE /api/kepegawaian/employees/{id}/force`) | ❌ Ditolak `403` | ❌ Tombol disembunyikan di tab `Data Terhapus` & endpoint dikunci `role:super_admin` (`403`) | ✅ Bisa (tetap tunduk pada guard retensi riwayat operasional) |
| **Setting Kepegawaian** (`/kepegawaian/settings` & mutasi template ST/cuti/hari libur/bank/lokasi) | ❌ Disembunyikan & ditolak `403` | ❌ Disembunyikan di sidebar, di-guard redirect di `/kepegawaian/settings`, & endpoint mutasi master dikunci `role:super_admin` (`403`) | ✅ Penuh |
| **Manajemen Hak Akses (IAM)** (`EmployeeAccessSheet` & `/api/kepegawaian/employees/{id}/access`) | ❌ Disembunyikan & ditolak `403` | ❌ Disembunyikan & ditolak `403` | ✅ Penuh |

> [!NOTE]
> **Kompatibilitas Portal Pegawai (`/portal`)**: Pengecualian di `CheckModuleAccess` dan endpoint `/api/me/*` tetap dipertahankan agar pegawai biasa (`role: user`) tetap dapat melihat saldo/permohonan cuti, surat tugas, dan aset BMN **miliknya sendiri** saat membuka `/portal`.

---

## 4. Matriks RBAC Modul BMN (`/bmn`) — Hasil `/grill-me` Tahap 2

Berdasarkan sesi `/grill-me` lanjutan untuk **Modul BMN (`/bmn`)**, berikut adalah aturan yang telah dikunci dan diimplementasikan:

1. **Menu & Akses `User` (`role: user` + `access_modules: ["bmn"]`)**:
   - Hanya dapat membuka 4 menu inventaris dasar secara **Read-Only**: **Dashboard (`/bmn`)**, **Data Aset (`/bmn/assets` & `/bmn/assets/[id]`)**, **Peminjaman (`/bmn/loans`)**, dan **Pemeliharaan (`/bmn/maintenances`)**.
   - Di halaman **Detail Aset (`/bmn/assets/[id]`)**, `User` dapat melihat seluruh tab (`Identitas`, `Finansial & Akuntansi`, `Dokumen Legalitas`, `Lokasi & Penanggung Jawab`, `Organisasi`, `Riwayat Perubahan Data`) serta melihat/mengunduh seluruh foto dan dokumen aset (termasuk BPKB/STNK) secara **Read-Only** (seluruh tombol Edit/Hapus/Pinjam/Tag dikunci).
   - Menu **Import Review (`/bmn/import-review`)**, **Kandidat Rusak Berat (`/bmn/auction-candidates`)**, **Paket Lelang BMN (`/bmn/auction-batches`)**, **Aset Dihapus (`/bmn/disposal`)**, **Dokumen & Laporan (`/bmn/reports`)**, dan **Pengaturan Master (`/bmn/settings`)** disembunyikan di sidebar, di-redirect ke `/bmn` jika diakses via URL, dan ditolak `403 Forbidden` di API.
2. **Batas Kewenangan `Admin` vs `Super Admin` di BMN**:
   - `Admin` (`role: admin` + `access_modules: ["bmn"]`) mengelola seluruh operasional BMN: CRUD Aset, Upload/Hapus Foto & Dokumen, Assign Tag ke Aset, Peminjaman, Pemeliharaan, Import Review & Approval, Kandidat & Paket Lelang, Usulan Penghapusan/Disposal & Restore, serta Dokumen/Laporan BA (`/bmn/reports`).
   - `Admin` **tidak bisa** membuka halaman maupun API mutasi **Pengaturan Master (`/bmn/settings`)** (CRUD Master Tag Aset, Master Lokasi & Ruangan, serta Master Jenis BMN dikunci khusus `Super Admin` dengan `bmn.manage`), dan **tidak bisa** melakukan **Hapus Permanen Aset (`bmn.asset.force_delete`)**.
3. **Penyederhanaan Modal IAM (`EmployeeAccessSheet.tsx`)**:
   - Menghapus daftar 16 kotak centang permission granular BMN di modal IAM agar seragam dengan seluruh modul lain: cukup pilih `Role` (`User` / `Admin` / `Super Admin`) + centang modul `BMN & Aset`.

| Fitur / Halaman / Endpoint BMN | `User` (`role: user` + modul `bmn`) | `Admin` (`role: admin` + modul `bmn`) | `Super Admin` (`role: super_admin`) |
| :--- | :--- | :--- | :--- |
| **Dashboard BMN** (`/bmn` & `GET /api/bmn/dashboard/stats`) | ✅ Read-only (pintasan ke Dokumen/Laporan disembunyikan) | ✅ Penuh | ✅ Penuh |
| **Katalog & Detail Aset** (`/bmn/assets`, `/bmn/assets/[id]`, foto & dokumen BPKB/STNK) | ✅ Read-only (bisa lihat semua tab & unduh dokumen/foto; tanpa tombol Tambah/Edit/Hapus/Tag/Verify) | ✅ Kelola penuh (Tambah, Edit, Verify, Upload/Hapus Foto & Dokumen, Assign Tag, Export Excel) | ✅ Penuh |
| **Peminjaman & Pemeliharaan** (`/bmn/loans`, `/bmn/maintenances`) | ✅ Read-only daftar pinjaman & riwayat servis | ✅ Kelola penuh (Pinjam, Kembalikan, Edit/Hapus Pinjaman, Catat Servis, Export Excel) | ✅ Penuh |
| **Import Review, Kandidat & Paket Lelang, Disposal, & Laporan BA** (`/bmn/import-review`, `/auction-*`, `/disposal`, `/reports`) | ❌ Disembunyikan di sidebar, redirect di UI, & ditolak `403` di API | ✅ Kelola penuh (termasuk Disposal & Restore; tanpa Hapus Permanen) | ✅ Penuh |
| **Hapus Permanen Aset** (`POST /api/bmn/assets/bulk-force-delete`) | ❌ Ditolak `403` | ❌ Ditolak `403` | ✅ Bisa |
| **Pengaturan Master BMN** (`/bmn/settings`: CRUD Master Tag, Lokasi & Ruangan, Jenis BMN) | ❌ Disembunyikan & ditolak `403` | ❌ Disembunyikan di sidebar, redirect di UI, & ditolak `403` di API (`bmn.manage` khusus `super_admin`) | ✅ Penuh |

---

## 5. Peta Rekomendasi Awal untuk Modul Lain (Referensi Sesi `/grill-me` Berikutnya)

1. **Modul Keuangan (`/keuangan`)**:
   - `User`: Cetak Visum SPD & hanya bisa membuat/melihat/mengedit **SPJ miliknya sendiri** (`created_by = user.id`).
   - `Admin`: Melihat, memverifikasi (`updateStatus`), dan mengekspor seluruh SPJ pegawai; tidak bisa mengubah Setting Master.
   - `Super Admin`: Akses penuh termasuk Setting & Template Master Visum SPD.
2. **Modul DeReporting (`/dereporting`) & Inventory (`/inventory`)**:
   - `User`: Pelaporan/pembacaan sesuai scope tanpa akses konfigurasi master/operator/mutasi stok gudang.
   - `Admin`: Operasional modul tanpa akses pengaturan master level tinggi / hapus permanen.

---

## 6. Daftar Celah (Root Causes) yang Telah Diperbaiki

### A. Modul Persuratan (`/surat`)
1. **`User::hasPermission()` ([`User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php)) & [`useRole.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts)**:
   - Di `User.php`, fallback `surat.*` sebelumnya hanya mengizinkan `surat.view` dan `surat.document.view` untuk `role = user`, sedangkan `surat.create`, `surat.update`, `surat.delete` dikunci untuk `role = admin`, dan `surat.manage` ikut diberikan ke `role = admin`.
   - Di `useRole.ts`, sebelumnya belum ada blok fallback `permission.startsWith("surat.")`, sehingga `hasPermission("surat.create")` untuk `user` bernilai `false`.
2. **Routing & Controller Persuratan ([`backend/app/Modules/Surat/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Routes/api.php), [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php))**:
   - Route `surat-masuk*` sebelumnya hanya memakai `permission:surat.view`, sehingga `role = user` masih bisa memanggil API Surat Masuk.
   - `SuratKeluarController::index()` sebelumnya belum memfilter `where('created_by', $request->user()->id)` ketika diakses oleh `role = user`.
   - `SuratKeluarController::show()`, `update()`, dan `destroy()` sebelumnya belum memvalidasi kepemilikan (`$suratKeluar->created_by === $user->id`) ketika diakses oleh `role = user`.
3. **UI Sidebar & Halaman Persuratan ([`surat/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/layout.tsx), [`surat/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/page.tsx), [`SuratHubComponents.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratHubComponents.tsx))**:
   - Sidebar `surat/layout.tsx` kini menampilkan `Dashboard`, `Agenda Surat Keluar`, `Input Surat Keluar`, dan `Tata Naskah Dinas` kepada `user`, serta dilengkapi guard redirect otomatis jika `user` membuka `/surat/masuk*`, `/surat/laporan`, atau `/surat/settings`, maupun jika `admin` membuka `/surat/settings`.
   - Dashboard `surat/page.tsx` untuk `user` kini hanya memanggil `/surat/surat-keluar` dan menampilkan metrik/daftar Surat Keluar milik sendiri.

### B. Modul Kepegawaian (`/kepegawaian`)
1. **Route & Controller Backend Kepegawaian ([`backend/app/Modules/Kepegawaian/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Routes/api.php), [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php), [`EmployeeLeaveController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php))**:
   - Route `GET /api/kepegawaian/surat-masuk*` telah dipindahkan ke dalam grup `role:super_admin,admin`.
   - Route `DELETE /api/kepegawaian/employees/{id}/force` (`forceDestroy`) dan seluruh route mutasi pengaturan di `/kepegawaian/settings` (`st-templates`, `st-expense-templates`, `leave-types`, `st-task-types`, `settings/holidays*`, `settings/registered-banks*`, `settings/employee-banks*`) telah dikunci khusus `role:super_admin`.
   - `EmployeeController::index()` dan `EmployeeController::show()` kini menyembunyikan `nama_bank`, `nomor_rekening`, dan `inactive_notes` pegawai lain dari `role = user`.
   - `EmployeeController::assignmentLetters()`, `EmployeeController::mealAllowances()`, dan `EmployeeLeaveController::show()` kini memblokir akses `role = user` terhadap pegawai lain (`403 Forbidden`), serta `dashboardStats()` menyembunyikan feed ST dan counter inbox internal bagi `role = user`.
2. **UI Sidebar & Halaman Kepegawaian ([`kepegawaian/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/layout.tsx), [`kepegawaian/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/page.tsx), [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx), [`employees/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/%5Bid%5D/page.tsx))**:
   - Di `kepegawaian/layout.tsx`, menu `Arsip Surat Masuk` diubah menjadi `minRole: "admin"`, dan ditambahkan guard redirect terpusat untuk `user` maupun `admin` (pada `/kepegawaian/settings`).
   - Di `kepegawaian/page.tsx` (Dashboard), kartu pintas ke Inbox ST, Layanan Cuti, Surat Masuk, dan feed ST disembunyikan bagi `user`.
   - Di `employees/[id]/page.tsx`, `role = user` yang melihat profil pegawai lain hanya melihat tab **Biodata Lengkap** tanpa informasi rekening bank dan tanpa tab ST/Cuti/Uang Makan/Audit.
   - Di `employees/page.tsx`, tombol **Hapus Permanen** pada tab `Data Terhapus` dibatasi hanya untuk `Super Admin` (`canManageAccess`).

### C. Modul BMN (`/bmn`) & Modal IAM (`EmployeeAccessSheet.tsx`)
1. **`User::hasPermission()` ([`User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php)) & [`useRole.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts)**:
   - `bmn.manage` dan `bmn.asset.force_delete` dikunci khusus `super_admin`.
   - Pada fallback `bmn.*`, `role = user` dengan akses modul `bmn` hanya memperoleh `bmn.view`, sedangkan `role = admin` otomatis memperoleh seluruh izin operasional BMN tanpa perlu mencentang 16 permission satu per satu.
2. **Route & Controller Pengaturan Master BMN ([`backend/app/Modules/Bmn/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Routes/api.php), [`LocationController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/LocationController.php))**:
   - Route mutasi `POST/PUT/PATCH/DELETE` untuk `tags`, `locations`, dan `asset-types` dikunci `role:super_admin` + `permission:bmn.manage` (sementara pembacaan `GET` tetap `bmn.view` dan pemasangan tag ke aset tetap `bmn.asset.update` bagi `Admin BMN`).
3. **UI Sidebar BMN, Dashboard BMN, & Modal IAM ([`bmn/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/layout.tsx), [`bmn/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/page.tsx), [`EmployeeAccessSheet.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx))**:
   - Menu `Pengaturan Master` (`/bmn/settings`) dikunci `bmn.manage` (khusus `Super Admin`), disertai guard redirect terpusat di `bmn/layout.tsx` dan penyaringan pintasan `/bmn/reports` di `bmn/page.tsx`.
   - Di `EmployeeAccessSheet.tsx`, opsi modul `Keuangan` (`keuangan`) telah ditambahkan dan 16 kotak centang permission granular BMN dihapus agar pengaturan akses seragam di seluruh modul.

---

## 7. Hasil Verifikasi & Status Akhir

1. **Automated Feature Test Suite (PHPUnit)**:
   - [`SuratAndKepegawaianRbacTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratAndKepegawaianRbacTest.php) (3 suite komprehensif: Persuratan RBAC, Kepegawaian RBAC, & BMN RBAC)
   - [`SuratModuleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratModuleTest.php)
   - [`StTemplateTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/StTemplateTest.php)
   - [`MealAllowanceSecurityAndReconciliationTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/MealAllowanceSecurityAndReconciliationTest.php)
   - [`PortalPersonalSecurityTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalPersonalSecurityTest.php)
   - [`StKepegawaianSecurityClosureTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/StKepegawaianSecurityClosureTest.php)
   - [`EmployeeAccessLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/EmployeeAccessLifecycleTest.php)
   - [`BmnLayoutAndSecurityRegressionTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php)
   - [`BmnMasterDataTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnMasterDataTest.php)
   - [`BmnTagTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnTagTest.php)
   - [`NotificationBmnLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/NotificationBmnLifecycleTest.php)
   - [`LocationHierarchyAndDriveSyncTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/LocationHierarchyAndDriveSyncTest.php)
   - **Total Hasil**: **`178/178 tests PASSED` (`1.059 assertions`, `0 failed`)**.
2. **TypeScript Compiler Check (`tsc --noEmit`)**:
   - `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit --incremental false` -> **`0 errors`**.
3. **Knowledge Graph**:
   - `graphify update .` -> **100% updated**.
4. **Riwayat Commit Lokal (`codex/portal-security-pentest`)**:
   - `62ded7a3` — `feat(rbac): enforce user/admin/super_admin boundaries in Persuratan and Kepegawaian`
   - `0cd371fb` — `feat(bmn): enforce user/admin/super_admin RBAC in BMN and simplify IAM sheet`
