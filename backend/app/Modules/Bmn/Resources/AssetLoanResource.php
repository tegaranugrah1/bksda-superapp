<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetLoanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'employee_id' => $this->employee_id,
            'tanggal_pinjam' => $this->tanggal_pinjam?->toDateString(),
            'tanggal_kembali' => $this->tanggal_kembali?->toDateString(),
            'status' => $this->status,
            'keterangan' => $this->keterangan,
            'asset' => $this->whenLoaded('asset', function () {
                return [
                    'id' => $this->asset->id,
                    'kode_barang' => $this->asset->kode_barang,
                    'nama_barang' => $this->asset->nama_barang,
                ];
            }),
            'borrower' => $this->whenLoaded('borrower', function () {
                return [
                    'id' => $this->borrower->id,
                    'nama' => $this->borrower->nama,
                    'nip' => $this->borrower->nip,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
