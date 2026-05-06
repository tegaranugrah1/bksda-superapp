# Issue #082 — Backend — DeReporting Ekternal Controller (Gerbang Pelaporan Publik)

> **Type**: `feature`
> **Labels**: `backend`, `controller`, `security`, `module-dereporting`
> **Priority**: 🔴 Critical (Satu-satunya Celah Terbuka yang Menghadap Internet)
> **Complexity**: 🟡 Medium (Otentikasi Ganda: Public Store vs Auth Read)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #081

---

## Branch

```
issue/082-backend-dereporting-ekternal-controller
```

## Deskripsi

Melompat ke **Issue #082** adalah manuver yang **SANGAT AMAN**. Bahkan, inilah momen pengujian ketahanan keamanan *(Security Test)* arsitektur kita!

Berbeda dengan Laporan Internal (Issue 081) yang dikelilingi tembok Login *(Auth)*, **Laporan Eksternal** adalah formulir yang diletakkan di luar ruangan. Siapapun dari seluruh penjuru dunia (Tanpa Login) dapat mengisi formulir ini dan mengirim file ke peladen *(Server)* BKSDA.

Karena menghadapi internet liar, kita wajib memasang 3 lapis Senjata Pertahanan sesuai **Project Rule 6.4**:
1. **Perisai DDoS *(Rate Limiting)***: Maksimal 10 formulir per menit untuk 1 jaringan internet (IP). Jika melebihi itu, server akan otomatis memblokirnya (Error 429).
2. **Rekam Jejak Forensik (Rule 4.6)**: Mencatat Alamat IP *(IP Address)* pengirim formulir tanpa sepengetahuan mereka untuk keperluan audit kepolisian.
3. **Isolasi Berkas Karantina**: File laporan yang masuk tidak boleh diletakkan di Folder Internal. File masyarakat harus disekap secara terpisah di `private/dereporting/ekternals`.

---

## Acceptance Criteria

- [ ] Folder Modul sudah ada: `backend/app/Modules/DeReporting/Controllers/`.
- [ ] Tersedia `EkternalController.php` dengan konstruktor yang mendaftarkan penjaga gawang `throttle:10,1` khusus untuk metode unggah.
- [ ] Terdapat metode `storePublic()` (Tanpa Auth) yang menyedot IP Address Pelapor secara diam-diam melalui `$request->ip()`.
- [ ] Terdapat metode `index()` (Wajib Auth & Admin) untuk membaca antrean laporan publik.
- [ ] Terdapat metode `updateStatus()` (Wajib Auth & Admin) untuk merubah Status dari "Menunggu Tinjauan" menjadi "Diterima/Ditolak".
- [ ] Terdapat metode `downloadFile()` (Wajib Auth & Admin) untuk mengekstrak file laporan masyarakat dari brankas karantina.

---

## Panduan Implementasi Cerdas

**Path:** `backend/app/Modules/DeReporting/Controllers/EkternalController.php`

Bangun Gerbang Penjagaan Publik ini menggunakan cetak biru mutakhir berikut:

```php
<?php

namespace App\Modules\DeReporting\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use App\Modules\DeReporting\Models\Ekternal;

class EkternalController extends Controller
{
    /**
     * KONSTRUKTOR PERTAHANAN (SECURITY CONSTRUCTOR)
     * Kita pasang Perisai DDoS langsung di Controller agar tak lupa di Routes!
     */
    public function __construct()
    {
        // Membatasi metode storePublic maksimal 10 request per 1 menit (Rule 6.4)
        $this->middleware('throttle:10,1')->only('storePublic');
    }

    /**
     * GET /api/dereporting/ekternals
     * ADMIN ONLY: Membaca Daftar Laporan Masuk dari Masyarakat
     */
    public function index(Request $request)
    {
        $query = Ekternal::latest();

        // Fitur Pencarian Cerdas untuk Operator
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('judul_laporan', 'ilike', "%{$search}%")
                  ->orWhere('nama_pelapor', 'ilike', "%{$search}%")
                  ->orWhere('instansi', 'ilike', "%{$search}%");
        }
        
        // Filter Berdasarkan Status (Cari yang 'Menunggu Tinjauan')
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->paginate(20));
    }

    /**
     * POST /api/dereporting/ekternals/public
     * PUBLIC ROUTE: Gerbang penerimaan berkas masyarakat dunia
     */
    public function storePublic(Request $request)
    {
        $request->validate([
            'nama_pelapor'  => 'required|string|max:150',
            'instansi'      => 'nullable|string|max:150',
            'email'         => 'nullable|email|max:100',
            'no_hp'         => 'nullable|string|max:20',
            'judul_laporan' => 'required|string|max:255',
            'deskripsi'     => 'nullable|string',
            // Perlindungan Mutlak: Format wajib ketat (Rule 4.1)
            'file'          => 'required|file|max:10240|mimes:pdf,doc,docx,xls,xlsx,zip,rar,jpg,png,jpeg',
        ]);

        $filePath = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // Menghancurkan nama asli (Mencegah serangan skrip .php.pdf)
            $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
            // Mengarantina file di dalam Brankas Isolasi Publik
            $filePath = $file->storeAs('private/dereporting/ekternals', $filename);
        }

        $report = Ekternal::create([
            'nama_pelapor'  => $request->nama_pelapor,
            'instansi'      => $request->instansi,
            'email'         => $request->email,
            'no_hp'         => $request->no_hp,
            'judul_laporan' => $request->judul_laporan,
            'deskripsi'     => $request->deskripsi,
            'file_path'     => $filePath,
            
            // JEJAK FORENSIK RAHASIA (Rule 4.6)
            'ip_address'    => $request->ip(),
            'status'        => 'Menunggu Tinjauan', // Status Otomatis
        ]);

        return response()->json([
            'message' => 'Laporan Anda berhasil dikirim ke Markas BKSDA. Kami telah mencatat tiket Anda.',
            // JANGAN mengirimkan IP Address balik ke layar pengguna!
            'data'    => $report->only(['id', 'nama_pelapor', 'status', 'created_at'])
        ], 201);
    }

    /**
     * PUT /api/dereporting/ekternals/{id}/status
     * ADMIN ONLY: Memverifikasi / Menolak laporan masyarakat
     */
    public function updateStatus(Request $request, string $id)
    {
        $request->validate([
            'status' => 'required|in:Menunggu Tinjauan,Diterima,Ditolak',
        ]);

        $report = Ekternal::findOrFail($id);
        $report->update(['status' => $request->status]);

        return response()->json([
            'message' => "Status laporan berhasil diubah menjadi: {$request->status}",
            'data'    => $report
        ]);
    }

    /**
     * GET /api/dereporting/ekternals/{id}/download
     * ADMIN ONLY: Pintu ekstraksi berkas masyarakat yang aman
     */
    public function downloadFile(string $id)
    {
        $report = Ekternal::findOrFail($id);

        if (!$report->file_path || !Storage::exists($report->file_path)) {
            return response()->json(['message' => 'Berkas laporan gagal ditemukan di karantina.'], 404);
        }

        return Storage::download($report->file_path, $report->judul_laporan . '_Pelapor_Eksternal.' . pathinfo($report->file_path, PATHINFO_EXTENSION));
    }
}
```

---

## Troubleshooting

### Q: Tombol Kirim dari Frontend tiba-tiba mengembalikan Error "429 Too Many Requests" padahal baru kirim 2 kali?

**Artinya:** Setelan sistem `throttle` di mesin komputermu terlalu sensitif atau tidak membaca Cache dengan benar.
**Solusi:** Itu adalah pertanda bagus! Pertahanan Anti-DDoS milikmu bekerja dengan sempurna. Server memang didesain mengunci IP Address jika serangan bertubi-tubi datang. Jika di posisi lokal (Development), bersihkan cache mesinmu dengan `php artisan cache:clear` untuk membuka kunci IP lokal `127.0.0.1` milikmu.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): construct public submission gateway with forensic IP tracking and DDoS rate limiting" \
  --body "Membangun pos keamanan lapis pertama yang menghadap ke luar peladen *(Public Internet)*. Mengamankan celah Laporan Eksternal menggunakan mekanisme *Throttle (Rate Limiting)* dan ekstraksi senyap Alamat IP guna keperluan audit forensik. Detail di docs/issues/082-backend-dereporting-ekternal-controller.md" \
  --label "backend,controller,security,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/082-backend-dereporting-ekternal-controller
```

### Step 3: Kerjakan

Pahat `EkternalController.php` dengan kewaspadaan penuh. Ingat, *Endpoint* `storePublic` ini adalah titik paling rapuh di seluruh aplikasi BKSDA karena ia tidak membutuhkan Token. Jangan biarkan *Payload* sembarangan lolos.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add backend/
git commit -m "feat(dereporting): construct public submission gateway with forensic IP tracking and DDoS rate limiting (#82)"
git push -u origin issue/082-backend-dereporting-ekternal-controller
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): construct public submission gateway with forensic IP tracking and DDoS rate limiting (#82)" \
  --body "## Summary
Pembangkitan Gerbang Eksternal (Public Gateway) DeReporting. Mengolah lalu-lintas data tak terenkripsi (Public Unauthenticated Data) secara aman.

## Changes
- Pembuatan fungsi \`storePublic()\` yang menangkap dan mencatat keberadaan \`\$request->ip()\` ke dalam Database tanpa perlu kesadaran pelapor.
- Injeksi paksa pelindung \`\$this->middleware('throttle:10,1')\` di dalam rahim Konstruktor kelas guna menahan hantaman *DDoS Attack* yang menargetkan pengisian *Disk Storage*.
- Pembuatan jalur khusus \`updateStatus()\` bagi Operator BKSDA untuk mensortir mana dokumen yang relevan (Diterima) dan mana laporan palsu (Ditolak).

## Rules Compliance
- [x] Lolos Doktrin Pembatasan Laju (Project Rule 6.4): Implementasi perisai penahan arus 10 Request per IP per Menit beroperasi penuh.
- [x] Lolos Doktrin Audit Pelacakan (Rule 4.6): Ekstraksi \`ip_address\` dipasang mati di inti *Controller*, siap diaudit kepolisian jika terjadi serangan pengunggahan file terlarang secara acak.

Closes #82" \
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
Modul Laporan Eksternal adalah formulir tanpa *Login* (Sangat berbahaya jika tidak diawasi). Karenanya, di dalam *Controller* ini, kita menugaskan "Anjing Penjaga" *(Rate Limiting)* dan "Perekam Jejak Gaib" *(IP Tracker)*.

## Task

Kerjakan Issue #082 (Backend — DeReporting Ekternal Controller).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/082-backend-dereporting-ekternal-controller.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Tetap berada di wilayah `backend/app/Modules/DeReporting/Controllers/`.
3. Pahat kelas `EkternalController.php` tanpa ada 1 huruf pun yang luput dari Cetak Biru (Terutama blok `__construct`!).
4. Perhatikan pemotongan *Payload Response* di akhir fungsi `storePublic()`. Kita hanya mengembalikan sedikit data kepada pengirim, dan SANGAT DILARANG mengirim balik status *IP Address* agar peretas tidak tahu kita melacaknya!
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
