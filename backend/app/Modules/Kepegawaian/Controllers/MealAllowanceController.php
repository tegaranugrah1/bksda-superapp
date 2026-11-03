<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\Holiday;
use App\Modules\Kepegawaian\Models\MealAllowanceBatch;
use App\Modules\Kepegawaian\Models\MealAllowanceItem;
use App\Modules\Kepegawaian\Services\AttendanceReconcilerService;
use App\Modules\Kepegawaian\Services\HolidayCalendarHelper;
use App\Modules\Kepegawaian\Services\MealAllowanceExcelExport;
use App\Modules\Kepegawaian\Services\SikadirParserService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MealAllowanceController extends Controller
{
    public function __construct(
        protected SikadirParserService $parserService,
        protected AttendanceReconcilerService $reconcilerService,
        protected MealAllowanceExcelExport $excelExport
    ) {}

    /**
     * Upload & Reconcile SIKADIR presensi with Surat Tugas and Cuti.
     * Endpoint: POST /api/kepegawaian/uang-makan/reconcile
     */
    public function reconcile(Request $request): JsonResponse
    {
        $request->validate([
            'files' => 'nullable|array',
            'files.*' => [
                'file',
                'max:25600',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $ext = strtolower($value->getClientOriginalExtension());
                        if (!in_array($ext, ['xls', 'xlsx', 'zip', 'html', 'htm'])) {
                            $fail("Berkas {$value->getClientOriginalName()} harus berekstensi .xls, .xlsx, atau .zip.");
                        }
                    }
                },
            ],
            'file' => 'nullable|file|max:51200',
            'periode' => 'nullable|string|regex:/^\d{4}-\d{2}$/',
            'overrides' => 'nullable|array',
        ]);

        $uploadedFiles = [];
        if ($request->hasFile('files')) {
            $uploadedFiles = $request->file('files');
        } elseif ($request->hasFile('file')) {
            $uploadedFiles = [$request->file('file')];
        }

        if (empty($uploadedFiles)) {
            return response()->json([
                'success' => false,
                'message' => 'Silakan pilih atau unggah minimal satu berkas presensi (.xls / .xlsx / .zip).',
            ], 422);
        }

        // 1. Parse seluruh file SIKADIR
        $parsedList = $this->parserService->parseMultiple($uploadedFiles);

        if (empty($parsedList)) {
            return response()->json([
                'success' => false,
                'message' => 'Berkas tidak dapat diproses atau format tabel SIKADIR tidak dikenali.',
            ], 422);
        }

        // 2. Deteksi konsistensi periode bulan pada seluruh berkas yang diunggah
        $periodGroups = [];
        foreach ($parsedList as $item) {
            $p = $item['periode_bulan'] ?? null;
            $pKey = $p ?: 'unknown';
            $pLabel = $item['bulan_text'] ?: ($p ?: 'Bulan Tidak Terdeteksi');

            if (!isset($periodGroups[$pKey])) {
                $periodGroups[$pKey] = [
                    'periode' => $p,
                    'label' => $pLabel,
                    'files' => [],
                ];
            }

            $periodGroups[$pKey]['files'][] = [
                'filename' => $item['filename'] ?: 'berkas.xls',
                'nama' => $item['nama_lengkap'] ?: 'Pegawai',
                'nip' => $item['clean_nip'] ?: '-',
                'periode' => $p,
                'label' => $pLabel,
            ];
        }

        // Jika terdeteksi berkas dengan lebih dari 1 periode bulan yang berbeda:
        if (count($periodGroups) > 1) {
            return response()->json([
                'success' => false,
                'error_code' => 'MISMATCHED_PERIODS',
                'message' => 'Ditemukan berkas dengan periode bulan yang berbeda saat upload bersamaan. Rekonsiliasi uang makan harus dilakukan untuk satu periode bulan yang sama.',
                'groups' => array_values($periodGroups),
            ], 422);
        }

        // 3. Tentukan periode aktif:
        // Prioritaskan periode yang terdeteksi dari metadata/tanggal berkas SIKADIR
        $detectedFilePeriod = $parsedList[0]['periode_bulan'] ?? null;
        $targetPeriode = $detectedFilePeriod ?: ($request->input('periode') ?: Carbon::now()->format('Y-m'));
        $manualOverrides = $request->input('overrides', []);

        $carbonPeriod = Carbon::createFromFormat('Y-m', $targetPeriode)->startOfMonth();
        $daysInMonth = $carbonPeriod->daysInMonth;
        $year = (int) $carbonPeriod->format('Y');
        $month = (int) $carbonPeriod->format('m');
        $holidays = HolidayCalendarHelper::getHolidaysForMonth($year, $month);

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];
        $detectedPeriodLabel = ($monthNames[$month] ?? $month) . ' ' . $year;

        $reconciledItems = [];
        $totalBruto = 0;
        $totalPph21 = 0;
        $totalNetto = 0;
        $totalOverriddenDays = 0;

        foreach ($parsedList as $parsedEmployee) {
            $cleanNip = $parsedEmployee['clean_nip'];
            $empOverrides = $manualOverrides[$cleanNip] ?? [];

            $reconciled = $this->reconcilerService->reconcile($parsedEmployee, $targetPeriode, $empOverrides);
            $reconciledItems[] = $reconciled;

            $totalBruto += $reconciled['uang_makan_bruto'];
            $totalPph21 += $reconciled['potongan_pph21'];
            $totalNetto += $reconciled['uang_makan_netto'];
            $totalOverriddenDays += count($reconciled['override_logs']);
        }

        return response()->json([
            'success' => true,
            'message' => count($reconciledItems) . ' pegawai berhasil diekstraksi dan direkonsiliasi.',
            'data' => [
                'periode_bulan' => $targetPeriode,
                'detected_period' => $targetPeriode,
                'detected_month' => $month,
                'detected_year' => $year,
                'detected_period_label' => $detectedPeriodLabel,
                'days_in_month' => $daysInMonth,
                'holidays' => $holidays,
                'total_pegawai' => count($reconciledItems),
                'total_bruto' => $totalBruto,
                'total_pph21' => $totalPph21,
                'total_netto' => $totalNetto,
                'total_override_detected' => $totalOverriddenDays,
                'items' => $reconciledItems,
            ],
        ]);
    }

    /**
     * Simpan batch hasil rekonsiliasi yang sudah disetujui admin.
     * Endpoint: POST /api/kepegawaian/uang-makan/batches
     */
    public function storeBatch(Request $request): JsonResponse
    {
        // Normalize frontend payload aliases (title -> nama_batch, month/year -> periode_bulan, etc.)
        $input = $request->all();
        if (empty($input['periode_bulan']) && !empty($input['year']) && !empty($input['month'])) {
            $input['periode_bulan'] = sprintf('%04d-%02d', (int)$input['year'], (int)$input['month']);
        }
        if (empty($input['nama_batch']) && !empty($input['title'])) {
            $input['nama_batch'] = $input['title'];
        }
        if (isset($input['items']) && is_array($input['items'])) {
            foreach ($input['items'] as &$it) {
                if (empty($it['nama_lengkap']) && !empty($it['nama'])) $it['nama_lengkap'] = $it['nama'];
                if (!isset($it['tarif_harian']) && isset($it['tarif'])) $it['tarif_harian'] = $it['tarif'];
                if (!isset($it['persen_pph21']) && isset($it['pph_rate'])) $it['persen_pph21'] = $it['pph_rate'];
                if (!isset($it['jml_hadir']) && isset($it['total_hadir'])) $it['jml_hadir'] = $it['total_hadir'];
                if (!isset($it['jml_pd']) && isset($it['total_pd'])) $it['jml_pd'] = $it['total_pd'];
                if (!isset($it['jml_cuti']) && isset($it['total_cuti'])) $it['jml_cuti'] = $it['total_cuti'];
                if (!isset($it['jml_sakit']) && isset($it['total_sakit'])) $it['jml_sakit'] = $it['total_sakit'];
                if (!isset($it['jml_izin']) && isset($it['total_izin'])) $it['jml_izin'] = $it['total_izin'];
                if (!isset($it['jml_alpa']) && isset($it['total_alpa'])) $it['jml_alpa'] = $it['total_alpa'];
                if (!isset($it['uang_makan_bruto']) && isset($it['total_bruto'])) $it['uang_makan_bruto'] = $it['total_bruto'];
                if (!isset($it['potongan_pph21']) && isset($it['total_pph'])) $it['potongan_pph21'] = $it['total_pph'];
                if (!isset($it['uang_makan_netto']) && isset($it['total_netto'])) $it['uang_makan_netto'] = $it['total_netto'];
                if (!isset($it['jml_hari_kerja'])) $it['jml_hari_kerja'] = $it['total_working_days'] ?? 22;
                if (!isset($it['nama_bank']) && isset($it['bank'])) $it['nama_bank'] = $it['bank'];
                if (!isset($it['nomor_rekening']) && isset($it['rekening'])) $it['nomor_rekening'] = $it['rekening'];
            }
            unset($it);
        }
        $request->merge($input);

        $validated = $request->validate([
            'periode_bulan' => 'required|string|regex:/^\d{4}-\d{2}$/',
            'nama_batch' => 'required|string|max:255',
            'penandatangan_nama' => 'nullable|string|max:255',
            'penandatangan_nip' => 'nullable|string|max:50',
            'penandatangan_jabatan' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.nip' => 'required|string',
            'items.*.nama_lengkap' => 'required|string|max:255',
            'items.*.jabatan' => 'nullable|string|max:255',
            'items.*.jenis_pegawai' => 'nullable|string|max:20',
            'items.*.tahun_angkatan' => 'nullable|integer',
            'items.*.satuan_kerja' => 'nullable|string|max:255',
            'items.*.golongan' => 'nullable|string|max:50',
            'items.*.nama_bank' => 'nullable|string|max:50',
            'items.*.nomor_rekening' => 'nullable|string|max:100',
            'items.*.tarif_harian' => 'required|numeric|min:0',
            'items.*.persen_pph21' => 'required|numeric|min:0',
            'items.*.jml_hari_kerja' => 'required|integer|min:0',
            'items.*.jml_hadir' => 'required|integer|min:0',
            'items.*.jml_pd' => 'required|integer|min:0',
            'items.*.jml_cuti' => 'required|integer|min:0',
            'items.*.jml_sakit' => 'required|integer|min:0',
            'items.*.jml_izin' => 'required|integer|min:0',
            'items.*.jml_alpa' => 'required|integer|min:0',
            'items.*.uang_makan_bruto' => 'required|numeric|min:0',
            'items.*.potongan_pph21' => 'required|numeric|min:0',
            'items.*.uang_makan_netto' => 'required|numeric|min:0',
            'items.*.daily_matrix' => 'required|array',
            'items.*.override_logs' => 'nullable|array',
        ]);

        $batch = DB::transaction(function () use ($validated, $request) {
            $totalBruto = collect($validated['items'])->sum('uang_makan_bruto');
            $totalPph21 = collect($validated['items'])->sum('potongan_pph21');
            $totalNetto = collect($validated['items'])->sum('uang_makan_netto');
            $totalHariKerja = $validated['items'][0]['jml_hari_kerja'] ?? 22;

            $batch = MealAllowanceBatch::create([
                'periode_bulan' => $validated['periode_bulan'],
                'nama_batch' => strip_tags($validated['nama_batch']),
                'total_pegawai' => count($validated['items']),
                'total_hari_kerja' => $totalHariKerja,
                'total_bruto' => $totalBruto,
                'total_pph21' => $totalPph21,
                'total_netto' => $totalNetto,
                'penandatangan_nama' => strip_tags($validated['penandatangan_nama'] ?? 'Dheny Mardiono, S.Hut., M.Sc.'),
                'penandatangan_nip' => strip_tags($validated['penandatangan_nip'] ?? '19750314 199903 1 004'),
                'penandatangan_jabatan' => strip_tags($validated['penandatangan_jabatan'] ?? 'Kepala Subbagian Tata Usaha'),
                'status' => 'final',
                'created_by' => $request->user()?->id,
            ]);

            foreach ($validated['items'] as $item) {
                MealAllowanceItem::create([
                    'batch_id' => $batch->id,
                    'employee_id' => $item['employee_id'] ?? null,
                    'nip' => preg_replace('/[^0-9]/', '', $item['nip']),
                    'nama_lengkap' => strip_tags($item['nama_lengkap']),
                    'jabatan' => strip_tags($item['jabatan'] ?? ''),
                    'jenis_pegawai' => $item['jenis_pegawai'] ?? 'PNS',
                    'tahun_angkatan' => $item['tahun_angkatan'] ?? null,
                    'satuan_kerja' => strip_tags($item['satuan_kerja'] ?? ''),
                    'golongan' => strip_tags($item['golongan'] ?? ''),
                    'nama_bank' => $item['nama_bank'] ?? 'BRI',
                    'nomor_rekening' => $item['nomor_rekening'] ?? null,
                    'tarif_harian' => $item['tarif_harian'],
                    'persen_pph21' => $item['persen_pph21'],
                    'jml_hari_kerja' => $item['jml_hari_kerja'],
                    'jml_hadir' => $item['jml_hadir'],
                    'jml_pd' => $item['jml_pd'],
                    'jml_cuti' => $item['jml_cuti'],
                    'jml_sakit' => $item['jml_sakit'],
                    'jml_izin' => $item['jml_izin'],
                    'jml_alpa' => $item['jml_alpa'],
                    'uang_makan_bruto' => $item['uang_makan_bruto'],
                    'potongan_pph21' => $item['potongan_pph21'],
                    'uang_makan_netto' => $item['uang_makan_netto'],
                    'daily_matrix' => $item['daily_matrix'],
                    'override_logs' => $item['override_logs'] ?? [],
                ]);
            }

            return $batch;
        });

        return response()->json([
            'success' => true,
            'message' => 'Batch perhitungan uang makan berhasil disimpan ke database.',
            'data' => $batch->load('items'),
        ], 201);
    }

    /**
     * Daftar seluruh batch tersimpan.
     * Endpoint: GET /api/kepegawaian/uang-makan/batches
     */
    public function indexBatches(Request $request): JsonResponse
    {
        $query = MealAllowanceBatch::with('creator:id,name,username')
            ->orderBy('periode_bulan', 'desc')
            ->orderBy('created_at', 'desc');

        if ($request->filled('periode')) {
            $query->where('periode_bulan', $request->query('periode'));
        }

        $batches = $query->paginate($request->integer('per_page', 10));

        return response()->json([
            'success' => true,
            'data' => $batches,
        ]);
    }

    /**
     * Detail batch beserta item per pegawai.
     * Endpoint: GET /api/kepegawaian/uang-makan/batches/{id}
     */
    public function showBatch(int $id): JsonResponse
    {
        $batch = MealAllowanceBatch::with(['items', 'creator:id,name,username'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $batch,
        ]);
    }

    /**
     * Hapus batch perhitungan.
     * Endpoint: DELETE /api/kepegawaian/uang-makan/batches/{id}
     */
    public function destroyBatch(int $id): JsonResponse
    {
        $batch = MealAllowanceBatch::findOrFail($id);
        $batch->delete();

        return response()->json([
            'success' => true,
            'message' => 'Batch perhitungan uang makan berhasil dihapus.',
        ]);
    }

    /**
     * Ekspor berkas Excel 2-Sheet (.xlsx) langsung streaming.
     * Endpoint: POST /api/kepegawaian/uang-makan/export-excel
     */
    public function exportExcel(Request $request): StreamedResponse|JsonResponse
    {
        $request->validate([
            'batch_id' => 'nullable|integer',
            'periode_bulan' => 'nullable|string|regex:/^\d{4}-\d{2}$/',
            'penandatangan_nama' => 'nullable|string|max:255',
            'penandatangan_nip' => 'nullable|string|max:50',
            'penandatangan_jabatan' => 'nullable|string|max:255',
            'items' => 'nullable|array',
        ]);

        $items = [];
        $periode = $request->input('periode_bulan');
        $signatory = [
            'nama' => $request->input('penandatangan_nama', 'Dheny Mardiono, S.Hut., M.Sc.'),
            'nip' => $request->input('penandatangan_nip', '19750314 199903 1 004'),
            'jabatan' => $request->input('penandatangan_jabatan', 'Kepala Subbagian Tata Usaha'),
        ];

        // 1. Jika referensi batch_id diberikan
        if ($request->filled('batch_id')) {
            $batch = MealAllowanceBatch::with('items')->findOrFail($request->input('batch_id'));
            $items = $batch->items->toArray();
            $periode = $batch->periode_bulan;
            $signatory['nama'] = $batch->penandatangan_nama;
            $signatory['nip'] = $batch->penandatangan_nip;
            $signatory['jabatan'] = $batch->penandatangan_jabatan;
        } elseif ($request->has('items') && is_array($request->input('items'))) {
            // 2. Ekspor langsung dari payload pratinjau matriks
            $items = $request->input('items');
        }

        if (empty($items)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data pegawai yang dapat diekspor.',
            ], 422);
        }

        if (empty($periode) && $request->filled('year') && $request->filled('month')) {
            $periode = sprintf('%04d-%02d', (int)$request->input('year'), (int)$request->input('month'));
        }

        foreach ($items as &$it) {
            if (empty($it['nama_lengkap']) && !empty($it['nama'])) $it['nama_lengkap'] = $it['nama'];
            if (!isset($it['tarif_harian']) && isset($it['tarif'])) $it['tarif_harian'] = $it['tarif'];
            if (!isset($it['persen_pph21']) && isset($it['pph_rate'])) $it['persen_pph21'] = $it['pph_rate'];
            if (!isset($it['jml_hadir']) && isset($it['total_hadir'])) $it['jml_hadir'] = $it['total_hadir'];
            if (!isset($it['jml_pd']) && isset($it['total_pd'])) $it['jml_pd'] = $it['total_pd'];
            if (!isset($it['jml_cuti']) && isset($it['total_cuti'])) $it['jml_cuti'] = $it['total_cuti'];
            if (!isset($it['jml_sakit']) && isset($it['total_sakit'])) $it['jml_sakit'] = $it['total_sakit'];
            if (!isset($it['jml_izin']) && isset($it['total_izin'])) $it['jml_izin'] = $it['total_izin'];
            if (!isset($it['jml_alpa']) && isset($it['total_alpa'])) $it['jml_alpa'] = $it['total_alpa'];
            if (!isset($it['uang_makan_bruto']) && isset($it['total_bruto'])) $it['uang_makan_bruto'] = $it['total_bruto'];
            if (!isset($it['potongan_pph21']) && isset($it['total_pph'])) $it['potongan_pph21'] = $it['total_pph'];
            if (!isset($it['uang_makan_netto']) && isset($it['total_netto'])) $it['uang_makan_netto'] = $it['total_netto'];
            if (!isset($it['jml_hari_kerja'])) $it['jml_hari_kerja'] = $it['total_working_days'] ?? 22;
            if (!isset($it['nama_bank']) && isset($it['bank'])) $it['nama_bank'] = $it['bank'];
            if (!isset($it['nomor_rekening']) && isset($it['rekening'])) $it['nomor_rekening'] = $it['rekening'];
        }
        unset($it);

        $periode = $periode ?: Carbon::now()->format('Y-m');
        $spreadsheet = $this->excelExport->generate($items, $periode, $signatory);

        $safeFilename = 'Uang_Makan_' . str_replace('-', '_', $periode) . '_' . date('Ymd_His') . '.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $safeFilename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }

    /**
     * Ambil kalender hari kerja, akhir pekan, libur nasional, dan cuti bersama.
     * Endpoint: GET /api/kepegawaian/uang-makan/calendar
     */
    public function getCalendar(Request $request): JsonResponse
    {
        $year = (int) ($request->input('year') ?: Carbon::now()->format('Y'));
        $month = (int) ($request->input('month') ?: Carbon::now()->format('m'));
        $targetPeriode = sprintf('%04d-%02d', $year, $month);
        $carbonPeriod = Carbon::createFromFormat('Y-m', $targetPeriode)->startOfMonth();
        $daysInMonth = $carbonPeriod->daysInMonth;

        $holidays = HolidayCalendarHelper::getHolidaysForMonth($year, $month);

        $monthNames = [
            1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April',
            5 => 'Mei', 6 => 'Juni', 7 => 'Juli', 8 => 'Agustus',
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'periode_bulan' => $targetPeriode,
                'year' => $year,
                'month' => $month,
                'month_name' => $monthNames[$month] ?? (string)$month,
                'days_in_month' => $daysInMonth,
                'holidays' => $holidays,
            ],
        ]);
    }

    /**
     * Ambil daftar seluruh hari libur (static + database kustom) untuk tahun tertentu.
     * Endpoint: GET /api/kepegawaian/settings/holidays
     */
    public function getHolidaySettings(Request $request): JsonResponse
    {
        $year = (int) ($request->input('year') ?: Carbon::now()->format('Y'));
        $holidays = HolidayCalendarHelper::getAllHolidaysForYear($year);

        return response()->json([
            'success' => true,
            'data' => [
                'year' => $year,
                'total' => count($holidays),
                'holidays' => $holidays,
            ],
        ]);
    }

    /**
     * Tambah / simpan hari libur nasional atau cuti bersama kustom.
     * Endpoint: POST /api/kepegawaian/settings/holidays
     */
    public function storeHolidaySetting(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tanggal' => ['required', 'date_format:Y-m-d'],
            'nama' => ['required', 'string', 'max:150'],
            'is_cuti_bersama' => ['nullable', 'boolean'],
        ]);

        $year = (int) substr($validated['tanggal'], 0, 4);

        $holiday = Holiday::updateOrCreate(
            ['tanggal' => $validated['tanggal']],
            [
                'tahun' => $year,
                'nama' => $validated['nama'],
                'is_cuti_bersama' => (bool) ($validated['is_cuti_bersama'] ?? false),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Hari libur berhasil disimpan.',
            'data' => $holiday,
        ]);
    }

    /**
     * Hapus hari libur kustom dari database.
     * Endpoint: DELETE /api/kepegawaian/settings/holidays/{id}
     */
    public function destroyHolidaySetting(int|string $id): JsonResponse
    {
        $holiday = Holiday::find($id);
        if (!$holiday) {
            return response()->json([
                'success' => false,
                'message' => 'Hari libur kustom tidak ditemukan atau merupakan hari libur permanen kalender.',
            ], 404);
        }

        $holiday->delete();

        return response()->json([
            'success' => true,
            'message' => 'Hari libur kustom berhasil dihapus.',
        ]);
    }

    /**
     * Ambil daftar seluruh pegawai beserta alokasi rekening bank dan nomor telepon.
     * Endpoint: GET /api/kepegawaian/settings/employee-banks
     */
    public function getEmployeeBanks(Request $request): JsonResponse
    {
        $query = Employee::select([
            'id', 'nip', 'nama_lengkap', 'jabatan', 'pangkat_golongan',
            'satuan_kerja', 'nama_bank', 'nomor_rekening', 'telepon', 'is_active',
        ])->where('is_active', true);

        if ($request->filled('search')) {
            $s = trim($request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('nama_lengkap', 'like', "%{$s}%")
                  ->orWhere('nip', 'like', "%{$s}%");
            });
        }

        if ($request->filled('bank')) {
            $query->where('nama_bank', $request->input('bank'));
        }

        if ($request->filled('group')) {
            $g = strtolower($request->input('group'));
            if ($g === 'pns') {
                $query->where('pangkat_golongan', 'not like', '%PPPK%');
            } elseif ($g === 'pppk') {
                $query->where('pangkat_golongan', 'like', '%PPPK%');
            }
        }

        $employees = $query->orderBy('nama_lengkap', 'asc')->get();

        $items = $employees->map(function ($emp) {
            $isPppk = str_contains(strtoupper($emp->pangkat_golongan ?? ''), 'PPPK');
            return [
                'id' => $emp->id,
                'nip' => $emp->nip,
                'nama' => $emp->nama_lengkap,
                'jabatan' => $emp->jabatan,
                'golongan' => $emp->pangkat_golongan,
                'satuan_kerja' => $emp->satuan_kerja,
                'jenis_pegawai' => $isPppk ? 'PPPK' : 'PNS',
                'nama_bank' => $emp->nama_bank ?: 'BRI',
                'nomor_rekening' => $emp->nomor_rekening ?: '',
                'telepon' => $emp->telepon ?: '',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'total' => count($items),
                'total_mandiri' => $items->where('nama_bank', 'Mandiri')->count(),
                'total_bri' => $items->where('nama_bank', 'BRI')->count(),
                'items' => $items->values(),
            ],
        ]);
    }

    /**
     * Batch update atau update individual alokasi Bank, Rekening, dan Telepon pegawai.
     * Endpoint: PUT /api/kepegawaian/settings/employee-banks/batch
     */
    public function batchUpdateEmployeeBanks(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_ids' => ['required', 'array', 'min:1'],
            'employee_ids.*' => ['required', 'integer'],
            'nama_bank' => ['nullable', 'string', 'max:50'],
            'nomor_rekening' => ['nullable', 'string', 'max:50'],
            'telepon' => ['nullable', 'string', 'max:30'],
            'single_update' => ['nullable', 'boolean'],
        ]);

        $ids = $validated['employee_ids'];
        $updateData = [];

        if (!empty($validated['nama_bank'])) {
            $updateData['nama_bank'] = $validated['nama_bank'];
        }

        if (!empty($validated['single_update'])) {
            if (array_key_exists('nomor_rekening', $validated)) {
                $updateData['nomor_rekening'] = $validated['nomor_rekening'];
            }
            if (array_key_exists('telepon', $validated)) {
                $updateData['telepon'] = $validated['telepon'];
            }
        }

        if (empty($updateData)) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data yang diubah.',
            ], 422);
        }

        DB::transaction(function () use ($ids, $updateData) {
            Employee::whereIn('id', $ids)->update($updateData);
        });

        return response()->json([
            'success' => true,
            'message' => count($ids) . ' data rekening & bank pegawai berhasil diperbarui.',
        ]);
    }

    /**
     * Mengambil daftar bank yang terdaftar di pengaturan alokasi rekening
     * GET /api/kepegawaian/settings/registered-banks
     */
    public function getRegisteredBanks(): JsonResponse
    {
        $banks = DB::table('kpg_registered_banks')
            ->orderBy('id', 'asc')
            ->get();

        // Hitung pegawai aktif per bank
        $counts = Employee::where('is_active', true)
            ->whereNotNull('nama_bank')
            ->select('nama_bank', DB::raw('count(*) as count'))
            ->groupBy('nama_bank')
            ->pluck('count', 'nama_bank')
            ->toArray();

        $data = $banks->map(function ($b) use ($counts) {
            $matchedCount = 0;
            foreach ($counts as $bankName => $count) {
                if (strcasecmp($bankName, $b->nama_bank) === 0) {
                    $matchedCount += $count;
                }
            }
            return [
                'id' => $b->id,
                'nama_bank' => $b->nama_bank,
                'count' => $matchedCount,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Mendaftarkan bank baru ke pengaturan alokasi rekening
     * POST /api/kepegawaian/settings/registered-banks
     */
    public function storeRegisteredBank(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_bank' => ['required', 'string', 'max:50'],
        ]);

        $bankName = trim(strip_tags($validated['nama_bank']));
        if ($bankName === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nama bank wajib diisi.',
            ], 422);
        }

        // Cek duplikasi case-insensitive
        $existing = DB::table('kpg_registered_banks')
            ->whereRaw('LOWER(nama_bank) = ?', [strtolower($bankName)])
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => "Bank {$existing->nama_bank} sudah terdaftar.",
            ], 422);
        }

        $id = DB::table('kpg_registered_banks')->insertGetId([
            'nama_bank' => $bankName,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => "Bank {$bankName} berhasil didaftarkan.",
            'data' => [
                'id' => $id,
                'nama_bank' => $bankName,
                'count' => 0,
            ],
        ], 201);
    }

    /**
     * Menghapus bank yang tidak dipakai dari pengaturan alokasi rekening
     * DELETE /api/kepegawaian/settings/registered-banks/{bank}
     */
    public function destroyRegisteredBank(string $bank): JsonResponse
    {
        $cleanBank = trim(urldecode($bank));

        // Cek apakah bank masih dipakai oleh pegawai aktif
        $count = Employee::where('is_active', true)
            ->whereRaw('LOWER(nama_bank) = ?', [strtolower($cleanBank)])
            ->count();

        if ($count > 0) {
            return response()->json([
                'success' => false,
                'message' => "Bank {$cleanBank} tidak dapat dihapus karena masih digunakan oleh {$count} pegawai aktif. Silakan pindahkan alokasi rekening pegawai terlebih dahulu.",
            ], 422);
        }

        $deleted = DB::table('kpg_registered_banks')
            ->whereRaw('LOWER(nama_bank) = ?', [strtolower($cleanBank)])
            ->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => "Bank {$cleanBank} tidak ditemukan di daftar pengaturan.",
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => "Bank {$cleanBank} berhasil dihapus dari pengaturan alokasi rekening.",
        ]);
    }
}
