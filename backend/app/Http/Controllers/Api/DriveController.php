<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriveFile;
use App\Models\DriveFolder;
use App\Models\DriveUnit;
use App\Models\DriveUpload;
use App\Support\Security\DriveAccess;
use App\Support\Security\UploadValidationRules;
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
        $targetFolder = $folderId ? DriveFolder::find($folderId) : null;
        if ($space !== 'my') {
            $unit = DriveUnit::findOrFail((int) $space);
            if (! DriveAccess::canRead($user, $unit)) {
                if (! ($targetFolder && (int) $targetFolder->unit_id === (int) $unit->id && DriveAccess::canReadFolder($user, $targetFolder))) {
                    return response()->json(['message' => 'Anda tidak memiliki akses ke Drive Unit ini.'], 403);
                }
            }
        }

        // Pengecekan akses ke folder spesifik (Anti-IDOR)
        if ($targetFolder && ! DriveAccess::canReadFolder($user, $targetFolder)) {
            return response()->json(['message' => 'Anda tidak memiliki akses ke folder ini.'], 403);
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
            $escapedSearch = addcslashes($search, '%_');
            $folderQuery->where('name', 'like', "%{$escapedSearch}%");
            $fileQuery->where('name', 'like', "%{$escapedSearch}%");
        }

        // Anti-Search Leak: saring hanya folder dan berkas yang berhak dibaca user
        $folders = $folderQuery->with([
                'unit:id,slug,name',
                'parent' => fn ($q) => $q->withTrashed()->select(['id', 'deleted_at']),
            ])
            ->orderBy('name')
            ->get()
            ->filter(function ($f) use ($user, $filter) {
                if ($filter !== 'trash' && $f->parent && $f->parent->trashed()) {
                    return false;
                }
                return DriveAccess::canReadFolder($user, $f);
            })
            ->map(function ($f) use ($user) {
                $f->setAttribute('can_write', DriveAccess::canWriteFolder($user, $f));
                return $f;
            })
            ->values();

        $files = $fileQuery->with([
                'folder' => fn ($q) => $q->withTrashed()->select(['id', 'unit_id', 'location_id', 'user_id', 'parent_id', 'is_restricted', 'folder_scope', 'resor_code', 'room_code', 'deleted_at']),
                'unit:id,slug,name',
            ])
            ->orderByDesc('created_at')
            ->get()
            ->filter(function ($f) use ($user, $filter) {
                if ($filter !== 'trash' && $f->folder && $f->folder->trashed()) {
                    return false;
                }
                return DriveAccess::canReadFile($user, $f);
            })
            ->map(function ($f) use ($user) {
                $f->setAttribute('can_write', DriveAccess::canWriteFile($user, $f));
                return $f;
            })
            ->values();

        // Breadcrumbs hierarchy (hanya sertakan ancestor yang boleh dibaca user + anti-loop)
        $breadcrumbs = [];
        if ($targetFolder && $filter === 'all') {
            $curr = $targetFolder;
            $visited = [];
            while ($curr && ! isset($visited[$curr->id]) && DriveAccess::canReadFolder($user, $curr)) {
                $visited[$curr->id] = true;
                array_unshift($breadcrumbs, ['id' => $curr->id, 'name' => $curr->name]);
                $curr = $curr->parent_id ? DriveFolder::find($curr->parent_id) : null;
            }
        }

        // Hitung kuota (sembunyikan kuota unit jika user hanya mengakses subfolder berbagi tanpa keanggotaan unit)
        if ($unit && ! DriveAccess::canRead($user, $unit)) {
            $usedBytes = 0;
            $quotaBytes = 0;
        } else {
            [$usedBytes, , $quotaBytes] = $this->resolveQuotaState($unit?->id, (int) $user->id);
        }
        $userRole = $unit ? DriveAccess::unitRole($user, $unit) : 'manager';

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
            'units' => $allUnits,
            'can_write' => $filter === 'shared_with_me' ? false : ($unit ? DriveAccess::canWrite($user, $unit) : true),
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

        $unitId = $parentFolder ? $parentFolder->unit_id : ($validated['unit_id'] ?? null);

        // Warisi restriksi subfolder dari parent folder (Subfolder Inheritance)
        $isRestricted = $parentFolder ? (bool) $parentFolder->is_restricted : false;
        $folderScope = $parentFolder?->folder_scope ?: 'general';
        $locationId = $parentFolder?->location_id;
        $resorCode = $parentFolder?->resor_code;
        $roomCode = $parentFolder?->room_code;

        $cleanName = $this->sanitizeFilesystemName($validated['name'], 'folder');

        $folder = DriveFolder::create([
            'unit_id' => $unitId,
            'location_id' => $locationId,
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
     * Resolve folder/file and enforce write permission (Anti-BOLA / CWE-639).
     */
    private function resolveWritableItem(?\App\Models\User $user, string $type, int $id, bool $trashed = false): DriveFolder|DriveFile|JsonResponse
    {
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($type === 'folder') {
            $folder = ($trashed ? DriveFolder::onlyTrashed() : DriveFolder::query())->findOrFail($id);
            return DriveAccess::canWriteFolder($user, $folder)
                ? $folder
                : response()->json(['message' => 'Unauthorized'], 403);
        }

        $file = ($trashed ? DriveFile::onlyTrashed() : DriveFile::query())->findOrFail($id);
        return DriveAccess::canWriteFile($user, $file)
            ? $file
            : response()->json(['message' => 'Unauthorized'], 403);
    }

    /**
     * PUT /api/drive/{type}/{id}/rename
     */
    public function rename(Request $request, string $type, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $model = $this->resolveWritableItem($request->user(), $type, $id);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $cleanName = $this->sanitizeFilesystemName($validated['name'], $type === 'folder' ? 'folder' : 'file');
        $model->update(['name' => $cleanName]);

        return response()->json(['message' => 'Nama berhasil diperbarui.', 'item' => $model]);
    }

    /**
     * PUT /api/drive/{type}/{id}/star
     */
    public function toggleStar(Request $request, string $type, int $id): JsonResponse
    {
        $model = $this->resolveWritableItem($request->user(), $type, $id);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        $model->update(['is_starred' => ! $model->is_starred]);

        return response()->json(['message' => 'Status bintang diperbarui.', 'is_starred' => $model->is_starred]);
    }

    /**
     * DELETE /api/drive/{type}/{id} (Soft Delete to Trash)
     */
    public function trash(Request $request, string $type, int $id): JsonResponse
    {
        $model = $this->resolveWritableItem($request->user(), $type, $id);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        DB::transaction(function () use ($model) {
            if ($model instanceof DriveFolder) {
                $allFolderIds = array_merge([$model->id], $this->collectDescendantFolderIds($model->id));
                DriveFile::whereIn('folder_id', $allFolderIds)->delete();
                DriveFolder::whereIn('id', $allFolderIds)->delete();
            } else {
                $model->delete();
            }
        });

        return response()->json(['message' => 'Item berhasil dipindahkan ke sampah.']);
    }

    /**
     * POST /api/drive/{type}/{id}/restore
     */
    public function restore(Request $request, string $type, int $id): JsonResponse
    {
        $model = $this->resolveWritableItem($request->user(), $type, $id, trashed: true);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        if ($model instanceof DriveFile && $model->folder_id) {
            $parent = DriveFolder::withTrashed()->find($model->folder_id);
            if ($parent && $parent->trashed() && $parent->is_restricted) {
                return response()->json([
                    'message' => 'Folder induk terbatas sedang berada di Sampah. Pulihkan folder induknya terlebih dahulu.',
                ], 422);
            }
        }

        DB::transaction(function () use ($model) {
            if ($model instanceof DriveFolder) {
                if ($model->parent_id) {
                    $parent = DriveFolder::withTrashed()->find($model->parent_id);
                    if (! $parent || $parent->trashed()) {
                        $model->parent_id = null;
                        $model->save();
                    }
                }
                $allFolderIds = array_merge([$model->id], $this->collectDescendantFolderIds($model->id, withTrashed: true));
                DriveFolder::withTrashed()->whereIn('id', $allFolderIds)->restore();
                DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->restore();
            } else {
                if ($model->folder_id) {
                    $parent = DriveFolder::withTrashed()->find($model->folder_id);
                    if (! $parent || $parent->trashed()) {
                        $model->folder_id = null;
                        $model->save();
                    }
                }
                $model->restore();
            }
        });

        return response()->json(['message' => 'Item berhasil dipulihkan.']);
    }

    /**
     * DELETE /api/drive/{type}/{id}/force (Permanent Deletion)
     */
    public function forceDelete(Request $request, string $type, int $id): JsonResponse
    {
        $model = $this->resolveWritableItem($request->user(), $type, $id, trashed: true);
        if ($model instanceof JsonResponse) {
            return $model;
        }

        DB::transaction(function () use ($model) {
            if ($model instanceof DriveFolder) {
                $allFolderIds = array_merge([$model->id], $this->collectDescendantFolderIds($model->id, withTrashed: true));
                $files = DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->get();
                foreach ($files as $file) {
                    try {
                        Storage::disk('drive')->delete($file->s3_key);
                    } catch (\Throwable $e) {
                        // Non-blocking storage error
                    }
                }
                DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->forceDelete();
                \App\Models\DriveShare::whereIn('folder_id', $allFolderIds)->delete();
                DriveFolder::withTrashed()->whereIn('id', $allFolderIds)->forceDelete();
            } else {
                try {
                    Storage::disk('drive')->delete($model->s3_key);
                } catch (\Throwable $e) {
                    // Non-blocking storage error
                }
                $model->forceDelete();
            }
        });

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

        $unitId = $targetFolder ? $targetFolder->unit_id : ($validated['unit_id'] ?? null);
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
        $isMultipart = ! empty($validated['is_multipart']) || $size > (50 * 1024 * 1024); // > 50MB auto multipart
        $expiresAt = now()->addHours(2);

        $quotaError = null;
        $createdUpload = null;

        DB::transaction(function () use ($unit, $user, $size, $validated, $cleanFilename, $uploadId, $s3Key, $expiresAt, &$quotaError, &$createdUpload) {
            [$used, $reserved, $limit] = $this->resolveQuotaState($unit?->id, (int) $user->id, lockForUpdate: true);
            if ($used + $reserved + $size > $limit) {
                $quotaError = $unit
                    ? 'Kapasitas penyimpanan Drive Unit tidak mencukupi.'
                    : 'Kapasitas penyimpanan Drive Anda telah penuh.';
                return;
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

        $user = $request->user();

        $claimError = null;
        $upload = null;

        DB::transaction(function () use ($validated, $user, &$claimError, &$upload) {
            $locked = DriveUpload::where('id', $validated['upload_id'])->lockForUpdate()->first();
            if (! $locked) {
                $claimError = ['message' => 'Sesi upload tidak ditemukan.', 'code' => 404];
                return;
            }
            if ($user && (int) $locked->user_id !== (int) $user->id && ! DriveAccess::isDriveAdmin($user)) {
                $claimError = ['message' => 'Anda tidak memiliki otorisasi untuk menyelesaikan upload ini.', 'code' => 403];
                return;
            }
            if ($locked->status !== 'initiated') {
                $claimError = ['message' => 'Sesi upload sudah diproses atau dibatalkan.', 'code' => 409];
                return;
            }
            if ($locked->expires_at && $locked->expires_at->isPast()) {
                $locked->update(['status' => 'aborted']);
                $claimError = ['message' => 'Sesi upload telah kedaluwarsa.', 'code' => 410];
                return;
            }
            $locked->update(['status' => 'completing']);
            $upload = $locked;
        });

        if ($claimError !== null) {
            return response()->json(['message' => $claimError['message']], $claimError['code']);
        }

        // Cek apakah target folder/unit masih valid & user masih berhak menulis (anti-orphaned & TOCTOU RBAC)
        if ($upload->folder_id) {
            $targetFolder = DriveFolder::find($upload->folder_id);
            if (! $targetFolder) {
                $this->cleanupFailedUpload($upload);
                return response()->json(['message' => 'Folder tujuan telah dihapus sebelum upload selesai.'], 404);
            }
            if ($user && ! DriveAccess::canWriteFolder($user, $targetFolder)) {
                $this->cleanupFailedUpload($upload);
                return response()->json(['message' => 'Anda tidak lagi memiliki hak menulis di folder tujuan.'], 403);
            }
        } elseif ($upload->unit_id) {
            $targetUnit = DriveUnit::find($upload->unit_id);
            if (! $targetUnit || ($user && ! DriveAccess::canWrite($user, $targetUnit))) {
                $this->cleanupFailedUpload($upload);
                return response()->json(['message' => 'Anda tidak lagi memiliki hak menulis di Drive Unit tujuan.'], 403);
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
                $this->cleanupFailedUpload($upload);
                return response()->json([
                    'message' => config('app.debug')
                        ? 'Gagal menyelesaikan multipart upload: ' . $e->getMessage()
                        : 'Gagal menyelesaikan multipart upload.',
                ], 500);
            }
        }

        // Verifikasi wajib objek benar-benar ada di storage (anti-ghost file) & cek ukuran aktual (anti-quota bypass)
        if (! Storage::disk('drive')->exists($upload->s3_key)) {
            $upload->update(['status' => 'aborted']);
            return response()->json(['message' => 'Berkas belum ditemukan di storage. Silakan ulangi upload.'], 422);
        }

        $actualSize = (int) Storage::disk('drive')->size($upload->s3_key);
        if ($actualSize <= 0) {
            $this->cleanupFailedUpload($upload);
            return response()->json(['message' => 'Ukuran berkas di storage tidak valid.'], 422);
        }

        // Magic bytes + allowlist MIME/extension validation (cegah active content/HTML/SVG/executable menyamar)
        $detectedMime = 'application/octet-stream';
        try {
            $stream = Storage::disk('drive')->readStream($upload->s3_key);
            if ($stream) {
                $headerBytes = fread($stream, 4096);
                fclose($stream);
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $detectedMime = finfo_buffer($finfo, $headerBytes) ?: 'application/octet-stream';
                finfo_close($finfo);
            }
        } catch (\Throwable $e) {
            // Fallback extension detection
        }

        $blockedExts = ['html', 'htm', 'xhtml', 'svg', 'svgz', 'xml', 'php', 'phtml', 'phar', 'exe', 'msi', 'bat', 'cmd', 'ps1', 'vbs', 'sh', 'js', 'mjs'];
        $allowedMimes = [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'image/bmp',
            'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 'application/vnd.rar', 'application/x-7z-compressed', 'application/gzip',
            'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet', 'application/vnd.oasis.opendocument.presentation',
            'text/plain', 'text/csv', 'application/csv', 'application/json', 'application/rtf',
            'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska',
            'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm',
            'application/octet-stream', 'application/cdfv2',
        ];
        $ext = strtolower(pathinfo((string) $upload->filename, PATHINFO_EXTENSION));
        if (in_array($ext, $blockedExts, true) || ! in_array(strtolower($detectedMime), $allowedMimes, true)) {
            $this->cleanupFailedUpload($upload);
            return response()->json(['message' => 'Berkas mengandung tipe konten berbahaya dan ditolak sistem.'], 422);
        }

        // Final atomic quota check + record creation under row lock (anti-TOCTOU size spoof)
        $file = null;
        $quotaExceeded = false;
        DB::transaction(function () use ($upload, $actualSize, $detectedMime, &$file, &$quotaExceeded) {
            if ($this->exceedsQuota($upload->unit_id, (int) $upload->user_id, $actualSize, $upload->id, lockForUpdate: true)) {
                $quotaExceeded = true;
                return;
            }

            $file = DriveFile::create([
                'unit_id' => $upload->unit_id,
                'user_id' => $upload->user_id,
                'folder_id' => $upload->folder_id,
                'name' => $upload->filename,
                's3_key' => $upload->s3_key,
                'size_bytes' => $actualSize,
                'mime_type' => $detectedMime,
            ]);

            $upload->update(['status' => 'completed']);
        });

        if ($quotaExceeded) {
            $this->cleanupFailedUpload($upload);
            return response()->json(['message' => 'Ukuran berkas melebihi sisa kuota penyimpanan.'], 422);
        }

        return response()->json([
            'message' => 'Berkas berhasil diunggah.',
            'file' => $file,
        ], 201);
    }

    private function cleanupFailedUpload(DriveUpload $upload): void
    {
        if ($upload->upload_id) {
            try {
                Storage::disk('drive')->getClient()->abortMultipartUpload([
                    'Bucket' => config('filesystems.disks.drive.bucket', 'bksda-drive'),
                    'Key' => $upload->s3_key,
                    'UploadId' => $upload->upload_id,
                ]);
            } catch (\Throwable $e) {
                // Best-effort abort
            }
        }
        try {
            Storage::disk('drive')->delete($upload->s3_key);
        } catch (\Throwable $e) {
            // Best-effort cleanup
        }
        $upload->update(['status' => 'aborted']);
    }

    /**
     * POST /api/drive/upload/{id}/abort
     * Membatalkan sesi upload yang gagal agar kuota reservasi langsung bebas.
     */
    public function abortUpload(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $upload = DriveUpload::findOrFail($id);

        if ((int) $upload->user_id !== (int) $user->id && ! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        if (in_array($upload->status, ['initiated', 'completing'], true)) {
            $this->cleanupFailedUpload($upload);
        }

        return response()->json(['message' => 'Sesi upload dibatalkan.']);
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
            'image/gif',
            'application/pdf',
            'video/mp4',
        ];

        $isInline = in_array(strtolower($file->mime_type), $safeInlineMimes, true)
            && $request->query('download') !== '1';

        $safeFilename = preg_replace('/[\x00-\x1F\x7F"\\\\]/', '_', (string) $file->name);
        $disposition = $isInline
            ? "inline; filename=\"{$safeFilename}\""
            : "attachment; filename=\"{$safeFilename}\"";

        try {
            $signerClient = Storage::disk('drive_signer')->getClient();
            $cmd = $signerClient->getCommand('GetObject', [
                'Bucket' => config('filesystems.disks.drive_signer.bucket', 'bksda-drive'),
                'Key' => $file->s3_key,
                'ResponseContentDisposition' => $disposition,
                'ResponseContentType' => $file->mime_type ?: 'application/octet-stream',
            ]);
            $req = $signerClient->createPresignedRequest($cmd, '+60 minutes');
            $url = (string) $req->getUri();
        } catch (\Throwable $e) {
            // Fallback to storage URL
            $url = Storage::disk('drive_signer')->temporaryUrl($file->s3_key, now()->addMinutes(60), [
                'ResponseContentDisposition' => $disposition,
                'ResponseContentType' => $file->mime_type ?: 'application/octet-stream',
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
        $user = $userId !== null
            ? \App\Models\User::find($userId)
            : ($request->user() ?: ($folder->unit_id === null ? \App\Models\User::find($folder->user_id) : null));

        if (! $user || ! $user->is_active || ! empty($user->must_change_password)
            || ($user->employee && ! $user->employee->isEffectiveActive())
            || ! DriveAccess::canReadFolder($user, $folder)) {
            abort(403, 'Anda tidak memiliki hak untuk mengunduh arsip ZIP folder ini.');
        }

        $cleanFolderName = preg_replace('/[^\w\-]/', '_', $folder->name) ?: 'folder';
        $zipFilename = "{$cleanFolderName}.zip";

        return response()->streamDownload(function () use ($folder, $user) {
            $out = fopen('php://output', 'wb');
            try {
                $zip = new \ZipStream\ZipStream(
                    outputStream: $out,
                    sendHttpHeaders: false
                );

                $state = ['files' => 0, 'bytes' => 0, 'visited' => []];
                $this->addFolderToZipStream($zip, $folder, '', $user, 0, $state);

                $zip->finish();
            } finally {
                if (is_resource($out)) {
                    fclose($out);
                }
            }
        }, $zipFilename, [
            'Content-Type' => 'application/zip',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
        ]);
    }

    /**
     * Rekursif menambahkan berkas dan subfolder ke ZipStream dengan proteksi anti Zip-Slip (CWE-22), cycle guard, dan batas DoS.
     */
    protected function addFolderToZipStream(
        \ZipStream\ZipStream $zip,
        DriveFolder $folder,
        string $basePath,
        \App\Models\User $user,
        int $depth = 0,
        array &$state = ['files' => 0, 'bytes' => 0, 'visited' => []]
    ): void {
        if ($depth > 20 || isset($state['visited'][$folder->id])) {
            return;
        }
        $state['visited'][$folder->id] = true;

        $maxFiles = 500;
        $maxBytes = 500 * 1024 * 1024;

        // Ambil semua berkas di folder ini
        $files = DriveFile::where('folder_id', $folder->id)->whereNull('deleted_at')->get();
        foreach ($files as $file) {
            if (! DriveAccess::canReadFile($user, $file)) {
                continue;
            }
            if ($state['files'] >= $maxFiles || ($state['bytes'] + (int) $file->size_bytes) > $maxBytes) {
                return;
            }

            // Anti-Zip-Slip (CWE-22): Sanitasi nama berkas, cegah path traversal & RTL overrides
            $cleanName = $this->sanitizeFilesystemName((string) $file->name, "file_{$file->id}");
            $safePath = ltrim(($basePath !== '' ? "{$basePath}/" : '') . $cleanName, '/');

            try {
                if (Storage::disk('drive')->exists($file->s3_key)) {
                    $stream = Storage::disk('drive')->readStream($file->s3_key);
                    if ($stream) {
                        $zip->addFileFromStream(fileName: $safePath, stream: $stream);
                        $state['files']++;
                        $state['bytes'] += (int) $file->size_bytes;
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
            if (! DriveAccess::canReadFolder($user, $sub) || $state['files'] >= $maxFiles) {
                continue;
            }

            $subClean = $this->sanitizeFilesystemName((string) $sub->name, "folder_{$sub->id}");
            $subPath = ltrim(($basePath !== '' ? "{$basePath}/" : '') . $subClean, '/');
            $this->addFolderToZipStream($zip, $sub, $subPath, $user, $depth + 1, $state);
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

        $destFolder = null;
        $targetFolderId = null;
        $targetUnitId = null;
        $targetUserId = $file->user_id;

        if ($destFolderId) {
            $destFolder = DriveFolder::findOrFail($destFolderId);
            if (! DriveAccess::canWriteFolder($user, $destFolder)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di folder tujuan.'], 403);
            }
            $targetFolderId = $destFolder->id;
            $targetUnitId = $destFolder->unit_id;
            if ($targetUnitId === null) {
                $targetUserId = $destFolder->user_id;
            }
        } elseif ($destUnitId) {
            $destUnit = DriveUnit::findOrFail($destUnitId);
            if (! DriveAccess::canWrite($user, $destUnit)) {
                return response()->json(['message' => 'Anda tidak memiliki hak menulis di unit tujuan.'], 403);
            }
            $targetUnitId = $destUnit->id;
        } else {
            // Pindah ke root drive pribadi milik user yang memindahkan
            $targetUserId = $user->id;
        }

        $changingSpace = ((int) ($file->unit_id ?? 0) !== (int) ($targetUnitId ?? 0))
            || ($targetUnitId === null && (int) $file->user_id !== (int) $targetUserId);
        $sourceFolder = $file->folder_id ? DriveFolder::find($file->folder_id) : null;
        if ($sourceFolder && $sourceFolder->is_restricted && ! ($destFolder && $destFolder->is_restricted)) {
            if ((int) $file->user_id !== (int) $user->id && ! DriveAccess::isDriveAdmin($user)) {
                return response()->json(['message' => 'Hanya pemilik atau Admin Drive yang dapat memindahkan berkas dari folder terbatas ke folder umum.'], 403);
            }
        }

        if (($changingSpace || ($file->unit_id !== null && $targetUnitId === null) || (int) $file->user_id !== (int) $targetUserId)
            && (int) $file->user_id !== (int) $user->id && ! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Hanya pemilik atau Admin Drive yang dapat memindahkan berkas antar ruang penyimpanan.'], 403);
        }

        $quotaExceeded = false;
        DB::transaction(function () use ($file, $changingSpace, $targetFolderId, $targetUnitId, $targetUserId, &$quotaExceeded) {
            if ($changingSpace && $this->exceedsQuota($targetUnitId, (int) $targetUserId, (int) $file->size_bytes, lockForUpdate: true)) {
                $quotaExceeded = true;
                return;
            }

            $file->update([
                'folder_id' => $targetFolderId,
                'unit_id' => $targetUnitId,
                'user_id' => $targetUserId,
            ]);
        });

        if ($quotaExceeded) {
            return response()->json(['message' => 'Kapasitas penyimpanan ruang tujuan tidak mencukupi.'], 422);
        }

        return response()->json([
            'message' => 'Berkas berhasil dipindahkan.',
            'file' => $file->fresh(),
        ]);
    }

    /**
     * POST /api/drive/folders/{id}/move
     * Memindahkan folder dengan proteksi loop sirkular (CWE-674) serta konsistensi unit_id & kuota.
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
            'destination_unit_id' => ['nullable', 'integer', 'exists:drive_units,id'],
        ]);

        $destParentId = $validated['destination_parent_id'] ?? null;
        $destParent = null;
        $targetUnitId = $folder->unit_id;
        $targetParentId = null;

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
            $visited = [];
            while ($curr && ! isset($visited[$curr->id])) {
                $visited[$curr->id] = true;
                if ((int) $curr->id === (int) $folder->id) {
                    return response()->json([
                        'message' => 'Folder tidak dapat dipindahkan ke dalam subfoldernya sendiri.',
                    ], 422);
                }
                $curr = $curr->parent_id ? DriveFolder::find($curr->parent_id) : null;
            }

            $targetParentId = $destParent->id;
            $targetUnitId = $destParent->unit_id;
        } elseif (array_key_exists('destination_unit_id', $validated)) {
            $destUnitId = $validated['destination_unit_id'];
            if ($destUnitId) {
                $destUnit = DriveUnit::findOrFail($destUnitId);
                if (! DriveAccess::canWrite($user, $destUnit)) {
                    return response()->json(['message' => 'Anda tidak memiliki hak menulis di unit tujuan.'], 403);
                }
                $targetUnitId = $destUnit->id;
            } else {
                $targetUnitId = null;
            }
        }

        if ($folder->location_id !== null && $folder->parent_id === null && ! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Folder induk resmi unit/ruangan/resor hanya dapat dipindahkan melalui Master Lokasi atau Admin Drive.'], 403);
        }

        $allFolderIds = array_merge([$folder->id], $this->collectDescendantFolderIds($folder->id, withTrashed: true));
        $changingUnit = (int) ($folder->unit_id ?? 0) !== (int) ($targetUnitId ?? 0);

        if (($changingUnit || ($folder->unit_id !== null && $targetUnitId === null))
            && (int) $folder->user_id !== (int) $user->id && ! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Hanya pemilik atau Admin Drive yang dapat memindahkan folder antar ruang atau unit.'], 403);
        }

        $hasRestrictedInTree = DriveFolder::withTrashed()
            ->whereIn('id', $allFolderIds)
            ->where(fn ($q) => $q->where('is_restricted', true)->orWhereNotNull('location_id'))
            ->exists();

        if (($changingUnit || ! $destParent || ! $destParent->is_restricted) && $hasRestrictedInTree && ! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Hanya Admin Drive yang dapat memindahkan folder terbatas atau turunannya ke luar hierarki terbatas.'], 403);
        }

        $targetUserId = ($targetUnitId === null && $folder->unit_id !== null)
            ? (int) ($destParent?->user_id ?? $user->id)
            : (int) $folder->user_id;

        $treeBytes = $changingUnit
            ? (int) DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->sum('size_bytes')
            : 0;

        $inheritedAttrs = $destParent ? [
            'unit_id' => $targetUnitId,
            'location_id' => $destParent->location_id,
            'folder_scope' => $destParent->folder_scope ?: 'general',
            'resor_code' => $destParent->resor_code,
            'room_code' => $destParent->room_code,
        ] : [
            'unit_id' => $targetUnitId,
            'location_id' => null,
            'folder_scope' => 'general',
            'resor_code' => null,
            'room_code' => null,
        ];

        $quotaExceeded = false;
        DB::transaction(function () use ($folder, $destParent, $targetParentId, $targetUnitId, $targetUserId, $allFolderIds, $changingUnit, $treeBytes, $inheritedAttrs, &$quotaExceeded) {
            if ($changingUnit && $treeBytes > 0 && $this->exceedsQuota($targetUnitId, $targetUserId, $treeBytes, lockForUpdate: true)) {
                $quotaExceeded = true;
                return;
            }

            $folderUpdates = array_merge($inheritedAttrs, [
                'parent_id' => $targetParentId,
            ]);
            if ($destParent && $destParent->is_restricted) {
                $folderUpdates['is_restricted'] = true;
            }
            if ($changingUnit && $targetUnitId === null) {
                $folderUpdates['user_id'] = $targetUserId;
            }
            $folder->update($folderUpdates);

            $descendantUpdates = ['unit_id' => $targetUnitId];
            if ($destParent && $destParent->is_restricted) {
                $descendantUpdates['is_restricted'] = true;
            }
            if ($changingUnit && $targetUnitId === null) {
                $descendantUpdates['user_id'] = $targetUserId;
            }
            // Jangan menimpa is_restricted / location_id milik subfolder terisolasi yang sudah ada.
            DriveFolder::withTrashed()->whereIn('id', $allFolderIds)
                ->where('id', '!=', $folder->id)
                ->update($descendantUpdates);

            if ($changingUnit) {
                $fileUpdates = ['unit_id' => $targetUnitId];
                if ($targetUnitId === null) {
                    $fileUpdates['user_id'] = $targetUserId;
                }
                DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->update($fileUpdates);
            }
        });

        if ($quotaExceeded) {
            return response()->json(['message' => 'Kapasitas penyimpanan ruang tujuan tidak mencukupi.'], 422);
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
                    'password' => \Illuminate\Support\Facades\Hash::make(Str::random(64)),
                    'role' => 'user',
                    'is_active' => false,
                    'must_change_password' => true,
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
     * Sanitasi nama berkas dan folder (CWE-22, CWE-73) melalui helper terpusat.
     */
    protected function sanitizeFilesystemName(string $name, string $default = 'item'): string
    {
        return UploadValidationRules::sanitizeFilename($name, $default);
    }

    /**
     * POST /api/drive/{type}/{id}/transfer-ownership
     * Memindahkan kepemilikan (user_id) berkas atau folder beserta seluruh turunannya.
     */
    public function transferOwnership(Request $request, string $type, int $id): JsonResponse
    {
        $user = $request->user();
        $model = $type === 'folder' ? DriveFolder::findOrFail($id) : DriveFile::findOrFail($id);

        if ((int) $model->user_id !== (int) $user->id && ! DriveAccess::isDriveAdmin($user)) {
            return response()->json(['message' => 'Hanya pemilik atau Admin Drive yang dapat mengalihkan kepemilikan.'], 403);
        }

        $validated = $request->validate([
            'target_user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $targetUser = \App\Models\User::where('is_active', true)->findOrFail($validated['target_user_id']);
        if ((int) $targetUser->id === (int) $model->user_id) {
            return response()->json(['message' => 'Pengguna tujuan sudah menjadi pemilik item ini.'], 422);
        }

        if ($model instanceof DriveFolder) {
            $allFolderIds = array_merge([$model->id], $this->collectDescendantFolderIds($model->id, withTrashed: true));
            $quotaExceeded = false;
            DB::transaction(function () use ($model, $allFolderIds, $targetUser, &$quotaExceeded) {
                if ($model->unit_id === null) {
                    $treeBytes = (int) DriveFile::withTrashed()
                        ->whereIn('folder_id', $allFolderIds)
                        ->whereNull('unit_id')
                        ->sum('size_bytes');
                    if ($treeBytes > 0 && $this->exceedsQuota(null, (int) $targetUser->id, $treeBytes, lockForUpdate: true)) {
                        $quotaExceeded = true;
                        return;
                    }
                }
                DriveFolder::withTrashed()->whereIn('id', $allFolderIds)->update(['user_id' => $targetUser->id]);
                DriveFile::withTrashed()->whereIn('folder_id', $allFolderIds)->update(['user_id' => $targetUser->id]);
            });
            if ($quotaExceeded) {
                return response()->json(['message' => 'Kuota Drive pribadi pengguna tujuan tidak mencukupi.'], 422);
            }
        } else {
            $quotaExceeded = false;
            DB::transaction(function () use ($model, $targetUser, &$quotaExceeded) {
                if ($model->unit_id === null && $this->exceedsQuota(null, (int) $targetUser->id, (int) $model->size_bytes, lockForUpdate: true)) {
                    $quotaExceeded = true;
                    return;
                }
                $model->update(['user_id' => $targetUser->id]);
            });
            if ($quotaExceeded) {
                return response()->json(['message' => 'Kuota Drive pribadi pengguna tujuan tidak mencukupi.'], 422);
            }
        }

        return response()->json([
            'message' => "Kepemilikan berhasil dialihkan ke {$targetUser->name}.",
            'item' => $model->fresh(),
        ]);
    }

    /**
     * Hitung [usedBytes, reservedBytes, quotaBytes] untuk Unit atau Drive Pribadi secara seragam.
     *
     * @return array{0: int, 1: int, 2: int}
     */
    protected function resolveQuotaState(?int $unitId, int $userId, ?string $excludeUploadId = null, bool $lockForUpdate = false): array
    {
        $reservedQuery = DriveUpload::whereIn('status', ['initiated', 'completing'])
            ->where('expires_at', '>', now());
        if ($excludeUploadId) {
            $reservedQuery->where('id', '!=', $excludeUploadId);
        }

        if ($unitId) {
            $query = DriveUnit::where('id', $unitId);
            if ($lockForUpdate) {
                $query->lockForUpdate();
            }
            $unit = $query->first();
            if (! $unit) {
                return [0, 0, -1];
            }
            $used = $unit->usedStorageBytes();
            $reserved = (int) $reservedQuery->where('unit_id', $unitId)->sum('total_size_bytes');
            return [$used, $reserved, (int) $unit->storage_quota_bytes];
        }

        $userQuery = \App\Models\User::where('id', $userId);
        if ($lockForUpdate) {
            $userQuery->lockForUpdate();
        }
        $targetUser = $userQuery->first();
        $quota = (int) ($targetUser?->drive_quota_bytes ?: 5368709120);
        $used = (int) DriveFile::withTrashed()
            ->where('user_id', $userId)
            ->whereNull('unit_id')
            ->sum('size_bytes');
        $reserved = (int) $reservedQuery->where('user_id', $userId)->whereNull('unit_id')->sum('total_size_bytes');

        return [$used, $reserved, $quota];
    }

    protected function exceedsQuota(?int $unitId, int $userId, int $bytesToAdd, ?string $excludeUploadId = null, bool $lockForUpdate = false): bool
    {
        [$used, $reserved, $quota] = $this->resolveQuotaState($unitId, $userId, $excludeUploadId, $lockForUpdate);
        if ($quota < 0) {
            return true;
        }
        return ($used + $reserved + $bytesToAdd) > $quota;
    }

    /**
     * Kumpulkan seluruh ID subfolder turunan secara iteratif (BFS) untuk operasi rekursif yang aman.
     *
     * @return array<int>
     */
    protected function collectDescendantFolderIds(int $rootId, bool $withTrashed = false): array
    {
        return DriveFolder::collectDescendantIds($rootId, $withTrashed);
    }
}
