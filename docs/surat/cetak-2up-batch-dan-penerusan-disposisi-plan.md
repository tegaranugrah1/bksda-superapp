# Dokumen Akar Masalah, Analisis Arsitektur & Solusi: Cetak Batch 2-Up, Sifat & Disposisi Penerusan Ruang/Pegawai Balai

**Tanggal:** 02 November 2026  
**Status:** Implementasi Selesai (Menunggu Konfirmasi Pengguna untuk Uji E2E)  
**Branch:** `codex/portal-security-pentest` (Strictly Local Commits, Zero Remote Push)  
**Target Modul:** `frontend/src/app/surat/masuk/` & `backend/app/Modules/Surat/`  

---

## 1. Analisis Akar Masalah (Root Cause Analysis) & Alur Operasional Lapangan

### 1.1 Alur Nyata Persuratan BKSDA Kalimantan Timur
1. **Penerimaan & Input Awal Web**:
   - Surat masuk diterima oleh staf loket Tata Usaha (TU).
   - Staf menginput data pokok surat di web (`/surat/masuk/create`) untuk mendapatkan Nomor Agenda resmi berturut-turut.
   - **Klarifikasi Penting**: Daftar checklist penerus di form input hanyalah **template blanko cetak fisik**. Di database dan tabel `/surat/masuk`, nilai penerus **default-nya kosong** (`[]`), bukan terisi seluruh 9 opsi template.

2. **Pencetakan Fisik Lembar Disposisi (2-Up Multi-Sheet)**:
   - Petugas sering menginput banyak surat terlebih dahulu, baru mencetak secara massal (batch printing) untuk dibawa ke meja pimpinan.
   - Form Lembar Disposisi fisik berdimensi Folio/Letter Landscape (**330mm x 215mm dibagi dua** berdampingan).
   - Fitur Cetak 2-Up menata surat berpasangan per lembar. Jika ganjil (1, 3, 5 surat), lembar terakhir mencetak surat di sisi kiri saja (1-Up Kiri) dengan sisi kanan kosong bersih agar sisa kertas fisik dapat digunakan di lain waktu.

3. **Arahan Manual Pimpinan & Update Web**:
   - Berkas fisik surat dan lembar disposisi dibawa ke meja pimpinan (Kepala Balai / Ka Sub Bag TU).
   - Pimpinan memberikan arahan secara **manual/fisik** (paraf, menentukan sifat surat, dan mencentang/menuliskan kepada siapa surat diteruskan).
   - Lembar fisik kembali ke staf TU.
   - Staf TU membuka daftar surat di `http://localhost:3000/surat/masuk` dan melakukan update cepat:
     a. **Sifat Surat (Arahan Pimpinan)**: **Hanya 1 sifat yang bisa dipilih** (Single-Select: `Biasa`, `Penting`, `Sangat Penting`, `Rahasia`, `Segera`, atau `Kilat`). Dapat diupdate langsung via klik badge di kolom "Sifat" atau di dalam popover.
     b. **Diteruskan Ke**: Diisi manual sesuai arahan pimpinan dengan memilih **Ruangan Balai** (dari master BMN `bmn_locations` khusus Balai) dan/atau **Pegawai Balai** (dari master `kpg_employees` khusus Balai).

---

## 2. Arsitektur Komponen & Solusi

### 2.1 Komponen Frontend Terintegrasi
1. **`BatchPrintDisposisiModal.tsx`**:
   - Mengelompokkan surat yang dicentang di tabel ke dalam pasangan lembar fisik `[surat1, surat2]`.
   - Mengisolasi CSS cetak `@media print` (`@page { size: 330mm 215mm; margin: 0; }` dan `break-after: page;`).
   - Merender slot "Sisi Kanan Kosong" pada lembar terakhir jika jumlah ganjil.
   - Menggunakan ulang komponen standar `LembarDisposisiSheet.tsx` (sesuai kaidah Ponytail senior dev: *reuse existing code*).

2. **`SifatCellPopover.tsx`**:
   - Menampilkan badge sifat interaktif dengan kode warna kepentingannya.
   - Klik badge membuka popover pemilihan sifat **Single-Select** (pilih salah satu: `Biasa`, `Penting`, `Sangat Penting`, `Rahasia`, `Segera`, `Kilat`).
   - Otomatis menyimpan via `PUT /api/surat-masuk/{id}` dengan payload `{ sifat_json: [sifat] }` dan sinkronisasi ke tabel serta `localStorage`.

3. **`DiteruskanCellPopover.tsx`**:
   - Sel tabel interaktif di samping kolom Sifat: menampilkan `+ Pilih Penerus` jika belum ada arahan, atau badge ruangan/pegawai jika sudah diisi.
   - Popover memuat:
     - **Pemilihan Sifat (Pilih 1 Sifat)**: Memberikan kemudahan staf mengupdate sifat sekaligus penerus dalam satu dialog.
     - **Pencarian Real-Time**: Menyaring cepat nama ruangan dan pegawai balai.
     - **Tab Ruangan Balai**: Data dari `/api/bmn/locations` (filter `Kantor Balai KSDA Kalimantan Timur`).
     - **Tab Pegawai Balai**: Data dari `/api/kepegawaian/employees/select` (filter pegawai balai).
   - Otomatis menyimpan via `PUT /api/surat-masuk/{id}`.

4. **`LembarDisposisiForm.tsx` & `page.tsx`**:
   - Pembersihan sanitasi: default `diteruskan_json` saat create adalah kosong `[]`.
   - Tabel dilengkapi checkbox seleksi, header "Pilih Semua di Halaman Ini", kolom "Sifat" interaktif, kolom "Diteruskan Ke", dan Floating Batch Toolbar saat item dipilih.

---

## 3. Matriks Keputusan Desain

| Fitur | Spesifikasi Terpilih | Catatan & Alasan |
|---|---|---|
| **Sifat Surat** | **Single-Select (Hanya 1 Sifat)** | Sesuai arahan pimpinan kedinasan, surat memiliki satu derajat prioritas utama (misal: "Segera"). |
| **Diteruskan Ke** | Default kosong, diisi manual pasca-disposisi | Form create hanya template cetak blanko fisik; update riil dilakukan staf setelah pimpinan memberi arahan manual. |
| **Master Penerusan**| Master Lokasi BMN & Master Pegawai Balai | Mengintegrasikan master data aset ruangan BMN dan profil kepegawaian resmi. |
| **Cetak 2-Up** | Multi-sheet kelipatan lembar; ekor ganjil kanan kosong | Menghemat kertas fisik Letter landscape dibagi dua; sisa kertas kanan utuh untuk cetakan berikutnya. |

---

## 4. Status Pengujian
- **Next.js Turbopack Build**: Lulus 100% (86/86 rute compiled, 0 TypeScript error).
- **Pengujian E2E Playwright**: Skrip telah disiapkan di `frontend/tests/surat-masuk-2up-diteruskan.playwright.cjs` dan akan dijalankan setelah pengguna memberikan konfirmasi instruksi ("oke baru test").
