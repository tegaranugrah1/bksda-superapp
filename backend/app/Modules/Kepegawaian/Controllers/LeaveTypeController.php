<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\EmployeeLeaveRequest;
use App\Modules\Kepegawaian\Models\LeaveType;
use App\Modules\Kepegawaian\Services\HolidayCalendarHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LeaveTypeController extends Controller
{
    private function cleanString(?string $val): ?string
    {
        if ($val === null) return null;
        $stripped = preg_replace('#<script(.*?)>(.*?)</script>#is', '', $val);
        $clean = trim(strip_tags($stripped));
        return $clean === '' ? null : $clean;
    }
    /**
     * Display a listing of leave types.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdminFor('kepegawaian');

        $query = LeaveType::query();

        // If not admin or 'all' not explicitly requested, return only active leave types
        if (!$isAdmin || !$request->boolean('all')) {
            $query->where('is_active', true);
        }

        $rawSearch = $request->query('search');
        if (is_string($rawSearch) && ($cleaned = $this->cleanString($rawSearch)) !== null) {
            $pattern = '%' . str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $cleaned) . '%';
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'LIKE';
            $query->where(function ($q) use ($pattern, $likeOp) {
                $q->whereRaw("nama {$likeOp} ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("kode {$likeOp} ? ESCAPE '!'", [$pattern])
                  ->orWhereRaw("keterangan {$likeOp} ? ESCAPE '!'", [$pattern]);
            });
        }

        // Filter leave types based on employee type (MMP = none, PPPK = no CAP)
        // Hanya admin Kepegawaian yang boleh memilih target employee_id agar tidak membuka enumerasi status pegawai.
        $targetEmployee = null;
        if ($isAdmin && $request->filled('employee_id')) {
            $targetEmployee = \App\Modules\Kepegawaian\Models\Employee::find($request->integer('employee_id'));
        } elseif ($user) {
            $targetEmployee = \App\Modules\Kepegawaian\Models\Employee::where('nip', $user->username)->first();
        }

        if ($targetEmployee) {
            if ($targetEmployee->is_mmp) {
                return response()->json(['data' => []]);
            }
            if ($targetEmployee->is_pppk) {
                $query->where('kode', '!=', 'CAP')
                      ->whereRaw("LOWER(nama) NOT LIKE '%alasan penting%'");
            }
        }

        $items = $query->orderBy('urutan', 'asc')->orderBy('id', 'asc')->get();

        $reqYear = (int) $request->integer('year');
        $baseYear = ($reqYear >= 2000 && $reqYear <= 2100) ? $reqYear : (int) now()->year;
        $holidayDates = array_keys(
            HolidayCalendarHelper::getHolidayDateSet(max(2000, $baseYear - 1), min(2100, $baseYear + 1))
        );

        return response()->json([
            'data' => $items,
            'holiday_dates' => $holidayDates,
        ]);
    }

    /**
     * Display the specified leave type.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $isAdmin = (bool) $user?->isAdminFor('kepegawaian');

        $query = LeaveType::query();
        if (!$isAdmin) {
            $query->where('is_active', true);
        }

        $item = $query->findOrFail($id);

        return response()->json([
            'data' => $item,
        ]);
    }

    private function validatedAttributes(Request $request, ?int $ignoreId = null, ?bool $defaultActive = true): array
    {
        if (is_string($request->input('nama'))) {
            $request->merge(['nama' => $this->cleanString($request->input('nama')) ?? '']);
        }
        if (is_string($request->input('kode'))) {
            $cleanKode = $this->cleanString($request->input('kode'));
            $request->merge(['kode' => $cleanKode !== null ? strtoupper($cleanKode) : null]);
        }

        $uniqueNama = Rule::unique('kpg_leave_types', 'nama')->whereNull('deleted_at');
        if ($ignoreId !== null) {
            $uniqueNama->ignore($ignoreId);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:150', $uniqueNama],
            'kode' => ['nullable', 'string', 'max:30'],
            'hitung_hari' => ['required', 'string', Rule::in(['hari_kerja', 'hari_kalender'])],
            'potong_kuota_tahunan' => ['required', 'boolean'],
            'maks_hari' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
            'urutan' => ['nullable', 'integer', 'min:0'],
        ]);

        return [
            'nama' => $validated['nama'],
            'kode' => !empty($validated['kode']) ? $validated['kode'] : null,
            'hitung_hari' => $validated['hitung_hari'],
            'potong_kuota_tahunan' => (bool) $validated['potong_kuota_tahunan'],
            'maks_hari' => isset($validated['maks_hari']) ? (int) $validated['maks_hari'] : null,
            'keterangan' => $this->cleanString($validated['keterangan'] ?? null),
            'is_active' => $validated['is_active'] ?? $defaultActive,
            'urutan' => $validated['urutan'] ?? 0,
        ];
    }

    /**
     * Store a newly created leave type.
     */
    public function store(Request $request): JsonResponse
    {
        $attributes = $this->validatedAttributes($request);

        $item = DB::transaction(function () use ($attributes) {
            LeaveType::lockCatalog(true);

            return LeaveType::create($attributes);
        });

        return response()->json([
            'message' => 'Jenis cuti berhasil ditambahkan',
            'data' => $item,
        ], 201);
    }

    /**
     * Update the specified leave type.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $item = LeaveType::findOrFail($id);
        $attributes = $this->validatedAttributes($request, $item->id, $item->is_active);
        $attributes['urutan'] = $request->has('urutan') ? $attributes['urutan'] : $item->urutan;

        $item = DB::transaction(function () use ($id, $attributes) {
            LeaveType::lockCatalog(true);
            $item = LeaveType::lockForUpdate()->findOrFail($id);

            $aliases = [mb_strtolower(trim($item->nama))];
            if ($item->kode !== null && trim($item->kode) !== '') {
                $aliases[] = mb_strtolower(trim($item->kode));
            }

            $item->update($attributes);

            if ($item->wasChanged(['nama', 'kode'])) {
                // Keep historical names/codes attached to the renamed master, including archived rows.
                EmployeeLeaveRequest::withTrashed()
                    ->whereIn(DB::raw('LOWER(TRIM(jenis_cuti))'), $aliases)
                    ->update(['jenis_cuti' => $item->nama]);
            }

            return $item;
        });

        return response()->json([
            'message' => 'Jenis cuti berhasil diperbarui',
            'data' => $item,
        ]);
    }

    /**
     * Toggle active status.
     */
    public function toggleActive(int $id): JsonResponse
    {
        $item = DB::transaction(function () use ($id) {
            LeaveType::lockCatalog(true);
            $item = LeaveType::lockForUpdate()->findOrFail($id);
            $item->is_active = !$item->is_active;
            $item->save();

            return $item;
        });

        return response()->json([
            'message' => 'Status jenis cuti berhasil diubah',
            'data' => $item,
        ]);
    }

    /**
     * Remove the specified leave type.
     */
    public function destroy(int $id): JsonResponse
    {
        DB::transaction(function () use ($id) {
            LeaveType::lockCatalog(true);
            $item = LeaveType::lockForUpdate()->findOrFail($id);
            $item->delete();
        });

        return response()->json([
            'message' => 'Jenis cuti berhasil dihapus',
        ]);
    }
}
