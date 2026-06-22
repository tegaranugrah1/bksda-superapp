# Requirements Document: Paket Dokumen Lelang BMN

## Introduction

Proses penghapusan Barang Milik Negara (BMN) dengan tindak lanjut penjualan melalui lelang membutuhkan paket dokumen yang rapi, konsisten, dapat diaudit, dan mudah dilacak oleh operator internal. Di BKSDA, aset dengan kondisi **Rusak Berat** perlu dikelompokkan, diperiksa, dinilai, disusun dalam Lot, lalu dibuatkan dokumen pendukung sebelum proses resmi dilanjutkan secara manual oleh atasan/pejabat berwenang melalui kanal eksternal.

Fitur **Paket Dokumen Lelang BMN** dirancang untuk menggantikan alur sementara di `/bmn/auction-candidates` yang masih berbasis state frontend/in-memory. Modul baru ini menyimpan batch dokumen lelang di database, mengelola daftar aset rusak berat yang dipilih, menyusun Lot, mencatat Nilai Taksiran, membekukan data penandatangan dan nomor dokumen saat paket dikunci, merender dokumen cetak dari data batch, mencatat jadwal dan hasil lelang berdasarkan input manual pengguna, mendukung **lelang ulang maksimal 1 kali**, serta menjaga audit trail internal.

Modul ini **bukan sistem persetujuan resmi, bukan integrasi Srikandi, dan bukan integrasi portal lelang.go.id**. Sistem hanya membantu menyusun, mengunci, mencetak, mencatat, mengarsipkan, dan menjaga konsistensi data internal. Pengiriman dokumen, tanda tangan, disposisi, persetujuan, dan pelaksanaan lelang resmi tetap dilakukan di luar aplikasi oleh atasan/pejabat berwenang.

## Product Decisions

- **Database-Backed Document Packages**: Setiap paket dokumen lelang disimpan dalam tabel `bmn_auction_batches` dengan relasi many-to-many ke tabel `bmn_assets` melalui tabel junction `bmn_asset_auction_batch`.
- **Internal Document Generator Scope**: Sistem menghasilkan dan mengarsipkan dokumen pendukung lelang BMN. Nomor/tanggal surat balasan, persetujuan, penetapan jadwal, dan hasil lelang dicatat secara manual oleh pengguna setelah proses eksternal terjadi.
- **Status Lifecycle**: Batch memiliki 6 status utama yang dikendalikan backend:
  - `DRAFT`: Paket masih disusun. Aset, Lot, Nilai Taksiran, Kertas Kerja, penandatangan, dan nomor dokumen masih dapat diedit. Aset belum dibekukan.
  - `DIAJUKAN`: Paket dikunci untuk proses manual eksternal. Data penandatangan dan nomor dokumen dibekukan di metadata. Aset dibekukan dari transaksi internal dengan snapshot status awal.
  - `JADWAL_DITETAPKAN`: Pengguna sudah mencatat data surat balasan/persetujuan/penetapan jadwal lelang secara manual.
  - `LELANG_ULANG`: Hanya dapat digunakan jika minimal satu aset tidak terjual pada lelang pertama. Lelang ulang maksimal 1 kali per batch.
  - `REALISASI`: Hasil akhir dicatat. Aset terjual diproses sesuai konfirmasi final internal; aset tidak terjual dikembalikan ke snapshot awal.
  - `BATAL`: Paket dihentikan dan dikunci sebagai arsip. Aset dikembalikan ke snapshot awal.
- **Strict State Transitions**: Backend menolak transisi status yang tidak valid. Tidak ada transisi balik dari `DIAJUKAN` ke `DRAFT`. Status `REALISASI` dan `BATAL` bersifat read-only.
- **Lot & Valuation Inputs**: Pengguna dapat membagi aset dalam satu paket ke beberapa Lot dan mengisi Nilai Taksiran per aset, baik manual maupun dari Kertas Kerja Analisis Penentuan Nilai Taksiran BMN.
- **Frozen Signatory & Document Metadata**: Data Kepala Balai, Panitia, Tim Penilai/Penaksir, Pemeriksa, nomor dokumen, tanggal dokumen, dan konfigurasi cetak disimpan dalam `metadata` saat status berubah ke `DIAJUKAN`.
- **Asset Freeze Snapshot**: Saat batch dikunci, sistem menyimpan status awal aset sebelum pembekuan, minimal `previous_status_penggunaan`, `previous_henti_guna`, `previous_kondisi`, `previous_usul_hapus`, dan `previous_tanggal_pengapusan`. Snapshot ini wajib dipakai saat pembatalan atau aset tidak terjual.
- **Controlled Realization & Disposal**: Finalisasi realisasi adalah konfirmasi internal bahwa dasar pencatatan hasil lelang sudah lengkap. Sistem hanya mengisi `tanggal_pengapusan` dan memicu disposal untuk aset dengan hasil akhir terjual setelah validasi dan konfirmasi final berhasil.
- **Document Watermark Rules**: Dokumen pada status `DRAFT` wajib memakai watermark `DRAFT - BELUM UNTUK DIKIRIM`. Dokumen pada status `BATAL` wajib memakai watermark arsip batal. Dokumen status terkunci memakai data frozen metadata.
- **Versioned JSON Contracts**: `metadata`, `asset_snapshot`, `freeze_snapshot`, dan data kesiapan dokumen wajib mengikuti kontrak JSON berversi agar hasil cetak lama tetap dapat dibaca walaupun format dokumen berkembang.
- **Asset-Type Document Readiness**: Sistem wajib memberi indikator kesiapan dokumen berdasarkan jenis aset. Aset kendaraan harus menampilkan kesiapan BPKB/STNK/nomor polisi/nomor rangka/nomor mesin jika datanya tersedia di master aset; aset non-kendaraan memakai checklist administratif dan fisik umum.
- **Administrative Validity Warning**: Sistem wajib memberi peringatan jika tanggal surat persetujuan/manual eksternal sudah melewati batas review administratif yang dikonfigurasi, tanpa otomatis membatalkan batch dan tanpa menyimpulkan sah/tidak sah secara hukum.

## Requirement Score

Nilai target requirement setelah revisi: **9.7/10**.

Alasan:
- **Batas Tanggung Jawab Jelas**: Modul diposisikan sebagai generator paket dokumen dan arsip internal, bukan sistem persetujuan/lelang resmi.
- **Lifecycle Lebih Auditabel**: Status `LELANG_ULANG` ditambahkan dengan batas maksimal 1 kali, serta state transition dibuat eksplisit.
- **Integritas Sejarah**: Metadata penandatangan, nomor dokumen, dan snapshot status aset menjaga hasil cetak dan rollback tetap konsisten walau master data berubah.
- **Keselamatan Data Aset**: Rollback tidak lagi memakai nilai hardcoded seperti `Aktif`, melainkan snapshot status awal aset.
- **Kontrak Data Lebih Tegas**: JSON metadata, snapshot aset, freeze snapshot, readiness dokumen, dan warning administratif punya struktur wajib sehingga implementasi tidak menebak-nebak.
- **Kesiapan UX**: Requirement mengarah ke workflow batch bertahap, bukan halaman generator dokumen yang terlalu bebas.

Sisa risiko yang diterima:
- Validasi fisik dan hukum aset tetap bergantung pada pemeriksaan lapangan dan keputusan pejabat berwenang.
- Pengiriman dokumen, tanda tangan, disposisi, persetujuan, pelaksanaan lelang, dan penyelarasan dengan SAKTI/SIMAK-BMN tetap dilakukan manual di luar sistem.
- Selisih antara data internal aplikasi dan dokumen resmi eksternal harus diverifikasi oleh operator sebelum finalisasi realisasi.

## Glossary

- **Paket Dokumen Lelang BMN**: Kumpulan data batch dan dokumen pendukung internal untuk pengajuan penghapusan BMN dengan tindak lanjut penjualan melalui lelang.
- **Batch Lelang**: Entitas database yang mengelompokkan aset rusak berat, Lot, nilai taksiran, penandatangan, dokumen, jadwal, hasil lelang, dan audit trail internal.
- **Kandidat Lelang**: Aset BMN aktif dengan kondisi `Rusak Berat` yang belum terikat batch aktif lain dan dapat dimasukkan ke paket dokumen lelang.
- **Lot Lelang**: Pengelompokan aset dalam paket lelang untuk struktur penawaran, misalnya Lot 1 kendaraan, Lot 2 scrap/logam, atau Lot per kelompok barang.
- **Nilai Taksiran**: Nilai estimasi internal yang menjadi dasar penyusunan dokumen dan limit lelang. Nilai ini bukan pengganti penilaian resmi bila proses eksternal mensyaratkannya.
- **Harga Terbentuk**: Harga hasil lelang yang dicatat manual oleh pengguna berdasarkan hasil eksternal.
- **Lelang Ulang**: Satu kesempatan lanjutan untuk aset yang tidak terjual pada lelang pertama. Tidak boleh lebih dari 1 kali dalam batch yang sama.
- **Frozen Metadata**: Snapshot data penandatangan, nomor dokumen, tanggal dokumen, dan konfigurasi dokumen saat batch dikunci ke `DIAJUKAN`.
- **Asset Freeze Snapshot**: Snapshot status operasional aset sebelum batch dikunci, dipakai untuk rollback saat `BATAL` atau aset tidak terjual.
- **Controlled Disposal**: Proses pengisian `tanggal_pengapusan`, pencatatan `AssetUpdate`, dan soft-delete aset terjual setelah realisasi final dikonfirmasi.

## Scope Phase

### In-Scope
- Skema database untuk `bmn_auction_batches`, `bmn_asset_auction_batch`, data lelang ulang, snapshot status aset, metadata dokumen, dan audit trail batch.
- API Laravel untuk CRUD batch, manajemen aset batch, penyusunan Lot, update Nilai Taksiran/Kertas Kerja, locking batch, pencatatan surat/jadwal, lelang ulang, realisasi, pembatalan, dan read-only archive.
- UI Next.js untuk:
  - `/bmn/auction-candidates`: daftar kandidat rusak berat, filter/search, indikator aset sudah masuk batch aktif, dan aksi membuat batch.
  - `/bmn/auction-batches`: daftar paket lelang, filter status, progress checklist, dan aksi melanjutkan batch.
  - `/bmn/auction-batches/[id]`: detail batch bertab untuk Aset & Lot, Nilai Taksiran/Kertas Kerja, Penandatangan & Nomor Dokumen, Pusat Dokumen, Jadwal Lelang, Realisasi & Lelang Ulang, serta Riwayat/Audit.
- Integrasi 13 dokumen pendukung lelang dengan data dari database batch, menggantikan state client-only.
- Checklist kelengkapan sebelum batch dapat dikunci ke `DIAJUKAN`.
- Kontrak JSON berversi untuk frozen metadata, asset snapshot, freeze snapshot, kesiapan dokumen, dan warning masa review administratif.
- Watermark dokumen berdasarkan status batch.
- Audit trail untuk perubahan penting pada batch dan aset terkait.

### Out-of-Scope
- Pengiriman dokumen ke atasan, Srikandi, KPKNL, DJKN, atau portal eksternal.
- Tanda tangan elektronik/basah di dalam aplikasi.
- Persetujuan resmi penjualan, disposisi resmi, atau pengesahan hukum melalui sistem.
- Sinkronisasi real-time dengan SAKTI/SIMAK-BMN atau portal lelang.go.id.
- Pembuatan Berita Acara Serah Terima (BAST) dengan pembeli lelang.

---

## Detailed Requirements

### Requirement 1: Batch Creation & Candidate Selection
**User Story:** Sebagai BMN Operator, saya ingin membuat paket dokumen lelang baru dari aset rusak berat, sehingga proses penyusunan dokumen menjadi tersimpan, terarah, dan dapat dilanjutkan di sesi berikutnya.

#### Acceptance Criteria
1. WHEN BMN Operator membuat batch baru, THE Backend SHALL menghasilkan UUID baru, status awal `DRAFT`, dan `batch_number` unik berformat `LE-[YYYYMMDD]-[RANDOM_4_DIGIT]` dengan retry jika terjadi collision.
2. WHEN status batch adalah `DRAFT`, THE BMN Operator SHALL dapat mencari dan memfilter aset dengan kondisi `Rusak Berat` yang tidak terasosiasi dengan batch aktif lain.
3. THE System SHALL menganggap batch aktif sebagai status `DRAFT`, `DIAJUKAN`, `JADWAL_DITETAPKAN`, dan `LELANG_ULANG`.
4. IF aset sudah berada di batch aktif, THEN THE Frontend SHALL menyembunyikan atau menandai aset sebagai tidak dapat dipilih untuk mencegah double-batching.
5. WHEN aset dimasukkan ke batch, THE Backend SHALL mencatat asosiasi pada `bmn_asset_auction_batch`.
6. THE `/bmn/auction-candidates` page SHALL hanya berfungsi sebagai pintu kandidat aset dan pembuatan batch, bukan pusat cetak seluruh dokumen.

### Requirement 2: Lot Grouping and Sorting Order
**User Story:** Sebagai BMN Operator, saya ingin mengelompokkan aset dalam Lot dan menyusun urutan lampiran, agar paket dokumen mengikuti struktur penawaran yang rapi.

#### Acceptance Criteria
1. WHEN batch berstatus `DRAFT`, THE BMN Operator SHALL dapat mengisi `lot_number` untuk setiap aset.
2. THE Frontend SHALL menyediakan drag-and-drop dan/atau tombol naik-turun untuk menentukan urutan aset.
3. WHEN urutan diubah, THE Backend SHALL menyimpan `sort_order` pada `bmn_asset_auction_batch`.
4. THE Frontend SHALL mengelompokkan ringkasan aset dan lampiran dokumen berdasarkan `lot_number`.
5. AFTER status batch berubah dari `DRAFT`, THE Backend SHALL menolak perubahan aset, Lot, dan urutan.

### Requirement 3: Valuation Input & Kertas Kerja Sync
**User Story:** Sebagai BMN Operator, saya ingin memasukkan Nilai Taksiran per aset melalui input manual atau Kertas Kerja, agar dokumen lelang memiliki dasar nilai yang terdokumentasi.

#### Acceptance Criteria
1. THE System SHALL mendukung dua metode pengisian `nilai_taksiran` per aset:
   - **Input Manual**: Operator mengetik nominal Rupiah langsung pada baris aset.
   - **Form Kertas Kerja**: Operator mengisi parameter kertas kerja dan hasil kalkulasi disalin ke `nilai_taksiran`.
2. WHEN Kertas Kerja disimpan, THE Backend SHALL menyimpan objek JSON pada `kertas_kerja_data` di tabel junction.
3. THE System SHALL memvalidasi `nilai_taksiran > 0` sebelum batch dapat dikunci ke `DIAJUKAN`.
4. THE System SHALL menyimpan siapa dan kapan nilai taksiran terakhir diubah dalam audit trail.
5. AFTER status batch bukan `DRAFT`, THE System SHALL menampilkan Nilai Taksiran dan Kertas Kerja sebagai read-only.

### Requirement 4: Checklist, Frozen Metadata, and Asset Freeze
**User Story:** Sebagai BMN Operator, saya ingin sistem memeriksa kelengkapan paket sebelum dikunci, membekukan data dokumen, dan membekukan status operasional aset, agar paket yang dicetak konsisten dan aset tidak berubah selama proses.

#### Acceptance Criteria
1. BEFORE status berubah dari `DRAFT` ke `DIAJUKAN`, THE System SHALL menjalankan checklist kelengkapan.
2. THE checklist SHALL require:
   - minimal 1 aset dipilih,
   - semua aset memiliki `lot_number`,
   - semua aset memiliki `nilai_taksiran > 0`,
   - Kepala Balai dipilih,
   - Panitia terisi,
   - Tim Penilai/Penaksir terisi,
   - Pemeriksa terisi,
   - nomor dan tanggal dokumen wajib terisi,
   - aset tidak berada di batch aktif lain,
   - dokumen kendaraan dicek jika aset kendaraan.
3. WHEN batch dikunci ke `DIAJUKAN`, THE Backend SHALL menyimpan frozen metadata penandatangan, nomor dokumen, tanggal dokumen, dan konfigurasi dokumen ke `metadata`.
4. WHEN batch dikunci ke `DIAJUKAN`, THE Backend SHALL menyimpan snapshot status awal setiap aset sebelum pembekuan.
5. WHEN batch dikunci ke `DIAJUKAN`, THE Backend SHALL mengupdate aset terkait menjadi `henti_guna = true` dan `status_penggunaan = 'Dihentikan dari Penggunaan Dinas'`.
6. AFTER status `DIAJUKAN` atau lebih tinggi, THE System SHALL merender dokumen dari frozen metadata, bukan dari master pegawai aktif.
7. THE System SHALL prevent transition back from `DIAJUKAN` to `DRAFT`.

### Requirement 5: Manual Submission Tracking & Auction Scheduling
**User Story:** Sebagai BMN Admin, saya ingin mencatat nomor/tanggal surat balasan, persetujuan, dan jadwal lelang secara manual, agar status internal paket mencerminkan perkembangan proses di luar aplikasi.

#### Acceptance Criteria
1. WHEN batch berstatus `DIAJUKAN`, THE BMN Admin SHALL dapat menaikkan status menjadi `JADWAL_DITETAPKAN`.
2. WHEN menaikkan status menjadi `JADWAL_DITETAPKAN`, THE BMN Admin SHALL menginput:
   - `no_surat_persetujuan`,
   - `tanggal_surat_persetujuan`,
   - `no_surat_penetapan`,
   - `tanggal_lelang`.
3. THE UI SHALL label fields as data surat eksternal/manual, not as approval performed by the system.
4. IF any required field is empty, THEN THE Backend SHALL reject the transition with clear validation errors.
5. THE System SHALL store scheduling changes in audit trail.

### Requirement 6: First Auction Realization
**User Story:** Sebagai BMN Admin, saya ingin mencatat hasil lelang pertama per aset, agar sistem dapat menentukan apakah batch langsung final atau perlu lelang ulang.

#### Acceptance Criteria
1. WHEN batch berstatus `JADWAL_DITETAPKAN`, THE BMN Admin SHALL dapat menginput hasil lelang pertama untuk setiap aset.
2. THE first auction result SHALL include `first_auction_is_sold` and `first_auction_price`.
3. IF `first_auction_is_sold = true`, THEN `first_auction_price` SHALL be required and must be numeric `>= 0`.
4. IF all assets are sold in the first auction, THEN THE System SHALL allow transition directly to `REALISASI`.
5. IF at least one asset is not sold in the first auction, THEN THE System SHALL allow transition to either `LELANG_ULANG` or `REALISASI` with unsold assets restored to their asset freeze snapshot.
6. AFTER first auction results are submitted, THE System SHALL record audit trail for each asset result.

### Requirement 7: Lelang Ulang Maximum Once
**User Story:** Sebagai BMN Admin, saya ingin melakukan lelang ulang maksimal satu kali untuk aset yang tidak terjual pada lelang pertama, agar tindak lanjut aset tidak laku tetap tercatat dan terkendali.

#### Acceptance Criteria
1. WHEN batch berstatus `JADWAL_DITETAPKAN` and at least one asset is not sold, THE BMN Admin SHALL be able to transition the batch to `LELANG_ULANG`.
2. THE System SHALL reject `LELANG_ULANG` if all assets were sold in the first auction.
3. THE System SHALL reject `LELANG_ULANG` if `reauction_count >= 1`.
4. WHEN entering `LELANG_ULANG`, THE BMN Admin SHALL input `no_surat_jadwal_ulang`, `tanggal_lelang_ulang`, and optional `reauction_notes`.
5. Only assets not sold in the first auction SHALL be included in the reauction result entry.
6. Reauction result SHALL include `reauction_is_sold` and `reauction_price`.
7. IF `reauction_is_sold = true`, THEN `reauction_price` SHALL be required and must be numeric `>= 0`.
8. AFTER reauction results are submitted, THE batch SHALL transition to `REALISASI`.
9. Assets still not sold after reauction SHALL be restored to their asset freeze snapshot and SHALL NOT be soft-deleted.

### Requirement 8: Final Realization, Deletion Date & Controlled Disposal
**User Story:** Sebagai BMN Admin, saya ingin memfinalisasi hasil akhir lelang dan memproses aset yang terjual secara terkendali, agar data penghapusan internal tercatat konsisten dan dapat diaudit.

#### Acceptance Criteria
1. WHEN transitioning to `REALISASI`, THE Backend SHALL require final result for every asset.
2. For assets sold in first auction, THE final result SHALL use `first_auction_price` and `tanggal_lelang`.
3. For assets sold in reauction, THE final result SHALL use `reauction_price` and `tanggal_lelang_ulang`.
4. THE Backend SHALL update `tanggal_pengapusan` only for assets with final result sold.
5. THE Backend SHALL call `AssetService::disposeAsset()` only for assets with final result sold after final confirmation is submitted.
6. THE Backend SHALL create `AssetUpdate` audit entries for disposed assets with clear reason containing batch number, auction date, and document references.
7. THE Backend SHALL restore unsold assets to their asset freeze snapshot.
8. AFTER status `REALISASI`, THE batch and all related auction data SHALL be read-only.

### Requirement 9: Batch Cancellation & Rollback
**User Story:** Sebagai BMN Admin, saya ingin membatalkan batch yang belum final, agar aset dapat dikembalikan ke kondisi sebelum proses paket dokumen dimulai.

#### Acceptance Criteria
1. WHEN batch berstatus `DRAFT`, `DIAJUKAN`, `JADWAL_DITETAPKAN`, atau `LELANG_ULANG`, THE BMN Admin SHALL dapat mengubah status batch menjadi `BATAL`.
2. WHEN status berubah menjadi `BATAL`, THE Backend SHALL restore all related assets using asset freeze snapshot when available.
3. IF batch is still `DRAFT` and no freeze snapshot exists, THEN THE Backend SHALL only detach/release the active batch association without changing asset operational fields.
4. THE System SHALL preserve the canceled batch as read-only history.
5. THE System SHALL apply watermark `BATAL - ARSIP` on canceled batch documents.
6. AFTER status `BATAL`, THE Backend SHALL reject all write operations except audit/archival reads.

### Requirement 10: Integrated Printing Center
**User Story:** Sebagai BMN Operator, saya ingin mencetak dokumen pendukung lelang dari data batch yang tersimpan, agar dokumen yang dihasilkan konsisten dan tidak bergantung pada state sementara frontend.

#### Acceptance Criteria
1. THE Frontend SHALL provide a document center for each batch.
2. THE System SHALL render 13 supporting documents with print layout CSS and A4 portrait/landscape where needed:
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
   12. **Nota Dinas Permohonan Rekomendasi**: Surat/nota pengantar internal kepada pimpinan terkait.
   13. **Surat Permohonan Penjualan Lelang BMN**: Surat pengajuan paket dokumen untuk proses manual eksternal.
3. IF status batch is `DRAFT`, THEN every printed document SHALL display watermark `DRAFT - BELUM UNTUK DIKIRIM`.
4. IF status batch is `DIAJUKAN`, `JADWAL_DITETAPKAN`, `LELANG_ULANG`, or `REALISASI`, THEN documents SHALL use frozen metadata.
5. IF status batch is `BATAL`, THEN every printed document SHALL display watermark `BATAL - ARSIP`.
6. THE System SHALL record print/generate events in audit trail.

### Requirement 11: Batch Audit Trail & Read-Only Archive
**User Story:** Sebagai Admin BMN, saya ingin melihat riwayat perubahan batch, agar setiap perubahan data penting dapat ditelusuri.

#### Acceptance Criteria
1. THE System SHALL record audit events for batch creation, asset add/remove, Lot changes, valuation changes, checklist lock, status transitions, schedule updates, print/generate actions, first auction result, reauction start/result, realization, disposal, and cancellation.
2. Audit events SHALL include actor, timestamp, action, batch id, affected asset id when relevant, previous value, new value, and notes.
3. THE Frontend SHALL expose a read-only Riwayat/Audit tab in batch detail.
4. AFTER status `REALISASI` or `BATAL`, THE UI SHALL display all editable tabs as read-only archive.

### Requirement 12: Permissions and Access Control
**User Story:** Sebagai Admin Sistem, saya ingin akses paket lelang dikendalikan melalui permission granular, agar hanya user berwenang yang dapat mengubah data sensitif.

#### Acceptance Criteria
1. THE System SHALL define granular permissions:
   - `bmn.auction.view`
   - `bmn.auction.create`
   - `bmn.auction.update`
   - `bmn.auction.delete`
   - `bmn.auction.print`
   - `bmn.auction.finalize`
2. THE Backend SHALL enforce permission checks on every endpoint.
3. THE Frontend SHALL hide or disable actions that the current user cannot perform.
4. THE Backend SHALL remain the source of truth and reject unauthorized requests even if frontend controls are bypassed.

### Requirement 13: Versioned Metadata and Snapshot Contracts
**User Story:** Sebagai Developer dan Auditor Internal, saya ingin format metadata dan snapshot dibakukan, agar dokumen yang sudah dikunci tetap dapat dicetak ulang secara konsisten walaupun master data atau format baru berubah.

#### Acceptance Criteria
1. THE System SHALL store `metadata.schema_version` when freezing a batch to `DIAJUKAN`.
2. THE `metadata` object SHALL include at minimum:
   - `schema_version`,
   - `locked_at`,
   - `locked_by`,
   - `signatories`,
   - `committees`,
   - `document_numbers`,
   - `document_dates`,
   - `print_config`,
   - `document_versions`.
3. EACH frozen signatory in `metadata.signatories` SHALL include `id`, `nama`, `nip`, `golongan`, `jabatan`, `unit_kerja`, and `source`.
4. THE `asset_snapshot` object SHALL include at minimum `id`, `kode_barang`, `nup`, `nup_lama`, `nama_barang`, `merk_tipe`, `kondisi`, `status_penggunaan`, `lokasi`, `nilai_perolehan`, `nilai_buku`, and `document_readiness`.
5. IF asset is detected as vehicle, THEN `asset_snapshot` SHALL also include available vehicle identifiers such as `no_polisi`, `no_rangka`, `no_mesin`, `no_bpkb`, and `no_stnk` when those fields exist in master data.
6. THE `freeze_snapshot` object SHALL include at minimum `previous_status_penggunaan`, `previous_henti_guna`, `previous_kondisi`, `previous_usul_hapus`, and `previous_tanggal_pengapusan`.
7. THE Backend SHALL validate required JSON keys before locking batch to `DIAJUKAN`.
8. IF future schema versions are introduced, THEN THE document renderer SHALL be able to read old schema versions or show a clear unsupported-version error.

### Requirement 14: Asset Document Readiness and Administrative Validity Warnings
**User Story:** Sebagai BMN Operator, saya ingin sistem memberi warning kesiapan dokumen dan masa review administratif, agar paket lelang lebih rapi sebelum dikirim manual oleh atasan.

#### Acceptance Criteria
1. THE System SHALL classify an asset as vehicle when asset data contains vehicle indicators such as `no_polisi`, `no_rangka`, `no_mesin`, `no_stnk`, `no_bpkb`, vehicle category, or vehicle-related `kode_barang` mapping configured by backend.
2. FOR vehicle assets, THE checklist SHALL show readiness indicators for BPKB, STNK, nomor polisi, nomor rangka, and nomor mesin when corresponding fields are available in the application data model.
3. FOR non-vehicle assets, THE checklist SHALL show general administrative and physical-readiness indicators.
4. Missing readiness data SHALL appear as `warning`, not automatic blocker, unless a backend configuration marks a specific readiness field as required.
5. THE candidate table and batch asset tab SHALL expose `requires_document_review` and `document_readiness_warnings` for each asset.
6. WHEN `tanggal_surat_persetujuan` is present, THE System SHALL compute an advisory `approval_review_until` date using a configurable month window.
7. IF current date is after `approval_review_until` and batch is not `REALISASI` or `BATAL`, THEN THE System SHALL display `requires_revaluation_review = true` with a message asking the operator to review external requirements before proceeding.
8. THE System SHALL NOT automatically cancel, realize, approve, reject, or legally validate a batch based on readiness warning or validity warning.
