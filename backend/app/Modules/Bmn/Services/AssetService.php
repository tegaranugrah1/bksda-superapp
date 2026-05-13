<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use Illuminate\Support\Facades\DB;

class AssetService
{
    public function storeAsset(array $data)
    {
        return DB::transaction(function () use ($data) {
            return Asset::create($data);
        });
    }

    public function updateAsset(string $assetId, array $data, string $userId)
    {
        return DB::transaction(function () use ($assetId, $data, $userId) {
            $asset = Asset::lockForUpdate()->findOrFail($assetId);

            if (isset($data['nilai_perolehan'])) {
                $oldNilai = (float) $asset->nilai_perolehan;
                $newNilai = (float) $data['nilai_perolehan'];

                if ($oldNilai !== $newNilai) {
                    AssetUpdate::create([
                        'asset_id' => $asset->id,
                        'user_id' => $userId,
                        'field_changed' => 'nilai_perolehan',
                        'old_value' => (string) $oldNilai,
                        'new_value' => (string) $newNilai,
                        'alasan_perubahan' => $data['keterangan_audit'] ?? 'Penyusutan Tahunan atau Revisi Nilai',
                    ]);
                }
            }

            if (isset($data['kondisi']) && $asset->kondisi !== $data['kondisi']) {
                AssetUpdate::create([
                    'asset_id' => $asset->id,
                    'user_id' => $userId,
                    'field_changed' => 'kondisi',
                    'old_value' => $asset->kondisi,
                    'new_value' => $data['kondisi'],
                    'alasan_perubahan' => 'Pembaruan kondisi fisik aset',
                ]);
            }

            $asset->update($data);

            return $asset;
        });
    }

    public function disposeAsset(string $assetId, string $userId, ?string $alasan)
    {
        return DB::transaction(function () use ($assetId, $userId, $alasan) {
            $asset = Asset::findOrFail($assetId);

            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $userId,
                'field_changed' => 'STATUS_ASET',
                'old_value' => 'Aktif',
                'new_value' => 'Dihapus/Pemutihan',
                'alasan_perubahan' => $alasan ?? 'Dispose aset',
            ]);

            $asset->delete();

            return true;
        });
    }
}
