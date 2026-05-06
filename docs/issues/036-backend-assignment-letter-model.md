# Issue #036 — Backend — Assignment Letter Models

> **Type**: `feature`
> **Labels**: `backend`, `database`, `module-surattugas`
> **Priority**: 🔴 Critical (Menyuntikkan nyawa/logika ORM pada kerangka tabel)
> **Complexity**: 🟡 Medium (Many-to-Many Relationships & Pivot Customization)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / GPT-4o-mini
> **Dependencies**: Issue #035 (Migration Surat Tugas)

---

## Branch

```
issue/036-backend-assignment-letter-model
```

## Deskripsi

Setelah batu bata *Database* disusun di Issue 035, kita perlu menancapkan otak cerdasnya (*Eloquent ORM Model*). Sesuai dengan hukum Clean Code Laravel tingkat lanjut, sebuah *Model* bukanlah sekadar pendefinisi isi tabel (`$fillable`), tetapi ia merupakan Peta Relasi (*Map of Relationships*).

Pada spesifikasi ini, kita akan:
1. **Aturan Mutlak (Rule 1.3)**: Memakai daftar atribut pelindung `$fillable` yang eksplisit. Dilarang keras memakai `$guarded = []`.
2. **Casting Cerdas**: Laravel harus tahu bahwa kolom `tanggal_mulai` dan `tanggal_selesai` adalah berwujud kalender (`date`), sehingga kelak *Frontend* bisa menampilkannya dengan format *Carbon* yang memukau tanpa harus pusing me-*parsing* String.
3. **Penyatuan Benua (Cross-Domain Relational)**: Membuat jembatan relasi *Many-to-Many* raksasa antara Entitas *Surat Tugas* dan Entitas *Pegawai (Modul Kepegawaian)* lengkap dengan penyertaan muatan ekstra gerbong pivot (`->withPivot('peran')`).

---

## Acceptance Criteria

- [ ] File model induk `AssignmentLetter.php` dibuat di dalam kerangka struktur Modular Surat Tugas.
- [ ] Menggunakan konfigurasi pengenal otomatis `HasUuids` dan `SoftDeletes`.
- [ ] Tersedia jembatan ke tabel `User` melalui fungsi relasi `creator()` dan `approver()`.
- [ ] Tersedia jembatan relasi hibrid `employees()` yang membidik kelas model Eksternal (`App\Modules\Kepegawaian\Models\Employee`) dengan menarik atribut kolom pivot `peran`.
- [ ] (Opsional tapi elegan) File model `AssignmentLetterEmployee.php` dibuat dengan kelas ekstensi `Pivot` agar siap digunakan untuk skenario operasi kompleks di masa mendatang.

---

## Langkah Demi Langkah

### Langkah 1: Buat Direktori Model Surat Tugas

```bash
mkdir -p backend/app/Modules/SuratTugas/Models
```

### Langkah 2: Rakit Model Induk `AssignmentLetter`

Ini adalah jantung dari arsitektur birokrasi aplikasi kita. Seluruh transaksi penugasan akan bermuara pada *Class* ini.

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Models\AssignmentLetter.php`

**Ciptakan file baru di atas dan pahatkan mahakarya kode ini:**

```php
<?php

namespace App\Modules\SuratTugas\Models;

use App\Models\User;
use App\Modules\Kepegawaian\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AssignmentLetter extends Model
{
    // Mengaktifkan UUID sebagai Primary Key dan fitur Anti-Kiamat (SoftDeletes)
    use HasUuids, SoftDeletes;

    // Kunci target tabel
    protected $table = 'st_assignment_letters';

    // RULE 1.3: Dilarang menggunakan $guarded
    protected $fillable = [
        'nomor_surat',
        'dasar_hukum',
        'maksud_tujuan',
        'tanggal_mulai',
        'tanggal_selesai',
        'tempat_tujuan',
        'status',
        'file_surat_path',
        'created_by',
        'approved_by',
    ];

    // Mengubah String Mentah DB menjadi Objek Tanggal yang lezat dikelola
    protected $casts = [
        'tanggal_mulai' => 'date',
        'tanggal_selesai' => 'date',
    ];

    /**
     * RELASI 1: Sang Pembuat Konsep Surat (Bisa Admin / Operator)
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * RELASI 2: Sang Penyetuju Legalitas (Misal: Kepala Balai)
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * RELASI 3: Pasukan Pegawai yang Bertugas (Many-to-Many Lintas Modul)
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(
            Employee::class,
            'st_assignment_letter_employees', // Nama tabel jembatan (Pivot)
            'assignment_letter_id',           // Kait untuk mengunci Model ini
            'employee_id'                     // Kait untuk mengunci Model sasaran (Pegawai)
        )
        ->using(AssignmentLetterEmployee::class) // Memakai Model Pivot khusus
        ->withPivot('peran')                     // Jangan lupakan kolom Peran (Ketua/Anggota)
        ->withTimestamps();                      // Rekam jejak waktu kapan pegawai dimasukkan
    }
}
```

---

### Langkah 3: Siapkan Agen Pivot Khusus (Best Practice)

Meski Laravel bisa menciptakan jembatan siluman *Many-to-Many* secara gaib (tanpa membuat file), kelas aplikasi *Enterprise* yang rapi biasanya mewajibkan adanya berkas perwakilan tabel Pivot untuk mengantisipasi kejadian rumit.

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Models\AssignmentLetterEmployee.php`

**Buat berkas tersebut lalu tuliskan ekstensi `Pivot` ini:**

```php
<?php

namespace App\Modules\SuratTugas\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class AssignmentLetterEmployee extends Pivot
{
    protected $table = 'st_assignment_letter_employees';

    // Karena id di Pivot menggunakan standard auto-increment integer, pastikan disetel True
    public $incrementing = true;
}
```

Selesai. Struktur anatomi logika (Data Models) untuk Modul Surat Tugas telah siap untuk diperintah oleh Pasukan *Controllers* esok hari.

---

## Troubleshooting

### Q: Muncul peringatan *Class 'App\Modules\Kepegawaian\Models\Employee' not found* di `AssignmentLetter.php`.

**Artinya:** Modul lintas departemenmu terputus alias file referensinya tidak ada.
**Solusi:** Kemungkinan besar saat mengerjakan Fase 2 dulu lokasinya ada yang *typo*. Pastikan *Path* impor target *Namespace* tersebut valid dan mengarah tepat pada model yang kita buat di Issue #023. Jika peringatannya dari ekstensi IDE seperti Intelephense, silakan eksekusi `composer dump-autoload`.

### Q: Kenapa repot-repot menyambung Model User juga di dalamnya (`creator` dan `approver`)?

**Artinya:** Keamanan Lacak Balik (Audit Trail).
**Solusi:** Sebuah surat bernilai hukum negara tidak boleh diterbitkan oleh hantu. Sewaktu sistem menelusuri siapa yang menekan tombol *Approve* (Setuju) di *Frontend*, kita bisa langsung memanggil `$surat->approver->name` tanpa perlu melakukan pencarian SQL kotor secara manual.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): eloquent ORM relationships for assignment letters" \
  --body "Membangun struktur model Eloquent dengan dukungan SoftDeletes, Casts penanggalan, dan pemetaan Many-to-Many via kelas Pivot. Detail di docs/issues/036-backend-assignment-letter-model.md" \
  --label "backend,database,module-surattugas"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/036-backend-assignment-letter-model
```

### Step 3: Kerjakan

Salin kedua baris koding model tersebut ke dalam folder lokasinya secara tepat dan periksa *namespace*-nya.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/SuratTugas/
git commit -m "feat(surat-tugas): eloquent ORM relationships for assignment letters (#36)"
git push -u origin issue/036-backend-assignment-letter-model
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): eloquent ORM relationships for assignment letters (#36)" \
  --body "## Summary
Penyelesaian pemasangan otak relasional untuk Modul ST dengan mematuhi hierarki isolasi model dan *Clean API Mapping*.

## Changes
- Penciptaan \`AssignmentLetter.php\`.
- Penciptaan \`AssignmentLetterEmployee.php\` sebagai *Extends Pivot*.

## Rules Compliance
- [x] Rule 1.3: Penguncian absolut menggunakan parameter \`\$fillable\`, bukan pengabaian kotor melalui \`\$guarded\`.
- [x] Lintas Modul: Sukses menembus demarkasi modul menargetkan \`kpg_employees\` tanpa merusak isolasi arsitektur.

Closes #36" \
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
Struktur migrasi Database untuk Surat Tugas (Phase 3) sudah ada, kita butuh Model Eloquent yang memetakan kerumitan relasinya.

## Task

Kerjakan Issue #036 (Backend — Assignment Letter Models).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/036-backend-assignment-letter-model.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat direktori sub-sistem baru `backend/app/Modules/SuratTugas/Models`.
3. Ciptakan `AssignmentLetter.php` di dalamnya dan terapkan `fillable`, `HasUuids`, `SoftDeletes`, dan relasi `BelongsToMany` yang bersarang.
4. Ciptakan `AssignmentLetterEmployee.php` dan pastikan dia mewarisi/meng-*extends* class `Pivot`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
