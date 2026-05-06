# Issue #081 — Backend — DeReporting Internal Controller (Brankas Laporan Rahasia Pegawai)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `module-dereporting`
> **Priority**: 🔴 Critical (Ruang Penyimpanan & Penarikan Berkas Utama BKSDA)
> **Complexity**: 🔴 High (Relasi 8 Cabang, Penyimpanan Privat, Otentikasi Berkas)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #080

---

## Branch

```
issue/081-backend-dereporting-internal-controller
```

## Deskripsi

Melompat ke **Issue #081** ini **AMAN** secara arsitektur! Kita telah membangun jaring relasi di Modul *DeReporting*, dan kini saatnya mendirikan Brankas Utamanya: **Internal Controller**.

Namun perhatikan satu hal: *Validasi Keamanan Formulir (Form Requests)* resmi dijadwalkan pada Issue 085. Oleh karena itu, pada Controller ini kita akan sementara menggunakan `Illuminate\Http\Request` bawaan, yang nanti akan ditingkatkan (*upgrade*) wujudnya pada fase Issue 085.

**Tugas Utama Internal Controller:**
Laporan Internal (*Internal Reports*) adalah laporan berjenjang yang diunggah oleh Pegawai BKSDA. Mereka memiliki keterikatan terhadap 8 tabel Master Data sekaligus. Kita harus mengajari Laravel cara menarik kedelapan relasi tersebut secara efisien tanpa membakar RAM server *(N+1 Query Problem)*.

**ATURAN MUTLAK (Project Rule 4.4, 4.5, & 3.2)**:
1. File unggahan PDF/Docx **HARAM** diletakkan di `public/`. Seluruh berkas Laporan Internal wajib dikubur di `storage/app/private/dereporting/internals/`.
2. Karena file bersifat privat, kita wajib menyediakan Endpoint Khusus (`downloadFile`) yang akan membukakan gembok *Storage* dan memuntahkan file tersebut hanya jika penembak API membawa Token *Auth*.
3. Wajib menggunakan `with([...])` (*Eager Loading*) saat memanggil daftar laporan untuk menghindari ledakan N+1 Kueri Database.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/DeReporting/Controllers/`.
- [ ] Tersedia `InternalController.php` dengan metode dasar CRUD (Create, Read, Update, Delete).
- [ ] Metode `index()` diwajibkan memuat 8 relasi: `uploader`, `tahun`, `bidang`, `jenis`, `kategori`, `jenisData`, `koordinator`, `anggaran` secara *Eager Loading*.
- [ ] Metode `store()` diwajibkan menyuntikkan ID pegawai secara otomatis dari tiket pengguna: `$request->user()->id`.
- [ ] Metode `store()` dan `update()` diwajibkan meretas nama asli file menjadi `UUID` secara acak untuk mencegah eksploitasi peretasan *Path Traversal*.
- [ ] Terdapat metode `downloadFile($id)` yang melayani streaming berkas dari direktori privat.

---

## Panduan Implementasi Cerdas

**Path:** `backend/app/Modules/DeReporting/Controllers/InternalController.php`

Tancapkan Fondasi Brankas Pengendali Internal ini ke dalam sistemmu:

```php
<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

// Panggil Model Internal (Pusat Gravitasi DeReporting)
use App\Modules\DeReporting\Models\Internal;

class InternalController extends Controller
{
    /**
     * GET /api/dereporting/internals
     * Membaca Daftar Laporan Internal (Wajib Pagination & Eager Loading)
     */
    public function index(Request $request)
    {
        // Sihir Eager Loading: Mencegah N+1 Database Explosion
        $query = Internal::with([
            'uploader:id,nama_lengkap,nip', // Hanya ambil nama/nip agar Payload tidak membengkak
            'tahun', 
            'bidang', 
            'jenis', 
            'kategori', 
            'jenisData', 
            'koordinator', 
            'anggaran'
        ])->latest();

        // Implementasi Fitur Pencarian Cerdas
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('judul_laporan', 'ilike', "%{$search}%")
                  ->orWhere('keterangan', 'ilike', "%{$search}%");
        }

        // Tembak menggunakan aturan Project Rule 3.1: Wajib Paging
        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/internals
     * Mengunggah Laporan Baru (Terkunci Auth)
     */
    public function store(Request $request)
    {
        // Catatan: Validasi Ekstrem akan diintegrasikan pada Issue 085 (FormRequests).
        // Untuk sekarang, kita lakukan validasi instan bawaan Laravel.
        $request->validate([
            'judul_laporan' => 'required|string|max:255',
            'tahun_id'      => 'required|uuid|exists:dr_tahun,id',
            'bidang_id'     => 'required|uuid|exists:dr_bidang,id',
            'jenis_id'      => 'required|uuid|exists:dr_jenis,id',
            'kategori_id'   => 'required|uuid|exists:dr_kategori,id',
            'jenis_data_id' => 'required|uuid|exists:dr_jenis_data,id',
            'file'          => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,zip,rar',
        ]);

        $filePath = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // Menghancurkan nama asli, menggantinya dengan Enkripsi Acak UUID (Rule 4.3)
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            // Mengubur file ke dalam Brankas Privat (Rule 4.4)
            $filePath = $file->storeAs('private/dereporting/internals', $filename);
        }

        $report = Internal::create([
            'user_id'        => $request->user()->id, // Diambil secara mutlak dari Token Auth, BUKAN dari Input!
            'tahun_id'       => $request->tahun_id,
            'bidang_id'      => $request->bidang_id,
            'jenis_id'       => $request->jenis_id,
            'kategori_id'    => $request->kategori_id,
            'jenis_data_id'  => $request->jenis_data_id,
            'koordinator_id' => $request->koordinator_id,
            'anggaran_id'    => $request->anggaran_id,
            'judul_laporan'  => $request->judul_laporan,
            'keterangan'     => $request->keterangan,
            'file_path'      => $filePath,
        ]);

        return response()->json([
            'message' => 'Laporan berhasil disandikan dan dikunci dalam brankas.',
            'data'    => $report
        ], 201);
    }

    /**
     * GET /api/dereporting/internals/{id}/download
     * Pintu Gaib Penyalur Berkas Rahasia (Private Streaming)
     */
    public function downloadFile(string $id)
    {
        $report = Internal::findOrFail($id);

        if (!$report->file_path || !Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas fisik tidak ditemukan di dalam brankas server.'], 404);
        }

        // Metode ini akan mengalirkan (Streaming) file langsung ke peramban 
        // pengguna tanpa membuka lokasi asli direktorinya ke publik.
        return Storage::download($report->file_path, $report->judul_laporan . '.' . pathinfo($report->file_path, PATHINFO_EXTENSION));
    }

    /**
     * DELETE /api/dereporting/internals/{id}
     * Menghapus Laporan Internal (SoftDeletes)
     */
    public function destroy(string $id)
    {
        $report = Internal::findOrFail($id);
        
        // Peringatan: Kita tidak menggunakan Storage::delete() karena ini SoftDeletes.
        // File fisik harus tetap tersimpan untuk keperluan Audit Forensik.
        $report->delete();

        return response()->json([
            'message' => 'Laporan telah ditarik dari peredaran publik (Archived).'
        ]);
    }
}
```

---

## Troubleshooting

### Q: Berkas yang saya unduh rusak atau ukurannya menjadi `0 bytes`!

**Artinya:** Mesin penyimpanan *Storage* Laravel kebingungan membaca direktori.
**Solusi:** Pastikan parameter di `.env` sudah menggunakan `FILESYSTEM_DISK=local`. Selain itu, kamu mungkin lupa menjalankan perintah dewa pembangun struktur penyimpanan: `php artisan storage:link`. Meski *private*, tautan *framework* tetap harus disambungkan secara virtual agar `Storage::download` mengenali *path* fisiknya.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): engineer internal report controller with secure private storage integration" \
  --body "Membangun *Controller* Raksasa untuk Tabel Laporan Internal. Mengamankan file unggahan dengan taktik *UUID Masking* dan menyimpannya di luar jangkauan publik *(Private Storage)*. Mengimplementasikan perlindungan kueri masif melalui \`with()\` *Eager Loading* untuk 8 rantai relasi serentak. Detail di docs/issues/081-backend-dereporting-internal-controller.md" \
  --label "backend,controller,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/081-backend-dereporting-internal-controller
```

### Step 3: Kerjakan

Pahat `InternalController.php` di dalam direktorinya. Pahami struktur penamaan *File* yang dienkripsi UUID (`Str::uuid()`) di fungsi `store()`. Ini adalah teknik andalan untuk mencegah serangan penyusupan peladen *(Server Intrusion/Path Traversal)*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): engineer internal report controller with secure private storage integration (#81)"
git push -u origin issue/081-backend-dereporting-internal-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): engineer internal report controller with secure private storage integration (#81)" \
  --body "## Summary
Pembangkitan Brankas Penyimpanan *(Storage Vault Controller)* untuk Sistem Pelaporan Internal BKSDA.

## Changes
- Pembuatan fungsi \`index()\` berkaliber tinggi yang memuat 8 lapis data Master serentak via *Eager Loading*, membunuh mutlak fenomena ledakan N+1 Query.
- Isolasi berkas PDF/Excel fisik menuju \`storage/app/private\` dengan menindas nama asli file menggunakan teknik Acak \`UUID Masking\`.
- Penerapan Rute Unduhan Tertutup (\`downloadFile\`) sebagai pintu akses eksklusif via *Bearer Token*, menolak keras akses file melalui tautan langsung (Direct Link).

## Rules Compliance
- [x] Lolos Doktrin Ekstraksi Relasional (Project Rule 3.2 & 4.4): Seluruh relasi dibungkus rapi untuk memangkas *Payload*, dan seluruh fisik *File Upload* disembunyikan sepenuhnya dari indeksasi eksternal *Public Storage*.

Closes #81" \
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
Modul DeReporting harus bisa menerima file dari Pegawai dan menyembunyikannya dari publik. Kita akan merancang Controller Utamanya (`InternalController`). Perhatikan dengan seksama fungsi Eager Loading dan File Upload UUID Masking.

## Task

Kerjakan Issue #081 (Backend — DeReporting Internal Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/081-backend-dereporting-internal-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turunlah ke wilayah `backend/app/Modules/DeReporting/Controllers/`.
3. Pahat kelas `InternalController.php` sesuai Cetak Biru di atas.
4. Perhatikan baik-baik fungsi `index()`. Pastikan kedelapan nama relasi (`uploader`, `tahun`, `bidang`, dll) ditulis identik dengan fungsi `belongsTo` yang ada di Model `Internal.php` (Issue 078)!
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
