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

            // Track all changed fields
            $skipFields = ['keterangan_audit', 'employee_id'];
            foreach ($data as $field => $newValue) {
                if (in_array($field, $skipFields)) continue;
                
                $oldValue = $asset->{$field};
                
                // Normalize for comparison
                $oldNorm = is_null($oldValue) ? '' : trim((string) $oldValue);
                $newNorm = is_null($newValue) ? '' : trim((string) $newValue);
                
                // Skip if both are empty/null
                if ($oldNorm === '' && $newNorm === '') continue;

                // Check numeric equality (e.g. 143678570.00 == 143678570)
                if (is_numeric($oldNorm) && is_numeric($newNorm) && (float) $oldNorm == (float) $newNorm) {
                    continue;
                }

                // Check date equality (e.g. 2028-10-06 00:00:00 == 2028-10-06)
                if (strlen($oldNorm) >= 10 && strlen($newNorm) === 10 && substr($oldNorm, 0, 10) === $newNorm) {
                    continue;
                }

                if ($oldNorm !== $newNorm) {
                    AssetUpdate::create([
                        'asset_id' => $asset->id,
                        'user_id' => $userId,
                        'field_changed' => $field,
                        'old_value' => $oldNorm ?: null,
                        'new_value' => $newNorm ?: null,
                        'alasan_perubahan' => $data['keterangan_audit'] ?? null,
                    ]);
                }
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
