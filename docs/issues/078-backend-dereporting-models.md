# Issue #078 — Backend — DeReporting Models (Jaringan Otak ORM)

> **Type**: `feature`
> **Labels**: `backend`, `model`, `module-dereporting`
> **Priority**: 🔴 Critical (Menghubungkan Jaring Relasi Rantai Database)
> **Complexity**: 🟡 Medium (Deklarasi Eloquent Strict dengan 9 Model)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #077

---

## Branch

```
issue/078-backend-dereporting-models
```

## Deskripsi

Melompat ke **Issue #078 (Pencetakan Model)** setelah menyusun *Migration* (Issue 077) adalah langkah **SANGAT AMAN** dan sepenuhnya sesuai dengan Alur (*Workflow*) Laravel!

Setelah fondasi besi 11 tabel kita ditancapkan di Database, kita tidak bisa memerintahkan *Backend* untuk berbicara dengan tabel tersebut tanpa adanya penerjemah. Di sinilah *Eloquent ORM Models* mengambil peran.

Tantangan utama di Modul DeReporting ini adalah merakit fungsi relasi berantai:
- `Bidang` memiliki banyak (`hasMany`) `Jenis`.
- `Jenis` memiliki banyak `Kategori`, namun juga merupakan milik (`belongsTo`) `Bidang`.
- `Internal` (Laporan) adalah ujung dari jaring laba-laba yang memiliki lebih dari 7 relasi `belongsTo` sekaligus.

**ATURAN MUTLAK (Project Rule 1.3 & 3.7)**: 
1. Jangan pernah menggunakan taktik malas `$guarded = []`. Setiap Model wajib mendaftar kolom propertinya satu per satu di dalam `$fillable`.
2. Semua Model wajib mendeklarasikan secara eksplisit nama tabelnya menggunakan `protected $table = 'dr_nama_tabel';` karena Laravel berbahasa Inggris *(Pluralization)* dan tidak akan paham dengan kata depan `dr_`.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/DeReporting/Models`.
- [ ] Tersedia 7 Model Master Data (Tahun, Bidang, Koordinator, Anggaran, Jenis, Kategori, JenisData) lengkap dengan jaring fungsi relasi `belongsTo` & `hasMany`.
- [ ] Tersedia Model `Internal` yang mendeklarasikan 8 jaringan relasi terhadap data master dan tabel `users`.
- [ ] Tersedia Model `Ekternal` yang mengunci `$fillable` untuk memblokir celah serangan *Mass Assignment* (terutama pengamanan atribut `ip_address`).

---

## Panduan Implementasi Cerdas

Masuk ke teritori Model DeReporting:
```bash
mkdir -p backend/app/Modules/DeReporting/Models
```

### 1. Cetak Biru Model Ujung Rantai: JenisData.php
**Path:** `backend/app/Modules/DeReporting/Models/JenisData.php`

```php
<?php

namespace App\Modules\DeReporting\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JenisData extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    // WAJIB: Patahkan kebiasaan baku penamaan bahasa Inggris Laravel
    protected $table = 'dr_jenis_data';

    // WAJIB: Proteksi Anti-Mass-Assignment tingkat tinggi
    protected $fillable = [
        'kategori_id',
        'koordinator_id',
        'nama',
    ];

    /**
     * RELASI KE ATAS (Parent)
     */
    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'kategori_id');
    }

    public function koordinator()
    {
        return $this->belongsTo(Koordinator::class, 'koordinator_id');
    }

    /**
     * RELASI KE BAWAH (Children)
     */
    public function laporanInternal()
    {
        // 1 Jenis Data bisa memiliki ribuan rekam jejak Laporan Internal
        return $this->hasMany(Internal::class, 'jenis_data_id');
    }
}
```

### 2. Cetak Biru Model Inti Laporan: Internal.php
**Path:** `backend/app/Modules/DeReporting/Models/Internal.php`

Perhatikan dengan seksama jaring laba-laba (*Spider-Web*) relasional di file raksasa ini:

```php
<?php

namespace App\Modules\DeReporting\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Internal extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'dr_internals';

    protected $fillable = [
        'user_id',
        'tahun_id',
        'bidang_id',
        'jenis_id',
        'kategori_id',
        'jenis_data_id',
        'koordinator_id',
        'anggaran_id',
        'judul_laporan',
        'file_path',
        'keterangan',
    ];

    /**
     * JARING LABA-LABA KEPEMILIKAN (RELATIONAL OWNERSHIP)
     */
    
    // Identitas siapa agen pegawai yang mengunggah laporan ini
    public function uploader()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Identitas Waktu Laporan
    public function tahun()
    {
        return $this->belongsTo(Tahun::class, 'tahun_id');
    }

    // Identitas Rantai Taksonomi BKSDA
    public function bidang()
    {
        return $this->belongsTo(Bidang::class, 'bidang_id');
    }

    public function jenis()
    {
        return $this->belongsTo(Jenis::class, 'jenis_id');
    }

    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'kategori_id');
    }

    public function jenisData()
    {
        return $this->belongsTo(JenisData::class, 'jenis_data_id');
    }

    // Ekstra Penanggung Jawab
    public function koordinator()
    {
        return $this->belongsTo(Koordinator::class, 'koordinator_id');
    }

    public function anggaran()
    {
        return $this->belongsTo(Anggaran::class, 'anggaran_id');
    }
}
```

### 3. Tugas Replikasi Cerdas untuk Model Lainnya
Dengan menganalisa Cetak Biru di atas, saya menginstruksikan kepada AI/Programer Pelanjut untuk:
- Menciptakan `Tahun.php`, `Bidang.php`, `Koordinator.php`, dan `Anggaran.php`. Mereka hanya butuh kolom `$fillable = ['nama']` (Atau `'tahun'` dan `'is_active'` untuk tabel Tahun) dan relasi `hasMany(Internal::class)`.
- Menciptakan `Jenis.php` (Memiliki `$fillable = ['bidang_id', 'nama']`). Relasi ke atasnya adalah `belongsTo(Bidang::class)`. Relasi ke bawahnya `hasMany(Kategori::class)`.
- Menciptakan `Kategori.php` (Memiliki `$fillable = ['jenis_id', 'nama']`).
- Menciptakan `Ekternal.php` (Tabel Publik). Pastikan atribut `$fillable` mengikat secara keras kolom `nama_pelapor`, `judul_laporan`, `file_path`, dan secara terpisah mengontrol `status` serta `ip_address` agar tidak disalahgunakan peretas.

---

## Troubleshooting

### Q: Mengapa file saya diabaikan oleh Controller nanti saat dipanggil `use App\Models\Bidang`?

**Artinya:** Kamu lupa mengubah *Namespace* saat menyalin dari cetak biru!
**Solusi:** Kita tidak meletakkan model ini di `app/Models`. Kita menggunakan Arsitektur Modular raksasa. Ingatlah selalu bahwa Baris ke-3 di seluruh Model di atas **WAJIB MUTLAK** berbunyi: `namespace App\Modules\DeReporting\Models;`. Jika salah, arsitektur aplikasi ini akan terputus total.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): construct domain-driven Eloquent models with deeply nested relational bindings" \
  --body "Membangun tulang punggung pangkalan ORM Eloquent untuk Modul DeReporting. Menata jaringan laba-laba pemanggilan berantai tingkat dalam (hasMany/belongsTo) serta menyegel kerentanan *Mass Assignment* dengan deklarasi \`\$fillable\` ketat (Anti-Guarded). Detail di docs/issues/078-backend-dereporting-models.md" \
  --label "backend,model,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/078-backend-dereporting-models
```

### Step 3: Kerjakan

Pahat kesembilan pilar penyangga Eloquent (`Tahun`, `Bidang`, `Koordinator`, `Anggaran`, `Jenis`, `Kategori`, `JenisData`, `Internal`, `Ekternal`). Waspadai selalu penamaan atribut *Database* (*snake_case*) agar sama persis dengan yang ada di *Migrations* (Issue 077). 

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): construct domain-driven Eloquent models with deeply nested relational bindings (#78)"
git push -u origin issue/078-backend-dereporting-models
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): construct domain-driven Eloquent models with deeply nested relational bindings (#78)" \
  --body "## Summary
Aktivasi ruh Pangkalan Data menggunakan Model Eloquent terspesialisasi di dalam teritori DeReporting.

## Changes
- Pembuatan 7 Model Master Data dengan kemampuan pelacakan hierarkis *(Bi-Directional Relational Links)*.
- Pendirian Model Pusat \`Internal\` sebagai muara *(Sink)* penghubung 8 dimensi tabel asing \`(foreignIds)\`.
- Pemutusan rantai perilaku Laravel *Default* melalui pendefinisian \`protected \$table = 'dr_*'\` di setiap objek kelas.

## Rules Compliance
- [x] Lolos Doktrin Keamanan *Model Binding* (Rule 1.3 & 3.7): Menganulir mutlak deklarasi sesat \`\$guarded = []\`. Seluruh objek model ini telah dilengkapi perisai baja \`\$fillable\` lapis demi lapis yang memisahkan secara tegas mana atribut input sistem dan atribut input publik.

Closes #78" \
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
Jaringan tabel DeReporting telah diciptakan. Saatnya membangkitkannya melalui pembuatan kelas *Eloquent ORM* berskala *Enterprise*. Ada 9 kelas yang harus dipahat dengan cermat dan teliti mengacu pada struktur tabel `dr_*` yang diisolasi ketat.

## Task

Kerjakan Issue #078 (Backend — DeReporting Models).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/078-backend-dereporting-models.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Mendaratlah di lokasi sasaran: `backend/app/Modules/DeReporting/Models/`.
3. Pahat Model Utama (`Internal.php` dan `JenisData.php`) persis sesuai templat yang ada di dokumen.
4. Jangan berhenti! Gunakan logikamu untuk menyusun 7 Model lainnya (`Tahun`, `Bidang`, `Koordinator`, `Anggaran`, `Jenis`, `Kategori`, `Ekternal`) dengan struktur dan perisai relasi ORM yang senada dan serasi.
5. Perhatikan deklarasi rute *(Namespace)* di baris paling atas agar tidak nyasar ke benua lain!
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
