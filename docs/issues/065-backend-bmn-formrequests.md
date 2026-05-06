# Issue #065 — Backend — BMN FormRequests (Barikade Kawat Berduri Data)

> **Type**: `feature`
> **Labels**: `backend`, `security`, `module-bmn`
> **Priority**: 🔴 Critical (Penangkis Ancaman Sampah Data & Keamanan Integrasi BPK)
> **Complexity**: 🟡 Medium (Deklarasi Berlapis Aturan Validasi Regex & Relasi Ganda)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #061, Issue #063

---

## Branch

```
issue/065-backend-bmn-formrequests
```

## Deskripsi

Sehebat apapun otak logika *AssetService* (Issue 063) yang kita bangun, ia akan runtuh seketika jika suapan data dari peramban (*Frontend*) berisi sampah. Bayangkan jika seorang Admin secara jahat (atau tidak sengaja) mengirim nilai `harga_perolehan = "Milyaran Rupiah"` (berupa Teks, bukan Angka)! *Database* akan memuntahkan amarahnya dan sistem akan *Crash*.

Di sinilah **FormRequests** turun tangan. Pada **Issue #065**, kita bertugas mendirikan barikade Kawat Berduri yang menjaga perbatasan antara Internet (Luar) dan Otak Service (Dalam).

Prinsip mutlak barikade kita:
1. Tidak ada satupun variabel boleh lolos jika tidak lulus sensor format (Tanggal harus tanggal `Y-m-d`, Uang harus `numeric`, ID relasi harus sah ada di *Database* alias `exists:tabel,id`).
2. Mencegah duplikasi data level negara. Kombinasi kode barang dan Nomor Urut Pendaftaran (NUP) tidak boleh ada yang kembar di sistem.

Kita akan mencetak 5 Kawat Berduri *(FormRequests)* sekaligus.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/Bmn/Requests`.
- [ ] Tersedia `StoreAssetRequest` yang melarang NUP dan Kode Barang kembar.
- [ ] Tersedia `UpdateAssetRequest` yang membolehkan NUP kembar **asalkan** itu adalah milik asetnya sendiri (Ignore Self).
- [ ] Tersedia `StoreAssetLoanRequest` yang mengecek keabsahan ID Pegawai `exists:kpg_employees,id`.
- [ ] Tersedia `StoreAssetMaintenanceRequest` dan `DisposeAssetRequest`.
- [ ] Seluruh kelas me-*return* nilai `true` pada fungsi `authorize()`.

---

## Panduan Implementasi Cerdas

Masuklah ke area perbatasan modular:
```bash
mkdir -p backend/app/Modules/Bmn/Requests
```

Susun formasi penjagaan di bawah ini:

### 1. Penjaga Pendaftaran Aset Baru (StoreAssetRequest.php)
**Path:** `backend/app/Modules/Bmn/Requests/StoreAssetRequest.php`

```php
<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Autentikasi sudah diurus Middleware Modul Access
    }

    public function rules(): array
    {
        return [
            'kode_barang' => ['required', 'string', 'max:50'],
            'nup' => [
                'required', 
                'string', 
                'max:20',
                // SUPER CRITICAL: Kombinasi kode_barang dan nup harus Unik!
                Rule::unique('bmn_assets')->where(function ($query) {
                    return $query->where('kode_barang', $this->kode_barang);
                })
            ],
            'nama_barang' => ['required', 'string', 'max:255'],
            'merk_tipe' => ['nullable', 'string', 'max:255'],
            'tahun_perolehan' => ['nullable', 'integer', 'digits:4', 'min:1945', 'max:' . (date('Y') + 1)],
            'kondisi' => ['required', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
            
            // Angka Finansial (Sangat Ketat)
            'nilai_perolehan' => ['required', 'numeric', 'min:0'],
            'nilai_buku' => ['required', 'numeric', 'min:0'],
            
            'lokasi_spesifik' => ['nullable', 'string', 'max:500'],
            'foto_url' => ['nullable', 'string', 'max:1000'],
            'keterangan' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'nup.unique' => 'Gagal Keras! Nomor Urut Pendaftaran (NUP) ini sudah terpakai pada Kode Barang yang sama di Database.',
            'nilai_perolehan.numeric' => 'Nilai Perolehan wajib berwujud angka murni (Hilangkan tanda Rp atau titik).',
            'kondisi.in' => 'Kondisi barang harus di antara: Baik, Rusak Ringan, atau Rusak Berat.'
        ];
    }
}
```

### 2. Penjaga Revisi Aset (UpdateAssetRequest.php)
**Path:** `backend/app/Modules/Bmn/Requests/UpdateAssetRequest.php`

```php
<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Mendapatkan ID aset yang sedang diedit dari Parameter URL (misal: PUT /api/bmn/assets/{asset})
        $assetId = $this->route('asset');

        return [
            'kode_barang' => ['required', 'string', 'max:50'],
            'nup' => [
                'required', 
                'string', 
                'max:20',
                // Cerdas: Boleh kembar asalkan itu ID Asetnya Sendiri (Ignore)
                Rule::unique('bmn_assets')->where(function ($query) {
                    return $query->where('kode_barang', $this->kode_barang);
                })->ignore($assetId)
            ],
            'nama_barang' => ['required', 'string', 'max:255'],
            'merk_tipe' => ['nullable', 'string', 'max:255'],
            'tahun_perolehan' => ['nullable', 'integer', 'digits:4'],
            'kondisi' => ['required', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
            'nilai_perolehan' => ['required', 'numeric', 'min:0'],
            'nilai_buku' => ['required', 'numeric', 'min:0'],
            'lokasi_spesifik' => ['nullable', 'string', 'max:500'],
            'foto_url' => ['nullable', 'string', 'max:1000'],
            'keterangan' => ['nullable', 'string'],
            
            // Catatan rahasia untuk sistem Audit AssetService
            'keterangan_audit' => ['nullable', 'string', 'max:255']
        ];
    }
}
```

### 3. Penjaga Peminjaman Aset (StoreAssetLoanRequest.php)
**Path:** `backend/app/Modules/Bmn/Requests/StoreAssetLoanRequest.php`

```php
<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetLoanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Validasi Relasi Eksternal Mutlak
            'employee_id' => ['required', 'uuid', 'exists:kpg_employees,id'],
            
            // Validasi Format Tanggal Logis
            'tanggal_pinjam' => ['required', 'date', 'before_or_equal:today'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'employee_id.exists' => 'Data Pegawai fiktif! NIP tersebut tidak tercatat di buku Kepegawaian BKSDA.',
        ];
    }
}
```

### 4. Penjaga Perbaikan (StoreAssetMaintenanceRequest.php)
**Path:** `backend/app/Modules/Bmn/Requests/StoreAssetMaintenanceRequest.php`

```php
<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tanggal_service' => ['required', 'date', 'before_or_equal:today'],
            'biaya' => ['required', 'numeric', 'min:0'],
            'deskripsi' => ['required', 'string', 'max:2000'],
            'bukti_nota_url' => ['nullable', 'string', 'max:1000'],
            
            // Opsi opsional memutakhirkan fisik barang pasca-servis
            'kondisi_baru' => ['nullable', 'string', Rule::in(['Baik', 'Rusak Ringan', 'Rusak Berat'])],
        ];
    }
}
```

### 5. Formulir Eksekusi Pemutihan (DisposeAssetRequest.php)
**Path:** `backend/app/Modules/Bmn/Requests/DisposeAssetRequest.php`

```php
<?php

namespace App\Modules\Bmn\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DisposeAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'alasan_pemutihan' => ['required', 'string', 'min:10', 'max:1000']
        ];
    }

    public function messages(): array
    {
        return [
            'alasan_pemutihan.min' => 'Alasan pemutihan/penghapusan aset negara harus jelas dan di atas 10 karakter.'
        ];
    }
}
```

---

## Troubleshooting

### Q: Pesan Error JSON tidak pernah muncul padahal pengisian sengaja saya salahkan?

**Artinya:** FormRequest gagal menahan laju instruksi secara murni.
**Solusi:** Laravel FormRequest bekerja *SECARA OTOMATIS*! Ia akan otomatis melemparkan respons HTTP Kode `422 Unprocessable Entity` ke layar *Frontend* jika validasi gagal, TANPA PERLU menyentuh kode Controller kita sama sekali. Jika itu gagal terjadi, pastikan pemanggilan kelas *Request* di fungsi Controller (Issue Berikutnya) dilakukan pada parameter Injeksi (Type Hint), contoh: `public function store(StoreAssetRequest $request)`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): establish hyper-strict validation request barriers for asset mutability matrices" \
  --body "Mendirikan gerbang validasi FormRequest bertenaga tinggi untuk Modul BMN. Memasang regulasi Anti-Duplikasi silang (NUP vs Kode Barang) serta filter kepatuhan tipe numerik guna melindungi fungsi Service Layer. Detail di docs/issues/065-backend-bmn-formrequests.md" \
  --label "backend,security,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/065-backend-bmn-formrequests
```

### Step 3: Kerjakan

Pahat kelima kawat berduri ini (*StoreAsset, UpdateAsset, StoreLoan, StoreMaintenance, DisposeAsset*) di folder isolasi Modul Request BMN. Jangan sesekali kamu mengotori folder standar milik Laravel (`app/Http/Requests`).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(bmn): establish hyper-strict validation request barriers for asset mutability matrices (#65)"
git push -u origin issue/065-backend-bmn-formrequests
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): establish hyper-strict validation request barriers for asset mutability matrices (#65)" \
  --body "## Summary
Pembangkitan lima kelas garda depan (*FormRequests*) demi menangkis masuknya parameter sampah dari jangkauan publik maupun peramban *Frontend* BKSDA.

## Changes
- Penciptaan wujud blokade data melalui \`StoreAssetRequest\` & \`UpdateAssetRequest\` yang dibekali perisai fungsional tingkat lanjut seperti *Rule::unique* dan klausa pelepasan *ignore()*.
- Perlindungan silang antar-modul diterapkan secara keras melalui aturan \`exists:kpg_employees,id\` pada permohonan \`StoreAssetLoanRequest\`.
- Penerapan translasi *Error Message* ramah-operator dalam tata bahasa Indonesia *(Localized Response Strategy)*.

## Rules Compliance
- [x] Lolos Doktrin Perisai Ganda (*Dual-Side Barricade*): Controller dan Service dilarang mendeteksi panjang Teks maupun absensi Input secara sepihak.

Closes #65" \
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
Logika manipulasi BMN (*AssetService*, dll) sudah berdiri gagah. Namun mereka sangat lemah jika dijejali data busuk. FormRequest adalah rompi anti-pelurunya.

## Task

Kerjakan Issue #065 (Backend — BMN FormRequests).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/065-backend-bmn-formrequests.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah perbatasan `backend/app/Modules/Bmn/Requests`.
3. Pahat kelima file Request tersebut (`StoreAssetRequest`, `UpdateAssetRequest`, `StoreAssetLoanRequest`, `StoreAssetMaintenanceRequest`, `DisposeAssetRequest`).
4. Pastikan kamu memanggil `use Illuminate\Validation\Rule` pada file yang menggunakan logika duplikasi `unique`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
