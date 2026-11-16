# Security Audit Report — 6 Modul Utama (BE & FE)

- **Tanggal Audit**: 17 November 2026
- **Branch / Basis Commit**: `codex/portal-security-pentest` (atop `fc993464`)
- **Cakupan Modul**: `surat-tugas`, `portal` (+ auth/notifikasi), `kepegawaian`, `drive` (+ storage infra), `bmn`, `surat`.
- **Metodologi**: Source-first boundary analysis (`/security-audit` skill) mengecek seluruh jalur input non-trusted -> otorisasi/validasi -> state -> sink/export/file/redirect, sekaligus menyaring temuan lama pada `docs/security/*` yang sudah termitigasi agar tidak terjadi duplikasi.

---

## Ringkasan Risiko & Status Remediasi

| ID | Sev | Modul / Boundary | Ringkasan Temuan | Status |
|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | `bmn`, `portal`, `shared` | Token Bearer Sanctum live tersimpan persisten di DB `items_snapshot` / `assets_snapshot` + global `?token=` query auth (`AuthenticateQueryToken`) | Mitigated (Code) |
| **SEC-02** | **HIGH** | `shared`, `kepegawaian`, `bmn`, `surat` | Eskalasi hak lintas modul via fallback `User::roleFor()` (`role='admin'` tanpa module key) & bypass `module_roles` saat `permissions` non-empty | Mitigated (Code) |
| **SEC-03** | **HIGH** | `kepegawaian` | Admin `kepegawaian` bisa reset password admin modul lain + ubah `email` tanpa reset `email_verified_at`; self-approval & self-quota inflation cuti; case mismatch rekonsiliasi uang makan (`'approved'` vs `'DISETUJUI'`) | Mitigated (Code) |
| **SEC-04** | **HIGH** | `drive` | `PurgeDriveTrashCommand` memicu `nullOnDelete` file folder restricted ke Unit Root; `moveFolder` menimpa `is_restricted`/`location_id` subfolder; `editor` eksfiltrasi antar-space/public share; `canUseCreatorOwnershipBypass` non-employee; race/overflow kuota `'completing'` + S3 multipart leak | Mitigated (Code) |
| **SEC-05** | **HIGH** | `bmn` | Pinjaman aktif menimpa `bmn_assets.employee_id` mem-bypass batasan foto publik peminjam -> unduh BPKB/STNK; `POST /assets/import` hanya pakai `bmn.import.review`; state machine izinkan `DRAFT -> REALISASI` langsung | Mitigated (Code) |
| **SEC-06** | **HIGH** | `surat-tugas` | Injeksi `kop_image_url`, `template_snapshot`, & `nomor_surat` dari endpoint publik `/submit`; kebocoran seluruh inbox ST (termasuk draft) untuk `user` modul `surat_tugas` | Mitigated (Code) |
| **SEC-07** | **HIGH** | `surat` | Stored XSS di `transformCloneForWord()` (`.textContent` -> `.innerHTML`); `Storage::disk('private')` tak terdefinisi + bocor `$e->getMessage()` + ketiadaan endpoint download aman | Mitigated (Code) |
| **SEC-08** | **HIGH** | `shared` / `portal` | `validateCsrfTokens(except: ['api/*'])` menonaktifkan CSRF walau `statefulApi()` aktif + `sanctum.stateful` baca `HTTP_HOST` + `trustProxies('*')` + CORS LAN/subdomain | Mitigated (Code) |
| **SEC-09** | **MEDIUM-HIGH** | `bmn`, `drive` | KTP deterministik overwrite & cross-record `existing_ktp_path` theft + `Storage::url` langsung (`PowerOfAttorney`); ZIP stream DoS tak terbatas & skip `isEffectiveActive`/`must_change_password` di `downloadFolderZip`; MIME 4096-byte prefix / `.xml` / `submitPublic` tanpa sanitize nama file | Mitigated (Code) |
| **SEC-10** | **MEDIUM** | `portal`, `notifications`, `export-pdf`, `surat-tugas`, `kepegawaian`, `bmn`, `surat` | Cookie `bksda_token` non-HttpOnly domain `.bksdakaltim.net`; kebocoran draft `localStorage` & `module_roles` cache miss; `notifyAdmins()` skip module-admin ber-role global `user`; `Export-PDF` bypass `423 Locked` lewat `/api/user` + tanpa concurrency limit; `SuratMasukExport` Excel formula injection; ST creator restore ST official terhapus & approver baca draft orang lain; HR `inactive_reason`/TMT enum publik; TOCTOU race di `ImportReviewController::approve` & `AuctionBatchService`; validasi longgar `storeBatch`/`storeRecord`/`SuratKeluarRequest`/`SuratMasukRequest`; `login2Fa` skip `isEffectiveActive` & `enable2Fa` bypass `must_change_password` | Mitigated (Code) |
| **SEC-11** | **LOW** | `portal`, `surat-tugas`, `surat`, `bmn`, `drive` | `forceDestroy`/`bulkForceDestroy` race dgn `restore`; `StExpenseTemplateController`/`StTaskTypeController`/`SuratTemplateController` masih buka data nonaktif/admin biasa; `LIKE` wildcard/unbounded `per_page=all`/`TypeError` ID non-angka; `foto_geotag_url` open redirect; `updateProfile` hapus `employee.email` tanpa password; `/drive/shares/candidates` enum user aktif | Mitigated (Code) |
| **NV-01..06** | **NEEDS_VALIDATION** | `Deployment / Runtime` | Konfig env `TWO_FACTOR_ENFORCE`, `SANCTUM_EXPIRATION`, `FRONTEND_URL`, proxy `X-Forwarded-For` vs `trustProxies`, Nginx `20M` vs multipart 25MB & rate-limit `/surat/export-pdf`, header `nosniff` + ACL bucket RustFS/S3, serta status `users.permissions` produksi | Needs Validation |

---

## Detail Temuan Keamanan & Rencana Perbaikan

### SEC-01 — [CRITICAL] Kebocoran Token Bearer Live dalam Snapshot DB BMN & Query-String Auth Global
- [x] **Lokasi**: `backend/app/Modules/Bmn/Resources/AssetResource.php:14-15,105-120,177-194`, `HandoverAgreementController.php:300-328`, `PowerOfAttorneyController.php:148-158`, `AuthController.php:162-163,376-377`, `backend/app/Http/Middleware/AuthenticateQueryToken.php:15-22`, `MyAssetsTab.tsx:172-180`.
- **Principal & Alur**: Pengguna dengan `bmn.document.history.view` membaca `GET /api/bmn/handover-agreements/{id}` atau `/power-of-attorneys/{id}` atau `/document-histories`. `AssetResource` dan `vehicleItems()` menyisipkan `?token=<bearer pembuat>` ke dalam URL lalu `store()`/`update()` menyimpannya persisten ke kolom JSON `items_snapshot` / `assets_snapshot` di DB. `AuthenticateQueryToken` mempromosikan `?token=` menjadi header `Authorization: Bearer` pada **seluruh** route `/api/*`.
- **Dampak**: Pemegang izin baca histori dokumen dapat memanen token Bearer milik `admin` / `super_admin` pembuat dokumen hingga token kedaluwarsa (`1440` menit default), plus kebocoran token ke URL browser/history/proxy log/redirect.
- **Perbaikan Minimum Efektif**:
  1. Jangan pernah menanam `&token=` ke dalam snapshot DB di `PowerOfAttorneyController` & `HandoverAgreementController`; sanitasi/hapus parameter `token` pada `PowerOfAttorneyResource`, `HandoverAgreementResource`, & `DocumentHistoryController` saat serialisasi (menutup data historis di DB sekaligus!).
  2. Batasi `AuthenticateQueryToken` hanya untuk `GET` media aman (`api/bmn/assets/*/photo/*` dan `api/bmn/assets/*/document/*`), tolak di route mutasi maupun modul lain, lalu hapus penambahan `?token=` yang tidak perlu di UI/link eksternal (gunakan signed URL / fetch blob / cookie session di komponen link baru).

### SEC-02 — [HIGH] Bypass Isolasi `module_roles` pada `User::roleFor()`, `User::hasPermission()`, dan `useRole.ts`
- [x] **Lokasi**: `backend/app/Models/User.php:156-175,211-266`, `frontend/src/hooks/useRole.ts:24-111`, `backend/app/Modules/Kepegawaian/Controllers/LeaveTypeController.php:28,33,78,81`.
- **Principal & Alur**:
  1. Admin modul lain (mis. `module_roles = ['bmn' => 'admin']`, `users.role = 'admin'`, tanpa `'kepegawaian'` atau tanpa key modul tujuan) memanggil `roleFor('kepegawaian')` atau `roleFor('bmn')`: loop di `User.php:165-172` melewatkan/tidak menemukan key, lalu jatuh ke line `174` (`return $this->role`) menghasilkan `'admin'`. Memungkinkan akses admin pada endpoint yang lolos `module.access` (`LeaveTypeController`, `/employees/{self}/histories`, `/bmn-clearance`) atau saat ditambah `access_modules` baru tanpa key `module_roles`.
  2. Di `User::hasPermission():225-265` & `useRole.ts:69-108`, bila `permissions` berisi >= 1 item apa pun (mis. data lama/parsial), resolusi `module_roles` per modul dilompati total (`empty($this->permissions)` false).
- **Perbaikan Minimum Efektif**: Jika `is_array($this->module_roles) && !empty($this->module_roles)` (atau jika user tidak punya akses modul terkait), `roleFor($module)` wajib mengembalikan `'user'` — bukan mewarisi `'admin'` global. Di `LeaveTypeController` pastikan tidak membaca data admin lintas modul tanpa `'kepegawaian'` di `access_modules`. Evaluasi fallback `hasPermission()` agar tidak membypass `module_roles` bila key modul bersangkutan tidak ada di `permissions`. *(Juga selaraskan `UserPermissionFallbackTest` bila kontrak `bmn.auction.view` vs `bmn.view` dikunci.)*

### SEC-03 — [HIGH] Kepegawaian: Reset Password Lintas-Modul, Manipulasi Email, Self-Approval & Balance Cuti, serta Bug Case Rekonsiliasi Uang Makan
- [x] **Lokasi**: *(Self-approval, reset password lintas-modul, `AttendanceReconcilerService` case cuti, saldo & eligibility cuti termitigasi + teruji di `SixModulesSecurityHardeningTest`)*
  - `EmployeeController.php:320-323,599-660`, `EmployeeRequest.php:158`
  - `EmployeeLeaveController.php:72-448`, `EmployeeLeaveRequestController.php:411-626,908-1031,1276-1443`
  - `AttendanceReconcilerService.php:305-322`
- **Celah**:
  1. `resetPassword` (`618`) membolehkan `admin` modul kepegawaian me-reset akun `admin` modul lain (`keuangan`, `bmn`, `drive`, `surat`, `cms`) dan mengembalikan plaintext `temporary_password`, sementara `update()` (`320-323`) menimpa email akun tanpa `unique:users,email` maupun reset `email_verified_at = null`.
  2. `admin` kepegawaian dapat menyetujui cutinya sendiri (`adminApprove`, `adminUpdateStatus`, `generateSuratIzin`, `store`, `storeRecord`), `storeRecord`/`updateRecord` memercayai `jumlah_hari` dari klien tanpa cek `<= sisa_cuti_tersedia` atau `$leaveType->countDays()`, dan `adminUpdate` melewati cek aktif/TMT/1 tahun.
  3. `AttendanceReconcilerService::fetchCutiForEmployee` (`309-310`) menyaring `'status' = 'approved'` huruf kecil, padahal seluruh record diset `'DISETUJUI'` huruf besar -> cuti resmi terlewat dari pemotongan uang makan di PostgreSQL!
- **Perbaikan Minimum Efektif**: Batasi `resetPassword` target ber-privilese (global `admin` atau memiliki `module_roles[*] === 'admin'`) hanya ke `super_admin` (atau blok lintas-modul), validasi `unique` email & nol-kan `email_verified_at` saat email berubah di `EmployeeController::update`; tolak self-approval/self-quota cuti kecuali `super_admin`; hitung `jumlah_hari` & validasi saldo di `storeRecord`/`updateRecord` + syarat eligibility di `adminUpdate`; perbaiki query cuti di `AttendanceReconcilerService` dengan `whereIn(DB::raw('UPPER(status)'), ['DISETUJUI', 'APPROVED'])`.

### SEC-04 — [HIGH] BKSDA Drive: Kebocoran File Restricted Saat Purge/Move, Eksfiltrasi oleh Editor, Non-Employee Bypass, & Race/Leak Kuota
- [x] **Lokasi**: `PurgeDriveTrashCommand.php:58-70`, `DriveController.php:311-402,580-737,752,947-1151,1236-1291`, `DriveAccess.php:277-316,388-404`, `DriveShareController.php:21-67`, `DriveUnit.php:45-51`, `CleanupDriveUploadsCommand.php:27`.
- **Celah**:
  1. `PurgeDriveTrashCommand` memanggil `$folder->forceDelete()` langsung -> memicu `nullOnDelete()` FK untuk anak file yang tidak ikut terhapus, menjatuhkan file folder terbatas ke Root Unit (`folder_id = null`).
  2. `moveFolder` (`1091-1136`) menimpa `is_restricted`, `location_id`, `resor_code`, `room_code` ke seluruh sub-folder turunannya (editor parent bisa menghapus isolasi subfolder terbatas); `trash`, `forceDelete`, dan `transferOwnership` juga tidak mengecek izin turunan restricted.
  3. `moveFile`/`moveFolder` membolehkan `editor` (bahkan non-pemilik via share) memindahkan file Personal Drive ke Unit Drive (`unit_id = null -> TargetUnit`), atau antar folder terbatas A -> B; `DriveShareController::createShare` membolehkan `editor` membuat link publik unauthenticated.
  4. `DriveAccess::canUseCreatorOwnershipBypass` (`287-290`) mengembalikan `true` permanen untuk akun tanpa baris `Employee` walau sudah dicabut dari `drive_unit_members`, dan `transferOwnership` (`1241`) tidak memanggil `DriveAccess::canWrite*`.
  5. `completeUpload` menandai status `'completing'` sebelum cek S3 -> melepaskan reservasi kuota (`initiated` saja), meninggalkan part multipart S3 yatim jika gagal tanpa `abortMultipartUpload()`, dan `moveFile`/`moveFolder`/`transferOwnership` cek kuota tanpa transaksi/`lockForUpdate`.
- **Perbaikan Minimum Efektif**: Rekumpulkan & hapus seluruh turunan/S3/share pada `PurgeDriveTrashCommand`; cegah mutasi/penghapusan/pemindahan folder bila mengandung turunan `is_restricted` yang tak berizin; batasi pemindahan lintas-space & pembuatan `share_type='public'` hanya untuk pemilik/`isDriveAdmin`; hilangkan bypass non-employee pada unit/restricted di `DriveAccess` dan wajibkan `canWrite*` di `transferOwnership`; masukkan `'completing'` pada perhitungan kuota + panggil `abortMultipartUpload` + kunci kuota lintas-space dalam `DB::transaction`.

### SEC-05 — [HIGH] BMN: Pinjaman Aktif Mem-Bypass Penjagaan BPKB/STNK, Import Langsung Tanpa Approve, & Bypass State Machine Lelang (`DRAFT -> REALISASI`)
- [x] **Lokasi**: `CheckModuleAccess.php:66`, `CheckPermission.php:58`, `Modules/Bmn/Routes/api.php:93`, `AuctionBatchStateMachine.php:25-29`, `AuctionBatchService.php:670,860-900`.
- **Celah**:
  1. `LoanService` menulis `bmn_assets.employee_id = $borrowerId` selama aset dipinjam -> `Asset::isOwnedByEmployee()` bernilai `true` bagi peminjam sementara, melompati batasan `$isPublicPhoto` sehingga peminjam dapat mengunduh BPKB/STNK & histori penuh aset.
  2. `POST /api/bmn/assets/import` (`Routes/api.php:93`) memakai middleware `permission:bmn.import.review`, bukan `bmn.import.approve`.
  3. `AuctionBatchStateMachine` (`25-29`) mengizinkan transisi langsung `DRAFT -> REALISASI` dan `recordFirstAuctionResults` (`670`) memperbolehkan hasil diisi saat status `DRAFT`, melewati lock kelengkapan 13 dokumen/penilai dan jadwal KPKNL.
- **Perbaikan Minimum Efektif**: Di helper shared `CheckModuleAccess`/`CheckPermission`, jika user punya active loan pada aset, terapkan **$isPublicPhoto only** (evaluasi `!$this->hasActiveLoan(...)` sebelum `isOwnedByEmployee`); ganti middleware `assets/import` ke `bmn.import.approve`; hapus `REALISASI` dari transisi `DRAFT` di `AuctionBatchStateMachine` dan kunci `recordFirstAuctionResults` hanya untuk `JADWAL_DITETAPKAN` / `LELANG_ULANG`.

### SEC-06 — [HIGH] Surat Tugas: Injeksi `kop_image_url` / Snapshot / Nomor Surat via Endpoint Publik `/submit` & Kebocoran Inbox Lintas-Organisasi
- [x] **Lokasi**: *(Inject snapshot/kop/inbox terbaca termitigasi & diverifikasi `SixModulesSecurityHardeningTest`; usulan nomor draft oleh creator tetap diizinkan sesuai `StActorAcceptanceTest`)* `AssignmentLetterRequest.php:173`, `StoreStTemplateRequest.php:48`, `AssignmentLetterController.php:198,203-269,468-513,860-884`, `constants.ts:119-132`, `export-st.ts:42-72`.
- **Celah**:
  1. Tamu publik (`/api/surat-tugas/submit`) & user non-admin dapat mengirim `template_snapshot.configuration.kop_image_url` sembarang (tanpa whitelist path/skema) serta menyuntikkan `nomor_surat`, `kode_surat`, `tanggal_surat`, & `penandatangan_*` yang tersimpan di DB, lalu dirender di preview admin dan di-fetch via `credentials: "same-origin"` saat ekspor Word.
  2. `ensureCanAccessManagementInbox()` (`L198`) meloloskan siapa saja yang punya `'surat_tugas'` di `access_modules`, membiarkan `role: user` membaca seluruh draft/pending/trashed ST organisasi lewat `/api/surat-tugas` & `/status-counts`.
- **Perbaikan Minimum Efektif**: Abaikan field resmi (`nomor_surat`, `kode_surat`, `tanggal_surat`, `penandatangan_*`) dan overwrite `template_snapshot` pada submit publik/non-admin; kunci `kop_image_url` pada whitelist `/storage/kop-surat/...` atau `default`/`/header-st.png` di BE & FE (`resolveKopImageUrl`); wajibkan `isAdminFor('surat_tugas') || hasPermission('surat_tugas.approve')` di `ensureCanAccessManagementInbox()`.

### SEC-07 — [HIGH] Persuratan: Stored XSS di Ekspor Word (`transformCloneForWord`) & Disk `'private'` Rusak / Kebocoran Exception
- [x] **Lokasi**: `frontend/src/app/surat/_lib/export-surat-dinas.ts:174-204,299-331,360-424`, `SuratMasukController.php:140,161,184-190,212`, `SuratKeluarController.php:84,119-125`, `SuratMasuk.php:23-24`, `backend/app/Modules/Surat/Routes/api.php`.
- **Celah**:
  1. `transformCloneForWord()` mengekstrak text React via `.textContent`/`.innerText` (mengembalikan `&lt;` -> `<`) dan langsung menginterpolasikannya ke `.innerHTML` pada DOM aktif saat admin klik *Unduh Word*, mengeksekusi XSS (pencurian token di `localStorage`).
  2. `SuratMasukController` / `SuratKeluarController` / `SuratMasuk` memakai `Storage::disk('private')` yang **tidak ada** di `config/filesystems.php` (melempar 500 + membocorkan `$e->getMessage()` di `SuratMasukController:161,212`), belum memiliki endpoint download lampiran aman, dan menghapus file lama sebelum commit DB.
- **Perbaikan Minimum Efektif**: Bangun node Word via `createElement` + `.textContent` / fungsi `escapeHtml()` sebelum menulis HTML di `transformCloneForWord()`; gunakan disk `'local'` (`storage/app/private`) atau daftarkan `'private'` dengan root `storage_path('app/private')`; tutup `$e->getMessage()` saat `!config('app.debug')`; hapus file lama setelah commit; tambahkan route `download` berotorisasi jika dipakai UI.

### SEC-08 — [HIGH] Konfigurasi Global: `validateCsrfTokens(except: ['api/*'])` Meniadakan CSRF pada `statefulApi()` + `trustProxies('*')` + `HTTP_HOST` di `sanctum.stateful`
- [x] **Lokasi**: *(Middleware `ValidateApiCsrfToken` + scope proxy & `sanctum.stateful` + `services.resend.webhook_secret` + per-username login throttle diterapkan; proxy header produksi tetap diverifikasi pada `NV-01`)* `backend/bootstrap/app.php:26,29-37`, `backend/config/sanctum.php:8-13`, `backend/config/cors.php:22-25`, `backend/app/Providers/AppServiceProvider.php:32-46`, `backend/config/app.php:56`, `backend/config/services.php:26-28`.
- **Celah**:
  - `statefulApi()` mengaktifkan sesi cookie `laravel_session` untuk request `/api/*`, sementara `except: ['api/*']` menonaktifkan verifikasi CSRF untuk rute yang sama. Bersama `cors.php` (`*.bksdakaltim.net` + regex LAN `172.*` lebar + `supports_credentials => true`), `config/sanctum.php` yang menerima `$_SERVER['HTTP_HOST']`, dan `trustProxies('*')`, kontrol rate-limit IP (`login`, `drive/s/*/download`), signed proxy headers, serta pertahanan CSRF dari subdomain terpengaruh.
  - `AppServiceProvider` memanggil `URL::forceRootUrl`/`forceScheme` secara global tanpa memulihkan state setelah URL dibuat + memakai `env()` langsung; `config/services.php` tidak memetakan `resend.webhook_secret`.
- **Perbaikan Minimum Efektif**: Scope `trustProxies` ke CIDR proxy privat (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`), batasi `RateLimiter::for('login')` per-username juga, hilangkan injeksi `HTTP_HOST` dinamis di `config/sanctum.php`, evaluasi dampak pencabutan `'api/*'` dari `validateCsrfTokens` (memastikan `X-XSRF-TOKEN` + `/sanctum/csrf-cookie` terpasang pada login SPA tanpa mematahkan klien Bearer/Playwright!), pulihkan root/scheme di `VerifyEmail::createUrlUsing`, dan petakan `services.resend.webhook_secret` serta default `frontend_url` `.bksdakaltim.net`.

### SEC-09 — [MEDIUM-HIGH] Keamanan Upload/Download File, KTP BMN, ZipStream DoS, & Public Share
- [x] **Lokasi**: `PowerOfAttorneyController.php:111-125,212-227`, `PowerOfAttorneyResource.php:27,45-56`, `DriveController.php:515,668-703,796,865-941`, `DriveShareController.php:36,181-199`, `FormBuilderController.php:553-578`, `deploy/nginx.conf:146-163`.
- **Perbaikan Minimum Efektif**:
  1. **KTP Surat Kuasa**: Simpan KTP pakai nama UUID acak di private storage (`bmn/power-of-attorneys/ktp/{uuid}`), tolak `existing_ktp_path` sembarang milik record lain, jangan hapus file masih dipakai record lain, dan sediakan proxy endpoint terotorisasi alih-alih `Storage::url`.
  2. **Drive ZIP DoS & Security**: Batasi total ukuran & jumlah file serta depth + visited set di `requestZipToken` / `downloadFolderZip`, hapus fallback `$folder->user_id`, dan cek `isEffectiveActive()` + `!must_change_password` pada signed ZIP user.
  3. **Drive MIME / Public Share**: Pindahkan validasi `completeUpload` ke allowlist ekstensi + MIME (hindari sajikan `text/plain` inline bila prefix-4KB disalahgunakan), tambah throttle per-token & min 8 karakter pada password share publik, revoke share saat deaktifasi user, serta sanitasi nama & MIME SVG/XML di `FormBuilderController::submitPublic`.

### SEC-10 — [MEDIUM] Kebocoran Client Token/Draft, `notifyAdmins()` Module-Admin Gap, Race Condition, Formula Injection, & Gap Auth/Lifecycle Lainnya
- [x] **Daftar Terkonsolidasi** *(Catatan kebijakan existing: creator tetap boleh restore ST milik sendiri per `StLifecycleAcceptanceTest`, clearing contact `employee.email` ke null diperbolehkan tanpa `current_password`, dan `enable2Fa` mengembalikan 409 bila 2FA sudah aktif untuk kompatibilitas setup awal `SecurityModals`)*:
  1. `auth-store.ts`: hapus cookie non-`HttpOnly` `bksda_token`, bersihkan `bksda_*` draft milik user lama saat `authStore.login()` berganti user, panggil `disconnectEcho()`, namespace `VisumSpdTab` & `KalkulatorDinasTab` berdasarkan `user.id`/`username`, serta tambahkan `"module_roles"` ke `authFields` `api.ts:240` & deps `NotificationBell.tsx:369`.
  2. `PortalNotificationService.php:131`: hilangkan filter keras `whereIn('role', ['admin', 'super_admin'])` agar modul admin yang `users.role`-nya `'user'` (akibat RBAC per-modul) tetap menerima notifikasi! *(Catatan: tetap hormati mekanisme `canAccessAdminInbox($module)`.)*
  3. `export-pdf/route.ts`: verifikasi auth ke route protected selain `/api/user` (agar `EnsureAccountSecure` 423 terpicu), wajibkan `Content-Type: application/json`, dan tambahkan batas konkurensi tab Chromium (`<= 2–3`) agar tidak OOM DoS.
  4. `SuratMasukExport.php`: escape formula `=,+,-,@,\t,\r` via `safeCell()`.
  5. `AssignmentLetterController`: cegah creator non-admin me-restore ST berstatus official yang dihapus admin; cek akses `draft` pada `approve()` & `updateStatus()`.
  6. `AssignmentLetterConflictService` & `EmployeeController::select`: sembunyikan `inactive_reason` & TMT exact dari request publik unauthenticated, batasi `check-conflicts` array <= 50, dan abaikan `?as_of=` jika unauthenticated.
  7. `ImportReviewController` (`approve`, `toggleSelection`, `bulkSelection`) & `AuctionBatchService`: kunci dengan `DB::transaction` + `lockForUpdate` + cek `status='pending'`.
  8. `MealAllowanceController` (`storeBatch`, `exportExcel`, `reconcile` `file`, `getCalendar`) & `MealAllowanceExcelExport`: hitung ulang bruto/pph21/netto di server, sanitasi judul sheet Excel (`[:\\/?*\[\]]`), tambah rule ekstensi pada field `file`, validasi `month`/`year`.
  9. `SuratKeluarRequest` (`status` allowlist, batas `document_payload`), `SuratMasukRequest` (rule elemen array & `strip_tags` catatan), `UpdateAuctionBatchDraftMetadataRequest` (whitelist/size cap `document_contents`), `HandoverAgreementController` (`foto_*_url` URL validation).
  10. `AuthController::login2Fa` (`isEffectiveActive` + IP match check atau hapus dead field), `EnsureAccountSecure` (`config/auth.php` key `two_factor_enforce`, blok `/me/2fa` bila `must_change_password`), `enable2Fa` (`current_password`), `EmployeeController::reset2Fa` (revoke token), `updateProfile` (wajibkan `/me/email` untuk seluruh perubahan email).

### SEC-11 — [LOW] Pengerasan & Celah Kecil
- [x] **Daftar Terkonsolidasi**:
  1. `AssignmentLetterController::forceDestroy` / `bulkForceDestroy`: gunakan transaksi + `lockForUpdate` sebelum `forceDelete()`.
  2. `StExpenseTemplateController`, `StTaskTypeController`, & `SuratTemplateController`: samakan filter `is_active` & admin check untuk `super_admin`.
  3. `SuratMasukController` / `SuratKeluarController` / `SuratTemplateController`: `->whereNumber('id')`, escape wildcard LIKE (`\\%`, `\\_`), batasi `per_page <= 200`, sanitasi `LIKE` serupa di pencarian terkait bila ada.
  4. `AssetPhotoController::updateGeotag` & `view('geotag')`: batasi skema `https://` & cegah internal CIDR redirect.
  5. `DriveController::index`: sembunyikan statistik kuota unit jika pemanggil bukan anggota unit; `DriveShareController::candidates`: pastikan user aktif efektif (`isEffectiveActive()`).
  6. `LeaveTypeController::index`: kunci parameter `?employee_id=` ke admin `kepegawaian` + `module_roles` aktif.
  7. `EmployeeLeaveRequestController::respondScanFile`: tambah header `Cache-Control: private, no-store`.
  8. `frontend/src/hooks/useRole.ts`: tambahkan `["/surat-tugas", "surat_tugas"]` sebelum `["/surat", "surat"]`.
  9. `DocumentHistoryController.php`: ganti `CAST(... AS CHAR)` menjadi `CAST(... AS TEXT)` di PostgreSQL untuk fungsi pencarian snapshot.

---

## Poin Memerlukan Validasi Deployment / Runtime (`NEEDS_VALIDATION`)

1. **NV-01 — Proxy Trust & `X-Forwarded-For` Sanitization**: Pastikan proxy depan produksi (Cloudflare / Nginx Dokploy) menimpa `X-Forwarded-For` dan `Host`/`X-Forwarded-Host` klien sebelum mencapai Laravel.
2. **NV-02 — Env Produksi Auth/URL**: Verifikasi `TWO_FACTOR_ENFORCE`, `SANCTUM_EXPIRATION`, `FRONTEND_URL` (konsisten `.bksdakaltim.net`), `PUBLIC_APP_URL`, `RESEND_WEBHOOK_SECRET`, `APP_DEBUG=false`, dan `SESSION_SAME_SITE=lax` di container produksi serta pasca `php artisan config:cache`.
3. **NV-03 — RustFS / S3 Bucket Policy, CORS & Proxy Nginx**:
   - Pastikan bucket `bksda-drive` & `foto_profil` (`FILESYSTEM_DISK`) bersifat privat / CORS `ExposeHeaders: ["ETag"]` aktif.
   - `deploy/nginx.conf:161` membatasi `client_max_body_size 20M` pada proxy storage sementara chunk multipart 25 MB & single PUT hingga 50 MB; juga tambahkan `X-Content-Type-Options: nosniff` pada `storage.*` dan `limit_req` pada `/surat/export-pdf`.
4. **NV-04 — Agent Gateway Topology (`RestrictAgentClientIp`)**: Pastikan host proxy tidak meneruskan request eksternal ke `/api/agent/v1/*` dengan `REMOTE_ADDR` loopback/LAN (`127.0.0.1` / `192.168.100.*`) tanpa `X-Agent-Internal-Key`.
5. **NV-05 — Data Historis DB Produksi**: Periksa apakah kolom `users.permissions` produksi masih memiliki entri non-kosong lama dan apakah tabel `bmn_handover_agreements` / `bmn_power_of_attorneys` menyimpan URL ber-`&token=` lama (akan tersanitasi otomatis pada read via Resource patch).
6. **NV-06 — Sandbox Chromium `/surat/export-pdf`**: Verifikasi isolasi container / UID non-root pada runner Next.js produksi mengingat Chromium memakai `--no-sandbox`.
