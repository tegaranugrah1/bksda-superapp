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

### 3. Refactor & Optimalisasi Modul Portal Pegawai (/ponytail) — Selesai ✅

- **Skor Performa Lighthouse**: Melonjak dari **40 (Merah) ➔ 93 (Hijau)** 🚀
- **Penghapusan Dead Code (*Deletion over Addition*)**:
  - `frontend/src/app/portal/_components/GeneralReportDialog.tsx` (**40 KB dihapus**).
  - `frontend/src/app/portal/_components/ProfileSidebar.tsx` (**12 KB dihapus**).
  - Total pengurangan baris kode: **-1.176 baris kode**.
- **Instant Layout dengan `PortalSkeleton`**:
  - Menghapus *full-screen blocking spinner* dan menggantinya dengan kerangka skeleton 3-kolom instan.
  - Waktu muat LCP (Largest Contentful Paint) terpangkas dari **10.2 detik menjadi < 1.0 detik**.
- **Dynamic Code Splitting (`next/dynamic`)**:
  - Mengisolasi bundle form berat (`SmartPatrolInlineForm`, `GeneralReportInlineForm`, `VisumSpdTab`, `FormulirCutiPrint`, `LeaveRequestDialog`, `SuratTugasLetterPreview`), mengurangi initial payload JS lebih dari **~280 KB**.
- **Tree-Shaking Icons & Libraries (`next.config.ts`)**:
  - Mengaktifkan `optimizePackageImports: ["lucide-react", "date-fns", "recharts"]`.
- **Backend Null-Safety Guard (`AuthController.php`)**:
  - Menambahkan filter pengaman `fn($loan) => $loan->asset !== null` agar endpoint `/api/me/dashboard` 100% stabil terhadap data aset orphan.
- **Zero Hydration Mismatch**:
  - Memperbaiki sinkronisasi SSR vs Client pada `RouteGuard.tsx` dan `portal/page.tsx`.

---

### 4. GitHub Issue Tracker
- **Issue GitHub**: [#584 - refactor: Whole-Repository Module Optimization & Cleanup (Ponytail Audit)](https://github.com/tegaranugrah1/bksda-superapp/issues/584)
- **Status Modul Portal**: **Selesai (Completed & Merged)**.
- **Rencana Modul Berikutnya**:
  - Modul Keuangan, Kepegawaian, Persuratan, BMN, Inventory, DeReporting, dan CMS sesuai checklist pada Issue #584.

---

### 5. Verifikasi & Pengujian
- Kompilasi build Next.js (`npm run build`) lolos 100% tanpa error (73 halaman statis & dinamis).
- Validasi API backend (GET/POST/PUT/DELETE) modul keuangan & portal normal.
