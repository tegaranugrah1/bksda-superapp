# Issue #026 — Backend — Employee Access Management

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `security`
> **Priority**: 🔴 Critical (Menentukan siapa yang boleh masuk dan apa yang boleh mereka lihat)
> **Complexity**: 🟡 Medium (Pembuatan/Update data pada tabel berbeda via Relasi)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #025 (Employee Controller)

---

## Branch

```
issue/026-backend-employee-access-controller
```

## Deskripsi

Tidak semua pegawai BKSDA (PNS/Honorer) diizinkan membuka aplikasi "SuperApp" ini. Dan kalaupun diizinkan, fitur yang bisa mereka buka harus dibatasi sesuai porsinya (misal: bagian gudang hanya bisa buka Inventory). 

Sesuai **Rule 6.1**, NIP Pegawai bertindak sebagai `username` untuk masuk ke aplikasi. Pada *issue* ini kita membuat *Controller* khusus bernama `EmployeeAccessController`. Controller ini berdiri sendiri (dipisah dari `EmployeeController` di Issue 25) karena *Access Management* merupakan ranah sensitif (Security/Auth) yang kelak hanya boleh diakses oleh *Super Admin*.

**Apa yang dilakukan:**
1. Menerima *request* untuk mengecek apakah seorang Pegawai (berdasarkan `ID`) sudah memiliki Akun User atau belum (`GET`).
2. Menerima *request* untuk Membuat Akun Baru (jika belum ada) ATAU Mengupdate Hak Akses (jika sudah ada) menggunakan `PUT`.
3. Memastikan bahwa **Rule 2.4** (Setiap user harus punya minimal 1 default module) terpenuhi melalui validasi *FormRequest*.

---

## Acceptance Criteria

- [ ] File validasi `EmployeeAccessRequest.php` berhasil dibuat.
- [ ] Terdapat aturan `access_modules` berwujud `array|min:1`.
- [ ] File `EmployeeAccessController.php` berhasil dibuat.
- [ ] Metode `update()` mampu membaca apakah pegawai tersebut sudah punya Akun (berdasarkan relasi NIP <-> Username). Jika belum, sistem membuatkan `User::create`. Jika sudah, sistem melakukan `update()`.
- [ ] Proses *reset password* didukung, yakni hanya di-update jika field `password` dikirim (tidak kosong).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Perhatikan bahwa *Controller* ini memodifikasi tabel `users`, meskipun ID rute yang dituju adalah milik tabel `kpg_employees`. Kita menggunakan "Jembatan Relasi" yang sudah kita rancang di Issue #023.

### Langkah 1: Buat Pelindung Validasi (FormRequest)

**Kenapa?** Keamanan nomor satu. Kita menolak siapapun yang mencoba memberi akses 0 modul, atau memberikan nama jabatan (Role) yang tidak wajar di luar standar BKSDA.

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Requests\EmployeeAccessRequest.php`

**Buat file baru tersebut, dan isikan kode berikut:**

```php
<?php

namespace App\Modules\Kepegawaian\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeAccessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Otorisasi dikunci di level Middleware Route nantinya
    }

    public function rules(): array
    {
        return [
            // Jabatan sistemik (Bukan jabatan fungsional instansi)
            'role' => 'required|string|in:super_admin,admin,user',
            
            // Rule 2.4: Wajib memiliki minimal 1 modul untuk diakses
            'access_modules' => 'required|array|min:1',
            'access_modules.*' => 'string',
            
            // Password bersifat opsional (hanya diisi jika membuat akun baru / mereset)
            // Panjang minimal 8 karakter demi keamanan dasar
            'password' => 'nullable|string|min:8',
        ];
    }

    public function messages(): array
    {
        return [
            'access_modules.min' => 'Pengguna wajib diberikan minimal 1 akses modul (contoh: dashboard).',
            'role.in' => 'Peran (Role) tidak valid.',
        ];
    }
}
```

---

### Langkah 2: Buat Controller Akses (Access Manager)

**Path:** `e:\bksda-superapp\backend\app\Modules\Kepegawaian\Controllers\EmployeeAccessController.php`

**Buat file baru tersebut, dan isikan kode berikut:**

```php
<?php

namespace App\Modules\Kepegawaian\Controllers;

use App\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use App\Modules\Kepegawaian\Models\Employee;
use App\Modules\Kepegawaian\Requests\EmployeeAccessRequest;

class EmployeeAccessController extends Controller
{
    /**
     * Mengecek status hak akses pegawai saat ini
     */
    public function show($id): JsonResponse
    {
        // Panggil pegawai beserta relasi 'user' nya (Logical Link NIP)
        $employee = Employee::with('user')->findOrFail($id);
        
        // Jika pegawai ini belum punya akun untuk login
        if (!$employee->user) {
            return response()->json([
                'message' => 'Pegawai ini belum memiliki akses ke aplikasi.',
                'data' => null
            ]);
        }
        
        // Jika sudah punya
        return response()->json([
            'message' => 'Data akses pegawai ditemukan.',
            'data' => [
                'username' => $employee->user->username,
                'role' => $employee->user->role,
                'access_modules' => $employee->user->access_modules,
            ]
        ]);
    }

    /**
     * Membuka blokir pintu / Mengubah wewenang Modul
     */
    public function update(EmployeeAccessRequest $request, $id): JsonResponse
    {
        $employee = Employee::findOrFail($id);
        $validated = $request->validated();
        
        $user = $employee->user;
        
        // SKENARIO A: Pegawai belum punya Akun, kita buatkan!
        if (!$user) {
            // Pembuatan akun perdana WAJIB diiringi pembuatan password
            if (empty($validated['password'])) {
                return response()->json([
                    'message' => 'Password wajib diisi untuk pembuatan akun baru.'
                ], 422);
            }
            
            // Rule 6.1: Hubungkan NIP Pegawai menjadi Username Aplikasi
            $user = User::create([
                'username' => $employee->nip, 
                'name' => $employee->nama_lengkap, // Salin nama agar bagus di Header Frontend
                'password' => $validated['password'], // Hash bcrypt otomatis diurus oleh model User (Rule 1.5)
                'role' => $validated['role'],
                'access_modules' => $validated['access_modules'],
            ]);
            
            $message = 'Akun akses berhasil diterbitkan.';
        } 
        
        // SKENARIO B: Pegawai sudah punya Akun, kita perbarui datanya
        else {
            $updateData = [
                'role' => $validated['role'],
                'access_modules' => $validated['access_modules'],
            ];
            
            // Jika dikirimi password (berarti admin ingin mereset password stafnya)
            if (!empty($validated['password'])) {
                $updateData['password'] = $validated['password'];
            }
            
            $user->update($updateData);
            $message = 'Data hak akses berhasil diperbarui.';
        }
        
        return response()->json([
            'message' => $message,
            'data' => [
                'username' => $user->username,
                'role' => $user->role,
                'access_modules' => $user->access_modules,
            ]
        ]);
    }
}
```

---

## Troubleshooting

### Q: Tombol simpan diklik, tapi muncul Error `Class "App\Models\User" not found`.

**Artinya:** Kamu lupa *import namespace* model User di bagian atas *Controller*.
**Solusi:** Pastikan baris `use App\Models\User;` sudah terpasang. Di Laravel 11/12, posisi bawaan model `User` tetap berada di folder root aplikasi (`app/Models/User.php`), tidak terganggu oleh sistem modular kita.

### Q: Kenapa *password* tidak perlu dibungkus fungsi `Hash::make()` pada *Controller* ini?

**Artinya:** Kamu khawatir *password* tersimpan polos (Plain-text) di database.
**Solusi:** Kekhawatiran yang wajar, tapi tidak perlu. Kita sudah menerapkan pola *Clean Code*. Jika kamu menengok file `User.php` bawaan Laravel 11 (atau yang sudah dimodifikasi pada Issue #009), Laravel menggunakan `protected function casts()` di mana `'password' => 'hashed'`. Ini berarti Laravel otomatis meng-*enkripsi* password apa pun tepat sebelum ia masuk ke basis data (Sesuai **Rule 1.5**).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(kepegawaian): employee access control manager" \
  --body "Pembuatan controller khusus untuk mengatur Role dan Modules (IAM) melalui Logical Link NIP ke tabel User. Detail di docs/issues/026-backend-employee-access-controller.md" \
  --label "backend,controller,security"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/026-backend-employee-access-controller
```

### Step 3: Kerjakan

Salin `EmployeeAccessRequest.php` ke folder `Requests` dan salin `EmployeeAccessController.php` ke folder `Controllers`. Tidak perlu mengetik ulang fungsi hash, fokus saja pada alur if-else penempatan akun.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/app/Modules/
git commit -m "feat(kepegawaian): employee access control manager (#26)"
git push -u origin issue/026-backend-employee-access-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(kepegawaian): employee access control manager (#26)" \
  --body "## Summary
Menambahkan manajer otorisasi yang memvalidasi *Single-Responsibility* Hak Akses terpisah dari CRUD utama.

## Changes
- Pembuatan \`EmployeeAccessRequest\` yang memaksa limit minimal *access_modules*.
- Skenario pembuatan akun baru secara *On-the-Fly* jika Relasi User belum ada.
- Skenario pengubahan struktur \`Role\` secara dinamis.

## Verification
- [x] Metode \`PUT\` membedakan perilaku *Create* vs *Update*.
- [x] Linter lolos.

## Rules Compliance
- [x] Rule 1.5: Sanitasi terjamin, Hash di-*delegate* ke sistem *Casts*.
- [x] Rule 2.4: \`min:1\` array ditaati.
- [x] Rule 6.1: Menancapkan \`username = nip\` saat akun terbentuk.

Closes #26" \
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
Pegawai bisa saja ditugaskan menjadi staf Gudang atau dihapus aksesnya. Endpoint ini menjadi panel kendali "Hak Veto" Super Admin.

## Task

Kerjakan Issue #026 (Backend — Employee Access Management).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/026-backend-employee-access-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Navigasi ke `backend/app/Modules/Kepegawaian/Requests` dan buat file `EmployeeAccessRequest.php` berisi validasi hak akses.
3. Buka folder `Controllers` dan buat file `EmployeeAccessController.php` menggunakan pola skenario pembuatan/pengubahan User secara simultan.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
