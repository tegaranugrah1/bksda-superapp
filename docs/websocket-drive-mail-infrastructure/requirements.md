# Requirements v3: WebSocket Real-Time (Laravel Reverb), BKSDA Drive (RustFS), Email & Keamanan Akun, Backup

> **Status**: v3.0 — revisi setelah review jujur v2 (skor 6/10, 30 temuan). Semua fakta di bawah diverifikasi ke kode, DB lokal, dan Proxmox API.
> **Dokumen terkait**: [design.md](file:///e:/bksda-superapp/docs/websocket-drive-mail-infrastructure/design.md) | [tasks.md](file:///e:/bksda-superapp/docs/websocket-drive-mail-infrastructure/tasks.md)
> **Target**: Proxmox `pve` (`192.168.100.11`) → VM 106 (`192.168.100.203`, Dokploy)

---

## 1. Baseline Nyata (Hasil Audit)

### 1.1. Hardware Proxmox `192.168.100.11`
| Komponen | Kondisi |
|---|---|
| Host | 8 core, 64 GB RAM (~45 GB bebas), **Proxmox VE 7.4 (EOL sejak Juli 2024, tidak ada update keamanan)** |
| `/dev/sda` 2 TB HDD | `local-lvm`, ~1,65 TB kosong. VM 106: 500 GB disk (~455 GB kosong), 16 GB RAM |
| `/dev/sdb` 2 TB HDD | **Kosong, dikonfirmasi boleh dipakai** → datastore Proxmox Backup Server |
| `/dev/sdc` 2 TB USB SSD Kingston | Partisi lama, **dikonfirmasi kosong & boleh diformat** → datastore PBS kedua (salinan) |

### 1.2. Codebase & Data
| Fakta | Bukti | Implikasi |
|---|---|---|
| Laravel 13, Sanctum bearer token | `composer.json`, `AuthController::login` (`createToken`) | Auth WebSocket wajib `auth:sanctum` + header Bearer |
| Login menghapus semua token (1 sesi/user) | `AuthController.php:43` | "Cabut sesi lain" sudah terjadi saat login baru |
| Notifikasi portal memakai tabel **`portal_notifications`** | `PortalNotificationService`, migrasi `2026_10_28_140000` | **Jangan** pakai channel `database` bawaan Laravel (tabel `notifications` → inbox ganda) |
| Hak akses: `role` + `access_modules` + `permissions` granular, lewat `User::hasPermission()` | `User.php:86-135` | Otorisasi channel & Drive **memakai ulang** `hasPermission()` |
| Admin Surat Tugas memakai modul `kepegawaian`; `surat` = modul **Persuratan** (beda); `surat_tugas` hanya dimiliki 1 user | DB `users.access_modules`, `EmployeeAccessSheet.tsx:45` | Jangan cek `in_array('surat_tugas')` langsung |
| 152/154 user ber-email `@bksda.local` | DB `users` | Email hanya untuk alamat terverifikasi; pegawai mengisi menyusul |
| Satuan kerja: SKW I **Berau** (30), SKW II **Tenggarong** (47), SKW III **Balikpapan** (40), **Kantor Balai** (34) | DB `kpg_employees` + `Employee::getSeksiWilayahAttribute()` | Kantor Balai = `seksi_wilayah null` |
| Tabel `jobs`, `failed_jobs`, `cache` belum ada; `QUEUE_CONNECTION=sync`, `CACHE_STORE=file` | migrasi, `docker-compose.dokploy.yml:64-65` | Wajib dibuat sebelum queue/multi-container |
| Backend + nginx dijalankan dengan `&` di 1 container | `docker-compose.dokploy.yml:31-35` | Pisah service + healthcheck |
| Secret default ter-commit (`APP_KEY`, `DB_PASSWORD`) | `docker-compose.dokploy.yml:8,48` | Rotasi dengan prosedur aman (lihat design §9) |
| `rustfs/rustfs:latest` (tidak di-pin, pre-1.0) | compose | Pin versi + spike sebelum Drive |
| Image backend tidak punya `pg_dump` | `backend/Dockerfile` | Dump dari container `db` |
| Scan cuti di disk `local` (volume `backend-storage`), ST/BMN di `s3` | `EmployeeLeaveController.php` | Backup & auto-archive harus mencakup keduanya |
| `react-qr-code` sudah terpasang di frontend | `frontend/package.json` | QR 2FA dirender di frontend, backend tidak perlu lib QR |
| `MAIL_MAILER=log` default; blok `resend` & `failover` sudah ada | `config/mail.php` | Cukup ubah konfigurasi |

---

## 2. Keputusan Terkunci

| # | Topik | Keputusan |
|---|---|---|
| D1 | Lokasi | Semua di VM 106, tanpa VM baru |
| D2 | Email primer | **Resend** via SMTP (`smtp.resend.com`), 100/hari, 3.000/bulan, pengirim `noreply@notif.<domain>` |
| D3 | Email cadangan | **Brevo** via SMTP relay (300/hari), pengirim sama `noreply@notif.<domain>` dengan DKIM domain sendiri |
| D4 | Kebijakan email | Selektif: (1) keamanan akun, (2) ringkasan pengajuan baru ke admin, (3) dokumen final ke pegawai. Toggle per event. Selebihnya cukup notifikasi Portal + WebSocket |
| D5 | 2FA | **Hanya TOTP + 8 recovery code (di-hash)**. **Wajib** untuk `admin` & `super_admin`, opsional untuk pegawai. **Tanpa OTP email** |
| D6 | Reset oleh admin | Password acak ditampilkan **sekali** di layar admin + `must_change_password`; jika Gmail terverifikasi, admin bisa memilih kirim **link reset** (bukan password) |
| D7 | Drive Bersama | Otomatis: `skw-1-berau`, `skw-2-tenggarong`, `skw-3-balikpapan`, `kantor-balai`. Manual via `drive_unit_members`: `subbag-tu`, `seksi-p3`, `seksi-pp`, `keuangan`, `tim-folu` |
| D8 | Backup VM | **Proxmox Backup Server** di `/dev/sdb` (dedup + inkremental), salinan ke `/dev/sdc` |
| D9 | Offsite | **Google Drive 2 TB akun kantor** lewat `rclone crypt` (terenkripsi, OAuth scope `drive.file`). Karena kapasitasnya 2 TB, isinya: DB dump, scan cuti, **seluruh** bucket `bksda` dan `bksda-drive` (termasuk Drive pribadi) |
| D10 | Domain | Sekarang `bksdakaltim.web.id`, nanti `bksdakaltim.id`. DB hanya menyimpan path relatif; pindah domain mengikuti runbook (design §10) |
| D11 | Webmail pegawai | Ditunda (bukan scope dokumen ini) |
| D12 | Presence di ST Builder | Ditunda |

---

## 3. Kebutuhan Fungsional

### 3.1. Notifikasi Terpadu (`FR-NOTIF`)
- **FR-NOTIF-01**: `PortalNotificationService` tetap **satu-satunya pintu** pembuatan notifikasi. Setiap notifikasi yang tersimpan di `portal_notifications` otomatis dipancarkan lewat WebSocket ke pemiliknya.
- **FR-NOTIF-02**: Email dikirim hanya jika: event diaktifkan di Pengaturan Admin **dan** penerima punya email terverifikasi yang bukan `*.local`.
- **FR-NOTIF-03**: Master switch `email_enabled` mematikan semua email tanpa memengaruhi notifikasi Portal.

### 3.2. WebSocket (`FR-WS`)
- **FR-WS-01**: Channel `private-App.Models.User.{id}` hanya untuk pemilik akun.
- **FR-WS-02**: Channel `private-admin.inbox.{module}` (`surat_tugas`, `kepegawaian`, `bmn`) diotorisasi dengan `User::hasPermission("{module}.view")`. Admin BMN tidak boleh menerima event Kepegawaian/ST, dan sebaliknya.
- **FR-WS-03**: Lonceng, toast, dan badge inbox ter-update tanpa reload, **p95 < 2 detik** dari aksi ke layar.
- **FR-WS-04**: Kalau WebSocket putus, aplikasi tetap berfungsi (polling yang sudah ada/refresh manual). WebSocket adalah peningkatan, bukan ketergantungan.

### 3.3. Keamanan Akun (`FR-AUTH`)
- **FR-AUTH-01 (Verifikasi email)**: Pegawai mengisi Gmail di Portal. **Wajib memasukkan password saat ini.** Email harus unik. `email_verified_at` dikosongkan, link verifikasi bertanda tangan (24 jam) dikirim. Jika email lama sudah terverifikasi, kirim pemberitahuan ke email lama. Admin juga bisa mengubah email pegawai dari `/kepegawaian/employees`.
- **FR-AUTH-02 (Reset oleh admin)**: Sesuai D6. Semua token pegawai dicabut.
- **FR-AUTH-03 (Ganti password mandiri)**: Kirim email *security alert* (jika terverifikasi), hapus flag `must_change_password`, frontend mengarahkan ke login ulang karena semua token dicabut.
- **FR-AUTH-04 (Lupa password)**: `Password::sendResetLink()` bawaan Laravel, token 60 menit, `throttle:3,15`, respons sama baik email terdaftar maupun tidak (anti-enumeration). Link mengarah ke **frontend** `/reset-password`. Setelah reset, semua token dicabut. Jika 2FA aktif, login berikutnya tetap meminta TOTP.
- **FR-AUTH-05 (Paksa ganti password)**: Selama `must_change_password = true`, semua API ditolak `423` kecuali `GET /me`, `POST /me/change-password`, `POST /logout`.
- **FR-AUTH-06 (2FA TOTP)**: Sesuai D5. Login dua langkah: password benar → *challenge token* 5 menit (bukan auth token) → kode TOTP/recovery → auth token. `throttle:5,1` per challenge. Super admin bisa me-reset 2FA pegawai yang kehilangan HP (tercatat di audit log).

### 3.4. Email (`FR-MAIL`)
- **FR-MAIL-01**: Failover Laravel `resend_smtp → brevo_smtp → log`. Tanpa dependency baru.
- **FR-MAIL-02**: DNS subdomain `notif.<domain>`: SPF (Resend + Brevo), DKIM keduanya, DMARC mulai `p=none; rua=...`, naik ke `p=quarantine` setelah 2 minggu laporan bersih.
- **FR-MAIL-03**: Webhook `POST /api/webhooks/resend` **wajib verifikasi signature Svix**. Hard bounce/complaint → `email_verified_at = null` + notifikasi Portal ke pegawai untuk memperbarui email.
- **FR-MAIL-04**: Log kirim/gagal dari event `MessageSent`/`MessageFailed` ke `email_logs`; tampil di Pengaturan Admin beserta hitungan harian dan tombol "Test kirim".

### 3.5. BKSDA Drive (`FR-DRIVE`)
- **FR-DRIVE-01**: Bucket private `bksda-drive`. DB hanya menyimpan `s3_key` relatif.
- **FR-DRIVE-02**: Upload langsung browser → RustFS via presigned URL. ≤ 80 MB satu PUT (dengan `Content-Length` ditandatangani); > 80 MB multipart 25 MB/part (batas Cloudflare 100 MB/request).
- **FR-DRIVE-03**: Kuota dicek **dan direservasi saat `init`**, dikonfirmasi saat `complete` dengan ukuran asli (`HEAD`). Kuota pribadi default 5 GB; *global soft cap* 80% disk.
- **FR-DRIVE-04**: Ruang: Drive Saya, Drive Bersama (D7), Arsip Resmi (read-only), Berbintang, Sampah (purge otomatis 30 hari).
- **FR-DRIVE-05**: MIME diverifikasi dari *magic bytes* (`finfo`). Preview inline hanya PDF/JPEG/PNG/WEBP/MP4; selain itu dipaksa `attachment` + `application/octet-stream`.
- **FR-DRIVE-06**: Pembersihan terjadwal: multipart menggantung > 24 jam di-abort, objek tanpa baris `drive_files` > 24 jam dihapus.
- **FR-DRIVE-07**: Berbagi internal & link publik (`noindex`, kedaluwarsa, password bcrypt, `throttle:10,1`).
- **FR-DRIVE-08**: Auto-archive dokumen final ST/Cuti/BMN **disalin fisik** ke `bksda-drive`, idempoten `UNIQUE(source_module, source_id)`, gagal tidak memblokir alur persetujuan.

### 3.6. Backup & Monitoring (`FR-OPS`)
- **FR-OPS-01**: PBS di `/dev/sdb`, backup VM 106 harian 02:30 WITA, retensi `keep-daily=7, keep-weekly=4, keep-monthly=6`. Sync mingguan ke datastore `/dev/sdc`.
- **FR-OPS-02**: `pg_dump -Fc` harian 01:00 WITA dari container `db` + arsip volume `backend-storage`.
- **FR-OPS-03**: Offsite harian terenkripsi ke Google Drive 2 TB kantor (D9). Berkas yang terhapus/tertimpa di sumber dipindah ke folder `deleted/{tanggal}` (bukan langsung hilang) dan baru dibersihkan setelah 30 hari.
- **FR-OPS-04**: **Uji restore** bulanan: dump → DB sementara, 1 berkas Drive, 1 restore VM ke ID baru (triwulanan). Hasil dicatat.
- **FR-OPS-05**: Heartbeat queue tiap 5 menit, `healthcheck` compose untuk `queue`/`reverb`, alert ke super_admin (Portal + email) jika: heartbeat basi > 15 menit, `failed_jobs` bertambah, disk > 80%, backup gagal.

---

## 4. Kebutuhan Non-Fungsional
| Kode | Target |
|---|---|
| NFR-01 RPO | Data hilang maksimal 24 jam |
| NFR-02 RTO | Layanan pulih < 4 jam dari backup PBS |
| NFR-03 Latensi notifikasi | p95 < 2 detik |
| NFR-04 Upload | File 1 GB berhasil lewat Cloudflare dengan resume per part |
| NFR-05 Ketergantungan baru | Backend: `laravel/reverb`, `pragmarx/google2fa`. Frontend: `laravel-echo`, `pusher-js`. Tidak ada yang lain |

## 5. Di Luar Scope
- Webmail pegawai (Stalwart/SnappyMail), presence ST Builder, antivirus scan berkas (opsional nanti: ClamAV), upgrade Proxmox 7.4 → 8.x (direkomendasikan sebagai pekerjaan terpisah karena 7.4 sudah EOL).
