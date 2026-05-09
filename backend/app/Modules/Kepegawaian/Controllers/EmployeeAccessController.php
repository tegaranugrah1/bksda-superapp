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
        // Panggil pegawai beserta relasi 'user' nya (Logical Link NIP)
        $employee = Employee::with('user')->findOrFail($id);

        // Jika pegawai ini belum punya akun untuk login
        if (! $employee->user) {
            return response()->json([
                'message' => 'Pegawai ini belum memiliki akses ke aplikasi.',
                'data' => null,
            ]);
        }

        // Jika sudah punya
        return response()->json([
            'message' => 'Data akses pegawai ditemukan.',
            'data' => [
                'username' => $employee->user->username,
                'role' => $employee->user->role,
                'access_modules' => $employee->user->access_modules,
            ],
        ]);
    }

    /**
     * Membuka blokir pintu / Mengubah wewenang Modul
     */
    public function update(EmployeeAccessRequest $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $validated = $request->validated();

        $user = $employee->user;

        // SKENARIO A: Pegawai belum punya Akun, kita buatkan!
        if (! $user) {
            // Pembuatan akun perdana WAJIB diiringi pembuatan password
            if (empty($validated['password'])) {
                return response()->json([
                    'message' => 'Password wajib diisi untuk pembuatan akun baru.',
                ], 422);
            }

            // Rule 6.1: Hubungkan NIP Pegawai menjadi Username Aplikasi
            $user = User::create([
                'username' => $employee->nip,
                'name' => $employee->nama_lengkap, // Salin nama agar bagus di Header Frontend
                'password' => $validated['password'], // Hash bcrypt otomatis diurus oleh model User (Rule 1.5)
                'role' => $validated['role'],
                'access_modules' => $validated['access_modules'],
            ]);

            $message = 'Akun akses berhasil diterbitkan.';
        }

        // SKENARIO B: Pegawai sudah punya Akun, kita perbarui datanya
        else {
            $updateData = [
                'role' => $validated['role'],
                'access_modules' => $validated['access_modules'],
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
    }
}
