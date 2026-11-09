# Hasil uji lifecycle notifikasi Portal, Surat Tugas, BMN dan Kepegawaian

Tanggal: 9 November 2026. Run: `run-8`. Base source: `e0e5ef3041efe31e96f17e423f4da6e88289ca51`; hasil berlaku pada perubahan dalam commit yang memuat laporan ini. [Rencana 31 skenario](portal-notification-lifecycle-test-plan-2026-11-09.md).

**Status pengujian lokal: selesai pada f7f6b6a8. Tindak lanjut deployment sudah di-merge dan diterapkan melalui PR599/600; runtime/DNS/heartbeat/WSS lulus, uji penerimaan browser menunggu login ulang.** Lihat [laporan deployment terkini](portal-reverb-deployment-2026-11-09.md). Seluruh 31 skenario lokal mempunyai hasil dan bukti sesuai lapisan pada matriks di bawah; status diagnosis awal di matriks tidak ditafsirkan sebagai tes produksi. Ini regresi fungsional terfokus dengan panduan `security-audit` dan `ponytail-review`, bukan audit keamanan menyeluruh baru. Tiga lead historis audit ST/Kepegawaian tidak diubah verdict-nya oleh pengujian ini.

## 1. Penyebab peringatan Reverb dan lokasi aplikasi

Pada fase diagnosis awal, pemeriksaan administratif dilakukan read-only setelah pengguna memberikan akses server. Fase tersebut tidak mengubah server. Sesudahnya pengguna secara eksplisit mengotorisasi push/PR/merge/deploy dan smoke test; tindakan serta hasil fase deployment dicatat terpisah pada laporan tindak lanjut di atas.

| Hal yang diperiksa | Hasil yang diamati |
|---|---|
| `192.168.100.11` | Host Proxmox; aplikasi berada pada VM 106 `bksda-superapp-dokploy`. |
| `192.168.100.203` | Alamat VM aplikasi pada interface `ens18`. |
| `http://192.168.100.203:3000/` | Port yang dipublikasikan container Dokploy; ini panel Dokploy. Frontend aplikasi mempunyai port internal sendiri. |
| Compose aktif | `/etc/dokploy/compose/bksdasuperapp-bksdasuperapp-einhoc/code/docker-compose.dokploy.yml`. |
| Service/network | Backend, queue, scheduler dan Reverb berada pada network Compose yang sama; service Reverb dan alias `reverb` memang ada. |
| Publisher | `BROADCAST_CONNECTION=reverb`, `QUEUE_CONNECTION=database`, host `reverb`, port `8080`, scheme `http`. Tidak merekam app key/secret. |
| Reverb | Berulang kali restart, exit 1; log startup: `Undefined constant "Laravel\Reverb\Servers\Reverb\Console\Commands\SIGINT"`. |
| Runtime image backend | Pemeriksaan CLI tanpa bootstrap aplikasi menghasilkan `pcntl=no SIGINT=no`. |
| Resolusi dari backend | `getent hosts reverb` keluar 2 tanpa alamat ketika diperiksa. |

**Akar kegagalan startup yang terkonfirmasi:** Dockerfile backend belum memasang ekstensi `pcntl`, sedangkan command Reverb yang terpasang memakai konstanta signal tersebut. Daemon gagal sebelum melayani WebSocket. Kegagalan lookup alias konsisten dengan container yang terus restart; pemeriksaan ini tidak mengklaim seluruh riwayat gangguan DNS mempunyai satu penyebab atau telah menguji konektivitas browser produksi.

Perbaikan repository menambahkan `pcntl` pada daftar ekstensi image dan menjalankan guard native `tests/Security/reverb-runtime.php` setelah autoload Composer. Guard memeriksa ekstensi, fungsi/konstanta signal dan `StartServer::getSubscribedSignals()` dari Reverb terpasang. Guard lokal dan daemon Reverb aktual lulus di sandbox. Full Docker build belum dilakukan karena membutuhkan pengambilan dependency; tidak ada paket di-install selama pengujian.

**Sisa operasional pada penutupan lokal awal:** build/deploy dan verifikasi produksi belum dilakukan saat f7f6b6a8 dibuat. Fase itu kini dilanjutkan melalui PR599/600: image diterapkan, runtime/DNS/queue/WSS diperiksa; status browser dan batas hasil terkini ada pada laporan deployment. Bukti fixture lokal di bawah tidak dipakai untuk menggantikan hasil produksi.

## 2. Perubahan dan alasan

| Area/file utama | Masalah sebelum perbaikan | Perubahan dan alasan |
|---|---|---|
| `backend/Dockerfile`, `tests/Security/reverb-runtime.php` | Reverb produksi gagal startup karena `SIGINT` tidak tersedia. | Pasang `pcntl`; build berhenti bila prerequisite native tidak tersedia. Tidak menutupi error dengan restart loop atau hostname pengganti. |
| `HealthMonitorCommand` | Error DNS disajikan sebagai ketidakresponsifan WebSocket; heartbeat yang sama sekali belum pernah dikonsumsi terus dianggap percobaan pertama. | Bedakan DNS dari kegagalan TCP; TCP sukses dijelaskan sebatas socket. Simpan waktu dispatch heartbeat pertama dan alert setelah lebih dari 15 menit tanpa respons. |
| `PortalNotificationCreated`, `AdminInboxChanged` | Success event bisa terbit dari transaksi yang kemudian rollback; broadcast sync gagal dapat menyamarkan record DB yang sudah tersimpan. | Gunakan kontrak Laravel native `ShouldDispatchAfterCommit` dan `ShouldRescue`. Tidak menambah dispatcher, broker atau retry framework. |
| `AssignmentLetterController` | Trash/restore belum memberi pemberitahuan personal; normal update dan perubahan roster tidak konsisten; bulk tidak menjalankan alur yang sama. | Satu helper penerima, notice trash/restore yang akurat, notice perubahan dan pencabutan minimal untuk personel lama. Bulk trash memakai transaksi/lock dan event per record berubah; bulk restore memberi sinyal inbox setelah sukses. |
| Writer ST dan cuti | Request persetujuan/status identik bisa membuat notifikasi berulang, walaupun tidak ada transisi bisnis baru. | Bandingkan state bisnis di bawah lock; timestamp teknis tidak dianggap revisi. Retry identik tidak mengulang notice; revisi nomor, catatan, file atau roster yang nyata tetap diberitahukan. Ini bukan jaminan idempotensi create tanpa request key. |
| `PortalNotificationService` | NIP numerik berupa string diperlakukan sebagai ID database. | Input integer tetap ID; string dicari sebagai NIP dahulu, dengan fallback digit-string ID untuk kompatibilitas caller lama. Akun nonaktif/tidak tersedia tidak menerima notifikasi. |
| `StoreAssetLoanRequest`, `LoanService` | Endpoint legacy menuntut UUID untuk employee ID bigint; koreksi loan tidak menyamakan pemegang aset; return loan lama bisa melepas pemegang baru. | Validasi integer; perubahan peminjam menyelaraskan loan/aset di bawah asset lock; return/delete hanya melepas pemegang yang masih cocok. |
| `PortalNotificationController` | Timestamp yang sama membuat urutan halaman notifikasi tidak deterministik. | Tambahkan `id desc` sebagai tie-breaker sesudah `created_at desc`. |
| `NotificationBell` | Event ID sama dapat menaikkan badge lagi; respons filter lama/optimistic read gagal bisa mempertahankan state salah. | Badge mengikuti count DB; dedup ID untuk toast/event; urutan request menjaga filter/page saat ini; kegagalan read mengambil ulang state otoritatif. Polling yang ada tetap dipakai. |
| Portal detail ST | Request detail berikutnya masih menyimpan isi lama; event terlambat atau respons request lama bisa menampilkan referensi yang sudah tidak tersedia. | Kosongkan preview sebelum fetch, revalidasi lewat endpoint personal, abaikan respons lama dan tampilkan pesan aman untuk 403/404. Notice dan poll sukses memeriksa ulang preview yang terbuka, termasuk bila notice terkait sudah di luar delapan item terbaru. |
| Portal cuti, `MyLeaveTab`, `ScanViewerModal` | Klik/cetak bisa memakai objek cuti lama dari cache, atau URL scan sebelumnya ketika referensi berubah. | Ambil detail personal terkini sebelum membuka/cetak, kosongkan hasil lama dan lindungi request/timer dari respons terlambat. URL scan dikosongkan saat fetch baru. |
| Pengajuan cuti | Notice admin membaca atribut nama yang tidak ada. | Gunakan `nama_lengkap` pegawai, disertai assertion isi notice. |

Review independen akhir tidak menemukan bug aplikasi tambahan pada diff. Ponytail review menerima kontrak native, helper bersama dan polling yang sudah ada; tidak ada dependency baru. Penambahan tes memverifikasi perilaku, termasuk rollback sesudah efek intermediate benar-benar terjadi.

## 3. Kontrak bisnis yang dipakai

- Riwayat persetujuan lama dan `read_at` dipertahankan. Trash menambah notice **“Surat Tugas Dipindahkan ke Sampah”**; tidak mengubah sejarah menjadi pembatalan. Restore sukses menambah **“Surat Tugas Dipulihkan”** kepada peserta yang masih berhak. Draft tidak memberi notice personal. Retry/no-op tidak menjadi transisi baru.
- Penerima yang dikeluarkan dari roster memperoleh notice pencabutan tanpa isi revisi surat. Endpoint personal menolak akses lamanya. Riwayat notifikasi bukan capability untuk membuka dokumen.
- Force delete mempertahankan pemberitahuan historis; referensi surat/unduhan menjadi tidak tersedia. Tidak membuat notice penerbitan atau pembatalan palsu.
- Koreksi/delete loan dan cancel/delete cuti tidak ditambah jenis notifikasi personal baru pada putaran ini. Riwayat lama dipertahankan; tampilan membaca hak/state saat ini. BMN menavigasi daftar aset, bukan route detail loan yang tidak tersedia. Saldo cuti mengikuti operasi resmi yang sudah ada.
- Sesuai jawaban pengguna, **ST resmi di sampah tetap dikeluarkan dari konflik jadwal dan rekonsiliasi PD; fixture hadir yang sama berubah menjadi H. Restore mengembalikan konflik, riwayat penugasan dan PD.** Trash tidak mengubah status persetujuan tersimpan menjadi pembatalan. Jadwal baru dapat lolos saat ST di sampah, sehingga restore dapat ditolak bila sudah ada konflik baru. Batch uang makan yang sudah tersimpan tidak diasumsikan dihitung ulang otomatis; perlu rekonsiliasi ulang melalui alur yang sesuai.
- Dedup health tetap **global satu jam**: masalah berbeda dan kambuh sebelum TTL juga tidak menambah notice; recovery tidak membuat notice baru atau mereset dedup. Scheduler source memakai interval lima menit, tanpa menunggu lima menit nyata dalam tes fake-clock.

## 4. Matriks 31 skenario dan lapisan bukti

Kode bukti: **P** = `PortalNotificationLifecycleTest`; **B** = `NotificationBmnLifecycleTest`; **H** = `NotificationHealthMonitorTest`; **A** = `notification-flow.actual-app.cjs`; **T** = `notification-transport.cjs`; **C** = tiga tes callback/effect frontend aktual; **R** = regresi lama yang dijalankan ulang pada suite 407 tes. Nama method dan receipt lengkap ada pada [hasil terstruktur](portal-notification-lifecycle-results-2026-11-09.json).

| ID | Hasil | Bukti dan batas yang relevan |
|---|---|---|
| RV-01 | DIAGNOSED | Metadata Compose/runtime dan startup server read-only; `pcntl` tidak ada, Reverb restart. Fix source tersedia; produksi belum redeploy. |
| RV-02 | PASS lokal | H: controlled DNS/refused/timeout dibedakan. Timeout memakai pesan terkendali; tidak mengklaim menunggu timeout jaringan nyata. Probe source dibatasi dua detik. |
| RV-03 | PASS lokal | H socket TCP nyata; T handshake/private auth/delivery dengan daemon nyata, app key salah ditolak dan channel asing 403. Port sehat tidak disamakan dengan delivery sehat. |
| RV-04 | PASS lokal | A/T: publisher lokal, proxy `/app` Upgrade, browser private subscription aktual. Proxy loopback fixture bukan ingress Dokploy produksi. |
| RV-05 | PASS lokal | T: record DB ada sebelum worker, native database queue diproses; gagal saat daemon berhenti lalu retry terbatas tanpa record ganda. A juga memakai gate worker untuk approval ST pertama. |
| RV-06 | PASS lokal | B/H fake clock: alert admin aktif, dedup satu jam, jenis masalah berubah, pulih/kambuh sebelum TTL dan alert setelah 61 menit; source interval scheduler lima menit. |
| RV-07 | PASS lokal | H sync broadcaster gagal tetap menyimpan notice; T async outage/retry; A API tetap sehat dan polling nominal 35 detik mengejar badge/riwayat saat hanya Reverb berhenti. |
| STN-01 | PASS lokal | P/R approval peserta A+B, C ditolak; A event/private browser pegawai aktual. |
| STN-02 | PASS lokal | P seluruh pintu store/approve/update/status dan alias yang didukung; retry identik versus revisi nyata. Store hanya menerima `approved` sebagai publikasi langsung; alias lain pada store dinormalisasi pending sesuai kontrak sumber. |
| STN-03 | PASS lokal | P riwayat IDs/status/read_at kedua penerima tetap, notice trash baru; personal list/detail/download 404. A preview aktual ditutup setelah trash. |
| STN-04 | PASS lokal | P/A/C klik notifikasi lama, detail terbuka dan request berlomba tidak menampilkan isi lama. Unduhan memakai otorisasi endpoint personal. |
| STN-05 | PASS lokal | P/A restore kembali tersedia; P/R mixed restore mengamati safe row aktif pada transaction level 1, lalu rollback rows/notices/snapshot ketika konflik 422. |
| STN-06 | PASS lokal | P/A force delete, riwayat tetap, referensi/detail/download tidak tersedia; R perlindungan file bersama ikut lulus. |
| STN-07 | PASS lokal | P bulk trash/restore/duplicate/missing/no-op dan inbox restore; R mixed owned/foreign/missing serta bulk force/file; rollback intermediate diverifikasi. |
| STN-08 | PASS lokal | P creator nonadmin official delete 403 tanpa notice/mutasi; draft miliknya berhasil. R actor/module guard ikut dijalankan ulang. |
| STN-09 | PASS lokal | P A dikeluarkan, B tetap, C masuk: notice minimal A, notice B/C, API A 403/C 200. R personal/channel isolation. |
| STN-10 | PASS lokal | A worker nyata dihentikan dengan marker/ACK, create→approve→trash commit dahulu, worker mulai dan approval pertama baru tiba; klik tidak membuka ST di sampah; restore mengizinkan kembali. Tidak mengklaim jaminan urutan delivery semua job. |
| PN-01 | PASS lokal | Baseline browser merah; A rebroadcast ID yang sama dua kali, badge/list sesuai DB, C dedup toast aktual. |
| PN-02 | PASS lokal | P 20 item timestamp sama, pagination/read filters/scope/idempotensi; A UI read/read-all/history; C error optimistic read kembali otoritatif dan respons filter lama diabaikan. |
| PN-03 | PASS lokal | A disconnect→resubscribe dan frame tambahan setelah recovery; C effect aktual dengan clock/visibility terkendali membuktikan hidden skip, visible catch-up dan cleanup. Hidden→visible tidak diklaim sebagai perpindahan tab native. |
| PN-04 | PASS lokal | A login/logout normal dua tab A→C dan resource A yang benar-benar masih ada ditolak C; R/C cache dan credential boundary diuji ulang. |
| PN-05 | PASS lokal | T logout aktual menolak private auth 401; R `StKepegawaianNotificationQueueTest` serialize/restore/handle native memeriksa token dicabut dan module withdrawal dengan recording broadcaster; akun nonaktif diuji R. |
| PN-06 | PASS lokal | P/A/C referensi ST/cuti hilang/asing dan stale data aman; handler source membatasi action_tab ke tab valid, health pengaturan jatuh ke dashboard. BMN memakai tab aset. |
| BN-01 | PASS lokal | B bulk dan legacy single HTTP dengan ID employee integer; borrower/notices/reference/personal asset API cocok, view-only ditolak. |
| BN-02 | PASS lokal | B return sah satu notice; retry tidak mengubah state/count lagi. |
| BN-03 | PASS lokal | B koreksi borrower menyamakan loan/aset dan akses lama/baru; return/delete loan lama mempertahankan pemegang baru, tanpa notice palsu ke pemegang baru. |
| BN-04 | PASS lokal | B safe first loan/history/owner benar-benar berubah dalam transaksi, kemudian conflict mengembalikan semuanya dan tidak menerbitkan event sukses; positive commit tetap menerbitkan. H/T menguji kegagalan broadcast. |
| KN-01 | PASS lokal | P submit/status/approve/generate metadata/reject, recipient/inbox/nama, kuota/reservasi serta retry versus revisi; R alternate writer/quota ikut lulus. Generate metadata tidak menguji provider TTE. |
| KN-02 | PASS lokal | P cancel/delete, history reference dan kuota konsisten; C fresh authorized print, 404, out-of-order dan delayed timer. Tidak ada pengujian printer fisik. |
| KN-03 | PASS lokal | P input Employee/int/NIP string, inactive/no-account, perubahan NIP melalui HTTP menyelaraskan username dan memutus mapping lama; R lifecycle IAM ikut dijalankan. Tidak mengklaim fixture NIP duplikat. |
| KN-04 | PASS lokal | P reconcile HTML presensi dummy aktual + konflik + history: aktif PD/konflik/ada→trash H/tidak konflik/tidak ada→restore PD/konflik/ada. Mengikuti kebijakan yang disetujui pengguna. |

## 5. Reproduksi merah, perbaikan dan hasil ulang

Baseline dibekukan sebelum perubahan (`app/config` backend dan `src` frontend, 829 file dalam manifest eksternal). Test baru dijalankan terhadap source baseline untuk membedakan kegagalan aplikasi dari kesalahan fixture.

| Receipt merah yang bermakna | Hasil dan kaitan |
|---|---|
| `php-23897acf81dd` | BMN 7 tes/66 assertions: 4 gagal, membuktikan legacy ID, kepemilikan koreksi/return dan event sebelum commit. |
| `php-0954b2625129` | Lifecycle ST/KPG 18 tes/122 assertions: 5 gagal dan 4 error akibat notice yang diharapkan belum ada; terkait trash/restore/bulk/roster/retry/NIP. |
| `php-e85a885e96a1` | Tambahan 7 tes/71 assertions: 5 gagal pada retry ST tiga pintu dan cuti dua pintu; KN-04 dan riwayat cancel sudah sesuai. |
| `php-a6990f89d257` | Pagination/NIP 2 tes/10 assertions: 2 gagal pada urutan equal timestamp dan mapping NIP. |
| `notification-client-aa2674e4433a` | Callback source aktual gagal membersihkan isi ST lama ketika detail baru diminta. |
| `e2e-3e0d42c4e5c9` | Browser baseline melewati login/private channel/approval, kemudian gagal karena event duplikat menaikkan badge. |

Percobaan awal juga memuat kesalahan setup fixture (path Playwright, proxy HMR/hidrasi, label UI/aria, ekspektasi alias store yang tidak didukung dan binding broadcaster). Itu diperbaiki pada tes dan tidak dihitung sebagai bug aplikasi. Receipt health baseline awal memuat dua kegagalan perilaku dan satu kesalahan binding fixture, sehingga tidak dipresentasikan sebagai run baseline bersih. TypeScript menemukan optional `item.id` pada callback print; guard sekarang menolaknya dengan pesan aman. Assertion reconnect awal diperketat setelah review independen agar tidak lolos memakai frame lama.

| Verifikasi akhir | Hasil |
|---|---|
| Regresi gabungan empat modul + boundary bersama | `php-715e7c502639`: **407 tes, 4.745 assertions, 404 lulus, 3 skip, 0 gagal**. |
| Setelah assertion tambahan dedup/inbox restore | `php-d6b6a976914f`: **38 tes, 454 assertions, 0 gagal**. Subset dari suite di atas; angka tidak dijumlahkan. Tidak ada perubahan aplikasi setelah suite gabungan. |
| Callback/effect frontend aktual | `notification-client-0ed1d4df83e9`: **12 kasus lulus** (3 ST, 5 cuti/print, 4 Bell); controlled HTTP/time/state, bukan DOM atau transport. |
| TypeScript dan helper/cache regresi | `frontend-499a80937ad2`: full `tsc --noEmit --incremental false`, draft, 8 API/auth cache scenarios dan legacy ST reader lulus. |
| Lint | `lint-455cc3bb3acf`: ESLint file frontend berubah, 0 error/0 warning. |
| Syntax | `php-lint-e6bebe23e706`: 15 file PHP berubah/baru lulus. |
| Prerequisite Reverb | `reverb-runtime-e8eb0a62995e`: guard native lulus pada runtime lokal yang menyediakan pcntl. |
| Transport aktual | `e2e-7525e75da854`: handshake, private/foreign auth, key salah, queue, outage/retry dan logout lulus. |
| UI aplikasi aktual, assertion reconnect diperketat | `e2e-b85fa428ecf7`: seluruh fase online/duplikat/history/trash/restore/force/delayed queue/offline polling/reconnect/dua tab lulus, 0 page error. |

Tiga skip pada suite gabungan adalah dua tes PostgreSQL yang memerlukan fixture tersendiri dan satu tes Windows/Chrome lama. Skip tidak dihitung lulus. Putaran ini tidak mengklaim race dua-worker PostgreSQL baru; bukti rollback lokal memakai transaksi nyata dan delayed event memakai worker/Reverb nyata. PHPUnit XML dan output hash dipetakan pada hasil terstruktur.

## 6. Isolasi, keterulangan dan batas hasil

Semua build/test aplikasi, browser, CLI fixture dan parsing dijalankan di Docker **network none**, source/toolchain read-only, environment kosong lalu allowlist dummy, UID 65534, capability drop/no-new-privileges. Tidak ada port host, credential operasional, `.env` produksi, install dependency atau provider eksternal. Pengecualian yang diotorisasi pengguna hanya diagnosis administratif server read-only melalui SSH; password tidak masuk repository, command line, laporan atau artefak hasil.

Runner biasa membatasi 1 CPU, RAM 1,5 GiB, 64 PID, scratch 128 MiB, file 16 MiB dan wall 185 detik; E2E 2 CPU, RAM 4 GiB, 512 PID, scratch 768 MiB, file 64 MiB dan wall 610 detik. Target timeout sedikit lebih pendek daripada outer wall. Observer terpercaya membuka descriptor no-follow sebelum target; hanya output/XML/JSON berukuran terbatas dipromosikan setelah semua writer berhenti. Artefak mentah dan trusted launcher berada di `C:/Users/USER/security-audit-skill/bksda-superapp/run-8/`; [petunjuk fixture](../../backend/tests/Security/README.md). Hasil terstruktur mencatat SHA256 receipt dan metadata diagnosis server secara terpisah. Manifest source memakai byte working tree yang diuji; Git dapat menormalisasi CRLF/LF saat staging, sehingga hash tersebut bukan hash blob Git.

Lingkungan lokal memakai PHP 8.4.27/PHPUnit 12.5.40 dan Node 22.23.4 dengan dependency/toolchain lokal yang tersedia. Ini bukan pembuktian kesetaraan semua versi image, TLS/ingress, frontend build env dan worker produksi. Font eksternal diganti fixture lokal; API notifikasi dan transport native tidak dimock pada E2E. Tidak ada klaim printer fisik, provider email/TTE/WhatsApp, stress/capacity, atau seluruh fitur superapp telah diaudit.

Source, tes, laporan, hasil terstruktur dan progress awal disertakan pada commit lokal f7f6b6a8 tanpa deployment pada saat penutupan tersebut. Push/PR/merge dan deployment berikutnya diotorisasi terpisah serta dicatat pada laporan tindak lanjut. Peringatan lama tetap riwayat; umur “6h lalu” tidak membuktikan keadaan sekarang. Hasil diagnosis/deployment tidak menghapus riwayat tersebut.
