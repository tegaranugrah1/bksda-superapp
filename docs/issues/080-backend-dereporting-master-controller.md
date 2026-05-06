# Issue #080 — Backend — DeReporting MasterData Controller (Pengendali Data Sentral Dinamis)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `module-dereporting`
> **Priority**: 🔴 Critical (Pembuluh Nadi Data untuk Seluruh *Dropdown* Formulir)
> **Complexity**: 🔴 High (Rekayasa *Controller* Dinamis untuk 7 Tabel Berbeda)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #079

---

## Branch

```
issue/080-backend-dereporting-master-controller
```

## Deskripsi

Melompat ke **Issue #080** adalah **SANGAT AMAN!** Setelah Modul resmi tersambung ke jantung Laravel di Issue 079, kita membutuhkan *Controller* untuk melayani permintaan data.

**Permasalahan Utama:**
Di Modul DeReporting, kita memiliki 7 Tabel Master Data (Tahun, Bidang, Jenis, Kategori, JenisData, Koordinator, Anggaran). Jika menggunakan pola *Programer Junior*, kita akan membuat 7 *Controllers* yang isinya sama persis. Ini melanggar hukum *Clean Code* dan menghasilkan Ratusan Baris Kode Sampah *(Boilerplate)*.

**Solusi *Enterprise*:**
Kita akan mendirikan 1 (Satu) Pengendali Super bernama `MasterDataController`. *Controller* ini akan menggunakan taktik **Pemetaan Model Dinamis (Dynamic Model Mapping)**. Ketika *Frontend* menembak rute `/api/dereporting/master/bidang`, *Controller* ini akan mengubah kata "bidang" menjadi Model `Bidang::class` dan mengeksekusinya secara gaib!

**ATURAN MUTLAK (Project Rule 6.4 & 3.1)**:
1. Endpoint `GET` (Membaca/List) **Boleh Publik (Tanpa Token)** agar masyarakat luar bisa memuat *Dropdown* saat ingin melapor.
2. Endpoint `POST`, `PUT`, `DELETE` **WAJIB Terkunci Token (`auth:sanctum`)** dan hanya diizinkan untuk Admin (Aturan Akses akan diurus di Router Issue 084 nanti).
3. Seluruh List Endpoint **Wajib Pagination** (Paging), kecuali diminta khusus tanpa Paging oleh *Frontend*.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/DeReporting/Controllers/`.
- [ ] Tersedia `MasterDataController.php` dengan taktik *Dynamic Model Mapping* yang mampu melayani 7 jenis entitas Master Data secara simultan.
- [ ] Tersedia metode `index($type)`, `store(Request, $type)`, `update(Request, $type, $id)`, dan `destroy($type, $id)`.
- [ ] Metode `index` harus cerdas mendeteksi parameter `?paginate=false` (Atau menangani hierarki: "Tampilkan Jenis berdasarkan bidang_id").
- [ ] Menyertakan perisai `abort(404)` jika *Frontend* meminta tipe data yang tidak terdaftar.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Pengendali:
```bash
mkdir -p backend/app/Modules/DeReporting/Controllers
```

### Cetak Biru: Pengendali Master Cerdas (Dynamic MasterDataController)
**Path:** `backend/app/Modules/DeReporting/Controllers/MasterDataController.php`

Gunakan sihir *Pemetaan Dinamis* tingkat tinggi ini untuk menghancurkan kebutuhan penulisan ratusan baris kode berulang:

```php
<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

// Panggil seluruh 7 Jaringan Otak Eloquent
use App\Modules\DeReporting\Models\Anggaran;
use App\Modules\DeReporting\Models\Bidang;
use App\Modules\DeReporting\Models\Jenis;
use App\Modules\DeReporting\Models\JenisData;
use App\Modules\DeReporting\Models\Kategori;
use App\Modules\DeReporting\Models\Koordinator;
use App\Modules\DeReporting\Models\Tahun;

class MasterDataController extends Controller
{
    /**
     * Kunci Rahasia Pemetaan Tipe Permintaan ke Kelas Model.
     * Jika Frontend meminta 'bidang', Laravel akan memanggil Model Bidang::class.
     */
    private array $modelMap = [
        'tahun' => Tahun::class,
        'bidang' => Bidang::class,
        'jenis' => Jenis::class,
        'kategori' => Kategori::class,
        'jenis-data' => JenisData::class,
        'koordinator' => Koordinator::class,
        'anggaran' => Anggaran::class,
    ];

    /**
     * Resolver Mesin: Memvalidasi apakah tipe data yang diminta aman.
     */
    private function resolveModel(string $type)
    {
        if (!array_key_exists($type, $this->modelMap)) {
            abort(404, "Tipe Master Data '{$type}' tidak dikenali oleh sistem BKSDA.");
        }
        return $this->modelMap[$type];
    }

    /**
     * GET /api/dereporting/master/{type}
     * Membaca Daftar Master Data (Bersifat Publik untuk Dropdown Form Eksternal)
     */
    public function index(Request $request, string $type)
    {
        $modelClass = $this->resolveModel($type);
        $query = $modelClass::query();

        // [Sihir Hierarki]: Frontend sering butuh "Tampilkan Jenis HANYA untuk Bidang X"
        // Maka kita otomatis mendeteksi filter berdasarkan parent_id jika dikirimkan.
        if ($request->filled('bidang_id')) $query->where('bidang_id', $request->bidang_id);
        if ($request->filled('jenis_id')) $query->where('jenis_id', $request->jenis_id);
        if ($request->filled('kategori_id')) $query->where('kategori_id', $request->kategori_id);

        // Jika Frontend memaksa tanpa Paging (Untuk Dropdown <select>)
        if ($request->query('paginate') === 'false') {
            return response()->json([
                'data' => $query->latest()->get()
            ]);
        }

        // Output Default Wajib Paging sesuai Project Rule 3.1
        return response()->json($query->latest()->paginate(15));
    }

    /**
     * POST /api/dereporting/master/{type}
     * Menambah Master Data (Terkunci Auth & Admin)
     */
    public function store(Request $request, string $type)
    {
        $modelClass = $this->resolveModel($type);

        // Filter Sanitasi Ekstrem: Hanya membiarkan kolom yang ada di $fillable model masuk!
        $modelInstance = new $modelClass();
        $fillableAttributes = $request->only($modelInstance->getFillable());

        // Menyimpan Data
        $record = $modelClass::create($fillableAttributes);

        return response()->json([
            'message' => "Master Data {$type} berhasil diciptakan.",
            'data' => $record
        ], 201);
    }

    /**
     * PUT /api/dereporting/master/{type}/{id}
     * Mengubah Master Data (Terkunci Auth & Admin)
     */
    public function update(Request $request, string $type, string $id)
    {
        $modelClass = $this->resolveModel($type);
        $record = $modelClass::findOrFail($id);

        $fillableAttributes = $request->only($record->getFillable());
        $record->update($fillableAttributes);

        return response()->json([
            'message' => "Master Data {$type} berhasil dimutakhirkan.",
            'data' => $record
        ]);
    }

    /**
     * DELETE /api/dereporting/master/{type}/{id}
     * Menghapus Master Data (Terkunci Auth & Admin)
     */
    public function destroy(string $type, string $id)
    {
        $modelClass = $this->resolveModel($type);
        $record = $modelClass::findOrFail($id);

        try {
            $record->delete(); // Akan memicu SoftDeletes jika tersetting
            return response()->json([
                'message' => "Master Data {$type} telah diputihkan."
            ]);
        } catch (\Exception $e) {
            // Menangkap potensi Error Integrity Constraint (onDelete restrict dari Issue 077)
            return response()->json([
                'error' => 'Restriction Protocol',
                'message' => "Tidak dapat menghapus data {$type} ini karena masih terkait dengan laporan masyarakat."
            ], 422);
        }
    }
}
```

---

## Troubleshooting

### Q: Saya mengirim data `nama` ke `POST /master/bidang` tapi kok datanya kosong di Database?

**Artinya:** Kamu belum mendaftarkan `'nama'` di dalam array `$fillable` pada Model `Bidang.php` (Issue 078)!
**Solusi:** Berkat pertahanan baris `$request->only($modelInstance->getFillable())` di Controller ini, Laravel otomatis akan MEMBUANG semua input yang tidak ada di dalam `fillable`. Kembalilah ke Model `Bidang.php` mu, dan pastikan `$fillable = ['nama'];` sudah ditulis dengan benar! Inilah keajaiban pertahanan lapis baja sistem kita.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): engineer polymorphic MasterData controller with dynamic Eloquent resolution" \
  --body "Membangun Pengendali Induk tingkat tinggi. Memanfaatkan taktik *Polymorphic/Dynamic Model Resolution* untuk mengendalikan 7 Tabel Master sekaligus hanya dalam 1 berkas *Controller*. Meloloskan aturan baca terbuka *(Public Read)* dan mengunci modifikasi *(Protected Writes)*. Detail di docs/issues/080-backend-dereporting-master-controller.md" \
  --label "backend,controller,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/080-backend-dereporting-master-controller
```

### Step 3: Kerjakan

Pahat `MasterDataController.php` di dalam direktorinya. Pahami struktur cerdas `$modelMap` agar kamu tidak perlu lagi mengetik `if ($type === 'bidang') else if...` ratusan kali. Ini adalah salah satu teknik Pemrograman paling dihormati di kalangan Senior Laravel.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): engineer polymorphic MasterData controller with dynamic Eloquent resolution (#80)"
git push -u origin issue/080-backend-dereporting-master-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): engineer polymorphic MasterData controller with dynamic Eloquent resolution (#80)" \
  --body "## Summary
Pembangkitan Pusat Komando *(Controller)* bagi 7 Master Data penyangga seluruh modul laporan DeReporting BKSDA.

## Changes
- Pemusnahan potensi kode repetitif *(Boilerplate)* dengan teknik *Dynamic Model Resolving Array*. 7 *Controller* dilebur menjadi 1 Pengendali Induk.
- Penerapan pemfilteran cerdas otomatis berdasarkan atribut taksonomi relasional (mendeteksi \`bidang_id\`, \`jenis_id\`) secara dinamis di fungsi \`index()\`.
- Pemasangan tameng perlindungan \`Exception Catch\` khusus untuk mendeteksi penolakan *Database* akibat kaitan \`onDelete('restrict')\`.

## Rules Compliance
- [x] Lolos Doktrin Ekstraksi Lanjut: Pengendali menggunakan \`\$modelInstance->getFillable()\` sebagai lapis Filter Ketat lapis ketiga, memastikan Mass-Assignment Attack 100% mustahil menembus mesin pemroses data kita.

Closes #80" \
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
Jaringan Model telah ada, Modul telah hidup. Sekarang kita butuh pelayannya *(Controller)*. Karena ada 7 Master Data, kita TIDAK BOLEH membuang waktu membuat 7 *Controller* terpisah. Gunakan taktik *Pemetaan Dinamis* tingkat Lanjut!

## Task

Kerjakan Issue #080 (Backend — DeReporting MasterData Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/080-backend-dereporting-master-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buatlah folder Controller di dalam modul DeReporting.
3. Ciptakan kelas `MasterDataController.php`.
4. Ketik (atau *Copy*) secara identik Cetak Biru Pengendali Master tersebut. Perhatikan metode cerdas array `$modelMap` yang berfungsi layaknya penyihir pemanggil Model otomatis.
5. Perhatikan bagian tangkapan Error *Integrity Constraint* di fungsi `destroy()`. Ini disiapkan untuk menangkal masalah Hapus Paksa dari Issue 077.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
