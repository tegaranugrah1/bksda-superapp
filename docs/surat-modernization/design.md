# Desain Arsitektur Teknis (TDD): Modernisasi UI/UX, Arsitektur Jeroan & Pengerasan Keamanan Modul Persuratan

> **Arsitektur**: Next.js App Router (TypeScript) + Tailwind CSS + Lucide React + TanStack Query v5 + Laravel Sanctum  
> **Standar Rujukan**: Modul Kepegawaian (`frontend/src/app/kepegawaian/`) & Modul BMN (`frontend/src/app/bmn/`)  
> **Pendekatan**: Ponytail Minimal Diff, zero bloat, deletion > addition, reuse pola enterprise yang terbukti  
> **Status**: Perencanaan Arsitektur Menyeluruh (Full Internals)

---

## 1. Arsitektur Navigasi & Layout Induk (`surat/layout.tsx`)

### 1.1 Struktur Menu & Skema Pengelompokan Semantik
Menggantikan array datar 6 item dengan hierarki bertipe kuat yang dikelompokkan ke dalam 4 kategori semantik:

```typescript
export type SuratSidebarGroup =
  | "Ringkasan"
  | "Penatausahaan Surat"
  | "Tata Naskah & Laporan"
  | "Pengaturan & Konfigurasi";

export type SuratSidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
  group: SuratSidebarGroup;
};

export const SURAT_SIDEBAR_ITEMS: SuratSidebarItem[] = [
  // 1. Ringkasan
  { href: "/surat", label: "Dashboard", icon: Mail, permission: "surat.view", group: "Ringkasan" },

  // 2. Penatausahaan Surat
  { href: "/surat/masuk", label: "Surat Masuk", icon: Inbox, permission: "surat.view", group: "Penatausahaan Surat" },
  { href: "/surat/masuk/create", label: "Registrasi Agenda Masuk", icon: Plus, permission: "surat.create", group: "Penatausahaan Surat" },
  { href: "/surat/keluar", label: "Surat Keluar", icon: Send, permission: "surat.view", group: "Penatausahaan Surat" },
  { href: "/surat/keluar/create", label: "Registrasi Agenda Keluar", icon: Plus, permission: "surat.create", group: "Penatausahaan Surat" },

  // 3. Tata Naskah & Laporan
  { href: "/surat/keluar/dinas", label: "Tata Naskah Dinas", icon: FileText, permission: "surat.create", group: "Tata Naskah & Laporan" },
  { href: "/surat/laporan", label: "Laporan & Rekapitulasi", icon: Layers, permission: "surat.view", group: "Tata Naskah & Laporan" },

  // 4. Pengaturan & Konfigurasi
  { href: "/surat/settings", label: "Pengaturan Template", icon: Settings2, permission: "surat.manage", group: "Pengaturan & Konfigurasi" },
];

export const GROUP_ORDER: SuratSidebarGroup[] = [
  "Ringkasan",
  "Penatausahaan Surat",
  "Tata Naskah & Laporan",
  "Pengaturan & Konfigurasi",
];
```

### 1.2 Mode Collapsible Desktop Rail (`w-72` $\leftrightarrow$ `w-20`)
* **State `collapsed`**:
  * `false` (Expanded `md:w-72`): Menampilkan logo balai, header grup huruf kapital 10px tracking-widest, label menu lengkap, `ModuleSwitcher`, dan footer info user dengan badge role.
  * `true` (Collapsed `md:w-20`): Menyembunyikan judul kategori dan teks menu; ikon berada di tengah (`justify-center p-2.5`) dengan tooltip bawaan browser via `title={item.label}` tanpa dependensi pustaka pihak ketiga.
* **Tombol Toggle Rail**: Menggunakan tombol `PanelLeftClose` / `PanelLeftOpen` yang ditempatkan secara ergonomis di sudut header sidebar.
* **Active Accent Indicator**: Garis vertikal 4px tebal di sisi kiri item:
  ```tsx
  {isActive && (
    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-emerald-600 dark:bg-emerald-400" />
  )}
  ```

### 1.3 Eliminasi Floating Action Button (FAB) Menu Mobile
* Menghapus tombol mengambang `fixed bottom-6 right-6` yang mengaburkan kontrol pagination dan tombol modal aksi.
* Menggantinya dengan top-bar mobile bersih di bagian atas layar berisi:
  * Tombol hamburger trigger (`Menu`).
  * Logo modul persuratan dan judul halaman aktif.
  * `ThemeToggle` dan inisial avatar profil pengguna.
* Laci mobile (*mobile drawer*) dilengkapi backdrop gelap `bg-black/60 backdrop-blur-sm` dan menutup otomatis saat rute navigasi diklik.

---

## 2. Blueprint State Management & Data Fetching

### 2.1 Eliminasi Penuh Anti-Pattern `localStorage`
Semua operasi pembacaan dan penulisan data transaksional ke `localStorage.getItem("bksda_saved_surat_masuk")` di `surat/page.tsx` dan `surat/masuk/page.tsx` dihapus tuntas. Sumber kebenaran (*single source of truth*) dikembalikan 100% ke database server melalui REST API.

### 2.2 Arsitektur Query Key & Cache TanStack Query v5
```typescript
// Query Key Factory untuk Modul Persuratan
export const suratQueryKeys = {
  all: ["surat"] as const,
  stats: () => [...suratQueryKeys.all, "stats"] as const,
  masukList: (filters: { page: number; per_page: number; search?: string; sifat?: string }) =>
    [...suratQueryKeys.all, "masuk", filters] as const,
  masukDetail: (id: string | number) => [...suratQueryKeys.all, "masuk", id] as const,
  keluarList: (filters: { page: number; per_page: number; search?: string; status?: string; template?: string }) =>
    [...suratQueryKeys.all, "keluar", filters] as const,
  keluarDetail: (id: string | number) => [...suratQueryKeys.all, "keluar", id] as const,
  templates: () => [...suratQueryKeys.all, "templates"] as const,
};
```

### 2.3 Server-Side Pagination & Sinkronisasi URL SearchParams
Pada `surat/masuk/page.tsx`:
1. Hapus pemanggilan `?per_page=all`.
2. Gunakan `useSearchParams()` untuk membaca `page`, `per_page`, `search`, dan `sifat`.
3. Pasang input pencarian ter-debounce (400ms) menggunakan `useCallback`:
   ```typescript
   const updateFilter = useCallback((key: string, value: string) => {
     const params = new URLSearchParams(searchParams.toString());
     if (value) params.set(key, value);
     else params.delete(key);
     if (key !== "page") params.set("page", "1");
     router.replace(`?${params.toString()}`);
   }, [searchParams, router]);
   ```
4. Query dijalankan dengan parameter aktual:
   ```typescript
   const { data, isLoading, isPlaceholderData } = useQuery({
     queryKey: suratQueryKeys.masukList({ page, per_page: Number(perPage), search, sifat }),
     queryFn: () => fetchSuratMasuk({ page, per_page: Number(perPage), search, sifat }),
     placeholderData: keepPreviousData,
   });
   ```

---

## 3. Desain Komponen UI/UX Standar Enterprise

### 3.1 Enterprise Header Card
Semua sub-halaman persuratan (`/surat`, `/surat/masuk`, `/surat/keluar`, `/surat/settings`) menggunakan kartu header seragam dengan palet Zinc:
```tsx
<div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 md:p-6 shadow-sm">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div className="flex items-center gap-3.5">
      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
        <Inbox className="w-6 h-6" />
      </div>
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Agenda Surat Masuk
        </h1>
        <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Penatausahaan surat masuk, pencatatan agenda, dan penerbitan lembar disposisi resmi.
        </p>
      </div>
    </div>
    {/* Aksi Cepat: Cetak Batch 2-Up, Ekspor Excel, Tambah Surat */}
    <div className="flex items-center gap-2 self-start sm:self-auto">
      ...
    </div>
  </div>
</div>
```

### 3.2 Skeleton Table Loading (Anti-CLS)
Menggantikan spinner tunggal di tengah cell kosong dengan 5 baris skeleton beranimasi denyut halus (`animate-pulse`) yang merefleksikan jumlah kolom tabel riil.

### 3.3 Kartu Tumpuk Responsif di Layar Ponsel (`< 640px`)
Di viewport mobile:
* Baris tabel diubah menjadi kartu vertikal berbingkai halus (`rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900/70`).
* Menampilkan: No Agenda (Badge Emerald), Tanggal Agenda, Asal Surat, Perihal (Font Tebal), Status Sifat Surat (Single-select Popover), Penerusan Balai (Diteruskan Popover), serta tombol aksi Edit, Cetak 2-Up, dan Hapus dengan touch target 44px.

### 3.4 Formulir Registrasi dengan Sticky Action Bar
Pada `surat/masuk/create/page.tsx` dan `surat/keluar/create/page.tsx`:
* Di layar ponsel, tombol Simpan dan Batal dipasang di *Sticky Bottom Bar* (`fixed bottom-0 inset-x-0 p-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex gap-2 z-20`) agar pengguna tidak perlu melakukan scroll panjang ke ujung formulir untuk menyimpan surat.

---

## 4. Preservasi Komponen Cetak Fisik & Popover (*Safety Boundary*)

Komponen-komponen berikut merupakan aset produksi yang telah diselaraskan dengan kebutuhan fisik pimpinan Balai KSDA Kaltim dan **TIDAK BOLEH DIRUSAK**:

1. **`LembarDisposisi2UpPrint.tsx` & `LembarDisposisiSheet.tsx`**:
   * Ukuran kertas terkunci: `@page { size: 330mm 215mm landscape; margin: 0; }` (Folio/Letter Landscape).
   * Tinggi kontainer lembar cetak: strictly `213mm` dengan `max-height: 213mm`.
   * Isolasi DOM cetak menggunakan `createPortal(..., document.body)`.
   * Preservasi 100% tipografi template fisik asli (`font-family: 'Agency FB', sans-serif` dan `font-family: 'Arial Nova Cond', sans-serif`).
   * 9 item checklist fisik pejabat penerus (`1. Ka Sub Bag TU` s.d. `9. PPK FOLU NC 2030`).
   * 5 opsi instruksi disposisi fisik (`Untuk Diselesaikan`, `Harap Saran/Pertimbangan`, `Penjelasan`, `Untuk Diketahui/dipergunakan seperlunya`, `Bahas dengan saya`).
   * Eliminasi halaman kedua kosong (Zero Ghost Page).
2. **`SifatCellPopover.tsx`**:
   * Pilihan sifat surat tunggal (*single-select*) instan: `Biasa`, `Penting`, `Sangat Penting`, `Rahasia`, `Segera`, `Kilat`.
3. **`DiteruskanCellPopover.tsx`**:
   * Pilihan penerusan pimpinan yang memuat lokasi ruang khusus Balai dan pegawai internal Balai KSDA Kaltim, defaulting ke status belum diisi (`+ Pilih Penerus`).
4. **`BatchPrintDisposisiModal.tsx`**:
   * Modal seleksi batch cetak 2 disposisi per lembar kertas.

---

## 5. Arsitektur Backend & Pengerasan Keamanan (Security & Data Integrity Hardening)

### 5.1 Eliminasi *Silent Data Corruption* pada Penomoran Agenda
Di `SuratMasukController::store`, ganti `updateOrCreate(['no_agenda' => ...])` dengan alur pembuatan murni:
```php
// Validasi unik nomor agenda per tahun takwim pada Form Request
'no_agenda' => [
    'required',
    'string',
    'max:100',
    Rule::unique('surat_masuk', 'no_agenda')
        ->whereNull('deleted_at')
        ->ignore($this->route('surat_masuk')),
],
```
Jika nomor agenda yang diinput sudah ada di database, sistem mengembalikan HTTP `422 Unprocessable Content` dengan pesan bersahabat: `"Nomor Agenda {no_agenda} sudah digunakan pada surat masuk lain."`

### 5.2 Concurrency Lock & Rekomendasi Nomor Agenda Atomik
Untuk mencegah tabrakan saat multi-user menginput surat masuk bersamaan:
```php
// Query penentuan nomor agenda berikutnya dengan lock
$nextAgenda = DB::transaction(function () use ($year) {
    $maxAgenda = SuratMasuk::whereYear('tanggal_agenda', $year)
        ->lockForUpdate()
        ->selectRaw('COALESCE(MAX(CAST(NULLIF(regexp_replace(no_agenda, \'[^0-9]\', \'\', \'g\'), \'\') AS INTEGER)), 0) as max_val')
        ->value('max_val');
        
    return (int)$maxAgenda + 1;
});
```

### 5.3 Cascading Soft Deletes pada Relasi Disposisi
Pada model `SuratMasuk`:
```php
protected static function booted(): void
{
    static::deleting(function (SuratMasuk $surat) {
        if ($surat->isForceDeleting()) {
            $surat->disposisi()->forceDelete();
            if ($surat->file_path && Storage::disk('private')->exists($surat->file_path)) {
                Storage::disk('private')->delete($surat->file_path);
            }
        } else {
            $surat->disposisi()->delete();
        }
    });

    static::restoring(function (SuratMasuk $surat) {
        $surat->disposisi()->restore();
    });
}
```

### 5.4 Matriks Hak Akses Granular (RBAC)
Pembaruan guard rute di `backend/app/Modules/Surat/Routes/api.php`:

| Rute Endpoint | HTTP Method | Permission Wajib | Peran Diizinkan |
| :--- | :---: | :--- | :--- |
| `/api/surat/surat-masuk` | GET | `permission:surat.view` | Semua Pegawai & Admin |
| `/api/surat/surat-masuk` | POST | `permission:surat.create` | Staf Tata Persuratan / Admin |
| `/api/surat/surat-masuk/{id}` | GET | `permission:surat.view` | Semua Pegawai & Admin |
| `/api/surat/surat-masuk/{id}` | PUT/PATCH | `permission:surat.update` | Staf Tata Persuratan / Admin |
| `/api/surat/surat-masuk/{id}` | DELETE | `permission:surat.delete` | Admin Persuratan / Superadmin |
| `/api/surat/surat-masuk/export/excel` | GET | `permission:surat.export` | Admin Persuratan / Superadmin |
| `/api/surat/surat-keluar` | GET | `permission:surat.view` | Semua Pegawai & Admin |
| `/api/surat/surat-keluar` | POST | `permission:surat.create` | Staf Tata Persuratan / Admin |
| `/api/surat/surat-keluar/{id}` | PUT/PATCH | `permission:surat.update` | Staf Tata Persuratan / Admin |
| `/api/surat/surat-keluar/{id}` | DELETE | `permission:surat.delete` | Admin Persuratan / Superadmin |
| `/api/surat/templates` | GET | `permission:surat.view` | Semua Pegawai & Admin |
| `/api/surat/templates` | POST/PUT | `permission:surat.manage` | Admin Persuratan / Superadmin |

### 5.2 Pengerasan Validasi Form Request (`SuratMasukRequest` & `SuratKeluarRequest`)
* Aturan validasi nomor agenda: wajib integer unik per tahun takwim.
* Aturan validasi file unggahan pindaian surat / berkas lampiran:
  ```php
  'berkas_surat' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
  ```
* Sanitasi input teks ringkasan untuk mencegah XSS (`strip_tags` pada `isi_ringkas`, `asal_surat`, `perihal`).

---

## 6. Rencana Pengujian Otomatis (Automated Regression Test)

Pembuatan test suite mandiri di `backend/tests/Feature/Surat/SuratRegressionTest.php` yang memvalidasi:
1. Pengecekan otorisasi: pengguna tidak login menerima HTTP 401; pengguna tanpa permission `surat.export` menerima HTTP 403 saat mengunduh Excel.
2. Server-side pagination: pengujian query `?page=1&per_page=10` menghasilkan metadata pagination standar Laravel (`current_page`, `last_page`, `total`).
3. Integritas relasi disposisi: pembuatan surat masuk secara otomatis menginisialisasi baris `surat_disposisi` terkait.
4. Validasi payload Form Request: penolakan file di atas 10MB atau file berekstensi ilegal (.exe, .sh, .php).
