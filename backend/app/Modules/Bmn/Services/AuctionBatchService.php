<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Models\AssetAuctionBatch;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Enums\AuctionAssetFinalResult;
use App\Modules\Bmn\Support\AuctionBatchEventAction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class AuctionBatchService
{
    public function __construct(
        private AuctionBatchAuditLogger $auditLogger,
        private AuctionBatchStateMachine $stateMachine,
        private AuctionBatchCompletenessChecker $completenessChecker,
        private AuctionBatchMetadataBuilder $metadataBuilder,
        private AuctionAssetSnapshotBuilder $snapshotBuilder,
        private AuctionAssetDocumentReadinessService $readinessService,
        private AuctionBatchValidityService $validityService,
        private AuctionBatchDocumentWorkflow $documentWorkflow,
        private AssetService $assetService
    ) {}

    /**
     * Generate a unique batch number formatted as LE-YYYYMMDD-0001 (Task 19).
     *
     * @return string
     */
    private function generateBatchNumber(): string
    {
        for ($i = 0; $i < 10; $i++) {
            $candidate = 'LE-' . now()->format('Ymd') . '-' . str_pad((string) random_int(1, 9999), 4, '0', STR_PAD_LEFT);
            if (!AuctionBatch::where('batch_number', $candidate)->exists()) {
                return $candidate;
            }
        }
        throw new RuntimeException('Gagal membuat nomor batch unik.');
    }

    /**
     * Create a new draft auction batch (Task 20).
     *
     * @param array $data
     * @param string|null $actorId
     * @return AuctionBatch
     */
    public function createBatch(array $data, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($data, $actorId) {
            $actorId = $actorId ?? Auth::id();

            $batch = AuctionBatch::create([
                'batch_number' => $this->generateBatchNumber(),
                'name' => $data['name'],
                'status' => AuctionBatchStatus::DRAFT,
                'created_by' => $actorId,
                'updated_by' => $actorId,
            ]);

            if (!empty($data['asset_ids'])) {
                $this->addAssets($batch->id, $data['asset_ids'], $actorId);
            }

            $this->auditLogger->log($batch->id, AuctionBatchEventAction::BATCH_CREATED, $actorId, null, null, $batch->toArray());

            return $batch->load('assets');
        });
    }

    /**
     * Get candidate assets that are in 'Rusak Berat' and not active in other batches (Task 21).
     *
     * @param array $filters
     * @return \Illuminate\Contracts\Pagination\LengthAwarePaginator
     */
    public function getCandidates(array $filters)
    {
        $query = Asset::query()->where('kondisi', 'Rusak Berat');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nama_barang', 'ilike', "%{$search}%")
                  ->orWhere('kode_barang', 'ilike', "%{$search}%")
                  ->orWhere('merk', 'ilike', "%{$search}%")
                  ->orWhere('no_polisi', 'ilike', "%{$search}%");
            });
        }

        if (!empty($filters['nup'])) {
            $nup = $filters['nup'];
            $query->where(function ($q) use ($nup) {
                $q->where('nup', $nup)
                  ->orWhere('nup_lama', $nup);
            });
        }

        $activeStatuses = [
            AuctionBatchStatus::DRAFT->value,
            AuctionBatchStatus::DIAJUKAN->value,
            AuctionBatchStatus::JADWAL_DITETAPKAN->value,
            AuctionBatchStatus::LELANG_ULANG->value,
        ];

        $query->select('bmn_assets.*');

        $query->selectSub(function ($q) use ($activeStatuses) {
            $q->select('bmn_auction_batches.id')
              ->from('bmn_auction_batches')
              ->join('bmn_asset_auction_batch', 'bmn_auction_batches.id', '=', 'bmn_asset_auction_batch.bmn_auction_batch_id')
              ->whereColumn('bmn_asset_auction_batch.bmn_asset_id', 'bmn_assets.id')
              ->whereIn('bmn_auction_batches.status', $activeStatuses)
              ->whereNull('bmn_auction_batches.deleted_at')
              ->limit(1);
        }, 'active_auction_batch_id');

        $query->selectSub(function ($q) use ($activeStatuses) {
            $q->select('bmn_auction_batches.batch_number')
              ->from('bmn_auction_batches')
              ->join('bmn_asset_auction_batch', 'bmn_auction_batches.id', '=', 'bmn_asset_auction_batch.bmn_auction_batch_id')
              ->whereColumn('bmn_asset_auction_batch.bmn_asset_id', 'bmn_assets.id')
              ->whereIn('bmn_auction_batches.status', $activeStatuses)
              ->whereNull('bmn_auction_batches.deleted_at')
              ->limit(1);
        }, 'active_auction_batch_number');

        $perPage = $filters['per_page'] ?? 15;
        return $query->paginate($perPage);
    }

    /**
     * Add assets to a draft auction batch (Task 22).
     *
     * @param string $batchId
     * @param array $assetIds
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function addAssets(string $batchId, array $assetIds, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $assetIds, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if (!$batch->isDraft()) {
                throw ValidationException::withMessages([
                    'status' => 'Aset hanya dapat ditambahkan pada paket lelang berstatus DRAFT.',
                ]);
            }

            foreach ($assetIds as $assetId) {
                $asset = Asset::findOrFail($assetId);

                if ($asset->kondisi !== 'Rusak Berat') {
                    throw ValidationException::withMessages([
                        'asset' => "Aset {$asset->nama_barang} ({$asset->nup}) tidak dalam kondisi Rusak Berat.",
                    ]);
                }

                $activeStatuses = [
                    AuctionBatchStatus::DRAFT->value,
                    AuctionBatchStatus::DIAJUKAN->value,
                    AuctionBatchStatus::JADWAL_DITETAPKAN->value,
                    AuctionBatchStatus::LELANG_ULANG->value,
                ];

                $alreadyActive = DB::table('bmn_asset_auction_batch')
                    ->join('bmn_auction_batches', 'bmn_asset_auction_batch.bmn_auction_batch_id', '=', 'bmn_auction_batches.id')
                    ->where('bmn_asset_auction_batch.bmn_asset_id', $assetId)
                    ->whereIn('bmn_auction_batches.status', $activeStatuses)
                    ->where('bmn_auction_batches.id', '!=', $batchId)
                    ->whereNull('bmn_auction_batches.deleted_at')
                    ->exists();

                if ($alreadyActive) {
                    throw ValidationException::withMessages([
                        'asset' => "Aset {$asset->nama_barang} ({$asset->nup}) sudah terdaftar di paket lelang aktif lainnya.",
                    ]);
                }

                $existsInThisBatch = DB::table('bmn_asset_auction_batch')
                    ->where('bmn_auction_batch_id', $batchId)
                    ->where('bmn_asset_id', $assetId)
                    ->exists();

                if ($existsInThisBatch) {
                    continue;
                }

                $maxSortOrder = DB::table('bmn_asset_auction_batch')
                    ->where('bmn_auction_batch_id', $batchId)
                    ->max('sort_order') ?? -1;

                $sortOrder = $maxSortOrder + 1;
                $snapshot = $this->snapshotBuilder->buildAssetSnapshot($asset);

                AssetAuctionBatch::create([
                    'id' => \Illuminate\Support\Str::uuid()->toString(),
                    'bmn_auction_batch_id' => $batchId,
                    'bmn_asset_id' => $assetId,
                    'sort_order' => $sortOrder,
                    'asset_snapshot' => $snapshot,
                ]);

                $this->auditLogger->log(
                    $batchId,
                    AuctionBatchEventAction::ASSET_ADDED,
                    $actorId,
                    $assetId,
                    null,
                    $snapshot,
                    "Aset {$asset->nama_barang} (NUP: {$asset->nup}) ditambahkan ke batch."
                );
            }

            return $batch->load('assets');
        });
    }

    /**
     * Remove asset from a draft auction batch (Task 23).
     *
     * @param string $batchId
     * @param string $assetId
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function removeAsset(string $batchId, string $assetId, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $assetId, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if (!$batch->isDraft()) {
                throw ValidationException::withMessages([
                    'status' => 'Aset hanya dapat dihapus pada paket lelang berstatus DRAFT.',
                ]);
            }

            $pivot = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                ->where('bmn_asset_id', $assetId)
                ->first();

            if (!$pivot) {
                throw ValidationException::withMessages([
                    'asset' => 'Aset tidak ditemukan dalam paket lelang ini.',
                ]);
            }

            $pivot->delete();

            $pivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                ->orderBy('sort_order')
                ->get();

            foreach ($pivots as $index => $p) {
                $p->sort_order = $index;
                $p->save();
            }

            $this->auditLogger->log(
                $batchId,
                AuctionBatchEventAction::ASSET_REMOVED,
                $actorId,
                $assetId,
                $pivot->asset_snapshot,
                null,
                "Aset dihapus dari batch."
            );

            return $batch->load('assets');
        });
    }

    /**
     * Update assets sort order in a draft batch (Task 24).
     *
     * @param string $batchId
     * @param array $orderedAssetIds
     * @param string|null $actorId
     * @return void
     * @throws ValidationException
     */
    public function updateSortOrder(string $batchId, array $orderedAssetIds, ?string $actorId = null): void
    {
        DB::transaction(function () use ($batchId, $orderedAssetIds, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if (!$batch->isDraft()) {
                throw ValidationException::withMessages([
                    'status' => 'Urutan aset hanya dapat diubah pada paket lelang berstatus DRAFT.',
                ]);
            }

            $currentPivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();
            $currentAssetIds = $currentPivots->pluck('bmn_asset_id')->toArray();

            if (count($orderedAssetIds) !== count($currentAssetIds) || !empty(array_diff($orderedAssetIds, $currentAssetIds)) || !empty(array_diff($currentAssetIds, $orderedAssetIds))) {
                throw ValidationException::withMessages([
                    'assets' => 'Daftar ID aset tidak sesuai dengan aset yang ada di batch.',
                ]);
            }

            $previousOrder = $currentPivots->sortBy('sort_order')->pluck('bmn_asset_id')->toArray();

            foreach ($orderedAssetIds as $index => $assetId) {
                AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                    ->where('bmn_asset_id', $assetId)
                    ->update(['sort_order' => $index]);
            }

            $this->auditLogger->log(
                $batchId,
                AuctionBatchEventAction::ASSET_ORDER_UPDATED,
                $actorId,
                null,
                ['order' => $previousOrder],
                ['order' => $orderedAssetIds],
                "Urutan aset diperbarui."
            );
        });
    }

    /**
     * Update asset valuation and lot in a draft batch (Task 25).
     *
     * @param string $batchId
     * @param string $assetId
     * @param array $data
     * @param string|null $actorId
     * @return AssetAuctionBatch
     * @throws ValidationException
     */
    public function updateValuation(string $batchId, string $assetId, array $data, ?string $actorId = null): AssetAuctionBatch
    {
        return DB::transaction(function () use ($batchId, $assetId, $data, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if (!$batch->isDraft()) {
                throw ValidationException::withMessages([
                    'status' => 'Nilai taksiran hanya dapat diubah pada paket lelang berstatus DRAFT.',
                ]);
            }



            $pivot = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                ->where('bmn_asset_id', $assetId)
                ->first();

            if (!$pivot) {
                throw ValidationException::withMessages([
                    'asset' => 'Aset tidak ditemukan dalam paket lelang ini.',
                ]);
            }

            $previousValues = [
                'lot_number' => $pivot->lot_number,
                'nilai_taksiran' => $pivot->nilai_taksiran,
                'kertas_kerja_data' => $pivot->kertas_kerja_data,
            ];

            $pivot->lot_number = array_key_exists('lot_number', $data) ? $data['lot_number'] : $pivot->lot_number;
            $pivot->nilai_taksiran = array_key_exists('nilai_taksiran', $data) ? $data['nilai_taksiran'] : $pivot->nilai_taksiran;
            $pivot->kertas_kerja_data = array_key_exists('kertas_kerja_data', $data) ? $data['kertas_kerja_data'] : $pivot->kertas_kerja_data;
            $pivot->save();

            $newValues = [
                'lot_number' => $pivot->lot_number,
                'nilai_taksiran' => $pivot->nilai_taksiran,
                'kertas_kerja_data' => $pivot->kertas_kerja_data,
            ];

            $this->auditLogger->log(
                $batchId,
                AuctionBatchEventAction::ASSET_VALUATION_UPDATED,
                $actorId,
                $assetId,
                $previousValues,
                $newValues,
                "Nilai taksiran/lot aset diperbarui."
            );

            return $pivot;
        });
    }

    /**
     * Persist draft-only workflow metadata without changing auction status.
     *
     * @param string $batchId
     * @param array $payload
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function updateDraftMetadata(string $batchId, array $payload, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $payload, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if (!$batch->isDraft()) {
                throw ValidationException::withMessages([
                    'status' => 'Metadata draft hanya dapat diubah pada paket lelang berstatus DRAFT.',
                ]);
            }

            $previousMetadata = is_array($batch->metadata) ? $batch->metadata : [];
            $metadata = $previousMetadata;

            if (array_key_exists('kepala_balai_id', $payload)) {
                $batch->kepala_balai_id = $payload['kepala_balai_id'] ?: null;
            }

            if (array_key_exists('signatories', $payload)) {
                $metadata['signatories_raw'] = array_replace(
                    $metadata['signatories_raw'] ?? [],
                    $this->normalizeSignatories($payload['signatories'] ?? [])
                );
            }

            if (array_key_exists('document_numbers', $payload)) {
                $metadata['document_numbers'] = array_replace(
                    $metadata['document_numbers'] ?? [],
                    $payload['document_numbers'] ?? []
                );
            }

            if (array_key_exists('document_kaps', $payload)) {
                $metadata['document_kaps'] = array_replace(
                    $metadata['document_kaps'] ?? [],
                    $payload['document_kaps'] ?? []
                );
            }

            if (array_key_exists('document_dates', $payload)) {
                $metadata['document_dates'] = array_replace(
                    $metadata['document_dates'] ?? [],
                    $payload['document_dates'] ?? []
                );
            }

            if (isset($payload['workflow']['documents']) && is_array($payload['workflow']['documents'])) {
                $workflow = $metadata['workflow'] ?? [];
                $workflow['version'] = $workflow['version'] ?? 1;
                $workflow['updated_at'] = now()->toIso8601String();

                $documents = isset($workflow['documents']) && is_array($workflow['documents'])
                    ? $workflow['documents']
                    : [];

                foreach ($payload['workflow']['documents'] as $key => $documentPayload) {
                    $definition = $this->documentWorkflow->get($key);
                    if ($definition === null) {
                        throw ValidationException::withMessages([
                            'workflow.documents' => "Dokumen workflow tidak dikenal: {$key}",
                        ]);
                    }

                    $current = isset($documents[$key]) && is_array($documents[$key]) ? $documents[$key] : [];
                    $status = $documentPayload['status'] ?? $current['status'] ?? AuctionBatchDocumentWorkflow::STATUS_NOT_STARTED;

                    $documents[$key] = array_replace($current, $documentPayload, [
                        'key' => $key,
                        'title' => $definition['title'],
                        'channel' => $definition['channel'],
                        'phase' => $definition['phase'],
                        'order' => $definition['order'],
                        'status' => $status,
                        'updated_at' => now()->toIso8601String(),
                    ]);

                    if ($status === AuctionBatchDocumentWorkflow::STATUS_COMPLETED && empty($documents[$key]['completed_at'])) {
                        $documents[$key]['completed_at'] = now()->toIso8601String();
                    }
                }

                $workflow['documents'] = $this->documentWorkflow->sortDocumentProgress($documents);
                $metadata['workflow'] = $workflow;
            }

            $batch->metadata = $metadata;
            $batch->updated_by = $actorId;
            $batch->save();

            $this->auditLogger->log(
                $batchId,
                AuctionBatchEventAction::DRAFT_METADATA_UPDATED,
                $actorId,
                null,
                ['metadata' => $previousMetadata],
                ['metadata' => $metadata],
                'Metadata draft workflow diperbarui.'
            );

            return $batch->load('assets');
        });
    }

    /**
     * @param array<string, mixed> $signatories
     * @return array<string, array<int, mixed>>
     */
    private function normalizeSignatories(array $signatories): array
    {
        $normalized = [];

        foreach (['panitia', 'tim_penilai', 'pemeriksa'] as $key) {
            if (array_key_exists($key, $signatories)) {
                $value = $signatories[$key];
                $normalized[$key] = is_array($value) ? array_values(array_filter($value, fn($id) => $id !== null && $id !== '')) : [];
            }
        }

        return $normalized;
    }

    /**
     * Lock draft batch and submit it to DIAJUKAN status (Task 26 & Task 69).
     *
     * @param string $batchId
     * @param array $payload
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function lockAndSubmit(string $batchId, array $payload, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $payload, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            $this->stateMachine->assertCanTransition($batch, AuctionBatchStatus::DIAJUKAN);

            $checklist = $this->completenessChecker->checkForLock($batch, $payload);
            if (!$checklist['complete']) {
                $failedLabels = collect($checklist['items'])
                    ->filter(fn($item) => $item['required'] && !$item['passed'])
                    ->pluck('label')
                    ->implode(', ');
                throw ValidationException::withMessages([
                    'checklist' => "Paket lelang belum lengkap: {$failedLabels}",
                ]);
            }

            $actor = Auth::user() ?? User::find($actorId) ?? new User(['id' => $actorId]);
            $metadata = $this->metadataBuilder->buildForLock($batch, $actor, $payload);

            $assets = $batch->assets;
            foreach ($assets as $asset) {
                $assetSnapshot = $this->snapshotBuilder->buildAssetSnapshot($asset);
                $freezeSnapshot = $this->snapshotBuilder->buildFreezeSnapshot($asset);

                DB::table('bmn_asset_auction_batch')
                    ->where('bmn_auction_batch_id', $batchId)
                    ->where('bmn_asset_id', $asset->id)
                    ->update([
                        'asset_snapshot' => json_encode($assetSnapshot),
                        'freeze_snapshot' => json_encode($freezeSnapshot),
                    ]);

                $asset->henti_guna = true;
                $asset->status_penggunaan = 'Dihentikan dari Penggunaan Dinas';
                $asset->save();

                $this->auditLogger->log(
                    $batchId,
                    AuctionBatchEventAction::ASSET_FREEZE_SNAPSHOT_CREATED,
                    $actorId,
                    $asset->id,
                    null,
                    $freezeSnapshot,
                    "Aset dibekukan dari operasional dinas."
                );
            }

            $previousStatus = $batch->status->value;
            $batch->status = AuctionBatchStatus::DIAJUKAN;
            $batch->kepala_balai_id = $payload['kepala_balai_id'] ?? $batch->kepala_balai_id;
            $batch->metadata = $metadata;
            $batch->updated_by = $actorId;
            $batch->save();

            $this->auditLogger->log($batchId, AuctionBatchEventAction::BATCH_LOCKED, $actorId, null, null, $metadata, "Paket lelang dikunci.");
            $this->auditLogger->log($batchId, AuctionBatchEventAction::STATUS_CHANGED, $actorId, null, ['status' => $previousStatus], ['status' => AuctionBatchStatus::DIAJUKAN->value], "Status berubah menjadi DIAJUKAN.");

            return $batch->load('assets');
        });
    }

    /**
     * Record manual/external lelang schedule and transition to JADWAL_DITETAPKAN (Task 27).
     *
     * @param string $batchId
     * @param array $data
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function recordSchedule(string $batchId, array $data, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $data, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            $this->stateMachine->assertCanTransition($batch, AuctionBatchStatus::JADWAL_DITETAPKAN);

            if (empty($data['no_surat_persetujuan']) || empty($data['tanggal_surat_persetujuan']) ||
                empty($data['no_surat_penetapan']) || empty($data['tanggal_lelang'])) {
                throw ValidationException::withMessages([
                    'schedule' => 'Semua kolom jadwal lelang wajib diisi.',
                ]);
            }

            $previousStatus = $batch->status->value;

            $batch->no_surat_persetujuan = $data['no_surat_persetujuan'];
            $batch->tanggal_surat_persetujuan = $data['tanggal_surat_persetujuan'];
            $batch->no_surat_penetapan = $data['no_surat_penetapan'];
            $batch->tanggal_lelang = $data['tanggal_lelang'];
            $batch->status = AuctionBatchStatus::JADWAL_DITETAPKAN;
            $batch->updated_by = $actorId;
            $batch->save();

            $this->auditLogger->log($batchId, AuctionBatchEventAction::SCHEDULE_RECORDED, $actorId, null, null, $data, "Jadwal lelang dicatat.");
            $this->auditLogger->log($batchId, AuctionBatchEventAction::STATUS_CHANGED, $actorId, null, ['status' => $previousStatus], ['status' => AuctionBatchStatus::JADWAL_DITETAPKAN->value], "Status berubah menjadi JADWAL_DITETAPKAN.");

            return $batch->load('assets');
        });
    }

    /**
     * Record results of the first auction attempt (Task 28).
     *
     * @param string $batchId
     * @param array $assets
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function recordFirstAuctionResults(string $batchId, array $assets, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $assets, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if ($batch->status !== AuctionBatchStatus::JADWAL_DITETAPKAN) {
                throw ValidationException::withMessages([
                    'status' => 'Hasil lelang pertama hanya dapat dicatat jika status paket JADWAL_DITETAPKAN.',
                ]);
            }

            $currentPivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();
            $currentAssetIds = $currentPivots->pluck('bmn_asset_id')->toArray();
            $inputAssetIds = collect($assets)->pluck('bmn_asset_id')->toArray();

            if (count($assets) !== count($currentAssetIds) || !empty(array_diff($inputAssetIds, $currentAssetIds))) {
                throw ValidationException::withMessages([
                    'assets' => 'Hasil lelang harus mencakup seluruh aset yang ada dalam paket ini.',
                ]);
            }

            foreach ($assets as $assetResult) {
                $assetId = $assetResult['bmn_asset_id'];
                $isSold = $assetResult['first_auction_is_sold'];
                $price = $assetResult['first_auction_price'] ?? null;

                if ($isSold && (is_null($price) || $price < 0)) {
                    throw ValidationException::withMessages([
                        'price' => 'Harga terbentuk wajib diisi dengan nilai positif untuk aset yang terjual.',
                    ]);
                }

                if (!$isSold) {
                    $price = null;
                }

                AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                    ->where('bmn_asset_id', $assetId)
                    ->update([
                        'first_auction_is_sold' => $isSold,
                        'first_auction_price' => $price,
                    ]);
            }

            $this->auditLogger->log($batchId, AuctionBatchEventAction::FIRST_AUCTION_RESULT_RECORDED, $actorId, null, null, $assets, "Hasil lelang pertama dicatat.");

            return $batch->load('assets');
        });
    }

    /**
     * Start the reauction process for unsold assets (Task 29).
     *
     * @param string $batchId
     * @param array $data
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function startReauction(string $batchId, array $data, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $data, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            $this->stateMachine->assertCanTransition($batch, AuctionBatchStatus::LELANG_ULANG);

            $pivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();

            foreach ($pivots as $p) {
                if (is_null($p->first_auction_is_sold)) {
                    throw ValidationException::withMessages([
                        'status' => 'Hasil lelang pertama harus diisi untuk seluruh aset terlebih dahulu.',
                    ]);
                }
            }

            $unsoldExists = $pivots->contains('first_auction_is_sold', false);
            if (!$unsoldExists) {
                throw ValidationException::withMessages([
                    'status' => 'Tidak ada aset yang tidak laku. Lelang ulang tidak dapat dimulai.',
                ]);
            }

            if ($batch->reauction_count > 0) {
                throw ValidationException::withMessages([
                    'status' => 'Lelang ulang hanya dapat dilakukan maksimal 1 kali.',
                ]);
            }

            if (empty($data['no_surat_jadwal_ulang']) || empty($data['tanggal_lelang_ulang'])) {
                throw ValidationException::withMessages([
                    'reauction' => 'Nomor surat jadwal ulang dan tanggal lelang ulang wajib diisi.',
                ]);
            }

            $previousStatus = $batch->status->value;

            $batch->status = AuctionBatchStatus::LELANG_ULANG;
            $batch->no_surat_jadwal_ulang = $data['no_surat_jadwal_ulang'];
            $batch->tanggal_lelang_ulang = $data['tanggal_lelang_ulang'];
            $batch->reauction_notes = $data['reauction_notes'] ?? null;
            $batch->reauction_count = 1;
            $batch->updated_by = $actorId;
            $batch->save();

            $this->auditLogger->log($batchId, AuctionBatchEventAction::REAUCTION_STARTED, $actorId, null, null, $data, "Lelang ulang dimulai.");
            $this->auditLogger->log($batchId, AuctionBatchEventAction::STATUS_CHANGED, $actorId, null, ['status' => $previousStatus], ['status' => AuctionBatchStatus::LELANG_ULANG->value], "Status berubah menjadi LELANG_ULANG.");

            return $batch->load('assets');
        });
    }

    /**
     * Record results of the reauction attempt (Task 30).
     *
     * @param string $batchId
     * @param array $assets
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function recordReauctionResults(string $batchId, array $assets, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $assets, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if ($batch->status !== AuctionBatchStatus::LELANG_ULANG) {
                throw ValidationException::withMessages([
                    'status' => 'Hasil lelang ulang hanya dapat dicatat jika status paket LELANG_ULANG.',
                ]);
            }

            $unsoldPivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                ->where('first_auction_is_sold', false)
                ->get();
            $unsoldAssetIds = $unsoldPivots->pluck('bmn_asset_id')->toArray();
            $inputAssetIds = collect($assets)->pluck('bmn_asset_id')->toArray();

            if (count($assets) !== count($unsoldAssetIds) || !empty(array_diff($inputAssetIds, $unsoldAssetIds))) {
                throw ValidationException::withMessages([
                    'assets' => 'Hasil lelang ulang harus mencakup seluruh aset yang tidak laku di lelang pertama.',
                ]);
            }

            foreach ($assets as $assetResult) {
                $assetId = $assetResult['bmn_asset_id'];
                $isSold = $assetResult['reauction_is_sold'];
                $price = $assetResult['reauction_price'] ?? null;

                if ($isSold && (is_null($price) || $price < 0)) {
                    throw ValidationException::withMessages([
                        'price' => 'Harga terbentuk lelang ulang wajib diisi dengan nilai positif untuk aset yang terjual.',
                    ]);
                }

                if (!$isSold) {
                    $price = null;
                }

                AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)
                    ->where('bmn_asset_id', $assetId)
                    ->update([
                        'reauction_is_sold' => $isSold,
                        'reauction_price' => $price,
                    ]);
            }

            $this->auditLogger->log($batchId, AuctionBatchEventAction::REAUCTION_RESULT_RECORDED, $actorId, null, null, $assets, "Hasil lelang ulang dicatat.");

            return $batch->load('assets');
        });
    }

    /**
     * Finalize the batch realization, soft deleting sold assets and restoring unsold ones (Task 31).
     *
     * @param string $batchId
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function realize(string $batchId, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            if ($batch->status === AuctionBatchStatus::REALISASI) {
                throw ValidationException::withMessages([
                    'status' => 'Paket lelang sudah direalisasikan.',
                ]);
            }

            $this->stateMachine->assertCanTransition($batch, AuctionBatchStatus::REALISASI);

            $pivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();

            if ($pivots->contains(fn($p) => !is_null($p->disposed_at))) {
                throw ValidationException::withMessages([
                    'status' => 'Sebagian aset dalam paket ini sudah pernah diproses disposal.',
                ]);
            }

            foreach ($pivots as $p) {
                if ($batch->status === AuctionBatchStatus::JADWAL_DITETAPKAN) {
                    if (is_null($p->first_auction_is_sold)) {
                        throw ValidationException::withMessages([
                            'status' => 'Hasil lelang pertama belum lengkap.',
                        ]);
                    }
                } elseif ($batch->status === AuctionBatchStatus::LELANG_ULANG) {
                    if (is_null($p->first_auction_is_sold)) {
                        throw ValidationException::withMessages([
                            'status' => 'Hasil lelang pertama belum lengkap.',
                        ]);
                    }
                    if ($p->first_auction_is_sold === false && is_null($p->reauction_is_sold)) {
                        throw ValidationException::withMessages([
                            'status' => 'Hasil lelang ulang belum lengkap.',
                        ]);
                    }
                }
            }

            $previousStatus = $batch->status->value;

            foreach ($pivots as $p) {
                $asset = Asset::withTrashed()->findOrFail($p->bmn_asset_id);

                if ($p->first_auction_is_sold === true) {
                    $p->final_result = AuctionAssetFinalResult::SOLD_FIRST;
                    $p->final_price = $p->first_auction_price;
                    $p->final_auction_date = $batch->tanggal_lelang;
                    $p->disposed_at = now();
                    $p->save();

                    $asset->tanggal_pengapusan = $batch->tanggal_lelang;
                    $asset->save();

                    $this->assetService->disposeAsset($asset->id, $actorId, "Pemutihan BMN terjual pada Lelang Pertama (Lot: {$p->lot_number}, Batch: {$batch->batch_number})");
                    $this->auditLogger->log($batchId, AuctionBatchEventAction::ASSET_DISPOSED, $actorId, $asset->id, null, $p->toArray(), "Aset berhasil dilelang dan diproses disposal.");
                } elseif ($batch->status === AuctionBatchStatus::LELANG_ULANG && $p->reauction_is_sold === true) {
                    $p->final_result = AuctionAssetFinalResult::SOLD_REAUCTION;
                    $p->final_price = $p->reauction_price;
                    $p->final_auction_date = $batch->tanggal_lelang_ulang;
                    $p->disposed_at = now();
                    $p->save();

                    $asset->tanggal_pengapusan = $batch->tanggal_lelang_ulang;
                    $asset->save();

                    $this->assetService->disposeAsset($asset->id, $actorId, "Pemutihan BMN terjual pada Lelang Ulang (Lot: {$p->lot_number}, Batch: {$batch->batch_number})");
                    $this->auditLogger->log($batchId, AuctionBatchEventAction::ASSET_DISPOSED, $actorId, $asset->id, null, $p->toArray(), "Aset berhasil dilelang ulang dan diproses disposal.");
                } else {
                    $p->final_result = AuctionAssetFinalResult::UNSOLD;
                    $p->save();

                    if (!empty($p->freeze_snapshot)) {
                        $this->snapshotBuilder->restoreFromFreezeSnapshot($asset, $p->freeze_snapshot);
                    }

                    $this->auditLogger->log($batchId, AuctionBatchEventAction::ASSET_RESTORED, $actorId, $asset->id, $p->freeze_snapshot, $asset->toArray(), "Aset tidak laku lelang, operasional dipulihkan.");
                }
            }

            $batch->status = AuctionBatchStatus::REALISASI;
            $batch->realized_at = now();
            $batch->updated_by = $actorId;
            $batch->save();

            $this->auditLogger->log($batchId, AuctionBatchEventAction::REALIZATION_FINALIZED, $actorId, null, null, null, "Paket lelang direalisasikan secara final.");
            $this->auditLogger->log($batchId, AuctionBatchEventAction::STATUS_CHANGED, $actorId, null, ['status' => $previousStatus], ['status' => AuctionBatchStatus::REALISASI->value], "Status berubah menjadi REALISASI.");

            return $batch->load('assets');
        });
    }

    /**
     * Cancel an active auction batch and restore all frozen assets (Task 32).
     *
     * @param string $batchId
     * @param string|null $notes
     * @param string|null $actorId
     * @return AuctionBatch
     * @throws ValidationException
     */
    public function cancel(string $batchId, ?string $notes = null, ?string $actorId = null): AuctionBatch
    {
        return DB::transaction(function () use ($batchId, $notes, $actorId) {
            $actorId = $actorId ?? Auth::id();
            $batch = AuctionBatch::findOrFail($batchId);

            $this->stateMachine->assertCanTransition($batch, AuctionBatchStatus::BATAL);

            $previousStatus = $batch->status->value;

            $pivots = AssetAuctionBatch::where('bmn_auction_batch_id', $batchId)->get();
            foreach ($pivots as $p) {
                $p->final_result = AuctionAssetFinalResult::CANCELED;
                $p->save();

                if (!empty($p->freeze_snapshot)) {
                    $asset = Asset::withTrashed()->findOrFail($p->bmn_asset_id);
                    $this->snapshotBuilder->restoreFromFreezeSnapshot($asset, $p->freeze_snapshot);

                    $this->auditLogger->log(
                        $batchId,
                        AuctionBatchEventAction::ASSET_RESTORED,
                        $actorId,
                        $asset->id,
                        $p->freeze_snapshot,
                        $asset->toArray(),
                        "Pembatalan batch: Aset dipulihkan dari pembekuan."
                    );
                }
            }

            $batch->status = AuctionBatchStatus::BATAL;
            $batch->canceled_at = now();
            $batch->updated_by = $actorId;
            $batch->save();

            $this->auditLogger->log($batchId, AuctionBatchEventAction::BATCH_CANCELED, $actorId, null, null, ['notes' => $notes], "Paket lelang dibatalkan.");
            $this->auditLogger->log($batchId, AuctionBatchEventAction::STATUS_CHANGED, $actorId, null, ['status' => $previousStatus], ['status' => AuctionBatchStatus::BATAL->value], "Status berubah menjadi BATAL.");

            return $batch->load('assets');
        });
    }
}
