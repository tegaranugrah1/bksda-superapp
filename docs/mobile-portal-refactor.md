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
