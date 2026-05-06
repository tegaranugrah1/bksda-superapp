# Issue #055 — Frontend — Items Management Page (Katalog Master Barang)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-inventory`, `master-data`
> **Priority**: 🔴 Critical (Hulu penciptaan aset logistik)
> **Complexity**: 🟡 Medium (Formulir CRUD dan Sinkronisasi Tabel Asinkron)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #051, Issue #052

---

## Branch

```
issue/055-frontend-inventory-items
```

## Deskripsi

Keputusan yang bijak! Kita tidak bisa melakukan mutasi barang jika wujud barangnya saja belum pernah diciptakan di dalam sistem.

**Issue #055** bertugas membangun halaman pendaftaran dan pengelolaan Master Katalog Barang BKSDA yang beralamat di `/inventory/items`.
Di halaman inilah Admin Logistik akan mendefinisikan *"Spidol Hitam Snowman (Rim) dengan Peringatan Minimum 5"* ke dalam buku besar Database.

Halaman ini akan menggabungkan 2 bagian utama di dalam satu layar:
1. **Formulir Penambahan Barang Cepat (Quick Add Form)**.
2. **Tabel Data Grid (Data Table)** yang otomatis menyegarkan dirinya setiap kali ada barang baru yang sukses ditambahkan.

---

## Acceptance Criteria

- [ ] File `src/app/(dashboard)/inventory/items/page.tsx` dihidupkan secara utuh.
- [ ] Tersedia Tabel yang merender aliran data asinkron dari *Endpoint* `GET /api/inventory/items`.
- [ ] Tersemat formulir penambahan barang dengan kolom wajib: *Kode Barang (SKU)*, *Nama*, *Satuan*, dan *Batas Peringatan (Min Stock)*.
- [ ] Pengiriman Formulir (Submit) terhubung erat dengan `POST /api/inventory/items` dan dilindungi state `useMutation`.
- [ ] Menerapkan mekanisme penyegaran paksa (*Cache Invalidation*) pada React Query sesaat setelah operasi *Submit* berhasil.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\items\page.tsx`

Halaman tingkat *Admin* ini tidak memerlukan logika Serumit Modul sebelumnya. Salinlah rancang bangun *Data Grid* ini ke dalam berkasmu:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PackageSearch, Plus, Loader2, Save, Trash2, Edit } from "lucide-react";

export default function ItemsManagementPage() {
    const queryClient = useQueryClient();
    
    // State Penampung Formulir
    const [form, setForm] = useState({
        // Catatan: Karena fitur Master Kategori dilewati, 
        // kita menggunakan ID Dummy sementara atau wajib disesuaikan nanti.
        category_id: "00000000-0000-0000-0000-000000000000", 
        kode_barang: "",
        nama_barang: "",
        satuan: "Pcs",
        min_stock: "5"
    });

    // 1. Tarik Data Tabel (Data Grid)
    const { data: response, isLoading } = useQuery({
        queryKey: ['inventory-items'],
        queryFn: async () => {
            const res = await api.get('/inventory/items');
            return res.data;
        }
    });

    // 2. Mesin Penambah Barang (Mutasi Server)
    const mutation = useMutation({
        mutationFn: async (payload: typeof form) => {
            // Konversi String ke Angka murni khusus untuk min_stock
            const finalPayload = { ...payload, min_stock: Number(payload.min_stock) };
            const res = await api.post('/inventory/items', finalPayload);
            return res.data;
        },
        onSuccess: () => {
            // Segarkan Tabel Seketika!
            queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
            
            // Kosongkan Formulir
            setForm({
                ...form,
                kode_barang: "",
                nama_barang: "",
            });
            alert("✅ Barang baru berhasil masuk katalog!");
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || "❌ Gagal mendaftarkan barang.");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.kode_barang || !form.nama_barang) return alert("Kode dan Nama wajib diisi!");
        mutation.mutate(form);
    };

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <PackageSearch className="w-8 h-8 text-emerald-500" /> Katalog Barang
                    </h1>
                    <p className="text-zinc-400 mt-2">Daftarkan dan kelola master rujukan logistik negara.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* KOLOM KIRI: FORMULIR TAMBAH CEPAT */}
                <div className="lg:col-span-1">
                    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl sticky top-6">
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-emerald-500" /> Barang Baru
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Kategori ID</label>
                                <input 
                                    type="text"
                                    value={form.category_id}
                                    onChange={(e) => setForm({...form, category_id: e.target.value})}
                                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-zinc-500 rounded-xl px-4 py-2.5 focus:outline-none font-mono text-sm"
                                    placeholder="UUID Kategori"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">Isi dengan UUID Kategori dari Database Supabase Anda.</p>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Kode Barang (SKU)</label>
                                <input 
                                    type="text"
                                    value={form.kode_barang}
                                    onChange={(e) => setForm({...form, kode_barang: e.target.value})}
                                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                                    placeholder="Misal: ATK-001"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nama Barang</label>
                                <input 
                                    type="text"
                                    value={form.nama_barang}
                                    onChange={(e) => setForm({...form, nama_barang: e.target.value})}
                                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                                    placeholder="Kertas HVS A4 80gr"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Satuan</label>
                                    <select 
                                        value={form.satuan}
                                        onChange={(e) => setForm({...form, satuan: e.target.value})}
                                        className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 appearance-none"
                                    >
                                        <option value="Pcs">Pcs (Buah)</option>
                                        <option value="Rim">Rim</option>
                                        <option value="Box">Box</option>
                                        <option value="Unit">Unit</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Batas Min.</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={form.min_stock}
                                        onChange={(e) => setForm({...form, min_stock: e.target.value})}
                                        className="w-full mt-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={mutation.isPending}
                            className="w-full mt-8 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Simpan ke Katalog
                        </button>
                    </form>
                </div>

                {/* KOLOM KANAN: TABEL DATA GRID */}
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-zinc-950/50 border-b border-zinc-800">
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">SKU</th>
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Nama Logistik</th>
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Batas Aman</th>
                                        <th className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-emerald-500">
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                                <span className="text-sm font-medium text-zinc-500">Menarik Data Tabel...</span>
                                            </td>
                                        </tr>
                                    ) : response?.data?.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-10 text-center text-zinc-500">
                                                Tidak ada barang yang terdaftar di dalam katalog.
                                            </td>
                                        </tr>
                                    ) : (
                                        response?.data?.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-emerald-500/5 transition-colors group">
                                                <td className="p-4 font-mono text-sm text-zinc-300">{item.kode_barang}</td>
                                                <td className="p-4">
                                                    <p className="font-bold text-zinc-200">{item.nama_barang}</p>
                                                    <p className="text-xs text-zinc-500 mt-0.5">{item.satuan}</p>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="inline-block px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-xs font-bold border border-zinc-700">
                                                        Min {item.min_stock}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                                        <button className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Area Navigasi Halaman (Pagination Placeholder) */}
                        <div className="p-4 bg-zinc-950/30 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-500 font-medium">
                            Menampilkan halaman {response?.current_page || 1} dari {response?.last_page || 1}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombol Simpan selalu berujung pada pesan Error dari Server!

**Artinya:** FormRequest mendeteksi ada pelanggaran keamanan data.
**Solusi:** Kemungkinan besar `category_id` *(Kategori ID)* bawaan (UUID berangka nol) ditolak oleh *Backend* karena tidak ada di tabel `inv_categories`.
Sebagai langkah penyelamatan MVP:
1. Buka antarmuka Supabase.
2. Buat satu baris secara manual di tabel `inv_categories` (Misal nama: ATK).
3. Salin UUID dari kategori yang baru kamu buat tersebut.
4. *Paste* UUID tersebut secara permanen ke dalam *State* bawaan `category_id` di kodingan atas untuk menggantikan deretan `00000000`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): asynchronous items catalog grid and quick-add form panel" \
  --body "Merancang pangkalan Data Master Barang (SKU). Mengadopsi arsitektur Split-View (Kiri Form, Kanan Data Grid) guna menghemat rasio pantulan halaman (Bounce Rate). Detail di docs/issues/055-frontend-inventory-items.md" \
  --label "frontend,ui,module-inventory,master-data"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/055-frontend-inventory-items
```

### Step 3: Kerjakan

Salin barisan *React Component* tingkat lanjut di atas ke dalam target alamat spesifiknya. Karena halaman ini adalah halaman administratif murni, sangat disarankan untuk menjalan ujicoba pencetakan *(Submit Test)* untuk menguji fungsionalitas React Query *Cache Invalidation*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(inventory): asynchronous items catalog grid and quick-add form panel (#55)"
git push -u origin issue/055-frontend-inventory-items
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): asynchronous items catalog grid and quick-add form panel (#55)" \
  --body "## Summary
Pembangkitan halaman pendaftaran Master Data Barang (SKU).

## Changes
- Penciptaan struktur \`Split-View Layout\` yang menempatkan interaksi \`POST\` dan \`GET\` secara bersamaan di dalam satu dimensi Visual.
- Penyematan Konversi \`Number()\` ketat pada parameter \`min_stock\` untuk menghindari letusan *Type-Casting Backend*.
- Pemasangan tombol aksi ganda tersembunyi (*Opacity-based Action Buttons*) pada baris Data Grid demi kebersihan antarmuka.

## Rules Compliance
- [x] Lolos implementasi peremajaan tabel paksa (*InvalidateQueries*) tanpa keharusan \`Window.Reload()\`.

Closes #55" \
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
Modul Logistik BKSDA sisi *Frontend* membutuhkan sebuah pabrik pendaftaran barang ke dalam lumbung katalog. Tanpa halaman ini, fitur Stock In (Issue 056) akan melongo kebingungan tanpa aset yang bisa dipilih.

## Task

Kerjakan Issue #055 (Frontend — Items Management Page).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/055-frontend-inventory-items.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat struktur berkas di target rute: `frontend/src/app/(dashboard)/inventory/items/page.tsx`.
3. Tuangkan kodingan pilar antarmuka (*Split-View Layout*) di dalamnya.
4. Tangani masalah kegagalan mutasi dengan mengeksekusi baris pedoman *Troubleshooting* yang telah dijabarkan di Markdown.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
