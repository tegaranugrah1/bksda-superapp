# Tasks — Issue #580: Perbaikan Pagination Endpoint Surat Masuk & Sinkronisasi Arsip

> **Issue**: #580
> **Dokumen Terkait**: `requirements.md`, `design.md`

---

## Daftar Tugas

- [ ] **1. Perbaikan Backend Controller**:
  - [ ] Perbaiki `backend/app/Modules/Surat/Controllers/SuratMasukController.php` untuk menangani parameter `per_page=all`.
  - [ ] Perbaiki `backend/app/Modules/Surat/Controllers/SuratKeluarController.php` untuk menangani parameter `per_page=all`.
- [ ] **2. Perbaikan Frontend**:
  - [ ] Perbaiki `frontend/src/app/surat/masuk/page.tsx` agar memuat seluruh data secara bersih dari API tanpa terdistorsi `localStorage`.
  - [ ] Periksa dan sinkronkan `frontend/src/app/surat/page.tsx` (Dashboard Hub Persuratan).
- [ ] **3. Validasi & Pengujian**:
  - [ ] Verifikasi via API/tinker bahwa seluruh data Surat Masuk muncul saat `per_page=all`.
  - [ ] Jalankan ESLint pada frontend persuratan.
  - [ ] Verifikasi tampilan di browser dengan akun non-superadmin / pegawai.
