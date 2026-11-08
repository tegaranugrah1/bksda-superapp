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

        // 2. VALIDASI UTAMA: Gunakan helper hasPermission di model User (mendukung pemisah pipe |)
        $requiredPerms = array_map('trim', explode('|', $permission));
        $hasAccess = false;
        foreach ($requiredPerms as $p) {
            if ($user->hasPermission($p)) {
                $hasAccess = true;
                break;
            }
        }

        if (! $hasAccess) {
            // Special exception for BMN view permission: Allow regular employees to see their own assets
            if (in_array('bmn.view', $requiredPerms, true)) {
                $employee = \App\Modules\Kepegawaian\Models\Employee::where('nip', $user->username)->first();
                if ($employee) {
                    // 1. List assets endpoint: check if they are filtering by their own employee_id
                    if ($request->isMethod('GET') && $request->is('api/bmn/assets')
                        && filter_var($request->query('employee_id'), FILTER_VALIDATE_INT) === (int) $employee->id) {
                        return $next($request);
                    }

                    // 2. Detail asset endpoint: check if the asset belongs to them (or active loan for public documentation photos only)
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


            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses (permission) yang cukup untuk melakukan operasi ini.',
                'code' => 'PERMISSION_DENIED',
                'required_permission' => $permission,
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
