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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TagController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tags = Tag::with(['parent', 'subTags'])
            ->withCount(['assets as direct_assets_count', 'subTags'])
            ->orderBy('label', 'asc')
            ->get();

        // Calculate distinct asset counts (parent tag includes its own assets + sub-tag assets without duplicates)
        $tagAssetMap = DB::table('bmn_asset_tag')
            ->select('tag_id', 'asset_id')
            ->get()
            ->groupBy('tag_id');

        foreach ($tags as $tag) {
            if ($tag->isMainTag()) {
                $familyIds = array_merge([$tag->id], $tag->subTags->pluck('id')->toArray());
                $distinctAssetIds = [];
                foreach ($familyIds as $fId) {
                    if (isset($tagAssetMap[$fId])) {
                        foreach ($tagAssetMap[$fId] as $row) {
                            $distinctAssetIds[$row->asset_id] = true;
                        }
                    }
                }
                $tag->assets_count = count($distinctAssetIds);
            } else {
                $tag->assets_count = isset($tagAssetMap[$tag->id]) ? $tagAssetMap[$tag->id]->count() : 0;
            }
        }

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
            'parent_id' => ['nullable', 'string', 'exists:bmn_tags,id'],
            'color' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'clean_name.required' => 'Nama tag wajib diisi.',
            'clean_name.unique' => 'Tag dengan nama ini sudah ada.',
            'clean_name.max' => 'Nama tag maksimal 50 karakter.',
            'parent_id.exists' => 'Main tag induk yang dipilih tidak valid.',
        ]);

        $parentId = $validated['parent_id'] ?? null;

        // Ensure parent tag is not itself a sub-tag (enforce max 1-level depth)
        if ($parentId) {
            $parentTag = Tag::find($parentId);
            if ($parentTag && $parentTag->isSubTag()) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Tag induk yang dipilih tidak boleh merupakan sub-tag. Sistem hanya mendukung hierarki Main Tag dan Sub Tag.',
                ]);
            }
        }

        $tag = Tag::create([
            'name' => $cleanName,
            'label' => '#' . $cleanName,
            'parent_id' => $parentId,
            'color' => $validated['color'] ?? 'emerald',
            'description' => $validated['description'] ?? null,
        ]);

        $tag->load('parent');

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
            'parent_id' => ['nullable', 'string', 'exists:bmn_tags,id'],
            'color' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string', 'max:500'],
        ], [
            'clean_name.required' => 'Nama tag wajib diisi.',
            'clean_name.unique' => 'Tag dengan nama ini sudah ada.',
            'clean_name.max' => 'Nama tag maksimal 50 karakter.',
            'parent_id.exists' => 'Main tag induk yang dipilih tidak valid.',
        ]);

        $parentId = array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $tag->parent_id;

        if ($parentId) {
            if ($parentId === $tag->id) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Tag tidak dapat menjadi induk bagi dirinya sendiri.',
                ]);
            }

            // A tag with existing sub-tags cannot be subordinated
            if ($tag->subTags()->exists()) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Tag ini memiliki sub-tag, sehingga tidak dapat dijadikan sebagai sub-tag dari tag lain.',
                ]);
            }

            // Parent tag cannot be a sub-tag
            $parentTag = Tag::find($parentId);
            if ($parentTag && $parentTag->isSubTag()) {
                throw ValidationException::withMessages([
                    'parent_id' => 'Tag induk yang dipilih tidak boleh merupakan sub-tag.',
                ]);
            }
        }

        $tag->update([
            'name' => $cleanName,
            'label' => '#' . $cleanName,
            'parent_id' => $parentId,
            'color' => $validated['color'] ?? $tag->color,
            'description' => $validated['description'] ?? $tag->description,
        ]);

        $tag->load('parent');

        return response()->json([
            'message' => "Tag {$tag->label} berhasil diperbarui.",
            'data' => new TagResource($tag),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tag = Tag::findOrFail($id);

        // Deletion protection for Main Tags that have Sub Tags
        if ($tag->subTags()->exists()) {
            $subCount = $tag->subTags()->count();
            return response()->json([
                'message' => "Tag {$tag->label} tidak dapat dihapus karena masih memiliki {$subCount} sub-tag. Hapus atau pindahkan sub-tag terlebih dahulu.",
            ], 422);
        }

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

        // Auto-attach parent Main Tag if any Sub Tag is selected
        $tagIds = $validated['tag_ids'];
        if (!empty($tagIds)) {
            $chosenTags = Tag::whereIn('id', $tagIds)->get();
            $expandedIds = $tagIds;
            foreach ($chosenTags as $t) {
                if ($t->parent_id && !in_array($t->parent_id, $expandedIds, true)) {
                    $expandedIds[] = $t->parent_id;
                }
            }
            $tagIds = array_values(array_unique($expandedIds));
        }

        $asset->tags()->sync($tagIds);
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

        $targetTagIds = $validated['tag_ids'] ?? [];

        // In attach or replace mode, auto-include parent Main Tags for any selected Sub Tags
        if (in_array($action, ['attach', 'replace']) && !empty($targetTagIds)) {
            $chosenTags = Tag::whereIn('id', $targetTagIds)->get();
            $expandedIds = $targetTagIds;
            foreach ($chosenTags as $t) {
                if ($t->parent_id && !in_array($t->parent_id, $expandedIds, true)) {
                    $expandedIds[] = $t->parent_id;
                }
            }
            $targetTagIds = array_values(array_unique($expandedIds));
        }

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
                $asset->tags()->detach($targetTagIds);
            } elseif ($action === 'replace') {
                $asset->tags()->sync($targetTagIds);
            } else {
                $asset->tags()->syncWithoutDetaching($targetTagIds);
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
