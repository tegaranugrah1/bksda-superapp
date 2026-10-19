<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
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

        // Login user secara session-based (HttpOnly Cookie)
        \Illuminate\Support\Facades\Auth::guard('web')->login($user, true);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

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
     * Endpoint: GET /api/me/dashboard
     * Returns dashboard data for the authenticated user including employee info and my_assets
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();

        // Load employee via username = nip
        $employee = Employee::where('nip', $user->username)->first();

        // Load active loans for this employee
        $loans = collect();
        if ($employee) {
            try {
                $loans = AssetLoan::where('employee_id', $employee->id)
                    ->whereIn('status', ['dipinjam', 'terlambat', 'DIPINJAM', 'TERLAMBAT'])
                    ->with('asset')
                    ->orderByDesc('tanggal_pinjam')
                    ->limit(20)
                    ->get();
            } catch (\Exception $e) {
                // Table might not exist yet - return empty collection
                $loans = collect();
            }
        }

        // Create a dashboard data object instead of using resource with relations
        $dashboardData = [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'access_modules' => $user->access_modules ?? [],
            ],
            'employee' => $employee ? [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'name' => $employee->nama_lengkap,
                'position' => $employee->jabatan,
                'department' => $employee->satuan_kerja,
                'email' => $employee->email,
                'phone' => $employee->no_telepon ?? null,
                'photo' => $employee->foto_profil ? \Illuminate\Support\Facades\Storage::url($employee->foto_profil) : null,
                'rank' => $employee->pangkat_golongan,
                'rank_level' => 0,
                'is_active' => $employee->is_active,
            ] : null,
            'my_assets' => $loans->filter(fn($loan) => $loan->asset !== null)->map(function ($loan) {
                return [
                    'id' => $loan->asset->id,
                    'nama_barang' => $loan->asset->nama_barang,
                    'kode_barang' => $loan->asset->kode_barang,
                    'nup' => $loan->asset->nup,
                    'nup_lama' => $loan->asset->nup_lama,
                    'loan_date' => $loan->tanggal_pinjam?->toIso8601String(),
                    'due_date' => ($loan->due_date ?? $loan->tanggal_kembali)?->toIso8601String(),
                    'status' => $loan->status,
                    'merk' => $loan->asset->merk_tipe ?? $loan->asset->merk,
                    'jenis_bmn' => $loan->asset->jenis_bmn,
                    'no_polisi' => $loan->asset->no_polisi,
                ];
            })->values(),
        ];

        return response()->json([
            ...$dashboardData,
            'data' => $dashboardData,
            'message' => 'Dashboard berhasil dimuat.',
        ]);
    }

    /**
     * Endpoint: POST /api/logout
     */
    public function logout(Request $request): JsonResponse
    {
        // Logout dari guard session dan invalidate session cookie
        \Illuminate\Support\Facades\Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        // Hapus token yang sedang digunakan jika terautentikasi lewat token
        if ($request->user() && $request->user()->currentAccessToken()) {
            $request->user()->currentAccessToken()->delete();
        }

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

        // Password change is a credential reset event; revoke every issued token.
        $user->tokens()->delete();

        // Invalidate session cookie for web guard if active
        \Illuminate\Support\Facades\Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Password berhasil diubah',
        ]);
    }

    /**
     * Endpoint: POST /api/me/update-photo
     */
    public function updatePhoto(Request $request): JsonResponse
    {
        $request->validate([
            'foto' => UploadValidationRules::image(maxKilobytes: 10240),
        ]);

        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (!$employee) {
            return response()->json(['message' => 'Data pegawai tidak ditemukan.'], 404);
        }

        // Delete old photo
        if ($employee->foto_profil) {
            Storage::delete($employee->foto_profil);
        }

        // Store new photo
        $slugName = \Illuminate\Support\Str::slug($employee->nama_lengkap ?: $employee->nip ?: 'pegawai');
        $folder = 'employees/' . $slugName . '/foto-profil';
        $ext = $request->file('foto')->extension();
        $filename = $slugName . '_profil.' . $ext;
        $path = $request->file('foto')->storeAs($folder, $filename);
        $employee->update(['foto_profil' => $path]);

        return response()->json([
            'message' => 'Foto profil berhasil diperbarui.',
            'photo' => Storage::url($path),
        ]);
    }

    /**
     * Endpoint: POST /api/me/update-profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->validate([
            'email' => ['nullable', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\-\s()]+$/'],
        ]);

        $employee = Employee::where('nip', $user->username)->first();

        if ($request->has('email')) {
            $cleanEmail = $request->filled('email') ? trim(strtolower((string) $request->input('email'))) : null;
            if ($employee) {
                $employee->update(['email' => $cleanEmail]);
            }
            if ($cleanEmail !== null) {
                $user->update(['email' => $cleanEmail]);
            }
        }

        if ($request->has('phone')) {
            $cleanPhone = $request->filled('phone') ? trim((string) $request->input('phone')) : null;
            if ($employee) {
                $employee->update(['no_telepon' => $cleanPhone]);
            }
        }

        return response()->json(['message' => 'Profil berhasil diperbarui.']);
    }

    /**
     * Endpoint: GET /api/me/assets
     */
    public function myAssets(Request $request): JsonResponse
    {
        $user = $request->user();
        $employee = Employee::where('nip', $user->username)->first();

        if (! $employee) {
            return response()->json(['data' => []]);
        }

        $fullName = trim($employee->nama_lengkap ?? '');
        $escapedName = addcslashes(mb_strtolower($fullName), '%_');
        $assets = \App\Modules\Bmn\Models\Asset::where(function ($q) use ($employee, $fullName, $escapedName) {
            $q->where('employee_id', $employee->id);
            if (mb_strlen($fullName) >= 3) {
                $q->orWhereRaw('LOWER(pengguna) LIKE ?', ['%' . $escapedName . '%'])
                  ->orWhereRaw('LOWER(nama_pengguna) LIKE ?', ['%' . $escapedName . '%']);
            }
        })
        ->select([
            'id', 'nama_barang', 'kode_barang', 'nup', 'nup_lama',
            'merk', 'tipe', 'merk_tipe', 'kondisi', 'no_polisi', 'jenis_bmn',
            'foto_geotag_url', 'foto_geotag_path', 'updated_at',
        ])
        ->latest()->limit(50)->get()
        ->map(function ($asset) use ($request) {
            if ($asset->foto_geotag_path && ! $asset->foto_geotag_url) {
                $token = $request->bearerToken() ?: $request->query('token');
                $tokenParam = $token ? "&token=" . urlencode($token) : "";
                $v = $asset->updated_at?->timestamp ?: time();
                $asset->foto_geotag_url = "/api/bmn/assets/{$asset->id}/photo/geotag/view?v={$v}{$tokenParam}";
            }
            if ($asset->foto_geotag_path && ! str_starts_with($asset->foto_geotag_path, 'http')) {
                $asset->foto_geotag_path = null;
            }
            return $asset;
        });

        return response()->json(['data' => $assets]);
    }
}
