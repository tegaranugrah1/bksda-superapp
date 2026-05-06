# Issue #012 — Backend — CheckModuleAccess Middleware

> **Type**: `feature`
> **Labels**: `backend`, `auth`, `security`
> **Priority**: 🔴 Critical (pilar utama Module-Based Access Control)
> **Complexity**: 🟢 Simple (Hanya membuat 1 file Middleware dengan logika if-else)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #009 (Model User)

---

## Branch

```
issue/012-backend-module-access-middleware
```

## Deskripsi

Dalam sistem BKSDA SuperApp, seorang pengguna (User) tidak otomatis bisa mengakses semua fitur. Hak akses dipisah berdasarkan **modul** (misalnya: hanya boleh buka modul `inventory` tapi tidak boleh buka `kepegawaian`). 

Sesuai **Rule 2.2**, pengecekan hak akses ini **WAJIB** dilakukan di lapisan server via Middleware ("Satpam" rute API), bukan sekadar menyembunyikan tombol di Frontend. Di issue ini kita membuat Middleware tersebut.

**Apa yang dilakukan:**
1. Membuat class Middleware `CheckModuleAccess`.
2. Menuliskan logika *Best Practice*: bypass untuk `super_admin` (Rule 2.3), dan validasi pencarian nama modul di dalam *array* `access_modules` milik User (Rule 2.1).
3. Mengembalikan format Error JSON 403 Forbidden yang rapi jika akses ditolak.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak mendaftarkan (register) middleware ini ke `bootstrap/app.php`! Pendaftaran akan dilakukan secara massal di **Issue #015**.

---

## Acceptance Criteria

- [ ] File `app/Http/Middleware/CheckModuleAccess.php` berhasil dibuat.
- [ ] Middleware menerima parameter `$moduleName`.
- [ ] Middleware memiliki *Bypass Logic* untuk pengguna dengan `role === 'super_admin'`.
- [ ] Middleware me-return JSON dengan HTTP status `403` jika `$moduleName` tidak ditemukan di dalam `access_modules` milik pengguna.
- [ ] Kode ditulis dengan standar "Clean Code" (meminimalisir nested if, menggunakan *early return*).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah dengan teliti. Kode di bawah dirancang dengan gaya "Early Return" untuk menghindari if-else bersarang (nested) agar sangat mudah dibaca.

### Langkah 1: Generate File Middleware

**Kenapa?** Kita menggunakan command `artisan` bawaan Laravel untuk membuat kerangka (*boilerplate*) class Middleware yang standar, agar tidak ada *namespace* atau *import* yang terlewat.

```bash
cd e:\bksda-superapp\backend

# Membuat kerangka middleware
php artisan make:middleware CheckModuleAccess
```

**Apa yang terjadi:**
- Laravel akan menciptakan file baru di `app/Http/Middleware/CheckModuleAccess.php`.

---

### Langkah 2: Tulis Logika Keamanan (Clean Code)

**Kenapa?** Logika di dalam file ini adalah representasi nyata dari **Rule 2.1** dan **Rule 2.3**. Kita mengubah array JSON yang tersimpan di database menjadi validasi nyata (Module-Based Access Control).

**Path:** `e:\bksda-superapp\backend\app\Http\Middleware\CheckModuleAccess.php`

**Buka file tersebut dan ganti seluruh isinya menjadi:**

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckModuleAccess
{
    /**
     * Handle an incoming request.
     * 
     * Sebagai "Satpam" yang bertugas mengecek apakah User punya tiket (hak) 
     * untuk masuk ke Modul tertentu.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $moduleName  Nama modul (contoh: 'kepegawaian', 'inventory')
     */
    public function handle(Request $request, Closure $next, string $moduleName): Response
    {
        $user = $request->user();

        // 1. EARLY RETURN: Pastikan user terautentikasi
        // (Walaupun biasanya auth:sanctum sudah menangani ini, ini sebagai lapis keamanan ganda)
        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'Silakan login terlebih dahulu.'
            ], 401);
        }

        // 2. EARLY RETURN: Bypass khusus Super Admin (Sesuai Rule 2.3)
        // super_admin adalah dewa, izinkan akses ke semua modul tanpa pengecekan
        if ($user->role === 'super_admin') {
            return $next($request);
        }

        // 3. Ambil daftar tiket (hak akses modul) yang dimiliki User
        // Menggunakan null coalescing (?? []) agar tidak error jika isinya kosong/null
        $accessModules = $user->access_modules ?? [];

        // 4. VALIDASI UTAMA: Apakah $moduleName ada di dalam kantong tiket ($accessModules)?
        if (!in_array($moduleName, $accessModules)) {
            // Jika tidak ada, tolak dengan 403 Forbidden sesuai Rule 5.2 (Standar Error Format)
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Anda tidak memiliki hak akses ke modul ini.',
                'code' => 'MODULE_ACCESS_DENIED'
            ], 403);
        }

        // 5. Jika lolos semua penjagaan di atas, persilakan masuk
        return $next($request);
    }
}
```

**Penjelasan Gaya Clean Code:**
Perhatikan bahwa kita tidak menggunakan `if (punya hak) { jalankan } else { tolak }`. Pola tersebut akan membuat kode menjorok terlalu dalam. Kita menggunakan pola **"Early Return"**: Tolak secepat mungkin jika kondisinya salah, dan persilakan masuk (`return $next($request)`) di paling bawah.

---

### Langkah 3: Jangan Register Dulu!

**Penting:** Meskipun file sudah jadi, middleware ini belum aktif digunakan di manapun. Kita **Sengaja** tidak mendaftarkannya sekarang. Pendaftaran nama alias (seperti `module.access`) akan dilakukan serentak bersama Middleware lain (Role & Audit) pada **Issue #015**. Jadi, biarkan filenya ada begitu saja.

---

## Troubleshooting

### Q: IDE saya memberikan garis merah pada tipe data `$user->role`

**Artinya:** Editor kamu tidak tahu apa saja properti di dalam `$user`, karena tipe data *return* dari `$request->user()` sifatnya umum (bisa `User` model, bisa `null`).
**Solusi:** Ini aman dan lazim di Laravel. Jika mau, kamu bisa menambahkan blok PHPDoc di atas variabel `$user` seperti ini: `/** @var \App\Models\User $user */`. Namun membiarkannya saja tidak akan membuat program error.

### Q: Apa yang terjadi kalau `$moduleName` ada huruf besarnya (misal: 'Inventory')?

**Artinya:** PHP *in_array* bersifat *case-sensitive* (membedakan huruf besar & kecil).
**Solusi:** Berdasarkan *best practice*, semua penamaan parameter modul di Route nanti (Issue berikutnya) WAJIB menggunakan huruf kecil/kebab-case (contoh: `inventory`, `bmn`, `surat-tugas`). Pastikan data di database juga diseragamkan huruf kecil.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat: check module access middleware" \
  --body "Pembuatan class Middleware untuk mengamankan endpoint API berdasarkan hak akses modul. Detail di docs/issues/012-backend-module-access-middleware.md" \
  --label "backend,security,auth"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/012-backend-module-access-middleware
```

### Step 3: Kerjakan

Jalankan perintah `artisan` dan ketik kode Middleware dengan gaya *early return* sesuai dokumen spesifikasi.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Http/Middleware/CheckModuleAccess.php
git commit -m "feat: check module access middleware (#12)"
git push -u origin issue/012-backend-module-access-middleware
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat: check module access middleware (#12)" \
  --body "## Summary
Menambahkan logika pengamanan endpoint berbasis module (Module-Based Access Control).

## Changes
- Membuat class Middleware \`CheckModuleAccess\`.
- Mengimplementasikan logika pembandingan request parameter modul dengan kolom array milik user di database.
- Menyediakan output JSON 403 terstandar jika gagal melewati penjagaan.

## Verification
- [x] Linter/Syntax check PHP lolos.
- [x] Memiliki pengecualian khusus (bypass) bagi role \`super_admin\`.

## Rules Compliance
- [x] Rule 2.1: Validasi akses array \`access_modules\`.
- [x] Rule 2.2: Validasi dilakukan mutlak di server-side level (middleware).
- [x] Rule 2.3: Hak akses super admin terpenuhi.
- [x] Rule 5.2: Error JSON terstandar.

Closes #12" \
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
Issue Auth Controller (#011) sudah selesai. Sistem mulai membutuhkan validasi otorisasi.

## Task

Kerjakan Issue #012 (Backend — CheckModuleAccess Middleware).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/012-backend-module-access-middleware.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Generate middleware menggunakan CLI artisan (`make:middleware CheckModuleAccess`).
3. Ganti kode di dalam file Middleware tersebut dengan logika *early return* yang ada di dalam markdown spesifikasi. Pastikan *namespace* dan *class imports* terbawa sempurna.
4. JANGAN mendaftarkan middleware ke bootstrap (sesuai instruksi!).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
