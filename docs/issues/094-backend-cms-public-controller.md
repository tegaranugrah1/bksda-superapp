# Issue #094 — Backend — CMS Public Controller (Etalase Website untuk Rakyat)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `public`, `module-cms`
> **Priority**: 🔴 Critical (Melayani Jutaan Pengunjung Website Tanpa Login)
> **Complexity**: 🟡 Medium (Banyak Endpoint, Tapi Pola Sederhana)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash
> **Dependencies**: Issue #092, Issue #093

---

## Branch

```
issue/094-backend-cms-public-controller
```

## Deskripsi

Pada **Issue #094** ini, kita akan membangun **Etalase Digital** BKSDA — titik kontak pertama antara organisasi dan masyarakat Indonesia.

Ketika seseorang membuka website BKSDA, peramban (*Browser*) mereka akan menembak puluhan permintaan ke *Controller* ini: memuat daftar berita, menampilkan profil organisasi, menelusuri galeri foto satwa, dan mengunduh regulasi hukum. Semua terjadi **tanpa Login** — murni konsumsi publik.

**Prinsip Emas PublicController:**
1. **Hanya `GET`**: Controller Publik TIDAK BOLEH memiliki `POST`, `PUT`, atau `DELETE`. Publik hanya boleh membaca, tidak menulis.
2. **Hanya `is_published = true`**: Setiap query wajib difilter agar konten *Draft* (belum dipublikasikan) tidak bocor ke mata publik.
3. **Wajib `->select()`**: Jangan pernah mengirim seluruh kolom (`SELECT *`) ke publik. Kolom sensitif seperti `ip_address`, `user_id`, dan `file_path` internal harus disembunyikan.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/CMS/Controllers/Public/`.
- [ ] Tersedia `PublicController.php` dengan metode khusus baca (*Read-Only*) untuk 10 entitas konten.
- [ ] Seluruh query difilter `is_published = true` atau menggunakan `scopePublished`.
- [ ] Tersedia metode `show($slug)` untuk membuka detail konten menggunakan *Slug URL* (bukan UUID).
- [ ] Endpoint Berita (`informasi`) wajib menambah penghitung kunjungan (`views_count++`) pada setiap akses detail.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Etalase:
```bash
mkdir -p backend/app/Modules/CMS/Controllers/Public
```

**Path:** `backend/app/Modules/CMS/Controllers/Public/PublicController.php`

```php
<?php

namespace App\Modules\CMS\Controllers\Public;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

// Import Model CMS
use App\Modules\CMS\Models\Informasi;
use App\Modules\CMS\Models\Category;
use App\Modules\CMS\Models\Profil;
use App\Modules\CMS\Models\Kawasan;
use App\Modules\CMS\Models\Tsl;
use App\Modules\CMS\Models\Photo;
use App\Modules\CMS\Models\Video;
use App\Modules\CMS\Models\Link;
use App\Modules\CMS\Models\Buku;
use App\Modules\CMS\Models\Leaflet;
use App\Modules\CMS\Models\Poster;
use App\Modules\CMS\Models\Regulasi;
use App\Modules\CMS\Models\Website;
use App\Modules\CMS\Models\Kepala;
use App\Modules\CMS\Models\Menu;

class PublicController extends Controller
{
    // ──────────────────────────────────────────────
    // WEBSITE SETTINGS & NAVIGASI
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/website
     * Data konfigurasi website (Nama, Alamat, Sosmed) — Singleton
     */
    public function website()
    {
        $data = Website::first();
        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/cms/public/kepala
     * Data Kepala BKSDA yang sedang menjabat
     */
    public function kepala()
    {
        $data = Kepala::where('is_active', true)->first();
        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/cms/public/menus
     * Struktur Menu Navigasi Header & Footer (Berisi Anak Sub-Menu)
     */
    public function menus(Request $request)
    {
        $posisi = $request->query('posisi', 'header'); // header atau footer

        $menus = Menu::where('posisi', $posisi)
            ->where('is_active', true)
            ->whereNull('parent_id')        // Hanya ambil menu induk level atas
            ->with('children:id,parent_id,label,url,urutan') // Eager load anak
            ->orderBy('urutan')
            ->get(['id', 'label', 'url', 'urutan']);

        return response()->json(['data' => $menus]);
    }

    // ──────────────────────────────────────────────
    // BERITA / INFORMASI (Konten Utama)
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/informasi
     * Daftar Berita Terpublikasi (Dengan Pagination)
     */
    public function informasiIndex(Request $request)
    {
        $query = Informasi::published() // Scope: hanya yang sudah dipublikasi
            ->with('category:id,nama,slug')
            ->select(['id', 'category_id', 'judul', 'slug', 'thumbnail_path', 'sumber', 'published_at', 'views_count'])
            ->latest('published_at');

        // Filter per Kategori (jika pengunjung klik tab "Siaran Pers")
        if ($request->filled('category_slug')) {
            $query->whereHas('category', fn($q) => $q->where('slug', $request->category_slug));
        }

        // Pencarian Judul
        if ($request->filled('search')) {
            $query->where('judul', 'ilike', '%' . $request->search . '%');
        }

        return response()->json($query->paginate(12));
    }

    /**
     * GET /api/cms/public/informasi/{slug}
     * Detail Berita (Dengan Penghitung Kunjungan)
     */
    public function informasiShow(string $slug)
    {
        $berita = Informasi::published()
            ->with('category:id,nama,slug', 'author:id,name')
            ->where('slug', $slug)
            ->firstOrFail();

        // Tambah penghitung kunjungan tanpa memicu updated_at
        $berita->increment('views_count');

        return response()->json(['data' => $berita]);
    }

    /**
     * GET /api/cms/public/informasi/terbaru
     * 5 Berita Terbaru (Untuk Widget Sidebar/Carousel)
     */
    public function informasiTerbaru()
    {
        $data = Informasi::published()
            ->select(['id', 'judul', 'slug', 'thumbnail_path', 'published_at'])
            ->latest('published_at')
            ->limit(5)
            ->get();

        return response()->json(['data' => $data]);
    }

    // ──────────────────────────────────────────────
    // PROFIL ORGANISASI
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/profil
     * Daftar Halaman Profil (Visi Misi, Sejarah, Struktur, dll)
     */
    public function profilIndex()
    {
        $data = Profil::where('is_published', true)
            ->select(['id', 'judul', 'slug', 'thumbnail_path', 'urutan'])
            ->orderBy('urutan')
            ->get();

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/cms/public/profil/{slug}
     */
    public function profilShow(string $slug)
    {
        $data = Profil::where('is_published', true)->where('slug', $slug)->firstOrFail();
        return response()->json(['data' => $data]);
    }

    // ──────────────────────────────────────────────
    // KAWASAN KONSERVASI
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/kawasan
     */
    public function kawasanIndex()
    {
        $data = Kawasan::where('is_published', true)
            ->select(['id', 'nama', 'slug', 'thumbnail_path', 'tipe_kawasan', 'luas_ha', 'latitude', 'longitude'])
            ->orderBy('nama')
            ->get();

        return response()->json(['data' => $data]);
    }

    /**
     * GET /api/cms/public/kawasan/{slug}
     */
    public function kawasanShow(string $slug)
    {
        $data = Kawasan::where('is_published', true)->where('slug', $slug)->firstOrFail();
        return response()->json(['data' => $data]);
    }

    // ──────────────────────────────────────────────
    // TSL (Tumbuhan & Satwa Liar)
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/tsl
     */
    public function tslIndex(Request $request)
    {
        $query = Tsl::where('is_published', true)
            ->select(['id', 'nama_lokal', 'nama_latin', 'slug', 'thumbnail_path', 'status_iucn', 'tipe']);

        if ($request->filled('tipe')) {
            $query->where('tipe', $request->tipe); // satwa atau tumbuhan
        }

        return response()->json(['data' => $query->orderBy('nama_lokal')->paginate(16)]);
    }

    /**
     * GET /api/cms/public/tsl/{slug}
     */
    public function tslShow(string $slug)
    {
        $data = Tsl::where('is_published', true)->where('slug', $slug)->firstOrFail();
        return response()->json(['data' => $data]);
    }

    // ──────────────────────────────────────────────
    // GALERI (Foto & Video)
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/photos
     */
    public function photoIndex(Request $request)
    {
        $query = Photo::where('is_published', true)
            ->select(['id', 'judul', 'deskripsi', 'file_path', 'album'])
            ->latest();

        if ($request->filled('album')) {
            $query->where('album', $request->album);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * GET /api/cms/public/videos
     */
    public function videoIndex()
    {
        $data = Video::where('is_published', true)
            ->select(['id', 'judul', 'deskripsi', 'youtube_url', 'thumbnail_path'])
            ->latest()
            ->paginate(12);

        return response()->json($data);
    }

    // ──────────────────────────────────────────────
    // PUBLIKASI & REGULASI
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/buku
     */
    public function bukuIndex()
    {
        $data = Buku::where('is_published', true)
            ->with('jenis:id,nama')
            ->select(['id', 'jenis_id', 'judul', 'slug', 'penulis', 'tahun_terbit', 'cover_path'])
            ->latest()
            ->paginate(12);

        return response()->json($data);
    }

    /**
     * GET /api/cms/public/leaflet
     */
    public function leafletIndex()
    {
        $data = Leaflet::where('is_published', true)
            ->select(['id', 'judul', 'slug', 'thumbnail_path'])
            ->latest()
            ->paginate(12);

        return response()->json($data);
    }

    /**
     * GET /api/cms/public/poster
     */
    public function posterIndex()
    {
        $data = Poster::where('is_published', true)
            ->select(['id', 'judul', 'slug', 'thumbnail_path'])
            ->latest()
            ->paginate(12);

        return response()->json($data);
    }

    /**
     * GET /api/cms/public/regulasi
     */
    public function regulasiIndex(Request $request)
    {
        $query = Regulasi::where('is_published', true)
            ->with('jenis:id,nama')
            ->select(['id', 'jenis_id', 'judul', 'slug', 'nomor', 'tahun', 'file_path']);

        if ($request->filled('tahun')) {
            $query->where('tahun', $request->tahun);
        }

        return response()->json($query->latest()->paginate(15));
    }

    // ──────────────────────────────────────────────
    // TAUTAN TERKAIT
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/links
     */
    public function linkIndex()
    {
        $data = Link::where('is_active', true)
            ->select(['id', 'judul', 'url', 'logo_path', 'urutan'])
            ->orderBy('urutan')
            ->get();

        return response()->json(['data' => $data]);
    }

    // ──────────────────────────────────────────────
    // KATEGORI (Untuk Filter Tab di Frontend)
    // ──────────────────────────────────────────────

    /**
     * GET /api/cms/public/categories
     */
    public function categoryIndex(Request $request)
    {
        $query = Category::select(['id', 'nama', 'slug', 'tipe'])->orderBy('urutan');

        if ($request->filled('tipe')) {
            $query->where('tipe', $request->tipe);
        }

        return response()->json(['data' => $query->get()]);
    }
}
```

---

## Troubleshooting

### Q: Endpoint `informasi/terbaru` bentrok dengan `informasi/{slug}` karena Laravel menganggap "terbaru" sebagai slug!

**Artinya:** Urutan pendaftaran rute sangat menentukan!
**Solusi:** Di dalam file `Routes/public.php` (Issue selanjutnya), pastikan rute `informasi/terbaru` didaftarkan **SEBELUM** rute `informasi/{slug}`. Laravel membaca rute dari atas ke bawah. Jika `{slug}` ditulis lebih dulu, ia akan menangkap kata "terbaru" sebagai nilai slug.
```php
// BENAR:
Route::get('/informasi/terbaru', [PublicController::class, 'informasiTerbaru']);
Route::get('/informasi/{slug}', [PublicController::class, 'informasiShow']);

// SALAH (terbaru dianggap slug):
Route::get('/informasi/{slug}', [PublicController::class, 'informasiShow']);
Route::get('/informasi/terbaru', [PublicController::class, 'informasiTerbaru']); // Tidak akan pernah dipanggil!
```

### Q: Data berita masih menampilkan konten Draft kepada publik!

**Artinya:** Kamu lupa memanggil `scopePublished` atau filter `is_published`.
**Solusi:** Setiap query publik WAJIB memiliki salah satu dari:
- `Informasi::published()->...` (menggunakan Scope dari Issue 092)
- `->where('is_published', true)` (filter manual)

Tanpa ini, API akan membocorkan konten rahasia yang belum disetujui pimpinan!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): engineer read-only public controller serving 10 content entities with publication filtering" \
  --body "Membangun Etalase Digital Website BKSDA. Melayani seluruh permintaan publik (Berita, Profil, Kawasan, TSL, Galeri, Publikasi, Regulasi) menggunakan query yang telah disaring \`is_published\` dan dibatasi \`select()\`. Detail di docs/issues/094-backend-cms-public-controller.md" \
  --label "backend,controller,public,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/094-backend-cms-public-controller
```

### Step 3: Kerjakan

Pahat `PublicController.php` di folder `Controllers/Public/`. Perhatikan bahwa seluruh metode hanya berupa `GET`. Tidak ada `POST/PUT/DELETE` di Controller ini!

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(cms): engineer read-only public controller serving 10 content entities with publication filtering (#94)"
git push -u origin issue/094-backend-cms-public-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): engineer read-only public controller serving 10 content entities with publication filtering (#94)" \
  --body "## Summary
Pembangunan Etalase Konten Digital Publik BKSDA — *Read-Only API Surface*.

## Changes
- Penciptaan 20+ metode \`GET\` publik yang melayani Berita, Profil, Kawasan, TSL, Galeri, Publikasi, Regulasi, Menu, Website Setting, dan Kepala Kantor.
- Penerapan perisai \`is_published\` di SETIAP query untuk mencegah kebocoran konten Draft.
- Penggunaan \`->select()\` secara eksplisit untuk menyembunyikan kolom sensitif.
- Implementasi penghitung kunjungan (\`views_count++\`) pada halaman detail Berita.

## Rules Compliance
- [x] Lolos Doktrin Kolom Terseleksi (Rule 3.4): Seluruh query List menggunakan \`->select()\` eksplisit.
- [x] Lolos Doktrin Paging (Rule 3.1): Seluruh endpoint daftar menggunakan \`paginate()\`.

Closes #94" \
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
Website BKSDA membutuhkan API publik untuk menampilkan Berita, Profil, Kawasan Konservasi, TSL (satwa/tumbuhan), Galeri, Publikasi, dan Regulasi. SEMUA endpoint harus READ-ONLY (GET) dan difilter `is_published = true`.

## Task

Kerjakan Issue #094 (Backend — CMS Public Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/094-backend-cms-public-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `backend/app/Modules/CMS/Controllers/Public/`.
3. Pahat `PublicController.php` sesuai cetak biru. Seluruh metode harus hanya `GET`.
4. Pastikan SETIAP query memiliki filter `is_published = true` atau `scopePublished`.
5. Pastikan SETIAP query list memiliki `->select([...])` eksplisit.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
