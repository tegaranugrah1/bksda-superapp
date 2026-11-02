<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Kepegawaian\Models\MealAllowanceBatch;
use App\Modules\Kepegawaian\Models\MealAllowanceItem;
use App\Modules\Kepegawaian\Services\AttendanceReconcilerService;
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

        // 2. Rekonsiliasi setiap pegawai
        $targetPeriode = $request->input('periode') ?: ($parsedList[0]['periode_bulan'] ?? null);
        $manualOverrides = $request->input('overrides', []);

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
}
