# Panduan Visual Modul BMN

Revisi: **10 November 2026**. Berlaku sebagai acuan untuk perubahan UI BMN berikutnya.

Nilai token lengkap tetap mengacu pada [pedoman warna aplikasi](../DESIGN_SYSTEM_COLORS.md). Detail gerak dan hasil verifikasi mengacu pada [pedoman animasi](../animate-ui-motion-guidelines.md). Panduan ini mencatat pilihan visual BMN yang sudah disepakati agar tidak kembali ke border berat atau efek yang berbeda-beda.

## Warna dan border

| Elemen | Aturan BMN |
| --- | --- |
| Kanvas dan surface | Netral sesuai token canvas/surface light dan dark; jangan memberi latar hijau pada seluruh halaman atau setiap baris. |
| Aksi utama | Accent-solid, teks accent-on-solid; hover/pressed memakai alias aksen yang sesuai tema. Light memakai Emerald gelap dengan teks putih; dark memakai Emerald terang dengan teks gelap. |
| Export, Impor, Reset, Batal | Pasangan secondary-bg/fg; **border normal transparan**, hover memakai secondary-hover dan accent-soft-border. Jangan membuat semua aksi menjadi tombol utama. |
| Search, NUP, input/select biasa | **Border normal halus**: border-subtle `#e2e8f0` light / `#3f3f46` dark. Pertahankan teks, placeholder, ikon/panah dan bentuk field. |
| Fokus keyboard | Outline accent-fg 2px dengan offset 2px. Aksi destruktif memakai danger-focus. Fokus harus tetap terlihat tanpa hover. |
| Border-control | Untuk konteks yang memerlukan batas tegas, bukan default semua field BMN. Nilai light `#7c899a` masih dinilai terlalu menonjol untuk filter berderet oleh pengguna. |
| Teks pendukung | Foreground-muted, bukan abu-abu yang terlalu pucat. Metadata penting tetap mudah dibaca; jangan mengandalkan teks 9–10px. |
| Pilihan baris/filter | Accent-soft, label/state dan checkbox/aria-pressed/aria-selected. Toolbar seleksi memakai aksen; merah bukan penanda pilihan biasa. |

Border dekoratif yang halus tidak diklaim memenuhi rasio batas kontrol 3:1. Bila batas diperlukan untuk mengenali kontrol, evaluasi affordance dan kontras pada konteks sebenarnya; jangan menganggap kelulusan pasangan token sebagai sertifikasi seluruh halaman.

## Makna status

| Keadaan | Token status |
| --- | --- |
| Kondisi Baik | success |
| Rusak Ringan / STNK mendekati jatuh tempo | warning |
| Rusak Berat / STNK kedaluwarsa | danger |
| Informasi pinjaman | info |
| Nilai kondisi tidak dikenal | neutral |

Status wajib disertai label/ikon. Aksi hapus/dispose memakai danger, tidak mengikuti Emerald modul. Tag kategori buatan pengguna mempertahankan palet taksonominya; warna kategori bukan status sukses/bahaya.

## Hover dan kecepatan

| Area | Pola yang dipertahankan |
| --- | --- |
| Pembukaan dashboard / Data Aset | Satu entrance 280ms, offset 6px dari opacity 0.85, easing `[0.16, 1, 0.3, 1]`. Tidak berulang hanya karena hover/filter/rerender biasa. |
| Grafik Kondisi Aset, Distribusi per Jenis, Top Lokasi | 600ms ease-out mengikuti tempo grafik Personil Kepegawaian; angka langsung bernilai akhir. |
| KPI dashboard | Hover naik 2px/150ms, border ringan dan shadow; kartu informasi tidak diberi aksi klik palsu atau cursor pointer. |
| Navigasi header/baris kendaraan dashboard | Hover naik 3px/150ms; border peringatan mengikuti semantiknya. Sisakan ruang agar lift/outline tidak terpotong. |
| Header Data Aset | Export/Impor/Tambah naik 2px pada hover; feedback 150ms. |
| Baris tabel Data Aset | Background hover/focus-within 150ms, **tanpa gerak/scale/stagger**. Aksi detail/hapus selalu terlihat. |
| Filter, aksi kecil dan pagination Data Aset | Warna/border 150ms; outline fokus jelas. Highlight kondisi memakai spring 500/40 dengan ID per instance. |
| Popover Export/filter tag dan dialog Impor | 150ms ease-out melalui primitive aksesibel existing; Escape/focus-return tetap bekerja. |

**Akses Cepat Modul dashboard tetap memakai efek yang disukai pengguna:** shared highlight spring 500/40, fade 120ms, feedback CSS 140ms, hover 1px dan pressed scale 0.98. Jangan menggantinya dengan hover kuat milik kontrol lain.

Gerak spatial hanya berjalan pada no-preference. Pertahankan MotionConfig reducedMotion=user dan fallback CSS terlokalisasi; teks, status, seleksi dan fokus tetap tersedia. Pengujian browser reduced motion revisi terakhir diserahkan kepada pengguna, bukan dinyatakan lulus dari source saja.

## Grid Data Aset dan preview foto

- Default **grid pada lebar <768px**, tabel pada desktop. Tombol Tabel/Grid tersedia pada keduanya. Pilihan disimpan terpisah pada `bmn-assets-view-mobile` dan `bmn-assets-view-desktop`; bila storage diblokir, default responsif tetap bekerja dan pilihan sementara berlaku selama halaman aktif. Saat hidrasi/preferensi belum siap, tampilkan skeleton; render hanya satu view.
- Kartu final **vertikal**, foto di atas dan teks di bawah. Mobile memakai satu kolom <360px dan dua kolom 360–1023px. Pada desktop ketika grid dipilih: tiga kolom mulai 1024px, empat mulai 1280px, lima mulai 1440px, enam mulai 1920px. Foto mobile rasio 4:3; desktop >=1024px memakai tinggi 144px dan gap teks 6px untuk mengurangi whitespace. Jangan mengubah mobile menjadi kartu horizontal.
- Nama dan nilai perolehan memakai foreground utama. Kode barang/NUP aktif memakai accent-fg dengan font-weight 600. **NUP Lama hanya bila terisi, memakai foreground-muted normal**, sehingga tidak lebih dominan dari NUP aktif. Lokasi, merk dan pengguna tetap metadata. Nama pengguna bila ada mengikuti prioritas helper existing: pengguna → nama_pengguna → penanggung jawab.
- Foto merupakan tombol preview tersendiri; judul/Detail merupakan tautan ke detail. Checkbox, tag dan hapus tetap kontrol terpisah dengan izin existing. Jangan membungkus seluruh kartu dalam link. Filter, seleksi, pagination, per-page dan query yang sama dipertahankan saat ganti view.
- Reuse helper foto dari katalog peminjaman melalui `bmn/_lib/asset-photos.ts`: geotag → depan → belakang → kiri → kanan → lokasi → foto lama. BPKB/STNK bukan cover. Thumbnail lazy-load, tanpa request detail per kartu atau kredensial tambahan ke URL eksternal. Foto tidak tersedia/rusak mendapat placeholder tanpa retry loop.
- Klik foto membuka **satu foto utama** dalam Dialog existing: object-contain, nama/NUP, tombol tutup, focus trap, Escape dan focus-return. Tidak ada carousel/zoom/upload/download. Preview light/dark membawa scope BMN sendiri melalui portal.
- Hover kontrol dan dialog tetap 150ms; kartu tidak bergerak, scale atau masuk bergiliran. Warna, seleksi dan fokus tidak bergantung animasi. Dukungan reduced motion dipertahankan; emulasi browser revisi ini tetap diuji mandiri oleh pengguna.

Verifikasi: fixture `bmn-assets-ui.cjs` dan `bmn-asset-grid.cjs` mencakup state tabel/grid, helper foto/pengguna, fallback gambar, storage/SSR dan permission UI. Browser diperiksa pada 359, 390, 767, 768, 1024, 1440 dan 1920px; preview/keyboard, seleksi lintas view, preferensi setelah reload dan light/dark diperiksa tanpa mengubah aset operasional. Rincian bukti serta batasnya ada di progress.

## Penerapan dan pemeriksaan

- Reuse token `[data-module="bmn"]`, primitive UI dan library Motion yang sudah terpasang. Jangan mengubah token HSL shadcn menjadi hex atau menambah theme provider/dependency.
- Portal dialog/popover yang memakai token BMN harus membawa konteks `data-module="bmn"`; jangan mengandalkan inheritance dari body. Jangan memakai CSS Data Aset secara global pada semua modul.
- Tautan tetap tautan, tombol tetap tombol. Hindari button dalam link atau role-button dalam button. Kontrol disabled harus benar-benar disabled, tidak hanya pudar.
- Periksa normal/hover/focus/selected/disabled/loading/empty, light/dark, keyboard serta viewport sempit. Tabel lebar boleh scroll di dalam kontainernya; seluruh halaman tidak boleh melebar.
- Jalankan pemeriksaan yang relevan dan catat bukti browser versus fixture/source. Jangan mengubah data operasional hanya untuk memicu animasi.

Implementasi saat panduan ini ditulis mencakup dashboard, Data Aset dan kontrol Export/filter tag/Impor yang disebutkan. Halaman lain, form create/detail dan isi dialog pengelolaan tag bersama belum dinyatakan seragam atau selesai diaudit. Cuplikan kelas pada dokumen modernisasi lama adalah snapshot; gunakan token/pola pada panduan ini untuk pekerjaan visual baru.
