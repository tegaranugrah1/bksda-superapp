<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeRequest extends FormRequest
{
    /**
     * Tentukan siapa yang boleh melakukan request ini.
     * Secara bawaan izinkan saja, karena Auth diurus oleh Middleware (Issue 12/13).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Rule 1.4, 4.1, & 4.2: Validasi ketat untuk teks dan ukuran file (Max 10 MB)
     */
    public function rules(): array
    {
        // Deteksi apakah ini operasi Update (PUT/PATCH) atau Create (POST)
        $employeeId = $this->route('employee');

        return [
            // NIP harus unique. Jika sedang Update, abaikan NIP miliknya sendiri
            'nip' => 'required|string|max:50|unique:kpg_employees,nip,' . $employeeId,
            'nama_lengkap' => 'required|string|max:255',
            'jabatan' => 'nullable|string|max:255',
            'pangkat_golongan' => 'nullable|string|max:255',
            'satuan_kerja' => 'nullable|string|max:255',
            'is_active' => 'boolean',

            // Aturan File (MIME types strict) - Hanya gambar
            'foto' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:10240',
        ];
    }

    /**
     * Kustomisasi pesan error ke Bahasa Indonesia agar Frontend mudah menampilkannya.
     */
    public function messages(): array
    {
        return [
            'nip.unique' => 'NIP tersebut sudah terdaftar di sistem.',
            'foto.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'foto.max' => 'Ukuran foto tidak boleh lebih dari 10 MB.',
        ];
    }
}
