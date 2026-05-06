# Issue #022 — Backend — Employees Migration

> **Type**: `feature`
> **Labels**: `backend`, `database`, `kepegawaian`
> **Priority**: 🔴 Critical (Data master yang akan digunakan oleh semua modul lain)
> **Complexity**: 🟢 Simple (Pembuatan tabel baru dengan aturan ketat)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash / Ollama
> **Dependencies**: Issue #015 (Semua fondasi Phase 1 selesai)

---

## Branch

```
issue/022-backend-employees-migration
```

## Deskripsi

Selamat datang di **Phase 2: Kepegawaian Module**! 
Berdasarkan **Rule 6.1**, data Pegawai (*Employee*) bersifat global dan akan digunakan oleh seluruh modul (misal: meminjam barang, membuat laporan tugas, dsb). Oleh karena itu, arsitektur databasenya harus dipikirkan matang-matang agar cepat saat dicari (butuh *Index*) dan aman dari penghapusan permanen (butuh *SoftDeletes*).

**Apa yang dilakukan:**
1. Membuat file migration untuk tabel `kpg_employees`. (Menggunakan prefix `kpg_` sesuai **Rule 3.7** untuk menandakan ini milik modul Kepegawaian).
2. Mendefinisikan kolom-kolom identitas Pegawai Negeri (NIP, Nama, Jabatan, Pangkat/Golongan).
3. Menerapkan pengindeksan (*Database Indexing*) pada NIP dan Nama agar fitur *Search* (Pencarian) berjalan kilat.

**Apa yang TIDAK dilakukan:**
- ❌ Tidak membuat Model-nya di issue ini (akan difokuskan pada Issue #023 beserta relasinya).

---

## Acceptance Criteria

- [ ] File migration `create_kpg_employees_table` berhasil dibuat.
- [ ] Tabel memiliki prefix yang benar (`kpg_`).
- [ ] Terdapat kolom `nip` (string, `unique`), `nama_lengkap`, `jabatan`, `pangkat_golongan`, `satuan_kerja`, `is_active` (boolean default true), dan `foto_profil`.
- [ ] Tabel mengimplementasikan `softDeletes()`.
- [ ] Command `php artisan migrate` berjalan tanpa error.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Tabel ini berdiri sendiri. Ingat, relasi *User* dengan *Employee* tidak menggunakan ID biasa (Foreign Key konvensional), melainkan di-link via `username` (users) ↔ `nip` (employees) sesuai **Rule 6.1**.

### Langkah 1: Generate File Migration

**Kenapa?** Menggunakan CLI akan otomatis membuatkan *timestamp* dan kerangka fungsi dasar agar seragam dengan standar Laravel.

```bash
cd e:\bksda-superapp\backend

# Membuat kerangka file migrasi baru
php artisan make:migration create_kpg_employees_table
```

---

### Langkah 2: Tulis Struktur Tabel (Clean Code)

**Kenapa?** Kita membatasi panjang *string* pada NIP untuk efisiensi *storage* dan mempercepat *query*, serta memberikan komentar pada kolom agar *Database Administrator* (DBA) memahami isi datanya saat meninjau lewat *pgAdmin*.

**Path:** `e:\bksda-superapp\backend\database\migrations\xxxx_xx_xx_xxxxxx_create_kpg_employees_table.php`

**Buka file yang baru saja digenerate, dan ubah function `up()` dan `down()`:**

```php
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('kpg_employees', function (Blueprint $table) {
            $table->id();
            
            // Identitas Utama
            // NIP PNS umumnya 18 digit, kita beri max 50 untuk jaga-jaga format spasi/dash
            $table->string('nip', 50)->unique()->comment('Nomor Induk Pegawai. Digunakan untuk link ke table users.username');
            $table->string('nama_lengkap');
            
            // Detail Pekerjaan
            $table->string('jabatan')->nullable();
            $table->string('pangkat_golongan')->nullable()->comment('Contoh: Penata Tk. I (III/d)');
            $table->string('satuan_kerja')->nullable()->comment('Contoh: SKW I / Resor Konservasi Wilayah');
            
            // Status & Media
            $table->boolean('is_active')->default(true)->comment('Apakah pegawai masih aktif bekerja');
            $table->string('foto_profil')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Sesuai Rule 3.6 & 6.1: Tidak boleh hard-delete
            $table->softDeletes(); 

            // ==========================================
            // PERFORMANCE OPTIMIZATION (INDEXING)
            // ==========================================
            // Karena nama akan sering dicari di fitur "Search Pegawai", 
            // kita jadikan index agar query tidak membebani CPU database.
            // (NIP tidak perlu di-index manual karena sudah otomatis di-index oleh ->unique())
            $table->index('nama_lengkap');
        });
    }

    /**
     * Reverse the migrations.
     * Sesuai Rule 3.9: Setiap migration wajib bisa di-rollback
     */
    public function down(): void
    {
        Schema::dropIfExists('kpg_employees');
    }
```

**Lalu jalankan migrasinya:**
```bash
php artisan migrate
```

---

## Troubleshooting

### Q: `Syntax error or access violation: 1071 Specified key was too long` pada saat migrate

**Artinya:** Walaupun masalah ini umum di MySQL jadul, PostgreSQL 15 (yang kita pakai) kebal terhadap batas indeks string biasa. Jika terjadi *error* aneh, berarti koneksi Docker PostgreSQL-mu bermasalah.
**Solusi:** Pastikan `docker-compose up -d` berjalan, dan cek apakah file `.env` Laravel kamu sudah diset ke DB_CONNECTION=pgsql.

### Q: Kenapa tidak menaruh `user_id` di dalam tabel ini sebagai relasi langsung?

**Artinya:** Kamu bingung dengan *Foreign Key* relasi User-Employee.
**Solusi:** Tidak semua Pegawai (Employee) BKSDA diberikan akun untuk masuk aplikasi (User). Dan sebaliknya, seorang User (misal teknisi *outsourcing*) mungkin tidak terdaftar sebagai Pegawai Negeri. Makanya kita biarkan mereka berpisah, lalu dijembatani (*linked*) secara logikal oleh `NIP` = `Username`. Ini mempermudah administrasi (Rule 6.1).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): employees table migration" \
  --body "Pembuatan skema database untuk master data pegawai BKSDA. Detail di docs/issues/022-backend-employees-migration.md" \
  --label "backend,database,kepegawaian"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/022-backend-employees-migration
```

### Step 3: Kerjakan

Jalankan artisan make migration, tuliskan skema sesuai *markdown*, dan lakukan perintah `php artisan migrate`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/database/migrations/
git commit -m "feat(kepegawaian): employees table migration (#22)"
git push -u origin issue/022-backend-employees-migration
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): employees table migration (#22)" \
  --body "## Summary
Membuat kerangka data master Pegawai (Employees) yang terisolasi dalam modul \`kpg_\`.

## Changes
- File migrasi baru \`create_kpg_employees_table\`.
- Penambahan kolom NIP, Nama, Jabatan, Golongan, Satker.
- Optimasi pencarian menggunakan \`index('nama_lengkap')\`.

## Verification
- [x] Lolos migrasi database lokal (\`php artisan migrate\`).
- [x] Metode \`down()\` tersedia untuk *rollback*.

## Rules Compliance
- [x] Rule 3.6 & 6.1: \`softDeletes\` diimplementasikan.
- [x] Rule 3.7: Prefix \`kpg_\` digunakan secara konsisten.
- [x] Rule 3.9: Kemampuan rollback dipastikan aman.

Closes #22" \
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
Kita resmi masuk ke "Phase 2: Kepegawaian Module".

## Task

Kerjakan Issue #022 (Backend — Employees Migration).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/022-backend-employees-migration.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi ke `backend/` dan generate migration via artisan.
3. Buka file migration tersebut dan *copy-paste* blok kode skema tabel `kpg_employees`. Jangan lupakan komentar kolom dan deklarasi `index()` pada `nama_lengkap`.
4. Jalankan `php artisan migrate` untuk verifikasi syntax.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
