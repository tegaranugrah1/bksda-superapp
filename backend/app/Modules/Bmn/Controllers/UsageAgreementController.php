<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\UsageAgreement;
use App\Modules\Bmn\Resources\UsageAgreementResource;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UsageAgreementController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = UsageAgreement::with(['employee', 'generator'])
            ->latest('document_date')
            ->latest();

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        return UsageAgreementResource::collection($query->paginate($request->integer('per_page', 10)));
    }

    public function show(string $id): JsonResponse
    {
        $agreement = UsageAgreement::with(['employee', 'generator'])->findOrFail($id);

        return response()->json(['data' => new UsageAgreementResource($agreement)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:kpg_employees,id'],
            'number' => ['required', 'string', 'max:120'],
            'kap' => ['nullable', 'string', 'max:30'],
            'document_date' => ['required', 'date'],
            'first_party' => ['required', 'array'],
            'first_party.name' => ['required', 'string', 'max:255'],
            'first_party.nip' => ['nullable', 'string', 'max:60'],
            'first_party.rank' => ['nullable', 'string', 'max:120'],
            'first_party.position' => ['nullable', 'string', 'max:255'],
            'asset_ids' => ['nullable', 'array'],
            'asset_ids.*' => ['uuid', Rule::exists('bmn_assets', 'id')->whereNull('deleted_at')],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $employee = Employee::findOrFail($validated['employee_id']);
        $assets = $this->resolveEmployeeAssets($employee, $validated['asset_ids'] ?? null);

        if ($assets->isEmpty()) {
            return response()->json([
                'message' => 'Tidak ada aset BMN yang dapat dicatat untuk pegawai ini.',
            ], 422);
        }

        $agreement = UsageAgreement::create([
            'employee_id' => $employee->id,
            'generated_by' => $request->user()?->id,
            'number' => $validated['number'],
            'kap' => $validated['kap'] ?? 'KAP.03.02',
            'document_date' => $validated['document_date'],
            'first_party_snapshot' => [
                'name' => $validated['first_party']['name'],
                'nip' => $validated['first_party']['nip'] ?? null,
                'rank' => $validated['first_party']['rank'] ?? null,
                'position' => $validated['first_party']['position'] ?? null,
            ],
            'second_party_snapshot' => $this->employeeSnapshot($employee),
            'assets_snapshot' => $assets->map(fn (Asset $asset) => $this->assetSnapshot($asset))->values()->all(),
            'asset_ids' => $assets->pluck('id')->values()->all(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'BA Pemakaian BMN berhasil disimpan.',
            'data' => new UsageAgreementResource($agreement->load(['employee', 'generator'])),
        ], 201);
    }

    private function resolveEmployeeAssets(Employee $employee, ?array $assetIds)
    {
        $query = Asset::query()->with('penanggungJawab');
        $this->applyEmployeeAssetFilter($query, $employee);

        if ($assetIds !== null) {
            return $query->whereIn('id', $assetIds)->orderBy('nama_barang')->get();
        }

        return $query->orderBy('nama_barang')->get();
    }

    private function applyEmployeeAssetFilter($query, Employee $employee): void
    {
        $query->where(function ($q) use ($employee) {
            $q->where('employee_id', $employee->id);

            $fullName = trim((string) $employee->nama_lengkap);
            if ($fullName !== '') {
                $q->orWhere('pengguna', 'ilike', '%' . $fullName . '%')
                    ->orWhere('nama_pengguna', 'ilike', '%' . $fullName . '%');

                if (str_contains($fullName, ',')) {
                    $baseName = trim(explode(',', $fullName)[0]);
                    if (strlen($baseName) > 2) {
                        $q->orWhere('pengguna', 'ilike', '%' . $baseName . '%')
                            ->orWhere('nama_pengguna', 'ilike', '%' . $baseName . '%');
                    }
                }

                $words = preg_split('/\s+/', $fullName) ?: [];
                if (count($words) >= 2) {
                    $q->orWhere('pengguna', 'ilike', '%' . $words[0] . ' ' . $words[1] . '%');
                }
            }
        });
    }

    private function employeeSnapshot(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'name' => $employee->nama_lengkap,
            'nip' => $employee->nip,
            'rank' => $employee->pangkat_golongan,
            'position' => $employee->jabatan,
            'unit' => $employee->satuan_kerja,
        ];
    }

    private function assetSnapshot(Asset $asset): array
    {
        return [
            'id' => $asset->id,
            'nama_barang' => $asset->nama_barang,
            'kode_barang' => $asset->kode_barang,
            'nup' => $asset->nup,
            'merk_tipe' => $asset->merk_tipe ?: trim(implode(' ', array_filter([$asset->merk, $asset->tipe]))),
            'kondisi' => $asset->kondisi,
            'no_polisi' => $asset->no_polisi,
            'no_rangka' => $asset->no_rangka,
            'no_mesin' => $asset->no_mesin,
        ];
    }
}
