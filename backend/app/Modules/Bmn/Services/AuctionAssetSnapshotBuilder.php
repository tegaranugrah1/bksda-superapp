<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;

class AuctionAssetSnapshotBuilder
{
    public function __construct(
        private AuctionAssetDocumentReadinessService $readinessService
    ) {}

    /**
     * Build the asset snapshot for print stability (Task 16 & Task 66).
     *
     * @param Asset $asset
     * @return array
     */
    public function build(Asset $asset): array
    {
        return $this->buildAssetSnapshot($asset);
    }

    /**
     * Build the asset snapshot for print stability (Task 16).
     *
     * @param Asset $asset
     * @return array
     */
    public function buildAssetSnapshot(Asset $asset): array
    {
        $readiness = $this->readinessService->evaluate($asset);

        return [
            'schema_version' => 1,
            'id' => $asset->id,
            'kode_barang' => $asset->kode_barang,
            'nup' => $asset->nup,
            'nup_lama' => $asset->nup_lama,
            'nama_barang' => $asset->nama_barang,
            'merk' => $asset->merk,
            'tipe' => $asset->tipe,
            'merk_tipe' => $asset->merk_tipe,
            'no_polisi' => $asset->no_polisi,
            'no_mesin' => $asset->no_mesin,
            'no_rangka' => $asset->no_rangka,
            'nilai_perolehan' => $asset->nilai_perolehan,
            'nilai_buku' => $asset->nilai_buku,
            'kondisi' => $asset->kondisi,
            'status_penggunaan' => $asset->status_penggunaan,
            'lokasi' => $asset->lokasi_ruang ?? $asset->lokasi_spesifik ?? null,
            'lokasi_ruang' => $asset->lokasi_ruang,
            'lokasi_spesifik' => $asset->lokasi_spesifik,
            'no_identitas' => $asset->no_identitas,
            'no_stnk' => $asset->no_stnk,
            'tanggal_perolehan' => $asset->tanggal_perolehan instanceof \Carbon\Carbon ? $asset->tanggal_perolehan->toDateString() : $asset->tanggal_perolehan,
            'vehicle_identifiers' => [
                'no_polisi' => $asset->no_polisi,
                'no_rangka' => $asset->no_rangka,
                'no_mesin' => $asset->no_mesin,
                'no_bpkb' => $asset->no_bpkp,
                'no_stnk' => $asset->no_stnk,
            ],
            'document_readiness' => $readiness,
        ];
    }

    /**
     * Build the freeze snapshot before status submission.
     *
     * @param Asset $asset
     * @return array
     */
    public function buildFreezeSnapshot(Asset $asset): array
    {
        return [
            'schema_version' => 1,
            'previous_status_penggunaan' => $asset->status_penggunaan,
            'previous_henti_guna' => $asset->henti_guna,
            'previous_kondisi' => $asset->kondisi,
            'previous_usul_hapus' => $asset->usul_hapus,
            'previous_tanggal_pengapusan' => $asset->tanggal_pengapusan instanceof \Carbon\Carbon ? $asset->tanggal_pengapusan->toDateString() : $asset->tanggal_pengapusan,
        ];
    }

    /**
     * Restore asset state from the freeze snapshot.
     *
     * @param Asset $asset
     * @param array $snapshot
     * @return void
     */
    public function restoreFromFreezeSnapshot(Asset $asset, array $snapshot): void
    {
        if (array_key_exists('previous_status_penggunaan', $snapshot)) {
            $asset->status_penggunaan = $snapshot['previous_status_penggunaan'];
        }
        if (array_key_exists('previous_henti_guna', $snapshot)) {
            $asset->henti_guna = $snapshot['previous_henti_guna'];
        }
        if (array_key_exists('previous_kondisi', $snapshot)) {
            $asset->kondisi = $snapshot['previous_kondisi'];
        }
        if (array_key_exists('previous_usul_hapus', $snapshot)) {
            $asset->usul_hapus = $snapshot['previous_usul_hapus'];
        }
        if (array_key_exists('previous_tanggal_pengapusan', $snapshot)) {
            $asset->tanggal_pengapusan = $snapshot['previous_tanggal_pengapusan'];
        }
        $asset->save();
    }
}
