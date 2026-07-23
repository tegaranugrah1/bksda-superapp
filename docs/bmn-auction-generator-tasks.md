# Tasks Checklist: Refactoring Generator Dokumen & Riwayat Paket Lelang BMN

Dokumen ini berisi daftar centang tugas pelaksanaan refactoring modul Paket Lelang BMN (`/bmn/auction-batches`) berdasarkan spesifikasi `requirements.md`.

---

## 📍 Fase 1: Eliminasi Nomor Lot & Merapikan Tabel Aset
- [x] **1.1** Hapus kolom input `NOMOR LOT` dan tombol `Simpan` Lot dari `AssetsLotTab.tsx`.
- [x] **1.2** Hapus ketergantungan `lot_number` pada form draf aset di komponen UI tab aset.
- [x] **1.3** Pastikan penomoran urut (`URUTAN`: 1, 2, 3...) menggunakan tombol panah naik/turun berjalan lancar dan otomatis tersimpan.
- [x] **1.4** Uji coba `npx tsc --noEmit` untuk memastikan tidak ada error TypeScript.

---

## 📍 Fase 2: Penyederhanaan Navigasi (Restrukturisasi Ke 4 Langkah Utama)
- [ ] **2.1** Perbarui `workflow-tabs.ts` untuk mendefinisikan 4 Langkah Utama:
  1. `Aset & Nilai Taksiran`
  2. `Pusat Generator Dokumen`
  3. `Jadwal & Penguncian`
  4. `Realisasi & Pindah Paket`
- [ ] **2.2** Gabungkan tampilan daftar aset dan pengisian Nilai Taksiran dalam satu tampilan langkah yang mulus (Langkah 1).
- [ ] **2.3** Satukan Dokumen Awal (*Pre-Docs*) dan Dokumen Setelah Taksiran (*Post-Docs*) ke dalam satu **Pusat Generator Dokumen (Document Hub)** (Langkah 2).
- [ ] **2.4** Pastikan metadata penanda tangan dan penomoran Srikandi diisikan sekali di bagian atas Hub Dokumen.

---

## 📍 Fase 3: Penanganan Barang Tidak Laku (Re-Batching & Fitur Pindah Paket Baru)
- [ ] **3.1** Tambahkan tombol **`Pindahkan Barang Tidak Laku ke Paket Baru`** di `RealizationTab.tsx`.
- [ ] **3.2** Buat API/fungsi backend untuk menyalin aset yang berstatus *Tidak Laku* dari paket lama ke paket draf baru.
- [ ] **3.3** Pastikan paket lama otomatis terkunci (*History Locked*) dengan status `SELESAI` / `DIARSIPKAN` sehingga arsip dokumen paket lama aman dan tidak bisa diubah lagi.
- [ ] **3.4** Verifikasi paket draf baru berhasil dibuat dengan daftar aset tidak laku dan siap di-generate dengan set dokumen baru.

---

## 📍 Fase 4: Pengujian End-to-End (E2E) & Verifikasi Dokumen Cetak
- [ ] **4.1** Jalankan `npx tsc --noEmit` untuk memverifikasi 0 error TypeScript di seluruh project.
- [ ] **4.2** Verifikasi pencetakan PDF untuk 12 jenis dokumen (SK Penghentian Penggunaan, BA Koreksi, SK Panitia, SK Tim Penilai, SPTJM, Kebenaran Dokumen, dll.).
- [ ] **4.3** Pastikan layout A4 Landscape pada lampiran SK Penghentian Penggunaan berjalan presisi tanpa *orphan signature* atau space kosong tak wajar.
