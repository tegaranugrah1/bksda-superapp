# Issue #115 — Frontend — Utility Functions (Perkakas Tak Terlihat yang Menjaga Segalanya Berjalan)

> **Type**: `chore` / `documentation`
> **Labels**: `frontend`, `foundation`
> **Priority**: 🔴 Critical (Diimpor oleh Hampir Setiap File di Project)
> **Complexity**: 🟢 Simple (Pure Functions — Tidak Ada State, Tidak Ada UI)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #003 (Frontend Init)

---

## Branch

```
issue/115-frontend-utility-functions
```

## Deskripsi

Di balik setiap tombol, tabel, dan form — ada **fungsi-fungsi kecil tak terlihat** yang menjalankan tugas-tugas penting: memformat tanggal, membersihkan HTML berbahaya, menggabungkan kelas CSS, dan menghubungkan frontend ke backend. Issue ini mendokumentasikan seluruh isi folder `lib/` — **otak logika** frontend.

**5 File Utilitas yang Dibahas:**

| # | File | Isi | Dipakai Oleh |
|---|------|-----|-------------|
| 1 | `utils.ts` | `cn()`, `formatDate()`, `sanitizeHtml()` | Seluruh komponen UI |
| 2 | `api.ts` | Axios instance + token interceptor | Seluruh API call |
| 3 | `constants.ts` | Opsi dropdown, hierarki lokasi | Form BMN & Inventory |
| 4 | `letter-utils.ts` | Format tanggal Indonesia, terbilang, NIP | Surat Tugas & Laporan |
| 5 | `bmn-utils.ts` | Deteksi kendaraan, status pajak | Modul BMN |

---

## Acceptance Criteria

- [ ] File `lib/utils.ts` tersedia dengan 3 fungsi: `cn()`, `formatDate()`, `sanitizeHtml()`.
- [ ] File `lib/api.ts` tersedia dengan Axios instance + interceptor.
- [ ] File `lib/constants.ts` tersedia dengan konstanta dropdown.
- [ ] File `lib/letter-utils.ts` tersedia dengan 5 fungsi pemformat.
- [ ] File `lib/bmn-utils.ts` tersedia dengan fungsi deteksi kendaraan.

---

## File 1: `lib/utils.ts` — Perkakas Universal

File ini diimpor oleh **setiap komponen shadcn/ui**. Jika file ini tidak ada, TIDAK ADA komponen UI yang berjalan.

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import DOMPurify from "dompurify";

// ═══════════════════════════════════════════
// 1. cn() — Penggabung Kelas CSS Cerdas
// ═══════════════════════════════════════════

/**
 * Menggabungkan kelas CSS dan menyelesaikan konflik Tailwind.
 *
 * CONTOH:
 * cn("p-4", "p-8")           → "p-8"      (bukan "p-4 p-8")
 * cn("text-red-500", false)  → "text-red-500" (false diabaikan)
 * cn("mt-2", isActive && "bg-blue-500") → bergantung kondisi
 *
 * TANPA cn():
 * className="p-4 p-8" → hasilnya TIDAK TERPREDIKSI
 * (tergantung urutan di CSS file, bukan urutan di className)
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// ═══════════════════════════════════════════
// 2. formatDate() — Format Tanggal Indonesia
// ═══════════════════════════════════════════

/**
 * Mengubah string tanggal menjadi format Indonesia.
 *
 * CONTOH:
 * formatDate("2024-03-15")     → "15 Mar 2024"
 * formatDate(null)             → "-"
 * formatDate("bukan-tanggal")  → "bukan-tanggal" (fallback)
 */
export const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
        return format(new Date(dateString), 'd MMM yyyy', { locale: idLocale });
    } catch {
        return dateString;
    }
};

// ═══════════════════════════════════════════
// 3. sanitizeHtml() — Pembersih HTML Berbahaya
// ═══════════════════════════════════════════

/**
 * Membersihkan konten HTML dari serangan XSS sebelum ditampilkan.
 *
 * MENGAPA INI PENTING?
 * CMS menghasilkan HTML (dari RichTextEditor).
 * HTML ini ditampilkan via dangerouslySetInnerHTML.
 * Jika HTML mengandung <script>alert('hacked')</script>,
 * browser AKAN menjalankannya! sanitizeHtml() menghapus tag berbahaya.
 *
 * CONTOH:
 * sanitizeHtml("<p>Hello</p>")                    → "<p>Hello</p>"
 * sanitizeHtml("<script>alert('x')</script>")     → ""
 * sanitizeHtml("<img src=x onerror=alert('x')>")  → "<img src=\"x\">"
 *
 * CARA PAKAI:
 * <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';
    const processedHtml = html.replace(/&nbsp;/g, ' ');

    if (typeof window === 'undefined') return processedHtml; // SSR fallback
    return DOMPurify.sanitize(processedHtml, {
        ALLOWED_TAGS: [
            'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'a', 'ul', 'ol', 'li',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
            'img', 'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'div', 'span', 'hr', 'sub', 'sup', 'iframe',
        ],
        ALLOWED_ATTR: [
            'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style',
            'width', 'height', 'id', 'colspan', 'rowspan',
            'allow', 'allowfullscreen', 'frameborder',
        ],
    });
}
```

### Dependensi

```bash
npm install clsx tailwind-merge date-fns dompurify
npm install -D @types/dompurify
```

---

## File 2: `lib/api.ts` — Jembatan ke Backend

File ini adalah **satu-satunya** pintu keluar ke backend. Semua API call WAJIB melalui file ini.

### Anatomi api.ts

```
┌─────────────────────────────────────────────────────┐
│                    api.ts                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  axios.create()                                     │
│  ├── baseURL: NEXT_PUBLIC_API_URL + "/api"          │
│  ├── headers: JSON + Accept                         │
│  └── withCredentials: true (kirim cookie CSRF)      │
│                                                     │
│  Request Interceptor (SEBELUM request terkirim):    │
│  └── Ambil token dari localStorage                  │
│      └── Tempel di header: Authorization: Bearer X  │
│                                                     │
│  Response Interceptor (SETELAH response diterima):  │
│  ├── 401 Unauthorized → Redirect ke /login          │
│  └── 403 Forbidden → Sync ulang izin user           │
│                                                     │
│  Helper Functions:                                  │
│  ├── getBackendUrl() → URL backend tanpa /api       │
│  └── normalizeImageUrl() → Konversi URL gambar      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2 Instance API — Kapan Pakai Mana?

```tsx
// ═══ ADMIN PAGES (CMS, BMN, Inventory, DeReporting) ═══
// Gunakan `api` (dari lib/api.ts) — SELALU kirim token Bearer
import api from "@/lib/api";
const res = await api.get("/cms/admin/informasi");

// ═══ PUBLIC PAGES (Landing, Informasi, Kawasan, dll) ═══
// Gunakan `axios` biasa — JANGAN kirim token (pengunjung umum)
import axios from "axios";
const API = process.env.NEXT_PUBLIC_API_URL + "/api";
const res = await axios.get(`${API}/cms/public/informasi`);
```

> ⚠️ **ATURAN EMAS:** Halaman publik TIDAK BOLEH mengimpor `@/lib/api`. Jika kita pakai `api` (instance dengan token), token admin bisa bocor ke browser pengunjung via network tab.

---

## File 3: `lib/constants.ts` — Konstanta Dropdown

Berisi opsi-opsi pilihan yang **statis** (tidak berubah sering) untuk form dropdown.

```typescript
// Opsi status sertifikasi tanah
export const OPTION_STATUS_SERTIFIKASI = [
    "Belum Bersertipikat",
    "Bersertipikat Seluruh Bidang",
    "Tidak Ada Inputan",
];

// Opsi jenis dokumen pendukung
export const OPTION_JENIS_DOKUMEN = [
    "Berita Acara Serah Terima",
    "Bersertifikat atas nama Pemerintah RI c.q Kementerian/ Lembaga",
    "Dokumen Lainnya",
    "Ijin Mendirikan Bangunan",
    "Surat Pelepasan Hak",
    "Surat Tanda Nomor Kendaraan",
];

// Status BMN
export const OPTION_STATUS_BMN = ["Aktif", "Dipinjam", "Dalam Pemeliharaan", "Dihapuskan"];

// Intra/Ekstra
export const OPTION_INTRA_EXTRA = ["Intra", "Extra"];

// Hierarki lokasi: Wilayah → Resor
export const LOCATION_HIERARCHY: Record<string, string[]> = {
    "Balai KSDA Kalimantan Timur": [
        "Urusan Umum dan Perlengkapan",
        "Urusan Kepegawaian",
        "Urusan Program",
        // ...
    ],
    "Seksi KSDA Wilayah I": [
        "Resor KSDA Berau",
        "Resor KSDA Pulau Semama dan Pulau Sangalaki",
        // ...
    ],
    // ...
};
```

### Cara Pakai

```tsx
import { OPTION_STATUS_BMN } from "@/lib/constants";

<Select onValueChange={setStatus}>
    <SelectTrigger><SelectValue placeholder="Pilih Status" /></SelectTrigger>
    <SelectContent>
        {OPTION_STATUS_BMN.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
    </SelectContent>
</Select>
```

---

## File 4: `lib/letter-utils.ts` — Utilitas Surat & Dokumen

Fungsi-fungsi pemformat untuk dokumen resmi pemerintah (Surat Tugas, Laporan).

```typescript
/**
 * Format tanggal ke format surat Indonesia.
 * formatDateIndonesian("2024-03-15") → "15 Maret 2024"
 */
export function formatDateIndonesian(dateStr: string): string {
    if (!dateStr) return '...';
    const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Angka ke terbilang (untuk durasi hari di Surat Tugas).
 * numberToWords(7) → "tujuh"
 * numberToWords(14) → "empat belas"
 */
export function numberToWords(n: number): string {
    const ones = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam',
        'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas',
        'dua belas', /* ... hingga 31 */ ];
    if (n <= 31) return ones[n];
    return String(n);
}

/**
 * Indeks ke huruf alfabet (untuk daftar bernomor di surat).
 * indexToLetter(0) → "a."
 * indexToLetter(2) → "c."
 */
export function indexToLetter(idx: number): string {
    return String.fromCharCode(97 + idx) + '.';
}

/**
 * Hitung selisih hari antara 2 tanggal (inklusif).
 * daysBetween("2024-03-01", "2024-03-07") → 7
 */
export function daysBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
}

/**
 * Format NIP pegawai sesuai standar pemerintah.
 * formatNIP("198504132010011001") → "19850413 201001 1 001"
 */
export function formatNIP(nip: string): string {
    if (!nip) return '...';
    const cleaned = nip.replace(/\s/g, '');
    if (cleaned.length !== 18) return cleaned;
    return `${cleaned.substring(0, 8)} ${cleaned.substring(8, 14)} ${cleaned.substring(14, 15)} ${cleaned.substring(15)}`;
}
```

---

## File 5: `lib/bmn-utils.ts` — Utilitas Aset Negara

Fungsi khusus untuk modul BMN (Barang Milik Negara).

```typescript
import { format, differenceInDays, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/**
 * Deteksi apakah sebuah aset adalah kendaraan bermotor.
 * Dipakai untuk menampilkan/menyembunyikan field khusus kendaraan
 * (no. polisi, masa berlaku STNK, dll).
 *
 * isVehicle({ nama_barang: "Toyota Avanza" }) → true
 * isVehicle({ nama_barang: "Meja Rapat" })    → false
 */
export const isVehicle = (asset: any): boolean => {
    if (!asset) return false;
    if (asset.no_polisi && asset.no_polisi !== '-') return true;

    const text = [asset.jenis_bmn, asset.nama_barang]
        .filter(Boolean).join(' ').toLowerCase();

    const keywords = [
        'alat angkutan', 'kendaraan', 'motor', 'mobil', 'bus', 'truk',
        'station wagon', 'jeep', 'sedan', 'minibus', 'pickup',
        'ambulans', 'sepeda motor', 'roda 2', 'roda 4', 'roda 6'
    ];

    return keywords.some(k => text.includes(k));
};

/**
 * Cek status pajak kendaraan (STNK).
 *
 * getVehicleTaxStatus("2024-01-15") → { days: -50, status: "expired", label: "Expired" }
 * getVehicleTaxStatus("2024-06-01") → { days: 10, status: "warning", label: "Segera Perpanjang" }
 * getVehicleTaxStatus("2025-12-01") → { days: 365, status: "safe", label: "Aktif" }
 */
export const getVehicleTaxStatus = (dateStr?: string | null) => {
    if (!dateStr) return { days: null, status: 'empty' as const, label: 'Belum Diisi' };

    const target = startOfDay(new Date(dateStr));
    const today = startOfDay(new Date());
    const days = differenceInDays(target, today);

    if (days < 0) return { days, status: 'expired' as const, label: 'Expired' };
    if (days < 30) return { days, status: 'warning' as const, label: 'Segera Perpanjang' };
    return { days, status: 'safe' as const, label: 'Aktif' };
};
```

---

## Peta Impor — Siapa Mengimpor Apa?

```
┌──────────────────────────────────────────────────────────────┐
│                        lib/utils.ts                          │
│  cn() ← Semua komponen UI (button, dialog, table, dll)      │
│  formatDate() ← Semua tabel yang menampilkan tanggal        │
│  sanitizeHtml() ← Halaman yang render konten CMS            │
├──────────────────────────────────────────────────────────────┤
│                        lib/api.ts                            │
│  api.get/post/put/delete ← HANYA halaman admin              │
│  normalizeImageUrl() ← Semua <Image> yang pakai foto aset   │
├──────────────────────────────────────────────────────────────┤
│                      lib/constants.ts                        │
│  OPTION_* ← Form dropdown di BMN & Inventory                │
│  LOCATION_HIERARCHY ← Filter lokasi berjenjang              │
├──────────────────────────────────────────────────────────────┤
│                    lib/letter-utils.ts                       │
│  formatDateIndonesian() ← Preview surat dinas               │
│  formatNIP() ← Tampilan NIP di surat                        │
│  numberToWords() ← Durasi hari terbilang                    │
├──────────────────────────────────────────────────────────────┤
│                     lib/bmn-utils.ts                         │
│  isVehicle() ← Tampilkan/sembunyikan field kendaraan        │
│  getVehicleTaxStatus() ← Badge warna status pajak STNK      │
└──────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Q: `sanitizeHtml()` menghapus `<iframe>` YouTube!

**Solusi:** `iframe` sudah ada di `ALLOWED_TAGS`. Pastikan atribut `src`, `allow`, `allowfullscreen` juga di `ALLOWED_ATTR`. Jika masih terhapus, cek apakah `src` URL mengandung protokol yang tidak diizinkan.

### Q: `normalizeImageUrl()` mengarah ke Supabase yang salah!

**Solusi:** URL Supabase di-hardcode di fungsi. Jika project pindah ke bucket Supabase lain, ubah URL di fungsi `normalizeImageUrl()`.

### Q: `formatDate()` menampilkan tanggal 1 hari mundur!

**Solusi:** Ini masalah timezone. `new Date("2024-03-15")` diinterpretasi sebagai UTC midnight, yang saat dikonversi ke WIB (UTC+7) masih tanggal 14. Solusi: gunakan `new Date("2024-03-15T00:00:00")` atau parse manual.

---

## Git Workflow

```bash
cd e:\bksda-superapp
gh issue create --title "chore(lib): document all utility functions — utils, api, constants, letter-utils, bmn-utils" --body "Closes #115" --label "frontend,foundation"
git checkout -b issue/115-frontend-utility-functions
# Copy & adapt 5 file dari superapp-inventory/frontend/src/lib/
git commit -m "chore(lib): document utility functions with import map and usage guide (#115)"
git push -u origin issue/115-frontend-utility-functions
gh pr create --title "chore(lib): utility functions documentation (#115)" --body "## Changes
- utils.ts: cn(), formatDate(), sanitizeHtml() — dipakai seluruh komponen UI.
- api.ts: Axios + token interceptor + 401/403 handler.
- constants.ts: Opsi dropdown statis BMN & Inventory.
- letter-utils.ts: 5 fungsi format surat dinas Indonesia.
- bmn-utils.ts: Deteksi kendaraan dan status pajak STNK.
- Peta impor: siapa mengimpor apa.
Closes #115" --base main
gh pr merge --squash --delete-branch
```

---

## 🤖 AI Prompt

````
## Context

Project: bksda-superapp (monorepo)
Workspace: e:\bksda-superapp\
Referensi: e:\superapp-inventory\frontend\src\lib\ (5 file utilitas)
Semua file utilitas sudah ada di project lama. Copy dan adaptasi ke project baru.

## Task

Kerjakan Issue #115 (Frontend — Utility Functions).
Ikuti instruksi di: `docs/issues/115-frontend-utility-functions.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Instal dependensi: `npm install clsx tailwind-merge date-fns dompurify use-debounce`.
3. Instal dev dep: `npm install -D @types/dompurify`.
4. Copy 5 file dari `superapp-inventory/frontend/src/lib/` ke `bksda-superapp/frontend/src/lib/`.
5. PENTING: Ubah URL Supabase di `normalizeImageUrl()` jika bucket berbeda.
6. PENTING: Halaman publik TIDAK BOLEH impor `@/lib/api` — pakai `axios` biasa.
7. Lakukan Git push dan `gh pr create`.
````
