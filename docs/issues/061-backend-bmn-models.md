# Issue #061 — Backend — BMN Models (Konektivitas Relasional Eloquent)

> **Type**: `feature`
> **Labels**: `backend`, `models`, `module-bmn`
> **Priority**: 🔴 Critical (Pemetaan Interaksi Objek Data Aset)
> **Complexity**: 🟡 Medium (Pengaturan Relasi 4 Arah & Validasi Aturan 1.3)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #060, Issue #023 (Tabel Kepegawaian)

---

## Branch

```
issue/061-backend-bmn-models
```

## Deskripsi

Setelah Tabel (*Migration*) sukses dicetak di Issue 060, *Database* tetaplah sebuah gudang bisu. Ia baru bisa dipanggil, diajak bicara, difilter, dan diubah melalui sistem kelas penghubung di Laravel yang kita sebut dengan **Eloquent Models**.

Pada **Issue #061** ini, kita akan meniupkan ruh kehidupan ke dalam 4 entitas BMN yang baru saja kita bentuk. 

Tugas ini **DIWAJIBKAN MUTLAK** mematuhi **Project Rule 1.3**: *Jangan pernah gunakan `$guarded = []` — harus pakai `$fillable`*. Ini mencegah celah kerentanan *Mass Assignment Vulnerability*, di mana *hacker* iseng menyisipkan field ekstra di *Form* untuk mengubah data yang bukan haknya.

Fitur kunci yang kita suntikkan di model-model ini:
1. Dukungan *Primary Key* tipe **UUID** secara otomatis.
2. Fitur Anti-Hapus (*SoftDeletes*) khusus untuk master `Asset`.
3. Pendefinisian Relasi *One-to-Many* (1 Aset punya banyak riwayat service, 1 Aset punya banyak riwayat dipinjam).
4. Penyeberangan Lintas-Modul menuju kelas `Employee` milik Modul Kepegawaian (Fase 2).

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Bmn/Models/`.
- [ ] Tersedia Model Utama `Asset` dengan definisi atribut pelindung `$fillable` lengkap.
- [ ] Tersedia Model `AssetLoan`, `AssetMaintenance`, dan `AssetUpdate`.
- [ ] Seluruh kelas memakai fungsi internal bawaan `HasUuids` *(Bukan Str::uuid manual)*.
- [ ] Terdapat relasi (*Relationships*) yang saling terhubung antar kelas.

---

## Panduan Implementasi Cerdas

Siapkan rumah bagi entitas aset ini:
```bash
mkdir -p backend/app/Modules/Bmn/Models
```

Rangkailah ke-empat penjaga data ini satu per satu:

### 1. Sang Induk: Asset (Asset.php)
**Path:** `backend/app/Modules/Bmn/Models/Asset.php`

```php
<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Modules\Kepegawaian\Models\Employee;

class Asset extends Model
{
    // Mengaktifkan UUID dan Pelindung Anti-Hapus Permanen
    use HasUuids, SoftDeletes;

    protected $table = 'bmn_assets';

    // Mematuhi RULE 1.3: Definisi eksplisit kolom yang boleh diisi
    protected $fillable = [
        'kode_barang',
        'nup',
        'nama_barang',
        'merk_tipe',
        'tahun_perolehan',
        'kondisi',
        'nilai_perolehan',
        'nilai_buku',
        'lokasi_spesifik',
        'employee_id',
        'foto_url',
        'keterangan'
    ];

    // Mengkonversi tipe data angka panjang di Database menjadi desimal bersih di aplikasi
    protected $casts = [
        'nilai_perolehan' => 'decimal:2',
        'nilai_buku' => 'decimal:2',
        'tahun_perolehan' => 'integer'
    ];

    /**
     * RELASI 1: Lintas Modul ke Tabel Pegawai (Siapa Pemegang Aset Ini)
     */
    public function penanggungJawab()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    /**
     * RELASI 2: Satu Aset punya banyak sejarah peminjaman
     */
    public function loans()
    {
        return $this->hasMany(AssetLoan::class, 'asset_id');
    }

    /**
     * RELASI 3: Satu Aset punya banyak riwayat perbaikan/servis
     */
    public function maintenances()
    {
        return $this->hasMany(AssetMaintenance::class, 'asset_id');
    }

    /**
     * RELASI 4: Satu Aset punya banyak riwayat perubahan buku audit
     */
    public function historyUpdates()
    {
        return $this->hasMany(AssetUpdate::class, 'asset_id');
    }
}
```

### 2. Buku Peminjaman (AssetLoan.php)
**Path:** `backend/app/Modules/Bmn/Models/AssetLoan.php`

```php
<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Modules\Kepegawaian\Models\Employee;

class AssetLoan extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_loans';

    protected $fillable = [
        'asset_id',
        'employee_id',
        'tanggal_pinjam',
        'tanggal_kembali',
        'status',
        'keterangan'
    ];

    protected $casts = [
        'tanggal_pinjam' => 'date',
        'tanggal_kembali' => 'date'
    ];

    // Relasi balik ke Aset Master
    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    // Relasi ke Si Peminjam (Modul Silang)
    public function borrower()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
```

### 3. Buku Perbaikan (AssetMaintenance.php)
**Path:** `backend/app/Modules/Bmn/Models/AssetMaintenance.php`

```php
<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AssetMaintenance extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_maintenances';

    protected $fillable = [
        'asset_id',
        'tanggal_service',
        'biaya',
        'deskripsi',
        'bukti_nota_url'
    ];

    protected $casts = [
        'tanggal_service' => 'date',
        'biaya' => 'decimal:2'
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }
}
```

### 4. Intelijen Nilai (AssetUpdate.php)
**Path:** `backend/app/Modules/Bmn/Models/AssetUpdate.php`

```php
<?php

namespace App\Modules\Bmn\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Models\User;

class AssetUpdate extends Model
{
    use HasUuids;

    protected $table = 'bmn_asset_updates';

    protected $fillable = [
        'asset_id',
        'user_id',
        'field_changed',
        'old_value',
        'new_value',
        'alasan_perubahan'
    ];

    public function asset()
    {
        return $this->belongsTo(Asset::class, 'asset_id');
    }

    // Siapa Admin yang bertanggung jawab mengganti nilai
    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
```

---

## Troubleshooting

### Q: Apa fungsi `$casts = ['nilai_perolehan' => 'decimal:2']`? Kenapa tidak dibiarkan kosong?

**Artinya:** Penyeragaman Tipe Data (*Data Type Consistency*).
**Solusi:** Ketika data raksasa ditarik dari *PostgreSQL*, angka jutaan (*Decimal*) kadang dikembalikan sebagai tipe *String* (Teks) di sisi PHP. Hal ini berbahaya jika *Frontend* memerlukannya untuk proses pertambahan/matematika grafis. Dengan mendeklarasikan tipe *Casting* ini, *Model Laravel* secara otomatis akan memaksa data tersebut berwujud *Number* desimal berpresisi 2 angka di belakang koma ketika diubah menjadi JSON, menghemat kerja *Frontend*.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): instantiating strictly-bound eloquent relational models for asset matrices" \
  --body "Merakit otak relasional Modul BMN di atas pondasi Migrasi Issue 060. Mengunci ketat skema melalui Aturan 1.3 (Fillable Only) dan implementasi Auto-Casting tingkat akuntansi. Detail di docs/issues/061-backend-bmn-models.md" \
  --label "backend,models,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/061-backend-bmn-models
```

### Step 3: Kerjakan

Salin 4 kelas Entitas di atas, pastikan direktori `backend/app/Modules/Bmn/Models` menjadi rumahnya yang pas. Jangan sampai kamu tak sengaja menaruh model di luar struktur modular (`backend/app/Models` adalah lokasi terlarang untuk BMN!).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): instantiating strictly-bound eloquent relational models for asset matrices (#61)"
git push -u origin issue/061-backend-bmn-models
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): instantiating strictly-bound eloquent relational models for asset matrices (#61)" \
  --body "## Summary
Penghidupan lapisan Model Eloquent guna membungkus skema matriks Barang Milik Negara. 

## Changes
- Penciptaan wujud aktif \`Asset\`, \`AssetLoan\`, \`AssetMaintenance\`, dan \`AssetUpdate\`.
- Penerapan fungsi *Trait* UUID \`HasUuids\` serta skema perlindungan mutlak \`SoftDeletes\` pada *Model Induk*.
- Pendefinisian Relasi *One-to-Many* serta jembatan *Cross-Module* mendarat di kelas \`Employee\`.

## Rules Compliance
- [x] Lolos eksekusi kebersihan kode tingkat tinggi terhadap Project Rule 1.3: Diharamkannya manipulasi lewat celah \`\$guarded = []\` dan ditegakkannya rezim \`\$fillable\` secara merata.

Closes #61" \
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
Modul raksasa Barang Milik Negara (BMN) telah memiliki struktur Database kosong (Issue 060). Saatnya membungkus jiwa mereka menggunakan fungsi *Relational Model* Laravel.

## Task

Kerjakan Issue #061 (Backend — BMN Models).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/061-backend-bmn-models.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Susupkan ke-4 desain kelas PHP di dalam `backend/app/Modules/Bmn/Models/`.
3. Pahat kode `Asset.php`, `AssetLoan.php`, `AssetMaintenance.php`, dan `AssetUpdate.php` secara presisi tanpa mengganti penamaan properti di dalam `$fillable`.
4. Beri perhatian ekstra pada baris `use App\Modules\Kepegawaian\Models\Employee` untuk relasi penyeberangan modulnya.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
