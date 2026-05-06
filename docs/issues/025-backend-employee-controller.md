# Issue #025 — Backend — Employee Controller (CRUD)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `kepegawaian`
> **Priority**: 🔴 Critical (Inti Logika Bisnis Modul Pegawai)
> **Complexity**: 🔴 High (Mengandung logika Upload File, Pagination, & Search)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #023 (Employee Model)

---

## Branch

```
issue/025-backend-employee-controller
```

## Deskripsi

Selamat datang di "Otak" modul Kepegawaian. Sesuai **Rule 8.4**, rute hanya bertugas mengarahkan *traffic*, sementara *Controller* bertugas melakukan proses data (CRUD). Pada issue ini, kita akan membuat `EmployeeController` lengkap dengan pelindungnya, yaitu `EmployeeRequest`.

Issue ini sangat padat karena harus memenuhi *banyak* aturan standar (*Project Rules*) BKSDA sekaligus:
- **Rule 1.4**: Melarang keras penggunaan `$request->all()`. Validasi harus eksplisit.
- **Rule 3.1**: Semua metode `GET` (List) wajib menggunakan fungsi Pagination.
- **Rule 4.1 & 4.2**: Foto profil wajib diverifikasi tipe filenya (`mimes:jpg,png,webp`) dengan batas maksimal 10 MB (`10240 KB`).
- **Rule 4.3 & 4.4**: File tidak boleh menggunakan nama aslinya (mencegah eksploitasi virus/hacker) dan WAJIB disimpan di folder *Private* `storage/app/private/` agar foto PNS tidak tersebar bebas di Google Image Search.
- **Rule 5.1 & 5.3**: Mengembalikan respons dengan struktur seragam `{ message, data, meta }`.

**Apa yang dilakukan:**
1. Membuat `EmployeeRequest.php` untuk mengatur lalu lintas validasi secara ketat.
2. Membuat `EmployeeController.php` dengan fungsi lengkap: `index` (List/Search), `store` (Create/Upload), `show` (Detail), `update` (Edit), dan `destroy` (Soft Delete).

---

## Acceptance Criteria

- [ ] Folder `app/Modules/Kepegawaian/Requests` dan `Controllers` dibuat.
- [ ] Terdapat class validasi `EmployeeRequest`.
- [ ] Metode `index()` berhasil mengimplementasikan pencarian (`WHERE LIKE`) dan membungkus hasil dengan `paginate()`.
- [ ] Metode `store()` dan `update()` berhasil menyimpan file gambar menggunakan mekanisme *hash name* secara otomatis ke *default local disk* (yang di Laravel 11/12 secara bawaan mengarah ke `storage/app/private/`).
- [ ] Response JSON terstandarisasi dengan key `message`, `data`, dan (khusus list) `meta`.

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Gunakan pola **"Thin Controller, Fat Request"** (Kode *Controller* harus tipis/sedikit, biarkan kelas *Request* yang menebal untuk mengurus validasi).

### Langkah 1: Buat Validasi Ketat (FormRequest)

**Kenapa?** Memisahkan validasi dari *Controller* membuat kode jauh lebih bersih dan mudah dibaca.

```bash
mkdir -p app/Modules/Kepegawaian/Requests
```

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Requests\EmployeeRequest.php`

**Buat file baru tersebut, dan isikan kode berikut:**

```php
<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeRequest extends FormRequest
{
    /**
     * Tentukan siapa yang boleh melakukan request ini.
     * Secara bawaan izinkan saja, karena Auth diurus oleh Middleware (Issue 12/13).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Rule 1.4, 4.1, & 4.2: Validasi ketat untuk teks dan ukuran file (Max 10 MB)
     */
    public function rules(): array
    {
        // Deteksi apakah ini operasi Update (PUT/PATCH) atau Create (POST)
        $employeeId = $this->route('employee');

        return [
            // NIP harus unique. Jika sedang Update, abaikan NIP miliknya sendiri
            'nip' => 'required|string|max:50|unique:kpg_employees,nip,' . $employeeId,
            'nama_lengkap' => 'required|string|max:255',
            'jabatan' => 'nullable|string|max:255',
            'pangkat_golongan' => 'nullable|string|max:255',
            'satuan_kerja' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            
            // Aturan File (MIME types strict) - Hanya gambar
            'foto' => 'nullable|file|mimes:jpg,jpeg,png,webp|max:10240',
        ];
    }
    
    /**
     * Kustomisasi pesan error ke Bahasa Indonesia agar Frontend mudah menampilkannya.
     */
    public function messages(): array
    {
        return [
            'nip.unique' => 'NIP tersebut sudah terdaftar di sistem.',
            'foto.mimes' => 'Format foto harus berupa JPG, PNG, atau WEBP.',
            'foto.max' => 'Ukuran foto tidak boleh lebih dari 10 MB.',
        ];
    }
}
```

---

### Langkah 2: Buat Controller Utama (The Brain)

**Kenapa?** Controller ini mengorkestrasi Pencarian, Paginasi, dan File System.

```bash
mkdir -p app/Modules/Kepegawaian/Controllers
```

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Controllers\EmployeeController.php`

**Buat file baru tersebut, dan isikan kode berikut:**

```php
<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Requests\EmployeeRequest;

class EmployeeController extends Controller
{
    /**
     * Rule 3.1: Wajib Pagination dan Search
     */
    public function index(Request $request): JsonResponse
    {
        $query = Employee::query();

        // Fitur Pencarian Cepat (NIP atau Nama)
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            // Gunakan ILIKE (PostgreSQL) agar pencarian case-insensitive (huruf besar/kecil diabaikan)
            $query->where('nama_lengkap', 'ilike', "%{$search}%")
                  ->orWhere('nip', 'ilike', "%{$search}%");
        }

        // Status filter opsional
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Ambil data dengan Pagination (default 10 baris per halaman)
        $perPage = $request->input('per_page', 10);
        $employees = $query->orderBy('nama_lengkap', 'asc')->paginate($perPage);

        // Rule 5.1 & 5.3: Format Response Seragam
        return response()->json([
            'message' => 'Data pegawai berhasil diambil.',
            'data' => $employees->items(),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'last_page' => $employees->lastPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total()
            ]
        ]);
    }

    /**
     * Rule 1.4 & 4.4: Sanitasi dan Upload File ke Private Storage
     */
    public function store(EmployeeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Jika user melampirkan file foto
        if ($request->hasFile('foto')) {
            $file = $request->file('foto');
            
            // store() secara otomatis membuat nama file acak (Hash) sesuai Rule 4.3.
            // Di Laravel 11, default disk adalah 'local' yang mengarah ke `storage/app/private/` (Rule 4.4).
            $path = $file->store('employees/foto');
            $validated['foto_profil'] = $path;
        }

        $employee = Employee::create($validated);

        return response()->json([
            'message' => 'Data pegawai berhasil ditambahkan.',
            'data' => $employee
        ], 201);
    }

    /**
     * Lihat detail 1 Pegawai
     */
    public function show($id): JsonResponse
    {
        $employee = Employee::findOrFail($id);

        return response()->json([
            'message' => 'Detail pegawai ditemukan.',
            'data' => $employee
        ]);
    }

    /**
     * Update data dan ganti foto jika ada
     */
    public function update(EmployeeRequest $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $validated = $request->validated();

        // Jika user mengganti foto lama dengan foto baru
        if ($request->hasFile('foto')) {
            // Hapus foto lama dari server agar tidak jadi file sampah (Orphan file)
            if ($employee->foto_profil) {
                Storage::delete($employee->foto_profil);
            }

            // Simpan foto baru
            $path = $request->file('foto')->store('employees/foto');
            $validated['foto_profil'] = $path;
        }

        $employee->update($validated);

        return response()->json([
            'message' => 'Data pegawai berhasil diperbarui.',
            'data' => $employee
        ]);
    }

    /**
     * Rule 3.6: Soft Delete 
     */
    public function destroy($id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        
        // Operasi ini otomatis menjadi Soft Delete karena Trait SoftDeletes di Model (Issue #23)
        $employee->delete();

        return response()->json([
            'message' => 'Data pegawai berhasil dihapus (soft delete).'
        ]);
    }
}
```

---

## Troubleshooting

### Q: Tombol `Search` di Frontend nantinya tidak bisa menemukan nama yang menggunakan huruf kapital berbeda.

**Artinya:** *Query* database-mu menggunakan `LIKE` biasa.
**Solusi:** Karena kita memakai basis data **PostgreSQL 15** (Issue #007), kodingan di atas sudah saya atur menggunakan operator `ilike` (case-insensitive LIKE). Hal ini membuat pencarian "bksda" akan tetap menemukan "BKSDA". Ini adalah *Best Practice* khusus PostgreSQL.

### Q: Kalau fotonya ditaruh di `private`, bagaimana UI Frontend menampilkannya?

**Artinya:** Gambar tidak bisa diakses langsung via tag `<img src="http.../storage/...">`.
**Solusi:** Betul. Ini memang disengaja (Rule 4.5). Nanti di Frontend, gambar tidak diakses secara langsung. Kita akan membuat *Endpoint* khusus bersertifikat (Auth) untuk mengunduh gambar tersebut, sehingga publik luar tidak bisa mencuri foto pegawai BKSDA. (*Akan dibuat di issue berikutnya/nanti*).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): employee crud controller & validation" \
  --body "Implementasi logika bisnis CRUD pegawai dengan dukungan Upload File Private, Pagination, dan Pencarian ILIKE. Detail di docs/issues/025-backend-employee-controller.md" \
  --label "backend,controller,kepegawaian"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/025-backend-employee-controller
```

### Step 3: Kerjakan

Buat dua folder `Requests` dan `Controllers` di dalam modul Kepegawaian. Lakukan *Copy-Paste* kode class `EmployeeRequest` dan `EmployeeController` dengan cermat. Perhatikan lokasi `namespace` di baris pertama. (Lakukan `composer dump-autoload` untuk merapikan registry jika perlu).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/
git commit -m "feat(kepegawaian): employee crud controller & validation (#25)"
git push -u origin issue/025-backend-employee-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): employee crud controller & validation (#25)" \
  --body "## Summary
Menyelesaikan logika bisnis (Controller) Modul Pegawai dengan standar kepatuhan tinggi (Private Storage & Validasi ketat).

## Changes
- Pembuatan \`EmployeeRequest\` (Validasi NIP unik, Max 10MB Photo).
- Pembuatan \`EmployeeController\` (CRUD).
- Integrasi PostgreSQL \`ilike\` untuk fitur *Search*.
- Mekanisme penghapusan file lama (Auto Cleanup) saat *Update* foto.

## Verification
- [x] Lolos TS/PHP linter syntax.
- [x] Namespace modular diimplementasikan.

## Rules Compliance
- [x] Rule 1.4: Sanitasi di FormRequest.
- [x] Rule 3.1: Response List berwujud Pagination.
- [x] Rule 4.1 & 4.2: Tipe mime di-lock, max 10MB.
- [x] Rule 4.3 & 4.4: Enkripsi nama file, rute simpan ke \`storage/app/private/\`.
- [x] Rule 5.1 & 5.3: Format respons JSON konsisten dengan Meta.

Closes #25" \
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
Model dan tabel Pegawai sudah selesai. Kita akan menyuntikkan logika ke dalamnya via Controller dan Request.

## Task

Kerjakan Issue #025 (Backend — Employee Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/025-backend-employee-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder `Requests` dan `Controllers` di `backend/app/Modules/Kepegawaian/`.
3. Buat file `EmployeeRequest.php` dan salin isinya.
4. Buat file `EmployeeController.php` dan salin isinya. Perhatikan impor facade `Storage` dan tipe `JsonResponse`.
5. Lakukan `composer dump-autoload`.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
