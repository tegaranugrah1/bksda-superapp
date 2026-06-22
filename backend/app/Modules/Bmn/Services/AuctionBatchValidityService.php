<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\AuctionBatch;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use Illuminate\Support\Carbon;

class AuctionBatchValidityService
{
    /**
     * Compute advisory warning for external/manual approval review window (Task 68).
     *
     * @param AuctionBatch $batch
     * @return array
     */
    public function approvalReviewWarning(AuctionBatch $batch): array
    {
        $months = config('bmn.auction.approval_review_window_months', 6);

        if (!$batch->tanggal_surat_persetujuan) {
            return [
                'approval_review_window_months' => $months,
                'approval_review_until' => null,
                'requires_revaluation_review' => false,
                'message' => null,
            ];
        }

        $tanggalSurat = Carbon::parse($batch->tanggal_surat_persetujuan);
        $until = $tanggalSurat->copy()->addMonths($months);
        $untilStr = $until->toDateString();

        // If status is REALISASI or BATAL, do not show active warning.
        $status = $batch->status instanceof AuctionBatchStatus ? $batch->status : AuctionBatchStatus::tryFrom($batch->status);
        if ($status === AuctionBatchStatus::REALISASI || $status === AuctionBatchStatus::BATAL) {
            return [
                'approval_review_window_months' => $months,
                'approval_review_until' => $untilStr,
                'requires_revaluation_review' => false,
                'message' => null,
            ];
        }

        $today = Carbon::today();
        $isOverdue = $today->greaterThan($until);

        $message = null;
        if ($isOverdue) {
            $message = "Masa berlaku surat persetujuan lelang telah melebihi {$months} bulan (batas akhir: " . $until->format('d-m-Y') . "). Harap lakukan review persyaratan administratif/penilaian ulang sebelum melanjutkan proses lelang secara manual.";
        }

        return [
            'approval_review_window_months' => $months,
            'approval_review_until' => $untilStr,
            'requires_revaluation_review' => $isOverdue,
            'message' => $message,
        ];
    }
}
