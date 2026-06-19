# Catatan Rilis Internal (Release Notes) — BKSDA SuperApp Mobile MVP

## Versi: 1.0.0 (Alpha Internal Release)
**Tanggal Rilis**: 19 Juni 2026
**Target Platform**: Android (Minimum Android 8.0+)
**Framework**: Expo React Native (Managed Workflow)

---

## 1. Fitur yang Disertakan (Included Features)

### A. Fondasi & Keamanan (Milestone 1)
* **Autentikasi Aman**: Login menggunakan kredensial terintegrasi dengan Laravel Sanctum HttpOnly cookies. Token sesi disimpan secara aman menggunakan `expo-secure-store`.
* **Navigasi Berbasis Peran**: Menyembunyikan tab dan menu BMN atau Surat Tugas secara otomatis jika akun pengguna tidak memiliki izin akses modul yang diperlukan.
* **Desain UI/UX Premium**: Mengikuti standar token warna dan tipografi modern dengan touch target minimal 48dp untuk kenyamanan aksesibilitas pada perangkat mobile.

### B. Pengelolaan Aset BMN (Milestone 2)
* **Pencarian & Filter Aset**: Pencarian cepat dengan debounce 300ms serta penyaringan (filter) berdasarkan kondisi, jenis BMN, dan lokasi spesifik.
* **Detail Aset Lengkap**: Menampilkan informasi lengkap termasuk identitas kendaraan (Nomor Polisi/Mesin/Rangka) serta status verifikasi aset.
* **Foto Fisik & Geotagging**: Mengambil foto aset fisik (Tampak Depan, Belakang, Kiri, Kanan) menggunakan kamera bawaan, otomatis mencatat titik koordinat GPS (latitude/longitude), dan melakukan unggah multi-part ke server.
* **Verifikasi & Transaksi**: Aksi verifikasi fisik aset serta pengisian formulir peminjaman/pengembalian langsung dari aplikasi mobile.

### C. Pengelolaan Surat Tugas (Milestone 3)
* **Daftar & Detail Surat Tugas**: Pembagian menu list surat tugas personal (untuk pegawai) dan surat tugas manajemen (untuk admin/verifikator) lengkap dengan pagination.
* **Pembaruan Status (Approval)**: Verifikator dapat menyetujui (approve) atau menolak (reject) usulan Surat Tugas dengan konfirmasi dialog.
* **Unduh & Bagikan Berkas**: Mengunduh berkas PDF Surat Tugas secara aman melalui endpoint terautentikasi dan menyimpannya di cache lokal untuk dibuka di penampil PDF eksternal atau dibagikan (share sheet).

---

## 2. Keterbatasan yang Diketahui (Known Limitations)

> [IMPORTANT]
> Aplikasi mobile ini dirancang sebagai MVP (*Minimum Viable Product*) dengan batasan berikut:
> 
> 1. **Koneksi Selalu Online (Online-Only MVP)**: Aplikasi memerlukan koneksi internet aktif. Tidak ada antrean penyimpanan data lokal atau manipulasi data offline (offline mutations). Banner "Mode Offline" akan muncul ketika koneksi terputus.
> 2. **Tanpa Generator Dokumen BMN**: Aplikasi mobile tidak menyediakan fitur pembuatan dokumen Berita Acara (BA) atau Surat Keputusan (SK) penghapusan BMN. Fitur pembuatan dokumen tersebut tetap dilayani secara eksklusif melalui dashboard web.

---

## 3. Panduan Instalasi (Install Notes)

### Pengujian dengan Expo Go (Development)
1. Hubungkan perangkat pengujian (Android) dan komputer pengembangan ke jaringan Wi-Fi yang sama.
2. Jalankan perintah di folder `mobile/`:
   ```bash
   npm run start
   ```
3. Pindai kode QR yang muncul di terminal menggunakan aplikasi **Expo Go** (dapat diunduh dari Google Play Store).

### Pengujian Mandiri dengan Berkas APK (Standalone)
Jika konfigurasi EAS sudah siap, Anda dapat melakukan kompilasi berkas APK secara mandiri:
* **Kompilasi via Cloud**:
  ```bash
  eas build --platform android --profile preview
  ```
* **Kompilasi Lokal**:
  ```bash
  eas build --platform android --profile preview --local
  ```
Setelah kompilasi selesai, unduh berkas APK yang dihasilkan dan instal secara langsung pada perangkat Android Anda.

---

## 4. Panduan Rollback (Rollback Notes)
Apabila terjadi kegagalan sistem pada build rilis terbaru:
1. **Rollback Kode**: Kembalikan branch utama ke commit stabil sebelumnya menggunakan perintah git:
   ```bash
   git checkout main
   git reset --hard <hash_commit_stabil_sebelumnya>
   ```
2. **Rebuild**: Jalankan ulang perintah kompilasi `eas build` menggunakan profil `preview` untuk menghasilkan APK baru dari kode yang telah dikembalikan.
3. **Penyimpanan Kredensial**: Pastikan kredensial SecureStore tidak terpengaruh karena rollback kode tidak akan menghapus data yang tersimpan di keychain sistem operasi secara otomatis, kecuali jika aplikasi dihapus instalasinya (uninstall).

---

## 5. Catatan Kesiapan iOS (iOS Readiness Notes)
Meskipun MVP ini ditargetkan untuk Android, basis kode dikembangkan agar siap porting ke iOS dengan ketentuan:
* Berkas `app.json` sudah memiliki konfigurasi dasar `bundleIdentifier: "com.bksda.superapp"`.
* Seluruh native modules yang digunakan (`expo-camera`, `expo-location`, `expo-secure-store`, `expo-file-system`, `expo-sharing`) didukung penuh di platform iOS.
* Sebelum melakukan build untuk iOS (`eas build --platform ios`), pengembang harus mendaftarkan akun Apple Developer Program dan mengatur profil provisioning di berkas `eas.json` untuk platform ios.
