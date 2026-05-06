# Issue #113 — Frontend — Form Components (Panduan Lengkap Membangun Form Admin)

> **Type**: `chore` / `documentation`
> **Labels**: `frontend`, `ui`, `foundation`
> **Priority**: 🔴 Critical (Setiap Aksi Tambah/Edit Data Membutuhkan Form)
> **Complexity**: 🟡 Medium (2 Pendekatan Form: Simple State vs React Hook Form)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #110

---

## Branch

```
issue/113-frontend-form-components-guide
```

## Deskripsi

Form adalah **jembatan antara pengguna dan database**. Setiap kali admin menambah berita, mengubah kawasan, atau mengunggah buku — mereka mengisi form. Issue ini mendokumentasikan **2 pendekatan** membangun form yang dipakai di project ini, beserta panduan kapan pakai mana.

**Komponen yang Dibahas:**

| # | Komponen | File | Fungsi |
|---|----------|------|--------|
| 1 | `Input` | `input.tsx` | Field teks satu baris |
| 2 | `Textarea` | `textarea.tsx` | Field teks multi-baris |
| 3 | `Label` | `label.tsx` | Label di atas field |
| 4 | `Select` | `select.tsx` | Dropdown pilihan |
| 5 | `Checkbox` | `checkbox.tsx` | Centang boolean |
| 6 | `Switch` | `switch.tsx` | Toggle on/off (lebih visual dari checkbox) |
| 7 | `Form` | `form.tsx` | Wrapper react-hook-form (validasi otomatis) |

**2 Pendekatan Form:**

| Aspek | Simple State (`useState`) | React Hook Form (`useForm`) |
|-------|--------------------------|----------------------------|
| Kompleksitas | Rendah | Sedang |
| Validasi | Manual (`if (!judul)`) | Otomatis (schema Zod) |
| Error display | Manual | Otomatis (`FormMessage`) |
| File upload | Mudah | Perlu adapter |
| Cocok untuk | Form 1-5 field | Form 6+ field, form kompleks |
| Dipakai di | `superapp-inventory` ✅ | Project baru (opsional) |

> **Keputusan Project:** `superapp-inventory` menggunakan **Simple State** untuk semua form. Pendekatan ini lebih mudah dipahami oleh junior dan AI model murah. React Hook Form didokumentasikan sebagai opsi untuk form yang sangat kompleks.

---

## Acceptance Criteria

- [ ] Komponen `input`, `textarea`, `label`, `select`, `checkbox`, `switch` sudah ada.
- [ ] Komponen `form` (react-hook-form wrapper) sudah ada.
- [ ] Panduan 2 pendekatan form terdokumentasi dengan contoh lengkap.
- [ ] Pola file upload terdokumentasi.

---

## Panduan Pemakaian

### Pendekatan 1: Simple State (REKOMENDASI untuk Project Ini)

Ini adalah pendekatan yang sudah dipakai di seluruh `superapp-inventory`. Simpel, mudah dibaca, dan tidak memerlukan pustaka tambahan.

**Contoh: Form Tambah Buku Digital**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem,
} from "@/components/ui/select";
import { Save, Loader2, UploadCloud, X } from "lucide-react";

export default function TambahBukuPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    // ═══ STATE FORM: Satu object untuk semua field ═══
    const [formData, setFormData] = useState({
        judul: "",
        deskripsi: "",
        category_id: "",
        is_published: false,
    });

    // ═══ STATE FILE: Terpisah karena bukan string ═══
    const [file, setFile] = useState<File | null>(null);

    // Tarik data dropdown
    useEffect(() => {
        api.get("/cms/admin/categories?per_page=100")
            .then(r => setCategories(r.data?.data?.data || []))
            .catch(() => {});
    }, []);

    // ═══ HELPER: Update satu field tanpa menimpa field lain ═══
    const updateField = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // ═══ SUBMIT ═══
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Cegah reload halaman!

        // Validasi manual
        if (!formData.judul.trim()) {
            toast.error("Judul wajib diisi");
            return;
        }

        setLoading(true);
        try {
            // Gunakan FormData jika ada file upload
            const payload = new FormData();
            payload.append("judul", formData.judul);
            payload.append("deskripsi", formData.deskripsi);
            payload.append("category_id", formData.category_id);
            payload.append("is_published", formData.is_published ? "1" : "0");
            if (file) payload.append("file", file);

            await api.post("/cms/admin/buku", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Buku berhasil ditambahkan");
            router.push("/cms/publikasi/buku");
        } catch (err: any) {
            // Tampilkan error validasi dari backend
            if (err.response?.status === 422) {
                const errors = err.response.data.errors;
                Object.values(errors).flat().forEach((msg: any) => toast.error(msg));
            } else {
                toast.error("Gagal menyimpan data");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 p-6">
            {/* Field: Judul */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                    Judul <span className="text-red-500">*</span>
                </label>
                <Input
                    value={formData.judul}
                    onChange={e => updateField("judul", e.target.value)}
                    placeholder="Contoh: Buku Saku Konservasi 2024"
                />
            </div>

            {/* Field: Deskripsi */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Deskripsi</label>
                <Textarea
                    value={formData.deskripsi}
                    onChange={e => updateField("deskripsi", e.target.value)}
                    placeholder="Ringkasan singkat isi buku..."
                    rows={4}
                />
            </div>

            {/* Field: Kategori (Select) */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">
                    Kategori <span className="text-red-500">*</span>
                </label>
                <Select
                    value={formData.category_id}
                    onValueChange={val => updateField("category_id", val)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.nama}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Field: File Upload */}
            <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">File PDF</label>
                <div className="border-2 border-dashed rounded-xl p-6 text-center relative">
                    {file ? (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-gray-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button type="button" variant="outline" size="sm"
                                onClick={() => setFile(null)}>
                                <X className="w-3 h-3" /> Hapus File
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <UploadCloud className="w-8 h-8 mx-auto text-gray-300" />
                            <p className="text-sm text-gray-500">Klik untuk unggah</p>
                            <p className="text-xs text-gray-400">PDF, maks 20MB</p>
                        </div>
                    )}
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className={`absolute inset-0 w-full h-full cursor-pointer ${file ? "hidden" : "opacity-0"}`}
                    />
                </div>
            </div>

            {/* Field: Switch Publikasi */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                    <p className="text-sm font-bold text-gray-700">Tampilkan Publik</p>
                    <p className="text-xs text-gray-400">Aktifkan agar buku terlihat di website.</p>
                </div>
                <Switch
                    checked={formData.is_published}
                    onCheckedChange={val => updateField("is_published", val)}
                />
            </div>

            {/* Tombol Submit */}
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Batal
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan
                </Button>
            </div>
        </form>
    );
}
```

---

### Pendekatan 2: React Hook Form + Zod (Form Kompleks)

Untuk form dengan **banyak field** dan **validasi kompleks**, `react-hook-form` + `zod` lebih efisien:

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form, FormField, FormItem, FormLabel,
    FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ═══ SCHEMA: Definisi validasi ═══
const schema = z.object({
    nama: z.string().min(3, "Nama minimal 3 karakter"),
    email: z.string().email("Format email tidak valid"),
    telepon: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ContohReactHookForm() {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { nama: "", email: "", telepon: "" },
    });

    const onSubmit = (data: FormValues) => {
        console.log("Data tervalidasi:", data);
        // data.nama PASTI string, minimal 3 karakter
        // data.email PASTI email valid
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Field: Nama */}
                <FormField control={form.control} name="nama" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nama</FormLabel>
                        <FormControl>
                            <Input placeholder="Masukkan nama..." {...field} />
                        </FormControl>
                        <FormMessage /> {/* Error otomatis muncul di sini! */}
                    </FormItem>
                )} />

                {/* Field: Email */}
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="email@bksda.go.id" {...field} />
                        </FormControl>
                        <FormDescription>Email resmi instansi.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )} />

                <Button type="submit">Simpan</Button>
            </form>
        </Form>
    );
}
```

**Kelebihan React Hook Form:**
- ✅ Error otomatis muncul di bawah field via `<FormMessage />`
- ✅ Validasi berjalan saat user mengetik (real-time)
- ✅ Data sudah **terjamin tipenya** saat `onSubmit` (TypeScript)
- ✅ Tidak perlu `useState` per field

**Kekurangan:**
- ❌ Boilerplate lebih banyak (`FormField` + `render` prop)
- ❌ File upload perlu adapter khusus
- ❌ Lebih sulit dipahami AI model murah

---

## Pola-Pola Form Penting

### Pola A: Checkbox vs Switch — Kapan Pakai Mana?

```tsx
// CHECKBOX — untuk persetujuan, daftar pilihan ganda
<div className="flex items-center gap-2">
    <Checkbox
        checked={agreed}
        onCheckedChange={(val) => setAgreed(val === true)}
    />
    <label className="text-sm">Saya setuju dengan ketentuan</label>
</div>

// SWITCH — untuk toggle on/off (lebih visual)
<div className="flex items-center justify-between">
    <label className="text-sm font-bold">Tampilkan Publik</label>
    <Switch
        checked={isPublished}
        onCheckedChange={setIsPublished}
    />
</div>
```

| Aspek | Checkbox | Switch |
|-------|----------|--------|
| Visual | Kotak centang ☑️ | Slider geser 🔘 |
| Cocok untuk | Persetujuan, multi-pilihan | Status on/off tunggal |
| Contoh | "Saya setuju T&C" | "Tampilkan Publik" |

### Pola B: File Upload dengan Preview

```tsx
const [file, setFile] = useState<File | null>(null);
const [preview, setPreview] = useState<string | null>(null);

const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validasi ukuran (max 10MB)
    if (f.size > 10 * 1024 * 1024) {
        toast.error("File terlalu besar (maks 10MB)");
        return;
    }

    setFile(f);

    // Buat preview untuk gambar
    if (f.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(f));
    }
};

// JANGAN LUPA cleanup preview URL saat unmount!
useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
}, [preview]);
```

### Pola C: Submit FormData (dengan File)

```tsx
const payload = new FormData();

// Tambahkan field teks
payload.append("judul", formData.judul);
payload.append("is_published", formData.is_published ? "1" : "0");

// Tambahkan file (jika ada)
if (file) {
    payload.append("file", file);
}

// PENTING: Header Content-Type harus multipart/form-data
await api.post("/endpoint", payload, {
    headers: { "Content-Type": "multipart/form-data" },
});
```

> ⚠️ **Jebakan Boolean:** Backend Laravel menerima `"1"` dan `"0"` untuk boolean di FormData, BUKAN `true`/`false`. Selalu konversi: `is_published ? "1" : "0"`.

---

## Troubleshooting

### Q: Select value kosong setelah submit — form tidak ter-reset!

**Solusi:** Reset state setelah submit berhasil:
```tsx
setFormData({ judul: "", deskripsi: "", category_id: "", is_published: false });
setFile(null);
```

### Q: File upload error 413 (Entity Too Large)!

**Solusi:** Error ini dari **Nginx/server**, bukan dari kode. Tambahkan di konfigurasi Nginx:
```nginx
client_max_body_size 20M;
```

### Q: Switch mengirim `true`/`false` tapi Laravel expect `1`/`0`!

**Solusi:** FormData hanya mengirim **string**. Konversi boolean di frontend:
```tsx
payload.append("is_published", formData.is_published ? "1" : "0");
```

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "docs(ui): document form patterns — simple state vs react-hook-form, file upload, and boolean conversion" --body "Closes #113" --label "frontend,ui,foundation"
git checkout -b issue/113-frontend-form-components-guide
git commit -m "docs(ui): document form patterns with file upload and boolean conversion guide (#113)"
git push -u origin issue/113-frontend-form-components-guide
gh pr create --title "docs(ui): form component usage guide (#113)" --body "## Changes
- 2 pendekatan form: Simple State (rekomendasi) vs React Hook Form (opsional).
- Pola file upload dengan preview dan validasi ukuran.
- Pola FormData submit dengan konversi boolean untuk Laravel.
- Perbandingan Checkbox vs Switch.
Closes #113" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\ (semua form menggunakan pendekatan Simple State)
Project ini menggunakan Simple State (useState) untuk form — BUKAN react-hook-form. React Hook Form hanya dipakai jika form sangat kompleks (10+ field dengan validasi lintas field).

## Task

Kerjakan Issue #113 (Frontend — Form Components Guide).
Ikuti instruksi di: `docs/issues/113-frontend-form-components-guide.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Verifikasi komponen form (input, textarea, label, select, checkbox, switch) sudah ada.
3. PENTING: Semua form baru harus mengikuti pendekatan Simple State.
4. PENTING: Boolean di FormData harus dikonversi ke "1"/"0" untuk Laravel.
5. Lakukan Git push dan `gh pr create`.
````
