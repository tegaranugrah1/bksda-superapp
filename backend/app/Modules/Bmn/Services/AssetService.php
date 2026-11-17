<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Kepegawaian\Models\Employee;
use App\Services\PortalNotificationService;
use Illuminate\Support\Facades\DB;

class AssetService
{
    public function storeAsset(array $data)
    {
        return DB::transaction(function () use ($data) {
            $asset = Asset::create($data);

            $this->notifyOwnershipChange($asset, null, $asset->employee_id);
            $this->notifyConditionCritical($asset, null, $asset->kondisi);

            return $asset;
        });
    }

    public function updateAsset(string $assetId, array $data, string $userId)
    {
        return DB::transaction(function () use ($assetId, $data, $userId) {
            $asset = Asset::lockForUpdate()->findOrFail($assetId);
            $oldEmployeeId = $asset->employee_id;
            $oldKondisi = $asset->kondisi;

            // Auto-resolve employee_id dari modul Kepegawaian jika pengguna/nama_pengguna diubah
            if (!array_key_exists('employee_id', $data) && (array_key_exists('pengguna', $data) || array_key_exists('nama_pengguna', $data))) {
                $data['employee_id'] = \App\Modules\Kepegawaian\Models\Employee::resolveIdByName($data['pengguna'] ?? null, $data['nama_pengguna'] ?? null);
            }

            // Track all changed fields
            $skipFields = ['keterangan_audit'];
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

            $this->notifyOwnershipChange($asset, $oldEmployeeId, $asset->employee_id);
            $this->notifyConditionCritical($asset, $oldKondisi, $asset->kondisi);

            return $asset;
        });
    }

    public function disposeAsset(string $assetId, string $userId, ?string $alasan)
    {
        return DB::transaction(function () use ($assetId, $userId, $alasan) {
            $asset = Asset::with(['loans' => fn ($q) => $q->active()])->findOrFail($assetId);

            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $userId,
                'field_changed' => 'STATUS_ASET',
                'old_value' => 'Aktif',
                'new_value' => 'Dihapus/Pemutihan',
                'alasan_perubahan' => $alasan ?? 'Dispose aset',
            ]);

            $this->notifyDisposedAssets([$asset]);
            $asset->delete();

            return true;
        });
    }

    public function notifyOwnershipChange(Asset $asset, ?int $oldEmployeeId, ?int $newEmployeeId, bool $forceRestored = false): void
    {
        if ((int) $oldEmployeeId === (int) $newEmployeeId) {
            if ($forceRestored && $newEmployeeId) {
                $this->notifier()->notifyEmployee(
                    (int) $newEmployeeId,
                    'Pemulihan Aset BMN',
                    "Aset {$this->assetLabel($asset)} telah diaktifkan kembali di daftar penguasaan Anda.",
                    'bmn',
                    'aset',
                    (string) $asset->id,
                    ['asset_id' => (string) $asset->id, 'event' => 'restored']
                );
            }
            return;
        }

        $label = $this->assetLabel($asset);
        if ($oldEmployeeId) {
            $reassigned = $newEmployeeId !== null;
            $this->notifier()->notifyEmployee(
                (int) $oldEmployeeId,
                $reassigned ? 'Pengalihan Tanggung Jawab Aset BMN' : 'Pelepasan Tanggung Jawab Aset BMN',
                $reassigned
                    ? "Tanggung jawab penguasaan aset {$label} telah dialihkan."
                    : "Tanggung jawab penggunaan aset {$label} atas nama Anda telah dilepas.",
                'bmn',
                'aset',
                (string) $asset->id,
                [
                    'asset_id' => (string) $asset->id,
                    'availability' => 'unavailable',
                    'status' => 'removed',
                    'event' => $reassigned ? 'reassigned' : 'revoked',
                ]
            );
        }

        if ($newEmployeeId) {
            $this->notifier()->notifyEmployee(
                (int) $newEmployeeId,
                'Penetapan Penanggung Jawab Aset BMN',
                "Aset {$label} tercatat di bawah tanggung jawab penggunaan Anda.",
                'bmn',
                'aset',
                (string) $asset->id,
                ['asset_id' => (string) $asset->id, 'event' => 'assigned']
            );
        }
    }

    public function notifyConditionCritical(Asset $asset, ?string $oldKondisi, ?string $newKondisi): void
    {
        if ($oldKondisi === 'Rusak Berat' || $newKondisi !== 'Rusak Berat') {
            return;
        }

        $label = $this->assetLabel($asset);
        $this->notifier()->notifyAdmins(
            'bmn',
            'Kondisi Aset BMN Rusak Berat',
            "Aset {$label} berstatus Rusak Berat dan perlu tindak lanjut.",
            'bmn',
            null,
            (string) $asset->id,
            ['asset_id' => (string) $asset->id, 'link' => '/bmn', 'event' => 'condition_rb']
        );

        if ($asset->employee_id) {
            $this->notifier()->notifyEmployee(
                (int) $asset->employee_id,
                'Pembaruan Kondisi Aset BMN',
                "Status kondisi aset {$label} tercatat Rusak Berat.",
                'bmn',
                'aset',
                (string) $asset->id,
                ['asset_id' => (string) $asset->id, 'event' => 'condition_rb']
            );
        }
    }

    public function notifyFreezeTransition(Asset $asset, bool $frozen): void
    {
        if (! $asset->employee_id) {
            return;
        }

        $label = $this->assetLabel($asset);
        $this->notifier()->notifyEmployee(
            (int) $asset->employee_id,
            $frozen ? 'Pembekuan Sementara Aset BMN' : 'Pemulihan Operasional Aset BMN',
            $frozen
                ? "Aset {$label} dibekukan sementara dari penggunaan dinas karena proses pengajuan lelang."
                : "Pembekuan sementara aset {$label} telah dicabut dan operasional dipulihkan.",
            'bmn',
            'aset',
            (string) $asset->id,
            ['asset_id' => (string) $asset->id, 'event' => $frozen ? 'frozen' : 'unfrozen']
        );
    }

    public function notifyDisposedAssets(iterable $assets): void
    {
        $assetList = collect($assets);
        if ($assetList->isEmpty()) {
            return;
        }

        $activeLoansByAsset = AssetLoan::whereIn('asset_id', $assetList->pluck('id'))
            ->active()
            ->get()
            ->groupBy('asset_id');

        $holders = [];
        $borrowers = [];
        foreach ($assetList as $asset) {
            $loans = $activeLoansByAsset->get($asset->id, collect());
            $loanBorrowerIds = $loans->pluck('employee_id')->map(fn ($id) => (int) $id)->all();

            foreach ($loans as $loan) {
                $borrowers[(int) $loan->employee_id][] = ['asset' => $asset, 'loan' => $loan];
            }
            if ($asset->employee_id && ! in_array((int) $asset->employee_id, $loanBorrowerIds, true)) {
                $holders[(int) $asset->employee_id][] = $asset;
            }
        }

        foreach ($holders as $empId => $empAssets) {
            $count = count($empAssets);
            if ($count > 3) {
                $this->notifier()->notifyEmployee(
                    (int) $empId,
                    "Penghapusan / Pemutihan {$count} Aset BMN",
                    "Sebanyak {$count} aset BMN yang sebelumnya tercatat atas nama Anda telah dihapus dari operasional aktif.",
                    'bmn',
                    'aset',
                    null,
                    ['availability' => 'trashed', 'status' => 'removed', 'asset_count' => $count, 'event' => 'disposed_bulk']
                );
                continue;
            }
            foreach ($empAssets as $asset) {
                $this->notifier()->notifyEmployee(
                    (int) $empId,
                    'Penghapusan / Pemutihan Aset BMN',
                    "Aset {$this->assetLabel($asset)} telah dihapus/dimutihkan dari operasional aktif.",
                    'bmn',
                    'aset',
                    (string) $asset->id,
                    ['asset_id' => (string) $asset->id, 'availability' => 'trashed', 'status' => 'removed', 'event' => 'disposed']
                );
            }
        }

        foreach ($borrowers as $empId => $entries) {
            $count = count($entries);
            if ($count > 3) {
                $this->notifier()->notifyEmployee(
                    (int) $empId,
                    "Penghapusan {$count} Aset Pinjaman BMN",
                    "Sebanyak {$count} aset BMN yang sedang Anda pinjam telah dihapus/dimutihkan dari operasional aktif.",
                    'bmn',
                    'pinjaman',
                    null,
                    ['availability' => 'trashed', 'status' => 'removed', 'asset_count' => $count, 'event' => 'disposed_bulk']
                );
                continue;
            }
            foreach ($entries as $entry) {
                /** @var Asset $asset */
                $asset = $entry['asset'];
                $loan = $entry['loan'];
                $this->notifier()->notifyEmployee(
                    (int) $empId,
                    'Penghapusan Aset Pinjaman BMN',
                    "Aset {$this->assetLabel($asset)} yang sedang Anda pinjam telah dihapus/dimutihkan dari operasional aktif.",
                    'bmn',
                    'pinjaman',
                    (string) $loan->id,
                    ['asset_id' => (string) $asset->id, 'loan_id' => (string) $loan->id, 'availability' => 'trashed', 'status' => 'removed', 'event' => 'disposed']
                );
            }
        }
    }

    public function notifyRestoredAssets(iterable $assets): void
    {
        $byEmp = [];
        foreach ($assets as $asset) {
            if ($asset->employee_id) {
                $byEmp[(int) $asset->employee_id][] = $asset;
            }
        }

        foreach ($byEmp as $empId => $empAssets) {
            $count = count($empAssets);
            if ($count > 3) {
                $this->notifier()->notifyEmployee(
                    (int) $empId,
                    "Pemulihan {$count} Aset BMN",
                    "Sebanyak {$count} aset BMN telah diaktifkan kembali di daftar penguasaan Anda.",
                    'bmn',
                    'aset',
                    null,
                    ['asset_count' => $count, 'event' => 'restored_bulk']
                );
                continue;
            }
            foreach ($empAssets as $asset) {
                $this->notifyOwnershipChange($asset, $asset->employee_id, $asset->employee_id, true);
            }
        }
    }

    /**
     * @param  array<int, array<int, Asset>>  $assignedByEmployee
     */
    public function notifyBulkAssigned(array $assignedByEmployee): void
    {
        foreach ($assignedByEmployee as $empId => $empAssets) {
            $count = count($empAssets);
            if ($count > 3) {
                $this->notifier()->notifyEmployee(
                    (int) $empId,
                    "Penetapan {$count} Aset BMN",
                    "Sebanyak {$count} aset BMN baru tercatat di bawah tanggung jawab penggunaan Anda.",
                    'bmn',
                    'aset',
                    null,
                    ['asset_count' => $count, 'event' => 'assigned_bulk']
                );
                continue;
            }
            foreach ($empAssets as $asset) {
                $this->notifyOwnershipChange($asset, null, (int) $empId);
            }
        }
    }

    public function notifyEmployeeBmnClearance(Employee $employee, string $reasonLabel = 'Penonaktifan/Penghapusan Pegawai'): void
    {
        $heldAssetIds = Asset::where('employee_id', $employee->id)->pluck('id');
        $loanAssetIds = AssetLoan::query()
            ->join('bmn_assets', 'bmn_asset_loans.asset_id', '=', 'bmn_assets.id')
            ->whereNull('bmn_assets.deleted_at')
            ->where('bmn_asset_loans.employee_id', $employee->id)
            ->whereIn('bmn_asset_loans.status', ['dipinjam', 'terlambat'])
            ->pluck('bmn_assets.id');

        $uniqueCount = $heldAssetIds->merge($loanAssetIds)->unique()->count();
        if ($uniqueCount <= 0) {
            return;
        }

        $this->notifier()->notifyAdmins(
            'bmn',
            'Tanggungan BMN Pegawai Nonaktif',
            "{$employee->nama_lengkap} masih memiliki {$uniqueCount} aset/pinjaman BMN aktif saat {$reasonLabel}.",
            'bmn',
            null,
            null,
            ['employee_id' => $employee->id, 'asset_count' => $uniqueCount, 'link' => '/bmn', 'event' => 'employee_clearance']
        );
    }

    private function notifier(): PortalNotificationService
    {
        return app(PortalNotificationService::class);
    }

    private function assetLabel(Asset $asset): string
    {
        $parts = array_filter([
            $asset->nama_barang,
            $asset->kode_barang ? "({$asset->kode_barang})" : null,
            $asset->nup ? "NUP {$asset->nup}" : null,
        ]);

        return implode(' ', $parts) ?: 'Aset BMN';
    }
}
