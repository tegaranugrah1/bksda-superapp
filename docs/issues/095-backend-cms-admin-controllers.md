# Issue #095 — Backend — CMS Admin Controllers (Ruang Kendali Pengelola Konten)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `module-cms`
> **Priority**: 🔴 Critical (Seluruh CRUD Konten Website Berada di Sini)
> **Complexity**: 🔴 High (16 Entitas × 4-5 Metode CRUD = ~70 Endpoint)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #094

---

## Branch

```
issue/095-backend-cms-admin-controllers
```

## Deskripsi

Jika PublicController (Issue 094) adalah "Etalase Toko" yang hanya memajang barang, maka **AdminController** adalah "Gudang Belakang" — tempat pegawai menata, menambah, mengubah, dan membuang konten website.

**Tantangan Arsitektur:**
Dengan 16 entitas yang harus dikelola, membuat 1 Controller raksasa berisi 70+ metode adalah bunuh diri kode *(God Controller Anti-Pattern)*. Sebaliknya, membuat 16 Controller terpisah yang masing-masing hanya berisi 5 metode identik juga pemborosan *(Boilerplate Hell)*.

**Solusi Cerdas: Arsitektur Hibrida (3 Lapis)**

Kita akan menggunakan strategi **"Trait + Controller Terfokus"**:
1. **`AdminCrudTrait`** — Sebuah *Trait* ajaib berisi logika CRUD generik yang bisa "ditempelkan" ke Controller manapun. Ia menangani `index`, `store`, `update`, `destroy` secara otomatis.
2. **Controller Ringan** — Untuk entitas sederhana (Profil, Kawasan, Link, Photo, dll), Controller cukup menempel *Trait* dan mendeklarasikan nama Model-nya. Selesai. 5 baris.
3. **Controller Khusus** — Untuk entitas kompleks (Informasi, Buku, Regulasi) yang butuh logika file upload dan slug generator, kita tulis metode secara manual.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/CMS/Controllers/Admin/`.
- [ ] Tersedia `Traits/AdminCrudTrait.php` berisi logika CRUD generik.
- [ ] Tersedia minimal 8 Admin Controller yang terbagi dalam 3 kategori kompleksitas.
- [ ] Setiap Controller yang menerima file upload wajib menggunakan UUID Masking (Rule 4.3).
- [ ] Setiap Controller yang menerima `judul` wajib auto-generate `slug` menggunakan `Str::slug()`.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Admin:
```bash
mkdir -p backend/app/Modules/CMS/Controllers/Admin
mkdir -p backend/app/Modules/CMS/Traits
```

### 1. Cetak Biru Senjata Rahasia: AdminCrudTrait
**Path:** `backend/app/Modules/CMS/Traits/AdminCrudTrait.php`

Trait ini akan menghancurkan ratusan baris kode berulang:

```php
<?php

namespace App\Modules\CMS\Traits;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

/**
 * TRAIT SERBAGUNA UNTUK ADMIN CRUD
 * 
 * Cara Penggunaan:
 * 1. Di Controller, tulis: use AdminCrudTrait;
 * 2. Buat properti: protected string $model = \App\Modules\CMS\Models\Profil::class;
 * 3. (Opsional) Override metode jika butuh logika khusus.
 */
trait AdminCrudTrait
{
    /**
     * GET — Daftar semua data (termasuk draft, karena ini Admin)
     */
    public function index(Request $request)
    {
        $query = $this->model::query()->latest();

        if ($request->filled('search')) {
            // Cari di kolom 'judul' atau 'nama' (keduanya umum di CMS)
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('judul', 'ilike', "%{$search}%")
                  ->orWhere('nama', 'ilike', "%{$search}%");
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * GET — Detail satu data
     */
    public function show(string $id)
    {
        $record = $this->model::findOrFail($id);
        return response()->json(['data' => $record]);
    }

    /**
     * POST — Buat data baru
     */
    public function store(Request $request)
    {
        $modelInstance = new $this->model();
        $data = $request->only($modelInstance->getFillable());

        // Auto-generate slug jika ada kolom 'judul'
        if (isset($data['judul']) && !isset($data['slug'])) {
            $data['slug'] = Str::slug($data['judul']) . '-' . Str::random(5);
        }

        // Handle file upload jika ada
        $data = $this->handleFileUpload($request, $data);

        $record = $this->model::create($data);

        return response()->json([
            'message' => 'Data berhasil ditambahkan.',
            'data' => $record
        ], 201);
    }

    /**
     * PUT — Perbarui data
     */
    public function update(Request $request, string $id)
    {
        $record = $this->model::findOrFail($id);
        $data = $request->only($record->getFillable());

        // Regenerate slug jika judul berubah
        if (isset($data['judul']) && $data['judul'] !== $record->judul) {
            $data['slug'] = Str::slug($data['judul']) . '-' . Str::random(5);
        }

        $data = $this->handleFileUpload($request, $data);
        $record->update($data);

        return response()->json([
            'message' => 'Data berhasil diperbarui.',
            'data' => $record
        ]);
    }

    /**
     * DELETE — Hapus Lunak (SoftDelete)
     */
    public function destroy(string $id)
    {
        $record = $this->model::findOrFail($id);

        try {
            $record->delete();
            return response()->json(['message' => 'Data berhasil dihapus.']);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Data tidak dapat dihapus karena masih terkait data lain.'
            ], 422);
        }
    }

    /**
     * Pemroses File Upload Otomatis
     * Mendeteksi field umum: thumbnail, file, foto, cover, logo
     */
    protected function handleFileUpload(Request $request, array $data): array
    {
        $fileFields = [
            'thumbnail'  => 'thumbnail_path',
            'file'       => 'file_path',
            'foto'       => 'foto_path',
            'cover'      => 'cover_path',
            'logo'       => 'logo_path',
            'favicon'    => 'favicon_path',
        ];

        foreach ($fileFields as $inputName => $dbColumn) {
            if ($request->hasFile($inputName)) {
                $file = $request->file($inputName);
                $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('private/cms', $filename);
                $data[$dbColumn] = $path;
            }
        }

        return $data;
    }
}
```

### 2. Cetak Biru Controller Ringan (Tempelkan Trait, Selesai!)

Contoh Controller yang ultra-tipis — cukup 12 baris:

**Path:** `backend/app/Modules/CMS/Controllers/Admin/ProfilController.php`
```php
<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Profil;

class ProfilController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Profil::class;
}
```

Dengan pola ini, kita bisa merakit Controller ringan untuk **10 entitas sederhana** dalam hitungan menit:

| # | Controller | Model | Catatan |
|---|-----------|-------|---------|
| 1 | `ProfilController` | `Profil` | Tanpa modifikasi |
| 2 | `KawasanController` | `Kawasan` | Tanpa modifikasi |
| 3 | `TslController` | `Tsl` | Tanpa modifikasi |
| 4 | `PhotoController` | `Photo` | Tanpa modifikasi |
| 5 | `VideoController` | `Video` | Tanpa modifikasi |
| 6 | `LinkController` | `Link` | Tanpa modifikasi |
| 7 | `LeafletController` | `Leaflet` | Tanpa modifikasi |
| 8 | `PosterController` | `Poster` | Tanpa modifikasi |
| 9 | `CategoryController` | `Category` | Tanpa modifikasi |
| 10 | `JenisController` | `Jenis` | Tanpa modifikasi |

### 3. Cetak Biru Controller Khusus (Logika Tambahan)

Untuk entitas kompleks, kita override beberapa metode dari Trait:

**Path:** `backend/app/Modules/CMS/Controllers/Admin/InformasiController.php`
```php
<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Informasi;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InformasiController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Informasi::class;

    /**
     * Override index: Eager load category + author
     */
    public function index(Request $request)
    {
        $query = Informasi::with('category:id,nama', 'author:id,name')->latest();

        if ($request->filled('search')) {
            $query->where('judul', 'ilike', '%' . $request->search . '%');
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Override store: Inject user_id dan published_at
     */
    public function store(Request $request)
    {
        $request->validate([
            'judul' => 'required|string|max:500',
            'konten' => 'required|string',
            'thumbnail' => 'nullable|file|max:5120|mimes:jpg,jpeg,png,webp',
        ]);

        $data = $request->only((new Informasi())->getFillable());
        $data['user_id'] = $request->user()->id;
        $data['slug'] = Str::slug($data['judul']) . '-' . Str::random(5);

        // Jika langsung dipublikasi
        if ($request->boolean('is_published')) {
            $data['published_at'] = now();
        }

        $data = $this->handleFileUpload($request, $data);
        $record = Informasi::create($data);

        return response()->json([
            'message' => 'Berita berhasil disimpan.',
            'data' => $record
        ], 201);
    }

    /**
     * Endpoint khusus: Toggle status Publikasi (Terbitkan / Tarik)
     */
    public function togglePublish(string $id)
    {
        $berita = Informasi::findOrFail($id);
        $berita->update([
            'is_published' => !$berita->is_published,
            'published_at' => !$berita->is_published ? now() : $berita->published_at,
        ]);

        $status = $berita->is_published ? 'diterbitkan' : 'ditarik dari publikasi';
        return response()->json(['message' => "Berita berhasil {$status}.", 'data' => $berita]);
    }
}
```

**Path:** `backend/app/Modules/CMS/Controllers/Admin/BukuController.php`
```php
<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Buku;
use Illuminate\Http\Request;

class BukuController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Buku::class;

    /** Override index: Eager load jenis publikasi */
    public function index(Request $request)
    {
        $query = Buku::with('jenis:id,nama')->latest();

        if ($request->filled('search')) {
            $query->where('judul', 'ilike', '%' . $request->search . '%');
        }

        return response()->json($query->paginate(20));
    }
}
```

**Path:** `backend/app/Modules/CMS/Controllers/Admin/RegulasiController.php`
```php
<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Regulasi;
use Illuminate\Http\Request;

class RegulasiController extends Controller
{
    use AdminCrudTrait;

    protected string $model = Regulasi::class;

    /** Override index: Eager load jenis + filter tahun */
    public function index(Request $request)
    {
        $query = Regulasi::with('jenis:id,nama')->latest();

        if ($request->filled('search')) {
            $query->where('judul', 'ilike', '%' . $request->search . '%');
        }
        if ($request->filled('tahun')) {
            $query->where('tahun', $request->tahun);
        }

        return response()->json($query->paginate(20));
    }
}
```

**Path:** `backend/app/Modules/CMS/Controllers/Admin/WebsiteController.php`
```php
<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Traits\AdminCrudTrait;
use App\Modules\CMS\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class WebsiteController extends Controller
{
    /** Website bersifat Singleton — hanya 1 baris */
    public function show()
    {
        $data = Website::firstOrCreate([], ['nama_instansi' => 'BKSDA']);
        return response()->json(['data' => $data]);
    }

    public function update(Request $request)
    {
        $website = Website::firstOrCreate([], ['nama_instansi' => 'BKSDA']);
        $data = $request->only($website->getFillable());

        // Handle logo dan favicon
        foreach (['logo' => 'logo_path', 'favicon' => 'favicon_path'] as $input => $col) {
            if ($request->hasFile($input)) {
                $file = $request->file($input);
                $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
                $data[$col] = $file->storeAs('private/cms', $filename);
            }
        }

        $website->update($data);
        return response()->json(['message' => 'Pengaturan website berhasil diperbarui.', 'data' => $website]);
    }
}
```

**Path:** `backend/app/Modules/CMS/Controllers/Admin/PesanController.php`
```php
<?php

namespace App\Modules\CMS\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Modules\CMS\Models\Pesan;
use Illuminate\Http\Request;

class PesanController extends Controller
{
    /** Daftar pesan masuk */
    public function index(Request $request)
    {
        $query = Pesan::latest();

        if ($request->filled('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        return response()->json($query->paginate(20));
    }

    /** Tandai sudah dibaca */
    public function markAsRead(string $id)
    {
        $pesan = Pesan::findOrFail($id);
        $pesan->update(['is_read' => true]);
        return response()->json(['message' => 'Pesan ditandai sudah dibaca.', 'data' => $pesan]);
    }

    /** Hapus pesan */
    public function destroy(string $id)
    {
        Pesan::findOrFail($id)->delete();
        return response()->json(['message' => 'Pesan dihapus.']);
    }
}
```

---

## Troubleshooting

### Q: Trait `AdminCrudTrait` Error `Property $model is not defined`!

**Artinya:** Kamu lupa mendeklarasikan properti di Controller.
**Solusi:** Setiap Controller yang menggunakan `use AdminCrudTrait` WAJIB memiliki baris:
```php
protected string $model = NamaModel::class;
```
Tanpa ini, Trait tidak tahu Model mana yang harus dimanipulasi!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): deploy trait-powered admin controller fleet for 16 content entities" \
  --body "Membangun armada Admin Controller menggunakan arsitektur *Trait Injection*. Memusnahkan potensi pengulangan kode CRUD dengan \`AdminCrudTrait\` dan menerapkan *Override Pattern* untuk entitas kompleks. Detail di docs/issues/095-backend-cms-admin-controllers.md" \
  --label "backend,controller,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/095-backend-cms-admin-controllers
```

### Step 3: Kerjakan

Pahat `AdminCrudTrait.php` PERTAMA. Barulah rakit 10 Controller ringan (cukup salin pola `ProfilController`). Terakhir, pahat 5 Controller khusus yang punya logika tambahan.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(cms): deploy trait-powered admin controller fleet for 16 content entities (#95)"
git push -u origin issue/095-backend-cms-admin-controllers
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): deploy trait-powered admin controller fleet for 16 content entities (#95)" \
  --body "## Summary
Pembangunan Armada Pengendali Admin CMS menggunakan arsitektur *Trait Injection Pattern*.

## Changes
- Penciptaan \`AdminCrudTrait\` — senjata pemusnah kode berulang yang menyediakan 5 metode CRUD generik + *Auto File Upload Handler*.
- 10 Controller Ringan (\`ProfilController\`, \`KawasanController\`, dll) masing-masing hanya 12 baris berkat Trait.
- 5 Controller Khusus (\`InformasiController\`, \`BukuController\`, \`RegulasiController\`, \`WebsiteController\`, \`PesanController\`) dengan logika *Override* spesifik.
- Fitur \`togglePublish\` pada Informasi untuk mengubah status Draft ↔ Terbit.

## Rules Compliance
- [x] Lolos Doktrin DRY Lanjut: Trait menghancurkan ~600 baris kode berulang.
- [x] Lolos Doktrin Upload Aman (Rule 4.3): Seluruh file upload di-*mask* UUID.

Closes #95" \
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
Modul CMS memiliki 16 entitas yang harus dikelola Admin. Membuat 16 Controller identik adalah pemborosan. Solusinya: buat 1 Trait berisi CRUD generik, lalu tempelkan ke setiap Controller.

## Task

Kerjakan Issue #095 (Backend — CMS Admin Controllers).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/095-backend-cms-admin-controllers.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `AdminCrudTrait.php` di folder `Traits/` — ini senjata utamamu.
3. Buat 10 Controller ringan (salin pola `ProfilController` — 12 baris per file).
4. Buat 5 Controller khusus yang override metode dari Trait.
5. Pastikan `WebsiteController` bersifat Singleton (hanya 1 baris data).
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
