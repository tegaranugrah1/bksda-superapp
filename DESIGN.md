# BKSDA Kaltim Superapp Mobile — Design Specification (DESIGN.md)

## 🌲 Product Overview
- **Application Name**: BKSDA Kaltim Superapp Mobile
- **Organization**: Balai Konservasi Sumber Daya Alam Kalimantan Timur (Ministry of Environment and Forestry, Indonesia)
- **Target Audience**: BKSDA Staff, Field Officers, Administrative Officers, and Leadership (Kepala Balai & Ka Sub Bag TU).
- **Core Modules**:
  1. **BMN (Barang Milik Negara)**: Asset Catalog, Vehicle Loan Requests, SPTJ & Power of Attorney Documents.
  2. **Surat (Digital Letter Management)**: Surat Masuk Inbox, Real-Time 2-Up Disposition Sheets, Approval Flows.
  3. **Inventory**: Consumable Stock Items, Transactions & Loan Records.
  4. **Kepegawaian**: Employee Profile, SK History, & Module Access Permissions.
  5. **DeReporting**: External & Public Field Reports.

---

## 🎨 Visual Design System & Aesthetics

### Theme: Modern Forest Emerald & Dark Glassmorphism
A state-of-the-art dark theme inspired by lush forestry conservation, featuring glowing emerald accents, semi-transparent frosted glass surfaces, micro-animations, and clean Material You / Apple Human Interface geometry.

### 🎨 Color Palette
- **Background Base**: `#061a12` (Deep Forest Dark)
- **Background Secondary**: `#092318` (Dark Emerald Surface)
- **Primary Accent**: `#10b981` (Electric Emerald)
- **Secondary Accent**: `#059669` (Forest Emerald)
- **Card Surface (Glassmorphism)**: `rgba(15, 41, 30, 0.75)` with `backdrop-filter: blur(16px)` and `border: 1px solid rgba(255, 255, 255, 0.1)`
- **Text Primary**: `#ffffff` (Pure White)
- **Text Secondary**: `#a7f3d0` (Soft Mint)
- **Muted Text**: `rgba(167, 243, 208, 0.6)`
- **Status Badges**:
  - **Success / Available**: `#10b981` (Emerald Green)
  - **Warning / Pending / Loaned**: `#f59e0b` (Warm Amber)
  - **Urgent / High Priority**: `#ef4444` (Crimson Rose)
  - **Information / Official**: `#3b82f6` (Ocean Blue)

### 🔤 Typography & Hierarchy
- **Font Family**: Inter, Outfit, or Material You Sans-Serif
- **Heading 1**: 28px, Bold, `#ffffff`, letter-spacing -0.5px
- **Heading 2**: 20px, Semi-Bold, `#ffffff`
- **Subtitle**: 16px, Medium, `#a7f3d0`
- **Body Text**: 14px, Regular, `#ffffff`, line-height 1.5
- **Caption / Badge**: 12px, Bold, Uppercase, letter-spacing +0.5px

### 📐 Corner Radius & Component Elevation
- **Cards & Modals**: `border-radius: 20px`
- **Buttons & Input Fields**: `border-radius: 14px`
- **Badges & Pills**: `border-radius: 9999px` (Full Pill)
- **Glow Effects**: `box-shadow: 0 0 20px rgba(16, 185, 129, 0.25)`

---

## 📱 Screen Architecture & Layouts

### Screen 0: Mobile Login Screen (Halaman Awal / Entry Point)
- **Branding Header**:
  - Center alignment with dual logos: Logo BKSDA Kaltim & Logo Kementerian Lingkungan Hidup dan Kehutanan (Kemenhut).
  - Title: "BKSDA Kaltim Superapp Mobile".
  - Subtitle: "Sistem Informasi Terpadu Balai Konservasi Sumber Daya Alam Kalimantan Timur".
- **Login Glass Form Card**:
  - Field 1: Input NIP / Username ("Masukkan NIP Pegawai 18 digit atau Username").
  - Field 2: Input Password ("Masukkan Kata Sandi") dengan toggle icon mata (show/hide password).
  - Checkbox option: "Ingat Saya" & Link "Lupa Password?".
- **Primary Actions**:
  - Tombol Utama: "Masuk ke Aplikasi" (Glowing Emerald Full-Width Button).
  - Biometric Action: Tombol Quick Login dengan Sidik Jari / Biometrik.
- **Footer**:
  - Copyright "BKSDA Kaltim © 2026. Mobile App v1.0".

### Screen 1: Mobile Portal Hub (Home / Dashboard)
- **Header**:
  - Left: BKSDA Crest Logo with title "BKSDA Superapp".
  - Right: User Profile Avatar with glowing border ring, greeting "Halo, Subagja", and Notification Bell with unread badge.
- **Hero Stats Banner**:
  - A gradient card (`#064e3b` to `#059669`) with 3 stat counters:
    - **14** Disposisi Aktif
    - **3** Peminjaman Aset
    - **2** Laporan Masuk
- **Module Navigation Grid (2x3 Layout)**:
  - **Aset BMN**: Car/Truck icon, Emerald badge
  - **Surat & Disposisi**: Mail/FileText icon, Cyan badge
  - **Stok Inventaris**: Box/Package icon, Amber badge
  - **Kepegawaian**: Users/UserCheck icon, Purple badge
  - **DeReporting**: ShieldAlert icon, Rose badge
  - **Portal Publik**: Globe/ExternalLink icon, Blue badge
- **Recent Activity Stream**:
  - Vertical list of frosted glass cards showing recent letters, loan statuses, and quick action buttons.
- **Bottom Navigation**:
  - Floating glassmorphism tab bar with 4 items: **Beranda**, **Aset BMN**, **Disposisi**, **Profil**.

### Screen 2: BMN Asset Catalog & Loan Tracker
- **Search & Filter Bar**:
  - Glass search field: "Cari Nama Aset, NUP, atau Plat Nomor...".
  - Horizontal pill tags: "Semua Aset", "Kendaraan", "Elektronik", "Dipinjam".
- **Featured BMN Asset Card**:
  - Toyota Hilux Double Cabin 4x4, Code `3.02.01.01.002`, NUP `00012`, Plat `KT 8192 BKS`.
  - Status tag: "Dipinjam oleh Subagja (Ka Sub Bag TU)".
  - Action buttons: "Lihat Surat Kuasa PDF", "Scan QR Aset", "Cetak SPTJ".
- **Asset List View**:
  - Glass cards with asset thumbnails, status tags ("Tersedia" green, "Dipinjam" amber), and chevron arrow.
- **Floating Action Button (FAB)**:
  - Glowing emerald (+) button at bottom right: "Ajukan Peminjaman Aset Baru".

### Screen 3: Modul Surat Masuk (2 Halaman Utama: Input & Daftar)
- **Halaman 3A: Form Input Surat Masuk & Cetak Lembar Disposisi**:
  - Top Bar: Title "Input Surat Masuk", Auto-increment Agenda No `1016`.
  - Field Input Utama: No. Surat (`SURAT/BKSDA/2026/1016`), Tanggal Surat, Tanggal Terima Agenda, Asal Surat (`Apekli`), Lampiran (`3 Set`), Isi Ringkas / Perihal.
  - Pengelolaan 9-10 Daftar Diteruskan Kepada Yth:
    - 1. Ka Sub Bag TU
    - 2. Urusan Umum dan Perlengkapan
    - 3. Urusan Kepegawaian
    - 4. Urusan Program
    - 5. Urusan Keuangan
    - 6. Urusan Data Evlap dan Humas
    - 7. Urusan Teknis
    - 8. Urusan Perlindungan
    - 9. PPK FOLU NC 2030
    - **+ Tambah Baris ke-10 (Kustom / Item Baru)**
  - Catatan Disposisi text box & Sifat Surat (Biasa, Penting, Sangat Penting, Rahasia, Segera, Kilat).
  - Canvas Pratinjau Real-Time Lembar Disposisi Official BKSDA Kaltim (Latar Putih, Font Agency FB & Arial Nova Cond, Border Hitam Presisi).
  - Pilihan Posisi Cetak: `Cetak 1-Up (Kiri/Kanan)` atau `Cetak 2-Up (Side-by-Side 330mm)`.
  - Tombol Utama: "Cetak Lembar Disposisi" (Glowing Emerald) dan "Simpan Data Surat".
- **Halaman 3B: Daftar & Riwayat Surat Masuk**:
  - Search field: "Cari No. Agenda, No. Surat, Perihal, atau Asal Surat...".
  - Filter pills: "Semua Surat", "Sangat Penting", "Penting", "Biasa".
  - List Riwayat Surat Masuk (Sorted Agenda Descending: `1015`, `1014`, `1013`).
  - Card detail: Agenda `1015` | Date `25/07/26` | No. Surat `SURAT/BKSDA/2026` | Asal `Apekli` | Perihal "Permohonan Pengadaan Obat-Obatan Translokasi Badak Sumatera".
  - Tombol Aksi Cepat: "Cetak Ulang Disposisi" (Outline Emerald button) & "Edit Data Surat".

### Screen 4: Employee Profile & Module Access Control
- **User Profile Header**:
  - Avatar, Name: "Drs. Ahmad Subagja, M.Si.", NIP: "19850412 201012 1 002", Position: "Kepala Sub Bagian TU".
- **Module Permissions Card**:
  - Active module toggles with green status dots (Core, BMN, Inventory, DeReporting, Surat).
- **Settings List**:
  - Security, Power of Attorney History, Notification Settings, SIMONDOK Guide, and Red Logout Button.

---

## 🚀 Design Principles
1. **Zero Placeholder Rule**: Use real BKSDA data (NIP, Plat Kendaraan, No Agenda, Surat BKSDA).
2. **High Contrast & Readability**: White text on dark glass cards ensures 100% legibility in field operations.
3. **Smooth Micro-Animations**: Subtle hover/press scale effects on cards and floating navigation.
