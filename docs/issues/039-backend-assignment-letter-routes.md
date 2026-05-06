# Issue #039 — Backend — Surat Tugas Routes (Public & Auth)

> **Type**: `feature`
> **Labels**: `backend`, `routes`, `module-surattugas`
> **Priority**: 🔴 Critical (Menghubungkan Jaringan Fungsi Controller ke Dunia Luar)
> **Complexity**: 🟡 Medium (Pengaturan lapisan keamanan Middleware & Pemurnian Public Endpoint)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #038

---

## Branch

```
issue/039-backend-assignment-letter-routes
```

## Deskripsi

Ibarat sebuah restoran mewah, *Model* adalah bahan bakunya, *Controller* (Issue 038) adalah kokinya, dan sekarang kita akan membangun pintu masuk serta para pelayan (*Router*) untuk menyajikannya ke hadapan *Frontend*.

Pada tahapan perancangan *Roadmap* awal, sempat tertulis "Public Submit" untuk Surat Tugas. Namun, setelah melakukan audit keamanan ketat standar BKSDA, sebuah Surat Tugas Kepegawaian tidak mungkin diciptakan oleh masyarakat umum yang tidak memiliki `auth()->id()`.

Sebagai gantinya, **Area Publik (Tanpa Login)** pada modul ini didedikasikan sepenuhnya untuk sebuah inovasi brilian: **Endpoint Verifikasi Dokumen**. Masyarakat umum / instansi penegak hukum bisa memindai Kode QR yang tercetak di fisik PDF Surat Tugas untuk mengecek keasliannya dari database BKSDA.

Sisanya, seluruh operasi *CRUD* akan kita segel di dalam *Middleware Sanctum* berganda (Cek Token JWT + Cek Hak Akses Modul + Cek Jejak Audit).

---

## Acceptance Criteria

- [ ] File `app/Modules/SuratTugas/Routes/api.php` di-update sepenuhnya.
- [ ] Tersedia endpoint publik `GET /verify/{id}` (Tanpa Middleware Auth) untuk pengecekan keaslian.
- [ ] *Protected Route Group* dilindungi oleh lapisan baja `['auth:sanctum', 'module.access:surat_tugas']`.
- [ ] Seluruh endpoint operasi ubah (`POST`, `PUT`, `DELETE`) harus dikurung lagi ke dalam kotak `middleware('audit.log')` untuk kepatuhan **Rule 3.5**.
- [ ] Tersedia rute pengunduhan berkas privat (`GET /{id}/download`).
- [ ] Controller `AssignmentLetterController` diperbarui sedikit untuk mengakomodir fungsi dasar `show` (Detail Surat) dan `verify` (Keaslian).

---

## Langkah Demi Langkah

### Langkah 1: Merakit Peta Rute Keamanan

Buka kembali pintu gerbang sementara yang kita buat di Issue #037. Hapus rute `/ping` tersebut karena kini modul kita telah beroperasi penuh.

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Routes\api.php`

**Ubah total isinya menjadi seperti Peta Jaringan Keselamatan (Routing) di bawah ini:**

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Modules\SuratTugas\Controllers\AssignmentLetterController;

/*
|--------------------------------------------------------------------------
| Surat Tugas API Routes
|--------------------------------------------------------------------------
| Prefix: /api/surat-tugas
| Middleware bawaan 'api' otomatis aktif dari ServiceProvider.
*/

// =========================================================================
// 🌍 KAWASAN PUBLIK (TANPA LOGIN)
// Digunakan oleh aparat/masyarakat untuk memindai Barcode/QR Code di surat fisik
// =========================================================================
Route::get('/verify/{id}', [AssignmentLetterController::class, 'verify'])
    ->name('surat-tugas.verify');


// =========================================================================
// 🔒 KAWASAN TERLARANG (WAJIB TOKEN JWT & HAK AKSES MODUL)
// =========================================================================
// Nama modul di database akses pengguna adalah 'surat_tugas'
Route::middleware(['auth:sanctum', 'module.access:surat_tugas'])->group(function () {
    
    // 🛡️ LAPISAN AUDIT (Rule 3.5)
    // Segala operasi yang mengubah Database WAJIB dicatat IP dan Waktunya
    Route::middleware('audit.log')->group(function () {
        Route::post('/', [AssignmentLetterController::class, 'store']);
        Route::put('/{id}/status', [AssignmentLetterController::class, 'updateStatus']);
        Route::delete('/{id}', [AssignmentLetterController::class, 'destroy']);
        Route::post('/{id}/restore', [AssignmentLetterController::class, 'restore']);
    });

    // 📖 OPERASI BACA (Aman tanpa Audit Log tambahan)
    Route::get('/', [AssignmentLetterController::class, 'index']);
    Route::get('/{id}', [AssignmentLetterController::class, 'show']);
    
    // 📂 OPERASI PENGUNDUHAN BERKAS NEGARA (Rule 4.5)
    Route::get('/{id}/download', [AssignmentLetterController::class, 'downloadPdf']);
    
});
```

---

### Langkah 2: Lengkapi Lubang Fungsi Controller

Sistem akan *Error* jika rute menuju ke tujuan yang tidak ada. Di Issue 038 kita belum menulis fungsi `show` dan `verify` di dalam Controller. 

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Controllers\AssignmentLetterController.php`

**Buka kembali Controller tersebut, gulir ke paling bawah, dan tempelkan 2 fungsi penutup ini sebelum kurung kurawal `}` penutup *Class*:**

```php
    /**
     * READ: Melihat rincian satu buah Surat Tugas lengkap (Internal Pegawai)
     */
    public function show(string $id)
    {
        $surat = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'employees:id,nama_lengkap,nip'])->findOrFail($id);
        
        return response()->json([
            'data' => $surat
        ]);
    }

    /**
     * VERIFY: Memverifikasi Keaslian Surat (Tanpa Login / Scan QR Code)
     */
    public function verify(string $id)
    {
        // Hindari memberikan relasi berlebihan kepada publik. Batasi hanya metadata!
        $surat = AssignmentLetter::with(['employees:id,nama_lengkap'])->findOrFail($id);
        
        // Surat tidak sah jika statusnya masih DRAFT atau DITOLAK
        if ($surat->status !== 'approved' && $surat->status !== 'completed') {
            return response()->json([
                'valid' => false,
                'message' => 'Dokumen ini tidak memiliki ketetapan hukum yang sah atau statusnya belum disetujui.'
            ], 403);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Dokumen ini terverifikasi SAH dan TERCATAT di database.',
            'data' => [
                'nomor_surat' => $surat->nomor_surat,
                'maksud_tujuan' => $surat->maksud_tujuan,
                'tanggal_berlaku' => $surat->tanggal_mulai->format('d M Y') . ' s/d ' . $surat->tanggal_selesai->format('d M Y'),
                'tempat_tujuan' => $surat->tempat_tujuan,
                'personil' => $surat->employees->pluck('nama_lengkap')
            ]
        ]);
    }
```

---

## Troubleshooting

### Q: Kenapa `module.access` menggunakan kata `surat_tugas`? (Bukan Kepegawaian dll).

**Artinya:** Modul ini telah merdeka.
**Solusi:** Di Issue Fase 1 (Middleware CheckModuleAccess), sistem akan membaca struktur rute `module.access:namamodul` dan memverifikasinya ke kolom JSON `access_modules` milik Akun User yang sedang login. Seorang admin Kepegawaian tidak akan bisa menembus API Surat Tugas ini jika bosnya belum menceklis akses *Surat Tugas* di menu profilnya.

### Q: Saat saya mengetes via Postman, muncul pesan "Route [login] not defined".

**Artinya:** Kamu mencoba mengakses Endpoint `/api/surat-tugas/` TANPA memasukkan Token JWT di bagian Header Authorization (Bearer Token).
**Solusi:** Karena *Request*-mu ditolak oleh Middleware `auth:sanctum`, Laravel kebingungan harus melemparmu ke mana (karena tidak ada layar login default). Solusi teknisnya ada di *Frontend*, Interceptor API `api.ts` di Issue #016 sudah kita bangun sedemikian rupa untuk menangkap error *Unauthorized* dan mendepak paksa (*Force Logout*) pengunjung tersebut.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): api routing configuration and security layers" \
  --body "Merajut endpoint API dengan lapisan ganda Sanctum dan Modul Access, serta pembuatan endpoint publik untuk verifikasi keaslian via QR Scan. Detail di docs/issues/039-backend-assignment-letter-routes.md" \
  --label "backend,routes,module-surattugas"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/039-backend-assignment-letter-routes
```

### Step 3: Kerjakan

Bersihkan `Routes/api.php` dan salin struktur jalur yang aman. Jangan lupakan pembaruan pada `AssignmentLetterController.php` dengan menyisipkan dua fungsi pelengkap.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(surat-tugas): api routing configuration and security layers (#39)"
git push -u origin issue/039-backend-assignment-letter-routes
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): api routing configuration and security layers (#39)" \
  --body "## Summary
Penyelesaian peta persimpangan *(Routing)* Modul Surat Tugas dengan mendirikan portal sekuritas berlapis standar pemerintah.

## Changes
- Konfigurasi *Route Group* dengan Middleware \`auth:sanctum\` & \`module.access\`.
- Injeksi \`audit.log\` eksklusif untuk Endpoint Mutasi Data.
- Perancangan inovasi *Public Verification Endpoint* (\`/verify\`) untuk pemindaian *Barcode*.
- Penyelesaian fungsi \`show\` dan \`verify\` pada level *Controller*.

## Rules Compliance
- [x] Rule 3.5: Jejak digital *(Audit Logging)* dikerahkan pada operasi *write* untuk mencegah tindakan koruptif.
- [x] Rule 4.5: Penarikan berkas diletakkan secara presisi di belakang gembok *Middleware*, menutup celah kebocoran arsip rahasia.

Closes #39" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Controller dan Controller Request Modul Surat Tugas telah ada. Kini kita merajut pipa *Endpoints*-nya agar diakses oleh Frontend, lengkap dengan portal penjagaan Hak Akses Modul.

## Task

Kerjakan Issue #039 (Backend — Surat Tugas Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/039-backend-assignment-letter-routes.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Edit file `backend/app/Modules/SuratTugas/Routes/api.php` dan hapus rute ping sementara. Gantikan dengan struktur `Route::middleware` yang disediakan.
3. Edit `backend/app/Modules/SuratTugas/Controllers/AssignmentLetterController.php` dan tambahkan fungsi `show()` serta `verify()`.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
