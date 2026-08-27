<?php

namespace App\Modules\Kepegawaian\Services;

use App\Modules\Kepegawaian\Models\StExpenseTemplate;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StExpenseTemplateService
{
    public function paginate(array $filters = []): LengthAwarePaginator
    {
        $query = StExpenseTemplate::query();

        if (empty($filters['include_inactive']) || $filters['include_inactive'] === 'false' || !empty($filters['active_only'])) {
            $query->where('is_active', true);
        }

        if (!empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['search'])) {
            $search = trim($filters['search']);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('biaya_text', 'like', "%{$search}%");
            });
        }

        $perPage = (int) ($filters['per_page'] ?? 50);

        return $query->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->paginate($perPage);
    }

    public function create(array $data, int $userId): StExpenseTemplate
    {
        return DB::transaction(function () use ($data, $userId): StExpenseTemplate {
            $template = new StExpenseTemplate();
            $template->name = $data['name'];
            $template->code = !empty($data['code']) ? $data['code'] : $this->generateUniqueCode($data['name']);
            $template->category = $data['category'] ?? 'other';
            $template->biaya_text = $data['biaya_text'] ?? null;
            $template->dasar_text = $data['dasar_text'] ?? null;
            $template->is_active = $data['is_active'] ?? true;
            $template->is_default = $data['is_default'] ?? false;
            $template->sort_order = $data['sort_order'] ?? 0;
            $template->created_by = $userId;
            $template->updated_by = $userId;
            $template->save();

            if ($template->is_default) {
                StExpenseTemplate::query()->where('id', '!=', $template->id)->update(['is_default' => false]);
            }

            return $template;
        });
    }

    public function update(StExpenseTemplate $template, array $data, int $userId): StExpenseTemplate
    {
        return DB::transaction(function () use ($template, $data, $userId): StExpenseTemplate {
            if (isset($data['name'])) $template->name = $data['name'];
            if (!empty($data['code'])) $template->code = $data['code'];
            if (isset($data['category'])) $template->category = $data['category'];
            if (array_key_exists('biaya_text', $data)) $template->biaya_text = $data['biaya_text'] ?: null;
            if (array_key_exists('dasar_text', $data)) $template->dasar_text = $data['dasar_text'] ?: null;
            if (isset($data['is_active'])) $template->is_active = (bool) $data['is_active'];
            if (isset($data['is_default'])) $template->is_default = (bool) $data['is_default'];
            if (isset($data['sort_order'])) $template->sort_order = (int) $data['sort_order'];
            $template->updated_by = $userId;
            $template->save();

            if ($template->is_default) {
                StExpenseTemplate::query()->where('id', '!=', $template->id)->update(['is_default' => false]);
            }

            return $template;
        });
    }

    public function toggleActive(StExpenseTemplate $template, bool $active, int $userId): StExpenseTemplate
    {
        $template->is_active = $active;
        $template->updated_by = $userId;
        $template->save();
        return $template;
    }

    public function setDefault(StExpenseTemplate $template, int $userId): StExpenseTemplate
    {
        return DB::transaction(function () use ($template, $userId): StExpenseTemplate {
            StExpenseTemplate::query()->where('id', '!=', $template->id)->update(['is_default' => false]);
            $template->is_default = true;
            $template->is_active = true;
            $template->updated_by = $userId;
            $template->save();
            return $template;
        });
    }

    public function duplicate(StExpenseTemplate $template, int $userId): StExpenseTemplate
    {
        return DB::transaction(function () use ($template, $userId): StExpenseTemplate {
            $newName = $template->name . ' (Salinan)';
            $newCode = $this->generateUniqueCode($newName);

            $clone = new StExpenseTemplate();
            $clone->name = $newName;
            $clone->code = $newCode;
            $clone->category = $template->category;
            $clone->biaya_text = $template->biaya_text;
            $clone->dasar_text = $template->dasar_text;
            $clone->is_active = true;
            $clone->is_default = false;
            $clone->sort_order = $template->sort_order + 1;
            $clone->created_by = $userId;
            $clone->updated_by = $userId;
            $clone->save();

            return $clone;
        });
    }

    public function delete(StExpenseTemplate $template): void
    {
        $template->delete();
    }

    private function generateUniqueCode(string $name): string
    {
        $base = Str::slug($name);
        if (empty($base)) {
            $base = 'biaya-' . Str::lower(Str::random(6));
        }

        $code = $base;
        $counter = 1;
        while (StExpenseTemplate::withTrashed()->where('code', $code)->exists()) {
            $code = "{$base}-{$counter}";
            $counter++;
        }

        return $code;
    }
}
