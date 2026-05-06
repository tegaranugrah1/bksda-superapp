# Issue #100 — Frontend — CMS Halaman Khusus (Website Settings, Menu, Pesan)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-cms`
> **Priority**: 🟡 Medium (3 Halaman Non-CRUD yang Butuh Perlakuan Spesial)
> **Complexity**: 🟡 Medium
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Flash
> **Dependencies**: Issue #099

---

## Branch

```
issue/100-frontend-cms-special-pages
```

## Deskripsi

Issue 099 membangun Mesin Cetak Halaman untuk 12 entitas CRUD generik. Namun **3 halaman** tidak cocok dengan pola tersebut karena memiliki perilaku unik:

1. **Website Settings** — Singleton (hanya 1 baris data, tidak ada tabel/list). Hanya form `GET` → `PUT`.
2. **Menu Builder** — Hirarki bertingkat (parent → children). Butuh tampilan *Tree*.
3. **Pesan Masuk** — Inbox dengan status Baca/Belum Baca. Tidak ada form Tambah (pesan datang dari publik).

Ketiga halaman ini harus dipahat secara manual.

---

## Acceptance Criteria

- [ ] Tersedia `frontend/src/app/(dashboard)/cms/website/page.tsx` — Form pengaturan singleton.
- [ ] Tersedia `frontend/src/app/(dashboard)/cms/menus/page.tsx` — Daftar menu dengan indikator hirarki.
- [ ] Tersedia `frontend/src/app/(dashboard)/cms/pesan/page.tsx` — Inbox dengan tombol "Tandai Dibaca".

---

## Panduan Implementasi Cerdas

### 1. Website Settings (Formulir Singleton)
**Path:** `frontend/src/app/(dashboard)/cms/website/page.tsx`

```tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Settings, Save, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";

export default function WebsiteSettingsPage() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState<Record<string, any>>({});
    const [logo, setLogo] = useState<File | null>(null);
    const [favicon, setFavicon] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Tarik data pengaturan yang sudah ada
    const { data, isLoading } = useQuery({
        queryKey: ["cms-website-settings"],
        queryFn: async () => (await api.get("/cms/admin/website")).data?.data,
    });

    // Isi form saat data tersedia
    useEffect(() => {
        if (data) setForm(data);
    }, [data]);

    const handleChange = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = new FormData();
            const fields = ["nama_instansi", "alamat", "telepon", "email", "fax", "tentang", "facebook", "instagram", "youtube", "twitter"];
            fields.forEach(f => { if (form[f]) payload.append(f, form[f]); });
            if (logo) payload.append("logo", logo);
            if (favicon) payload.append("favicon", favicon);

            await api.put("/cms/admin/website", payload, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success("Pengaturan website berhasil disimpan.");
            queryClient.invalidateQueries({ queryKey: ["cms-website-settings"] });
        } catch {
            toast.error("Gagal menyimpan pengaturan.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" /></div>;

    // Helper komponen input
    const Field = ({ label, field, type = "text" }: { label: string; field: string; type?: string }) => (
        <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">{label}</label>
            {type === "textarea" ? (
                <textarea value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)} rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all resize-none" />
            ) : (
                <input type={type} value={form[field] || ""} onChange={(e) => handleChange(field, e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500 transition-all" />
            )}
        </div>
    );

    return (
        <div className="p-6 md:p-10 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
                <Settings className="w-8 h-8 text-teal-500" /> Pengaturan Website
            </h1>
            <p className="text-zinc-400 text-sm mb-8">Konfigurasi identitas dan kontak website publik BKSDA.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identitas */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Identitas Instansi</p>
                    <Field label="Nama Instansi" field="nama_instansi" />
                    <Field label="Alamat" field="alamat" type="textarea" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Telepon" field="telepon" />
                        <Field label="Email" field="email" type="email" />
                        <Field label="Fax" field="fax" />
                    </div>
                    <Field label="Tentang (Footer)" field="tentang" type="textarea" />
                </div>

                {/* Sosial Media */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Sosial Media</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Facebook" field="facebook" type="url" />
                        <Field label="Instagram" field="instagram" type="url" />
                        <Field label="YouTube" field="youtube" type="url" />
                        <Field label="Twitter / X" field="twitter" type="url" />
                    </div>
                </div>

                {/* Logo & Favicon */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Branding</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Logo</label>
                            <label className="flex items-center gap-2 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-4 cursor-pointer hover:border-teal-500 transition-all">
                                <ImagePlus className="w-5 h-5 text-zinc-500" />
                                <span className="text-sm text-zinc-500">{logo ? logo.name : "Pilih logo..."}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Favicon</label>
                            <label className="flex items-center gap-2 bg-zinc-900 border-2 border-dashed border-zinc-700 rounded-xl px-4 py-4 cursor-pointer hover:border-teal-500 transition-all">
                                <ImagePlus className="w-5 h-5 text-zinc-500" />
                                <span className="text-sm text-zinc-500">{favicon ? favicon.name : "Pilih favicon..."}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setFavicon(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={isSaving}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Simpan Pengaturan
                </button>
            </form>
        </div>
    );
}
```

### 2. Pesan Masuk (Inbox)
**Path:** `frontend/src/app/(dashboard)/cms/pesan/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Inbox, Loader2, CheckCircle, Trash2, Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";

export default function PesanMasukPage() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

    const { data: response, isLoading } = useQuery({
        queryKey: ["cms-pesan", filter, page],
        queryFn: async () => {
            const params: any = { page };
            if (filter === "unread") params.is_read = "false";
            if (filter === "read") params.is_read = "true";
            return (await api.get("/cms/admin/pesan", { params })).data;
        },
    });

    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/cms/admin/pesan/${id}/read`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cms-pesan"] }); toast.success("Pesan ditandai dibaca."); },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/cms/admin/pesan/${id}`),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["cms-pesan"] }); toast.success("Pesan dihapus."); },
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Inbox className="w-8 h-8 text-teal-500" /> Pesan Masuk
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Pesan dari pengunjung website melalui form Kontak Kami.</p>
                </div>
                {/* Filter Tab */}
                <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                    {(["all", "unread", "read"] as const).map(f => (
                        <button key={f} onClick={() => { setFilter(f); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-teal-600 text-white" : "text-zinc-400 hover:text-white"}`}>
                            {f === "all" ? "Semua" : f === "unread" ? "Belum Dibaca" : "Sudah Dibaca"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Daftar Pesan */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="py-16 text-center"><Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" /></div>
                ) : response?.data?.length === 0 ? (
                    <div className="py-16 text-center text-zinc-500">Tidak ada pesan.</div>
                ) : (
                    response?.data?.map((pesan: any) => (
                        <div key={pesan.id} className={`bg-zinc-900/50 border rounded-2xl p-5 transition-all ${pesan.is_read ? "border-zinc-800/50" : "border-teal-500/30 bg-teal-500/5"}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0">
                                    {pesan.is_read ? <MailOpen className="w-5 h-5 text-zinc-600 mt-0.5 shrink-0" /> : <Mail className="w-5 h-5 text-teal-400 mt-0.5 shrink-0" />}
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm ${pesan.is_read ? "text-zinc-400" : "text-white"}`}>{pesan.subjek}</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">{pesan.nama} {pesan.email && `• ${pesan.email}`}</p>
                                        <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{pesan.isi}</p>
                                        <p className="text-[10px] text-zinc-600 mt-2">{new Date(pesan.created_at).toLocaleString("id-ID")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {!pesan.is_read && (
                                        <button onClick={() => markReadMutation.mutate(pesan.id)} className="p-2 hover:bg-teal-500/10 rounded-lg group" title="Tandai dibaca">
                                            <CheckCircle className="w-4 h-4 text-zinc-500 group-hover:text-teal-400" />
                                        </button>
                                    )}
                                    <button onClick={() => { if(confirm("Hapus pesan ini?")) deleteMutation.mutate(pesan.id); }}
                                        className="p-2 hover:bg-red-500/10 rounded-lg group" title="Hapus">
                                        <Trash2 className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {response?.last_page > 1 && (
                <div className="flex justify-center gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50 text-sm">Prev</button>
                    <span className="px-3 py-1 text-zinc-500 text-sm">Hal. {page} / {response.last_page}</span>
                    <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50 text-sm">Next</button>
                </div>
            )}
        </div>
    );
}
```

### 3. Menu Builder (Hirarki Navigasi)
**Path:** `frontend/src/app/(dashboard)/cms/menus/page.tsx`

Gunakan `CrudPageFactory` dari Issue 099 dengan konfigurasi berikut. Kolom `parent_id` ditampilkan sebagai label induk:

```tsx
import { Navigation } from "lucide-react";
import CrudPageFactory from "../_components/CrudPageFactory";
import type { CrudPageConfig } from "../_components/types";

const config: CrudPageConfig = {
    title: "Menu Navigasi",
    subtitle: "Kelola menu header dan footer website publik BKSDA.",
    icon: Navigation,
    accentColor: "teal",
    apiEndpoint: "/cms/admin/menus",
    searchPlaceholder: "Cari label menu...",
    columns: [
        { key: "label", label: "Label Menu" },
        { key: "url", label: "URL Tujuan", render: (v) => <span className="text-xs text-teal-400 font-mono">{v}</span> },
        { key: "posisi", label: "Posisi", render: (v) => v === "header" ? "🔝 Header" : "🔻 Footer" },
        { key: "urutan", label: "Urutan" },
        { key: "is_active", label: "Aktif", render: (v) => v ? "✅" : "❌" },
    ],
    fields: [
        { key: "label", label: "Label Menu", type: "text", required: true, maxLength: 100, placeholder: "Beranda" },
        { key: "url", label: "URL Tujuan", type: "url", required: true, placeholder: "/profil/visi-misi" },
        { key: "posisi", label: "Posisi", type: "select", options: [{ value: "header", label: "Header" }, { value: "footer", label: "Footer" }] },
        { key: "urutan", label: "Urutan", type: "number" },
        { key: "is_active", label: "Aktif", type: "checkbox", placeholder: "Tampilkan menu ini" },
    ],
};

export default function MenusPage() {
    return <CrudPageFactory config={config} />;
}
```

---

## Troubleshooting

### Q: Website Settings tidak menyimpan data sosial media!

**Solusi:** Pastikan array `fields` di `handleSubmit` mencakup `"facebook", "instagram", "youtube", "twitter"`. Jika field tidak ada di array tersebut, nilainya tidak akan dikirim ke Backend.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(cms): construct singleton settings form, inbox viewer, and hierarchical menu builder" \
  --body "Membangun 3 halaman Admin CMS khusus yang tidak cocok dengan pola CRUD generik. Detail di docs/issues/100-frontend-cms-special-pages.md" \
  --label "frontend,ui,module-cms"
```

### Step 2 - 6:

```bash
git checkout -b issue/100-frontend-cms-special-pages
# Kerjakan 3 halaman...
git commit -m "feat(cms): construct singleton settings form, inbox viewer, and hierarchical menu builder (#100)"
git push -u origin issue/100-frontend-cms-special-pages
gh pr create --title "..." --body "## Changes
- Website Settings: Form Singleton (GET→PUT) dengan 3 seksi bertema dan upload Logo/Favicon.
- Pesan Masuk: Inbox berpenyaring (Semua/Belum Dibaca/Sudah Dibaca) + Tandai Dibaca + Hapus.
- Menu Builder: Menggunakan CrudPageFactory dengan kolom Posisi (Header/Footer) dan Urutan.

Closes #100" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
3 halaman CMS Admin yang tidak cocok dengan CrudPageFactory: Website Settings (singleton), Pesan Masuk (inbox), Menu Builder (hirarki).

## Task

Kerjakan Issue #100 (Frontend — CMS Halaman Khusus).
Ikuti instruksi di: `docs/issues/100-frontend-cms-special-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Pahat `cms/website/page.tsx` — Form singleton dengan 3 seksi (Identitas, Sosmed, Branding).
3. Pahat `cms/pesan/page.tsx` — Inbox dengan filter tab dan tombol Tandai Dibaca.
4. Pahat `cms/menus/page.tsx` — Gunakan CrudPageFactory dengan config khusus.
5. Lakukan Git push dan `gh pr create`.
````
