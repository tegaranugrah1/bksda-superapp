# Requirements: Generator Dokumen & Riwayat Paket Lelang BMN

## 1. Pendahuluan & Tujuan Sistem

Modul **Paket Lelang BMN (`/bmn/auction-batches`)** berfungsi sebagai **Pusat Generator Dokumen Internal & Pengelola Riwayat Paket Lelang** untuk Balai Konservasi Sumber Daya Alam (BKSDA) Kalimantan Timur.

Sistem ini dirancang untuk:
1. Meng-generate **12 jenis dokumen cetak resmi internal** (SK Penghentian Penggunaan BMN, BA Koreksi Kondisi, SK Panitia Penjualan, SK Tim Penilai, SK Kebenaran Dokumen Kepemilikan, SPTJM Limit Lelang, BA Pemeriksaan & Penilaian, Surat Permohonan Lelang ke KPKNL, Nota Dinas, Surat Tugas, dll.).
2. Menyimpan **arsip riwayat (*historic record*)** dokumen dan daftar aset per paket secara independen dan permanen.
3. Menangani **barang tidak laku lelang** dengan memindahkannya ke **Paket Lelang Baru** secara bersih (dengan penomoran SK/Surat Srikandi baru) tanpa mengubah/merusak arsip dokumen paket lama.

---

## 2. Aturan Bisnis & Spesifikasi Utama

### 2.1 Eliminasi Nomor Lot
* **Ketentuan**: Kolom input **Nomor Lot** ditiadakan sepenuhnya dari alur penyusunan dokumen internal.
* **Alasan**: Dokumen internal resmi (SK Penghentian, BA Koreksi, SK Panitia, dll.) hanya menggunakan **Nomor Urut (1, 2, 3...)**, **Kode Barang**, dan **NUP**.
* **Dampak**: Komponen UI tidak lagi meminta pengguna meng-input Nomor Lot. Urutan aset diatur secara intuitif menggunakan tombol panah naik/turun (**Urutan / No. 1, 2, 3...**).

### 2.2 Penilaian / Nilai Taksiran (Valuation)
* **Ketentuan**: Fitur pengisian **Nilai Taksiran** (Limit Price per aset) tetap dipertahankan.
* **Alasan**: Nilai Taksiran fisik menjadi angka acuan resmi yang otomatis mengalir mengisi kolom Nilai Limit pada dokumen **SPTJM Limit Lelang**, **BA Pemeriksaan & Penilaian BMN**, dan **Surat Permohonan Lelang ke KPKNL**.

### 2.3 Penyederhanaan Navigasi (4 Langkah Utama)
Navigasi detail paket disederhanakan dari 8 tab terpisah menjadi **4 Langkah Utama**:

1. **Langkah 1: Aset & Nilai Taksiran**
   * Pengelolaan daftar aset paket, urutan baris (**1, 2, 3...**), dan pengisian nilai taksiran per aset.
2. **Langkah 2: Generator Dokumen Internal**
   * Input metadata tunggal (Nomor SK Srikandi, KAP, Tanggal, Kepala Balai, Panitia, Tim Penilai) yang otomatis berlaku untuk seluruh 12 jenis dokumen.
   * Tombol Cetak / Save PDF instan untuk setiap jenis dokumen.
3. **Langkah 3: Penetapan & Jadwal**
   * Pengisian nomor/tanggal Surat Persetujuan, Surat Penetapan, dan Tanggal Lelang resmi.
4. **Langkah 4: Realisasi & Pindah Paket Baru**
   * Pencatatan hasil lelang per barang (*Laku* vs *Tidak Laku*).
   * Tombol satu klik: **`Pindahkan Barang Tidak Laku ke Paket Baru`**.

### 2.4 Penanganan Barang Tidak Laku (Re-Batching & History Locking)
* Ketika lelang selesai dan ada barang yang *Tidak Laku*:
  1. Paket lama dikunci sebagai **Arsip Riwayat (Status: SELESAI / DIARSIPKAN)**. Dokumen cetak di paket lama tidak akan tertimpa atau berubah.
  2. Barang *Tidak Laku* dikeluarkan dari paket lama dan secara otomatis dimasukkan ke dalam **Paket Draf Baru**.
  3. Paket Baru memiliki ID paket terpisah dan siap dimasukkan nomor SK/Surat Srikandi baru secara bersih.

---

## 3. Jenis Dokumen Yang Didukung (Document Hub)

1. **SK Penghentian Penggunaan BMN** (Halaman 1–2 SK + Halaman Lampiran Landscape)
2. **BA Koreksi Kondisi BMN** (Halaman BA + Halaman Lampiran Portrait)
3. **SK Panitia Penjualan BMN**
4. **SK Tim Penilai BMN**
5. **SK Kebenaran Dokumen Kepemilikan BMN**
6. **SPTJM (Surat Pernyataan Tanggung Jawab Mutlak) Limit Lelang**
7. **SPTJM Dokumen Kepemilikan BMN**
8. **BA Pemeriksaan & Penilaian BMN**
9. **Surat Perintah Tugas Pemeriksaan**
10. **Surat Permohonan Lelang ke KPKNL**
11. **Nota Dinas Usulan Lelang**
12. **Surat Tugas Tim Penilai**
