# Issue #035 — Backend — Assignment Letters Migration

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-surattugas`
> **Priority**: 🔴 Critical (Pembukaan Fase 3: Modul Surat Tugas)
> **Complexity**: 🟡 Medium (Pembuatan 2 tabel relasional bersarang)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #034 (Penutupan Fase 2)

---

## Branch

```
issue/035-backend-assignment-letters-migration
```

## Deskripsi

Selamat datang di **Fase 3: Modul Surat Tugas**! 🚀
BKSDA SuperApp akan dilengkapi dengan sistem pengajuan, persetujuan, dan pencetakan Surat Tugas (ST) secara otomatis. Modul ini sangat vital bagi pergerakan operasional pegawai di lapangan.

Pada issue pertama di fase ini, kita akan meletakkan fondasi batubatanya. Sesuai dengan **Rule 3.7**, seluruh tabel di modul ini wajib memiliki awalan (prefix) `st_`.
Terdapat dua entitas yang akan kita ciptakan:
1. `st_assignment_letters`: Tabel induk penyimpan informasi (Nomor Surat, Maksud/Tujuan, Tanggal, dan Status).
2. `st_assignment_letter_employees`: Tabel *Pivot* (Jembatan) yang menghubungkan Surat Tugas dengan para Pegawai (Issue #022). Satu ST bisa menugaskan banyak pegawai (Ketua Tim, Anggota, dsb).

---

## Acceptance Criteria

- [ ] Folder instalasi struktural Modul `SuratTugas/Migrations/` dibuat.
- [ ] File migrasi `st_assignment_letters` dibuat menggunakan `UUID`, mengimplementasikan **SoftDeletes (Rule 3.6)**, dan relasi *Foreign Key* ke tabel `users`.
- [ ] File migrasi pivot `st_assignment_letter_employees` dibuat, mengunci relasi *Cascade*, dan mengimplementasikan *Unique Constraint* agar 1 pegawai tidak masuk 2 kali di surat yang sama.
- [ ] Migrasi berhasil dieksekusi ke PostgreSQL tanpa mengembalikan *error foreign key*.

---

## Langkah Demi Langkah

### Langkah 1: Buat Direktori Struktural Modul

Karena Modul `SuratTugas` adalah modul independen, kita harus menyiapkan singgasananya terlebih dahulu.

1. Buka *Command Prompt / Terminal* Windows.
2. Arahkan ke root Backend: `cd e:\bksda-superapp\backend`
3. Buat folder migrasinya:
```bash
mkdir -p app/Modules/SuratTugas/Migrations
```

### Langkah 2: Skrip Migrasi Tabel Utama (Induk)

Buatlah file migrasi pertama secara manual (karena Laravel 12 defaultnya menaruh di `database/migrations`, kita harus menulisnya langsung di folder modul).

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Migrations\2026_06_01_000001_create_st_assignment_letters_table.php`

**Isi file dengan skrip struktur PostgreSQL berikut:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('st_assignment_letters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            // Meta Data Surat
            $table->string('nomor_surat')->nullable()->unique()->comment('Bisa diisi belakangan saat approved');
            $table->text('dasar_hukum')->nullable();
            $table->text('maksud_tujuan');
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->string('tempat_tujuan');
            
            // Workflow Status
            $table->enum('status', ['draft', 'pending', 'approved', 'rejected', 'completed'])->default('draft');
            $table->string('file_surat_path')->nullable()->comment('Path PDF arsip final');
            
            // Audit Trails (Foreign ke UUID tabel users di Fase 1)
            $table->foreignUuid('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            $table->softDeletes(); // Wajib SoftDeletes (Rule 3.6)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('st_assignment_letters');
    }
};
```

---

### Langkah 3: Skrip Migrasi Tabel Pivot (Anak)

Surat Tugas butuh personil. Kita hubungkan ST dengan data Pegawai dari Modul Kepegawaian (`kpg_employees`).

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Migrations\2026_06_01_000002_create_st_assignment_letter_employees_table.php`

**Isi file dengan skrip relasi berikut:**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('st_assignment_letter_employees', function (Blueprint $table) {
            $table->id();
            
            // Relasi ke Induk Surat Tugas
            $table->foreignUuid('assignment_letter_id')->constrained('st_assignment_letters')->onDelete('cascade');
            
            // Relasi ke Lintas-Modul (Kepegawaian)
            $table->foreignUuid('employee_id')->constrained('kpg_employees')->onDelete('cascade');
            
            $table->string('peran')->nullable()->comment('Contoh: Ketua Tim, Anggota');
            $table->timestamps();
            
            // Rule 3.3 Indexing Otomatis dari foreignUuid()
            // Constraint tambahan: 1 Pegawai cuma boleh masuk 1 kali di 1 Surat Tugas yang sama
            $table->unique(['assignment_letter_id', 'employee_id'], 'st_al_employee_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('st_assignment_letter_employees');
    }
};
```

*(Penting: Saat menjalankan `php artisan migrate`, file ini belum akan terbaca karena kita belum mendaftarkannya di Service Provider. Hal ini akan kita selesaikan di **Issue #037**, namun struktur databasenya telah aman terkunci).*

---

## Troubleshooting

### Q: IDE saya memberikan peringatan merah "Class Migration not found".

**Artinya:** Ekstensi VSCode kamu (seperti Intelephense) mungkin telat membaca *autoload*.
**Solusi:** Jalankan perintah `composer dump-autoload` di dalam folder `backend/` untuk menyegarkan jembatan PSR-4 Laravel-mu.

### Q: Bolehkah saya langsung menjalankan *migrate* sekarang?

**Artinya:** Migrasi ini belum terbaca oleh mesin pusat Laravel.
**Solusi:** Tidak perlu divalidasi dengan eksekusi DB hari ini. Fokuskan pada keakuratan *Syntax* dan nama kolom, Laravel baru akan mendeteksinya setelah *SuratTugasServiceProvider* kita pasang nanti.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): assignment letters database migrations" \
  --body "Inisialisasi tabel induk \`st_assignment_letters\` dan tabel pivot \`st_assignment_letter_employees\` untuk modul Surat Tugas. Detail di docs/issues/035-backend-assignment-letters-migration.md" \
  --label "backend,database,module-surattugas"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/035-backend-assignment-letters-migration
```

### Step 3: Kerjakan

Buat dua buah file PHP sesuai lokasi yang ditentukan secara presisi. Teliti penggunaan referensi *Foreign Key* lintas modul (`users` dan `kpg_employees`).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/SuratTugas/
git commit -m "feat(surat-tugas): assignment letters database migrations (#35)"
git push -u origin issue/035-backend-assignment-letters-migration
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): assignment letters database migrations (#35)" \
  --body "## Summary
Membangun fondasi Database Modul Surat Tugas (Fase 3). Memisahkan entitas ke dalam tabel Induk (Metadata Surat) dan tabel Pivot (Data Personil).

## Changes
- Pembuatan migrasi \`st_assignment_letters\` (Tabel Induk).
- Pembuatan migrasi \`st_assignment_letter_employees\` (Tabel Pivot).

## Rules Compliance
- [x] Rule 3.7: Penamaan tabel patuh menggunakan prefix \`st_\`.
- [x] Rule 3.6: Memasang \`SoftDeletes\` pada record surat induk.
- [x] Cross-Module Reference: Pivot menembak target ke \`kpg_employees\` (Modul Kepegawaian) secara \`CASCADE\`.

Closes #35" \
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
Kita memulai Fase 3 (Modul Surat Tugas). Saya butuh fondasi database untuk menyimpan informasi keberangkatan dan penugasan karyawan.

## Task

Kerjakan Issue #035 (Backend — Assignment letters migration).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/035-backend-assignment-letters-migration.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder migrasinya di `backend/app/Modules/SuratTugas/Migrations`.
3. Buat file tabel induk `...create_st_assignment_letters_table.php` dan salin kode Blueprint schema-nya dengan cermat.
4. Buat file tabel pivot `...create_st_assignment_letter_employees_table.php` dan salin kode relasionalnya.
5. Jalankan `composer dump-autoload` untuk memastikan IDE bersih dari peringatan.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
