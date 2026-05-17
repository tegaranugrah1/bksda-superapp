<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MeDashboardResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'user' => [
                'id' => $this->id,
                'name' => $this->name,
                'username' => $this->username,
                'email' => $this->email,
                'role' => $this->role,
                'access_modules' => $this->access_modules ?? [],
            ],
            'employee' => $this->whenLoaded('employee', function () {
                if (! $this->employee) {
                    return null;
                }

                return [
                    'id' => $this->employee->id,
                    'nip' => $this->employee->nip,
                    'name' => $this->employee->nama_lengkap,
                    'position' => $this->employee->jabatan,
                    'department' => $this->employee->satuan_kerja,
                    'email' => $this->employee->email,
                    'phone' => $this->employee->no_telepon,
                    'photo' => $this->employee->foto_profil ? \Illuminate\Support\Facades\Storage::url($this->employee->foto_profil) : null,
                    'rank' => $this->employee->pangkat_golongan,
                    'rank_level' => 0,
                    'is_active' => $this->employee->is_active,
                ];
            }),
            'my_assets' => $this->whenLoaded('loans', function () {
                return $this->loans->map(function ($loan) {
                    return [
                        'id' => $loan->asset->id,
                        'nama_barang' => $loan->asset->nama_barang,
                        'kode_barang' => $loan->asset->kode_barang,
                        'nup' => $loan->asset->nup,
                        'loan_date' => $loan->tanggal_pinjam?->toIso8601String(),
                        'due_date' => $loan->tanggal_kembali?->toIso8601String(),
                        'status' => $loan->status,
                        'merk' => $loan->asset->merk_tipe,
                    ];
                });
            }),
        ];
    }
}
