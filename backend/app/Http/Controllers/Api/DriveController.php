<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Support\Security\DriveAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DriveController extends Controller
{
    /**
     * GET /api/drive
     * Menampilkan daftar folder & berkas, statistik kuota, dan daftar unit kerja.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $space = $request->query('space', 'my'); // 'my' | unitId
        $folderId = $request->query('folder_id') ? (int) $request->query('folder_id') : null;
        $search = trim((string) $request->query('search', ''));
        $filter = $request->query('filter', 'all'); // 'all' | 'starred' | 'trash'

        $unit = null;
        if ($space !== 'my') {
            $unit = DriveUnit::findOrFail((int) $space);
            if (! DriveAccess::canRead($user, $unit)) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke Drive Unit ini.'], 403);
            }
        }

        // Folder Query
        $folderQuery = DriveFolder::query();
        $fileQuery = DriveFile::query();

        if ($filter === 'trash') {
            $folderQuery->onlyTrashed();
            $fileQuery->onlyTrashed();
        } else {
            $folderQuery->whereNull('deleted_at');
            $fileQuery->whereNull('deleted_at');
        }

        if ($filter === 'starred') {
            $folderQuery->where('is_starred', true);
            $fileQuery->where('is_starred', true);
        }

        if ($filter === 'shared_with_me') {
            $userUnits = DriveUnit::all()->filter(fn($u) => DriveAccess::unitRole($user, $u) !== null)->pluck('id');
            $sharedFileIds = \App\Models\DriveShare::where('share_type', 'internal')
                ->where(function ($q) use ($user, $userUnits) {
                    $q->where('user_id', $user->id)
                      ->orWhereIn('unit_id', $userUnits);
                })
                ->pluck('file_id');

            $folderQuery->whereRaw('1 = 0');
            $fileQuery->whereIn('id', $sharedFileIds)->whereNull('deleted_at');
        } elseif ($unit) {
            $folderQuery->where('unit_id', $unit->id);
            $fileQuery->where('unit_id', $unit->id);
        } else {
            $folderQuery->where('user_id', $user->id)->whereNull('unit_id');
            $fileQuery->where('user_id', $user->id)->whereNull('unit_id');
        }

        // Parent hierarchy (hanya jika bukan mode search atau filter starred/trash)
        if ($search === '' && $filter === 'all') {
            if ($folderId) {
                $folderQuery->where('parent_id', $folderId);
                $fileQuery->where('folder_id', $folderId);
            } else {
                $folderQuery->whereNull('parent_id');
                $fileQuery->whereNull('folder_id');
            }
        } elseif ($search !== '') {
            $folderQuery->where('name', 'like', "%{$search}%");
            $fileQuery->where('name', 'like', "%{$search}%");
        }

        $folders = $folderQuery->orderBy('name')->get();
        $files = $fileQuery->orderByDesc('created_at')->get();

        // Breadcrumbs hierarchy
        $breadcrumbs = [];
        if ($folderId && $filter === 'all') {
            $curr = DriveFolder::find($folderId);
            while ($curr) {
                array_unshift($breadcrumbs, ['id' => $curr->id, 'name' => $curr->name]);
                $curr = $curr->parent_id ? DriveFolder::find($curr->parent_id) : null;
            }
        }

        // Hitung kuota
        if ($unit) {
            $usedBytes = $unit->usedStorageBytes();
            $quotaBytes = (int) $unit->storage_quota_bytes;
            $userRole = DriveAccess::unitRole($user, $unit);
        } else {
            $usedBytes = (int) DriveFile::where('user_id', $user->id)->whereNull('unit_id')->whereNull('deleted_at')->sum('size_bytes');
            $quotaBytes = (int) ($user->drive_quota_bytes ?: 5368709120); // 5 GB
            $userRole = 'manager';
        }

        // Daftar unit kerja yang dapat diakses pengguna
        $allUnits = DriveUnit::all()->map(function ($u) use ($user) {
            $role = DriveAccess::unitRole($user, $u);
            return [
                'id' => $u->id,
                'slug' => $u->slug,
                'name' => $u->name,
                'can_access' => $role !== null,
                'role' => $role,
            ];
        })->filter(fn ($u) => $u['can_access'])->values();

        return response()->json([
            'space' => $space,
            'unit' => $unit ? ['id' => $unit->id, 'name' => $unit->name, 'slug' => $unit->slug, 'role' => $userRole] : null,
            'current_folder_id' => $folderId,
            'breadcrumbs' => $breadcrumbs,
            'folders' => $folders,
            'files' => $files,
            'storage' => [
                'used_bytes' => $usedBytes,
                'quota_bytes' => $quotaBytes,
                'used_percent' => $quotaBytes > 0 ? round(($usedBytes / $quotaBytes) * 100, 1) : 0,
            ],
            'available_units' => $allUnits,
        ]);
    }

    /**
     * POST /api/drive/folders
     */
    public function createFolder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', 'exists:drive_folders,id'],
            'unit_id' => ['nullable', 'integer', 'exists:drive_units,id'],
            'color' => ['nullable', 'string', 'max:32'],
        ]);

        $user = $request->user();
        if (! empty($validated['unit_id'])) {
            $unit = DriveUnit::findOrFail($validated['unit_id']);
            if (! DriveAccess::canWrite($user, $unit)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di Drive Unit ini.'], 403);
            }
        }

        $folder = DriveFolder::create([
            'unit_id' => $validated['unit_id'] ?? null,
            'user_id' => $user->id,
            'parent_id' => $validated['parent_id'] ?? null,
            'name' => trim($validated['name']),
            'color' => $validated['color'] ?? null,
        ]);

        return response()->json([
            'message' => 'Folder berhasil dibuat.',
            'folder' => $folder,
        ], 201);
    }

    /**
     * PUT /api/drive/{type}/{id}/rename
     */
    public function rename(Request $request, string $type, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $model = $type === 'folder' ? DriveFolder::findOrFail($id) : DriveFile::findOrFail($id);

        if ($model->unit_id) {
            if (! DriveAccess::canWrite($user, $model->unit)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } elseif ($model->user_id !== $user->id && $user->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $model->update(['name' => trim($validated['name'])]);

        return response()->json(['message' => 'Nama berhasil diperbarui.', 'item' => $model]);
    }

    /**
     * PUT /api/drive/{type}/{id}/star
     */
    public function toggleStar(Request $request, string $type, int $id): JsonResponse
    {
        $model = $type === 'folder' ? DriveFolder::findOrFail($id) : DriveFile::findOrFail($id);
        $model->update(['is_starred' => ! $model->is_starred]);

        return response()->json(['message' => 'Status bintang diperbarui.', 'is_starred' => $model->is_starred]);
    }

    /**
     * DELETE /api/drive/{type}/{id} (Soft Delete to Trash)
     */
    public function trash(Request $request, string $type, int $id): JsonResponse
    {
        $user = $request->user();
        $model = $type === 'folder' ? DriveFolder::findOrFail($id) : DriveFile::findOrFail($id);

        if ($model->unit_id) {
            if (! DriveAccess::canWrite($user, $model->unit)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } elseif ($model->user_id !== $user->id && $user->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $model->delete();

        return response()->json(['message' => 'Item berhasil dipindahkan ke sampah.']);
    }

    /**
     * POST /api/drive/{type}/{id}/restore
     */
    public function restore(Request $request, string $type, int $id): JsonResponse
    {
        $model = $type === 'folder'
            ? DriveFolder::onlyTrashed()->findOrFail($id)
            : DriveFile::onlyTrashed()->findOrFail($id);

        $model->restore();

        return response()->json(['message' => 'Item berhasil dipulihkan.']);
    }

    /**
     * DELETE /api/drive/{type}/{id}/force (Permanent Deletion)
     */
    public function forceDelete(Request $request, string $type, int $id): JsonResponse
    {
        $user = $request->user();
        $model = $type === 'folder'
            ? DriveFolder::onlyTrashed()->findOrFail($id)
            : DriveFile::onlyTrashed()->findOrFail($id);

        if ($type === 'file') {
            // Hapus berkas fisik dari storage RustFS
            try {
                Storage::disk('drive')->delete($model->s3_key);
            } catch (\Throwable $e) {
                // Non-blocking storage error
            }
        }

        $model->forceDelete();

        return response()->json(['message' => 'Item berhasil dihapus permanen.']);
    }

    /**
     * POST /api/drive/upload/init
     * Inisialisasi upload: pengecekan kuota, reservasi, dan pembuatan presigned PUT URL.
     */
    public function initUpload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'size' => ['required', 'integer', 'min:1'],
            'mime' => ['required', 'string', 'max:128'],
            'folder_id' => ['nullable', 'integer', 'exists:drive_folders,id'],
            'unit_id' => ['nullable', 'integer', 'exists:drive_units,id'],
            'is_multipart' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();
        $size = (int) $validated['size'];
        $unit = ! empty($validated['unit_id']) ? DriveUnit::findOrFail($validated['unit_id']) : null;

        // 1. Otorisasi Unit
        if ($unit && ! DriveAccess::canWrite($user, $unit)) {
            return response()->json(['message' => 'Anda tidak memiliki hak menulis di Drive Unit ini.'], 403);
        }

        // 2. Pengecekan Kuota
        if ($unit) {
            $used = $unit->usedStorageBytes();
            if ($used + $size > $unit->storage_quota_bytes) {
                return response()->json(['message' => 'Kapasitas penyimpanan Drive Unit tidak mencukupi.'], 422);
            }
        } else {
            $used = (int) DriveFile::where('user_id', $user->id)->whereNull('unit_id')->whereNull('deleted_at')->sum('size_bytes');
            $quota = (int) ($user->drive_quota_bytes ?: 5368709120);
            if ($used + $size > $quota) {
                return response()->json(['message' => 'Kapasitas penyimpanan Drive Anda telah penuh.'], 422);
            }
        }

        // 3. Generate path S3
        $ext = pathinfo($validated['name'], PATHINFO_EXTENSION);
        $safeExt = $ext ? '.'.strtolower($ext) : '';
        $uuid = Str::uuid()->toString();
        $year = date('Y');
        $s3Key = $unit
            ? "units/{$unit->slug}/{$year}/{$uuid}{$safeExt}"
            : "personal/{$user->id}/{$year}/{$uuid}{$safeExt}";

        $uploadId = Str::random(32);
        $isMultipart = ! empty($validated['is_multipart']) || $size > (100 * 1024 * 1024); // > 100MB auto multipart

        $expiresAt = now()->addHours(2);

        // 4. Buat Presigned URL dengan disk drive_signer
        $bucket = config('filesystems.disks.drive_signer.bucket', 'bksda-drive');

        if (! $isMultipart) {
            // Single Upload: direct signed PUT
            $presignedUrl = Storage::disk('drive_signer')->temporaryUploadUrl($s3Key, $expiresAt);

            DriveUpload::create([
                'id' => $uploadId,
                'user_id' => $user->id,
                'unit_id' => $unit?->id,
                'folder_id' => $validated['folder_id'] ?? null,
                'filename' => $validated['name'],
                's3_key' => $s3Key,
                'total_size_bytes' => $size,
                'parts_count' => 1,
                'status' => 'initiated',
                'expires_at' => $expiresAt,
            ]);

            return response()->json([
                'upload_id' => $uploadId,
                's3_key' => $s3Key,
                'is_multipart' => false,
                'presigned_url' => $presignedUrl,
            ]);
        }

        // Multipart Upload via S3 client
        try {
            $client = Storage::disk('drive')->getClient();
            $multiRes = $client->createMultipartUpload([
                'Bucket' => $bucket,
                'Key' => $s3Key,
                'ContentType' => $validated['mime'],
            ]);
            $s3UploadId = $multiRes['UploadId'];
        } catch (\Throwable $e) {
            // Fallback to single presigned upload if multipart fails
            $presignedUrl = Storage::disk('drive_signer')->temporaryUploadUrl($s3Key, $expiresAt);
            DriveUpload::create([
                'id' => $uploadId,
                'user_id' => $user->id,
                'unit_id' => $unit?->id,
                'folder_id' => $validated['folder_id'] ?? null,
                'filename' => $validated['name'],
                's3_key' => $s3Key,
                'total_size_bytes' => $size,
                'parts_count' => 1,
                'status' => 'initiated',
                'expires_at' => $expiresAt,
            ]);

            return response()->json([
                'upload_id' => $uploadId,
                's3_key' => $s3Key,
                'is_multipart' => false,
                'presigned_url' => $presignedUrl,
            ]);
        }

        $partSize = 25 * 1024 * 1024; // 25 MB per part
        $partsCount = (int) ceil($size / $partSize);

        $signerClient = Storage::disk('drive_signer')->getClient();
        $partsUrls = [];

        for ($i = 1; $i <= $partsCount; $i++) {
            $cmd = $signerClient->getCommand('UploadPart', [
                'Bucket' => $bucket,
                'Key' => $s3Key,
                'UploadId' => $s3UploadId,
                'PartNumber' => $i,
            ]);
            $req = $signerClient->createPresignedRequest($cmd, '+120 minutes');
            $partsUrls[] = [
                'part_number' => $i,
                'url' => (string) $req->getUri(),
            ];
        }

        DriveUpload::create([
            'id' => $uploadId,
            'user_id' => $user->id,
            'unit_id' => $unit?->id,
            'folder_id' => $validated['folder_id'] ?? null,
            'filename' => $validated['name'],
            's3_key' => $s3Key,
            'upload_id' => $s3UploadId,
            'total_size_bytes' => $size,
            'parts_count' => $partsCount,
            'status' => 'initiated',
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'upload_id' => $uploadId,
            's3_key' => $s3Key,
            'is_multipart' => true,
            's3_upload_id' => $s3UploadId,
            'part_size' => $partSize,
            'parts' => $partsUrls,
        ]);
    }

    /**
     * POST /api/drive/upload/complete
     */
    public function completeUpload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'upload_id' => ['required', 'string'],
            'parts' => ['nullable', 'array'], // for multipart: [['PartNumber' => 1, 'ETag' => '"..."']]
        ]);

        $upload = DriveUpload::where('id', $validated['upload_id'])->firstOrFail();

        // If multipart, finalize S3 multipart upload
        if ($upload->upload_id && ! empty($validated['parts'])) {
            try {
                $client = Storage::disk('drive')->getClient();
                $bucket = config('filesystems.disks.drive.bucket', 'bksda-drive');
                $client->completeMultipartUpload([
                    'Bucket' => $bucket,
                    'Key' => $upload->s3_key,
                    'UploadId' => $upload->upload_id,
                    'MultipartUpload' => [
                        'Parts' => $validated['parts'],
                    ],
                ]);
            } catch (\Throwable $e) {
                return response()->json(['message' => 'Gagal menyelesaikan multipart upload: '.$e->getMessage()], 500);
            }
        }

        // Magic bytes validation (security audit: cegah file .html/.exe menyamar jadi .pdf/.jpg)
        $detectedMime = 'application/octet-stream';
        try {
            if (Storage::disk('drive')->exists($upload->s3_key)) {
                $stream = Storage::disk('drive')->readStream($upload->s3_key);
                if ($stream) {
                    $headerBytes = fread($stream, 4096);
                    fclose($stream);
                    $finfo = finfo_open(FILEINFO_MIME_TYPE);
                    $detectedMime = finfo_buffer($finfo, $headerBytes) ?: 'application/octet-stream';
                    finfo_close($finfo);
                }
            }
        } catch (\Throwable $e) {
            // Fallback extension detection
        }

        // Cegah stored XSS: jika upload mengaku berkas gambar/pdf tapi isinya HTML
        if (in_array(strtolower($detectedMime), ['text/html', 'application/x-msdownload', 'application/x-sh'], true)) {
            Storage::disk('drive')->delete($upload->s3_key);
            $upload->update(['status' => 'aborted']);
            return response()->json(['message' => 'Berkas mengandung tipe konten berbahaya dan ditolak sistem.'], 422);
        }

        // Catat ke drive_files
        $file = DriveFile::create([
            'unit_id' => $upload->unit_id,
            'user_id' => $upload->user_id,
            'folder_id' => $upload->folder_id,
            'name' => $upload->filename,
            's3_key' => $upload->s3_key,
            'size_bytes' => $upload->total_size_bytes,
            'mime_type' => $detectedMime,
        ]);

        $upload->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Berkas berhasil diunggah.',
            'file' => $file,
        ], 201);
    }

    /**
     * GET /api/drive/files/{id}/url
     * Menghasilkan signed GET URL dengan proteksi Stored XSS (Content-Disposition: inline vs attachment).
     */
    public function downloadUrl(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $file = DriveFile::findOrFail($id);

        if ($file->unit_id) {
            if (! DriveAccess::canRead($user, $file->unit)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } elseif ($file->user_id !== $user->id && $user->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $safeInlineMimes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'video/mp4',
            'text/plain',
        ];

        $isInline = in_array(strtolower($file->mime_type), $safeInlineMimes, true)
            && $request->query('download') !== '1';

        $safeFilename = str_replace('"', '', $file->name);
        $disposition = $isInline
            ? "inline; filename=\"{$safeFilename}\""
            : "attachment; filename=\"{$safeFilename}\"";

        try {
            $signerClient = Storage::disk('drive_signer')->getClient();
            $cmd = $signerClient->getCommand('GetObject', [
                'Bucket' => config('filesystems.disks.drive_signer.bucket', 'bksda-drive'),
                'Key' => $file->s3_key,
                'ResponseContentDisposition' => $disposition,
                'ResponseContentType' => $file->mime_type,
            ]);
            $req = $signerClient->createPresignedRequest($cmd, '+60 minutes');
            $url = (string) $req->getUri();
        } catch (\Throwable $e) {
            // Fallback to storage URL
            $url = Storage::disk('drive_signer')->temporaryUrl($file->s3_key, now()->addMinutes(60), [
                'ResponseContentDisposition' => $disposition,
            ]);
        }

        return response()->json([
            'url' => $url,
            'name' => $file->name,
            'size' => $file->size_bytes,
            'mime_type' => $file->mime_type,
            'is_inline' => $isInline,
        ]);
    }
}
