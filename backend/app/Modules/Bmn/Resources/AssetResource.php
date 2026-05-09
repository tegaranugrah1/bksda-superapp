<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kode_barang' => $this->kode_barang,
            'nup' => $this->nup,
            'nama_barang' => $this->nama_barang,
            'merk_tipe' => $this->merk_tipe,
            'tahun_perolehan' => $this->tahun_perolehan,
            'kondisi' => $this->kondisi,
            'nilai_perolehan' => (float) $this->nilai_perolehan,
            'nilai_buku' => (float) $this->nilai_buku,
            'lokasi_spesifik' => $this->lokasi_spesifik,
            'foto_url' => $this->foto_url,
            'keterangan' => $this->keterangan,
            'penanggung_jawab' => $this->whenLoaded('penanggungJawab', function () {
                return [
                    'id' => $this->penanggungJawab->id,
                    'nama' => $this->penanggungJawab->nama,
                    'nip' => $this->penanggungJawab->nip,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
