<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\HandoverAgreement;
use App\Modules\Bmn\Models\UsageAgreement;
use App\Modules\Bmn\Resources\HandoverAgreementResource;
use App\Modules\Bmn\Resources\UsageAgreementResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DocumentHistoryController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'type' => ['nullable', Rule::in(['all', 'usage_agreement', 'handover_agreement'])],
            'employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'search' => ['nullable', 'string', 'max:120'],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);

        $type = $validated['type'] ?? 'all';
        $perPage = (int) ($validated['per_page'] ?? 10);
        $employeeId = $validated['employee_id'] ?? null;
        $search = trim((string) ($validated['search'] ?? ''));

        $queries = [];

        if ($type === 'all' || $type === 'usage_agreement') {
            $queries[] = $this->usageHistoryQuery($employeeId, $search);
        }

        if ($type === 'all' || $type === 'handover_agreement') {
            $queries[] = $this->handoverHistoryQuery($employeeId, $search);
        }

        $combined = array_shift($queries);
        foreach ($queries as $query) {
            $combined->unionAll($query);
        }

        $paginator = DB::query()
            ->fromSub($combined, 'document_histories')
            ->orderByDesc('document_date')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $rows = collect($paginator->items());
        $usageIds = $rows->where('document_type', 'usage_agreement')->pluck('id')->all();
        $handoverIds = $rows->where('document_type', 'handover_agreement')->pluck('id')->all();

        $usageModels = UsageAgreement::with(['employee', 'generator'])
            ->whereIn('id', $usageIds)
            ->get()
            ->keyBy('id');

        $handoverModels = HandoverAgreement::with(['firstPartyEmployee', 'secondPartyEmployee', 'generator'])
            ->whereIn('id', $handoverIds)
            ->get()
            ->keyBy('id');

        $data = $rows->map(function ($row) use ($request, $usageModels, $handoverModels) {
            if ($row->document_type === 'usage_agreement') {
                $payload = (new UsageAgreementResource($usageModels[$row->id]))->resolve($request);
                $payload['document_type'] = 'usage_agreement';

                return $payload;
            }

            return (new HandoverAgreementResource($handoverModels[$row->id]))->resolve($request);
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    private function usageHistoryQuery(?int $employeeId, string $search)
    {
        $query = UsageAgreement::query()
            ->select([
                'id',
                'document_date',
                'created_at',
                DB::raw("'usage_agreement' as document_type"),
            ]);

        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }

        if ($search !== '') {
            $needle = '%' . $search . '%';
            $query->where(function ($q) use ($needle) {
                $q->where('number', 'ilike', $needle)
                    ->orWhereRaw('first_party_snapshot::text ilike ?', [$needle])
                    ->orWhereRaw('second_party_snapshot::text ilike ?', [$needle])
                    ->orWhereRaw('assets_snapshot::text ilike ?', [$needle])
                    ->orWhereHas('employee', function ($employeeQuery) use ($needle) {
                        $employeeQuery->where('nama_lengkap', 'ilike', $needle)
                            ->orWhere('nip', 'ilike', $needle);
                    })
                    ->orWhereHas('generator', fn ($generatorQuery) => $generatorQuery->where('name', 'ilike', $needle));
            });
        }

        return $query;
    }

    private function handoverHistoryQuery(?int $employeeId, string $search)
    {
        $query = HandoverAgreement::query()
            ->select([
                'id',
                'document_date',
                'created_at',
                DB::raw("'handover_agreement' as document_type"),
            ]);

        if ($employeeId) {
            $query->where(function ($q) use ($employeeId) {
                $q->where('first_party_employee_id', $employeeId)
                    ->orWhere('second_party_employee_id', $employeeId);
            });
        }

        if ($search !== '') {
            $needle = '%' . $search . '%';
            $query->where(function ($q) use ($needle) {
                $q->where('number', 'ilike', $needle)
                    ->orWhere('title', 'ilike', $needle)
                    ->orWhere('variant', 'ilike', $needle)
                    ->orWhereRaw('first_party_snapshot::text ilike ?', [$needle])
                    ->orWhereRaw('second_party_snapshot::text ilike ?', [$needle])
                    ->orWhereRaw('items_snapshot::text ilike ?', [$needle])
                    ->orWhereHas('generator', fn ($generatorQuery) => $generatorQuery->where('name', 'ilike', $needle));
            });
        }

        return $query;
    }
}
