# Daftar Tugas Teknis (Tasks): Modernisasi UI/UX & Pengerasan Keamanan BMN (Full Internals)

> **Petunjuk Eksekusi**: Kerjakan secara berurutan per fase. Centang `[x]` setiap tugas yang selesai. Jalankan pengujian otomatis dan lakukan commit bertahap dengan prinsip Ponytail.

---

## Fase 1: Modernisasi Layout & Navigasi Sidebar BMN
Standarisasi layout BMN mengacu langsung pada arsitektur `kepegawaian/layout.tsx`.

- [ ] **1.1. Restrukturisasi Menu & Kategori**:
  - [ ] Definisikan `BMN_SIDEBAR_ITEMS` dengan 4 kelompok (`Ringkasan`, `Inventaris & Transaksi`, `Penghapusan & Lelang`, `Dokumen & Pengaturan`) di `frontend/src/app/bmn/layout.tsx`.
  - [ ] Pasang heading grup uppercase 10px tracking-widest dan border pemisah halus.
- [ ] **1.2. Implementasi Collapsible Rail Sidebar Desktop**:
  - [ ] Tambahkan state `collapsed` (toggle `w-72` $\leftrightarrow$ `w-20`) dengan tombol `PanelLeftClose`/`PanelLeftOpen`.
  - [ ] Aktifkan mode ikon terpusat saat `collapsed` dengan atribut `title={item.label}` untuk tooltip native.
  - [ ] Tambahkan garis aksen aktif emerald vertikal 4px di sisi kiri (`bg-emerald-600 dark:bg-emerald-400`).
- [ ] **1.3. Perbaikan Navigasi Mobile Drawer**:
  - [ ] Hapus tombol floating FAB bulat di kanan bawah yang menabrak pagination tabel dan modal footer.
  - [ ] Pasang trigger menu mobile terpadu di top bar dengan backdrop redup `bg-slate-950/60` dan auto-close saat navigasi diklik.
- [ ] **1.4. Footer Pengguna & Unifikasi Token Dark Mode**:
  - [ ] Pasang avatar inisial pengguna, badge role, dan tombol logout terpadu.
  - [ ] Unifikasi palet warna dark mode ke `zinc-900`/`zinc-950`.

---

## Fase 2: Standarisasi Header, Tabel, Touch Targets & React Query
Penerapan standar UI-UX-Pro-Max dan efisiensi Ponytail pada halaman katalog dan transaksi.

- [ ] **2.1. Aksesibilitas Touch Target & Aksi Tabel**:
  - [ ] Ubah selektor aksi tabel di `bmn/assets/page.tsx` dari `opacity-0 group-hover:opacity-100` menjadi `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`.
  - [ ] Pastikan ukuran tombol aksi minimal 36–44px untuk memenuhi standar WCAG 2.1 AA.
  - [ ] Jaga integritas sinkronisasi 8 filter URL `searchParams` (`search`, `nup`, `kondisi`, `jenis_bmn`, `lokasi_ruang`, `tag_ids`, `page`, `per_page`).
- [ ] **2.2. Enterprise Header Card**:
  - [ ] Pasang header seragam berbingkai `rounded-2xl border` dengan ikon badge bertema emerald di:
    - [ ] `frontend/src/app/bmn/assets/page.tsx`
    - [ ] `frontend/src/app/bmn/loans/page.tsx`
    - [ ] `frontend/src/app/bmn/maintenances/page.tsx`
    - [ ] `frontend/src/app/bmn/disposal/page.tsx`
    - [ ] `frontend/src/app/bmn/auction-batches/page.tsx`
- [ ] **2.3. Migrasi `loans/page.tsx` ke `@tanstack/react-query`**:
  - [ ] Ganti `fetchRecords()` manual dan `useState` lokal dengan hook `useQuery`.
  - [ ] Hilangkan 60+ baris boilerplate penanganan loading, error, dan pagination lokal.
- [ ] **2.4. Penerapan Skeleton Table Loading**:
  - [ ] Ganti spinner tunggal `Loader2` di tengah cell kosong dengan 5 baris skeleton berdenyut di halaman tabel master untuk mengeliminasi CLS.

---

## Fase 3: Penataan Sub-Halaman Internal ("Jeroan" BMN)
Penyelesaian isu dark mode, stepper, error handling, dan responsivitas halaman detail & wizard.

- [ ] **3.1. Wizard Tambah Aset (`assets/create/page.tsx`)**:
  - [ ] Terapkan Dark Mode Zinc pada seluruh 5 step wizard (hilangkan hardcoded putih terang).
  - [ ] Ubah baris stepper 5 tombol menjadi responsif di layar ponsel `< 640px` (badge step ringkas).
  - [ ] Ubah grid form menjadi `grid-cols-1 sm:grid-cols-2` agar tidak terjepit.
- [ ] **3.2. Formulir Peminjaman Baru (`loans/create/page.tsx`)**:
  - [ ] Saring opsi aset agar aset berstatus `active_loan` atau `Rusak Berat` diberi penanda non-aktif.
  - [ ] Perbaiki penanganan error agar pesan validasi backend ditampilkan ke pengguna via toast.
- [ ] **3.3. Review Import Batch (`import-review/[batchId]/page.tsx`)**:
  - [ ] Ubah summary cards dari `grid-cols-4` menjadi `grid-cols-2 md:grid-cols-4`.
  - [ ] Tambahkan styling Dark Mode pada filter identitas dan toolbar seleksi massal.
  - [ ] Format komparasi diff menjadi kartu vertikal bertumpuk di layar ponsel.
- [ ] **3.4. Detail Aset & Eliminasi Polling 3 Detik (`assets/[id]/page.tsx`)**:
  - [ ] Hapus `refetchInterval: 3000`. Refetch data reaktif via invalidasi query.
  - [ ] Rapikan breadcrumb navigasi top bar di resolusi mobile 375px.
  - [ ] Pasang *sticky bottom action bar* untuk tombol simpan/batal pada mode edit di layar ponsel.
- [ ] **3.5. Detail Lelang 10 Tab (`auction-batches/[id]/page.tsx`)**:
  - [ ] Pasang *Dropdown Select Switcher* atau *Scrollable Pill Rail* di layar ponsel `< md`.
  - [ ] Terapkan format kartu tumpuk (*stacked valuation card*) pada tabel taksiran harga di layar < 640px.

---

## Fase 4: Pengerasan Keamanan Backend, Proteksi Print A4 & Automated Test
Pencegahan kebocoran data ekspor, validasi upload, dan pengujian regresi menyeluruh.

- [ ] **4.1. Pengerasan Hak Akses Ekspor Data Sensitif**:
  - [ ] Perbarui rute `assets/export`, `loans/export`, dan `maintenances/export` di `backend/app/Modules/Bmn/Routes/api.php` agar mewajibkan `permission:bmn.asset.export` atau `permission:bmn.asset.update`.
  - [ ] Pastikan akun bertingkat staf biasa (`bmn.view`) ditolak dengan kode respon HTTP 403 Forbidden.
- [ ] **4.2. Pengerasan Validasi Unggah Berkas Import Review**:
  - [ ] Perketat validasi pada `ImportReviewController::upload` dengan batas `max:10240` (10MB) dan ekstensi strictly `xlsx,xls`.
- [ ] **4.3. Penyelarasan Permission Laporan di Frontend**:
  - [ ] Perbaiki pengecekan hak akses di `frontend/src/app/bmn/reports/page.tsx` agar tombol terbitkan dokumen mengacu pada `bmn.document.generate`.
  - [ ] Pastikan akun read-only tidak melihat checkbox bulk aksi atau tombol mutasi yang tidak berhak.
- [ ] **4.4. Verifikasi Proteksi Format Cetak Dokumen A4**:
  - [ ] Pastikan isolasi template cetak resmi (`*Document.tsx` dan `AuctionDocumentRenderer.tsx`) tidak terganggu, margin A4 dan kop dinas tetap presisi 100%.
- [ ] **4.5. Pembuatan Automated Test Suite Mandiri**:
  - [ ] Buat file test `backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php` yang menguji proteksi ekspor, upload guard, dan integritas otorisasi CRUD.
  - [ ] Jalankan seluruh suite test backend dan frontend (`npm run build` / playwright checks).
  - [ ] Perbarui `docs/progress.md` dan lakukan commit lokal.
