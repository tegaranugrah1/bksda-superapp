# Penyelarasan Form Pengajuan SPT Mobile

19 November 2026. Target: tombol Buat Surat Tugas (SPT) Baru dari portal mobile; acuan fungsi adalah form pribadi web `/surat-tugas`.

| Bagian | Sebelumnya di mobile | Hasil |
|---|---|---|
| Tampilan/tema | Warna tetap, tanpa tema portal | Header Kemenhut, bidang membulat, kartu terkelompok, light/dark tersimpan dari portal |
| Warna | Biru tetap #2563eb | Aksen Surat Tugas web #0369a1 / #38bdf8; warna fokus dan pilihan mengikuti modul |
| Jenis tugas | Tiga pilihan tetap | Master aktif Kepegawaian, diperbarui setiap form dibuka kembali; mode lokasi, aturan satu hari dan pola kalimat kustom |
| Sumber dana | Daftar kode tetap | Master pembebanan aktif dengan nilai nama seperti web, termasuk detail Lainnya |
| Personel | Pencarian/seleksi dasar | Status muat/gagal/coba lagi, penghapusan peserta, asal gabungan dari flag wilayah atau unit kerja |
| Jadwal | Periode bersama | Tanggal tunggal/bersama/per pegawai; kalender dan pintasan membatasi periode/urutan, jadwal personel disesuaikan saat periode utama berubah, bentrok ditampilkan dalam kartu warning tersendiri |
| Tenaga lapangan | Belum ada | Pilihan PM 1–100 orang dan pencatatan pada payload/jadwal |
| PLH/Seksi | Belum ada | PLH untuk pejabat struktural dan pilihan persetujuan Seksi sesuai peserta |
| Lampiran | PDF; payload native juga dipakai di web | PDF/JPG/PNG/WebP maksimal 10 MB, file asli pada FormData web dan URI native |
| Kegagalan pengiriman | Alert dasar | Pesan validasi terstandar/konflik di halaman, isian dipertahankan, dapat dicoba lagi |
| Selesai | Form lama tersimpan saat dibuka kembali | Kembali ke portal dan reset untuk pengajuan baru; pencegahan kirim ganda |

Indikator tahap ditengahkan pada tiga kolom, dengan garis biru penghubung mengikuti tahap aktif. Kartu bentrok menebalkan nama dan tanggal serta memberi garis bawah pada tanggal seperti web. Pratinjau berada di bagian bawah kartu Detail Surat Tugas. Isi picker tetap sama selama animasi penutupan, termasuk ketika menutup Jenis Tugas lewat tombol atau Escape. Navigasi web dari aksi cepat menunggu modal selesai ditutup agar fokus tidak kembali ke portal yang tersembunyi.

Jenis tugas dan sumber dana yang ditambah di pengaturan Kepegawaian tersedia saat form dibuka kembali. Pembaruan ini tidak menghapus draf atau pilihan jenis yang masih tersedia, dan bukan push realtime saat form sedang terbuka.

Pratinjau dan payload memakai fungsi pembentuk kalimat yang sama di mobile. Logika portabel bersumber dari helper web; delapan kasus dibandingkan terhadap source web aktual (mode lokasi, template kustom, singkatan, teks tempel dan penanda miring). Pemisahan source dipertahankan karena kedua aplikasi tidak berbagi konfigurasi bundler.

Endpoint pengiriman tetap `/surat-tugas/submit`. Tidak ada endpoint/backend atau aturan otorisasi yang diubah. UI tidak mengirim override status persetujuan/nomor surat. Server tetap menentukan akses dan penerbitan.

## Verifikasi

- `cd mobile; npm run typecheck` dan ESLint file yang berubah: lulus.
- Empat suite form/API/schema: 30 tes lulus.
- `node frontend/tests/mobile-spt-wording-parity.cjs`: delapan kasus cocok dengan web.
- `node frontend/tests/mobile-surat-tugas.playwright.cjs`: navigasi dari FAB, tema, master jenis/sumber dana, mode lokasi, jadwal personel, PLH/Seksi, PM, unggahan multipart PDF, satu hari, kirim ganda, retry 422, bentrok jadwal dan reset form lulus. Regresi juga memeriksa posisi indikator/pratinjau, fokus web, transisi picker, master baru setelah navigasi dan draf yang dipertahankan. Kalender juga diuji untuk periode hari ini–besok pada kedua pegawai, batas sebelum/sesudah periode, urutan selesai, pintasan tanggal dan penyesuaian saat periode utama berubah; kartu warning diuji light/dark, nama/tanggal tebal dan tanggal bergaris bawah, lalu hilang setelah konflik teratasi. Garis progres diperiksa pada tahap 1/2/3; console diperiksa terhadap peringatan fokus dan text node.
- Browser 360/440/landscape 800: tidak ada input melewati lebar layar. Aksen light/dark dibandingkan dengan computed styles halaman web aktual.
- Bundle Android HTTP 200 JavaScript. Perangkat fisik belum diuji.
- Semua data dan pengiriman browser memakai fixture terisolasi; tidak membuat SPT nyata.
