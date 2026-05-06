# Issue #059 — Frontend — Inventory Types (TypeScript Interfaces)

> **Type**: `chore` / `refactor`
> **Labels**: `frontend`, `typescript`, `types`, `module-inventory`
> **Priority**: 🟡 Medium (Penyempurnaan Tipe Data / Clean Code)
> **Complexity**: 🟢 Simple (Definisi Struktur Tipe Statis)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #046, Issue #047 (Referensi Struktur Database)

---

## Branch

```
issue/059-frontend-inventory-types
```

## Deskripsi

Dalam perjalanan membangun Modul Logistik (Fase 4), kita telah banyak menggunakan pintasan `any` pada *Frontend*, misalnya `items?.map((item: any) => ...)`. Hal ini wajar dilakukan untuk mengejar kecepatan perancangan Purwarupa (*MVP / Minimum Viable Product*).

Namun, membiarkan `any` berserakan di aplikasi Next.js/TypeScript berskala besar akan memicu ancaman serius (*Type-safety Hazards*). Pada **Issue #059** yang merupakan penutup dari Fase Logistik ini, kita akan merapikan dan membakukan kerangka tipe data (*Interfaces*) untuk Modul Logistik.

Pembuatan berkas `inventory.ts` ini akan memudahkan pengembang *Frontend* di masa depan. Mereka cukup menekan tombol `Ctrl + Spasi` dan *Code Editor* akan memberikan rujukan cerdas *(Intellisense)* apa saja kolom yang tersedia dari Database tanpa harus membuka Supabase.

---

## Acceptance Criteria

- [ ] File `frontend/src/types/inventory.ts` dibuat.
- [ ] Mengekspor *Interface* baku untuk `ICategory`, `IOffice`, `IItem`, `IInventoryStock`, dan `IStockTransaction`.
- [ ] Menyediakan dukungan opsional `?` pada relasi *(Nested Objects)* untuk mengatasi balasan data kosong dari API.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\types\inventory.ts`

Buatlah direktori `types` di dalam `src` jika belum ada. Kemudian, salin cetak biru *TypeScript* ini:

```typescript
// ==========================================
// BKSDA SUPERAPP - INVENTORY MODULE TYPES
// ==========================================

export interface ICategory {
    id: string; // UUID
    nama_kategori: string;
    created_at?: string;
    updated_at?: string;
}

export interface IOffice {
    id: string; // UUID
    nama_kantor: string;
    lokasi?: string;
    penanggung_jawab_id?: string;
    
    // Relasi dari Modul Kepegawaian (Terkadang dimuat oleh backend via with())
    penanggung_jawab?: {
        id: string;
        nama_lengkap: string;
        nip: string;
    };
    
    created_at?: string;
    updated_at?: string;
}

export interface IItem {
    id: string; // UUID
    category_id: string;
    kode_barang: string;
    nama_barang: string;
    satuan: string;
    min_stock: number;
    
    // Relasi Database
    category?: ICategory;
    
    // Variabel kalkulasi mentah yang kadang dilempar dari DashboardController
    total_fisik?: number; 
    
    created_at?: string;
    updated_at?: string;
}

export interface IInventoryStock {
    id: string; // UUID
    office_id: string;
    item_id: string;
    quantity: number;
    
    // Relasi Database
    office?: IOffice;
    item?: IItem;
    
    created_at?: string;
    updated_at?: string;
}

export interface IStockTransaction {
    id: string; // UUID
    office_id: string;
    item_id: string;
    type: 'in' | 'out';
    quantity: number;
    remaining_stock: number;
    keterangan?: string;
    
    user_id: string; // ID Admin/Sistem
    employee_id?: string; // ID Penikmat/Peminta Barang (Lompat Modul)
    
    // Relasi Database yang dimuat pada halaman History (Issue 058)
    office?: IOffice;
    item?: IItem;
    user?: {
        id: string;
        name: string;
        email: string;
    };
    employee?: {
        id: string;
        nama_lengkap: string;
        nip: string;
    };
    
    created_at: string;
    updated_at?: string;
}

// Opsional: Tipe Data Agregat untuk Dashboard
export interface IInventoryDashboardStats {
    total_items: number;
    mutasi_bulan_ini: number;
    krisis_stok: IItem[];
}
```

---

## Troubleshooting

### Q: Bagaimana cara mengaplikasikan *Interface* ini ke file halaman (`page.tsx`) yang sudah dibuat di Issue-issue sebelumnya?

**Solusi:** Sangat mudah.
1. Impor Interface di baris atas file, contoh: `import { IItem } from "@/types/inventory";`
2. Pada setiap perulangan `map`, ubah kata `any` menjadi tipe datanya.
   *Awalnya:* `{items?.map((item: any) => ...)}`
   *Diubah Menjadi:* `{items?.map((item: IItem) => ...)}`

*(Catatan: Langkah pengaplikasian ini bersifat opsional untuk pemeliharaan masa depan. Tidak wajib mengubah file `page.tsx` pada Issue saat ini selama aplikasi sudah berjalan normal).*

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "chore(inventory): establish rigorous frontend typescript schemas for data integrity" \
  --body "Membakukan definisi kolom, tipe relasi antar tabel (Nested JSON), dan penertiban penggunaan Type 'any' secara brutal di ranah Inventory Module. Mempermudah navigasi Intellisense antar pengembang. Detail di docs/issues/059-frontend-inventory-types.md" \
  --label "frontend,typescript,types,module-inventory"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/059-frontend-inventory-types
```

### Step 3: Kerjakan

Salin kerangka *Interface TypeScript* dari panduan ini menuju `frontend/src/types/inventory.ts`. Pastikan kamu tidak ada kesalahan sintaks penutup kurung kurawal.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "chore(inventory): establish rigorous frontend typescript schemas for data integrity (#59)"
git push -u origin issue/059-frontend-inventory-types
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "chore(inventory): establish rigorous frontend typescript schemas for data integrity (#59)" \
  --body "## Summary
Penertiban ekosistem kode Frontend Modul Logistik. Menggantikan ketidakpastian balasan *Backend* dengan kepastian *Static Typing* tingkat tinggi.

## Changes
- Penciptaan wujud murni \`ICategory\`, \`IOffice\`, \`IItem\`, \`IInventoryStock\`, dan \`IStockTransaction\`.
- Penerapan pendeteksi *Optional Properties* (\`?\`) untuk atribut yang di-*lazy load* oleh \`with()\` relasi Eloquent.

## Rules Compliance
- [x] Lolos integrasi kebersihan kode *(Clean Code)*, mendidik kebiasaan \`TypeScript\` berkelas.

Closes #59" \
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
Modul Logistik BKSDA telah ditutup pada Issue ke-58. Ini adalah tugas administratif pembersihan kode (Chore) demi ketahanan Aplikasi 5 tahun ke depan agar tidak hancur oleh kebingungan format JSON.

## Task

Kerjakan Issue #059 (Frontend — Inventory Types).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/059-frontend-inventory-types.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Bangun sebuah file bernama `inventory.ts` pada bilik `frontend/src/types/`. Jika folder belum ada, tolong buatkan.
3. Rangkai spesifikasi `interface` persis menyerupai petunjuk Markdown di atas.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
