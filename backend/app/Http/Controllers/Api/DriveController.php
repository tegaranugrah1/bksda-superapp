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
use Illuminate\Support\Facades\DB;
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
                $targetFolder = $folderId ? DriveFolder::find($folderId) : null;
                if (! ($targetFolder && DriveAccess::canReadFolder($user, $targetFolder))) {
                    return response()->json(['message' => 'Anda tidak memiliki akses ke Drive Unit ini.'], 403);
                }
            }
        }

        // Pengecekan akses ke folder spesifik (Anti-IDOR)
        if ($folderId) {
            $targetFolder = DriveFolder::find($folderId);
            if ($targetFolder && ! DriveAccess::canReadFolder($user, $targetFolder)) {
                return response()->json(['message' => 'Anda tidak memiliki akses ke folder ini.'], 403);
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
            $userUnits = DriveAccess::getUserUnitIds($user);
            $shares = \App\Models\DriveShare::where('share_type', 'internal')
                ->where(function ($q) use ($user, $userUnits) {
                    $q->where('user_id', $user->id)
                      ->orWhereIn('unit_id', $userUnits);
                })
                ->get();

            $sharedFileIds = $shares->whereNotNull('file_id')->pluck('file_id');
            $sharedFolderIds = $shares->whereNotNull('folder_id')->pluck('folder_id');

            $folderQuery->whereIn('id', $sharedFolderIds);
            $fileQuery->whereIn('id', $sharedFileIds);
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

        // Anti-Search Leak: saring hanya folder dan berkas yang berhak dibaca user
        $folders = $folderQuery->orderBy('name')->get()
            ->filter(fn ($f) => DriveAccess::canReadFolder($user, $f))
            ->values();

        $files = $fileQuery->orderByDesc('created_at')->get()
            ->filter(fn ($f) => DriveAccess::canReadFile($user, $f))
            ->values();

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
            'units' => $allUnits,
            'can_write' => $unit ? DriveAccess::canWrite($user, $unit) : true,
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
        $parentFolder = null;
        if (! empty($validated['parent_id'])) {
            $parentFolder = DriveFolder::find($validated['parent_id']);
            if (! $parentFolder) {
                return response()->json(['message' => 'Folder induk tidak ditemukan atau sudah dihapus.'], 404);
            }
            if (! DriveAccess::canWriteFolder($user, $parentFolder)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di folder ini.'], 403);
            }
        } elseif (! empty($validated['unit_id'])) {
            $unit = DriveUnit::findOrFail($validated['unit_id']);
            if (! DriveAccess::canWrite($user, $unit)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di Drive Unit ini.'], 403);
            }
        }

        $unitId = $validated['unit_id'] ?? $parentFolder?->unit_id;

        // Warisi restriksi subfolder dari parent folder (Subfolder Inheritance)
        $isRestricted = false;
        $folderScope = 'umum';
        $resorCode = null;
        $roomCode = null;

        if ($parentFolder && $parentFolder->is_restricted) {
            $isRestricted = true;
            $folderScope = $parentFolder->folder_scope;
            $resorCode = $parentFolder->resor_code;
            $roomCode = $parentFolder->room_code;
        }

        $cleanName = $this->sanitizeFilesystemName($validated['name'], 'folder');

        $folder = DriveFolder::create([
            'unit_id' => $unitId,
            'user_id' => $user->id,
            'parent_id' => $parentFolder?->id,
            'name' => $cleanName,
            'color' => $validated['color'] ?? null,
            'is_restricted' => $isRestricted,
            'folder_scope' => $folderScope,
            'resor_code' => $resorCode,
            'room_code' => $roomCode,
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
        if ($type === 'folder') {
            $model = DriveFolder::findOrFail($id);
            if (! DriveAccess::canWriteFolder($user, $model)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $cleanName = $this->sanitizeFilesystemName($validated['name'], 'folder');
        } else {
            $model = DriveFile::findOrFail($id);
            if (! DriveAccess::canWriteFile($user, $model)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            $cleanName = $this->sanitizeFilesystemName($validated['name'], 'file');
        }

        $model->update(['name' => $cleanName]);

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
        if ($type === 'folder') {
            $model = DriveFolder::findOrFail($id);
            if (! DriveAccess::canWriteFolder($user, $model)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        } else {
            $model = DriveFile::findOrFail($id);
            if (! DriveAccess::canWriteFile($user, $model)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
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

        // Root check: jika folder_id diberikan, pastikan folder tujuan ada dan tidak trashed
        $targetFolder = null;
        if (! empty($validated['folder_id'])) {
            $targetFolder = DriveFolder::find($validated['folder_id']);
            if (! $targetFolder) {
                return response()->json(['message' => 'Folder tujuan tidak ditemukan atau sudah dihapus.'], 404);
            }
            if (! DriveAccess::canWriteFolder($user, $targetFolder)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di folder ini.'], 403);
            }
        }

        $unitId = $validated['unit_id'] ?? $targetFolder?->unit_id;
        $unit = ! empty($unitId) ? DriveUnit::findOrFail($unitId) : null;

        // 1. Otorisasi Unit / Folder
        if ($unit && ! DriveAccess::canWrite($user, $unit)) {
            if (! ($targetFolder && DriveAccess::canWriteFolder($user, $targetFolder))) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di Drive Unit ini.'], 403);
            }
        }

        $cleanFilename = $this->sanitizeFilesystemName($validated['name'], 'file');

        // 2 & 3. Pengecekan Kuota dengan Row-Locking & Atomic Reservation (CWE-362)
        $ext = pathinfo($cleanFilename, PATHINFO_EXTENSION);
        $safeExt = $ext ? '.'.strtolower($ext) : '';
        $uuid = Str::uuid()->toString();
        $year = date('Y');
        $s3Key = $unit
            ? "units/{$unit->slug}/{$year}/{$uuid}{$safeExt}"
            : "personal/{$user->id}/{$year}/{$uuid}{$safeExt}";

        $uploadId = Str::random(32);
        $isMultipart = ! empty($validated['is_multipart']) || $size > (100 * 1024 * 1024); // > 100MB auto multipart
        $expiresAt = now()->addHours(2);

        $quotaError = null;
        $createdUpload = null;

        DB::transaction(function () use ($unit, $user, $size, $validated, $cleanFilename, $uploadId, $s3Key, $expiresAt, &$quotaError, &$createdUpload) {
            if ($unit) {
                $lockedUnit = DriveUnit::where('id', $unit->id)->lockForUpdate()->first();
                $used = $lockedUnit ? $lockedUnit->usedStorageBytes() : 0;
                $reserved = $lockedUnit ? $lockedUnit->reservedStorageBytes() : 0;
                $limit = $lockedUnit ? $lockedUnit->storage_quota_bytes : 0;

                if ($used + $reserved + $size > $limit) {
                    $quotaError = 'Kapasitas penyimpanan Drive Unit tidak mencukupi.';
                    return;
                }
            } else {
                $lockedUser = \App\Models\User::where('id', $user->id)->lockForUpdate()->first();
                $used = (int) DriveFile::where('user_id', $user->id)->whereNull('unit_id')->whereNull('deleted_at')->sum('size_bytes');
                $reserved = (int) DriveUpload::where('user_id', $user->id)
                    ->whereNull('unit_id')
                    ->where('status', 'initiated')
                    ->where('expires_at', '>', now())
                    ->sum('total_size_bytes');
                $quota = (int) ($lockedUser?->drive_quota_bytes ?: 5368709120);

                if ($used + $reserved + $size > $quota) {
                    $quotaError = 'Kapasitas penyimpanan Drive Anda telah penuh.';
                    return;
                }
            }

            // Reservasi atomik kuota langsung tercatat di dalam transaksi
            $createdUpload = DriveUpload::create([
                'id' => $uploadId,
                'user_id' => $user->id,
                'unit_id' => $unit?->id,
                'folder_id' => $validated['folder_id'] ?? null,
                'filename' => $cleanFilename,
                's3_key' => $s3Key,
                'total_size_bytes' => $size,
                'parts_count' => 1,
                'status' => 'initiated',
                'expires_at' => $expiresAt,
            ]);
        });

        if ($quotaError !== null) {
            return response()->json(['message' => $quotaError], 422);
        }

        // 4. Buat Presigned URL dengan disk drive_signer
        $bucket = config('filesystems.disks.drive_signer.bucket', 'bksda-drive');

        if (! $isMultipart) {
            // Single Upload: direct signed PUT
            $presignedUrl = Storage::disk('drive_signer')->temporaryUploadUrl($s3Key, $expiresAt);
            $targetUrl = is_array($presignedUrl) ? ($presignedUrl['url'] ?? '') : (string) $presignedUrl;

            return response()->json([
                'upload_id' => $uploadId,
                's3_key' => $s3Key,
                'is_multipart' => false,
                'presigned_url' => $targetUrl,
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

        $createdUpload->update([
            'upload_id' => $s3UploadId,
            'parts_count' => $partsCount,
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

        // Otorisasi kepemilikan upload (anti-takeover CWE-284)
        $user = $request->user();
        if ($user && (int) $upload->user_id !== (int) $user->id && ! in_array($user->role, ['super_admin', 'admin'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki otorisasi untuk menyelesaikan upload ini.'], 403);
        }

        // Cek apakah target folder masih ada dan belum dihapus (anti-orphaned file)
        if ($upload->folder_id) {
            $targetFolder = DriveFolder::find($upload->folder_id);
            if (! $targetFolder) {
                Storage::disk('drive')->delete($upload->s3_key);
                $upload->update(['status' => 'aborted']);
                return response()->json(['message' => 'Folder tujuan telah dihapus sebelum upload selesai.'], 404);
            }
        }

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

        if (! DriveAccess::canReadFile($user, $file)) {
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

    /**
     * POST /api/drive/folders/{id}/zip-token
     * Menghasilkan URL sementara bertanda tangan (signed URL) untuk unduh folder sebagai ZIP.
     */
    public function requestZipToken(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $folder = DriveFolder::findOrFail($id);

        if (! DriveAccess::canReadFolder($user, $folder)) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk mengunduh folder ini.'], 403);
        }

        // URL bertanda tangan (HMAC-SHA256) berlaku 15 menit
        $signedUrl = \Illuminate\Support\Facades\URL::temporarySignedRoute(
            'drive.folder.download_zip',
            now()->addMinutes(15),
            ['id' => $folder->id, 'u' => $user->id]
        );

        return response()->json([
            'download_url' => $signedUrl,
            'folder_name' => $folder->name,
            'expires_in_minutes' => 15,
        ]);
    }

    /**
     * GET /api/drive/folders/{id}/download-zip
     * Men-stream arsip ZIP folder secara instan ke browser dengan proteksi anti Zip-Slip dan anti-leak.
     */
    public function downloadFolderZip(Request $request, int $id)
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'Tautan unduhan ZIP tidak valid atau sudah kedaluwarsa.');
        }

        $userId = $request->query('u');
        $folder = DriveFolder::findOrFail($id);
        $user = ($userId ? \App\Models\User::find($userId) : null) ?? $request->user() ?? \App\Models\User::find($folder->user_id);

        if (! $user || ! DriveAccess::canReadFolder($user, $folder)) {
            abort(403, 'Anda tidak memiliki hak untuk mengunduh arsip ZIP folder ini.');
        }

        $cleanFolderName = preg_replace('/[^\w\-]/', '_', $folder->name) ?: 'folder';
        $zipFilename = "{$cleanFolderName}.zip";

        return response()->streamDownload(function () use ($folder, $user) {
            $zip = new \ZipStream\ZipStream(
                outputStream: fopen('php://output', 'wb'),
                sendHttpHeaders: false
            );

            $this->addFolderToZipStream($zip, $folder, '', $user);

            $zip->finish();
        }, $zipFilename, [
            'Content-Type' => 'application/zip',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Rekursif menambahkan berkas dan subfolder ke ZipStream dengan proteksi anti Zip-Slip (CWE-22) dan isolasi RBAC.
     */
    protected function addFolderToZipStream(\ZipStream\ZipStream $zip, DriveFolder $folder, string $basePath, \App\Models\User $user): void
    {
        // Ambil semua berkas di folder ini
        $files = DriveFile::where('folder_id', $folder->id)->whereNull('deleted_at')->get();
        foreach ($files as $file) {
            if (! DriveAccess::canReadFile($user, $file)) {
                continue;
            }

            // Anti-Zip-Slip (CWE-22): Sanitasi nama berkas, cegah path traversal
            $cleanName = basename(preg_replace('/(\.\.[\/\\\\])+/', '', (string) $file->name));
            if ($cleanName === '' || $cleanName === '.' || $cleanName === '..') {
                $cleanName = "file_{$file->id}";
            }
            $safePath = ltrim(($basePath !== '' ? "{$basePath}/" : '') . $cleanName, '/');

            try {
                if (Storage::disk('drive')->exists($file->s3_key)) {
                    $stream = Storage::disk('drive')->readStream($file->s3_key);
                    if ($stream) {
                        $zip->addFileFromStream(fileName: $safePath, stream: $stream);
                        if (is_resource($stream)) {
                            fclose($stream);
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Lewati berkas yang bermasalah agar unduhan folder tidak terputus
            }
        }

        // Telusuri subfolder (Anti-Bulk ZIP bypass: lewati subfolder yang tidak dapat dibaca user)
        $subfolders = DriveFolder::where('parent_id', $folder->id)->whereNull('deleted_at')->get();
        foreach ($subfolders as $sub) {
            if (! DriveAccess::canReadFolder($user, $sub)) {
                continue;
            }

            $subClean = basename(preg_replace('/(\.\.[\/\\\\])+/', '', (string) $sub->name));
            if ($subClean === '' || $subClean === '.' || $subClean === '..') {
                $subClean = "folder_{$sub->id}";
            }
            $subPath = ltrim(($basePath !== '' ? "{$basePath}/" : '') . $subClean, '/');
            $this->addFolderToZipStream($zip, $sub, $subPath, $user);
        }
    }

    /**
     * POST /api/drive/files/{id}/move
     * Memindahkan berkas ke folder atau unit tujuan.
     */
    public function moveFile(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $file = DriveFile::findOrFail($id);

        if (! DriveAccess::canWriteFile($user, $file)) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk memindahkan berkas ini.'], 403);
        }

        $validated = $request->validate([
            'destination_folder_id' => ['nullable', 'integer', 'exists:drive_folders,id'],
            'destination_unit_id' => ['nullable', 'integer', 'exists:drive_units,id'],
        ]);

        $destFolderId = $validated['destination_folder_id'] ?? null;
        $destUnitId = $validated['destination_unit_id'] ?? null;

        if ($destFolderId) {
            $destFolder = DriveFolder::findOrFail($destFolderId);
            if (! DriveAccess::canWriteFolder($user, $destFolder)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di folder tujuan.'], 403);
            }
            $file->update([
                'folder_id' => $destFolder->id,
                'unit_id' => $destFolder->unit_id,
            ]);
        } else {
            // Pindah ke root unit atau root personal
            if ($destUnitId) {
                $destUnit = DriveUnit::findOrFail($destUnitId);
                if (! DriveAccess::canWrite($user, $destUnit)) {
                    return response()->json(['message' => 'Anda tidak memiliki hak menulis di unit tujuan.'], 403);
                }
                $file->update([
                    'folder_id' => null,
                    'unit_id' => $destUnit->id,
                ]);
            } else {
                // Pindah ke root drive pribadi
                $file->update([
                    'folder_id' => null,
                    'unit_id' => null,
                ]);
            }
        }

        return response()->json([
            'message' => 'Berkas berhasil dipindahkan.',
            'file' => $file->fresh(),
        ]);
    }

    /**
     * POST /api/drive/folders/{id}/move
     * Memindahkan folder dengan proteksi loop sirkular (CWE-674).
     */
    public function moveFolder(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $folder = DriveFolder::findOrFail($id);

        if (! DriveAccess::canWriteFolder($user, $folder)) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk memindahkan folder ini.'], 403);
        }

        $validated = $request->validate([
            'destination_parent_id' => ['nullable', 'integer', 'exists:drive_folders,id'],
        ]);

        $destParentId = $validated['destination_parent_id'] ?? null;

        if ($destParentId) {
            if ((int) $destParentId === (int) $folder->id) {
                return response()->json(['message' => 'Folder tidak dapat dipindahkan ke dalam dirinya sendiri.'], 422);
            }

            $destParent = DriveFolder::findOrFail($destParentId);
            if (! DriveAccess::canWriteFolder($user, $destParent)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di folder tujuan.'], 403);
            }

            // Anti-Circular Parent: cegah memindahkan folder ke dalam anak/cucunya sendiri
            $curr = $destParent;
            while ($curr) {
                if ((int) $curr->id === (int) $folder->id) {
                    return response()->json([
                        'message' => 'Folder tidak dapat dipindahkan ke dalam subfoldernya sendiri.',
                    ], 422);
                }
                $curr = $curr->parent_id ? DriveFolder::find($curr->parent_id) : null;
            }

            $folder->update([
                'parent_id' => $destParent->id,
                'unit_id' => $destParent->unit_id,
            ]);
        } else {
            // Pindahkan ke root
            $folder->update(['parent_id' => null]);
        }

        return response()->json([
            'message' => 'Folder berhasil dipindahkan.',
            'folder' => $folder->fresh(),
        ]);
    }

    /**
     * POST /api/drive/folders/{id}/assign-manager
     * Menunjuk seorang pegawai/user sebagai Admin/Manager dari folder resor/ruangan.
     */
    public function assignManager(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Hanya Superadmin atau Admin Drive yang berhak menunjuk Admin Resor/Ruangan.'], 403);
        }

        $folder = DriveFolder::findOrFail($id);
        $validated = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'nip' => ['nullable', 'string', 'max:50'],
        ]);

        if (empty($validated['user_id']) && empty($validated['nip'])) {
            return response()->json(['message' => 'Wajib memilih pegawai atau akun pengguna.'], 422);
        }

        $newManager = null;
        if (! empty($validated['user_id'])) {
            $newManager = \App\Models\User::findOrFail($validated['user_id']);
        } elseif (! empty($validated['nip'])) {
            $newManager = \App\Models\User::where('username', trim($validated['nip']))->first();
            if (! $newManager) {
                $emp = \App\Modules\Kepegawaian\Models\Employee::where('nip', trim($validated['nip']))->firstOrFail();
                $newManager = \App\Models\User::create([
                    'name' => $emp->nama_lengkap,
                    'username' => $emp->nip,
                    'email' => strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $emp->nip)) . '@bksda.local',
                    'password' => \Illuminate\Support\Facades\Hash::make('Bksda123!'),
                    'role' => 'user',
                ]);
            }
        }

        $folder->update(['user_id' => $newManager->id]);

        \App\Models\DriveShare::updateOrCreate(
            ['folder_id' => $folder->id, 'user_id' => $newManager->id],
            ['role' => 'manager', 'share_type' => 'internal', 'created_by' => $user->id]
        );

        return response()->json([
            'message' => "Pengguna {$newManager->name} berhasil ditunjuk sebagai Admin untuk folder {$folder->name}.",
            'folder' => $folder->fresh(),
        ]);
    }

    /**
     * Sanitasi nama berkas dan folder agar tahan terhadap Zip-Slip, OS Reserved Devices,
     * Path Traversal, Null Bytes, dan Unicode Directional Overrides (CWE-22, CWE-73).
     */
    protected function sanitizeFilesystemName(string $name, string $default = 'item'): string
    {
        // 1. Bersihkan null byte dan Unicode RTL / LTR overrides
        $name = str_replace(["\0", "\u{202E}", "\u{202D}", "\u{202C}", "\u{200E}", "\u{200F}"], '', $name);

        // 2. Cegah path traversal
        $name = preg_replace('/(\.\.[\/\\\\])+/', '', $name);

        // 3. Ganti karakter terlarang filesystem & kontrol dengan underscore
        $name = preg_replace('/[\x00-\x1F\x7F\/\\\\:*?"<>|]/', '_', $name);

        // 4. Trim spasi dan titik di awal/akhir
        $clean = trim($name, " .\t\n\r\0\x0B");

        // 5. Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
        if (preg_match('/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i', $clean)) {
            $clean = "safe_{$clean}";
        }

        return $clean !== '' ? $clean : $default;
    }
}
