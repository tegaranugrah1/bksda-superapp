<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriveFile;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Support\Security\DriveAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DriveShareController extends Controller
{
    /**
     * Internal/Public: Create a new share for a file.
     */
    public function createShare(Request $request, int $fileId): JsonResponse
    {
        $user = $request->user();
        $file = DriveFile::findOrFail($fileId);

        // Security check: Must have write/management permission on this file
        if (!DriveAccess::canWriteFile($user, $file)) {
            return response()->json(['message' => 'Anda tidak memiliki izin membagikan berkas ini.'], 403);
        }

        $validated = $request->validate([
            'share_type' => 'required|in:internal,public',
            'target_type' => 'required_if:share_type,internal|in:user,unit',
            'target_id' => 'required_if:share_type,internal|integer',
            'role' => 'nullable|in:viewer,editor',
            'password' => 'nullable|string|min:4',
            'expires_in_days' => 'nullable|integer|min:1|max:365',
        ]);

        if ($validated['share_type'] === 'public') {
            if (!config('filesystems.drive_public_share_enabled', env('DRIVE_PUBLIC_SHARE', true))) {
                return response()->json(['message' => 'Fitur berbagi link publik saat ini dinonaktifkan oleh kebijakan keamanan kantor.'], 403);
            }

            // Cryptographically secure 32-character token
            $token = bin2hex(random_bytes(16));
            $expiresAt = !empty($validated['expires_in_days']) ? now()->addDays((int) $validated['expires_in_days']) : null;
            $passwordHash = !empty($validated['password']) ? Hash::make($validated['password']) : null;

            $share = DriveShare::create([
                'file_id' => $file->id,
                'share_type' => 'public',
                'role' => 'viewer',
                'token' => $token,
                'password_hash' => $passwordHash,
                'expires_at' => $expiresAt,
                'created_by' => $user->id,
            ]);

            $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://bksdakaltim.web.id')), '/');

            return response()->json([
                'message' => 'Tautan publik berhasil dibuat.',
                'share' => $share,
                'public_url' => "{$frontendUrl}/drive/s/{$token}",
            ], 201);
        }

        // Internal Share
        $targetUserId = null;
        $targetUnitId = null;

        if ($validated['target_type'] === 'user') {
            User::where('is_active', true)->findOrFail($validated['target_id']);
            $targetUserId = $validated['target_id'];
        } else {
            DriveUnit::findOrFail($validated['target_id']);
            $targetUnitId = $validated['target_id'];
        }

        // Prevent duplicate share to same target
        $share = DriveShare::updateOrCreate(
            [
                'file_id' => $file->id,
                'share_type' => 'internal',
                'user_id' => $targetUserId,
                'unit_id' => $targetUnitId,
            ],
            [
                'role' => $validated['role'] ?? 'viewer',
                'created_by' => $user->id,
            ]
        );

        return response()->json([
            'message' => 'Berkas berhasil dibagikan.',
            'share' => $share->load(['user:id,name,email', 'unit:id,name']),
        ], 201);
    }

    /**
     * List all shares for a file.
     */
    public function listShares(Request $request, int $fileId): JsonResponse
    {
        $user = $request->user();
        $file = DriveFile::findOrFail($fileId);

        if (!DriveAccess::canWriteFile($user, $file)) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $shares = DriveShare::where('file_id', $file->id)
            ->with(['user:id,name,email', 'unit:id,name', 'creator:id,name'])
            ->latest()
            ->get();

        $frontendUrl = rtrim(config('app.frontend_url', env('FRONTEND_URL', 'https://bksdakaltim.web.id')), '/');

        $data = $shares->map(function ($s) use ($frontendUrl) {
            $arr = $s->toArray();
            $arr['has_password'] = $s->hasPassword();
            $arr['is_expired'] = $s->isExpired();
            if ($s->share_type === 'public' && $s->token) {
                $arr['public_url'] = "{$frontendUrl}/drive/s/{$s->token}";
            }
            return $arr;
        });

        return response()->json(['shares' => $data]);
    }

    /**
     * Revoke / delete a share.
     */
    public function deleteShare(Request $request, int $shareId): JsonResponse
    {
        $user = $request->user();
        $share = DriveShare::with(['file' => fn ($q) => $q->withTrashed()])->findOrFail($shareId);

        if ($share->created_by !== $user->id && (!$share->file || !DriveAccess::canWriteFile($user, $share->file))) {
            return response()->json(['message' => 'Anda tidak memiliki izin mencabut akses berbagi ini.'], 403);
        }

        $share->delete();

        return response()->json(['message' => 'Akses berbagi berhasil dicabut.']);
    }

    /**
     * Public Link Info (no authentication required).
     */
    public function getPublicShareInfo(string $token): JsonResponse
    {
        $share = $this->resolveActivePublicShare($token);
        if ($share instanceof JsonResponse) {
            return $share;
        }

        return response()->json([
            'token' => $token,
            'file_name' => $share->file->name,
            'size_bytes' => $share->file->size_bytes,
            'mime_type' => $share->file->mime_type,
            'requires_password' => $share->hasPassword(),
            'expires_at' => $share->expires_at?->toISOString(),
            'created_at' => $share->created_at->toISOString(),
        ])->header('X-Robots-Tag', 'noindex, nofollow');
    }

    /**
     * Access / Download Public File with optional password verification.
     */
    public function downloadPublicShare(Request $request, string $token): JsonResponse
    {
        $share = $this->resolveActivePublicShare($token);
        if ($share instanceof JsonResponse) {
            return $share;
        }

        if ($share->hasPassword()) {
            $request->validate([
                'password' => 'required|string',
            ], [
                'password.required' => 'Dokumen ini dilindungi sandi. Harap masukkan kata sandi.',
            ]);

            if (!$share->verifyPassword($request->password)) {
                return response()->json(['message' => 'Kata sandi yang Anda masukkan salah.'], 401)
                    ->header('X-Robots-Tag', 'noindex, nofollow');
            }
        }

        // Increment download count
        $share->increment('download_count');

        $file = $share->file;
        $signerDisk = Storage::disk('drive_signer');
        $safeFilename = preg_replace('/[\x00-\x1F\x7F"\\\\]/', '_', (string) $file->name);

        // Security: safe content disposition attachment
        $downloadUrl = $signerDisk->temporaryUrl(
            $file->s3_key,
            now()->addMinutes(15),
            [
                'ResponseContentDisposition' => 'attachment; filename="' . $safeFilename . '"',
            ]
        );

        return response()->json([
            'url' => $downloadUrl,
            'file_name' => $file->name,
            'size_bytes' => $file->size_bytes,
        ])->header('X-Robots-Tag', 'noindex, nofollow');
    }

    private function resolveActivePublicShare(string $token): DriveShare|JsonResponse
    {
        if (!config('filesystems.drive_public_share_enabled', env('DRIVE_PUBLIC_SHARE', true))) {
            return response()->json(['message' => 'Berbagi link publik sedang dinonaktifkan.'], 404);
        }

        $share = DriveShare::where('token', $token)
            ->where('share_type', 'public')
            ->with('file')
            ->first();

        if (!$share || !$share->file || $share->isExpired()) {
            return response()->json(['message' => 'Tautan berbagi tidak ditemukan atau sudah kedaluwarsa.'], 404)
                ->header('X-Robots-Tag', 'noindex, nofollow');
        }

        return $share;
    }
}
