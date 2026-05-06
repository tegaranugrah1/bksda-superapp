# Issue #034 — System Integration & Final Test (Grand Finale)

> **Type**: `chore` / `test`
> **Labels**: `integration`, `testing`, `database`
> **Priority**: 🔴 Critical (Tahap peluncuran/Verifikasi Akhir Fase 2)
> **Complexity**: 🟡 Medium (Pengujian sistem menyeluruh End-to-End)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: SEMUA ISSUE SEBELUMNYA HARUS SELESAI.

---

## Branch

```
issue/034-system-integration-test
```

## Deskripsi

Selamat! Kamu telah merakit mesin roket yang sangat kompleks (Backend, Frontend, Middleware, React Query). Namun, sebuah roket tidak boleh diluncurkan sebelum melewati tahap *System Integration Testing* (SIT).

Pada spesifikasi penutup ini, kita akan membuat sekop (Seeder) untuk menanamkan Akun Super Admin pertama ke dalam database yang masih perawan. Tanpa akun pertama ini, tidak akan ada satupun manusia yang bisa *Login* ke dalam aplikasi karena endpoint registrasi publik memang tidak pernah kita buat (demi keamanan sistem instansi).

Setelah akun tertanam, kita akan menyalakan *Docker*, *Backend*, dan *Frontend* secara bersamaan untuk mensimulasikan penggunaan aplikasi di dunia nyata (*End-to-End Test*).

---

## Acceptance Criteria

- [ ] File `database/seeders/SuperAdminSeeder.php` dibuat.
- [ ] File `database/seeders/DatabaseSeeder.php` dimodifikasi agar menjalankan Seeder di atas.
- [ ] Database Postgres berhasil di-reset sepenuhnya (`migrate:fresh`).
- [ ] Berhasil *Login* ke sistem menggunakan akun Super Admin Seeder.
- [ ] Semua modul di Frontend (Kepegawaian, Module Switcher, Create Form, Logout) lolos pengujian manual tanpa *Error Merah* di peramban.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Langkah ini menggabungkan penulisan kode PHP sederhana dengan perintah terminal yang berurutan. Jangan jalankan pengujian sebelum seluruh kode disimpan dengan benar.

### Langkah 1: Buat Mesin Pencetak Super Admin

**Kenapa?** Sesuai **Rule 6.1**, setiap User wajib dihubungkan ke data Employee (Pegawai). Jadi Seeder ini akan menciptakan "Pegawai Fiktif" sekaligus "Akun Login-nya".

1. Buka *Command Prompt/Terminal* di folder `e:\bksda-superapp\backend\`
2. Jalankan perintah: `php artisan make:seeder SuperAdminSeeder`

**Path:** `e:\bksda-superapp\backend\database\seeders\SuperAdminSeeder.php`
**Buka file yang baru tercipta tersebut, lalu ganti seluruh isinya dengan kode ini:**

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // NIP Fiktif untuk Super Admin (18 digit standar BKN)
        $nipAdmin = '198001012005011001';
        
        // 1. Buat Data Master Pegawai
        Employee::updateOrCreate(
            ['nip' => $nipAdmin], // Cari berdasarkan NIP
            [
                'nama_lengkap' => 'Administrator Pusat BKSDA',
                'jabatan' => 'Kepala Satuan Teknologi',
                'pangkat_golongan' => 'Pembina Utama / IV.c',
                'satuan_kerja' => 'BKSDA Pusat Provinsi',
                'is_active' => true,
            ]
        );

        // 2. Buat Akun Aksesnya
        User::updateOrCreate(
            ['username' => $nipAdmin], // Username = NIP
            [
                'name' => 'Administrator Pusat BKSDA',
                'password' => 'Bksda2026!@#', // Password polos (Akan otomatis di-hash oleh sistem casts User.php)
                'role' => 'super_admin',
                'access_modules' => ['kepegawaian', 'bmn', 'inventory', 'dereporting'],
            ]
        );

        $this->command->info('Akun Super Admin berhasil ditanamkan ke Database!');
    }
}
```

---

### Langkah 2: Daftarkan ke Database Seeder Utama

**Kenapa?** Agar saat kita menjalankan perintah "Seed", Laravel tahu file mana saja yang harus dieksekusi.

**Path:** `e:\bksda-superapp\backend\database\seeders\DatabaseSeeder.php`
**Buka file tersebut, dan tambahkan pemanggilan di dalam fungsi `run()`:**

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            SuperAdminSeeder::class,
        ]);
    }
}
```

---

### Langkah 3: Protokol Pengujian Akhir (Final Test Protocol)

Buka 3 buah *Terminal* terpisah di dalam VSCode kamu untuk menyalakan ketiga jantung aplikasi:

**TERMINAL 1: Docker Database**
```bash
cd e:\bksda-superapp
docker-compose up -d
```
*(Pastikan mesin kontainer PostgreSQL berjalan normal)*

**TERMINAL 2: Mesin Backend**
```bash
cd e:\bksda-superapp\backend
php artisan migrate:fresh --seed
php artisan serve
```
*(Server Backend akan berjalan di `http://localhost:8000`. Cek tulisan hijau "Akun Super Admin berhasil ditanamkan!" yang menandakan Seeder sukses)*.

**TERMINAL 3: Mesin Frontend**
```bash
cd e:\bksda-superapp\frontend
npm run dev
```
*(Buka Browser dan arahkan ke `http://localhost:3000`)*.

#### Skenario Uji (Silakan Lakukan Secara Manual):
1. **Login Test**: Masuk dengan NIP `198001012005011001` dan Password `Bksda2026!@#`. (Ekspektasi: Masuk ke halaman Dashboard sukses tanpa error).
2. **Dashboard UI Test**: Klik tombol profil di sudut kanan atas. (Ekspektasi: Tertulis "A" untuk Administrator). Buka laci Hamburger di mode Mobile.
3. **Module Switcher Test**: Buka Dropdown di layar. (Ekspektasi: Muncul 4 buah Modul yang bisa diklik dengan logo warna-warni).
4. **Pegawai CRUD Test**: Buka "Kepegawaian". Klik "Tambah Data". Isi asal, lalu pilih gambar/foto yang ada di komputermu (Max 10MB). Simpan. (Ekspektasi: Melemparkanmu kembali ke tabel, dan nama pegawai barumu MUNCUL seketika).
5. **Logout Test**: Klik tombol Logout di pinggir layar. Lakukan Konfirmasi. (Ekspektasi: Ditendang keluar ke layar Login kembali).

Jika 5 skenario di atas lulus, **FASE 2 BKSDA SUPERAPP DINYATAKAN SELESAI DENGAN SEMPURNA!** 🎉

---

## Troubleshooting

### Q: Command `php artisan migrate:fresh` memunculkan *Error SQL Connection Refused*.

**Artinya:** Docker kamu belum menyala sempurna atau aplikasi Docker Desktop sedang mati.
**Solusi:** Buka aplikasi Docker Desktop di Windows. Pastikan ikonnya berwarna Hijau. Hentikan aplikasi lain (XAMPP/Laragon) yang memblokir Port `5432` PostgreSQL.

### Q: Saya berhasil Login, tapi layarnya macet (putih blank) saat dilarikan ke `/`.

**Artinya:** Terdapat konfigurasi `useAuth` atau *Layout* yang salah pasang (kemungkinan besar letak `<RouteGuard>`).
**Solusi:** Buka *Developer Tools* (F12) pada browser Chrome, lihat Tab *Console*. Lihat petunjuk *Error* merahnya, minta bantuan AI untuk melacak di komponen spesifik manakah kesalahannya terjadi.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore: system integration and testing protocol" \
  --body "Pembuatan Data Seeder Super Admin dan pelaksanaan End-to-End (E2E) testing menyeluruh fase 2. Detail di docs/issues/034-system-integration-and-test.md" \
  --label "integration,testing,database"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/034-system-integration-test
```

### Step 3: Kerjakan

Salin file kode seeder sesuai petunjuk langkah 1 dan langkah 2. Pastikan `DatabaseSeeder.php` sudah menyimpan perubahannya. Laksanakan Protokol Uji (*Test Protocol*) secara manual jika ada waktu.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/database/seeders/
git commit -m "chore: system integration and testing protocol (#34)"
git push -u origin issue/034-system-integration-test
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore: system integration and testing protocol (#34)" \
  --body "## Summary
Mempersiapkan akun master utama (*Super Admin*) dan melakukan verifikasi integrasi E2E secara lintas-platform (Backend, DB, Frontend).

## Changes
- Injeksi \`SuperAdminSeeder.php\`.
- Aktivasi registrasi \`DatabaseSeeder.php\`.
- Pelaksanaan protokol \`migrate:fresh --seed\`.

## Verification
- [x] Lolos simulasi Login dan JWT injection.
- [x] Lolos integrasi TanStack \`useMutation\` \`multipart/form-data\`.
- [x] IAM Bypass berjalan normal bagi profil \`super_admin\`.

## Rules Compliance
- [x] Mematuhi arsitektur bersih tanpa membuang *dummy data* sembarangan di luar ranah Seeder.

Closes #34" \
  --base main
```

### Step 6: Merge & Sync (PENUTUPAN FASE)

```bash
gh pr merge --squash --delete-branch
git checkout main
git pull origin main

# Lakukan tag versi sebagai tanda rilis fase 2
git tag -a v0.2.0 -m "Release Fase 2: IAM & Kepegawaian Core"
git push origin v0.2.0
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Kita telah merakit seluruh kapal ini, kini saatnya menyalakan mesin. Kita butuh Seeder kunci Super Admin untuk membuka pintu aplikasi.

## Task

Kerjakan Issue #034 (System Integration & Final Test).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/034-system-integration-and-test.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat (atau perbarui) `backend/database/seeders/SuperAdminSeeder.php` dengan data pegawai fiktif super admin.
3. Tambahkan pemanggilan `SuperAdminSeeder::class` ke dalam fungsi run `backend/database/seeders/DatabaseSeeder.php`.
4. (Opsional/Jika diminta User) Jalankan `migrate:fresh --seed` untuk membersihkan DB.
5. Lakukan Git push, `gh pr create`, *merge*, dan tambahkan Tag Versi (`git tag v0.2.0`) sesuai panduan Workflow di atas sebagai selebrasi penutupan fase.
````
