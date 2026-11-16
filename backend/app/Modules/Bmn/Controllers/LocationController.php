<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Modules\Bmn\Models\Location;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\DriveAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class LocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Location::with([
            'parent:id,name,unit_kerja,location_type,drive_unit_id,code',
            'driveUnit:id,slug,name',
        ])->withCount([
            'assets',
            'children',
            'employees as active_employees_count' => fn ($q) => $q->where('is_active', true),
        ]);

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }
        if ($request->filled('location_type')) {
            $query->where('location_type', (string) $request->input('location_type'));
        }
        if ($request->filled('parent_id')) {
            $query->where('parent_id', (string) $request->input('parent_id'));
        }

        $locations = $query
            ->orderByRaw("CASE location_type WHEN 'balai' THEN 0 WHEN 'seksi' THEN 1 WHEN 'room' THEN 2 WHEN 'resor' THEN 3 ELSE 4 END")
            ->orderBy('unit_kerja', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'data' => $locations,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureCanManageLocations($request);

        $validated = $request->validate([
            'parent_id' => ['nullable', 'uuid', Rule::exists('bmn_locations', 'id')],
            'location_type' => ['nullable', 'string', Rule::in([
                Location::TYPE_BALAI,
                Location::TYPE_SEKSI,
                Location::TYPE_ROOM,
                Location::TYPE_RESOR,
            ])],
            'unit_kerja' => ['nullable', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255', Rule::unique('bmn_locations', 'name')],
            'code' => ['nullable', 'string', 'max:64', Rule::unique('bmn_locations', 'code')],
            'description' => ['nullable', 'string', 'max:500'],
            'is_restricted' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'name.required' => 'Nama lokasi/ruangan wajib diisi.',
            'name.unique' => 'Lokasi atau ruangan dengan nama ini sudah ada.',
        ]);

        $parent = ! empty($validated['parent_id'])
            ? Location::findOrFail($validated['parent_id'])
            : null;

        $locationType = $validated['location_type'] ?? null;
        if (! $locationType) {
            $locationType = str_starts_with(strtolower(trim($validated['name'])), 'resor ')
                ? Location::TYPE_RESOR
                : Location::TYPE_ROOM;
        }

        if (in_array($locationType, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true)) {
            $user = $request->user();
            if ($user && $user->role !== 'super_admin') {
                return response()->json([
                    'message' => 'Hanya Super Admin yang diizinkan menambahkan unit kerja baru.',
                ], 403);
            }
        }

        if ($parent) {
            if ($locationType === Location::TYPE_RESOR && $parent->location_type !== Location::TYPE_SEKSI) {
                return response()->json([
                    'message' => 'Resor wajib berada di bawah induk Seksi Wilayah (SKW).',
                ], 422);
            }
            if ($locationType === Location::TYPE_ROOM && ! in_array($parent->location_type, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true)) {
                return response()->json([
                    'message' => 'Ruangan wajib berada di bawah induk Balai atau Seksi Wilayah.',
                ], 422);
            }
            $unitKerja = $parent->effectiveUnitKerja();
        } else {
            $unitKerja = $locationType === Location::TYPE_SEKSI
                ? trim((string) $validated['name'])
                : trim((string) ($validated['unit_kerja'] ?? $validated['name']));
            if ($unitKerja === '') {
                return response()->json(['message' => 'Unit kerja wajib dipilih/diisi.'], 422);
            }
            if (in_array($locationType, [Location::TYPE_ROOM, Location::TYPE_RESOR], true)) {
                $autoParent = Location::resolveForPlacement(null, $unitKerja);
                if ($autoParent && in_array($autoParent->location_type, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true)) {
                    $parent = $autoParent;
                    $unitKerja = $parent->effectiveUnitKerja();
                }
            }
        }

        $this->ensureUnitKerjaAllowed($request, $unitKerja);

        $location = DB::transaction(function () use ($request, $validated, $parent, $locationType, $unitKerja) {
            $code = isset($validated['code']) && trim((string) $validated['code']) !== ''
                ? trim((string) $validated['code'])
                : null;

            if (! $code) {
                $prefix = match ($locationType) {
                    Location::TYPE_RESOR => 'resor_',
                    Location::TYPE_ROOM => 'room_',
                    default => '',
                };
                $sep = in_array($locationType, [Location::TYPE_SEKSI, Location::TYPE_BALAI], true) ? '-' : '_';
                $base = $prefix . Str::slug($validated['name'], $sep);
                $candidate = Str::limit($base, 64, '');
                $suffix = 1;
                while (Location::where('code', $candidate)->exists()) {
                    $candidate = Str::limit($base, 58, '') . $sep . $suffix++;
                }
                $code = $candidate;
            }

            $driveUnitId = $parent?->drive_unit_id;
            if (in_array($locationType, [Location::TYPE_SEKSI, Location::TYPE_BALAI], true)) {
                $slugBase = $locationType === Location::TYPE_BALAI ? 'balai-samarinda' : Str::slug($code);
                $driveUnit = DriveUnit::where('slug', $slugBase)->first();
                if (! $driveUnit) {
                    $uniqueSlug = $slugBase;
                    $i = 1;
                    while (DriveUnit::where('slug', $uniqueSlug)->exists()) {
                        $uniqueSlug = $slugBase . '-' . $i++;
                    }
                    $driveUnit = DriveUnit::create([
                        'name' => $validated['name'],
                        'slug' => $uniqueSlug,
                        'description' => $validated['description'] ?? "Workspace {$validated['name']}",
                    ]);
                }
                $driveUnitId = $driveUnit->id;
            }

            $loc = Location::create([
                'parent_id' => $parent?->id,
                'location_type' => $locationType,
                'unit_kerja' => $unitKerja,
                'drive_unit_id' => $driveUnitId,
                'name' => $validated['name'],
                'code' => $code,
                'description' => $validated['description'] ?? null,
                'is_restricted' => array_key_exists('is_restricted', $validated)
                    ? (bool) $validated['is_restricted']
                    : ($locationType === Location::TYPE_RESOR),
                'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : true,
            ]);

            if (in_array($locationType, [Location::TYPE_SEKSI, Location::TYPE_BALAI], true) && $driveUnitId) {
                $ownerId = $request->user()?->id ?: Location::resolveSystemOwnerId();
                if ($ownerId) {
                    DriveFolder::firstOrCreate([
                        'unit_id' => $driveUnitId,
                        'parent_id' => null,
                        'name' => 'Berkas Umum & Koordinasi ' . $loc->name,
                    ], [
                        'location_id' => $loc->id,
                        'user_id' => $ownerId,
                        'is_restricted' => false,
                        'folder_scope' => 'general',
                        'color' => '#64748B',
                    ]);
                }
            } else {
                $loc->syncDriveFolder($request->user()?->id);
            }

            return $loc;
        });

        $location->load(['parent:id,name,unit_kerja,location_type,drive_unit_id,code', 'driveUnit:id,slug,name'])
            ->loadCount(['assets', 'children', 'employees as active_employees_count' => fn ($q) => $q->where('is_active', true)]);

        return response()->json([
            'message' => "Lokasi '{$location->name}' berhasil ditambahkan.",
            'data' => $location,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $this->ensureCanManageLocations($request);
        $location = Location::findOrFail($id);

        $validated = $request->validate([
            'parent_id' => ['nullable', 'uuid', Rule::exists('bmn_locations', 'id')],
            'location_type' => ['sometimes', 'required', 'string', Rule::in([
                Location::TYPE_BALAI,
                Location::TYPE_SEKSI,
                Location::TYPE_ROOM,
                Location::TYPE_RESOR,
            ])],
            'unit_kerja' => ['sometimes', 'required', 'string', 'max:255'],
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('bmn_locations', 'name')->ignore($location->id)],
            'code' => ['nullable', 'string', 'max:64', Rule::unique('bmn_locations', 'code')->ignore($location->id)],
            'description' => ['nullable', 'string', 'max:500'],
            'is_restricted' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ], [
            'unit_kerja.required' => 'Unit kerja wajib dipilih/diisi.',
            'name.required' => 'Nama lokasi/ruangan wajib diisi.',
            'name.unique' => 'Lokasi atau ruangan dengan nama ini sudah ada.',
        ]);

        $newType = $validated['location_type'] ?? $location->location_type;
        $newParentId = array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $location->parent_id;
        $newName = $validated['name'] ?? $location->name;

        if ($newParentId && $newParentId === $location->id) {
            return response()->json(['message' => 'Lokasi tidak dapat menjadi induk dirinya sendiri.'], 422);
        }

        $parent = $newParentId ? Location::findOrFail($newParentId) : null;
        if ($parent) {
            if ($parent->parent_id === $location->id) {
                return response()->json(['message' => 'Tidak dapat memindahkan lokasi ke bawah turunannya sendiri.'], 422);
            }
            if ($newType === Location::TYPE_RESOR && $parent->location_type !== Location::TYPE_SEKSI) {
                return response()->json(['message' => 'Resor wajib berada di bawah induk Seksi Wilayah (SKW).'], 422);
            }
            if ($newType === Location::TYPE_ROOM && ! in_array($parent->location_type, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true)) {
                return response()->json(['message' => 'Ruangan wajib berada di bawah induk Balai atau Seksi Wilayah.'], 422);
            }
        }

        $newUnitKerja = $parent
            ? $parent->effectiveUnitKerja()
            : ($validated['unit_kerja'] ?? $location->unit_kerja);

        $this->ensureUnitKerjaAllowed($request, $location->unit_kerja);
        $this->ensureUnitKerjaAllowed($request, $newUnitKerja);

        DB::transaction(function () use ($request, $location, $validated, $parent, $newType, $newName, $newUnitKerja) {
            $oldName = $location->name;
            $oldDriveUnitId = $location->effectiveDriveUnitId();

            $payload = [
                'parent_id' => $parent?->id,
                'location_type' => $newType,
                'unit_kerja' => $newUnitKerja,
                'name' => $newName,
                'description' => array_key_exists('description', $validated) ? $validated['description'] : $location->description,
                'is_restricted' => array_key_exists('is_restricted', $validated) ? (bool) $validated['is_restricted'] : $location->is_restricted,
                'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $location->is_active,
            ];
            if (array_key_exists('code', $validated) && $validated['code'] !== null) {
                $payload['code'] = $validated['code'];
            }
            if ($parent) {
                $payload['drive_unit_id'] = $parent->drive_unit_id;
            }

            $location->update($payload);
            $location->refresh();

            // Jaga konsistensi BMN Asset lokasi_ruang
            if ($oldName !== $location->name) {
                $location->assets()->where('lokasi_ruang', $oldName)->update(['lokasi_ruang' => $location->name]);
            }

            if (in_array($location->location_type, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true)) {
                if ($location->driveUnit) {
                    $location->driveUnit->update(['name' => $location->name]);
                }
                $location->children()->update([
                    'unit_kerja' => $location->effectiveUnitKerja(),
                    'drive_unit_id' => $location->drive_unit_id,
                ]);
                $affectedLocIds = array_merge([$location->id], $location->children()->pluck('id')->all());
                Employee::whereIn('location_id', $affectedLocIds)->update([
                    'satuan_kerja' => $location->effectiveUnitKerja(),
                ]);
            } else {
                $location->syncDriveFolder($request->user()?->id);
                $newDriveUnitId = $location->effectiveDriveUnitId();

                $employees = Employee::where('location_id', $location->id)->get();
                foreach ($employees as $emp) {
                    $emp->update([
                        'satuan_kerja' => $location->effectiveUnitKerja(),
                        'resor' => $location->derivedResorCode(),
                    ]);
                    if ($oldDriveUnitId !== $newDriveUnitId && method_exists(DriveAccess::class, 'syncEmployeePlacement')) {
                        DriveAccess::syncEmployeePlacement($emp, ['drive_unit_id' => $oldDriveUnitId]);
                    }
                }
            }
        });

        $location->load(['parent:id,name,unit_kerja,location_type,drive_unit_id,code', 'driveUnit:id,slug,name'])
            ->loadCount(['assets', 'children', 'employees as active_employees_count' => fn ($q) => $q->where('is_active', true)]);

        return response()->json([
            'message' => "Lokasi '{$location->name}' berhasil diperbarui.",
            'data' => $location,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $request = request();
        $this->ensureCanManageLocations($request);

        $location = Location::withCount([
            'assets',
            'children',
            'employees as active_employees_count' => fn ($q) => $q->where('is_active', true),
        ])->findOrFail($id);

        $this->ensureUnitKerjaAllowed($request, $location->unit_kerja);

        if ($location->children_count > 0) {
            return response()->json([
                'message' => "Lokasi '{$location->name}' tidak dapat dihapus karena masih memiliki {$location->children_count} sub-unit/ruangan/resor.",
            ], 422);
        }

        if ($location->assets_count > 0) {
            return response()->json([
                'message' => "Lokasi '{$location->name}' tidak dapat dihapus karena masih digunakan oleh {$location->assets_count} aset BMN. Silakan pindahkan lokasi aset terkait terlebih dahulu.",
            ], 422);
        }

        if ($location->active_employees_count > 0) {
            return response()->json([
                'message' => "Lokasi '{$location->name}' tidak dapat dihapus karena masih ditempati oleh {$location->active_employees_count} pegawai aktif.",
            ], 422);
        }

        $folderIds = DriveFolder::withTrashed()->where('location_id', $location->id)->pluck('id')->all();
        if (! empty($folderIds)) {
            $descIds = DriveFolder::collectDescendantIds($folderIds, withTrashed: true);
            $allFolderIds = array_unique(array_merge($folderIds, $descIds));
            if (DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->exists()) {
                return response()->json([
                    'message' => "Lokasi '{$location->name}' tidak dapat dihapus karena folder terkait di BKSDA Drive masih memiliki file arsip.",
                ], 422);
            }
        }

        if (in_array($location->location_type, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true) && $location->drive_unit_id) {
            if (DriveFile::withTrashed()->where('unit_id', $location->drive_unit_id)->exists()) {
                return response()->json([
                    'message' => "Lokasi '{$location->name}' tidak dapat dihapus karena Drive Unit terkait masih memiliki file arsip.",
                ], 422);
            }
        }

        DB::transaction(function () use ($location, $folderIds) {
            Employee::where('location_id', $location->id)->update(['location_id' => null]);

            if (! empty($folderIds)) {
                $descIds = DriveFolder::collectDescendantIds($folderIds, withTrashed: true);
                $allIds = array_unique(array_merge($folderIds, $descIds));
                DriveShare::whereIn('folder_id', $allIds)->delete();
                DriveFolder::withTrashed()->whereIn('id', $allIds)->forceDelete();
            }

            $driveUnitId = $location->drive_unit_id;
            $isParentUnit = in_array($location->location_type, [Location::TYPE_BALAI, Location::TYPE_SEKSI], true);
            $location->delete();

            if ($isParentUnit && $driveUnitId && ! DriveFolder::withTrashed()->where('unit_id', $driveUnitId)->exists()) {
                DriveUnit::where('id', $driveUnitId)->delete();
            }
        });

        return response()->json([
            'message' => "Lokasi '{$location->name}' berhasil dihapus.",
        ]);
    }

    private function ensureCanManageLocations(Request $request): void
    {
        $user = $request->user();
        if (! $user) {
            abort(403, 'Unauthorized.');
        }

        if ($user->role === 'super_admin'
            || $user->hasPermission('bmn.asset.update')) {
            return;
        }

        abort(403, 'Anda tidak memiliki hak untuk mengelola Master Lokasi.');
    }

    private function ensureUnitKerjaAllowed(Request $request, string $unitKerja): void
    {
        $user = $request->user();
        if ($user && $user->role !== 'super_admin') {
            $standardUnits = [
                'Kantor Balai KSDA Kalimantan Timur',
                'Seksi KSDA Wilayah I (Berau)',
                'Seksi KSDA Wilayah II (Tenggarong)',
                'Seksi KSDA Wilayah III (Balikpapan)',
            ];
            $existingUnits = Location::distinct()->pluck('unit_kerja')->toArray();
            $allowedUnits = array_unique(array_merge($standardUnits, $existingUnits));

            if (!in_array($unitKerja, $allowedUnits, true)) {
                abort(response()->json([
                    'message' => 'Hanya Super Admin yang diizinkan menambahkan unit kerja baru. Silakan pilih unit kerja yang sudah ada.',
                ], 403));
            }
        }
    }
}
