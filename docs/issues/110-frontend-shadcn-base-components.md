# Issue #110 — Frontend — shadcn/ui Base Components (Fondasi Batu Bata Visual)

> **Type**: `chore`
> **Labels**: `frontend`, `ui`, `foundation`
> **Priority**: 🔴 Critical (Semua Modul Bergantung pada Komponen Ini)
> **Complexity**: 🟢 Simple (Copy-Adapt dari `superapp-inventory` + Instalasi CLI)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #003 (Frontend Init)

---

## Branch

```
issue/110-frontend-shadcn-base-components
```

## Deskripsi

Sebelum modul-modul CRUD bisa berjalan, kita membutuhkan **komponen UI dasar** — tombol, input, label, badge, kartu, dll. Project `superapp-inventory` sudah memiliki 23 komponen yang telah terbukti berfungsi. Kita akan memigrasikan dan mengadaptasinya ke `bksda-superapp`.

**Strategi: Instalasi via CLI + Referensi `superapp-inventory`**

shadcn/ui bukan pustaka biasa — ia bukan `npm install`. Komponen-nya di-*generate* langsung ke folder proyek menggunakan CLI, sehingga kita memiliki kendali penuh atas kode.

**23 Komponen yang Akan Dipasang (dari `superapp-inventory`):**

| # | Komponen | File | Dipakai Untuk |
|---|----------|------|---------------|
| 1 | `button` | `button.tsx` | Tombol di seluruh aplikasi |
| 2 | `input` | `input.tsx` | Input teks form |
| 3 | `label` | `label.tsx` | Label field form |
| 4 | `textarea` | `textarea.tsx` | Input teks panjang |
| 5 | `badge` | `badge.tsx` | Status tag (Draft, Terbit, dll) |
| 6 | `card` | `card.tsx` | Kartu konten Dashboard |
| 7 | `checkbox` | `checkbox.tsx` | Toggle boolean di form |
| 8 | `switch` | `switch.tsx` | Toggle on/off |
| 9 | `form` | `form.tsx` | Form wrapper (react-hook-form) |
| 10 | `select` | `select.tsx` | Dropdown pilihan |
| 11 | `table` | `table.tsx` | Tabel data |
| 12 | `tabs` | `tabs.tsx` | Tab navigasi konten |
| 13 | `dialog` | `dialog.tsx` | Modal popup |
| 14 | `alert-dialog` | `alert-dialog.tsx` | Konfirmasi hapus |
| 15 | `sheet` | `sheet.tsx` | Drawer samping (sidebar mobile) |
| 16 | `popover` | `popover.tsx` | Popup kecil (date picker, dll) |
| 17 | `dropdown-menu` | `dropdown-menu.tsx` | Menu aksi per baris |
| 18 | `command` | `command.tsx` | Command palette / search |
| 19 | `sonner` | `sonner.tsx` | Toast notification |
| 20 | `confirm-dialog` | `confirm-dialog.tsx` | Dialog konfirmasi kustom (**custom**) |
| 21 | `employee-select` | `employee-select.tsx` | Pencarian pegawai (**custom**) |
| 22 | `rich-text-editor` | `rich-text-editor.tsx` | Editor konten HTML (**custom**) |
| 23 | `InteractiveKawasanMap` | `InteractiveKawasanMap.tsx` | Peta Leaflet (**custom**, Issue #109) |

> **Catatan:** Komponen #1–#19 adalah **shadcn/ui resmi**. Komponen #20–#23 adalah **custom** buatan kita.

---

## Acceptance Criteria

- [ ] Instalasi dependensi: `class-variance-authority`, `clsx`, `tailwind-merge`, `radix-ui`.
- [ ] Tersedia `frontend/src/lib/utils.ts` dengan fungsi `cn()`.
- [ ] 19 komponen shadcn/ui resmi terinstal di `frontend/src/components/ui/`.
- [ ] 4 komponen custom di-copy-adapt dari `superapp-inventory`.
- [ ] Semua komponen bisa diimpor tanpa error TypeScript.

---

## Panduan Implementasi Cerdas

### Fase A: Instalasi Dependensi Inti

```bash
cd frontend

# Dependensi shadcn/ui
npm install class-variance-authority clsx tailwind-merge
npm install radix-ui

# Dependensi form
npm install react-hook-form @hookform/resolvers zod

# Dependensi toast
npm install sonner

# Dependensi command palette
npm install cmdk
```

### Fase B: Fungsi Utilitas `cn()`
**Path:** `frontend/src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Menggabungkan kelas CSS secara cerdas.
 *
 * MENGAPA kita butuh ini?
 * - `clsx` menggabungkan kelas: cn("p-4", conditional && "mt-2") → "p-4 mt-2"
 * - `twMerge` menyelesaikan konflik Tailwind: cn("p-4", "p-8") → "p-8" (bukan "p-4 p-8")
 *
 * Tanpa `cn()`, kelas Tailwind yang berkonflik akan bertumpuk dan
 * hasilnya tidak terprediksi (tergantung urutan di CSS).
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
```

### Fase C: Instal Komponen shadcn/ui via CLI

```bash
cd frontend

# Cara 1: CLI shadcn (jika sudah di-init)
npx shadcn@latest add button input label textarea badge card
npx shadcn@latest add checkbox switch form select
npx shadcn@latest add table tabs dialog alert-dialog
npx shadcn@latest add sheet popover dropdown-menu command sonner
```

> **Alternatif (Cara 2):** Jika CLI shadcn gagal atau belum di-init, copy file langsung dari `e:\superapp-inventory\frontend\src\components\ui\` ke `e:\bksda-superapp\frontend\src\components\ui\`.

### Fase D: Copy 4 Komponen Custom

Komponen custom ini **tidak tersedia** via CLI shadcn — harus di-copy manual dari `superapp-inventory`:

```bash
# Dari superapp-inventory → bksda-superapp
copy "e:\superapp-inventory\frontend\src\components\ui\confirm-dialog.tsx" "e:\bksda-superapp\frontend\src\components\ui\"
copy "e:\superapp-inventory\frontend\src\components\ui\employee-select.tsx" "e:\bksda-superapp\frontend\src\components\ui\"
copy "e:\superapp-inventory\frontend\src\components\ui\rich-text-editor.tsx" "e:\bksda-superapp\frontend\src\components\ui\"
copy "e:\superapp-inventory\frontend\src\components\ui\InteractiveKawasanMap.tsx" "e:\bksda-superapp\frontend\src\components\ui\"
```

### Fase E: Verifikasi Semua Komponen

```bash
cd frontend

# Build check — jika ada import error, akan muncul di sini
npm run build
```

Jika ada error, biasanya karena:
1. **Import path berubah** — cek `@/lib/utils` tersedia
2. **Dependensi belum diinstal** — cek `radix-ui`, `cmdk`, `sonner`
3. **Versi React tidak kompatibel** — pastikan React 19+

---

## Referensi: Anatomi Komponen shadcn/ui

Setiap komponen shadcn/ui mengikuti pola yang **konsisten**:

```tsx
// 1. Import dari Radix UI (primitif headless)
import * as DialogPrimitive from "radix-ui/dialog";

// 2. Import fungsi cn() untuk gabung kelas
import { cn } from "@/lib/utils";

// 3. Komponen wrapper dengan styling Tailwind
function DialogContent({ className, ...props }) {
    return (
        <DialogPrimitive.Content
            className={cn("fixed inset-0 z-50 bg-white ...", className)}
            {...props}
        />
    );
}

// 4. Export named (bukan default)
export { Dialog, DialogContent, DialogHeader, DialogTitle };
```

**Mengapa shadcn bekerja seperti ini?**
- **Radix UI** menyediakan perilaku (keyboard nav, focus trap, aria) **tanpa styling**
- **shadcn** menambahkan styling Tailwind di atas Radix
- Karena kode ada di project kita, kita bisa **modifikasi bebas** tanpa fork

---

## Troubleshooting

### Q: `npx shadcn@latest add button` gagal — "No shadcn project found"!

**Solusi:** Inisialisasi shadcn dulu:
```bash
npx shadcn@latest init
```
Pilih konfigurasi: TypeScript, `src/components/ui`, `@/lib/utils`, CSS Variables. Setelah init, baru jalankan `add`.

### Q: Error `Module not found: Can't resolve 'radix-ui'`!

**Solusi:** shadcn versi terbaru menggunakan `radix-ui` (bukan `@radix-ui/react-*` per komponen). Instal:
```bash
npm install radix-ui
```

### Q: Komponen `employee-select` error karena import API!

**Solusi:** Komponen ini mengimpor `@/lib/api` untuk mencari data pegawai. Pastikan file `lib/api.ts` sudah tersedia (dari Issue fase awal). Jika belum, buat stub sementara.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "chore(ui): install 23 shadcn/ui and custom components as shared visual foundation" --body "Closes #110" --label "frontend,ui,foundation"
git checkout -b issue/110-frontend-shadcn-base-components
# Instal dependensi + komponen
git commit -m "chore(ui): install 23 shadcn/ui and custom components as shared visual foundation (#110)"
git push -u origin issue/110-frontend-shadcn-base-components
gh pr create --title "chore(ui): install 23 UI components (#110)" --body "## Changes
- Instalasi dependensi: cva, clsx, tailwind-merge, radix-ui, cmdk, sonner, react-hook-form, zod.
- 19 komponen shadcn/ui resmi via CLI.
- 4 komponen custom dari superapp-inventory: confirm-dialog, employee-select, rich-text-editor, InteractiveKawasanMap.
- Fungsi utilitas cn() di lib/utils.ts.
Closes #110" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\ (project lama yang sudah punya 23 komponen UI)
Kita perlu menginstal seluruh komponen UI shadcn/ui + 4 komponen custom ke project baru.

## Task

Kerjakan Issue #110 (Frontend — shadcn/ui Base Components).
Ikuti instruksi di: `docs/issues/110-frontend-shadcn-base-components.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Instal dependensi: `npm install class-variance-authority clsx tailwind-merge radix-ui react-hook-form @hookform/resolvers zod sonner cmdk`.
3. Buat `lib/utils.ts` dengan fungsi `cn()`.
4. Jalankan `npx shadcn@latest init` lalu `npx shadcn@latest add button input label ...` (19 komponen).
5. Copy 4 komponen custom dari `e:\superapp-inventory\frontend\src\components\ui\`.
6. Jalankan `npm run build` untuk verifikasi.
7. Lakukan Git push dan `gh pr create`.
````
