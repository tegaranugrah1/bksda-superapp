<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Requests\EmployeeAccessRequest;
use Illuminate\Http\JsonResponse;

class EmployeeAccessController extends Controller
{
    /**
     * Mengecek status hak akses pegawai saat ini
     */
    public function show($id): JsonResponse
    {
        // Panggil pegawai
        $employee = Employee::findOrFail($id);

        // Find user by NIP (trim whitespace for safety)
        $user = User::where('username', trim($employee->nip))->first();

        // Jika pegawai ini belum punya akun untuk login
        if (! $user) {
            return response()->json([
                'message' => 'Pegawai ini belum memiliki akses ke aplikasi.',
                'data' => null,
            ]);
        }

        // Jika sudah punya
        return response()->json([
            'message' => 'Data akses pegawai ditemukan.',
            'data' => [
                'username' => $user->username,
                'role' => $user->role,
                'access_modules' => $user->access_modules,
            ],
        ]);
    }

    /**
     * Membuka blokir pintu / Mengubah wewenang Modul
     */
    public function update(EmployeeAccessRequest $request, $id): JsonResponse
    {
        try {
            $employee = Employee::findOrFail($id);
            $validated = $request->validated();

            // Try to find user by NIP (trim whitespace for safety)
            $user = User::where('username', trim($employee->nip))->first();

        // SKENARIO A: Pegawai belum punya Akun, kita buatkan!
        if (! $user) {
            // Pembuatan akun perdana — jika password tidak diisi, gunakan default "12345678"
            $password = !empty($validated['password']) ? $validated['password'] : '12345678';

            // Rule 6.1: Hubungkan NIP Pegawai menjadi Username Aplikasi
            $user = User::create([
                'username' => trim($employee->nip),
                'name' => $employee->nama_lengkap,
                'password' => $password,
                'role' => $validated['role'],
                'access_modules' => $validated['access_modules'] ?? [],
            ]);

            $message = 'Akun akses berhasil diterbitkan (password default: 12345678).';
        }

        // SKENARIO B: Pegawai sudah punya Akun, kita perbarui datanya
        else {
            $updateData = [
                'role' => $validated['role'],
                'access_modules' => $validated['access_modules'] ?? [],
            ];

            // Jika dikirimi password (berarti admin ingin mereset password stafnya)
            if (! empty($validated['password'])) {
                $updateData['password'] = $validated['password'];
            }

            $user->update($updateData);
            $message = 'Data hak akses berhasil diperbarui.';
        }

        return response()->json([
            'message' => $message,
            'data' => [
                'username' => $user->username,
                'role' => $user->role,
                'access_modules' => $user->access_modules,
            ],
        ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Server Error',
                'message' => $e->getMessage(),
                'file' => $e->getFile() . ':' . $e->getLine(),
            ], 500);
        }
    }
}
