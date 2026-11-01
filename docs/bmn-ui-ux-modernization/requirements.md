# Dokumen Kebutuhan Teknis (SRS): Modernisasi UI/UX & Pengerasan Keamanan Modul BMN (Full Internals)

> **ID Inisiatif**: `BMN-MODERNIZATION-2026`  
> **Standar Rujukan**: Modul Kepegawaian (`frontend/src/app/kepegawaian/`)  
> **Prinsip**: Ponytail (Zero Bloat, Deletion > Addition, Boring > Clever) + UI-UX-Pro-Max + Security Audit  
> **Cakupan**: Seluruh sub-sistem BMN (Layout, Katalog, Detail, Wizard Create, Peminjaman, Pemeliharaan, Lelang 10 Tab, Import Review Diff, Pengaturan Master, dan Backend Routes/Services)

---

## 1. Analisis Menyeluruh "Jeroan" Modul BMN (Deep Internals Gap)

Pemeriksaan mendalam pada kode sumber sub-halaman BMN menemukan titik kritis internal yang sebelumnya terlewat:

1. **Wizard Tambah Aset (`assets/create/page.tsx`)**:
   * **Buta Dark Mode Total**: Seluruh formulir (5 step: *Identitas, Detail, Nilai, Lokasi, Foto*) menggunakan kelas hardcoded `bg-white`, `text-slate-900`, `ring-slate-200/60` tanpa satupun tag `dark:bg-zinc-900` atau `dark:text-white`. Saat dark mode aktif, halaman ini silau putih benderang dan teks input kontrasnya rusak.
   * **Stepper Meluap di Ponsel**: Baris stepper 5 tombol (`flex items-center gap-1`) dipaksa dalam satu baris horizontal tanpa wrap. Di layar ponsel 375px, tombol-tombol step bertumpuk dan terpotong.
   * **Grid 2 Kolom Gepeng**: Formulir input menggunakan `grid-cols-2` tanpa breakpoint responsif, membuat field input menyempit di bawah 160px pada layar ponsel.
2. **Formulir Peminjaman Baru (`loans/create/page.tsx`)**:
   * **Aset Terpinjam Masih Bisa Dipilih**: Combobox pemilih aset memanggil `/bmn/assets` tanpa menyaring aset yang sedang aktif dipinjam (`active_loan`).
   * **Pesan Error Ditelan Mentah-mentah**: Ketika backend melempar validasi `Exception("Aset 'X' sedang dalam peminjaman aktif.")`, frontend menangkapnya dengan `catch` kosong dan hanya memunculkan `toast.error("Gagal mengirim permohonan")`, membingungkan pengguna tanpa penjelasan.
3. **Review Import Batch (`import-review/[batchId]/page.tsx`)**:
   * **Summary Card Jebol di Ponsel**: Kartu ringkasan (*Total, Baru, Update, Tidak Berubah*) menggunakan `grid-cols-4` kaku. Di layar 375px, kartu terjepit menjadi lebar ~80px dan angka terpotong.
   * **Filter Identitas Tanpa Dark Mode**: Kontainer pencarian Kode Barang, NUP, dan Nama Barang tidak memiliki kelas dark mode (`bg-white border-slate-200`).
4. **Kebocoran Data Sensitif & Satker Boundary di Backend**:
   * Rute `GET /api/bmn/assets/export`, `loans/export`, `maintenances/export` hanya dilindungi `bmn.view`. Seluruh staf biasa dapat menyedot 80 kolom data SIMAN dan BPKB negara.
   * `LoanService::listLoans` belum membatasi data peminjaman antar-Satker (Seksi Wilayah I Berau vs Seksi Wilayah III Balikpapan).

---

## 2. Kebutuhan Fungsional Sub-Sistem BMN (FR)

### FR-01: Navigasi Sidebar & Layout Induk (`bmn/layout.tsx`)
* **FR-01.1**: Menu dibagi 4 kelompok terstruktur: *Ringkasan*, *Inventaris & Transaksi*, *Penghapusan & Lelang*, *Dokumen & Pengaturan*.
* **FR-01.2**: Sidebar desktop mendukung mode ciut (*collapsible rail* `w-72` $\leftrightarrow$ `w-20`) dengan tooltip native pada atribut `title`.
* **FR-01.3**: Hapus tombol mengambang FAB (`fixed bottom-6 right-6`) yang menabrak pagination dan modal footer. Ganti dengan tombol trigger bersih di header mobile.
* **FR-01.4**: Indikator aktif vertikal emerald (`bg-emerald-600 dark:bg-emerald-400`).

### FR-02: Aksesibilitas Katalog & Touch Target 44px (`bmn/assets/page.tsx`)
* **FR-02.1**: Aksi baris tabel wajib tampak di layar sentuh tanpa efek kursor hover: `opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity`.
* **FR-02.2**: Ukuran tombol aksi minimal 36–44px (memenuhi WCAG 2.1 AA).
* **FR-02.3**: Pertahankan integritas 8 parameter sinkronisasi URL `searchParams` dengan debouncing 400ms.

### FR-03: Wizard Tambah Aset Berbasis Zinc & Responsif (`bmn/assets/create/page.tsx`)
* **FR-03.1**: Terapkan dukungan penuh Dark Mode palet Zinc (`bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800/80 text-slate-900 dark:text-zinc-100`) pada seluruh 5 langkah wizard.
* **FR-03.2**: Stepper 5 langkah responsif: di layar mobile `< 640px`, tampilkan indikator nomor ringkas (*compact stepper badge*) atau pill dengan scroll horizontal.
* **FR-03.3**: Field input diubah menjadi `grid-cols-1 sm:grid-cols-2` agar nyaman diisi di smartphone.

### FR-04: Transaksi Peminjaman Tanpa Bug & React Query (`bmn/loans/`)
* **FR-04.1 (`loans/create/page.tsx`)**: Filter aset yang tersedia untuk dipinjam agar aset berstatus `active_loan` atau `Rusak Berat` diberi badge non-aktif dan dicegah pemilihannya.
* **FR-04.2**: Tangani pesan error backend secara presisi: `toast.error(err.response?.data?.message || "Gagal meminjam aset")`.
* **FR-04.3 (`loans/page.tsx`)**: Migrasi total dari `useState`/`useEffect` manual ke hook `@tanstack/react-query` (`useQuery`), menghapus 60+ baris boilerplate kode lama.

### FR-05: Halaman Detail Aset Tanpa Zombie Polling (`bmn/assets/[id]/page.tsx`)
* **FR-05.1**: Hapus `refetchInterval: 3000`. Refetch data hanya dipicu oleh mutasi sukses via `queryClient.invalidateQueries`.
* **FR-05.2**: Breadcrumb pada layar < 640px dipangkas agar tidak meluap bertumpuk.
* **FR-05.3**: Tombol simpan/batal pada mode edit di mobile diubah menjadi *Sticky Bottom Action Bar*.

### FR-06: Solusi Mobile untuk Halaman Lelang 10 Tab (`bmn/auction-batches/[id]`)
* **FR-06.1**: Navigasi 10 tab horizontal diubah menjadi *Dropdown Select Switcher* atau *Scrollable Pill Rail* pada layar ponsel `< md`.
* **FR-06.2**: Tabel taksiran harga lelang (`ValuationTab`) beralih ke layout kartu tumpuk (*stacked valuation card*) di layar < 640px dengan input rupiah setinggi 44px.

### FR-07: Import Review Responsif & Dukungan Dark Mode (`bmn/import-review/[batchId]`)
* **FR-07.1**: Kartu ringkasan diubah dari `grid-cols-4` menjadi `grid-cols-2 md:grid-cols-4`.
* **FR-07.2**: Terapkan kelas Dark Mode pada kontainer filter identitas dan toolbar seleksi massal.
* **FR-07.3**: Format tabel perbandingan diff multi-kolom diubah menjadi *stacked comparison cards* di layar ponsel.

---

## 3. Kebutuhan Keamanan Backend (Security Requirements)

### SEC-01: Proteksi Data Master Sensitif pada Endpoint Ekspor
* **SEC-01.1**: Rute `GET /api/bmn/assets/export`, `loans/export`, `maintenances/export` di [`api.php`](file:///E:/bksda-superapp/backend/app/Modules/Bmn/Routes/api.php) wajib dinaikkan guard-nya menjadi `permission:bmn.asset.export` atau `permission:bmn.asset.update`.
* **SEC-01.2**: Pengguna dengan hak baca biasa (`bmn.view`) yang menembak rute ekspor wajib menerima HTTP `403 Forbidden`.

### SEC-02: Pencegahan DoS & Validasi Berkas Import Review
* **SEC-02.1**: `ImportReviewController::upload` wajib membatasi ukuran berkas maksimal 10MB (`max:10240`) dan ekstensi strictly `xlsx,xls`.
* **SEC-02.2**: Batasi pembacaan baris Excel maksimal 5.000 baris per batch untuk melindungi memori PHP-FPM.

### SEC-03: Penyelarasan Permission Laporan di Frontend
* **SEC-03.1**: Tombol penerbitan dokumen laporan di `frontend/src/app/bmn/reports/page.tsx` wajib diverifikasi menggunakan `hasPermission("bmn.document.generate")`, bukan `bmn.document.delete`.

### SEC-04: Isolasi Template Cetak Resmi A4 (*Safety Boundary*)
* **SEC-04.1**: Refactoring form DILARANG mengubah berkas cetak fisik A4 kementerian (`CoveringLetterDocument.tsx`, `HandoverAgreementDocument.tsx`, `PowerOfAttorneyDocument.tsx`, `UsageAgreementDocument.tsx`, dan `AuctionDocumentRenderer.tsx`).
