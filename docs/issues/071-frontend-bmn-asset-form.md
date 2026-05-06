# Issue #071 — Frontend — BMN Asset Form (Formulir Raksasa Aset)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `forms`, `module-bmn`
> **Priority**: 🔴 Critical (Satu-satunya Pintu Masuk Data Inventarisasi BPK)
> **Complexity**: 🔴 High (Manajemen Form Beban Berat & Antarmuka Multi-Tab)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #066, Issue #067, Issue #070

---

## Branch

```
issue/071-frontend-bmn-asset-form
```

## Deskripsi

*(Catatan: Tombol "Edit" dan "Registrasi Aset" pada Data Grid Issue 070 telah menunggu halaman ini).*

Selamat datang di titik paling kritis dalam input data BKSDA! Pada **Issue #071**, kita dihadapkan pada masalah formulir raksasa. Aset BMN memiliki belasan atribut wajib. Menyusun 15 kotak input berjejer ke bawah dalam satu halaman *(Single Scroll)* akan membuat psikologis admin BKSDA kelelahan sebelum mulai mengetik.

Solusi UX tingkat senior untuk masalah ini adalah **Segmentasi Berbasis Tab (Tabbed Interface)**.

Kita akan menggunakan komponen `Tabs` *(shadcn/ui)* untuk membelah formulir raksasa ini menjadi 3 wilayah yang ramah mata:
1. **Identitas Fisik** (Kode, NUP, Nama, Merek, Tahun).
2. **Kondisi & Valuasi** (Kondisi, Nilai Beli, Nilai Buku Terkini).
3. **Lokasi & Keterangan** (Ruangan Spesifik, Keterangan Tambahan).

Kecerdasan utama di layar ini adalah: Layar ini **berfungsi ganda**. Jika URL-nya `/bmn/assets/create`, layar ini kosong dan bertindak sebagai Pendaftar Aset Baru. Jika URL-nya `/bmn/assets/123-uuid`, layar ini secara ajaib menyedot data dari *Backend* dan bertindak sebagai Pengedit Aset (sekaligus memunculkan kotak isian wajib khusus bernama *Catatan Intelijen Audit* sesuai aturan di Issue 063).

---

## Acceptance Criteria

- [ ] Folder dinamis di Next.js diciptakan: `frontend/src/app/(dashboard)/bmn/assets/[id]/page.tsx`.
- [ ] Layar mengimplementasikan *React Hook Form* untuk menjaga kecepatan *Render* karena form yang sangat masif.
- [ ] Tersedia *Tab Navigation* membelah input menjadi 3 segmen (Identitas, Valuasi, Ekstra).
- [ ] Logika ganda *(Dual-Mode)*: Membedakan status Buat Baru *(Create)* dan Ubah *(Edit)* secara otomatis berdasarkan Parameter `id`.
- [ ] Hanya memunculkan kolom `keterangan_audit` saat dalam mode **Edit** (Sesuai SOP Pelacakan Audit di *Backend*).

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\bmn\assets\[id]\page.tsx`

Halaman ini sangat panjang karena memuat banyak tata letak, salinlah secara teliti:

```tsx
"use client";

import { useState, useEffect, use } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
    Save, ArrowLeft, Loader2, FileText, 
    Wallet, MapPin, AlertTriangle 
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // Pustaka notifikasi estetik

// Karena menggunakan Next.js 15+, param dinamis harus di-unwrap dengan React.use()
export default function BmnAssetFormPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const assetId = resolvedParams.id;
    const isEditMode = assetId !== "create";
    
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("identitas");

    // Engine Form Performa Tinggi
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        defaultValues: {
            kode_barang: "",
            nup: "",
            nama_barang: "",
            merk_tipe: "",
            tahun_perolehan: new Date().getFullYear(),
            kondisi: "Baik",
            nilai_perolehan: 0,
            nilai_buku: 0,
            lokasi_spesifik: "",
            keterangan: "",
            keterangan_audit: "" // Hanya terpakai saat Edit
        }
    });

    // Sedot Data jika Mode Edit
    useEffect(() => {
        if (isEditMode) {
            setIsLoading(true);
            api.get(`/bmn/assets/${assetId}`)
                .then((res) => {
                    const data = res.data.data;
                    reset({
                        kode_barang: data.kode_barang,
                        nup: data.nup,
                        nama_barang: data.nama_barang,
                        merk_tipe: data.merk_tipe || "",
                        tahun_perolehan: data.tahun_perolehan,
                        kondisi: data.kondisi,
                        nilai_perolehan: data.nilai_perolehan,
                        nilai_buku: data.nilai_buku,
                        lokasi_spesifik: data.lokasi_spesifik || "",
                        keterangan: data.keterangan || "",
                        keterangan_audit: "" 
                    });
                })
                .catch(() => toast.error("Gagal menarik arsip aset dari Database."))
                .finally(() => setIsLoading(false));
        }
    }, [assetId, isEditMode, reset]);

    // Eksekutor API
    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            if (isEditMode) {
                // Di Issue 065 FormRequest, jika nilai perolehan diganti, keterangan_audit wajib untuk rekam jejak
                if (!data.keterangan_audit) {
                    toast.error("Wajib mengisi Alasan Revisi (Audit) saat mengubah data fisik Aset BMN!");
                    setIsLoading(false);
                    return;
                }
                await api.put(`/bmn/assets/${assetId}`, data);
                toast.success("Catatan revisi fisik/nilai berhasil diabadikan.");
            } else {
                await api.post('/bmn/assets', data);
                toast.success("Registrasi BMN Baru telah sukses dibukukan.");
            }
            router.push('/bmn/assets');
        } catch (error: any) {
            // Menangkap lemparan 422 Unprocessable Entity dari FormRequest (Issue 065)
            const errMsg = error.response?.data?.message || error.response?.data?.error || "Terjadi benturan sistem.";
            toast.error(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header & Tombol Kembali */}
            <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
                <Link href="/bmn/assets" className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800">
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        {isEditMode ? "Revisi Buku Induk Aset" : "Pendaftaran Aset BMN Baru"}
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Harap pastikan KODE BARANG dan NUP selaras dengan Surat Keputusan (SK) BPK.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                {/* ---------------- TABS NAVIGATION ---------------- */}
                <div className="flex gap-2 p-1 bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-x-auto scrollbar-hide">
                    <button type="button" onClick={() => setActiveTab("identitas")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === "identitas" ? "bg-zinc-800 text-emerald-400 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}>
                        <FileText className="w-4 h-4" /> 1. Identitas Fisik
                    </button>
                    <button type="button" onClick={() => setActiveTab("valuasi")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === "valuasi" ? "bg-zinc-800 text-emerald-400 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}>
                        <Wallet className="w-4 h-4" /> 2. Kondisi & Valuasi Keuangan
                    </button>
                    <button type="button" onClick={() => setActiveTab("lokasi")} className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === "lokasi" ? "bg-zinc-800 text-emerald-400 shadow-md" : "text-zinc-500 hover:text-zinc-300"}`}>
                        <MapPin className="w-4 h-4" /> 3. Lokasi Penyimpanan
                    </button>
                </div>

                {/* ---------------- AREA KANVAS FORM ---------------- */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl relative min-h-[400px]">
                    
                    {/* Tab 1: Identitas */}
                    <div className={activeTab === "identitas" ? "block animate-in fade-in duration-300" : "hidden"}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Kode Barang <span className="text-red-500">*</span></label>
                                <input {...register("kode_barang", { required: true })} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Misal: 3.02.01.01.001" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">NUP (No. Urut Pendafataran) <span className="text-red-500">*</span></label>
                                <input {...register("nup", { required: true })} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Misal: 0001" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Nama Spesifik Barang <span className="text-red-500">*</span></label>
                                <input {...register("nama_barang", { required: true })} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Misal: Sepeda Motor Trail Honda CRF 150L" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Merk / Tipe Barang</label>
                                <input {...register("merk_tipe")} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Misal: Honda / CRF" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Tahun Perolehan / Pembelian</label>
                                <input type="number" {...register("tahun_perolehan")} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="YYYY" />
                            </div>
                        </div>
                    </div>

                    {/* Tab 2: Valuasi */}
                    <div className={activeTab === "valuasi" ? "block animate-in fade-in duration-300" : "hidden"}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Kondisi Fisik Terkini <span className="text-red-500">*</span></label>
                                <select {...register("kondisi")} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none appearance-none cursor-pointer">
                                    <option value="Baik">Baik (Berfungsi Penuh)</option>
                                    <option value="Rusak Ringan">Rusak Ringan (Butuh Servis Minor)</option>
                                    <option value="Rusak Berat">Rusak Berat (Tidak Layak Pakai)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Nilai Perolehan (Harga Asli Beli) Rp. <span className="text-red-500">*</span></label>
                                <input type="number" step="0.01" {...register("nilai_perolehan", { required: true })} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Nilai Buku (Valuasi Setelah Menyusut) Rp.</label>
                                <input type="number" step="0.01" {...register("nilai_buku")} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-mono focus:ring-1 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                    </div>

                    {/* Tab 3: Ekstra */}
                    <div className={activeTab === "lokasi" ? "block animate-in fade-in duration-300" : "hidden"}>
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Lokasi Spesifik Aset Berada</label>
                                <input {...register("lokasi_spesifik")} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Misal: Gudang Belakang / Loker Resort 2" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase">Keterangan Umum / Fitur</label>
                                <textarea {...register("keterangan")} rows={3} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500 outline-none resize-none" placeholder="Tuliskan spesifikasi warna, plat nomor, atau no rangka di sini..." />
                            </div>
                        </div>
                    </div>

                    {/* ---------------- AUDIT INTELIJEN KHUSUS EDIT MODE ---------------- */}
                    {isEditMode && (
                        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-4 animate-in slide-in-from-bottom-2">
                            <div className="shrink-0 mt-1">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <label className="text-xs font-black text-red-400 uppercase tracking-wider">Rekam Jejak Intelijen Audit (Wajib) <span className="text-white">*</span></label>
                                <p className="text-xs text-red-500/80 mb-2">Karena ini adalah pengeditan (bukan pencatatan baru), sistem pengawas *Backend* mewajibkan Anda mengisi alasan mengapa Harga/Kondisi fisik aset ini Anda rubah!</p>
                                <input {...register("keterangan_audit")} className="w-full bg-red-950/30 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-200 focus:ring-1 focus:ring-red-500 outline-none placeholder:text-red-500/40 text-sm" placeholder="Misal: Depresiasi nilai harga penyusutan tahun 2026..." />
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Eksekusi */}
                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isEditMode ? "Simpan Revisi Aset" : "Terbitkan Registrasi Aset"}
                    </button>
                </div>

            </form>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Kenapa *React* mengeluh bahwa parameter URL di Next.js 15 harus menunggu *(Awaited)*?

**Artinya:** Di Next.js versi >=15, parameter *Route* (seperti `[id]`) tidak lagi sinkron *(Synchronous)*.
**Solusi:** Formasi komponen yang ditulis di atas sudah mematuhi kaidah baru tersebut dengan menggunakan perintah ajaib bawaan React 19: `const resolvedParams = use(params);`. Pastikan kamu tidak menghapus baris `import { use } from "react";`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): architect dual-mode tabbed form interface for complex asset ingestion" \
  --body "Membangun formulir raksasa interaktif yang memadukan kapabilitas *Create* dan *Update* (Dual-Mode). Meringankan beban psikologis pengisian 15+ atribut melalui isolasi segmen berbasis *Tabs*, dilengkapi reaktivitas kotak Audit Korupsi otomatis. Detail di docs/issues/071-frontend-bmn-asset-form.md" \
  --label "frontend,ui,forms,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/071-frontend-bmn-asset-form
```

### Step 3: Kerjakan

Tuangkan cetak biru raksasa ini ke alamat penampung Parameter URL Dinamis di `src/app/(dashboard)/bmn/assets/[id]/page.tsx`. Perhatikan penggunaan tanda kurung siku `[id]` pada penamaan folder! Ini krusial bagi arsitektur *Next.js Router*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): architect dual-mode tabbed form interface for complex asset ingestion (#71)"
git push -u origin issue/071-frontend-bmn-asset-form
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): architect dual-mode tabbed form interface for complex asset ingestion (#71)" \
  --body "## Summary
Pembangkitan Gerbang Pemasukan *(Ingestion)* data pusat untuk Modul BMN. Didesain secara ergonomis guna menaklukkan kompleksitas atribut barang negara.

## Changes
- Pembuatan antarmuka formulir reaktif ganda berpondasi **React Hook Form**. Melayani Pendaftaran Aset Baru (\`/create\`) maupun Koreksi Buku Induk (\`/123-uuid\`).
- Implementasi Segmentasi Visual 3 Dimensi (Identitas Fisik, Valuasi Uang, Pemetaan Lokasi) melalui modifikasi *State Tabulation*.
- Pemanggilan otomatis dan pewajiban isi Kolom *Intelijen Audit* manakala Antarmuka mendeteksi mode Operasional *Update* (Edit Mode).

## Rules Compliance
- [x] Sesuai Arsitektur Performa (Frontend Rules 7.5): Terhindarnya dari fenomena *Re-render* beruntun tiap kali tombol ditekan, berkat pemisahan kendali *Controlled* (React Hook Form) atas puluhan Input Text.

Closes #71" \
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
Operator BKSDA akan memasukkan ribuan aset BPK. Form yang memuat belasan input tidak boleh menjemukan. Kita perlu membangun form 3 lapis bertingkat menggunakan teknik antarmuka mutakhir (Tabs).

## Task

Kerjakan Issue #071 (Frontend — BMN Asset Form).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/071-frontend-bmn-asset-form.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke wilayah pembuatan URL: Buat folder bernama persis `[id]` di dalam `frontend/src/app/(dashboard)/bmn/assets/`.
3. Pahat file `page.tsx` di dalamnya dan lekatkan blok Kode Formulir Ganda (*Dual-Mode*) tersebut.
4. Jangan menghapus kotak merah Audit Intelijen yang diletakkan di barisan dasar. Ini esensial untuk koneksi API ke Backend.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
