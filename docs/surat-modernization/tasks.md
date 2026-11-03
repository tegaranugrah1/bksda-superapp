# Daftar Tugas Teknis (Tasks): Modernisasi UI/UX, Arsitektur Jeroan & Pengerasan Keamanan Modul Persuratan

> **Petunjuk Eksekusi**: Kerjakan secara berurutan per fase. Centang `[x]` setiap tugas yang selesai. Jalankan pengujian otomatis dan lakukan commit bertahap dengan prinsip Ponytail.

---

## Fase 1: Modernisasi Layout & Navigasi Sidebar Persuratan
Standarisasi layout persuratan mengacu langsung pada arsitektur `kepegawaian/layout.tsx` dan `bmn/layout.tsx`.

- [ ] **1.1. Restrukturisasi Menu & Kategori**:
  - [ ] Definisikan `SURAT_SIDEBAR_ITEMS` dengan 4 kelompok (`Ringkasan`, `Penatausahaan Surat`, `Tata Naskah & Laporan`, `Pengaturan & Konfigurasi`) di `frontend/src/app/surat/layout.tsx`.
  - [ ] Pasang heading grup uppercase 10px tracking-widest dan border pemisah halus.
  - [ ] Tambahkan pengecekan hak akses `hasPermission` atau `canWrite` pada masing-masing item menu.
- [ ] **1.2. Implementasi Collapsible Rail Sidebar Desktop**:
  - [ ] Tambahkan state `collapsed` (toggle `w-72` $\leftrightarrow$ `w-20`) dengan tombol `PanelLeftClose`/`PanelLeftOpen`.
  - [ ] Aktifkan mode ikon terpusat saat `collapsed` dengan atribut `title={item.label}` untuk tooltip native.
  - [ ] Tambahkan garis aksen aktif emerald vertikal 4px di sisi kiri (`bg-emerald-600 dark:bg-emerald-400`).
- [ ] **1.3. Perbaikan Navigasi Mobile Drawer**:
  - [ ] Hapus tombol floating FAB bulat di kanan bawah yang menabrak pagination tabel dan modal footer.
  - [ ] Pasang trigger menu mobile terpadu di top bar dengan backdrop redup `bg-black/60` dan auto-close saat navigasi diklik.
- [ ] **1.4. Footer Pengguna & Unifikasi Token Dark Mode**:
  - [ ] Pasang avatar inisial pengguna, badge role, dan tombol logout terpadu.
  - [ ] Unifikasi palet warna dark mode ke `zinc-900`/`zinc-950`.

---

## Fase 2: Standarisasi Header, Tabel, Touch Targets & Server-Side React Query
Penerapan standar UI-UX-Pro-Max dan efisiensi Ponytail pada halaman katalog dan transaksi.

- [ ] **2.1. Eliminasi Total Anti-Pattern LocalStorage**:
  - [ ] Hapus seluruh referensi `bksda_saved_surat_masuk` di `frontend/src/app/surat/masuk/page.tsx` dan `frontend/src/app/surat/page.tsx`.
  - [ ] Kembalikan sumber data murni ke database backend melalui API.
- [ ] **2.2. Migrasi ke `@tanstack/react-query` & Server-Side Pagination**:
  - [ ] Ganti `api.get('/surat-masuk?per_page=all')` dengan server-side pagination terkoordinasi (`page`, `per_page`, `search`, `sifat`).
  - [ ] Pasang sinkronisasi URL `searchParams` dengan input pencarian ter-debounce 400ms.
  - [ ] Terapkan `placeholderData: keepPreviousData` untuk transisi halaman yang mulus.
- [ ] **2.3. Enterprise Header Card & Skeleton Loading**:
  - [ ] Pasang header seragam berbingkai `rounded-2xl border` dengan ikon badge bertema emerald di:
    - [ ] `frontend/src/app/surat/page.tsx` (Dashboard)
    - [ ] `frontend/src/app/surat/masuk/page.tsx` (Daftar Surat Masuk)
    - [ ] `frontend/src/app/surat/keluar/page.tsx` (Daftar Surat Keluar)
    - [ ] `frontend/src/app/surat/settings/page.tsx` (Pengaturan Template)
  - [ ] Ganti spinner `Loader2` dengan 5 baris skeleton beranimasi denyut halus untuk mengeliminasi CLS.
- [ ] **2.4. Aksesibilitas Touch Target & Kartu Tumpuk Mobile**:
  - [ ] Pastikan ukuran tombol aksi minimal 36–44px untuk memenuhi standar WCAG 2.1 AA.
  - [ ] Implementasikan tampilan kartu tumpuk (*stacked responsive cards*) pada tabel surat masuk di layar ponsel `< 640px`.
- [ ] **2.5. Preservasi 100% Fitur Cetak 2-Up & Popovers**:
  - [ ] Verifikasi dan pastikan `BatchPrintDisposisiModal`, `DiteruskanCellPopover`, `SifatCellPopover`, dan `ExportSuratMasukModal` tetap berfungsi sempurna tanpa regresi.

---

## Fase 3: Penataan Sub-Halaman Formulir & Tata Naskah
Penyelesaian isu dark mode, responsive grid, sticky action bar, dan preservasi template naskah dinas.

- [ ] **3.1. Form Registrasi Surat Masuk & Disposisi (`surat/masuk/create/page.tsx`)**:
  - [ ] Terapkan Dark Mode Zinc pada seluruh container formulir.
  - [ ] Ubah layout input menjadi `grid grid-cols-1 md:grid-cols-2 gap-4` agar tidak gepeng di layar ponsel.
  - [ ] Tambahkan *sticky bottom action bar* untuk tombol simpan dan cetak pratinjau di layar mobile.
- [ ] **3.2. Form Registrasi Surat Keluar (`surat/keluar/create/page.tsx`)**:
  - [ ] Terapkan Dark Mode Zinc dan layout responsif.
  - [ ] Selaraskan dengan endpoint konsisten `/api/surat/surat-keluar`.
- [ ] **3.3. Tata Naskah Dinas Resmi (`surat/keluar/dinas/page.tsx`)**:
  - [ ] Selaraskan navigasi tab template naskah dinas agar responsif di layar ponsel.
  - [ ] Lindungi dokumen cetak resmi `SuratDinasDocument.tsx` dari perubahan layout yang merusak margin A4.
- [ ] **3.4. Pengaturan Template Surat (`surat/settings/page.tsx`)**:
  - [ ] Terapkan Dark Mode Zinc dan integrasi form ke React Query dengan invalidasi cache otomatis.

---

## Fase 4: Pengerasan Keamanan Backend, Integritas Database & Granular RBAC
Perbaikan akar masalah data integrity, concurrency, permission, dan validasi berkas.

- [ ] **4.1. Eliminasi Silent Overwrite & Penguatan Unik `no_agenda`**:
  - [ ] Ganti `updateOrCreate(['no_agenda' => ...])` di `SuratMasukController::store` dengan pembuatan entitas murni.
  - [ ] Tambahkan aturan validasi `Rule::unique('surat_masuk', 'no_agenda')->whereNull('deleted_at')` di `SuratMasukRequest`.
  - [ ] Sediakan endpoint helper nomor agenda berikutnya atomik (`GET /surat-masuk/next-agenda`) dengan `lockForUpdate()`.
- [ ] **4.2. Cascading Soft Deletes & Pembersihan Berkas Storage**:
  - [ ] Tambahkan model observer `booted()` pada `SuratMasuk` untuk meng-cascade soft delete ke `surat_disposisi`.
  - [ ] Bersihkan berkas fisik private storage saat entitas di-`forceDelete()`.
- [ ] **4.3. Pengerasan Middleware & Granular RBAC**:
  - [ ] Perbarui rute di `backend/app/Modules/Surat/Routes/api.php` dengan middleware permission spesifik:
    - [ ] `GET /surat-masuk`, `GET /surat-keluar` $\rightarrow$ `permission:surat.view`
    - [ ] `POST /surat-masuk`, `POST /surat-keluar` $\rightarrow$ `permission:surat.create`
    - [ ] `PUT/PATCH /surat-masuk/{id}`, `/surat-keluar/{id}` $\rightarrow$ `permission:surat.update`
    - [ ] `DELETE /surat-masuk/{id}`, `/surat-keluar/{id}` $\rightarrow$ `permission:surat.delete`
    - [ ] `GET /surat-masuk/export/excel` $\rightarrow$ `permission:surat.export`
    - [ ] `/templates` mutasi $\rightarrow$ `permission:surat.manage`
  - [ ] Pastikan pengguna read-only menerima HTTP 403 Forbidden saat mengakses aksi ekspor atau mutasi.
- [ ] **4.4. Pengerasan Validasi Form Request**:
  - [ ] Pasang aturan validasi file pada `SuratMasukRequest` dan `SuratKeluarRequest`: `mimes:pdf,jpg,jpeg,png` dengan `max:10240` (10MB).
  - [ ] Terapkan sanitasi input teks untuk menangkal XSS.
- [ ] **4.5. Penyelarasan Pagination Controller**:
  - [ ] Pastikan `SuratMasukController::index` dan `SuratKeluarController::index` mengembalikan response pagination standar Laravel (`data`, `meta.current_page`, `meta.last_page`, `meta.total`).

---

## Fase 5: Pengujian Otomatis, Regresi & Dokumentasi
Verifikasi menyeluruh sebelum commit dan merge.

- [ ] **5.1. Pembuatan Automated Feature Test Suite**:
  - [ ] Buat file test `backend/tests/Feature/Surat/SuratRegressionTest.php` yang menguji:
    - Autentikasi dan proteksi hak akses RBAC.
    - Server-side pagination surat masuk & keluar.
    - Relasi lembar disposisi saat surat masuk dibuat.
    - Validasi file unggahan dan proteksi rute ekspor.
  - [ ] Jalankan test suite PHPUnit: pastikan 100% tests passed.
- [ ] **5.2. Frontend Build & Static Analysis Verification**:
  - [ ] Jalankan build frontend Next.js (`npm run build`) dengan Turbopack untuk memastikan zero TypeScript/linting error.
- [ ] **5.3. Sinkronisasi Dokumentasi**:
  - [ ] Perbarui `docs/progress.md` dengan riwayat inisiatif `SURAT-MODERNIZATION-2026`.
  - [ ] Jalankan `graphify update .` untuk memperbarui knowledge graph AST.
