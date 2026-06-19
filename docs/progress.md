# Progress - Phase 97: Mobile API Readiness

> Document updated: 2026-06-18
> Status: Squash merged ke `main` (commit `11de711`). Branch remote `issue/pagination-limits`, `issue/mobile-dashboard`, `issue/mobile-upload-download`, dan `issue/permission-audit` sudah selesai dan dihapus.

---

## Mobile API Readiness

### Status: SELESAI
- Scope: Backend Mobile API (Auth, Pagination, Dashboard, Upload/Download, Permissions)
- Tujuan: Mengoptimalkan dan menyiapkan Laravel backend API untuk kebutuhan mobile app, termasuk pembatasan pagination, pembuatan endpoint dashboard konsolidasian, pelonggaran upload foto untuk pemilik aset, download surat tugas personal, dan audit permission.

### Implementasi
- **Issue 1: API Contract Baseline** (Selesai sebelumnya):
  - Mengimplementasikan trait `ApiResponse` untuk standardisasi format sukses/error API.
  - Mengonfigurasi exception handler global di `bootstrap/app.php` untuk merender JSON bagi rute API pada error 401, 403, 404, 405, dan 500.
- **Issue 2: Auth & /api/me** (Selesai sebelumnya):
  - Memperluas `UserResource.php` untuk mengembalikan relasi data pegawai lengkap (NIP, jabatan, pangkat, foto profil) serta hak akses permissions granular.
  - Mendaftarkan rute `/api/me` pemetaan dari data profil user terautentikasi.
- **Issue 3: Pagination Capping**:
  - Membatasi parameter `per_page` maksimal 100 di level controller pada endpoint list aset (`AssetController`), peminjaman (`LoanController`), dan kepegawaian (`EmployeeController`) untuk mencegah kehabisan sumber daya server oleh client mobile.
- **Issue 4: Mobile Dashboard Endpoint**:
  - Membuat [MobileDashboardController.php](file:///e:/bksda-superapp/backend/app/Http/Controllers/Api/MobileDashboardController.php) dan rute `GET /api/mobile/dashboard` untuk mengembalikan data gabungan (profil singkat, summary counts aset/surat tugas/peminjaman, detail kendaraan pajak STNK mendekati jatuh tempo) dalam satu request tunggal untuk home screen mobile.
- **Issue 5: Mobile Upload and Download**:
  - Memperbarui [CheckPermission.php](file:///e:/bksda-superapp/backend/app/Http/Middleware/CheckPermission.php) untuk memperbolehkan pemilik aset mengunggah foto geotag/fisik dan menghapus foto aset miliknya sendiri tanpa memerlukan permission administratif umum `bmn.asset.update`.
  - Menambahkan method `myDownload` di [AssignmentLetterController.php](file:///e:/bksda-superapp/backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php) dan rute `/api/surat-tugas/my/{id}/download` agar personel surat tugas dapat mengunduh berkas PDF miliknya sendiri secara mandiri.
- **Issue 6: Permission Audit**:
  - Memverifikasi respon routing error dan route lockdown agar seluruh endpoint mobile dilindungi dengan benar oleh Sanctum & Module/Permission middleware dan mengembalikan kode status 401, 403, atau 404 JSON standar.

### Validasi
- `php -l`: pass.
- Menguji secara lokal dengan unit scripts untuk verifikasi capping pagination, struktur respons dashboard, bypass upload/download owner, dan standar JSON error code. All tests passed.

---

# Progress - Phase 96: Surat Kuasa Kendaraan Document Generator

> Document updated: 2026-06-18
> Status: Squashed merged ke `main` (commit `8a97ced`). Branch remote `issue/438-bmn-power-of-attorney` sudah dihapus.

---

## Surat Kuasa Kendaraan Document Generator

### Status: SELESAI
- Scope: Modul BMN (Backend & Frontend)
- Tujuan: Mengimplementasikan generator dokumen Surat Kuasa Kendaraan untuk pemeriksaan fisik BMN. Dilengkapi dengan lampiran scan KTP dinamis, upload file KTP ke RustFS object storage, auto-cleanup file saat data dihapus, fitur duplikasi riwayat, dan formatting layout A4 print / screen preview yang presisi.

### Implementasi
- **Database**:
  - Membuat tabel `bmn_power_of_attorneys` lengkap dengan kolom `ktp_path` untuk mencatat path file KTP di RustFS.
- **Backend (Laravel)**:
  - Membuat model `PowerOfAttorney`, resource `PowerOfAttorneyResource`, dan controller `PowerOfAttorneyController` untuk mengelola CRUD riwayat Surat Kuasa Kendaraan.
  - Endpoint `POST /api/bmn/power-of-attorneys` menerima `multipart/form-data`, memvalidasi file `ktp_image` dengan rules `UploadValidationRules::image(false, 10240)`, dan menyimpannya di RustFS dengan format nama dinamis `KTP-{NAMA_PEMBERI_KUASA}.jpeg`.
  - Endpoint `DELETE /api/bmn/power-of-attorneys/{id}` secara otomatis menghapus file KTP fisik terkait dari RustFS sebelum menghapus record database guna mencegah file sampah (*orphan files*).
  - Mengintegrasikan Surat Kuasa Kendaraan ke query arsip terpusat di `DocumentHistoryController`.
- **Frontend (Next.js)**:
  - Menyediakan form builder Surat Kuasa Kendaraan (Step 1 s.d 6) di `/bmn/reports`.
  - Menambahkan widget unggah file KTP (Step 5) dengan *Base64 live preview* dan tombol hapus/reset lampiran.
  - Memperbarui komponen `PowerOfAttorneyDocument` untuk merender KTP pada halaman lampiran baru secara dinamis menggunakan pemisah halaman `page-break-before: always; break-before: page;` (hanya jika pemberi kuasa adalah Pak Hardi atau mengunggah KTP kustom).
  - Merapikan alignment tanggal tanda tangan (sejajar horizontal), menghilangkan format bold/underline pada ttd, serta mencegah pelipatan (*wrapping*) teks kolom tabel BMN (No., Plat, Mesin, Rangka) dan nama ttd yang panjang melalui CSS `white-space: nowrap` dan Grid columns `1fr 1fr` dengan alignment `flex-end` yang dinamis.

### Validasi
- `php -l`: pass.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 95: Secure Private Storage for Vehicle Documents

> Document updated: 2026-06-18
> Status: PR #436 merged ke `main` (commit `aa18730`). Branch remote `issue/436-private-storage-signed-urls` sudah dihapus.

---

## Secure Private Storage for Vehicle Documents

### Status: SELESAI
- Scope: Nginx and BMN Backend Module
- Tujuan: Mengamankan dokumen kendaraan sensitif (BPKB & STNK) dengan memindahkannya ke private storage path, memblokir akses HTTP langsung via Nginx, dan membatasi akses inline preview/view ke pengguna terautentikasi melalui rute Laravel yang aman.

### Implementasi
- **Deployment**:
  - Memperbarui [nginx.conf](file:///e:/bksda-superapp/deploy/nginx.conf) untuk memblokir (`return 403`) request HTTP eksternal langsung ke subdirektori `/storage/private/bmn-documents/`.
- **Backend**:
  - Memperbarui [AssetPhotoController.php](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/AssetPhotoController.php) untuk mengarahkan upload BPKB/STNK (`bpkb_1` s.d `bpkb_4` dan `stnk_1` s.d `stnk_2`) ke folder `private/bmn-documents/`.
  - Menambahkan metode `view(string $assetId, string $type)` di `AssetPhotoController` untuk mengambil file dari storage (baik di local private path maupun bucket S3/RustFS) dan menampilkannya inline dengan header `Content-Type` yang tepat.
  - Memperbarui [api.php](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Routes/api.php) untuk mendaftarkan endpoint `/assets/{asset}/photo/{type}/view` terproteksi dengan middleware `permission:bmn.view`.
  - Memperbarui [AssetResource.php](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Resources/AssetResource.php) agar field BPKB/STNK URL menggunakan relative path `/api/bmn/assets/{id}/photo/{type}/view` sehingga cookies session terkirim otomatis pada pemuatan gambar `<img>` lintas domain/rewrite local dev.

### Validasi
- `php -l`: pass.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 94: Descriptive Audit Logging for Observability

> Document updated: 2026-06-18
> Status: PR #435 merged ke `main` (commit `8c0d29c`). Branch remote `issue/434-descriptive-audit-logs` sudah dihapus.

---

## Descriptive Audit Logging for Observability

### Status: SELESAI
- Scope: Backend Audit Logs Middleware
- Tujuan: Memperkuat jejak forensik keamanan (security observability) dengan mencatat label aksi deskriptif (`_action`) pada payload audit log untuk operasi sensitif (deletions, BMN bulk operations, login failures, dan modifications of access permissions).

### Implementasi
- **Backend**:
  - Memperbarui [AuditLogMiddleware.php](file:///e:/bksda-superapp/backend/app/Http/Middleware/AuditLogMiddleware.php) untuk menambahkan metode penentu aksi `determineAction(Request $request, Response $response)`.
  - Metode ini memindai rute request, metode HTTP, dan kode response status untuk melabeli aktivitas penting secara otomatis (User Login Success/Failure, BMN Bulk actions, Access updates, Soft deletes, dll.).
  - Menyimpan label aksi ini sebagai properti `_action` di dalam kolom database `payload` (JSON) yang terintegrasi, menjaga integritas skema database tanpa memerlukan migrasi tabel baru.

### Validasi
- `php -l`: pass.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 93: Secure Private Storage Folders

> Document updated: 2026-06-18
> Status: PR #433 merged ke `main` (commit `9ebe98f`). Branch remote `issue/432-private-storage-security` sudah dihapus.

---

## Secure Private Storage Folders

### Status: SELESAI
- Scope: Nginx Routing Configuration
- Tujuan: Melindungi file sensitif dari akses publik langsung via Nginx dengan memblokir request ke `/storage/private/dereporting/` dan `/storage/surat-tugas/`. Pengguna hanya dapat mengakses dokumen-dokumen tersebut melalui download controller Laravel yang terautentikasi.

### Implementasi
- **Deployment**:
  - Memperbarui [nginx.conf](file:///e:/bksda-superapp/deploy/nginx.conf) untuk mendefinisikan lokasi regex yang memblokir (`return 403`) request HTTP eksternal ke subdirektori `/storage/private/dereporting/` dan `/storage/surat-tugas/` sebelum request diteruskan ke RustFS.
  - folder publik lainnya seperti `employees/`, `bmn/`, dan `private/cms/` (logo & favicon website) tetap dapat diakses publik agar UI render dengan normal.

### Validasi
- `docker compose config`: pass.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 92: Content Security Policy (CSP) Enforcement

> Document updated: 2026-06-18
> Status: PR #431 merged ke `main` (commit `1cdd77d`). Branch remote `issue/430-enforce-csp` sudah dihapus.

---

## Content Security Policy (CSP) Enforcement

### Status: SELESAI
- Scope: Frontend Configuration
- Tujuan: Mengubah header Content Security Policy (CSP) dari Report-Only mode menjadi Enforce mode untuk memitigasi risiko serangan XSS dan injeksi sumber daya tidak sah secara aktif di production.

### Implementasi
- **Frontend**:
  - Memperbarui [next.config.ts](file:///e:/bksda-superapp/frontend/next.config.ts) untuk mengubah header key `Content-Security-Policy-Report-Only` menjadi `Content-Security-Policy`.
  - Menyesuaikan nama variabel internal dari `contentSecurityPolicyReportOnly` menjadi `contentSecurityPolicy` agar selaras.

### Validasi
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 91: Local Dev CSRF Proxy & Production Cookie Fix

> Document updated: 2026-06-18
> Status: PR #429 squash merged ke `main` (commit `a74c0ef`). Branch remote `issue/427-local-csrf-fix` sudah dihapus.

---

## Local Dev CSRF Proxy & Production Cookie Fix

### Status: SELESAI
- Scope: Backend Config, Frontend API Client, Deployment Config
- Tujuan: 
  1. Menyelesaikan issue CSRF token mismatch 419 lokal di development dengan mengarahkan request `/api`, `/sanctum`, dan `/storage` melalui Next.js rewrites.
  2. Menyelesaikan issue "Sesi Anda telah berakhir" secara langsung setelah login sukses di environment production (`https://bksdakaltim.net`) dengan mengkonfigurasi domain stateful Sanctum, CORS allowed origins, secure session cookies, dan session domain yang tepat.

### Implementasi
- **Backend**:
  - Memperbarui [sanctum.php](file:///e:/bksda-superapp/backend/config/sanctum.php) untuk menyertakan domain production (`bksdakaltim.net`, `www.bksdakaltim.net`, `api.bksdakaltim.net`) sebagai fallback stateful domains default.
  - Memperbarui [cors.php](file:///e:/bksda-superapp/backend/config/cors.php) agar `allowed_origins` dapat membaca comma-separated list dari `CORS_ALLOWED_ORIGINS` dengan fallback ke domain development dan production.
  - Memperbarui [session.php](file:///e:/bksda-superapp/backend/config/session.php) agar cookie session di-flag `secure` di production, dan domain session di-set ke `.bksdakaltim.net` secara default di production untuk cross-subdomain sharing.
- **Frontend**:
  - Memperbarui [next.config.ts](file:///e:/bksda-superapp/frontend/next.config.ts) untuk menambahkan rewrite rule ke `http://localhost:8000` di local development.
  - Memperbarui [api.ts](file:///e:/bksda-superapp/frontend/src/lib/api.ts) agar Axios `baseURL` diselesaikan secara dinamis (menggunakan relative URL `/api` di client local dev, absolute URL di SSR, dan fallback server-side URL).
  - Memperbarui [.env.local](file:///e:/bksda-superapp/frontend/.env.local) lokal agar menggunakan `NEXT_PUBLIC_API_URL=/api`.
- **Deployment**:
  - Menambahkan environment variables (`SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`, `SESSION_SECURE_COOKIE`, `SESSION_DOMAIN`) ke [docker-compose.prod.yml](file:///e:/bksda-superapp/docker-compose.prod.yml) and [docker-compose.dokploy.yml](file:///e:/bksda-superapp/docker-compose.dokploy.yml).

### Validasi
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 90: SPA CSRF Token Fix

> Document updated: 2026-06-18
> Status: PR #428 squash merged ke `main` (commit `a2d221a`). Branch remote `issue/427-fix-csrf-mismatch` sudah dihapus.

---

## SPA CSRF Token Fix

### Status: SELESAI
- Scope: Frontend API Client
- Tujuan: Menyelesaikan error `419 CSRF token mismatch` pada login SPA lintas asal (cross-origin, e.g. localhost:3000 -> localhost:8000) dengan melampirkan header `X-XSRF-TOKEN` secara manual ke Axios.

### Implementasi
- **Frontend**:
  - Menambahkan helper `getCookie(name: string)` pada [api.ts](file:///e:/bksda-superapp/frontend/src/lib/api.ts).
  - Pada request interceptor Axios, membaca cookie `XSRF-TOKEN` dan melampirkannya sebagai header `X-XSRF-TOKEN` secara manual untuk setiap request API. Hal ini menjamin ketersediaan header CSRF token untuk request lintas asal (cross-origin) di mana Axios tidak melampirkannya secara otomatis.

### Validasi
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.

---

# Progress - Phase 89: Sanctum SPA HttpOnly Cookie Authentication

> Document updated: 2026-06-18
> Status: PR #426 squash merged ke `main` (commit `80072f0`). Branch remote `issue/425-sanctum-cookie-auth` sudah dihapus.

---

## Sanctum SPA HttpOnly Cookie Authentication

### Status: SELESAI
- Scope: Backend dan Frontend Authentication
- Tujuan: Mengubah penyimpanan token otentikasi dari browser localStorage/cookie non-HttpOnly menjadi cookie HttpOnly session (Sanctum SPA) untuk menutup celah XSS token stealing.

### Implementasi
- **Backend**:
  - Mendaftarkan stateful API middleware (`$middleware->statefulApi()`) di `bootstrap/app.php` agar Laravel mengenali session dan CSRF cookie untuk SPA.
  - Memperbarui konfigurasi CORS di `config/cors.php` untuk mengizinkan rute `/sanctum/csrf-cookie`.
  - Memperbarui `AuthController@login` untuk mengautentikasi pengguna secara session-based menggunakan `Auth::guard('web')->login($user, true)` untuk memicu cookie HttpOnly session, sementara tetap mengembalikan fallback token untuk kecocokan API terproteksi.
  - Memperbarui `AuthController@logout` untuk membatalkan (invalidate) session, meregenerasi CSRF token, dan menghapus session cookie di samping token API.
- **Frontend**:
  - Memperbarui halaman login ([page.tsx](file:///e:/bksda-superapp/frontend/src/app/(auth)/login/page.tsx)) agar melakukan fetch CSRF cookie dari `/sanctum/csrf-cookie` terlebih dahulu sebelum melakukan submit request login.
  - Memperbarui `auth-store.ts` untuk tidak lagi menyimpan plain text token ke `localStorage` atau cookie non-HttpOnly. Sebagai gantinya, store menggunakan cookie/local state `bksda_logged_in=true` sebagai indikator login visual dan internal.
  - Memperbarui Next.js middleware ([proxy.ts](file:///e:/bksda-superapp/frontend/src/proxy.ts)) untuk menggunakan cookie `bksda_logged_in` dalam memeriksa status login sebelum memproses routing.

### Validasi
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `php artisan route:list`: pass.

---

# Progress - Phase 88: BMN Granular Permissions

> Document updated: 2026-06-18
> Status: PR #424 squash merged ke `main` (commit `4774492`). Branch remote `issue/423-bmn-granular-permissions` sudah dihapus.

---

## BMN Granular Permissions

### Status: SELESAI
- Scope: Backend dan Frontend Modul BMN
- Tujuan: Membatasi aksi-aksi sensitif di modul BMN secara granular menggunakan hak akses (permission) alih-alih role admin/super admin kasar.

### Implementasi
- **Database**:
  - Menambahkan kolom `permissions` (tipe JSON nullable) di tabel `users` untuk menyimpan array permission per user.
- **Backend**:
  - Menambahkan method `hasPermission` pada model `User` dengan backward compatibility (jika kolom `permissions` bernilai `null`, `bmn.view` dan `bmn.document.history.view` diizinkan jika user memiliki akses modul BMN, sedangkan aksi write/mutasi memerlukan role `admin`).
  - Membuat dan mendaftarkan middleware `CheckPermission` (alias: `permission`).
  - Melindungi rute-rute API di BMN (`Routes/api.php`) secara granular menggunakan middleware `permission:...`.
  - Memperbarui `EmployeeAccessRequest` dan `EmployeeAccessController` untuk mendukung penyimpanan permissions array saat menyimpan/mengedit akses pegawai.
- **Frontend**:
  - Memperbarui `StoredUser` di `auth-store.ts` dan menambahkan helper `hasPermission` di hook `useRole.ts`.
  - Menambahkan checkbox checklist BMN Granular Permissions di form/sheet Edit Akses Pegawai (`EmployeeAccessSheet.tsx`).
  - Memperbarui filter menu navigasi di `bmn/layout.tsx` menggunakan checks `hasPermission`.
  - Melindungi visual tombol/aksi sensitif pada halaman-halaman BMN (Disposal, Import Review, Reports, Asset Detail, Photo Gallery, dll.) menggunakan `hasPermission` check.

### Validasi
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `php artisan route:list`: pass.

---

# Progress - Phase 87: Auth Cookie Lifetime Hardening

> Document updated: 2026-06-18
> Status: PR #421 squash merged ke `main` (commit `8043e34`). Branch remote `codex/security-auth-cookie-hardening` sudah dihapus.

---

## Browser Auth Storage Hardening Ringan

### Status: SELESAI
- Scope: frontend auth store cookie helper.
- Tujuan: mengurangi masa berlaku token di browser dan menambah atribut cookie yang lebih aman tanpa migrasi besar ke Sanctum SPA HttpOnly cookie.

### Implementasi
- Cookie auth (`bksda_token`, `bksda_user`) sekarang memakai helper terpusat.
- `max-age` cookie diturunkan dari 7 hari menjadi 24 jam agar selaras dengan `SANCTUM_EXPIRATION=1440`.
- Cookie otomatis diberi atribut `Secure` saat aplikasi berjalan di HTTPS.
- Value cookie di-encode/decode lewat `encodeURIComponent` / `decodeURIComponent`.
- Logout memakai helper delete cookie yang konsisten.

### Validasi
- `npm run lint`: pass.
- `npm run build`: pass.
- Browser bawaan Codex:
  - `/login` dengan sesi aktif tetap redirect ke `/portal`.
  - portal superadmin tetap load normal setelah perubahan auth store.

### Catatan
- Ini belum menyelesaikan target besar migrasi ke cookie HttpOnly. Itu tetap butuh PR terpisah karena menyentuh login backend, CSRF, CORS, RouteGuard, dan deployment env.
- File untracked lokal `frontend/public/header.png` tidak disentuh.

---

# Progress - Phase 86: Frontend Dependency Mitigation

> Document updated: 2026-06-18
> Status: PR #419 squash merged ke `main` (commit `0ac4cf0`). Branch remote `codex/security-frontend-dependency-mitigations` sudah dihapus.

---

## PostCSS Override dan Quill Content Sanitization

### Status: SELESAI
- Scope: frontend dependency audit dan CMS rich text editor.
- Tujuan: menutup vulnerability moderate yang masih tersisa dan menurunkan risiko XSS dari output HTML editor.

### Implementasi
- Menambahkan `overrides.postcss` ke `package.json` agar PostCSS nested yang dipakai Next ikut naik ke versi aman.
- Lockfile frontend diperbarui lewat `npm install`.
- Konten Quill pada CMS berita sekarang disanitasi sebelum dikirim ke backend:
  - create berita.
  - edit berita.

### Validasi
- `npm audit --omit=dev --audit-level=moderate`: pass, tidak ada moderate/high/critical tersisa.
- `npm audit --omit=dev --audit-level=low`: masih ada 2 low pada `quill/react-quill-new`; npm menawarkan `--force` yang men-downgrade `react-quill-new` ke `3.7.0` dan berisiko breaking, jadi mitigasi dilakukan dengan sanitasi konten sebelum submit.
- `npm ls postcss`: semua PostCSS resolve ke `8.5.15`.
- `npm run lint`: pass.
- `npm run build`: pass.
- Browser bawaan Codex:
  - `/cms/informasi/create` load normal.
  - editor Quill tampil.
  - tidak ada console error.

### Catatan
- Dev server lokal sempat perlu distart ulang setelah proses validasi build membersihkan lock `.next`.
- File untracked lokal `frontend/public/header.png` tidak disentuh.

---

# Progress - Phase 85: Audit Log Payload Sanitizer

> Document updated: 2026-06-18
> Status: PR #417 squash merged ke `main` (commit `bb3b212`). Branch remote `codex/security-audit-payload-sanitizer` sudah dihapus.

---

## Security Observability Hardening

### Status: SELESAI
- Scope: middleware audit log global API.
- Tujuan: audit log tetap mencatat aksi write API, tetapi tidak menyimpan secret, token nested, raw upload file, atau payload besar secara mentah.

### Implementasi
- Menambahkan sanitizer payload di `AuditLogMiddleware`.
- Secret key sensitif sekarang dimasking rekursif, termasuk:
  - password/current password/new password.
  - token/access token/refresh token.
  - authorization/api key/secret.
- File upload tidak disimpan sebagai object/raw payload, tetapi diringkas menjadi metadata:
  - nama file.
  - MIME.
  - extension.
  - ukuran file.
- String panjang dipotong agar audit log tidak membengkak.
- Array besar dibatasi jumlah itemnya dan diberi flag `_truncated`.

### Validasi
- `php -l backend/app/Http/Middleware/AuditLogMiddleware.php`: pass.
- `php artisan route:list --path=api/login --json`: pass.
- Script PHP ad hoc untuk sanitizer payload: pass (password/token nested ter-redact, file menjadi metadata, string panjang terpotong).
- Browser bawaan Codex:
  - `/bmn/import-review` load normal sebagai superadmin.
  - upload import tampil.
  - tidak ada console error.
- `php artisan test`: masih gagal di test bawaan `Tests\Feature\ExampleTest::test_the_application_returns_a_successful_response` karena route `/` backend mengembalikan 404, tidak terkait perubahan audit middleware.

### Catatan
- Audit middleware sudah global untuk API write method, jadi perubahan ini langsung melindungi log dari banyak endpoint sekaligus.
- File untracked lokal `frontend/public/header.png` tidak disentuh.

---

# Progress - Phase 84: CSP Report-Only dan Sanitizer Hardening

> Document updated: 2026-06-18
> Status: PR #415 squash merged ke `main` (commit `a3e9808`). Branch remote `codex/security-csp-xss-hardening` sudah dihapus.

---

## XSS Blast Radius Reduction

### Status: SELESAI
- Scope: frontend security header dan sanitizer HTML publik.
- Tujuan: mengurangi dampak XSS tanpa langsung mematahkan halaman print, preview dokumen, dan konten CMS yang masih memakai inline style.

### Implementasi
- Menambahkan `Content-Security-Policy-Report-Only` di `next.config.ts`.
  - mode report-only dipilih sebagai langkah aman sebelum enforce karena aplikasi masih punya print preview dan style inline.
  - directive penting: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'self'`, dan pembatasan `frame-src` YouTube.
- Memperketat `sanitizeHtml`:
  - SSR fallback tidak lagi mengembalikan HTML mentah.
  - URL dibatasi ke protokol aman.
  - iframe hasil CMS hanya diizinkan untuk embed YouTube/YouTube-nocookie.
  - link `target="_blank"` otomatis diberi `rel="noopener noreferrer"`.

### Validasi
- `npm run lint`: pass.
- `npm run build`: pass.
- Browser bawaan Codex:
  - halaman publik `/` load normal.
  - tidak ada console error setelah perubahan sanitizer.

### Catatan
- CSP masih report-only. Setelah observasi produksi aman, PR lanjutan bisa memindahkan policy ke enforce dan memperketat `script-src`/`style-src`.
- File untracked lokal `frontend/public/header.png` tidak disentuh.

---

# Progress - Phase 83: File Upload Validation Hardening

> Document updated: 2026-06-18
> Status: PR #413 squash merged ke `main` (commit `5e8ac5d`). Branch remote `codex/security-file-upload-hardening` sudah dihapus.

---

## Hardening Upload File dan Import

### Status: SELESAI
- Scope: backend upload/import validation untuk BMN, Inventory, Kepegawaian, Surat Tugas, DE Reporting, CMS, dan profile photo.
- Tujuan: mengurangi risiko file spoofing, upload tipe berbahaya, dan error detail dari parser import yang bocor ke user.

### Implementasi
- Menambahkan helper `UploadValidationRules` untuk rule upload yang konsisten:
  - spreadsheet import: `xlsx`, `xls`, `csv`, MIME check, extension check, dan batas ukuran.
  - image upload: `jpg`, `jpeg`, `png`, `webp`, MIME check, extension check, dan batas ukuran.
- Memperketat upload/import:
  - BMN import review.
  - BMN direct asset import.
  - foto aset BMN dan update geotag.
  - Inventory item import.
  - foto profile portal.
  - foto pegawai.
  - Surat Tugas attachment.
  - DE Reporting attachment internal/eksternal.
  - CMS thumbnail/file upload.
- Error import spreadsheet sekarang dibuat generic untuk user, sementara detail teknis dicatat ke log backend.
- Pagination import review dibatasi maksimal 200 item per request agar endpoint tidak mudah dipakai untuk query besar.

### Validasi
- `php -l` seluruh file backend yang diubah: pass.
- `composer audit --no-dev`: clean.
- `php artisan route:list --path=bmn --json`: pass.
- `php artisan route:list --path=cms --json`: pass.
- Browser bawaan Codex:
  - login superadmin lokal masih aktif.
  - `/bmn/import-review` load normal.
  - upload import tampil untuk superadmin.
  - tidak ada console error.

### Catatan
- Hardening ini belum mengganti storage publik ke private/signed URL. Itu tetap menjadi PR lanjutan karena butuh review dampak akses file lama.
- File untracked lokal `frontend/public/header.png` tidak disentuh.

---

# Progress - Phase 82: BMN Admin-only UI Visibility

> Document updated: 2026-06-18
> Status: PR #412 squash merged ke `main` (commit `e1c00e4`). Branch remote `codex/bmn-admin-ui-visibility` sudah dihapus.

---

## Sinkronisasi UI dengan Authorization Backend BMN

### Status: SELESAI
- Scope: frontend visibility guard untuk aksi sensitif BMN yang sudah diproteksi backend di Phase 81.
- Tujuan: user non-admin tidak melihat tombol/aksi yang pasti ditolak backend, sementara admin/super admin tetap bisa bekerja normal.

### Implementasi
- Halaman `Aset Dihapus`:
  - checkbox seleksi, bulk restore, dan hapus permanen hanya tampil untuk `admin` / `super_admin`.
  - mode non-admin menjadi read-only.
- Halaman `Import Review`:
  - upload file import hanya tampil untuk `admin` / `super_admin`.
  - user non-admin melihat notice read-only dan tetap bisa membuka riwayat.
- Detail `Import Review`:
  - approve/reject, bulk selection, checkbox row, dan checkbox perubahan per kolom hanya aktif untuk `admin` / `super_admin`.
  - non-admin bisa melihat detail batch sebagai read-only.
- Halaman `Laporan > Riwayat Dokumen`:
  - tombol hapus arsip BA Pemakaian dan BA Serah Terima hanya tampil untuk `admin` / `super_admin`.

### Validasi
- `npm run lint`: pass.
- `npm run build`: pass.
- Browser bawaan Codex:
  - login superadmin lokal berhasil.
  - `/bmn/reports`: tab Riwayat Dokumen terbuka, tombol `Lihat`, `Cetak`, `Duplikasi`, dan `Hapus` tampil untuk superadmin.
  - `/bmn/import-review`: upload file tampil untuk superadmin.
  - `/bmn/disposal`: deskripsi dan mode aksi admin tampil untuk superadmin.

### Catatan
- Backend tetap menjadi sumber kebenaran authorization. UI guard ini untuk UX dan mengurangi peluang aksi tidak sah dari permukaan aplikasi.
- File untracked lokal `frontend/public/header.png` tidak disentuh.

---

# Progress - Phase 81: BMN Authorization Hardening

> Document updated: 2026-06-18
> Status: PR #411 squash merged ke `main` (commit `84d933d`). Branch remote `codex/bmn-authorization-hardening` sudah dihapus.

---

## Hardening Aksi Sensitif BMN

### Status: SELESAI
- Scope: backend route protection untuk modul BMN.
- Tujuan: mencegah user yang hanya punya akses modul BMN menjalankan aksi destruktif/mutasi besar langsung lewat API.

### Implementasi
- Route BMN tetap dilindungi lapis dasar:
  - `auth:sanctum`
  - `module.access:bmn`
- Menambahkan lapis role untuk aksi sensitif menggunakan middleware:
  - `role:admin`
  - `super_admin` tetap bypass sesuai `CheckRole`.
- Aksi yang sekarang wajib `admin` atau `super_admin`:
  - delete `usage-agreements`
  - delete `handover-agreements`
  - `assets/import`
  - single dispose aset
  - `bulk-dispose`
  - `bulk-restore`
  - `bulk-force-delete`
  - `bulk-update-kondisi`
  - upload import review
  - approve import review
  - reject import review

### Validasi
- `php -l backend/app/Modules/Bmn/Routes/api.php`: pass.
- `php artisan route:list --json --path=bmn`: route sensitif sudah memuat middleware `CheckRole:admin`.

### Catatan
- Ini hardening backend dulu. UI button/visibility bisa dipoles di PR lanjutan agar user non-admin tidak melihat aksi yang pasti ditolak.
- Permission granular per aksi (`bmn.asset.force_delete`, `bmn.import.approve`, dll.) masih menjadi target lanjutan jika role `admin` dirasa terlalu kasar.

---

# Progress - Phase 80: Security Remediation Hotfix

> Document updated: 2026-06-18
> Status: PR #410 squash merged ke `main` (commit `fcbb8fa`). Branch remote `codex/security-remediation-hotfix` sudah dihapus.

---

## Security Audit Follow-up

### Status: SELESAI
- Scope: hotfix security awal yang aman untuk aplikasi production.
- Tujuan: menutup risiko high/critical yang tidak membutuhkan migrasi auth besar dan menyiapkan rencana remediation bertahap.

### Implementasi
- Menambahkan dokumen rencana perbaikan di `docs/security-remediation-plan.md`.
- Menambahkan rate limit login:
  - limiter bernama `login`
  - batas `5 request/menit`
  - key limiter memakai kombinasi `username + IP`
- Mengaktifkan expiry token Sanctum default `1440` menit via `SANCTUM_EXPIRATION`.
- Saat user mengganti password, seluruh token Sanctum user tersebut direvoke.
- Membersihkan `.gitignore` agar file sensitif dan helper lokal tidak mudah masuk Git:
  - `*.pem`
  - `*.key`
  - `service-account.json`
  - `.env*`
  - helper import/test/deploy lokal
  - dump data lokal
- Mengupdate lockfile dependency backend dan frontend.

### Hasil Security
- `composer audit --no-dev`: clean.
- `npm audit --omit=dev --audit-level=high`: tidak ada high vulnerability tersisa.
- `npm audit --omit=dev --audit-level=moderate`: masih ada moderate/low pada `next/postcss` dan `react-quill-new/quill`; npm hanya menawarkan `--force` yang berpotensi breaking, jadi sengaja dipisahkan ke PR lanjutan.

### Validasi
- `php -l` file backend terkait: pass.
- `php artisan route:list --path=api/login`: pass.
- `cd frontend; npm run lint`: clean.
- `cd frontend; npm run build`: sukses.

### Catatan Production
- Perubahan belum otomatis aktif di `bksdakaltim.net` sampai Dokploy/redeploy menarik `main` terbaru.
- Perubahan `SANCTUM_EXPIRATION` dapat membuat token lama yang melewati window expiry dianggap expired setelah deploy.
- Migrasi token dari `localStorage` ke cookie HttpOnly belum dikerjakan karena blast radius login/CORS/session lebih besar dan harus jadi PR terpisah.

---

# Progress - Phase 79: Data Kendaraan dan SK Kebenaran Dokumen

> Document updated: 2026-06-18
> Status: Data lokal dan production sudah diupdate. PR #409 squash merged ke `main` (commit `64a96f3`).

---

## Data Kendaraan BMN

### Status: SELESAI
- Scope: aset `ALAT ANGKUTAN BERMOTOR` di database lokal dan database production `bksdakaltim.net`.
- Tujuan: melengkapi data kendaraan agar dokumen lelang dan dokumen kebenaran kepemilikan menampilkan identitas kendaraan yang benar.

### Implementasi Data
- Mengupdate data kendaraan berdasarkan `no_polisi` dengan normalisasi plat nomor.
- Kolom yang diisi dari data kendaraan:
  - `no_mesin`
  - `no_rangka`
  - `tanggal_pajak_stnk`
  - `tanggal_ganti_plat`
- Hasil update:
  - Lokal: 50 aset berhasil diupdate.
  - Production: 50 aset berhasil diupdate.
- Ada 4 plat yang tidak ditemukan di database dan tidak dipaksakan update agar aman:
  - `KT5422M`
  - `KT5416M`
  - `KT5418M`
  - `KT6384F`
- Menyamakan nomor dokumen kepemilikan khusus kendaraan bermotor:
  - `no_dokumen`
  - `no_bpkp`
  - `no_sertifikat`
- Hasil penyamaan nomor dokumen:
  - Lokal: 76 kendaraan berhasil diupdate.
  - Production: 76 kendaraan berhasil diupdate.
  - 19 kendaraan tidak diubah karena belum memiliki nomor dokumen kepemilikan.

### Implementasi Kode
- Memperbaiki dokumen `SK Kebenaran Fotokopi Dokumen Kepemilikan`.
- Kolom `Nomor Dokumen Kepemilikan` sebelumnya membaca `no_identitas`, sehingga nomor dokumen/BPKB tidak tampil.
- Sekarang kolom tersebut memakai fallback:
  - `no_bpkp`
  - `no_dokumen`
  - `no_sertifikat`
  - `no_identitas`
- Menambahkan field dokumen kepemilikan ke tipe `AuctionAsset` frontend.

### Validasi
- Sample lokal dan production diverifikasi untuk beberapa plat:
  - `KT 8615 M`
  - `KT 8819 B`
  - `KT 1204 BZ`
  - `KT 8425 BZ`
  - `KT 8619 M`
- Sample nomor dokumen kepemilikan diverifikasi:
  - `KT 8572 M`
  - `KT 8615 M`
  - `KT 6620 BZ`
- `cd frontend; npm run lint` clean.
- `cd frontend; npx tsc --noEmit` clean.

---

# Progress - Phase 78: UX Polish Aset Akan Dilelang

> Document updated: 2026-06-17
> Status: PR #408 squash merged ke `main` (commit `f8fa707`).

---

## Halaman `/bmn/auction-candidates`

### Status: MERGED
- Scope: UI/UX halaman `Aset Akan Di Lelang`.
- Tujuan: menaikkan kualitas pengalaman kerja menuju 9/10 dengan alur yang lebih jelas, warna lebih tenang, dan aksi dokumen lebih mudah dipahami.

### Implementasi
- Menambahkan stepper workflow 3 langkah:
  - `Pilih aset`
  - `Atur detail`
  - `Generate dokumen`
- Menyusun ulang halaman agar tabel aset menjadi fokus awal sebelum detail nomor surat dan generate dokumen.
- Mengubah `Generate Dokumen Lelang` dari tombol warna-warni menjadi panel dokumen netral yang dikelompokkan:
  - Berita acara
  - Surat keputusan
  - Surat pendukung
- Memindahkan pengaturan nomor surat dari panel global ke masing-masing preview dokumen:
  - kartu nomor muncul di panel kiri preview,
  - untuk BA Pemeriksaan posisinya di atas form `Pemeriksa`,
  - setiap kartu menampilkan preview nomor, input nomor, dan input KAP.
- Menambahkan state disabled yang lebih konsisten untuk dokumen yang membutuhkan aset terpilih.
- Mengubah banner aset terpilih menjadi sticky action bar bernuansa emerald:
  - menampilkan jumlah aset terpilih,
  - menampilkan jumlah dokumen siap cetak,
  - menyediakan tombol cetak cepat untuk dokumen yang sudah digenerate.
- Merapikan panel `Urutan Aset Terpilih`:
  - teks instruksi lebih bersih,
  - separator metadata tidak mojibake,
  - ukuran tombol naik/turun lebih nyaman.
- Merapikan picker `Penandatangan Kepala Balai` agar teks placeholder kosong tidak menampilkan karakter mojibake.
- Menambahkan tombol `Jadikan ini sebagai default` pada picker global `Penandatangan Kepala Balai`; pilihan tersimpan lokal dan otomatis dipakai kembali saat halaman dibuka.

### Validasi
- `cd frontend; npm run lint` clean.
- `cd frontend; npx tsc --noEmit` clean.

---

# Progress - Phase 77: Pagination Riwayat Dokumen BMN

> Document updated: 2026-06-17
> Status: WIP lokal (`codex/reports-history-pagination`). Belum PR, belum deploy production.

---

## Riwayat Dokumen `/bmn/reports`

### Status: WIP - siap dicek
- Scope: tab `Riwayat Dokumen` pada halaman `/bmn/reports`.
- Tujuan: memperbaiki UX arsip dokumen dan mencegah loading lambat saat histori BA makin banyak.

### Implementasi
- Backend menambah endpoint arsip gabungan:
  - `GET /api/bmn/document-histories`
- Endpoint menggabungkan data:
  - BA Pemakaian BMN (`bmn_usage_agreements`)
  - BA Serah Terima BMN (`bmn_handover_agreements`)
- Endpoint mendukung filter server-side:
  - `type=all|usage_agreement|handover_agreement`
  - `employee_id`
  - `search`
  - `page`
  - `per_page`
- Frontend tab `Riwayat Dokumen` diubah menjadi satu tabel arsip gabungan.
- UI baru menambahkan:
  - segmented filter `Semua / BA Pemakaian / BA Serah Terima`,
  - search debounce,
  - filter pegawai,
  - pilihan 10/25/50 data per halaman,
  - pagination `Sebelumnya/Berikutnya`,
  - badge jenis dokumen,
  - aksi `Lihat`, `Cetak`, `Duplikasi`, `Hapus`.
- Query riwayat hanya aktif saat tab `Riwayat Dokumen` dibuka agar tab lain tidak ikut memuat arsip.

### Validasi
- `php -l backend/app/Modules/Bmn/Controllers/DocumentHistoryController.php` clean.
- `php -l backend/app/Modules/Bmn/Routes/api.php` clean.
- `cd backend; php artisan route:list --path=bmn/document-histories` clean.
- `cd frontend; npm run lint` clean.
- `cd frontend; npx tsc --noEmit` clean.

---

# Progress - Phase 76: BA Serah Terima BMN

> Document updated: 2026-06-17
> Status: Issue #404 **MERGED**. PR #406 squash merged ke `main` (commit `a50cd1b`). Belum deploy production.

---

## Issue #404: Generate BA Serah Terima BMN

### Status: MERGED
- GitHub Issue: #404 `feat(bmn): add BA serah terima document generator`
- PR: #406 `feat(bmn): add BA serah terima generator (#404)` squash merged.
- Scope: halaman `/bmn/reports`, backend history/snapshot BA Serah Terima BMN.

### Implementasi
- Backend menambah tabel `bmn_handover_agreements` untuk histori BA Serah Terima.
- Setiap BA menyimpan snapshot:
  - varian dokumen (`general_goods` atau `vehicle`),
  - pihak kesatu,
  - pihak kedua,
  - pejabat mengetahui,
  - daftar barang/kendaraan,
  - nomor, KAP, tanggal dokumen, metadata keterangan, pembuat.
- API baru:
  - `GET /api/bmn/handover-agreements`
  - `POST /api/bmn/handover-agreements`
  - `GET /api/bmn/handover-agreements/{agreement}`
  - `DELETE /api/bmn/handover-agreements/{agreement}`
- Untuk varian `vehicle`, item wajib berasal dari `bmn_assets` melalui `asset_ids`; tidak ada input kendaraan manual.
- Untuk varian `general_goods`, item bisa dipilih dari data BMN atau ditambah manual dengan nama barang, jumlah, dan NUP.
- Frontend `/bmn/reports` menambah dokumen `BA Serah Terima` di tab `Generate Dokumen`.
- Builder BA Serah Terima mendukung:
  - pilihan varian barang umum atau kendaraan,
  - detail judul/nomor/KAP/tanggal/keterangan,
  - Pihak Kesatu dan Pihak Kedua dari data pegawai lalu bisa diedit,
  - blok `Mengetahui`,
  - barang umum dari dropdown BMN plus baris manual,
  - kendaraan dari katalog BMN saja,
  - preview A4 memakai kop `/header-terbaru.png`,
  - tombol cetak,
  - tombol simpan riwayat.
- Tab `Riwayat Dokumen` menampilkan daftar BA Serah Terima dengan pencarian/filter pegawai dan aksi lihat, cetak, duplikasi, hapus.

### Validasi
- `php -l backend/app/Modules/Bmn/Controllers/HandoverAgreementController.php` clean.
- `php -l backend/app/Modules/Bmn/Models/HandoverAgreement.php` clean.
- `php -l backend/app/Modules/Bmn/Resources/HandoverAgreementResource.php` clean.
- `php -l backend/app/Modules/Bmn/Migrations/2026_06_17_090000_create_bmn_handover_agreements_table.php` clean.
- `cd backend; php artisan route:list --path=bmn/handover-agreements` clean.
- `cd frontend; npm run lint` clean.
- `cd frontend; npx tsc --noEmit` clean.
- `cd frontend; npm run build` clean (59/59 routes).
- Browser lokal redirect ke `/login`, sehingga visual authenticated page belum diverifikasi dari sesi Codex.

---

# Progress - Phase 75: BA Pemakaian BMN Per Pegawai

> Document updated: 2026-06-18
> Status: Issue #402 **SELESAI**. PR #403 squash merged ke `main` (commit `2d02cbe`). Tabel `bmn_usage_agreements` dan API endpoint terkait selesai diimplementasikan, UI workspace bertab `/bmn/reports` dirombak dan telah di-deploy ke production Dokploy.

---

## Issue #402: Generate BA Pemakaian BMN per pegawai

### Status: WIP - UI lokal siap dicek
- GitHub Issue: #402 `feat(bmn): generate BA pemakaian BMN per pegawai`
- Branch: `issue/402-ba-pemakaian-bmn`
- PR: #403 `feat(bmn): generate BA pemakaian BMN per pegawai (#402)`; belum di-push ulang setelah redesign tab karena menunggu review user.
- Scope: halaman `/bmn/reports`, backend history/snapshot BA Pemakaian BMN.

### Implementasi
- Backend menambah tabel `bmn_usage_agreements` untuk histori BA Pemakaian BMN.
- Setiap BA menyimpan snapshot:
  - pihak pertama,
  - pihak kedua/pegawai,
  - daftar aset,
  - nomor, KAP, tanggal dokumen, catatan, pembuat.
- API baru:
  - `GET /api/bmn/usage-agreements`
  - `POST /api/bmn/usage-agreements`
  - `GET /api/bmn/usage-agreements/{agreement}`
- Backend membatasi aset yang disimpan agar tetap aset yang terasosiasi dengan pegawai terkait.
- Frontend `/bmn/reports` memakai workspace bertab:
  - `Export Laporan` untuk katalog aset, riwayat peminjaman, dan biaya pemeliharaan,
  - `Generate Dokumen` untuk builder dokumen BMN,
  - `Riwayat Dokumen` untuk history dokumen pegawai.
- Tab `Generate Dokumen` menambah builder `BA Pemakaian BMN`:
  - pilih pegawai,
  - tampilkan BA terakhir pegawai terpilih sebagai referensi,
  - aksi arsip pegawai: lihat, cetak, atau duplikasi sebagai BA baru,
  - auto-load aset BMN pegawai,
  - pilih aset yang masuk BA,
  - edit nomor/KAP/tanggal/catatan,
  - Pihak Pertama bisa dipilih dari data pegawai atau memakai default M. Ari Wibawanto,
  - preview dokumen A4 dengan kop `/header-terbaru.png`,
  - tombol cetak,
  - tombol simpan riwayat.
- Tab `Riwayat Dokumen` default menampilkan semua BA Pemakaian yang pernah digenerate, dengan filter pegawai dan pencarian nomor BA/nama/NIP/pembuat.
- Dokumen tersimpan diperlakukan sebagai arsip/final: tidak diedit langsung, tetapi bisa dilihat, dicetak ulang, diduplikasi sebagai BA baru, atau dihapus melalui konfirmasi.
- Portal pegawai belum ditampilkan, tetapi struktur history sudah siap dipakai endpoint `employee_id` di masa depan.

### Validasi
- `php -l app/Modules/Bmn/Controllers/UsageAgreementController.php` clean.
- `php -l app/Modules/Bmn/Models/UsageAgreement.php` clean.
- `php -l app/Modules/Bmn/Resources/UsageAgreementResource.php` clean.
- `php -l app/Modules/Bmn/Migrations/2026_06_12_090000_create_bmn_usage_agreements_table.php` clean.
- `cd backend; php artisan route:list` clean.
- `cd frontend; npm run lint -- --max-warnings=0` clean.
- `cd frontend; npx tsc --noEmit` clean.
- `cd frontend; npm run build` clean (59/59 routes).

---

# Progress - Phase 74: BMN Asset Photo Documentation Layout

> Document updated: 2026-06-11
> Status: Issue #400 **MERGED + DEPLOYED** (PR #401 squash merged ke `main`, commit `6c7f1fd`). Production Dokploy running on new EC2 public IP `15.134.31.68`; DNS masih perlu diarahkan dari `15.135.114.1` ke IP baru.

---

## Issue #400: Rombak layout dokumentasi foto detail aset BMN

### Status: MERGED + DEPLOYED
- GitHub Issue: #400 `feat(bmn): restructure asset photo documentation layout`
- Branch: `issue/400-asset-photo-layout`
- PR: #401 `feat(bmn): restructure asset photo documentation layout (#400)` squash merged ke `main` commit `6c7f1fd`.
- Scope: halaman detail aset `/bmn/assets/[id]`.

### Implementasi
- Slot foto utama diubah menjadi:
  - `Foto Geotag` (khusus foto geotag, tidak lagi menjadi tampak depan).
  - `Tampak Depan` memakai kolom khusus baru `foto_depan_path`.
  - `Tampak Belakang` memakai `foto_belakang_*`.
  - `Tampak Kiri` memakai `foto_kiri_*`.
  - `Tampak Kanan` memakai `foto_kanan_*`.
- Di bawah label `Tampak Depan` ditambahkan input teks manual untuk lokasi/ruangan barang.
- Input lokasi/ruangan menyimpan ke field existing `lokasi_spesifik` via update asset API.
- Backend ditambah migration `foto_depan_path`, valid upload type `depan`, resource URL `foto_depan_url`, dan cleanup file saat force delete aset.
- Tidak lagi auto-menampilkan `lokasi_ruang/resor` sebagai keterangan Tampak Depan karena posisi barang bisa lebih spesifik di ruangan tertentu.

### Validasi
- `cd backend; php -l app/Modules/Bmn/Controllers/AssetPhotoController.php` clean.
- `cd backend; php -l app/Modules/Bmn/Models/Asset.php` clean.
- `cd backend; php -l app/Modules/Bmn/Resources/AssetResource.php` clean.
- `cd backend; php -l app/Modules/Bmn/Migrations/2026_06_11_120000_add_foto_depan_path_to_bmn_assets_table.php` clean.
- `cd backend; php artisan route:list` clean.
- `cd frontend; npm run lint -- --max-warnings=0` clean.
- `cd frontend; npx tsc --noEmit` clean.
- `cd frontend; npm run build` clean (59/59 routes).

### Production Deploy
- EC2 sempat reboot/stop-start karena build frontend membuat VPS 2GB RAM tidak responsif.
- Public IPv4 berubah dari `15.135.114.1` ke `15.134.31.68`; semua A record produksi perlu diarahkan ke IP baru (`@`, `api`, `storage`, `dokploy`).
- Swap 2GB ditambahkan permanen di VPS (`/swapfile`) supaya build berikutnya tidak mudah membekukan host.
- Dokploy repo server berada di commit `6c7f1fd`.
- Backend image baru di-recreate, migration `2026_06_11_120000_add_foto_depan_path_to_bmn_assets_table` sukses `DONE`.
- Frontend image rebuilt/recreated.
- Traefik `dokploy-traefik` sempat exited setelah reboot dan sudah di-start ulang.
- Smoke test via `curl --resolve ...:443:15.134.31.68` clean:
  - `https://bksdakaltim.net/login` HTTP 200.
  - `https://api.bksdakaltim.net/api/health` HTTP 200.
  - `https://dokploy.bksdakaltim.net` HTTP 200.

---

# Progress - Phase 73: BMN Import Review Per-Field Approval

> Document updated: 2026-06-11
> Status: Issue #398 **MERGED** (PR #399 squash merged ke `main`, commit `cc2f84f`). Production Dokploy sudah live; issue #398 belum deploy production.

---

## Issue #398: Approve perubahan Import Review BMN per kolom

### Status: MERGED
- GitHub Issue: #398 `feat(bmn): approve import review changes per field`
- Branch: `issue/398-import-review-per-field-approval`
- PR: #399 `feat(bmn): approve import review changes per field (#398)` squash merged ke `main` commit `cc2f84f`.
- Tujuan: reviewer bisa menerima hanya kolom tertentu pada baris `Update`, misalnya hanya `tanggal_pengapusan`, tanpa ikut mengubah `nup_lama` atau `foto_geotag_url`.

### Implementasi
- Backend: tambah endpoint `POST /api/bmn/import-review/toggle-field-selection`.
- Pilihan kolom disimpan backward-compatible di JSON `changed_fields[field].selected`.
- Data staging lama yang belum punya `selected` tetap dianggap terpilih.
- `approve()` sekarang hanya apply changed field dengan `selected !== false`.
- Setiap field yang benar-benar di-apply dari import review dicatat ke `bmn_asset_updates` dengan alasan `Import review: <filename>`, jadi tab Riwayat aset hanya menampilkan kolom yang disetujui.
- Row checkbox dan bulk selection tetap berfungsi: pilih row = semua kolom update dipilih; batal row = semua kolom update batal.
- `updated` counter hanya bertambah jika ada minimal satu kolom yang benar-benar di-update.
- Frontend: setiap diff kolom pada baris `Update` punya checkbox dan indikator `Kolom disetujui: X/Y`.
- Label ditambah untuk `nup_lama`, `tanggal_pengapusan`, dan `foto_geotag_url`.

### Validasi
- `php -l backend/app/Modules/Bmn/Controllers/ImportReviewController.php` clean.
- `php -l backend/app/Modules/Bmn/Routes/api.php` clean.
- `cd backend; php artisan route:list` clean dan route toggle-field terdaftar.
- `cd frontend; npm run lint -- --max-warnings=0` clean.
- `cd frontend; npx tsc --noEmit` clean.
- `cd frontend; npm run build` clean (59/59 routes).

---

# Progress - Phase 72: Security Hardening + Migrasi VPS ke Dokploy

> Document updated: 2026-06-18
> Status: Issue #396 **MERGED** dan **DEPLOYED**; migrasi VPS ke Dokploy seluruh Phase 1–4 **SELESAI** secara penuh. Aplikasi berjalan stabil pada server produksi https://bksdakaltim.net.

---

## Status Migrasi VPS — Real-Time

### ✅ Phase 1: Backup (selesai)
Semua data live di-snapshot ke lokal sebelum wipe. Lihat `backups/pre-dokploy-20260529-163240/README.md` untuk instruksi restore detail.

| File | Ukuran | Isi |
|------|-------:|-----|
| `bksda_db.dump` | 920 KB | pg_dump custom format (recommended untuk restore) |
| `bksda_db.sql` | 13 MB | Plain SQL backup ganda (45 CREATE TABLE) |
| `rustfs-data.tar.gz` | 9.4 MB | Object storage bucket `bksda` |
| `backend-storage.tar.gz` | 231 B | Volume backend-storage (kosong) |
| `env.prod.bak` | 145 B | `.env.prod` server (perm 600) |

Verifikasi integritas: `PGDMP` magic bytes ✅, `-- PostgreSQL database dump` header ✅, struktur bucket `bksda` ✅.

### ✅ Phase 2: Wipe (selesai)
- `docker-compose -f docker-compose.prod.yml down -v --remove-orphans` — semua container & volume `bksda-superapp_*` dihapus
- `docker system prune -a --volumes -f` — semua image, build cache, volume orphan dibersihkan
- **Reclaimed 15.75 GB**. Disk: 92% → 23% (16 GB free dari 20 GB)
- Verifikasi: `docker ps -a` kosong, `docker volume ls` kosong, `docker system df` semua 0

### ✅ Phase 3: Install Dokploy v0.29.5 (selesai)
- Pre-flight: Docker 25.0.14 + overlay2, port 80/443/3000 free, RAM 1.9 GB + swap 2 GB (lower-edge tapi cukup)
- Install: `curl -sSL https://dokploy.com/install.sh | sudo sh` (~3 menit, pull traefik:v3.6.7)
- Containers up: `dokploy.1` (healthy), `dokploy-postgres`, `dokploy-redis`, `dokploy-traefik`
- Port 3000 listening internal
- AWS Security Group `launch-wizard-2` (`sg-01fc49e036062a26c`): tambah inbound rule TCP 3000 `0.0.0.0/0` (sementara untuk akses awal)
- Akses dashboard `http://15.135.114.1:3000` ✅
- Registrasi super admin pertama ✅ (kredensial di password manager user)
- DNS NEO DNS: tambah A `dokploy` → `15.135.114.1` (5 records total). DNS belum propagasi saat sesi berakhir — tunggu propagasi semalam.
- **Port 3000 ditutup** di Security Group AWS (delete inbound rule TCP 3000) sebelum selesai sesi ✅

### ✅ Phase 4: Redeploy app (selesai)

- [x] **0. Re-open port 3000** sementara di AWS Security Group — hanya diperlukan untuk konfigurasi awal; Traefik handle HTTPS secara otomatis.
- [x] **1. Verifikasi DNS propagasi**: `dokploy.bksdakaltim.net` terarah dengan benar ke server IP.
- [x] **2. Setup domain dashboard Dokploy**: Mengatur `dokploy.bksdakaltim.net` dan mengaktifkan SSL HTTPS Let's Encrypt.
- [x] **3. Tutup port 3000** di AWS Security Group — akses dashboard sekarang sepenuhnya melalui HTTPS `https://dokploy.bksdakaltim.net`.
- [x] **4. Create project** "BKSDA SuperApp" di Dokploy.
- [x] **5. Add Postgres database service** dan memulihkan data via `pg_restore -Fc bksda_db.dump`.
- [x] **6. Add application** via Docker Compose dengan Traefik routing.
- [x] **7. Set environment variables** produksi (APP_KEY, DB_PASSWORD, RUSTFS_PASSWORD, dll.) di panel Dokploy.
- [x] **8. Setup domains produksi** dengan SSL Let's Encrypt otomatis:
  - `bksdakaltim.net` -> frontend (port 3000)
  - `api.bksdakaltim.net` -> backend (laravel API)
  - `storage.bksdakaltim.net` -> rustfs (port 9000)
- [x] **9. Restore rustfs files**: memulihkan file upload media dari backup `rustfs-data.tar.gz`.
- [x] **10. Deploy** dari panel Dokploy — build frontend dan backend berjalan sukses.
- [x] **11. Smoke test**: login, data aset BMN, kepegawaian, surat tugas, dan file download berjalan normal.
- [x] **12. Konfirmasi #396 aktif**: `APP_DEBUG=false`, header keamanan aktif, dan sanitasi XSS berjalan.
- [x] **13. Update docs** HANDOFF.md dan progress.md untuk mendokumentasikan status deploy berhasil.

### Catatan Penting
- **Production app UP**: Aplikasi dan seluruh modul BKSDA SuperApp berjalan normal secara penuh di `https://bksdakaltim.net`.
- **Backup di lokal**: `backups/pre-dokploy-20260529-163240/` — dipertahankan untuk cadangan darurat.
- **Port 3000 ditutup**: AWS Security Group hanya mengizinkan akses port 80 dan 443; dashboard Dokploy diakses aman via HTTPS.
- **DNS `dokploy.bksdakaltim.net`**: DNS terpropagasi penuh dan terlindungi Let's Encrypt SSL.

---

## Issue #396: Security hardening menyeluruh hasil audit

### Status: MERGED (akan aktif setelah Dokploy redeploy)
- PR #397 merged ke `main` (merge commit `6c06307`). Remote branch deleted.
- Commit hardening: `cc62fe7`.
- Audit dijalankan dengan skill `security-review` + `ui-ux-pro-max` (`uipro-cli` di-install via `npm i -g uipro-cli` lalu `uipro init --ai kiro` → `.kiro/steering/ui-ux-pro-max/`).

### Filosofi
Audit dulu (read-only), lapor temuan dengan severity, lalu fix tanpa mengubah style/desain. Kombinasi review kode + config deploy + dependency.

### HIGH yang diperbaiki
1. **`APP_DEBUG: "true"` → `"false"`** di `docker-compose.prod.yml`. Mencegah kebocoran stack trace, env, dan query DB ke user di production.
2. **Stored XSS** — 4 halaman CMS publik kini sanitasi via DOMPurify:
   - `app/(publik)/page/[slug]/page.tsx`
   - `app/(publik)/informasi/[slug]/page.tsx`
   - `app/(publik)/tsl/[slug]/page.tsx`
   - `app/(publik)/kawasan/[slug]/page.tsx`
   
   Bonus finding: homepage (`app/page.tsx`) sebelumnya pakai `sanitizeHtml` lokal yang **lemah** (cuma regex strip `<script>`, tidak blok `onerror=`/`javascript:`) → diganti pakai versi DOMPurify dari `@/lib/utils`.
3. **Kredensial fallback hardcoded dihapus** — `DB_PASSWORD`/`RUSTFS_PASSWORD`/`APP_KEY` jadi `${VAR:?required}` agar gagal jelas saat secret hilang. `RUSTFS_USER` tetap default (bukan secret, & tidak ada di server `.env.prod`) supaya deploy tidak putus.

### MODERATE yang diperbaiki
4. **Dependencies**: Next.js 16.2.4 → **16.2.6** (middleware/proxy bypass, CSP-nonce XSS, cache poisoning, image DoS, SSRF) + `qs` DoS + `brace-expansion` via `npm audit fix` (non-breaking). Sisa `quill`/`react-quill-new` (admin CMS, XSS pada fitur export yang tidak dipakai, output sudah disanitasi) dibiarkan — fix-nya breaking downgrade → accepted risk.
5. **nginx security headers** (`deploy/nginx.conf`, server 443): HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy.

### Validasi (sudah lulus)
- `npx eslint --max-warnings=0` clean
- `npx tsc --noEmit` clean
- `npm run build` clean (59/59)
- `docker compose -f docker-compose.prod.yml config` valid (dengan dummy env)
- Server `.env.prod` keys verified: `APP_KEY`, `DB_PASSWORD`, `RUSTFS_PASSWORD` set; `RUSTFS_USER` tidak ada (sengaja default)

### Catatan: TIDAK deploy ke server lama
Setelah PR #397 merged, server di-pull `057a575 -> 6c06307` tapi **container tidak di-rebuild/recreate**. User memilih migrasi VPS ke Dokploy panel daripada deploy ulang ke setup AWS lama. Jadi #396 akan aktif setelah Dokploy redeploy selesai.

---

## Migrasi VPS → Dokploy (in progress)

### Latar Belakang
- VPS lama: Amazon Linux 2023, single 20GB disk, **92% penuh** (1.7GB free).
- Disk usage: real data cuma ~88 MB (DB 23 MB, rustfs 10 MB, backend-storage 12 KB), tapi Docker images 7.3 GB + build cache 8.5 GB = ~14 GB Docker bloat.
- User ingin pakai Dokploy panel untuk learning + cleanup.

### Domain (sudah confirmed dari user)
- `bksdakaltim.net` — A `@`/`api`/`storage` → `15.135.114.1`, CNAME `www` → `bksdakaltim.net.`. Provider: NEO DNS.

### Plan
1. **Backup** (in progress): `pg_dump` database, `tar` rustfs files, copy `.env.prod` → download ke lokal.
2. **Wipe**: `docker compose down -v`, `docker system prune -a --volumes` (free ~14 GB), opsional hapus repo dir.
3. **Install Dokploy**: `curl -sSL https://dokploy.com/install.sh | sh` (pasang Traefik + Postgres + Redis + dashboard di port 3000).
4. **Redeploy via Dokploy panel** (user-driven untuk belajar): create project → add Postgres → add app dari GitHub repo → set env vars → restore DB dump → restore rustfs files → arahkan domain. Pakai Dokploy "Docker Compose" service type, reuse `docker-compose.prod.yml` minus nginx/certbot custom (Traefik handle SSL otomatis).

### Status saat ini
- Lihat "Status Migrasi VPS — Real-Time" di atas (Phase 1-3 selesai, Phase 4 paused).

---

# Progress - Phase 71: Refactor Modul BMN auction-candidates (DRY Shared Components) — MERGED + DEPLOYED

> Document updated: 2026-05-29
> Status: **MERGED + DEPLOYED** (PR #395 merged ke `main` commit `057a575`; production server di `057a575`)

---

## Issue #394: Refactor BMN auction-candidates — hilangkan duplikasi antar-dokumen (DRY)

### Status: MERGED + DEPLOYED
- PR #395 merged ke `main` (merge commit `057a575`). Remote branch deleted.
- User sudah test manual (preview + cetak/PDF semua dokumen) — aman.
- Sudah deploy SSH (frontend rebuild, no migration; backend tidak berubah).

### Filosofi
Sama seperti #392: tujuan utama **DRY**, bukan line count. Modul BMM sebelumnya sudah di-refactor (#340, #365) tapi fokusnya memecah `page.tsx` jadi section components, BUKAN menghilangkan duplikasi kode antar-dokumen. Issue ini mencari single source of truth untuk kode yang copy-paste antar-dokumen.

### Completed:
- [x] **Issue Created**: Issue #394.
- [x] **Branch**: `issue/394-refactor-bmn-dry` (merged + deleted).
- [x] **Surat Pernyataan (SPTJM, Nilai Limit, Tugas)** — tiga dokumen ~95% identik:
  - `_lib/print-pernyataan.ts` — `PERNYATAAN_PRINT_CSS`, `buildPernyataanNomor(prefix,...)`, `printPernyataan({rootId,title,emptyMessage})`
  - `_components/PernyataanDocument.tsx` — shell bersama (scoped style, KOP, judul/nomor, blok TTD) + `PernyataanIdentity`
  - Tiap dokumen sekarang tinggal body unik + delegasi handler (nama ekspor `handlePrintSptjm` dll tidak berubah).
- [x] **SK documents (Penghentian, Panitia, Tim Penilai)** — engine pagination JS ~230 baris copy-paste 3x:
  - `_lib/sk-print.ts` — `runSkPagination(printWindow, config)` terparameter `prefix` (`sk`/`skp`/`sktp`), `sectionStartMarginTop`, `decisionRowLabels`, `finalGroupClass`, `finalGroupLabel`. Plus `openSkPrintWindow` helper (belum dipakai, tersedia untuk konsolidasi lanjutan).
  - CSS statis tiap dokumen sengaja dibiarkan inline (tweak per-dokumen tetap aman).
- [x] **Fix tampilan**: isi baris "Menetapkan" pada MEMUTUSKAN jadi **bold** di 3 SK (heading MEMUTUSKAN tetap bold, label "Menetapkan" tetap normal). Berlaku di preview & cetak/PDF (inline `fontWeight` ikut ter-clone saat pagination).

### Hasil Pengurangan Baris:
| File | Awal | Sekarang | Berkurang |
|------|------|----------|-----------|
| `SptjmDocument.tsx` | 151 | 61 | −90 |
| `SptjLimitDocument.tsx` | 157 | 61 | −96 |
| `SpTugasDocument.tsx` | 133 | 47 | −86 |
| `SkPenghentianDocument.tsx` | 1061 | 800 | −261 |
| `SkPanitiaDocument.tsx` | 893 | 638 | −255 |
| `SkTimPenilaiDocument.tsx` | 782 | 572 | −210 |
| **File baru** | — | print-pernyataan 86 + PernyataanDocument 109 + sk-print 359 | +554 |

Net: 9 file changed, +705 / −1241 (−536 baris).

### Validation (sudah lulus):
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 pages) — lokal & di server Docker
- [x] Zero behavior change pada output cetak/PDF

### Catatan Pendekatan:
- **Extraction bertahap, reversible, validate tiap langkah** — sama seperti #392.
- Diekstrak = "high-value duplication": shell + CSS surat pernyataan, dan engine pagination SK (algoritma kompleks yang sebelumnya 3x copy-paste).
- TIDAK diekstrak (sengaja): CSS statis per-dokumen & rendering tabel lampiran — punya nilai spesifik per dokumen, konsolidasi berisiko regresi dengan benefit kecil.

### Deploy SSH (2026-05-29 #2):
1. Server pulled main `de9da95 -> 057a575` (issue #392 + #394 + docs).
2. `docker-compose build frontend` — image rebuilt (build 59/59).
3. `docker-compose up -d frontend` — container recreated.
4. No new migrations (no backend changes since `de9da95`).
5. Production healthy: `bksda-frontend` Up, `bksda-backend` Up, public `/bmn/auction-candidates` HTTPS 307 (protected, expected).

---

# Progress - Phase 70: Refactor Modul Kepegawaian (DRY Shared Components) — MERGED

> Document updated: 2026-05-29
> Status: **MERGED + DEPLOYED** (PR #393 merged ke `main` commit `f326ed3`; di-deploy bersama #394 di server commit `057a575`)

---

## Issue #392: Refactor kepegawaian — hilangkan duplikasi builder↔create (DRY)

### Status: MERGED + DEPLOYED
- PR #393 merged ke `main` (merge commit `f326ed3`). Remote branch deleted.
- User sudah test manual semua flow (4 template × create + edit, inbox) — aman.
- Sudah deploy SSH (bersama batch #394, server di `057a575`).


### Filosofi
Tujuan utama **DRY (Don't Repeat Yourself)**, bukan sekadar menurunkan line count. Masalah inti modul ini adalah `builder/[id]/page.tsx` dan `create/page.tsx` ~80% kembar — bug fix harus dilakukan di dua tempat (terbukti di issue #384, #388, #390). Refactor ini membuat satu sumber kebenaran (single source of truth).

### Completed (di branch, belum commit):
- [x] **Issue Created**: Issue #392.
- [x] **Branch**: `issue/392-refactor-kepegawaian` (lokal, belum push).
- [x] **Shared `surat-tugas/_lib/` (8 file)**:
  - `types.ts` — Employee, DasarItem, SumberDanaOption, KepalaBalaiInfo, EmployeeDates, TemplateType
  - `constants.ts` — DEFAULT_KEPALA_BALAI, PLH placeholders, SUMBER_DANA_OPTIONS (11 opsi)
  - `sumber-dana.ts` — normalizeSumberDana
  - `plh-helpers.ts` — extractPlhWilayahFromPosition, cleanPlhKegiatanKasi, normalizeEmployeeForSelection
  - `untuk-helpers.ts` — getDefaultUntukItem(s), splitStoredUntukItems, isGeneratedBiayaItem, toDasarItems
  - `activity-helpers.ts` — isSingleDayActivityPrefix, shouldRenderAsSingleDayActivity, buildBiayaTextFor
  - `print-st.ts` — printSuratTugas (print handler + CSS, sebelumnya duplikat ~50 baris di 2 file)
  - `index.ts` — barrel export
- [x] **Shared `surat-tugas/_components/` (4 file)**:
  - `FormSection.tsx` — section wrapper (sebelumnya duplikat di builder + create)
  - `EditableItemListSection.tsx` — list editor add/remove untuk Menimbang (marker huruf) + Dasar (marker angka)
  - `TembusanSection.tsx` — daftar tembusan string list
  - `PenandatanganSection.tsx` — searchable employee picker untuk Kepala Balai (state search dikelola lokal)
- [x] **`inbox/_lib/` (2 file)**:
  - `types.ts` — AssignmentLetter, InboxEmployee, LetterItem, LetterStatus
  - `status-helpers.ts` — getStatusStyle, getStatusLabel
- [x] **Eliminasi duplikasi**: builder + create sekarang import dari `_lib` + `_components` yang sama.

### Hasil Pengurangan Baris:
| File | Awal | Sekarang | Berkurang |
|------|------|----------|-----------|
| `builder/[id]/page.tsx` | 1500 | 1195 | −305 (−20%) |
| `create/page.tsx` | 1119 | 882 | −237 (−21%) |
| `inbox/page.tsx` | 704 | 654 | −50 |

### Pending (belum dikerjakan):
- [ ] User test browser semua flow (4 template × create + edit, inbox).
- [ ] (Opsional) Extract Detail Kegiatan + Kepada (Personil) sections — lebih kompleks karena banyak interdependensi state (employeeDates, PLH fields, single-day toggle).
- [ ] Commit + push + PR + merge setelah user OK.
- [ ] Deploy SSH (tunggu user siap).

### Validation (sudah lulus):
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 pages)
- [x] Zero behavior change — semua fitur (BMN, Beda Hari, PLH, FOLU, one-day) tetap utuh

### Key Files Baru (14):
- `surat-tugas/_lib/`: types, constants, sumber-dana, plh-helpers, untuk-helpers, activity-helpers, print-st, index (8)
- `surat-tugas/_components/`: FormSection, EditableItemListSection, TembusanSection, PenandatanganSection (4)
- `surat-tugas/inbox/_lib/`: types, status-helpers (2)

### Catatan Pendekatan:
- **Extraction bertahap, reversible, validate tiap langkah** — bukan big-bang rewrite.
- Yang sudah diextract = "low-risk, high-value": konstanta, types, helper murni, print handler, dan section UI yang struktur-nya identik.
- Belum extract Detail Kegiatan & Kepada (Personil) section karena punya banyak state interdependent (PLH placeholder, FOLU auto-fill, Beda Hari date, one-day detection) — perlu hati-hati supaya tidak regresi.

---

# Progress - Phase 69: ST Builder Untuk Items Editable + One-Day Activity (MERGED + DEPLOYED)

> Document updated: 2026-05-29
> Status: **MERGED + DEPLOYED** (PR #391 merged ke `main`; production app commit `de9da95`)

---

## Issue #390: Make ST Builder Untuk items editable + one-day activity task type

### Completed:
- [x] **Issue Created**: Issue #390.
- [x] **Branch Created/Pushed**: `issue/390-st-builder-untuk-items`.
- [x] **PR Created/Merged**: PR #391 merged ke `main` (merge commit `de9da95`).
- [x] **Branch Cleanup**: remote branch `issue/390-st-builder-untuk-items` deleted after merge.
- [x] **Editable Untuk items**: dynamic list dengan add/remove, mirror behavior dari Menimbang/Dasar.
- [x] **Editor placement**: dipindah ke bawah input tanggal di sidebar.
- [x] **One-day activity task type**: task type baru untuk kegiatan 1 hari (skip auto biaya, render single-day format).
- [x] **Auto-detect same-date tasks**: kalau `tanggal_mulai === tanggal_selesai`, auto-render sebagai one-day di builder.
- [x] **Journey fields editable**: untuk same-date tasks tetap bisa edit asal/tujuan/kegiatan.
- [x] **Biaya line editable**: biaya sekarang masuk ke untuk items list dan bisa di-edit, bukan auto-generated tersembunyi lagi.
- [x] **Persist via `maksud_tujuan`**: custom Untuk items disimpan di field `maksud_tujuan` dan diparse saat re-open ST.
- [x] **Production deploy**: included in 2026-05-29 batch deploy (`7d5212b` -> `de9da95`), backend + frontend rebuilt/recreated, no new migrations, production health checks passed.

### Implementation Notes (9 commits di branch sebelum merged):
1. `70bd40c feat: make ST builder untuk items editable`
2. `769ec7a fix: move ST builder untuk editor below dates`
3. `1488bcf feat: add one-day activity task type`
4. `57869ed fix: skip auto biaya for one-day ST builder tasks`
5. `6d51def fix: auto-detect one-day submitted ST tasks`
6. `367d1ed fix: render same-date ST builder tasks as one-day`
7. `4e86599 fix: keep journey fields editable for same-date tasks`
8. `24f807a fix: keep ST builder biaya out of editable untuk preview`
9. `0c3f3bf feat: make ST builder biaya editable in untuk items`

### Files Modified (2):
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx` (+296/-46)
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx` (+19/-3)
- Total: +293 / -55 lines

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean

### Production Deploy:
- [x] Server: `ssh -i bksda-superapp.pem ec2-user@15.135.114.1`
- [x] App path: `/home/ec2-user/bksda-superapp`
- [x] `git pull origin main` (`7d5212b -> de9da95`, includes #388 + #390 + docs)
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod build backend frontend`
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d backend frontend`
- [x] `php artisan migrate --force` → `Nothing to migrate`
- [x] Container status: `bksda-backend` Up, `bksda-frontend` Up, all 9 containers running
- [x] `https://bksdakaltim.net/login` → HTTP 200

### Note:
- Implementation oleh AI Codex (di branch `issue/390-st-builder-untuk-items`).
- Merge + deploy oleh Claude Sonnet 4.5.
- Issue #388 (PLH template) yang sebelumnya merged tapi belum deploy ikut ter-deploy di batch ini.

---

# Progress - Phase 68: PLH Template + Buat ST PLH Button (MERGED + DEPLOYED)

> Document updated: 2026-05-29
> Status: **MERGED + DEPLOYED** (PR #389 merged ke `main`; production app commit `de9da95`)

---

## Issue #388: Add PLH template for ST Builder + "Buat ST PLH" button in Inbox

### Completed:
- [x] **Issue Created**: Issue #388.
- [x] **Branch Created/Pushed**: `issue/388-st-plh-template`.
- [x] **PR Created/Merged**: PR #389 merged ke `main` (merge commit `ad179a9`); remote branch deleted.
- [x] **Inbox tombol "Buat ST PLH"**: di card "Nama PLH" redirect ke `/kepegawaian/surat-tugas/create?template=plh&parent_st_id={selectedLetter.id}`.
- [x] **Existing PLH draft reuse**: tombol Inbox membuka draft PLH existing bila sudah pernah dibuat, bukan membuat draft baru terus.
- [x] **Template PLH baru** di create + builder edit: klasifikasi `PEG.09.01`, sumber dana `dl1`, Menimbang/Dasar/Untuk/Tembusan default PLH.
- [x] **Auto-fetch ST Induk**: prefill nomor/tanggal dasar, tanggal mulai/selesai, wilayah dari pegawai utama ST induk, kegiatan Kepala Seksi, dan nama PLH.
- [x] **Auto-select pegawai PLH stabil** walaupun data pegawai lambat load.
- [x] **Draft PLH persist nomor surat**: `nomor_surat`, `kode_surat`, dan `tanggal_surat` ikut tersimpan saat Simpan Draft.
- [x] **STBuilderPreview update**: item kedua di "Untuk" jadi `"Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai."` saat PLH.
- [x] **`buildBiayaText`**: skip biaya line saat PLH.
- [x] **`buildUntukText`**: format durasi PLH memakai `selama X (kata) hari terhitung...`.
- [x] **Tembusan section** di create page: input dinamis dengan add/remove, terisi default saat PLH aktif.

### Pending:
- [ ] Deploy ke SSH production belum dilakukan sesuai instruksi user.
- [ ] Issue baru: item "Untuk" di ST Builder harus bisa ditambah/dikurangi seperti Menimbang dan Dasar.

### Key Files Modified:
- `frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php`
- `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php`

### Validation:
- [x] `npm run lint -- --max-warnings=0`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `php -l` SuratTugas controller/request clean

---
# Progress - Phase 67: Searchable ST Penandatangan Picker (MERGED + DEPLOYED)

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (PR #387 merged ke `main`; production app commit `7d5212b`)

---

## Issue #386: Make ST penandatangan editable/searchable

### Completed:
- [x] **Issue Created**: Issue #386.
- [x] **Branch Created/Pushed**: `issue/386-editable-st-penandatangan`.
- [x] **PR Created/Merged**: PR #387 merged ke `main` (merge commit `ac6f5d9`).
- [x] **Branch Cleanup**: remote branch deleted after merge.
- [x] **Frontend**: ST Create dan ST Builder edit sekarang punya searchable employee picker di section Penandatangan.
- [x] **Default signer**: `M. Ari Wibawanto, S.Hut., M.Sc.` dengan NIP `19740514 199903 1 001`.
- [x] **Manual override**: Nama dan NIP tetap editable setelah user pilih pegawai dari search.
- [x] **Backend persist**: tambah kolom `penandatangan_nama` dan `penandatangan_nip`; direct create dan builder approve/save mengirim dan membaca ulang field ini.
- [x] **Production deploy**: EC2 pulled `main` dari `550944f` ke `7d5212b`, backend + frontend rebuilt/recreated.
- [x] **Migration production**: `2026_05_28_161500_add_penandatangan_to_st_assignment_letters_table.php` applied.
- [x] **Production health**: `/login` HTTP 200; `/bmn/auction-candidates` HTTP 307 redirect ke `/login` (protected, expected).

### Pending:
- [ ] **Manual browser check**: user akan cek langsung di browser.

### Validation:
- [x] `php -l` SuratTugas controller/model/request/migration clean
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Key Files:
- `backend/app/Modules/SuratTugas/Migrations/2026_05_28_161500_add_penandatangan_to_st_assignment_letters_table.php`
- `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php`
- `backend/app/Modules/SuratTugas/Models/AssignmentLetter.php`
- `backend/app/Modules/SuratTugas/Requests/AssignmentLetterRequest.php`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`

---

# Progress - Phase 66: ST "Beda Hari" Template (MERGED + DEPLOYED)

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (PR #385 merged ke `main`; production app commit `7d5212b`)

---

## Issue #384: Add "Beda Hari" template for ST Builder + Create page

### Completed:
- [x] **Issue Created**: Issue #384.
- [x] **Branch Created/Pushed**: `issue/384-st-template-beda-hari`.
- [x] **PR Created/Merged**: PR #385 merged ke `main` (merge commit `f8b6d56`).
- [x] **Branch Cleanup**: remote branch `issue/384-st-template-beda-hari` deleted after merge.
- [x] **New Component**: `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STLampiranBedaHari.tsx`.
- [x] **STBuilderPreview update**: Beda Hari renders `Kepada: Daftar nama terlampir.` and adds page 2 lampiran.
- [x] **ST Create + Builder page update**: dropdown template, per-employee dates, lampiran title input, hide global dates in Beda Hari mode, and MIN/MAX date calculation for `Untuk`.
- [x] **Print layout lampiran final**: content moved up, custom print page added, meta block shifted left, TTD follows page 1 position, table uses fixed layout, Nama/NIP widened, date column nowrap for long month names.
- [x] **Production deploy**: included in 2026-05-28 batch deploy (`550944f` -> `7d5212b`), frontend rebuilt/recreated, production health checks passed.

### Pending:
- [ ] **Backend persist (opsional)**: `employeeDates` masih state frontend; persist backend bisa jadi issue terpisah kalau dibutuhkan.

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STLampiranBedaHari.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`

### Next:
- [x] Buat issue baru untuk editable ST Penandatangan/Kepala Balai di create + builder edit (selesai sebagai #386).

---
# Progress - Phase 65: Global Kepala Balai Picker

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (production app commit `7d5212b`)

---

## Issue #382: Add global Kepala Balai picker for all auction documents

### Completed:
- [x] **Issue Created**: Issue #382.
- [x] **PR Created/Merged**: PR #383 merged ke `main` (merge commit `94f9a19`).
- [x] **Branch Cleanup**: remote branch `issue/382-kepala-balai-picker` deleted after merge.
- [x] **New Component**: `_components/KepalaBalaiPicker.tsx`
  - Card baru dengan icon `UserCheck` dan judul "Penandatangan Kepala Balai".
  - Dropdown dari API `/kepegawaian/employees/select`, sorted alfabetis.
  - `useQuery` dengan `staleTime: 5 menit` untuk caching.
  - Saat user pilih pegawai: nama auto-UPPERCASE, NIP auto-format spasi via `formatNip`.
  - Preview Nama (UPPERCASE) + NIP (mono font) di card.
- [x] **Default Updated**: `DEFAULT_KEPALA_BALAI` di `sk-defaults.ts` ubah ke mixed case `M. ARI WIBAWANTO, S.Hut., M.Sc.` (sebelumnya UPPERCASE penuh `M. ARI WIBAWANTO, S.HUT., M.SC.`).
- [x] **BA Koreksi (was hardcoded)**:
  - 3 lokasi hardcoded sebelumnya: tabel identitas Nama+NIP, TTD halaman 1, `AttachmentSignature` lampiran.
  - Sekarang `BaKoreksiDocument` import `SkKepalaBalai` type dan terima prop `kepalaBalai`.
  - `AttachmentSignature` jadi typed `({ kepalaBalai }: { kepalaBalai: SkKepalaBalai })`.
  - `BaLampiranPageContent` ditambah prop `kepalaBalai` untuk forward ke `AttachmentSignature`.
  - Tetap editable inline lewat `contentEditable`.
- [x] **Page integration**:
  - Render picker di antara `<DocumentNumberInputs>` dan `<SelectedAssetsBanner>`.
  - Pakai existing state `sk.kepalaBalai` (dari `useSkBuilderState`), share state dengan picker di `SkBuilder` dan dengan semua 11 dokumen.
  - `BaKoreksiSection` ditambah prop `kepalaBalai={sk.kepalaBalai}`.
- [x] **10 dokumen lain reflect otomatis**: SK Penghentian, SK Panitia, SK Tim Penilai, BA Pemeriksaan, SK Kebenaran, SPTJ Limit, SPTJM, SP Tugas, Nota Dinas, Permohonan KPKNL — sudah pakai state `sk.kepalaBalai` dari awal, jadi tidak perlu perubahan tambahan.
- [x] **Production deploy**: included in 2026-05-28 batch deploy (`550944f` -> `7d5212b`), backend + frontend rebuilt/recreated, production health checks passed.

### Pending:
- [ ] Manual browser check by user.

### Key Files:
- New (1): `_components/KepalaBalaiPicker.tsx`
- Modified (4): `_lib/sk-defaults.ts`, `_components/BaKoreksiDocument.tsx`, `_components/sections/BaKoreksiSection.tsx`, `page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 64: KOP Unification + Editable KAP for All Documents

> Document updated: 2026-05-28
> Status: **MERGED + DEPLOYED** (production app commit `7d5212b`)

---

## Issue #380: Change KOP and make all document numbers fully editable

### Completed:
- [x] **Issue Created**: Issue #380.
- [x] **PR Created/Merged**: PR #381 merged ke `main` (merge commit `79a4278`).
- [x] **Branch Cleanup**: remote branch `issue/380-kop-header-terbaru` deleted after merge.
- [x] **KOP Change**: 4 dokumen ganti KOP dari `/header-new.png` ke `/header-terbaru.png` agar konsisten dengan BA Koreksi:
  - BA Pemeriksaan BMN
  - SK Kebenaran Fotokopi Dokumen
  - Surat Permohonan KPKNL
  - Nota Dinas KSDAE
- [x] **Format Nomor Unified**: Semua 11 dokumen sekarang format `{prefix}.{nomor}/K.18/TU/{KAP}/B/{MM}/{YYYY}`.
  - SK Penghentian dan SK Panitia sebelumnya tidak punya `/B/`, sekarang ditambahkan.
  - SK Tim Penilai sebelumnya pakai `getTimPenilaiNumberSuffix` helper (KAP.06.01 hardcoded), sekarang inline dengan `kap` parameter editable.
- [x] **Editable KAP**: Sebelumnya hanya BA Koreksi yang KAP-nya editable. Sekarang semua 11 dokumen punya 2 input editable di panel "Pengaturan Nomor Surat":
  - Nomor (placeholder `____`)
  - KAP (text editable)
- [x] **Default KAP**:
  - 9 dokumen → `KAP.06.01` (BA Koreksi, SK Tim Penilai, SPTJ Limit, SPTJM, SP Tugas, SK Kebenaran, BA Pemeriksaan, Nota Dinas, Permohonan KPKNL)
  - 2 dokumen → `KAP.05.01` (SK Penghentian, SK Panitia)
- [x] **Default Nomor Cleared**: Semua state nomor default kosong (placeholder `____`). User wajib isi sendiri.
- [x] **Production deploy**: included in 2026-05-28 batch deploy (`550944f` -> `7d5212b`), backend + frontend rebuilt/recreated, production health checks passed.

### Implementation:
- [x] `useDocumentNumbers` ditambah 11 pasang state KAP: `baKap`, `skKap`, `skPanitiaKap`, `skTimPenilaiKap`, `sptjLimitKap`, `sptjmKap`, `spTugasKap`, `skKebenaranKap`, `baPemeriksaanKap`, `notaDinasKap`, `permohonanKpknlKap`.
- [x] `DocumentNumberInputs` UI: 2 input editable per dokumen, prefix dan suffix tetap fixed.
- [x] 11 Document components: interface props menerima `kap: string` dan fungsi `buildNomor`/`buildNomorText` membaca KAP dari prop.
- [x] 9 Section wrappers: forward `kap` prop dari `page.tsx` ke document.
- [x] `getSkNumberSuffix` masih ada di `auction-helpers.ts` tapi tidak dipakai SK Penghentian/Panitia lagi. `getTimPenilaiNumberSuffix` dihapus dari SkTimPenilaiDocument.

### Pending:
- [ ] Manual browser check by user.

### Key Files (23):
- Hook: `_hooks/useDocumentNumbers.ts`
- Panel UI: `_components/DocumentNumberInputs.tsx`
- Document components (11): `BaPemeriksaanDocument`, `SkKebenaranDokumenDocument`, `PermohonanKpknlDocument`, `NotaDinasDocument`, `SkPenghentianDocument`, `SkPanitiaDocument`, `SkTimPenilaiDocument`, `SpTugasDocument`, `SptjmDocument`, `SptjLimitDocument` (BaKoreksiDocument unchanged)
- Section wrappers (9): `BaPemeriksaanSection`, `NotaDinasSection`, `PermohonanKpknlSection`, `SkKebenaranSection`, `SkPanitiaSection`, `SkPenghentianSection`, `SkTimPenilaiSection`, `SpTugasSection`, `SptjLimitSection`, `SptjmSection`
- `page.tsx` (forward 11 kap props)

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 63: BA Pemeriksaan Lampiran Landscape + Deploy

> Document updated: 2026-05-27
> Status: **MERGED + DEPLOYED** ✅ (PR #379 merged; frontend production at `550944f`)

---

## Issue #378: Make BA Pemeriksaan lampiran landscape

### Completed So Far:
- [x] **Issue Created**: Issue #378 `fix(bmn): make BA Pemeriksaan lampiran landscape`.
- [x] **Branch Created**: local branch `issue/378-ba-pemeriksaan-lampiran-landscape`.
- [x] **PR Created/Merged**: PR #379 `fix(bmn): align BA pemeriksaan lampiran pagination (#378)` merged ke `main` (merge commit `550944f`).
- [x] **Branch Cleanup**: remote branch `issue/378-ba-pemeriksaan-lampiran-landscape` deleted after merge.
- [x] **Landscape lampiran**: BA Pemeriksaan lampiran now uses named A4 landscape pages instead of portrait `.doc-page`.
- [x] **Manual pagination**: selected assets are chunked manually, following the Nota Dinas/KPKNL pattern instead of relying on browser table splitting.
- [x] **Final page rule**: final lampiran page includes the TTD block and carries selected assets; for many assets the final page is capped at 6 assets, with a minimum of 1 asset kept together with TTD.
- [x] **Seven asset edge case**: BA Pemeriksaan lampiran with 7+ assets now forces at least 1 asset onto the final TTD page, so the signature block does not fall alone.
- [x] **Tall row handling**: final-page pagination estimates row height from long asset names/brand/type text; if 6 assets are too tall, fewer assets are kept on the TTD page.
- [x] **Continuation page safety**: continuation page capacity reduced to 12 assets so browser print does not push a single overflow row onto its own page.
- [x] **No `${ttd_pengirim}` placeholder**: BA Pemeriksaan lampiran signature block only renders Pelaksana Kegiatan/pemeriksa and Kepala Balai text.
- [x] **Landscape TTD layout**: final page uses a wider landscape grid with pemeriksa names in two columns and Kepala Balai on the right.
- [x] **Lampiran details**: `Lampiran` meta text is editable, stays on one full-width line, and defaults to `PEMERIKSAAN BARANG MILIK NEGARA BERUPA ALAT ANGKUTAN BERMOTOR`.
- [x] **Table details**: column-number row `1` through `11` appears only on continuation pages; `Nilai Buku` always renders centered `-`.
- [x] **Nota/KPKNL shared lampiran**: first landscape lampiran page no longer shows the `1` through `11` column-number row; continuation pages still show it.
- [x] **Nota/KPKNL overflow safety**: shared continuation page capacity reduced to 10 assets and paginator avoids leaving a single asset alone on a middle page.
- [x] **Production deploy**: EC2 pulled `main` from `e2dee79` to `550944f`, rebuilt/recreated frontend, and production route checks passed.

### Pending:
- [ ] User re-test BA Pemeriksaan, Nota Dinas, and KPKNL lampiran on production.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/AssetLampiranLandscapeTable.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx" --max-warnings=0` clean
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/{AssetLampiranLandscapeTable,BaPemeriksaanDocument}.tsx" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Production:
- [x] Server: `ssh -i bksda-superapp.pem ec2-user@15.135.114.1`
- [x] App path: `/home/ec2-user/bksda-superapp`
- [x] `git pull origin main` (`e2dee79 -> 550944f`)
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod build frontend`
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d frontend`
- [x] `bksda-frontend` Up
- [x] `https://bksdakaltim.net/login` HTTP 200
- [x] `https://bksdakaltim.net/bmn/auction-candidates` HTTP 307 (protected, expected)

### Git Status Notes:
- Current branch: `main`
- PR #379 is merged and remote branch deleted.
- Production server is at commit `550944f`.
- There are unrelated untracked local files already present; do not add them accidentally.

---

# Progress - Phase 62: Kertas Kerja Analisis Nilai Taksiran BMN

> Document updated: 2026-05-27
> Status: **MERGED** ✅ (PR #377 merged ke `main`; deploy SSH ditunda)

---

## Issue #376: Add asset worksheet form for auction candidates

### Completed So Far:
- [x] **Issue Created**: Issue #376 `feat(bmn): add asset worksheet form for auction candidates`.
- [x] **Branch Created**: local branch `issue/376-asset-worksheet-form`.
- [x] **PR Created/Merged**: PR #377 `feat(bmn): add asset worksheet form (#376)` merged ke `main` (merge commit `878a311`).
- [x] **Branch Cleanup**: remote branch `issue/376-asset-worksheet-form` deleted after merge.
- [x] **Open worksheet action**: selected assets now show a Kertas Kerja button in `AssetTable` and `ReorderPanel`.
- [x] **Auto numbering**: `Nomor Kertas Kerja` follows the selected asset order.
- [x] **New worksheet component**: added `KertasKerjaAssetSection.tsx` with editor panel + print preview.
- [x] **Header logo**: worksheet header uses `frontend/public/logo_kemenhut.png`.
- [x] **Asset identity auto-fill**: name, location, brand/type, police number, NUP, and acquisition year are derived from selected `AuctionAsset`.
- [x] **Checkboxes**: vehicle type, ownership documents, validity, and condition render as checkbox boxes and keep checked state in print.
- [x] **Editable side panel**: supports editing object identity, owner document, vehicle usage, physical fields, date, and committee names.
- [x] **Auction result rows**: default 3 rows; `Tambah Baris` adds a paired row for `DATA HASIL LELANG` and `PENYESUAIAN`; rows can be removed down to minimum 3.
- [x] **Committee selector**: Panitia Penaksir can be selected from employee data (`/kepegawaian/employees/select`) and still edited manually.
- [x] **Print compaction pass**: table fonts, cell heights, header, and signature spacing were reduced to target 1-page output.
- [x] **Latest layout pass**: kategori lokasi editable from side panel; condition is single-choice radio and updates limit factor; print checkbox spacing increased; document ownership row forced into one line; summary values use compact grid; date and Panitia Penaksir label aligned with signature columns.
- [x] **Adjustment calculation**: main colon column aligned with document ownership row; `Total` adjustment is auto-summed from Tipe/Merek/Waktu/Lokasi/Tahun Pembuatan percentages; row `Nilai taksiran` is auto-calculated from `Harga Lelang * (1 + Total%/100)`; total/rata-rata/limit use the calculated values.
- [x] **Summary/date alignment**: total/rata-rata/limit/pembulatan values moved to the right like the reference; limit row separates `x`, factor (`0,7`), and result; default location/date now uses today's date.
- [x] **Final visual tweaks**: asset list shows direct police-number badge (example `KT 1989 BZ`) only for motor vehicles with `no_polisi`; header logo is larger with no right divider; print hides table input borders; long table text wraps and expands row height.

### Pending:
- [ ] Deploy to SSH production when user is ready.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/AssetTable.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/ReorderPanel.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/KertasKerjaAssetSection.tsx`
- `frontend/public/logo_kemenhut.png`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Git Status Notes:
- Current branch: `main`
- PR #377 is merged and remote branch deleted; not deployed yet.
- There are unrelated untracked local files already present; do not add them accidentally.

---

# Progress - Phase 61: Permohonan KPKNL Print Content Alignment

> Document updated: 2026-05-27
> Status: **MERGED** ✅ (deploy SSH ditunda)

---

## Issue #374: Align Surat Permohonan KPKNL page 1 print content

### Completed:
- [x] **Issue Created**: Issue #374.
- [x] **PR Created/Merged**: PR #375 merged ke `main` (merge commit `776722a`).
- [x] **Branch Cleanup**: remote branch `issue/374-kpknl-print-content` deleted after merge.
- [x] **Recipient block**: changed to `Kepada Yth, / Kantor KPKNL Samarinda / di / Samarinda`.
- [x] **Body paragraph**: changed to reference wording and removed Kabupaten Berau, nilai perolehan, and nilai taksiran wording from page 1.
- [x] **Default location**: Permohonan KPKNL now defaults to `Samarinda`; Nota Dinas keeps `Kota Samarinda dan Kabupaten Berau`.
- [x] **Signature label**: added `Kepala Balai,` above `${ttd_pengirim}` on KPKNL page 1.
- [x] **Builder cleanup**: removed unused total nilai taksiran control/state from the Permohonan KPKNL builder panel.
- [x] **Lampiran pagination**: Nota Dinas and Permohonan KPKNL now use shared manual landscape pagination with explicit page breaks.
- [x] **Column numbering**: lampiran table now has column-number row `1` through `11` above the regular header.
- [x] **Continuation pages**: table header repeats on continuation pages; continuation pages are packed more densely.
- [x] **Final page safety**: total row and TTD are only rendered on the final page; final page carries selected asset rows with safe bottom margin for BSrE/BSSN.
- [x] **TTD layout**: KPKNL page 1 and both landscape lampiran TTD blocks follow the SK Penghentian spacing pattern.

### Pending:
- [ ] Deploy to SSH production after merge when user is ready.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/PermohonanKpknlDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/NotaDinasDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/AssetLampiranLandscapeTable.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/sections/PermohonanKpknlSection.tsx`
- `frontend/src/app/bmn/auction-candidates/_hooks/useNotaKpknlBuilderState.ts`
- `frontend/src/app/bmn/auction-candidates/_lib/nota-kpknl-defaults.ts`
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 60: Nota Dinas KSDAE & Surat Permohonan KPKNL

> Document updated: 2026-05-27
> Status: **MERGED** ✅ (deploy SSH ditunda)

---

## Issue #372: Add Nota Dinas KSDAE and Surat Permohonan KPKNL documents

### Completed:
- [x] **Issue Created**: Issue #372.
- [x] **PR Created/Merged**: PR #373 merged ke `main` (merge commit `abecc91`).
- [x] **Branch Cleanup**: remote branch `issue/372-nota-dinas-kpknl` deleted after merge.
- [x] **Nota Dinas KSDAE** (`ND.270/K.18/TU/KAP.06.01/B/MM/YYYY`):
  - Halaman 1 portrait: KOP + title "NOTA DINAS" + Nomor (tanpa underline) + meta grid (Yth/Dari/Perihal/Lampiran/Tanggal, tanpa garis horizontal di bawah Tanggal) + 2 body paragraphs (indent 2.5em) + TTD (tanpa label "Kepala Balai,", hanya `${ttd_pengirim}` + nama tidak bold + NIP) + Tembusan (conditional numbering: 1 item tanpa nomor, 2+ dengan nomor)
  - Halaman 2 landscape: lampiran tabel 10 kolom (No, Kode Barang, NUP, Nama Barang, Merk/Type, No Polisi, Tahun Perolehan, Nilai Perolehan, Nilai Taksiran, Kondisi, Keterangan)
- [x] **Surat Permohonan KPKNL** (`S.331/K.18/TU/KAP.06.01/B/MM/YYYY`):
  - Halaman 1 portrait: KOP + meta grid (Nomor/Sifat/Lampiran/Perihal + Tanggal) + Yth block (Kepala KPKNL Samarinda) + 2 body paragraphs (indent 2.5em) + TTD + Tembusan
  - Halaman 2 landscape: lampiran tabel 10 kolom (sama dengan Nota Dinas)
- [x] **Shared component**: `AssetLampiranLandscapeTable.tsx` — reusable landscape table dengan prefix-aware CSS (nd- atau pkpknl-), 10 kolom, auto-fill dari assets, jumlah row, TTD Kepala Balai.
- [x] **State hook**: `useNotaKpknlBuilderState.ts` — perihal, lampiran, lokasi, tembusan (SkBuilderItem[]), kesimpulan, nilaiTaksiran.
- [x] **Section editors**: `NotaDinasSection.tsx` + `PermohonanKpknlSection.tsx` — builder panels dengan textarea + tembusan list editor + input nilai taksiran.
- [x] **Body paragraph formatting**:
  - Indent 2.5em untuk "Dalam rangka..." dan "Demikian..." paragraphs (preview + print window CSS)
  - Nilai perolehan + nilai taksiran dengan terbilang lowercase + suffix `,-`
  - Lokasi inline editable di dalam paragraph pertama
- [x] **Tembusan conditional numbering**: jika 1 item → tanpa nomor, jika 2+ → numbered list `1.`, `2.`, dst.
- [x] **TTD format**: tanpa label "Kepala Balai,", hanya `${ttd_pengirim}` placeholder + nama (tidak bold) + NIP.
- [x] **Lampiran landscape**:
  - Tabel 10 kolom dengan column widths optimized (Kode Barang 10%, Keterangan 13%)
  - `whiteSpace: nowrap` untuk Kode Barang, Tahun Perolehan, Nilai Perolehan/Taksiran cells agar tidak pecah baris
  - Jumlah row dengan background gray
  - TTD Kepala Balai di kanan bawah
- [x] **numberToWords() fix**: Handle Juta/Miliar/Triliun correctly di `auction-helpers.ts` (sebelumnya hanya sampai Ribu, causing 246 million → "dua ratus empat puluh enam ribu..." instead of "dua ratus empat puluh enam juta...").
- [x] **Wire-up**: `useDocumentToggles` (showNotaDinas + showPermohonanKpknl), `useDocumentNumbers` (notaDinasNumber default "270" + permohonanKpknlNumber default "331"), `DocumentActions` (tombol lime + violet, grid 3×4), `DocumentNumberInputs` (2 panel input baru, label "12 dokumen"), `SelectedAssetsBanner` (2 tombol Cetak baru), `page.tsx` (render sections).
- [x] **Print window CSS**: Both documents have full print CSS with `@page` A4 portrait/landscape, margin BSrE safe area, body paragraph `text-indent: 2.5em`.
- [x] **Default numbers**: Nota Dinas `ND.270/...`, Permohonan KPKNL `S.331/...`.

### Pending:
- [ ] **Deploy ke SSH production**: Ditunda sesuai permintaan user.

### Key Files:
- New (8): `_lib/nota-kpknl-defaults.ts`, `_hooks/useNotaKpknlBuilderState.ts`, `_components/AssetLampiranLandscapeTable.tsx`, `_components/NotaDinasDocument.tsx`, `_components/PermohonanKpknlDocument.tsx`, `_components/sections/NotaDinasSection.tsx`, `_components/sections/PermohonanKpknlSection.tsx`
- Modified (7): `_lib/auction-helpers.ts`, `_hooks/useDocumentToggles.ts`, `_hooks/useDocumentNumbers.ts`, `_components/DocumentActions.tsx`, `_components/DocumentNumberInputs.tsx`, `_components/SelectedAssetsBanner.tsx`, `page.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### User Corrections Applied:
1. ✅ Judul "NOTA DINAS" dan "Nomor : ..." TIDAK pakai garis bawah
2. ✅ TIDAK ada garis horizontal di bawah baris Tanggal
3. ✅ Tembusan: jika hanya 1 item → tampil tanpa nomor, jika 2+ → pakai numbered list
4. ✅ TTD: TIDAK ada label "Kepala Balai,", hanya `${ttd_pengirim}` placeholder + nama (tidak bold) + NIP
5. ✅ Tembusan title "Tembusan :" tidak bold
6. ✅ Body paragraph indent 2.5em (masuk ke dalam) untuk "Dalam rangka..." dan "Demikian..."
7. ✅ Lampiran landscape: Kode Barang tidak boleh pecah baris (nowrap), Keterangan harus cukup lebar (13%)
8. ✅ Nilai terbilang pakai lowercase + suffix `,-` (contoh: "dua ratus empat puluh enam juta empat ratus sepuluh ribu rupiah")
9. ✅ Fixed numberToWords() untuk handle Juta/Miliar/Triliun (was only handling up to Ribu)

---

# Progress - Phase 59: SK Tim Penilai (Panitia Penaksir Harga BMN)

> Document updated: 2026-05-23
> Status: **MERGED** ✅ (deploy SSH ditunda)

---

## Issue #370: Add SK Tim Penilai document with print pagination

### Completed:
- [x] **Issue Created**: Issue #370.
- [x] **PR Created/Merged**: PR #371 merged ke `main` (merge commit `5a9a9de`).
- [x] **Branch Cleanup**: remote branch `issue/370-sk-tim-penilai` deleted after merge.
- [x] **Defaults**: `_lib/sk-tim-penilai-defaults.ts` — `TimPenilaiAnggota` interface (4 fields), `SkTimPenilaiMemutuskan` (5 fields incl. keempat), 13 peraturan default, 3 anggota default.
- [x] **Builder hook**: `useSkTimPenilaiBuilderState` — state Menimbang/Mengingat/Memutuskan/Tembusan.
- [x] **List hook**: `useTimPenilaiList` — CRUD + select pegawai.
- [x] **Builder UI**: `SkTimPenilaiBuilder` — varian SkBuilder dengan KEEMPAT textarea + ring emerald.
- [x] **Document**: `SkTimPenilaiDocument` — judul beda, 4 keputusan + KEEMPAT row, lampiran tabel 4 kolom, JS print pagination dengan continuation words.
- [x] **Editor**: `TimPenilaiEditor` — list editor + field Keterangan.
- [x] **Section**: `SkTimPenilaiSection` — preview wrapper.
- [x] **Wire-up**: `useDocumentToggles` (showSkTimPenilai), `useDocumentNumbers` (skTimPenilaiNumber default "107"), `DocumentActions` (tombol emerald, grid 3×3), `DocumentNumberInputs` (panel SK Tim Penilai), `SelectedAssetsBanner` (Cetak SK Tim Penilai), `page.tsx` (render section).
- [x] **Print pagination**: mirror SK Panitia mechanism — sambungan kata pojok kanan bawah, margin BSrE 28mm bawah halaman utama, 18mm atas halaman lanjutan, blok-blok dipaginate (Menimbang → Mengingat → MEMUTUSKAN+Menetapkan → KESATU → KEDUA → KETIGA → KEEMPAT+TTD+Tembusan).

### Pending:
- [ ] Deploy ke SSH production (ditunda sesuai permintaan user).

### Key Files:
- New: `_lib/sk-tim-penilai-defaults.ts`, `_hooks/useSkTimPenilaiBuilderState.ts`, `_hooks/useTimPenilaiList.ts`, `_components/SkTimPenilaiBuilder.tsx`, `_components/SkTimPenilaiDocument.tsx`, `_components/TimPenilaiEditor.tsx`, `_components/sections/SkTimPenilaiSection.tsx`
- Modified: `_hooks/useDocumentToggles.ts`, `_hooks/useDocumentNumbers.ts`, `_components/DocumentActions.tsx`, `_components/DocumentNumberInputs.tsx`, `_components/SelectedAssetsBanner.tsx`, `page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 58: Auction Layout Cleanup + Production Deploy

> Document updated: 2026-05-23
> Status: **MERGED + DEPLOYED** ✅

---

## Issue #368: Cleanup auction-candidates layout + fix Total Rusak Berat

### Completed:
- [x] **Issue Created**: Issue #368.
- [x] **PR Created/Merged**: PR #369 merged ke `main` (merge commit `e2dee79`).
- [x] **Branch Cleanup**: remote branch `issue/368-cleanup-auction-layout` deleted after merge.
- [x] **Bug fix Total Rusak Berat**: dedicated count query `bmn-auction-candidates-count` (per_page=1) di `useAuctionAssets`. Total stabil regardless dari pagination.
- [x] **PageHeader simplified**: title + subtitle + Reset Pilihan saja.
- [x] **DocumentActions (NEW)**: card grid 4-kolom × 2-baris untuk 8 Generate buttons.
- [x] **DocumentNumberInputs collapsible**: default tertutup, grid 3-kolom + sub-card Referensi ST.
- [x] **SelectedAssetsBanner Cetak-only**: hapus 8 Generate duplikat. Pesan kontekstual.
- [x] **Spacing**: `space-y-8` → `space-y-6` untuk tighter layout.
- [x] **Production deployed**: server pulled main, backend + frontend rebuilt, migrations applied.

### Key Files:
- `_hooks/useAuctionAssets.ts` (count query baru + `totalRusakBerat`)
- `_components/PageHeader.tsx` (simplified)
- `_components/DocumentActions.tsx` (NEW)
- `_components/DocumentNumberInputs.tsx` (collapsible)
- `_components/SelectedAssetsBanner.tsx` (Cetak-only)
- `page.tsx` (wire up baru)

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

## Production Deploy Batch (2026-05-23)

### Scope:
39 commit batch dari `60151b2` → `e2dee79`. Mencakup issue #346, #348, #350, #352, #354, #356, #358, #360, #361, #364, #365, #368.

### Steps:
- [x] SSH to `ec2-user@15.135.114.1` dengan `bksda-superapp.pem`
- [x] `git pull origin main` di server (39 commit fast-forward)
- [x] `docker-compose ... build backend frontend`
- [x] `docker-compose ... up -d backend frontend` (recreate)
- [x] `php artisan migrate --force` — 2 migrations applied:
  - `add_no_mesin_to_bmn_assets_table` (34.46ms)
  - `add_template_type_to_st_assignment_letters_table` (16.41ms)

### Verification:
- [x] Container `bksda-backend` Up
- [x] Container `bksda-frontend` Up
- [x] `https://bksdakaltim.net/login` → HTTP 200
- [x] `https://bksdakaltim.net/bmn/auction-candidates` → HTTP 307 (protected, expected)
- [x] `migrate:status` confirm 2 migrations `Ran` (batch 4)

---

# Progress - Phase 57: BMN Penghapusan Template Finalize

> Document updated: 2026-05-23
> Status: **MERGED** ✅

---

## Issue #364: Finalize BMN Penghapusan Template State

### Completed:
- [x] **Issue Created**: Issue #364.
- [x] **PR Created/Merged**: PR #367 merged ke `main` (merge commit `560f752`).
- [x] **Branch Cleanup**: remote branch `issue/364-st-template-bmn` deleted after merge.
- [x] **Backend migration**: `add_template_type_to_st_assignment_letters_table.php` — kolom `template_type` (nullable string max:50) `after('kode_surat')`.
- [x] **Backend Model**: `AssignmentLetter` `$fillable` ditambah `template_type`.
- [x] **Backend Request**: validation rule `template_type` nullable|string|max:50.
- [x] **Backend Controller**: `store()` dan `update()` simpan `template_type`.
- [x] **Frontend templateType state** independent dari sumberDana (builder + create).
- [x] **buildBiayaText**: return `''` saat templateType BMN (skip baris biaya).
- [x] **buildUntukText**: paksa freeform tanpa date suffix saat templateType BMN.
- [x] **STBuilderPreview**: item ke-3 Untuk pakai "7 (tujuh) hari" (tanpa "kerja") saat templateType BMN.
- [x] **Tombol Apply/Reset di paling atas sidebar** (builder + create) — card orange dengan toggle state.
- [x] **applyBmnTemplate**: defaults `klasifikasi=KAP.05`, `sumberDana=dl1`, `tanggalMulai=tanggalSelesai=today`.
- [x] **resetBmnTemplate**: clear templateType only (state lain dibiarkan).
- [x] **handlePrint create page** disync dengan builder full CSS rules (KOP, surat-content, untuk-entry break-inside, @page margin).
- [x] **Rule global `.penutup-ttd-group`**: bungkus `Demikian + TTD + Tembusan` dengan `pageBreakInside: avoid` (semua ST, bukan hanya BMN).
- [x] **Badge "Template BMN" di Inbox**: list cards + detail panel pill.
- [x] **Badge "Template BMN" di History**: table cell di samping `nomor_surat`.
- [x] **API payloads** include `template_type` (3 di builder + 1 di create).
- [x] **fetchAndParse** load `template_type` dari API saat edit existing ST.
- [x] **Hapus opsi `bmn`** dari `SUMBER_DANA_OPTIONS` (tidak diperlukan lagi).
- [x] **Local migration applied** — kolom `template_type` ada di local DB.

### Pending / TODO:
- [ ] **Production migrate**: Wajib `php artisan migrate` di backend container saat deploy ke SSH production.

### Key Files:
- Backend: `Migrations/2026_05_23_100000_*.php` (new), `Models/AssignmentLetter.php`, `Requests/AssignmentLetterRequest.php`, `Controllers/AssignmentLetterController.php`
- Frontend builder: `surat-tugas/builder/[id]/page.tsx`, `STBuilderPreview.tsx`
- Frontend create: `surat-tugas/create/page.tsx`
- Frontend list: `surat-tugas/inbox/page.tsx`, `_components/AssignmentHistoryTab.tsx`

### Validation:
- [x] `php -l` clean (4 PHP files)
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Out of Scope (sesuai konfirmasi user):
- ❌ TIDAK ada tombol "Generate ST Pemeriksaan" di /bmn/auction-candidates.
- ❌ TIDAK ada redirect dari modul BMN.

---

# Progress - Phase 56: Refactor Auction Candidates Page

> Document updated: 2026-05-23
> Status: **MERGED** ✅

---

## Issue #365: Refactor auction-candidates page.tsx into hooks and section components

### Completed:
- [x] **Issue Created**: Issue #365.
- [x] **PR Created/Merged**: PR #366 merged ke `main` (merge commit `d90a519`).
- [x] **Branch Cleanup**: remote branch `issue/365-refactor-auction-candidates-page` deleted after merge.
- [x] **page.tsx**: 1184 → 288 baris (~75% reduction).
- [x] **8 custom hooks** baru di `_hooks/`:
  - `useAuctionAssets` — query + selection + ordering + drag-drop
  - `useDocumentToggles` — 8 show flags + handleProcess* + resetAllShows + scroll
  - `useDocumentNumbers` — 11 number/date states
  - `useEmployeeOptions` — sorted employees
  - `usePemeriksaList` / `usePanitiaList` — CRUD + select pegawai
  - `useSkBuilderState` / `useSkPanitiaBuilderState` — SK state
- [x] **7 UI components** baru di `_components/`:
  - `PageHeader`, `SearchBar`, `DocumentNumberInputs`, `SelectedAssetsBanner`, `AssetTable`, `PemeriksaEditor`, `PanitiaEditor`
- [x] **8 section wrappers** baru di `_components/sections/`:
  - BaKoreksi, SkPenghentian, SkPanitia, SptjLimit, Sptjm, SpTugas, SkKebenaran, BaPemeriksaan
- [x] **Zero behavior change**: className, IDs, layouts, side-effects, validation toasts, disable rules — semua identical.
- [x] **Existing files untouched**: Document components, SkBuilder, ReorderPanel, SummaryTile, `_lib/`.
- [x] **Print handlers preserved**: `handlePrintBa`, `handlePrintSk`, dll tetap di page.tsx.
- [x] **`kepalaBalai` shared**: SK Penghentian & SK Panitia pakai single source dari `useSkBuilderState`.

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx` (refactored)
- `frontend/src/app/bmn/auction-candidates/_hooks/*.ts` (8 new files)
- `frontend/src/app/bmn/auction-candidates/_components/*.tsx` (7 new files)
- `frontend/src/app/bmn/auction-candidates/_components/sections/*.tsx` (8 new files)

### Pattern Reference:
- Issue #340 (refactor sebelumnya yang split page.tsx jadi 6 file).

---

# Progress - Phase 55: Generate ST Pemeriksaan Redirect (WIP)

> Document updated: 2026-05-22 (sore)
> Status: **WIP — siap user testing besok** ⏳

---

## Issue #364: Generate ST Pemeriksaan Button + Auto-fill Template + Cetak Fix + TTD Group Rule

### Completed (di branch `issue/364-generate-st-pemeriksaan`):
- [x] **Issue Created**: Issue #364.
- [x] **Branch + WIP Commit**: `issue/364-generate-st-pemeriksaan` di-push (commit `8523646`).
- [x] **Tombol indigo "Generate ST Pemeriksaan"**: Di action bar dan banner `/bmn/auction-candidates`. Onclick `router.push('/kepegawaian/surat-tugas/create?template=bmn-pemeriksaan')`.
- [x] **ST create auto-fill via query param**: `useEffect` deteksi `template=bmn-pemeriksaan`, set state via `templateAppliedRef` (one-shot).
- [x] **Klasifikasi**: `KAP.05` saat template aktif.
- [x] **Sumber Dana**: opsi baru `bmn` ("BMN Penghapusan (tanpa biaya)") di SUMBER_DANA_OPTIONS create page.
- [x] **Menimbang 2 items + Dasar 8 peraturan**: Sama dengan template di builder.
- [x] **buildBiayaText**: return empty saat `sumberDana === 'bmn'` → baris biaya skip.
- [x] **buildUntukText fix**: Support mode freeform (clean text dari `namaKegiatan`). Saat `bmn`, paksa freeform tanpa suffix "selama X hari" meski user isi tanggal mulai/selesai.
- [x] **handlePrint create page synced dengan builder**: CSS rules lengkap (KOP, surat-content, untuk-entry break-inside, @page margin 3cm/0.7cm) → cetak/save PDF tidak rusak.
- [x] **Conditional laporan tertulis text**: `bmn` pakai "7 (tujuh) hari" (tanpa "kerja"). Default tetap "7 (tujuh) hari kerja".
- [x] **Rule global TTD**: Bungkus `Demikian + TTD + Tembusan` jadi `.penutup-ttd-group` dengan `pageBreakInside: avoid`. Kalau TTD tidak fit halaman, seluruh blok turun ke halaman berikutnya.

### Pending / TODO Besok:
- [ ] **User testing**: Refresh, klik tombol indigo, cek Untuk format (harus 1 baris saja, tanpa "dari... ke... selama"), preview cetak, save PDF, rule TTD pagination.
- [ ] **Fix bugs jika ada** di branch yang sama.
- [ ] **PR + merge** kalau testing OK.

### Key Files Modified:
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 54: BA Pemeriksaan Lampiran + ST BMN Template

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #361: BA Pemeriksaan Lampiran (Asset Table + Dual-Column TTD)

### Completed:
- [x] **Issue Created**: Issue #361.
- [x] **PR Created/Merged**: PR #362 merged ke `main` (merge commit `6b2ac4a`).
- [x] **Branch Cleanup**: remote branch `issue/361-ba-pemeriksaan-lampiran` deleted after merge.
- [x] **Lampiran page**: `page-break-before: always`, halaman 2 setelah halaman utama BA.
- [x] **Header lampiran editable**: Lampiran / Nomor / Tanggal (semua editable inline).
- [x] **Tabel 11 kolom**: No, Kode Barang, NUP, Nama Barang, Merk/Type, No Polisi, Tahun Perolehan, Nilai Perolehan (Rp), Nilai Buku, Nilai Taksiran (Rp), Kondisi.
- [x] **All cells contentEditable**: Inline edit semua sel tabel.
- [x] **Dual-column TTD**:
  - Kiri: `Samarinda, {date}` / `Pelaksana Kegiatan,` / 2x2 grid pemeriksa (kolom kiri 1,2; kolom kanan 3,4) dengan ruang paraf, nama bold, NIP.
  - Kanan: `Mengetahui,` / `Kepala Balai,` / ruang TTD / nama bold + NIP.
- [x] **Page-break safety**: Row tabel + TTD block `break-inside: avoid`.
- [x] **Asset count guard**: Tombol Generate BA Pemeriksaan disabled saat 0 aset; handler check minimal 1 aset.
- [x] **Props baru**: BaPemeriksaanDocument terima `assets: AuctionAsset[]` dan `kepalaBalai: SkKepalaBalai`.

### Key Files Modified:
- `frontend/src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

## Issue #360: Apply BMN Penghapusan Template Button for ST Builder

### Completed:
- [x] **Issue Created**: Issue #360.
- [x] **PR Created/Merged**: PR #363 merged ke `main` (merge commit `270394d`).
- [x] **Branch Cleanup**: remote branch `issue/360-st-bmn-template` deleted after merge.
- [x] **New SUMBER_DANA option**: `bmn` (label `BMN Penghapusan (tanpa biaya)`).
- [x] **buildBiayaText**: Return empty string saat `sumberDana === 'bmn'`.
- [x] **applyBmnTemplate handler**: One-click set Klasifikasi `KAP.05`, sumberDana `bmn`, header `KEPALA BALAI,`, Menimbang (2 items), Dasar (8 peraturan UU/PP/Perpres/PMK), freeform Untuk dengan placeholder `{tanggal_pemeriksaan}`, reset tembusan.
- [x] **Tombol orange "Apply Template BMN Penghapusan"**: Di sidebar ST Builder di atas Sumber Dana select.
- [x] **Preview filter**: STBuilderPreview filter empty string di Untuk list agar baris biaya kosong tidak ter-render.

### Key Files Modified:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`

### Validation:
- [x] `npx eslint <both files> --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

### How to Use:
1. Buka ST manapun di builder (`/kepegawaian/surat-tugas/builder/[id]`).
2. Klik **Apply Template BMN Penghapusan** (orange) di sidebar.
3. Isi tanggal pemeriksaan dan pilih 4 pegawai pemeriksa.
4. Save & generate.

---

# Progress - Phase 53: Add no_mesin Field for Motor Vehicles

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #358: Add no_mesin Field for Motor Vehicles with no_polisi

### Completed:
- [x] **Issue Created**: Issue #358.
- [x] **PR Created/Merged**: PR #359 merged ke `main` (merge commit `bed9cce`).
- [x] **Branch Cleanup**: remote branch `issue/358-add-no-mesin` deleted after merge.
- [x] **Migration**: `2026_05_22_163000_add_no_mesin_to_bmn_assets_table.php` — kolom `no_mesin` nullable string, posisi `after('no_stnk')`.
- [x] **Backend Model**: `Asset` `$fillable` ditambah `no_mesin`.
- [x] **Backend Resource**: `AssetResource` expose `no_mesin` di response API.
- [x] **Backend Validation**: `UpdateAssetRequest` rule `['sometimes', 'nullable', 'string']`.
- [x] **Frontend Detail Asset**: `bmn/assets/[id]/page.tsx` tambah `EditableRow` + `DetailRow` untuk "No Mesin" — conditional render hanya untuk `ALAT ANGKUTAN BERMOTOR` + `no_polisi` valid (mirror pattern `no_rangka`).
- [x] **Frontend Auction Helpers**: `AuctionAsset` interface ditambah `no_mesin?: string | null`.
- [x] **SK Kebenaran Auto-fill**: `SkKebenaranDokumenDocument.tsx` kolom Nomor Mesin auto-fill dari `asset.no_mesin || ""` (tetap editable inline via `contentEditable`).
- [x] **Local migration applied**: `php artisan migrate --path=...` SELESAI di local DB.

### Pending / TODO:
- [ ] **Production migrate**: Wajib `php artisan migrate` di backend container saat deploy ke SSH production.

### Key Files Created:
- `backend/database/migrations/2026_05_22_163000_add_no_mesin_to_bmn_assets_table.php`

### Key Files Modified:
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Resources/AssetResource.php`
- `backend/app/Modules/Bmn/Requests/UpdateAssetRequest.php`
- `frontend/src/app/bmn/assets/[id]/page.tsx`
- `frontend/src/app/bmn/auction-candidates/_lib/auction-helpers.ts`
- `frontend/src/app/bmn/auction-candidates/_components/SkKebenaranDokumenDocument.tsx`

### Validation:
- [x] `php -l` clean for 4 PHP files (Asset.php, AssetResource.php, UpdateAssetRequest.php, migration).
- [x] `npx eslint "src/app/bmn/**" --max-warnings=0` clean.
- [x] `npx tsc --noEmit` clean.
- [x] `npm run build` clean (59/59 static pages).

---

# Progress - Phase 52: 5 Supporting Documents for Auction

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #356: 5 Supporting Documents for Auction Candidates

### Completed:
- [x] **Issue Created**: Issue #356.
- [x] **PR Created/Merged**: PR #357 merged ke `main` (merge commit `1b88d7c`).
- [x] **Branch Cleanup**: remote branch `issue/356-bmn-supporting-documents` deleted after merge.
- [x] **SPTJ Nilai Limit** (`SM.41/K.18/TU/KAP.06.01/MM/YYYY`): 1 halaman, pernyataan tanggung jawab nilai limit + TTD Kepala Balai.
- [x] **SPTJM** (`SPTJM.202/K.18/TU/KAP.06.01/MM/YYYY`): 1 halaman, pernyataan tanggung jawab mutlak + TTD Kepala Balai.
- [x] **SP Tidak Mengganggu Tugas** (`SM.40/K.18/TU/KAP.06.01/MM/YYYY`): 1 halaman, pernyataan tidak ganggu tugas dinas + TTD Kepala Balai.
- [x] **SK Kebenaran Fotokopi Dokumen Kepemilikan** (`KT.200/K.18/TU/KAP.06.01/MM/YYYY`): judul 4 baris, tabel 6 kolom (No, No Dokumen, Merk/Tipe, No Mesin, No Rangka, No Polisi). Semua sel `contentEditable`. Data otomatis dari `no_identitas`, `merk_tipe`, `no_rangka`, `no_polisi`. Pangkat/Gol `Pembina Muda Tk.I / IV b`. Nomor Mesin default kosong.
- [x] **BA Pemeriksaan BMN** (`BA.158/K.18/TU/KAP.06.01/MM/YYYY`): 4 pemeriksa default editable (DHENY MARDIONO, HERYANTO SUMANBOWO, HARDI PURNAMA, TEGAR ANUGRAH). Select pegawai dari `/kepegawaian/employees/select`. Input Nomor ST + Tanggal ST. Spelled date. **Tanpa TTD Kepala Balai**.
- [x] **Pattern reuse**: setiap dokumen pakai `window.open()` + inject HTML/CSS print, KOP `/header-new.png`, Bookman Old Style 11pt.
- [x] **A4 + BSrE safe area**: `@page { size: A4; margin: 0 0 28mm 0; }` untuk semua dokumen baru.
- [x] **Action bar tombol**: blue (SPTJ Limit), purple (SPTJM), pink (SP Tugas), cyan (SK Kebenaran), orange (BA Pemeriksaan).
- [x] **Panel input nomor surat**: grid 2/3 kolom untuk 5 nomor baru + Nomor ST + Tanggal ST.
- [x] **Helper `resetAllShows()`**: dokumen mutually exclusive (hanya 1 preview tampil sekaligus).
- [x] **No backend migration**: Nomor Mesin di-handle inline-edit di SK Kebenaran (tidak nambah field DB).

### Pending / TODO:
- [ ] **Deploy ke SSH production**: Tunggu batch BMN siap deploy.

### Key Files Created:
- `frontend/src/app/bmn/auction-candidates/_components/SptjLimitDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SptjmDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SpTugasDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SkKebenaranDokumenDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/BaPemeriksaanDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_lib/pemeriksa-defaults.ts`

### Key Files Modified:
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/bmn/auction-candidates/_lib/auction-helpers.ts`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/**/*.{ts,tsx}" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean (59/59 static pages)

---

# Progress - Phase 51: SK Panitia Penghapusan BMN

> Document updated: 2026-05-22
> Status: **MERGED** ✅

---

## Issue #354: SK Panitia Penghapusan BMN

### Completed:
- [x] **Issue Created**: Issue #354.
- [x] **PR Created/Merged**: PR #355 merged ke `main` (merge commit `c353bee`).
- [x] **Branch Cleanup**: remote branch `issue/354-sk-panitia-penghapusan` deleted after merge.
- [x] **SK Panitia Document**: Komponen `SkPanitiaDocument.tsx` — mirip SK Penghentian tapi isi berbeda (Panitia Penghapusan).
- [x] **Defaults**: `sk-panitia-defaults.ts` — Menimbang 2 item, Mengingat 8 peraturan, Memutuskan (KEDUA punya sub-items), Tembusan 3 item (termasuk "Yang Bersangkutan").
- [x] **Lampiran tabel border**: No. | Nama/NIP/Jabatan | Jabatan dalam Kegiatan (tanpa Keterangan).
- [x] **Employee search**: Dropdown dari `/kepegawaian/employees/select` untuk susunan panitia. Auto-fill nama, NIP (formatted), jabatan instansi (dari field `position`).
- [x] **Toggle 3 dokumen**: BA / SK Penghentian / SK Panitia — hanya satu tampil.
- [x] **Tombol teal**: "Proses SK Panitia" di action bar dan banner.
- [x] **Input nomor SK Panitia**: Format `SK.____/K.18/TU/KAP.05/MM/YYYY`.
- [x] **Spacing tuning**: line-height 1.25, reduced margins/paddings, firstPageContentH=264mm, continuationContentH=251mm, marker reserve 9mm.
- [x] **Continuation words**: Pagination eksplisit dengan kata penyambung (reuse pattern dari SK Penghentian).
- [x] **TTD grouping**: `KETIGA + TTD + Tembusan` tetap satu paket agar TTD tidak jatuh sendiri tanpa kalimat pengantar.
- [x] **KEDUA sub-items**: sub-item a/b/c/d dirender sebagai grid supaya alignment stabil.
- [x] **Default Penanggung Jawab**: Kepala Balai `M. ARI WIBAWANTO, S.HUT., M.SC.` menjadi nomor 1 di susunan panitia dengan jabatan kegiatan `Penanggung Jawab`.
- [x] **Judul SK Panitia**: halaman 1 menampilkan baris `PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR`.
- [x] **Lampiran line break**: jabatan Kepala Balai di tabel lampiran memecah `Kalimantan Timur` ke baris bawah.
- [x] **Lint cleanup**: Bersihkan blocker lama di `portal` dan `EmployeeAccessSheet` sehingga full lint kembali clean.

### Pending / TODO:
- [ ] **Deploy ke SSH production**: Ditunda sampai user siap deploy batch BMN terbaru.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/SkPanitiaDocument.tsx` (new)
- `frontend/src/app/bmn/auction-candidates/_lib/sk-panitia-defaults.ts` (new)
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx` (lint cleanup)
- `frontend/src/app/portal/page.tsx` (lint cleanup)
- `frontend/src/app/portal/surat-tugas/[id]/page.tsx` (lint cleanup)

### Validation:
- [x] `npm run lint -- --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [x] `git diff --check` clean

---

# Progress - Phase 50: SK Continuation Words

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #352: Continuation Words at Page Breaks in SK Document

### Objective:
Saat halaman SK terpotong (misal Mengingat 8 di halaman 1, Mengingat 9 di halaman 2), tampilkan kata penyambung di pojok kanan bawah halaman yang terpotong. Contoh: `9. Peraturan Menteri Lingkungan.....` atau `KESATU.....`.

### Completed:
- [x] **Branch**: `issue/352-sk-continuation-words` aktif.
- [x] **Print-only pagination**: SK utama dipaginate menjadi halaman A4 eksplisit di `handlePrintSk`, sehingga preview cetak Chrome stabil.
- [x] **Continuation words**: Kata lanjutan muncul di pojok kanan bawah halaman sebelum item berikutnya turun, misalnya `9. Peraturan.....`, `MEMUTUSKAN.....`, atau `KETIGA.....`.
- [x] **Mengingat per item**: Setiap peraturan diperlakukan sebagai unit sendiri agar item panjang boleh turun halaman tanpa merusak item sebelumnya.
- [x] **MEMUTUSKAN + Menetapkan grouped**: Judul `MEMUTUSKAN` dan baris `Menetapkan` tetap satu kesatuan.
- [x] **KETIGA + TTD grouped**: Jika blok TTD harus turun ke halaman berikutnya, kalimat `KETIGA` ikut turun agar tanda tangan tidak terpotong sendiri.
- [x] **BSrE safe area**: Halaman utama memakai margin/padding bawah khusus untuk ruang teks tanda tangan elektronik otomatis dari aplikasi lain.
- [x] **Lampiran untouched**: Pagination lampiran SK tetap mengikuti aturan yang sudah disetujui sebelumnya.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `git diff --check -- frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx` clean

---

# Progress - Phase 49: SK Builder Panel

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #350: SK Builder Panel beside SK Preview

### Completed:
- [x] **Issue Created**: Issue #350.
- [x] **PR Created/Merged**: PR #351 merged ke `main` (merge commit `b833a20`).
- [x] **Branch Cleanup**: `issue/350-sk-builder` deleted after merge.
- [x] **Split Layout**: Builder di kiri (`lg:grid-cols-[400px_1fr]`), preview di kanan, builder ter-hide saat cetak (`print:hidden`).
- [x] **Card Menimbang**: Default 2 item (a, b). Tombol "+ Tambah" untuk c, d, e, ... Tombol "Hapus" per item (disabled jika hanya 1 tersisa).
- [x] **Card Mengingat**: Default 9 peraturan. Tambah/hapus item. Number column diperbesar dari 6mm → 9mm untuk 2-digit (10+).
- [x] **Card Memutuskan**: 4 textarea (Menetapkan, KESATU, KEDUA, KETIGA), tidak bisa tambah/hapus.
- [x] **Card Kepala Balai**: Dropdown dari API `/kepegawaian/employees/select`, sorted alphabetically. On select: nama auto-uppercase (`UPPERCASE`), NIP auto-format spasi (`19740514 199903 1 001`).
- [x] **Card Tembusan**: Default 2 item, tambah/hapus. Rendering: jika hanya 1 item → tanpa nomor, jika 2+ → nomor `1.`, `2.`, dst.
- [x] **KETIGA + TTD halaman 2 grouped**: `break-inside: avoid` agar kalau TTD turun, KETIGA ikut turun (tidak terpisah).
- [x] **Nama Kepala Balai tidak bold**: TTD halaman 2 + TTD lampiran (preview + print).
- [x] **State management**: Lifted ke `page.tsx`, di-pass sebagai props ke SkBuilder dan SkPenghentianDocument.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_lib/sk-defaults.ts` (new)
- `frontend/src/app/bmn/auction-candidates/_components/SkBuilder.tsx` (new)
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean

---

# Progress - Phase 48: SK Colon Alignment

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #348: Align Colons in SK Ditetapkan/Pada tanggal Block

### Completed:
- [x] **Issue Created**: Issue #348.
- [x] **PR Created/Merged**: PR #349 merged ke `main` (merge commit `b29e5f5`).
- [x] **Branch Cleanup**: `issue/348-sk-colon-align` deleted after merge.
- [x] **Grid 3 kolom**: `label / colon / value` dengan `grid-template-columns: max-content auto 1fr` agar `:` sejajar atas-bawah.
- [x] **Inline `display: grid`**: Tidak bergantung pada Tailwind class supaya berlaku di print window.
- [x] **CSS `.sk-ttd-meta`**: Ditambahkan di handlePrintSk print CSS dan `@media print` block dengan `display: grid !important`.
- [x] **Konsisten preview + print**: ':' sejajar di kedua mode.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean

---

# Progress - Phase 47: BA & SK TTD Spacing

> Document updated: 2026-05-21
> Status: **MERGED** ✅

---

## Issue #346: Widen TTD Spacing in BA and SK Documents

### Completed:
- [x] **Issue Created**: Issue #346.
- [x] **PR Created/Merged**: PR #347 merged ke `main` (merge commit `fa24541`).
- [x] **Branch Cleanup**: `issue/346-ba-ttd-spacing` deleted after merge.
- [x] **BA Halaman 1**: `Kepala Balai,` → 2rem spacing → `${ttd_pengirim}` → 2rem spacing → `M. ARI WIBAWANTO`.
- [x] **BA Lampiran**: Sama, jarak `mt-8` (2rem) di atas dan bawah placeholder.
- [x] **SK Halaman 2**: Spasi atas + bawah placeholder ditambah 2rem.
- [x] **SK Lampiran**: Spasi atas + bawah placeholder ditambah 2rem.
- [x] **Posisi horizontal**: Tidak berubah, `${ttd_pengirim}` tetap di tengah dengan padding-left 1.35cm.
- [x] **Print + screen consistent**: Tambah `margin-top: 2rem; margin-bottom: 2rem` di JSX (Tailwind `mt-8`), `handlePrintBa`/`handlePrintSk` print CSS, `@media print` block, dan screen CSS (`.sk-print-root`).

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/BaKoreksiDocument.tsx`
- `frontend/src/app/bmn/auction-candidates/_components/SkPenghentianDocument.tsx`

### Validation:
- [x] `npx eslint --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean

---

# Progress - Phase 46: BA Koreksi Lampiran Pagination

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #344: BA Koreksi Lampiran Pagination & Bottom Margin

### Completed:
- [x] **Issue Created**: Issue #344.
- [x] **PR Created/Merged**: PR #345 merged ke `main` (`db598ca`).
- [x] **Branch Cleanup**: `issue/344-ba-lampiran-pagination` deleted after merge.
- [x] **`@page { margin-bottom: 28mm }`**: Margin bawah semua halaman untuk BSrE footer.
- [x] **Measured pagination final**: Natural browser pagination diganti menjadi halaman lampiran eksplisit berbasis hasil ukur tinggi row.
- [x] **`break-inside: avoid` per `<tr>`**: Setiap row tabel tidak terpotong di tengah.
- [x] **`display: table-header-group`**: Header tabel otomatis repeat di setiap halaman baru.
- [x] **Sebelum lalu Sesudah**: Urutan lampiran mengikuti dokumen resmi; bagian `I. Sebelum` selesai dulu sebelum `II. Sesudah`.
- [x] **TTD reserved space**: Signature block dihitung sebagai area utuh di halaman terakhir.
- [x] **Measured row pagination**: Lampiran BA memakai tinggi row aktual agar stabil untuk nama barang panjang-pendek.
- [x] **Sequential sections**: `I. Sebelum` diselesaikan dulu sampai habis, baru lanjut `II. Sesudah`.
- [x] **Continuation header**: Halaman lanjutan tidak mengulang label `I. Sebelum` / `II. Sesudah`; diganti baris nomor kolom `1 2 3 ...`.
- [x] **Signature safe area**: Halaman terakhir menghitung tinggi blok TTD agar `${ttd_pengirim}`, nama, dan NIP tidak terpotong.

### Pending / Known Issues:
- [ ] **Deploy ke SSH production**: Ditunda sampai user siap deploy batch BMN terbaru.

### Key Files:
- `frontend/src/app/bmn/auction-candidates/_components/BaKoreksiDocument.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/_components/BaKoreksiDocument.tsx" --max-warnings=0` clean
- [x] `npx tsc --noEmit` clean
- [x] `npm run build` clean
- [ ] Full `npm run lint -- --max-warnings=0` masih blocked oleh issue lama tidak terkait di `portal` dan `EmployeeAccessSheet`.

---

# Progress - Phase 45: Editable BA Builder + Refactor

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #340: Refactor Auction Candidates Page
- [x] PR #341 merged. Split 1518-line page.tsx into 6 files.

## Issue #342: Editable BA Builder + Toggle BA/SK
- [x] PR #343 merged. BA Koreksi editable (contentEditable), KAP field editable, toggle BA/SK.

---

# Progress - Phase 44: SK Penghentian Penggunaan BMN

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #338: SK Penghentian Penggunaan BMN

### Completed:
- [x] **Issue Created**: Issue #338.
- [x] **PR Created/Merged**: PR #339 merged ke `main` (merge commit `1ddfb1a`).
- [x] **Input Nomor SK**: Format `SK.____/K.18/TU/KAP.05/MM/YYYY` (bulan+tahun otomatis).
- [x] **Tombol Generate SK**: Tombol amber "Generate SK Penghentian" di action bar dan banner.
- [x] **Preview SK**: KOP+Judul+Menimbang+Mengingat → MEMUTUSKAN+TTD+Tembusan → Lampiran tabel.
- [x] **KOP**: Pakai `header-new.png` (sama dengan ST Builder).
- [x] **Tabel Lampiran**: No, Kode Barang, NUP, Nama, Merk/Type, No Polisi, Tahun, Nilai, Kondisi, Keterangan + baris Jumlah + TTD.
- [x] **Label tidak bold**: Menimbang, Mengingat, Menetapkan, KESATU, KEDUA, KETIGA tidak bold.
- [x] **Print Mengingat fixed**: Grid/block layout — hanya item berikutnya yang turun, bukan seluruh bagian.
- [x] **TTD/Tembusan fixed**: Tidak bold, rata kiri, spacing rapi.
- [x] **Lampiran pagination**: Halaman pertama max 15 aset, tengah max 17, terakhir max 10.
- [x] **Lampiran continuation header**: Hanya muncul di halaman lanjutan.
- [x] **BSrE safe area**: `@page { margin-bottom: 28mm }` di semua halaman.
- [x] **Preview screen**: Disamakan dengan CSS print.

### Pending:
- [ ] Deploy ke SSH production (bersama issue #336).

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx`

---

# Progress - Phase 43: BMN Reorder Selected Assets

> Document updated: 2026-05-20
> Status: **MERGED** ✅

---

## Issue #336: Reorder Selected Assets in Auction Candidates

### Completed:
- [x] **Issue Created**: Issue #336.
- [x] **PR Created/Merged**: PR #337 merged ke `main`.
- [x] **State Refactor**: `selectedIds` (Set) → `orderedIds` (array) untuk menjaga urutan.
- [x] **Panel Reorder**: "Urutan Aset Terpilih" dengan drag-and-drop native HTML5 + tombol ↑↓.
- [x] **Nomor Urut**: Badge merah (1, 2, 3, ...) per aset di panel.
- [x] **No Polisi**: Ditampilkan di panel jika aset memilikinya.
- [x] **Dokumen BA Koreksi**: Menggunakan urutan dari panel (bukan urutan API).

### Key Files:
- `frontend/src/app/bmn/auction-candidates/page.tsx`

### Note:
- Deploy ke SSH ditunda — masih ada fitur lanjutan di halaman ini.

---

# Progress - Phase 42: BMN Auction Candidates & BA Koreksi Kondisi

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #334: Aset Akan Di Lelang & BA Koreksi Kondisi BMN

### Completed:
- [x] **Issue Created**: Issue #334 tracks the BMN auction candidate page and first generated document workflow.
- [x] **PR Created/Merged**: PR #335 merged to `main` (`135ef77`).
- [x] **Sidebar Page**: Added `Aset Akan Di Lelang` in the BMN sidebar at `/bmn/auction-candidates`.
- [x] **Candidate Filtering**: Page loads BMN assets in `Rusak Berat` condition, with search, pagination, select all on page, and bulk selection.
- [x] **BA Koreksi Document**: Added preview/print for `BERITA ACARA KOREKSI PERUBAHAN KONDISI BARANG MILIK NEGARA`.
- [x] **Official Header**: Document uses `frontend/public/header-terbaru.png`.
- [x] **Print Layout Tuning**: Tuned A4 page 1 body, signature, `${ttd_pengirim}`, page 2 lampiran metadata, asset tables, and two-page print/save-PDF output.
- [x] **ST Builder Font Follow-up**: NIP and tembusan text now inherit the main ST Builder font size for both FOLU and non-FOLU layouts.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and production route checks passed.

### Key Files:
- `frontend/src/app/bmn/layout.tsx`
- `frontend/src/app/bmn/auction-candidates/page.tsx`
- `frontend/public/header-terbaru.png`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`

### Validation:
- [x] `npx eslint "src/app/bmn/auction-candidates/page.tsx" "src/app/bmn/layout.tsx" "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" --max-warnings=0`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [ ] Full `npm run lint -- --max-warnings=0` is still blocked by unrelated pre-existing lint issues in `portal` and `EmployeeAccessSheet` files.

### Production:
- [x] Server pulled `main` to `135ef77`.
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod build frontend`
- [x] `docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d frontend`
- [x] `bksda-frontend` and `bksda-nginx` containers are up.
- [x] `https://bksdakaltim.net/login` returns HTTP 200.
- [x] `https://bksdakaltim.net/bmn/auction-candidates` returns HTTP 307 to login because the route is protected.

---

# Progress - Phase 41: Kepegawaian ST Builder TTE & Tembusan Fix

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #332: ST Builder TTE Placeholder & Tembusan Numbering

### Completed:
- [x] **Issue Created**: Issue #332 tracks ST Builder print/PDF alignment for Srikandi TTE and non-FOLU tembusan numbering.
- [x] **PR Created/Merged**: PR #333 merged to `main` (`c67aca5`).
- [x] **TTE Placeholder Alignment**: Adjusted `${ttd_pengirim}` placement for FOLU and non-FOLU layouts so Srikandi TTE/QR lands in the signature area without covering the Kepala Balai name/NIP.
- [x] **Signature Spacing**: Increased placeholder height to reserve enough vertical space for large TTE overlays.
- [x] **Non-FOLU Tembusan Rule**: Single tembusan recipient now renders without numbering; two or more recipients remain numbered. FOLU tembusan remains numbered.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" --max-warnings=0`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [ ] Full `npm run lint -- --max-warnings=0` is still blocked by unrelated pre-existing lint issues in `portal` and `EmployeeAccessSheet` files.

---

# Progress - Phase 40: BMN Vehicle Document Uploads & Prod Bugfix

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #330: Add No Rangka Field for Motor Vehicles

### Completed:
- [x] **Database Migration**: Added `no_rangka` column to `bmn_assets` table.
- [x] **Backend Updates**: Added `no_rangka` to `Asset` model `$fillable`, `AssetResource.php`, and validation rules in `UpdateAssetRequest.php`.
- [x] **Frontend UI**: Updated `page.tsx` to conditionally render the "No Rangka" field below "No STNK" only when `jenis_bmn` is `ALAT ANGKUTAN BERMOTOR` and `no_polisi` exists.

### Key Files:
- `backend/database/migrations/2026_05_19_134552_add_no_rangka_to_bmn_assets_table.php`
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Resources/AssetResource.php`
- `backend/app/Modules/Bmn/Requests/UpdateAssetRequest.php`
- `frontend/src/app/bmn/assets/[id]/page.tsx`

---

## Issue #329: BPKB & STNK Upload for Vehicle Assets

### Completed:
- [x] **Database Migration**: Added 6 new columns to `bmn_assets` for 4 BPKB photos and 2 STNK photos.
- [x] **Backend Updates**: Updated `Asset` model `$fillable` and `forceDeleted` events. Modified `AssetResource` and `AssetPhotoController` to handle file uploads/deletions and ZIP downloads for the new document types.
- [x] **Frontend UI**: Refactored `PhotoGallery.tsx` and updated `page.tsx` to conditionally render a "Dokumen Kendaraan" section for `ALAT ANGKUTAN BERMOTOR` with a valid `no_polisi`.
- [x] **UI Improvement**: Relocated the "No BPKB" field from the Dokumen tab to the Identitas BMN (Kendaraan & Sertifikat) tab for better grouping.

### Production Bugfix (Issue #324 Regression):
- **Problem**: In production, the "Pilih Semua" and "Pilih hanya aset baru" buttons in the Import Review page were missing, and the "Setujui" button was locked. This worked in local development.
- **Root Cause**: The backend container was built using an old `Dockerfile` image cache that didn't include the recent PR #324 logic (`filtered_new` counts) because a simple `docker-compose restart` was used instead of `docker-compose build`.
- **Resolution**: SSH'd into the EC2 server and fully rebuilt the backend Docker image (`docker-compose build backend` & `up -d backend`), successfully syncing the container code with `main` and restoring the selection functionality.

### Key Files:
- `backend/database/migrations/2026_05_19_112752_add_bpkb_stnk_photos_to_bmn_assets_table.php`
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Controllers/AssetPhotoController.php`
- `frontend/src/app/bmn/assets/[id]/_components/PhotoGallery.tsx`
- `frontend/src/app/bmn/assets/[id]/page.tsx`

---

# Progress - Phase 39: BMN Disposal Invalid Date Fix & RustFS Cleanup

> Document updated: 2026-05-19
> Status: **DEPLOYED**

---

## Issue #326: BMN Disposal Invalid Date

### Completed:
- [x] **Issue Created**: Issue #326 tracks the "Invalid Date" bug on the disposal page.
- [x] **PR Created/Merged**: PR #327 merged to `main`.
- [x] **Root Cause Identified**: The `deleted_at` field was missing from the `AssetResource` API response.
- [x] **Backend Fix**: Added `deleted_at` to `AssetResource.php`.
- [x] **Frontend Fix**: Added null safety check and `id-ID` locale formatting for the deletion date in `disposal/page.tsx`.

### Key Files:
- `backend/app/Modules/Bmn/Resources/AssetResource.php`
- `frontend/src/app/bmn/disposal/page.tsx`

---

## Issue #328: RustFS Cleanup on Force Delete

### Completed:
- [x] **PR Created/Merged**: PR #328 merged to `main`.
- [x] **Root Cause Identified**: `bulkForceDelete` used a query builder delete, bypassing Eloquent model events. Consequently, physical photo files remained in RustFS (S3) after permanent deletion.
- [x] **Model Event Added**: Implemented `booted` method in `Asset.php` with a `forceDeleted` event listener to delete all 5 photo paths from storage.
- [x] **Controller Fix**: Updated `bulkForceDelete` in `AssetController.php` to fetch models and iterate with `$asset->forceDelete()` so that events are triggered.

### Key Files:
- `backend/app/Modules/Bmn/Models/Asset.php`
- `backend/app/Modules/Bmn/Controllers/AssetController.php`

---

# Progress - Phase 38: Production Fixes + ST Builder FOLU Template

## Issue #318: ST Builder Bottom Print Margin

### Completed:
- [x] **Issue Created**: Issue #318 tracks removal of the temporary BSrE footer test and preservation of bottom print spacing.
- [x] **PR Created/Merged**: PR #319 merged to `main` (`83f89c6`).
- [x] **Temporary Footer Removed**: BSrE test text is not part of the final output.
- [x] **Bottom Margin Preserved**: Print bottom margin stays at `1.9cm` for page 1 and continuation pages.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Current Print CSS State:
```css
@page { size: A4; margin: 3cm 1cm 1.9cm 1.55cm; }
@page :first { margin: 0.7cm 1cm 1.9cm 1.55cm; }
```

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

### Pending:
- [ ] Re-test ST Builder print preview spacing on production.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #320: Production Storage Proxy + Employee ST Link

### Completed:
- [x] **Issue Created**: Issue #320 tracks profile photo SSL errors and employee ST create route 404.
- [x] **PR Created/Merged**: PR #321 merged to `main` (`36298ca`).
- [x] **Storage Same-Origin Proxy**: Production storage URL now uses `https://bksdakaltim.net/storage`.
- [x] **Nginx Storage Proxy**: HTTPS `/storage/` now proxies to RustFS bucket `bksda`.
- [x] **Backend URL Fixed**: Backend `AWS_URL` now returns same-origin storage URLs from `Storage::url()`.
- [x] **Frontend Build Args Fixed**: Frontend uses `https://bksdakaltim.net/api` and `https://bksdakaltim.net/storage`.
- [x] **Next Image Config**: Added allowed remote patterns for main-domain storage and legacy storage subdomain.
- [x] **Employee ST Route Fixed**: Employee history CTA now links to `/kepegawaian/surat-tugas/create?employee_id=...`.
- [x] **Employee Preselect**: ST create page now auto-selects the employee from the `employee_id` query parameter.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt frontend, recreated backend/frontend/nginx, reloaded nginx, and `https://bksdakaltim.net/login` returned HTTP 200.

### Validation:
- [x] `npx eslint "src/app/kepegawaian/_components/AssignmentLetterHistory.tsx" "src/app/kepegawaian/surat-tugas/create/page.tsx" "next.config.ts"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [x] `php -l backend/app/Http/Controllers/Api/AuthController.php`
- [x] `php -l backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php`
- [x] `https://bksdakaltim.net/kepegawaian/surat-tugas/create?employee_id=78` returns HTTP 200.
- [x] Backend container env has `AWS_URL=https://bksdakaltim.net/storage`.

### Pending:
- [ ] Re-test production employee detail photo upload.
- [ ] Re-test production portal profile photo upload.
- [ ] Re-test employee detail -> Buat Surat Tugas auto-selects the employee.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #316: ST Builder Untuk Print Pagination

### Completed:
- [x] **Issue Created**: Issue #316 tracks the `Untuk` section print pagination bug.
- [x] **PR Created**: PR #317 opened from `issue/316-untuk-print-pagination` to `main`.
- [x] **PR Merged**: PR #317 merged to `main` (`76589fa`).
- [x] **Root Cause Identified**: `Untuk` still used nested table rows, and global `tr { break-inside: avoid }` made the whole section move to page 2.
- [x] **Untuk Layout Refactor**: Replaced nested table markup with grid/block layout so the section can paginate naturally.
- [x] **Print CSS Updated**: `.untuk-section` and `.untuk-list` can break across pages; `.untuk-entry` avoids splitting each numbered item.
- [x] **FOLU 2-Employee Scenario Targeted**: Fix targets the case where 2 FOLU employees leave blank space and push all `Untuk` items to the next page.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx" "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

### Pending:
- [ ] Re-test production FOLU print preview with 2 employees.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #314: ST Builder FOLU Funding Normalization

### Completed:
- [x] **PR Created**: PR #315 opened from `issue/314-folu-funding-builder` to `main`.
- [x] **Issue Created**: Issue #314 tracks the FOLU funding fallback bug.
- [x] **PR Merged**: PR #315 merged to `main` (`f4a34ba`).
- [x] **Funding Normalization**: ST Builder now maps submitted labels such as `Dana Kerjasama FOLU` and `Dana Kerjasama FOLU NC 2&3` to the internal `folu` option.
- [x] **Inbox Edit Bug Fixed**: Letters that show `Dana Kerjasama FOLU` in Inbox no longer open as `DIPA` when clicking **Edit Surat Tugas**.
- [x] **FOLU Menimbang Helper**: Added shared helper to extract kawasan from `Tempat Spesifik` or from activity text containing `di ...`.
- [x] **Patroli SMART Template**: FOLU activities containing `Smart Patrol` or `Patroli` now generate `Menimbang` with `melalui Patroli SMART`.
- [x] **Create + Builder Sync**: Direct ST create and Builder edit flows both sync generated FOLU Menimbang when activity/place changes.
- [x] **Manual Text Safety**: Auto-sync only touches default/generated FOLU Menimbang text and does not overwrite manually customized Menimbang text.
- [x] **Production Deploy**: EC2 pulled `main`, rebuilt/recreated `frontend`, and `https://bksdakaltim.net/login` returned HTTP 200.

### Example Output:
```text
bahwa dalam upaya menjaga kelestarian keanekaragaman hayati di Suaka Margasatwa Kelian, perlu dilakukan kegiatan pengamanan dan perlindungan melalui Patroli SMART;
```

```text
bahwa dalam upaya menjaga kelestarian keanekaragaman hayati di Cagar Alam Muara Kaman Sedulang, perlu dilakukan kegiatan pengamanan dan perlindungan melalui Patroli SMART;
```

### Key Files:
- `frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/create/page.tsx`
- `frontend/src/lib/letter-utils.ts`

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx" "src/app/kepegawaian/surat-tugas/create/page.tsx" "src/lib/letter-utils.ts"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`

### Pending:
- [ ] Re-test production Inbox -> Edit Surat Tugas for submitted FOLU letters.
- [ ] Import BMN Excel in production.
- [ ] Continue styling public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

## Issue #312: ST Builder Print Layout Stabilization

### Completed:
- [x] **PR Merged**: PR #313 merged into `main` (`f17c1049378f9b86b92c4cf2ff9e29982995adec`).
- [x] **Production**: SSL active, login works, employee import works, API URL fixed to `bksdakaltim.net/api`.
- [x] **ST Builder FOLU Template**: FOLU header, nomor prefix, menimbang/dasar defaults, TTD wording, penutup, and tembusan are implemented.
- [x] **KOP Print**: KOP only appears on page 1 and no longer crops in Chrome print preview.
- [x] **Content Margins**: Main letter body now uses `.surat-content` so page 1, page 2, and later pages keep consistent margins independent of KOP.
- [x] **Page Margins**: `@page` top margin keeps continuation pages readable; first page uses a smaller top margin for KOP.
- [x] **Employee Pagination**: `Kepada` was refactored from one large table row to block/grid layout so employee entries can paginate one-by-one instead of all moving to the next page.
- [x] **Employee Row Safety**: `.employee-entry` uses `break-inside: avoid` / `page-break-inside: avoid` so each employee is not split in the middle.
- [x] **Scenarios Checked During Session**: FOLU/DIPA, 1 employee, 4 employees, 7 employees, and 11 employees print behavior.

### Current Print CSS State:
```css
@page { size: A4; margin: 3cm 1cm 1cm 1.55cm; }
@page :first { margin: 0.7cm 1cm 1cm 1.55cm; }
.kop-surat { margin-left: 0; margin-right: -0.95cm; margin-top: -0.25cm; }
.kop-surat img { width: 18.8cm; height: auto; }
.surat-content { margin-left: 1.25cm; width: calc(100% - 2.2cm); margin-right: 0.95cm; }
.field-section, .kepada-section, .kepada-list { break-inside: auto; page-break-inside: auto; }
.employee-entry { break-inside: avoid; page-break-inside: avoid; }
```

### Validation:
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx"`
- [x] `npx eslint "src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx"`
- [x] `npx tsc --noEmit`
- [x] `npm run build`
- [ ] Full `npm run lint -- --max-warnings=0` still blocked by unrelated pre-existing lint errors in portal/kepegawaian files.

### Pending:
- [ ] Deploy ST Builder print fix to production.
- [ ] Import BMN Excel in production.
- [ ] Style public sub-pages (/kawasan, /tsl, /galeri, /publikasi).

---

# Progress - Phase 37: Production Deployment

> Document updated: 2026-05-17
> Status: **IN PROGRESS** 🔄

---

## Phase 37: AWS EC2 Deployment

### Completed:
- [x] **EC2 Instance**: t3.micro launched (Amazon Linux 2023, 30GB, ap-southeast-2)
- [x] **Docker + Compose**: Installed on server
- [x] **Production Dockerfiles**: Backend (PHP 8.2 FPM) + Frontend (Next.js standalone)
- [x] **docker-compose.prod.yml**: 7 services (db, rustfs, backend, nginx-backend, frontend, nginx, certbot)
- [x] **Nginx Reverse Proxy**: Routes bksdakaltim.net → frontend, api.bksdakaltim.net → backend, storage.bksdakaltim.net → rustfs
- [x] **All Containers Running**: Verified via `docker ps`
- [x] **Database Migrated**: `migrate:fresh` successful (fixed ST migration ordering)
- [x] **RustFS Bucket**: Created + public-read policy set
- [x] **Admin User**: Seeded (198001012005011001 / Bksda2026!)
- [x] **DNS Records**: A (@, api) + CNAME (www) configured at Biznet NeoDNS
- [x] **Frontend Live**: http://www.bksdakaltim.net accessible
- [x] **Next.js standalone**: Added `output: "standalone"` to next.config.ts
- [x] **Migration Fix**: ST alter migrations moved to module folder
- [x] **Git Security**: .pem and service-account.json added to .gitignore

### Pending:
- [ ] SSL/HTTPS setup (Let's Encrypt certbot)
- [ ] Fix API 500 error on login
- [ ] Root domain DNS propagation (bksdakaltim.net without www)
- [ ] CORS configuration for production
- [ ] Storage subdomain DNS (storage.bksdakaltim.net)
- [ ] Seed production data (BMN Excel import)
- [ ] End-to-end testing on production
- [ ] Update nginx with SSL blocks

### Server Info:
| Item | Value |
|------|-------|
| IP | 15.135.114.1 |
| SSH | `ssh -i bksda-superapp.pem ec2-user@15.135.114.1` |
| Path | `/home/ec2-user/bksda-superapp` |
| Compose | `docker-compose -f docker-compose.prod.yml --env-file .env.prod` |
| Domain | bksdakaltim.net |
| Admin | 198001012005011001 / Bksda2026! |

### Architecture:
```
Internet → Nginx (:80/:443)
              ├── bksdakaltim.net → Frontend (Next.js :3000)
              ├── api.bksdakaltim.net → Nginx-Backend → PHP-FPM (:9000)
              └── storage.bksdakaltim.net → RustFS (:9000)
           PostgreSQL (:5432) ← Backend
```

### Next Steps:
- [ ] SSL setup
- [ ] Fix API errors
- [ ] Seed data
- [ ] Full testing

---

# Progress - Phase 36: RustFS Storage + Kepegawaian + Portal

> Document updated: 2026-05-17
> Status: **COMPLETED** ✅

---

## Phase 36: RustFS Storage Migration + Module Enhancements

### Completed:
- [x] **RustFS Docker Setup**: Container running (API :9002, Console :9003), Apache 2.0 license
- [x] **Laravel S3 Driver**: `league/flysystem-aws-s3-v3` installed, `FILESYSTEM_DISK=s3`
- [x] **All Modules Migrated**: BMN, CMS, Kepegawaian, Surat Tugas, DeReporting → RustFS
- [x] **Artisan Command**: `php artisan storage:setup` creates bucket + sets public-read policy
- [x] **Per-Entity Folders**: `bmn-photos/wet-suit-2/`, `employees/nama-pegawai/foto-profil/`, `surat-tugas/st-01-k-18.../`
- [x] **Hybrid Geotag Upload**: POST /geotag accepts file OR URL (mutual exclusive)
- [x] **Employee Create Fix**: NIP unique validation 500 error fixed
- [x] **Dropdown Pangkat**: PNS (I/a-IV/e) + PPPK (I-XVII) + "Tidak ada pangkat"
- [x] **Dropdown Penempatan**: Kantor Balai + SKW I/II/III + 14 Resor
- [x] **Auto User Account**: Employee create → auto user (password: 123)
- [x] **Editable Biodata**: All fields editable in detail page (dropdowns for pangkat, unit kerja, status)
- [x] **Reset Password**: Admin can reset employee password to "123"
- [x] **Portal Photo Upload**: Hover avatar → upload directly
- [x] **Portal ST Visibility**: New `/api/surat-tugas/my` endpoint (no module access required)
- [x] **Formal Letter Preview**: SuratTugasLetterPreview component (kop surat, format dinas resmi)
- [x] **Print Fix**: New window approach, kop not cropped
- [x] **Module Access OR Logic**: CheckModuleAccess middleware supports multiple modules
- [x] **Upload PDF Only**: Surat tugas dasar surat restricted to PDF
- [x] **Bulk Satker Update**: 151 employees renamed to new format
- [x] **ST Badge on Load**: Count shown immediately without clicking tab

### RustFS Storage Structure:
```
bksda (bucket)/
├── bmn-photos/{nama-aset-nup}/           ← per-asset photos
├── employees/{nama-pegawai}/foto-profil/ ← per-employee photos
├── surat-tugas/{nomor-surat-slug}/       ← per-ST attachments
├── cms/                                   ← CMS media
└── private/dereporting/                   ← report attachments
```

### New API Endpoints:
- `POST /api/me/update-photo` — portal profile photo upload
- `POST /api/me/update-profile` — portal profile edit
- `GET /api/surat-tugas/my` — my approved surat tugas (no module access)
- `GET /api/surat-tugas/my/{id}` — my ST detail (no module access)
- `POST /api/kepegawaian/employees/{id}/photo` — admin upload employee photo
- `POST /api/kepegawaian/employees/{id}/reset-password` — admin reset pw

### Next Steps:
- [ ] Style public sub-pages (/kawasan, /tsl, /galeri, /publikasi)
- [ ] Deployment preparation
- [ ] Mobile app spec

---

# Progress - Phase 35b: CMS Editor Fixes & Public Detail Page Redesign

> Document updated: 2026-05-17
> Status: **COMPLETED** ✅

---

## Phase 35b: CMS Editor Fixes & Public Detail Page

### Completed:
- [x] **405 Fix**: Edit berita save error — use POST + `_method=PUT` for multipart FormData (PR #311)
- [x] **Edit Data Loading**: Fixed API response unwrap (`res.data.data`)
- [x] **React Query Cache**: Invalidate `["cms-informasi-edit", id]` after update
- [x] **Quill Justify**: Added `{ align: [] }` to toolbar modules
- [x] **Light/Dark Mode**: Dual-mode styling on all CMS form elements
- [x] **react-quill-new**: Replaced old package for React 19 compatibility
- [x] **Remove Urutan**: Removed from Profil, Links, Categories
- [x] **Toast Confirm**: Replaced all `window.confirm()` with sonner toast
- [x] **Dialog Modal**: CrudFormDrawer → centered dialog (not sidebar)
- [x] **Public Disk**: File uploads now go to `storage/app/public/cms/`
- [x] **Berita Detail Redesign**: Hero banner + breadcrumb + thumbnail + date badge + sidebar "Informasi Terbaru"
- [x] **Alignment CSS**: Rules in `style.css` + inline `<style>` tags for Quill classes
- [x] **Overflow Fix**: `break-word` + `max-width: 100%` images
- [x] **nbsp Fix**: Replace `&nbsp;` with regular spaces for clean justify rendering

### Design (Public Berita Detail):
```
┌──────────────────────────────────────────────┐
│ HERO BANNER (thumbnail bg + gradient)        │
│ Breadcrumb: Beranda / Informasi              │
│ JUDUL UPPERCASE                              │
├──────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌────────────────┐ │
│ │ THUMBNAIL           │  │ INFORMASI      │ │
│ │ + Date Badge [17]   │  │ TERBARU        │ │
│ │   [MAR]             │  │ ┌──┐ title...  │ │
│ └─────────────────────┘  │ ┌──┐ title...  │ │
│ Metadata (date,author)   │ ┌──┐ title...  │ │
│ ─────────────────────    └────────────────┘ │
│ Konten berita (justify)                      │
│ ...                                          │
└──────────────────────────────────────────────┘
```

### Next Steps:
- [ ] Style /kawasan, /tsl, /galeri, /publikasi pages matching bksdakaltim design
- [ ] Populate CMS content
- [ ] Deployment preparation

---

# Progress - Phase 35: Public Website & CMS Upgrade

> Document updated: 2026-05-16
> Status: **COMPLETED** ✅

---

## Phase 35: Public Website & CMS Upgrade

### Completed:
- [x] **Backend Public API**: Added `/api/cms/public/home` aggregate endpoint + `/api/cms/public/page/{slug}` generic page renderer (PR #307)
- [x] **Homepage Premium Design**: Replicated superapp-inventory design — banner carousel, profil section, TSL tabs, video carousel, photo marquee, news grid (PR #308, #310)
- [x] **Public Pages**: Created `/profil` hub page + `/page/[slug]` CMS page renderer (PR #309)
- [x] **PublicLayout Component**: Full header (top bar + sticky nav + search + CTA), mobile drawer, 4-column footer, WhatsApp float
- [x] **Hardcoded Navbar**: Menu items without menu management dependency
- [x] **Static Assets**: Copied Bootstrap CSS, style.css, responsive.css, flaticon, Font Awesome, theme images from superapp-inventory
- [x] **CMS Editor Fix**: Replaced `react-quill` → `react-quill-new` (React 19 `findDOMNode` error)
- [x] **Editor Toolbar**: Added justify alignment (`{ align: [] }`)
- [x] **Editor Light/Dark Mode**: Proper dual-mode styling for all form elements
- [x] **Edit Page Data Loading**: Fixed API response unwrap (`res.data.data`)
- [x] **File Upload Fix**: Changed from `private` disk → `public` disk for accessible URLs
- [x] **Removed Urutan Field**: From Profil, Links, Categories forms
- [x] **Toast Confirmations**: Replaced all `window.confirm()` with sonner toast action
- [x] **Dialog Modal**: Changed CrudFormDrawer from sidebar to centered dialog
- [x] **Google Sheets Disabled**: Temporarily commented out in ST controller
- [x] **Portal TS Fix**: Fixed pre-existing string/number id comparison error

### PRs Merged:
- PR #307: Backend public API endpoints
- PR #308: Homepage upgrade (carousel, TSL, video, marquee)
- PR #309: /profil + /page/[slug] pages
- PR #310: Premium design (Bootstrap theme, PublicLayout, full homepage)

### Next Steps:
- [ ] Style sub-pages (/informasi, /kawasan, /tsl, /galeri) to match superapp-inventory
- [ ] Contact form integration on /hubungi-kami
- [ ] CMS Website settings — populate logo, alamat, sosmed
- [ ] Seed initial CMS content (profil, kawasan, TSL)
- [ ] Deployment preparation

---

# Progress - Phase 34: Data Security & Linting Finalization

> Document updated: 2026-05-16
> Status: **COMPLETED** ✅

---

## Phase 34: Data Security & Linting Finalization

### Completed:
- [x] **Surat Tugas Data Leakage Fix**: Added `employee_id` filter to `AssignmentLetterController::index` to ensure users only see Surat Tugas related to them in their Portal Dashboard.
- [x] **BMN Portal Integration & Fuzzy Search**: 
  - Enhanced `AssetController` with fuzzy name matching for `pengguna` column to handle title/spacing variations.
  - Implemented frontend deduplication to exclude "Pinjaman Aktif" assets from "Aset Saya".
  - Added dynamic count badges to all portal tabs.
- [x] **Rich Asset Metadata**: Updated UI to display Merk/Tipe, NUP Lama, and No. Polisi (for vehicles) in portal asset cards.
- [x] **ST Builder Layout Constraint**: Fixed missing A4 wrapper in `STBuilderPreview` on the `create` page.
- [x] **Frontend Stability & Linting**: 
  - Fixed React Hook ordering issue (`useMemo` positioning).
  - Resolved all remaining ESLint warnings (`any` types, unused imports).
- [x] **Build Verification**: `npm run lint` yields 0 warnings and `npx tsc --noEmit` yields 0 errors.

### Next Steps:
- [ ] Preparation for Production / Server Deployments.

---

# Progress - Phase 33: Module Themes & Fluid Layouts
> Status: **COMPLETED** ✅

---

## Phase 33: Module Themes & Fluid Layouts

### Completed:
- [x] **Kepegawaian Module Branding**: Replaced generic emerald elements with **Blue** (`blue-600`, `blue-50`) to establish a formal HR identity.
- [x] **Inventory Module Branding**: Replaced emerald/teal elements with **Orange/Amber** (`orange-600`, `amber-500`) for clear differentiation.
- [x] **Portal & Module Switcher Alignment**: Synced the portal dashboard cards and global module switcher to accurately reflect each module's distinct theme (Blue, Emerald, Orange, Violet, Teal).
- [x] **Kepegawaian Layout**: Upgraded wrapper layouts to use standard fluid padding `p-6 md:p-10`.
- [x] **BMN Layout Standardization**: Removed `max-w-7xl` containers from BMN pages and fully migrated to fluid `p-6 md:p-10 space-y-8 animate-in fade-in` design system.
- [x] **Cross-Module Verification**: Verified CMS (Teal) and DeReporting (Violet) are correctly themed and sized.
- [x] **Build Verification**: `npx next build` and `npx tsc --noEmit` verified successfully after global color replacements.

### Next Steps:
- [ ] API & Frontend Integrations / Testing.

---

# Progress - Phase 32: Full Dark Mode Finalization

## Phase 32: Full Dark Mode Finalization

### Completed:
- [x] **CMS Module**: Dashboard, Layout, CrudPageFactory, CrudFormDrawer, Informasi — converted from dark-only to dual-mode.
- [x] **DeReporting Module**: Dashboard, Internal page, FilteredReportTable — fixed light mode rendering.
- [x] **Kepegawaian Module**: ST Builder (Kota input fix), ST Create, ST Inbox — full dual-mode.
- [x] **BMN Core Module**: Dashboard, Layout, Assets list, Loans, Loans/create, Maintenances, Disposal — `slate` → `zinc` + `dark:`.
- [x] **BMN Import Review**: Header, upload section, batch history cards — light-only → dual-mode.
- [x] **BMN Reports**: Header, report cards, icon backgrounds — light-only → dual-mode.
- [x] **BMN Asset Detail**: Hero card, quick stats, tabs, history tab — `slate` → `zinc` + `dark:`.
- [x] **BMN DetailSection Component**: All 8 sub-components refactored (DetailRow, EditableRow, CurrencyRow, EditableCurrencyRow, EditableSelectRow, EditableEmployeeRow, AreaRow, BadgeRow).
- [x] **BMN PhotoGallery Component**: Container, header, empty slots, verified banner, labels, action buttons, geotag input.
- [x] **Inventory Transactions**: Dark-only → dual-mode (filter bar, table, pagination footer).
- [x] **Inventory Stock-Out**: Dark-only → dual-mode (form, labels, inputs, select, buttons).
- [x] **Inventory Stock-In**: Dark-only → dual-mode (form, labels, inputs, select, buttons).
- [x] **Portal Dashboard**: Full dark mode refinement.
- [x] **Build Verified**: `npx next build` → exit code 0.

### Design Standard:
| Element | Light | Dark |
|---------|-------|------|
| Background | `bg-white` / `bg-zinc-50` | `dark:bg-zinc-900` / `dark:bg-zinc-950` |
| Text | `text-zinc-900` / `text-zinc-500` | `dark:text-white` / `dark:text-zinc-400` |
| Borders | `border-zinc-200` | `dark:border-zinc-800` |
| Hover | `hover:bg-zinc-50` | `dark:hover:bg-zinc-800/30` |
| Accent | `bg-emerald-50` | `dark:bg-emerald-500/10` |

### Files Modified (31 files):
- `frontend/src/app/bmn/assets/[id]/page.tsx`
- `frontend/src/app/bmn/assets/[id]/_components/DetailSection.tsx`
- `frontend/src/app/bmn/assets/[id]/_components/PhotoGallery.tsx`
- `frontend/src/app/bmn/import-review/page.tsx`
- `frontend/src/app/bmn/reports/page.tsx`
- `frontend/src/app/bmn/{page,layout,assets/page,loans/page,loans/create/page,maintenances/page,disposal/page}.tsx`
- `frontend/src/app/inventory/{page,items/page,transactions/page,stock-in/page,stock-out/page}.tsx`
- `frontend/src/app/kepegawaian/surat-tugas/{builder/[id]/page,create/page,inbox/page}.tsx`
- `frontend/src/app/dereporting/{page,internal/page,_components/FilteredReportTable}.tsx`
- `frontend/src/app/cms/{page,layout,informasi/page,_components/CrudPageFactory,_components/CrudFormDrawer}.tsx`
- `frontend/src/app/portal/page.tsx`

### Dark Mode Coverage (100%):
| Module | Status |
|--------|--------|
| Portal | ✅ Complete |
| BMN (all pages) | ✅ Complete |
| Inventory (all pages) | ✅ Complete |
| Kepegawaian (all pages) | ✅ Complete |
| DeReporting (all pages) | ✅ Complete |
| CMS (all pages) | ✅ Complete |

### Next Steps:
- [ ] Inventory module improvements
- [ ] DeReporting module improvements
- [ ] Import: handle foto_geotag_url mapping dari Excel header "Foto Ber-geotag"

---

# Progress - Phase 31: BMN Loan UI Overhaul + Comprehensive Dark Mode

> Document updated: 2026-05-16 12:45
> Status: **COMPLETED** ✅

---

## Phase 31: BMN Loan UI & Dark Mode

### Completed:
- [x] **BMN Loan List Overhaul**: Identical header, search, and filter layout with Assets catalog.
- [x] **Emerald Theme Unification**: Accent colors changed from Blue to Emerald across the Loan module.
- [x] **Form Wizard Standardization**: Consistent "Batal" (outline) and "Lanjut" (solid) buttons in `/bmn/loans/create`.
- [x] **Vehicle Icon Logic Fix**: Vehicle icons only show if `no_polisi !== '-'` in asset select tables.
- [x] **Full Dark Mode (Portal)**: Added `dark:` classes to `/portal/page.tsx` for cards, header, and profile.
- [x] **Full Dark Mode (BMN)**: Comprehensive support for Assets, Loans, and Detail pages.
- [x] **Full Dark Mode (Sidebar)**: Navigasi inventory sidebar sekarang mendukung transisi gelap.
- [x] **Automated Class Mapping**: Patch script for mass addition of `dark:` utility classes.

### Files Modified:
- `frontend/src/app/portal/page.tsx`
- `frontend/src/app/bmn/loans/page.tsx`
- `frontend/src/app/bmn/loans/create/page.tsx`
- `frontend/src/app/bmn/assets/page.tsx`
- `frontend/src/app/bmn/assets/[id]/page.tsx`
- `frontend/src/app/inventory/_components/InventorySidebar.tsx`

### Next Steps:
- [x] ~~Audit remaining modules (DeReporting, Kepegawaian, CMS) for dark mode consistency~~ ✅ Phase 32
- [x] ~~Accessibility review for dark mode contrast~~ ✅ Phase 32

---

# Progress - Phase 30: BMN Dashboard Charts + Export Filtered + Riwayat + Verifikasi + Foto

---

## Phase 30: BMN Enhancements

### Completed:
- [x] **Dashboard charts** (PR #299): donut kondisi (SVG), bar jenis BMN + nilai, bar lokasi, compact layout
- [x] **Export filtered** (PR #300): export sesuai filter aktif (jenis, lokasi, kondisi, search)
- [x] **Tab Riwayat** (PR #301): log semua perubahan field (siapa, kapan, old→new)
- [x] **Persist filters to URL** (PR #302): filter + search + page di-persist, kembali dari detail tidak reset
- [x] **Deduplicate merk_tipe**: "Sanyo Sanyo" → "Sanyo"
- [x] **Track all field changes**: AssetService sekarang log semua field (bukan hanya nilai+kondisi)
- [x] **Currency input**: format ribuan (Rp 1.000.000) di edit inline + create form
- [x] **Employee picker**: Penghuni, Pengguna, Nama Pengguna pakai search dropdown pegawai
- [x] **Pengguna sync**: edit Pengguna → Nama Pengguna otomatis ikut (dan sebaliknya)
- [x] **Hero card cleanup**: hapus gradient bar, tambah info Lokasi + Pengguna + No Polisi + Pajak STNK
- [x] **No Polisi di tabel**: tampil di subtitle untuk kendaraan (Merk • No Pol • Tahun)
- [x] **Shorten lokasi**: nama panjang disingkat di tabel (Kantor Balai, Seksi Wil. I, R.01, dll)
- [x] **Pengguna di tabel**: tampil di bawah lokasi jika ada
- [x] **Issue #329: BPKB & STNK Upload for Vehicle Assets**
  - Added new columns to `bmn_assets` via migration.
  - Updated `Asset` model and `AssetResource` for 6 new photo slots (BPKB 1-4, STNK 1-2).
  - Modified `AssetPhotoController` to support uploading and ZIP download for the new document types.
  - Extended `PhotoGallery.tsx` and `page.tsx` on the frontend to conditionally render a "Dokumen Kendaraan" section for `ALAT ANGKUTAN BERMOTOR` assets.
  - *Pending*: User testing and git commit/PR.
- [x] **Verifikasi BMN**: tombol + timestamp + log riwayat
- [x] **Photo history**: upload + delete foto tercatat di riwayat
- [x] **Disposal pagination**: tambah opsi "Semua"
- [x] **Reset filter**: termasuk kondisi + search
- [x] **Confirm dialogs**: semua pakai useConfirm (bukan window.confirm)
- [x] **Kondisi editable**: dropdown select di detail page (Baik/Rusak Ringan/Rusak Berat)
- [x] **Bulk update kondisi**: select beberapa aset → ubah kondisi sekaligus + riwayat tercatat

### Files Modified (key):
- `backend/app/Modules/Bmn/Controllers/DashboardController.php` — charts data
- `backend/app/Modules/Bmn/Controllers/AssetController.php` — verify endpoint
- `backend/app/Modules/Bmn/Controllers/AssetPhotoController.php` — history logging
- `backend/app/Modules/Bmn/Controllers/ExportController.php` — filtered export
- `backend/app/Modules/Bmn/Exports/AssetExport.php` — filter support
- `backend/app/Modules/Bmn/Services/AssetService.php` — track all fields
- `backend/app/Modules/Bmn/Resources/AssetResource.php` — verified_at, foto rename
- `backend/app/Modules/Bmn/Models/Asset.php` — new columns
- `backend/app/Modules/Bmn/Migrations/2026_05_13_160000_*` — foto rename
- `backend/app/Modules/Bmn/Migrations/2026_05_13_170000_*` — verification columns
- `frontend/src/app/bmn/page.tsx` — dashboard rewrite
- `frontend/src/app/bmn/assets/page.tsx` — filters, export, no_polisi, pengguna, shorten lokasi
- `frontend/src/app/bmn/assets/[id]/page.tsx` — hero card, employee picker, riwayat tab
- `frontend/src/app/bmn/assets/[id]/_components/DetailSection.tsx` — EditableEmployeeRow, EditableCurrencyRow
- `frontend/src/app/bmn/assets/[id]/_components/PhotoGallery.tsx` — rename, verify, confirm dialog
- `frontend/src/app/bmn/assets/create/page.tsx` — currency input, foto rename
- `frontend/src/app/bmn/disposal/page.tsx` — pagination "Semua"

### Next Steps (TODO):
- [x] Mobile responsive sidebar (semua modul) ✅ PR #304
- [ ] Inventory module improvements
- [ ] DeReporting module improvements
- [ ] Import: handle foto_geotag_url mapping dari Excel header "Foto Ber-geotag"

---

# Progress - Phase 29: Tembusan ST + Multi-page Preview + RBAC All Modules

> Document updated: 2026-05-13 17:00
> Status: **COMPLETED** ✅

---

## Phase 29: Tembusan + Multi-page + RBAC

### Completed:
- [x] **Tembusan field** (PR #296): kolom JSON di DB, dynamic list di builder, tampil di preview/print di bawah TTD
- [x] **Download fix**: CORS suppressed, nama file: Dasar Surat-Nama Personel-Tanggal
- [x] **Submit timeout**: 60s untuk public form (Google Sheets)
- [x] **Cache invalidation**: history page langsung update setelah ajukan/terbitkan
- [x] **Multi-page preview** (PR #297): page break indicator (bar HALAMAN 2/3) di posisi 297mm
- [x] **Prevent duplicate personil**: yang sudah dipilih jadi abu-abu + disabled
- [x] **TTD + Tembusan**: pageBreakInside:avoid agar tidak terpotong saat cetak
- [x] **RBAC all modules** (PR #298): Inventory, DeReporting, CMS sidebar filtered by role
- [x] **Signature integration**: DROPPED (lewat aplikasi lain)

### RBAC Summary:
| Modul | User (view) | Admin (CRUD) |
|-------|-------------|--------------|
| Inventory | Dashboard, Katalog, Riwayat | + Kantor, Stok Masuk, Distribusi |
| DeReporting | Dashboard, Laporan, Data, Kerjasama, Izin | + Operator |
| CMS | Dashboard, Berita, Pesan, Kawasan, TSL, Galeri, Publikasi | + Kategori, Profil, Kepala, Link |

### Commits:
```
bf4c06d feat(rbac): apply role-based sidebar to Inventory, DeReporting, CMS (#298) [PR #298]
45223c2 feat(surat-tugas): multi-page preview + prevent duplicate personil (#297) [PR #297]
54cd40a feat(surat-tugas): tembusan + download fix + timeout (#295) [PR #296]
```

### All Major TODOs — DONE ✅:
- [x] Import Review/Diff/Approve (PR #293)
- [x] STNK Countdown + Edit Inline + Filters (PR #294)
- [x] Tembusan ST (PR #296)
- [x] Multi-page testing (PR #297)
- [x] RBAC all modules (PR #298)
- [x] Signature — DROPPED

---

# Progress - Phase 28: STNK Countdown + Edit Inline + Filters

> Document updated: 2026-05-13 16:00
> Status: **COMPLETED** ✅

---

## Phase 28: STNK Countdown + Edit Inline + Filters

### Completed:
- [x] STNK Countdown: kolom tanggal_pajak_stnk + tanggal_ganti_plat, badge di tabel + detail, alert dashboard
- [x] Edit inline: semua tab editable (kecuali Organisasi), klik → input → save
- [x] Filters: dropdown Jenis BMN + Lokasi Ruang di halaman aset
- [x] Lokasi Ruang: EditableSelectRow dropdown di detail page
- [x] Import timeout: 120s untuk file besar
- [x] Penghuni/Pengguna/Nama Pengguna dipindah ke tab Dokumen
- [x] Create form: tanggal pajak STNK + ganti plat untuk Kendaraan
- [x] router.back(): kembali dari detail mempertahankan page number
- [x] UpdateAssetRequest: semua field optional (support inline edit 1 field)

### Commits:
```
8a0c3ad feat(bmn): STNK countdown + edit inline + filters (#294) [PR #294]
```

### Next Steps:
- [ ] Tembusan field di ST builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration
- [ ] Apply RBAC to Inventory, DeReporting, CMS

---

# Progress - Phase 27: BMN Import Review/Diff/Approve + Fixes

> Document updated: 2026-05-13 15:00
> Status: **COMPLETED** ✅

---

## Phase 27: BMN Import Review/Diff/Approve

### Completed:
- [x] Import Review/Diff/Approve — full feature (upload → staging → compare → diff table → approve/reject)
- [x] Diff detection: all 80 fields, normalize numbers, detect soft-deleted as "update"
- [x] DB rename: `nama_pemilik` → `nama`, `nama_pengguna_bmn` → `nama_pengguna`
- [x] AssetImportDialog → redirect to import-review flow
- [x] Disposal page: checkbox select, bulk restore, bulk force delete, pagination
- [x] Confirm dialog: replaced window.confirm() with useConfirm() hook
- [x] Toast position: bottom-right
- [x] Create form: NUP Lama, Tipe for Kendaraan, No BPKB, Step 5 Foto (geotag link + 4 sisi upload)
- [x] Create form auto-fill: merk_tipe, tahun_perolehan, nilai_perolehan_pertama, nama, 9x "Tidak"
- [x] Detail page: added missing fields (nama, tahun_perolehan, kode_kab_kota, kode_provinsi, nama_pengguna)
- [x] Removed "Keterangan" from create form (not in 80 columns)

### Import Review Flow:
```
Upload Excel → Parse to staging table (bmn_import_staging)
→ Compare each row by kode_barang + nup (including soft-deleted)
→ Mark as: new / updated / unchanged
→ Show diff table (old → new per field, red/green)
→ User can select/deselect individual rows
→ Approve: insert new + update existing (restore if trashed)
→ Reject: discard staging data
→ After approve → redirect to /bmn/assets
```

### API Endpoints (new):
- `GET /api/bmn/import-review` — list batches
- `POST /api/bmn/import-review/upload` — upload & parse
- `GET /api/bmn/import-review/{batchId}` — batch detail + rows
- `POST /api/bmn/import-review/{batchId}/approve` — apply
- `POST /api/bmn/import-review/{batchId}/reject` — discard
- `POST /api/bmn/import-review/toggle-selection` — select/deselect
- `POST /api/bmn/assets/bulk-restore` — restore
- `POST /api/bmn/assets/bulk-force-delete` — permanent delete

### Next Steps (TODO for next session):
- [ ] **STNK Countdown** — tanggal_pajak_stnk + tanggal_ganti_plat columns, countdown badge, dashboard alert
- [ ] **Edit inline** di detail page
- [ ] Tembusan field di ST builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration
- [ ] Apply RBAC to Inventory, DeReporting, CMS

---

# Progress - Phase 26: BMN Module Full Upgrade

> Document updated: 2026-05-13 09:00
> Status: **COMPLETED** ✅ (create page done, import review next)

---

## Phase 26: BMN Module Full Upgrade

### Completed:
- [x] Dashboard: real API, stat cards, condition bars, category chart, activity feed
- [x] Layout: light theme, RBAC sidebar
- [x] Assets table: search, filter, bulk select/delete, pagination (10/50/100/all), page persist URL, export dropdown (with/without NUP Lama), Jenis BMN column, NUP Lama display
- [x] Asset detail: hero card, 5 tabs, all 80 columns, glassmorphism sections
- [x] Photo gallery: 5 slots, Google Drive thumbnail, lightbox + keyboard nav (←→ Esc), download/ZIP/copy link
- [x] Database: 80 columns migration + 5 photo columns + 1613 assets seeded
- [x] Import: all 80 columns, auto UUID, batch insert, flexible header matching, column AG=Merk fix
- [x] Export: all 80 columns, option with/without NUP Lama, route conflict fix
- [x] Create page: multi-step form, 4 dynamic modes (Kendaraan/Tanah/Bangunan/Peralatan), Lokasi Ruang dropdown, 8 org fields auto-filled
- [x] Dispose: alasan_pemutihan optional, service method nullable fix
- [x] StoreAssetRequest: expanded to accept all 80 columns
- [x] Loans: return action, status badges
- [x] Maintenance, Disposal, Reports: all rewritten

### Create Page Form Modes (final):
| Mode | Jenis BMN | Fields |
|------|-----------|--------|
| Kendaraan | ALAT ANGKUTAN BERMOTOR | Merk, No Polisi, No STNK, No BPKB, No Sertifikat |
| Tanah | TANAH | 5x Luas, Jenis Dokumen, No Dokumen/Sertifikat, Status Sertifikasi |
| Bangunan | BANGUNAN DAN GEDUNG, RUMAH NEGARA, BANGUNAN AIR | Tipe, Luas Tanah/Bangunan/Tapak, Jumlah Lantai. RUMAH NEGARA: +Penghuni, Pengguna, No Identitas, Status PMK |
| Peralatan | ALAT BESAR, MESIN TIK, MESIN NON TIK, ALAT PERSENJATAAN | Merk, Tipe (conditional) |

### Data Insights:
- Kolom AG (header "Nama") = Merk (same data, mapped to merk field)
- Umur Aset = auto-calculated from Tanggal Perolehan (removed from form)
- 8 org fields locked (same for all assets)
- Lokasi Ruang: dropdown with 4 Seksi + 14 Resor + 8 Urusan

### Next Steps (TODO for next session):
- [ ] **Import Review/Diff/Approve** — upload Excel → compare with existing → show diff → approve to update
  - Backend: staging table or temp storage, compare endpoint, approve endpoint
  - Frontend: review page with diff table (red=old, green=new), checkbox per row
- [ ] **STNK Countdown** — tanggal_pajak_stnk + tanggal_ganti_plat columns, countdown badge in table, alert in dashboard
- [ ] **Edit inline** di detail page
- [ ] Tembusan field di ST builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration
- [ ] Apply RBAC to Inventory, DeReporting, CMS

### Commits (this session):
```
f4d6824 fix(bmn): remove Umur Aset from form - auto-calculated
0735ac9 feat(bmn): update create form with correct fields per jenis BMN
7564d6e feat(bmn): add Lokasi Ruang dropdown with BKSDA Kaltim hierarchy
c062259 fix(bmn): correct luas fields per jenis
fe07885 fix(bmn): map column AG (Nama) to merk field
0534baa fix(bmn): make alasan nullable in disposeAsset service method
7e27fe4 fix(bmn): make alasan_pemutihan optional for dispose endpoint
021ed03 fix(bmn): expand StoreAssetRequest validation to accept all 80 columns
a3a9953 fix(bmn): correct field labels - BPKB for kendaraan
6f23281 feat(bmn): create asset page - dynamic form per jenis BMN (#291) [PR #292]
ac83b73 fix(bmn): move export routes before apiResource
b601a22 feat(bmn): export all 80 columns with option include/exclude NUP Lama
...and more (see git log)
```

---

# Progress - Phase 25: RBAC + Employee Accounts + Access Dialog Fix

> Document updated: 2026-05-12 14:30
> Status: **COMPLETED** ✅

---

## Phase 25: RBAC + Employee Accounts + Access Dialog Fix

### Accomplishments:
- [x] **useRole hook**: Reusable `canWrite`, `canManageAccess`, `isAdmin`, `isSuperAdmin` across all modules.
- [x] **Kepegawaian RBAC**: Sidebar + buttons filtered by role (User=view only, Admin=CRUD, Super Admin=+manage access).
- [x] **Employee Accounts Seeded**: 151 accounts (NIP/mmpX as username, password=123, role=user, modules=[]).
- [x] **EmployeeAccessSheet → Dialog**: Converted from Sheet to centered Dialog modal.
- [x] **Fix hydration error**: `<div>` inside `<p>` (SheetDescription renders `<p>`).
- [x] **Fix infinite loop on open**: useRef `hasSynced` to prevent repeated form.reset.
- [x] **Fix infinite loop on checkbox click**: Removed nested FormField pattern, use `form.setValue` directly.

### Files Created/Modified:
```
frontend/src/hooks/useRole.ts                                              ← NEW
frontend/src/app/kepegawaian/layout.tsx                                    ← sidebar filtered by role
frontend/src/app/kepegawaian/page.tsx                                      ← buttons conditional
frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx            ← REWRITE
backend/database/seeders/EmployeeUserSeeder.php                            ← NEW
```

### Commits:
```
25c2ff4 fix(kepegawaian): rewrite module checkboxes without nested FormField (#287)
4053f3c fix(kepegawaian): fix checkbox infinite loop - stopPropagation (#287)
5f64504 fix(kepegawaian): fix infinite loop in EmployeeAccessSheet dialog (#287) [PR #288]
ba2f821 feat(rbac): role-based access control within modules (#285) [PR #286]
b10bd2f fix(kepegawaian): convert EmployeeAccessSheet from Sheet to Dialog
3c79174 feat(kepegawaian): seed user accounts for all employees
```

### GitHub Issues & PRs:
- Issue #285 → PR #286 ✅ MERGED (RBAC)
- Issue #287 → PR #288 ✅ MERGED (dialog fix) + 2 hotfixes to main

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)
- [ ] Apply RBAC to other modules (BMN, Inventory, DeReporting, CMS)

---

# Progress - Phase 24: Portal Dashboard Redesign

> Document updated: 2026-05-12 13:00
> Status: **COMPLETED** ✅

---

## Phase 24: Portal Dashboard Redesign

### Accomplishments:
- [x] **Complete UI Rewrite**: Modern, clean portal dashboard replacing old cluttered design.
- [x] **Welcome Banner**: Emerald gradient with time-based greeting + date.
- [x] **Module Grid**: 5 modul (Kepegawaian, BMN, Persediaan, DeReporting, CMS) — auto-filtered by user access.
- [x] **Sidebar Profile**: Avatar, status, NIP, jabatan, unit kerja, email, telepon, ganti password.
- [x] **Tab Surat Tugas** (NEW): View + Download surat tugas yang sudah approved.
- [x] **Scalable**: Modul baru cukup tambah 1 entry di array.

### Files Modified:
```
frontend/src/app/portal/page.tsx  ← REWRITE (295 lines, was 707 lines)
```

### Commits:
```
0923c36 feat(portal): redesign dashboard UI/UX with module grid + surat tugas tab (#283) [PR #284]
```

### GitHub Issues & PRs:
- Issue #283 → PR #284 ✅ MERGED

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

---

# Progress - Phase 23: Nomor Surat Format + Auto-Klasifikasi + Template + State Fix

> Document updated: 2026-05-12 12:00
> Status: **COMPLETED** ✅

---

## Phase 23: Nomor Surat Format + Auto-Klasifikasi + Template Dasar + Inbox State

### Accomplishments:
- [x] **Public Form 500 Fix**: Migration `created_by` + `tempat_tujuan` → nullable.
- [x] **Google Sheets Fix**: Path (`../service-account.json`), SSL (`withoutVerifying`), sheet name (`Form Responses 1`).
- [x] **Sumber Dana Labels**: Public form now sends full label ("DIPA", "Dana Kerjasama KJA") instead of lowercase id.
- [x] **Nomor Surat Format**: `ST.{nomor}/K.18/TU/{klasifikasi}/B/{bulan}/{tahun}` — K.18/TU dan /B fixed.
- [x] **Auto-Klasifikasi**: Jika kegiatan mengandung "konflik" → klasifikasi = KSA.03.01, menimbang auto-fill.
- [x] **Template Dasar Update**: Peraturan Menteri Kehutanan Nomor 4 Tahun 2025, DIPA tanggal 24 April 2026, "and" → "dan".
- [x] **Inbox State Fix**: Detail panel auto-clear/auto-select after delete/restore/forceDelete.

### Files Modified:
```
backend/app/Modules/SuratTugas/Migrations/2026_05_12_110000_make_created_by_nullable_on_st_assignment_letters.php  ← NEW
backend/app/Services/GoogleSheetsService.php                               ← path + SSL + sheet name
backend/config/services.php                                                 ← sheet name default
frontend/src/app/surat-tugas/page.tsx                                       ← sumber dana labels
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx                   ← nomor format + klasifikasi + template
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx             ← nomor format + klasifikasi + template + konflik detect
frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx                    ← state management fix
```

### Commits:
```
d5a5c3f fix(surat-tugas): auto-refresh detail panel after delete (#281) [PR #282]
a1b266c fix(surat-tugas): detect default menimbang template and override for konflik
771a32b fix(surat-tugas): force menimbang auto-fill for konflik
2f87acc fix(surat-tugas): auto-fill klasifikasi on builder load (#277)
077768f fix(surat-tugas): update template Dasar sesuai data terbaru (#279) [PR #280]
3970231 feat(surat-tugas): auto-fill klasifikasi + fix nomor surat format (#277) [PR #278]
3925d16 fix(surat-tugas): fix public submit 500 error + Google Sheets integration + sumber dana labels
```

### GitHub Issues & PRs:
- Issue #277 → PR #278 ✅ MERGED (auto-klasifikasi + nomor surat format)
- Issue #279 → PR #280 ✅ MERGED (template dasar update)
- Issue #281 → PR #282 ✅ MERGED (inbox state fix)

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

---

# Progress - Phase 22: Google Sheets Integration + Bug Fixes + Route Fix

> Document updated: 2026-05-12 10:00
> Status: **COMPLETED** ✅

---

## Phase 22: Google Sheets Integration + Bug Fixes

### Accomplishments:
- [x] **Google Sheets Integration**: Created `GoogleSheetsService.php` — append row on public submit, update row on approve via UUID search in column Y.
- [x] **Service Account Setup**: `service-account.json` at project root (gitignored), `google/auth` composer package installed.
- [x] **Column Mapping**: A=Timestamp, B=Unit Kerja, C-F=Pegawai 1-4, G=overflow comma-separated, H=PLH, P=Kegiatan, Q=Tgl dari, R=Tgl sampai, S=Sumber Dana, T=Upload path, U=Keterangan, V=Tanda Setuju, Y=UUID.
- [x] **Route Fix**: Public form submit changed from `POST /surat-tugas` to `POST /surat-tugas/submit` to avoid conflict with auth route.
- [x] **Print Title**: Now shows `ST.{nomor}-{nama kegiatan}` with no length limit.
- [x] **Tanggal Surat**: Always defaults to today's date.
- [x] **Keterangan Column**: Added to inbox display.
- [x] **File Upload**: Accept jpg/png/webp (not just pdf), fix download endpoint.
- [x] **Employee ID Validation**: Removed numeric constraint (FormData sends strings).
- [x] **History Personil**: Added column showing employee names in history tab.
- [x] **History Pagination**: 5 items per page.
- [x] **Sumber Dana Options**: 11 options (DIPA, KJA, MJA, COP, Tjiwi Kimia, BOSF, CAN, ALeRT, FOLU, DL1, Lainnya).
- [x] **PLH/Tanda Setuju in Inbox**: Now displayed in inbox detail.
- [x] **PLH Autocomplete**: Searchable from employee list in public form.
- [x] **Toaster Fix**: `<Toaster />` was missing from Providers — all toast notifications now work.
- [x] **Employee Search Fix**: Builder + Create handle `name` vs `nama_lengkap` field mismatch.
- [x] **Double Text Fix**: Strip "selama X hari..." suffix when re-parsing saved text.
- [x] **Nomor Surat Width**: Fixed `/05/2026` being cut off.
- [x] **Smart Parsing**: Detect full freeform text vs structured format.

### Pending:
- [ ] Commit route fix (`POST /submit` for public, frontend calls `/surat-tugas/submit`)
- [ ] Test public form submission end-to-end
- [ ] Verify Google Sheets append/update works with service account

### Files Modified:
```
backend/app/Services/GoogleSheetsService.php                               ← NEW
backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php  ← Sheets integration
backend/app/Modules/SuratTugas/Routes/api.php                              ← POST /submit route
backend/config/services.php                                                 ← google_sheets config
backend/composer.json                                                       ← google/auth dependency
frontend/src/app/surat-tugas/page.tsx                                       ← route fix + PLH + sumber dana
frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx                    ← keterangan + PLH + tanda setuju
frontend/src/app/kepegawaian/_components/AssignmentHistoryTab.tsx           ← pagination + personil
frontend/src/components/providers.tsx                                        ← Toaster added
frontend/src/lib/letter-utils.ts                                            ← smart parsing fix
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx             ← tanggal default + print title
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx                   ← nomor surat width
```

### Commits (after PR #276 merged, direct to main):
```
2dfa71c feat(sheets): robust update via UUID in column Y + append on submit
ac4a9d5 feat(surat-tugas): integrate Google Sheets API - append row on submit
0703a53 feat(history): add pagination (5 per page)
209d1fe feat(history): add personil column showing employee names
679a8c5 fix(validation): remove numeric constraint on employee id
c2b3e68 fix(surat-tugas): add keterangan column + fix file download + accept image uploads
1dbab92 fix(builder): tanggal surat always defaults to today
0b0f679 fix(builder): no limit on print title length
5fa7626 fix(builder): increase print title length to 100 chars
1fdedae fix(builder): print title includes nama kegiatan
90d27a6 feat(surat-tugas): add all sumber dana options to public form
87ffb1d fix(surat-tugas): fix plhSearchQuery declaration order + add PLH/tanda_setuju to inbox
```

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

---

# Progress - Phase 21: Surat Tugas Builder Flow & Print Fix

> Document updated: 2026-05-11 14:00
> Status: **COMPLETED** ✅

---

## Phase 21: Surat Tugas Builder Flow & Print Fix

### Accomplishments:
- [x] **Print Template Rewrite**: Complete rewrite of `STBuilderPreview.tsx` to match `superapp-inventory` reference exactly — Bookman Old Style 11pt, `table-layout: fixed`, inline styles, kop surat in `<thead>` for multi-page repeat.
- [x] **Print CSS Simplified**: Minimal print CSS (`@page margin: 0`, body padding `0.4cm 1cm 1cm 3cm`) — no complex class overrides needed since all styles are inline.
- [x] **Builder 3-Button Flow**: Replaced single "Terbitkan" button with "Simpan Draft" + "Ajukan Persetujuan" + "Cetak / Download".
- [x] **Backend Approve Endpoint Flex**: Made all fields nullable, status optional (no status = don't change status, `pending` = waiting approval, `approved` = published).
- [x] **Backend updateStatus**: Now accepts `pending` as valid status.
- [x] **History Page Upgrade**: Added `draft` status, "Setujui & Terbitkan" button for pending items, updated labels.
- [x] **Inbox Page Upgrade**: Added `draft` status, updated labels ("Menunggu Persetujuan", "Diterbitkan"), auto-refresh with `staleTime: 0`.
- [x] **Nomor Surat Empty by Default**: Removed auto-fetch of next number in both builder and create pages.
- [x] **Nomor Surat Parsing**: Builder now parses `nomor_surat` and `kode_surat` from API response when editing existing ST.
- [x] **404 Graceful Handling**: Builder redirects to inbox if ST is deleted/not found.
- [x] **Public /surat-tugas Verified**: Confirmed identical flow with `superapp-inventory` reference.

### Files Modified:
```
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/STBuilderPreview.tsx  ← REWRITE
frontend/src/app/kepegawaian/surat-tugas/builder/[id]/page.tsx             ← flow + print CSS
frontend/src/app/kepegawaian/surat-tugas/create/page.tsx                   ← nomor surat kosong
frontend/src/app/kepegawaian/_components/AssignmentHistoryTab.tsx           ← status + approve btn
frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx                    ← labels + auto-refresh
backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php  ← approve + updateStatus
```

### Surat Tugas Flow (Final):
```
Pegawai submit (/surat-tugas) → status: draft
→ Masuk Inbox Admin (/kepegawaian/surat-tugas/inbox) → klik "Proses"
→ Builder (/kepegawaian/surat-tugas/builder/[id])
→ Admin isi nomor, detail → "Simpan Draft" (save tanpa ubah status)
→ Admin cetak → kirim ke Kasubag via WA
→ Admin klik "Ajukan Persetujuan" → status: pending
→ Di History (/kepegawaian/surat-tugas/history): badge "Menunggu Persetujuan"
→ Kasubag ACC → Admin klik ✓ di History → status: approved ("Diterbitkan")
```

### Next Steps:
- [ ] Tembusan field di builder & preview
- [ ] Multi-page testing (surat panjang)
- [ ] Signature integration (digital/scan)

### Additional Fixes (same session):
- [x] **PLH & Tanda Setuju**: Added to public form `/surat-tugas` — PLH shows when Kasubag/Kaseksi selected, Tanda Setuju shows when Seksi employee selected.
- [x] **Backend migration**: Added `nama_plh`, `has_seksi_employee`, `tanda_setuju` columns to `st_assignment_letters`.
- [x] **Route move**: `/surat-tugas` moved from `(publik)` to dedicated route with minimal layout (no navbar/footer).
- [x] **Logo unified**: All logo references → `/logo_bksda.png`.
- [x] **Tempat Tujuan removed**: From public form (nullable in DB), but saved from builder's "Tujuan" field.
- [x] **Toaster added**: `<Toaster />` was missing from Providers — all toast notifications now work.
- [x] **Employee search fix**: Builder + Create pages now handle `name` vs `nama_lengkap` field mismatch from API.
- [x] **Employee normalize**: When adding from search, `nama_lengkap` and `jabatan` populated from `name`/`position`.
- [x] **Nomor surat width**: Fixed `/05/2026` being cut off in both builder and create pages.
- [x] **Double text fix**: Strip "selama X hari..." suffix when re-parsing saved `maksud_tujuan`.
- [x] **Smart parsing**: Detect full freeform text vs structured "Perjalanan Dinas dari X ke Y" — no more double prefix.
- [x] **tempat_tujuan saved**: Builder now sends `kotaTujuan` as `tempat_tujuan` to backend.
- [x] **Inbox NIP**: Backend now loads `nip,jabatan` for employees in index query.

---

# Progress - Phase 20: Surat Tugas Standardization (Inbox & Builder)

> Document updated: 2026-05-11 10:15
> Status: **COMPLETED** ✅

---

## Phase 20: Surat Tugas Standardization (Inbox & Builder)

### Accomplishments:
- [x] **Inbox UI Unification**: Restored `max-w-7xl` container and standardized header to match the administrative design system (History module).
- [x] **PDF Template Engineering**: Reconstructed the Surat Tugas layout with fixed-width labels for perfect colon alignment and justify perataan.
- [x] **Print Reliability Engine**: Injected self-contained CSS into the print window to ensure 100% visual parity between screen preview and PDF output.
- [x] **Signatory Alignment**: Fixed signatory (TTD) positioning to be right-aligned in print using robust margin offsets.

---

# Progress - Phase 10: Route Restructure & Portal Dashboard

## ⚠️ GIT WORKFLOW — WAJIB DIIKUTI SETIAP ISSUE

> **DILARANG SHORTCUT!** Setiap issue WAJIB mengikuti flow ini TANPA PENGECUALIAN:

```bash
# STEP 0 — Buat GitHub Issue (jika belum ada)
gh issue create --title "feat(module): nama issue" --body "deskripsi" --label "frontend" # atau backend

# STEP 1 — Ambil state terbaru & buat branch
git pull origin main
git checkout -b issue/XXX-nama-issue

# STEP 2 — Kerjakan kode sesuai spec di docs/issues/XXX-*.md

# STEP 3 — CEK IDE WARNINGS (WAJIB! 2-3x sebelum commit)
cd frontend; npm run lint -- --max-warnings=0   # wajib 0
cd frontend; npx tsc --noEmit                   # wajib 0 error
cd frontend; npm run build                       # wajib clean
# Periksa juga IDE Warning All di VS Code Problems tab (Ctrl+Shift+M)!
# Tailwind v4: bg-gradient-to-* → bg-linear-to-*, flex-shrink-0 → shrink-0, dll

# STEP 4 — Commit (HINDARI git add . — selalu specify folder)
git add frontend/src/components/ frontend/src/app/bmn/ # contoh
git commit -m "feat(module): deskripsi (#<nomor_gh_issue>)"

# STEP 5 — Push & PR
git push -u origin issue/XXX-nama-issue
gh pr create --title "feat(module): deskripsi (#XXX)" --body "Closes #<nomor_gh_issue>" --base main

# STEP 6 — Merge & cleanup (setelah PR di-test & di-approve)
gh pr merge <PR_NUMBER> --merge --delete-branch
git checkout main; git pull origin main

# STEP 7 — Update HANDOFF.md & progress.md lalu push
git add docs/HANDOFF.md docs/progress.md
git commit -m "docs: update HANDOFF.md and progress.md - issue #XXX selesai"
git push origin main
```

> ❌ **DILARANG** mulai mengerjakan issue tanpa `gh issue create` terlebih dahulu!
> ❌ **DILARANG** skip cek IDE warning — Tailwind v4 warnings **harus 0** sebelum commit!
> ❌ **DILARANG** commit langsung ke `main` tanpa PR!
> ❌ **DILARANG** `git add .` — selalu specify folder (`frontend/src/...` atau `backend/...`)!

---

## Phase 19: Audit Middleware (Next.js Middleware migration)

### Status: **COMPLETED** ✅
*Note: Logic implemented in `src/proxy.ts` to match project conventions and avoid conflict with middleware.ts.*

---

## Phase 18: letter-utils.ts Refactoring

## Phase 17: Inventory Trash/Restore Upgrade

### Status: **COMPLETED** ✅

---

## Phase 16: InteractiveKawasanMap Integration

### Status: **COMPLETED** ✅

---

## Phase 15: System Integration & Optimization (Part 1: AuthSync)

### Status: **COMPLETED** ✅

> Document created: 2026-05-10
> Last updated: 2026-05-10 14:55

---

## Phase 14: Inventory Bulk Operations Upgrade

### Status: **COMPLETED** ✅

---

## Summary

Phase 11 implemented RouteGuard Component. Phase 12 focuses on EmployeeAccessSheet for granular module access management.

**Changes in PR #254:**
- Created `frontend/src/components/RouteGuard.tsx`
- Applied RouteGuard to all 5 module layouts (bmn, inventory, kepegawaian, dereporting, cms)
- Added CMS Panel to ModuleSwitcher
- Added ModuleSwitcher and ThemeToggle to CMS layout
- Fixed proxy.ts: authenticated /login redirect → /portal, added /portal and /cms to protected routes
- Fixed ModuleSwitcher: shows active module name/icon based on current route

**Branch Status:**
- Commits: 4 commits pushed
 
- **Phase 12 Update:**
- Branch: `issue/255-employee-access-sheet`
- Commits: 2 commits pushed
- PR: [#256](https://github.com/tegaranugrah1/bksda-superapp/pull/256) - **MERGED ✅**
- Status: COMPLETED ✅

- **Phase 13 Update:**
- Branch: `feat/bmn-import-export-upgrade`
- Commits: 4 commits pushed
- PR: [#258](https://github.com/tegaranugrah1/bksda-superapp/pull/258) - **MERGED ✅**
- Status: COMPLETED ✅

- **Phase 14 Update:**
- Branch: `issue/259-inventory-bulk-operations`
- Commits: 4 commits pushed
- PR: [#259](https://github.com/tegaranugrah1/bksda-superapp/pull/259) - **MERGED ✅**
- Status: COMPLETED ✅

---

## Completed Tasks

### AuthSync Component Implementation (Phase 15) ✅

**Frontend:**
- [x] Phase 15: Cross-tab Session Sync (AuthSync)
- [x] Bugfix: Initial redirection race condition in AuthSync
- Created `AuthSync.tsx` component to handle cross-tab session management.
- Implemented transition-based detection (ref-based) for login/logout events.
- Integrated `AuthSync` into root `Providers` for global side-effects.
- Configured public route bypass to ensure landing page and public resources remain accessible to unauthenticated users.
- Added session-termination toast notifications via `sonner`.

### Inventory Bulk Operations Upgrade (Phase 14) ✅

**Backend:**
- Created `ItemExport` and `TransactionExport` classes for inventory reporting.
- Implemented `ItemImport` with automatic category mapping (`nama_kategori`) and validation.
- Created dedicated `ExportController` and updated `ItemController`.
- Registered API routes for import/export in `api.php`.

**Frontend:**
- Created `InventoryImportDialog.tsx` with modern UI and format guidance.
- Added Import/Export buttons to Katalog Barang (`InventoryItemsPage`).
- Added dynamic Export button to Riwayat Mutasi (`TransactionsHistoryPage`).
- Verified type safety for all new components.

### BMN Import/Export Upgrade (Phase 13) ✅

**Backend:**
- Installed `maatwebsite/excel` (resolved PHP 8.5 conflicts).
- Created `AssetExport`, `LoanExport`, `MaintenanceExport` classes.
- Created `AssetImport` with validation rules.
- Integrated methods into `AssetController` and `ExportController`.
- Registered `POST /api/bmn/assets/import` endpoint.

**Frontend:**
- Created `AssetImportDialog.tsx` with file upload logic and format guidelines.
- Integrated "Impor Excel" button to `BmnAssetsPage`.
- Fixed Module Resolution issues in `page.tsx` using absolute aliases.
- Restored missing `cn` import in `EmployeeAccessSheet.tsx`.
- Updated `BmnAssetFormPage` for Next.js 15 Async Params compatibility.

**Verification:**
- Verified 0 TypeScript errors via `npx tsc --noEmit`. ✅
- Pushed to `main` and merged. ✅

### EmployeeAccessSheet Implementation (Phase 12) ✅

**Created:**
- `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx`
  - Features:
    - Side-sliding sheet for access management.
    - Role selection (super_admin, admin, user).
    - Multi-select module checkboxes (Kepegawaian, BMN, Inventory, D-Reporting, CMS).
    - Password reset functionality (On-the-Fly account creation support).
    - Integration with `react-query` for fetching/updating.

**Modified:**
- `frontend/src/app/kepegawaian/page.tsx`
  - Added `EmployeeAccessSheet` integration.
  - Connected "UserCog" button to open the access management sheet for specific employee.

### RouteGuard Implementation (Phase 11) ✅

**Created:**
- `frontend/src/components/RouteGuard.tsx` - NEW component
  - Uses `useMemo` for synchronous access determination
  - Super admin bypasses all checks
  - Redirects unauthorized users to `/portal?unauthorized=1`
  - Loading spinner during auth check

**Modified:**
- `frontend/src/app/bmn/layout.tsx` - Added RouteGuard
- `frontend/src/app/inventory/layout.tsx` - Added RouteGuard
- `frontend/src/app/kepegawaian/layout.tsx` - Added RouteGuard
- `frontend/src/app/dereporting/layout.tsx` - Added RouteGuard
- `frontend/src/app/cms/layout.tsx` - Added RouteGuard + ModuleSwitcher + ThemeToggle
- `frontend/src/components/module-switcher.tsx` - Added CMS Panel, fixed active state
- `frontend/src/proxy.ts` - Fixed /login redirect, added /portal and /cms routes

---

## Phase 10 Completed Tasks (for reference)

### 1. Route Restructure ✅

**Changes:**
- Moved `/portal/bmn/` → `/bmn/`
- Moved `/portal/inventory/` → `/inventory/`
- Moved `/portal/dereporting/` → `/dereporting/`
- Moved `/portal/kepegawaian/` → `/kepegawaian/`
- Created new `/portal/page.tsx` - Personal Dashboard

**Login redirect:**
- Login page now redirects authenticated users to `/portal`
- After successful login → redirects to `/portal`

### 2. Portal Dashboard (`/portal`) ✅

**Features:**
- Module grid cards (BMN, Inventory, DeReporting, CMS) based on user `access_modules`
- Tab: Pinjaman Aktif, Aset Saya
- Profile sidebar with edit profile & change password dialogs
- Greeting based on time of day
- Error state with retry option when API fails

**UI Style:** Follows superapp-inventory design patterns

### 3. Backend API Endpoint ✅

**Endpoint:** `GET /api/me/dashboard`

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Administrator",
    "role": "super_admin",
    "access_modules": ["kepegawaian", "bmn", "inventory", "dereporting"]
  },
  "employee": { ... },
  "my_assets": []
}
```

### 4. ModuleSwitcher Update ✅

- Portal Utama link changed from `/` → `/portal`
- Now points to Personal Dashboard

### 5. Module Layouts - ThemeToggle & User Profile ✅

**Layout Structure:**
```
┌─────────────────────────────┐
│ [Logo] BKSDA    [🌙/☀️]     │  ← ThemeToggle in header
│        [Module Switcher]    │
├─────────────────────────────┤
│  Nav 1                      │
│  Nav 2                      │
│  ...                        │
├─────────────────────────────┤
│ [Avatar] Nama User          │  ← User info in footer
│          Role               │     above logout
│        [Logout]             │
└─────────────────────────────┘
```

**Files Updated:**
- `frontend/src/app/bmn/layout.tsx`
- `frontend/src/app/inventory/_components/InventorySidebar.tsx`
- `frontend/src/app/kepegawaian/layout.tsx`
- `frontend/src/app/dereporting/layout.tsx`

---

## URL Structure

```
# Landing Page
localhost:3000/                        → Landing page BKSDA

# Login
localhost:3000/login/                  → Login page

# Portal Admin (Personal Dashboard)
localhost:3000/portal/                  → Personal Dashboard

# Modules (ROOT LEVEL)
localhost:3000/bmn/                    → BMN Module
localhost:3000/inventory/              → Inventory Module
localhost:3000/dereporting/           → DeReporting Module
localhost:3000/kepegawaian/           → Kepegawaian Module
localhost:3000/cms/                   → CMS Module (NEW!)

# Public Website
localhost:3000/informasi/              → Berita
localhost:3000/kawasan/               → Kawasan
localhost:3000/tsl/                   → TSL
localhost:3000/galeri/               → Galeri
localhost:3000/publikasi/            → Publikasi
localhost:3000/hubungi-kami/        → Kontak
localhost:3000/verifikasi/surat-tugas/[id]/ → QR Verification
```

---

## Test Credentials

**Super Admin:**
| Field | Value |
|-------|-------|
| Username | `198001012005011001` |
| Password | `Bksda2026!@#` |

---

## Git Commits

### Phase 11 (RouteGuard - PR #254)

| Commit | Description |
|--------|-------------|
| `c7be041` | feat(frontend): add RouteGuard component for access_modules check (#253) |
| `9ef3e20` | fix: redirect authenticated /login to /portal, add /portal and /cms to protected routes |
| `92a8b83` | feat(cms): add CMS to ModuleSwitcher and add ModuleSwitcher+ThemeToggle to CMS layout |

### Phase 12 (EmployeeAccessSheet)

| Commit | Description |
|--------|-------------|
| `5ca9040` | feat(kepegawaian): add EmployeeAccessSheet for granular module access management (#255) |

### Phase 10 (Route Restructure - PR #252)

| Commit | Description |
|--------|-------------|
| `7ec9652` | feat(frontend): route restructure - move modules to root level + create portal dashboard |
| `eadfb5a` | fix(login): redirect to /portal if already authenticated |
| `162a110` | fix(portal): handle API error gracefully with retry option |
| `0ba2c40` | feat(backend): add /api/me/dashboard endpoint for portal dashboard |
| `900e9b8` | fix(backend): handle missing bmn_asset_loans table gracefully |
| `bd155bf` | fix(backend): dashboard endpoint - don't use undefined relationship |
| `917abcc` | fix(portal): align API response with frontend expectations |
| `fe74b09` | Add dark mode toggle and user info to all module layouts |
| `31f0777` | refactor: update sidebar layouts with ThemeToggle and user profile placement |
| `53eaea9` | fix(inventory): rename sidebar header to 'Inventory' for space efficiency |
| `955311c` | fix(inventory): remove stray div tag in InventorySidebar |
| `1c6121a` | fix(inventory): add subtitle 'Inventaris & Stok' to sidebar header |
| `a726db6` | fix(module-switcher): show active module name and icon based on current route |
| `abdcfe0` | docs: update HANDOFF.md - PR #252 merged, Phase 10 COMPLETED |

---

## Known Issues / TODOs

| # | Task | Priority | Status |
|---|-------|----------|--------|
| 1 | BMN Import/Export upgrade | HIGH | COMPLETED ✅ |
| 2 | Inventory Bulk Operations upgrade | HIGH | COMPLETED ✅ |
| 3 | AuthSync Component (cross-tab session) | MEDIUM | COMPLETED ✅ |
| 4 | InteractiveKawasanMap Upgrade | MEDIUM | COMPLETED ✅ |
| 5 | letter-utils.ts | LOW | COMPLETED ✅ |
| 6 | Inventory Trash/Restore upgrade | MEDIUM | COMPLETED ✅ |

---

## Verification Status

| Check | Status |
|-------|--------|
| Build | ✅ Success |
| ESLint | ✅ 0 errors, 0 warnings (Strict mode passed) |
| TypeScript | ✅ 0 errors |
| Backend PHP Syntax | ✅ Pass |
| AuthSync Hydration | ✅ Verified (No race condition) |
| RouteGuard Safety | ✅ Verified (Safe redirects) |
| Direct Navigation | ✅ Fixed (Redirect loops resolved) |

---

## PR Information

- **PR:** https://github.com/tegaranugrah1/bksda-superapp/pull/254
- **Branch:** `issue/253-route-guard-component`
- **Status:** MERGED ✅

---

Phase 10 focuses on restructuring routes and creating a standalone Portal Dashboard, aligning bksda-superapp with superapp-inventory patterns.

**Today's Updates:**
- Added ThemeToggle (dark/light mode) to all module layouts
- Added User Profile info (avatar, name, role badge) in sidebar footer
- Refactored layout: ThemeToggle in header, User profile above logout button
- Committed and pushed all changes (commit `31f0777`)
- Updated HANDOFF.md and progress.md for Phase 10 completion

**Branch Status:**
- Branch: `issue/121-frontend-route-restructure-phase10`
- Commits pushed to origin
- PR #252 open and pending testing

---

## Completed Tasks

### 1. Route Restructure ✅

**Changes:**
- Moved `/portal/bmn/` → `/bmn/`
- Moved `/portal/inventory/` → `/inventory/`
- Moved `/portal/dereporting/` → `/dereporting/`
- Moved `/portal/kepegawaian/` → `/kepegawaian/`
- Created new `/portal/page.tsx` - Personal Dashboard

**Login redirect:**
- Login page now redirects authenticated users to `/portal`
- After successful login → redirects to `/portal`

### 2. Portal Dashboard (`/portal`) ✅

**Features:**
- Module grid cards (BMN, Inventory, DeReporting, CMS) based on user `access_modules`
- Tab: Pinjaman Aktif, Aset Saya
- Profile sidebar with edit profile & change password dialogs
- Greeting based on time of day (Selamat Pagi/Siang/Sore/Malam)
- Ambient background gradient effects
- Error state with retry option when API fails

**UI Style:** Follows superapp-inventory design patterns

### 3. Backend API Endpoint ✅

**Endpoint:** `GET /api/me/dashboard`

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "Administrator",
    "username": "198001012005011001",
    "email": "admin@bksda.local",
    "role": "super_admin",
    "access_modules": ["kepegawaian", "bmn", "inventory", "dereporting"]
  },
  "employee": {
    "id": 1,
    "nip": "198001012005011001",
    "name": "Administrator pusat BKSDA",
    "position": "Kepala Satuan Teknologi",
    "department": "BKSDA pusat Provinsi",
    "email": "admin@bksda.local",
    "phone": null,
    "photo": null,
    "rank": "Pembina Utama / IV.c",
    "rank_level": 0,
    "is_active": true
  },
  "my_assets": []
}
```

### 4. ModuleSwitcher Update ✅

- Portal Utama link changed from `/` → `/portal`
- Now points to Personal Dashboard

### 5. Module Layouts - ThemeToggle & User Profile ✅

**Added to all module layouts (BMN, Inventory, Kepegawaian, DeReporting):**

**Layout Structure:**
```
┌─────────────────────────────┐
│ [Logo] BKSDA    [🌙/☀️]     │  ← ThemeToggle in header (right side)
│        [Module Switcher]    │
├─────────────────────────────┤
│  Nav 1                      │
│  Nav 2                      │
│  Nav 3                      │
│  ...                        │
├─────────────────────────────┤
│ [Avatar] Nama User          │  ← User info in footer
│          Role               │     positioned above logout
│        [Logout]             │
└─────────────────────────────┘
```

**Components Added:**
- `ThemeToggle` - dark/light mode switch button
- User info card with avatar initial, name, role badge
- `LogoutButton` at bottom

**Files Updated:**
- `frontend/src/app/bmn/layout.tsx`
- `frontend/src/app/inventory/_components/InventorySidebar.tsx`
- `frontend/src/app/kepegawaian/layout.tsx`
- `frontend/src/app/dereporting/layout.tsx`

---

## URL Structure

```
# Landing Page
localhost:3000/                        → Landing page BKSDA

# Login
localhost:3000/login/                  → Login page

# Portal Admin (Personal Dashboard)
localhost:3000/portal/                  → Personal Dashboard
  - Module grid cards
  - Tab: Pinjaman Aktif, Aset Saya
  - Profile sidebar

# Modules (ROOT LEVEL)
localhost:3000/bmn/                    → BMN Module
localhost:3000/inventory/              → Inventory Module
localhost:3000/dereporting/           → DeReporting Module
localhost:3000/kepegawaian/           → Kepegawaian Module

# CMS Admin
localhost:3000/cms/                    → CMS Dashboard

# Public Website
localhost:3000/informasi/              → Berita
localhost:3000/kawasan/               → Kawasan
localhost:3000/tsl/                   → TSL
localhost:3000/galeri/               → Galeri
localhost:3000/publikasi/            → Publikasi
localhost:3000/hubungi-kami/        → Kontak
localhost:3000/verifikasi/surat-tugas/[id]/ → QR Verification
```

---

## Test Credentials

**Super Admin:**
| Field | Value |
|-------|-------|
| Username | `198001012005011001` |
| Password | `Bksda2026!@#` |

---

## Files Changed

### Backend
```
backend/app/Http/Controllers/Api/AuthController.php     ← Added dashboard() method
backend/app/Http/Resources/MeDashboardResource.php    ← NEW - dashboard response resource
backend/routes/api.php                              ← Added /me/dashboard route
```

### Frontend
```
frontend/src/app/portal/page.tsx                      ← NEW - Personal Dashboard
frontend/src/app/(auth)/login/page.tsx               ← Redirect authenticated users to /portal
frontend/src/components/module-switcher.tsx           ← Portal link to /portal
frontend/src/app/bmn/                                ← MOVED from /portal/bmn/
frontend/src/app/inventory/                         ← MOVED from /portal/inventory/
frontend/src/app/dereporting/                        ← MOVED from /portal/dereporting/
frontend/src/app/kepegawaian/                         ← MOVED from /portal/kepegawaian/
```

---

## Git Commits

| Commit | Description |
|--------|-------------|
| `7ec9652` | feat(frontend): route restructure - move modules to root level + create portal dashboard |
| `eadfb5a` | fix(login): redirect to /portal if already authenticated |
| `162a110` | fix(portal): handle API error gracefully with retry option |
| `0ba2c40` | feat(backend): add /api/me/dashboard endpoint for portal dashboard |
| `900e9b8` | fix(backend): handle missing bmn_asset_loans table gracefully |
| `bd155bf` | fix(backend): dashboard endpoint - don't use undefined relationship |
| `917abcc` | fix(portal): align API response with frontend expectations |
| `fe74b09` | Add dark mode toggle and user info to all module layouts |
| `b28c9f1` | Refactor sidebar layout: ThemeToggle next to header, user profile above logout |
| `31f0777` | refactor: update sidebar layouts with ThemeToggle and user profile placement |

---

## Known Issues / TODOs

| # | Task | Priority | Status |
|---|-------|----------|--------|
| 1 | RouteGuard Component (access_modules check) | HIGH | PENDING |
| 2 | AuthSync Component (cross-tab session) | MEDIUM | PENDING |
| 3 | EmployeeAccessSheet Component | HIGH | PENDING |
| 4 | InteractiveKawasanMap Upgrade | MEDIUM | PENDING |
| 5 | letter-utils.ts | LOW | PENDING |
| 6 | Upgrade BMN Import/Export | HIGH | COMPLETED ✅ |
| 7 | Upgrade Inventory Bulk Operations | HIGH | COMPLETED ✅ |
| 8 | Upgrade Inventory Trash/Restore | MEDIUM | COMPLETED ✅ |

---

## Verification Status

| Check | Status |
|-------|--------|
| Build | ✅ Success |
| ESLint | ✅ 0 errors, 15 warnings |
| TypeScript | ✅ 0 errors |
| Backend PHP Syntax | ✅ Pass |
| Portal Page Load | 🔄 Testing needed |
| Login Flow | 🔄 Testing needed |
| Module Navigation | 🔄 Testing needed |

---

## PR Information

- **PR:** https://github.com/tegaranugrah1/bksda-superapp/pull/252
- **Branch:** `issue/121-frontend-route-restructure-phase10`
- **Status:** Open, testing in progress

# Progress Log: Modul Kepegawaian & Surat Tugas

## [2026-05-10] Sesi Konsolidasi & Restrukturisasi

### Completed (Selesai)
- [x] Pindahkan fitur Tambah Pegawai ke `/kepegawaian/employees/create`.
- [x] Pindahkan fitur Detail Pegawai ke `/kepegawaian/employees/[id]`.
- [x] Pindahkan operasional Surat Tugas ke `/kepegawaian/surat-tugas/*`.
- [x] Update Sidebar Global agar flat (langsung akses Inbox, Buat Surat, dan Riwayat).
- [x] Perbaikan Error 404 pada navigasi `KepegawaianLayout`.
- [x] Fix Linting: Ganti `any` dengan interface di `EmployeeCreatePage`.
- [x] Fix Linting: Ganti `<img>` dengan `next/image`.
- [x] Fix Linting: Update `rounded-[2rem]` menjadi `rounded-4xl`.
- [x] Riset & Bedah Flow Referensi dari `superapp-inventory`.

### In Progress (Sedang Berjalan)
- [/] Sinkronisasi komponen `AssignmentLetterPreview` agar tidak tergantung folder lama.

### Next Steps (Rencana Besok)
- [ ] **Implementasi ST Builder Premium**:
    - [ ] Buat UI Builder dengan Sidebar Form & Main Preview.
    - [ ] Implementasi Auto-parsing kalimat (Asal, Tujuan, Rangka).
    - [ ] Penomoran surat otomatis (ST.XXX/Code/MM/YYYY).
    - [ ] Fitur Print langsung dari browser.
- [ ] **Integrasi Inbox -> Builder**: Klik "Setujui" di Inbox langsung lempar data ke Builder.
- [ ] **Cleanup**: Hapus folder `src/app/(dashboard)/admin/surat-tugas` (Didepresiasi).

## [2026-06-18] Portal Employee Assets Visibility & Switcher

### Completed (Selesai)
- [x] Fix: Bypass `CheckModuleAccess` and `CheckPermission` middlewares for `bmn.view` when a regular employee requests their own assets list or detail views.
- [x] UI: Remove "Eye" (detail view) button from personal assets list in the portal.
- [x] UI: Add Segment control view switcher (List/Grid view switcher) to the "Aset Saya" tab in the portal.
- [x] UI: Display BMN geotag photos (handling local paths and Google Drive share link thumbnails) when Grid View is active.
- [x] Git: Squash merged `issue/portal-my-assets-visibility` branch into `main` and pushed to origin.

## [2026-06-18] Mobile API Readiness - Issue 1: API Contract Baseline

### Completed (Selesai)
- [x] Created `ApiResponse` trait inside `backend/app/Support/Traits/ApiResponse.php` for standardized success/error JSON response formatting.
- [x] Configured global exception rendering in `backend/bootstrap/app.php` to format all common exceptions (401, 403, 404, 405, 500) into unified JSON structures.
- [x] Squash merged `issue/api-contract-baseline` into `main` and pushed to origin.

## [2026-06-18] Mobile API Readiness - Issue 2: Auth & Me Endpoint

### Completed (Selesai)
- [x] Expanded `UserResource` in `backend/app/Http/Resources/UserResource.php` to embed associated employee profile details and permission lists.
- [x] Registered the `/api/me` route mapping under Sanctum middleware in `backend/routes/api.php`.
- [x] Squash merged `issue/auth-and-me-endpoint` into `main` and pushed to origin.

## [2026-06-18] Mobile API Readiness Cleanup

### Completed (Selesai)
- [x] Fixed web regression risk from strict `per_page=100` caps by keeping mobile caps strict while allowing existing web report/export flows to request larger pages.
- [x] Hardened legacy permission fallback for `kepegawaian.*` and `surat_tugas.*`, so older users without granular permissions still behave correctly.
- [x] Updated mobile dashboard permission summary to use backend permission checks instead of module-name heuristics.
- [x] Added `data` wrapper to `/api/me/dashboard` while preserving legacy top-level fields used by the web portal.
- [x] Made logout safer for mobile Bearer-token sessions by invalidating browser sessions only when a session exists.
- [x] Added nullable BMN photo geotag metadata columns: latitude, longitude, and location note.
- [x] Updated BMN photo/geotag upload responses to include a mobile-friendly `data` payload while preserving existing top-level `url/path` fields for web compatibility.
- [x] Added unit coverage for legacy permission fallback behavior.
- [x] Fixed the default feature health test to target `/api/health` instead of the non-existent backend root route.

### Verification
- [x] PHP syntax checks passed for changed backend files.
- [x] `php artisan migrate --pretend` passed for the new BMN geotag metadata migration.
- [x] `php artisan test` passed: 6 tests, 11 assertions.
- [x] `npm run lint` passed for frontend.

## [2026-06-18] Mobile App Planning - Requirements Draft

### Completed (Selesai)
- [x] Rewrote `.kiro/specs/mobile-app-bmn-kepegawaian/requirements.md` from the older field-staff-only draft into a role-aware mobile app requirement document.
- [x] Captured product decisions: Android first, iOS later, online-only MVP, existing backend auth, all current roles, backend permission enforcement, and no BMN document generators in MVP.
- [x] Defined MVP scope for auth, mobile dashboard, role-based navigation, BMN assets, asset photos/geotag, verification, loans/returns, Surat Tugas, profile, pagination, and mobile error handling.
- [x] Added explicit out-of-scope items: BMN document generators, Excel import/export, CMS, offline mode, production push notifications, and server/deployment administration.
- [x] Added acceptance criteria for 20 mobile requirement areas plus future requirements and open questions for the upcoming `design.md`.

### Next Steps
- [ ] Review and refine the requirements with product feedback if needed.
- [ ] Create `.kiro/specs/mobile-app-bmn-kepegawaian/design.md`.
- [ ] Create `.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md`.

## [2026-06-18] Mobile App Planning - Design Draft

### Completed (Selesai)
- [x] Created `.kiro/specs/mobile-app-bmn-kepegawaian/design.md` as the technical and UX design bridge after requirements.
- [x] Recommended Expo React Native + TypeScript for Android-first MVP with iOS readiness.
- [x] Defined app architecture: app shell, auth layer, API layer, feature modules, and shared UI.
- [x] Defined root navigation, tab structure, screen map, and role-based module visibility.
- [x] Designed BMN flows for asset list/detail, photo/geotag upload, verification, loans, and returns.
- [x] Designed Surat Tugas flows for list/detail, create/edit/submit, approval/status actions, and authenticated download/share.
- [x] Added API client conventions, error handling, permission gating, security, accessibility, performance, testing, and rollout strategy.

### Next Steps
- [ ] Review `design.md` for product/UX fit.
- [ ] Create `.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md`.

## [2026-06-18] Mobile App Planning - Tasks Draft

### Completed (Selesai)
- [x] Created `.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md` as the implementation checklist for the mobile app MVP.
- [x] Broke the mobile app plan into 30 issue-sized tasks from workspace setup through Android internal release.
- [x] Sequenced the plan from shared foundations first: Expo workspace, design system, API client, secure auth, profile bootstrap, permission context, and navigation.
- [x] Added feature tasks for mobile dashboard, BMN list/detail/create/edit, photo/geotag upload, verification, loans/returns, Surat Tugas list/detail/forms/approval, and authenticated file download/share.
- [x] Added quality tasks for online-only behavior, security hardening, accessibility, automated tests, Android device validation, rollout documentation, and progress updates.

### Next Steps
- [ ] Review `requirements.md`, `design.md`, and `tasks.md` as one mobile MVP specification set.
- [ ] Decide first implementation issue, recommended: mobile workspace setup and shared design foundation.

## [2026-06-18] Mobile App Planning - Spec Quality Upgrade

### Completed (Selesai)
- [x] Audited `requirements.md`, `design.md`, and `tasks.md` as one mobile MVP specification set.
- [x] Raised the target quality score to 9.5/10 by closing product decisions that were still open.
- [x] Updated requirements with Expo managed workflow, authenticated PDF/share behavior, geotag scope, MVP milestones, and measurable performance/security/UX criteria.
- [x] Updated design with 9.5/10 scoring, permission matrix, non-functional targets, and milestone-based rollout plan.
- [x] Updated tasks with 9.5/10 scoring, milestone groups, and exit criteria for Foundation Alpha, BMN Alpha, Surat Tugas Alpha, Android Internal Beta, and Android Internal Release.

### Next Steps
- [ ] Start implementation from Milestone 1: Foundation Alpha.
- [ ] Verify backend permission names during the first implementation spike.

## [2026-06-18] Mobile App Planning - Low-Model Task Breakdown

### Completed (Selesai)
- [x] Reworked `.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md` from 30 epic-level tasks into 90 smaller execution tasks.
- [x] Added low-model execution rules to prevent scope drift, oversized PRs, and unsafe auth/file handling.
- [x] Kept the same five milestones while making each milestone more granular and easier to validate.
- [x] Added target area, expected result, and acceptance check for every task so weaker AI models can execute with less interpretation.
- [x] Raised the task plan score to 10/10 specifically for step-by-step execution by lower-capability AI models.

### Verification
- [x] Confirmed `tasks.md` contains 90 numbered checklist items.
- [x] Confirmed task coverage still maps to Foundation Alpha, BMN Alpha, Surat Tugas Alpha, Android Internal Beta, and Android Internal Release.

### Next Steps
- [ ] Start with task 1: create the mobile workspace folder.
- [ ] Keep each implementation PR small and update `docs/progress.md` after each completed issue.

## [2026-06-18] Mobile App Planning - Low-Model Task Contracts

### Completed (Selesai)
- [x] Strengthened `.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md` so low-capability AI models have implementation contracts, not only short task descriptions.
- [x] Added subscore targets marked 10/10 for structure, task size, acceptance clarity, implementation detail, and likelihood of low-model success.
- [x] Added mandatory workspace, folder, library, shared component, API client, query hook, permission, screen state, BMN, Surat Tugas, employee selector, and security contracts.
- [x] Added explicit component props for core UI components such as `AppButton`, `IconButton`, `AppTextInput`, `SearchInput`, state components, and API response/error shapes.
- [x] Added low-model do/don't rules to prevent unsafe storage, unauthenticated file URLs, desktop table patterns, and backend permission bypasses.

### Verification
- [x] Confirmed `tasks.md` still contains 90 numbered tasks.
- [x] Confirmed implementation contracts are available before the task list.

### Next Steps
- [ ] Start implementation from task 1 using the contracts as mandatory guardrails.

## [2026-06-18] Mobile App Planning - Local Task Instructions

### Completed (Selesai)
- [x] Corrected the low-model score framing: 10/10 depends on reading each task together with its local instruction row.
- [x] Added a `Local Instruction Matrix` to `.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md`.
- [x] Added one local instruction row for every task 1-90, including focus, required contract, explicit "do not" guardrail, and local check.
- [x] Made task execution safer for smaller models that may not reliably infer details from the global contracts alone.

### Verification
- [x] Confirmed all 90 task IDs have a matching local instruction row.

### Next Steps
- [ ] When delegating a task to a smaller model, include both the numbered task and its row from the `Local Instruction Matrix`.

## [2026-06-18] Mobile App Implementation - Task 1 s.d 4 (Milestone 1)

### Completed (Selesai)
- [x] Task 1: Scaffolded the Expo React Native + TypeScript workspace inside the [mobile/](file:///e:/bksda-superapp/mobile/) directory.
- [x] Task 2: Created [mobile/.env.example](file:///e:/bksda-superapp/mobile/.env.example) and updated `.gitignore` to ignore local env files (`.env`).
- [x] Task 3: Added [mobile/README.md](file:///e:/bksda-superapp/mobile/README.md) with detailed installation and Android running instructions.
- [x] Task 4: Configured TypeScript path aliases in `mobile/tsconfig.json` mapping `@/*` to `./src/*`, verified with typechecks.
- [x] Checked off completed tasks 1, 2, 3, and 4 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 5: Configure lint and format scripts in `mobile/package.json` (Selesai).

## [2026-06-19] Mobile App Implementation - Task 5 (Milestone 1)

### Completed (Selesai)
- [x] Task 5: Configured lint, typecheck, and test scripts in `mobile/package.json`.
- [x] Created FlatCompat eslint configuration in `mobile/eslint.config.js` and resolved Node type definitions/globals (`__dirname`).
- [x] Configured Jest preset in `mobile/jest.config.js` and added jest to tsconfig types to support typescript.
- [x] Created placeholder math unit test, verifying both lint (`npm run lint`), typecheck (`tsc --noEmit`), and jest tests pass.
- [x] Checked off completed task 5 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 6: Create mobile source directory structure (`mobile/src/app`, `mobile/src/components`, etc.) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 6 (Milestone 1)

### Completed (Selesai)
- [x] Task 6: Created the mobile source directory structure (`app`, `components`, `features`, `hooks`, `lib`, `navigation`, `theme`, `types` including feature subdirectories `auth`, `bmn`, `dashboard`, `employees`, `profile`, `surat-tugas`, and library directories `api`, `auth`, `files`).
- [x] Kept all folders tracked using placeholder `.gitkeep` files.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 6 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 7: Add design tokens (`mobile/src/theme/tokens.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 7 (Milestone 1)

### Completed (Selesai)
- [x] Task 7: Defined and exported design tokens for colors, spacing, typography, radius, and shadows in [mobile/src/theme/tokens.ts](file:///e:/bksda-superapp/mobile/src/theme/tokens.ts).
- [x] Confirmed color tokens support both light mode and dark mode, and include primary, danger, warning, info, neutral, and surface colors, matching the Emerald/Green Forestry Theme of the web dashboard.
- [x] Exported `type` as alias for `typography` to support specific local focuses.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 7 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 8: Add AppButton component (`mobile/src/components/AppButton.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 8 (Milestone 1)

### Completed (Selesai)
- [x] Task 8: Created `AppButton` component in [mobile/src/components/AppButton.tsx](file:///e:/bksda-superapp/mobile/src/components/AppButton.tsx) and built a dynamic theme resolution hook `useAppTheme` in [mobile/src/hooks/useAppTheme.ts](file:///e:/bksda-superapp/mobile/src/hooks/useAppTheme.ts).
- [x] Implemented button variants (`primary`, `secondary`, `danger`, `ghost`) supporting disabled, loading (using ActivityIndicator), and optional left icon properties.
- [x] Enforced standard accessibility properties like `accessibilityRole="button"`, automated `accessibilityLabel` fallback, and disabled the interaction while loading or disabled.
- [x] Configured Jest module path mapping `moduleNameMapper` in [mobile/jest.config.js](file:///e:/bksda-superapp/mobile/jest.config.js) to resolve `@/*` path aliases correctly.
- [x] Installed `react-test-renderer` types and created comprehensive unit tests in [mobile/src/components/__tests__/AppButton.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/AppButton.test.tsx) using fake timers to verify all states and handlers.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 8 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 9: Add IconButton component (`mobile/src/components/IconButton.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 9 (Milestone 1)

### Completed (Selesai)
- [x] Task 9: Created `IconButton` component in [mobile/src/components/IconButton.tsx](file:///e:/bksda-superapp/mobile/src/components/IconButton.tsx).
- [x] Enforced mandatory `accessibilityLabel` property in TypeScript (ensuring type safety as requested by the acceptance check).
- [x] Configured support for variants (`plain`, `soft`, `danger`) and disabled state, ensuring a minimum touch target area of 48x48dp.
- [x] Destructured and used `isDark` directly from `useAppTheme` in style definitions.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/IconButton.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/IconButton.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 9 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 10: Add AppTextInput component (`mobile/src/components/AppTextInput.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 10 (Milestone 1)

### Completed (Selesai)
- [x] Task 10: Created `AppTextInput` component in [mobile/src/components/AppTextInput.tsx](file:///e:/bksda-superapp/mobile/src/components/AppTextInput.tsx) with custom focused border colors, error border colors, and disabled states.
- [x] Enforced label-always-rendered rule and mapped error text dynamically below the input, using Indonesian user-facing validation messages.
- [x] Integrated screen-reader accessibility features (`accessibilityLabel`, `accessibilityHint`, `accessibilityState`, and `aria-invalid`).
- [x] Removed unused `useColorScheme` import to avoid ESLint warnings.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/AppTextInput.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/AppTextInput.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 10 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 11: Add SearchInput component (`mobile/src/components/SearchInput.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 11 (Milestone 1)

### Completed (Selesai)
- [x] Task 11: Created `SearchInput` component in [mobile/src/components/SearchInput.tsx](file:///e:/bksda-superapp/mobile/src/components/SearchInput.tsx).
- [x] Built layout with left search icon ("🔍") and clear button ("✕") that displays only when value is not empty.
- [x] Confirmed the clear button functions properly to empty search state with one tap, while keeping debounce outside the visual component as requested.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/SearchInput.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/SearchInput.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 11 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 12: Add StatusBadge component (`mobile/src/components/StatusBadge.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 12 (Milestone 1)

### Completed (Selesai)
- [x] Task 12: Created `StatusBadge` component in [mobile/src/components/StatusBadge.tsx](file:///e:/bksda-superapp/mobile/src/components/StatusBadge.tsx) supporting `success`, `warning`, `danger`, `info`, and `neutral` status states.
- [x] Implemented dynamic light/dark mode background and text colors using status configurations and `useAppTheme` hooks.
- [x] Confirmed the badge always renders the text value (not color only) as required by the acceptance criteria.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/StatusBadge.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/StatusBadge.test.tsx) using `StyleSheet.flatten` to test active background/text colors.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 12 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 13: Add SectionCard component (`mobile/src/components/SectionCard.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 13 (Milestone 1)

### Completed (Selesai)
- [x] Task 13: Created `SectionCard` component in [mobile/src/components/SectionCard.tsx](file:///e:/bksda-superapp/mobile/src/components/SectionCard.tsx) serving as the standard structured card layout for details and forms.
- [x] Mapped layout properties including `title`, optional `subtitle`, optional header `action` component, and child `content` slot.
- [x] Used the standard card background color and a subtle shadow token to avoid nested decorative card patterns.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/SectionCard.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/SectionCard.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 13 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 14: Add EmptyState component (`mobile/src/components/EmptyState.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 14 (Milestone 1)

### Completed (Selesai)
- [x] Task 14: Created `EmptyState` component in [mobile/src/components/EmptyState.tsx](file:///e:/bksda-superapp/mobile/src/components/EmptyState.tsx) for lists placeholder layout.
- [x] Mapped layout properties including `title`, optional `message`, and optional `action` slot.
- [x] Confirmed the component is general and reusable, not feature-specific.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/EmptyState.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/EmptyState.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 14 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 15: Add ErrorState component (`mobile/src/components/ErrorState.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 15 (Milestone 1)

### Completed (Selesai)
- [x] Task 15: Created `ErrorState` component in [mobile/src/components/ErrorState.tsx](file:///e:/bksda-superapp/mobile/src/components/ErrorState.tsx) for displaying general user-facing error states without exposing raw technical errors.
- [x] Implemented optional `title`, `message` details, and optional `onRetry` callback, rendering an `AppButton` when the retry callback is provided.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/ErrorState.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/ErrorState.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 15 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 16: Add LoadingSkeleton component (`mobile/src/components/LoadingSkeleton.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 16 (Milestone 1)

### Completed (Selesai)
- [x] Task 16: Created `LoadingSkeleton` component in [mobile/src/components/LoadingSkeleton.tsx](file:///e:/bksda-superapp/mobile/src/components/LoadingSkeleton.tsx) supporting `card`, `list`, and `detail` layouts.
- [x] Implemented pulsing opacity animations utilizing `Animated.loop` and React Native's `Animated` library.
- [x] Avoided accessing ref `current` property directly during render to prevent ESLint warnings, using stable `useState` initializers instead.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/LoadingSkeleton.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/LoadingSkeleton.test.tsx) using fake timers to simulate animation ticks.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 16 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 17: Add ConfirmDialog component (`mobile/src/components/ConfirmDialog.tsx`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 17 (Milestone 1)

### Completed (Selesai)
- [x] Task 17: Created `ConfirmDialog` component in [mobile/src/components/ConfirmDialog.tsx](file:///e:/bksda-superapp/mobile/src/components/ConfirmDialog.tsx) using React Native's `Modal` component.
- [x] Configured support for overlay overlay backdrop press, dialog `title`, `message`, `visible` flag, and confirm/cancel callbacks, with support for destructive red theme option.
- [x] Resolved a TypeScript typecheck error by using explicit style properties for backdrop overlay absolute positioning instead of `StyleSheet.absoluteFillObject` which wasn't fully typed.
- [x] Added unit tests for the component in [mobile/src/components/__tests__/ConfirmDialog.test.tsx](file:///e:/bksda-superapp/mobile/src/components/__tests__/ConfirmDialog.test.tsx).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 17 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 18: Add API configuration (`mobile/src/lib/api/config.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 18 (Milestone 1)

### Completed (Selesai)
- [x] Task 18: Created API configuration in [mobile/src/lib/api/config.ts](file:///e:/bksda-superapp/mobile/src/lib/api/config.ts) to load backend base URL and app environment settings from `process.env`.
- [x] Implemented a developer-friendly error fallback that throws a descriptive layout error explaining how to configure `.env` if `EXPO_PUBLIC_API_URL` is missing.
- [x] Created unit tests in [mobile/src/lib/api/__tests__/config.test.ts](file:///e:/bksda-superapp/mobile/src/lib/api/__tests__/config.test.ts) to test env loading and throw behaviors (mocking the typescript linter's require rule on dynamic imports).
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 18 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 19: Add secure token storage helper (`mobile/src/lib/auth/tokenStorage.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 19 (Milestone 1)

### Completed (Selesai)
- [x] Task 19: Created secure token storage helper in [mobile/src/lib/auth/tokenStorage.ts](file:///e:/bksda-superapp/mobile/src/lib/auth/tokenStorage.ts) using `expo-secure-store`.
- [x] Implemented `setToken`, `getToken`, and `clearToken` functions to securely persist, retrieve, and delete the user's authentication token.
- [x] Wrote comprehensive unit tests in [mobile/src/lib/auth/__tests__/tokenStorage.test.ts](file:///e:/bksda-superapp/mobile/src/lib/auth/__tests__/tokenStorage.test.ts) mocking `expo-secure-store` and verifying correct handling of key-value storage.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 19 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 20: Add API response normalizer (`mobile/src/lib/api/normalize.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 20 (Milestone 1)

### Completed (Selesai)
- [x] Created API shared types in [mobile/src/types/api.ts](file:///e:/bksda-superapp/mobile/src/types/api.ts) for `ApiSuccess` and `ApiError` standardized shapes.
- [x] Created API response normalizer in [mobile/src/lib/api/normalize.ts](file:///e:/bksda-superapp/mobile/src/lib/api/normalize.ts) supporting wrappers with `data`, `meta`, and `message`, flat top-level pagination parameters, and fallback wrapping for legacy flat payload objects.
- [x] Wrote unit tests in [mobile/src/lib/api/__tests__/normalize.test.ts](file:///e:/bksda-superapp/mobile/src/lib/api/__tests__/normalize.test.ts) covering primitives, arrays, wrapped structures, camelCase mapping, top-level parameters, and legacy flat fallbacks.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 20 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 21: Add API error normalizer (`mobile/src/lib/api/errors.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 21 (Milestone 1)

### Completed (Selesai)
- [x] Created API error normalizer in [mobile/src/lib/api/errors.ts](file:///e:/bksda-superapp/mobile/src/lib/api/errors.ts) that handles and categorizes HTTP response codes (401, 403, 404, 422, 429), server internal issues (500+), and generic or connection-level network errors.
- [x] Implemented error message sanitization to safeguard the application from exposing raw SQL, HTML, or PHP stack traces to end-users.
- [x] Configured the 422 Unprocessable Entity parser to extract field-level verification errors and map them to `fieldErrors` for integration with input forms.
- [x] Wrote comprehensive unit tests in [mobile/src/lib/api/__tests__/errors.test.ts](file:///e:/bksda-superapp/mobile/src/lib/api/__tests__/errors.test.ts) covering each HTTP code, request timeouts/network issues, generic Errors, and trace shielding.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 21 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 22: Add central API client (`mobile/src/lib/api/client.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 22 (Milestone 1)

### Completed (Selesai)
- [x] Installed `axios` in [mobile/package.json](file:///e:/bksda-superapp/mobile/package.json) using `--legacy-peer-deps` to bypass React 19 dependency resolution warnings.
- [x] Created central Axios API client in [mobile/src/lib/api/client.ts](file:///e:/bksda-superapp/mobile/src/lib/api/client.ts) pointing to the configured `baseURL` from Task 18.
- [x] Integrated request interceptor that injects standard `Accept: application/json` and `X-Client: mobile` headers, and automatically fetches and attaches the authentication token as `Authorization: Bearer <token>` when present.
- [x] Configured request/response interceptors to automatically filter/prevent logs of authorization headers, passwords, and tokens.
- [x] Added response interceptor that automatically standardizes success responses using `normalizeResponse` and rejects errors with `normalizeError`, including clearing the secure token storage on 401 Unauthorized errors.
- [x] Wrote unit tests in [mobile/src/lib/api/__tests__/client.test.ts](file:///e:/bksda-superapp/mobile/src/lib/api/__tests__/client.test.ts) utilizing a custom Axios default adapter to simulate network request roundtrips and assert header presence, payload normalization, and 401 token cleanup.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 22 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 23: Add mobile query helper (`mobile/src/lib/api/mobileParams.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 23 (Milestone 1)

### Completed (Selesai)
- [x] Created mobile query parameter builder helper in [mobile/src/lib/api/mobileParams.ts](file:///e:/bksda-superapp/mobile/src/lib/api/mobileParams.ts).
- [x] Configured helper to inject `mobile: true` into query parameters and supply default fallback properties of `per_page: 20` and `page: 1` if they are not explicitly specified.
- [x] Guaranteed that explicit parameters provided by the query caller (including numeric or string offsets/limits) are preserved and never overridden.
- [x] Wrote unit tests in [mobile/src/lib/api/__tests__/mobileParams.test.ts](file:///e:/bksda-superapp/mobile/src/lib/api/__tests__/mobileParams.test.ts) to verify defaults behavior, preserve parameter integrity, ensure explicit value retention, and safeguard `mobile=true` injection.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 23 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 24: Add auth service (`mobile/src/features/auth/authApi.ts`) (Selesai).

## [2026-06-19] Mobile App Implementation - Task 24 (Milestone 1)

### Completed (Selesai)
- [x] Defined TypeScript interfaces for `Employee`, `User`, `LoginCredentials`, and `LoginResponse` inside [mobile/src/types/auth.ts](file:///e:/bksda-superapp/mobile/src/types/auth.ts) to match the backend Laravel Sanctum and UserResource formats.
- [x] Adjusted API response normalizer [mobile/src/lib/api/normalize.ts](file:///e:/bksda-superapp/mobile/src/lib/api/normalize.ts) to preserve other custom top-level keys like `token` by spreading unhandled response fields.
- [x] Created auth API service in [mobile/src/features/auth/authApi.ts](file:///e:/bksda-superapp/mobile/src/features/auth/authApi.ts) with `login` (calling `POST /api/login`), `getMe` (calling `GET /api/me`), and `logout` (calling `POST /api/logout`).
- [x] Wrote unit tests in [mobile/src/features/auth/__tests__/authApi.test.ts](file:///e:/bksda-superapp/mobile/src/features/auth/__tests__/authApi.test.ts) to verify the correct endpoints and HTTP methods are requested.
- [x] Verified typechecking (`tsc --noEmit`), linting (`eslint .`), and Jest unit tests still pass successfully.
- [x] Checked off completed task 24 inside [.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md](file:///e:/bksda-superapp/.kiro/specs/mobile-app-bmn-kepegawaian/tasks.md).

### Next Steps
- [ ] Task 25: Add auth context (`mobile/src/features/auth/AuthProvider.tsx`).


