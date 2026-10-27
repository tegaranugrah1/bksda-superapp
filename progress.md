# Progress Development - BKSDA SuperApp

## Status Update: 27 Oktober 2026

### 1. Modul BMN: Perbaikan Prefill Form & State Reset Laporan (Edit & Duplikasi Dokumen)
- **Masalah**: Pada halaman `/bmn/reports`, saat mengklik tombol "Edit" atau "Duplikasi" dari Riwayat Dokumen (misalnya Berita Acara `BA.408/K.18/TU/KAP.03.02/B/10/2026`), banner mode edit aktif tetapi isian formulir (nomor dokumen, pihak kedua, dan daftar aset/barang) tidak terbawa atau tetap kosong.
- **Penyebab**: Komponen tab laporan sebelumnya menginisialisasi state dengan string kosong dan mengandalkan `useEffect` asynchronous yang rentan terlewati atau mengalami *race condition* jika referensi `hasLoadedEditRef` bentrok antar-render tanpa pelepasan instance komponen.
- **Solusi & Implementasi**:
  - Menambahkan *dynamic key* pada wrapper tab di `frontend/src/app/bmn/reports/page.tsx`:
    `key={`${editingDocument?.isDuplicate ? "dup" : "edit"}_${editingDocument?.id || "new"}`}`
    sehingga setiap perpindahan dokumen atau pembatalan edit meremount komponen tab secara bersih (*clean state lifecycle*).
  - Mengubah inisialisasi form di seluruh 4 tab laporan agar membaca `editingDocument.item` secara sinkron langsung pada initial render `useState`:
    - `HandoverAgreementTab.tsx` (Berita Acara Serah Terima)
    - `UsageAgreementTab.tsx` (Perjanjian Pinjam Pakai)
    - `PowerOfAttorneyTab.tsx` (Surat Kuasa)
    - `CoveringLetterTab.tsx` (Surat Pengantar)
  - Menambahkan fallback hook `@tanstack/react-query` (`useQuery`) untuk mengambil relasi item dokumen lengkap dari API backend (`/api/bmn/.../${id}`) jika payload dari ringkasan riwayat tidak lengkap.
- **Validasi**: Typecheck TypeScript `npx tsc --noEmit` lolos 100% tanpa error. Commit: `c44c38ac`.

---

### 2. Sinkronisasi Data Aset & Media Storage BMN (Live EC2 ➔ VM 100 Proxmox)
- **Sinkronisasi Database**:
  - Melakukan dump 17 tabel BMN (`bmn_assets`, `bmn_asset_updates`, `bmn_tags`, `bmn_asset_tag`, `bmn_usage_agreements`, dll.) dari AWS EC2 Produksi (`bksdakaltim.net`) dengan mode `session_replication_role = 'replica'`.
  - Melakukan restore bersih dengan `CASCADE` ke PostgreSQL container `bksda-db` di VM 100 (`192.168.100.151`).
  - Total aset BMN kondisi *Rusak Berat* di VM 100 tersinkronisasi presisi sebanyak **37 aset**.
- **Sinkronisasi File Media & Izin Berkas**:
  - Mengompres dan mentransfer volume RustFS foto BMN (`/data/bksda/bmn` dan `/data/bksda/bmn-photos`, ~54 MB, 68 foto).
  - Mengekstrak ke storage VM 100 dan memperbaiki izin berkas dengan `chown -R rustfs:rustfs /data/bksda`.
  - Memastikan foto aset dapat diakses dan diunggah secara normal via HTTP 200 di `192.168.100.151:8080`.

---

### 3. Penyesuaian & Standardisasi Roster Pegawai Aktual (147 Pegawai)
- **Verifikasi Roster Aktual Definitif**:
  - Berdasarkan daftar aktual pegawai BKSDA Kalimantan Timur per 27 Oktober 2026, total pegawai resmi berjumlah **147 orang** (terdiri atas **114 ASN PNS/PPPK** dan **33 Tenaga Lapangan/MMP**).
  - Seluruh 147 pegawai terverifikasi 100% cocok dan telah tersimpan di database.
- **Resolusi Selisih & Migrasi Database**:
  - Dibuat migrasi database `2026_10_27_083000_archive_inactive_employees_to_match_actual_roster.php` yang melakukan soft-delete (`deleted_at = now()`) serta menonaktifkan (`is_active = false`) data pegawai di luar daftar aktual:
    - `Djunaib Ahmad` (NIP: 198007132000031002) - data pegawai lama dengan riwayat cuti historis tetap terjaga.
    - `Muhamad Rafli Reskiadi` (MMP-032) - MMP lama di Resor IKN.
    - Serta proteksi untuk data pegawai lama di server live/staging (`Didimus`, `Dwi Suriyanto`, `Khairul Falah`).
  - Total pegawai aktif di localhost kini resmi menjadi **147 pegawai** (baik pada query Eloquent `Employee::count()` maupun endpoint API `/api/kepegawaian/employees`).

---

## Status Update: 30 September 2026

### 1. Modul BMN: RBAC Granular & Proteksi Unit Kerja / Aset
- **Hak Akses Admin BMN (`role: admin`)**:
  - Diberikan kewenangan penuh untuk mengelola master data **Tag Aset**, master **Ruangan/Lokasi**, dan operasional aset BMN.
  - **Restriksi Unit Kerja Baru**: Admin hanya dapat memilih Unit Kerja yang sudah ada atau standar Balai KSDA Kaltim. Penambahan Unit Kerja baru murni dibatasi hanya untuk `super_admin` (terproteksi di frontend `bmn/settings/page.tsx` dan backend `LocationController.php` dengan HTTP 403 Forbidden).
  - **Restriksi Hapus Permanen**: Permission `bmn.asset.force_delete` dikunci khusus untuk `super_admin` saja. Admin hanya memiliki wewenang pemutihan / soft delete (`bmn.asset.dispose`).
- **Hak Akses User Biasa (`role: user` - Read-Only Penuh)**:
  - User biasa dengan akses modul BMN dapat melihat seluruh data aset kantor Balai secara menyeluruh (bukan terbatas milik sendiri).
  - Seluruh halaman dan tabel BMN (`/bmn`, `/bmn/assets`, `/bmn/loans`, `/bmn/auction-candidates`, `/bmn/auction-batches`, `/bmn/settings`) beroperasi dalam mode murni **Read-Only** (kolom & tombol Tambah, Edit, Hapus, Kembalikan, Buat Paket Lelang disembunyikan).
  - Rute transisi status lelang (`POST /auction-batches/{id}/transition`) diproteksi dengan middleware `permission:bmn.auction.update`.
- **Pengujian & Validasi**:
  - Unit test `UserPermissionFallbackTest`: 9/9 lulus.
  - Feature test `BmnMasterDataTest`: 7/7 lulus (menguji blokir unit kerja baru untuk admin dan izin untuk superadmin).
  - Typecheck `npx tsc --noEmit`: 0 error.

---

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
