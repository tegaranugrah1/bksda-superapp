<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Imports\AssetStagingImport;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Bmn\Models\ImportBatch;
use App\Modules\Bmn\Models\ImportStaging;
use App\Support\Security\UploadValidationRules;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
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
            'file' => [
                'required',
                'file',
                'mimes:xlsx,xls',
                'extensions:xlsx,xls',
                'max:10240',
            ],
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
            Log::warning('BMN import review upload failed.', [
                'user_id' => $request->user()?->id,
                'filename' => $request->file('file')?->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            return response()->json(['error' => 'Gagal memproses file. Pastikan format dan isi template sudah sesuai.'], 422);
        }
    }

    /**
     * Step 2: Get batch detail with staging rows for review.
     */
    public function show(string $batchId, Request $request): JsonResponse
    {
        $batch = ImportBatch::findOrFail($batchId);

        $query = $this->buildFilteredRowsQuery($batch, $request);
        $selectionSummary = $this->computeSelectionSummary($batch, $request);

        // Paginate with deterministic tie-breaker so Postgres row updates never shift page order
        $perPage = max(1, min($request->integer('per_page', 50), 200));
        $rows = $query->orderByRaw("CASE diff_status WHEN 'new' THEN 1 WHEN 'updated' THEN 2 WHEN 'unchanged' THEN 3 END")
            ->orderBy('id')
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
            'field_summary' => $this->computeFieldSummary($batch, $request),
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
            'kode_barang' => 'nullable|string|max:255',
            'nup' => 'nullable|string|max:255',
            'nama_barang' => 'nullable|string|max:255',
        ]);

        $batch = DB::transaction(function () use ($request) {
            $rows = ImportStaging::whereIn('id', $request->ids)
                ->whereIn('diff_status', ['new', 'updated'])
                ->whereHas('batch', fn ($query) => $query->where('status', 'pending'))
                ->lockForUpdate()
                ->get();

            $selected = $request->boolean('selected');
            foreach ($rows as $row) {
                /** @var ImportStaging $row */
                $updates = ['selected' => $selected];

                if ($row->diff_status === 'updated') {
                    $updates['changed_fields'] = $this->setAllFieldSelection($row->changed_fields ?? [], $selected);
                }

                $row->update($updates);
            }

            $batchId = $rows->first()?->batch_id;
            return $batchId ? ImportBatch::find($batchId) : null;
        });

        return response()->json([
            'message' => 'Seleksi diperbarui.',
            'selection_summary' => $batch ? $this->computeSelectionSummary($batch, $request) : null,
        ]);
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
            'kode_barang' => 'nullable|string|max:255',
            'nup' => 'nullable|string|max:255',
            'nama_barang' => 'nullable|string|max:255',
        ]);

        $result = DB::transaction(function () use ($validated) {
            // Lock row so rapid consecutive column toggles on the same row cannot overwrite each other.
            $row = ImportStaging::where('diff_status', 'updated')
                ->whereHas('batch', fn ($query) => $query->where('status', 'pending'))
                ->lockForUpdate()
                ->findOrFail($validated['row_id']);

            $changedFields = $row->changed_fields ?? [];
            if (!array_key_exists($validated['field'], $changedFields)) {
                return null;
            }

            $changedFields[$validated['field']]['selected'] = $validated['selected'];
            $row->update([
                'changed_fields' => $changedFields,
                'selected' => $this->hasSelectedChangedField($changedFields),
            ]);

            return $row->fresh('batch');
        });

        if ($result === null) {
            return response()->json(['error' => 'Kolom perubahan tidak ditemukan.'], 422);
        }

        return response()->json([
            'message' => 'Seleksi kolom diperbarui.',
            'row' => [
                'id' => $result->id,
                'selected' => $result->selected,
                'changed_fields' => $result->changed_fields,
            ],
            'selection_summary' => $result->batch ? $this->computeSelectionSummary($result->batch, $request) : null,
        ]);
    }

    /**
     * Step 2c: Bulk selection for all filtered rows in the batch.
     */
    public function bulkSelection(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:bmn_import_batches,id',
            'action' => 'required|string|in:select_changed,clear_changed,select_new_only,select_updated,clear_updated,select_field,clear_field',
            'field' => ['required_if:action,select_field,clear_field', 'nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9_]+$/'],
            'kode_barang' => 'nullable|string|max:255',
            'nup' => 'nullable|string|max:255',
            'nama_barang' => 'nullable|string|max:255',
        ]);

        $batch = ImportBatch::where('status', 'pending')->findOrFail($validated['batch_id']);

        $count = DB::transaction(function () use ($batch, $request, $validated) {
            $baseQuery = $this->applyIdentityFilters($batch->stagingRows(), $request);

            if ($validated['action'] === 'select_updated' || $validated['action'] === 'clear_updated') {
                $selectFlag = $validated['action'] === 'select_updated';
                $boolLiteral = $selectFlag ? 'true' : 'false';

                if (DB::connection()->getDriverName() === 'pgsql') {
                    $targetQuery = (clone $baseQuery)
                        ->where('diff_status', 'updated')
                        ->whereNotNull('changed_fields')
                        ->select('id');

                    return DB::update(
                        "UPDATE bmn_import_staging
                         SET changed_fields = COALESCE(
                             (SELECT jsonb_object_agg(kv.key, jsonb_set(kv.value, '{selected}', '{$boolLiteral}'::jsonb, true))
                              FROM jsonb_each(changed_fields::jsonb) AS kv),
                             '{}'::jsonb
                         )::json,
                         selected = {$boolLiteral},
                         updated_at = NOW()
                         WHERE id IN ({$targetQuery->toSql()})",
                        $targetQuery->getBindings()
                    );
                }

                $rows = (clone $baseQuery)
                    ->where('diff_status', 'updated')
                    ->whereNotNull('changed_fields')
                    ->lockForUpdate()
                    ->get();

                foreach ($rows as $row) {
                    $nextFields = $this->setAllFieldSelection($row->changed_fields ?? [], $selectFlag);
                    if ($row->selected !== $selectFlag || $nextFields !== $row->changed_fields) {
                        $row->update(['selected' => $selectFlag, 'changed_fields' => $nextFields]);
                    }
                }

                return $rows->count();
            }

            if ($validated['action'] === 'select_field' || $validated['action'] === 'clear_field') {
                $field = (string) $validated['field'];
                $selectFlag = $validated['action'] === 'select_field';

                if (DB::connection()->getDriverName() === 'pgsql') {
                    $targetQuery = (clone $baseQuery)
                        ->where('diff_status', 'updated')
                        ->whereNotNull('changed_fields')
                        ->whereRaw('jsonb_exists(changed_fields::jsonb, ?)', [$field])
                        ->select('id');
                    $boolLiteral = $selectFlag ? 'true' : 'false';
                    $selectedSql = $selectFlag
                        ? 'true'
                        : "EXISTS (SELECT 1 FROM jsonb_each(jsonb_set(changed_fields::jsonb, ARRAY['{$field}', 'selected'], 'false'::jsonb, true)) AS kv WHERE COALESCE((kv.value->>'selected')::boolean, true))";

                    return DB::update(
                        "UPDATE bmn_import_staging SET changed_fields = jsonb_set(changed_fields::jsonb, ARRAY['{$field}', 'selected'], '{$boolLiteral}'::jsonb, true)::json, selected = {$selectedSql}, updated_at = NOW() WHERE id IN ({$targetQuery->toSql()})",
                        $targetQuery->getBindings()
                    );
                }

                $rows = (clone $baseQuery)
                    ->where('diff_status', 'updated')
                    ->whereNotNull('changed_fields')
                    ->lockForUpdate()
                    ->get();

                $affected = 0;
                foreach ($rows as $row) {
                    $changedFields = $row->changed_fields ?? [];
                    if (!array_key_exists($field, $changedFields)) {
                        continue;
                    }
                    $changedFields[$field]['selected'] = $selectFlag;
                    $row->update([
                        'changed_fields' => $changedFields,
                        'selected' => $this->hasSelectedChangedField($changedFields),
                    ]);
                    $affected++;
                }

                return $affected;
            }

            if ($validated['action'] === 'select_changed') {
                (clone $baseQuery)->where('diff_status', 'new')->where('selected', false)->update(['selected' => true]);

                $updatedRows = (clone $baseQuery)->where('diff_status', 'updated')->lockForUpdate()->get();
                foreach ($updatedRows as $row) {
                    $nextFields = $this->setAllFieldSelection($row->changed_fields ?? [], true);
                    if (!$row->selected || $nextFields !== $row->changed_fields) {
                        $row->update(['selected' => true, 'changed_fields' => $nextFields]);
                    }
                }

                return (clone $baseQuery)->whereIn('diff_status', ['new', 'updated'])->count();
            }

            if ($validated['action'] === 'select_new_only') {
                $selectedUpdatedRows = (clone $baseQuery)->where('diff_status', 'updated')->where('selected', true)->lockForUpdate()->get();
                foreach ($selectedUpdatedRows as $row) {
                    $row->update([
                        'selected' => false,
                        'changed_fields' => $this->setAllFieldSelection($row->changed_fields ?? [], false),
                    ]);
                }

                (clone $baseQuery)->where('diff_status', 'new')->where('selected', false)->update(['selected' => true]);

                return (clone $baseQuery)->where('diff_status', 'new')->count();
            }

            (clone $baseQuery)->where('diff_status', 'new')->where('selected', true)->update(['selected' => false]);
            $selectedUpdatedRows = (clone $baseQuery)->where('diff_status', 'updated')->where('selected', true)->lockForUpdate()->get();
            foreach ($selectedUpdatedRows as $row) {
                $row->update([
                    'selected' => false,
                    'changed_fields' => $this->setAllFieldSelection($row->changed_fields ?? [], false),
                ]);
            }

            return (clone $baseQuery)->whereIn('diff_status', ['new', 'updated'])->count();
        });

        $summary = $this->computeSelectionSummary($batch, $request);
        $fieldSummary = $this->computeFieldSummary($batch, $request);

        if ($validated['action'] === 'select_updated' || $validated['action'] === 'clear_updated') {
            $verb = $validated['action'] === 'select_updated' ? 'dipilih' : 'dilepas';
            return response()->json([
                'message' => "Semua kolom pada {$count} baris update {$verb}.",
                'affected' => $count,
                'selection_summary' => $summary,
                'field_summary' => $fieldSummary,
            ]);
        }

        if ($validated['action'] === 'select_field' || $validated['action'] === 'clear_field') {
            $verb = $validated['action'] === 'select_field' ? 'dipilih' : 'dibatalkan';
            return response()->json([
                'message' => "{$count} baris update kolom {$validated['field']} {$verb}.",
                'affected' => $count,
                'selection_summary' => $summary,
                'field_summary' => $fieldSummary,
            ]);
        }

        if ($validated['action'] === 'select_changed') {
            return response()->json([
                'message' => "{$count} baris (baru + update) dipilih.",
                'selected' => $count,
                'selection_summary' => $summary,
                'field_summary' => $fieldSummary,
            ]);
        }

        if ($validated['action'] === 'select_new_only') {
            return response()->json([
                'message' => "{$count} aset baru dipilih.",
                'selected' => $count,
                'selection_summary' => $summary,
                'field_summary' => $fieldSummary,
            ]);
        }

        return response()->json([
            'message' => 'Seleksi massal diperbarui.',
            'affected' => $count,
            'selection_summary' => $summary,
            'field_summary' => $fieldSummary,
        ]);
    }

    /**
     * Step 3: Approve batch → apply selected rows to bmn_assets.
     */
    public function approve(string $batchId, Request $request): JsonResponse
    {
        try {
            $result = DB::transaction(function () use ($batchId, $request) {
                $batch = ImportBatch::where('status', 'pending')->lockForUpdate()->findOrFail($batchId);
                $inserted = 0;
                $updated = 0;
                $bulkAssigned = [];
                $assetService = app(\App\Modules\Bmn\Services\AssetService::class);

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
                                $wasTrashed = $existing->trashed();
                                $oldEmp = $existing->employee_id;
                                $oldKondisi = $existing->kondisi;
                                // Restore if soft-deleted, then update
                                if ($wasTrashed) {
                                    $existing->restore();
                                }
                                $existing->update($data);
                                $fresh = $existing->fresh();
                                $assetService->notifyOwnershipChange($fresh, $oldEmp, $fresh->employee_id, $wasTrashed);
                                $assetService->notifyConditionCritical($fresh, $oldKondisi, $fresh->kondisi);
                                $updated++;
                            } else {
                                $data['id'] = (string) Str::uuid();
                                $created = Asset::create($data);
                                if ($created->employee_id) {
                                    $bulkAssigned[(int) $created->employee_id][] = $created;
                                }
                                $assetService->notifyConditionCritical($created, null, $created->kondisi);
                                $inserted++;
                            }
                        } else {
                            $data['id'] = (string) Str::uuid();
                            $created = Asset::create($data);
                            if ($created->employee_id) {
                                $bulkAssigned[(int) $created->employee_id][] = $created;
                            }
                            $assetService->notifyConditionCritical($created, null, $created->kondisi);
                            $inserted++;
                        }
                    } elseif ($row->diff_status === 'updated' && $row->existing_asset_id) {
                        // Update existing asset (only changed fields)
                        $asset = Asset::withTrashed()->find($row->existing_asset_id);
                        if ($asset) {
                            $wasTrashed = $asset->trashed();
                            $oldEmp = $asset->employee_id;
                            $oldKondisi = $asset->kondisi;
                            if ($wasTrashed) {
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
                                foreach ($updateData as $field => $newValue) {
                                    AssetUpdate::create([
                                        'asset_id' => $asset->id,
                                        'user_id' => $request->user()->id,
                                        'field_changed' => $field,
                                        'old_value' => $this->historyValue($changedFields[$field]['old'] ?? $asset->{$field}),
                                        'new_value' => $this->historyValue($newValue),
                                        'alasan_perubahan' => "Import review: {$batch->filename}",
                                    ]);
                                }

                                $asset->update($updateData);
                                $updated++;
                            }
                            if ($wasTrashed || !empty($updateData)) {
                                $fresh = $asset->fresh();
                                $assetService->notifyOwnershipChange($fresh, $oldEmp, $fresh->employee_id, $wasTrashed);
                                $assetService->notifyConditionCritical($fresh, $oldKondisi, $fresh->kondisi);
                            }
                        }
                    }
                }

                $assetService->notifyBulkAssigned($bulkAssigned);

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
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            throw $e;
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

    private function historyValue($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        return (string) $value;
    }

    private function computeSelectionSummary(ImportBatch $batch, Request $request): array
    {
        $row = $this->applyIdentityFilters($batch->stagingRows(), $request)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN selected AND diff_status IN ('new', 'updated') THEN 1 ELSE 0 END), 0) AS selected_total,
                COALESCE(SUM(CASE WHEN selected AND diff_status = 'new' THEN 1 ELSE 0 END), 0) AS selected_new,
                COALESCE(SUM(CASE WHEN selected AND diff_status = 'updated' THEN 1 ELSE 0 END), 0) AS selected_updated,
                COALESCE(SUM(CASE WHEN diff_status = 'new' THEN 1 ELSE 0 END), 0) AS filtered_new,
                COALESCE(SUM(CASE WHEN diff_status = 'updated' THEN 1 ELSE 0 END), 0) AS filtered_updated
            ")
            ->first();

        return [
            'selected_total' => (int) ($row?->selected_total ?? 0),
            'selected_new' => (int) ($row?->selected_new ?? 0),
            'selected_updated' => (int) ($row?->selected_updated ?? 0),
            'filtered_new' => (int) ($row?->filtered_new ?? 0),
            'filtered_updated' => (int) ($row?->filtered_updated ?? 0),
        ];
    }

    /**
     * Aggregate changed column counts across all matching updated rows for bulk column selection.
     */
    private function computeFieldSummary(ImportBatch $batch, Request $request): array
    {
        $filteredUpdatedQuery = (clone $this->applyIdentityFilters($batch->stagingRows(), $request))
            ->where('diff_status', 'updated')
            ->whereNotNull('changed_fields');

        if (DB::connection()->getDriverName() === 'pgsql') {
            $idsQuery = (clone $filteredUpdatedQuery)->select('id');
            $rows = DB::select(
                "
                SELECT kv.key AS field,
                       COUNT(*)::int AS total,
                       SUM(CASE WHEN COALESCE((kv.value->>'selected')::boolean, true) THEN 1 ELSE 0 END)::int AS selected
                FROM bmn_import_staging,
                     LATERAL jsonb_each(changed_fields::jsonb) AS kv(key, value)
                WHERE id IN ({$idsQuery->toSql()})
                GROUP BY kv.key
                ORDER BY total DESC, kv.key ASC
                ",
                $idsQuery->getBindings()
            );

            return array_map(fn ($r) => [
                'field' => (string) $r->field,
                'total' => (int) $r->total,
                'selected' => (int) $r->selected,
            ], $rows);
        }

        $counts = [];
        foreach ($filteredUpdatedQuery->get(['changed_fields']) as $row) {
            foreach ($row->changed_fields ?? [] as $field => $meta) {
                $counts[$field] ??= ['field' => (string) $field, 'total' => 0, 'selected' => 0];
                $counts[$field]['total']++;
                if (($meta['selected'] ?? true) !== false) {
                    $counts[$field]['selected']++;
                }
            }
        }

        usort($counts, fn ($a, $b) => $b['total'] <=> $a['total'] ?: strcmp($a['field'], $b['field']));

        return array_values($counts);
    }

    private function buildFilteredRowsQuery(ImportBatch $batch, Request $request)
    {
        $query = $this->applyIdentityFilters($batch->stagingRows(), $request);

        if ($request->filled('status')) {
            $query->where('diff_status', $request->status);
        }

        $changedField = trim((string) $request->input('changed_field', ''));
        if ($changedField === '__selected__') {
            $query->whereIn('diff_status', ['new', 'updated'])->where('selected', true);
        } elseif ($changedField !== '' && preg_match('/^[A-Za-z0-9_]+$/', $changedField)) {
            $query->where('diff_status', 'updated')->whereNotNull('changed_fields');
            if (DB::connection()->getDriverName() === 'pgsql') {
                $query->whereRaw('jsonb_exists(changed_fields::jsonb, ?)', [$changedField]);
            } else {
                $query->whereRaw('json_extract(changed_fields, ?) IS NOT NULL', ['$.' . $changedField]);
            }
        }

        return $query;
    }

    private function applyIdentityFilters($query, Request $request)
    {
        $isPgSql = DB::connection()->getDriverName() === 'pgsql';
        $escapeLike = static fn (string $raw): string => addcslashes(trim($raw), '\\%_');

        foreach (['kode_barang', 'nup'] as $field) {
            $value = $escapeLike((string) $request->input($field, ''));
            if ($value !== '') {
                $query->whereRaw($this->jsonLikeSql($field, $isPgSql), ["%{$value}%"]);
            }
        }

        $namaOrMerk = $escapeLike((string) $request->input('nama_barang', ''));
        if ($namaOrMerk !== '') {
            $pattern = "%{$namaOrMerk}%";
            $query->where(function ($nested) use ($pattern, $isPgSql) {
                foreach (['nama_barang', 'merk', 'tipe', 'merk_tipe', 'nama'] as $col) {
                    $nested->orWhereRaw($this->jsonLikeSql($col, $isPgSql), [$pattern]);
                }
            });
        }

        return $query;
    }

    private function jsonLikeSql(string $column, bool $isPgSql): string
    {
        return $isPgSql
            ? "COALESCE(imported_data->>'{$column}', '') ILIKE ?"
            : "LOWER(COALESCE(json_extract(imported_data, '$.{$column}'), '')) LIKE LOWER(?)";
    }
}
