# Issue #057 — Frontend — Stock Out Operations (Distribusi Pengeluaran)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-inventory`, `operations`
> **Priority**: 🔴 Critical (Aliran Nadi Keluar dan Potensi Terbesar Serangan Integritas Data)
> **Complexity**: 🔴 High (Integrasi Lintas-Modul Kepegawaian dan Penanganan Ledakan Eksepsi/Error Defisit)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #056, Issue #051 (Service Pengecekan Defisit)

---

## Branch

```
issue/057-frontend-inventory-stock-out
```

## Deskripsi

*(Pesan Rahasia: Ya, Issue 56 sudah mendarat aman dan lengkap di penyimpananmu sebelumnya).*

Kini kita tiba di gerbang paling sensitif dari seluruh siklus gudang Logistik: **Distribusi Pengeluaran Barang (Stock Out)** beralamat di `/inventory/stock-out`.

Jika formulir Stok Masuk (Issue 56) terkesan ramah dan bebas hambatan, formulir Pengeluaran ini adalah kebalikannya. Formulir ini sangat ketat dan berpotensi sering ditolak (Melempar *Error/Exception*) oleh *Backend*. Kenapa?
1. Karena jika admin mencoba mengeluarkan 100 lembar kertas sementara saldonya hanya 50 lembar, fungsi Ajaib `InventoryService` (Issue 049) akan murka dan melempar status `400 Bad Request`. *Frontend* di Issue ini **wajib** menangkap pesan murka tersebut dan menyajikannya secara anggun ke layar pengguna.
2. Setiap barang yang keluar **mutlak** harus memiliki penanggung jawab pengambil. Formulir ini harus menarik Daftar Nama Pegawai dari **Modul Kepegawaian** (Fase 2) untuk membuktikan *"Siapa yang mengambil Aset Negara ini?"*.

Tema visual halaman ini akan dibalut dengan aksen *Oranye/Merah (Orange/Red)* untuk mensugesti psikologi kewaspadaan operator (*Outbound / Danger Alert*).

---

## Acceptance Criteria

- [ ] File `src/app/(dashboard)/inventory/stock-out/page.tsx` diaktifkan.
- [ ] Terdapat 5 ruas Formulir: **Kantor Asal**, **Nama Barang**, **Pegawai Peminta (Cross-Module)**, **Jumlah**, dan **Keterangan**.
- [ ] Terdapat 3 panitia penarik data (`useQuery`) sekaligus untuk menghimpun Opsi Dropdown.
- [ ] Menerapkan *Error Handling* elegan yang menampilkan pesan *"Stok Tidak Mencukupi"* langsung dari respon Backend, bukannya memunculkan pesan error teknis ke pengguna.
- [ ] Menggunakan palet *Tailwind* bernada Oranye/Merah (*Orange-500/Red-500*).

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\inventory\stock-out\page.tsx`

Halaman tingkat tinggi ini menggabungkan penarikan data berlapis dan penanganan pengecualian tingkat dewa.

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowUpFromLine, Send, Loader2, PackageMinus, CheckCircle2, AlertOctagon } from "lucide-react";
import Link from "next/link";

export default function StockOutPage() {
    const queryClient = useQueryClient();
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // State Penampung Formulir
    const [form, setForm] = useState({
        office_id: "",
        item_id: "",
        employee_id: "", // WAJIB ADA!
        quantity: "",
        keterangan: ""
    });

    // 1. Tarik Data Kantor
    const { data: offices } = useQuery({ queryKey: ['offices-dropdown'], queryFn: async () => (await api.get('/inventory/offices')).data.data });

    // 2. Tarik Data Barang
    const { data: items } = useQuery({ queryKey: ['items-dropdown'], queryFn: async () => (await api.get('/inventory/items')).data.data });

    // 3. Tarik Data LINTAS-MODUL (Modul Kepegawaian)
    // Pastikan rute ini ada, atau ganti dengan rute yang sesuai di Fase 2
    const { data: employees } = useQuery({ queryKey: ['employees-dropdown'], queryFn: async () => (await api.get('/kepegawaian/employees')).data.data });

    // 4. Mesin Pelontar Distribusi
    const mutation = useMutation({
        mutationFn: async (payload: typeof form) => {
            setErrorMessage(null); // Bersihkan error lama
            const res = await api.post('/inventory/stock/out', {
                ...payload,
                quantity: Number(payload.quantity)
            });
            return res.data;
        },
        onSuccess: () => {
            setIsSuccess(true);
            setForm({ office_id: "", item_id: "", employee_id: "", quantity: "", keterangan: "" });
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            
            // Hapus notifikasi setelah 4 detik
            setTimeout(() => setIsSuccess(false), 4000);
        },
        onError: (error: any) => {
            // MENANGKAP LEDAKAN DARI INVENTORY SERVICE (ISSUE 049)
            const serverMessage = error.response?.data?.message || error.response?.data?.error;
            setErrorMessage(serverMessage || "Terjadi kesalahan fatal. Sistem menolak mengurangi saldo.");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.office_id || !form.item_id || !form.employee_id || !form.quantity) {
            return setErrorMessage("Kantor, Barang, Nama Pegawai, dan Jumlah mutlak harus diisi!");
        }
        mutation.mutate(form);
    };

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto animate-in slide-in-from-right-8 duration-500">
            
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                    <ArrowUpFromLine className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Distribusi Keluar</h1>
                    <p className="text-zinc-400 mt-1">Serahkan fisik barang logistik kepada pegawai yang membutuhkan.</p>
                </div>
            </div>

            {/* Peringatan Sukses Melayang */}
            {isSuccess && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 animate-in fade-in duration-300">
                    <CheckCircle2 className="w-6 h-6" />
                    <div>
                        <p className="font-bold">Distribusi Sah!</p>
                        <p className="text-sm text-emerald-500/80">Barang telah berhasil berpindah tangan dan saldo sistem sukses dipotong.</p>
                    </div>
                </div>
            )}

            {/* ERROR CATCHER (Penangkap Peringatan Defisit Saldo) */}
            {errorMessage && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 animate-in shake duration-300">
                    <AlertOctagon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p className="font-bold">Operasi Digagalkan</p>
                        <p className="text-sm text-red-500/80">{errorMessage}</p>
                    </div>
                </div>
            )}

            {/* Kartu Formulir Oranye/Merah */}
            <form onSubmit={handleSubmit} className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
                
                <div className="space-y-6 relative z-10">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Dropdown Kantor Pengeluaran */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Tarik dari Gudang/Kantor <span className="text-orange-500">*</span></label>
                            <select 
                                value={form.office_id}
                                onChange={(e) => setForm({...form, office_id: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none"
                            >
                                <option value="">-- Lokasi Pengambilan --</option>
                                {offices?.map((o: any) => <option key={o.id} value={o.id}>{o.nama_kantor}</option>)}
                            </select>
                        </div>

                        {/* Dropdown Barang */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Aset/Barang yang Diminta <span className="text-orange-500">*</span></label>
                            <select 
                                value={form.item_id}
                                onChange={(e) => setForm({...form, item_id: e.target.value})}
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none"
                            >
                                <option value="">-- Tentukan Barang --</option>
                                {items?.map((i: any) => <option key={i.id} value={i.id}>{i.nama_barang}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-300">Serahkan Kepada (Pegawai Penerima) <span className="text-orange-500">*</span></label>
                        <select 
                            value={form.employee_id}
                            onChange={(e) => setForm({...form, employee_id: e.target.value})}
                            className="w-full bg-zinc-950 border border-zinc-800 text-orange-100 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 appearance-none"
                        >
                            <option value="">-- Pilih Pegawai BKSDA --</option>
                            {/* Pastikan Endpoint Karyawan mengembalikan properti 'nama_lengkap' */}
                            {employees?.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.nama_lengkap} (NIP: {emp.nip})</option>)}
                        </select>
                        <p className="text-[11px] text-zinc-500">Mencakup nama dari Modul Kepegawaian (HRIS).</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Input Jumlah Penarikan */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Jumlah Dikeluarkan <span className="text-orange-500">*</span></label>
                            <div className="relative">
                                <PackageMinus className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                                <input 
                                    type="number"
                                    min="1"
                                    value={form.quantity}
                                    onChange={(e) => setForm({...form, quantity: e.target.value})}
                                    placeholder="Contoh: 2"
                                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-bold"
                                />
                            </div>
                        </div>

                        {/* Input Keterangan Alasan */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">Tujuan / Alasan Pemakaian</label>
                            <input 
                                type="text"
                                value={form.keterangan}
                                onChange={(e) => setForm({...form, keterangan: e.target.value})}
                                placeholder="Contoh: Keperluan Rapat Koordinasi"
                                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
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
                            className="px-6 py-3 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-500 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-500/20"
                        >
                            {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {mutation.isPending ? "Memverifikasi Saldo..." : "Keluarkan Barang"}
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

### Q: Apa maksudnya "Memverifikasi Saldo"? Kenapa tidak langsung "Menyimpan"?

**Artinya:** Desain Bahasa Komunikasi Mesin-Manusia (UX Writing).
**Solusi:** Berbeda dengan Pemasukan Stok yang pasti akan selalu diterima sistem, Pengeluaran Stok berpotensi tinggi untuk ditolak server karena saldo tidak cukup. Merubah kata *loading* menjadi "Memverifikasi Saldo..." secara tidak langsung mendidik pengguna bahwa sistem BKSDA sedang benar-benar menghitung ketersediaan barang di gedung penyimpanannya.

### Q: Komponen Dropdown Daftar Karyawan kosong!

**Artinya:** Titik henti (*Endpoint*) API Karyawanmu memiliki struktur JSON yang berbeda atau belum dibuat.
**Solusi:** Kodingan di atas mengasumsikan `/api/kepegawaian/employees` memberikan JSON balasan `data.data` yang memiliki kolom `id` dan `nama_lengkap`. Jika tabel struktur `kpg_employees` milikmu di Fase 2 menghasilkan wujud JSON yang lain, silahkan ubah kata `emp.nama_lengkap` di barisan pemetaan map menjadi `emp.nama_kolom_kamu_yang_asli`.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(inventory): outbound distribution engine with intelligent deficit interception" \
  --body "Membangun sistem interaktif pemotongan stok berbalut mekanisme Penjaga Gerbang Error (*Deficit Catcher*) guna melindungi integritas nilai Saldo. Menghadirkan Integrasi Modul Silang pertama dengan HRIS Kepegawaian BKSDA. Detail di docs/issues/057-frontend-inventory-stock-out.md" \
  --label "frontend,ui,module-inventory,operations"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/057-frontend-inventory-stock-out
```

### Step 3: Kerjakan

Tuangkan barisan formulir reaktif tinggi ini ke dalam `/inventory/stock-out/page.tsx`. Jangan ubah penamaan `employee_id` karena *Backend FormRequest* (Issue 050) akan secara agresif memburu kolom ini di dalam *Database*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(inventory): outbound distribution engine with intelligent deficit interception (#57)"
git push -u origin issue/057-frontend-inventory-stock-out
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(inventory): outbound distribution engine with intelligent deficit interception (#57)" \
  --body "## Summary
Penyelesaian sirkulasi kehidupan logistik. Menutup jalur *Inbound* dengan pembukaan keran *Outbound Distribution* terintegrasi ekosistem pegawai.

## Changes
- Penciptaan \`StockOutPage\` dengan pewarnaan psikologis *Orange-Danger* (Batas Kritis).
- Penggabungan (*Triple Array Data Fetching*) Modul Kantor, Modul Barang, dan Modul Kepegawaian di dalam satu keranjang Form.
- Instalasi Sistem Alarm Merah *Frontend* yang menangkap sinyal ledakan 400 Bad Request dari *Backend Service*.

## Rules Compliance
- [x] Lolos integrasi lintas modul absolut menuju \`kpg_employees\` sebagai prasyarat identifikasi Pemohon Barang.

Closes #57" \
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
Modul Logistik BKSDA mencapai pusaran puncaknya. Barang yang masuk harus dapat dikeluarkan kepada Pegawai secara teratur dan terlacak oleh sistem penahan Defisit (Saldo Minus).

## Task

Kerjakan Issue #057 (Frontend — Stock Out Operations).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/057-frontend-inventory-stock-out.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat file `frontend/src/app/(dashboard)/inventory/stock-out/page.tsx`.
3. Suntikkan kodingan pengeluaran stok yang telah dilengkapi **Error Catcher Merah**.
4. Cek konsistensi pemanggilan `api.get('/kepegawaian/employees')` menyesuaikan dengan URL Modul Pegawai di proyek aslimu.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
