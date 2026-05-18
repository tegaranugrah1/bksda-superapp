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

            // Rule 2.4: Modul akses (opsional untuk super_admin)
            'access_modules' => 'present|array',
            'access_modules.*' => 'string',

            // Password bersifat opsional (hanya diisi jika membuat akun baru / mereset)
            // Panjang minimal 8 karakter demi keamanan dasar
            'password' => 'nullable|string|min:8',
        ];
    }

    public function messages(): array
    {
        return [
            'access_modules.min' => 'Pengguna wajib diberikan minimal 1 akses modul (contoh: dashboard).',
            'role.in' => 'Peran (Role) tidak valid.',
        ];
    }
}
