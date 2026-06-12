<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsageAgreementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'number' => $this->number,
            'kap' => $this->kap,
            'document_date' => $this->document_date?->toDateString(),
            'first_party_snapshot' => $this->first_party_snapshot,
            'second_party_snapshot' => $this->second_party_snapshot,
            'assets_snapshot' => $this->assets_snapshot,
            'asset_ids' => $this->asset_ids,
            'notes' => $this->notes,
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
}
