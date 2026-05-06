# Issue #088 — Frontend — DeReporting Internal Page (Meja Kerja Operator Laporan)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-dereporting`
> **Priority**: 🔴 Critical (Layar Operasional Harian Pegawai BKSDA)
> **Complexity**: 🔴 High (Formulir Dropdown Bertingkat 4 Lapis + Unggah File + Tabel Data)
> **Recommended AI Model**: Claude Opus / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #087

---

## Branch

```
issue/088-frontend-dereporting-internal
```

## Deskripsi

Pada **Issue #088** ini, kita mendirikan layar paling sibuk di seluruh Modul DeReporting: **Halaman Laporan Internal**.

Layar ini bukan sekadar tabel biasa. Ia memiliki kerumitan arsitektur tingkat tinggi:

**Tantangan 1 — Dropdown Bertingkat (*Cascading Selects*):**
Saat Operator memilih "Bidang: Konservasi", *Dropdown* kedua ("Jenis") harus secara otomatis memuat hanya Jenis yang terkait dengan Bidang tersebut. Saat Jenis dipilih, Dropdown "Kategori" berubah mengikuti. Lalu "Jenis Data" mengikuti Kategori. Totalnya **4 lapis *Dropdown* yang saling berantai!**

Ini membutuhkan orkestrasi `useEffect` berantai dan `useQuery` yang bergantung *(dependent queries)*.

**Tantangan 2 — Dua Mode Layar:**
Layar ini memiliki dua mode dalam satu halaman:
- **Mode Tabel**: Menampilkan daftar laporan yang sudah diunggah.
- **Mode Form**: Formulir unggah laporan baru (tampil di dalam *Sheet/Drawer*).

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `frontend/src/app/(dashboard)/dereporting/internal/`.
- [ ] Tersedia `page.tsx` yang memuat Tabel Daftar Laporan Internal dengan Pagination.
- [ ] Terdapat tombol "Unggah Laporan Baru" yang membuka *Sheet/Drawer* berisi Form.
- [ ] Form memiliki 4 *Dropdown* bertingkat: Bidang → Jenis → Kategori → Jenis Data.
- [ ] Setelah formulir berhasil dikirim, tabel di belakang layar harus otomatis memuat ulang data (*Query Invalidation*).
- [ ] Terdapat tombol Unduh per baris untuk menarik berkas PDF dari Brankas Privat.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Halaman Utama (Tabel + Drawer Form)
**Path:** `frontend/src/app/(dashboard)/dereporting/internal/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FileText, Plus, Download, Loader2, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import InternalUploadDrawer from "./_components/InternalUploadDrawer";

export default function DeReportingInternalPage() {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Penarikan Data Laporan Internal
    const { data: response, isLoading } = useQuery({
        queryKey: ["dr-internals", debouncedSearch, page],
        queryFn: async () => {
            const res = await api.get("/dereporting/internals", {
                params: { search: debouncedSearch || undefined, page },
            });
            return res.data;
        },
        keepPreviousData: true,
    });

    // Fungsi Pengunduh Berkas Terproteksi (Authenticated Blob Download)
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
            toast.success("Berkas berhasil ditarik dari brankas.");
        } catch {
            toast.error("Gagal mengunduh berkas. Pastikan file masih tersedia.");
        }
    };

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <FileText className="w-8 h-8 text-violet-500" /> Laporan Internal
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Arsip dokumen resmi yang diunggah pegawai BKSDA.</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Pencarian */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <input type="text" placeholder="Cari judul laporan..." value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all w-56 placeholder:text-zinc-600" />
                    </div>
                    {/* Tombol Unggah */}
                    <button onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all">
                        <Plus className="w-4 h-4" /> Unggah Baru
                    </button>
                </div>
            </div>

            {/* Tabel Data */}
            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Tanggal & Judul</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Bidang</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Pengunggah</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-12 text-center text-violet-500">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                    <span className="text-sm font-bold tracking-widest uppercase">Membongkar Lemari Arsip...</span>
                                </td></tr>
                            ) : response?.data?.length === 0 ? (
                                <tr><td colSpan={4} className="p-12 text-center text-zinc-500">
                                    <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                                    Belum ada laporan internal.
                                </td></tr>
                            ) : (
                                response?.data?.map((report: any) => (
                                    <tr key={report.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm max-w-[280px] truncate">{report.judul_laporan}</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">{new Date(report.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-1 rounded-lg border border-violet-500/20 font-medium">
                                                {report.bidang?.nama || "-"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-zinc-300">{report.uploader?.nama_lengkap || "Sistem"}</p>
                                            <p className="text-[10px] text-zinc-600 font-mono">{report.uploader?.nip}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button onClick={() => handleDownload(report.id, report.judul_laporan)}
                                                className="p-2 hover:bg-violet-500/10 rounded-lg transition-colors group" title="Unduh Berkas">
                                                <Download className="w-4 h-4 text-zinc-500 group-hover:text-violet-400" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Footer Pagination */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Hal. {page}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={!response?.next_page_url} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>

            {/* Drawer Formulir Unggah */}
            <InternalUploadDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
    );
}
```

### 2. Cetak Biru Formulir Bertingkat (Cascading Dropdown Drawer)
**Path:** `frontend/src/app/(dashboard)/dereporting/internal/_components/InternalUploadDrawer.tsx`

Di sinilah kerumitan puncak berada. Perhatikan mekanisme **`useEffect` berantai**!

```tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DrawerProps {
    open: boolean;
    onClose: () => void;
}

export default function InternalUploadDrawer({ open, onClose }: DrawerProps) {
    const queryClient = useQueryClient();

    // State Formulir
    const [bidangId, setBidangId] = useState("");
    const [jenisId, setJenisId] = useState("");
    const [kategoriId, setKategoriId] = useState("");
    const [jenisDataId, setJenisDataId] = useState("");
    const [tahunId, setTahunId] = useState("");
    const [judulLaporan, setJudulLaporan] = useState("");
    const [keterangan, setKeterangan] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ─────────────────────────────────────────────────────
    // RANTAI DROPDOWN BERTINGKAT (4 LAPIS)
    // Setiap Dropdown Level Bawah bergantung pada Level Atas
    // ─────────────────────────────────────────────────────

    // Level 0: Data yang TIDAK bergantung (Tahun, Bidang)
    const { data: tahunList } = useQuery({
        queryKey: ["dr-master-tahun"],
        queryFn: async () => (await api.get("/dereporting/master/tahun", { params: { paginate: "false" } })).data.data,
    });

    const { data: bidangList } = useQuery({
        queryKey: ["dr-master-bidang"],
        queryFn: async () => (await api.get("/dereporting/master/bidang", { params: { paginate: "false" } })).data.data,
    });

    // Level 1: Jenis (Bergantung pada Bidang yang dipilih)
    const { data: jenisList } = useQuery({
        queryKey: ["dr-master-jenis", bidangId],
        queryFn: async () => (await api.get("/dereporting/master/jenis", { params: { bidang_id: bidangId, paginate: "false" } })).data.data,
        enabled: !!bidangId, // SIHIR: Hanya aktif jika Bidang sudah dipilih!
    });

    // Level 2: Kategori (Bergantung pada Jenis)
    const { data: kategoriList } = useQuery({
        queryKey: ["dr-master-kategori", jenisId],
        queryFn: async () => (await api.get("/dereporting/master/kategori", { params: { jenis_id: jenisId, paginate: "false" } })).data.data,
        enabled: !!jenisId,
    });

    // Level 3: Jenis Data (Bergantung pada Kategori)
    const { data: jenisDataList } = useQuery({
        queryKey: ["dr-master-jenis-data", kategoriId],
        queryFn: async () => (await api.get("/dereporting/master/jenis-data", { params: { kategori_id: kategoriId, paginate: "false" } })).data.data,
        enabled: !!kategoriId,
    });

    // RESET BERANTAI: Jika Bidang berubah, kosongkan semua anak di bawahnya
    useEffect(() => { setJenisId(""); setKategoriId(""); setJenisDataId(""); }, [bidangId]);
    useEffect(() => { setKategoriId(""); setJenisDataId(""); }, [jenisId]);
    useEffect(() => { setJenisDataId(""); }, [kategoriId]);

    // ─────────────────────────────────────────────────────
    // PENGIRIMAN FORMULIR
    // ─────────────────────────────────────────────────────
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!file) { toast.error("File laporan wajib dilampirkan."); return; }
        setIsSubmitting(true);

        try {
            const payload = new FormData();
            payload.append("tahun_id", tahunId);
            payload.append("bidang_id", bidangId);
            payload.append("jenis_id", jenisId);
            payload.append("kategori_id", kategoriId);
            payload.append("jenis_data_id", jenisDataId);
            payload.append("judul_laporan", judulLaporan);
            if (keterangan) payload.append("keterangan", keterangan);
            payload.append("file", file);

            await api.post("/dereporting/internals", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Laporan berhasil disandikan ke dalam brankas!");
            queryClient.invalidateQueries({ queryKey: ["dr-internals"] }); // Gelombang Kejut
            onClose();
            // Reset semua state
            setBidangId(""); setJenisId(""); setKategoriId(""); setJenisDataId("");
            setTahunId(""); setJudulLaporan(""); setKeterangan(""); setFile(null);
        } catch (error: any) {
            const msg = error.response?.data?.message || "Gagal mengunggah laporan.";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open) return null;

    // Komponen Dropdown Pembantu (Menghindari kode berulang)
    const SelectField = ({ label, value, onChange, options, disabled }: any) => (
        <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">{label} *</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                <option value="">— Pilih {label} —</option>
                {options?.map((opt: any) => (
                    <option key={opt.id} value={opt.id}>{opt.nama || opt.tahun}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Overlay Gelap */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Panel Drawer */}
            <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full overflow-y-auto animate-in slide-in-from-right duration-300 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-white">Unggah Laporan Baru</h2>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-zinc-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <SelectField label="Tahun" value={tahunId} onChange={setTahunId} options={tahunList} />
                    <SelectField label="Bidang" value={bidangId} onChange={setBidangId} options={bidangList} />
                    <SelectField label="Jenis" value={jenisId} onChange={setJenisId} options={jenisList} disabled={!bidangId} />
                    <SelectField label="Kategori" value={kategoriId} onChange={setKategoriId} options={kategoriList} disabled={!jenisId} />
                    <SelectField label="Jenis Data" value={jenisDataId} onChange={setJenisDataId} options={jenisDataList} disabled={!kategoriId} />

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Judul Laporan *</label>
                        <input type="text" value={judulLaporan} onChange={(e) => setJudulLaporan(e.target.value)} maxLength={255} placeholder="Contoh: Laporan Patroli Bulanan"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all placeholder:text-zinc-600" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Keterangan</label>
                        <textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={3} placeholder="Opsional..."
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500 transition-all resize-none placeholder:text-zinc-600" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase mb-1.5">Berkas Laporan *</label>
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-violet-600 file:text-white hover:file:bg-violet-500 file:cursor-pointer file:transition-all" />
                    </div>

                    <button type="submit" disabled={isSubmitting}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-4">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {isSubmitting ? "Mengunci Dokumen..." : "Simpan ke Brankas"}
                    </button>
                </form>
            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Dropdown "Jenis" tidak berubah setelah saya memilih "Bidang"!

**Artinya:** Parameter query `enabled: !!bidangId` tidak terpicu karena state `bidangId` masih kosong.
**Solusi:** Pastikan komponen `<SelectField>` meneruskan nilai `onChange` dengan benar: `onChange={(e) => onChange(e.target.value)}`. Jika `e.target.value` bernilai `""`, maka `!!""` menghasilkan `false`, dan query Jenis tidak akan dijalankan — ini adalah perilaku yang BENAR.

### Q: Setelah mengirim laporan, Tabel di belakang tidak otomatis berubah!

**Artinya:** Gelombang Kejut (*Query Invalidation*) tidak mencapai targetnya.
**Solusi:** Pastikan `queryKey` di `invalidateQueries` PERSIS SAMA dengan `queryKey` di `useQuery` halaman utama: `["dr-internals"]`. Salah 1 huruf saja, gelombang kejutnya tidak akan sampai.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): engineer cascading 4-tier dropdown internal report submission interface" \
  --body "Membangun layar operasional harian DeReporting. Mengintegrasikan *Cascading Select* 4 lapis menggunakan React Query Dependent Queries. Detail di docs/issues/088-frontend-dereporting-internal.md" \
  --label "frontend,ui,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/088-frontend-dereporting-internal
```

### Step 3: Kerjakan

Pahat `page.tsx` (Tabel Utama) dan `_components/InternalUploadDrawer.tsx` (Form Bertingkat). Pahami pola `enabled: !!parentId` yang menjadi inti mekanisme Dropdown Berantai.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(dereporting): engineer cascading 4-tier dropdown internal report submission interface (#88)"
git push -u origin issue/088-frontend-dereporting-internal
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): engineer cascading 4-tier dropdown internal report submission interface (#88)" \
  --body "## Summary
Pembangunan Meja Kerja Operator Laporan Internal DeReporting.

## Changes
- Pembuatan Tabel Data Laporan Internal dengan *Debounced Search* dan *Pagination*.
- Arsitektur *Drawer* kanan layar berisi formulir unggah berbasis *multipart/form-data*.
- Implementasi *Cascading Select* 4 lapis menggunakan pola *React Query Dependent Queries* (\`enabled: !!parentId\`) dan *useEffect Reset Chains*.
- Pemasangan *Authenticated Blob Download* per baris untuk menarik berkas dari Brankas Privat.

## Rules Compliance
- [x] Lolos Doktrin Anti N+1 Frontend: Dropdown hanya memuat data dari API saat induk sudah dipilih, mencegah penarikan data massal yang sia-sia.

Closes #88" \
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
Modul DeReporting Internal adalah layar paling kompleks di Fase 6. Dropdown bertingkat 4 lapis (Bidang → Jenis → Kategori → Jenis Data) membutuhkan React Query Dependent Queries dan useEffect Reset Chains.

## Task

Kerjakan Issue #088 (Frontend — DeReporting Internal Page).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/088-frontend-dereporting-internal.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(dashboard)/dereporting/internal/` dan `_components/`.
3. Pahat `page.tsx` (Tabel + Tombol Unggah) terlebih dahulu.
4. Pahat `_components/InternalUploadDrawer.tsx` (Formulir Bertingkat).
5. Perhatikan mekanisme `enabled: !!bidangId` pada setiap `useQuery` bawahan — ini adalah kunci arsitektur rantai Dropdown!
6. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
