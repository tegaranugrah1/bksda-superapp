# Progress Development - BKSDA SuperApp

## Status Update: 31 Agustus 2026

### 1. Modul Keuangan & Portal Pegawai: Lembar Visum SPD (Surat Perjalanan Dinas)

#### A. Isolasi & Manajemen Tipe Anggaran (DIPA vs FOLU Net Sink 2030)
- **Tombol Pemilih Anggaran (Switcher)**:
  - Tersedia opsi `🏛️ SPD DIPA (Tanpa a.n.)` dan `🌿 SPD FOLU (Dengan a.n.)`.
  - Mengatur data PPK aktif secara dinamis:
    - **SPD DIPA**: `RUSMANTO, S.Hut` (NIP. 19810907 200012 1 004).
    - **SPD FOLU**: `Ahmad Hidayat, S.PKP., M.Ling` (NIP. 19820301 200012 1 001).
- **Isolasi Dropdown Template**:
  - Saat memilih DIPA: Dropdown hanya menampilkan opsi `Manual (Kosong)` dan grup template DIPA (Balai Samarinda, SKW I Berau, SKW II Tenggarong, SKW III Balikpapan).
  - Saat memilih FOLU: Dropdown hanya menampilkan opsi `Manual (Kosong)` dan grup template FOLU (Balai Samarinda, SKW I Berau, SKW II Tenggarong - Kelian, SKW III Balikpapan).
  - Menghilangkan duplikasi penamaan tag `[DIPA]` / `[FOLU]` ganda dan mengurutkan daftar wilayah secara baku (Samarinda -> Berau -> Tenggarong -> Balikpapan).
- **Pilihan Tipe Anggaran pada Form Template**:
  - Modal **Kelola Template** (`VisumManageTemplatesModal`) dilengkapi selector eksplisit DIPA vs FOLU beserta penyesuaian otomatis jabatan & PPK.
  - Modal **Simpan Form Sebagai Template** (`VisumSaveAsTemplateModal`) mendukung penentuan tipe anggaran saat menyimpan.

#### B. Penyempurnaan Format & Tata Letak Cetak Visum SPD (A4 Standard)
- **Format SPD DIPA**:
  - Judul jabatan Kepala Seksi / Kasubbag TU diatur menjadi **satu baris utuh** tanpa wrap/turun ke baris baru.
  - Nama dan NIP pejabat dibuat **sejajar kiri satu sama lain** di dalam blok penandatangan yang **terpusat di tengah** (`display: inline-flex; text-align: left; margin: 0 auto`).
- **Dukungan Berbagai Mode Cetak**:
  - Cetak Lengkap (dengan tabel border).
  - Cetak Blanko Kosong.
  - Cetak Overlay (hanya data isian untuk dicetak di atas blanko fisik).
- **Live Preview Interaktif**:
  - Mendukung kontrol perbesaran zoom (50% - 125%, Fit 85%, 100%) dengan skala A4 presisi tanpa scrollbar ganda.

#### C. Integrasi Portal Pegawai (`/portal`)
- **Fitur untuk Pegawai**:
  - Pegawai dapat mengisi rute perjalanan dinas (asal, tujuan, transit 3/4/5, tiba kembali).
  - Fitur **Tarik Data Surat Tugas**: Mengisi otomatis nomor ST, maksud perjalanan, tanggal mulai/selesai, dan tujuan dari riwayat surat tugas pegawai.
  - Live preview dan cetak langsung.
- **Rule Hak Akses Portal (Selection-Only / Read-Only)**:
  - Tombol dan modal *Kelola Template* disembunyikan secara otomatis (`isPortal={true}`).
  - Pegawai hanya dapat menggunakan template yang telah disediakan admin tanpa dapat mengubah master template.

---

### 2. File Terkait yang Dimodifikasi

1. **Frontend**:
   - `frontend/src/app/keuangan/_components/VisumSpdTab.tsx`
   - `frontend/src/app/keuangan/_components/VisumSpdDocument.tsx`
   - `frontend/src/app/keuangan/_components/VisumManageTemplatesModal.tsx`
   - `frontend/src/app/keuangan/_components/VisumSaveAsTemplateModal.tsx`
   - `frontend/src/app/portal/page.tsx`
2. **Backend**:
   - `backend/app/Modules/Keuangan/Controllers/VisumSpdController.php`
   - `backend/app/Modules/Keuangan/Routes/api.php`
3. **Dokumentasi**:
   - `progress.md`

---

### 3. GitHub Issue & Audit Refactor Seluruh Modul (/ponytail)

- **Issue GitHub**: [#584 - refactor: Whole-Repository Module Optimization & Cleanup (Ponytail Audit)](https://github.com/tegaranugrah1/bksda-superapp/issues/584)
- **Hasil Audit Modul Portal Pegawai**:
  - **Status**: **Perlu Refactor Ringan (Targeted/Lite Refactor)**.
  - **Temuan Utama**:
    1. `frontend/src/app/portal/_components/ProfileSidebar.tsx`: **Dead code** (12KB tidak terpakai, digantikan `PortalProfileSidebar.tsx`).
    2. *Initial bundle size*: Komponen form berat (`SmartPatrolInlineForm` 60KB, `GeneralReportInlineForm` 50KB, `VisumSpdTab` 100KB) dapat dioptimasi via `next/dynamic` lazy loading.
    3. *State navigasi*: Sinkronisasi `activeTab` vs `activeNavTab` disederhanakan.
- **Rencana Tindak Lanjut Modul Lain**:
  - Keuangan, Kepegawaian, BMN, Inventory, Persuratan, DeReporting, dan CMS mengikuti checklist pada Issue #584.

---

### 4. Verifikasi & Pengujian
- Kompilasi build Next.js (`npm run build`) lolos 100% tanpa error.
- Validasi API backend (GET/POST/PUT/DELETE) modul keuangan visum normal.
