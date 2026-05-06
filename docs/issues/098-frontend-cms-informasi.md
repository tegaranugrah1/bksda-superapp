# Issue #098 — Frontend — CMS Informasi / Berita (Ruang Redaksi Digital BKSDA)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-cms`
> **Priority**: 🔴 Critical (Konten Berita = Jantung Website Publik BKSDA)
> **Complexity**: 🔴 High (Rich Text Editor + Thumbnail Upload + Toggle Publikasi)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #097

---

## Branch

```
issue/098-frontend-cms-informasi
```

## Deskripsi

Halaman **Berita / Informasi** adalah ruang paling ramai di Panel Admin CMS. Di sinilah Humas BKSDA menulis Siaran Pers, mengunggah foto thumbnail, dan menekan tombol "Terbitkan" yang akan menampilkan berita tersebut ke jutaan pengunjung website.

**Tantangan Arsitektur:**
1. **Rich Text Editor**: Admin harus bisa menulis konten HTML (Bold, Italic, Heading, Link, Gambar) di dalam kolom `konten`. Kita tidak bisa menggunakan `<textarea>` biasa karena ia hanya menyimpan teks polos. Solusinya: menggunakan pustaka *Rich Text Editor* ringan seperti `react-quill` atau `@tiptap/react`.
2. **Toggle Terbit/Draft**: Admin harus bisa menekan 1 tombol untuk mengubah status berita dari "Draft" menjadi "Terbit" atau sebaliknya — tanpa membuka formulir edit.
3. **Preview Thumbnail**: Saat Admin memilih gambar thumbnail, pratinjau gambar harus langsung muncul di formulir sebelum dikirim ke server.

---

## Acceptance Criteria

- [ ] Folder diciptakan: `frontend/src/app/(dashboard)/cms/informasi/`.
- [ ] Tersedia `page.tsx` (Tabel Daftar Berita) dengan kolom: Thumbnail, Judul, Kategori, Status (Draft/Terbit), Tanggal, Aksi.
- [ ] Tersedia tombol "Toggle Publish" per baris yang memanggil `PATCH /toggle-publish`.
- [ ] Tersedia halaman/drawer `create` untuk menulis berita baru dengan Rich Text Editor.
- [ ] Tersedia badge visual: Hijau untuk "Terbit", Kuning untuk "Draft".

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Tabel Daftar Berita
**Path:** `frontend/src/app/(dashboard)/cms/informasi/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Newspaper, Plus, Search, Loader2, Eye, EyeOff, Pencil, Trash2
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import Link from "next/link";

export default function CMSInformasiPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Penarikan Data Berita
    const { data: response, isLoading } = useQuery({
        queryKey: ["cms-informasi", debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get("/cms/admin/informasi", {
                params: { search: debouncedSearch || undefined, page },
            });
            return res.data;
        },
        keepPreviousData: true,
    });

    // Mutasi: Toggle Status Publikasi
    const toggleMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/cms/admin/informasi/${id}/toggle-publish`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
            toast.success("Status publikasi berita berhasil diubah.");
        },
        onError: () => toast.error("Gagal mengubah status."),
    });

    // Mutasi: Hapus Berita
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/cms/admin/informasi/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
            toast.success("Berita berhasil dihapus.");
        },
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Newspaper className="w-8 h-8 text-teal-500" /> Kelola Berita
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Tulis, terbitkan, dan kelola seluruh konten berita website BKSDA.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-teal-500 transition-colors" />
                        <input type="text" placeholder="Cari judul berita..." value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all w-56 placeholder:text-zinc-600" />
                    </div>
                    <Link href="/cms/informasi/create"
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all">
                        <Plus className="w-4 h-4" /> Tulis Berita
                    </Link>
                </div>
            </div>

            {/* Tabel */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Berita</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Kategori</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Views</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-12 text-center text-teal-500">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                    <span className="text-sm font-bold uppercase tracking-widest">Memuat Arsip Berita...</span>
                                </td></tr>
                            ) : response?.data?.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-zinc-500">Belum ada berita.</td></tr>
                            ) : (
                                response?.data?.map((berita: any) => (
                                    <tr key={berita.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {/* Mini Thumbnail */}
                                                <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden shrink-0">
                                                    {berita.thumbnail_path ? (
                                                        <img src={`${process.env.NEXT_PUBLIC_STORAGE_URL}/${berita.thumbnail_path}`}
                                                            alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Newspaper className="w-5 h-5 text-zinc-600" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-zinc-200 text-sm max-w-[250px] truncate">{berita.judul}</p>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                                        {berita.published_at
                                                            ? new Date(berita.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
                                                            : "Belum diterbitkan"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-1 rounded-lg border border-teal-500/20 font-medium">
                                                {berita.category?.nama || "Tanpa Kategori"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {berita.is_published ? (
                                                <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg border border-emerald-500/20 font-bold">Terbit</span>
                                            ) : (
                                                <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg border border-amber-500/20 font-bold">Draft</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-zinc-400 font-mono">{berita.views_count || 0}</td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-1">
                                                {/* Toggle Publikasi */}
                                                <button onClick={() => toggleMutation.mutate(berita.id)}
                                                    className="p-2 hover:bg-teal-500/10 rounded-lg transition-colors group" title={berita.is_published ? "Tarik ke Draft" : "Terbitkan"}>
                                                    {berita.is_published
                                                        ? <EyeOff className="w-4 h-4 text-zinc-500 group-hover:text-amber-400" />
                                                        : <Eye className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400" />}
                                                </button>
                                                {/* Edit */}
                                                <Link href={`/cms/informasi/${berita.id}`}
                                                    className="p-2 hover:bg-teal-500/10 rounded-lg transition-colors group">
                                                    <Pencil className="w-4 h-4 text-zinc-500 group-hover:text-teal-400" />
                                                </Link>
                                                {/* Hapus */}
                                                <button onClick={() => { if (confirm("Yakin hapus berita ini?")) deleteMutation.mutate(berita.id); }}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group">
                                                    <Trash2 className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Hal. {page} dari {response?.last_page || 1}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

### 2. Cetak Biru Formulir Tulis Berita
**Path:** `frontend/src/app/(dashboard)/cms/informasi/create/page.tsx`

```tsx
"use client";

import { useState, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Newspaper, Save, ArrowLeft, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// Dynamic Import: Rich Text Editor hanya dimuat di sisi klien (Menghindari SSR crash)
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

export default function CreateInformasiPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [judul, setJudul] = useState("");
    const [konten, setKonten] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [sumber, setSumber] = useState("");
    const [isPublished, setIsPublished] = useState(false);
    const [thumbnail, setThumbnail] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Ambil daftar Kategori untuk Dropdown
    const { data: categories } = useQuery({
        queryKey: ["cms-categories"],
        queryFn: async () => (await api.get("/cms/admin/categories")).data?.data || [],
    });

    // Preview Thumbnail secara lokal (Tanpa upload dulu)
    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbnail(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!judul.trim()) { toast.error("Judul berita wajib diisi."); return; }
        if (!konten.trim()) { toast.error("Konten berita wajib diisi."); return; }

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append("judul", judul);
            payload.append("konten", konten);
            if (categoryId) payload.append("category_id", categoryId);
            if (sumber) payload.append("sumber", sumber);
            payload.append("is_published", isPublished ? "1" : "0");
            if (thumbnail) payload.append("thumbnail", thumbnail);

            await api.post("/cms/admin/informasi", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success(isPublished ? "Berita berhasil diterbitkan!" : "Berita disimpan sebagai Draft.");
            queryClient.invalidateQueries({ queryKey: ["cms-informasi"] });
            router.push("/cms/informasi");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Gagal menyimpan berita.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <Newspaper className="w-7 h-7 text-teal-500" /> Tulis Berita Baru
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">Isi formulir di bawah untuk membuat konten berita.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Judul */}
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Judul Berita *</label>
                    <input type="text" value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={500}
                        placeholder="Contoh: BKSDA Lepasliarkan 5 Ekor Elang Jawa ke Habitat Asli"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-600" />
                </div>

                {/* Kategori + Sumber (2 Kolom) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Kategori</label>
                        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all">
                            <option value="">— Pilih Kategori —</option>
                            {categories?.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>{cat.nama}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Sumber</label>
                        <input type="text" value={sumber} onChange={(e) => setSumber(e.target.value)} maxLength={255}
                            placeholder="Opsional: Kompas.com"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-600" />
                    </div>
                </div>

                {/* Thumbnail Upload + Preview */}
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Thumbnail</label>
                    <div className="flex items-start gap-4">
                        <label className="flex-1 flex items-center justify-center gap-3 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-6 cursor-pointer hover:border-teal-500 transition-all group">
                            <ImagePlus className="w-6 h-6 text-zinc-500 group-hover:text-teal-400 transition-colors" />
                            <span className="text-sm text-zinc-500 group-hover:text-zinc-300">{thumbnail ? thumbnail.name : "Klik untuk unggah gambar"}</span>
                            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailChange} />
                        </label>
                        {thumbnailPreview && (
                            <img src={thumbnailPreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-zinc-700" />
                        )}
                    </div>
                </div>

                {/* Rich Text Editor */}
                <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Konten Berita *</label>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden [&_.ql-toolbar]:!bg-zinc-800 [&_.ql-toolbar]:!border-zinc-700 [&_.ql-container]:!border-zinc-700 [&_.ql-editor]:!text-white [&_.ql-editor]:!min-h-[300px]">
                        <ReactQuill theme="snow" value={konten} onChange={setKonten}
                            placeholder="Tulis konten berita di sini..." />
                    </div>
                </div>

                {/* Toggle Terbitkan */}
                <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <input type="checkbox" id="publish" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)}
                        className="w-4 h-4 rounded accent-teal-500" />
                    <label htmlFor="publish" className="text-sm text-zinc-300 font-medium cursor-pointer">
                        Langsung terbitkan setelah disimpan
                    </label>
                </div>

                {/* Tombol Simpan */}
                <button type="submit" disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isSubmitting ? "Menyimpan..." : isPublished ? "Terbitkan Berita" : "Simpan sebagai Draft"}
                </button>
            </form>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Rich Text Editor menampilkan Error `ReferenceError: document is not defined`!

**Artinya:** Editor mencoba berjalan di server (*SSR*), padahal ia butuh `document` yang hanya ada di *Browser*.
**Solusi:** Perhatikan baris `dynamic(() => import("react-quill"), { ssr: false })`. Kata kunci `ssr: false` memberitahu Next.js agar TIDAK mencoba me-*render* komponen ini di sisi server. Jika kamu lupa menambahkan `{ ssr: false }`, error tersebut pasti muncul.

### Q: Instalasi `react-quill` gagal atau versi tidak kompatibel?

**Solusi:** Jalankan:
```bash
npm install react-quill@latest
```
Jika terjadi konflik versi React, gunakan alternatif modern:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link
```
TipTap lebih modern dan fleksibel, namun membutuhkan konfigurasi tambahan.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): construct news editorial interface with rich text editor and publication toggle" \
  --body "Membangun Ruang Redaksi Digital BKSDA. Mengintegrasikan Rich Text Editor (react-quill) untuk penulisan konten HTML, pratinjau Thumbnail lokal, dan sistem *Toggle Publish* satu-klik. Detail di docs/issues/098-frontend-cms-informasi.md" \
  --label "frontend,ui,module-cms"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/098-frontend-cms-informasi
```

### Step 3: Kerjakan

Instal Rich Text Editor: `npm install react-quill`. Lalu pahat `page.tsx` (Tabel) dan `create/page.tsx` (Form).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(cms): construct news editorial interface with rich text editor and publication toggle (#98)"
git push -u origin issue/098-frontend-cms-informasi
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(cms): construct news editorial interface with rich text editor and publication toggle (#98)" \
  --body "## Summary
Pembangunan Ruang Redaksi Berita BKSDA — layar paling kaya fitur di Panel Admin CMS.

## Changes
- Tabel Daftar Berita dengan kolom Thumbnail mini, Kategori, Status (Draft/Terbit), dan Views Count.
- Tombol Toggle Publikasi (\`useMutation\` → \`PATCH /toggle-publish\`) yang mengubah status tanpa membuka formulir edit.
- Formulir Tulis Berita dengan *Rich Text Editor* (\`react-quill\` + \`dynamic import SSR:false\`).
- Pratinjau Thumbnail lokal (\`URL.createObjectURL\`) sebelum upload ke server.

## Rules Compliance
- [x] Lolos Doktrin Anti SSR Crash: Rich Text Editor di-import secara dinamis dengan \`ssr: false\`.

Closes #98" \
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
Halaman Berita CMS adalah yang paling kompleks: butuh Rich Text Editor, Thumbnail Preview, dan Toggle Publish. Pustaka Rich Text yang digunakan: `react-quill` (HARUS di-import dengan `dynamic({ ssr: false })`).

## Task

Kerjakan Issue #098 (Frontend — CMS Informasi / Berita).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/098-frontend-cms-informasi.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Instal pustaka Rich Text: `npm install react-quill`.
3. Buat folder: `frontend/src/app/(dashboard)/cms/informasi/` dan `create/`.
4. Pahat `page.tsx` (Tabel Berita) — perhatikan tombol Toggle Publish per baris.
5. Pahat `create/page.tsx` (Form Tulis Berita) — WAJIB gunakan `dynamic import` untuk ReactQuill.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
