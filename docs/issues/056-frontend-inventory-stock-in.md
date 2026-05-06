# Issue #056 — Frontend — Stock In Operations (Penerimaan Barang)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-inventory`, `operations`
> **Priority**: 🔴 Critical (Aliran Nadi Pertama Masuknya Logistik)
> **Complexity**: 🟡 Medium (Form Integrasi dan Tembakan API Terstruktur)
> **Recommended AI Model**: Gemini 2.5 Flash / Claude Sonnet / GPT-4o-mini
> **Dependencies**: Issue #051, Issue #052

---

## Branch

```
issue/056-frontend-inventory-stock-in
```

## Deskripsi

*(Catatan: Atas instruksimu, kita melewati pembuatan halaman Master Data di Issue 55 dan langsung meloncat ke jantung operasional logistik di Issue 56).*

Gudang BKSDA tidak akan memiliki barang jika kita tidak membelinya atau menerima pasokan (*Supply*). **Issue #056** mendikte pembuatan Halaman **Penerimaan Barang (Stock In)** beralamat di `/inventory/stock-in`.

Halaman ini berfungsi layaknya "Pintu Bongkar Muat". Sang Admin akan menunjuk satu Kantor penerima, menunjuk tipe barang apa yang datang, lalu mengisi jumlah berapa kardus/rim/buah yang diangkut. 

Saat tombol "Simpan" ditekan, data rapi ini akan dilontarkan menembus jaringan Rute (Issue 052) menuju pelukan `StockController`, yang kemudian akan meledakkan keajaiban Kalkulasi Jantung di `InventoryService` (Issue 049) untuk menciptakan *Kartu Stok* fisik.

---

## Acceptance Criteria

- [ ] File `src/app/(dashboard)/inventory/stock-in/page.tsx` dihidupkan.
- [ ] Terdapat 4 ruas Formulir Wajib Isi: **Kantor Tujuan**, **Nama Barang**, **Jumlah (Kuantitas)**, dan **Keterangan**.
- [ ] Pengisian Kuantitas (Jumlah) mutlak menggunakan elemen HTML `type="number" min="1"` (Sesuai dengan pelindung *FormRequest* Issue 050).
- [ ] Tombol peluncur form ditenagai oleh `useMutation` dari pustaka React Query, mengarah absolut ke `POST /api/inventory/stock/in`.
- [ ] Menerapkan *Glassmorphism Card* yang memperlihatkan kelas desain premium.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\stock-in\page.tsx`

Halaman ini tidak perlu menampilkan tabel yang panjang. Fokuslah pada pembuatan Formulir Pemasukan Barang yang kokoh dan tidak tembus gangguan. 
*(Asumsi: Komponen `Select` HTML biasa sudah cukup sementara untuk MVP, yang nantinya akan diganti dengan Combobox di fase penyempurnaan)*.

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowDownToLine, Save, Loader2, PackagePlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function StockInPage() {
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);

    // State Penampung Formulir
    const [form, setForm] = useState({
        office_id: "",
        item_id: "",
        quantity: "",
        keterangan: ""
    });

    // 1. Tarik Data Dropdown Kantor (Bisa diketik biasa jika belum ada komponen Combobox)
    const { data: offices } = useQuery({
        queryKey: ['offices-dropdown'],
        queryFn: async () => {
            const res = await api.get('/inventory/offices'); // Rute Issue 052
            return res.data.data;
        }
    });

    // 2. Tarik Data Dropdown Barang
    const { data: items } = useQuery({
        queryKey: ['items-dropdown'],
        queryFn: async () => {
            const res = await api.get('/inventory/items');
            return res.data.data;
        }
    });

    // 3. Mesin Penembak Mutasi Stok
    const mutation = useMutation({
        mutationFn: async (payload: typeof form) => {
            const res = await api.post('/inventory/stock/in', {
                ...payload,
                quantity: Number(payload.quantity) // Paksa menjadi Angka Murni
            });
            return res.data;
        },
        onSuccess: () => {
            setIsSuccess(true);
            setForm({ office_id: "", item_id: "", quantity: "", keterangan: "" });
            
            // Beri tahu Dashboard untuk menyegarkan datanya!
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            
            // Tutup notifikasi sukses setelah 3 detik
            setTimeout(() => setIsSuccess(false), 3000);
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || "Gagal mencatat logistik masuk!");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.office_id || !form.item_id || !form.quantity) {
            return alert("Kantor, Barang, dan Jumlah wajib diisi!");
        }
        mutation.mutate(form);
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <ArrowDownToLine className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Penerimaan Logistik</h1>
                    <p className="text-zinc-400 mt-1">Catat pasokan barang baru yang masuk ke jaringan kantor BKSDA.</p>
                </div>
            </div>

            {/* Peringatan Sukses Melayang */}
            {isSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                        <p className="font-bold">Mutasi Sukses!</p>
                        <p className="text-sm text-emerald-500/80">Barang telah didistribusikan secara gaib ke dalam saldo fisik kantor.</p>
                    </div>
                </div>
            )}

            {/* Kartu Formulir Glassmorphism */}
            <form onSubmit={handleSubmit} className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>
                
                <div className="space-y-6 relative z-10">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dropdown Kantor */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Kantor Tujuan <span className="text-red-500">*</span></label>
                            <select 
                                value={form.office_id}
                                onChange={(e) => setForm({...form, office_id: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">-- Pilih Lokasi Kantor --</option>
                                {offices?.map((office: any) => (
                                    <option key={office.id} value={office.id}>{office.nama_kantor}</option>
                                ))}
                            </select>
                        </div>

                        {/* Dropdown Barang */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Nama Barang <span className="text-red-500">*</span></label>
                            <select 
                                value={form.item_id}
                                onChange={(e) => setForm({...form, item_id: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none"
                            >
                                <option value="">-- Pilih Master Barang --</option>
                                {items?.map((item: any) => (
                                    <option key={item.id} value={item.id}>{item.nama_barang} ({item.satuan})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Input Jumlah */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Jumlah (Kuantitas) <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <PackagePlus className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                                <input 
                                    type="number"
                                    min="1"
                                    value={form.quantity}
                                    onChange={(e) => setForm({...form, quantity: e.target.value})}
                                    placeholder="Contoh: 50"
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Input Keterangan */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Catatan Pemasok / Bukti Nota</label>
                            <input 
                                type="text"
                                value={form.keterangan}
                                onChange={(e) => setForm({...form, keterangan: e.target.value})}
                                placeholder="Contoh: Pembelian via SIPLah Bos Afirmasi"
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <hr className="border-zinc-800 my-4" />

                    <div className="flex justify-end gap-3">
                        <Link href="/inventory" className="px-6 py-3 rounded-xl font-semibold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-all">
                            Batal
                        </Link>
                        <button 
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-6 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                        >
                            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {mutation.isPending ? "Merekam ke Server..." : "Simpan Mutasi Masuk"}
                        </button>
                    </div>

                </div>
            </form>

        </div>
    );
}
```

---

## Troubleshooting

### Q: Tombolnya berwarna Biru, bukan *Emerald* (Hijau) seperti biasanya?

**Artinya:** Desain Hierarki Visual bekerja.
**Solusi:** Saya merancang aliran psikologi warna (*Color Psychology*). Di dunia *Warehouse* Logistik, proses masuk (Inbound) biasanya berwarna Biru yang berarti ketenangan pasokan air, sedangkan proses keluar (Outbound / Alerting) identik dengan Oranye/Merah/Hijau Menyala. Hal ini mencegah operator keliru menekan form.

### Q: Kenapa API merespon *Error* bahwa *Foreign Key ID* tidak ditemukan?

**Artinya:** Tabel Master di Database mu benar-benar kosong.
**Solusi:** Karena Issue 055 (Penyedia Tabel Master) sengaja kita lewati, kamu tidak punya barang satupun yang bisa ditarik. Untuk mengakalinya, isilah setidaknya 1 buah Baris Data ke dalam tabel `inv_offices` dan `inv_items` langsung via antarmuka *Supabase* (Dashboard Database), agar komponen `<select>` *(Dropdown)* ini tidak kosong dan memiliki minimal 1 target lemparan ID.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): inbound stock operations form and mutation bridge" \
  --body "Membangun pelabuhan pengisian logistik ke berbagai simpul Kantor. Melibatkan arsitektur integrasi Dropdown bersarang (Offices x Items) serta pelontar aksi mutasi via React Query. Detail di docs/issues/056-frontend-inventory-stock-in.md" \
  --label "frontend,ui,module-inventory,operations"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/056-frontend-inventory-stock-in
```

### Step 3: Kerjakan

Salin baris kodingan form antarmuka `page.tsx` ke dalam alamat `frontend/src/app/(dashboard)/inventory/stock-in/`. Pastikan kamu menginstal ekstensi VS Code yang mampu menyorot baris Tailwind agar tidak terjadi kesalahan pemotongan kelas.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(inventory): inbound stock operations form and mutation bridge (#56)"
git push -u origin issue/056-frontend-inventory-stock-in
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): inbound stock operations form and mutation bridge (#56)" \
  --body "## Summary
Merintis pelabuhan persinggahan pertama *Inbound Logistics*. Mengunci seluruh prosedur administrasi suplai barang langsung ke jantung \`InventoryService\` yang kita bangun di Fase Backend.

## Changes
- Penciptaan form \`StockInPage\` dengan 4 tiang pengisian mutlak.
- Pembatasan nilai masuk melalui \`min=\"1\"\` dan konversi bertipe \`Number()\` di level Klien *(Frontend Sanitation)*.
- Pengaplikasian warna semantik \`Blue\` untuk proses *Inbound*, membedakannya secara visual dari modul lain.

## Rules Compliance
- [x] Lolos integrasi form lintas-modul secara tak terlihat (Kenyamanan UX / *Active Loading*).

Closes #56" \
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
Modul Logistik BKSDA telah meloncati tahap Master Data dan langsung ditugaskan membangun Pintu Penerimaan Barang (*Stock In*).

## Task

Kerjakan Issue #056 (Frontend — Stock In Operations).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/056-frontend-inventory-stock-in.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file pondasi logistik di `frontend/src/app/(dashboard)/inventory/stock-in/page.tsx`.
3. Suntikkan tata letak formulir *Glassmorphism* lengkap dengan ikatan fungsional (*Hooks*) ke `api.post('/inventory/stock/in')`.
4. Jika menemui peringatan taktik antarmuka Kosong (*Empty Dropdown*), ikuti aba-aba *Troubleshooting* di *Markdown* untuk mengisi nilai *Database* mu secara serampangan (*Dummy/Seeding*) demi kelancaran tes.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
