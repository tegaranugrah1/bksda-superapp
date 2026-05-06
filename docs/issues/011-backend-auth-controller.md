# Issue #011 — Backend — Auth Controller & Routes

> **Type**: `feature`
> **Labels**: `backend`, `auth`, `api`
> **Priority**: 🔴 Critical (tanpa ini user tidak bisa masuk aplikasi)
> **Complexity**: 🟡 Medium (pembuatan controller, form request, API resource, dan routes)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #009 (Model) dan #010 (Sanctum) harus sudah merged

---

## Branch

```
issue/011-backend-auth-controller
```

## Deskripsi

Membuat fungsionalitas Authentication (Login, Logout, Profil) menggunakan Laravel Sanctum. Kita akan mengimplementasikan **API-only architecture** yang ketat sesuai dengan aturan project.

**Apa yang dilakukan:**
1. Membuat `UserResource` untuk memformat respons data user (menyembunyikan data sensitif sesuai Rule 5.5 & 5.6).
2. Membuat `FormRequest` untuk memvalidasi input *Login*, *Update Profile*, dan *Change Password* (Rule "Thin Controller").
3. Membuat `AuthController` yang berisi logika autentikasi (login via `username` & `password`).
4. Mendaftarkan route di `routes/api.php`.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak ada endpoint Register. (Pendaftaran *User* BKSDA dikelola oleh Super Admin via modul Kepegawaian, bukan daftar mandiri).

---

## Acceptance Criteria

- [ ] File `app/Http/Resources/UserResource.php` dibuat.
- [ ] File `app/Http/Requests/Auth/LoginRequest.php` dibuat.
- [ ] File `app/Http/Controllers/Api/AuthController.php` dibuat dengan 5 fungsi (`login`, `logout`, `me`, `updateProfile`, `changePassword`).
- [ ] `POST /api/login` mengembalikan `token` dan data user jika sukses.
- [ ] Route `logout`, `me`, `updateProfile`, dan `changePassword` dilindungi oleh middleware `auth:sanctum`.
- [ ] Password lama tervalidasi dengan benar sebelum melakukan `changePassword`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Semua respons menggunakan JSON standar (Rule 5.1).

### Langkah 1: Buat API Resource

**Kenapa?** Sesuai **Rule 5.6**, kita dilarang me-return model langsung (contoh: `return $user;`). Kita harus melewati "saringan" (Resource) agar data sensitif seperti password atau data internal tidak ikut terkirim ke *frontend*.

```bash
cd e:\bksda-superapp\backend
php artisan make:resource UserResource
```

**Edit `app/Http/Resources/UserResource.php`:**

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Sesuai Rule 5.5: Jangan return data sensitif.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role,
            'access_modules' => $this->access_modules ?? [], // Kembalikan array kosong jika null
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
```

---

### Langkah 2: Buat Form Request Validasi

**Kenapa?** "Thin Controller" berarti validasi input TIDAK BOLEH dilakukan di dalam controller. Validasi harus dipisah ke dalam class `FormRequest` agar kode bersih.

```bash
php artisan make:request Auth/LoginRequest
php artisan make:request Auth/ChangePasswordRequest
```

**1. Edit `app/Http/Requests/Auth/LoginRequest.php`:**

```php
<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Endpoint publik, semua boleh akses
    }

    public function rules(): array
    {
        return [
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ];
    }
}
```

**2. Edit `app/Http/Requests/Auth/ChangePasswordRequest.php`:**

```php
<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Pengecekan auth ditangani oleh middleware auth:sanctum
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
}
```
*(Catatan: `confirmed` mewajibkan frontend mengirim `new_password_confirmation`).*

---

### Langkah 3: Buat Auth Controller

**Kenapa?** Di sinilah inti logika dari proses autentikasi (pencocokan password dan pembuatan token Sanctum).

```bash
php artisan make:controller Api/AuthController
```

**Edit `app/Http/Controllers/Api/AuthController.php`:**

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ChangePasswordRequest;
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
        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Username atau password salah.'],
            ]);
        }

        if (!$user->is_active) {
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
            'message' => 'Login berhasil'
        ]);
    }

    /**
     * Endpoint: GET /api/user
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user())
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
            'message' => 'Logout berhasil'
        ]);
    }

    /**
     * Endpoint: POST /api/change-password
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        
        $user->update([
            'password' => Hash::make($request->new_password)
        ]);

        return response()->json([
            'message' => 'Password berhasil diubah'
        ]);
    }
}
```

---

### Langkah 4: Daftarkan Routes API

**Kenapa?** Agar request dari *frontend* bisa menemukan controller yang baru saja kita buat.

**Path:** `e:\bksda-superapp\backend\routes\api.php`

**Buka file, dan Tepat di bawah rute `/health`, tambahkan:**

```php
use App\Http\Controllers\Api\AuthController;

// Public Auth Route
Route::post('/login', [AuthController::class, 'login']);

// Protected Auth Routes (wajib bawa Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
});
```

---

## Troubleshooting

### Q: Login mengembalikan `Username atau password salah`, padahal saya yakin benar.

**Artinya:** Datanya mungkin belum ada di tabel `users`.
**Solusi:** Karena kita belum punya *Seeder*, gunakan fitur `php artisan tinker` untuk membuat satu user percobaan, contoh:
`User::create(['name' => 'Admin', 'username' => 'admin', 'email' => 'admin@test.com', 'password' => Hash::make('password123'), 'role' => 'super_admin'])`

### Q: Request ke `/api/user` me-return `401 Unauthenticated`

**Artinya:** Kamu tidak mengirim *token* dalam *header* HTTP.
**Solusi:** Kirimkan header `Authorization: Bearer <token_dari_login>` saat melakukan *request* ke Postman atau lewat cURL.

### Q: Change password error "The current password field is required" (422)

**Artinya:** FormRequest gagal lolos validasi.
**Solusi:** Pastikan body HTTP yang kamu kirim menggunakan format JSON dan memiliki properti `current_password`, `new_password`, dan `new_password_confirmation`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: auth controller and token api" \
  --body "Pembuatan login, logout, me, change password API via Sanctum. Detail di docs/issues/011-backend-auth-controller.md" \
  --label "backend,auth,api"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/011-backend-auth-controller
```

### Step 3: Kerjakan

Jalankan artisan *make resource, make request, make controller*, lalu ketikkan kodenya seperti yang diinstruksikan. Daftarkan routes.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat: auth controller and token api (#11)"
git push -u origin issue/011-backend-auth-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: auth controller and token api (#11)" \
  --body "## Summary
Membuat sistem otentikasi API yang aman sesuai arsitektur IAM.

## Changes
- \`UserResource\` untuk mapping response data pengguna
- \`LoginRequest\` dan \`ChangePasswordRequest\`
- \`AuthController\` (login, me, logout, change-password)
- \`routes/api.php\` diupdate dengan sanctum middleware

## Verification
- [x] Kode bisa ter-compile tanpa error syntax
- [x] Validasi input dipisah dari controller
- [x] Token baru berhasil diproduksi pada controller logic

## Rules Compliance
- [x] Rule 1.1: Endpoint selain login menggunakan \`auth:sanctum\`
- [x] Rule 5.1: Format response JSON terstandardisasi
- [x] Rule 5.5: Data sensitif disembunyikan via UserResource
- [x] Rule 6.1: Cek \`is_active\` sebelum izinkan login

Closes #11" \
  --base main
```

### Step 6: Merge & Sync

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Issue #010 (Sanctum) sudah selesai. Saatnya membangun fitur Login di Laravel.

## Task

Kerjakan Issue #011 (Backend — Auth Controller & Routes).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/011-backend-auth-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file `app/Http/Resources/UserResource.php` dengan fitur menyembunyikan properti rahasia sesuai spesifikasi.
3. Buat file `app/Http/Requests/Auth/LoginRequest.php` dan `ChangePasswordRequest.php`.
4. Buat file `app/Http/Controllers/Api/AuthController.php` yang memuat logika Sanctum token (perhatikan pengecekan `$user->is_active`).
5. Update `routes/api.php` untuk memetakan endpoint Auth dan lindungi dengan middleware `auth:sanctum` (kecuali login).
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
