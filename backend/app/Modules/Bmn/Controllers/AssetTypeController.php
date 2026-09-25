<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\AssetType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssetTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $types = AssetType::withCount('assets')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'data' => $types,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('bmn_asset_types', 'name')],
            'category_mode' => ['required', 'string', 'in:kendaraan,tanah,bangunan,peralatan'],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'name.required' => 'Nama jenis BMN wajib diisi.',
            'name.unique' => 'Jenis BMN dengan nama ini sudah ada.',
            'category_mode.required' => 'Kategori form BMN wajib dipilih.',
            'category_mode.in' => 'Kategori form harus salah satu dari: kendaraan, tanah, bangunan, peralatan.',
        ]);

        $type = AssetType::create($validated);
        $type->loadCount('assets');

        return response()->json([
            'message' => "Jenis BMN '{$type->name}' berhasil ditambahkan.",
            'data' => $type,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $type = AssetType::findOrFail($id);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('bmn_asset_types', 'name')->ignore($type->id)],
            'category_mode' => ['required', 'string', 'in:kendaraan,tanah,bangunan,peralatan'],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'name.required' => 'Nama jenis BMN wajib diisi.',
            'name.unique' => 'Jenis BMN dengan nama ini sudah ada.',
            'category_mode.required' => 'Kategori form BMN wajib dipilih.',
            'category_mode.in' => 'Kategori form harus salah satu dari: kendaraan, tanah, bangunan, peralatan.',
        ]);

        $oldName = $type->name;
        $type->update($validated);

        if ($oldName !== $validated['name']) {
            $type->assets()->where('jenis_bmn', $oldName)->update(['jenis_bmn' => $validated['name']]);
        }

        $type->loadCount('assets');

        return response()->json([
            'message' => "Jenis BMN '{$type->name}' berhasil diperbarui.",
            'data' => $type,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $type = AssetType::withCount('assets')->findOrFail($id);

        if ($type->assets_count > 0) {
            return response()->json([
                'message' => "Jenis BMN '{$type->name}' tidak dapat dihapus karena masih digunakan oleh {$type->assets_count} aset BMN. Silakan ubah jenis aset terkait terlebih dahulu.",
            ], 422);
        }

        $type->delete();

        return response()->json([
            'message' => "Jenis BMN '{$type->name}' berhasil dihapus.",
        ]);
    }
}
