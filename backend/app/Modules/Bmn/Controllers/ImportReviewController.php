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

        $query = $batch->stagingRows();

        // Filter by diff_status
        if ($request->filled('status')) {
            $query->where('diff_status', $request->status);
        }

        foreach (['kode_barang', 'nup', 'nama_barang'] as $field) {
            $value = trim((string) $request->input($field, ''));

            if ($value !== '') {
                $query->whereRaw("imported_data->>'{$field}' ILIKE ?", ["%{$value}%"]);
            }
        }

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

        ImportStaging::whereIn('id', $request->ids)
            ->update(['selected' => $request->selected]);

        return response()->json(['message' => 'Seleksi diperbarui.']);
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

                // Get all selected rows
                $selectedRows = $batch->stagingRows()
                    ->where('selected', true)
                    ->where('diff_status', '!=', 'unchanged')
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
                                $updateData[$field] = $values['new'];
                            }
                            if (!empty($updateData)) {
                                $asset->update($updateData);
                            }
                            $updated++;
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
}
