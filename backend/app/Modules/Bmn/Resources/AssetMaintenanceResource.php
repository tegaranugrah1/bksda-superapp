<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetMaintenanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'tanggal_service' => $this->tanggal_service?->toDateString(),
            'biaya' => (float) $this->biaya,
            'deskripsi' => $this->deskripsi,
            'bukti_nota_url' => $this->bukti_nota_url,
            'asset' => $this->whenLoaded('asset', function () {
                return [
                    'id' => $this->asset->id,
                    'kode_barang' => $this->asset->kode_barang,
                    'nama_barang' => $this->asset->nama_barang,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
