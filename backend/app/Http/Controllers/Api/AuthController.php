<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\EmailLog;
use App\Models\NotificationSetting;
use App\Models\User;
use App\Modules\Bmn\Models\AssetLoan;
use App\Modules\Kepegawaian\Models\Employee;
use App\Support\Security\UploadValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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

        // Jika 2FA aktif, berikan challenge token (design §5.5)
        if ($user->two_factor_confirmed_at !== null) {
            $challengeToken = Str::random(64);
            \Illuminate\Support\Facades\Cache::put("2fa_challenge:{$challengeToken}", [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ], now()->addMinutes(5));

            return response()->json([
                'requires_2fa' => true,
                'challenge_token' => $challengeToken,
                'message' => 'Silakan masukkan kode 6-digit dari aplikasi authenticator Anda.',
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

        $cooldownExpiry = Cache::get('email_verify_cooldown:'.$user->id);
        $remainingCooldown = ($cooldownExpiry && $cooldownExpiry > now()->timestamp) ? (int) ($cooldownExpiry - now()->timestamp) : 0;

        // Create a dashboard data object instead of using resource with relations
        $dashboardData = [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'access_modules' => $user->access_modules ?? [],
                'email_verified_at' => $user->email_verified_at?->toISOString(),
                'email_cooldown_remaining' => $remainingCooldown,
            ],
            'employee' => $employee ? [
                'id' => $employee->id,
                'nip' => $employee->nip,
                'name' => $employee->nama_lengkap,
                'position' => $employee->jabatan,
                'department' => $employee->satuan_kerja,
                'email' => $employee->email,
                'phone' => $employee->no_telepon ?? null,
                'photo' => $employee->foto_profil ? (str_starts_with($employee->foto_profil, 'http') ? $employee->foto_profil : \Illuminate\Support\Facades\Storage::url($employee->foto_profil)) : null,
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
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
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
        if ($employee->foto_profil && !str_starts_with($employee->foto_profil, 'http')) {
            Storage::delete($employee->foto_profil);
        }

        // Store new photo
        $slugName = \Illuminate\Support\Str::slug(($employee->nip ? $employee->nip . '-' : '') . ($employee->nama_lengkap ?: 'pegawai'));
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

        $emailChanged = false;
        if ($request->has('email')) {
            $cleanEmail = $request->filled('email') ? trim(strtolower((string) $request->input('email'))) : null;
            if ($cleanEmail !== null && $cleanEmail !== $user->email) {
                $user->email = $cleanEmail;
                $user->email_verified_at = null;
                $user->save();
                $emailChanged = true;

                // Pasang cooldown 60 detik agar tidak terjadi pengiriman email ganda
                Cache::put('email_verify_cooldown:'.$user->id, now()->addSeconds(60)->timestamp, 60);

                if (!str_ends_with($cleanEmail, '.local') && NotificationSetting::emailEnabled('email_master_enabled')) {
                    dispatch(function () use ($user) {
                        try {
                            $user->sendEmailVerificationNotification();
                        } catch (\Throwable $e) {
                            \Illuminate\Support\Facades\Log::warning('Verification email failed: '.$e->getMessage());
                        }
                    })->afterResponse();
                }
            }
        }

        if ($request->has('phone')) {
            $cleanPhone = $request->filled('phone') ? trim((string) $request->input('phone')) : null;
            if ($employee) {
                $employee->update(['no_telepon' => $cleanPhone]);
            }
        }

        $msg = $emailChanged
            ? 'Profil kontak berhasil diperbarui. Tautan verifikasi telah dikirim ke email baru Anda.'
            : 'Profil kontak berhasil diperbarui.';

        return response()->json([
            'message' => $msg,
            'email_changed' => $emailChanged,
            'cooldown_seconds' => $emailChanged ? 60 : 0,
        ]);
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

    /**
     * Endpoint: PUT /api/me/email
     * Mengubah alamat email akun (wajib validasi current_password dan bukan domain .local).
     */
    public function updateEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
                function ($attribute, $value, $fail) {
                    if (str_ends_with(strtolower((string) $value), '.local')) {
                        $fail('Alamat email tidak boleh menggunakan domain .local.');
                    }
                },
            ],
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Kata sandi saat ini tidak cocok.'],
            ]);
        }

        $oldEmail = $user->email;
        $wasDeliverable = $user->hasDeliverableEmail();

        $newEmail = strtolower(trim((string) $request->email));
        $user->email = $newEmail;
        $user->email_verified_at = null;
        $user->save();

        // Pasang cooldown 60 detik agar tidak terjadi pengiriman email ganda
        Cache::put('email_verify_cooldown:'.$user->id, now()->addSeconds(60)->timestamp, 60);

        // Kirim notifikasi email secara non-blocking setelah respons HTTP dikirim ke browser
        dispatch(function () use ($user, $wasDeliverable, $oldEmail, $newEmail) {
            // Beritahu email lama jika sebelumnya sudah terverifikasi
            if ($wasDeliverable && NotificationSetting::emailEnabled('mail.security_alert')) {
                try {
                    Mail::raw(
                        "Halo {$user->name},\n\nAlamat email akun Portal BKSDA Kaltim Anda baru saja diubah menjadi {$newEmail}. Jika Anda tidak merasa melakukan perubahan ini, segera hubungi Administrator SIM BKSDA.",
                        function ($m) use ($oldEmail) {
                            $m->to($oldEmail)->subject('[Keamanan Akun] Alamat Email Akun Portal BKSDA Anda Diubah');
                        }
                    );
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Security alert email failed: '.$e->getMessage());
                }
            }

            // Kirim link verifikasi ke email baru
            if (NotificationSetting::emailEnabled('email_master_enabled')) {
                try {
                    $user->sendEmailVerificationNotification();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Verification email failed: '.$e->getMessage());
                }
            }
        })->afterResponse();

        return response()->json([
            'message' => 'Alamat email berhasil diperbarui. Tautan verifikasi telah dikirim ke kotak masuk email baru Anda.',
            'email_changed' => true,
            'cooldown_seconds' => 60,
        ]);
    }

    /**
     * Endpoint: GET /api/email/verify/{id}/{hash}
     * Signed URL callback untuk verifikasi email (tanpa auth, 302 redirect ke frontend).
     */
    public function verifyEmail(Request $request, $id, $hash): RedirectResponse
    {
        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1((string) $user->getEmailForVerification()))) {
            abort(403, 'Tautan verifikasi tidak sah atau telah kedaluwarsa.');
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new \Illuminate\Auth\Events\Verified($user));
        }

        $frontendUrl = rtrim(config('app.frontend_url') ?: config('app.url', 'http://localhost:3000'), '/');
        return redirect()->away("{$frontendUrl}/portal?email_verified=1");
    }

    /**
     * Endpoint: POST /api/email/verification-notification
     * Mengirim ulang link verifikasi ke email akun yang sedang login.
     */
    public function resendVerificationEmail(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Alamat email akun Anda sudah terverifikasi.'], 400);
        }

        if (empty($user->email) || str_ends_with(strtolower((string) $user->email), '.local')) {
            return response()->json(['message' => 'Harap masukkan alamat Gmail atau dinas resmi terlebih dahulu.'], 422);
        }

        // Cek apakah cooldown 60 detik masih aktif
        $cooldownExpiry = Cache::get('email_verify_cooldown:'.$user->id);
        if ($cooldownExpiry && $cooldownExpiry > now()->timestamp) {
            $remaining = (int) ($cooldownExpiry - now()->timestamp);
            return response()->json([
                'message' => "Silakan tunggu {$remaining} detik sebelum meminta tautan verifikasi baru.",
                'retry_after' => $remaining,
                'cooldown_seconds' => $remaining,
            ], 429);
        }

        // Pasang cooldown 60 detik
        Cache::put('email_verify_cooldown:'.$user->id, now()->addSeconds(60)->timestamp, 60);

        if (NotificationSetting::emailEnabled('email_master_enabled')) {
            dispatch(function () use ($user) {
                try {
                    $user->sendEmailVerificationNotification();
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Resend verification email failed: '.$e->getMessage());
                }
            })->afterResponse();
        }

        return response()->json([
            'message' => "Tautan verifikasi baru berhasil dikirim ke {$user->email}.",
            'cooldown_seconds' => 60,
        ]);
    }

    /**
     * Endpoint: POST /api/forgot-password
     * Anti-enumeration: respons identik selalu dikembalikan terlepas email ada atau tidak.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', strtolower(trim((string) $request->email)))->first();

        if ($user && $user->hasDeliverableEmail() && NotificationSetting::emailEnabled('email_master_enabled')) {
            Password::sendResetLink(['email' => $user->email]);
        }

        return response()->json([
            'message' => 'Jika email Anda terdaftar dan valid, tautan pengaturan ulang kata sandi telah dikirimkan ke kotak masuk Anda.',
        ]);
    }

    /**
     * Endpoint: POST /api/reset-password
     * Reset password mandiri via token Laravel resmi.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));

                if (isset($user->must_change_password)) {
                    $user->must_change_password = false;
                }

                $user->save();

                // Cabut semua token sesi aktif
                $user->tokens()->delete();

                // Security alert via email jika terverifikasi
                if ($user->hasDeliverableEmail() && NotificationSetting::emailEnabled('mail.security_alert')) {
                    try {
                        Mail::raw(
                            "Halo {$user->name},\n\nKata sandi akun Portal BKSDA Kaltim Anda baru saja berhasil diatur ulang (reset). Jika Anda tidak melakukan tindakan ini, segera hubungi admin SIM BKSDA.",
                            function ($m) use ($user) {
                                $m->to($user->email)->subject('[Keamanan Akun] Kata Sandi Akun BKSDA Anda Berhasil Direset');
                            }
                        );
                    } catch (\Throwable $e) {
                        // Non-blocking
                    }
                }
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Kata sandi berhasil direset. Silakan login kembali dengan kata sandi baru Anda.',
            ]);
        }

        throw ValidationException::withMessages([
            'email' => [__($status)],
        ]);
    }

    /**
     * Endpoint: POST /api/webhooks/resend
     * Webhook Resend dengan verifikasi tanda tangan kriptografis Svix (HMAC-SHA256).
     */
    public function webhookResend(Request $request): JsonResponse
    {
        $svixId = $request->header('svix-id');
        $svixTimestamp = $request->header('svix-timestamp');
        $svixSignature = $request->header('svix-signature');
        $rawBody = $request->getContent();

        $secret = config('services.resend.webhook_secret', env('RESEND_WEBHOOK_SECRET'));
        if (! $secret || ! $svixId || ! $svixTimestamp || ! $svixSignature) {
            return response()->json(['error' => 'Header tanda tangan Svix tidak lengkap.'], 401);
        }

        // Toleransi waktu maksimal 5 menit untuk mencegah replay attack
        if (abs(time() - (int) $svixTimestamp) > 300) {
            return response()->json(['error' => 'Timestamp tanda tangan kedaluwarsa.'], 401);
        }

        $rawSecret = str_starts_with($secret, 'whsec_') ? substr($secret, 6) : $secret;
        $key = base64_decode($rawSecret);
        $toSign = "{$svixId}.{$svixTimestamp}.{$rawBody}";
        $computedSignature = base64_encode(hash_hmac('sha256', $toSign, $key, true));

        $signatures = explode(' ', $svixSignature);
        $valid = false;
        foreach ($signatures as $sig) {
            $parts = explode(',', $sig, 2);
            if (count($parts) === 2 && $parts[0] === 'v1') {
                if (hash_equals($computedSignature, $parts[1])) {
                    $valid = true;
                    break;
                }
            }
        }

        if (! $valid) {
            return response()->json(['error' => 'Tanda tangan webhook Svix tidak valid.'], 401);
        }

        $payload = $request->json()->all();
        $type = $payload['type'] ?? '';
        $data = $payload['data'] ?? [];
        $emailTo = $data['to'][0] ?? null;
        $emailId = $data['email_id'] ?? null;

        if (in_array($type, ['email.bounced', 'email.complained'], true)) {
            if ($emailTo) {
                User::where('email', $emailTo)->update(['email_verified_at' => null]);
            }
            if ($emailId) {
                EmailLog::where('message_id', $emailId)->update([
                    'status' => 'bounced',
                    'error_message' => $data['bounce']['message'] ?? $type,
                ]);
            }
        } elseif ($type === 'email.delivered') {
            if ($emailId) {
                EmailLog::where('message_id', $emailId)->update(['status' => 'delivered']);
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Endpoint: GET /api/admin/email/settings
     */
    public function getEmailSettings(Request $request): JsonResponse
    {
        $settings = NotificationSetting::all();
        $todayLogs = EmailLog::whereDate('created_at', today())->get();
        $todayCounts = [
            'total' => $todayLogs->count(),
            'sent' => $todayLogs->where('status', 'sent')->count(),
            'delivered' => $todayLogs->where('status', 'delivered')->count(),
            'bounced' => $todayLogs->where('status', 'bounced')->count(),
            'by_mailer' => $todayLogs->groupBy('mailer')->map->count(),
        ];
        $recentLogs = EmailLog::latest()->take(20)->get();

        return response()->json([
            'settings' => $settings,
            'metrics' => $todayCounts,
            'recent_logs' => $recentLogs,
        ]);
    }

    /**
     * Endpoint: PUT /api/admin/email/settings
     */
    public function updateEmailSettings(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Hanya super admin yang berhak mengubah konfigurasi email.'], 403);
        }

        $validated = $request->validate([
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string'],
            'settings.*.enabled' => ['required', 'boolean'],
        ]);

        foreach ($validated['settings'] as $item) {
            NotificationSetting::updateOrCreate(
                ['key' => $item['key']],
                ['enabled' => $item['enabled'], 'updated_at' => now()]
            );
            NotificationSetting::clearSettingCache($item['key']);
        }
        NotificationSetting::clearSettingCache();

        return response()->json(['message' => 'Pengaturan email berhasil diperbarui.']);
    }

    /**
     * Endpoint: POST /api/admin/email/test
     */
    public function sendTestEmail(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        Mail::raw(
            "Halo,\n\nIni adalah email uji coba dari sistem Portal BKSDA Kalimantan Timur pada ".now()->format('d M Y H:i:s')." WITA.\nKonfigurasi failover mailer bekerja dengan baik.",
            function ($m) use ($request) {
                $m->to($request->email)->subject('[Test Email] Konfigurasi Mailer Portal BKSDA Kaltim');
            }
        );

        return response()->json(['message' => 'Email uji coba berhasil dikirim.']);
    }

    /**
     * Endpoint: POST /api/login/2fa
     * Verifikasi kode 6-digit TOTP atau 10-char recovery code.
     */
    public function login2Fa(Request $request): JsonResponse
    {
        $request->validate([
            'challenge_token' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $challengeKey = "2fa_challenge:{$request->challenge_token}";
        $data = \Illuminate\Support\Facades\Cache::get($challengeKey);

        if (! $data) {
            throw ValidationException::withMessages([
                'challenge_token' => ['Sesi verifikasi 2FA telah kedaluwarsa. Silakan login kembali.'],
            ]);
        }

        $user = User::findOrFail($data['user_id']);
        $rawCode = trim(str_replace([' ', '-'], '', (string) $request->code));
        $valid = false;

        // 1. Cek kode 6-digit TOTP dengan anti-replay 90 detik
        $replayKey = "totp_used:{$user->id}:{$rawCode}";
        if (! \Illuminate\Support\Facades\Cache::has($replayKey)) {
            if ($user->two_factor_secret && \App\Support\Security\Totp::verify($user->two_factor_secret, $rawCode)) {
                \Illuminate\Support\Facades\Cache::put($replayKey, true, 90);
                $valid = true;
            }
        }

        // 2. Cek Recovery Code jika TOTP tidak cocok (hanya bisa dipakai sekali)
        if (! $valid && ! empty($user->two_factor_recovery_codes)) {
            $hashedAttempt = hash('sha256', strtoupper($rawCode));
            $recoveryCodes = (array) $user->two_factor_recovery_codes;
            $idx = array_search($hashedAttempt, $recoveryCodes, true);
            if ($idx !== false) {
                unset($recoveryCodes[$idx]);
                $user->two_factor_recovery_codes = array_values($recoveryCodes);
                $user->save();
                $valid = true;
            }
        }

        if (! $valid) {
            throw ValidationException::withMessages([
                'code' => ['Kode verifikasi 2FA atau recovery code tidak valid.'],
            ]);
        }

        // Hapus token challenge agar tidak bisa dipakai ulang
        \Illuminate\Support\Facades\Cache::forget($challengeKey);

        // Terbitkan token Sanctum baru
        $user->tokens()->delete();
        $token = $user->createToken('auth_token')->plainTextToken;

        \Illuminate\Support\Facades\Auth::guard('web')->login($user, true);
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        return response()->json([
            'data' => new UserResource($user),
            'token' => $token,
            'message' => 'Verifikasi dua langkah berhasil',
        ]);
    }

    /**
     * Endpoint: POST /api/me/2fa/enable
     */
    public function enable2Fa(Request $request): JsonResponse
    {
        $user = $request->user();
        $secret = \App\Support\Security\Totp::generateSecret(16);
        $user->two_factor_secret = $secret;
        $user->two_factor_confirmed_at = null;
        $user->save();

        $qrUri = \App\Support\Security\Totp::getQrUri('BKSDA Kaltim', (string) $user->username, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_uri' => $qrUri,
        ]);
    }

    /**
     * Endpoint: POST /api/me/2fa/confirm
     */
    public function confirm2Fa(Request $request): JsonResponse
    {
        $request->validate(['code' => ['required', 'string']]);
        $user = $request->user();

        if (! $user->two_factor_secret) {
            return response()->json(['message' => 'Silakan generate kunci 2FA terlebih dahulu.'], 400);
        }

        $code = trim(str_replace(' ', '', (string) $request->code));
        if (! \App\Support\Security\Totp::verify($user->two_factor_secret, $code)) {
            throw ValidationException::withMessages([
                'code' => ['Kode verifikasi TOTP tidak cocok. Pastikan jam pada perangkat Anda akurat.'],
            ]);
        }

        $plainCodes = [];
        $hashedCodes = [];
        for ($i = 0; $i < 8; $i++) {
            $c = strtoupper(Str::random(10));
            $plainCodes[] = $c;
            $hashedCodes[] = hash('sha256', $c);
        }

        $user->two_factor_recovery_codes = $hashedCodes;
        $user->two_factor_confirmed_at = now();
        $user->save();

        return response()->json([
            'message' => 'Autentikasi 2 Langkah berhasil diaktifkan.',
            'recovery_codes' => $plainCodes,
        ]);
    }

    /**
     * Endpoint: DELETE /api/me/2fa
     */
    public function disable2Fa(Request $request): JsonResponse
    {
        $request->validate(['current_password' => ['required', 'string']]);
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Kata sandi saat ini tidak cocok.'],
            ]);
        }

        $user->update([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ]);

        return response()->json([
            'message' => 'Autentikasi 2 Langkah berhasil dinonaktifkan.',
        ]);
    }
}
