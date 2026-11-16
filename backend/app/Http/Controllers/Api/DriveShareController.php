<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriveFile;
use App\Models\DriveShare;
use App\Models\DriveUnit;
use App\Models\User;
use App\Support\Security\DriveAccess;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
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
            'password' => 'nullable|string|min:8|max:128',
            'expires_in_days' => 'nullable|integer|min:1|max:365',
        ]);

        if ($validated['share_type'] === 'public') {
            if (! config('filesystems.drive_public_share_enabled', true)) {
                return response()->json(['message' => 'Fitur berbagi link publik saat ini dinonaktifkan oleh kebijakan keamanan kantor.'], 403);
            }

            // Hanya pemilik berkas, manager unit, atau Admin Drive yang dapat membuat tautan publik terbuka.
            $fileUnit = $file->unit_id ? DriveUnit::find($file->unit_id) : null;
            $isUnitManager = $fileUnit && DriveAccess::unitRole($user, $fileUnit) === 'manager';
            if ((int) $file->user_id !== (int) $user->id && ! $isUnitManager && ! DriveAccess::isDriveAdmin($user)) {
                return response()->json(['message' => 'Hanya pemilik berkas, Manager Unit, atau Admin Drive yang dapat membuat tautan publik.'], 403);
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

            $frontendUrl = rtrim((string) config('app.frontend_url', 'https://bksdakaltim.web.id'), '/');

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

        $frontendUrl = rtrim((string) config('app.frontend_url', 'https://bksdakaltim.web.id'), '/');

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
        $share = DriveShare::with([
            'file' => fn ($q) => $q->withTrashed(),
            'folder' => fn ($q) => $q->withTrashed(),
        ])->findOrFail($shareId);

        $canRevoke = DriveAccess::isDriveAdmin($user)
            || ($share->file && DriveAccess::canWriteFile($user, $share->file))
            || ($share->folder && DriveAccess::canWriteFolder($user, $share->folder));

        if (! $canRevoke) {
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
            $throttleKey = 'drive-share-pw:' . $share->token . '|' . $request->ip();
            if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
                return response()->json(['message' => 'Terlalu banyak percobaan sandi salah. Silakan coba beberapa saat lagi.'], 429)
                    ->header('X-Robots-Tag', 'noindex, nofollow');
            }

            $request->validate([
                'password' => 'required|string',
            ], [
                'password.required' => 'Dokumen ini dilindungi sandi. Harap masukkan kata sandi.',
            ]);

            if (!$share->verifyPassword($request->password)) {
                RateLimiter::hit($throttleKey, 300);
                return response()->json(['message' => 'Kata sandi yang Anda masukkan salah.'], 401)
                    ->header('X-Robots-Tag', 'noindex, nofollow');
            }
            RateLimiter::clear($throttleKey);
        }

        // Increment download count
        $share->increment('download_count');

        $file = $share->file;
        $signerDisk = Storage::disk('drive_signer');
        $safeFilename = UploadValidationRules::sanitizeFilename((string) $file->name, 'file');

        // Security: safe content disposition attachment + preserve content type
        $downloadUrl = $signerDisk->temporaryUrl(
            $file->s3_key,
            now()->addMinutes(15),
            [
                'ResponseContentDisposition' => 'attachment; filename="' . $safeFilename . '"',
                'ResponseContentType' => $file->mime_type ?: 'application/octet-stream',
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
        if (! config('filesystems.drive_public_share_enabled', true)) {
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

    /**
     * GET /api/drive/shares/candidates
     * Daftar akun pengguna aktif (users.id) untuk target berbagi internal & transfer ownership.
     */
    public function candidates(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = User::query()
            ->where('is_active', true)
            ->select(['id', 'name', 'email']);

        if ($search !== '') {
            $escaped = addcslashes($search, '%_');
            $query->where(function ($q) use ($escaped) {
                $q->where('name', 'like', "%{$escaped}%")
                  ->orWhere('email', 'like', "%{$escaped}%");
            });
        }

        $candidates = $query->with('employee:id,nip,is_active,inactive_effective_date')
            ->orderBy('name')
            ->limit(150)
            ->get()
            ->filter(fn (User $u) => ! $u->employee || $u->employee->isEffectiveActive())
            ->take(100)
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
            ])
            ->values();

        return response()->json([
            'data' => $candidates,
        ]);
    }
}
