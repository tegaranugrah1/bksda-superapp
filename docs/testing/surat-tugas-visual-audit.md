# Audit visual Surat Tugas

11 November 2026. Acuan penerapan mengikuti [Panduan Warna BKSDA SuperApp](../DESIGN_SYSTEM_COLORS.md) dan [Pedoman Animasi Animate UI](../animate-ui-motion-guidelines.md).

## Temuan dan perbaikan

| Area | Temuan | Perbaikan dan alasan |
| --- | --- | --- |
| Pengajuan publik | Permukaan terang dan biru lama masih muncul di tema gelap. Kontrol unggah kurang jelas saat hover dan fokus. | Terapkan scope Surat Tugas pada tiga langkah, termasuk pemilih personel, tombol, status hasil, serta bidang unggah. Input file tetap native dan dapat dicapai dengan Tab. Kegagalan memuat personel tampil dengan aksi Coba lagi agar dapat dibedakan dari hasil pencarian kosong. |
| Inbox dan pembaca | Aksi baris sulit ditemukan pada layar sentuh. Warna tab bersaing dengan status. Daftar dan pembaca sebelumnya dapat tertinggal saat pindah kategori. | Gunakan garis bawah Sky untuk tab terpilih dan badge semantik untuk status. Tambahkan navigasi panah/Home/End, checkbox native, dan tombol subjek terpisah. Aksi tetap terlihat pada layar sempit. Tutup pembaca dan bersihkan pilihan saat mengganti tab. Panel keluar menjadi inert selama animasi dan data placeholder tidak menjadi baris yang dapat dipilih. Tampilkan error dan retry secara terpisah. |
| Builder dan lampiran | Toolbar dan area A4 dapat meluap di layar sempit. Drawer dan pratinjau perlu mengembalikan fokus setelah ditutup. | Susun panel di bawah satu sama lain pada layar sempit. Geser kertas secara horizontal di dalam preview. Terapkan feedback pada kontrol edit, panel Dasar Surat dan menu ekspor. Pratinjau lampiran memakai Dialog bersama dengan Escape, focus trap dan pengembalian fokus ke tombol Lihat Dokumen. |
| Pengaturan Kepegawaian | Form dan dialog Template Surat Tugas, Jenis Surat Tugas, dan Sumber Dana masih memakai style lama. | Pakai token yang sama untuk ketiga panel, pembatas halus, aksi ikon berlabel, dan Dialog bersama. Aksi hapus permanen memakai Rose. |
| Portal | Kartu daftar memakai stagger dan beberapa kontrol tidak mengikuti scope Surat Tugas. Pratinjau A4 kehilangan fokus setelah Escape. | Ringkas motion daftar, gunakan satu elemen interaktif per aksi, dan terapkan token ke daftar, menu laporan, pratinjau dialog dan detail Portal. Tutup dialog native sebelum melepas komponennya agar fokus kembali ke pemicu. |
| Verifikasi publik | Warna status dan gerak hover dekoratif mengaburkan hasil verifikasi. | Gunakan label dan ikon status semantik serta satu entrance halaman. |

## Warna dan interaksi

- Aksi utama, tab aktif, seleksi dan fokus memakai Sky. Tombol utama light `#0369a1/#ffffff`, dark `#38bdf8/#0f172a`. Gunakan permukaan netral untuk panel, border-subtle untuk input dan border transparan untuk tombol sekunder. Status memakai pasangan success, warning, danger, info, atau neutral sesuai makna.
- Kontrol aktif memakai pointer dengan feedback warna 150 ms. Kontrol disabled memakai cursor default. Fokus keyboard memakai outline 2 px dengan offset 2 px. Tombol aksi baris inbox memiliki target minimal 36 px.
- Entrance halaman 280 ms sekali. Wizard dan isi tab inbox bergerak 8 px dengan opacity selama 160 ms per fase. Indikator tab memakai garis 2 px dan spring 420/32. Isi pengajuan disimpan pada halaman induk agar tetap tersedia saat kembali ke langkah sebelumnya.
- Dialog, dropdown dan drawer 150 ms. Pratinjau native Portal memakai fade 150 ms. CSS scoped mematikan animasi dan transisi saat reduced motion. Cabang Framer memakai durasi 0.
- Kertas A4 tetap putih dengan teks hitam. Tema aplikasi berlaku pada toolbar, panel dan dialog di sekelilingnya.

## Hasil pengujian

| Pengujian | Hasil |
| --- | --- |
| Inbox lokal, Chrome, light/dark dan 390 px | Tab berganti dengan panah, checkbox dipilih dengan Space, aksi baris tetap terlihat dengan pointer dan transisi 150 ms. Dialog pindah ke sampah dapat dibatalkan dengan Escape dan fokus kembali. Filter lanjutan juga mengembalikan fokus setelah Escape. Saat beralih ke Sampah pada split-pane, pembaca dibersihkan dan kontrol daftar yang sedang keluar menjadi inert. |
| Lampiran lokal | Dialog 343 px pada viewport 390 px memuat preview lampiran, fokus masuk ke dialog, Escape menutupnya dan fokus kembali ke Lihat Dokumen. |
| Pengajuan publik | Pemilih personel dapat dipakai lewat keyboard. Isian keterangan bertahan setelah mundur dan maju lagi. Fokus dari keyboard pada input file terlihat di bidang unggah. |
| Builder, pengaturan dan verifikasi publik | A4 Builder sekitar 794 px dengan scroll internal pada mobile. Dasar Surat mendukung Escape dan fokus kembali. Ketiga panel pengaturan dibuka. Dialog Jenis Tugas dan konfirmasi hapus Sumber Dana diuji hingga pembatalan. Verifikasi dokumen sah dan kondisi dokumen gagal diuji. |
| Portal dan pratinjau A4 | Akun lokal menunjukkan daftar kosong. Menu Buat Laporan membuka kedua opsi, memakai fade 150 ms, dan mengembalikan fokus setelah Escape. Pratinjau memakai fixture data contoh terisolasi. Pada viewport 390 px, kertas sekitar 794 px tetap putih/hitam dengan scroll internal. Escape mengembalikan fokus ke pemicu. Fixture sementara telah dihapus. |
| Regresi statis dan fixture | Next typegen, TypeScript frontend, ESLint file yang berubah dan diff check lulus. Lima fixture BMN lulus. Fixture token mengukur kontras pasangan warna utama, sekunder, border kontrol dan badge semantik Surat Tugas dan BMN di light/dark. |

Browser dikembalikan ke tema terang dan viewport desktop. Pengujian visual memakai data lokal secara read-only serta draft dan fixture sementara. Pengiriman pengajuan, persetujuan, penghapusan, unduhan dan cetak aktual belum dijalankan pada audit ini. Alur Portal dengan surat yang benar-benar dimiliki akun masih perlu akun uji yang memiliki surat. Emulasi reduced motion di browser tetap mengikuti preferensi pengguna untuk diuji mandiri.
