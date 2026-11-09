# Deployment Portal dan pemulihan Reverb — 9 November 2026

**Status: perubahan sudah di-merge dan diterapkan melalui Dokploy; runtime, DNS, queue heartbeat dan WSS publik lulus. Uji penerimaan notifikasi pada browser menunggu login ulang pengguna karena sesi lama mendapat 401 pada private-channel auth.** Status ini tidak menyatakan pengiriman browser telah lulus sebelum ada buktinya.

## Release dan cadangan

| Tahap | Bukti |
|---|---|
| Source perbaikan lifecycle | `f7f6b6a87b10efb0d78a75a9a698111613ac8834`; [laporan 31 skenario lokal](portal-notification-lifecycle-report-2026-11-09.md). |
| Startup deployment | `e112ecdf74e9662e8696df48ccab79b2de3da3c2`: hilangkan reseed akun pada setiap startup; hentikan startup jika migrasi gagal. |
| PR utama | [#599](https://github.com/tegaranugrah1/bksda-superapp/pull/599), merged ke `production-server` pada 10:16:25 WITA, merge `3de2ab8a6d95c5abf395a88eca237fe6c3652b43`. |
| Perbaikan cache hasil smoke test | `7cc01448f1cd3af9895e0448dce665ff97ed8178`; [PR #600](https://github.com/tegaranugrah1/bksda-superapp/pull/600), merged pada 10:38:33 WITA, merge `beccece020d9c9d92a6b4ba45fba33dfae6b6301`. |
| Orkestrasi | GitHub On Push autodeploy Dokploy yang sudah tersedia; panel menunjukkan hash yang tepat dan `Docker Compose Deployed`. Bukan `docker compose up` di luar Dokploy. |
| Server | Proxmox `192.168.100.11`, VM106 `192.168.100.203`, Compose `bksdasuperapp-bksdasuperapp-einhoc`, konfigurasi aktif `docker-compose.dokploy.yml`. |
| Backup sebelum merge/deploy | PostgreSQL custom-format, 2.662.323 byte, `pg_restore -l` berhasil; tidak melakukan restore. Arsip tetap di server, direktori `/etc/dokploy/compose/bksdasuperapp-bksdasuperapp-einhoc/predeploy-20261109T021452Z`. |
| SHA256 backup | `afc2958ebb2eca18e3569ab94dd254d73c4fe90bf24739b8fc38175cf1bb2530`. |

Tidak ada force push, penghapusan volume, reset database atau reseed akun. Dockerfile dan Compose sekarang tidak memanggil `SuperAdminSeeder` otomatis, karena seeder menggunakan update-or-create yang dapat mengganti kredensial akun lama. Bootstrap akun baru tetap tindakan administrator yang eksplisit.

## Masalah deployment yang ditemukan dan tindakan

1. **Reverb tidak dapat startup karena pcntl tidak terpasang.** Build produksi benar-benar memasang ekstensi tersebut dan guard native Reverb lulus saat build maupun pada container berjalan. Sebelum perbaikan, container restart ribuan kali dengan error `SIGINT`; sesudah rollout Reverb dapat melayani protokol WebSocket.
2. **Proxy Nginx masih memuat konfigurasi lama.** Source saat deploy memuat `/app`, tetapi hash file bind-mount pada container berbeda dan `nginx -T` hanya menunjukkan FastCGI tanpa route WebSocket. Container tersebut masih berjalan sejak 11 hari sebelumnya. Restart **hanya nginx-backend melalui menu Containers Dokploy** memuat konfigurasi yang benar; handshake publik berubah dari 404 menjadi event `pusher:connection_established`. Tidak mengubah key, TLS atau kontrol autentikasi.
3. **Cache heartbeat terpisah antarservice.** Backend, queue dan scheduler memakai APP_NAME berbeda; prefix cache default Laravel ikut berbeda. Log worker membuktikan QueueHeartbeat selesai, sementara backend membaca null. PR600 menetapkan CACHE_PREFIX yang sama pada backend/queue/scheduler/Reverb. Default `bksda-superapp-cache-` sengaja mempertahankan namespace backend yang sudah ada, termasuk lock/cache keamanan, tanpa flush cache.
4. **Sesi browser lama tidak dapat mengautentikasi private channel.** Sesudah WSS pulih, log proxy menunjukkan 101 untuk WebSocket tetapi 401 untuk `/api/broadcasting/auth`. Tidak membuat token baru, melonggarkan guard, atau menganggap handshake sebagai bukti notifikasi diterima. Pengguna diminta login ulang sebelum uji personal notification.

Perbedaan dari tes lokal dijelaskan oleh topologi deployment: fixture lokal memakai satu allowlist environment bagi proses-prosesnya dan proxy baru setiap run. Itu tidak membuktikan prefix Compose yang berbeda atau konfigurasi Nginx lama yang masih terikat pada inode sebelumnya. Smoke test deployment menambahkan bukti untuk keadaan yang benar-benar aktif.

## Pengujian sesudah deploy

| Pemeriksaan | Hasil yang diamati |
|---|---|
| Source server | Release kode sesuai merge PR600 `beccece0`; commit dokumentasi berikutnya tidak mengubah backend/frontend/Compose. |
| Build produksi | PHP dan frontend berhasil dibangun; guard signal native Reverb lulus. |
| Runtime Reverb | `pcntl=yes`, `SIGINT=yes`, server mendengar pada `0.0.0.0:8080`. |
| DNS backend | Nama `reverb` berhasil di-resolve. |
| API publik | `https://api.bksdakaltim.web.id/api/health` merespons 200 sesudah rollout. |
| Portal publik | `https://bksdakaltim.web.id/portal` merespons 200; UI versi baru dapat dimuat dengan sesi yang ada. Ini bukan bukti bearer lama sah untuk private channel. |
| WebSocket internal dan WSS publik | Client Node native dari container frontend menerima `pusher:connection_established` melalui `ws://reverb:8080` dan `wss://api.bksdakaltim.web.id`; koneksi uji segera ditutup. TLS tetap diverifikasi. |
| Queue setelah perbaikan cache | Heartbeat dikirim melalui native database queue pada 10:43:19 WITA. Pada 10:44:13 backend membaca heartbeat berumur 53 detik, pending jobs 0, signed Reverb API berhasil. |
| Private-channel browser | 401 pada sesi lama; login ulang diperlukan. Belum ada canary personal yang dikirim dan belum ada klaim penerimaan browser. |
| Stabilitas | Snapshot 10:43 dan 10:46 menunjukkan proses Reverb yang sama sejak 10:40:13, running dan restart count 0, bersama backend/queue/scheduler. Proses sudah berjalan lebih dari enam menit pada pemeriksaan kedua. |
| Startup check tambahan | Python stdlib/shell syntax dalam container network-none/read-only lulus: tidak reseed akun, fail pada migrasi gagal, dan empat service berbagi namespace cache. Tidak menjalankan migrasi atau aplikasi pada host. |

Tiga puluh satu skenario lokal dan angka 407 tes/4.745 assertions berasal dari pengujian sebelumnya, bukan dijalankan terhadap data produksi. Smoke test ini tidak membuat/menghapus ST, cuti atau loan nyata dan tidak mengulang pengujian destruktif di produksi. Tidak memakai akun/token dummy baru pada server. Satu notifikasi teknis bertanda deployment direncanakan hanya untuk akun yang sedang login setelah private subscription terverifikasi.

## Catatan job arsip yang terpisah

Pada 10:42:12 teramati tujuh failed job bertipe `ArchiveOfficialDocument`, kategori kegagalan menulis tujuan arsip Drive, sejak merge pertama. Log sesudahnya masih menunjukkan aktivitas arsip gagal; jumlah pada sistem live dapat bertambah. Ini bukan kegagalan broadcast notifikasi. Hanya tipe/kategori dan jumlah yang dibaca untuk diagnosis; isi dokumen, payload dan credential tidak disalin. Failed job tidak dihapus atau di-retry massal. Integrasi arsip Drive di luar lingkup pemulihan Reverb ini; status seluruh health monitor tidak boleh disebut bersih hanya karena Reverb dan heartbeat sudah pulih. Monitor masih dapat melaporkan failed_jobs yang masih masuk jendela waktunya.

## Bukti dan kelanjutan

Metadata administratif terpilih, hash, snapshot runtime dan pemeriksaan protokol dipetakan pada [hasil terstruktur](portal-reverb-deployment-2026-11-09-results.json), dengan raw di `C:/Users/USER/security-audit-skill/bksda-superapp/run-8/deployment/`. Snapshot transisi rollout dan percobaan observer awal tidak dihitung lulus: validasi backup awal belum meneruskan stdin ke pg_restore, dan observer channel awal perlu menangani array kosong. Backup/observer kemudian diperbaiki dan hasil yang sah dicatat terpisah. Password SSH hanya lewat stdin dan tidak disimpan dalam repository/artefak/command line. Bukti raw awal dari run8 tetap utuh; perbaikan startup/cache dan deployment ini merupakan tindak lanjut terpisah dari snapshot source lokal f7f6b6a8.

Kelanjutan yang memerlukan sesi pengguna: login ulang, konfirmasi private subscription, kirim satu canary teknis kepada akun tersebut, lalu periksa toast/bel/history dan read count. Tidak menyamakan polling dengan delivery realtime. Hasilnya ditambahkan setelah diamati, kemudian laporan/progress di-commit dan dibawa ke `production-server` melalui PR.
