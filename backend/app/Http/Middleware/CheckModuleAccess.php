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

                    // 2. Detail/photo asset endpoint: check if the asset belongs to them
                    $assetId = $request->route('asset');
                    if ($request->isMethod('GET') && $assetId) {
                        $asset = $assetId instanceof \App\Modules\Bmn\Models\Asset ? $assetId : \App\Modules\Bmn\Models\Asset::find($assetId);
                        if ($asset && $this->isAssetOwner($asset, $employee)) {
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

    /**
     * Helper to verify if an asset belongs to the employee.
     */
    private function isAssetOwner($asset, $employee): bool
    {
        if ($asset->employee_id !== null && (int) $asset->employee_id === (int) $employee->id) {
            return true;
        }

        $empName = trim($employee->nama_lengkap ?? '');
        if (mb_strlen($empName) >= 3) {
            $cleanName = trim(preg_replace('/,.*$/', '', $empName));
            $lowerPengguna = mb_strtolower((string) ($asset->pengguna ?? ''));
            $lowerNamaPengguna = mb_strtolower((string) ($asset->nama_pengguna ?? ''));
            if (str_contains($lowerPengguna, mb_strtolower($empName)) ||
                str_contains($lowerNamaPengguna, mb_strtolower($empName)) ||
                (mb_strlen($cleanName) >= 3 && (
                    str_contains($lowerPengguna, mb_strtolower($cleanName)) ||
                    str_contains($lowerNamaPengguna, mb_strtolower($cleanName))
                ))) {
                return true;
            }
        }

        return false;
    }
}
