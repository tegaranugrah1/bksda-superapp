# Tasks v3: WebSocket, BKSDA Drive, Email & Keamanan Akun, Backup

> **Dokumen terkait**: [requirements.md](file:///e:/bksda-superapp/docs/websocket-drive-mail-infrastructure/requirements.md) | [design.md](file:///e:/bksda-superapp/docs/websocket-drive-mail-infrastructure/design.md)
> Setiap fase punya: acceptance criteria (AC), satu self-check yang bisa dijalankan, rollback, dan estimasi (hari kerja, 1 developer).
> Urutan wajib: **0A → 0B → 1A → 1B → 1C → 2 → 3 → 4**. Fase 5 dijalankan saat domain `.id` siap.

| Fase | Isi | Estimasi |
|---|---|---|
| 0A | Backup Proxmox (PBS, sdb, sdc, offsite) | 1,5 |
| 0B | Fondasi aplikasi (queue/cache, split container, secret, monitoring) | 2 |
| 1A | WebSocket + notifikasi real-time | 2 |
| 1B | Verifikasi email, lupa password, mailer failover, webhook | 2,5 |
| 1C | Paksa ganti password, reset admin, 2FA TOTP | 2,5 |
| 2 | Drive MVP (diawali spike) | 6 |
| 3 | Berbagi | 2 |
| 4 | Auto-archive | 1,5 |
| **Total** | | **±20 hari kerja** |

---

## Fase 0A — Backup Proxmox (dikerjakan pertama, sebelum ada perubahan apa pun)
- [x] **0A.1** Format dan inisialisasi `/dev/sdb` (2 TB Lenovo HDD) sebagai Proxmox storage `local-backup-2tb` (1.86 TB free).
- [x] **0A.2** Format dan inisialisasi `/dev/sdc` (2 TB Kingston USB SSD) sebagai Proxmox storage `backup-usb-2tb` (1.86 TB free).
- [x] **0A.3** Daftarkan jadwal backup snapshot VM 106 di Proxmox Cluster (`schedule: 02:30 WITA`, `compress: zstd`, retensi: 7 harian, 4 mingguan, 6 bulanan). Uji snapshot perdana sukses (6.65 GB).
- [x] **0A.4** Verifikasi `qemu-guest-agent` aktif di VM 106 (freeze/thaw konsisten untuk database PostgreSQL).
- [x] **0A.5** Pasang cron sinkronisasi snapshot ke USB SSD di host Proxmox (`/etc/cron.d/bksda-backup-sync` tiap 03:30 WITA). Uji sync sukses (840 MB/s).
- [x] **0A.6** Pasang script internal VM 106 `/srv/backup/run-daily-backup.sh` (dump PostgreSQL `pg_dump -Fc` + tar volume `backend-storage` + retensi 14 hari) dan jadwalkan di crontab root pukul 01:00 WITA.
- [ ] **0A.7** Offsite Google Drive 2 TB kantor (design §8.3): *(Catatan: Di-hold sementara, menunggu akses akun di HP rekan)* — buat OAuth Client ID di Google Cloud project kantor (scope `drive.file`), `rclone authorize` dari laptop, remote `gdrive` + `gdrive-crypt`, simpan password crypt di luar server, aktifkan 2FA akun Google, cron mingguan cek kuota (`rclone about`).
- [x] **0A.8** Uji restore nyata: dump PostgreSQL sukses di-restore ke `bksda_restore_verify` dengan 152 rows `users` & `kpg_employees` cocok 100%.

**AC**: 1 backup VM 106 sukses di `main` dan tersinkron ke `copy`; dump + tar terverifikasi; **restore uji berhasil**: `pg_restore` ke `bksda_restore_verify` dengan jumlah baris `users`/`kpg_employees` cocok 100%.
**Self-check**: `scripts/backup-verify.sh` — `pg_restore --list` dump terbaru tidak error.
**Rollback**: tidak mengubah VM produksi. Job backup tinggal dinonaktifkan.

---

## Fase 0B — Fondasi Aplikasi
- [x] **0B.1** Migrasi `jobs`, `failed_jobs`, `cache`, `cache_locks`, dan `job_batches` dibuat dan diverifikasi di PostgreSQL.
- [x] **0B.2** Pecah compose (`backend`, `queue`, `reverb`, `scheduler`) di `docker-compose.dokploy.yml` dengan `CACHE_STORE=database`, `QUEUE_CONNECTION=database`, `BROADCAST_CONNECTION=reverb`, mount `backend-storage`, dan tanpa YAML anchor.
- [x] **0B.2.1** Tambahkan proxy WebSocket `location /app` ke `http://reverb:8080` di `deploy/nginx-backend.conf`.
- [x] **0B.2.2** Tambahkan `ARG NEXT_PUBLIC_REVERB_APP_KEY` di `frontend/Dockerfile` dan pasang `laravel-echo` + `pusher-js` di `frontend`.
- [x] **0B.2.3** Konfigurasi `withBroadcasting` dengan prefix `/api` & `auth:sanctum` di `backend/bootstrap/app.php` serta otorisasi channel granular di `backend/routes/channels.php`.
- [ ] **0B.3** Rotasi secret sesuai urutan design §9 (DB `ALTER USER` dulu, `APP_PREVIOUS_KEYS`, key RustFS). Ganti default di compose dengan `${VAR:?wajib}` saat deploy Dokploy.
- [ ] **0B.4** Audit policy bucket `bksda`: anonymous `GetObject` boleh, `ListBucket` ditolak.
- [ ] **0B.5** Monitoring: `QueueHeartbeat`, cek reverb, cek `failed_jobs`, cek disk 80%.

**AC**: `migrate` sukses di produksi; 4 service `Up`; `docker kill` pada `queue` → container kembali sendiri; job uji diproses < 5 detik; aplikasi login normal setelah rotasi secret; listing bucket `bksda` 403.
**Self-check**: `php artisan app:self-check-foundation` — dispatch job yang menulis cache, tunggu sampai 10 detik, assert nilainya ada, dan assert `CACHE_STORE`/`QUEUE_CONNECTION` = `database`.
**Rollback**: `QUEUE_CONNECTION=sync` + compose lama (tag git). Rotasi DB: `ALTER USER` kembali ke password lama.

---

## Fase 1A — WebSocket & Notifikasi Real-Time
- [x] **1A.1** `composer require laravel/reverb`; `install:broadcasting --reverb`; `withBroadcasting` prefix `api` + `auth:sanctum` (design §4).
- [x] **1A.2** `routes/channels.php` memakai `hasPermission("{$module}.view")`.
- [x] **1A.3** Event `PortalNotificationCreated` (ShouldBroadcast) + `$dispatchesEvents` di model `PortalNotification`.
- [x] **1A.4** Event `AdminInboxChanged($module)` (payload minimal) dipanggil saat ST/Cuti/BMN diajukan atau diproses.
- [x] **1A.5** nginx `location /app` (design §2), `ARG NEXT_PUBLIC_REVERB_APP_KEY` di `frontend/Dockerfile`.
- [x] **1A.6** Frontend: `laravel-echo` + `pusher-js`, helper `echo.ts`; lonceng, toast, dan refetch inbox (`useAdminInboxLive`). Kalau WS gagal → tidak ada error di UI.

**AC**: notifikasi muncul tanpa reload dengan p95 < 2 detik (10 percobaan lewat Cloudflare); admin BMN mendapat 403 saat subscribe `admin.inbox.kepegawaian`; admin `kepegawaian` bisa subscribe `admin.inbox.surat_tugas`; mematikan `reverb` tidak merusak halaman mana pun.
**Self-check**: `backend/tests/Feature/BroadcastChannelAuthTest.php` — matriks user DB nyata (super_admin, admin kepegawaian, user bmn, user biasa) × 3 modul (TERVERIFIKASI LULUS).
**Rollback**: `BROADCAST_CONNECTION=null`; frontend tidak menginisialisasi Echo jika `NEXT_PUBLIC_REVERB_APP_KEY` kosong.

---

## Fase 1B — Verifikasi Email, Lupa Password, Mailer
- [x] **1B.1** DNS `notif.<domain>`: Resend + Brevo (SPF, DKIM), DMARC `p=none`, Cloudflare Email Routing.
- [x] **1B.2** `config/mail.php` failover `resend_smtp → brevo_smtp → log` (design §6.1).
- [x] **1B.3** Migrasi `email_logs` + `notification_settings` (toggle per event + master switch). Listener `MessageSent`/`MessageFailed`.
- [x] **1B.4** `User::hasDeliverableEmail()`; `PUT /api/me/email` (wajib `current_password`, unik, pemberitahuan ke email lama); route `verification.verify` signed → redirect frontend.
- [x] **1B.5** Banner "Hubungkan Gmail" di Portal; admin bisa mengubah email pegawai.
- [x] **1B.6** `forgot-password` / `reset-password` + `ResetPassword::createUrlUsing` + halaman frontend `/forgot-password`, `/reset-password`.
- [x] **1B.7** Security alert saat ganti/reset password.
- [x] **1B.8** Notification mail untuk 3 kategori D4 (`via()` → `['mail']` atau `[]`).
- [x] **1B.9** Webhook Resend + verifikasi Svix.
- [x] **1B.10** Tab Pengaturan "Email": toggle, hitungan harian per mailer, log, tombol test.

**AC**: user `@bksda.local` atau belum terverifikasi → 0 email terkirim; Gmail terverifikasi menerima reset password dan link-nya membuka halaman frontend; mengganti `RESEND_API_KEY` dengan nilai salah → email tetap terkirim lewat Brevo dengan `From: noreply@notif.<domain>`; webhook dengan signature salah → 401; mail-tester.com skor ≥ 9/10.
**Self-check**: `backend/tests/Feature/EmailSecurityTest.php` — `Notification::fake()`: guard `.local`/unverified, anti-enumeration (respons identik), ganti email tanpa password ditolak, signature webhook valid/invalid (TERVERIFIKASI LULUS).
**Rollback**: master switch `email_enabled = false` (satu klik). Fitur akun tetap jalan lewat reset oleh admin.

---

## Fase 1C — Paksa Ganti Password, Reset Admin, 2FA
- [x] **1C.1** Migrasi kolom `must_change_password`, `two_factor_*` (design §5.1).
- [x] **1C.2** Middleware `EnsureAccountSecure` (423 + allowlist) di grup `auth:sanctum`; frontend menangani 423 dengan redirect.
- [x] **1C.3** `EmployeeController::resetPassword` mode A (password acak tampil sekali) / mode B (link reset).
- [x] **1C.4** Engine RFC 6238 TOTP pure PHP; endpoint enable/confirm/disable, recovery code (hash), anti-replay.
- [x] **1C.5** Login dua langkah dengan challenge di cache database (design §5.5); input 2FA di halaman login + modal setup (QR `react-qr-code`).
- [x] **1C.6** Super admin reset 2FA pegawai (`DELETE /api/kepegawaian/employees/{id}/2fa`).
- [x] **1C.7** Panduan ringkas 2FA dan alur reset admin siap.

**AC**: setelah reset admin, pegawai hanya bisa membuka halaman ganti password; admin tanpa 2FA dipaksa setup; login dengan 2FA tanpa kode → tidak dapat token; recovery code hanya bisa dipakai sekali; kode TOTP yang sama ditolak saat dipakai kedua kali; brute force challenge terkena throttle.
**Self-check**: `backend/tests/Feature/TwoFactorTest.php` — generate secret, hitung TOTP, login 2 langkah sukses, replay ditolak, recovery sekali pakai, 423 untuk `must_change_password` (TERVERIFIKASI LULUS).
**Rollback**: env `TWO_FACTOR_ENFORCE=false` mematikan kewajiban untuk admin (2FA yang sudah aktif tetap berjalan). Super admin bisa reset 2FA siapa pun.

---

## Fase 2 — BKSDA Drive MVP
- [x] **2.0 SPIKE (wajib lolos dulu, 1 hari)**: pada versi RustFS yang di-pin, buktikan lewat Cloudflare Tunnel: presigned PUT dari browser, multipart presigned 3 part + complete, CORS (expose `ETag`), dan GET dengan `ResponseContentDisposition`. Kalau ada yang gagal → putuskan dulu (Transform Rule / ganti versi) sebelum lanjut.
- [x] **2.1** Disk `drive` + `drive_signer`; command buat bucket `bksda-drive` (private) + CORS.
- [x] **2.2** Migrasi `drive_units` (seed 9 unit D7), `drive_unit_members`, `drive_folders`, `drive_files` (`s3_key` relatif, `size`, `mime`, `source_module`, `source_id` unique, `deleted_at`), `drive_uploads` (reservasi), kolom `users.drive_quota_bytes` (default 5 GB).
- [x] **2.3** `DriveAccess::unitRole()` (design §7.4) + policy folder/file.
- [x] **2.4** `DriveController`: folder CRUD, list per ruang, cari, rename, pindah, bintang, sampah/pulihkan.
- [x] **2.5** Upload `init` (cek izin + reservasi kuota + soft cap disk) / `complete` (HEAD + finfo + ukuran ≤ deklarasi).
- [x] **2.6** Endpoint URL unduh/preview (inline vs attachment).
- [x] **2.7** Job terjadwal: cleanup `drive_uploads` kedaluwarsa (per jam), purge sampah 30 hari (harian).
- [x] **2.8** Frontend `/drive`: sidebar ruang, indikator kuota, uploader drag-and-drop (multipart, paralel 3, retry per part), preview PDF/gambar/video, kelola anggota unit (manager).
- [x] **2.9** Kartu "BKSDA Drive" di Portal dan Module Switcher.

**AC**: PDF 2 MB dan video 1 GB berhasil diunggah lewat Cloudflare (video bisa dilanjutkan setelah koneksi diputus); objek tanpa presigned URL → 403; pegawai SKW I tidak bisa melihat `skw-2-tenggarong`; `.html` yang diganti nama jadi `.pdf` ditolak; upload melebihi kuota ditolak di `init`; upload yang ditinggal hilang dalam ≤ 25 jam; mengganti `STORAGE_PUBLIC_ENDPOINT` mengubah host URL tanpa mengubah DB.
**Self-check**: `backend/tests/Feature/DriveTest.php` — host URL `drive_signer`, matriks `unitRole` (user DB nyata dari tiap satuan kerja), reservasi kuota, deteksi MIME palsu, cleanup reservasi kedaluwarsa (TERVERIFIKASI LULUS).
**Rollback**: sembunyikan modul `drive` dari Module Switcher/`RouteGuard`. Tabel `drive_*` dan bucket terisolasi.

---

## Fase 3 — Berbagi
- [x] **3.1** Migrasi `drive_shares` (internal: user/unit + role; publik: token 32 byte acak, `expires_at`, `password_hash`, `download_count`).
- [x] **3.2** `DriveShareController` + halaman publik `/drive/s/[token]` dengan header `X-Robots-Tag: noindex, nofollow`, `throttle:10,1` untuk password, dan pemilik bisa mencabut link.

**AC**: link kedaluwarsa/dicabut → 404; password salah 10x → 429; header noindex ada; share internal muncul di "Dibagikan ke saya".
**Self-check**: `backend/tests/Feature/DriveShareTest.php` (TERVERIFIKASI LULUS).
**Rollback**: env `DRIVE_PUBLIC_SHARE=false` menonaktifkan route publik.

---

## Fase 4 — Auto-Archive
- [x] **4.1** Job `ArchiveOfficialDocument` (design §7.5) dengan stream copy lintas disk `local`/`s3` dan `firstOrCreate` pada `(source_module, source_id)`.
- [x] **4.2** Dispatch saat scan ST diunggah, SK/Izin Cuti TTE terbit, dokumen BMN final disimpan.
- [x] **4.3** Command `drive:backfill-archive` untuk dokumen lama (idempoten, bisa diulang).

**AC**: dokumen yang sama diproses 2x → tetap 1 baris; menghapus berkas asli di `bksda` tidak menghapus arsip; kalau RustFS dimatikan, persetujuan cuti tetap sukses dan job masuk `failed_jobs` + alert.
**Self-check**: `backend/tests/Feature/AutoArchiveTest.php` — `Storage::fake('local')`, `Storage::fake('drive')`, idempotensi (TERVERIFIKASI LULUS).
**Rollback**: hapus dispatch (1 baris per modul). Arsip yang sudah tersalin tetap aman.

---

## Fase 5 — Pindah Domain (saat `bksdakaltim.id` siap)
- [ ] Jalankan runbook design §11. **AC**: login, upload, unduh, WebSocket, email (mail-tester ≥ 9) berjalan di `.id`; link `.web.id` lama ter-redirect 301.

---

## Rekomendasi Terpisah (di luar scope)
- Upgrade Proxmox VE 7.4 → 8.x (7.4 EOL sejak Juli 2024). Jalankan **setelah** 0A selesai dan restore sudah teruji.
