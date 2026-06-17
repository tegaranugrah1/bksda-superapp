<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\HandoverAgreement;
use App\Modules\Bmn\Resources\HandoverAgreementResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HandoverAgreementController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'variant' => ['nullable', Rule::in(['general_goods', 'vehicle'])],
            'employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = HandoverAgreement::with(['firstPartyEmployee', 'secondPartyEmployee', 'generator'])
            ->latest('document_date')
            ->latest();

        if ($request->filled('variant')) {
            $query->where('variant', $request->query('variant'));
        }

        if ($request->filled('employee_id')) {
            $employeeId = $request->integer('employee_id');
            $query->where(function ($q) use ($employeeId) {
                $q->where('first_party_employee_id', $employeeId)
                    ->orWhere('second_party_employee_id', $employeeId);
            });
        }

        return HandoverAgreementResource::collection($query->paginate($request->integer('per_page', 10)));
    }

    public function show(string $id): JsonResponse
    {
        $agreement = HandoverAgreement::with(['firstPartyEmployee', 'secondPartyEmployee', 'generator'])->findOrFail($id);

        return response()->json(['data' => new HandoverAgreementResource($agreement)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'variant' => ['required', Rule::in(['general_goods', 'vehicle'])],
            'title' => ['required', 'string', 'max:180'],
            'number' => ['required', 'string', 'max:120'],
            'kap' => ['nullable', 'string', 'max:30'],
            'document_date' => ['required', 'date'],
            'first_party_employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'second_party_employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'first_party' => ['required', 'array'],
            'first_party.name' => ['required', 'string', 'max:255'],
            'first_party.nip' => ['nullable', 'string', 'max:60'],
            'first_party.rank' => ['nullable', 'string', 'max:120'],
            'first_party.position' => ['nullable', 'string', 'max:255'],
            'first_party.address' => ['nullable', 'string', 'max:255'],
            'second_party' => ['required', 'array'],
            'second_party.name' => ['required', 'string', 'max:255'],
            'second_party.nip' => ['nullable', 'string', 'max:60'],
            'second_party.rank' => ['nullable', 'string', 'max:120'],
            'second_party.position' => ['nullable', 'string', 'max:255'],
            'second_party.address' => ['nullable', 'string', 'max:255'],
            'witness' => ['nullable', 'array'],
            'witness.name' => ['nullable', 'string', 'max:255'],
            'witness.nip' => ['nullable', 'string', 'max:60'],
            'witness.position' => ['nullable', 'string', 'max:255'],
            'witness.label' => ['nullable', 'string', 'max:160'],
            'items' => ['required_if:variant,general_goods', 'array'],
            'items.*.name' => ['required_if:variant,general_goods', 'string', 'max:255'],
            'items.*.quantity' => ['required_if:variant,general_goods', 'integer', 'min:1', 'max:100000'],
            'items.*.nup' => ['nullable', 'string', 'max:80'],
            'asset_ids' => ['required_if:variant,vehicle', 'array'],
            'asset_ids.*' => ['uuid', Rule::exists('bmn_assets', 'id')->whereNull('deleted_at')],
            'metadata' => ['nullable', 'array'],
            'metadata.description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $variant = $validated['variant'];
        $items = $variant === 'vehicle'
            ? $this->vehicleItems($validated['asset_ids'] ?? [])
            : $this->generalItems($validated['items'] ?? []);

        if (empty($items)) {
            return response()->json(['message' => 'Minimal satu barang harus dicatat.'], 422);
        }

        $agreement = HandoverAgreement::create([
            'variant' => $variant,
            'first_party_employee_id' => $validated['first_party_employee_id'] ?? null,
            'second_party_employee_id' => $validated['second_party_employee_id'] ?? null,
            'generated_by' => $request->user()?->id,
            'title' => $validated['title'],
            'number' => $validated['number'],
            'kap' => $validated['kap'] ?? 'KAP.03.02',
            'document_date' => $validated['document_date'],
            'first_party_snapshot' => $this->partySnapshot($validated['first_party']),
            'second_party_snapshot' => $this->partySnapshot($validated['second_party']),
            'witness_snapshot' => $this->witnessSnapshot($validated['witness'] ?? null),
            'items_snapshot' => $items,
            'asset_ids' => $variant === 'vehicle' ? array_values($validated['asset_ids'] ?? []) : null,
            'metadata' => $validated['metadata'] ?? [],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'BA Serah Terima berhasil disimpan.',
            'data' => new HandoverAgreementResource($agreement->load(['firstPartyEmployee', 'secondPartyEmployee', 'generator'])),
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $agreement = HandoverAgreement::findOrFail($id);
        $agreement->delete();

        return response()->json([
            'message' => 'Riwayat BA Serah Terima berhasil dihapus.',
        ]);
    }

    private function partySnapshot(array $party): array
    {
        return [
            'name' => $party['name'],
            'nip' => $party['nip'] ?? null,
            'rank' => $party['rank'] ?? null,
            'position' => $party['position'] ?? null,
            'address' => $party['address'] ?? null,
        ];
    }

    private function witnessSnapshot(?array $witness): ?array
    {
        if (!$witness || empty($witness['name'])) {
            return null;
        }

        return [
            'name' => $witness['name'],
            'nip' => $witness['nip'] ?? null,
            'position' => $witness['position'] ?? null,
            'label' => $witness['label'] ?? 'Mengetahui,',
        ];
    }

    private function generalItems(array $items): array
    {
        return collect($items)
            ->filter(fn ($item) => trim((string) ($item['name'] ?? '')) !== '')
            ->map(fn ($item) => [
                'name' => trim((string) $item['name']),
                'quantity' => (int) ($item['quantity'] ?? 1),
                'nup' => $item['nup'] ?? null,
            ])
            ->values()
            ->all();
    }

    private function vehicleItems(array $assetIds): array
    {
        return Asset::query()
            ->whereIn('id', $assetIds)
            ->orderBy('nama_barang')
            ->get()
            ->map(fn (Asset $asset) => [
                'asset_id' => $asset->id,
                'vehicle_type' => $asset->nama_barang,
                'no_polisi' => $asset->no_polisi,
                'no_mesin' => $asset->no_mesin,
                'no_rangka' => $asset->no_rangka,
                'kode_barang' => $asset->kode_barang,
                'nup' => $asset->nup,
            ])
            ->values()
            ->all();
    }
}
