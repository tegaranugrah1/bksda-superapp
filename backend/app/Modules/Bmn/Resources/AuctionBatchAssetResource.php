<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Bmn\Services\AuctionAssetDocumentReadinessService;

class AuctionBatchAssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $pivot = $this->pivot;

        $auctionData = null;
        if ($pivot) {
            $auctionData = [
                'lot_number' => $pivot->lot_number,
                'nilai_taksiran' => $pivot->nilai_taksiran ? (float) $pivot->nilai_taksiran : null,
                'kertas_kerja_data' => $pivot->kertas_kerja_data,
                'sort_order' => (int) $pivot->sort_order,
                'first_auction_is_sold' => $pivot->first_auction_is_sold,
                'first_auction_price' => $pivot->first_auction_price ? (float) $pivot->first_auction_price : null,
                'reauction_is_sold' => $pivot->reauction_is_sold,
                'reauction_price' => $pivot->reauction_price ? (float) $pivot->reauction_price : null,
                'final_result' => $pivot->final_result ? ($pivot->final_result instanceof \App\Modules\Bmn\Enums\AuctionAssetFinalResult ? $pivot->final_result->value : $pivot->final_result) : null,
                'final_price' => $pivot->final_price ? (float) $pivot->final_price : null,
                'final_auction_date' => $pivot->final_auction_date ? (\Illuminate\Support\Carbon::parse($pivot->final_auction_date)->toDateString()) : null,
                'disposed_at' => $pivot->disposed_at ? (\Illuminate\Support\Carbon::parse($pivot->disposed_at)->toIso8601String()) : null,
                'asset_snapshot' => $pivot->asset_snapshot,
                'freeze_snapshot' => $pivot->freeze_snapshot,
            ];
        }

        // Determine document readiness
        // If locked (has asset_snapshot), read from snapshot
        $readiness = null;
        if ($pivot && !empty($pivot->asset_snapshot['document_readiness'])) {
            $readiness = $pivot->asset_snapshot['document_readiness'];
        } else {
            $readinessService = app(AuctionAssetDocumentReadinessService::class);
            $readiness = $readinessService->evaluate($this->resource);
        }

        return [
            'id' => $this->id,
            'jenis_bmn' => $this->jenis_bmn,
            'kode_barang' => $this->kode_barang,
            'nup' => $this->nup,
            'nup_lama' => $this->nup_lama,
            'nama_barang' => $this->nama_barang,
            'merk' => $this->merk,
            'tipe' => $this->tipe,
            'merk_tipe' => $this->merk_tipe,
            'no_polisi' => $this->no_polisi,
            'no_stnk' => $this->no_stnk,
            'no_mesin' => $this->no_mesin,
            'no_rangka' => $this->no_rangka,
            'no_bpkp' => $this->no_bpkp,
            'nilai_perolehan' => $this->nilai_perolehan ? (float) $this->nilai_perolehan : null,
            'nilai_buku' => $this->nilai_buku ? (float) $this->nilai_buku : null,
            'kondisi' => $this->kondisi,
            'status_penggunaan' => $this->status_penggunaan,
            'henti_guna' => $this->henti_guna,
            'lokasi_ruang' => $this->lokasi_ruang,
            'lokasi_spesifik' => $this->lokasi_spesifik,
            'auction' => $auctionData,
            'pivot' => $auctionData,
            'document_readiness' => $readiness,
            'requires_document_review' => $readiness['requires_document_review'] ?? false,
            'document_readiness_warnings' => $readiness['warnings'] ?? [],
        ];
    }
}
