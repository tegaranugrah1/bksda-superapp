<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class MobileDashboardController extends Controller
{
    /**
     * Get mobile dashboard consolidated data.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        // 1. Brief Profile
        $profile = [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'role' => $user->role,
            'access_modules' => $user->access_modules ?? [],
            'permissions' => $user->permissions ?? [],
            'employee' => $employee ? [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'nama_lengkap' => $employee->nama_lengkap,
                'jabatan' => $employee->jabatan,
                'satuan_kerja' => $employee->satuan_kerja,
                'foto_profil' => $employee->foto_profil ? (str_starts_with($employee->foto_profil, 'http') ? $employee->foto_profil : Storage::url($employee->foto_profil)) : null,
            ] : null,
        ];

        // 2. Summary Counts
        $assignedAssetsCount = 0;
        $activeLoansCount = 0;
        $pendingMyLettersCount = 0;
        $activeMyLettersCount = 0;
        $pendingApprovalsCount = 0;
        $urgentTaxVehicles = [];

        if ($employee) {
            $employeeId = $employee->id;
            $fullName = trim($employee->nama_lengkap ?? '');
            $escapedName = addcslashes(mb_strtolower($fullName), '%_');
            $assetOwnerScope = function ($query) use ($employeeId, $fullName, $escapedName) {
                $query->where('employee_id', $employeeId);
                if (mb_strlen($fullName) >= 3) {
                    $query->orWhereRaw('LOWER(pengguna) LIKE ?', ['%' . $escapedName . '%'])
                          ->orWhereRaw('LOWER(nama_pengguna) LIKE ?', ['%' . $escapedName . '%']);
                }
            };

            // Assigned assets count (consistent with AuthController::myAssets)
            $assignedAssetsCount = Asset::where($assetOwnerScope)->count();

            // Active loans count
            $activeLoansCount = AssetLoan::where('employee_id', $employeeId)
                ->whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT'])
                ->count();

            // My assignment letters: Pending (confidential drafts only visible to creator)
            $pendingMyLettersCount = AssignmentLetter::where(function ($query) use ($employeeId, $user) {
                $query->where('created_by', $user->id)
                    ->orWhere(function ($sub) use ($employeeId) {
                        $sub->whereHas('employees', function ($q) use ($employeeId) {
                            $q->where('kpg_employees.id', $employeeId);
                        })->whereIn('status', ['pending', 'PENDING']);
                    });
            })->whereIn('status', ['pending', 'draft', 'PENDING', 'DRAFT'])->count();

            // My assignment letters: Active (Approved, including letters created by user)
            $activeMyLettersCount = AssignmentLetter::where(function ($query) use ($employeeId, $user) {
                $query->whereHas('employees', function ($q) use ($employeeId) {
                    $q->where('kpg_employees.id', $employeeId);
                })->orWhere('created_by', $user->id);
            })->whereIn('status', ['approved', 'completed', 'published', 'diterbitkan', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'DITERBITKAN'])->count();

            // Urgent STNK Tax Vehicles (next 30 days)
            $now = Carbon::now();
            $thirtyDaysAhead = Carbon::now()->addDays(30);

            // Find assets owned by employee or actively loaned, having stnk tax date close
            $urgentVehiclesQuery = Asset::where(function ($query) use ($assetOwnerScope, $employeeId) {
                $query->where($assetOwnerScope)
                    ->orWhereHas('loans', function ($q) use ($employeeId) {
                        $q->where('employee_id', $employeeId)->whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT']);
                    });
            })
            ->whereNotNull('tanggal_pajak_stnk')
            ->whereBetween('tanggal_pajak_stnk', [$now->copy()->subDays(60)->toDateString(), $thirtyDaysAhead->toDateString()])
            ->limit(10)
            ->get();

            $urgentTaxVehicles = $urgentVehiclesQuery->map(function ($asset) use ($now) {
                return [
                    'id' => $asset->id,
                    'nama_barang' => $asset->nama_barang,
                    'no_polisi' => $asset->no_polisi,
                    'tanggal_pajak_stnk' => $asset->tanggal_pajak_stnk?->format('Y-m-d'),
                    'is_overdue' => $asset->tanggal_pajak_stnk ? $asset->tanggal_pajak_stnk->lt($now->copy()->startOfDay()) : false,
                ];
            });
        }

        // Check if user has permission or admin role for Surat Tugas approval
        $hasSuratTugasAccess = $user->hasPermission('surat_tugas.approve')
            || in_array($user->role, ['super_admin', 'admin']);

        if ($hasSuratTugasAccess) {
            $pendingApprovalsCount = AssignmentLetter::whereIn('status', ['pending', 'PENDING'])->count();
        }

        return response()->json([
            'data' => [
                'profile' => $profile,
                'summary' => [
                    'assigned_assets_count' => $assignedAssetsCount,
                    'active_loans_count' => $activeLoansCount,
                    'pending_my_letters_count' => $pendingMyLettersCount,
                    'active_my_letters_count' => $activeMyLettersCount,
                    'pending_approvals_count' => $pendingApprovalsCount,
                ],
                'urgent_tax_vehicles' => $urgentTaxVehicles,
                'notifications' => [],
            ],
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'client' => 'mobile',
            ],
            'message' => 'Dashboard data retrieved successfully',
        ]);
    }
}
