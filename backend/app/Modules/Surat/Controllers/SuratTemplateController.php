<?php

namespace App\Modules\Surat\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Surat\Models\SuratTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SuratTemplateController extends Controller
{
    /**
     * List all templates
     */
    public function index(Request $request): JsonResponse
    {
        $query = SuratTemplate::query();

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('key', 'like', "%{$search}%")
                  ->orWhere('kategori', 'like', "%{$search}%")
                  ->orWhere('kode_klasifikasi', 'like', "%{$search}%");
            });
        }

        if ($request->has('kategori') && !empty($request->kategori)) {
            $query->where('kategori', $request->kategori);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $templates = $query->orderBy('is_system', 'desc')->orderBy('nama', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $templates,
        ]);
    }

    /**
     * Show single template
     */
    public function show($id): JsonResponse
    {
        $template = is_numeric($id)
            ? SuratTemplate::findOrFail($id)
            : SuratTemplate::where('key', $id)->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => $template,
        ]);
    }

    /**
     * Create custom template
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key' => 'required|string|max:100|unique:surat_templates,key',
            'nama' => 'required|string|max:255',
            'kategori' => 'nullable|string|max:100',
            'deskripsi' => 'nullable|string|max:1000',
            'nomor_prefix' => 'nullable|string|max:50',
            'kode_klasifikasi' => 'nullable|string|max:50',
            'judul_dokumen' => 'nullable|string|max:255',
            'default_payload' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $key = Str::slug($validated['key'], '_');

        $template = SuratTemplate::create([
            'key' => $key,
            'nama' => strip_tags(trim($validated['nama'])),
            'kategori' => strip_tags(trim($validated['kategori'] ?? 'Tata Naskah Dinas')),
            'deskripsi' => isset($validated['deskripsi']) ? strip_tags(trim($validated['deskripsi'])) : null,
            'nomor_prefix' => strip_tags(trim($validated['nomor_prefix'] ?? 'S')),
            'kode_klasifikasi' => strip_tags(trim($validated['kode_klasifikasi'] ?? 'KSA.01.05')),
            'judul_dokumen' => isset($validated['judul_dokumen']) ? strip_tags(trim($validated['judul_dokumen'])) : null,
            'default_payload' => $validated['default_payload'] ?? null,
            'is_system' => false,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Template naskah dinas berhasil ditambahkan!',
            'data' => $template,
        ], 201);
    }

    /**
     * Update template
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $template = SuratTemplate::findOrFail($id);

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'kategori' => 'nullable|string|max:100',
            'deskripsi' => 'nullable|string|max:1000',
            'nomor_prefix' => 'nullable|string|max:50',
            'kode_klasifikasi' => 'nullable|string|max:50',
            'judul_dokumen' => 'nullable|string|max:255',
            'default_payload' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        $updateData = [
            'nama' => strip_tags(trim($validated['nama'])),
            'kategori' => strip_tags(trim($validated['kategori'] ?? $template->kategori)),
            'deskripsi' => isset($validated['deskripsi']) ? strip_tags(trim($validated['deskripsi'])) : $template->deskripsi,
            'nomor_prefix' => strip_tags(trim($validated['nomor_prefix'] ?? $template->nomor_prefix)),
            'kode_klasifikasi' => strip_tags(trim($validated['kode_klasifikasi'] ?? $template->kode_klasifikasi)),
            'judul_dokumen' => isset($validated['judul_dokumen']) ? strip_tags(trim($validated['judul_dokumen'])) : $template->judul_dokumen,
            'default_payload' => array_merge($template->default_payload ?? [], $validated['default_payload'] ?? []),
            'is_active' => $validated['is_active'] ?? $template->is_active,
        ];

        $template->update($updateData);

        return response()->json([
            'status' => 'success',
            'message' => 'Template naskah dinas berhasil diperbarui!',
            'data' => $template,
        ]);
    }

    /**
     * Delete template (only custom templates)
     */
    public function destroy(int $id): JsonResponse
    {
        $template = SuratTemplate::findOrFail($id);

        if ($template->is_system) {
            return response()->json([
                'status' => 'error',
                'message' => 'Template sistem bawaan tidak dapat dihapus. Anda dapat menonaktifkannya jika tidak ingin digunakan.',
            ], 422);
        }

        $template->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Template naskah dinas berhasil dihapus.',
        ]);
    }

    /**
     * Reset default system templates
     */
    public function resetDefaults(): JsonResponse
    {
        $seeder = new \Database\Seeders\SuratTemplateSeeder();
        $seeder->run();

        return response()->json([
            'status' => 'success',
            'message' => 'Template bawaan sistem berhasil dipulihkan!',
        ]);
    }
}
