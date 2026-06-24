<?php

namespace App\Modules\Bmn\Services;

use App\Models\User;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Models\AuctionBatch;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuctionBatchCompletenessChecker
{
    public function __construct(
        private AuctionBatchMetadataBuilder $metadataBuilder,
        private AuctionAssetSnapshotBuilder $snapshotBuilder,
        private AuctionBatchDocumentWorkflow $documentWorkflow
    ) {}

    /**
     * Check completeness of the batch.
     *
     * @param AuctionBatch $batch
     * @param array $payload Optional payload for pre-lock check
     * @return array
     */
    public function check(AuctionBatch $batch, array $payload = []): array
    {
        $batch->loadMissing('assets');
        $assets = $batch->assets;
        $assetsCount = $assets->count();
        $metadata = $this->mergedMetadata($batch, $payload);

        $assetsPresent = $assetsCount > 0;
        $allLotNumbersPresent = $assetsPresent;
        $allValuationsPositive = $assetsPresent;

        foreach ($assets as $asset) {
            if (empty($asset->pivot->lot_number)) {
                $allLotNumbersPresent = false;
            }

            if (is_null($asset->pivot->nilai_taksiran) || $asset->pivot->nilai_taksiran <= 0) {
                $allValuationsPositive = false;
            }
        }

        $kepalaBalaiId = $payload['kepala_balai_id'] ?? $batch->kepala_balai_id;
        $kepalaBalaiSelected = !empty($kepalaBalaiId);

        $signatoriesInput = $payload['signatories'] ?? $metadata['signatories_raw'] ?? [];
        $panitiaIds = $signatoriesInput['panitia'] ?? [];
        $timPenilaiIds = $signatoriesInput['tim_penilai'] ?? [];
        $pemeriksaIds = $signatoriesInput['pemeriksa'] ?? [];

        if (empty($panitiaIds) && !empty($metadata['committees']['panitia_penghapusan'])) {
            $panitiaIds = $metadata['committees']['panitia_penghapusan'];
        }
        if (empty($timPenilaiIds) && !empty($metadata['committees']['tim_penilai'])) {
            $timPenilaiIds = $metadata['committees']['tim_penilai'];
        }
        if (empty($pemeriksaIds) && !empty($metadata['committees']['pemeriksa'])) {
            $pemeriksaIds = $metadata['committees']['pemeriksa'];
        }

        $panitiaPresent = is_array($panitiaIds) && count($panitiaIds) > 0;
        $timPenilaiPresent = is_array($timPenilaiIds) && count($timPenilaiIds) > 0;
        $pemeriksaPresent = is_array($pemeriksaIds) && count($pemeriksaIds) > 0;

        $documentNumbers = $payload['document_numbers'] ?? $metadata['document_numbers'] ?? [];
        $documentDates = $payload['document_dates'] ?? $metadata['document_dates'] ?? [];
        $documentNumbersPresent = !empty(array_filter($documentNumbers, fn($value) => $value !== null && $value !== ''));
        $documentDatesPresent = !empty(array_filter($documentDates, fn($value) => $value !== null && $value !== ''));

        $noActiveDuplicateAssets = $this->hasNoActiveDuplicateAssets($batch, $assets->pluck('id')->toArray());
        $workflowDocuments = $metadata['workflow']['documents'] ?? [];

        $assetsLotItems = [
            $this->item('assets_present', 'Minimal 1 aset dipilih', $assetsPresent, $assetsPresent ? null : 'Batch tidak memiliki aset.'),
            $this->item('all_lot_numbers_present', 'Semua Lot Aset Terisi', $allLotNumbersPresent, $allLotNumbersPresent ? null : 'Ada aset yang belum memiliki nomor lot.'),
            $this->item('no_active_duplicate_assets', 'Aset Tidak Sedang Aktif di Batch Lain', $noActiveDuplicateAssets, $noActiveDuplicateAssets ? null : 'Terdapat aset yang sudah terdaftar pada Paket Lelang aktif lainnya.'),
            $this->item('document_readiness_reviewed', 'Kelengkapan Dokumen Aset Di-review', true, null, false),
        ];

        $signatoryItems = [
            $this->item('kepala_balai_selected', 'Kepala Balai Terpilih', $kepalaBalaiSelected, $kepalaBalaiSelected ? null : 'Kepala Balai penandatangan belum dipilih.'),
            $this->item('panitia_present', 'Anggota Panitia Penghapusan Terisi', $panitiaPresent, $panitiaPresent ? null : 'Minimal harus ada 1 anggota Panitia Penghapusan.'),
            $this->item('tim_penilai_present', 'Anggota Tim Penilai Terisi', $timPenilaiPresent, $timPenilaiPresent ? null : 'Minimal harus ada 1 anggota Tim Penilai/Penaksir.'),
            $this->item('pemeriksa_present', 'Anggota Panitia Pemeriksa Terisi', $pemeriksaPresent, $pemeriksaPresent ? null : 'Minimal harus ada 1 anggota Panitia Pemeriksa.'),
            $this->item('document_numbers_present', 'Nomor Dokumen Terisi', $documentNumbersPresent, $documentNumbersPresent ? null : 'Nomor dokumen pendukung belum lengkap.'),
            $this->item('document_dates_present', 'Tanggal Dokumen Terisi', $documentDatesPresent, $documentDatesPresent ? null : 'Tanggal dokumen pendukung belum lengkap.'),
        ];

        $preValuationDocumentItems = $this->documentItems(
            'pre_valuation_document',
            $workflowDocuments,
            fn(array $definition) => $definition['required_for_valuation'],
            'Dokumen awal belum ditandai selesai.'
        );

        $valuationItems = [
            $this->item('all_valuations_positive', 'Semua Nilai Taksiran Aset Valid (> 0)', $allValuationsPositive, $allValuationsPositive ? null : 'Ada aset yang belum memiliki nilai taksiran valid.'),
        ];

        $postValuationDocumentItems = $this->documentItems(
            'post_valuation_document',
            $workflowDocuments,
            fn(array $definition) => $definition['requires_valuation'] && $definition['required_for_submit'],
            'Dokumen setelah taksiran belum ditandai selesai.'
        );

        [$metadataContractValid, $assetSnapshotContractValid, $freezeSnapshotContractValid] = $this->contractChecks($batch, $payload, $assetsCount);
        $contractItems = [
            $this->item('metadata_contract_valid', 'Kontrak Metadata Valid', $metadataContractValid, $metadataContractValid ? null : 'Kontrak dokumen metadata lelang tidak valid.'),
            $this->item('asset_snapshot_contract_valid', 'Kontrak Snapshot Aset Valid', $assetSnapshotContractValid, $assetSnapshotContractValid ? null : 'Kontrak snapshot aset lelang tidak valid.'),
            $this->item('freeze_snapshot_contract_valid', 'Kontrak Snapshot Pembekuan Aset Valid', $freezeSnapshotContractValid, $freezeSnapshotContractValid ? null : 'Kontrak snapshot pembekuan operasional aset tidak valid.'),
        ];

        $sections = [
            $this->section('assets_lot', 'Aset & Lot', $assetsLotItems),
            $this->section('pre_valuation_documents', 'Dokumen Awal', array_merge($signatoryItems, $preValuationDocumentItems)),
            $this->section('valuation', 'Nilai Taksiran', $valuationItems),
            $this->section('post_valuation_documents', 'Setelah Taksiran', $postValuationDocumentItems),
            $this->section('final_submission', 'Kunci & Ajukan', []),
            $this->section('contracts', 'Kontrak Sistem', $contractItems),
        ];

        $canEnterValuation = $sections[0]['complete'] && $sections[1]['complete'];
        $canCompletePostValuationDocuments = $sections[2]['complete'];

        $sections[4]['items'] = [
            $this->item('pre_valuation_gate_complete', 'Dokumen awal selesai', $canEnterValuation, $canEnterValuation ? null : 'Selesaikan dokumen awal sebelum masuk pengajuan akhir.'),
            $this->item('post_valuation_gate_complete', 'Dokumen setelah taksiran selesai', $sections[3]['complete'], $sections[3]['complete'] ? null : 'Nota dinas/permohonan setelah taksiran belum lengkap.'),
        ];
        $sections[4] = $this->section($sections[4]['key'], $sections[4]['label'], $sections[4]['items']);

        $canLockSubmit = $sections[0]['complete']
            && $sections[1]['complete']
            && $sections[2]['complete']
            && $sections[3]['complete']
            && $sections[5]['complete'];

        $items = array_merge(...array_map(fn(array $section) => $section['items'], $sections));

        return [
            'complete' => $canLockSubmit,
            'items' => $items,
            'sections' => $sections,
            'can_enter_valuation' => $canEnterValuation,
            'can_complete_post_valuation_documents' => $canCompletePostValuationDocuments,
            'can_lock_submit' => $canLockSubmit,
        ];
    }

    /**
     * Pre-lock check using the input payload.
     *
     * @param AuctionBatch $batch
     * @param array $payload
     * @return array
     */
    public function checkForLock(AuctionBatch $batch, array $payload): array
    {
        return $this->check($batch, $payload);
    }

    /**
     * @param array<string, mixed> $metadata
     * @param callable(array<string, mixed>): bool $filter
     * @return list<array<string, mixed>>
     */
    private function documentItems(string $prefix, array $metadata, callable $filter, string $missingMessage): array
    {
        $items = [];

        foreach ($this->documentWorkflow->definitions() as $definition) {
            if (!$filter($definition)) {
                continue;
            }

            $key = $definition['key'];
            $complete = $this->documentComplete($metadata[$key] ?? null);
            $items[] = $this->item(
                "{$prefix}_{$key}",
                $definition['title'],
                $complete,
                $complete ? null : $missingMessage
            );
        }

        return $items;
    }

    private function documentComplete(mixed $document): bool
    {
        if (!is_array($document)) {
            return false;
        }

        return in_array($document['status'] ?? null, [
            AuctionBatchDocumentWorkflow::STATUS_SIGNED,
            AuctionBatchDocumentWorkflow::STATUS_COMPLETED,
        ], true);
    }

    /**
     * @param list<array<string, mixed>> $items
     * @return array<string, mixed>
     */
    private function section(string $key, string $label, array $items): array
    {
        $complete = true;
        foreach ($items as $item) {
            if (($item['required'] ?? true) && !$item['passed']) {
                $complete = false;
                break;
            }
        }

        return [
            'key' => $key,
            'label' => $label,
            'complete' => $complete,
            'items' => $items,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function item(string $key, string $label, bool $passed, ?string $message = null, bool $required = true): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'passed' => $passed,
            'message' => $message,
            'required' => $required,
        ];
    }

    /**
     * @param list<string> $assetIds
     */
    private function hasNoActiveDuplicateAssets(AuctionBatch $batch, array $assetIds): bool
    {
        if (empty($assetIds)) {
            return true;
        }

        $duplicates = DB::table('bmn_asset_auction_batch')
            ->join('bmn_auction_batches', 'bmn_asset_auction_batch.bmn_auction_batch_id', '=', 'bmn_auction_batches.id')
            ->whereIn('bmn_asset_auction_batch.bmn_asset_id', $assetIds)
            ->where('bmn_auction_batches.id', '!=', $batch->id)
            ->whereIn('bmn_auction_batches.status', ['DRAFT', 'DIAJUKAN', 'JADWAL_DITETAPKAN', 'LELANG_ULANG'])
            ->whereNull('bmn_auction_batches.deleted_at')
            ->count();

        return $duplicates === 0;
    }

    /**
     * @return array<string, mixed>
     */
    private function mergedMetadata(AuctionBatch $batch, array $payload): array
    {
        $metadata = is_array($batch->metadata) ? $batch->metadata : [];

        if (array_key_exists('signatories', $payload)) {
            $metadata['signatories_raw'] = array_replace($metadata['signatories_raw'] ?? [], $payload['signatories'] ?? []);
        }
        if (array_key_exists('document_numbers', $payload)) {
            $metadata['document_numbers'] = array_replace($metadata['document_numbers'] ?? [], $payload['document_numbers'] ?? []);
        }
        if (array_key_exists('document_dates', $payload)) {
            $metadata['document_dates'] = array_replace($metadata['document_dates'] ?? [], $payload['document_dates'] ?? []);
        }
        if (array_key_exists('workflow', $payload)) {
            $metadata['workflow'] = array_replace_recursive($metadata['workflow'] ?? [], $payload['workflow'] ?? []);
        }

        return $metadata;
    }

    /**
     * @return array{0: bool, 1: bool, 2: bool}
     */
    private function contractChecks(AuctionBatch $batch, array $payload, int $assetsCount): array
    {
        $metadataContractValid = false;
        $assetSnapshotContractValid = false;
        $freezeSnapshotContractValid = false;
        $isLocked = $batch->status !== AuctionBatchStatus::DRAFT;

        if ($isLocked) {
            $metadata = $batch->metadata;
            $metadataContractValid = in_array(($metadata['schema_version'] ?? null), [1, 2], true);
            $assetSnapshotContractValid = $assetsCount > 0;
            $freezeSnapshotContractValid = $assetsCount > 0;

            foreach ($batch->assets as $asset) {
                if (($asset->pivot->asset_snapshot['schema_version'] ?? null) !== 1) {
                    $assetSnapshotContractValid = false;
                }
                if (($asset->pivot->freeze_snapshot['schema_version'] ?? null) !== 1) {
                    $freezeSnapshotContractValid = false;
                }
            }

            return [$metadataContractValid, $assetSnapshotContractValid, $freezeSnapshotContractValid];
        }

        try {
            $actor = Auth::user() ?? User::first() ?? new User(['id' => '00000000-0000-0000-0000-000000000000']);
            $tempPayload = $this->lockPayloadFromDraft($batch, $payload);
            $tempMetadata = $this->metadataBuilder->buildForLock($batch, $actor, $tempPayload);

            $metadataContractValid = (($tempMetadata['schema_version'] ?? null) === 2)
                && !empty($tempMetadata['signatories']['kepala_balai'])
                && !empty($tempMetadata['workflow']);

            $assetSnapshotContractValid = $assetsCount > 0;
            $freezeSnapshotContractValid = $assetsCount > 0;

            foreach ($batch->assets as $asset) {
                $tempAssetSnap = $this->snapshotBuilder->buildAssetSnapshot($asset);
                $tempFreezeSnap = $this->snapshotBuilder->buildFreezeSnapshot($asset);

                if (($tempAssetSnap['schema_version'] ?? null) !== 1 || empty($tempAssetSnap['document_readiness'])) {
                    $assetSnapshotContractValid = false;
                }
                if (($tempFreezeSnap['schema_version'] ?? null) !== 1 || !array_key_exists('previous_status_penggunaan', $tempFreezeSnap)) {
                    $freezeSnapshotContractValid = false;
                }
            }
        } catch (\Throwable) {
            $metadataContractValid = false;
            $assetSnapshotContractValid = false;
            $freezeSnapshotContractValid = false;
        }

        return [$metadataContractValid, $assetSnapshotContractValid, $freezeSnapshotContractValid];
    }

    /**
     * @return array<string, mixed>
     */
    private function lockPayloadFromDraft(AuctionBatch $batch, array $payload): array
    {
        $metadata = is_array($batch->metadata) ? $batch->metadata : [];

        return [
            'kepala_balai_id' => $payload['kepala_balai_id'] ?? $batch->kepala_balai_id,
            'signatories' => array_replace($metadata['signatories_raw'] ?? [], $payload['signatories'] ?? []),
            'document_numbers' => array_replace($metadata['document_numbers'] ?? [], $payload['document_numbers'] ?? []),
            'document_dates' => array_replace($metadata['document_dates'] ?? [], $payload['document_dates'] ?? []),
            'workflow' => array_replace_recursive($metadata['workflow'] ?? [], $payload['workflow'] ?? []),
        ];
    }
}
