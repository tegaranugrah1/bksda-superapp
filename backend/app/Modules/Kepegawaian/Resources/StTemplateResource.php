<?php

namespace App\Modules\Kepegawaian\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'type' => $this->type,
            'menimbang' => $this->menimbang ?? [],
            'dasar' => $this->dasar ?? [],
            'default_signer' => $this->defaultSigner ? [
                'id' => $this->defaultSigner->id,
                'name' => $this->default_signer_name,
                'nip' => $this->default_signer_nip,
                'jabatan' => $this->defaultSigner->jabatan,
            ] : ($this->default_signer_name ? [
                'id' => $this->default_signer_employee_id,
                'name' => $this->default_signer_name,
                'nip' => $this->default_signer_nip,
                'jabatan' => null,
            ] : null),
            'default_signer_employee_id' => $this->default_signer_employee_id,
            'default_signer_name' => $this->default_signer_name,
            'default_signer_nip' => $this->default_signer_nip,
            'configuration' => $this->configuration ?? [],
            'is_system' => (bool) $this->is_system,
            'is_active' => (bool) $this->is_active,
            'is_default' => (bool) $this->is_default,
            'version' => (int) ($this->version ?? 1),
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
