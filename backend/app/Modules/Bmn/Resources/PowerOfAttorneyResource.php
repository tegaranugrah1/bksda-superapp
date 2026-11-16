<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;
use Throwable;

class PowerOfAttorneyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewerToken = $request->bearerToken() ?: $request->query('token');

        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'number' => $this->number,
            'status' => $this->status ?? 'draft',
            'kap' => $this->kap,
            'document_date' => $this->document_date?->toDateString(),
            'first_party_snapshot' => $this->first_party_snapshot,
            'second_party_snapshot' => $this->second_party_snapshot,
            'assets_snapshot' => AssetResource::attachViewerQueryToken($this->assets_snapshot, $viewerToken),
            'asset_ids' => $this->asset_ids,
            'notes' => $this->notes,
            'ktp_path' => $this->ktp_path,
            'ktp_url' => $this->resolveKtpUrl($viewerToken),
            'employee' => $this->whenLoaded('employee', fn () => [
                'id' => $this->employee->id,
                'nama_lengkap' => $this->employee->nama_lengkap,
                'nip' => $this->employee->nip,
                'jabatan' => $this->employee->jabatan,
                'pangkat_golongan' => $this->employee->pangkat_golongan,
            ]),
            'generated_by' => $this->generated_by,
            'generator' => $this->whenLoaded('generator', fn () => [
                'id' => $this->generator->id,
                'name' => $this->generator->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private function resolveKtpUrl(?string $viewerToken = null): ?string
    {
        if (! $this->ktp_path) {
            return null;
        }

        if ($this->id && Storage::disk('local')->exists($this->ktp_path)) {
            $tokenParam = $viewerToken ? '?token=' . urlencode($viewerToken) : '';

            return "/api/bmn/power-of-attorneys/{$this->id}/ktp{$tokenParam}";
        }

        try {
            return Storage::url($this->ktp_path);
        } catch (Throwable) {
            return null;
        }
    }
}
