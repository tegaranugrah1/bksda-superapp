<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Models\EmployeeHistory;
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

        $nip = trim((string) $employee->nip);
        if ($nip === '') {
            return response()->json([
                'message' => 'Pegawai tidak memiliki NIP yang valid.',
                'data' => null,
            ], 422);
        }

        // Find user by NIP (trim whitespace for safety)
        $user = User::where('username', $nip)->first();

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
                'is_active' => $user->is_active,
                'access_modules' => $user->access_modules,
                'permissions' => $user->permissions,
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

            $nip = trim((string) $employee->nip);
            if ($nip === '') {
                return response()->json([
                    'error' => 'Bad Request',
                    'message' => 'Pegawai tidak memiliki NIP yang valid untuk dibuatkan akun akses.',
                ], 422);
            }

            $validated = $request->validated();
            if (array_key_exists('is_active', $validated)) {
                $validated['is_active'] = (bool) $validated['is_active'];
            }

            // Try to find user by NIP (trim whitespace for safety)
            $user = User::where('username', $nip)->first();

            // Prevent self-demotion / lockout
            if ($user && $user->id === $request->user()?->id
                && ($validated['role'] !== 'super_admin' || ($validated['is_active'] ?? true) === false)) {
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'Anda tidak dapat menurunkan peran atau menonaktifkan akun Anda sendiri.',
                ], 403);
            }

        // SKENARIO A: Pegawai belum punya Akun, kita buatkan!
        if (! $user) {
            if (empty($validated['password'])) {
                return response()->json([
                    'error' => 'Unprocessable Entity',
                    'message' => 'Password wajib diisi saat membuat akun baru (minimal 8 karakter).',
                ], 422);
            }

            // Rule 6.1: Hubungkan NIP Pegawai menjadi Username Aplikasi
            $user = User::create([
                'username' => $nip,
                'name' => $employee->nama_lengkap,
                'password' => $validated['password'],
                'role' => $validated['role'],
                'is_active' => $validated['is_active'] ?? true,
                'access_modules' => $validated['access_modules'] ?? [],
                'permissions' => $validated['permissions'] ?? [],
            ]);

            // Ponytail: Catat riwayat audit
            EmployeeHistory::create([
                'employee_id' => $employee->id,
                'user_id' => $request->user()?->id,
                'action' => 'CREATE_IAM_ACCOUNT',
                'changes' => [
                    'role' => ['old' => null, 'new' => $validated['role']],
                    'is_active' => ['old' => null, 'new' => $user->is_active],
                    'access_modules' => ['old' => [], 'new' => $validated['access_modules'] ?? []],
                ],
                'notes' => 'Penerbitan akun akses aplikasi (IAM) oleh Super Admin',
                'created_at' => now(),
            ]);

            $message = 'Akun akses berhasil diterbitkan.';
        }

        // SKENARIO B: Pegawai sudah punya Akun, kita perbarui datanya
        else {
            $oldRole = $user->role;
            $oldModules = $user->access_modules ?? [];
            $oldPerms = $user->permissions ?? [];
            $oldActive = $user->is_active;

            $updateData = [
                'role' => $validated['role'],
                'is_active' => $validated['is_active'] ?? $oldActive,
                'access_modules' => $validated['access_modules'] ?? [],
                'permissions' => $validated['permissions'] ?? [],
            ];

            // Jika dikirimi password (berarti admin ingin mereset password stafnya)
            if (! empty($validated['password'])) {
                $updateData['password'] = $validated['password'];
                $user->tokens()->delete();
            }

            // Jika role, access_modules, atau permissions berubah, revoke token agar user login ulang dengan wewenang baru
            if ($user->role !== $validated['role']
                || $oldActive !== $updateData['is_active']
                || $user->access_modules !== ($validated['access_modules'] ?? [])
                || $user->permissions !== ($validated['permissions'] ?? [])) {
                $user->tokens()->delete();
            }

            $user->update($updateData);

            // Ponytail: Catat riwayat audit
            EmployeeHistory::create([
                'employee_id' => $employee->id,
                'user_id' => $request->user()?->id,
                'action' => 'UPDATE_IAM_ACCESS',
                'changes' => [
                    'role' => ['old' => $oldRole, 'new' => $validated['role']],
                    'is_active' => ['old' => $oldActive, 'new' => $user->is_active],
                    'access_modules' => ['old' => $oldModules, 'new' => $validated['access_modules'] ?? []],
                    'permissions' => ['old' => $oldPerms, 'new' => $validated['permissions'] ?? []],
                ],
                'notes' => 'Pembaruan hak akses wewenang modul (IAM) oleh Super Admin',
                'created_at' => now(),
            ]);

            $message = 'Data hak akses berhasil diperbarui.';
        }

        return response()->json([
            'message' => $message,
            'data' => [
                'username' => $user->username,
                'role' => $user->role,
                'is_active' => $user->is_active,
                'access_modules' => $user->access_modules,
                'permissions' => $user->permissions,
            ],
        ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Server Error',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan sistem saat memperbarui hak akses.',
            ], 500);
        }
    }
}
