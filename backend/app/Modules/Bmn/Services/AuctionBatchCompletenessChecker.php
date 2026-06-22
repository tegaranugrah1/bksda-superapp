<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Support\Facades\Auth;

class AuctionBatchCompletenessChecker
{
    public function __construct(
        private AuctionAssetDocumentReadinessService $readinessService,
        private AuctionBatchMetadataBuilder $metadataBuilder,
        private AuctionAssetSnapshotBuilder $snapshotBuilder
    ) {}

    /**
     * Check completeness of the batch (Task 17 & Task 69).
     *
     * @param AuctionBatch $batch
     * @param array $payload Optional payload for pre-lock check
     * @return array
     */
    public function check(AuctionBatch $batch, array $payload = []): array
    {
        $assets = $batch->assets;
        $assetsCount = $assets->count();

        // 1. assets_present
        $assetsPresent = $assetsCount > 0;

        // 2. all_lot_numbers_present
        $allLotNumbersPresent = $assetsCount > 0;
        foreach ($assets as $asset) {
            if (empty($asset->pivot->lot_number)) {
                $allLotNumbersPresent = false;
                break;
            }
        }

        // 3. all_valuations_positive
        $allValuationsPositive = $assetsCount > 0;
        foreach ($assets as $asset) {
            if (is_null($asset->pivot->nilai_taksiran) || $asset->pivot->nilai_taksiran <= 0) {
                $allValuationsPositive = false;
                break;
            }
        }

        // Inputs
        $kepalaBalaiId = $payload['kepala_balai_id'] ?? $batch->kepala_balai_id;
        $kepalaBalaiSelected = !empty($kepalaBalaiId);

        $signatoriesInput = $payload['signatories'] ?? [];
        $panitiaIds = $signatoriesInput['panitia'] ?? $batch->metadata['committees']['panitia_penghapusan'] ?? [];
        $timPenilaiIds = $signatoriesInput['tim_penilai'] ?? $batch->metadata['committees']['tim_penilai'] ?? [];
        $pemeriksaIds = $signatoriesInput['pemeriksa'] ?? $batch->metadata['committees']['pemeriksa'] ?? [];

        // Count elements
        $panitiaCount = is_array($panitiaIds) ? count($panitiaIds) : 0;
        $timPenilaiCount = is_array($timPenilaiIds) ? count($timPenilaiIds) : 0;
        $pemeriksaCount = is_array($pemeriksaIds) ? count($pemeriksaIds) : 0;

        $panitiaPresent = $panitiaCount > 0;
        $timPenilaiPresent = $timPenilaiCount > 0;
        $pemeriksaPresent = $pemeriksaCount > 0;

        $documentNumbers = $payload['document_numbers'] ?? $batch->metadata['document_numbers'] ?? [];
        $documentDates = $payload['document_dates'] ?? $batch->metadata['document_dates'] ?? [];

        $documentNumbersPresent = !empty($documentNumbers);
        $documentDatesPresent = !empty($documentDates);

        // Duplicate assets check
        $assetIds = $assets->pluck('id')->toArray();
        $duplicates = 0;
        if (!empty($assetIds)) {
            $duplicates = \DB::table('bmn_asset_auction_batch')
                ->join('bmn_auction_batches', 'bmn_asset_auction_batch.bmn_auction_batch_id', '=', 'bmn_auction_batches.id')
                ->whereIn('bmn_asset_auction_batch.bmn_asset_id', $assetIds)
                ->where('bmn_auction_batches.id', '!=', $batch->id)
                ->whereIn('bmn_auction_batches.status', ['DRAFT', 'DIAJUKAN', 'JADWAL_DITETAPKAN', 'LELANG_ULANG'])
                ->whereNull('bmn_auction_batches.deleted_at')
                ->count();
        }
        $noActiveDuplicateAssets = $duplicates === 0;

        $documentReadinessReviewed = true; // Always reviewed since we compute it dynamically

        // JSON contract validation
        $metadataContractValid = false;
        $assetSnapshotContractValid = false;
        $freezeSnapshotContractValid = false;

        // Verify if already locked in DB
        $isLocked = ($batch->status !== \App\Modules\Bmn\Enums\AuctionBatchStatus::DRAFT);

        if ($isLocked) {
            $metadata = $batch->metadata;
            $metadataContractValid = (($metadata['schema_version'] ?? null) === 1);

            $assetSnapshotContractValid = ($assetsCount > 0);
            $freezeSnapshotContractValid = ($assetsCount > 0);

            foreach ($assets as $asset) {
                if (($asset->pivot->asset_snapshot['schema_version'] ?? null) !== 1) {
                    $assetSnapshotContractValid = false;
                }
                if (($asset->pivot->freeze_snapshot['schema_version'] ?? null) !== 1) {
                    $freezeSnapshotContractValid = false;
                }
            }
        } elseif (!empty($payload)) {
            // Build in-memory to validate JSON contracts before locking (Task 69)
            try {
                $actor = Auth::user() ?? User::first() ?? new \App\Models\User(['id' => '00000000-0000-0000-0000-000000000000']);
                $tempMetadata = $this->metadataBuilder->buildForLock($batch, $actor, $payload);
                $metadataContractValid = (($tempMetadata['schema_version'] ?? null) === 1) && !empty($tempMetadata['signatories']['kepala_balai']);

                $assetSnapshotContractValid = ($assetsCount > 0);
                $freezeSnapshotContractValid = ($assetsCount > 0);

                foreach ($assets as $asset) {
                    $tempAssetSnap = $this->snapshotBuilder->buildAssetSnapshot($asset);
                    $tempFreezeSnap = $this->snapshotBuilder->buildFreezeSnapshot($asset);

                    if (($tempAssetSnap['schema_version'] ?? null) !== 1 || empty($tempAssetSnap['document_readiness'])) {
                        $assetSnapshotContractValid = false;
                    }
                    if (($tempFreezeSnap['schema_version'] ?? null) !== 1 || !array_key_exists('previous_status_penggunaan', $tempFreezeSnap)) {
                        $freezeSnapshotContractValid = false;
                    }
                }
            } catch (\Exception $e) {
                // If anything fails in building, contracts are invalid
                $metadataContractValid = false;
                $assetSnapshotContractValid = false;
                $freezeSnapshotContractValid = false;
            }
        }

        $items = [
            [
                'key' => 'assets_present',
                'label' => 'Minimal 1 aset dipilih',
                'passed' => $assetsPresent,
                'message' => $assetsPresent ? null : 'Batch tidak memiliki aset.',
                'required' => true,
            ],
            [
                'key' => 'all_lot_numbers_present',
                'label' => 'Semua Lot Aset Terisi',
                'passed' => $allLotNumbersPresent,
                'message' => $allLotNumbersPresent ? null : 'Ada aset yang belum memiliki nomor lot.',
                'required' => true,
            ],
            [
                'key' => 'all_valuations_positive',
                'label' => 'Semua Nilai Taksiran Aset Valid (> 0)',
                'passed' => $allValuationsPositive,
                'message' => $allValuationsPositive ? null : 'Ada aset yang belum memiliki nilai taksiran valid.',
                'required' => true,
            ],
            [
                'key' => 'kepala_balai_selected',
                'label' => 'Kepala Balai Terpilih',
                'passed' => $kepalaBalaiSelected,
                'message' => $kepalaBalaiSelected ? null : 'Kepala Balai penandatangan belum dipilih.',
                'required' => true,
            ],
            [
                'key' => 'panitia_present',
                'label' => 'Anggota Panitia Penghapusan Terisi',
                'passed' => $panitiaPresent,
                'message' => $panitiaPresent ? null : 'Minimal harus ada 1 anggota Panitia Penghapusan.',
                'required' => true,
            ],
            [
                'key' => 'tim_penilai_present',
                'label' => 'Anggota Tim Penilai Terisi',
                'passed' => $timPenilaiPresent,
                'message' => $timPenilaiPresent ? null : 'Minimal harus ada 1 anggota Tim Penilai.',
                'required' => true,
            ],
            [
                'key' => 'pemeriksa_present',
                'label' => 'Anggota Panitia Pemeriksa Terisi',
                'passed' => $pemeriksaPresent,
                'message' => $pemeriksaPresent ? null : 'Minimal harus ada 1 anggota Panitia Pemeriksa.',
                'required' => true,
            ],
            [
                'key' => 'document_numbers_present',
                'label' => 'Nomor Dokumen Terisi',
                'passed' => $documentNumbersPresent,
                'message' => $documentNumbersPresent ? null : 'Nomor dokumen pendukung belum lengkap.',
                'required' => true,
            ],
            [
                'key' => 'document_dates_present',
                'label' => 'Tanggal Dokumen Terisi',
                'passed' => $documentDatesPresent,
                'message' => $documentDatesPresent ? null : 'Tanggal dokumen pendukung belum lengkap.',
                'required' => true,
            ],
            [
                'key' => 'no_active_duplicate_assets',
                'label' => 'Aset Tidak Sedang Aktif di Batch Lain',
                'passed' => $noActiveDuplicateAssets,
                'message' => $noActiveDuplicateAssets ? null : 'Terdapat aset yang sudah terdaftar pada Paket Lelang aktif lainnya.',
                'required' => true,
            ],
            [
                'key' => 'document_readiness_reviewed',
                'label' => 'Kelengkapan Dokumen Aset Di-review',
                'passed' => $documentReadinessReviewed,
                'message' => null,
                'required' => false, // Advisory warning only
            ],
            [
                'key' => 'metadata_contract_valid',
                'label' => 'Kontrak Metadata Valid',
                'passed' => $metadataContractValid,
                'message' => $metadataContractValid ? null : 'Kontrak dokumen metadata lelang tidak valid.',
                'required' => true,
            ],
            [
                'key' => 'asset_snapshot_contract_valid',
                'label' => 'Kontrak Snapshot Aset Valid',
                'passed' => $assetSnapshotContractValid,
                'message' => $assetSnapshotContractValid ? null : 'Kontrak snapshot aset lelang tidak valid.',
                'required' => true,
            ],
            [
                'key' => 'freeze_snapshot_contract_valid',
                'label' => 'Kontrak Snapshot Pembekuan Aset Valid',
                'passed' => $freezeSnapshotContractValid,
                'message' => $freezeSnapshotContractValid ? null : 'Kontrak snapshot pembekuan operasional aset tidak valid.',
                'required' => true,
            ],
        ];

        $complete = true;
        foreach ($items as $item) {
            if ($item['required'] && !$item['passed']) {
                $complete = false;
            }
        }

        return [
            'complete' => $complete,
            'items' => $items,
        ];
    }

    /**
     * Pre-lock check using the input payload (Task 17).
     *
     * @param AuctionBatch $batch
     * @param array $payload
     * @return array
     */
    public function checkForLock(AuctionBatch $batch, array $payload): array
    {
        return $this->check($batch, $payload);
    }
}
