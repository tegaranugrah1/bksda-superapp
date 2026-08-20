# Issue #576 — Requirement: Bottom Navigation BMN Mobile

> **Type**: `feature` / `mobile` / `navigation`
> **Branch**: `mobile-development`
> **GitHub**: https://github.com/tegaranugrah1/bksda-superapp/issues/576
> **Priority**: Medium
> **Status**: Implementasi fase pertama selesai; Pinjaman menunggu screen daftar

## 1. Latar Belakang

Modul BMN mobile saat ini memakai `FabMenu` sebagai pintu utama untuk berpindah modul dan submenu. Pola ini berbeda dengan Kepegawaian yang sudah memiliki bottom navigation tetap. Pengguna harus membuka FAB terlebih dahulu untuk berpindah menu BMN, dan state menu aktif/back navigation berpotensi tidak konsisten.

## 2. Tujuan

Menyediakan bottom navigation khusus BMN yang selalu terlihat ketika pengguna berada di modul BMN, dengan pola interaksi yang konsisten dengan Kepegawaian.

## 3. Scope

### In scope

- Navigator bottom tab khusus BMN.
- Menu utama BMN yang saat ini tersedia di `FabMenu`.
- State tab aktif berdasarkan route yang sedang dibuka.
- Route internal untuk detail aset, form aset, dan capture foto.
- Back navigation dari layar internal kembali ke tab BMN yang sesuai.
- Penyaringan akses berdasarkan `access_modules`.
- FAB tetap dapat dipakai sebagai menu global untuk berpindah modul, tetapi tidak lagi menjadi navigasi utama submenu BMN.

### Out of scope

- Perubahan endpoint atau schema backend BMN.
- Implementasi menu BMN yang saat ini masih disabled: Import Review, Kandidat Rusak Berat, Paket Lelang BMN, dan Laporan.
- Redesign isi layar BMN.
- Perubahan bottom navigation Kepegawaian yang sudah selesai.

## 4. Menu BMN

Menu yang direncanakan sebagai tab utama:

| Tab | Label | Route/Screen | Status |
|---|---|---|---|
| Beranda | Dashboard | `BmnDashboardScreen` atau route dashboard BMN yang ditetapkan | Aktif |
| Aset | Data Aset | `Bmn` / `BmnAssetCatalogScreen` | Aktif |
| Pinjaman | Peminjaman | Katalog aset dengan aksi peminjaman | Tab aktif fase ini |
| Perawatan | Pemeliharaan | `BmnMaintenanceScreen` bila tersedia; jika belum, route placeholder terdokumentasi | Review |
| Sampah | Aset Dihapus | route trash BMN bila tersedia | Review |

Menu yang masih disabled tidak menjadi tab dan tetap tidak dapat dinavigasi sampai fiturnya diimplementasikan.

## 5. Aktor dan Hak Akses

- User hanya dapat masuk ke modul BMN jika `hasModule(user, "bmn")` bernilai true.
- Superadmin tetap dapat melihat modul BMN sesuai aturan `hasModule` yang berlaku.
- Penyembunyian tab di frontend hanya untuk UX; endpoint backend tetap menjadi sumber enforcement authorization.
- User tanpa akses BMN tidak boleh diarahkan ke `BmnMain`/navigator BMN dari FAB maupun route internal.

## 6. Kebutuhan Fungsional

### FR-01 — Bottom nav BMN selalu terlihat

Saat pengguna berada di halaman utama atau submenu aktif BMN, bottom nav BMN tetap terlihat dan tidak hilang ketika berpindah tab.

### FR-02 — State aktif akurat

Tab aktif harus mengikuti route yang sedang tampil. Route detail/form internal tidak boleh membuat semua tab BMN terlihat tidak aktif.

### FR-03 — Navigasi layar internal

Layar berikut tetap menjadi route internal dan tidak menambah tombol bottom nav:

- `BmnDetail`
- `BmnForm`
- `BmnPhotoCapture`
- Layar modal/detail lain yang hanya merupakan bagian dari alur aset.

### FR-04 — Back navigation

- Back dari detail aset kembali ke tab Aset.
- Back dari form aset kembali ke tab Aset, dengan konfirmasi jika ada perubahan belum disimpan.
- Back dari capture foto kembali ke form/detail yang memanggilnya.
- Back dari tab utama BMN mengikuti history navigator BMN tanpa menghilangkan bottom nav.

### FR-05 — Integrasi FAB global

FAB global tetap dapat membuka modul lain. Saat pengguna memilih BMN dari FAB, aplikasi masuk ke navigator BMN pada tab Beranda atau tab terakhir yang valid.

### FR-06 — Aksesibilitas dasar

- Setiap tab memiliki ikon dan label yang jelas.
- Tab aktif memiliki state visual yang berbeda.
- Touch target memenuhi ukuran minimum platform yang digunakan project.
- Navigasi dapat digunakan dengan ukuran layar mobile yang tersedia.

## 7. Acceptance Criteria

- [ ] User dengan akses BMN melihat bottom nav saat berada di modul BMN.
- [x] Tab Beranda dan Aset dapat dibuka langsung dari bottom nav.
- [x] Tab Pinjaman dapat dibuka langsung dari bottom nav melalui katalog aset dan aksi peminjaman.
- [ ] Tab yang belum memiliki screen final tidak ditampilkan sebagai tombol aktif.
- [ ] Detail/form/capture foto tidak menambah item bottom nav.
- [ ] Tab aktif tetap benar setelah membuka detail/form lalu kembali.
- [ ] Back dari detail aset kembali ke tab Aset.
- [ ] Back dari form aset tidak kehilangan navigator BMN.
- [ ] FAB global tetap dapat berpindah ke modul lain.
- [ ] User tanpa `bmn` tidak dapat membuka navigator BMN melalui UI mobile.
- [ ] Tidak ada perubahan pada `production`.
- [ ] TypeScript, lint, dan test terkait navigasi lulus.

## 8. Pertanyaan Review

1. Apakah `Pemeliharaan` dan `Aset Dihapus` sudah memiliki screen final untuk menjadi tab sekarang?
2. Screen daftar peminjaman belum tersedia; untuk sementara Pinjaman tetap menjadi route internal form dan tidak ditampilkan sebagai tab.
3. Saat masuk BMN dari FAB, apakah harus selalu ke Beranda atau mengingat tab BMN terakhir?
