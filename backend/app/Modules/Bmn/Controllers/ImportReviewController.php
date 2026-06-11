<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Imports\AssetStagingImport;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\ImportBatch;
use App\Modules\Bmn\Models\ImportStaging;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class ImportReviewController extends Controller
{
    /**
     * Step 1: Upload Excel → parse to staging → return batch summary.
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:20480',
        ]);

        try {
            // Create batch record
            $batch = ImportBatch::create([
                'uploaded_by' => $request->user()->id,
                'filename' => $request->file('file')->getClientOriginalName(),
                'status' => 'pending',
            ]);

            // Parse Excel into staging table
            $import = new AssetStagingImport($batch);
            Excel::import($import, $request->file('file'));

            // Update batch summary
            $summary = $import->getSummary();
            $batch->update([
                'total_rows' => $summary['total'],
                'new_rows' => $summary['new'],
                'updated_rows' => $summary['updated'],
                'unchanged_rows' => $summary['unchanged'],
            ]);

            return response()->json([
                'message' => 'File berhasil diproses. Silakan review perubahan.',
                'batch' => [
                    'id' => $batch->id,
                    'filename' => $batch->filename,
                    'total_rows' => $summary['total'],
                    'new_rows' => $summary['new'],
                    'updated_rows' => $summary['updated'],
                    'unchanged_rows' => $summary['unchanged'],
                    'status' => 'pending',
                ],
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Gagal memproses file: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Step 2: Get batch detail with staging rows for review.
     */
    public function show(string $batchId, Request $request): JsonResponse
    {
        $batch = ImportBatch::findOrFail($batchId);

        $query = $this->buildFilteredRowsQuery($batch, $request);
        $selectionQuery = $this->applyIdentityFilters($batch->stagingRows(), $request);

        $selectionSummary = [
            'selected_total' => (clone $selectionQuery)
                ->where('selected', true)
                ->whereIn('diff_status', ['new', 'updated'])
                ->count(),
            'selected_new' => (clone $selectionQuery)
                ->where('selected', true)
                ->where('diff_status', 'new')
                ->count(),
            'selected_updated' => (clone $selectionQuery)
                ->where('selected', true)
                ->where('diff_status', 'updated')
                ->count(),
            'filtered_new' => (clone $selectionQuery)->where('diff_status', 'new')->count(),
            'filtered_updated' => (clone $selectionQuery)->where('diff_status', 'updated')->count(),
        ];

        // Paginate
        $perPage = $request->integer('per_page', 50);
        $rows = $query->orderByRaw("CASE diff_status WHEN 'new' THEN 1 WHEN 'updated' THEN 2 WHEN 'unchanged' THEN 3 END")
            ->paginate($perPage);

        // For updated rows, include existing asset data for comparison
        $rows->getCollection()->transform(function ($row) {
            $data = [
                'id' => $row->id,
                'diff_status' => $row->diff_status,
                'imported_data' => $row->imported_data,
                'changed_fields' => $row->changed_fields,
                'selected' => $row->selected,
                'existing_asset_id' => $row->existing_asset_id,
            ];

            return $data;
        });

        return response()->json([
            'batch' => [
                'id' => $batch->id,
                'filename' => $batch->filename,
                'total_rows' => $batch->total_rows,
                'new_rows' => $batch->new_rows,
                'updated_rows' => $batch->updated_rows,
                'unchanged_rows' => $batch->unchanged_rows,
                'status' => $batch->status,
                'created_at' => $batch->created_at,
            ],
            'rows' => $rows,
            'selection_summary' => $selectionSummary,
        ]);
    }

    /**
     * Step 2b: Toggle selection of individual rows.
     */
    public function toggleSelection(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'string',
            'selected' => 'required|boolean',
        ]);

        $rows = ImportStaging::whereIn('id', $request->ids)
            ->whereIn('diff_status', ['new', 'updated'])
            ->get();

        foreach ($rows as $row) {
            $updates = ['selected' => $request->selected];

            if ($row->diff_status === 'updated') {
                $updates['changed_fields'] = $this->setAllFieldSelection($row->changed_fields ?? [], $request->boolean('selected'));
            }

            $row->update($updates);
        }

        return response()->json(['message' => 'Seleksi diperbarui.']);
    }

    /**
     * Step 2bb: Toggle approval of one changed field in an updated row.
     */
    public function toggleFieldSelection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'row_id' => 'required|string|exists:bmn_import_staging,id',
            'field' => 'required|string|max:255',
            'selected' => 'required|boolean',
        ]);

        $row = ImportStaging::where('diff_status', 'updated')
            ->whereHas('batch', fn ($query) => $query->where('status', 'pending'))
            ->findOrFail($validated['row_id']);

        $changedFields = $row->changed_fields ?? [];
        if (!array_key_exists($validated['field'], $changedFields)) {
            return response()->json(['error' => 'Kolom perubahan tidak ditemukan.'], 422);
        }

        $changedFields[$validated['field']]['selected'] = $validated['selected'];
        $row->update([
            'changed_fields' => $changedFields,
            'selected' => $this->hasSelectedChangedField($changedFields),
        ]);

        return response()->json(['message' => 'Seleksi kolom diperbarui.']);
    }

    /**
     * Step 2c: Bulk selection for all filtered rows in the batch.
     */
    public function bulkSelection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:bmn_import_batches,id',
            'action' => 'required|string|in:select_changed,clear_changed,select_new_only',
            'kode_barang' => 'nullable|string|max:255',
            'nup' => 'nullable|string|max:255',
            'nama_barang' => 'nullable|string|max:255',
        ]);

        $batch = ImportBatch::findOrFail($validated['batch_id']);
        $baseQuery = $this->applyIdentityFilters($batch->stagingRows(), $request);

        if ($validated['action'] === 'select_changed') {
            // Select ALL changed rows (new + updated)
            $rows = (clone $baseQuery)
                ->whereIn('diff_status', ['new', 'updated'])
                ->get();

            $selected = 0;
            foreach ($rows as $row) {
                $updates = ['selected' => true];
                if ($row->diff_status === 'updated') {
                    $updates['changed_fields'] = $this->setAllFieldSelection($row->changed_fields ?? [], true);
                }
                $row->update($updates);
                $selected++;
            }

            return response()->json([
                'message' => "{$selected} baris (baru + update) dipilih.",
                'selected' => $selected,
            ]);
        }

        if ($validated['action'] === 'select_new_only') {
            // Clear all, then select only new rows
            $changedRows = (clone $baseQuery)
                ->where('diff_status', '!=', 'unchanged')
                ->get();

            foreach ($changedRows as $row) {
                $updates = ['selected' => false];
                if ($row->diff_status === 'updated') {
                    $updates['changed_fields'] = $this->setAllFieldSelection($row->changed_fields ?? [], false);
                }
                $row->update($updates);
            }

            $selected = (clone $baseQuery)
                ->where('diff_status', 'new')
                ->update(['selected' => true]);

            return response()->json([
                'message' => "{$selected} aset baru dipilih.",
                'selected' => $selected,
            ]);
        }

        $rows = $baseQuery
            ->where('diff_status', '!=', 'unchanged')
            ->get();

        $affected = 0;
        foreach ($rows as $row) {
            $updates = ['selected' => false];
            if ($row->diff_status === 'updated') {
                $updates['changed_fields'] = $this->setAllFieldSelection($row->changed_fields ?? [], false);
            }
            $row->update($updates);
            $affected++;
        }

        return response()->json([
            'message' => 'Seleksi massal diperbarui.',
            'affected' => $affected,
        ]);
    }

    /**
     * Step 3: Approve batch → apply selected rows to bmn_assets.
     */
    public function approve(string $batchId, Request $request): JsonResponse
    {
        $batch = ImportBatch::where('status', 'pending')->findOrFail($batchId);

        try {
            $result = DB::transaction(function () use ($batch, $request) {
                $inserted = 0;
                $updated = 0;

                // Get all selected rows (new + updated)
                $selectedRows = $batch->stagingRows()
                    ->where('selected', true)
                    ->whereIn('diff_status', ['new', 'updated'])
                    ->get();

                foreach ($selectedRows as $row) {
                    $data = $row->imported_data;

                    if ($row->diff_status === 'new') {
                        // Insert new asset — use updateOrCreate to handle edge cases
                        $kodeBarang = $data['kode_barang'] ?? null;
                        $nup = $data['nup'] ?? null;

                        if ($kodeBarang && $nup) {
                            // Check if asset exists (including soft-deleted)
                            $existing = Asset::withTrashed()
                                ->where('kode_barang', $kodeBarang)
                                ->where('nup', (string) $nup)
                                ->first();

                            if ($existing) {
                                // Restore if soft-deleted, then update
                                if ($existing->trashed()) {
                                    $existing->restore();
                                }
                                $existing->update($data);
                                $updated++;
                            } else {
                                $data['id'] = (string) Str::uuid();
                                Asset::create($data);
                                $inserted++;
                            }
                        } else {
                            $data['id'] = (string) Str::uuid();
                            Asset::create($data);
                            $inserted++;
                        }
                    } elseif ($row->diff_status === 'updated' && $row->existing_asset_id) {
                        // Update existing asset (only changed fields)
                        $asset = Asset::withTrashed()->find($row->existing_asset_id);
                        if ($asset) {
                            if ($asset->trashed()) {
                                $asset->restore();
                            }
                            $changedFields = $row->changed_fields ?? [];
                            $updateData = [];
                            foreach ($changedFields as $field => $values) {
                                if (($values['selected'] ?? true) === false) {
                                    continue;
                                }
                                $updateData[$field] = $values['new'];
                            }
                            if (!empty($updateData)) {
                                $asset->update($updateData);
                                $updated++;
                            }
                        }
                    }
                }

                // Mark batch as approved
                $batch->update([
                    'status' => 'approved',
                    'approved_at' => now(),
                    'approved_by' => $request->user()->id,
                ]);

                return ['inserted' => $inserted, 'updated' => $updated];
            });

            return response()->json([
                'message' => "Import disetujui! {$result['inserted']} aset baru ditambahkan, {$result['updated']} aset diperbarui.",
                'inserted' => $result['inserted'],
                'updated' => $result['updated'],
            ]);
        } catch (Exception $e) {
            return response()->json(['error' => 'Gagal menyetujui import: ' . $e->getMessage()], 422);
        }
    }

    /**
     * Reject batch → discard all staging data.
     */
    public function reject(string $batchId, Request $request): JsonResponse
    {
        $batch = ImportBatch::where('status', 'pending')->findOrFail($batchId);

        $batch->update(['status' => 'rejected']);

        // Delete staging rows
        $batch->stagingRows()->delete();

        return response()->json(['message' => 'Import dibatalkan.']);
    }

    /**
     * List all batches (history).
     */
    public function index(Request $request): JsonResponse
    {
        $batches = ImportBatch::with('uploader:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 10));

        return response()->json($batches);
    }

    private function setAllFieldSelection(array $changedFields, bool $selected): array
    {
        foreach ($changedFields as $field => $values) {
            $changedFields[$field]['selected'] = $selected;
        }

        return $changedFields;
    }

    private function hasSelectedChangedField(array $changedFields): bool
    {
        foreach ($changedFields as $values) {
            if (($values['selected'] ?? true) !== false) {
                return true;
            }
        }

        return false;
    }

    private function buildFilteredRowsQuery(ImportBatch $batch, Request $request)
    {
        $query = $this->applyIdentityFilters($batch->stagingRows(), $request);

        if ($request->filled('status')) {
            $query->where('diff_status', $request->status);
        }

        return $query;
    }

    private function applyIdentityFilters($query, Request $request)
    {
        foreach (['kode_barang', 'nup', 'nama_barang'] as $field) {
            $value = trim((string) $request->input($field, ''));

            if ($value !== '') {
                $query->whereRaw("imported_data->>'{$field}' ILIKE ?", ["%{$value}%"]);
            }
        }

        return $query;
    }
}
