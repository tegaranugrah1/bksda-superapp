<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\DeReporting\Models\DynamicForm;
use App\Modules\DeReporting\Models\DynamicFormResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FormBuilderController extends Controller
{
    /**
     * GET /api/dereporting/forms
     * Mengambil daftar formulir dinamis
     */
    public function index(Request $request): JsonResponse
    {
        $query = DynamicForm::withCount('responses')->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        if ($request->boolean('all') || $request->get('paginate') === 'false') {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/forms
     * Membuat formulir baru
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:dr_forms,slug',
            'description' => 'nullable|string',
            'fields' => 'nullable|array',
            'is_active' => 'nullable|boolean',
            'closed_at' => 'nullable|date',
            'closed_message' => 'nullable|string|max:500',
        ]);

        $baseSlug = $request->filled('slug')
            ? Str::slug($request->slug)
            : Str::slug($request->title);

        $slug = $baseSlug;
        $counter = 1;
        while (DynamicForm::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        // Siapkan folder di BKSDA Drive (Unit Balai Samarinda)
        $driveFolderId = null;
        try {
            $unit = \App\Models\DriveUnit::where('slug', 'balai-samarinda')->first() ?? \App\Models\DriveUnit::find(1);
            $superAdminId = \App\Models\User::where('role', 'super_admin')->value('id') ?: 1;
            $parentFolder = \App\Models\DriveFolder::firstOrCreate([
                'unit_id' => $unit?->id ?: 1,
                'parent_id' => null,
                'name' => 'Formulir DeReporting',
            ], [
                'user_id' => $superAdminId,
                'color' => '#10B981',
            ]);

            $formFolder = \App\Models\DriveFolder::firstOrCreate([
                'unit_id' => $unit?->id ?: 1,
                'parent_id' => $parentFolder->id,
                'name' => $request->title,
            ], [
                'user_id' => $request->user()?->id ?: $superAdminId,
                'color' => '#3B82F6',
            ]);
            $driveFolderId = $formFolder->id;
        } catch (\Throwable $e) {
            // Non-blocking folder creation
        }

        $form = DynamicForm::create([
            'title' => $request->title,
            'slug' => $slug,
            'description' => $request->description,
            'fields' => $request->fields ?? [],
            'is_active' => $request->boolean('is_active', true),
            'created_by' => $request->user()?->id,
            'drive_folder_id' => $driveFolderId,
            'closed_at' => $request->closed_at,
            'closed_message' => $request->closed_message,
        ]);

        return response()->json([
            'message' => 'Formulir baru berhasil dibuat.',
            'data' => $form->load('driveFolder'),
        ], 201);
    }

    /**
     * GET /api/dereporting/forms/{id}
     * Detail formulir dinamis
     */
    public function show(string $id): JsonResponse
    {
        $form = DynamicForm::with(['driveFolder'])->withCount('responses')->findOrFail($id);

        return response()->json(['data' => $form]);
    }

    /**
     * PUT /api/dereporting/forms/{id}
     * Memperbarui formulir dinamis (judul, skema pertanyaan, status)
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $form = DynamicForm::findOrFail($id);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)$form->created_by !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk mengedit formulir ini.'], 403);
        }

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'slug' => "sometimes|required|string|max:255|unique:dr_forms,slug,{$id}",
            'description' => 'nullable|string',
            'fields' => 'nullable|array',
            'is_active' => 'nullable|boolean',
            'closed_at' => 'nullable|date',
            'closed_message' => 'nullable|string|max:500',
        ]);

        $payload = $request->only(['title', 'description', 'fields', 'is_active', 'closed_at', 'closed_message']);

        if ($request->filled('slug')) {
            $payload['slug'] = Str::slug($request->slug);
        }

        // Jika belum memiliki folder Drive, buatkan otomatis
        if (! $form->drive_folder_id) {
            try {
                $unit = \App\Models\DriveUnit::where('slug', 'balai-samarinda')->first() ?? \App\Models\DriveUnit::find(1);
                $superAdminId = \App\Models\User::where('role', 'super_admin')->value('id') ?: 1;
                $parentFolder = \App\Models\DriveFolder::firstOrCreate([
                    'unit_id' => $unit?->id ?: 1,
                    'parent_id' => null,
                    'name' => 'Formulir DeReporting',
                ], [
                    'user_id' => $superAdminId,
                    'color' => '#10B981',
                ]);

                $formFolder = \App\Models\DriveFolder::firstOrCreate([
                    'unit_id' => $unit?->id ?: 1,
                    'parent_id' => $parentFolder->id,
                    'name' => $payload['title'] ?? $form->title,
                ], [
                    'user_id' => $form->created_by ?: $superAdminId,
                    'color' => '#3B82F6',
                ]);
                $payload['drive_folder_id'] = $formFolder->id;
            } catch (\Throwable $e) {
                // Non-blocking
            }
        } elseif (! empty($payload['title']) && $payload['title'] !== $form->title) {
            try {
                \App\Models\DriveFolder::where('id', $form->drive_folder_id)->update(['name' => $payload['title']]);
            } catch (\Throwable $e) {
                // Non-blocking
            }
        }

        $form->update($payload);

        return response()->json([
            'message' => 'Formulir berhasil diperbarui.',
            'data' => $form->fresh(['driveFolder']),
        ]);
    }

    /**
     * DELETE /api/dereporting/forms/{id}
     * Menghapus / Mengarsipkan formulir dinamis
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $form = DynamicForm::findOrFail($id);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)$form->created_by !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk menghapus formulir ini.'], 403);
        }
        $form->delete();

        return response()->json([
            'message' => 'Formulir berhasil diarsipkan.',
        ]);
    }

    /**
     * POST /api/dereporting/forms/{id}/duplicate
     * Menduplikasi formulir dinamis yang sudah ada
     */
    public function duplicate(Request $request, string $id): JsonResponse
    {
        $original = DynamicForm::findOrFail($id);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && !$original->is_active && (int)$original->created_by !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk menduplikasi formulir ini.'], 403);
        }

        $customTitle = $request->input('title');
        $title = ! empty($customTitle) ? trim($customTitle) : "{$original->title} (Salinan)";

        $baseSlug = Str::slug($title);
        if (empty($baseSlug)) {
            $baseSlug = "{$original->slug}-salinan";
        }

        $slug = $baseSlug;
        $counter = 1;
        while (DynamicForm::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$counter}";
            $counter++;
        }

        $newForm = DynamicForm::create([
            'title' => $title,
            'slug' => $slug,
            'description' => $original->description,
            'fields' => $original->fields ?? [],
            'is_active' => false,
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Formulir berhasil diduplikasi.',
            'data' => $newForm,
        ], 201);
    }

    /**
     * GET /api/dereporting/forms/{id}/responses
     * Mengambil daftar respon jawaban untuk suatu formulir
     */
    public function responses(Request $request, string $id): JsonResponse
    {
        $form = DynamicForm::findOrFail($id);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)$form->created_by !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk melihat tanggapan formulir ini.'], 403);
        }

        $query = DynamicFormResponse::where('form_id', $form->id)->latest();

        if ($request->boolean('all') || $request->get('paginate') === 'false') {
            return response()->json([
                'form' => $form,
                'data' => $query->get(),
            ]);
        }

        return response()->json([
            'form' => $form,
            'responses' => $query->paginate(30),
        ]);
    }

    /**
     * GET /api/dereporting/forms/{id}/responses/export
     * Ekspor seluruh jawaban formulir ke format CSV (Native, stdlib)
     */
    public function exportCsv(Request $request, string $id): StreamedResponse
    {
        $form = DynamicForm::findOrFail($id);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)$form->created_by !== (int)$user->id) {
            abort(403, 'Anda tidak memiliki hak untuk mengekspor tanggapan formulir ini.');
        }
        $responses = DynamicFormResponse::where('form_id', $form->id)->oldest()->get();
        $fields = $form->fields ?? [];

        $cleanSlug = preg_replace('/[\r\n"\/\\\\:*?<>|]/', '_', (string) $form->slug) ?: 'form';
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$cleanSlug}_tanggapan.csv\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($fields, $responses) {
            $handle = fopen('php://output', 'w');
            // Menulis UTF-8 BOM agar Microsoft Excel membaca karakter dengan benar
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            // Header kolom
            $headerRow = ['No', 'Tanggal Masuk', 'Alamat IP'];
            foreach ($fields as $field) {
                $headerRow[] = $field['label'] ?? 'Pertanyaan';
            }
            fputcsv($handle, $headerRow);

            // Baris data jawaban
            foreach ($responses as $idx => $resp) {
                $answers = $resp->answers ?? [];
                $filePaths = $resp->file_paths ?? [];

                $row = [
                    $idx + 1,
                    $resp->created_at?->format('d/m/Y H:i') ?? '-',
                    $resp->ip_address ?? '-',
                ];

                foreach ($fields as $field) {
                    $fieldId = $field['id'] ?? '';
                    $fieldType = $field['type'] ?? 'text';

                    if ($fieldType === 'file') {
                        $fps = $filePaths[$fieldId] ?? null;
                        if (is_array($fps)) {
                            $row[] = count($fps) . ' Berkas Lampiran';
                        } elseif ($fps) {
                            $row[] = '1 Berkas Lampiran';
                        } else {
                            $row[] = '-';
                        }
                    } elseif ($fieldType === 'gps_location') {
                        $gps = $answers[$fieldId] ?? null;
                        if (is_array($gps) && isset($gps['latitude'], $gps['longitude'])) {
                            $locStr = "{$gps['latitude']}, {$gps['longitude']}";
                            if (! empty($gps['address_hint'])) {
                                $locStr .= " ({$gps['address_hint']})";
                            }
                            $row[] = $locStr;
                        } else {
                            $row[] = '-';
                        }
                    } else {
                        $val = $answers[$fieldId] ?? '-';
                        $valStr = is_array($val) ? implode(', ', $val) : (string) $val;
                        // Neutralize CSV Formula Injection (CWE-1236)
                        if (preg_match('/^[=+\-@\t\r]/', $valStr)) {
                            $valStr = "'".$valStr;
                        }
                        $row[] = $valStr;
                    }
                }

                fputcsv($handle, $row);
            }

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * GET /api/dereporting/forms/responses/{responseId}/download/{fieldId}
     * Mengunduh berkas lampiran respon dari S3 RustFS BKSDA Drive atau storage privat
     */
    public function downloadAttachment(Request $request, string $responseId, string $fieldId)
    {
        $resp = DynamicFormResponse::with('form')->findOrFail($responseId);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)($resp->form?->created_by) !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk mengunduh lampiran ini.'], 403);
        }
        $filePaths = $resp->file_paths ?? [];

        if (empty($filePaths[$fieldId])) {
            return response()->json(['message' => 'Berkas lampiran tidak ditemukan di formulir.'], 404);
        }

        $rawVal = $filePaths[$fieldId];
        $index = (int) $request->query('index', 0);
        $path = is_array($rawVal) ? ($rawVal[$index] ?? $rawVal[0] ?? null) : $rawVal;

        if (! $path) {
            return response()->json(['message' => 'Berkas lampiran tidak ditemukan.'], 404);
        }

        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $cleanExt = $ext ? ".{$ext}" : '';
        $filename = "lampiran_{$fieldId}_{$index}{$cleanExt}";

        // Prioritas 1: S3 RustFS disk 'drive'
        if (Storage::disk('drive')->exists($path)) {
            return Storage::disk('drive')->download($path, $filename);
        }

        // Prioritas 2: Storage default (lokal privat legacy)
        if (Storage::exists($path)) {
            return Storage::download($path, $filename);
        }

        return response()->json(['message' => 'Berkas lampiran tidak ditemukan di storage.'], 404);
    }

    /**
     * GET /api/dereporting/public-forms/{slug}
     * PUBLIC: Membaca skema formulir untuk dirender di /lapor/[slug]
     */
    public function showPublic(string $slug): JsonResponse
    {
        $form = DynamicForm::where('slug', $slug)->first();

        if (! $form) {
            return response()->json([
                'message' => 'Formulir tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $form->id,
                'title' => $form->title,
                'slug' => $form->slug,
                'description' => $form->description,
                'fields' => $form->fields,
                'is_active' => (bool) $form->is_active,
                'closed_at' => $form->closed_at?->toIso8601String(),
                'closed_message' => $form->closed_message,
                'is_closed' => $form->isClosed(),
            ],
        ]);
    }

    /**
     * POST /api/dereporting/public-forms/{slug}/submit
     * PUBLIC: Menerima submisi jawaban dan file dari masyarakat langsung ke BKSDA Drive
     */
    public function submitPublic(Request $request, string $slug): JsonResponse
    {
        $form = DynamicForm::where('slug', $slug)->first();

        if (! $form) {
            return response()->json([
                'message' => 'Formulir ini tidak ditemukan.',
            ], 404);
        }

        if ($form->isClosed()) {
            return response()->json([
                'message' => $form->closed_message ?: 'Formulir ini sudah ditutup dan tidak lagi menerima tanggapan baru.',
            ], 403);
        }

        $fields = $form->fields ?? [];
        $answers = [];
        $filePaths = [];
        $savedDriveFiles = [];

        // Resolusi folder BKSDA Drive untuk formulir ini (Unit Balai Samarinda)
        $ownerId = $form->created_by ?: (\App\Models\User::where('role', 'super_admin')->value('id') ?? \App\Models\User::value('id'));
        $formFolder = null;
        $unit = null;

        if ($ownerId) {
            try {
                $unit = \App\Models\DriveUnit::where('slug', 'balai-samarinda')->first() ?? \App\Models\DriveUnit::find(1);
                $parentFolder = \App\Models\DriveFolder::firstOrCreate([
                    'unit_id' => $unit?->id ?: 1,
                    'parent_id' => null,
                    'name' => 'Formulir DeReporting',
                ], [
                    'user_id' => $ownerId,
                    'color' => '#10B981',
                ]);

                $formFolder = \App\Models\DriveFolder::firstOrCreate([
                    'unit_id' => $unit?->id ?: 1,
                    'parent_id' => $parentFolder->id,
                    'name' => $form->title,
                ], [
                    'user_id' => $ownerId,
                    'color' => '#3B82F6',
                ]);

                if ($form->drive_folder_id !== $formFolder->id) {
                    $form->update(['drive_folder_id' => $formFolder->id]);
                }
            } catch (\Throwable $e) {
                // Non-blocking folder creation
            }
        }

        $responseId = (string) Str::uuid();

        // Validasi input berdasarkan skema
        foreach ($fields as $field) {
            $fId = $field['id'] ?? null;
            if (! $fId) continue;

            $fType = $field['type'] ?? 'text';
            $isRequired = ! empty($field['required']);
            $fLabel = $field['label'] ?? 'Bidang isian';

            if ($fType === 'file') {
                $maxFiles = isset($field['max_files']) ? (int) $field['max_files'] : 5;
                if ($maxFiles < 1) $maxFiles = 1;
                if ($maxFiles > 5) $maxFiles = 5;

                if ($request->hasFile($fId)) {
                    $uploaded = $request->file($fId);
                    $fileList = is_array($uploaded) ? $uploaded : [$uploaded];

                    if (count($fileList) > $maxFiles) {
                        return response()->json([
                            'message' => "Maksimal {$maxFiles} berkas yang dapat diunggah untuk '{$fLabel}'.",
                        ], 422);
                    }

                    $fieldSavedPaths = [];

                    foreach ($fileList as $index => $file) {
                        if ($file->getSize() > 10 * 1024 * 1024) {
                            return response()->json([
                                'message' => "Berkas ke-" . ($index + 1) . " pada '{$fLabel}' melebihi batas maksimal 10 MB.",
                            ], 422);
                        }

                        $ext = strtolower($file->getClientOriginalExtension());
                        $allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'webp'];
                        if (! in_array($ext, $allowedExts, true)) {
                            return response()->json([
                                'message' => "Format berkas '{$fLabel}' tidak diizinkan. Hanya berkas PDF, Dokumen, Arsip, dan Gambar yang diperbolehkan.",
                            ], 422);
                        }

                        // Security Audit: Magic Bytes validation via finfo
                        $finfo = finfo_open(FILEINFO_MIME_TYPE);
                        $detectedMime = finfo_file($finfo, $file->getPathname()) ?: 'application/octet-stream';
                        finfo_close($finfo);

                        $dangerousMimes = [
                            'text/html', 'text/x-php', 'application/x-php', 'application/x-msdownload',
                            'application/x-sh', 'application/x-bat', 'application/javascript', 'application/x-executable'
                        ];
                        if (in_array(strtolower($detectedMime), $dangerousMimes, true)) {
                            return response()->json([
                                'message' => "Berkas pada '{$fLabel}' ditolak karena mengandung konten berbahaya.",
                            ], 422);
                        }

                        // Simpan langsung ke disk S3 drive di bawah folder Unit Balai
                        $s3Key = "units/balai-samarinda/dereporting/{$form->slug}/" . Str::uuid() . ".{$ext}";
                        $stream = fopen($file->getPathname(), 'r');
                        Storage::disk('drive')->put($s3Key, $stream);
                        if (is_resource($stream)) {
                            fclose($stream);
                        }

                        $fieldSavedPaths[] = $s3Key;

                        if ($ownerId && $formFolder) {
                            $savedDriveFiles[] = [
                                'unit_id' => $unit?->id ?: 1,
                                'user_id' => $ownerId,
                                'folder_id' => $formFolder->id,
                                'name' => $file->getClientOriginalName(),
                                's3_key' => $s3Key,
                                'size_bytes' => $file->getSize(),
                                'mime_type' => $detectedMime,
                                'source_module' => 'dereporting',
                                'source_id' => "{$responseId}:{$fId}:{$index}",
                            ];
                        }
                    }

                    $filePaths[$fId] = $fieldSavedPaths;
                } elseif ($isRequired) {
                    return response()->json([
                        'message' => "Lampiran '{$fLabel}' wajib diunggah.",
                    ], 422);
                }
            } elseif ($fType === 'gps_location') {
                $val = $request->input($fId);
                if (is_string($val)) {
                    $decoded = json_decode($val, true);
                    if (is_array($decoded)) {
                        $val = $decoded;
                    }
                }

                if ($isRequired && (empty($val) || ! isset($val['latitude'], $val['longitude']))) {
                    return response()->json([
                        'message' => "Titik koordinat GPS pada '{$fLabel}' wajib diisi.",
                    ], 422);
                }

                if (! empty($val) && isset($val['latitude'], $val['longitude'])) {
                    $lat = (float) $val['latitude'];
                    $lng = (float) $val['longitude'];
                    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
                        return response()->json([
                            'message' => "Koordinat GPS pada '{$fLabel}' tidak valid.",
                        ], 422);
                    }
                    $answers[$fId] = [
                        'latitude' => $lat,
                        'longitude' => $lng,
                        'accuracy' => isset($val['accuracy']) ? (float) $val['accuracy'] : null,
                        'address_hint' => isset($val['address_hint']) ? strip_tags((string) $val['address_hint']) : null,
                    ];
                }
            } else {
                $val = $request->input($fId);
                if ($isRequired && ($val === null || $val === '' || (is_array($val) && empty($val)))) {
                    return response()->json([
                        'message' => "Pertanyaan '{$fLabel}' wajib diisi.",
                    ], 422);
                }
                if ($val !== null) {
                    $answers[$fId] = $val;
                }
            }
        }

        $response = new DynamicFormResponse();
        $response->id = $responseId;
        $response->form_id = $form->id;
        $response->answers = $answers;
        $response->file_paths = $filePaths;
        $response->ip_address = $request->ip();
        $response->save();

        foreach ($savedDriveFiles as $dfData) {
            \App\Models\DriveFile::create($dfData);
        }

        // Kirim Notifikasi Real-Time Portal & WebSocket ke Pembuat Formulir
        if ($form->created_by) {
            try {
                app(\App\Services\PortalNotificationService::class)->notifyUser(
                    userId: (int) $form->created_by,
                    title: 'Tanggapan Baru Diterima',
                    message: "Tanggapan baru telah masuk pada formulir '{$form->title}'.",
                    type: 'dereporting',
                    actionTab: 'responses',
                    referenceId: (string) $response->id,
                    data: [
                        'form_id' => (string) $form->id,
                        'form_title' => $form->title,
                        'response_id' => (string) $response->id,
                        'link' => "/dereporting/forms/{$form->id}/responses",
                    ]
                );
            } catch (\Throwable $e) {
                // Non-blocking notification error
            }
        }

        return response()->json([
            'message' => 'Terima kasih, tanggapan Anda berhasil dikirim ke BKSDA Kaltim.',
            'id' => $response->id,
        ], 201);
    }

    /**
     * GET /api/dereporting/forms/{id}/summary
     * Menghitung statistik diagram respon (pilihan ganda, checkbox, file, timeline, gps)
     */
    public function summary(Request $request, string $id): JsonResponse
    {
        $form = DynamicForm::with('driveFolder')->findOrFail($id);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)$form->created_by !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk melihat statistik formulir ini.'], 403);
        }

        $responses = DynamicFormResponse::where('form_id', $form->id)->orderBy('created_at')->get();
        $fields = $form->fields ?? [];

        $totalResponses = $responses->count();
        $lastResponse = $responses->last();

        $fieldsSummary = [];
        $gpsPoints = [];

        foreach ($fields as $field) {
            $fId = $field['id'] ?? '';
            $fType = $field['type'] ?? 'text';
            $fLabel = $field['label'] ?? 'Pertanyaan';
            $options = $field['options'] ?? [];

            if (in_array($fType, ['radio', 'select'], true)) {
                $counts = [];
                foreach ($options as $opt) {
                    $counts[$opt] = 0;
                }
                $otherCount = 0;

                foreach ($responses as $r) {
                    $ans = $r->answers[$fId] ?? null;
                    if ($ans !== null && $ans !== '') {
                        if (isset($counts[$ans])) {
                            $counts[$ans]++;
                        } else {
                            $otherCount++;
                        }
                    }
                }

                $data = [];
                foreach ($counts as $label => $cnt) {
                    $data[] = [
                        'name' => (string)$label,
                        'value' => $cnt,
                        'percentage' => $totalResponses > 0 ? round(($cnt / $totalResponses) * 100, 1) : 0,
                    ];
                }
                if ($otherCount > 0) {
                    $data[] = [
                        'name' => 'Lainnya',
                        'value' => $otherCount,
                        'percentage' => $totalResponses > 0 ? round(($otherCount / $totalResponses) * 100, 1) : 0,
                    ];
                }

                $fieldsSummary[] = [
                    'id' => $fId,
                    'label' => $fLabel,
                    'type' => $fType,
                    'chart_type' => 'pie',
                    'data' => $data,
                ];
            } elseif ($fType === 'checkbox') {
                $counts = [];
                foreach ($options as $opt) {
                    $counts[$opt] = 0;
                }

                foreach ($responses as $r) {
                    $ans = $r->answers[$fId] ?? [];
                    if (is_array($ans)) {
                        foreach ($ans as $selected) {
                            if (isset($counts[$selected])) {
                                $counts[$selected]++;
                            } else {
                                $counts[$selected] = 1;
                            }
                        }
                    }
                }

                $data = [];
                foreach ($counts as $label => $cnt) {
                    $data[] = [
                        'name' => (string)$label,
                        'count' => $cnt,
                        'percentage' => $totalResponses > 0 ? round(($cnt / $totalResponses) * 100, 1) : 0,
                    ];
                }

                $fieldsSummary[] = [
                    'id' => $fId,
                    'label' => $fLabel,
                    'type' => $fType,
                    'chart_type' => 'bar',
                    'data' => $data,
                ];
            } elseif ($fType === 'file') {
                $totalFiles = 0;
                foreach ($responses as $r) {
                    $fps = $r->file_paths[$fId] ?? [];
                    if (is_array($fps)) {
                        $totalFiles += count($fps);
                    } elseif (! empty($fps)) {
                        $totalFiles += 1;
                    }
                }

                $fieldsSummary[] = [
                    'id' => $fId,
                    'label' => $fLabel,
                    'type' => $fType,
                    'chart_type' => 'gallery',
                    'total_files' => $totalFiles,
                ];
            } elseif ($fType === 'gps_location') {
                foreach ($responses as $r) {
                    $gps = $r->answers[$fId] ?? null;
                    if (is_array($gps) && isset($gps['latitude'], $gps['longitude'])) {
                        $gpsPoints[] = [
                            'response_id' => $r->id,
                            'created_at' => $r->created_at?->toIso8601String(),
                            'latitude' => $gps['latitude'],
                            'longitude' => $gps['longitude'],
                            'accuracy' => $gps['accuracy'] ?? null,
                            'address_hint' => $gps['address_hint'] ?? null,
                        ];
                    }
                }

                $fieldsSummary[] = [
                    'id' => $fId,
                    'label' => $fLabel,
                    'type' => $fType,
                    'chart_type' => 'map',
                    'total_points' => count($gpsPoints),
                ];
            }
        }

        // Galeri foto terbaru dari DriveFile
        $recentFiles = \App\Models\DriveFile::where('source_module', 'dereporting')
            ->where('folder_id', $form->drive_folder_id)
            ->whereNull('deleted_at')
            ->latest()
            ->take(24)
            ->get(['id', 'name', 'mime_type', 'size_bytes', 's3_key', 'created_at']);

        // Timeline tren respon 30 hari terakhir
        $timeline = [];
        $startDate = now()->subDays(29)->startOfDay();
        for ($i = 0; $i < 30; $i++) {
            $day = $startDate->copy()->addDays($i)->format('Y-m-d');
            $timeline[$day] = 0;
        }
        foreach ($responses as $r) {
            $date = $r->created_at?->format('Y-m-d');
            if ($date && isset($timeline[$date])) {
                $timeline[$date]++;
            }
        }
        $timelineData = [];
        foreach ($timeline as $date => $cnt) {
            $timelineData[] = [
                'date' => $date,
                'count' => $cnt,
            ];
        }

        return response()->json([
            'form' => [
                'id' => $form->id,
                'title' => $form->title,
                'slug' => $form->slug,
                'is_active' => $form->is_active,
                'is_closed' => $form->isClosed(),
                'closed_at' => $form->closed_at,
                'closed_message' => $form->closed_message,
                'drive_folder_id' => $form->drive_folder_id,
            ],
            'summary' => [
                'total_responses' => $totalResponses,
                'last_response_at' => $lastResponse?->created_at?->toIso8601String(),
                'fields_summary' => $fieldsSummary,
                'gps_points' => $gpsPoints,
                'recent_photos' => $recentFiles,
                'timeline' => $timelineData,
            ],
        ]);
    }
}
