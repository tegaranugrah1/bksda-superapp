# Rencana Tugas Pengembangan (Task Breakdown) - Hitung Uang Makan

## Tahap 1: Backend Service & Database
- [ ] **Task 1.1**: Buat migrasi database `kpg_meal_allowance_batches` dan `kpg_meal_allowance_items` (lengkap dengan `daily_matrix` dan `override_logs` JSONB).
- [ ] **Task 1.2**: Implementasikan Model Eloquent `MealAllowanceBatch.php` dan `MealAllowanceItem.php` dengan relasi ke `Employee` dan `User`.
- [ ] **Task 1.3**: Kembangkan `SikadirParserService.php` menggunakan native PHP `DOMXPath` engine dengan header `<?xml encoding="utf-8" ?>` (ekstraksi ultra-cepat 2.3ms, pembacaan Golden Checksum header SIKADIR, dan ZIP Sanitizer pembersih `__MACOSX` / `.DS_Store`).
- [ ] **Task 1.4**: Kembangkan `HolidayCalendarHelper.php` yang memetakan kalender Hari Libur Nasional & Cuti Bersama (SKB 3 Menteri) pada hari kerja Senin-Jumat agar tidak salah dihitung sebagai Alpa (`TK`).
- [ ] **Task 1.5**: Kembangkan `AdaptiveTariffResolver.php` untuk memetakan anomali golongan romawi PPPK `(V)`, `(IX)`, PNS, dan fallback metadata SIKADIR.
- [ ] **Task 1.6**: Kembangkan `AttendanceReconcilerService.php` dengan query *Date Range Overlap* membandingkan tanggal presensi dengan:
  - `st_assignment_letters` & pivot `st_assignment_letter_employees` (status `approved`/`terbit` auto-override `H` $\rightarrow$ `PD`).
  - `kpg_employee_leave_requests` (status cuti disetujui auto-override `H` $\rightarrow$ `CT`).
- [ ] **Task 1.7**: Kembangkan `MealAllowanceExcelExport.php` menggunakan `PhpSpreadsheet` untuk menghasilkan file Excel 2-Sheet:
  - Sheet 1: Matriks Presensi baku BKSDA dengan formula dinamis `=COUNTIF(...)`, Page Setup Landscape Fit-to-Width, dan **hanya 1 tanda tangan Kasubbag TU** di sisi kanan bawah.
  - Sheet 2: Daftar Nominatif Pembayaran Uang Makan.
- [ ] **Task 1.8**: Buat `MealAllowanceController.php` dan daftarkan rute API di `backend/app/Modules/Kepegawaian/Routes/api.php` dengan middleware RBAC `role:super_admin,admin`.

## Tahap 2: Frontend Antarmuka Pengguna (UI/UX Pro Max)
- [x] **Task 2.0**: Tambahkan menu tab navigasi "Hitung Uang Makan" di sidebar modul Kepegawaian (`frontend/src/app/kepegawaian/layout.tsx`) dan halaman dasar.
- [ ] **Task 2.1**: Bangun komponen drag-and-drop multi-file & ZIP uploader dengan validasi *Golden Checksum* SIKADIR dan per-file graceful error alert.
- [ ] **Task 2.2**: Bangun komponen Matriks Presensi Interaktif Tanggal 1–31 dengan:
  - Sticky left columns (`No`, `Nama / NIP`) & Sticky right totals (`Hadir`, `PD`, `Netto`).
  - Visual status badges (`H`, `PD*`, `CT`, `S`, `I`, `TK`, `-`).
  - One-click Inline Cell Edit (popover ubah status harian per pegawai).
  - Tombol Set Libur 1 Kolom Penuh di header tanggal.
  - Rekalkulasi reaktif real-time pada kolom Hadir, Bruto, Pajak PPh 21, dan Netto tanpa reload.
- [ ] **Task 2.3**: Buat bilah filter dinamis untuk pengelompokan (*Jenis: PNS/PPPK, Angkatan/Tahun NIP, Satker/Wilayah, Bank*).
- [ ] **Task 2.4**: Bangun kartu metrik eksekutif (Total Pegawai, Hari Hadir, Hari PD, Total Bruto, Total PPh 21, Total Netto).
- [ ] **Task 2.5**: Bangun komponen Daftar Nominatif Pembayaran Uang Makan.
- [ ] **Task 2.6**: Bangun tab Riwayat Batch untuk membuka kembali arsip perhitungan bulan-bulan sebelumnya.
- [ ] **Task 2.7**: Pasang tombol aksi "Simpan Batch & Download Excel Resmi (.xlsx)".

## Tahap 3: Pengujian, Verifikasi & Audit Keamanan
- [ ] **Task 3.1**: Jalankan uji coba nyata menggunakan berkas `syafey.xls` dan verifikasi apakah presensi tanggal 28/09/2026 ter-override otomatis jika ada Surat Tugas aktif.
- [ ] **Task 3.2**: Verifikasi berkas Excel hasil ekspor sistem terhadap berkas acuan `syafey_hasil.xlsx` (termasuk verifikasi tanda tangan tunggal Kasubbag TU dan print setup landscape).
- [ ] **Task 3.3**: Uji build produksi Next.js (`npm run build`) dan pastikan 0 error TypeScript / linting.
- [ ] **Task 3.4**: Uji proteksi keamanan RBAC, sanitasi upload berkas ZIP, dan audit logging (`/security-audit`).
