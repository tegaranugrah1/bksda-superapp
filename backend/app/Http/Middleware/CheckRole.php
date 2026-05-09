<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Mengecek apakah role User yang sedang login diperbolehkan
     * mengakses rute ini.
     *
     * @param  Closure(Request): (Response)  $next
     * @param  string  ...$roles  Daftar role yang diizinkan (contoh: 'admin', 'pimpinan')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // 1. EARLY RETURN: Pastikan user terautentikasi (Lapis ganda)
        if (! $user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Silakan login terlebih dahulu.',
            ], 401);
        }

        // 2. EARLY RETURN: Bypass khusus Super Admin (Sesuai Rule 2.3)
        // super_admin adalah dewa, izinkan melakukan apapun
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // 3. VALIDASI UTAMA: Apakah role user ada di dalam daftar role yang diizinkan?
        if (! in_array($user->role, $roles)) {
            // Jika tidak cocok, tolak dengan format error terstandar
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Hak akses (Role) Anda tidak mencukupi untuk operasi ini.',
                'code' => 'ROLE_ACCESS_DENIED',
            ], 403);
        }

        // 4. Jika lolos penjagaan, teruskan request
        return $next($request);
    }
}
