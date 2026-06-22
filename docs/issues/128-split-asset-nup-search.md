# Issue #128: Split Asset NUP Search

## Status: 🔄 IN_PROGRESS

## Deskripsi

Ketika mencari aset BMN, pengguna sering kali ingin memisahkan pencarian umum (nama barang, kode barang, merk, nomor polisi) dari pencarian NUP (Nomor Urut Pendaftaran) karena NUP bisa berupa NUP lama atau NUP baru, dan NUP seringkali berjumlah banyak (misal lebih dari 100).

Fungsi pencarian aset BMN dipecah menjadi dua field terpisah di antarmuka pengguna:
1. **Pencarian Umum**: Mencari nama barang, kode barang, merk, dan nomor polisi (mengecualikan NUP).
2. **Pencarian NUP**: Mencari NUP (baru) maupun NUP Lama secara spesifik.

Kedua field pencarian ini diletakkan berdampingan di halaman katalog aset BMN.

## Perubahan Teknis

### Backend (Laravel)
- **AssetController**:
  - Memperbarui [AssetController.php](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/AssetController.php) di mana query `search` tidak lagi memeriksa kolom `nup`.
  - Menambahkan filter query baru `nup` untuk mencocokkan `nup` (baru) atau `nup_lama` secara persis (exact match, `=`).
- **AssetExport**:
  - Memperbarui [AssetExport.php](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Exports/AssetExport.php) untuk menyelaraskan filter ekspor dengan logika pemisahan pencarian (mengecualikan `nup` dari query `search` utama).
  - Menambahkan filter `nup` terpisah yang mencocokkan `nup` atau `nup_lama` secara persis (exact match, `=`).
- **ExportController**:
  - Memperbarui [ExportController.php](file:///e:/bksda-superapp/backend/app/Modules/Bmn/Controllers/ExportController.php) untuk menangkap filter `nup` dari input request dan meneruskannya ke `AssetExport`.

### Frontend (Next.js)
- **Katalog Aset (BmnAssetsPage)**:
  - Memperbarui [page.tsx](file:///e:/bksda-superapp/frontend/src/app/bmn/assets/page.tsx) untuk menambahkan state `nupTerm` dan `debouncedNup` (debounce 400ms).
  - Memperbarui fungsi `updateUrl` untuk mengelola query parameter URL `nup` secara dinamis.
  - Memperbarui query key dan parameter API `useQuery` untuk mengirim parameter filter `nup` ke backend.
  - Memperbarui helper `handleExport` untuk menyertakan filter `nup` saat mengekspor ke Excel.
  - Mendesain ulang baris filter pencarian: memisahkan input pencarian utama (placeholder: "Cari nama, kode, merk...") dan input pencarian NUP (placeholder: "Cari NUP (baru/lama)...") secara berdampingan.
  - Memperbarui tombol "Reset Filter" untuk membersihkan input pencarian NUP secara bersamaan.
