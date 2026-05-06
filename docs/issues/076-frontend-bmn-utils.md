# Issue #076 — Frontend — BMN Utils & Constants (Pabrik Perkakas Standar)

> **Type**: `chore`
> **Labels**: `frontend`, `refactoring`, `module-bmn`
> **Priority**: 🔴 Critical (Menghindari "Spaghetti Code" dan Pemborosan Logika)
> **Complexity**: 🟢 Simple (Ekstraksi Fungsi dan Konstanta Terpusat)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Keseluruhan Issue BMN Frontend (068 - 075)

---

## Branch

```
issue/076-frontend-bmn-utils
```

## Deskripsi

Selamat, kita telah mencapai pijakan penutup (*Final Polish*) dari Modul Aset Negara (BMN)! 🧹✨

Dalam merakit layar *Dashboard* (Issue 069), Tabel Master (Issue 070), hingga *Disposal* (Issue 074), kita secara konsisten melakukan "Pemborosan Kode" *(Code Duplication)*. Kita berulang kali mengetik fungsi `formatRupiah` dan terus menuliskan logika pewarnaan Hijau/Merah untuk status "Baik/Rusak Berat" di setiap halaman. 

Jika kelak Kementrian Keuangan mengubah aturan format uang, kita harus membongkar 10 halaman aplikasi! Ini adalah **Pelanggaran Aturan Arsitektur Bersih (Clean Code / DRY - Don't Repeat Yourself)**.

Pada **Issue #076** ini, kita akan menebus dosa pengulangan tersebut. Kita akan mendirikan 2 fail pusat (Gudang Perkakas):
1. **`constants.ts`**: Menyimpan daftar teks mutlak (seperti pilihan Kondisi Barang).
2. **`bmn-utils.ts`**: Menyimpan fungsi pemoles uang dan resolver pewarnaan *Badge*.

Dengan demikian, halaman-halaman antarmuka kita akan menjadi sangat kurus dan efisien!

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `frontend/src/lib/constants/` (jika belum ada).
- [ ] Tersedia `bmn.ts` yang menyimpan konstanta daftar pilihan kondisi barang.
- [ ] Tersedia `bmn-utils.ts` di folder `lib/` yang menyimpan fungsi `formatRupiah` dan `getAssetConditionStyle`.
- [ ] Menginstruksikan pelanjut untuk mulai mengimpor *(import)* fungsi ini di komponen BMN masa depan, bukan menulis manual.

---

## Panduan Implementasi Cerdas

### 1. Kotak Konstanta (Daftar Pilihan Abadi)
**Path:** `frontend/src/lib/constants/bmn.ts`

Buat struktur pelindung variabel agar tidak bisa diganggu-gugat (Terkunci):

```typescript
/**
 * PUSAT KONSTANTA MODUL BMN BKSDA
 * Digunakan untuk mengisi opsi Dropdown <select> dan Filter Pencarian.
 */
export const BMN_CONSTANTS = {
    // 3 Status Fisik Baku sesuai Audit BPK
    CONDITIONS: [
        'Baik',
        'Rusak Ringan',
        'Rusak Berat'
    ] as const,

    // Hierarki Lokasi BKSDA (Opsional: Dapat diperluas sesuai SK Penempatan)
    LOCATIONS: [
        'Gudang Utama (Kanwil)',
        'Resort Wilayah 1',
        'Resort Wilayah 2',
        'Pos Jaga Perbatasan',
        'Bengkel Operasional'
    ] as const,
};

// Mengekstrak tipe union agar Typescript pintar ('Baik' | 'Rusak Ringan' | 'Rusak Berat')
export type AssetState = typeof BMN_CONSTANTS.CONDITIONS[number];
```

### 2. Perkakas BMN (Pemoles & Pewarna)
**Path:** `frontend/src/lib/bmn-utils.ts`

Salin fungsi penata uang dan penentu warna otomatis berikut. Keduanya memuat kecerdasan visual (UI Psychology) untuk merender Tailwind dengan tepat.

```typescript
import { AssetState } from "./constants/bmn";

/**
 * Mengonversi nominal murni (4500000) menjadi format legal (Rp 4.500.000,00)
 */
export const formatRupiah = (angka: number | string | null | undefined): string => {
    if (angka === null || angka === undefined) return "Rp 0";
    
    const parsedNumber = typeof angka === 'string' ? parseFloat(angka) : angka;
    if (isNaN(parsedNumber)) return "Rp 0";

    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(parsedNumber);
};

/**
 * Resolver Estetika: Memberikan palet warna Tailwind secara instan berdasarkan kondisi.
 * Hindari menulis logika ini berulang-ulang di dalam file HTML/JSX!
 */
export const getAssetConditionStyle = (kondisi: AssetState | string): string => {
    switch (kondisi) {
        case 'Baik':
            return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        case 'Rusak Ringan':
            return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        case 'Rusak Berat':
            // Animate-Pulse memberikan efek denyut peringatan darurat
            return 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse';
        default:
            return 'bg-zinc-800 text-zinc-400 border border-zinc-700'; // Fallback warna abu-abu
    }
};
```

---

## Troubleshooting

### Q: Haruskah saya membedah balik *(Refactor)* halaman Dashboard, Laporan, dan Datagrid untuk langsung menggunakan *Utils* ini sekarang?

**Artinya:** Upaya untuk merapikan kode lama.
**Solusi:** Tidak diwajibkan secara mutlak pada PR ini jika ditakutkan menimbulkan konflik. Namun, seorang programer profesional *(Senior)* disarankan untuk setidaknya menyapu halaman Datagrid raksasa (`assets/page.tsx`) agar mulai menggunakan `formatRupiah` dari modul eksternal ini.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(bmn): centralize asset heuristic constants and currency transformation utilities" \
  --body "Membersihkan ancaman pengulangan kode *(Spaghetti Code/Code Duplication)*. Mengekstraksi fungsionalitas penataan Rupiah dan resolusi kelas Tailwind ke dalam modul murni \`lib/bmn-utils.ts\`. Detail di docs/issues/076-frontend-bmn-utils.md" \
  --label "frontend,refactoring,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/076-frontend-bmn-utils
```

### Step 3: Kerjakan

Pahat `frontend/src/lib/constants/bmn.ts` dan `frontend/src/lib/bmn-utils.ts`. Pastikan tidak ada satupun kode komponen *React* di dalamnya; mereka murni hanyalah kelas *Typescript* telanjang *(Pure Functions)*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "chore(bmn): centralize asset heuristic constants and currency transformation utilities (#76)"
git push -u origin issue/076-frontend-bmn-utils
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(bmn): centralize asset heuristic constants and currency transformation utilities (#76)" \
  --body "## Summary
Langkah final stabilisasi Fondasi Frontend BMN melalui Konsolidasi Utilitas dan Konstanta.

## Changes
- Pembuatan \`BMN_CONSTANTS\` pengunci Opsi Teks *(Enum Pattern)* di wilayah \`/constants\`.
- Isolasi pemroses algoritma finansial \`formatRupiah\` ke dalam utilitas murni.
- Isolasi generator Psikologi UI \`getAssetConditionStyle()\` untuk memastikan keseragaman palet warna (Emerald/Amber/Red) di seluruh penjuru aplikasi tanpa celah Typo klasifikasi.

## Rules Compliance
- [x] Lolos Doktrin Ekstraksi *Clean Code* (DRY Principle): Tidak ada satupun kalkulasi manipulasi Teks Data tingkat tinggi yang dibiarkan tercecer di dalam ruang *Rendering UI (page.tsx)*.

Closes #76" \
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
Modul BMN Fase 5 telah selesai. Kini kita merapikan sisa perkakas (Fungsi Konversi Rupiah dan Pewarnaan Tailwind) agar ditaruh di Gudang `lib/` sehingga tidak tumpang tindih.

## Task

Kerjakan Issue #076 (Frontend — BMN Utils & Constants).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/076-frontend-bmn-utils.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file `frontend/src/lib/constants/bmn.ts` dan tempel blok *Constants*.
3. Buat file `frontend/src/lib/bmn-utils.ts` dan tempel blok *Resolver Rupiah & Tailwind*.
4. Pastikan eksport berfungsi murni (Tidak dicampur aduk dengan `<div/>` React).
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
