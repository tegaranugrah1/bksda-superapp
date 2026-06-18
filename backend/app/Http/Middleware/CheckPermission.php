<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * Mengecek apakah user yang sedang login memiliki permission granular yang dibutuhkan.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  $permission  Nama permission yang dibutuhkan (contoh: 'bmn.asset.create')
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        // 1. EARLY RETURN: Pastikan user terautentikasi
        if (! $user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Silakan login terlebih dahulu.',
            ], 401);
        }

        // 2. VALIDASI UTAMA: Gunakan helper hasPermission di model User
        if (! $user->hasPermission($permission)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses (permission) yang cukup untuk melakukan operasi ini.',
                'code' => 'PERMISSION_DENIED',
                'required_permission' => $permission,
            ], 403);
        }

        return $next($request);
    }
}
