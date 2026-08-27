<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CoveringLetterResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_type' => 'covering_letter',
            'number' => $this->number,
            'regarding' => $this->regarding,
            'document_date' => $this->document_date?->format('Y-m-d'),
            'recipient_title' => $this->recipient_title,
            'recipient_location' => $this->recipient_location,
            'items_snapshot' => $this->items_snapshot ?? [],
            'closing_phrase' => $this->closing_phrase,
            'received_date' => $this->received_date?->format('Y-m-d'),
            'show_signatures' => (bool) $this->show_signatures,
            'sender_employee_id' => $this->sender_employee_id,
            'sender_snapshot' => $this->sender_snapshot ?? [],
            'receiver_snapshot' => $this->receiver_snapshot,
            'metadata' => $this->metadata,
            'notes' => $this->notes,
            'sender_employee' => $this->whenLoaded('senderEmployee', function () {
                return $this->senderEmployee ? [
                    'id' => $this->senderEmployee->id,
                    'nama_lengkap' => $this->senderEmployee->nama_lengkap,
                    'nip' => $this->senderEmployee->nip,
                    'jabatan' => $this->senderEmployee->jabatan,
                ] : null;
            }),
            'generator' => $this->whenLoaded('generator', function () {
                return $this->generator ? [
                    'id' => $this->generator->id,
                    'name' => $this->generator->name,
                ] : null;
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
