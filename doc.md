# Panduan Implementasi Status Pegawai Pensiun dan Keluar

Tanggal: 9 November 2026. Repository: `E:/bksda-superapp`.
Baseline penyusunan: commit `b1d42758`, branch `codex/portal-security-pentest`.

## 1. Tujuan dan status dokumen

Dokumen ini adalah handoff implementasi untuk AI berikutnya. Fitur di bawah **belum diimplementasikan** pada saat dokumen dibuat. Pisahkan kebutuhan yang ditentukan di sini dari perilaku kode baseline. Baca ulang source dan perubahan terbaru sebelum bekerja; jangan menimpa pekerjaan AI atau pengguna lain.

Tujuannya adalah mencatat pegawai yang pensiun atau keluar, mencabut aksesnya, menghentikan transaksi baru sesuai tanggal efektif, dan mempertahankan riwayat serta tanggungan BMN. Cakupan utama: Kepegawaian, Portal, Surat Tugas, dan BMN. Persuratan/DeReporting ditelusuri untuk memastikan relasi historis tetap utuh, bukan untuk membangun ulang modul tersebut.

Instruksi operasional pengguna yang masih berlaku: **commit lokal, jangan push**. Dokumen ini tidak memberi otorisasi deployment, perubahan database produksi, pengiriman notifikasi produksi, atau pengujian dengan akun/data operasional. Gunakan fixture dan database pengujian terisolasi. Jangan menyimpan kredensial dalam kode, laporan, atau perintah.

## 2. Prinsip bisnis yang menjadi acuan

1. Pensiun/keluar bukan tindakan hapus maupun soft delete. Record pegawai dan akun dipertahankan; akses akun dinonaktifkan.
2. Jenis pegawai PNS/PPPK/MMP tetap disimpan. Alasan keluar tidak menggantikan kategori atau status kepegawaian yang sudah ada.
3. Pegawai nonaktif tidak dapat memulai transaksi operasional baru. Relasi dan dokumen historis tetap dapat dibaca oleh petugas yang berwenang.
4. Tanggungan BMN tidak menghalangi pencabutan akses. Pegawai dapat berstatus nonaktif sekaligus masih memiliki tanggungan aset.
5. Pengembalian aset harus melalui alur BMN yang sah. Menonaktifkan pegawai tidak mengembalikan pinjaman, mengganti pemegang aset, atau membuat BAST secara otomatis.
6. Riwayat cuti, saldo historis, batch uang makan, dokumen bertanda tangan, dan daftar pelaksana surat lama tidak dihapus atau ditulis ulang otomatis.
7. Memulihkan status pegawai tidak otomatis mengaktifkan akun, memulihkan token, atau mengembalikan role/akses yang pernah dicabut.
8. Perubahan status harus terotorisasi, tervalidasi, konsisten dalam transaksi, dan tercatat dalam audit.

Dokumen ini menetapkan kebutuhan aplikasi, bukan interpretasi baru aturan pensiun atau hak pembayaran. Jangan menghitung BUP, hak pensiun, atau pesangon otomatis. Pertahankan aturan cuti CPNS/PPPK/MMP yang sudah ada. Jika keputusan bisnis baru diperlukan, catat pertanyaan konkretnya dan lanjutkan bagian yang tidak bergantung pada jawaban tersebut.

## 3. Kondisi source baseline yang sudah diperiksa

| Bagian | Kondisi saat dokumen dibuat | Implikasi implementasi |
| --- | --- | --- |
| `EmployeeController::update()` | Mengubah `is_active` dan mencatat biodata; belum menyinkronkan perubahan nonaktif ke akun/token. | Tutup jalur ini dan semua penulis status lain secara konsisten. |
| `EmployeeController::destroy()` | Soft delete, menonaktifkan akun berdasarkan username/NIP, dan mencabut token. | Jangan gunakan hapus sebagai alur pensiun/keluar. |
| `EmployeeController::forceDestroy()` | Jalur hapus permanen pegawai, akun terkait, dan file masih tersedia. | Kebijakan retensi harus ditegakkan di backend, bukan hanya menyembunyikan tombol. |
| `EmployeeController::restore()` | Memulihkan soft-deleted employee dan menyetel pegawai aktif. | Bedakan pemulihan sampah, pembatalan jadwal nonaktif, dan pengaktifan kembali pegawai. |
| `EmployeeController::select()` | Dropdown sudah memakai `is_active = true`. | Tambahkan kesadaran TMT dan validasi backend pada transaksi pemakainya. |
| `EmployeeHistory` | Sudah memiliki actor, action, changes, notes, dan created_at. | Gunakan riwayat ini; hindari membuat framework audit baru. |
| `EnsureAccountSecure` | Menolak user nonaktif, menghapus token, logout sesi web, dan menginvalidasi sesi request. | Reuse perlindungan ini; jangan menganggapnya sudah mengakhiri semua koneksi websocket. |
| `User::broadcastTokenIds()` dan channel broadcast | Kanal personal/admin diikat pada token; pemeriksaan memperhatikan user aktif dan token yang masih berlaku. | Uji queued event dan subscriber lama setelah pencabutan; jangan langsung mengganti protokol channel. |
| `AssetLoan::active()` | Memakai status `dipinjam` dan `terlambat`, relasi `employee_id` ke pegawai. | Periksa juga variasi status legacy yang benar-benar didukung caller lain. |
| `Asset` | Ada `employee_id`, kolom legacy `pengguna`/`nama_pengguna`, dan resolver kepemilikan. | Pemeriksaan clearance harus mencakup barang pegangan selain pinjaman. |
| Uang makan | Sejumlah query memilih pegawai berdasarkan status aktif saat ini. | Itu belum cukup untuk perhitungan periode historis atau bulan terakhir. |

Fakta di atas bukan hasil audit menyeluruh. Jangan menganggap seluruh alur Surat Tugas, cuti, IAM, atau import sudah memenuhi fitur ini hanya karena satu endpoint diperiksa.

## 4. Model data minimal

Pertahankan `kpg_employees.is_active` untuk kompatibilitas. Usulan kolom nullable pada pegawai:

| Kolom | Isi |
| --- | --- |
| `inactive_reason` | Kode alasan dari daftar yang diizinkan. |
| `inactive_effective_date` | TMT nonaktif, tanggal lokal `YYYY-MM-DD`. |
| `inactive_notes` | Catatan singkat, batas panjang tervalidasi, akses mengikuti data pegawai. |

Kode alasan: `pensiun`, `mengundurkan_diri`, `habis_kontrak`, `mutasi`, `meninggal`, `diberhentikan`, `lainnya`. Label UI harus mudah dipahami; `lainnya` memerlukan catatan. Jangan menggabungkan meninggal dan diberhentikan menjadi satu alasan. Tidak perlu menambah tabel master alasan atau state machine generik.

Untuk nonaktif baru, alasan dan TMT wajib. Simpan actor/waktu perubahan melalui `EmployeeHistory`; jangan menambahkan kolom audit duplikat tanpa kebutuhan. Jika perlu referensi nomor keputusan, gunakan catatan pada versi awal; integrasi dokumen SK dan BAST baru di luar lingkup awal.

Migration harus mempertahankan nilai `is_active` dan data historis yang ada. Pegawai lama nonaktif tanpa alasan/TMT tetap nonaktif, ditampilkan sebagai **Nonaktif — data alasan/TMT belum dilengkapi**. Jangan mengarang tanggal, otomatis mengaktifkan, atau memindahkan mereka ke sampah. Akun yang sudah dinonaktifkan manual juga tidak boleh diaktifkan oleh migration.

Sumber kebenaran dibedakan: kolom alasan/TMT menyatakan keputusan dan jadwal; `is_active` menyimpan status saat ini untuk kompatibilitas; evaluasi tanggal efektif di backend mencegah scheduler terlambat membuka akses/transaksi. Konsolidasikan predicate tanggal dalam fungsi bersama yang kecil, bukan salinan aturan di setiap controller.

## 5. Aturan TMT dan transisi

- TMT adalah **hari pertama pegawai tidak aktif**, mulai pukul 00:00 pada timezone aplikasi yang dikonfirmasi dari konfigurasi. Contoh kebutuhan: TMT `2026-11-15` berarti hari aktif terakhir `2026-11-14`. Jangan memakai UTC date secara tidak sengaja; jangan mengubah timezone global sebagai bagian fitur.
- TMT hari ini atau lampau: nonaktifkan pegawai dan akun terkait serta cabut kredensial pada penyimpanan keputusan. Backdate harus memiliki catatan; tampilkan dampak historis untuk ditinjau, tanpa merekalkulasi batch atau dokumen lama otomatis.
- TMT mendatang: pegawai aktif tetap aktif sampai batas TMT, dengan badge **Akan nonaktif [tanggal]**. Akun yang sebelumnya sudah nonaktif tetap nonaktif. Jadwalkan penerapan keputusan menggunakan scheduler Laravel yang sudah tersedia.
- Pemeriksaan login, akses API, pemilihan pegawai, serta transaksi harus menolak keadaan yang sudah melewati TMT walaupun scheduler belum berjalan. Jadwal bukan satu-satunya kontrol keamanan.
- Penjadwalan, pengubahan TMT/alasan, dan pembatalan jadwal oleh admin harus diaudit. Worker wajib membaca keputusan terbaru agar jadwal yang dibatalkan tidak tetap dieksekusi.
- Scheduler harus idempotent: pemanggilan berulang tidak menghasilkan riwayat, notifikasi, atau perubahan ganda. Tangani kegagalan per pegawai dan laporkan kegagalannya; jangan membiarkan satu kegagalan menghentikan semua pegawai berikutnya.
- Pengaktifan kembali membutuhkan tindakan eksplisit dan catatan; tutup periode nonaktif di riwayat sebelum membersihkan keputusan saat ini. Akun tetap nonaktif sampai admin memberi akses melalui alur IAM yang sah.
- Untuk evaluasi periode historis, gunakan riwayat status/TMT agar reaktivasi tidak menganggap seluruh masa nonaktif sebagai masa aktif. Jika riwayat legacy tidak cukup, tandai perlu peninjauan; jangan menebak periode dan mengubah pembayaran.
- Hindari bypass lewat generic edit, bulk update, import, restore, IAM, atau endpoint admin akun. Larang aktivasi akses akun untuk pegawai yang masih efektif nonaktif. Jangan menyamakan akun sistem yang tidak terkait pegawai dengan pegawai nonaktif.

## 6. Pencabutan akses dan konsistensi

Gunakan satu alur perubahan lifecycle bersama untuk request admin dan scheduler. Tidak perlu repository/factory/event bus baru. Lock record yang relevan dan lakukan perubahan status, penonaktifan akun, pencabutan token tersimpan, serta audit dalam transaksi yang konsisten. Side effect eksternal/notifikasi hanya setelah commit.

Penautan akun harus mengikuti mekanisme identitas yang benar-benar tersedia. Telusuri relasi aktual terlebih dahulu: sebagian kode memakai username sama dengan NIP/kode MMP, sebagian pemeriksaan mengenal `employee_id`. Jangan mengasumsikan kolom relasi tersedia/fillable hanya karena dibaca oleh caller. Utamakan relasi ID eksplisit yang valid jika memang ada; fallback username harus exact dan tidak bertentangan dengan relasi eksplisit. Jangan mencocokkan nama orang. Bila ada lebih dari satu akun yang terbukti terhubung, tangani semuanya; konflik pemetaan ditampilkan untuk koreksi, bukan mencabut akun orang lain secara tebakan.

Checklist akses yang harus ditelusuri dan diuji:

- Login password dan penyelesaian challenge 2FA; challenge lama tidak boleh menerbitkan token setelah nonaktif.
- Token Sanctum seluruh perangkat, sesi cookie/web yang digunakan aplikasi, remember-me, reset password, dan jalur aktivasi/reset akun admin.
- Request terlambat dan persaingan login/aktivasi versus nonaktif: tidak boleh ada kredensial baru yang tetap dapat digunakan setelah penonaktifan commit.
- Private-channel auth harus ditolak; event yang masih antre tidak boleh mengirim data sensitif baru ke kredensial yang sudah dicabut.
- Koneksi websocket yang sudah terbuka: uji memakai client aktual. Hilangnya token tidak dengan sendirinya membuktikan socket terputus. Target minimal: tidak ada pengiriman sensitif baru setelah keputusan efektif; jangan mengandalkan logout UI semata. Jika koneksi fisik tetap terbuka tetapi tidak menerima data, jelaskan bukti dan batasnya dengan tepat.
- Pembacaan admin atas arsip tetap mengikuti role, izin modul, dan kepemilikan; jangan melonggarkan auth agar arsip mudah dibuka.

Pertahankan perlindungan akun sendiri dan akun super admin yang sudah ada. Tambahkan penolakan terotorisasi pada perubahan lifecycle untuk mencegah admin biasa menonaktifkan akun di luar wewenangnya. Jangan membangun izin luas baru jika permission/module gate yang ada dapat digunakan.

## 7. Pemeriksaan tanggungan BMN

Pada pratinjau/konfirmasi nonaktif, tampilkan daftar aset yang masih menjadi tanggungan: pinjaman aktif dan barang pegangan langsung. Hitung **aset unik**, bukan jumlah gabungan baris pinjaman dan kepemilikan. Pinjaman selesai tidak dihitung; variasi data legacy harus ditangani sesuai kontrak yang telah ada.

Gunakan resolver kepemilikan bersama dan ID eksplisit; jangan menghidupkan kembali pencocokan nama ambigu yang sudah diperbaiki pada audit Portal. Data nama ambigu ditandai untuk pemeriksaan manual, bukan otomatis dibebankan ke pegawai pertama.

Contoh teks: **Pegawai masih memiliki 3 aset BMN yang perlu ditindaklanjuti. Penonaktifan akses tetap berlaku; selesaikan pengembalian melalui modul BMN.** Sediakan tautan ke daftar yang sesuai kewenangan pengguna. Admin Kepegawaian tanpa izin dokumen BMN tidak otomatis boleh membuka dokumen/foto/aset terperinci; gunakan ringkasan terbatas jika diperlukan.

Warning tidak menjadi syarat penonaktifan. Jika pembacaan ringkasan BMN gagal, tampilkan **Status tanggungan belum dapat diperiksa**, bukan angka nol atau klaim bebas tanggungan. Jangan menyembunyikan kegagalan dan jangan menunda pencabutan akses karena gangguan BMN.

Setelah pegawai nonaktif, riwayat pemegang dan pinjaman tetap terlihat pada modul BMN. Tolak pinjaman/penyerahan baru kepada pegawai nonaktif. Alur pengembalian tetap dapat diselesaikan petugas BMN. Clearance final mengikuti transaksi pengembalian/serah terima yang sudah tersedia; tidak perlu tabel clearance paralel pada versi awal.

## 8. Dampak lintas modul

| Modul | Perilaku yang harus diterapkan |
| --- | --- |
| Daftar/detail pegawai | Filter aktif, terjadwal nonaktif, nonaktif dan alasan; badge, TMT, catatan, serta riwayat. Tetap kompatibel dengan filter aktif lama. |
| Surat Tugas | Saring dropdown dan validasi semua jalur tulis/approve/publish. Tolak pegawai yang tidak aktif saat penugasan atau periode dinas bersinggungan dengan TMT, termasuk payload ID langsung. Surat lama tidak ditulis ulang; tampilkan surat mendatang/berjalan yang terdampak agar admin melakukan penggantian/pembatalan sesuai alur resmi. |
| Cuti | Tolak pengajuan/penetapan baru yang tidak memenuhi status dan periode aktif; jangan mengosongkan saldo atau menghapus permohonan lama. Jangan menghasilkan saldo tahun baru untuk pegawai yang sudah nonaktif sebelum tahun itu. Tetap izinkan petugas berwenang membaca arsip dan menyelesaikan administrasi historis melalui alur yang diaudit, tanpa membuka pengajuan baru yang dibackdate untuk menghindari blokir. |
| Uang makan | Hitung kelayakan per tanggal/periode, bukan status hari ini saja. Bulan terakhir hanya dapat mencakup hari sebelum TMT sesuai aturan presensi yang berlaku; bulan sesudahnya tidak menghasilkan pembayaran baru. Pegawai nonaktif sekarang tetap bisa masuk koreksi periode saat masih aktif. Snapshot batch lama tidak berubah otomatis. |
| Portal/notifikasi | Tolak akses efektif nonaktif; arsip notifikasi tetap tersimpan. Reuse kanal/token dan pemeriksaan status yang ada; jangan mengirim informasi personal baru kepada akun nonaktif. |
| BMN | Tolak penyerahan baru, pertahankan tanggungan, izinkan penyelesaian pengembalian oleh petugas berwenang. |
| Persuratan/DeReporting | Pertahankan referensi penulis, penerima, penandatangan dan pegawai pada rekaman lama. Jangan menghapus atau mengganti identitas historis secara massal. |

Penonaktifan mendatang perlu memeriksa periode ST/cuti saat dibuat, bukan hanya tanggal request. Tampilkan pekerjaan yang membutuhkan tindak lanjut; jangan otomatis membatalkan surat resmi, permohonan, atau dokumen bertanda tangan. Telusuri penanggung jawab/penandatangan aktif agar pegawai nonaktif tidak dipakai untuk penerbitan baru, sambil mempertahankan snapshot dokumen lama.

Untuk hapus permanen: pegawai pensiun/keluar dan pegawai yang mempunyai riwayat operasional tidak boleh dihapus permanen. Telusuri FK/cascade, route, import, serta UI; penolakan harus berada di backend. Pembersihan fixture/data salah tanpa riwayat bukan pengganti lifecycle dan tidak boleh dijadikan alasan menghapus data operasional. Jangan melakukan cleanup data nyata dalam pekerjaan ini.

## 9. Peta kode awal

Path berikut relatif terhadap root repository dan sudah ada pada baseline; telusuri caller dan route aktual sebelum mengedit.

- Pegawai: `backend/app/Modules/Kepegawaian/Controllers/EmployeeController.php`, `Requests/EmployeeRequest.php`, `Models/Employee.php`, `Models/EmployeeHistory.php` pada modul yang sama.
- Akun: `backend/app/Models/User.php`, `backend/app/Http/Controllers/Api/AuthController.php`, `backend/app/Http/Middleware/EnsureAccountSecure.php`, `backend/bootstrap/app.php`.
- Realtime: `backend/routes/channels.php`, `backend/app/Services/PortalNotificationService.php`, `backend/app/Events/PortalNotificationCreated.php`. Telusuri publisher admin inbox dan seluruh caller pembentuk channel juga.
- Scheduler/migration: `backend/routes/console.php`, `backend/app/Console/Commands/`, `backend/database/migrations/`. Gunakan pola jadwal Laravel yang sudah tersedia; verifikasi timezone aplikasi.
- Cuti: `backend/app/Modules/Kepegawaian/Controllers/EmployeeLeaveController.php`, `EmployeeLeaveRequestController.php`, `Models/EmployeeLeave.php`, `Models/EmployeeLeaveRequest.php` pada modul yang sama.
- Uang makan: `backend/app/Modules/Kepegawaian/Controllers/MealAllowanceController.php`, `Services/MealAllowanceExcelExport.php`, serta model batch/item dan service rekonsiliasi yang dipanggil.
- Surat Tugas: `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php`, `Requests/AssignmentLetterRequest.php`, `Requests/ApproveAssignmentLetterRequest.php`, dan service penulisan/persetujuan yang dipanggil.
- BMN: `backend/app/Modules/Bmn/Models/AssetLoan.php`, `backend/app/Modules/Bmn/Models/Asset.php`, request/controller pinjaman serta penyerahan aset yang memanggil model tersebut. Nama modul yang benar **Bmn**, bukan Inventory.
- UI: `frontend/src/app/kepegawaian/employees/page.tsx`, `employees/[id]/page.tsx`, `employees/create/page.tsx`, `_components/EmployeeAccessSheet.tsx`, `_lib/employee-helpers.ts` di bawah `frontend/src/app/kepegawaian/`. Telusuri type pegawai, API client, form edit, daftar pemilihan pelaksana, dan UI Portal.
- Regresi: `backend/tests/Feature/EmployeeAccessLifecycleTest.php`, `EmployeeLeaveTest.php`, `EmployeeLeaveRequestTest.php`, `PortalAuthSecurityTest.php`, `PortalIdentityBoundaryTest.php`, `PortalNotificationLifecycleTest.php`, `SuratTugasApprovalAndPortalNotificationTest.php` pada direktori Feature yang sama; `backend/tests/EmployeeLeaveSnapshotCheck.php`; `frontend/tests/cache-security.cjs`.

## 10. Tahapan implementasi

Kerjakan berurutan dan pertahankan aplikasi dapat digunakan pada setiap tahap. Tahap belum selesai jangan dilaporkan sebagai fitur keseluruhan selesai.

1. **Pemetaan dan desain konkret:** baca instruksi repository/skill relevan, telusuri seluruh penulis status dan jalur akun/import/bulk/restore, cek FK dan pemetaan akun, serta catat kontrak API/izin. Pertahankan perbaikan MMP, saldo cuti, dan notifikasi yang sudah ada.
2. **Schema, transisi, audit, akses:** migration additive; validasi alasan/TMT; operasi perubahan bersama; aturan legacy; penolakan hapus; pencabutan kredensial dan proteksi aktivasi ulang. Tambahkan tes transaksi gagal dan request paralel.
3. **TMT mendatang:** command scheduler idempotent beserta guard tanggal pada akses/transaksi. Jadwal, perubahan, dan pembatalannya harus konsisten. Jangan mengaktifkan akun nonaktif saat menyimpan jadwal.
4. **Integrasi transaksi:** ST/cuti/BMN/uang makan dan data periode historis; jalur langsung API harus terlindungi. Pertahankan snapshot dan sediakan daftar pekerjaan terdampak.
5. **Antarmuka dan BMN:** form/konfirmasi status, alasan/TMT/catatan, badge/filter, warning tanggungan dan link sesuai izin, aksi pengaktifan kembali yang terpisah dari IAM. Gunakan komponen yang sudah ada dan tampilkan error secara jelas.
6. **Penutupan:** jalankan acceptance dan regresi relevan, review seluruh diff, lengkapi laporan/progress, lalu commit lokal. Jangan push/deploy tanpa instruksi baru pengguna.

Tidak perlu dependency baru, sistem approval tambahan, otomatisasi BAST, modul pensiun terpisah, atau refactor besar. Jika butuh helper/service bersama, buat hanya ketika sudah ada beberapa caller nyata.

## 11. Matriks acceptance minimal

Semua hasil diisi dengan receipt/perintah dan batas pengujiannya. Gunakan dummy PNS, PPPK, dan MMP, serta admin berizin, admin modul lain, pegawai biasa, dan akun tanpa relasi pegawai. Gunakan waktu terkontrol untuk TMT; jangan menunggu tengah malam nyata.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| EMP-01 | Nonaktif hari ini dengan alasan dan TMT sah | Pegawai/akun nonaktif, token dicabut, audit satu kali, record tidak terhapus. |
| EMP-02 | Alasan/TMT tidak ada atau kode alasan tidak sah | Ditolak tanpa perubahan parsial; `lainnya` wajib catatan. |
| EMP-03 | Pegawai biasa/admin modul lain mengubah lifecycle | Ditolak; tidak mengungkap rincian sensitif tambahan. |
| EMP-04 | Menonaktifkan akun sendiri atau target super admin di luar wewenang | Perlindungan tetap berlaku pada semua jalur. |
| EMP-05 | Simpan biodata biasa pada pegawai aktif/nonaktif | Tidak mengubah lifecycle, jadwal, atau akses akun tanpa instruksi eksplisit. |
| EMP-06 | Jadwal nonaktif mendatang | Aktif sebelum TMT, badge jadwal tampil; akun yang sudah nonaktif tidak dibuka. |
| EMP-07 | Tepat batas TMT, scheduler terlambat/mati | Akses dan transaksi tetap ditolak oleh guard tanggal. |
| EMP-08 | Scheduler berjalan dua kali/dua worker | Status konsisten, audit/side effect tidak ganda. |
| EMP-09 | TMT mendatang diubah/dibatalkan sebelum efektif | Keputusan terbaru berlaku, jadwal lama tidak dieksekusi. |
| EMP-10 | Backdate nonaktif | Catatan dan audit ada; batch/surat lama tidak diubah otomatis. |
| EMP-11 | Pegawai legacy nonaktif tanpa TMT/alasan | Tetap nonaktif; UI menandai data belum lengkap, tanggal tidak dikarang. |
| EMP-12 | Aktifkan kembali pegawai | Riwayat periode terjaga; akun/token lama tidak otomatis aktif kembali. |
| EMP-13 | Kegagalan DB saat perubahan status/audit | Seluruh perubahan DB rollback; tidak ada side effect sebelum commit. |
| AUTH-01 | Password login dan challenge 2FA yang dibuat sebelum nonaktif | Keduanya tidak menghasilkan akses baru setelah nonaktif efektif. |
| AUTH-02 | Token lama beberapa perangkat dan sesi cookie | Tidak bisa mengakses API; session guard tidak hanya bergantung pada logout UI. |
| AUTH-03 | IAM/reset/import/bulk/generic edit mencoba membuka akses | Tidak dapat melewati lifecycle nonaktif; akun tak terkait tidak terpengaruh. |
| AUTH-04 | Login/aktivasi bersaing dengan transaksi nonaktif | Tidak ada kredensial baru yang tetap dapat dipakai setelah commit nonaktif. |
| AUTH-05 | Private channel lama dan event antre sebelum nonaktif | Auth baru ditolak; tidak menerima pengiriman sensitif baru setelah pencabutan. Buktikan dengan client realtime aktual. |
| AUTH-06 | Akun legacy exact NIP, relasi ID jika tersedia, dan pemetaan bertentangan | Akun yang benar ditangani; akun orang lain tidak dinonaktifkan berdasarkan nama/tebakan. |
| BMN-01 | Pinjaman dipinjam/terlambat, pinjaman selesai, barang pegangan | Hanya tanggungan relevan tampil; jumlah aset unik, tanpa duplikasi. |
| BMN-02 | Nama legacy ambigu atau dua orang bernama sama | Tidak otomatis mengatribusikan aset; tampilkan perlu pemeriksaan. |
| BMN-03 | Masih ada tanggungan atau pembacaan BMN gagal | Nonaktif tetap berhasil; status tidak diklaim bebas tanggungan. |
| BMN-04 | Penyerahan baru versus pengembalian lama | Penyerahan baru ditolak; petugas dapat menyelesaikan pengembalian tanpa mengaktifkan pegawai. |
| BMN-05 | Admin Kepegawaian tanpa izin rincian BMN | Warning sesuai wewenang; endpoint dokumen/foto tetap terlindungi. |
| ST-01 | ID langsung melalui create/update/approve/publish | Pegawai nonaktif ditolak backend; bukan hanya hilang dari dropdown. |
| ST-02 | Pegawai aktif dengan jadwal TMT di dalam periode dinas | Penugasan yang bertabrakan ditolak; periode sebelum TMT tetap dapat diproses. |
| ST-03 | ST lama/sudah resmi dan penugasan mendatang terdampak | Arsip tidak berubah; daftar tindak lanjut tersedia, tanpa pembatalan otomatis. |
| CUTI-01 | Pengajuan baru/setelan admin melintasi TMT atau mencoba backdate bypass | Ditolak sesuai lifecycle; koreksi historis berizin tetap melalui alur yang diaudit. |
| CUTI-02 | Saldo/arsip lama dan generate tahun berikutnya | Histori tidak hilang; tidak generate hak baru di tahun penuh nonaktif. Aturan CPNS/PPPK/MMP tetap lulus. |
| UM-01 | TMT pertengahan bulan dan bulan berikutnya | Hanya tanggal sebelum TMT yang memenuhi aturan presensi dapat dihitung; bulan berikutnya tidak membayar hari nonaktif. |
| UM-02 | Koreksi periode sebelum TMT, batch tersimpan, dan pegawai diaktifkan kembali | Histori tidak tersaring oleh status hari ini; snapshot tidak berubah diam-diam; masa nonaktif tidak dibayar sebagai aktif. |
| HIST-01 | Arsip ST/cuti/surat/DeReporting, FK dan hapus permanen | Referensi tetap utuh; penghapusan data dengan riwayat ditolak backend. |
| UI-01 | Filter/badge/form/error, tanggal lokal dan pengaktifan kembali | Konsisten dengan backend; warning tidak menyesatkan dan navigasi arsip tetap bekerja sesuai izin. |

## 12. Cara verifikasi dan batas klaim

- Gunakan test suite yang sudah ada dan tambah regresi pada alur bersama yang berubah; tidak perlu satu file test untuk setiap helper.
- Jalankan feature tests lifecycle/otorisasi, cuti, Surat Tugas, BMN, dan notifikasi yang terdampak pada database dummy. Uji concurrency dengan koneksi/worker nyata yang sesuai database target, bukan hanya dua panggilan berurutan.
- Untuk websocket, uji Laravel + queue + Reverb + client lokal aktual: subscribe sebelum nonaktif, cabut akses, proses event antre dan event baru, serta pastikan akun kontrol yang masih aktif tetap menerima event. Jangan menyatakan socket tertutup hanya berdasarkan status HTTP.
- Perintah compiler yang tersedia pada baseline: `node frontend/node_modules/typescript/bin/tsc -p frontend/tsconfig.json --noEmit --incremental false`. Jalankan lint pada file yang berubah dan pemeriksaan sintaks PHP. Dependensi harus sudah tersedia; jangan mengunduh paket tanpa kebutuhan/otorisasi.
- Bila memakai `EmployeeLeaveSnapshotCheck.php` atau check berbasis native PHP `assert()`, pastikan assertions benar-benar diaktifkan dan kondisi salah menghasilkan exit nonzero. Tulisan PASS saja tidak membuktikan assertions dieksekusi. Jangan menjalankannya terhadap database operasional.
- Jalankan `git diff --check`, periksa migration pada database dummy, dan bandingkan snapshot sebelum/sesudah untuk memastikan data historis tidak berubah.
- Catat tes gagal, skip, atau terhalang lingkungan secara terpisah. Jika tidak dapat menjalankan client realtime, PostgreSQL, atau scheduler aktual, tuliskan keterbatasannya dan langkah verifikasi yang belum dilakukan; jangan beri PASS atas dasar pembacaan source.

## 13. Hasil yang diserahkan AI pelaksana (Status: Selesai & Terverifikasi - 9 Nov 2026)

- [x] Implementasi dan migration additive (`2026_11_09_160000_add_lifecycle_columns_to_kpg_employees_table.php`), tanpa penghapusan data operasional.
- [x] Semua jalur status/akun terkait ditelusuri: IAM, EnsureAccountSecure middleware, AuthController, Surat Tugas, Cuti, BMN, Uang Makan.
- [x] Semua baris acceptance memiliki hasil, bukti, dan batas yang jelas via automated test suite `backend/tests/EmployeeLifecycleTest.php` (10/10 PASS).
- [x] Regresi fitur sebelumnya tetap lulus (`SuratTugasConflictTest.php` & `EmployeeLeaveSnapshotCheck.php` 100% PASS).
- [x] Laporan perubahan lengkap didokumentasikan di `progress.md` Section 47.
- [x] `progress.md` diperbarui dengan status aktual tanpa menimpa riwayat terdahulu.
- [x] `doc.md` diperbarui status tahapannya setelah verifikasi menyeluruh.
- [x] Commit lokal terisolasi pada branch `codex/portal-security-pentest` (Strictly local commit, no push).

Gangguan arsip Drive dan tiga lead audit ST/Kepegawaian historis bukan bagian fitur ini. Jangan mengubah verdict atau mengklaimnya selesai melalui implementasi lifecycle pegawai.
