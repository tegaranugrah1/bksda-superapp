# Issue #066 — Backend — BMN Controllers (Resepsionis API Aset Negara)

> **Type**: `feature`
> **Labels**: `backend`, `controllers`, `module-bmn`
> **Priority**: 🔴 Critical (Penghubung HTTP antara Frontend dan Otak Logika)
> **Complexity**: 🟡 Medium (Injeksi Dependency Service dan Pemanggilan FormRequests)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #061, Issue #063, Issue #064, Issue #065

---

## Branch

```
issue/066-backend-bmn-controllers
```

## Deskripsi

Melompat langsung ke pengerjaan *Routes* (Issue 67) adalah **langkah bunuh diri (*Fatal Error*)**! Kenapa? Karena rute URL (misal: `GET /api/bmn/assets`) membutuhkan "seseorang" untuk menyapanya. Jika Kelas *Controller* belum dibuat, Laravel akan langsung meledak dengan pesan *"Target Class Controller does not exist"*.

Oleh sebab itu, di **Issue #066** ini kita harus membangun "Resepsionis" terlebih dahulu, yakni 3 *Controllers* utama:
1. `AssetController`
2. `LoanController`
3. `MaintenanceController`

*Controller* dalam arsitektur bersih (*Clean Architecture*) BKSDA ini didesain **Sangat Ramping (Fat Model, Skinny Controller)**. Mereka tidak boleh memikirkan logika hitung-hitungan sama sekali. Tugas mereka HANYA 3 hal:
1. Menyambut tamu (Menerima parameter HTTP Request).
2. Mengecek karcis (Memanggil *FormRequest* penjaga dari Issue 065).
3. Mengantar tamu ke ruang eksekusi (Memanggil fungsi dari `AssetService` / `LoanService`).
4. Memberi bingkisan pulang (Me- *return* respons wujud `json`).

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Bmn/Controllers`.
- [ ] Tersedia `AssetController.php` dengan fungsi `index`, `show`, `store`, `update`, dan `dispose`.
- [ ] Tersedia `LoanController.php` dengan fungsi `borrow` dan `return`.
- [ ] Tersedia `MaintenanceController.php` dengan fungsi `record`.
- [ ] Keseluruhan *Controller* menggunakan mekanisme injeksi (*Dependency Injection*) untuk memanggil *Service Layer*.

---

## Panduan Implementasi Cerdas

Buat markas resepsionis:
```bash
mkdir -p backend/app/Modules/Bmn/Controllers
```

Pahat ketiga kelas ini dengan saksama:

### 1. Resepsionis Induk (AssetController.php)
**Path:** `backend/app/Modules/Bmn/Controllers/AssetController.php`

```php
<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Services\AssetService;
use App\Modules\Bmn\Requests\StoreAssetRequest;
use App\Modules\Bmn\Requests\UpdateAssetRequest;
use App\Modules\Bmn\Requests\DisposeAssetRequest;
use Exception;

class AssetController extends Controller
{
    // Cerdas: Injeksi AssetService secara otomatis oleh Laravel Container
    public function __construct(private AssetService $assetService) {}

    /**
     * MENAMPILKAN SEMUA ASET BMN (READ)
     */
    public function index(Request $request)
    {
        // Gunakan 'with' agar relasi pegawai ditarik sekalian
        $query = Asset::with('penanggungJawab')->latest();

        // Fitur Pencarian Cepat
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama_barang', 'ilike', "%{$search}%")
                  ->orWhere('kode_barang', 'ilike', "%{$search}%")
                  ->orWhere('nup', 'ilike', "%{$search}%");
            });
        }

        // Semua List Wajib Pagination (RULE 3.1)
        return response()->json($query->paginate(20));
    }

    /**
     * MENCATAT ASET BMN BARU (CREATE)
     * Menggunakan FormRequest pelindung: StoreAssetRequest
     */
    public function store(StoreAssetRequest $request)
    {
        try {
            // Panggil Service Layer
            $asset = $this->assetService->storeAsset($request->validated());
            
            return response()->json([
                'message' => 'Aset BMN resmi tercatat di perbendaharaan negara.',
                'data' => $asset
            ], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * MENAMPILKAN DETAIL 1 ASET (READ)
     */
    public function show(string $id)
    {
        $asset = Asset::with(['penanggungJawab', 'loans.borrower', 'maintenances', 'historyUpdates.author'])
            ->findOrFail($id);

        return response()->json(['data' => $asset]);
    }

    /**
     * MEMPERBARUI DATA ASET BMN (UPDATE)
     */
    public function update(UpdateAssetRequest $request, string $id)
    {
        try {
            $asset = $this->assetService->updateAsset(
                $id, 
                $request->validated(), 
                $request->user()->id // Lempar ID Admin yang menekan tombol
            );
            
            return response()->json([
                'message' => 'Perubahan fisik/nilai aset berhasil direkam.',
                'data' => $asset
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    /**
     * PEMUTIHAN ASET (DISPOSE/SOFT-DELETE)
     */
    public function dispose(DisposeAssetRequest $request, string $id)
    {
        try {
            $this->assetService->disposeAsset(
                $id, 
                $request->user()->id, 
                $request->alasan_pemutihan
            );
            
            return response()->json([
                'message' => 'Aset berhasil diistirahatkan (Soft Deleted) dari operasional aktif.'
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
```

### 2. Resepsionis Peminjaman (LoanController.php)
**Path:** `backend/app/Modules/Bmn/Controllers/LoanController.php`

```php
<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Services\LoanService;
use App\Modules\Bmn\Requests\StoreAssetLoanRequest;
use Exception;

class LoanController extends Controller
{
    public function __construct(private LoanService $loanService) {}

    public function index(Request $request)
    {
        $query = AssetLoan::with(['asset', 'borrower'])->latest();
        return response()->json($query->paginate(20));
    }

    public function borrow(StoreAssetLoanRequest $request, string $assetId)
    {
        try {
            $loan = $this->loanService->borrowAsset(
                $assetId, 
                $request->employee_id, 
                $request->validated()
            );
            return response()->json(['message' => 'Aset berhasil diserahkan ke pegawai.', 'data' => $loan], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function return(Request $request, string $loanId)
    {
        try {
            $loan = $this->loanService->returnAsset($loanId, $request->all());
            return response()->json(['message' => 'Aset telah kembali masuk ke gudang BKSDA.', 'data' => $loan]);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
```

### 3. Resepsionis Pemeliharaan (MaintenanceController.php)
**Path:** `backend/app/Modules/Bmn/Controllers/MaintenanceController.php`

```php
<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Modules\Bmn\Models\AssetMaintenance;
use App\Modules\Bmn\Services\MaintenanceService;
use App\Modules\Bmn\Requests\StoreAssetMaintenanceRequest;
use Exception;

class MaintenanceController extends Controller
{
    public function __construct(private MaintenanceService $maintenanceService) {}

    public function index(Request $request)
    {
        $query = AssetMaintenance::with('asset')->latest();
        return response()->json($query->paginate(20));
    }

    public function record(StoreAssetMaintenanceRequest $request, string $assetId)
    {
        try {
            $maintenance = $this->maintenanceService->recordMaintenance(
                $assetId, 
                $request->validated()
            );
            return response()->json(['message' => 'Nota Servis/Pemeliharaan aset telah dicatat abadi.', 'data' => $maintenance], 201);
        } catch (Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
```

---

## Troubleshooting

### Q: Controller tidak bisa memanggil `AssetService`, padahal sudah ditulis `public function __construct(private AssetService $assetService) {}`

**Artinya:** Modul PHP kamu bermasalah dengan sintaks *Constructor Property Promotion* (Fitur PHP 8+).
**Solusi:** Proyek ini menggunakan Laravel 12 yang murni mewajibkan minimal PHP 8.2+. Oleh karena itu penulisan sintaks di atas adalah 100% legal dan mutlak paling bersertifikasi *Best Practice*. Jika menjumpai *Error* di sistem operasimu, pastikan *Environment Variables* PATH `php` mu bukan menunjuk ke versi kuno PHP 7.4.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): encapsulate network request handling via thin controllers utilizing dependency injection" \
  --body "Merakit resepsionis jembatan HTTP. Mempertahankan Controller dalam status 'kurus' (Skinny Controller) dengan mendelegasikan wewenang keamanan pada FormRequests dan otak matematika pada Service Layer. Murni bertugas menangkap Exception dan mengubahnya menjadi JSON terstandarisasi. Detail di docs/issues/066-backend-bmn-controllers.md" \
  --label "backend,controllers,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/066-backend-bmn-controllers
```

### Step 3: Kerjakan

Pahat ketiga Controller tersebut dan perhatikan keakuratan pengetikan *Namespace* agar `FormRequest` *(Issue 065)* dan `Service` *(Issue 063 & 064)* benar-benar terpanggil.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): encapsulate network request handling via thin controllers utilizing dependency injection (#66)"
git push -u origin issue/066-backend-bmn-controllers
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): encapsulate network request handling via thin controllers utilizing dependency injection (#66)" \
  --body "## Summary
Pendirian lapisan presentasi API (Controllers) Modul BMN untuk menerima instruksi luar.

## Changes
- Penciptaan wujud \`AssetController\`, \`LoanController\`, dan \`MaintenanceController\`.
- Penerapan pola Injeksi *(Dependency Injection)* untuk menyuntikkan *Service Layer* secara efisien ke dalam kerangka Controller tanpa intansiasi \`new\` manual.
- Pembungkusan *Error-Catching* level atas \`try...catch(Exception \$e)\` untuk menerjemahkan ledakan *Backend* menjadi sapaan kegagalan *JSON 400 Bad Request* berkelas yang dapat ditangkap oleh React Query di *Frontend*.

## Rules Compliance
- [x] Lolos Doktrin *Fat Model, Skinny Controller*: Tiada satu tetes pun percabangan \`if/else\` atau logika manipulasi Database yang mencemari area *Controller*. Seluruh Controller terbukti hanya berisikan pemanggilan Pihak Ketiga (Service/Request).

Closes #66" \
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
Modul BMN kini telah siap menjalin komunikasi dengan dunia luar (Browser Frontend). Untuk itu, kita perlu pelayan Restoran (Controller) yang akan mencatat pesanan JSON.

## Task

Kerjakan Issue #066 (Backend — BMN Controllers).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/066-backend-bmn-controllers.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah resepsionis di `backend/app/Modules/Bmn/Controllers`.
3. Pahat ketiga file Controller tersebut (`AssetController`, `LoanController`, `MaintenanceController`).
4. Pastikan blok `try...catch` dan respons JSON ditulis sesuai dengan aturan *Best Practice* di panduan agar *Frontend* menerima struktur balasan yang konsisten (Kode 200/201 untuk sukses, 400/422 untuk gagal).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
