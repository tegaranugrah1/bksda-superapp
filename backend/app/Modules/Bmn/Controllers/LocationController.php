<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $locations = Location::withCount('assets')
            ->orderBy('unit_kerja', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'data' => $locations,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'unit_kerja' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255', Rule::unique('bmn_locations', 'name')],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'unit_kerja.required' => 'Unit kerja wajib dipilih/diisi.',
            'name.required' => 'Nama lokasi/ruangan wajib diisi.',
            'name.unique' => 'Lokasi atau ruangan dengan nama ini sudah ada.',
        ]);

        $location = Location::create($validated);
        $location->loadCount('assets');

        return response()->json([
            'message' => "Lokasi '{$location->name}' berhasil ditambahkan.",
            'data' => $location,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $location = Location::findOrFail($id);

        $validated = $request->validate([
            'unit_kerja' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255', Rule::unique('bmn_locations', 'name')->ignore($location->id)],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'unit_kerja.required' => 'Unit kerja wajib dipilih/diisi.',
            'name.required' => 'Nama lokasi/ruangan wajib diisi.',
            'name.unique' => 'Lokasi atau ruangan dengan nama ini sudah ada.',
        ]);

        $oldName = $location->name;
        $location->update($validated);

        // If name changed, update assets having the old name to the new name so data stays consistent
        if ($oldName !== $validated['name']) {
            $location->assets()->where('lokasi_ruang', $oldName)->update(['lokasi_ruang' => $validated['name']]);
        }

        $location->loadCount('assets');

        return response()->json([
            'message' => "Lokasi '{$location->name}' berhasil diperbarui.",
            'data' => $location,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $location = Location::withCount('assets')->findOrFail($id);

        if ($location->assets_count > 0) {
            return response()->json([
                'message' => "Lokasi '{$location->name}' tidak dapat dihapus karena masih digunakan oleh {$location->assets_count} aset BMN. Silakan pindahkan lokasi aset terkait terlebih dahulu.",
            ], 422);
        }

        $location->delete();

        return response()->json([
            'message' => "Lokasi '{$location->name}' berhasil dihapus.",
        ]);
    }
}
