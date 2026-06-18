<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Sesuai Rule 5.5: Jangan return data sensitif.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role,
            'access_modules' => $this->access_modules ?? [], // Kembalikan array kosong jika null
            'permissions' => $this->permissions,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'employee' => $this->getEmployeeData(),
        ];
    }

    /**
     * Load the associated employee details.
     */
    private function getEmployeeData(): ?array
    {
        try {
            $employee = \App\Modules\Kepegawaian\Models\Employee::where('nip', $this->username)->first();
            if (!$employee) {
                return null;
            }
            return [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'name' => $employee->nama_lengkap,
                'position' => $employee->jabatan,
                'department' => $employee->satuan_kerja,
                'email' => $employee->email,
                'phone' => $employee->no_telepon ?? null,
                'photo' => $employee->foto_profil ? \Illuminate\Support\Facades\Storage::url($employee->foto_profil) : null,
                'rank' => $employee->pangkat_golongan,
                'is_active' => $employee->is_active,
            ];
        } catch (\Exception $e) {
            return null;
        }
    }
}
