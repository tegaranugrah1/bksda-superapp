# Requirements Document: BMN Auction Batches (Proses Lelang BMN)

## Introduction

Proses Lelang Barang Milik Negara (BMN) di BKSDA Jawa Timur / Kalimantan Timur (sesuai konteks Balai) merupakan bagian krusial dari siklus hidup pengelolaan aset negara. Aset dengan kondisi **Rusak Berat** yang sudah tidak dapat digunakan untuk mendukung tugas operasional kedinasan harus dihapuskan dari daftar inventaris melalui proses lelang resmi bekerja sama dengan Kantor Pelayanan Kekayaan Negara dan Lelang (KPKNL) serta Direktorat Jenderal Kekayaan Negara (DJKN).

Fitur **BMN Auction Batches** dirancang untuk mendigitalkan proses penyusunan berkas lelang, yang sebelumnya bersifat temporer di sisi frontend (in-memory state pada `/bmn/auction-candidates`), menjadi entitas data yang tersimpan secara terstruktur di database. Dengan modul ini, pengguna dapat menyusun draf batch lelang, mengelompokkan aset ke dalam Lot lelang, menginput Nilai Taksiran (limit value), memantau status pengajuan lelang dari draf hingga realisasi penjualan, membekukan data penandatangan dokumen (signatories) untuk keperluan cetak arsip sejarah, dan secara otomatis melakukan penghapusan (write-off/soft-delete) terhadap aset yang berhasil terjual.

## Product Decisions

- **Database-Backed Batches**: Setiap batch lelang disimpan dalam tabel `bmn_auction_batches` dengan relasi many-to-many ke tabel `bmn_assets` via tabel junction `bmn_asset_auction_batch`.
- **Status Lifecycle**: Batch lelang memiliki 5 status utama yang dikendalikan oleh mesin status backend:
  - `DRAFT`: Pengumpulan aset kandidat rusak berat, penyusunan Lot, pengisian Kertas Kerja, penginputan nomor surat dokumen, pemilihan Kepala Balai/Panitia/Tim Penilai/Pemeriksa. Aset masih berstatus aktif di inventaris umum.
  - `DIAJUKAN`: Berkas dikunci dan diajukan ke instansi terkait (KL/KPKNL). Tidak boleh ada perubahan aset, lot, nilai taksiran, maupun susunan panitia.
  - `JADWAL_DITETAPKAN`: KPKNL telah menerbitkan Surat Penetapan Jadwal Lelang. Pengguna menginput nomor penetapan dan tanggal pelaksanaan lelang.
  - `REALISASI`: Pelaksanaan lelang selesai. Pengguna memasukkan hasil lelang per aset (Terjual/Tidak Terjual beserta harga terbentuk). Batch dikunci secara permanen.
  - `BATAL`: Batch dibatalkan. Aset yang ada dalam batch dilepas kembali ke pool kandidat rusak berat.
- **Lot & Valuation Inputs**: Pengguna dapat membagi aset di dalam satu batch menjadi beberapa **Lot** (misal: Lot 1 Scrap Logam, Lot 2 Kendaraan Bermotor). Nilai Taksiran (Limit Lelang) per aset dapat diinput manual untuk barang umum atau disinkronisasi dari Kertas Kerja Analisis Penentuan Nilai Taksiran BMN (Worksheet).
- **Frozen Signatory & Metadata Snapshot**: Detail penandatangan (Kepala Balai, Panitia, Tim Penilai, Pemeriksa) beserta nomor-nomor surat disimpan dalam kolom `metadata` (JSON) pada `bmn_auction_batches` untuk menjamin hasil cetak dokumen fisik di masa mendatang konsisten meskipun terjadi rotasi jabatan di kemudian hari.
- **Automated Write-Off (Auto-Disposal)**: Ketika batch lelang dinyatakan selesai dengan status `REALISASI`, sistem secara otomatis memicu fungsi disposal backend (`AssetService::disposeAsset()`) untuk semua aset dalam batch tersebut yang ditandai sebagai **Terjual** (`is_sold = true`). Aset yang tidak terjual tetap berada di status aktif dan dapat diikutkan pada batch lelang berikutnya.
- **Asynchronous External Document Flow (Out of Scope)**: Alur tanda tangan basah/elektronik di luar aplikasi (Srikandi) ditangani secara manual oleh pengguna. Aplikasi ini fokus sebagai draft generator dokumen legal, local inventory coordinator, dan pencatatan status hukum aset.

## Requirement Score

Nilai target requirement setelah audit: **9.8/10**.

Alasan:
- **Kepatuhan Regulasi DJKN/KPKNL**: Aset dipaketkan dalam Lot, memiliki batas harga limit (Nilai Taksiran), dan merekam Surat Penetapan KPKNL secara eksplisit.
- **Integritas Sejarah (Signature Snapshot)**: Mengatasi isu mutasi pegawai dengan membekukan data nama/NIP penandatangan di kolom JSON metadata batch.
- **Siklus Hidup Aset Otomatis**: Integrasi langsung dengan modul disposal untuk menuliskan status soft-delete dan riwayat perubahan (`AssetUpdate`) saat lelang terealisasi.
- **Batasan Jelas**: Tidak memaksakan integrasi API Srikandi yang kompleks, melainkan memposisikan sistem sebagai penghasil dokumen fisik siap cetak dan pencatat status lokal.

Sisa risiko yang diterima:
- Validasi status kepemilikan aset secara fisik tetap bergantung pada verifikasi lapangan oleh Panitia Pemeriksa.
- Selisih harga lelang riil dengan harga buku SIMAK-BMN/Sakti harus disesuaikan secara manual oleh petugas operator Sakti di luar sistem ini.

## Glossary

- **Batch Lelang (Auction Batch)**: Bundel pengelompokan aset BMN rusak berat yang diajukan bersamaan untuk proses penghapusan melalui lelang KPKNL.
- **Kandidat Lelang (Auction Candidate)**: Aset BMN aktif yang memiliki kondisi fisik `Rusak Berat` yang berhak dimasukkan ke dalam Batch Lelang.
- **Lot Lelang (Lot Number)**: Nomor pengelompokan barang lelang di KPKNL (misal: Lot 1 terdiri dari 5 unit AC, Lot 2 terdiri dari 1 unit Mobil Dinas).
- **Nilai Taksiran (Limit Price)**: Nilai taksiran harga minimum yang ditetapkan oleh Tim Penaksir sebagai batas bawah penawaran lelang.
- **Harga Terbentuk (Realized Price)**: Harga penawaran tertinggi yang sah dan disetujui dalam risalah lelang untuk aset bersangkutan.
- **Penghapusan Otomatis (Auto-Disposal)**: Proses pengubahan status aset menjadi non-aktif (`Dihapus/Pemutihan`) dan soft-delete dari database secara otomatis setelah dinyatakan terjual.
- **Frozen Signatory**: Snapshot data profil pegawai (Nama, NIP, Golongan, Jabatan) saat batch disetujui/diajukan, mencegah perubahan format cetak dokumen di kemudian hari akibat pembaruan master data pegawai.

## Scope Phase

### In-Scope
- Skema database (migrations) untuk `bmn_auction_batches` dan `bmn_asset_auction_batch`.
- API Endpoints (Laravel backend) untuk CRUD Batch Lelang, manajemen relasi aset, perubahan status batch, penginputan hasil lelang, dan auto-disposal.
- User Interface (Next.js frontend) untuk pengelolaan daftar batch lelang, pembuatan draf batch baru dari daftar kandidat rusak berat, penyusunan urutan aset & lot, pengisian kertas kerja terintegrasi database, pembekuan penandatangan, serta dashboard ringkasan status batch lelang.
- Integrasi 13 Dokumen Pendukung Lelang (Cetak PDF/Print Layout) yang mengambil data langsung dari state batch di database, menggantikan fungsi client-only yang ada sebelumnya.

### Out-of-Scope
- Pembuatan Berita Acara Serah Terima (BAST) Barang Lelang dengan pembeli lelang (ditunda ke fase berikutnya).
- Sinkronisasi API langsung dengan aplikasi *Srikandi* milik Arsip Nasional RI untuk tanda tangan elektronik.
- Sinkronisasi data real-time dengan portal lelang.go.id milik KPKNL.

---

## Detailed Requirements

### Requirement 1: Batch Creation & Candidate Selection
**User Story:** Sebagai BMN Operator, saya ingin membuat batch lelang baru dan memilih aset rusak berat untuk dimasukkan ke dalamnya, sehingga saya dapat mengelola pengajuan penghapusan aset secara berkelompok.

#### Acceptance Criteria
1. WHEN BMN Operator membuat batch lelang baru, THE Backend SHALL menghasilkan UUID baru, status awal `DRAFT`, dan field `batch_number` unik berformat `LE-[TAHUN][BULAN][HARI]-[RANDOM_4_DIGIT]`.
2. WHEN status batch adalah `DRAFT`, THE BMN Operator SHALL dapat mencari dan memfilter aset dengan kondisi `Rusak Berat` yang tidak terasosiasi dengan batch lelang aktif lainnya (status batch lelang terkait bukan `REALISASI` atau `BATAL`).
3. WHEN BMN Operator memasukkan satu atau beberapa aset ke dalam batch lelang, THE Backend SHALL mencatat asosiasi tersebut pada tabel junction `bmn_asset_auction_batch`.
4. IF aset rusak berat sudah terasosiasi dengan batch lelang lain berkategori aktif (`DRAFT`, `DIAJUKAN`, `JADWAL_DITETAPKAN`), THEN THE Frontend SHALL menyembunyikan/menonaktifkan aset tersebut dari daftar kandidat agar tidak terjadi double-batching.

### Requirement 2: Lot Grouping and Sorting Order
**User Story:** Sebagai BMN Operator, saya ingin mengelompokkan aset dalam batch lelang ke dalam nomor Lot dan menyusun urutannya, agar sesuai dengan struktur penawaran yang diatur oleh KPKNL.

#### Acceptance Criteria
1. WHEN batch berstatus `DRAFT`, THE BMN Operator SHALL dapat mengisi `lot_number` (string/integer) untuk masing-masing aset di dalam batch.
2. THE Frontend SHALL menyediakan antarmuka drag-and-drop atau tombol kontrol urutan naik-turun (`moveUp`/`moveDown`) untuk menentukan urutan visual aset lelang.
3. WHEN urutan diubah, THE Backend SHALL menyimpan nilai `sort_order` pada tabel junction `bmn_asset_auction_batch`.
4. THE Frontend SHALL mengelompokkan tampilan aset berdasarkan `lot_number` pada ringkasan draf batch dan dokumen-dokumen cetak terkait.

### Requirement 3: Valuation Input & Kertas Kerja Sync
**User Story:** Sebagai BMN Operator, saya ingin memasukkan Nilai Taksiran untuk tiap aset, baik secara manual atau auto-fill dari Kertas Kerja Analisis Penentuan Nilai Taksiran, agar data limit harga lelang terarsip secara sah.

#### Acceptance Criteria
1. THE System SHALL mendukung dua metode pengisian `nilai_taksiran` per aset:
   - **Input Manual**: Operator mengetik langsung nominal Rupiah pada baris aset.
   - **Form Kertas Kerja**: Operator mengisi form parameter kertas kerja (nilai perolehan, faktor penyusutan fisik, nilai sisa, dll.), dan hasil kalkulasi Nilai Taksiran otomatis disalin ke kolom `nilai_taksiran` aset terkait.
2. WHEN data Kertas Kerja disimpan, THE Backend SHALL menyimpan objek JSON kertas kerja pada kolom `kertas_kerja_data` di tabel junction `bmn_asset_auction_batch` untuk aset bersangkutan.
3. THE System SHALL memvalidasi bahwa `nilai_taksiran` harus berupa angka positif dan tidak boleh bernilai nol sebelum batch lelang dapat diajukan (`status` beranjak dari `DRAFT`).

### Requirement 4: Freezing Signatories and Document Metadata
**User Story:** Sebagai BMN Operator, saya ingin memilih pejabat penandatangan dan membekukan data profil mereka ke dalam batch lelang, agar cetakan dokumen fisik di masa mendatang tidak berubah meskipun terjadi rotasi pegawai.

#### Acceptance Criteria
1. WHEN batch berstatus `DRAFT`, THE BMN Operator SHALL dapat memilih pegawai yang bertindak sebagai:
   - Kepala Balai (Signatory Utama)
   - Anggota Panitia Penghapusan (Panitia Editor)
   - Anggota Tim Penilai (Tim Penilai Editor)
   - Anggota Panitia Pemeriksa (Pemeriksa Editor)
2. WHEN status batch berubah dari `DRAFT` menjadi `DIAJUKAN`, THE Backend SHALL mengambil snapshot data profil para penandatangan tersebut (nama, NIP, pangkat/golongan, jabatan) dari tabel `employees` dan menyimpannya ke dalam kolom JSON `metadata` pada tabel `bmn_auction_batches`.
3. AFTER status batch berubah menjadi `DIAJUKAN` atau status di atasnya, THE System SHALL menggunakan data dari kolom `metadata` tersebut untuk merender dokumen cetak, bukan mengambil secara real-time dari tabel pegawai aktif.
4. THE System SHALL mencatat seluruh nomor surat yang diinput oleh operator (BA Koreksi, SK Penghentian, SK Panitia, SK Tim Penilai, SPTJ Limit, SPTJM, SP Tugas, SK Kebenaran, BA Pemeriksaan, Nota Dinas, Permohonan KPKNL) ke dalam kolom JSON `metadata` saat batch dikunci ke status `DIAJUKAN`.

### Requirement 5: KPKNL Auction Scheduling
**User Story:** Sebagai BMN Admin, saya ingin mencatat nomor penetapan jadwal lelang dan tanggal pelaksanaan lelang dari KPKNL, agar pelacakan proses lelang berjalan tepat waktu.

#### Acceptance Criteria
1. WHEN batch lelang berstatus `DIAJUKAN`, THE BMN Admin SHALL memiliki akses untuk menaikkan status menjadi `JADWAL_DITETAPKAN`.
2. WHEN menaikkan status menjadi `JADWAL_DITETAPKAN`, THE BMN Admin SHALL diwajibkan menginput field `no_surat_penetapan` (nomor surat KPKNL) dan `tanggal_lelang` (tanggal rencana lelang).
3. IF salah satu dari `no_surat_penetapan` atau `tanggal_lelang` kosong, THEN THE Backend SHALL menolak transisi status dan mengembalikan error validasi.

### Requirement 6: Realization Recording & Auto-Disposal
**User Story:** Sebagai BMN Admin, saya ingin mencatat hasil lelang per aset (apakah terjual dan harga terbentuknya) serta memicu penghapusan otomatis aset yang terjual dari inventaris aktif, agar buku neraca aset Balai terupdate secara otomatis.

#### Acceptance Criteria
1. WHEN batch berstatus `JADWAL_DITETAPKAN`, THE BMN Admin SHALL dapat mengubah status batch menjadi `REALISASI`.
2. WHEN memproses transisi ke `REALISASI`, THE BMN Admin SHALL diwajibkan mengisi hasil lelang untuk tiap-tiap aset di dalam batch:
   - `is_sold` (Boolean: Terjual / Tidak Terjual)
   - `harga_terbentuk` (Decimal/Rupiah, wajib diisi jika `is_sold` bernilai true, default null/0 jika false)
3. WHEN status batch resmi disimpan sebagai `REALISASI`:
   - THE Backend SHALL secara otomatis memicu pemanggilan fungsi disposal (`AssetService::disposeAsset()`) untuk setiap aset dengan `is_sold = true`.
   - THE Backend SHALL mencatat audit log disposal di tabel `bmn_asset_updates` dengan nilai status baru `Dihapus/Pemutihan` dan alasan `"Lelang BMN Terrealisasi - Batch {batch_number} pada {tanggal_lelang}"`.
   - THE Backend SHALL membiarkan aset dengan `is_sold = false` tetap berstatus aktif (`kondisi = Rusak Berat`, status di tabel `bmn_assets` tetap `Aktif`, soft-delete tidak dipicu) agar dapat dimasukkan kembali ke batch lelang berikutnya.
4. AFTER batch berstatus `REALISASI`, THE Backend SHALL melarang segala bentuk perubahan data aset, lot, nilai taksiran, maupun hasil lelang (read-only state).

### Requirement 7: Batch Cancellation & Rollback
**User Story:** Sebagai BMN Admin, saya ingin membatalkan batch lelang yang sedang berjalan, agar semua aset di dalamnya dibebaskan kembali menjadi kandidat rusak berat yang dapat dipilih ulang.

#### Acceptance Criteria
1. WHEN batch berstatus `DRAFT`, `DIAJUKAN`, atau `JADWAL_DITETAPKAN`, THE BMN Admin SHALL dapat mengubah status batch menjadi `BATAL`.
2. WHEN status berubah menjadi `BATAL`, THE Backend SHALL membebaskan status keterikatan seluruh aset di dalam batch tersebut, sehingga aset-aset tersebut kembali muncul sebagai kandidat rusak berat di halaman pencarian lelang.
3. THE System SHALL menyimpan batch berstatus `BATAL` di database sebagai riwayat (soft-deleted atau tetap tampil di list arsip batal sesuai filter histori).

### Requirement 8: Integrated Printing Center
**User Story:** Sebagai BMN Operator, saya ingin mencetak ke-13 dokumen persyaratan lelang BMN secara langsung dengan data terisi otomatis dari database, agar berkas pengajuan fisik lelang dapat diserahkan ke KPKNL dengan cepat.

#### Acceptance Criteria
1. THE Frontend SHALL menyediakan halaman/dialog pusat cetak dokumen untuk setiap batch lelang yang terdaftar.
2. THE System SHALL merender 13 dokumen legal dengan layout cetak resmi (print layout CSS, A4 portrait/landscape) yang mengambil data terstruktur dari database batch, meliputi:
   1. **BA Koreksi**: Berita Acara Koreksi Kondisi Aset.
   2. **BA Pemeriksaan**: Berita Acara Pemeriksaan Fisik BMN Rusak Berat.
   3. **SK Penghentian**: Keputusan Kepala Balai tentang Penghentian Penggunaan BMN.
   4. **SK Panitia**: Keputusan Kepala Balai tentang Pembentukan Panitia Penghapusan BMN.
   5. **SK Tim Penilai**: Keputusan Kepala Balai tentang Pembentukan Tim Penilai/Penaksir Harga.
   6. **SK Kebenaran**: Surat Pernyataan Kebenaran Dokumen Kepemilikan.
   7. **SPTJ Limit**: Surat Pernyataan Tanggung Jawab Nilai Limit.
   8. **SPTJM**: Surat Pernyataan Tanggung Jawab Mutlak.
   9. **SP Tidak Ganggu Tugas**: Surat Pernyataan BMN Rusak Berat Tidak Mengganggu Tugas Pokok.
   10. **SP Tugas**: Surat Perintah Tugas untuk Pemeriksaan/Penilaian.
   11. **SK Pembentukan Panitia Penaksir**: Surat Keputusan Pembentukan Panitia Penaksir Harga BMN.
   12. **Nota Dinas Permohonan KSDAE**: Surat permohonan rekomendasi ke pimpinan KSDAE.
   13. **Surat Permohonan KPKNL**: Surat pengajuan persetujuan penjualan lelang BMN ke KPKNL.
3. IF status batch adalah `DRAFT`, THEN THE System SHALL menampilkan watermark "DRAFT" pada dokumen cetak untuk mencegah penyalahgunaan berkas belum sah.
4. IF status batch adalah `DIAJUKAN`, `JADWAL_DITETAPKAN`, atau `REALISASI`, THEN THE System SHALL mencetak dokumen bersih tanpa watermark menggunakan snapshot penandatangan dan nomor surat dari kolom `metadata` batch.
