# Daftar Tugas Teknis (Tasks): Modernisasi UI/UX & Pengerasan Keamanan BMN (Full Internals)

> **Petunjuk Eksekusi**: Kerjakan secara berurutan per fase. Centang `[x]` setiap tugas yang selesai. Jalankan pengujian otomatis dan lakukan commit bertahap dengan prinsip Ponytail.

---

## Fase 1: Modernisasi Layout & Navigasi Sidebar BMN
Standarisasi layout BMN mengacu langsung pada arsitektur `kepegawaian/layout.tsx`.

- [x] **1.1. Restrukturisasi Menu & Kategori**:
  - [x] Definisikan `BMN_SIDEBAR_ITEMS` dengan 4 kelompok (`Ringkasan`, `Inventaris & Transaksi`, `Penghapusan & Lelang`, `Dokumen & Pengaturan`) di `frontend/src/app/bmn/layout.tsx`.
  - [x] Pasang heading grup uppercase 10px tracking-widest dan border pemisah halus.
- [x] **1.2. Implementasi Collapsible Rail Sidebar Desktop**:
  - [x] Tambahkan state `collapsed` (toggle `w-72` $\leftrightarrow$ `w-20`) dengan tombol `PanelLeftClose`/`PanelLeftOpen`.
  - [x] Aktifkan mode ikon terpusat saat `collapsed` dengan atribut `title={item.label}` untuk tooltip native.
  - [x] Tambahkan garis aksen aktif emerald vertikal 4px di sisi kiri (`bg-emerald-600 dark:bg-emerald-400`).
- [x] **1.3. Perbaikan Navigasi Mobile Drawer**:
  - [x] Hapus tombol floating FAB bulat di kanan bawah yang menabrak pagination tabel dan modal footer.
  - [x] Pasang trigger menu mobile terpadu di top bar dengan backdrop redup `bg-slate-950/60` dan auto-close saat navigasi diklik.
- [x] **1.4. Footer Pengguna & Unifikasi Token Dark Mode**:
  - [x] Pasang avatar inisial pengguna, badge role, dan tombol logout terpadu.
  - [x] Unifikasi palet warna dark mode ke `zinc-900`/`zinc-950`.

---

## Fase 2: Standarisasi Header, Tabel, Touch Targets & React Query
Penerapan standar UI-UX-Pro-Max dan efisiensi Ponytail pada halaman katalog dan transaksi.

- [x] **2.1. Aksesibilitas Touch Target & Aksi Tabel**:
  - [x] Ubah selektor aksi tabel di `bmn/assets/page.tsx` dari `opacity-0 group-hover:opacity-100` menjadi `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`.
  - [x] Pastikan ukuran tombol aksi minimal 36–44px untuk memenuhi standar WCAG 2.1 AA.
  - [x] Jaga integritas sinkronisasi 8 filter URL `searchParams` (`search`, `nup`, `kondisi`, `jenis_bmn`, `lokasi_ruang`, `tag_ids`, `page`, `per_page`).
- [x] **2.2. Enterprise Header Card**:
  - [x] Pasang header seragam berbingkai `rounded-2xl border` dengan ikon badge bertema emerald di:
    - [x] `frontend/src/app/bmn/assets/page.tsx`
    - [x] `frontend/src/app/bmn/loans/page.tsx`
    - [x] `frontend/src/app/bmn/maintenances/page.tsx`
    - [x] `frontend/src/app/bmn/disposal/page.tsx`
    - [x] `frontend/src/app/bmn/auction-batches/page.tsx`
- [x] **2.3. Migrasi `loans/page.tsx` ke `@tanstack/react-query`**:
  - [x] Ganti `fetchRecords()` manual dan `useState` lokal dengan hook `useQuery`.
  - [x] Hilangkan 60+ baris boilerplate penanganan loading, error, dan pagination lokal.
- [x] **2.4. Penerapan Skeleton Table Loading**:
  - [x] Ganti spinner tunggal `Loader2` di tengah cell kosong dengan 5 baris skeleton berdenyut di halaman tabel master untuk mengeliminasi CLS.

---

## Fase 3: Penataan Sub-Halaman Internal ("Jeroan" BMN)
Penyelesaian isu dark mode, stepper, error handling, dan responsivitas halaman detail & wizard.

- [x] **3.1. Penambahan Aset Melalui Impor Excel SIMAN (revisi10 November2026)**:
  - [x] Hapus formulir manual dan pintasan Tambah Aset; blueprint wizard lama dibatalkan atas keputusan pengguna.
  - [x] Arahkan URL create lama ke Data Aset, pertahankan Impor Excel/review dan izin existing.
- [x] **3.2. Formulir Peminjaman Baru (`loans/create/page.tsx`)**:
  - [x] Saring opsi aset agar aset berstatus `active_loan` atau `Rusak Berat` diberi penanda non-aktif.
  - [x] Perbaiki penanganan error agar pesan validasi backend ditampilkan ke pengguna via toast.
- [x] **3.3. Review Import Batch (`import-review/[batchId]/page.tsx`)**:
  - [x] Ubah summary cards dari `grid-cols-4` menjadi `grid-cols-2 md:grid-cols-4`.
  - [x] Tambahkan styling Dark Mode pada filter identitas dan toolbar seleksi massal.
  - [x] Format komparasi diff menjadi kartu vertikal bertumpuk di layar ponsel.
- [x] **3.4. Detail Aset & Eliminasi Polling 3 Detik (`assets/[id]/page.tsx`)**:
  - [x] Hapus `refetchInterval: 3000`. Refetch data reaktif via invalidasi query.
  - [x] Rapikan breadcrumb navigasi top bar di resolusi mobile 375px.
  - [x] Pasang *sticky bottom action bar* untuk tombol simpan/batal pada mode edit di layar ponsel.
- [x] **3.5. Detail Lelang 10 Tab (`auction-batches/[id]/page.tsx`)**:
  - [x] Pasang *Dropdown Select Switcher* atau *Scrollable Pill Rail* di layar ponsel `< md`.
  - [x] Terapkan format kartu tumpuk (*stacked valuation card*) pada tabel taksiran harga di layar < 640px.

---

## Fase 4: Pengerasan Keamanan Backend, Proteksi Print A4 & Automated Test
Pencegahan kebocoran data ekspor, validasi upload, dan pengujian regresi menyeluruh.

- [x] **4.1. Pengerasan Hak Akses Ekspor Data Sensitif**:
  - [x] Perbarui rute `assets/export`, `loans/export`, dan `maintenances/export` di `backend/app/Modules/Bmn/Routes/api.php` agar mewajibkan `permission:bmn.asset.export` atau `permission:bmn.asset.update`.
  - [x] Pastikan akun bertingkat staf biasa (`bmn.view`) ditolak dengan kode respon HTTP 403 Forbidden.
- [x] **4.2. Pengerasan Validasi Unggah Berkas Import Review**:
  - [x] Perketat validasi pada `ImportReviewController::upload` dengan batas `max:10240` (10MB) dan ekstensi strictly `xlsx,xls`.
- [x] **4.3. Penyelarasan Permission Laporan di Frontend**:
  - [x] Perbaiki pengecekan hak akses di `frontend/src/app/bmn/reports/page.tsx` agar tombol terbitkan dokumen mengacu pada `bmn.document.generate`.
  - [x] Pastikan akun read-only tidak melihat checkbox bulk aksi atau tombol mutasi yang tidak berhak.
- [x] **4.4. Verifikasi Proteksi Format Cetak Dokumen A4**:
  - [x] Pastikan isolasi template cetak resmi (`*Document.tsx` dan `AuctionDocumentRenderer.tsx`) tidak terganggu, margin A4 dan kop dinas tetap presisi 100%.
- [x] **4.5. Pembuatan Automated Test Suite Mandiri**:
  - [x] Buat file test `backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php` yang menguji proteksi ekspor, upload guard, dan integritas otorisasi CRUD.
  - [x] Jalankan seluruh suite test backend dan frontend (`npm run build` / playwright checks).
  - [x] Perbarui `docs/progress.md` dan lakukan commit lokal.
