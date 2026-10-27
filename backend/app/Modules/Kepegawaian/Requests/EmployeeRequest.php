<?php

namespace App\Modules\Kepegawaian\Requests;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\UploadValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['super_admin', 'admin'], true);
    }

    protected function prepareForValidation(): void
    {
        $jenis = strtoupper(trim((string) $this->input('jenis_pegawai', '')));
        $nipInput = trim((string) $this->input('nip', ''));

        if ($this->has('nama_lengkap')) {
            $this->merge(['nama_lengkap' => trim((string) $this->input('nama_lengkap'))]);
        }
        if ($this->has('jabatan')) {
            $this->merge(['jabatan' => trim((string) $this->input('jabatan')) ?: null]);
        }

        if ($jenis === 'MMP') {
            $employeeId = $this->route('employee');
            $finalNip = $nipInput;

            if ($finalNip === '' || ! str_starts_with(strtoupper($finalNip), 'MMP-')) {
                $existing = $employeeId ? Employee::find($employeeId) : null;
                $finalNip = ($existing && str_starts_with(strtoupper((string) $existing->nip), 'MMP-'))
                    ? $existing->nip
                    : Employee::generateNextMmpCode();
            }

            $this->merge([
                'nip' => $finalNip,
                'pangkat_golongan' => null,
            ]);
        } elseif ($nipInput !== '') {
            $this->merge(['nip' => $nipInput]);
        }
    }

    public function rules(): array
    {
        $employeeId = $this->route('employee');
        $existingEmployee = $employeeId ? Employee::withTrashed()->find($employeeId) : null;
        $oldNip = $existingEmployee ? trim((string) $existingEmployee->nip) : null;

        return [
            'jenis_pegawai' => ['nullable', 'string', Rule::in(['PNS', 'PPPK', 'MMP'])],
            'nip' => [
                'required',
                'string',
                'max:50',
                Rule::unique('kpg_employees', 'nip')->ignore($employeeId),
                function (string $attribute, mixed $value, \Closure $fail) use ($oldNip) {
                    $clean = trim((string) $value);
                    if ($clean === '' || $clean === $oldNip) {
                        return;
                    }
                    if (User::where('username', $clean)->exists()) {
                        $fail('NIP / kode tersebut sudah digunakan oleh akun pengguna lain di sistem.');
                    }
                },
            ],
            'nama_lengkap' => ['required', 'string', 'max:255'],
            'jabatan' => ['nullable', 'string', 'max:255'],
            'pangkat_golongan' => ['nullable', 'string', 'max:255'],
            'satuan_kerja' => ['nullable', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'foto' => UploadValidationRules::image(required: false, maxKilobytes: 10240),
        ];
    }

    public function messages(): array
    {
        return [
            'nip.unique' => 'NIP / NIPPPK tersebut sudah terdaftar di sistem.',
            'foto.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'foto.max' => 'Ukuran foto tidak boleh lebih dari 10 MB.',
        ];
    }
}
