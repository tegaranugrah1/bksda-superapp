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
            // Special exception for BMN view permission: Allow regular employees to see their own assets
            if ($permission === 'bmn.view') {
                $employee = \App\Modules\Kepegawaian\Models\Employee::where('nip', $user->username)->first();
                if ($employee) {
                    // 1. List assets endpoint: check if they are filtering by their own employee_id
                    if ($request->filled('employee_id') && (int)$employee->id === (int)$request->query('employee_id')) {
                        return $next($request);
                    }

                    // 2. Detail asset endpoint: check if the asset belongs to them
                    $assetId = $request->route('asset');
                    if ($assetId) {
                        $asset = \App\Modules\Bmn\Models\Asset::find($assetId);
                        if ($asset && $this->isAssetOwner($asset, $employee)) {
                            return $next($request);
                        }
                    }
                }
            }

            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses (permission) yang cukup untuk melakukan operasi ini.',
                'code' => 'PERMISSION_DENIED',
                'required_permission' => $permission,
            ], 403);
        }

        return $next($request);
    }

    /**
     * Helper to verify if an asset belongs to the employee.
     */
    private function isAssetOwner($asset, $employee): bool
    {
        if ((int)$asset->employee_id === (int)$employee->id) {
            return true;
        }

        if (!$employee->nama_lengkap) {
            return false;
        }

        $fullName = strtolower(trim($employee->nama_lengkap));
        $assetPengguna = strtolower(trim($asset->pengguna ?? ''));
        $assetNamaPengguna = strtolower(trim($asset->nama_pengguna ?? ''));

        if ($assetPengguna === '' && $assetNamaPengguna === '') {
            return false;
        }

        // Exact or substring matches
        if (str_contains($assetPengguna, $fullName) || str_contains($fullName, $assetPengguna)) {
            return true;
        }
        if (str_contains($assetNamaPengguna, $fullName) || str_contains($fullName, $assetNamaPengguna)) {
            return true;
        }

        // Match name before comma (stripping titles like A.Md., S.T., etc.)
        if (str_contains($fullName, ',')) {
            $parts = explode(',', $fullName);
            $baseName = trim($parts[0]);
            if (strlen($baseName) > 2) {
                if (str_contains($assetPengguna, $baseName) || str_contains($baseName, $assetPengguna)) {
                    return true;
                }
                if (str_contains($assetNamaPengguna, $baseName) || str_contains($baseName, $assetNamaPengguna)) {
                    return true;
                }
            }
        }

        // Match first two words
        $words = explode(' ', $fullName);
        if (count($words) >= 2) {
            $twoWords = $words[0] . ' ' . $words[1];
            if (str_contains($assetPengguna, $twoWords) || str_contains($twoWords, $assetPengguna)) {
                return true;
            }
        }

        return false;
    }
}

