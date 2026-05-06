# Issue #083 — Backend — DeReporting Operator Controller (Sistem Pendelegasian Wewenang)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `iam`, `module-dereporting`
> **Priority**: 🔴 Critical (Menyekat Akses Laporan Berdasarkan Wilayah/Bidang Kerja)
> **Complexity**: 🟢 Simple (Manipulasi Model Pusat `User` Tanpa Perlu Tabel Baru)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Keseluruhan Issue DeReporting Sebelumnya (077 - 082)

---

## Branch

```
issue/083-backend-dereporting-operator-controller
```

## Deskripsi

Melompat ke **Issue #083** adalah langkah yang **SANGAT AMAN** dan justru membuktikan kegeniusan desain Arsitektur (IAM) Otentikasi kita di awal proyek (Fase 1)! 🧠💡

Sebagian besar programmer junior akan membuat tabel baru bernama `dr_operators` di dalam *Database* DeReporting. Hal itu akan menciptakan kekacauan Sinkronisasi Data Pegawai ganda. 

Kita telah jauh berpikir ke depan. Pada Issue 009 (Tabel `users`), kita telah menyuntikkan kolom `dereporting_role` dan `dereporting_bidang_id`. Maka, untuk mengelola Operator Laporan, kita sama sekali tidak butuh *Migration* atau *Model* baru! Pengendali ini cukup memanggil kelas sakral `App\Models\User` dan memanipulasi kedua atribut tersebut.

**Fungsi Utama Operator Controller:**
- Menugaskan seorang Pegawai biasa menjadi **Operator Khusus**.
- Mengunci pandangan sang Operator agar ia HANYA BISA melihat dan menyetujui Laporan yang masuk ke dalam `bidang_id` miliknya (Misal: Operator Bidang Konservasi tidak bisa membuka laporan Bidang Kehutanan).

---

## Acceptance Criteria

- [ ] Folder Modul sudah ada: `backend/app/Modules/DeReporting/Controllers/`.
- [ ] Tersedia berkas `OperatorController.php`.
- [ ] Terdapat metode `index()` yang HANYA memanggil data `User` dengan syarat `dereporting_role = 'operator'`.
- [ ] Terdapat metode `store()` yang merubah *(Promote)* seorang `User` biasa menjadi Operator dengan mengisi ID Bidang tugasnya.
- [ ] Terdapat metode `destroy()` yang memecat *(Demote)* seorang Operator kembali menjadi Pegawai biasa (bukan menghapus *User* dari *Database*).

---

## Panduan Implementasi Cerdas

**Path:** `backend/app/Modules/DeReporting/Controllers/OperatorController.php`

Tuliskan Surat Perintah Penugasan *(Controller)* yang elegan ini:

```php
<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

// KUNCI ARSITEKTUR: Kita memanggil Model Pusat IAM, bukan model DeReporting!
use App\Models\User;
use App\Modules\DeReporting\Models\Bidang;

class OperatorController extends Controller
{
    /**
     * GET /api/dereporting/operators
     * Menampilkan daftar Pegawai yang telah diangkat menjadi Operator Laporan
     */
    public function index(Request $request)
    {
        // 1. Ambil HANYA User yang memiliki jabatan Operator DeReporting
        // 2. Gunakan Eager Loading (with) untuk menempelkan nama Bidang tugasnya
        $query = User::where('dereporting_role', 'operator')
                     ->with('dereportingBidang:id,nama') // Asumsi fungsi relasi 'dereportingBidang' ada di Model User
                     ->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('name', 'ilike', "%{$search}%")
                  ->orWhere('username', 'ilike', "%{$search}%");
        }

        // Project Rule 3.1: Wajib Paging
        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/operators
     * Mengangkat Pegawai Menjadi Operator Bidang
     */
    public function store(Request $request)
    {
        // Validasi: Pastikan User ID dan Bidang ID benar-benar eksis di Database
        $request->validate([
            'user_id'   => 'required|uuid|exists:users,id',
            'bidang_id' => 'required|uuid|exists:dr_bidang,id',
        ]);

        $user = User::findOrFail($request->user_id);

        // Manuver Promosi Jabatan (Promote)
        $user->update([
            'dereporting_role'      => 'operator',
            'dereporting_bidang_id' => $request->bidang_id,
        ]);

        return response()->json([
            'message' => "Pegawai {$user->name} berhasil diangkat menjadi Operator Laporan.",
            'data'    => $user
        ], 201);
    }

    /**
     * PUT /api/dereporting/operators/{id}
     * Memutasi (Memindah) Operator ke Bidang Lain
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'bidang_id' => 'required|uuid|exists:dr_bidang,id',
        ]);

        $user = User::findOrFail($id);
        
        // Peringatan Keamanan: Pastikan yang diupdate memang benar seorang operator
        if ($user->dereporting_role !== 'operator') {
            return response()->json(['message' => 'Pegawai ini bukan seorang operator.'], 403);
        }

        $user->update([
            'dereporting_bidang_id' => $request->bidang_id,
        ]);

        return response()->json([
            'message' => "Wilayah tugas Operator {$user->name} berhasil dimutasi.",
            'data'    => $user
        ]);
    }

    /**
     * DELETE /api/dereporting/operators/{id}
     * Mencabut Jabatan Operator (Pemecatan Damai)
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);

        // Manuver Pemecatan (Demote): Kembalikan ke titik Nol (Null)
        // Kita TIDAK BOLEH memanggil $user->delete() karena itu akan menghapus Pegawai tersebut dari BKSDA!
        $user->update([
            'dereporting_role'      => null,
            'dereporting_bidang_id' => null,
        ]);

        return response()->json([
            'message' => "Jabatan Operator untuk {$user->name} telah resmi dicabut."
        ]);
    }
}
```

---

## Troubleshooting

### Q: Tiba-tiba terjadi Error "Call to undefined relationship [dereportingBidang] on model [App\Models\User]"!

**Artinya:** Otak Pusat (*Model User.php*) lupa diajari cara memanggil Tabel Bidang!
**Solusi:** Sangat lazim terjadi. Buka `backend/app/Models/User.php`, gulir ke bagian paling bawah, dan tambahkan jembatan penghubung relasional ini:
```php
public function dereportingBidang()
{
    // Ingat, kita memanggil Bidang dari benua DeReporting
    return $this->belongsTo(\App\Modules\DeReporting\Models\Bidang::class, 'dereporting_bidang_id');
}
```

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): construct operator delegation system via IAM payload mutation" \
  --body "Membangun sistem Pendelegasian Wewenang (Operator). Mengeksploitasi arsitektur tabel bawaan \`users\` tanpa menciptakan tabel pivot mubazir. Mengaplikasikan prinsip mutasi *Role-Based Access Control (RBAC)* tingkat kolom untuk memisahkan pandangan data pelaporan antar bidang kerja. Detail di docs/issues/083-backend-dereporting-operator-controller.md" \
  --label "backend,controller,iam,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/083-backend-dereporting-operator-controller
```

### Step 3: Kerjakan

Pahat `OperatorController.php` dengan teliti. Jika kamu mendapati *Troubleshooting Error* seperti yang dijelaskan di atas, pastikan kamu dengan sigap menambahkan fungsi `dereportingBidang` ke dalam kelas sakral `App\Models\User.php`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): construct operator delegation system via IAM payload mutation (#83)"
git push -u origin issue/083-backend-dereporting-operator-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): construct operator delegation system via IAM payload mutation (#83)" \
  --body "## Summary
Pembangkitan sistem kendali Otoritas Wilayah Kerja *(Operator Delegation)*.

## Changes
- Pembuatan \`OperatorController\` yang berpusat pada penarikan mutasi kelas inti \`App\Models\User\`.
- Implementasi sistem Pengangkatan *(Promote)* dan Pemecatan *(Demote)* tanpa merusak integritas tabel \`users\`, dengan mereset atribut nilai ke \`null\`.
- Injeksi penambal relasional \`dereportingBidang\` pada Entitas \`User\`.

## Rules Compliance
- [x] Lolos Doktrin Penghindaran Data Ganda (Anti-Redundancy): Keberhasilan memblokir pembuatan tabel baru yang sia-sia *(seperti dr_operators)* dengan memanfaatkan ekstensi IAM bawaan *(Identity and Access Management)* yang telah kita persiapkan di Fase 1 (Issue 009).

Closes #83" \
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
Modul DeReporting harus bisa dipartisi berdasarkan Bidang kerja (Kehutanan, Konservasi, dll). Untuk itu kita butuh Operator. Kabar baiknya, kita tidak perlu membuat tabel Database baru! Kita cukup memodifikasi jabatan *(Role)* di dalam tabel `users` utama.

## Task

Kerjakan Issue #083 (Backend — DeReporting Operator Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/083-backend-dereporting-operator-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah Modul DeReporting: `backend/app/Modules/DeReporting/Controllers/`.
3. Pahat kelas `OperatorController.php` sesuai Cetak Biru di atas.
4. PERHATIKAN TROUBLESHOOTING! Jangan lupa masuk ke Pusat Tata Surya kita: `backend/app/Models/User.php` dan tambahkan fungsi relasi pelengkap `dereportingBidang()`. Jika tidak, sistem akan hancur lebur!
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
