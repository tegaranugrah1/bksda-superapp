<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetMaintenance;
use App\Modules\Bmn\Models\AssetUpdate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class MaintenanceService
{
    public function recordMaintenance(string $assetId, array $data)
    {
        return DB::transaction(function () use ($assetId, $data) {
            $asset = Asset::lockForUpdate()->findOrFail($assetId);

            $maintenance = AssetMaintenance::create([
                'asset_id' => $asset->id,
                'tanggal_service' => $data['tanggal_service'],
                'biaya' => $data['biaya'] ?? 0,
                'deskripsi' => $data['deskripsi'],
                'bukti_nota_url' => $data['bukti_nota_url'] ?? null,
            ]);

            if (isset($data['kondisi_baru']) && $asset->kondisi !== $data['kondisi_baru']) {
                $oldKondisi = $asset->kondisi;
                $asset->update(['kondisi' => $data['kondisi_baru']]);
                AssetUpdate::create([
                    'asset_id' => $asset->id,
                    'user_id' => Auth::id(),
                    'field_changed' => 'kondisi',
                    'old_value' => $oldKondisi,
                    'new_value' => $data['kondisi_baru'],
                    'alasan_perubahan' => 'Pembaruan kondisi pasca pemeliharaan',
                ]);
                app(AssetService::class)->notifyConditionCritical($asset, $oldKondisi, $data['kondisi_baru']);
            }

            return $maintenance;
        });
    }
}
