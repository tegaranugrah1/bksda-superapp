# Rencana uji notifikasi Portal, Surat Tugas, BMN, dan Kepegawaian

Tanggal: 9 November 2026. Acuan source: `e0e5ef3041efe31e96f17e423f4da6e88289ca51`.

**Status: 31 skenario lokal telah dilaksanakan sesuai lapisan bukti pada [laporan hasil](portal-notification-lifecycle-report-2026-11-09.md).** Source/tes/laporan awal ditutup pada f7f6b6a8. Deployment melalui PR599/600 dan smoke test notifikasi produksi selesai, termasuk private auth, toast realtime, bel/riwayat dan read_at pada login terbaru. Status serta batasnya ada pada [laporan deployment](portal-reverb-deployment-2026-11-09.md). Dokumen ini mempertahankan rancangan dan observasi baseline; hasil lokal tidak ditulis ulang sebagai seluruhnya tes produksi.

## 1. Tujuan dan batas cakupan

Menjawab dua masalah konkret:

1. Mengapa monitor melaporkan `getaddrinfo for reverb failed`, dan apakah notifikasi tetap tersimpan serta sampai ke Portal ketika WebSocket bermasalah?
2. Apa yang dilihat pegawai bila Surat Tugas sudah disetujui, lalu admin tidak sengaja menghapusnya; bagaimana riwayat notifikasi, detail surat, pemulihan, dan badge harus berperilaku?

Cakupan hanya empat modul dan komponen bersama yang langsung melayaninya:

| Modul | Alur yang diuji |
|---|---|
| Portal | Bel, riwayat, unread count, read/read-all, navigasi referensi, polling, private channel, pergantian akun. |
| Surat Tugas | Pembuatan/penerbitan, perubahan status/personel, trash, restore, force delete, bulk, klik notifikasi terkait. |
| BMN | Penugasan/peminjaman/pengembalian aset dan penghapusan/koreksi record yang telah menghasilkan notifikasi; hak penerima lama/baru. |
| Kepegawaian | Pengajuan/keputusan/pembatalan/penghapusan cuti, identitas pegawai dan IAM yang menentukan penerima, proyeksi ST dan saldo terkait. |
| Infrastruktur pendukung | Monitor Reverb, backend publisher, queue worker, private-channel authorization, proxy WebSocket dan browser client untuk empat modul tersebut. |

Bukan audit ulang seluruh fitur empat modul. Parser/import massal, perhitungan tarif lengkap, auction BMN, desain UI umum, Drive/CMS, asisten WhatsApp, provider eksternal, dan pengujian kapasitas/stress berada di luar rencana. Integrasi eksternal tidak dipanggil.

## 2. Fakta awal dari source baseline sebelum pelaksanaan

Bagian ini mencatat keadaan saat rencana disusun, bukan keadaan source sesudah perbaikan. Konfigurasi aktif dan penyebab restart Reverb sekarang sudah didiagnosis pada laporan hasil.

### 2.1 Peringatan Reverb

- `HealthMonitorCommand` menjalankan probe TCP `fsockopen` ke host/port pada `broadcasting.connections.reverb.options`, hanya bila broadcaster aktif adalah `reverb`.
- Pesan pengguna menyebut kegagalan **resolusi nama host `reverb` dari proses backend**. Ini belum membuktikan daemon Reverb mati, WebSocket browser gagal pada lapisan yang sama, atau semua notifikasi hilang. Kegagalan DNS sementara, service tidak dibuat, network/alias tidak cocok, serta config cache lama harus dibedakan melalui bukti.
- Scheduler dideklarasikan setiap lima menit dan alert dideduplikasi sekali per jam. Label “6h lalu” menunjukkan umur notifikasi tersebut; bukan bukti status Reverb saat ini atau scheduler benar-benar berjalan.
- `docker-compose.dokploy.yml` mendeklarasikan service `reverb`, host tersebut untuk publisher/worker, dan perintah `reverb:start`. Source `deploy/nginx-backend.conf` meneruskan `/app` ke `reverb:8080`. File compose lain yang diperiksa tidak mendeklarasikan service Reverb yang sama. **File konfigurasi yang benar-benar aktif belum diketahui**, sehingga tidak boleh langsung menganggap penyebabnya sudah pasti.
- Probe TCP sukses belum membuktikan handshake WebSocket, kecocokan app key/secret, private-channel auth, queue processing, atau penerimaan event di browser.

### 2.2 Jalur notifikasi

- `PortalNotificationService` membuat record `portal_notifications`; event `PortalNotificationCreated` menggunakan `ShouldBroadcast`. Penyimpanan DB dan pengiriman realtime adalah lapisan berbeda; efek kegagalan queue/broadcast terhadap masing-masing transaksi harus diuji.
- `NotificationBell` mengambil data melalui HTTP, melakukan polling nominal 35 detik saat halaman terlihat, dan fetch saat `visibilitychange` kembali visible. Ini bukan listener `window.focus` tersendiri. Adanya fallback pada source belum membuktikan seluruh jalur offline bekerja.
- Private channel personal mengandung user ID dan token ID. API list/read/read-all dibatasi user login. Alur baru tetap harus diuji terhadap sesi yang dicabut dan akun berbeda.

### 2.3 Surat disetujui lalu dihapus

- `approve` dan `updateStatus` membuat notifikasi pegawai dengan referensi surat. Ada writer lain yang dapat menerbitkan atau merevisi dokumen; semuanya masuk matriks.
- `destroy` memakai soft delete dan mengirim `AdminInboxChanged('surat_tugas', 'deleted', id)`. Pada jalur tersebut tidak ada pemanggilan notifikasi penghapusan untuk pegawai.
- `restore` juga mengirim perubahan inbox admin tanpa membuat notifikasi pemulihan personal. Jalur bulk tidak boleh diasumsikan menjalankan callback/event model yang sama dengan mutasi tunggal.
- Riwayat notifikasi dibaca berdasarkan `user_id`, tanpa pemeriksaan keadaan surat pada query tersebut. Dari source yang ditinjau, notifikasi penerbitan lama tetap dapat muncul setelah surat dipindah ke sampah.
- Portal membuka `reference_id` melalui endpoint personal. Kegagalan fetch detail saat ini memakai pesan umum “Gagal memuat detail surat tugas.” Belum ada bukti runtime pada rencana ini mengenai stale preview, unread count, atau hasil klik setelah penghapusan.

Ini observasi source untuk menentukan tes, bukan hasil uji atau daftar vulnerability yang sudah terkonfirmasi.

## 3. Kontrak perilaku yang diusulkan

Kontrak berikut diajukan sebelum implementasi dan dipakai setelah pengguna menyetujui pelaksanaan rencana. Pengguna kemudian secara eksplisit memilih mempertahankan perilaku ST di sampah: keluar dari konflik/PD, restore mengembalikan; konsekuensinya dijelaskan pada laporan. Detail kebijakan draft, roster, restore/retry, BMN dan cuti juga dicatat pada laporan.

1. **Riwayat event dipertahankan.** Notifikasi “diterbitkan” mencatat kejadian saat penerbitan; tidak dihapus atau diubah diam-diam menjadi seolah persetujuan tidak pernah terjadi. Keadaan referensi saat ini ditampilkan terpisah dari status pada waktu event.
2. **Trash berbeda dari pembatalan tugas.** Saat surat resmi dipindah ke sampah, penerima diberi informasi yang akurat seperti “Surat Tugas dipindahkan ke sampah/tidak tersedia”. Jangan otomatis menyatakan penugasan dibatalkan. Pembatalan bisnis, arsip biasa, dan koreksi administratif perlu dipetakan ke operasi/status yang benar-benar tersedia.
3. **Restore memberi keadaan terkini.** Pemulihan yang berhasil membuat surat dapat dibuka lagi sesuai hak saat ini. Usulan: satu notifikasi pemulihan bagi setiap penerima yang masih berhak, bukan penerbitan ulang palsu. Restore gagal karena konflik tidak mengirim pemberitahuan keberhasilan.
4. **Tautan lama aman dan jelas.** Surat trashed/force-deleted atau penerima yang dicabut tidak boleh membuka isi/file lama dari cache. Pengguna mendapat pesan ketidaktersediaan yang jelas. Pesan untuk pihak tak berhak tidak membocorkan keberadaan/detail surat asing.
5. **Penerima mengikuti peristiwa dan kewenangan saat ini.** Penambahan/pencabutan personel, pergantian pemegang aset, dan perubahan identitas harus ditelusuri. Penerima lama dapat menerima pemberitahuan pencabutan minimal jika kebijakan mengharuskannya, tetapi tidak memperoleh detail yang haknya sudah dicabut.
6. **Satu transisi logis, satu pemberitahuan per penerima.** Retry atau event realtime duplikat tidak menggandakan record, badge, atau toast. Perubahan bisnis baru yang sah tetap boleh membuat notifikasi baru. HTTP retry dengan identitas sama dibedakan dari aksi baru yang disengaja; kontrak endpoint ditetapkan dahulu sebelum mengklaim idempotensi.
7. **Notifikasi mengikuti commit.** Tidak ada notifikasi sukses yang bertahan/terkirim untuk transaksi yang rollback. Kegagalan realtime tidak membuat mutasi sah dilaporkan gagal lalu dijalankan ganda tanpa pemeriksaan keadaan DB.
8. **Fallback memberi hasil konsisten.** Saat Reverb offline tetapi API sehat, riwayat dan badge kembali sesuai DB melalui polling. Target tes yang diusulkan: paling lambat satu interval polling ditambah toleransi lima detik saat tab visible; verifikasi cache HTTP 2,5 detik, latency, dan tab visibility dalam pengukuran.

Keputusan yang perlu ditetapkan sebelum menilai kasus terkait: notifikasi untuk trash draft/pending; istilah trash versus pembatalan resmi; penerima saat roster berubah; kebijakan restore/retry; dan efek bisnis penghapusan pada jadwal, cuti, serta rekonsiliasi presensi. Ketiadaan kebijakan tidak boleh diberi status PASS atau dianggap bug keamanan.

## 4. Aktor dan fixture dummy

| Aktor | Peran dalam pengujian |
|---|---|
| SA | Super Admin aktif, penerima health alert. |
| AS | Admin berwenang Surat Tugas; positive control create/approve/trash/restore. |
| AK | Admin Kepegawaian yang hak/module-nya ditetapkan dari route aktual. |
| AB | Admin/operator BMN dengan permission untuk operasi yang diuji. |
| A, B | Dua pegawai penerima surat yang sama, akun aktif terhubung NIP/username. |
| C | Pegawai lain, bukan penerima; negative control data dan channel. |
| R | Creator atau delegated approver nonadmin, hak tepat mengikuti source aktual. |
| X | Akun nonaktif/token dicabut, serta admin tanpa modul/permission terkait. |

Seed satu ST pending berpersonel A+B, ST asing untuk C, cuti A, dua aset dummy, dan loan dummy. Gunakan penanda run unik pada record, file dan event. Jangan memakai pegawai/aset nyata. Untuk skenario NIP kosong/duplikat/akun belum tersedia, buat fixture terpisah agar kegagalan mapping tidak disalahartikan sebagai gangguan WebSocket.

## 5. Matriks uji

Matriks berikut adalah rancangan input/acceptance. Status pelaksanaan: **RV-01 DIAGNOSED (produksi belum redeploy), 30 kasus lain PASS lokal dengan batas lapisan bukti yang dicatat**. Prioritas P0 menyelesaikan dua keluhan utama; P1 menguji alur yang berbagi notifikasi. Setiap baris dipetakan ke tes/receipt pada [hasil terstruktur](portal-notification-lifecycle-results-2026-11-09.json); tidak menyamakan source/harness dengan bukti produksi.

### 5.1 P0 — Reverb, queue dan health alert

| ID | Skenario | Observable dan acceptance |
|---|---|---|
| RV-01 | Identifikasi konfigurasi yang aktif | Pisahkan backend publisher, worker, scheduler, daemon dan browser. Catat nama service/network/alias, host/port/scheme, asal build frontend, keberadaan proses dan umur config cache tanpa merekam secret. Source template saja tidak dianggap konfigurasi aktif. |
| RV-02 | Nama host tidak dapat di-resolve vs port tertutup vs timeout | Reproduksi lokal terisolasi dengan kegagalan terkendali; klasifikasi error berbeda, batas waktu tercatat. Jangan mematikan service atau DNS deployment. |
| RV-03 | Socket TCP terbuka tetapi handshake/auth salah | Monitor TCP dapat terlihat sehat sementara delivery gagal; buktikan secara terpisah probe TCP, handshake, subscription private, dan penerimaan satu event dummy. Tidak menyimpulkan sehat hanya dari port. |
| RV-04 | Publisher internal dan browser melalui proxy | Nama `reverb` digunakan dalam namespace internal yang sesuai; browser memakai hostname API/ws yang dapat diaksesnya. Uji `/app`, Upgrade, skema/port dan auth endpoint aktual; jangan menyetel browser ke hostname container. |
| RV-05 | Queue worker berhenti/terlambat, lalu dipulihkan | Notifikasi DB, antrean broadcast dan browser diamati terpisah. Jalankan satu job tertunda lalu retry terbatas; tidak ada event/record bisnis ganda atau penerima asing. |
| RV-06 | Monitor terjadwal dan dedup | Jam fake untuk interval lima menit, dedup satu jam, alert hanya penerima aktif yang sah; cek repeat/jenis masalah berubah/pulih/kambuh. Catat jika notifikasi recovery belum menjadi kontrak. Umur “6h lalu” tidak disamakan dengan status sekarang. |
| RV-07 | Reverb offline, API masih sehat | Satu mutasi ST/cuti/BMN tetap dievaluasi terhadap keadaan DB; Portal dapat mengambil notifikasi lewat polling, termasuk health alert itu sendiri. Periksa mode queue async/sync yang benar-benar didukung dan kemungkinan exception saat dispatch. |

RV-01 pada deployment hanya dapat ditutup dengan bukti konfigurasi/status non-secret yang diizinkan owner. Eksekusi awal tetap lokal; tidak ada perubahan atau probe produksi yang tersirat oleh rencana ini.

### 5.2 P0 — Surat Tugas disetujui, dihapus, dan dipulihkan

| ID | Skenario | Observable dan acceptance |
|---|---|---|
| STN-01 | Approve ST A+B, C bukan peserta | Status/approver DB benar; notifikasi A+B mengarah ke ID yang sama, C tidak menerima/read/subscription. Uji pembaca Portal biasa, bukan hanya admin. |
| STN-02 | Semua pintu penerbitan/perubahan status | Petakan store, approve, update, updateStatus dan alias resmi yang benar-benar diterima tiap pintu. Hak, penerima, judul, status event dan reference konsisten; validasi 422 tidak membuat notifikasi sukses. |
| STN-03 | Admin trash surat resmi; A belum membaca, B sudah membaca | Ambil snapshot notification IDs/read_at/unread sebelum dan sesudah. Riwayat penerbitan tetap historis; usulan notifikasi trash mengikuti kontrak. Daftar/detail/preview/download tidak membuka surat yang sudah trashed. |
| STN-04 | Klik notifikasi lama setelah trash | Uji dari bel, riwayat dan toast; halaman/detail lama sudah terbuka maupun belum. Tidak ada isi stale atau unduhan file lama; pesan tidak tersedia tepat, badge tidak rusak. |
| STN-05 | Restore tanpa konflik, lalu restore gagal karena konflik | Sukses memulihkan akses penerima sekarang dan mengikuti kontrak notifikasi pemulihan. Gagal 422 mempertahankan tombstone, rows/pivots/files/kuota dan notification count. |
| STN-06 | Force delete setelah trash | Uji stale notification reference dan file; tidak crash/menampilkan isi lama. Riwayat pemberitahuan mengikuti kebijakan retensi yang ditetapkan; bukan menganggap FK notification otomatis menghapus record. |
| STN-07 | Bulk trash/restore/force mixed owned/foreign/missing | Hanya record yang benar-benar berubah menghasilkan efek yang diizinkan; tidak mengasumsikan query-level mutasi menjalankan event model. Kegagalan transaksi tidak meninggalkan notifikasi sukses parsial. |
| STN-08 | Creator/nonadmin mencoba hapus surat resmi | 403 dan keadaan surat/notifikasi tetap; operasi creator pada status yang memang diizinkan tetap bekerja. Negative control harus mencapai guard yang dituju. |
| STN-09 | Personel A dikeluarkan, B tetap, C ditambahkan | Hak personal dan channel dievaluasi ulang. Notifikasi event lama A tidak menjadi capability membuka surat; pemberitahuan perubahan untuk A/B/C mengikuti kontrak penerima yang disepakati. |
| STN-10 | Approve/delete/restore saat broadcast tertunda | Worker dijeda dengan gate lokal, bukan sleep acak. Event penerbitan tertunda tidak membuat UI seolah dokumen masih tersedia. Catat urutan commit/event dan keadaan akhir; jangan mensyaratkan urutan arrival queue tanpa jaminan source. |

### 5.3 P1 — Portal dan isolasi pengguna

| ID | Skenario | Observable dan acceptance |
|---|---|---|
| PN-01 | Realtime event yang sama tiba dua kali, lalu polling | Satu item per notification ID, unread count sesuai DB, toast sesuai kontrak; tidak hanya dedup list sambil badge tetap bertambah. |
| PN-02 | Read/read-all, unread/read filter dan pagination | Scope milik user, read_at idempotent, total/history/badge konsisten. Error HTTP pada optimistic update dikoreksi; C tidak bisa menandai milik A. |
| PN-03 | Disconnect/reconnect, tab hidden→visible, koneksi pulih | Notifikasi terlewat diambil ulang; tidak menggandakan item/event subscription, cache history tidak menahan data yang sudah berubah. |
| PN-04 | Dua tab dan pergantian akun A→C | Cache request, state bel/detail, browser storage, dan channel lama tidak membocorkan data A. Ikuti login/logout aktual yang memuat ulang halaman; jangan mengarang pergantian akun in-place. |
| PN-05 | Logout/nonaktif/revoke saat queue tertunda | Subscription baru ditolak dan proses broadcast tidak mengirim ke token yang telah dicabut; positive control token aktif tetap menerima. |
| PN-06 | Referensi hilang/asing dan action_tab tidak cocok | ST/cuti tidak ada atau hak dicabut tidak menampilkan detail lama. BMN saat ini menavigasi tab aset; jangan menuntut loan-detail route yang tidak tersedia. Alert system `pengaturan` dinavigasikan sesuai valid tabs, tidak crash. |

### 5.4 P1 — BMN

| ID | Skenario | Observable dan acceptance |
|---|---|---|
| BN-01 | Pinjam aset tunggal dan bulk | Recipient sesuai pegawai peminjam; notification reference cocok asset/loan menurut writer; DB loan dan penanggung jawab aset benar. Pegawai lain tidak mendapat detail. |
| BN-02 | Pengembalian yang sah dan retry | Status loan, pemegang aset dan notifikasi konsisten; request ulang mengikuti kontrak (ditolak atau no-op), tidak membuat kesan pengembalian baru. |
| BN-03 | Koreksi/penghapusan loan atau pergantian pemegang aset | Pemberitahuan lama tidak dianggap keadaan terkini. Detail aset/loan memeriksa hak pemegang sekarang; aset tidak dibebaskan bila sudah menjadi tanggung jawab pegawai lain. |
| BN-04 | Rollback bulk dan kegagalan broadcast | Mutasi awal yang dibatalkan tidak menghasilkan notifikasi sukses/event prematur. Uji transaksi riil; fake assertion “event dispatched” tidak cukup. |

### 5.5 P1 — Kepegawaian

| ID | Skenario | Observable dan acceptance |
|---|---|---|
| KN-01 | Ajukan/approve/reject cuti melalui writer aktual | Inbox admin yang sah dan pegawai yang benar menerima event yang sesuai; pegawai lain tidak mendapat data alasan/detail. Saldo/reservasi cocok keadaan DB. |
| KN-02 | Cancel atau delete cuti yang telah menghasilkan notifikasi | Klik referensi lama aman, saldo/reservasi dipulihkan hanya sesuai aturan, tidak mengirim status sukses palsu atau debit ganda. Notifikasi perubahan mengikuti kontrak yang ditetapkan. |
| KN-03 | Perubahan NIP/username, akun nonaktif, pegawai tanpa akun | Mapping employee→user tidak mengirim ke akun salah. Tidak ada exception tersembunyi yang dianggap delivery sukses; kasus tidak ada penerima dilaporkan secara tepat. |
| KN-04 | ST trash/restore terhadap jadwal dan proyeksi Kepegawaian | Daftar penugasan personal, konflik, cuti dan rekonsiliasi terkait membaca state yang benar. Kebijakan trash versus pembatalan dan dampak ke presensi ditetapkan dahulu; source SoftDeletes bukan keputusan bisnis tentang hak uang makan. |

## 6. Cara pelaksanaan

Urutan yang disarankan:

1. **Petakan konfigurasi dan kontrak.** Catat source/ref/dirty serta pemilik setiap writer. Konfirmasi deployment mana yang melaporkan alert dari bukti non-secret; bedakan namespace scheduler/worker/backend/browser. Selesaikan keputusan bisnis bagian 3 sebelum memberi verdict pada kasus terkait.
2. **Reproduksi dua keluhan utama dahulu.** RV-01/02/07 dan STN-01/03/04 menggunakan akun A+B+C. Rekam rows notifikasi dan mutasi DB sebelum/sesudah, bukan hanya screenshot.
3. **Feature HTTP dan transaksi.** Reuse fixture dan regresi yang sudah ada; tambahkan kasus yang belum dibuktikan untuk delete/restore/bulk, cuti dan loan. Rollback harus terjadi setelah paling sedikit satu efek intermediate teramati secara nonmutating bila klaimnya rollback intermediate.
4. **Queue dan Reverb aktual.** HTTP Laravel, queue backend yang digunakan, daemon Reverb, private auth dan browser berjalan dalam namespace loopback terisolasi. Satu penerima sah dan satu asing. Tangkap nama channel/event dan ID dummy minimal; tidak merekam bearer/secret.
5. **E2E aplikasi aktual.** Playwright memakai Next+PHP, login/UI normal, bel/history, unread badge, trash/restore dan klik referensi lama. API notification tidak dimock untuk klaim end-to-end. Uji online dan fallback offline secara terpisah.
6. **Race terbatas dan regresi.** Gunakan PostgreSQL dua worker dan gate terukur hanya untuk klaim interleaving transaksi yang memerlukannya. Jalankan regresi empat modul yang tersentuh setelah fix yang diotorisasi. Tidak mengulang audit seluruh superapp.

Eksekusi target mengikuti kontrol sandbox security-audit: network-none dengan loopback privat untuk integrasi, environment kosong berallowlist dummy, source/toolchain read-only, write scratch saja, serta batas CPU/memory/PID/file/disk/waktu. Tidak ada install dependency, akses `.env` operasional, host credential, port host atau koneksi provider. Target, queue, Reverb dan browser harus berhenti sebelum bukti minimum dipromosikan dengan prosedur descriptor/no-follow yang telah digunakan audit sebelumnya.

Runner lama tidak otomatis mendukung topologi Reverb ini. Parent harus memeriksa dependency/daemon lokal yang tersedia, menambah supervisor terisolasi dan allowlist artifact yang diperlukan, serta memverifikasi seluruh batas sebelum menjalankan target. Bila Reverb/toolchain tidak tersedia tanpa install, lapisan itu dicatat belum tervalidasi; fake broadcaster tidak diberi label tes Reverb aktual.

Tes health unit boleh mengendalikan clock, resolver/socket dan pemeriksaan health lain untuk mengisolasi satu kondisi; tandai fake-nya. Integrasi transport harus memakai daemon/queue sebenarnya untuk membuktikan delivery. Tes jam tidak perlu menunggu lima menit/satu jam nyata.

## 7. Reuse bukti dan file yang relevan

- `backend/tests/Feature/SuratTugasApprovalAndPortalNotificationTest.php`: awal fixture approval dan recipient A+B/C; belum otomatis menutup lifecycle delete/restore.
- `backend/tests/Feature/StKepegawaianNotificationQueueTest.php`: native serialize/restore/handle queue dan credential/module withdrawal dengan recording broadcaster; bukan bukti Reverb network delivery.
- `backend/tests/Feature/PortalPersonalSecurityTest.php` dan `PortalAuthSecurityTest.php`: kontrol personal/lifecycle terkait; pilih metode relevan.
- `backend/tests/Feature/StActorAcceptanceTest.php` dan `StLifecycleAcceptanceTest.php`: actor, mutasi dan rollback; tambah assertion notifikasi bila belum ada.
- `frontend/tests/surat-tugas-flow.playwright.cjs`, `kpg-flow.actual-app.cjs`, `kpg-identity.actual-app.cjs`: actual-app fixture yang relevan; pastikan source snapshot cocok.
- `frontend/tests/bmn-security-ui.playwright.cjs`: baca mekanisme fixture dahulu; jangan menganggap judul file membuktikan API/transport aktual.
- `backend/tests/self_check_notifications.php`: baca kontrak dan isolasinya terlebih dahulu; tidak dijalankan langsung pada host/deployment.

Source utama: `backend/app/Console/Commands/HealthMonitorCommand.php`, `backend/routes/console.php`, `backend/config/broadcasting.php`, `backend/app/Services/PortalNotificationService.php`, `backend/app/Events/PortalNotificationCreated.php`, `backend/app/Models/PortalNotification.php`, `backend/routes/channels.php`, `frontend/src/lib/echo.ts`, `frontend/src/app/portal/_components/NotificationBell.tsx`, `frontend/src/app/portal/page.tsx`, controller Surat Tugas/cuti dan `backend/app/Modules/BMN/Services/LoanService.php`.

## 8. Bukti, prioritas perbaikan dan acceptance akhir

Setiap hasil menyimpan case ID, source/fixture ref, aktor, credential mode (tanpa token), before/after state, ID notifikasi dummy, penerima, status response, channel/event, counter badge, urutan commit/job, dan artifact hash. Tulis `PASS`, `FAIL`, `BLOCKED_CONFIG`, `BLOCKED_POLICY` atau `NOT_RUN` dengan alasan. Skipped bukan lulus; hasil lama bukan hasil tes baru.

Jika kegagalan terbukti, perbaiki di jalur bersama yang benar-benar menimbulkannya: konfigurasi internal/proxy untuk Reverb, mutation lifecycle untuk penerbitan/trash/restore, dan consumer UI untuk stale reference/dedup/count. Gunakan queue, after-commit, service/helper dan mekanisme polling yang sudah ada bila sesuai; jangan menambah notification framework, broker atau dependency baru tanpa kebutuhan yang terbukti. Pengguna telah mengotorisasi eksekusi, perbaikan langsung, pengujian ulang, laporan/progress dan commit lokal; penerapannya dicatat pada laporan hasil.

Penutupan pelaksanaan membutuhkan:

- Penyebab error DNS dibedakan dari daemon/proxy/key/auth/queue dan dikaitkan ke konfigurasi yang benar-benar diamati.
- Alur approved→trash→klik lama→restore diperiksa dari Portal pegawai, baik realtime sehat maupun fallback, dengan penerima sah dan asing.
- Writer tunggal/bulk, kegagalan transaksi, retry dan delayed queue tidak meninggalkan notifikasi sukses yang menyesatkan menurut kontrak.
- Badge/history/detail tidak membawa data akun sebelumnya atau referensi yang sudah tidak dapat diakses.
- Alur BMN/cuti yang berbagi notifikasi tetap konsisten; hak akses dan state bisnis diuji bersama notification count.
- Laporan hasil membedakan bug terbukti, keputusan kebijakan, keterbatasan tool/deployment, dan hal yang belum dijalankan. Tidak menyatakan produksi sehat hanya dari fixture lokal.

Hasil akhir yang diharapkan: matriks terisi, reproduksi minimum untuk setiap kegagalan, perubahan dan alasan bila kemudian diotorisasi, regresi yang sesuai, serta laporan/progress yang merujuk receipt aktual. Rencana ini tidak mengubah tiga lead audit historis sebelumnya.
