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
            $this->merge(['nama_lengkap' => strip_tags(trim((string) $this->input('nama_lengkap')))]);
        }
        if ($this->has('jabatan')) {
            $this->merge(['jabatan' => strip_tags(trim((string) $this->input('jabatan'))) ?: null]);
        }
        if ($this->has('satuan_kerja')) {
            $this->merge(['satuan_kerja' => strip_tags(trim((string) $this->input('satuan_kerja'))) ?: null]);
        }
        if ($this->has('resor')) {
            $this->merge(['resor' => strip_tags(trim((string) $this->input('resor'))) ?: null]);
        }
        if ($this->has('pangkat_golongan')) {
            $this->merge(['pangkat_golongan' => strip_tags(trim((string) $this->input('pangkat_golongan'))) ?: null]);
        }
        if ($this->has('masa_kerja')) {
            $this->merge(['masa_kerja' => strip_tags(trim((string) $this->input('masa_kerja'))) ?: null]);
        }
        if ($this->has('nama_bank')) {
            $rawBank = strip_tags(trim((string) $this->input('nama_bank')));
            if ($rawBank === '' || $rawBank === '-') {
                $this->merge(['nama_bank' => null]);
            } else {
                $canonical = \Illuminate\Support\Facades\DB::table('kpg_registered_banks')
                    ->whereRaw('LOWER(TRIM(nama_bank)) = ?', [strtolower($rawBank)])
                    ->value('nama_bank');
                $this->merge(['nama_bank' => $canonical ?: $rawBank]);
            }
        }
        if ($this->has('nomor_rekening')) {
            $r = strip_tags(trim((string) $this->input('nomor_rekening')));
            $this->merge(['nomor_rekening' => ($r === '' || $r === '-') ? null : $r]);
        }
        if ($this->has('telepon')) {
            $t = strip_tags(trim((string) $this->input('telepon')));
            $this->merge(['telepon' => ($t === '' || $t === '-') ? null : $t]);
        }
        if ($this->has('email')) {
            $e = strtolower(strip_tags(trim((string) $this->input('email'))));
            $this->merge(['email' => ($e === '' || $e === '-') ? null : $e]);
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
                'nama_bank' => null,
                'nomor_rekening' => null,
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
            'masa_kerja' => ['nullable', 'string', 'max:100'],
            'nama_bank' => [
                'nullable',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $bankVal = trim((string) $value);
                    if ($bankVal !== '') {
                        $exists = \Illuminate\Support\Facades\DB::table('kpg_registered_banks')
                            ->whereRaw('LOWER(TRIM(nama_bank)) = ?', [strtolower($bankVal)])
                            ->exists();
                        if (!$exists) {
                            $fail("Bank '{$value}' belum terdaftar di pengaturan master bank.");
                        }
                    }
                },
            ],
            'nomor_rekening' => ['nullable', 'string', 'max:50'],
            'telepon' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:100'],
            'resor' => [
                'nullable',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $resorVal = trim((string) $value);
                    if ($resorVal === '') {
                        return;
                    }

                    $validResors = array_keys(\App\Constants\BksdaConstants::RESORS);
                    if (! in_array($resorVal, $validResors, true)) {
                        $fail('Kode resor penempatan tidak valid.');
                        return;
                    }

                    $satker = strtolower((string) $this->input('satuan_kerja', ''));

                    // Cross-validation: Balai tidak boleh ditempatkan di resor wilayah
                    if (str_contains($satker, 'balai') || str_contains($satker, 'samarinda')) {
                        $fail('Pegawai kantor Balai tidak dapat ditempatkan di resor wilayah.');
                        return;
                    }

                    $resorMeta = \App\Constants\BksdaConstants::RESORS[$resorVal] ?? null;
                    if (! $resorMeta) return;

                    $expectedSkw = (int) ($resorMeta['skw'] ?? 0);
                    if ($expectedSkw === 1 && ! (str_contains($satker, 'wilayah i') || str_contains($satker, 'skw i') || str_contains($satker, 'berau'))) {
                        $fail("Resor '{$resorMeta['name']}' hanya valid untuk pegawai SKW I Berau.");
                    } elseif ($expectedSkw === 2 && ! (str_contains($satker, 'wilayah ii') || str_contains($satker, 'skw ii') || str_contains($satker, 'tenggarong'))) {
                        $fail("Resor '{$resorMeta['name']}' hanya valid untuk pegawai SKW II Tenggarong.");
                    } elseif ($expectedSkw === 3 && ! (str_contains($satker, 'wilayah iii') || str_contains($satker, 'skw iii') || str_contains($satker, 'balikpapan'))) {
                        $fail("Resor '{$resorMeta['name']}' hanya valid untuk pegawai SKW III Balikpapan.");
                    }
                },
            ],
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
