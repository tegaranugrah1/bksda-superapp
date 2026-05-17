<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleAccess
{
    /**
     * Handle an incoming request.
     *
     * Sebagai "Satpam" yang bertugas mengecek apakah User punya tiket (hak)
     * untuk masuk ke Modul tertentu.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  $moduleName  Nama modul (contoh: 'kepegawaian', 'inventory')
     */
    public function handle(Request $request, Closure $next, string ...$moduleNames): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Silakan login terlebih dahulu.',
            ], 401);
        }

        // Super admin bypass
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        $accessModules = $user->access_modules ?? [];

        // Check if user has access to ANY of the specified modules (OR logic)
        $hasAccess = false;
        foreach ($moduleNames as $moduleName) {
            if (in_array($moduleName, $accessModules)) {
                $hasAccess = true;
                break;
            }
        }

        if (! $hasAccess) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses ke modul ini.',
                'code' => 'MODULE_ACCESS_DENIED',
            ], 403);
        }

        return $next($request);
    }
}
