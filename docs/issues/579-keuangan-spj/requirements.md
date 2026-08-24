# Issue #579 — Requirements Modul Keuangan: SPJ

> **Type**: `feature` / `keuangan` / `web`
> **Branch rencana**: `development`
> **GitHub**: https://github.com/tegaranugrah1/bksda-superapp/issues/579
> **Status**: Frontend web preview tersedia; backend menunggu review

## 1. Latar Belakang

Modul Keuangan diperlukan untuk mengelola Surat Pertanggungjawaban (SPJ) yang dibuat oleh pegawai. Alur SPJ tidak hanya berupa satu form, tetapi menghasilkan beberapa dokumen pembayaran yang saling berkaitan: SPT Panduan, Surat Pernyataan Tanggung Jawab Belanja, Surat Persetujuan Bayar, Daftar Isian, Kuitansi, Rincian Biaya Perjalanan (Rinba), dan SPD.

Contoh format dokumen mengacu pada workbook yang diberikan:

- `SPT Panduan`: data surat tugas dan pegawai yang melaksanakan perjalanan.
- `Rekap` / `Surat Pernyataan Tanggung Jawab Belanja`: daftar penerima dan rincian belanja.
- `SPB`: Surat Persetujuan Bayar.
- `Daftar Isian`: rincian permintaan pembayaran.
- `Kwitansi`: bukti penerimaan pembayaran.
- `Rinba`: rincian biaya perjalanan dinas dan perhitungan SPD rampung.
- `spd`: Surat Perjalanan Dinas.

## 2. Tujuan

1. Menyediakan pintu masuk modul Keuangan melalui Dashboard.
2. Menyediakan daftar seluruh SPJ yang dibuat pegawai.
3. Menyediakan form pembuatan SPJ yang dapat mengambil data dari SPT pegawai atau diisi manual.
4. Menjaga jumlah dokumen turunan tetap konsisten dengan jumlah pegawai/perjalanan yang dipilih.
5. Menyimpan hubungan antara SPJ, pegawai, kegiatan, dan dokumen pembayarannya.

## 3. Halaman Awal

| Halaman | Tujuan | Status rencana |
|---|---|---|
| Dashboard | Ringkasan modul Keuangan dan akses cepat ke SPJ | Baru |
| SPJ | List seluruh SPJ yang dibuat pegawai | Baru |
| Buat SPJ | Form pembuatan SPJ bertahap | Baru |

Dashboard belum memiliki metrik final. Untuk review, kandidat ringkasan adalah jumlah SPJ, draft, diajukan, disetujui, dan selesai.

## 4. Aktor dan Hak Akses

Kandidat aturan yang perlu dikonfirmasi:

- Pegawai dapat membuat SPJ untuk dirinya sendiri dan/atau anggota perjalanan yang dipilih.
- Pegawai dapat melihat SPJ yang dibuatnya.
- Admin/pengelola Keuangan dapat melihat seluruh SPJ dan mengelola statusnya.
- Akses modul mengikuti pola permission yang sudah digunakan aplikasi.
- Otorisasi backend tetap menjadi sumber kebenaran; penyembunyian menu frontend bukan pengganti authorization.

## 5. Alur Fungsional

### FR-01 — Masuk ke modul

Pengguna yang memiliki akses Keuangan dapat membuka Dashboard, SPJ, dan Buat SPJ melalui navigasi modul.

### FR-02 — Daftar SPJ

Halaman SPJ menampilkan seluruh SPJ yang dapat diakses pengguna, minimal dengan:

- Nomor SPJ atau nomor dokumen utama.
- Nama kegiatan.
- Pegawai/pembuat SPJ.
- Tanggal atau periode perjalanan.
- Jumlah pegawai/perjalanan.
- Total nilai SPJ.
- Status SPJ.
- Aksi lihat detail, lanjutkan draft, atau aksi lain sesuai permission.

Daftar perlu mendukung pencarian, filter status, dan pagination. Detail filter masih perlu disepakati.

### FR-03 — SPT Panduan sebagai sumber data

Pada form Buat SPJ, pengguna dapat memilih salah satu cara:

1. Mengisi nomor surat SPT Panduan secara manual.
2. Mencari dan memilih SPT milik pegawai yang sudah tersedia.

Jika SPT pegawai dipilih, sistem mengisi data yang tersedia secara otomatis:

- Nomor surat.
- Nama pegawai.
- NIP.
- Pangkat/golongan.
- Jabatan.
- Data perjalanan yang tersedia pada SPT, termasuk tujuan dan tanggal.

Jika nomor diisi manual dan tidak terhubung dengan SPT, pegawai dipilih melalui pencarian. Data pegawai tetap harus berasal dari master pegawai, bukan diketik bebas, kecuali field manual yang memang disepakati.

### FR-04 — Data umum kegiatan

Form perlu menampung data yang terlihat pada workbook, minimal:

- Satuan kerja.
- Kode kegiatan.
- Nama kegiatan.
- Kode sub-kegiatan.
- Nama sub-kegiatan.
- Uraian kegiatan.
- Instansi atau unit terkait.
- Akun/rekening anggaran.
- Periode pelaksanaan.
- Tujuan perjalanan.

Daftar final field, mana yang wajib, dan sumber datanya menunggu review.

### FR-05 — Pegawai perjalanan

Satu SPJ dapat memuat banyak pegawai. Form menampilkan daftar pegawai yang terkait dengan SPT/SPJ. Pengguna dapat:

- Melihat data nama, NIP, pangkat/golongan, dan jabatan.
- Menambah pegawai dari pencarian master pegawai.
- Menghapus pegawai sebelum dokumen dibuat.
- Menghindari duplikasi pegawai dalam satu SPJ.

### FR-06 — Dokumen turunan dengan jumlah dinamis

Aturan awal yang diusulkan untuk review:

| Dokumen | Jumlah awal yang diusulkan |
|---|---|
| Surat Pernyataan Tanggung Jawab Belanja / Rekap | Mengikuti jumlah pegawai yang dipilih |
| Surat Persetujuan Bayar / SPB | Mengikuti jumlah SPTJB/pegawai yang dipilih |
| Daftar Isian | Mengikuti jumlah item SPTJB |
| Kuitansi | Mengikuti jumlah item SPTJB |
| Rinba | Mengikuti jumlah pegawai yang memiliki perjalanan/SPD |
| SPD | Mengikuti jumlah pegawai yang memiliki perjalanan |

Pengguna dapat menambah item manual pada SPTJB/SPB sesuai kebutuhan transaksi tambahan. Penerima item manual boleh berupa pegawai maupun pihak ketiga, seperti UPTD atau laboratorium. Setiap item manual harus memiliki penanda sumber `manual`, tipe penerima, dan tetap masuk ke dokumen turunan yang relevan. Penambahan manual tidak boleh mengubah data pegawai master.

### FR-07 — Nilai dan rincian pembayaran

Setiap item pembayaran minimal dapat memuat:

- Penerima.
- Rekening bank dan nama bank.
- Rekening atas nama.
- Uraian.
- Tanggal pelaksanaan.
- Nilai SPJ.
- PPN.
- PPh.
- Jumlah yang dibayarkan.
- Keterangan/bukti.

Rumus pajak, pembulatan, validasi nominal, dan kewajiban rekening perlu dikonfirmasi sebelum implementasi.

### FR-08 — Draft dan pengiriman

Form harus mendukung penyimpanan draft sebelum seluruh dokumen selesai. Sebelum dikirim, pengguna melihat ringkasan data dan jumlah dokumen yang akan dibuat. Setelah berhasil dikirim, sistem menampilkan notifikasi sukses dan nomor/referensi SPJ.

Status kandidat:

- `draft`
- `diajukan`
- `diproses`
- `disetujui`
- `ditolak`
- `selesai`

Daftar status final dan siapa yang boleh mengubahnya perlu disepakati.

## 6. Validasi dan Konsistensi

- SPT Panduan atau sumber manual harus dipilih.
- Minimal satu pegawai harus ada.
- Nomor dokumen tidak boleh duplikat dalam ruang lingkup yang ditentukan.
- Tanggal akhir tidak boleh lebih awal dari tanggal mulai.
- Nilai pembayaran tidak boleh negatif.
- Jumlah dokumen turunan harus terlihat sebelum submit.
- Penghapusan pegawai harus memperbarui dokumen turunan yang belum dikunci.
- Dokumen yang sudah diajukan/disetujui tidak boleh berubah tanpa aturan revisi yang jelas.

## 7. Target Platform Fase Pertama

Implementasi fase pertama ditujukan untuk **web**. Mobile belum termasuk scope sampai alur dan format dokumen web stabil.

Format workbook Excel harus dipertahankan secara persis, termasuk nama sheet, urutan dokumen, layout, field, dan konfigurasi cetak yang relevan.

Keputusan yang sudah disepakati:

- Satu SPJ dapat memuat banyak pegawai.
- Item manual boleh memiliki penerima pihak ketiga, termasuk UPTD/laboratorium.
- Semua dokumen menjadi satu paket dalam satu alur SPJ sampai selesai.
- Semua pengguna dapat melihat SPJ.
- Edit dan hapus hanya tersedia untuk admin dan superadmin.
- Target fase pertama adalah web saja.
- Format workbook Excel dipertahankan secara persis.

## 8. Scope Implementasi Saat Ini

- Frontend web preview dengan data mock.
- Dashboard, daftar SPJ, dan wizard Buat SPJ.
- Navigasi modul dan pembatasan aksi edit/hapus berdasarkan role frontend.

## 9. Di Luar Scope Fase Review

- Backend, migration database, dan endpoint final.
- Integrasi data SPT/pegawai nyata.
- Generator atau export template Excel/PDF final.
- Approval workflow detail.
- Integrasi sistem perbendaharaan eksternal.
- Tanda tangan elektronik.
- Perubahan branch `production`.

## 10. Acceptance Criteria Rencana

- [ ] Issue, requirements, design, dan tasks direview.
- [ ] Tiga halaman awal disetujui.
- [ ] Sumber SPT Panduan manual vs SPT pegawai disepakati.
- [ ] Aturan jumlah dokumen turunan disepakati.
- [ ] Field, status, role, dan validasi disepakati.
- [ ] Format output dokumen disepakati.
- [ ] Baru setelah seluruh poin di atas disetujui, implementasi boleh dimulai.

## 11. Pertanyaan Review

1. Apakah `SPT Panduan` yang dipilih harus selalu berasal dari modul Surat Tugas, atau boleh nomor manual tanpa dokumen sumber?
2. Apakah Dashboard perlu metrik final pada fase pertama atau cukup menjadi landing page dengan akses menu?

Keputusan yang sudah ditetapkan: SPTJB/SPB menggunakan satu dokumen dengan banyak baris; seluruh dokumen menjadi satu paket dalam satu alur; semua pengguna dapat melihat SPJ, sedangkan edit dan hapus hanya untuk admin/superadmin.
