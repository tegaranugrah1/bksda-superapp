# Requirements Document: Modul Surat (Surat Masuk & Surat Keluar)

## 1. Ringkasan Eksekutif
Modul **Surat** pada BKSDA Superapp merupakan modul pengelolaan persuratan organisasi yang mencakup pencatatan, penatausahaan, penerusan disposisi, dan pelacakan riwayat **Surat Masuk** dan **Surat Keluar**.

---

## 2. Kebutuhan Pengguna & Fitur Utama

### 2.1 Navigasi & Struktur Menu
* **Portal / Dashboard Modul Surat (`/surat`)**: Ringkasan statistik surat masuk, surat keluar, dan status disposisi.
* **Menu Surat Masuk (`/surat/masuk`)**:
  * Daftar seluruh Surat Masuk (dengan filter tanggal, sifat, pengirim, dan kata kunci).
  * Input Surat Masuk baru (`/surat/masuk/create`).
  * Detail & Cetak Lembar Disposisi 2-Up (`/surat/masuk/[id]`).
* **Menu Surat Keluar (`/surat/keluar`)**:
  * Daftar seluruh Surat Keluar.
  * Input Surat Keluar baru (`/surat/keluar/create`).
  * Detail Surat Keluar (`/surat/keluar/[id]`).

---

### 2.2 Form Input & Lembar Disposisi Surat Masuk (Gambar 1)
Berdasarkan dokumen fisik **Lembar Disposisi BKSDA KALTIM**, struktur data dan field input Surat Masuk meliputi:

#### A. Header Disposisi
1. `tanggal_agenda` (Tanggal Agenda / Penerimaan, default: hari ini, contoh: `23/07/2026`).
2. `no_agenda` (Nomor Agenda Surat Masuk, contoh: `1000`).

#### B. Sifat Surat (Pilihan Tunggal/Banyak)
* `Biasa`
* `Penting`
* `Sangat Penting`
* `Rahasia`
* `Segera`
* `Kilat`

#### C. Informasi Surat Masuk
* `indeks` (Indek berkas)
* `kode` (Kode Klasifikasi arsip/surat)
* `no_surat` (Nomor Surat Masuk dari pengirim, contoh: `S.176/PJL/TU/KUM.01.02/B/07/2026`)
* `referensi` (Nomor/Kode Referensi terkait)
* `tanggal_penyelesaian` (Target Tanggal Penyelesaian Disposisi)
* `tanggal_surat` (Tanggal tertera pada Surat Masuk, contoh: `20/07/2026`)
* `isi_ringkas` (Ringkasan perihal / isi surat)
* `asal_surat` (Instansi/Pengirim asal surat, contoh: `Dirjen KSDAE Direktorat Pemanfaatan Jasa Lingkungan`)
* `lampiran` (Keterangan jumlah/bentuk lampiran, contoh: `7 Lembar`)

#### D. Diteruskan Kepada Yth (Tujuan Disposisi Subbagian/Urusan)
Checklist penerus disposisi:
1. `Ka Sub Bag TU`
2. `Urusan Umum dan Perlengkapan`
3. `Urusan Kepegawaian`
4. `Urusan Program`
5. `Urusan Keuangan`
6. `Urusan Data Evlap dan Humas`
7. `Urusan Teknis`
8. `Urusan Perlindungan`
9. `PPK FOLU NC 2030`
10. `Penerus Tambahan` (`1. Sdr/Sdri.`, `2. Sdr/Sdri.`, `3. Sdr/Sdri.`)

#### E. Disposisi (Instruksi Pimpinan)
Checklist instruksi disposisi:
* `Untuk Diselesaikan`
* `Harap Saran/Pertimbangan`
* `Penjelasan`
* `Untuk Diketahui/dipergunakan seperlunya`
* `Bahas dengan saya`

#### F. Catatan & Tanda Tangan
* Field teks `catatan` (Catatan arahan tambahan pimpinan).
* Penandatangan Disposisi:
  * `Ka Sub Bag TU`
  * `Kepala Balai`

---

### 2.3 Cetak Lembar Disposisi 2-Up (Letter Divided by 2 Layout)
* **Kebutuhan Cetak Spesifik**:
  * Lembar Disposisi jika dicetak fisik berukuran **Letter dibagi 2** (setengah halaman Letter per lembar disposisi).
  * Halaman cetak / form input mendukung opsi **cetak 2 lembar sekaligus** (2-Up layout) pada 1 lembar kertas Letter/A4 portrait agar hemat kertas dan efisien saat dipotong.

---

### 2.4 Form Input Surat Keluar
Field data Surat Keluar:
* `no_surat` (Nomor Surat Keluar)
* `kode_klasifikasi` (Kode Klasifikasi Surat)
* `tanggal_surat` (Tanggal Surat)
* `tujuan_surat` (Tujuan / Penerima Surat)
* `perihal` (Perihal / Ringkasan)
* `sifat` (Sifat Surat: `Biasa`, `Penting`, `Rahasia`, dll.)
* `lampiran` (Jumlah Lampiran)
* `file_surat` (Upload berkas PDF/Gambar Surat Keluar)
* `pembuat_user_id` / `penandatangan_id` (Pegawai penandatangan)

---

## 3. Kebutuhan Teknis & Arsitektur (Rules Compliance)

1. **Security Rules**:
   * Seluruh API backend wajib menggunakan middleware `auth:sanctum`.
   * Model Laravel tidak boleh `$guarded = []`, wajib mengeksplisikan `$fillable`.
   * Upload berkas disimpan di private storage (`storage/app/private/surat/`).

2. **Access Control Rules**:
   * Middleware level module-access `module.access:surat` atau `surat_management`.

3. **Database Rules**:
   * Tabel modul ber-prefix: `surat_masuk`, `surat_keluar`, `surat_disposisi`.
   * Semua list endpoint wajib menggunakan pagination.
   * Model memiliki relasi SoftDeletes.

4. **Frontend Rules**:
   * Komponen UI modern, bersih, responsive dengan tailwind/standard design system.
   * Semua API call melalui `lib/api.ts`.
