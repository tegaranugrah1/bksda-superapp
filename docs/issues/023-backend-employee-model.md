# Issue #023 — Backend — Employee Model

> **Type**: `feature`
> **Labels**: `backend`, `model`, `kepegawaian`
> **Priority**: 🔴 Critical (Representasi OOP untuk tabel pegawai)
> **Complexity**: 🟡 Medium (Implementasi Relasi non-standar & Modularitas)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #022 (Employees Migration)

---

## Branch

```
issue/023-backend-employee-model
```

## Deskripsi

Sesuai dengan **Rule 8.1 dan 8.2**, BKSDA SuperApp mengusung arsitektur **Modular**. Ini artinya, kita tidak akan mencampur file model pegawai ke dalam folder bawaan `app/Models/` bersama dengan User. Kita akan membangun rumah sendiri untuk mereka di dalam `app/Modules/Kepegawaian/`.

Pada issue ini, kita akan membuat Model `Employee` (Pegawai) yang dihubungkan dengan tabel `kpg_employees`. Model ini akan menerapkan aturan ketat `$fillable` (anti-mass-assignment vulnerability), fitur penghapusan lunak (`SoftDeletes`), serta sebuah jembatan relasi (Relationship) yang menyambungkan `NIP` pegawai dengan `Username` pada akun User.

**Apa yang dilakukan:**
1. Membuat struktur folder mandiri (Modular Architecture).
2. Membuat class Model `Employee.php` beserta trait `SoftDeletes`.
3. Menulis relasi `hasOne` ke class `User` namun tanpa menggunakan id bawaan (custom foreign/local keys).
4. Menyediakan *Local Scope* `active()` agar developer mudah memfilter pegawai.

---

## Acceptance Criteria

- [ ] Folder `app/Modules/Kepegawaian/Models` berhasil dibuat.
- [ ] Terdapat file `Employee.php` di dalam folder tersebut dengan *namespace* yang sesuai.
- [ ] Menggunakan properti `$table = 'kpg_employees'`.
- [ ] Menggunakan `$fillable` (Rule 1.3), BUKAN `$guarded = []`.
- [ ] Memiliki fungsi relasi `user()`.
- [ ] Memiliki metode `scopeActive($query)`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Perhatikan dengan saksama penamaan *namespace* di baris paling atas. Karena kita menggunakan struktur Modular, *namespace*-nya bukan lagi `App\Models`, melainkan `App\Modules\Kepegawaian\Models`.

### Langkah 1: Buat Struktur Folder Modular

**Kenapa?** Agar kode aplikasi tidak menjadi "Spaghetti" (berantakan) ketika jumlah fitur sudah mencapai puluhan.

```bash
cd e:\bksda-superapp\backend

# Buat kerangka folder modul (Hirarki berlapis)
mkdir -p app/Modules/Kepegawaian/Models
```

---

### Langkah 2: Tulis Kode Model (Clean Code)

**Kenapa?** Kita mengamankan model ini dengan `$fillable` agar *Hacker* tidak bisa tiba-tiba menyelundupkan data NIP palsu atau mengubah status lewat pengiriman JSON massal (mass-assignment vulnerability).

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Models\Employee.php`

**Buat file baru tersebut, dan masukkan kode di bawah ini:**

```php
<?php

namespace App\Modules\Kepegawaian\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Employee extends Model
{
    // Menggunakan SoftDeletes agar record tidak hilang (Rule 3.6)
    use HasFactory, SoftDeletes;

    // Rule 3.7: Prefix kpg_
    protected $table = 'kpg_employees';

    // Rule 1.3: Keamanan tingkat tinggi, tolak semua input KECUALI daftar di bawah ini
    protected $fillable = [
        'nip',
        'nama_lengkap',
        'jabatan',
        'pangkat_golongan',
        'satuan_kerja',
        'is_active',
        'foto_profil',
    ];

    // Konversi otomatis string 0/1 dari database menjadi boolean true/false di PHP
    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * RELASI (Rule 6.1)
     * Pegawai (Employee) mungkin memiliki 1 Akun Aplikasi (User).
     * Relasi ini tidak menggunakan employee_id seperti biasa, 
     * melainkan menjodohkan NIP pegawai dengan Username di tabel User.
     * 
     * Argumen ke-2: Foreign Key di tabel tujuan (users.username)
     * Argumen ke-3: Local Key di tabel sumber (employees.nip)
     */
    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'username', 'nip');
    }

    /**
     * LOCAL SCOPE (Penyederhanaan Query)
     * Daripada menulis Employee::where('is_active', true)->get() berulang-ulang,
     * developer cukup menulis Employee::active()->get()
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
```

---

## Troubleshooting

### Q: `Class "App\Modules\Kepegawaian\Models\Employee" not found` saat dipanggil

**Artinya:** PHP Autoloader dari Composer belum menyadari keberadaan folder baru ini, atau penulisan nama *namespace* di file PHP ada yang *typo* (salah eja).
**Solusi:** 
1. Cek ulang ejaan (Huruf Besar/Kecil) `App\Modules\Kepegawaian\Models`.
2. Buka terminal, masuk ke folder backend, dan jalankan perintah sakti: `composer dump-autoload` agar Laravel memindai ulang seluruh folder baru.

### Q: Apakah tabel User (Issue 009) juga harus diubah agar punya relasi sebaliknya?

**Artinya:** Kamu berpikir jauh ke depan untuk relasi *BelongsTo*.
**Solusi:** Tepat sekali! Tetapi untuk meminimalisir risiko (*Scope Creep*), pada *issue* ini kita cukup meletakkan relasinya dari sudut pandang Pegawai. Jika nanti kita butuh relasi sebaliknya, kita akan memodifikasi `User.php` pada waktunya.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): employee modular model" \
  --body "Pembuatan class representasi tabel pegawai di dalam arsitektur modular. Detail di docs/issues/023-backend-employee-model.md" \
  --label "backend,model,kepegawaian"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/023-backend-employee-model
```

### Step 3: Kerjakan

Buat folder hirarki modular `app/Modules/Kepegawaian/Models`. Buat file `Employee.php` dan salin kode dari spesifikasi secara presisi. (Jalankan `composer dump-autoload` untuk mencegah error class not found).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/
git commit -m "feat(kepegawaian): employee modular model (#23)"
git push -u origin issue/023-backend-employee-model
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): employee modular model (#23)" \
  --body "## Summary
Menyelesaikan pembuatan model OOP untuk data Pegawai dengan standar kepegawaian BKSDA.

## Changes
- Inisiasi folder arsitektur \`app/Modules/\`.
- Pembuatan class \`Employee.php\`.
- Definisi \`$fillable\`, casts boolean, dan SoftDeletes.
- Relasi khusus \`NIP <-> Username\`.
- \`scopeActive\` untuk query filtering.

## Verification
- [x] Sintaks namespace lolos parser PHP.
- [x] Lolos Composer Autoload.

## Rules Compliance
- [x] Rule 1.3: Dilarang menggunakan \`$guarded = []\` ditegakkan.
- [x] Rule 3.6: \`SoftDeletes\` diaplikasikan.
- [x] Rule 6.1: Hubungan Logikal NIP & Username.
- [x] Rule 8.1 & 8.2: File berada di luar \`app/Models\` biasa.

Closes #23" \
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
Tabel `kpg_employees` sudah ada (Issue #22). Sekarang saatnya membuat peluru utamanya di ranah OOP (Model).

## Task

Kerjakan Issue #023 (Backend — Employee model).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/023-backend-employee-model.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Karena folder model ini di lokasi khusus, buat direktori secara manual: `backend/app/Modules/Kepegawaian/Models/`.
3. Buat file `Employee.php` di dalam sana, dan *copy-paste* blok kode spesifikasi. Pastikan *namespace* mengarah ke lokasi folder modular tersebut.
4. Di terminal folder `backend`, jalankan `composer dump-autoload` untuk merapikan *registry* file.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
