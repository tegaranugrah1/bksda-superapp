# Issue #089 — Frontend — DeReporting Sub-Pages (Kamar Khusus Per Jenis Laporan)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-dereporting`
> **Priority**: 🟡 Medium (Penyaring Tampilan untuk Efisiensi Kerja Operator)
> **Complexity**: 🟢 Simple (Replikasi Tabel Internal dengan Filter Bawaan)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #088

---

## Branch

```
issue/089-frontend-dereporting-sub-pages
```

## Deskripsi

Pada Issue 088, kita telah membangun "Meja Kerja Umum" yang menampilkan SEMUA Laporan Internal tanpa pembeda. Namun di lapangan, Operator BKSDA bekerja berdasarkan Bidang dan Jenis. Operator Bidang Konservasi tidak mau melihat laporan Bidang Kehutanan memenuhi layarnya.

Pada **Issue #089** ini, kita akan membangun 4 "Kamar Khusus" yang masing-masing menampilkan laporan Internal yang sudah tersaring *(Pre-Filtered)* berdasarkan Jenis Kerjanya:
1. **`/dereporting/bernilai`** — Laporan Data Bernilai (Keanekaragaman Hayati, Satwa Dilindungi)
2. **`/dereporting/kerjasama`** — Laporan Kerjasama Antar-Instansi
3. **`/dereporting/pemegang-izin`** — Laporan Pemegang Izin Pemanfaatan Hutan
4. **`/dereporting/lain`** — Laporan Lainnya (Catch-All)

**Kunci Efisiensi Arsitektur:**
Keempat halaman ini memiliki tampilan yang IDENTIK. Perbedaannya hanya pada parameter filter yang dikirim ke API. Oleh karena itu, kita akan membuat **1 Komponen Tabel Reusable** yang dipanggil oleh 4 halaman berbeda dengan parameter berbeda. Ini jauh lebih cerdas daripada menyalin kode tabel 4 kali!

---

## Acceptance Criteria

- [ ] Tersedia komponen *Shared*: `_components/FilteredReportTable.tsx` yang bisa menerima parameter filter.
- [ ] Tersedia 4 halaman tipis *(Thin Pages)*: `bernilai/page.tsx`, `kerjasama/page.tsx`, `pemegang-izin/page.tsx`, `lain/page.tsx`.
- [ ] Setiap halaman hanya berisi 10-15 baris kode yang memanggil komponen *Shared* dengan konfigurasi berbeda.
- [ ] Sidebar navigasi (Issue 087) dimutakhirkan untuk menampilkan sub-menu ke-4 halaman ini.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Komponen Tabel Serbaguna (Reusable)
**Path:** `frontend/src/app/(dashboard)/dereporting/_components/FilteredReportTable.tsx`

Ini adalah jantung dari seluruh arsitektur sub-halaman. Satu komponen, empat wajah!

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2, FileText, Download, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface FilteredReportTableProps {
    title: string;           // Judul halaman (mis. "Laporan Data Bernilai")
    subtitle: string;        // Deskripsi singkat
    icon: LucideIcon;        // Ikon dari lucide-react
    accentColor: string;     // Kelas Tailwind warna aksen (mis. "violet", "amber")
    filterKey: string;       // Nama parameter filter yang dikirim ke API
    filterValue: string;     // Nilai filter (mis. "bernilai", "kerjasama")
}

export default function FilteredReportTable({
    title, subtitle, icon: Icon, accentColor, filterKey, filterValue
}: FilteredReportTableProps) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Penarikan Data dengan Filter Bawaan
    const { data: response, isLoading } = useQuery({
        queryKey: ["dr-internals-filtered", filterValue, debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get("/dereporting/internals", {
                params: {
                    [filterKey]: filterValue,  // Injeksi filter otomatis!
                    search: debouncedSearch || undefined,
                    page,
                },
            });
            return res.data;
        },
        keepPreviousData: true,
    });

    // Fungsi Unduh Berkas (Sama seperti Issue 088)
    const handleDownload = async (id: string, judul: string) => {
        try {
            const res = await api.get(`/dereporting/internals/${id}/download`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", judul + ".pdf");
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("Berkas berhasil ditarik.");
        } catch {
            toast.error("Gagal mengunduh berkas.");
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Dinamis */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-3xl font-black text-white tracking-tight flex items-center gap-3`}>
                        <Icon className={`w-8 h-8 text-${accentColor}-500`} /> {title}
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">{subtitle}</p>
                </div>
                <div className="relative group">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-${accentColor}-500 transition-colors`} />
                    <input type="text" placeholder="Cari laporan..." value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className={`pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-${accentColor}-500 focus:ring-1 focus:ring-${accentColor}-500 transition-all w-56 placeholder:text-zinc-600`} />
                </div>
            </div>

            {/* Tabel Data */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Tanggal & Judul</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Kategori</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Pengunggah</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-center">Unduh</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr><td colSpan={4} className={`p-12 text-center text-${accentColor}-500`}>
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                    <span className="text-sm font-bold tracking-widest uppercase">Menyaring Lemari Arsip...</span>
                                </td></tr>
                            ) : response?.data?.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-zinc-500">
                                    <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                                    Belum ada laporan di kategori ini.
                                </td></tr>
                            ) : (
                                response?.data?.map((report: any) => (
                                    <tr key={report.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm max-w-[280px] truncate">{report.judul_laporan}</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">{new Date(report.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs bg-${accentColor}-500/10 text-${accentColor}-400 px-2 py-1 rounded-lg border border-${accentColor}-500/20 font-medium`}>
                                                {report.kategori?.nama || report.jenis?.nama || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-zinc-300">{report.uploader?.nama_lengkap || "Sistem"}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleDownload(report.id, report.judul_laporan)}
                                                className={`p-2 hover:bg-${accentColor}-500/10 rounded-lg transition-colors group`}>
                                                <Download className={`w-4 h-4 text-zinc-500 group-hover:text-${accentColor}-400`} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Hal. {page}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

### 2. Cetak Biru Halaman Tipis (Thin Pages)
Setiap halaman hanya memanggil komponen *Shared* di atas dengan konfigurasi berbeda:

**Path:** `frontend/src/app/(dashboard)/dereporting/bernilai/page.tsx`
```tsx
import { Gem } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function BernilaiPage() {
    return (
        <FilteredReportTable
            title="Laporan Data Bernilai"
            subtitle="Rekam data keanekaragaman hayati, satwa dilindungi, dan potensi alam terlindungi."
            icon={Gem}
            accentColor="emerald"
            filterKey="jenis_nama"
            filterValue="bernilai"
        />
    );
}
```

**Path:** `frontend/src/app/(dashboard)/dereporting/kerjasama/page.tsx`
```tsx
import { Handshake } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function KerjasamaPage() {
    return (
        <FilteredReportTable
            title="Laporan Kerjasama"
            subtitle="Dokumen kolaborasi antar-instansi pemerintah dan organisasi mitra BKSDA."
            icon={Handshake}
            accentColor="blue"
            filterKey="jenis_nama"
            filterValue="kerjasama"
        />
    );
}
```

**Path:** `frontend/src/app/(dashboard)/dereporting/pemegang-izin/page.tsx`
```tsx
import { ShieldCheck } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function PemegangIzinPage() {
    return (
        <FilteredReportTable
            title="Laporan Pemegang Izin"
            subtitle="Pantauan terhadap pihak yang memiliki izin pemanfaatan kawasan hutan."
            icon={ShieldCheck}
            accentColor="amber"
            filterKey="jenis_nama"
            filterValue="pemegang-izin"
        />
    );
}
```

**Path:** `frontend/src/app/(dashboard)/dereporting/lain/page.tsx`
```tsx
import { FolderOpen } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function LainPage() {
    return (
        <FilteredReportTable
            title="Laporan Lainnya"
            subtitle="Dokumentasi dan catatan yang tidak masuk klasifikasi utama."
            icon={FolderOpen}
            accentColor="zinc"
            filterKey="jenis_nama"
            filterValue="lain"
        />
    );
}
```

### 3. Pemutakhiran Sidebar (layout.tsx)
Buka `frontend/src/app/(dashboard)/dereporting/layout.tsx` (Issue 087) dan tambahkan 4 item navigasi baru di bawah item yang sudah ada:

```tsx
// Tambahkan di dalam array SIDEBAR_ITEMS setelah item "Operator"
{ href: "/dereporting/bernilai",       label: "Data Bernilai",    icon: Gem },
{ href: "/dereporting/kerjasama",      label: "Kerjasama",        icon: Handshake },
{ href: "/dereporting/pemegang-izin",  label: "Pemegang Izin",    icon: ShieldCheck },
{ href: "/dereporting/lain",           label: "Lainnya",          icon: FolderOpen },
```

---

## Troubleshooting

### Q: Filter tidak bekerja! Semua halaman menampilkan data yang sama!

**Artinya:** Backend `InternalController@index` belum mendukung parameter filter `jenis_nama`.
**Solusi:** Ini hal yang normal. Parameter `filterKey: "jenis_nama"` hanya akan bekerja jika Backend menambahkan logika pencarian relasi:
```php
if ($request->filled('jenis_nama')) {
    $query->whereHas('jenis', fn($q) => $q->where('nama', 'ilike', '%' . $request->jenis_nama . '%'));
}
```
Tambahkan blok ini di `InternalController@index`. Ini adalah "mini-patch" yang boleh dikerjakan langsung oleh AI Pelanjut tanpa Issue terpisah.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): deploy polymorphic filtered sub-pages with shared reusable table component" \
  --body "Membangun 4 sub-halaman kategori laporan yang memanfaatkan 1 komponen Tabel Serbaguna (Reusable). Menghancurkan potensi pengulangan 4x lipat dengan arsitektur komposisi *Props-Driven*. Detail di docs/issues/089-frontend-dereporting-sub-pages.md" \
  --label "frontend,ui,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/089-frontend-dereporting-sub-pages
```

### Step 3: Kerjakan

Pahat komponen `FilteredReportTable.tsx` terlebih dahulu. Barulah buat 4 halaman tipis yang semuanya menunjuk ke komponen tersebut. Terakhir, mutakhirkan `layout.tsx` untuk mendaftarkan 4 navigasi baru.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(dereporting): deploy polymorphic filtered sub-pages with shared reusable table component (#89)"
git push -u origin issue/089-frontend-dereporting-sub-pages
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): deploy polymorphic filtered sub-pages with shared reusable table component (#89)" \
  --body "## Summary
Pemecahan layar Laporan Internal menjadi 4 Kamar Khusus berpenyaring otomatis.

## Changes
- Penciptaan komponen atomik \`FilteredReportTable\` yang menerima konfigurasi dinamis (\`title\`, \`icon\`, \`accentColor\`, \`filterKey\`, \`filterValue\`) sebagai *Props*.
- Pendirian 4 halaman ultra-tipis (\`bernilai\`, \`kerjasama\`, \`pemegang-izin\`, \`lain\`) yang masing-masing hanya berisi 10 baris kode.
- Pemutakhiran Sidebar dengan 4 tautan navigasi baru.

## Rules Compliance
- [x] Lolos Doktrin DRY Lanjut: Kode Tabel hanya ditulis 1 kali di komponen *Shared*, bukan disalin 4 kali.

Closes #89" \
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
Modul DeReporting memiliki 4 sub-kategori laporan. Kita butuh 4 halaman, tapi JANGAN PERNAH menyalin kode tabel 4 kali! Gunakan 1 komponen Reusable yang dipanggil 4 kali dengan Props berbeda.

## Task

Kerjakan Issue #089 (Frontend — DeReporting Sub-Pages).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/089-frontend-dereporting-sub-pages.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat komponen Serbaguna: `frontend/src/app/(dashboard)/dereporting/_components/FilteredReportTable.tsx`.
3. Buat 4 folder halaman: `bernilai/`, `kerjasama/`, `pemegang-izin/`, `lain/`.
4. Di setiap `page.tsx`, cukup impor `FilteredReportTable` dan isi Props-nya. Halaman ini wajib SANGAT TIPIS (< 15 baris).
5. Mutakhirkan `layout.tsx` untuk memasang 4 tautan navigasi baru di Sidebar.
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
