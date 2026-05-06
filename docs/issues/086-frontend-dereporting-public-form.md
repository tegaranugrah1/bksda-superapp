# Issue #086 — Frontend — DeReporting Public Form (Gerbang Pelaporan Masyarakat)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `public`, `module-dereporting`
> **Priority**: 🔴 Critical (Satu-satunya Layar Bebas Login untuk Rakyat)
> **Complexity**: 🟡 Medium (Form Dinamis Bertingkat + File Upload Tanpa Token)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #082, Issue #084

---

## Branch

```
issue/086-frontend-dereporting-public-form
```

## Deskripsi

Selamat datang di perbatasan dunia luar! 🌐

Hingga saat ini, seluruh layar antarmuka BKSDA yang kita bangun hanya bisa diakses setelah Login. Pada **Issue #086** ini, kita akan mendirikan satu layar istimewa yang berdiri sendiri di luar pagar tembok otentikasi: **Formulir Pelaporan Masyarakat**.

Formulir ini berfungsi agar siapapun — petani, nelayan, peneliti, mahasiswa — yang menemukan pelanggaran konservasi alam (penebangan liar, perburuan satwa, pencemaran limbah) dapat melaporkannya langsung ke peladen BKSDA tanpa perlu mendaftar akun.

**Tantangan Arsitektur:**
1. Formulir ini **tidak boleh** menggunakan `api.ts` (Axios Interceptor), karena Interceptor tersebut dirancang menyuntikkan Token — Token yang tidak dimiliki masyarakat. Kita harus menggunakan `axios` polos *(bare axios)* atau `fetch` bawaan.
2. Formulir ini memiliki *Dropdown* bertingkat (*Cascading Select*). Saat pengguna memilih "Bidang Konservasi", maka *Dropdown* kedua (Jenis) secara otomatis hanya menampilkan sub-kategori dari Bidang tersebut. Ini membutuhkan `useEffect` berantai.

---

## Acceptance Criteria

- [ ] Halaman publik diciptakan: `frontend/src/app/lapor/page.tsx` (Berdiri di luar folder `(dashboard)`).
- [ ] Form memiliki input: Nama Pelapor, Instansi, Email, No HP, Judul Laporan, Deskripsi, dan File Unggah.
- [ ] **MUTLAK**: Panggilan API TIDAK menggunakan `@/lib/api.ts` — harus menggunakan `axios` polos atau `fetch` native.
- [ ] Terdapat notifikasi keberhasilan *(Toast/Alert)* setelah pengiriman, beserta animasi peralihan.
- [ ] Terdapat validasi sisi klien *(Client-Side)* sebelum menembak API, supaya tidak membebani *Backend* dengan permintaan yang jelas-jelas salah.

---

## Panduan Implementasi Cerdas

**Path:** `frontend/src/app/lapor/page.tsx`

Pahat Gerbang Terbuka untuk Rakyat ini:

```tsx
"use client";

import { useState, FormEvent } from "react";
import axios from "axios"; // AXIOS POLOS! Bukan @/lib/api!
import { Send, Loader2, CheckCircle2, FileUp, AlertTriangle } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function LaporPublikPage() {
    // State Formulir
    const [formData, setFormData] = useState({
        nama_pelapor: "",
        instansi: "",
        email: "",
        no_hp: "",
        judul_laporan: "",
        deskripsi: "",
    });
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Pengendali Perubahan Input (Generik untuk semua field)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Pengendali Pengiriman Formulir
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        // Validasi Sisi Klien (Mengurangi beban server)
        if (!formData.nama_pelapor.trim()) {
            setErrorMsg("Nama Pelapor wajib diisi.");
            return;
        }
        if (!formData.judul_laporan.trim()) {
            setErrorMsg("Judul Laporan wajib diisi.");
            return;
        }
        if (!file) {
            setErrorMsg("Bukti file (PDF/Foto) wajib dilampirkan.");
            return;
        }

        setIsSubmitting(true);

        try {
            // Merakit FormData (Wajib! Karena kita mengirim file biner)
            const payload = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value) payload.append(key, value);
            });
            payload.append("file", file);

            // Menembak Endpoint PUBLIK (Tanpa Bearer Token!)
            await axios.post(`${API_BASE}/dereporting/ekternals/public`, payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setIsSuccess(true);
        } catch (error: any) {
            if (error.response?.status === 422) {
                // Menangkap pesan validasi dari Backend (FormRequest Issue 085)
                const messages = error.response.data.errors;
                const firstError = Object.values(messages).flat()[0] as string;
                setErrorMsg(firstError || "Data yang Anda masukkan tidak valid.");
            } else if (error.response?.status === 429) {
                setErrorMsg("Anda terlalu sering mengirim laporan. Silakan coba lagi dalam 1 menit.");
            } else {
                setErrorMsg("Terjadi gangguan pada server. Silakan coba beberapa saat lagi.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // LAYAR SUKSES: Ditampilkan setelah pengiriman berhasil
    if (isSuccess) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
                <div className="text-center animate-in fade-in zoom-in duration-500 max-w-md">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">Laporan Terkirim!</h2>
                    <p className="text-zinc-400 text-sm mb-8">
                        Terima kasih atas kepedulian Anda terhadap kelestarian alam Indonesia.
                        Tim BKSDA akan meninjau laporan Anda dalam waktu 1×24 jam kerja.
                    </p>
                    <button
                        onClick={() => { setIsSuccess(false); setFormData({ nama_pelapor: "", instansi: "", email: "", no_hp: "", judul_laporan: "", deskripsi: "" }); setFile(null); }}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
                    >
                        Kirim Laporan Lainnya
                    </button>
                </div>
            </div>
        );
    }

    // LAYAR UTAMA: Formulir Pelaporan
    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Send className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Lapor ke BKSDA</h1>
                    <p className="text-zinc-400 mt-2 text-sm max-w-md mx-auto">
                        Formulir pengaduan pelestarian alam terbuka. Anda tidak perlu membuat akun.
                    </p>
                </div>

                {/* Kartu Formulir */}
                <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Baris Error */}
                    {errorMsg && (
                        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Grid 2 Kolom: Nama & Instansi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nama_pelapor" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Nama Pelapor *</label>
                            <input id="nama_pelapor" name="nama_pelapor" type="text" value={formData.nama_pelapor} onChange={handleChange} maxLength={150} placeholder="Nama lengkap Anda"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                        <div>
                            <label htmlFor="instansi" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Instansi / Lembaga</label>
                            <input id="instansi" name="instansi" type="text" value={formData.instansi} onChange={handleChange} maxLength={150} placeholder="Opsional"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                    </div>

                    {/* Grid 2 Kolom: Email & No HP */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Email</label>
                            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} maxLength={100} placeholder="email@contoh.com"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                        <div>
                            <label htmlFor="no_hp" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">No. Handphone</label>
                            <input id="no_hp" name="no_hp" type="text" value={formData.no_hp} onChange={handleChange} maxLength={20} placeholder="08xxxxxxxxxx"
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                        </div>
                    </div>

                    {/* Judul Laporan */}
                    <div>
                        <label htmlFor="judul_laporan" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Judul Laporan *</label>
                        <input id="judul_laporan" name="judul_laporan" type="text" value={formData.judul_laporan} onChange={handleChange} maxLength={255} placeholder="Contoh: Penebangan Liar di Kawasan Hutan Lindung"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" />
                    </div>

                    {/* Deskripsi */}
                    <div>
                        <label htmlFor="deskripsi" className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Deskripsi Kejadian</label>
                        <textarea id="deskripsi" name="deskripsi" value={formData.deskripsi} onChange={handleChange} rows={4} placeholder="Jelaskan kronologi kejadian secara detail..."
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none" />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Lampiran Bukti *</label>
                        <label htmlFor="file_upload" className="flex items-center justify-center gap-3 w-full bg-zinc-950 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-6 cursor-pointer hover:border-blue-500 transition-all group">
                            <FileUp className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                            <span className="text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                {file ? file.name : "Klik untuk unggah (PDF, Foto, Excel — Maks 10 MB)"}
                            </span>
                        </label>
                        <input id="file_upload" type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </div>

                    {/* Tombol Kirim */}
                    <button type="submit" disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {isSubmitting ? "Mengunci & Mengirim Ke Brankas BKSDA..." : "Kirim Laporan"}
                    </button>

                    <p className="text-center text-[11px] text-zinc-600">
                        Dengan mengirim formulir ini, Anda menyetujui bahwa data Anda akan diproses oleh BKSDA sesuai ketentuan yang berlaku.
                    </p>
                </form>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Error `CORS: No 'Access-Control-Allow-Origin'` muncul saat formulir menembak API!

**Artinya:** Server *Backend* Laravel menolak permintaan dari domain *Frontend* yang berbeda.
**Solusi:** Buka file `backend/config/cors.php`. Pastikan *Frontend* domainmu terdaftar di dalam daftar `allowed_origins`:
```php
'allowed_origins' => ['http://localhost:3000', 'https://bksda.vercel.app'],
```
Atau gunakan *wildcard* hanya untuk *Development*: `['*']`.

### Q: Mengapa harus `axios` polos dan bukan `@/lib/api.ts`?

**Artinya:** Arsitektur kita menganut prinsip "Senjata Terpilih".
**Solusi:** File `api.ts` kita dirancang untuk otomatis menyuntikkan Token dari *localStorage*. Pada formulir publik ini, masyarakat tidak memiliki Token. Jika kita memaksakan `api.ts`, maka *Backend* Sanctum akan langsung menembak balik *Error 401 Unauthorized*. Dengan `axios` polos, kita mengirim permintaan tanpa identitas — persis seperti yang diizinkan oleh Zona Publik di Arsitektur *Route* kita (Issue 084).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): construct unauthenticated public whistleblower submission interface" \
  --body "Membangun layar formulir perbatasan yang menghadap internet publik. Menerapkan *Bare Axios* (Tanpa Token) untuk mengirim data multipart/form-data ke gerbang publik DeReporting. Detail di docs/issues/086-frontend-dereporting-public-form.md" \
  --label "frontend,ui,public,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/086-frontend-dereporting-public-form
```

### Step 3: Kerjakan

Pahat `frontend/src/app/lapor/page.tsx` secara utuh. Jangan buat di dalam folder `(dashboard)` — formulir ini berdiri bebas di luar zona Login. Pastikan `import axios from "axios"` dan bukan `import { api } from "@/lib/api"`.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(dereporting): construct unauthenticated public whistleblower submission interface (#86)"
git push -u origin issue/086-frontend-dereporting-public-form
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): construct unauthenticated public whistleblower submission interface (#86)" \
  --body "## Summary
Pembukaan Gerbang Perbatasan: Layar pelaporan masyarakat yang berdiri mandiri di luar zona Login.

## Changes
- Pembuatan antarmuka \`/lapor\` berdesain premium *(Glassmorphism Dark)* dengan transisi animasi masuk dari bawah.
- Implementasi pengiriman data menggunakan \`axios\` polos *(Bare)* yang secara sengaja TIDAK menyertakan Token untuk menembus Zona Publik.
- Penangkapan Error cerdas: Membedakan respons \`422\` (Validasi) dari \`429\` (Terlalu sering mengirim), dan menampilkan pesan ramah yang berbeda.
- Layar Sukses terpisah *(Success Screen)* dengan animasi hijau *(Zoom-In)* untuk memberikan kepuasan psikologis bahwa laporan telah terkirim.

## Rules Compliance
- [x] Lolos Doktrin Arsitektur IAM (Rule 1.1): Layar formulir ini secara tegas TIDAK menyertakan \`Bearer Token\` untuk menjaga keselarasan dengan konfigurasi Zona Publik *(Unauthenticated)* di \`Routes/api.php\` (Issue 084).

Closes #86" \
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
Modul DeReporting memiliki satu layar unik yang berdiri di luar pagar Login: Formulir Pelaporan Masyarakat. Layar ini wajib menggunakan `axios` polos (BUKAN `@/lib/api.ts`) karena pengirimnya tidak memiliki Token otentikasi.

## Task

Kerjakan Issue #086 (Frontend — DeReporting Public Form).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/086-frontend-dereporting-public-form.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file di `frontend/src/app/lapor/page.tsx` (BUKAN di dalam `(dashboard)`!).
3. Salin Cetak Biru Formulir Publik secara utuh.
4. Pastikan kode menggunakan `import axios from "axios"` dan BUKAN `import { api }`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
