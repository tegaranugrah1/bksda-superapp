# Arsitektur & Desain Portal Mobile BKSDA SuperApp

Dokumentasi resmi arsitektur antarmuka mobile portal, sistem navigasi 5-item, dan modul kepegawaian mandiri untuk aplikasi **BKSDA SuperApp Mobile** (Balai Konservasi Sumber Daya Alam Kalimantan Timur).

---

## 1. Ikhtisar & Prinsip Desain

Portal Mobile BKSDA SuperApp dirancang untuk memberikan kemudahan bagi seluruh ASN (PNS maupun PPPK) dalam mengakses modul operasional kedinasan dari genggaman. Desain mengadopsi estetika **Soft Executive Government Modern** dengan palet warna bernuansa tenang (*soft emerald*, *cool slate*, dan *muted pastel badges*), menjauhi kontras tajam yang melelahkan mata.

### Prinsip Utama:
1. **Zero Clutter**: Eliminasi elemen yang tidak relevan di perangkat mobile (seperti informasi rekening uang makan dan nominatif perbankan internal kantor yang dikelola admin di web).
2. **5-Item Unified Bottom Navigation**: Memposisikan akses cepat ke tugas dinas dan layanan mandiri dalam floating pill bar yang ergonomis.
3. **Elevated Center Action Button**: Tombol aksi cepat (+) di tengah untuk inisiasi Surat Perintah Tugas (SPT) dan Pengajuan Cuti Online.
4. **Data Synchronization**: Integrasi langsung dengan backend REST API BKSDA SuperApp berbasis token kredensial pegawai:
   - `GET /me/assets`: Mengambil daftar Barang Milik Negara (BMN) yang resmi ditugaskan kepada pegawai yang sedang login (menggantikan pemanggilan `/bmn/assets?employee_id=...` yang memerlukan hak akses administratif admin BMN).
   - `GET /me/dashboard`: Memuat data konsolidasi profil, ringkasan kuota, serta array `my_assets` yang berisi daftar peminjaman aktif (`AssetLoan`) yang sedang berjalan.
   - `GET /me/leave-requests`: Memuat riwayat formulir permohonan cuti pegawai beserta status persetujuan & file scan/formulir.
   - `GET /me/leave-balance?year=2026`: Memuat sisa kuota hak cuti tahunan pegawai (N, N-1, N-2).
   - `GET /surat-tugas/my`: Memuat daftar Surat Tugas resmi yang melibatkan pegawai sebagai pelaksana.

---

## 2. Arsitektur 5-Item Floating Bottom Navigation

Navigasi bawah menggunakan floating pill bar berkontur halus dengan bayangan lembut (*soft elevation*) dan status dot hijau zamrud pada tab aktif:

```
+-------------------------------------------------------------------------+
|   [🏠]            [📄]            ( + )           [⊞]            [👤]   |
|  Beranda       Surat Tugas      Center FAB      Layanan         Profil  |
|     •                                                                   |
+-------------------------------------------------------------------------+
```

### Rincian 5 Navigasi:

### Tab 1: Beranda (Portal Utama)
- **Top App Bar**: Brand BKSDA Kaltim, status SUPERAPP PORTAL, toggle mode terang/gelap, notifikasi kedinasan, dan avatar inisial pegawai.
- **Soft Executive Greeting Hero**:
  - Tanggal hari ini (WITA).
  - Salam personal: `Selamat Siang, Drs. Hendra Setiawan, M.Si.! ☀️`.
  - NIP terverifikasi: `19820412 200801 1 003`.
- **2 Quick Stats Cards**:
  - `PANGKAT / GOLONGAN`: Pembina (IV/a), TMT: 01 April 2022.
  - `SISA CUTI (2026)`: 12 Hari Kerja (Cuti Tahunan Ready).
- **MODUL AKSES SYSTEM (Badge: 8 Modul Terotorisasi - Grid 4x2)**:
  1. *Kepegawaian*: Surat Tugas, Cuti, & SDM 360.
  2. *Keuangan*: SPJ & Administrasi Keuangan Kedinasan.
  3. *BMN*: Aset Barang Milik Negara & Peminjaman.
  4. *Persediaan*: Stok ATK, Lapangan & Distribusi.
  5. *DeReporting*: Pelaporan Digital Mandiri.
  6. *CMS Portal*: Publikasi Konten & Berita.
  7. *Persuratan*: Surat Masuk & Disposisi Naskah Dinas.
  8. *BKSDA Drive (BARU)*: Akses Penyimpanan Cloud & Manajemen Berkas Digital Terintegrasi.
- **Tugas Dinas Berjalan (Sedang Dinas)**:
  - Kartu aktif penugasan lapangan yang sedang berjalan.
  - Nomor ST, lokasi resor/SKW, durasi hari, dan status pelaksanaan dinas.
  - *Catatan Otorisasi*: Tautan rincian Visum & Lembar SPD di-hide sementara karena Modul Keuangan & SPJ dikerjakan oleh tim pengembang lain.
- **Helpdesk Subbag TU**:
  - Kontak konsultasi naskah dinas, SK, dan administrasi kepegawaian via Tata Usaha.

---

### Tab 2: Surat Tugas (List ST Saya)
- **Header**: `Surat Tugas Saya`, subjudul *Daftar penugasan dinas resmi, jadwal & visum perjalanan*.
- **Filter Segmented Bar**:
  - `Semua (24)`: Menampilkan seluruh riwayat penugasan dinas.
  - `Berjalan (1)`: Menampilkan penugasan yang statusnya `approved` / `SEDANG DINAS`.
  - `Selesai (23)`: Menampilkan penugasan terdokumentasi yang telah menyelesaikan laporan.
- **Komponen Kartu Surat Tugas**:
  - Status badge: `● SEDANG DINAS` (Soft emerald `#ECFDF5`) atau `● SELESAI & LAPOR` (Soft slate `#F1F5F9`).
  - Nomor resmi ST (`ST.042/K.18/TU/KSA/03/2026`).
  - Maksud & tujuan dinas lapangan.
  - Lokasi tujuan dinas & rentang tanggal pelaksanaan.
  - **Tombol Pratinjau Mata (Eye Preview Button)**: Membuka modal pratinjau resmi PDF Surat Tugas dengan format standar KemenLHK/BKSDA.
  - Status pembebanan anggaran DIPA & riwayat laporan.
- **Prompt Banner**: Panduan cepat bagi pegawai yang belum memiliki ST terdaftar untuk membuat SPT via tombol (+).

---

### Tab 3: Center Elevated FAB (+) — Modal Buat Pengajuan Baru
Menekan tombol bundar hijau zamrud di tengah memunculkan **Quick Action Bottom Sheet Modal**:
1. **+ Buat Surat Tugas (SPT) Baru**:
   - Ikon dokumen hijau zamrud.
   - Mengarahkan pegawai langsung ke ST Builder Mobile (4 langkah: Template Dasar, Maksud & Tanggal, Diktum Penugasan, Penandatangan & Tembusan).
2. **+ Pengajuan Cuti Online**:
   - Ikon kalender amber lembut.
   - Membuka modal Formulir Cuti Resmi BKN (Cuti Tahunan, Sakit, Alasan Penting, Melahirkan).
3. **Tutup Menu**: Tombol pembatalan/penutup modal.

---

### Tab 4: Layanan Terpadu ASN & Dedicated Sub-Screens

Pusat layanan mandiri pegawai yang mengintegrasikan 4 modul esensial dengan arsitektur navigasi **Sub-Screen Khusus (Dedicated Screen dengan tombol `← Kembali`)** untuk menangani data lapangan yang banyak:

1. **Menu Utama Layanan Terpadu**:
   - Menampilkan 4 kartu ringkasan eksekutif dengan hierarki prioritas:
     1. **Aset Saya (Paling Atas)**: Inventaris tetap kedinasan yang dipegang pegawai beserta NUP dan kondisi.
     2. **Pinjaman BMN Aktif**: Pemantauan aset operasional dinas berjalan dengan badge status pengembalian.
     3. **Riwayat Pengajuan Cuti**: Arsip cuti pegawai dengan filter tahun dan tombol formulir BKN.
     4. **Kalkulator Dinas (SBM)**: Simulasi uang harian, tiket, dan penginapan berbasis modal.
   - **Helpdesk Subbag TU dengan Spacing Lega**: Strip *"Butuh bantuan administrasi & TU?"* dirancang dengan breathing space yang nyaman (`marginTop: 22`, `marginBottom: 95`, `paddingVertical: 14`, `paddingHorizontal: 16`), badge lingkaran hijau lembut (`#DCFCE7`), dan tipografi ramah agar tidak tertutup floating bottom bar.

2. **Layar Sub-Screen 1: Inventaris BMN Saya (`layananSubScreen === "bmn"`)**:
   - **Header**: Tombol kembali `← Kembali`, judul *Inventaris BMN Saya*, subjudul *Aset Tetap & Pinjaman Operasional Dinas*.
   - **Segmented Control Terintegrasi**: Menggabungkan aset tetap dan pinjaman dinas dalam 1 layar dengan tab switcher: `[ Aset Tetap Saya (12) | Pinjaman Berjalan (3) ]`.
   - **Fitur Pencarian Cepat**: Input search bar live untuk memfilter nama barang, merk, nomor polisi, atau NUP.
   - **Filter Kategori (Tab Aset Tetap)**: Filter pill horisontal (`Semua`, `Kendaraan`, `IT & PC`, `Peralatan Lapangan`).
   - **Kartu BMN**: Menampilkan foto/ikon BMN, NUP, kode barang, spesifikasi merk/tipe, nomor polisi kendaraan, lokasi penempatan, dan badge kondisi (`Baik`, `Rusak Ringan`, `Rusak Berat`).
   - **Kartu Pinjaman**: Menampilkan tanggal pinjam, batas kembali, badge sisa hari countdown (`Sisa 6 Hari` / `Terlambat`), dan status peminjaman.

3. **Layar Sub-Screen 2: Riwayat Pengajuan Cuti ASN (`layananSubScreen === "cuti"`)**:
   - **Header**: Tombol kembali `← Kembali`, judul *Riwayat Pengajuan Cuti*, subjudul *Arsip Permohonan & Penetapan Izin Cuti ASN*.
   - **Banner Ringkasan Kuota (Soft Emerald Hero)**: Menampilkan Sisa Kuota Cuti Tahun 2026 (`12 Hari Kerja`), rincian Hak Cuti N, Sisa N-1, dan Terpakai, serta tombol pintas `+ Ajukan Cuti`.
   - **Pill Filter Tahun Horisontal**: `Tahun 2026`, `Tahun 2025`, `Tahun 2024`, `Semua Tahun` (menyelesaikan kendala arsip cuti lapangan yang panjang sehingga pengguna dapat memfilter dengan mudah).
   - **Kartu Riwayat Pengajuan**: Menampilkan jenis cuti, rentang tanggal dinas, durasi hari kerja, alasan cuti, dan badge status (`● DISETUJUI`, `● MENUNGGU`, `● DITOLAK`).
   - **Aksi Cetak Formulir**: Tombol `🖨 Cetak Formulir BKN ›` untuk melihat pratinjau resmi PDF Formulir Permintaan dan Pemberian Cuti BKN.
   - **Tombol Aksi Bawah**: Tombol hijau besar `+ Ajukan Permohonan Cuti Baru` (membuka Formulir Cuti BKN).

4. **Kalkulator Dinas (SBM)**:
   - Tetap dipertahankan sebagai **Bottom Sheet Modal** ergonomis karena fungsinya adalah alat simulasi perhitungan cepat (uang harian, penginapan, dan transport darat sesuai PMK SBM Kaltim), bukan layar arsip data panjang.

5. **Konsistensi Navigasi Bawah**:
   - **Floating Bottom Navigation Bar tetap ditampilkan** pada seluruh sub-layar (tidak disembunyikan), sehingga pegawai dapat langsung berpindah ke Beranda, Surat Tugas, atau Profil kapan saja hanya dengan 1 sentuhan.

---

### Tab 5: Profil Pegawai ASN (Paling Akhir)
- **Profile Header Card**:
  - Avatar inisial pegawai (`HS`) dengan indikator status aktif bertugas.
  - Nama lengkap & gelar: `Drs. Hendra Setiawan, M.Si.`.
  - Nomor Induk Pegawai: `19820412 200801 1 003`.
  - Jabatan Fungsional: `Polisi Kehutanan Ahli Madya`.
  - Satuan Kerja / Unit: `Seksi Konservasi Wilayah II Samarinda`.
- **2 Metrik Utama**:
  - *Sisa Cuti Tahunan*: 12 Hari Kerja.
  - *Total Aset Dipegang*: 3 Aset (2 Pinjaman).
- **Daftar Menu Pengaturan & Riwayat**:
  - Informasi Riwayat Pangkat & Jabatan.
  - Riwayat Surat Tugas & SPPD.
  - Riwayat Pengajuan Cuti Online.
  - Keamanan Akun & Ubah Kata Sandi (IAM).
  - Hubungi Subbag Tata Usaha (TU).
- **Tombol Logout**:
  - Tombol bertema soft red `#FEF2F2` dengan konfirmasi alert dialog untuk keamanan sesi kedinasan.

---

## 3. Sistem Desain & Token Warna Soft

| Token UI | Kode Warna | Penggunaan |
| :--- | :--- | :--- |
| **Canvas Background** | `#F8FAFC` | Latar belakang utama seluruh layar aplikasi |
| **Header Greeting** | `#064E3B` | Kartu hero selamat datang bernuansa eksekutif |
| **Emerald Accent** | `#059669` | Warna aksen utama, tab aktif, FAB (+), dan tombol primer |
| **Soft Emerald Badge** | `#ECFDF5` | Latar belakang status `SEDANG DINAS` & `Disetujui` |
| **Border Soft** | `#E2E8F0` | Garis pembatas kartu bersih tanpa kontras kasar |
| **Soft Blue Badge** | `#EFF6FF` | Latar tombol pratinjau mata dan modul Kepegawaian |
| **Soft Amber Badge** | `#FFFBEB` | Latar status cuti & opsi pengajuan cuti |
| **Text Dark** | `#0F172A` | Teks judul utama & angka metrik |
| **Text Muted** | `#64748B` | Teks deskripsi, label pembantu, dan tanggal |

---

## 4. Sinkronisasi FigCraft & Implementasi Kode

1. **File Desain FigCraft**:
   - `docs/bksda-superapp-mobile-portal.figcraft`
   - **Page 1 (`01. Portal & Bottom Navigation`)**: 7 layar lengkap (`01. Beranda Portal`, `02. List Surat Tugas ASN`, `03. Modal Center FAB`, `04. Layanan Terpadu ASN`, `05. Profil Pegawai ASN`, `06. Inventaris BMN Pribadi Sub-Screen`, `07. Riwayat Pengajuan Cuti Sub-Screen`).
   - **Page 2 (`02. Pengajuan Surat Tugas`)**: Alur SPT standar.
   - **Page 3 (`03. Modul Kepegawaian Mobile`)**: 7 layar lengkap termasuk ST Builder Premium (Template, Menimbang/Dasar, Diktum/Biaya/Laporan, Penandatangan/Tembusan), Otorisasi Nomor ST, dan Pratinjau PDF.
   - **Page 4 (`04. Menu Kepegawaian (Cuti & SDM)`)**: 5 layar lengkap termasuk Inbox Cuti, Form Cuti BKN, Detail Pegawai Biodata (tanpa uang makan), Riwayat Perubahan (Audit History Diff), dan Kalender Penugasan.

2. **Implementasi Kode React Native**:
   - File: `mobile/src/features/dashboard/PortalDashboardScreen.tsx`
   - Telah diselaraskan 1:1 dengan struktur 5 navigasi, soft executive theme, state filter ST, modal FAB, modal SBM kalkulator, dan modal pratinjau PDF.
   - Verifikasi TypeScript: **100% Lulus (0 Errors)** via `npx tsc --noEmit`.
