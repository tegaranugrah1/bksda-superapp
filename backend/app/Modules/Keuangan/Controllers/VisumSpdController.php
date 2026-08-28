<?php

namespace App\Modules\Keuangan\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Keuangan\Models\VisumSpdSetting;
use App\Modules\Keuangan\Models\VisumSpdTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VisumSpdController extends Controller
{
    /**
     * Get global settings for Visum SPD (Officials of 4 regions & PPK).
     */
    public function getSettings(): JsonResponse
    {
        $setting = VisumSpdSetting::where('key', 'officials_and_ppk')->first();

        if (! $setting) {
            $default = [
                'samarinda' => [
                    'place' => 'Samarinda',
                    'official_name' => 'Dheny Mardiono, S.Hut., MSc.',
                    'official_nip' => '19750314 199903 1 004',
                    'depart_position' => "a.n. Kepala Balai\nKepala Subbagian Tata Usaha",
                    'return_position' => 'Kepala Subbagian Tata Usaha',
                ],
                'berau' => [
                    'place' => 'Berau',
                    'official_name' => 'Yulian Sadono, S.Hut., M.T.',
                    'official_nip' => '19800707 200604 1 003',
                    'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                    'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah I",
                ],
                'tenggarong' => [
                    'place' => 'Tenggarong',
                    'official_name' => 'Suriawati Halim, S.Hut., M.P.',
                    'official_nip' => '19751127 200003 2 001',
                    'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
                    'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah II",
                ],
                'balikpapan' => [
                    'place' => 'Balikpapan',
                    'official_name' => 'Bambang Hari Trimarsito, S.Si., M.P.',
                    'official_nip' => '19740626 200112 1 004',
                    'depart_position' => "a.n. Kepala Balai\nKepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                    'return_position' => "Kepala Seksi Konservasi Sumber\nDaya Alam Wilayah III",
                ],
                'ppk' => [
                    'name' => 'Ahmad Hidayat, S.PKP., M.Ling',
                    'nip' => '19820301 200012 1 001',
                    'position' => 'Pejabat Pembuat Komitmen,',
                    'statement' => 'Telah diperiksa dengan keterangan bahwa perjalanan tersebut atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',
                ],
            ];

            $setting = VisumSpdSetting::create([
                'key' => 'officials_and_ppk',
                'value' => $default,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $setting->value,
        ]);
    }

    /**
     * Update global officials & PPK settings.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'samarinda' => 'required|array',
            'berau' => 'required|array',
            'tenggarong' => 'required|array',
            'balikpapan' => 'required|array',
            'ppk' => 'required|array',
        ]);

        $setting = VisumSpdSetting::updateOrCreate(
            ['key' => 'officials_and_ppk'],
            ['value' => $validated]
        );

        return response()->json([
            'success' => true,
            'message' => 'Pengaturan Pejabat Wilayah & PPK berhasil diperbarui.',
            'data' => $setting->value,
        ]);
    }

    /**
     * Get all Visum SPD templates.
     */
    public function getTemplates(): JsonResponse
    {
        $templates = VisumSpdTemplate::orderBy('is_default', 'desc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Store a new Visum SPD template.
     */
    public function storeTemplate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
            'auto_today_date' => 'nullable|boolean',
            'data' => 'required|array',
        ]);

        $isDefault = $validated['is_default'] ?? false;

        DB::transaction(function () use ($isDefault, $validated, &$template, $request) {
            if ($isDefault) {
                VisumSpdTemplate::query()->update(['is_default' => false]);
            }

            $template = VisumSpdTemplate::create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_default' => $isDefault,
                'auto_today_date' => $validated['auto_today_date'] ?? true,
                'data' => $validated['data'],
                'created_by' => $request->user()?->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Template Visum SPD berhasil disimpan.',
            'data' => $template,
        ], 201);
    }

    /**
     * Update an existing Visum SPD template.
     */
    public function updateTemplate(Request $request, int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'is_default' => 'nullable|boolean',
            'auto_today_date' => 'nullable|boolean',
            'data' => 'required|array',
        ]);

        $isDefault = $validated['is_default'] ?? $template->is_default;

        DB::transaction(function () use ($isDefault, $validated, $template) {
            if ($isDefault && ! $template->is_default) {
                VisumSpdTemplate::query()->update(['is_default' => false]);
            }

            $template->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_default' => $isDefault,
                'auto_today_date' => $validated['auto_today_date'] ?? true,
                'data' => $validated['data'],
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Template Visum SPD berhasil diperbarui.',
            'data' => $template->fresh(),
        ]);
    }

    /**
     * Duplicate a Visum SPD template.
     */
    public function duplicateTemplate(int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);

        $newTemplate = VisumSpdTemplate::create([
            'name' => $template->name . ' (Salinan)',
            'description' => $template->description,
            'is_default' => false,
            'auto_today_date' => $template->auto_today_date,
            'data' => $template->data,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil diduplikasi.',
            'data' => $newTemplate,
        ], 201);
    }

    /**
     * Delete a Visum SPD template.
     */
    public function deleteTemplate(int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);
        $wasDefault = $template->is_default;

        $template->delete();

        // If default was deleted, assign the oldest remaining template as default
        if ($wasDefault) {
            $nextDefault = VisumSpdTemplate::first();
            if ($nextDefault) {
                $nextDefault->update(['is_default' => true]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil dihapus.',
        ]);
    }

    /**
     * Set a template as default.
     */
    public function setDefaultTemplate(int $id): JsonResponse
    {
        $template = VisumSpdTemplate::findOrFail($id);

        DB::transaction(function () use ($template) {
            VisumSpdTemplate::query()->update(['is_default' => false]);
            $template->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => "Template '{$template->name}' ditetapkan sebagai template default.",
            'data' => $template->fresh(),
        ]);
    }
}
