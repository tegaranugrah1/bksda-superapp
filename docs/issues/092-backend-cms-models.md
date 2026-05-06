# Issue #092 — Backend — CMS Models (19 Jaringan Otak Konten Website)

> **Type**: `feature`
> **Labels**: `backend`, `model`, `module-cms`
> **Priority**: 🔴 Critical (Menghubungkan 16 Tabel Menjadi Organisme Hidup)
> **Complexity**: 🟡 Medium (Kuantitas Tinggi, Pola Berulang)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #091

---

## Branch

```
issue/092-backend-cms-models
```

## Deskripsi

Pada Issue 091, kita telah menancapkan 16 tabel bertulang baja. Kini saatnya menghidupkan roh mereka menggunakan **19 Model Eloquent**.

Mengapa 19 Model untuk 16 tabel? Karena beberapa tabel memiliki "Wujud Ganda". Misalnya, tabel `cms_leaflet` menyimpan data Leaflet DAN Poster (dibedakan lewat kolom `tipe`). Kita bisa membuat 2 Model terpisah (`Leaflet` dan `Poster`) yang menunjuk ke tabel yang sama, masing-masing dengan *Scope* bawaan yang otomatis memfilter berdasarkan `tipe`. Ini adalah pola Arsitektur **Single Table Inheritance (STI)** yang sangat elegan!

**Kabar Baik untuk AI Pelanjut:**
Berbeda dengan Model DeReporting yang memiliki jaring relasi berlapis 8, mayoritas Model CMS hanya memiliki 1-2 relasi sederhana. Polanya sangat berulang, sehingga kamu hanya perlu memahami 1 contoh Model, lalu menyalinnya untuk sisanya.

**ATURAN MUTLAK (Project Rule 1.3 & 3.7)**:
1. Seluruh Model wajib `$fillable` (BUKAN `$guarded = []`).
2. Seluruh Model wajib `protected $table = 'cms_...'`.
3. Seluruh Model wajib `use HasUuids, SoftDeletes`.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/CMS/Models/`.
- [ ] Tersedia 19 Model yang memetakan seluruh 16 tabel CMS.
- [ ] Model `Informasi` memiliki relasi `belongsTo` ke `Category` dan `User`.
- [ ] Model `Poster` dan `Leaflet` menunjuk ke tabel yang sama (`cms_leaflet`) dengan *Global Scope* berbeda.
- [ ] Model `Menu` memiliki relasi rekursif (*Self-Referencing*): `parent()` dan `children()`.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Model CMS:
```bash
mkdir -p backend/app/Modules/CMS/Models
```

### 1. Cetak Biru Inti: Informasi.php (Berita)
**Path:** `backend/app/Modules/CMS/Models/Informasi.php`

Ini adalah Model terbesar dan paling kaya relasi di CMS:

```php
<?php

namespace App\Modules\CMS\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Informasi extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_informasi';

    protected $fillable = [
        'category_id',
        'user_id',
        'judul',
        'slug',
        'konten',
        'thumbnail_path',
        'sumber',
        'is_published',
        'published_at',
        'views_count',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'views_count'  => 'integer',
    ];

    /** Kategori Berita (Siaran Pers, Pengumuman, dll) */
    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /** Penulis / Admin yang membuat berita */
    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Scope: Hanya tampilkan yang sudah dipublikasikan */
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }
}
```

### 2. Cetak Biru Rekursif: Menu.php (Self-Referencing)
**Path:** `backend/app/Modules/CMS/Models/Menu.php`

Perhatikan relasi *Parent-Children* yang menunjuk ke dirinya sendiri!

```php
<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Menu extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_menus';

    protected $fillable = [
        'label',
        'url',
        'posisi',
        'parent_id',
        'urutan',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan'    => 'integer',
    ];

    /** Induk menu (jika ini adalah sub-menu) */
    public function parent()
    {
        return $this->belongsTo(Menu::class, 'parent_id');
    }

    /** Anak-anak menu (sub-menu di bawahnya) */
    public function children()
    {
        return $this->hasMany(Menu::class, 'parent_id')->orderBy('urutan');
    }
}
```

### 3. Cetak Biru STI: Poster.php & Leaflet.php (1 Tabel, 2 Model)
**Path:** `backend/app/Modules/CMS/Models/Leaflet.php`

```php
<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Leaflet extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_leaflet'; // Nama tabel fisik

    protected $fillable = [
        'judul', 'slug', 'deskripsi', 'file_path', 'thumbnail_path', 'tipe', 'is_published',
    ];

    protected $casts = ['is_published' => 'boolean'];

    /** Sihir: Otomatis filter hanya data bertipe 'leaflet' */
    protected static function booted(): void
    {
        static::addGlobalScope('leaflet', function ($query) {
            $query->where('tipe', 'leaflet');
        });
    }

    /** Otomatis set tipe saat membuat data baru */
    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            $model->tipe = 'leaflet';
        });
    }
}
```

**Path:** `backend/app/Modules/CMS/Models/Poster.php`

```php
<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Poster extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_leaflet'; // Tabel SAMA dengan Leaflet!

    protected $fillable = [
        'judul', 'slug', 'deskripsi', 'file_path', 'thumbnail_path', 'tipe', 'is_published',
    ];

    protected $casts = ['is_published' => 'boolean'];

    protected static function booted(): void
    {
        static::addGlobalScope('poster', function ($query) {
            $query->where('tipe', 'poster');
        });
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            $model->tipe = 'poster';
        });
    }
}
```

### 4. Tugas Replikasi untuk 15 Model Lainnya
Dengan memahami 3 pola di atas, AI Pelanjut harus merakit sisa Model berikut:

| # | Model | Tabel | Pola | Relasi Khusus |
|---|-------|-------|------|---------------|
| 1 | `Category` | `cms_categories` | Standar | `hasMany(Informasi)` |
| 2 | `Website` | `cms_website` | Standar (Singleton) | Tidak ada |
| 3 | `Kepala` | `cms_kepala` | Standar | Scope `scopeActive` |
| 4 | `Menu` | `cms_menus` | Rekursif ✅ | `parent()`, `children()` |
| 5 | `Informasi` | `cms_informasi` | Relasional ✅ | `category()`, `author()` |
| 6 | `Profil` | `cms_profil` | Standar | Tidak ada |
| 7 | `Kawasan` | `cms_kawasan` | Standar | Cast `latitude`/`longitude` → `float` |
| 8 | `Tsl` | `cms_tsl` | Standar | Scope `scopeSatwa`, `scopeTumbuhan` |
| 9 | `Photo` | `cms_photos` | Standar | Tidak ada |
| 10 | `Video` | `cms_videos` | Standar | Tidak ada |
| 11 | `Pesan` | `cms_pesan` | Standar | Scope `scopeUnread` |
| 12 | `Link` | `cms_links` | Standar | Tidak ada |
| 13 | `Jenis` | `cms_jenis` | Standar | `hasMany(Buku)`, `hasMany(Regulasi)` |
| 14 | `Buku` | `cms_buku` | Relasional | `belongsTo(Jenis)` |
| 15 | `Leaflet` | `cms_leaflet` | STI ✅ | Global Scope `tipe = leaflet` |
| 16 | `Poster` | `cms_leaflet` | STI ✅ | Global Scope `tipe = poster` |
| 17 | `Regulasi` | `cms_regulasi` | Relasional | `belongsTo(Jenis)` |

**Pola "Standar"** berarti: Salin kerangka `Informasi.php`, ganti nama tabel, ganti `$fillable`, buang relasi yang tidak diperlukan. Butuh waktu sekitar 2 menit per model.

---

## Troubleshooting

### Q: Model `Poster::all()` dan `Leaflet::all()` mengembalikan data yang sama!

**Artinya:** *Global Scope* belum terpasang dengan benar.
**Solusi:** Pastikan kamu menuliskan fungsi `booted()` (BUKAN `boot()`) untuk *Global Scope*. Keduanya berbeda:
- `booted()` → Dijalankan SETELAH model selesai di-boot. Tempat yang BENAR untuk *Global Scope*.
- `boot()` → Dijalankan SAAT proses boot. Tempat untuk *Event Hook* (`creating`, `updating`).

Jika masih bermasalah, cek apakah ada data di tabel `cms_leaflet` yang kolom `tipe`-nya masih `null`. Data tanpa `tipe` tidak akan muncul di kedua Model.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): construct 19 Eloquent models with STI pattern and recursive self-referencing" \
  --body "Menghidupkan 16 tabel CMS menjadi 19 Model Eloquent. Menerapkan pola *Single Table Inheritance* untuk tabel bersama (Leaflet/Poster) dan relasi rekursif (*Self-Referencing*) untuk hierarki Menu. Detail di docs/issues/092-backend-cms-models.md" \
  --label "backend,model,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/092-backend-cms-models
```

### Step 3: Kerjakan

Pahat Model inti (`Informasi`, `Menu`, `Leaflet`, `Poster`) terlebih dahulu untuk memahami ketiga pola. Barulah replikasi 15 Model sisa menggunakan Tabel Panduan di atas.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(cms): construct 19 Eloquent models with STI pattern and recursive self-referencing (#92)"
git push -u origin issue/092-backend-cms-models
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): construct 19 Eloquent models with STI pattern and recursive self-referencing (#92)" \
  --body "## Summary
Pembangkitan 19 Model Eloquent yang menghidupkan 16 tabel CMS.

## Changes
- 17 Model Standar/Relasional yang mengikuti pola deklaratif (\`\$fillable\`, \`\$casts\`, \`SoftDeletes\`).
- 2 Model STI (\`Leaflet\` & \`Poster\`) yang berbagi tabel fisik \`cms_leaflet\` menggunakan *Global Scope* untuk memisahkan data secara otomatis.
- 1 Model Rekursif (\`Menu\`) dengan relasi \`parent()\` dan \`children()\` untuk hierarki navigasi.
- Scope utilitas: \`scopePublished\`, \`scopeActive\`, \`scopeUnread\`, \`scopeSatwa\`, \`scopeTumbuhan\`.

## Rules Compliance
- [x] Lolos Doktrin Anti-Guarded (Rule 1.3): Seluruh 19 Model menggunakan \`\$fillable\` eksplisit.
- [x] Lolos Doktrin Isolasi Tabel (Rule 3.7): Seluruh Model menyatakan \`protected \$table = 'cms_...'\`.

Closes #92" \
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
16 tabel CMS sudah ada di Database. Sekarang kita butuh 19 Model Eloquent. Mayoritas sederhana (copy-paste pola), tapi ada 3 pola khusus: Relasional (Informasi), Rekursif (Menu), dan STI (Leaflet/Poster).

## Task

Kerjakan Issue #092 (Backend — CMS Models).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/092-backend-cms-models.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `backend/app/Modules/CMS/Models/`.
3. Pahat 4 Model Inti yang sudah tersedia cetak birunya: `Informasi.php`, `Menu.php`, `Leaflet.php`, `Poster.php`.
4. Gunakan Tabel Panduan "Tugas Replikasi" untuk merakit 15 Model sisa.
5. Untuk model "Standar" (tanpa relasi khusus), cukup salin kerangka `Informasi.php`, ganti `$table`, `$fillable`, dan hapus fungsi relasi yang tidak diperlukan.
6. Pastikan SETIAP model memiliki: `use HasUuids, SoftDeletes`, `protected $table`, dan `$fillable`.
7. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
