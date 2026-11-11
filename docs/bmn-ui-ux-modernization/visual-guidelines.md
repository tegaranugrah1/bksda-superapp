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
| Header Data Aset | Export/Impor naik 2px pada hover; feedback 150ms. |
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

Cakupan per11 November2026 mencakup dashboard, Data Aset, detail aset, kontrol Export/filter tag/Impor yang disebutkan, serta delapan menu sidebar pada [matriks audit](remaining-sidebar-audit.md). Form create manual telah dihapus karena penambahan aset melalui Impor Excel SIMAN. Isi dialog pengelolaan tag bersama di Data Aset berada di luar audit delapan menu ini. Cuplikan kelas pada dokumen modernisasi lama adalah snapshot; gunakan token/pola pada panduan ini untuk pekerjaan visual baru.

## Detail aset BMN — 10 November 2026

Pola pergantian kelompok isi pada detail ini disebut **animasi di dalam tab**. Untuk implementasi tab serupa berikutnya, ikuti [acuan animasi di dalam tab](../animate-ui-motion-guidelines.md#animasi-di-dalam-tab--acuan-untuk-implementasi-berikutnya); gunakan token modul tujuan, bukan menyalin warna Emerald ke semua modul.

- Detail memakai `bmn-assets-ui bmn-detail-ui` dan konteks `data-module="bmn"`, termasuk preview yang dirender melalui portal. Reuse kontrol/token dari `assets.css`; tambahan khusus detail berada pada `assets/[id]/detail.css`, tanpa override modul lain.
- Edit/Simpan memakai accent-solid/on-solid sesuai tema; Batal, unduh, verifikasi dan kontrol preview memakai secondary. Hapus memakai danger. Input/select memakai border-subtle dan outline fokus accent 2px/offset 2px. Tinggi kontrol formulir dan aksi utama minimum 36px. Label/metadata minimal 12px memakai foreground-muted; nilai memakai foreground utama. Nomor polisi tetap representasi plat netral hitam/putih, bukan status sukses/bahaya.
- Kondisi Baik/Rusak Ringan/Rusak Berat memakai success/warning/danger. Kondisi lain atau kosong memakai neutral. Status BMN hanya diberi success bila nilainya `Aktif`; nilai lain neutral, kosong berlabel “Status belum diisi”, tanpa mengarang status aktif. Pinjaman memakai info dan peringatan STNK tetap mengikuti batas tanggal existing.
- Foto utama dan thumbnail tidak memakai hover zoom, transform atau pulse statis. Foto tidak ditutup gradient gelap seluruh bidang; label/caption memakai surface dan foreground solid sesuai tema. Foto utama gagal dimuat mendapat fallback tanpa retry otomatis. Kartu informasi tidak mendapat hover shadow/lift atau entrance bergiliran. Nilai uang dapat membungkus agar tidak hilang di balik ellipsis.
- Aksi thumbnail selalu terlihat dan merupakan tombol tersendiri; upload kosong memakai button native, tautan Drive terpisah. Dokumen kosong benar-benar disabled. Pembaca tanpa izin update tidak mendapat aksi unggah/hapus/verifikasi. Input lokasi foto punya nama aksesibel; perilaku simpan saat blur existing tetap, jangan mengisinya saat uji visual pada data operasional.
- Preview detail memakai Dialog existing dengan gambar utuh object-contain, nama foto, nomor halaman, tombol tutup, focus trap, Escape dan pengembalian fokus ke pemicu yang masih terpasang. Navigasi beberapa foto dan halaman BPKB/STNK tetap tersedia melalui tombol serta panah kiri/kanan **di dalam Dialog**. Ini berbeda dari preview satu foto pada grid; jangan menghapus kemampuan dokumen detail demi menyamakan keduanya. Kegagalan gambar mendapat pesan status tanpa retry loop.
- Feedback kontrol/baris150ms ease-out; konten Dialog150ms, backdrop primitive existing. Tab detail mengikuti inbox Surat Tugas: garis bawah2px spring420/32, ID per instance, initial=false, aktif accent-fg/surface-muted, tanpa pill penuh. Kelompok formulir dalam isi tab berganti melalui AnimatePresence mode=wait/initial=false: lama memudar sambil naik8px lalu baru masuk dari bawah8px,160ms easeOut per fase. Fade CSS per kotak150ms sebelumnya dihapus. Tidak ada stagger baris; draft tetap di induk. Reduced motion langsung berganti tanpa gerak/fade/durasi. Tablist/tab/tabpanel, roving focus, ArrowLeft/Right/Home/End dan outline tetap; acuan ini tidak mengubah Akses Cepat Modul dashboard.
- Verifikasi aktual: browser light/dark, keenam tab di 390px, lebar 359/390/767/768/1024/1920px tanpa overflow halaman, edit-batal tanpa menyimpan, Dialog keyboard/focus-return dan foto Drive existing. Fixture `bmn-detail-ui.cjs` menguji form, status kosong/tidak dikenal, tab keyboard, read-only/loading/error, gambar gagal, navigasi foto/dokumen dan focus-return callback. Fixture bukan bukti tampilan browser kasus dummy; reduced motion browser tetap diuji mandiri pengguna. Tidak melakukan upload/hapus/verifikasi atau perubahan aset untuk pengujian.

Penyempurnaan area unggah: seluruh bidang tombol kosong sampai tepi frame menjadi target klik. Tombol enabled memakai cursor pointer; hover/focus-visible memakai accent-soft pada frame serta accent-fg pada border/teks selama150ms ease-out, tanpa lift/scale. Outline keyboard tetap tersedia. Read-only tetap native disabled dengan cursor default dan tanpa feedback aktif. Tautan Drive terpisah, bukan tombol bersarang.

Cursor interaktif detail: semua button enabled dan tautan href memakai pointer, termasuk unggah BPKB/STNK, verifikasi, unduh, tag, tab, edit/simpan/batal dan tombol Dialog preview. Native disabled atau aria-disabled=true memakai default. Aturan dipusatkan di detail.css, tidak mengubah Button global atau halaman/modul lain; jangan mengulang kelas cursor per tombol.

## Penambahan aset melalui Excel SIMAN

Penambahan aset dilakukan melalui **Data Aset → Impor Excel → review impor**. Formulir manual dan tombol Tambah Aset dihapus atas keputusan pengguna pada10 November2026; jangan membuat ulang wizard tersebut berdasarkan dokumen historis. URL lama `/bmn/assets/create` diarahkan ke `/bmn/assets`, tanpa mengambil detail aset bernama create. Impor tetap mengikuti izin `bmn.import.review`; filter, tabel/grid dan pengeditan detail aset tetap tersedia. Penghapusan ini hanya mencakup alur frontend manual, tidak menghapus data, API backend atau proses impor/review existing.


## Sidebar BMN lanjutan — penerapan bertahap

Peminjaman (termasuk wizard/katalog/dialog), Pemeliharaan, Import Review (daftar/detail) dan Aset Dihapus kini memakai `.bmn-assets-ui.bmn-standard-ui`, termasuk scope tersendiri pada portal. Kontrol enabled memakai pointer, disabled default; feedback150ms ease-out. Tabel hanya berubah background pada hover/focus-within; kartu katalog tidak lift/zoom. Entrance tunggal halaman280ms, tanpa replay pada filter/refetch. Status memakai token semantik light/dark, seleksi memakai Emerald, hapus memakai danger. Input/secondary mengikuti border halus BMN.

Pergantian langkah wizard memakai **animasi di dalam tab** melalui `BmnTabContent`:160ms per fase, presence wait/initial=false, opacity/y8, reduced motion durasi0; draft tetap di induk. Filter summary Import Review adalah tombol aria-pressed, memakai feedback warna150ms tanpa animasi panel data. GET filter mempertahankan panel/input agar fokus ketik tidak hilang; aksi mutasi disabled selama fetching. Aset Dihapus membersihkan pilihan dan konfirmasi saat pencarian/halaman/jumlah berubah agar target aksi tetap terlihat.

Status audit seluruh menu dan batas bukti browser/fixture dicatat pada [audit sidebar lanjutan](remaining-sidebar-audit.md). Catatan tahap awal ini telah dilengkapi penutupan seluruh8 menu pada11 November2026 di matriks tersebut. Uji browser reduced motion tetap oleh pengguna; fallback source/fixture diperiksa. Seluruh perubahan sidebar disimpan dalam commit lokal, tanpa push atau deploy.


## Pengaturan Master BMN — 10 November 2026

Tiga tab master mengikuti token surface/fg/border BMN; aksi positif Emerald, hapus danger. Kategori form adalah klasifikasi netral, bukan warning/success. Warna pilihan tag dan badge tag pengguna tetap berasal dari palette konfigurasi existing; tidak dipaksa satu warna. Swatch memakai aria-pressed, outline dan check hitam/putih yang terbaca di semua warna, tanpa scale/zoom. Aksi ikon minimal36px dengan pointer enabled; hapus tag induk/lokasi/jenis yang masih terpakai native disabled sesuai guard existing. Metadata minimal12px.

Tab memakai underline2px spring420/32, initial=false dan useId; ArrowLeft/Right/Home/End memilih serta memfokuskan tab. Kelompok isi memakai BmnTabContent160ms per fase, fallback reduced motion0. Query/pengetikan tidak memutar ulang entrance. Form/konfirmasi membawa scope BMN pada portal, surface solid dan footer surface-muted, feedback150ms, fokus kembali ke pemicu setelah Escape/batal. ConfirmDialog menerima scope opsional; pemanggil modul lain tidak otomatis mendapat warna BMN. Tabel data scroll internal; header empty disembunyikan pada mobile agar pesan kosong/CTA terlihat.


## Dokumen & Laporan BMN — 11 November 2026

Export, empat form dokumen, riwayat dan picker barang memakai token BMN. Ketiga unduhan Emerald; secondary berborder transparan; hapus danger; klasifikasi jenis dokumen netral, status Draf/Terbit warning/success. Native checkbox di tabel diberi nama dan selected state Emerald. Pemilih barang memakai label+checkbox native (klik/Space memilih sekali), scope portal BMN, lebar maksimal viewport-2rem,150ms, Escape/fokus kembali. Area KTP tetap native file input yang dapat dicapai Tab, dengan hover/focus-within accent150ms tanpa lift; read-only disabled. Kertas/preview resmi tetap putih/hitam dan komponen cetaknya tidak dimodifikasi.

Tab utama underline2px spring420/32/useId; pergantian isi tab/jenis160ms per fase memakai BmnTabContent. **State form dimiliki halaman induk** melalui hook form yang diekspor dari file tab masing-masing, diteruskan sebagai formState bertipe ReturnType. Child boleh unmount selama presence wait; field, pilihan aset, override pihak dan berkas tetap tersimpan di memori halaman. Tidak memakai localStorage; meninggalkan halaman/reload mengakhiri draft. Sinkronisasi record edit dijalankan sekali per objek mode, bukan setiap remount. Respons riwayat sudah resource lengkap sehingga fetch detail berulang dihapus agar tidak menimpa draft. BA Pemakaian menggabungkan snapshot historis dengan opsi aset pegawai tanpa mengganti seleksi arsip. Blob KTP dilepas oleh pemilik state saat URL diganti atau halaman ditutup, bukan ketika berpindah tab.

Tablist menyisakan padding4px/scroll-margin4px untuk outline2px+offset2px. Navigasi panah/Home/End memfokuskan dan scrollIntoView nearest sehingga indikator/fokus tidak terpotong di mobile. Label/metadata aplikasi minimal12px; isi dokumen cetak mengikuti format dokumennya.

## Kandidat Rusak Berat — 11 November 2026

Buat Paket adalah aksi Emerald. Seleksi checkbox dapat lintas halaman; jumlah dan nilai menjumlahkan seluruh pilihan, bukan halaman terlihat saja. Aset tidak eligible tidak dapat dipilih; warning dokumen tetap advisory yang bisa dibuka keyboard dengan aria-expanded/controls. Tabel scroll di kontainer pada mobile; empty/error tidak memaksa lebar tabel. Dialog scopeless tidak digunakan: portal memakai bmn-assets-ui/bmn-standard-ui dan token BMN, tombol minimal36px/pointer/150ms, nama wajib, submit disabled saat fetching/pending. Tidak ada transaksi operasional dibuat saat pengujian.

## Paket Lelang, editor dan penutupan sidebar — 11 November 2026

Daftar Paket Lelang menggunakan link tunggal Button asChild (tanpa tombol bersarang), label pencarian/filter, status semantik dan pagination aman saat fetching. Gagal GET diberi retry, tidak ditampilkan sebagai empty state. Detail memakai empat tab aktif: Aset & Nilai Taksiran, Pusat Generator Dokumen, Realisasi & Pindah Paket, Riwayat Audit. Draft ada di pemilik page; pola motion160ms per fase/underline420/32 tetap berlaku.

Tambah Aset di sini berarti memasukkan aset existing ke paket, bukan menghidupkan formulir tambah manual. Kandidat dipilih melalui checkbox bernama dan selected row; baris pasif tidak diberi klik palsu. Peringatan kelengkapan advisory tetap tidak memblokir aset eligible. Dialog kalkulator umum/kendaraan, quick edit dokumen aset, jadwal ulang dan pembatalan memakai scope BMN150ms/Escape/focus-return. Tabel keuangan scroll internal pada mobile.

Editor isi dokumen memakai Dialog existing dengan focus trap, nama/deskripsi aksesibel dan Escape; toolbar membungkus sehingga Simpan/Tutup tetap terlihat di390px. Narasi read-only memakai fieldset disabled dan guard simpan, tetapi subtab SK tetap dapat dibuka. Kertas resmi di sisi pratinjau tetap putih/hitam; toolbar/form aplikasi memakai tema BMN. Jangan men-tokenisasi isi komponen dokumen cetak berdasarkan tema layar. Kertas kerja kendaraan mempertahankan ukuran sel cetak dengan pengecualian .kk-page pada fondasi CSS.

Izin UI mengikuti capability: delete terpisah dari update; dokumen read-only mematikan edit; realisasi/finalisasi mengikuti bmn.auction.finalize; transisi mengikuti update; pindah paket memerlukan create+update dan finalisasi jika paket lama belum final. Backend permission tetap otoritas; tidak ada perubahan izin backend dalam pekerjaan visual ini.

Sidebar/header memakai token BMN, metadata12px, pointer dan focus outline. Menu aktif ber-aria-current=page, toggle mobile ber-aria-expanded/controls; drawer tertutup tidak terlihat/focusable pada mobile; Escape mengembalikan fokus ke toggle. Scope bmn-shell tidak mengubah efek Quick Actions dashboard. [Matriks audit dan hasil tes seluruh8 menu](remaining-sidebar-audit.md).
