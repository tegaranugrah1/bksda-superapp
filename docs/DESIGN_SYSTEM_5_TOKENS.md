# Panduan 5 Design Tokens — BKSDA SuperApp Web

Dokumen ini menjadi kiblat praktis untuk tata letak, tipografi, warna, kelengkungan sudut, dan elevasi pada antarmuka web BKSDA SuperApp. Seluruh nilai hex, palet modul, dan kontras aksesibilitas tetap mengacu pada [DESIGN_SYSTEM_COLORS.md](DESIGN_SYSTEM_COLORS.md), sedangkan aturan animasi mengacu pada [animate-ui-motion-guidelines.md](animate-ui-motion-guidelines.md).

**Prinsip inti:** Mulai dari struktur yang netral. Setiap nilai gaya harus datang dari **token / skala baku** — bukan angka atau warna ad-hoc — sehingga perpindahan Light dan Dark Mode otomatis konsisten.

---

## Ringkasan 5 Token

| # | Token | Aturan Baku | Contoh Kelas / Nilai |
| --- | --- | --- | --- |
| 1 | **Color Roles** | Pilih berdasarkan **peran**, bukan nama hue | `--ds-canvas`, `--ds-surface`, `--ds-fg`, `--ds-fg-muted`, `--ds-accent-*`, `--ds-border-subtle` |
| 2 | **Spacing** | Kelipatan **4 px** (`4, 8, 16, 24`; maks kelipatan 4 penuh) | `gap-1`, `gap-2`, `p-4`, `p-6`, `space-y-6` |
| 3 | **Type** | Tepat **4 ukuran teks** per layar (tanpa ukuran selipan) | `text-xs` (`12px`), `text-sm` (`14px`), `text-xl` (`20px`), `text-2xl` (`24px`) |
| 4 | **Radius** | Konsentris: `outer = inner + padding` | `rounded-3xl` (`24px`) = `p-4` (`16px`) + `rounded-lg` (`8px`) |
| 5 | **Shadows** | Hanya **2 tingkat elevasi** | `shadow-xs` (kartu/kontrol), `shadow-lg` (dialog/popover/floating) |

---

## Token 1 — Color Roles (Berdasarkan Job, Bukan Hue)

Jangan mengetik hex mentah atau meracik `color-mix(...)` manual di komponen UI. Gunakan CSS custom property `--ds-*` dari [`globals.css`](../frontend/src/app/globals.css) dalam scope `[data-module="persuratan" | "kepegawaian" | "bmn" | "surat-tugas"]` agar Light Mode dan Dark Mode bertukar otomatis:

| Role | Token | Light | Dark | Pemakaian |
| --- | --- | --- | --- | --- |
| **Background** | `--ds-canvas` | `#f8fafc` | `#09090b` | Latar belakang halaman utama |
| **Surface** | `--ds-surface` | `#ffffff` | `#18181b` | Kartu, tabel, dan kontainer utama |
| **Surface Raised / Muted** | `--ds-surface-raised` / `--ds-surface-muted` | `#ffffff` / `#f1f5f9` | `#27272a` | Tombol sekunder, header kolom tabel lembut |
| **Text** | `--ds-fg` | `#0f172a` | `#f8fafc` | Judul, nilai KPI, isi utama |
| **Muted** | `--ds-fg-muted` | `#475569` | `#a1a1aa` | Deskripsi, metadata, label sekunder |
| **Primary Accent** | `--ds-accent-solid` / `--ds-accent-fg` | Per modul (mis. `#0f766e`) | Per modul (mis. `#2dd4bf` / `#5eead4`) | CTA utama, item aktif sidebar, fokus |
| **Border** | `--ds-border-subtle` (`slate-200/80` / `zinc-800`) | `#e2e8f0` | `#3f3f46` / `zinc-800` | Garis pemisah kartu, tabel, dan tepi tombol sekunder normal |
| **Control Border (Interactive)** | `--ds-border-control` | `#7c899a` | `#71717a` | Tepi `:hover` / kontrol input agar terasa responsif |

### Aturan Tambahan Warna
- **Kartu & Tabel Dark Mode:** Gunakan border tenang (`border-slate-200/80 dark:border-zinc-800` dan divider `divide-slate-200/70 dark:divide-zinc-800`) serta satukan header widget tabel dengan card (hindari strip `#27272a` di atas `thead` gelap terpisah).
- **Tombol Sekunder (`.kpg-secondary`):** Pada keadaan normal gunakan langsung `border: 1px solid var(--ds-border-subtle)` di atas `var(--ds-surface-raised)` — **tanpa `color-mix` persentase manual** — dan naikkan border ke `var(--ds-border-control)` saat `:hover`.
- **Palet Kategori Terbatas:** Maksimal 3 keluarga warna kategori per dashboard (misal Persuratan: Teal Kedinasan, Blue, Amber; jangan mencampur Emerald + Teal bersama-sama).

---

## Token 2 — Spacing (Kelipatan 4 px)

Seluruh `padding`, `margin`, `gap`, dan `space-*` wajib kelipatan **4 px**. Ritme utama menggunakan **4, 8, 16, 24 px** (`1`, `2`, `4`, `6`; `12 px` / `px-3` diperbolehkan untuk sel tabel sempit):

- **Dilarang memakai pecahan `.5`:** hindari `gap-1.5`, `gap-2.5`, `gap-3.5`, `p-3.5`, `mt-0.5`, `mt-2.5`, `py-0.5`, `py-2.5`, `space-y-2.5`, dan sejenisnya.
- **Mapping cepat:**
  - `4px` (`1`): jarak rapat antara ikon/badge atau metadata vertikal (`mt-1`, `gap-1`).
  - `8px` (`2`): jarak antar elemen sejajar (`gap-2`, `space-y-2`, `px-2 py-1`).
  - `16px` (`4`): padding kartu utama (`p-4`), grid gap (`gap-4`), margin antar blok dalam kartu (`mt-4`).
  - `24px` (`6`): jarak antar section utama halaman (`space-y-6`).

---

## Token 3 — Type Scale (Tepat 4 Ukuran)

Batasi ukuran font pada satu layar/modul hanya pada **4 ukuran** (tanpa menyisipkan `text-[10px]`, `text-[11px]`, `text-base`, atau `text-lg`):

1. **`text-xs` (`12px`)** — Label seksi, metadata tabel, deskripsi kartu, teks tombol, badge (`min-size >= 12px`).
2. **`text-sm` (`14px`)** — Judul kartu pintas, judul widget, isi sel tabel utama.
3. **`text-xl` (`20px`)** — Nilai KPI teks/mobile heading (`text-xl md:text-2xl`).
4. **`text-2xl` (`24px`)** — Judul halaman (`<h1>`) dan angka KPI utama desktop.

Gunakan `tabular-nums` untuk seluruh angka statistik, nomor agenda, dan tanggal agar sejajar vertikal.

---

## Token 4 — Radius (`outer = inner + padding`)

Sudut bersarang harus konsentris: radius luar selalu sama dengan radius elemen dalam ditambah padding kontainer di antaranya.

- **Pola standar kartu:**
  - Kontainer luar: `rounded-3xl` (**24 px**)
  - Padding kontainer: `p-4` (**16 px**)
  - Elemen di dalamnya (kotak ikon, tombol, pill badge, thumbnail): `rounded-lg` (**8 px**) -> `8 + 16 = 24 px`.
- **Pengecualian eksplisit:**
  - Elemen bundar penuh seperti dot status, avatar, atau progress bar track tetap memakai `rounded-full`.
  - Elemen mikro seperti indikator skeleton kecil dapat memakai `rounded-sm` (`2 px`).

---

## Token 5 — Shadows (2 Level Elevasi)

Hanya dua level bayangan yang boleh dipakai:

1. **Level 1 (`shadow-xs`) — Permukaan Statis & Kontrol Terangkat:** Dipakai pada kartu dashboard, widget tabel, kotak peringatan inline, dan kontrol sekunder terangkat (`0 1px 2px 0 ...`).
2. **Level 2 (`shadow-lg`) — Lapisan Mengambang (*Floating*):** Khusus untuk elemen yang melayang di atas halaman (`Dialog`, `Popover`, `DropdownMenu`, floating batch toolbar).

---

## Checklist Audit Cepat (Runnable Check)

Jalankan perintah berikut pada berkas UI yang baru dikerjakan untuk memastikan nol pelanggaran token (`oddSpace: []`, maksimal 4 ukuran `texts`, radius konsentris, dan shadow seragam):

```powershell
node -e "
const fs = require('fs');
const files = ['frontend/src/app/surat/page.tsx', 'frontend/src/app/surat/_components/SuratHubComponents.tsx'];
const src = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const texts = [...new Set(src.match(/\b(?:text-(?:xs|sm|base|lg|xl|2xl|3xl|\[[^\]]+\]))\b/g) || [])];
const oddSpace = [...new Set(src.match(/\b(?:[mp][xytrbl]?|gap(?:-[xy])?|space-[xy])-(?:\d+\.5|0\.5)\b/g) || [])];
const radii = [...new Set(src.match(/\brounded(?:-[a-z0-9]+)?\b/g) || [])];
const shadows = [...new Set(src.match(/\bshadow(?:-[a-z0-9]+)?\b/g) || [])];
console.log(JSON.stringify({ texts, oddSpace, radii, shadows }, null, 2));
"
```

### Acuan Implementasi Terverifikasi (Status 16 November 2026)
- **Definisi Role Token `--ds-*`:** [`frontend/src/app/globals.css`](../frontend/src/app/globals.css)
- **Modul Persuratan (`c499257f`, `a41549b4`):** [`frontend/src/app/surat/`](../frontend/src/app/surat/page.tsx) (seluruh halaman, dialog, & popover non-cetak) + tombol sekunder global `.kpg-secondary` / `.psr-secondary` di [`kepegawaian.css`](../frontend/src/app/kepegawaian/kepegawaian.css).
- **Modul Kepegawaian & Surat Tugas (`540fb44b`):** [`frontend/src/app/kepegawaian/`](../frontend/src/app/kepegawaian/page.tsx) (dashboard, daftar & detail pegawai, cuti, uang makan, surat masuk, surat tugas, & pengaturan).
- **Modul BMN (`d20bfcaf`):** [`frontend/src/app/bmn/`](../frontend/src/app/bmn/page.tsx) + `.bmn-secondary` di [`bmn-ui.css`](../frontend/src/app/bmn/bmn-ui.css) (dashboard, aset, peminjaman, pemeliharaan, disposal, import review, laporan BA, pengaturan master, paket lelang, & kandidat rusak berat).
- **Pengecualian Dokumen Cetak Fisik:** Template naskah dan kertas kerja cetak (`LembarDisposisiSheet`, `SuratDinasDocument`, `reports/_components/*Document.tsx`, `auction-candidates/_components/*Document.tsx`, blok `[210mm]` pada `DocumentContentEditorModal.tsx`, dan blok `.kk-page` pada `KertasKerjaAssetSection.tsx`) tetap mempertahankan kertas putih (`#ffffff`) dan tinta hitam (`#000000`) sesuai standar fisik resmi.
