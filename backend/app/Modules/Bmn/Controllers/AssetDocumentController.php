<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Bmn\Services\PdfPreviewService;
use App\Modules\Bmn\Services\VehicleDocumentPathService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AssetDocumentController extends Controller
{
    private const TYPES = ['bpkb', 'stnk'];

    public function __construct(
        private VehicleDocumentPathService $pathService,
        private PdfPreviewService $pdfPreviewService,
    ) {}

    public function upload(Request $request, string $assetId): JsonResponse
    {
        $uploadedDocument = $request->file('document');
        if ($uploadedDocument && ! $uploadedDocument->isValid()) {
            $message = $this->uploadErrorMessage($uploadedDocument->getError());

            return response()->json([
                'message' => $message,
                'errors' => [
                    'document' => [$message],
                ],
            ], 422);
        }

        $request->validate([
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'document' => [
                'required',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp',
                'extensions:pdf,jpg,jpeg,png,webp',
                'max:20480',
            ],
        ], [
            'type.required' => 'Tipe dokumen wajib dipilih.',
            'type.in' => 'Tipe dokumen harus BPKB atau STNK.',
            'document.required' => 'Pilih file dokumen terlebih dahulu.',
            'document.uploaded' => 'Dokumen gagal diupload. Pastikan ukuran file tidak lebih dari 20MB.',
            'document.file' => 'Dokumen yang diupload tidak valid.',
            'document.mimes' => 'Dokumen harus berupa PDF, JPG, JPEG, PNG, atau WebP.',
            'document.extensions' => 'Ekstensi dokumen harus pdf, jpg, jpeg, png, atau webp.',
            'document.max' => 'Ukuran dokumen maksimal 20MB.',
        ]);

        $asset = Asset::findOrFail($assetId);
        $type = $request->string('type')->toString();
        $file = $request->file('document');
        $mime = $file->getMimeType() ?: 'application/octet-stream';
        $extension = strtolower($file->extension() ?: $file->getClientOriginalExtension() ?: 'bin');

        $documentColumn = "{$type}_document_path";
        $mimeColumn = "{$type}_document_mime";
        $originalNameColumn = "{$type}_document_original_name";
        $previewColumn = "{$type}_preview_path";
        $oldDocumentPath = $asset->$documentColumn;
        $oldPreviewPath = $asset->$previewColumn;

        $documentPath = $this->pathService->documentPath($asset, $type, $extension);
        $previewPath = null;

        $disk = Storage::disk(config('filesystems.default'));
        $disk->put($documentPath, file_get_contents($file->getRealPath()));

        if ($mime === 'application/pdf') {
            $previewPages = $this->pdfPreviewService->jpegPages(file_get_contents($file->getRealPath()));
            foreach ($previewPages as $index => $previewBytes) {
                $pageNumber = $index + 1;
                $pagePath = $pageNumber === 1
                    ? $this->pathService->previewPath($asset, $type)
                    : preg_replace('/\.jpg$/', '-page-'.$pageNumber.'.jpg', $previewPath);
                $disk->put($pagePath, $previewBytes);

                if ($pageNumber === 1) {
                    $previewPath = $pagePath;
                }
            }
        } elseif (str_starts_with($mime, 'image/')) {
            $previewBytes = file_get_contents($file->getRealPath());
            if ($previewBytes !== false) {
                $previewPath = $this->pathService->previewPath($asset, $type);
                $disk->put($previewPath, $previewBytes);
            }
        }

        $asset->update([
            $documentColumn => $documentPath,
            $mimeColumn => $mime,
            $originalNameColumn => $file->getClientOriginalName(),
            $previewColumn => $previewPath,
        ]);

        if ($oldDocumentPath && $disk->exists($oldDocumentPath)) {
            $disk->delete($oldDocumentPath);
        }
        $this->deletePreviewFiles($disk, $oldPreviewPath);

        AssetUpdate::create([
            'asset_id' => $asset->id,
            'user_id' => $request->user()->id,
            'field_changed' => "{$type}_document_path",
            'old_value' => $oldDocumentPath,
            'new_value' => $documentPath,
            'alasan_perubahan' => 'Upload dokumen '.strtoupper($type),
        ]);

        return response()->json([
            'message' => 'Dokumen '.strtoupper($type).' berhasil diupload.',
            'data' => [
                'document_path' => $documentPath,
                'preview_path' => $previewPath,
                'document_url' => "/api/bmn/assets/{$asset->id}/document/{$type}/view",
                'preview_url' => $previewPath ? "/api/bmn/assets/{$asset->id}/document/{$type}/preview" : null,
                'mime' => $mime,
            ],
        ]);
    }

    public function delete(Request $request, string $assetId, string $type): JsonResponse
    {
        if (! in_array($type, self::TYPES, true)) {
            return response()->json(['message' => 'Tipe dokumen tidak valid.'], 422);
        }

        $asset = Asset::findOrFail($assetId);
        $documentColumn = "{$type}_document_path";
        $mimeColumn = "{$type}_document_mime";
        $originalNameColumn = "{$type}_document_original_name";
        $previewColumn = "{$type}_preview_path";
        $oldDocumentPath = $asset->$documentColumn;
        $oldPreviewPath = $asset->$previewColumn;
        $disk = Storage::disk(config('filesystems.default'));

        if ($oldDocumentPath && $disk->exists($oldDocumentPath)) {
            $disk->delete($oldDocumentPath);
        }
        $this->deletePreviewFiles($disk, $oldPreviewPath);

        $asset->update([
            $documentColumn => null,
            $mimeColumn => null,
            $originalNameColumn => null,
            $previewColumn => null,
        ]);

        if ($oldDocumentPath) {
            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $request->user()->id,
                'field_changed' => "{$type}_document_path",
                'old_value' => $oldDocumentPath,
                'new_value' => null,
                'alasan_perubahan' => 'Hapus dokumen '.strtoupper($type),
            ]);
        }

        return response()->json(['message' => 'Dokumen '.strtoupper($type).' berhasil dihapus.']);
    }

    public function view(string $assetId, string $type)
    {
        return $this->streamDocument($assetId, $type, preview: false, download: false);
    }

    public function preview(string $assetId, string $type)
    {
        return $this->streamDocument($assetId, $type, preview: true, download: false);
    }

    public function previewPage(string $assetId, string $type, int $page)
    {
        return $this->streamDocument($assetId, $type, preview: true, download: false, page: $page);
    }

    public function download(string $assetId, string $type)
    {
        return $this->streamDocument($assetId, $type, preview: false, download: true);
    }

    private function uploadErrorMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Dokumen melebihi batas upload server. Batas saat ini: upload_max_filesize='.ini_get('upload_max_filesize').', post_max_size='.ini_get('post_max_size').'.',
            UPLOAD_ERR_PARTIAL => 'Dokumen hanya terupload sebagian. Coba upload ulang atau gunakan koneksi/jalur upload langsung ke backend.',
            UPLOAD_ERR_NO_FILE => 'Pilih file dokumen terlebih dahulu.',
            UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary upload server tidak tersedia.',
            UPLOAD_ERR_CANT_WRITE => 'Server gagal menulis file upload ke disk temporary.',
            UPLOAD_ERR_EXTENSION => 'Upload dokumen dihentikan oleh ekstensi PHP.',
            default => 'Dokumen gagal diupload. Kode error upload: '.$error.'.',
        };
    }

    private function deletePreviewFiles($disk, ?string $previewPath): void
    {
        if (! $previewPath) {
            return;
        }

        $paths = [$previewPath];
        $directory = dirname($previewPath);
        $filename = pathinfo($previewPath, PATHINFO_FILENAME);

        foreach ($disk->files($directory) as $path) {
            if (preg_match('/^'.preg_quote($filename, '/').'-page-\d+\.jpg$/', basename($path)) === 1) {
                $paths[] = $path;
            }
        }

        foreach (array_unique($paths) as $path) {
            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        }
    }

    private function streamDocument(string $assetId, string $type, bool $preview, bool $download, ?int $page = null)
    {
        if (! in_array($type, self::TYPES, true)) {
            return response()->json(['message' => 'Tipe dokumen tidak valid.'], 422);
        }

        $asset = Asset::findOrFail($assetId);
        $pathColumn = $preview ? "{$type}_preview_path" : "{$type}_document_path";
        $mimeColumn = "{$type}_document_mime";
        $path = $asset->$pathColumn;
        $disk = Storage::disk(config('filesystems.default'));

        if ($preview && $page && $page > 1 && $path) {
            $pagePath = preg_replace('/\.jpg$/', '-page-'.$page.'.jpg', $path);
            $path = $pagePath ?: $path;
        }

        if (! $path || ! $disk->exists($path)) {
            return response()->json(['message' => 'Dokumen tidak ditemukan.'], 404);
        }

        $mime = $preview ? 'image/jpeg' : ($asset->$mimeColumn ?: $disk->mimeType($path) ?: 'application/octet-stream');
        $filename = basename($path);

        if ($download) {
            return response()->streamDownload(function () use ($disk, $path) {
                echo $disk->get($path);
            }, $filename, [
                'Content-Type' => $mime,
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            ]);
        }

        return response($disk->get($path), 200)
            ->header('Content-Type', $mime)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Content-Disposition', 'inline; filename="'.$filename.'"');
    }
}
