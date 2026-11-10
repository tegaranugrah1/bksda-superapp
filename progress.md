# Progress Development - BKSDA SuperApp

**Status terbaru (10 November 2026):** Komit lokal berhasil untuk modernisasi Dashboard BMN (desain bento grid 3-kolom, header card ala Kepegawaian, audit data riil database, perbaikan visibilitas tombol aksi peminjaman aset, dan peredaman warna kartu STNK anti-fatigue). Penyusunan dokumen standar acuan warna desain sistem antar-modul (`docs/DESIGN_SYSTEM_COLORS.md`) dengan kalibrasi rasio kontras WCAG 2.1 dan aturan 60-30-10 (Bagian 64, 65, 66). TypeScript `0 errors`, security check backend `PASS`.

## Status Update: 2 November 2026

### 1. Inisiatif Hermes Agent (WhatsApp Assistant 24/7 & Coding Sandbox 16 GB) - SELESAI PENUH (33/33 Tasks 100%)
- **Fase 1: Provisioning VM 108 Proxmox (`192.168.100.205`) Selesai**:
  - VM 108 (`hermes-agent-dev`) di-provisioning otomatis pada host Proxmox VE fisik kantor (`192.168.100.11`) menggunakan Cloud-Init Ubuntu Server 24.04 LTS: 16 GB RAM, 4 vCPU, 100 GB NVMe disk (`local-lvm`), static IP `192.168.100.205/24`, Gateway `192.168.100.1`, DNS `192.168.100.1` & `8.8.8.8`.
  - Akses SSH tanpa password terkonfigurasi dengan RSA key injection (`~/.ssh/authorized_keys`), UFW firewall aktif (port 22 & 8080).
  - Toolchain pengembang terpasang lengkap: Docker Engine 29.9.2, Docker Compose v5.6.1, Node.js v20.20.2, npm 10.8.2, PHP 8.4.27 CLI (ekstensi: curl, mbstring, xml, zip, pgsql, sqlite3, bcmath, gd), Composer v2.11.1, dan GitHub CLI (`gh`).
  - Direktori persistensi host: `/opt/hermes/data/{evolution_instances,evolution_store,redis,logs,postgres}` (chmod 775).
- **Fase 2: Backend Modul Agent BKSDA SuperApp (VM 106) Selesai**:
  - Migrasi `2026_11_02_210000_add_telepon_to_kpg_employees_table.php` sukses dijalankan, 97 nomor telepon pegawai berhasil di-backfill dari data cuti historis.
  - `AgentServiceProvider` didaftarkan di `backend/bootstrap/providers.php` dengan routing prefix `/api/agent/v1`.
  - Middleware `RestrictAgentClientIp`: membatasi akses khusus IP `192.168.100.205` dan `127.0.0.1` serta verifikasi header `X-Agent-Internal-Key`.
  - `PhoneSanitizerService`: normalisasi E.164, stripping karakter non-digit, pencocokan fleksibel PostgreSQL regex.
  - `AgentAuthController`: endpoint `/auth/verify-phone` dan `/auth/link-phone`.
  - `AgentLeaveController`: endpoint saldo cuti `/employees/{nip}/leaves` (aturan PerBKN 24/2017) dan pengajuan cuti mandiri `/leaves/request` dengan penguncian pesimistik `Employee::lockForLeaveUpdate()` dan perlindungan idempoten `idempotency_key`.
  - `AgentSuratTugasController` & `DispatchSuratTugasWebhook`: otomatis mengirimkan payload ke WhatsApp saat Surat Tugas diterbitkan.
  - Pengujian Backend `AgentModuleTest.php`: 9 tests, 24 assertions, **100% PASS**. Kepegawaian security suite (4 tests, 20 assertions): **100% PASS**.
- **Fase 3: Deployment WhatsApp Gateway (Evolution API v2) Selesai**:
  - Konfigurasi `docker-compose.yml` di `/opt/hermes/gateway/` menggunakan stack `evoapicloud/evolution-api:v2.3.7`, `postgres:16-alpine`, dan `redis:7.2-alpine`.
  - Instance WhatsApp `bksda-assistant` diinisialisasi via Baileys engine, QR code live berhasil digenerate dan disimpan ke artefak visual (`whatsapp_qr.png`).
  - Zero-Drop Reboot test teruji: sesi dan volume host `/opt/hermes/data/` bertahan utuh tanpa reset QR saat container di-restart.
- **Fase 4: Core Assistant Service & Integrasi Gemini AI Pro Selesai**:
  - Service Express/TypeScript di `/opt/hermes/assistant/` terkompilasi bersih tanpa error TypeScript.
  - Berjalan sebagai service background Linux `hermes-assistant.service` (systemd auto-restart).
  - System prompt NLU kontekstual BKSDA Kaltim (istilah Balai, SKW, Resor, Polhut, Cuti, PerBKN, DIPA).
  - Redis Debounce Buffer 2.0 detik untuk menggabungkan pesan terpisah yang dikirim cepat oleh pegawai.
  - Redis Mutex Lock (`lock:assistant:{phone}`) untuk mitigasi race-condition concurrency.
  - State Machine percakapan: alur konfirmasi dua tahap (`AWAITING_LEAVE_CONFIRMATION` -> `YA` / `BATAL`).
  - Fallback non-teks: panduan ramah saat pegawai mengirim Voice Note audio atau foto berkas.
  - Circuit Breaker dengan 2x retry exponential backoff dan fallback otomatis ke rule-based regex saat kuota LLM habis atau API key offline.
- **Fase 5: Coding Sandbox Pipeline & Gemini CLI Selesai**:
  - Workspace `/opt/hermes/coding-sandbox/workspace/bksda-superapp` di-clone dari repository resmi.
  - Dependensi Composer (PHP 8.4) dan npm (Next.js) terpasang di VM 108.
  - Production build Next.js 16 (Turbopack) sukses menghasilkan 86 static pages tanpa error.
  - Gemini CLI executable `/usr/local/bin/gemini` terpasang di VM 108 dengan mode dual-engine.
  - Skrip pipeline `/opt/hermes/coding-sandbox/run-agent-task.sh` menjamin runnable checks wajib (PHPUnit test + Next.js build 100% hijau) sebelum membuka GitHub Pull Request.
  - Isolasi air-gap terverifikasi: service asisten WA tidak memiliki child process/shell exec, sehingga aman dari bahaya WhatsApp prompt injection.
- **Fase 6: Pengujian Integrasi End-to-End & Security Pentest Selesai (100% Lulus)**:
  - Security Pentest: penyaringan nomor HP tidak dikenal berhasil mengarahkan ke alur penautan NIP mandiri; pembatalan pengajuan cuti ("batal") tidak memutasi database.
  - Edge-cases: Voice note, image, dan burst double message teruji lulus.
  - Stress Test RAM 16 GB: Penggunaan memori saat kompilasi Next.js hanya ~931 MB dari total 16 GB (bebas >14 GB, CPU Load <1.7).
  - Webhook Surat Tugas teruji memproses payload dan menyiapkan pengiriman notifikasi berkala dengan delay 1.5 detik per staf (anti-ban).

### 2. Audit Keamanan Menyeluruh Modul Kepegawaian & Push ke Production Server
- **Audit 6 Bidang Permukaan Serangan (Attack Surface)**:
  - Formula Injection: Ditutup pada generator Excel uang makan (MealAllowanceExcelExport.php) via helper safeCell() dan casting numerik ketat rate PPh21.
  - Zip Bomb & Memory Exhaustion: Dibatasi maksimal 200 berkas dan 5 MB stream buffer per file pada SikadirParserService.php.
  - Celah Lintas Tahun Kalender Cuti: Validasi PerBKN 24/2017 dipasang pada storeRecord() dan updateRecord() di EmployeeLeaveController.php.
  - Rate Limiting: Middleware 	hrottle:60,1 dipasang pada endpoint komputasi berat /uang-makan/reconcile dan /uang-makan/export-excel.
  - Password Policy: Validasi panjang minimum 8 karakter dipasang pada esetPassword() di EmployeeController.php.
  - Data Masking: ID user internal created_by dan updated_by disembunyikan untuk request publik di StExpenseTemplateResource.php.
- **Verifikasi & Deployment**:
  - Suite pengujian baru: ackend/tests/Feature/KepegawaianSecurityAuditTest.php (4 tests, 20 assertions, 100% lulus).
  - Total pengujian Kepegawaian: 24 tests, 104 assertions lulus.
  - Script otorisasi berkas scan cuti: LeaveScanSecurityTest.php lulus.
  - Frontend production build Next.js: 87 halaman terkompilasi bersih dalam 4.3 detik.
  - Commit `fed93dbb` berhasil di-merge (Fast-Forward) dan di-push ke remote branch `production-server`.

### 3. Fitur Hitung & Rekonsiliasi Uang Makan Pegawai (SIKADIR vs Surat Tugas)
- **Engine Rekonsiliasi 10/10 Presisi Tinggi**:
  - SikadirParserService.php: Ekstraksi berkas HTML/XLS SIKADIR via DOMXPath (2.36 ms latency), Golden Checksum validation, dan ZIP sanitizer.
  - AdaptiveTariffResolver.php: Resolusi tarif SBM (PNS & PPPK Golongan I-IV/I-XVII) dan potongan PPh 21 dengan fallback kelas jabatan.
  - HolidayCalendarHelper.php: Deteksi otomatis hari libur nasional & cuti bersama SKB 3 Menteri 2025-2027.
  - AttendanceReconcilerService.php: Komparasi tanggal multi-hari terhadap Surat Tugas resmi; auto-override Hadir (H) menjadi PD* dengan logging audit.
  - MealAllowanceExcelExport.php: Generator berkas resmi Excel 2-Sheet (Sheet Matriks Presensi + Sheet Daftar Nominatif) dengan tanda tangan tunggal Kasubbag TU.
- **Frontend Antarmuka UI/UX Pro Max Full Screen (/kepegawaian/uang-makan)**:
  - Interactive Matrix Grid dengan CSS sticky columns (No, NIP/Nama, Golongan) dan horizontal scroll 31 hari.
  - Inline Popover Editing per sel tanggal (H, PD, CT, S, I, TK, -).
  - One-click Header Toggle untuk menetapkan seluruh pegawai pada tanggal tertentu sebagai Hari Libur Nasional (-).
  - Reaktivitas kalkulasi real-time (Hadir, PD, Bruto, Pajak, Netto).
  - Filter bar lengkap, preview Sheet 2 Nominatif, dan tab Riwayat Batch tersimpan.
- **Verifikasi Pengujian & Keamanan**:
  - **Backend PHPUnit**: 7 methods, 37 assertions, 100% lulus (MealAllowanceSecurityAndReconciliationTest.php).
  - **Frontend Playwright E2E**: 8 test suites, 100% lulus (kepegawaian-uang-makan.playwright.cjs).
  - **Next.js Production Build**: 100% compile tanpa error TypeScript / ESLint.

---

## Status Update: 31 Oktober 2026

### 1. Remediasi & Penuntasan Pentest Modul Surat Tugas (ST-01 s.d. ST-12)
- **ST-08 (PostgreSQL Concurrency Lock Order & Race Condition Approval)**:
  - Mengimplementasikan `AssignmentLetterController::lockEmployeesForScheduling()` dengan penguncian baris `Employee` secara deterministik (`orderBy('id', 'asc')->lockForUpdate()`) di dalam transaksi `store()`, `update()`, dan `approve()`.
  - Terverifikasi pada PostgreSQL 15 nyata via `SuratTugasPostgresConcurrencyTest.php`: berhasil mencegah deadlock inverse-order dan menserialisasi bentrok jadwal approval (invariant: tepat 1 dokumen approved, 0 double booking).
- **ST-12 (Browser Preview & Print Sink Protection)**:
  - Komponen `#surat-preview-doc` dan `printSuratTugas()` (`print-st.ts`) diaudit terhadap vektor serangan Stored XSS (`<script>`, `<img onerror>`, `<svg onload>`, `<iframe javascript:>`, markdown italic injection).
  - Dibuktikan secara otomatis lewat Google Chrome Headless nyata (`SuratTugasBrowserPreviewPrintSecurityTest.php`) dan Playwright E2E (`frontend/tests/surat-tugas-security.playwright.cjs`): seluruh payload bermarker dirender sebagai literal text nodes ter-escape tanpa mengeksekusi script sink (`__ST12_EXECUTED_SINKS = []`, 0 dialog, 0 runtime error).
- **R-ST-01 (Namespace Storage Upload & Transaksi Bersih)**:
  - Seluruh file upload diarahkan ke direktori berbasis ID surat (`assignment_letters/{id}/`) dengan helper tunggal `replaceUploadedFile()`.
  - Callback native `DB::afterCommit` dan `DB::afterRollBack` menjamin file lama tidak terhapus jika transaksi gagal, staged upload terhapus saat rollback, dan job arsip Drive hanya dikirim pasca-commit.
- **Proteksi Berkas Legacy**:
  - `deleteUnreferencedFile()` memeriksa seluruh referensi aktif maupun soft-deleted sebelum menghapus berkas fisik di disk local.
- **R-ST-02 & R-ST-03 (Redaksi Privasi Konflik Jadwal & Membership Modul)**:
  - Policy detail konsisten diterapkan: non-admin tidak memperoleh alasan medis/pribadi pegawai lain saat jadwal bentrok.
  - Retained permission tanpa keanggotaan modul aktif ditolak dengan HTTP 403.
- **Akun Nonaktif & Sesi Expired pada Rute Publik**:
  - Middleware `EnsureAccountSecure` membaca fallback Sanctum pada rute publik; bearer nonaktif ditolak 403 dan token segera dicabut.
- **Idempotensi Arsip Drive & Migrasi Sistem**:
  - Migrasi `2026_10_31_180000_allow_system_owned_drive_archives.php` mengizinkan owner null untuk arsip sistem resmi. Lookup memakai `withTrashed()` mencegah duplikasi arsip.

### 2. Pengujian Frontend Security E2E (Playwright)
- Dibuat suite pengujian mandiri [`frontend/tests/surat-tugas-security.playwright.cjs`](frontend/tests/surat-tugas-security.playwright.cjs) yang memanfaatkan Google Chrome lokal (tanpa download browser baru, sesuai prinsip ponytail).
- Menjalankan 5 suite keamanan terpadu:
  1. ST-12: Stored XSS Preview Sanitization (#surat-preview-doc).
  2. ST-12: Print Sink & Document Title Sanitization (`print-st.ts`).
  3. ST-02: UI Conflict Privacy Masking (Non-admin hanya melihat "Cuti Aktif" tanpa detail medis).
  4. ST-01: Client-Side Upload Guard (>5MB ditolak, whitelist ekstensi PDF/JPG/PNG).
  5. ST-11: 403 Sesi Nonaktif Interceptor & Purge Token LocalStorage / Redirect ke `/login`.
- Hasil: **5/5 suite LULUS, 23 assertions terverifikasi green**.

### 3. Hardening Alur Publik Guest & Publikasi Surat Tugas (Commit `b1391706`)
- **Validasi Nomor Surat Resmi saat Publikasi (`validatePublication`)**:
  - Penambahan validasi ketat bahwa dokumen yang ditransisikan ke status resmi (`approved`, `completed`, `published`, `diterbitkan`) wajib memiliki `nomor_surat` terisi tanpa karakter placeholder template (`{...}`, `...`, `…`).
  - Mencegah penurunan status surat yang sudah diterbitkan kembali ke `draft` atau `pending`.
- **Paritas Template Snapshot**:
  - Menyelaraskan passing `template_snapshot` antara Admin Print, Portal Pegawai (`portal/page.tsx`), dan Preview Surat (`SuratTugasLetterPreview.tsx`).
- **Responsivitas Mobile 375px & Aksesibilitas WCAG**:
  - Perbaikan overflow horizontal 401px pada layar 375px di `frontend/src/app/surat-tugas/layout.tsx`.
  - Penyesuaian ukuran touch-target minimal 44px (`min-h-11`), asosiasi label `htmlFor`, dan keyboard navigation (`ArrowDown`/`Escape`) pada komponen pemilihan pegawai & detail surat.
- **Suite Pengujian Publikasi Mandiri**:
  - Ditambahkan `SuratTugasPublicationRegressionTest.php` dengan 19 metode pengujian mencakup 1066 assertions validasi transisi status, template fallback, dan idempotensi revisi.
- **Isolasi Driver Testing PHPUnit (Commit `f7e7c772`)**:
  - Menetapkan `<env name="FILESYSTEM_DISK" value="local"/>` pada `backend/phpunit.xml` untuk mencegah test suite mewarisi konfigurasi S3 pada `.env`, menjamin pengujian fake storage berjalan deterministik dan terisolasi.

### 4. Penuntasan Matriks Pengujian Lanjutan (EXT-01 s.d. EXT-16)
- **EXT-03 (DIPA/FOLU/Other)**: Teruji pada `test_ext03` untuk persistensi snapshot & resolusi anggaran DIPA, FOLU, dan swadana non-DIPA.
- **EXT-04 (Edit Builder Full Parity)**: Teruji pada `test_ext04` untuk 24 field dokumen dan pivot peserta yang disinkronkan dan diverifikasi melalui GET reload.
- **EXT-07 (Pivot Dates & PLH)**: Teruji pada `test_ext07` untuk perbedaan rentang tanggal per pegawai, PLH, dan peran tenaga lapangan.
- **EXT-10 (Live Inbox WebSocket)**: Teruji pada `test_ext10` & `BroadcastChannelAuthTest` untuk penyiaran event `AdminInboxChanged` & `PortalNotificationCreated`.
- **EXT-11 (Pagination Riwayat Pegawai)**: Teruji pada `test_ext11` untuk 25 dokumen surat tugas dengan paginasi 3 halaman dan isolasi akses antar-pegawai.
- **EXT-15 (Double-Submit & Atomic Transaction)**: Teruji pada `test_ext15` untuk pencegahan double-submit via deteksi bentrok jadwal dan rollback atomik database.
- **EXT-16 (Kategori NIP PNS/PPPK/MMP)**: Teruji pada `test_ext16` untuk kesesuaian seleksi & keterkaitan NIP PNS 18 digit, PPPK 18 digit, dan MMP lapangan.

### 5. Rekapitulasi Verifikasi Terpadu (100% Lulus)
- **Total Pengujian**: 124 tes backend / 1607 assertions + 13 suite Playwright E2E & Cache Security LULUS tanpa regresi:
  - `SuratTugasPublicationRegressionTest.php`: 26 lulus / 1166 assertions
  - `SuratTugasSecurityPentestTest.php`: 20 lulus / 125 assertions
  - `SuratTugasFullSchemaSecurityTest.php`: 10 lulus / 105 assertions
  - `BroadcastChannelAuthTest.php`: 3 lulus / 12 assertions
  - `SuratTugasPostgresConcurrencyTest.php`: 2 lulus / 10 assertions (PostgreSQL 15)
  - `SuratTugasBrowserPreviewPrintSecurityTest.php`: 1 lulus / 4 assertions (Chrome Headless)
  - `surat-tugas-security.playwright.cjs`: 5 lulus / 23 assertions (Playwright Chromium)
  - Regresi Terkait (`DriveHierarchicalResorRBACTest`, `PortalPersonalSecurityTest`, `SuratTugasMobileListApiTest`, `UserPermissionFallbackTest`): 60 lulus / 185 assertions

---

## Status Update: 27 Oktober 2026

### 1. Modul BMN: Perbaikan Prefill Form & State Reset Laporan (Edit & Duplikasi Dokumen)
- **Masalah**: Pada halaman `/bmn/reports`, saat mengklik tombol "Edit" atau "Duplikasi" dari Riwayat Dokumen (misalnya Berita Acara `BA.408/K.18/TU/KAP.03.02/B/10/2026`), banner mode edit aktif tetapi isian formulir (nomor dokumen, pihak kedua, dan daftar aset/barang) tidak terbawa atau tetap kosong.
- **Penyebab**: Komponen tab laporan sebelumnya menginisialisasi state dengan string kosong dan mengandalkan `useEffect` asynchronous yang rentan terlewati atau mengalami *race condition* jika referensi `hasLoadedEditRef` bentrok antar-render tanpa pelepasan instance komponen.
- **Solusi & Implementasi**:
  - Menambahkan *dynamic key* pada wrapper tab di `frontend/src/app/bmn/reports/page.tsx`:
    `key={`${editingDocument?.isDuplicate ? "dup" : "edit"}_${editingDocument?.id || "new"}`}`
    sehingga setiap perpindahan dokumen atau pembatalan edit meremount komponen tab secara bersih (*clean state lifecycle*).
  - Mengubah inisialisasi form di seluruh 4 tab laporan agar membaca `editingDocument.item` secara sinkron langsung pada initial render `useState`:
    - `HandoverAgreementTab.tsx` (Berita Acara Serah Terima)
    - `UsageAgreementTab.tsx` (Perjanjian Pinjam Pakai)
    - `PowerOfAttorneyTab.tsx` (Surat Kuasa)
    - `CoveringLetterTab.tsx` (Surat Pengantar)
  - Menambahkan fallback hook `@tanstack/react-query` (`useQuery`) untuk mengambil relasi item dokumen lengkap dari API backend (`/api/bmn/.../${id}`) jika payload dari ringkasan riwayat tidak lengkap.
- **Validasi**: Typecheck TypeScript `npx tsc --noEmit` lolos 100% tanpa error. Commit: `c44c38ac`.

---

### 2. Sinkronisasi Data Aset & Media Storage BMN (Live EC2 ➔ VM 100 Proxmox)
- **Sinkronisasi Database**:
  - Melakukan dump 17 tabel BMN (`bmn_assets`, `bmn_asset_updates`, `bmn_tags`, `bmn_asset_tag`, `bmn_usage_agreements`, dll.) dari AWS EC2 Produksi (`bksdakaltim.net`) dengan mode `session_replication_role = 'replica'`.
  - Melakukan restore bersih dengan `CASCADE` ke PostgreSQL container `bksda-db` di VM 100 (`192.168.100.151`).
  - Total aset BMN kondisi *Rusak Berat* di VM 100 tersinkronisasi presisi sebanyak **37 aset**.
- **Sinkronisasi File Media & Izin Berkas**:
  - Mengompres dan mentransfer volume RustFS foto BMN (`/data/bksda/bmn` dan `/data/bksda/bmn-photos`, ~54 MB, 68 foto).
  - Mengekstrak ke storage VM 100 dan memperbaiki izin berkas dengan `chown -R rustfs:rustfs /data/bksda`.
  - Memastikan foto aset dapat diakses dan diunggah secara normal via HTTP 200 di `192.168.100.151:8080`.

---

### 3. Penyesuaian & Standardisasi Roster Pegawai Aktual (147 Pegawai)
- **Verifikasi Roster Aktual Definitif**:
  - Berdasarkan daftar aktual pegawai BKSDA Kalimantan Timur per 27 Oktober 2026, total pegawai resmi berjumlah **147 orang** (terdiri atas **114 ASN PNS/PPPK** dan **33 Tenaga Lapangan/MMP**).
  - Seluruh 147 pegawai terverifikasi 100% cocok dan telah tersimpan di database.
- **Resolusi Selisih & Migrasi Database**:
  - Dibuat migrasi database `2026_10_27_083000_archive_inactive_employees_to_match_actual_roster.php` yang melakukan soft-delete (`deleted_at = now()`) serta menonaktifkan (`is_active = false`) data pegawai di luar daftar aktual:
    - `Djunaib Ahmad` (NIP: 198007132000031002) - data pegawai lama dengan riwayat cuti historis tetap terjaga.
    - `Muhamad Rafli Reskiadi` (MMP-032) - MMP lama di Resor IKN.
    - Serta proteksi untuk data pegawai lama di server live/staging (`Didimus`, `Dwi Suriyanto`, `Khairul Falah`).
  - Total pegawai aktif di localhost kini resmi menjadi **147 pegawai** (baik pada query Eloquent `Employee::count()` maupun endpoint API `/api/kepegawaian/employees`).

---

## Status Update: 30 September 2026

### 1. Modul BMN: RBAC Granular & Proteksi Unit Kerja / Aset
- **Hak Akses Admin BMN (`role: admin`)**:
  - Diberikan kewenangan penuh untuk mengelola master data **Tag Aset**, master **Ruangan/Lokasi**, dan operasional aset BMN.
  - **Restriksi Unit Kerja Baru**: Admin hanya dapat memilih Unit Kerja yang sudah ada atau standar Balai KSDA Kaltim. Penambahan Unit Kerja baru murni dibatasi hanya untuk `super_admin` (terproteksi di frontend `bmn/settings/page.tsx` dan backend `LocationController.php` dengan HTTP 403 Forbidden).
  - **Restriksi Hapus Permanen**: Permission `bmn.asset.force_delete` dikunci khusus untuk `super_admin` saja. Admin hanya memiliki wewenang pemutihan / soft delete (`bmn.asset.dispose`).
- **Hak Akses User Biasa (`role: user` - Read-Only Penuh)**:
  - User biasa dengan akses modul BMN dapat melihat seluruh data aset kantor Balai secara menyeluruh (bukan terbatas milik sendiri).
  - Seluruh halaman dan tabel BMN (`/bmn`, `/bmn/assets`, `/bmn/loans`, `/bmn/auction-candidates`, `/bmn/auction-batches`, `/bmn/settings`) beroperasi dalam mode murni **Read-Only** (kolom & tombol Tambah, Edit, Hapus, Kembalikan, Buat Paket Lelang disembunyikan).
  - Rute transisi status lelang (`POST /auction-batches/{id}/transition`) diproteksi dengan middleware `permission:bmn.auction.update`.
- **Pengujian & Validasi**:
  - Unit test `UserPermissionFallbackTest`: 9/9 lulus.
  - Feature test `BmnMasterDataTest`: 7/7 lulus (menguji blokir unit kerja baru untuk admin dan izin untuk superadmin).
  - Typecheck `npx tsc --noEmit`: 0 error.

---

## Status Update: 31 Agustus 2026

### 1. Modul Keuangan & Portal Pegawai: Lembar Visum SPD (Surat Perjalanan Dinas)

#### A. Isolasi & Manajemen Tipe Anggaran (DIPA vs FOLU Net Sink 2030)
- **Tombol Pemilih Anggaran (Switcher)**:
  - Tersedia opsi `🏛️ SPD DIPA (Tanpa a.n.)` dan `🌿 SPD FOLU (Dengan a.n.)`.
  - Mengatur data PPK aktif secara dinamis:
    - **SPD DIPA**: `RUSMANTO, S.Hut` (NIP. 19810907 200012 1 004).
    - **SPD FOLU**: `Ahmad Hidayat, S.PKP., M.Ling` (NIP. 19820301 200012 1 001).
- **Isolasi Dropdown Template**:
  - Saat memilih DIPA: Dropdown hanya menampilkan opsi `Manual (Kosong)` dan grup template DIPA (Balai Samarinda, SKW I Berau, SKW II Tenggarong, SKW III Balikpapan).
  - Saat memilih FOLU: Dropdown hanya menampilkan opsi `Manual (Kosong)` dan grup template FOLU (Balai Samarinda, SKW I Berau, SKW II Tenggarong - Kelian, SKW III Balikpapan).
  - Menghilangkan duplikasi penamaan tag `[DIPA]` / `[FOLU]` ganda dan mengurutkan daftar wilayah secara baku (Samarinda -> Berau -> Tenggarong -> Balikpapan).
- **Pilihan Tipe Anggaran pada Form Template**:
  - Modal **Kelola Template** (`VisumManageTemplatesModal`) dilengkapi selector eksplisit DIPA vs FOLU beserta penyesuaian otomatis jabatan & PPK.
  - Modal **Simpan Form Sebagai Template** (`VisumSaveAsTemplateModal`) mendukung penentuan tipe anggaran saat menyimpan.

#### B. Penyempurnaan Format & Tata Letak Cetak Visum SPD (A4 Standard)
- **Format SPD DIPA**:
  - Judul jabatan Kepala Seksi / Kasubbag TU diatur menjadi **satu baris utuh** tanpa wrap/turun ke baris baru.
  - Nama dan NIP pejabat dibuat **sejajar kiri satu sama lain** di dalam blok penandatangan yang **terpusat di tengah** (`display: inline-flex; text-align: left; margin: 0 auto`).
- **Dukungan Berbagai Mode Cetak**:
  - Cetak Lengkap (dengan tabel border).
  - Cetak Blanko Kosong.
  - Cetak Overlay (hanya data isian untuk dicetak di atas blanko fisik).
- **Live Preview Interaktif**:
  - Mendukung kontrol perbesaran zoom (50% - 125%, Fit 85%, 100%) dengan skala A4 presisi tanpa scrollbar ganda.

#### C. Integrasi Portal Pegawai (`/portal`)
- **Fitur untuk Pegawai**:
  - Pegawai dapat mengisi rute perjalanan dinas (asal, tujuan, transit 3/4/5, tiba kembali).
  - Fitur **Tarik Data Surat Tugas**: Mengisi otomatis nomor ST, maksud perjalanan, tanggal mulai/selesai, dan tujuan dari riwayat surat tugas pegawai.
  - Live preview dan cetak langsung.
- **Rule Hak Akses Portal (Selection-Only / Read-Only)**:
  - Tombol dan modal *Kelola Template* disembunyikan secara otomatis (`isPortal={true}`).
  - Pegawai hanya dapat menggunakan template yang telah disediakan admin tanpa dapat mengubah master template.

---

### 2. File Terkait yang Dimodifikasi

1. **Frontend**:
   - `frontend/src/app/keuangan/_components/VisumSpdTab.tsx`
   - `frontend/src/app/keuangan/_components/VisumSpdDocument.tsx`
   - `frontend/src/app/keuangan/_components/VisumManageTemplatesModal.tsx`
   - `frontend/src/app/keuangan/_components/VisumSaveAsTemplateModal.tsx`
   - `frontend/src/app/portal/page.tsx`
2. **Backend**:
   - `backend/app/Modules/Keuangan/Controllers/VisumSpdController.php`
   - `backend/app/Modules/Keuangan/Routes/api.php`
3. **Dokumentasi**:
   - `progress.md`

---

### 3. Refactor & Optimalisasi Modul Portal Pegawai (/ponytail) — Selesai ✅

- **Skor Performa Lighthouse**: Melonjak dari **40 (Merah) ➔ 93 (Hijau)** 🚀
- **Penghapusan Dead Code (*Deletion over Addition*)**:
  - `frontend/src/app/portal/_components/GeneralReportDialog.tsx` (**40 KB dihapus**).
  - `frontend/src/app/portal/_components/ProfileSidebar.tsx` (**12 KB dihapus**).
  - Total pengurangan baris kode: **-1.176 baris kode**.
- **Instant Layout dengan `PortalSkeleton`**:
  - Menghapus *full-screen blocking spinner* dan menggantinya dengan kerangka skeleton 3-kolom instan.
  - Waktu muat LCP (Largest Contentful Paint) terpangkas dari **10.2 detik menjadi < 1.0 detik**.
- **Dynamic Code Splitting (`next/dynamic`)**:
  - Mengisolasi bundle form berat (`SmartPatrolInlineForm`, `GeneralReportInlineForm`, `VisumSpdTab`, `FormulirCutiPrint`, `LeaveRequestDialog`, `SuratTugasLetterPreview`), mengurangi initial payload JS lebih dari **~280 KB**.
- **Tree-Shaking Icons & Libraries (`next.config.ts`)**:
  - Mengaktifkan `optimizePackageImports: ["lucide-react", "date-fns", "recharts"]`.
- **Backend Null-Safety Guard (`AuthController.php`)**:
  - Menambahkan filter pengaman `fn($loan) => $loan->asset !== null` agar endpoint `/api/me/dashboard` 100% stabil terhadap data aset orphan.
- **Zero Hydration Mismatch**:
  - Memperbaiki sinkronisasi SSR vs Client pada `RouteGuard.tsx` dan `portal/page.tsx`.

---

### 4. GitHub Issue Tracker
- **Issue GitHub**: [#584 - refactor: Whole-Repository Module Optimization & Cleanup (Ponytail Audit)](https://github.com/tegaranugrah1/bksda-superapp/issues/584)
- **Status Modul Portal**: **Selesai (Completed & Merged)**.
- **Rencana Modul Berikutnya**:
  - Modul Keuangan, Kepegawaian, Persuratan, BMN, Inventory, DeReporting, dan CMS sesuai checklist pada Issue #584.

---

### 5. Verifikasi & Pengujian
- Kompilasi build Next.js (`npm run build`) lolos 100% tanpa error (73 halaman statis & dinamis).
- Validasi API backend (GET/POST/PUT/DELETE) modul keuangan & portal normal.


---

### 6. Modernisasi UI/UX Detail Pegawai (Full-Screen 2-Column Cockpit & ui-ux-pro-max /ponytail) — Selesai ✅

- **Prinsip Desain & Eksekusi Ponytail**:
  1. **Full-Screen Fluid Layout**: Menghapus batas sempit `max-w-7xl` dan menggunakan lebar penuh fluida monitor (`w-full px-4 sm:px-6 lg:px-8 2xl:px-12`) agar tabel penugasan, cuti, dan uang makan bernapas lega tanpa terpotong.
  2. **2-Column Responsive Full-Screen Split**:
     - *Sidebar Kiri (lg:col-span-4 xl:col-span-3 lg:sticky lg:top-6)*: Mempertahankan Profile Cockpit Card yang disukai pengguna (Foto avatar resolusi tinggi, nama lengkap + gelar, NIP 1-click copy, badge PNS/PPPK/MMP, rincian jabatan & satker, sub-card WhatsApp Chat & Email dinas, kartu alokasi rekening bank uang makan resmi, serta tombol Edit Data Pegawai).
     - *Workspace Kanan (lg:col-span-8 xl:col-span-9 space-y-6)*: Membentang luas mengisi sisa layar dengan 4 Top Metric Summary Cards (Masa Kerja, Penugasan SPT, Sisa Cuti, Uang Makan Terakhir) serta Tab Navigation.
  3. **Standar ui-ux-pro-max & BKSDA Emerald (#059669 / #0F172A)**:
     - Tab navigation aktif menggunakan aksen hijau BKSDA Emerald (`bg-emerald-600 text-white shadow-xs`) dan border atas cockpit `border-t-4 border-t-emerald-600`.
     - Target sentuh minimal 44x44px dan `cursor-pointer` pada seluruh tombol aksi.
     - Tab Biodata adaptif multi-kolom (`xl:grid-cols-3 2xl:grid-cols-4`).
     - Zero new dependencies (mempertahankan helper dan komponen yang sudah teruji).
- **Checklist Implementasi & Hasil Pengujian**:
  - [x] Refactor `frontend/src/app/kepegawaian/employees/[id]/page.tsx` ke arsitektur full-screen 2-column cockpit (`xl:col-span-3` dan `xl:col-span-9`).
  - [x] Modernisasi Skeleton loading ke layout fluid full-screen 2-kolom.
  - [x] Verifikasi kompilasi TypeScript (`npx tsc --noEmit`) lolos 100% tanpa error.
  - [x] Verifikasi uji end-to-end Playwright Chromium (`frontend/tests/kepegawaian-detail-fullscreen.playwright.cjs`): 6/6 test suites PASS, 22 DOM assertions 100% hijau.
  - [x] Verifikasi regresi alokasi bank (`frontend/tests/kepegawaian-bank-allocation.playwright.cjs`): 6/6 test suites PASS.
  - [x] Sinkronisasi AST Knowledge Graph (`graphify update .`): 11.837 nodes, 21.680 edges, 845 communities ter-update.

---

### 7. Security Audit Modul Kepegawaian & Penguatan Pertahanan Berlapis (/security-audit & /ponytail) — Selesai ✅

- **Ruang Lingkup Audit & Laporan Keamanan**:
  - Audit menyeluruh berbasis kode sumber defensif mencakup seluruh controller, middleware, routes, dan komponen UI modul Kepegawaian.
  - Laporan lengkap tercatat di artefak: [`kepegawaian-security-audit-report.md`](kepegawaian-security-audit-report.md).
- **Penguatan Pertahanan Berlapis (Defense-in-Depth) yang Diterapkan**:
  1. **Akses Pengajuan Surat Tugas Publik yang Aman & Masking NIP**:
     - Mempertahankan form pengajuan Surat Tugas publik bagi tamu eksternal tanpa mengorbankan privasi data pegawai.
     - NIP pegawai disamarkan otomatis untuk unauthenticated guest (`1975********1004`), mencegah *scraping / harvesting* direktori 18-digit NIP aparatur.
     - Status submission tetap terkunci ketat pada `status = 'pending'` dan `created_by = null` dengan rate limiting ganda `throttle:15,1` dan `throttle:120,1`.
  2. **Minimisasi Data pada Detail Pegawai (`EmployeeController::show`)**:
     - Membuang relasi objek internal `user` (`unset($data['user'])`) sebelum respons dikembalikan ke client.
     - Mencegah kebocoran pohon perizinan modul dan wewenang akun internal sistem kepada pembaca biasa.
  3. **Jejak Audit Forensik Operasi Administratif Kritis (`EmployeeHistory`)**:
     - Menambahkan pencatatan kronologis pada `kpg_employee_histories`:
       - `RESET_PASSWORD`: Mencatat admin pengeksekusi dan mode reset (link email vs password sementara).
       - `RESET_2FA`: Mencatat Super Admin pengeksekusi reset Autentikasi 2 Langkah.
       - `CREATE_IAM_ACCOUNT` & `UPDATE_IAM_ACCESS`: Mencatat perubahan peran (*role*) dan modul akses.
     - Komponen `EmployeeAuditHistoryTab.tsx` di frontend diperbarui untuk menampilkan catatan tindakan administratif dan diff peran IAM secara rapi.
  4. **Pencegahan Bypass Mutasi HTTP di Middleware (`CheckModuleAccess.php`)**:
     - Menambahkan filter pengaman eksplisit `$request->isMethod('GET')` pada pengecualian hak akses Kepegawaian.
- **Hasil Pengujian & Verifikasi Kualitas 100% Hijau**:
  - [x] `php backend/tests/portal_security_check.php`: 200+ invariant keamanan lulus (100% PASS).
  - [x] `php backend/tests/self_check_public_surat_tugas.php`: Alur pengajuan ST tamu publik lulus (100% PASS).
  - [x] `node frontend/tests/kepegawaian-detail-fullscreen.playwright.cjs`: 6/6 test suites PASS (22 DOM assertions).
  - [x] `node frontend/tests/kepegawaian-bank-allocation.playwright.cjs`: 6/6 test suites PASS (12 DOM assertions).
  - [x] TypeScript compiler (`cd frontend; npx tsc --noEmit`): 0 error.
  - [x] Sinkronisasi Knowledge Graph (`graphify update .`): 11.837 nodes, 21.684 edges, 851 communities ter-update.

---

### 8. Implementasi Animate UI (Shadcn Motion Primitives) & Peta Jalan Seluruh Modul (/ponytail) — Selesai ✅

- **Tujuan & Prinsip Ponytail**:
  - Menerapkan sentuhan animasi modern enterprise (*Animate UI* berbasis Shadcn motion primitives) tanpa menambah ketergantungan library baru (memanfaatkan `framer-motion: ^12.38.0` yang telah terpasang).
  - Akselerasi perangkat keras 60 FPS (hanya memanipulasi `transform` dan `opacity`, tanpa jank atau layout reflow).
  - Durasi ultra-responsif (120ms – 240ms) dengan fisika pegas (*spring physics*).

- **Eksekusi Pilot pada Halaman Detail Pegawai (`/kepegawaian/employees/[id]`)**:
  1. **Sliding Active Tab Indicator**:
     - Menghadirkan indikator pil hijau zamrud (`bg-emerald-600 rounded-xl shadow-xs`) dengan `layoutId="activeTabIndicator"` yang meluncur mulus mengikuti tab yang aktif (Biodata, Riwayat Penugasan, Cuti, Presensi & Uang Makan, Riwayat Perubahan).
     - Label dan ikon tab terlindungi dengan `relative z-10`.
  2. **Elevasi Taktil pada Kartu Metrik (Top 4 Metrics)**:
     - Efek melayang halus (`whileHover={{ y: -3 }}`) dan respon sentuhan (`whileTap={{ scale: 0.98 }}`) dengan durasi `0.15s` pada kartu Masa Kerja, Total SPT, Sisa Cuti, dan Uang Makan.
  3. **Transisi Konten Panel Lembut**:
     - Membungkus tab panel dengan `<AnimatePresence mode="wait">` dan `<motion.div key={activeTab}>` dengan efek luncur vertikal halus 8px (`duration: 0.16s`), mencegah pergantian halaman tersentak (*jumpy*).
  4. **1-Click Copy Micro-Bounce Feedback**:
     - Membuat helper ringkas 1-baris `CopyIcon` dengan animasi rotasi pop `initial={{ scale: 0.5, rotate: -15 }}` dan pegas lembut saat menyalin NIP, nomor telepon WhatsApp, email dinas, dan rekening bank.

- **Dokumentasi Desain & Peta Jalan Lengkap Seluruh Modul**:
  - Diterbitkan panduan resmi: [`docs/animate-ui-motion-guidelines.md`](docs/animate-ui-motion-guidelines.md) mencakup 7 resep standar gerak siap pakai.
  - Diterbitkan laporan audit & inventaris: [`animate-ui-roadmap-and-inventory.md`](animate-ui-roadmap-and-inventory.md) yang memetakan seluruh 102 halaman pada 8 modul utama (Kepegawaian, Persuratan, Keuangan, BMN, Inventory, De-Reporting, Portal/Publik, dan Drive).

- **Hasil Pengujian & Verifikasi Kualitas 100% Hijau**:
  - [x] Invariant Gerak Animate UI (`node frontend/tests/animate-ui-motion-check.cjs`): 30/30 checks PASS (100% HIJAU) mencakup Detail Pegawai, Uang Makan, Settings, Surat Tugas Inbox, Cuti, Daftar Pegawai, dan Dashboard.
  - [x] Playwright End-to-End Test (`node frontend/tests/kepegawaian-detail-fullscreen.playwright.cjs`): 6/6 suites PASS (22 DOM assertions).
  - [x] Kompilasi TypeScript (`cd frontend; npx tsc --noEmit`): 0 error.
  - [x] AST Knowledge Graph (`graphify update .`): 11.866 nodes, 21.728 edges, 843 communities ter-update.

---

### 9. Ekspansi Motion Primitives Penuh ke Seluruh Modul Kepegawaian (/ponytail) — Selesai ✅

- **Latar Belakang & Keluhan Pengguna**:
  - Animasi pada halaman Detail Pegawai (`/kepegawaian/employees/[id]`) telah berjalan sangat mulus (sliding pill tab indicator dan tab panel yang dibuka memiliki transisi animasi halus saat berpindah antar tab).
  - Namun, halaman-halaman lain di Modul Kepegawaian sebelumnya belum memiliki transisi panel saat berpindah tab/filter.

- **Penyelarasan & Upgrade Gerak Menyeluruh per Halaman**:
  1. **Uang Makan Pegawai (`/kepegawaian/uang-makan`)**:
     - Memasang `<AnimatePresence mode="wait">` + `<motion.div key={activeTab}>` (`opacity: 0 -> 1, y: 8 -> 0`, 160ms easeOut) pada seluruh 4 panel tab: *Upload Presensi*, *Pratinjau Matriks*, *Daftar Nominatif*, dan *Riwayat Batch*.
     - Tab yang dibuka kini meluncur masuk secara halus dan konsisten dengan Detail Pegawai.
  2. **Pengaturan Kepegawaian (`/kepegawaian/settings`)**:
     - Mengganti tombol statis dengan sliding pill indicator (`layoutId="activeSettingsTabIndicator"`) berpegas natural.
     - Membungkus ke-5 panel tab (*Template Surat Tugas*, *Jenis Tugas ST*, *Template Biaya*, *Jenis Surat Cuti*, dan *Uang Makan & Hari Libur*) dengan `<AnimatePresence mode="wait">` + `<motion.div key={activeTab}>`.
  3. **Inbox Surat Tugas (`/kepegawaian/surat-tugas/inbox`)**:
     - Membungkus daftar surat tugas dengan `<AnimatePresence mode="wait">` + `<motion.div key={activeTab}>` saat berpindah status (*Semua*, *Draft*, *Menunggu Persetujuan*, *Disetujui*, *Ditolak*, *Sampah*).
     - Menambahkan slide-in vertikal lembut pada Full Reader View saat dokumen surat tugas dibuka.
  4. **Manajemen Cuti Pegawai (`/kepegawaian/cuti`)**:
     - Membungkus tabel data permohonan cuti dengan `<AnimatePresence mode="wait">` + `<motion.div key={selectedStatus + selectedYear}>` sehingga transisi filter status maupun tahun berjalan mulus tanpa lompatan visual.
  5. **Daftar Pegawai (`/kepegawaian/employees`)**:
     - Membungkus tabel data pegawai dengan `<AnimatePresence mode="wait">` + `<motion.div key={jenisFilter + statusFilter + wilayahFilter}>` saat admin berganti kategori (Total, PNS, PPPK, MMP, Trashed).
  6. **Dashboard Kepegawaian (`/kepegawaian`)**:
     - Menambahkan elevasi taktil (`whileHover={{ y: -2/-3 }}`) dan respon klik (`whileTap={{ scale: 0.98 }}`) pada 3 kartu kategori personil (PNS, PPPK, MMP) serta 4 kartu bento layanan (Surat Tugas, Cuti, Surat Masuk, Keaktifan).

- **Verifikasi Kualitas**:
  - `animate-ui-motion-check.cjs`: Diperluas dari 15 checks menjadi **30 checks otomatis**, seluruhnya **PASS 100%**.
  - TypeScript Compiler: **0 error**.

---

### 10. Eliminasi Kedipan Angka Nol (0 Flickering Fix) saat Pindah Tab & Filter Kepegawaian (/ponytail) — Selesai ✅

- **Akar Masalah (Root Cause)**:
  - Pada TanStack Query v5, saat `queryKey` berubah (misalnya pengguna mengklik kartu "Pegawai PNS", "PPPK", "MMP", atau filter status cuti "Menunggu Persetujuan", "Disetujui", "Ditolak"), query baru berada dalam status *fetching* dan `data` bernilai `undefined` selama 100–300 milidetik.
  - Nilai `counts` pada `employees/page.tsx` dan `summaryCounts` pada `cuti/page.tsx` sebelumnya mengandalkan fallback default `{ total: 0, pns: 0, pppk: 0, mmp: 0, trashed: 0 }`. Akibatnya, seluruh angka pada kartu metrik drop menjadi **0** sesaat sebelum melompat kembali ke angka asli.

- **Solusi Defensif & Ringkas Sesuai Prinsip Ponytail**:
  1. **Aktivasi `placeholderData: keepPreviousData` (TanStack Query)**:
     - Diterapkan pada `employees/page.tsx`, `cuti/page.tsx`, dan `surat-tugas/inbox/page.tsx`.
     - Query mempertahankan data sebelumnya selama proses request filter/tab baru berlangsung di latar belakang, mencegah status `data = undefined`.
  2. **Persistensi State Ref (`useRef`) Anti-Zero Reset**:
     - Memasang `lastCountsRef` pada Daftar Pegawai dan `lastSummaryCountsRef` / `lastTotalRecordsRef` pada Inbox Cuti.
     - Angka ringkasan dan badge counter tidak akan pernah turun ke angka 0 saat pergantian filter, menghasilkan transisi yang 100% mulus (*seamless*).

- **Verifikasi Kualitas**:
  - TypeScript check: **0 error**.
  - Invariant gerak: **30/30 PASS (100% Hijau)**.

---

### 11. Eliminasi Scrollbar Layout Shift & Pergerakan Melompat saat Pindah dari/ke Data Terhapus (/ponytail) — Selesai ✅

- **Akar Masalah (Root Cause)**:
  1. **Scrollbar Jump (Horizontal 15px Shift)**: Pada "Data Terhapus", data bernilai 0 sehingga tinggi konten lebih pendek dari tinggi layar. Kontainer `<main>` sebelumnya menggunakan `overflow-y: auto` tanpa reservasi gutter. Saat beralih ke tab aktif yang memiliki 10 baris, scrollbar vertikal tiba-tiba muncul dan menggeser seluruh lebar halaman sebesar 15–17px ke kiri.
  2. **Banner Vertical Displacement**: Banner rose peringatan `isTrashedView` diletakkan di luar kontainer tabel (di antara filter toolbar dan tabel), sehingga saat masuk/keluar tab Data Terhapus, tabel terdorong ke bawah 44px lalu tertarik kembali ke atas.
  3. **Height Collapsing**: Tabel tanpa `min-height` menciut dari ~500px menjadi ~120px saat berpindah ke tab kosong, memicu lonjakan layout visual yang tersentak.

- **Solusi Defensif & Ringkas Sesuai Prinsip Ponytail**:
  1. **Reservasi Gutter Scrollbar Permanen (`scrollbar-gutter: stable`)**:
     - Ditambahkan pada `html`, `body`, dan `main` di `globals.css` serta class utility `[scrollbar-gutter:stable]` pada `<main>` di `kepegawaian/layout.tsx`.
     - Ruang scrollbar di sisi kanan layar selalu direservasi, sehingga lebar halaman tidak pernah bergeser 1 piksel pun saat data kosong maupun penuh.
  2. **Enkapsulasi Banner Peringatan ke Dalam Kartu Tabel**:
     - Banner `isTrashedView` dipindahkan ke dalam kartu tabel beranimasi (`motion.div`). Posisi dan jarak kartu tabel dari filter toolbar tetap statis sempurna.
  3. **Ketinggian Kontainer Stabil (`min-h-[460px] flex flex-col justify-between`)**:
     - Ditambahkan pada tabel Daftar Pegawai dan Inbox Cuti. Tampilan kosong di-center secara estetis dan kartu tidak pernah menciut.
  4. **Penghalusan Kurva Animasi**:
     - Durasi 140ms easeOut, `initial={{ opacity: 0, y: 4 }}` dan `exit={{ opacity: 0 }}` (menghapus tarikan y negatif yang menyentak).

- **Verifikasi Kualitas**:
  - TypeScript check: **0 error**.
  - Invariant gerak: **30/30 PASS (100% Hijau)**.
  - Playwright E2E: **6/6 Suites PASS (22 DOM Assertions)**.

---

### 12. Modernisasi Animate UI Modul Arsip Surat Masuk Kepegawaian (`/kepegawaian/surat-masuk`) (/ponytail) — Selesai ✅

- **Fitur Animasi & Motion Primitives yang Diimplementasikan**:
  1. **Tactile Quick Filter Summary Cards**:
     - 4 kartu status (Total Arsip, Menunggu Balasan, Sudah Dibalas, Arsip Bulan Ini) dikonversi menggunakan `<motion.button>` dengan `whileHover={{ y: -3 }}` dan `whileTap={{ scale: 0.98 }}`.
     - Pulsing beacon (radar ping amber) aktif otomatis pada kartu 'Menunggu Balasan' jika terdapat surat yang butuh balasan.
     - Persistensi ref `lastSummaryCountsRef` & `displaySummaryCounts` memastikan angka ringkasan tidak pernah kedip ke 0 saat filter berubah.
  2. **Data Table Glide Transition & Height Stability**:
     - Tabel arsip dibungkus dengan `<AnimatePresence mode="wait">` + `<motion.div key={...}>` dengan ketinggian stabil `min-h-[460px] flex flex-col justify-between`.
     - Cross-fade halus (140ms easeOut) saat mengganti filter kategori, status balasan, rentang tanggal, maupun halaman.
     - Layout kosong (empty state) dan pemuatan terpusat sempurna tanpa sentakan pergeseran layout.
  3. **Smooth Modals dengan Backdrop Blur & Spring Pop-Up**:
     - 4 modal utama dibungkus `<AnimatePresence>`:
       1. Modal Detail Surat (`detailItem`)
       2. Modal Tambah / Edit Arsip (`formOpen` & `<motion.form>`)
       3. Modal Pratinjau Lampiran PDF/Gambar (`preview`)
       4. Modal Export Excel Rekapitulasi (`exportOpen`)
     - Backdrop fade-in (`opacity: 0 -> 1`), Dialog container spring scale (`scale: 0.96 -> 1, y: 10 -> 0`).

- **Verifikasi Kualitas**:
  - TypeScript check: **0 error**.
  - Invariant gerak: **36/36 PASS (100% Hijau)**.

---

### 13. Pembaruan Instruksi Setup & Onboarding Pengembang (`README.md` & `frontend/.env.example`) — Selesai ✅

- **Latar Belakang & Masalah**:
  - Instruksi setup pada `README.md` sebelumnya belum mencantumkan daftar ekstensi PHP wajib (`pdo_pgsql`, `mbstring`, `zip`, `gd`, dll), penjelasan port Docker `5435`, dan `frontend/.env.example` belum tersedia sehingga instruksi `cp .env.example .env.local` di frontend sebelumnya gagal jika di-clone oleh pengguna baru.
- **Penyempurnaan yang Diterapkan**:
  1. **Pembuatan File `frontend/.env.example` & Whitelist Git**:
     - Menambahkan file `frontend/.env.example` dengan konfigurasi endpoint `NEXT_PUBLIC_API_URL` dan `NEXT_PUBLIC_STORAGE_URL`.
     - Memperbarui `frontend/.gitignore` dengan `!.env.example` agar file template environment terlacak di repository.
  2. **Modernisasi `README.md` Komprehensif**:
     - **Daftar Prasyarat**: Spesifikasi PHP 8.3+, Composer 2.x, Node.js 20+, Docker Compose, dan Git.
     - **Tabel Ekstensi PHP Wajib & Panduan OS**: Perintah terminal sekali klik untuk Linux Ubuntu/Debian dan panduan edit `php.ini` untuk Windows.
     - **Penjelasan Port Docker**: Klarifikasi pemetaan port host `5435` untuk mencegah konflik dengan PostgreSQL lokal yang sudah ada di port `5432`.
     - **Langkah Setup Terstruktur**: Langkah A (Clone), B (Docker Compose), C (Backend Laravel: `composer install`, `cp .env`, `key:generate`, `storage:link`, `migrate`, `db:seed`), D (Frontend: `npm install`, `cp .env.local`).
     - **Tabel Kredensial Awal**: Super Admin NIP (`198001012005011001`), Super Admin Username (`superadmin`), Admin Persuratan (`magang`), pgAdmin, dan RustFS Console.
     - **Troubleshooting FAQ**: Solusi untuk error PDO driver, connection refused, symlink storage, dan CORS frontend.
     - **Status VM 108 Hermes**: Memperbarui status VM Hermes Agent (`192.168.100.205`) menjadi aktif 🟢.


---

### 14. Redesain & Penyelarasan Penuh Mobile Portal & Modul Kepegawaian BKSDA SuperApp — Selesai ✅

- **Latar Belakang & Kebutuhan Pengguna**:
  1. Penyelarasan menyeluruh antara antarmuka FigCraft (`docs/bksda-superapp-mobile-portal.figcraft`) dan implementasi kode React Native (`mobile/src/features/dashboard/PortalDashboardScreen.tsx`).
  2. Implementasi arsitektur **5-Item Unified Bottom Navigation Bar**:
     - **Nav 1 (Beranda)**: MODUL AKSES SYSTEM (Grid 4x2 seimbang dengan 8 Modul Terotorisasi: Kepegawaian, Keuangan, BMN, Persediaan, DeReporting, CMS, Persuratan, dan BKSDA Drive [BARU]), Salam Eksekutif Soft, 2 Metrik Cepat (Pangkat/Golongan & Sisa Cuti), Kartu Tugas Dinas Berjalan (Sedang Dinas dengan rincian Visum/SPD di-hide karena modul keuangan dikerjakan tim lain), dan Strip Helpdesk TU.
     - **Nav 2 (Surat Tugas)**: Layar tersendiri untuk daftar riwayat Surat Tugas Saya dengan filter segmented (Semua, Berjalan, Selesai), tombol Pratinjau Mata (Eye Preview Modal), dan prompt pembuatan SPT baru.
     - **Nav 3 (Center Elevated FAB +)**: Tombol aksi cepat di tengah bawah yang memunculkan Bottom Sheet Modal dengan 2 pilihan: `+ Buat Surat Tugas (SPT) Baru` (menuju ST Builder) dan `+ Pengajuan Cuti Online` (menuju Formulir Cuti BKN).
     - **Nav 4 (Layanan Terpadu ASN)**: 4 kartu layanan kedinasan mandiri: Pinjaman BMN Aktif, Aset Saya, Riwayat Pengajuan Cuti, dan Kalkulator Dinas (SBM).
     - **Nav 5 (Profil Pegawai ASN)**: Profil identitas ASN 360, NIP, Golongan, Jabatan, Unit Kerja, Metrik Cuti/Aset, Pengaturan Akun, dan Logout resmi.
  3. Mengadopsi prinsip **Zero Clutter**: Menghilangkan seluruh tampilan rekening uang makan di mobile (sesuai arahan pengguna), namun tetap mempertahankan riwayat perubahan audit (*audit change history with diffs*).
  4. Menerapkan tema warna **Soft Executive Government Modern**: Menghilangkan warna kontras yang terlalu tajam, menggantinya dengan palet `#F8FAFC`, `#064E3B`, `#059669`, `#ECFDF5`, dan border lembut `#E2E8F0`.

- **Hasil Desain FigCraft (`docs/bksda-superapp-mobile-portal.figcraft`)**:
  - **Halaman 1 (`01. Portal & Bottom Navigation`)**: 7 layar lengkap (`01. Portal Beranda`, `02. List Surat Tugas ASN`, `03. Modal Center FAB`, `04. Layanan Terpadu ASN`, `05. Profil Pegawai ASN`, `06. Inventaris BMN Pribadi Sub-Screen`, `07. Riwayat Pengajuan Cuti ASN Sub-Screen`).
  - **Halaman 2 (`02. Pengajuan Surat Tugas`)**: 3 layar alur pengajuan SPT standar.
  - **Halaman 3 (`03. Modul Kepegawaian Mobile`)**: 7 layar lengkap termasuk ST Builder Premium 4-step (Template Dasar, Menimbang/Dasar, Diktum/Biaya/Laporan, Penandatangan/Tembusan), Otorisasi Nomor ST, dan Preview PDF resmi.
  - **Halaman 4 (`04. Menu Kepegawaian (Cuti & SDM)`)**: 5 layar lengkap termasuk Inbox & Approval Cuti, Formulir Cuti BKN, Detail Pegawai Biodata (tanpa uang makan), Riwayat Perubahan (Audit History Diff), dan Kalender Penugasan Lapangan.

- **Implementasi Kode, Evolusi Navigasi Sub-Screen Layanan & Verifikasi Kualitas**:
  - File: `mobile/src/features/dashboard/PortalDashboardScreen.tsx`.
  - **Peningkatan UX Lapangan dari Modal Pop-up ke Sub-Screen Khusus**:
    1. Mengatasi kendala data lapangan (riwayat cuti bertahun-tahun & inventaris BMN 10+ aset) yang sebelumnya sesak di modal pop-up kecil, dengan mengubahnya menjadi **Dedicated Sub-Screen (dengan tombol `← Kembali`)**:
       - **Layar Inventaris BMN Saya**: Mengintegrasikan Aset Tetap dan Pinjaman Berjalan dalam 1 layar via Segmented Control `[ Aset Tetap (12) | Pinjaman Berjalan (3) ]`, Search Bar live, Filter Kategori chip (`Semua`, `Kendaraan`, `IT & PC`, `Peralatan`), serta rincian lengkap BMN (NUP, kondisi, plat nomor).
       - **Layar Riwayat Pengajuan Cuti ASN**: Banner Ringkasan Kuota Hero (Soft Emerald), **Filter Pill Horisontal per Tahun** (`2026`, `2025`, `2024`, `Semua`), kartu riwayat terperinci, tombol cetak formulir cuti BKN resmi, dan tombol aksi `+ Ajukan Permohonan Cuti Baru`.
       - **Kalkulator Dinas (SBM)**: Tetap dipertahankan sebagai **Bottom Sheet Modal** cepat karena merupakan alat simulasi kalkulasi tanpa arsip data panjang.
    2. **Floating Bottom Navigation Bar**: Tetap terlihat secara persisten di bagian bawah layar saat membuka sub-layar BMN maupun Cuti, memberikan fleksibilitas navigasi instan kembali ke Beranda atau Surat Tugas tanpa perlu menekan tombol Back berkali-kali.
    3. **Koreksi & Konsolidasi Endpoint REST API**:
       - `GET /me/assets` (AuthController::myAssets) untuk inventaris BMN personal.
       - `GET /me/dashboard` (properti `my_assets`) untuk pinjaman aktif berjalan.
       - `GET /me/leave-requests` dan `GET /me/leave-balance?year=2026` untuk kuota dan riwayat cuti.
       - `GET /surat-tugas/my` untuk penugasan SPT dinas.
     4. **Penataan Ulang Menu Layanan Terpadu & Spacing Helpdesk TU**:
        - **Urutan Kartu Diperbarui**: Kartu **"Aset Saya"** dipindahkan ke posisi paling atas (Card 1), diikuti berturut-turut oleh **"Pinjaman BMN Aktif"** (Card 2), **"Riwayat Pengajuan Cuti"** (Card 3), dan **"Kalkulator Dinas (SBM)"** (Card 4).
        - **Spacing & Estetika Helpdesk TU**: Strip *"Butuh bantuan administrasi & TU?"* diberikan breathing space yang lega (`marginTop: 22`, `marginBottom: 95`, `paddingVertical: 14`, `paddingHorizontal: 16`), dilengkapi badge lingkaran hijau lembut (`#DCFCE7`) dan teks konsultasi SPPD, BMN & Cuti yang mudah dibaca tanpa terpotong oleh floating bottom navigation.
  - Dokumentasi arsitektur terbit: `docs/mobile-portal-architecture.md`.
  - Verifikasi TypeScript: **0 errors (100% Lulus)** via `npx tsc --noEmit`.
  - Verifikasi Metro Bundler: Berjalan aktif dan hot reload mulus tanpa runtime crash.
  - Artefak visual visualizer: `page1_screen4_layanan_aset_top_and_helpdesk_space.png`, `page1_screen4_and_dedicated_subscreens.png`, dan `page1_all_7_screens_portal.png`.

---

### 15. Integrasi Foto Dokumentasi Aset Portal Web & Lightbox Modal — Selesai ✅

- **Kebutuhan & Permintaan Pengguna**:
  1. Pada tampilan **Grid View** tab "Aset Saya" di modul Portal Web, foto aset wajib diambil dari foto dokumentasi dengan urutan prioritas:
     - **Prioritas 1**: Foto Geotag (`foto_geotag_url` / `foto_geotag_path`).
     - **Prioritas 2**: Tampak Depan (`foto_depan_url` / `foto_depan_path`).
     - **Prioritas 3**: Tampak Belakang (`foto_belakang_url` / `foto_belakang_path`).
     - **Prioritas 4**: Tampak Kiri (`foto_kiri_url` / `foto_kiri_path`).
     - **Prioritas 5**: Tampak Kanan (`foto_kanan_url` / `foto_kanan_path`).
     - **Prioritas 6**: Foto Lokasi / Foto URL Umum.
  2. Menghapus tombol *"Buka Detail Aset"* pada kartu aset.
  3. Mengubah interaksi kartu: Saat kartu aset di-klik, sistem membuka **Lightbox Photo Preview Modal** yang menampilkan foto resolusi tinggi, navigasi galeri (*slider* foto), label sudut pandang dokumentasi, dan tautan gambar asli.

- **Implementasi Solusi**:
  1. **Backend `AuthController.php` (`GET /api/me/assets`)**:
     - Memperluas kueri select untuk memuat seluruh 5 titik dokumentasi audit BMN (`foto_geotag`, `depan`, `belakang`, `kiri`, `kanan`, `lokasi`, `foto_url`).
     - Menghasilkan URL inline view dengan token dan timestamp cache-busting.
  2. **Frontend `MyAssetsTab.tsx`**:
     - Menambahkan fungsi `resolvePhotoUrl()` untuk otomatis mentransformasi tautan Google Drive (*share link*) menjadi gambar *high-res direct image* (`lh3.googleusercontent.com/d/...`), menghindari error CORS dan gambar pecah.
     - Mengimplementasikan `getAssetPhotos()` dan `getPrimaryAssetPhoto()` dengan urutan prioritas resmi (Geotag -> Tampak Depan -> Tampak Belakang -> Tampak Kiri -> Tampak Kanan).
     - Menghapus tombol detail dan menjadikan seluruh kartu interaktif (*cursor-pointer* dengan efek hover zoom & badge sumber foto).
     - Membangun Lightbox Photo Modal dengan dukungan keyboard (`Esc`, `ArrowLeft`, `ArrowRight`), tombol navigasi geser, indikator pill foto ganda, dan toast notifikasi ramah jika aset belum memiliki dokumentasi foto.
  3. **Verifikasi Kualitas**:
     - TypeScript Next.js: `npx tsc --noEmit` **0 Errors (100% Pass)**.
     - HTTP Status Endpoint Portal: 200 OK.

---

### 16. Redesain Seleksi Peminjaman Aset BMN (Modal Katalog Visual & Non-AI Professional UI) — Selesai ✅

- **Kebutuhan & Hasil Diskusi `/grill-me`**:
  1. Penggantian Popover sempit pada `http://localhost:3000/bmn/loans/create` menjadi **Modal Dialog Katalog Aset Visual** yang luas (`max-w-5xl`).
  2. **Filter Otomatis Layak Pinjam**: Mengecualikan aset tak bergerak/infrastruktur (Tanah, Bangunan/Gedung/Pagar, Rumah Negara) dan aset rusak berat.
  3. **Filter Tab Kategori Cepat**:
     - `Semua Layak Pinjam` (`Layers`)
     - `Kendaraan Bermotor` (`Car`)
     - `IT & Komputer` (`Laptop`)
     - `Peralatan Lapangan` (`Compass`)
  4. **Dual View Switcher**: Pilihan tampilan Grid kartu visual berfoto (16:10) vs List kompak.
  5. **Prinsip UI/UX Pro Max & Ponytail**:
     - **Tanpa Ikon AI**: Tidak menggunakan ikon `Sparkles` / sihir AI; menggunakan ikon domain logistik/BMN resmi (`Boxes`, `Layers`, `Car`, `Laptop`, `Compass`).
     - Desain flat eksekutif yang bersih, kontras tinggi, border tegas, tanpa gradien mencolok (*zero bloat*).
     - Multi-select dengan Sticky Floating Bottom Bar: *"X barang dipilih"* dan tombol *"Masukkan ke Form Pinjam (X)"*.
  6. **Dek Barang Terpilih di Step 1**: Kartu berfoto terstruktur rapi dengan tombol hapus merah lembut (`✕`).
  7. **Ekspansi Ukuran Modal Katalog (Lega & Responsif Desktop)**:
     - Mengatasi pembatasan default `DialogContent` shadcn (`sm:max-w-sm`) dengan menetapkan `w-[96vw] max-w-full sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] h-[92vh] max-h-[92vh]`.
     - Tampilan Grid ditingkatkan menjadi multi-kolom responsif (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4`) dengan kartu foto luas, teks multi-line tanpa truncate terpotong (`line-clamp-2`), badge NUP monospace jelas, dan thumbnail list view besar (`w-16 h-16`).
     - Header pencarian lebih tinggi (`h-11`) dan counter real-time aset layak pinjam.
  8. **Transparansi Pengguna & Status Pinjam Aktif (Backend + Frontend)**:
     - Backend `AssetController.php`: Kueri pencarian diperluas untuk mencakup `pengguna`, `nama_pengguna`, penanggung jawab (`penanggungJawab.nama_lengkap`), dan peminjam aktif (`loans.borrower.nama_lengkap`). Mencari nama pegawai kini langsung menemukan aset terkait.
     - Frontend `AssetCatalogModal.tsx` & `page.tsx`: Menampilkan badge pengguna pegawai (`👤 Pengguna: [Nama]`) dan penanda aset sedang dipinjam (`🔄 Sedang Dipinjam: [Nama Peminjam] s.d. [Tanggal]`).
     - Aset yang sedang dipinjam otomatis dinonaktifkan dari seleksi permohonan pinjam baru dengan notifikasi toast protektif.
  9. **Optimasi Kinerja & Memori RAM (Prinsip Ponytail)**:
     - Mengurangi beban initial render dari 100 aset sekaligus menjadi **10 aset per batch** (`per_page: 10`) dengan grid 5 kolom (`lg:grid-cols-5`).
     - Tepat 2 baris kartu pada desktop tanpa perlu scroll vertikal.
     - Pemuatan cepat, konsumsi RAM browser minimal, decoding foto langsung responsif, dilengkapi tombol *"Muat Lebih Banyak (+10 Aset)"* dan indikator counter real-time (`X dari Total Aset`).

- **Verifikasi Kualitas**:
  - TypeScript Next.js: `npx tsc --noEmit` **0 Errors (100% Pass)**.
  - HTTP Status: 200 OK.

---

### 17. Perbaikan HTTP 500 Endpoint `/api/bmn/loans` (PostgreSQL Constraint Violation) — Selesai ✅

- **Root Cause**:
  - Pada tabel `bmn_asset_loans`, constraint PostgreSQL bawaan `bmn_asset_loans_status_check` hanya mengizinkan `('dipinjam', 'dikembalikan')`.
  - Ketika `LoanService@listLoans` memeriksa pinjaman yang telah melewati `due_date` (misal permohonan pinjam Oktober 2026 yang jatuh tempo 2026-10-11), sistem memperbarui status ke `terlambat`.
  - PostgreSQL menolak pembaruan tersebut dengan exception: `SQLSTATE[23514]: Check violation: 7 ERROR: new row for relation "bmn_asset_loans" violates check constraint "bmn_asset_loans_status_check"` sehingga menyebabkan HTTP 500 Internal Server Error saat membuka daftar peminjaman.

- **Solusi & Implementasi**:
  1. **Migration Baru**: `backend/app/Modules/Bmn/Migrations/2026_11_05_075000_fix_bmn_asset_loans_status_check_constraint.php`.
  2. Memperbarui check constraint PostgreSQL menjadi:
     `CHECK (status::text = ANY (ARRAY['dipinjam'::text, 'dikembalikan'::text, 'terlambat'::text]))`.
  3. Migration berhasil dijalankan dan status HTTP `GET /api/bmn/loans?page=1&per_page=10` pulih menjadi **200 OK**.

---

### 18. Redesain Tab Pinjaman Aktif di Portal Pegawai (`/portal`) — Selesai ✅

- **Latar Belakang & Kebutuhan**:
  - Tampilan tab **Pinjaman Aktif** di Portal Pegawai (`http://localhost:3000/portal`) sebelumnya hanya berupa daftar teks sederhana tanpa foto dan tanpa opsi tampilan grid visual, berbeda dengan tab **Aset Saya** (`MyAssetsTab`) yang sudah memiliki pratinjau foto dokumentasi dan modal lightbox interaktif.
  - Pengguna meminta agar tampilan pinjaman aktif dibuat serupa dan setara dengan tampilan Aset Saya, tetap menerapkan prinsip **Ponytail** (kode minimal, reuse helper yang ada) dan standar **UI/UX Pro Max** (tanpa ikon AI).

- **Perubahan Backend (`AuthController.php`)**:
  - Memperbarui pemetaan `my_assets` pada endpoint `GET /api/me/dashboard` agar tidak hanya mengirimkan teks dasar, melainkan juga menyertakan seluruh atribut foto dokumentasi lengkap:
    - `foto_geotag_url`, `foto_geotag_path`
    - `foto_depan_url`, `foto_belakang_url`, `foto_kiri_url`, `foto_kanan_url`, `foto_lokasi_url`, `foto_url`
  - Menyertakan token bearer dan parameter cache-busting timestamp `v` untuk URL foto dinamis.
  - Menambahkan data `kondisi`, `tipe`, `merk_tipe`, dan `lokasi_ruang`.

- **Perubahan Frontend (`ActiveLoansTab.tsx` & `page.tsx`)**:
  1. **Dual View Switcher (List vs Grid)**:
     - Header daftar pinjaman aktif dilengkapi tombol toggle tampilan **List** (`List`) dan **Grid** (`LayoutGrid`).
     - Tampilan Grid menampilkan foto dokumentasi dengan rasio aspek video, badge jenis foto (`GEOTAG`, `TAMPAK DEPAN`), badge plat nomor kendaraan bermotor, badge status pinjaman (`Dipinjam` biru / `Terlambat` merah), strip jadwal tanggal pinjam & batas kembali, serta badge kondisi fisik aset (`Baik`, `Rusak Ringan`, `Rusak Berat`).
     - Tampilan List menampilkan thumbnail foto dengan hover zoom overlay, rincian NUP, kode barang, spesifikasi merk, tanggal pinjam & batas kembali, badge status, dan indikator kamera.
  2. **Modal Lightbox Foto Dokumentasi Interaktif**:
     - Mengklik aset (baik pada tampilan list maupun grid) akan membuka modal foto resolusi penuh berlatar gelap blur (`fixed inset-0 z-50 bg-black/85 backdrop-blur-md`).
     - Navigasi keyboard terintegrasi: tombol `Escape` untuk menutup modal, `Panah Kiri` dan `Panah Kanan` untuk berpindah foto.
     - Pill selector sudut foto di bagian bawah modal jika aset memiliki beberapa foto dokumentasi.
     - Tombol eksternal untuk membuka foto asli di tab peramban baru.
  3. **Zero AI Bloat & Ponytail Code Reuse**:
     - Tidak menggunakan ikon sihir / AI (`Sparkles`), murni menggunakan ikon domain logistik/portal (`Package`, `Camera`, `List`, `LayoutGrid`, `ZoomIn`, `Clock`, `ExternalLink`).
     - Menggunakan kembali (*reuse*) helper `formatMerkTipe`, `resolvePhotoUrl`, dan `getAssetPhotos` dari `MyAssetsTab.tsx`.

- **Verifikasi Kualitas**:
  - TypeScript Next.js: `npx tsc --noEmit` **0 Errors (100% Pass)**.
  - PHP Lint: `php -l backend/app/Http/Controllers/Api/AuthController.php` **No syntax errors detected**.
  - HTTP Status: `http://localhost:3000/portal` **200 OK**.

---

### 19. Integrasi Basis Pengetahuan & Dokumentasi Menyeluruh di Obsidian — Selesai ✅

- **Latar Belakang & Kebutuhan**:
  - Pengguna menghendaki seluruh dokumentasi arsitektur, fitur modul, dan basis pengetahuan codebase Graphify dicatat dan dapat dijelajahi secara visual di aplikasi **Obsidian** (pada vault lokal `E:\bksda-superapp\bksda-superapp-vault`).
  - Menu Portal Pegawai (`/portal`) yang sangat kaya fitur (7 layanan mandiri staf + 7 modul sistem terotorisasi + widget operasional) memerlukan dokumentasi komprehensif terstruktur.

- **Struktur & Implementasi Vault Obsidian (13.682 Dokumen)**:
  1. **Dasbor Sentral MOC (`00 - Beranda dan Indeks Utama (MOC).md`)**:
     - Map of Content lengkap dengan tautan timbal balik (`[[...]]`), ringkasan status sistem, dan status port layanan.
  2. **Arsitektur & Infrastruktur (`01 - Arsitektur dan Teknologi`)**:
     - Gambaran Umum Arsitektur (Next.js 16, Laravel 11, Hermes VM 108, Postgres 16).
     - Skema Database & Relasi Model (BMN, Kepegawaian, Cuti PerBKN, Surat Tugas, Audit Trail).
     - Autentikasi & Keamanan (Sanctum, RBAC, dan hasil pengujian 6 attack surface pentest).
     - Hermes WhatsApp Assistant VM 108 (Spesifikasi VM Proxmox, Evolution API v2, Baileys, Redis mutex & debounce).
  3. **Dokumentasi Mendalam Menu Portal & Modul Sistem (`02 - Modul BKSDA SuperApp`)**:
     - **7 Layanan Mandiri Portal**: Surat Tugas & SPPD, Visum & SMART Patrol, Kalkulator Dinas (SBM Kaltim), Cuti Online (PerBKN 24/2017), Aset Saya, Pinjaman Aktif & Overdue, Profil Pegawai & Kartu ASN Digital, serta Helpdesk & Pengumuman.
     - **7 Modul Sistem**: Kepegawaian (`/kepegawaian`), Keuangan (`/keuangan`), BMN (`/bmn`), Persediaan (`/inventory`), DeReporting (`/dereporting`), CMS Portal (`/cms`), dan Persuratan (`/surat`).
  4. **Riwayat Progres & Changelog (`03 - Riwayat Progres dan Changelog`)**:
     - Rangkuman lengkap 18 inisiatif pengembangan yang telah terselesaikan.
     - Milestone khusus Hermes Agent VM 108 dan Redesain BMN & Portal.
  5. **Panduan Operasional & Standar Rekayasa (`04 - Panduan Operasional dan Setup`)**:
     - Panduan start server dev & prod (Port 3000, 8000, 8080).
     - Pemetaan port dan konfigurasi `.env`.
     - 7 tingkatan rekayasa *Ponytail* (Lazy Senior Dev) dan aturan UI/UX Pro Max (tanpa ikon AI).
  6. **Papan Tulis Kanvas Visual (`05 - Visual Canvas dan Graph`)**:
     - Berkas interaktif `BKSDA SuperApp Architecture.canvas` dengan diagram alur berwarna per layer sistem.
  7. **Wiki Komunitas & God Nodes (`06 - Wiki Codebase (Graphify)`)**:
     - 864 artikel Wikipedia-style Markdown dengan indeks induk `index.md` dan `GRAPH_REPORT.md`.
  8. **Graf Simpul Kode Penuh (`07 - Graph Node Codebase (Graphify)`)**:
     - 12.785 simpul kode AST dengan resolusi tautan dua arah (`[[...]]`) lengkap yang langsung terhubung di Obsidian Graph View (`Ctrl + G`).

---

### 20. Sinkronisasi Data Kendaraan & Visibilitas No Mesin/No Rangka BMN — Selesai ✅

- **Gejala Permasalahan**:
  - Pada halaman detail aset `https://bksdakaltim.web.id/bmn/assets/0a904007-4d04-4a70-a0c5-d7419e4a9f23` (Sepeda Motor Patroli), nomor mesin dan nomor rangka tidak ditampilkan, sedangkan pada peramban localhost data tersebut muncul.

- **Akar Masalah (Root Cause)**:
  1. **Disparitas Data Database Produksi**:
     - Pada database produksi (`bksdakaltim.web.id` / `192.168.100.203`), record aset tersebut masih berupa data lama per 17 Juni 2026 dengan `no_polisi = '-'`, `no_mesin = NULL`, dan `no_rangka = NULL`.
     - Pembaruan nomor polisi (`KT 5422 M`), nomor mesin (`KD11E1427846`), dan nomor rangka (`MH1KD1115PK428603`) sebelumnya tersimpan di basis data lokal (`localhost:5435`).
  2. **Kondisi Guard Frontend Terlalu Ketat**:
     - Di `frontend/src/app/bmn/assets/[id]/page.tsx` line 817, terdapat syarat: `currentData.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && !!currentData.no_polisi && currentData.no_polisi.trim() !== "-"`.
     - Karena nilai `no_polisi` di server produksi adalah `"-"`, maka baris input/tampilan No Mesin dan No Rangka otomatis disembunyikan oleh antarmuka, sehingga staf tidak dapat melihat maupun mengisinya saat mode edit aktif.

- **Solusi & Hasil Verifikasi**:
  1. **Sinkronisasi Langsung ke Database Produksi**:
     - Menjalankan kueri pembaruan data langsung pada container database produksi (`bksdasuperapp-bksdasuperapp-einhoc-db-1`):
       `no_polisi = 'KT 5422 M'`, `no_mesin = KD11E1427846`, `no_rangka = MH1KD1115PK428603`.
     - Verifikasi live response backend produksi via tinker:
       `{"id":"0a904007-4d04-4a70-a0c5-d7419e4a9f23","nama_barang":"Sepeda Motor Patroli","no_polisi":"KT 5422 M","no_mesin":"KD11E1427846","no_rangka":"MH1KD1115PK428603"}` (**100% Cocok**).
  2. **Penyederhanaan Guard Tampilan Frontend**:
     - Mengubah kondisi menjadi `currentData.jenis_bmn === "ALAT ANGKUTAN BERMOTOR"` murni, sehingga nomor mesin dan nomor rangka selalu dapat dilihat dan disunting untuk seluruh armada kendaraan operasional BMN.
  3. **Verifikasi Frontend**:
     - TypeScript Next.js: `npx tsc --noEmit` **0 Errors (100% Pass)**.





---

### 21. Auto-Kapitalisasi Kalimat Tugas Resmi & Pratinjau Diktum Surat Tugas Sesuai Tata Naskah Dinas KSDAE — Selesai ✅

- **Kebutuhan Pengguna**:
  - Pada formulir publik Surat Tugas (`http://localhost:3000/surat-tugas`), kotak **Pratinjau Kalimat Tugas Resmi** harus secara otomatis memformat huruf depan setiap kata penting menjadi kapital (Title Case resmi) sesuai kaidah tata naskah dinas.
  - Contoh kasus: Kalimat mentah pengguna berupa:
    `Melaksanakan Perjalanan Dinas dari Samarinda ke kabupaten kutai barat dalam rangka inventarisasi bmn di suaka badak kelian;`
    Harus otomatis diformat menjadi:
    `Melaksanakan Perjalanan Dinas dari Samarinda ke Kabupaten Kutai Barat dalam rangka Inventarisasi BMN di Suaka Badak Kelian;`

- **Implementasi Tingkat Akar (*Ponytail Principle: Single Source of Truth*)**:
  1. **Fungsi Bersama `capitalizeOfficialText(text)` (`frontend/src/app/kepegawaian/surat-tugas/_lib/activity-helpers.ts`)**:
     - Mengubah huruf depan setiap kata penting menjadi huruf kapital (Title Case), dan menormalkan input yang ditulis dengan Caps Lock/UPPERCASE penuh.
     - Otomatis mengubah singkatan/akronim kedinasan dan kehutanan menjadi huruf kapital penuh (`BMN`, `SKW`, `TSL`, `TWR`, `KPG`, `SPPD`, `GPS`, `BKSDA`, `KSDAE`, `KLHK`, `UPT`, `PEH`, `ASN`, `PNS`, `PPNPN`, `PPPK`, `ATK`, `DIPA`, `SBM`, `SIMAN`, `SPD`, `SP2D`, `WRU`, `SMART`, `TN`, `TWA`, `SM`, `CA`, `SATS-DN`, `SATS-LN`, `KPA`, `PPK`, `BPP`, `BPK`, `BKN`, `SDM`, `TU`, `KPH`, `KPHP`, `KPHL`, `BPKH`, `KAK`, `TOR`, `PNBP`, `SK`, `SOP`, `MOU`, `PKS`, `TIK`, `IT`, `BPJS`, `SIMPEG`, `SIASN`, dan angka Romawi `I` s.d. `XX`).
     - Mempertahankan kata hubung/preposisi tetap huruf kecil saat berada di tengah frasa (`dan`, `atau`, `serta`, `dengan`, `di`, `ke`, `dari`, `pada`, `dalam`, `rangka`, `untuk`, `tentang`, `oleh`, `sebagai`, `yang`, `terhadap`, `hingga`, `sampai`, `antar`, `secara`, `terkait`).
     - Mendukung format teks miring markdown (`*bekantan*` $\rightarrow$ `*Bekantan*`).
  2. **Penyempurnaan `buildKegiatanDiktumText(...)`**:
     - Seluruh komponen dinamis (`capAsal`, `capTujuan`, `capKota`, `capTempat`, `capNama`, `capUntuk`) otomatis diformat melalui `capitalizeOfficialText`.
     - *Smart Raw Sentence Parser*: Jika pengguna menyalin-tempel kalimat utuh penugasan (misal: `Melaksanakan Perjalanan Dinas dari Samarinda ke kabupaten kutai barat dalam rangka inventarisasi bmn di suaka badak kelian;`) langsung ke kolom kegiatan, sistem cerdas memilah asal (`Samarinda`), tujuan (`Kabupaten Kutai Barat`), kegiatan (`Inventarisasi BMN`), dan tempat spesifik (`Suaka Badak Kelian`) tanpa menghasilkan teks dobel atau `ke ...`.
  3. **Integrasi Reaktif & On-Blur (`frontend/src/app/surat-tugas/_components/SuratTugasDetailStep.tsx`)**:
     - Kotak biru **Pratinjau Kalimat Tugas Resmi** secara reaktif dan instan merefleksikan huruf depan kapital saat pengguna mengetik.
     - Event `onBlur` dipasang pada 15 kolom input formulir (`kotaAsal`, `kotaTujuan`, `namaKegiatanText`, `tempatSpesifik`, `untukKegiatanText`), sehingga saat pengguna berpindah kolom, nilai di dalam kolom input otomatis rapi bertata naskah dinas.
  4. **Suite Pengujian Otomatis (`frontend/tests/diktum-capitalization-check.cjs`)**:
     - 5/5 invariant assertion lulus (100% PASS): verifikasi title case, akronim BMN/SKW/KPHP, huruf kecil preposisi, teks miring markdown, serta pemformatan diktum baik dari kolom terpisah maupun kalimat mentah utuh.
  5. **Verifikasi Kompilasi & Graphify**:
     - `npx tsc --noEmit` di `frontend`: **0 Error (100% Pass)**.
     - `graphify update .`: 11.948 nodes, 21.852 edges, 853 communities ter-update.

---

### 22. Modernisasi Katalog Tata Naskah Dinas Favorit & Template Nota Dinas Resmi Ber-KOP Alamat — Selesai ✅

- **Kebutuhan Pengguna**:
  - Pada halaman `http://localhost:3000/surat/keluar/dinas`:
    1. Pada Katalog Tata Naskah Dinas Resmi (`TemplatePickerModal.tsx`), berikan penanda **favorit** pada **Surat Dinas**, **Nota Dinas**, dan **Memorandum**.
    2. Format dan tata letak **Nota Dinas** diubah sesuai naskah dinas resmi Permen Kehutanan No. 1/2025:
       - Menggunakan KOP Balai resmi ber-alamat lengkap (`kop-bksda-alamat.png`).
       - Judul naskah `NOTA DINAS` dan format nomor `Nomor: ND...`.
       - Format Yth tersusun rapi multi-line di bawah titik dua (`:`).
       - Default naskah menggunakan data dinas Surat Edaran KARIS/KARSU MyASN BKN ke 3 Kepala SKW dengan 4 poin kegiatan.
       - Tanda tangan TTE/QR Code langsung di atas nama dan NIP Kepala Balai tanpa baris jabatan duplikat di atasnya (karena jabatan "Dari: Kepala Balai KSDA Kalimantan Timur" sudah ada di kepala nota dinas).
    3. Pada batang tubuh naskah dinas, sediakan tombol **Tambah Poin** di samping tombol **Tambah Paragraf** untuk menyisipkan butir kegiatan bernomor (`1. `, `2. `, `3. `, dst.) dengan hanging indent rapi (`poin-item`).

- **Implementasi (Ponytail Principle: Minimal, Native, Robust)**:
  1. **Aset KOP Resmi (`frontend/public/kop-bksda-alamat.png`)**:
     - Menyediakan citra KOP Balai resmi beresolusi tinggi dengan alamat lengkap kantor Samarinda dan Call Center di direktori publik agar dapat dimuat baik pada live preview Next.js maupun jendela cetak fisik (`window.print()`).
  2. **Katalog Template Favorit (`frontend/src/app/surat/_components/TemplatePickerModal.tsx`)**:
     - Menambahkan tab kategori `⭐ Favorit (3)` dan filter berbasis atribut `isFavorite: true` untuk Surat Dinas, Nota Dinas, dan Memorandum.
     - Menyematkan badge bintang emas `⭐ Favorit` pada kartu naskah.
     - Urutan cerdas pada tab `Semua`: memprioritaskan template favorit berada di urutan teratas.
  3. **Dokumen & KOP Nota Dinas (`frontend/src/app/surat/_components/SuratDinasDocument.tsx`)**:
     - Mengubah sumber KOP `nota_dinas` ke `/kop-bksda-alamat.png`.
     - Styling hanging indent `.pkpknl-body p.poin-item` (`text-indent: -1.5rem !important; padding-left: 1.5rem !important; text-align: justify;`) untuk tampilan cetak A4 dan editor.
     - Memperbarui `getDefaultDataForTemplate("nota_dinas")` dengan nomor edaran `ND.246/K.18/TU/PEG.09.01/B/05/2026`, perihal KARIS/KARSU virtual, penerima 3 Seksi KSDA Wilayah, dan 4 poin edaran.
  4. **Editor Naskah Dinas (`frontend/src/app/surat/keluar/dinas/page.tsx`)**:
     - Menambahkan tombol `[+ Tambah Poin]` dengan ikon list bernomor di samping `[+ Tambah Paragraf]`.
     - Logika `handleAddPoint`: mendeteksi penomoran terakhir dan menyisipkan butir baru tepat sebelum paragraf penutup.
     - Badge cerdas pada kartu textarea: mendeteksi format butir dan memberi penanda `Poin X (Poin Bernomor)` berlatar indigo.
  5. **Verifikasi & Runnable Checks**:
     - Runnable test suite `frontend/tests/nota-dinas-template-check.cjs`: **100% PASS**.
     - TypeScript compiler `npx tsc --noEmit`: **0 Errors**.
     - Graphify AST knowledge graph: `graphify update .` **11.974 nodes, 21.879 edges**.

---

### 23. Pengelolaan Sub-Poin Bertingkat (Hierarki 4 Level), Smart Text Parser & Fitur Button Yth Nota Dinas/Memorandum — Selesai ✅

- **Kebutuhan Pengguna**:
  - Pada halaman `http://localhost:3000/surat/keluar/dinas`:
    1. Penerima **Yth.** dapat ditambah menggunakan button (tombol), dengan pilihan cepat pejabat/unit internal (SKW I Berau, SKW II Tenggarong, SKW III Balikpapan, Kasubag TU, Kepala Balai) tanpa harus mengetik manual.
    2. Mendukung naskah dinas dengan **sub-poin bertingkat kompleks** sesuai spesimen resmi Surat Edaran Manajemen Talenta Simata BKN (Keputusan Kepala BKN No. 411/2025):
       - **Level 1 (Angka Utama)**: `1. `, `2. `, `3. `, dst.
       - **Level 2 (Sub-Poin Huruf)**: `a. `, `b. `, `c. `, dst.
       - **Level 3 (Sub-Sub Poin Romawi / Kurung)**: `i. `, `ii. `, `iii. ` atau `1) `, `2) `, `3) `
       - **Level 4 (Sub-Butir Kurung)**: `a) `, `b) `, `c) `
       - Setiap tingkat memiliki indentasi bertingkat resmi (*stepped hanging indent*) yang proporsional dan rata kiri-kanan (*justified*).
    3. Fitur **Tempel Teks Utuh (Smart Text Parser)** yang memungkinkan staf menyalin teks naskah dinas lengkap (termasuk pembuka, 31 butir poin bersarang, dan penutup) lalu memecahnya secara otomatis menjadi array terstruktur dengan satu klik.
    4. Catatan kaki (*footnote*) resmi sertifikasi TTE elektronik: "Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN)".

- **Implementasi Tingkat Teknis**:
  1. **Manajemen Yth Berbasis Tombol & Pilihan Cepat (`dinas/page.tsx`, `SuratDinasDocument.tsx`)**:
     - Fungsi `parseYthList` & `formatYthList`: jika 1 penerima diformat tanpa nomor (`Kepala Balai ...`), jika 2+ penerima otomatis diberi penomoran berurutan (`1. ...\n2. ...`).
     - Tombol `[+ Tambah Penerima]` dan chip pill pilihan cepat (`+ SKW I Berau`, `+ SKW II Tenggarong`, `+ SKW III Balikpapan`, `+ Kasubag TU`, `+ Kepala Balai`).
     - Setiap baris penerima memiliki input mandiri dan tombol hapus (`Trash2`).
  2. **Deteksi Hierarki 4 Level & Styling CSS (`SuratDinasDocument.tsx`)**:
     - Fungsi `detectPointLevel(text)`: mengklasifikasikan teks ke dalam Level 0 (paragraf biasa), Level 1 (`1. `), Level 2 (`a. `), Level 3 (`i. ` / `1) `), dan Level 4 (`a) `).
     - Aturan CSS naskah dinas:
       - `.poin-level-1`: `padding-left: 1.5rem; text-indent: -1.5rem;`
       - `.poin-level-2`: `padding-left: 3.25rem; text-indent: -1.5rem;`
       - `.poin-level-3`: `padding-left: 5rem; text-indent: -1.5rem;`
       - `.poin-level-4`: `padding-left: 6.75rem; text-indent: -1.5rem;`
     - Catatan kaki `.pkpknl-footer-bsre` di bagian bawah naskah.
  3. **Smart Parser Teks Mentah (`parseRawDocumentText`)**:
     - Menggabungkan baris terpotong ke butir sebelumnya dan memisahkan setiap nomor/huruf/butir baru secara akurat.
     - Drawer **[📋 Tempel Teks Utuh]** di antarmuka editor dilengkapi tombol **Muat Contoh Simata BKN (31 Butir)** untuk demonstrasi instan.
  4. **Peralihan Level Interaktif pada Editor (`dinas/page.tsx`)**:
     - Tombol cepat pada header: `[+ Paragraf]`, `[+ Poin 1.]`, `[+ Sub a.]`, `[+ Butir i.]`, `[+ Butir 1)]`.
     - Badge warna level pada setiap kartu paragraf dengan visual margin indentasi yang merefleksikan kedalaman poin.
     - Tombol konversi level instan (`1.`, `a.`, `i.`, `1)`, `Teks`) pada setiap kartu paragraf tanpa perlu mengetik ulang prefix.
  5. **Verifikasi Kualitas**:
     - Test suite `frontend/tests/nota-dinas-template-check.cjs`: **100% PASS** (pengujian helper Yth, 4 level hierarki, ekstraksi 31 butir Simata BKN, dan catatan kaki BSrE BSSN).
     - TypeScript compile check: `npx tsc --noEmit` $\rightarrow$ **0 Errors**.

---

### 24. Ekspor Word/PDF Presisi Tinggi, Smart Pagination, dan Siklus Hidup Nomor Naskah (${nomor_naskah}) Tata Naskah Dinas — Selesai ✅

- **Kebutuhan Pengguna**:
  - Pada generator naskah dinas (`http://localhost:3000/surat/keluar/dinas`):
    1. **Ekspor Microsoft Word (.doc) Editable & Presisi Cetak**:
       - KOP naskah pada hasil Word memiliki penataan simetris (sisi kiri sedikit lebih menjorok ke kiri dari teks naskah, dan sisi kanan sejajar dengan tepi teks naskah kanan, sesuai konfigurasi Surat Tugas).
       - Judul naskah (*NOTA DINAS* / *MEMORANDUM*) dan Nomor berada tepat di tengah dengan spasi yang lega dari KOP.
       - Nomor surat diletakkan lebih dekat dengan judul naskah.
       - Baris *Perihal* tidak di-bold pada Word sesuai kaidah naskah resmi.
       - Tembusan ditempatkan di bawah blok tanda tangan pimpinan pada sisi kiri.
       - Spasi Yth (1, 2, 3) dan jarak dari tanggal ke paragraf pertama serta paragraf penutup diberi jeda lega (*spacing*) yang proporsional tanpa *stretched justification*.
    2. **Ekspor PDF Fisik Presisi A4 & Smart Pagination**:
       - Clearance KOP pada pratinjau web, cetak fisik (@media print), dan unduhan PDF diseragamkan tepat 2.5mm dari tepi kertas atas (tidak terpotong dan tidak turun terlalu jauh).
       - *Smart Pagination*: Pada dokumen multi-halaman (>1 halaman), paragraf terakhir/penutup, tanda tangan, dan tembusan tetap menjadi satu kesatuan (*keep-together*) pindah bersama ke halaman berikutnya, dan halaman 1 memiliki sisa margin bawah yang bersih (~60mm).
       - Pada naskah 1 halaman, dicegah agar tidak memicu halaman ke-2 kosong (*zero orphan page*).
    3. **Penyelarasan Spasi Poin Bertingkat**:
       - Spasi antar poin utama (`1.`), sub-poin (`a.`), butir romawi (`i.`), dan butir kurung (`1)`) dibuat rapat dan dekat sesuai acuan spesimen fisik resmi.
    4. **Siklus Hidup Nomor Naskah Fleksibel (${nomor_naskah})**:
       - Pada Card 1 (Identitas & Meta Dokumen), disediakan toggle switcher antara **Pola Nomor Baku** (format resmi Balai) dan **Nomor Naskah (${nomor_naskah})**.
       - Posisi label `NOMOR :` / `Nomor: ` pada pratinjau, Word, PDF, dan cetak tetap terkunci pada koordinat yang sama tanpa bergeser saat diganti dengan ${nomor_naskah}.
       - Naskah dapat disimpan sebagai Draf, diekspor ke Word/PDF, atau dicetak untuk diajukan ke pimpinan / sistem luar untuk proses verifikasi/ACC.
       - Di Daftar Surat Keluar (`/surat/keluar`), naskah dengan ${nomor_naskah} ditandai dengan badge khusus amber **`Perlu Nomor Definitif`**.
       - Setelah naskah di-ACC dan memiliki nomor resmi, operator cukup membuka kembali (klik Edit) untuk memasukkan nomor definitif dan mendaftarkannya ke Agenda Resmi.

- **Implementasi Tingkat Teknis (Ponytail Principle: Minimal, Native, Robust)**:
  1. **Helper Ekspor Cerdas (`frontend/src/app/surat/_lib/export-surat-dinas.ts`)**:
     - `exportSuratDinasWord(nomor, templateType, perihal)`: Membangun dokumen Word berbasis MHTML table layout yang 100% kompatibel dengan MS Word. Mengonversi gambar KOP menjadi inline base64, merender baris Yth multi-baris tanpa forced justification, menata KOP dengan offset simetris (lebar 189.4mm, posisi 11.0mm dari tepi), menyematkan spacer pemisah sebelum batang tubuh, dan menyusun tembusan tepat di bawah tanda tangan.
     - `exportSuratDinasPdf(nomor, templateType, perihal)`: Mengintegrasikan `jspdf` dan `html2canvas-pro` dengan algoritma *smart pagination*. Mengukur koordinat elemen `.penutup-ttd-group`; jika melebihi batas aman halaman 1 (270mm), seluruh grup penutup, tanda tangan, dan tembusan digeser bersama ke halaman 2 dengan margin atas 22mm.
  2. **Clearance KOP & Layout Seragam (`SuratDinasDocument.tsx`)**:
     - `SURAT_DINAS_BASE_CSS` dan `@media print`: Clearance KOP diatur tepat `2.5mm auto 4mm auto !important` dan padding atas root diatur `0`, menjamin konsistensi 1:1 antara tampilan live preview layar, jendela dialog Cetak browser, dan berkas fisik PDF.
  3. **Penataan Butir Bertingkat Rapat**:
     - `poin-marker` memiliki lebar 1.35rem, `poin-level-2` memiliki margin kiri 1.35rem dan jarak bawah 0.15rem, menghasilkan perataan vertikal yang rapat dan rapi persis seperti spesimen naskah dinas resmi.
     - Di `export-surat-dinas.ts`, tabel 2 kolom list diatur dengan cell padding bawah 2pt untuk sub-butir.
  4. **Penguncian Posisi Label `NOMOR :` (`.nota-dinas-nomor-wrapper`)**:
     - Membungkus label `NOMOR : ` / `Nomor: ` dan nomor naskah ke dalam elemen ber-anchor tetap (`display: inline-block; min-width: 78mm; text-align: left;`).
     - Mengeliminasi pergeseran teks horizontal saat berganti antara nomor panjang (`M.015/K.18/TU/KSA.01.05/B/11/2026`) dan nomor pendek (`${nomor_naskah}`).
  5. **Antarmuka Form & Daftar Surat Keluar (`dinas/page.tsx` & `keluar/page.tsx`)**:
     - Card 1 formulir menyematkan tombol tab toggle: `[ Pola Nomor Baku ]` dan `[ Nomor Naskah (${nomor_naskah}) ]`.
     - Tabel Surat Keluar menampilkan penanda visual badge amber `Perlu Nomor Definitif` jika nomor surat memuat `${nomor_naskah}`.
  6. **Verifikasi Kualitas**:
     - Test suite ekspor naskah dinas `frontend/tests/test-export-transform.cjs`: **100% PASS** (8 invariant checks mencakup Yth multi-line, perihal non-bold, posisi tembusan di bawah TTD, threshold single page 305mm, geometri KOP 189.4mm, spasi poin rapat 4pt, smart pagination multi-halaman, dan clearance KOP 2.5mm).
     - Test suite template naskah dinas `frontend/tests/nota-dinas-template-check.cjs`: **100% PASS** (20 invariant checks).
     - Kompilasi TypeScript `npx tsc --noEmit`: **0 Errors**.

### 25. Modul Kepegawaian - Fitur Pratinjau Dokumen Dasar di Surat Tugas Builder (5 November 2026)
- **Konteks & Kebutuhan Pengguna**:
  - Pada pengajuan Surat Tugas Publik (`/surat-tugas`), pegawai melampirkan berkas fisik acuan tugas (surat undangan, nota dinas rujukan, disposisi, dsb.) dalam format PDF atau gambar (JPG/PNG).
  - Operator/Admin di halaman **Surat Tugas Builder** (`/kepegawaian/surat-tugas/builder/[id]`) membutuhkan akses visual cepat untuk melihat berkas dasar penugasan tersebut tanpa harus berpindah halaman atau membuka tab unduhan terpisah, guna membaca dan menyalin (*copy*) perihal, nomor surat rujukan, tanggal, dan maksud penugasan langsung ke kolom form builder.
- **Solusi & Fitur yang Diimplementasikan**:
  1. **Tombol Pemicu Terintegrasi (*Integrated Trigger Buttons*)**:
     - *Sticky Top Preview Toolbar*: Ditambahkan tombol `Dasar Surat` dengan ikon klip berkas dan indikator hijau aktif (`animate-pulse`) saat permohonan memiliki berkas lampiran.
     - *Seksi Dasar Hukum & Anggaran*: Ditambahkan tombol kontekstual `Lihat Dokumen Dasar` tepat di atas daftar butir dasar hukum, memungkinkan operator langsung membuka berkas saat menyusun konsideran rujukan.
  2. **Panel Samping Dokumen Dasar Non-Blocking (`DokumenDasarDrawer.tsx`)**:
     - Panel meluncur dari sisi kanan layar (`fixed top-14 right-0 bottom-0 z-30`) dengan lebar lega (`w-[640px] xl:w-[750px] 2xl:w-[850px]`) dan batas aman `max-w-[calc(100vw-32rem)]`.
     - **Non-blocking & Zero Overlay**: Tidak ada backdrop gelap yang menutupi formulir, sehingga formulir *ST Builder Premium* di sebelah kiri tetap **100% terbuka, aktif, dan dapat diketik/diisi langsung**.
     - **Header Natural & Elegan**: Latar putih bersih (`bg-white dark:bg-zinc-900`) dengan tipografi standar sans-serif, badge netral abu-abu, tombol outline yang konsisten dengan desain BKSDA SuperApp, serta tombol `Tab Baru` dan `Unduh`.
  3. **Optimasi Native PDF Engine (*Fit Width & No Thumbnails*)**:
     - URL berkas PDF dilengkapi parameter engine PDFium: `#navpanes=0&view=FitH&pagemode=none`.
     - Bilah *thumbnail* halaman samping (ukuran kecil) otomatis disembunyikan.
     - Halaman naskah otomatis diskalakan penuh pas selebar panel (*Fit to Width* / ~100% zoom fisik), menghasilkan teks tajam dan nyaman dibaca langsung tanpa perlu zoom manual.
     - Menggunakan endpoint streaming JSON/Base64 (`/surat-tugas/${id}/download?preview=1`) untuk menghindari double download dan mencegah gangguan download manager eksternal (IDM).
  4. **Pembersihan Kartu Teks Redundan**:
     - Menghapus kartu ringkasan teks permohonan di atas viewer sesuai instruksi pengguna, sehingga 100% tinggi panel didedikasikan untuk pratinjau dokumen asli beresolusi penuh.


---

## Status Update: 8 November 2026

### 26. Audit Keamanan Menyeluruh (`/security-audit`) & Simplifikasi Kode (`/ponytail-review`) Modul Portal Pegawai — Selesai ✅

> Penutupan terkini dan batas verifikasinya dicatat pada bagian36 serta laporan8November2026; bagian ini mencatat pekerjaan pada snapshot sebelumnya.

- **Latar Belakang & Tujuan**:
  - Melakukan audit keamanan defensif menyeluruh (`/security-audit`) dan perampingan kompleksitas/duplikasi kode (`/ponytail-review`) pada seluruh halaman, komponen, serta controller backend pendukung **Modul Portal Pegawai (`/portal`)**.

- **Temuan Keamanan (`/security-audit`) & Remediasi Langsung**:
  1. **Single Source of Truth Kepemilikan Aset BMN (`Employee::resolveIdByName` & `Asset::isOwnedByEmployee`)**:
     - Menghubungkan kolom teks hasil impor Excel BMN (`pengguna` dan `nama_pengguna`) langsung ke daftar pegawai resmi di Modul Kepegawaian (`kpg_employees`) melalui `Employee::resolveIdByName()` dan hook `Asset::saving`, serta mencegah kebocoran pencocokan nama parsial di `Asset::isOwnedByEmployee()`.
  2. **Proteksi RBAC Konfigurasi Email Admin & Batas Brute-Force 2FA (`AuthController` & `routes/api.php`)**:
     - Memasang middleware `role:super_admin` pada rute `/api/admin/email/*` dan membatasi percobaan `challenge_token` pada `login2Fa()` maksimal 5 kali percobaan sebelum token hangus otomatis.
  3. **Pembatasan Foto Dokumen Rahasia (STNK/BPKB) untuk Peminjam Aktif & Allowlist MIME Inline**:
     - Membatasi akses foto bagi peminjam aset aktif di `CheckModuleAccess` dan `CheckPermission` hanya pada sudut pandang fisik (`depan`, `belakang`, `kiri`, `kanan`, `lokasi`, `geotag`), menutup akses ke foto dokumen `stnk`/`bpkb`, serta memvalidasi masa berlaku token Sanctum dan status aktif akun pada query `?token=...`.
     - Menerapkan allowlist MIME ketat (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`) pada streaming inline di `AssetPhotoController`, `AssetDocumentController`, dan `AssignmentLetterController`.
  4. **Penutupan Celah BOLA/IDOR pada BKSDA Drive (`DriveController` & `DriveShareController`)**:
     - Menegakkan otorisasi tulis (`DriveAccess::canWriteFolder` / `canWriteFile`) pada operasi `toggleStar()`, `restore()`, dan `forceDelete()` melalui helper terpusat `resolveWritableItem()`.
     - Mengganti password statis pembuatan akun manajer resor dengan `Str::random(64)` + `is_active = false` + `must_change_password = true`.
     - Memuat relasi `file` dengan `withTrashed()` pada `DriveShareController::deleteShare()` agar pencabutan share pada berkas di tempat sampah tidak memicu HTTP 500 `TypeError` dan tetap terproteksi HTTP 403 bagi non-pemilik.
  5. **Validasi Hari Kerja Cuti Tahunan & Sinkronisasi Profil Kontak (`EmployeeLeaveRequestController` & `AuthController`)**:
     - Menolak permohonan cuti tahunan yang hanya mencakup hari akhir pekan/libur (`$jumlahHari < 1`) agar tidak mengurangi atau memanipulasi kuota 0 hari.
     - Memperbaiki penyimpanan nomor telepon di `AuthController::updateProfile()` ke kolom `telepon` dengan accessor/mutator `no_telepon` di model `Employee`, serta mendukung pengosongan alamat email pegawai.
     - Menghentikan pembuatan notifikasi portal (`PortalNotificationService::notifyEmployee`) untuk akun pengguna yang sudah dinonaktifkan (`! $user->is_active`).
  6. **Hardening Sisi Klien Portal (`MyAssetsTab`, `PortalProfileSidebar`, `KalkulatorDinasTab`, `GeneralReportInlineForm`, `SmartPatrolInlineForm`, `print-st.ts`)**:
     - Memperketat `resolvePhotoUrl()` di `MyAssetsTab.tsx` agar hanya mengizinkan skema `http://`, `https://`, atau path relatif `/` (menolak `javascript:`, `data:`, dan `//`).
     - Membatasi upload gambar di seluruh form Portal (Foto Profil, Nota Kalkulator Dinas, Cover & Dokumentasi Laporan Umum/Smart Patrol) hanya pada MIME raster `["image/jpeg", "image/png", "image/webp"]` (menolak `image/svg+xml`).
     - Menambahkan sanitasi karakter HTML (`[<>&"']`) pada `<title>` jendela cetak Surat Tugas (`print-st.ts`).

- **Simplifikasi Kode (`/ponytail-review`)**:
  - **Refaktor `VisumSpdController.php`**: Mengganti 7 array template default yang disalin berulang (289 baris) dan kueri N+1 `exists()` menjadi satu builder `buildDefaultTemplate()` (**-183 baris**).
  - **Deduplikasi `EmployeeLeaveRequestController.php`**: Menyatukan kalkulasi hari cuti, penyimpanan berkas scan, dan streaming berkas scan ke 4 helper bersama (`calculateLeaveDays`, `storeLeaveScanFiles`, `respondLeaveScan`, `findMyLeaveRequest`).
  - **Deduplikasi Komponen Frontend Portal**: Menyatukan kartu metrik di `PortalQuickStats.tsx`, helper `isLoanOverdue()` di `ActiveLoansTab.tsx`, pemformatan `merkDisplay` di `MyAssetsTab.tsx`, dan kalkulasi 1-pass `totalPengeluaran`/`totalSpj`/`totalNonSpj` di `KalkulatorDinasTab.tsx`.

- **Verifikasi Kualitas**:
  - `php backend/tests/portal_security_check.php`: **PASS (200+ security invariants)**.
  - `PortalPersonalSecurityTest.php`: **34 tests, 90 assertions PASS (100% Hijau)**.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.

### 27. Review Terfokus Portal: Kepemilikan Aset Ambigu, Challenge 2FA setelah Reset Kredensial, dan Simplifikasi Draf (8 November 2026)

- **Bukti sebelum perbaikan**: 5 dari 6 skenario regresi baru gagal pada source `b677713b` (ditambah tes baru): pembacaan BPKB nama ganda/kolom pemilik bertentangan mendapat HTTP 200; impor nama dasar ambigu memilih pegawai pertama; challenge 2FA lama tetap menerbitkan token setelah reset password atau penggantian authenticator. Kontrol positif pemilik dengan `employee_id` eksplisit sudah lulus.
- **Perbaikan kepemilikan aset**: `Employee::resolveIdByName()` sekarang memerlukan satu identitas unik di seluruh kolom nama yang cocok. Nama dasar yang dimiliki beberapa pegawai dan kolom yang menunjuk pegawai berbeda menghasilkan `null`. `Asset::isOwnedByEmployee()` memakai resolver tersebut tanpa fallback pencocokan nama kedua. `employee_id` eksplisit tetap menjadi acuan utama. Aset legacy ambigu tanpa ID perlu ditetapkan pemiliknya oleh admin; relasi historis eksplisit dan data operasional tidak diubah massal.
- **Perbaikan challenge 2FA**: challenge diikat pada fingerprint hash password dan secret authenticator saat faktor pertama berhasil. Penyelesaian challenge menolak perubahan kredensial atau 2FA yang sudah dinonaktifkan sebelum recovery code dikonsumsi/token diterbitkan. Challenge dari versi lama tanpa fingerprint meminta login ulang.
- **Ponytail**: kalkulator dinas memuat satu snapshot draf untuk tujuh field; helper pembaca draf yang hanya memiliki satu caller di-inline. Fallback otorisasi nama yang berulang di model aset dihapus. Total kode implementasi empat file berkurang **22 baris**, di luar penambahan tes/dokumentasi.
- **Verifikasi lokal terisolasi**:
  - Regresi baru: **6 tes, 27 assertions lulus** setelah perbaikan.
  - Regresi portal personal/auth, 2FA, email, broadcast, Surat Tugas dan Drive: **100 tes, 521 assertions lulus**.
  - `frontend/tests/portal-review-check.cjs`: lulus; satu pembacaan storage, tujuh field tersimpan dipulihkan, fallback data kosong/rusak, dan SSR tanpa storage.
  - TypeScript seluruh source frontend (`tsc --noEmit --incremental false`) dan ESLint komponen kalkulator (`--max-warnings=0`): **lulus, 0 error/warning**. Dependensi memakai image lokal dengan overlay read-only dua paket ekspor dokumen yang sudah terpasang; tidak mengunduh paket.
  - Semua kode target dijalankan dalam container `--network none`, source/toolchain read-only, environment allowlist, SQLite dummy, scratch tmpfs 128 MiB, CPU 1, RAM maksimum 1536 MiB, pids 64, serta batas waktu/file. Tidak memakai database atau identitas operasional.
- **Cakupan**: review terfokus source dan regresi portal; bukan penutupan audit seluruh aplikasi atau verifikasi deployment. Perubahan belum di-commit/push/deploy oleh sesi ini.

### 28. Review Lanjutan Portal: Batas Modul pada Ringkasan Persetujuan dan Simplifikasi Middleware (8 November 2026)

- **Temuan tambahan terkonfirmasi — pengungkapan metadata terbatas**: `GET /api/mobile/dashboard` sebelumnya menghitung semua Surat Tugas pending untuk setiap admin, termasuk admin Inventory tanpa akses Surat Tugas/Kepegawaian. Permission `surat_tugas.approve` yang masih tersimpan juga cukup walau akses modul tidak ada. Tes dummy sebelum perbaikan mendapat jumlah `1` untuk admin modul lain, padahal hasil yang diharapkan `0`.
- **Perbaikan**: ringkasan global kini mensyaratkan super admin, atau akses Surat Tugas/Kepegawaian beserta role admin/permission approve. Predicate mengikuti batas modul yang digunakan persetujuan Surat Tugas. Tes mencakup tujuh kombinasi role/module/permission dengan kontrol positif untuk pihak yang berwenang.
- **Ponytail**:
  - `CheckModuleAccess.php`: loop pencarian irisan modul dan flag sementara diganti native `array_intersect`.
  - `CheckModuleAccess.php` dan `CheckPermission.php`: wrapper `isAssetOwner` yang hanya meneruskan satu panggilan dihapus; kedua jalur langsung memakai `Asset::isOwnedByEmployee` setelah model dipastikan tersedia. Pengecualian hanya untuk GET serta pembatasan foto peminjam tetap diterapkan.
  - Net kode implementasi pada pemeriksaan lanjutan: **-25 baris**, di luar tes/dokumentasi dan perubahan sesi sebelumnya.
- **Verifikasi**: tiga tes tambahan **26 assertions lulus**; suite regresi terkait keseluruhan **103 tes, 547 assertions lulus** dalam sandbox Docker yang sama tanpa jaringan/data operasional. Tes tambahan membuktikan scoping notifikasi pada list/read/mark-all-read, serta penolakan mutasi aset/foto/dokumen oleh pemilik aset tanpa izin pengelolaan BMN.
- **Batas pemeriksaan**: review source terfokus; metadata jumlah merupakan dampak yang terbukti. QR 2FA lokal dan pemeriksaan hash password sesi Sanctum terkonfirmasi dari source; tidak dilaporkan sebagai celah baru. Tidak menjalankan ulang build/frontend karena tidak ada perubahan frontend pada pemeriksaan lanjutan. Perubahan tetap lokal, belum di-commit/push/deploy.

### 29. Review Lanjutan Portal: Pratinjau Dokumen dan Isolasi Cache/Sesi (8 November 2026)

- **Cakupan source**: profil kontak/foto portal, viewer dokumen cuti beserta seluruh caller, unduhan Surat Tugas personal, penyimpanan draf kalkulator, RouteGuard/useAuth, dan cache API/auth-store. Tidak ada celah keamanan tambahan yang terkonfirmasi dalam pemeriksaan terfokus ini; tidak menyatakan seluruh aplikasi atau seluruh perilaku browser telah diaudit.
- **Ponytail — `ScanViewerModal.tsx`**: dua state `dataUrl`/`blobUrl` selalu disetel bersamaan ke nilai identik. Diganti satu state `previewUrl` untuk tampilan PDF/gambar, unduhan dan buka tab baru. Fallback URL streaming dihapus karena tombolnya hanya tersedia saat kedua state lama sudah terisi dan cabang pertama selalu dijalankan. Cleanup object URL serta aturan MIME dan flag `noopener,noreferrer` dipertahankan. Komponen bersama ini dipakai tab cuti Portal, halaman cuti/detail pegawai, dan inbox Surat Tugas.
- **Dampak**: net **-13 baris kode implementasi** pada putaran ini; tidak mengubah kontrak API, tata letak, atau dependensi.
- **Verifikasi terisolasi tanpa jaringan**: `portal-review-check.cjs` lulus; `cache-security.cjs` **8/8 lulus** dengan source API/auth-store aktual dan adapter Axios dummy (pergantian identitas, logout, respons lama, deduplikasi, serta refresh profil); TypeScript seluruh source frontend dan ESLint viewer `--max-warnings=0` lulus. Pemeriksaan statis `git diff --check` bersih. Belum melakukan uji visual/interaksi viewer di browser pada putaran ini; tes cache tidak mengklaim kebijakan keamanan browser.
- **Status**: perubahan tetap lokal, belum di-commit/push/deploy. Perbaikan dan hasil pengujian dua putaran sebelumnya tetap tercatat di bagian 27–28.

### 30. Review Lanjutan Portal: Percobaan Salah Memperpanjang Masa Berlaku Challenge 2FA (8 November 2026)

- **Temuan terkonfirmasi dengan dampak terbatas**: `login2Fa()` sebelumnya menulis ulang seluruh challenge dengan TTL lima menit setiap kali kode salah. Satu kegagalan pada menit ke-4 membuat challenge yang seharusnya berakhir pada menit ke-5 masih dapat diselesaikan pada menit ke-6. Penyelesaian tetap memerlukan kode TOTP/recovery yang sah; batas waktu faktor pertama yang dilanggar merupakan dampak yang dibuktikan.
- **Bukti lokal sebelum perbaikan**: tes HTTP-kernel dengan akun dummy dan waktu Carbon mendapat HTTP 200 pada menit ke-6, ketika expected result adalah HTTP 422 untuk challenge kedaluwarsa. Kontrol batas lima kegagalan sudah lulus sebelum perbaikan.
- **Perbaikan/Ponytail native**: counter manual di payload challenge diganti `RateLimiter::hit()` Laravel pada key percobaan terpisah. Payload challenge tidak ditulis ulang sehingga TTL penerbitannya tetap. Percobaan dibatasi lima kali, counter dibersihkan setelah sukses atau pembatalan akibat batas percobaan, tanpa dependensi/helper baru.
- **Verifikasi**: dua regresi baru **37 assertions lulus**; keseluruhan suite terkait **105 tes, 584 assertions lulus** dalam sandbox Docker tanpa jaringan dengan data dummy. Tes membuktikan expiry, recovery code tidak terkonsumsi setelah expiry, penghentian challenge setelah lima kegagalan, serta keberhasilan login baru dan tokennya. Tidak menjalankan ulang frontend karena source frontend tidak berubah pada putaran ini.
- **Ukuran perubahan**: putaran ini menambah satu baris implementasi bersih; total delapan file implementasi sejak awal rangkaian review tetap berkurang **59 baris**, di luar tes dan dokumentasi.
- **Cakupan/status**: review terfokus siklus 2FA, bukan klaim audit menyeluruh atau validasi concurrency/deployment. Seluruh perubahan masih lokal, belum di-commit/push/deploy.

### 31. Review Lanjutan Portal: Pembacaan Saldo Menghapus Pemakaian Cuti Historis (8 November 2026)

- **Temuan terkonfirmasi**: `EmployeeLeaveController::show()` menulis ulang `cuti_terpakai_n0` dari jumlah permohonan online yang disetujui setiap kali saldo dibaca dan ada permohonan tahunan. Pemakaian historis/manual yang dicatat admin dapat hilang ketika pegawai biasa membuat permohonan pending lalu memanggil GET saldo.
- **Bukti sebelum perbaikan**: admin mencatat 8 hari terpakai dari jatah 12 hari; pegawai mengajukan 1 hari dan membaca saldo; pemakaian berubah menjadi 0. Pengajuan berikutnya 8 hari yang melebihi sisa kuota diterima HTTP 201, padahal seharusnya HTTP 422. Dua dari tiga regresi baru gagal sebelum perubahan; kontrol saldo belum tersimpan sudah lulus.
- **Perbaikan terkecil pada fungsi bersama**: hapus penulisan/sinkronisasi otomatis dari GET untuk saldo yang sudah tersimpan. Saldo tetap diperbarui melalui aksi admin/persetujuan yang berwenang. Agregasi riwayat disetujui hanya dipakai menyusun draft in-memory jika saldo belum ada. Perbaikan berlaku untuk `/api/me/leave-balance` dan `/api/kepegawaian/employees/{employee}/leaves` karena memakai fungsi yang sama.
- **Verifikasi**: tiga regresi baru **21 assertions lulus**; suite diperluas dengan `EmployeeLeaveTest` dan `EmployeeLeaveRequestTest`, total **116 tes, 634 assertions lulus** dalam sandbox Docker tanpa jaringan dan dengan data dummy. Kontrol mencakup pembacaan dua endpoint, pemakaian 8 menjadi 9 setelah persetujuan sah, penolakan pengajuan melebihi kuota, serta draft riwayat dua hari tanpa pembuatan record saldo.
- **Ponytail/dampak**: menghapus query dan penulisan redundan saat membaca saldo tersimpan; net **-9 baris implementasi** pada putaran ini, tanpa dependensi atau migrasi. Saldo operasional tidak diperiksa/direkonsiliasi massal; source frontend tidak berubah dan tidak diuji ulang pada putaran ini.
- **Cakupan/status**: source email pemulihan/perubahan profil dan alur cuti dibaca dalam review terfokus; temuan tambahan yang dibuktikan berada pada saldo cuti. Bukan klaim audit menyeluruh atau verifikasi produksi. Seluruh perubahan tetap lokal, belum di-commit/push/deploy.

### 32. Review Lanjutan Portal: Kredensial Terekam di Audit Log (8 November 2026)

- **Temuan terkonfirmasi pada sink logging bersama**: payload audit menyensor nama key token/password, tetapi URL memakai `fullUrl()` sehingga query bearer token tetap tersimpan dalam bentuk URL-encoded. Token tautan berbagi Drive di path juga terekam. Field `code` pada konfirmasi 2FA/login recovery disimpan tanpa sensor.
- **Bukti sebelum perbaikan**: empat skenario HTTP-kernel gagal pada ekspektasi redaksi. Token dummy yang diambil dan di-decode dari URL audit berhasil mengakses `/api/me` melalui klien bearer terpisah. Konfirmasi authenticator menyimpan kode TOTP; login recovery menyimpan `AUDITCODE1`; unduhan share yang sah dengan signer storage fake menyimpan capability token di path. Tidak menghubungi provider/storage nyata.
- **Perbaikan pada `AuditLogMiddleware`**: URL audit disimpan tanpa query karena parameter query sudah tersedia dalam payload yang disanitasi. Rute dengan parameter bernama sensitif memakai pola URI (`{token}`) sebagai URL audit. `code` disensor khusus pada dua endpoint autentikasi 2FA, sehingga field kode bisnis di endpoint lain tetap tercatat. Identitas actor, metode, status, aksi, serta metadata query non-rahasia tetap tersedia.
- **Ponytail**: hapus guard konversi payload non-array yang tidak dapat dicapai; input `Request::all()` berupa array dan cabang array sanitizer mengembalikan array. Tidak menambah helper atau dependency. Perubahan keamanan dan simplifikasi pada putaran ini net **+6 baris implementasi**.
- **Verifikasi**: empat skenario terfokus **33 assertions lulus**; keseluruhan regresi terkait **119 tes, 657 assertions lulus** dalam sandbox tanpa jaringan/data operasional. Tes memastikan redaksi query token, path capability, recovery/TOTP, serta pemeliharaan metadata non-rahasia dan kode bisnis. Source frontend tidak berubah dan tidak diuji ulang pada putaran ini.
- **Batas/status**: perbaikan berlaku untuk log baru; log historis dan kredensial operasional tidak diperiksa, dibersihkan, atau dicabut pada sesi ini. Review tetap terfokus, bukan audit menyeluruh atau verifikasi deployment. Semua perubahan masih lokal, belum di-commit/push/deploy.

### 33. Review Lanjutan Portal: Pencabutan Akses Foto dan Kedaluwarsa Token Berkas (8 November 2026)

- **Hasil keamanan**: tidak ada celah tambahan terkonfirmasi pada jalur yang diperiksa. Dua regresi baru menggunakan HTTP kernel dan file/akun dummy: peminjam aktif mendapat foto HTTP 200, setelah pengembalian view/download ditolak 403, dan pemilik tetap mendapat 200. Query token untuk BPKB pribadi ditolak 401 saat `expires_at` lewat maupun saat usia token melewati `sanctum.expiration`; akun nonaktif mendapat 403 dan token dicabut.
- **Ponytail — `EnsureAccountSecure::isAllowedRoute()`**: dua cabang `return true` dan fallback `return false` digabung menjadi satu ekspresi OR. Daftar rute dan pemeriksaan prefix tetap sama; penolakan akun nonaktif tetap berjalan sebelum pengecualian. Net **-8 baris implementasi** pada putaran ini.
- **Verifikasi**: dua regresi baru **12 assertions lulus**, lalu suite terkait **121 tes, 669 assertions lulus** dalam sandbox Docker tanpa jaringan dengan storage/database dummy. Source frontend tidak berubah dan tidak diuji ulang pada putaran ini.
- **Cakupan/status**: pemeriksaan terfokus akses berkas dan status kredensial, bukan audit menyeluruh atau uji deployment. Semua perubahan tetap lokal, belum di-commit/push/deploy. Tidak mengubah atau membersihkan data/log operasional.

### 34. Review Lanjutan Portal: Deduplikasi Perubahan Email dan Isolasi Data Pegawai (8 November 2026)

- **Hasil keamanan**: tidak ada celah tambahan terkonfirmasi pada alur yang diperiksa. Regresi baru menguji kedua pintu perubahan email (`PUT /api/me/email`, `POST /api/me/update-profile`) dengan credential HTTP nyata dan fixture dummy. Password salah ditolak tanpa mengganti email atau menghapus token reset yang masih sah. Penggantian sah menyinkronkan email user/pegawai, menghapus status verifikasi serta token reset lama, dan menolak tautan verifikasi untuk email lama. Penyisipan `user_id`/`employee_id` pihak lain tidak mengubah data atau token reset pihak tersebut.
- **Ponytail — `AuthController`**: kedua endpoint sebelumnya menyalin assignment/save email, sinkronisasi pegawai, cooldown dan pemanggilan notifikasi. Helper notifikasi yang sudah dipakai keduanya diperluas dan dinamai `updateAccountEmail(User, ?Employee, string)`, sehingga hanya ada satu implementasi proses penyimpanan tersebut. Validasi dan respons masing-masing endpoint dipertahankan; helper tetap private dan tidak menambah lookup pegawai/dependensi baru. Net **-16 baris implementasi** pada putaran ini.
- **Verifikasi**: regresi email baru **40 assertions lulus** sebelum dan sesudah refaktor; suite terkait **122 tes, 709 assertions lulus** dalam sandbox Docker tanpa jaringan dengan database dummy, fake mail dan fake notification. `git diff --check` bersih. Tidak melakukan uji provider email/produksi atau menguji ulang frontend yang tidak berubah.
- **Cakupan/status**: review terfokus, bukan penutupan audit seluruh aplikasi. Semua perubahan tetap lokal, belum di-commit/push/deploy; data operasional dan log historis tidak dimodifikasi.

### 35. Review Lanjutan Portal: Reset Kredensial dan Deduplikasi Autentikasi Permission (8 November 2026)

- **Hasil keamanan**: tidak ada celah tambahan terkonfirmasi pada jalur yang diuji. Regresi HTTP dengan akun dummy membuktikan sesi browser dan cookie remember-me dapat dipakai sebelum reset password, kemudian keduanya serta bearer token lama ditolak 401 sesudah reset. Bearer lama dihapus dari database; login dengan password baru berhasil. Replay token reset yang sudah dipakai ditolak 422 tanpa membatalkan token login baru.
- **Ponytail — `CheckPermission::handle()` L21**: hapus fallback autentikasi query token yang mengulang lookup `PersonalAccessToken` dan pengaturan user resolver. Seluruh rute yang memakai `permission:` sudah melewati `auth:sanctum` lebih dahulu, dibuktikan oleh tes kontrak rute. Penanganan query token tetap melalui middleware yang ada dan Sanctum; guard 401 di pemeriksa permission dipertahankan. Jalur yang dihapus tidak dilaporkan sebagai celah yang dapat dieksploitasi pada rute saat ini. Net **-10 baris implementasi** pada putaran ini, tanpa dependency/helper baru.
- **Verifikasi**: suite terkait **124 tes, 991 assertions lulus** dalam sandbox Docker tanpa jaringan, database/storage dummy dan fake mail/notification. Mencakup dua tes baru serta regresi token berkas valid/kedaluwarsa, akses pribadi, 2FA, Surat Tugas, Drive dan cuti. `git diff --check` bersih. Frontend tidak berubah pada putaran ini dan tidak diuji ulang.
- **Cakupan/status**: review terfokus alur pemulihan akun dan middleware otorisasi bersama, bukan audit menyeluruh atau verifikasi deployment. Semua perubahan tetap lokal, belum di-commit/push/deploy. Data operasional dan log historis tidak dimodifikasi.

### 36. Penutupan Audit Portal: Rekonsiliasi Temuan Lama, Lima Akar Baru dan Regresi Menyeluruh (8 November 2026)

- **Cakupan:** workflow standard security-audit lengkap dalam lingkup Portal, bersama ponytail-review. Empat reconnaissance, hunter berdasarkan ledger, verifier temuan dan pemeriksa record baru, post-wave critic serta final-clean critic terpisah. Ledger33unit:22covered,8unit bertaut lima temuan yang sudah diperbaiki,3out_of_scope; tidak ada kandidat belum diputuskan atau unit deferred/blocked dalam cakupan.
- **Rekonsiliasi:**16temuan historis run-2/3/4 dan perbaikan tambahan progress26–35 dicocokkan dengan kode sekarang; status lengkap di [laporan](docs/security/portal-security-review-2026-11-08.md). Satu klaim admin-signal yang sebelumnya ditolak tetap ditolak. Temuan lama tidak dibatalkan oleh jawaban putaran kecil sebelumnya.
- **Lima akar baru, semuanya diperbaiki:** konsumsi recovery2FA dari snapshot lama kini CAS ciphertext dan kredensial, TOTP memakai Cache::add; GET aset tidak menulis kepemilikan; GET visum menggabungkan default tanpa menyimpan; seluruh pembaca/initializer saldo memakai EmployeeLeave::forEmployeeYear sehingga CPNS/history/carryover konsisten; state pemilik data portal/detailST diberi key user.id. Masing-masing mempunyai bukti sebelum/sesudah dan pemeriksaan independen; laporan membatasi klaim interleaving serta dummy adapter secara tepat.
- **Ponytail dan fungsi:** hapus delete token berulang, wrapper disk foto, apiExport, variabel AuthSync dan status raw/alias yang redundan. Tambahkan download=1 pada unduhan detailST dan nama TabLoading agar ESLint lulus. Net **-93baris implementasi** terhadap awalrun-6, tanpa dependency baru. Draf kalkulator, viewer dan helper email dari putaran sebelumnya tetap dipertahankan.
- **Tes gabungan:**220tes,3022assertions,217lulus dan3skip platform;0gagal. Dua skipPG dijalankan terpisah:2tes10assertions lulus. Lima kasus konkurensi cuti dan satu rename/create lulus dengan dua worker nativePostgreSQL15. Tes ChromeWindows lama tetap skip; diganti bukti komponenST/React nyata dalam ChromiumLinux untuk account-switch dan markup/print-media, bukan diklaim sebagai eksekusi tesWindows yang sama.
- **Sesudah cleanup terakhir:**90tes1194assertions lulus;8skenario cacheAPI/auth nyata, draft smoke, TypeScript noEmit dan Chromium account-switch/markup lulus. ESLint file yang diperiksa0error/0warning. Validator5record dan33unit lulus;git diff--check bersih.
- **Artefak/status:** laporan lengkap di docs/security/portal-security-review-2026-11-08.md; record, ledger, snapshot, hash dan receipt sandbox di C:/Users/USER/security-audit-skill/bksda-superapp/run-6. Perbaikan, tes dan dokumentasi disatukan dalam commit lokal penutupan sesuai permintaan pengguna; belum di-push atau deploy. Data operasional, log historis dan konfigurasi provider/deployment tidak diperiksa atau diubah. Audit ini parsial terhadap seluruh repo dan produksi.
## 37. Audit Surat Tugas dan Kepegawaian — Selesai (9 November 2026)

- **Source, perbaikan dan regresi selesai.** Audit standard/scoped run-7 menutup 44 unit in-scope dari 47 unit; 3 unit di luar cakupan. Critic pascawave 3 dan final-clean independen sama-sama 0 missing/0 reassignment.23 kandidat selesai Phase 3; 21 record retained selesai Phase 5 terpisah termasuk 3 replacement material dengan verifier baru.
- **Putusan final:**18 temuan historis terkonfirmasi sudah diperbaiki dan regresinya diverifikasi (15 medium, 3 low); 2 dugaan ditolak; 3 needs_validation tanpa severity dijelaskan terbuka. Ini bukan 18 celah aktif sekarang.31 observasi prior-record/89 prior-unit direkonsiliasi; hasil lama tidak disalin sebagai proof baru. Commit Portal `fc610d1d` tetap terpisah.
- **Perubahan utama dan alasannya:** proyeksi submit dan riwayat pending membatasi data pribadi; otorisasi ST setelah rowlock/guard revisi bersama menutup race dan alternate writer; pending/restore memeriksa jadwal dan mixed batch rollback; foto bersama terlindungi; batch rekening menolak target Super Admin sebelum write; IAM status eksplisit/token revocation; uang makan memakai status resmi dan metadata tarif/Excel/FK benar; parser XLSX native bounded dan tanggal/periode valid; katalog soft-delete/default transaksional; Agent memakai saldo/jenis/hari kerja kanonik, gate socket/key eksplisit, telepon aktif unik; asisten mengautentikasi producer/operator, merevalidasi telepon per pesan dan mengonsumsi draf YA/BATAL atomik.
- **Tes final:**304 tes backend/4.086 assertions, 301 lulus 3 skip 0 gagal (`php-98873fe9c6cc`); 42 filePHP syntax lulus; fullfrontend TypeScript noEmit/helper/API-cache dan ESLint 0 error 0 warning; asisten actual TS/Express 15 skenario 270 assertions. Subset tumpang tindih tidak dijumlahkan. Dua PG lama dan satu Windows synthetic test skip, tidak dihitung lulus; nativePGdua-worker dan actualLinuxChromium menjadi bukti terpisah.
- **Bukti end-to-end aktual:**Next/PHP/SQLite/Chromium untuk public/Builder/publish/two recipient/foreign, kedua print handler; KPGpegawai/IAM, suratmasuk/importpresensi, masterbiaya, cuti/cancel/overlap/reject/delete/quota. NativePGmemakai dua worker primed/lockwait/inverseemployeeorder dan delete-versus-approve. Restore mengamati safe row aktif di transaction 1 lalu exactsnapshot pulih saat conflict 422; fresh verifier mengulang 15 assertions. Joined asisten/nativePHP membentuk sesi baseline organik, mengubah telepon lewat adminHTTP nyata, membuktikan oldphoneGET 200/dummybalance vs current 404/GET 0 dan newphonepositive. Tidak memakai provider/data operasional.
- **Ponytail diterapkan:**hapus komponenhistory 275 baris dan request 38 baris tak dipakai, variabeldead; reuse aturan saldo/jenis/hari dan satu normalizer 15 alias simpan/ekspor. Netimplementasi-162 baris terhadapbase, di luar tests/docs/contohconfig; tanpa dependencybaru.
- **Batas yang tetap dicatat:**historical pairing exposure/provider effect belum teramati; dampakZIP lintas request perlu config-only owner review; kausalitas historicaldeparture-only snapshot belum dapat diisolasi karena automaticapproval menolak dynamicverification (possible cybersecurityrisk). Sourceguard tersedia diuji; tidak ada replay yang ditolak diulang. Fullassistanttypecheck/ioredis, realRedis/provider, productionworker/storage/printerfisik tidak diklaim.
- **Laporan final:**[audit dan perubahan](docs/security/surat-tugas-kepegawaian-security-review-2026-11-09.md),[record JSON](docs/security/surat-tugas-kepegawaian-security-review-2026-11-09-findings.json),[detail](docs/security/surat-tugas-kepegawaian-security-review-2026-11-09-findings-detail.md),[needs-validation](docs/security/surat-tugas-kepegawaian-security-review-2026-11-09-needs-validation.md), coverage/rekonsiliasi/executionindex/manifest pada bundle yang sama. Rawrun:`C:/Users/USER/security-audit-skill/bksda-superapp/run-7/`.
- **Penutupan:**source, tests, laporan dan progress disertakan bersama pada commit lokal penutupan ST/KPG (hash melalui Gitlog; file di dalam commit tidak menyimpan hash dirinya). Tidak push/deploy. Cakupan scoped selesai dengan 3 lead batas validasi di atas; tidak menyatakan seluruh produksi aman.

## 38. Tindak Lanjut Tiga Lead ST/Kepegawaian — Pemeriksaan Aman Selesai (9 November 2026)

- **Hasil:** tiga pemeriksa independen baru memverifikasi ulang record tanpa mengubah verdict. Tetap 18 temuan historis diperbaiki, 3 needs_validation tanpa severity, 2 dugaan ditolak. Kode aplikasi/tes tidak berubah; tidak ada fakta baru yang membenarkan klaim tiga celah aktif atau penutupan tanpa bukti.
- **Operator asisten:** guard kedua route sudah selesai dan uji ulang current actual TS/Express lulus 1 skenario/84 assertions (`assistant-6eac30a1c741`). Sisa lead menyangkut konfigurasi ingress/otoritas dan konsekuensi provider pada deployment lama; mapping port/source bukan bukti exposure aktual. Tidak meminta/menghasilkan QR atau pairing.
- **ZIP presensi:** current tiny native filter/basename/cutoff lulus 1 tes/3 assertions (`php-d67a7ee18cd2`). Kontrol auth/role/module/throttle, 200 entri, 5 MiB/anggota, nginx/PHP body limit, FPM dan restart diperiksa. Dampak terhadap pengguna lain belum terbukti dan perlu konfigurasi efektif/isolasi kapasitas dari owner; tidak dilakukan stress/OOM. Budget agregat adalah hardening opsional sampai boundary impact/batas produk jelas.
- **Snapshot ST:** source dan tiga approved raw receipts dibaca ulang; hash/size cocok. Bukti lama mencampur null.text, invalid React child dan trim tembusan sehingga departure-only belum terisolasi. Guard writer/reader current dan receipt HTTP 1 tes/60 assertions serta legacy reader yang lulus tetap berlaku pada fixture masing-masing; tidak dijalankan ulang. Automatic approval sebelumnya menolak dynamic verification karena possible cybersecurity risk; tidak ada input/replay/varian atau eksekusi snapshot baru.
- **Pelaporan:** [tindak lanjut tiga lead](docs/security/surat-tugas-kepegawaian-security-review-2026-11-09-follow-up.md); laporan utama/needs-validation diberi tautan, ledger dan execution index diperbarui dengan bukti yang tepat serta manifest diselaraskan. Validator findings 23 record dan coverage 47 unit lulus. Suite 304 tes lama tidak diklaim dijalankan ulang; subset tidak dijumlahkan. Hasil disertakan dalam commit lokal tindak lanjut; tanpa push/deploy/data operasional.


## 39. Lifecycle Notifikasi Portal/ST/BMN/Kepegawaian — Source dan Tes Selesai (9 November 2026)

- **31 skenario dilaksanakan:**30 PASS lokal dan1 diagnosis konfigurasi/status deployment (RV-01). Ini regresi fungsional terfokus, bukan audit keamanan menyeluruh baru. Semua skenario memiliki mapping tes/lapisan/batas bukti; tiga lead historis ST/KPG tidak diubah verdict-nya.
- **Reverb terdiagnosis lewat pemeriksaan server read-only yang diizinkan pengguna:**192.168.100.11 adalah Proxmox; aplikasi VM106 beralamat192.168.100.203, port3000 panel Dokploy. Compose aktif memiliki Reverb/network/alias yang sesuai, tetapi container restart exit1 dengan error SIGINT. CLI backend membuktikan pcntl=no/SIGINT=no; DNS reverb gagal saat diperiksa. Dockerfile kini memasang pcntl dan menjalankan guard signal native saat build. Guard/daemon lokal lulus; image produksi BELUM dibangun ulang/deploy dan server belum dinyatakan pulih.
- **Perbaikan:**event personal/admin memakai native after-commit/rescue; notice ST trash/restore/update/roster dan bulk konsisten; retry identik ST/cuti tidak menggandakan notice; NIP string dipetakan benar; loan legacy memakai employee integer, koreksi peminjam menyelaraskan aset dan return/delete lama menjaga pemegang baru; pagination notifikasi deterministic; badge/dedup/history/read error kembali ke DB; detail ST/cuti/scan/cetak tidak menggunakan isi lama atau respons request yang terlambat. Nama pegawai pada inbox cuti diperbaiki. Health membedakan DNS/TCP dan mendeteksi heartbeat pertama yang tidak pernah diproses.
- **Kebijakan pengguna dipertahankan:**ST resmi di sampah keluar dari konflik jadwal dan PD; fixture hadir menjadi H, restore mengembalikan konflik/history/PD. Trash bukan pembatalan resmi, riwayat notice/read_at tetap. Jadwal baru dapat lolos ketika surat di sampah dan restore kemudian bisa konflik. Batch uang makan tersimpan tidak diasumsikan otomatis direkalkulasi.
- **Verifikasi akhir:**407tes/4.745assertions,404lulus3skip0gagal (`php-715e7c502639`); sesudah tambahan assertion dedup/inbox38tes454assertions lulus (`php-d6b6a976914f`). Subset tidak dijumlahkan.12kasus callback/effect aktual,8kasus API/auth cache, draft/legacy reader, fullTypeScript,15filePHP syntax dan ESLint0error0warning lulus. Dua PG dan satu Windows legacy skip tidak dihitung lulus; tidak mengklaim racePG baru.
- **E2E aktual:**Next/Laravel/SQLite/native databasequeue/Reverb/proxy/Chromium lulus (`e2e-b85fa428ecf7`), mencakup duplicate/read/history, approved-trash-oldlink-restore-force, worker gate approval pertama terlambat, polling35s saat daemon mati, resubscribe plus frame BARU sesudah pulih dan dua-tabA→C. Native transport/key salah/private auth/foreign403/queue/outage/retry/logout401 juga lulus (`e2e-7525e75da854`). Hidden→visible dan print timer diuji melalui effect/callback terkontrol, bukan perpindahan tab native atau printerfisik.
- **Review dan artefak:**review akhir independen tidak menemukan bug aplikasi tambahan; assertion reconnect yang semula bisa memakai frame lama diperketat dan diuji ulang. Tanpa dependency baru. [Laporan lengkap](docs/security/portal-notification-lifecycle-report-2026-11-09.md),[hasil31kasus/hash/receipt](docs/security/portal-notification-lifecycle-results-2026-11-09.json),[rencana diperbarui](docs/security/portal-notification-lifecycle-test-plan-2026-11-09.md). Raw/runner:`C:/Users/USER/security-audit-skill/bksda-superapp/run-8/`; fixture sumber ikut repository dan parity SHA diverifikasi.
- **Penutupan lokal:**kode,tes,laporan,hasil dan progress disertakan pada commit lokal yang sama. Tanpa push/deploy, install dependency, provider eksternal atau perubahan data operasional. Sisa langkah produksi adalah penerapan image baru dan verifikasi operasional, terpisah dari kelulusan tes lokal.


## 40. Deploy Portal/Reverb — Server Terverifikasi, Browser Menunggu Login (9 November 2026)

- **Push/PR/merge/deploy sudah diotorisasi dan dilakukan.** PR [#599](https://github.com/tegaranugrah1/bksda-superapp/pull/599) merged ke production-server pada 10:16:25 UTC+8, merge3de2ab8a; Dokploy On Push membangun dan menerapkan image. Commit e112ecdf menghapus reseed akun pada startup dan menghentikan startup bila migrasi gagal. Backup PostgreSQL sebelum deploy 2.662.323 byte tervalidasi pg_restore -l, tetap di server; tidak melakukan restore/reset/force push/penghapusan volume.
- **Temuan deployment tambahan langsung ditangani:** Nginx 11hari masih mengikat file konfigurasi lama tanpa /app (SHA berbeda dari source). Restart hanya nginx-backend melalui Dokploy memuat route baru; WSS berubah404→handshake berhasil. APP_NAME service berbeda memisahkan prefix cache: worker menyelesaikan heartbeat tetapi backend membaca null. Commit7cc01448 / PR [#600](https://github.com/tegaranugrah1/bksda-superapp/pull/600), mergebeccece0, menyamakan CACHE_PREFIX ke namespace backend yang sudah ada pada keempat service, tanpa flush cache.
- **Bukti produksi:** pcntl=yes/SIGINT=yes, guard native lulus saat build dan runtime, DNS reverb resolvable, API/Portal200, native internalWS dan publicWSS menerima pusher:connection_established dengan TLS tetap diverifikasi. Heartbeat uji10:43:19 diproses worker dan terbaca backend; snapshot10:44:13 pending0. Snapshot10:43 dan10:46 menunjukkan Reverb/proses yang sama sejak10:40:13, restart0; backend/queue/scheduler juga running. Namespace cache empat service dikonfirmasi sama. Startup parser dalam sandbox network-none/read-only lulus.
- **Uji browser belum ditutup:** sesi Portal lama menghasilkan private-auth401 walaupun handshake101. Pengguna diminta login ulang melalui pertanyaan async; tidak menganggap waktu berlalu sebagai login. Belum membuat token/akun baru atau mengirim canary personal, dan tidak melonggarkan guard. Uji toast/bel/history/read menunggu sesi sah; 31 skenario lokal dan suite407 tidak diklaim diulang terhadap data operasional.
- **Observasi terpisah:** pada10:42 terdapat7failed ArchiveOfficialDocument kategori write tujuan Drive; log berikutnya masih menunjukkan arsip gagal. Tidak menghapus/retry massal job atau menyalin payload/isi dokumen. Ini bukan kegagalan broadcast; integrasi arsip di luar scope pemulihan Reverb, sehingga seluruh health monitor belum dinyatakan bersih.
- **Laporan/progress:** [deployment dan batas hasil](docs/security/portal-reverb-deployment-2026-11-09.md), [hasil terstruktur/hash](docs/security/portal-reverb-deployment-2026-11-09-results.json). Laporan/rencana lifecycle diberi tautan tindak lanjut; snapshot lokal asli dipertahankan. Raw dan bukti visual ada di C:/Users/USER/security-audit-skill/bksda-superapp/run-8/deployment/. Penutupan report dibawa melalui PR dokumentasi; hasil browser dilanjutkan setelah login, bukan diberi PASS tanpa bukti.


## 41. Uji Notifikasi Produksi Setelah Login Ulang — Selesai (9 November 2026)

- **Status akhir:** perbaikan lifecycle Portal/Surat Tugas/BMN/Kepegawaian, pemulihan Reverb, deployment Dokploy dan smoke test notifikasi produksi selesai. Bagian 39–40 menyimpan urutan pekerjaan sebelumnya; status menunggu deploy/login di bagian tersebut telah ditutup oleh hasil di bagian ini.
- **Yang diperbaiki dan alasannya:** ekstensi `pcntl` dan guard signal native ditambahkan agar Reverb tidak berhenti karena `SIGINT`; konfigurasi proxy Nginx lama dimuat ulang melalui restart hanya `nginx-backend` di Dokploy agar route `/app` melayani WSS; `CACHE_PREFIX` disamakan pada backend/queue/scheduler/Reverb agar heartbeat yang diproses worker terbaca backend. Reseed akun otomatis pada startup dihapus agar redeploy tidak mengganti kredensial akun lama; startup dihentikan jika migrasi gagal. Detail perubahan lifecycle dan konsekuensi ST di sampah tetap dicatat pada bagian 39 serta laporan terkait.
- **Tes lokal yang sudah selesai:** 31 skenario tercatat (30 PASS lokal dan satu diagnosis deployment RV-01), suite 407 tes/4.745 assertions (404 lulus, 3 skip, 0 gagal), subset akhir 38 tes/454 assertions, serta E2E aktual, TypeScript, ESLint dan pemeriksaan sintaks sebagaimana bagian 39. Subset tidak dijumlahkan. Tes tersebut tidak diklaim diulang terhadap data produksi; pembaruan progress ini hanya dokumentasi.
- **Uji produksi setelah login ulang:** private-channel auth HTTP 200 dan satu private channel akun aktif. Tepat satu notifikasi teknis ID 359 dibuat pada 11:15:05 WITA melalui `PortalNotificationService` dan native database queue. Toast realtime teramati di browser, judul/body yang sama tampil pada bel, dan DB menyimpan satu record. Klik hanya notifikasi uji menyimpan `read_at` pada 11:16:36 WITA; jumlah belum dibaca turun 168 menjadi 167. Filter Sudah Dibaca menampilkan satu item yang sama. Tidak menandai seluruh riwayat dibaca, membuat akun/token tambahan, atau mengubah ST/cuti/pinjaman aset produksi.
- **Verifikasi terakhir setelah deploy:** pada 11:28:45 WITA, source server sesuai merge `787666d9`; backend/frontend/queue/scheduler/Reverb berjalan dengan restart count 0. Proses Reverb yang sama berjalan sejak 10:40:13 WITA, sekitar 48 menit tanpa restart. DNS `reverb` berhasil, `pcntl=yes`/`SIGINT=yes`, API dan Portal HTTP 200; handshake WebSocket internal dan WSS publik sebelumnya lulus dengan verifikasi TLS tetap aktif. Heartbeat queue sudah terbaca backend setelah penyamaan namespace cache.
- **Commit, PR dan deployment:** perbaikan utama melalui [PR #599](https://github.com/tegaranugrah1/bksda-superapp/pull/599), cache melalui [PR #600](https://github.com/tegaranugrah1/bksda-superapp/pull/600), dokumentasi deployment melalui [PR #601](https://github.com/tegaranugrah1/bksda-superapp/pull/601), dan hasil login ulang melalui [PR #602](https://github.com/tegaranugrah1/bksda-superapp/pull/602), semuanya sudah merged ke `production-server`. Commit dokumentasi hasil browser `91927dd4`, merge terakhir `787666d9` pada 11:26:51 WITA; Dokploy menampilkan hash tersebut dengan status **Done**, durasi 46 detik. Backup PostgreSQL sebelum deploy tervalidasi dan tetap di server; tidak melakukan restore/reset atau penghapusan volume.
- **Laporan dan bukti:** [laporan deployment](docs/security/portal-reverb-deployment-2026-11-09.md), [hasil terstruktur/hash](docs/security/portal-reverb-deployment-2026-11-09-results.json), [laporan lifecycle](docs/security/portal-notification-lifecycle-report-2026-11-09.md), dan [hasil 31 skenario](docs/security/portal-notification-lifecycle-results-2026-11-09.json). Bukti visual akhir `C:/Users/USER/security-audit-skill/bksda-superapp/run-8/deployment/portal-read-confirmed-359.jpg` menunjukkan notifikasi uji pada filter Sudah Dibaca; screenshot transisi tidak dipakai sebagai bukti toast. Bukti toast berasal dari pengamatan accessibility tree saat event tampil.
- **Batas hasil:** kegagalan job `ArchiveOfficialDocument` saat menulis arsip Drive tetap dicatat terpisah dan belum diperbaiki dalam lingkup Reverb/notifikasi. Tidak menghapus atau retry massal failed jobs untuk membuat status tampak bersih. Tiga lead historis ST/Kepegawaian pada bagian 38 tidak diubah verdict-nya; hasil ini tidak menyatakan semua integrasi atau seluruh aplikasi bebas masalah.


## 42. Perbaikan Thumbnail Foto Aset Saya di Portal Pegawai — Selesai (9 November 2026)

- **Akar masalah:** Kolom `foto_geotag_url` pada database BMN menyimpan URL halaman web Google Drive (`https://drive.google.com/file/d/.../view`). Pada `MyAssetsTab.tsx`, penentuan thumbnail sebelumnya memprioritaskan URL mentah `asset.foto_geotag_url` tanpa melalui `resolvePhotoUrl()`, sehingga browser menembakkan event `onError` karena dokumen HTML tidak dapat dirender sebagai gambar dan kartu jatuh ke fallback ("Belum ada foto"). Sebaliknya saat kartu diklik, modal Lightbox memanggil `resolvePhotoUrl()` yang mengubah ID Google Drive menjadi URL CDN langsung (`https://lh3.googleusercontent.com/d/{id}`), sehingga foto muncul di modal.
- **Perbaikan:** Menyeragamkan penentuan `thumbUrl` pada List View dan Grid View `MyAssetsTab.tsx` agar menggunakan `primaryPhoto?.url` yang sudah diproses oleh `resolvePhotoUrl()`. Memperluas regex `resolvePhotoUrl()` untuk mendukung variasi URL Google Drive dengan parameter `?id=` / `&id=`. Menyelaraskan key `failedImgMap` pada `ActiveLoansTab.tsx` agar null-safe.
- **Verifikasi:** TypeScript `tsc --noEmit` lolos 0 error; `portal_security_check.php` PASS; PHPUnit `PortalPersonalSecurityTest` (52 tests, 183 assertions) dan `PortalAuthSecurityTest` (21 tests, 481 assertions) lulus 100%.


## 43. Perbaikan Sinkronisasi Snapshot Saldo Cuti Form Cetak Penetapan Cuti — Selesai (9 November 2026)

- **Akar Masalah:**
  Saat admin kepegawaian mencatat surat izin penetapan cuti langsung melalui `/kepegawaian/employees/{id}` (`EmployeeLeaveController::storeRecord` dan `updateRecord`), rekaman dibuat tanpa mengisi kolom `sisa_n0`, `sisa_n1`, dan `sisa_n2` pada tabel `kpg_employee_leave_requests`. Akibatnya, nilai kolom `sisa_n0` mengambil nilai default skema database yaitu `12` (bukan sisa kuota hak cuti riil pegawai pada tahun bersangkutan). Saat pegawai membuka cetak Formulir Cuti (`FormulirCutiPrint.tsx`), tabel V Catatan Cuti menampilkan angka default `12` meskipun pegawai telah menggunakan cuti sebelumnya.
- **Implementasi Solusi (Prinsip /ponytail):**
  1. **`EmployeeLeaveController::storeRecord`**: Mengambil `leaveBalance = EmployeeLeave::forEmployeeYear($employeeId, $year)` dan menghitung `sisa_n0` dinamis (`max(0, (int) ($leaveBalance->hak_cuti_n ?? 12) - (int) $leaveBalance->cuti_terpakai_n0)`), serta menyertakan `sisa_n1` (`$leaveBalance->hak_n1_diakui`) dan `sisa_n2` (`$leaveBalance->hak_n2_diakui`) saat `EmployeeLeaveRequest::create()`.
  2. **`EmployeeLeaveController::updateRecord`**: Menghitung `otherApprovedDays` (total hari cuti disetujui dari permohonan lain di tahun yang sama) dan memperbarui `sisa_n0`, `sisa_n1`, dan `sisa_n2` pada `$updatePayload`.
  3. **Runnable Check & Data Sync**:
     - Sinkronisasi data saldo snapshot pada permohonan cuti ID 787 milik pegawai 123 (Tegar Anugrah) dari `12` menjadi `11` (sesuai pemakaian 1 hari sebelumnya pada ID 661).
     - Menambahkan assert-based self-check `backend/tests/EmployeeLeaveSnapshotCheck.php` untuk memvalidasi `storeRecord` dan `updateRecord` secara otomatis.
- **Verifikasi**:
  - `php backend/tests/EmployeeLeaveSnapshotCheck.php`: **PASS** (100% assertions lulus).
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.


## 44. Pencantuman Tahun Akumulasi Cuti N-1 dan N-2 pada Surat Izin Cuti Resmi — Selesai (9 November 2026)

- **Kebutuhan & Hasil Diskusi `/grill-me`**:
  Saat admin kepegawaian menyetujui atau menerbitkan ulang Surat Izin Cuti resmi (`surat_izin_cuti`) untuk permohonan Cuti Tahunan, jika pegawai masih memiliki sisa hak cuti dari tahun-tahun sebelumnya (N-1 atau N-2), kalimat pembuka butir 1 naskah dinas resmi disesuaikan secara otomatis:
  - **Hanya Tahun Berjalan (N)**: Tetap default: *"1. Diberikan Cuti Tahunan kepada Pegawai Negeri Sipil :"* (atau PPPK jika bersangkutan).
  - **Ada Sisa N-1 (misal 2025 & 2026)**: *"1. Diberikan Cuti Tahunan untuk tahun 2025 dan tahun 2026 kepada Pegawai Negeri Sipil :"*.
  - **Ada Sisa N-2 & N-1 (misal 2024, 2025 & 2026)**: *"1. Diberikan Cuti Tahunan untuk tahun 2024, tahun 2025 dan tahun 2026 kepada Pegawai Negeri Sipil :"*.
  - **Non-Tahunan**: Tetap tanpa tahun (misal: *"1. Diberikan Cuti Sakit kepada..."*).
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Backend `EmployeeLeaveRequestController.php`**:
     - Menambahkan helper terpadu `resolveTahunCutiText(EmployeeLeaveRequest $leaveReq): ?string` yang mendeteksi sisa `sisa_n1 > 0` dan `sisa_n2 > 0` (dengan fallback aman ke saldo `EmployeeLeave` pegawai).
     - Menyertakan `'tahun_cuti_text'` pada respons API `previewSuratIzin`.
     - Menyimpan `'tahunCutiText'` ke dalam `document_payload` tabel `surat_keluar` saat `generateSuratIzin` dipanggil.
  2. **Frontend `SuratDinasDocument.tsx`**:
     - Menambahkan properti `tahunCutiText?: string | null` pada antarmuka `SuratDinasData`.
     - Menjadikan kalimat pembuka butir 1 dinamis: `1. Diberikan Cuti {jenisCutiClean}{isTahunan && tahunCutiText ? ` ${tahunCutiText}` : ""} kepada ...`.
  3. **Frontend `DigitalSuratIzinModal.tsx` & Modul Persuratan**:
     - Menyediakan fallback kalkulasi langsung di `DigitalSuratIzinModal` agar tampilan surat izin yang sudah ada langsung memunculkan tahun akumulasi cuti.
     - Menyediakan input kontrol akumulasi tahun cuti opsional di editor `/surat/keluar/dinas`.
  4. **Runnable Check**:
     - Menambahkan pengujian komprehensif pada `backend/tests/EmployeeLeaveSnapshotCheck.php` untuk memvalidasi kasus N-1 (`"untuk tahun 2025 dan tahun 2026"`), kasus N-2 & N-1 (`"untuk tahun 2024, tahun 2025 dan tahun 2026"`), serta kasus N saja (`null`).
- **Verifikasi**:
  - `php backend/tests/EmployeeLeaveSnapshotCheck.php`: **PASS** (100% assertions lulus).
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.

## 45. Penegakan Kebijakan Cuti CPNS/PPPK dan Peniadaan Cuti, Bank & Uang Makan Personil MMP — Selesai (9 November 2026)

- **Kebutuhan & Hasil Klarifikasi `/grill-me`**:
  1. **Personil MMP (Masyarakat Mitra Polhut)**:
     - Tidak memiliki hak cuti kepegawaian (`is_mmp` tidak boleh mengajukan atau mencatat cuti, saldo cuti = 0, tab Cuti di detail pegawai disembunyikan, menu Cuti di portal pegawai disembunyikan/dinonaktifkan).
     - Tidak memiliki rekening bank operasional kepegawaian (kartu bank dan input rekening disembunyikan dari UI detail & edit pegawai; kolom `nama_bank` dan `nomor_rekening` selalu diset `null` di level database dan model).
     - Tidak memiliki fasilitas uang makan & presensi (tab "Presensi & Uang Makan", kartu metrik "Uang Makan", serta query riwayat uang makan disembunyikan/diblokir dari detail pegawai MMP).
  2. **Pegawai PPPK (P3K)**:
     - Tidak berhak atas Cuti Karena Alasan Penting (CAP) sesuai regulasi BKN. Opsi CAP otomatis disaring (difilter) dari dropdown jenis cuti di seluruh antarmuka (portal dan admin), serta divalidasi ketat di backend.
  3. **Masa Kerja 1 Tahun CPNS & PPPK untuk Hak Cuti Tahunan**:
     - Hak cuti tahunan (12 hari kerja) baru aktif setelah genap 1 tahun masa kerja terhitung sejak NIP/NIPPPK diangkat.
     - **CPNS**: Digit 9–14 NIP format `YYYYMM` (misal: `199907072025061006` diangkat Juni 2025). Berhak cuti tahunan mulai 1 tahun kemudian: **1 Juni 2026**. Sebelum tanggal ini, kuota cuti tahunan = 0 dan permohonan ditolak.
     - **PPPK**: Digit 9–12 NIP format `YYYY` dan digit 13–14 adalah `21` (misal: `199601032024212050` kontrak tahun 2024). Berhak cuti tahunan pada tahun kalender berikutnya: **1 Januari 2025**. Pada tahun pengangkatan, kuota cuti tahunan = 0.
     - Cuti selain tahunan (seperti Cuti Sakit, Cuti Melahirkan) tetap dapat diajukan sesuai ketentuan regulasi.
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Database & Model Pegawai (`Employee.php`)**:
     - Migration `2026_11_09_140000_make_nama_bank_nullable_in_kpg_employees.php` mengubah kolom `nama_bank` menjadi `nullable()` dan membersihkan bank default personil MMP yang sebelumnya terisi otomatis.
     - Model hook `static::saving` di `Employee.php` menjamin `nama_bank = null` dan `nomor_rekening = null` setiap kali pegawai adalah MMP.
     - Accessor `annual_leave_eligible_date` dan helper `isEligibleForAnnualLeave(?Carbon $asOf)` pada `Employee.php` menghitung tanggal kelayakan cuti tahunan secara dinamis dari NIP.
  2. **Model & Saldo Cuti (`EmployeeLeave.php` & `LeaveType.php`)**:
     - `EmployeeLeave::forEmployeeYear` mengembalikan kuota 0 untuk MMP dan mengecek `annual_leave_eligible_date` untuk CPNS/PPPK (tahun berjalan 0 jika belum genap 1 tahun masa kerja; tidak ada carryover N-1 pada tahun pertama kelayakan).
     - `LeaveType::forEmployee` memvalidasi dan memblokir permohonan jika pegawai adalah MMP, atau jika PPPK mengajukan Cuti Karena Alasan Penting.
     - `LeaveTypeController::index` otomatis menyaring jenis cuti berdasarkan target pegawai (`employee_id` atau akun login).
  3. **Controllers (`EmployeeLeaveRequestController.php` & `EmployeeLeaveController.php`)**:
     - Guarding endpoint `myStore`, `myBalance`, `show`, `store`, `storeRecord`, dan `updateRecord` untuk memvalidasi syarat 1 tahun masa kerja dan menolak permohonan dari personil MMP.
  4. **Frontend UI/UX**:
     - `employee-helpers.ts`: Menambahkan `getAnnualLeaveEligibleDate` dan `isEligibleForAnnualLeave`.
     - `employees/[id]/page.tsx`: Menyembunyikan Sub-Card Rekening, Card Rekening di Biodata, Metric Sisa Cuti, Metric Uang Makan, Tab Cuti, dan Tab Presensi & Uang Makan untuk personil MMP; menyembunyikan input bank di modal edit MMP.
     - `PortalProfileSidebar.tsx` & `PortalQuickStats.tsx` & `portal/page.tsx`: Menyembunyikan tab/menu Pengajuan Cuti dan card statistik cuti jika user adalah MMP.
     - `CatatSuratIzinModal.tsx` & `EmployeeLeaveTab.tsx`: Menampilkan banner larangan untuk MMP, menyaring jenis cuti CAP untuk PPPK, dan memvalidasi syarat 1 tahun masa kerja untuk Cuti Tahunan dengan simulasi real-time.
  5. **Automated Verification**:
     - Mengembangkan automated test `backend/tests/EmployeeLeaveSnapshotCheck.php` dengan pengujian menyeluruh (10 skenario) mencakup CPNS 2025, PPPK 2024, MMP bank & cuti blocking, serta aturan CAP PPPK.
- **Hasil Verifikasi**:
  - `php backend/tests/EmployeeLeaveSnapshotCheck.php`: **PASS** (100% assertions lulus).
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.

---

## 46. Visualisasi Username Login Portal & Kode Identitas Personil MMP (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Personil MMP (Masyarakat Mitra Polhut) login ke Portal BKSDA menggunakan kode sekuensial unik `MMP-xxx` (misal: `MMP-006` untuk Abdul Farij, ID 133).
  - Sebelumnya di antarmuka detail pegawai dan dialog Reset Password, identitas MMP sengaja disamarkan sebagai `"MMP • Tanpa NIP"` dan `"- (Tanpa NIP)"`, sehingga administrator kesulitan mengetahui username yang harus dibagikan ke personil ketika menerbitkan atau mereset password akun.
  - Selain itu, saat pendaftaran pegawai baru di `employees/create`, notifikasi keberhasilan belum menampilkan username yang diterbitkan secara otomatis oleh sistem.
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Cockpit Card Detail Pegawai (`employees/[id]/page.tsx`)**:
     - Menampilkan label `Username: MMP-xxx` untuk personil MMP (atau NIP/NIPPPK untuk PNS/PPPK) dilengkapi tombol 1-klik Salin (Copy) langsung.
  2. **Tab Biodata (`employees/[id]/page.tsx`)**:
     - Mengubah label identitas menjadi `Username Portal (Kode MMP)` dengan nilai kode MMP pegawai untuk personil MMP.
  3. **Dialog Reset Password (`employees/[id]/page.tsx`)**:
     - Menambahkan baris informasi `Username Login: {employee.nip}` sehingga admin langsung mengetahui username terkait sebelum menyerahkan password baru.
  4. **Dialog IAM (`EmployeeAccessSheet.tsx`)**:
     - Menampilkan `Username Portal: MMP-xxx` untuk personil MMP agar konsisten.
  5. **Formulir Tambah Pegawai Baru (`employees/create/page.tsx`)**:
     - Memperjelas info banner kategori MMP bahwa sistem otomatis menerbitkan kode unik yang berfungsi sebagai Username Login Portal.
     - Memperbarui toast keberhasilan pendaftaran agar langsung menampilkan username yang berhasil diterbitkan: `"Pegawai berhasil ditambahkan! Username: {createdNip}"`.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/EmployeeLeaveSnapshotCheck.php`: **PASS** (100% assertions lulus).
  - `graphify update .`: Sukses tersinkronisasi (14.623 nodes, 27.352 edges, 1.008 communities).

---

## 47. Implementasi Lifecycle Pegawai Pensiun, Keluar & TMT (09 November 2026)

- **Latar Belakang & Kebutuhan (`doc.md`)**:
  - Pegawai yang pensiun atau keluar (mengundurkan diri, habis kontrak, mutasi, meninggal, diberhentikan) tidak boleh dihapus atau disoft-delete agar riwayat operasional (SPT, Cuti, Uang Makan, BMN, arsip surat) tetap utuh.
  - Akses akun login harus dicabut tepat pada batas TMT (Terhitung Mulai Tanggal) pukul 00:00 WITA (`Asia/Makassar`), Sanctum tokens direvoke, dan session web ditutup.
  - Mendukung penetapan TMT di masa mendatang (`scheduled_inactive`) di mana pegawai dan user tetap aktif sampai TMT tiba, serta pembatalan jadwal sebelum tanggal efektif.
  - Mengintegrasikan guard lintas modul: pencegahan penugasan baru pada Surat Tugas (`AssignmentLetterConflictService`), pemblokiran izin cuti baru (`EmployeeLeaveController` & `EmployeeLeaveRequestController`), penolakan pinjaman baru BMN (`LoanController`), dan pemfilteran uang makan pada hari nonaktif (`AttendanceReconcilerService` & `MealAllowanceController`).
  - Menyediakan endpoint pemeriksaan tanggungan BMN unik (`bmnClearance`) sebelum penonaktifan dieksekusi.
  - Memastikan retensi data operasional di mana `forceDestroy` diblokir jika pegawai memiliki jejak historis (`hasOperationalHistory()`).

- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Database Migration Additive**:
     - `backend/database/migrations/2026_11_09_160000_add_lifecycle_columns_to_kpg_employees_table.php`: Menambahkan kolom nullable `inactive_reason` (varchar 50), `inactive_effective_date` (date), `inactive_notes` (text), dan composite index `(is_active, inactive_effective_date)`.
  2. **Model Pegawai & Akun (`Employee.php` & `User.php`)**:
     - `User.php`: Menambahkan relasi `employee(): HasOne` via `('nip', 'username')`.
     - `Employee.php`:
       - Menetapkan konstanta alasan `ALLOWED_INACTIVE_REASONS` (`pensiun`, `mengundurkan_diri`, `habis_kontrak`, `mutasi`, `meninggal`, `diberhentikan`, `lainnya`) dan labelnya.
       - Menambahkan helper `isEffectiveActive(?\DateTimeInterface|string $asOf = null)`, `isScheduledInactive()`, query scope `scopeEffectiveActive()`, `scopeScheduledInactive()`, serta accessor `status_badge`.
       - Menambahkan method atomik `applyLifecycleStatus(action, reason, effectiveDate, notes, actor)` yang mengunci record (`lockForUpdate`), mengupdate lifecycle pegawai, menonaktifkan linked User, mencabut token Sanctum, dan mencatat audit ke `EmployeeHistory`.
       - Menambahkan `hasOperationalHistory(): bool` untuk melindungi pegawai dengan jejak riwayat SPT, Cuti, Uang Makan, BMN, atau History dari `forceDestroy`.
  3. **Security Middleware & Auth Guard**:
     - `EnsureAccountSecure.php`: Memeriksa apakah pegawai terkait berstatus `!isEffectiveActive()`. Jika tidak aktif, otomatis mendonaktifkan akun user, menghapus tokens, logout web session, dan mengembalikan 403 `account_inactive`.
     - `AuthController::login`: Memblokir percobaan login pegawai yang sudah melewati TMT dengan pesan `"Akun Anda sudah dinonaktifkan."`.
     - `EmployeeAccessController`: Memblokir pengaktifan akun user via IAM jika data pegawai berstatus non-aktif.
  4. **Scheduler Idempotent**:
     - `ApplyEmployeeLifecycleCommand.php` (`employee:apply-lifecycle`): Artisan command idempotent yang mengeksekusi penonaktifan pegawai terjadwal saat TMT tiba, menonaktifkan akun user, menghapus token, dan mencatat audit history.
     - `backend/routes/console.php`: Didaftarkan untuk berjalan harian pada pukul 00:01 WITA (`Asia/Makassar`).
  5. **Cross-Module Guards (ST, Cuti, BMN, Uang Makan)**:
     - `AssignmentLetterConflictService.php` & `AssignmentLetterRequest.php`: Menolak pegawai non-aktif dan pegawai yang TMT-nya jatuh pada atau sebelum tanggal selesai penugasan dinas.
     - `EmployeeLeaveController.php` & `EmployeeLeaveRequestController.php`: Memblokir pengajuan cuti baru bagi pegawai non-aktif dan menolak permohonan yang tanggal selesainya melintasi TMT.
     - `EmployeeLeave.php`: Menyetel kuota tahunan = 0 jika pegawai nonaktif sebelum tahun berjalan.
     - `LoanController.php`: Menolak peminjaman BMN baru bagi pegawai yang tidak `effectiveActive()`.
     - `MealAllowanceController.php` & `AttendanceReconcilerService.php`: Mengabaikan hari kerja pada atau setelah TMT dari perhitungan uang makan.
  6. **Frontend UI/UX**:
     - `EmployeeLifecycleModal.tsx`: Dialog konfirmasi interaktif lengkap dengan pemeriksaan tanggungan BMN unik real-time, pilihan tindakan (`deactivate`, `cancel_schedule`, `reactivate`), pemilih TMT, dropdown alasan resmi, dan validasi catatan backdate.
     - `employees/[id]/page.tsx`: Tombol aksi "Status & Pensiun", Cockpit badge status cerdas (Emerald untuk Aktif, Amber pulsating untuk Terjadwal Nonaktif dengan TMT, Slate untuk Pensiun/Non-Aktif), dan detail TMT/Alasan di Card Biodata.
     - `employees/page.tsx`: Filter status lengkap (`all`, `active`, `scheduled`, `pensiun`, `inactive`, `trashed`) beserta badge tabel row adaptif.
     - `employee-types.ts`: Menambahkan tipe `inactive_reason`, `inactive_effective_date`, `inactive_notes`, dan `status_badge`.
  7. **Automated Verification**:
     - `backend/tests/EmployeeLifecycleTest.php`: Dibuat dan dijalankan dengan 10 skenario pengujian komprehensif (EMP-01 s/d EMP-12, BMN clearance & loan guard, ST conflict, Cuti boundary, dan Force delete protection).

- **Hasil Verifikasi**:
  - `php backend/tests/EmployeeLifecycleTest.php`: **PASS** (10/10 skenario lulus tanpa error).
  - `php backend/tests/SuratTugasConflictTest.php`: **PASS** (5/5 checks lulus).
  - `php backend/tests/EmployeeLeaveSnapshotCheck.php`: **PASS** (100% assertions lulus).
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `graphify update .`: Terkini.

---

## 48. Pemisahan Total Pegawai Aktif & List Khusus Purna Tugas / Non-Aktif (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pegawai pensiun/purna tugas (seperti Djunaib Ahmad) sebelumnya masih terhitung di card statistik "Total Pegawai" dan tercampur di daftar utama ketika halaman pertama kali dibuka.
  - Pengguna menginginkan daftar utama dan card total hanya menampilkan pegawai yang **aktif bertugas**, sedangkan pegawai yang sudah tidak aktif/pensiun memiliki list dan card tersendiri.
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Backend (`EmployeeController.php`)**:
     - Query default `/api/kepegawaian/employees` (tanpa status atau `status=active`) otomatis menggunakan `effectiveActive()`, sehingga pegawai pensiun/non-aktif tidak muncul di daftar kerja utama.
     - `counts.active`: Jumlah pegawai aktif (150 personil).
     - `counts.pns`, `pppk`, `mmp`: Diselaraskan untuk menghitung personil yang aktif di masing-masing kategori jenis pegawai.
     - `counts.inactive` & `counts.pensiun`: Menghitung pegawai purna tugas/keluar.
     - Menyediakan filter eksplisit `status=inactive` / `status=pensiun` untuk menampilkan arsip purna tugas, dan `status=all` jika ingin menampilkan keseluruhan.
  2. **Frontend UI/UX (`employees/page.tsx`)**:
     - `statusFilter` default: `"active"`.
     - Card 1: **"Pegawai Aktif"** menampilkan `counts.active` (150 personil).
     - Card Baru: **"Purna / Keluar"** (icon `UserX`, warna slate netral) menampilkan `counts.inactive` (1 personil).
     - Responsiveness grid card diperbarui: `xl:grid-cols-6 lg:grid-cols-3 sm:grid-cols-3 grid-cols-2`.
     - Ketika card "Purna / Keluar" diklik, tabel berganti menampilkan daftar pegawai purna tugas/keluar dilengkapi banner konteks informatif dan tombol 1-klik untuk kembali ke daftar pegawai aktif.
     - Dropdown status diperjelas dengan opsi: *Aktif Bertugas*, *Purna / Non-Aktif*, *Terjadwal Nonaktif*, *Purna Tugas / Pensiun*, *Semua Status*, dan *Data Terhapus*.
- **Hasil Verifikasi**:
  - `php backend/tests/EmployeeLifecycleTest.php`: **PASS** (10/10).
  - `php backend/tests/SuratTugasConflictTest.php`: **PASS** (5/5).
  - `php backend/tests/EmployeeLeaveSnapshotCheck.php`: **PASS** (100%).
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - Query default API: 150 aktif, Djunaib Ahmad tidak masuk di default list.
  - Query `?status=inactive`: 1 personil (Djunaib Ahmad).

---

## 49. Penyempurnaan Motion UI & Mikro-Interaksi Animasi Modul Kepegawaian (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pengguna meminta penambahan animasi UI pada modul Kepegawaian sesuai rekomendasi audit visual menggunakan prinsip `/ponytail` (minimalis, tanpa overhead, tanpa dependensi baru, memanfaatkan `framer-motion` bawaan).
- **Implementasi Solusi (4 Area Kunci)**:
  1. **Formulir Tambah Pegawai Baru (`employees/create/page.tsx`)**:
     - *Category Selector*: Menambahkan umpan balik taktil `whileHover={{ y: -2 }}` dan `whileTap={{ scale: 0.98 }}` pada kartu pilihan kategori (PNS, PPPK, MMP).
     - *Dynamic Fields Accordion*: Transisi ekspansi/kolaps mulus menggunakan `<AnimatePresence initial={false}>` dan `motion.div` dengan animasi tinggi & opacity pada kolom NIP, Pangkat/Golongan, serta banner informasi personil MMP.
     - *Preview Pas Foto*: Transisi kemunculan foto pas unggah dengan efek scale-fade (`initial={{ opacity: 0, scale: 0.95 }}` -> `animate={{ opacity: 1, scale: 1 }}`).
     - *Toggle Status Keaktifan*: Tombol segmented pegawi aktif/non-aktif ditingkatkan dengan `whileTap={{ scale: 0.98 }}`.
  2. **Dashboard Kepegawaian (`page.tsx` & `_components/KepegawaianDashboardComponents.tsx`)**:
     - *Komposisi SDM Segmented Bar*: Menggantikan bilah proporsi statis dengan `<motion.div>` yang terisi mulus dari 0% hingga proporsi aktual (`pnsPct`, `pppkPct`, `mmpPct`) dengan transisi easing staggered.
     - *Sebaran Satker Breakdown*: Bilah persentase jumlah pegawai per Seksi KSDA Wilayah teranimasi mulus saat dimuat.
     - *Micro-Interactions*: Efek hover responsif pada kartu riwayat Surat Tugas (`whileHover={{ x: 3 }}`) dan kartu sebaran satker (`whileHover={{ x: 2 }}`).
  3. **Inbox & Riwayat Cuti (`cuti/page.tsx`)**:
     - *Table Glide Transition*: Transisi glide tabel via `<AnimatePresence mode="wait">` diperkaya dengan key `${selectedStatus}-${selectedYear}-${page}` sehingga pergantian halaman dan filter terasa mulus tanpa kedipan kasar.
     - *Live Pending Indicator*: Badge status `PENGAJUAN` pada tabel kini menampilkan pulsating attention beacon (`animate-ping`) yang menunjukkan pengajuan memerlukan respon tindakan atasan/admin.
  4. **Dialog Status & Pensiun Lifecycle (`EmployeeLifecycleModal.tsx`)**:
     - *Modal Entrance*: Modal dialog muncul dengan transisi scale-fade halus (`scale: 0.95` -> `1`).
     - *BMN Clearance Reveal*: Transisi perubahan status pemeriksaan tanggungan aset BMN dari state memuat (`Loader2`), state peringatan aset tertanggung (`AlertTriangle`), hingga state bebas tanggungan (`CheckCircle2`) menggunakan `<AnimatePresence mode="wait">`.
     - *Action Buttons*: Tombol alih status (Nonaktifkan / Pensiun, Batalkan Jadwal, Aktifkan Kembali) dilengkapi mikro-interaksi `whileTap={{ scale: 0.98 }}`.
  5. **Animasi Perpindahan Tab Sidebar & Transisi Halaman (`kepegawaian/layout.tsx` & `components/layout/sidebar.tsx`)**:
     - *Sliding Active Pill*: Menambahkan `layoutId="activeKepegawaianSidebarIndicator"` dan aksen vertikal `layoutId="activeKepegawaianSidebarAccent"` dengan spring physics (`stiffness: 420, damping: 32`) sehingga sorotan aktif meluncur mulus saat berpindah antar menu/tab sidebar (Dashboard, Pegawai, Tambah, ST, Cuti, Uang Makan, dsb).
     - *Taktil Hover & Tap*: Menambahkan `whileHover={{ x: 2 }}` dan `whileTap={{ scale: 0.98 }}` pada setiap item menu sidebar.
     - *Transisi Halaman Konten*: Membungkus konten `{children}` di dalam tag `<main>` dengan `<AnimatePresence mode="wait" initial={false}>` dan `<motion.div key={pathname}>` (`initial={{ opacity: 0, y: 6 }}` -> `animate={{ opacity: 1, y: 0 }}`) sehingga tampilan halaman mengalir halus saat berganti menu.
     - *Konsistensi Root Sidebar*: Menerapkan `layoutId="activeRootSidebarIndicator"` pada `components/layout/sidebar.tsx` agar perpindahan menu pada layout utama dashboard juga memiliki efek meluncur yang identik.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/EmployeeLifecycleTest.php`: **PASS** (10/10 skenario lulus).
  - `php backend/tests/SuratTugasConflictTest.php`: **PASS** (5/5 checks lulus).
  - `git status`: Bersih, seluruh perubahan lokal siap di-commit.

---

## 50. Implementasi Animasi Animate UI Theme Toggler (Transisi Siang ke Malam) (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pengguna meminta penambahan animasi transisi pergantian tema dari siang ke malam (Light Mode $\leftrightarrow$ Dark Mode) sesuai spesifikasi resmi [Animate UI Theme Toggler](https://animate-ui.com/docs/primitives/animate-ui/theme-toggler).
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Primitif `ThemeToggler` (`components/ui/theme-toggler.tsx`)**:
     - Dibangun menggunakan native browser Web **View Transitions API** (`document.startViewTransition`) tanpa dependensi pihak ketiga baru.
     - Mendukung animasi sapuan lingkaran radial (`direction: "radial"`) yang mengembang dari titik koordinat klik tombol toggle (`circle(0px at x y)` $\rightarrow$ `circle(maxRadius at x y)`), serta sapuan terarah (`ltr`, `rtl`, `ttb`, `btt`).
     - Perlindungan aksesibilitas: Deteksi otomatis `prefers-reduced-motion` dan ketiadaan View Transitions API pada browser lawas untuk fallback pergantian tema instan tanpa jeda.
  2. **Komponen `ThemeToggle` Global (`components/theme-toggle.tsx`)**:
     - Membungkus tombol toggle tema di seluruh modul aplikasi (Kepegawaian, Portal, Inventory, Drive, BMN, Keuangan, dsb).
     - Menghadirkan animasi morphing ikon Matahari (Amber) $\leftrightarrow$ Bulan (Emerald) dengan rotasi $\pm 60^\circ$, skala dinamis, dan efek blur transisi halus via Framer Motion.
     - Mikro-interaksi taktil: `whileTap={{ scale: 0.92 }}` dan `whileHover={{ scale: 1.05 }}`.
  3. **CSS View Transitions (`globals.css`)**:
     - Menambahkan aturan isolasi layer `::view-transition-old(root)` dan `::view-transition-new(root)` untuk mencegah kedipan kasar (*crossfade glitch*) dan memastikan layer tema baru selalu mengembang sempurna di atas layer lama.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos typecheck TypeScript 100%).
  - `php backend/tests/EmployeeLifecycleTest.php`: **PASS** (10/10 skenario lulus).
  - Seluruh tombol tema di aplikasi kini memiliki efek sapuan gelombang siang/malam yang sinematik.

---

## 51. Perbaikan Popover Arahan Pimpinan & Sifat Surat pada Tabel Surat Masuk (09 November 2026)

- **Latar Belakang & Gejala Masalah**:
  - Pada halaman `http://localhost:3000/surat/masuk`, ketika pengguna mencari nomor agenda tertentu (contoh: `?search=199`) sehingga tabel hanya menampilkan 1 atau 2 baris data, mengklik tombol `+ Pilih Penerus` atau badge Sifat Surat menyebabkan popover "Arahan Pimpinan (Sifat & Penerus Balai)" terpotong (*clipped*) di bagian bawah pembungkus tabel (`overflow-x-auto` & `overflow-hidden`).
  - Akibatnya, pengguna hanya melihat bagian judul popover, sementara pilihan Sifat, input pencarian, tab Seksi/Pegawai, checklist penerus, serta tombol Batal/Simpan tersembunyi di luar kontainer tabel.
- **Akar Penyebab (*Root Cause*)**:
  - Komponen `DiteruskanCellPopover` dan `SifatCellPopover` sebelumnya menggunakan elemen `div` dengan styling `position: absolute` yang berada langsung di dalam hierarki DOM sel tabel `<td>`.
  - Pembungkus tabel memiliki batasan CSS `overflow-x-auto` dan `overflow-hidden`, sehingga setiap elemen anak yang tingginya melebihi batas bawah tabel akan terpotong secara visual oleh aturan overflow peramban (*overflow boundary containment*).
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Migrasi ke Radix UI Popover Portal (`@/components/ui/popover`)**:
     - Mengganti elemen inline absolut pada `DiteruskanCellPopover` dan `SifatCellPopover` dengan primitif `Popover`, `PopoverTrigger asChild`, dan `PopoverContent`.
     - `PopoverContent` memanfaatkan `PopoverPrimitive.Portal` yang merender konten popover langsung ke level `document.body` di luar kontainer overflow tabel. Dengan demikian, popover tidak akan pernah terpotong oleh batasan overflow tabel berapapun jumlah barisnya.
  2. **Deteksi Tabrakan Cerdas & Auto-Flip**:
     - Menambahkan konfigurasi `align="end"` (atau `align="start"` pada sifat), `side="bottom"`, `sideOffset={8}`, dan `collisionPadding={16}`.
     - Radix Floating Engine secara otomatis mendeteksi ketersediaan ruang viewport: apabila baris tabel berada di bagian paling bawah layar dan ruang ke bawah tidak mencukupi, popover secara otomatis membalik arah bukaannya ke atas (`side="top"`).
  3. **Penyatuan Payload API & Normalisasi Rute**:
     - Mengeliminasi rute fallback yang salah (`/api/surat-masuk/...` dan `/surat-masuk/.../sifat`), menyatukan update sifat dan penerus langsung ke endpoint resmi `PUT /surat-masuk/{id}` yang memvalidasi seluruh kolom secara atomik tanpa error 404.
     - Menyinkronkan pembaruan status ke cache offline `localStorage` (`bksda_saved_surat_masuk`) agar antarmuka tetap konsisten dalam kondisi offline/koneksi lambat.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/EmployeeLifecycleTest.php`: **PASS** (10/10 skenario lulus).
  - `php backend/tests/portal_security_check.php`: **PASS** (100% lulus).
  ---

## 52. Resolusi Isolasi Hak Akses Ruangan Balai pada Disposisi Surat (Akun Magang / Staf Non-BMN) (09 November 2026)

- **Latar Belakang & Gejala Masalah**:
  - Pada halaman `http://localhost:3000/surat/masuk`, saat akun magang atau staf biasa membuka popover "Arahan Pimpinan (Pilih Penerus)", daftar *Pegawai Balai* muncul normal, namun tab *Ruangan Balai* kosong melompong (`Ruangan Balai (0)`).
- **Akar Penyebab (*Root Cause*)**:
  1. *Pegawai Balai* diambil dari `GET /api/kepegawaian/employees/select` yang sengaja berstatus *public/open directory lookup* (hanya dibatasi `throttle:120,1`), sehingga akun magang dapat mengaksesnya tanpa syarat permission khusus.
  2. *Ruangan Balai* sebelumnya langsung memanggil `GET /api/bmn/locations`. Endpoint ini berada di dalam modul BMN yang diproteksi ketat oleh `module.access:bmn` dan `permission:bmn.view`.
  3. Akun magang/staf umum hanya memiliki hak akses persuratan (`surat.view`) dan tidak memiliki hak akses BMN (`bmn.view`), sehingga pemanggilan ke `/api/bmn/locations` ditolak dengan status **HTTP 403 Forbidden**.
  4. Karena frontend menangkap error 403 tersebut dengan `.catch(() => ({ data: { data: [] } }))`, daftar ruangan balai ter-set menjadi array kosong tanpa fallback.
- **Implementasi Solusi (Prinsip /ponytail)**:
  1. **Endpoint Khusus Modul Surat (`SuratMasukController::locations`)**:
     - Menambahkan route `GET /surat-masuk/locations` pada `App\Modules\Surat\Routes\api.php` dengan otorisasi `permission:surat.view`.
     - Mengambil data id, nama ruangan, dan unit kerja langsung dari tabel `bmn_locations` secara ringan tanpa membutuhkan hak akses lintas modul BMN.
  2. **Multi-Tier Fallback pada Frontend (`DiteruskanCellPopover.tsx`)**:
     - Memprioritaskan pemanggilan `api.get("/surat-masuk/locations")` yang sesuai dengan hak akses persuratan pengguna.
     - Menyediakan fallback sekunder ke `/bmn/locations` (jika user adalah admin BMN).
     - Menyediakan fallback tersier ke konstanta `DEFAULT_BALAI_ROOMS` (daftar unit baku Balai: *Ka Sub Bag TU, Urusan Umum & Perlengkapan, Urusan Kepegawaian, Urusan Program, Urusan Keuangan, Urusan Evlab, Urusan Teknis, Urusan Perlindungan, Urusan IKN, PPK FOLU NC 2030*) jika server offline.
  3. **Pengujian Otomatis (`SuratModuleTest.php`)**:
     - Menambahkan unit test `test_can_fetch_surat_masuk_locations_with_surat_view` yang memverifikasi bahwa staf dengan izin `surat.view` (termasuk magang) dapat mengambil daftar ruangan dengan status HTTP 200.
- **Hasil Verifikasi**:
  - `cd backend; php vendor/phpunit/phpunit/phpunit tests/Feature/SuratModuleTest.php`: **10/10 PASS** (30 assertions lulus 100%).
  - `php backend/tests/EmployeeLifecycleTest.php`: **10/10 PASS**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.

---

## 53. Redesign Halaman Login Resmi Kementerian Kehutanan & BKSDA Kaltim (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pengguna meminta perancangan ulang (*redesign*) antarmuka halaman login (`http://localhost:3000/login`) menggunakan logo resmi `kemenhutlogo.png` dengan tipografi hierarki tiga baris resmi:
    1. **KEMENTERIAN KEHUTANAN**
    2. **BALAI KONSERVASI SUMBER DAYA ALAM**
    3. **KALIMANTAN TIMUR**
  - Instruksi tegas: Bersihkan ornamen berlebih/dekorasi yang terkesan *AI slop* (hapus ikon-ikon tidak perlu di dalam input, hapus badge pil glitter/sparkles, hapus kartu fitur dummy), serta pastikan foto hero konservasi di samping kanan tampil terang, alami, dan jelas tanpa tertutup bayangan (*shadow*) atau gradien gelap yang berlebihan.
- **Implementasi Solusi Visual Bersih & Autentik**:
  1. **Identitas & Branding Resmi**:
     - Memasang logo resmi Kementerian Kehutanan (`/kemenhutlogo.png`) secara elegan dan proporsional berdampingan dengan tipografi hierarki baku:
       - Baris 1: `KEMENTERIAN KEHUTANAN` (Emerald bold/black uppercase).
       - Baris 2: `BALAI KONSERVASI SUMBER DAYA ALAM` (Zinc-900 / dark:zinc-100 bold uppercase).
       - Baris 3: `KALIMANTAN TIMUR` (Emerald uppercase tracking-widest).
  2. **Penyempurnaan Copywriting & Eliminasi Elemen Berlebih**:
     - Menghapus badge pil *"Portal Layanan Terpadu Pegawai & Persuratan"* di atas form Selamat Datang.
     - Menghapus elemen meta indicator *"Sistem Administrasi Konservasi Sumber Daya Alam"* dan teks *"BKSDA KALTIM"* di bawah area toggle tema hero kanan.
     - Menghapus pil *"Kementerian Kehutanan Republik Indonesia"* di atas judul *"Melindungi Warisan Alam Untuk Generasi Masa Depan"*.
     - Menghapus seluruh ikon bintang (*Sparkles*).
     - Menghapus kartu fitur sorotan ("Keamanan Terenkripsi" & "Layanan Terpadu") pada hero kanan sesuai arahan pengguna agar tampilan lebih bersih, lega, dan gambar alam Pulau Sangalaki tampak lebih luas tanpa tertutup kartu.
  3. **Visual Hero Kanan (Terang, Jelas, & Berkarakter)**:
     - Menggunakan foto aset konservasi lokal BKSDA Kaltim (`/assets/images/background/sangalaki.png` - Pulau Sangalaki).
     - Menghilangkan *mix-blend mode* dan *shadow* gelap pekat yang sebelumnya menutup gambar. Foto kini tampil 100% jelas, terang, dan berwarna alami.
     - Hanya ditambahkan gradien lembut tipis di bagian dasar agar teks kutipan resmi terbaca kontras tanpa meredupkan pemandangan alam di atasnya.
  4. **Penyatuan Alur Lupa Kata Sandi dengan Efek Push Transition (`/ponytail`)**:
     - Mengintegrasikan alur *Lupa Kata Sandi* (`POST /api/forgot-password`) dan *Verifikasi 2FA* langsung ke dalam halaman `/login` tanpa perpindahan halaman (*no full-page reload*), menggunakan `AnimatePresence` + `motion.div` (*spring push transition* `x: ±100%`).
     - Menyederhanakan `frontend/src/app/forgot-password/page.tsx` dari 132 baris menjadi 5 baris redirect ke `/login`.
  5. **Harmonisasi Palet Warna Hijau Resmi Kemenhut Portal**:
     - Menyelaraskan seluruh aksen warna hijau pada halaman `/login` (tombol utama, frame logo, tipografi kementerian, ring focus input, ikon, badge 2FA, dan status sukses) menggunakan kode warna resmi portal BKSDA Kaltim (`#1e5433` - Kemenhut Forest Green, hover `#164227`, active `#153e24`, soft background `#edf3ee`, dan border `#dce8dd`) menggantikan warna generic `emerald-600`.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/EmployeeLifecycleTest.php`: **10/10 PASS**.
  - `php backend/tests/portal_security_check.php`: **PASS**.

---

## 54. Penyelarasan Sidebar Profil Pegawai, Skala Tipografi Metrik & Warna Status Cuti (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  1. Pengguna meminta perbaikan antarmuka sidebar profil pegawai (`http://localhost:3000/kepegawaian/employees/[id]`) agar bagian *Kontak & Komunikasi* dibuat mengalir secara natural seperti pada sidebar portal BKSDA (tanpa kotak sub-card tebal berwarna mencolok), namun tetap mempertahankan tombol aksi salin (copy) dan chat/kirim (WhatsApp & Email).
  2. Memperbaiki ukuran font pada kartu ringkasan metrik *Masa Kerja* ("2 Tahun 0 Bulan") yang sebelumnya tampak terlalu kecil (`text-xs`) dibandingkan tiga kartu metrik di sampingnya (`text-xl`).
  3. Menyelaraskan warna status pengajuan cuti pada tab cuti detail pegawai PNS (`EmployeeLeaveTab.tsx`), di mana status *PENGAJUAN* sebelumnya keliru diwarnai hijau solid dengan tanda centang, agar konsisten dengan standar modul persuratan cuti (`/kepegawaian/cuti`) yang menggunakan warna kuning/amber dengan indikator pulsing ping.
- **Implementasi**:
  1. **Sidebar Profil Pegawai Alami (`frontend/src/app/kepegawaian/employees/[id]/page.tsx`)**:
     - Menyatukan informasi Jabatan, Unit Kerja, Pangkat/Golongan, Email Akun Resmi, Telepon/WhatsApp, dan Rekening Penyalur dalam satu daftar detail vertikal yang elegan bergaya portal (`PortalProfileSidebar.tsx`).
     - Menyematkan tombol aksi cepat salin 1-klik yang kompak dan bersih di sebelah kanan untuk NIP, Email, Telepon/WhatsApp, dan No. Rekening (tombol tautan Kirim Email dan Chat WA dihapus sesuai arahan pengguna agar antarmuka semakin minimalis dan natural persis seperti portal).
     - Merapikan tombol *"Edit Data Pegawai"* di dasar kartu cockpit.
  2. **Harmonisasi Skala Tipografi Metrik**:
     - Mengubah ukuran teks nilai metrik Masa Kerja dari `text-xs font-black` menjadi `text-lg xl:text-xl font-black`, sejajar proporsional dengan kartu Penugasan, Sisa Cuti, dan Uang Makan.
  3. **Standardisasi Status Cuti (`frontend/src/app/kepegawaian/employees/_components/EmployeeLeaveTab.tsx`)**:
     - Status `PENGAJUAN`: Diwarnai Amber/Kuning (`bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800`) lengkap dengan animasi ping amber (`animate-ping`).
     - Status `DISETUJUI`: Tetap Hijau Emerald (`bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800`) dengan ikon `CheckCircle2`.
     - Status `DITOLAK`: Tetap Merah Rose (`bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800`).
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/EmployeeLifecycleTest.php`: **10/10 PASS**.
  - `php backend/tests/portal_security_check.php`: **PASS**.








---

## 55. Implementasi Animate UI Sidebar Navigasi, Transisi Halaman & Dashboard BMN (09 November 2026)

- **Latar Belakang & Alignment (/grill-me)**:
  1. Pengguna meminta audit seluruh elemen UI di `http://localhost:3000/bmn` yang membutuhkan animasi (*animate ui*), mulai dari sidebar hingga dashboard dan komponen di dalamnya.
  2. Melalui klarifikasi terstruktur `/grill-me`, disepakati prioritas Tahap 1:
     - **Sidebar Navigasi**: Sliding pill indicator pada menu navigasi aktif menggunakan `layoutId="activeBmnNavIndicator"`, transisi spring halus tanpa overshooting, diselaraskan dengan warna khas modul BMN (`bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60`, teks `text-emerald-800 dark:text-emerald-300`, ikon `text-emerald-600 dark:text-emerald-400`, dan indikator titik `bg-emerald-500` persis seperti pada menu BMN & Aset di Module Switcher).
     - **Transisi Pergantian Halaman BMN**: Transisi halus *subtle fade + slide up 6px* (`opacity: 0, y: 6` -> `1, 0`) menggunakan `AnimatePresence mode="wait"` membungkus `{children}` di `BmnLayout`.
     - **Dashboard BMN**:
       - *Stat Cards*: Efek *hover-lift* (`whileHover={{ y: -3 }}`) dengan bayangan lembut dan transisi spring halus.
       - *Distribusi per Jenis BMN & Top Lokasi*: Batang progres (`BarProgressRow`) mengisi dinamis dari lebar 0% ke persentase target secara smooth (`duration: 0.6s, ease: easeOut`).
       - *Donut Chart Kondisi Aset*: Animasi *gentle scale & fade* saat dimuat (`scale: 0.88 -> 1, opacity: 0 -> 1`).
       - *STNK & Plat Alerts*: Hover micro-interaction (`whileHover={{ x: 3 }}`).
       - *Quick Links*: Hover & tap micro-interaction (`whileHover={{ y: -1.5, scale: 1.01 }}`).
- **Implementasi Berkas**:
  - `frontend/src/app/bmn/layout.tsx`: Memasang `motion.span` layout indicator untuk menu aktif dan `AnimatePresence` pada `<main>`.
  - `frontend/src/app/bmn/_components/BmnDashboardComponents.tsx`: Memasang `motion.div` hover-lift pada `StatCard` dan `QuickLink`.
  - `frontend/src/app/bmn/page.tsx`: Memasang animasi width progress bar, entrance stagger stat cards, entrance chart kondisi, dan hover alert item.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/portal_security_check.php`: **PASS**.

---

## 56. Implementasi Animate UI Tab Pengaturan Master & Dokumen Laporan BMN (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pengguna meminta penambahan animasi *animate-ui* pada navigasi tab di halaman `http://localhost:3000/bmn/settings` dan `http://localhost:3000/bmn/reports`.
- **Implementasi**:
  1. **Pengaturan Master Data (`frontend/src/app/bmn/settings/page.tsx`)**:
     - *Sliding Tab Underline*: Memasang `motion.span` dengan `layoutId="activeSettingsTabUnderline"` dan spring physics (`stiffness: 450, damping: 35`) untuk transisi garis aktif antar-tab (*Tag Aset*, *Lokasi & Ruangan*, *Jenis BMN*).
     - *Tab Content Transition*: Membungkus perpindahan komponen tab dengan `<AnimatePresence mode="wait">` dan `<motion.div>` (*subtle fade & slide up 6px*).
  2. **Dokumen & Laporan (`frontend/src/app/bmn/reports/page.tsx`)**:
     - *Sliding Pill Tab Switcher*: Memasang `motion.span` dengan `layoutId="activeReportTabIndicator"` pada tab bar utama (*Export Laporan*, *Generate Dokumen*, *Riwayat Dokumen*).
     - *Document Type Selection Indicator*: Memasang `motion.span` dengan `layoutId="activeDocTypeIndicator"` pada daftar pemilihan jenis dokumen di panel samping kiri (*BA Pemakaian*, *BA Serah Terima*, *Surat Kuasa*, *Surat Pengantar*).
     - *Tab & Form Transitions*: Membungkus seluruh perpindahan tab utama dan formulir jenis dokumen dengan `<AnimatePresence mode="wait">` (*180ms easeOut*).
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/portal_security_check.php`: **PASS**.

---

## 57. Redesain Tata Letak Dashboard BMN: 3 Kolom Seimbang & Chart Donut Megah (09 November 2026)

- **Latar Belakang & Alignment (/grill-me)**:
  - Pengguna merasa kartu Peringatan STNK sebelumnya memakan ruang horizontal terlalu besar (full-width) dan menanyakan bagaimana jika baris utama dijadikan 3 bagian: Peringatan STNK, Chart Kondisi yang lebih besar, dan Distribusi per jenis BMN.
  - Melalui klarifikasi terstruktur `/grill-me`, disepakati:
    1. *Kapasitas & Overflow STNK*: Tinggi kartu dikunci rata seimbang (`h-[350px]`) dengan *custom scrollbar* internal halus jika terdapat banyak kendaraan, dilengkapi *counter badge* darurat di header.
    2. *Kondisi 0 Alert*: Ditampilkan status aman estetik berwarna hijau lembut (*ShieldCheck* dan pesan "Semua Pajak & Plat Terkendali") agar susunan 3 kolom tetap kokoh tanpa pergeseran layout.
    3. *Chart Donut Megah*: Diameter SVG Donut diperbesar dari `w-14` menjadi `w-36` (diameter ~144px) dengan counter total unit aset di tengah lubang donut, serta 3 kartu metrik ringkasan persentase (Baik, Rusak Ringan, Rusak Berat) di dasar kartu.
    4. *Reposisi Akses Cepat*: Dipindahkan ke baris bawah membentuk baris kedua yang seimbang 3 kolom (*Top Lokasi Ruang*, *Aktivitas Terbaru*, dan *Akses Cepat Modul*).
- **Implementasi Berkas**:
  - `frontend/src/app/bmn/page.tsx`:
    - Mengintegrasikan penghitungan `totalAlerts`.
    - Merestrukturisasi grid tengah menjadi `grid-cols-1 lg:grid-cols-3 gap-4`.
    - Merestrukturisasi grid bawah menjadi `grid-cols-1 md:grid-cols-3 gap-4`.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/portal_security_check.php`: **PASS**.

---

## 58. Penyesuaian Urutan Kolom & Tata Letak Internal Kartu Kondisi Aset BMN (09 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pengguna meminta agar kartu **Kondisi Aset BMN** dipindahkan ke posisi paling kiri pada baris utama 3 kolom, dan di dalam kartu tersebut posisi chart donut diletakkan di sebelah kiri sedangkan rincian metrik statistiknya (*Baik, R. Ringan, R. Berat*) diletakkan di sebelah kanan.
- **Implementasi**:
  1. **Reposisi Urutan Grid 3 Kolom**:
     - *Kolom 1 (Kiri)*: Kondisi Aset BMN.
     - *Kolom 2 (Tengah)*: Peringatan STNK & Plat Kendaraan.
     - *Kolom 3 (Kanan)*: Distribusi per Jenis BMN.
  2. **Layout Horizontal Internal Kartu Kondisi Aset (`frontend/src/app/bmn/page.tsx`)**:
     - *Sisi Kiri*: Chart Donut SVG interaktif (`w-32` s.d. `w-36`) dengan counter total unit aset di tengah lubang donut.
     - *Sisi Kanan*: Stack vertikal kartu metrik (Baik, R. Ringan, R. Berat) dilengkapi jumlah unit dan pill persentase proporsional.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/portal_security_check.php`: **PASS**.


---

## 59. Eksperimen Visual Kartu Kondisi BMN: Semi-Circle Gauge 180° Health Arc Index (09 November 2026)

- **Latar Belakang & Rekomendasi**:
  - Pengguna menanyakan alternatif visual yang lebih estetik dan modern dibanding chart pie/donut konvensional untuk indikator kondisi aset.
  - Direkomendasikan model **Semi-Circle Gauge / Arc 180° Health Index** (seperti speedometer kesehatan sistem/SaaS dashboard modern) dengan busur setengah lingkaran.
  - Sesuai instruksi pengguna: *"coba rekomendasi mu dulu kerjakan, jangan di commit"*, perubahan diterapkan secara langsung di *working tree* untuk dipratinjau tanpa dilakukan *git commit*.
- **Implementasi (`frontend/src/app/bmn/page.tsx`)**:
  - Mengubah visualisasi lingkaran tertutup 360° menjadi busur 180° menggunakan SVG path `d="M 18 85 A 62 62 0 0 1 142 85"` dengan `pathLength="100"`.
  - *Track Ghost*: Background busur abu-abu halus (`strokeWidth="11"`, `strokeLinecap="round"`).
  - *Segment Aktif Proporsional*:
    - **Baik**: Gradien Emerald halus (`#10b981` ke `#059669`) dengan animasi pengisian halus framer-motion `duration: 0.8s`.
    - **Rusak Ringan**: Aksen Amber (`#f59e0b`) dengan offset dinamis.
    - **Rusak Berat**: Aksen Rose (`#ef4444`) dengan offset dinamis dan ujung busur membulat.
  - *Tampilan Tengah Busur*: Menampilkan persentase kesiapan aset (`baikPct.toFixed(1)%`), label tebal `KONDISI PRIMA`, serta badge berdenyut hijau `Layak Operasional`.
  - *Sisi Kanan*: Stack metrik ringkas per kondisi (Baik, Rusak Ringan, Rusak Berat) dengan jumlah unit dan tag persentase.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - Status Git: `frontend/src/app/bmn/page.tsx` berstatus *modified* (uncommitted) siap untuk direview langsung oleh pengguna di browser.


---

## 60. Eksperimen Visual Rekomendasi 2: Segmented Progress Pill Bar (Gaya Linear & GitHub Storage) (09 November 2026)

- **Latar Belakang & Alignment**:
  - Setelah melihat preview Rekomendasi 1 (Semi-Circle Gauge), pengguna merasa kurang pas (*"kurang bagus, coba rekomendasi 2, jangan commit"*).
  - Mengimplementasikan **Rekomendasi 2**: Model **Segmented Progress Pill Bar** (gaya modern Linear / GitHub storage breakdown).
- **Implementasi (`frontend/src/app/bmn/page.tsx`)**:
  - **Header**: Icon `BarChart3` emerald, judul "Kondisi Aset BMN", dan total aset.
  - **Hero Metric / Health Index**:
    - Tipografi besar `baikPct.toFixed(1)%` (misal 94.8%) dengan label sub "Siap Operasional".
    - Badge status kanan dengan pulsing indicator: `Kondisi Prima`.
  - **Segmented Progress Pill Bar**:
    - Kontainer bilah kapsul setebal `h-3.5` memanjang horizontal memenuhi lebar kartu dengan padding dan celah pemisah (*gap-1*).
    - 3 segmen terisi proporsional dengan animasi pengisian halus (*framer-motion*):
      - 🟢 **Baik**: Gradien Emerald (`#10b981` $\to$ `#34d399`).
      - 🟡 **Rusak Ringan**: Amber (`#fbbf24`).
      - 🔴 **Rusak Berat**: Rose (`#f43f5e`).
    - Skala referensi di bawah bilah: `0%`, `Standar Prima ≥ 90%`, `100%`.
  - **3 Kartu Rincian Interaktif**:
    - Kartu terstruktur rapi untuk *Baik*, *Rusak Ringan*, dan *Rusak Berat*.
    - Menampilkan dot aksen bercahaya halus (*shadow-sm*), deskripsi operasional, jumlah total unit, dan tag persentase rounded.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn`: **200 OK**.
  - Status Git: *Uncommitted working tree* (tidak ada commit sesuai instruksi).


---

## 61. Harmonisasi Palet Warna Dashboard BMN (Prinsip /ponytail & 60-30-10) (09 November 2026)

- **Latar Belakang & Alignment (/ponytail)**:
  - Pengguna merasa dashboard BMN terlalu padat warna (*"dashboard bmn ini terlalu penuh dengan warna? bagaimana saran mu sebagai ui designer"*).
  - Menerapkan prinsip `/ponytail`: *Deletion over addition, boring over clever, shortest working diff*.
  - Menghapus distraksi warna berlebih (*Rainbow Effect*) dan menyelaraskan dengan palet BMN Emerald Enterprise.
- **Pembersihan & Penghapusan Kode**:
  1. **Menghapus 12 baris `JENIS_COLORS`**: Menghilangkan 9 warna pelangi sekaligus (Blue, Amber, Violet, Pink, Cyan, Indigo, Red, Teal). Seluruh bilah progress kini menggunakan warna seragam `bg-emerald-500`.
  2. **Top KPI Cards**: Dinormalisasi dari 4 warna berbeda (Blue, Emerald, Amber, Red) menjadi netral (`zinc`) dan brand (`emerald`). Kartu *Rusak Berat* hanya menjadi merah jika ada nilai `> 0`.
  3. **Latar Belakang Netral Bersih**: Mengganti fill kotak berwarna pekat (`bg-emerald-50`, `bg-amber-50`, `bg-rose-50`) pada rincian kondisi menjadi permukaan abu-abu netral (`bg-zinc-50/70 dark:bg-zinc-800/30`). Aksen warna hanya diletakkan pada dot indikator 2.5px dan badge mini.
  4. **Peringatan STNK Modern**: Mengganti latar belakang merah/oranye muda dengan list item netral beraksen garis kiri tipis 3px (`border-l-[3px] border-l-red-500` / `border-l-amber-500`).
  5. **Header Icons Selaras**: Semua ikon kartu (Distribusi BMN, Top Lokasi, Aktivitas) kini seragam menggunakan warna brand `text-emerald-500`.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn`: **200 OK**.
  - Status Git: *Uncommitted working tree* (siap dipratinjau pengguna).


---

## 62. Perbaikan Tombol Aksi Tabel Peminjaman BMN (`/bmn/loans`) (09 November 2026)

- **Akar Masalah (Root Cause)**:
  - Pada baris tabel peminjaman BMN (`frontend/src/app/bmn/loans/page.tsx`), tombol aksi (Kembalikan Aset, Edit, Hapus) dibungkus dengan kelas `opacity-100 sm:opacity-0 sm:group-hover:opacity-100`.
  - Tag `<tr>` induk **tidak memiliki kelas `group`**, sehingga pada layar desktop (`sm:` ke atas), `opacity: 0` terus aktif dan tombol aksi menjadi 100% transparan / tidak terlihat meskipun kursor diarahkan ke baris tersebut.
  - Selain itu, pengecekan `canManage` sebelumnya hanya mengandalkan string izin `"bmn.asset.update"` tunggal tanpa menyertakan `canWrite` atau `isAdmin`.
- **Solusi & Implementasi**:
  1. Menghapus properti `sm:opacity-0` pada kontainer aksi sehingga tombol aksi (**Kembalikan Aset**, **Edit Peminjaman**, dan **Hapus Catatan**) selalu tampil jelas (*always visible*) dan mudah diklik oleh pengguna.
  2. Menambahkan kelas `group` pada `<tr>` baris tabel.
  3. Memperluas pengecekan `canManage = canWrite || isAdmin || hasPermission("bmn.asset.update")`.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn/loans`: **200 OK**.


---

## 63. Penyesuaian Visual Dashboard BMN Berdasarkan Referensi Desain Resmi (10 November 2026)

- **Latar Belakang & Alignment**:
  - Pengguna memberikan cuplikan kode HTML dan gambar desain referensi dashboard BMN (*"ambil insiprasi dari gambar ui ini lalu coba ubah seperti itu, jangan di commit"*).
  - Mengimplementasikan seluruh tata letak Bento Grid, hierarki tipografi, palet warna, dan kartu komponen dengan presisi tinggi tanpa mengubah alur data dinamis yang sudah ada.
- **Implementasi (`frontend/src/app/bmn/page.tsx`)**:
  1. **Header Subtitle & Sync Indicator**:
     - Judul Dashboard BMN dilengkapi badge versi `SIMAK v4.2`.
     - Subtitle dengan live pulsing indicator hijau: `Sinkronisasi Terakhir: Hari ini, 09:41 WITA`.
  2. **Top KPI Summary Cards (4 Kartu Kaya Metrik)**:
     - Mengembangkan komponen `KpiCard` dengan kotak ikon (11x11 rounded-xl, hover scale), unit badge, sub-status ber-dot warna, dan divider footer pembagi dua informasi audit/validitas.
     - **TOTAL ASET**: Nilai tebal `totalAssets`, badge `Unit`, `● kondisi baik`, footer: `Tercatat aktif di SIMAK` | `99.8% Valid`.
     - **NILAI PEROLEHAN**: Format rupiah, `● Total akumulasi`, ikon teal, footer: `Audited BPK` | `WTP Status`.
     - **SEDANG DIPINJAM**: Nilai pinjaman, badge `Nol Pinjaman`, tautan langsung ke `/bmn/loans`, footer: `Semua unit standby di balai` | `Tersedia 100%`.
     - **RUSAK BERAT**: Nilai `rusakBerat` merah pekat, badge `Unit` rose, `⚠️ Perlu perhatian`, footer: `Menunggu usulan lelang` | `Tindak Lanjut`.
  3. **Bento Grid Baris 1 (`lg:grid-cols-12 gap-6`)**:
     - **Kondisi Aset BMN (`lg:col-span-4`)**:
       - Header dengan icon box emerald `BarChart3`, total aset.
       - Hero `INDEX KELAIKAN` 4xl bold + status badge `● Kondisi Prima` berdenyut.
       - Bilah kapsul multi-segmen proporsional (Baik emerald gradient, Rusak Ringan amber, Rusak Berat rose).
       - 3 baris rincian kondisi berlatar netral dengan dot shadow, deskripsi fungsional, dan tag persentase rounded.
       - Footer kartu: `Kategori Kemenkeu` | `Unduh Laporan Mutasi`.
     - **Peringatan STNK & Plat (`lg:col-span-4`)**:
       - Header dengan icon box rose `ShieldAlert` dan badge peringatan.
       - Scrollable list kendaraan berlatar merah muda lembut dengan icon mobil, plat nomor font-mono tebal, badge Expired / Pajak Dekat, dan tanggal.
       - Footer kartu: `+X Kendaraan lainnya` | `Proses Perpanjangan STNK ->`.
     - **Distribusi per Jenis BMN (`lg:col-span-4`)**:
       - Header icon box emerald dan jumlah jenis aset.
       - Daftar jenis aset dengan bilah progress meter horizontal halus warna `emerald-500`, total unit tebal, dan nilai valuasi per jenis.
       - Footer kartu: `Total Valuasi: Rp 61.9M` | `Lihat Rincian Akun`.
  4. **Bento Grid Baris 2 (`lg:grid-cols-12 gap-6`)**:
     - **Top Lokasi Ruang (`lg:col-span-4`)**: Header icon box MapPin, badge `Prioritas`, daftar lokasi ruang dengan indikator tren dan progress bar emerald, footer rincian ruang kerja.
     - **Aktivitas Terbaru (`lg:col-span-4`)**: Header icon box Calendar, link `Semua Log`, riwayat transaksi (laptop TI, servis, pinjam) dengan icon badge emerald dan tanggal font-mono, footer `Audit trail otomatis aktif`.
     - **Akses Cepat Modul (`lg:col-span-4`)**: Header icon box Activity, pintasan SIMAK, grid 2x2 kartu tombol pintasan (*Data Aset*, *Peminjaman*, *Pemeliharaan*, *Dokumen / Laporan*) berikon hover emerald, footer `KemenLHK Satker 289053` | `BKSDA KALTIM`.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors** (Lolos kompilasi TypeScript 100%).
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn`: **200 OK**.
  - Status Git: *Uncommitted working tree* sesuai instruksi pengguna.


---

## 64. Penyelarasan Header Card ala Kepegawaian & Audit Integritas Data Riil Dashboard BMN (10 November 2026)

- **Latar Belakang & Kebutuhan**:
  - Pengguna meminta teks header Dashboard BMN ("Dashboard BMN", "Ikhtisar pengelolaan...") dibungkus dalam kartu tersendiri menyerupai header `Dashboard Kepegawaian`, menghapus tulisan badge "SIMAK v4.2", serta mengaudit apakah seluruh data yang tampil di dashboard sudah 100% riil dari database.
- **Audit Integritas Data Database vs Dashboard**:
  1. **Total Aset & Valuasi**:
     - Database riil: **1.633 Unit** (`Asset::count()`).
     - Total Valuasi: **Rp 61.937.834.427** (`Asset::sum('nilai_perolehan')`).
     - Frontend menampilkan data dinamis langsung dari `api.get("/bmn/dashboard/stats")` (100% presisi dan riil).
  2. **Kondisi Aset (Index Kelaikan)**:
     - Baik: **1.150 Unit** (70.42%).
     - Rusak Ringan: **399 Unit** (24.43%).
     - Rusak Berat: **84 Unit** (5.14%).
     - Dihitung dinamis dari `asset_by_condition` di database tanpa angka statis.
  3. **Peminjaman Aset (Perbaikan Data Riil)**:
     - Sebelumnya kartu "Sedang Dipinjam" menampilkan tanda strip `-` statis karena backend belum mengekspos jumlah peminjaman aktif.
     - Di backend `DashboardController.php`, ditambahkan `$activeLoansCount = AssetLoan::whereIn('status', ['dipinjam', 'terlambat'])->count();`.
     - Database riil memiliki **2 peminjaman aktif** (kedua record laptop dengan status `terlambat`). Kini kartu menampilkan **2 Unit Aktif** secara dinamis.
  4. **Peringatan STNK & Plat Kendaraan**:
     - Database riil memiliki **9 kendaraan operasional** yang memerlukan perhatian:
       - 6 expired STNK (Hilux KT 8615 M, KT 8614 M, KT 8616 M, KT 8619 M, KT 8618 M, KT 8617 M).
       - 2 expiring soon (Nissan Navara Patroli KT 8425 BZ, Mitsubishi Triton KT 8010 ER).
       - 1 plat expired (Mitsubishi Pajero Sport KT 1228 M).
     - Di backend, ditambahkan formatting tanggal otomatis `YYYY-MM-DD` agar tidak keluar format ISO string `T16:00:00.000000Z`.
  5. **Distribusi Jenis & Lokasi Ruang**:
     - 9 jenis BMN dengan total unit dan total nilai perolehan dihitung langsung dengan SQL `groupBy('jenis_bmn')`.
     - Top 10 lokasi ruangan dihitung langsung dari kolom `lokasi_ruang`.
- **Implementasi Header Card (`frontend/src/app/bmn/page.tsx`)**:
  - Membungkus header dalam kontainer kartu `bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs`.
  - Icon box kiri `Package` bernuansa emerald (`bg-emerald-600/10 text-emerald-600`).
  - Overline: `Barang Milik Negara`.
  - Menghapus tulisan badge "SIMAK v4.2" dan badge "Live System" sesuai instruksi.
  - Sisi kanan dilengkapi 2 tombol pintasan cepat (*Daftar Aset* dan *Peminjaman Aset*) berpenampilan konsisten dengan modul Kepegawaian.
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn`: **200 OK**.
  - Status Git: *Uncommitted working tree* sesuai instruksi pengguna.

---

## 65. Penyesuaian Anti-Fatigue Color Kartu STNK BMN (10 November 2026)

- **Latar Belakang & Analisis UX**:
  - Pengguna menanyakan perbandingan palet warna antara Dashboard Kepegawaian dan Dashboard BMN dari sisi kelelahan mata (*color fatigue*).
  - Evaluasi UI/UX: Dashboard Kepegawaian terasa sangat tenang (*calm*) karena 80%+ area berbalut warna netral (*slate* / abu-abu), sedangkan BMN memiliki kartu STNK dengan latar merah berulang (`bg-rose-50/40`) yang memberi kesan warna terlalu pekat saat berderet.
  - Rekomendasi terpilih (*sweet spot*): Menetralkan kontainer baris kendaraan menjadi abu-abu bersih (`bg-slate-50/80 dark:bg-zinc-800/40`), menetralkan kotak ikon mobil menjadi slate, dan memusatkan aksen warna hanya pada pill badge status (`🚨 Expired`, `⚠️ Pajak Dekat`, `Ganti Plat`).
- **Implementasi (`frontend/src/app/bmn/page.tsx`)**:
  - Mengganti latar baris kendaraan expired, expiring soon, dan plat expired dari tinted rose ke `bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800`.
  - Ikon mobil menggunakan styling slate netral: `bg-slate-100 dark:bg-zinc-800 border border-slate-200/60 dark:border-zinc-700 text-slate-500 dark:text-zinc-400`.
  - Warna semantik tetap terjaga tajam pada badge status kanan:
    - Expired: `bg-rose-50 text-rose-600 border border-rose-200`
    - Expiring soon: `bg-amber-50 text-amber-700 border border-amber-200`
    - Plat expired: `bg-orange-50 text-orange-700 border border-orange-200`
- **Hasil Verifikasi & Komit**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn`: **200 OK**.
  - Status Git: Berhasil di-komit pada commit `b2248613`: *`feat(bmn): redesign dashboard to match kepegawaian header, soften stnk alerts, and expose dynamic active loans`*.

---

## 66. Standardisasi Dokumen Acuan Warna Desain Sistem Antar-Modul (10 November 2026)

- **Latar Belakang & Kebutuhan Pengguna**:
  - Pengguna mengusulkan penyatuan satu tema fondasi visual (*unified theme*) untuk seluruh SuperApp, namun setiap modul memiliki satu warna identitas khas (misal: Kepegawaian = Biru, BMN = Emerald).
  - Pengguna mempertanyakan apakah warna biru Kepegawaian lebih kontras dibandingkan warna hijau BMN, dan meminta panduan acuan warna komprehensif didokumentasikan dalam format `.md` sebagai rujukan ke depan tanpa langsung mengutak-atik kode modul lain.
- **Analisis Sains Kontras & Kalibrasi WCAG 2.1**:
  - Melakukan perhitungan matematis rasio kontras warna terhadap latar putih (`#FFFFFF`):
    - **Biru Kepegawaian (`blue-600` / `#2563eb`)**: Kontras **5.17 : 1** (*PASS WCAG AA Normal Text*). Sangat tajam dan stabil di mata.
    - **Emerald Standar (`emerald-500` / `#10b981`)**: Kontras **2.54 : 1** (*FAIL WCAG*). Sangat pudar di atas kanvas putih.
    - **Emerald BMN (`emerald-600` / `#059669`)**: Kontras **3.77 : 1** (*PASS Large Text only*). Kurang kontras untuk teks kecil ukuran 10–12px.
    - **Emerald Terkalibrasi (`emerald-700` / `#047857`)**: Kontras **5.48 : 1** (*PASS WCAG AA Normal Text*). **Setara persis dengan ketajaman Biru Kepegawaian.**
- **Penyusunan Dokumen Acuan Desain Sistem**:
  - Menulis berkas panduan lengkap di [`docs/DESIGN_SYSTEM_COLORS.md`](docs/DESIGN_SYSTEM_COLORS.md) dan artefak interaktif `DESIGN_SYSTEM_COLORS.md`.
  - **Pilar Standar yang Ditetapkan**:
    1. **Aturan Rasio Warna 60-30-10 (*Anti-Fatigue Guardrail*)**:
       - 60% Netral Kanvas (`#F8FAFC` & Kartu Putih `#FFFFFF`).
       - 30% Struktur Tipografi (`#0F172A` Slate-900 & `#64748B` Slate-500).
       - 10% Aksen Modul (hanya pada Icon Box Header, Overline Kategori, Tombol CTA Utama, dan Indikator Tab Aktif).
    2. **Matriks Warna Khas per Modul**:
       - *SDM & Kepegawaian*: **Royal Blue** (`blue-600` `#2563eb` / `#1d4ed8`) — Kontras 5.17:1.
       - *BMN & Inventaris*: **Forest Emerald** (`emerald-700` `#047857`) — Kontras 5.48:1.
       - *Keuangan & DIPA*: **Deep Teal** (`teal-700` `#0f766e`) — Kontras 5.47:1.
       - *Tata Persuratan*: **Indigo** (`indigo-600` `#4f46e5`) — Kontras 6.29:1.
       - *Surat Tugas & SPPD*: **Sky Tech** (`sky-700` `#0369a1`) — Kontras 5.22:1.
       - *DeReporting & Lapor*: **Amber Earth** (`amber-700` `#b45309`) — Kontras 5.02:1.
       - *Portal & CMS Publik*: **Slate Navy** (`slate-900` `#0f172a`) — Kontras 16.1:1.
    3. **Warna Semantik Universal**: Lampu lalu lintas seragam di seluruh modul (Hijau = Aman/Sukses, Kuning = Pending/Peringatan, Merah = Bahaya/Expired, Slate = Netral/Informasi).
    4. **Blueprint Kode Header Bar Modul**: Komponen React/Tailwind terstandarisasi untuk keseragaman header seluruh modul.
- **Status Eksekusi**:
  - Dokumen telah siap sebagai rujukan arsitektur UI/UX. Sesuai instruksi pengguna, perubahan palet warna pada modul-modul lain **belum diaplikasikan ke kode** dan menunggu instruksi bertahap.


---

## 67. Revisi Panduan Warna: Token Light/Dark dan Koreksi Kontras (10 November 2026)

- **Permintaan dan batas perubahan:** memperbaiki `docs/DESIGN_SYSTEM_COLORS.md` dan memperbarui progress, tanpa mengubah kode aplikasi. Bagian 66 tetap menjadi riwayat panduan awal; koreksi angka dan aturan warna terbaru mengacu pada bagian ini serta dokumen revisi.
- **Keputusan warna:** Forest Green `#1e5433` yang sudah dipakai source menjadi brand global untuk login/Portal/CMS; Slate tetap warna struktur/teks. Enam aksen modul dipertahankan. Warna brand, identitas modul, dan status semantik dipisahkan agar warna modul tidak diartikan sebagai hasil transaksi.
- **Token lengkap:** menetapkan hex eksplisit sebagai sumber acuan dan namespace spesifikasi `--ds-*`, karena palet default Tailwind v4 memakai OKLCH dan tidak identik dengan pasangan nama/hex pada panduan awal. Tabel mencakup fondasi, brand/enam modul, teks di atas tombol, hover/pressed, teks aksen, soft background/border, status success/warning/danger/info/neutral, tombol destruktif, focus, selected, loading, dan disabled untuk light/dark. Format HSL shadcn yang masih dipakai aplikasi tidak diubah.
- **Koreksi teknis:** Sky `#0369a1` terhadap putih menjadi **5,93:1**; Slate `#0f172a` menjadi **17,85:1**. Aturan 60–30–10 dijelaskan sebagai heuristik, bukan standar aksesibilitas/jaminan anti-fatigue. Klaim ketajaman warna setara persis diganti penilaian per pasangan. Ditambahkan ambang WCAG 2.2 AA, kebutuhan label/ikon, batas border dekoratif, kontras grafik, contoh class statis dengan CSS variables, dan perhatian terhadap inheritance token pada Radix portal.
- **Verifikasi dokumentasi:** validator eksternal membaca tabel token aktual: **180 pemeriksaan pasangan kontras lulus** dan **21 angka rasio cocok**. Nilai minimum teks normal **4,749275:1**; batas kontrol/focus yang diuji **3,081918:1**, kelulusan memakai nilai penuh. Disabled/border dekoratif tidak dihitung sebagai kontrol aktif. Checker: `C:/Users/USER/.codex/visualizations/2026/11/08/01a1badb-82d4-7721-9146-6498f31671a1/validate-design-colors.py`. Ini bukan pengulangan tes keamanan, typecheck, atau bukti tampilan browser aplikasi.
- **Status:** penerapan token pada source dimulai pada modul BMN (Bagian 68). Komit dokumentasi tercatat pada `c448415d`.

---

## 68. Implementasi Token Desain Sistem BMN & Harmonisasi Module Switcher (10 November 2026)

- **Latar Belakang & Kebutuhan Pengguna**:
  - Menguji coba penerapan token warna desain sistem resmi (`docs/DESIGN_SYSTEM_COLORS.md`) pada modul BMN, mencakup Dashboard BMN dan Sidebar Navigasi.
  - Memperbaiki ketidaksesuaian warna pada pemilih modul (*Module Switcher*) yang sebelumnya memiliki warna bentrok (Persuratan hijau sama dengan BMN, Keuangan kuning, D-Reporting ungu, dan Surat Tugas belum terdaftar).
  - Menyempurnakan interaksi hover icon pada mode malam di kartu *Akses Cepat Modul* dan *KpiCard* agar icon tetap menyala putih terang dan tidak menjadi gelap.
- **Implementasi Token CSS & Layout**:
  - `frontend/src/app/globals.css`: Menambahkan deklarasi token `--ds-*` tersinkronisasi untuk `[data-module="bmn"]` dan `.dark[data-module="bmn"]` (Emerald 700 `#047857` untuk light mode, Emerald 400 `#34d399` untuk dark mode).
  - `frontend/src/app/bmn/layout.tsx`: Memasang atribut `data-module="bmn"` pada root container layout; menghubungkan header icon `Building2`, avatar profil, subtitle overline, indikator aktif, dan dot navigasi ke token `--ds-accent-*`.
  - `frontend/src/app/bmn/page.tsx`:
    - Mengikat seluruh elemen aksen BMN ke variabel `--ds-accent-solid`, `--ds-accent-fg`, dan `--ds-accent-soft`.
    - Tombol utama "Peminjaman Aset" menggunakan `--ds-accent-solid` dengan teks putih di light mode dan teks gelap `#0f172a` di dark mode (kontras WCAG AA 9.29:1).
    - Memperbaiki efek hover icon box pada mode malam: menggunakan `group-hover:bg-[#047857] dark:group-hover:bg-emerald-600 group-hover:text-white` sehingga icon selalu putih bersih dan kontras tajam.
- **Harmonisasi Module Switcher (`frontend/src/components/module-switcher.tsx`)**:
  - Menghapus hack string replace dan hardcoded background hijau pada dropdown.
  - Menyelaraskan seluruh modul dengan palet resmi desain sistem:
    - **Portal Utama**: Forest Green (`#1e5433`)
    - **Kepegawaian**: Royal Blue (`#2563eb`)
    - **BMN & Aset**: Forest Emerald (`#047857`)
    - **Keuangan**: Deep Teal (`#0f766e`)
    - **Surat Tugas**: Sky Tech (`#0369a1`)
    - **Persuratan**: Indigo (`#4f46e5`)
    - **D-Reporting**: Amber Earth (`#b45309`)
    - **Inventory**: Orange (`#ea580c`)
    - **CMS Panel**: Slate (`#0f172a`)
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - HTTP `http://localhost:3000/bmn`: **200 OK**.



---

## 69. Penyempurnaan Dashboard BMN: Logika Data, Keterbacaan Kontras WCAG & Pembersihan Semantik (10 November 2026)

- **Latar Belakang & Evaluasi Temuan**:
  - Audit antarmuka pada Dashboard BMN mengidentifikasi 5 catatan:
    1. Label "Kondisi Prima" muncul statis pada angka 70,4%, bertentangan dengan standar kelaikan ≥90%.
    2. Teks statis tiruan audit ("99.8% Valid", "Audited BPK", "WTP Status") yang tidak memiliki sumber data verifikasi riil.
    3. Label teks kecil (10–11px) pada tema terang terlalu pucat dengan kontras di bawah target WCAG AA (label abu-abu ~2,63:1, label merah "RUSAK BERAT" ~3,75:1).
    4. Simbol panah tren `▲` pada lokasi aset menyesatkan karena bukan data pertumbuhan; label `+9 Kendaraan tercatat` menimbulkan kesan penambahan baru padahal berupa total hitungan peringatan.
    5. Tombol header membungkus elemen `<button>` di dalam `<Link>`, melanggar spesifikasi HTML interaktif bertingkat dan mengganggu fokus keyboard.
- **Tindakan Perbaikan**:
  - `frontend/src/app/bmn/page.tsx`:
    - **Pembersihan Istilah & Status Netral**: Menghapus seluruh kata "Prima" pada kartu Kondisi Aset BMN: "Baik (Prima)" diubah menjadi "Baik", "Standar Prima ≥ 90%" diubah menjadi "Standar Kelaikan ≥ 90%". Status badge menjadi netral dan data-driven: `baikPct >= 70%` menampilkan "Kondisi Baik" & subteks `${baik} unit siap guna`, sedangkan `< 70%` menampilkan "Perlu Perhatian".
    - **Pembersihan Klaim Audit**: Mengganti teks statis dengan metrik riil: Card 1 footer kanan menampilkan `${baikPct.toFixed(1)}% Layak Guna`, Card 2 menampilkan jumlah kategori BMN aktif dan akumulasi nilai buku.
    - **Peningkatan Kontras (WCAG 2.2 AA)**:
      - Mengganti kelas teks pucat `text-slate-400` / `text-slate-500` menjadi `text-slate-600 dark:text-zinc-400` (rasio kontras naik dari 2,63:1 menjadi **7,49:1**).
      - Mengganti label merah `text-rose-500` menjadi `text-rose-700 dark:text-rose-400` (rasio kontras naik dari 3,75:1 menjadi **6,24:1**).
    - **Koreksi Semantik & Tren**: Menghapus tanda `▲` dari daftar lokasi (diganti satuan "Unit" yang jelas), serta mengubah `+${totalAlerts} Kendaraan tercatat` menjadi `${totalAlerts} kendaraan perlu perhatian`.
    - **Pembersihan Nested Interactive**: Menghapus tag `<button>` di dalam `<Link href="...">` pada header action, menjadikan `<Link>` sebagai satu-satunya elemen interaktif berfokus keyboard.
  - `frontend/src/app/bmn/layout.tsx`:
    - Memperbaiki kontras teks judul grup navigasi sidebar (`text-slate-600 dark:text-zinc-400 font-bold`).
- **Hasil Verifikasi**:
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **0 Errors**.
  - `php backend/tests/portal_security_check.php`: **PASS**.
  - Status: Terverifikasi dan di-commit pada sesi ini.


---

## 70. Koreksi Indikator Kondisi BMN dan Pemulihan Database Lokal (10 November 2026)

- **Perbaikan tampilan:** pada `frontend/src/app/bmn/page.tsx`, hapus klasifikasi kondisi berdasarkan ambang 70% dan caption standar 90% yang belum disepakati. Kartu kini menyatakan fakta Aset berkondisi baik, persentase, jumlah baik dibanding total, dan Distribusi kondisi aset. Footer valuasi menjadi Akumulasi nilai perolehan, mengikuti field yang dijumlahkan backend. Footer KPI memakai persentase berkondisi baik, bukan klaim layak guna. Total nol menampilkan tanda pisah pada persentase utama; baris jumlah dapat wrap.
- **Ponytail:** net implementasi -21 baris, tanpa dependency/helper baru. Tidak mengubah perhitungan atau data aset.
- **Verifikasi source:** TypeScript seluruh frontend noEmit dan ESLint file dashboard dengan max-warnings=0 lulus. Tidak menjalankan ulang suite keamanan/backend untuk perubahan tampilan. Guard total nol diperiksa melalui source/typecheck, tanpa mengosongkan database operasional.
- **Gangguan saat verifikasi:** Laravel tetap berjalan dan endpoint up merespons 200, tetapi koneksi database lokal mengalami timeout. Docker melaporkan engine gagal dan WSL docker-desktop sempat Stopped. Setelah engine pulih, database sehat di dalam container tetapi koneksi Windows tetap terputus: log forwarding port 5435 menunjuk IP lama 172.21.0.4, sedangkan IP aktual bksda-db adalah 172.21.0.2. Log WSL mencatat ExecError dan recovery; pemicu awal WSL berhenti belum dipastikan.
- **Pemulihan:** pemeriksaan engine dan penyalakan Docker Desktop diikuti restart hanya container bksda-db memperbarui forwarding. Protokol database di port 5435 kembali merespons dalam sekitar 0,02 detik, query koneksi Laravel menghasilkan 1, dan browser kembali menampilkan 1.633 aset. Tidak mengubah konfigurasi port/env, data/volume, migration, atau batas waktu PHP. Service lain tidak diubah; hasil ini tidak menyatakan seluruh service Docker sehat.
- **Verifikasi browser aktual:** light/dark menampilkan 70,4% dan 1.150 dari 1.633 unit, label nilai perolehan yang benar, serta tidak memuat istilah/ambang lama. Tema dikembalikan ke light seperti awal. Bukti visual bmn-fixed-light.png dan bmn-fixed-dark.png tersimpan pada direktori visualisasi chat. Tidak melakukan pengujian data kosong terhadap database operasional.
- **Status:** perubahan hanya source dashboard dan tambahan progress ini, belum di-commit/push/deploy. Seluruh byte progress sebelumnya dipertahankan.


---

## 71. Animasi Dashboard BMN dan Verifikasi Reduced Motion (10 November 2026)

- **Permintaan:** menerapkan pola Animate UI pada dashboard BMN, membuat pedoman, serta memperbaiki pembukaan dan hover yang sebelumnya hanya terasa pada Akses Cepat Modul.
- **Perubahan dan alasan:**
  - `frontend/src/app/bmn/page.tsx`: satu entrance dashboard 280ms dengan offset 6px serta reveal grafik 320ms agar pembukaan terasa jelas; angka langsung menampilkan nilai akhir. Menghapus entrance KPI terpisah untuk mencegah animasi bertumpuk.
  - KPI memakai CSS hover translateY(-2px)/160ms, tanpa cursor pointer atau aksi klik palsu. Header, baris peringatan kendaraan dan pintasan memakai feedback aksi 140ms, hover 1px dan pressed scale 0.98 hanya saat no-preference. Tujuannya memperluas feedback tanpa menjadikan kartu informasi kontrol palsu.
  - Empat pintasan memakai satu array dan shared highlight dengan useId per instance. Fokus keyboard diprioritaskan atas hover, outline tetap terlihat, blur/mouseleave membersihkan state yang sesuai. Tidak menambah dependency atau request API.
  - Grafik menggunakan scaleX untuk distribusi dan width akhir statis dengan layout-size untuk segmen, menggantikan tween width dari nol/delay bertingkat. Label angka tetap segera terbaca. Skeleton loading diberi label status dan pulse berhenti saat reduce.
  - `frontend/src/app/bmn/layout.tsx`: MotionConfig reducedMotion=user membatasi gerak spatial komponen Motion; transisi halaman disederhanakan menjadi fade 120ms agar tidak menggandakan entrance dashboard.
  - `frontend/src/app/globals.css`: aturan scoped BMN untuk entrance/reveal/hover/fokus; media reduce meniadakan entrance/reveal dan transisi CSS aksi/KPI. Provider library sendiri tidak menangani seluruh animasi CSS.
  - `docs/animate-ui-motion-guidelines.md`: pedoman diperbarui dengan timing, reduced motion library/CSS, fokus/hover, grafik/loading, cakupan aktual, referensi resmi dan hasil verifikasi. Adaptasi memakai framer-motion existing; paket @animate-ui/react tidak dipasang. Klaim inventaris seluruh rute dan jaminan 60fps dihapus karena tidak dibuktikan.
- **Verifikasi otomatis:** `node frontend/tests/bmn-dashboard-motion.cjs` PASS. Fixture memuat source aktual dengan data dummy: empat tujuan pintasan, prioritas fokus, cleanup, ID instance, rasio/first paint grafik, loading dan total nol. TypeScript seluruh frontend noEmit/incremental false, ESLint dashboard/layout/fixture max-warnings=0, dan git diff --check lulus.
- **Browser normal:** entrance CSS terdaftar 0,28 detik dan reveal grafik aktif; hover KPI terukur matrix translateY(-2px) dengan cursor auto. Tab antar pintasan menampilkan highlight dan outline solid. Fokus keluar grid menghapus highlight. Enter pada Peminjaman membuka /bmn/loans; kembali ke dashboard berhasil dan data tetap 1.633 aset.
- **Reduced motion aktual:** pengguna mengaktifkan emulasi reduce di DevTools. Browser mengonfirmasi media query true, entrance/reveal none, transform KPI none, transisi CSS aksi/KPI 0s, dan angka final tetap tampil. Perilaku shared-layout pada reduce diperiksa melalui provider/source serta fixture; tidak diklaim sebagai rekaman interaksi reduce di browser. Input otomatis pada tab DevTools sempat timeout; pengujian keyboard normal selesai pada tab baru dalam browser yang sama setelah pengguna menutup DevTools.
- **Visual/responsif:** light dan dark diperiksa; viewport 390x844 tidak menunjukkan luapan horizontal, pintasan 133x120px. Ini bukan tes sentuh perangkat fisik atau pengukuran FPS. Tidak mengubah aset operasional untuk memicu grafik. Tema light, viewport desktop semula dan No emulation dipulihkan.
- **Gangguan dev lokal:** Next dev sempat menyajikan CSS lama walaupun source berubah. Restart hanya proses Next dev yang command line dan workspace-nya sudah diverifikasi memulihkan kompilasi CSS; backend/database tidak diubah pada pekerjaan motion ini. Next dev dibiarkan berjalan untuk pengguna. `frontend/AGENTS.md` muncul otomatis dari Next dev dan tidak diedit sebagai bagian fitur ini.
- **Bukti:** bmn-motion-reduced.png, bmn-motion-focus-light.png, bmn-motion-focus-dark.png dan bmn-motion-mobile.png di direktori visualisasi chat. Screenshot statis mendukung tampilan; pemeriksaan runtime di atas menjadi bukti state animasi.
- **Status:** implementasi dan verifikasi dashboard selesai, pedoman/progress diperbarui. Belum commit, push atau deploy. Byte progress sebelumnya dipertahankan.


---

## 72. Hover BMN Mengikuti Kepegawaian dan Tempo Grafik 600ms (10 November 2026)

- **Arahan pengguna:** pertegas hover BMN dengan acuan Kepegawaian, pertahankan efek Akses Cepat Modul, update pedoman/progress, jangan commit. Pengguna kemudian memperjelas bahwa tempo animasi grafik Personil yang disukai diterapkan pada Kondisi Aset BMN, Distribusi per Jenis BMN dan Top Lokasi Ruang. Uji reduced motion ulang diserahkan kepada pengguna sesuai arahan terbarunya.
- **Implementasi:** pada dashboard dan CSS scoped BMN, tautan header serta baris kendaraan mendapat class bmn-hover-link: hover naik 3px selama 150ms; border kendaraan memakai warna semantik rose/amber/orange dan background existing. KPI naik 2px/150ms dengan border ringan serta bayangan lebih jelas, tanpa aksi klik palsu/cursor pointer/pressed. Menambahkan dark:hover pada border KPI karena border bawaan dark sempat menutupi efeknya.
- **Perbaikan hasil pemeriksaan visual:** lift 3px sempat memotong bagian atas baris kendaraan pertama dalam scroll container. Padding 8px atas dan 4px sisi/bawah menjaga hover serta outline; jarak atas saat hover terukur 5px setelah perbaikan.
- **Grafik:** reveal ketiga kelompok grafik kini 600ms ease-out, mengikuti tempo Personil Kepegawaian. Transisi scaleX distribusi/lokasi dan layout-size segmen kondisi juga 600ms easeOut. Angka/rasio tetap langsung bernilai akhir; tidak ada count-up atau delay per baris. Entrance dashboard 280ms tetap.
- **Akses Cepat Modul dipertahankan:** tidak menerima class hover yang diperkuat; markup/state highlight, spring 500/40, fade 120ms, hover 1px, pressed 0.98 dan feedback 140ms tetap. Keyboard tetap mendapat prioritas fokus dan outline.
- **Verifikasi browser:** hover kendaraan -3px/0,15s dengan perubahan border, KPI -2px/0,15s/cursor auto. Light/dark diperiksa, termasuk border KPI dark rgb(6,95,70). Seluruh 20 track grafik lokal membaca 0,6s/ease-out. Tab pada pintasan menuju Peminjaman memperlihatkan satu highlight dan outline solid, durasi pintasan tetap 0,14s. Detail kendaraan terbuka dan kembali ke dashboard berhasil; data aset tidak diubah. Tab pemeriksaan sempat timeout lalu dilanjutkan pada tab baru di browser yang sama. Tema light dipulihkan.
- **Verifikasi otomatis:** fixture dashboard (hover/fokus/cleanup/rasio/loading/total nol), TypeScript seluruh frontend noEmit/incremental false, ESLint dashboard/layout/fixture max-warnings=0 dan git diff --check lulus. Tidak menambah dependency atau test yang hanya mencocokkan string CSS.
- **Reduced motion:** tidak menjalankan ulang emulasi browser atau meminta pengaturan pengguna pada revisi ini. Guard existing tetap membatasi spatial hover/reveal ke no-preference dan meniadakan transisi CSS saat reduce; MotionConfig user tetap. Hasil reduce di bagian 71 adalah bukti revisi sebelumnya, bukan hasil tes ulang revisi ini. Pengguna akan memverifikasi revisi terbaru sendiri.
- **Dokumentasi/bukti:** docs/animate-ui-motion-guidelines.md diperbarui dengan perbedaan hover informasi/navigasi/pintasan, durasi grafik, hasil uji aktual serta batasnya. Screenshot bmn-hover-refined-light.png dan bmn-hover-refined-dark.png berada di direktori visualisasi chat; screenshot statis tidak membuktikan FPS. Tidak menguji pembaruan grafik dengan menulis data operasional.
- **Status:** implementasi dan pemeriksaan normal selesai; reduced motion menunggu uji mandiri pengguna. Perubahan animasi dashboard, fixture, pedoman dan progress dicommit lokal atas permintaan pengguna pada 10 November 2026; tidak di-push atau deploy. frontend/AGENTS.md yang dibuat otomatis Next dev tidak disertakan karena di luar perubahan animasi.


---

## 73. Data Aset BMN: Warna, Hover, Akses Keyboard dan Pagination (10 November 2026)

- **Ruang lingkup:** halaman daftar Data Aset dan kontrol yang direndernya, mengikuti panduan warna/motion. Tidak commit/push/deploy. Efek Akses Cepat Modul dan source dashboard yang sudah dicommit tidak diubah.
- **Warna/border:** menambahkan token fondasi, secondary/disabled, status dan danger eksplisit light/dark pada scope BMN di globals.css. assets/assets.css membatasi penerapan ke bmn-assets-ui, termasuk portal terkait. Tambah Aset memakai pasangan accent solid/on-solid; Export/Impor/reset memakai secondary. Status Baik/Rusak Ringan/Rusak Berat/tidak dikenal memakai success/warning/danger/neutral; pinjaman info. Metadata diperjelas dan ukuran informasi kecil dinaikkan. Tag kategori pengguna tetap mengikuti palet taksonominya.
- **Feedback border pengguna:** versi border-control #64748b lalu #7c899a masih dinilai terlalu tegas. Hasil final memakai border-subtle #e2e8f0 pada input/select light (#3f3f46 dark), border transparan pada Export/Impor, soft-border saat hover secondary, dan outline fokus accent 2px/offset 2px. Border dekoratif final tidak diklaim 3:1. Token border-control #7c899a tetap tersedia untuk konteks tegas; tes kontras token bukan sertifikasi seluruh UI.
- **Hover/animasi:** satu entrance 280ms; feedback tombol/filter/aksi/pagination 150ms, tombol header lift 2px pada pointer hover. Baris tabel hanya berganti background 150ms saat hover/focus-within, tanpa translate/scale/stagger. Pilihan baris memakai accent-soft, checkbox dan aria-selected, bukan toolbar merah. Filter kondisi memakai shared highlight spring 500/40, initial=false dan useId per instance. Popover/dialog yang diubah memakai 150ms. Tidak memakai tempo grafik 600ms untuk tabel.
- **Aksesibilitas/interaksi:** aksi detail/hapus selalu terlihat; tautan Tambah Aset memakai Button asChild sehingga tidak ada button dalam link. Checkbox, input/select dan clear tag diberi nama; badge kelola tag menjadi button asli; nested role-button dalam trigger filter tag dihapus dan clear dipisah. Menu Export memakai primitive Popover existing sehingga Escape/fokus bekerja. Konten portal Export/filter tag/Impor membawa data-module=bmn. Dialog pengelolaan tag bersama serta halaman detail/create belum dimigrasikan penuh melalui pekerjaan ini.
- **Koreksi hasil pemeriksaan:** loading/empty table read-only memakai 7 kolom, bukan 6. Dependency memo selectedActiveTags disesuaikan dengan response agar lulus React Compiler lint tanpa mengubah agregasi. Backend AssetController mengirim Laravel Resource pagination pada meta.last_page; frontend kini membacanya dengan benar dan menonaktifkan Berikutnya di halaman terakhir/saat fetching. Opsi lama Semua dilabeli 2.000/halaman dan request sesuai cap backend; pagination tidak dikunci hanya karena opsi tersebut, serta URL per_page=0 tetap dikenali.
- **Verifikasi browser:** row hover background surface-muted, transform none, durasi 0,15s; aksi opacity 1. Seleksi checkbox lalu Batal, kondisi Rusak Ringan (40 halaman), pindah halaman 2, reset, pencarian tidak cocok/empty dan Berikutnya disabled, filter #televisi/clear semuanya bekerja. Export tertutup dengan Escape dan fokus kembali ke trigger. Impor light memakai bg #ffffff/fg #0f172a dan dark #18181b/#f8fafc dengan animasi 0,15s; Upload disabled tanpa berkas. Tidak mengunggah, mengekspor berkas, menyimpan tag, dispose atau mengubah data aset.
- **Visual/keyboard:** light/dark diperiksa. Border final browser rgb(226,232,240), secondary border transparan. Tab dari detail ke Dispose menampilkan outline danger rgb(190,18,60), tidak mengaktifkan penghapusan; pemeriksaan DOM tidak menemukan a-button/button-button/nested role-button pada daftar. Viewport 390x844 tidak meluap horizontal (document width 375 pada innerWidth 390); tabel memiliki scroll internal dan Tab mencapai aksi dengan scrollLeft 541. Viewport desktop, light, filter default dan tanpa seleksi dipulihkan.
- **Verifikasi otomatis:** node frontend/tests/bmn-assets-ui.cjs PASS (source aktual/data dummy: status semantik, struktur link, meta pagination/halaman terakhir, filter-reset-page, seleksi/cancel, cap 2.000, read-only/loading/empty, kontras solid teks/aksen/danger/status/border-control). Fixture dashboard lama juga PASS. TypeScript frontend noEmit/incremental false, ESLint file terkait dan git diff --check lulus. Kontras normal input final yang dekoratif tidak dicakup klaim minimum border-control. Tidak mengklaim pengukuran FPS atau tes sentuh fisik.
- **Reduced motion:** dukungan dijaga melalui MotionConfig BMN, media no-preference pada entrance/lift, serta scope reduce yang meniadakan animasi/transisi CSS dan transform tombol/tautan pada Data Aset/portal terkait. Emulasi browser tidak diuji ulang mengikuti arahan pengguna sebelumnya; pengguna menguji sendiri.
- **Dev lokal:** cache dev Next sempat menyajikan nilai border lama walaupun source berubah, termasuk setelah restart biasa. Proses Next yang workspace/command line-nya sudah diverifikasi dihentikan dan ditunggu selesai; cache lama dipertahankan sebagai frontend/.next/dev/cache-before-assets-20261110, lalu Next dev dijalankan kembali secara hidden. Kompilasi baru dan browser akhirnya membaca token yang benar. Backend/database tidak diubah. Next dev dibiarkan berjalan.
- **Dokumentasi/bukti:** docs/animate-ui-motion-guidelines.md mencatat speed/hover per elemen Data Aset dan batas verifikasi. docs/DESIGN_SYSTEM_COLORS.md memperbarui status penerapan parsial serta aturan border normal/hover/fokus. Screenshot bmn-assets-light.png, bmn-assets-dark.png, bmn-assets-mobile.png dan bmn-assets-mobile-actions.png tersimpan di direktori visualisasi chat. Screenshot dark mendukung pemeriksaan tema sebelum penyempurnaan dekoratif border terakhir; bukti light/mobile sudah memakai border final.
- **Status:** implementasi dan verifikasi normal selesai; reduced motion menunggu uji mandiri pengguna. Seluruh perbaikan Data Aset, fixture, pedoman warna/animasi dan progress dicommit lokal atas permintaan pengguna pada 10 November 2026; tidak di-push/deploy. Panduan khusus modul ditambahkan pada docs/bmn-ui-ux-modernization/visual-guidelines.md dan ditautkan dari design.md serta kedua pedoman utama. frontend/AGENTS.md otomatis tetap di luar perubahan.


---

## 74. Grid Data Aset BMN, Preview Foto dan Preferensi Responsif (10 November 2026)

- **Hasil akhir:** pilihan Tabel/Grid dengan default grid <768px dan tabel pada desktop. Preferensi disimpan terpisah per mobile/desktop melalui localStorage; fallback sementara tetap berfungsi bila storage diblokir. Hook native useSyncExternalStore memakai server snapshot null untuk skeleton awal dan hanya satu view dirender, tanpa tabel sesaat di mobile atau dua salinan kontrol.
- **Kartu final:** vertikal dengan foto di atas, informasi di bawah, sesuai pilihan terakhir pengguna. Mobile 1 kolom <360px, 2 kolom mulai 360px. Grid desktop 3 kolom mulai 1024px, 4 pada 1280px, 5 pada 1440px, 6 pada 1920px. Desktop foto 144px/gap teks 6px untuk mengurangi whitespace; mobile tetap foto 4:3/gap 8px. Kartu tidak diberi lift/scale/stagger.
- **Informasi:** nama, merk, kode/NUP, kondisi, nilai perolehan, lokasi, tag serta status pinjaman/STNK existing. Pengguna ditampilkan bila tersedia dengan fallback pengguna/nama_pengguna/penanggung jawab, memakai helper yang sama dengan katalog peminjaman. NUP Lama hanya bila terisi. Setelah feedback hierarki warna, kode/NUP aktif memakai accent-fg semibold; NUP Lama foreground-muted normal; nama dan nilai memakai foreground utama.
- **Foto/preview:** helper getPrimaryPhoto/resolvePhotoUrl dipindah dari AssetCatalogModal ke utility ringan bersama, dengan prioritas existing geotag/depan/belakang/kiri/kanan/lokasi/foto lama. Ekspor helper dari lokasi lama tetap tersedia bagi pemanggil existing. Field foto frontend mengikuti API daftar yang sudah tersedia; tidak ada endpoint, migration, dependency atau hak akses baru. Thumbnail lazy/async; bukan request detail JSON per aset. BPKB/STNK tidak menjadi cover. URL/auth existing dipertahankan tanpa menyisipkan kredensial ke host eksternal.
- **Interaksi:** foto membuka Dialog satu gambar object-contain dengan nama/NUP, tutup, Escape, focus trap/return. Nama/Detail menuju detail; checkbox/hapus/tag terpisah dan mengikuti permission existing. Foto tidak ada/rusak memakai placeholder tanpa retry loop. Query/filter/seleksi/per-page/pagination tetap saat ganti view. Parameter per_page=0 kini tetap ditulis ke URL agar pilihan batas 2.000 juga bertahan. Tidak ada carousel, zoom, upload atau download baru.
- **Verifikasi browser:** default desktop tabel dan mobile grid; 359px satu kolom, 390/767px dua, 768px kembali tabel tanpa kartu terpasang. Grid manual 1024px tiga kolom; setelah pemadatan final 1440px lima dan 1920px enam, tinggi foto desktop 144px. Mobile tetap dua kolom/foto sekitar 117px pada lebar kartu 158px. Tidak ada overflow halaman pada ukuran yang diperiksa. Pilihan mobile tabel bertahan setelah reload dan tidak mengubah grid desktop; kemudian mobile dikembalikan ke grid.
- **Verifikasi interaksi/browser:** seleksi kendaraan NUP 1 bertahan dari grid ke tabel lalu kembali (satu baris/kartu terpilih); Batal membersihkannya. Filter kendaraan tetap pada URL setelah ganti view dan setelah buka Detail/kembali. Foto kendaraan existing dari Google Drive berhasil tampil. Preview memuat tepat satu gambar object-contain, Tab tetap di Dialog, Escape mengembalikan fokus ke tombol foto. Preview mobile berukuran 343xsekitar641px dalam viewport390x844; dark preview bg#18181b/fg#f8fafc. Kode/NUP light rgb(4,120,87)/600, NUP Lama rgb(71,85,105)/400; dark kode rgb(110,231,183). Pengguna/nama fallback dan NUP Lama diuji dengan fixture; aset yang tidak punya data tersebut tidak mendapat label kosong.
- **Verifikasi otomatis:** bmn-assets-ui.cjs diperluas untuk satu view aktif, kontinuitas query/seleksi, pengguna/NUP Lama, loading/empty/read-only/grid-preparation serta per_page=0. bmn-asset-grid.cjs memuat source helper/hook/preview aktual: prioritas URL/geotag/Drive/relative/backend absolute, pengecualian dokumen, default enam ukuran, preferensi independen/reload/invalid/storage diblokir, SSR, cleanup subscriber dan fallback gambar/preview. Fixture dashboard lama, TypeScript seluruh frontend noEmit, ESLint file terkait dan diff check lulus. Tidak mengklaim frame rate, touch fisik atau render browser read-only/kerusakan gambar dari fixture Node.
- **Reduced motion/batas:** MotionConfig BMN dan scope CSS reduce existing dipertahankan; tidak menjalankan emulasi browser sesuai arahan pengguna. Tidak mengubah data aset operasional, upload, tag atau dispose untuk pengujian. Browser menggunakan data existing untuk uji sukses foto; kasus kosong/rusak/storage/readonly memakai fixture terisolasi. Tema light, viewport normal, filter default, tanpa seleksi dan tabel desktop dipulihkan; preferensi mobile grid tetap.
- **Dokumentasi/bukti:** pedoman visual BMN, pedoman motion dan pedoman warna diperbarui dengan grid/preview, breakpoint final, density desktop, metadata dan hierarki NUP. Bukti bmn-grid-desktop.png, bmn-grid-mobile.png, bmn-grid-photo-preview.png dan bmn-grid-dark.png di direktori visualisasi chat. Bukti mobile/preview mendukung layout yang disetujui; styling metadata akhir juga diperiksa di source/fixture/browser.
- **Status:** implementasi dan pemeriksaan normal selesai; uji browser reduced motion tetap mandiri pengguna. Seluruh perubahan grid/preview, helper, pengujian, pedoman dan progress dicommit lokal atas permintaan pengguna pada 10 November 2026; tidak di-push atau deploy. frontend/AGENTS.md otomatis tetap di luar perubahan.
