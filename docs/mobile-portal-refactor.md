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
