# Issue #124 — Seed Data (Mengisi Database dengan Data Awal)

> **Type**: `data` / `setup`
> **Labels**: `backend`, `database`, `setup`
> **Priority**: 🟡 High (Tanpa Data Awal, Aplikasi Kosong — Tidak Bisa Diuji)
> **Complexity**: 🟡 Medium (Banyak File Seeder, Harus Urut)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #123 (Supabase DB Setup — Migration Harus Selesai Dulu)

---

## Branch

```
issue/124-seed-data
```

## Deskripsi

Setelah migration membuat **struktur tabel** (kolom, tipe data), tabel masih **kosong**. Seeder mengisi tabel-tabel ini dengan **data awal** yang dibutuhkan agar aplikasi bisa berjalan. Ini seperti **membeli lemari baru** (migration) lalu **mengisi baju ke dalamnya** (seeder).

### Diagram: Urutan Setup Database

```
Langkah 1: Migration (Buat struktur)
┌────────────────────────┐
│ CREATE TABLE users     │  → Tabel kosong, 0 baris
│ CREATE TABLE cms_*     │
│ CREATE TABLE assets    │
└────────────────────────┘

Langkah 2: Seeder (Isi data)
┌────────────────────────┐
│ INSERT admin user      │  → 1 admin bisa login
│ INSERT categories      │  → Dropdown terisi
│ INSERT employees       │  → Daftar pegawai ada
│ INSERT master data     │  → Form bisa berfungsi
└────────────────────────┘

Langkah 3: Aplikasi siap diuji! ✅
```

---

## Acceptance Criteria

- [ ] `DatabaseSeeder.php` memanggil semua seeder dalam urutan yang benar.
- [ ] Minimal 1 user admin bisa login setelah seed.
- [ ] Data master DeReporting tersedia (Tahun, Anggaran, Koordinator, dll).
- [ ] Data employee tersedia untuk testing.
- [ ] Seeder bersifat **idempotent** (bisa dijalankan berkali-kali tanpa duplikat).

---

## Panduan Implementasi

### File Utama: `database/seeders/DatabaseSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents; // Matikan model events saat seeding (lebih cepat)

    /**
     * Seed the application's database.
     *
     * URUTAN PENTING!
     * 1. RealDataSeeder    → Inventory (warehouse, category, items, transaksi)
     * 2. EmployeeSeeder    → Daftar pegawai BKSDA (data riil)
     * 3. InitDataSeeder    → Master data DeReporting + User accounts
     *
     * MENGAPA urutan ini?
     * - InitDataSeeder membuat User dari Employee → Employee harus ada dulu
     * - RealDataSeeder bisa berdiri sendiri (tidak tergantung seeder lain)
     */
    public function run(): void
    {
        $this->call(\Database\Seeders\RealDataSeeder::class);
        $this->call(\Database\Seeders\EmployeeSeeder::class);
        $this->call(\App\Modules\DeReporting\Database\Seeders\InitDataSeeder::class);
    }
}
```

---

### Seeder 1: User & Auth — `InitDataSeeder::UserSeed()`

Seeder paling penting — **tanpa user, tidak ada yang bisa login!**

```php
public function UserSeed()
{
    // ═══════════════════════════════════════════
    // 1. SUPER ADMIN — Akses semua modul
    // ═══════════════════════════════════════════

    User::updateOrCreate(
        ['username' => 'admin'],       // Cari berdasarkan username
        [
            'name' => 'Administrator',
            'email' => 'admin@gmail.com',
            'password' => Str::random(16),  // Password acak (reset via tinker)
            'role' => 'admin',
            'access_modules' => ['*'],      // '*' = akses SEMUA modul
            'jabatan' => 'Super Administrator',
        ]
    );

    // ═══════════════════════════════════════════
    // 2. USER SPESIFIK — Akses modul tertentu
    // ═══════════════════════════════════════════

    $tegarNip = '199907072025061006';
    User::updateOrCreate(
        ['username' => $tegarNip],
        [
            'name' => 'Tegar Anugrah, A.Md.Kom.',
            'email' => $tegarNip . '@gmail.com',
            'password' => Str::random(16),
            'role' => 'user',
            'access_modules' => ['bmn', 'inventory'],  // Hanya BMN + Inventory
            'jabatan' => 'Pranata Komputer Terampil',
        ]
    );

    // ═══════════════════════════════════════════
    // 3. BULK USER dari tabel Employee
    // ═══════════════════════════════════════════

    // Buat user untuk SEMUA pegawai (default: tanpa akses modul)
    // Admin bisa menambahkan akses via halaman Settings nanti
    $employees = \App\Modules\Core\Models\Employee::all();
    foreach ($employees as $employee) {
        User::firstOrCreate(
            ['username' => $employee->nip],  // firstOrCreate = TIDAK timpa yang sudah ada
            [
                'name' => $employee->name,
                'email' => $employee->nip . '@gmail.com',
                'password' => Str::random(16),
                'role' => 'user',
                'access_modules' => [],      // Kosong — admin tambahkan nanti
                'jabatan' => $employee->position,
            ]
        );
    }
}
```

### Perbedaan `updateOrCreate` vs `firstOrCreate`:

```
updateOrCreate:
  - ADA? → Update semua field      → Data selalu terkini
  - TIDAK ADA? → Buat baru
  → Cocok untuk: Admin, user utama (selalu sinkron)

firstOrCreate:
  - ADA? → SKIP (tidak mengubah apa pun)
  - TIDAK ADA? → Buat baru
  → Cocok untuk: Bulk user (tidak menimpa perubahan admin)
```

---

### Seeder 2: Master Data DeReporting

Data referensi yang mengisi dropdown dan form di modul laporan:

```php
// ═══ Tahun Anggaran ═══
// Dropdown "Pilih Tahun" di form laporan
Tahun::updateOrCreate(['tahun' => '2024'], [
    'keterangan' => 'Tahun Anggaran 2024',
]);

// ═══ Sumber Anggaran ═══
// Dropdown "Sumber Dana" — 3 opsi
Anggaran::updateOrCreate(['sumber_anggaran' => 'DIPA'], [
    'keterangan' => 'Daftar Isian Pelaksanaan Anggaran (DIPA)',
]);
Anggaran::updateOrCreate(['sumber_anggaran' => 'NONDIPA'], [...]);
Anggaran::updateOrCreate(['sumber_anggaran' => 'PKS'], [...]);

// ═══ Koordinator ═══
// Dropdown "Koordinator Bidang" — 6 bidang
// Tata Usaha, Teknis, Perlindungan, IKN, NONDIPA, PKS

// ═══ Jenis Data ═══
// 27 jenis data laporan, masing-masing terkait 1 koordinator

// ═══ Jenis Laporan ═══
// Bulanan, Triwulan, Tahunan, Keuangan, dll

// ═══ Bidang TSL ═══
// Pemegang Izin TSL, Kerjasama TSL, Data TSL, Lain-lain

// ═══ Kategori ═══
// Penangkaran TSL, Perusahaan Pengedar, Lembaga Konservasi, dll
```

### Diagram: Relasi Master Data DeReporting

```
Koordinator (6 bidang)
├── Tata Usaha
│   ├── Perencanaan          ← JenisData
│   ├── Kepegawaian
│   ├── Perlengkapan/Umum
│   └── Data dan Evaluasi
├── Teknis
│   ├── RKK
│   ├── PKK
│   ├── PJLKK
│   ├── KKHSG
│   └── BPPE
├── Perlindungan
│   ├── Perambahan
│   ├── Kebakaran Hutan
│   ├── Konflik Satwa
│   └── Illegal Logging
└── ... (IKN, NONDIPA, PKS)
```

---

### Seeder 3: Inventory — `RealDataSeeder.php`

Data inventaris riil dari dokumen operasional BKSDA:

```php
// ═══ Warehouse (Gudang) ═══
$samarinda = Warehouse::firstOrCreate(['name' => 'Samarinda']);
$tenggarong = Warehouse::firstOrCreate(['name' => 'Tenggarong']);
$berau = Warehouse::firstOrCreate(['name' => 'Berau']);

// ═══ Category (Kategori Barang) ═══
$catATK = Category::firstOrCreate(['slug' => 'atk'], [
    'name' => 'Alat Tulis Kantor',
    'type' => 'consumable',     // Habis pakai
]);
$catElektronik = Category::firstOrCreate(['slug' => 'elektronik'], [
    'name' => 'Elektronik',
    'type' => 'asset',          // Aset tetap
]);

// ═══ Items + Transactions (20 dokumen, ~50 item) ═══
// Data riil dari Excel operasional BKSDA Kaltim
// Setiap item dicatat via InventoryService->recordStockIn()
```

---

### Seeder 4: Employee — `EmployeeSeeder.php`

Data pegawai BKSDA Kalimantan Timur (data riil ~200+ pegawai):

```php
// File ini besar (~44 KB) karena berisi data riil pegawai.
// Setiap pegawai memiliki: NIP, nama, jabatan, unit kerja, dll.
// Data ini di-generate dari Excel kepegawaian via script Python
// (database/seeders/generate_seeder.py)
```

---

## Daftar Lengkap Seeder

| # | Seeder | Lokasi | Apa yang Di-isi |
|---|--------|--------|-----------------|
| 1 | `DatabaseSeeder` | `database/seeders/` | **Orchestrator** — memanggil seeder lain |
| 2 | `RealDataSeeder` | `database/seeders/` | Warehouse, Category, Item, StockTransaction |
| 3 | `EmployeeSeeder` | `database/seeders/` | 200+ data pegawai BKSDA |
| 4 | `InitDataSeeder` | `Modules/DeReporting/Database/Seeders/` | User, Tahun, Anggaran, Koordinator, JenisData, Jenis, Bidang, Kategori |
| 5 | `InventorySeeder` | `database/seeders/` | Sample data sederhana (opsional) |
| 6 | `BMNSeeder` | `database/seeders/` | 1 contoh aset (opsional) |

---

## Cara Menjalankan

```bash
# Jalankan SEMUA seeder
php artisan db:seed

# Jalankan seeder SPESIFIK (jika hanya butuh 1)
php artisan db:seed --class=EmployeeSeeder

# Reset database + migration + seed (HATI-HATI: menghapus semua data!)
php artisan migrate:fresh --seed
```

> ⚠️ **PERINGATAN:** `migrate:fresh --seed` menghapus **SEMUA** data dan membuat ulang! Jangan jalankan di production yang sudah punya data riil!

---

## Prinsip: Idempotent Seeder

**Idempotent** = bisa dijalankan berkali-kali tanpa efek samping.

```php
// ❌ SALAH — jalankan 2x = data duplikat!
User::create(['username' => 'admin', ...]);

// ✅ BENAR — jalankan 2x = data tetap 1
User::firstOrCreate(
    ['username' => 'admin'],    // Cari berdasarkan ini
    [...]                       // Buat dengan ini jika belum ada
);

// ✅ BENAR — jalankan 2x = data di-update
User::updateOrCreate(
    ['username' => 'admin'],    // Cari berdasarkan ini
    [...]                       // Update/buat dengan ini
);
```

**Gunakan `updateOrCreate` untuk data yang harus selalu sinkron** (admin, master data).
**Gunakan `firstOrCreate` untuk data yang mungkin sudah diubah user** (bulk employees).

---

## Troubleshooting

### Q: Seeder error "Table not found"!

**Solusi:** Migration belum dijalankan! Jalankan `php artisan migrate` dulu.

### Q: Seeder error "Duplicate entry"!

**Solusi:** Seeder memakai `create()` bukan `firstOrCreate()`. Ganti ke `firstOrCreate()` atau `updateOrCreate()`.

### Q: Seeder berhasil tapi tidak bisa login!

**Penjelasan:** Password di seeder adalah `Str::random(16)` — password acak yang tidak kita ketahui.
**Solusi:** Reset password via tinker:
```bash
php artisan tinker
>>> $user = User::where('username', 'admin')->first();
>>> $user->password = bcrypt('password123');
>>> $user->save();
```

### Q: Data employee kosong!

**Solusi:** Pastikan `EmployeeSeeder` dipanggil SEBELUM `InitDataSeeder` (karena InitDataSeeder membuat User dari Employee).

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "data(seed): create database seeders for users, employees, inventory, and DeReporting master data" --body "Closes #124" --label "backend,database,setup"
git checkout -b issue/124-seed-data
# Copy seeder dari superapp-inventory ke bksda-superapp
# Pastikan DatabaseSeeder memanggil dalam urutan benar
# Jalankan php artisan db:seed → verifikasi data masuk
git commit -m "data(seed): add database seeders for initial data (#124)"
git push -u origin issue/124-seed-data
gh pr create --title "data(seed): database seeders (#124)" --body "## Changes
- DatabaseSeeder: Orchestrator memanggil 3 seeder utama (urut).
- RealDataSeeder: 20 dokumen inventory + 50 item dari data operasional.
- EmployeeSeeder: 200+ pegawai BKSDA Kaltim.
- InitDataSeeder: Admin user + master data DeReporting (8 tabel).
- Semua seeder idempotent (firstOrCreate/updateOrCreate).
Closes #124" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\backend\database\seeders\ (semua file seeder)
Database sudah di-migrate (Issue #123). Sekarang isi dengan data awal.

## Task

Kerjakan Issue #124 (Seed Data).
Ikuti instruksi di: `docs/issues/124-seed-data.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Copy semua seeder dari superapp-inventory ke bksda-superapp.
3. Copy InitDataSeeder dari Modules/DeReporting/Database/Seeders/.
4. Pastikan DatabaseSeeder memanggil dalam urutan: RealData → Employee → InitData.
5. KRUSIAL: Semua seeder harus pakai firstOrCreate/updateOrCreate (idempotent)!
6. KRUSIAL: Password admin di seeder = random. Setelah seed, reset via tinker.
7. Jalankan `php artisan db:seed` → verifikasi data masuk.
8. Lakukan Git push dan `gh pr create`.
````
