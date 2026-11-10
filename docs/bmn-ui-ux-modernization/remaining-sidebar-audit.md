# Audit sidebar BMN lanjutan

Permintaan: selaraskan seluruh menu sidebar tersisa dengan token warna dan motion BMN, uji, perbarui progress; **tanpa commit/push/deploy**. Status penutupan 11 November2026: cakupan visual seluruh8 menu dan kontrol aktif terkait selesai diverifikasi; batas tes operasional/reduced motion dijelaskan di bawah.

| Menu dan permukaan terkait | Status aktual | Bukti / pekerjaan tersisa |
| --- | --- | --- |
| Peminjaman; wizard; katalog; edit/kembali/hapus | Selesai; regresi akhir lulus | Fixture `bmn-sidebar-ui.cjs`: status, filter, pagination, izin, keyboard katalog, draft wizard. Browser: daftar, dialog dibuka/dibatalkan, seleksi lokal dan langkah kedua; mobile 390px dan light/dark. Tidak menyimpan transaksi. |
| Pemeliharaan | Selesai; regresi akhir lulus | HTTP 500 dari tipe return controller salah diperbaiki; tes SQLite memory 1 tes/10 assertion. Browser memuat empty state dengan pagination disabled. |
| Import Review; detail batch | Selesai; regresi akhir lulus | Fixture: status/error/read-only, filter/page, seleksi kolom via stub. Browser: riwayat dan detail batch approved, filter/reset/empty, fokus keyboard tetap pada input saat GET,390px tanpa overflow halaman, light/dark; tidak upload/approve/toggle data operasional. |
| Kandidat Rusak Berat; seleksi dan dialog buat paket | Selesai; regresi akhir lulus | Fixture: jumlah/nilai/payload lintas halaman, eligible/advisory, izin, pending/error/loading/empty. Browser: dua pilihan pada halaman berbeda, dialog batal/Escape/fokus kembali, warning, filter kosong,390px dan light/dark. Tidak membuat paket. Pembentuk dokumen aktif berada dalam detail Paket Lelang; lihat baris berikut. |
| Paket Lelang; detail/tab/dialog workflow | Selesai; regresi akhir lulus | Fixture: list/error/page/status/izin, empat hook draft saat child remount, retry audit, Dialog editor/read-only, validasi harga kosong dan izin realisasi. Browser fixture lokal: empat tab utama dan subtab SK, draft taksiran777.000/hasil pertama888.000/ulang999.000 tetap, picker panitia, tambah aset, kalkulator umum/kendaraan, editor, jadwal ulang dan batal tanpa submit; Escape/fokus, status DRAFT/REALISASI/BATAL/LELANG_ULANG,390px dan desktop, light/dark. Daftar operasional kosong; tidak membuat paket pengujian. |
| Aset Dihapus | Selesai; regresi akhir lulus | Fixture: meta pagination, total, izin per aksi, reset seleksi/konfirmasi, nilai buku0 dan error. Browser: empty, next disabled, search dan390px; toolbar mutasi memakai fixture karena data operasional kosong. |
| Dokumen & Laporan; riwayat/tab | Selesai; regresi akhir lulus | Fixture: export/loading, izin generate-delete, preview, empat draft/remount/manual party, snapshot aset BA, KTP validasi/lifetime/read-only dan pilihan kendaraan/error picker. Browser: empat form390px tanpa overflow, draft+override manual tetap saat pergantian jenis/tab, riwayat/filter/preview, picker keyboard/Escape/fokus, unggah via Tab, light/dark dan hover picker150ms. Tidak menyimpan/cetak/upload/hapus operasional. |
| Pengaturan Master; tiga tab/form/dialog | Selesai; regresi akhir lulus | Fixture: tab keyboard/ARIA/error, hierarki/sub-tag/draft/fokus callback, read-only, lokasi/jenis disabled/validasi. Browser: tiga tab, form tanpa simpan, Escape/focus-return, konfirmasi tag dibatalkan;390px dan light/dark. Footer Dialog surface-muted/border-subtle juga diperiksa aktual dark: rgb39,39,42/border63,63,70; Escape kembali ke Tambah Tag Baru. |

Aturan kontrol halaman pada `bmn-ui.css` hanya aktif di `.bmn-standard-ui`; portal membawa scope sendiri. Aturan navigasi terpisah hanya menyasar `.bmn-shell > aside` dan header mobile, sehingga tidak mengubah tombol/efek halaman terdahulu. Memakai kembali `assets.css`, token BMN dan primitive existing, tanpa dependency baru. `BmnTabContent` menerapkan pola **animasi di dalam tab** 160ms per fase dengan reduced-motion durasi 0. Kartu/tabel pasif tidak lift/zoom/stagger; feedback kontrol 150ms; entrance halaman 280ms. Efek Akses Cepat dashboard dipertahankan.

Batas pengujian: browser reduced motion diserahkan kepada pengguna sesuai keputusan sebelumnya. Fixture/source memeriksa fallback. Mutasi, unggah, approval, restore dan hapus permanen memakai fixture terisolasi; tidak dijalankan terhadap aset operasional. Komponen legacy `BorrowAssetModal`/`MaintenanceModal` tanpa caller tidak dianggap permukaan UI aktif. Komponen ScheduleTab dan SignatoriesDocumentsTab lama tidak mempunyai render caller pada empat tab aktif; workflow/* lama dan pembentuk dokumen kandidat tanpa caller tidak diubah sebagai UI aktif. Komponen dokumen cetak tetap dipertahankan.

## Temuan yang diperbaiki dan alasannya

| Temuan | Perbaikan / alasan |
| --- | --- |
| Warna hardcoded, border kontrol dan status tidak seragam; pointer/target ikon kecil | Fondasi bmn-standard-ui/portal BMN, pasangan token light/dark, kontrol150ms/min36px, status berlabel. Warna tag pengguna dan kertas cetak punya pengecualian eksplisit. |
| Pemeliharaan HTTP500 | Return type controller disesuaikan dengan AnonymousResourceCollection, bukan JsonResponse. Tes view-only membuktikan response/pagination20+1 dan empty. |
| Filter detail impor membuang fokus saat fetching | placeholderData mempertahankan data/panel saat GET, tombol mutasi disabled fetching. |
| Nilai kandidat terpilih hanya halaman terlihat | Map aset terpilih menyatukan jumlah, total nilai dan ID payload lintas halaman. |
| Draft form hilang saat panel tab unmount | Hook pemilik mempertahankan state; snapshot historis BA dan pilihan tersimpan dipertahankan; Blob KTP dibersihkan oleh pemilik, bukan child yang berpindah tab. |
| Aksi hapus mengikuti izin generate/update, bukan capability delete | Pisahkan izin delete pada laporan dan detail paket; read-only/disabled serta guard simpan mengikuti capability endpoint. |
| Editor dokumen memakai modal custom tanpa focus trap/Escape dan toolbar terpotong mobile | Reuse Dialog existing; header wrap; focus-return; subtab keyboard; narasi read-only disabled. |
| Error GET menyerupai data kosong | Retry terpisah untuk list/detail/menu terkait, termasuk peminjaman dan audit paket. |
| Validasi harga hasil lelang melempar di luar try | Pindahkan pembentukan payload ke dalam try supaya pesan validasi tertangkap dan tidak mengirim mutasi. Input harga ulang diseragamkan text/numeric+formatter ribuan. |
| Sidebar/metadata/fokus belum mengikuti token | Token shell dan12px, aria-current, label tautan saat collapsed, expanded/controls, invisible menu mobile tertutup dan fokus Escape ke toggle. |

## Audit warna, hover, dan animasi

| Aspek | Hasil audit | Bukti |
| --- | --- | --- |
| Warna | Surface, teks, dan border halus mengikuti pasangan light/dark BMN. Emerald untuk aksi utama; warna status mengikuti arti dan tetap disertai label. Warna tag pilihan pengguna serta kertas resmi dipertahankan. | Dialog editor gelap memakai surface `rgb(24, 24, 27)` dan teks `rgb(248, 250, 252)`; kertas tetap putih dengan teks hitam. Fixture menguji kontras token tombol utama. |
| Hover, pointer, dan fokus | Kontrol aktif memberi respons warna atau border selama 150 ms dan memakai pointer. Kontrol disabled tidak memberi kesan bisa diklik. Baris dan kartu pasif tidak naik atau membesar. Fokus keyboard terlihat dan kembali ke pemicu setelah dialog ditutup. | Browser memeriksa hover pemilih aset, pointer pada aksi dialog, serta Escape dan fokus kembali pada dialog peminjaman, kandidat, lelang, dan pengaturan. |
| Animasi | Entrance halaman 280 ms sekali. Perpindahan isi tab mengikuti pola Surat Tugas: keluar dan masuk masing-masing 160 ms, dengan indikator garis bawah terpisah. Draft tetap tersimpan di pemilik halaman. Efek Akses Cepat dashboard dipertahankan. | Browser memeriksa perpindahan tab dan retensi draft; fixture memeriksa durasi dan fallback reduced motion. Pengujian reduced motion di browser tetap oleh pengguna. |

## Verifikasi akhir aktual

- `node tests/bmn-sidebar-ui.cjs`: delapan menu, permission/read-only/error/loading/empty/filter/page/selection, mutation payload stub, keyboard, draft remount, validasi dan reduced-motion props. Tidak melakukan live writes.
- `node tests/bmn-assets-ui.cjs`, `node tests/bmn-detail-ui.cjs`, `node tests/bmn-dashboard-motion.cjs`, `node tests/bmn-asset-grid.cjs`: seluruhnya lulus; memastikan fondasi tambahan tidak merusak halaman BMN terdahulu.
- `next typegen` resmi setelah menghapus route fixture sementara, lalu TypeScript seluruh frontend `tsc --noEmit --incremental false`: lulus. ESLint seluruh file TS/TSX yang berubah dan fixture: lulus. `git diff --check`: lulus.
- Backend SQLite `:memory:`: `php artisan test --compact --filter=test_maintenance_index_returns_paginated_resources_for_view_only_users`:1 tes/10 assertion lulus. Config cache tidak aktif; database operasional tidak digunakan.
- Browser: daftar/menu memakai data lokal existing secara baca-saja. Karena daftar paket kosong, detail diuji memakai route fixture development sementara dengan query cache terisolasi dan mutation cache menolak mutasi. Tombol submit/cetak/upload/hapus operasional tidak dijalankan. Route fixture telah dihapus dan tipe Next diregenerasi; berkas fixture permanen adalah skrip Node di tests, bukan endpoint aplikasi.
- Bukti utama: bmn-candidates-mobile-dark.png, bmn-auction-list-mobile.png, bmn-auction-editor-mobile.png, bmn-auction-editor-dark.png, bmn-auction-documents-desktop.png, bmn-sidebar-final.png pada direktori visualisasi sesi. Foto kertas kerja kendaraan diverifikasi putih/#111/min-height16px; editor dark surface24,24,27/fg248,250,252; mobile viewport390px/page375px/dialog343px.
- Browser dikembalikan light, viewport override direset, dialog ditutup. Reduced motion browser tetap oleh pengguna; source/fixture fallback lulus. Tidak mengklaim pengujian cetak fisik atau transaksi/deployment produksi.

Status Git: **commit lokal**, tanpa push atau deploy, sesuai permintaan pengguna. `frontend/AGENTS.md` dihasilkan Next dev dan berada di luar commit.
