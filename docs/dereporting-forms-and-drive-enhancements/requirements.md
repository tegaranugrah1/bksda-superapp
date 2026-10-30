# Requirements: Peningkatan DeReporting Form Builder & BKSDA Drive (Setara Google Forms & Google Drive)

> **Dokumen Terkait**: [design.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/design.md) | [tasks.md](file:///e:/bksda-superapp/docs/dereporting-forms-and-drive-enhancements/tasks.md)
> **Target Modul**: DeReporting (`/dereporting`), Form Publik (`/lapor/[slug]`), dan BKSDA Drive (`/drive`)
> **Baseline Infrastruktur**: Laravel 13, Next.js 15, PostgreSQL 16, RustFS S3 (`drive`), Failover Mailer (Resend + Brevo)

---

## 1. Latar Belakang & Masalah Nyata

1. **Pengelolaan Foto Hasil Formulir DeReporting**:
   - Saat ini responden dapat mengunggah berkas/foto pada formulir dinamis DeReporting (`dr_forms`), namun berkas hanya tersimpan di disk lokal privat (`private/dereporting/forms/...`) tanpa terintegrasi ke **BKSDA Drive**.
   - Pembuat formulir kesulitan mengorganisir, mencari, meninjau pratinjau foto (*lightbox preview*), dan membagikan galeri foto laporan lapangan kepada pihak lain atau pimpinan.
   - Jika berkas disimpan di ruang pribadi pembuat form, kuota 5 GB milik pegawai akan cepat habis oleh foto resolusi tinggi dari masyarakat/lapangan.

2. **Keterbatasan Form Builder Dibandingkan Google Forms**:
   - Pertanyaan jenis berkas hanya bisa mengunggah **1 file per pertanyaan** (belum mendukung multi-file upload).
   - Belum ada **notifikasi email otomatis** saat tanggapan baru masuk dari lapangan.
   - Belum ada **visualisasi grafik ringkasan** (*summary charts*); data tanggapan baru berupa tabel baris mentah dan CSV.
   - Belum ada fitur **jadwal penutupan formulir otomatis**.
   - Belum ada tipe pertanyaan **titik koordinat GPS/Peta**, padahal sangat krusial untuk laporan patroli, konflik satwa, dan perambahan kawasan BKSDA Kaltim.

3. **Keterbatasan BKSDA Drive Dibandingkan Google Drive**:
   - Belum ada fitur **Download Folder as `.ZIP`**, sehingga pengguna harus mengunduh puluhan foto satu per satu.
   - Belum ada fitur **Pindahkan Berkas/Folder (*Move to*)** untuk merapikan arsip.
   - Belum ada fitur **Transfer Kepemilikan (*Transfer Ownership*)** ke SuperAdmin/Seksi agar kuota pribadi pegawai kembali 0 byte.
   - Belum ada **Filter Chips pencarian** berdasarkan kategori berkas (Gambar, Dokumen PDF, Excel).
   - Belum ada **Panel Detail Berkas (Info Panel)** untuk melihat ringkasan metadata berkas.

---

## 2. Kebutuhan Fungsional (Functional Requirements)

### A. Integrasi DeReporting ke BKSDA Drive
- **FR-DRV-01 (Folder Otomatis Form)**: Setiap formulir dinamis otomatis memiliki folder di BKSDA Drive dengan hierarki:
  `Drive Balai / Formulir DeReporting / [Judul Formulir] (Tanggapan)`
- **FR-DRV-02 (Alokasi Kuota Bebas Pegawai)**: Seluruh berkas lampiran formulir dialokasikan ke kuota SuperAdmin / Balai (atau Unit Kerja terkait), **tidak memotong kuota 5 GB pribadi pegawai pembuat form**.
- **FR-DRV-03 (Hak Kelola Pembuat Form)**: Pembuat formulir otomatis memiliki hak akses penuh (*Manager / Editor*) atas folder dan berkas hasil form tersebut.
- **FR-DRV-04 (Tombol Akses Cepat di UI)**:
  - Tombol **`Buka Folder di Drive`** tersedia di halaman daftar formulir ([`/dereporting/forms`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/page.tsx)) dan halaman tanggapan ([`/dereporting/forms/[id]/responses`](file:///e:/bksda-superapp/frontend/src/app/dereporting/forms/%5Bid%5D/responses/page.tsx)).
  - Tombol **`Bagikan Folder Hasil Form`** untuk membuat tautan berbagi internal atau tautan publik ber-password.

### B. Peningkatan DeReporting Form Builder
- **FR-FRM-01 (Multi-File Upload)**:
  - Pertanyaan jenis berkas dapat dikonfigurasi menerima 1 hingga 10 berkas sekaligus.
  - Responden dapat memilih banyak gambar/dokumen dari galeri ponsel/komputer dalam satu kali aksi.
  - Validasi ukuran maksimal per berkas (default 10 MB) dan jenis ekstensi yang diizinkan.
- **FR-FRM-02 (Notifikasi Email Tanggapan Baru)**:
  - Opsi pengaturan form: *"Kirim notifikasi email ke pembuat form saat ada tanggapan masuk"*.
  - Mengirim ringkasan laporan via mailer transaksional (Resend/Brevo) secara asinkron (*afterResponse / queue*).
- **FR-FRM-03 (Grafik Ringkasan Tanggapan / Visual Analytics)**:
  - Halaman `/responses` menyediakan 2 tab tampilan:
    1. **Ringkasan (*Summary*)**: Diagram lingkaran (*pie chart*) untuk pilihan ganda & radio, diagram batang (*bar chart*) untuk checkbox/dropdown, dan galeri kisi thumbnail untuk foto lampiran.
    2. **Tabel Data & Ekspor**: Tabel mentah seluruh tanggapan + Ekspor CSV yang sudah ada.
- **FR-FRM-04 (Jadwal Tutup Form & Pesan Penutupan)**:
  - Pengaturan tanggal & waktu penutupan otomatis (`closed_at`).
  - Kustomisasi pesan penutupan saat formulir tidak aktif atau melewati batas waktu.
- **FR-FRM-05 (Pertanyaan Titik Koordinat GPS / Peta Interaktif)**:
  - Tipe pertanyaan baru: `gps_location`.
  - Di halaman pengisian form: tombol *"Ambil Lokasi Saya (GPS)"* menggunakan Geolocation API browser/ponsel + pin point peta interaktif Leaflet.

### C. Peningkatan Fitur BKSDA Drive
- **FR-DRV-05 (Download Seluruh Folder as ZIP)**:
  - Menu titik tiga pada folder menyediakan opsi **"Unduh sebagai ZIP"**.
  - Server melakukan streaming ZIP secara *on-the-fly* tanpa membebani memori RAM server.
- **FR-DRV-06 (Pindahkan Berkas & Folder / Move To)**:
  - Menu aksi menyediakan dialog *"Pindahkan ke..."* dengan pohon folder tujuan.
- **FR-DRV-07 (Transfer Kepemilikan)**:
  - Menu aksi folder/berkas menyediakan opsi *"Serahkan Kepemilikan ke SuperAdmin/Pegawai Lain"*.
  - Memperbarui kepemilikan secara rekursif dan membebaskan kuota pemilik lama.
- **FR-DRV-08 (Filter Chips Pencarian)**:
  - Toolbar Drive menyediakan filter chip cepat: `Semua`, `Foto & Gambar`, `Dokumen PDF`, `Spreadsheet Excel`, `Arsip ZIP`.
- **FR-DRV-09 (Panel Informasi & Detail Berkas)**:
  - Tombol sidebar info **( ⓘ )** menampilkan detail berkas, ukuran, waktu unggah, dan hak berbagi.

---

## 3. Batasan Keamanan & Kepatuhan (Security & Non-Functional Requirements)

1. **Anti-Malware & Validasi Magic Bytes**:
   - Seluruh berkas yang diunggah responden publik wajib diverifikasi tipe MIME aslinya (`finfo` magic bytes) sebelum disimpan ke RustFS S3.
2. **Isolasi Folder & Otorisasi**:
   - Berkas tanggapan form yang tersimpan di Drive berstatus *private* secara default, hanya dapat diakses oleh pembuat form, Super Admin, dan pihak yang menerima pembagian izin eksplisit.
3. **Optimasi Kinerja (Ponytail Standard)**:
   - Pengarsipan berkas ke S3 dilakukan di antrean latar belakang (*background job*) sehingga submisi responden di HP tetap instan (< 150 ms).
   - Download ZIP folder menggunakan *streamed output* tanpa membuat file sementara raksasa di disk server.
