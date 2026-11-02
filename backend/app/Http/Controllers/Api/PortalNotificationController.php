<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PortalNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PortalNotificationController extends Controller
{
    /**
     * Get paginated notifications and unread count for current user.
     * Strictly scoped to auth user_id to prevent IDOR vulnerabilities.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $perPage = min(max((int) $request->input('per_page', 10), 1), 50);
        $unreadOnly = filter_var($request->input('unread_only', false), FILTER_VALIDATE_BOOLEAN);
        $type = $request->input('type');

        $query = PortalNotification::where('user_id', $user->id)
            ->orderByDesc('created_at');

        if ($unreadOnly) {
            $query->whereNull('read_at');
        }

        if ($type && in_array($type, ['surat_tugas', 'cuti', 'bmn', 'system'], true)) {
            $query->where('type', $type);
        }

        $paginator = $query->paginate($perPage);

        $unreadCount = PortalNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    /**
     * Mark a specific notification as read.
     * Strictly scoped to auth user_id to prevent unauthorized state manipulation.
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $notification = PortalNotification::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (! $notification) {
            return response()->json(['message' => 'Notifikasi tidak ditemukan.'], 404);
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        $unreadCount = PortalNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'message' => 'Notifikasi ditandai telah dibaca.',
            'data' => $notification,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark all notifications for current user as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        PortalNotification::where('user_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Semua notifikasi telah ditandai dibaca.',
            'unread_count' => 0,
        ]);
    }
}
