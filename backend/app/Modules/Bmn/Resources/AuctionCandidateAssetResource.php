<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use App\Modules\Bmn\Services\AuctionAssetDocumentReadinessService;

class AuctionCandidateAssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $readinessService = app(AuctionAssetDocumentReadinessService::class);
        $readiness = $readinessService->evaluate($this->resource);

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
            
            // Candidate specific fields
            'active_auction_batch_id' => $this->active_auction_batch_id ?? null,
            'active_auction_batch_number' => $this->active_auction_batch_number ?? null,
            'is_auction_eligible' => empty($this->active_auction_batch_id),
            
            // Document readiness fields
            'document_readiness' => $readiness,
            'requires_document_review' => $readiness['requires_document_review'] ?? false,
            'document_readiness_warnings' => $readiness['warnings'] ?? [],
        ];
    }
}
