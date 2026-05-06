# Issue #112 — Frontend — Data Display Components (Panduan Tabel, Tab, Select, dan Dropdown Menu)

> **Type**: `chore` / `documentation`
> **Labels**: `frontend`, `ui`, `foundation`
> **Priority**: 🔴 Critical (Tabel = Jantung Setiap Halaman Admin CRUD)
> **Complexity**: 🟢 Simple (Komponen Sudah Terinstal — Issue Ini Fokus Pola Pemakaian)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #110

---

## Branch

```
issue/112-frontend-data-display-guide
```

## Deskripsi

Issue ini mendokumentasikan **5 komponen tampilan data** yang menjadi tulang punggung setiap halaman Admin Panel. Setiap halaman CRUD pasti menggunakan minimal 3 dari 5 komponen ini.

**5 Komponen yang Dibahas:**

| # | Komponen | File | Dipakai Di |
|---|----------|------|------------|
| 1 | `Table` | `table.tsx` | Daftar data di semua modul admin |
| 2 | `Tabs` | `tabs.tsx` | Navigasi sub-konten (Galeri: Foto/Video) |
| 3 | `Select` | `select.tsx` | Dropdown pilihan di form |
| 4 | `DropdownMenu` | `dropdown-menu.tsx` | Menu aksi per baris tabel (Edit, Hapus) |
| 5 | `Command` | `command.tsx` | Pencarian dengan autocomplete |

---

## Acceptance Criteria

- [ ] 5 komponen sudah ada di `components/ui/` (dari Issue #110).
- [ ] Panduan pemakaian dengan contoh kode nyata tersedia.
- [ ] Pola "Tabel Admin CRUD" terdokumentasi (pola paling sering dipakai).

---

## Panduan Pemakaian: Pola-Pola Utama

### Pola 1: Tabel Admin CRUD (Pola Paling Penting!)

Hampir **setiap halaman admin** memiliki tabel dengan struktur ini:

```
┌─────────────────────────────────────────────────────┐
│ [Judul]                    [Tombol Tambah]           │
│ [Input Pencarian ─────────────────────────]          │
├──────┬───────────────┬──────────┬───────────────────┤
│  No  │  Nama         │  Status  │  Aksi             │
├──────┼───────────────┼──────────┼───────────────────┤
│  1   │  Siaran Pers  │ ✅ Aktif │  [⋮] Edit | Hapus │
│  2   │  Pengumuman   │ ✅ Aktif │  [⋮] Edit | Hapus │
│  3   │  Kegiatan     │ ❌ Draft │  [⋮] Edit | Hapus │
├──────┴───────────────┴──────────┴───────────────────┤
│                   Hal. 1 / 3  [←] [→]               │
└─────────────────────────────────────────────────────┘
```

**Kode Lengkap:**

```tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableHeader, TableBody, TableRow,
    TableHead, TableCell,
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2 } from "lucide-react";

interface Category {
    id: number;
    nama: string;
    slug: string;
    is_active: boolean;
}

export default function ContohTabelCRUD() {
    const confirm = useConfirm();
    const [data, setData] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    // Tarik data dari API
    const fetchData = () => {
        setLoading(true);
        api.get("/cms/admin/categories", { params: { page, search } })
            .then(r => {
                setData(r.data?.data?.data || []);
                setLastPage(r.data?.data?.last_page || 1);
            })
            .catch(() => toast.error("Gagal memuat data"))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(); }, [page, search]);

    // Hapus data
    const handleDelete = async (item: Category) => {
        const ok = await confirm({
            title: "Hapus Kategori",
            description: `Hapus "${item.nama}"? Data tidak bisa dikembalikan.`,
            variant: "danger",
        });
        if (!ok) return;
        await api.delete(`/cms/admin/categories/${item.id}`);
        toast.success("Berhasil dihapus");
        fetchData();
    };

    return (
        <div className="space-y-4">
            {/* Header: Judul + Tombol */}
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-black">Kategori</h1>
                <Button><Plus className="w-4 h-4" /> Tambah</Button>
            </div>

            {/* Pencarian */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Cari kategori..."
                    className="pl-10"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>

            {/* Tabel */}
            <div className="bg-white rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-16">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                                    Tidak ada data.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((item, idx) => (
                                <TableRow key={item.id}>
                                    <TableCell>{(page - 1) * 10 + idx + 1}</TableCell>
                                    <TableCell className="font-medium">{item.nama}</TableCell>
                                    <TableCell>
                                        <Badge variant={item.is_active ? "default" : "secondary"}>
                                            {item.is_active ? "Aktif" : "Draft"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {/* DROPDOWN MENU AKSI */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon-xs">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Pencil className="w-4 h-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem variant="destructive"
                                                    onClick={() => handleDelete(item)}>
                                                    <Trash2 className="w-4 h-4" /> Hapus
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}>Prev</Button>
                    <span className="text-sm text-gray-500">Hal. {page} / {lastPage}</span>
                    <Button variant="outline" size="sm" disabled={page >= lastPage}
                        onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    );
}
```

---

### Pola 2: Tabs — Konten Berganti dalam Satu Halaman

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ContohTabs() {
    return (
        <Tabs defaultValue="foto">
            {/* Tab Headers */}
            <TabsList>
                <TabsTrigger value="foto">📷 Foto</TabsTrigger>
                <TabsTrigger value="video">🎬 Video</TabsTrigger>
            </TabsList>

            {/* Tab Bodies */}
            <TabsContent value="foto">
                <p>Grid foto muncul di sini...</p>
            </TabsContent>
            <TabsContent value="video">
                <p>Grid video muncul di sini...</p>
            </TabsContent>
        </Tabs>
    );
}
```

**Kapan pakai Tabs?**
- ✅ Dua atau lebih jenis konten **terkait** dalam 1 halaman (Foto/Video, Satwa/Tumbuhan)
- ✅ User sering berpindah antar konten
- ❌ JANGAN pakai Tabs untuk navigasi antar halaman — pakai `<Link>` saja

---

### Pola 3: Select — Dropdown Pilihan di Form

```tsx
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from "@/components/ui/select";

export default function ContohSelect() {
    return (
        <Select onValueChange={(val) => console.log("Dipilih:", val)}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Kategori" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="siaran-pers">Siaran Pers</SelectItem>
                <SelectItem value="pengumuman">Pengumuman</SelectItem>
                <SelectItem value="kegiatan">Kegiatan</SelectItem>
            </SelectContent>
        </Select>
    );
}
```

**Select vs HTML `<select>`:**
| Aspek | HTML `<select>` | shadcn `Select` |
|-------|-----------------|-----------------|
| Styling | Sulit di-custom | Fully customizable |
| Accessibility | Baik | Sangat baik (Radix) |
| Animasi | Tidak ada | Fade in/out |
| Search | Tidak bisa | Bisa (via Command) |

---

### Pola 4: DropdownMenu — Menu Aksi per Baris Tabel

```tsx
import {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Biasa dipakai di kolom "Aksi" tabel:
<DropdownMenu>
    <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
            <MoreHorizontal className="w-4 h-4" />
        </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="w-4 h-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="w-4 h-4" /> Duplikat
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Hapus
        </DropdownMenuItem>
    </DropdownMenuContent>
</DropdownMenu>
```

**DropdownMenu vs Select:**
| Aspek | Select | DropdownMenu |
|-------|--------|--------------|
| Fungsi | Memilih **nilai** (form) | Menjalankan **aksi** |
| Return | Mengembalikan `value` | Menjalankan `onClick` |
| Contoh | "Pilih Kategori" | "Edit / Hapus / Export" |

---

### Pola 5: Command — Pencarian dengan Autocomplete

```tsx
import {
    Command, CommandInput, CommandList,
    CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";

export default function ContohCommand() {
    return (
        <Command className="rounded-lg border shadow-md">
            <CommandInput placeholder="Cari menu..." />
            <CommandList>
                <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                <CommandGroup heading="Navigasi">
                    <CommandItem>Dashboard</CommandItem>
                    <CommandItem>Informasi</CommandItem>
                    <CommandItem>Kawasan</CommandItem>
                </CommandGroup>
            </CommandList>
        </Command>
    );
}
```

**Kapan pakai Command?**
- ✅ Search bar dengan daftar hasil yang bisa di-filter keyboard
- ✅ Command palette (Ctrl+K) untuk navigasi cepat
- ✅ Dikombinasikan dengan `Popover` untuk membuat **Combobox** (search + select)

---

## Troubleshooting

### Q: Nomor baris tabel salah di halaman 2!

**Solusi:** Perhatikan rumus penomoran:
```tsx
{(page - 1) * perPage + idx + 1}
```
Jika `page=2` dan `perPage=10`, maka baris pertama = `(2-1)*10+0+1` = **11**. Tanpa rumus ini, semua halaman akan mulai dari nomor 1.

### Q: DropdownMenu muncul terpotong di tepi layar!

**Solusi:** Gunakan prop `align="end"` pada `DropdownMenuContent`:
```tsx
<DropdownMenuContent align="end">
```
Ini memaksa menu muncul ke kiri (bukan ke kanan yang mungkin terpotong).

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "docs(ui): document data display patterns — table CRUD, tabs, select, dropdown-menu, and command" --body "Closes #112" --label "frontend,ui,foundation"
git checkout -b issue/112-frontend-data-display-guide
git commit -m "docs(ui): document data display patterns with real-world CRUD table example (#112)"
git push -u origin issue/112-frontend-data-display-guide
gh pr create --title "docs(ui): data display component usage guide (#112)" --body "## Changes
- Pola Tabel Admin CRUD lengkap (pencarian, pagination, dropdown aksi, confirm hapus).
- Panduan Tabs, Select, DropdownMenu, Command dengan contoh kode.
- Tabel perbandingan Select vs DropdownMenu.
Closes #112" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
5 komponen data display sudah terinstal via Issue #110. Issue ini mendokumentasikan pola pemakaian utama, terutama pola Tabel Admin CRUD yang dipakai di SETIAP halaman admin.

## Task

Kerjakan Issue #112 (Frontend — Data Display Guide).
Ikuti instruksi di: `docs/issues/112-frontend-data-display-guide.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Verifikasi 5 komponen (table, tabs, select, dropdown-menu, command) sudah ada.
3. Buat contoh halaman CRUD sederhana yang menggunakan semua komponen.
4. Lakukan Git push dan `gh pr create`.
````
