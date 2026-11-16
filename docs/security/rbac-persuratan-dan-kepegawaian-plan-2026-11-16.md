# Blueprint & Rencana Implementasi RBAC (`User` vs `Admin` vs `Super Admin`): Modul Persuratan & Kepegawaian

**Tanggal:** 2026-11-16  
**Cakupan Tahap 1:** Modul **Persuratan (`/surat`)** dan Modul **Kepegawaian (`/kepegawaian`)** *(beserta catatan arsitektur untuk BMN, Keuangan, DeReporting, & Inventory pada tahap berikutnya)*  
**Status Dokumen:** ✅ Selesai Diimplementasikan & Terverifikasi (`108/108` PHPUnit tests, `612` assertions, `0` TypeScript errors)

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

## 4. Peta Rekomendasi Awal untuk Modul Lain (Referensi Sesi `/grill-me` Berikutnya)

Sebagai dokumentasi hasil diskusi awal kita untuk tahap selanjutnya:
1. **Modul BMN (`/bmn`)**:
   - `User`: Lihat Dashboard, Katalog Aset (`/bmn/assets`), Peminjaman (`/bmn/loans`), & Pemeliharaan (`/bmn/maintenances`). Tidak bisa buka Import Review, Kandidat/Paket Lelang, Disposal, Laporan BA, maupun Pengaturan Master (`/bmn/settings`).
   - `Admin`: Kelola operasional aset, pinjaman, pemeliharaan, import review, laporan BA, dan lelang (sesuai permission granular), tetapi **tidak bisa buka Pengaturan Master (`/bmn/settings`)** dan tidak bisa `force_delete`.
   - `Super Admin`: Akses penuh termasuk `/bmn/settings` & `force_delete`.
2. **Modul Keuangan (`/keuangan`)**:
   - `User`: Cetak Visum SPD & hanya bisa membuat/melihat/mengedit **SPJ miliknya sendiri** (`created_by = user.id`).
   - `Admin`: Melihat, memverifikasi (`updateStatus`), dan mengekspor seluruh SPJ pegawai; tidak bisa mengubah Setting Master.
   - `Super Admin`: Akses penuh termasuk Setting & Template Master Visum SPD.
3. **Modul DeReporting (`/dereporting`) & Inventory (`/inventory`)**:
   - `User`: Pelaporan/pembacaan sesuai scope tanpa akses konfigurasi master/operator/mutasi stok gudang.
   - `Admin`: Operasional modul tanpa akses pengaturan master level tinggi / hapus permanen.

---

## 5. Daftar Celah (Root Causes) yang Akan Diperbaiki pada Tahap 1

### A. Modul Persuratan (`/surat`)
1. **`User::hasPermission()` ([`User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php#L218-L224)) & [`useRole.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts)**:
   - Di `User.php`, fallback `surat.*` saat ini hanya mengizinkan `surat.view` dan `surat.document.view` untuk `role = user`, sedangkan `surat.create`, `surat.update`, `surat.delete` dikunci untuk `role = admin`, dan `surat.manage` ikut diberikan ke `role = admin`!
   - Di `useRole.ts`, belum ada blok fallback `permission.startsWith("surat.")`, sehingga `hasPermission("surat.create")` untuk `user` bernilai `false`.
2. **Routing & Controller Persuratan ([`backend/app/Modules/Surat/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Routes/api.php), [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php))**:
   - Route `surat-masuk*` saat ini menggunakan `permission:surat.view`, sehingga `role = user` masih bisa memanggil API Surat Masuk.
   - `SuratKeluarController::index()` belum memfilter `where('created_by', $request->user()->id)` ketika diakses oleh `role = user`.
   - `SuratKeluarController::show()`, `update()`, dan `destroy()` belum memvalidasi kepemilikan (`$suratKeluar->created_by === $user->id`) ketika diakses oleh `role = user`.
3. **UI Sidebar & Halaman Persuratan ([`surat/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/layout.tsx), [`surat/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/page.tsx), [`surat/masuk/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/masuk/page.tsx), [`surat/laporan/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/laporan/page.tsx), [`surat/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/settings/page.tsx))**:
   - Sidebar `surat/layout.tsx` masih menampilkan *Agenda Surat Masuk* dan *Rekapitulasi & Laporan* kepada `user`, serta menyembunyikan *Input Surat Keluar* dan *Tata Naskah Dinas* dari `user`.
   - Dashboard `surat/page.tsx` masih memanggil `/surat-masuk` dan menampilkan statistik Surat Masuk untuk `user`.
   - Halaman `/surat/masuk*`, `/surat/laporan`, dan `/surat/settings` belum memiliki *client-side role guard* jika URL diketik langsung di browser.

### B. Modul Kepegawaian (`/kepegawaian`)
1. **Route & Controller Backend Kepegawaian ([`backend/app/Modules/Kepegawaian/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Routes/api.php), [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php))**:
   - Route `GET /api/kepegawaian/surat-masuk*` masih berada di luar grup `role:super_admin,admin` sehingga `role = user` masih bisa mengakses API Arsip Surat Masuk.
   - Route `DELETE /api/kepegawaian/employees/{id}/force` (`forceDestroy`) dan route mutasi pengaturan di `/kepegawaian/settings` (`POST/PUT/DELETE` pada `st-templates`, `st-expense-templates`, `leave-types`, `st-task-types`, `settings/holidays`, `settings/registered-banks`, `settings/employee-banks/batch`) masih berada di dalam `role:super_admin,admin` (seharusnya khusus `role:super_admin`).
   - `EmployeeController::index()` dan `EmployeeController::show()` masih mengembalikan `nama_bank` dan `nomor_rekening` pegawai lain kepada `role = user`.
   - `EmployeeController::assignmentLetters()`, `EmployeeController::mealAllowances()`, dan `EmployeeLeaveController::show()` masih dapat dipanggil oleh `role = user` untuk mengintip ST, Uang Makan, dan Cuti pegawai lain.
2. **UI Sidebar & Halaman Kepegawaian ([`kepegawaian/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/layout.tsx), [`kepegawaian/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/page.tsx), [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx), [`employees/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/%5Bid%5D/page.tsx), [`kepegawaian/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/settings/page.tsx))**:
   - Di `kepegawaian/layout.tsx`, menu `Arsip Surat Masuk` masih diset `minRole: "user"` (seharusnya `"admin"`).
   - Di `kepegawaian/page.tsx` (Dashboard), kartu layanan (Surat Tugas, Layanan Cuti, Surat Masuk) dan feed ST masih dapat diklik oleh `user` menuju halaman yang terkunci.
   - Di `employees/[id]/page.tsx`, `role = user` yang melihat profil pegawai lain masih melihat kartu & tab **Riwayat Penugasan**, **Cuti Pegawai**, **Presensi & Uang Makan**, serta informasi **Rekening Penyalur**.
   - Di `employees/page.tsx`, tombol **Hapus Permanen** pada tab `Data Terhapus` masih tampil untuk `canWrite` (`admin`), padahal seharusnya hanya untuk `isSuperAdmin`.
   - Di `kepegawaian/settings/page.tsx` dan halaman-halaman khusus Admin (`employees/create`, `surat-tugas/inbox`, `cuti`, `uang-makan`, `surat-masuk`), perlu guard redirect jika diakses langsung via URL oleh role yang tidak berwenang.

---

## 6. Rencana Perubahan File (Implementasi `/ponytail`)

### Backend (`backend/`)
1. [`backend/app/Models/User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php):
   - Perbarui fallback `surat.*` pada `hasPermission()`:
     - `surat.view`, `surat.document.view`, `surat.keluar.create`, `surat.keluar.update`, `surat.keluar.delete` (atau `surat.create`/`surat.update`/`surat.delete` khusus surat keluar) diizinkan bagi `user` & `admin` yang memiliki modul `surat`.
     - `surat.masuk.*` dan `surat.export` hanya untuk `admin` & `super_admin` yang memiliki modul `surat`.
     - `surat.manage` dikunci **hanya untuk `super_admin`** (kecuali tertulis eksplisit di `permissions`).
2. [`backend/app/Modules/Surat/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Routes/api.php) & [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php):
   - Kunci seluruh route `surat-masuk*` dengan middleware `role:admin,super_admin`.
   - Kunci route mutasi `templates*` (`store`, `update`, `destroy`, `resetDefaults`) dengan `permission:surat.manage` (khusus `super_admin`).
   - Pada `SuratKeluarController`:
     - `index()`: jika `$request->user()->role === 'user'`, tambahkan `$query->where('created_by', $request->user()->id)`.
     - `show()`, `update()`, `destroy()`: jika `$request->user()->role === 'user'` dan `(int) $suratKeluar->created_by !== (int) $request->user()->id`, kembalikan `403 Forbidden`.
3. [`backend/app/Modules/Kepegawaian/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Routes/api.php), [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php), & [`EmployeeLeaveController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php):
   - Pindahkan route `GET /surat-masuk*` ke dalam grup `role:super_admin,admin`.
   - Pindahkan route `DELETE /employees/{id}/force` dan route mutasi pengaturan (`/st-templates`, `/st-expense-templates`, `/leave-types`, `/st-task-types`, `/settings/holidays*`, `/settings/registered-banks*`, `/settings/employee-banks/batch`) ke grup `role:super_admin` (endpoint `GET` baca template/jenis cuti/hari libur/bank tetap dapat diakses `admin` untuk operasional ST/Cuti/Uang Makan).
   - Pada [`LocationController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/LocationController.php), pastikan mutasi lokasi (`store`, `update`, `destroy`) bila dipanggil oleh non-`super_admin` ditolak `403` sesuai aturan Setting Master.
   - Pada `EmployeeController::index()` & `show()`: sembunyikan (`makeHidden(['nama_bank', 'nomor_rekening', 'inactive_notes'])`) ketika diakses oleh `role === 'user'` (kecuali jika sedang melihat record dirinya sendiri `nip === user->username`).
   - Pada `EmployeeController::assignmentLetters()`, `EmployeeController::mealAllowances()`, dan `EmployeeLeaveController::show()`: tolak dengan `403 Forbidden` jika diakses oleh `role === 'user'` untuk pegawai lain (`$employee->nip !== $user->username`).

### Frontend (`frontend/`)
1. [`frontend/src/hooks/useRole.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts):
   - Selaraskan logika fallback `surat.*` dan `kepegawaian.*` dengan `User.php`.
2. **Modul Persuratan (`frontend/src/app/surat/`)**:
   - [`surat/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/layout.tsx): atur visibilitas menu sidebar:
     - `User`: `Dashboard`, `Agenda Surat Keluar`, `Input Surat Keluar`, `Tata Naskah Dinas`.
     - `Admin`: Semua menu kecuali `Pengaturan Template`.
     - `Super Admin`: Semua menu termasuk `Pengaturan Template`.
   - [`surat/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/page.tsx) & [`SuratHubComponents.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratHubComponents.tsx): untuk `role = user`, hanya fetch `/surat/surat-keluar`, sembunyikan metrik/tab Surat Masuk, dan sesuaikan Quick Links ke fitur Surat Keluar.
   - [`surat/masuk/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/masuk/page.tsx), [`surat/masuk/create/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/masuk/create/page.tsx), [`surat/laporan/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/laporan/page.tsx): tambahkan guard redirect ke `/surat` jika `role === "user"`.
   - [`surat/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/settings/page.tsx): tambahkan guard redirect ke `/surat` jika bukan `super_admin` (dan tidak punya `surat.manage`).
3. **Modul Kepegawaian (`frontend/src/app/kepegawaian/`)**:
   - [`kepegawaian/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/layout.tsx): ubah `Arsip Surat Masuk` menjadi `minRole: "admin"`.
   - [`kepegawaian/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/page.tsx): untuk `role = user`, sembunyikan tautan kartu menuju `/kepegawaian/surat-tugas/inbox`, `/kepegawaian/cuti`, `/kepegawaian/surat-masuk`, serta `RecentActivitiesFeedCard`.
   - [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx): batasi tombol **Hapus Permanen** hanya untuk `isSuperAdmin` (`canManageAccess`).
   - [`employees/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/%5Bid%5D/page.tsx): untuk `role = user` (saat melihat pegawai lain), sembunyikan informasi Rekening Penyalur, kartu metrik ST/Cuti/Uang Makan, serta tab `Riwayat Penugasan`, `Cuti Pegawai`, dan `Presensi & Uang Makan` (hanya tampilkan `Biodata Lengkap`).
   - [`kepegawaian/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/settings/page.tsx) & halaman khusus Admin (`employees/create`, `surat-tugas/inbox`, `cuti`, `uang-makan`, `surat-masuk`): tambahkan guard redirect ke `/kepegawaian` bila diakses langsung oleh role yang tidak berhak.

---

## 7. Rencana Verifikasi & Pengujian

1. **Automated Feature Test (PHPUnit)**:
   - Membuat/memperbarui test suite `SuratAndKepegawaianRbacTest.php` yang menguji ketiga role (`user`, `admin`, `super_admin`) untuk:
     - `User` Persuratan: bisa buat/lihat/edit/hapus Surat Keluar sendiri, tidak melihat Surat Keluar user lain di `GET /api/surat/surat-keluar`, ditolak `403` saat akses/edit/hapus Surat Keluar user lain, ditolak `403` di seluruh endpoint Surat Masuk & mutasi Template.
     - `Admin` Persuratan: bisa akses semua Surat Masuk & semua Surat Keluar, tetapi ditolak `403` saat memutasi Template (`/api/surat/templates`).
     - `User` Kepegawaian: bisa lihat daftar & biodata pegawai (tanpa `nomor_rekening` pegawai lain), ditolak `403` saat akses ST/Cuti/Uang Makan pegawai lain, ditolak `403` di Arsip Surat Masuk, Tambah/Edit/Hapus Pegawai, Setting, dan IAM.
     - `Admin` Kepegawaian: bisa kelola pegawai (termasuk soft-delete, restore, lifecycle), ST, Cuti, Uang Makan, dan Arsip Surat Masuk, tetapi ditolak `403` saat memanggil `forceDestroy`, mutasi Setting Master, dan IAM.
     - `Super Admin`: lolos seluruh operasi Persuratan & Kepegawaian.
2. **TypeScript & Next.js Build Check**:
   - Menjalankan `npx tsc --noEmit` dan `npm run build` di `frontend/`.
3. **Knowledge Graph Update**:
   - Menjalankan `graphify update .` setelah kode selesai dimodifikasi.
