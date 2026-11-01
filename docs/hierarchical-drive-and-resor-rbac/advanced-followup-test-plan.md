# Dokumen Rencana Pengujian & Remediasi Jeroan Modul BKSDA Drive: Backend, Frontend & Security Pentest

> **Status Dokumen**: RENCANA REMEDIASI AKAR JEROAN (BARE-METAL ROOT REMEDIATION & DEEP TEST PLAN)  
> **Tanggal Pembuatan**: 01 November 2026  
> **Branch Acuan**: `codex/portal-security-pentest` (Strictly Local Commits, Zero Remote Push)  
> **Target Remediasi & Pengujian**: 
> - Backend: `backend/app/Http/Controllers/Api/DriveController.php`, `backend/app/Models/DriveUnit.php`, `backend/app/Models/DriveUpload.php`
> - Test Suite: `backend/tests/Feature/DriveRootConcurrencyAndMultipartTest.php`
> - Frontend: `frontend/src/app/drive/_components/DriveUploadDialog.tsx`, `frontend/tests/drive-security-ui.playwright.cjs`
> **Prinsip Panduan**: Ponytail (Zero New Dependency, Minimal Diff, Boring over Clever), Native Database Locking, OWASP ASVS v4.0.

---

## 1. Analisis Kritis: Cangkang vs. Akar Terdalam (*Bare-Metal Root Audit*)

Berdasarkan audit teknis mendalam terhadap kode yang ada, pengujian sebelumnya masih memiliki "cangkang" di 4 titik krusial:

| Area | Kondisi Cangkang (Pengujian Sebelumnya) | Kondisi Akar Nyata (Di Lapisan Produksi) | Tindakan Remediasi Akar (Tahap Ini) |
|---|---|---|---|
| **1. Kuota & Konkruensi** | Pengujian `DRV-SEC-27` hanya menembak API secara sekuensial (bergantian). | Di `DriveController.php:351`, kuota dihitung tanpa `DB::transaction` dan tanpa `lockForUpdate()`. Dua upload simultan dapat membaca kuota yang sama dan membobol batas storage (*TOCTOU race condition* / CWE-362). Selain itu, upload berstatus `initiated` belum dihitung sebagai *reservasi kuota*. | Pasang `DB::transaction` + `lockForUpdate()` pada `DriveUnit` dan `User`. Tambahkan perhitungan reservasi kuota `DriveUpload::where('status', 'initiated')`. Uji secara paralel! |
| **2. Pipeline S3 Multipart** | `Storage::fake('drive')` melempar error saat `getClient()` dipanggil, sehingga selalu jatuh ke blok `catch` (*fallback single upload*). | Loop pemecahan part 25MB, pembuatan presigned URL per-part, dan agregasi ETag pada multipart upload **sebenarnya belum pernah dieksekusi di tes**. | Bangun suite pengujian khusus yang menguji pipeline multipart murni tanpa jatuh ke fallback, memvalidasi struktur `partsUrls`, `part_size`, dan penyatuan part. |
| **3. Komponen React Frontend** | Playwright menggunakan mock HTML via `page.setContent()`. | Komponen React asli `DriveUploadDialog.tsx` belum diuji secara end-to-end dengan interaksi browser asli, parsing ETag S3, dan penanganan kegagalan per-part. | Verifikasi build Next.js 16 App Router dan tambahkan uji integrasi Playwright langsung ke antarmuka aplikasi. |
| **4. Integritas Bit Berkas** | Hanya membaca 4096 bytes pertama untuk cek MIME via `finfo_buffer`. | Tidak ada verifikasi apakah penggabungan chunk multipart menghasilkan checksum SHA-256 yang identik dengan file asli (*bit-for-bit parity*). | Implementasikan pengujian integritas hash SHA-256 pada penggabungan berkas multipart. |

---

## 2. Rencana Tindakan Remediasi Kode & Pengujian Tingkat Akar

### A. Remediasi Backend (BE): Atomic Quota Reservation & Row-Locking
1. **Model `DriveUnit` (`backend/app/Models/DriveUnit.php`)**:
   - Tambahkan method `reservedStorageBytes()`:
     ```php
     public function reservedStorageBytes(): int
     {
         return (int) DriveUpload::where('unit_id', $this->id)
             ->where('status', 'initiated')
             ->where('expires_at', '>', now())
             ->sum('total_size_bytes');
     }
     ```
2. **Controller `DriveController::initUpload` (`backend/app/Http/Controllers/Api/DriveController.php`)**:
   - Bungkus seluruh pengecekan kuota dan pembuatan `DriveUpload` di dalam `DB::transaction()` dengan `lockForUpdate()`:
     ```php
     return DB::transaction(function () use ($request, $validated, $user, $size, $targetFolder, $unitId) {
         $unit = ! empty($unitId) ? DriveUnit::where('id', $unitId)->lockForUpdate()->firstOrFail() : null;
         $userLocked = User::where('id', $user->id)->lockForUpdate()->first();
         
         if ($unit) {
             $used = $unit->usedStorageBytes();
             $reserved = $unit->reservedStorageBytes();
             if ($used + $reserved + $size > $unit->storage_quota_bytes) {
                 return response()->json(['message' => 'Kapasitas penyimpanan Drive Unit tidak mencukupi.'], 422);
             }
         } else {
             $used = (int) DriveFile::where('user_id', $user->id)->whereNull('unit_id')->whereNull('deleted_at')->sum('size_bytes');
             $reserved = (int) DriveUpload::where('user_id', $user->id)->whereNull('unit_id')->where('status', 'initiated')->where('expires_at', '>', now())->sum('total_size_bytes');
             $quota = (int) ($userLocked->drive_quota_bytes ?: 5368709120);
             if ($used + $reserved + $size > $quota) {
                 return response()->json(['message' => 'Kapasitas penyimpanan Drive Anda telah penuh.'], 422);
             }
         }
         ...
     });
     ```
   - Ini menjamin bahwa dua request yang datang pada milidetik yang sama akan diantrekan secara serial oleh PostgreSQL/MySQL. Request pertama mengunci baris, mereservasi kuota, lalu commit. Request kedua membaca nilai reservasi baru dan langsung ditolak 422 jika kapasitas terlampaui.

### B. Pengujian Akar (Test Suite: `DriveRootConcurrencyAndMultipartTest.php`)
1. **`test_atomic_quota_reservation_prevents_simultaneous_overfill`**:
   - Unit memiliki kuota 100MB.
   - User menginisialisasi upload 60MB (masih `initiated`, belum jadi `DriveFile`).
   - Request kedua menginisialisasi upload 50MB (total 110MB > 100MB).
   - Request kedua wajib ditolak dengan HTTP `422` karena 60MB sudah di-*reserve* oleh transaksi aktif, meskipun `DriveFile` belum dibuat!
2. **`test_quota_reservation_released_on_upload_abort_or_cleanup`**:
   - Sesi upload yang dibatalkan (`aborted`) atau kedaluwarsa otomatis melepaskan reservasi kuota, memungkinkan user lain mengunggah kembali.
3. **`test_multipart_upload_chunk_assembly_and_sha256_bit_integrity`**:
   - Memecah payload biner menjadi 3 part.
   - Memverifikasi penggabungan part menghasilkan berkas dengan checksum SHA-256 yang identik (100% *bit-for-bit parity*).
4. **`test_s3_multipart_structure_and_part_url_generation`**:
   - Memverifikasi pembuatan multipart session menghasilkan `s3_upload_id`, `part_size` yang tepat (25MB), dan array URL presigned per part tanpa jatuh ke fallback.

---

## 3. Rencana Eksekusi Langkah demi Langkah

1. **Langkah 1**: Catat rencana remediasi ini di `docs/hierarchical-drive-and-resor-rbac/advanced-followup-test-plan.md` dan update `docs/progress.md`.
2. **Langkah 2**: Terapkan perbaikan row-locking & quota reservation pada `DriveUnit.php` dan `DriveController.php`.
3. **Langkah 3**: Buat automated test suite `backend/tests/Feature/DriveRootConcurrencyAndMultipartTest.php`.
4. **Langkah 4**: Jalankan PHPUnit test suite tersebut dan pastikan 100% green.
5. **Langkah 5**: Jalankan full regression test Drive (`php artisan test --filter=Drive`) untuk membuktikan zero regression.
6. **Langkah 6**: Commit kode dan test secara lokal pada branch `codex/portal-security-pentest`.
7. **Langkah 7**: Update progress akhir di `docs/progress.md` dan dokumen rekaman uji.
