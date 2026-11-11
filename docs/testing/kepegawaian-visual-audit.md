# Audit visual Kepegawaian

11 November 2026. Acuan penerapan mengikuti [Panduan Warna BKSDA SuperApp](../DESIGN_SYSTEM_COLORS.md) dan [Pedoman Animasi Animate UI](../animate-ui-motion-guidelines.md). Status akhir: perbaikan disimpan dalam satu commit lokal sesuai instruksi pengguna; tidak dipush. Catatan belum commit pada bagian pemeriksaan di bawah merekam status saat pemeriksaan tersebut.

## Cakupan dan alasan perubahan

| Area | Temuan | Perbaikan |
| --- | --- | --- |
| Shell dan dashboard | Header terpotong pada tablet ketika sidebar terbuka. Warna kontrol dan metadata belum seragam. Status aktivitas Surat Tugas memakai satu warna. | Header bertumpuk sampai breakpoint XL, aksi membungkus, dan konten utama memiliki min-width yang sesuai. Terapkan token biru Kepegawaian, teks pendukung 12 px dan badge semantik. Navigasi memiliki aria-current, label saat collapsed, serta Escape dan pengembalian fokus pada drawer mobile. |
| Dashboard ke daftar pegawai | Angka kategori mencakup pegawai nonaktif, tetapi tautan membuka daftar aktif. Pilihan Semua status juga menghilangkan parameter status dari API sehingga backend kembali memakai default aktif. | Tautan kategori, wilayah dan Kelola Semua Personil mengirim status=all. Daftar mengirim pilihan status secara eksplisit ke endpoint existing. Browser mengonfirmasi PNS berjumlah 97 setelah perbaikan, sesuai dashboard. Kartu ringkasan aktif di daftar diberi keterangan aktif agar maknanya jelas. |
| Grafik dashboard | Saat jumlah personel nol, persentase MMP dapat menjadi 100 persen. Batang wilayah kosong memiliki lebar minimum 5 persen. | Hitung persentase MMP dari jumlah sebenarnya dan batasi lebar wilayah pada 0–100 persen. Pertahankan hover personel 150 ms dan pengisian batang 600 ms yang menjadi acuan pengguna. |
| Daftar dan tambah pegawai | Terdapat tautan yang membungkus tombol, kontrol tanpa nama aksesibel, dan pilihan kategori yang belum menyatakan state. Data placeholder dapat menampilkan baris dari filter sebelumnya. | Gunakan satu elemen interaktif per aksi, label form, aria-pressed untuk kategori/status, dan kerangka loading saat data filter berikutnya disiapkan. Kegagalan kueri memakai Coba lagi. Pagination menunggu fetch selesai. |
| Detail dan biodata pegawai | Identitas visual masih Emerald, indikator tab memakai ID berulang, dan beberapa tombol ikon terlalu kecil. Foto hanya memperlihatkan aksi unggah saat hover. | Pakai token Kepegawaian, tab ber-ID unik dengan navigasi panah/Home/End dan indikator bawah 2 px. Tombol ikon berlabel memiliki target minimum 36 px. Bidang foto dapat dicapai lewat keyboard, terlihat pada mobile, dan memiliki feedback hover/fokus 150 ms. Input foto dinonaktifkan selama upload, lalu tersedia lagi saat berhasil atau gagal. |
| Hak akses dan lifecycle | Dialog perlu pengembalian fokus yang jelas. Aksi aktivasi dan penonaktifan membutuhkan warna sesuai konsekuensinya. | Gunakan Dialog existing dan referensi pemicu. Penonaktifan memakai destructive, aktivasi kembali serta pembatalan jadwal memakai primary. Penutupan dialog menunggu operasi pending selesai. |
| Inbox dan riwayat cuti | Campuran warna lama, kegagalan dapat terlihat seperti daftar kosong, dan cache ringkasan ditulis ke ref saat render. Bidang unggah tersembunyi dari keyboard. | Tokenisasi daftar, status dan dialog aktif. Gunakan data kueri existing tanpa cache ref tambahan. Tampilkan error dengan retry. Input unggah native tetap fokusable dan bidangnya memiliki outline 2 px saat fokus. Lampiran kembali ke tombol Berkas yang tetap berada di tabel setelah menu ditutup. |
| Pratinjau cuti | Surat izin A4 dipusatkan di dalam area sempit sehingga sisi kiri kertas berada di koordinat negatif dan terpotong. Toolbar memakai permukaan inverse yang menyulitkan teks pendukung. | Pakai toolbar netral dan scroller internal dengan pembungkus w-max/min-w-full. Kedua pratinjau memakai kertas sekitar 794 px yang tetap putih/hitam. Area gulir diberi nama dan dapat difokuskan. Template dokumen sumber tetap menjadi komponen cetak existing. |
| Uang Makan | Input file tidak masuk urutan Tab. Sel tanggal dan presensi hanya bisa diklik dengan mouse. Riwayat batch gagal dimuat dapat terlihat kosong. | Input native fokusable dengan feedback pada label. Sel memakai tombol native yang disabled untuk pengguna non-admin. Warna kode presensi tetap menyertai kode teks. Tampilkan loading/error/retry riwayat. Tab dan dialog memakai pola motion bersama dengan state koreksi di halaman induk. |
| Arsip Surat Masuk | Header dan modal lebar perlu menyesuaikan tablet/mobile. Modal custom memerlukan focus trap dan Escape. | Terapkan token, pointer, hover dan Dialog bersama pada detail, form, preview dan ekspor. Tiga bidang lampiran dapat difokuskan. Tabel memakai scroll internal dan kegagalan daftar ditampilkan dengan retry. |
| Pengaturan | Jenis cuti, hari libur dan alokasi bank memakai style lama. Subtab serta checkbox custom belum menjelaskan state ke keyboard/pembaca layar. | Tokenisasi panel, modal dan kontrol. Terapkan navigasi tab bersama pada panel utama, subtab hari libur/bank dan tab internal pengelolaan bank. Checkbox menyatakan checked/mixed. Kegagalan hari libur dan alokasi rekening ditampilkan secara terpisah dari empty. |

## Koreksi dashboard setelah umpan balik pengguna

Dashboard dipulihkan ke palet dan interaksi sebelum audit. Komposisi memakai biru blue-600, kuning amber-500 dan hijau emerald-500. Kartu kategori dan layanan kembali memakai keluarga warna asal. Penyebab perubahan warna kuning adalah pemakaian status-warning-fg pada batang kategori.

Entrance CSS 280 ms pada dashboard dihapus karena bertumpuk dengan transisi route 160 ms. Hover personel/layanan 150 ms, tap0.98, hover aktivitas x3 dan wilayah x2 serta pengisian batang600ms kembali mengikuti acuan sebelumnya. Reduced motion tetap memiliki cabang tanpa transform. Header responsif, filter status=all, kondisi error/loading dan nilai grafik nol tetap tercakup dalam pemeriksaan regresi.

Uji ulang Chrome mengonfirmasi tiga keluarga warna grafik, animation-name none pada root dashboard dan jarak antarpanel20px. Main clientWidth/scrollWidth pada tablet768px adalah482/482 dan mobile dark390px adalah360/360. TypeScript, ESLint, fixture Kepegawaian dan diff check lulus. Fixture memeriksa palet ketiga batang serta ketiadaan entrance tambahan. Bukti terbaru tersimpan sebagai kepegawaian-dashboard-restored.png.

## Fondasi bersama

- Token fondasi, status, secondary dan disabled pada globals.css kini dipakai oleh scope BMN, Surat Tugas dan Kepegawaian. Setiap scope menetapkan aksennya sendiri. Kepegawaian memakai Blue light #2563eb dengan teks putih dan dark #60a5fa dengan teks #0f172a.
- Aturan kontrol yang sudah ada di surat-tugas.css diperluas ke .kpg-ui agar pointer, fokus, warna tombol, Dialog dan reduced motion memakai perilaku yang sama. kepegawaian.css mengatur kebutuhan shell, tab, unggah, matriks dan hover tabel.
- KepegawaianDialog memakai primitive Dialog existing. KepegawaianTabContent mengikuti InboxTabContent Surat Tugas: fade/y8 masuk, fade/y-8 keluar, 160ms easeOut per fase; kontrol panel keluar inert. Lihat klarifikasi acuan terbaru di bawah untuk pembaruan hasil filter dan subtab bank. useKepegawaianTabs menghubungkan tab/panel dan navigasi keyboard. useDialogFocusReturn mendukung pemicu langsung serta pemicu menu yang tetap mounted.
- ConfirmDialog menerima scope Kepegawaian. EmployeeSelect memakai tombol native untuk opsi, nama aksesibel dan scope popover dari pemanggil.
- Kategori personel, wilayah dan identitas bank tetap memakai label pembeda. Status operasional mengikuti token semantik. Overlay foto memakai teks putih di atas hitam 75 persen agar terbaca di atas gambar pada kedua tema.

## Hasil browser

Chrome lokal dipakai untuk jalur yang benar-benar dirender aplikasi. Angka lebar mengacu pada CSS px, termasuk scrollbar browser.

| Skenario | Hasil |
| --- | --- |
| Dashboard pada 390, 768, 1024, 1440 dan desktop 1920 | Konten utama muat. Pada 768 px, main clientWidth/scrollWidth menjadi 482/482 setelah perbaikan header. Pada 390 px menjadi 360/360. |
| Klik kategori PNS | URL memuat jenis=PNS dan status=all. Hasil berjumlah 97 pegawai. |
| Daftar dan dialog hak akses | Aksi memakai pointer dan transisi 150 ms. Dialog terbuka pada light mode. Escape mengembalikan fokus ke Kelola Hak Akses. Tautan bertombol bersarang sudah tidak ditemukan di daftar dan tambah pegawai. |
| Profil dan lifecycle | Lima tab detail memiliki ID unik. Panah memindahkan tab dan panel yang sesuai. Dialog lifecycle dan reset password dibuka lalu dibatalkan. Kontrol foto dapat difokuskan, menampilkan overlay dan outline, dengan transisi 150 ms. |
| Tambah pegawai | Pilihan MMP/PNS, state pressed, label input/select dan isian nama diperiksa tanpa simpan. Nama contoh bertahan saat berganti kategori. Form muat pada mobile dark serta desktop light. |
| Cuti pada profil dan inbox | Form Catat Surat Izin dibuka pada mobile dark. Input file fokusable, label memakai pointer dan outline 2 px. Escape mengembalikan fokus. Lampiran scan asli lokal termuat dalam dialog 343 px, lalu fokus kembali ke Berkas setelah Escape. |
| Pratinjau formulir dan surat izin cuti | Memakai data contoh terisolasi. Kedua kertas sekitar 794 px, putih/hitam dan scroll internal. Sisi kiri surat izin berada di x33 terhadap scroller x17 setelah perbaikan. Halaman tetap 375 px pada viewport 390 px. |
| Uang Makan kosong dan fixture | Riwayat lokal kosong ditampilkan sebagai empty. Fixture memakai batch contoh dan adapter yang menolak API writes. Matriks, nominatif dan modal koreksi diuji pada mobile dark. Koreksi contoh dari H menjadi S bertahan setelah pindah tab. Tabel lebar tetap di scroller internal. Input file dapat difokuskan dan label mendapat outline 2 px. |
| Arsip Surat Masuk | Daftar, detail, tambah dan ekspor dibuka pada mobile dark. Form muat tanpa luapan, tiga input lampiran memiliki fokus keyboard, dan modal dapat ditutup dengan Escape. Tidak membuat arsip atau mengunduh ekspor. |
| Jenis cuti dan bank | Form serta konfirmasi hapus jenis cuti dibuka dan dibatalkan. Tombol hapus dark memakai #fb7185/#0f172a. Dialog rekening dan bank muat di mobile. Bank terpakai tampil Terkunci. Panah bekerja di tab bank internal. Checkbox halaman dipilih dengan Space lalu dibersihkan. Pada 768 px, main clientWidth/scrollWidth tetap 482/482. |
| Regresi Surat Tugas | Tombol Buat Surat Tugas di dalam shell Kepegawaian tetap mengambil scope surat-tugas. Browser dark mengukur background #38bdf8 dengan foreground #0f172a. |

Browser dipulihkan ke tema terang, viewport desktop dan tanpa dialog terbuka. Route fixture development sudah dihapus.

## Pemeriksaan otomatis

Pemeriksaan relevan di bawah lulus pada source akhir.

- Next typegen dan TypeScript frontend noEmit/incremental false.
- ESLint file TypeScript/TSX yang berubah serta fixture.
- kepegawaian-ui.cjs menguji perilaku keyboard dan ARIA, focus-return langsung/menu, panel keluar inert, fallback reduced motion, query status=all, tujuan tautan dashboard, semantik aksi lifecycle, guard dialog pending, serta validasi/pending/failure unggah foto dengan stub.
- Lima fixture BMN menguji regresi sidebar, aset, detail, dashboard motion dan grid/helper. Fixture warna kini mengukur kontras enam set token dari tiga modul pada light/dark.
- Impeccable source detector mengembalikan daftar temuan kosong setelah border dekoratif tebal pada profil dibersihkan.
- Diff check.

Tes tambahan portal-leave-callbacks.cjs memerlukan source pada mount Linux /frontend/src atau /baseline-frontend. Percobaan di workspace Windows berhenti pada pembacaan path, sehingga suite tambahan ini belum berhasil dijalankan.

## Batas pengujian

Uji browser menggunakan pembacaan data lokal, draft tanpa simpan, dan fixture contoh untuk uang makan serta pratinjau cuti. Akun browser yang tersedia memiliki peran Super Admin. Guard read-only diperiksa melalui source dan tombol matriks yang mengikuti isAdmin. Pengiriman pengajuan, persetujuan, perubahan hak akses/lifecycle, penghapusan, upload operasional, cetak dan unduhan aktual belum dijalankan. Emulasi reduced motion di browser tetap mengikuti preferensi pengguna untuk diuji mandiri. Cabang reduced motion diperiksa lewat source dan fixture.

Bukti visual tersimpan sebagai kepegawaian-create-desktop-light.png dan kepegawaian-cuti-fixture-mobile-dark.png pada folder visualisasi sesi.

## Koreksi tab dan sidebar setelah umpan balik lanjutan

Pengguna melaporkan navigasi tetap terasa berat dan menyukai perilaku sebelum audit. Perbandingan dengan HEAD menemukan entrance CSS280ms tambahan pada halaman selain dashboard, transisi geometri sidebar yang terhapus karena diganti transition-colors, indikator pill yang ditimpa menjadi garis bawah, serta animasi baru pada subtab bank yang sebelumnya langsung. Ini adalah regresi dari audit visual dan telah dikoreksi; tidak ada pengukuran FPS atau klaim profil performa runtime.

- Semua pemakaian kpg-page-enter dihapus. Route kembali memakai satu transisi160ms existing.
- Sidebar kembali memiliki width/transform200ms, hoverx2/tap0.98 selama120ms dan indikator spring420/32. Penutupan drawer mobile menunda visibility sampai transform selesai; reduced motion meniadakan penundaan/transisi.
- Tiga set tab utama (detail pegawai, pengaturan, uang makan) kembali memakai pill penuh/spring420/32 dan isi160ms/y8. Hasil filter pegawai/cuti/arsip kembali140ms/y4 dengan exit opacity saja. Panel keluar tetap inert dan ARIA/keyboard dipertahankan.
- Subtab hari libur/bank serta tab internal pengelolaan bank kembali langsung tanpa wrapper animasi tambahan.

Uji ulang: fixture Kepegawaian, TypeScript seluruh frontend, ESLint semua source/fixture yang berubah, dan diff check lulus. Fixture menjalankan varian tab/list, nilai reduced-motion0, exiting inert, keyboard/ARIA dan pemeriksaan dashboard existing. Tidak ada dependency atau API baru.

Chrome lokal mengonfirmasi sidebar288/80px, transition-property width/transform dengan durasi0.2s, pill36px dan warna light #2563eb/#ffffff serta dark #60a5fa/#0f172a. Panah/End/Home pada pengaturan dan End pada uang makan membuka panel sesuai. Subtab bank serta tab dialog bank dapat dipilih dan dialog ditutup dengan Escape. Pada390px Escape drawer mengembalikan fokus ke Toggle Menu Kepegawaian, drawer menjadi visibility:hidden setelah transisi, main360/360px. Pada768px main482/482px. Navigasi sidebar ke Uang Makan dan kembali ke Setting berhasil; tidak ada entrance CSS tambahan. Tema terang/viewport desktop dipulihkan. Bukti: kepegawaian-navigation-restored.png dalam folder visualisasi sesi. Pemeriksaan ini memvalidasi perilaku dan style, bukan benchmark kelancaran pada perangkat pengguna. Browser reduced motion tetap diuji pengguna.

Pedoman warna/animasi diperbarui untuk mempertahankan pola lama Kepegawaian. Belum commit, push atau deploy.

## Klarifikasi acuan: Kotak Masuk ke Menunggu Persetujuan

Pengguna menentukan transisi isi Inbox Surat Tugas sebagai acuan animasi Kepegawaian. Ketentuan ini menggantikan varian list140ms/y4 dan subtab bank langsung pada koreksi sebelumnya. Bentuk pill dan warna dashboard dipertahankan; animasi indikator sudah menggunakan spring420/32 seperti inbox. Sidebar/drawer tidak diubah pada penyesuaian ini.

KepegawaianTabContent kini memiliki satu konfigurasi isi yang sama dengan InboxTabContent: masuk opacity0/y8, keluar opacity0/y-8, tujuan opacity1/y0,160ms/easeOut per fase, mode wait dan initial=false. Helper dipakai pada tab profil/pengaturan/uang makan, hasil filter pegawai/cuti/arsip dan kedua tingkat subtab bank. Kontrol panel keluar inert dan reduced-motion memakai durasi0/jarak0. Tidak ada entrance halaman tambahan, stagger kartu atau dependency baru.

Fixture mengambil fungsi InboxTabContent asli dari AST source dan membandingkan initial/animate/exit/transition/inert dengan helper Kepegawaian untuk empat kombinasi normal/reduced serta present/exiting. Fixture, TypeScript, ESLint berkas yang disentuh dan diff check lulus. Browser menguji acuan inbox, klik dan keyboard tab pengaturan, subtab hari libur/bank, tab internal dialog bank, dan Escape. Draft contoh nama hari libur serta bank bertahan saat pindah tab, kemudian dikosongkan tanpa simpan. Main390px360/360 dan768px482/482 tanpa luapan. Satu klik setelah reset viewport belum memilih tab; Enter lalu klik ulang setelah layout stabil berhasil. Tidak ada error console yang tercatat pada pemeriksaan tersebut. Tema terang/viewport desktop dipulihkan; tidak ada transaksi data. Screenshot kepegawaian-inbox-motion-reference.png merekam hasil akhir statis, bukan rekaman kelancaran animasi. Browser reduced motion tetap diuji pengguna. Belum commit, push atau deploy.


## Empat perbaikan visual statis — 11 November 2026

| Temuan yang disetujui | Perbaikan dan alasan |
| --- | --- |
| Tanggal aktivitas pucat | Ganti slate-400/zinc-500 dengan token fg-muted light#475569/dark#a1a1aa; ukuran12px tetap. |
| Subjudul sidebar dan keterangan PPPK terpotong | Hilangkan uppercase/tracking/ellipsis pada SDM & Administrasi; keterangan kartu ringkasan membungkus agar NIPPPK terbaca lengkap. |
| Badge PENDING/APPROVED | Reuse getStatusLabel Inbox Surat Tugas, dengan normalisasi lowercase saat membaca. Menunggu Persetujuan/Diterbitkan mengikuti sumber istilah existing; nilai status data tidak berubah. Metadata membungkus agar label panjang muat pada mobile. |
| Dua lapisan dialog bank | Kelola bank dan edit rekening memakai satu permukaan/radius12px DialogContent. Hapus surface/border/radius/shadow pembungkus isi; padding dan primitive existing dipertahankan. |

Tidak mengubah animasi atau warna kategori dashboard. Snapshot AST sebelum/sesudah initial/animate/exit/transition/whileHover/whileTap/layoutId/mode di enam berkas (shell, dashboard, daftar, komponen dashboard, bank dan helper tab) sama persis. Fixture Kepegawaian membandingkan animasi tab dengan Inbox asli, menguji tiga palet grafik serta600ms, dan menguji label aktivitas pending/approved/completed/rejected/draft/unknown memakai helper sebenarnya. Tidak menambah dependency, endpoint atau API writes.

Validasi teknis: fixture Kepegawaian, TypeScript seluruh frontend, ESLint source/fixture terkait dan diff check lulus. Validasi Chrome lokal:

- Dashboard light: tanggal rgb(71,85,105), dark:rgb(161,161,170); badge Menunggu Persetujuan/Diterbitkan dan semantik warning/success terlihat. Tiga batang tetap blue-600/amber-500/emerald-500. Pada390px dark, metadata membungkus dan main360/360px.
- Sidebar desktop: SDM & Administrasi tampil penuh, clientWidth/scrollWidth113/113. Tablet768px: subjudul membungkus dalam85px dengan tinggi33px dan main482/482px.
- Daftar mobile390px: keterangan ASN aktif pemilik NIPPPK membungkus menjadi dua baris, tidak ellipsis, clientWidth/scrollWidth120/120. Semua keterangan kartu muat pada359px; main329/329px, dan390px main360/360px.
- Kelola bank dan edit rekening: outer radius12px; inner border0/shadow none. Dialog kelola dark390px memiliki clientWidth/scrollWidth343/343 dan permukaan#18181b. Escape menutup tanpa simpan; dialog kelola mengembalikan fokus ke Tambah Bank. Tidak ada perubahan rekening/bank operasional.

Bukti visual: kepegawaian-four-visual-fixes.png, kepegawaian-readability-mobile.png dan kepegawaian-bank-single-surface.png pada folder visualisasi sesi. Screenshot adalah bukti statis, bukan benchmark animasi. Browser kembali ke dashboard light1920px, tanpa dialog. Emulasi reduced motion tidak dijalankan ulang sesuai preferensi pengguna. Pedoman warna/animasi serta progress diperbarui. Belum commit, push atau deploy.


## Pelembutan badge dan ikon pendukung dashboard — 11 November2026

Pengguna meminta aksen pendukung lebih tenang tanpa mengubah tiga warna grafik atau animasi. Dua penanda CSS ditambahkan pada11 deklarasi pembungkus ikon dan13 deklarasi badge (baris aktivitas merender beberapa instance). Aturan hanya berlaku di .kpg-ui.kpg-dashboard: background campuran currentColor5% dan surface95%; border ikon campuran currentColor12% dan surface88%; border badge transparan. Foreground, ukuran, font, layout dan label existing tetap. Tidak mengubah opacity elemen, token global, grafik wilayah atau tombol utama.

Validasi source sebelum/sesudah membuktikan dua berkas TSX identik setelah dua nama class penanda dihapus. CSS existing juga identik setelah tiga aturan warna ditambahkan dikeluarkan. Ini menjaga semua animasi, hover/tap, initial/animate/exit/transition, link, logika data dan grafik tetap. Fixture Kepegawaian, TypeScript seluruh frontend, ESLint kedua source terkait serta diff check lulus.

Chrome menguji desktop1920 light/dark, dashboard dark390px, light359px dan tablet768px. Grafik komposisi tetap blue-600/amber-500/emerald-500. Semua badge muat tanpa overflow359/390px; lebar main berturut-turut329/329,360/360 dan482/482 pada768px. Kontrol menu dapat dibuka dengan Enter dan ditutup Escape, dengan fokus kembali ke pemicu. Tema light dan viewport desktop dipulihkan tanpa dialog.

Warna computed30 elemen aktual per tema (16 badge,14 ikon) disimpan pada kepegawaian-support-computed-colors.json. Perhitungan WCAG luminance pada background sRGB dan foreground yang diturunkan dari aturan campuran5%/95% memberikan minimum teks sekitar4.71:1 light/6.27:1 dark, ikon3.02:1 light/5.33:1 dark. Pembulatan mengikuti CSSOM, dan pengujian ini terbatas pada badge/ikon yang ditandai dalam data dashboard saat diperiksa. Tidak mengklaim pengukuran fatigue, sertifikasi seluruh halaman atau benchmark FPS.

Bukti statis kepegawaian-soft-support-light.png dan kepegawaian-soft-support-dark.png tersimpan pada folder visualisasi sesi bersama snapshot source sebelum perubahan serta ringkasan kontras. Tidak ada API writes, perubahan aset/pegawai atau dependency baru. Browser reduced motion tetap diuji pengguna sesuai preferensi; source/fixture motion tetap. Pedoman warna, pedoman animasi dan progress diperbarui. Belum commit, push atau deploy.


## Penyerahan commit lokal — 11 November2026

Seluruh perbaikan visual Kepegawaian beserta helper Dialog/tab/focus-return, perluasan kontrol/token bersama, fixture, pedoman warna/animasi dan progress disimpan dalam satu commit lokal. Kondisi final mempertahankan animasi pilihan pengguna dan tiga warna grafik dashboard, dengan aksen pendukung lebih lembut. frontend/AGENTS.md yang dibuat otomatis oleh Next tetap di luar cakupan commit.

Validasi akhir: TypeScript frontend, ESLint semua source/fixture yang berubah, fixture Kepegawaian dan lima fixture regresi BMN (Data Aset, grid/foto, dashboard motion, detail dan sidebar), serta staged diff check lulus. Tidak menjalankan ulang transaksi operasional atau emulasi reduced motion browser. Batas pengujian lain tetap seperti tercatat di atas. Tidak push atau deploy.
