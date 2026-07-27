# Task List: Implementasi Modul Surat (Surat Masuk & Surat Keluar)

## Phase 1: Database & Backend Core (`app/Modules/Surat`)
- [x] **Task 1.1**: Buat Migration database untuk modul Surat (`surat_masuk`, `surat_keluar`, `surat_disposisi`).
- [x] **Task 1.2**: Buat Model Laravel (`SuratMasuk`, `SuratKeluar`, `SuratDisposisi` dengan `$fillable`, `SoftDeletes`, `casts`).
- [x] **Task 1.3**: Buat Service Provider `SuratServiceProvider` dan daftarkan di `bootstrap/providers.php` dengan dual prefix `/api` & `/api/surat`.
- [x] **Task 1.4**: Buat FormRequest & Validation (`SuratMasukRequest` & `SuratKeluarRequest` dengan penanganan nullable string date).
- [x] **Task 1.5**: Buat Controller API (`SuratMasukController` & `SuratKeluarController`) dengan `updateOrCreate` pencegah duplikasi.
- [x] **Task 1.6**: Buat Route API (`app/Modules/Surat/Routes/api.php`) dengan prefix `api/surat` & `api`.

---

## Phase 2: Frontend Pages & Layout (`frontend/src/app/surat`)
- [x] **Task 2.1**: Buat Halaman Hub Modul Surat (`/surat/page.tsx`): Card ringkasan statistik & navigasi cepat.
- [x] **Task 2.2**: Buat Halaman Daftar Surat Masuk (`/surat/masuk/page.tsx`): Data table, pencarian, sorting descending `no_agenda`, deduplikasi & tanggal terformat bersih.
- [x] **Task 2.3**: Buat Halaman Form Input Surat Masuk (`/surat/masuk/create/page.tsx`): Form presisi Lembar Disposisi BKSDA KALTIM dengan auto consecutive numbering.
- [x] **Task 2.4**: Buat Komponen Cetak Lembar Disposisi 2-Up (`LembarDisposisiSheet.tsx` & `LembarDisposisi2UpPrint.tsx`): Cetak 2-Up side-by-side presisi, font reguler (Agency FB & Arial Nova Cond), Sdr/Sdri rata kanan tanpa underline.
- [x] **Task 2.5**: Buat Halaman Daftar Surat Keluar (`/surat/keluar/page.tsx`): Data table Surat Keluar dengan pagination dan pencarian.
- [x] **Task 2.6**: Buat Halaman Form Input Surat Keluar (`/surat/keluar/create/page.tsx`): Form input metadata & upload file PDF Surat Keluar.

---

## Phase 3: Integration, Security & Deployment
- [x] **Task 3.1**: Perbaiki race condition hidrasi otentikasi client di `RouteGuard.tsx` & `proxy.ts` (menghentikan redirect loop 100%).
- [x] **Task 3.2**: Perbaiki silent handling API logout untuk mencegah kilatan error pada terminal Node.js.
- [x] **Task 3.3**: Sinkronisasi data otomatis (`loadData` auto-upload local items ke MySQL DB).
- [x] **Task 3.4**: Jalankan `npx tsc --noEmit` & uji seluruh fungsionalitas (0 error).
- [x] **Task 3.5**: Squash merge seluruh histori pengerjaan dari `task/surat-module-setup` ke branch `main` & push ke GitHub.
