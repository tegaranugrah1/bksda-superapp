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
        // Public API actions may read Sanctum credentials without auth middleware.
        $user = $request->user() ?: auth('sanctum')->user();
        if (! $user) {
            return $next($request);
        }

        // Deactivation applies to every credential path, including recovery allowlisted routes.
        $employee = $user->employee;
        $isInactiveByEmployee = $employee && ! $employee->isEffectiveActive();

        if (! $user->is_active || $isInactiveByEmployee) {
            if ($user->is_active && $isInactiveByEmployee) {
                $user->update(['is_active' => false]);
            }
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

        $path = trim($request->path(), '/');

        // Saat wajib ganti password, blokir seluruh rute kecuali pembacaan profil, ganti password, dan logout (termasuk menolak api/me/2fa*).
        if (! empty($user->must_change_password)) {
            if (in_array($path, ['api/me', 'api/user', 'api/me/change-password', 'api/logout'], true)) {
                return $next($request);
            }

            return response()->json([
                'reason' => 'must_change_password',
                'message' => 'Anda wajib mengubah kata sandi akun sebelum dapat mengakses modul sistem lainnya.',
            ], 423);
        }

        // Allowlist routes yang boleh diakses saat terkunci untuk setup 2FA wajib
        if ($this->isAllowedRoute($request)) {
            return $next($request);
        }

        // 2. Cek kewajiban 2FA untuk akun administrator (global atau per-modul)
        $enforce2fa = config('auth.two_factor_enforce', false);
        $hasAdminModuleRole = in_array('admin', array_values($user->module_roles ?? []), true);
        $isAdmin = in_array($user->role, ['admin', 'super_admin'], true) || $hasAdminModuleRole;

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

        return in_array($path, $allowed, true) || str_starts_with($path, 'api/me/2fa');
    }
}
