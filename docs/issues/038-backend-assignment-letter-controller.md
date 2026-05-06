# Issue #038 — Backend — Assignment Letter Controller & Request

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `module-surattugas`
> **Priority**: 🔴 Critical (Mesin inti penggerak seluruh sirkulasi Surat Tugas)
> **Complexity**: 🔴 High (Transaksi Database kompleks, Sinkronisasi Pivot, dan Proteksi File Private)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #036, #037

---

## Branch

```
issue/038-backend-assignment-letter-controller
```

## Deskripsi

Dalam sistem negara, sebuah Surat Tugas (ST) tidak boleh dibuat atau dihapus secara sembarangan. Issue ini akan melahirkan otak pengawas (Controller) yang mengatur tata krama *Database* saat ST baru diciptakan, disetujui, atau dibuang ke tempat sampah.

Sesuai dengan *Project Rules* mutlak:
1. **Aturan Mutlak (Rule 1.4 & 4.1)**: Controller dilarang memakan `$request->all()`. Kita WAJIB memfilternya menggunakan perisai `AssignmentLetterRequest` (FormRequest). File ST yang boleh masuk hanyalah format `PDF` maksimal 10 MB.
2. **Aturan Storage (Rule 4.4)**: Berkas *file_surat* akan disimpan di brankas `storage/app/private/`. Ia tidak akan bocor ke web publik. Controller akan memiliki satu *Endpoint* gaib (`download`) untuk meloloskannya setelah melewati portal otentikasi.
3. **Database Rules (Rule 3.1 & 3.2)**: Saat Admin meminta daftar ST (Fungsi `index`), API wajib merespons dengan struktur Meta Pagination, dan harus mencegah beban *N+1* menggunakan instruksi Eager Loading `with('employees', 'creator')`.

---

## Acceptance Criteria

- [ ] File validasi `AssignmentLetterRequest.php` dibuat dengan aturan ketat untuk data *array pivot* (Pegawai & Perannya).
- [ ] File `AssignmentLetterController.php` dibuat, memuat fungsi `index` berbekal Pagination standar BKSDA (`{ data, meta }`).
- [ ] Fungsi `store` & `update` dipersenjatai perlindungan `DB::transaction()` saat membongkar-pasang data Personil di tabel Pivot.
- [ ] Fungsi `updateStatus` (Setuju/Tolak) dibuat terpisah untuk dipanggil oleh atasan/kepala.
- [ ] Fungsi `destroy` hanya bersifat *Soft Delete* (Rule 3.6), didampingi ketersediaan fungsi `restore` dan `forceDelete`.
- [ ] Tersedia fungsi `downloadPdf` khusus mengunduh berkas fisik secara aman (Authorization check).

---

## Langkah Demi Langkah

### Langkah 1: Bangun Tembok Validasi (Form Request)

**Kenapa?** Rule 1.4 mewajibkan semua *input user* disaring dan dimandikan sebelum boleh masuk ke dalam wilayah Controller.

1. Buka *Command Prompt / Terminal* Windows.
2. Arahkan ke folder Backend: `cd e:\bksda-superapp\backend`
3. Buat foldernya: `mkdir -p app/Modules/SuratTugas/Requests`

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Requests\AssignmentLetterRequest.php`

**Pahatkan skrip penjaga gerbang ini:**

```php
<?php

namespace App\Modules\SuratTugas\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssignmentLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Autentikasi diserahkan pada Middleware Route nanti
    }

    public function rules(): array
    {
        $rules = [
            'maksud_tujuan' => 'required|string|min:10',
            'dasar_hukum' => 'nullable|string',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'tempat_tujuan' => 'required|string|max:255',
            
            // Validasi Array Pasukan Pegawai (Minimal 1 orang harus berangkat)
            'employees' => 'required|array|min:1',
            'employees.*.id' => 'required|uuid|exists:kpg_employees,id',
            'employees.*.peran' => 'nullable|string|max:100',
        ];

        // Jika Request adalah POST (Pembuatan Baru) atau ada Lampiran File PDF
        if ($this->isMethod('post') || $this->hasFile('file_surat')) {
            // Rule 4.1 & 4.2: Strict PDF, Max 10MB
            $rules['file_surat'] = 'nullable|file|mimes:pdf|max:10240';
        }

        return $rules;
    }
    
    public function messages(): array
    {
        return [
            'employees.min' => 'Surat Tugas tidak sah jika tidak ada pegawai yang berangkat.',
            'tanggal_selesai.after_or_equal' => 'Tanggal kembali tidak boleh mendahului tanggal keberangkatan.',
            'file_surat.mimes' => 'Berkas pindaian surat wajib berformat PDF.',
            'file_surat.max' => 'Ukuran berkas PDF tidak boleh melebihi 10 Megabyte.'
        ];
    }
}
```

---

### Langkah 2: Rakit Otak Pengendali (Controller)

**Path:** `e:\bksda-superapp\backend\app\Modules\SuratTugas\Controllers\AssignmentLetterController.php`

**Buka/Buat file tersebut, dan turunkan seluruh instruksi logis di bawah ini:**

```php
<?php

namespace App\Modules\SuratTugas\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\SuratTugas\Models\AssignmentLetter;
use App\Modules\SuratTugas\Requests\AssignmentLetterRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Exception;

class AssignmentLetterController extends Controller
{
    /**
     * READ: Menarik daftar ST (Rule 3.1 & 3.2 Eager Loading & Pagination)
     */
    public function index(Request $request)
    {
        $query = AssignmentLetter::with(['creator:id,name', 'approver:id,name', 'employees:id,nama_lengkap']);
        
        // Fitur Pencarian berdasarkan Tempat atau Maksud
        if ($search = $request->query('search')) {
            $query->where('tempat_tujuan', 'ilike', "%{$search}%")
                  ->orWhere('maksud_tujuan', 'ilike', "%{$search}%");
        }

        // Filter berdasarkan Status (Misal Admin mau lihat yang 'pending' saja)
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Lihat Tempat Sampah (Trashed) jika diminta
        if ($request->query('trashed') === 'true') {
            $query->onlyTrashed();
        }

        $letters = $query->latest()->paginate(10);

        return response()->json([
            'data' => $letters->items(),
            'meta' => [
                'current_page' => $letters->currentPage(),
                'last_page' => $letters->lastPage(),
                'per_page' => $letters->perPage(),
                'total' => $letters->total(),
            ]
        ]);
    }

    /**
     * CREATE: Menyimpan Surat Tugas Baru (Transaction Safety)
     */
    public function store(AssignmentLetterRequest $request)
    {
        $validated = $request->validated();
        
        DB::beginTransaction();
        try {
            // 1. Ciptakan Cangkang Surat
            $surat = AssignmentLetter::create([
                'maksud_tujuan' => $validated['maksud_tujuan'],
                'dasar_hukum' => $validated['dasar_hukum'] ?? null,
                'tanggal_mulai' => $validated['tanggal_mulai'],
                'tanggal_selesai' => $validated['tanggal_selesai'],
                'tempat_tujuan' => $validated['tempat_tujuan'],
                'status' => 'pending', // Default saat diajukan
                'created_by' => auth()->id(), // Jejak Audit (Pembuat)
            ]);

            // 2. Format Array untuk Sinkronisasi Tabel Pivot
            $pivotData = [];
            foreach ($validated['employees'] as $emp) {
                $pivotData[$emp['id']] = ['peran' => $emp['peran'] ?? null];
            }
            $surat->employees()->sync($pivotData);

            // 3. Penanganan File PDF (Rule 4.4 & 4.5: Private Storage)
            if ($request->hasFile('file_surat')) {
                // Disimpan di `storage/app/private/surat_tugas/`
                $path = $request->file('file_surat')->store('private/surat_tugas');
                $surat->update(['file_surat_path' => $path]);
            }

            DB::commit();
            
            // Refresh model agar data relasi (Pivot) terbawa saat dirender di Frontend
            $surat->load('employees'); 

            return response()->json([
                'message' => 'Pengajuan Surat Tugas berhasil direkam.',
                'data' => $surat
            ], 201);
            
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Terjadi kegagalan sistem: ' . $e->getMessage()], 500);
        }
    }

    /**
     * APPROVAL: Persetujuan Atasan (Mengganti Status & Menarik Nomor Surat Resmi)
     */
    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected,completed',
            'nomor_surat' => 'nullable|string|unique:st_assignment_letters,nomor_surat,'.$id
        ]);

        $surat = AssignmentLetter::findOrFail($id);
        
        $surat->status = $request->status;
        $surat->approved_by = auth()->id(); // Jejak Audit (Penyetuju)
        
        // Biasanya Nomor Registrasi baru keluar setelah Kepala Setuju
        if ($request->has('nomor_surat')) {
            $surat->nomor_surat = $request->nomor_surat;
        }
        
        $surat->save();

        return response()->json([
            'message' => 'Status Surat Tugas telah diperbarui menjadi ' . strtoupper($request->status),
            'data' => $surat
        ]);
    }

    /**
     * DELETE: Pembuangan Surat ke Tempat Sampah (Soft Delete - Rule 3.6)
     */
    public function destroy(string $id)
    {
        $surat = AssignmentLetter::findOrFail($id);
        $surat->delete(); // Statusnya masih dipertahankan di database berkat trait SoftDeletes
        return response()->json(['message' => 'Dokumen dipindahkan ke Arsip Sampah.']);
    }

    /**
     * RESTORE: Menggali kembali Surat dari Tempat Sampah
     */
    public function restore(string $id)
    {
        $surat = AssignmentLetter::onlyTrashed()->findOrFail($id);
        $surat->restore();
        return response()->json(['message' => 'Dokumen berhasil dipulihkan.']);
    }

    /**
     * FILE SERVING: Akses unduh berkas Private secara aman (Rule 4.5)
     */
    public function downloadPdf(string $id)
    {
        $surat = AssignmentLetter::withTrashed()->findOrFail($id);
        
        if (!$surat->file_surat_path || !Storage::exists($surat->file_surat_path)) {
            return response()->json(['message' => 'Berkas PDF fisik tidak ditemukan di brankas server.'], 404);
        }
        
        return Storage::download($surat->file_surat_path, 'ST_BKSDA_' . ($surat->nomor_surat ?? 'Draft') . '.pdf');
    }
}
```

---

## Troubleshooting

### Q: IDE menggarisbawahi error `Class 'Storage' not found` atau `DB not found`.

**Artinya:** PHP gagal mendeteksi alat *Facades* dari Laravel.
**Solusi:** Pastikan kamu meletakkan kode `use Illuminate\Support\Facades\DB;` dan `use Illuminate\Support\Facades\Storage;` pada jejeran nama *import* di deretan paling atas (*Header File*).

### Q: Apa fungsi `DB::beginTransaction()`?

**Artinya:** Sabuk pengaman transaksi SQL tingkat korporat.
**Solusi:** Di dalam `store()`, kita menciptakan Surat Tugas, lalu merekatkan pegawai di tabel Pivot (dua operasi terpisah). Jika penulisan tabel Pivot gagal karena satu dan lain hal (misal UUID pegawai salah eja), `DB::rollBack()` akan menendang mundur *(membatalkan)* pembuatan surat tugas pertama. Jadi tidak akan pernah ada insiden "Surat Tugas Tanpa Personil" yang nyasar (*Orphan Data*) di dalam database pemerintah ini.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): assignment letter controller logic and request guards" \
  --body "Merancang Controller CRUD transaksi tingkat lanjut (Pivot Sync + File Upload) yang dilindungi oleh sistem sanitasi FormRequest. Detail di docs/issues/038-backend-assignment-letter-controller.md" \
  --label "backend,controller,module-surattugas"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/038-backend-assignment-letter-controller
```

### Step 3: Kerjakan

Salin kedua file *Controller* dan *FormRequest* ke dalam lokasi struktur Modul secara presisi sesuai instruksi langkah 1 dan langkah 2. Periksa kompatibilitas Namespace dan struktur penulisan objek Eager Loading (`with()`).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/SuratTugas/
git commit -m "feat(surat-tugas): assignment letter controller logic and request guards (#38)"
git push -u origin issue/038-backend-assignment-letter-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): assignment letter controller logic and request guards (#38)" \
  --body "## Summary
Penyematan inti logika pengajuan Surat Tugas, pemrosesan transaksi berelasi, pelacakan pembuat dokumen, dan pengamanan penarikan berkas.

## Changes
- Pembuatan filter sanitasi ganda di \`AssignmentLetterRequest\`.
- Implementasi fungsional \`AssignmentLetterController\` (index, store, updateStatus, destroy, restore, downloadPdf).

## Rules Compliance
- [x] Rule 1.4: Larangan \`\$request->all()\` dipatuhi secara mutlak.
- [x] Rule 3.1 & 3.2: Endpoint merender respons di dalam kurungan Meta Pagination, dengan performa tinggi via penyedotan \`Eager Loading\`.
- [x] Rule 4.4 & 4.5: Rute pelindung brankas penyimpanan \`private/\` terpasang secara rapi dan dipanggil via \`downloadPdf\`.

Closes #38" \
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
Modul persuratan negara tidak boleh dibuat tanpa Validasi kokoh dan mekanisme Transaction SQL untuk data Personil yang akan diberangkatkan. Kita butuh sebuah Controller mutakhir.

## Task

Kerjakan Issue #038 (Backend — Assignment Letter Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/038-backend-assignment-letter-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat sub-folder pelindung `backend/app/Modules/SuratTugas/Requests` dan ciptakan `AssignmentLetterRequest.php`. Salin kodingan perlindungan *MIME-Type* ke dalamnya.
3. Buat sub-folder otak utama `backend/app/Modules/SuratTugas/Controllers` dan ciptakan `AssignmentLetterController.php`.
4. Salin fungsi Transaksi `beginTransaction()`, penyimpanan File `Private`, dan Meta Pagination ke dalamnya.
5. Cek apakah ada impor *(use)* Facades seperti DB, Storage, Exception yang belum dipanggil di atasnya.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
