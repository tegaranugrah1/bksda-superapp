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
                'foto_profil' => $employee->foto_profil ? Storage::url($employee->foto_profil) : null,
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

            // Assigned assets count
            $assignedAssetsCount = Asset::where('employee_id', $employeeId)->count();

            // Active loans count
            $activeLoansCount = AssetLoan::where('employee_id', $employeeId)
                ->whereIn('status', ['dipinjam', 'terlambat'])
                ->count();

            // My assignment letters: Pending
            $pendingMyLettersCount = AssignmentLetter::whereHas('employees', function ($q) use ($employeeId) {
                $q->where('employee_id', $employeeId);
            })->where('status', 'pending')->count();

            // My assignment letters: Active (Approved)
            $activeMyLettersCount = AssignmentLetter::whereHas('employees', function ($q) use ($employeeId) {
                $q->where('employee_id', $employeeId);
            })->where('status', 'approved')->count();

            // Urgent STNK Tax Vehicles (next 30 days)
            $now = Carbon::now();
            $thirtyDaysAhead = Carbon::now()->addDays(30);

            // Find assets owned by employee or actively loaned, having stnk tax date close
            $urgentVehiclesQuery = Asset::where(function ($query) use ($employeeId) {
                $query->where('employee_id', $employeeId)
                    ->orWhereHas('loans', function ($q) use ($employeeId) {
                        $q->where('employee_id', $employeeId)->whereIn('status', ['dipinjam', 'terlambat']);
                    });
            })
            ->whereNotNull('tanggal_pajak_stnk')
            ->whereBetween('tanggal_pajak_stnk', [$now->toDateString(), $thirtyDaysAhead->toDateString()])
            ->get();

            $urgentTaxVehicles = $urgentVehiclesQuery->map(function ($asset) {
                return [
                    'id' => $asset->id,
                    'nama_barang' => $asset->nama_barang,
                    'no_polisi' => $asset->no_polisi,
                    'tanggal_pajak_stnk' => $asset->tanggal_pajak_stnk?->format('Y-m-d'),
                ];
            });
        }

        // Check if user has permission or module access for Surat Tugas approval
        $hasSuratTugasAccess = $user->hasPermission('surat_tugas.approve')
            || $user->hasPermission('kepegawaian.view');

        if ($hasSuratTugasAccess) {
            $pendingApprovalsCount = AssignmentLetter::where('status', 'pending')->count();
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
                'notifications' => [], // Fallback placeholder
            ],
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'client' => 'mobile',
            ],
            'message' => 'Dashboard data retrieved successfully',
        ]);
    }
}
