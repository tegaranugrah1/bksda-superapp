# Audit Visual & Penyelarasan Modul Persuratan (`/surat`)

Tanggal: 11 November 2026  
Status: Selesai diimplementasikan & diverifikasi (belum di-commit sesuai instruksi)  
Acuan Standar: [DESIGN_SYSTEM_COLORS.md](../DESIGN_SYSTEM_COLORS.md) & [animate-ui-motion-guidelines.md](../animate-ui-motion-guidelines.md)  
Prinsip Kerja: `/ponytail` (reuse helper/CSS bersama, tanpa abstraksi atau dependency baru, diff minimal pada akar masalah, disertai satu runnable check `frontend/tests/persuratan-ui.cjs`)

---

## 1. Ringkasan Eksekutif

Modul **Persuratan** (`frontend/src/app/surat/*`) sebelumnya belum terhubung ke sistem token desain terpusat (`[data-module="persuratan"]`) dan masih menggunakan kombinasi warna *Emerald* (milik BMN), *Blue* (milik Kepegawaian), serta teks sekunder pucat (`text-zinc-400`/`text-slate-400` di bawah 12px). Selain itu, beberapa modal menggunakan `div` overlay manual tanpa primitif `Dialog` (sehingga tidak mendukung penutupan `Escape` dan pengembalian fokus ke pemicu), kontrol tab belum memiliki atribut ARIA `tablist`/`tab`/`tabpanel` serta navigasi keyboard (`ArrowLeft`/`ArrowRight`/`Home`/`End`), dan tabel daftar surat masih terlalu renggang untuk layar laptop standar `1366 x 768` (100%).

Audit dan penyelarasan ini menyamakan standar visual, aksesibilitas, ergonomi 1366×768, dan perilaku motion modul **Persuratan** dengan **BMN** dan **Kepegawaian** menggunakan identitas warna **Indigo** resmi dari `docs/DESIGN_SYSTEM_COLORS.md`.

---

## 2. Daftar Temuan Audit & Matriks Perubahan

| No | Area / Berkas | Temuan Sebelumnya | Penyelarasan (Standar BMN & Kepegawaian) |
| --- | --- | --- | --- |
| 1 | **Token Desain (`globals.css`)** | `[data-module="persuratan"]` belum didefinisikan di `globals.css`; warna ungu/Indigo dinilai kurang cocok bagi pengguna senior/orang tua di lingkungan kedinasan. | Menambahkan `[data-module="persuratan"]` pada blok fondasi light/dark di `globals.css` dengan palet **Teal Kedinasan** (`#0f766e` light / `#2dd4bf` dark, `--ds-accent-fg: #0f766e` light / `#5eead4` dark, `--ds-accent-soft: #f0fdfa` light / `#042f2e` dark, `--ds-accent-soft-border: #99f6e4` light / `#115e59` dark) serta menyertakan `--ds-fg-secondary` (`#334155` light / `#d4d4d8` dark) untuk semua modul. |
| 2 | **Kontrol & Shell Bersama (`surat-tugas.css` & `kepegawaian.css`)** | Aturan kontrol `.st-ui` dan `.kpg-ui` belum mencakup Persuratan. | Memperluas selektor `.st-ui, .kpg-ui, .psr-ui` dan `.kpg-shell, .psr-shell` (Ponytail Rung 2: reuse CSS yang sudah ada, 0 file CSS duplikat baru). |
| 3 | **Layout & Sidebar (`surat/layout.tsx`)** | Tidak memiliki `data-module="persuratan"`, masih memakai gradien Emerald dan garis kiri statis, belum memiliki spring indicator `stiffness: 450, damping: 35`, dot kanan aktif, `Escape` close + focus return pada drawer mobile, serta `MotionConfig reducedMotion="user"`. | Menyelaraskan `surat/layout.tsx` 1:1 dengan `bmn/layout.tsx` & `kepegawaian/layout.tsx`: wrapper `data-module="persuratan" className="psr-shell"`, ikon & avatar `bg-[var(--ds-accent-solid)]`, subjudul uppercase bold `text-[var(--ds-accent-fg)]`, header grup `text-[var(--ds-fg-secondary)]`, indikator aktif spring `450/35` + dot kanan `w-1.5 h-1.5 rounded-full bg-[var(--ds-accent-solid)]`, footer `bg-[var(--ds-surface-muted)]`, dan transisi konten `160ms`. |
| 4 | **Dashboard Persuratan & BMN (`surat/page.tsx`, `SuratHubComponents.tsx`, `bmn/page.tsx`)** | Ukuran dan anatomi judul header dashboard berbeda-beda (`SuratHubComponents` memakai pill badge di atas judul `text-lg md:text-xl` tanpa kotak ikon kiri, sedangkan `bmn/page.tsx` memakai overline tambahan di atas `h1`); pada tabel Surat Keluar Terbaru nomor surat dan badge `Signed` sama-sama berwarna hijau. | Menetapkan **Dashboard Kepegawaian (`kepegawaian/page.tsx`)** sebagai patokan ukuran header dashboard lintas modul: kotak ikon `w-10 h-10 rounded-xl` (`w-5 h-5`), judul `h1` `text-xl md:text-2xl font-bold tracking-tight` (`Dashboard Persuratan` & `Dashboard BMN`) tanpa overline tambahan di atas `h1`, dan 1 baris deskripsi `text-xs text-[var(--ds-fg-muted)] mt-0.5`. Nomor surat keluar memakai `--ds-fg` agar kontras dengan badge status `Signed`/`Terdaftar`. |
| 5 | **Agenda Surat Masuk (`surat/masuk/page.tsx`)** | Padding `p-5 md:p-7 space-y-5`, ukuran kolom tabel terlalu lebar di `1366 x 768`, belum menampilkan banner error dengan tombol `Coba lagi`, `useConfirm` belum meneruskan `contentModule: "persuratan"`. | Mengoptimalkan kepadatan `p-4 md:p-5 space-y-3` untuk `1366 x 768` (100%), merapikan lebar kolom tabel agar tidak memicu scroll horizontal yang tidak perlu, menambahkan state error + `Coba lagi`, menerapkan token Indigo pada tombol/checkbox/baris terpilih (`aria-selected`), dan meneruskan `contentModule: "persuratan"` ke `useConfirm`. |
| 6 | **Popover Sifat & Disposisi (`SifatCellPopover.tsx` & `DiteruskanCellPopover.tsx`)** | `PopoverContent` portaled ke `document.body` tanpa `data-module="persuratan"`, opsi list menggunakan `<div onClick>` tanpa dukungan keyboard (`button`), tab Ruangan/Pegawai belum memiliki `role="tablist"`/`role="tab"`. | Menambahkan `data-module="persuratan" className="psr-ui ..."` pada `PopoverContent`, mengubah item pilihan menjadi `<button type="button">` dengan `aria-pressed`, dan menggunakan `useKepegawaianTabs` untuk tab Ruangan Balai / Pegawai Balai. |
| 7 | **Modal Export & Cetak Batch (`ExportSuratMasukModal.tsx` & `BatchPrintDisposisiModal.tsx`)** | Menggunakan `<div className="fixed inset-0">` manual tanpa trap fokus, penutupan `Escape`, dan pengembalian fokus ke tombol pemicu. | Menggunakan komponen `KepegawaianDialog` (dengan `module="persuratan"`) yang membungkus `DialogContent` + `useDialogFocusReturn`, sehingga mendukung `Escape`, klik luar, dan pengembalian fokus otomatis. Area kertas cetak (`LembarDisposisiSheet`) tetap putih (`#ffffff`) dan hitam (`#000000`) di kedua tema. |
| 8 | **Form Surat Masuk & Disposisi (`surat/masuk/create/page.tsx` & `LembarDisposisiForm.tsx`)** | Aksen form menggunakan Emerald/Blue campur, switcher posisi 1-Up belum memakai atribut `aria-pressed`, pratinjau kertas 2-Up perlu pembungkus scroll horizontal internal pada layar sempit. | Menerapkan `.psr-ui`, menyamakan tombol utama ke Indigo, menambahkan `aria-pressed` pada kontrol posisi 1-Up, serta membungkus pratinjau kertas `LembarDisposisi2UpPrint` dengan `overflow-x-auto` agar kertas resmi tetap utuh tanpa merusak lebar halaman. |
| 9 | **Daftar Surat Keluar (`surat/keluar/page.tsx`)** | Query menelan error (`catch { return []; }`) sehingga gagal membedakan antara error jaringan dan data kosong; tab status belum memakai `useKepegawaianTabs` & `KepegawaianTabContent`; modal pratinjau & edit manual belum memakai `data-module="persuratan"` dan `useDialogFocusReturn`. | Menghapus `try/catch` yang menelan error pada `useQuery` dan menampilkan state error + `Coba lagi`; menerapkan `useKepegawaianTabs` (panah kiri/kanan, `Home`, `End`) dan `KepegawaianTabContent` (`160ms`, `inert` saat keluar); menambahkan `data-module="persuratan"`, `className="psr-ui"`, dan `useDialogFocusReturn` pada dialog pratinjau & edit manual; merapikan tabel untuk `1366 x 768`. |
| 10 | **Input Manual Surat Keluar (`surat/keluar/create/page.tsx`)** | Tombol simpan memakai Blue hardcoded, input file belum memiliki fokus outline 2px dan gaya `.kpg-upload`. | Menerapkan `.psr-ui`, tombol utama Indigo, serta pembungkus upload yang ramah keyboard (`focus-within` / `focus-visible` outline 2px `--ds-accent-fg`). |
| 11 | **Generator Tata Naskah Dinas (`surat/keluar/dinas/page.tsx` & `TemplatePickerModal.tsx`)** | Tombol dan aksen campur antara Emerald/Blue/Indigo, `DropdownMenuContent` dan `TemplatePickerModal` portaled tanpa `data-module="persuratan"`, tab kategori di `TemplatePickerModal` belum memakai `useKepegawaianTabs`, serta kontrol Nomor Naskah dan kartu form memakai border/shadow tebal (`shadow-sm`, `shadow-xl ring-1`, `font-bold`, dan variabel `--ds-accent-border`/`--ds-accent-text` yang tidak terdefinisi sehingga jatuh ke `currentColor`). | Menerapkan `.psr-ui`, menyatukan seluruh token ke variabel resmi (`--ds-accent-soft-border`, `--ds-accent-fg`, `--ds-accent-on-solid`, `--ds-accent-hover`, `--ds-surface-muted`), meringankan tampilan **Nomor Naskah** (badge tanpa border berat, switcher pill `bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] border-[var(--ds-border-subtle)]`, input segmen nomor `font-medium` & pemisah `font-normal`), menghapus drop-shadow pada kartu ber-border dan pratinjau kertas A4 (`SuratDinasDocument`), serta menjaga kertas A4 tetap `#ffffff`/`#000000` di mode gelap. |
| 12 | **Pengaturan Template (`surat/settings/page.tsx`)** | Menggunakan `window.confirm()` native untuk reset template, serta `<div className="fixed inset-0">` manual untuk modal tambah/edit dan hapus template. | Mengganti `window.confirm()` dan modal hapus manual dengan `useConfirm()` (`contentModule: "persuratan"`), menggunakan `KepegawaianDialog` (`module="persuratan"`) untuk modal tambah/edit template, menggunakan `useKepegawaianTabs` pada tab filter kategori, serta menambahkan state error + `Coba lagi`. |

---

## 3. Spesifikasi Token Warna Persuratan (`[data-module="persuratan"]`)

Sesuai Tabel Bagian 4.1 dan 4.2 pada [`docs/DESIGN_SYSTEM_COLORS.md`](../DESIGN_SYSTEM_COLORS.md):

| Token | Light Mode | Dark Mode | Kegunaan |
| --- | --- | --- | --- |
| `--ds-accent-solid` | `#0f766e` | `#2dd4bf` | Latar tombol utama, badge ikon header sidebar, indikator dot aktif |
| `--ds-accent-hover` | `#115e59` | `#5eead4` | Hover tombol utama |
| `--ds-accent-active` | `#134e4a` | `#99f6e4` | Active/pressed tombol utama |
| `--ds-accent-on-solid` | `#ffffff` | `#0f172a` | Teks/ikon di atas `--ds-accent-solid` |
| `--ds-accent-fg` | `#0f766e` | `#5eead4` | Teks aksen, nomor agenda, ikon aktif, outline fokus 2px |
| `--ds-accent-soft` | `#f0fdfa` | `#042f2e` | Latar item navigasi aktif, baris tabel terpilih, hover ghost/menuitem |
| `--ds-accent-soft-border` | `#99f6e4` | `#115e59` | Border item navigasi aktif dan kartu terpilih |

---

## 4. Ergonomi Viewport `1366 x 768` (Skala 100%)

Untuk memastikan seluruh halaman daftar di modul Persuratan nyaman digunakan pada layar laptop standar `1366 x 768` tanpa harus melakukan scroll horizontal atau kehilangan baris data di bawah layar:
- **Padding Halaman**: Disesuaikan dari `p-5 md:p-7 space-y-5` menjadi `p-4 md:p-5 space-y-3`.
- **Header & Filter Toolbar**: Dikompakkan menggunakan tinggi kontrol `h-9` (36px) dan padding kartu `p-3.5`–`p-4`.
- **Tabel Agenda Surat Masuk (`/surat/masuk`)**:
  - Kolom `No Agenda` dan `Tanggal Agenda` digabung rapi dalam 2 baris vertikal sejajar.
  - Kolom `Nomor & Tanggal Surat`, `Asal Surat & Lampiran`, serta `Isi Ringkas` diberi batas lebar proporsional (`max-w-[200px]`–`max-w-[260px]`) dengan `line-clamp-2` sehingga seluruh 8 kolom (termasuk `Sifat`, `Diteruskan Ke`, dan `Aksi`) muat di dalam area konten `1366 x 768` dengan sidebar terbuka.
- **Tabel Daftar Surat Keluar (`/surat/keluar`)**:
  - Kolom `Nomor & Tanggal Surat` disejajarkan tanpa indentasi berlebih.
  - Kolom `Tujuan Surat` dan `Perihal` dibatasi secara proporsional (`max-w-[220px]` dan `max-w-[260px]`) agar ketujuh kolom tampil utuh dalam satu layar.

---

## 5. Verifikasi & Regresi

1. **Pemeriksaan Regresi Otomatis (`frontend/tests/persuratan-ui.cjs`)**:
   - Memastikan token `[data-module="persuratan"]` light & dark di `globals.css` sesuai dengan nilai hex di `docs/DESIGN_SYSTEM_COLORS.md`.
   - Memastikan selektor bersama `.psr-ui` dan `.psr-shell` aktif di `surat-tugas.css` dan `kepegawaian.css`.
   - Memastikan `surat/layout.tsx` menerapkan `data-module="persuratan"`, `MotionConfig reducedMotion="user"`, indikator spring `450/35`, dot aktif kanan, dan penutupan `Escape` + pengembalian fokus.
   - Memastikan seluruh dialog dan popover portaled di modul Persuratan membawa `data-module="persuratan"` serta focus return.
   - Memastikan tab menggunakan `useKepegawaianTabs` dan `KepegawaianTabContent` (`inert` saat keluar, `duration: 0` saat reduced motion).
   - Memastikan kertas cetak resmi (`LembarDisposisiSheet` dan `SuratDinasDocument`) mempertahankan permukaan putih (`bg-white`) dan teks hitam (`text-black`).
2. **Kompatibilitas Regresi Eksisting**:
   - `node frontend/tests/nota-dinas-template-check.cjs` — **LULUS**
   - `node frontend/tests/kepegawaian-ui.cjs` — **LULUS**
   - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit` — **LULUS (0 error)**
   - `npx --prefix frontend eslint ...` pada seluruh berkas yang diubah — **LULUS (0 error)**
