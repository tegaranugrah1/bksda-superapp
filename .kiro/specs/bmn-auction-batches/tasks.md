# Implementation Plan: BMN Auction Batches (Proses Lelang BMN)

## Technical Target Score

Rencana implementasi ini dirancang agar **10/10 dipahami secara mandiri oleh AI model berkemampuan menengah ke bawah (low-cost models)** dengan petunjuk, kode blueprint, dan instruksi langkah demi langkah yang sangat eksplisit.

- Ukuran Task: **Sangat kecil dan spesifik (Micro-Tasks)**.
- Kejelasan Acceptance: **Ada kriteria sukses konkret di setiap task**.
- Petunjuk Implementasi: **Dilengkapi contoh query SQL, class namespace Laravel, props React, dan parameter API**.

---

## Low-Model Execution Rules

1. **Ikuti Urutan**: Kerjakan task secara linier dari Task 1 hingga selesai. Jangan melewati atau menggabungkan task tanpa persetujuan.
2. **Commit Bertahap**: Lakukan commit untuk setiap task (atau sekelompok kecil task terkait) dengan pesan commit deskriptif (misal: `feat(backend): create auction batches table migration`).
3. **Verifikasi Jalur Berkas**: Selalu gunakan path file absolut dari root project saat mengedit kode.
4. **Validasi Error**: Pastikan untuk tidak menelan exception/error. Gunakan logging Laravel dan visual error boundary pada React.
5. **No Placeholders**: Jangan menyisipkan komentar `// TODO` atau code placeholders di baris kode utama. Tuliskan logika lengkap.

---

## Milestones and Exit Criteria

### Milestone 1: Database Migrations & Models (Tasks 1-5)
- **Exit Criteria**: Tabel `bmn_auction_batches` (lengkap dengan kolom no persetujuan) dan `bmn_asset_auction_batch` terbuat di database PostgreSQL. Model Eloquent `AuctionBatch` dan relasi Many-to-Many di `Asset` berjalan dengan test SQL manual sukses.

### Milestone 2: Backend Core Logic & Services (Tasks 6-15)
- **Exit Criteria**: `AuctionBatchService` selesai dengan method lengkap untuk CRUD, reordering, update kertas kerja, pembekuan signatories, transisi status, pembekuan operasional aset, pengisian tanggal penghapusan, dan auto-disposal transaksional.

### Milestone 3: Backend Controllers & API Routes (Tasks 16-18)
- **Exit Criteria**: `AuctionBatchController` dan validasi Form Request selesai. Route API didaftarkan di `api.php`. HTTP requests untuk seluruh lifecycle lelang mengembalikan response valid.

### Milestone 4: Frontend API Layer & Dashboard UI (Tasks 19-21)
- **Exit Criteria**: API client Next.js terintegrasi. Halaman `/bmn/auction-batches` selesai menampilkan tabel batch dengan filter status, tombol "Buat Batch Baru", dan router redirect sukses.

### Milestone 5: Frontend Candidate & Asset Editor (Tasks 22-23)
- **Exit Criteria**: Panel seleksi kandidat rusak berat, drag-and-drop urutan aset, input lot, serta kalkulator Kertas Kerja tersinkronisasi database.

### Milestone 6: Signatories Freeze & Doc Numbers (Task 24)
- **Exit Criteria**: Formulir penandatangan terintegrasi dropdown dinamis, input nomor surat selesai, dan status batch berhasil dikunci ke `DIAJUKAN` disertai freeze operasional aset.

### Milestone 7: Integrated Printing Center (Task 25)
- **Exit Criteria**: Layout cetak A4 A4 portrait/landscape untuk 13 dokumen legal terwujud dengan data database riil dan aturan watermark DRAFT dinamis.

### Milestone 8: Realization Entry & Auto-Disposal Test (Tasks 26-30)
- **Exit Criteria**: Halaman pencatatan realisasi selesai. Finalisasi batch berhasil memicu update `tanggal_pengapusan` dan soft-delete aset terjual di database, serta mencatat log audit `bmn_asset_updates`. Aset tidak terjual dikembalikan ke status operasional aktif.

---

## Implementation Contracts

### 1. Backend Contract (Laravel 11)
- **Migrations Path**: Wajib diletakkan di `backend/app/Modules/Bmn/Migrations/`.
- **Namespaces**:
  - Models: `App\Modules\Bmn\Models`
  - Controllers: `App\Modules\Bmn\Controllers`
  - Services: `App\Modules\Bmn\Services`
  - Requests: `App\Modules\Bmn\Requests`
- **UUID Strategy**: Gunakan `use Illuminate\Database\Eloquent\Concerns\HasUuids;` di setiap model baru. Primary key bertipe UUID.
- **Strict Data Types**: Gunakan format `decimal:2` untuk nominal Rupiah (`nilai_taksiran`, `harga_terbentuk`).
- **Database Transactions**: Gunakan `DB::transaction()` untuk operasi penulisan berganda di DB, terutama saat transisi ke `REALISASI` dan `DIAJUKAN`.

### 2. Frontend Contract (Next.js / React)
- **Root Directory**: `frontend/src/app/bmn/auction-batches/`
- **UI Components**: Gunakan Tailwind CSS vanilla dan base component dari `@/components/ui/button`, `@/components/ui/dialog`, dll.
- **State Management**: Gunakan `@tanstack/react-query` untuk caching dan synchronization.
- **Number Formatter**: Gunakan helper format rupiah `formatRupiah` dari `frontend/src/app/bmn/auction-candidates/_lib/auction-helpers.ts` (atau setara).

---

## Step-by-Step Task Matrix

### Task 1: Migration `create_bmn_auction_batches_table`
- **Target Area**: `backend/app/Modules/Bmn/Migrations/[TIMESTAMP]_create_bmn_auction_batches_table.php`
- **Objective**: Membuat tabel utama penampung data batch lelang.
- **Implementation Details**:
  Tulis kode migrasi dengan struktur kolom berikut:
  ```php
  Schema::create('bmn_auction_batches', function (Blueprint $table) {
      $table->uuid('id')->primary();
      $table->string('batch_number', 50)->unique();
      $table->string('name', 255);
      $table->string('status', 30)->default('DRAFT');
      $table->string('no_surat_persetujuan', 100)->nullable();
      $table->date('tanggal_surat_persetujuan')->nullable();
      $table->string('no_surat_penetapan', 100)->nullable();
      $table->date('tanggal_lelang')->nullable();
      $table->uuid('kepala_balai_id')->nullable();
      $table->jsonb('metadata')->nullable();
      $table->timestamps();
      $table->softDeletes();
      
      $table->index('status');
  });
  ```
- **Acceptance Criteria**: Migrasi berhasil dieksekusi via `php artisan migrate` dan tabel terbuat di database dengan kolom persetujuan KPKNL/KSDAE.

---

### Task 2: Migration `create_bmn_asset_auction_batch_table`
- **Target Area**: `backend/app/Modules/Bmn/Migrations/[TIMESTAMP]_create_bmn_asset_auction_batch_table.php`
- **Objective**: Membuat tabel junction many-to-many antara batch lelang dan aset BMN.
- **Implementation Details**:
  Tulis kode migrasi dengan struktur kolom berikut:
  ```php
  Schema::create('bmn_asset_auction_batch', function (Blueprint $table) {
      $table->uuid('id')->primary();
      $table->uuid('bmn_auction_batch_id');
      $table->uuid('bmn_asset_id');
      $table->string('lot_number', 50)->nullable();
      $table->numeric('nilai_taksiran', 15, 2)->nullable();
      $table->numeric('harga_terbentuk', 15, 2)->nullable();
      $table->boolean('is_sold')->nullable();
      $table->jsonb('kertas_kerja_data')->nullable();
      $table->integer('sort_order')->default(0);
      $table->timestamps();

      $table->foreign('bmn_auction_batch_id')
            ->references('id')->on('bmn_auction_batches')
            ->onDelete('cascade');
            
      $table->foreign('bmn_asset_id')
            ->references('id')->on('bmn_assets')
            ->onDelete('restrict');

      $table->unique(['bmn_auction_batch_id', 'bmn_asset_id'], 'batch_asset_unique');
      $table->index('lot_number');
  });
  ```
- **Acceptance Criteria**: Migrasi berhasil dieksekusi via `php artisan migrate` dan tabel junction terbuat lengkap dengan foreign keys.

---

### Task 3: Eloquent Model `AuctionBatch`
- **Target Area**: `backend/app/Modules/Bmn/Models/AuctionBatch.php`
- **Objective**: Membuat model Eloquent untuk tabel `bmn_auction_batches`.
- **Implementation Details**:
  Tulis model lengkap dengan UUID, SoftDeletes, `$fillable`, dan cast data:
  ```php
  namespace App\Modules\Bmn\Models;

  use Illuminate\Database\Eloquent\Concerns\HasUuids;
  use Illuminate\Database\Eloquent\Model;
  use Illuminate\Database\Eloquent\SoftDeletes;

  class AuctionBatch extends Model
  {
      use HasUuids, SoftDeletes;

      protected $table = 'bmn_auction_batches';

      protected $fillable = [
          'id', 'batch_number', 'name', 'status', 'no_surat_persetujuan',
          'tanggal_surat_persetujuan', 'no_surat_penetapan', 
          'tanggal_lelang', 'kepala_balai_id', 'metadata'
      ];

      protected $casts = [
          'tanggal_surat_persetujuan' => 'date',
          'tanggal_lelang' => 'date',
          'metadata' => 'array'
      ];

      public function assets()
      {
          return $this->belongsToMany(Asset::class, 'bmn_asset_auction_batch', 'bmn_auction_batch_id', 'bmn_asset_id')
                      ->withPivot(['id', 'lot_number', 'nilai_taksiran', 'harga_terbentuk', 'is_sold', 'kertas_kerja_data', 'sort_order'])
                      ->withTimestamps()
                      ->orderBy('sort_order', 'asc');
      }
      
      public function junctionRows()
      {
          return $this->hasMany(AssetAuctionBatch::class, 'bmn_auction_batch_id');
      }
  }
  ```
- **Acceptance Criteria**: Model dapat di-import tanpa error dan relasi `assets` mengembalikan query builder yang valid.

---

### Task 4: Eloquent Model `AssetAuctionBatch`
- **Target Area**: `backend/app/Modules/Bmn/Models/AssetAuctionBatch.php`
- **Objective**: Membuat model Eloquent untuk tabel junction.
- **Implementation Details**:
  ```php
  namespace App\Modules\Bmn\Models;

  use Illuminate\Database\Eloquent\Concerns\HasUuids;
  use Illuminate\Database\Eloquent\Model;

  class AssetAuctionBatch extends Model
  {
      use HasUuids;

      protected $table = 'bmn_asset_auction_batch';

      protected $fillable = [
          'id', 'bmn_auction_batch_id', 'bmn_asset_id', 'lot_number',
          'nilai_taksiran', 'harga_terbentuk', 'is_sold', 'kertas_kerja_data', 'sort_order'
      ];

      protected $casts = [
          'nilai_taksiran' => 'decimal:2',
          'harga_terbentuk' => 'decimal:2',
          'is_sold' => 'boolean',
          'kertas_kerja_data' => 'array',
          'sort_order' => 'integer'
      ];

      public function batch()
      {
          return $this->belongsTo(AuctionBatch::class, 'bmn_auction_batch_id');
      }

      public function asset()
      {
          return $this->belongsTo(Asset::class, 'bmn_asset_id');
      }
  }
  ```
- **Acceptance Criteria**: Model junction berhasil dimuat dan relasi `asset` serta `batch` berfungsi.

---

### Task 5: Relasi Model `Asset` ke `AuctionBatch`
- **Target Area**: `backend/app/Modules/Bmn/Models/Asset.php`
- **Objective**: Menambahkan relasi many-to-many ke model `Asset`.
- **Implementation Details**:
  Buka file `Asset.php`, tambahkan method relasi berikut:
  ```php
  public function auctionBatches()
  {
      return $this->belongsToMany(AuctionBatch::class, 'bmn_asset_auction_batch', 'bmn_asset_id', 'bmn_auction_batch_id')
                  ->withPivot(['id', 'lot_number', 'nilai_taksiran', 'harga_terbentuk', 'is_sold', 'kertas_kerja_data', 'sort_order'])
                  ->withTimestamps();
  }
  ```
- **Acceptance Criteria**: Relasi `auctionBatches` dapat dipanggil dari instance model `Asset` tanpa error.

---

### Task 6: Request Validation `CreateAuctionBatchRequest`
- **Target Area**: `backend/app/Modules/Bmn/Requests/CreateAuctionBatchRequest.php`
- **Objective**: Memvalidasi pembuatan batch lelang baru.
- **Implementation Details**:
  ```php
  namespace App\Modules\Bmn\Requests;

  use Illuminate\Foundation\Http\FormRequest;

  class CreateAuctionBatchRequest extends FormRequest
  {
      public function authorize(): bool
      {
          return $this->user()->can('bmn.auction.create');
      }

      public function rules(): array
      {
          return [
              'name' => 'required|string|max:255',
          ];
      }
  }
  ```
- **Acceptance Criteria**: Validator menolak data kosong dan membatasi input sesuai rules.

---

### Task 7: Request Validation `UpdateValuationRequest`
- **Target Area**: `backend/app/Modules/Bmn/Requests/UpdateValuationRequest.php`
- **Objective**: Memvalidasi input Lot, Nilai Taksiran, dan Kertas Kerja per aset.
- **Implementation Details**:
  ```php
  namespace App\Modules\Bmn\Requests;

  use Illuminate\Foundation\Http\FormRequest;

  class UpdateValuationRequest extends FormRequest
  {
      public function authorize(): bool
      {
          return $this->user()->can('bmn.auction.update');
      }

      public function rules(): array
      {
          return [
              'lot_number' => 'nullable|string|max:50',
              'nilai_taksiran' => 'nullable|numeric|min:0',
              'kertas_kerja_data' => 'nullable|array',
              'kertas_kerja_data.nilai_perolehan' => 'nullable|numeric',
              'kertas_kerja_data.faktor_penyusutan' => 'nullable|numeric|min:0|max:100',
              'kertas_kerja_data.kondisi_persen' => 'nullable|numeric|min:0|max:100',
          ];
      }
  }
  ```
- **Acceptance Criteria**: Input validasi membatasi persentase penyusutan/kondisi di rentang 0-100.

---

### Task 8: Request Validation `TransitionStatusRequest`
- **Target Area**: `backend/app/Modules/Bmn/Requests/TransitionStatusRequest.php`
- **Objective**: Memvalidasi perubahan status batch lelang beserta surat persetujuan lelang.
- **Implementation Details**:
  ```php
  namespace App\Modules\Bmn\Requests;

  use Illuminate\Foundation\Http\FormRequest;

  class TransitionStatusRequest extends FormRequest
  {
      public function authorize(): bool
      {
          return true; // Pengecekan permission dilakukan dinamis di controller berdasarkan target status
      }

      public function rules(): array
      {
          return [
              'status' => 'required|string|in:DIAJUKAN,JADWAL_DITETAPKAN,BATAL',
              'kepala_balai_id' => 'required_if:status,DIAJUKAN|nullable|uuid',
              'document_numbers' => 'required_if:status,DIAJUKAN|nullable|array',
              'no_surat_persetujuan' => 'required_if:status,JADWAL_DITETAPKAN|nullable|string|max:100',
              'tanggal_surat_persetujuan' => 'required_if:status,JADWAL_DITETAPKAN|nullable|date',
              'no_surat_penetapan' => 'required_if:status,JADWAL_DITETAPKAN|nullable|string|max:100',
              'tanggal_lelang' => 'required_if:status,JADWAL_DITETAPKAN|nullable|date',
          ];
      }
  }
  ```
- **Acceptance Criteria**: Memberikan error validasi yang jelas jika parameter wajib untuk target status tertentu kosong (termasuk nomor & tanggal surat persetujuan).

---

### Task 9: Request Validation `RealizeAuctionRequest`
- **Target Area**: `backend/app/Modules/Bmn/Requests/RealizeAuctionRequest.php`
- **Objective**: Memvalidasi data hasil lelang dan harga terbentuk.
- **Implementation Details**:
  ```php
  namespace App\Modules\Bmn\Requests;

  use Illuminate\Foundation\Http\FormRequest;

  class RealizeAuctionRequest extends FormRequest
  {
      public function authorize(): bool
      {
          return $this->user()->can('bmn.auction.finalize');
      }

      public function rules(): array
      {
          return [
              'assets' => 'required|array|min:1',
              'assets.*.bmn_asset_id' => 'required|uuid|exists:bmn_assets,id',
              'assets.*.is_sold' => 'required|boolean',
              'assets.*.harga_terbentuk' => 'required_if:assets.*.is_sold,true|nullable|numeric|min:0',
          ];
      }
  }
  ```
- **Acceptance Criteria**: Menolak data jika `is_sold` bernilai true namun `harga_terbentuk` kosong. Parameter secara konsisten menggunakan nama `harga_terbentuk`.

---

### Task 10: `AuctionBatchService` Foundation & Create Method
- **Target Area**: `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
- **Objective**: Membuat pondasi class service dan implementasi pembuatan batch baru.
- **Implementation Details**:
  Tulis boilerplate service dan method `createBatch` dengan auto-generation `batch_number`:
  ```php
  namespace App\Modules\Bmn\Services;

  use App\Modules\Bmn\Models\AuctionBatch;
  use App\Modules\Bmn\Models\AssetAuctionBatch;
  use App\Modules\Bmn\Models\Asset;
  use App\Modules\Bmn\Models\AssetUpdate;
  use Illuminate\Support\Str;
  use Carbon\Carbon;
  use DB;

  class AuctionBatchService
  {
      public function createBatch(array $data)
      {
          $now = Carbon::now();
          $datePart = $now->format('Ymd');
          $random = str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
          
          $data['batch_number'] = "LE-{$datePart}-{$random}";
          $data['status'] = 'DRAFT';

          return AuctionBatch::create($data);
      }
  }
  ```
- **Acceptance Criteria**: Pemanggilan `createBatch(['name' => 'Test'])` menghasilkan entitas dengan status `DRAFT` dan format nomor batch yang sesuai.

---

### Task 11: `AuctionBatchService` Add & Remove Assets
- **Target Area**: `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
- **Objective**: Menambahkan method `addAssets` dan `removeAsset` di service.
- **Implementation Details**:
  Tambahkan method berikut:
  ```php
  public function addAssets(string $batchId, array $assetIds)
  {
      return DB::transaction(function () use ($batchId, $assetIds) {
          $batch = AuctionBatch::findOrFail($batchId);
          if ($batch->status !== 'DRAFT') {
              throw new \Exception("Aset hanya dapat ditambahkan pada status DRAFT.");
          }

          foreach ($assetIds as $assetId) {
              // Cek apakah aset sudah terikat dengan batch aktif lainnya
              $isLinked = AssetAuctionBatch::where('bmn_asset_id', $assetId)
                  ->whereHas('batch', function ($query) {
                      $query->whereIn('status', ['DRAFT', 'DIAJUKAN', 'JADWAL_DITETAPKAN']);
                  })->exists();

              if ($isLinked) {
                  throw new \Exception("Aset dengan ID {$assetId} sudah terikat pada batch lelang aktif lain.");
              }

              // Cari sort_order terbesar
              $maxSort = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->max('sort_order') ?? 0;

              AssetAuctionBatch::firstOrCreate([
                  'bmn_auction_batch_id' => $batchId,
                  'bmn_asset_id' => $assetId,
              ], [
                  'sort_order' => $maxSort + 1
              ]);
          }

          return $batch->load('assets');
      });
  }

  public function removeAsset(string $batchId, string $assetId)
  {
      $batch = AuctionBatch::findOrFail($batchId);
      if ($batch->status !== 'DRAFT') {
          throw new \Exception("Aset hanya dapat dihapus dari batch pada status DRAFT.");
      }

      AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
          ->where('bmn_asset_id', $assetId)
          ->delete();

      return $batch->load('assets');
  }
  ```
- **Acceptance Criteria**: Aset berhasil diasosiasikan atau dihapus, dan validasi status berjalan dengan melempar Exception jika status bukan DRAFT.

---

### Task 12: `AuctionBatchService` Update Order & Valuation
- **Target Area**: `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
- **Objective**: Menambahkan fungsi penyusunan urutan drag-and-drop dan update data kertas kerja.
- **Implementation Details**:
  Tambahkan method berikut:
  ```php
  public function updateSortOrder(string $batchId, array $orderedIds)
  {
      return DB::transaction(function () use ($batchId, $orderedIds) {
          $batch = AuctionBatch::findOrFail($batchId);
          if ($batch->status !== 'DRAFT') {
              throw new \Exception("Urutan hanya dapat diubah pada status DRAFT.");
          }

          foreach ($orderedIds as $index => $assetId) {
              AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                  ->where('bmn_asset_id', $assetId)
                  ->update(['sort_order' => $index]);
          }

          return true;
      });
  }

  public function updateValuation(string $batchId, string $assetId, array $data)
  {
      $batch = AuctionBatch::findOrFail($batchId);
      if ($batch->status !== 'DRAFT') {
          throw new \Exception("Valuasi hanya dapat diubah pada status DRAFT.");
      }

      $junction = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
          ->where('bmn_asset_id', $assetId)
          ->firstOrFail();

      $junction->update([
          'lot_number' => $data['lot_number'] ?? $junction->lot_number,
          'nilai_taksiran' => $data['nilai_taksiran'] ?? $junction->nilai_taksiran,
          'kertas_kerja_data' => $data['kertas_kerja_data'] ?? $junction->kertas_kerja_data,
      ]);

      return $junction;
  }
  ```
- **Acceptance Criteria**: Urutan `sort_order` berubah teratur berdasar indeks array, lot & taksiran terupdate di junction table.

---

### Task 13: `AuctionBatchService` Transition DRAFT to DIAJUKAN (Signatory Freeze & Asset freeze)
- **Target Area**: `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
- **Objective**: Mengunci draf, membekukan signatories/no dokumen, dan membekukan status penggunaan operasional aset di database.
- **Implementation Details**:
  ```php
  // Butuh import model Employee di bagian atas file:
  // use App\Modules\Kepegawaian\Models\Employee;

  public function transitionToDiajukan(string $batchId, string $kepalaBalaiId, array $documentNumbers)
  {
      return DB::transaction(function () use ($batchId, $kepalaBalaiId, $documentNumbers) {
          $batch = AuctionBatch::findOrFail($batchId);
          if ($batch->status !== 'DRAFT') {
              throw new \Exception("Hanya batch berstatus DRAFT yang dapat diajukan.");
          }

          // Validasi kelengkapan lot dan taksiran
          $junctions = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();
          if ($junctions->isEmpty()) {
              throw new \Exception("Batch lelang harus memiliki minimal 1 aset sebelum diajukan.");
          }

          foreach ($junctions as $j) {
              if (empty($j->lot_number)) {
                  throw new \Exception("Semua aset wajib memiliki Lot Number sebelum diajukan.");
              }
              if (is_null($j->nilai_taksiran) || $j->nilai_taksiran <= 0) {
                  throw new \Exception("Semua aset wajib memiliki Nilai Taksiran (> 0) sebelum diajukan.");
              }
          }

          // Cari data Kepala Balai
          $kepalaBalai = Employee::findOrFail($kepalaBalaiId);

          // Susun metadata snapshot penandatangan & no dokumen
          $metadata = [
              'signatories' => [
                  'kepala_balai' => [
                      'id' => $kepalaBalai->id,
                      'nama' => $kepalaBalai->nama,
                      'nip' => $kepalaBalai->nip,
                      'golongan' => $kepalaBalai->golongan_pangkat ?? '-',
                      'jabatan' => $kepalaBalai->jabatan ?? 'Kepala Balai'
                  ]
              ],
              'document_numbers' => $documentNumbers
          ];

          $batch->update([
              'status' => 'DIAJUKAN',
              'kepala_balai_id' => $kepalaBalaiId,
              'metadata' => $metadata
          ]);

          // Membekukan operasional aset terkait lelang
          foreach ($junctions as $j) {
              $asset = Asset::findOrFail($j->bmn_asset_id);
              $asset->update([
                  'henti_guna' => true,
                  'status_penggunaan' => 'Dihentikan dari Penggunaan Dinas'
              ]);
          }

          return $batch;
      });
  }
  ```
- **Acceptance Criteria**: Transisi status berhasil, detail Kepala Balai tersimpan di metadata JSON, dan seluruh aset terkait di database berubah status operasionalnya menjadi dihentikan (`henti_guna = true`).

---

### Task 14: `AuctionBatchService` Scheduling & Cancellation Methods (Asset Unfreeze Rollback)
- **Target Area**: `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
- **Objective**: Mengubah status batch menjadi JADWAL_DITETAPKAN atau membatalkan batch lelang (mengembalikan status operasional aset).
- **Implementation Details**:
  ```php
  public function transitionToScheduled(string $batchId, string $noPersetujuan, string $tglPersetujuan, string $noPenetapan, string $tglLelang)
  {
      $batch = AuctionBatch::findOrFail($batchId);
      if ($batch->status !== 'DIAJUKAN') {
          throw new \Exception("Jadwal lelang hanya dapat ditetapkan untuk batch berstatus DIAJUKAN.");
      }

      $batch->update([
          'status' => 'JADWAL_DITETAPKAN',
          'no_surat_persetujuan' => $noPersetujuan,
          'tanggal_surat_persetujuan' => $tglPersetujuan,
          'no_surat_penetapan' => $noPenetapan,
          'tanggal_lelang' => $tglLelang
      ]);

      return $batch;
  }

  public function cancelBatch(string $batchId)
  {
      return DB::transaction(function () use ($batchId) {
          $batch = AuctionBatch::findOrFail($batchId);
          if (in_array($batch->status, ['REALISASI', 'BATAL'])) {
              throw new \Exception("Batch lelang dengan status {$batch->status} tidak dapat dibatalkan.");
          }

          $batch->update(['status' => 'BATAL']);

          // Rollback pembekuan operasional aset di tabel assets
          $junctions = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();
          foreach ($junctions as $j) {
              $asset = Asset::findOrFail($j->bmn_asset_id);
              $asset->update([
                  'henti_guna' => false,
                  'status_penggunaan' => 'Aktif' // default semula
              ]);
          }

          return $batch;
      });
  }
  ```
- **Acceptance Criteria**: Transisi JADWAL_DITETAPKAN menyimpan nomor persetujuan & jadwal. Pembatalan batch mengembalikan status `henti_guna` menjadi false di database.

---

### Task 15: `AuctionBatchService` Realization (Atomic Auto-Disposal & Deletion Date Sync)
- **Target Area**: `backend/app/Modules/Bmn/Services/AuctionBatchService.php`
- **Objective**: Menyimpan data realisasi, mengisi tanggal penghapusan resmi aset terjual, dan memicu auto-disposal secara aman.
- **Implementation Details**:
  ```php
  // Butuh import di bagian atas file:
  // use App\Modules\Bmn\Services\AssetService;

  protected $assetService;

  public function __construct(AssetService $assetService)
  {
      $this->assetService = $assetService;
  }

  public function realizeBatch(string $batchId, array $results, string $userId)
  {
      return DB::transaction(function () use ($batchId, $results, $userId) {
          $batch = AuctionBatch::findOrFail($batchId);
          if ($batch->status !== 'JADWAL_DITETAPKAN') {
              throw new \Exception("Realisasi hasil lelang hanya dapat diproses pada status JADWAL_DITETAPKAN.");
          }

          foreach ($results as $item) {
              $assetId = $item['bmn_asset_id'];
              $isSold = $item['is_sold'];
              $hargaTerbentuk = $isSold ? $item['harga_terbentuk'] : 0;

              $junction = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                  ->where('bmn_asset_id', $assetId)
                  ->firstOrFail();

              $junction->update([
                  'is_sold' => $isSold,
                  'harga_terbentuk' => $hargaTerbentuk
              ]);

              $asset = Asset::findOrFail($assetId);

              if ($isSold) {
                  // Kepatuhan DJKN: Update tanggal penghapusan sebelum di-soft delete
                  $asset->update([
                      'tanggal_pengapusan' => $batch->tanggal_lelang
                  ]);

                  // Pemicu Auto-Disposal via AssetService
                  $alasan = "Lelang Terjual - Batch {$batch->batch_number} (Surat Persetujuan: {$batch->no_surat_persetujuan}, Surat Penetapan KPKNL: {$batch->no_surat_penetapan} tgl {$batch->tanggal_lelang->format('d-m-Y')})";
                  $this->assetService->disposeAsset($assetId, $userId, $alasan);
              } else {
                  // Aset tidak terjual dikembalikan ke status operasional aktif
                  $asset->update([
                      'henti_guna' => false,
                      'status_penggunaan' => 'Aktif'
                  ]);
              }
          }

          $batch->update(['status' => 'REALISASI']);

          return $batch->load('assets');
      });
  }
  ```
- **Acceptance Criteria**: Ketika batch direalisasikan, aset terjual memiliki kolom `tanggal_pengapusan` bernilai `tanggal_lelang`, lalu sukses ter-soft delete. Aset tidak terjual kembali aktif (tidak lagi `henti_guna`).

---

### Task 16: `AuctionBatchController` Scaffold & CRUD Endpoints
- **Target Area**: `backend/app/Modules/Bmn/Controllers/AuctionBatchController.php`
- **Objective**: Membuat controller RESTful API untuk modul batch lelang.
- **Implementation Details**:
  Implementasikan method `index`, `store`, `show`, dan `destroy`:
  ```php
  namespace App\Modules\Bmn\Controllers;

  use App\Http\Controllers\Controller;
  use App\Modules\Bmn\Services\AuctionBatchService;
  use App\Modules\Bmn\Models\AuctionBatch;
  use App\Modules\Bmn\Requests\CreateAuctionBatchRequest;
  use Illuminate\Http\Request;
  use Illuminate\Http\JsonResponse;

  class AuctionBatchController extends Controller
  {
      protected $batchService;

      public function __construct(AuctionBatchService $batchService)
      {
          $this->batchService = $batchService;
      }

      public function index(Request $request): JsonResponse
      {
          $query = AuctionBatch::query()->withCount('assets');

          if ($request->filled('status')) {
              $query->where('status', $request->status);
          }

          if ($request->filled('search')) {
              $query->where(function ($q) use ($request) {
                  $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('batch_number', 'like', "%{$request->search}%");
              });
          }

          $batches = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

          return response()->json($batches);
      }

      public function store(CreateAuctionBatchRequest $request): JsonResponse
      {
          $batch = $this->batchService->createBatch($request->validated());
          return response()->json(['message' => 'Batch lelang berhasil dibuat.', 'data' => $batch], 210);
      }

      public function show(string $id): JsonResponse
      {
          $batch = AuctionBatch::with(['assets' => function ($q) {
              $q->orderBy('sort_order', 'asc');
          }])->findOrFail($id);
          
          return response()->json($batch);
      }

      public function destroy(string $id): JsonResponse
      {
          $batch = AuctionBatch::findOrFail($id);
          if ($batch->status !== 'DRAFT') {
              return response()->json(['message' => 'Hanya batch berstatus DRAFT yang dapat dihapus.'], 422);
          }
          
          $batch->delete();
          return response()->json(['message' => 'Batch lelang berhasil dihapus.']);
      }
  }
  ```
- **Acceptance Criteria**: Endpoints merespon request GET/POST/DELETE secara terstandarisasi. Kode status 210 untuk sukses create.

---

### Task 17: `AuctionBatchController` Custom Lifecycle Actions
- **Target Area**: `backend/app/Modules/Bmn/Controllers/AuctionBatchController.php`
- **Objective**: Menyambungkan endpoint API kustom ke method relasi, urutan order, dan transisi status.
- **Implementation Details**:
  Tambahkan method berikut di Controller:
  ```php
  use App\Modules\Bmn\Requests\UpdateValuationRequest;
  use App\Modules\Bmn\Requests\TransitionStatusRequest;
  use App\Modules\Bmn\Requests\RealizeAuctionRequest;

  public function addAssets(Request $request, string $id): JsonResponse
  {
      $request->validate(['asset_ids' => 'required|array|min:1']);
      try {
          $batch = $this->batchService->addAssets($id, $request->asset_ids);
          return response()->json(['message' => 'Aset berhasil ditambahkan.', 'data' => $batch]);
      } catch (\Exception $e) {
          return response()->json(['message' => $e->getMessage()], 422);
      }
  }

  public function removeAsset(string $id, string $assetId): JsonResponse
  {
      try {
          $batch = $this->batchService->removeAsset($id, $assetId);
          return response()->json(['message' => 'Aset berhasil dihapus dari batch.', 'data' => $batch]);
      } catch (\Exception $e) {
          return response()->json(['message' => $e->getMessage()], 422);
      }
  }

  public function updateOrder(Request $request, string $id): JsonResponse
  {
      $request->validate(['ordered_ids' => 'required|array']);
      try {
          $this->batchService->updateSortOrder($id, $request->ordered_ids);
          return response()->json(['message' => 'Urutan aset berhasil diperbarui.']);
      } catch (\Exception $e) {
          return response()->json(['message' => $e->getMessage()], 422);
      }
  }

  public function updateValuation(UpdateValuationRequest $request, string $id, string $assetId): JsonResponse
  {
      try {
          $junction = $this->batchService->updateValuation($id, $assetId, $request->validated());
          return response()->json(['message' => 'Valuasi aset berhasil diperbarui.', 'data' => $junction]);
      } catch (\Exception $e) {
          return response()->json(['message' => $e->getMessage()], 422);
      }
  }

  public function transition(TransitionStatusRequest $request, string $id): JsonResponse
  {
      try {
          $status = $request->status;
          if ($status === 'DIAJUKAN') {
              $batch = $this->batchService->transitionToDiajukan($id, $request->kepala_balai_id, $request->document_numbers);
          } elseif ($status === 'JADWAL_DITETAPKAN') {
              $batch = $this->batchService->transitionToScheduled(
                  $id, 
                  $request->no_surat_persetujuan, 
                  $request->tanggal_surat_persetujuan, 
                  $request->no_surat_penetapan, 
                  $request->tanggal_lelang
              );
          } elseif ($status === 'BATAL') {
              $batch = $this->batchService->cancelBatch($id);
          } else {
              return response()->json(['message' => 'Status tidak valid.'], 422);
          }

          return response()->json(['message' => "Status batch berhasil diubah menjadi {$status}.", 'data' => $batch]);
      } catch (\Exception $e) {
          return response()->json(['message' => $e->getMessage()], 422);
      }
  }

  public function realize(RealizeAuctionRequest $request, string $id): JsonResponse
  {
      try {
          $batch = $this->batchService->realizeBatch($id, $request->assets, auth()->id());
          return response()->json(['message' => 'Realisasi lelang berhasil disimpan.', 'data' => $batch]);
      } catch (\Exception $e) {
          return response()->json(['message' => $e->getMessage()], 422);
      }
  }
  ```
- **Acceptance Criteria**: Semua request mengembalikan response JSON yang rapi dengan validasi yang berjalan.

---

### Task 18: Register API Routes
- **Target Area**: `backend/app/Modules/Bmn/Routes/api.php`
- **Objective**: Mendaftarkan endpoints untuk controller batch lelang.
- **Implementation Details**:
  Buka file `api.php`, tambahkan rute-rute berikut:
  ```php
  use App\Modules\Bmn\Controllers\AuctionBatchController;

  // Jalur BMN Auction Batches
  Route::prefix('auction-batches')->group(function () {
      Route::get('/', [AuctionBatchController::class, 'index'])->middleware('permission:bmn.auction.view');
      Route::post('/', [AuctionBatchController::class, 'store'])->middleware('permission:bmn.auction.create');
      Route::get('/{id}', [AuctionBatchController::class, 'show'])->middleware('permission:bmn.auction.view');
      Route::delete('/{id}', [AuctionBatchController::class, 'destroy'])->middleware('permission:bmn.auction.delete');

      Route::post('/{id}/assets', [AuctionBatchController::class, 'addAssets'])->middleware('permission:bmn.auction.update');
      Route::delete('/{id}/assets/{assetId}', [AuctionBatchController::class, 'removeAsset'])->middleware('permission:bmn.auction.update');
      Route::put('/{id}/assets/order', [AuctionBatchController::class, 'updateOrder'])->middleware('permission:bmn.auction.update');
      Route::put('/{id}/assets/{assetId}/valuation', [AuctionBatchController::class, 'updateValuation'])->middleware('permission:bmn.auction.update');
      Route::post('/{id}/transition', [AuctionBatchController::class, 'transition']);
      Route::post('/{id}/realize', [AuctionBatchController::class, 'realize'])->middleware('permission:bmn.auction.finalize');
  });
  ```
- **Acceptance Criteria**: Jalur `/api/bmn/auction-batches` merespon request dengan middleware auth Sanctum.

---

### Task 19: Frontend API Client Layer
- **Target Area**: `frontend/src/lib/api/bmn-auction.ts`
- **Objective**: Membuat module pemanggil API frontend untuk berinteraksi dengan backend lelang.
- **Implementation Details**:
  ```typescript
  import { api } from "@/lib/api";

  export interface AuctionBatch {
    id: string;
    batch_number: string;
    name: string;
    status: 'DRAFT' | 'DIAJUKAN' | 'JADWAL_DITETAPKAN' | 'REALISASI' | 'BATAL';
    no_surat_persetujuan: string | null;
    tanggal_surat_persetujuan: string | null;
    no_surat_penetapan: string | null;
    tanggal_lelang: string | null;
    kepala_balai_id: string | null;
    metadata: any | null;
    created_at: string;
    updated_at: string;
    assets?: any[];
  }

  export const bmnAuctionApi = {
    getBatches: (params: { search?: string; status?: string; page?: number; per_page?: number }) =>
      api.get("/bmn/auction-batches", { params }).then((res) => res.data),
      
    createBatch: (name: string) =>
      api.post("/bmn/auction-batches", { name }).then((res) => res.data),

    getBatchDetail: (id: string) =>
      api.get(`/bmn/auction-batches/${id}`).then((res) => res.data),

    deleteBatch: (id: string) =>
      api.delete(`/bmn/auction-batches/${id}`).then((res) => res.data),

    addAssetsToBatch: (id: string, assetIds: string[]) =>
      api.post(`/bmn/auction-batches/${id}/assets`, { asset_ids: assetIds }).then((res) => res.data),

    removeAssetFromBatch: (id: string, assetId: string) =>
      api.delete(`/bmn/auction-batches/${id}/assets/${assetId}`).then((res) => res.data),

    updateSortOrder: (id: string, orderedIds: string[]) =>
      api.put(`/bmn/auction-batches/${id}/assets/order`, { ordered_ids: orderedIds }).then((res) => res.data),

    updateValuation: (id: string, assetId: string, payload: any) =>
      api.put(`/bmn/auction-batches/${id}/assets/${assetId}/valuation`, payload).then((res) => res.data),

    transitionStatus: (id: string, payload: { status: string; kepala_balai_id?: string; document_numbers?: any; no_surat_persetujuan?: string; tanggal_surat_persetujuan?: string; no_surat_penetapan?: string; tanggal_lelang?: string }) =>
      api.post(`/bmn/auction-batches/${id}/transition`, payload).then((res) => res.data),

    realizeBatch: (id: string, assets: { bmn_asset_id: string; is_sold: boolean; harga_terbentuk: number }[]) =>
      api.post(`/bmn/auction-batches/${id}/realize`, { assets }).then((res) => res.data),
  };
  ```
- **Acceptance Criteria**: Modul di-import sukses dan menyajikan method yang memetakan endpoints Laravel secara presisi.

---

### Task 20: Sidebar Route & Navigation Link
- **Target Area**: `frontend/src/components/layouts/Sidebar.tsx` (atau file penampung navigasi sidebar BMN)
- **Objective**: Menambahkan menu baru "Batch Lelang BMN".
- **Implementation Details**:
  Temukan daftar menu BMN, tambahkan link navigasi ke `/bmn/auction-batches` di bawah menu `/bmn/auction-candidates`. Pastikan menggunakan icon yang relevan (seperti `Layers` atau `Gavel`) dari Lucide Icons.
- **Acceptance Criteria**: Menu "Batch Lelang" tampil di sidebar di bawah kategori BMN untuk user yang memiliki hak akses.

---

### Task 21: Batch List Dashboard UI
- **Target Area**: `frontend/src/app/bmn/auction-batches/page.tsx`
- **Objective**: Membuat halaman beranda daftar batch lelang.
- **Implementation Details**:
  Gunakan layout modern, lengkapi dengan:
  - Header dengan judul "Daftar Batch Lelang BMN" dan sub-judul.
  - Tombol "+ Buat Batch Baru" yang memicu modal input teks.
  - Setelah batch baru sukses dibuat melalui API `POST /api/bmn/auction-batches`, gunakan router Next.js (`useRouter`) untuk mengarahkan pengguna secara otomatis ke halaman `/bmn/auction-batches/[id]` menggunakan ID baru dari response.
  - Search input dan dropdown filter status.
  - Table/Grid daftar batch dengan kolom: Nomor Batch, Nama, Status (dalam badge warna), Jumlah Aset, Tgl Lelang, Aksi (Lihat Detail / Hapus).
- **Acceptance Criteria**: Tampilan UI presisi, data termuat dengan loading skeleton, filter status berjalan, dan redirect halaman detail berjalan mulus setelah pembuatan batch baru.

---

### Task 22: Batch Detail Layout & Tabs Setup
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/page.tsx`
- **Objective**: Membuat halaman detail batch lelang dengan tata letak sub-tab.
- **Implementation Details**:
  - Ambil parameter ID batch lelang dari URL.
  - Load data detail batch via `react-query` (`getBatchDetail`).
  - Sediakan Header bertuliskan Nomor Batch, Nama Batch, dan Status Badge dinamis.
  - Tampilkan navigasi tab:
    1. Aset & Lot (Hanya tampil/aktif untuk status DRAFT).
    2. Kertas Kerja.
    3. Penandatangan & No. Surat.
    4. Pusat Cetak Dokumen.
    5. Realisasi Hasil Lelang (Hanya tampil/aktif jika status JADWAL_DITETAPKAN atau REALISASI).
- **Acceptance Criteria**: Halaman detail merespon ID dinamis, tab berganti dengan mulus tanpa memicu full page reload.

---

### Task 23: Tab Aset & Lot (Candidates Selector Panel)
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/_components/AssetAndLotTab.tsx`
- **Objective**: Menyediakan UI penyusunan draf aset lelang, lot number, dan order.
- **Implementation Details**:
  Tab ini dibagi menjadi dua kolom:
  - **Kolom Kiri**: Daftar Kandidat Aset (BMN Asset aktif dengan kondisi `Rusak Berat` yang dapat dicari/difilter). Menyediakan tombol "+" untuk memasukkan aset ke batch lelang.
  - **Kolom Kanan**: Aset terpilih di batch lelang saat ini. Lengkap dengan:
    - Tombol reorder naik/turun (`moveUp`/`moveDown`) atau drag-and-drop.
    - Kolom input Lot Number untuk tiap baris aset.
    - Kolom input manual Nilai Taksiran.
    - Tombol simpan urutan & simpan valuasi.
- **Acceptance Criteria**: Operator dapat menambah/menghapus aset dari draf batch lelang secara interaktif, menyusun urutan, menginput Lot, dan data tersimpan di database junction.

---

### Task 24: Tab Kertas Kerja (Valuation Worksheet Sync)
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/_components/KertasKerjaTab.tsx`
- **Objective**: Form Kertas Kerja terintegrasi database untuk kalkulasi harga limit lelang.
- **Implementation Details**:
  - Tampilkan list aset yang sudah dipilih.
  - Sediakan tombol "Edit Kertas Kerja" untuk tiap aset. Tombol ini membuka modal form kertas kerja (kalkulator) yang memuat input field: Nilai Perolehan Awal, Persentase Penyusutan Fisik, Nilai Sisa/Taksiran Akhir.
  - Ketika formulir disimpan, kirim data kertas kerja ke API `PUT /api/bmn/auction-batches/{id}/assets/{assetId}/valuation`.
  - Nominal hasil kalkulasi harus otomatis terupdate pada data Nilai Taksiran aset tersebut di database junction.
- **Acceptance Criteria**: Modal kalkulator Kertas Kerja berfungsi secara mengubah Nilai Taksiran aset utama, dan berhasil menyimpan JSONB di DB.

---

### Task 25: Tab Penandatangan & Kunci Batch (DIAJUKAN)
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/_components/SignatoriesTab.tsx`
- **Objective**: Mengatur nomor-nomor surat dan nama Kepala Balai sebelum mengunci batch lelang.
- **Implementation Details**:
  - Muat dropdown picker Kepala Balai (menggunakan daftar pegawai aktif yang diambil dari API kepegawaian).
  - Tampilkan input field teks untuk nomor surat dari 13 berkas legal (BA Koreksi, SK Penghentian, dll.).
  - Sediakan tombol dominan **"Ajukan & Kunci Berkas Lelang"**.
  - Saat tombol ditekan, panggil API `POST /api/bmn/auction-batches/{id}/transition` dengan payload `status: "DIAJUKAN"`, `kepala_balai_id`, dan JSON `document_numbers`.
- **Acceptance Criteria**: Validasi memastikan semua lot number dan nilai taksiran aset terisi sebelum tombol kunci aktif. Selesai memanggil API, status batch berubah menjadi `DIAJUKAN` dan formulir beralih ke mode read-only.

---

### Task 26: Tab Pusat Cetak Dokumen (Integrated Printing Center)
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/_components/PrintingCenterTab.tsx`
- **Objective**: Menyediakan generator cetak berkas legal menggunakan data terstruktur batch lelang.
- **Implementation Details**:
  - Susun grid kartu cetak untuk ke-13 berkas legal persyaratan lelang BMN.
  - Setiap kartu memiliki tombol "Cetak" yang mengarah ke trigger render dokumen cetak (print dialog browser).
  - **Watermark DRAFT**: Jika status batch adalah `DRAFT`, render watermark diagonal teks "DRAFT - KANDIDAT LELANG BMN" di latar belakang setiap halaman dokumen.
  - **Frozen Data Check**: Jika status batch adalah `DIAJUKAN`, `JADWAL_DITETAPKAN`, atau `REALISASI`, dokumen dicetak bersih tanpa watermark. Data penandatangan (Kepala Balai, Panitia, dsb.) harus dibaca dari objek `metadata.signatories` di JSON batch, bukan query pegawai aktif lagi.
- **Acceptance Criteria**: Layout cetak A4 presisi, data nomor surat terisi dari database, dan teks watermark tampil/sembunyi secara dinamis mengikuti status batch.

---

### Task 27: KPKNL Scheduling Input Panel
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/_components/SchedulingPanel.tsx` (atau bagian dari Ringkasan Tab)
- **Objective**: Mengisi persetujuan lelang dan penetapan jadwal lelang dari KPKNL.
- **Implementation Details**:
  - Panel ini hanya tampil jika status batch adalah `DIAJUKAN` untuk user dengan role Admin BMN.
  - Menyediakan input teks "Nomor Surat Persetujuan KPKNL/KSDAE", "Tanggal Surat Persetujuan", "Nomor Surat Penetapan KPKNL", dan "Tanggal Pelaksanaan Lelang".
  - Tombol **"Simpan & Terapkan Jadwal Lelang"** memicu transisi status batch ke `JADWAL_DITETAPKAN`.
- **Acceptance Criteria**: Form tervalidasi dengan baik, status batch berhasil berubah menjadi `JADWAL_DITETAPKAN` di database.

---

### Task 28: Tab Pencatatan Realisasi Hasil Lelang
- **Target Area**: `frontend/src/app/bmn/auction-batches/[id]/_components/RealisasiTab.tsx`
- **Objective**: Merekam hasil lelang fisik KPKNL per barang.
- **Implementation Details**:
  - Hanya aktif/tampil jika status batch adalah `JADWAL_DITETAPKAN` atau `REALISASI`.
  - Tampilkan tabel aset di dalam batch lelang.
  - Untuk tiap baris aset, tampilkan:
    - Identitas aset & Lot Number.
    - Checkbox / Toggle Saklar: "Terjual" (Is Sold).
    - Input Angka Rupiah: "Harga Terbentuk" (Hanya tampil/aktif jika status "Terjual" dicentang).
  - Tampilkan tombol **"Selesaikan Realisasi & Hapus Aset Terjual"** di bagian bawah.
  - Pemicu API `POST /api/bmn/auction-batches/{id}/realize` dengan array hasil lelang (menggunakan parameter `harga_terbentuk` secara konsisten).
- **Acceptance Criteria**: Validasi memastikan seluruh baris aset memiliki keputusan terjual/tidak terjual sebelum submit diizinkan.

---

### Task 29: Backend Unit & Integration Testing
- **Target Area**: `backend/tests/Feature/Bmn/AuctionBatchTest.php`
- **Objective**: Menulis tes otomatis untuk memastikan kelayakan backend lifecycle lelang.
- **Implementation Details**:
  Tulis automated tests menggunakan Pest/PHPUnit:
  - Uji pembuatan batch baru (`POST /api/bmn/auction-batches`).
  - Uji validasi penolakan penambahan aset yang sudah terikat pada batch aktif lain.
  - Uji transisi status DRAFT ke DIAJUKAN (pastikan Kepala Balai ter-snapshot di metadata, dan henti_guna = true diaset).
  - Uji transisi status JADWAL_DITETAPKAN ke REALISASI dengan parameter terjual (`is_sold = true`). Pastikan aset yang terjual terisi `tanggal_pengapusan` dan ter-soft delete, serta log `AssetUpdate` terbuat, sedangkan aset tidak terjual dikembalikan ke status `henti_guna = false`.
- **Acceptance Criteria**: Jalankan `php artisan test --filter=AuctionBatchTest` dan semua pengujian menghasilkan warna hijau (pass).

---

### Task 30: End-to-End Manual Testing Verification
- **Target Area**: `docs/walkthrough.md`
- **Objective**: Melakukan pengetesan alur menyeluruh dan menyusun laporan walkthrough.
- **Implementation Details**:
  - Jalankan flow lengkap sebagai Operator BMN: buat batch baru $\rightarrow$ pilih aset rusak berat $\rightarrow$ reorder $\rightarrow$ isi lot & taksiran $\rightarrow$ isi kertas kerja $\rightarrow$ pilih Kepala Balai $\rightarrow$ masukkan nomor surat $\rightarrow$ kunci batch (`DIAJUKAN`).
  - Sebagai Admin BMN: masukkan surat persetujuan, surat KPKNL & tanggal lelang $\rightarrow$ ubah status ke `JADWAL_DITETAPKAN` $\rightarrow$ isi realisasi (tandai minimal 1 aset terjual dan 1 tidak terjual) $\rightarrow$ finalisasi lelang (`REALISASI`).
  - Periksa database: pastikan aset terjual hilang dari daftar inventaris aktif (ter-soft delete) namun memiliki log penghapusan lelang di `bmn_asset_updates` dan terisi `tanggal_pengapusan` dengan tanggal lelang, sedangkan aset tidak terjual tetap aktif operasional (`henti_guna = false`).
  - Dokumentasikan hasil pengujian beserta tangkapan layar dalam berkas walkthrough.
- **Acceptance Criteria**: Alur lelang selesai tanpa hambatan teknis, log disposal tercatat presisi di database, dan walkthrough terdokumentasi lengkap.
