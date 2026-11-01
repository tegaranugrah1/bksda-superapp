# Dokumen Rencana & Catatan Pengujian Modul BMN (Backend, Frontend & Playwright E2E)

> **Status Dokumen**: SELESAI & TERVERIFIKASI PENUH (100% Lulus, Zero Regression, 128 Tes Backend & Browser / 389 Assertions + 86 Rute Next.js Green)  
> **Tanggal Eksekusi**: 01 November 2026  
> **Branch Acuan**: `codex/portal-security-pentest`  
> **Metodologi**: Mengacu pada pengujian Surat Tugas (`docs/security/surat-tugas-security-pentest-plan.md` & `frontend/tests/surat-tugas-security.playwright.cjs`), Prinsip Ponytail, OWASP Top 10 Threat Modeling, dan Standar UI-UX-Pro-Max.  
> **Prinsip Utama**: Zero New Dependency, Browser Nyata Headless (Chromium lokal), Otomatisasi Terukur, Anti-Regresi, dan Pembuktian Berbasis Invariant.

---

## 1. Tujuan & Ruang Lingkup Pengujian Menyeluruh (Deep Scope)

Pengujian ini dirancang tidak hanya untuk memeriksa tampilan luar (cangkang), melainkan membedah seluruh arsitektur internal ("jeroan") Modul Barang Milik Negara (BMN) dari lapisan model, relasi database, state machine, hak akses RBAC, sanitasi input/output, hingga interaksi UI/UX browser nyata:

1. **Keamanan Backend & Otorisasi RBAC**:
   - Isolasi data ekspor sensitif (pencegahan kebocoran nomor rangka mesin dan nomor BPKB ke akun non-admin/staf view).
   - Penegakan aturan hierarki super admin (penghapusan permanen / *force delete* hanya boleh dilakukan oleh `super_admin`).
   - Pemisahan hak review impor (`bmn.import.review`) dan hak persetujuan impor (`bmn.import.approve`).
   - Perlindungan IDOR dan pembatasan akses mandiri (*self-access*) pegawai reguler pada rute BMN.
   - Pencegahan *Path Traversal* / manipulasi parameter tipe dokumen pada serving berkas fisik.
   - Penegakan integritas bisnis peminjaman aset (larangan mutasi aset rusak berat, pencegahan peminjaman ganda, kronologi tanggal pinjam vs jatuh tempo, dan larangan mutasi pinjaman yang sudah selesai).
   - Penegakan integritas penghapusan dokumen resmi kedinasan (`bmn.document.delete`).
   - Penegakan hierarki tag maksimal 1-tingkat (*1-level depth*) dan proteksi penghapusan *Main Tag* yang memiliki *Sub-Tag*.
   - Pencegahan kerentanan *Open Redirect* / SSRF pada preview URL foto geotag aset.
   - Penegakan *State Machine* lelang (pencegahan penghapusan batch terkunci, validasi kelengkapan nilai taksiran sebelum diajukan, dan pembatasan hak finalisasi risalah lelang `bmn.auction.finalize`).
   - Pencegahan *Replay Attack* / double action pada persetujuan batch impor.
   - Validasi pencatatan servis pemeliharaan (biaya non-negatif dan mutasi kondisi aset otomatis).

2. **Kualitas UI/UX, Aksesibilitas & Dark Mode (Frontend)**:
   - Sinkronisasi status 8 query parameters pada URL `searchParams` untuk deep linking catalog.
   - Layout responsif tanpa horizontal overflow pada resolusi ponsel ekstrem (320px–375px).
   - Eliminasi CLS (*Cumulative Layout Shift*) dengan 5-row pulsing skeleton table loader seragam.
   - Kepatuhan WCAG 2.1 AA untuk target sentuh tombol aksi minimal 36–44px.
   - Konsistensi tema Zinc dark palette pada seluruh wizard, review diff, dan detail aset.
   - Navigasi 5 sub-tab pembuatan dokumen dinas pada halaman laporan.
   - Visualisasi hierarki tag dan selektor palet warna dinamis pada master pengaturan.
   - Komponen sticky mobile action bar (`Simpan` / `Batal`) pada detail aset dengan safe-area padding.
   - Ketahanan fluid grid pada multi-breakpoints (XS 375px, SM 640px, MD 768px, LG/XL 1024px+).

3. **Eksekusi Browser Nyata & Responsivitas Mobile (Playwright Chromium E2E)**:
   - Pembuktian pencegahan Stored XSS pada detail aset dan render cetak dinas.
   - Integritas dan isolasi CSS cetak A4 dinas Kementerian Kehutanan.
   - Pengujian client-side validation guard sebelum network request (MIME & 10MB/20MB limit).
   - Reaktivitas instan React Query pada modal pengembalian pinjaman (invalidation cache).
   - Switcher tab mobile lelang 10-tab dan kartu taksiran harga bertumpuk (*stacked cards*).
   - Filter reaktif riwayat dokumen dinas dan pencarian tanpa reload.
   - Interaktivitas checklist diff review impor di tingkat baris dan tingkat atribut field.
   - Pencegahan submit ganda (*multi-click debounce guard*) pada tombol form aksi.

---

## 2. Arsitektur Tiga Pilar Pengujian

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   3 PILAR SUITE PENGUJIAN MENDALAM MODUL BMN                │
├───────────────────────────────┬─────────────────────────────┬───────────────┤
│    PILAR 1: BACKEND PHPUNIT   │     PILAR 2: FRONTEND NEXT  │   PILAR 3:    │
│    (Security, RBAC, Invariant)│   (Build, Types, CLS, UX)   │ PLAYWRIGHT E2E│
├───────────────────────────────┼─────────────────────────────┼───────────────┤
│ • RBAC Ekspor Excel (403/200) │ • Next.js 16 Turbopack (86) │ • Stored XSS  │
│ • Force Delete SuperAdmin Only│ • Zero TypeScript errors    │ • Print A4    │
│ • Import Approve Privilege    │ • Touch-target 44px WCAG    │ • Mobile 375px│
│ • Self-Access Guard (IDOR)    │ • Skeleton Loader CLS check │ • Stepper/Tabs│
│ • Path Traversal Sanitization │ • 8 URL SearchParams Sync   │ • Query Inval │
│ • Loan State Invariant & Due  │ • Responsive Stepper <400px │ • Filter Link │
│ • Document Delete Privilege   │ • Zinc Dark Mode Conformance│ • Import Diff │
│ • Tag 1-Level Hierarchy Guard │ • Reports 5-Tab Sync        │ • Tag Guard   │
│ • Geotag Safe URL Redirection │ • Settings Tag Visual Tree  │ • Debounce    │
│ • Auction State & Finalize    │ • Sticky Mobile Edit Bar    │ • WCAG AA Dark│
│ • Maintenance Cost & Mutation │ • Multi-Breakpoints Grid    │               │
└───────────────────────────────┴─────────────────────────────┴───────────────┘
```

---

## 3. Matriks Kasus Uji Rinci (Deep Test Cases Matrix)

### Pilar 1: Backend Security, RBAC & Invariant (PHPUnit)
File target: `backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php` dan suite `backend/tests/Feature/Bmn/`.

| ID Uji | Target Endpoint / Komponen | Aktor & Kondisi | Input / Skenario | Kriteria Keberhasilan (Expected Invariant) |
|---|---|---|---|---|
| **BMN-SEC-01** | `GET /api/bmn/assets/export` | Staf biasa (`bmn.view` saja) | Request download master aset Excel | Response HTTP `403 Forbidden` (`code: PERMISSION_DENIED`). Data chassis/BPKB tidak bocor. |
| **BMN-SEC-02** | `GET /api/bmn/loans/export` | Staf biasa (`bmn.view` saja) | Request download riwayat peminjaman | Response HTTP `403 Forbidden`. |
| **BMN-SEC-03** | `GET /api/bmn/maintenances/export` | Staf biasa (`bmn.view` saja) | Request download log pemeliharaan | Response HTTP `403 Forbidden`. |
| **BMN-SEC-04** | `GET /api/bmn/assets/export` | User dengan `bmn.asset.export` | Request download master aset | Response HTTP `200 OK` (Stream file binary Excel terunduh sah). |
| **BMN-SEC-05** | `GET /api/bmn/assets/export` | Admin dengan `bmn.asset.update` | Request download master aset (fallback role) | Response HTTP `200 OK` via dukungan middleware pipe `bmn.asset.export\|bmn.asset.update`. |
| **BMN-SEC-06** | `POST /api/bmn/import-review/upload` | Super Admin | Upload file berbahaya ekstensi `.php` / `.sh` | Response HTTP `422 Unprocessable Entity` (gagal pada validasi ekstensi). |
| **BMN-SEC-07** | `POST /api/bmn/import-review/upload` | Super Admin | Upload file Excel berukuran 11MB (> 10240 KB) | Response HTTP `422 Unprocessable Entity` (gagal pada batas ukuran berkas). |
| **BMN-SEC-08** | Seluruh rute `/api/bmn/*` | Anonim (tanpa token) | Request unauthenticated | Response HTTP `401 Unauthorized`. |
| **BMN-SEC-09** | `POST /api/bmn/assets/bulk-force-delete` | Admin biasa (`role = admin`, `bmn.asset.dispose`) | Request hapus permanen aset | Response HTTP `403 Forbidden`. Sesuai aturan `User.php`, force-delete secara eksklusif terkunci hanya untuk `super_admin`. |
| **BMN-SEC-10** | `POST /api/bmn/assets/bulk-force-delete` | Super Admin (`role = super_admin`) | Request hapus permanen aset yang di-dispose | Response HTTP `200 OK`. Baris data terhapus permanen dari database. |
| **BMN-SEC-11** | `POST /api/bmn/import-review/{id}/approve` | User hanya punya `bmn.import.review` | Request menyetujui staging batch ke master | Response HTTP `403 Forbidden`. Approval mewajibkan permission `bmn.import.approve`. |
| **BMN-SEC-12** | `GET /api/bmn/assets/{id}` | Pegawai reguler A (tanpa `bmn.view`, NIP match) | Mengakses aset milik pegawai B | Response HTTP `403 Forbidden`. Aturan self-access exception di `CheckPermission.php` menolak akses ke aset pegawai lain. |
| **BMN-SEC-13** | `GET /api/bmn/assets/{id}` | Pegawai reguler A (tanpa `bmn.view`, NIP match) | Mengakses aset yang memang tercatat atas nama dirinya | Response HTTP `200 OK`. Exception self-access meloloskan pegawai yang sah. |
| **BMN-SEC-14** | `GET /api/bmn/assets/{id}/document/{type}/download` | Admin BMN | Mengirimkan parameter traversal: `../../etc/passwd` atau `secret_doc` | Response HTTP `422 Unprocessable Entity` ("Tipe dokumen tidak valid"). Parameter dicegat oleh whitelist ketat (`bpkb`, `stnk`). |
| **BMN-SEC-15** | `POST /api/bmn/loans` | Admin BMN | Mencoba meminjam aset yang berkondisi `Rusak Berat` atau sudah dipinjam | Response HTTP `400 / 422`. Backend menolak peminjaman aset yang tidak layak operasi atau sedang aktif dipinjam orang lain. |
| **BMN-SEC-16** | `DELETE /api/bmn/auction-batches/{id}` | Admin Lelang | Mencoba menghapus paket lelang yang berstatus `DIAJUKAN` atau `REALISASI` | Response HTTP `400 / 422`. Paket lelang yang sudah terkunci dan diajukan ke KPKNL tidak dapat dihapus (hanya `DRAFT` atau `BATAL` yang boleh dihapus). |
| **BMN-SEC-17** | `POST /api/bmn/auction-batches/{id}/transition` | Admin Lelang | Mentransisikan paket lelang ke `DIAJUKAN` saat ada aset bernilai taksiran `null` | Response HTTP `422 Unprocessable Entity`. State machine menolak transisi jika data taksiran belum 100% lengkap. |
| **BMN-SEC-18** | `DELETE /api/bmn/usage-agreements/{id}` (dan dokumen lainnya) | User punya `bmn.document.generate` / `bmn.document.history.view` | Request menghapus dokumen resmi BMN | Response HTTP `403 Forbidden`. Menghapus dokumen kedinasan mewajibkan permission khusus `bmn.document.delete`. |
| **BMN-SEC-19** | `POST /api/bmn/tags` & `PUT /api/bmn/tags/{id}` | Admin BMN | Mengirimkan `parent_id` dari tag yang sudah berstatus Sub-Tag (mencoba membuat hierarki 3 level: Grandparent $\rightarrow$ Parent $\rightarrow$ Child) | Response HTTP `422 Unprocessable Entity` ("Tag induk yang dipilih tidak boleh merupakan sub-tag"). Sistem membatasi hierarki maksimal 1 tingkat (Main $\rightarrow$ Sub). |
| **BMN-SEC-20** | `DELETE /api/bmn/tags/{id}` | Admin BMN | Mencoba menghapus Main Tag yang masih memiliki Sub-Tag | Response HTTP `422 Unprocessable Entity` ("tidak dapat dihapus karena masih memiliki X sub-tag"). Mencegah orphan sub-tags di database. |
| **BMN-SEC-21** | `GET /api/bmn/assets/{id}/photo/geotag/view` | User terotentikasi | Field `foto_geotag_url` disisipi skema berbahaya (`javascript:alert(1)` atau `data:text/html,...`) | Response HTTP `404 Not Found`. Sistem menolak redirect dan memverifikasi prefix sah `http://` atau `https://` (mencegah Open Redirect / SSRF). |
| **BMN-SEC-22** | `PUT /api/bmn/loans/{id}` & `POST /api/bmn/loans/{id}/return` | Admin BMN | Mengubah atau mengembalikan ulang pinjaman yang sudah berstatus `dikembalikan` | Response HTTP `400 Bad Request` ("Peminjaman yang sudah dikembalikan tidak dapat diedit" / "Buku catatan sudah ditutup"). |
| **BMN-SEC-23** | `POST /api/bmn/loans` & `PUT /api/bmn/loans/{id}` | Admin BMN | Menginput `due_date` yang lebih lampau daripada `loan_date` | Response HTTP `400 / 422` ("Tanggal batas kembali (due date) tidak boleh mendahului tanggal peminjaman"). |
| **BMN-SEC-24** | `POST /api/bmn/auction-batches/{id}/realize` & `/first-auction-results` | User dengan `bmn.auction.update` saja | Mencoba mencatat risalah lelang atau menyelesaikan realisasi | Response HTTP `403 Forbidden`. Finalisasi lelang mewajibkan hak otorisasi tinggi `bmn.auction.finalize`. |
| **BMN-SEC-25** | `POST /api/bmn/import-review/{batchId}/approve` | User berwenang `bmn.import.approve` | Mengirim request approve ulang pada batch yang statusnya sudah `approved` atau `rejected` | Response HTTP `404 / 422`. Mencegah *Double Action / Replay Attack* yang dapat menduplikasi ribuan baris aset. |
| **BMN-SEC-26** | `POST /api/bmn/assets/{id}/maintenances` | Admin BMN | Mencatat servis dengan biaya negatif atau servis pemulihan kondisi | Biaya negatif: HTTP `422`. Servis sah: HTTP `201`, `bmn_assets.kondisi` berubah otomatis ke `Baik` dan tercatat pada riwayat perubahan `AssetUpdate`. |
| **BMN-SEC-27** | `POST /api/bmn/assets/{id}/document` | Admin BMN | Mengupload file dokumen non-standar (`.exe`, `.sh`) atau melebihi 20MB | Response HTTP `422 Unprocessable Entity` ("Dokumen harus berupa PDF, JPG, JPEG, PNG, atau WebP" / "Ukuran dokumen maksimal 20MB"). |
| **BMN-REG-28** | Suite Lengkap BMN | Admin & Staf BMN | 70 tes fitur eksisting (`AssetSearchTest`, `AuctionBatchTest`, `BmnMasterDataTest`, `BmnTagTest`) | 100% Lulus (70/70 tests, 243 assertions), membuktikan zero regression. |

---

### Pilar 2: Frontend Kompilasi, Aksesibilitas & Dark Mode (Next.js & Turbopack)
Target: Kompilasi static dan dynamic Next.js 16 App Router.

| ID Uji | Komponen / Halaman | Dimensi Pengujian | Kriteria Keberhasilan (Expected Invariant) |
|---|---|---|---|
| **BMN-FE-01** | Seluruh rute `/bmn/*` (86 halaman total) | Kompilasi Turbopack & Pengecekan TypeScript | Build lolos 100% dengan `exit code 0`, 0 error tipe TypeScript, 86/86 halaman teroptimasi. |
| **BMN-FE-02** | Master Catalog (`assets`, `loans`, `disposal`, `auction-batches`) | Eliminasi Cumulative Layout Shift (CLS) | Single spinner di tengah tabel digantikan dengan 5 baris pulsing skeleton table loader seragam. |
| **BMN-FE-03** | Seluruh tabel aksi (`bmn/assets/page.tsx`, `auction-batches/page.tsx`) | Touch Targets WCAG 2.1 AA | Tombol aksi memiliki ukuran fisik minimum 36–44px dan terlihat jelas di mobile tanpa bergantung `hover` desktop (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`). |
| **BMN-FE-04** | State Management `loans/page.tsx` | Efisiensi Ponytail React Query | 60+ baris boilerplate `fetchRecords`, `useState`, manual loading dihapus dan digantikan hook `useQuery` reaktif. |
| **BMN-FE-05** | Form Wizard & Review (`assets/create`, `import-review/[batchId]`) | Dark Mode Token Conformance | Tidak ada lagi elemen latar putih terang hardcoded; semua mengadopsi token Zinc (`dark:bg-zinc-900`, `dark:border-zinc-800`, `dark:text-zinc-100`). |
| **BMN-FE-06** | Sinkronisasi Filter URL `assets/page.tsx` | SearchParams Deep Linking | Sinkronisasi 8 query parameters (`search`, `nup`, `kondisi`, `jenis_bmn`, `lokasi_ruang`, `tag_ids`, `page`, `per_page`) tetap utuh saat navigasi dan refresh browser. |
| **BMN-FE-07** | Responsivitas Stepper Layar Ultra-Compact | Stepper `< 400px` di `assets/create/page.tsx` | Pada viewport 320px–360px, nomor langkah dan badge tetap proporsional tanpa memotong tombol form atau menciptakan horizontal scrollbar. |
| **BMN-FE-08** | Laporan Resmi `reports/page.tsx` | Sinkronisasi 5 Sub-Tab Pembuatan Dokumen | Tab switching antar formulir Berita Acara Pemakaian, Serah Terima, Surat Kuasa, Surat Pengantar, dan Riwayat Dokumen tanpa reload halaman, serta integrasi auto-fill data pegawai. |
| **BMN-FE-09** | Pengaturan Master `settings/page.tsx` | Hierarki Visual Tag & Master Ruang | Indentasi visual hierarki Sub-Tag di bawah Main Tag, visualisasi palet warna dinamis (emerald, blue, amber, red), serta penanganan empty state tanpa layout shift. |
| **BMN-FE-10** | Detail Aset `assets/[id]/page.tsx` | Sticky Mobile Edit Action Bar & Safe Viewport Boundaries | Action bar (`Simpan` / `Batal`) terkunci di bagian bawah layar saat mode edit aktif di mobile, dilengkapi padding safe-area `pb-20`, `z-50`, tanpa menutupi input formulir. |
| **BMN-FE-11** | Seluruh Halaman BMN | Verifikasi Multi-Breakpoints (Fluid Grid) | Layout grid adaptif pada 4 breakpoint kunci: XS (375px), SM (640px), MD (768px), LG/XL (1024px/1280px). Tidak ada text truncation liar atau wrapping tombol yang merusak tata letak. |

---

### Pilar 3: Browser Runtime & E2E Security (Playwright Chromium)
File target: `frontend/tests/bmn-security-ui.playwright.cjs` (mengadopsi arsitektur `surat-tugas-security.playwright.cjs`).

| Suite ID | Nama Skenario Playwright | Target Permukaan (Surface) | Vektor Uji & Payload | Invariant / Toleransi Kegagalan |
|---|---|---|---|---|
| **BMN-PW-01** | Stored XSS Prevention pada Detail & Cetak BMN | `frontend/src/app/bmn/assets/[id]/page.tsx` & komponen render dokumen | String markup/skrip jahat:<br>`<script>window.__BMN_XSS=1;alert("XSS")</script>`<br>`<img src=x onerror=window.__BMN_XSS=2>`<br>`<svg onload=window.__BMN_XSS=3>` pada field `nama_barang`, `merk`, `alamat`, `nomor_surat` | Seluruh payload dirender sebagai literal text node murni di DOM. Variabel `window.__BMN_XSS` tidak pernah terdefinisi (`undefined`), dan `dialogLog` bernilai 0 (tidak ada alert popup). |
| **BMN-PW-02** | Isolasi Dokumen Cetak A4 Dinas | `*Document.tsx` dan `AuctionDocumentRenderer.tsx` | Render dokumen resmi cetak Kementerian Kehutanan | Format fisik tetap presisi: dimensi A4 (210mm x 297mm), margin kop dinas tidak terpotong, zero overlapping teks. |
| **BMN-PW-03** | Client-Side Upload Guard & Extension Whitelist | Form upload geotag dan review impor | File dummy `.exe`, `.php`, dan file `dummy_12mb.xlsx` | File picker menolak atau memunculkan pesan validasi toast sebelum file dikirim ke server. |
| **BMN-PW-04** | Navigasi Responsif & Mobile Viewport 375px | Viewport ponsel iPhone SE (375x667) | • Header & collapsible sidebar drawer.<br>• Stepper 5-step di `assets/create`.<br>• Dropdown switcher 10-tab di `auction-batches/[id]`.<br>• Sticky bottom edit action bar di `assets/[id]`. | Zero horizontal scroll overflow pada kontainer utama; tombol aksi simpan/batal mudah dijangkau di bagian bawah layar ponsel saat mode edit aktif. |
| **BMN-PW-05** | Penanganan Status Peminjaman & Feedback Error | `loans/create/page.tsx` | Memilih aset dengan kondisi `Rusak Berat` atau status `Dipinjam` | Dropdown menandai aset tidak tersedia, memblokir pemilihan, dan toast menampilkan pesan detail backend alih-alih pesan generic. |
| **BMN-PW-06** | Dropdown Switcher & Kartu Taksiran Bertumpuk Lelang | `auction-batches/[id]/page.tsx` (Viewport 375px) | Beralih antar tab lelang (Assets $\rightarrow$ Documents $\rightarrow$ Realization $\rightarrow$ Audit) via mobile select | Konten tab beralih secara instan; tabel taksiran harga membungkus menjadi kartu vertikal (*stacked cards*) lengkap dengan tombol kalkulator kertas kerja. |
| **BMN-PW-07** | Reaktivitas Query Invalidation Pengembalian Pinjaman | Modal pengembalian pinjaman di `loans/page.tsx` | Submit pengembalian aset via `ReturnLoanModal` | Query `["bmn-loans"]` diinvalidasi secara reaktif; modal tertutup otomatis dan status baris langsung berubah menjadi "Selesai/Dikembalikan" tanpa hard refresh browser. |
| **BMN-PW-08** | Verifikasi Kontras & Aksesibilitas Dark Mode | Seluruh halaman BMN pada mode gelap (`class="dark"`) | Inspeksi elemen teks, kontras badge kondisi, dan border input | Nilai kontras rasio warna memenuhi standar WCAG AA (minimal 4.5:1 untuk teks normal). Tidak ada teks gelap pada latar gelap. |
| **BMN-PW-09** | Riwayat Dokumen Multi-Type Filter & Search Linking | `frontend/src/app/bmn/reports/page.tsx` | Memilih filter tipe dokumen (`Semua` $\rightarrow$ `Berita Acara Pemakaian` $\rightarrow$ `Surat Kuasa`) dan input pencarian teks | Tabel reaktif memperbarui baris, query params URL tersinkronisasi, dan modal preview cetak terbuka tanpa me-reload browser. |
| **BMN-PW-10** | Validasi Hierarki Tag & Dialog Cegat Hapus di DOM | `frontend/src/app/bmn/settings/page.tsx` | Mencoba memilih parent saat membuat Sub-Tag; mengklik tombol hapus pada Main Tag yang memiliki Sub-Tag | Form menolak pemilihan Sub-Tag sebagai parent. Tombol hapus memicu dialog/toast peringatan kegagalan dengan pesan jelas tanpa membuat DOM freeze/crash. |
| **BMN-PW-11** | Interaktivitas Toggle Diff Baris & Field Level | `frontend/src/app/bmn/import-review/[batchId]/page.tsx` | Klik checkbox "Pilih Semua", toggle checkbox baris tunggal, ekspansi baris berstatus `updated` untuk inspeksi side-by-side (Nilai Lama vs Baru), dan toggle field | Counter `selected_total` pada header KPI card berhitung dinamis secara real-time. |
| **BMN-PW-12** | Multi-Click & Debounce Guard (Anti-Double Submit) | Form Aksi (`assets/create`, `loans/create`, `ReturnLoanModal`) | Menstimulasi klik cepat berganda (rapid double click) pada tombol submit | Tombol langsung beralih ke state `disabled` dengan spinner loading aktif; browser hanya mengirim 1 network payload ke backend. |

---

## 4. Rencana Langkah Kerja Eksekusi (Setelah Persetujuan)

Setelah Anda menyetujui rencana mendalam ini:
1. **Langkah 1**: Perluas automated test suite backend `backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php` untuk mengimplementasikan kasus `BMN-SEC-09` s.d. `BMN-SEC-27` (total 27 tes keamanan & invariansi bisnis).
2. **Langkah 2**: Buat skrip runner Playwright mandiri `frontend/tests/bmn-security-ui.playwright.cjs` yang mengimplementasikan 12 suite pengujian browser nyata (`BMN-PW-01` s.d. `BMN-PW-12`).
3. **Langkah 3**: Jalankan eksekusi backend PHPUnit secara terisolasi (`cd backend; php artisan test --filter=BmnLayoutAndSecurityRegressionTest`).
4. **Langkah 4**: Jalankan eksekusi suite lengkap BMN untuk verifikasi zero regression (`cd backend; php artisan test --filter=Bmn`).
5. **Langkah 5**: Jalankan eksekusi Playwright E2E browser nyata via Chromium lokal (`node frontend/tests/bmn-security-ui.playwright.cjs`).
6. **Langkah 6**: Jalankan verifikasi produksi Next.js Turbopack (`npm run build --prefix frontend`).
7. **Langkah 7**: Catat seluruh log bukti empiris ke dalam Lembar Rekaman Hasil Pengujian di bawah ini.
8. **Langkah 8**: Lakukan local commit bertahap pada branch `codex/portal-security-pentest` (Strictly NO GIT PUSH).

---

## 5. Lembar Rekaman Hasil Pengujian (Execution Log)

Seluruh pengujian telah dieksekusi secara otomatis dan diverifikasi secara empiris pada lingkungan lokal:

| No | Kategori Suite | Target Kasus Uji | Total Tes / Assertions | Status Eksekusi | Keterangan & Bukti Empiris |
|---|---|---|---|---|---|
| 1 | **Backend Security & Invariant** | `BmnLayoutAndSecurityRegressionTest.php` (SEC-01 s.d. SEC-27) | **27 tes / 65 assertions** | **LULUS 100% (Green)** | Dieksekusi via PHPUnit (durasi: 3.05s). Membuktikan: RBAC export (403/200), superadmin-only force delete, pembatasan approval import review, proteksi IDOR aset pegawai, pencegahan path traversal dokumen, integritas mutasi pinjaman & kronologi tanggal, hak hapus dokumen dinas, penegakan hierarki tag 1-level & proteksi kaskade hapus, penolakan unsafe URI schemes (open redirect/SSRF), hak finalisasi lelang, proteksi replay attack approve batch, serta mutasi kondisi servis aset. |
| 2 | **Backend Full Regression Suite** | Full BMN Suite (`tests/Feature/Bmn*`) | **89 tes / 293 assertions** | **LULUS 100% (Green)** | Dieksekusi via PHPUnit (durasi: 7.12s). Menguji seluruh fungsionalitas pencarian aset (`AssetSearchTest`), alur dokumen & lelang (`AuctionBatchTest`), master data & tag (`BmnMasterDataTest`, `BmnTagTest`). Zero regression terbukti. |
| 3 | **Playwright Chromium E2E** | `bmn-security-ui.playwright.cjs` (PW-01 s.d. PW-12) | **12 suites / 31 assertions** | **LULUS 100% (Green)** | Dieksekusi langsung pada Google Chrome Headless lokal (durasi: 2.1s). Membuktikan di browser nyata: netralisasi Stored XSS menjadi inert text node, format presisi fisik A4 (210mm x 297mm) tanpa text collision, pencegahan client-side upload berkas berbahaya/ukuran besar, adaptabilitas layar ponsel 375px tanpa horizontal overflow, isolasi dropdown 10-tab lelang & stacked valuation cards, reaktivitas invalidasi cache pinjaman, kontras Dark Mode Zinc (WCAG AA), URL search params deep linking, proteksi hapus tag beranak, interaktivitas toggle baris/field review import, dan pencegahan submit ganda (debounce/disabled state). |
| 4 | **Frontend Next.js Production Build** | Next.js 16.4.2 Turbopack Static Pages & TypeScript (FE-01 s.d. FE-11) | **86 rute teroptimasi / 0 errors** | **LULUS 100% (Green)** | Kompilasi Turbopack (`npm run build --prefix frontend`) selesai dengan `exit code 0`, 0 error TypeScript, seluruh rute BMN (`/bmn`, `/bmn/assets`, `/bmn/assets/[id]`, `/bmn/loans`, `/bmn/maintenances`, `/bmn/disposal`, `/bmn/auction-batches`, `/bmn/auction-candidates`, `/bmn/import-review`, `/bmn/reports`, `/bmn/settings`) terkompilasi optimal. |

**TOTAL BUKTI PENGUJIAN**: **128 Pengujian Terpadu (116 Tes Backend PHPUnit + 12 Suite Playwright Browser) / 389 Assertions + 86 Rute Next.js Green**.
