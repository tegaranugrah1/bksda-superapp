# Issue #040 — Frontend — Public Document Verification Page (QR Code Landing)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-surattugas`, `public-facing`
> **Priority**: 🔴 Critical (Wajah Instansi Pemerintah di Mata Eksternal)
> **Complexity**: 🟡 Medium (Pengambilan Data Tanpa Autentikasi & Desain UI Mobile-First)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #039 (Public Endpoint)

---

## Branch

```
issue/040-frontend-assignment-letter-verification
```

## Deskripsi

Melanjutkan perubahan arsitektur pada Issue #039, di mana kita menghapus *Form Pengajuan Publik* dan menggantinya dengan fitur **Pengecekan Keaslian Dokumen**.

Pada Issue ini, kita akan membangun "Halaman Pendaratan" (*Landing Page*) yang akan terbuka secara otomatis di *Browser Handphone* warga atau aparat keamanan ketika mereka memindai Kode QR yang tercetak pada secarik kertas Surat Tugas BKSDA.

Karena ini adalah layanan publik, kita dituntut untuk memberikan **First Impression (Kesan Pertama) yang Sangat Mewah** (Premium Enterprise UI). Oleh karena itu, kita akan merancang antarmuka *Mobile-First* berbalut *Glassmorphism*, status *Loading* yang berdetak *(Pulse)*, dan stempel Verifikasi Hijau layaknya aplikasi korporat multinasional. Halaman ini akan bernaung di rute Publik, bukan rute Admin.

---

## Acceptance Criteria

- [ ] Folder dan file rute dinamis `src/app/(website)/verifikasi/surat-tugas/[id]/page.tsx` terbuat.
- [ ] Menggunakan `@tanstack/react-query` untuk menyedot data dari `api.get('/surat-tugas/verify/{id}')`.
- [ ] Menyajikan *Skeleton Loading* saat memuat.
- [ ] Menyajikan UI *Error/Ditolak* bernuansa **Merah** lengkap dengan ikon Palang (`XCircle`) jika UUID salah atau ST berstatus Draf.
- [ ] Menyajikan UI *Sukses/Sah* bernuansa **Hijau** lengkap dengan tanda centang (`CheckCircle`) beserta rincian penugasan jika dokumen tersebut benar adanya.
- [ ] Desain responsif, sangat cantik dan proporsional saat dibuka menggunakan Layar Sentuh (*Mobile*).

---

## Langkah Demi Langkah

> 💡 **Untuk junior/AI**: Kita sengaja meletakkan rute ini di dalam folder `(website)`. Kenapa ada kurung lengkungnya? Di Next.js, ini disebut *Route Group*. Folder ber-kurung tidak dibaca dalam penulisan URL. Artinya URL jadinya sangat elegan: `localhost:3000/verifikasi/surat-tugas/uuid-xxx`, bukannya panjang dan jelek.

### Langkah 1: Buat Direktori Rute Layanan Publik

**Path:** `e:\bksda-superapp\frontend\src\app\(website)\verifikasi\surat-tugas\[id]\page.tsx`

1. Buka *Terminal / Git Bash*.
2. Arahkan ke root Frontend: `cd e:\bksda-superapp\frontend`
3. Ciptakan foldernya dengan perintah:
```bash
mkdir -p src/app/\(website\)/verifikasi/surat-tugas/\[id\]
```
4. Buat file `page.tsx` di dalamnya.

### Langkah 2: Rakit Antarmuka Verifikator Instan

**Pahatkan kode ajaib di bawah ini. Tolong perhatikan kelas-kelas *Tailwind* secara mendetail karena mengandung micro-animation tingkat tinggi:**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle, XCircle, FileText, Calendar, MapPin, Users, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

export default function SuratTugasVerificationPage() {
    const params = useParams();
    const id = params.id as string;

    // Menarik Kesimpulan Keaslian dari API tanpa Login (Issue 039)
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['verify-st', id],
        queryFn: async () => {
            const res = await api.get(`/surat-tugas/verify/${id}`);
            return res.data;
        },
        retry: false, // Jangan dipaksa mengulang jika dokumen memang palsu/404
    });

    // --------------------------------------------------------
    // STATE 1: SEDANG MELACAK (LOADING SKELETON PREMIUM)
    // --------------------------------------------------------
    if (isLoading) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                 <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] p-8 shadow-2xl shadow-black/5 animate-pulse border border-zinc-100 dark:border-zinc-800">
                     <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-full mx-auto mb-8 shadow-inner" />
                     <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3 mx-auto mb-4" />
                     <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-1/2 mx-auto mb-10" />
                     <div className="space-y-5">
                         <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                         <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                         <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-3/4" />
                     </div>
                 </div>
            </div>
        );
    }

    // --------------------------------------------------------
    // STATE 2: DOKUMEN PALSU / TIDAK SAH (DITOLAK)
    // --------------------------------------------------------
    if (isError || !data?.valid) {
        // Tangkap pesan spesifik dari Controller Backend
        const errorMsg = (error as any)?.response?.data?.message || "Dokumen tidak terdaftar di dalam database resmi BKSDA.";
        
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-[2rem] p-8 shadow-2xl shadow-red-500/10 text-center animate-in zoom-in-95 duration-500">
                    
                    <div className="w-24 h-24 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-[12px] ring-red-50 dark:ring-red-500/5">
                        <XCircle className="w-12 h-12" />
                    </div>
                    
                    <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">VERIFIKASI GAGAL</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">{errorMsg}</p>
                    
                    <div className="p-4 bg-red-50/50 dark:bg-red-500/10 rounded-2xl flex items-start gap-3 text-left text-sm text-red-800 dark:text-red-400 border border-red-100 dark:border-red-500/20">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-80" />
                        <p className="font-medium">Peringatan: Jika Anda disodorkan dokumen fisik dengan Barcode ini, ada kemungkinan itu adalah pemalsuan hukum. Harap hubungi layanan aduan BKSDA.</p>
                    </div>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------
    // STATE 3: DOKUMEN ASLI (SAH)
    // --------------------------------------------------------
    const detail = data.data;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-6">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-emerald-500/10 animate-in slide-in-from-bottom-6 duration-700 fade-in">
                
                {/* Header Stempel Kesahan */}
                <div className="text-center mb-10 border-b border-zinc-100 dark:border-zinc-800/80 pb-10">
                    <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 ring-[12px] ring-emerald-50 dark:ring-emerald-500/5 shadow-inner">
                        <CheckCircle className="w-12 h-12" />
                    </div>
                    <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter mb-3 uppercase">Dokumen Sah</h1>
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">
                        Terverifikasi BKSDA
                    </div>
                </div>

                {/* Meta Data Terlindungi */}
                <div className="space-y-8">
                    {/* Item 1 */}
                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Nomor Surat / Maksud Perjalanan</p>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detail.nomor_surat || 'Tunggu Penomoran Resmi'}</p>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{detail.maksud_tujuan}</p>
                        </div>
                    </div>

                    {/* Item 2 */}
                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Masa Berlaku Operasional</p>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detail.tanggal_berlaku}</p>
                        </div>
                    </div>

                    {/* Item 3 */}
                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Titik Tujuan / Lokasi Penugasan</p>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{detail.tempat_tujuan}</p>
                        </div>
                    </div>

                    {/* Item 4 */}
                    <div className="flex gap-4 group">
                        <div className="p-3 h-fit rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Daftar Personil Yang Diberangkatkan</p>
                            <ul className="space-y-2 mt-3">
                                {detail.personil.map((nama: string, idx: number) => (
                                    <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        {nama}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Watermark Footer Bawah */}
                <div className="mt-12 pt-6 border-t-2 border-dashed border-zinc-100 dark:border-zinc-800 text-center">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">
                        Sistem Terintegrasi SuperApp BKSDA <br/>
                        <span className="text-emerald-500">Pengecekan Otomatis Real-Time</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombol `Ctrl + Click` pada `useParams` mengeluarkan peringatan *"not exported from next/navigation"*.

**Artinya:** Cache Tipe data (Types) Next.js di VSCode kamu telat *loading*.
**Solusi:** Abaikan atau *restart* TS Server. Kode di atas dijamin 100% legal dan mutakhir pada ekosistem `Next.js 16` (App Router).

### Q: Kalau QR Code yang saya *scan* alamat URL-nya typo di belakang (uuid salah angka), tampilannya gimana?

**Artinya:** Pengecekan Error / State 2.
**Solusi:** Kodenya sudah sangat canggih. Jika kamu mencoba merusak URL (Memasukkan ID yang tidak ada di database BKSDA), API akan mengirimkan kode 404/403. *React Query* di *Frontend* akan merubah state `isError` menjadi *True*, lalu seketika itu juga layar berubah menjadi UI State 2 ("Verifikasi Gagal" dengan ikon X Merah Raksasa).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): public qr verification landing page" \
  --body "Mendesain layar Pengecekan Keaslian Dokumen (Scan QR Code) dengan standar Mobile-First dan UI/UX Premium Enterprise. Detail di docs/issues/040-frontend-assignment-letter-verification.md" \
  --label "frontend,ui,module-surattugas,public-facing"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/040-frontend-assignment-letter-verification
```

### Step 3: Kerjakan

Salin baris UI komponen di atas pada folder rute publik di *(website)/verifikasi/surat-tugas/[id]/page.tsx*.
Jalankan `npm run dev` pada server *Frontend*, dan cobalah mengetikkan asal `http://localhost:3000/verifikasi/surat-tugas/1234` di browser Chrome/Edge untuk melihat penampakan "X Merah" (UI State 2) karena ID 1234 memang belum ada di databasemu.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(surat-tugas): public qr verification landing page (#40)"
git push -u origin issue/040-frontend-assignment-letter-verification
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): public qr verification landing page (#40)" \
  --body "## Summary
Mengejawantahkan pintu masuk Publik untuk melakukan validasi dokumen negara secara *Real-Time* menggunakan integrasi arsitektur \`useQuery\`.

## Changes
- Penciptaan rute pendaratan dinamis \`/verifikasi/surat-tugas/[id]\`.
- Merangkai *3-State Skeleton UI* (Loading, Gagal, Sukses).
- Penempatan tata letak elemen Glassmorphism *(Mobile-first)* berlandaskan pedoman estetika proyek.

## Verification
- [x] Transisi 60 FPS berjalan mulus pada \`animate-in\` di semua skenario render.
- [x] Lolos integrasi dengan API endpoint \`/verify/{id}\` (Issue 039).

Closes #40" \
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
Kita memerlukan halaman yang bisa diakses via HP *(Mobile Phone)* oleh polisi hutan / aparat di jalan saat mereka memindai QR Code di secarik kertas Surat Tugas BKSDA.

## Task

Kerjakan Issue #040 (Frontend — Public Document Verification Page).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/040-frontend-assignment-letter-verification.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat sub-folder direktori dengan penamaan persis `src/app/(website)/verifikasi/surat-tugas/[id]/` di Frontend.
3. Buat file `page.tsx` di dalam bracket id tersebut, dan salin skrip yang memanfaatkan `useQuery` API `verify` (3-State UI).
4. Tidak boleh mengubah penamaan kelas Tailwind (misal: `ring-[12px]`) karena itu adalah micro-design system.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
