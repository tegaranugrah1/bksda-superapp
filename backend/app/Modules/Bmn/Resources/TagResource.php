<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TagResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'label' => $this->label,
            'color' => $this->color ?? 'emerald',
            'description' => $this->description,
            'is_main_tag' => is_null($this->parent_id),
            'is_sub_tag' => !is_null($this->parent_id),
            'parent' => $this->whenLoaded('parent', function () {
                return $this->parent ? [
                    'id' => $this->parent->id,
                    'name' => $this->parent->name,
                    'label' => $this->parent->label,
                    'color' => $this->parent->color,
                ] : null;
            }),
            'sub_tags' => TagResource::collection($this->whenLoaded('subTags')),
            'sub_tags_count' => $this->whenCounted('subTags', $this->sub_tags_count),
            'assets_count' => $this->when(isset($this->assets_count), $this->assets_count),
            'direct_assets_count' => $this->when(isset($this->direct_assets_count), $this->direct_assets_count),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
