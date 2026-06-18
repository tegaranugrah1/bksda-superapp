<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\PowerOfAttorney;
use App\Modules\Bmn\Resources\PowerOfAttorneyResource;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PowerOfAttorneyController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'employee_id' => ['nullable', 'integer', 'exists:kpg_employees,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = PowerOfAttorney::with(['employee', 'generator'])
            ->latest('document_date')
            ->latest();

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        return PowerOfAttorneyResource::collection($query->paginate($request->integer('per_page', 10)));
    }

    public function show(string $id): JsonResponse
    {
        $agreement = PowerOfAttorney::with(['employee', 'generator'])->findOrFail($id);

        return response()->json(['data' => new PowerOfAttorneyResource($agreement)]);
    }

    public function destroy(string $id): JsonResponse
    {
        $agreement = PowerOfAttorney::findOrFail($id);
        
        // Skenario A: Delete the KTP file from RustFS on deletion
        if ($agreement->ktp_path && \Illuminate\Support\Facades\Storage::exists($agreement->ktp_path)) {
            \Illuminate\Support\Facades\Storage::delete($agreement->ktp_path);
        }

        $agreement->delete();

        return response()->json([
            'message' => 'Riwayat Surat Kuasa Kendaraan berhasil dihapus.',
        ]);
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
            'first_party.position' => ['nullable', 'string', 'max:255'],
            'first_party.address' => ['nullable', 'string', 'max:255'],
            'second_party' => ['required', 'array'],
            'second_party.name' => ['required', 'string', 'max:255'],
            'second_party.nip' => ['nullable', 'string', 'max:60'],
            'second_party.position' => ['nullable', 'string', 'max:255'],
            'second_party.address' => ['nullable', 'string', 'max:255'],
            'asset_ids' => ['required', 'array'],
            'asset_ids.*' => ['uuid', Rule::exists('bmn_assets', 'id')->whereNull('deleted_at')],
            'notes' => ['nullable', 'string', 'max:5000'],
            'ktp_image' => \App\Support\Security\UploadValidationRules::image(false, 10240),
            'existing_ktp_path' => ['nullable', 'string', 'max:255'],
        ]);

        $employee = Employee::findOrFail($validated['employee_id']);
        
        $assets = Asset::query()
            ->whereIn('id', $validated['asset_ids'])
            ->orderBy('nama_barang')
            ->get();

        if ($assets->isEmpty()) {
            return response()->json([
                'message' => 'Minimal satu kendaraan harus dipilih.',
            ], 422);
        }

        $ktpPath = null;
        if ($request->hasFile('ktp_image')) {
            $file = $request->file('ktp_image');
            $firstPartyName = $validated['first_party']['name'];
            $sanitizedName = \Illuminate\Support\Str::slug($firstPartyName, '_');
            $ext = $file->getClientOriginalExtension() ?: 'jpeg';
            $filename = 'KTP-' . strtoupper($sanitizedName) . '.' . $ext;

            $ktpPath = \Illuminate\Support\Facades\Storage::putFileAs('bmn/power-of-attorneys/ktp', $file, $filename);
        } elseif ($request->filled('existing_ktp_path')) {
            $ktpPath = $request->input('existing_ktp_path');
        }

        $agreement = PowerOfAttorney::create([
            'employee_id' => $employee->id,
            'generated_by' => $request->user()?->id,
            'number' => $validated['number'],
            'kap' => $validated['kap'] ?? 'KAP.03.02',
            'document_date' => $validated['document_date'],
            'first_party_snapshot' => [
                'name' => $validated['first_party']['name'],
                'nip' => $validated['first_party']['nip'] ?? null,
                'position' => $validated['first_party']['position'] ?? null,
                'address' => $validated['first_party']['address'] ?? null,
            ],
            'second_party_snapshot' => [
                'id' => $employee->id,
                'name' => $validated['second_party']['name'],
                'nip' => $validated['second_party']['nip'] ?? null,
                'position' => $validated['second_party']['position'] ?? null,
                'address' => $validated['second_party']['address'] ?? null,
            ],
            'assets_snapshot' => $assets->map(fn (Asset $asset) => [
                'id' => $asset->id,
                'nama_barang' => $asset->nama_barang,
                'kode_barang' => $asset->kode_barang,
                'nup' => $asset->nup,
                'merk_tipe' => $asset->merk_tipe ?: trim(implode(' ', array_filter([$asset->merk, $asset->tipe]))),
                'no_polisi' => $asset->no_polisi,
                'no_rangka' => $asset->no_rangka,
                'no_mesin' => $asset->no_mesin,
            ])->values()->all(),
            'asset_ids' => $assets->pluck('id')->values()->all(),
            'notes' => $validated['notes'] ?? null,
            'ktp_path' => $ktpPath,
        ]);

        return response()->json([
            'message' => 'Surat Kuasa Kendaraan berhasil disimpan.',
            'data' => new PowerOfAttorneyResource($agreement->load(['employee', 'generator'])),
        ], 201);
    }
}
