<?php

namespace App\Modules\Bmn\Imports;

use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\ImportBatch;
use App\Modules\Bmn\Models\ImportStaging;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithChunkReading;

class AssetStagingImport implements ToArray, WithHeadingRow, WithChunkReading
{
    private ImportBatch $batch;
    private int $newCount = 0;
    private int $updatedCount = 0;
    private int $unchangedCount = 0;

    // Compare ALL fields in imported data (not just a subset)
    private const SKIP_FIELDS = ['id', 'created_at', 'updated_at', 'deleted_at', 'employee_id', 'foto_url', 'keterangan'];

    public function __construct(ImportBatch $batch)
    {
        $this->batch = $batch;
    }

    public function array(array $rows): void
    {
        $stagingRows = [];

        foreach ($rows as $row) {
            $kodeBarang = $row['kode_barang'] ?? null;
            $nup = $row['nup'] ?? null;
            $namaBarang = $row['nama_barang'] ?? null;

            if (!$kodeBarang || !$nup || !$namaBarang) {
                continue;
            }

            $importedData = $this->mapRowToData($row);

            // Find existing asset by kode_barang + nup (include soft-deleted)
            $existing = Asset::withTrashed()
                ->where('kode_barang', $kodeBarang)
                ->where('nup', (string) $nup)
                ->first();

            if ($existing) {
                // Compare fields
                $changedFields = $this->detectChanges($existing, $importedData);

                // If asset is soft-deleted, always mark as "updated" (needs restore)
                if ($existing->trashed()) {
                    $this->updatedCount++;
                    $diffStatus = 'updated';
                    if (empty($changedFields)) {
                        $changedFields = ['_restore' => ['old' => 'Dihapus', 'new' => 'Aktif']];
                    } else {
                        $changedFields['_restore'] = ['old' => 'Dihapus', 'new' => 'Aktif'];
                    }
                } elseif (empty($changedFields)) {
                    $this->unchangedCount++;
                    $diffStatus = 'unchanged';
                } else {
                    $this->updatedCount++;
                    $diffStatus = 'updated';
                }

                $stagingRows[] = [
                    'id' => (string) Str::uuid(),
                    'batch_id' => $this->batch->id,
                    'existing_asset_id' => $existing->id,
                    'diff_status' => $diffStatus,
                    'imported_data' => json_encode($importedData),
                    'changed_fields' => !empty($changedFields) ? json_encode($changedFields) : null,
                    'selected' => $diffStatus !== 'unchanged',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            } else {
                $this->newCount++;
                $stagingRows[] = [
                    'id' => (string) Str::uuid(),
                    'batch_id' => $this->batch->id,
                    'existing_asset_id' => null,
                    'diff_status' => 'new',
                    'imported_data' => json_encode($importedData),
                    'changed_fields' => null,
                    'selected' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }
        }

        // Bulk insert staging rows
        if (!empty($stagingRows)) {
            foreach (array_chunk($stagingRows, 200) as $chunk) {
                ImportStaging::insert($chunk);
            }
        }
    }

    public function chunkSize(): int
    {
        return 500;
    }

    public function getSummary(): array
    {
        return [
            'total' => $this->newCount + $this->updatedCount + $this->unchangedCount,
            'new' => $this->newCount,
            'updated' => $this->updatedCount,
            'unchanged' => $this->unchangedCount,
        ];
    }

    /**
     * Detect which fields changed between existing asset and imported data.
     * Compares ALL fields in imported data (full 80 columns).
     */
    private function detectChanges(Asset $existing, array $importedData): array
    {
        $changes = [];

        foreach ($importedData as $field => $newValue) {
            // Skip non-comparable fields
            if (in_array($field, self::SKIP_FIELDS)) {
                continue;
            }

            $oldValue = $existing->{$field};

            // Normalize for comparison
            $oldNorm = $this->normalize($oldValue);
            $newNorm = $this->normalize($newValue);

            // Detect change if values differ
            // Include cases where old has value but new is empty (field cleared)
            if ($oldNorm !== $newNorm) {
                $changes[$field] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }

        return $changes;
    }

    private function normalize($value): string
    {
        if ($value === null || $value === '' || $value === '-') {
            return '';
        }
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        // Normalize numbers: remove trailing .00 decimals
        if (is_numeric($value)) {
            $float = (float) $value;
            if ($float == (int) $float) {
                return (string) (int) $float;
            }
            return (string) $float;
        }
        return strtolower(trim((string) $value));
    }

    /**
     * Map Excel row to asset data array (delegated to AssetImport SSOT).
     */
    private function mapRowToData(array $row): array
    {
        return AssetImport::mapExcelRow($row);
    }
}
