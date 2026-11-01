# Dokumen Rencana Pengujian Lanjutan Modul BKSDA Drive: Backend, Frontend & Security Pentest

> **Status Dokumen**: DRAF PERENCANAAN PENGUJIAN TINGKAT LANJUT (Disiapkan untuk Evaluasi Pengguna)  
> **Tanggal Pembuatan**: 01 November 2026  
> **Branch Acuan**: `codex/portal-security-pentest`  
> **Target Modul**: 
> - Backend: `backend/app/Http/Controllers/Api/Drive*`, `backend/app/Support/Security/DriveAccess.php`, `backend/app/Console/Commands/*`, `backend/app/Jobs/*`
> - Frontend: `frontend/src/app/drive/page.tsx`, `frontend/src/app/drive/_components/*`, `frontend/src/app/drive/s/[token]/page.tsx`
> - Security Pentest: Simulasi Serangan Jaringan, Balapan Kuota (CWE-362), IDOR Chunk Injection (CWE-639), Zip-Bomb (CWE-409), dan CORS Misconfiguration (CWE-942).
> **Prinsip Utama**: Ponytail (Zero New Dependency, Minimal Diff, Boring over Clever), Native Platform Capabilities, dan OWASP ASVS v4.0.

---

## 1. Pemahaman & Arsitektur Tiga Dimensi Pengujian (BE, FE, Security)

Pengujian lanjutan ini dirancang untuk menjawab tantangan kondisi riil di lapangan (khususnya wilayah kerja BKSDA Kalimantan Timur yang memiliki 14 resor dengan variasi kualitas jaringan internet ekstrem). Pengujian dipecah ke dalam **Tiga Pilar Pengujian Terpadu**:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                   ARSITEKTUR 3 DIMENSI PENGUJIAN TINGKAT LANJUT BKSDA DRIVE                 │
├───────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│     DIMENSI 1: BACKEND (BE)   │   DIMENSI 2: FRONTEND (FE)  │  DIMENSI 3: SECURITY PENTEST  │
├───────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • State Machine Multipart     │ • Slice Chunking File API   │ • Anti-IDOR Chunk Hijacking   │
│ • Idempotensi Retry Part      │ • AbortController & Retry   │ • ClamAV Sandbox Quarantine   │
│ • Database Lock (lockForUpdate│ • Persistent State IndexedDB│ • Anti Zip-Bomb (CWE-409)     │
│ • Async Quarantine Job Pipeline│ • Feedback UI Karantina     │ • Anti-TOCTOU Quota Exploit   │
│ • AWS SigV4 Presigned Handler │ • Real-Time Dropzone Guard  │ • CORS Origin Boundary Audit  │
│ • Atomic Quota Reservation    │ • Direct S3 Upload Stream   │ • Replay Signature Mitigation │
└───────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

1. **Dimensi Backend (BE)**:
   - Menguji keandalan *state machine* penyimpanan berkas, atomisitas transaksi basis data (`DB::transaction` dengan `lockForUpdate` pada PostgreSQL), agregasi chunk multipart di S3/RustFS, pemrosesan antrean asinkron (*queue workers*), dan siklus hidup pembersihan berkas kedaluwarsa.
2. **Dimensi Frontend (FE)**:
   - Menguji interaktivitas antarmuka di browser nyata: pemecahan berkas (*slicing* via `File.prototype.slice`), intersepsi pembatalan unggahan via `AbortController`, penyimpanan progres unggah di `IndexedDB` agar tahan refresh halaman, rendering badge berkas terisolasi/karantina, dan kalkulasi kuota optimistik tanpa pergeseran layout (CLS < 0.05).
3. **Dimensi Security Pentest**:
   - Menguji ketahanan sistem terhadap serangan tingkat lanjut: kondisi balapan kuota (*Time-of-Check to Time-of-Use / TOCTOU*), injeksi chunk lintas pengguna (*Cross-User Multipart Chunk Hijacking*), bom dekompresi (*Zip-Bomb* / CWE-409), kebocoran kredensial via *CORS Misconfiguration* (CWE-942), dan pemalsuan parameter presigned URL.

---

## 2. Matriks 4 Domain $\times$ 3 Dimensi (12 Kasus Uji Lanjutan)

Berikut adalah 12 kasus uji tingkat lanjut yang membedah 4 domain kritis ke dalam pilar Backend, Frontend, dan Security:

| Domain Lanjutan | Dimensi | ID Uji | Target Komponen | Skenario & Vektor Uji | Kriteria Keberhasilan (Expected Invariant) |
|---|---|---|---|---|---|
| **Domain 1: S3 Chunk Multipart Resumability** | **Backend (BE)** | **DRV-ADV-01** | `POST /api/drive/upload/part` & `complete` | Unggahan 100MB (4 part @25MB). Part 1 dan 2 selesai; part 3 gagal jaringan; dikirim ulang part 3 tanpa mengulang part 1 & 2. | Backend menerima part 3 dengan ETag sah, mencatat ke sesi `drive_uploads`, dan saat `completeUpload` dipanggil, berkas teragregasi utuh tanpa korupsi byte. |
| | **Frontend (FE)** | **DRV-ADV-02** | `DriveUploadDialog.tsx` & Upload Worker | Browser mengalami `net::ERR_INTERNET_DISCONNECTED` saat upload part 3; tombol "Lanjutkan Upload" diklik setelah jaringan pulih. | Frontend membaca progres tersimpan dari `IndexedDB`/state, melanjutkan transmisi mulai dari part 3, dan progress bar melanjutkan dari 50% $\rightarrow$ 100% tanpa reset ke 0%. |
| | **Security** | **DRV-ADV-03** | `POST /api/drive/upload/part` | **Serangan IDOR Chunk Injection (CWE-639)**: Penyerang mencoba menyuntikkan payload `PartNumber: 2` ke sesi `upload_id` milik pegawai lain. | Backend menolak keras dengan HTTP `403 Forbidden` (`Unauthorized Session Owner`). Chunk penyerang tidak dapat disisipkan ke berkas korban. |
| **Domain 2: Async Deep Antivirus & Quarantine** | **Backend (BE)** | **DRV-ADV-04** | `ScanDriveFileForMalwareJob` & DB State | Berkas `.docx` dengan makro VBA jahat selesai diunggah. Job antrean memindai berkas via ClamAV socket daemon. | File langsung dipindahkan ke state `status: 'quarantined'`, dipindahkan dari path publik ke `quarantine/{uuid}`, dan notifikasi ancaman dikirim ke Admin. |
| | **Frontend (FE)** | **DRV-ADV-05** | `DriveFileList.tsx` & `DrivePreviewModal.tsx` | Pengguna membuka folder yang berisi berkas berstatus `quarantined`. | Berkas menampilkan badge merah `Terkarantina (Ancaman Terdeteksi)`; tombol unduh & pratinjau dinonaktifkan (`disabled`); klik memunculkan modal peringatan bahaya keamanan. |
| | **Security** | **DRV-ADV-06** | Sandbox Engine & Zip Extractor | **Serangan Zip-Bomb (CWE-409)**: Pengguna mengunggah arsip ZIP 42KB yang mengembang menjadi 4.5 Petabyte saat diekstrak. | Engine pemindaian membatasi rasio ekspansi maksimal (rasio > 100:1 atau ukuran > batas kuota langsung dihentikan); sistem menolak ekstraksi dan memblokir denial-of-service (DoS) storage. |
| **Domain 3: High Concurrency Storage Quota Depletion** | **Backend (BE)** | **DRV-ADV-07** | `DriveController::initUpload` & DB Locking | Kuota unit sisa 30MB. 2 request simultan berukuran 20MB masuk pada milidetik yang sama ke controller. | Eksekusi dibungkus `DB::transaction` dengan `DriveUnit::where('id', $id)->lockForUpdate()`. Request pertama lolos (sisa 10MB), request kedua ditolak dengan HTTP `422` ("Kapasitas penyimpanan tidak mencukupi"). Tidak terjadi defisit kuota. |
| | **Frontend (FE)** | **DRV-ADV-08** | Dropzone & `DriveSidebar.tsx` | Pengguna membuka 2 tab browser. Tab A mengunggah berkas yang menghabiskan sisa kuota. Tab B mencoba menjatuhkan berkas baru. | Tab B mendeteksi event update kuota (atau saat response 422 diterima), dropzone langsung menampilkan status terkunci ("Kapasitas Penyimpanan Telah Penuh"), dan menampilkan toast konfirmasi informatif. |
| | **Security** | **DRV-ADV-09** | Rate Limiter & Concurrency Exploit | **Serangan TOCTOU Flooding (CWE-362)**: Skrip otomatis meluncurkan 50 request paralel `initUpload` dalam rentang 100ms untuk membobol kuota unit secara masif. | Mekanisme row-locking PostgreSQL menggagalkan seluruh 48 request berlebih; kuota terpakai tidak pernah melebihi 100%; log keamanan mencatat upaya flooding. |
| **Domain 4: Live MinIO / RustFS S3 SDK v3 CORS & SigV4** | **Backend (BE)** | **DRV-ADV-10** | `filesystems.php` & S3 Signer Service | Pembuatan Presigned PUT dan GET URL dengan driver S3 AWS SDK v3 kompatibel RustFS/MinIO. | URL bertanda tangan AWS SigV4 memuat parameter `X-Amz-Algorithm=AWS4-HMAC-SHA256`, `X-Amz-Credential`, `X-Amz-SignedHeaders`, dan batas waktu kedaluwarsa 15 menit. |
| | **Frontend (FE)** | **DRV-ADV-11** | Direct S3 Upload Client (`fetch`) | Browser mengirim `PUT` biner langsung ke endpoint storage S3 (MinIO/RustFS) menggunakan presigned URL. | Browser menangani preflight CORS (`OPTIONS`) tanpa error header; proses upload langsung membypass beban server Laravel, dan progres upload terpantau via `xhr.upload.onprogress`. |
| | **Security** | **DRV-ADV-12** | S3 Bucket Policy & CORS Boundary | **Audit CORS Misconfiguration (CWE-942)**: Pengujian apakah storage bucket mengizinkan wildcard `Origin: *` dengan kredensial atau metode berbahaya (`DELETE`, `PUT` tanpa tanda tangan). | Bucket policy storage strictly membatasi `AllowedOrigins` hanya ke domain resmi (`https://bksdakaltim.web.id`), `AllowedMethods` hanya `GET, PUT`, dan menolak request unauthenticated listing bucket. |

---

## 3. Rincian Metodologi Pengujian Per Pilar

### A. Metodologi Backend (BE Testing)
1. **Framework & Tooling**: PHPUnit 11 + Laravel Testing Kernel.
2. **Isolasi Database**: PostgreSQL dengan transaksi terisolasi dan pengujian konkruensi via *multi-process kernel runners* (seperti yang telah sukses dibuktikan pada `SuratTugasPostgresConcurrencyTest.php`).
3. **Simulasi Jaringan S3**:
   - Pemanfaatan `Storage::fake('drive')` dan mock `Aws\S3\S3Client` untuk menguji skenario kegagalan koneksi di tengah streaming multipart.
   - Pengecekan konsistensi baris basis data pada `drive_uploads`, status transisi (`initiated` $\rightarrow$ `completed` / `aborted` / `quarantined`), dan relasi foreign key.

### B. Metodologi Frontend (FE Testing)
1. **Framework & Tooling**: Playwright Chromium Headless via Google Chrome lokal.
2. **Simulasi Interupsi Jaringan di Browser**:
   - Memanfaatkan fitur native Playwright `page.route()` untuk memutus koneksi di tengah request:
     ```javascript
     let partCount = 0;
     await page.route('**/api/drive/upload/part', (route) => {
       partCount++;
       if (partCount === 3) {
         route.abort('failed'); // Simulasikan net::ERR_CONNECTION_RESET
       } else {
         route.continue();
       }
     });
     ```
3. **Verifikasi DOM & State**:
   - Memastikan UI tidak mengalami freeze, tombol "Retry" atau "Lanjutkan" muncul otomatis, dan penyimpanan state parsial di `IndexedDB` dapat dibaca kembali setelah simulasi reload halaman (`page.reload()`).

### C. Metodologi Security Pentest (Keamanan & Ketahanan Eksploitasi)
1. **Pencegahan IDOR (CWE-639)**:
   - Membuat 2 aktor pegawai (User A dan User B). User A menginisialisasi upload. User B mencoba mengirim chunk atau membatalkan sesi User A dengan memalsukan token `upload_id`. Sistem wajib mengembalikan HTTP `403 Forbidden`.
2. **Race Condition Stress Test (CWE-362)**:
   - Menjalankan 50 goroutines/child processes PHP secara paralel menggunakan `proc_open` atau `pcntl_fork` yang menembak endpoint `initUpload` pada detik yang sama ketika sisa kuota hanya 1 file. Sistem wajib membuktikan tepat 1 request berhasil dan 49 lainnya ditolak dengan aman.
3. **Pemeriksaan Decompression Bomb (CWE-409)**:
   - Menyiapkan fixture berkas zip bomb (42KB compressed, memuat jutaan nol berulang). ZipStream extractor wajib membaca batas maksimal bytes sebelum memory exhausted atau disk penuh.

---

## 4. Rencana Jadwal & Tahapan Eksekusi (Roadmap)

Jika Anda menyetujui rencana pengujian lanjutan ini, tahapan kerja akan dibagi menjadi 3 fase mandiri:

1. **Fase Lanjutan 1 — Pengujian Resumabilitas S3 Multipart & Anti-IDOR Chunk** (`DRV-ADV-01` s.d. `DRV-ADV-03`):
   - Membuat automated test suite PHPUnit untuk chunk idempotency.
   - Membuat skenario Playwright dengan intersepsi network drop dan pemulihan `IndexedDB`.
2. **Fase Lanjutan 2 — Pengujian Konkruensi Kuota Ekstrem & Lock PostgreSQL** (`DRV-ADV-07` s.d. `DRV-ADV-09`):
   - Menerapkan pengujian *parallel stress test* pada row-locking kuota DriveUnit.
   - Verifikasi feedback error tab ganda pada antarmuka Next.js.
3. **Fase Lanjutan 3 — Pengujian Antivirus Sandbox Quarantine & CORS Live Storage** (`DRV-ADV-04` s.d. `DRV-ADV-06` & `DRV-ADV-10` s.d. `DRV-ADV-12`):
   - Simulasi alur job karantina malware.
   - Audit konfigurasi CORS dan SigV4 presigned URL pada storage S3.

---

## 5. Pertanyaan untuk Evaluasi Pengguna

Mohon tinjau rencana dokumen pengujian lanjutan ini:
1. Apakah ke-4 domain lanjutan (S3 Multipart Resumability, Antivirus Quarantine, Konkruensi Kuota Ekstrem, dan Live Storage CORS SigV4) telah sesuai dengan kebutuhan operasional yang ingin Anda evaluasi?
2. Apakah Anda ingin memulai implementasi dari **Fase Lanjutan 1 (S3 Multipart Resumability & Network Interruption)** terlebih dahulu, atau Anda ingin mengevaluasi aspek lainnya?
