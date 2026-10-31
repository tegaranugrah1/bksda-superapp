<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountSecure
{
    /**
     * Handle an incoming request.
     * Sesuai design §5.4: Mengunci akses (HTTP 423 Locked) bagi akun yang wajib ganti password
     * atau admin yang belum mengaktifkan 2FA.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        // Deactivation applies to every credential path, including recovery allowlisted routes.
        if (! $user->is_active) {
            $user->tokens()->delete();
            \Illuminate\Support\Facades\Auth::guard('web')->logout();
            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json([
                'reason' => 'account_inactive',
                'message' => 'Akun Anda sudah dinonaktifkan.',
            ], 403);
        }

        // Allowlist routes yang boleh diakses saat terkunci
        if ($this->isAllowedRoute($request)) {
            return $next($request);
        }

        // 1. Cek kewajiban ganti password
        if (! empty($user->must_change_password)) {
            return response()->json([
                'reason' => 'must_change_password',
                'message' => 'Anda wajib mengubah kata sandi akun sebelum dapat mengakses modul sistem lainnya.',
            ], 423);
        }

        // 2. Cek kewajiban 2FA untuk akun administrator
        $enforce2fa = config('auth.two_factor_enforce', false);
        $isAdmin = in_array($user->role, ['admin', 'super_admin'], true);

        if ($enforce2fa && $isAdmin && $user->two_factor_confirmed_at === null) {
            return response()->json([
                'reason' => 'must_setup_2fa',
                'message' => 'Akun administrator wajib mengaktifkan Autentikasi 2 Langkah (2FA) demi keamanan data SIM BKSDA.',
            ], 423);
        }

        return $next($request);
    }

    /**
     * Cek apakah path request termasuk dalam allowlist.
     */
    protected function isAllowedRoute(Request $request): bool
    {
        $path = trim($request->path(), '/');

        // Allowlist patterns: api/me, api/me/change-password, api/me/2fa/*, api/logout
        $allowed = [
            'api/me',
            'api/user',
            'api/me/change-password',
            'api/logout',
        ];

        if (in_array($path, $allowed, true)) {
            return true;
        }

        if (str_starts_with($path, 'api/me/2fa')) {
            return true;
        }

        return false;
    }
}
