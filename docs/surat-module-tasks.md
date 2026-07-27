# Task List: Implementasi Modul Surat (Surat Masuk & Surat Keluar)

## Phase 1: Database & Backend Core (`app/Modules/Surat`)
- [ ] **Task 1.1**: Buat Migration database untuk modul Surat:
  - `surat_masuk`: `id`, `no_agenda`, `tanggal_agenda`, `indeks`, `kode`, `no_surat`, `referensi`, `tanggal_penyelesaian`, `tanggal_surat`, `isi_ringkas`, `asal_surat`, `lampiran`, `sifat_json`, `catatan`, `file_path`, `created_by`, `updated_by`, `deleted_at`.
  - `surat_keluar`: `id`, `no_surat`, `kode_klasifikasi`, `tanggal_surat`, `tujuan_surat`, `perihal`, `sifat`, `lampiran`, `file_path`, `penandatangan_id`, `created_by`, `deleted_at`.
  - `surat_disposisi`: `id`, `surat_masuk_id`, `diteruskan_json`, `instruksi_json`, `catatan_tambahan`, `ka_subbag_tu_id`, `kepala_balai_id`, `deleted_at`.
- [ ] **Task 1.2**: Buat Model Laravel:
  - `App\Modules\Surat\Models\SuratMasuk` (dengan `$fillable`, `SoftDeletes`, `casts`).
  - `App\Modules\Surat\Models\SuratKeluar` (dengan `$fillable`, `SoftDeletes`, `casts`).
  - `App\Modules\Surat\Models\SuratDisposisi` (dengan `$fillable`, `SoftDeletes`, `casts`).
- [ ] **Task 1.3**: Buat Service Provider `SuratServiceProvider` dan daftarkan di `config/app.php`.
- [ ] **Task 1.4**: Buat FormRequest & Validation:
  - `SuratMasukRequest`
  - `SuratKeluarRequest`
- [ ] **Task 1.5**: Buat Controller API (`SuratMasukController`, `SuratKeluarController`):
  - CRUD Surat Masuk dengan Pagination (`index`, `store`, `show`, `update`, `destroy`).
  - CRUD Surat Keluar dengan Pagination (`index`, `store`, `show`, `update`, `destroy`).
- [ ] **Task 1.6**: Buat Route API (`app/Modules/Surat/Routes/api.php`) dengan prefix `api/surat` dan middleware `auth:sanctum`.

---

## Phase 2: Frontend Pages & Layout (`frontend/src/app/surat`)
- [ ] **Task 2.1**: Buat Halaman Hub Modul Surat (`/surat/page.tsx`):
  - Card ringkasan statistik (Total Surat Masuk, Surat Keluar, Disposisi Pending).
  - Navigasi tab/menu cepat ke Surat Masuk & Surat Keluar.
- [ ] **Task 2.2**: Buat Halaman Daftar Surat Masuk (`/surat/masuk/page.tsx`):
  - Data table dengan pencarian, filter tanggal & sifat, pagination.
  - Tombol aksi: Detail, Cetak Lembar Disposisi 2-Up, Edit, Hapus.
- [ ] **Task 2.3**: Buat Halaman Form Input Surat Masuk (`/surat/masuk/create/page.tsx`):
  - Form lengkap sesuai **Gambar 1 (Lembar Disposisi BKSDA KALTIM)**.
  - Opsi toggle "Input 2 Disposisi Sekaligus / Mode Cetak 2-Up (Letter Divided by 2)".
  - Komponen pratinjau fisik Lembar Disposisi 2-Up side-by-side / stacked.
- [ ] **Task 2.4**: Buat Komponen Cetak Lembar Disposisi 2-Up (`LembarDisposisi2UpPrint.tsx`):
  - CSS Print Media Query khusus kertas **Letter divided by 2** (2 formulir per halaman Letter).
  - Tampilan presisi sesuai layout dokumen fisik hijau BKSDA Kaltim pada Gambar 1.
- [ ] **Task 2.5**: Buat Halaman Daftar Surat Keluar (`/surat/keluar/page.tsx`):
  - Data table Surat Keluar dengan pagination dan pencarian.
- [ ] **Task 2.6**: Buat Halaman Form Input Surat Keluar (`/surat/keluar/create/page.tsx`):
  - Form input metadata & upload file PDF Surat Keluar.

---

## Phase 3: Integration, Typecheck & Verification
- [ ] **Task 3.1**: Jalankan `npx tsc --noEmit` untuk memastikan tidak ada error TypeScript pada frontend.
- [ ] **Task 3.2**: Jalankan pengujian backend (Feature Tests) untuk endpoint API Surat Masuk & Keluar.
- [ ] **Task 3.3**: Uji fungsional cetak Lembar Disposisi 2-Up pada browser.
