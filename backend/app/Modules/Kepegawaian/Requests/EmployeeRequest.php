<?php

namespace App\Modules\Kepegawaian\Requests;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\UploadValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class EmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdminFor('kepegawaian');
    }

    protected function prepareForValidation(): void
    {
        $rawJenis = $this->input('jenis_pegawai');
        $jenis = is_string($rawJenis) ? strtoupper(trim($rawJenis)) : '';
        $rawNip = $this->input('nip');
        $nipInput = is_string($rawNip) ? trim($rawNip) : null;

        if ($this->has('nama_lengkap') && is_string($nama = $this->input('nama_lengkap'))) {
            $this->merge(['nama_lengkap' => strip_tags(trim($nama))]);
        }

        foreach (['jabatan', 'satuan_kerja', 'resor', 'pangkat_golongan', 'masa_kerja'] as $field) {
            if ($this->has($field) && is_string($val = $this->input($field))) {
                $this->merge([$field => strip_tags(trim($val)) ?: null]);
            }
        }

        if ($this->filled('location_id')) {
            $locId = $this->input('location_id');
            if (is_string($locId) && Str::isUuid($locId)) {
                $loc = \App\Modules\Bmn\Models\Location::with('parent')
                    ->where('is_active', true)
                    ->find($locId);
                if ($loc) {
                    $this->merge([
                        'satuan_kerja' => $loc->effectiveUnitKerja(),
                        'resor' => $loc->derivedResorCode(),
                    ]);
                }
            }
        } elseif ($this->has('satuan_kerja') || $this->has('resor')) {
            $rawSatker = $this->input('satuan_kerja');
            $rawResor = $this->input('resor');
            if ((is_string($rawSatker) || $rawSatker === null) && (is_string($rawResor) || $rawResor === null)) {
                $satkerIn = trim((string) ($rawSatker ?? ''));
                $resorIn = trim((string) ($rawResor ?? ''));
                // Jangan auto-resolve location_id jika payload sengaja membawa konflik untuk cross-validation
                $resorSlug = \App\Modules\Bmn\Models\Location::canonicalUnitSlug($resorIn);
                $satkerSlug = \App\Modules\Bmn\Models\Location::canonicalUnitSlug($satkerIn);
                $hasConflict = $resorIn !== '' && $satkerSlug !== null && $resorSlug !== null && $resorSlug !== $satkerSlug;
                if (! $hasConflict) {
                    $resolved = \App\Modules\Bmn\Models\Location::resolveForPlacement(null, $satkerIn, $resorIn);
                    if ($resolved) {
                        $this->merge(['location_id' => $resolved->id]);
                    }
                }
            }
        }

        if ($this->has('nama_bank') && is_string($rawBankInput = $this->input('nama_bank'))) {
            $rawBank = strip_tags(trim($rawBankInput));
            if ($rawBank === '' || $rawBank === '-') {
                $this->merge(['nama_bank' => null]);
            } else {
                $canonical = \Illuminate\Support\Facades\DB::table('kpg_registered_banks')
                    ->whereRaw('LOWER(TRIM(nama_bank)) = ?', [strtolower($rawBank)])
                    ->value('nama_bank');
                $this->merge(['nama_bank' => $canonical ?: $rawBank]);
            }
        }

        foreach (['nomor_rekening', 'telepon', 'email'] as $field) {
            if ($this->has($field) && is_string($val = $this->input($field))) {
                $cleaned = strip_tags(trim($val));
                if ($field === 'email') {
                    $cleaned = strtolower($cleaned);
                }
                $this->merge([$field => ($cleaned === '' || $cleaned === '-') ? null : $cleaned]);
            }
        }

        if ($jenis === 'MMP') {
            $employeeId = $this->route('employee');
            $finalNip = $nipInput ?? '';

            if ($finalNip === '' || (! str_starts_with(strtoupper($finalNip), 'MMP-') && ($nipInput !== null || ! $this->has('nip') || $rawNip === null))) {
                $existing = $employeeId ? Employee::find($employeeId) : null;
                $finalNip = ($existing && str_starts_with(strtoupper((string) $existing->nip), 'MMP-'))
                    ? $existing->nip
                    : Employee::generateNextMmpCode();
            }

            $mergeMmp = [
                'pangkat_golongan' => null,
                'nama_bank' => null,
                'nomor_rekening' => null,
            ];
            if ($finalNip !== '') {
                $mergeMmp['nip'] = $finalNip;
            }
            $this->merge($mergeMmp);
        } elseif ($nipInput !== null && $nipInput !== '') {
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
                    if (! is_string($value)) {
                        return;
                    }
                    $clean = trim($value);
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
            'location_id' => ['nullable', 'uuid', \Illuminate\Validation\Rule::exists('bmn_locations', 'id')->where('is_active', true)],
            'masa_kerja' => ['nullable', 'string', 'max:100'],
            'nama_bank' => [
                'nullable',
                'string',
                'max:50',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if (! is_string($value)) {
                        return;
                    }
                    $bankVal = trim($value);
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
                    if (! is_string($value)) {
                        return;
                    }
                    $resorVal = trim($value);
                    if ($resorVal === '') {
                        return;
                    }

                    $validResors = array_keys(\App\Constants\BksdaConstants::RESORS);
                    $dbResor = \App\Modules\Bmn\Models\Location::with('parent')
                        ->where('code', $resorVal)
                        ->where('location_type', \App\Modules\Bmn\Models\Location::TYPE_RESOR)
                        ->where('is_active', true)
                        ->first();

                    if (! $dbResor && ! in_array($resorVal, $validResors, true)) {
                        $fail('Kode resor penempatan tidak valid.');
                        return;
                    }

                    $rawSatker = $this->input('satuan_kerja', '');
                    $satker = is_string($rawSatker) ? strtolower($rawSatker) : '';
                    $satkerSlug = \App\Modules\Bmn\Models\Location::canonicalUnitSlug($satker);

                    // Cross-validation: Balai tidak boleh ditempatkan di resor wilayah
                    if ($satkerSlug === 'balai-samarinda' || str_contains($satker, 'balai')) {
                        $fail('Pegawai kantor Balai tidak dapat ditempatkan di resor wilayah.');
                        return;
                    }

                    $resorMeta = \App\Constants\BksdaConstants::RESORS[$resorVal] ?? null;
                    if ($resorMeta) {
                        $expectedSlug = $resorMeta['skw_slug'] ?? null;
                        if ($expectedSlug === 'skw-1-berau' && $satkerSlug !== 'skw-1-berau') {
                            $fail("Resor '{$resorMeta['name']}' hanya valid untuk pegawai SKW I Berau.");
                        } elseif ($expectedSlug === 'skw-2-tenggarong' && $satkerSlug !== 'skw-2-tenggarong') {
                            $fail("Resor '{$resorMeta['name']}' hanya valid untuk pegawai SKW II Tenggarong.");
                        } elseif ($expectedSlug === 'skw-3-balikpapan' && $satkerSlug !== 'skw-3-balikpapan') {
                            $fail("Resor '{$resorMeta['name']}' hanya valid untuk pegawai SKW III Balikpapan.");
                        }
                    } elseif ($dbResor && $dbResor->parent && $satker !== '') {
                        $parentName = strtolower($dbResor->parent->effectiveUnitKerja());
                        if ($satker !== $parentName && $satker !== strtolower($dbResor->parent->name)) {
                            $fail("Resor '{$dbResor->name}' hanya valid untuk {$dbResor->parent->name}.");
                        }
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
