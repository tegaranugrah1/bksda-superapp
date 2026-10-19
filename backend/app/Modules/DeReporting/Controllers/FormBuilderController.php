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

        $form = DynamicForm::create([
            'title' => $request->title,
            'slug' => $slug,
            'description' => $request->description,
            'fields' => $request->fields ?? [],
            'is_active' => $request->boolean('is_active', true),
            'created_by' => $request->user()?->id,
        ]);

        return response()->json([
            'message' => 'Formulir baru berhasil dibuat.',
            'data' => $form,
        ], 201);
    }

    /**
     * GET /api/dereporting/forms/{id}
     * Detail formulir dinamis
     */
    public function show(string $id): JsonResponse
    {
        $form = DynamicForm::withCount('responses')->findOrFail($id);

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
        ]);

        $payload = $request->only(['title', 'description', 'fields', 'is_active']);

        if ($request->filled('slug')) {
            $payload['slug'] = Str::slug($request->slug);
        }

        $form->update($payload);

        return response()->json([
            'message' => 'Formulir berhasil diperbarui.',
            'data' => $form,
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
                        $row[] = isset($filePaths[$fieldId]) ? 'Ada Lampiran Berkas' : '-';
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
     * Mengunduh berkas lampiran respon dari brankas privat RustFS
     */
    public function downloadAttachment(Request $request, string $responseId, string $fieldId)
    {
        $resp = DynamicFormResponse::with('form')->findOrFail($responseId);
        $user = $request->user();
        if ($user && !in_array($user->role, ['admin', 'super_admin']) && (int)($resp->form?->created_by) !== (int)$user->id) {
            return response()->json(['message' => 'Anda tidak memiliki hak untuk mengunduh lampiran ini.'], 403);
        }
        $filePaths = $resp->file_paths ?? [];

        if (empty($filePaths[$fieldId]) || ! Storage::exists($filePaths[$fieldId])) {
            return response()->json(['message' => 'Berkas lampiran tidak ditemukan di storage.'], 404);
        }

        $path = $filePaths[$fieldId];
        $ext = pathinfo($path, PATHINFO_EXTENSION);
        $filename = "lampiran_{$fieldId}.{$ext}";

        return Storage::download($path, $filename);
    }

    /**
     * GET /api/dereporting/public-forms/{slug}
     * PUBLIC: Membaca skema formulir aktif untuk dirender di /lapor/[slug]
     */
    public function showPublic(string $slug): JsonResponse
    {
        $form = DynamicForm::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $form) {
            return response()->json([
                'message' => 'Formulir tidak ditemukan atau sedang tidak menerima tanggapan.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $form->id,
                'title' => $form->title,
                'slug' => $form->slug,
                'description' => $form->description,
                'fields' => $form->fields,
            ],
        ]);
    }

    /**
     * POST /api/dereporting/public-forms/{slug}/submit
     * PUBLIC: Menerima submisi jawaban dan file dari masyarakat
     */
    public function submitPublic(Request $request, string $slug): JsonResponse
    {
        $form = DynamicForm::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $form) {
            return response()->json([
                'message' => 'Formulir ini sedang tidak aktif.',
            ], 404);
        }

        $fields = $form->fields ?? [];
        $answers = [];
        $filePaths = [];

        // Validasi input berdasarkan skema
        foreach ($fields as $field) {
            $fId = $field['id'] ?? null;
            if (! $fId) continue;

            $fType = $field['type'] ?? 'text';
            $isRequired = ! empty($field['required']);
            $fLabel = $field['label'] ?? 'Bidang isian';

            if ($fType === 'file') {
                if ($request->hasFile($fId)) {
                    $file = $request->file($fId);
                    if ($file->getSize() > 10 * 1024 * 1024) {
                        return response()->json([
                            'message' => "Berkas '{$fLabel}' melebihi batas maksimal 10 MB.",
                        ], 422);
                    }
                    $ext = strtolower($file->getClientOriginalExtension());
                    $allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'zip', 'rar', 'jpg', 'jpeg', 'png', 'webp'];
                    if (!in_array($ext, $allowedExts, true)) {
                        return response()->json([
                            'message' => "Format berkas '{$fLabel}' tidak diizinkan. Hanya berkas PDF, Office, ZIP/RAR, dan Gambar yang diperbolehkan.",
                        ], 422);
                    }
                    $folder = "private/dereporting/forms/{$form->slug}";
                    $filename = Str::uuid().'.'.$ext;
                    $filePaths[$fId] = $file->storeAs($folder, $filename);
                } elseif ($isRequired) {
                    return response()->json([
                        'message' => "Lampiran '{$fLabel}' wajib diunggah.",
                    ], 422);
                }
            } else {
                $val = $request->input($fId);
                if ($isRequired && ($val === null || $val === '')) {
                    return response()->json([
                        'message' => "Pertanyaan '{$fLabel}' wajib diisi.",
                    ], 422);
                }
                if ($val !== null) {
                    $answers[$fId] = $val;
                }
            }
        }

        $response = DynamicFormResponse::create([
            'form_id' => $form->id,
            'answers' => $answers,
            'file_paths' => $filePaths,
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Terima kasih, tanggapan Anda berhasil dikirim ke BKSDA Kaltim.',
            'id' => $response->id,
        ], 201);
    }
}
