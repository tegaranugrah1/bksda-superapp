# Portal mobile — perbaikan temuan dan refactor tahap 1

Tanggal: 19 November 2026. Basis: `b9a2aa59`, branch `codex/portal-security-pentest`.

## Batas perubahan

Desain yang sudah disetujui dipertahankan: header Kemenhut, forest/mint, surface light/dark, bentuk kartu, radius, padding, margin, bottom navigation dan animasi tema. `createPortalStyles` dipindahkan verbatim ke `portalStyles.ts`; perbandingan terhadap HEAD identik setelah normalisasi akhir baris. Komponen portal berkurang dari 4.906 menjadi sekitar 2.900 baris. Tidak menambah dependensi.

## Temuan yang ditangani

| Area | Perbaikan |
| --- | --- |
| Login 2FA | Faktor pertama menyimpan challenge hanya di memori; sesi belum dibuka sampai OTP/kode pemulihan sah. Respons login yang tidak memiliki token/user ditolak. |
| Kewajiban keamanan akun | `/me` mengirim flag aman untuk wajib ganti kata sandi / pengaturan 2FA. Navigator menahan portal sampai kewajiban selesai; kunci dan kode pemulihan hanya berada di state sementara. |
| Sesi 401 / akun nonaktif | Interceptor memberi event ke AuthProvider untuk membersihkan identitas, token dan Reverb. Generasi sesi mencegah error lama mengakhiri sesi baru; refresh tertunda tidak memulihkan profil sesudah logout. Download native juga menangani 401. |
| Token browser | Bearer mobile web berada di memori, native tetap SecureStore. Token localStorage lama dihapus setelah migrasi. Browser memulihkan sesi melalui cookie HttpOnly dan meminta token realtime di `/me`; marker logout nonrahasia mencegah pemulihan otomatis sesudah logout yang gagal di server. Kredensial realtime dienkripsi dalam sesi server dan dipakai ulang selama valid agar reload tidak memenuhi batas token/perangkat lain. |
| API / WebSocket | Alamat API eksplisit dihormati. URL berisi kredensial, query, fragment atau protokol lain ditolak. Build rilis/produksi dan halaman HTTPS mewajibkan HTTPS; Reverb tidak dapat diturunkan ke `ws` bila API HTTPS/produksi. Request API tidak boleh mengirim bearer ke origin lain. |
| Profil duplikat | Rute Profile lama diarahkan ke tab profil portal. Implementasi profil lama beserta data contoh dihapus. |
| Data contoh / cuti | Modal aset/riwayat yang tidak terjangkau dan daftar tugas/cuti contoh dihapus. Saldo yang belum tersedia ditampilkan sebagai belum tersedia; pengajuan tahunan tidak mengasumsikan 12 hari. |
| Lonceng notifikasi | Membuka sheet notifikasi terbaru, status memuat/gagal/kosong, hitungan belum dibaca, tandai dibaca, dan navigasi ke tab yang dikenal. ID notifikasi tetap diperiksa backend berdasarkan pemilik; tidak mengikuti URL arbitrer dari payload. Metadata `unread_count` dipertahankan oleh normalizer. |
| Reverb admin modul | Pemilihan penerima memperhitungkan `module_roles` beserta alias Kepegawaian/Surat Tugas, lalu tetap menggunakan pemeriksaan akses dan token aktif yang sudah ada. |
| Pratinjau / cetak | Browser memakai iframe, native WebView tanpa JavaScript dan navigasi keluar. Template meng-escape data teks, membatasi URL gambar dan menambahkan CSP. SPT mengunduh berkas resmi melalui API berotorisasi; cuti/laporan diekspor sebagai PDF native atau dialog cetak browser. Kesalahan terlihat, tombol dilindungi dari kirim ganda. Scan cuti dibatasi PDF/JPEG/PNG/WebP. Foto laporan dipilih sebagai base64 agar dapat ikut dicetak di native. |
| Tombol laporan | Tombol yang sebelumnya tidak memiliki handler sekarang menjalankan cetak/simpan dengan label yang sesuai. Alur laporan web yang diperiksa juga berupa cetak/ekspor; tidak membuat endpoint pengiriman fiktif. |
| Ketersediaan publik | Anonim menerima boolean bentrok dan satu pesan umum, tanpa nama, jenis cuti, referensi atau rentang tanggal yang tersimpan. Parameter pengecualian surat diabaikan untuk anonim. Validasi pegawai nonaktif tidak membocorkan TMT. Banner web menerima pesan umum dengan gaya yang sama; pegawai login tetap memperoleh rincian operasional sesuai kebijakan sebelumnya. |

Pemeriksaan ketersediaan publik sengaja tetap dapat digunakan tanpa login; hasil untuk periode yang diminta masih merupakan informasi ketersediaan, bukan mekanisme untuk menyembunyikan seluruh kemungkinan inferensi jadwal.

## Konfigurasi sesi browser

Origin mobile web harus termasuk `SANCTUM_STATEFUL_DOMAINS` dan CORS yang mengizinkan credentials. Default Sanctum kini mencakup localhost dan 127.0.0.1 port 8081/19006. Jika variabel tersebut diatur eksplisit saat deployment, sertakan origin yang benar di sana. Gunakan hostname yang konsisten antara browser dan API saat HTTP lokal; produksi memakai HTTPS dan domain cookie yang sesuai. Restart backend/config cache diperlukan bila memakai konfigurasi ter-cache. Tidak mengubah nilai rahasia atau environment deployment pada sesi ini.

## Verifikasi dan batas bukti

- Analisis statis TypeScript mobile dan frontend memakai compiler API langsung, tanpa emit atau menjalankan kode aplikasi: **0 diagnostik**.
- Pemeriksaan sintaks PHP (`php -l`) untuk berkas berubah: **valid**.
- Perbandingan fungsi stylesheet terhadap HEAD: **identik**; token surface tetap.
- Graph kode diperbarui: 15.737 node, 29.567 edge, 1.032 komunitas, AST tanpa LLM. 29 berkas sumber non-code yang tidak menghasilkan node tetap menjadi keterbatasan tool graph; label komunitas yang berubah memakai nama hub otomatis.
- Unit regression disiapkan/diperbarui untuk challenge 2FA, cleanup sesi, penolakan origin lain, cookie/token memori, konfigurasi HTTPS/WSS, metadata notifikasi, escaping HTML, ekspor PDF dan redirect profil.
- Suite backend diperbarui untuk privasi konflik anonim, pengecualian jadwal, admin modul dan migrasi bearer ke cookie beserta enam reload tanpa pertambahan token.
- Fixture Playwright profil, BMN dan SPT disesuaikan dengan bootstrap cookie/token memori; API/CSRF dan WebSocket memakai fixture.
- **Jest, PHPUnit, lint yang mengeksekusi konfigurasi proyek, browser E2E dan perangkat fisik belum divalidasi ulang untuk hasil akhir ini.** Skill `security-audit` mensyaratkan eksekusi target di sandbox OS tanpa jaringan eksternal, environment allowlist, sumber/toolchain read-only, scratch terbatas dan batas resource. Lingkungan saat ini belum menyediakan semua kontrol tersebut. Jangan menganggap tes yang baru ditulis telah lulus. Uji awal sebelum pengetatan batas eksekusi juga tidak membuktikan hasil kode akhir.

Di lingkungan sandbox yang memenuhi syarat, jalankan suite auth/API/storage/files/profile/Reverb mobile, suite backend terkait pada SQLite `:memory:` dengan layanan eksternal palsu, lalu fixture Playwright pada server lokal terisolasi. Periksa login 2FA benar/salah/batal, reload sesi, logout 200/500, 401 dari tab selain profil, notifikasi dan kepemilikannya, serta preview/cetak PDF dan gambar. Bandingkan keempat tab pada 360/440px, landscape, light/dark. Jangan gunakan akun atau mutasi data nyata untuk regresi.

## Tahap refactor berikutnya

Pemisahan render setiap tab dan hook pengambilan data dapat dilanjutkan setelah regresi runtime tahap 1 lulus. Stylesheet yang dipindah sengaja belum dirombak agar perubahan perilaku dan tampilan dapat dinilai terpisah. Pengguna menyetujui checkpoint tahap 1; disimpan sebagai commit lokal, belum di-push. Status pengujian tetap sesuai batas bukti di atas.


## Tahap 2 — Pemuatan data dan tab Tugas (19 November 2026)

Basis checkpoint `105dca21`. Atas instruksi pengguna, tahap berikutnya dilanjutkan sebagai pemisahan kode mekanis; status validasi runtime tahap 1 tetap belum selesai.

- `usePortalData.ts` menampung state dan lima loader personal: surat tugas, pengajuan cuti, saldo cuti, aset tetap dan pinjaman. Eligibility saldo, pengecualian aset yang sedang dipinjam, waktu pembaruan pinjaman, urutan request, fallback saat gagal, dan refresh fokus/foreground/Reverb mempertahankan implementasi sebelumnya. Hook tetap dipasang sekali di portal, sehingga perpindahan tab tidak memasang ulang pemuat data.
- `PortalTasksTab.tsx` menampung JSX tab Tugas, hitungan dan filter Semua/Berjalan/Selesai. Filter terpilih dan handler pratinjau tetap dimiliki portal agar pilihan bertahan saat berpindah tab. Komponen memakai fragment dan styles/warna/metrik/shadow yang sama, tanpa penambahan container tampilan.
- `portalHelpers.ts` menampung helper yang kini dipakai Beranda dan Tugas: palette status, ringkasan judul, sumber dana, tanggal dan predikat status. Isi fungsi dipertahankan. Export `extractSuratTugasDalamRangka` dari modul portal lama tetap tersedia untuk kompatibilitas.
- Halaman utama berkurang dari 2,899 menjadi 2,595 baris. Tahap ini tidak mengubah endpoint, backend, session/auth, hak akses, desain, warna, bentuk kartu, spacing atau animasi.

Verifikasi statis setelah perubahan:

- Compiler TypeScript mobile, tanpa emit: **0 diagnostik**.
- Perbandingan AST terhadap checkpoint: keseluruhan JSX portal sama setelah komponen Tugas diekspansi; binding props, style inline, teks dan urutan elemen sama. Seluruh isi lima loader, callback refresh, registrasi fokus/foreground/Reverb, pemisahan aset, timestamp dan helper/filter yang dipindah sama.
- Berkas `portalStyles.ts` tetap identik setelah normalisasi akhir baris; konstanta header, surfaces light/dark dan daftar modul identik.
- Regresi `usePortalData.test.tsx` disiapkan untuk lima endpoint tanpa request tambahan saat rerender, saldo nol, pemisahan aset/pinjaman lintas tipe ID, refresh Reverb/foreground, refresh cuti saja, eligibility akun tanpa pegawai/MMP dan fallback kegagalan. **Jest/browser/perangkat belum dijalankan**; persyaratan sandbox OS skill security-audit masih berlaku sebagaimana bagian batas bukti tahap 1.

Pemisahan render Profil dan Layanan BMN/cuti tetap merupakan kandidat tahap berikutnya. Pengguna menyetujui checkpoint tahap 2; perubahan disimpan sebagai commit lokal dan belum di-push. Hasil pemeriksaan statis serta status runtime yang belum tervalidasi tetap dicatat di atas.

Graph kode tahap 2 diperbarui: 15.753 node, 29.640 edge dan 1.059 komunitas, melalui AST tanpa LLM.


## Tahap 3 — Profil dan Layanan (19 November 2026)

Basis checkpoint `fc27961d`. Memisahkan render Profil dan Layanan tanpa mengubah desain yang sudah disetujui.

| Berkas | Tanggung jawab |
| --- | --- |
| `PortalProfileTab.tsx` | Identitas, foto, kontak, ringkasan dan menu profil. Resolusi identitas/foto/saldo yang hanya dipakai profil berada di komponen ini. |
| `PortalServicesMenu.tsx` | Kartu layanan aset, pinjaman, cuti dan kalkulator, beserta alur membuka subhalaman yang sama. |
| `PortalAssetsView.tsx` | Daftar BMN aset/pinjaman, pencarian, kategori, pilihan grid/list, foto dan keterangan status. Perhitungan hasil pencarian/kategori yang hanya dipakai daftar berada di komponen ini. |
| `PortalLeaveView.tsx` | Ringkasan saldo, pilihan tahun, daftar pengajuan dan aksi cuti yang sama. Perhitungan ringkasan dan daftar tahun berada di komponen ini. |
| `portalAssetHelpers.ts` | Helper foto, kategori, kondisi dan merk/tipe yang dipakai bersama Beranda dan BMN/Profil; isi fungsi sama dengan sebelumnya. |
| `portalViewTypes.ts` | Tipe props tampilan bersama dan tujuan subhalaman layanan; tanpa state/store baru. |

State pencarian, kategori, mode grid/list, tahun cuti, kegagalan foto, notifikasi profil, pilihan tab dan visibilitas modal tetap dimiliki portal. Tampilan hasil ekstraksi menerima nilai dan setter yang sama, sehingga pelepasan komponen saat berpindah tab tidak menghapus pilihan. Modal kontak/foto/pangkat, kata sandi, logout, pengajuan/pembatalan cuti dan pratinjau tetap berada di lokasi serta alur yang sama. Komponen baru memakai fragment tanpa menambah container layout, hooks atau pemuat data.

Halaman utama berkurang dari 2,595 menjadi 1,594 baris. `portalStyles.ts`, `PortalTasksTab.tsx`, `usePortalData.ts`, endpoint, backend, hak akses, session/auth, header, warna, bentuk kartu, spacing dan animasi dipertahankan. `getLeaveStatusMeta` dipindah ke helper bersama tanpa mengubah isi fungsi. Tidak menambah dependensi.

Verifikasi:

- Compiler TypeScript mobile tanpa emit: **0 diagnostik**.
- Perbandingan AST terhadap checkpoint: seluruh JSX portal sama setelah empat komponen diekspansi, termasuk props, atribut, teks, style inline dan handler. Semua state/handler di induk, modal/refresh, perhitungan yang dipindah serta helper foto/kategori/kondisi/merk/status identik. File stylesheet, hook data dan tab Tugas tetap identik; konstanta header, tema light/dark dan modul sama.
- Sintaks dua fixture Playwright yang diperluas valid. Kasus tambahan memeriksa pencarian/kategori/mode BMN sesudah Profil → Layanan → Aset, notifikasi/foto profil sesudah berpindah tab, serta filter tahun cuti setelah Profil → Riwayat Cuti.
- **Jest, browser E2E, pengukuran render/piksel dan perangkat fisik belum dijalankan.** Batas sandbox OS skill security-audit dari tahap sebelumnya tetap berlaku; kesetaraan AST/style adalah bukti statis, bukan hasil uji runtime. Rencana regresi tahap 1/2 tetap berlaku ditambah skenario persistensi baru di atas.

Atas instruksi pengguna tahap ini dilanjutkan tanpa menganggap validasi runtime tahap sebelumnya sudah selesai. Pengguna menyetujui checkpoint tahap 3; perubahan disimpan sebagai commit lokal, belum di-push. Hasil pemeriksaan statis dan status runtime yang belum tervalidasi tetap dicatat di atas.

- Graph kode tahap 3 diperbarui setelah perubahan akhir: 15.772 node, 29.740 edge dan 1.048 komunitas melalui AST tanpa LLM.


## Tahap 4 — Beranda dan modal portal (19 November 2026)

Basis checkpoint `d03c2081`. Memisahkan sisa tampilan Beranda dan lima Modal inline sambil mempertahankan desain serta perilaku yang ada.

- `PortalHomeTab.tsx`: kartu sambutan/identitas, ringkasan pegawai, modul berotorisasi, tugas berjalan dan pinjaman utama. Resolusi nama/NIP/jabatan/pangkat, tanggal/sapaan, daftar modul, ringkasan dan pemilihan aktivitas yang hanya dipakai Beranda ikut dipindah tanpa mengubah isi perhitungannya.
- `PortalQuickActionsModal.tsx`: aksi SPT dan cuti. Ref `pendingAssignmentNavigation` tetap dimiliki portal dan diteruskan dengan identitas yang sama. Web tetap menunggu `onDismiss`, melepas fokus, lalu berpindah ke form; native tetap mengikuti urutan semula.
- `PortalLoansModal.tsx`: daftar pinjaman aktif dengan data, status, tanggal dan tombol tutup yang sama.
- `PortalSbmModal.tsx`: tampilan kalkulator/estimasi yang sudah ada, tanpa mengubah nilai atau logika fitur.
- `PortalLeaveModals.tsx`: dua komponen, konfirmasi pembatalan cuti dan pratinjau scan. Status sibuk, aksi batal/konfirmasi, format berkas, iframe/gambar, unduhan browser dan pembukaan berkas native sama. Validasi isi scan dan pembersihan blob URL tetap berada pada handler portal.
- `portalViewTypes.ts`: tipe props modal bersama dan bentuk state scan yang sama; tanpa state/store atau dependency baru.

State, ref, pengambilan data, handler modal/cuti/berkas dan navigasi tetap di portal. Hitungan tugas dan aset yang dipakai bottom nav tetap di induk dan juga diteruskan ke Beranda. Modal yang sebelumnya sudah berupa komponen (profil, kata sandi, logout, pengajuan/cetak cuti dan surat tugas) tetap dipanggil di tempat yang sama. Lima Modal inline tetap memiliki urutan, props, animasi, tombol dan node native Modal yang sama; tidak memakai wrapper tampilan tambahan.

Halaman utama berkurang dari 1,594 menjadi 683 baris. Header, bottom nav, stylesheet, warna, bentuk kartu, spacing, animasi, endpoint, backend, autentikasi/otorisasi dan komponen hasil tahap 2/3 dipertahankan.

Verifikasi:

- TypeScript mobile tanpa emit: **0 diagnostik**. Sintaks tiga fixture Playwright yang diubah valid.
- Perbandingan AST terhadap checkpoint: seluruh JSX portal setelah ekspansi Beranda/lima modal sama, termasuk handler `onDismiss`, fokus/navigasi SPT, aksi berkas native, props dan urutan modal. State/ref, callback refresh/cleanup, hitungan nav, daftar modul dan perhitungan Beranda identik. Bentuk state scan tidak berubah. `portalStyles.ts`, `usePortalData.ts` dan seluruh tampilan tahap 2/3 tetap identik.
- Fixture diperluas untuk membuka Profil dari Beranda, membuka/menutup pinjaman dan SBM, membatalkan aksi cepat dengan tombol/Escape tanpa navigasi tertinggal, kembali dari konfirmasi pembatalan cuti, serta membuka pratinjau gambar scan dan memverifikasi pelepasan blob URL ketika ditutup. Alur SPT lama tetap memeriksa fokus pada tab tersembunyi.
- **Jest/browser E2E/perangkat fisik dan pemeriksaan piksel belum dijalankan.** Persyaratan sandbox OS skill security-audit dari tahap sebelumnya tetap berlaku. Kesetaraan AST/style dan validitas sintaks adalah bukti statis; tidak mengklaim regresi runtime lulus.

Pengguna menyetujui checkpoint tahap 4; perubahan disimpan sebagai commit lokal, belum di-push. Hasil pemeriksaan statis dan status runtime yang belum tervalidasi tetap dicatat di atas. Rencana validasi runtime tahap sebelumnya tetap berlaku beserta skenario modal tambahan ini.

- Graph kode tahap 4 diperbarui setelah perubahan akhir: 15.794 node, 29.807 edge dan 1.050 komunitas melalui AST tanpa LLM. Ponytail diterapkan dengan ekstraksi blok yang sudah ada, helper/dependency yang dipakai ulang, serta state/ref tetap di induk tanpa store atau lapisan baru.


## Tahap 5 — Header dan bottom nav portal (19 November 2026)

Basis checkpoint `989e2d8b`. Memisahkan dua bagian navigasi yang tersisa tanpa mengganti desain atau perilakunya.

- `PortalHeader.tsx`: logo Kemenhut, identitas instansi, tombol tema dan notifikasi beserta indikator unread. Konstanta `BKSDA_FOREST` diekspor dari header dan dipakai juga oleh backing halaman; satu nilai hijau yang sama menjaga perbaikan garis putih pada lengkungan. Handler tema tetap menerima event agar asal animasi tidak berubah.
- `PortalBottomNav.tsx`: Beranda, Tugas, FAB, Layanan dan Profil, dengan ikon, warna aktif, badge tugas/aset, shadow, ukuran dan spacing yang sama. Tombol Layanan tetap mengatur tab sekaligus subhalaman menu; FAB tetap membuka modal aksi cepat yang ada.
- `PortalDashboardScreen.tsx`: menggunakan dua komponen tersebut tanpa menambah node View. State tab/subhalaman/modal, ref SPT, hook/model notifikasi, hitungan badge dan tema tetap di induk. StatusBar, backing hijau, permukaan melengkung di luar ScrollView, urutan modal, cleanup berkas dan navigasi tetap sama.

Halaman utama berkurang dari 683 menjadi 568 baris. Kedua komponen menerima props/state/setter yang sudah ada, tanpa hook, dependency, store atau lapisan abstraksi baru. Stylesheet, desain, warna, bentuk kartu, spacing, endpoint, backend dan hak akses tidak berubah. Ponytail diterapkan untuk menjaga perubahan terbatas pada pemisahan blok.

Verifikasi:

- TypeScript mobile tanpa emit: **0 diagnostik**. Sintaks fixture `frontend/tests/mobile-personal-assets.playwright.cjs` valid.
- Perbandingan AST terhadap checkpoint: seluruh JSX portal sama setelah dua komponen diekspansi, termasuk props, atribut, style inline, teks dan handler. Semua state/ref/effect/handler serta perhitungan induk identik. Konstanta forest/surface sama; tidak ada hooks dalam dua komponen baru. Seluruh 34 file dashboard lama selain halaman utama, termasuk stylesheet, hook data dan hasil refactor tahap sebelumnya, tidak berubah.
- Fixture yang sudah ada diperluas untuk tema gelap/terang dengan header hijau tetap, logo dan identitas bersama saat membuka Profil, persistensi tema antartab, warna tab aktif, refresh/tutup notifikasi, serta penekanan Layanan dari daftar BMN kembali ke menu. Alur FAB, penutupan dan fokus/navigasi SPT tetap dicakup fixture tahap sebelumnya.
- **Browser E2E, Jest, perangkat fisik dan pemeriksaan piksel belum dijalankan.** Skill security-audit mewajibkan proses target hanya berjalan dalam sandbox OS dengan jaringan terisolasi, environment allowlist, target/toolchain read-only dan batas resource; kontrol tersebut belum tersedia. AST/style/typecheck adalah bukti statis, bukan kelulusan runtime.

Rencana verifikasi runtime di lingkungan sandbox yang memenuhi syarat: jalankan fixture aset pribadi, profil dan surat tugas menggunakan akun/data dummy; periksa header dan bottom nav pada lebar 360/390/440 serta landscape, light/dark, badge nol/berisi, perpindahan tab/menu, notifikasi dan FAB → tutup/fokus → form SPT. Periksa juga status bar/safe area perangkat serta lengkungan header saat menggulir pada semua tab. Rencana tahap sebelumnya tetap berlaku.

Pengguna menyetujui checkpoint tahap 5; refactor header dan bottom nav portal mobile disimpan sebagai commit lokal, belum di-push. Validasi runtime tetap dicatat belum selesai; tidak mengklaim hasil render/piksel lulus.

- Graph kode tahap 5 diperbarui setelah perubahan source/fixture akhir: 15.800 node, 29.824 edge dan 1.031 komunitas melalui AST tanpa LLM.


## Tahap 6 — Aksi dan pratinjau berkas cuti (19 November 2026)

Basis checkpoint `bcceb026`. Memisahkan sisa aksi riwayat cuti dari halaman utama tanpa mengganti tampilan atau aturan operasionalnya.

- `usePortalLeaveActions.ts`: lima state untuk data/visibilitas cetak, target pembatalan, status sibuk dan scan; callback buka/tutup scan serta konfirmasi pembatalan; helper konversi data URL ke blob URL. Isi deklarasi state, callback, dependency callback dan helper sama dengan checkpoint. Hook dipanggil sekali tanpa kondisi pada tingkat portal sesudah usePortalData, sehingga perpindahan tab tidak mereset state dan pemasangan hook tidak menambah request.
- `PortalLeaveCardActions.tsx`: JSX aksi status ditolak/disetujui/pengajuan yang sama, termasuk ketersediaan berkas, disabled state, ikon, label dan warna tombol. Menggunakan props style/warna/metrik dan callback yang sama; tidak memiliki state, effect atau wrapper layout tambahan.
- `PortalDashboardScreen.tsx`: render callback singkat meneruskan binding asli ke komponen aksi; modal cetak, konfirmasi dan scan tetap berada pada lokasi serta urutan yang sama. Pemuat data, tema, tab, header/nav, formulir pengajuan dan seluruh alur selain aksi cuti tetap sama.

Halaman utama berkurang dari 568 menjadi 374 baris. Pemisahan ini menggunakan ulang portalViewTypes, tipe callback data dan modal yang ada, tanpa dependency, store, factory atau controller generik. Tipe data/API portal secara menyeluruh dan pemisahan formulir pengajuan tetap di luar tahap ini.

Validasi isi data URL PDF/JPEG/PNG/WebP sebelum ditampilkan tetap sama; tidak membuka HTML dari respons scan. Request tetap melalui apiClient berotorisasi ke endpoint pribadi yang sama. Helper blob browser dan pelepasan URL ketika menutup scan tidak berubah. Keberhasilan pembatalan tetap menutup konfirmasi dan me-refresh daftar serta saldo cuti saja; kegagalan tetap menampilkan pesan dan mempertahankan target untuk dicoba lagi. Aksi unduh/buka berkas native, export/cetak dan modal tidak diubah.

Verifikasi:

- TypeScript mobile tanpa emit: **0 diagnostik**. Sintaks ketiga berkas baru valid; whitespace diperiksa.
- Perbandingan AST terhadap checkpoint: seluruh JSX portal, props modal serta urutannya identik. Isi komponen tombol aksi sama dengan render callback lama; props meneruskan binding asli. Kelima deklarasi state, ketiga callback dan helper blob sama, termasuk allowlist format serta cleanup. Hook dipasang di tingkat portal dengan dua callback refresh semula. Sisa state/effect/handler induk dan semua 36 file dashboard lama selain halaman utama, termasuk stylesheet, hook data, modal, header/nav dan tampilan tab, tidak berubah.
- Empat kasus `__tests__/usePortalLeaveActions.test.tsx` disiapkan untuk persistensi cetak/konfirmasi tanpa pemuatan data, scan melalui endpoint benar beserta penolakan HTML dan kegagalan API, status sibuk sampai pembatalan selesai dengan refresh hanya untuk cuti, serta pembatalan gagal tanpa kehilangan target atau refresh palsu. Semua memakai data/API dummy.
- Fixture browser yang sudah ada tetap memeriksa tombol scan resmi, pratinjau gambar, pelepasan blob URL saat ditutup, filter tahun yang bertahan antartab serta kembali dari konfirmasi pembatalan. Tidak mengubah hasil tes terdahulu menjadi klaim kelulusan baru.
- **Jest, browser E2E, perangkat fisik dan perbandingan piksel belum dijalankan.** Skill security-audit mensyaratkan sandbox OS dengan isolasi jaringan, environment allowlist, target/toolchain read-only serta batas resource yang belum tersedia. Kesetaraan kode/style/typecheck merupakan bukti statis; hasil runtime belum tervalidasi.

Rencana validasi runtime di sandbox yang memenuhi syarat: jalankan regresi hook baru dan fixture profil; periksa status cuti pengajuan/disetujui/ditolak, scan tersedia/tidak tersedia, scan gambar/PDF/gagal, cetak/tutup, pembatalan kembali/sukses/gagal dan refresh saldo/daftar, serta state ketika berpindah tab. Bandingkan light/dark dan layar kecil pada tombol/modal; periksa pembukaan berkas native dan cleanup URL browser. Rencana validasi tahap sebelumnya tetap berlaku.

Pengguna menyetujui checkpoint tahap 6; refactor aksi dan pratinjau berkas cuti mobile disimpan sebagai commit lokal, belum di-push. Validasi runtime tetap dicatat belum selesai. Desain, warna, bentuk kartu dan spacing yang disetujui dipertahankan.

- Graph kode tahap 6 diperbarui setelah perubahan source/regresi akhir: 15.813 node, 29.855 edge dan 1.053 komunitas melalui AST tanpa LLM.


## Tahap 7 — Respons scan dan integrasi formulir cuti (19 November 2026)

Basis checkpoint `e79f5efa`. Pengguna menyetujui perbaikan respons scan/formulir cuti dan meminta langsung commit, dengan desain yang sama.

- `usePortalLeaveActions.ts`: penanda request meningkat pada buka/tutup/unmount; hanya request terbaru boleh memperbarui pratinjau. Sukses maupun gagal yang terlambat tidak membuka ulang modal atau menimpa berkas lain. Ref blob aktif dibersihkan saat penggantian, penutupan dan unmount; respons usang tidak membuat blob baru. Helper konversi, allowlist PDF/JPEG/PNG/WebP, endpoint pribadi, modal dan perilaku pembatalan cuti dipertahankan.
- `FormulirCutiModal.tsx`: katalog dari `/me/leave-types` dimuat setiap pembukaan/retry. Pilihan valid sebelumnya dipertahankan; default CT atau pilihan pertama berasal dari hasil API. Loading, kegagalan, hasil kosong dan retry memakai komponen/pesan yang sudah ada. Callback katalog yang ditinggalkan tidak memperbarui form berikutnya.
- Penghitungan hari mengikuti `hitung_hari`; validasi saldo mengikuti `potong_kuota_tahunan` dan batas durasi mengikuti `maks_hari`. Pengajuan baru ditahan sampai katalog siap dan jenis terpilih valid. API tetap menjadi otoritas untuk hak pegawai, jenis aktif, aturan/periode dan saldo saat pengiriman.
- Error API dibaca dari `ApiError.fieldErrors` dan `message`. Input tetap tersedia untuk diperbaiki setelah penolakan. Kunci ref mencegah dua POST pada frame yang sama; input/tanggal/pilihan serta penutupan diblokir ketika pengiriman berlangsung. Setelah sukses tetap refresh data dan menutup form.
- Stylesheet formulir `createLeaveStyles` dan semua atribut style lama identik terhadap checkpoint. File portalStyles, PortalDashboardScreen, PortalLeaveCardActions dan PortalLeaveModals tidak berubah. Dropdown mendapat ScrollView dengan tinggi maksimal 55% layar agar katalog yang bertambah tidak melampaui layar; font, warna, border/radius, margin/padding dan spacing baris tetap sama. Label aksesibilitas ditambahkan untuk pilihan jenis dan tanggal. Tidak mengubah backend, endpoint, kredensial atau dependency.

Verifikasi:

- TypeScript mobile melalui compiler API tanpa emit: **0 diagnostik**. Pemeriksaan whitespace lolos, termasuk berkas tes baru.
- Pemeriksaan AST memverifikasi fungsi stylesheet dan seluruh style inline yang sudah ada identik; satu tambahan adalah batas scrolling dropdown. Perbandingan file memverifikasi layout portal, stylesheet, tombol aksi dan modal scan/konfirmasi tetap identik.
- **Jest: 3 suite, 12 tes lolos, exit 0**, 30,205 detik, pada sandbox Docker lokal. Tujuh kasus hook mencakup persistensi cetak/konfirmasi, scan valid/HTML/gagal, pembatalan sukses/gagal, respons setelah close dan urutan terbalik, unmount serta pelepasan blob. Empat kasus katalog/form memeriksa pemuatan saat dibuka, metadata hari/saldo/maksimum, field errors/message, retry, submit ganda, katalog kosong/gagal dan respons usang. Satu kasus lama memeriksa penghitungan hari kerja/kalender.
- Percobaan pertama meloloskan 12 tes tetapi exit 1 karena lazy Expo native fetch di teardown mock RN. Eksekusi akhir memakai opsi resmi Expo `EXPO_PUBLIC_USE_RN_FETCH=1` hanya dalam fixture sandbox; API seluruhnya dimock, konfigurasi aplikasi/deployment tidak diubah. Masalah tipe Buffer pada tes juga diperbaiki sebelum pemeriksaan akhir.
- **Browser E2E, perbandingan piksel dan perangkat fisik belum dijalankan.** Hasil terfokus ini tidak menyatakan seluruh suite auth/profil/modul atau runtime tahap sebelumnya telah tervalidasi. Seluruh uji memakai data dummy; tidak memakai akun/data nyata.

Sandbox memakai image lokal `bksda-security-sandbox:browser`, ID `sha256:34f1faad757152f989d334628096d8f7e1ffd80beb34e4434b70ae84c3597c54`, tanpa pull/build/install. Container sementara dihapus otomatis; hanya `/scratch` berupa tmpfs dapat dipakai untuk file kerja/cache. Source dan dependency dipasang read-only secara terpisah, tanpa `.env`, direktori home host atau soket Docker. Environment proses dikosongkan dan hanya berisi PATH/HOME/TMPDIR/NODE_ENV/CI/EXPO_NO_TELEMETRY/EXPO_PUBLIC_USE_RN_FETCH berikut. Batas: 1 CPU, RAM+swap 1536 MB, 128 PID, 1024 fd, ukuran file 32 MB, scratch 256 MB dan timeout 90 detik. Network dan IPC dimatikan; UID/GID 65534, semua capability dibuang dan no-new-privileges diaktifkan.

Perintah reproduksi dari PowerShell, dengan Docker Desktop lokal dan dependency yang sudah tersedia:

```powershell
docker --context desktop-linux run --rm --pull=never --network=none --ipc=none --read-only --user=65534:65534 --cap-drop=ALL --security-opt=no-new-privileges --cpus=1 --memory=1536m --memory-swap=1536m --pids-limit=128 --ulimit nofile=1024:1024 --ulimit fsize=33554432:33554432 --tmpfs /scratch:rw,nosuid,nodev,size=268435456,mode=1777 --mount type=bind,source=E:/bksda-superapp/mobile/src,target=/source/src,readonly --mount type=bind,source=E:/bksda-superapp/mobile/node_modules,target=/source/node_modules,readonly --mount type=bind,source=E:/bksda-superapp/mobile/package.json,target=/source/package.json,readonly --mount type=bind,source=E:/bksda-superapp/mobile/jest.config.js,target=/source/jest.config.js,readonly --mount type=bind,source=E:/bksda-superapp/mobile/jest.setup.js,target=/source/jest.setup.js,readonly --mount type=bind,source=E:/bksda-superapp/mobile/tsconfig.json,target=/source/tsconfig.json,readonly --workdir=/source --entrypoint=/usr/bin/env bksda-security-sandbox:browser -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/scratch TMPDIR=/scratch NODE_ENV=test CI=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_USE_RN_FETCH=1 /usr/bin/timeout --signal=KILL 90 /usr/local/bin/node /source/node_modules/jest/bin/jest.js --config=/source/jest.config.js --runInBand --no-watchman --watch=false --cacheDirectory=/scratch/jest-cache --runTestsByPath src/features/dashboard/__tests__/usePortalLeaveActions.test.tsx src/features/dashboard/__tests__/FormulirCutiModal.catalog.test.tsx src/features/dashboard/__tests__/FormulirCutiModal.test.ts
```

Rencana pemeriksaan UI berikutnya: buka/tutup scan sebelum respons, pindah scan A/B, tampilkan PDF/gambar dan tutup; buka formulir di light/dark, coba katalog panjang/gagal/kosong, jenis berganti aturan, validasi dari server dan submit ulang. Bandingkan bentuk/warna/spacing pada browser dan perangkat. Risiko token URL foto BMN serta penghapusan style/filter berulang dari review belum termasuk perubahan ini.

Atas instruksi pengguna, perubahan disimpan sebagai checkpoint lokal, belum di-push. Progress dan handoff diperbarui dengan hasil uji terfokus serta batas cakupan di atas.

- Graph kode tahap 7 diperbarui setelah perubahan source/tes akhir: 15.827 node, 29.894 edge dan 1.052 komunitas melalui AST tanpa LLM.


## Tahap 8 — Menghapus bearer dari URL foto BMN (19 November 2026)

Basis checkpoint `378329db`. Skill Ponytail Review, Security Audit (pemeriksaan temuan terfokus) dan Security Review digunakan. Pengguna mengizinkan perbaikan dan langsung commit, dengan desain/warna/bentuk kartu/spacing tetap.

Perubahan:

- `AuthController`: URL foto pada /me/assets dan /me/dashboard tidak menyisipkan bearer. Helper assetQueryTokenParam serta capture request yang tidak lagi diperlukan dihapus; field foto tersimpan dibersihkan dari query token lama memakai helper yang sudah ada.
- `AssetResource`: seluruh foto endpoint /photo/, termasuk slot BPKB/STNK, tidak menyisipkan bearer. Helper snapshot membuang query token lama, termasuk variasi huruf besar, dan tidak memasang ulang token pada path foto (termasuk trailing slash). Serialisasi data/izin dan alur dokumen selain foto tetap.
- `AuthenticateQueryToken`: path view/download foto dikeluarkan dari dukungan query token. Akses foto tetap menggunakan auth:sanctum dan pemeriksaan modul/permission/owner/active loan yang sudah ada. `AssetPhotoController` menambahkan private/no-store dan no-referrer pada respons foto/redirect.
- `BmnPhotoImage`: satu komponen berbasis Image tanpa wrapper layout, dipakai portal BMN, slot foto dan detail/lightbox BMN. Native mengirim Authorization pada source hanya untuk origin/path foto API yang sah. Web memuat blob melalui apiClient yang sudah mengelola autentikasi; atribut image memakai blob URL tanpa bearer. Source eksternal/lokal diteruskan tanpa menambahkan kredensial. Query token lama dibersihkan sebelum permintaan foto internal.
- Blob web hanya dibuat untuk respons image JPEG/PNG/WebP/GIF dan untuk request aktif. Respons lama diabaikan; blob dibersihkan ketika sumber/sesi berganti atau komponen dilepas. Props style, ukuran, resizeMode, label dan onError diteruskan. State/authToken beserta pembacaan getToken yang tidak digunakan di BmnDetailScreen dihapus.
- Tidak membuat endpoint publik, signed token baru, store/cache global, atau dependency baru. Frontend web tetap memakai sesi cookie pada endpoint foto. Kunci bearer tidak lagi ditempatkan di URL foto yang dihasilkan.

Rilis backend perlu disertai pembaruan mobile untuk pemuat foto melalui header/blob; klien foto lama yang hanya mengandalkan query token akan ditolak.

Batas cakupan: endpoint dokumen/preview PDF dan KTP masih menggunakan mekanisme query token lama. Penghapusan mekanisme itu memerlukan migrasi pemuat dokumen tersendiri, bukan mengubah aksesnya diam-diam pada tahap foto. Tidak melakukan revoke massal token akun nyata atau memeriksa/mengubah log produksi. Kebocoran historis di proxy/log tetap needs_validation; sumber membuktikan penempatan bearer pada URL lama, bukan insiden produksi yang telah terkonfirmasi.

Verifikasi final:

- TypeScript mobile tanpa emit: **0 diagnostik**.
- Jest di sandbox: **2 suite, 11 tes lolos**, exit 0, 35,818 detik. Lima kasus BmnPhotoImage memeriksa request web/atribut tanpa bearer, header native dan origin eksternal/URL userinfo, URL lama terenkode/trailing slash, 403/MIME salah/onError, race pergantian foto/sesi, unmount dan pelepasan blob. Enam kasus slot foto yang sudah ada memastikan perilaku komponen konsumen tetap.
- PHPUnit di sandbox: **5 tes HTTP, 59 assertion lolos**, exit 0, sekitar 3 detik. Meliputi /me/assets, /me/dashboard, serializer modul, field foto legacy; query-only view/download ditolak 401; header dan session guard sah diterima; pembaca asing ditolak 403; bearer dicabut ditolak 401; borrower tidak mendapat foto dokumen pribadi dan kehilangan akses setelah return; snapshot tidak memasang ulang bearer foto.
- Pemeriksaan AST: ketiga render tree konsumen berikut props/style sama setelah rename Image -> BmnPhotoImage. portalStyles tetap identik; komponen gambar mengembalikan Image langsung sehingga tidak menambah node layout. Desain, warna, bentuk kartu, ukuran, margin/padding dan spacing dipertahankan.
- Ponytail Review pada diff final: **Lean already. Ship.** Satu pemuat foto berbasis Image/apiClient dipakai di tiga lokasi; pembacaan/state token yang mati dan helper penyisip token dihapus. Tidak menambah sistem autentikasi alternatif atau dependency.
- Security Review memeriksa sanitasi URL, pemisahan origin, lifecycle blob, cache/referrer, serta otorisasi yang tetap di backend. Ini perbaikan satu temuan, bukan klaim cakupan audit seluruh repo.
- **Browser E2E, perangkat fisik dan pengukuran piksel belum dilakukan.** Tes session guard bukan pengujian cookie/proxy produksi. Tidak memakai akun, media, broker atau kredensial nyata.

Sandbox menggunakan image lokal `bksda-security-sandbox:browser`, ID `sha256:34f1faad757152f989d334628096d8f7e1ffd80beb34e4434b70ae84c3597c54`; pull/build/install dinonaktifkan. Kedua eksekusi memakai network/IPC none, root/source/toolchain read-only, UID/GID 65534, semua capability dibuang, no-new-privileges, scratch tmpfs 256 MB, limit file 32 MB dan 1024 fd, serta timeout 90 detik. Container dihapus otomatis; tidak mempromosikan file hasil target. Tidak memasang .env, data storage nyata, home host, atau socket Docker.

Reproduksi Jest memakai perintah sandbox tahap 7 dengan daftar tes diganti menjadi `src/components/__tests__/BmnPhotoImage.test.tsx src/features/bmn/components/detail/__tests__/AssetPhotoSlotsSection.test.tsx`. Limitnya tetap 1 CPU, RAM 1536 MB tanpa swap tambahan dan 128 PID. Environment tetap PATH/HOME/TMPDIR/NODE_ENV/CI/EXPO_NO_TELEMETRY/EXPO_PUBLIC_USE_RN_FETCH yang tercantum pada tahap 7. Seluruh API/foto/credential pada fixture adalah dummy atau mock; source dan node_modules dari mobile dipasang terpisah read-only.

Reproduksi backend berikut adalah skrip Python (jalankan dengan Python 3 pada host Windows). Argumen subprocess merupakan command yang dipakai: source backend dipasang lewat allowlist read-only, vendor/toolchain dari image, DB SQLite :memory:, fake mail/storage/event dalam suite, 1 CPU, RAM 1024 MB tanpa swap tambahan dan 96 PID. Proses target dimulai dengan environment kosong melalui env -i dan hanya nilai dummy yang dituliskan di bawah:

```python
import subprocess
from pathlib import Path
root=Path('E:/bksda-superapp/backend')
args=['docker','--context','desktop-linux','run','--rm','--pull=never','--network=none','--ipc=none','--read-only','--user=65534:65534','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=1','--memory=1024m','--memory-swap=1024m','--pids-limit=96','--ulimit','nofile=1024:1024','--ulimit','fsize=33554432:33554432','--tmpfs','/scratch:rw,nosuid,nodev,size=268435456,mode=1777']
for source in ['app','config','routes','database','tests','bootstrap/app.php','bootstrap/providers.php','composer.json','phpunit.xml']:
 args+=['--mount',f'type=bind,source={(root/source).as_posix()},target=/app/{source},readonly']
args+=['--workdir=/app','--entrypoint=/usr/bin/env','bksda-security-sandbox:browser','-i','PATH=/usr/local/bin:/usr/bin:/bin','HOME=/scratch','TMPDIR=/scratch','APP_ENV=testing','APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','LARAVEL_STORAGE_PATH=/scratch/storage','APP_PACKAGES_CACHE=/scratch/cache/packages.php','APP_SERVICES_CACHE=/scratch/cache/services.php','APP_CONFIG_CACHE=/scratch/cache/config.php','APP_ROUTES_CACHE=/scratch/cache/routes.php','APP_EVENTS_CACHE=/scratch/cache/events.php','VIEW_COMPILED_PATH=/scratch/views','DB_CONNECTION=sqlite','DB_DATABASE=:memory:','CACHE_STORE=array','SESSION_DRIVER=array','MAIL_MAILER=array','QUEUE_CONNECTION=sync','BROADCAST_CONNECTION=log','LOG_CHANNEL=stderr','PULSE_ENABLED=false','TELESCOPE_ENABLED=false','NIGHTWATCH_ENABLED=false','/bin/sh','-c','mkdir -p /scratch/cache /scratch/views /scratch/storage/framework/views /scratch/storage/logs && exec /usr/bin/timeout --signal=KILL 90 /usr/local/bin/php /app/vendor/bin/phpunit --configuration=/app/phpunit.xml --do-not-cache-result --no-coverage --filter="(photo|snapshots)" /app/tests/Feature/PortalPersonalSecurityTest.php']
result=subprocess.run(args)
raise SystemExit(result.returncode)
```

Atas permintaan pengguna, perubahan disimpan sebagai commit lokal, belum di-push. Progress/handoff mencatat hasil terfokus dan tindak lanjut dokumen/KTP di atas.

- Graph kode tahap 8 diperbarui setelah perubahan source/tes akhir: 15.841 node, 29.924 edge dan 1.037 komunitas melalui AST tanpa LLM.

## Pembaruan Sesi 19 November 2026 — Bagian 182 Dokumen/PDF, KTP dan Foto BMN Web

- Menghapus bearer dari URL view/download/pratinjau halaman dokumen BPKB/STNK dan KTP Surat Kuasa. Snapshot lama dibersihkan, termasuk parameter token yang dienkode, beda kapitalisasi dan berbentuk array. Middleware autentikasi query yang sudah tidak diperlukan dihapus; autentikasi Sanctum serta batas izin/pemilik/peminjam tetap berlaku. KTP selalu melalui endpoint terlindungi; tidak memakai fallback URL storage publik.
- Memperbaiki migrasi pemuat web yang belum tercakup pada checkpoint 79f2d6b0: thumbnail, detail/lightbox, pemilih aset pinjaman, aset portal dan lampiran laporan kini memakai API berautentikasi -> blob URL. URL dibatasi ke origin/path BMN API yang dikenal; HTML dan format lain ditolak; blob lama dibersihkan saat URL/sesi berubah/unmount. Buka/unduh PDF memakai blob tanpa bearer di URL atau DOM. Mobile memakai helper pemuat yang sama untuk foto/pratinjau/KTP dan mengunduh PDF lewat helper unduhan yang sudah ada.
- Log pengguna menunjukkan kasus tambahan 404 geotag. Daftar aset, pemilih pinjaman dan hero detail kini mencoba foto berikutnya ketika foto utama gagal. Prioritas foto serta label/placeholder tetap; tidak mengubah CSS, warna, bentuk kartu atau spacing. Pemeriksaan AST mengonfirmasi atribut style/className pada 12 TSX yang diedit identik terhadap basis; tidak menambah wrapper layout atau dependency.
- Verifikasi: backend PortalPersonalSecurityTest 60/60 tes, 295 assertion; mobile 3 suite, 21/21 tes; tiga regresi frontend standalone serta fixture Chromium terisolasi lolos. Browser mereproduksi raw-image 403 tanpa header, kemudian foto/pratinjau/KTP berhasil lewat blob; mencakup perubahan sesi, penolakan HTML/403, pembatasan origin, PDF buka/unduh dan cleanup popup gagal. TypeScript frontend/mobile 0 diagnostik; ESLint tiga helper/komponen frontend baru/diubah 0 warning/error. Rincian perintah dan batas sandbox ada di docs/mobile-portal-refactor.md.
- Atas permintaan eksplisit pengguna, melakukan SELECT dalam transaksi READ ONLY pada PostgreSQL lokal dan HEAD berautentikasi ke MinIO lokal dengan skrip inspeksi mandiri, tanpa menjalankan aplikasi. Dua ID yang ditunjuk memiliki referensi geotag di database; lima object key pada contoh daftar mengembalikan 404. Bucket/prefix sendiri dapat dibaca (200), sedangkan salinan path yang diperiksa tidak ada di storage lokal. Ini bukti referensi berkas tidak tersedia pada penyimpanan lokal aktif, bukan bukti pengguna belum pernah upload atau berkas produksi hilang. Tidak mengubah data, mengunduh isi foto/KTP, memulihkan berkas atau menyatakan sinkronisasi produksi selesai.
- Basis 79f2d6b0, langsung commit lokal sesuai permintaan pengguna; belum di-push. Ponytail Review: Lean already. Ship. Security Review difokuskan pada URL credential, origin/MIME, lifecycle blob serta izin backend. Pengujian bukan audit menyeluruh, E2E aplikasi penuh/perangkat fisik/build Next.js atau validasi storage produksi.
- Graph kode tahap 9 diperbarui setelah source/tes final: 15.861 node, 29.995 edge dan 1.026 komunitas melalui AST tanpa LLM.

### Tahap 9 — Reproduksi dan batas validasi

Sandbox menggunakan image lokal yang sama seperti tahap 8 (bksda-security-sandbox:browser, sha256:34f1faad757152f989d334628096d8f7e1ffd80beb34e4434b70ae84c3597c54). Tidak pull/build/install. Source, toolchain dan root read-only; UID/GID 65534; cap-drop ALL; no-new-privileges; network/IPC none; scratch tmpfs 256 MB; file 32 MB; 1024 fd; 1 CPU; timeout 90 detik. Tidak memasang .env, storage nyata, home host atau socket Docker. Tidak mempromosikan hasil target. Backend memakai SQLite :memory: dan fake storage/mail/event; browser menjalankan server dummy di loopback dalam container, tanpa akun atau berkas nyata.

Backend: gunakan skrip Python tahap 8 dengan opsi --filter="(photo|snapshots)" dihapus, sehingga seluruh PortalPersonalSecurityTest.php dijalankan. Environment allowlist dan mount allowlist tahap 8 tetap sama; RAM 1024 MB tanpa tambahan swap, 96 PID. Hasil akhir 60 tes / 295 assertion, exit 0.

Mobile: gunakan perintah tahap 7/8 dengan --runTestsByPath src/components/__tests__/BmnPhotoImage.test.tsx src/lib/files/__tests__/download.test.ts src/features/bmn/components/detail/__tests__/AssetPhotoSlotsSection.test.tsx. Source, node_modules, package.json, jest.config.js, jest.setup.js dan tsconfig.json mobile dipasang terpisah read-only di /source. RAM 1536 MB tanpa tambahan swap, 128 PID. Environment kosong diisi hanya PATH=/usr/local/bin:/usr/bin:/bin HOME=/scratch TMPDIR=/scratch NODE_ENV=test CI=1 EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_USE_RN_FETCH=1. Hasil akhir 21 tes / 3 suite, exit 0.

Frontend dan browser, perintah final yang dijalankan (PowerShell, satu baris):

```powershell
docker --context desktop-linux run --rm --pull=never --network=none --ipc=none --read-only --user=65534:65534 --cap-drop=ALL --security-opt=no-new-privileges --cpus=1 --memory=1536m --memory-swap=1536m --pids-limit=128 --ulimit nofile=1024:1024 --ulimit fsize=33554432:33554432 --tmpfs /scratch:rw,nosuid,nodev,size=268435456,mode=1777 --mount type=bind,source=E:/bksda-superapp/frontend/src,target=/source/src,readonly --mount type=bind,source=E:/bksda-superapp/frontend/tests,target=/source/tests,readonly --mount type=bind,source=E:/bksda-superapp/frontend/node_modules,target=/source/node_modules,readonly --workdir=/source --entrypoint=/usr/bin/env bksda-security-sandbox:browser -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/scratch TMPDIR=/scratch NODE_ENV=test CI=1 /usr/bin/timeout --signal=KILL 90 /bin/sh -c 'node tests/bmn-asset-grid.cjs && node tests/bmn-detail-ui.cjs && node tests/bmn-assets-ui.cjs && node tests/bmn-media.cjs'
```

Tiga fixture Node mencakup daftar/detail, filter Rusak Berat, fallback geotag ke foto depan, prioritas tanpa dokumen privat serta status/loading/galat; fixture Chromium memakai React terpasang dan dua modul media asli. Header API/auth-store pada fixture merupakan dummy, bukan pengujian interceptor/cookie produksi. Tidak menguji semua foto pada data produksi. Hasil final semua PASS, exit 0.

ESLint terfokus memakai dependency Linux dari image agar tidak membaca ribuan dependency lewat bind mount Windows. Eksekusi awal dengan dependency bind mount melampaui batas 90 detik; hasil yang dilaporkan berasal dari eksekusi berikut ini (exit 0, 0 warning/error):

```powershell
docker --context desktop-linux run --rm --pull=never --network=none --ipc=none --read-only --user=65534:65534 --cap-drop=ALL --security-opt=no-new-privileges --cpus=1 --memory=1536m --memory-swap=1536m --pids-limit=96 --ulimit nofile=1024:1024 --ulimit fsize=33554432:33554432 --tmpfs /scratch:rw,nosuid,nodev,size=268435456,mode=1777 --mount type=bind,source=E:/bksda-superapp/frontend/src,target=/frontend/src,readonly --mount type=bind,source=E:/bksda-superapp/frontend/eslint.config.mjs,target=/frontend/eslint.config.mjs,readonly --mount type=bind,source=E:/bksda-superapp/frontend/package.json,target=/frontend/package.json,readonly --workdir=/frontend --entrypoint=/usr/bin/env bksda-security-sandbox:browser -i PATH=/usr/local/bin:/usr/bin:/bin HOME=/scratch TMPDIR=/scratch NODE_ENV=test CI=1 /usr/bin/timeout --signal=KILL 90 /usr/local/bin/node node_modules/eslint/bin/eslint.js --no-cache --max-warnings=0 src/components/BmnMediaImage.tsx src/lib/bmn-media.ts src/app/bmn/_lib/asset-photos.ts
```

TypeScript frontend dan mobile diperiksa tanpa emit melalui compiler API lokal: getParsedCommandLineOfConfigFile dengan noEmit=true/incremental=false, lalu getPreEmitDiagnostics(createProgram(...)); tidak menjalankan aplikasi atau konfigurasi build. Keduanya 0 diagnostik.

Pemeriksaan metadata database/storage nyata dilakukan terpisah setelah pengguna secara eksplisit meminta memeriksa datanya. Skrip mandiri memakai PDO PostgreSQL, BEGIN TRANSACTION READ ONLY, statement_timeout=5000ms, SELECT kolom identitas aset/path foto untuk ID yang disebutkan dan daftar Rusak Berat, kemudian ROLLBACK. HEAD object MinIO dibatasi localhost, tanpa redirect/proxy, connect timeout 2 detik dan total 4 detik; pemeriksaan bucket/prefix memakai ListObjectsV2 max-keys=1 dan timeout 5 detik. Tidak membaca isi objek atau tabel profil/KTP, tidak mengubah database/storage, dan tidak merekam kredensial. Hasil lokal tidak disamakan dengan situs produksi yang ditautkan pengguna. Pemulihan backup/sinkronisasi atau upload ulang belum dilakukan.

## Pembaruan Sesi 19 November 2026 — Bagian 183 RustFS Produksi dan Sinkronisasi BMN Lokal

- Koreksi istilah Bagian 182/tahap 9: layanan yang dipakai adalah RustFS, dikonfirmasi dari image/container lokal serta produksi. Pemeriksaan sebelumnya memakai protokol S3, bukan bukti layanan MinIO. Tidak mengganti produk penyimpanan.
- Backup database lokal dibuat dan katalog pg_restore tervalidasi sebelum perubahan. Sebanyak 14.762 baris dari 17 tabel BMN produksi digabungkan secara transaksional ke lokal melalui upsert, dengan seluruh FK tetap aktif. Simulasi ROLLBACK lolos sebelum COMMIT; tidak melakukan TRUNCATE/CASCADE atau menyalin akun/kredensial pengguna produksi. Identitas relasi cocok tanpa remap. Checksum kanonis setiap baris PostgreSQL sumber/lokal identik (0 perbedaan); 13 baris khusus lokal dipertahankan (1 peminjaman, 10 riwayat aset, 2 surat kuasa). Tidak ada aset dengan pinjaman aktif ganda. Checksum akun, pegawai dan folder Drive lokal tidak berubah.
- Menyalin 77 objek BMN, 61.697.731 byte, dari RustFS produksi ke RustFS lokal melalui S3 di dalam tunnel SSH dengan host key yang diverifikasi. MIME dipertahankan, checksum/ukuran diverifikasi, dan objek khusus lokal dipertahankan. Manifest produksi setelah operasi identik; tidak mengubah/menghapus berkas BMN produksi. Folder rollback/manifest/backup hanya lokal, diabaikan Git, dengan ACL pengguna Windows saat ini dan SYSTEM: backups/bmn-sync-20261119-01/.
- Foto P.C Unit NUP 31 ada di produksi dan kini HEAD lokal 200. Lap Top NUP 4 memiliki catatan unggah 29 Oktober 2026, tetapi object key tersebut 404 pada produksi/lokal, tidak ada pada folder produksi lain untuk laptop itu atau dua arsip RustFS yang tersedia. Riwayat unggah tidak dibantah; penyebab hilangnya objek historis belum terbukti. Tidak menggantinya dengan foto/tautan lama secara otomatis.
- Kebijakan bucket wildcard public-read diganti pada RustFS lokal dan produksi dengan allowlist CMS/public serta foto profil yang dikenal. Seluruh namespace BMN/foto/dokumen/KTP/surat tugas tidak diizinkan untuk pembaca anonim. Kebijakan lama disimpan untuk rollback. Verifikasi: HEAD anonim foto BMN yang tersedia 403, HEAD berautentikasi 200; tiga foto profil publik produksi tetap HEAD 200.
- Kredensial RustFS produksi terbukti sama dengan default repository lalu dirotasi ke nilai acak. Konfigurasi disimpan pada env aplikasi Dokploy dan file env Compose, dengan pemeriksaan perubahan bersamaan serta rollback. Empat layanan yang memakai pengaturan itu direkreasi menggunakan image yang sama tanpa build/pull; tidak ada migrasi tertunda atau job aktif sebelum operasi. Kredensial baru HEAD 200, kredensial lama 403, kebijakan bucket tetap sama, seluruh tiga konsumen berkas cocok, dan /api/health melalui jaringan layanan 200. Kredensial baru tidak dicetak atau dimasukkan ke Git. Pemeriksaan HEAD domain publik dari klien otomatis mendapat 403 dengan header Cloudflare; ini bukan bukti browser produksi atau seluruh rute publik telah tervalidasi.
- Kode storage:setup kini memasang allowlist yang sama, mengembalikan status gagal pada audit drift/gagal PUT policy, serta tidak lagi menganggap bucket wildcard public-read sebagai kondisi aman. Compose Dokploy mewajibkan RUSTFS_PASSWORD, tanpa fallback password produksi. Compose prod alternatif sudah mewajibkannya. RustFS/API/console dan pgAdmin lokal dibatasi ke localhost; healthcheck RustFS memakai /health/ready, bukan endpoint lama /minio/health/ready. Container lokal sehat dan volume RustFS tetap sama.
- Unggahan foto biasa/geotag menghasilkan URL API terlindungi. Penggantian memakai nama unik, memeriksa hasil penyimpanan sebelum mengubah referensi, dan baru menghapus foto lama sesudah referensi/riwayat berhasil disimpan. Ini menutup risiko penghapusan foto lama sebelum penulisan pengganti berhasil; tidak mengklaimnya sebagai penyebab pasti kasus historis. Tidak mengubah desain, warna, bentuk kartu atau spacing.
- Pengujian sandbox final: 63 tes backend (337 assertion) lolos, mencakup policy publik/privat, batas akses/token, URL unggahan privat, penggantian berhasil serta penolakan penulisan yang mempertahankan foto lama untuk kedua endpoint. Ketiga konfigurasi Compose lolos render dummy; dua konfigurasi produksi menolak password storage yang kosong. Tidak ada dependency baru. Pengujian frontend/mobile sebelumnya tidak diulang karena source-nya tidak berubah pada tahap ini; bukan klaim audit penuh atau build aplikasi penuh.
- Basis 8e0dbac1; kode disiapkan pada codex/portal-security-pentest untuk checkpoint/PR ke production-server. Tidak melakukan merge PR atau mengganti image aplikasi dengan kode branch kerja tanpa konfirmasi eksplisit. Pembatasan bucket, rotasi kredensial dan sinkronisasi lokal di atas sudah diterapkan terpisah sebagai operasi yang diminta pengguna.
- Graph kode tahap 10 diperbarui setelah source/tes final: 15.871 node, 30.012 edge dan 1.038 komunitas, AST tanpa LLM.

### Tahap 10 — Batas reproduksi dan rollback

Pengujian terfokus menggunakan image/allowlist mount/environment dan isolasi backend tahap 8/9 yang sama. Perintah final berikut menjalankan PortalPersonalSecurityTest.php dan StorageBucketPolicyTest.php (63 tes, 337 assertion; exit 0):

```powershell
@'
import subprocess
from pathlib import Path
root=Path('E:/bksda-superapp/backend')
args=['docker','--context','desktop-linux','run','--rm','--pull=never','--network=none','--ipc=none','--read-only','--user=65534:65534','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=1','--memory=1024m','--memory-swap=1024m','--pids-limit=96','--ulimit','nofile=1024:1024','--ulimit','fsize=33554432:33554432','--tmpfs','/scratch:rw,nosuid,nodev,size=268435456,mode=1777']
for source in ['app','config','routes','database','tests','bootstrap/app.php','bootstrap/providers.php','composer.json','phpunit.xml']:
 args+=['--mount',f'type=bind,source={(root/source).as_posix()},target=/app/{source},readonly']
args+=['--workdir=/app','--entrypoint=/usr/bin/env','bksda-security-sandbox:browser','-i','PATH=/usr/local/bin:/usr/bin:/bin','HOME=/scratch','TMPDIR=/scratch','APP_ENV=testing','APP_KEY=base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=','LARAVEL_STORAGE_PATH=/scratch/storage','APP_PACKAGES_CACHE=/scratch/cache/packages.php','APP_SERVICES_CACHE=/scratch/cache/services.php','APP_CONFIG_CACHE=/scratch/cache/config.php','APP_ROUTES_CACHE=/scratch/cache/routes.php','APP_EVENTS_CACHE=/scratch/cache/events.php','VIEW_COMPILED_PATH=/scratch/views','DB_CONNECTION=sqlite','DB_DATABASE=:memory:','CACHE_STORE=array','SESSION_DRIVER=array','MAIL_MAILER=array','QUEUE_CONNECTION=sync','BROADCAST_CONNECTION=log','LOG_CHANNEL=stderr','PULSE_ENABLED=false','TELESCOPE_ENABLED=false','NIGHTWATCH_ENABLED=false','/bin/sh','-c','mkdir -p /scratch/cache /scratch/views /scratch/storage/framework/views /scratch/storage/logs && exec /usr/bin/timeout --signal=KILL 90 /usr/local/bin/php /app/vendor/bin/phpunit --configuration=/app/phpunit.xml --do-not-cache-result --no-coverage /app/tests/Feature/PortalPersonalSecurityTest.php /app/tests/Unit/StorageBucketPolicyTest.php']
result=subprocess.run(args)
raise SystemExit(result.returncode)
'@ | python -
```

Batasnya tetap network/IPC none, source/toolchain/root read-only, UID/GID 65534, cap-drop ALL, no-new-privileges, scratch tmpfs 256 MB, 1 CPU, RAM 1024 MB, PID 96, file 32 MB, 1024 fd dan timeout 90 detik. Semua fixture tes adalah dummy; tidak memasang .env/data produksi ke sandbox. Tidak mengunduh dependency. Renderer Compose di luar aplikasi hanya memproses konfigurasi dengan env dummy dan --no-env-resolution; tidak memulai layanan untuk pengujian konfigurasi.

Operasi data/konfigurasi nyata di atas dilakukan atas permintaan eksplisit pengguna, terpisah dari pengujian dummy. Pembacaan sumber memakai SSH dengan RejectPolicy/known_hosts, SQL SELECT, S3 LIST/GET/HEAD dan volume metadata. Penggabungan lokal memakai FK aktif, lock_timeout 5 detik dan statement_timeout 45 detik. Setiap baris sumber dicocokkan dengan md5(to_jsonb(row)::text) PostgreSQL setelah import untuk memverifikasi tipe/nilai, termasuk angka desimal. Skrip satu kali di direktori backup tidak memuat kredensial literal baru; tidak menjalankan ulang skrip restore lama yang menimpa volume atau basis data lain.

Artefak rollback yang sensitif berada di direktori backup lokal ber-ACL terbatas dan dilarang masuk Git: local-before.dump, local-bmn-before.json, manifest/catatan verifikasi, bucket-policy-before.json per lingkungan, konfigurasi Dokploy/env sebelum dan sesudah rotasi. Nilai kredensial tidak dicatat pada dokumen ini. Pemulihan backup database penuh memengaruhi seluruh database lokal, jadi jangan menjalankannya untuk membatalkan satu tabel tanpa meninjau kebutuhan pemulihan.

Rotasi produksi memperbarui hanya pengaturan kredensial penyimpanan pada record aplikasi Dokploy serta file env Compose. Candidate env diverifikasi lewat docker compose config sebelum diterapkan; tidak ada migrasi pending, queue pending/reserved 0. Setelah restart dengan --no-build --pull never, verifikasi storage, policy, semua konsumen berkas dan API dilakukan; konfigurasi lama tersedia untuk rollback jika tahap itu gagal. Candidate env sementara dibersihkan setelah sukses. Database BMN/akun produksi dan isi objek produksi tidak dimutasi oleh sinkronisasi.

Perbaikan kode aplikasi (termasuk URL tanpa bearer dari tahap 8/9 dan ketahanan penggantian unggahan tahap 10) memerlukan rilis branch kerja. Aturan handoff yang aktif: jangan merge PR ke production-server tanpa konfirmasi eksplisit pengguna. Perubahan policy/credential yang sudah aktif tidak disamakan dengan deployment kode aplikasi. Tidak menjanjikan foto Lap Top NUP 4 dapat dipulihkan tanpa sumber berkas yang valid.
