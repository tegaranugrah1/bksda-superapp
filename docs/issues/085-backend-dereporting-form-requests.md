# Issue #085 — Backend — DeReporting FormRequests (Tembok Validasi Lapis Baja)

> **Type**: `feature`
> **Labels**: `backend`, `security`, `module-dereporting`
> **Priority**: 🔴 Critical (Perisai Utama Melawan Serangan Payload Sampah)
> **Complexity**: 🟢 Simple (Pemindahan Logika Controller ke Kelas Khusus)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #081, #082

---

## Branch

```
issue/085-backend-dereporting-form-requests
```

## Deskripsi

Selamat datang di Titik Akhir Penaklukan Backend Modul DeReporting! 🛡️

Pada Issue 081 dan 082, kita telah meletakkan blok validasi mentah bawaan `($request->validate)` langsung di dalam *Controller*. Secara fungsi, itu bekerja dengan baik. Namun secara Arsitektur Skala Besar *(Enterprise)*, hal itu membuat *Controller* membengkak gemuk *(Fat Controller)* dan mengotori keindahan kode.

Di **Issue #085** ini, kita akan melakukan *Refactoring* pamungkas. Kita akan mencabut logika validasi tersebut dan mendirikan Kelas Perisai Khusus *(FormRequests)*.

Terdapat 2 Kelas Perisai utama yang harus dibangun untuk menegakkan **Project Rule 4.1 & 4.2** (Validasi File Ketat Max 10MB & MIME):
1. **`StoreInternalRequest`**: Menjaga gerbang Laporan Pegawai. Memastikan keutuhan 8 relasi `UUID` tidak cacat.
2. **`StoreEkternalRequest`**: Menjaga gerbang Laporan Masyarakat. Mengawasi batas karakter *(String Length)* agar tidak disuntik *Payload* serangan injeksi yang tak berujung.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `backend/app/Modules/DeReporting/Requests/`.
- [ ] Tersedia kelas `StoreInternalRequest.php` dengan aturan proteksi untuk 8 `foreign_key` Master Data dan ukuran ekstensi berkas.
- [ ] Tersedia kelas `StoreEkternalRequest.php` yang melindungi kolom identitas (Email, No HP, Nama) dengan pelindung batas Max Character.
- [ ] Tersedia pesan terjemahan kustom (*Custom Error Messages*) agar *Frontend* menampilkan teks ramah manusia, bukan bahasa mesin *"file must be a file of type..."*.
- [ ] *InternalController* dan *EkternalController* yang lama dimutakhirkan: membuang `$request->validate()` dan beralih menggunakan Kelas *FormRequest* ini.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Pertahanan:
```bash
mkdir -p backend/app/Modules/DeReporting/Requests
```

### 1. Cetak Biru: Perisai Laporan Pegawai (Internal)
**Path:** `backend/app/Modules/DeReporting/Requests/StoreInternalRequest.php`

```php
<?php

namespace App\Modules\DeReporting\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInternalRequest extends FormRequest
{
    /**
     * Memastikan hanya yang berwenang yang bisa menembus perisai ini.
     * Kita serahkan ke true karena Autentikasi diurus Middleware Route.
     */
    public function authorize(): bool
    {
        return true; 
    }

    /**
     * Tembok Baja Aturan Input
     */
    public function rules(): array
    {
        return [
            'judul_laporan' => ['required', 'string', 'max:255'],
            // Validasi Integritas Relasional: Pastikan UUID tersebut ada di Database!
            'tahun_id'      => ['required', 'uuid', 'exists:dr_tahun,id'],
            'bidang_id'     => ['required', 'uuid', 'exists:dr_bidang,id'],
            'jenis_id'      => ['required', 'uuid', 'exists:dr_jenis,id'],
            'kategori_id'   => ['required', 'uuid', 'exists:dr_kategori,id'],
            'jenis_data_id' => ['required', 'uuid', 'exists:dr_jenis_data,id'],
            
            // Kolom Opsional
            'koordinator_id'=> ['nullable', 'uuid', 'exists:dr_koordinator,id'],
            'anggaran_id'   => ['nullable', 'uuid', 'exists:dr_anggaran,id'],
            'keterangan'    => ['nullable', 'string'],
            
            // Proteksi Inti Berkas (Project Rule 4.1 & 4.2)
            // Maksimal 10240 KB = 10 MB
            'file'          => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,zip,rar'],
        ];
    }

    /**
     * Pesan Peringatan Ramah Manusia
     */
    public function messages(): array
    {
        return [
            'file.max'   => 'Kapasitas brankas tidak memadai. Ukuran berkas dilarang melebihi 10 Megabytes.',
            'file.mimes' => 'Format laporan terlarang! Hanya menerima wujud: PDF, DOCX, XLSX, ZIP, atau RAR.',
            '*.exists'   => 'Identitas referensi Master Data tersebut telah dipalsukan atau musnah dari sistem.',
        ];
    }
}
```

### 2. Cetak Biru: Perisai Laporan Masyarakat (Eksternal)
**Path:** `backend/app/Modules/DeReporting/Requests/StoreEkternalRequest.php`

```php
<?php

namespace App\Modules\DeReporting\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEkternalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Form ini terbuka untuk Publik (Celah Eksternal)
    }

    public function rules(): array
    {
        return [
            // Cekik panjang karakter agar memori Server tidak meledak diserang Bot
            'nama_pelapor'  => ['required', 'string', 'max:150'],
            'instansi'      => ['nullable', 'string', 'max:150'],
            'email'         => ['nullable', 'email', 'max:100'],
            'no_hp'         => ['nullable', 'string', 'max:20'],
            'judul_laporan' => ['required', 'string', 'max:255'],
            'deskripsi'     => ['nullable', 'string'],
            
            // Masyarakat boleh mengirimkan bukti Foto (jpg, png, jpeg)
            'file'          => ['required', 'file', 'max:10240', 'mimes:pdf,doc,docx,xls,xlsx,zip,rar,jpg,png,jpeg'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.max'    => 'Berkas terlalu berat. Mohon pastikan file Anda di bawah 10 MB.',
            'email.email' => 'Format surat elektronik (Email) tidak valid.',
            'nama_pelapor.max' => 'Nama terlampau panjang, maksimal 150 karakter.',
        ];
    }
}
```

### 3. Eksekusi Pemasangan Perisai di Controller
Setelah dua fail di atas siap, kembali buka file *Controller* lama yang kita buat kemarin:
- Di `InternalController.php`, ubah `public function store(Request $request)` menjadi `public function store(StoreInternalRequest $request)` lalu HAPUS blok `$request->validate([...])` yang sudah menganggur.
- Di `EkternalController.php`, ubah fungsi metode `storePublic` menjadi `public function storePublic(StoreEkternalRequest $request)` dan buang kode validasi lama.

---

## Troubleshooting

### Q: Muncul Error "Class 'App\Modules\DeReporting\Requests\StoreInternalRequest' not found" pada Controller?

**Artinya:** Kamu lupa membawa surat sakti pendaftaran!
**Solusi:** *Controller* tidak akan otomatis mengenali perisai pelindung yang diletakkan di kamar lain. Pastikan di bagian atas (Baris ke-5) *Controller*-mu, kamu menambahkan baris:
`use App\Modules\DeReporting\Requests\StoreInternalRequest;`

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "refactor(dereporting): extract inline controller validation to dedicated FormRequest barricades" \
  --body "Membersihkan kekumuhan Controller (*Fat Controller Refactoring*). Memisahkan tumpukan logika sanitasi Input ke dalam perisai *FormRequest* Khusus. Menegakkan regulasi MIME dan pembatasan beban maksimum berkas 10MB. Detail di docs/issues/085-backend-dereporting-form-requests.md" \
  --label "backend,security,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/085-backend-dereporting-form-requests
```

### Step 3: Kerjakan

Pahat `StoreInternalRequest` dan `StoreEkternalRequest` di folder baru `/Requests`. Setelah itu, langsung tuju `InternalController` dan `EkternalController` untuk melakukan manuver penggantian kelas argumen *(Type-Hinting Injection)*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "refactor(dereporting): extract inline controller validation to dedicated FormRequest barricades (#85)"
git push -u origin issue/085-backend-dereporting-form-requests
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "refactor(dereporting): extract inline controller validation to dedicated FormRequest barricades (#85)" \
  --body "## Summary
Penyempurnaan estetika kode dan pendelegasian keamanan lapis pertama dari *Controller* menuju pos penjagaan *FormRequest*.

## Changes
- Penciptaan wujud perisai \`StoreInternalRequest\` yang dibekali sensor peraba \`exists:table,id\` untuk mencegah masuknya data master fiktif.
- Penciptaan alat cegah tangkal *Payload* berlebih \`StoreEkternalRequest\` yang mencekik panjang *String* masyarakat pada 150-255 karakter.
- Terjemahan Custom Error Messages (*Human Readable Errors*) untuk UX *Frontend* yang jauh lebih sopan dan jelas saat menolak berkas besar.

## Rules Compliance
- [x] Lolos Doktrin Pembatasan Berkas (Project Rule 4.1 & 4.2): Validasi ketat wujud fisik berkas *MIME (pdf, xls, docx)* serta pemakuan batas muatan raksasa \`max:10240\` sukses ditegakkan.

Closes #85" \
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
Modul Laporan di *Backend* akhirnya sampai di penghujung jalan. Agar *Controller* kita "Kurus" dan indah, seluruh kode validasi di dalamnya wajib dibongkar dan disekap di dalam file khusus `FormRequest`.

## Task

Kerjakan Issue #085 (Backend — DeReporting FormRequests).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/085-backend-dereporting-form-requests.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah baru Modul DeReporting: `backend/app/Modules/DeReporting/Requests/`.
3. Pahat kelas perisai keamanan `StoreInternalRequest.php` dan `StoreEkternalRequest.php` persis mengikuti pola di atas.
4. Lakukan operasi bedah sesar *(Refactoring)*: Masuk ke `InternalController.php` dan `EkternalController.php`, lalu hapus kode `$request->validate([...])` yang lama. Gantikan argumen fungsi `(Request $request)` menjadi `(StoreInternalRequest $request)`. JANGAN lupa menambahkan klausa `use` di bagian atas!
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
