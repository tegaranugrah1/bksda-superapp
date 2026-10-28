<?php

namespace App\Modules\SuratTugas\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\StTemplate;
use App\Modules\Kepegawaian\Services\StTemplateService;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Requests\AssignmentLetterRequest;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AssignmentLetterController extends Controller
{
    public function __construct(private readonly StTemplateService $templateService) {}

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

        $isAssignedEmployee = $surat->employees->contains(fn ($item) => (int) $item->id === (int) $employee->id);
        $isCreator = (int) $surat->created_by === (int) $user->id;

        if (! $isAssignedEmployee && ! $isCreator) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke Surat Tugas ini.',
            ], 403);
        }

        if (! $isCreator && ! in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json([
                'message' => 'Surat Tugas ini masih dalam proses penyusunan/persetujuan dan belum dapat diakses.',
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

        $surat = AssignmentLetter::with(['employees'])
            ->where(function ($q) use ($employee, $user) {
                $q->whereHas('employees', function ($eq) use ($employee) {
                    $eq->where('kpg_employees.id', $employee->id);
                })->orWhere('created_by', $user->id);
            })
            ->findOrFail($cleanId);

        $isCreator = (int) $surat->created_by === (int) $user->id;
        if (! $isCreator && ! in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json([
                'message' => 'Dokumen Surat Tugas belum diterbitkan secara resmi.',
            ], 403);
        }

        if ($surat->file_surat_path && Storage::exists($surat->file_surat_path)) {
            $ext = pathinfo($surat->file_surat_path, PATHINFO_EXTENSION) ?: 'pdf';
            $dasarSurat = $surat->maksud_tujuan ? substr(preg_replace('/[^a-zA-Z0-9\s]/', '', $surat->maksud_tujuan), 0, 50) : 'Surat Tugas';
            $namaPersonel = $surat->employees->first()?->nama_lengkap ?? 'Pegawai';
            $tanggalUpload = $surat->created_at?->format('d-m-Y') ?? date('d-m-Y');
            $filename = trim("{$dasarSurat}-{$namaPersonel}-{$tanggalUpload}").'.'.$ext;
            $filename = preg_replace('/[\r\n\/\\\\:*?"<>|]/', '_', $filename);

            if ($request->query('preview') || ($request->wantsJson() && ! $request->has('download'))) {
                $mime = Storage::mimeType($surat->file_surat_path) ?: 'application/pdf';
                return response()->json([
                    'mime_type' => $mime,
                    'file_name' => $filename,
                    'data_url' => "data:{$mime};base64," . base64_encode(Storage::get($surat->file_surat_path)),
                ], 200, ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']);
            }

            return Storage::download($surat->file_surat_path, $filename, [
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
            'employees' => $employees->map(fn ($e) => [
                'id' => $e->id,
                'nama_lengkap' => $e->nama_lengkap,
                'name' => $e->nama_lengkap,
                'nip' => $e->nip,
                'jabatan' => $e->jabatan,
                'pangkat_golongan' => $e->pangkat_golongan,
                'unit_kerja' => $e->satuan_kerja,
                'peran' => $e->pivot?->peran,
                'tanggal_mulai' => $e->pivot?->tanggal_mulai ? (is_string($e->pivot->tanggal_mulai) ? substr($e->pivot->tanggal_mulai, 0, 10) : $e->pivot->tanggal_mulai->toDateString()) : null,
                'tanggal_selesai' => $e->pivot?->tanggal_selesai ? (is_string($e->pivot->tanggal_selesai) ? substr($e->pivot->tanggal_selesai, 0, 10) : $e->pivot->tanggal_selesai->toDateString()) : null,
            ])->values(),
            'personel' => $employees->map(fn ($e) => [
                'id' => $e->id,
                'nama_lengkap' => $e->nama_lengkap,
                'name' => $e->nama_lengkap,
                'nip' => $e->nip,
                'jabatan' => $e->jabatan,
                'pangkat_golongan' => $e->pangkat_golongan,
                'unit_kerja' => $e->satuan_kerja,
                'peran' => $e->pivot?->peran,
                'tanggal_mulai' => $e->pivot?->tanggal_mulai ? (is_string($e->pivot->tanggal_mulai) ? substr($e->pivot->tanggal_mulai, 0, 10) : $e->pivot->tanggal_mulai->toDateString()) : null,
                'tanggal_selesai' => $e->pivot?->tanggal_selesai ? (is_string($e->pivot->tanggal_selesai) ? substr($e->pivot->tanggal_selesai, 0, 10) : $e->pivot->tanggal_selesai->toDateString()) : null,
            ])->values(),
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
            'employees' => $letter->employees->map(fn ($employee) => [
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
            ])->values(),
            'personel' => $letter->employees->map(fn ($employee) => [
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
            ])->values(),
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

        DB::beginTransaction();
        try {
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
                'template_type' => $validated['template_type'] ?? null,
                'template_id' => $template?->id,
                'task_type_id' => $validated['task_type_id'] ?? null,
                'sertakan_laporan' => $request->has('sertakan_laporan') ? (bool) $request->input('sertakan_laporan') : true,
                'template_version' => $template?->version,
                'template_snapshot' => (function () use ($template, $validated, $request) {
                    $baseSnapshot = $this->templateService->snapshot(
                        $template,
                        [
                            'menimbang' => $validated['menimbang'] ?? null,
                            'dasar' => $validated['dasar'] ?? null,
                            'penandatangan_nama' => $validated['penandatangan_nama'] ?? null,
                            'penandatangan_nip' => $validated['penandatangan_nip'] ?? null,
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
                'menimbang' => $validated['menimbang'] ?? null,
                'dasar' => $validated['dasar'] ?? null,
                'tembusan' => $validated['tembusan'] ?? null,
                'penandatangan_nama' => $validated['penandatangan_nama'] ?? null,
                'penandatangan_nip' => $validated['penandatangan_nip'] ?? null,
                'nama_plh' => $request->input('nama_plh'),
                'has_seksi_employee' => (bool) $request->input('has_seksi_employee', false),
                'jumlah_buruh' => (int) $request->input('jumlah_buruh', 0),
                'tanda_setuju' => $request->input('tanda_setuju'),
                'keterangan' => $request->input('keterangan'),
                'status' => (in_array($authUser?->role, ['super_admin', 'admin'], true) && strtolower((string) $request->input('status')) === 'approved')
                    ? 'approved'
                    : 'draft',
                'approved_by' => (in_array($authUser?->role, ['super_admin', 'admin'], true) && strtolower((string) $request->input('status')) === 'approved')
                    ? (int) $authUser->id
                    : null,
                'created_by' => $authUser ? (int) $authUser->id : null,
            ]);

            if (isset($validated['employees']) && is_array($validated['employees'])) {
                $pivotData = [];
                foreach ($validated['employees'] as $emp) {
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

            if ($request->hasFile('file_surat')) {
                $folderName = $surat->nomor_surat
                    ? Str::slug($surat->nomor_surat)
                    : date('Y-m').'-'.$surat->id.'-'.Str::slug(substr($surat->maksud_tujuan ?: 'surat-tugas', 0, 40));
                $folder = 'surat-tugas/'.$folderName;
                $ext = $request->file('file_surat')->extension();
                $filename = 'dasar-surat.'.$ext;
                $path = $request->file('file_surat')->storeAs($folder, $filename);
                $surat->update(['file_surat_path' => $path]);
            }

            DB::commit();
            $surat->load('employees');

            // [DISABLED] Google Sheets sync — dimatikan sementara (lihat HANDOFF.md)
            // try {
            //     $sheetsService = new \App\Services\GoogleSheetsService();
            //     $sheetsService->appendSuratTugas([
            //         'id' => $surat->id,
            //         'unit_kerja' => $surat->employees->first()?->satuan_kerja ?? '',
            //         'employees' => $surat->employees->map(fn($e) => ['nama_lengkap' => $e->nama_lengkap])->toArray(),
            //         'nama_plh' => $surat->nama_plh ?? '',
            //         'nama_kegiatan' => $surat->maksud_tujuan ?? '',
            //         'tanggal_mulai' => $surat->tanggal_mulai?->format('Y-m-d') ?? '',
            //         'tanggal_selesai' => $surat->tanggal_selesai?->format('Y-m-d') ?? '',
            //         'sumber_dana' => $surat->sumber_dana ?? '',
            //         'file_path' => $surat->file_surat_path ?? '',
            //         'keterangan' => $surat->keterangan ?? '',
            //         'tanda_setuju' => $surat->tanda_setuju ?? '',
            //     ]);
            // } catch (\Exception $e) {
            //     \Illuminate\Support\Facades\Log::warning('GoogleSheets sync failed: ' . $e->getMessage());
            // }

            return response()->json([
                'message' => 'Pengajuan Surat Tugas berhasil direkam.',
                'data' => $surat,
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();

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

        if (! $isAdmin && in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
            return response()->json(['message' => 'Dokumen Surat Tugas yang telah disetujui hanya dapat diubah oleh Administrator.'], 403);
        }

        DB::beginTransaction();
        try {
            $updateTemplate = $this->resolveTemplate($validated);
            $updateData = [
                'maksud_tujuan' => $validated['maksud_tujuan'] ?? $surat->maksud_tujuan,
                'dasar_hukum' => $validated['dasar_hukum'] ?? null,
                'tanggal_mulai' => $validated['tanggal_mulai'] ?? $surat->tanggal_mulai,
                'tanggal_selesai' => $validated['tanggal_selesai'] ?? $surat->tanggal_selesai,
                'tempat_tujuan' => $validated['tempat_tujuan'] ?? null,
                'sumber_dana' => $request->input('sumber_dana', $surat->sumber_dana),
                'sumber_dana_other' => $request->input('sumber_dana_other', $surat->sumber_dana_other),
                'template_type' => $validated['template_type'] ?? null,
                'template_id' => $validated['template_id'] ?? $surat->template_id,
                'template_snapshot' => (function () use ($updateTemplate, $validated, $request, $surat) {
                    $baseSnapshot = $updateTemplate
                        ? $this->templateService->snapshot($updateTemplate, [
                            'menimbang' => $request->input('menimbang', $surat->menimbang),
                            'dasar' => $request->input('dasar', $surat->dasar),
                            'penandatangan_nama' => $validated['penandatangan_nama'] ?? $surat->penandatangan_nama,
                            'penandatangan_nip' => $validated['penandatangan_nip'] ?? $surat->penandatangan_nip,
                        ])
                        : ($surat->template_snapshot ?? []);

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
                'template_version' => $updateTemplate?->version ?? $surat->template_version,
                'menimbang' => $request->input('menimbang', $surat->menimbang),
                'dasar' => $request->input('dasar', $surat->dasar),
                'tembusan' => $request->input('tembusan', $surat->tembusan),
                'penandatangan_nama' => $validated['penandatangan_nama'] ?? null,
                'penandatangan_nip' => $validated['penandatangan_nip'] ?? null,
            ];

            if ($request->has('nomor_surat')) {
                $updateData['nomor_surat'] = $request->input('nomor_surat');
            }
            if ($request->has('kode_surat')) {
                $updateData['kode_surat'] = $request->input('kode_surat');
            }
            if ($request->has('task_type_id')) {
                $updateData['task_type_id'] = $request->input('task_type_id');
            }
            if ($request->has('sertakan_laporan')) {
                $updateData['sertakan_laporan'] = (bool) $request->input('sertakan_laporan');
            }
            if ($request->has('status')) {
                $targetStatus = strtolower((string) $request->input('status'));
                if (! $isAdmin && in_array($targetStatus, ['approved', 'completed', 'published', 'diterbitkan'])) {
                    return response()->json(['message' => 'Anda tidak memiliki otorisasi untuk mengubah status dokumen menjadi disetujui.'], 403);
                }
                $updateData['status'] = $targetStatus;
            }
            if ($request->has('nama_plh')) {
                $updateData['nama_plh'] = $request->input('nama_plh');
            }
            if ($request->has('has_seksi_employee')) {
                $updateData['has_seksi_employee'] = (bool) $request->input('has_seksi_employee');
            }
            if ($request->has('jumlah_buruh')) {
                $updateData['jumlah_buruh'] = max(0, min(100, (int) $request->input('jumlah_buruh')));
            }
            if ($request->has('tanda_setuju')) {
                $updateData['tanda_setuju'] = $request->input('tanda_setuju');
            }
            if ($request->has('keterangan')) {
                $updateData['keterangan'] = $request->input('keterangan');
            }
            if ($request->has('template_snapshot') && is_array($request->input('template_snapshot'))) {
                $baseSnapshot = $updateData['template_snapshot'] ?? $surat->template_snapshot ?? [];
                $updateData['template_snapshot'] = array_replace_recursive($baseSnapshot, $request->input('template_snapshot'));
            }

            $surat->update($updateData);

            if (isset($validated['employees']) && is_array($validated['employees'])) {
                $pivotData = [];
                foreach ($validated['employees'] as $emp) {
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

            if ($request->hasFile('file_surat')) {
                if ($surat->file_surat_path) {
                    Storage::delete($surat->file_surat_path);
                }
                $folderName = $surat->nomor_surat
                    ? Str::slug($surat->nomor_surat)
                    : date('Y-m').'-'.$surat->id.'-'.Str::slug(substr($surat->maksud_tujuan ?: 'surat-tugas', 0, 40));
                $folder = 'surat-tugas/'.$folderName;
                $ext = $request->file('file_surat')->extension();
                $filename = 'dasar-surat.'.$ext;
                $path = $request->file('file_surat')->storeAs($folder, $filename);
                $surat->update(['file_surat_path' => $path]);
            }

            DB::commit();
            $surat->load('employees');

            return response()->json([
                'message' => 'Data Surat Tugas berhasil diperbarui.',
                'data' => $surat,
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
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

        $surat = AssignmentLetter::findOrFail($cleanId);
        $cleanStatus = strtolower($request->status);
        $surat->status = $cleanStatus;

        if (in_array($cleanStatus, ['approved', 'completed'], true)) {
            $surat->approved_by = (int) $user->id;
        }

        if ($request->has('nomor_surat')) {
            $surat->nomor_surat = $request->nomor_surat;
        }

        $surat->save();

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
        $surat = AssignmentLetter::findOrFail($cleanId);

        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $isAdmin = in_array($user->role, ['admin', 'super_admin'], true);
        $isCreator = (int) $surat->created_by === (int) $user->id;

        if (! $isAdmin) {
            if (! $isCreator) {
                return response()->json(['message' => 'Anda tidak memiliki otorisasi untuk menghapus Surat Tugas ini.'], 403);
            }
            if (in_array(strtolower((string) $surat->status), ['approved', 'completed', 'published', 'diterbitkan'])) {
                return response()->json(['message' => 'Dokumen Surat Tugas yang telah disetujui hanya dapat dihapus atau diarsipkan oleh Administrator.'], 403);
            }
        }

        $surat->delete();

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

        $surat->restore();

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

        if ($surat->file_surat_path) {
            Storage::delete($surat->file_surat_path);
        }

        $surat->forceDelete();

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
            $count = $query->delete();
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
            $count = $query->restore();
            return response()->json(['message' => $count . ' dokumen berhasil dipulihkan.']);
        }

        return response()->json(['message' => '0 dokumen berhasil dipulihkan.']);
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
            if (Storage::exists($path)) {
                Storage::delete($path);
            }
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

        if (! $surat->file_surat_path || ! Storage::exists($surat->file_surat_path)) {
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
            $mime = Storage::mimeType($surat->file_surat_path) ?: 'application/pdf';
            return response()->json([
                'mime_type' => $mime,
                'file_name' => $filename,
                'data_url' => "data:{$mime};base64," . base64_encode(Storage::get($surat->file_surat_path)),
            ], 200, ['Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0']);
        }

        if ($request->query('stream') || $request->query('inline')) {
            $mime = Storage::mimeType($surat->file_surat_path) ?: 'application/pdf';
            return response(Storage::get($surat->file_surat_path), 200, [
                'Content-Type' => $mime,
                'Content-Disposition' => 'inline; filename="' . $filename . '"',
                'X-Content-Type-Options' => 'nosniff',
            ]);
        }

        return Storage::download($surat->file_surat_path, $filename, [
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

    public function approve(Request $request, string $id)
    {
        $cleanId = preg_replace('/^st-/', '', $id);
        if (! Str::isUuid($cleanId) && ! ctype_digit((string) $cleanId) && ! is_numeric($cleanId)) {
            return response()->json(['message' => 'Data surat tugas tidak ditemukan.'], 404);
        }
        $user = $request->user();
        if (! $user || (! in_array($user->role, ['admin', 'super_admin'], true) && ! $user->hasPermission('surat_tugas.approve'))) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menyetujui Surat Tugas.'], 403);
        }

        $request->validate([
            'nomor_surat' => 'nullable|string',
            'kode_surat' => 'nullable|string',
            'nama_kegiatan' => 'nullable|string',
            'tanggal_mulai' => 'nullable|date',
            'tanggal_selesai' => 'nullable|date',
            'tanggal_surat' => 'nullable|date',
            'sumber_dana' => 'nullable|string',
            'sumber_dana_other' => 'nullable|string',
            'template_type' => 'nullable|string|max:50',
            'menimbang' => 'nullable|array',
            'dasar' => 'nullable|array',
            'tembusan' => 'nullable|array',
            'penandatangan_nama' => 'nullable|string|max:255',
            'penandatangan_nip' => 'nullable|string|max:50',
            'employee_ids' => 'nullable|array',
            'status' => 'nullable|in:pending,approved,PENDING,APPROVED',
        ]);

        $surat = AssignmentLetter::findOrFail($cleanId);

        $targetStatus = $request->input('status'); // null if not provided

        DB::beginTransaction();
        try {
            $updateData = array_filter([
                'nomor_surat' => $request->nomor_surat,
                'kode_surat' => $request->kode_surat,
                'maksud_tujuan' => $request->nama_kegiatan,
                'tempat_tujuan' => $request->tempat_tujuan,
                'tanggal_mulai' => $request->tanggal_mulai,
                'tanggal_selesai' => $request->tanggal_selesai,
                'tanggal_surat' => $request->tanggal_surat,
                'sumber_dana' => $request->sumber_dana,
                'sumber_dana_other' => $request->sumber_dana_other,
                'template_type' => $request->template_type,
                'menimbang' => $request->menimbang,
                'dasar' => $request->dasar,
                'tembusan' => $request->tembusan,
                'penandatangan_nama' => $request->penandatangan_nama,
                'penandatangan_nip' => $request->penandatangan_nip,
            ], fn ($v) => $v !== null);

            // Only update status if explicitly provided
            if ($targetStatus) {
                $cleanTargetStatus = strtolower($targetStatus);
                $updateData['status'] = $cleanTargetStatus;
                if ($cleanTargetStatus === 'approved') {
                    $updateData['approved_by'] = (int) ($user?->id ?? auth()->id());
                }
            }

            if ($request->has('keterangan')) {
                $updateData['keterangan'] = $request->input('keterangan');
            }
            if ($request->has('template_snapshot') && is_array($request->input('template_snapshot'))) {
                $updateData['template_snapshot'] = array_replace_recursive($surat->template_snapshot ?? [], $request->input('template_snapshot'));
            }

            $surat->update($updateData);

            if ($request->has('employees') && is_array($request->employees)) {
                $pivotData = [];
                foreach ($request->employees as $emp) {
                    if (isset($emp['id'])) {
                        $pivotData[$emp['id']] = [
                            'peran' => $emp['peran'] ?? null,
                            'tanggal_mulai' => $emp['tanggal_mulai'] ?? null,
                            'tanggal_selesai' => $emp['tanggal_selesai'] ?? null,
                        ];
                    }
                }
                $surat->employees()->sync($pivotData);
            } elseif ($request->has('employee_ids') && is_array($request->employee_ids)) {
                $surat->employees()->sync($request->employee_ids);
            }

            DB::commit();

            // [DISABLED] Google Sheets update sync — dimatikan sementara (lihat HANDOFF.md)
            // dispatch(function () use ($surat) {
            //     try {
            //         $surat->load('employees');
            //         $sheetsService = new \App\Services\GoogleSheetsService();
            //         $sheetsService->updateSuratTugas([
            //             'id' => $surat->id,
            //             'unit_kerja' => $surat->employees->first()?->satuan_kerja ?? '',
            //             'employees' => $surat->employees->map(fn($e) => ['nama_lengkap' => $e->nama_lengkap])->toArray(),
            //             'nama_plh' => $surat->nama_plh ?? '',
            //             'nama_kegiatan' => $surat->maksud_tujuan ?? '',
            //             'tanggal_mulai' => $surat->tanggal_mulai?->format('Y-m-d') ?? '',
            //             'tanggal_selesai' => $surat->tanggal_selesai?->format('Y-m-d') ?? '',
            //             'sumber_dana' => $surat->sumber_dana ?? '',
            //             'file_path' => $surat->file_surat_path ?? '',
            //             'keterangan' => $surat->keterangan ?? '',
            //             'tanda_setuju' => $surat->tanda_setuju ?? '',
            //         ]);
            //     } catch (\Exception $e) {
            //         \Illuminate\Support\Facades\Log::warning('GoogleSheets update sync failed: ' . $e->getMessage());
            //     }
            // })->afterResponse();

            $statusLabel = $targetStatus === 'pending' ? 'diajukan untuk persetujuan' : ($targetStatus === 'approved' ? 'berhasil diterbitkan' : 'berhasil disimpan');

            return response()->json([
                'message' => "Surat Tugas {$statusLabel}.",
                'data' => $surat->load('employees'),
            ]);
        } catch (Exception $e) {
            DB::rollBack();

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

        return $templateCode ? $query->where('code', $templateCode)->first() : null;
    }
}
