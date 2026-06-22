<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Bmn\Enums\AuctionBatchStatus;
use App\Modules\Bmn\Services\AuctionBatchValidityService;

class AuctionBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $validityService = app(AuctionBatchValidityService::class);
        $validityWarning = $validityService->approvalReviewWarning($this->resource);

        $statusVal = $this->status instanceof AuctionBatchStatus ? $this->status->value : $this->status;
        $statusLabel = $this->status instanceof AuctionBatchStatus ? $this->status->label() : $this->status;

        $availableTransitions = match ($statusVal) {
            'DRAFT' => ['DIAJUKAN', 'BATAL'],
            'DIAJUKAN' => ['JADWAL_DITETAPKAN', 'BATAL'],
            'JADWAL_DITETAPKAN' => ['LELANG_ULANG', 'REALISASI', 'BATAL'],
            'LELANG_ULANG' => ['REALISASI', 'BATAL'],
            default => [],
        };

        return [
            'id' => $this->id,
            'batch_number' => $this->batch_number,
            'name' => $this->name,
            'status' => $statusVal,
            'status_label' => $statusLabel,
            'is_read_only' => $this->isReadOnly(),
            'no_surat_persetujuan' => $this->no_surat_persetujuan,
            'tanggal_surat_persetujuan' => $this->tanggal_surat_persetujuan ? $this->tanggal_surat_persetujuan->toDateString() : null,
            'no_surat_penetapan' => $this->no_surat_penetapan,
            'tanggal_lelang' => $this->tanggal_lelang ? $this->tanggal_lelang->toDateString() : null,
            'reauction_count' => $this->reauction_count,
            'no_surat_jadwal_ulang' => $this->no_surat_jadwal_ulang,
            'tanggal_lelang_ulang' => $this->tanggal_lelang_ulang ? $this->tanggal_lelang_ulang->toDateString() : null,
            'reauction_notes' => $this->reauction_notes,
            'metadata' => $this->metadata,
            'assets_count' => $this->assets()->count(),
            'nilai_taksiran_total' => (float) $this->assets()->sum('bmn_asset_auction_batch.nilai_taksiran'),
            'created_at' => $this->created_at ? $this->created_at->toIso8601String() : null,
            'updated_at' => $this->updated_at ? $this->updated_at->toIso8601String() : null,
            'metadata_schema_version' => $this->metadata['schema_version'] ?? null,
            'validity_warning' => $validityWarning,
            'available_transitions' => $availableTransitions,
            'assets' => AuctionBatchAssetResource::collection($this->whenLoaded('assets')),
        ];
    }
}
