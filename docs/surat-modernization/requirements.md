# Dokumen Kebutuhan Teknis (SRS): Modernisasi UI/UX, Arsitektur Jeroan & Pengerasan Keamanan Modul Persuratan (Full Internals)

> **ID Inisiatif**: `SURAT-MODERNIZATION-2026`  
> **Standar Rujukan**: Modul Kepegawaian (`frontend/src/app/kepegawaian/`) & Modul BMN (`frontend/src/app/bmn/`)  
> **Prinsip**: Ponytail (Zero Bloat, Deletion > Addition, Boring > Clever, Shortest Working Diff) + UI-UX-Pro-Max + Security Hardening  
> **Cakupan**: Seluruh sub-sistem Persuratan (Layout & Sidebar, Dashboard Hub, Agenda Surat Masuk, Registrasi Disposisi, Agenda Surat Keluar, Tata Naskah Dinas, Pengaturan Template, API Endpoints, RBAC, dan Automated Regression Tests)

---

## 1. Analisis Menyeluruh "Jeroan" Modul Persuratan (Deep Internals Gap Analysis)

Pemeriksaan komprehensif pada modul persuratan (`frontend/src/app/surat/` dan `backend/app/Modules/Surat/`) mengungkap kesenjangan teknis di level **AKAR (Root Architecture & Security)** dan **CANGKANG (UI/UX & Layout)**:

### A. Titik Kritis Level AKAR (Root Database, Concurrency, Data Integrity & Security)
1. **Kerentanan *Silent Data Corruption* pada `no_agenda` (`SuratMasukController::store`)**:
   * Kode baris 98-101 menggunakan `SuratMasuk::updateOrCreate(['no_agenda' => $noAgenda], $validated)`.
   * **Bahaya Fatal**: Jika seorang staf secara tidak sengaja menginput nomor agenda yang sudah terdaftar (misal agenda `1016`), sistem bukannya menolak dengan error validasi HTTP 422, melainkan **MENIMPA / MENELAN** data surat masuk 1016 yang lama secara senyap di database!
   * **Solusi Akar**: Ganti dengan validasi keunikan ketat `Rule::unique('surat_masuk', 'no_agenda')->ignore($id)` dan pisahkan secara eksplisit alur `store` (create murni) vs `update`.
2. **Ketiadaan *Atomic Concurrency Lock* pada Penomoran Agenda**:
   * Tidak ada mekanisme sequence locking saat penentuan nomor agenda berikutnya.
   * Jika 2 staf registrasi membuka form secara bersamaan di pagi hari, keduanya mendapat nomor agenda yang sama, dan saat disimpan, terjadi tabrakan data (race condition).
   * **Solusi Akar**: Terapkan nomor agenda sequence generator atomik dengan PostgreSQL row-level lock (`SELECT MAX(no_agenda) FROM surat_masuk FOR UPDATE`) atau sequence sequence terisolasi per tahun takwim.
3. **Pembajakan Data oleh Anti-Pattern `localStorage` di Frontend (`bksda_saved_surat_masuk`)**:
   * Halaman daftar surat masuk dan dashboard masih membaca dan menggabungkan data dari `localStorage.getItem("bksda_saved_surat_masuk")`.
   * Jika sebuah surat telah dihapus atau direvisi di database oleh staf lain, browser lokal tetap membangkitkan data usang dari localStorage dan mencoba menggabungkannya ke tampilan tabel.
   * **Solusi Akar**: Hapus tuntas seluruh pemanggilan localStorage untuk entitas surat. Kembalikan `@tanstack/react-query` v5 sebagai manajer cache server state tunggal.
4. **Paginasi Semu & *All-Data Ingestion* (`?per_page=all`)**:
   * Frontend memanggil `api.get('/surat-masuk?per_page=all')` yang memaksa database server melakukan query dan mentransfer 520+ record lengkap dengan relasi JSON disposisi ke memori RAM browser.
   * **Solusi Akar**: Migrasi penuh ke *Server-Side Pagination* murni (`current_page`, `per_page: 10/20/50`, `search`, `sifat`, `rentang_tanggal`) terkoordinasi dengan URL `searchParams`.
5. **Kebocoran Hak Akses Backend Tanpa Granular RBAC**:
   * File `api.php` hanya menerapkan `module.access:surat`.
   * Setiap akun yang punya akses modul (termasuk staf biasa/magang) dapat menghapus surat (`DELETE /surat-masuk/{id}`), mengekspor database ke Excel (`GET /surat-masuk/export/excel`), dan mereset template sistem (`POST /templates/reset-defaults`).
   * **Solusi Akar**: Pasang granular permission middleware: `surat.view`, `surat.create`, `surat.update`, `surat.delete`, `surat.export`, dan `surat.manage`.
6. **Orphaned Records pada Relasi `surat_disposisi`**:
   * Saat `SuratMasuk` di-soft-delete, baris relasi `surat_disposisi` tidak ikut di-soft-delete secara cascading, meninggalkan data sampah (*orphaned records*) di database.
   * **Solusi Akar**: Pasang event listener / model observer `deleting` pada `SuratMasuk` untuk meng-cascade soft delete ke `surat_disposisi`.
7. **Storage File Lifecycle & Zombie Storage**:
   * Saat surat dihapus, berkas fisik di disk `private` RustFS/S3 tidak pernah dibersihkan atau diarsipkan.
   * **Solusi Akar**: Implementasikan lifecycle pembersihan storage saat surat dihapus permanen (`forceDelete`).

### B. Titik Kritis Level CANGKANG (UI/UX, Layout, Mobile & Aksesibilitas)
1. **Navigasi Sidebar Datar & Hambatan Floating Action Button (FAB)**:
   * Menggunakan array datar 6 item tanpa struktur kategori semantik (`Ringkasan`, `Penatausahaan Surat`, `Tata Naskah & Laporan`, `Pengaturan`).
   * Tidak memiliki mode *collapsible desktop rail* (`w-72` $\leftrightarrow$ `w-20`).
   * Menggunakan tombol floating FAB menu mobile (`fixed bottom-6 right-6 p-4 rounded-full bg-emerald-600`) yang menabrak pagination tabel dan modal footer.
2. **Kerapuhan Tampilan Layar Ponsel (< 640px)**:
   * Tabel surat masuk dan keluar mengalami *horizontal overflow* kaku tanpa alternatif kartu bertumpuk (*stacked responsive cards*).
   * Formulir input surat masuk dan keluar memiliki kontras warna yang belum standar Zinc Dark Mode (`dark:bg-zinc-900`, `dark:border-zinc-800`).
   * Ukuran touch target tombol aksi baris tabel di bawah 36–44px (melanggar standar aksesibilitas WCAG 2.1 AA).

---

## 2. Kebutuhan Fungsional Sub-Sistem Persuratan (FR)

### FR-01: Layout Induk, Hierarki Sidebar & Collapsible Rail (`surat/layout.tsx`)
* **FR-01.1**: Struktur menu dikelompokkan ke dalam 4 kategori semantik:
  1. **Ringkasan**: Dashboard Modul Surat (`/surat`)
  2. **Penatausahaan Surat**: Agenda Surat Masuk (`/surat/masuk`), Input Surat Masuk & Disposisi (`/surat/masuk/create`), Agenda Surat Keluar (`/surat/keluar`), Input Surat Keluar (`/surat/keluar/create`)
  3. **Tata Naskah & Laporan**: Tata Naskah Dinas (`/surat/keluar/dinas`), Laporan Persuratan (`/surat/laporan`)
  4. **Pengaturan & Konfigurasi**: Pengaturan Template Naskah (`/surat/settings`)
* **FR-01.2**: Mode *Collapsible Rail* Desktop (`w-72` $\leftrightarrow$ `w-20`):
  * State `collapsed` disimpan di preferensi lokal atau state layout.
  * Saat ciut (`w-20`), judul kategori disembunyikan, teks label disembunyikan, ikon berada di posisi tengah dengan tooltip native `title={item.label}`.
* **FR-01.3**: Indikator Aktif: Garis vertikal emerald tebal 4px di sisi kiri (`bg-emerald-600 dark:bg-emerald-400`) dengan background aksen halus `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`.
* **FR-01.4**: Mobile Drawer Bebas Tabrakan: Hapus tombol floating FAB di pojok kanan bawah. Gunakan header top-bar terpadu dengan hamburger trigger, disertai backdrop gelap `bg-black/60 backdrop-blur-sm` dan penutupan otomatis saat link diklik.
* **FR-01.5**: Filter Menu Berdasarkan Hak Akses: Setiap item navigasi memiliki atribut permission dan difilter menggunakan `hasPermission()` atau `canWrite` dari hook `useRole()`.

### FR-02: Dashboard Hub Reaktif (`surat/page.tsx`)
* **FR-02.1**: Hapus seluruh ketergantungan pada `localStorage.getItem("bksda_saved_surat_masuk")`.
* **FR-02.2**: Migrasi ke `@tanstack/react-query` (`useQuery`) untuk mengambil statistik agregat surat masuk dan surat keluar.
* **FR-02.3**: Bento Grid Metric Cards: Total Surat Masuk, Total Disposisi Aktif, Total Surat Keluar, dan Template Naskah Aktif.
* **FR-02.4**: Recent Activity Feeds: 5 surat masuk terbaru dan 5 surat keluar terbaru dengan link langsung ke detail/preview.

### FR-03: Katalog Surat Masuk Modern & Server-Side Pagination (`surat/masuk/page.tsx`)
* **FR-03.1**: Server-Side Data Fetching:
  * Menggunakan `useQuery` dengan parameter `page`, `per_page` (10, 20, 50, 100), `search`, `sifat`, dan `rentang_tanggal`.
  * Sinkronisasi parameter ke URL query string (`useSearchParams`) dengan debounce 400ms pada input pencarian untuk kemudahan bookmark dan sharing.
* **FR-03.2**: Eliminasi Penuh LocalStorage: Hapus `bksda_saved_surat_masuk` agar data murni berasal dari server database PostgreSQL.
* **FR-03.3**: Enterprise Header Card: Pasang header seragam berbingkai `rounded-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800` lengkap dengan badge tema emerald, tombol Registrasi Surat, tombol Cetak Batch 2-Up, dan tombol Ekspor Excel.
* **FR-03.4**: Skeleton Table Loading: Tampilkan 5 baris skeleton animasi berdenyut saat transisi query untuk mengeliminasi Cumulative Layout Shift (CLS).
* **FR-03.5**: Mobile Responsive View: Pada viewport `< 640px`, tampilkan daftar surat dalam bentuk *responsive stacked cards* yang memuat No Agenda, Tanggal, Asal Surat, Perihal, Sifat, Diteruskan Ke, dan tombol aksi cepat.
* **FR-03.6**: Preservasi Fitur Cetak 2-Up & Popovers: Menjaga 100% integrasi `BatchPrintDisposisiModal`, `DiteruskanCellPopover` (dengan opsi Balai), `SifatCellPopover` (single-select), dan `ExportSuratMasukModal`.

### FR-04: Formulir Registrasi Surat Masuk & Lembar Disposisi (`surat/masuk/create/page.tsx`)
* **FR-04.1**: Dukungan Dark Mode Zinc Penuh: Gunakan kelas `bg-white dark:bg-zinc-900`, `border-zinc-200 dark:border-zinc-800`, `text-zinc-900 dark:text-zinc-100` pada seluruh card formulir.
* **FR-04.2**: Grid Responsif: Gunakan `grid grid-cols-1 md:grid-cols-2 gap-4` agar nyaman diisi di smartphone tanpa penyempitan bidang input.
* **FR-04.3**: Sticky Bottom Action Bar di Mobile: Tombol Simpan Surat Masuk dan Pratinjau Disposisi terkunci rapi di baris bawah layar saat diakses dari ponsel.
* **FR-04.4**: Sinkronisasi Nomor Agenda Otomatis: Menampilkan rekomendasi nomor agenda berikutnya dari server dengan kemampuan penyesuaian manual jika diperlukan.

### FR-05: Penatausahaan Surat Keluar & Tata Naskah Dinas (`surat/keluar/` & `surat/keluar/dinas/`)
* **FR-05.1**: Standarisasi URL Endpoint: Konsistensikan pemanggilan API ke endpoint `/api/surat/surat-keluar` (atau `/api/surat-keluar`).
* **FR-05.2**: Server-Side Filtering & Search: Terapkan `useQuery` dengan parameter pencarian nomor surat, tujuan, perihal, status draft/terdaftar, dan template dinas.
* **FR-05.3**: Tata Naskah Dinas Responsif: Form builder naskah dinas resmi di `/surat/keluar/dinas` diselaraskan dengan Dark Mode Zinc, tab navigasi naskah yang mudah diakses di ponsel, dan pratinjau instan.
* **FR-05.4**: Touch Targets 44px: Tombol Pratinjau, Edit, Cetak, dan Hapus memenuhi standar WCAG 2.1 AA.

### FR-06: Manajemen Template Surat Resmi (`surat/settings/page.tsx`)
* **FR-06.1**: Pengaturan master template surat dinas (Kop surat, penomoran otomatis, pejabat penandatangan, tembusan standar) menggunakan card modern berbasis React Query.
* **FR-06.2**: Fitur reset default aman dengan modal konfirmasi `useConfirm()`.

---

## 3. Kebutuhan Keamanan Backend (Security Requirements)

### SEC-01: Pembagian Hak Akses Granular (Granular RBAC)
* **SEC-01.1**: Rute pada `backend/app/Modules/Surat/Routes/api.php` wajib menerapkan middleware permission spesifik:
  * `GET /surat-masuk`, `GET /surat-keluar`, `GET /templates` $\rightarrow$ `permission:surat.view`
  * `POST /surat-masuk`, `POST /surat-keluar` $\rightarrow$ `permission:surat.create`
  * `PUT/PATCH /surat-masuk/{id}`, `/surat-keluar/{id}` $\rightarrow$ `permission:surat.update`
  * `DELETE /surat-masuk/{id}`, `/surat-keluar/{id}` $\rightarrow$ `permission:surat.delete`
  * `GET /surat-masuk/export/excel` $\rightarrow$ `permission:surat.export`
* **SEC-01.2**: Pengguna dengan hak baca biasa (`surat.view`) yang mencoba mengakses endpoint ekspor atau mutasi wajib menerima respon HTTP `403 Forbidden`.

### SEC-02: Pengerasan Validasi Berkas Unggahan (Upload Hardening)
* **SEC-02.1**: Berkas pindaian surat masuk dan lampiran surat keluar wajib dibatasi: `mimes:pdf,jpg,jpeg,png` dengan ukuran maksimal 10MB (`max:10240`).
* **SEC-02.2**: Pencegahan MIME spoofing dan eksekusi file berbahaya pada storage storage RustFS/S3.

### SEC-03: Proteksi Format Cetak Fisik Resmi (*Safety Boundary*)
* **SEC-03.1**: Refactoring frontend DILARANG mengubah atau merusak logika cetak fisik:
  * `LembarDisposisi2UpPrint.tsx` & `LembarDisposisiSheet.tsx` (Ukuran wajib terkunci `330mm 215mm` Folio/Letter Landscape, font `Agency FB` & `Arial Nova Cond`, 9 item checklist fisik, jeda halaman 2-up tanpa ghost page).
  * `SuratDinasDocument.tsx` (Format naskah dinas resmi A4).

### SEC-04: Automated Regression Test Suite
* **SEC-04.1**: Wajib dibuat file pengujian `backend/tests/Feature/Surat/SuratRegressionTest.php` yang mencakup:
  1. Proteksi otorisasi dan RBAC (401 unauthenticated, 403 unauthorized, 200/201 authorized).
  2. CRUD Surat Masuk dan relasi tabel `surat_disposisi`.
  3. CRUD Surat Keluar dan relasi `surat_templates`.
  4. Proteksi rute ekspor Excel (`surat.export`).
  5. Validasi payload ketat pada Form Request.
