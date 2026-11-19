<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\PowerOfAttorney;
use App\Modules\Bmn\Resources\AssetResource;
use App\Modules\Bmn\Resources\PowerOfAttorneyResource;
use App\Modules\Bmn\Traits\ResolvesDocumentStatus;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PowerOfAttorneyController extends Controller
{
    use ResolvesDocumentStatus;
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

    public function ktp(string $id)
    {
        $agreement = PowerOfAttorney::findOrFail($id);
        if (! $agreement->ktp_path) {
            return response()->json(['message' => 'Lampiran KTP tidak ditemukan.'], 404);
        }

        $disk = null;
        if (\Illuminate\Support\Facades\Storage::disk('local')->exists($agreement->ktp_path)) {
            $disk = \Illuminate\Support\Facades\Storage::disk('local');
        } elseif (\Illuminate\Support\Facades\Storage::disk()->exists($agreement->ktp_path)) {
            $disk = \Illuminate\Support\Facades\Storage::disk();
        }

        if (! $disk) {
            return response()->json(['message' => 'Berkas KTP tidak ditemukan.'], 404);
        }

        $rawMime = $disk->mimeType($agreement->ktp_path) ?: 'image/jpeg';
        $mime = in_array($rawMime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)
            ? $rawMime
            : 'image/jpeg';

        return response($disk->get($agreement->ktp_path), 200)
            ->header('Content-Type', $mime)
            ->header('Cache-Control', 'private, no-store, max-age=0')
            ->header('X-Content-Type-Options', 'nosniff')
            ->header('Referrer-Policy', 'no-referrer');
    }

    public function destroy(string $id): JsonResponse
    {
        $agreement = PowerOfAttorney::findOrFail($id);
        $ktpPath = $agreement->ktp_path;
        $agreement->delete();

        $this->deleteKtpIfUnused($ktpPath);

        return response()->json([
            'message' => 'Riwayat Surat Kuasa Kendaraan berhasil dihapus.',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:kpg_employees,id'],
            'number' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'published'])],
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

        $ktpPath = $this->resolveKtpPath($request, $employee, null);

        $status = $this->determineStatus($validated['number'] ?? null, $validated['status'] ?? null);

        $agreement = PowerOfAttorney::create([
            'employee_id' => $employee->id,
            'generated_by' => $request->user()?->id,
            'number' => $validated['number'] ?? '-',
            'status' => $status,
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
            'assets_snapshot' => $this->buildAssetsSnapshot($assets, $request),
            'asset_ids' => $assets->pluck('id')->values()->all(),
            'notes' => $validated['notes'] ?? null,
            'ktp_path' => $ktpPath,
        ]);

        return response()->json([
            'message' => 'Surat Kuasa Kendaraan berhasil disimpan.',
            'data' => new PowerOfAttorneyResource($agreement->load(['employee', 'generator'])),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $agreement = PowerOfAttorney::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:kpg_employees,id'],
            'number' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', Rule::in(['draft', 'published'])],
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

        $oldKtpPath = $agreement->ktp_path;
        $ktpPath = $this->resolveKtpPath($request, $employee, $agreement);

        $status = $this->determineStatus($validated['number'] ?? null, $validated['status'] ?? null);

        $agreement->update([
            'employee_id' => $employee->id,
            'number' => $validated['number'] ?? $agreement->number,
            'status' => $status,
            'kap' => $validated['kap'] ?? $agreement->kap,
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
            'assets_snapshot' => $this->buildAssetsSnapshot($assets, $request),
            'asset_ids' => $assets->pluck('id')->values()->all(),
            'notes' => $validated['notes'] ?? null,
            'ktp_path' => $ktpPath,
        ]);

        if ($oldKtpPath && $oldKtpPath !== $ktpPath) {
            $this->deleteKtpIfUnused($oldKtpPath);
        }

        return response()->json([
            'message' => 'Surat Kuasa Kendaraan berhasil diperbarui.',
            'data' => new PowerOfAttorneyResource($agreement->fresh(['employee', 'generator'])),
        ]);
    }

    private function resolveKtpPath(Request $request, Employee $employee, ?PowerOfAttorney $existing): ?string
    {
        if ($request->hasFile('ktp_image')) {
            $file = $request->file('ktp_image');
            $ext = $file->extension() ?: 'jpg';
            $filename = 'KTP-' . \Illuminate\Support\Str::uuid() . '.' . $ext;

            return \Illuminate\Support\Facades\Storage::disk('local')->putFileAs('bmn/power-of-attorneys/ktp', $file, $filename);
        }

        if ($request->filled('existing_ktp_path')) {
            $candidatePath = (string) $request->input('existing_ktp_path');
            if (str_starts_with($candidatePath, 'bmn/power-of-attorneys/ktp/') && ! str_contains($candidatePath, '..')) {
                $isOwned = ($existing && $existing->ktp_path === $candidatePath)
                    || PowerOfAttorney::where('employee_id', $employee->id)->where('ktp_path', $candidatePath)->exists();
                if ($isOwned) {
                    return $candidatePath;
                }
            }
        }

        return $existing?->ktp_path;
    }

    private function deleteKtpIfUnused(?string $ktpPath): void
    {
        if (! $ktpPath || PowerOfAttorney::where('ktp_path', $ktpPath)->exists()) {
            return;
        }

        foreach (['local', config('filesystems.default')] as $diskName) {
            if ($diskName && \Illuminate\Support\Facades\Storage::disk($diskName)->exists($ktpPath)) {
                \Illuminate\Support\Facades\Storage::disk($diskName)->delete($ktpPath);
            }
        }
    }

    private function buildAssetsSnapshot($assets, Request $request): array
    {
        return collect(AssetResource::collection($assets)->resolve($request))->map(fn ($asset) => [
            'id' => $asset['id'],
            'nama_barang' => $asset['nama_barang'],
            'kode_barang' => $asset['kode_barang'],
            'nup' => $asset['nup'],
            'merk_tipe' => $asset['merk_tipe'] ?: trim(implode(' ', array_filter([$asset['merk'], $asset['tipe']]))),
            'no_polisi' => $asset['no_polisi'],
            'no_rangka' => $asset['no_rangka'],
            'no_mesin' => $asset['no_mesin'],
            'stnk_document' => AssetResource::stripQueryTokens($asset['stnk_document'] ?? null),
        ])->values()->all();
    }
}
