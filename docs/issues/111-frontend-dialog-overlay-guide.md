# Issue #111 — Frontend — Dialog & Overlay Components (Panduan Lengkap Popup & Drawer)

> **Type**: `chore` / `documentation`
> **Labels**: `frontend`, `ui`, `foundation`
> **Priority**: 🔴 Critical (Semua Aksi CRUD Bergantung pada Dialog)
> **Complexity**: 🟢 Simple (Komponen Sudah Terinstal — Issue Ini Fokus Panduan Pemakaian)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #110

---

## Branch

```
issue/111-frontend-dialog-overlay-guide
```

## Deskripsi

Issue #110 menginstal **semua** 23 komponen UI. Issue ini berfokus pada **panduan pemakaian** 5 komponen overlay (popup & drawer) — karena mereka adalah komponen paling sering disalahgunakan oleh developer junior.

**5 Komponen Overlay yang Dibahas:**

| # | Komponen | Dari | Fungsi |
|---|----------|------|--------|
| 1 | `Dialog` | shadcn/ui | Modal umum (form, preview, info) |
| 2 | `AlertDialog` | shadcn/ui | Konfirmasi destruktif (hapus data) |
| 3 | `ConfirmDialog` | **Custom** | Konfirmasi via Promise (await) |
| 4 | `Sheet` | shadcn/ui | Drawer samping (sidebar, detail panel) |
| 5 | `Popover` | shadcn/ui | Popup kecil tempel elemen (dropdown, picker) |

**Pertanyaan paling sering:**
> "Kapan pakai Dialog? Kapan pakai AlertDialog? Kapan pakai Sheet? Apa bedanya?"

Issue ini menjawab **setiap pertanyaan tersebut** dengan contoh kode nyata dari project.

---

## Acceptance Criteria

- [ ] Komponen `dialog`, `alert-dialog`, `sheet`, `popover` sudah ada di `components/ui/`.
- [ ] Komponen custom `confirm-dialog` sudah ada di `components/ui/`.
- [ ] `ConfirmDialogProvider` terpasang di root layout.
- [ ] Dokumentasi panduan pemakaian tersedia di issue file ini.

---

## Panduan Pemakaian: Kapan Pakai Apa?

### Pohon Keputusan (Flowchart Mental)

```
Apakah ini aksi DESTRUKTIF (hapus, reset)?
├── YA → Pakai ConfirmDialog (custom, async/await)
│         Contoh: "Hapus aset ini?"
│
└── TIDAK → Apakah butuh FORM atau konten besar?
            ├── YA → Apakah kontennya PANJANG (perlu scroll)?
            │        ├── YA → Pakai Sheet (drawer samping)
            │        │         Contoh: Form edit detail, daftar filter
            │        └── TIDAK → Pakai Dialog (modal tengah)
            │                    Contoh: Form tambah, preview gambar
            │
            └── TIDAK → Apakah tempel pada tombol/elemen?
                        ├── YA → Pakai Popover (popup kecil)
                        │         Contoh: Date picker, color picker
                        └── TIDAK → Jangan pakai overlay 😄
```

---

## Contoh Pemakaian Nyata

### 1. Dialog — Modal Form Tambah Data

```tsx
"use client";

import { useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ContohDialog() {
    const [open, setOpen] = useState(false);

    const handleSubmit = () => {
        // Simpan data...
        setOpen(false); // Tutup dialog setelah berhasil
    };

    return (
        <>
            {/* Tombol pembuka */}
            <Button onClick={() => setOpen(true)}>Tambah Kategori</Button>

            {/* Dialog Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah Kategori Baru</DialogTitle>
                        <DialogDescription>
                            Isi nama kategori yang akan ditambahkan.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Form */}
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="nama">Nama Kategori</Label>
                            <Input id="nama" placeholder="Siaran Pers" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSubmit}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
```

**Kapan pakai Dialog?**
- ✅ Form tambah/edit data sederhana (1-5 field)
- ✅ Preview gambar atau konten
- ✅ Informasi detail yang tidak butuh navigasi

---

### 2. ConfirmDialog — Konfirmasi Hapus (Custom, Async/Await)

```tsx
"use client";

import { useConfirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function ContohConfirmDialog() {
    const confirm = useConfirm();

    const handleDelete = async (id: number, nama: string) => {
        // Tampilkan dialog konfirmasi dan TUNGGU jawaban user
        const confirmed = await confirm({
            title: "Hapus Kategori",
            description: `Apakah Anda yakin ingin menghapus "${nama}"? Data tidak bisa dikembalikan.`,
            confirmText: "Ya, Hapus",
            cancelText: "Batal",
            variant: "danger", // Merah — destruktif!
        });

        // Jika user klik "Batal", confirmed = false → tidak terjadi apa-apa
        if (!confirmed) return;

        // Jika user klik "Ya, Hapus", confirmed = true → lanjut hapus
        try {
            await api.delete(`/cms/admin/categories/${id}`);
            toast.success("Kategori berhasil dihapus");
            // Refresh data...
        } catch {
            toast.error("Gagal menghapus kategori");
        }
    };

    return (
        <Button variant="destructive" size="sm"
            onClick={() => handleDelete(1, "Siaran Pers")}>
            <Trash2 className="w-4 h-4" /> Hapus
        </Button>
    );
}
```

**Mengapa ConfirmDialog pakai Promise (await)?**

Karena pola ini memungkinkan kita menulis kode **linear** (seperti `window.confirm()`) alih-alih callback bersarang:

```tsx
// ❌ TANPA await — Callback hell
openConfirmDialog({
    onConfirm: () => {
        api.delete(...).then(() => {
            toast.success(...);
            refresh();
        });
    },
});

// ✅ DENGAN await — Bersih dan linear
const ok = await confirm({ ... });
if (!ok) return;
await api.delete(...);
toast.success(...);
refresh();
```

**PENTING:** Agar `useConfirm()` bekerja, `ConfirmDialogProvider` **HARUS** dipasang di root layout:

```tsx
// frontend/src/app/layout.tsx
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <ConfirmDialogProvider>
                    {children}
                </ConfirmDialogProvider>
            </body>
        </html>
    );
}
```

---

### 3. Sheet — Drawer Samping (Form Panjang / Detail Panel)

```tsx
"use client";

import { useState } from "react";
import {
    Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function ContohSheet() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Lihat Detail</Button>

            <Sheet open={open} onOpenChange={setOpen}>
                {/* side="right" = muncul dari kanan (default) */}
                {/* side="left" = muncul dari kiri */}
                <SheetContent side="right">
                    <SheetHeader>
                        <SheetTitle>Detail Kawasan</SheetTitle>
                        <SheetDescription>
                            Informasi lengkap kawasan konservasi.
                        </SheetDescription>
                    </SheetHeader>

                    {/* Konten panjang — bisa di-scroll */}
                    <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                        <p>Konten detail yang panjang...</p>
                        {/* Form dengan banyak field... */}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
```

**Kapan pakai Sheet?**
- ✅ Form dengan **banyak field** (6+ field) yang butuh scroll
- ✅ Panel detail yang muncul di samping tanpa meninggalkan halaman
- ✅ Sidebar mobile / menu navigasi

**Sheet vs Dialog:**
| Aspek | Dialog | Sheet |
|-------|--------|-------|
| Posisi | Tengah layar | Sisi kiri/kanan/atas/bawah |
| Ukuran | Kecil-sedang | Tinggi penuh (full height) |
| Scroll | Tidak ideal | Sangat nyaman |
| Cocok untuk | Form pendek, preview | Form panjang, detail panel |

---

### 4. Popover — Popup Kecil Tempel Elemen

```tsx
"use client";

import {
    Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export default function ContohPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">Pilih Warna</Button>
            </PopoverTrigger>
            <PopoverContent className="w-40">
                <div className="grid grid-cols-4 gap-2">
                    {["red", "blue", "green", "yellow"].map(color => (
                        <button key={color}
                            className={`w-8 h-8 rounded-full bg-${color}-500`}
                        />
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
```

**Kapan pakai Popover?**
- ✅ Date picker, color picker, emoji picker
- ✅ Tooltip yang butuh interaksi (bukan read-only)
- ✅ Mini-form (1-2 field) yang tempel ke tombol

---

## Troubleshooting

### Q: `useConfirm` error "must be used within ConfirmDialogProvider"!

**Solusi:** Pastikan `ConfirmDialogProvider` sudah dipasang di `layout.tsx` root. Hook `useConfirm()` mencari Provider di tree React — jika tidak ada, error ini muncul.

### Q: AlertDialog vs ConfirmDialog — apa bedanya?

| Aspek | AlertDialog (shadcn) | ConfirmDialog (custom) |
|-------|---------------------|----------------------|
| Pemakaian | Deklaratif (JSX) | Imperatif (await) |
| State | Kelola sendiri `open` | Otomatis via Promise |
| Variant | Tidak ada | danger / warning / default |
| Kode | 15-20 baris | 3-5 baris |
| Rekomendasi | Jarang dipakai langsung | **Selalu pakai ini** ✅ |

`ConfirmDialog` (custom) dibangun **di atas** `Dialog` (shadcn). Kita memakai `ConfirmDialog` 99% waktu karena kode-nya jauh lebih pendek.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "docs(ui): document dialog, sheet, popover overlay patterns with decision tree and usage examples" --body "Closes #111" --label "frontend,ui,foundation"
git checkout -b issue/111-frontend-dialog-overlay-guide
# Pastikan ConfirmDialogProvider terpasang di layout.tsx
git commit -m "docs(ui): document dialog, sheet, popover overlay patterns with usage guide (#111)"
git push -u origin issue/111-frontend-dialog-overlay-guide
gh pr create --title "docs(ui): overlay component usage guide (#111)" --body "## Changes
- Pohon keputusan: kapan pakai Dialog / ConfirmDialog / Sheet / Popover.
- 4 contoh kode nyata dari project.
- Tabel perbandingan AlertDialog vs ConfirmDialog.
- ConfirmDialogProvider dipasang di root layout.
Closes #111" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\frontend\src\components\ui\ (komponen sudah ada)
5 komponen overlay sudah terinstal via Issue #110. Issue ini memastikan pemakaian yang benar dan memasang ConfirmDialogProvider di root layout.

## Task

Kerjakan Issue #111 (Frontend — Dialog & Overlay Guide).
Ikuti instruksi di: `docs/issues/111-frontend-dialog-overlay-guide.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Verifikasi 5 komponen overlay sudah ada di `components/ui/`.
3. KRUSIAL: Pasang `ConfirmDialogProvider` di `frontend/src/app/layout.tsx`.
4. Buat contoh penggunaan sederhana di halaman test jika diperlukan.
5. Lakukan Git push dan `gh pr create`.
````
