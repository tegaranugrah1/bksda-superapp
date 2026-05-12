<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use ZipArchive;

class AssetPhotoController extends Controller
{
    private const VALID_TYPES = ['depan', 'belakang', 'kiri', 'kanan'];

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

        // Delete old photo if exists
        if ($asset->$column && Storage::disk('public')->exists($asset->$column)) {
            Storage::disk('public')->delete($asset->$column);
        }

        // Store new photo
        $filename = Str::slug($asset->nama_barang) . "_{$asset->nup}_{$type}." . $request->file('photo')->extension();
        $path = $request->file('photo')->storeAs('bmn-photos', $filename, 'public');

        $asset->update([$column => $path]);

        return response()->json([
            'message' => 'Foto berhasil diupload.',
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ]);
    }

    /**
     * Update geotag URL (Google Drive link).
     */
    public function updateGeotag(Request $request, string $assetId): JsonResponse
    {
        $request->validate(['url' => 'required|url']);
        $asset = Asset::findOrFail($assetId);
        $asset->update(['foto_geotag_url' => $request->input('url')]);

        return response()->json(['message' => 'Link foto geotag berhasil disimpan.']);
    }

    /**
     * Delete a specific photo.
     */
    public function delete(string $assetId, string $type): JsonResponse
    {
        if (!in_array($type, self::VALID_TYPES)) {
            return response()->json(['message' => 'Tipe foto tidak valid.'], 422);
        }

        $asset = Asset::findOrFail($assetId);
        $column = "foto_{$type}_path";

        if ($asset->$column && Storage::disk('public')->exists($asset->$column)) {
            Storage::disk('public')->delete($asset->$column);
        }

        $asset->update([$column => null]);

        return response()->json(['message' => 'Foto berhasil dihapus.']);
    }

    /**
     * Download a single photo with proper filename.
     */
    public function download(string $assetId, string $type)
    {
        if ($type === 'geotag') {
            $asset = Asset::findOrFail($assetId);
            if (!$asset->foto_geotag_url) {
                return response()->json(['message' => 'Foto geotag tidak tersedia.'], 404);
            }
            return response()->json(['redirect' => $asset->foto_geotag_url]);
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
