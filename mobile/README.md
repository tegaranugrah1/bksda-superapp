# BKSDA SuperApp - Mobile Client

Aplikasi mobile resmi BKSDA Kalimantan Timur SuperApp yang dibangun menggunakan Expo React Native + TypeScript. Rilis pertama difokuskan untuk perangkat Android (online-only), dengan dukungan iOS disiapkan pada fase berikutnya.

---

## Persiapan Awal

### Prerequisites

Pastikan Anda telah menginstal perangkat lunak berikut di mesin pengembangan Anda:
- **Node.js**: versi LTS (rekomendasi v20+)
- **NPM**: bawaan Node.js
- **Android Studio & SDK**: diperlukan untuk menjalankan emulator Android lokal
- **Expo Go App**: instal dari Google Play Store pada perangkat fisik Anda jika tidak menggunakan emulator

### Pengaturan Environment Variables

1. Salin template `.env.example` ke `.env` lokal:
   ```bash
   cp .env.example .env
   ```
2. Buka berkas `.env` dan sesuaikan URL API backend BKSDA Anda:
   ```env
   EXPO_PUBLIC_API_URL=http://<IP_KOMPUTER_ANDA>:8000/api
   ```
   *Catatan: Jika menjalankan di perangkat fisik, jangan gunakan `localhost`. Gunakan alamat IP lokal komputer Anda.*

---

## Cara Menjalankan

1. Masuk ke direktori mobile dan instal dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Jalankan Metro bundler:
   ```bash
   npm run start
   ```

3. Jalankan aplikasi di perangkat target:
   - **Android (Emulator/Physical Device)**: Tekan tombol `a` di terminal, atau jalankan langsung:
     ```bash
     npm run android
     ```
   - **Expo Go**: Pindai QR Code yang muncul di terminal menggunakan aplikasi Expo Go di Android.

---

## Linting dan Typecheck

Untuk memastikan kualitas kode tetap terjaga, jalankan perintah berikut secara berkala:

- **Typecheck (TypeScript Compiler)**:
  ```bash
  npm run typecheck
  ```
- **Linting**:
  ```bash
  npm run lint
  ```
