<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Endpoint: POST /api/login
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('username', $request->username)->first();

        // Cek user ada, password cocok, dan akun masih aktif (Rule 6.1)
        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Username atau password salah.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'username' => ['Akun Anda sudah dinonaktifkan.'],
            ]);
        }

        // Hapus token lama jika ada (agar tidak menumpuk di DB)
        $user->tokens()->delete();

        // Buat token baru Sanctum
        $token = $user->createToken('auth_token')->plainTextToken;

        // Return sesuai format Rule 5.1
        return response()->json([
            'data' => new UserResource($user),
            'token' => $token,
            'message' => 'Login berhasil',
        ]);
    }

    /**
     * Endpoint: GET /api/user
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    /**
     * Endpoint: POST /api/logout
     */
    public function logout(Request $request): JsonResponse
    {
        // Hapus token yang sedang digunakan
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil',
        ]);
    }

    /**
     * Endpoint: POST /api/change-password
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'message' => 'Password berhasil diubah',
        ]);
    }
}
