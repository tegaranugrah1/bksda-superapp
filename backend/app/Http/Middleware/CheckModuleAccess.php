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

        // Check if user has access to ANY of the specified modules (OR logic)
        if (! array_intersect($moduleNames, $user->access_modules ?? [])) {
            // Special exception for Kepegawaian module: Allow regular employees to see their own leave balance & details (GET only)
            if (in_array('kepegawaian', $moduleNames) && $request->isMethod('GET')) {
                $employee = \App\Modules\Kepegawaian\Models\Employee::where('nip', $user->username)->first();
                $targetEmployeeId = $request->route('employee');
                if ($employee && $targetEmployeeId) {
                    $targetId = is_object($targetEmployeeId) ? $targetEmployeeId->id : (int)$targetEmployeeId;
                    if ((int)$employee->id === $targetId) {
                        return $next($request);
                    }
                }
            }

            // Special exception for BMN module: Allow regular employees to see their own assets
            if (in_array('bmn', $moduleNames)) {
                $employee = \App\Modules\Kepegawaian\Models\Employee::where('nip', $user->username)->first();
                if ($employee) {
                    // 1. List assets endpoint: check if they are filtering by their own employee_id
                    if ($request->isMethod('GET') && $request->is('api/bmn/assets')
                        && filter_var($request->query('employee_id'), FILTER_VALIDATE_INT) === (int) $employee->id) {
                        return $next($request);
                    }

                    // 2. Detail/photo asset endpoint: check if the asset belongs to them (or active loan for public documentation photos only)
                    $assetId = $request->route('asset');
                    if ($request->isMethod('GET') && $assetId) {
                        $asset = $assetId instanceof \App\Modules\Bmn\Models\Asset ? $assetId : \App\Modules\Bmn\Models\Asset::find($assetId);
                        $isPublicPhoto = $request->is('api/bmn/assets/*/photo/*')
                            && in_array($request->route('type'), ['depan', 'belakang', 'kiri', 'kanan', 'lokasi', 'geotag'], true);
                        if ($asset && ($asset->isOwnedByEmployee($employee) || ($isPublicPhoto && $this->hasActiveLoan($asset, $employee)))) {
                            return $next($request);
                        }
                    }
                }
            }

            // Special exception for Keuangan module: Allow regular employees to read Visum SPD templates & settings for travel document generation
            if (in_array('keuangan', $moduleNames)) {
                if ($request->isMethod('GET') && (
                    $request->is('api/keuangan/visum/settings') ||
                    $request->is('api/keuangan/visum/templates') ||
                    $request->is('keuangan/visum/settings') ||
                    $request->is('keuangan/visum/templates')
                )) {
                    return $next($request);
                }
            }

            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses ke modul ini.',
                'code' => 'MODULE_ACCESS_DENIED',
            ], 403);
        }

        return $next($request);
    }

    private function hasActiveLoan(\App\Modules\Bmn\Models\Asset $asset, $employee): bool
    {
        return $asset->loans()
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT'])
            ->exists();
    }
}
