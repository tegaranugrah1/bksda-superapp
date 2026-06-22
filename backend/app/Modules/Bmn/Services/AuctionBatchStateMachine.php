<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use Illuminate\Validation\ValidationException;

class AuctionBatchStateMachine
{
    /**
     * Assert that a batch can transition to the target status.
     *
     * @param AuctionBatch $batch
     * @param string|AuctionBatchStatus $targetStatus
     * @return void
     * @throws ValidationException
     */
    public function assertCanTransition(AuctionBatch $batch, $targetStatus): void
    {
        $current = $batch->status instanceof AuctionBatchStatus ? $batch->status->value : $batch->status;
        $target = $targetStatus instanceof AuctionBatchStatus ? $targetStatus->value : $targetStatus;

        $validTransitions = [
            AuctionBatchStatus::DRAFT->value => [
                AuctionBatchStatus::DIAJUKAN->value,
                AuctionBatchStatus::BATAL->value,
            ],
            AuctionBatchStatus::DIAJUKAN->value => [
                AuctionBatchStatus::JADWAL_DITETAPKAN->value,
                AuctionBatchStatus::BATAL->value,
            ],
            AuctionBatchStatus::JADWAL_DITETAPKAN->value => [
                AuctionBatchStatus::LELANG_ULANG->value,
                AuctionBatchStatus::REALISASI->value,
                AuctionBatchStatus::BATAL->value,
            ],
            AuctionBatchStatus::LELANG_ULANG->value => [
                AuctionBatchStatus::REALISASI->value,
                AuctionBatchStatus::BATAL->value,
            ],
            AuctionBatchStatus::REALISASI->value => [],
            AuctionBatchStatus::BATAL->value => [],
        ];

        $allowed = $validTransitions[$current] ?? [];

        if (!in_array($target, $allowed, true)) {
            throw ValidationException::withMessages([
                'status' => "Transisi status dari {$current} ke {$target} tidak valid.",
            ]);
        }
    }

    /**
     * Check if the batch is in a read-only state.
     *
     * @param AuctionBatch $batch
     * @return bool
     */
    public function isReadOnly(AuctionBatch $batch): bool
    {
        return $batch->isReadOnly();
    }

    /**
     * Check if the batch draft can be edited.
     *
     * @param AuctionBatch $batch
     * @return bool
     */
    public function canEditDraft(AuctionBatch $batch): bool
    {
        $current = $batch->status instanceof AuctionBatchStatus ? $batch->status : AuctionBatchStatus::tryFrom($batch->status);
        return $current === AuctionBatchStatus::DRAFT;
    }
}
