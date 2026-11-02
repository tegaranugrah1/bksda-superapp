# Requirements v2: Peningkatan DeReporting Form Builder & BKSDA Drive (Revisi Berdasarkan Hasil Audit)

> **Dokumen Terkait**: [design.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/design.md) | [tasks.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/tasks.md)
> **Target Modul**: DeReporting (`/dereporting`), Form Publik (`/lapor/[slug]`), dan BKSDA Drive (`/drive`)
> **Baseline Infrastruktur Diverifikasi**: Laravel 13, Next.js 15, PostgreSQL 16 (UUID `dr_forms.id`), RustFS S3 (`drive`), Nginx/PHP Limit 25M, WebSocket Laravel Reverb

---

## 1. Keputusan Desain Terkunci (Locked Decisions)

| # | Aspek | Keputusan | Alasan & Bukti Kode |
|---|---|---|---|
| **D1** | **Lokasi & Kepemilikan Folder Form** | Selalu milik **SuperAdmin / Balai BKSDA Samarinda** (`unit_id: balai-samarinda` kuota 100 GB atau `user_id: SuperAdmin`) | Kuota pribadi pegawai 5 GB **tidak tersedot sama sekali (0 byte terpakai)**. |
| **D2** | **Hak Akses Pembuat Form** | Pembuat form otomatis diakui oleh `DriveAccess` sebagai **Editor / Manager** | Pembuat form berhak melihat, mengunduh, pratinjau foto, dan membagikan (*share*) tanpa butuh tabel relasi share per-file yang rapuh. |
| **D3** | **Notifikasi Tanggapan Baru** | **Murni Portal Notification + WebSocket (Laravel Reverb)** | Hemat kuota email Resend 100/hari; push notifikasi instan (< 100 ms) ke lonceng pembuat form saat ada entri baru. |
| **D4** | **Penyimpanan Berkas Langsung** | Tulis berkas langsung ke disk S3 `drive` saat submit | Menghindari penyimpanan ganda (*no double storage*) dan tidak perlu job pemindahan manual. |
| **D5** | **Kompresi Gambar Sisi Klien** | Resize sisi klien via HTML5 Canvas (maks. 1600px JPEG) sebelum unggah | Memastikan multi-file upload (hingga 5 foto) aman di bawah batas server 25 MB (`post_max_size=25M`). |
| **D6** | **Unduh Folder ZIP** | HTTP GET via `URL::temporarySignedRoute` langsung streaming ke browser | Menghindari *memory leak* browser (tidak memakai Axios `responseType: blob` di RAM) dan anti *zip-slip*. |

---

## 2. Kebutuhan Fungsional (Functional Requirements)

### A. Integrasi DeReporting ke BKSDA Drive
- **FR-DRV-01 (Folder Otomatis Form)**: Setiap formulir dinamis otomatis memiliki folder khusus di BKSDA Drive:
  `Drive Bersama > Balai BKSDA Samarinda > Formulir DeReporting > [Judul Formulir] (Tanggapan)`
- **FR-DRV-02 (Alokasi Kuota Bebas Pegawai)**: Seluruh berkas lampiran formulir dialokasikan ke kuota Unit Balai (100 GB), **tidak memotong kuota 5 GB pribadi pegawai pembuat form**.
- **FR-DRV-03 (Hak Kelola Pembuat Form)**: Pembuat formulir (`dr_forms.created_by`) otomatis memiliki izin baca, tulis, pratinjau, dan bagikan di BKSDA Drive.
- **FR-DRV-04 (Pintasan Akses Cepat di UI)**:
  - Tombol **`Buka Folder di Drive`** tersedia di card form ([`/dereporting/forms`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/page.tsx)) dan halaman tanggapan ([`/dereporting/forms/[id]/responses`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/%5Bid%5D/responses/page.tsx)).
  - Tombol **`Bagikan Folder`** untuk menyalin tautan berbagi internal atau link publik ber-password.

### B. Peningkatan DeReporting Form Builder
- **FR-FRM-01 (Multi-File Upload Lapangan)**:
  - Pertanyaan jenis berkas dapat menerima 1 s.d. 5 berkas sekaligus.
  - Kompresi foto otomatis di browser responden sebelum pengiriman.
  - Format publik dibatasi ketat: `jpg, jpeg, png, webp, pdf` dengan validasi MIME *magic bytes* (`finfo`).
- **FR-FRM-02 (Notifikasi Real-Time Portal & WebSocket)**:
  - Event WebSocket `PortalNotificationCreated` langsung memunculkan badge lonceng di portal pembuat form saat ada laporan baru dari masyarakat/lapangan.
- **FR-FRM-03 (Visualisasi Grafik Tanggapan / Visual Analytics)**:
  - Tab "Ringkasan" di halaman tanggapan:
    - Diagram lingkaran (*pie chart*) untuk pilihan ganda & radio.
    - Diagram batang (*bar chart*) untuk checkbox/dropdown.
    - Galeri kisi thumbnail (*lazy load*) untuk foto lampiran.
- **FR-FRM-04 (Jadwal Tutup Form & Pesan Penutupan)**:
  - Pengaturan tanggal & waktu penutupan otomatis (`closed_at`) dan pesan penutupan resmi BKSDA Kaltim.
- **FR-FRM-05 (Pertanyaan Titik Koordinat GPS / Peta Interaktif)**:
  - Tipe pertanyaan baru: `gps_location` dengan tombol *"Ambil Lokasi Saya (GPS)"* + pin point peta Leaflet/OpenStreetMap.

### C. Peningkatan Fitur BKSDA Drive
- **FR-DRV-05 (Download Seluruh Folder as ZIP)**:
  - Menu aksi folder: **"Unduh sebagai ZIP"**.
  - URL bertanda tangan sementara (`temporarySignedRoute`) dengan streaming *on-the-fly* via `ZipStream-PHP`.
  - Sanitasi nama entri di dalam file zip untuk mencegah kerentanan *zip-slip*.
- **FR-DRV-06 (Pindahkan Berkas & Folder / Move To)**:
  - Menu aksi *"Pindahkan ke..."* (*Move to*) dengan modal pohon folder, dilengkapi validasi anti-circular parent.
- **FR-DRV-07 (Filter Chips Pencarian)**:
  - Toolbar Drive menyediakan filter chip cepat: `Semua`, `Foto & Gambar`, `Dokumen PDF`, `Spreadsheet Excel`.
- **FR-DRV-08 (Panel Informasi & Detail Berkas)**:
  - Sidebar info **( ⓘ )** menampilkan detail berkas, ukuran, waktu unggah, dan hak berbagi.

---

## 3. Batasan Keamanan & Kepatuhan (Security & Non-Functional Requirements)

1. **Proteksi Anti-Abuse Kuota Publik (S1)**:
   - Pembatasan kuota akumulatif per formulir (maksimal 5 GB per formulir publik).
   - Throttle ketat pada submit publik (`throttle:15,1`) dan penolakan jika kuota formulir telah melampaui batas.
2. **Sanitasi File Publik & Verifikasi Magic Bytes (S2)**:
   - Formulir publik menolak berkas arsip (`.zip`, `.rar`) dan skrip berbahaya. Hanya menerima media gambar dan PDF.
   - Pengecekan keaslian berkas dengan `finfo` magic bytes sebelum disimpan ke S3.
3. **Keamanan Streaming ZIP & Pencegahan Zip-Slip (S3)**:
   - Nama berkas di dalam ZIP dibersihkan dari karakter `../`, `..\\`, dan separator direktori terlarang.
   - Batas ukuran total arsip folder maksimal 2 GB.
4. **Kepatuhan Tipe Data PostgreSQL**:
   - Kolom foreign key `drive_folder_id` bertipe `BIGINT NULL` (tanpa kata kunci `UNSIGNED`).
   - Penanganan relasi `dr_forms.id` menggunakan UUID.
   - `drive_files.source_id` menggunakan format komposit: `"{response_id}:{field_id}:{file_index}"` untuk memenuhi konstrain `UNIQUE(source_module, source_id)`.
