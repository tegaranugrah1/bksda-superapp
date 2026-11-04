# Dokumen Kebutuhan (Requirements) Final - Fitur Hitung Uang Makan & Rekonsiliasi Presensi

> [!NOTE]
> Telah difinalisasi dan diselaraskan berdasarkan audit teknis mendalam terhadap berkas `syafey.xls`, `syafey_hasil.xlsx`, serta pengujian skema riil database PostgreSQL (`kpg_employees`, `st_assignment_letters`, `st_assignment_letter_employees`) pada 2 November 2026.

---

## 1. Latar Belakang & Masalah Pokok

1. **Aturan Standar Biaya Masukan (SBM Kemenkeu)**:
   - Uang Makan hanya diberikan untuk hari kerja di mana pegawai **hadir riil bekerja di kantor/satker**.
   - Hari saat pegawai melaksanakan **Perjalanan Dinas (Dinas Luar / PD)** **DILARANG** menerima Uang Makan karena pegawai sudah menerima Uang Harian Perjalanan Dinas (SPPD).
2. **Anomali Presensi SIKADIR di Lapangan**:
   - Pegawai yang tugas dinas luar kerap tetap melakukan *clock-in* mandiri di aplikasi mobile SIKADIR Kemenhut.
   - File mentah SIKADIR (`syafey.xls`) mencatat jam masuk/pulang sehingga terdata sebagai *Hadir* ($H$).
   - Tanpa validasi silang terhadap modul **Surat Tugas** ([`/kepegawaian/surat-tugas/inbox`](file:///e:/bksda-superapp/frontend/src/app/kepegawaian/surat-tugas/inbox/page.tsx)), akan terjadi **duplikasi pembayaran (*double accounting*)** yang menjadi temuan audit berat BPK/Itjen.
3. **Struktur Data Ekspor SIKADIR**:
   - File `.xls` dari SIKADIR sejatinya adalah berkas HTML tabel bersarang.
   - SIKADIR **hanya menyajikan baris untuk Hari Kerja** (contoh: September 2026 hanya memiliki 22 baris data; Sabtu dan Minggu sama sekali tidak memiliki baris).
   - Terdapat ringkasan metadata di header: `Uang Makan : X; Jumlah Kehadiran : Y` yang dimanfaatkan sebagai *golden checksum*.

---

## 2. Kebutuhan Fungsional Tingkat Akar (Root-Level Functional Requirements)

### FR-01: Multi-File & ZIP Upload Presensi SIKADIR (Ultra-Fast Native Parser)
* Mendukung unggah banyak berkas sekaligus (*multi-file drag-and-drop*) maupun berkas arsip `.zip` berisi file ekspor presensi bulanan seluruh pegawai.
* **Sanitasi File ZIP**: Parser memfilter dan mengabaikan berkas sampah sistem seperti folder `__MACOSX/` dan file `.DS_Store`. Jika ditemukan 1 file rusak dalam arsip ZIP, sistem tidak boleh *crash*, melainkan tetap memproses file valid lainnya dan mencatat berkas yang bermasalah.
* **Mesin Parser Native DOMXPath**: Backend menggunakan PHP native `DOMXPath` (dengan header `<?xml encoding="utf-8" ?>`) yang mengekstrak metadata dan baris absensi dengan latensi ultra-rendah (**2.36 ms** per file) tanpa menimbulkan peringatan *deprecation* PHP 8.2 atau *memory bloat*.
* **Validasi Golden Checksum**: Membaca ringkasan bawaan SIKADIR (`Uang Makan : 11; Jumlah Kehadiran : 11`) sebagai *checkpoint* awal sebelum komparasi Surat Tugas.

### FR-02: Pencocokan Pegawai Menggunakan NIP Ternormalisasi (Bukan Nama)
* Sistem mencocokkan data presensi SIKADIR dengan database [`kpg_employees`](file:///e:/bksda-superapp/backend/app/Modules/Kepegawaian/Models/Employee.php) secara eksklusif menggunakan **NIP Ternormalisasi (Angka Murni)** via `preg_replace('/[^0-9]/', '', $nip)`.
* Menghilangkan risiko gagal cocok akibat perbedaan spasi pada NIP (`19750314 199903 1 004` vs `197503141999031004`) maupun variasi penulisan nama antara SIKADIR (`Achmad Syafey N`) dengan dokumen kantor (`ACHMAD SYAFEY`).

### FR-03: Rekonsiliasi Rentang Tanggal Surat Tugas (*Date Range Overlap*)
* Pengecekan riil Surat Tugas mencakup tanggal yang berada dalam rentang pelaksanaan tugas dinas:
  `target_date BETWEEN COALESCE(st_emp.tanggal_mulai, st.tanggal_mulai) AND COALESCE(st_emp.tanggal_selesai, st.tanggal_selesai)`
* **Aturan Status ST**:
  - Jika berstatus **`approved` / `terbit`** $\rightarrow$ status **WAJIB DI-OVERRIDE menjadi `PD` (Perjalanan Dinas)**, mengabaikan jam masuk/pulang di SIKADIR (Uang Makan = $Rp 0$).
  - Jika berstatus **`draft` / `submitted`** $\rightarrow$ ditampilkan indikator peringatan kuning (*warning advisory badge*) pada sel tanggal.

### FR-04: Resolusi Tarif SBM & Pajak PPh 21 Adaptif (Handling Anomali Database)
* Sistem membaca dan memetakan format `pangkat_golongan` yang bervariasi di database:
  - **PNS**: Dideteksi dari string golongan romawi:
    - Golongan IV (`IV/a`, `IV/b`, dll.) $\rightarrow$ Tarif Rp 41.000 / PPh 21: **15%**
    - Golongan III (`III/a`, `III/b`, dll.) $\rightarrow$ Tarif Rp 37.000 / PPh 21: **5%**
    - Golongan I & II (`I/a`, `II/c`, dll.) $\rightarrow$ Tarif Rp 35.000 / PPh 21: **0%**
  - **PPPK**: Dideteksi dari angka romawi murni atau teks PPPK:
    - Romawi `(I)` s.d. `(VIII)` $\rightarrow$ Tarif Rp 35.000 / PPh 21: **0%**
    - Romawi `(IX)` s.d. `(XII)` $\rightarrow$ Tarif Rp 37.000 / PPh 21: **5%**
    - Romawi `(XIII)` s.d. `(XVII)` $\rightarrow$ Tarif Rp 41.000 / PPh 21: **15%**
  - **Fallback Cerdas**: Jika `pangkat_golongan` bernilai string kosong `''`, sistem mengambil nilai dari metadata SIKADIR (`KELAS JABATAN: 5`, `KETERANGAN LAIN: PPPK`) $\rightarrow$ otomatis terpetakan ke PPPK Golongan V (Rp 35.000 / PPh 0%).

### FR-05: Penanganan Hari Libur Nasional & Akhir Pekan (Anti Salah Alpa)
* **Akhir Pekan (Sabtu & Minggu)**: Otomatis diidentifikasi dari kalender Gregorian bulan berjalan dan di-shading warna abu-abu dengan simbol strip (`-`).
* **Hari Libur Nasional / Cuti Bersama (SKB 3 Menteri)**:
  - Backend dilengkapi daftar hari libur resmi nasional.
  - Tanggal merah di hari kerja (Senin–Jumat) otomatis ditandai sebagai hari libur (`-`), sehingga **TIDAK** dihitung sebagai Hadir ($H$) dan **TIDAK** salah divonis sebagai Alpa/Tanpa Keterangan ($TK$).

### FR-06: Human-in-the-Loop: Pratinjau Interaktif & Pengeditan Manual Sebelum Final
* Sistem **wajib** menampilkan halaman pratinjau matriks presensi (*Interactive Matrix Preview*) sebelum batch disimpan permanen atau diekspor ke Excel:
  1. **Visual Cues & Tooltips**: Status `H` (hijau), `PD*` (oranye dengan tooltip nomor Surat Tugas), `CT` (biru), `TK` (merah), `-` (abu-abu).
  2. **Sticky Navigation Grid**: Kolom *No & Nama Pegawai* terkunci tetap di kiri (*sticky left*), dan kolom *Total Hadir, PD, Netto* terkunci di kanan (*sticky right*) saat menggulir tabel 31 hari secara horizontal.
  3. **One-Click Inline Edit**: Admin Kepegawaian dapat mengklik sel tanggal pegawai untuk mengubah status secara manual (koreksi khusus lapangan).
  4. **Header Quick Action (Set Libur 1 Kolom)**: Tombol di header tanggal untuk menyetel cuti bersama mendadak pada seluruh pegawai dalam 1 klik.
  5. **Kalkulasi Reaktif Real-Time**: Perubahan status pada sel langsung memperbarui total Hari Hadir, Bruto, Pajak PPh 21, dan Netto seketika di layar tanpa reload.
  6. **Audit Trail JSON (`override_logs`)**: Setiap perubahan dicatat lengkap (hari, status asal, status baru, waktu, admin pengubah, nomor ST referensi).

### FR-07: Ekspor Excel Resmi 2-in-1 Workbook (.xlsx) dengan Auto-Fit Cetak
File Excel hasil unduhan memiliki **2 Sheet**:
1. **Sheet 1 - Matriks Rekapitulasi Presensi**:
   - Persis 1-ke-1 dengan format template baku **`syafey_hasil.xlsx`**.
   - Kolom Tanggal 1–31, kolom formula dinamis `=COUNTIF(C7:AF7, "H")`, `=COUNTIF(C7:AF7, "PD")`, dll.
   - Legenda absensi (`H`, `TK`, `CT`, `I`, `PD`, `S`).
   - **Tanda Tangan Resmi Tunggal**: Hanya **Kepala Subbagian Tata Usaha** di sebelah kanan (`Dheny Mardiono, S.Hut., MSc.`, NIP `19750314 199903 1 004`). Blok Kepala Balai di sebelah kiri ditiadakan total.
   - **Page Setup Otomatis**: Orientasi Landscape, `fitToWidth = 1`, `fitToHeight = 0`, lebar kolom tanggal disetel proporsional (`width: 3.5`) agar pas saat dicetak tanpa terpotong horizontal.
2. **Sheet 2 - Daftar Nominatif Pembayaran Uang Makan**:
   - Nomor, Nama Pegawai, NIP, Golongan, Rekening Bank, Hari Hadir Riil ($H$), Tarif Harian, Uang Makan Bruto, Potongan Pajak PPh 21, Netto, dan Kolom Tanda Tangan.

### FR-08: Persistensi Riwayat Bulanan & Integrasi Portal Pegawai
* Rekapitulasi disimpan di tabel database `kpg_meal_allowance_batches` dan `kpg_meal_allowance_items` untuk arsip historis dan siap diakses di Portal Pegawai di masa depan.
