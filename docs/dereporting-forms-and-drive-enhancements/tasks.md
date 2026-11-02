# Tasks v2: Rencana Kerja Peningkatan DeReporting & BKSDA Drive (Revisi Terverifikasi)

> **Dokumen Terkait**: [requirements.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/requirements.md) | [design.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/design.md)
> **Pedoman Eksekusi**: Mengikuti prinsip `/ponytail` (minimalis, tanpa dependensi berlebih, aman, efisien, dan menyertakan 1 runnable test file per fase).

---

## Daftar Tahapan Pekerjaan (Phases)

### 📌 Fase 1: Integrasi Otomatis Foto Form DeReporting ke BKSDA Drive & Shortcut UI
- [x] **1.1. Migrasi Database PostgreSQL**:
  - Buat migrasi penambahan kolom `drive_folder_id` (nullable foreign key ke `drive_folders.id`) pada tabel `dr_forms`.
- [x] **1.2. Direct S3 Upload & Registrasi DriveFile**:
  - Pada `FormBuilderController::submitPublic()`, simpan file langsung ke disk S3 `drive` di bawah folder Unit Balai Samarinda (`balai-samarinda`).
  - Catat record `DriveFile` dengan `unit_id` terisi (bebas kuota pribadi pegawai pembuat form) dan format komposit `source_id = "{$response->id}:{$fieldId}:{$index}"`.
- [x] **1.3. Otorisasi Pembuat Form di `DriveAccess.php`**:
  - Berikan izin baca, tulis, unduh, dan bagikan otomatis kepada pembuat formulir (`dr_forms.created_by`).
- [x] **1.4. Pintasan UI**:
  - Tombol ikon Drive di kartu formulir ([`frontend/src/app/dereporting/forms/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/page.tsx)).
  - Tombol **"Buka Folder di BKSDA Drive"** di halaman tanggapan ([`frontend/src/app/dereporting/forms/[id]/responses/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/%5Bid%5D/responses/page.tsx)).
- [x] **1.5. Automated Test Suite (Self-Check)**:
  - Buat `backend/tests/Feature/DeReportingDriveIntegrationTest.php`:
    - Tes submit formulir publik dengan upload foto $\rightarrow$ file tersimpan di S3 `drive` $\rightarrow$ tercatat di `drive_files` $\rightarrow$ kuota pribadi pembuat form tetap 0 byte terpakai $\rightarrow$ pembuat form memiliki izin `canWriteFile`.
  - Verifikasi runnable: `php artisan test --filter="DeReportingDriveIntegrationTest"`.

---

### 📌 Fase 2: Multi-File Upload & Notifikasi Real-Time (Portal & WebSocket)
- [x] **2.1. Skema Multi-File di Form Builder**:
  - Pertanyaan tipe `file` mendukung opsi `max_files` (1 s.d. 5 berkas).
- [x] **2.2. Kompresi Gambar Sisi Klien di `/lapor/[slug]`**:
  - Responden dapat memilih hingga 5 foto sekaligus dari galeri HP/PC.
  - Kompresi canvas otomatis ($\le$ 1600px JPEG) sebelum dikirim untuk menjaga total payload di bawah 25 MB.
- [x] **2.3. Validasi & Sanitasi Backend**:
  - Pengecekan MIME *magic bytes* (`finfo`) pada setiap file yang masuk.
  - Penolakan berkas executable atau zip/rar di formulir publik.
- [x] **2.4. Notifikasi Real-Time WebSocket**:
  - Pemicu `PortalNotificationService::notify()` ke `created_by` saat ada laporan baru dari publik.
- [x] **2.5. Automated Test Suite (Self-Check)**:
  - Buat tes verifikasi multi-upload & push notifikasi di `DeReportingDriveIntegrationTest.php`.
  - Verifikasi runnable: `php artisan test --filter="DeReportingDriveIntegrationTest"`.

---

### 📌 Fase 3: Fitur BKSDA Drive — Unduh Folder sebagai ZIP & Pindah Berkas/Folder
- [x] **3.1. Service ZipStream Backend**:
  - Buat `DriveZipStreamService` memanfaatkan `maennchen/zipstream-php` yang sudah tersedia di `composer.lock`.
  - Endpoint `POST /api/drive/folders/{id}/zip-token` menghasilkan signed URL sementara (15 menit).
  - Endpoint `GET /api/drive/folders/{id}/download-zip` men-stream arsip ZIP on-the-fly dengan proteksi anti *zip-slip*.
- [x] **3.2. UI Unduh Folder di BKSDA Drive**:
  - Tombol menu aksi **"Unduh sebagai ZIP"** pada folder di BKSDA Drive.
  - Trigger unduhan langsung browser native tanpa memakan RAM JavaScript.
- [x] **3.3. Endpoint & UI Pindah Berkas/Folder (*Move To*)**:
  - `POST /api/drive/files/{id}/move` dan `POST /api/drive/folders/{id}/move` dengan validasi anti-circular parent.
  - Modal pohon folder di frontend Drive untuk memilih folder tujuan.
- [x] **3.4. Automated Test Suite (Self-Check)**:
  - Buat `backend/tests/Feature/DriveZipDownloadTest.php`:
    - Tes pembuatan signed URL $\rightarrow$ tes download stream ZIP $\rightarrow$ verifikasi integritas isi ZIP.
  - Verifikasi runnable: `php artisan test --filter="DriveZipDownloadTest"`.

---

### 📌 Fase 4: Visualisasi Grafik Ringkasan Tanggapan (Summary Visual Analytics)
- [x] **4.1. Endpoint Agregasi Data Backend**:
  - `GET /api/dereporting/forms/{id}/summary`: Menghitung frekuensi jawaban pilihan ganda, checkbox, dan galeri foto dengan query agregasi SQL efisien.
- [x] **4.2. Tab Ringkasan di Frontend**:
  - Pasang tab "Ringkasan" di halaman tanggapan ([`frontend/src/app/dereporting/forms/[id]/responses/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/%5Bid%5D/responses/page.tsx)).
  - Menggunakan komponen diagram `recharts` yang sudah terpasang di `frontend/package.json`:
    - Pie Chart untuk pertanyaan pilihan ganda/radio.
    - Bar Chart untuk pertanyaan checkbox & select.
    - Galeri thumbnail gambar dengan `loading="lazy"`.
- [x] **4.3. Automated Test Suite (Self-Check)**:
  - Buat tes verifikasi agregasi summary di `DeReportingDriveIntegrationTest.php`.

---

### 📌 Fase 5: Jadwal Penutupan Form Otomatis & Pertanyaan Koordinat GPS Lapangan
- [x] **5.1. Jadwal Tutup Otomatis**:
  - Kolom `closed_at` dan `closed_message` di builder formulir.
  - Proteksi sisi server: tolak submisi jika waktu sekarang melebihi `closed_at`.
- [x] **5.2. Tipe Pertanyaan Koordinat GPS Lapangan**:
  - Tipe pertanyaan baru: `gps_location` di form builder.
  - Komponen input lokasi di formulir publik menggunakan Geolocation API ponsel + pin point peta `leaflet` / `react-leaflet` yang sudah terpasang.
  - Teks persetujuan privasi (*consent*) bagi pelapor publik.
- [x] **5.3. Automated Test Suite (Self-Check)**:
  - Tes validasi form kedaluwarsa & koordinat GPS di test suite.
