<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;

class AuctionAssetDocumentReadinessService
{
    /**
     * Check if a field has a valid, non-empty, non-dash value.
     */
    private function hasValidField(?string $value): bool
    {
        $clean = trim((string) $value);
        return $clean !== '' && $clean !== '-';
    }

    /**
     * Check if an asset has at least one physical photo available.
     */
    private function hasPhoto(Asset $asset): bool
    {
        if ((int) $asset->jumlah_foto > 0) {
            return true;
        }

        $photoFields = [
            $asset->foto_geotag_path,
            $asset->foto_geotag_url,
            $asset->foto_depan_path,
            $asset->foto_belakang_path,
            $asset->foto_kiri_path,
            $asset->foto_kanan_path,
            $asset->foto_lokasi_path,
            $asset->foto_url,
        ];

        foreach ($photoFields as $path) {
            if ($this->hasValidField($path)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Detect if the asset is a motor vehicle with a valid police number,
     * or a general asset.
     */
    public function detectAssetType(Asset $asset): string
    {
        $hasNopol = $this->hasValidField($asset->no_polisi);
        if (!$hasNopol) {
            return 'general';
        }

        $jenis = (string) $asset->jenis_bmn;
        $isAngkutanBermotor = stripos($jenis, 'ANGKUTAN BERMOTOR') !== false
            || stripos($jenis, 'KENDARAAN') !== false
            || stripos((string) $asset->nama_barang, 'Sepeda Motor') !== false
            || stripos((string) $asset->nama_barang, 'Mobil') !== false;

        return $isAngkutanBermotor ? 'vehicle' : 'general';
    }

    /**
     * Evaluate the document readiness of an asset.
     */
    public function evaluate(Asset $asset): array
    {
        $type = $this->detectAssetType($asset);
        $warnings = [];

        $hasPhoto = $this->hasPhoto($asset);
        $isVerified = !empty($asset->verified_at);

        if ($type === 'vehicle') {
            // Vehicle with police number requires full docs, photo, and BMN verification
            $hasBpkb = $this->hasValidField($asset->no_bpkp);
            $hasStnk = $this->hasValidField($asset->no_stnk);
            $hasRangka = $this->hasValidField($asset->no_rangka);
            $hasMesin = $this->hasValidField($asset->no_mesin);

            $items = [
                'bpkb' => $hasBpkb ? 'ok' : 'warning',
                'stnk' => $hasStnk ? 'ok' : 'warning',
                'no_polisi' => 'ok',
                'no_rangka' => $hasRangka ? 'ok' : 'warning',
                'no_mesin' => $hasMesin ? 'ok' : 'warning',
                'foto' => $hasPhoto ? 'ok' : 'warning',
                'verifikasi' => $isVerified ? 'ok' : 'warning',
            ];

            if (!$hasBpkb) {
                $warnings[] = 'Nomor BPKB belum tersedia di master aset.';
            }
            if (!$hasStnk) {
                $warnings[] = 'Nomor STNK belum tersedia di master aset.';
            }
            if (!$hasRangka) {
                $warnings[] = 'Nomor Rangka belum tersedia di master aset.';
            }
            if (!$hasMesin) {
                $warnings[] = 'Nomor Mesin belum tersedia di master aset.';
            }
            if (!$hasPhoto) {
                $warnings[] = 'Foto fisik aset belum tersedia/diunggah.';
            }
            if (!$isVerified) {
                $warnings[] = 'Aset belum diverifikasi oleh Petugas BMN.';
            }
        } else {
            // General asset: Only photo and BMN verification required
            $items = [
                'foto' => $hasPhoto ? 'ok' : 'warning',
                'verifikasi' => $isVerified ? 'ok' : 'warning',
            ];

            if (!$hasPhoto) {
                $warnings[] = 'Foto fisik aset belum tersedia/diunggah.';
            }
            if (!$isVerified) {
                $warnings[] = 'Aset belum diverifikasi oleh Petugas BMN.';
            }
        }

        return [
            'asset_type' => $type,
            'requires_document_review' => count($warnings) > 0,
            'warnings' => $warnings,
            'items' => $items,
        ];
    }
}
