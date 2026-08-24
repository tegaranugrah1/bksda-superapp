# Issue #579 — Tasks Modul Keuangan: SPJ

> **Branch rencana**: `development`
> **Dokumen**: `requirements.md`, `design.md`
> **Status**: Frontend web preview selesai; backend menunggu review

## Phase 0 — Review Scope

- [ ] Review issue #579 bersama user.
- [ ] Setujui tiga halaman awal: Dashboard, SPJ, dan Buat SPJ.
- [x] Tetapkan target platform fase pertama: web saja.
- [x] Tetapkan format workbook Excel harus dipertahankan persis.
- [ ] Konfirmasi definisi SPJ, SPT Panduan, SPTJB/Rekap, SPB, Daftar Isian, Kuitansi, Rinba, dan SPD.
- [x] Tetapkan semua pengguna dapat melihat SPJ; edit dan hapus hanya untuk admin dan superadmin.
- [ ] Tentukan role yang boleh membuat, memproses, menyetujui, menolak, dan menyelesaikan SPJ.
- [ ] Pastikan tidak ada perubahan pada `production`.

## Phase 1 — Finalisasi Alur dan Aturan Jumlah

- [ ] Tentukan apakah SPT Panduan linked selalu berasal dari modul Surat Tugas.
- [ ] Tentukan aturan nomor surat manual.
- [x] Tetapkan satu SPJ dapat memuat banyak pegawai.
- [x] Tetapkan SPTJB menggunakan satu dokumen dengan banyak baris pegawai/penerima.
- [x] Tetapkan SPB menggunakan satu dokumen dengan banyak baris yang mengikuti rekap pembayaran.
- [ ] Tentukan hubungan Daftar Isian dan Kuitansi dengan item pembayaran.
- [ ] Tentukan apakah Rinba dan SPD selalu satu per pegawai perjalanan.
- [x] Tetapkan item manual boleh memiliki penerima pegawai maupun pihak ketiga seperti UPTD/laboratorium.
- [x] Tetapkan seluruh dokumen menjadi satu paket dalam satu alur sampai selesai.
- [ ] Tentukan kapan jumlah turunan berhenti berubah atau menjadi terkunci.

## Phase 2 — Finalisasi Field dan Data Source

- [ ] Inventarisasi field SPT Panduan yang tersedia di backend.
- [ ] Inventarisasi field master pegawai: nama, NIP, pangkat/golongan, jabatan.
- [ ] Inventarisasi data kegiatan, akun, tujuan, dan periode perjalanan.
- [ ] Finalisasi field item pembayaran dan bukti.
- [ ] Finalisasi aturan pajak, pembulatan, dan total.
- [ ] Tentukan snapshot data pegawai pada saat SPJ dibuat.
- [ ] Tentukan status SPJ dan transisi per role.
- [ ] Tentukan kebutuhan upload lampiran dan format file.

## Phase 3 — Kontrak Backend dan Persistensi

- [ ] Rancang schema/relasi SPJ setelah aturan bisnis disetujui.
- [ ] Rancang endpoint list, detail, create draft, update draft, submit, dan status.
- [ ] Rancang endpoint search SPT dan pegawai bila belum tersedia.
- [ ] Tentukan endpoint atau service generator dokumen.
- [ ] Tambahkan authorization policy dan validasi server-side.
- [ ] Tambahkan transaksi/idempotensi agar submit tidak membuat dokumen ganda.
- [ ] Tambahkan test feature untuk sumber linked/manual dan jumlah dokumen turunan.

## Phase 4 — Navigasi dan Dashboard

- [x] Buat preview frontend web untuk navigasi modul Keuangan.
- [x] Buat Dashboard dengan data mock dan akses ke SPJ/Buat SPJ.
- [ ] Audit pola navigasi modul yang sudah ada.
- [ ] Tambahkan entry modul Keuangan sesuai permission.
- [ ] Buat Dashboard minimal dengan akses ke SPJ dan Buat SPJ.
- [ ] Tambahkan state loading, empty, dan error.
- [ ] Tambahkan metrik hanya jika sumber datanya sudah disepakati.

## Phase 5 — Halaman Daftar SPJ

- [x] Buat preview list SPJ dengan data mock.
- [x] Tambahkan preview search dan filter status.
- [x] Tampilkan role-based edit/hapus untuk admin dan superadmin.
- [ ] Implementasikan list SPJ dengan pagination.
- [ ] Tambahkan pencarian nomor, kegiatan, dan pembuat.
- [ ] Tambahkan filter status dan rentang tanggal jika disetujui.
- [ ] Tampilkan total nominal dan jumlah pegawai/dokumen.
- [ ] Tambahkan aksi sesuai permission: lihat, lanjutkan draft, atau status.
- [ ] Tambahkan loading, refresh, empty, error, dan duplicate-key guard.
- [ ] Tambahkan test rendering list, filter, pagination, dan permission.

## Phase 6 — Form Buat SPJ

- [x] Buat preview wizard tiga tahap: SPT Panduan, REKAP, Review & Cetak.
- [x] Buat preview SPT Panduan: linked vs manual.
- [x] Buat preview multi-pegawai dan penerima pihak ketiga.
- [x] Buat preview REKAP dengan uraian, bukti, jumlah, PPK, dan PDO.
- [x] Buat preview pilihan dokumen dan tombol print dalam satu paket.
- [ ] Buat step SPT Panduan: linked vs manual.
- [ ] Buat search SPT dan mapping data pegawai otomatis.
- [ ] Buat search pegawai untuk mode manual.
- [ ] Buat daftar pegawai dengan tambah/hapus dan dedupe.
- [ ] Integrasikan field REKAP dengan data kegiatan dan perjalanan nyata.
- [ ] Tambahkan validasi rentang tanggal.
- [ ] Integrasikan editor penerima, uraian, bukti, dan jumlah dengan API.
- [ ] Integrasikan tambah penerima eksternal dengan API.
- [ ] Integrasikan pemilihan PPK/PDO dan NIK dengan master pegawai.
- [ ] Finalisasi validasi field wajib dan nominal.
- [ ] Buat penyimpanan draft.
- [ ] Buat submit dan generator paket dokumen.
- [ ] Buat notifikasi sukses/gagal yang konsisten dengan modul existing.

## Phase 7 — Dokumen dan Output

- [ ] Finalisasi template SPTJB/Rekap berdasarkan workbook asli tanpa mengubah layout.
- [ ] Finalisasi template SPB berdasarkan workbook asli tanpa mengubah layout.
- [ ] Finalisasi template Daftar Isian berdasarkan workbook asli tanpa mengubah layout.
- [ ] Finalisasi template Kuitansi berdasarkan workbook asli tanpa mengubah layout.
- [ ] Finalisasi template Rinba berdasarkan workbook asli tanpa mengubah layout.
- [ ] Finalisasi template SPD berdasarkan workbook asli tanpa mengubah layout.
- [ ] Implementasikan generator hanya setelah layout dan field disetujui.
- [ ] Uji jumlah output terhadap jumlah pegawai/item pembayaran.
- [ ] Uji preview, download, dan/atau print web terhadap workbook asli.

## Phase 8 — Testing dan QA

- [ ] Jalankan typecheck.
- [ ] Jalankan lint pada file yang berubah.
- [ ] Uji SPT linked dengan beberapa pegawai.
- [ ] Uji SPT manual dengan search pegawai.
- [ ] Uji tambah/hapus pegawai dan item manual.
- [ ] Uji perubahan jumlah dokumen turunan.
- [ ] Uji validasi tanggal, nominal, nomor, dan field wajib.
- [ ] Uji simpan draft, lanjutkan draft, submit, dan duplicate submit.
- [ ] Uji permission pembuat vs admin Keuangan.
- [ ] Uji list pagination, filter, refresh, empty, dan error.
- [ ] Uji layout dokumen terhadap contoh workbook.

## Phase 9 — Dokumentasi dan Delivery

- [ ] Update `docs/progress.md` setelah implementasi selesai.
- [ ] Update Graphify hanya jika memang diminta untuk fase delivery.
- [ ] Buat PR dari branch kerja ke branch target yang disepakati.
- [ ] Review migration, endpoint, permission, dan output dokumen.
- [ ] Pastikan `production` tidak disentuh.

## Definition of Done

- [ ] Requirements dan design disetujui.
- [ ] Aturan jumlah dokumen disetujui.
- [ ] Kontrak backend dan permission disetujui.
- [ ] Dashboard, list SPJ, dan form Buat SPJ selesai.
- [ ] Dokumen turunan menghasilkan jumlah dan data yang benar.
- [ ] Typecheck, lint, test, dan QA manual lulus.
- [ ] Progress terdokumentasi.
