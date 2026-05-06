# Issue #008 — Backend — IDE Helper & Type Hinting Setup

> **Type**: `setup`, `dx` (Developer Experience)
> **Labels**: `backend`, `dx`, `best-practice`
> **Priority**: 🔴 Critical (Sangat vital agar AI model murah & Junior Programmer bisa paham "sihir" Laravel)
> **Complexity**: 🟢 Simple (Hanya install package & config)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #003 (Backend Laravel Scaffold)

---

## Branch

```
issue/008-backend-ide-helper-setup
```

## Deskripsi

Framework Laravel menggunakan banyak "sihir" PHP (seperti *Magic Methods* `__callStatic`, Facades, dan Eloquent dynamic properties). Masalahnya:
- **Junior Programmer** sering bingung: *"Darimana asal fungsi `User::where()`? Kok di file `User.php` tidak ada?"*
- **AI Model (terutama yang murah/kecil)** sering berhalusinasi atau memberikan *syntax error* karena tidak bisa membaca struktur database dan Facade dari kode sumber secara langsung.

**Solusi:**
Kita akan menginstal paket `barryvdh/laravel-ide-helper`. Paket ini akan membaca database dan source code, lalu men-generate file "kamus" (`_ide_helper.php`) yang berisi deklarasi eksplisit dari semua *magic method* tersebut.

Dengan ini, VS Code (IntelliSense) dan AI agent akan mendapat auto-complete 100% akurat untuk semua tabel, kolom, dan relasi di BKSDA SuperApp! 🚀

---

## Acceptance Criteria

- [ ] Package `barryvdh/laravel-ide-helper` terinstall di `require-dev`.
- [ ] Script otomatis IDE helper ditambahkan ke `composer.json`.
- [ ] File `_ide_helper.php`, `_ide_helper_models.php`, dan `.phpstorm.meta.php` berhasil di-generate.
- [ ] File-file hasil generate ditambahkan ke dalam `backend/.gitignore` (karena file ini hanya untuk local dev, tidak boleh di-commit).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Ikuti setiap langkah berurutan. Copas kode secara teliti.

### Langkah 1: Install IDE Helper Package

**Kenapa?** Paket ini hanya dibutuhkan saat development. Di server production, kita tidak butuh *auto-complete*. Jadi kita install dengan flag `--dev`.

```bash
cd e:\bksda-superapp\backend

# Jalankan composer require dev
composer require --dev barryvdh/laravel-ide-helper
```

### Langkah 2: Update `composer.json` Scripts

**Kenapa?** Kita ingin file "kamus" AI ini selalu diperbarui otomatis setiap kali kita menginstall/update package baru.

**Path:** `e:\bksda-superapp\backend\composer.json`

Cari bagian `"scripts"`, lalu tambahkan perintah `ide-helper:generate` dan `ide-helper:meta` ke dalam array `"post-update-cmd"`:

```json
    "scripts": {
        "post-update-cmd": [
            "@php artisan vendor:publish --tag=laravel-assets --ansi --force",
            "@php artisan ide-helper:generate",
            "@php artisan ide-helper:meta"
        ],
        // ... (biarkan script lainnya tetap ada)
    }
```

### Langkah 3: Tambahkan ke `.gitignore`

**Kenapa?** File "kamus" yang di-generate ukurannya sangat besar dan isinya bergantung pada komputer masing-masing developer. Jika di-commit ke Git, akan sering terjadi *conflict*.

**Path:** `e:\bksda-superapp\backend\.gitignore`

Tambahkan baris berikut di paling bawah file:

```text
# IDE Helper Files
_ide_helper.php
_ide_helper_models.php
.phpstorm.meta.php
```

### Langkah 4: Generate File Helper Pertama Kali

**Kenapa?** Kita perlu membuat filenya sekarang agar editor (VS Code) dan AI langsung pintar membaca kode project.

```bash
cd e:\bksda-superapp\backend

# Generate helper untuk Facades (Route::, Cache::, dll)
php artisan ide-helper:generate

# Generate helper untuk PHPStorm Meta (Berguna juga untuk VS Code Intelephense)
php artisan ide-helper:meta

# Generate helper untuk Eloquent Models (membaca kolom dari database)
# Pakai flag --nowrite agar tidak merusak file Model bawaan kita, melainkan membuat file _ide_helper_models.php terpisah
php artisan ide-helper:models --nowrite
```

*(Catatan: Langkah `models --nowrite` membutuhkan koneksi database. Pastikan Docker PostgreSQL dari Issue #007 sedang menyala).*

---

## Troubleshooting

### Q: `php artisan ide-helper:models` error `SQLSTATE[08006] [7] connection to server at "127.0.0.1"`

**Artinya:** Koneksi database belum jalan. IDE Helper membaca langsung ke database untuk tahu nama kolom (seperti `name`, `email` di tabel users).
**Solusi:** Jalankan `docker compose up -d` di root project untuk menyalakan database, lalu ulangi command `php artisan`.

### Q: VS Code masih tidak mau auto-complete?

**Solusi:** 
1. Pastikan Anda menginstall ekstensi `PHP Intelephense`.
2. Restart VS Code (Tutup, lalu buka lagi). File `_ide_helper.php` akan di-index ulang.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: setup laravel ide helper for dx" \
  --body "Install laravel-ide-helper untuk auto-complete Facade dan Models. Sangat penting agar AI dan junior dev mudah membaca kode. Detail di docs/issues/008-backend-ide-helper-setup.md" \
  --label "setup,backend,dx"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/008-backend-ide-helper-setup
```

### Step 3: Kerjakan

Ikuti Langkah 1 sampai Langkah 4 di atas.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/composer.json
git add backend/composer.lock
git add backend/.gitignore
git commit -m "chore: setup laravel ide helper for dx (#8)"
git push -u origin issue/008-backend-ide-helper-setup
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: setup laravel ide helper for dx (#8)" \
  --body "## Summary
Meningkatkan Developer Experience (DX) dengan menyediakan auto-complete yang akurat untuk Facades, Models, dan Magic Methods Laravel.

## Changes
- Install \`barryvdh/laravel-ide-helper\` (--dev).
- Tambahkan command helper ke \`post-update-cmd\` di \`composer.json\`.
- Ignore file hasil generate di \`.gitignore\`.
- File \`_ide_helper.php\` dkk berhasil digenerate di lokal.

## Verification
- [x] Package masuk di bagian require-dev di composer.json
- [x] Script jalan tanpa error
- [x] Auto-complete di code editor (VS Code) berfungsi

Closes #8" \
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
Issue #007 (Database) sudah menyala. Kita siap lanjut setup DX (Developer Experience).

## Task

Kerjakan Issue #008 (Backend — IDE Helper Setup).
Ini adalah fondasi penting agar AI kamu sendiri bisa paham struktur database dan Facade Laravel ke depannya.
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/008-backend-ide-helper-setup.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Pindah ke folder `backend/`, install IDE helper via composer.
3. Edit file `backend/composer.json` (tambahkan script `ide-helper` ke dalam `"post-update-cmd"`).
4. Edit file `backend/.gitignore` untuk meng-ignore file "kamus".
5. Jalankan artisan command untuk men-generate file (pastikan db docker nyala).
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
