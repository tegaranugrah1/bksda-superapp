<?php

namespace App\Modules\SuratTugas\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\StExpenseTemplate;
use App\Modules\Kepegawaian\Models\StTemplate;
use App\Modules\Kepegawaian\Services\StTemplateService;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Requests\AssignmentLetterRequest;
use App\Modules\SuratTugas\Requests\ApproveAssignmentLetterRequest;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Modules\SuratTugas\Services\AssignmentLetterConflictService;
use App\Services\PortalNotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AssignmentLetterController extends Controller
{
    public function __construct(
        private readonly StTemplateService $templateService,
        private readonly AssignmentLetterConflictService $conflictService,
        private readonly PortalNotificationService $notificationService
    ) {}

    /**
     * GET /api/surat-tugas/my
     * Pegawai melihat surat tugas milik sendiri (no module access required)
     */
    public function myLetters(Request $request)
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (! $employee) {
            return response()->json([
                'data' => [],
                'meta' => $this->emptyPaginationMeta($request),
            ]);
        }

        $query = AssignmentLetter::with(['employees:id,nama_lengkap,nip,jabatan,satuan_kerja'])
            ->where(function ($q) use ($employee, $user) {
                $q->whereHas('employees', function ($sub) use ($employee) {
                    $sub->where('kpg_employees.id', $employee->id);
                })->orWhere('created_by', $user->id);
            })
            ->whereIn('status', ['approved', 'completed', 'published', 'diterbitkan', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'DITERBITKAN']);

        if ($search = ($request->query('search') ?? $request->query('q'))) {
            $s = addcslashes((string) $search, '%_');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($s, $likeOp) {
                $q->where('tempat_tujuan', $likeOp, "%{$s}%")
                    ->orWhere('maksud_tujuan', $likeOp, "%{$s}%")
                    ->orWhere('nomor_surat', $likeOp, "%{$s}%");
            });
        }

        $requestedPerPage = max(1, (int) $request->query('per_page', 20));
        $isMobile = $request->boolean('mobile') || $request->header('X-Client') === 'mobile';
        $perPage = min($requestedPerPage, $isMobile ? 50 : 200);
        $letters = $query->latest()->paginate($perPage);

        return response()->json([
            'data' => $isMobile
                ? collect($letters->items())->map(fn (AssignmentLetter $letter) => $this->toMobileListItem($letter, personal: true))->values()
                : $letters->items(),
            'meta' => $this->paginationMeta($letters),
        ]);
    }

    public function myShow(Request $request, string $id)
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (! $employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan'], 404);
        }

        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $surat = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'employees:id,nama_lengkap,nip,jabatan,satuan_kerja'])
            ->findOrFail($cleanId);

        $isAdmin = $user->role === 'super_admin'
            || ($user->role === 'admin' && array_intersect(['surat_tugas', 'kepegawaian'], $user->access_modules ?? []));
        $isAssignedEmployee = $surat->employees->contains(fn ($item) => (int) $item->id === (int) $employee->id);
        $isCreator = (int) $surat->created_by === (int) $user->id;

        if (! $isAdmin && ! $isAssignedEmployee && ! $isCreator) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke Surat Tugas ini.',
            ], 403);
        }

        if (! $isAdmin && ! $isCreator && ! in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json([
                'message' => 'Dokumen Surat Tugas belum diterbitkan secara resmi.',
            ], 403);
        }

        return response()->json([
            'data' => $this->isMobileRequest($request)
                ? $this->toMobileDetailItem($surat, personal: true)
                : $surat,
        ]);
    }

    public function myDownload(Request $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (! $employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan'], 404);
        }

        $isAdmin = $user->role === 'super_admin'
            || ($user->role === 'admin' && array_intersect(['surat_tugas', 'kepegawaian'], $user->access_modules ?? []));

        $query = AssignmentLetter::with(['employees']);
        if (! $isAdmin) {
            $query->where(function ($q) use ($employee, $user) {
                $q->whereHas('employees', function ($eq) use ($employee) {
                    $eq->where('kpg_employees.id', $employee->id);
                })->orWhere('created_by', $user->id);
            });
        }
        $surat = $query->findOrFail($cleanId);

        $isCreator = (int) $surat->created_by === (int) $user->id;
        if (! $isAdmin && ! $isCreator && ! in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json([
                'message' => 'Dokumen Surat Tugas belum diterbitkan secara resmi.',
            ], 403);
        }

        if ($surat->file_surat_path && Storage::disk('local')->exists($surat->file_surat_path)) {
            $ext = pathinfo($surat->file_surat_path, PATHINFO_EXTENSION) ?: 'pdf';
            $dasarSurat = $surat->maksud_tujuan ? substr(preg_replace('/[^a-zA-Z0-9\s]/', '', $surat->maksud_tujuan), 0, 50) : 'Surat Tugas';
            $namaPersonel = $surat->employees->first()?->nama_lengkap ?? 'Pegawai';
            $tanggalUpload = $surat->created_at?->format('d-m-Y') ?? date('d-m-Y');
            $filename = trim("{$dasarSurat}-{$namaPersonel}-{$tanggalUpload}").'.'.$ext;
            $filename = preg_replace('/[\r\n\/\\\\:*?"<>|]/', '_', $filename);

            if ($request->query('preview') || ($request->wantsJson() && ! $request->has('download'))) {
                $rawMime = Storage::disk('local')->mimeType($surat->file_surat_path) ?: 'application/pdf';
                $mime = in_array($rawMime, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], true) ? $rawMime : 'application/pdf';
                return response()->json([
                    'mime_type' => $mime,
                    'file_name' => $filename,
                    'data_url' => "data:{$mime};base64," . base64_encode(Storage::disk('local')->get($surat->file_surat_path)),
                ], 200, ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']);
            }

            return Storage::disk('local')->download($surat->file_surat_path, $filename, [
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        // Fallback document content if no file stored
        $content = "SURAT TUGAS BKSDA KALIMANTAN TIMUR\n";
        $content .= 'Nomor: '.($surat->nomor_surat ?: '-')."\n";
        $content .= 'Maksud/Tujuan: '.($surat->maksud_tujuan ?: '-')."\n";
        $content .= 'Tempat Tujuan: '.($surat->tempat_tujuan ?: '-')."\n";
        $content .= 'Tanggal: '.($surat->tanggal_mulai?->format('d-m-Y') ?: '-').' s/d '.($surat->tanggal_selesai?->format('d-m-Y') ?: '-')."\n";
        $content .= 'Status: '.strtoupper($surat->status)."\n";

        $rawNomor = $surat->nomor_surat ? preg_replace('/[\r\n"\/\\\\:*?<>|]/', '_', (string) $surat->nomor_surat) : (string) $surat->id;
        $filename = 'Surat-Tugas-'.$rawNomor.'.txt';

        return response($content, 200, [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function index(Request $request)
    {
        $query = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'employees:id,nama_lengkap,nip,jabatan,pangkat_golongan,satuan_kerja']);

        if ($search = ($request->query('search') ?? $request->query('q'))) {
            $s = addcslashes((string) $search, '%_');
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $query->where(function ($q) use ($s, $likeOp) {
                $q->where('tempat_tujuan', $likeOp, "%{$s}%")
                    ->orWhere('maksud_tujuan', $likeOp, "%{$s}%")
                    ->orWhere('nomor_surat', $likeOp, "%{$s}%")
                    ->orWhereHas('employees', function ($eq) use ($s, $likeOp) {
                        $eq->where('nama_lengkap', $likeOp, "%{$s}%")
                            ->orWhere('nip', $likeOp, "%{$s}%");
                    });
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($templateType = $request->query('template_type')) {
            $query->where('template_type', $templateType);
        }

        if ($sumberDana = $request->query('sumber_dana')) {
            $likeOp = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            if (in_array(strtolower($sumberDana), ['dipa', 'folu'])) {
                $query->where('sumber_dana', $likeOp, "%{$sumberDana}%");
            } else {
                $query->where('sumber_dana', $sumberDana);
            }
        }

        if ($dateFrom = $request->query('date_from')) {
            $query->whereDate('tanggal_mulai', '>=', $dateFrom);
        }

        if ($dateTo = $request->query('date_to')) {
            $query->whereDate('tanggal_selesai', '<=', $dateTo);
        }

        if ($employeeId = $request->query('employee_id')) {
            $query->whereHas('employees', function ($q) use ($employeeId) {
                $q->where('kpg_employees.id', $employeeId);
            });
        }

        if ($request->query('trashed') === 'true') {
            $query->onlyTrashed();
        }

        $requestedPerPage = max(1, (int) $request->query('per_page', 10));
        $isMobile = $request->boolean('mobile') || $request->header('X-Client') === 'mobile';
        $perPage = min($requestedPerPage, $isMobile ? 50 : 200);
        $letters = $query->latest()->paginate($perPage);

        return response()->json([
            'data' => $isMobile
                ? collect($letters->items())->map(fn (AssignmentLetter $letter) => $this->toMobileListItem($letter))->values()
                : $letters->items(),
            'meta' => $this->paginationMeta($letters),
        ]);
    }

    private function toMobileListItem(AssignmentLetter $letter, bool $personal = false): array
    {
        $employees = $letter->employees;
        $firstNames = $employees->pluck('nama_lengkap')->filter()->take(2)->values();
        $remainingCount = max(0, $employees->count() - $firstNames->count());

        $personelSummary = $firstNames->implode(', ');
        if ($remainingCount > 0) {
            $personelSummary .= " +{$remainingCount} lainnya";
        }

        return [
            'id' => $letter->id,
            'nomor' => $letter->nomor_surat,
            'nomor_surat' => $letter->nomor_surat,
            'kode_surat' => $letter->kode_surat,
            'kegiatan' => $letter->maksud_tujuan,
            'maksud_tujuan' => $letter->maksud_tujuan,
            'dasar_hukum' => $letter->dasar_hukum,
            'tujuan' => $letter->tempat_tujuan,
            'tempat_tujuan' => $letter->tempat_tujuan,
            'tanggal_mulai' => $letter->tanggal_mulai?->toDateString(),
            'tanggal_selesai' => $letter->tanggal_selesai?->toDateString(),
            'tanggal_surat' => $letter->tanggal_surat?->toDateString(),
            'status' => $letter->status,
            'sumber_dana' => $letter->sumber_dana,
            'template_type' => $letter->template_type,
            'nama_plh' => $letter->nama_plh,
            'menimbang' => $letter->menimbang,
            'dasar' => $letter->dasar,
            'tembusan' => $letter->tembusan,
            'penandatangan_nama' => $letter->penandatangan_nama,
            'penandatangan_nip' => $letter->penandatangan_nip,
            'jumlah_buruh' => (int) ($letter->jumlah_buruh ?? 0),
            'personel_summary' => $personelSummary ?: null,
            'personel_count' => $employees->count(),
            'employees' => $mappedEmployees = $this->mapMobileEmployees($employees),
            'personel' => $mappedEmployees,
            'has_file' => ! empty($letter->file_surat_path),
            'file_surat_path' => $letter->file_surat_path ? basename($letter->file_surat_path) : null,
            'file' => [
                'available' => ! empty($letter->file_surat_path),
                'download_url' => $personal ? "/api/surat-tugas/my/{$letter->id}/download" : "/api/surat-tugas/{$letter->id}/download",
            ],
            'allowed_actions' => [
                'can_view' => true,
                'can_download' => ! empty($letter->file_surat_path),
            ],
        ];
    }

    private function toMobileDetailItem(AssignmentLetter $letter, bool $personal = false): array
    {
        $downloadUrl = $personal
            ? "/api/surat-tugas/my/{$letter->id}/download"
            : "/api/surat-tugas/{$letter->id}/download";
        $mappedEmployees = $this->mapMobileEmployees($letter->employees);

        return [
            'id' => $letter->id,
            'nomor' => $letter->nomor_surat,
            'nomor_surat' => $letter->nomor_surat,
            'kode_surat' => $letter->kode_surat,
            'kegiatan' => $letter->maksud_tujuan,
            'maksud_tujuan' => $letter->maksud_tujuan,
            'dasar_hukum' => $letter->dasar_hukum,
            'tujuan' => $letter->tempat_tujuan,
            'tempat_tujuan' => $letter->tempat_tujuan,
            'tanggal_mulai' => $letter->tanggal_mulai?->toDateString(),
            'tanggal_selesai' => $letter->tanggal_selesai?->toDateString(),
            'tanggal_surat' => $letter->tanggal_surat?->toDateString(),
            'status' => $letter->status,
            'sumber_dana' => $letter->sumber_dana,
            'template_type' => $letter->template_type,
            'nama_plh' => $letter->nama_plh,
            'has_seksi_employee' => (bool) $letter->has_seksi_employee,
            'jumlah_buruh' => (int) ($letter->jumlah_buruh ?? 0),
            'menimbang' => $letter->menimbang,
            'dasar' => $letter->dasar,
            'tembusan' => $letter->tembusan,
            'penandatangan_nama' => $letter->penandatangan_nama,
            'penandatangan_nip' => $letter->penandatangan_nip,
            'has_file' => ! empty($letter->file_surat_path),
            'file_surat_path' => $letter->file_surat_path ? basename($letter->file_surat_path) : null,
            'employees' => $mappedEmployees,
            'personel' => $mappedEmployees,
            'file' => [
                'available' => ! empty($letter->file_surat_path),
                'filename' => $letter->nomor_surat ? "ST-{$letter->nomor_surat}.pdf" : "Surat-Tugas-{$letter->id}.pdf",
                'mime_type' => 'application/pdf',
                'download_url' => $downloadUrl,
            ],
            'allowed_actions' => [
                'can_view' => true,
                'can_download' => ! empty($letter->file_surat_path),
                'can_update' => ! $personal,
                'can_approve' => ! $personal && strtolower((string) $letter->status) === 'pending',
                'can_delete' => ! $personal,
            ],
        ];
    }

    private function mapMobileEmployees($employees)
    {
        return $employees->map(fn ($employee) => [
            'id' => $employee->id,
            'name' => $employee->nama_lengkap,
            'nama_lengkap' => $employee->nama_lengkap,
            'nip' => $employee->nip,
            'jabatan' => $employee->jabatan,
            'unit_kerja' => $employee->satuan_kerja,
            'satuan_kerja' => $employee->satuan_kerja,
            'pangkat_golongan' => $employee->pangkat_golongan,
            'peran' => $employee->pivot?->peran,
            'tanggal_mulai' => $employee->pivot?->tanggal_mulai ? (is_string($employee->pivot->tanggal_mulai) ? substr($employee->pivot->tanggal_mulai, 0, 10) : $employee->pivot->tanggal_mulai->toDateString()) : null,
            'tanggal_selesai' => $employee->pivot?->tanggal_selesai ? (is_string($employee->pivot->tanggal_selesai) ? substr($employee->pivot->tanggal_selesai, 0, 10) : $employee->pivot->tanggal_selesai->toDateString()) : null,
        ])->values();
    }

    private function syncAssignedEmployees(AssignmentLetter $surat, array $employees): void
    {
        $pivotData = [];
        foreach ($employees as $emp) {
            if (isset($emp['id'])) {
                $pivotData[$emp['id']] = [
                    'peran' => $emp['peran'] ?? null,
                    'tanggal_mulai' => $emp['tanggal_mulai'] ?? null,
                    'tanggal_selesai' => $emp['tanggal_selesai'] ?? null,
                ];
            }
        }
        $surat->employees()->sync($pivotData);
    }

    private function isMobileRequest(Request $request): bool
    {
        return $request->boolean('mobile') || $request->header('X-Client') === 'mobile';
    }

    private function paginationMeta($paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }

    private function emptyPaginationMeta(Request $request): array
    {
        return [
            'current_page' => max(1, (int) $request->query('page', 1)),
            'last_page' => 1,
            'per_page' => max(1, (int) $request->query('per_page', 20)),
            'total' => 0,
        ];
    }

    public function store(AssignmentLetterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $authUser = auth('sanctum')->user() ?: $request->user();
        $canViewDetails = $this->canViewConflictDetails($authUser);

        $employees = $validated['employees'] ?? [];
        $isPublicSubmit = $request->is('api/surat-tugas/submit');
        $status = ! $isPublicSubmit && $canViewDetails && strtolower((string) $request->input('status')) === 'approved'
            ? 'approved'
            : (! $isPublicSubmit && $authUser && strtolower((string) $request->input('status')) === 'draft' ? 'draft' : 'pending');

        DB::beginTransaction();
        try {
            $this->lockEmployeesForScheduling($employees);

            $conflictCheck = $this->conflictService->checkConflicts(
                $employees,
                $validated['tanggal_mulai'] ?? null,
                $validated['tanggal_selesai'] ?? null,
                null,
                $canViewDetails
            );

            if ($conflictCheck['has_conflict']) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Terdapat bentrok jadwal penugasan atau cuti aktif untuk beberapa personel yang dipilih.',
                    'conflicts' => $conflictCheck['conflicts'],
                ], 422);
            }

            $this->validatePublication(null, array_replace($validated, ['status' => $status]), $employees);
            $authUser = auth('sanctum')->user() ?: $request->user();
            $template = $this->resolveTemplate($validated);

            $surat = AssignmentLetter::create([
                'nomor_surat' => $validated['nomor_surat'] ?? null,
                'kode_surat' => $validated['kode_surat'] ?? null,
                'maksud_tujuan' => $validated['maksud_tujuan'],
                'dasar_hukum' => $validated['dasar_hukum'] ?? null,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'tanggal_surat' => $validated['tanggal_surat'] ?? null,
                'tempat_tujuan' => $validated['tempat_tujuan'] ?? null,
                'sumber_dana' => $validated['sumber_dana'] ?? 'dipa',
                'sumber_dana_other' => $validated['sumber_dana_other'] ?? null,
                'template_type' => (! empty($validated['template_type']) && $validated['template_type'] !== 'standard')
                    ? $validated['template_type']
                    : ($template ? 'db_'.$template->id : ($validated['template_type'] ?? null)),
                'template_id' => $template?->id,
                'task_type_id' => $validated['task_type_id'] ?? null,
                'sertakan_laporan' => $request->has('sertakan_laporan') ? (bool) $request->input('sertakan_laporan') : true,
                'template_version' => $template?->version,
                'template_snapshot' => (function () use ($template, $validated, $request) {
                    $baseSnapshot = $this->templateService->snapshot(
                        $template,
                        [
                            'menimbang' => $validated['menimbang'] ?? $template?->menimbang,
                            'dasar' => $validated['dasar'] ?? $template?->dasar,
                            'penandatangan_nama' => $validated['penandatangan_nama'] ?? $template?->default_signer_name,
                            'penandatangan_nip' => $validated['penandatangan_nip'] ?? $template?->default_signer_nip,
                        ]
                    );
                    $reqSnapshot = $request->input('template_snapshot');
                    if (is_array($reqSnapshot)) {
                        if ($baseSnapshot) {
                            $baseConfig = $baseSnapshot['configuration'] ?? [];
                            $reqConfig = $reqSnapshot['configuration'] ?? [];
                            if (is_array($reqConfig)) {
                                $baseSnapshot['configuration'] = array_merge($baseConfig, $reqConfig);
                            }
                            return $baseSnapshot;
                        }
                        return $reqSnapshot;
                    }
                    return $baseSnapshot;
                })(),
                'menimbang' => $validated['menimbang'] ?? $template?->menimbang,
                'dasar' => $validated['dasar'] ?? $template?->dasar,
                'tembusan' => $validated['tembusan'] ?? ($template?->configuration['tembusan_items'] ?? null),
                'penandatangan_nama' => $validated['penandatangan_nama'] ?? $template?->default_signer_name,
                'penandatangan_nip' => $validated['penandatangan_nip'] ?? $template?->default_signer_nip,
                'nama_plh' => $request->input('nama_plh'),
                'has_seksi_employee' => (bool) $request->input('has_seksi_employee', false),
                'jumlah_buruh' => (int) $request->input('jumlah_buruh', 0),
                'tanda_setuju' => $request->input('tanda_setuju'),
                'keterangan' => $request->input('keterangan'),
                'status' => $status,
                'approved_by' => $status === 'approved'
                    ? (int) $authUser->id
                    : null,
                'created_by' => $authUser ? (int) $authUser->id : null,
            ]);

            if (isset($validated['employees']) && is_array($validated['employees'])) {
                $this->syncAssignedEmployees($surat, $validated['employees']);
            }

            if ($request->hasFile('file_surat')) {
                $surat->replaceUploadedFile($request->file('file_surat'), $authUser?->id);
            }

            DB::commit();

            try {
                event(new \App\Events\AdminInboxChanged('surat_tugas', 'created', (string) $surat->id));
            } catch (\Throwable $e) {
                Log::warning('Broadcast AdminInboxChanged store SuratTugas failed: '.$e->getMessage());
            }

            $surat->load('employees');

            if ($status !== 'draft') {
                try {
                    $cleanStatus = strtolower($surat->status ?? 'pending');
                    $isApproved = in_array($cleanStatus, ['approved', 'completed', 'published', 'diterbitkan'], true);
                    $notifTitle = $isApproved ? 'Surat Tugas Diterbitkan' : 'Penugasan Baru Diajukan';
                    $notifMsg = $isApproved
                        ? "Surat tugas resmi diterbitkan: '{$surat->maksud_tujuan}'".($surat->nomor_surat ? " ({$surat->nomor_surat})" : '')
                        : "Anda didaftarkan dalam pengajuan Surat Tugas: '{$surat->maksud_tujuan}'";

                    $this->notifyLetterEmployees($surat, $notifTitle, $notifMsg);

                    if ($isApproved) {
                        \App\Modules\Agent\Jobs\DispatchSuratTugasWebhook::dispatch($surat);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Gagal mengirim portal notification pada store SuratTugas: '.$e->getMessage());
                }
            }

            return response()->json([
                'message' => 'Pengajuan Surat Tugas berhasil direkam.',
                'data' => $isPublicSubmit ? $surat->only(['id', 'status', 'created_by', 'approved_by']) : $surat,
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            if ($e instanceof ValidationException) {
                throw $e;
            }

            return response()->json([
                'message' => config('app.debug') ? 'Terjadi kegagalan sistem: '.$e->getMessage() : 'Terjadi kesalahan sistem saat menyimpan pengajuan Surat Tugas.',
            ], 500);
        }
    }

    public function show(Request $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $surat = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'taskType', 'employees:id,nama_lengkap,nip,jabatan,satuan_kerja'])->findOrFail($cleanId);

        if (! $this->authorizeAccess($surat, $request)) {
            return response()->json(['message' => 'Anda tidak memiliki otorisasi untuk melihat Surat Tugas ini.'], 403);
        }

        return response()->json([
            'data' => $this->isMobileRequest($request)
                ? $this->toMobileDetailItem($surat)
                : $surat,
        ]);
    }

    public function update(AssignmentLetterRequest $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $validated = $request->validated();
        $surat = AssignmentLetter::findOrFail($cleanId);

        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['admin', 'super_admin'], true);

        if (! $this->authorizeAccess($surat, $request)) {
            return response()->json(['message' => 'Anda tidak memiliki otorisasi untuk merubah Surat Tugas ini.'], 403);
        }

        DB::beginTransaction();
        try {
            $surat = AssignmentLetter::lockForUpdate()->findOrFail($cleanId);
            abort_unless($this->authorizeAccess($surat, $request), 403, 'Anda tidak memiliki otorisasi untuk merubah Surat Tugas ini.');
            $previousEmployees = $surat->employees()->pluck('kpg_employees.id')->all();
            $previousNotificationState = $this->letterNotificationState($surat);
            $this->authorizeOfficialRevision($surat, $user);

            $employees = array_key_exists('employees', $validated)
                ? ($validated['employees'] ?? [])
                : $this->existingEmployees($surat);
            $targetTanggalMulai = $request->input('tanggal_mulai', $surat->tanggal_mulai?->format('Y-m-d'));
            $targetTanggalSelesai = $request->input('tanggal_selesai', $surat->tanggal_selesai?->format('Y-m-d'));
            $canViewDetails = $this->canViewConflictDetails($user);

            $this->lockEmployeesForScheduling($employees);

            $conflictCheck = $this->conflictService->checkConflicts(
                $employees,
                $targetTanggalMulai,
                $targetTanggalSelesai,
                $cleanId,
                $canViewDetails
            );

            if ($conflictCheck['has_conflict']) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Terdapat bentrok jadwal penugasan atau cuti aktif untuk beberapa personel yang dipilih.',
                    'conflicts' => $conflictCheck['conflicts'],
                ], 422);
            }
            $updateData = $this->documentUpdates($validated, $surat);
            if (in_array($updateData['status'] ?? '', ['approved', 'completed', 'published', 'diterbitkan'], true)) {
                if (! $isAdmin) {
                    abort(403, 'Anda tidak memiliki otorisasi untuk mengubah status dokumen menjadi disetujui.');
                }
                $updateData['approved_by'] = (int) $user->id;
            }
            $this->validatePublication($surat, $updateData, $employees);
            $surat->update($updateData);

            if (array_key_exists('employees', $validated)) {
                $this->syncAssignedEmployees($surat, $validated['employees'] ?? []);
            }

            if ($request->hasFile('file_surat')) {
                $surat->replaceUploadedFile($request->file('file_surat'), $user?->id);
            }

            $notificationChanged = $previousNotificationState !== $this->letterNotificationState($surat);
            DB::commit();

            try {
                event(new \App\Events\AdminInboxChanged('surat_tugas', 'updated', (string) $surat->id));
            } catch (\Throwable $e) {
                Log::warning('Broadcast AdminInboxChanged update SuratTugas failed: '.$e->getMessage());
            }

            $surat->load('employees');
            if ($notificationChanged) $this->notifyLetterEmployees($surat, 'Pembaruan Surat Tugas', 'Data Surat Tugas telah diperbarui.', $previousEmployees);

            return response()->json([
                'message' => 'Data Surat Tugas berhasil diperbarui.',
                'data' => $surat,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            if ($e instanceof ValidationException || $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }
            Log::error('Update Surat Tugas failed: '.$e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'message' => config('app.debug') ? 'Terjadi kegagalan sistem: '.$e->getMessage() : 'Terjadi kesalahan sistem saat memperbarui data Surat Tugas.',
            ], 500);
        }
    }

    public function updateStatus(Request $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $user = $request->user();
        if (! $user || (! in_array($user->role, ['admin', 'super_admin'], true) && ! $user->hasPermission('surat_tugas.approve'))) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah status Surat Tugas.'], 403);
        }

        $request->validate([
            'status' => 'required|in:pending,approved,rejected,completed,PENDING,APPROVED,REJECTED,COMPLETED',
            'nomor_surat' => 'nullable|string',
        ]);

        $cleanStatus = strtolower($request->status);
        $notificationChanged = false;
        $surat = DB::transaction(function () use ($cleanId, $cleanStatus, $request, $user, &$notificationChanged) {
            $surat = AssignmentLetter::lockForUpdate()->findOrFail($cleanId);
            $this->authorizeOfficialRevision($surat, $user);
            $previousNotificationState = $this->letterNotificationState($surat);
            $employees = $this->existingEmployees($surat);
            $updateData = ['status' => $cleanStatus];
            if ($request->has('nomor_surat')) {
                $updateData['nomor_surat'] = $request->input('nomor_surat');
            }
            $this->validatePublication($surat, $updateData, $employees);
            if (in_array($cleanStatus, ['pending', 'approved', 'completed'], true)) {
                $this->lockEmployeesForScheduling($employees);
                $conflictCheck = $this->conflictService->checkConflicts(
                    $employees, $surat->tanggal_mulai?->format('Y-m-d'), $surat->tanggal_selesai?->format('Y-m-d'),
                    $cleanId, $this->canViewConflictDetails($user)
                );
                if ($conflictCheck['has_conflict']) {
                    return response()->json([
                        'message' => 'Terdapat bentrok jadwal penugasan atau cuti aktif untuk beberapa personel yang dipilih.',
                        'conflicts' => $conflictCheck['conflicts'],
                    ], 422);
                }
                if (in_array($cleanStatus, AssignmentLetter::OFFICIAL_STATUSES, true)) {
                    $updateData['approved_by'] = (int) $user->id;
                }
            }
            $surat->update($updateData);
            $notificationChanged = $previousNotificationState !== $this->letterNotificationState($surat);

            return $surat;
        });
        if ($surat instanceof JsonResponse) {
            return $surat;
        }

        try {
            event(new \App\Events\AdminInboxChanged('surat_tugas', 'status_updated', (string) $surat->id));
        } catch (\Throwable $e) {
            Log::warning('Broadcast AdminInboxChanged updateStatus SuratTugas failed: '.$e->getMessage());
        }

        try {
            $surat->load('employees');
            $isApproved = in_array($cleanStatus, ['approved', 'completed'], true);
            $notifTitle = $isApproved ? 'Surat Tugas Diterbitkan' : 'Status Surat Tugas: '.strtoupper($cleanStatus);
            $notifMsg = "Status Surat Tugas '{$surat->maksud_tujuan}' kini: ".strtoupper($cleanStatus).($surat->nomor_surat ? " ({$surat->nomor_surat})" : '');

            if ($notificationChanged) $this->notifyLetterEmployees($surat, $notifTitle, $notifMsg);
        } catch (\Throwable $e) {
            Log::warning('Gagal mengirim portal notification pada updateStatus SuratTugas: '.$e->getMessage());
        }

        return response()->json([
            'message' => 'Status Surat Tugas telah diperbarui menjadi '.strtoupper($cleanStatus),
            'data' => $surat,
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $surat = DB::transaction(function () use ($cleanId, $user) {
            $surat = AssignmentLetter::lockForUpdate()->findOrFail($cleanId);
            if (! in_array($user->role, ['admin', 'super_admin'], true)) {
                abort_unless((int) $surat->created_by === (int) $user->id, 403,
                    'Anda tidak memiliki otorisasi untuk menghapus Surat Tugas ini.');
                abort_if(in_array(strtolower((string) $surat->status), AssignmentLetter::OFFICIAL_STATUSES, true), 403,
                    'Dokumen Surat Tugas yang telah disetujui hanya dapat dihapus atau diarsipkan oleh Administrator.');
            }
            $surat->delete();
            $this->notifyLetterEmployees($surat, 'Surat Tugas Dipindahkan ke Sampah', 'Surat Tugas ini dipindahkan ke sampah dan tidak tersedia.');
            return $surat;
        });

        try {
            event(new \App\Events\AdminInboxChanged('surat_tugas', 'deleted', (string) $surat->id));
        } catch (\Throwable $e) {
            Log::warning('Broadcast AdminInboxChanged destroy SuratTugas failed: '.$e->getMessage());
        }

        return response()->json(['message' => 'Dokumen dipindahkan ke Arsip Sampah.']);
    }

    public function restore(Request $request, string $id)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $surat = AssignmentLetter::onlyTrashed()->findOrFail($cleanId);

        $isAdmin = in_array($user->role, ['admin', 'super_admin'], true);
        $isCreator = (int) $surat->created_by === (int) $user->id;

        if (! $isAdmin && ! $isCreator) {
            return response()->json(['message' => 'Anda tidak memiliki otorisasi untuk memulihkan Surat Tugas ini.'], 403);
        }

        DB::transaction(function () use ($cleanId, $request) {
            $surat = AssignmentLetter::onlyTrashed()->lockForUpdate()->findOrFail($cleanId);
            abort_unless(in_array($request->user()->role, ['admin', 'super_admin'], true)
                || (int) $surat->created_by === (int) $request->user()->id, 403);
            $this->restoreScheduledLetters(collect([$surat]), $request);
        });

        try {
            event(new \App\Events\AdminInboxChanged('surat_tugas', 'restored', (string) $surat->id));
        } catch (\Throwable $e) {
            Log::warning('Broadcast AdminInboxChanged restore SuratTugas failed: '.$e->getMessage());
        }

        return response()->json(['message' => 'Dokumen berhasil dipulihkan.']);
    }

    public function forceDestroy(Request $request, string $id)
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, ['admin', 'super_admin'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menghapus permanen Surat Tugas.'], 403);
        }

        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $surat = AssignmentLetter::onlyTrashed()->findOrFail($cleanId);

        $path = $surat->file_surat_path;
        $surat->forceDelete();
        DB::afterCommit(fn () => AssignmentLetter::deleteUnreferencedFile($path));

        return response()->json(['message' => 'Dokumen dihapus permanen dari arsip.']);
    }

    public function statusCounts()
    {
        $counts = AssignmentLetter::selectRaw('LOWER(status) as status_lower, count(*) as total')
            ->groupByRaw('LOWER(status)')
            ->pluck('total', 'status_lower');

        $trashed = AssignmentLetter::onlyTrashed()->count();
        $total = AssignmentLetter::count();

        $approvedCount = (int) ($counts['approved'] ?? 0)
            + (int) ($counts['completed'] ?? 0)
            + (int) ($counts['published'] ?? 0)
            + (int) ($counts['diterbitkan'] ?? 0);

        return response()->json([
            'all' => $total,
            'draft' => (int) ($counts['draft'] ?? 0),
            'pending' => (int) ($counts['pending'] ?? 0),
            'approved' => $approvedCount,
            'rejected' => (int) ($counts['rejected'] ?? 0),
            'trashed' => $trashed,
        ]);
    }

    private function letterNotificationState(AssignmentLetter $letter): array
    {
        $attributes = $letter->getAttributes();
        unset($attributes['created_at'], $attributes['updated_at']);
        return [$attributes, collect($this->existingEmployees($letter))->sortBy('id')->values()->all()];
    }

    private function notifyLetterEmployees(AssignmentLetter $letter, string $title, string $message, array $previousEmployees = []): void
    {
        if (strtolower((string) $letter->status) === 'draft') return;
        $letter->load('employees');
        foreach ($letter->employees as $employee) {
            $this->notificationService->notifyEmployee($employee, $title, $message, 'surat_tugas', 'surat_tugas',
                (string) $letter->id, ['status' => strtolower((string) $letter->status), 'nomor_surat' => $letter->nomor_surat,
                    'availability' => $letter->trashed() ? 'trashed' : 'available']);
        }
        foreach (array_diff($previousEmployees, $letter->employees->pluck('id')->all()) as $employeeId) {
            // A removed participant receives no details of the revised assignment.
            $this->notificationService->notifyEmployee((int) $employeeId, 'Perubahan Penugasan Surat Tugas',
                'Anda tidak lagi tercantum sebagai personel pada Surat Tugas ini.', 'surat_tugas', 'surat_tugas',
                (string) $letter->id, ['status' => 'removed', 'availability' => 'unavailable']);
        }
    }

    private function sanitizeBulkIds(mixed $rawIds): array
    {
        if (! is_array($rawIds)) {
            return [];
        }
        $rawIds = array_slice($rawIds, 0, 100);
        $clean = array_map(fn($id) => preg_replace('/^st-/', '', trim((string) $id)), $rawIds);
        return array_values(array_filter($clean, fn ($id) => Str::isUuid($id) || ctype_digit($id)));
    }

    public function bulkTrash(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $isAdmin = in_array($user->role, ['admin', 'super_admin'], true);
        $cleanIds = $this->sanitizeBulkIds($request->input('ids'));
        if (! empty($cleanIds)) {
            $query = AssignmentLetter::whereIn('id', $cleanIds);
            if (! $isAdmin) {
                $query->where('created_by', $user->id);
                $query->whereIn('status', ['draft', 'pending', 'rejected', 'DRAFT', 'PENDING', 'REJECTED']);
            }
            $count = DB::transaction(function () use ($query) {
                $letters = $query->orderBy('id')->lockForUpdate()->get();
                foreach ($letters as $letter) {
                    $letter->delete();
                    $this->notifyLetterEmployees($letter, 'Surat Tugas Dipindahkan ke Sampah', 'Surat Tugas ini dipindahkan ke sampah dan tidak tersedia.');
                    event(new \App\Events\AdminInboxChanged('surat_tugas', 'deleted', (string) $letter->id));
                }
                return $letters->count();
            });
            return response()->json(['message' => $count . ' dokumen dipindahkan ke Arsip Sampah.']);
        }

        return response()->json(['message' => '0 dokumen dipindahkan ke Arsip Sampah.']);
    }

    public function bulkRestore(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        $isAdmin = in_array($user->role, ['admin', 'super_admin'], true);
        $cleanIds = $this->sanitizeBulkIds($request->input('ids'));
        if (! empty($cleanIds)) {
            $query = AssignmentLetter::onlyTrashed()->whereIn('id', $cleanIds);
            if (! $isAdmin) {
                $query->where('created_by', $user->id);
            }
            $count = DB::transaction(function () use ($query, $request) {
                return $this->restoreScheduledLetters($query->orderBy('id')->lockForUpdate()->get(), $request);
            });
            if ($count > 0) event(new \App\Events\AdminInboxChanged('surat_tugas', 'restored'));
            return response()->json(['message' => $count . ' dokumen berhasil dipulihkan.']);
        }

        return response()->json(['message' => '0 dokumen berhasil dipulihkan.']);
    }

    private function restoreScheduledLetters($letters, Request $request): int
    {
        $employeesByLetter = $letters->mapWithKeys(fn ($letter) => [$letter->id => $this->existingEmployees($letter)]);
        $this->lockEmployeesForScheduling($employeesByLetter->flatten(1)->all());
        foreach ($letters as $letter) {
            $employees = $employeesByLetter[$letter->id];
            $this->validatePublication($letter, [], $employees);
            if (in_array(strtolower((string) $letter->status), ['pending', ...AssignmentLetter::OFFICIAL_STATUSES], true)) {
                $conflict = $this->conflictService->checkConflicts($employees,
                    $letter->tanggal_mulai?->format('Y-m-d'), $letter->tanggal_selesai?->format('Y-m-d'),
                    $letter->id, $this->canViewConflictDetails($request->user()));
                if ($conflict['has_conflict']) {
                    throw ValidationException::withMessages(['employees' => 'Dokumen tidak dapat dipulihkan karena jadwal personel berbenturan dengan penugasan atau cuti aktif.']);
                }
            }
            $letter->restore();
            $this->notifyLetterEmployees($letter, 'Surat Tugas Dipulihkan', 'Surat Tugas telah dipulihkan dan tersedia kembali.');
        }
        return $letters->count();
    }

    public function bulkForceDestroy(Request $request)
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, ['admin', 'super_admin'], true)) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menghapus permanen Surat Tugas.'], 403);
        }

        $cleanIds = $this->sanitizeBulkIds($request->input('ids'));
        if (empty($cleanIds)) {
            return response()->json(['message' => '0 dokumen dihapus permanen.']);
        }

        $letters = AssignmentLetter::onlyTrashed()->whereIn('id', $cleanIds)->get();
        $filesToDelete = [];
        foreach ($letters as $surat) {
            if (! empty($surat->file_surat_path)) {
                $filesToDelete[] = $surat->file_surat_path;
            }
        }

        $count = $letters->count();
        DB::transaction(function () use ($letters) {
            foreach ($letters as $surat) {
                $surat->forceDelete();
            }
        });

        foreach (array_unique($filesToDelete) as $path) {
            DB::afterCommit(fn () => AssignmentLetter::deleteUnreferencedFile($path));
        }

        return response()->json(['message' => $count . ' dokumen berhasil dihapus permanen dari arsip.']);
    }

    private function authorizeAccess(AssignmentLetter $surat, Request $request): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        if (in_array($user->role, ['admin', 'super_admin'], true)) {
            return true;
        }

        $employee = Employee::where('nip', $user->username)->first();
        $isAssignedEmployee = $employee && $surat->employees->contains(fn ($item) => (int) $item->id === (int) $employee->id);
        $isCreator = (int) $surat->created_by === (int) $user->id;

        return $isAssignedEmployee || $isCreator;
    }

    public function downloadPdf(Request $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $surat = AssignmentLetter::withTrashed()->with('employees')->findOrFail($cleanId);

        if (! $this->authorizeAccess($surat, $request)) {
            return response()->json([
                'message' => 'Anda tidak memiliki otorisasi untuk mengunduh dokumen ini.',
            ], 403);
        }

        $user = $request->user();
        $isAdmin = $user && in_array($user->role, ['admin', 'super_admin'], true);
        $isCreator = $user && (int) $surat->created_by === (int) $user->id;
        if (! $isAdmin && ! $isCreator && ! in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json([
                'message' => 'Dokumen Surat Tugas belum diterbitkan secara resmi.',
            ], 403);
        }

        if (! $surat->file_surat_path || ! Storage::disk('local')->exists($surat->file_surat_path)) {
            return response()->json(['message' => 'Berkas dokumen dasar tidak ditemukan di server.'], 404);
        }

        $ext = pathinfo($surat->file_surat_path, PATHINFO_EXTENSION) ?: 'pdf';

        // Filename: Dasar Surat-Nama Personel-Tanggal Upload
        $dasarSurat = $surat->maksud_tujuan ? substr(preg_replace('/[^a-zA-Z0-9\s]/', '', $surat->maksud_tujuan), 0, 50) : 'Surat Tugas';
        $namaPersonel = $surat->employees->first()?->nama_lengkap ?? 'Pegawai';
        $tanggalUpload = $surat->created_at?->format('d-m-Y') ?? date('d-m-Y');
        $filename = trim("{$dasarSurat}-{$namaPersonel}-{$tanggalUpload}").'.'.$ext;
        // Sanitize filename
        $filename = preg_replace('/[\r\n"\/\\\\:*?<>|]/', '_', $filename);

        // Mode pratinjau JSON base64 data_url (mencegah IDM hook & error CORS XHR)
        if ($request->query('preview') || ($request->wantsJson() && ! $request->has('download'))) {
            $rawMime = Storage::disk('local')->mimeType($surat->file_surat_path) ?: 'application/pdf';
            $mime = in_array($rawMime, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], true) ? $rawMime : 'application/pdf';
            return response()->json([
                'mime_type' => $mime,
                'file_name' => $filename,
                'data_url' => "data:{$mime};base64," . base64_encode(Storage::disk('local')->get($surat->file_surat_path)),
            ], 200, ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']);
        }

        if ($request->query('stream') || $request->query('inline')) {
            $rawMime = Storage::disk('local')->mimeType($surat->file_surat_path) ?: 'application/pdf';
            $mime = in_array($rawMime, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], true) ? $rawMime : 'application/pdf';
            return response(Storage::disk('local')->get($surat->file_surat_path), 200, [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        return Storage::disk('local')->download($surat->file_surat_path, $filename, [
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function verify(string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json([
                'valid' => false,
                'message' => 'Dokumen Surat Tugas tidak ditemukan dalam database resmi.',
            ], 404);
        }
        $surat = AssignmentLetter::with(['employees:id,nama_lengkap'])->find($cleanId);

        if (! $surat) {
            return response()->json([
                'valid' => false,
                'message' => 'Dokumen Surat Tugas tidak ditemukan dalam database resmi.',
            ], 404);
        }

        if (! in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json([
                'valid' => false,
                'message' => 'Dokumen ini tidak memiliki ketetapan hukum yang sah atau statusnya belum disetujui.',
            ], 403);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Dokumen ini terverifikasi SAH dan TERCATAT di database.',
            'data' => [
                'nomor_surat' => $surat->nomor_surat,
                'maksud_tujuan' => $surat->maksud_tujuan,
                'tanggal_berlaku' => ($surat->tanggal_mulai?->format('d M Y') ?? '-').' s/d '.($surat->tanggal_selesai?->format('d M Y') ?? '-'),
                'tempat_tujuan' => $surat->tempat_tujuan,
                'personil' => $surat->employees->pluck('nama_lengkap'),
            ],
        ]);
    }

    public function approve(ApproveAssignmentLetterRequest $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $user = $request->user();
        if (! $user || (! in_array($user->role, ['admin', 'super_admin'], true) && ! $user->hasPermission('surat_tugas.approve'))) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menyetujui Surat Tugas.'], 403);
        }

        $validated = $request->validated();
        $targetStatus = strtolower((string) $request->input('status'));

        DB::beginTransaction();
        try {
            $surat = AssignmentLetter::lockForUpdate()->findOrFail($cleanId);
            $this->authorizeOfficialRevision($surat, $user);
            $previousEmployees = $surat->employees()->pluck('kpg_employees.id')->all();
            $previousNotificationState = $this->letterNotificationState($surat);
            if (! array_key_exists('employees', $validated) && array_key_exists('employee_ids', $validated)) {
                $validated['employees'] = array_map(fn ($id) => ['id' => $id], $validated['employee_ids'] ?? []);
            }
            $employees = array_key_exists('employees', $validated)
                ? ($validated['employees'] ?? [])
                : $this->existingEmployees($surat);
            $targetTanggalMulai = $request->input('tanggal_mulai', $surat->tanggal_mulai?->format('Y-m-d'));
            $targetTanggalSelesai = $request->input('tanggal_selesai', $surat->tanggal_selesai?->format('Y-m-d'));
            $this->lockEmployeesForScheduling($employees);

            $conflictCheck = $this->conflictService->checkConflicts(
                $employees,
                $targetTanggalMulai,
                $targetTanggalSelesai,
                $cleanId,
                $this->canViewConflictDetails($user)
            );

            if ($conflictCheck['has_conflict']) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Terdapat bentrok jadwal penugasan atau cuti aktif untuk beberapa personel yang dipilih.',
                    'conflicts' => $conflictCheck['conflicts'],
                ], 422);
            }
            $updateData = $this->documentUpdates($validated, $surat);
            if (($updateData['status'] ?? null) === 'approved') {
                $updateData['approved_by'] = (int) $user->id;
            }
            $this->validatePublication($surat, $updateData, $employees);
            $surat->update($updateData);

            if (array_key_exists('employees', $validated)) {
                $this->syncAssignedEmployees($surat, $validated['employees'] ?? []);
            }

            $notificationChanged = $previousNotificationState !== $this->letterNotificationState($surat);
            DB::commit();

            $isApproved = in_array(strtolower($surat->status ?? ''), ['approved', 'completed', 'published', 'diterbitkan'], true);

            try {
                event(new \App\Events\AdminInboxChanged('surat_tugas', $isApproved ? 'approved' : 'status_updated', (string) $surat->id));
            } catch (\Throwable $e) {
                Log::warning('Broadcast AdminInboxChanged approve SuratTugas failed: '.$e->getMessage());
            }

            if ($notificationChanged && strtolower((string) $surat->status) !== 'draft') {
                try {
                    $surat->load('employees');
                    $notifTitle = $isApproved ? 'Surat Tugas Diterbitkan' : 'Pembaruan Surat Tugas';
                    $notifMsg = $isApproved
                        ? "Surat tugas resmi telah diterbitkan: '{$surat->maksud_tujuan}'".($surat->nomor_surat ? " ({$surat->nomor_surat})" : '')
                        : "Pembaruan data pada Surat Tugas: '{$surat->maksud_tujuan}'";

                    $this->notifyLetterEmployees($surat, $notifTitle, $notifMsg, $previousEmployees);

                    if ($isApproved) {
                        \App\Modules\Agent\Jobs\DispatchSuratTugasWebhook::dispatch($surat);
                    }
                } catch (\Throwable $e) {
                    Log::warning('Gagal mengirim portal notification pada approve SuratTugas: '.$e->getMessage());
                }
            }

            $statusLabel = $targetStatus === 'pending' ? 'diajukan untuk persetujuan' : ($targetStatus === 'approved' ? 'berhasil diterbitkan' : 'berhasil disimpan');

            return response()->json([
                'message' => "Surat Tugas {$statusLabel}.",
                'data' => $surat->load('employees'),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            if ($e instanceof ValidationException || $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException
                || $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface) {
                throw $e;
            }

            return response()->json([
                'message' => config('app.debug') ? 'Gagal memproses surat: '.$e->getMessage() : 'Terjadi kesalahan sistem saat memproses persetujuan Surat Tugas.',
            ], 500);
        }
    }

    public function getNextNumber()
    {
        $year = now()->year;
        $letters = AssignmentLetter::where(function ($q) use ($year) {
                $q->whereYear('tanggal_surat', $year)
                  ->orWhereYear('created_at', $year);
            })
            ->whereNotNull('nomor_surat')
            ->pluck('nomor_surat');

        $maxNumber = 0;
        foreach ($letters as $num) {
            if (preg_match('/ST\.(\d+)/i', (string) $num, $matches)) {
                $val = (int) $matches[1];
                if ($val > $maxNumber) {
                    $maxNumber = $val;
                }
            }
        }
        $nextNumber = $maxNumber + 1;

        return response()->json([
            'next_number' => str_pad((string) $nextNumber, 3, '0', STR_PAD_LEFT),
            'current_year' => $year,
        ]);
    }

    private function existingEmployees(AssignmentLetter $surat): array
    {
        return $surat->employees()->get()->map(fn ($employee) => [
            'id' => $employee->id,
            'peran' => $employee->pivot?->peran,
            'tanggal_mulai' => $employee->pivot?->tanggal_mulai?->format('Y-m-d'),
            'tanggal_selesai' => $employee->pivot?->tanggal_selesai?->format('Y-m-d'),
        ])->all();
    }

    private function documentUpdates(array $validated, AssignmentLetter $surat): array
    {
        $data = array_intersect_key($validated, array_flip($surat->getFillable()));
        if (isset($data['status'])) {
            $data['status'] = strtolower($data['status']);
        } else {
            unset($data['status']);
        }

        $snapshot = $surat->template_snapshot;
        if (array_key_exists('template_id', $validated) && $validated['template_id'] === null) {
            $data['template_version'] = null;
        } elseif (isset($validated['template_id']) || isset($validated['template_type'])) {
            $template = $this->resolveTemplate($validated);
            $data['template_id'] = $template?->id;
            $data['template_version'] = $template?->version;
            $snapshot = $this->templateService->snapshot($template, array_replace($surat->attributesToArray(), $data));
            $data['template_snapshot'] = $snapshot;
        }

        if (array_key_exists('template_snapshot', $validated)) {
            $incoming = $validated['template_snapshot'];
            $data['template_snapshot'] = $incoming;
            if (is_array($incoming) && is_array($snapshot)) {
                $data['template_snapshot'] = array_replace($snapshot, $incoming);
                if (isset($incoming['signer']) && is_array($incoming['signer']) && ! array_is_list($incoming['signer']) && is_array($snapshot['signer'] ?? null)) {
                    $data['template_snapshot']['signer'] = array_replace($snapshot['signer'], $incoming['signer']);
                }
                if (isset($incoming['configuration']) && is_array($incoming['configuration'])) {
                    // Replace supplied lists, including [], instead of retaining stale list entries.
                    $data['template_snapshot']['configuration'] = array_replace($snapshot['configuration'] ?? [], $incoming['configuration']);
                }
            }
        }

        return $data;
    }

    private function authorizeOfficialRevision(AssignmentLetter $surat, \App\Models\User $user): void
    {
        abort_if(! in_array($user->role, ['admin', 'super_admin'], true)
            && in_array(strtolower((string) $surat->status), AssignmentLetter::OFFICIAL_STATUSES, true),
            403, 'Dokumen Surat Tugas yang telah disetujui hanya dapat diubah oleh Administrator.');
    }

    private function validatePublication(?AssignmentLetter $surat, array $changes, array $employees): void
    {
        $officialStatuses = AssignmentLetter::OFFICIAL_STATUSES;
        $status = strtolower((string) ($changes['status'] ?? $surat?->status));
        if (in_array(strtolower((string) $surat?->status), $officialStatuses, true) && ! in_array($status, $officialStatuses, true)) {
            throw ValidationException::withMessages(['status' => 'Surat Tugas yang sudah diterbitkan tidak dapat dikembalikan ke status sebelum penerbitan tanpa pencabutan resmi.']);
        }
        if (! in_array($status, $officialStatuses, true)) {
            return;
        }

        $document = array_replace($surat?->attributesToArray() ?? [], $changes, ['employees' => $employees]);
        foreach (['nomor_surat', 'maksud_tujuan', 'sumber_dana'] as $field) {
            if (is_string($document[$field] ?? null)) {
                $document[$field] = trim($document[$field]);
            }
        }
        Validator::make($document, array_replace(AssignmentLetterRequest::requiredDocumentRules(), [
            'nomor_surat' => ['required', 'string', 'not_regex:/[{}]|\.{3}|…/u'],
        ]), [
            'nomor_surat.not_regex' => 'Nomor surat harus diisi lengkap tanpa placeholder.',
        ])->validate();
    }

    private function lockEmployeesForScheduling(array $employees): void
    {
        $ids = collect($employees)
            ->map(fn ($e) => is_array($e) ? ($e['id'] ?? null) : $e)
            ->filter()
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values()
            ->all();

        if (! empty($ids)) {
            Employee::whereIn('id', $ids)->orderBy('id', 'asc')->lockForUpdate()->get();
        }
    }

    private function canViewConflictDetails(?\App\Models\User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->role === 'super_admin') {
            return true;
        }

        $hasModule = ! empty(array_intersect(['surat_tugas', 'kepegawaian'], $user->access_modules ?? []));
        if (! $hasModule) {
            return false;
        }

        return in_array($user->role, ['admin'], true) || $user->hasPermission('surat_tugas.approve');
    }

    public function checkConflicts(Request $request): JsonResponse
    {
        $request->validate([
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date',
            'employees' => 'nullable|array',
            'employee_ids' => 'nullable|array',
            'exclude_id' => 'nullable|string',
        ]);

        $employees = $request->input('employees', []);
        if (empty($employees) && $request->has('employee_ids')) {
            $employees = $request->input('employee_ids', []);
        }

        $authUser = auth('sanctum')->user() ?: $request->user();
        $canViewDetails = $this->canViewConflictDetails($authUser);

        $result = $this->conflictService->checkConflicts(
            $employees,
            $request->input('tanggal_mulai'),
            $request->input('tanggal_selesai'),
            $request->input('exclude_id'),
            $canViewDetails
        );

        return response()->json($result);
    }

    private function templateIdFromType(?string $templateType): ?int
    {
        if (! $templateType || ! str_starts_with($templateType, 'db_')) {
            return null;
        }

        $id = filter_var(substr($templateType, 3), FILTER_VALIDATE_INT);

        return $id === false ? null : $id;
    }

    private function resolveTemplate(array $payload): ?StTemplate
    {
        $query = StTemplate::query()->where('is_active', true);
        $templateId = $payload['template_id'] ?? $this->templateIdFromType($payload['template_type'] ?? null);

        if ($templateId) {
            return $query->findOrFail($templateId);
        }

        $templateCode = match ($payload['template_type'] ?? null) {
            'bmn-pemeriksaan' => 'bmn-penghapusan',
            'beda-hari' => 'beda-hari',
            'plh' => 'plh',
            default => null,
        };

        if ($templateCode) {
            return $query->where('code', $templateCode)->first();
        }

        $rawSumberDana = trim((string) ($payload['sumber_dana'] ?? ''));
        $activeTemplates = $query->get();

        if ($rawSumberDana !== '') {
            $lowerSumber = strtolower($rawSumberDana);
            $matchedExpense = StExpenseTemplate::query()
                ->where('is_active', true)
                ->where(function ($q) use ($lowerSumber) {
                    $q->whereRaw('LOWER(code) = ?', [$lowerSumber])
                        ->orWhereRaw('LOWER(name) = ?', [$lowerSumber]);
                    if (str_contains($lowerSumber, 'folu')) {
                        $q->orWhere('category', 'hibah_folu')
                            ->orWhereRaw('LOWER(code) LIKE ?', ['%folu%']);
                    }
                })
                ->first();

            $targetCodes = array_values(array_unique(array_filter([
                $lowerSumber,
                $matchedExpense ? strtolower((string) $matchedExpense->code) : null,
                str_contains($lowerSumber, 'folu') || ($matchedExpense && $matchedExpense->category === 'hibah_folu') ? 'folu' : null,
            ])));

            $matchedByFunding = $activeTemplates->first(function (StTemplate $tpl) use ($targetCodes) {
                if (in_array($tpl->type, ['bmn', 'plh', 'beda_hari'], true)) {
                    return false;
                }
                if (in_array((string) $tpl->code, ['bmn-penghapusan', 'beda-hari', 'plh'], true)) {
                    return false;
                }
                $cfgSumber = strtolower(trim((string) ($tpl->configuration['sumber_dana'] ?? '')));
                $tplCode = strtolower(trim((string) ($tpl->code ?? '')));

                return ($cfgSumber !== '' && in_array($cfgSumber, $targetCodes, true))
                    || ($tplCode !== '' && in_array($tplCode, $targetCodes, true));
            });

            if ($matchedByFunding) {
                return $matchedByFunding;
            }
        }

        return $activeTemplates->firstWhere('is_default', true);
    }
}
