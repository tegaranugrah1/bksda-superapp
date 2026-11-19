# Progress Development - BKSDA SuperApp

**Status terbaru (19 November 2026):** Bagian 173 disimpan sebagai checkpoint lokal perbaikan logout portal mobile yang telah dikonfirmasi pengguna. Konfirmasi memakai dialog aplikasi; Batal/Escape mempertahankan sesi; konfirmasi menghapus token dan kembali ke login termasuk ketika API gagal. Typecheck/lint, regresi profil/logout, 11 tes auth/API dan bundle Android lulus. Checkpoint sebelumnya 7bd2db30; checkpoint ini belum di-push.

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


---

## 75. Detail Aset BMN: Warna, Motion dan Preview Aksesibel (10 November 2026)

- **Permintaan/status:** menuntaskan temuan visual dan interaksi detail aset dengan Ponytail, tes dan pembaruan pedoman. Implementasi selesai di working tree; belum commit, push atau deploy. Tidak menambah dependency, endpoint, migration atau perubahan hak akses. frontend/AGENTS.md otomatis tetap di luar lingkup.
- **Mengapa perlu diperbaiki:** warna literal detail belum mengikuti pasangan token BMN light/dark; label 9–11px dan warna pucat mengurangi keterbacaan. Foto hero memakai zoom 500ms, pulse statis dan gradient gelap seluruh bidang. Kartu informasi memiliki hover shadow walaupun bukan kontrol. Lightbox custom tidak mempunyai focus trap/role Dialog: pada pemeriksaan sebelumnya Tab keluar menuju Identitas, Escape tidak mengembalikan fokus. Aksi thumbnail hanya terlihat saat hover dan upload kosong memakai div klik dengan tombol lain di dalamnya.
- **Warna/keterbacaan:** page, DetailSection dan PhotoGallery memakai token fondasi/aksen/secondary/status/danger existing, melalui assets.css dan tambahan scoped detail.css. Edit/Simpan memakai accent-solid/on-solid; Batal/unduh/verifikasi/preview secondary; Hapus danger. Input/select border-subtle dengan fokus 2px/offset 2px; formulir dan aksi utama min-height36. Metadata minimal12px fg-muted; nilai utama fg. Padding baris disesuaikan mobile, nilai uang dapat membungkus. Plat kendaraan mempertahankan hitam/putih; tag kategori tetap taksonominya.
- **Status:** Baik/Rusak Ringan/Rusak Berat memakai success/warning/danger. Kondisi lain/kosong neutral. Status BMN hanya success untuk Aktif, lainnya neutral; kosong ditulis Status belum diisi, bukan diasumsikan aktif. Pinjaman info dan batas tanggal STNK existing dipertahankan dengan pasangan light/dark. Ini perubahan presentasi, bukan perubahan status database atau aturan bisnis.
- **Motion:** kontrol/baris150ms ease-out, konten Dialog150ms, backdrop primitive existing. Highlight tab spring500/40 dengan useId dan initial=false. Menghapus hover zoom foto, pulse idle, hover shadow kartu pasif; tidak menambah entrance panel/kartu. Efek Akses Cepat Modul dashboard tetap. Caption/label foto kini surface/foreground solid sesuai tema, tanpa gradient gelap seluruh foto. Hero gagal dimuat mendapat fallback tanpa retry otomatis.
- **Preview/keyboard:** mengganti lightbox custom dengan Dialog existing, gambar object-contain, judul/nomor halaman, tutup/Escape/focus trap/scroll lock primitive. Ref pemicu mengembalikan fokus ke hero/thumbnail bila masih terpasang. Navigasi foto dan halaman BPKB/STNK tetap melalui tombol/panah kiri-kanan dalam Dialog; bukan menghapus carousel detail demi menyamakan preview grid. Error gambar menjadi pesan status tanpa retry loop. Tab informasi memakai tablist/tab/tabpanel, aria-selected/controls, roving focus dan panah/Home/End, dengan padding outline. Link kembali pada state error memakai Button asChild agar tidak bersarang.
- **Foto/izin:** aksi thumbnail selalu terlihat dengan label aksesibel; upload kosong memakai native button dan tautan Drive terpisah. Dokumen kosong disabled. Izin unggah/hapus/verifikasi/update existing dipertahankan. Input lokasi foto diberi nama aksesibel; perilaku save-on-blur existing dipertahankan dan tidak diubah nilainya selama tes browser.
- **Browser aktual:** light/dark memakai aset kendaraan NUP1 existing; tombol primary light bg#047857/fg#ffffff dan dark bg#34d399/fg#0f172a. Dialog dark bg#18181b/fg#f8fafc, object-contain, duration0,15s. Tab/Shift+Tab tetap dalam preview, Escape dan tombol tutup mengembalikan fokus hero; thumbnail mobile juga kembali terfokus setelah penutupan selesai. Tab keyboard ArrowRight/End/Home memindah state/fokus dan panel; keenam tab diklik di390px. Edit lalu Batal diperiksa desktop/mobile tanpa mengetik atau menyimpan.
- **Responsif/visual:** lebar359/390/767/768/1024/1920px tidak meluap horizontal; hanya tablist memiliki scroll internal. Mobile preview343xsekitar641px pada390x844. Foto statis terukur transform none/transition0s, pulse idle0; kontrol150ms. Tidak ditemukan a-button/button-button di detail yang diperiksa, console warn/error kosong. Tema light, viewport normal1920px, tab Identitas, tanpa edit/dialog dipulihkan. Screenshot bmn-detail-fixed-light.png, bmn-detail-fixed-dark.png, bmn-detail-preview-focus.png dan bmn-detail-mobile.png tersimpan di direktori visualisasi chat.
- **Otomatis:** fixture baru node frontend/tests/bmn-detail-ui.cjs memuat source aktual dengan data terisolasi: nama/change handler form, status kosong/tidak dikenal/known, tab wrap/Home dan relasi panel, edit-batal, read-only/loading/error, hero/preview gagal, navigasi foto dan halaman dokumen, focus-return callback. API fixture menolak akses sehingga tidak menyentuh data operasional. Regresi bmn-assets-ui.cjs, bmn-asset-grid.cjs dan bmn-dashboard-motion.cjs lulus. TypeScript seluruh frontend noEmit/incremental false, ESLint file terkait dan git diff --check lulus pada hasil akhir.
- **Batas/dokumentasi:** tidak upload, download massal, verifikasi, hapus atau menyimpan perubahan aset untuk tes visual. Browser menggunakan data existing; variasi gagal/readonly/dokumen multipage/loading/error memakai fixture, bukan diklaim diuji di browser dengan akun/data baru. Reduced motion browser tetap diuji mandiri pengguna sesuai arahan sebelumnya; MotionConfig user dan fallback CSS reduce dipertahankan. Tidak mengklaim FPS atau sentuh fisik. docs/DESIGN_SYSTEM_COLORS.md bagian9.2, docs/animate-ui-motion-guidelines.md dan docs/bmn-ui-ux-modernization/visual-guidelines.md mencatat pola warna, timing, keyboard dan cakupan aktual; form create/dialog tag bersama belum dinyatakan selesai dimigrasikan.

- **Tindak lanjut feedback unggah foto (10 November 2026):** pengguna menemukan area unggah tidak mempunyai pointer/hover. Akar masalah: tombol upload native belum memiliki cursor dan state visual interaktif. Ditambah cursor pointer pada enabled, frame/teks accent-soft/accent-fg saat hover/focus-visible150ms; area klik meluas hingga tepi frame dengan memindahkan padding ke tombol. Drive tetap kontrol terpisah, disabled/read-only tidak mendapat feedback aktif. Browser membuktikan cursor pointer dan focus-visible light bg#ecfdf5/border#047857, dark bg#022c22/border#6ee7b7 serta durasi0,15s. Hover memakai cabang CSS yang sama; gerak pointer aktual tidak diukur karena screenshot native Windows timeout. Tidak mengunggah/mengubah data. Fixture detail dan ESLint PhotoGallery lulus; diff check lulus. Pedoman visual/motion diperbarui; bukti bmn-upload-feedback-light.png berupa fokus keyboard. Reduced motion browser tetap mandiri pengguna. Belum commit/push/deploy.

- **Tindak lanjut pointer seluruh tombol detail (10 November 2026):** cursor pointer dipusatkan pada button/link enabled dalam scope bmn-detail-ui; disabled/aria-disabled=true memakai default. Menghapus aturan cursor upload yang kini redundan. Browser memeriksa semua26 tombol pada data existing:24 enabled memakai pointer,2 preview BPKB/STNK kosong disabled memakai default, tidak ada enabled dengan cursor salah. Kedua tombol Upload Dokumen dan Verifikasi BMN terkonfirmasi pointer; Batal/Simpan dalam mode edit dan Tutup preview pada Dialog juga pointer. Edit-batal/preview ditutup tanpa menyimpan, verifikasi atau unggah data. Fixture detail serta diff check lulus; perubahan ini hanya CSS dan dokumentasi. Pedoman visual diperbarui, bukti bmn-detail-button-cursors.png; belum commit/push/deploy.


---

## 76. Fade Isi Tab Detail Aset BMN (10 November 2026)

- **Implementasi:** isi tab Identitas/Finansial/Dokumen/Lokasi/Organisasi/Riwayat memakai satu fade opacity0 ke1 selama150ms ease-out, tanpa transform, delay, exit animation atau stagger baris. Hanya panel aktif dirender dengan key activeTab; panel baru langsung dipasang tanpa menunggu panel lama keluar. Panel awal juga fade saat pertama dipasang. Rerender tab yang sama tidak mengulang animasi. Memakai CSS terlokalisasi existing, tanpa dependency, timer atau state tambahan.
- **Tetap dipertahankan:** indikator tab spring500/40, ID per instance, roving focus/ArrowLeft/Right/Home/End dan relasi ARIA. Draft formulir tetap di state induk sehingga tidak hilang ketika panel berganti. Tidak mengubah data/API/izin atau efek Akses Cepat Modul dashboard.
- **Reduced motion:** fade hanya didefinisikan dalam prefers-reduced-motion:no-preference. Saat reduce panel langsung memakai opacity default1, dengan fallback animation:none scoped existing. Tidak menjalankan emulasi browser reduce sesuai preferensi pengguna sebelumnya; tidak mengklaim kelulusannya dari tes normal.
- **Tes aktual:** keenam panel pada desktop membaca animation-name bmn-detail-panel-fade, duration0,15s, ease-out, delay0s, transform none dan jumlah panel1. ArrowRight mempertahankan fokus tab aktif dan aria-labelledby panel. Dark mode dan mobile390x844 membaca durasi yang sama, transform none, satu panel; lebar halaman375 pada viewport390 tanpa overflow horizontal. Screenshot mobile sempat menangkap paint desktop lama; tidak dipakai sebagai bukti visual akhir. Tab pertama kemudian berpindah halaman sehingga verifikasi akhir memakai tab baru, tanpa mengubah halaman lain; viewport normal1920 dan tema light dipulihkan.
- **Otomatis/bukti:** fixture bmn-detail-ui.cjs diperluas untuk key panel berubah saat pindah tab, tetap saat rerender, satu panel aktif dan draft Merk tetap setelah pindah Finansial/kembali Identitas. Fixture lulus; TypeScript frontend noEmit/incremental false, ESLint page/fixture dan diff check lulus. Tes draft memakai data terisolasi, tanpa API atau perubahan aset operasional. Screenshot bmn-detail-tab-fade.png memperlihatkan panel Finansial final di light mode; gambar statis bukan bukti gerak/FPS.
- **Dokumentasi/status:** docs/animate-ui-motion-guidelines.md dan panduan visual BMN diperbarui dengan fade panel, timing, key/reduced motion dan draft. Revisi ini menggantikan aturan panel tanpa entrance pada versi sebelumnya; kartu/baris tetap tidak dianimasikan terpisah. Selesai di working tree; belum commit, push atau deploy.


## 77. Koreksi Target Efek Tab Detail Aset BMN (10 November 2026)

- Klarifikasi pengguna: efek ditujukan pada kotak formulir seperti Identitas BMN/Kendaraan & Sertifikat ketika memilih Identitas, dan Nilai & Finansial/Dimensi & Luas ketika memilih Finansial. Percobaan fade wrapper pada bagian76 dibatalkan: key activeTab dan animasi wrapper dihapus; indikator spring500/40 tetap.
- Fade150ms ease-out dipindahkan ke DetailSection dan kotak riwayat di dalam tabpanel. Kelompok pada tab yang sama muncul bersamaan, tanpa transform, delay, exit wait atau stagger baris; mount isi existing memicu animasi. Guard no-preference dan fallback reduce tetap, tanpa emulasi browser reduce sesuai pilihan pengguna. Draft edit tetap berada di induk.
- Browser memeriksa keenam tab: panelAnimation none; kotak kelompok masing-masing bmn-detail-section-fade/0,15s/transform none. Identitas menampilkan dua kelompok yang dimaksud, Finansial juga dua; tab lain kelompoknya sendiri. Fixture detail termasuk draft lintas tab lulus, ESLint file terkait dan diff check lulus. Tidak mengubah data aset, commit, push atau deploy. Pedoman motion/visual diperbarui; bukti bmn-detail-section-fade.png memperlihatkan kelompok Identitas pada keadaan akhir, bukan rekaman gerak.


## 78. Tab Detail BMN Mengikuti Inbox Surat Tugas (10 November 2026)

- **Acuan yang dikonfirmasi:** URL /kepegawaian/surat-tugas/inbox dibuka dan tab Menunggu Persetujuan diperiksa. Source GmailStatusTabs memakai garis bawah shared spring420/32; isi inbox memakai AnimatePresence mode=wait/initial=false dengan masuk opacity0/y8, keluar opacity0/y-8,160ms easeOut per fase. Surat Tugas hanya dibaca/diubah filter tab; source dan data tidak diubah.
- **Hasil BMN:** tab detail memakai garis bawah2px Emerald spring420/32 menggantikan pill penuh500/40. Tab aktif accent-fg/surface-muted, ID per instance dan keyboard/ARIA tetap. Kelompok formulir berada dalam satu motion.div key activeTab dengan pola keluar-naik8px lalu masuk-dari-bawah8px,160ms per fase (sekitar320ms total). AnimatePresence wait mempertahankan satu kelompok selama pergantian, initial=false meniadakan animasi pembukaan pertama. Efek CSS150ms per kotak dari bagian77 dihapus agar tidak bertumpuk. Baris/kartu tidak dianimasikan sendiri-sendiri; draft tetap di state induk.
- **Reduced motion:** useReducedMotion membuat initial/exit opacity1/y0 serta durasi konten dan indikator0. MotionConfig user/fallback CSS existing tetap. Fixture menguji cabang normal/reduce dan indikator; tidak menjalankan emulasi browser reduce sesuai preferensi pengguna sebelumnya.
- **Tes:** fixture detail lulus termasuk presence wait/initial=false, y8/-8, durasi0,16, key berganti/tetap saat rerender, draft lintas tab, status/form/izin/preview lama dan cabang reduce. TypeScript frontend noEmit/incremental false, ESLint file terkait dan diff check lulus. Browser memeriksa tujuan isi keenam tab, satu kelompok konten, tanpa class fade CSS lama; urutan ArrowRight/ArrowRight/Home berakhir pada Identitas dengan fokus/ARIA sesuai. Garis bawah terukur2px, light#047857 dan dark#6ee7b7; mobile390x844 pageWidth375 tanpa overflow. Konten akhir kembali opacity1/transform none. Posisi/timing glide ditetapkan source dan fixture; tidak mengklaim rekaman frame atau FPS.
- **Dokumentasi/bukti:** pedoman motion, panduan visual BMN dan catatan warna diperbarui untuk pola akhir ini, menggantikan percobaan bagian76/77. Screenshot bmn-inbox-tabs-final.png dan bmn-inbox-tabs-mobile.png berada di direktori visualisasi chat, sebagai bukti keadaan akhir. Tema light dan viewport normal1920 dipulihkan. Tidak menyimpan, mengunggah, menghapus, menerbitkan atau memverifikasi data operasional. Belum commit/push/deploy.


## 79. Commit Detail Aset BMN dan Acuan Animasi di Dalam Tab (10 November 2026)

- Pengguna meminta seluruh perbaikan detail aset BMN, fixture, pedoman warna/motion/visual dan progress dicommit lokal, tanpa push. Paket mencakup perbaikan warna/status, hover/pointer unggah/aksi, Dialog preview aksesibel, keterbacaan dan pola tab final pada bagian78. Catatan historis bagian75–78 tetap disimpan sebagai jejak keputusan; pola akhir yang dipakai adalah acuan inbox Surat Tugas.
- Ditambahkan bagian normatif **Animasi di dalam tab — acuan untuk implementasi berikutnya** pada docs/animate-ui-motion-guidelines.md, ditautkan dari panduan visual BMN. Untuk perpindahan kelompok isi tab serupa ke depan, gunakan glide opacity/y8 keluar-masuk160ms per fase, presence wait/initial=false, draft di induk, key per tab dan reduced motion durasi0. Indikator garis bawah2px spring420/32 adalah efek terpisah; warna mengikuti modul tujuan. Tidak mengubah otomatis halaman/modul lain atau efek dashboard.
- Status penutupan: seluruh paket detail aset dan dokumentasi dicommit lokal atas permintaan pengguna; tidak di-push atau deploy. frontend/AGENTS.md yang dihasilkan Next dev tetap di luar commit. Pemeriksaan terakhir mengikuti hasil tes bagian78, dengan fixture detail dan diff check diulang sebelum commit; tidak ada perubahan source aplikasi setelah kelulusan TypeScript/ESLint terakhir.


## 80. Hapus Tambah Aset Manual; Gunakan Impor Excel SIMAN (10 November 2026)

- **Koreksi scope pengguna:** pekerjaan penyesuaian warna/hover/animasi halaman Tambah Aset dihentikan sebelum perubahan source. Pengguna menjelaskan aset bersumber dari Excel SIMAN dan meminta halaman manual dihapus. Formulir559 baris pada frontend/src/app/bmn/assets/create/page.tsx dihapus, beserta tombol Tambah Aset dan ikon Plus yang tidak dipakai di katalog. Impor Excel tetap menjadi jalur penambahan melalui review existing.
- **Navigasi:** guard id=create pada route detail diarahkan ke /bmn/assets, menggantikan redirect ke URL create itu sendiri; ini mencegah redirect loop dan request detail aset dengan id=create setelah route statis dihapus. Pengecualian create yang tidak diperlukan pada penanda sidebar dihapus. Pencarian frontend/src tidak menemukan tautan /bmn/assets/create atau komponen BmnCreateAssetPage tersisa. URL lama sengaja tetap ditangani oleh guard fallback, bukan mengembalikan formulir.
- **Izin/data:** dialog impor tetap hanya tampil dengan bmn.import.review. Perhitungan izin existing lainnya, API backend, tabel data, unggah/review impor dan edit detail tidak dihapus/diubah. Aksi Tambah Aset pada paket lelang memiliki arti memasukkan aset existing ke lot dan bukan pintasan form manual; tetap dipertahankan. Label capability existing di administrasi akses juga tidak dihapus sebagai efek samping penghapusan UI.
- **Tes:** bmn-assets-ui.cjs diperbarui untuk memastikan tautan manual tidak dirender, impor tersedia bagi pengguna berizin dan tidak tersedia read-only; regresi tabel/grid/filter/seleksi/pagination tetap lulus. bmn-detail-ui.cjs menguji redirect URL create ke katalog sebelum merender detail, serta seluruh regresi detail termasuk draft/tab/preview/status; lulus. ESLint file terkait lulus. TypeScript pertama menemukan referensi route terhapus dalam .next/types/validator.ts dari build lama; next typegen resmi meregenerasi tipe route, lalu TypeScript seluruh frontend noEmit/incremental false lulus. Tidak mengedit tipe generated manual atau mengecualikan error dari tsconfig. Diff check lulus.
- **Browser:** membuka /bmn/assets/create berakhir di /bmn/assets. Tombol/tautan Tambah Aset manual0 dan Impor Excel1. Dialog impor tetap terbuka, Upload & Review disabled tanpa berkas; Escape menutup dan fokus kembali ke Impor Excel. Tidak memilih/mengunggah file, melakukan impor, menghapus data atau menyimpan aset untuk pengujian. Bukti bmn-import-only.png memperlihatkan katalog dengan Export/Impor Excel tanpa Tambah Aset.
- **Dokumentasi/status:** pedoman warna, motion dan visual BMN diperbarui; requirements FR-03, design2.1 dan tasks3.1 kini menyatakan impor Excel SIMAN menggantikan wizard manual, agar AI berikutnya tidak membuat ulang berdasarkan catatan lama. Riwayat pekerjaan sebelumnya tetap tersimpan. Seluruh penghapusan/perubahan ini dicommit lokal atas permintaan pengguna pada 10 November 2026; tidak di-push atau deploy. frontend/AGENTS.md otomatis tetap di luar lingkup.


## 81. Audit Sidebar BMN Lanjutan — Tahap Peminjaman dan Pemeliharaan (10 November 2026)

- Cakupan tetap seluruh delapan menu sidebar tersisa, termasuk detail/tab/dialog yang dapat dicapai; status per menu dicatat di docs/bmn-ui-ux-modernization/remaining-sidebar-audit.md. Pekerjaan belum dinyatakan tuntas. Tidak commit/push/deploy.
- Peminjaman, wizard, katalog dan dialog memakai token BMN, pointer enabled/disabled, feedback150ms dan entrance280ms. Katalog dapat dipilih melalui Space/Enter dengan guard aset tidak tersedia; tanpa zoom/lift. Draft wizard tetap di induk saat perpindahan langkah memakai pola animasi di dalam tab160ms per fase. Popup pegawai mendapat scope BMN opsional; pembatalan GET tidak diperlakukan sebagai error oleh komponen.
- Pemeliharaan sebelumnya HTTP500 karena index dideklarasikan JsonResponse tetapi mengembalikan AnonymousResourceCollection. Tipe return diperbaiki sesuai resource existing, tanpa mengubah data. Frontend membaca meta pagination serta membedakan gagal/empty. Tes backend SQLite :memory: lulus1 tes/10 assertion untuk empty,20+1 baris dan view-only. Browser kembali memuat empty state normal.
- Fixture bmn-sidebar-ui.cjs lulus untuk filter/status/pagination/read-only/dialog, keyboard katalog, draft wizard dan fallback reduced motion tanpa API writes. Regresi assets/detail/dashboard lulus pada tahap awal; TypeScript lulus. Lint/diff dan regresi penuh akan diulang setelah menu lainnya selesai. Browser menguji daftar/dialog tanpa menyimpan, seleksi lokal katalog, langkah2, popup pegawai,390px dan light/dark; reduced motion browser tetap dilakukan pengguna.


## 82. Sidebar BMN — Import Review dan Aset Dihapus (10 November 2026)

- Import Review daftar/detail memakai token semantik light/dark untuk pending/approved/rejected/expired serta diff baru/update/sama. Border halus, pointer/fokus, kontrol150ms, entrance280ms; summary filter aria-pressed tanpa gerak kartu. Link Lihat/Kembali memakai Button asChild tanpa button di dalam anchor. Layout upload, metadata, nama file dan header dapat membungkus di mobile. Error mempunyai pesan dan Coba lagi.
- Ditemukan filter detail menghilangkan fokus ketik karena setiap GET mengganti seluruh panel dengan loading. placeholderData mempertahankan panel/input; browser mengonfirmasi fokus tetap NUP setelah respons filter kosong. Tombol mutasi/checkbox disabled selama fetching. Tidak mengubah endpoint atau aturan approval.
- Aset Dihapus membaca meta.last_page/meta.total (fallback respons lama); next disabled pada empty/batas dan saat fetching. Restore/hapus ditampilkan sesuai izin masing-masing. Pilihan serta konfirmasi dibersihkan ketika search/page/perPage berubah; mengganti pilihan menutup konfirmasi. Native checkbox/label jelas dan selected state Emerald; hapus danger. Nilai buku0 dipertahankan, bukan diganti nilai perolehan. Header mobile yang terjepit diperbaiki, empty state tetap terlihat tanpa tabel720px yang tidak diperlukan.
- Verifikasi: bmn-sidebar-ui.cjs lulus untuk empat menu beserta izin, field-selection via stub, metadata, seleksi/konfirmasi dan error. Regresi bmn-assets-ui, bmn-detail-ui, bmn-dashboard-motion lulus. ESLint file tahap ini dan shared EmployeeSelect/fixture lulus; TypeScript seluruh frontend lulus sebelum perubahan minor terakhir dan akan diulang pada penutupan. Browser: daftar/detail approved, filter/reset/empty, outline keyboard2px,390px tanpa overflow halaman, status light/dark; empty arsip dan next disabled. Tidak memilih file, upload, approve, restore atau delete operasional. Screenshot bmn-import-review-light.png, bmn-import-review-mobile.png, bmn-disposal-mobile.png. Browser reduced motion tetap pengguna.
- Pedoman visual/motion dan audit matriks diperbarui; empat menu lainnya (Kandidat, Paket Lelang, Laporan, Pengaturan) tetap dalam cakupan dan belum selesai. Seluruh perubahan lanjutan belum dicommit, tidak push/deploy.


## 83. Sidebar BMN — Pengaturan Master (10 November 2026)

- Tag, Lokasi dan Jenis BMN memakai token BMN, border halus, metadata12px, hover/fokus150ms, ikon aksi minimal36px. Kategori form netral; pilihan warna dan badge tag pengguna tetap palette existing. Swatch mempunyai aria-label/pressed, outline/check dan tidak scale/zoom. Hapus tag beranak/lokasi/jenis terpakai native disabled, mengikuti guard existing.
- Animasi di dalam tab memakai BmnTabContent160ms per fase dan underline2px spring420/32/useId; fallback source/fixture durasi0. Keyboard ArrowLeft/Right/Home/End, role tab/tablist/tabpanel dan hubungan ARIA ditambahkan. Error query tampil sebagai gagal+Coba lagi, bukan daftar kosong. Header tabel kosong disembunyikan pada mobile agar pesan/CTA tetap terlihat.
- Dialog form dan konfirmasi membawa scope BMN, termasuk footer surface-muted yang sebelumnya kebiruan pada dark. Shared ConfirmDialog mendapat prop scope opsional, variant destructive dan pengembalian fokus hanya pada pemanggil BMN; style/default pemanggil lain dipertahankan. Form master juga menyimpan referensi pemicu sehingga Escape/batal kembali ke tombol asal. Tidak mengganti alur simpan atau endpoint.
- Tes: fixture sidebar lulus untuk tab keyboard/ARIA/error, hierarki/draft Main-Sub Tag, fokus callback/read-only dan lokasi/jenis disabled/validasi. ESLint seluruh settings, shared ConfirmDialog dan fixture lulus; TypeScript frontend noEmit/incremental false lulus. Browser menguji tiga tab, panah keyboard, isi form tanpa simpan, Escape/fokus kembali, konfirmasi hapus tag dibuka lalu dibatalkan,390px tanpa overflow halaman, light/dark. Dialog mobile343px; primary light #047857/putih dan dark #34d399/#0f172a, danger #be123c/putih. Footer light #f1f5f9/border#e2e8f0; dark memakai pasangan token yang sama, source diperiksa. Reduced motion browser tetap pengguna.
- Screenshot bmn-master-settings-light.png dan bmn-master-dialog-mobile.png; pedoman warna/motion/visual serta matriks audit diperbarui. Lima menu telah diterapkan tahap awal; Laporan, Kandidat Rusak Berat dan Paket Lelang masih dalam cakupan dan belum selesai. Tidak commit/push/deploy.


## 84. Sidebar BMN — Awal Dokumen & Laporan (11 November 2026, belum tuntas)

- Export memakai Emerald konsisten untuk ketiga unduhan; colorMap dekoratif tiga warna dihapus. Nama aksesibel tombol menyebut jenis laporan. Kerangka laporan memakai scope BMN, entrance280ms, tab utama underline2px spring420/32/useId dan navigasi panah/Home/End. Isi tab/jenis dokumen memakai BmnTabContent160ms per fase; lifecycle kondisional existing belum diubah.
- Temuan UI: izin hapus riwayat sebelumnya memakai canWrite dari izin generate; Edit/Duplikasi tampil untuk read-only. canDelete bmn.document.delete dipisahkan di riwayat dan RecentDocumentTable, diteruskan lewat BA Pemakaian/Surat Kuasa. Edit/Duplikasi mengikuti canWrite generate. Backend tidak diubah; ini koreksi affordance UI. Helper konfirmasi dokumen memakai scope BMN optional agar warna/fokus mengikuti Dialog BMN.
- Riwayat dan dua tabel bersama mulai memakai token, label pencarian/filter, status semantik, klasifikasi netral, seleksi Emerald, hover baris150ms dan error/loading yang dibedakan dari empty. Checkbox AssetSelectionTable terhubung ke nama kolom pertama via aria-labelledby/useId. Form empat jenis dokumen dan picker/KTP masih diperiksa; jangan menyatakan seluruh menu selesai. Terdeteksi lifecycle lama unmount saat berpindah jenis/tab yang dapat mereset draft lokal; perlu penilaian/test lanjutan agar animasi sesuai pedoman tanpa kehilangan draft. Template kertas/cetak belum diubah.
- Fixture sidebar lulus untuk export loading/filename/endpoint via Blob/DOM stub, izin generate-delete independen, dan view preview riwayat tanpa API writes. Browser: tiga tombol unduh Emerald #047857/putih, pointer, tab keyboard berpindah dan fokus tetap tab; tidak mengunduh, generate/simpan atau hapus dokumen operasional. Bukti bmn-reports-export-light.png. ESLint reports lulus pada tahap awal; pemeriksaan akhir dan browser riwayat/form/mobile/dark masih diperlukan. Tidak commit/push/deploy.


## 85. Sidebar BMN — Penutupan Tahap Dokumen & Laporan (11 November 2026)

- Enam permukaan laporan (export, empat form, riwayat) dan tabel/picker bersama telah diselaraskan ke token, kontrol150ms, pointer/disabled, status semantik dan entrance280ms. Template kertas/cetak tidak diubah. Unggah KTP kini native input yang dapat difokuskan lewat Tab dengan highlight seluruh bidang; read-only disabled. Picker barang memakai label/checkbox native, scope portal BMN dan max-width viewport-2rem.
- Temuan draft pada bagian84 diperbaiki: empat hook state form kini dipanggil di halaman induk dan diteruskan bertipe ReturnType, sehingga subtree animasi boleh unmount tanpa menghapus draft/pilihan/override/file. Sync edit dijaga per objek mode di ref pemilik state. Effect pilihan pegawai dipindah ke handler agar manual override tidak ditimpa saat remount. Fetch detail berulang di empat child dihapus setelah memverifikasi DocumentHistoryController dan keempat Resource sudah mengirim snapshot lengkap. Tidak menambah endpoint/dependency/store persisten. Draft hanya hidup selama halaman terbuka.
- BA Pemakaian mempertahankan snapshot dan asset_ids arsip saat GET opsi aset pegawai selesai; sebelumnya pilihan historis dapat terganti semua aset saat ini. Blob KTP dibersihkan oleh owner pada perubahan URL/unmount halaman, tidak saat berpindah tab. Error pegawai/kendaraan/picker/riwayat dibedakan dari empty dengan retry. Pemisahan izin generate/delete bagian84 mencakup riwayat utama dan RecentDocumentTable.
- Browser menemukan outline tab mobile terpotong. Tablist diberi ruang4px dan navigasi keyboard scrollIntoView nearest. Home/End kini menempatkan Export pada x20 terhadap container x16, outline2px+offset2px terlihat penuh. Pengaturan Master memakai ruang/navigasi yang sama. Efek dashboard Akses Cepat tetap tidak diubah.
- Fixture sidebar lulus: empat draft dan override pihak tetap setelah simulasi child remount; snapshot aset BA tetap; validasi KTP mime/5MB, file bertahan saat child remount, cleanup blob di owner dan readonly; izin independen, loading export/nama file/endpoint stub, riwayat preview/error dan seleksi kendaraan. Tidak ada API writes. Regresi assets/detail/dashboard/grid-helper lulus. TypeScript seluruh frontend dan ESLint reports/settings/shared ConfirmDialog/fixture lulus, termasuk pemeriksaan setelah koreksi keyboard.
- Browser: empat form390px, lebar halaman375px tanpa overflow; draft777/778/779/780 dan override manual tetap setelah berganti jenis maupun tab utama. Riwayat search kosong mempertahankan fokus, Lihat membuka preview Surat Kuasa dan row selected; tidak mencetak. Picker343px di light/dark, Space/klik memilih sekali, pencarian empty, Escape kembali ke trigger. Hover saat checkbox tidak selected terbukti aktif dengan bg#022c22 dan transition150ms. Tab mencapai bidang KTP dengan outline. Tombol unduh light #047857/putih, dark #34d399/#0f172a; input/portal dark #18181b/#f8fafc. Uji browser reduced motion tetap pengguna. Tidak upload/simpan/generate/restore/hapus operasional; reload membersihkan draft uji, viewport normal dan light dipulihkan.
- Bukti bmn-reports-export-light.png, bmn-reports-mobile-dark.png dan bmn-reports-mobile-focus.png. Pedoman warna/motion/visual serta matriks audit diperbarui. Enam dari delapan menu telah diterapkan dan diuji tahap awal; Kandidat Rusak Berat serta Paket Lelang tetap belum selesai dan masih dalam cakupan. Semua pekerjaan sidebar lanjutan belum dicommit, tidak push/deploy.


## 86. Kandidat Rusak Berat — Konsistensi Visual dan Seleksi Lintas Halaman (11 November 2026)

- Audit sidebar tahap7: kandidat ditokenisasi light/dark, Emerald untuk buat paket, warning/success semantik, border halus, kontrol150ms dan entrance280ms. Pointer/focus/disabled dari scope BMN; tabel hanya scroll internal; error memakai retry, terpisah empty. Warning punya aria-expanded/controls; colspan read-only diperbaiki.
- Ditemukan nilai terpilih hanya menjumlahkan halaman aktif, sementara jumlah ID mencakup halaman lain. Set ID diganti Map aset terpilih agar jumlah/nilai/payload tetap konsisten lintas halaman, tanpa query detail tambahan. Guard izin/eligible/fetching/pending melindungi seleksi dan tombol buat; nama wajib, input pending disabled.
- Fixture aktual bmn-sidebar-ui.cjs lulus termasuk lintas halaman Rp400 untuk aset100+300, payload ID tepat, kandidat tidak eligible, warning tidak memblokir eligible, read-only, error/loading/empty dan fetching. Mutasi hanya ditangkap stub, tidak menyentuh API. ESLint kandidat dan fixture lulus.
- Browser: memilih Fotocopy NUP2 Rp49.500.000 pada halaman1 dan Printer NUP58 Rp1.632.375 pada halaman2 menghasilkan2 pilihan/Rp51.132.375. Dialog dibuka, Escape menutup dan fokus kembali ke Buat Paket. Warning advisory dapat dibuka; filter tidak ada hasil benar. Mobile390px page375px, dialog343px; dark primary rgb52,211,153/on-solid15,23,42 dan pointer. Light dikembalikan, viewport direset, reload membersihkan draft. Bukti bmn-candidates-mobile-dark.png; tidak membuat paket. Browser reduced motion tetap diserahkan pengguna.
- Pedoman warna/motion/visual dan matriks audit diperbarui. Paket Lelang/detail/workflow serta regresi akhir masih dikerjakan; seluruh perubahan sidebar tetap belum dicommit/push/deploy.


## 87. Penutupan Seluruh Sidebar BMN — Paket Lelang, Navigasi dan Regresi Akhir (11 November 2026)

- **Cakupan tuntas:** delapan menu lanjutan (Peminjaman, Pemeliharaan, Import Review, Kandidat Rusak Berat, Paket Lelang, Aset Dihapus, Dokumen & Laporan, Pengaturan Master), termasuk kontrol/panel/dialog yang punya render caller. Matriks dan alasan tiap perbaikan: docs/bmn-ui-ux-modernization/remaining-sidebar-audit.md. Cakupan historis bagian81–86 dilengkapi verifikasi akhir, bukan dibatasi pada menu yang mudah diuji.
- **Paket Lelang:** list/error/retry/pagination/status, link tunggal asChild, token light/dark/metadata12px dan pointer. Empat tab aktif memakai animasi isi160ms per fase/underline420/32; hook pemilik mempertahankan draft aset/taksiran/dokumen/realisasi saat child unmount. Tambah aset ke paket tetap memilih aset existing. Dialog scoped150ms/focus-return; checkbox bernama, warning expanded/controls, colspan dan empty kandidat tersedia dibetulkan. Kertas kerja umum/kendaraan dan seluruh form aktif mengikuti token; kertas resmi tetap putih/hitam/ukuran cetak.
- **Editor/panitia:** modal custom diganti Dialog existing (focus trap/Escape/focus-return), toolbar mobile membungkus agar Simpan/Tutup tidak terpotong. Subtab SK keyboard/ARIA dan motion standar; fieldset read-only tidak mematikan subtab pratinjau. Picker punya selected state dan Alt+panah kiri/kanan untuk urutan alternatif drag. Detail hapus mengikuti bmn.auction.delete; dokumen readonly dan realisasi/transisi/pindah paket memakai capability sesuai endpoint. Tidak mengubah permission backend.
- **Perbaikan tambahan:** payload validasi hasil lelang kini di dalam try sehingga harga kosong menghasilkan pesan, bukan uncaught error/mutasi. Harga ulang memakai text/inputMode numeric dan formatter ribuan konsisten. GET peminjaman gagal ditampilkan error/retry, bukan empty; sisa warna lama wizard/katalog dibersihkan; kondisi pengembalian unknown netral. Dialog edit/kembali mengembalikan fokus.
- **Shell:** token canvas/surface/fg/border, metadata12px, hover/pointer/focus, menu aktif aria-current, label saat collapsed, toggle expanded/controls, drawer tertutup invisible di mobile dan Escape kembali ke toggle. Drawer/collapse150ms; spring navigasi450/35 dan fade route120ms existing didokumentasikan terpisah. Efek Akses Cepat dashboard tidak diubah.
- **Tes final:** lima fixture frontend lulus (sidebar, assets-ui, detail-ui, dashboard-motion, asset-grid); source fixture memeriksa delapan menu dan izin/error/empty/loading/filter/page/seleksi, draft child-remount, payload stub, keyboard, validasi dan reduced motion. Typegen resmi+TypeScript seluruh frontend noEmit/incremental false lulus. ESLint file TS/TSX berubah dan fixture lulus. Backend SQLite memory pemeliharaan1 tes/10 assertion lulus. Diff check lulus.
- **Browser:** list paket lokal kosong, jadi detail memakai fixture development sementara dengan cache query terisolasi dan mutation cache menolak mutasi. Empat tab utama, subtab SK, kalkulator umum/kendaraan, picker, jadwal/batal, status final/ulang, Escape/fokus, light/dark,390px dan desktop diuji tanpa menyimpan/cetak/upload/hapus transaksi. Draft taksiran777.000/hasil pertama888.000/ulang999.000 tetap setelah pindah tab. Editor mobile page375px/dialog343px pada viewport390px; dark surface24,24,27/fg248,250,252, kertas putih/hitam. Footer master dark rgb39,39,42/border63,63,70 terbukti; fokus Escape dialog kembali ke pemicu. Navigasi collapsed/mobile/current diuji. Theme light dipulihkan, viewport direset dan dialog ditutup.
- **Dokumentasi/status:** pedoman warna, animasi dan visual BMN diperbarui bersama matriks audit lengkap/bukti/batas pengujian. Route fixture sementara telah dihapus dan tipe Next diregenerasi. Browser reduced motion tetap dikerjakan pengguna sesuai preferensi; fallback source/fixture lulus. Seluruh pekerjaan sidebar **belum dicommit, push atau deploy**, sesuai instruksi; HEAD masih b2c9292a. frontend/AGENTS.md otomatis tetap di luar scope.


## 88. Commit Lokal Audit Sidebar BMN (11 November 2026)

- Pengguna meminta seluruh perbaikan delapan menu sidebar disimpan dalam satu commit lokal bersama laporan audit warna, hover, pointer, fokus, dan animasi, pedoman BMN, fixture, dan progress. Cakupan dan bukti pengujian tercatat pada bagian 81–87 dan `docs/bmn-ui-ux-modernization/remaining-sidebar-audit.md`.
- Tidak push atau deploy. `frontend/AGENTS.md` yang dihasilkan Next dev tidak ikut commit.


## 89. Audit Visual Surat Tugas (11 November 2026)

- Pengajuan publik, inbox dan pembaca, Builder, tiga panel pengaturan Surat Tugas, Surat Tugas Saya di Portal, pratinjau A4 dan verifikasi publik memakai fondasi warna BMN dengan aksen Sky Surat Tugas. Kontrol aktif memakai pointer, border input halus, fokus keyboard terlihat, dan status memakai token semantik. Kertas A4 tetap putih dengan tinta hitam.
- Feedback kontrol, dialog, menu dan drawer 150 ms. Entrance halaman 280 ms. Wizard dan isi tab inbox bergerak 8 px dengan opacity 160 ms per fase. Indikator tab 2 px memakai spring 420/32. Reduced motion tersedia di CSS dan Framer.
- Inbox menonaktifkan interaksi panel yang sedang keluar, membersihkan pembaca dan seleksi saat ganti tab, dan membedakan kegagalan kueri dari daftar kosong. Checkbox dan aksi baris dapat diakses di layar sempit. Draft pengajuan bertahan saat kembali ke langkah sebelumnya. Dialog lampiran dan pratinjau Portal mengembalikan fokus ke pemicu.
- Next typegen, TypeScript, ESLint file yang berubah, diff check dan lima fixture BMN lulus. Chrome lokal menguji light/dark, 390 px dan desktop, navigasi keyboard, lampiran, dialog, draft, layout A4, serta verifikasi sah/gagal. Pratinjau Portal memakai data contoh karena akun uji belum memiliki surat. Fixture sementara sudah dihapus. Pengujian perubahan data, unduh, dan cetak aktual belum dijalankan. Emulasi reduced motion browser tetap diuji pengguna.
- Laporan [audit visual Surat Tugas](docs/testing/surat-tugas-visual-audit.md), pedoman warna dan animasi, serta perubahan kode disimpan dalam satu commit lokal.


## 90. Audit Visual Kepegawaian (11 November 2026)

- Dashboard, daftar/tambah/detail pegawai beserta lima tab profil, hak akses/lifecycle, inbox cuti dan pratinjau/unggahan, Uang Makan, Arsip Surat Masuk, serta panel pengaturan terkait mengikuti fondasi BMN/Surat Tugas dengan aksen Blue Kepegawaian. Pointer, hover/fokus150ms, border input halus, teks pendukung12px dan target ikon36px diterapkan. Modal memakai Dialog existing dan focus-return, termasuk pemicu dari menu.
- Animasi isi tab160ms per fase, garis bawah2px/spring420/32 dan ID unik mendukung panah/Home/End. Panel keluar inert. Entrance halaman280ms dan dialog/menu150ms. Hover personel dashboard150ms dan batang600ms dipertahankan dengan cabang reduced motion. Foto profil fokusable serta terlihat di mobile, dengan state pending upload dan reset saat gagal.
- Temuan fungsional UI diperbaiki. Tautan kategori/wilayah dashboard mengirim status=all dan daftar meneruskan nilai all secara eksplisit ke API existing. Browser mengonfirmasi97 PNS sesuai dashboard. Kartu aktif di daftar diberi keterangan aktif. Grafik kosong memakai0persen. Error/loading dibedakan dari empty. Sel presensi menjadi tombol native dengan guard non-admin.
- Uji tablet menemukan header terpotong saat sidebar terbuka. Header kini bertumpuk pada lebar menengah. Dashboard muat pada390/768/1024/1440/1920px, dengan main clientWidth/scrollWidth482/482 pada768px. Formulir dan surat izin cuti A4 memakai scroll internal dengan sisi kiri kertas terjangkau, putih/hitam sekitar794px. Template cetak existing dipakai.
- Browser lokal menguji light/dark, keyboard, form tanpa simpan, dialog/Escape/focus-return, berkas scan cuti, tab pengaturan/bank, checkbox Space, dan warna scope Surat Tugas. Matriks/nominatif/koreksi serta pratinjau cuti memakai fixture contoh dengan API writes ditolak. Koreksi contoh bertahan setelah pindah tab. Fixture sementara telah dihapus dan tipe Next diregenerasi.
- Next typegen, TypeScript, ESLint source/fixture, diff check, fixture Kepegawaian dan lima regresi BMN lulus. Kontras enam set token light/dark dari tiga modul lulus. Impeccable source detector tidak menemukan temuan tersisa. Tes callback Portal tambahan memerlukan mount Linux dan terhenti pada path di Windows. Browser reduced motion tetap diuji mandiri pengguna. Transaksi operasional, upload/cetak/unduh aktual serta sesi akun read-only belum diuji browser.
- Laporan docs/testing/kepegawaian-visual-audit.md, pedoman warna dan pedoman animasi diperbarui. Bukti kepegawaian-create-desktop-light.png dan kepegawaian-cuti-fixture-mobile-dark.png tersimpan pada folder visualisasi sesi. Browser dipulihkan ke tema terang/viewport desktop tanpa dialog. Perubahan belum dicommit, push atau deploy. HEAD tetap d4db6300. frontend/AGENTS.md otomatis tetap di luar cakupan.


## 91. Koreksi Dashboard Kepegawaian Berdasarkan Umpan Balik (11 November 2026)

- Dashboard dipulihkan ke palet kategori sebelum audit. PNS blue-600, PPPK amber-500 dan MMP emerald-500. Ikon, kartu kategori/layanan dan grafik wilayah kembali mengikuti keluarga warna asal. Kuning komposisi sebelumnya berubah cokelat karena memakai status-warning-fg.
- Entrance CSS280ms tambahan pada dashboard dihapus sehingga pembukaan mengikuti transisi route160ms. Hover personel y-2, layanan y-3, tap0.98, aktivitas x3 dan wilayah x2 memakai timing150ms seperti acuan semula. Batang600ms dengan delay0/100/200ms. Cabang reduced motion tersedia.
- Browser mengonfirmasi root dashboard animation-name none, jarak antarpanel20px, tablet768px main482/482 dan mobile dark390px main360/360 tanpa luapan. Tema terang dan viewport desktop dipulihkan. Bukti kepegawaian-dashboard-restored.png tersimpan pada folder visualisasi sesi.
- TypeScript, ESLint, fixture Kepegawaian dan diff check lulus. Fixture memeriksa palet tiga batang, timing serta ketiadaan entrance tambahan. Laporan audit dan kedua pedoman diperbarui agar dashboard tetap mengikuti acuan ini. Perubahan belum dicommit.


## 92. Pemulihan Tab dan Sidebar Kepegawaian (11 November 2026)

- Menindaklanjuti keluhan animasi berat, pola sebelum audit dipulihkan. Entrance CSS280ms tambahan dihapus dari seluruh halaman Kepegawaian; route kembali memakai satu transisi160ms existing. Sidebar kembali width/transform200ms, hoverx2/tap0.98 selama120ms dan indikator spring420/32.
- Tab utama profil/pengaturan/uang makan kembali memakai pill penuh dan isi160ms/y8. Hasil filter pegawai/cuti/arsip kembali140ms/y4 dengan exit opacity saja. Subtab hari libur/bank dan internal dialog bank kembali langsung. ARIA, navigasi keyboard, exiting inert dan fallback reduced motion dipertahankan.
- Fixture Kepegawaian, TypeScript, ESLint source/fixture yang berubah dan diff check lulus. Chrome memeriksa collapse288/80px, keyboard tab, subtab/dialog bank, navigasi sidebar, pill light/dark, Escape drawer dengan fokus kembali dan layout390/768px tanpa luapan main. Bukti kepegawaian-navigation-restored.png tersimpan pada folder visualisasi sesi. Bukan benchmark FPS; reduced motion browser tetap diuji pengguna.
- Pedoman warna, animasi dan laporan audit diperbarui agar audit berikutnya mempertahankan pola yang disukai pengguna. Tema terang dan viewport desktop dipulihkan. Belum commit, push atau deploy.


## 93. Animasi Isi Tab Mengikuti Inbox Surat Tugas (11 November 2026)

- Pengguna menegaskan acuan animasi adalah perpindahan Kotak Masuk ke Menunggu Persetujuan di Inbox Surat Tugas. Isi tab Kepegawaian kini mengikuti opacity/y8 masuk, opacity/y-8 keluar,160ms/easeOut per fase dengan mode wait/initial=false. Varian hasil filter140ms dihapus; subtab hari libur/bank dan internal dialog bank memakai helper yang sama. Ketentuan ini menggantikan pilihan sementara pada bagian92. Pill tab, tiga warna dashboard dan sidebar tetap.
- Fixture membandingkan properti motion helper dengan fungsi InboxTabContent asli pada normal/reduced serta present/exiting. Fixture Kepegawaian, TypeScript, ESLint berkas yang disentuh dan diff check lulus. Browser menguji acuan inbox, klik/keyboard tab, subtab bank, dialog/Escape serta draft contoh yang bertahan setelah pindah tab. Draft dikosongkan tanpa simpan. Layout390/768px muat; viewport desktop/tema terang dipulihkan. Reduced motion browser tetap diuji pengguna.
- Pedoman animasi dan laporan audit diperbarui. Bukti statis kepegawaian-inbox-motion-reference.png tersimpan pada folder visualisasi sesi. Belum commit, push atau deploy.


## 94. Empat Perbaikan Visual Statis Kepegawaian (11 November 2026)

- Tanggal Aktivitas Terkini memakai fg-muted light#475569/dark#a1a1aa. Badge aktivitas menggunakan helper label Inbox Surat Tugas sehingga pending/approved tampil Menunggu Persetujuan/Diterbitkan; metadata membungkus pada mobile.
- SDM & Administrasi di sidebar memakai kalimat biasa tanpa ellipsis; keterangan ringkasan pegawai membungkus agar NIPPPK terbaca penuh. Dialog kelola bank/edit rekening memakai satu lapisan radius12px dari DialogContent, tanpa border/shadow/surface ganda pada isi.
- Animasi dan palet tiga warna dashboard dipertahankan. Snapshot properti Framer/AnimatePresence sebelum/sesudah enam berkas sama persis. Fixture label status/fallback, palet grafik dan motion Inbox lulus; TypeScript, ESLint terkait serta diff check lulus.
- Browser memeriksa dashboard light/dark, teks sidebar desktop/tablet, kartu359/390px, metadata390px, kedua dialog bank/Escape dan dialog dark mobile. Lebar main tidak meluap pada359/390/768px yang diperiksa. Tidak menyimpan/mengubah data operasional. Tema terang/viewport desktop dipulihkan; reduced motion browser tetap diuji pengguna.
- Pedoman warna, pedoman animasi dan laporan audit diperbarui. Bukti kepegawaian-four-visual-fixes.png, kepegawaian-readability-mobile.png dan kepegawaian-bank-single-surface.png tersimpan pada folder visualisasi sesi. Belum commit, push atau deploy.


## 95. Pelembutan Aksen Pendukung Dashboard Kepegawaian (11 November2026)

- Latar badge/ikon pendukung memakai tint currentColor5% pada surface light/dark. Border ikon12%, border badge transparan. Foreground kategori/status tetap terbaca. Scope hanya dashboard Kepegawaian; tidak mengubah token global atau halaman lain.
- Tiga warna komposisi, grafik wilayah, angka/tombol utama dan seluruh animasi dipertahankan. Perbandingan snapshot source membuktikan TSX hanya mendapat nama class penanda, sedangkan CSS hanya mendapat tiga aturan warna; logika/data/link/motion tetap.
- Fixture Kepegawaian, TypeScript, ESLint source terkait dan diff check lulus. Browser memeriksa desktop light/dark serta359/390/768px tanpa overflow badge/main, dan menu Enter/Escape/focus-return. Kontras30 elemen per tema: minimum teks sekitar4.71/6.27 dan ikon3.02/5.33 untuk light/dark. Bukti kepegawaian-soft-support-light.png dan kepegawaian-soft-support-dark.png tersimpan pada folder visualisasi sesi. Tema terang/viewport desktop dipulihkan.
- Pedoman warna, pedoman animasi dan laporan audit diperbarui. Tidak ada perubahan data operasional. Reduced motion browser tetap diuji pengguna. Belum commit, push atau deploy.


## 96. Commit Lokal Audit Visual Kepegawaian (11 November2026)

- Commit terverifikasi: `8e3d0a8c` — `fix(kepegawaian): align visual styles and preserve approved motion` (37 berkas).

- Seluruh pekerjaan visual Kepegawaian pada bagian90–95 disimpan dalam satu commit lokal bersama pedoman warna, pedoman animasi, laporan audit, fixture dan komponen pendukung bersama. Kondisi final mempertahankan animasi sesuai acuan Inbox Surat Tugas dan palet tiga warna grafik, dengan badge/ikon pendukung yang lebih lembut.
- Validasi akhir TypeScript, ESLint source/fixture terkait, fixture Kepegawaian dan lima regresi BMN serta staged diff check lulus. Bukti dan batas browser/transaksi tercatat pada docs/testing/kepegawaian-visual-audit.md.
- Tidak push atau deploy. frontend/AGENTS.md otomatis tetap di luar cakupan commit.


## 97. Rekap Akhir Dokumentasi Visual Kepegawaian (11 November 2026)

Implementasi bagian 90–95 sudah selesai dan tercatat pada commit lokal `8e3d0a8c`. Pembaruan ini merapikan dokumen setelah commit tersebut; hanya Markdown yang diubah, tanpa perubahan kode atau animasi.

| Pekerjaan selesai | Yang dicatat |
| --- | --- |
| Fondasi visual | Token light/dark, aksen Blue, border halus, pointer, hover/fokus dan target ikon. |
| Dashboard | Tiga warna komposisi tetap, nilai grafik nol benar, tautan kategori/wilayah sesuai status=all, dan badge/ikon pendukung lebih lembut. |
| Teks dan status | Tanggal lebih terbaca, subjudul sidebar/keterangan NIPPPK utuh, dan label aktivitas mengikuti Inbox Surat Tugas. |
| Animasi final | Isi tab mengikuti Kotak Masuk → Menunggu Persetujuan: fade/geser8px,160ms per fase. Pill utama tetap; tidak ada entrance ganda atau varian list140ms. Hover dashboard/sidebar dipertahankan. |
| Daftar/tambah/detail pegawai | Filter, loading/error/empty, navigasi tab, unggah foto/fokus/pending, dan kontrol lifecycle/hak akses mengikuti pedoman. |
| Cuti, uang makan dan arsip | Kontrol/unggahan/keyboard, dialog/pratinjau A4, state loading/error, serta layout responsif dirapikan. |
| Pengaturan dan bank | Tab/subtab dapat diakses lewat keyboard; dialog kelola/edit bank memakai satu permukaan dengan Escape/fokus kembali. |
| Validasi | TypeScript, ESLint, fixture Kepegawaian dan lima regresi BMN serta diff check lulus sebelum commit. Browser light/dark dan ukuran yang dilaporkan tercatat dalam audit. |

- Dokumen diperbarui: [pedoman warna](docs/DESIGN_SYSTEM_COLORS.md), [pedoman animasi](docs/animate-ui-motion-guidelines.md) dan [laporan audit visual](docs/testing/kepegawaian-visual-audit.md). Laporan kini diawali ringkasan final, cakupan tes, batas pengujian dan perintah fixture; catatan sementara ditandai sebagai riwayat.
- Batas tetap: reduced motion browser diuji pengguna; transaksi operasional, unggah/cetak/unduh aktual dan akun read-only belum diuji browser. Tes callback Portal yang memerlukan mount Linux tidak dihitung lulus. Rekap ini tidak menyatakan audit keamanan baru selesai.
- Status: implementasi sudah commit lokal; pembaruan Markdown pada bagian97 disimpan dalam commit dokumentasi terpisah sebelum pengajuan PR. Tidak push atau deploy. frontend/AGENTS.md otomatis tetap di luar cakupan.


## 98. Persiapan PR ke production-server dan Temuan Build (11 November 2026)

- Fetch origin dan perbandingan branch mengonfirmasi production-server merupakan ancestor dari branch kerja; ada43 commit tertunda sebelum commit dokumentasi6f24b695. Cakupan mencakup BMN, Surat Tugas, login, fitur lifecycle pegawai dan dua migrasi database, bukan hanya visual Kepegawaian. Migrasi bank turut mengosongkan nama_bank/nomor_rekening MMP. Pilihan semua perubahan atau hanya visual Kepegawaian sudah ditanyakan kepada pengguna; push/PR/merge menunggu jawaban.
- Pembaruan dokumentasi bagian97 disimpan pada commit lokal6f24b695. Repository GitHub tidak mempunyai workflow Actions aktif/terdaftar (total0); tidak mengklaim CI lulus. Sintaks31 berkas PHP dalam diff terhadap production-server lulus; regresi database seluruh43 commit belum dijalankan ulang.
- Build tambahan menemukan re-export runtime STANDARD_UNIT_KERJA yang tidak sah pada page pengaturan BMN. Import/re-export tak terpakai dihapus, konstanta asli dan caller utility tetap. ESLint page dan fixture sidebar BMN lulus; UI/warna/animasi tidak diubah.
- Build webpack terisolasi di drive E berhasil kompilasi, generated TypeScript dan86 halaman statis (exit0). Percobaan drive C gagal karena resolusi dependency lintas drive. Build ulang masih memperingatkan packaging manifest route-group dan27 dependency traced di luar root dengan junction; belum menjadi bukti paket standalone/Docker siap deploy. Peringatan deprecasi React18 untuk Next17 juga tercatat, tanpa upgrade dependency pada pekerjaan ini.
- Diff check seluruh riwayat terhadap production-server menemukan whitespace pada output graphify generated dan satu baris komentar globals.css; staged diff perbaikan saat ini bersih. Tidak mengklaim seluruh diff release bebas temuan. Bukti/perbaikan build dicatat pada docs/bmn-ui-ux-modernization/remaining-sidebar-audit.md.
- Status: hanya commit lokal; belum push, membuat PR, merge atau deploy. Cakupan PR dan validasi packaging/backend yang sesuai masih perlu diselesaikan. frontend/AGENTS.md otomatis tetap di luar commit.


---

## 99. Validasi Rilis, Perbaikan Scheduler Lifecycle Pegawai, Push & Merge PR ke production-server (11 November 2026)

- **Cakupan & PR**:
  - Seluruh perubahan tertunda pada branch `codex/portal-security-pentest` dipromosikan ke `production-server` melalui [PR #603](https://github.com/tegaranugrah1/bksda-superapp/pull/603) sesuai konfirmasi pengguna.
- **Perbaikan Race-Condition Scheduler Lifecycle (`backend/app/Console/Commands/ApplyEmployeeLifecycleCommand.php`)**:
  - Memperbaiki celah konkurensi pada command `employee:apply-lifecycle`: setelah mengambil daftar calon pegawai jatuh tempo dan mengunci baris (`lockForUpdate()`), command kini memeriksa ulang `is_active`, keberadaan `inactive_effective_date`, serta memastikan `inactive_effective_date->toDateString() <= $today`.
  - Jika admin membatalkan jadwal atau memundurkan tanggal TMT di sela pengambilan kandidat dan penguncian baris, penonaktifan otomatis dilewati dengan aman dan penghitung `$processed` hanya bertambah bila transaksi benar-benar diterapkan.
  - Menambahkan regresi [`backend/tests/Feature/EmployeeLifecycleScheduleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/EmployeeLifecycleScheduleTest.php) untuk skenario jatuh tempo normal (idempotent), pembatalan jadwal konkurensi, dan penjadwalan ulang TMT ke masa depan.
- **Hasil Validasi Rilis**:
  - **Docker Frontend Build**: `docker build` menggunakan `frontend/Dockerfile` (multi-stage standalone image) lulus penuh.
  - **PHPUnit Sandbox (SQLite `:memory:`, network-none, read-only rootfs)**:
    - `Unit` & rangkaian `Feature` (`EmployeeAccessLifecycleTest`, `EmployeeLeaveRequestTest`, `EmployeeBankAllocationSecurityTest`, `KepegawaianSecurityAuditTest`, `KepegawaianCatalogContractTest`, `BmnLayoutAndSecurityRegressionTest`, `SuratModuleTest`, `BroadcastChannelAuthTest`): **LULUS**.
    - `EmployeeLifecycleScheduleTest`: **3 tests, 21 assertions (OK)**.
    - `php backend/tests/portal_security_check.php`: **PASS**.
- **Pembersihan & Merge**:
  - Folder sementara pemeriksaan rilis di `E:\bksda-release-check-*` dan berkas lokal `frontend/AGENTS.md` dibersihkan agar tidak mengotori repositori.
  - Commit perbaikan scheduler dipush ke `codex/portal-security-pentest`, status draft PR #603 dibuka (`gh pr ready`), dan di-merge ke `production-server`.

---

## 100. Penyempurnaan Kontras Badge Tab Aktif, Kesejajaran Tabel, Optimasi Viewport 1366x768, dan Harmonisasi Sidebar Kepegawaian (11 November 2026)

- **Kontras Badge Tab Aktif Kepegawaian (`kepegawaian.css`, `employees/[id]/page.tsx`, `uang-makan/page.tsx`)**:
  - Memperbaiki spesifisitas CSS pada `.kpg-ui [role="tab"][aria-selected="true"] > span` yang sebelumnya menimpa warna angka badge (`rounded-full`) menjadi putih di atas latar terang. Angka jumlah pada tab aktif (`Riwayat Penugasan`, `Cuti Pegawai`, dan `Presensi & Uang Makan`) kini menggunakan `color: var(--ds-accent-fg)` di atas `background: var(--ds-surface)` baik pada mode terang maupun malam.
- **Kesejajaran Tabel Riwayat Cuti & Inbox Surat Tugas (`EmployeeLeaveTab.tsx`, `GmailRowItem.tsx`, `surat-tugas.css`)**:
  - Merapikan tabel `EmployeeLeaveTab.tsx` menjadi 5 kolom (`No`, `Surat Persetujuan (SI / ST)`, `Jenis & Alasan Cuti`, `Pelaksanaan & Durasi`, `Status & Aksi`) dengan teks 2-baris rata kiri yang sejajar penuh secara horizontal maupun vertikal.
  - Mengembalikan lebar tetap (`shrink-0`) pada kolom-kolom kanan `GmailRowItem.tsx` (`Lokasi`, `Nomor Surat`, `Sumber Dana`, `Status`, dan `Tanggal/Aksi`) dengan aksi cepat berupa overlay saat *hover*/fokus keyboard di layar lebar sehingga seluruh kolom sejajar dari atas ke bawah.
- **Optimasi Resolusi 1366 × 768 (100%) (`GmailRowItem.tsx`, `surat-tugas/inbox/page.tsx`, `cuti/page.tsx`, `surat-masuk/page.tsx`)**:
  - Mengkalibrasi lebar kolom `Inbox Surat Tugas`, menggabungkan kolom `Alasan & Alamat Cuti` pada `Inbox Surat Cuti`, serta menghapus `min-w-[1050px]` dan menggabungkan `Agenda & Kategori` pada `Arsip Surat Masuk` agar ketiganya muat di layar 1366 × 768 tanpa *scroll* horizontal.
- **Harmonisasi Sidebar Kepegawaian dengan Standar BMN (`kepegawaian/layout.tsx`, `kepegawaian.css`)**:
  - Menyamakan struktur dan gaya visual sidebar Kepegawaian dengan BMN: menggunakan titik indikator aktif di sisi kanan (`w-1.5 h-1.5 rounded-full`), menghapus efek geser `x: 2` dan garis kiri, menyamakan tipografi subjudul/label grup (`text-[var(--ds-fg-secondary)]`), permukaan footer (`bg-[var(--ds-surface-muted)]`), serta mengganti tombol mengambang (FAB) mobile dengan *top header bar* bersih.

---

## 101. Audit Visual & Penyelarasan Modul Persuratan dengan Standar BMN & Kepegawaian (`/ponytail`) (11 November 2026)

- **Dokumentasi Audit & Standar Warna**:
  - Menyusun dokumen audit lengkap di [`docs/testing/persuratan-visual-audit.md`](file:///e:/bksda-superapp/docs/testing/persuratan-visual-audit.md) yang merinci 12 poin ketidaksesuaian modul Persuratan beserta matriks penyelarasan terhadap BMN dan Kepegawaian.
  - Memperbarui [`docs/DESIGN_SYSTEM_COLORS.md`](file:///e:/bksda-superapp/docs/DESIGN_SYSTEM_COLORS.md) dengan bagian `## Persuratan — 11 November 2026`.
- **Fondasi Token Indigo & Reuse CSS Bersama (`globals.css`, `surat-tugas.css`, `kepegawaian.css`)**:
  - Menambahkan scope `[data-module="persuratan"]` (Light: `#4f46e5`/`#ffffff`, Dark: `#818cf8`/`#0f172a`) dan `--ds-fg-secondary` di [`frontend/src/app/globals.css`](file:///e:/bksda-superapp/frontend/src/app/globals.css).
  - Sesuai prinsip `/ponytail` (Rung 2: reuse tanpa file CSS duplikat baru), memperluas selektor `:is(.st-ui, .kpg-ui, .psr-ui)` di [`frontend/src/app/surat-tugas/surat-tugas.css`](file:///e:/bksda-superapp/frontend/src/app/surat-tugas/surat-tugas.css) serta `:is(.kpg-shell, .psr-shell)` dan `:is(.kpg-ui.kpg-dashboard, .psr-ui.psr-dashboard)` di [`frontend/src/app/kepegawaian/kepegawaian.css`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/kepegawaian.css).
- **Penyelarasan Layout, Sidebar, Dashboard, Tabel 1366×768, Dialog & Popover (`frontend/src/app/surat/*`)**:
  - **Sidebar & Shell (`surat/layout.tsx`)**: Diselaraskan 1:1 dengan BMN dan Kepegawaian (`data-module="persuratan"`, `psr-shell`, `MotionConfig reducedMotion="user"`, indikator spring `450/35` + titik kanan aktif, `Escape` close & pengembalian fokus ke tombol menu mobile).
  - **Dashboard (`surat/page.tsx`, `SuratHubComponents.tsx`)**: Menggunakan `.psr-ui.psr-dashboard`, `.kpg-support-icon`/`.kpg-support-badge`, guard izin tulis (`canCreate`), dan pemulihan error (`Coba lagi`).
  - **Surat Masuk, Popover & Modal (`surat/masuk/*`, `LembarDisposisiForm.tsx`)**: Mengoptimalkan kepadatan tabel untuk layar `1366 x 768` (100%) tanpa `min-w-[1050px]`, meneruskan `data-module="persuratan"` ke `PopoverContent` (`SifatCellPopover`, `DiteruskanCellPopover`), menggunakan `useKepegawaianTabs` dan tombol `<button aria-pressed>`, serta memakai ulang `KepegawaianDialog` (`module="persuratan"`) pada `ExportSuratMasukModal` dan `BatchPrintDisposisiModal` dengan tetap menjaga `#batch-print-portal-root` dan kertas `LembarDisposisiSheet` tetap putih/hitam.
  - **Surat Keluar, Katalog 20 Format & Pengaturan (`surat/keluar/*`, `TemplatePickerModal.tsx`, `surat/settings/page.tsx`)**: Menghapus penelanan error di `useQuery` agar banner error + `Coba lagi` berfungsi, menerapkan `useKepegawaianTabs` + `KepegawaianTabContent` + `useDialogFocusReturn`, meneruskan `data-module="persuratan"` ke seluruh portal `DialogContent`/`DropdownMenuContent`/`useConfirm`, mengganti `window.confirm()` native di `settings/page.tsx` dengan `useConfirm()`, dan menjaga kertas A4 `SuratDinasDocument` tetap putih/hitam.
- **Verifikasi & Regresi**:
  - Menambahkan satu runnable check [`frontend/tests/persuratan-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/persuratan-ui.cjs): **ALL CHECKS PASSED**.
  - `node frontend/tests/nota-dinas-template-check.cjs`: **PASSED**.
  - `node frontend/tests/kepegawaian-ui.cjs`: **PASSED**.
  - `npx --prefix frontend tsc -p frontend/tsconfig.json --noEmit`: **PASSED (0 errors)**.

---

## 102. Migrasi Palet Teal Kedinasan, Penipisan Border/Shadow Naskah Dinas, dan Penyelarasan Header Dashboard BMN & Persuratan (11–12 November 2026)

- **Migrasi Palet Aksen ke Teal Kedinasan (`globals.css`, `DESIGN_SYSTEM_COLORS.md`)**:
  - Berdasarkan umpan balik keterbacaan naskah kedinasan untuk pengguna senior, warna ungu/Indigo digantikan oleh **Teal Tua Kedinasan** (Light: `#0f766e` kontras 5,47:1 pada putih; Dark: `#2dd4bf` kontras 9,59:1 terhadap `#0f172a`, teks aksen `#5eead4` kontras 11,98:1 pada `#18181b`).
- **Peredaman Border & Drop-Shadow Berlebih (`surat/keluar/dinas/page.tsx`, `TemplatePickerModal.tsx`)**:
  - Menghapus drop-shadow tebal (`shadow-xl ring-1`, `shadow-sm`) pada kartu ber-border dan lembar pratinjau A4.
  - Meringankan tampilan blok **Nomor Naskah**: badge nomor tanpa border berat, tombol switcher pill menggunakan `bg-[var(--ds-surface)] text-[var(--ds-accent-fg)] border-[var(--ds-border-subtle)]`, segmen nomor menggunakan font medium, serta pemisah normal.
  - Memperbaiki kontras nomor surat keluar terbaru ([`SuratHubComponents.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratHubComponents.tsx)) menjadi `text-[var(--ds-fg)]` agar tidak bertabrakan dengan warna hijau badge status `Signed`/`Terdaftar`.
- **Standarisasi Header Banner Dashboard Lintas Modul (Patokan: Dashboard Kepegawaian)**:
  - Menetapkan **Dashboard Kepegawaian (`kepegawaian/page.tsx`)** sebagai patokan kanonikal untuk anatomi dan ukuran banner header dashboard:
    - Kontainer: `bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl p-4 md:px-6 md:py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4`.
    - Sisi Kiri: Kotak ikon `w-10 h-10 rounded-xl` (`w-5 h-5` icon) dengan judul `text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight` dan subjudul `text-xs text-[var(--ds-fg-muted)] mt-0.5` tanpa overline/badge tambahan di atas `<h1>`.
  - Diterapkan pada **Dashboard BMN** ([`bmn/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/page.tsx)) dan **Dashboard Persuratan** ([`SuratHubComponents.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratHubComponents.tsx)).
- **Commit Terverifikasi**: Commit `c3dd026a` — `feat(ui): apply Teal palette to Persuratan and standardize Dashboard headers across BMN & Persuratan`.

---

## 103. Standardisasi Tema 3 Warna Utama Modul Persuratan & Harmonisasi Sidebar Teal Seragam (12 November 2026)

- **Tema 3 Warna Utama Konten Modul Persuratan (`SuratHubComponents.tsx`, `surat/page.tsx`)**:
  - Mengikuti pola 3 warna kategori pada Kepegawaian (Blue, Amber, Emerald) dan BMN (Emerald, Amber/Teal, Rose), konten modul Persuratan dibatasi secara disiplin pada 3 keluarga warna utama (menghilangkan pencampuran `emerald` dengan `teal`):
    1. **Teal Kedinasan (`text-[var(--ds-accent-fg)]`)**: Surat Masuk & Ringkasan Modul (Ikon Header Dashboard, KPI *Surat Masuk*, Akses Cepat *Daftar Surat Masuk* & *Input Surat Masuk*, No Agenda *Surat Masuk Terbaru*).
    2. **Blue (`text-blue-700 dark:text-blue-300`)**: Surat Keluar (KPI *Surat Keluar*, Akses Cepat *Daftar Surat Keluar*, Ikon Header *Surat Keluar Terbaru*).
    3. **Amber (`text-amber-700 dark:text-amber-300`)**: Disposisi Cetak & Tata Naskah Dinas (KPI *Disposisi Cetak 2-Up*, KPI *Tata Kelola 100%*, Akses Cepat *Tata Naskah Dinas Permen 1/2025*).
- **Arsitektur Shell & Sidebar Modul Persuratan (`surat/layout.tsx`)**:
  - Sesuai prinsip desain sistem, sidebar modul persuratan tetap menggunakan **1 warna aksen tunggal yang seragam** yaitu **Teal Tua Kedinasan** (`--ds-accent-*`), persis seperti sidebar BMN yang seragam Emerald dan Kepegawaian yang seragam Biru.
  - Seluruh item aktif menggunakan spring layout indicator (`stiffness: 450, damping: 35`) dengan `shadow-2xs`, dot kanan `bg-[var(--ds-accent-solid)]`, dan teks `--ds-accent-fg`.
  - Transisi hover `150ms`, transisi collapse/expand dan laci mobile mulus `150ms` (`transition-[transform,width,visibility] duration-150 ease-out`), serta dukungan keyboard `Escape` dengan pemulihan fokus.
- **Dokumentasi & Verifikasi**:
  - Diperbarui di [`docs/DESIGN_SYSTEM_COLORS.md`](file:///e:/bksda-superapp/docs/DESIGN_SYSTEM_COLORS.md), [`docs/testing/persuratan-visual-audit.md`](file:///e:/bksda-superapp/docs/testing/persuratan-visual-audit.md), dan [`docs/bmn-ui-ux-modernization/visual-guidelines.md`](file:///e:/bksda-superapp/docs/bmn-ui-ux-modernization/visual-guidelines.md).
  - Test regresi [`frontend/tests/persuratan-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/persuratan-ui.cjs): **ALL CHECKS PASSED**.
  - TypeScript `tsc --noEmit` & ESLint: **0 errors**.
  - Knowledge graph: `graphify update .` **100% updated**.
  - **Commit Terverifikasi**: Commit `61a551c6` — `feat(surat): standardize 3-color theme for Persuratan content and harmonize Teal sidebar with BMN and Kepegawaian`.

---

## 104. Pembersihan Menyeluruh Warna Non-Standar di Modul Persuratan & Penyesuaian Ikon Modul Aktif Teal Tua (12 November 2026)

- **Pembersihan Residu Warna Non-Standar di Seluruh Modul Persuratan**:
  - Audit kode menyeluruh pada `frontend/src/app/surat/` mendeteksi dan membersihkan seluruh warna sisa (`purple-`, `indigo-`, `sky-`, `violet-`):
    - [`TemplatePickerModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/TemplatePickerModal.tsx): 20 format naskah dinas diselaraskan ke dalam 3 warna tema (Biru untuk Korespondensi, Teal untuk Administrasi & Tugas, Amber untuk Regulatif & Kemitraan).
    - [`dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx): Header Card 1 (Calendar) dan Card 4 (UserCheck) diganti ke token `--ds-accent-fg`. Ikon pengirim dan catatan format diganti ke token `--ds-accent-soft` dan `--ds-accent-fg`. Tombol tambah tembusan diselaraskan ke token hover aksen.
    - [`LembarDisposisiForm.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/LembarDisposisiForm.tsx): Header Form 2 dan tombol "+ Tambah Penerus" yang sebelumnya hardcoded `blue-600` diganti menggunakan `--ds-accent-solid` dan `--ds-accent-fg`.
    - [`settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/settings/page.tsx): Badge template "Kustom" diganti dari `purple-` ke warna Amber.
    - [`SifatCellPopover.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/masuk/_components/SifatCellPopover.tsx): Badge sifat "Rahasia" diganti dari `purple-` ke Slate netral kedinasan yang formal.
- **Penyesuaian Ikon Modul Aktif & Kartu Portal ke Teal Tua Kedinasan**:
  - [`module-switcher.tsx`](file:///e:/bksda-superapp/frontend/src/components/module-switcher.tsx): Mengganti warna icon di sebelah tulisan "Modul Aktif" untuk Persuratan dari Indigo (`bg-[#4f46e5]`) menjadi **Teal Tua Kedinasan** (`solidColor: "bg-[#0f766e] text-white dark:bg-[#2dd4bf] dark:text-[#0f172a]"`) dan soft color dropdown menjadi `bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300`.
  - [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx): Kartu modul Persuratan di Portal diselaraskan ke Teal (`text-[#0f766e] dark:text-teal-400`, `bg-[#f0fdfa] dark:bg-teal-950/60`, `border-[#ccfbf1] dark:border-teal-900/40`).
- **Verifikasi Kualitas & Regresi**:
  - `git grep -n -E "(indigo|violet|purple)" frontend/src/app/surat/`: **0 temuan (bersih total)**.
  - Test regresi UI [`frontend/tests/persuratan-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/persuratan-ui.cjs): **ALL CHECKS PASSED**.
  - TypeScript `tsc --noEmit` & ESLint: **0 errors / 0 warnings**.
  - Knowledge graph: `graphify update .` **100% updated**.
  - **Commit Terverifikasi**: Commit `a0555c42` — `feat(surat): purge rogue colors across Persuratan and align active module switcher icon to Teal palette`.

---

## 105. Harmonisasi Animasi & Mikro-Interaksi Modul Persuratan Sesuai Standar BMN & Kepegawaian (12 November 2026)

- **Paritas Animasi & Mikro-Interaksi dengan BMN & Kepegawaian**:
  - Mengikuti pola animasi di Modul Kepegawaian (`kepegawaian/page.tsx`, `KepegawaianDashboardComponents.tsx`) dan Modul BMN (`bmn/page.tsx`, `BmnDashboardComponents.tsx`), seluruh halaman utama Persuratan kini memiliki perilaku gerak yang halus dan dinamis:
    - **Bento Stat Cards & Animated Progress (`SuratHubComponents.tsx`)**: Menambahkan mikro-interaksi `whileHover: { y: -3 }`, `whileTap: { scale: 0.98 }`, pembesaran ikon halus (`scale-105`), serta animasi pengisian horizontal progress proportion bar (`initial={{ width: 0 }}`, `animate={{ width: ... }}`) berdurasi 0.6s `easeOut`.
    - **Akses Pintas / Quick Action Links (`surat/page.tsx`)**: Menambahkan `whileHover: { y: -2.5 }`, `whileTap: { scale: 0.98 }`, pembesaran ikon `group-hover:scale-105`, dan pergeseran diagonal panah kanan atas (`group-hover:translate-x-0.5 group-hover:-translate-y-0.5`).
    - **Tabel Ringkasan Surat Terbaru (`SuratHubComponents.tsx`)**: Header link *"Lihat Semua"* memiliki animasi pergeseran ikon chevron (`group-hover:translate-x-0.5`), dan baris tabel memiliki transisi latar halus (`hover:bg-[var(--ds-surface-muted)]/70`).
    - **Floating Batch Selection Toolbar (`surat/masuk/page.tsx`)**: Toolbar cetak disposisi massal dibungkus `<AnimatePresence>` dengan pegas halus (`type: "spring", stiffness: 450, damping: 32`), sehingga muncul dan menghilang tanpa *layout pop*.
    - **Spring Pill Layout Tab Indicators (`settings/page.tsx` & `TemplatePickerModal.tsx`)**: Tab filter dinamis menggunakan `<motion.span layoutId="..." />` (`stiffness: 420, damping: 32`) yang meluncur dinamis antar-tab, serta kartu template di modal picker memiliki `whileHover: { y: -2 }` dan `whileTap: { scale: 0.98 }`.
- **Aksesibilitas Penuh (`prefers-reduced-motion`)**:
  - Seluruh efek gerak terikat pada hook `useReducedMotion()`. Saat pengguna mengaktifkan preferensi kurangi gerak di tingkat sistem, durasi animasi otomatis diset ke 0 atau dinonaktifkan demi kenyamanan mata.
- **Verifikasi Kualitas & Regresi**:
  - Test regresi UI [`frontend/tests/persuratan-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/persuratan-ui.cjs): **ALL CHECKS PASSED**.
  - TypeScript `tsc --noEmit` & ESLint: **0 errors / 0 warnings**.
  - Knowledge graph: `graphify update .` **100% updated**.
  - **Commit Terverifikasi**: Commit `b76c708f` — `feat(surat): harmonize animations and micro-interactions with BMN and Kepegawaian standards`.

---

## 106. Standarisasi Header Card Halaman dan Harmonisasi Label Menu Modul Persuratan (12 November 2026)

- **Standarisasi Menyeluruh Header Card Kanonikal Lintas Seluruh Halaman Persuratan**:
  - Mengikuti struktur kanonikal Enterprise Header Card pada Agenda Surat Masuk (`surat/masuk/page.tsx`), Dashboard Kepegawaian (`kepegawaian/page.tsx`), dan Dashboard/Inbox Surat Tugas (`kepegawaian/surat-tugas/inbox/page.tsx`), seluruh halaman di modul Persuratan kini memiliki tampilan header yang seragam:
    - **Struktur Kontainer**: `rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4` dengan layout `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`.
    - **Blok Ikon & Navigasi**: Kotak ikon `w-10 h-10 rounded-xl bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0` (`w-5 h-5` icon) yang dipasangkan dengan tombol kembali `kpg-secondary h-10 w-10 p-0 rounded-xl shrink-0` pada sub-halaman form/naskah.
    - **Tipografi**: Judul `text-lg md:text-xl font-bold text-[var(--ds-fg)] tracking-tight` dan subjudul `text-xs text-[var(--ds-fg-muted)] mt-0.5`.
    - **Tombol Aksi Terstandarisasi**: Tombol aksi kanan setinggi `h-9 px-3.5 text-xs font-semibold rounded-xl gap-1.5`.
  - **Halaman yang Ditata Ulang**:
    1. [`surat/masuk/create/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/masuk/create/page.tsx): Menggantikan breadcrumb polos dengan header card kanonikal, ikon `Inbox` (`w-5 h-5`), judul *"Input Surat Masuk & Lembar Disposisi"*, subjudul, tombol kembali, dan tombol cepat *"Daftar Agenda Masuk"*.
    2. [`surat/keluar/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/page.tsx): Header card kanonikal dengan ikon `Send` (`w-5 h-5`), judul *"Agenda Surat Keluar"*, subjudul, dan tombol *"Buat Naskah Dinas"* + *"Input Manual"*.
    3. [`surat/keluar/create/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/create/page.tsx): Menggantikan breadcrumb polos dengan header card kanonikal, ikon `Send` (`w-5 h-5`), tombol kembali, judul *"Input Surat Keluar Baru"*, subjudul, dan tombol *"Daftar Agenda Keluar"*.
    4. [`surat/keluar/dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx): Menggantikan header baris `border-b` dengan header card kanonikal, tombol kembali `h-10 w-10`, ikon template `w-10 h-10`, judul dinamis *"Buat/Edit <Naskah>"*, badge format, serta tombol aksi kanan.
    5. [`surat/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/settings/page.tsx): Menggantikan header baris `border-b` dengan header card kanonikal, ikon `SlidersHorizontal` (`w-10 h-10`), judul *"Pengaturan Template Naskah Dinas"*, subjudul, dan tombol aksi terstandarisasi.
- **Harmonisasi Label Navigasi Sidebar (`surat/layout.tsx`)**:
  - Mengubah label menu sidebar agar lebih deskriptif dan konsisten dengan halaman tujuan:
    - `"Input Agenda Masuk"` -> `"Input Surat Masuk & Disposisi"` (`/surat/masuk/create`)
    - `"Input Agenda Keluar"` -> `"Input Surat Keluar"` (`/surat/keluar/create`)
- **Verifikasi Kualitas & Regresi**:
  - Test regresi UI [`frontend/tests/persuratan-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/persuratan-ui.cjs): **ALL CHECKS PASSED**.
  - TypeScript `tsc --noEmit` & ESLint: **0 errors / 0 warnings**.
  - Knowledge graph: `graphify update .` **100% updated**.
  - **Commit Terverifikasi**: Commit `fed022d1` — `feat(surat): standardize canonical Enterprise Header Cards across all subpages and harmonize sidebar menu labels`.

---

## 107. Peningkatan Arsitektur Modul DeReporting Internal: Multi-Penerima (Urusan & Personal), Anti-IDOR, Enterprise Header Card, Segmented Tabs, Quick PDF Viewer, dan E2E Test Suite (12 November 2026)

- **Fondasi Database & Relasi Multi-Penerima (`2026_11_13_000001_create_dr_internal_recipients_table.php`, `dr_internals`, `dr_internal_recipients`)**:
  - Menambahkan kolom `target_scope` (`all`, `restricted`), `review_status` (`terkirim`, `sesuai`, `perlu_revisi`), dan `review_notes` pada tabel `dr_internals`.
  - Membuat tabel pivot `dr_internal_recipients` (`internal_id`, `recipient_type`, `user_id`, `urusan_name`, `read_at`) dengan indeks komposit untuk pencarian cepat $O(1)$.
  - Menghubungkan relasi Eloquent `Internal::recipients()` dan `InternalRecipient::internal()`, serta integrasi otomatis penempatan urusan pegawai dari profil `kpg_employees.resor` / `satuan_kerja`.
- **Keamanan Backend & Anti-IDOR Scoping (`InternalController.php`, `StoreInternalRequest.php`, `api.php`)**:
  - **Query Scoping (*Need-to-Know Basis*)**: Pengguna biasa hanya dapat melihat laporan publik balai (`all`), laporan yang diunggah sendiri, laporan yang ditujukan khusus ke NIP/akunnya, dan laporan yang ditujukan ke Urusan/Seksi tempatnya bertugas. Super Admin dan Pimpinan memiliki akses menyeluruh (*Executive View*).
  - **Proteksi Anti-IDOR**: Endpoint streaming dan unduh (`/internals/{id}/download` dan `/internals/{id}/preview`) dilindungi pemeriksaan hak akses sebelum mengakses berkas fisik di `storage/app/private/`. Akses tidak berhak langsung diblokir `403 Forbidden`.
  - **Tanda Baca Otomatis (*Read Receipt*)**: Membuka `/preview` otomatis mencatat timestamp `read_at = now()` pada baris penerima yang bersangkutan.
  - **Konfirmasi Tinjauan**: Endpoint `PUT /internals/{id}/review` memungkinkan penerima target atau admin mengonfirmasi hasil tinjauan (`sesuai` atau `perlu_revisi` disertai catatan).
  - **Kandidat Penerima**: Endpoint aman `GET /api/dereporting/recipients/candidates` untuk mencari staf Balai sebagai penerima personal tanpa mengekspos data kredensial.
- **Harmonisasi UI/UX Enterprise Frontend (`dereporting/internal/page.tsx`, `InternalUploadDrawer.tsx`, `InternalReportPreviewModal.tsx`, `InternalReportReviewModal.tsx`)**:
  - **Enterprise Header Card**: Menerapkan struktur kanonikal header card seragam (`rounded-2xl border bg-[var(--ds-surface)] p-4`, kotak ikon `w-10 h-10` `FileText`, judul `text-lg md:text-xl font-bold`, dan tombol aksi `h-9 px-3.5`).
  - **Segmented Tab Navigation**: Tab dengan indikator pegas Framer Motion (`all_relevant`, `personal`, `urusan`, `my_uploads`, dan `balai`).
  - **Multi-Target Upload Drawer**: Memungkinkan pengunggah memilih sasaran laporan (*Semua Pegawai* vs *Sasaran Terbatas* dengan pilihan pill multi-Urusan dan pencarian pegawai personal).
  - **Quick In-App PDF Preview**: Modal pratinjau instan dokumen PDF dari brankas server tanpa perlu mengunduh file ke penyimpanan lokal, dengan pembaruan status baca secara *optimistic*.
  - **Review Modal**: Dialog konfirmasi tinjauan laporan kedinasan.
- **Verifikasi Kualitas & Test Suite Komprehensif**:
  - **Backend Feature Test**: `backend/tests/Feature/DeReportingInternalRBACTest.php` -> **9 tests, 24 assertions, 100% PASS**.
  - **Frontend Playwright E2E Test**: `frontend/tests/dereporting-internal-rbac.playwright.cjs` -> **6/6 suites, 18 assertions, 100% PASS**.
  - **TypeScript & ESLint**: `tsc --noEmit` & `eslint` -> **0 errors / 0 warnings**.
  - **Knowledge Graph**: `graphify update .` -> **100% updated**.
  - **Commit Terverifikasi**: Commit `4b06b782` — `feat(dereporting): implement multi-recipient RBAC, anti-IDOR, Enterprise Header Card, and E2E test suite for internal reports`.

---

## 108. Penerapan Tema Opsi 1 (Amber Kedinasan 60-30-10) pada Dashboard & Layout Modul DeReporting (12 November 2026)

- **Penyelarasan Warna Identitas Modul DeReporting ke Amber Kedinasan (`#b45309` / `#fbbf24`)**:
  - Menggantikan warna ungu/violet usang di sidebar dan dashboard dengan **Amber Kedinasan** (sesuai registrasi `module-switcher.tsx` dan `DESIGN_SYSTEM_COLORS.md` dengan kontras WCAG AA 5.02:1 light / 12.29:1 dark).
  - **Penerapan Kaidah Proporsi 60-30-10**:
    - **60% Dominan**: Kanvas halaman bersih netral `bg-zinc-50/60 dark:bg-black` dengan surface kontainer putih kedinasan `bg-white dark:bg-zinc-900`.
    - **30% Sekunder**: Sidebar terstandar dengan border halus `border-zinc-200 dark:border-zinc-800/60`, tipografi terstruktur `text-[var(--ds-fg)]`, dan garis pemisah tabel yang tenang.
    - **10% Aksen**: Ikon header aktif DeReporting `from-amber-600 to-amber-700`, active link navigasi ber-border aksen, tombol CTA utama `bg-amber-700 hover:bg-amber-800`, dan highlight data.
- **Enterprise Header Card Kanonikal pada Dashboard DeReporting (`dereporting/page.tsx`)**:
  - Menghapus header unstyled lama dan menerapkan kontainer kanonikal `rounded-2xl border border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] p-4 md:px-6 md:py-4`.
  - Blok ikon `w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400` dengan ikon `BarChart3`.
  - Judul `text-xl md:text-2xl font-bold tracking-tight` *"Pusat Komando Laporan"* dan subjudul informatif.
  - Tombol aksi cepat: *"Buka Laporan Internal"* (`bg-amber-700`) dan *"Laporan Publik"*.
- **Harmonisasi Bento KPI Cards & Palet Grafik Recharts**:
  - 4 kartu stat dengan micro-interaction hover lift `hover:-translate-y-0.5`: Laporan Internal (Amber), Laporan Publik (Blue), Menunggu Tinjauan (Warm Orange), Bidang Aktif (Emerald).
  - Palet grafik batang distribusi bidang diselaraskan ke gradasi Amber Kedinasan (`#d97706`, `#b45309`, `#f59e0b`, `#92400e`, `#fbbf24`, `#78350f`) dengan tooltip bertema surface kedinasan.
- **Verifikasi Kualitas**:
  - TypeScript `tsc --noEmit` & ESLint: **0 errors / 0 warnings**.
  - Playwright E2E Test `dereporting-internal-rbac.playwright.cjs`: **6/6 suites PASS**.
  - Knowledge graph: `graphify update .` **100% updated**.
  - **Commit Terverifikasi**: Commit `1f1fbec6` — `feat(dereporting): apply Option 1 Amber Kedinasan 60-30-10 palette to Dashboard and Layout`.

---

## 109. Harmonisasi Border Card, Animasi, dan Hover Modul DeReporting Mengacu Standar Modul Kepegawaian & BMN (12 November 2026)

- **Audit Komparatif Modul Kepegawaian (`kepegawaian/page.tsx`) & BMN (`bmn/page.tsx`)**:
  - Menemukan formula ketebalan border kartu standar BKSDA:
    - **Outer Card Border**: Bukan border solid pekat atau border default tebal, melainkan *delicate hairline alpha border* `border border-slate-200/80 dark:border-zinc-800/80` berpadu dengan elevasi sangat halus `shadow-2xs`.
    - **Interactive Hover Border**: Saat disentuh pointer kursor, border bertransisi anggun ke aksen tematik (`hover:border-amber-400/70 dark:hover:border-amber-500/40 transition-colors`).
    - **Inner Icon Box**: Menggunakan alpha border halus `border border-amber-200/60 dark:border-amber-500/20` dengan latar belakang pastel lembut `bg-amber-50 dark:bg-amber-500/10` (tidak ada border tebal gelap yang kontras tajam).
    - **Micro-Interaction Framer Motion**: Pembungkus kartu menggunakan pegas halus `<motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>` dengan perlindungan aksesibilitas `useReducedMotion()`.
- **Implementasi pada Dashboard DeReporting (`frontend/src/app/dereporting/page.tsx`)**:
  - Memperbarui Enterprise Header Card: `rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 md:px-6 md:py-4 shadow-2xs`.
  - Memperbarui 4 Bento KPI Stat Cards menjadi tautan interaktif responsif beranimasi Framer Motion:
    - *Laporan Internal*: `iconBg: bg-amber-50 dark:bg-amber-500/10 border-amber-200/60`, hover `hover:border-amber-400/70`.
    - *Laporan Publik*: `iconBg: bg-blue-50 dark:bg-blue-500/10 border-blue-200/60`, hover `hover:border-blue-400/70`.
    - *Menunggu Tinjauan*: `iconBg: bg-orange-50 dark:bg-orange-500/10 border-orange-200/60`, hover `hover:border-orange-400/70`.
    - *Bidang Aktif*: `iconBg: bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60`, hover `hover:border-emerald-400/70`.
  - Kartu visualisasi Recharts Grafik Distribusi Bidang diperbarui dengan kontainer `bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-2xs` dan badge tahun ber-border halus.
- **Implementasi pada Halaman DeReporting Laporan Internal (`frontend/src/app/dereporting/internal/page.tsx`)**:
  - Header card diperbarui ke hairline border `border-slate-200/80 dark:border-zinc-800/80 shadow-2xs`.
  - Kotak filter segmented tabs: `bg-slate-100/70 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800/80` dengan tab aktif bergaris halus.
  - Kontainer tabel laporan kedinasan: `rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xs`, garis antar-baris halus `divide-slate-100 dark:divide-zinc-800/80`, dan hover baris `hover:bg-slate-50/70 dark:hover:bg-zinc-800/40`.
  - Tombol pagination footer terstandardisasi dengan `border-slate-200/80 dark:border-zinc-800/80 shadow-2xs`.
- **Verifikasi Kualitas Komprehensif**:
  - **Next.js Production Build**: `npm run build --prefix frontend` -> **Compiled successfully in 24.2s, 86/86 static pages generated, TypeScript 0 errors**.
  - **Playwright E2E Suite**: `node frontend/tests/dereporting-internal-rbac.playwright.cjs` -> **6/6 suites, 18 assertions PASS (100%)**.
  - **Screenshot Verifikasi Visual**: Berhasil menguji rendering halus pada artefak visual `dereporting_cards_delicate_borders.png` dan `dereporting_internal_delicate_borders.png`.

---

## 110. Audit Mendalam Modul BKSDA Drive (FE ↔ BE ↔ DB) & Rencana Remediasi (13 November 2026)

- **Dokumen Lengkap**: [`docs/security/drive-deep-audit-and-remediation-plan-2026-11-13.md`](file:///e:/bksda-superapp/docs/security/drive-deep-audit-and-remediation-plan-2026-11-13.md)
- **Ringkasan 23 Temuan (Dibuktikan via Code Review Menyeluruh FE↔BE↔DB & Probe Test Sementara)**:
  - **Upload Massal & Kuota (#1–#5, #20)**: Kegagalan upload banyak file disebabkan oleh shared throttle bucket `throttle:60,1` tanpa prefix (gagal di file #30 dengan HTTP `429`), `completeUpload` belum memvalidasi status/keberadaan objek di S3 (menimbulkan file hantu & duplikat), klaim `size` dapat melewati batas kuota, `unit_id` dapat dipalsukan saat upload ke folder, tidak adanya endpoint `abort` sehingga upload gagal mengunci kuota selama 2 jam, serta **file di Sampah membebaskan kuota dan `restore()` tidak mengecek kuota** (celah bypass kuota tak terbatas).
  - **Relasi Putus FE ↔ BE ↔ DB (#12–#17, #19, #21–#23)**: 5 aksi utama di `frontend/src/app/drive/page.tsx` memakai path jamak (`/drive/files/`, `/drive/folders/`) sementara route backend hanya menerima tunggal (`/drive/file/`, `/drive/folder/`) sehingga selalu `404`; `forceDelete` folder terbatas melepas file rahasia ke root unit (`nullOnDelete`) dan membocorkan akses ke seluruh anggota unit; share internal gagal di BE (`canReadFile` mengabaikan `drive_shares` pada file dalam folder) dan di FE (`DriveShareDialog.tsx` mengirim `employee.id` bukan `users.id` dan state dialog tidak di-reset antar-file); `moveFolder` lintas unit tidak memindahkan `unit_id` turunannya; tombol edit/hapus tampil di mode *Dibagikan dengan saya*; menu *"Atur Admin Resor"* dan **chip filter kategori di `DriveToolbar.tsx`** tidak terhubung dari `page.tsx`; **memulihkan file dari folder yang masih di Sampah menghasilkan file yatim/tak terlihat**; **mode Sampah di `DriveFileList.tsx` mengabaikan `canWrite` serta mengeksekusi `Hapus Permanen` tanpa dialog konfirmasi**; dan **halaman `/drive/s/[token]` tidak memakai normalisasi URL `api.ts`**.
  - **Infrastruktur, Keamanan, Skema & Fitur (#6–#11, #18)**: CORS `ExposeHeaders: ETag` untuk bucket `bksda-drive` belum dikodekan di `storage:setup`, ambang single PUT 100 MB berbenturan batas Cloudflare, N+1 query tanpa paginasi, blocklist MIME tidak akurat, kredensial fallback hardcoded di `filesystems.php`, serta **fitur Transfer Ownership belum tersedia** (ditambah FK `user_id` memakai `cascadeOnDelete`).
- **Rencana & Pelaksanaan Remediasi**: Seluruh temuan kritis/tinggi/sedang (perbaikan 5 URL jamak→tunggal, isolasi `throttle:300,1,drive_upload` + auto-retry `429`, hardening `completeUpload` + cek ukuran S3 aktual + endpoint `abort`, paksa `unit_id` folder induk, `DriveUnit::usedStorageBytes()` `withTrashed()`, rekursif `trash`/`restore`/`forceDelete` + anti-file-yatim, `DriveAccess` share file `user`/`unit` + `GET /api/drive/shares/candidates` + UI `DriveShareDialog`, rekursif `moveFolder` + cek kuota lintas ruang, fitur **Transfer Ownership**, sambungan `categoryFilter`, `isDriveAdmin`/`onAssignManager`, konfirmasi `Hapus Permanen`, `storage:setup --drive` CORS `ETag`, pembersihan kredensial fallback `filesystems.php`, dan migrasi skema `2026_11_14_000001_harden_drive_schema_and_ownership.php`) telah diimplementasikan.
- **Verifikasi Aktual**:
  - **PHPUnit (8 Suite Drive)**: `67/67 tests PASSED (356 assertions)` termasuk [`DriveSecurityAndIntegrityTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/DriveSecurityAndIntegrityTest.php).
  - **Next.js Production Build**: `0 TypeScript errors`, `86/86 static pages`.
  - **Playwright E2E**: `drive-security-ui.playwright.cjs` (`12/12, 30 assertions PASS`) & `drive-agentic-root.playwright.cjs` (`10/10, 22 assertions PASS`).
- **Status**: ✅ Selesai Diimplementasikan & Terverifikasi (tinggal eksekusi `php artisan migrate` dan `php artisan storage:setup --drive` di server produksi).







---

## 111. Audit Mendalam & Uji Sandbox 5-User Sistem Notifikasi Portal (14 November 2026)

- **Dokumen Lengkap**: [`docs/security/portal-notifications-deep-audit-2026-11-14.md`](file:///e:/bksda-superapp/docs/security/portal-notifications-deep-audit-2026-11-14.md)
- **Akar Masalah Kasus Pengajuan Cuti "Duriawati Halim" (`404` pada Super Admin & Admin)**:
  - `EmployeeLeaveRequestController::myStore()` memanggil `PortalNotificationService::notifyAdmins('kepegawaian', ..., 'cuti', 'cuti', (string) $leaveReq->id)` tanpa `data.link` admin.
  - Klik notifikasi di `NotificationBell.tsx` membawa admin/super_admin ke tab pribadi `cuti` di `/portal`, yang memanggil `GET /api/me/leave-requests/{id}` (`myShow()`). Endpoint `myShow()` membatasi akses hanya untuk pemilik `employee_id` sesuai NIP user (`super_admin` tidak memiliki record `Employee`, sedangkan `admin` Kepegawaian memiliki `employee_id` berbeda), sehingga backend mengembalikan HTTP `404` dan `MyLeaveTab.tsx` menampilkan toast *"Permohonan cuti tidak tersedia atau tidak dapat diakses."*.
- **7 Temuan Audit (BE <-> FE <-> E2E)**:
  1. **(Tinggi)** Notifikasi pengajuan cuti untuk `super_admin` & `admin` selalu gagal `404` di Portal.
  2. **(Sedang)** Notifikasi DeReporting (`type: 'dereporting'`, `action_tab: 'responses'`, `data.link`) terputus: filter `?type=dereporting` diabaikan di `PortalNotificationController::index()`, `'responses'` tidak ada di `VALID_PORTAL_TABS`, dan `NotificationBell.tsx` tidak memproses `item.data.link`.
  3. **(Sedang)** Notifikasi `HealthMonitorCommand` (`action_tab: 'pengaturan'`) untuk `super_admin` fallback ke tab `dashboard`.
  4. **(Sedang)** Blindspot tab *"Belum Dibaca"* di popover `NotificationBell.tsx`: popover hanya mengambil 8 item terbaru (`per_page=8`) lalu menyaring unread di client; jika unread berada di posisi >= 9, popover tampil kosong (*"Semua notifikasi sudah dibaca"*) meski badge > 0.
  5. **(Rendah)** Tombol *"Buka"* pada toast WebSocket (`NotificationBell.tsx`) tidak memanggil `handleMarkAsRead()`.
  6. **(Rendah)** Notifikasi peserta dihapus dari Surat Tugas (`AssignmentLetterController.php`) tetap mengirim `action_tab: 'surat_tugas'` + `reference_id` sehingga klik memicu toast error; notifikasi pinjaman BMN tidak menyorot `reference_id`.
  7. **(Rendah)** 4 test script notifikasi FE lama (`frontend/tests/portal-notification-bell.cjs`, dll.) gagal `ENOENT` di Windows karena hardcode path `/frontend/...`.
- **Verifikasi Sandbox 5-User & Implementasi Perbaikan (`/ponytail` + `/security-audit`)**:
  - **Perbaikan Diterapkan**: `EmployeeLeaveRequestController::myStore()` (`data.link = '/kepegawaian/cuti'`), `PortalNotificationController::index()` (allowlist `'dereporting'`), `HealthMonitorCommand` (`actionTab = 'dashboard'`, `data.link = '/'`), `echo.ts` (prioritas `NEXT_PUBLIC_REVERB_HOST`/`PORT`/`SCHEME`), `NotificationBell.tsx` (`resolveSafeInternalLink` anti-open-redirect, toast `"Buka"` mark-as-read, `unread_only=1` di popover, skip `reference_id` saat `removed`/`unavailable`, ikon `'dereporting'`), serta fallback `portal/page.tsx` untuk cuti legacy `super_admin`.
  - **PHPUnit (5 Suite Notifikasi + Tes Baru `test_pn_04`)**: `47/47 tests PASSED (500 assertions)` dalam `36.75s`.
  - **Next.js Production Build**: `npm run build --prefix frontend` -> `Compiled successfully in 12.6s`, `0 TypeScript errors`, `86/86 static pages`.
  - **Playwright Live Full-Stack E2E (`frontend/tests/portal-notifications-live-e2e.playwright.cjs` di `:3199` <-> Laravel `:8000` <-> PostgreSQL)**: **SEBAGIAN BERHASIL (`9 PASS`, `1 STOPPED / BLOCKED`)** — `E2E-LIVE-01A` s.d. `06B` (termasuk blokir open-redirect `//evil.example`) `PASS`; `E2E-LIVE-07` (Reverb live WebSocket) `STOPPED / BLOCKED` karena `NEXT_PUBLIC_REVERB_APP_KEY` tidak dikonfigurasi di `frontend/.env.local` dan port `8080` dipakai proses lain (`iVMS-4200`).
- **Status**: Selesai diimplementasikan & diverifikasi; hanya jalur live WebSocket Reverb yang masih `STOPPED / BLOCKED` hingga env & service Reverb dijalankan.

---

## 112. Implementasi Notifikasi Detail Aset BMN, Sibling Callers, Scheduler Tenggat & Sinkronisasi Portal/BMN (15 November 2026)

- **Dokumen Lengkap**: [`docs/security/bmn-asset-detail-notifications-plan-2026-11-15.md`](file:///e:/bksda-superapp/docs/security/bmn-asset-detail-notifications-plan-2026-11-15.md)
- **Pendekatan `/ponytail` + `/security-audit`**:
  - **Sentralisasi di [`AssetService.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Services/AssetService.php)**: Menambahkan helper terpadu (`notifyOwnershipChange`, `notifyConditionCritical`, `notifyFreezeTransition`, `notifyDisposedAssets`, `notifyRestoredAssets`, `notifyBulkAssigned`, `notifyEmployeeBmnClearance`) tanpa membuat tabel/service baru.
  - **Keamanan & Privasi Data**: Pesan pengalihan (`A -> B`) dan penghapusan (`dispose`/`bulkDispose`) tidak membocorkan nama pengganti, `alasan_perubahan`, `alasan_pemutihan`, maupun nilai taksiran lelang; payload penarikan/penghapusan menyertakan `availability: 'unavailable' | 'trashed'` dan `status: 'removed'`; notifikasi massal > 3 aset per pegawai dirangkum menjadi 1 notifikasi; notifikasi hak Admin BMN mengarah langsung ke Dashboard BMN via `data.link = '/bmn'` tanpa memasang bell duplikat di `bmn/layout.tsx`.
  - **Cakupan Seluruh *Sibling Callers* & Kebersihan Data**: Memasang notifikasi dan konsistensi di [`AssetController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/AssetController.php) (`bulkDispose`, `bulkRestore`, `bulkUpdateKondisi`, `import`), [`AssetImport.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Imports/AssetImport.php), [`ImportReviewController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/ImportReviewController.php) (dua cabang restore `'new'` dan `'updated'`), [`AuctionBatchService.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Services/AuctionBatchService.php) (`lockAndSubmit`, `realize`, `cancel`), [`MaintenanceService.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Services/MaintenanceService.php), [`StoreAssetRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Requests/StoreAssetRequest.php), [`AssetResource.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Resources/AssetResource.php), [`DashboardController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/DashboardController.php) (`plat_expiring_soon` & `overdue_loans`), serta alert tanggungan BMN ke Admin BMN pada [`ApplyEmployeeLifecycleCommand.php`](file:///e:/bksda-superapp/backend/app/Console/Commands/ApplyEmployeeLifecycleCommand.php) dan [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php).
  - **Peminjaman & Scheduler Idempoten**: [`LoanService.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Services/LoanService.php) melindungi `createLoan()` agar tidak menimpa pemegang tetap (`employee_id !== null`) serta melengkapi `updateLoan()` / `deleteLoan()` dengan menjaga kontrak imutabilitas `test_bn03_*`; command harian [`BmnNotifyDeadlinesCommand.php`](file:///e:/bksda-superapp/backend/app/Console/Commands/BmnNotifyDeadlinesCommand.php) (`bmn:notify-deadlines` pukul `07:30` WITA di [`routes/console.php`](file:///e:/bksda-superapp/backend/routes/console.php)) mempromosikan pinjaman jatuh tempo ke `terlambat` dan mengirim pengingat STNK/Ganti Plat (`H-30`/`H-7`/`H-0`/overdue mingguan) serta pinjaman dengan deduplikasi permanen `data->dedup_key`. Migrasi [`2026_11_05_075000_fix_bmn_asset_loans_status_check_constraint.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Migrations/2026_11_05_075000_fix_bmn_asset_loans_status_check_constraint.php) diselaraskan agar status `'terlambat'` didukung di SQLite pengujian.
  - **Frontend Portal & BMN**: [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx), [`MyAssetsTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyAssetsTab.tsx), dan [`ActiveLoansTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/ActiveLoansTab.tsx) mendukung highlight scroll item (`loan_id ?? id`) dan memanggil `clearGetCache()` + `fetchAssets()` + `fetchDashboard()` saat event `"bmn"` masuk; [`bmn/assets/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/assets/%5Bid%5D/page.tsx), [`bmn/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/page.tsx), [`bmn/loans/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/loans/page.tsx), dan [`BorrowAssetModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/components/modals/BorrowAssetModal.tsx) memperbaiki sinkronisasi null `pengguna`/`nama_pengguna`, indikator tertautnya `employee_id`, panel `plat_expiring_soon` + `overdue_loans`, serta `useAdminInboxLive("bmn", ...)`.
- **Verifikasi Aktual**:
  - **PHPUnit**: [`NotificationBmnLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/NotificationBmnLifecycleTest.php) (termasuk 5 skenario baru `test_bmndetail_01` s.d. `05`), [`BmnLayoutAndSecurityRegressionTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php), dan [`NotificationHealthMonitorTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/NotificationHealthMonitorTest.php) -> **44 tests PASSED (251 assertions, 0 failed)** pada SQLite in-memory.
  - **TypeScript (`npx tsc --noEmit`)**: **0 errors** di `frontend/`.
- **Status**: ✅ Selesai Diimplementasikan & Di-commit pada `codex/portal-security-pentest` (`d861b148`, belum di-push; Next.js `npm run build` penuh dan verifikasi langsung pada database PostgreSQL produksi belum dijalankan pada sesi ini).

---

## 113. Security Audit BKSDA Drive & Blueprint Sinkronisasi Master Lokasi Tunggal (Kepegawaian ↔ Drive ↔ BMN ↔ Surat) (15 November 2026)

- **Dokumen Perencanaan Lengkap**: [`docs/security/kepegawaian-drive-placement-sync-audit-2026-11-15.md`](file:///e:/bksda-superapp/docs/security/kepegawaian-drive-placement-sync-audit-2026-11-15.md)
- **Yang Sudah Dikerjakan & Di-commit (`codex/portal-security-pentest`)**:
  1. **Security Audit & Ponytail Refactor Modul BKSDA Drive (+ DeReporting Integration)**:
     - `31a0b7f3` — *fix(drive): harden RBAC, folder move/create boundaries, upload verification, and simplify access helpers*.
     - `1f1f5950` — *fix(dereporting): use userOrId named arg and log notification dispatch failures*.
     - `e894c26d` — *fix(drive): prevent restricted file un-scoping via moveFile and add MIME fallback*.
     - **Verifikasi PHPUnit**: 9 suite Drive & DeReporting (`DeReportingDriveIntegrationTest`, `DriveDeepRootSecurityTest`, `DriveHierarchicalResorRBACTest`, `DriveLayoutAndSecurityRegressionTest`, `DriveRootConcurrencyAndMultipartTest`, `DriveSecurityAndIntegrityTest`, `DriveShareTest`, `DriveTest`, `DriveZipDownloadTest`) -> **72 tests PASSED (404 assertions)**.
  2. **Audit Akar Lintas-Modul & Wawancara Arsitektur (`/grill-me`) — Standar 10/10**:
     - Mengidentifikasi **15 akar masalah (RC-1 s.d. RC-15)** penyebab tidak sinkronnya mutasi pegawai di Kepegawaian dengan penempatan di BKSDA Drive maupun fragmentasi 3 daftar lokasi/ruangan yang berbeda antara BMN (`/bmn/settings` + Disposisi Surat), Drive (`BksdaConstants::BALAI_ROOMS` & `RESORS`), dan Kepegawaian (`SATUAN_KERJA_OPTIONS` & `RESOR_OPTIONS`).
     - Mengaudit celah skema, eager-loading, & permission route: UUID FK pada `bmn_locations.id` vs `name->unique()`, route `/bmn/locations` yang terkunci `permission:bmn.view` / `bmn.asset.update`, hilangya `location_id` & `room_code` pada `.select([...])` di `DriveController::index` (RC-9), pewarisan subfolder saat `is_restricted = false` & propagasi rekursif pohon subfolder (RC-11), pencabutan `DriveShare` level folder maupun berkas (`file_id`) pasca-mutasi (RC-12), transaksi atomik & `DriveAccess::clearCache()` di `EmployeeController::update` (RC-15), serta dampak konsumen hilir (`Employee::is_seksi`/`seksi_wilayah`, filter `EmployeeController::index`/`dashboardStats`, `EmployeeLeaveRequestController::getAtasanLangsung` + cetak cuti `FormulirCutiPrint.tsx` & `FormulirCutiPrintModal.tsx` [RC-13], DeReporting `InternalController` & `InternalUploadDrawer.tsx` [RC-10], `DriveController::moveFolder`, `DriveHierarchicalFoldersSeeder`, `DiteruskanCellPopover`, `employees/page.tsx`, `bmn/assets/[id]/page.tsx` [RC-14], dan Mobile).
     - Memfinalisasi keputusan desain `/grill-me` untuk menyatukan pengaturan lokasi menjadi **1 sumber kebenaran hierarkis** (**Induk Level 1: `balai` / `seksi` -> Turunan Level 2: `room` / `resor`**).
- **Yang Sudah Diimplementasikan (`RC-1`..`RC-15` dengan prinsip `/ponytail`)**:
  1. **Tahap 1 — Migrasi Skema & Master Lokasi Terpadu**: Menambahkan [`2026_11_15_000001_unify_locations_hierarchy_and_drive_sync.php`](file:///e:/bksda-superapp/backend/database/migrations/2026_11_15_000001_unify_locations_hierarchy_and_drive_sync.php) (`parent_id`, `location_type`, `drive_unit_id`, `code`, `is_restricted`, `is_active` pada `bmn_locations`, serta `location_id` pada `kpg_employees` dan `drive_folders`), memperbarui [`Location.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Models/Location.php) (`KNOWN_ROOM_CODES`, `syncDriveFolder`, resolusi penempatan, idempotent backfill), [`DriveFolder.php`](file:///e:/bksda-superapp/backend/app/Models/DriveFolder.php), [`BmnMasterDataSeeder.php`](file:///e:/bksda-superapp/backend/database/seeders/BmnMasterDataSeeder.php), serta menghapus `DriveUnit::where('id', '>', 4)->delete()` di [`DriveHierarchicalFoldersSeeder.php`](file:///e:/bksda-superapp/backend/database/seeders/DriveHierarchicalFoldersSeeder.php).
  2. **Tahap 2 — Validasi Hierarki & Sinkronisasi Rekursif Master -> Drive**: Memperbarui [`LocationController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/LocationController.php) untuk pembuatan **Seksi Baru** (auto-create `DriveUnit` dengan slug konsisten & folder umum Seksi, serta `unit_kerja` terisolasi dari Balai), **Ruangan**, dan **Resor** (wajib turunan **Seksi**, sinkronisasi rekursif folder/subfolder/file saat perubahan `is_restricted` atau relokasi induk), beserta guard hapus terhadap turunan, aset BMN, pegawai aktif, dan file Drive.
  3. **Tahap 3 — Otorisasi & Pencabutan Otomatis Saat Mutasi**: Memperbarui [`DriveAccess.php`](file:///e:/bksda-superapp/backend/app/Support/Security/DriveAccess.php) (`is_active`, resolusi `drive_unit_id` dari master, isolasi ruangan Balai + resor, pembatasan bypass pemilik `DriveFile` untuk *My Drive* pribadi, serta perbaikan kolom pivot `drive_unit_id` dan reset penuh `clearCache()` dalam `syncEmployeePlacement()`), terpasang di [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php) dan [`Employee.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Models/Employee.php).
  4. **Tahap 4 — Konsumen Hilir BE, Mobile, & UI Lintas Modul**: Menyediakan endpoint `/api/locations` (+ alias) pada [`routes/api.php`](file:///e:/bksda-superapp/backend/routes/api.php) & [`SuratMasukController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratMasukController.php); memperbaiki query/pewarisan folder di [`DriveController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/DriveController.php), [`EmployeeRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php), [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php), dan [`InternalController.php`](file:///e:/bksda-superapp/backend/app/Modules/DeReporting/Controllers/InternalController.php); serta mengekstrak UI Master Lokasi bertingkat di [`LocationManagementTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/settings/_tabs/LocationManagementTab.tsx) untuk `/bmn/settings` & `/kepegawaian/settings`, memperbarui [`frontend/src/lib/locations.ts`](file:///e:/bksda-superapp/frontend/src/lib/locations.ts), [`InternalUploadDrawer.tsx`](file:///e:/bksda-superapp/frontend/src/app/dereporting/internal/_components/InternalUploadDrawer.tsx), [`FormulirCutiPrint.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/FormulirCutiPrint.tsx), [`FormulirCutiPrintModal.tsx`](file:///e:/bksda-superapp/mobile/src/components/FormulirCutiPrintModal.tsx), modul Kepegawaian (`employees/create`, `employees/[id]`, `employees/page.tsx`, `EmployeeAuditHistoryTab.tsx`), dan BMN (`bmn/_lib/location-options.ts`, `bmn/assets`, `bmn/assets/[id]`).
- **Verifikasi 3 Lapis (Pasca-Edit Final)**:
  - **PostgreSQL Live Migration**: `php artisan migrate --force` sukses; kondisi live terverifikasi `26` `bmn_locations`, `151` pegawai terhubung (`0` unlinked), `0` data sandbox tersisa setelah cleanup.
  - **Backend PHPUnit (`LocationHierarchy|BmnMaster|Drive|DeReporting|Employee|Surat`)**: [`LocationHierarchyAndDriveSyncTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/LocationHierarchyAndDriveSyncTest.php) + regresi (`254` tests: **`252` passed**, `2` skipped PostgreSQL-only concurrency di SQLite `:memory:`, `0` failed, `2465` assertions).
  - **Frontend Build**: `cd frontend; npm run build` lulus (`exit 0`, **86/86** halaman statis, TypeScript `0` error).
  - **Playwright Live Full-Stack E2E** ([`location-hierarchy-drive-sync.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/location-hierarchy-drive-sync.playwright.cjs)): **7/7 checks PASSED** (`LIVE-01`..`LIVE-07`) langsung terhadap `:3000` <-> `:8000` <-> PostgreSQL `:5432` tanpa mock + cleanup `finally`.
- **Status**: ✅ **Selesai & Terverifikasi 3 Lapis** (Siap production / merge).

---

## 114. Penyelarasan Tampilan Detail Pegawai, Perbaikan Data Terhapus, & Shortcut Reaktivasi Pegawai Purna/Keluar (16 November 2026)

- **Yang Sudah Dikerjakan & Di-commit (`codex/portal-security-pentest`)**:
  1. **`06633dc5` — Penyelarasan Data Legacy & Tampilan Detail Pegawai dengan Master Lokasi**:
     - Backend [`Location::syncHierarchyAndBackfill()`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Models/Location.php#L547-L579) + migrasi [`2026_11_16_000001_sync_existing_employees_satuan_kerja_to_locations.php`](file:///e:/bksda-superapp/backend/database/migrations/2026_11_16_000001_sync_existing_employees_satuan_kerja_to_locations.php) menyelaraskan teks `satuan_kerja` dan kode `resor` seluruh pegawai existing (`kpg_employees`) mengikuti `location_id` Master Lokasi, dilengkapi cakupan tes di [`LocationHierarchyAndDriveSyncTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/LocationHierarchyAndDriveSyncTest.php).
     - Frontend [`getEmployeePlacementDisplay`](file:///e:/bksda-superapp/frontend/src/lib/locations.ts#L197-L234), [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx), [`employees/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/%5Bid%5D/page.tsx), [`LocationManagementTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/settings/_tabs/LocationManagementTab.tsx), serta Mobile [`EmployeeDetailModal.tsx`](file:///e:/bksda-superapp/mobile/src/features/kepegawaian/EmployeeDetailModal.tsx) & [`KepegawaianScreen.tsx`](file:///e:/bksda-superapp/mobile/src/features/kepegawaian/KepegawaianScreen.tsx) diselaraskan ke hierarki Master Lokasi (menghapus fallback statis lama `Seksi KSDA Wilayah III Balikpapan`).
  2. **`16541872` — Perbaikan Data Terhapus (Soft Delete) & Kebersihan E2E Sandbox**:
     - Mengidentifikasi penyebab `Data Terhapus (32)` tampil kosong saat filter aktif: `32` baris di `onlyTrashed()` (`#243`–`#274`, NIP `9901`–`9904`) merupakan sisa E2E [`portal-notifications-live-e2e.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs) yang sebelumnya memakai `->delete()`, sedangkan UI [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx) mempertahankan filter aktif (`wilayah`/`jenis`/pencarian) saat membuka `"trashed"` padahal `counts.trashed` dihitung sebelum filter diterapkan.
     - Menambahkan [`handleStatusChange`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx#L240-L245) di [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx) agar filter aktif otomatis di-reset ketika memasuki **Data Terhapus** (lewat kartu maupun dropdown `Status pegawai`).
     - Mengubah cleanup model `SoftDeletes` (`EmployeeLeaveRequest`, `AssignmentLetter`, `User`, `Employee`) di [`setupSandboxData`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs#L62-L65) & [`cleanupSandboxData`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs#L255-L260) ke `->withTrashed()->...->forceDelete()` serta membersihkan permanen `32` pegawai sandbox (`#243`–`#274`), `48` user `sbx_%`, `5` cuti sandbox, dan `4` ST sandbox di PostgreSQL (`0` data terhapus, `151` pegawai asli utuh).
  3. **`417b2ba6` — Tombol Shortcut Aktifkan Kembali Pegawai Purna / Non-Aktif (`/ponytail`)**:
     - Memasang tombol shortcut **Aktifkan** (`UserCheck`) pada baris non-sampah saat `canWrite && !emp.is_active` di [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx#L767-L777) untuk langsung membuka [`EmployeeLifecycleModal`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/_components/EmployeeLifecycleModal.tsx) tanpa menavigasi ke halaman detail, dengan tetap menjaga wajib isi catatan/No. SK, audit `REACTIVATE_EMPLOYEE`, dan pemisahan aktivasi akun portal via IAM.
- **Verifikasi Aktual**:
  - **PHPUnit [`LocationHierarchyAndDriveSyncTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/LocationHierarchyAndDriveSyncTest.php)**: `6 tests`, `66 assertions` **PASS** (`2153 ms`).
  - **Live Chrome Playwright (`/kepegawaian/employees`)**: verifikasi reset filter Trash (`PLAYWRIGHT_CHECK_PASSED`) dan tombol shortcut **Aktifkan** + modal reaktivasi (`REACTIVATE_SHORTCUT_PLAYWRIGHT_PASSED`; `is_active = true`, `inactive_reason = null`, log `REACTIVATE_EMPLOYEE`, serta cleanup kembali ke `151` pegawai / `0` trashed).
  - **Playwright [`portal-notifications-live-e2e.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs)**: `9 PASS`, `E2E-LIVE-07 STOPPED / BLOCKED` (`NEXT_PUBLIC_REVERB_APP_KEY` belum dikonfigurasi di `frontend/.env.local`); verifikasi DB sesudahnya tetap `0` di `onlyTrashed()`.
  - **Frontend Build & TypeScript**: `npx tsc --noEmit` (`0` error) dan `cd frontend; npm run build` (`86/86` static pages, exit `0`), serta `graphify update .` selesai.
- **Status**: ✅ Selesai Diimplementasikan, Diverifikasi, & Di-commit pada `codex/portal-security-pentest`.


---

## 115. Implementasi RBAC (`User` vs `Admin` vs `Super Admin`) Modul Persuratan, Kepegawaian, & BMN (16 November 2026)

- **Dokumen Perencanaan (`/grill-me` Final)**: [`docs/security/rbac-persuratan-dan-kepegawaian-plan-2026-11-16.md`](file:///e:/bksda-superapp/docs/security/rbac-persuratan-dan-kepegawaian-plan-2026-11-16.md)
- **Keputusan Arsitektur & Implementasi (`/ponytail` + `/security-audit`)**:
  1. **Engine Permission Terpusat ([`User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php) & [`useRole.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts))**:
     - Mempertahankan model 1 Role Global (`user` / `admin` / `super_admin`) + `access_modules` tanpa menambah skema tabel baru.
     - Mengunci `surat.manage`, `kepegawaian.manage`, `bmn.manage`, dan `bmn.asset.force_delete` khusus `super_admin`.
     - Menyediakan izin pembuatan/pengelolaan Surat Keluar mandiri (`surat.create`, `surat.update`, `surat.delete`, `surat.keluar.*`) bagi `role: user` yang memiliki modul `surat`, sambil mengunci `surat.masuk.*` dan `surat.export` khusus `admin` & `super_admin`.
     - Pada modul `bmn`, `role: user` dengan akses modul `bmn` hanya memperoleh `bmn.view` (inventaris read-only), sedangkan `role: admin` otomatis memperoleh seluruh izin operasional BMN tanpa perlu mencentang 16 permission satu per satu.
  2. **Modul Persuratan (`/surat`)**:
     - **Backend** ([`Surat/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Routes/api.php), [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php)):
       - Seluruh route `surat-masuk*` dikunci `role:admin,super_admin`.
       - Route mutasi `templates*` dikunci `role:super_admin` + `permission:surat.manage` (endpoint `GET /templates` tetap dapat dibaca `user` untuk Tata Naskah Dinas).
       - `SuratKeluarController::index()` memfilter `where('created_by', $user->id)` untuk `role: user`; `show()`, `update()`, dan `destroy()` memvalidasi kepemilikan `created_by === $user->id` (anti-IDOR `403`).
     - **Frontend** ([`surat/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/layout.tsx), [`surat/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/page.tsx), [`SuratHubComponents.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratHubComponents.tsx)):
       - Guard terpusat di `surat/layout.tsx` menyembunyikan menu & me-redirect `user` dari `/surat/masuk*`, `/surat/laporan`, dan `/surat/settings`, serta me-redirect `admin` dari `/surat/settings`.
       - Dashboard `/surat` bagi `user` hanya memanggil API `/surat/surat-keluar` dan menampilkan metrik, pintasan, serta daftar terbaru Surat Keluar miliknya sendiri.
  3. **Modul Kepegawaian (`/kepegawaian`) & IAM**:
     - **Backend** ([`Kepegawaian/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Routes/api.php), [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php), [`EmployeeLeaveController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php), [`LocationController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/LocationController.php)):
       - Route `/api/kepegawaian/surat-masuk*` dikunci `role:super_admin,admin`.
       - Route `DELETE /employees/{id}/force` (`forceDestroy`) dan seluruh mutasi pengaturan di `/kepegawaian/settings` (`st-templates`, `st-expense-templates`, `leave-types`, `st-task-types`, `settings/holidays*`, `settings/employee-banks*`, `settings/registered-banks*`) dikunci khusus `role:super_admin`.
       - `EmployeeController::index()` & `show()` menyembunyikan `nama_bank`, `nomor_rekening`, dan `inactive_notes` pegawai lain bagi `role: user`; `assignmentLetters()`, `mealAllowances()`, dan `EmployeeLeaveController::show()` menolak akses `role: user` terhadap pegawai lain (`403`), serta `dashboardStats()` menyembunyikan feed ST dan counter inbox internal untuk `role: user`.
     - **Frontend** ([`kepegawaian/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/layout.tsx), [`kepegawaian/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/page.tsx), [`employees/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/page.tsx), [`employees/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/%5Bid%5D/page.tsx), [`EmployeeAccessSheet.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx)):
       - Guard terpusat di `kepegawaian/layout.tsx` membatasi `user` hanya pada `Dashboard` & `Daftar Pegawai`, serta membatasi `/kepegawaian/settings` khusus `super_admin`.
       - Di `employees/[id]/page.tsx`, `user` yang melihat profil pegawai lain hanya melihat tab **Biodata Lengkap** tanpa informasi rekening bank dan tanpa tab ST/Cuti/Uang Makan/Audit.
       - Tombol **Hapus Permanen** di `employees/page.tsx` dikunci khusus `Super Admin` (`canManageAccess`), opsi modul `Keuangan` ditambahkan ke `EmployeeAccessSheet.tsx`, dan 16 kotak centang permission granular BMN dihapus agar IAM seragam lintas modul.
  4. **Modul BMN (`/bmn`)**:
     - **Backend** ([`Bmn/Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Routes/api.php), [`LocationController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/LocationController.php)):
       - `User` (`role: user` + modul `bmn`) hanya memiliki akses baca `bmn.view` untuk Dashboard, Katalog & Detail Aset (termasuk lihat seluruh tab & unduh dokumen/foto secara read-only), Peminjaman, serta Pemeliharaan; ditolak `403` pada Import Review, Kandidat/Paket Lelang, Disposal, Laporan BA, mutasi aset, dan Pengaturan Master.
       - `Admin` (`role: admin` + modul `bmn`) otomatis memiliki akses penuh operasional BMN (CRUD Aset, Assign Tag ke Aset, Pinjaman, Pemeliharaan, Import Review, Lelang, Disposal/Restore, & Laporan BA), tetapi ditolak `403` pada mutasi Pengaturan Master (`/bmn/settings`: CRUD Master Tag, Lokasi & Ruangan, Jenis BMN) dan Hapus Permanen (`bulk-force-delete`).
     - **Frontend** ([`bmn/layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/layout.tsx), [`bmn/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/page.tsx)):
       - Menu `Pengaturan Master` (`/bmn/settings`) dikunci `bmn.manage` (khusus `Super Admin`), dan guard terpusat di `bmn/layout.tsx` me-redirect `user` dari halaman non-read-only serta me-redirect `admin` dari `/bmn/settings`.
  5. **Temuan & Penutupan Celah `/security-audit` (`SEC-01`..`SEC-05`) & Penyederhanaan `/ponytail-review` (`net -70 lines`)**:
     - **`SEC-01` (High)**: Menutup celah `AssignmentLetterController::index()` & `statusCounts()` ([`AssignmentLetterController.php`](file:///e:/bksda-superapp/backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php#L46-L97)) agar `role: user` yang hanya memiliki modul `kepegawaian` tidak dapat membaca seluruh inbox Surat Tugas Balai (`403`).
     - **`SEC-02` (Medium)**: Menutup celah `GET /api/bmn/assets?status=disposed` ([`AssetController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/AssetController.php#L103-L115)) agar `role: user` tidak dapat mengintip daftar aset BMN yang sudah dihapus tanpa izin `bmn.asset.dispose` (`403`).
     - **`SEC-03` (Medium)**: Menutup celah `GET /api/kepegawaian/employees?status=trashed` ([`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php#L36-L49)) agar langsung mengembalikan `403` bagi `role: user`.
     - **`SEC-04` (Low)**: Membatasi `?include_inactive=true` dan detail template ST nonaktif di [`StTemplateController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/StTemplateController.php#L20-L53) khusus `super_admin`.
     - **`SEC-05` (Low - FE)**: Menyelaraskan prop `canManage` pada `LocationManagementTab` di [`kepegawaian/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/settings/page.tsx) dan [`bmn/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/settings/page.tsx) khusus `isSuperAdmin`.
     - **`/ponytail-review` (`net -70 lines`)**: Menghapus dead code `ensureUnitKerjaAllowed()` beserta pemanggilannya di [`LocationController.php`](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/LocationController.php) (`-37 lines`) dan menyederhanakan fallback `surat.*` di [`User.php`](file:///e:/bksda-superapp/backend/app/Models/User.php) & [`useRole.ts`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts) (`-32 lines`).
- **Verifikasi Aktual (5-User Backend PHPUnit & Frontend Playwright E2E)**:
  - **PHPUnit (termasuk `test_five_user_matrix_across_persuratan_kepegawaian_bmn_and_iam`)**: [`SuratAndKepegawaianRbacTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratAndKepegawaianRbacTest.php), [`SuratTugasSecurityPentestTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratTugasSecurityPentestTest.php), [`BmnLayoutAndSecurityRegressionTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnLayoutAndSecurityRegressionTest.php), [`BmnMasterDataTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnMasterDataTest.php), [`BmnTagTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BmnTagTest.php), [`NotificationBmnLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/NotificationBmnLifecycleTest.php), [`LocationHierarchyAndDriveSyncTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/LocationHierarchyAndDriveSyncTest.php), [`SuratModuleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratModuleTest.php), [`StTemplateTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/StTemplateTest.php), [`MealAllowanceSecurityAndReconciliationTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/MealAllowanceSecurityAndReconciliationTest.php), [`PortalPersonalSecurityTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalPersonalSecurityTest.php), [`StKepegawaianSecurityClosureTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/StKepegawaianSecurityClosureTest.php), [`EmployeeAccessLifecycleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/EmployeeAccessLifecycleTest.php) -> **`181/181 tests PASSED` (`1,242 assertions`, `0 failed`)**.
  - **Playwright Headless Chromium E2E 5-User Suite**: [`rbac-5-user-persuratan-kepegawaian-bmn.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/rbac-5-user-persuratan-kepegawaian-bmn.playwright.cjs) (`super_admin`, `admin`, `user_1`, `user_2`, `user_3` di modul Persuratan, Kepegawaian, BMN, & IAM) -> **`15/15 persona suites PASSED` (`137 assertions`, `0 failed`)**.
  - **TypeScript (`tsc --noEmit`)**: **`0 errors`**.
  - **Knowledge Graph**: `graphify update .` selesai diperbarui.
- **Status**: ✅ Selesai Diimplementasikan, Diaudit, Diverifikasi 5-User (BE + FE E2E), & Di-commit pada `codex/portal-security-pentest`.

---

## 116. Implementasi Role Per Modul (`module_roles`) Lintas Modul & Toggle IAM Sheet (16 November 2026)

- **Latar Belakang & Tujuan (`/ponytail`)**: Mengatasi keterbatasan 1 role global ketika pegawai membutuhkan peran **Admin** pada satu modul (mis. **Persuratan** / **BMN**) namun tetap **User** biasa pada modul lain (mis. **Kepegawaian**). Memanfaatkan kembali kolom JSON pada `users` (`module_roles`) tanpa tabel pivot tambahan, tetap backward-compatible saat `module_roles` bernilai `null`.
- **Perubahan Utama**:
  1. **Database & Model**: Migrasi [`2026_11_16_000002_add_module_roles_to_users_table.php`](file:///e:/bksda-superapp/backend/database/migrations/2026_11_16_000002_add_module_roles_to_users_table.php) (`users.module_roles` nullable JSON; sudah dijalankan di PostgreSQL lokal) serta [`User::roleFor()`](file:///e:/bksda-superapp/backend/app/Models/User.php#L156-L175), [`isAdminFor()`](file:///e:/bksda-superapp/backend/app/Models/User.php#L177-L180), `hasPermission()`, dan `canAccessAdminInbox()`, dilengkapi eksposur `module_roles` pada [`UserResource`](file:///e:/bksda-superapp/backend/app/Http/Resources/UserResource.php), [`MeDashboardResource`](file:///e:/bksda-superapp/backend/app/Http/Resources/MeDashboardResource.php), [`AuthController`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/AuthController.php), dan [`MobileDashboardController`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/MobileDashboardController.php).
  2. **Middleware, Controller, & IAM API**: [`CheckRole`](file:///e:/bksda-superapp/backend/app/Http/Middleware/CheckRole.php) otomatis mendeteksi modul dari prefix path API (`surat`, `kepegawaian`, `surat_tugas`, `bmn`, `keuangan`, `dereporting`, `inventory`, `drive`, `cms`) atau parameter `module:<slug>`; [`EnsureAccountSecure`](file:///e:/bksda-superapp/backend/app/Http/Middleware/EnsureAccountSecure.php) memeriksa status admin per-modul untuk kebijakan 2FA; [`SuratKeluarController`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php), [`EmployeeController`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php), [`EmployeeLeaveController`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php), [`LeaveTypeController`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/LeaveTypeController.php), [`StExpenseTemplateController`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/StExpenseTemplateController.php), FormRequest Kepegawaian/Surat Tugas, serta [`AssignmentLetterController`](file:///e:/bksda-superapp/backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php) beralih ke `isAdminFor(...)`. [`EmployeeAccessRequest`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeAccessRequest.php) & [`EmployeeAccessController`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php) memvalidasi `module_roles`, menyimpan peran campuran dengan global `role` least-privilege (`user` jika tidak semua modul terpilih adalah `admin`), mencatat audit history, dan mencabut token Sanctum saat `module_roles` berubah.
  3. **Frontend & UI IAM**: [`StoredUser`](file:///e:/bksda-superapp/frontend/src/lib/auth-store.ts#L3-L13), [`useRole`](file:///e:/bksda-superapp/frontend/src/hooks/useRole.ts) (otomatis mendeteksi modul dari `usePathname()` atau argumen eksplisit, + `hasPermission()` berbasis modul prefix permission), badge role sidebar di layout [`surat`](file:///e:/bksda-superapp/frontend/src/app/surat/layout.tsx), [`kepegawaian`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/layout.tsx), [`bmn`](file:///e:/bksda-superapp/frontend/src/app/bmn/layout.tsx), [`Topbar`](file:///e:/bksda-superapp/frontend/src/components/layout/topbar.tsx), dan toggle **`User` / `Admin`** per modul pada [`EmployeeAccessSheet.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx).
- **Verifikasi Pasca-Edit Final**:
  - **Backend PHPUnit (16 suite lintas RBAC, Persuratan, Kepegawaian, SuratTugas, BMN, Portal, DeReporting, Keuangan)**: **`199/199 tests PASSED`** (**`1.616 assertions`**, termasuk `test_per_module_roles_via_iam_enforce_independent_permissions_across_modules` di [`SuratAndKepegawaianRbacTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratAndKepegawaianRbacTest.php)).
  - **Static Security Contract (`backend/tests/portal_security_check.php`)**: **`PASS`** (invariant 178 diselaraskan agar menerima `! $user->isAdminFor('surat_tugas')`).
  - **Frontend Playwright E2E ([`rbac-5-user-persuratan-kepegawaian-bmn.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/rbac-5-user-persuratan-kepegawaian-bmn.playwright.cjs))**: **`17/17 persona suites PASSED`** (**`160 assertions`**, termasuk `MIXED-MODULE-ROLE` & `IAM-PER-MODULE-UI`).
  - **Frontend UI & Static Checks**: [`persuratan-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/persuratan-ui.cjs) (`PASS`), [`kepegawaian-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/kepegawaian-ui.cjs) (`PASS`), `npx tsc --noEmit` (`0 errors`), dan `npx eslint` file terdampak (`0 errors`).
- **Status**: ✅ Selesai Diimplementasikan, Diverifikasi, & Di-commit pada `codex/portal-security-pentest` (`f4379c2d`).

---

## 117. Pengerasan UX Harian, Manajemen Scan Cuti ↔ Drive, Ekspor PDF Vektor SRIKANDI, & Stabilitas Infrastruktur (16 November 2026)

- **Daftar Commit Lanjutan di Branch `codex/portal-security-pentest`**:
  1. **IAM & Autentikasi (`faed1785`, `862ec6f0`)**: Menata ulang [`EmployeeAccessSheet.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx) menjadi tata letak 2 kolom bebas gulir dengan pill `User` kontras tinggi serta mengganti dropdown role global menjadi kotak centang **Super Admin**.
  2. **Manajemen Scan Surat Izin Cuti & Sinkronisasi Google Drive (`465b1307`, `370c9622`, `7692933a`, `8c22d494`)**:
     - Menambahkan fitur hapus berkas scan izin cuti, indikator progres unggah/simpan di [`CatatSuratIzinModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/CatatSuratIzinModal.tsx), [`CutiModals.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/CutiModals.tsx), dan [`EmployeeLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/_components/EmployeeLeaveTab.tsx), serta memperlebar kolom jenis cuti & perataan tabel di [`cuti/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/page.tsx).
     - Memperbaiki sinkronisasi penggantian arsip dan pembersihan latar belakang di [`ArchiveOfficialDocument.php`](file:///e:/bksda-superapp/backend/app/Jobs/ArchiveOfficialDocument.php), [`EmployeeLeaveController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php), [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php), serta timeout S3 pada [`filesystems.php`](file:///e:/bksda-superapp/backend/config/filesystems.php).
  3. **Interaksi Dialog & Ekspor Dokumen Persuratan (`42dc747e`, `f8ca5a1f`, `93656c64`, `07d7c99c`, `f3802c9f`)**:
     - Mencegah tumpukan focus/pointer lock antara `DropdownMenu` dan `Dialog` pada [`dialog.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/dialog.tsx) dan [`dropdown-menu.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/dropdown-menu.tsx).
     - Memperbaiki selektor body ekspor Word di [`export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts) & [`SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx), serta menambahkan route ekspor **PDF vektor searchable** berbasis headless Chromium untuk TTE SRIKANDI pada [`surat/export-pdf/route.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/export-pdf/route.ts) (+ [`export-pdf-route.cjs`](file:///e:/bksda-superapp/frontend/tests/export-pdf-route.cjs), `Dockerfile`, `next.config.ts`, `package.json`).
     - Memoles permukaan editor dinas, tombol sekunder dark mode, dan semantik UI pada [`dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx), [`portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx), [`EmailConnectDialog.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/EmailConnectDialog.tsx), serta [`kepegawaian.css`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/kepegawaian.css) & [`surat-tugas.css`](file:///e:/bksda-superapp/frontend/src/app/surat-tugas/surat-tugas.css).
  4. **Deployment Config (`630454b9`)**: Menetapkan `restart: always` untuk backend Dokploy dan menyertakan nama database eksplisit pada `pg_isready` di [`docker-compose.dokploy.yml`](file:///e:/bksda-superapp/docker-compose.dokploy.yml) dan [`docker-compose.prod.yml`](file:///e:/bksda-superapp/docker-compose.prod.yml).

---

## 118. Standarisasi Panduan 5 Design Tokens & Penerapan pada Modul Persuratan serta Kepegawaian (16 November 2026)

- **Pedoman Resmi Terbit**: [`docs/DESIGN_SYSTEM_5_TOKENS.md`](file:///e:/bksda-superapp/docs/DESIGN_SYSTEM_5_TOKENS.md) (commit `c499257f`), menetapkan 5 aturan desain baku lintas modul web:
  1. **Color Roles (`--ds-*`)**: Pemakaian token peran permukaan, teks, aksen modul, border tenang (`border-slate-200/80 dark:border-zinc-800` & `divide-slate-200/70 dark:divide-zinc-800`), serta maks 3 keluarga warna kategori per dashboard.
  2. **Spacing**: Seluruh jarak/padding/margin wajib kelipatan **4 px** penuh (tanpa pecahan `.5`).
  3. **Type Scale**: Dibatasi pada **4 ukuran** (`text-xs`, `text-sm`, `text-xl`, `text-2xl`) + `tabular-nums` pada angka, kode, tanggal, NIP/NUP, dan metrik.
  4. **Radius Konsentris (`outer = inner + padding`)**: `rounded-3xl` (24 px) pada kontainer luar/dialog (`p-4` = 16 px) + `rounded-lg` (8 px) pada kontrol/ikon internal, `rounded-full` untuk badge status/pill, dan `rounded-sm` pada bar skeleton kecil.
  5. **Shadows**: Dibatasi pada `{shadow-xs, shadow-lg}` (`shadow-xs` permukaan statis, `shadow-lg` dialog/popover mengambang).
- **Cakupan Penerapan & Commit**:
  1. **Foundation & Dashboard Persuratan (`c499257f`)**: Penyelarasan [`surat/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/page.tsx), [`SuratHubComponents.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratHubComponents.tsx), dan pelembutan border tombol sekunder global `.kpg-secondary` dengan `--ds-border-subtle` -> `--ds-border-control` pada [`kepegawaian.css`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/kepegawaian.css).
  2. **Seluruh Halaman & Modal Persuratan (`a41549b4`)**: Penerapan menyeluruh pada 12 berkas non-cetak ([`surat/masuk/*`](file:///e:/bksda-superapp/frontend/src/app/surat/masuk/page.tsx), [`surat/keluar/*`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/page.tsx), [`surat/settings/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/settings/page.tsx), `TemplatePickerModal`, `LembarDisposisiForm`, modal & popover terkait), dengan tetap mempertahankan kertas cetak resmi `LembarDisposisiSheet` dan `SuratDinasDocument` putih/hitam.
  3. **Seluruh Halaman & Modal Kepegawaian (`540fb44b`)**: Penerapan 5 Token secara `/ponytail` pada 38 berkas antarmuka modul Kepegawaian & Surat Tugas (`layout.tsx`, `page.tsx`, `employees/`, `cuti/`, `uang-makan/`, `surat-masuk/`, `surat-tugas/`, `settings/`, `_components/`).

---

## 119. Penerapan Menyeluruh 5 Design Tokens pada Modul BMN dengan Prinsip `/ponytail` (16 November 2026)

- **Commit**: `d20bfcaf` — `style(bmn): apply 5-token design system and dark/light parity across all module pages and modals` (`codex/portal-security-pentest`, belum di-`push`).
- **Pendekatan & Cakupan Implementasi**:
  - Menerapkan seluruh 5 Design Tokens langsung di berkas sumber [`frontend/src/app/bmn/`](file:///e:/bksda-superapp/frontend/src/app/bmn/) (serta pembaruan [`bmn-ui.css`](file:///e:/bksda-superapp/frontend/src/app/bmn/bmn-ui.css) & [`assets.css`](file:///e:/bksda-superapp/frontend/src/app/bmn/assets/assets.css)) tanpa menambah wrapper komponen maupun dependensi baru.
  - Mencakup Dashboard (`page.tsx`, `layout.tsx`, `_components/BmnDashboardComponents.tsx`), komponen & modal bersama (`_components/*`, `components/modals/*`), Data Aset & Detail (`assets/`, `assets/[id]/`), Peminjaman & Katalog (`loans/`, `loans/create/`), Pemeliharaan (`maintenances/`), Disposal (`disposal/`), Import Review (`import-review/`, `import-review/[batchId]/`), Laporan & BA (`reports/` non-print), Pengaturan Master (`settings/`), Paket Lelang (`auction-batches/`, `auction-batches/[id]/`), serta Kandidat Rusak Berat & Wizard Dokumen (`auction-candidates/`, seluruh 12 section & UI kontrol [`KertasKerjaAssetSection.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/auction-candidates/_components/KertasKerjaAssetSection.tsx)).
  - Menuntaskan bug kontras & warna tidak valid pada UI BMN (warna kelas Tailwind non-standar `zinc-150`/`zinc-450`/`zinc-555`/`amber-350`/`emerald-650`/`red-750` pada tab lelang, kontras tombol aksi `Duplikasi` / `Cetak Arsip` / `HandoverAgreementTab` / tombol konfirmasi batal `RealizationTab.tsx`, serta perbaikan layout ikon `shrink-0` pada kartu *Hierarki Main & Sub Tag* di [`TagManagementTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/bmn/settings/_tabs/TagManagementTab.tsx)).
  - **Batas Pengecualian Dokumen Cetak Fisik**: `*Document.tsx`, `AssetLampiranLandscapeTable.tsx`, `AuctionDocumentRenderer.tsx`, pratinjau kertas `[210mm]` di `DocumentContentEditorModal.tsx`, dan blok `.kk-page` di `KertasKerjaAssetSection.tsx` tetap utuh menjaga standar cetak kedinasan. (Normalisasi akhir baris LF juga tercatat di `git status` pada direktori BMN.)
- **Hasil Verifikasi Aktual Pasca-Edit Final**:
  - **Audit Statis (`audit-5tokens.cjs bmn`)**: `TOTAL_VIOLATIONS=1` (hanya link tombol outline sekunder pada [`bmn/page.tsx#L220`](file:///e:/bksda-superapp/frontend/src/app/bmn/page.tsx#L220) yang memang memakai `border-[var(--ds-border-subtle)]`).
  - **TypeScript & ESLint (`frontend/`)**: `npx tsc --noEmit` (`exit 0`) & `npx eslint src/app/bmn` (`exit 0`).
  - **BMN Unit & Security UI E2E**: [`bmn-asset-grid.cjs`](file:///e:/bksda-superapp/frontend/tests/bmn-asset-grid.cjs) (`PASS`) dan [`bmn-security-ui.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/bmn-security-ui.playwright.cjs) (**`12/12` suite, `31` assertion `PASS`**).
  - **Playwright Visual & Overflow Check (`visual-check-bmn.cjs`)**: Menguji `11` rute BMN (`/bmn`, `/bmn/assets`, `/bmn/loans`, `/bmn/loans/create`, `/bmn/maintenances`, `/bmn/disposal`, `/bmn/import-review`, `/bmn/reports`, `/bmn/settings`, `/bmn/auction-batches`, `/bmn/auction-candidates`) dalam mode `light` & `dark` (`1440x900`) serta `6` rute kunci mobile `dark` (`390x844`) — total **`28` pengecekan viewport** dengan **`ERRORS_COUNT=0`** dan **`0` horizontal overflow**, dilengkapi inspeksi screenshot langsung. *(Rute detail dinamis `/bmn/assets/[id]` dan `/bmn/auction-batches/[id]` terverifikasi lewat `bmn-security-ui.playwright.cjs`, tidak masuk 11 rute statis `visual-check-bmn.cjs`.)*
  - **Knowledge Graph**: `graphify update .` selesai diperbarui (`exit 0`).
- **Status**: ✅ Selesai Diimplementasikan, Diverifikasi, & Di-commit Lokal (`d20bfcaf`, belum di-`push`).

---

## 120. Penerapan 5 Design Tokens & Perbaikan Kontras Radio/Switch pada Modul Surat Tugas Standalone (16 November 2026)

- **Commit**: `9d7a4ce6` — `style(surat-tugas): apply 5-token design system and fix radio/switch contrast` (`codex/portal-security-pentest`, belum di-`push`).
- **Cakupan & Perbaikan**:
  - Menerapkan 5 Design Tokens pada seluruh berkas UI modul [`frontend/src/app/surat-tugas/`](file:///e:/bksda-superapp/frontend/src/app/surat-tugas/) (dashboard, pembuatan surat tugas, riwayat audit log, dan komponen formulir).
  - Memperbaiki kontras seleksi radio button sumber dana (`DIPA`, `PNBP`, `Lainnya`) serta switch status pada formulir pembuatan surat tugas agar terbaca jelas pada Light dan Dark Mode.
  - Mempertahankan integritas layout dan rule CSS modul `surat-tugas`.

---

## 121. Penerapan Menyeluruh 5 Design Tokens pada Modul Portal ASN dengan Prinsip `/ponytail` (17 November 2026)

- **Commit**: `style(portal): apply 5-token design system and dark/light parity across all portal pages and modals` (`codex/portal-security-pentest`, belum di-`push`).
- **Pendekatan & Cakupan Implementasi**:
  - Menambahkan selector token `[data-module="portal"]` (Light & Dark) pada [`frontend/src/app/globals.css`](file:///e:/bksda-superapp/frontend/src/app/globals.css) dengan palet Brand Forest Green (`--ds-accent-solid: #1e5433` light, `#86efac` dark) serta rule outline button sekunder.
  - Menerapkan 5 Design Tokens pada 18 berkas modul Portal ([`frontend/src/app/portal/`](file:///e:/bksda-superapp/frontend/src/app/portal/)):
    - Shell utama ([`page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx)) & rute detail ([`surat-tugas/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/surat-tugas/[id]/page.tsx)).
    - Hero & Navigasi: [`PortalHeaderBanner.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalHeaderBanner.tsx), [`PortalInfoSidebar.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalInfoSidebar.tsx), [`PortalProfileSidebar.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalProfileSidebar.tsx), [`PortalQuickStats.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalQuickStats.tsx).
    - Tab Workspace: [`ActiveLoansTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/ActiveLoansTab.tsx), [`MyAssetsTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyAssetsTab.tsx), [`MyLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyLeaveTab.tsx), [`SuratTugasTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/SuratTugasTab.tsx), [`KalkulatorDinasTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/KalkulatorDinasTab.tsx).
    - Notifikasi & Dialog: [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx), [`EmailConnectDialog.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/EmailConnectDialog.tsx), [`LeaveRequestDialog.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/LeaveRequestDialog.tsx), [`SecurityModals.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/SecurityModals.tsx).
    - Formulir Laporan Inline: [`GeneralReportInlineForm.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/GeneralReportInlineForm.tsx), [`SmartPatrolInlineForm.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/SmartPatrolInlineForm.tsx).
  - Menginjeksi `data-module="portal"` pada Radix overlay/portal (`PopoverContent`, `DialogContent`, `DropdownMenuContent`) agar variabel CSS `--ds-*` ter-resolve di `document.body`.
  - Memperbaiki kontras filter pill SPJ panjar (`Semua`, `Bisa SPJ`, `Non-SPJ`) di [`KalkulatorDinasTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/KalkulatorDinasTab.tsx) menggunakan kombinasi `--ds-status-*-bg`, `--ds-status-*-fg`, dan `--ds-status-*-border`.
  - Memperbaiki header navbar responsif di [`page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx) (`flex justify-between gap-2 sm:grid sm:grid-cols-12 sm:gap-6` dengan `hidden sm:flex` untuk logo sekunder pada mobile) agar bebas benturan tombol di layar sempit (`390x844`).
  - Menjaga pengecualian dokumen cetak fisik (`FormulirCutiPrint.tsx`, `GeneralReportPrint.tsx`, `SmartPatrolPrint.tsx`, lembar cetak LPJ panjar) tetap *black-on-white*.
- **Hasil Verifikasi Pasca-Edit**:
  - `audit-5tokens.cjs portal`: `TOTAL_VIOLATIONS=0`, `UNDEFINED_DS_TOKENS=0`.
  - `npx tsc --noEmit`: `exit 0` (0 error).
  - `npx eslint src/app/portal`: `exit 0` (0 error, 4 warning bawaan `next/image` dipertahankan).
  - `portal-review-check.cjs`: `PASS`.
  - `kepegawaian-surat-tugas-portal.playwright.cjs`: `6/6` suites lulus (`9` assertions green).
  - `portal-notifications-live-e2e.playwright.cjs`: `E2E-LIVE-01A` s.d. `E2E-LIVE-06B` `PASS` (sandbox auto-cleaned).
  - Visual Browser Verification (`verify-portal-ui.cjs`): Desktop `1440x900` & Mobile `390x844` Light/Dark `0` console error, `0` server error, `0` horizontal overflow.
- **Status**: ✅ Selesai Diimplementasikan & Diverifikasi (`fc993464`).

---

## 122. Audit `/ponytail-audit` & `/security-audit`, Hardening Keamanan (`SEC-01`–`SEC-11`), & Refactoring Ponytail (`P-01`–`P-07`) Lintas 6 Modul Utama (17 November 2026)

- **Konteks & Tujuan**: Menjalankan audit menyeluruh `/ponytail-audit` dan `/security-audit` pada 6 modul utama (**Surat Tugas**, **Portal**, **Kepegawaian**, **Drive**, **BMN**, dan **Persuratan**), mendokumentasikan seluruh temuan ke berkas markdown audit, mengeksekusi perbaikan keamanan serta refactoring berprinsip Ponytail, lalu memverifikasi BE, FE, dan E2E Playwright secara penuh.
- **Dokumen Audit Tercatat**:
  - [`docs/ponytail-audit-6-modules-2026-11-17.md`](file:///e:/bksda-superapp/docs/ponytail-audit-6-modules-2026-11-17.md) — Checklist `P-01`–`P-07` (`[x]` selesai dikerjakan sesuai cakupan).
  - [`docs/security/security-audit-6-modules-2026-11-17.md`](file:///e:/bksda-superapp/docs/security/security-audit-6-modules-2026-11-17.md) — Checklist `SEC-01`–`SEC-11` (`Mitigated (Code)`, `[x]`) beserta daftar validasi operasional `NV-01`–`NV-06` (`Needs Validation`).
- **Ringkasan Perbaikan Keamanan (`SEC-01`–`SEC-11`)**:
  - Implementasi & penyatuan proteksi CSRF (`ValidateApiCsrfToken.php`), pengerasan otorisasi & isolasi aksi sensitif lintas 6 modul, pembatasan `EmployeeLeaveSnapshotCheck` agar melampirkan resolver user `super_admin` (`SEC-03`), penghapusan `employee.email` ke `null` tanpa perlu `current_password`, serta guard `enable2Fa` `409` bila 2FA sudah aktif.
  - Penyelarasan pengujian regresi keamanan lewat `SixModulesSecurityHardeningTest.php` bersama kebijakan yang berlaku (`StActorAcceptanceTest` untuk penomoran draf & `StLifecycleAcceptanceTest` untuk pemulihan oleh pembuat dokumen).
- **Ringkasan Refactoring Ponytail (`P-01`–`P-07`)**:
  - Pembersihan besar berkas & dependensi mati: penghapusan `46` berkas BMN tidak terpakai (+ pembersihan referensi usang `bmn-utils.ts`, `constants/bmn.ts`, `EmployeePicker.tsx` pada `frontend/src/app/_docs/utility-functions.md` dan `frontend/README.md`), penghapusan `GoogleSheetsService` & UI mati, pengurangan `5` paket npm dan `2` paket composer.
  - Penyatuan duplikasi logika ke helper/komponen bersama BE & FE: `ResolvesDocumentStatus.php`, `PhotoLampiranPages.tsx`, `ReportFormShared.tsx`, `SuratTugasA4Parts.tsx`, dan `print-window.ts`.
  - Sinkronisasi Knowledge Graph via `graphify update .`: membangun ulang `15331` nodes, `28499` edges, dan `1032` communities di `graphify-out/`.
- **Hasil Verifikasi Pasca-Edit Akhir**:
  - **Backend**:
    - `php -d memory_limit=512M ./vendor/bin/phpunit`: `583` tests (`581` passed, `2` skipped, `6023` assertions, `exit 0`).
    - `php tests/portal_security_check.php`: `PASS` (`exit 0`).
    - `php tests/EmployeeLeaveSnapshotCheck.php`: `PASS` (`exit 0`).
    - `php tests/EmployeeLifecycleTest.php`: `10/10` passed (`exit 0`).
  - **Frontend**:
    - `npx tsc --noEmit`: `exit 0`.
    - `npx eslint src/app/surat-tugas src/app/portal src/app/kepegawaian src/app/drive src/app/bmn src/app/surat src/components/SuratTugas*.tsx src/lib/print-window.ts`: `0` error, `4` warning `@next/next/no-img-element` (`SmartPatrolInlineForm.tsx` & `SmartPatrolPrint.tsx`), `exit 0`.
    - `npm run build` (`Next.js 16.4.2`): run awal mengenai imbauan upgrade `SecurityFatalError`; retry mengompilasi `86/86` rute dengan bersih (`exit 0`).
    - `9/9` skrip CJS relevan lulus (`exit 0`): `export-pdf-route.cjs`, `portal-review-check.cjs`, `persuratan-ui.cjs`, `kepegawaian-ui.cjs`, `diktum-capitalization-check.cjs`, `st-legacy-items.cjs`, `test-export-transform.cjs`, `nota-dinas-template-check.cjs`, `cache-security.cjs`. *(Catatan: harness CJS lawas `portal-notification-bell.cjs`, `portal-notification-callbacks.cjs`, `portal-leave-callbacks.cjs`, `notification-transport.cjs` menggunakan path Linux `/frontend/...`; `animate-ui-motion-check.cjs` mengecek `AnimatePresence` yang telah dihapus; `bmn-assets-ui.cjs`/`bmn-sidebar-ui.cjs` menolak import pra-ada).*
  - **Playwright E2E (`9/9` berkas `exit 0`)**:
    - `surat-tugas-security.playwright.cjs` (`5/5`, `23` assertions)
    - `bmn-security-ui.playwright.cjs` (`12/12`, `31` assertions)
    - `drive-security-ui.playwright.cjs` (`12/12`, `30` assertions)
    - `drive-agentic-root.playwright.cjs` (`10/10`, `22` assertions)
    - `kepegawaian-uang-makan.playwright.cjs` (`8/8`)
    - `kepegawaian-surat-tugas-portal.playwright.cjs` (`6/6`, `9` assertions)
    - `kepegawaian-bank-allocation.playwright.cjs` (`6/6`, `12` assertions)
    - `portal-notifications-live-e2e.playwright.cjs` (`9` skenario live `PASS`; `E2E-LIVE-07` `[STOPPED / BLOCKED]` karena `NEXT_PUBLIC_REVERB_APP_KEY` belum terkonfigurasi di `frontend/.env.local`)
    - `location-hierarchy-drive-sync.playwright.cjs` (`7/7` skenario live `PASS`)
- **Status**: ✅ Selesai Dikerjakan & Diverifikasi (`SEC-01`–`SEC-11` & `P-01`–`P-07`; `NV-01`–`NV-06` menunggu validasi runtime/staging).

---

## 123. Upgrade Keamanan Next.js (`16.4.2` → `16.4.6`) & Verifikasi Build Frontend (17 November 2026)

- **Latar Belakang**: Merespons advisory keamanan Next.js `16.4.2` (`GHSA-mfr8-8qww-v76h`, rentang terdampak `>=16.3.0 <=16.4.4`, imbauan `SecurityFatalError` pada `next build`). Audit kode di `frontend/src` memastikan `'use cache'` dan `unstable_cache` tidak dipakai, sementara `next` dinaikkan ke versi patch aman terbaru di branch `codex/portal-security-pentest` sebelum PR/merge.
- **Perubahan Paket & Lockfile**:
  - [`frontend/package.json`](file:///e:/bksda-superapp/frontend/package.json#L31): menaikkan `"next": "^16.4.2"` menjadi `"next": "^16.4.6"`.
  - [`frontend/package-lock.json`](file:///e:/bksda-superapp/frontend/package-lock.json): pembaruan terkunci hanya untuk `next`, `@next/env`, dan `@next/swc-*` ke `16.4.6` (`40` baris tambah / `40` baris hapus).
  - **Isolasi React 18.3.1**: `react` (`18.3.1`), `react-dom` (`18.3.1`), dan `eslint-config-next` (`16.2.4`) dipertahankan di lockfile (upgrade ke React 19 ditunda ke PR terpisah agar perubahan runtime major tetap diuji regresi E2E penuh).
- **Verifikasi Pasca-Upgrade**:
  - `npm audit --json` pada paket `next`: `NONE` (kerentanan `GHSA-mfr8-8qww-v76h` tertutup; audit penuh tetap melaporkan `20` temuan di luar `next`).
  - `npx tsc --noEmit` (`frontend/`): `0` error (`exit 0`).
  - `npx eslint src` (`frontend/`): `0` error, `4` warning bawaan `@next/next/no-img-element` (`SmartPatrolInlineForm.tsx` & `SmartPatrolPrint.tsx`, `exit 0`).
  - `npm run build` (`Next.js 16.4.6 (Turbopack)`): **berhasil** mengompilasi & menghasilkan `86/86` rute tanpa error keamanan (`exit 0`; hanya peringatan deprecation bahwa dukungan React 18 berakhir di Next.js 17).
  - `npm run test:security-cache`: `8/8 passed`, `0 failed`.
  - **Dev Runtime Check**: Setelah restart `npm run dev` dan membersihkan cache lama `.next/dev`, server dev berjalan pada `Next.js 16.4.6 (Turbopack)` dan melayani `/drive` (`GET /drive 200`).
- **Status**: ✅ Selesai Dikerjakan & Diverifikasi pada `codex/portal-security-pentest` (PR/merge ke `main` & `production-server` ditunda sesuai arahan pengguna).

---

## 124. Penyesuaian Skala Font & Anti-Truncation Kartu Quick Stats Portal ASN (17 November 2026)

- **Latar Belakang**: Setelah migrasi 5 Design Tokens (`fc993464`), ke-4 kartu ringkas di [`PortalQuickStats.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalQuickStats.tsx) (`Pangkat / Golongan`, `Sisa Cuti`, `Surat Tugas`, `Aset Saya`) mengalami pemotongan teks (`PANGKAT / GOLO...`, `Non-PNS / Belum...`, `Cuti Tahunan Re...`, `Tidak Ada Penug...`) karena kolom tengah portal di `2xl:col-span-6` (`~724–816px`) hanya menyisakan lebar teks `87–112px` saat memakai `p-4` + `gap-4` + `text-xs`/`text-sm` + `truncate`.
- **Perubahan Diterapkan**:
  - [`frontend/src/app/portal/_components/PortalQuickStats.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalQuickStats.tsx): mengembalikan proporsi kartu ringkas ala produksi (`bksdakaltim.web.id`) dengan `gap-3`, `p-3`, `rounded-2xl`, `gap-2.5`, `space-y-0.5`, serta ukuran font `text-[10px] leading-tight` (label), `text-xs leading-snug break-words` (nilai utama), dan `text-[10px] leading-snug` (sub-label), menghapus `truncate` pada ketiga baris teks, sambil mempertahankan penuh color/border/shadow tokens `--ds-*` untuk Light & Dark Mode.
  - [`docs/DESIGN_SYSTEM_5_TOKENS.md`](file:///e:/bksda-superapp/docs/DESIGN_SYSTEM_5_TOKENS.md#L115): mencatat pengecualian terarah untuk strip 4 kartu `PortalQuickStats.tsx`.
- **Verifikasi Pasca-Edit Akhir**:
  - **Chromium Live `/portal`**: diuji di `1920×1080` (Light & Dark), `1536×864`, `1440×900`, `1366×768`, dan `390×844` → `clipped: []`, `overflow: false` pada seluruh viewport (`wrapped: []` pada `1920`, `1440`, `1366`, `390`; wrap rapi sama tinggi `99px` di titik tersempit `1536`).
  - `npx tsc --noEmit`: `0` error (`exit 0`).
  - `npx eslint src/app/portal`: `0` error, `4` warning bawaan `@next/next/no-img-element` (`SmartPatrolInlineForm.tsx` & `SmartPatrolPrint.tsx`).
  - `node tests/portal-review-check.cjs`: `PASS`.
  - `npm run build` (`Next.js 16.4.6 (Turbopack)`): `86/86` rute bersih (`exit 0`).
  - `graphify update .`: diperbarui (`15333` nodes, `28501` edges, `1043` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal pada `codex/portal-security-pentest`.

---

## 125. Blok Rincian / Jadwal Terstruktur pada Batang Tubuh / Isi & Pengurutan Butir Modul Persuratan (17 November 2026)

- **Latar Belakang**: Sejumlah tipe naskah dinas pada `/surat/keluar/dinas` membutuhkan penyisipan rincian jadwal/acara (`Hari/Tanggal : ...`, `Tempat : ...`, `Agenda : ...`, dll.) langsung di dalam bagian **3. Batang Tubuh / Isi**, dengan tanda titik dua (`:`) sejajar vertikal, teks nilai rata kiri (termasuk alamat multi-baris), serta tetap rapi saat dicetak, diekspor ke PDF vektor, maupun diekspor ke Word (`.doc`).
- **Perubahan Diterapkan (Commit `3fabe7ff`)**:
  - [`frontend/src/app/surat/_components/SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx):
    - Menambahkan tipe `ParagrafRincianRow`, `ParagrafRincianBlock`, `ParagrafItem`, serta helper `isRincianBlock`, `createDefaultRincianBlock` (default `Hari/Tanggal`, `Tempat`, `Agenda`), dan `migrateLegacyUndanganPayload`.
    - Memperbarui `parseRawDocumentText` pada **Tempel Teks Utuh** agar mendeteksi blok `Label : Nilai` (termasuk pola salin-tempel terpisah baris seperti `Tempat\n: ...` beserta baris alamat lanjutan) tanpa mengganggu `Nomor:` di kalimat prose.
    - Menyesuaikan `detectPointLevel`, `getNextMarkerForSection`, dan `reindexParagraphMarkers` agar penomoran poin tetap konsisten melewati blok Rincian.
    - Memindahkan rincian default `getDefaultDataForTemplate("undangan")` ke bagian 3 (`paragraf`) dan merender `.pkpknl-rincian-wrap` / `.pkpknl-rincian-table` tanpa tag `<p>` di dalam sel tabel (label `28mm`, `:` `4mm`, isi rata kiri `pre-line`, serta pengeditan inline di pratinjau).
  - [`frontend/src/app/surat/keluar/dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx):
    - Menambahkan tombol **`+ Rincian`** di toolbar **3. Batang Tubuh / Isi**, opsi **Rincian (Hari/Tempat/Agenda)** di dropdown **`Sisipkan`**, editor baris key-value (`Label`, `:`, `Textarea` multi-baris, **`+ Baris`**, serta quick preset **`+ Hari/Tanggal`**, **`+ Waktu`**, **`+ Tempat`**, **`+ Agenda`**, **`+ Pakaian`**, **`+ Narahubung`**).
    - Menambahkan tombol geser urutan **`↑` / `↓`** (`handleMoveParagraph`) untuk setiap butir, membersihkan duplikasi panel *Rincian Acara* pada Card 2 template `undangan`, serta memanggil `migrateLegacyUndanganPayload` saat memuat data surat tersimpan.
  - [`frontend/src/app/surat/_lib/export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts): menambahkan transformasi `.pkpknl-rincian-wrap` di `transformCloneForWord` menjadi tabel Word 4 kolom bertata letak tetap (`spacer` indentasi | `2.8cm` label | `0.4cm` `:` | nilai rata kiri) menggunakan `escapeWordHtml` + `sanitizeWordFragment` agar baris `<br>` terjaga tanpa terpengaruh `text-indent`/`justify`.
  - [`frontend/tests/rincian-blok-check.cjs`](file:///e:/bksda-superapp/frontend/tests/rincian-blok-check.cjs): test regresi khusus blok Rincian, `migrateLegacyUndanganPayload`, `parseRawDocumentText` (inline & split-line), penomoran, dan guard ekspor Word/editor.
- **Verifikasi Pasca-Edit Akhir**:
  - `npx tsc --noEmit`: `0` error (`exit 0`).
  - `npx eslint src/app/surat`: `0` error (`exit 0`).
  - Unit & Static Checks: `rincian-blok-check.cjs` (`ALL ASSERTIONS PASSED`), `nota-dinas-template-check.cjs`, `persuratan-ui.cjs`, `test-export-transform.cjs`, dan `export-pdf-route.cjs` (`EXPORT_PDF_ROUTE_CHECK_PASS (live 401 + static invariants)`).
  - `npm run build` (`Next.js 16.4.6 (Turbopack)`): `86/86` rute bersih (`exit 0`).
  - **Chromium Playwright Live `/surat/keluar/dinas`**: verifikasi `template=surat_dinas` & `template=undangan`, pengisian alamat `Tempat` 3 baris + preset `+ Waktu`, keselarasan koordinat titik dua `:` & nilai rata kiri pada `.pkpknl-rincian-table`, hasil HTML ekspor `.doc`, serta reorder `↑`/`↓`.
  - `graphify update .`: diperbarui (`15366` nodes, `28549` edges, `1037` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal pada `codex/portal-security-pentest`.

---

## 126. Blok Tabel Dinamis, Pembatas Judul, Merge/Split Sel, Drag Lebar Kolom, & Normalisasi Paste PDF Modul Persuratan (17 November 2026)

- **Latar Belakang**: Kebutuhan penyisipan tabel jadwal/daftar fleksibel (misal rundown *Susunan Acara*) di dalam **3. Batang Tubuh / Isi** pada `/surat/keluar/dinas` dengan bawaan 3 kolom × 3 baris (`No`, `Nama`, `Keterangan`), dukungan baris judul pembatas harian penuh (`Senin, 23 November 2026`), penggabungan sel horizontal (`Break` / `Ishoma`), penomoran kolom opsional (`1 | 2 | 3 | ...`), pengaturan lebar kolom manual via drag langsung yang sinkron hingga PDF & Word `.doc`, UI spreadsheet yang lega lewat dialog `Perluas`, serta paste teks multi-baris hasil salin dari PDF agar otomatis mengalir rata mengikuti lebar kolom.
- **Perubahan Diterapkan (Commit `770b0566` & `a3dce4cd`)**:
  - [`frontend/src/app/surat/_components/SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx):
    - Menambahkan tipe `ParagrafTableBlock` (`showColumnNumbers?: boolean`, `colWidths?: number[]`), `ParagrafTableSectionRow` (`{ kind: "section", text }`), `ParagrafTableMergedRow`, serta helper pure `createDefaultTableBlock`, `isTableSectionRow`, `getTableRowCellsAndSpans`, `packTableDataRow`, `updateTableDataCell`, `mergeTableCellRight`, `splitTableCell`, `addTableColumnToRow`, `removeTableColumnFromRow`, `parseDelimitedTableText`, dan `normalizePdfCellText` (otomatis menyatukan line-wrap PDF menjadi aliran teks rata sambil menjaga paragraf kosong dan daftar berpoin).
    - Menambahkan manajemen proporsi lebar kolom (`normalizeWidthPercents`, `getDefaultTableColWidths`, `getNormalizedTableColWidths`, `resizeAdjacentTableCols`, `rebalanceColWidthsOnAdd`, `rebalanceColWidthsOnRemove`, `startTableColumnDragResize`) serta merender `<colgroup>` proporsional, header `# Nomor Kolom`, baris pembatas `#f3f4f6`, `colSpan` sel gabungan, pembungkus `.pkpknl-th-inner`, dan divider drag `.pkpknl-col-resizer` langsung pada Pratinjau A4 (disembunyikan pada `@media print` & `SURAT_DINAS_PRINT_CSS`).
  - [`frontend/src/app/surat/_components/TabelBlockEditor.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/TabelBlockEditor.tsx):
    - Memisahkan komponen editor spreadsheet bersama untuk mode inline Kartu 3 maupun dialog lebar `Perluas`, memakai persentase `<colgroup>` murni (`actionColPct` `15%` inline / `8%` modal), atribut `data-plain` & `data-plain-icon`, tombol `×` hapus kolom & `Gabung` tersembunyi hingga hover/fokus (`Pisah` tampil di sel gabung), handle drag lebar kolom + lencana persentase + `Reset Lebar`, kontrol baris `↓` & hapus (`🗑`), toggle `# Nomor Kolom`, panel tempel Excel/Word, dan handler `handleNormalizedPaste`.
  - [`frontend/src/app/surat/keluar/dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx): menambahkan tombol `+ Tabel`, opsi sisip tabel di dropdown `Sisipkan`, dialog `Perluas` (`sm:max-w-5xl`, `data-module="persuratan"` & `psr-ui`), serta handler `colWidths` dan rebalance otomatis saat tambah/hapus kolom.
  - [`frontend/src/app/surat/_lib/export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts): membersihkan `.pkpknl-col-resizer` di `sanitizeExportClone` dan memperbarui `transformCloneForWord` agar mengekspor `<colgroup>` + lebar kolom `%`, strip `# Nomor Kolom`, baris pembatas `Judul / Pemisah` (`#f3f4f6`, `colspan`), serta `colspan` sel gabungan ke file `.doc`.
  - [`frontend/src/app/surat-tugas/surat-tugas.css`](file:///e:/bksda-superapp/frontend/src/app/surat-tugas/surat-tugas.css) & [`frontend/src/app/kepegawaian/kepegawaian.css`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/kepegawaian.css): menambahkan pengecualian `[data-plain]` pada `textarea` serta `[data-plain-icon]` pada tombol ikon agar sel dan kontrol kompak spreadsheet bebas dari override global `.psr-ui`.
  - [`frontend/tests/rincian-blok-check.cjs`](file:///e:/bksda-superapp/frontend/tests/rincian-blok-check.cjs): memperluas unit & guard checks untuk section pembatas, merge/split sel, `# Nomor Kolom`, drag/rebalance `colWidths`, layout `TabelBlockEditor`, penghapusan tombol baris `ke atas`, dan `normalizePdfCellText`.
- **Verifikasi Pasca-Edit Akhir**:
  - `npx tsc --noEmit`: `0` error (`exit 0`).
  - `npx eslint src/app/surat`: `0` error (`exit 0`).
  - Unit & Static Checks: `rincian-blok-check.cjs`, `nota-dinas-template-check.cjs`, `persuratan-ui.cjs`, `test-export-transform.cjs`, dan `export-pdf-route.cjs` seluruhnya lulus (`exit 0`).
  - `npm run build` (`Next.js 16.4.6 (Turbopack)`): `86/86` rute bersih (`exit 0`).
  - **Chromium Playwright Live `/surat/keluar/dinas`**: verifikasi default 3×3 (`No`, `Nama`, `Keterangan`), simulasi clipboard paste multi-baris PDF (`Perjalanan peserta dan\n...` -> mengalir rata), pemindahan baris via `↓`, drag divider kolom di Pratinjau A4 & modal `Perluas` + `Reset Lebar`, merge/split `Break`, pembatas `Senin, 23 November 2026`, `# Nomor Kolom`, ekspor Word `.doc`, serta `git diff --check` bersih dan inspeksi screenshot inline/modal.
  - `graphify update .`: diperbarui (`15418` nodes, `28703` edges, `1045` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal pada `codex/portal-security-pentest`.

---

## 127. Format Teks Tebal & Miring Lintas Bagian Surat + Penyamaan Ukuran Tembusan ke 11pt (17 November 2026)

- **Latar Belakang**: Pengguna membutuhkan kemampuan menebalkan (`**tebal**`) dan memiringkan (`*miring*`, `***keduanya***`) kata atau frasa tertentu mulai dari **Perihal/Hal**, **Yth./Tujuan**, **Batang Tubuh / Isi** (paragraf, poin, Rincian, dan judul/pemisah/sel Tabel), hingga **Tembusan**, sekaligus menyamakan ukuran huruf **Tembusan** dengan ukuran teks isi surat (`11pt`) baik pada Pratinjau A4, PDF, maupun Word `.doc`.
- **Perubahan Diterapkan (Commit `0bef27bf`)**:
  - [`frontend/src/lib/letter-utils.ts`](file:///e:/bksda-superapp/frontend/src/lib/letter-utils.ts): menambahkan `renderFormattedText` (merender `***tebal+miring***`, `**tebal**` beserta nested `*miring*`, dan `*miring*` sebagai elemen React aman dari XSS), `toggleInlineFormat` (menjaga spasi tepi tetap di luar pembungkus `*`/`**`; `toggleItalicInTextarea` kini mendelegasikan ke helper ini), `handleInlineFormatShortcut` (`Ctrl+B` / `Ctrl+I`), serta `serializeEditableToMarkdown` untuk round-trip edit langsung `contentEditable`.
  - [`frontend/src/app/surat/_components/SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx): mengekspor `InlineFormatButtons` & `InlineFormatTarget`, memperbarui `.pkpknl-tembusan` dari `10pt` menjadi **`11pt`**, serta menghubungkan `renderFormattedText` dan `serializeEditableToMarkdown` di slot **Perihal/Hal**, **Yth./Tujuan**, **Batang Tubuh / Isi** (paragraf, poin, `Rincian`, `Tabel`), dan **Tembusan** (sedangkan Nomor, Sifat, Lampiran, Tanggal, dan TTD/NIP tetap standar).
  - [`frontend/src/app/surat/_components/TabelBlockEditor.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/TabelBlockEditor.tsx): menambahkan kontrol `InlineFormatButtons` ringkas di bar aksi tabel (mode inline Kartu 3 & modal `Perluas`) serta pintasan `Ctrl+B`/`Ctrl+I` via `bindFormatField` untuk judul kolom, baris `Judul`, dan sel tabel.
  - [`frontend/src/app/surat/keluar/dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx): memasang `InlineFormatButtons` dan `registerSectionTarget` (`React.useCallback`) / `bindSectionFormat` pada header **Perihal**, **2. Data Spesifik (Yth/Tujuan)**, **3. Batang Tubuh / Isi**, dan **5. Tembusan**.
  - [`frontend/src/app/surat/_lib/export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts): menyamakan ukuran ekspor Word `.doc` blok & item **Tembusan** ke `11pt` dan mempertahankan tag `<strong>`/`<em>` melalui `sanitizeWordFragment` pada Tembusan, multi-baris `Yth`, label `Rincian`, `Perihal`, poin, paragraf, dan tabel.
  - [`frontend/tests/rincian-blok-check.cjs`](file:///e:/bksda-superapp/frontend/tests/rincian-blok-check.cjs): menambahkan Bagian 11 yang memvalidasi token `renderFormattedText`, `toggleInlineFormat` (termasuk spasi tepi & tumpuk `**` + `*`), CSS & Word `.pkpknl-tembusan` `11pt`, serta kontrol format di editor.
- **Verifikasi Pasca-Edit Akhir**:
  - `npx tsc --noEmit`: `0` error (`exit 0`).
  - `npx eslint src/app/surat src/lib/letter-utils.ts`: `0` error (`exit 0`).
  - Unit & Static Checks: `rincian-blok-check.cjs`, `nota-dinas-template-check.cjs`, `persuratan-ui.cjs`, `test-export-transform.cjs`, dan `export-pdf-route.cjs` seluruhnya lulus (`exit 0`).
  - `npm run build` (`Next.js 16.4.6 (Turbopack)`): `86/86` rute bersih (`exit 0`).
  - **Chromium Playwright Live `/surat/keluar/dinas`**: simulasi klik `[B]` / `[I]` & `Ctrl+I` pada `Perihal`, `Yth`, paragraf `Batang Tubuh`, sel tabel `*Break*`, dan `Tembusan`, pengecekan ukuran terkomputasi `.pkpknl-tembusan` sama persis dengan paragraf isi (`11pt`), verifikasi konten Word `.doc` (`<strong>`, `<em>`, dan `font-size: 11pt;` di Tembusan), serta `git diff --check` bersih dan `impeccable detect` nihil temuan baru.
  - `graphify update .`: diperbarui (`15433` nodes, `28749` edges, `1044` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal pada `codex/portal-security-pentest`.

---

## 128. Tab Halaman Lampiran Terpisah, Hierarki TOR (`I.` / `A.`), & Editor Lampiran Sticky Modul Persuratan (17 November 2026)

- **Latar Belakang**: Pengguna membutuhkan tab khusus **Lampiran** pada `/surat/keluar/dinas` untuk melampirkan halaman lampiran baru tanpa Kop Surat (orientasi A4 Portrait / Landscape, judul header kanan atas yang dapat diubah dengan default sesuai jenis template, nomor & tanggal sinkron otomatis dari meta dokumen, judul tengah opsional, TTD opsional), sekaligus dukungan hierarki penomoran **TOR (Term of Reference)** menggunakan Romawi besar tebal (`I.`, `II.`, ...) dan huruf kapital tebal (`A.`, `B.`, ...), serta menjaga panel **2. Isi Halaman Lampiran** tetap sticky saat men-scroll halaman pratinjau yang panjang.
- **Perubahan Diterapkan (Commit `9032a0a2`)**:
  - [`frontend/src/app/surat/_components/SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx):
    - Menambahkan tipe `LampiranOrientation`, `LampiranPageData`, serta helper `getDefaultLampiranHeaderTitle` (`nota_dinas` -> `Lampiran Nota Dinas`, `surat_dinas` -> `Lampiran Surat`, `memorandum` -> `Lampiran Memorandum`, `undangan` -> `Lampiran Undangan`, lainnya -> `Lampiran <Nama Template>`) dan `createDefaultLampiranPage`; merender `.pkpknl-lampiran-page` tanpa Kop Surat dengan blok meta kanan atas, judul tengah opsional, body `ParagrafItem[]`, dan tanda tangan `${ttd_pengirim}` toggleable (mengikuti aturan sembunyikan jabatan pada `nota_dinas`/`memorandum`), plus aturan `@page lampiranPortrait` / `@page lampiranLandscape` dan `position: static !important` pada `SURAT_DINAS_PRINT_CSS`.
    - Menambahkan hierarki TOR **Level 5** (`poin-level-5`, Romawi besar `I.`, `II.`, ... tebal) dan **Level 6** (`poin-level-6`, huruf kapital `A.`, `B.`, ... tebal) dengan deteksi case-sensitive pada `detectPointLevel` & `parseRawDocumentText` (serta `flushText()` otomatis setelah heading Level 5/6 agar paragraf prose berikutnya terpisah dan tidak ikut tebal), `reindexParagraphMarkers` dengan reset section (`I.` mereset `A.` & `1.`; `A.` mereset `1.`; naskah biasa tetap `1., 2., ...`), disambiguasi `H. -> I. -> J.` melalui `isAmbiguousUpperLetter` + `walkTorContext` / `getTorSectionContext`, serta penyesuaian indentasi bertingkat dan `data-tor-offset-pt` pada `renderParagrafItem`.
  - [`frontend/src/app/surat/_lib/export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts):
    - Menghapus pemisah layar `.pkpknl-screen-only` di `sanitizeExportClone`, memperbarui `transformCloneForWord` dengan `mso-break-type: section-break` menuju `@page Section2` (Portrait/Landscape tanpa KOP) dan transformasi `.pkpknl-lampiran-meta-wrap` / `.pkpknl-lampiran-title` / multi-`.pkpknl-ttd`.
    - Memperbarui ekspor Word untuk `.poin-level-5` (`20pt`, tebal), `.poin-level-6` (`15pt` + offset `I.`, tebal), serta pergeseran kolom `pt` pada `.poin-level-1..4`, `.pkpknl-rincian-wrap`, `.pkpknl-table-wrap`, dan `.pkpknl-body p` lewat `data-tor-offset-pt`.
  - [`frontend/src/app/surat/keluar/dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx):
    - Menambahkan switcher tab **`Naskah Utama | Lampiran`** (`document_payload.lampiranPage`), form konfigurasi Lampiran (orientasi A4 Portrait/Landscape, judul header + reset `Default`, judul tengah opsional, checkbox TTD), auto-fill meta lampiran `"-"` / `""` -> `"1 Berkas"`, serta `renderParagrafBlocksCard` bersama dan `expandedTableTarget` untuk `main` maupun `lampiran`.
    - Menambahkan kontrol `+ Bab I.` & `+ Sub A.`, `LEVEL_SWITCH_CONTROLS` & menu dropdown `Sisipkan` untuk `romanUpper` (`I.`) / `letterUpper` (`A.`), badge `Bab Utama (I.)` / `Sub-Bab (A.)`, serta menyederhanakan `handleChangeParagraphLevel` memakai `splitPointMarkerAndText`.
    - Membuat card **`2. Isi Halaman Lampiran`** tetap sticky saat scroll dengan `lg:self-stretch` pada kolom kiri `lg:col-span-5` serta `lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto` dan toolbar `top-2 lg:top-0` (pemisahan padding card ke wrapper isi `p-4 space-y-3` agar toolbar rata di atas saat scroll internal).
  - [`frontend/tests/rincian-blok-check.cjs`](file:///e:/bksda-superapp/frontend/tests/rincian-blok-check.cjs): menambahkan Bagian 12 (helper Lampiran, named `@page`, Word `Section2`, `"1 Berkas"`) dan Bagian 13 (case-sensitivity `I.`/`A.`, reset & disambiguasi TOR, `parseRawDocumentText` TOR, CSS bold, Word `data-tor-offset-pt`, tombol `+ Bab I.`/`+ Sub A.`, serta guard sticky Lampiran).
- **Verifikasi Pasca-Edit Akhir**:
  - `npx tsc --noEmit` (`0` error) & `npx eslint src/app/surat src/lib/letter-utils.ts` (`0` error/warning).
  - Audit 5 Token Desain `dinas/page.tsx`: `{"texts":["text-xs","text-xl","text-2xl","text-sm"],"oddSpace":[]}`.
  - Unit & Static Checks: `rincian-blok-check.cjs`, `nota-dinas-template-check.cjs`, `persuratan-ui.cjs`, `test-export-transform.cjs`, dan `export-pdf-route.cjs` seluruhnya lulus (`exit 0`).
  - **Chromium Playwright Live `/surat/keluar/dinas`**: verifikasi `nota_dinas` / `surat_dinas` / `memorandum`, sinkronisasi `Nomor` & `Tanggal`, PDF vector MediaBox `[0,0,594.96,841.92]` (Portrait) & `[0,0,841.92,594.96]` (Landscape), Word `.doc` (`Section2` Landscape & heading TOR bold + indent `20pt`), `Tempel Teks Utuh` TOR, bold `fontWeight >= 700` & alignment `I.`/`A.`/`1.`, sticky card Lampiran (`1 Butir` di `scrollTop=1200/1600` & `11 Butir` scroll internal, `cardTop: 16`, `barTop: 17`), serta `consoleErrors: 0, pageErrors: 0`.
  - `npm run build` (`Next.js 16.4.6 (Turbopack)`): `86/86` rute bersih (`exit 0`); `git diff --check` bersih.
  - `graphify update .`: diperbarui (`15450` nodes, `28785` edges, `1036` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal pada `codex/portal-security-pentest`.

---

## 129. Perbaikan Background Putih & Scrollbar Ganda Modal Kepegawaian + Tahun Berjalan (`"untuk tahun 2026"`) Cuti Tahunan (17 November 2026)

- **Latar Belakang**:
  1. Pada modul **Kepegawaian (`/kepegawaian/cuti`)**, saat membuka modal persetujuan/generate ulang (**Pengajuan -> Disetujui** / **Generate Ulang**) tampil kotak putih lebar di belakang card modal (`sm:max-w-3xl` membungkus `max-w-lg`), dan saat membuka modal **Surat Izin Cuti Resmi (TTE)** tampil kotak putih di belakang plus **2 scrollbar vertikal** sekaligus.
  2. Pada penerbitan dan tampilan **Surat Izin Cuti Tahunan** yang hanya menggunakan kuota tahun berjalan (`sisa_n1 === 0 && sisa_n2 === 0`, pembaruan aturan Bagian 44), kalimat pembuka butir 1 sebelumnya menghilangkan tahun berjalan sehingga perlu mencantumkan format **`untuk tahun <YYYY>`** (mis. *"1. Diberikan Cuti Tahunan untuk tahun 2026 kepada Pegawai Negeri Sipil :"*).
- **Perubahan Diterapkan (Commit `9178f616`)**:
  - [`frontend/src/app/surat-tugas/surat-tugas.css`](file:///e:/bksda-superapp/frontend/src/app/surat-tugas/surat-tugas.css): membatasi rule unlayered `:is(.st-ui, .kpg-ui, .psr-ui)[data-slot="dialog-content"]` dengan `:not(:has(> .rounded-3xl))` agar background/border luar tidak muncul di belakang card `.rounded-3xl`.
  - [`frontend/src/app/kepegawaian/_components/KepegawaianDialog.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/_components/KepegawaianDialog.tsx): menambahkan `[&:has(>.rounded-3xl)]:bg-transparent [&:has(>.rounded-3xl)]:shadow-none [&:has(>.rounded-3xl)]:ring-0 [&:has(>.rounded-3xl)]:rounded-3xl [&:has(>.rounded-3xl[class*='overflow-'])]:overflow-hidden` sehingga seluruh dialog self-card bebas kotak belakang dan scrollbar ganda di tingkat root.
  - Penyelarasan lebar pembungkus `KepegawaianDialog` (`sm:max-w-*`) & `max-h-[92dvh]` di [`frontend/src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx) (`sm:max-w-4xl`), [`frontend/src/app/kepegawaian/cuti/_components/CutiModals.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/CutiModals.tsx) (`PrintLeaveModal` `sm:max-w-4xl`, `ApproveLeaveModal` `sm:max-w-lg`, `UploadScanModal` `max-h-[92dvh]`), [`frontend/src/app/kepegawaian/cuti/_components/ScanViewerModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/ScanViewerModal.tsx), serta sibling di [`frontend/src/app/kepegawaian/employees/[id]/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/employees/%5Bid%5D/page.tsx) (`sm:max-w-sm`) dan [`frontend/src/app/kepegawaian/uang-makan/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/uang-makan/page.tsx) (`sm:max-w-2xl`).
  - [`backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php): memperbarui `resolveTahunCutiText` agar `isAnnual()` selalu mengembalikan minimal `"untuk tahun <YYYY>"` meskipun `sisa_n1 === 0 && sisa_n2 === 0` (cuti non-tahunan tetap `null`).
  - [`frontend/src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx) & [`frontend/src/app/surat/_components/SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx): menyelaraskan fallback `"untuk tahun <YYYY>"` (baik di modal cuti TTE untuk `document_payload.tahunCutiText` lama yang `null`, default `getDefaultDataForTemplate("surat_izin_cuti")`, maupun preview Persuratan saat `tahunCutiText == null`, dengan tetap mempertahankan input kosong manual `""`).
  - [`backend/tests/EmployeeLeaveSnapshotCheck.php`](file:///e:/bksda-superapp/backend/tests/EmployeeLeaveSnapshotCheck.php) & [`frontend/tests/kepegawaian-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/kepegawaian-ui.cjs): memperbarui ekspektasi `tahun_cuti_text` tahun tunggal & non-tahunan serta menambahkan guard background transparan & single-scroll `KepegawaianDialog`.
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS** (termasuk N saja `"untuk tahun 2026"`, N-1, N-2, & non-tahunan `null`).
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/kepegawaian src/app/surat` (`0`), `kepegawaian-ui.cjs`, `rincian-blok-check.cjs`, `persuratan-ui.cjs`, `nota-dinas-template-check.cjs`, dan `test-export-transform.cjs` lulus (`exit 0`).
  - **Chromium Playwright Live `/kepegawaian/cuti` & `/surat/keluar/dinas`**: verifikasi `ApproveLeaveModal`, `DigitalSuratIzinModal` (`sisa_n1: 0, sisa_n2: 0`), `Generate Ulang` (termasuk accordion upload scan), & `PrintLeaveModal` (`1280×720`) -> outer `DialogContent` transparan `rgba(0, 0, 0, 0)`, lebar outer = card, maksimal 1 scrollbar vertikal, serta teks resmi `"1. Diberikan Cuti Tahunan untuk tahun 2026 kepada Pegawai Negeri Sipil :"`, `"untuk tahun 2025 dan tahun 2026"`, dan `Cuti Sakit` tanpa tahun; inspeksi screenshot Light & Dark Mode bersih.
  - `npm run build` (`86/86` rute bersih), `git diff --check` bersih, dan `graphify update .` (`15451` nodes, `28785` edges, `1034` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal pada `codex/portal-security-pentest`.

---

## 130. Redaksi Cuti 1 Hari Tanpa `s.d` & Penghormatan `LeaveType.hitung_hari` pada Surat Izin Cuti (17 November 2026)

- **Latar Belakang**:
  Pada penerbitan **Surat Izin Cuti** berdurasi 1 hari (mis. tanggal mulai dan tanggal selesai sama), template masih mencetak rentang berulang (`"... 17 November 2026 s.d 17 November 2026"`) dan memakai satuan baku `"hari kalender"` meskipun jenis cuti aktif (seperti Cuti Tahunan) dikonfigurasi `hitung_hari = 'hari_kerja'`.
- **Perubahan Diterapkan (Commit `7a97f151`)**:
  - [`backend/app/Modules/Kepegawaian/Models/EmployeeLeaveRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Models/EmployeeLeaveRequest.php): menambahkan `resolveLeaveType()` dan `resolveHitungHari()` (default `'hari_kerja'` bila tidak ditemukan atau `'hari_kalender'` sesuai katalog `kpg_leave_types`).
  - [`backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php): mempropagasi `hitung_hari` / `hitungHari` pada `adminIndex` (di-batch lewat katalog agar 0 query N+1), `previewSuratIzin`, dan `generateSuratIzin`.
  - [`frontend/src/app/kepegawaian/cuti/_components/CutiModals.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/CutiModals.tsx), [`frontend/src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/DigitalSuratIzinModal.tsx), dan [`frontend/src/app/surat/_components/SuratDinasDocument.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/SuratDinasDocument.tsx): memformat `"hari kerja"` vs `"hari kalender"` sesuai `hitungHari`, serta menghilangkan `"s.d <tanggal>"` saat `jumlahHari === 1` atau tanggal mulai dan selesai sama (`"Selama 1 (satu) hari kerja terhitung mulai tanggal 17 November 2026, dengan ketentuan sebagai berikut :"`).
  - [`frontend/src/app/surat/keluar/dinas/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/keluar/dinas/page.tsx): menambahkan kontrol manual **`Satuan Hitung Hari Cuti`** (`Hari Kerja | Hari Kalender`) untuk template `surat_izin_cuti`.
  - [`backend/tests/EmployeeLeaveSnapshotCheck.php`](file:///e:/bksda-superapp/backend/tests/EmployeeLeaveSnapshotCheck.php) & [`frontend/tests/kepegawaian-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/kepegawaian-ui.cjs): memperluas cakupan regresi satuan `hitung_hari` dan format cuti 1 hari.
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`7a97f151`).

---

## 131. Sinkronisasi Real-Time Reverb Cuti, Pembersihan Notifikasi Cuti Terhapus, & Penghapusan Fokus Nyangkut/Double-Ring Overlay (17 November 2026)

- **Latar Belakang**:
  1. Pengajuan cuti dari browser pegawai dan persetujuan admin pada `/kepegawaian/cuti` tidak langsung masuk secara real-time antar browser karena env Laravel Reverb belum aktif di lokal, `myStore`/`myDestroy` belum memancarkan `AdminInboxChanged`, `echo.ts` fallback mengarah ke `:8000` (port API) alih-alih `:8080`, dan cache GET `api.ts` (2,5 detik) sempat mengembalikan daftar lama sesaat setelah event WebSocket masuk.
  2. Ketika pengajuan cuti dihapus oleh admin (`adminDestroy`), notifikasi lama pegawai masih tertinggal dan saat diklik memicu permintaan ke `/api/me/leave-requests/{id}` (`404`) serta memunculkan toast `"Permohonan cuti tidak tersedia atau tidak dapat diakses."`.
  3. Saat membuka `ConfirmDialog` atau modal lain melalui klik mouse / item `DropdownMenu` (mis. `... -> Hapus Pengajuan` atau `Edit Pengajuan`), tombol pertama (`Batal`) langsung menampakkan **double-ring** (border hijau `--ring` dari `button.tsx` + outline biru `--ds-accent-fg` dari CSS modul), dan saat ditutup dengan mouse, tombol pemicu (`...` / Bell / `SelectTrigger`) tetap meninggalkan ring `:focus-visible` yang nyangkut.
- **Perubahan Diterapkan (Commit `179dab5c`)**:
  - **Sinkronisasi Real-Time Reverb & Cache Flush**:
    - Konfigurasi env lokal ter-gitignore (`backend/.env` `REVERB_*` & `frontend/.env.local` `NEXT_PUBLIC_REVERB_*` pada port `8080`/`http`) serta menyalakan daemon `php artisan reverb:start --host=0.0.0.0 --port=8080`.
    - [`backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php): `myStore`, `myDestroy`, dan `adminDestroy` mem-broadcast `AdminInboxChanged('kepegawaian', 'created' | 'deleted', ...)` setelah transaksi DB commit (dibungkus `try/catch` non-blocking).
    - [`frontend/src/app/kepegawaian/cuti/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/page.tsx): memanggil `clearGetCache()` sebelum `invalidateQueries(["inboxLeaveRequests"])` pada handler `useAdminInboxLive("kepegawaian", ...)` dan menambahkan fallback `refetchInterval: 10000` + `refetchOnWindowFocus: true`.
    - [`frontend/src/app/portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx): memanggil `clearGetCache()` untuk event notifikasi `item.type === "cuti"` sebelum `fetchMyLeaveRequests()`.
    - [`frontend/src/lib/echo.ts`](file:///e:/bksda-superapp/frontend/src/lib/echo.ts): menormalkan `localhost` / `127.0.0.1` mengikuti `window.location.hostname` pada `wsHost` dan `authEndpoint`, serta mengubah fallback `wsPort` API lokal `:8000` menjadi `8080`.
  - **Penghapusan Cuti & Pembersihan Notifikasi Lama / Orphan**:
    - [`backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php): helper bersama `cleanupLeaveNotifications()` dipakai `myDestroy` dan `adminDestroy` untuk menghapus notifikasi `cuti` lama milik `reference_id` terkait; `adminDestroy` selanjutnya mengirim notifikasi **`Permohonan Cuti Dihapus`** ke pegawai dengan `status: 'removed'` & `availability: 'unavailable'` sehingga klik notifikasi membuka tab **Cuti Saya** tanpa memicu 404.
    - [`backend/app/Http/Controllers/Api/PortalNotificationController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/PortalNotificationController.php): `index()` secara retroaktif menandai notifikasi `cuti` lama yang data cutinya sudah terhapus di DB sebagai `availability: 'unavailable'`.
    - [`frontend/src/app/portal/_components/NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx), [`frontend/src/app/portal/_components/MyLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyLeaveTab.tsx), & [`frontend/src/app/portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx): menyegarkan daftar notifikasi saat popover bell dibuka (`clearGetCache()` + `fetchLatest(true)`), dan jika race condition HTTP `404` tetap terjadi saat membuka dari memori lama, daftar cuti disegarkan (`handleLeaveUnavailable`) dengan toast info yang jelas.
  - **Penghapusan Fokus Nyangkut & Double-Ring CSS Lintas Komponen Overlay**:
    - [`frontend/src/components/ui/use-dialog-focus-return.ts`](file:///e:/bksda-superapp/frontend/src/components/ui/use-dialog-focus-return.ts): pelacak modalitas pointer vs keyboard (`hadKeyboardFocusIntent`, `rememberDropdownOpener`, `resolveDialogOpener`, `focusElementRespectingModality`, `clearStuckPointerFocusVisible`) dengan `focusVisible: false` (plus `blur()` sebelum re-focus bila elemen masih berstatus `:focus-visible`).
    - [`frontend/src/components/ui/dialog.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/dialog.tsx), [`frontend/src/components/ui/confirm-dialog.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/confirm-dialog.tsx), [`frontend/src/components/ui/dropdown-menu.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/dropdown-menu.tsx), [`frontend/src/components/ui/popover.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/popover.tsx), & [`frontend/src/components/ui/select.tsx`](file:///e:/bksda-superapp/frontend/src/components/ui/select.tsx): mencegah auto-focus menyalakan tombol pertama saat dibuka lewat pointer, mempertahankan pelacakan opener saat dipicu dari item `DropdownMenu` yang sudah ter-blur, dan menghilangkan ring `:focus-visible` nyangkut saat ditutup lewat pointer (navigasi keyboard `Tab`/`Escape` tetap normal).
    - [`frontend/src/app/globals.css`](file:///e:/bksda-superapp/frontend/src/app/globals.css) & [`frontend/src/app/kepegawaian/kepegawaian.css`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/kepegawaian.css): menyetel `--color-ring: var(--ds-accent-fg)` pada setiap `[data-module="..."]` serta menetralkan `box-shadow` & `focus-visible:border-ring` pada `[data-slot="button"]` di cakupan CSS modul agar hanya tampil 1 outline fokus sesuai warna modul.
  - **Cakupan Test Diperluas**: [`backend/tests/Feature/BroadcastChannelAuthTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/BroadcastChannelAuthTest.php), [`backend/tests/Feature/EmployeeLeaveRequestTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/EmployeeLeaveRequestTest.php), [`frontend/tests/kepegawaian-ui.cjs`](file:///e:/bksda-superapp/frontend/tests/kepegawaian-ui.cjs), & [`frontend/tests/portal-notifications-live-e2e.playwright.cjs`](file:///e:/bksda-superapp/frontend/tests/portal-notifications-live-e2e.playwright.cjs) (`E2E-LIVE-07` dua browser live Reverb `<4000ms` + delete cleanup, `E2E-LIVE-08` mouse dialog/popover focus & single `#2563eb` keyboard outline).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `php artisan test tests/Feature/BroadcastChannelAuthTest.php tests/Feature/EmployeeLeaveRequestTest.php` -> **11 test, 73 assertions PASS**; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint` 6 komponen UI bersama (`0`), `node frontend/tests/kepegawaian-ui.cjs` -> **PASS**, `node frontend/tests/persuratan-ui.cjs` -> **ALL CHECKS PASSED**.
  - **Playwright Live Two-Browser + Reverb (`node frontend/tests/portal-notifications-live-e2e.playwright.cjs`)**: **11/11 PASS (`E2E-LIVE-01A` s.d. `E2E-LIVE-08`)**, dengan `Employee->Admin` `1816ms`, `Admin->Employee` `2541ms` tanpa refresh, penghapusan cuti membersihkan notif lama, serta verifikasi klik mouse `... -> Hapus/Edit -> Batal` & Bell popover bebas ring nyangkut/double-ring.
  - `npm run build` (`86/86` rute bersih), `git diff --check` bersih, dan `graphify update .` (`15464` nodes, `28850` edges, `1038` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`179dab5c`) pada `codex/portal-security-pentest`.

---

## 132. Review `/ponytail-review` & `/security-audit` Modul Persuratan (17 November 2026)

- **Latar Belakang**:
  Audit mendalam pada modul **Persuratan** (`backend/app/Modules/Surat/*`, `frontend/src/app/surat/*`, dan `frontend/src/lib/print-window.ts`) menggunakan kombinasi **`/ponytail-review`** (eliminasi dead code, duplikasi upload, serta bug logika tidak konsisten) dan **`/security-audit`** (validasi batas kepercayaan ekspor PDF/Word/cetak, query wildcard `LIKE`, JSON payload, dan validasi parameter rute).
- **Temuan & Perbaikan Diterapkan (Commit `65f0d2f0`)**:
  - **Backend Validasi, Query Escaping, & Rute (`backend/app/Modules/Surat/*`)**:
    - [`SuratKeluarRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Requests/SuratKeluarRequest.php) & [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php): memperbaiki bug penolakan status `'terdaftar'` (`in:draft,final,terdaftar,DRAFT,FINAL,TERDAFTAR` sesuai migrasi & UI), memindahkan dekode string JSON `document_payload` ke `prepareForValidation()` agar tervalidasi sebagai `array`, menetapkan batas ukuran `document_payload` maksimal `512 KB` (`524288` byte), menghapus dekode JSON ganda yang tak terjangkau di `store()`/`update()`, mengekstrak helper bersama `storeUploadedFile()`, dan membersihkan berkas upload yatim bila transaksi/save DB gagal.
    - [`Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Routes/api.php) & [`SuratTemplateController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratTemplateController.php): menambahkan `->whereNumber('template')` pada `PUT`/`PATCH`/`DELETE templates/{template}` agar parameter non-numerik ditolak cleanly di level router (`405` via rute `GET` key string) dan tidak memicu `TypeError` 500 `int $id`; menormalkan `key` dengan `Str::slug(..., '_')` **sebelum** validasi `regex:/^[a-z0-9_]+$/` & `unique` + membatasi `default_payload` `max:60` agar duplikasi slug (`Custom-Surat`) atau key kosong (`---`) mengembalikan `422` bukan SQL 500; serta menjaga tipe `is_string($kategori)`.
    - [`SuratMasukController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratMasukController.php), [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php), [`SuratTemplateController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratTemplateController.php), & [`SuratMasukExport.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Exports/SuratMasukExport.php): menyeragamkan pencarian dengan `whereRaw("... LIKE ? ESCAPE '!'", [$pattern])` agar karakter `!`, `%`, `_` ter-escape identik pada PostgreSQL dan SQLite (`phpunit`); menambah `$request->validate(...)` pada `exportExcel()` (`start_date`, `end_date`, `tahun` 4 digit, `bulan` `1..12`, `sifat`, `search`) serta guard `is_string($sifat)` di `index()`.
    - [`SuratMasuk.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Models/SuratMasuk.php): menghapus dead assignment `$table =` pada relasi `disposisi()`.
  - **Frontend Batas Keamanan Ekspor PDF/Word/Print & Ponytail Cleanups (`frontend/src/app/surat/*`, `frontend/src/lib/print-window.ts`)**:
    - [`export-pdf/route.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/export-pdf/route.ts): menambahkan pre-check header `content-length` (`413`), batas payload UTF-8 via `Buffer.byteLength`, penghapusan tag `<link`/`<form` pada `sanitizeHtmlForPdf`, pengetatan `page.route` allowlist dari `data:`/`blob:` bebas ke `about:` + `SAFE_DATA_IMAGE_RE` (raster image base64), serta timeout `PDF_RENDER_TIMEOUT_MS = 20_000` untuk `page.pdf(...)`.
    - [`export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts): memvalidasi protokol URL gambar KOP (`http:`/`https:`/`data:image/...;base64`) serta meng-escape atribut `src` dengan `escapeWordHtml(src)`.
    - [`print-window.ts`](file:///e:/bksda-superapp/frontend/src/lib/print-window.ts): menambahkan `escapePrintAttr()` pada `title`, `htmlLang`, `bodyClassName`, dan `bodyStyle`.
    - [`surat/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/page.tsx) & [`LembarDisposisiForm.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/LembarDisposisiForm.tsx): menghapus dead fallback `.catch(() => api.get("/surat-keluar?per_page=5"))` dan mengganti silent `catch` saat pembuatan surat kedua 2-Up menjadi `toast.warning(...)`.
  - **Penambahan Test Regresi**: [`backend/tests/Feature/SuratModuleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratModuleTest.php) (`3` test baru: status `terdaftar` + payload `>512KB` `422`, wildcard escaping `LIKE ... ESCAPE '!'` + validasi export Excel, dan kolisi slug template + `405` parameter non-numerik) serta [`frontend/tests/export-pdf-route.cjs`](file:///e:/bksda-superapp/frontend/tests/export-pdf-route.cjs).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` pada 8 berkas PHP bersih; `php artisan test tests/Feature/SuratModuleTest.php tests/Feature/SuratAndKepegawaianRbacTest.php` -> **19 passed, 353 assertions**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/surat src/lib/print-window.ts` (`0`), `node tests/export-pdf-route.cjs` (`PASS`), `node tests/persuratan-ui.cjs` (`ALL CHECKS PASSED`), `node tests/test-export-transform.cjs` (`PASS`), `node tests/rincian-blok-check.cjs` (`ALL ASSERTIONS PASSED`), `node tests/nota-dinas-template-check.cjs` (`PASS`), serta `npm run build` (`86/86` rute bersih pasca-edit frontend terakhir).
  - Knowledge Graph & Repo: `git diff --check` bersih dan `graphify update .` (`15471` nodes, `28864` edges, `1044` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`65f0d2f0`) pada `codex/portal-security-pentest`.

---

## 133. Lanjutan Audit `/ponytail-review` & `/security-audit` Modul Persuratan: Guard Input Non-Skalar, FK Integer PostgreSQL, Sanitasi Formula/SVG, & Hapus Shim Mati (17 November 2026)

- **Latar Belakang**:
  Penyisiran menyeluruh kedua atas seluruh berkas **Persuratan** (`backend/app/Modules/Surat/*` dan `frontend/src/app/surat/*`) menemukan beberapa celah edge-case yang sebelumnya belum tertutup di `65f0d2f0`: konversi array-to-string `500` pada parameter `?search[]=...` maupun payload JSON array skalar di `FormRequest`, validasi `exists:kpg_employees,id` tanpa aturan `integer` (berisiko `SQLSTATE[22P02]` HTTP `500` di PostgreSQL), `isi_ringkas` tanpa batas panjang, duplikasi helper upload di `SuratMasukController` dan initializer `localStorage` di `LembarDisposisiForm.tsx`, izin broad `about:` / `<title>` / `data:image/svg+xml` di ekspor PDF/Word, serta 1 berkas shim mati tanpa pemanggil.
- **Temuan & Perbaikan Diterapkan (Commit `e8d1a23c`)**:
  - **Backend Guard Input Non-Skalar, FK Integer Postgres, & Ponytail Refactoring**:
    - [`SuratMasukRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Requests/SuratMasukRequest.php) & [`SuratKeluarRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Requests/SuratKeluarRequest.php): mengganti paksaan cast `(string) $this->field` pada `prepareForValidation()` dengan loop bersih yang menjaga nilai non-string tetap utuh agar gagal di aturan `'string'` (`422` bukan `500` `Array to string conversion`); menambahkan aturan `integer` sebelum `exists:kpg_employees,id` pada `penandatangan_id`, `disposisi.ka_subbag_tu_id`, dan `disposisi.kepala_balai_id` (mencegah `SQLSTATE[22P02]` HTTP `500` di PostgreSQL); serta membatasi `'isi_ringkas'` maksimal `10000` karakter.
    - [`SuratMasukController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratMasukController.php), [`SuratKeluarController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratKeluarController.php), & [`SuratTemplateController.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Controllers/SuratTemplateController.php): menambahkan guard `is_string($search)` pada `index()` agar query `?search[]=...` tidak memicu `500`; di `SuratMasukController`, mengekstrak helper bersama `storeUploadedFile()` (menghapus duplikasi di `store()` & `update()`) serta meng-clamp rentang tahun `nextAgenda()` ke `1900..2100`.
    - [`SuratMasukExport.php`](file:///e:/bksda-superapp/backend/app/Modules/Surat/Exports/SuratMasukExport.php): memperkuat `safeCell()` dengan pola `/^(?:[\s\x00-\x1F]*[=+\-@]|[\t\r])/` sehingga sel diawali `\t`, `\r`, atau karakter kontrol + pemicu formula tetap ternetralisasi tanda petik `'`.
  - **Frontend Sanitasi & Pengurangan Bloat (`/ponytail-review`)**:
    - Menghapus berkas shim mati tanpa pemanggil `frontend/src/app/surat/laporan/_components/SuratDinasDocument.tsx` (`delete:` `0` callers setelah `/surat/laporan` menjadi redirect).
    - [`export-pdf/route.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/export-pdf/route.ts): memperketat allowlist `about:` menjadi tepat `url === "about:blank"`.
    - [`export-surat-dinas.ts`](file:///e:/bksda-superapp/frontend/src/app/surat/_lib/export-surat-dinas.ts): memblokir `data:image/svg+xml` di `sanitizeWordFragment()` dan membungkus `<title>` dokumen Word dengan `escapeWordHtml()`.
    - [`LembarDisposisiForm.tsx`](file:///e:/bksda-superapp/frontend/src/app/surat/_components/LembarDisposisiForm.tsx): menyatukan inisialisasi duplikat `localStorage.getItem("bksda_default_penerus")` antara `diteruskanList1` dan `diteruskanList2` ke helper `loadDefaultRecipients()` (`shrink:`).
  - **Cakupan Uji Regresi**: [`SuratModuleTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/SuratModuleTest.php) (`test_malformed_array_inputs_non_integer_fk_and_excel_formula_cells_are_handled_safely`) & [`export-pdf-route.cjs`](file:///e:/bksda-superapp/frontend/tests/export-pdf-route.cjs).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `php artisan test tests/Feature/SuratModuleTest.php tests/Feature/SuratAndKepegawaianRbacTest.php tests/Feature/SixModulesSecurityHardeningTest.php` -> **26 passed, 414 assertions**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/surat src/lib/print-window.ts` (`0`), `node tests/export-pdf-route.cjs`, `persuratan-ui.cjs`, `test-export-transform.cjs`, `rincian-blok-check.cjs`, `nota-dinas-template-check.cjs` -> **seluruhnya PASS**, serta `npm run build` (**`86/86` rute bersih**).
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15474` nodes, `28872` edges, `1041` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`e8d1a23c`) pada `codex/portal-security-pentest`.

---

## 134. Review `/ponytail-review` & `/security-audit` Modul Kepegawaian (17 November 2026)

- **Latar Belakang**:
  Audit menyeluruh pada modul **Kepegawaian** (`backend/app/Modules/Kepegawaian/*` dan `frontend/src/app/kepegawaian/*`) memadukan **`/ponytail-review`** (eliminasi dead code, duplikasi validasi/helper upload, dan dead hook destructure) dengan **`/security-audit`** (pencegahan HTTP `500` array-to-string & `SQLSTATE[22P02]` pada rute publik/admin, escaping wildcard `LIKE` portabel PostgreSQL/SQLite, manajemen berkas scan transaksional, batas ZIP/XXE pada parser SIKADIR, serta sanitasi ekspor Excel & Word).
- **Temuan & Perbaikan Diterapkan (Commit `8f9aa954`)**:
  - **Validasi Input, Parameter Rute, & Anti-500 PostgreSQL (`Routes/api.php`, `Requests/*`)**:
    - [`Routes/api.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Routes/api.php): menambahkan `->whereNumber(...)` pada parameter ID numerik (`{id}`, `{employee}`, `{letter}`, `{attachment}`, `{requestId}`) sambil menjaga `{id}` pada `/settings/holidays/{id}` (`static-...`) dan `{bank}` pada `/settings/registered-banks/{bank}`.
    - [`EmployeeRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeRequest.php): memvalidasi `is_string($locId) && Str::isUuid($locId)` di `prepareForValidation()` sebelum query `Location::find()` (mencegah PostgreSQL `SQLSTATE[22P02]` `500`), menyatukan sanitasi field teks nullable ke loop yang mempertahankan nilai non-string agar aturan `'string'`/`'uuid'` menolak dengan `422`, serta menjaga closure validasi `nip`, `nama_bank`, dan `resor` dari konversi array-to-string `500`.
    - [`EmployeeIncomingLetterRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeIncomingLetterRequest.php): menjaga `is_string` di `prepareForValidation()` agar field non-skalar ditolak `422` bukan `500`.
    - [`EmployeeAccessRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/EmployeeAccessRequest.php): menghapus pesan validasi mati `access_modules.min`.
  - **Hardening Query Publik/Admin, Escaping Wildcard, & Integritas Transaksi (`Services/*`, `Controllers/*`, `Models/*`, `Exports/*`)**:
    - [`StExpenseTemplateService.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/StExpenseTemplateService.php) & [`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php): menutup celah HTTP `500` tanpa autentikasi pada `/api/kepegawaian/st-expense-templates/public` (`?category[]=`/`?search[]=`) dan `/api/kepegawaian/employees/select` (`?q[]=`), menambah guard `is_string`/`is_scalar` pada filter `index()`, serta menyeragamkan query pencarian ke `whereRaw("... {$likeOp} ? ESCAPE '!'", [$pattern])`.
    - [`EmployeeIncomingLetterController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeIncomingLetterController.php) & [`EmployeeIncomingLetter.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Models/EmployeeIncomingLetter.php): menambahkan helper validasi filter `validatedFilters()` pada `export()` dan `index()` (mencegah `500` tanggal/array tak valid pada PostgreSQL), menghapus loop `strip_tags` duplikat di `save()`, serta meng-escape wildcard `LIKE ... ESCAPE '!'` dan guard `is_string` di `scopeFilter()`.
    - [`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php): menghapus blok cek `inactive_effective_date` dan `isEligibleForAnnualLeave` duplikat/tak terjangkau di `myStore()`, serta menambahkan guard `is_string` + `LIKE ... ESCAPE '!'` pada `myIndex()` dan `adminIndex()`.
    - [`EmployeeLeaveController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php): mengekstrak `storeScanFile()`, memvalidasi kuota cuti sebelum menulis berkas ke disk pada `storeRecord()`, menunda penghapusan scan lama pada `updateRecord()` hingga setelah `DB::commit()`, serta membersihkan berkas baru yang terlanjur disimpan bila transaksi rollback/gagal.
    - [`LeaveTypeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/LeaveTypeController.php) & [`StTaskTypeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/StTaskTypeController.php): menyeragamkan `DB::connection()->getDriverName()`, guard `is_string`, dan pencarian `LIKE ... ESCAPE '!'`.
    - [`MealAllowanceController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php), [`MealAllowanceExcelExport.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/MealAllowanceExcelExport.php), & [`EmployeeIncomingLettersExport.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Exports/EmployeeIncomingLettersExport.php): memperketat validasi bulan `01..12` (`regex:/^\d{4}-(0[1-9]|1[0-2])$/`), batas `items` `max:2000`, validasi `year`/`month` di `exportExcel()`, batas `per_page` `1..100` & guard `is_string('periode')` di `indexBatches()`, sanitasi `nama` hari libur kustom, guard `is_string` + `LIKE ... ESCAPE '!'` pada `getEmployeeBanks()`, serta pola anti-formula-injection `/^(?:[\s\x00-\x1F]*[=+\-@]|[\t\r])/` pada `safeCell()`.
    - [`SikadirParserService.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/SikadirParserService.php): menambahkan batas total dekompresi ZIP kumulatif (`25 MB`) pada `parseZipArchive()` dan flag `LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING` pada `DOMDocument::loadHTML()`.
  - **Frontend Security & Ponytail (`frontend/src/app/kepegawaian/*`)**:
    - [`export-st.ts`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/surat-tugas/_lib/export-st.ts): menambahkan `escapeWordHtml()` pada `<title>` & gambar KOP, validasi `SAFE_WORD_IMG_SRC` tanpa `outerHTML` mentah, penghapusan tag `link`/`base`, serta pembersihan skema URI berbahaya (`javascript:`, `vbscript:`, `data:text/html`, `data:image/svg+xml`).
    - [`ScanViewerModal.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/cuti/_components/ScanViewerModal.tsx): menolak URL protocol-relative (`//...`) pada fallback pratinjau scan.
    - [`layout.tsx`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/layout.tsx): memakai flag `isSuperAdmin` dari `useRole("kepegawaian")` menggantikan pemeriksaan langsung yang duplikat.
  - **Penambahan Test Regresi**: [`KepegawaianSecurityAuditTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/KepegawaianSecurityAuditTest.php) (`3` test baru: query array/wildcard `100%` pada endpoint publik/admin, validasi UUID/`FormRequest`/rute non-numerik/tanggal export/bulan invalid, serta netralisasi formula Excel berawalan whitespace/control char).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` pada 17 berkas PHP bersih; `13` suite Kepegawaian PHPUnit -> **98 tests passed (931 assertions)**; `SixModulesSecurityHardeningTest.php` -> **6 tests passed (44 assertions)**; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/kepegawaian` (`0`), `node tests/kepegawaian-ui.cjs` (`PASS`), `node tests/test-export-transform.cjs` (`PASS`), serta `npm run build` (**`86/86` rute bersih**).
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15481` nodes, `28890` edges, `1031` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`8f9aa954`) pada `codex/portal-security-pentest`.

---

## 135. Lanjutan Audit `/ponytail-review` & `/security-audit` Modul Kepegawaian: Proteksi Self-Approval `generateSuratIzin`, Prioritas SQL `SoftDeletes`, Scan Transaksional, & Pembersihan Ekspor Mati (17 November 2026)

- **Latar Belakang**:
  Penyisiran menyeluruh lanjutan terhadap berkas yang belum tersentuh di commit `8f9aa954` (`EmployeeLeaveRequestController` pasca-approval & penerbitan Surat Izin Cuti, `Employee::resolveIdByName`, `MealAllowanceController::batchUpdateEmployeeBanks`, `StTaskTypeController`, `EmployeeAccessController`, `StTemplateService`, `StExpenseTemplateService`, dan ekspor helper frontend Kepegawaian) mengungkap celah pemintasan self-approval, bug prioritas operator SQL pada `SoftDeletes`, penghapusan scan sebelum `DB::commit()`, serta beberapa ekspor/duplikasi yang dapat diringkas dengan `/ponytail`.
- **Temuan & Perbaikan Diterapkan (Commit `10769596`)**:
  - **Penutupan Bypass Self-Approval, Scan Transaksional, & Ponytail Deduplication ([`EmployeeLeaveRequestController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveRequestController.php))**:
    - `generateSuratIzin()` sebelumnya langsung menyetujui cuti (`DISETUJUI`), memotong kuota, dan menerbitkan `SuratKeluar` bertanda `'signed'` tanpa memeriksa `$this->ensureNotSelfApproval($request, $leaveReq)` seperti pada `adminUpdateStatus()` dan `adminApprove()`. Kini `ensureNotSelfApproval()` ditegakkan di awal `generateSuratIzin()`, `nomor_surat` kosong pasca-`strip_tags` ditolak (`422`), dan `'created_by' => Auth::id() ?: 1` diganti `$request->user()?->id` agar tidak pernah memalsukan aktor ID `1`.
    - Memperbaiki `storeLeaveScanFiles()`, `adminApprove()`, dan `adminUploadScan()` agar berkas scan lama tidak dihapus oleh `clearScanSlot()` sebelum `DB::commit()`; penghapusan berkas lama ditunda hingga setelah commit sukses dan berkas baru dihapus saat rollback/catch.
    - Mengekstrak helper bersama `validateLeavePeriodAndLimits()` yang dipakai oleh `myStore()` dan `adminUpdate()`, menghilangkan ~35 baris validasi duplikat.
  - **Prioritas SQL `SoftDeletes`, Closure Guard, & Sanitasi Master Data (`Employee.php`, `MealAllowanceController.php`, `StTaskTypeController.php`, `EmployeeAccessController.php`, `Services/*`, `Requests/*`)**:
    - [`Employee.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Models/Employee.php) (`resolveIdByName`): membungkus `whereRaw('LOWER(TRIM(nama_lengkap)) = ?', ...)->orWhereRaw(...)` ke dalam closure `static::where(fn)` dan menggunakan `LIKE ? ESCAPE '!'` sehingga tidak lagi membypass filter `SoftDeletes` (`deleted_at IS NULL`) akibat prioritas `OR` vs `AND` sekaligus aman terhadap literal wildcard `%`/`_`.
    - [`MealAllowanceController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php) (`batchUpdateEmployeeBanks`): menambah `is_string($value)` di awal closure validasi `nama_bank` (`422` bukan `500 Array to string conversion`) serta batas `'max:1000'` pada `employee_ids`.
    - [`StTaskTypeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/StTaskTypeController.php): mengekstrak `sanitizePayload()`, menolak `nama` kosong setelah `strip_tags` (`422`), dan menambahkan fallback `?: 'tugas'` saat slug `nama` hanya berisi tanda baca.
    - [`EmployeeAccessController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeAccessController.php) (`update`): memindahkan `Employee::findOrFail($id)` ke luar blok `try` agar mengembalikan `404` (bukan `500`) dan membungkus pembuatan/pembaruan user, pencabutan token, serta pencatatan `EmployeeHistory` dalam `DB::transaction()`.
    - [`StExpenseTemplateService.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/StExpenseTemplateService.php), [`StTemplateService.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/StTemplateService.php), [`StoreStExpenseTemplateRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/StoreStExpenseTemplateRequest.php), & [`UpdateStExpenseTemplateRequest.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Requests/UpdateStExpenseTemplateRequest.php): menolak `name` kosong setelah `strip_tags` via `DomainException` (`422`), fallback `uniqueCode` `?: 'template'`, serta pembatasan panjang `biaya_text` & `dasar_text` (`max:5000`).
  - **Pembersihan Dead Exports Frontend (`/ponytail-review`)**:
    - Menghapus ekspor mati tanpa pemanggil: `getDefaultUntukItem` pada [`untuk-helpers.ts`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/surat-tugas/_lib/untuk-helpers.ts) dan `EmployeeSelectOption` pada [`employee-types.ts`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/_lib/employee-types.ts).
  - **Penambahan Test Regresi**: [`KepegawaianSecurityAuditTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/KepegawaianSecurityAuditTest.php) (`3` test baru: blokir self-approval & nomor kosong `generateSuratIzin`, `resolveIdByName` menghormati `SoftDeletes` & `LIKE ESCAPE '!'`, serta closure array `nama_bank`, tag kosong/slug `st-task-types`, & `404` IAM).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` pada 10 berkas PHP bersih; `14` suite PHPUnit (13 suite Kepegawaian + `SixModulesSecurityHardeningTest.php`) -> **107 tests passed (991 assertions)**; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/kepegawaian` (`0`), `node tests/kepegawaian-ui.cjs` (`PASS`), `node tests/test-export-transform.cjs` (`PASS`), `node tests/diktum-capitalization-check.cjs` (`ALL ASSERTIONS PASSED`), `node tests/st-legacy-items.cjs` (`PASS`), serta `npm run build` (**`86/86` rute bersih**).
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15486` nodes, `28918` edges, `1044` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`10769596`) pada `codex/portal-security-pentest`.

---

## 136. Audit Tahap Ketiga `/ponytail-review` & `/security-audit` Modul Kepegawaian: Pembersihan Disk Scan `forceDestroy`, Validasi Pra-Unik `LeaveType`, Guard Reconciler Uang Makan, & Transaksi Soft-Delete (17 November 2026)

- **Latar Belakang**:
  Penyisiran menyeluruh terhadap bagian modul **Kepegawaian** yang belum terbuka pada dua tahap sebelumnya (`EmployeeController::destroy` / `forceDestroy`, `LeaveTypeController::store` / `update`, `MealAllowanceController::reconcile` / `storeBatch` / `exportExcel`, serta `AttendanceReconcilerService`) memastikan tidak ada celah disk-mismatch PII, error DB `500` akibat tag HTML, `TypeError` parameter array, maupun inkonsistensi dialek SQL PostgreSQL/SQLite.
- **Temuan & Perbaikan Diterapkan (Commit `d33f9718`)**:
  - **Pembersihan Disk Scan Privat & Transaksi Soft-Delete ([`EmployeeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php))**:
    - Memperbaiki `forceDestroy()` yang sebelumnya memanggil `Storage::exists`/`Storage::delete` pada disk default (`s3` di produksi), padahal scan cuti (`cuti_scans/*`) disimpan di `Storage::disk('local')`; kini dihapus secara eksplisit lewat `Storage::disk('local')->delete(...)`.
    - Membungkus `$employee->delete()` bersama penonaktifan akun `User` & pencabutan token pada `destroy()` ke dalam `DB::transaction()`.
  - **Penutupan `500 NOT NULL` / `UNIQUE` & Penggabungan Logika ([`LeaveTypeController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/LeaveTypeController.php))**:
    - Menyatukan aturan & sanitasi `store()` dan `update()` ke helper `validatedAttributes()` dengan sanitasi `nama` & `kode` **sebelum** `validate()`, sehingga input seperti `'<b></b>'` atau `'<b>Cuti Tahunan</b>'` ditolak rapi dengan HTTP `422` (bukan `500` pelanggaran constraint `NOT NULL`/`UNIQUE`).
  - **Guard Tipe Input & Portabilitas Reconciler (`MealAllowanceController.php`, `AttendanceReconcilerService.php`)**:
    - [`MealAllowanceController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php): menambah validasi `'overrides.*' => 'nullable|array'` dan guard `is_array(...)` di `reconcile()` (`422` bukan `TypeError 500`), menolak `nama_batch` kosong pasca-`strip_tags` (`422`) serta mensterilkan `jenis_pegawai`/`nama_bank`/`nomor_rekening` di `storeBatch()`, dan memvalidasi `'items.*' => 'array'` pada `exportExcel()`.
    - [`AttendanceReconcilerService.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/AttendanceReconcilerService.php): menjaga lookup `REGEXP_REPLACE` agar hanya dipakai pada driver `pgsql` dengan fallback portabel `REPLACE(...)` untuk driver non-Postgres, serta menambah fallback `?? 'Pegawai'` / `?? ''` pada `nama_lengkap` & `jabatan` bila metadata SIKADIR tidak lengkap.
  - **Penambahan Test Regresi**: [`KepegawaianSecurityAuditTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/KepegawaianSecurityAuditTest.php) (Test `#11`: `LeaveType` tag kosong/duplikat `422`, `MealAllowance` `items` skalar & `nama_batch` tag kosong `422`, serta `AttendanceReconcilerService::reconcile()` pada NIP eksternal).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih pada seluruh berkas PHP tersentuh; `14` suite PHPUnit (`13` Kepegawaian + `SixModulesSecurityHardeningTest`) -> **108 tests passed (1004 assertions)**; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: tidak ada berkas frontend yang diubah pada tahap ketiga ini (verifikasi tahap kedua: `tsc --noEmit` `0`, `eslint src/app/kepegawaian` `0`, `kepegawaian-ui.cjs`, `test-export-transform.cjs`, `diktum-capitalization-check.cjs`, `st-legacy-items.cjs`, dan `npm run build` `86/86`).
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15489` nodes, `28924` edges, `1047` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`d33f9718`) pada `codex/portal-security-pentest`.

---

## 137. Audit Penutup Menyeluruh `/ponytail-review` & `/security-audit` Modul Kepegawaian: Pembersihan Lampiran Surat Masuk Pasca-Commit & Batas `10 MB` HTML SIKADIR (17 November 2026)

- **Latar Belakang**:
  Penyisiran menyeluruh atas seluruh berkas tersisa modul **Kepegawaian** yang sebelumnya belum terbuka lengkap (`EmployeeIncomingLetterController::destroy` / `destroyAttachment`, `EmployeeLeave`, `LeaveType`, `AdaptiveTariffResolver`, `SikadirParserService::parse()`, serta seluruh helper & route frontend `kepegawaian/*`) memverifikasi integritas atomik penghapusan berkas dan batas parser HTML tunggal.
- **Temuan & Perbaikan Diterapkan (Commit `ad4af0ac`)**:
  - **Penghapusan Berkas Pasca-DB & Penggabungan Helper ([`EmployeeIncomingLetterController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/EmployeeIncomingLetterController.php))**:
    - `destroy()` dan `destroyAttachment()` sebelumnya menghapus objek berkas di storage **sebelum** menghapus baris database dan di luar transaksi; jika penghapusan DB gagal, pointer DB tertinggal mengarah ke berkas yang sudah hilang. Kini penghapusan di `destroy()` dibungkus `DB::transaction()` dan pembersihan storage pada `destroy()`, `destroyAttachment()`, serta `save()` disatukan lewat helper `deleteStoragePaths()` yang dijalankan hanya **setelah** mutasi/commit DB berhasil.
  - **Batas Ukuran HTML/XLS Tunggal SIKADIR ([`SikadirParserService.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Services/SikadirParserService.php))**:
    - `parse()` sebelumnya memanggil `file_get_contents($filePath)` tanpa batas untuk unggahan `.html`/`.htm`/`.xls` tunggal (padahal batas upload rute mencapai `50 MB` untuk arsip ZIP). Kini unggahan non-XLSX/ZIP tunggal dibatasi maksimal `10 MB` dan menolak file di atas batas lewat `ValidationException` (`422`) sebelum masuk `DOMDocument::loadHTML()`.
  - **Audit Lanjutan Frontend (`frontend/src/app/kepegawaian/*`)**:
    - Pemeriksaan berkas helper (`utils.ts`, `status-helpers.ts`, `buruh-helpers.ts`, `departure-helpers.ts`, `plh-helpers.ts`, `sumber-dana.ts`, `useScheduleConflicts.ts`, `employee-helpers.ts`, `activity-helpers.ts`), halaman redirect `/kepegawaian/surat-tugas/history`, serta `eslint src/app/kepegawaian` bersih tanpa temuan dead code maupun masalah keamanan baru (`Lean already. Ship.`).
  - **Penambahan Test Regresi**: [`KepegawaianSecurityAuditTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/KepegawaianSecurityAuditTest.php) (Test `#12`: soft-delete arsip surat masuk membersihkan lampiran DB & objek storage setelah transaksi, serta `SikadirParserService::parse()` melempar `ValidationException` untuk HTML > `10 MB`).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `14` suite PHPUnit (`13` Kepegawaian + `SixModulesSecurityHardeningTest`) -> **109 tests passed (1009 assertions)**; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/kepegawaian` (`0`), dan `node tests/kepegawaian-ui.cjs` -> **PASS**.
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15492` nodes, `28929` edges, `1012` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`ad4af0ac`) pada `codex/portal-security-pentest`.

---

## 138. Verifikasi Akhir `/ponytail-review` & `/security-audit` Modul Kepegawaian: Guard Skalar `normalizeItems()` & `storeBatch()` (17 November 2026)

- **Latar Belakang**:
  Penyisiran akhir seluruh berkas modul **Kepegawaian** yang belum sempat diperiksa penuh pada putaran keempat (`MealAllowanceController::normalizeItems()`, `KepegawaianServiceProvider`, `StTemplateResource`, `StExpenseTemplateResource`, model `StTemplate`/`StExpenseTemplate`/`StTaskType`/`StTemplateVersion`/`Holiday`/`MealAllowanceBatch`/`MealAllowanceItem`/`EmployeeHistory`/`EmployeeIncomingLetterAttachment`, `Enums/StTemplateType`, `EmployeeController::index`, serta pemindaian DOM/keamanan pada seluruh komponen & halaman `frontend/src/app/kepegawaian/**`).
- **Temuan & Perbaikan Diterapkan (Commit `bc8a3620`)**:
  - **Guard Skalar `normalizeItems()` & Validasi `items.*` di `storeBatch()` ([`MealAllowanceController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php))**:
    - `storeBatch()` memanggil `$this->normalizeItems($input['items'])` **sebelum** `$request->validate(...)`, sementara `normalizeItems()` langsung mengakses `$it['nama_lengkap']` dan offset array lainnya tanpa memeriksa `is_array($it)`. Payload `'items' => ['not-an-array']` pada `POST /api/kepegawaian/uang-makan/batches` melempar `TypeError` HTTP `500` alih-alih HTTP `422`.
    - Menambahkan `if (! is_array($it)) { continue; }` satu kali di `normalizeItems()` (melindungi `storeBatch()` dan `exportExcel()` sekaligus) serta aturan `'items.*' => 'array'` pada `storeBatch()`.
  - **Hasil Audit Berkas Tersisa (`Lean already. Ship.`)**:
    - Seluruh berkas tersisa backend (`KepegawaianServiceProvider`, `StTemplateResource`, `StExpenseTemplateResource`, `StTemplateType`, dan model-model Kepegawaian) serta pemindaian frontend (`frontend/src/app/kepegawaian/**`: `target="_blank"` sudah memakai `rel="noopener noreferrer"` atau rute same-origin Next `<Link>`) bersih tanpa temuan dead code maupun kerentanan baru.
  - **Penambahan Test Regresi**: [`KepegawaianSecurityAuditTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/KepegawaianSecurityAuditTest.php) (`store_batch_rejects_scalar_items_with_422_instead_of_500`: memastikan payload `items: ['not-an-array']` ditolak dengan HTTP `422` pada `items.0`).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `14` suite PHPUnit Kepegawaian (**113 tests passed, 1007 assertions**) + `SixModulesSecurityHardeningTest` (**6 tests passed, 44 assertions**; total `15` suite = **119 tests passed, 1051 assertions**); `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/kepegawaian` (`0`), `node tests/kepegawaian-ui.cjs` -> **PASS**, `node tests/test-export-transform.cjs` -> **PASS**, `node tests/diktum-capitalization-check.cjs` -> **PASS**, `node tests/st-legacy-items.cjs` -> **PASS**.
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15494` nodes, `28931` edges, `1018` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`bc8a3620`) pada `codex/portal-security-pentest`.

---

## 139. Audit Penyelarasan Akhir `/ponytail-review` & `/security-audit` Modul Kepegawaian: Guard ID Libur PostgreSQL, Pembersihan `EmployeeDates`, & Aktivasi Test `#13–#14` (17 November 2026)

- **Latar Belakang**:
  Audit lanjutan menyeluruh (`/ponytail-review` dan `/security-audit`) terhadap seluruh rute, controller, helper, serta direktori `frontend/src/app/kepegawaian/**` (termasuk pencarian ekspor TypeScript tak terpakai dan rute tanpa constraint numerik).
- **Temuan & Perbaikan Diterapkan (Commit `0aa666f0`)**:
  - **Guard Bilangan Bulat Positif pada `destroyHolidaySetting()` ([`MealAllowanceController.php`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php#L521-L529))**:
    - Rute `DELETE /api/kepegawaian/settings/holidays/{id}` sengaja tidak memakai `->whereNumber('id')` agar ID non-numerik (seperti ID hari libur statis kalender) menerima respons `404` terstruktur. Namun `Holiday::find($id)` langsung melempar nilai non-numerik atau overflow ke PostgreSQL (`kpg_holidays.id` bertipe `bigint`), berisiko memicu `SQLSTATE[22P02]`/`22003` HTTP `500`.
    - Memvalidasi `$id` memakai stdlib PHP `filter_var($id, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])` sebelum memanggil `Holiday::find(...)` sehingga ID non-integer, `0`, maupun overflow dikembalikan sebagai `404` JSON tanpa menyentuh database.
  - **Hapus Tipe Mati (`ponytail-review: delete:`) ([`types.ts`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/surat-tugas/_lib/types.ts#L98-L103))**:
    - Menghapus `export type EmployeeDates = Record<string, EmployeeDateRange>;` (`-2` baris) yang memiliki nol pemanggil di seluruh `frontend/src` maupun `frontend/tests`.
  - **Aktivasi Metode Regresi PHPUnit 11/12 ([`KepegawaianSecurityAuditTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/KepegawaianSecurityAuditTest.php#L575-L616))**:
    - Menemukan bahwa docblock `/** @test */` tanpa prefiks `test_` diabaikan oleh PHPUnit modern sehingga regresi `#13` belum ikut tereksekusi sebelumnya. Mengubah nama menjadi `test_store_batch_rejects_scalar_items_with_422_instead_of_500()` serta menambahkan Test `#14` `test_destroy_holiday_setting_ignores_non_integer_and_overflow_ids_without_sql_query()` (memverifikasi `DB::listen()` = `0` kueri `kpg_holidays` dan HTTP `404` untuk `static-2026-08-17`, `0`, serta `99999999999999999999999`).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `KepegawaianSecurityAuditTest` (**14 tests passed, 98 assertions**); total `15` suite PHPUnit Feature (`14` Kepegawaian + `SixModulesSecurityHardeningTest`) -> **121 tests passed (1058 assertions)**; `php backend/tests/EmployeeLeaveSnapshotCheck.php` -> **PASS**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/kepegawaian` (`0`), `node tests/kepegawaian-ui.cjs` -> **PASS**, `node tests/test-export-transform.cjs` -> **PASS**, `node tests/diktum-capitalization-check.cjs` -> **PASS**, `node tests/st-legacy-items.cjs` -> **PASS**, serta `npm run build` -> **86/86** rute Next.js sukses.
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15495` nodes, `28933` edges, `1021` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`0aa666f0`) pada `codex/portal-security-pentest`.

---

## 140. Audit Penyelarasan `/ponytail-review` & `/security-audit` Modul Portal: Hardening `AuthController` (`ab51da04`) (17 November 2026)

- **Latar Belakang**:
  Penyisiran menyeluruh `/ponytail-review` dan `/security-audit` pada seluruh berkas modul **Portal** backend (`routes/api.php`, `routes/channels.php`, `AuthController.php`, `PortalNotificationController.php`, `PortalNotificationService.php`, `PortalNotification.php`, `NotificationSetting.php`, `AuthenticateQueryToken.php`, `ChangePasswordRequest.php`, `LoginRequest.php`, `PortalNotificationCreated.php`, `UserResource.php`) serta frontend (`frontend/src/app/portal/**`, `AuthSync.tsx`, `echo.ts`, `auth-store.ts`).
- **Temuan & Perbaikan Diterapkan (Commit `ab51da04`)**:
  - **Guard Skalar & Ekstraksi Helper Token Foto BMN (`AuthController.php`)**:
    - `dashboard()` dan `myAssets()` sebelumnya menduplikasi konstruksi `$tokenParam` dan langsung memanggil `urlencode($token)` tanpa memeriksa `is_string($token)`. Pada autentikasi cookie Sanctum tanpa header `Bearer`, query array `?token[]=...` memicu PHP `TypeError` HTTP `500`. Disatukan ke helper [`assetQueryTokenParam()`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/AuthController.php#L956-L961) dengan guard `is_string($token)` (`ponytail: shrink:` sekaligus pencegahan crash).
  - **Guard `current_password` pada `updateProfile()` ([`AuthController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/AuthController.php#L280-L286))**:
    - Menambahkan aturan validasi `'current_password' => ['nullable', 'string']` pada `updateProfile()` sehingga pengiriman `current_password` berbentuk array/non-skalar saat mengubah email ditolak dengan HTTP `422` alih-alih melempar `TypeError` di `Hash::check()`.
  - **Standarisasi Escaping `LIKE ... ESCAPE '!'` & Batas Validasi Email Settings ([`AuthController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/AuthController.php#L341-L361))**:
    - Menyeragamkan escaping wildcard nama pada `myAssets()` ke `str_replace(['!', '%', '_'], ['!!', '!%', '!_'], ...)` dengan klausa eksplisit `ESCAPE '!'` (konsisten lintas SQLite/PostgreSQL), serta memberi batas `'max:100'` pada `settings` dan `settings.*.key` di `updateEmailSettings()`.
  - **Status Frontend Portal & Permukaan Lainnya (`Lean already. Ship.`)**:
    - Pemindaian ekspor/DOM pada `frontend/src/app/portal/**`, `AuthSync.tsx`, `echo.ts`, dan `auth-store.ts` bersih dari sink berbahaya maupun kode duplikat material.
  - **Penambahan Test Regresi**: [`PortalPersonalSecurityTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalPersonalSecurityTest.php#L910-L932) (`test_me_endpoints_reject_non_scalar_profile_password_and_ignore_array_query_token`: memastikan `/api/me/dashboard?token[]=bad` dan `/api/me/assets?token[]=bad` mengembalikan `200 OK` tanpa menyisipkan `&token=`, serta `POST /api/me/update-profile` dengan `current_password` array mengembalikan `422`).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih pada `AuthController.php` dan `PortalPersonalSecurityTest.php`; `11` suite PHPUnit Portal + Security (`BroadcastChannelAuthTest`, `NotificationBmnLifecycleTest`, `NotificationHealthMonitorTest`, `PortalAuthSecurityTest`, `PortalIdentityBoundaryTest`, `PortalPersonalSecurityTest`, `PortalUploadSecurityTest`, `StKepegawaianNotificationQueueTest`, `SuratTugasApprovalAndPortalNotificationTest`, `TwoFactorTest`, `SixModulesSecurityHardeningTest`) -> **154 tests passed (1711 assertions)**. (Catatan pra-eksis di luar perubahan ini: `PortalNotificationLifecycleTest` berjalan `27/28` lulus dengan `1` kegagalan pra-eksis `test_kn_02` karena perubahan perilaku penghapusan notifikasi cuti di commit `179dab5c`, serta `tests/portal_security_check.php` berhenti di invariant string lama baris `677` pasca-upgrade `ESCAPE '!'` di `EmployeeController::select()` sejak Bagian 134.)
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/portal src/components/AuthSync.tsx src/lib/echo.ts src/lib/auth-store.ts` (`0` error, `4` warning `@next/next/no-img-element` bawaan di `SmartPatrolInlineForm.tsx`/`SmartPatrolPrint.tsx`), `node tests/portal-review-check.cjs` (**PASS**), dan `npm run test:security-cache` (**8/8 passed**).
  - Knowledge Graph & Diff: `git diff --check` bersih dan `graphify update .` (`15498` nodes, `28942` edges, `1040` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`ab51da04`) pada `codex/portal-security-pentest`.

---

## 141. Audit Lanjutan `/ponytail-review` & `/security-audit` Modul Portal: `MobileDashboardController` `ESCAPE '!'` & Stabilisasi Reverb `NotificationBell` (18 November 2026)

- **Latar Belakang**:
  Penyisiran menyeluruh atas berkas Portal tersisa yang belum dibaca baris demi baris pada putaran sebelumnya (`MobileDashboardController.php`, `NotificationBell.tsx` bagian listener/history, `ActiveLoansTab.tsx`, `PortalProfileSidebar.tsx`, `SecurityModals.tsx`, `EmailConnectDialog.tsx`, `PortalHeaderBanner.tsx`, `PortalInfoSidebar.tsx`, `ReportFormShared.tsx`, `api.ts`, `auth-store.ts`, `useAuth.ts`, serta middleware `EnsureAccountSecure`, `CheckModuleAccess`, dan `CheckRole`).
- **Temuan & Perbaikan Diterapkan (Commit `2e64d2a8`)**:
  - **Standarisasi `LIKE ... ESCAPE '!'` pada [`MobileDashboardController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/MobileDashboardController.php#L52-L67)**:
    - `index()` masih menggunakan `addcslashes(mb_strtolower($fullName), '%_')` dengan `LOWER(pengguna) LIKE ?` / `LOWER(nama_pengguna) LIKE ?` tanpa klausa `ESCAPE`. Disamakan ke `str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($fullName))` dengan `LIKE ? ESCAPE '!'` agar konsisten dengan `AuthController::myAssets()` lintas SQLite dan PostgreSQL.
  - **Hapus Dependensi Efek Tak Terpakai di [`NotificationBell.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/NotificationBell.tsx#L475-L482)**:
    - Efek langganan channel privat Laravel Reverb tidak menggunakan `onSelectTab` secara langsung (event handler `handleCreated` memakai `itemClickHandlerRef.current`), namun memasukkan `onSelectTab` di array dependensi memicu leave/re-subscribe WebSocket yang tidak perlu saat callback induk berubah ketika data dashboard terhidrasi. Menghapus `onSelectTab` dari array dependensi (`[authEpoch, fetchLatest, fetchHistory]`).
  - **Permukaan Lain (`Lean already. Ship.`)**:
    - Seluruh middleware akses/2FA (`EnsureAccountSecure`, `CheckModuleAccess`, `CheckRole`), `api.ts`, `auth-store.ts`, `SecurityModals.tsx`, `EmailConnectDialog.tsx`, `ActiveLoansTab.tsx`, `PortalProfileSidebar.tsx`, dan formulir laporan Portal bersih dari kerentanan maupun bloat baru.
  - **Penambahan Test Regresi**: [`PortalPersonalSecurityTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalPersonalSecurityTest.php#L934-L950) (`test_mobile_dashboard_escapes_like_wildcards_for_unassigned_assets`: memastikan karakter `%` dan `_` pada `nama_lengkap` pegawai tidak menmatched aset tak bertuan lewat wildcard SQL pada `GET /api/mobile/dashboard`).
- **Verifikasi Pasca-Edit Akhir**:
  - Backend: `php -l` bersih; `11` suite PHPUnit Portal + Security (`BroadcastChannelAuthTest`, `NotificationBmnLifecycleTest`, `NotificationHealthMonitorTest`, `PortalAuthSecurityTest`, `PortalIdentityBoundaryTest`, `PortalPersonalSecurityTest`, `PortalUploadSecurityTest`, `StKepegawaianNotificationQueueTest`, `SuratTugasApprovalAndPortalNotificationTest`, `TwoFactorTest`, `SixModulesSecurityHardeningTest`) -> **155 tests passed (1713 assertions)**.
  - Frontend: `npx tsc --noEmit` (`0`), `npx eslint src/app/portal src/components/AuthSync.tsx src/lib/echo.ts src/lib/auth-store.ts` (`0` error, `4` warning bawaan `@next/next/no-img-element` di `SmartPatrolInlineForm.tsx`/`SmartPatrolPrint.tsx`), `node tests/portal-review-check.cjs` (**PASS**), `npm run test:security-cache` (**8/8 passed**), dan `npm run build` (**86/86** rute Next.js).
  - Knowledge Graph & Diff: `git diff --check -- backend frontend` bersih dan `graphify update .` (`15500` nodes, `28946` edges, `1043` communities).
- **Status**: ✅ Selesai Dikerjakan, Diverifikasi, & Di-commit Lokal (`2e64d2a8`) pada `codex/portal-security-pentest`.

---

## 142. Verifikasi Kesiapan Produksi Next.js `16.4.6` & Persiapan PR `codex/portal-security-pentest` → `production-server` (18 November 2026)

- **Audit Keamanan & Kesiapan Server Produksi Next.js `16.4.6`**:
  - **Runtime & Build Standalone**: [`frontend/node_modules/next/package.json`](file:///e:/bksda-superapp/frontend/node_modules/next/package.json#L137-L139) mensyaratkan `node >= 20.9.0`, cocok dengan [`frontend/Dockerfile`](file:///e:/bksda-superapp/frontend/Dockerfile#L2-L47) (`FROM node:22-alpine AS builder` & `runner`, Chromium terpasang untuk route PDF [`/surat/export-pdf`](file:///e:/bksda-superapp/frontend/src/app/surat/export-pdf/route.ts), dan `output: "standalone"` + `serverExternalPackages: ["playwright-core"]` di [`next.config.ts`](file:///e:/bksda-superapp/frontend/next.config.ts#L20-L30)).
  - **Smoke-Test Standalone Production Server (`next@16.4.6`)**: Menjalankan langsung `node server.js` dari `.next/standalone` dengan `NODE_ENV=production` mengembalikan HTTP `200` pada `/login` (`23885B`) dan `/portal` (`16711B`) tanpa stderr error, serta `npm run build` membuild bersih `86/86` rute dan `proxy.ts` (`ƒ Proxy (Middleware)`).
  - **Pinning Deterministik Docker Build Produksi (Commit `e6c789d4`)**:
    - [`frontend/package.json`](file:///e:/bksda-superapp/frontend/package.json#L31-L55) dan [`frontend/package-lock.json`](file:///e:/bksda-superapp/frontend/package-lock.json#L10-L55) sebelumnya masih menulis `"react": "latest"`, `"react-dom": "latest"`, dan `"eslint-config-next": "latest"`, sementara [`frontend/Dockerfile`](file:///e:/bksda-superapp/frontend/Dockerfile#L6) menjalankan `RUN npm install`.
    - Kini ketiganya di-pin eksplisit ke versi lockfile yang telah teruji (`"react": "18.3.1"`, `"react-dom": "18.3.1"`, `"eslint-config-next": "16.2.4"`) dan `frontend/Dockerfile` diubah ke **`RUN npm ci`**, sehingga build Docker di server produksi dijamin 100% deterministik sesuai `package-lock.json` (`npm ci --dry-run` & `npm run build` `86/86` lulus).
- **Status**: ✅ Selesai Di-pin, Diverifikasi (`e6c789d4`), & Di-merge ke `production-server` via [PR #604](https://github.com/tegaranugrah1/bksda-superapp/pull/604) (`5049ed93`).

---

## 143. Investigasi & Pemulihan `502 Bad Gateway` Pasca-Deploy PR #604 (`production-server` / `bksdakaltim.web.id`) (18 November 2026)

- **Gejala & Temuan Akar Masalah (`192.168.100.203`)**:
  - Setelah PR #604 (`5049ed93`) di-merge dan di-deploy di Dokploy, web `https://bksdakaltim.web.id` sempat tidak bisa membaca data database.
  - Pemeriksaan container & log langsung di server produksi memastikan **database dan migrasi 100% aman**: seluruh 5 migrasi baru (`2026_11_13` s.d. `2026_11_16`) berstatus `DONE` dan data PostgreSQL `bksda_superapp` utuh (`152` `users`, `152` `kpg_employees`, `1.633` `bmn_assets`, `26` `bmn_locations`, `605` `surat_masuk`, `6` `surat_keluar`).
  - Akar masalahnya adalah **stale Docker DNS cache di container `nginx-backend`**: ketika Dokploy membangun ulang dan me-recreate container `backend` (`172.19.0.4:9000`) serta `reverb` (`172.19.0.5:8080`), container `nginx-backend` tetap berjalan (`Up 37 hours`) dengan resolve statis IP lama (`172.19.0.3:9000` dan `172.19.0.6:8080`), sehingga log error Nginx mencatat `connect() failed (111: Connection refused)` (`502 Bad Gateway`) pada semua request `/api/*` dan `/app/*`.
- **Perbaikan Permanen & Pemulihan Produksi**:
  - [`deploy/nginx-backend.conf`](file:///e:/bksda-superapp/deploy/nginx-backend.conf): Menambahkan `resolver 127.0.0.11 valid=10s ipv6=off;` serta variabel upstream dinamis (`set $reverb_upstream http://reverb:8080;` pada `location /app` dan `set $backend_upstream backend:9000;` pada `location ~ \.php$`) agar Nginx otomatis me-resolve ulang IP container setiap 10 detik tanpa manual reload/restart pasca-redeploy.
  - [`backend/config/cors.php`](file:///e:/bksda-superapp/backend/config/cors.php#L18-L21) & [`backend/config/sanctum.php`](file:///e:/bksda-superapp/backend/config/sanctum.php#L8): Menambahkan domain `bksdakaltim.web.id`, `www.bksdakaltim.web.id`, dan `api.bksdakaltim.web.id` ke fallback default `allowed_origins`, `allowed_origins_patterns`, serta `$defaultDomains` agar konfigurasi tetap selaras meski `.env` server belum meng-override.
- **Verifikasi Pasca-Perbaikan**:
  - **Server Produksi (`192.168.100.203`)**: `nginx -t` sukses, `nginx -s reload` memuat konfigurasi baru, `wget -qO- http://127.0.0.1/api/health` melalui `nginx-backend` mengembalikan `200`, dan smoke-test endpoint backend terautentikasi mengembalikan `HTTP 200` pada `/api/health`, `/api/user`, `/api/me/dashboard`, `/api/locations?active_only=1`, `/api/bmn/assets?page=1&per_page=5`, dan `/api/kepegawaian/employees?per_page=5` (serta log `laravel.log` bersih tanpa error).
  - **Lokal (`php -l` & PHPUnit)**: `php -l` bersih untuk `cors.php` & `sanctum.php`; `PortalAuthSecurityTest` + `SixModulesSecurityHardeningTest` → **27/27 passed (540 assertions)**.
- **Status**: ✅ Server Live Sudah Pulih & Diverifikasi (`HTTP 200`), siap commit/push/PR perbaikan permanen ke `production-server`.

---

## 144. Aplikasi Mobile Portal: Integrasi Real-Time Laravel Reverb WebSocket & Penerapan 5 Design Tokens Beranda (`996d9ba8`, `f8b1e903`) (18 November 2026)

- **Migrasi Polling ke Real-Time Laravel Reverb WebSocket (`996d9ba8`)**:
  - Menambahkan klien WebSocket Reverb di [`mobile/src/lib/reverb.ts`](file:///e:/bksda-superapp/mobile/src/lib/reverb.ts) dan hook [`mobile/src/hooks/useReverbRefresh.ts`](file:///e:/bksda-superapp/mobile/src/hooks/useReverbRefresh.ts) untuk menggantikan timer polling di layar Portal & Kepegawaian (`PortalDashboardScreen.tsx`, `useMobileDashboard.ts`, `InboxSuratTugasScreen.tsx`, `KepegawaianDashboardScreen.tsx`, `RiwayatSuratTugasScreen.tsx`, `InboxSuratCutiScreen.tsx`), dilengkapi `mobile/.env.example` dan unit test [`reverb.test.tsx`](file:///e:/bksda-superapp/mobile/src/lib/__tests__/reverb.test.tsx).
  - Memasang guard 404 `/me/leave-balance` serta guard sesi pada [`AuthProvider.tsx`](file:///e:/bksda-superapp/mobile/src/features/auth/AuthProvider.tsx) untuk akun tanpa data pegawai/MMP.
- **Penerapan 5 Design Tokens & Redesign Beranda Mobile Selaras Web Portal (`f8b1e903`)**:
  - [`mobile/src/theme/ThemeContext.tsx`](file:///e:/bksda-superapp/mobile/src/theme/ThemeContext.tsx): Menambahkan `PORTAL_5_TOKENS` (`space` kelipatan 4px `[4, 8, 12, 16, 24, 32, 48]`, `type` `[12, 14, 20, 24]`, `radius` konsentris `{ inner: 8, segment: 12, card: 24, pill: 9999, bar: 4 }`, 2 level shadow `shadow.xs`/`shadow.lg`) serta menyelaraskan 35 role warna `lightColors` & `darkColors` dengan `[data-module="portal"]` (`#1e5433`/`#86efac`, `#f8fafc`/`#09090b`, `#ffffff`/`#18181b`) tanpa memutus key lama `ThemeColors` untuk screen lain.
  - [`mobile/src/features/dashboard/PortalDashboardScreen.tsx`](file:///e:/bksda-superapp/mobile/src/features/dashboard/PortalDashboardScreen.tsx):
    - **Card 1 — Hero Banner Forest Green (`#1e5433`)**: menampilkan tanggal dinamis (`getLiveGreeting()` & `formatTodayIndo()`) dan pill `NIP` dengan garis pemisah bawah sebelum sapaan + narasi resmi BKSDA Kalimantan Timur (tanpa tombol CTA di dalam hero).
    - **Grid 2×2 Quick Stats**: `Pangkat / Gol.` (`resolvedPangkat` dari `rank`, fallback `"-"` jika login tanpa data ASN), `Sisa Cuti` (tap → sub-layar cuti), `Surat Tugas` (`ST Aktif`, tap → tab tugas), dan `Aset Saya` (`Barang`, tap → sub-layar BMN).
    - **Card 2 — `MODUL AKSES SYSTEM` Container Card**: 8 tile modul (`4×2`) beradius konsentris `R.inner: 8` (`24 = 16 + 8`) dan maksimal 3 keluarga warna (`accent | info | warning`) di dalam satu card putih/zinc dengan pill Emerald `{accessibleModules.length} Modul Terotorisasi`.
    - **Card 3 — `TUGAS DINAS BERJALAN` Card & Card 4 Kondisional (`Aset Dipinjam`)**: 1 card penugasan dinas berjalan teratas (tap → `PratinjauSuratTugasModal`) ditambah card `Aset Dipinjam` di bawahnya bila `homeBorrowedLoans` memiliki pinjaman aktif dari `/me/dashboard` (atau fallback offline).
    - **Tipografi Ringkas Bergaya Web**: Beranda memakai `T.xs` (`12`) dan `T.sm` (`14`) dengan `22` `tabular-nums`, bobot `"400"`–`"700"` (tanpa `"800"`), `PORTAL_FONT_FAMILY` (`Inter` pada Web + `webkitFontSmoothing: "antialiased"`), serta header section `uppercase` muted bergaya Web Portal.
- **Verifikasi Pasca-Edit Akhir (`f8b1e903`)**:
  - Node 5-token audit (`BERANDA_5_TOKEN_CHECK_PASSED`: `styleKeysCount: 218`, `unused: []`, `berandaFontSizes: ['T.sm', 'T.xs']`, `berandaWeights: ['400', '500', '600', '700']`, `radii: ['R.pill', 'R.card', 'R.inner', 'R.segment', 'R.bar']`, spacing numerik kelipatan 4, 0 inline font/radius/shadow di JSX, `tabularNums: 22`).
  - `npm run typecheck` (`tsc --noEmit`): exit `0`; `npx eslint src/theme/ThemeContext.tsx src/features/dashboard/PortalDashboardScreen.tsx`: exit `0`; Targeted Jest (`AuthProvider.test.tsx`, `App.test.tsx`, `useMobileDashboard.test.tsx`, `reverb.test.tsx`, `AssignmentFormScreen.test.tsx`, `AppTabs.test.tsx`): **6 suites / 17 tests passed** (`AppTabs.test.tsx` me-mock `DashboardScreen`, belum ada test render khusus `PortalDashboardScreen.tsx`, full `mobile` Jest suite tidak dijalankan ulang); `git diff --check -- mobile`: exit `0`; `graphify update .`: exit `0` (`15541` nodes, `29078` edges, `1045` communities).
- **Status**: ✅ Ter-commit di branch `codex/portal-security-pentest` (`996d9ba8`, `f8b1e903`).

---

## 145. Aplikasi Mobile Portal: Pinjaman Aktif Beranda, Tugas, BMN Grid/List, Riwayat Cuti, & Formulir Pengajuan Cuti (`2b7a2263`, `3c80c7d9`, `3b135c91`) (18 November 2026)

- **Beranda Mobile — Card Kondisional Pinjaman Aktif (`2b7a2263`)**:
  - [`mobile/src/features/dashboard/PortalDashboardScreen.tsx`](file:///e:/bksda-superapp/mobile/src/features/dashboard/PortalDashboardScreen.tsx): Card `Pinjaman Aktif` ditampilkan di bawah `Tugas Dinas Berjalan` saat terdapat pinjaman operasional berjalan (disertai fallback pratinjau agar tetap terlihat ketika API kosong dan tautan langsung ke sub-layar BMN tab `Pinjaman Berjalan`).
- **Halaman Tugas, Inventaris BMN Saya (Grid Default + List), & Riwayat Pengajuan Cuti (`3c80c7d9`)**:
  - **Tab Tugas (`activeTab === "surattugas"`)**: Kartu diselaraskan dengan kartu `Tugas Dinas Berjalan` pada Beranda (pill status, nomor surat, judul, tanggal & lokasi, serta footer aksi pratinjau dokumen BKN) beserta hitungan tab filter dinamis.
  - **Inventaris BMN Saya (`layananSubScreen === "bmn"`, Aset Tetap & Pinjaman Berjalan)**:
    - Default mode **Grid 2 kolom** + tombol toggle ke **List** (`bmnViewMode`), resolusi URL foto relatif via `resolveMobilePhotoUrl()`/`getPrimaryAssetPhoto()`, fallback placeholder `Belum ada foto`, serta filter kategori dinamis (`matchesAssetCategory()` mengenali `"angkutan"` / `ALAT ANGKUTAN BERMOTOR`).
    - Selaras portal web `/bmn/assets`: label `TANGGUNG JAWAB` dihilangkan dari kartu **Aset Tetap**, header kartu menampilkan **Nama Barang** diikuti **Merk / Tipe** ter-deduplikasi (`formatAssetMerkTipe()`), dan blok **Jenis** & **Lokasi** dikunci di `bmnGridBottom` bersama footer agar rata bawah walau `Nama Barang` hanya 1 baris.
    - [`backend/app/Http/Controllers/Api/AuthController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/AuthController.php#L363-L369): Menambahkan kolom `lokasi_ruang` dan `lokasi_spesifik` ke `select([...])` pada `GET /api/me/assets`.
  - **Riwayat Pengajuan Cuti (`layananSubScreen === "cuti"` & Modal Riwayat Beranda)**:
    - Hero kuota merah-putih/hijau hutan diperbarui dengan strip 3 metrik frosted (`Hak Tahun N`, `Sisa N-1` / `N-2`, `Terpakai` + catatan hari dalam pengajuan) serta filter tahun dinamis.
    - Tombol aksi & status mengikuti [`MyLeaveTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/MyLeaveTab.tsx): status **`PENGAJUAN`** / **`VERIFIKASI ATASAN`** menampilkan **`Batalkan`** *(dengan modal konfirmasi `DELETE /me/leave-requests/{id}`)* dan **`Cetak Formulir Cuti`**; status **`DISETUJUI`** menggantinya dengan **`Surat Izin (Fisik/TTE)`** + **`Formulir Scan`** beserta modal pratinjau scan (`?preview=1`, Web `<iframe />`/gambar + Native `FileSystem`/`openFile`, maupun mode disabled bila belum diunggah admin); status **`DITOLAK`** menyembunyikan tombol aksi.
- **Formulir Pengajuan Cuti (`3b135c91`)**:
  - [`mobile/src/features/dashboard/FormulirCutiModal.tsx`](file:///e:/bksda-superapp/mobile/src/features/dashboard/FormulirCutiModal.tsx): Mengganti chip jenis cuti menjadi **dropdown** di atas floating `dropdownOverlay` (`StyleSheet.absoluteFill` agar tinggi sheet modal tetap konstan saat dibuka), mengganti input tanggal manual dengan [`AppDatePickerModal`](file:///e:/bksda-superapp/mobile/src/components/AppDatePickerModal.tsx) (`activeDateField`), menerapkan **5 Design Tokens** (`useTheme()` & `PORTAL_5_TOKENS`), menambahkan banner **`Sisa Hak Cuti Tahunan`** (*PerBKN 24/2017*), serta penghitung otomatis **`Lamanya Cuti (Hari Kerja / Hari Kalender)`** (`calcLeaveDurationDays()`) lengkap dengan guard lintas-tahun dan sisa kuota.
  - Penambahan unit test [`mobile/src/features/dashboard/__tests__/FormulirCutiModal.test.ts`](file:///e:/bksda-superapp/mobile/src/features/dashboard/__tests__/FormulirCutiModal.test.ts).
- **Verifikasi Pasca-Edit Akhir (`3b135c91`)**:
  - Node audit (`FORMULIR_CUTI_AUDIT_OK`): `styleKeysCount: 44`, `unusedCount: 0`, `usesExistingDatePicker: true`, `usesFloatingDropdownOverlay: true`, `hasSisaHakBanner: true`, `hasLamanyaCutiIndicator: true`, `uses5TokensTheme: true`.
  - Mobile: `npm run typecheck` (`tsc --noEmit`) exit `0`; `npx eslint src/features/dashboard/FormulirCutiModal.tsx src/features/dashboard/PortalDashboardScreen.tsx src/features/dashboard/__tests__/FormulirCutiModal.test.ts` exit `0`; Targeted Jest (`FormulirCutiModal.test.ts`, `AuthProvider.test.tsx`, `useMobileDashboard.test.tsx`, `AssignmentFormScreen.test.tsx`, `reverb.test.tsx`, `App.test.tsx`, `AppTabs.test.tsx`) → **7 suites / 18 tests passed**; `git diff --check -- mobile` exit `0`.
  - Backend (pasca-edit `AuthController.php`): `php -l` bersih; `PortalPersonalSecurityTest` (`personal_asset_list` & `asset_list_cannot_overwrite`) lulus (`2/2` tests, `8` assertions).
  - Knowledge Graph: `graphify update .` exit `0` (`15551` nodes, `29106` edges, `1051` communities).
- **Status**: ✅ Ter-commit lokal di branch `codex/portal-security-pentest` (`2b7a2263`, `3c80c7d9`, `3b135c91`).

---

## 146. Pemulihan Produksi Realtime & Sesi (`d0cdc666`, `9c3e7b19`) serta Penyempurnaan Portal Web & Mobile (`81321f24`, `d0f7e082`, `cb70ecf8`) (18 November 2026)

- **Auth, Realtime Portal & Konfigurasi Produksi (`d0cdc666`, `9c3e7b19`)**:
  - [`backend/app/Http/Controllers/Api/AuthController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/AuthController.php), [`frontend/src/lib/echo.ts`](file:///e:/bksda-superapp/frontend/src/lib/echo.ts), [`frontend/src/components/AuthSync.tsx`](file:///e:/bksda-superapp/frontend/src/components/AuthSync.tsx), [`frontend/src/lib/auth-store.ts`](file:///e:/bksda-superapp/frontend/src/lib/auth-store.ts), [`frontend/src/app/portal/page.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/page.tsx): Pemulihan broadcast token `/api/broadcasting/auth`, sinkronisasi live modul portal (`GET /api/user?sync_realtime_token=1`), serta update CSP Cloudflare Insights pada [`frontend/next.config.ts`](file:///e:/bksda-superapp/frontend/next.config.ts) dan `loading="eager"` avatar [`PortalProfileSidebar.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/PortalProfileSidebar.tsx) (+ [`PortalIdentityBoundaryTest.php`](file:///e:/bksda-superapp/backend/tests/Feature/PortalIdentityBoundaryTest.php)).
  - [`backend/config/cors.php`](file:///e:/bksda-superapp/backend/config/cors.php), [`backend/config/sanctum.php`](file:///e:/bksda-superapp/backend/config/sanctum.php), [`deploy/nginx-backend.conf`](file:///e:/bksda-superapp/deploy/nginx-backend.conf), [`docker-compose.dokploy.yml`](file:///e:/bksda-superapp/docker-compose.dokploy.yml): Default `SESSION_DOMAIN=.bksdakaltim.web.id` serta penyesuaian CORS/Sanctum/DNS resolver nginx produksi.
- **Ringkasan Surat Tugas, Lokasi, Sumber Dana & Toast Pegawai (`d0f7e082`)**:
  - [`frontend/src/lib/letter-utils.ts`](file:///e:/bksda-superapp/frontend/src/lib/letter-utils.ts), [`frontend/src/app/portal/_components/SuratTugasTab.tsx`](file:///e:/bksda-superapp/frontend/src/app/portal/_components/SuratTugasTab.tsx), [`mobile/src/features/dashboard/PortalDashboardScreen.tsx`](file:///e:/bksda-superapp/mobile/src/features/dashboard/PortalDashboardScreen.tsx): Ekstraksi frasa inti `dalam rangka` (memangkas narasi panjang, durasi, dan lokasi buntut), menampilkan lokasi `Di {tempat_tujuan}` & sumber dana terpilih di Portal Web dan Mobile, disertai test [`frontend/tests/surat-tugas-summary.cjs`](file:///e:/bksda-superapp/frontend/tests/surat-tugas-summary.cjs).
  - [`backend/app/Http/Controllers/AssignmentLetterController.php`](file:///e:/bksda-superapp/backend/app/Http/Controllers/AssignmentLetterController.php): Mempersingkat isi toast/notifikasi Surat Tugas ke pegawai menjadi ringkasan inti kegiatan.
- **Penyelarasan Spacing, Merk/Tipe Pinjaman Aktif & Penghapusan Dot Status Pill (`81321f24`, `cb70ecf8`)**:
  - [`mobile/src/features/dashboard/PortalDashboardScreen.tsx`](file:///e:/bksda-superapp/mobile/src/features/dashboard/PortalDashboardScreen.tsx): Menyamakan jarak antar-card Beranda & Profil dengan tab Surat Tugas, memindahkan **Merk / Tipe** tepat di bawah **Nama Barang** pada kartu Beranda & modal `Detail Pinjaman`, serta menghapus prefix titik (`"● "`) pada label status pill (`SEDANG DINAS`, `PENUGASAN`, `TERLAMBAT`, `DIPINJAM`, `SELESAI & LAPOR`) — lolos `npm run typecheck` & `npx eslint` (`MOBILE_ESLINT_EXIT:0`).
- **Status**: ✅ Ter-commit di branch `codex/portal-security-pentest` (`d0cdc666`, `9c3e7b19`, `81321f24`, `d0f7e082`, `cb70ecf8`).

---

## 147. Mobile Portal Responsif & Pemulihan Bundel Expo HTTP 500 (18 November 2026) — Selesai di Working Tree

- **Akar masalah**: Metro mengembalikan JSON `TransformError` karena `View` pembungkus konten di `PortalDashboardScreen.tsx` belum ditutup. Setelah parser diperbaiki, pemanggilan `buildResponsivePortalStyles()` yang belum tersedia juga perlu diselesaikan.
- **Implementasi**:
  - Helper `getResponsivePortalMetrics()`, `chunkGridRows()`, dan `usePortalResponsive()` di `mobile/src/theme/ThemeContext.tsx` mengikuti perubahan ukuran window.
  - Satu factory `createPortalStyles()` memakai token responsif untuk seluruh tab dan sheet; factory `createLeaveStyles()` menerapkannya ke `FormulirCutiModal.tsx`. Tidak ada lapisan override style duplikat.
  - Grid modul menggunakan baris fleksibel, `flex: 1` dan `minWidth: 0`, sehingga baris parsial tetap memenuhi lebar container. Grid BMN dan quick stats menyesuaikan kolom; tablet membatasi lebar konten.
  - Tanggal dan NIP ditata vertikal pada layar compact agar tanggal utuh. Ukuran ikon, padding, radius, preview dokumen, dan ruang bawah navigasi ikut menyesuaikan window; tombol header/tutup minimum 48.
- **Verifikasi**:
  - Bundle Web di URL yang dilaporkan: HTTP 200, `application/javascript; charset=UTF-8`.
  - `npm run typecheck` lulus; tes terkait: 4 suite, 14 tes lulus. Tes navigasi lama diperbarui agar sesuai rute `KepegawaianMain` yang sudah dipakai aplikasi.
  - Browser Playwright/Edge, data API uji terisolasi: Beranda pada 360×800, 440×956, landscape 800×360; baris grid 1/3/5 modul mengisi container; Tugas, BMN, Profil dan Formulir Cuti terbuka tanpa error JavaScript.
  - Screenshot dan skrip pemeriksaan tersimpan di `scratch/mobile-responsive/` serta `scratch/check-mobile-responsive.cjs` (diabaikan Git). Pemeriksaan browser tidak menggantikan uji perangkat Android fisik.
- **Status**: Selesai di working tree, belum commit/push; typecheck, ESLint tanpa warning dan tes terkait lulus; sinkronisasi graph selesai.


## 148. Sinkronisasi IAM Mobile Tanpa Refresh dan Pemulihan Sesi `/me` (18 November 2026)

- **Akar masalah**: `EmployeeAccessController` mencabut seluruh bearer token ketika modul/role/permission berubah, sehingga reload mobile memanggil `/me` dengan token yang sudah dicabut (401). Portal Web mempunyai cookie sesi dan mekanisme sync sendiri. Mobile belum menyegarkan profil `AuthProvider` saat IAM berubah.
- **Backend**: perubahan IAM biasa kini mempertahankan token Sanctum; middleware tetap membaca hak akses terbaru pada setiap request. Password reset dan deaktivasi tetap mencabut token. `UserAccessChanged` dipancarkan setelah commit pada perubahan atribut IAM melalui hook `User::updated`, menuju channel privat pemilik dan token aktif saja, dengan payload ID pengguna untuk refetch REST terautentikasi.
- **Mobile**: `AuthProvider` berlangganan `access.updated`, menyegarkan `/me` saat event/reconnect/foreground, dan memakai fallback 30 detik hanya ketika app aktif. Refresh dideduplikasi dan respons sesi lama tidak boleh memulihkan profil setelah logout. Sesi yang ditolak 401 mengosongkan state auth.
- **Verifikasi**: simulasi browser Edge dengan REST/WebSocket fixture mengubah 3→2 modul tanpa reload, lalu reload tetap masuk dan tetap 2 modul; permintaan API divalidasi memakai bearer yang sama. Tes auth/Reverb/API mobile: 3 suite, 16 tes lulus, termasuk remount, fallback saat event terlewat, 401 dan respons refresh setelah logout. Tes lifecycle IAM backend: 5 tes/34 assertion lulus, termasuk modul tercabut langsung 403 dengan token yang tetap valid serta password reset tetap mencabut token. Regresi lifecycle + identity boundary: 32 tes/258 assertion lulus. Typecheck dan ESLint mobile tanpa warning; Pint backend lulus; diff kode/dokumentasi bersih.
- **Catatan sesi lama**: token yang sudah dicabut sebelum perbaikan tidak diaktifkan kembali; pengguna yang sudah keluar perlu login sekali untuk mendapatkan sesi baru. Tidak ada perubahan data atau hak akses akun pengguna nyata selama pengujian.


## 149. Penyelarasan Login Web dan Mobile (18 November 2026)

- Header login memakai satu logo Kemenhut, berukuran 48 px seperti login web semula, di samping `Kementerian Kehutanan` dan `Balai KSDA Kalimantan Timur`. Teks `BKSDA KALTIM` / `SuperApp Portal` dihapus dari kedua halaman login sesuai arahan terbaru.
- Ukuran teks identitas web diperbesar menjadi 16/14 px pada desktop (14/14 px pada layar kecil); footer menjadi 12 px agar lebih terbaca.
- Mobile memakai salinan aset logo resmi yang sama (`mobile/assets/kemenhutlogo.png`) dan susunan horizontal yang serupa. Border hijau, radius dan komponen `GlassCard` login tetap dipertahankan; judul dan tombol mengikuti copy login web.
- Footer web dan mobile: `© {tahun berjalan} Balai KSDA Kalimantan Timur`, diikuti `Kementerian Kehutanan Republik Indonesia`.
- Bukti browser Edge, sebelum/sesudah pada web 1440×1000 & 360×800 serta mobile preview 360×800 & 440×956: `scratch/login-branding/`; skrip `scratch/check-login-branding.cjs`. Tidak ada error JavaScript pada pemeriksaan render.
- Typecheck dan ESLint web/mobile telah lulus pada penyesuaian login; lima tes login mobile lulus. Alur autentikasi tidak diubah oleh perapian halaman login.


## 150. Login Web/Mobile Berlatar Foto, Glassmorphism dan Dark Mode (18 November 2026)

- Komposisi mengikuti referensi pengguna: foto Sangalaki yang sudah ada pada login web memenuhi latar. Web desktop menempatkan narasi konservasi di kiri dan kartu login di kanan; viewport kecil menampilkan kartu dalam satu kolom.
- Glassmorphism web menggunakan latar transparan, backdrop blur dan border ringan. Mobile menambah dependency resmi `expo-blur` SDK 56 (`BlurView` + `BlurTargetView`, Android memakai metode SDK 31+ dengan fallback library pada versi lama). Aset foto native disalin dari gambar web ke `mobile/assets/sangalaki.png`.
- Identitas/logo dan footer berada di dalam kartu login pada kedua aplikasi. Logo mobile memakai PNG yang identik dengan web; gambar 48×48 berada di bingkai 66×66 dengan padding, tidak diberi radius pada gambar agar tidak terpotong.
- Dark mode login mobile memakai `ThemeContext` yang sama dengan Portal, melalui tombol 48×48. Warna form, blur, ikon dan border mengikuti tema. Pergantian tema tidak menghapus NIP/password yang sedang diisi; pilihan tema terbawa saat beralih ke Portal dalam sesi aplikasi.
- Teks `Balai KSDA Kalimantan Timur` di mobile diperbesar ke 13 px pada layar compact dan 14 px pada layar lebih lebar. Besarnya disesuaikan dengan judul kementerian agar tidak melewati ujung judul; diperiksa lewat geometri teks pada preview 360/440 px.
- Pemisah footer web yang menempel pada bagian bawah tombol dihapus untuk menghilangkan garis putih. Footer tetap `© {tahun} Balai KSDA Kalimantan Timur` dan `Kementerian Kehutanan Republik Indonesia`.
- Verifikasi: typecheck/ESLint web/mobile lulus; enam tes login mobile lulus, termasuk toggle tema tanpa kehilangan isian. Browser Edge memeriksa web 1440×1000/360×800, mobile preview 360×800/440×956, light/dark, lupa sandi dan transisi 2FA menggunakan fixture REST; tanpa error JavaScript. Bukti `scratch/login-branding/final-checked-*` dan skrip `scratch/check-login-branding.cjs` (ignored). Android fisik belum diuji.


## 151. Motion Mobile Mengikuti Kepegawaian Web dan Transisi Tema (18 November 2026)

- Bottom nav Portal: hapus empat titik aktif beserta style `navActiveDot`. Ikon tetap outline dan bobot label tetap sama; hanya warna yang berubah saat aktif. Badge notifikasi tetap dipertahankan.
- Acuan source web: `frontend/src/app/kepegawaian/layout.tsx` (entrance 160 ms, y=6 px, ease-out) dan `page.tsx` (grafik 600 ms). Istilah Animate UI mengikuti pedoman repo: pola gerak, bukan pemasangan komponen DOM `@animate-ui/react` di React Native.
- Primitive native `mobile/src/components/motion/AnimateUi.tsx` menggunakan Animated bawaan. Konten tetap terlihat pada nilai default dan entrance memakai opacity 0.85→1, translateY 6→0. Dipakai pada tab internal Portal dan scene navigasi modul, Kepegawaian serta BMN tanpa entrance ganda pada navigator bersarang. Grafik satker Kepegawaian memakai scaleX 600 ms dari kiri; label dan nilai data tetap langsung tampil.
- `ThemeContext` memakai View Transitions radial 650 ms pada preview web (`themeTransition.web.ts`, flushSync + clip-path) dan fallback fade 240 ms pada native/browser tanpa dukungan API. Berlaku pada login dan Portal, dengan pusat lingkaran mengikuti tombol tema. Isian form dan state navigasi dipertahankan; animasi dihentikan/restart saat toggling ulang.
- Warning dari log pengguna (`useNativeDriver`/`RCTAnimation`) diperbaiki: native driver hanya dipakai Android/iOS, preview web memakai JS driver. Tidak memerlukan pod install untuk preview Windows/web.
- Reduce Motion: entrance/reveal dilewati dan nilai akhir langsung ditampilkan; transisi tema juga dilewati/dihentikan saat preferensi berubah. Callback async setelah unmount tidak memulai animasi.
- Verifikasi: typecheck dan lint mobile bersih; tiga uji motion lulus. Regresi login/navigasi/dashboard yang relevan juga lulus. Browser Edge dengan REST fixture: mode normal mencatat frame entrance dan tema, mode reduced tidak mencatat frame animasi; tidak ada error JavaScript atau warning native-driver. Bottom nav diuji tanpa titik bawah. Native Kepegawaian dapat dibuka dan dinavigasi. Bukti `scratch/mobile-motion/`, skrip `scratch/check-mobile-motion.cjs`. Perangkat Android fisik belum diuji.

- **Verifikasi khusus preview web `http://localhost:8081/`**: kedua arah tema menghasilkan dua radial View Transitions dengan clip-path, cuplikan tengah animasi diperiksa (`scratch/mobile-motion/theme-to-dark-mid.png`, `theme-to-light-mid.png`). Pada Reduce Motion jumlah transisi nol. `@types/react-dom` ditambahkan sebagai dev dependency untuk `flushSync` yang berasal dari dependency react-dom yang sudah ada. Berkas platform native tidak mengimpor React DOM.


## Pembaruan Sesi 18 November 2026 — Bagian 152 Reverb dan Request Berulang

- Reverb lokal port 8080 membalas handshake `pusher:connection_established`. Log REST bukan bukti realtime tidak dipakai: event memicu refetch snapshot API.
- Client mobile melacak konfirmasi subscription personal. Polling `/me` 30 detik hanya berjalan saat aktif dan subscription belum tersedia/terputus; event akses, reconnect dan foreground tetap menyegarkan profil.
- `useReverbRefresh` bergantung pada nama channel efektif, bukan referensi objek user. Hak admin yang dicabut tetap menghapus subscription terkait. Eligibility cuti memakai boolean stabil agar refresh profil tidak mengulang focus effect dan lima request Portal.
- Verifikasi: typecheck/ESLint bersih, 13 tes auth/Reverb lulus. Browser Edge preview 8081 dengan fixture REST/WebSocket: idle >60 detik tanpa request ulang, akses 3→2 cukup satu `/me`, notifikasi refetch data Portal sekali, subscription tidak tersedia mengaktifkan fallback. Handshake server lokal diuji terpisah tanpa kredensial. Skrip ignored `scratch/check-mobile-reverb.cjs`.
- Belum commit/push; sesi akun pengguna nyata dan perangkat Android fisik tidak dioperasikan.


## Pembaruan Sesi 18 November 2026 — Bagian 153 Lima Token dan Hierarki Portal (Dibatalkan pada Bagian 154)

- Fondasi dark web/mobile memakai arang bernuansa hijau, foreground/secondary/muted yang terpisah dan aksen brand yang lebih lembut. Forest Green, logo resmi serta foto Sangalaki dipertahankan. Glass hanya pada login.
- Portal mempertahankan panel berbingkai untuk Ringkasan Pegawai, Modul Akses System, serta tugas/pinjaman. Heading dan divider memperjelas batas bagian; sapaan diperkecil agar tidak mendominasi. Navigasi modul memakai surface bertingkat dan ikon soft yang tetap berwarna, bukan bingkai dekoratif bertumpuk.
- Web memakai satu workspace dan rail profil/menu; bantuan/pengumuman mengikuti konten dalam workspace. Pada layar sempit workspace muncul dahulu. Identitas kementerian di header desktop tidak lagi terpotong karena alokasi kolom logo diperlebar.
- Sumber warna/type/spacing mobile dipusatkan di `theme/tokens.ts`; ThemeContext dan useAppTheme memakai sumber yang sama. Spacing responsif kelipatan 4, skala 12/14/20/24 tetap, radius mengikuti padding aktual; auto-fit yang mengecilkan teks Portal dihapus. Alias lama masih tersedia agar modul lain tetap bekerja.
- Login kedua platform mempertahankan logo, foto, footer, border mobile, 2FA dan form recovery. Warna dan skala login web memakai role token; ukuran minimum footer mobile 12px.
- Verifikasi fondasi: tes khusus kontras teks/tombol/control, responsif dan regresi terkait 49 tes lulus. Suite mobile penuh: 62 suite/317 tes lulus; 10 assertion gagal pada lima suite lama (label/filter BMN, konfigurasi API dan mock file sharing), tidak berkaitan dengan perubahan susunan panel. Typecheck/lint web/mobile bersih, termasuk pemeriksaan ulang setelah koreksi panel. Android bundle HTTP 200 JavaScript; perangkat fisik belum diuji.
- Browser Edge dengan fixture: light/dark web 360/768/1440/1920, mobile 360/440/landscape 800, modul 1/3/5, form cuti, login/2FA/recovery; tidak ada error JS. Reverb idle >60 detik, akses 3→2 dan fallback tetap lulus. Bukti ignored `scratch/five-tokens/`, `scratch/mobile-responsive/`, `scratch/login-branding/`.
- Panduan `DESIGN.md`, `docs/DESIGN_SYSTEM_5_TOKENS.md` dan `docs/DESIGN_SYSTEM_COLORS.md` diselaraskan. Belum commit/push.


## Pembaruan Sesi 18 November 2026 — Bagian 154 Pembatalan Redesign

- Atas permintaan pengguna, redesign Bagian 153 dibatalkan. Palet light/dark, tipografi/spacing responsif, kartu statistik terpisah, grid modul, susunan tiga kolom Portal web, serta style kartu mobile dikembalikan ke sebelum redesign.
- Login kembali ke glassmorphism Sangalaki sebelumnya, dengan logo Kemenhut dan footer di dalam kartu. Animasi entrance/tema, bottom nav aktif hanya warna, perbaikan bundel/responsif sebelumnya tetap dipertahankan.
- Perbaikan token/sesi IAM dan Reverb Bagian 148/152 tidak dibatalkan. Langganan privat, pembaruan akses dan polling hanya sebagai fallback tetap aktif.
- Pedoman lima token/warna dikembalikan ke versi sebelum redesign; dokumen desain mobile mempertahankan spesifikasi login yang telah disepakati sebelumnya. Tidak mereset seluruh working tree atau pekerjaan lain.
- Typecheck web/mobile, lint login web, dan 30 tes auth/Reverb/login/motion/responsif lulus. Pemeriksaan visual browser diulang untuk login/2FA/recovery, Portal mobile light/dark dan grid modul. Belum commit/push.


## Pembaruan Sesi 18 November 2026 — Bagian 155 Penyesuaian Layout Mobile Terbatas

- Pengguna memperjelas bahwa hanya mobile yang mengambil penyesuaian jarak, ukuran kartu, margin/padding serta penggabungan empat statistik dari redesign sebelumnya. Web tetap pada tampilan sebelum redesign.
- Pangkat/Golongan, Sisa Cuti, Surat Tugas dan Aset Saya kini berada dalam satu panel dengan divider horizontal/vertikal. Tinggi minimum sel 64 px, padding memakai spacing responsif yang sudah ada, dan jarak antarbagian diperlonggar. Font, warna, ikon, modul, banner dan urutan utama tetap versi sebelum redesign.
- Callback navigasi statistik serta perbaikan login/sesi/Reverb/animasi tetap dipertahankan. Checkpoint mencakup Bagian 147–155 dan disimpan lokal; belum di-push.
- Verifikasi akhir: typecheck/lint mobile bersih; browser fixture memeriksa satu panel empat sel, dua baris, tinggi minimum 64 px, layar 360/440/landscape 800 serta navigasi/form cuti tanpa error JS. Diff layout/warna Portal web kosong; 30 tes auth/Reverb/login/motion/responsif dari checkpoint sebelumnya tetap lulus.


## Pembaruan Sesi 18 November 2026 — Bagian 156 Sapaan Referensi dan Judul Ringkasan Mobile

- Menambahkan heading Ringkasan Pegawai ke panel empat statistik yang sudah disepakati. Warna, angka, ikon dan callback navigasi tetap memakai data/komponen yang sama.
- Sapaan mobile mengikuti komposisi referensi pengguna: area Forest Green untuk sapaan/nama/tanggal, dengan kartu identitas inset untuk NIP/username dan jabatan. Kartu identitas membuka tab Profil; tidak menambahkan grafik atau angka ilustratif.
- Ritme jarak dashboard bervariasi melalui token responsif yang sudah ada: setelah sapaan x4, ringkasan x6, modul x4, tugas x3. Tab lain tetap memakai spacing sebelumnya; web tidak diubah.
- Typecheck/ESLint mobile lulus. Browser Edge dengan fixture memeriksa judul, empat sel dalam satu panel, batas identitas inset, navigasi Profil→Beranda, modul 1/3/5, layar 360/440/landscape 800, light/dark serta formulir cuti tanpa error JS. Perangkat fisik belum diuji.
- Checkpoint sebelumnya tetap 22f96daa; perubahan Bagian 156 belum di-commit/push.


## Pembaruan Sesi 18 November 2026 — Bagian 157 Background Dashboard Mobile BKSDA

- Sesuai persetujuan pengguna, background dashboard mobile kini bernuansa BKSDA pada kedua tema: light memakai kanvas hijau sangat muda dengan kartu putih; dark memakai arang kehijauan dengan kartu satu tingkat lebih terang dan border hijau netral.
- Role warna dashboard terpusat pada `DASHBOARD_SURFACES` dan dipilih melalui memo tema/tab. Tema bersama, tab lain, login dan source web tidak diubah. Teks, aksen/status, judul Ringkasan Pegawai dan callback navigasi tetap memakai sumber yang sudah ada.
- Bidang sapaan Forest Green melebar hingga tepi layar pada ponsel dengan sudut bawah membulat; viewport besar tetap memakai kartu terpusat. Variasi jarak antarbagian dari Bagian 156 dipertahankan.
- Kontras numerik pada canvas/card/muted baru: minimum teks light 6,58:1 dan dark 4,99:1; minimum batas kontrol light 3,52:1 dan dark 3,96:1. Bukan sertifikasi aksesibilitas seluruh aplikasi.
- Browser Edge dengan fixture memeriksa nilai warna kedua mode, sapaan full-width pada 360 px, panel empat statistik, navigasi Profil→Beranda, modul 1/3/5 dan form cuti pada 360/440/landscape 800 tanpa error JS. Typecheck/lint mobile dan 14 tes responsif/motion/dashboard/navigasi lulus. E2E tema mencatat 2 transisi radial normal dan 0 saat Reduce Motion, tanpa warning/error; interupsi transisi hanya mengganti tema sekali. Perangkat fisik belum diuji.
- Checkpoint sebelumnya tetap 22f96daa; Bagian 156–157 belum di-commit/push.


## Pembaruan Sesi 18 November 2026 — Bagian 158 Toolbar dan Ritme Dashboard Mobile

- Baris logo/ikon dashboard kini menyatu dengan bidang Forest Green sapaan, tanpa garis pembatas atau celah. Logo resmi ada di kiri; tema/notifikasi/profil di kanan memakai kontrol 48px. Judul aplikasi pada toolbar tetap ada di tab lain.
- Latar area NIP/jabatan memakai canvas dashboard yang sama pada light/dark, bukan permukaan kartu putih/terangkat. Aksi membuka profil dipertahankan. Ikon dekoratif siang/malam pada sapaan dihapus sehingga tombol tema hanya satu, di samping notifikasi.
- Jarak antarpanel utama diselaraskan pada x6; elemen setara dalam grid modul memakai x2, kegiatan terkait x3, dan sapaan→ringkasan x4. Bidang hijau full-width tetap koheren pada landscape/tablet, dengan isi/panel maksimum terpusat.
- Expo StatusBar mengikuti dashboard/tema hanya saat screen fokus, agar ikon sistem terbaca di atas bidang hijau dan tidak menimpa screen modul lain.
- Typecheck/lint mobile bersih. Browser fixture light/dark 360/440/landscape 800 memeriksa sambungan toolbar–sapaan tanpa celah, satu tombol tema, latar NIP sama dengan canvas, ringkasan 4 sel, akses modul realtime, navigasi profil dan formulir cuti tanpa error JS. 14 tes responsif/motion/dashboard/navigasi lulus. E2E normal/reduced mencatat 2/0 transisi radial tanpa error/warning; interupsi transisi mengganti tema tepat sekali. Android bundle HTTP 200 JavaScript; perangkat fisik belum diuji.
- Source web dan palet bersama tetap. Checkpoint lokal sebelumnya 22f96daa; Bagian 156–158 belum di-commit/push.


## Pembaruan Sesi 18 November 2026 — Bagian 159 Bidang Utama Hanya di Atas

- Mengikuti klarifikasi referensi terakhir, warna Forest Green kuat dibatasi pada toolbar logo/ikon. Sapaan tidak lagi menjadi bidang hijau besar; sapaan, NIP/jabatan dan seluruh panel kerja berada di lembar konten lembut dengan sudut atas membulat.
- Light/dark tetap memakai role dashboard Bagian 157. Teks sapaan/tanggal kini memakai foreground biasa agar terbaca pada latar lembut. Panel NIP tetap menyamai canvas, ringkasan berjudul tetap empat sel, dan fungsi/navigasi dipertahankan.
- Scroll content memakai flexGrow agar latar lembut memenuhi layar saat data sedikit; hijau hanya terlihat di toolbar dan belakang sudut atas sheet. Layout layar besar tetap terpusat.
- Typecheck/lint mobile lulus. Browser fixture 360/440/landscape 800 dan light/dark memeriksa toolbar hijau, sheet lembut membulat tepat di bawahnya, warna/posisi konten, satu tombol tema, modul realtime 3→2, grid 1/3/5, navigasi Profil dan form cuti tanpa error JS. Perangkat fisik belum diuji.
- Source web dan tema bersama tidak diubah. Checkpoint sebelumnya 22f96daa; Bagian 156–159 belum di-commit/push.


## Pembaruan Sesi 18 November 2026 — Bagian 160 Identitas Kemenhut dan Kartu NIP Mobile

- Kartu NIP/Username dan jabatan kini memakai surface yang sama dengan ringkasan/panel lain: putih pada light mode dan #1b2820 pada dark mode.
- Header dashboard memakai aset kemenhutlogo.png yang sama dengan login, resizeMode contain, dengan identitas Kementerian Kehutanan dan Balai KSDA Kalimantan Timur. Sesuai tindak lanjut, judul kementerian diperbesar menjadi 14px bold; subtitle 12px dan keduanya sejajar kiri. Pada 360px teks tampil dua baris tanpa terpotong atau menimpa kontrol.
- Tema dan notifikasi tetap di kanan dengan target 48px. Avatar header dashboard yang berulang dihilangkan untuk memberi ruang identitas; profil tetap dapat dibuka melalui kartu NIP dan bottom navigation. Tab lain tetap seperti sebelumnya.
- Typecheck/lint mobile dan 14 tes responsif/motion/dashboard/navigasi lulus. Browser fixture light/dark pada 360/440/landscape 800 memeriksa identitas, tidak ada overlap, warna kartu, modul realtime 3→2, reload tanpa login ulang, navigasi profil dan formulir cuti tanpa error JS. Perangkat fisik belum diuji.
- Checkpoint sebelumnya 22f96daa. Bagian 156–160 disimpan dalam commit lokal penyempurnaan dashboard mobile; belum di-push.


## Pembaruan Sesi 18 November 2026 — Bagian 161 Header dan Background Seragam pada Tab Portal Mobile

- Header Tugas, Layanan dan Profil kini sama dengan Beranda: bidang Forest Green, logo Kemenhut dari login, judul Kementerian Kehutanan 14px dan Balai KSDA Kalimantan Timur 12px. Tema/notifikasi tetap di kanan dengan target sentuh 48px; profil tersedia melalui bottom navigation.
- Keempat tab memakai role PORTAL_SURFACES bersama: canvas light #f1f6f0 dan dark #101813, kartu putih/light dan #1b2820/dark. Sheet konten membulat tepat di bawah header dan memenuhi tinggi layar. Konten, fungsi dan susunan kartu masing-masing tab dipertahankan.
- Pengondisian header/palet khusus Beranda dihapus dari shared shell. Status bar memakai teks terang selama screen portal fokus. Login, tema global dan source web tidak diubah.
- Typecheck, ESLint mobile dan 14 tes responsif/motion/dashboard/navigasi lulus. Browser fixture memeriksa keempat tab pada 360/440/landscape 800, light/dark: identitas penuh tanpa overlap, header hijau, canvas yang sama dan sheet membulat tanpa celah. Navigasi, pembaruan modul realtime 3→2, reload tanpa login ulang dan form cuti berjalan tanpa error JS. Perangkat fisik belum diuji.
- Checkpoint sebelumnya fb945f03; Bagian 161 belum di-commit/push.


## Pembaruan Sesi 19 November 2026 — Bagian 162 Garis Terang pada Sambungan Header Mobile

- Screenshot pengguna menunjukkan garis lurus terang tepat di bawah toolbar hijau, di atas sudut sheet. Sudut membulat tetap dipertahankan sesuai klarifikasi terakhir.
- Penyebab berhasil direproduksi dengan browser deviceScaleFactor 1,25 dan zoom pecahan: background root yang terang terlihat di antara tepi header/scroll yang diraster pada pecahan piksel. Root backing kini memakai Forest Green yang sama dengan header dan viewport scroll; canvas yang terlihat tetap memakai sheet light/dark sebelumnya.
- Perubahan source hanya satu role background dan komentar penjelas; berlaku bersama untuk Beranda, Tugas, Layanan dan Profil. Logo, teks, ukuran, border kartu, padding, animasi dan fungsi tidak diubah.
- Typecheck dan ESLint mobile lulus. Pemeriksaan piksel sebelum/sesudah pada zoom 90%, 100%, 110%, 125% menunjukkan warna di celah kembali #1e5433; sebelumnya warna menyimpang pada zoom 110%/125%. Browser fixture keempat tab pada 360/440/landscape 800 light/dark juga lulus tanpa error JS, dengan sudut sheet tetap membulat dan canvas mengikuti tema.
- Checkpoint sebelumnya fb945f03; Bagian 161–162 disimpan sebagai checkpoint lokal penyamaan header dan perbaikan garis terang; belum di-push. Perangkat fisik belum diuji.


## Pembaruan Sesi 19 November 2026 — Bagian 163 Riwayat Cuti Web dan Mobile

- Redesign terbatas halaman cuti pribadi: nomor surat tampil sebagai teks biasa, catatan persetujuan memakai surface netral, dan tombol dokumen memakai gaya outline yang sama. Label status tetap jelas; warna peringatan/penolakan dipertahankan, sedangkan aksen BKSDA kuat dipusatkan pada aksi pengajuan.
- Web: kartu putih/charcoal dengan border tipis dan tinggi mengikuti isi, header lebih terbaca, jumlah data netral, serta periode bertanggal dalam satu baris kalender. Efek kartu terangkat saat hover dihapus karena kartu bukan tombol.
- Mobile: ringkasan kuota kini berupa satu panel netral dengan tiga nilai dipisahkan divider dan satu tombol Ajukan Cuti beraksen BKSDA. Layout tanggal yang disukai pengguna tetap. Teks Sebagian berkas scan menunggu unggahan admin kepegawaian dihapus; berkas yang belum tersedia tetap disabled. Target tombol dokumen minimum 44px.
- Prefix presentasi SI: dihapus di kedua platform; nomor resmi asli, termasuk kode yang memang merupakan bagian nomornya, tidak dimodifikasi. Handler/filter/status/endpoint tetap.
- Typecheck dan ESLint kedua proyek lulus. Browser fixture memeriksa web 1440/390 dan mobile 360/440 pada light/dark tanpa error JS, label/nomor, filter tahun, form pengajuan, preview scan dan pembatalan. Cetak serta empty state web juga lulus. Seluruh mutasi hanya pada fixture lokal; tidak mengubah data akun nyata. Pasangan teks/aksi yang diperiksa memenuhi 4,5:1. Perangkat fisik belum diuji.
- Checkpoint sebelumnya ed781f16; Bagian 163 disimpan sebagai checkpoint lokal redesign riwayat cuti web/mobile; belum di-push.


## Pembaruan Sesi 19 November 2026 — Bagian 164 Lengkungan Portal Tetap di Luar Scroll

- Pengguna melaporkan garis putih masih tampak pada sesi Chrome akun Tegar setelah Ctrl+Shift+R, sedangkan superadmin bersih. Tidak diasumsikan sebagai masalah cache atau hak akses; source header/palet tidak memiliki cabang per-role.
- Penguatan shared shell: latar dan clipping lengkung kini ditangani View portal-body yang tetap di luar ScrollView transparan. Sudut tidak ikut bergeser ketika isi di-scroll. Pada web, overlap 1px dengan header dan padding kompensasi 1px menutup celah raster tanpa menggeser posisi isi; native tidak memakai overlap.
- Warna light/dark, header Kemenhut, kartu, hak akses, urutan halaman dan fungsi tetap. Fresh fixture Chrome memuat bundle terbaru dengan Cache-Control no-store/no-cache dan tanpa service worker.
- Typecheck/ESLint mobile lulus. Fixture Chrome role super_admin dan pegawai memeriksa 2 tema × 4 tab × 4 zoom (90/100/110/125%) sebelum/sesudah scroll. Pemeriksaan piksel 128 potongan memastikan sisi sambungan tetap Forest Green; warna canvas, posisi lengkung tetap dan overlap juga diperiksa.
- Browser responsif 360/440/landscape 800 light/dark lulus tanpa error JS, termasuk akses modul realtime 3→2, reload sesi, navigasi profil dan formulir cuti. Pemeriksaan header setelah resize menunggu layout responsif selesai agar tidak membandingkan dua frame berbeda.
- Pengguna mengonfirmasi garis putih sudah hilang pada sesi Chrome akun Tegar. Pengujian otomatis memakai fixture terisolasi tanpa mengubah akun/data nyata. Perangkat fisik belum diuji.
- Checkpoint sebelumnya c2e23883; Bagian 164 disimpan sebagai checkpoint lokal perbaikan sambungan lengkung portal mobile; belum di-push.


## Pembaruan Sesi 19 November 2026 — Bagian 165 Pemisahan Aset Tetap dan Pinjaman Mobile

- Menangani laporan akun Tegar: satu aset tetap dan satu pinjaman sebelumnya sama-sama masuk Aset Tetap sehingga berjumlah dua. Endpoint /me/assets memang dapat menyertakan aset yang sedang dipinjam; web sudah mengecualikan ID dari /me/dashboard.my_assets, tetapi mobile belum.
- Mobile kini memisahkan raw assignedAssetsList dan myAssetsList terfilter dengan Set ID aset pinjaman aktif, menormalkan ID number/string. loan_id tidak dipakai sebagai identitas aset. Semua konsumen tetap memakai daftar terfilter yang sama: Ringkasan Pegawai, Layanan, tab Aset Tetap, kategori/pencarian, Profil dan modal daftar aset.
- Menghapus data contoh BMN (aset/pinjaman) pada daftar kosong dan fallback angka ringkasan nonzero. Nol dari data live tetap nol; pinjaman tidak muncul kembali sebagai aset contoh atau kartu Pinjaman Aktif. Fallback surat tugas/cuti di luar scope tidak diubah.
- Regresi browser tersimpan di frontend/tests/mobile-personal-assets.playwright.cjs. Jalankan node frontend/tests/mobile-personal-assets.playwright.cjs dengan Expo web port 8081; seluruh API/realtime diisolasi tanpa mengubah data nyata.
- Verifikasi lulus: kasus 1 tetap + 1 pinjam pada Beranda/Layanan/BMN/Profil; ID number/string dan loan_id yang sengaja berbenturan; kasus 0 tetap + 1 pinjam; pengembalian pinjaman melalui refresh Reverb tanpa login ulang; kedua daftar kosong dengan summary lama nonzero; serta reload sesi. Tidak ada error JS. Typecheck/lint mobile dan lint skrip regresi lulus.
- Backend dan source aplikasi web tidak diubah. Pengujian memakai fixture setara kasus pengguna, bukan perubahan data akun Tegar nyata. Perangkat fisik belum diuji. Checkpoint sebelumnya eddf8003; Bagian 165 belum di-commit/push.


## Pembaruan Sesi 19 November 2026 — Bagian 166 Ikon Jenis dan Lokasi Aset Tetap Mobile

- Pada kartu grid Aset Tetap, label Jenis dan Lokasi diganti ikon cube-outline dan location-outline dari Ionicons yang sudah dipakai aplikasi. Nilai jenis/lokasi tetap ditampilkan langsung dan diratakan kiri agar dekat dengan ikon.
- Deskripsi aksesibilitas tetap menyebut Jenis aset/Lokasi aset dengan nilai lengkap. Tampilan pinjaman, mode list, warna, data dan perhitungan Bagian 165 tidak diubah.
- Typecheck/ESLint mobile lulus. Browser fixture 360/440 light/dark memeriksa label visual hilang, nilai tetap ada, deskripsi aksesibel dan tanpa error JS; hasil render diperiksa. Kasus contoh tetap menunjukkan 1 aset tetap dan 1 pinjaman.
- Checkpoint sebelumnya eddf8003; Bagian 165–166 belum di-commit/push. Perangkat fisik belum diuji.


## Pembaruan Sesi 19 November 2026 — Bagian 167 Spacing Layanan dan Profil Mobile

- Sesuai persetujuan pengguna, hanya spacing Layanan dan Profil yang dirapikan. Tugas, warna, bentuk kartu, padding di dalam kartu dan ukuran target sentuh tetap.
- Layanan memakai serviceStack dengan gap x4 maksimum 16px (terukur 14px pada 360 dan 16px pada 440). Kartu bantuan mempertahankan pemisah yang lebih besar, 21/25px.
- Profil memakai profileMenuStack dengan gap x3 maksimum 12px (terukur 10/12px). Jarak ringkasan ke menu memakai x6 maksimum 20px (terukur 20px); logout dipisahkan dari kelompok menu dengan margin atas 24px. Hero/dua kartu ringkasan tidak diubah.
- Browser fixture light/dark pada 360/440 membandingkan ukuran, posisi dan padding dengan baseline sebelum perubahan. Geometri seluruh kartu Tugas identik; lebar/tinggi/padding kartu Layanan/Profil juga tetap. Semua gap yang disepakati lulus pemeriksaan dan hasil render ditinjau, tanpa error JS. Typecheck/ESLint mobile lulus.
- Pengguna mengonfirmasi hasil spacing sudah bagus dan menyetujui checkpoint.
- Checkpoint sebelumnya eddf8003; Bagian 165–167 disimpan sebagai checkpoint lokal perbaikan BMN dan spacing mobile yang telah disetujui pengguna; belum di-push. Perangkat fisik belum diuji.


## Pembaruan Sesi 19 November 2026 — Bagian 168 Form SPT Mobile dan Penyelarasan Web

- Form Buat SPT Baru mengikuti komposisi portal mobile: identitas Kemenhut, app bar tetap, bidang konten membulat, kartu terkelompok dan tema global. Aksen memakai role Surat Tugas web #0369a1 light / #38bdf8 dark; kanvas/kartu mengikuti surface netral modul web. Fokus/seleksi input bertema dan kontrol 44–48px.
- Melengkapi master jenis tugas/sumber dana publik, mode lokasi dan pola kalimat kustom, tanggal tunggal/jadwal per pegawai, PM, PLH, persetujuan Kepala Seksi, aturan laporan per jenis, pratinjau serta payload seperti form pribadi web. Kota asal mendahulukan flag wilayah dan mengenali III sebelum II/I, termasuk asal gabungan.
- Unggahan sekarang mendukung PDF/JPG/PNG/WebP 10 MB. Web mengirim berkas/Blob asli dengan boundary multipart, native tetap URI. Validasi file/tanggal/jadwal/jumlah dilakukan sebelum mengirim. Pesan ApiError.fieldErrors dan data konflik ter-normalisasi ditangani dengan benar; isian tidak hilang saat retry.
- Endpoint tetap /surat-tugas/submit; backend/otorisasi/nomor/status penerbitan tidak diubah. Lock pengiriman mencegah duplikasi. Pengajuan berhasil dapat kembali ke portal dan memulai form kosong, walaupun tab navigation mempertahankan screen.
- Rincian sebelum/sesudah dan perintah uji ada di docs/mobile-surat-tugas-parity.md. Typecheck/lint bersih, 30 tes form/schema/API lulus, delapan kasus kalimat cocok dengan helper web aktual. E2E fixture menguji alur lengkap, custom master, jadwal, PLH/Seksi, PM, berkas, retry, konflik dan reset; input tidak overflow pada 360/440/landscape 800. Warna dibandingkan dengan halaman web aktual. Bundle Android HTTP 200 JavaScript. Perangkat fisik belum diuji; tidak ada SPT nyata dibuat.
- Checkpoint sebelumnya b4f505c4; Bagian 168 belum di-commit/push.


## Pembaruan Sesi 19 November 2026 — Bagian 169 Penyempurnaan Form SPT Mobile

- Indikator Pilih pegawai / Detail tugas / Terkirim ditengahkan dalam tiga kolom seimbang. Pratinjau kalimat surat dipindah ke bagian bawah kartu Detail Surat Tugas, sebelum Jadwal penugasan.
- Memisahkan jenis isi picker dari status visibilitasnya. Menutup Jenis Tugas kini mempertahankan konten tugas selama animasi keluar; tidak berubah menjadi Sumber Dana di tengah transisi.
- Mereproduksi fokus tertinggal di portal tersembunyi ketika pengguna menunggu modal aksi cepat terbuka penuh sebelum memilih SPT. Pada web, navigasi kini berjalan setelah modal selesai ditutup dan fokus dipulihkan/dilepas. Kembali ke portal juga melepas fokus tombol sebelum tab form disembunyikan. Alur native tetap memakai navigasi semula.
- Pengaturan jenis tugas dan pembebanan biaya berasal dari endpoint publik Kepegawaian yang sama dengan web. Loader kini berjalan setiap form memperoleh fokus, sehingga penambahan dari pengaturan muncul ketika form dibuka kembali; pilihan jenis yang masih tersedia dan draf dipertahankan. Tidak mengklaim push/realtime untuk master yang berubah saat form sedang terbuka.
- Typecheck/lint lulus, 30 tes form/schema/API serta delapan kasus parity kalimat tetap lulus. Regresi Chrome memeriksa pusat tiap indikator, posisi pratinjau dalam kartu, tutup picker lewat tombol/Escape tanpa konten Sumber Dana, pemulihan fokus dan ketiadaan fokus pada tab tersembunyi, penambahan master pada form yang dipertahankan navigasi, dan draf tetap ada. Alur pengajuan sebelumnya tetap lulus; semua API/pengiriman browser diisolasi dan tidak membuat SPT nyata. Perangkat fisik belum diuji.
- Checkpoint sebelumnya b4f505c4; Bagian 168–169 belum di-commit/push.


## Pembaruan Sesi 19 November 2026 — Bagian 170 Kartu Bentrok dan Batas Tanggal SPT Mobile

- Pesan bentrok tugas/cuti kini berada pada kartu tersendiri sesudah Jadwal penugasan, dengan ikon, judul Jadwal Tugas / Cuti Bentrok, isi pesan server dan arahan memperbaiki tanggal/pegawai. Warna status warning mengikuti web: light #fffbeb/#92400e/#fde68a, dark #451a03/#fcd34d/#92400e. Kartu memiliki role alert/live region dan hilang ketika bentrok teratasi. Pesan status pegawai tanpa message menggunakan keterangan server.
- Validasi submit sebelumnya sudah menolak jadwal per personel di luar periode utama, tetapi kalender belum membatasi pilihan. Kalender kini menonaktifkan tanggal sebelum/sesudah periode utama untuk jadwal per pegawai; tanggal selesai utama/per pegawai tidak boleh mendahului tanggal mulai yang sesuai. Pintasan Hari Ini/Besok/+3/+7 Hari memakai batas dan guard pemilihan yang sama.
- Jadwal berbeda hari hanya dapat diaktifkan setelah periode utama lengkap. Memajukan tanggal mulai melewati tanggal selesai ikut menyesuaikan selesai; mengubah periode utama membatasi kembali jadwal personel yang sudah diisi. Memilih mulai personel sesudah selesai lamanya ikut menyesuaikan selesai agar tidak terbalik. Tanggal utama tidak dibatasi harus setelah hari ini karena tugas dengan tanggal lampau di luar scope permintaan.
- Typecheck dan lint mobile/skrip browser lulus; 30 tes form/API/schema lulus. Regresi browser menguji periode hari ini–besok untuk kedua pegawai dan kedua field, tanggal sebelum/sesudah periode, pintasan, urutan mulai/selesai, penyempitan/pemindahan periode utama, kartu warning light/dark dan kartu hilang setelah bentrok selesai. Seluruh alur pengajuan sebelumnya tetap lulus dengan API/pengiriman fixture terisolasi; tidak membuat SPT nyata. Hasil render light/dark ditinjau. Perangkat fisik belum diuji.
- Checkpoint sebelumnya b4f505c4; Bagian 168–170 belum di-commit/push.


## Pembaruan Sesi 19 November 2026 — Bagian 171 Penekanan Pesan Bentrok dan Garis Progres SPT

- Kartu bentrok mempertahankan objek konflik dari API agar nama pegawai serta rentang tanggal dirender terpisah. Nama dan tanggal ditebalkan; tanggal diberi garis bawah amber seperti web. Konflik tugas/cuti memakai redaksi web, sementara pesan/status lain tetap memakai message/keterangan server.
- Indikator tahap kini memiliki garis penghubung netral dengan bagian biru mengikuti progres: belum terisi pada tahap 1, setengah pada tahap 2 dan penuh pada tahap 3. Garis mengikuti aksen modul dalam light/dark, tetap tepat di tengah lingkaran dan menjaga label setiap kolom tetap di tengah.
- Menangani log lampiran Unexpected text node dari kondisi kalender berbasis string kosong: kondisi kini boolean, sehingga tidak menghasilkan text node langsung dalam View saat kalender tidak memiliki batas tanggal.
- Regresi browser memeriksa font-weight nama/tanggal, garis bawah tanggal, lebar/warna progres tahap 1/2/3, serta menangkap peringatan aria-hidden dan text node. Pemeriksaan tanggal termasuk memilih tanggal selesai utama sebelum mulai; periode diinisialisasi valid. Pemeriksaan sebelumnya dipertahankan. E2E browser lulus tanpa peringatan fokus/text node; hasil render light/dark ditinjau. Typecheck/lint serta 30 tes form/API/schema lulus. Bundle Android HTTP 200 JavaScript; perangkat fisik belum diuji.
- Checkpoint sebelumnya b4f505c4; Bagian 168–171 disimpan sebagai checkpoint lokal penyelarasan dan penyempurnaan form SPT mobile yang telah disetujui pengguna; belum di-push.


## Pembaruan Sesi 19 November 2026 — Bagian 172 Fungsionalitas Profil Pegawai Portal Mobile

- Menyempurnakan tab Profil Pegawai di PortalDashboardScreen, dengan header Kemenhut, warna, bentuk kartu dan spacing portal tetap. Identitas profil mendahulukan data pegawai; akun tanpa pegawai memakai username dan keterangan yang benar, bukan NIP/jabatan/unit contoh. Saldo cuti profil nol tetap nol; data gagal/belum tersedia tidak diganti angka 12 hari.
- Menambah kartu kontak email/telepon/username, edit kontak via /me/update-profile, konfirmasi kata sandi saat email berubah dan pesan verifikasi dari server. Payload dibatasi email/phone/current_password; akun tanpa pegawai tidak diberi input telepon yang tidak dapat disimpan. Validasi email/domain .local/telepon mengikuti batas API; error ter-normalisasi ditampilkan tanpa membuang isian.
- Foto profil aktual ditampilkan dengan fallback inisial saat gagal dimuat. Unggah foto JPG/PNG/WebP maksimal 10 MB memakai pratinjau dan konfirmasi, field foto sesuai web, berkas/Blob asli pada web dan URI pada native, kemudian refresh /me. Akun tanpa data pegawai tidak dapat mengunggah foto.
- Menu pangkat/jabatan kini membuka data kepegawaian aktual yang dapat dibaca, bukan Alert. Tidak mengklaim riwayat pangkat historis karena /me hanya menyediakan data saat ini. Koreksi pangkat/jabatan/unit tetap dikelola admin Kepegawaian. Menu cuti membuka riwayat pada Layanan; menu tugas membuka Tugas. Akun login dengan daftar kosong tidak lagi mendapat surat tugas/cuti contoh.
- Menghubungkan menu keamanan ke ChangePasswordModal yang dipakai bersama. Memakai token tema portal dan sheet responsif/scroll, validasi kata sandi saat ini/baru/konfirmasi/perbedaan, penanganan ApiError.fieldErrors, lock kirim ganda, penyembunyian nilai dan pembersihan rahasia saat tutup/sukses. Sukses mengakhiri sesi lokal saat dialog ditutup/dilanjutkan karena server mencabut seluruh token.
- Menghapus kontak TU/nomor WhatsApp contoh pada tab Profil, menggantinya dengan aksi Perbarui Data Profil. Tidak membuat alamat kontak pengganti atau endpoint baru; backend/otorisasi tidak diubah.
- Typecheck dan lint file berubah lulus. Regresi Chrome fixture frontend/tests/mobile-profile.playwright.cjs menguji identitas/angka nol/light-dark 360/440/landscape 800, data pangkat, daftar tugas/cuti kosong, validasi dan retry 422 kontak, konfirmasi email, pencegahan kirim ganda, unggahan multipart PNG dan penolakan SVG, akun tanpa pegawai, serta validasi/retry/sukses kata sandi dan logout lewat Escape. Uji BMN sebelumnya tetap lulus untuk pemisahan aset/pinjaman dan refresh realtime; E2E form SPT sebelumnya juga tetap lulus. Hasil render profil dan sheet light/dark ditinjau; bundle Android HTTP 200 JavaScript. Semua API/pengiriman browser terisolasi, tanpa mengubah akun, email, foto atau kata sandi nyata. Perangkat fisik belum diuji.
- Pengguna mengonfirmasi hasil sudah bagus dan menyetujui checkpoint. Checkpoint sebelumnya d9318cd2; Bagian 172 disimpan sebagai checkpoint lokal penyempurnaan Profil Pegawai portal mobile; belum di-push.


## Pembaruan Sesi 19 November 2026 — Bagian 173 Logout Portal Mobile di Browser

- Menangani laporan tombol Keluar Akun (Logout) tidak bereaksi. Root cause: PortalDashboardScreen memakai Alert.alert untuk konfirmasi; implementasi React Native Web Alert.alert kosong sehingga callback logout tidak pernah berjalan. Tes browser mereproduksi tombol yang tidak menampilkan konfirmasi sebelum perbaikan.
- Konfirmasi kini memakai ConfirmModal aplikasi yang sudah tersedia, dengan Batal/Ya, Keluar dan handler logout AuthProvider yang sama. Tidak mengubah endpoint atau kebijakan pencabutan token. Tombol logout/konfirmasi/batal memiliki peran dan label aksesibel; Escape/tombol Back menutup konfirmasi tanpa mengakhiri sesi.
- ConfirmModal memakai surface/token bahaya sesuai tema, lebar maksimal 420px, backdrop tidak menjadi target fokus, dan teks tombol bahaya memakai foreground yang memenuhi kontras pada light/dark.
- Memperluas regresi frontend/tests/mobile-profile.playwright.cjs untuk alur logout dari tombol Profil: batal, Escape, konfirmasi, satu request, token localStorage terhapus, kembali ke login dan reload tetap login. Kasus respons logout 200 serta 500 lulus; unit AuthProvider juga menguji cleanup ketika jaringan gagal. Pemeriksaan kontras tombol minimal 4.5:1 mencakup kedua tema.
- Typecheck/lint mobile dan skrip browser lulus. Dua suite auth/API berisi 11 tes lulus. Browser tetap meluluskan seluruh fitur profil sebelumnya. Bundle Android HTTP 200 JavaScript; perangkat fisik belum diuji. Semua request browser diisolasi memakai fixture, bukan mengubah sesi akun nyata.
- Pengguna mengonfirmasi logout sudah berfungsi dan menyetujui checkpoint. Checkpoint sebelumnya 7bd2db30; Bagian 173 disimpan sebagai checkpoint lokal perbaikan logout portal mobile; belum di-push.
