<?php

namespace App\Modules\Kepegawaian\Services;

use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\StTemplate;
use App\Modules\Kepegawaian\Models\StTemplateVersion;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StTemplateService
{
    public function list(bool $includeInactive = false, int $perPage = 50): LengthAwarePaginator
    {
        $query = StTemplate::query()
            ->with('defaultSigner:id,nama_lengkap,nip,jabatan')
            ->orderByDesc('is_default')
            ->orderBy('name');

        if (! $includeInactive) {
            $query->where('is_active', true);
        }

        return $query->paginate(min(max($perPage, 1), 100));
    }

    public function create(array $data, int $userId): StTemplate
    {
        return DB::transaction(function () use ($data, $userId): StTemplate {
            $template = new StTemplate($this->templateAttributes($data));
            $template->code = $template->code ?: $this->uniqueCode($template->name);
            $template->created_by = $userId;
            $template->updated_by = $userId;
            $template->is_system = false;
            $template->is_active = $data['is_active'] ?? true;
            $template->is_default = false;
            $template->version = 1;
            $this->applySignerSnapshot($template, $data['default_signer_employee_id'] ?? null);
            $template->save();
            $this->recordVersion($template, $userId);

            if (($data['is_default'] ?? false) === true) {
                $this->setDefault($template, $userId);
            }

            return $template->fresh('defaultSigner');
        });
    }

    public function update(StTemplate $template, array $data, int $userId): StTemplate
    {
        return DB::transaction(function () use ($template, $data, $userId): StTemplate {
            $template->fill($this->templateAttributes($data));
            $template->updated_by = $userId;
            $template->version = ((int) $template->version) + 1;

            if (array_key_exists('is_active', $data)) {
                if ($template->is_default && ! $data['is_active']) {
                    throw new \DomainException('Template default harus tetap aktif atau ganti default terlebih dahulu.');
                }
                $template->is_active = (bool) $data['is_active'];
            }

            if (array_key_exists('default_signer_employee_id', $data)) {
                $this->applySignerSnapshot($template, $data['default_signer_employee_id']);
            }

            $template->save();
            $this->recordVersion($template, $userId);

            if (($data['is_default'] ?? false) === true) {
                $this->setDefault($template, $userId);
            }

            return $template->fresh('defaultSigner');
        });
    }

    public function setDefault(StTemplate $template, int $userId): StTemplate
    {
        if (! $template->is_active) {
            throw new \DomainException('Template nonaktif tidak dapat dijadikan default.');
        }

        StTemplate::query()->where('id', '!=', $template->id)->update([
            'is_default' => false,
            'updated_by' => $userId,
        ]);

        $template->update([
            'is_default' => true,
            'updated_by' => $userId,
        ]);

        return $template->fresh('defaultSigner');
    }

    public function toggleActive(StTemplate $template, bool $active, int $userId): StTemplate
    {
        if (! $active && $template->is_default) {
            throw new \DomainException('Template default harus tetap aktif atau ganti default terlebih dahulu.');
        }

        $template->update([
            'is_active' => $active,
            'updated_by' => $userId,
        ]);

        return $template->fresh('defaultSigner');
    }

    public function duplicate(StTemplate $template, int $userId): StTemplate
    {
        $copy = $template->replicate([
            'is_system', 'is_default', 'created_by', 'updated_by', 'created_at', 'updated_at',
        ]);
        $copy->name = $template->name.' (Salinan)';
        $copy->code = Str::slug($template->code.'-salinan-'.Str::lower(Str::random(5)));
        $copy->is_system = false;
        $copy->is_default = false;
        $copy->is_active = true;
        $copy->version = 1;
        $copy->created_by = $userId;
        $copy->updated_by = $userId;
        $copy->save();
        $this->recordVersion($copy, $userId);

        return $copy->fresh('defaultSigner');
    }

    public function delete(StTemplate $template): void
    {
        if ($template->is_system) {
            throw new \DomainException('Template sistem tidak dapat dihapus. Nonaktifkan template jika tidak digunakan.');
        }

        if ($template->is_default) {
            throw new \DomainException('Template default tidak dapat dihapus. Tetapkan template lain sebagai default terlebih dahulu.');
        }

        $template->delete();
    }

    public function snapshot(?StTemplate $template, array $fallback): ?array
    {
        if (! $template) {
            return null;
        }

        return [
            'id' => $template->id,
            'code' => $template->code,
            'name' => $template->name,
            'version' => (int) $template->version,
            'type' => $template->type,
            'menimbang' => $fallback['menimbang'] ?? $template->menimbang ?? [],
            'dasar' => $fallback['dasar'] ?? $template->dasar ?? [],
            'configuration' => $template->configuration ?? [],
            'signer' => [
                'employee_id' => $template->default_signer_employee_id,
                'name' => $fallback['penandatangan_nama'] ?? $template->default_signer_name,
                'nip' => $fallback['penandatangan_nip'] ?? $template->default_signer_nip,
            ],
        ];
    }

    private function templateAttributes(array $data): array
    {
        return array_filter([
            'name' => $data['name'] ?? null,
            'code' => $data['code'] ?? null,
            'description' => $data['description'] ?? null,
            'type' => $data['type'] ?? null,
            'menimbang' => $data['menimbang'] ?? null,
            'dasar' => $data['dasar'] ?? null,
            'configuration' => $data['configuration'] ?? null,
        ], static fn ($value): bool => $value !== null);
    }

    private function recordVersion(StTemplate $template, int $userId): void
    {
        StTemplateVersion::create([
            'st_template_id' => $template->id,
            'version' => (int) ($template->version ?: 1),
            'snapshot' => [
                'name' => $template->name,
                'code' => $template->code,
                'description' => $template->description,
                'type' => $template->type,
                'menimbang' => $template->menimbang ?? [],
                'dasar' => $template->dasar ?? [],
                'default_signer_employee_id' => $template->default_signer_employee_id,
                'default_signer_name' => $template->default_signer_name,
                'default_signer_nip' => $template->default_signer_nip,
                'configuration' => $template->configuration ?? [],
            ],
            'changed_by' => $userId,
        ]);
    }

    private function uniqueCode(?string $name): string
    {
        $base = Str::slug($name ?: 'template');
        $code = $base;
        $suffix = 2;

        while (StTemplate::withTrashed()->where('code', $code)->exists()) {
            $code = $base.'-'.$suffix;
            $suffix++;
        }

        return $code;
    }

    private function applySignerSnapshot(StTemplate $template, mixed $employeeId): void
    {
        if (! $employeeId) {
            $template->default_signer_employee_id = null;
            $template->default_signer_name = null;
            $template->default_signer_nip = null;

            return;
        }

        $employee = Employee::query()->select(['id', 'nama_lengkap', 'nip'])->findOrFail($employeeId);
        $template->default_signer_employee_id = $employee->id;
        $template->default_signer_name = $employee->nama_lengkap;
        $template->default_signer_nip = $employee->nip;
    }
}
