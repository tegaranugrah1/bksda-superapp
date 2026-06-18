# Security Remediation Plan

Tanggal audit: 18 Juni 2026

Dokumen ini merangkum rencana perbaikan keamanan BKSDA SuperApp berdasarkan audit statis repo, dependency audit, dan review konfigurasi aplikasi. Aplikasi sudah berjalan di production (`bksdakaltim.net`), jadi perbaikan harus dilakukan bertahap dengan PR kecil, validasi lokal, lalu redeploy production melalui Dokploy.

## Ringkasan Audit

Nilai security saat audit: **6.2/10**

Target realistis setelah fase prioritas selesai: **8.3-8.7/10**

Target 9/10 membutuhkan tambahan kontrol operasional seperti CSP matang, audit log lengkap, rotasi secret terjadwal, backup/restore drill, dan security scan otomatis di CI.

## Temuan Utama

### 1. Dependency rentan

Audit dependency menemukan vulnerability high/critical di backend dan frontend.

Backend:
- `phpoffice/phpspreadsheet` memiliki advisory critical.
- `laravel/framework`, `symfony/*`, `guzzlehttp/psr7`, dan dependency lain memiliki advisory medium/high.

Frontend:
- `form-data` dan `hono` memiliki advisory high.
- `dompurify`, `js-yaml`, `postcss`, dan `quill` memiliki advisory moderate/low.

Risiko:
- Import/export dokumen dan render HTML publik menjadi permukaan serangan yang cukup penting.
- Dependency rentan bisa membuat aplikasi terkena XSS, injection, path traversal, atau DoS tergantung jalur pemakaian.

### 2. Secret ada di workspace lokal

File sensitif terdeteksi masih ada sebagai untracked file:
- `bksda-superapp.pem`
- `service-account.json`

Risiko:
- Tidak otomatis bocor karena belum ter-commit, tetapi berbahaya untuk accidental commit, backup tidak aman, atau tersalin ke tempat lain.
- `.gitignore` perlu dibersihkan karena ada indikasi karakter aneh/NUL pada bagian pattern secret.

### 3. Token auth disimpan di browser storage

Frontend menyimpan token di:
- `localStorage`
- cookie non-HttpOnly

Risiko:
- Jika ada XSS, token dapat dicuri oleh JavaScript.
- Token digunakan sebagai Bearer token untuk API, sehingga pencurian token bisa langsung mengambil alih sesi.

### 4. Sanctum token tidak memiliki expiry

Konfigurasi Sanctum masih menggunakan token tanpa masa kedaluwarsa.

Risiko:
- Token yang tercuri tetap valid sampai logout/revoke manual.
- Dampaknya semakin besar karena token disimpan di browser storage.

### 5. Login belum rate-limited

Route login publik belum terlihat memakai throttle khusus.

Risiko:
- Brute force username/password lebih mudah dilakukan.
- Log aplikasi bisa penuh oleh percobaan login otomatis.

### 6. Authorization BMN masih terlalu kasar

Route BMN dilindungi `auth:sanctum` dan `module.access:bmn`, tetapi beberapa aksi sensitif belum punya permission granular.

Contoh aksi sensitif:
- approve import review
- bulk dispose
- bulk force delete
- bulk restore
- delete dokumen/riwayat
- generate dokumen legal/BA

Risiko:
- User dengan akses modul BMN bisa melakukan aksi destruktif jika frontend dibypass atau permission UI tidak cukup kuat.

## Rencana Perbaikan Bertahap

### Fase 1 - Hotfix Low-Risk

Tujuan: menutup risiko yang paling jelas tanpa mengubah arsitektur auth besar-besaran.

Pekerjaan:
- Update dependency backend untuk menutup advisory high/critical.
- Update dependency frontend untuk menutup advisory high/critical yang tidak breaking.
- Tambahkan throttle login, misalnya `throttle:5,1` atau limiter berbasis username dan IP.
- Bersihkan `.gitignore` agar pattern secret valid dan mudah dibaca.
- Pastikan pattern berikut di-ignore:
  - `*.pem`
  - `service-account.json`
  - `*.key`
  - `.env`
  - `.env.*`
  - kecuali `.env.example`
- Hapus/relokasi file helper lokal sensitif dari root workspace jika tidak wajib berada di repo folder.

Validasi:
- `composer audit --no-dev`
- `npm audit --omit=dev`
- `php artisan route:list`
- login manual lokal
- smoke test modul BMN utama

Catatan:
- Jika update dependency breaking, pisahkan ke PR tersendiri.

### Fase 2 - Token Lifetime Hardening

Tujuan: mengurangi dampak jika token bocor.

Pekerjaan:
- Set Sanctum token expiration, contoh 480-1440 menit sesuai kebutuhan operasional.
- Revoke semua token user saat change password.
- Pertimbangkan revoke token lama saat role/access_modules berubah.
- Tambahkan handling frontend untuk sesi expired yang lebih jelas.

Validasi:
- Login berhasil.
- Token expired menghasilkan 401 dan user diarahkan ke login.
- Change password memutus token lama.

### Fase 3 - Auth Storage Hardening

Tujuan: mengurangi risiko pencurian token dari XSS.

Opsi yang direkomendasikan:
- Migrasi ke Sanctum SPA cookie mode dengan cookie `HttpOnly`, `Secure`, dan `SameSite=Lax` atau `Strict`.
- Hindari menyimpan Bearer token di `localStorage`.
- Gunakan CSRF flow Sanctum jika frontend dan backend satu domain/subdomain.

Risiko perubahan:
- Ini fase paling berisiko karena menyentuh login, RouteGuard, axios interceptor, CORS, Sanctum stateful domains, dan Dokploy env.

Validasi:
- Login/logout lokal.
- Refresh browser tetap valid sesuai masa sesi.
- API protected bisa diakses.
- Production domain dan subdomain bekerja.

### Fase 4 - Authorization Granular BMN

Tujuan: membatasi aksi sensitif berdasarkan role/permission, bukan hanya akses modul.

Permission yang disarankan:
- `bmn.view`
- `bmn.asset.create`
- `bmn.asset.update`
- `bmn.asset.dispose`
- `bmn.asset.force_delete`
- `bmn.import.review`
- `bmn.import.approve`
- `bmn.document.generate`
- `bmn.document.delete`
- `bmn.document.history.view`

Pekerjaan:
- Tambah middleware permission atau policy.
- Pasang pada route/controller sensitif.
- Sinkronkan UI agar tombol hanya muncul jika user punya permission.
- Pastikan backend tetap menjadi sumber otorisasi utama.

Validasi:
- User BMN biasa tidak bisa force delete/import approve.
- Admin BMN bisa melakukan aksi sesuai permission.
- Super admin tetap bypass jika memang dikehendaki.

### Fase 5 - CSP dan XSS Blast Radius Reduction

Tujuan: membatasi dampak XSS.

Pekerjaan:
- Tambah Content-Security-Policy bertahap.
- Mulai dari `Content-Security-Policy-Report-Only` jika khawatir memecahkan asset existing.
- Audit semua `dangerouslySetInnerHTML`, `document.write`, dan render HTML CMS.
- Pastikan DOMPurify terbaru digunakan untuk konten publik.

Validasi:
- Halaman publik CMS tetap render.
- Print dokumen tetap bekerja.
- Tidak ada inline script tidak perlu.

### Fase 6 - Production Secret Cleanup

Tujuan: memastikan secret production tidak tersimpan sembarangan dan bisa diputar.

Pekerjaan:
- Rotasi Google service account jika file pernah tersalin keluar dari mesin aman.
- Rotasi SSH key jika `bksda-superapp.pem` pernah dibagikan, masuk backup publik, atau diragukan.
- Pastikan Dokploy env hanya tersimpan di panel/env production, bukan file repo.
- Pastikan `.env.prod` tidak ada di repo.

Validasi:
- Deploy tetap berhasil setelah rotasi.
- Google Sheets integration masih berjalan.
- SSH baru bisa dipakai, key lama dicabut jika memang dirotasi.

### Fase 7 - Security Observability

Tujuan: memudahkan deteksi insiden dan audit internal.

Pekerjaan:
- Tambah audit log untuk aksi destruktif:
  - import approve
  - bulk delete/force delete
  - dispose/restore
  - delete document history
  - perubahan permission user
- Tambah log login gagal dengan rate limit metadata.
- Pertimbangkan alert untuk login gagal berulang.

Validasi:
- Audit log mencatat aktor, waktu, IP, user agent, target resource, dan perubahan.

## Urutan PR yang Disarankan

1. **PR 1: dependency + login throttle + gitignore secret cleanup**
2. **PR 2: token expiration + revoke token on password/access change**
3. **PR 3: permission granular BMN untuk aksi destruktif**
4. **PR 4: auth storage hardening ke cookie HttpOnly**
5. **PR 5: CSP report-only dan XSS audit**
6. **PR 6: audit log aksi sensitif**

## Checklist Deploy Production

Setiap PR yang menyentuh backend/frontend production harus melalui checklist ini:

- Build frontend sukses.
- Backend syntax/check minimal sukses.
- Migration aman atau sudah diuji lokal.
- Dokploy deploy berhasil.
- Smoke test:
  - login
  - dashboard
  - BMN data aset
  - BMN reports
  - upload/download foto jika terkait
  - import review jika terkait
- Cek browser console untuk error 401/403/CORS.
- Cek log backend untuk 500.

## Catatan Penting

- Perbaikan lokal tidak otomatis memperbaiki `bksdakaltim.net`. Production baru membaik setelah PR merge, push, Dokploy redeploy, dan smoke test berhasil.
- Secret cleanup tidak cukup dengan deploy. Secret yang diduga pernah terekspos harus dirotasi.
- Perubahan auth storage sebaiknya tidak digabung dengan dependency upgrade besar agar regresi mudah dilacak.
