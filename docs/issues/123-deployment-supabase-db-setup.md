# Issue #123 — Deployment — Supabase Database Setup (Rumah Data di Cloud)

> **Type**: `devops` / `database`
> **Labels**: `backend`, `database`, `devops`
> **Priority**: 🔴 Critical (Tanpa Database, SEMUA Data = Tidak Ada)
> **Complexity**: 🟡 Medium (Setup Dashboard + Connection String + Migration)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Tidak ada — ini pondasi pertama data

---

## Branch

```
issue/123-deployment-supabase-db-setup
```

## Deskripsi

Jika backend adalah **otak**, database adalah **memori jangka panjang**. Semua berita, foto kawasan, data pegawai, dan transaksi inventori — semuanya tersimpan di database. Project ini menggunakan **Supabase** — platform yang menyediakan **PostgreSQL database gratis** di cloud.

**Mengapa Supabase?**

| Fitur | Supabase | AWS RDS | Self-hosted |
|-------|----------|---------|-------------|
| Harga | **Gratis** (tier awal) | $15+/bulan | Tergantung VPS |
| Setup | 2 menit (Dashboard) | 30+ menit | 1+ jam |
| Backup | Otomatis (harian) | Perlu config | Manual |
| PostgreSQL | ✅ | ✅ | ✅ |
| Storage | ✅ Termasuk | ❌ Terpisah (S3) | Manual |
| Auth | ✅ Termasuk | ❌ | Manual |

---

## Acceptance Criteria

- [ ] Project Supabase sudah dibuat.
- [ ] Connection string tersedia dan berfungsi.
- [ ] `.env` backend sudah dikonfigurasi untuk PostgreSQL Supabase.
- [ ] `php artisan migrate` berhasil membuat semua tabel.
- [ ] Storage bucket `cms` sudah dibuat.

---

## Panduan Implementasi

### Langkah 1: Buat Project Supabase

```
1. Buka https://supabase.com/dashboard
2. Klik "New Project"
3. Isi:
   - Organization: Pilih/buat organization
   - Project name: "bksda-superapp"
   - Database password: [CATAT DAN SIMPAN DI TEMPAT AMAN!]
   - Region: "Southeast Asia (Singapore)" ← Terdekat dari Indonesia
4. Klik "Create new project"
5. Tunggu 2-3 menit → Project aktif
```

> ⚠️ **KRUSIAL:** Password database **tidak bisa dilihat lagi** setelah dibuat! Catat sekarang atau reset nanti.

---

### Langkah 2: Dapatkan Connection String

```
Supabase Dashboard → Project → Settings → Database

Anda akan melihat 2 jenis connection:

┌──────────────────────────────────────────────────────────────┐
│ Connection Type                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ 1. Direct Connection (Koneksi Langsung)                      │
│    Host: db.xxxxxxxxxxxxx.supabase.co                        │
│    Port: 5432                                                │
│    → Untuk: Migration, artisan commands                      │
│    → Cocok: Script yang berjalan singkat                     │
│                                                              │
│ 2. Connection Pooler (PgBouncer)                             │
│    Host: aws-0-ap-southeast-1.pooler.supabase.com            │
│    Port: 6543                                                │
│    → Untuk: Aplikasi production (Laravel)                    │
│    → Cocok: Banyak koneksi simultan                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Diagram: Direct vs Pooler — Kapan Pakai Mana?

```
═══ DIRECT CONNECTION ═══
(Setiap request buka koneksi baru ke PostgreSQL langsung)

Request 1 ──→ [Koneksi 1] ──→ PostgreSQL
Request 2 ──→ [Koneksi 2] ──→ PostgreSQL
Request 3 ──→ [Koneksi 3] ──→ PostgreSQL
...
Request 100 ──→ [Koneksi 100] ──→ PostgreSQL ← KEHABISAN KONEKSI! ❌

═══ CONNECTION POOLER (PgBouncer) ═══
(Semua request berbagi pool koneksi yang terbatas)

Request 1 ─┐                  ┌──→ PostgreSQL
Request 2 ─┤ ──→ [Pool: 15   │
Request 3 ─┤     koneksi]  ──┤──→ PostgreSQL
...         │                  │
Request 100┘                  └──→ PostgreSQL ← AMAN! ✅ Antri via pool
```

**Kesimpulan:** Untuk aplikasi production (Laravel di Vercel), **SELALU pakai Pooler** (port 6543). Direct connection hanya untuk menjalankan migration satu kali.

---

### Langkah 3: Konfigurasi `.env` Backend

```env
# ═══════════════════════════════════════════════════════════
# Database Connection — Supabase PostgreSQL
# ═══════════════════════════════════════════════════════════

# Koneksi utama (via Pooler — untuk production)
DB_CONNECTION=pgsql
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_DATABASE=postgres
DB_USERNAME=postgres.xxxxxxxxxxxxx
DB_PASSWORD=your-database-password-here
DB_SSLMODE=require

# ═══════════════════════════════════════════════════════════
# PENTING: Supabase Username Format
# ═══════════════════════════════════════════════════════════
#
# Username Supabase BUKAN "postgres" biasa!
# Formatnya: postgres.{PROJECT_REF}
#
# Contoh:
#   Project ref: iflvjdalryfosgbxvcon
#   Username: postgres.iflvjdalryfosgbxvcon
#
# Jika username salah → "FATAL: password authentication failed"
# ═══════════════════════════════════════════════════════════
```

---

### Langkah 4: Konfigurasi `config/database.php`

Pastikan koneksi `pgsql` sudah benar (sudah ada di Laravel default, tapi perhatikan opsi khusus):

```php
'pgsql' => [
    'driver' => 'pgsql',
    'url' => env('DB_URL'),
    'host' => env('DB_HOST', '127.0.0.1'),
    'port' => env('DB_PORT', '5432'),
    'database' => env('DB_DATABASE', 'laravel'),
    'username' => env('DB_USERNAME', 'root'),
    'password' => env('DB_PASSWORD', ''),
    'charset' => env('DB_CHARSET', 'utf8'),
    'prefix' => '',
    'prefix_indexes' => true,
    'search_path' => 'public',
    'sslmode' => env('DB_SSLMODE', 'prefer'),

    // KHUSUS SUPABASE: Harus true agar prepared statements
    // bekerja dengan PgBouncer connection pooler
    'prepared' => env('DB_PREPARED', true),

    'options' => [
        PDO::ATTR_EMULATE_PREPARES => true,
    ],
],
```

---

### Langkah 5: Jalankan Migration

```bash
# Dari folder backend/
cd e:\bksda-superapp\backend

# Test koneksi dulu
php artisan db:show

# Jalankan semua migration
php artisan migrate

# Cek status migration
php artisan migrate:status
```

### Daftar Tabel yang Akan Dibuat (49 Migration)

```
┌─────────────────────────────────────────────────────────────┐
│ Core Tables (Laravel + Auth)                                │
├─────────────────────────────────────────────────────────────┤
│ users, personal_access_tokens, cache, jobs, sessions        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ CMS Tables (Website Publik)                                 │
├─────────────────────────────────────────────────────────────┤
│ cms_categories, cms_informasis, cms_profils, cms_tsls,      │
│ cms_kawasans, cms_websites, cms_kepalas, cms_photos,        │
│ cms_videos, cms_pesans, cms_links, cms_jenis, cms_bukus,    │
│ cms_leaflets, cms_posters, cms_regulasis, cms_menus,        │
│ cms_pages                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ BMN Tables (Barang Milik Negara)                            │
├─────────────────────────────────────────────────────────────┤
│ assets, asset_updates, asset_loans                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Inventory Tables                                            │
├─────────────────────────────────────────────────────────────┤
│ items, stock_transactions                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ DeReporting Tables                                          │
├─────────────────────────────────────────────────────────────┤
│ dr_* (tabel modul laporan eksternal)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Surat Tugas Tables                                          │
├─────────────────────────────────────────────────────────────┤
│ st_assignment_letters, st_letter_members, st_letter_tasks   │
└─────────────────────────────────────────────────────────────┘
```

---

### Langkah 6: Buat Storage Bucket

```
Supabase Dashboard → Storage → New Bucket

1. Nama bucket: "cms"
2. Public bucket: ✅ (aktifkan — agar gambar bisa diakses tanpa auth)
3. File size limit: 20 MB
4. Allowed MIME types: image/*, application/pdf, video/*
5. Klik "Create bucket"
```

### Buat Storage Policy (RLS)

```
Supabase Dashboard → Storage → cms → Policies

Policy 1: Public Read (SELECT)
- Target: anon (anonim)
- Operation: SELECT
- Definition: true
→ Semua orang bisa MELIHAT file

Policy 2: Authenticated Upload (INSERT)
- Target: authenticated
- Operation: INSERT
- Definition: true
→ Hanya user login yang bisa UPLOAD

Policy 3: Service Role Full Access
- Otomatis — service_role key bypass semua policy
→ Backend (SupabaseStorageService) pakai key ini
```

---

## Verifikasi Koneksi

### Test dari Terminal

```bash
# Test koneksi database
php artisan tinker
>>> DB::connection()->getPdo();
# Jika berhasil: PDO object (bukan error)

>>> DB::table('users')->count();
# Jika berhasil: 0 (tabel kosong) atau angka positif

# Test Supabase Storage (jika service sudah ada)
>>> $s = new \App\Services\SupabaseStorageService();
>>> $s->publicUrl('test.jpg');
# Jika berhasil: URL lengkap Supabase
```

---

## Troubleshooting

### Q: "FATAL: password authentication failed for user postgres"!

**Penyebab Paling Sering:**
1. ❌ Username `postgres` → seharusnya `postgres.{PROJECT_REF}`
2. ❌ Password salah (sudah lupa? reset di Dashboard → Settings → Database)
3. ❌ Port `5432` → seharusnya `6543` (jika pakai Pooler)

### Q: "Connection refused" atau timeout!

**Checklist:**
1. ✅ Host benar? (`pooler.supabase.com` bukan `db.supabase.co` untuk pooler)
2. ✅ Region host cocok dengan project region?
3. ✅ Firewall/VPN tidak memblokir port 5432/6543?
4. ✅ Project Supabase aktif (bukan paused)?

### Q: Migration error "prepared statement already exists"!

**Penyebab:** PgBouncer (pooler) tidak mendukung prepared statements mode tertentu.
**Solusi:** Pastikan `config/database.php` punya:
```php
'options' => [
    PDO::ATTR_EMULATE_PREPARES => true,
],
```

### Q: Project Supabase ter-pause otomatis!

**Penjelasan:** Free tier Supabase **mem-pause project** setelah 7 hari tidak aktif. Saat di-pause, database tidak bisa diakses.
**Solusi:** 
- Klik "Restore" di Dashboard (butuh beberapa menit)
- Atau upgrade ke Pro plan ($25/bulan) untuk mencegah pause otomatis
- Atau buat cron job yang ping database setiap hari

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "deploy(db): setup Supabase PostgreSQL project with connection pooler and storage bucket" --body "Closes #123" --label "backend,database,devops"
git checkout -b issue/123-deployment-supabase-db-setup
# Update .env dan .env.example dengan connection string Supabase
# Pastikan config/database.php punya PDO::ATTR_EMULATE_PREPARES
# Jalankan php artisan migrate
git commit -m "deploy(db): configure Supabase PostgreSQL connection with pooler and storage (#123)"
git push -u origin issue/123-deployment-supabase-db-setup
gh pr create --title "deploy(db): Supabase database setup (#123)" --body "## Changes
- .env.example: Connection string Supabase (Pooler port 6543).
- config/database.php: ATTR_EMULATE_PREPARES untuk PgBouncer.
- 49 migration berhasil dijalankan.
- Storage bucket 'cms' dibuat dengan public read policy.
Closes #123" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Database: Supabase PostgreSQL (free tier)
Region: Southeast Asia (Singapore)
49 migration files sudah ada — perlu dijalankan ke database baru.

## Task

Kerjakan Issue #123 (Deployment — Supabase DB Setup).
Ikuti instruksi di: `docs/issues/123-deployment-supabase-db-setup.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat project Supabase (jika belum ada) — catat password!
3. Ambil connection string dari Dashboard → Settings → Database.
4. Update `.env` dengan DB_HOST, DB_PORT=6543, DB_USERNAME=postgres.{ref}, DB_PASSWORD.
5. KRUSIAL: Username Supabase = `postgres.{PROJECT_REF}`, BUKAN hanya `postgres`!
6. KRUSIAL: Gunakan port 6543 (Pooler), BUKAN 5432 (Direct)!
7. Jalankan `php artisan migrate` — harus 49 migration berhasil.
8. Buat storage bucket `cms` di Supabase Dashboard (Public).
9. Lakukan Git push dan `gh pr create`.
````
