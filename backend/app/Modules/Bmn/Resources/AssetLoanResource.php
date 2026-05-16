<?php

namespace App\Modules\Bmn\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetLoanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Calculate late days
        $lateDays = null;
        if ($this->due_date) {
            if ($this->return_date ?? $this->tanggal_kembali) {
                $returnDate = $this->tanggal_kembali;
                if ($returnDate > $this->due_date) {
                    $lateDays = $returnDate->diffInDays($this->due_date);
                }
            } elseif (in_array($this->status, ['dipinjam', 'terlambat'])) {
                $now = now()->startOfDay();
                $due = $this->due_date->startOfDay();
                if ($now->gt($due)) {
                    $lateDays = $now->diffInDays($due);
                }
            }
        }

        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'borrower_employee_id' => $this->employee_id,
            'loan_date' => $this->tanggal_pinjam?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'return_date' => $this->tanggal_kembali?->toDateString(),
            'return_condition' => $this->return_condition,
            'status' => $this->status,
            'purpose' => $this->purpose,
            'notes' => $this->notes ?? $this->keterangan,
            'late_days' => $lateDays,
            'asset' => $this->whenLoaded('asset', function () {
                return [
                    'id' => $this->asset->id,
                    'kode_barang' => $this->asset->kode_barang,
                    'nama_barang' => $this->asset->nama_barang,
                ];
            }),
            'borrower' => $this->whenLoaded('borrower', function () {
                return [
                    'id' => $this->borrower->id,
                    'name' => $this->borrower->nama_lengkap ?? $this->borrower->nama ?? $this->borrower->name ?? '-',
                    'nip' => $this->borrower->nip,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
