# Progress Development - BKSDA SuperApp

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

