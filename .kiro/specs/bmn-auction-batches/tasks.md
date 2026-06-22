# Implementation Plan: Paket Dokumen Lelang BMN

Dokumen ini adalah playbook implementasi sangat rinci untuk fitur **Paket Dokumen Lelang BMN**. Tujuan utamanya adalah agar AI model rendah sekalipun dapat mengikuti pekerjaan secara berurutan tanpa menebak konteks.

Fitur ini adalah **generator dokumen dan arsip internal**, bukan sistem persetujuan/lelang resmi. Pengiriman dokumen, tanda tangan, disposisi, persetujuan, dan pelaksanaan lelang tetap dilakukan manual di luar aplikasi.

---

## Non-Negotiable Rules for Implementers

1. Kerjakan task secara berurutan dari atas ke bawah.
2. Jangan lompat ke frontend sebelum backend contract minimal tersedia.
3. Jangan hardcode rollback aset ke `Aktif`; selalu gunakan `freeze_snapshot`.
4. Jangan membuat status selain:
   - `DRAFT`
   - `DIAJUKAN`
   - `JADWAL_DITETAPKAN`
   - `LELANG_ULANG`
   - `REALISASI`
   - `BATAL`
5. Jangan membuat `LELANG_ULANG` lebih dari 1 kali per batch.
6. Jangan soft-delete aset tidak terjual.
7. Jangan soft-delete aset terjual sebelum status `REALISASI` final dikonfirmasi.
8. Jangan memakai HTTP `210`; create success harus `201 Created`.
9. Semua operasi multi-table wajib `DB::transaction()`.
10. Semua endpoint wajib tetap enforce permission di backend, walaupun tombol frontend disembunyikan.
11. Semua task yang menyentuh status atau aset harus menulis audit event.
12. Jangan menghapus atau merusak fungsi lama `/bmn/auction-candidates` sampai replacement route selesai dan diuji.

---

## Status Lifecycle Contract

```text
DRAFT
DIAJUKAN
JADWAL_DITETAPKAN
LELANG_ULANG
REALISASI
BATAL
```

Transisi valid:

```text
DRAFT -> DIAJUKAN
DRAFT -> BATAL

DIAJUKAN -> JADWAL_DITETAPKAN
DIAJUKAN -> BATAL

JADWAL_DITETAPKAN -> REALISASI
JADWAL_DITETAPKAN -> LELANG_ULANG
JADWAL_DITETAPKAN -> BATAL

LELANG_ULANG -> REALISASI
LELANG_ULANG -> BATAL
```

Status final read-only:

```text
REALISASI
BATAL
```

Batch aktif untuk mencegah double-batching aset:

```text
DRAFT
DIAJUKAN
JADWAL_DITETAPKAN
LELANG_ULANG
```

---

## Milestones and Exit Criteria

### Milestone 1: Database Foundation
Tasks 1-5.

Exit criteria:
- Tabel `bmn_auction_batches` sesuai desain baru.
- Tabel `bmn_asset_auction_batch` sesuai desain baru.
- Tabel `bmn_auction_batch_events` tersedia.
- Migration bisa dijalankan dan rollback tanpa error.

### Milestone 2: Models, Permissions, and Domain Constants
Tasks 6-10.

Exit criteria:
- Model `AuctionBatch`, `AssetAuctionBatch`, dan `AuctionBatchEvent` tersedia.
- Relasi `Asset` ke batch tersedia.
- Permission `bmn.auction.*` bisa dipakai oleh middleware existing.
- Status dan action audit punya source of truth.

### Milestone 3: Backend Services
Tasks 11-24, with integrated hardening from Tasks 65-69.

Exit criteria:
- Service membuat batch, menambah aset, mengubah Lot/nilai, checklist, lock, jadwal, lelang pertama, lelang ulang, realisasi, cancel, dan audit event.
- Metadata builder, snapshot builder, readiness service, validity service, and JSON contract validation are wired before lock/finalization work is considered complete.
- Semua write penting transaction-safe.
- Semua invalid transition ditolak.

### Milestone 4: Backend API and Tests
Tasks 25-38, with API hardening from Task 70.

Exit criteria:
- Controller, requests, resources, routes, dan tests lengkap.
- API resources expose readiness, validity warning, metadata schema version, read-only state, and available transitions.
- `php artisan test --filter=AuctionBatchTest` lulus.

### Milestone 5: Frontend API and Navigation
Tasks 39-42, with frontend warning contract from Task 71 where it touches candidate navigation.

Exit criteria:
- Frontend type/API client siap.
- Sidebar/menu mengarah ke candidate dan batch pages.
- Candidate page bisa membuat batch baru and shows document-readiness warnings.

### Milestone 6: Frontend Batch Workspace
Tasks 43-56, with document/readiness UI hardening from Tasks 71-72.

Exit criteria:
- `/bmn/auction-batches` dan `/bmn/auction-batches/[id]` selesai.
- Semua tab mengikuti read-only/editable state berdasarkan status.
- Batch detail shows advisory validity warning, readiness warning, and schema-safe document context.

### Milestone 7: Documents, Audit, and E2E Verification
Tasks 57-64, with final verification from Task 73.

Exit criteria:
- Pusat Dokumen membaca batch database.
- Watermark status berjalan.
- Audit trail tampil.
- Manual walkthrough selesai dan terdokumentasi.

### Milestone 8: Integrated 9.5 Quality Gates
Tasks 65-73 are not an appendix. They are quality gates that must be completed at the same time as their owning task below.

Exit criteria:
- Metadata, asset snapshot, freeze snapshot, document readiness, and administrative warning contracts are explicit.
- Backend services exist for metadata building, asset snapshot building, readiness evaluation, and validity warning.
- API resources expose readiness and validity warning consistently.
- Frontend warning UI is advisory and does not imply official approval/rejection.
- Final reviewer can trace every high-risk requirement to task, code target, and test expectation.

---

## Integrated Execution Map

Use this map so Tasks 65-73 are executed in the right phase, not postponed until the end.

| Quality Gate | Must be completed together with | Why |
| --- | --- | --- |
| Task 65 Metadata Builder | Task 18 service skeleton, Task 26 lock to `DIAJUKAN`, Task 53 document context | Locking and printing depend on frozen metadata. |
| Task 66 Asset Snapshot Builder | Task 16 snapshot service, Task 26 lock, Task 28-31 realization/cancel | Snapshot is required for historical print and rollback. |
| Task 67 Document Readiness Service | Task 17 checklist, Task 34 resources, Task 35 candidates endpoint, Task 41 candidate page | Readiness warning must be backend-owned and visible early. |
| Task 68 Administrative Validity Service | Task 27 schedule, Task 34 resources, Task 48 schedule tab | Validity warning appears after manual external schedule data exists. |
| Task 69 JSON Contract Validation | Task 17 checker and Task 26 lock | Invalid JSON contracts must block lock before assets are frozen. |
| Task 70 API Resource Hardening | Task 34 resources and Task 35 routes/controller response | Frontend cannot implement warnings without stable fields. |
| Task 71 Frontend Warning UI | Task 41 candidate page, Task 45 asset tab, Task 48 schedule tab | Warnings belong in the operator workflow, not only final review. |
| Task 72 Document Porting Split | Task 53 document context and Task 54 document components | The 13 documents need a controlled migration path. |
| Task 73 Final 9.5 Checklist | Task 61 backend gate, Task 62 frontend gate, Task 64 review | Final score requires evidence, not just written intent. |

Rule:
- A task listed in "Must be completed together with" is not done until its mapped quality gate is also satisfied.

---

## Backend Contracts

Root backend module:

```text
backend/app/Modules/Bmn/
```

Namespaces:

```php
App\Modules\Bmn\Models
App\Modules\Bmn\Controllers
App\Modules\Bmn\Requests
App\Modules\Bmn\Resources
App\Modules\Bmn\Services
App\Modules\Bmn\Support
```

Migration path:

```text
backend/app/Modules/Bmn/Migrations/
```

Routes file:

```text
backend/app/Modules/Bmn/Routes/api.php
```

Use UUID primary keys with:

```php
use Illuminate\Database\Eloquent\Concerns\HasUuids;
```

Use numeric money columns:

```php
$table->numeric('nilai_taksiran', 15, 2)->nullable();
```

Use JSONB for flexible snapshots:

```php
$table->jsonb('metadata')->nullable();
```

---

## Frontend Contracts

New route roots:

```text
frontend/src/app/bmn/auction-candidates/
frontend/src/app/bmn/auction-batches/
frontend/src/app/bmn/auction-batches/[id]/
```

Recommended frontend feature folders:

```text
frontend/src/app/bmn/auction-batches/_components/
frontend/src/app/bmn/auction-batches/_hooks/
frontend/src/app/bmn/auction-batches/_lib/
frontend/src/app/bmn/auction-batches/[id]/_components/
```

Use:
- React Query for server state.
- Existing `api` from `frontend/src/lib/api.ts`.
- Existing shadcn/ui components where available.
- Existing document components under `frontend/src/app/bmn/auction-candidates/_components/` as migration source, not as permanent state owner.

---

# Task Matrix

## Task 1: Revise Existing Main Batch Migration

Target file:

```text
backend/app/Modules/Bmn/Migrations/2026_06_22_122600_create_bmn_auction_batches_table.php
```

Context:
- This file already exists locally as untracked.
- It currently lacks `LELANG_ULANG`, reauction fields, creator/updater, and timestamps for realized/canceled.
- Do not create a duplicate main batch migration unless this file has already been committed elsewhere.

Required columns:

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

    $table->unsignedInteger('reauction_count')->default(0);
    $table->string('no_surat_jadwal_ulang', 100)->nullable();
    $table->date('tanggal_lelang_ulang')->nullable();
    $table->text('reauction_notes')->nullable();

    $table->uuid('kepala_balai_id')->nullable();
    $table->jsonb('metadata')->nullable();

    $table->timestamp('realized_at')->nullable();
    $table->timestamp('canceled_at')->nullable();
    $table->uuid('created_by')->nullable();
    $table->uuid('updated_by')->nullable();

    $table->timestamps();
    $table->softDeletes();

    $table->index('status');
    $table->index('tanggal_lelang');
    $table->index('created_by');
});
```

Implementation notes:
- Do not add enum database type; use string for portability.
- Do not add FK to users unless existing user table uses UUID and local pattern supports it.
- `kepala_balai_id` can remain nullable UUID. FK to employees may be added only if employee IDs are UUID and migrations are safe.

Acceptance criteria:
- File contains all required columns.
- `status` default is `DRAFT`.
- `reauction_count` default is 0.
- `down()` drops `bmn_auction_batches`.

Verification:

```powershell
cd backend
php -l app/Modules/Bmn/Migrations/2026_06_22_122600_create_bmn_auction_batches_table.php
```

---

## Task 2: Create Pivot Migration `bmn_asset_auction_batch`

Target file:

```text
backend/app/Modules/Bmn/Migrations/[timestamp]_create_bmn_asset_auction_batch_table.php
```

Recommended timestamp:

```text
2026_06_22_122700_create_bmn_asset_auction_batch_table.php
```

Required schema:

```php
Schema::create('bmn_asset_auction_batch', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('bmn_auction_batch_id');
    $table->uuid('bmn_asset_id');

    $table->string('lot_number', 50)->nullable();
    $table->numeric('nilai_taksiran', 15, 2)->nullable();
    $table->jsonb('kertas_kerja_data')->nullable();
    $table->integer('sort_order')->default(0);

    $table->jsonb('asset_snapshot')->nullable();
    $table->jsonb('freeze_snapshot')->nullable();

    $table->boolean('first_auction_is_sold')->nullable();
    $table->numeric('first_auction_price', 15, 2)->nullable();
    $table->boolean('reauction_is_sold')->nullable();
    $table->numeric('reauction_price', 15, 2)->nullable();

    $table->string('final_result', 30)->nullable();
    $table->numeric('final_price', 15, 2)->nullable();
    $table->date('final_auction_date')->nullable();
    $table->timestamp('disposed_at')->nullable();

    $table->timestamps();

    $table->foreign('bmn_auction_batch_id')
        ->references('id')
        ->on('bmn_auction_batches')
        ->cascadeOnDelete();

    $table->foreign('bmn_asset_id')
        ->references('id')
        ->on('bmn_assets')
        ->restrictOnDelete();

    $table->unique(['bmn_auction_batch_id', 'bmn_asset_id'], 'batch_asset_unique');
    $table->index('bmn_asset_id');
    $table->index('lot_number');
    $table->index('final_result');
});
```

Important:
- Do not use old columns `is_sold` and `harga_terbentuk`; the new model separates first auction, reauction, and final result.
- Use `restrictOnDelete()` for `bmn_asset_id` so an asset cannot be physically removed while referenced.

Acceptance criteria:
- Pivot table supports Lot, valuation, snapshots, first auction, reauction, final result, and disposal marker.
- Unique constraint prevents same asset twice in same batch.

---

## Task 3: Create Audit Event Migration

Target file:

```text
backend/app/Modules/Bmn/Migrations/[timestamp]_create_bmn_auction_batch_events_table.php
```

Recommended timestamp:

```text
2026_06_22_122800_create_bmn_auction_batch_events_table.php
```

Required schema:

```php
Schema::create('bmn_auction_batch_events', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('bmn_auction_batch_id');
    $table->uuid('bmn_asset_id')->nullable();
    $table->uuid('actor_id')->nullable();
    $table->string('action', 80);
    $table->jsonb('previous_values')->nullable();
    $table->jsonb('new_values')->nullable();
    $table->text('notes')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->foreign('bmn_auction_batch_id')
        ->references('id')
        ->on('bmn_auction_batches')
        ->cascadeOnDelete();

    $table->foreign('bmn_asset_id')
        ->references('id')
        ->on('bmn_assets')
        ->nullOnDelete();

    $table->index('bmn_auction_batch_id');
    $table->index('bmn_asset_id');
    $table->index('actor_id');
    $table->index('action');
    $table->index('created_at');
});
```

Acceptance criteria:
- Audit table records batch-level and asset-level events.
- `created_at` exists without requiring `updated_at`.

---

## Task 4: Run Migration Syntax Checks

Target:

```text
backend/app/Modules/Bmn/Migrations/*.php
```

Commands:

```powershell
cd backend
php -l app/Modules/Bmn/Migrations/2026_06_22_122600_create_bmn_auction_batches_table.php
php -l app/Modules/Bmn/Migrations/2026_06_22_122700_create_bmn_asset_auction_batch_table.php
php -l app/Modules/Bmn/Migrations/2026_06_22_122800_create_bmn_auction_batch_events_table.php
```

Acceptance criteria:
- All files return `No syntax errors detected`.

---

## Task 5: Run Database Migration Locally

Command:

```powershell
cd backend
php artisan migrate
```

If local DB is not configured:
- Do not fake success.
- Record the blocker in final status.
- Continue with code work only if migration syntax is clean.

Acceptance criteria:
- Tables exist:
  - `bmn_auction_batches`
  - `bmn_asset_auction_batch`
  - `bmn_auction_batch_events`

Optional verification query:

```sql
select column_name
from information_schema.columns
where table_name = 'bmn_auction_batches'
order by ordinal_position;
```

---

## Task 6: Create Status Constants

Target file:

```text
backend/app/Modules/Bmn/Support/AuctionBatchStatus.php
```

Implementation:

```php
<?php

namespace App\Modules\Bmn\Support;

final class AuctionBatchStatus
{
    public const DRAFT = 'DRAFT';
    public const DIAJUKAN = 'DIAJUKAN';
    public const JADWAL_DITETAPKAN = 'JADWAL_DITETAPKAN';
    public const LELANG_ULANG = 'LELANG_ULANG';
    public const REALISASI = 'REALISASI';
    public const BATAL = 'BATAL';

    public const ACTIVE = [
        self::DRAFT,
        self::DIAJUKAN,
        self::JADWAL_DITETAPKAN,
        self::LELANG_ULANG,
    ];

    public const FINAL = [
        self::REALISASI,
        self::BATAL,
    ];

    public static function all(): array
    {
        return [
            self::DRAFT,
            self::DIAJUKAN,
            self::JADWAL_DITETAPKAN,
            self::LELANG_ULANG,
            self::REALISASI,
            self::BATAL,
        ];
    }
}
```

Acceptance criteria:
- No duplicated status string in services/controllers.
- Future code imports this class.

---

## Task 7: Create Final Result Constants

Target file:

```text
backend/app/Modules/Bmn/Support/AuctionAssetFinalResult.php
```

Implementation:

```php
<?php

namespace App\Modules\Bmn\Support;

final class AuctionAssetFinalResult
{
    public const SOLD_FIRST = 'SOLD_FIRST';
    public const SOLD_REAUCTION = 'SOLD_REAUCTION';
    public const UNSOLD = 'UNSOLD';
    public const CANCELED = 'CANCELED';
}
```

Acceptance criteria:
- `final_result` values come from constants.

---

## Task 8: Create Audit Action Constants

Target file:

```text
backend/app/Modules/Bmn/Support/AuctionBatchEventAction.php
```

Required constants:

```php
batch.created
batch.updated
batch.canceled
status.changed
asset.added
asset.removed
asset.order.updated
asset.valuation.updated
batch.locked
asset.freeze_snapshot.created
schedule.recorded
document.printed
first_auction.result.recorded
reauction.started
reauction.result.recorded
realization.finalized
asset.disposed
asset.restored
```

Implementation pattern:

```php
public const BATCH_CREATED = 'batch.created';
```

Acceptance criteria:
- Audit code never hardcodes action strings outside this class.

---

## Task 9: Create `AuctionBatch` Model

Target file:

```text
backend/app/Modules/Bmn/Models/AuctionBatch.php
```

Required:
- `HasUuids`
- `SoftDeletes`
- `$table = 'bmn_auction_batches'`
- `$fillable` includes all columns from Task 1 except timestamps/deleted_at.
- `$casts`:
  - dates to `date`
  - timestamps to `datetime`
  - metadata to `array`
  - reauction_count to `integer`

Relations:

```php
public function assets()
{
    return $this->belongsToMany(Asset::class, 'bmn_asset_auction_batch', 'bmn_auction_batch_id', 'bmn_asset_id')
        ->withPivot([
            'id',
            'lot_number',
            'nilai_taksiran',
            'kertas_kerja_data',
            'sort_order',
            'asset_snapshot',
            'freeze_snapshot',
            'first_auction_is_sold',
            'first_auction_price',
            'reauction_is_sold',
            'reauction_price',
            'final_result',
            'final_price',
            'final_auction_date',
            'disposed_at',
        ])
        ->withTimestamps()
        ->orderBy('bmn_asset_auction_batch.sort_order');
}

public function assetRows()
{
    return $this->hasMany(AssetAuctionBatch::class, 'bmn_auction_batch_id');
}

public function events()
{
    return $this->hasMany(AuctionBatchEvent::class, 'bmn_auction_batch_id');
}
```

Helper methods:

```php
public function isDraft(): bool
public function isFinal(): bool
public function isReadOnly(): bool
```

Acceptance criteria:
- Model can be loaded in `php artisan tinker`.
- Relations return builders.

---

## Task 10: Create `AssetAuctionBatch` Model

Target file:

```text
backend/app/Modules/Bmn/Models/AssetAuctionBatch.php
```

Required casts:

```php
protected $casts = [
    'nilai_taksiran' => 'decimal:2',
    'kertas_kerja_data' => 'array',
    'sort_order' => 'integer',
    'asset_snapshot' => 'array',
    'freeze_snapshot' => 'array',
    'first_auction_is_sold' => 'boolean',
    'first_auction_price' => 'decimal:2',
    'reauction_is_sold' => 'boolean',
    'reauction_price' => 'decimal:2',
    'final_price' => 'decimal:2',
    'final_auction_date' => 'date',
    'disposed_at' => 'datetime',
];
```

Relations:

```php
public function batch()
{
    return $this->belongsTo(AuctionBatch::class, 'bmn_auction_batch_id');
}

public function asset()
{
    return $this->belongsTo(Asset::class, 'bmn_asset_id');
}
```

Acceptance criteria:
- Pivot row can load `batch` and `asset`.

---

## Task 11: Create `AuctionBatchEvent` Model

Target file:

```text
backend/app/Modules/Bmn/Models/AuctionBatchEvent.php
```

Required:
- `HasUuids`
- `$timestamps = false`
- casts for `previous_values`, `new_values`, `created_at`
- relations to `batch` and `asset`

Acceptance criteria:
- Audit rows can be inserted via model.

---

## Task 12: Add `auctionBatches` Relation to Asset

Target file:

```text
backend/app/Modules/Bmn/Models/Asset.php
```

Add import if needed:

```php
use App\Modules\Bmn\Models\AuctionBatch;
```

Add method:

```php
public function auctionBatches()
{
    return $this->belongsToMany(AuctionBatch::class, 'bmn_asset_auction_batch', 'bmn_asset_id', 'bmn_auction_batch_id')
        ->withPivot([
            'id',
            'lot_number',
            'nilai_taksiran',
            'kertas_kerja_data',
            'sort_order',
            'asset_snapshot',
            'freeze_snapshot',
            'first_auction_is_sold',
            'first_auction_price',
            'reauction_is_sold',
            'reauction_price',
            'final_result',
            'final_price',
            'final_auction_date',
            'disposed_at',
        ])
        ->withTimestamps();
}
```

Acceptance criteria:
- Existing `Asset` behavior remains unchanged.
- New relation works.

---

## Task 13: Add Auction Permissions to Access System

Target files:
- `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx`
- `frontend/src/hooks/useRole.ts`
- `backend/app/Models/User.php`
- `backend/app/Http/Middleware/CheckPermission.php`
- Search backend seed/default files with:

```powershell
rg -n "bmn\.view|bmn\.document|permissions|module_access|super admin|super_admin" backend
```

Required permissions:

```text
bmn.auction.view
bmn.auction.create
bmn.auction.update
bmn.auction.delete
bmn.auction.print
bmn.auction.finalize
```

Rules:
- `view`: see candidate/batch/audit.
- `create`: create new batch.
- `update`: edit draft, lock to DIAJUKAN.
- `delete`: delete draft batch if still allowed.
- `print`: document context and print events.
- `finalize`: schedule, first result, reauction, realization, cancel non-final.

Acceptance criteria:
- Super admin or equivalent role can get all permissions.
- Backend middleware can check these strings.
- Frontend access form can grant/revoke them in `EmployeeAccessSheet.tsx`.
- Existing BMN admins do not lose current access because of the new permission names.
- If `useRole.ts` contains fallback permissions for BMN, add `bmn.auction.view` only to read fallback and document why write/finalize permissions must remain explicit.

---

## Task 14: Create Audit Logger Service

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionBatchAuditLogger.php
```

Method:

```php
public function log(
    string $batchId,
    string $action,
    ?string $actorId = null,
    ?string $assetId = null,
    ?array $previousValues = null,
    ?array $newValues = null,
    ?string $notes = null
): AuctionBatchEvent
```

Implementation:
- Insert `AuctionBatchEvent::create(...)`.
- If `auth()->id()` exists and `$actorId` is null, use `auth()->id()`.
- Do not throw away event details.

Acceptance criteria:
- Can log `batch.created`.
- Can log asset-specific event.

---

## Task 15: Create State Machine Service

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionBatchStateMachine.php
```

Required methods:

```php
public function assertCanTransition(AuctionBatch $batch, string $targetStatus): void
public function isReadOnly(AuctionBatch $batch): bool
public function canEditDraft(AuctionBatch $batch): bool
```

Rules:
- `DRAFT` can go to `DIAJUKAN`, `BATAL`.
- `DIAJUKAN` can go to `JADWAL_DITETAPKAN`, `BATAL`.
- `JADWAL_DITETAPKAN` can go to `LELANG_ULANG`, `REALISASI`, `BATAL`.
- `LELANG_ULANG` can go to `REALISASI`, `BATAL`.
- `REALISASI` cannot transition.
- `BATAL` cannot transition.

Throw:

```php
throw ValidationException::withMessages([
    'status' => "Transisi status dari {$batch->status} ke {$targetStatus} tidak valid.",
]);
```

Acceptance criteria:
- Invalid transitions produce HTTP 422 through controller.

---

## Task 16: Create Snapshot Builder Service

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionAssetSnapshotBuilder.php
```

Methods:

```php
public function buildAssetSnapshot(Asset $asset): array
public function buildFreezeSnapshot(Asset $asset): array
public function restoreFromFreezeSnapshot(Asset $asset, array $snapshot): void
```

Integrated quality gate:
- Complete Task 66 together with this task.
- This file is the canonical snapshot service. Do not create a second `AuctionAssetSnapshotService` with overlapping responsibility.

`buildAssetSnapshot` should include fields needed for printing:

```text
schema_version
id
kode_barang
nup
nup_lama
nama_barang
merk
tipe
merk_tipe
no_polisi
no_mesin
no_rangka
nilai_perolehan
nilai_buku
kondisi
status_penggunaan
lokasi_ruang
lokasi_spesifik
no_identitas
no_stnk
tanggal_perolehan
vehicle_identifiers
document_readiness
```

`buildFreezeSnapshot` minimum:

```text
schema_version
previous_status_penggunaan
previous_henti_guna
previous_kondisi
previous_usul_hapus
previous_tanggal_pengapusan
```

`restoreFromFreezeSnapshot`:
- Only update keys present in snapshot.
- Convert missing snapshot values to null where appropriate.

Acceptance criteria:
- Cancel and unsold finalization can restore original asset state.
- Asset snapshot and freeze snapshot both include `schema_version = 1`.
- Asset snapshot includes `document_readiness` from `AuctionAssetDocumentReadinessService`.

---

## Task 17: Create Completeness Checker Service

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionBatchCompletenessChecker.php
```

Method:

```php
public function check(AuctionBatch $batch): array
```

Return shape:

```php
[
    'complete' => false,
    'items' => [
        [
            'key' => 'assets_present',
            'label' => 'Minimal 1 aset dipilih',
            'passed' => true,
            'message' => null,
        ],
    ],
]
```

Checklist items:
- `assets_present`
- `all_lot_numbers_present`
- `all_valuations_positive`
- `kepala_balai_selected`
- `panitia_present`
- `tim_penilai_present`
- `pemeriksa_present`
- `document_numbers_present`
- `document_dates_present`
- `no_active_duplicate_assets`
- `document_readiness_reviewed`
- `metadata_contract_valid`
- `asset_snapshot_contract_valid`
- `freeze_snapshot_contract_valid`

Integrated quality gates:
- Complete Task 67 together with this task so document readiness comes from backend service.
- Complete Task 69 together with this task so JSON contract validation is part of lock readiness.

Metadata input can be checked before lock by passing payload. If method only checks saved batch, create second method:

```php
public function checkForLock(AuctionBatch $batch, array $payload): array
```

Acceptance criteria:
- Lock to `DIAJUKAN` fails if any required item fails.
- API checklist endpoint can reuse this service.
- Checklist response distinguishes blocking failures from advisory warnings.
- Readiness warnings are shown but do not block unless backend config marks an item as required.

---

## Task 18: Create Core AuctionBatchService Skeleton

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionBatchService.php
```

Constructor dependencies:

```php
public function __construct(
    private AuctionBatchAuditLogger $auditLogger,
    private AuctionBatchStateMachine $stateMachine,
    private AuctionBatchCompletenessChecker $completenessChecker,
    private AuctionBatchMetadataBuilder $metadataBuilder,
    private AuctionAssetSnapshotBuilder $snapshotBuilder,
    private AuctionAssetDocumentReadinessService $readinessService,
    private AuctionBatchValidityService $validityService,
    private AssetService $assetService,
) {}
```

If PHP version/project style avoids constructor property promotion, use explicit properties.

Integrated quality gates:
- Complete Tasks 65-69 before marking service skeleton and lock flow complete.
- `AuctionBatchService` owns orchestration only; JSON shape construction stays in builder/readiness/validity services.

Acceptance criteria:
- Service can be resolved by Laravel container.
- No circular dependency.

---

## Task 19: Implement Batch Number Generation

Target:

```text
AuctionBatchService
```

Method:

```php
private function generateBatchNumber(): string
```

Rules:
- Format `LE-YYYYMMDD-0001`.
- Random 4 digits acceptable.
- Must retry if collision.
- Max 10 attempts, then throw exception.

Pseudo-code:

```php
for ($i = 0; $i < 10; $i++) {
    $candidate = 'LE-'.now()->format('Ymd').'-'.str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
    if (! AuctionBatch::where('batch_number', $candidate)->exists()) {
        return $candidate;
    }
}
throw new RuntimeException('Gagal membuat nomor batch unik.');
```

Acceptance criteria:
- No duplicate batch number.

---

## Task 20: Implement Create Batch

Method:

```php
public function createBatch(array $data, ?string $actorId = null): AuctionBatch
```

Input:

```php
[
    'name' => '...',
    'asset_ids' => ['uuid-1', 'uuid-2'], // optional
]
```

Rules:
- Create batch as `DRAFT`.
- Set `created_by` and `updated_by`.
- If `asset_ids` provided, call `addAssets`.
- Write audit `batch.created`.
- Return batch with `assetRows.asset`.

Transaction required.

Acceptance criteria:
- Batch created with `201 Created` later in controller.
- Optional selected assets attached in same transaction.

---

## Task 21: Implement Candidate Query

Method:

```php
public function getCandidates(array $filters)
```

Rules:
- Base query: `Asset::query()->where('kondisi', 'Rusak Berat')`.
- Include active batch indicator using relation/subquery.
- Exclude soft-deleted assets.
- Search should reuse existing asset search patterns where possible.
- Must support pagination.

Response data per asset should include:

```text
id
kode_barang
nup
nup_lama
nama_barang
merk_tipe
no_polisi
kondisi
nilai_perolehan
nilai_buku
active_auction_batch_id
active_auction_batch_number
is_auction_eligible
```

Acceptance criteria:
- Assets in active batch are not selectable.
- Assets in `REALISASI` or `BATAL` batch are not considered active for blocking.

---

## Task 22: Implement Add Assets to Draft Batch

Method:

```php
public function addAssets(string $batchId, array $assetIds, ?string $actorId = null): AuctionBatch
```

Rules:
- Batch must be `DRAFT`.
- Each asset must exist and not be soft-deleted.
- Each asset must have `kondisi = Rusak Berat`.
- Each asset must not belong to active batch status:
  - `DRAFT`
  - `DIAJUKAN`
  - `JADWAL_DITETAPKAN`
  - `LELANG_ULANG`
- Set `sort_order` after existing max.
- Create `asset_snapshot` immediately for display stability.
- Do not create `freeze_snapshot` until lock.
- Write audit `asset.added` per asset.

Acceptance criteria:
- Adding duplicate asset in same batch is idempotent or returns clear 422; choose one behavior and keep tests aligned.
- Adding asset from active batch returns 422 with readable message.

---

## Task 23: Implement Remove Asset From Draft Batch

Method:

```php
public function removeAsset(string $batchId, string $assetId, ?string $actorId = null): AuctionBatch
```

Rules:
- Batch must be `DRAFT`.
- Delete pivot row.
- Re-normalize sort order to 0..n-1.
- Write audit `asset.removed`.

Acceptance criteria:
- Removing nonexistent asset returns 404 or 422 with clear message.
- Cannot remove after `DIAJUKAN`.

---

## Task 24: Implement Update Sort Order

Method:

```php
public function updateSortOrder(string $batchId, array $orderedAssetIds, ?string $actorId = null): void
```

Rules:
- Batch must be `DRAFT`.
- `orderedAssetIds` must contain exactly the same set of assets currently in batch.
- Update `sort_order` sequentially starting 0.
- Write audit `asset.order.updated` once with previous/new order.

Acceptance criteria:
- Missing or extra asset ID returns 422.

---

## Task 25: Implement Update Valuation and Worksheet

Method:

```php
public function updateValuation(string $batchId, string $assetId, array $data, ?string $actorId = null): AssetAuctionBatch
```

Rules:
- Batch must be `DRAFT`.
- `lot_number` nullable string max 50.
- `nilai_taksiran` nullable numeric >= 0.
- `kertas_kerja_data` nullable array.
- If worksheet calculates a value, caller can pass it as `nilai_taksiran`.
- Write audit `asset.valuation.updated` with previous/new values.

Acceptance criteria:
- Cannot edit valuation after `DIAJUKAN`.

---

## Task 26: Implement Lock to DIAJUKAN

Method:

```php
public function lockAndSubmit(string $batchId, array $payload, ?string $actorId = null): AuctionBatch
```

Payload:

```php
[
    'kepala_balai_id' => 'uuid',
    'signatories' => [
        'panitia' => [],
        'tim_penilai' => [],
        'pemeriksa' => [],
    ],
    'document_numbers' => [],
    'document_dates' => [],
]
```

Rules:
- State transition must be valid `DRAFT -> DIAJUKAN`.
- Completeness checker must pass.
- Build frozen `metadata` using `AuctionBatchMetadataBuilder`:
  - `signatories`
  - `document_numbers`
  - `document_dates`
  - `locked_at`
  - `locked_by`
- For each pivot asset:
  - refresh `asset_snapshot` using `AuctionAssetSnapshotBuilder`
  - include `asset_snapshot.schema_version = 1`
  - include `asset_snapshot.document_readiness`
  - create `freeze_snapshot` using `AuctionAssetSnapshotBuilder`
  - include `freeze_snapshot.schema_version = 1`
  - update asset `henti_guna = true`
  - update asset `status_penggunaan = 'Dihentikan dari Penggunaan Dinas'`
  - audit `asset.freeze_snapshot.created`
- Update batch:
  - status `DIAJUKAN`
  - kepala_balai_id
  - metadata
  - updated_by
- Write audit:
  - `batch.locked`
  - `status.changed`

Transaction required.

Integrated quality gates:
- Task 65 must be complete before this task can be accepted.
- Task 66 must be complete before this task can be accepted.
- Task 69 must be complete before this task can be accepted.
- Run JSON contract validation before saving status `DIAJUKAN`.

Acceptance criteria:
- Master employee changes after lock do not change document context.
- Assets are frozen.
- Cannot lock incomplete batch.
- Failed metadata/snapshot validation leaves batch as `DRAFT` and does not freeze assets.

---

## Task 27: Implement Record Schedule

Method:

```php
public function recordSchedule(string $batchId, array $data, ?string $actorId = null): AuctionBatch
```

Input:

```php
[
    'no_surat_persetujuan' => '...',
    'tanggal_surat_persetujuan' => 'YYYY-MM-DD',
    'no_surat_penetapan' => '...',
    'tanggal_lelang' => 'YYYY-MM-DD',
]
```

Rules:
- Transition `DIAJUKAN -> JADWAL_DITETAPKAN`.
- All fields required.
- This is manual external document tracking; do not imply system approval.
- Write audit `schedule.recorded` and `status.changed`.

Acceptance criteria:
- Missing field returns 422.
- Status updates to `JADWAL_DITETAPKAN`.

---

## Task 28: Implement First Auction Results

Method:

```php
public function recordFirstAuctionResults(string $batchId, array $assets, ?string $actorId = null): AuctionBatch
```

Input:

```php
[
    [
        'bmn_asset_id' => 'uuid',
        'first_auction_is_sold' => true,
        'first_auction_price' => 1600000,
    ],
]
```

Rules:
- Batch must be `JADWAL_DITETAPKAN`.
- Results must cover every asset in batch.
- If sold true, price is required and >= 0.
- If sold false, price must be null or 0.
- Write audit `first_auction.result.recorded`.
- Do not transition status automatically in this method.

Acceptance criteria:
- Partial results rejected.
- All results saved to pivot.

---

## Task 29: Implement Start Lelang Ulang

Method:

```php
public function startReauction(string $batchId, array $data, ?string $actorId = null): AuctionBatch
```

Input:

```php
[
    'no_surat_jadwal_ulang' => '...',
    'tanggal_lelang_ulang' => 'YYYY-MM-DD',
    'reauction_notes' => 'optional',
]
```

Rules:
- Transition `JADWAL_DITETAPKAN -> LELANG_ULANG`.
- First auction results must exist for every asset.
- At least one asset has `first_auction_is_sold = false`.
- `reauction_count` must be 0.
- Set `reauction_count = 1`.
- Save schedule ulang fields.
- Write audit `reauction.started` and `status.changed`.

Acceptance criteria:
- All sold batch cannot enter `LELANG_ULANG`.
- Second reauction attempt rejected.

---

## Task 30: Implement Reauction Results

Method:

```php
public function recordReauctionResults(string $batchId, array $assets, ?string $actorId = null): AuctionBatch
```

Rules:
- Batch must be `LELANG_ULANG`.
- Only assets not sold in first auction are accepted.
- Results must cover all first-auction-unsold assets.
- If `reauction_is_sold = true`, `reauction_price` required >= 0.
- Write audit `reauction.result.recorded`.
- Do not dispose assets here.

Acceptance criteria:
- Cannot submit result for first-auction-sold asset.
- Partial reauction results rejected.

---

## Task 31: Implement Final Realization

Method:

```php
public function realize(string $batchId, ?string $actorId = null): AuctionBatch
```

Rules:
- Batch must be `JADWAL_DITETAPKAN` or `LELANG_ULANG`.
- If status `JADWAL_DITETAPKAN`, first auction results must exist for every asset.
- If status `LELANG_ULANG`, reauction results must exist for every first-auction-unsold asset.
- For each asset:
  - If sold in first auction:
    - `final_result = SOLD_FIRST`
    - `final_price = first_auction_price`
    - `final_auction_date = batch.tanggal_lelang`
    - update asset `tanggal_pengapusan = tanggal_lelang`
    - call `AssetService::disposeAsset(...)`
    - set pivot `disposed_at`
    - audit `asset.disposed`
  - Else if sold in reauction:
    - `final_result = SOLD_REAUCTION`
    - `final_price = reauction_price`
    - `final_auction_date = batch.tanggal_lelang_ulang`
    - update asset `tanggal_pengapusan = tanggal_lelang_ulang`
    - call `AssetService::disposeAsset(...)`
    - set pivot `disposed_at`
    - audit `asset.disposed`
  - Else:
    - `final_result = UNSOLD`
    - restore asset from `freeze_snapshot`
    - audit `asset.restored`
- Update batch:
  - `status = REALISASI`
  - `realized_at = now()`
- Write audit `realization.finalized` and `status.changed`.

Transaction required.

Idempotency:
- If batch already `REALISASI`, reject.
- If any pivot sold asset already has `disposed_at`, reject to avoid double disposal.

Acceptance criteria:
- Sold assets soft-deleted.
- Unsold assets restored.
- Batch read-only after realization.

---

## Task 32: Implement Cancel Batch

Method:

```php
public function cancel(string $batchId, ?string $notes = null, ?string $actorId = null): AuctionBatch
```

Rules:
- Allowed from:
  - `DRAFT`
  - `DIAJUKAN`
  - `JADWAL_DITETAPKAN`
  - `LELANG_ULANG`
- If `DRAFT` and no freeze snapshots:
  - do not change asset operational fields.
- If status after freeze:
  - restore every asset from `freeze_snapshot`.
- Set `final_result = CANCELED` on pivot rows if useful.
- Update batch:
  - `status = BATAL`
  - `canceled_at = now()`
- Audit:
  - `batch.canceled`
  - `status.changed`
  - `asset.restored` for each restored asset.

Acceptance criteria:
- Cannot cancel `REALISASI`.
- Cannot cancel `BATAL`.
- Batch read-only after cancel.

---

## Task 33: Create Form Requests

Target folder:

```text
backend/app/Modules/Bmn/Requests/
```

Create:

```text
CreateAuctionBatchRequest.php
AddAuctionAssetsRequest.php
UpdateAuctionAssetOrderRequest.php
UpdateAuctionValuationRequest.php
TransitionAuctionBatchRequest.php
FirstAuctionResultsRequest.php
ReauctionResultsRequest.php
PrintAuctionDocumentEventRequest.php
```

Important validation notes:
- Do not use unreliable wildcard `required_if:assets.*.field,true`.
- Use `withValidator()` for nested per-row conditional validation.

Example conditional validation:

```php
public function withValidator($validator): void
{
    $validator->after(function ($validator) {
        foreach ($this->input('assets', []) as $index => $asset) {
            if (($asset['first_auction_is_sold'] ?? false) && ! isset($asset['first_auction_price'])) {
                $validator->errors()->add("assets.$index.first_auction_price", 'Harga terbentuk wajib diisi untuk aset terjual.');
            }
        }
    });
}
```

Acceptance criteria:
- Validation errors point to the correct field.
- Authorization checks permission where static; dynamic status permission can be checked in controller/service.

---

## Task 34: Create API Resources

Target folder:

```text
backend/app/Modules/Bmn/Resources/
```

Create:

```text
AuctionBatchResource.php
AuctionBatchAssetResource.php
AuctionBatchEventResource.php
AuctionCandidateAssetResource.php
```

`AuctionBatchResource` should include:

```text
id
batch_number
name
status
status_label
is_read_only
no_surat_persetujuan
tanggal_surat_persetujuan
no_surat_penetapan
tanggal_lelang
reauction_count
no_surat_jadwal_ulang
tanggal_lelang_ulang
reauction_notes
metadata
assets_count
nilai_taksiran_total
created_at
updated_at
metadata_schema_version
validity_warning
available_transitions
```

`AuctionBatchAssetResource` should include pivot data clearly under `auction`.
It must also include:

```text
document_readiness
requires_document_review
document_readiness_warnings
```

`AuctionCandidateAssetResource` should include enough fields for candidate table and `active_auction_batch_id`.
It must also include:

```text
document_readiness
requires_document_review
document_readiness_warnings
```

Integrated quality gate:
- Complete Task 70 together with this task.
- Do not mark this resource task done until candidate, batch, and batch asset resources expose readiness/validity fields.

Acceptance criteria:
- Frontend does not need to parse raw Laravel pivot names.
- Frontend does not need separate per-asset requests to show readiness warnings.

---

## Task 35: Create AuctionBatchController

Target file:

```text
backend/app/Modules/Bmn/Controllers/AuctionBatchController.php
```

Required methods:

```php
index()
store()
show()
destroy()
candidates()
checklist()
addAssets()
removeAsset()
updateOrder()
updateValuation()
transition()
recordFirstAuctionResults()
recordReauctionResults()
realize()
documentContext()
recordPrintEvent()
events()
```

Rules:
- Controller should be thin.
- Business logic stays in services.
- Return resources, not raw models where possible.
- Catch validation exceptions naturally; do not convert all exceptions to 200.
- For domain exceptions, return 422.

Acceptance criteria:
- Every method maps to an API endpoint.
- Store returns HTTP 201.

---

## Task 36: Register API Routes

Target file:

```text
backend/app/Modules/Bmn/Routes/api.php
```

Add routes under existing BMN auth middleware group.

Routes:

```php
Route::get('/auction-candidates', [AuctionBatchController::class, 'candidates'])
    ->middleware('permission:bmn.auction.view');

Route::prefix('auction-batches')->group(function () {
    Route::get('/', [AuctionBatchController::class, 'index'])->middleware('permission:bmn.auction.view');
    Route::post('/', [AuctionBatchController::class, 'store'])->middleware('permission:bmn.auction.create');
    Route::get('/{id}', [AuctionBatchController::class, 'show'])->middleware('permission:bmn.auction.view');
    Route::delete('/{id}', [AuctionBatchController::class, 'destroy'])->middleware('permission:bmn.auction.delete');

    Route::get('/{id}/checklist', [AuctionBatchController::class, 'checklist'])->middleware('permission:bmn.auction.view');
    Route::post('/{id}/assets', [AuctionBatchController::class, 'addAssets'])->middleware('permission:bmn.auction.update');
    Route::delete('/{id}/assets/{assetId}', [AuctionBatchController::class, 'removeAsset'])->middleware('permission:bmn.auction.update');
    Route::put('/{id}/assets/order', [AuctionBatchController::class, 'updateOrder'])->middleware('permission:bmn.auction.update');
    Route::put('/{id}/assets/{assetId}/valuation', [AuctionBatchController::class, 'updateValuation'])->middleware('permission:bmn.auction.update');
    Route::post('/{id}/transition', [AuctionBatchController::class, 'transition']);
    Route::post('/{id}/first-auction-results', [AuctionBatchController::class, 'recordFirstAuctionResults'])->middleware('permission:bmn.auction.finalize');
    Route::post('/{id}/reauction-results', [AuctionBatchController::class, 'recordReauctionResults'])->middleware('permission:bmn.auction.finalize');
    Route::post('/{id}/realize', [AuctionBatchController::class, 'realize'])->middleware('permission:bmn.auction.finalize');
    Route::get('/{id}/documents/context', [AuctionBatchController::class, 'documentContext'])->middleware('permission:bmn.auction.print');
    Route::post('/{id}/documents/{documentKey}/print-event', [AuctionBatchController::class, 'recordPrintEvent'])->middleware('permission:bmn.auction.print');
    Route::get('/{id}/events', [AuctionBatchController::class, 'events'])->middleware('permission:bmn.auction.view');
});
```

Note:
- `transition` must check permission dynamically:
  - `DIAJUKAN`: `bmn.auction.update`
  - `JADWAL_DITETAPKAN`, `LELANG_ULANG`, `BATAL`: `bmn.auction.finalize`

Acceptance criteria:
- `php artisan route:list --path=bmn/auction` shows routes.

---

## Task 37: Backend Feature Tests

Target file:

```text
backend/tests/Feature/Bmn/AuctionBatchTest.php
```

Write tests:

1. Can create draft batch.
2. Create returns 201.
3. Can add rusak berat asset to draft batch.
4. Cannot add same asset to another active batch.
5. Can update Lot and Nilai Taksiran in draft.
6. Cannot update Lot after DIAJUKAN.
7. Cannot lock incomplete batch.
8. Can lock complete batch to DIAJUKAN and freeze asset.
9. Can record schedule to JADWAL_DITETAPKAN.
10. Can record first auction result.
11. Cannot start LELANG_ULANG if all assets sold.
12. Can start LELANG_ULANG if at least one asset unsold.
13. Cannot start second LELANG_ULANG.
14. Can record reauction result.
15. Realization disposes sold assets.
16. Realization restores unsold assets.
17. Cancel restores frozen assets.
18. REALISASI batch is read-only.
19. BATAL batch is read-only.
20. Audit events are created for key actions.
21. Metadata builder freezes signatory fields and document numbers.
22. Asset snapshot contains `schema_version` and `document_readiness`.
23. Freeze snapshot contains `schema_version` and previous asset state.
24. Document readiness detects complete vehicle, incomplete vehicle, non-vehicle, and ambiguous assets.
25. Validity service returns advisory warning for approval review window.
26. Invalid JSON contract blocks `DRAFT -> DIAJUKAN` without partial asset freeze.
27. API resources expose `metadata_schema_version`, `validity_warning`, `document_readiness`, and `available_transitions`.

Acceptance criteria:

```powershell
cd backend
php artisan test --filter=AuctionBatchTest
```

passes.

---

## Task 38: Backend Static Verification

Commands:

```powershell
cd backend
php artisan route:list --path=bmn/auction
php artisan test --filter=AuctionBatchTest
php artisan test
```

If full test suite is slow, at minimum run:

```powershell
php artisan test --filter=AuctionBatchTest
```

Acceptance criteria:
- Routes registered.
- Auction tests pass.
- No syntax errors.
- Tests from Tasks 65-70 are included in the backend test run or explicitly documented if split into separate test files.

---

## Task 39: Frontend Types and API Client

Target file:

```text
frontend/src/app/bmn/auction-batches/_lib/api.ts
```

Create types:

```ts
export type AuctionBatchStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "JADWAL_DITETAPKAN"
  | "LELANG_ULANG"
  | "REALISASI"
  | "BATAL";
```

Also create contract types:

```ts
export type AuctionDocumentReadiness = {
  asset_type: "vehicle" | "general";
  requires_document_review: boolean;
  warnings: string[];
  items: Record<string, "ok" | "warning" | "blocking" | "unknown">;
};

export type AuctionValidityWarning = {
  approval_review_window_months: number;
  approval_review_until: string | null;
  requires_revaluation_review: boolean;
  message: string | null;
};

export type AuctionAvailableTransition =
  | "DIAJUKAN"
  | "JADWAL_DITETAPKAN"
  | "LELANG_ULANG"
  | "REALISASI"
  | "BATAL";
```

Methods:

```text
getCandidates
getBatches
createBatch
getBatch
getChecklist
addAssets
removeAsset
updateOrder
updateValuation
transition
recordFirstAuctionResults
recordReauctionResults
realize
getDocumentContext
recordPrintEvent
getEvents
```

Acceptance criteria:
- API client matches backend route names.
- API response types include readiness warning, validity warning, metadata schema version, read-only state, and available transitions.
- No stale old `harga_terbentuk` interface except where intentionally mapped to first/reauction price.

---

## Task 40: Frontend Status Helpers

Target file:

```text
frontend/src/app/bmn/auction-batches/_lib/status.ts
```

Include:

```text
status label
badge tone
isReadOnly
canEditDraft
canShowScheduleTab
canShowRealizationTab
nextActionLabel
```

Acceptance criteria:
- All six statuses have labels.
- No undefined UI state for `LELANG_ULANG`.

---

## Task 41: Frontend Candidate Page Refactor

Target:

```text
frontend/src/app/bmn/auction-candidates/page.tsx
```

Goal:
- Convert this page into **Kandidat Rusak Berat** selector.
- Remove or hide old all-in-one document generator workflow after new batch flow is ready.

UI requirements:
- Header: `Kandidat Rusak Berat`
- Summary tiles:
  - total kandidat
  - dipilih
  - nilai perolehan dipilih
- Search/filter.
- Table with selectable rows.
- Disabled indicator if asset has `active_auction_batch_id`.
- Compact document-readiness indicator per row from `document_readiness_warnings`.
- Tooltip or expandable row note for warnings such as missing BPKB/STNK/nomor rangka.
- Primary button: `Buat Paket Lelang`.
- Modal asks for batch name.
- Submit calls `createBatch({ name, asset_ids })`.
- On success redirect to `/bmn/auction-batches/[id]`.

Integrated quality gate:
- Complete candidate-page part of Task 71 together with this task.
- Do not duplicate vehicle detection logic in frontend; render what API returns.

Acceptance criteria:
- Page no longer serves as primary 13-document print center.
- User can create batch from selected assets.
- User can see assets that need document review before creating batch.

---

## Task 42: Sidebar Navigation

Primary target file:

```text
frontend/src/app/bmn/layout.tsx
```

Add menu:

```text
Kandidat Rusak Berat -> /bmn/auction-candidates
Paket Lelang BMN -> /bmn/auction-batches
```

Permission:
- Show if user has `bmn.auction.view` or current BMN access pattern allows module route.
- Replace old `bmn.document.generate` gate for auction candidate menu if it is still used only for the old candidate route.
- Keep unrelated BMN menu items unchanged.

Acceptance criteria:
- Both routes reachable from sidebar.
- User without BMN auction access does not see auction batch menu.
- User with `bmn.auction.view` can open both auction routes.

---

## Task 43: Batch List Page

Target:

```text
frontend/src/app/bmn/auction-batches/page.tsx
```

UI:
- Header `Paket Lelang BMN`.
- Search.
- Status filter.
- Button `Buat Paket`.
- Table/list:
  - nomor batch
  - nama
  - status
  - jumlah aset
  - total nilai taksiran
  - tanggal lelang
  - updated_at
  - action `Lihat`
- Empty state points user to candidate page.

Acceptance criteria:
- Filter status includes `LELANG_ULANG`.
- Loading skeleton exists.

---

## Task 44: Batch Detail Shell

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/page.tsx
```

UI:
- Load batch by ID.
- Sticky header:
  - batch name
  - batch_number
  - status badge
  - total assets
  - total nilai taksiran
- Status timeline six statuses.
- Tabs:
  - Aset & Lot
  - Nilai Taksiran / Kertas Kerja
  - Penandatangan & Nomor Dokumen
  - Pusat Dokumen
  - Jadwal Lelang
  - Realisasi & Lelang Ulang
  - Riwayat/Audit

Acceptance criteria:
- Read-only state is passed to each tab.
- Invalid ID shows error state.

---

## Task 45: Aset & Lot Tab

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/AssetsLotTab.tsx
```

Features:
- Show current assets in batch.
- Add candidate assets while `DRAFT`.
- Remove asset while `DRAFT`.
- Reorder while `DRAFT`.
- Edit `lot_number` while `DRAFT`.
- Save order.
- Show document-readiness warning column from API.
- Preserve frozen readiness display after status is no longer `DRAFT`.

Acceptance criteria:
- All controls disabled/read-only after `DRAFT`.
- Error messages from backend displayed near action.
- Warning display does not imply legal approval/rejection.

---

## Task 46: Valuation / Kertas Kerja Tab

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/ValuationTab.tsx
```

Features:
- Per asset:
  - display nilai perolehan
  - input nilai taksiran
  - open worksheet modal
- Save to update valuation endpoint.
- Show audit timestamp if available.

Acceptance criteria:
- `nilai_taksiran > 0` visually required before lock.
- Read-only after `DRAFT`.

---

## Task 47: Signatories and Document Numbers Tab

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/SignatoriesDocumentsTab.tsx
```

Features:
- Kepala Balai picker.
- Panitia editor.
- Tim Penilai/Penaksir editor.
- Pemeriksa editor.
- Document numbers and dates editor.
- Checklist panel from API.
- Button `Kunci & Ajukan Paket`.

Rules:
- Button disabled if checklist incomplete.
- Checklist must show blocking items separately from advisory readiness warnings.
- Readiness warning copy should use wording like `Perlu review dokumen`, not `Tidak disetujui`.
- On click, show confirmation dialog:
  - "Setelah dikunci, aset dan dokumen tidak dapat diedit."
- Submit transition `DIAJUKAN`.

Acceptance criteria:
- Frozen metadata is used after lock.
- Fields read-only after `DIAJUKAN`.
- User can lock only when blocking checklist items pass.

---

## Task 48: Jadwal Lelang Tab

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/ScheduleTab.tsx
```

Fields:
- `no_surat_persetujuan`
- `tanggal_surat_persetujuan`
- `no_surat_penetapan`
- `tanggal_lelang`

UX copy:
- Make it clear these are manually recorded external document fields.
- Do not say "disetujui oleh sistem".
- If API returns `validity_warning.requires_revaluation_review = true`, show advisory banner asking operator to review external requirements before proceeding.
- Banner copy must not say the system approves, rejects, validates, or invalidates the external document.

Integrated quality gate:
- Complete schedule-tab part of Task 71 together with this task.

Availability:
- Editable only in `DIAJUKAN` for `bmn.auction.finalize`.
- Read-only otherwise.

Acceptance criteria:
- Successful submit transitions to `JADWAL_DITETAPKAN`.
- Advisory validity warning appears when returned by API and never blocks by frontend-only logic.

---

## Task 49: First Auction Result UI

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/RealizationTab.tsx
```

When status `JADWAL_DITETAPKAN`:
- Show all assets.
- For each:
  - sold toggle
  - price input if sold
- Button `Simpan Hasil Lelang Pertama`.
- If results saved and at least one unsold:
  - show `Mulai Lelang Ulang`
  - show `Finalisasi Tanpa Lelang Ulang`
- If all sold:
  - show `Finalisasi Realisasi`.

Acceptance criteria:
- Cannot submit partial results.
- Price required for sold assets.

---

## Task 50: Lelang Ulang UI

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/ReauctionPanel.tsx
```

When starting:
- Modal/input:
  - no_surat_jadwal_ulang
  - tanggal_lelang_ulang
  - reauction_notes

When status `LELANG_ULANG`:
- Show only first-auction-unsold assets.
- For each:
  - sold toggle
  - reauction price input if sold
- Button `Simpan Hasil Lelang Ulang`.
- Button `Finalisasi Realisasi`.

Acceptance criteria:
- UI never offers second lelang ulang.
- UI says "maksimal 1 kali".

---

## Task 51: Final Realization Confirmation UI

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/FinalRealizationDialog.tsx
```

Dialog content:
- Count sold assets.
- Count unsold assets.
- Explain:
  - sold assets will be assigned `tanggal_pengapusan` and disposed.
  - unsold assets will be restored to previous status.
  - batch becomes read-only.
- Require checkbox:
  - "Saya memahami finalisasi ini akan mengunci batch."

Acceptance criteria:
- Finalize button disabled until checkbox checked.

---

## Task 52: Cancel Batch UI

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/CancelBatchDialog.tsx
```

Rules:
- Available before final status if user has `bmn.auction.finalize`.
- Ask for notes.
- Explain restore behavior.
- Submit transition `BATAL`.

Acceptance criteria:
- After cancel, UI becomes read-only and watermark mode BATAL is visible.

---

## Task 53: Document Context API Integration

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/PrintingCenterTab.tsx
```

Rules:
- Fetch `/documents/context`.
- Use database batch data, not temporary page state.
- Show document cards in groups.
- Each print action records print event.
- Require `metadata_schema_version` and document context schema metadata in the response.
- If document context returns unsupported metadata schema, show clear error and do not render stale/wrong document.

Integrated quality gate:
- Complete Task 72 shared document shell and schema handling together with this task.

Acceptance criteria:
- Print center works after page reload.
- Data still present after browser refresh.
- Document center uses frozen metadata and frozen asset snapshots after `DIAJUKAN`.

---

## Task 54: Port Existing 13 Document Components

Source:

```text
frontend/src/app/bmn/auction-candidates/_components/
```

Destination:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/documents/
```

Rules:
- Do not rely on `orderedSelectedAssets` local state.
- Accept props from document context.
- Use frozen metadata for status after `DIAJUKAN`.
- Use frozen asset snapshot for asset rows after `DIAJUKAN`.
- Do not read live employee/asset master data directly inside document components.
- Follow the split checkpoints in Task 72 instead of porting all 13 documents as one large undifferentiated change.
- Watermark:
  - DRAFT: `DRAFT - BELUM UNTUK DIKIRIM`
  - BATAL: `BATAL - ARSIP`

Acceptance criteria:
- All 13 documents render from batch context.
- Existing print layout fidelity preserved.
- Unsupported `metadata.schema_version` produces a visible error instead of a silent bad render.

---

## Task 55: Audit Trail Tab

Target:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/AuditTrailTab.tsx
```

Features:
- Fetch paginated events.
- Columns:
  - time
  - actor
  - action
  - asset
  - notes
- Expand row to see previous/new values JSON.

Acceptance criteria:
- Key events visible after full workflow.

---

## Task 56: Frontend Permission Guards

Implement helpers:

```text
canViewAuction
canCreateAuction
canUpdateAuction
canPrintAuction
canFinalizeAuction
```

Rules:
- Hide actions user cannot do.
- Still show read-only data where `view` allowed.

Acceptance criteria:
- Operator cannot see finalize-only buttons if lacking permission.

---

## Task 57: Frontend Loading, Empty, Error States

Apply to:
- candidate page
- batch list
- batch detail
- every tab with API calls

Required states:
- skeleton/loading
- empty
- error with retry
- saving button disabled state
- toast success/failure

Acceptance criteria:
- No blank white screen during API failure.

---

## Task 58: Frontend Typecheck and Lint

Commands:

```powershell
cd frontend
npx tsc --noEmit
npm run lint
```

Acceptance criteria:
- TypeScript passes.
- Lint passes.

---

## Task 59: Backend and Frontend Integration Smoke Test

Manual flow:

1. Login as user with all `bmn.auction.*`.
2. Open `/bmn/auction-candidates`.
3. Select at least 2 Rusak Berat assets.
4. Create batch.
5. Fill Lot and Nilai Taksiran.
6. Fill signatories and document numbers/dates.
7. Lock to `DIAJUKAN`.
8. Record schedule to `JADWAL_DITETAPKAN`.
9. Mark one asset sold and one unsold.
10. Start `LELANG_ULANG`.
11. Mark reauction result.
12. Finalize.
13. Confirm sold asset disposed and unsold asset restored.
14. Check audit trail.
15. Check print center watermark behavior.

Acceptance criteria:
- Full flow completes without database inconsistency.

---

## Task 60: Update Progress Documentation

Target files:

```text
docs/progress.md
docs/HANDOFF.md
```

Add:
- Phase name.
- Scope completed.
- Tests run.
- Known limitations.
- Next steps.

Acceptance criteria:
- Handoff reflects current branch and implementation status.

---

## Task 61: Final Backend Quality Gate

Commands:

```powershell
cd backend
php artisan test
php artisan route:list --path=bmn/auction
```

Optional:

```powershell
composer validate
```

Acceptance criteria:
- Tests pass or failures documented clearly.

---

## Task 62: Final Frontend Quality Gate

Commands:

```powershell
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

Acceptance criteria:
- Build passes.
- No lint warnings if project requires zero warnings.

---

## Task 63: Manual DB Verification Queries

Run after full workflow:

```sql
select batch_number, status, reauction_count, realized_at
from bmn_auction_batches
order by created_at desc
limit 5;
```

```sql
select final_result, final_price, final_auction_date, disposed_at
from bmn_asset_auction_batch
where bmn_auction_batch_id = '<batch-id>';
```

```sql
select action, count(*)
from bmn_auction_batch_events
where bmn_auction_batch_id = '<batch-id>'
group by action
order by action;
```

Acceptance criteria:
- Batch final status matches UI.
- Sold/unsold final result correct.
- Audit events present.

---

## Task 64: Pre-PR Review Checklist

Check:

- [ ] No status outside six approved statuses.
- [ ] No old `harga_terbentuk` single-result logic remains in new code.
- [ ] No hardcoded restore to `Aktif`.
- [ ] `LELANG_ULANG` limited to 1.
- [ ] `REALISASI` and `BATAL` read-only.
- [ ] Create returns 201.
- [ ] Print center uses database context.
- [ ] `/bmn/auction-candidates` is candidate selector, not primary print center.
- [ ] Permissions enforced backend-side.
- [ ] Audit events written.
- [ ] Tests pass or blockers documented.

Acceptance criteria:
- Reviewer can trace every requirement into task/code/test.

---

## Task 65: Create Versioned Metadata Builder

Integrated into:
- Task 18: service dependencies.
- Task 26: lock to `DIAJUKAN`.
- Task 53: document context.

Completion rule:
- Do not complete Task 26 or Task 53 until this task is done.

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionBatchMetadataBuilder.php
```

Purpose:
- Build frozen `metadata` for `bmn_auction_batches.metadata`.
- Remove guessing from document renderer.
- Preserve historical print output after master employee data changes.

Required method:

```php
public function buildForLock(AuctionBatch $batch, User $actor, array $input): array
```

Returned JSON structure:

```php
[
    'schema_version' => 1,
    'locked_at' => now()->toIso8601String(),
    'locked_by' => $actor->id,
    'signatories' => [
        'kepala_balai' => [
            'id' => 'employee-uuid',
            'nama' => '...',
            'nip' => '...',
            'golongan' => '...',
            'jabatan' => '...',
            'unit_kerja' => '...',
            'source' => 'employees',
        ],
    ],
    'committees' => [
        'panitia_penghapusan' => [],
        'tim_penilai' => [],
        'pemeriksa' => [],
    ],
    'document_numbers' => [],
    'document_dates' => [],
    'print_config' => [
        'paper' => 'A4',
        'locale' => 'id-ID',
        'currency' => 'IDR',
    ],
    'document_versions' => [],
]
```

Implementation details:
- Read employee data from the existing employee model/repository used by BMN document pages.
- Copy values into metadata; do not store only employee IDs.
- Normalize empty optional fields to `null`, not empty string.
- Keep key names snake_case.
- Add a private method for mapping employee/signatory shape.
- Add validation so required signatory and document keys exist before lock.

Acceptance criteria:
- Locking a batch writes `metadata.schema_version = 1`.
- Printed documents after `DIAJUKAN` read frozen `metadata`, not live employee data.
- Unit test proves changing employee name after lock does not change document context.

---

## Task 66: Create Asset Snapshot Builder

Integrated into:
- Task 16: canonical snapshot builder service.
- Task 26: lock to `DIAJUKAN`.
- Task 28-31: realization, reauction finalization, and cancel rollback.

Completion rule:
- Do not create a second overlapping snapshot service. The canonical file is `AuctionAssetSnapshotBuilder.php`.

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionAssetSnapshotBuilder.php
```

Purpose:
- Build `asset_snapshot` for each row in `bmn_asset_auction_batch`.
- Keep document rendering stable even if asset master data changes.

Required method:

```php
public function build(Asset $asset): array
```

Required keys:

```text
schema_version
id
kode_barang
nup
nup_lama
nama_barang
merk_tipe
kondisi
status_penggunaan
lokasi
nilai_perolehan
nilai_buku
vehicle_identifiers
document_readiness
```

Rules:
- `vehicle_identifiers` must include available fields only: `no_polisi`, `no_rangka`, `no_mesin`, `no_bpkb`, `no_stnk`.
- Missing master fields must not crash snapshot builder.
- `document_readiness` must come from `AuctionAssetDocumentReadinessService`.
- Snapshot is created or refreshed only while batch is `DRAFT` or during lock; after `DIAJUKAN`, old snapshot must be preserved.

Acceptance criteria:
- Vehicle asset snapshot includes vehicle identifiers when present.
- Non-vehicle snapshot still has `document_readiness.asset_type = general`.
- Snapshot builder has unit tests for vehicle, non-vehicle, and missing optional fields.

---

## Task 67: Create Document Readiness Service

Integrated into:
- Task 17: completeness checker.
- Task 34: API resources.
- Task 35: candidates endpoint.
- Task 41 and Task 45: frontend warning display.

Completion rule:
- Do not implement vehicle/readiness detection in frontend.

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionAssetDocumentReadinessService.php
```

Purpose:
- Classify asset readiness without turning the app into legal approval.
- Show warnings for incomplete document data.

Required methods:

```php
public function evaluate(Asset $asset): array
public function detectAssetType(Asset $asset): string
```

Output shape:

```php
[
    'asset_type' => 'vehicle', // or general
    'requires_document_review' => true,
    'warnings' => [
        'Nomor BPKB belum tersedia di master aset.',
    ],
    'items' => [
        'bpkb' => 'warning',
        'stnk' => 'ok',
        'no_polisi' => 'ok',
        'no_rangka' => 'ok',
        'no_mesin' => 'ok',
    ],
]
```

Vehicle detection rules:
- Return `vehicle` if asset has `no_polisi`, `no_rangka`, `no_mesin`, `no_stnk`, or `no_bpkb`.
- Return `vehicle` if existing category/type field clearly indicates kendaraan, alat angkutan, roda dua, roda empat, or motor.
- If unsure, return `general`; do not over-classify.

Blocking rules:
- Default missing fields are warnings only.
- If backend config later adds required readiness fields, service may return `blocking = true` for those fields.
- UI must display service result and must not duplicate vehicle detection logic.

Acceptance criteria:
- Unit tests cover complete vehicle documents, incomplete vehicle documents, non-vehicle assets, and ambiguous assets.
- Candidate API returns readiness result.
- Batch detail asset list returns readiness result.

---

## Task 68: Create Administrative Validity Service

Integrated into:
- Task 27: record schedule.
- Task 34: API resources.
- Task 48: Jadwal Lelang tab.

Completion rule:
- This service returns advisory warnings only. It must not change status or block transitions by itself.

Target file:

```text
backend/app/Modules/Bmn/Services/AuctionBatchValidityService.php
```

Purpose:
- Compute advisory warning for external/manual approval review window.
- Avoid hardcoding legal decision behavior into status transitions.

Required method:

```php
public function approvalReviewWarning(AuctionBatch $batch): array
```

Output shape:

```php
[
    'approval_review_window_months' => 6,
    'approval_review_until' => '2026-12-22',
    'requires_revaluation_review' => false,
    'message' => null,
]
```

Rules:
- Read default window from config, fallback to 6 months.
- If `tanggal_surat_persetujuan` is null, return all warning fields as non-warning.
- If status is `REALISASI` or `BATAL`, do not show active warning.
- If today is after `approval_review_until`, return `requires_revaluation_review = true`.
- Message must say operator should review external requirements before proceeding, not that the system rejects or approves the batch.

Acceptance criteria:
- Unit tests cover null date, inside window, outside window, `REALISASI`, and `BATAL`.
- API resource includes warning in batch detail.
- UI displays warning as advisory banner, not blocking error.

---

## Task 69: Add JSON Contract Validation Before Lock

Integrated into:
- Task 17: completeness checker.
- Task 26: lock to `DIAJUKAN`.
- Task 37: backend feature tests.

Completion rule:
- Do not allow partial metadata/snapshot writes. Failed validation leaves batch `DRAFT`.

Target files:

```text
backend/app/Modules/Bmn/Services/BatchCompletenessChecker.php
backend/app/Modules/Bmn/Services/AuctionBatchService.php
```

Implementation:
- During `DRAFT -> DIAJUKAN`, build metadata, asset snapshots, freeze snapshots, and readiness data before changing status.
- Validate required keys exist:
  - `metadata.schema_version`
  - `metadata.locked_at`
  - `metadata.signatories.kepala_balai`
  - `metadata.document_numbers`
  - `metadata.document_dates`
  - each pivot `asset_snapshot.schema_version`
  - each pivot `asset_snapshot.document_readiness`
  - each pivot `freeze_snapshot.previous_status_penggunaan`
  - each pivot `freeze_snapshot.previous_henti_guna`
- If any required key is missing, return validation error and keep status `DRAFT`.
- Wrap the whole lock operation in `DB::transaction()`.

Acceptance criteria:
- Failed metadata/snapshot validation does not partially freeze assets.
- Successful lock creates all JSON with `schema_version = 1`.
- Feature test proves invalid lock stays `DRAFT`.

---

## Task 70: Update API Resources for Readiness and Validity

Integrated into:
- Task 34: API resources.
- Task 35: controller responses.
- Task 39: frontend types.

Completion rule:
- Frontend tasks must not start warning UI until this API contract is available.

Target files:

```text
backend/app/Modules/Bmn/Resources/AuctionCandidateResource.php
backend/app/Modules/Bmn/Resources/AuctionBatchResource.php
backend/app/Modules/Bmn/Resources/AuctionBatchAssetResource.php
```

Add fields:

```text
document_readiness
requires_document_review
document_readiness_warnings
validity_warning
metadata_schema_version
is_read_only
available_transitions
```

Rules:
- Candidate resource gets readiness from live asset data.
- Batch asset resource gets readiness from `asset_snapshot.document_readiness` after lock, and from live readiness service while draft.
- Batch resource gets `validity_warning` from `AuctionBatchValidityService`.
- `metadata_schema_version` is null for draft without metadata.

Acceptance criteria:
- Candidate page can display readiness warnings without extra request per asset.
- Batch detail can display frozen readiness after `DIAJUKAN`.
- API response remains backward-compatible for existing basic fields.

---

## Task 71: Add Frontend Warning UI for Document Readiness and Validity

Integrated into:
- Task 41: candidate page.
- Task 45: Aset & Lot tab.
- Task 47: checklist panel.
- Task 48: Jadwal Lelang tab.

Completion rule:
- Warning UI must use advisory language and must not imply official approval/rejection.

Target files:

```text
frontend/src/app/bmn/auction-candidates/page.tsx
frontend/src/app/bmn/auction-batches/[id]/page.tsx
frontend/src/app/bmn/auction-batches/[id]/_components/*
```

Candidate page UI:
- Add compact warning indicator per row.
- Show tooltip or small expandable text for `document_readiness_warnings`.
- Do not block asset selection unless API marks field as blocking.

Batch detail UI:
- Add advisory banner when `validity_warning.requires_revaluation_review = true`.
- Add readiness warning column in Aset & Lot tab.
- Add checklist row for document readiness review.
- Keep copy clear: "Perlu review dokumen", not "Tidak disetujui".

Design rules:
- Use warning color sparingly.
- Do not use large marketing cards.
- Do not put warning copy inside nested cards.
- Keep table layout scannable for repeated operator use.

Acceptance criteria:
- Operator can see which assets need document review before lock.
- Admin can see approval review warning after schedule data is recorded.
- Warning does not imply the system grants/refuses legal approval.

---

## Task 72: Split and Verify the 13 Document Porting Work

Integrated into:
- Task 53: document context API integration.
- Task 54: document component port.

Completion rule:
- Do not mark Task 54 complete until all split checkpoints below have been verified.

Target source:

```text
frontend/src/app/bmn/auction-candidates/_components/
```

Target destination:

```text
frontend/src/app/bmn/auction-batches/[id]/_components/documents/
```

Split implementation into these checkpoints:

1. Shared document shell:
   - watermark,
   - A4 print CSS,
   - header/footer,
   - signature block,
   - currency/date formatting.
2. Berita Acara documents:
   - BA Koreksi,
   - BA Pemeriksaan.
3. SK documents:
   - SK Penghentian,
   - SK Panitia,
   - SK Tim Penilai,
   - SK Pembentukan Panitia Penaksir.
4. Surat Pernyataan documents:
   - SK Kebenaran,
   - SPTJ Limit,
   - SPTJM,
   - SP Tidak Ganggu Tugas.
5. Surat tugas/pengantar:
   - SP Tugas,
   - Nota Dinas Permohonan Rekomendasi,
   - Surat Permohonan Penjualan Lelang BMN.

Rules:
- Each document receives one normalized `documentContext`.
- No document component may read directly from candidate-page local state.
- Documents in `DRAFT` use current form data plus draft watermark.
- Documents after `DIAJUKAN` use frozen metadata and frozen asset snapshot.
- Unsupported `metadata.schema_version` must show a clear error instead of silently rendering wrong data.

Acceptance criteria:
- All 13 documents render from batch detail print center.
- Print event is recorded for each generated document.
- Reviewer can verify each document against frozen metadata.

---

## Task 73: Final 9.5 Review Checklist

Integrated into:
- Task 61: final backend quality gate.
- Task 62: final frontend quality gate.
- Task 64: pre-PR review checklist.

Completion rule:
- This is the final objective quality gate. If any item is unchecked, document the blocker and do not claim 9.5 readiness.

Check:

- [ ] Requirements 13 and 14 are implemented or intentionally deferred with documented reason.
- [ ] `metadata`, `asset_snapshot`, and `freeze_snapshot` all contain `schema_version`.
- [ ] Vehicle readiness is computed backend-side.
- [ ] Non-vehicle readiness does not create false vehicle warnings.
- [ ] Administrative validity warning is advisory only.
- [ ] No frontend code performs legal approval, rejection, or automatic cancellation.
- [ ] `frontend/src/app/kepegawaian/_components/EmployeeAccessSheet.tsx` exposes `bmn.auction.*` permissions.
- [ ] `frontend/src/app/bmn/layout.tsx` has both auction menus with correct permission gate.
- [ ] `frontend/src/hooks/useRole.ts` fallback does not grant write/finalize auction permission by accident.
- [ ] Unit tests cover metadata builder, snapshot builder, readiness service, validity service, state machine, and rollback.
- [ ] Feature tests cover candidate list, create batch, lock, schedule, first auction, lelang ulang once, realization, cancellation, permissions, and document context.
- [ ] Frontend typecheck, lint, and build pass.

Acceptance criteria:
- A reviewer can honestly score requirements/design/tasks at 9.5 or higher because data contracts, edge cases, file targets, and verification path are explicit.
