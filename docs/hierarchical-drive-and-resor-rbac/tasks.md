# Tasks v2: Rencana Kerja Penataan Hierarki 4 Unit BKSDA Drive & Pengorganisasian Subfolder Laporan DeReporting (Standar 10/10)

> **Dokumen Terkait**: [requirements.md](file:///e:/bksda-superapp/docs/hierarchical-drive-and-resor-rbac/requirements.md) | [design.md](file:///e:/bksda-superapp/docs/hierarchical-drive-and-resor-rbac/design.md)
> **Pedoman Eksekusi**: Mengikuti prinsip `/ponytail` (minimalis, tanpa dependensi berlebih, aman, efisien, dan menyertakan runnable self-check test) serta `/security-audit`.
> **Instruksi Khusus**: **JANGAN DI-COMMIT** (semua pengerjaan fase ini dibiarkan uncommitted di working tree hingga diperintahkan oleh pengguna).

---

## Daftar Tahapan Pekerjaan (Phases v2)

### 📌 Fase 1: Skema Database Minimalis & Seeder Folder Hierarki Resmi
- [x] **1.1. Buat File Migrasi Database**:
  - File: `backend/database/migrations/2026_10_30_130000_restructure_drive_units_and_folder_rbac.php`.
  - Tambahkan kolom `is_restricted` (boolean, default false), `folder_scope` (string 32, nullable), `resor_code` (string 32, nullable, indexed), `room_code` (string 32, nullable, indexed) pada tabel `drive_folders`.
  - Tambahkan kolom `drive_folder_id` (unsignedBigInteger, nullable, indexed) pada tabel `dr_form_responses`.
  - Jadikan `drive_shares.file_id` nullable dan tambahkan `folder_id` (unsignedBigInteger, nullable, indexed).
  - Hapus data unit ID 5 s.d. 9 pada tabel `drive_units`.
  - Jalankan `php artisan migrate`.
- [x] **1.2. Buat File Master Konstanta BKSDA**:
  - Backend: `backend/app/Constants/BksdaConstants.php` berisi dictionary 14 resor (`RESORS`) dan 8 ruangan Balai (`BALAI_ROOMS`).
  - Frontend: `frontend/src/app/kepegawaian/_lib/employee-constants.ts` tambahkan array `RESOR_OPTIONS` dengan 14 entri (`code`, `name`, `skw`).
- [x] **1.3. Buat Seeder Folder Hierarki Otomatis**:
  - File seeder: `backend/database/seeders/DriveHierarchicalFoldersSeeder.php` atau artisan command.
  - Generate otomatis:
    - 4 Folder Resor di SKW I (`resor_01` s.d. `resor_04`, `unit_id = 2`, `is_restricted = true`, `folder_scope = 'resor'`).
    - 5 Folder Resor di SKW II (`resor_05` s.d. `resor_09`, `unit_id = 3`, `is_restricted = true`, `folder_scope = 'resor'`).
    - 5 Folder Resor di SKW III (`resor_10` s.d. `resor_14`, `unit_id = 4`, `is_restricted = true`, `folder_scope = 'resor'`).
    - 8 Folder Ruangan di Balai Samarinda (`unit_id = 1`, `is_restricted = false`, `folder_scope = 'ruangan'`).

---

### 📌 Fase 2: Otorisasi Anti-Celah Keamanan di `DriveAccess.php` & Backend Drive
- [x] **2.1. O(1) Memoization & Otorisasi Admin Drive**:
  - Di `backend/app/Support/Security/DriveAccess.php`, tambahkan helper `getEmployee(User $user): ?Employee` dengan memoization properti `_memoized_employee`.
  - Tambahkan helper `isDriveAdmin(User $user): bool` (true jika `super_admin` atau memiliki modul `'drive'` di `access_modules`).
- [x] **2.2. Otorisasi Folder Terisolasi (`canReadFolder` & `canWriteFolder`)**:
  - Perbarui `canReadFolder(User $user, DriveFolder $folder): bool`:
    - Izinkan jika `isDriveAdmin($user)` atau `folder->user_id === $user->id`.
    - Jika `is_restricted = true`: cek `drive_shares` folder atau kecocokan `employee->resor === folder->resor_code`.
    - Jika `is_restricted = false`: warisi izin unit (`canRead($user, $unit)`).
- [x] **2.3. Anti-IDOR pada Berkas (`canReadFile` & `canWriteFile`)**:
  - Perbarui `canReadFile(User $user, DriveFile $file): bool`: jika `$file->folder_id` berada di folder `is_restricted`, delegasikan ke `canReadFolder($user, $file->folder)`.
- [x] **2.4. Anti-Kebocoran Pencarian Berkas di `DriveController::index`**:
  - Pada query `search`, cari folder-folder restricted yang tidak berhak diakses user, dan tambahkan `whereNotIn('folder_id', $forbiddenIds)`.
- [x] **2.5. Anti-Bulk ZIP Traversal Leakage di `DriveController::addFolderToZipStream`**:
  - Tambahkan pengecekan `DriveAccess::canReadFolder($user, $sub)` pada setiap subfolder sebelum menambahkannya ke dalam ZipStream.
- [x] **2.6. Perbaikan Query Tab "Dibagikan kepada Saya" di `DriveController::index`**:
  - Ganti `$folderQuery->whereRaw('1 = 0')` dengan query `drive_shares.folder_id` agar folder bersama muncul di tab `shared_with_me`.
- [x] **2.7. Pewarisan Subfolder di `DriveController::createFolder`**:
  - Subfolder baru otomatis mewarisi `is_restricted`, `folder_scope`, dan `resor_code` dari parent folder.

---

### 📌 Fase 3: Pengorganisasian Subfolder Laporan DeReporting & Ringkasan Laporan
- [x] **3.1. Pembuatan Subfolder per Judul Laporan di `FormBuilderController::submitPublic`**:
  - Ekstrak judul laporan dan nama pelapor dengan *heuristic matcher* dari array `$form->fields`.
  - Bersihkan string dari karakter ilegal `\ / : * ? " < > | \r \n \t` dan batasi panjang maksimal 80 karakter.
  - Tambahkan hash 4 karakter dari UUID (`#{$shortHash}`) untuk menjamin 100% keunikan nama subfolder.
  - Simpan berkas foto langsung ke subfolder ini dan catat `dr_form_responses.drive_folder_id = $subfolder->id`.
- [x] **3.2. Generator Otomatis `Ringkasan_Laporan.txt`**:
  - Susun teks ringkasan respon (Tanggal, Judul, Pelapor, Titik GPS, Jawaban Isian).
  - Simpan ke disk `drive` di path `units/balai-samarinda/dereporting/{form->slug}/{responseId}/Ringkasan_Laporan.txt`.
  - Buat record `DriveFile` dengan `source_module = 'dereporting'` dan `source_id = "{$responseId}:summary:txt"`.
- [x] **3.3. Kolom "Link Folder Drive" pada Export CSV/Excel**:
  - Di `FormBuilderController::exportCsv`, tambahkan kolom `Link Folder Drive` dengan nilai URL langsung:
    `config('app.url') . "/drive?space=1&folder_id=" . $resp->drive_folder_id`.
- [x] **3.4. Endpoint Virtual Sharing Laporan ke Resor/Seksi**:
  - Buat endpoint `POST /api/dereporting/forms/responses/{id}/share` yang mencatat entri pada `drive_shares` dengan `folder_id` terisi.
  - Tambahkan tombol aksi *"Buka Folder di Drive"* pada setiap baris di `frontend/src/app/dereporting/forms/[id]/responses/page.tsx`.

---

### 📌 Fase 4: Dropdown Resor Penempatan di Modul Kepegawaian & Auto-Sync
- [x] **4.1. Dropdown Resor Penempatan di UI Edit Pegawai**:
  - Di `frontend/src/app/kepegawaian/employees/[id]/page.tsx`, tambahkan dropdown "Resor Penempatan" di bawah field Satuan Kerja.
  - Dropdown terfilter dinamis berdasarkan Satuan Kerja yang dipilih (SKW I / II / III).
  - Jika Satuan Kerja Balai dipilih, dropdown otomatis di-disable dan nilainya diset kosong (`null`).
- [x] **4.2. Validasi Silang di `backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php`**:
  - Validasi rule: jika `satuan_kerja` mengandung kata "balai", maka `resor` wajib `null`.
  - Jika memilih SKW I, II, atau III, nilai `resor` wajib terdaftar di `BksdaConstants::RESORS`.
- [x] **4.3. Verifikasi Mutasi Seketika**:
  - Validasi bahwa saat mutasi disimpan, hak akses folder resor lama otomatis terputus dan folder baru otomatis terbuka tanpa delay.

---

### 📌 Fase 5: Modul "Admin Drive" di Sheet Hak Akses & UI Privasi Folder
- [x] **5.1. Modul "BKSDA Drive" di Sheet Hak Akses Pegawai**:
  - Di `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx`, tambahkan item:
    `{ id: "drive", label: "BKSDA Drive", description: "Admin Penyimpanan Cloud & Manajemen Berkas" }` pada `AVAILABLE_MODULES`.
- [x] **5.2. Visual Indikator Folder Terkunci di Frontend Drive**:
  - Di `frontend/src/app/drive/_components/DriveFileList.tsx`, tampilkan ikon `Lock` berwarna amber untuk folder berstatus `is_restricted`.
  - Sediakan menu "Atur Admin Resor" bagi Superadmin/Admin Drive untuk mengubah `user_id` folder (penunjukan Admin Resor) dan membagikan folder via modal Share yang sudah ada.

---

### 📌 Fase 6: Automated Test Suite (Self-Check) & Verifikasi Menyeluruh
- [x] **6.1. Buat Feature Test PHPUnit (`DriveHierarchicalResorRBACTest.php`)**:
  - Lokasi: `backend/tests/Feature/DriveHierarchicalResorRBACTest.php`.
  - Tes 1: Pegawai Resor 02 hanya bisa melihat dan membaca folder Resor 02 di SKW I.
  - Tes 2: Pegawai kantor seksi tanpa penugasan resor ditolak mengakses folder Resor 02 (HTTP 403).
  - Tes 3 (Anti-IDOR): Pegawai seksi ditolak mengunduh URL berkas yang ada di folder Resor 02 via `/api/drive/files/{id}/url`.
  - Tes 4 (Anti-Search Leak): Berkas di folder Resor 02 tidak muncul saat pegawai seksi melakukan pencarian di unit SKW I.
  - Tes 5 (Anti-Bulk ZIP Leak): Unduhan ZIP folder SKW I tidak menyertakan berkas folder Resor 02 bagi staf umum seksi.
  - Tes 6 (Shared With Me): Folder yang dibagikan via `drive_shares` muncul di query tab `shared_with_me`.
  - Tes 7 (Subfolder DeReporting): Submisi form dengan lampiran membuat subfolder unik dan file `Ringkasan_Laporan.txt` di dalamnya.
  - Tes 8 (Export CSV): Kolom Link Folder Drive terisi URL subfolder yang benar.
  - Tes 9 (Mutasi Dinamis & Validasi Silang): Mengubah penempatan pegawai dari Resor 02 ke Resor 06 seketika mencabut akses Resor 02 dan membuka akses Resor 06, serta menolak penempatan resor jika satuan kerja Balai.
  - Tes 10 (Admin Drive): User dengan modul `drive` memiliki akses penuh ke seluruh unit dan folder.
  - Jalankan `php artisan test --filter="DriveHierarchicalResorRBACTest"`.
- [x] **6.2. Verifikasi Kompilasi Frontend TypeScript**:
  - Jalankan `cd frontend && npx tsc --noEmit` untuk memastikan 0 error tipe data.
- [x] **6.3. Update Dokumentasi Progress**:
  - Perbarui `docs/progress.md` dengan status Phase 230 selesai.
