<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HandoverAgreementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_type' => 'handover_agreement',
            'variant' => $this->variant,
            'first_party_employee_id' => $this->first_party_employee_id,
            'second_party_employee_id' => $this->second_party_employee_id,
            'title' => $this->title,
            'number' => $this->number,
            'kap' => $this->kap,
            'document_date' => $this->document_date?->toDateString(),
            'first_party_snapshot' => $this->first_party_snapshot,
            'second_party_snapshot' => $this->second_party_snapshot,
            'witness_snapshot' => $this->witness_snapshot,
            'items_snapshot' => $this->items_snapshot,
            'asset_ids' => $this->asset_ids,
            'metadata' => $this->metadata,
            'notes' => $this->notes,
            'first_party_employee' => $this->whenLoaded('firstPartyEmployee', fn () => [
                'id' => $this->firstPartyEmployee->id,
                'nama_lengkap' => $this->firstPartyEmployee->nama_lengkap,
                'nip' => $this->firstPartyEmployee->nip,
                'jabatan' => $this->firstPartyEmployee->jabatan,
                'pangkat_golongan' => $this->firstPartyEmployee->pangkat_golongan,
            ]),
            'second_party_employee' => $this->whenLoaded('secondPartyEmployee', fn () => [
                'id' => $this->secondPartyEmployee->id,
                'nama_lengkap' => $this->secondPartyEmployee->nama_lengkap,
                'nip' => $this->secondPartyEmployee->nip,
                'jabatan' => $this->secondPartyEmployee->jabatan,
                'pangkat_golongan' => $this->secondPartyEmployee->pangkat_golongan,
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
