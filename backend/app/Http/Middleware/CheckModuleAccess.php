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
    public function handle(Request $request, Closure $next, string $moduleName): Response
    {
        $user = $request->user();

        // 1. EARLY RETURN: Pastikan user terautentikasi
        // (Walaupun biasanya auth:sanctum sudah menangani ini, ini sebagai lapis keamanan ganda)
        if (! $user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Silakan login terlebih dahulu.',
            ], 401);
        }

        // 2. EARLY RETURN: Bypass khusus Super Admin (Sesuai Rule 2.3)
        // super_admin adalah dewa, izinkan akses ke semua modul tanpa pengecekan
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // 3. Ambil daftar tiket (hak akses modul) yang dimiliki User
        // Menggunakan null coalescing (?? []) agar tidak error jika isinya kosong/null
        $accessModules = $user->access_modules ?? [];

        // 4. VALIDASI UTAMA: Apakah $moduleName ada di dalam kantong tiket ($accessModules)?
        if (! in_array($moduleName, $accessModules)) {
            // Jika tidak ada, tolak dengan 403 Forbidden sesuai Rule 5.2 (Standar Error Format)
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses ke modul ini.',
                'code' => 'MODULE_ACCESS_DENIED',
            ], 403);
        }

        // 5. Jika lolos semua penjagaan di atas, persilakan masuk
        return $next($request);
    }
}
