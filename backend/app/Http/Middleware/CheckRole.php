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

        // 3. VALIDASI UTAMA: Mendukung parameter `module:<slug>` atau deteksi otomatis modul dari path API.
        $moduleScope = null;
        $allowedRoles = [];
        foreach ($roles as $item) {
            if (str_starts_with($item, 'module:')) {
                $moduleScope = substr($item, 7);
            } else {
                $allowedRoles[] = $item;
            }
        }

        if ($moduleScope === null) {
            $moduleScope = $this->detectModuleFromRequest($request);
        }

        $effectiveRole = $moduleScope !== null && $moduleScope !== ''
            ? $user->roleFor($moduleScope)
            : $user->role;

        if (! in_array($effectiveRole, $allowedRoles, true)) {
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

    private function detectModuleFromRequest(Request $request): ?string
    {
        $path = ltrim($request->path(), '/');
        if (str_starts_with($path, 'api/')) {
            $path = substr($path, 4);
        }

        return match (true) {
            str_starts_with($path, 'surat-tugas') => 'surat_tugas',
            str_starts_with($path, 'kepegawaian') => 'kepegawaian',
            str_starts_with($path, 'surat') => 'surat',
            str_starts_with($path, 'bmn') => 'bmn',
            str_starts_with($path, 'keuangan') => 'keuangan',
            str_starts_with($path, 'dereporting') => 'dereporting',
            str_starts_with($path, 'inventory') => 'inventory',
            str_starts_with($path, 'drive') => 'drive',
            str_starts_with($path, 'cms') => 'cms',
            default => null,
        };
    }
}
