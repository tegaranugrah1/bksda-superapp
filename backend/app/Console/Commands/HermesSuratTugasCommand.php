<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\StTaskType;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Services\AssignmentLetterConflictService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class HermesSuratTugasCommand extends Command
{
    protected $signature = 'hermes:st 
                            {action : check-conflict | create-draft | list-employees | approve-draft}
                            {--employees= : Comma-separated employee IDs or NIPs}
                            {--start= : Start date (YYYY-MM-DD)}
                            {--end= : End date (YYYY-MM-DD)}
                            {--pemohon= : Pemohon Employee ID or NIP}
                            {--task-type= : Task type ID or code (luar_wilayah, dalam_kawasan, dll)}
                            {--kegiatan= : Rangka / kegiatan text}
                            {--asal= : Kota asal (default: Samarinda)}
                            {--tujuan= : Kota/kabupaten tujuan}
                            {--tempat= : Kawasan / tempat spesifik}
                            {--sumber-dana= : Sumber dana (dipa, folu, kideco, cop, bosf, mja, tjiwi_kimia, can, alert, dl1, other)}
                            {--sumber-dana-other= : Keterangan detail mitra / pembebanan jika sumber dana other/kerjasama luar}
                            {--ketua-tim= : Employee ID, NIP, or name for Ketua Tim}
                            {--draft= : Draft assignment letter number (e.g. ST.DRAFT/...) or ID}
                            {--nomor= : Official ST sequential number (e.g. 244)}
                            {--klasifikasi= : Classification code (e.g. KSA.08.09)}
                            {--approver= : Approver user ID or NIP (default: Tegar)}
                            {--force : Force create draft even if conflicts exist}';

    protected $description = 'Helper command for Hermes AI to check conflicts and create Surat Tugas drafts';

    public function handle(AssignmentLetterConflictService $conflictService): int
    {
        $action = $this->argument('action');

        return match ($action) {
            'check-conflict' => $this->handleCheckConflict($conflictService),
            'create-draft' => $this->handleCreateDraft($conflictService),
            'list-employees' => $this->handleListEmployees(),
            'approve-draft' => $this->handleApproveDraft(),
            default => $this->errorJson("Unknown action: {$action}"),
        };
    }

    private function handleCheckConflict(AssignmentLetterConflictService $conflictService): int
    {
        $employeeIds = $this->parseEmployeeIds($this->option('employees'));
        $ketuaTimInput = $this->option('ketua-tim');
        if ($ketuaTimInput) {
            $parsedKetua = $this->parseEmployeeIds($ketuaTimInput);
            if (! empty($parsedKetua)) {
                $employeeIds = array_values(array_unique(array_merge([$parsedKetua[0]], $employeeIds)));
            }
        }
        $start = $this->option('start');
        $end = $this->option('end') ?: $start;

        if (empty($employeeIds) || ! $start) {
            return $this->errorJson('--employees and --start are required');
        }

        $check = $conflictService->checkConflicts($employeeIds, $start, $end);
        $this->line(json_encode($check, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return $check['has_conflict'] ? 1 : 0;
    }

    private function handleCreateDraft(AssignmentLetterConflictService $conflictService): int
    {
        $pemohonInput = $this->option('pemohon');
        $employeeIds = $this->parseEmployeeIds($this->option('employees'));
        $ketuaTimInput = $this->option('ketua-tim');
        if ($ketuaTimInput) {
            $parsedKetua = $this->parseEmployeeIds($ketuaTimInput);
            if (! empty($parsedKetua)) {
                $employeeIds = array_values(array_unique(array_merge([$parsedKetua[0]], $employeeIds)));
            }
        }
        $start = $this->option('start');
        $end = $this->option('end') ?: $start;
        $rawKegiatan = $this->option('kegiatan') ?: 'Perjalanan Dinas';
        $asal = $this->titleCaseIndonesian($this->option('asal') ?: 'Samarinda');
        $tujuan = $this->titleCaseIndonesian($this->option('tujuan') ?: '');
        $tempat = $this->titleCaseIndonesian($this->option('tempat') ?: '');
        [$sumberDana, $sumberDanaOther] = $this->normalizeSumberDana(
            $this->option('sumber-dana') ?: 'dipa',
            $this->option('sumber-dana-other')
        );
        $force = (bool) $this->option('force');

        if (empty($employeeIds) || ! $start) {
            return $this->errorJson('--employees and --start are required');
        }

        // 1. Check Conflicts first unless forced
        $conflictCheck = $conflictService->checkConflicts($employeeIds, $start, $end);
        if ($conflictCheck['has_conflict'] && ! $force) {
            $this->line(json_encode([
                'success' => false,
                'error' => 'Jadwal Bentrok',
                'conflict' => $conflictCheck,
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return 2;
        }

        // 2. Resolve Pemohon & User Creator
        $pemohon = is_numeric($pemohonInput)
            ? Employee::find($pemohonInput)
            : Employee::where('nip', $pemohonInput)->first();

        $creatorUser = null;
        if ($pemohon && $pemohon->nip) {
            $creatorUser = User::where('username', $pemohon->nip)->first();
        }
        $createdById = $creatorUser ? $creatorUser->id : 125; // fallback to admin Tegar

        // 3. Resolve Task Type
        $taskTypeInput = $this->option('task-type');
        $taskType = null;
        if ($taskTypeInput) {
            $taskType = is_numeric($taskTypeInput)
                ? StTaskType::find($taskTypeInput)
                : StTaskType::where('kode', $taskTypeInput)
                    ->orWhere('nama', 'ilike', "%{$taskTypeInput}%")
                    ->first();
        }

        // Auto-detect luar_wilayah if asal and tujuan are both specified and different
        if ($asal && $tujuan && strcasecmp($asal, $tujuan) !== 0) {
            if (! $taskType || in_array($taskType->kode, ['dalam_kawasan', 'kegiatan_1_hari'], true)) {
                $taskType = StTaskType::where('kode', 'luar_wilayah')->first();
            }
        }

        if (! $taskType) {
            $taskType = StTaskType::where('kode', 'luar_wilayah')->first();
        }

        $taskTypeId = $taskType ? $taskType->id : 1;
        $taskTypeNama = $taskType ? $taskType->nama : 'Perjalanan Dinas Luar Wilayah';
        $taskTypeKode = $taskType ? $taskType->kode : 'luar_wilayah';

        // 4. Title Case formatting for Kegiatan
        $cleanKegiatan = $this->titleCaseIndonesian($rawKegiatan);

        // 5. Build Diktum Maksud Tujuan
        $diktum = $this->buildDiktum($taskTypeKode, $asal, $tujuan, $cleanKegiatan, $tempat, $start, $end);

        // 6. Create Assignment Letter
        $draftNumber = 'ST.DRAFT/'.strtoupper(substr(md5(uniqid('', true)), 0, 8));
        $letter = AssignmentLetter::create([
            'nomor_surat' => $draftNumber,
            'status' => 'draft',
            'maksud_tujuan' => $diktum,
            'tempat_tujuan' => $tempat ?: $tujuan,
            'tanggal_mulai' => $start,
            'tanggal_selesai' => $end,
            'sumber_dana' => $sumberDana,
            'sumber_dana_other' => $sumberDanaOther,
            'task_type_id' => $taskTypeId,
            'created_by' => $createdById,
        ]);

        // 7. Attach Employees
        $attached = [];
        foreach ($employeeIds as $idx => $empId) {
            $emp = Employee::find($empId);
            if ($emp) {
                $letter->employees()->attach($empId, [
                    'peran' => $idx === 0 ? 'Ketua Tim' : 'Anggota',
                    'tanggal_mulai' => $start,
                    'tanggal_selesai' => $end,
                ]);
                $attached[] = [
                    'id' => $emp->id,
                    'nama_lengkap' => $emp->nama_lengkap,
                    'nip' => $emp->nip,
                    'jabatan' => $emp->jabatan,
                    'peran' => $idx === 0 ? 'Ketua Tim' : 'Anggota',
                ];
            }
        }

        $this->line(json_encode([
            'success' => true,
            'letter_id' => $letter->id,
            'nomor_surat' => $letter->nomor_surat,
            'status' => $letter->status,
            'task_type_id' => $taskTypeId,
            'task_type_nama' => $taskTypeNama,
            'task_type_kode' => $taskTypeKode,
            'diktum' => $diktum,
            'sumber_dana' => $sumberDana,
            'sumber_dana_other' => $sumberDanaOther,
            'tanggal_mulai' => $start,
            'tanggal_selesai' => $end,
            'has_conflict' => $conflictCheck['has_conflict'],
            'conflict_warning' => $conflictCheck['conflicts'] ?? [],
            'employees' => $attached,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return 0;
    }

    private function handleListEmployees(): int
    {
        $employees = Employee::where('is_active', true)
            ->where('nama_lengkap', 'NOT LIKE', '%administrator%')
            ->orderBy('nama_lengkap', 'asc')
            ->get(['id', 'nama_lengkap', 'nip', 'jabatan']);

        $this->line(json_encode($employees, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return 0;
    }

    private function handleApproveDraft(): int
    {
        $draftInput = $this->option('draft');
        $nomor = trim((string) $this->option('nomor'));
        $klasifikasi = trim((string) $this->option('klasifikasi')) ?: 'KSA.08.09';
        $approverInput = $this->option('approver') ?: '199307222022031002'; // Tegar

        if (! $nomor) {
            return $this->errorJson('--nomor is required for approve-draft');
        }

        // Clean up nomor if user passed "ST.244" or "Nomor 244" or "Nomor surat 244"
        if (preg_match('/(?:ST\.?\s*|nomor\s*:\s*|nomor\s+surat\s+|nomor\s+)?(\d+)/i', $nomor, $m)) {
            $nomor = $m[1];
        }

        // Clean up klasifikasi (uppercase, strip leading slashes or prefixes)
        $klasifikasi = strtoupper(trim(preg_replace('/^(?:klasifikasi\s*:\s*|kode\s*:\s*)/i', '', $klasifikasi)));
        if (! str_starts_with($klasifikasi, 'KSA') && ! str_starts_with($klasifikasi, 'PEG') && ! str_starts_with($klasifikasi, 'KSDA')) {
            $klasifikasi = 'KSA.' . ltrim($klasifikasi, '.');
        }

        // Find draft
        $query = AssignmentLetter::query();
        if ($draftInput) {
            $cleanDraft = trim($draftInput);
            $query->where(function ($q) use ($cleanDraft) {
                $q->where('nomor_surat', $cleanDraft)
                    ->orWhere('nomor_surat', 'like', "%{$cleanDraft}%");
                if (Str::isUuid($cleanDraft)) {
                    $q->orWhere('id', $cleanDraft);
                }
            });
        } else {
            // Default: find the latest draft
            $query->where('status', 'draft')->latest();
        }

        $letter = $query->first();
        if (! $letter) {
            return $this->errorJson('Draf surat tugas tidak ditemukan');
        }

        // Resolve approver user
        $approver = is_numeric($approverInput)
            ? User::find($approverInput)
            : User::where('username', $approverInput)->first();
        $approverId = $approver ? $approver->id : 125;

        // Build official number: ST.244/K.18/TU/KSA.08.09/B/11/2026
        $date = Carbon::parse($letter->tanggal_mulai ?: now());
        $month = $date->format('m');
        $year = $date->format('Y');

        $kodeSurat = "K.18/TU/{$klasifikasi}/B";
        $officialNumber = "ST.{$nomor}/{$kodeSurat}/{$month}/{$year}";

        $letter->update([
            'nomor_surat' => $officialNumber,
            'kode_surat' => $kodeSurat,
            'tanggal_surat' => now()->toDateString(),
            'status' => 'approved',
            'tanda_setuju' => 'sudah',
            'approved_by' => $approverId,
        ]);

        // Get creator / pemohon details
        $creator = User::find($letter->created_by);
        $pemohonEmp = null;
        if ($creator && $creator->username) {
            $pemohonEmp = Employee::where('nip', $creator->username)->first();
        }

        // Broadcast event
        try {
            event(new \App\Events\AdminInboxChanged('surat_tugas', 'approved', (string) $letter->id));
        } catch (\Throwable) {
        }

        $this->line(json_encode([
            'success' => true,
            'letter_id' => $letter->id,
            'nomor_resmi' => $letter->nomor_surat,
            'kode_surat' => $letter->kode_surat,
            'status' => $letter->status,
            'maksud_tujuan' => $letter->maksud_tujuan,
            'tanggal_mulai' => $letter->tanggal_mulai?->format('Y-m-d'),
            'tanggal_selesai' => $letter->tanggal_selesai?->format('Y-m-d'),
            'pemohon_nama' => $pemohonEmp ? $pemohonEmp->nama_lengkap : ($creator ? $creator->name : 'Anisa Rahmawati, S.Hut.'),
            'pemohon_nip' => $pemohonEmp ? $pemohonEmp->nip : ($creator ? $creator->username : ''),
            'pemohon_phone' => '089517978511',
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return 0;
    }

    private function buildDiktum(?string $taskTypeCode, string $asal, string $tujuan, string $kegiatan, string $tempat, string $start, string $end): string
    {
        $code = strtolower((string) $taskTypeCode);
        $tempatStr = $tempat ? " di {$tempat}" : '';

        // Determine base text
        if ($code === 'dalam_kawasan' || ($code === 'dalam' && ! ($asal && $tujuan && strcasecmp($asal, $tujuan) !== 0))) {
            $lokasi = $tujuan ?: $asal ?: 'Wilayah Kerja';
            $base = "Melaksanakan perjalanan dinas di {$lokasi} dalam rangka {$kegiatan}{$tempatStr}";
        } elseif ($code === 'kegiatan_1_hari' || str_contains($code, '1_hari')) {
            $lokasi = $tujuan ?: $asal ?: 'Samarinda';
            $base = "Melaksanakan Kegiatan {$kegiatan} pada {$tempat} di {$lokasi}";
        } elseif ($code === 'jenis_kegiatan' || str_contains($code, 'pengawasan')) {
            $base = "Melaksanakan Perjalanan Dinas dari {$asal} ke {$tujuan} untuk Pengawasan dalam rangka {$kegiatan}{$tempatStr}";
        } elseif ($code === 'menugaskan_staf') {
            $lokasi = $tujuan ?: $asal ?: 'Samarinda';
            $base = "Menugaskan Staf untuk {$kegiatan} pada {$tempat} di {$lokasi}";
        } else {
            // Default: Luar Wilayah (has origin and destination)
            if ($asal && $tujuan && strcasecmp($asal, $tujuan) !== 0) {
                $base = "Melaksanakan Perjalanan Dinas dari {$asal} ke {$tujuan} dalam rangka {$kegiatan}{$tempatStr}";
            } elseif ($asal || $tujuan) {
                $lokasi = $tujuan ?: $asal;
                $base = "Melaksanakan perjalanan dinas di {$lokasi} dalam rangka {$kegiatan}{$tempatStr}";
            } else {
                $base = "Melaksanakan Perjalanan Dinas dalam rangka {$kegiatan}{$tempatStr}";
            }
        }

        // Add standard duration suffix (selama ...)
        $base = rtrim(trim($base), ';.,');
        $durationSuffix = $this->buildDurationSuffix($start, $end);

        return "{$base}{$durationSuffix}";
    }

    private function buildDurationSuffix(string $start, string $end): string
    {
        $startDate = Carbon::parse($start);
        $endDate = Carbon::parse($end ?: $start);
        $days = (int) $startDate->diffInDays($endDate) + 1;

        $indonesianMonths = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        $formatDate = function (Carbon $d) use ($indonesianMonths) {
            return $d->day . ' ' . $indonesianMonths[$d->month] . ' ' . $d->year;
        };

        $startFormatted = $formatDate($startDate);
        $endFormatted = $formatDate($endDate);

        $angkaTerbilang = [
            1 => 'satu', 2 => 'dua', 3 => 'tiga', 4 => 'empat', 5 => 'lima',
            6 => 'enam', 7 => 'tujuh', 8 => 'delapan', 9 => 'sembilan', 10 => 'sepuluh',
            11 => 'sebelas', 12 => 'dua belas', 13 => 'tiga belas', 14 => 'empat belas', 15 => 'lima belas'
        ];
        $daysWord = $angkaTerbilang[$days] ?? (string) $days;

        if ($days === 1 || $start === $end) {
            return ", selama 1 (satu) hari pada tanggal {$startFormatted};";
        }

        return ", selama {$days} ({$daysWord}) hari terhitung mulai tanggal {$startFormatted} sampai dengan {$endFormatted};";
    }

    /**
     * Capitalize words into formal Indonesian title case, keeping short prepositions lowercase.
     */
    public function titleCaseIndonesian(string $text): string
    {
        $text = trim($text);
        if ($text === '') {
            return '';
        }

        $lowercaseWords = ['di', 'ke', 'dari', 'dan', 'pada', 'untuk', 'dalam', 'yang', 'atau', 's/d', 'sd'];
        $words = preg_split('/\s+/', $text);
        $result = [];

        foreach ($words as $i => $word) {
            $lower = mb_strtolower($word);
            if ($i > 0 && in_array($lower, $lowercaseWords, true)) {
                $result[] = $lower;
            } else {
                // Keep Roman numerals or abbreviations like BMN, CA, TN, FOLU, SPPD all uppercase
                if (preg_match('/^(?:[IVXLCDM]+|[A-Z]{2,})$/', $word)) {
                    $result[] = $word;
                } else {
                    $result[] = mb_convert_case($word, MB_CASE_TITLE, 'UTF-8');
                }
            }
        }

        return implode(' ', $result);
    }

    /**
     * Map natural text or partner names to standard sumber_dana code and optional other description.
     */
    private function normalizeSumberDana(string $input, ?string $otherInput): array
    {
        $val = strtolower(trim($input));
        $other = $otherInput ? trim($otherInput) : null;

        if (str_contains($val, 'dipa')) {
            return ['dipa', null];
        }
        if (str_contains($val, 'folu')) {
            return ['folu_nc23', null];
        }
        if (str_contains($val, 'kideco') || str_contains($val, 'kja')) {
            return ['kideco', null];
        }
        if (str_contains($val, 'jayantara') || str_contains($val, 'mja')) {
            return ['multi_jayantara', null];
        }
        if (str_contains($val, 'cop')) {
            return ['cop', null];
        }
        if (str_contains($val, 'tjiwi')) {
            return ['tjiwi_kimia', null];
        }
        if (str_contains($val, 'bosf') || str_contains($val, 'borneo')) {
            return ['bosf', null];
        }
        if (str_contains($val, 'can')) {
            return ['can', null];
        }
        if (str_contains($val, 'alert')) {
            return ['alert', null];
        }
        if (str_contains($val, 'dl1') || str_contains($val, 'dl 1') || str_contains($val, 'tanpa') || str_contains($val, 'tidak ada')) {
            return ['dl1', null];
        }

        // If user specified another partner (e.g., PT Berau Coal, Yayasan Badak Indonesia, etc.)
        if (str_contains($val, 'kerjasama') || str_contains($val, 'pks') || str_contains($val, 'other') || str_contains($val, 'lain') || $other) {
            $desc = $other ?: trim(preg_replace('/^(sumber dana|dana|kerjasama|pks)\s*:?\s*/i', '', $input));
            return ['other', $desc ?: 'Kerjasama Mitra / Pihak Ketiga'];
        }

        return ['dipa', null];
    }

    private function parseEmployeeIds(?string $input): array
    {
        if (! $input) {
            return [];
        }

        $items = array_map('trim', explode(',', $input));
        $ids = [];

        foreach ($items as $item) {
            if (is_numeric($item)) {
                $ids[] = (int) $item;
            } else {
                $emp = Employee::where('nip', $item)
                    ->orWhere('nama_lengkap', 'ilike', "%{$item}%")
                    ->first();
                if ($emp) {
                    $ids[] = $emp->id;
                }
            }
        }

        return array_unique($ids);
    }

    private function errorJson(string $message): int
    {
        $this->error(json_encode(['success' => false, 'error' => $message]));

        return 1;
    }
}
