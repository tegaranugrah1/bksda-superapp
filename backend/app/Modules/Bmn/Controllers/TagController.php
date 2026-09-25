<?php

namespace App\Modules\Bmn\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Bmn\Models\Asset;
use App\Modules\Bmn\Models\AssetUpdate;
use App\Modules\Bmn\Models\Tag;
use App\Modules\Bmn\Resources\AssetResource;
use App\Modules\Bmn\Resources\TagResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class TagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tags = Tag::withCount('assets')
            ->orderBy('label', 'asc')
            ->get();

        return response()->json([
            'data' => TagResource::collection($tags),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $rawName = trim((string) $request->input('name', ''));
        $cleanName = Str::lower(preg_replace('/[^a-zA-Z0-9_-]/', '', ltrim($rawName, '#')));

        $request->merge(['clean_name' => $cleanName]);

        $validated = $request->validate([
            'clean_name' => ['required', 'string', 'min:1', 'max:50', Rule::unique('bmn_tags', 'name')],
            'color' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'clean_name.required' => 'Nama tag wajib diisi.',
            'clean_name.unique' => 'Tag dengan nama ini sudah ada.',
            'clean_name.max' => 'Nama tag maksimal 50 karakter.',
        ]);

        $tag = Tag::create([
            'name' => $cleanName,
            'label' => '#' . $cleanName,
            'color' => $validated['color'] ?? 'emerald',
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => "Tag {$tag->label} berhasil dibuat.",
            'data' => new TagResource($tag),
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tag = Tag::findOrFail($id);

        $rawName = trim((string) $request->input('name', $tag->name));
        $cleanName = Str::lower(preg_replace('/[^a-zA-Z0-9_-]/', '', ltrim($rawName, '#')));

        $request->merge(['clean_name' => $cleanName]);

        $validated = $request->validate([
            'clean_name' => ['required', 'string', 'min:1', 'max:50', Rule::unique('bmn_tags', 'name')->ignore($tag->id)],
            'color' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'clean_name.required' => 'Nama tag wajib diisi.',
            'clean_name.unique' => 'Tag dengan nama ini sudah ada.',
            'clean_name.max' => 'Nama tag maksimal 50 karakter.',
        ]);

        $tag->update([
            'name' => $cleanName,
            'label' => '#' . $cleanName,
            'color' => $validated['color'] ?? $tag->color,
            'description' => $validated['description'] ?? $tag->description,
        ]);

        return response()->json([
            'message' => "Tag {$tag->label} berhasil diperbarui.",
            'data' => new TagResource($tag),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tag = Tag::findOrFail($id);
        $affectedAssetsCount = $tag->assets()->count();

        // Detach from all assets
        $tag->assets()->detach();
        $tag->delete();

        return response()->json([
            'message' => "Tag {$tag->label} berhasil dihapus dan dilepas dari {$affectedAssetsCount} aset.",
            'affected_assets_count' => $affectedAssetsCount,
        ]);
    }

    public function syncAssetTags(Request $request, string $assetId): JsonResponse
    {
        $asset = Asset::with('tags')->findOrFail($assetId);

        $validated = $request->validate([
            'tag_ids' => ['present', 'array'],
            'tag_ids.*' => ['string', 'exists:bmn_tags,id'],
        ]);

        $oldTagsStr = $asset->tags->pluck('label')->sort()->values()->implode(', ');

        $asset->tags()->sync($validated['tag_ids']);
        $asset->load(['tags', 'penanggungJawab']);

        $newTagsStr = $asset->tags->pluck('label')->sort()->values()->implode(', ');

        if ($oldTagsStr !== $newTagsStr) {
            AssetUpdate::create([
                'asset_id' => $asset->id,
                'user_id' => $request->user()?->id,
                'field_changed' => 'tags',
                'old_value' => $oldTagsStr ?: '—',
                'new_value' => $newTagsStr ?: '—',
                'alasan_perubahan' => 'Perubahan tag aset',
            ]);
        }

        return response()->json([
            'message' => 'Tag aset berhasil diperbarui.',
            'data' => new AssetResource($asset),
        ]);
    }

    public function bulkAssign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'asset_ids' => ['required', 'array', 'min:1'],
            'asset_ids.*' => ['string', 'exists:bmn_assets,id'],
            'action' => ['nullable', 'string', 'in:attach,detach,replace,clear_all'],
            'tag_ids' => ['required_unless:action,clear_all', 'array'],
            'tag_ids.*' => ['string', 'exists:bmn_tags,id'],
        ]);

        $assets = Asset::with('tags')->whereIn('id', $validated['asset_ids'])->get();
        $action = $validated['action'] ?? 'attach';
        $userId = $request->user()?->id;

        $alasan = match ($action) {
            'clear_all' => 'Pengosongan seluruh tag massal',
            'detach' => 'Pelepasan tag massal',
            'replace' => 'Penggantian tag massal',
            default => 'Penambahan tag massal',
        };

        foreach ($assets as $asset) {
            $oldTagsStr = $asset->tags->pluck('label')->sort()->values()->implode(', ');

            if ($action === 'clear_all') {
                $asset->tags()->detach();
            } elseif ($action === 'detach') {
                $asset->tags()->detach($validated['tag_ids'] ?? []);
            } elseif ($action === 'replace') {
                $asset->tags()->sync($validated['tag_ids'] ?? []);
            } else {
                $asset->tags()->syncWithoutDetaching($validated['tag_ids'] ?? []);
            }

            $asset->load('tags');
            $newTagsStr = $asset->tags->pluck('label')->sort()->values()->implode(', ');

            if ($oldTagsStr !== $newTagsStr) {
                AssetUpdate::create([
                    'asset_id' => $asset->id,
                    'user_id' => $userId,
                    'field_changed' => 'tags',
                    'old_value' => $oldTagsStr ?: '—',
                    'new_value' => $newTagsStr ?: '—',
                    'alasan_perubahan' => $alasan,
                ]);
            }
        }

        $msg = match ($action) {
            'clear_all' => "Berhasil mengosongkan seluruh tag dari {$assets->count()} aset.",
            'detach' => "Berhasil melepas tag dari {$assets->count()} aset.",
            default => "Berhasil memperbarui tag pada {$assets->count()} aset.",
        };

        return response()->json([
            'message' => $msg,
            'count' => $assets->count(),
        ]);
    }
}
