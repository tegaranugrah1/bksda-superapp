# Tasks: Rencana Kerja Peningkatan DeReporting & BKSDA Drive

> **Dokumen Terkait**: [requirements.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/requirements.md) | [design.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/design.md)
> **Pedoman Eksekusi**: Mengikuti prinsip `/ponytail` (minimalis, tanpa dependensi berlebih, aman, dan dapat diverifikasi dengan 1 runnable self-check per fase).

---

## Daftar Tahapan Pekerjaan (Phases)

### 📌 Fase 1: Integrasi Otomatis Foto Form DeReporting ke BKSDA Drive & Shortcut UI
- [ ] **1.1. Migrasi Database**: Buat file migrasi untuk menambahkan `drive_folder_id` pada tabel `dr_forms`.
- [ ] **1.2. Job Antrean Pengarsipan**: Buat `ArchiveFormResponseFilesJob` untuk:
  - Membuat/mengambil folder `Formulir DeReporting > [Judul Form]` di bawah akun Balai/SuperAdmin.
  - Melakukan stream copy berkas lampiran dari disk sementara ke disk `drive` (RustFS S3).
  - Mencatat rekaman `drive_files` dengan `source_module = 'dereporting'` dan otomatis memberikan `DriveShare` izin editor ke `form->created_by`.
- [ ] **1.3. Sambungkan ke Submisi Publik**: Panggil job di `FormBuilderController::submitPublic()`.
- [ ] **1.4. Pintasan UI**:
  - Pasang tombol ikon Drive di card formulir ([`frontend/src/app/dereporting/forms/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/page.tsx)).
  - Pasang tombol **"Buka Folder di BKSDA Drive"** di halaman tanggapan ([`frontend/src/app/dereporting/forms/[id]/responses/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/%5Bid%5D/responses/page.tsx)).
- [ ] **Self-Check Fase 1**: Buat formulir uji coba dengan upload foto $\rightarrow$ submit jawaban $\rightarrow$ periksa folder di `/drive` $\rightarrow$ pastikan foto muncul di Drive tanpa memotong kuota pribadi pegawai.

---

### 📌 Fase 2: Multi-File Upload & Notifikasi Email Tanggapan Baru
- [ ] **2.1. Skema Multi-File**: Perbarui Form Builder agar pertanyaan jenis `file` mendukung opsi `max_files` (1 s.d. 10 berkas).
- [ ] **2.2. Validasi Backend Form**: Perbarui `FormBuilderController::submitPublic()` untuk menerima array berkas pada satu pertanyaan berkas.
- [ ] **2.3. Komponen Form Responden**: Perbarui komponen input file di `/lapor/[slug]` agar mendukung multi-file drag-and-drop & pemilihan banyak foto dari galeri HP.
- [ ] **2.4. Notifikasi Email**:
  - Tambahkan toggle `email_notifications_enabled` pada pengaturan form.
  - Kirim email ringkasan ke email terverifikasi pembuat form saat tanggapan baru berhasil dikirim via failover mailer.
- [ ] **Self-Check Fase 2**: Submit form dengan 3 foto sekaligus $\rightarrow$ periksa ketiga foto tersimpan rapi di DB dan Drive $\rightarrow$ pembuat form menerima notifikasi email.

---

### 📌 Fase 3: Fitur BKSDA Drive — Unduh Folder sebagai ZIP & Pindah Berkas/Folder
- [ ] **3.1. Service ZipStream Backend**: Implementasikan endpoint `POST /api/drive/folders/{id}/download-zip` dengan streaming *on-the-fly* langsung dari RustFS S3.
- [ ] **3.2. UI Unduh Folder**: Tambahkan opsi menu **"Unduh sebagai ZIP"** pada klik kanan / menu titik tiga folder di BKSDA Drive.
- [ ] **3.3. Endpoint Pindah (Move To)**:
  - `POST /api/drive/files/{id}/move`
  - `POST /api/drive/folders/{id}/move` dengan validasi anti-circular parent.
- [ ] **3.4. Dialog UI "Pindahkan ke..."**: Modal pohon folder di antarmuka Drive untuk memilih folder tujuan.
- [ ] **Self-Check Fase 3**: Klik unduh ZIP pada folder berisi berkas $\rightarrow$ berkas .zip terunduh dan dapat diekstrak utuh $\rightarrow$ uji pemindahan berkas ke folder lain.

---

### 📌 Fase 4: Fitur BKSDA Drive — Transfer Kepemilikan & Filter Chips
- [ ] **4.1. Endpoint Transfer Kepemilikan**:
  - `POST /api/drive/folders/{id}/transfer-ownership`
  - Rekursif update `user_id` seluruh folder dan berkas, serta sematkan `DriveShare` editor ke pemilik lama.
- [ ] **4.2. UI Dialog Transfer**: Tombol aksi "Serahkan Kepemilikan ke SuperAdmin/Pegawai" lengkap dengan konfirmasi pembebasan kuota.
- [ ] **4.3. Filter Chips di Toolbar Drive**: Tombol filter cepat kategori `[Semua]`, `[Foto/Gambar]`, `[Dokumen PDF]`, `[Excel]`.
- [ ] **Self-Check Fase 4**: Lakukan transfer kepemilikan folder $\rightarrow$ kuota storage user asal berkurang seketika $\rightarrow$ user asal tetap bisa membuka dan mengunduh berkas.

---

### 📌 Fase 5: Visualisasi Grafik Ringkasan Jawaban (Summary Analytics)
- [ ] **5.1. Agregasi Backend**: Implementasikan endpoint `GET /api/dereporting/forms/{id}/summary` yang menghitung frekuensi jawaban pilihan ganda, checkbox, dan galeri foto.
- [ ] **5.2. Tab Ringkasan di Frontend**: Buat tab "Ringkasan" di halaman `/dereporting/forms/[id]/responses` dengan komponen diagram visual (Pie / Bar Chart).
- [ ] **Self-Check Fase 5**: Buka tab ringkasan formulir yang sudah memiliki tanggapan $\rightarrow$ diagram persentase pilihan ganda dan galeri foto tampil interaktif.

---

### 📌 Fase 6: Jadwal Penutupan Otomatis & Pertanyaan Koordinat GPS Lapangan
- [ ] **6.1. Pengaturan Jadwal Tutup**: Input `closed_at` dan `closed_message` di builder formulir.
- [ ] **6.2. Proteksi Submisi**: Validasi batas waktu saat responden membuka dan mengirimkan `/lapor/[slug]`.
- [ ] **6.3. Tipe Pertanyaan GPS Lapangan**:
  - Pertanyaan `gps_location` di builder.
  - Tombol *"Ambil Lokasi GPS Saya"* + peta interaktif di formulir responden.
- [ ] **Self-Check Fase 6**: Coba formulir yang telah kedaluwarsa $\rightarrow$ muncul pesan penutupan resmi. Uji pertanyaan GPS di ponsel $\rightarrow$ koordinat lintang & bujur tersimpan akurat.
