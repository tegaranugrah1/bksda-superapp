<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Otorisasi dikunci di level Middleware Route nantinya
    }

    public function rules(): array
    {
        return [
            // Jabatan sistemik (Bukan jabatan fungsional instansi)
            'role' => 'required|string|in:super_admin,admin,user',

            // Modul akses (bisa kosong untuk super_admin)
            'access_modules' => 'nullable|array',
            'access_modules.*' => 'string',

            // Granular permissions (bisa kosong)
            'permissions' => 'nullable|array',
            'permissions.*' => 'string',

            // Password bersifat opsional (hanya diisi jika membuat akun baru / mereset)
            // Panjang minimal 8 karakter demi keamanan dasar
            'password' => 'sometimes|nullable|string|min:8',
        ];
    }

    /**
     * Prepare the data for validation.
     * Remove password field if it's empty string (frontend sends "" by default)
     */
    protected function prepareForValidation(): void
    {
        if ($this->password === '' || $this->password === null) {
            $this->request->remove('password');
        }
    }

    public function messages(): array
    {
        return [
            'access_modules.min' => 'Pengguna wajib diberikan minimal 1 akses modul (contoh: dashboard).',
            'role.in' => 'Peran (Role) tidak valid.',
        ];
    }
}
