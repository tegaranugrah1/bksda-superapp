<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class AssetPhotoController extends Controller
{
    private const VALID_TYPES = ['belakang', 'kiri', 'kanan', 'lokasi'];

    /**
     * Upload a photo for a specific side.
     */
    public function upload(Request $request, string $assetId): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'type' => 'required|in:' . implode(',', self::VALID_TYPES),
        ]);

        $asset = Asset::findOrFail($assetId);
        $type = $request->input('type');
        $column = "foto_{$type}_path";
        $oldPath = $asset->$column;

        // Delete old photo if exists
        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        // Store new photo
        $filename = Str::slug($asset->nama_barang) . "_{$asset->nup}_{$type}." . $request->file('photo')->extension();
        $path = $request->file('photo')->storeAs('bmn-photos', $filename, 'public');

        $asset->update([$column => $path]);

        // Log to history
        AssetUpdate::create([
            'asset_id' => $asset->id,
            'user_id' => $request->user()->id,
            'field_changed' => $column,
            'old_value' => $oldPath,
            'new_value' => $path,
            'alasan_perubahan' => 'Upload foto ' . $type,
        ]);

        return response()->json([
            'message' => 'Foto berhasil diupload.',
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /**
     * Update geotag: accept file upload OR external URL (hybrid).
     *
     * - If 'photo' file is present → upload to local storage, clear external URL.
     * - If 'url' is present → save external link, clear local path.
     * - At least one of the two must be provided.
     */
    public function updateGeotag(Request $request, string $assetId): JsonResponse
    {
        $request->validate([
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'url' => 'nullable|url',
        ]);

        if (!$request->hasFile('photo') && !$request->filled('url')) {
            return response()->json([
                'message' => 'Harus menyertakan file foto atau URL.',
            ], 422);
        }

        $asset = Asset::findOrFail($assetId);
        $oldUrl = $asset->foto_geotag_url;
        $oldPath = $asset->foto_geotag_path;

        if ($request->hasFile('photo')) {
            // Delete old local file if exists
            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }

            $filename = Str::slug($asset->nama_barang) . "_{$asset->nup}_geotag." . $request->file('photo')->extension();
            $path = $request->file('photo')->storeAs('bmn-photos', $filename, 'public');

            $asset->update([
                'foto_geotag_path' => $path,
                'foto_geotag_url' => null, // Clear external URL when uploading file
            ]);

            // Log to history
            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $request->user()->id,
                'field_changed' => 'foto_geotag_path',
                'old_value' => $oldPath,
                'new_value' => $path,
                'alasan_perubahan' => 'Upload foto geotag langsung',
            ]);

            return response()->json([
                'message' => 'Foto geotag berhasil diupload.',
                'source' => 'upload',
                'path' => $path,
                'url' => Storage::disk('public')->url($path),
            ]);
        }

        // External URL mode
        // Delete old local file if switching to URL
        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        $asset->update([
            'foto_geotag_url' => $request->input('url'),
            'foto_geotag_path' => null, // Clear local path when using URL
        ]);

        // Log to history
        AssetUpdate::create([
            'asset_id' => $asset->id,
            'user_id' => $request->user()->id,
            'field_changed' => 'foto_geotag_url',
            'old_value' => $oldUrl,
            'new_value' => $request->input('url'),
            'alasan_perubahan' => 'Update link foto geotag',
        ]);

        return response()->json([
            'message' => 'Link foto geotag berhasil disimpan.',
            'source' => 'url',
            'url' => $request->input('url'),
        ]);
    }

    /**
     * Delete a specific photo.
     */
    public function delete(Request $request, string $assetId, string $type): JsonResponse
    {
        if ($type === 'geotag') {
            $asset = Asset::findOrFail($assetId);
            $oldPath = $asset->foto_geotag_path;
            $oldUrl = $asset->foto_geotag_url;

            if ($oldPath && Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }

            $asset->update(['foto_geotag_path' => null, 'foto_geotag_url' => null]);

            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $request->user()->id,
                'field_changed' => 'foto_geotag',
                'old_value' => $oldPath ?? $oldUrl,
                'new_value' => null,
                'alasan_perubahan' => 'Hapus foto geotag',
            ]);

            return response()->json(['message' => 'Foto geotag berhasil dihapus.']);
        }

        if (!in_array($type, self::VALID_TYPES)) {
            return response()->json(['message' => 'Tipe foto tidak valid.'], 422);
        }

        $asset = Asset::findOrFail($assetId);
        $column = "foto_{$type}_path";
        $oldPath = $asset->$column;

        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        $asset->update([$column => null]);

        // Log to history
        if ($oldPath) {
            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $request->user()->id,
                'field_changed' => $column,
                'old_value' => $oldPath,
                'new_value' => null,
                'alasan_perubahan' => 'Hapus foto ' . $type,
            ]);
        }

        return response()->json(['message' => 'Foto berhasil dihapus.']);
    }

    /**
     * Download a single photo with proper filename.
     */
    public function download(string $assetId, string $type)
    {
        if ($type === 'geotag') {
            $asset = Asset::findOrFail($assetId);

            // Prefer local file over external URL
            if ($asset->foto_geotag_path && Storage::disk('public')->exists($asset->foto_geotag_path)) {
                $ext = pathinfo($asset->foto_geotag_path, PATHINFO_EXTENSION);
                $filename = Str::slug($asset->nama_barang) . "_{$asset->nup}_geotag.{$ext}";
                return Storage::disk('public')->download($asset->foto_geotag_path, $filename);
            }

            if ($asset->foto_geotag_url) {
                return response()->json(['redirect' => $asset->foto_geotag_url]);
            }

            return response()->json(['message' => 'Foto geotag tidak tersedia.'], 404);
        }

        if (!in_array($type, self::VALID_TYPES)) {
            return response()->json(['message' => 'Tipe foto tidak valid.'], 422);
        }

        $asset = Asset::findOrFail($assetId);
        $column = "foto_{$type}_path";

        if (!$asset->$column || !Storage::disk('public')->exists($asset->$column)) {
            return response()->json(['message' => 'Foto tidak ditemukan.'], 404);
        }

        $ext = pathinfo($asset->$column, PATHINFO_EXTENSION);
        $filename = Str::slug($asset->nama_barang) . "_{$asset->nup}_{$type}.{$ext}";

        return Storage::disk('public')->download($asset->$column, $filename);
    }

    /**
     * Download all photos as ZIP.
     */
    public function downloadAll(string $assetId)
    {
        $asset = Asset::findOrFail($assetId);
        $files = [];

        // Include geotag if stored locally
        if ($asset->foto_geotag_path && Storage::disk('public')->exists($asset->foto_geotag_path)) {
            $ext = pathinfo($asset->foto_geotag_path, PATHINFO_EXTENSION);
            $files[] = [
                'path' => Storage::disk('public')->path($asset->foto_geotag_path),
                'name' => Str::slug($asset->nama_barang) . "_{$asset->nup}_geotag.{$ext}",
            ];
        }

        foreach (self::VALID_TYPES as $type) {
            $column = "foto_{$type}_path";
            if ($asset->$column && Storage::disk('public')->exists($asset->$column)) {
                $ext = pathinfo($asset->$column, PATHINFO_EXTENSION);
                $files[] = [
                    'path' => Storage::disk('public')->path($asset->$column),
                    'name' => Str::slug($asset->nama_barang) . "_{$asset->nup}_{$type}.{$ext}",
                ];
            }
        }

        if (empty($files)) {
            return response()->json(['message' => 'Tidak ada foto untuk diunduh.'], 404);
        }

        $zipName = Str::slug($asset->nama_barang) . "_{$asset->nup}_Foto.zip";
        $zipPath = storage_path("app/temp/{$zipName}");

        // Ensure temp directory exists
        if (!is_dir(storage_path('app/temp'))) {
            mkdir(storage_path('app/temp'), 0755, true);
        }

        $zip = new ZipArchive();
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($files as $file) {
            $zip->addFile($file['path'], $file['name']);
        }

        $zip->close();

        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }
}
