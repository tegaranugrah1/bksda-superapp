# Issue #013 — Backend — CheckRole Middleware

> **Type**: `feature`
> **Labels**: `backend`, `auth`, `security`
> **Priority**: 🔴 Critical (pilar utama Role-Based Access Control)
> **Complexity**: 🟢 Simple (Membuat 1 file Middleware dengan Variadic Argument)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #009 (Model User)

---

## Branch

```
issue/013-backend-role-middleware
```

## Deskripsi

Selain mengamankan API berdasarkan *Modul* (Issue #012), kita juga harus mengamankan API berdasarkan **Role** (Jabatan/Peran). Contoh penggunaannya nanti di Route: `middleware('role:admin,pimpinan')` yang artinya endpoint tersebut hanya boleh diakses jika user memiliki role `admin` atau `pimpinan`.

**Apa yang dilakukan:**
1. Membuat class Middleware `CheckRole`.
2. Menerima banyak parameter role sekaligus (*Variadic Argument*).
3. Menerapkan *Best Practice* keamanan: memberikan akses otomatis (*bypass*) jika rolenya adalah `super_admin` (Rule 2.3).
4. Mengembalikan format Error JSON 403 Forbidden terstandar.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak mendaftarkan (register) middleware ini ke `bootstrap/app.php`. Pendaftaran akan dilakukan secara massal di **Issue #015**.

---

## Acceptance Criteria

- [ ] File `app/Http/Middleware/CheckRole.php` berhasil dibuat.
- [ ] Middleware bisa menerima *multiple parameter* menggunakan sintaks `string ...$roles`.
- [ ] Terdapat *Bypass Logic* untuk pengguna dengan `role === 'super_admin'`.
- [ ] Middleware me-return JSON 403 Forbidden jika role user saat ini tidak ada di dalam array `$roles` yang dikirimkan oleh route.
- [ ] Kode ditulis dengan standar "Clean Code" (Pola *Early Return*).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah dengan teliti. Perhatikan penggunaan titik tiga (`...`) pada fungsi handle, itu adalah fitur PHP bernama *Variadic Argument*.

### Langkah 1: Generate File Middleware

**Kenapa?** Sama seperti sebelumnya, kita gunakan CLI Artisan agar pembuatan kerangka *class* menjadi standar.

```bash
cd e:\bksda-superapp\backend

# Membuat kerangka middleware
php artisan make:middleware CheckRole
```

**Apa yang terjadi:**
- File baru tercipta di `app/Http/Middleware/CheckRole.php`.

---

### Langkah 2: Tulis Logika Keamanan (Clean Code)

**Kenapa?** Logika ini bertanggung jawab atas **Rule 2.3**. Kita akan membuat "Satpam" yang mengecek ID Card (Role) pengguna.

**Path:** `e:\bksda-superapp\backend\app\Http\Middleware\CheckRole.php`

**Buka file tersebut dan ganti seluruh isinya menjadi:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * Mengecek apakah role User yang sedang login diperbolehkan
     * mengakses rute ini.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  Daftar role yang diizinkan (contoh: 'admin', 'pimpinan')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // 1. EARLY RETURN: Pastikan user terautentikasi (Lapis ganda)
        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Silakan login terlebih dahulu.'
            ], 401);
        }

        // 2. EARLY RETURN: Bypass khusus Super Admin (Sesuai Rule 2.3)
        // super_admin adalah dewa, izinkan melakukan apapun
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // 3. VALIDASI UTAMA: Apakah role user ada di dalam daftar role yang diizinkan?
        if (!in_array($user->role, $roles)) {
            // Jika tidak cocok, tolak dengan format error terstandar
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Hak akses (Role) Anda tidak mencukupi untuk operasi ini.',
                'code' => 'ROLE_ACCESS_DENIED'
            ], 403);
        }

        // 4. Jika lolos penjagaan, teruskan request
        return $next($request);
    }
}
```

**Penjelasan Fitur `string ...$roles`:**
Jika kita memanggil middleware ini di Route dengan cara `middleware('role:admin,manager')`, PHP akan otomatis mengubah teks `admin,manager` menjadi sebuah Array `$roles = ['admin', 'manager']`. Ini sangat bersih dan *best practice* dibanding melakukan *explode* koma secara manual.

---

### Langkah 3: Abaikan Pendaftaran Dulu

**Penting:** Seperti di Issue 012, **Sengaja** tidak mendaftarkan *alias* di `bootstrap/app.php` saat ini. Tunggu Issue #015 agar tidak terjadi tabrakan kode (Git Conflict) apabila dikerjakan oleh developer yang berbeda secara paralel.

---

## Troubleshooting

### Q: IDE saya error pada bagian `string ...$roles`

**Artinya:** PHP versi lama tidak mendukung deklarasi *type hint* pada *variadic arguments*.
**Solusi:** Karena BKSDA SuperApp menggunakan Laravel 12 yang mewajibkan minimal **PHP 8.3**, kode ini 100% valid. Pastikan pengaturan intepreter/bahasa di VS Code atau PHPStorm kamu sudah di-set minimal ke PHP 8.2/8.3.

### Q: Bolehkah User punya multiple roles (contoh: dia admin dan juga pegawai)?

**Artinya:** Desain database saat ini hanya memiliki kolom string `role` tunggal di tabel users.
**Solusi:** Berdasarkan aturan kita (RBAC konvensional), 1 User = 1 Role dominan. Jika dia bisa mengakses banyak modul, itu diatur di kolom `access_modules` (Issue #012), BUKAN di kolom `role`. `role` ini spesifik untuk "jabatan" (Contoh: Admin vs Pegawai biasa).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: check role middleware" \
  --body "Pembuatan class Middleware Role-Based Access Control (RBAC). Detail di docs/issues/013-backend-role-middleware.md" \
  --label "backend,security,auth"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/013-backend-role-middleware
```

### Step 3: Kerjakan

Jalankan perintah `artisan` dan ketik kode Middleware dengan variadic arguments sesuai spesifikasi.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Http/Middleware/CheckRole.php
git commit -m "feat: check role middleware (#13)"
git push -u origin issue/013-backend-role-middleware
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: check role middleware (#13)" \
  --body "## Summary
Menambahkan pengamanan lapis kedua berbasis jabatan/role (RBAC).

## Changes
- Membuat class Middleware \`CheckRole\`.
- Mengimplementasikan fitur variadic arguments pada parameter PHP.
- Menyediakan output JSON 403 terstandar jika role tidak diizinkan.

## Verification
- [x] Linter/Syntax check PHP 8.3 lolos.
- [x] Memiliki pengecualian khusus (bypass) bagi role \`super_admin\`.

## Rules Compliance
- [x] Rule 2.3: Hak akses super admin terpenuhi.
- [x] Rule 5.2: Error JSON terstandar.

Closes #13" \
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
Issue Module Access Middleware (#012) sudah selesai. Kita lengkapi dengan Role Middleware.

## Task

Kerjakan Issue #013 (Backend — CheckRole Middleware).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/013-backend-role-middleware.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Generate middleware menggunakan CLI artisan (`make:middleware CheckRole`).
3. Ganti kode di dalam file Middleware tersebut sesuai dokumen spesifikasi. Pastikan parameter `string ...$roles` dan *early return bypass super_admin* ditulis dengan tepat.
4. JANGAN mendaftarkan middleware ke bootstrap (sesuai instruksi!).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
