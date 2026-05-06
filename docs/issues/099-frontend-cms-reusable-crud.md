# Issue #099 — Frontend — CMS Reusable CRUD Pages (Mesin Cetak Halaman Otomatis)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `architecture`, `module-cms`
> **Priority**: 🔴 Critical (Membangun 12 Halaman Admin Sekaligus dalam 1 Issue)
> **Complexity**: 🟡 Medium (1 Komponen Pabrik + 12 Halaman Ultra-Tipis)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #098

---

## Branch

```
issue/099-frontend-cms-reusable-crud
```

## Deskripsi

Setelah mendirikan Halaman Berita (Issue 098), kita masih memiliki **12 halaman Admin** yang harus dibangun: Profil, Kawasan, TSL, Foto, Video, Link, Buku, Leaflet, Poster, Regulasi, Kepala, Kategori.

Jika kita menulis masing-masing secara manual, kita akan menghasilkan **~3600 baris kode** yang 90% identik. Ini melanggar Hukum DRY secara brutal.

**Solusi Arsitektur: Mesin Cetak Halaman (*Page Factory*)**

Kita akan membangun **1 Komponen Pabrik** bernama `CrudPageFactory` yang menerima konfigurasi (*Props*) dan secara otomatis mencetak:
- Tabel data dengan Pencarian + Pagination
- Drawer formulir Tambah/Edit
- Tombol Hapus dengan konfirmasi
- Upload file (jika entitas memiliki gambar)

Kemudian, setiap halaman Admin cukup menulis **15-25 baris** yang memasukkan konfigurasi berbeda ke dalam Pabrik tersebut. Persis seperti pola `FilteredReportTable` di Issue 089!

---

## Acceptance Criteria

- [ ] Tersedia komponen: `frontend/src/app/(dashboard)/cms/_components/CrudPageFactory.tsx`.
- [ ] Tersedia komponen: `frontend/src/app/(dashboard)/cms/_components/CrudFormDrawer.tsx`.
- [ ] Tersedia 12 halaman `page.tsx` masing-masing hanya 15-25 baris kode.
- [ ] Setiap halaman memiliki fitur: Pencarian, Pagination, Tambah, Edit, Hapus.
- [ ] Formulir secara otomatis mendeteksi field bertipe `file` dan menggunakan `multipart/form-data`.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Konfigurasi Halaman (Interface)
**Path:** `frontend/src/app/(dashboard)/cms/_components/types.ts`

```typescript
import type { LucideIcon } from "lucide-react";

/** Definisi satu kolom di Tabel */
export interface CrudColumn {
    key: string;          // Nama properti di objek data (misal: "nama", "judul")
    label: string;        // Label header kolom (misal: "Nama Kawasan")
    render?: (value: any, row: any) => React.ReactNode; // Custom render (untuk badge, gambar, dll)
}

/** Definisi satu field di Formulir */
export interface CrudField {
    key: string;          // Nama properti yang dikirim ke API
    label: string;        // Label input
    type: "text" | "textarea" | "select" | "file" | "number" | "checkbox" | "url";
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
    accept?: string;      // Untuk file: "image/*", ".pdf", dll
    options?: { value: string; label: string }[]; // Untuk select dropdown
}

/** Konfigurasi lengkap 1 halaman CRUD */
export interface CrudPageConfig {
    title: string;        // "Kelola Kawasan Konservasi"
    subtitle: string;     // "Daftar kawasan hutan lindung..."
    icon: LucideIcon;
    accentColor: string;
    apiEndpoint: string;  // "/cms/admin/kawasan"
    columns: CrudColumn[];
    fields: CrudField[];
    searchPlaceholder?: string;
}
```

### 2. Cetak Biru Mesin Cetak Halaman (Page Factory)
**Path:** `frontend/src/app/(dashboard)/cms/_components/CrudPageFactory.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, Search, Loader2, Pencil, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import CrudFormDrawer from "./CrudFormDrawer";
import type { CrudPageConfig } from "./types";

interface Props {
    config: CrudPageConfig;
}

export default function CrudPageFactory({ config }: Props) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);

    const queryKey = [`cms-crud-${config.apiEndpoint}`, debouncedSearch, page];

    // Penarikan Data
    const { data: response, isLoading } = useQuery({
        queryKey,
        queryFn: async () => {
            const res = await api.get(config.apiEndpoint, {
                params: { search: debouncedSearch || undefined, page },
            });
            return res.data;
        },
        keepPreviousData: true,
    });

    // Mutasi Hapus
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`${config.apiEndpoint}/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey });
            toast.success("Data berhasil dihapus.");
        },
        onError: () => toast.error("Gagal menghapus. Data mungkin masih terkait data lain."),
    });

    // Handler buka form Edit
    const handleEdit = (record: any) => {
        setEditingRecord(record);
        setDrawerOpen(true);
    };

    // Handler buka form Tambah
    const handleCreate = () => {
        setEditingRecord(null);
        setDrawerOpen(true);
    };

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-black text-white tracking-tight flex items-center gap-3`}>
                        <config.icon className={`w-8 h-8 text-${config.accentColor}-500`} /> {config.title}
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">{config.subtitle}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input type="text" placeholder={config.searchPlaceholder || "Cari..."} value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className={`pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-${config.accentColor}-500 transition-all w-56 placeholder:text-zinc-600`} />
                    </div>
                    <button onClick={handleCreate}
                        className={`flex items-center gap-2 bg-${config.accentColor}-600 hover:bg-${config.accentColor}-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all`}>
                        <Plus className="w-4 h-4" /> Tambah
                    </button>
                </div>
            </div>

            {/* Tabel */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                {config.columns.map(col => (
                                    <th key={col.key} className="p-4 text-xs font-bold text-zinc-400 uppercase">{col.label}</th>
                                ))}
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr><td colSpan={config.columns.length + 1} className="p-12 text-center">
                                    <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-3 text-${config.accentColor}-500`} />
                                </td></tr>
                            ) : response?.data?.length === 0 ? (
                                <tr><td colSpan={config.columns.length + 1} className="p-12 text-center text-zinc-500">Belum ada data.</td></tr>
                            ) : (
                                response?.data?.map((row: any) => (
                                    <tr key={row.id} className="hover:bg-zinc-900/40 transition-colors">
                                        {config.columns.map(col => (
                                            <td key={col.key} className="p-4 text-sm text-zinc-300">
                                                {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "-")}
                                            </td>
                                        ))}
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => handleEdit(row)} className="p-2 hover:bg-teal-500/10 rounded-lg transition-colors group">
                                                    <Pencil className="w-4 h-4 text-zinc-500 group-hover:text-teal-400" />
                                                </button>
                                                <button onClick={() => { if(confirm("Yakin hapus?")) deleteMutation.mutate(row.id); }}
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
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Hal. {page}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Drawer Form */}
            <CrudFormDrawer
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setEditingRecord(null); }}
                config={config}
                editingRecord={editingRecord}
            />
        </div>
    );
}
```

### 3. Cetak Biru Drawer Form Generik
**Path:** `frontend/src/app/(dashboard)/cms/_components/CrudFormDrawer.tsx`

```tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CrudPageConfig } from "./types";

interface Props {
    open: boolean;
    onClose: () => void;
    config: CrudPageConfig;
    editingRecord: any | null;
}

export default function CrudFormDrawer({ open, onClose, config, editingRecord }: Props) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [files, setFiles] = useState<Record<string, File>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!editingRecord;

    // Saat drawer terbuka untuk Edit, isi form dengan data lama
    useEffect(() => {
        if (editingRecord) {
            const initial: Record<string, any> = {};
            config.fields.forEach(f => { if (f.type !== "file") initial[f.key] = editingRecord[f.key] ?? ""; });
            setFormData(initial);
        } else {
            setFormData({});
        }
        setFiles({});
    }, [editingRecord, open]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const hasFiles = Object.keys(files).length > 0;
            let payload: any;

            if (hasFiles) {
                // Jika ada file, gunakan FormData (multipart)
                payload = new FormData();
                Object.entries(formData).forEach(([k, v]) => { if (v !== undefined && v !== null) payload.append(k, String(v)); });
                Object.entries(files).forEach(([k, f]) => payload.append(k, f));
            } else {
                payload = formData;
            }

            const headers = hasFiles ? { "Content-Type": "multipart/form-data" } : {};

            if (isEditing) {
                await api.put(`${config.apiEndpoint}/${editingRecord.id}`, payload, { headers });
                toast.success("Data berhasil diperbarui.");
            } else {
                await api.post(config.apiEndpoint, payload, { headers });
                toast.success("Data berhasil ditambahkan.");
            }

            queryClient.invalidateQueries({ queryKey: [`cms-crud-${config.apiEndpoint}`] });
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Gagal menyimpan data.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto animate-in slide-in-from-right duration-300 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white">{isEditing ? "Edit Data" : "Tambah Data"}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {config.fields.map(field => (
                        <div key={field.key}>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">
                                {field.label} {field.required && "*"}
                            </label>
                            {field.type === "textarea" ? (
                                <textarea value={formData[field.key] || ""} onChange={(e) => setFormData(p => ({...p, [field.key]: e.target.value}))}
                                    rows={4} placeholder={field.placeholder} maxLength={field.maxLength}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all resize-none placeholder:text-zinc-600" />
                            ) : field.type === "select" ? (
                                <select value={formData[field.key] || ""} onChange={(e) => setFormData(p => ({...p, [field.key]: e.target.value}))}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all">
                                    <option value="">— Pilih —</option>
                                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            ) : field.type === "file" ? (
                                <input type="file" accept={field.accept || "image/*"}
                                    onChange={(e) => { if(e.target.files?.[0]) setFiles(p => ({...p, [field.key]: e.target.files![0]})); }}
                                    className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-500 file:cursor-pointer" />
                            ) : field.type === "checkbox" ? (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={!!formData[field.key]} onChange={(e) => setFormData(p => ({...p, [field.key]: e.target.checked}))}
                                        className="w-4 h-4 rounded accent-teal-500" />
                                    <span className="text-sm text-zinc-300">{field.placeholder}</span>
                                </label>
                            ) : (
                                <input type={field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
                                    value={formData[field.key] || ""} onChange={(e) => setFormData(p => ({...p, [field.key]: e.target.value}))}
                                    placeholder={field.placeholder} maxLength={field.maxLength}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all placeholder:text-zinc-600" />
                            )}
                        </div>
                    ))}
                    <button type="submit" disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-4">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {isSubmitting ? "Menyimpan..." : "Simpan"}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

### 4. Contoh Halaman Ultra-Tipis (15-25 Baris)

**Path:** `frontend/src/app/(dashboard)/cms/kawasan/page.tsx`
```tsx
import { MapPin } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Kelola Kawasan Konservasi",
    subtitle: "Data kawasan hutan lindung, cagar alam, dan suaka margasatwa.",
    icon: MapPin,
    accentColor: "teal",
    apiEndpoint: "/cms/admin/kawasan",
    searchPlaceholder: "Cari nama kawasan...",
    columns: [
        { key: "nama", label: "Nama Kawasan" },
        { key: "tipe_kawasan", label: "Tipe", render: (v) => v || "-" },
        { key: "luas_ha", label: "Luas (Ha)", render: (v) => v ? `${Number(v).toLocaleString()} Ha` : "-" },
        { key: "is_published", label: "Status", render: (v) => v ? "✅ Terbit" : "📝 Draft" },
    ],
    fields: [
        { key: "nama", label: "Nama Kawasan", type: "text", required: true, maxLength: 255 },
        { key: "tipe_kawasan", label: "Tipe Kawasan", type: "text", placeholder: "Cagar Alam / Suaka Margasatwa" },
        { key: "deskripsi", label: "Deskripsi", type: "textarea", required: true },
        { key: "luas_ha", label: "Luas (Hektar)", type: "number" },
        { key: "latitude", label: "Latitude", type: "text", placeholder: "-6.1234567" },
        { key: "longitude", label: "Longitude", type: "text", placeholder: "106.1234567" },
        { key: "thumbnail", label: "Foto Kawasan", type: "file", accept: "image/*" },
        { key: "is_published", label: "Publikasi", type: "checkbox", placeholder: "Tampilkan di website publik" },
    ],
};

export default function KawasanPage() {
    return <CrudPageFactory config={config} />;
}
```

### 5. Tabel Referensi untuk 11 Halaman Lainnya

| # | Folder | Ikon | Endpoint | Field Khusus |
|---|--------|------|----------|-------------|
| 1 | `profil/` | `Building2` | `/cms/admin/profil` | judul, konten(textarea), thumbnail(file), urutan(number) |
| 2 | `tsl/` | `TreePine` | `/cms/admin/tsl` | nama_lokal, nama_latin, deskripsi, tipe(select:satwa/tumbuhan), status_iucn, thumbnail |
| 3 | `photos/` | `Camera` | `/cms/admin/photos` | judul, deskripsi, album, file(file:image/*) |
| 4 | `videos/` | `Video` | `/cms/admin/videos` | judul, deskripsi, youtube_url(url), thumbnail(file) |
| 5 | `links/` | `LinkIcon` | `/cms/admin/links` | judul, url(url), logo(file), urutan(number) |
| 6 | `buku/` | `BookOpen` | `/cms/admin/buku` | judul, penulis, penerbit, tahun_terbit, deskripsi, cover(file), file(file:.pdf) |
| 7 | `leaflet/` | `FileImage` | `/cms/admin/leaflet` | judul, deskripsi, file(file), thumbnail(file) |
| 8 | `poster/` | `Image` | `/cms/admin/poster` | judul, deskripsi, file(file), thumbnail(file) |
| 9 | `regulasi/` | `Scale` | `/cms/admin/regulasi` | judul, nomor, tahun, deskripsi, file(file:.pdf) |
| 10 | `categories/` | `Tag` | `/cms/admin/categories` | nama, slug, tipe(select), urutan(number) |
| 11 | `kepala/` | `UserCircle` | `/cms/admin/kepala` | nama, nip, jabatan, sambutan(textarea), foto(file), is_active(checkbox) |

---

## Troubleshooting

### Q: Drawer Form mengirim data tapi file tidak sampai ke Backend!

**Artinya:** Deteksi `hasFiles` gagal karena state `files` tidak terisi.
**Solusi:** Pastikan handler `onChange` pada `<input type="file">` menggunakan `setFiles(p => ({...p, [field.key]: e.target.files![0]}))`. Perhatikan `field.key` harus sama persis dengan nama input yang diharapkan Backend (misal: `thumbnail`, `file`, `cover`).

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): deploy config-driven CRUD page factory eliminating 3600 lines of boilerplate" \
  --body "Membangun Mesin Cetak Halaman Otomatis (\`CrudPageFactory\`) yang menerima konfigurasi JSON dan menghasilkan halaman Admin CRUD lengkap. Memusnahkan 12×300 = 3600 baris kode berulang. Detail di docs/issues/099-frontend-cms-reusable-crud.md" \
  --label "frontend,ui,architecture,module-cms"
```

### Step 2 - 6: (Sama seperti pola sebelumnya)

```bash
git checkout -b issue/099-frontend-cms-reusable-crud
# Kerjakan...
git commit -m "feat(cms): deploy config-driven CRUD page factory eliminating 3600 lines of boilerplate (#99)"
git push -u origin issue/099-frontend-cms-reusable-crud
gh pr create --title "..." --body "..." --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
CMS Admin memiliki 12 halaman CRUD yang 90% identik. JANGAN tulis 12 halaman terpisah! Bangun 1 komponen Pabrik (CrudPageFactory) lalu cetak 12 halaman dari konfigurasi JSON.

## Task

Kerjakan Issue #099 (Frontend — CMS Reusable CRUD Pages).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/099-frontend-cms-reusable-crud.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat `_components/types.ts` (Interface konfigurasi).
3. Buat `_components/CrudPageFactory.tsx` (Mesin Tabel + Tombol).
4. Buat `_components/CrudFormDrawer.tsx` (Drawer Form Generik).
5. Buat `kawasan/page.tsx` sebagai contoh pertama (25 baris).
6. Replikasi untuk 11 halaman lainnya menggunakan Tabel Referensi.
7. Lakukan Git push dan `gh pr create`.
````
