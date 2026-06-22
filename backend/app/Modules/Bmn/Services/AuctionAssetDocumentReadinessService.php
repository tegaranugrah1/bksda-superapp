<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;

class AuctionAssetDocumentReadinessService
{
    /**
     * Detect if the asset is a vehicle or general asset.
     *
     * @param Asset $asset
     * @return string
     */
    public function detectAssetType(Asset $asset): string
    {
        if (!empty($asset->no_polisi) ||
            !empty($asset->no_rangka) ||
            !empty($asset->no_mesin) ||
            !empty($asset->no_stnk) ||
            !empty($asset->no_bpkp)
        ) {
            return 'vehicle';
        }

        $terms = ['kendaraan', 'alat angkutan', 'roda dua', 'roda empat', 'motor', 'mobil', 'bus', 'truk', 'sepeda motor', 'angkot', 'ambulance'];
        $fields = [$asset->jenis_bmn, $asset->nama_barang, $asset->merk, $asset->tipe, $asset->merk_tipe];
        foreach ($fields as $field) {
            if (empty($field)) {
                continue;
            }
            foreach ($terms as $term) {
                if (stripos($field, $term) !== false) {
                    return 'vehicle';
                }
            }
        }

        return 'general';
    }

    /**
     * Evaluate the document readiness of an asset.
     *
     * @param Asset $asset
     * @return array
     */
    public function evaluate(Asset $asset): array
    {
        $type = $this->detectAssetType($asset);

        if ($type !== 'vehicle') {
            return [
                'asset_type' => 'general',
                'requires_document_review' => false,
                'warnings' => [],
                'items' => [],
            ];
        }

        $warnings = [];
        $items = [
            'bpkb' => 'ok',
            'stnk' => 'ok',
            'no_polisi' => 'ok',
            'no_rangka' => 'ok',
            'no_mesin' => 'ok',
        ];

        if (empty($asset->no_bpkp)) {
            $warnings[] = 'Nomor BPKB belum tersedia di master aset.';
            $items['bpkb'] = 'warning';
        }

        if (empty($asset->no_polisi)) {
            $warnings[] = 'Nomor Polisi belum tersedia di master aset.';
            $items['no_polisi'] = 'warning';
        }

        if (empty($asset->no_rangka)) {
            $warnings[] = 'Nomor Rangka belum tersedia di master aset.';
            $items['no_rangka'] = 'warning';
        }

        if (empty($asset->no_mesin)) {
            $warnings[] = 'Nomor Mesin belum tersedia di master aset.';
            $items['no_mesin'] = 'warning';
        }

        return [
            'asset_type' => 'vehicle',
            'requires_document_review' => count($warnings) > 0,
            'warnings' => $warnings,
            'items' => $items,
        ];
    }
}
