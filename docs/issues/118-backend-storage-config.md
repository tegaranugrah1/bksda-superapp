# Issue #118 — Backend — Storage Config & Supabase Storage Service (Gudang File Cloud)

> **Type**: `config` / `feature`
> **Labels**: `backend`, `storage`, `devops`
> **Priority**: 🔴 Critical (Semua Upload Foto, PDF, dan Video Bergantung Ini)
> **Complexity**: 🟡 Medium (Config + Service Class + Integrasi Supabase REST API)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Supabase project sudah dibuat

---

## Branch

```
issue/118-backend-storage-config
```

## Deskripsi

Setiap kali admin mengupload foto kawasan, buku PDF, atau poster — file tersebut harus **disimpan di suatu tempat**. Project ini menyimpan file di **Supabase Storage** (cloud storage mirip AWS S3, tapi gratis di tier awal).

**3 Komponen yang Dibahas:**

| # | Komponen | File | Fungsi |
|---|----------|------|--------|
| 1 | Filesystem Config | `config/filesystems.php` | Mendefinisikan disk `supabase` |
| 2 | Storage Service | `app/Services/SupabaseStorageService.php` | Upload, delete, dan URL file |
| 3 | Environment | `.env` | Kredensial Supabase |

### Diagram: Alur Upload File

```
Admin klik "Upload"           Backend                    Supabase Cloud
┌─────────────┐       ┌──────────────────┐       ┌─────────────────────────┐
│ Browser      │       │ Laravel          │       │ Supabase Storage        │
│              │       │                  │       │                         │
│ 1. Pilih     │ POST  │ 2. Validasi:     │ cURL  │ 3. Simpan di bucket     │
│    file.pdf  │──────→│    - Tipe: pdf ✓ │──────→│    cms/buku/abc123.pdf  │
│              │       │    - Size: <20MB │       │                         │
│              │       │                  │       │ 4. Return HTTP 200      │
│              │       │ 5. Simpan path   │←──────│                         │
│              │       │    di database:  │       │                         │
│              │       │    "cms/buku/    │       │                         │
│              │       │     abc123.pdf"  │       │                         │
└─────────────┘       └──────────────────┘       └─────────────────────────┘

Pengunjung mau lihat file:
┌─────────────┐       ┌─────────────────────────────────────────────────────┐
│ Browser      │ GET   │ https://xxx.supabase.co/storage/v1/object/public/  │
│              │──────→│ cms/buku/abc123.pdf                                │
│              │       │                                                     │
│ 6. File      │←──────│ (Langsung dari Supabase CDN — backend tidak        │
│    tampil!   │       │  terlibat saat mengakses file publik)              │
└─────────────┘       └─────────────────────────────────────────────────────┘
```

**Poin kunci:** Backend hanya terlibat saat **upload dan delete**. Saat pengunjung **mengakses** file, mereka langsung ke Supabase CDN — ini membuat backend kita **tidak terbebani**.

---

## Acceptance Criteria

- [ ] `config/filesystems.php` memiliki disk `supabase` dengan driver `s3`.
- [ ] `SupabaseStorageService` tersedia dengan method `upload()`, `delete()`, `publicUrl()`.
- [ ] `.env` memiliki semua kredensial Supabase Storage.
- [ ] File upload menggunakan nama unik (bukan nama asli user).
- [ ] File lama dihapus dari Supabase saat di-replace atau data dihapus.

---

## Panduan Implementasi

### Komponen 1: `config/filesystems.php` — Daftar Disk Storage

```php
'disks' => [

    // ═══ Disk Lokal: Untuk file private (tidak bisa diakses publik) ═══
    'local' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),  // storage/app/private/
        'throw' => false,
    ],

    // ═══ Disk Publik: Untuk file yang perlu diakses via URL lokal ═══
    'public' => [
        'driver' => 'local',
        'root' => storage_path('app/public'),
        'url' => rtrim(env('APP_URL'), '/') . '/storage',
        'visibility' => 'public',
    ],

    // ═══ Disk Supabase: Cloud storage untuk production ═══
    'supabase' => [
        'driver' => 's3',                                          // Supabase kompatibel S3!
        'key' => env('SUPABASE_ACCESS_KEY_ID'),                    // Access key dari Supabase
        'secret' => env('SUPABASE_SECRET_ACCESS_KEY'),             // Secret key
        'region' => env('SUPABASE_DEFAULT_REGION', 'ap-southeast-1'),
        'bucket' => env('SUPABASE_BUCKET'),                        // Nama bucket (e.g. "cms")
        'url' => env('SUPABASE_URL'),                              // Public URL bucket
        'endpoint' => env('SUPABASE_ENDPOINT'),                    // S3 endpoint Supabase
        'use_path_style_endpoint' => env('SUPABASE_USE_PATH_STYLE_ENDPOINT', true),
        'visibility' => 'public',
    ],
],
```

### Kapan Pakai Disk Mana?

| Disk | Kapan Dipakai | Contoh File |
|------|---------------|-------------|
| `local` | File rahasia yang TIDAK boleh diakses publik | Laporan internal, backup |
| `public` | Development lokal (tanpa Supabase) | Testing upload |
| `supabase` | **Production — semua file CMS** | Foto, poster, buku, video |

---

### Komponen 2: `app/Services/SupabaseStorageService.php`

Service class ini menangani semua interaksi dengan Supabase Storage REST API.

```php
<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class SupabaseStorageService
{
    private string $supabaseUrl;
    private string $serviceRoleKey;
    private string $bucket;

    public function __construct()
    {
        // Idealnya dari .env — di sini hardcode untuk kemudahan migrasi
        // TODO: Pindahkan ke config/services.php setelah stabil
        $this->supabaseUrl = env('SUPABASE_PROJECT_URL', 'https://xxx.supabase.co');
        $this->serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY', '');
        $this->bucket = env('SUPABASE_BUCKET', 'cms');
    }

    // ═══════════════════════════════════════════
    // UPLOAD: Simpan file ke Supabase Storage
    // ═══════════════════════════════════════════

    /**
     * Upload file ke Supabase Storage.
     *
     * CONTOH:
     *   $service->upload($request->file('foto'), 'cms/kawasan')
     *   → Return: "cms/kawasan/6614a1b2_1710489000.jpg"
     *
     * MENGAPA nama file unik?
     *   Jika 2 admin upload "foto.jpg" di waktu bersamaan,
     *   file pertama akan ditimpa! Nama unik (uniqid + timestamp)
     *   mencegah konflik ini.
     *
     * @param UploadedFile $file   File dari $request->file('xxx')
     * @param string       $folder Folder tujuan (e.g. 'cms/kawasan')
     * @return string Path relatif untuk disimpan di database
     */
    public function upload(UploadedFile $file, string $folder = ''): string
    {
        // Buat nama file unik
        $extension = $file->getClientOriginalExtension();     // "jpg"
        $filename = uniqid() . '_' . time() . '.' . $extension;
        // Contoh: "6614a1b2_1710489000.jpg"

        $storagePath = $folder ? "{$folder}/{$filename}" : $filename;
        // Contoh: "cms/kawasan/6614a1b2_1710489000.jpg"

        // Kirim file ke Supabase via REST API
        $url = "{$this->supabaseUrl}/storage/v1/object/{$this->bucket}/{$storagePath}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => file_get_contents($file->getRealPath()),
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->serviceRoleKey}",
                "Content-Type: {$file->getMimeType()}",
                "x-upsert: true",  // Timpa jika sudah ada (upsert)
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 30,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new \RuntimeException(
                "Supabase upload gagal (HTTP {$httpCode}): {$response}"
            );
        }

        return $storagePath; // Ini yang disimpan di kolom database
    }

    // ═══════════════════════════════════════════
    // DELETE: Hapus file dari Supabase Storage
    // ═══════════════════════════════════════════

    /**
     * Hapus file dari Supabase Storage.
     *
     * PENTING: Selalu hapus file lama saat:
     * 1. Admin upload file pengganti (update)
     * 2. Admin hapus data (delete)
     * Jika tidak, file yatim piatu menumpuk di cloud = biaya membengkak!
     */
    public function delete(string $path): void
    {
        if (!$path) return;

        $url = "{$this->supabaseUrl}/storage/v1/object/{$this->bucket}/{$path}";

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->serviceRoleKey}",
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 10,
        ]);

        curl_exec($ch);
        curl_close($ch);
    }

    // ═══════════════════════════════════════════
    // PUBLIC URL: Dapatkan URL publik untuk ditampilkan
    // ═══════════════════════════════════════════

    /**
     * Konversi path database ke URL publik Supabase.
     *
     * CONTOH:
     *   SupabaseStorageService::publicUrl("cms/kawasan/foto.jpg")
     *   → "https://xxx.supabase.co/storage/v1/object/public/cms/cms/kawasan/foto.jpg"
     *
     * Method ini static agar bisa dipanggil tanpa instansiasi:
     *   SupabaseStorageService::publicUrl($model->foto)
     */
    public static function publicUrl(?string $path): ?string
    {
        if (!$path) return null;

        // Jika sudah URL lengkap, kembalikan apa adanya
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        $baseUrl = env('SUPABASE_PROJECT_URL', 'https://xxx.supabase.co');
        $bucket = env('SUPABASE_BUCKET', 'cms');
        return "{$baseUrl}/storage/v1/object/public/{$bucket}/{$path}";
    }
}
```

---

### Komponen 3: Pola Controller — Upload, Replace, Delete

Ini adalah pola yang diulang di **setiap controller** yang punya file upload:

```php
class BukuController extends Controller
{
    // ═══ CREATE: Upload file baru ═══
    public function store(Request $request)
    {
        $validated = $request->validate([
            'judul' => 'required|string',
            'file'  => 'nullable|file|mimes:pdf,doc,docx|max:20480', // Max 20MB
        ]);

        $validated['user_id'] = auth()->id();

        // Upload file jika ada
        if ($request->hasFile('file')) {
            $storage = new SupabaseStorageService();
            $validated['file'] = $storage->upload(
                $request->file('file'),
                'cms/buku'                  // Folder tujuan di Supabase
            );
        }

        $buku = Buku::create($validated);
        return response()->json(['data' => $buku], 201);
    }

    // ═══ UPDATE: Replace file lama dengan baru ═══
    public function update(Request $request, $id)
    {
        $buku = Buku::findOrFail($id);

        $validated = $request->validate([
            'judul' => 'required|string',
            'file'  => 'nullable|file|mimes:pdf,doc,docx|max:20480',
        ]);

        if ($request->hasFile('file')) {
            $storage = new SupabaseStorageService();

            // HAPUS file lama dulu! (jangan sampai file yatim piatu)
            if ($buku->file) {
                $storage->delete($buku->file);
            }

            // Upload file baru
            $validated['file'] = $storage->upload(
                $request->file('file'),
                'cms/buku'
            );
        }

        $buku->update($validated);
        return response()->json(['data' => $buku]);
    }

    // ═══ DELETE: Hapus data + file dari cloud ═══
    public function destroy($id)
    {
        $buku = Buku::findOrFail($id);

        // Hapus file dari Supabase SEBELUM hapus record
        if ($buku->file) {
            $storage = new SupabaseStorageService();
            $storage->delete($buku->file);
        }

        $buku->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
```

---

### Komponen 4: `.env` — Kredensial Supabase

```env
# ═══ Supabase Storage (S3 Compatible) ═══
SUPABASE_PROJECT_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx
SUPABASE_BUCKET=cms
SUPABASE_DEFAULT_REGION=ap-southeast-1

# Untuk disk S3 di config/filesystems.php (opsional, jika pakai Laravel Storage facade)
SUPABASE_ACCESS_KEY_ID=your-access-key
SUPABASE_SECRET_ACCESS_KEY=your-secret-key
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co/storage/v1/s3
SUPABASE_ENDPOINT=https://xxxxxxxxxxxxx.supabase.co/storage/v1/s3
SUPABASE_USE_PATH_STYLE_ENDPOINT=true
```

> ⚠️ **KRUSIAL:** `SUPABASE_SERVICE_ROLE_KEY` adalah **kunci super admin** — siapa pun yang memilikinya bisa membaca/menulis/menghapus SEMUA file. **JANGAN PERNAH** commit ke Git! Tambahkan ke `.gitignore`.

### Cara Mendapatkan Kredensial Supabase

```
1. Buka https://supabase.com/dashboard
2. Pilih project → Settings → API
3. Copy "service_role key" (BUKAN "anon key"!)
4. Settings → Storage → Buat bucket "cms" dengan visibility "Public"
5. Paste ke .env
```

---

## Struktur Folder di Supabase Bucket

```
bucket: cms/
├── cms/
│   ├── informasi/          ← Foto berita
│   │   ├── 6614a1b2_1710489000.jpg
│   │   └── 6614a1b3_1710489001.jpg
│   ├── kawasan/            ← Foto kawasan konservasi
│   │   ├── 6614a1b4_1710489002.jpg
│   │   └── 6614a1b5_1710489003.webp
│   ├── buku/               ← File buku digital (PDF)
│   │   └── 6614a1b6_1710489004.pdf
│   ├── poster/             ← Poster/leaflet
│   │   └── 6614a1b7_1710489005.jpg
│   ├── photo/              ← Galeri foto
│   │   └── 6614a1b8_1710489006.jpg
│   └── tsl/                ← Foto TSL (satwa/tumbuhan)
│       └── 6614a1b9_1710489007.jpg
```

---

## Troubleshooting

### Q: Upload gagal "Supabase upload failed (HTTP 403)"!

**Checklist:**
1. ✅ `SUPABASE_SERVICE_ROLE_KEY` benar? (bukan anon key!)
2. ✅ Bucket `cms` sudah dibuat di Supabase dashboard?
3. ✅ Bucket policy mengizinkan upload? (Settings → Policies → INSERT)

### Q: Gambar tidak tampil di frontend!

**Checklist:**
1. ✅ Bucket visibility = **Public**? (bukan Private)
2. ✅ URL di frontend menggunakan `publicUrl()` method?
3. ✅ Path yang tersimpan di database benar? (cek via `php artisan tinker`)

### Q: File yatim piatu (ada di Supabase tapi tidak ada di database)!

**Penyebab:** Lupa `$storage->delete()` saat update/destroy.
**Solusi:** Selalu ikuti pola controller di atas — hapus file lama sebelum upload baru.

### Q: Upload besar gagal timeout!

**Solusi:** Naikkan timeout di SupabaseStorageService:
```php
CURLOPT_TIMEOUT => 60, // Dari 30 ke 60 detik
```
Dan di Nginx:
```nginx
client_max_body_size 20M;
proxy_read_timeout 60s;
```

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "config(storage): configure Supabase Storage service with upload, delete, and public URL" --body "Closes #118" --label "backend,storage,devops"
git checkout -b issue/118-backend-storage-config
# Edit config/filesystems.php → tambah disk supabase
# Buat app/Services/SupabaseStorageService.php
# Update .env dan .env.example
git commit -m "config(storage): add Supabase Storage service and S3-compatible disk (#118)"
git push -u origin issue/118-backend-storage-config
gh pr create --title "config(storage): Supabase Storage service (#118)" --body "## Changes
- config/filesystems.php: Disk supabase (S3-compatible).
- SupabaseStorageService: upload(), delete(), publicUrl() via REST API.
- .env.example: Dokumentasi kredensial Supabase.
- Pola controller: upload baru, replace lama, hapus file saat delete.
Closes #118" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\backend\ (filesystems.php + SupabaseStorageService.php)
Semua file upload (foto, PDF, poster) disimpan di Supabase Storage via REST API.

## Task

Kerjakan Issue #118 (Backend — Storage Config).
Ikuti instruksi di: `docs/issues/118-backend-storage-config.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Edit `config/filesystems.php`: tambah disk `supabase`.
3. Buat `app/Services/SupabaseStorageService.php` (copy dari superapp-inventory).
4. KRUSIAL: Pindahkan hardcoded URL dan key ke `.env` (jangan hardcode di Service!).
5. KRUSIAL: Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.gitignore` jika belum.
6. Update `.env.example` dengan variabel placeholder.
7. Verifikasi upload berfungsi dengan `php artisan tinker`.
8. Lakukan Git push dan `gh pr create`.
````
