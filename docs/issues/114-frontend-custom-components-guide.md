# Issue #114 — Frontend — Custom Components (Komponen Buatan Sendiri: EmployeeSelect, RichTextEditor, Sonner Toast)

> **Type**: `chore` / `documentation`
> **Labels**: `frontend`, `ui`, `custom`
> **Priority**: 🔴 Critical (Dipakai di 10+ Halaman)
> **Complexity**: 🟡 Medium (Melibatkan API Call, Dynamic Import, dan Context Provider)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro
> **Dependencies**: Issue #110

---

## Branch

```
issue/114-frontend-custom-components-guide
```

## Deskripsi

Selain 19 komponen shadcn/ui resmi, project ini punya **3 komponen custom** buatan sendiri yang tidak tersedia di pustaka mana pun. Mereka lahir dari kebutuhan nyata yang berulang di banyak halaman.

**3 Komponen Custom:**

| # | Komponen | Dipakai Di | Keunikan |
|---|----------|-----------|----------|
| 1 | `EmployeeSelect` | 10+ halaman (BMN, Inventory, DeReporting) | Combobox dengan debounced API search |
| 2 | `RichTextEditor` | CMS Informasi (WYSIWYG) | Dynamic import Quill (SSR-safe) |
| 3 | `Toaster` (Sonner) | Seluruh aplikasi | Toast notification dengan tema otomatis |

---

## Acceptance Criteria

- [ ] `EmployeeSelect` ada di `components/ui/employee-select.tsx`.
- [ ] `RichTextEditor` ada di `components/ui/rich-text-editor.tsx`.
- [ ] `Toaster` (Sonner) ada di `components/ui/sonner.tsx`.
- [ ] `Toaster` terpasang di root layout.
- [ ] Panduan pemakaian terdokumentasi untuk ketiga komponen.

---

## Komponen 1: EmployeeSelect (Pencarian Pegawai)

### Apa Ini?

Sebuah **Combobox** — gabungan Popover + Input Search + Daftar API. Saat admin ingin memilih pegawai (untuk peminjaman aset, penandatangan surat, dll.), mereka mengetik nama/NIP dan komponen ini mencari dari database secara real-time.

### Arsitektur Visual

```
┌──────────────────────────────────┐
│ [Pilih Pegawai...            ▾]  │  ← Tombol trigger (Popover)
└──────────────────────────────────┘

Klik → muncul:

┌──────────────────────────────────┐
│ 🔍 [Cari nama atau NIP...    ✕] │  ← Input search (debounced 300ms)
├──────────────────────────────────┤
│ ✓ Ahmad Fauzi                    │  ← Item terpilih (ada centang)
│   NIP: 198504132010011001        │
│   Budi Santoso                   │
│   NIP: 197203241998031002        │
│   Citra Dewi                     │
│   NIP: 199001052015042001        │
└──────────────────────────────────┘
```

### Cara Kerja Internal (Untuk Developer)

```
User mengetik "Ahmad"
        ↓ (300ms debounce — menunggu user selesai mengetik)
API call: GET /employees/select?search=Ahmad
        ↓
Respons: [{ id: 1, name: "Ahmad Fauzi", nip: "198504..." }]
        ↓
Tampilkan daftar → User klik → onChange(1, { name: "Ahmad Fauzi", ... })
```

**Mengapa debounce 300ms?**
Tanpa debounce, setiap huruf yang diketik memicu API call:
- "A" → API call
- "Ah" → API call
- "Ahm" → API call
- "Ahma" → API call
- "Ahmad" → API call

Itu 5 API call untuk 1 pencarian! Dengan debounce 300ms, hanya 1 API call (setelah user berhenti mengetik 300ms).

### Cara Pakai

```tsx
import { EmployeeSelect, Employee } from "@/components/ui/employee-select";

// Di dalam komponen:
const [employeeId, setEmployeeId] = useState<number | null>(null);

<EmployeeSelect
    value={employeeId}
    onChange={(id, employee) => {
        setEmployeeId(id);
        // `employee` berisi data lengkap: { id, name, nip, position, ... }
        console.log("Dipilih:", employee?.name);
    }}
    placeholder="Cari pegawai..."
    clearable   // Tampilkan tombol "Hapus Pengguna"
/>
```

### Props API

| Prop | Tipe | Default | Penjelasan |
|------|------|---------|------------|
| `value` | `number \| null` | — | ID pegawai yang dipilih |
| `onChange` | `(id, employee?) => void` | — | Callback saat pegawai dipilih |
| `placeholder` | `string` | `"Pilih Pegawai..."` | Teks placeholder |
| `disabled` | `boolean` | `false` | Nonaktifkan komponen |
| `clearable` | `boolean` | `false` | Tampilkan opsi "Hapus Pengguna" |
| `className` | `string` | — | Kelas CSS tambahan |

### Dependensi

```bash
npm install use-debounce
```

### Di Mana Dipakai? (10+ Halaman!)

| Modul | Halaman | Konteks |
|-------|---------|---------|
| BMN | `assets/[id]` | Penanggung jawab aset |
| BMN | `loans/create` | Peminjam aset |
| BMN | `loans/` | Filter peminjam |
| Inventory | `items/` | Penerima barang |
| Inventory | `transactions/out/` | Pihak yang menerima stok keluar |
| Inventory | `reports/PrintConfigDialog` | Penandatangan laporan (3 role!) |
| DeReporting | `master/users/` | Link pegawai ke user |

---

## Komponen 2: RichTextEditor (Editor Teks Kaya / WYSIWYG)

### Apa Ini?

Editor teks seperti Microsoft Word di dalam browser — admin bisa membuat konten dengan **bold**, *italic*, heading, bullet list, warna, gambar, video, dan link.

### Arsitektur Visual

```
┌───────────────────────────────────────────────────┐
│ [H1 ▾] [B] [I] [U] [S] [❝] [≡] [•] [🎨] [🔗] [🖼] │  ← Toolbar
├───────────────────────────────────────────────────┤
│                                                   │
│   Konten berita yang bisa di-edit oleh admin...   │  ← Area editor
│   Bisa bold, italic, heading, list, dll.          │
│                                                   │
│   [Gambar bisa diinsert di sini]                  │
│                                                   │
└───────────────────────────────────────────────────┘
```

### Cara Kerja Internal

```
1. Next.js merender halaman di SERVER
2. Quill butuh `document` (browser API) → CRASH di server!
3. Solusi: dynamic import dengan { ssr: false }
4. Di server: tampilkan placeholder "Memuat Editor..."
5. Di browser: muat Quill, render editor sungguhan
```

**Ini pattern krusial!** Semua pustaka yang bergantung pada `window` atau `document` HARUS di-import secara dinamis di Next.js.

### Cara Pakai

```tsx
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// Di dalam komponen:
const [content, setContent] = useState("");

<RichTextEditor
    value={content}
    onChange={setContent}
    placeholder="Tulis konten berita..."
/>
```

### Props API

| Prop | Tipe | Default | Penjelasan |
|------|------|---------|------------|
| `value` | `string` | — | Konten HTML (`<p>Hello <b>World</b></p>`) |
| `onChange` | `(html: string) => void` | — | Callback saat konten berubah |
| `placeholder` | `string` | — | Teks placeholder saat kosong |
| `className` | `string` | — | Kelas CSS tambahan |

### Dependensi

```bash
npm install react-quill-new
```

> **Mengapa `react-quill-new`?** Package `react-quill` asli sudah tidak di-maintain dan tidak kompatibel dengan React 18+. `react-quill-new` adalah fork modern yang aktif.

### Di Mana Dipakai?

| Modul | Halaman | Konteks |
|-------|---------|---------|
| CMS | `informasi/create` | Konten berita |
| CMS | `informasi/[id]` | Edit konten berita |
| CMS | `halaman/create` | Konten halaman statis |
| CMS | `halaman/[id]` | Edit halaman statis |

---

## Komponen 3: Toaster / Sonner (Notifikasi Toast)

### Apa Ini?

Pop-up kecil yang muncul di pojok layar untuk memberi tahu user bahwa sesuatu berhasil, gagal, atau sedang diproses.

### Arsitektur Visual

```
                                        ┌──────────────────────┐
                                        │ ✅ Data berhasil     │
                                        │    disimpan          │
                                        └──────────────────────┘
                                        ↑ Muncul 3-5 detik, lalu hilang
```

### Setup: Pasang Toaster di Root Layout

`Toaster` adalah komponen **sekali pasang** — dipasang di root layout, lalu digunakan di mana saja lewat fungsi `toast()`.

```tsx
// frontend/src/app/layout.tsx
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                {children}
                <Toaster />  {/* Pasang SEKALI di sini */}
            </body>
        </html>
    );
}
```

### Cara Pakai (Di Halaman Mana Pun)

```tsx
import { toast } from "sonner";  // Import dari "sonner", BUKAN dari komponen kita

// Sukses (hijau)
toast.success("Data berhasil disimpan");

// Error (merah)
toast.error("Gagal menghapus data");

// Info (biru)
toast.info("Sedang memproses...");

// Warning (kuning)
toast.warning("Koneksi internet lambat");

// Loading → Success (pattern untuk API call)
const id = toast.loading("Menyimpan data...");
try {
    await api.post("/endpoint", data);
    toast.success("Berhasil!", { id }); // Ganti loading → success
} catch {
    toast.error("Gagal!", { id }); // Ganti loading → error
}

// Dengan aksi
toast("File berhasil diunggah", {
    action: {
        label: "Lihat",
        onClick: () => router.push("/galeri"),
    },
});
```

### Mengapa Sonner, Bukan React-Toastify?

| Aspek | Sonner | React-Toastify |
|-------|--------|----------------|
| Ukuran | 5 KB | 25 KB |
| Styling | Otomatis tema shadcn | Perlu CSS sendiri |
| API | `toast.success("...")` | `toast.success("...")` |
| Animasi | Smooth, modern | Standar |
| Dipilih oleh | shadcn/ui ✅ | Legacy |

---

## Troubleshooting

### Q: EmployeeSelect tidak menemukan data — daftar selalu kosong!

**Solusi:** Periksa endpoint API:
1. Pastikan route `GET /employees/select` tersedia di backend.
2. Pastikan endpoint mengembalikan array (bukan paginated object).
3. Cek apakah ada data employee di database.

### Q: RichTextEditor crash "document is not defined"!

**Solusi:** Komponen ini WAJIB di-import secara dinamis:
```tsx
// ❌ SALAH — crash di server
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// ✅ BENAR — komponen sudah handle dynamic import internal
// Cukup import biasa, karena dynamic import ada di DALAM komponen
import { RichTextEditor } from "@/components/ui/rich-text-editor";
```
Komponen `RichTextEditor` sudah menangani `dynamic import` secara internal — kita **tidak perlu** membungkusnya lagi dengan `next/dynamic` dari luar.

### Q: Toast tidak muncul sama sekali!

**Solusi:** Pastikan `<Toaster />` sudah dipasang di `layout.tsx` root. Toast membutuhkan komponen Toaster sebagai "layar" tempat ia muncul. Tanpa Toaster, fungsi `toast()` tetap berjalan tapi tidak ada yang ditampilkan.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "docs(ui): document 3 custom components — EmployeeSelect, RichTextEditor, and Sonner Toast" --body "Closes #114" --label "frontend,ui,custom"
git checkout -b issue/114-frontend-custom-components-guide
# Verifikasi 3 komponen sudah ada, pasang Toaster di layout.tsx
git commit -m "docs(ui): document custom components with architecture diagrams and usage guide (#114)"
git push -u origin issue/114-frontend-custom-components-guide
gh pr create --title "docs(ui): custom component usage guide (#114)" --body "## Changes
- EmployeeSelect: Combobox dengan debounced API search, dipakai di 10+ halaman.
- RichTextEditor: WYSIWYG editor (Quill) dengan SSR-safe dynamic import.
- Toaster (Sonner): Notifikasi toast dengan loading → success/error pattern.
- Panduan arsitektur internal dan troubleshooting.
Closes #114" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\frontend\src\components\ui\ (3 komponen custom)
Ada 3 komponen custom buatan sendiri yang tidak tersedia di shadcn/ui. Mereka sudah ada di project lama dan perlu dimigrasikan.

## Task

Kerjakan Issue #114 (Frontend — Custom Components Guide).
Ikuti instruksi di: `docs/issues/114-frontend-custom-components-guide.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Instal dependensi: `npm install use-debounce react-quill-new sonner`.
3. Copy 3 komponen dari `superapp-inventory`: employee-select.tsx, rich-text-editor.tsx, sonner.tsx.
4. KRUSIAL: Pasang `<Toaster />` di `frontend/src/app/layout.tsx`.
5. Verifikasi `npm run build` lolos tanpa error.
6. Lakukan Git push dan `gh pr create`.
````
