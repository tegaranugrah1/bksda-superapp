# Rencana Strategis Migrasi Infrastruktur BKSDA SuperApp
## Dari AWS EC2 & Mini Server ke Server Proxmox Utama (`192.168.100.11`)

> **Dokumen Disusun**: 27 Oktober 2026  
> **Status**: Perencanaan Disetujui (Siap Eksekusi)  
> **Target Domain**: `bksdakaltim.net` & Ekosistem Multi-Subdomain (`portal.`, `bmn.`, `drive.`, `mail.`, `storage.`)  
> **Repository GitHub**: [`tegaranugrah1/bksda-superapp`](https://github.com/tegaranugrah1/bksda-superapp)

---

## 1. Latar Belakang & Analisis Kondisi Infrastruktur

### 1.1 Kondisi Server Saat Ini

1. **Server Utama (Proxmox VE - `192.168.100.11:8006`)**:
   - **Hardware**: Intel Xeon E3-1230 v6 @ 3.50GHz (8 vCPU / Threads).
   - **RAM**: 64 GB (Terpakai: 17.38 GB / **Sisa Bebas: ~45.36 GB / 72.3%**).
   - **Penyimpanan**: LVM-Thin `local-lvm` sebesar 1.71 TB (Terpakai: 142 GB / **Sisa Bebas: ~1.57 TB / 91.7%**).
   - **Beban Sistem**: CPU rata-rata < 0.5% (sangat dingin dan stabil).
   - **VM Berjalan**: VM 100 (Ubuntu24), VM 102 (P2), VM 103 (Central-Server 192.168.100.182), VM 104 (BKSDA-DReport 192.168.100.187), CT 101, CT 105.
   - **Kesimpulan**: Memiliki kapasitas komputasi, memori, dan storage yang **sangat berlebih** untuk menjadi host tunggal seluruh layanan BKSDA SuperApp.

2. **Mini Server Lama (Proxmox VE - `192.168.100.141:8006`)**:
   - **Hostname**: `proxmoxtegar`
   - **Hardware**: RAM hanya 3.7 GB (Terpakai 3.1 GB / **Kritis > 83%**).
   - **VM 100 (`bksda-server` / `192.168.100.151`)**: Menjalankan Dokploy port 3000 dan staging port 8080 dengan disk 35 GB.
   - **Kesimpulan**: Harus segera dimigrasikan ke Server Utama `192.168.100.11` untuk mencegah kegagalan Out-of-Memory (OOM).

3. **Server File Sharing & Backup (`192.168.100.12`)**:
   - Menjalankan Apache (D-Report) serta layanan sharing FreeNAS/Ubuntu.
   - Siap dihubungkan via NFS/SMB sebagai media cold storage/backup otomatis untuk Proxmox dan Nextcloud Drive.

4. **Server Live Saat Ini (AWS EC2 - `15.134.31.68`)**:
   - Menjalankan aplikasi aktif `bksdakaltim.net`.
   - Menyimpan seluruh data produksi: Database PostgreSQL aktif dan berkas fisik Object Storage **RustFS** (foto BMN, dokumen BPKB/STNK, PDF cuti, surat tugas).

5. **Topologi Jaringan Terpasang**:
   - `zt.bksdakaltim.id`: ZeroTier Network Controller internal (akses penuh).
   - `central-server` (`192.168.100.182`): Nginx reverse proxy internal.
   - `bksda-dreport` (`192.168.100.187:8080`): Aplikasi D-Report terhubung ke ZeroTier / Cloudflare.

---

## 2. Tujuan & Sasaran Arsitektur Baru

1. **Konsolidasi Infrastruktur**: Memusatkan deployment production BKSDA SuperApp ke Server Proxmox Utama `192.168.100.11` dan memensiunkan mini server `192.168.100.141`.
2. **PaaS Modern dengan Dokploy**: Menggunakan Dokploy untuk mengelola lifecycle container Docker, auto-SSL, dan reverse proxy Traefik.
3. **CI/CD Otomatis Berbasis GitHub**: Setiap `git push` atau merge ke branch `main` di `tegaranugrah1/bksda-superapp` otomatis memicu build dan zero-downtime deployment di Proxmox.
4. **Penyatuan Multi-Subdomain Terpadu**:
   - `portal.bksdakaltim.net` ➔ Workspace Utama Pegawai, Cuti, & Surat Tugas.
   - `bmn.bksdakaltim.net` ➔ Modul Khusus Inventaris, Ruangan, Aset, & Lelang BMN.
   - `drive.bksdakaltim.net` ➔ Private Cloud Drive (Nextcloud) tersambung ke FreeNAS (`192.168.100.12`).
   - `mail.bksdakaltim.net` ➔ Webmail & Mail Server internal untuk notifikasi transaksional cuti/ST.
   - `storage.bksdakaltim.net` ➔ Endpoint S3 RustFS Object Storage.
5. **Laravel Reverb (Realtime WebSockets)**: Notifikasi instan tanpa reload browser untuk update cuti, disposisi surat tugas, dan tracking lelang BMN.
6. **Migrasi RustFS Utuh (Zero Broken Links)**: Menjamin 100% foto BMN dan berkas PDF dari AWS EC2 berpindah mulus tanpa ada gambar atau tautan rusak.
7. **Single Sign-On (SSO)**: Satu kali login di portal otomatis aktif di seluruh keluarga subdomain `.bksdakaltim.net`.
8. **Akses Publik Tanpa Buka Port Router**: Menggunakan **Cloudflare Tunnel Wildcard (`*.bksdakaltim.net`)** dengan redundansi ZeroTier VPN.

---

## 3. Desain Topologi Arsitektur

```
                                [ Pengguna Publik & Staf Lapangan ]
                                                 │
                         ┌───────────────────────┴───────────────────────┐
                         ▼                                               ▼
            [ Cloudflare Tunnel (*.bksdakaltim.net) ]          [ ZeroTier Network ]
                   (Auto SSL, Anti-DDoS, WAF)                   (zt.bksdakaltim.id)
                         │                                               │
                         └───────────────────────┬───────────────────────┘
                                                 ▼
             ┌─────────────────────────────────────────────────────────────────────────┐
             │            SERVER PROXMOX UTAMA (192.168.100.11)                        │
             │       Xeon E3-1230 v6 (8 Threads) | 64GB RAM | 1.71TB LVM-Thin          │
             │                                                                         │
             │   ┌─────────────────────────────────────────────────────────────────┐   │
             │   │  VM BARU: "bksda-superapp-production" (Ubuntu 24.04 LTS)        │   │
             │   │  IP: 192.168.100.150 | 4 vCPU | 16 GB RAM | 250 GB Disk        │   │
             │   │                                                                 │   │
             │   │   [ DOKPLOY TRAEFIK REVERSE PROXY & EDGE ROUTER ]               │   │
             │   │       │                                                         │   │
             │   │       ├─► [portal.bksdakaltim.net] ──► Next.js Frontend (P3000) │   │
             │   │       ├─► [bmn.bksdakaltim.net]    ──► Next.js BMN Subpath      │   │
             │   │       ├─► [api.bksdakaltim.net]    ──► Laravel API (P80/FPM)    │   │
             │   │       ├─► [ws.bksdakaltim.net]     ──► Laravel Reverb (P8080)   │   │
             │   │       ├─► [storage.bksdakaltim.net]──► RustFS S3 API (P9000)    │   │
             │   │       ├─► [drive.bksdakaltim.net]  ──► Nextcloud (FreeNAS disk) │   │
             │   │       └─► [mail.bksdakaltim.net]   ──► Stalwart Webmail         │   │
             │   │                                                                 │   │
             │   │   [ DOCKER INTERNAL SERVICES ]                                  │   │
             │   │   - Database: PostgreSQL 16 (Volume: db-data)                   │   │
             │   │   - Cache / Queue: Redis 7 (Volume: redis-data)                 │   │
             │   │   - Storage: RustFS Container (Volume: rustfs-data)             │   │
             │   │   - Queue Worker: php artisan queue:work (Email & Jobs)         │   │
             │   └─────────────────────────────────────────────────────────────────┘   │
             │                                                                         │
             │   (VM Lain Tetap Berjalan Normal: Central-Server, D-Report, P2)         │
             └─────────────────────────────────────────────────────────────────────────┘
                                                 │
                                                 ▼ (NFS / SMB Auto Backup)
                             ┌───────────────────────────────────────┐
                             │    FREENAS SERVER (192.168.100.12)    │
                             │  - Cold Storage & Harian Backup       │
                             │  - Storage Disk Eksternal Nextcloud   │
                             └───────────────────────────────────────┘
```

---

## 4. Rincian Teknis & Alur Eksekusi Migrasi

### Tahap 1: Pembuatan VM Baru di Proxmox Utama (`192.168.100.11`)

* **Template VM**:
  - **Node**: `pve`
  - **VMID**: `106` (atau nomor urut kosong berikutnya).
  - **Nama**: `bksda-superapp-production`
  - **OS**: Ubuntu Server 24.04 LTS (menggunakan ISO `ubuntu-24.04.3-live-server-amd64.iso` di storage `local`).
  - **vCPU**: 4 Cores (Type: `host`).
  - **RAM**: 16,384 MB (16 GB) dengan ballooning minimal 8 GB.
  - **Disk**: 250 GB di storage `local-lvm` (LVM-Thin).
  - **Network**: Bridge `vmbr0`, Model `virtio`, Firewall `1`.
  - **IP Statis**: `192.168.100.150/24`, Gateway: `192.168.100.1`, DNS: `1.1.1.1, 8.8.8.8`.
  - **QEMU Guest Agent**: Diaktifkan (`apt install -y qemu-guest-agent`).

### Tahap 2: Instalasi Dokploy & Konfigurasi Lingkungan

1. Di dalam VM Ubuntu baru, jalankan instalasi resmi Dokploy:
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -sSL https://dokploy.com/install.sh | sh
   ```
2. Buka dashboard Dokploy di `http://192.168.100.150:3000` dan buat akun Administrator.
3. Hubungkan akun GitHub `tegaranugrah1`:
   - Buka **Settings ➔ Git Providers ➔ GitHub**.
   - Hubungkan via GitHub App atau Personal Access Token (PAT) dengan akses `repo`.

### Tahap 3: Migrasi Data Riil Live (PostgreSQL & RustFS)

#### A. Ekstraksi dari Server Live AWS EC2 (`15.134.31.68`)
1. **Dump Database PostgreSQL**:
   ```bash
   docker exec -t bksda-db pg_dump -U bksda_prod -d bksda_superapp -F c -b -v -f /tmp/bksda_db_live.dump
   ```
2. **Arsipkan Seluruh Berkas RustFS**:
   ```bash
   docker run --rm -v bksda_rustfs-data:/data -v /tmp:/backup alpine \
     tar -czvf /backup/rustfs_bksda_live.tar.gz -C /data .
   ```
3. **Kirim Berkas ke VM Baru**:
   ```bash
   scp -i bksda-superapp.pem /tmp/bksda_db_live.dump user@192.168.100.150:/home/user/
   scp -i bksda-superapp.pem /tmp/rustfs_bksda_live.tar.gz user@192.168.100.150:/home/user/
   ```

#### B. Restore di VM Dokploy Proxmox
1. **Restore Volume RustFS**:
   ```bash
   docker volume create bksda_rustfs-data
   docker run --rm -v bksda_rustfs-data:/data -v /home/user:/backup alpine \
     sh -c "tar -xzvf /backup/rustfs_bksda_live.tar.gz -C /data && chown -R 1000:1000 /data"
   ```
2. **Restore Database PostgreSQL**:
   ```bash
   docker exec -i bksda-db pg_restore -U bksda_prod -d bksda_superapp -v --clean /tmp/bksda_db_live.dump
   ```

### Tahap 4: Konfigurasi Laravel Reverb & Background Workers

1. **Install Package Reverb di Backend**:
   ```bash
   composer require laravel/reverb
   php artisan reverb:install
   ```
2. **Pengaturan `.env` Backend Production**:
   ```env
   BROADCAST_CONNECTION=reverb
   QUEUE_CONNECTION=redis

   REVERB_APP_ID=bksda-superapp
   REVERB_APP_KEY=bksda-reverb-prod-2026
   REVERB_APP_SECRET=bksda-reverb-secret-prod-2026
   REVERB_HOST="ws.bksdakaltim.net"
   REVERB_PORT=443
   REVERB_SCHEME=https

   SESSION_DOMAIN=.bksdakaltim.net
   SANCTUM_STATEFUL_DOMAINS=portal.bksdakaltim.net,bmn.bksdakaltim.net,bksdakaltim.net,api.bksdakaltim.net
   ```
3. **Supervisor / Container Reverb & Queue Worker**:
   - Service Reverb: `php artisan reverb:start --host=0.0.0.0 --port=8080`
   - Service Worker: `php artisan queue:work redis --sleep=3 --tries=3 --max-time=3600`

### Tahap 5: Setup Cloudflare Tunnel Wildcard (`*.bksdakaltim.net`)

1. Di akun Cloudflare domain `bksdakaltim.net`, buat Cloudflare Tunnel (nama: `bksda-proxmox-tunnel`).
2. Install service `cloudflared` di VM Dokploy `192.168.100.150`.
3. Tambahkan Public Hostname di Cloudflare Zero Trust:
   - `portal.bksdakaltim.net` ➔ `http://localhost:80` (Traefik)
   - `bmn.bksdakaltim.net`    ➔ `http://localhost:80` (Traefik)
   - `api.bksdakaltim.net`    ➔ `http://localhost:80` (Traefik)
   - `ws.bksdakaltim.net`     ➔ `http://localhost:8080` (Reverb WebSocket)
   - `storage.bksdakaltim.net`➔ `http://localhost:9000` (RustFS S3 API)
   - `drive.bksdakaltim.net`  ➔ `http://localhost:80` (Nextcloud via Traefik)
   - `mail.bksdakaltim.net`   ➔ `http://localhost:80` (Webmail via Traefik)

### Tahap 6: Integrasi Drive (Nextcloud) & Mail Server

1. **Mounting Storage FreeNAS (`192.168.100.12`)**:
   - Di VM Dokploy: pasang direktori NFS dari FreeNAS ke `/mnt/freenas-storage`.
   - Nextcloud diarahkan menyimpan berkas unggahan pegawai ke `/mnt/freenas-storage/nextcloud-data`.
2. **Mail Server**:
   - Deploy container **Stalwart Mail** atau **docker-mailserver** di Dokploy.
   - Konfigurasikan relay SMTP resmi agar email notifikasi pengajuan cuti dan penugasan surat tugas memiliki reputasi pengiriman 100% masuk ke inbox.

### Tahap 7: Pensiun Mini Server (`192.168.100.141`)

1. Setelah semua rute domain aktif dan pengujian visual lulus, lakukan smoke test menyeluruh:
   - Login pegawai di `portal.bksdakaltim.net`.
   - Buka detail aset BMN di `bmn.bksdakaltim.net` (pastikan foto geotag dan fisik muncul).
   - Buat pengajuan cuti & verifikasi event realtime via Reverb.
   - Download berkas PDF & pastikan streaming RustFS berjalan cepat.
2. Shutdown VM 100 di mini server `192.168.100.141`.
3. Server utama `192.168.100.11` resmi menjadi satu-satunya pusat komputasi privat BKSDA Kaltim.

---

## 5. Matriks Verifikasi & Pengujian Pasca Migrasi

| Komponen | Item Pengujian | Tolok Ukur Keberhasilan |
|---|---|---|
| **Frontend** | Akses `portal.` & `bmn.bksdakaltim.net` | HTTP 200, bebas error TypeScript, layout rapi |
| **Auth / SSO** | Login di portal, buka tab BMN | Tetap terautentikasi tanpa harus login ulang |
| **RustFS** | Load foto aset BMN & scan berkas | Foto terbuka normal, HTTP 200, zero broken images |
| **WebSockets** | Pembaruan status di modal pengajuan | Event diterima seketika (< 1 detik) tanpa refresh |
| **CI/CD** | `git push` commit kecil ke `main` | Dokploy otomatis rebuild & deploy tanpa intervensi manual |
| **Mail** | Kirim surat izin cuti / notifikasi | Email masuk ke inbox penerima |
| **Backup** | Snapshot cron database & RustFS | Berkas cadangan terkirim utuh ke FreeNAS `192.168.100.12` |

---

*Dokumen ini menjadi acuan baku dalam setiap langkah teknis migrasi infrastruktur BKSDA SuperApp.*
