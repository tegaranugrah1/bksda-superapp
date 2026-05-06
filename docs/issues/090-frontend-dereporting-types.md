# Issue #090 — Frontend — DeReporting Types (Paspor Identitas Data TypeScript)

> **Type**: `chore`
> **Labels**: `frontend`, `typescript`, `module-dereporting`
> **Priority**: 🟡 Medium (Stabilisasi Tipe Data untuk Pencegahan Bug Masa Depan)
> **Complexity**: 🟢 Simple (Deklarasi Interface Murni Tanpa Logika)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #077 (Struktur Tabel Database sebagai Referensi)

---

## Branch

```
issue/090-frontend-dereporting-types
```

## Deskripsi

Selamat datang di titik penutup Fase 6 (Modul DeReporting)! 🏁

Selama membangun halaman Internal (Issue 088) dan Sub-Pages (Issue 089), kita menggunakan tipe data `any` di mana-mana. Contoh: `response?.data?.map((report: any) => ...)`. Kata `any` ini adalah "Surat Izin Bebas Penjara" bagi bug. TypeScript tidak akan pernah memperingatkanmu jika kamu menulis `report.judl_laporan` (salah ketik!) karena `any` membiarkan segalanya lolos.

Pada **Issue #090** ini, kita akan mendirikan "Kantor Imigrasi Data". Setiap objek data yang mengalir dari Backend ke layar Frontend wajib memiliki **Paspor Identitas** berupa `interface` TypeScript. Dengan demikian, editor kode (VS Code) akan langsung membunyikan alarm merah jika kamu salah menulis nama properti!

**Mengapa file ini sangat penting?**
- **Autocomplete Gratis**: Setelah mengetik `report.`, VS Code akan otomatis menampilkan daftar lengkap properti yang tersedia (`judul_laporan`, `bidang`, `tahun`, dll).
- **Deteksi Salah Ketik**: Jika kamu menulis `report.judl_laporan`, TypeScript langsung memberitahu bahwa properti itu tidak ada.
- **Dokumentasi Hidup**: *Junior Programmer* baru tinggal membuka file ini untuk memahami bentuk seluruh data Modul DeReporting.

---

## Acceptance Criteria

- [ ] File diciptakan: `frontend/src/types/dereporting.ts`.
- [ ] Tersedia `interface` untuk setiap entitas Master Data (Tahun, Bidang, Jenis, Kategori, JenisData, Koordinator, Anggaran).
- [ ] Tersedia `interface` untuk Laporan Internal (`DrInternal`) dan Laporan Eksternal (`DrEkternal`).
- [ ] Tersedia `interface` untuk format respons API bertipe *Paginated* (`DrPaginatedResponse<T>`).
- [ ] Setiap `interface` memiliki komentar JSDoc singkat yang menjelaskan kegunaan propertinya.

---

## Panduan Implementasi Cerdas

**Path:** `frontend/src/types/dereporting.ts`

Pahat seluruh Paspor Identitas Data di bawah ini secara seksama:

```typescript
/**
 * ══════════════════════════════════════════════════════════════
 * PUSAT TIPE DATA MODUL DEREPORTING — BKSDA SUPERAPP
 * ══════════════════════════════════════════════════════════════
 * 
 * File ini adalah "Kantor Imigrasi" bagi seluruh data yang mengalir
 * dari Backend Laravel ke layar Frontend React.
 * 
 * Aturan:
 * 1. Setiap properti HARUS sesuai dengan nama kolom di Database (snake_case).
 * 2. Properti opsional ditandai dengan tanda tanya (?).
 * 3. Relasi (belongsTo) ditandai dengan tipe entitas terkait atau null.
 */

// ──────────────────────────────────────────────────
// ENTITAS MASTER DATA (7 Tabel Referensi)
// ──────────────────────────────────────────────────

/** Tahun Pelaporan Aktif */
export interface DrTahun {
    id: string;
    tahun: number;
    is_active: boolean;
    created_at: string;
}

/** Bidang Kerja BKSDA (Level Teratas Hierarki) */
export interface DrBidang {
    id: string;
    nama: string;
    created_at: string;
}

/** Koordinator / Penanggung Jawab Laporan */
export interface DrKoordinator {
    id: string;
    nama: string;
    created_at: string;
}

/** Sumber Anggaran Pembiayaan */
export interface DrAnggaran {
    id: string;
    nama: string;
    created_at: string;
}

/** Jenis Laporan (Level 2 — Anak dari Bidang) */
export interface DrJenis {
    id: string;
    bidang_id: string;
    nama: string;
    /** Relasi ke atas: Data Bidang induk */
    bidang?: DrBidang | null;
    created_at: string;
}

/** Kategori Laporan (Level 3 — Anak dari Jenis) */
export interface DrKategori {
    id: string;
    jenis_id: string;
    nama: string;
    /** Relasi ke atas: Data Jenis induk */
    jenis?: DrJenis | null;
    created_at: string;
}

/** Jenis Data Spesifik (Level 4 — Anak dari Kategori) */
export interface DrJenisData {
    id: string;
    kategori_id: string;
    koordinator_id: string | null;
    nama: string;
    /** Relasi ke atas */
    kategori?: DrKategori | null;
    koordinator?: DrKoordinator | null;
    created_at: string;
}

// ──────────────────────────────────────────────────
// ENTITAS LAPORAN TRANSAKSIONAL
// ──────────────────────────────────────────────────

/** Identitas Ringkas Pengunggah (Eager Loading parsial dari tabel users) */
export interface DrUploader {
    id: string;
    nama_lengkap: string;
    nip: string;
}

/** Laporan Internal (Diunggah oleh Pegawai BKSDA) */
export interface DrInternal {
    id: string;
    user_id: string;
    tahun_id: string;
    bidang_id: string;
    jenis_id: string;
    kategori_id: string;
    jenis_data_id: string;
    koordinator_id: string | null;
    anggaran_id: string | null;
    judul_laporan: string;
    file_path: string;
    keterangan: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    /** Relasi Eager Loading (Dimuat oleh Controller Issue 081) */
    uploader?: DrUploader | null;
    tahun?: DrTahun | null;
    bidang?: DrBidang | null;
    jenis?: DrJenis | null;
    kategori?: DrKategori | null;
    jenis_data?: DrJenisData | null;
    koordinator?: DrKoordinator | null;
    anggaran?: DrAnggaran | null;
}

/** Status Tinjauan Laporan Eksternal */
export type DrEkternalStatus = "Menunggu Tinjauan" | "Diterima" | "Ditolak";

/** Laporan Eksternal (Diunggah oleh Masyarakat Tanpa Login) */
export interface DrEkternal {
    id: string;
    nama_pelapor: string;
    instansi: string | null;
    email: string | null;
    no_hp: string | null;
    judul_laporan: string;
    file_path: string;
    deskripsi: string | null;
    /** Hanya terlihat oleh Admin (Tidak boleh dikirim ke layar publik) */
    ip_address: string | null;
    status: DrEkternalStatus;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

// ──────────────────────────────────────────────────
// UTILITAS RESPONS API
// ──────────────────────────────────────────────────

/** Format Pagination Laravel Standard (Project Rule 5.3) */
export interface DrPaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}
```

---

## Troubleshooting

### Q: Saya sudah membuat file ini, tapi halaman `page.tsx` masih menggunakan `any`. Apakah harus diubah sekarang?

**Artinya:** Kamu bertanya apakah harus melakukan *Refactoring*.
**Solusi:** Tidak wajib pada PR ini. Mengganti `any` dengan tipe yang benar di seluruh halaman adalah tugas *Refactoring* lanjutan yang bisa dijalankan secara bertahap oleh AI Pelanjut. Cara menggunakannya sangat mudah:

```tsx
// SEBELUM (Rapuh, tanpa pelindung):
response?.data?.map((report: any) => ...)

// SESUDAH (Kokoh, terproteksi TypeScript):
import type { DrInternal } from "@/types/dereporting";
response?.data?.map((report: DrInternal) => ...)
```

Hanya dengan mengganti `any` menjadi `DrInternal`, seluruh properti `report.judul_laporan`, `report.bidang?.nama`, dll akan langsung muncul di *Autocomplete* VS Code!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(dereporting): define comprehensive TypeScript interface contracts for all module entities" \
  --body "Mendirikan 'Kantor Imigrasi Data' TypeScript untuk Modul DeReporting. Mendaftarkan seluruh entitas (9 Master + 2 Transaksional + 1 Utilitas Paginasi) ke dalam paspor \`interface\` bertipe ketat. Detail di docs/issues/090-frontend-dereporting-types.md" \
  --label "frontend,typescript,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/090-frontend-dereporting-types
```

### Step 3: Kerjakan

Ciptakan satu file: `frontend/src/types/dereporting.ts`. Salin seluruh blok *Interface* dari cetak biru di atas tanpa modifikasi apapun. Pastikan komentar JSDoc (`/** ... */`) ikut tersalin karena itu berfungsi sebagai dokumentasi otomatis!

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "chore(dereporting): define comprehensive TypeScript interface contracts for all module entities (#90)"
git push -u origin issue/090-frontend-dereporting-types
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(dereporting): define comprehensive TypeScript interface contracts for all module entities (#90)" \
  --body "## Summary
Penutup Fase 6 (DeReporting): Stabilisasi Kontrak Tipe Data.

## Changes
- Pendaftaran 7 \`interface\` Master Data (\`DrTahun\`, \`DrBidang\`, \`DrJenis\`, \`DrKategori\`, \`DrJenisData\`, \`DrKoordinator\`, \`DrAnggaran\`).
- Pendaftaran 2 \`interface\` Transaksional (\`DrInternal\`, \`DrEkternal\`) lengkap dengan properti relasional opsional untuk *Eager Loading*.
- Pendaftaran 1 \`interface\` utilitas \`DrPaginatedResponse<T>\` menggunakan *Generic Type* untuk membungkus seluruh respons halaman.
- Penciptaan \`type\` union \`DrEkternalStatus\` untuk mengunci status hanya pada 3 nilai legal.

## Rules Compliance
- [x] Lolos Doktrin Penamaan (Project Rule 9.5): Seluruh properti *Interface* menggunakan \`snake_case\` selaras dengan nama kolom Database PostgreSQL.

Closes #90" \
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
Fase 6 (DeReporting) akan resmi ditutup dengan pembuatan file TypeScript Interfaces. File ini berfungsi sebagai "Paspor Identitas" bagi seluruh data yang mengalir dari Backend ke Frontend, memastikan tidak ada salah ketik properti.

## Task

Kerjakan Issue #090 (Frontend — DeReporting Types).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/090-frontend-dereporting-types.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file baru: `frontend/src/types/dereporting.ts`.
3. Salin SELURUH blok Interface dari cetak biru tanpa modifikasi.
4. Pastikan komentar JSDoc (`/** ... */`) ikut tersalin karena berfungsi sebagai dokumentasi hidup.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
