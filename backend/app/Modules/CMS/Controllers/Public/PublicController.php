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
        $data = Kepala::active()->first();
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
