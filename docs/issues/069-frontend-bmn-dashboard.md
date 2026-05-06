# Issue #069 — Frontend — BMN Dashboard (Pusat Komando Analitik)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-bmn`, `charts`
> **Priority**: 🔴 Critical (Halaman Sambutan Pertama Pimpinan/Auditor)
> **Complexity**: 🟡 Medium (Integrasi Grafik Recharts & Konversi Finansial Rupiah)
> **Recommended AI Model**: Gemini 2.5 Flash / Claude Sonnet / GPT-4o
> **Dependencies**: Issue #068

---

## Branch

```
issue/069-frontend-bmn-dashboard
```

## Deskripsi

Setelah *Layout* dan *Sidebar* berdiri di Issue 068, layar di sebelah kanannya masih berupa kehampaan hitam. Halaman pertama yang akan dilihat oleh Kepala BKSDA atau Auditor BPK saat membuka Modul BMN adalah halam utama *(Dashboard)*.

Pada **Issue #069** ini, kita akan menyulap kehampaan tersebut menjadi **Pusat Komando Analitik Kelas Premium**.

Pimpinan tidak butuh melihat barisan data teks yang membosankan. Mereka butuh ringkasan cepat *(Birds-eye View)*:
1. **Kartu Statistik (Metric Cards)**: Memperlihatkan Total Aset, Total Nilai Kekayaan (dalam format Rupiah), Aset Dipinjam, dan Aset Kritis (Rusak).
2. **Visualisasi Data (Charts)**: Kita akan menggunakan pustaka `recharts` untuk menggambar Grafik Batang *(Bar Chart)* berdesain futuristik *(Glassmorphism)* yang memperlihatkan rasio kondisi barang.

*(Catatan MVP: Karena Endpoint API khusus analitik belum dicetak di Fase Backend, kita akan memompa layar ini menggunakan injeksi Data Simulasi Tinggi (High-Fidelity Mock) yang siap diganti ke data API nyata hanya dengan 1 baris kode di masa depan).*

---

## Acceptance Criteria

- [ ] File `frontend/src/app/(dashboard)/bmn/page.tsx` diimplementasikan dengan sempurna.
- [ ] Terdapat 4 Kartu Metrik *(Cards)* berdesain *Dark Mode Premium* (Gradasi warna dan Ikon Lucide).
- [ ] Terdapat sebuah Grafik Batang Canggih *(Bar Chart)* yang menggunakan `recharts`.
- [ ] Mengimplementasikan fungsi penterjemah angka menjadi format uang baku Rupiah (Fungsi `formatRupiah`).

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\bmn\page.tsx`

Salin dan pahat cetak biru layar analitik yang sangat mewah ini:

```tsx
"use client";

import { CarFront, Handshake, ShieldAlert, Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// 1. Fungsi Pemoles Mata Uang
const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(angka);
};

// 2. Data Simulasi Analitik (Menunggu Endpoint API Backend)
const mockStats = {
    total_aset: 1245,
    total_nilai_buku: 45670000000, // 45.6 Miliar Rupiah
    aset_dipinjam: 84,
    aset_rusak: 12
};

const mockChartData = [
    { name: "Baik", total: 1100, color: "#10b981" }, // Emerald 500
    { name: "Rusak Ringan", total: 133, color: "#f59e0b" }, // Amber 500
    { name: "Rusak Berat", total: 12, color: "#ef4444" }, // Red 500
];

export default function BmnDashboardPage() {
    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header Judul */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-emerald-500" />
                    Pusat Analitik Kekayaan Negara
                </h1>
                <p className="text-zinc-400 mt-2 font-medium">Ringkasan valuasi dan mobilitas Barang Milik Negara (BMN) BKSDA.</p>
            </div>

            {/* Barisan Kartu Metrik (Grid 4 Kolom) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Card 1: Total Valuasi (Kartu Paling Mewah) */}
                <div className="bg-gradient-to-br from-emerald-900/40 to-zinc-950 border border-emerald-500/20 p-6 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-all duration-500">
                    <div className="absolute -right-6 -top-6 bg-emerald-500/10 p-6 rounded-full group-hover:scale-110 transition-transform duration-500">
                        <TrendingUp className="w-12 h-12 text-emerald-500/50" />
                    </div>
                    <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-1">Total Nilai Buku</p>
                    <h2 className="text-3xl font-black text-white tracking-tight">{formatRupiah(mockStats.total_nilai_buku)}</h2>
                </div>

                {/* Card 2: Total Item */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl shadow-xl hover:bg-zinc-900 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-zinc-500 mb-1">Jumlah Fisik Aset</p>
                            <h2 className="text-3xl font-black text-zinc-100">{mockStats.total_aset} <span className="text-base font-normal text-zinc-600">Unit</span></h2>
                        </div>
                        <div className="bg-blue-500/10 p-3 rounded-2xl">
                            <CarFront className="w-6 h-6 text-blue-500" />
                        </div>
                    </div>
                </div>

                {/* Card 3: Peminjaman */}
                <div className="bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl shadow-xl hover:bg-zinc-900 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-zinc-500 mb-1">Sedang Dipinjam</p>
                            <h2 className="text-3xl font-black text-amber-500">{mockStats.aset_dipinjam} <span className="text-base font-normal text-zinc-600">Unit</span></h2>
                        </div>
                        <div className="bg-amber-500/10 p-3 rounded-2xl">
                            <Handshake className="w-6 h-6 text-amber-500" />
                        </div>
                    </div>
                </div>

                {/* Card 4: Peringatan Rusak Berat */}
                <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-3xl shadow-xl hover:bg-red-900/30 transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-red-400/80 mb-1">Kritis / Rusak Berat</p>
                            <h2 className="text-3xl font-black text-red-500">{mockStats.aset_rusak} <span className="text-base font-normal text-red-500/50">Unit</span></h2>
                        </div>
                        <div className="bg-red-500/20 p-3 rounded-2xl animate-pulse">
                            <ShieldAlert className="w-6 h-6 text-red-500" />
                        </div>
                    </div>
                </div>

            </div>

            {/* Area Grafik Visualisasi */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Grafik Rasio Kondisi Fisik */}
                <div className="lg:col-span-2 bg-zinc-950/50 border border-zinc-800 p-6 rounded-3xl shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-zinc-400" /> Rasio Kondisi Fisik BMN
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#27272a', opacity: 0.4}}
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                                    {mockChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Panel Info BPK (Pengisi Ruang Estetis) */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl flex flex-col justify-center text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-zinc-950">
                        <FileBox className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Audit Kesiapan BPK</h3>
                    <p className="text-sm text-zinc-400 mb-6">Pastikan seluruh data aset di mutakhirkan setiap akhir semester (Juni & Desember) untuk menghindari temuan auditor keuangan.</p>
                    <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors">
                        Buka Laporan Semester
                    </button>
                </div>

            </div>

        </div>
    );
}
```

---

## Troubleshooting

### Q: Layar mendadak putih (Blank) dan terminal Frontend memunculkan tulisan *Module not found: Can't resolve 'recharts'*!

**Artinya:** Pustaka pihak ketiga pembuat grafik belum ter-instal di mesin komputermu.
**Solusi:** Matikan sementara peladen (*server*) Frontend kamu, lalu eksekusi sihir instalasi ini di terminal folder `frontend/`:
```bash
npm install recharts
```
Jalankan `npm run dev` kembali. Ledakan warna grafik akan langsung menyala!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): render high-fidelity analytical dashboard mapping national asset valuations" \
  --body "Membangun Pusat Komando Visual BMN. Mengintegrasikan perpustakaan \`recharts\` untuk mengonversi triliunan data mentah menjadi bentuk Bar Chart. Mengimplementasikan konversi mata uang rupiah langsung di sisi Client. Detail di docs/issues/069-frontend-bmn-dashboard.md" \
  --label "frontend,ui,module-bmn,charts"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/069-frontend-bmn-dashboard
```

### Step 3: Kerjakan

Tuangkan cetak biru layar mewah di atas ke alamat `src/app/(dashboard)/bmn/page.tsx`. Jangan pernah mengabaikan peringatan terminal. Jika disuruh melakukan *npm install recharts*, lakukanlah dengan taat.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): render high-fidelity analytical dashboard mapping national asset valuations (#69)"
git push -u origin issue/069-frontend-bmn-dashboard
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): render high-fidelity analytical dashboard mapping national asset valuations (#69)" \
  --body "## Summary
Pembangkitan antarmuka Analitik *(Dashboard)* sebagai pijakan visual pertama para petinggi BKSDA di dalam Modul BMN.

## Changes
- Pembuatan 4 Kartu Metrik Vital: Total Fisik, Total Valuasi Harga, Status Dipinjam, dan Kritis/Rusak Berat.
- Injeksi desain UI Premium: *Hover effect* perbesaran ikon, warna peringatan berkedip *animate-pulse* untuk barang rusak, dan batas pudar efek *Glassmorphism*.
- Penggambaran *Bar Chart* proporsional interaktif menggunakan pustaka React \`recharts\`.

## Rules Compliance
- [x] Lolos regulasi Visual Superior (Aesthetics Rule): Tiada satupun teks baku hitam-putih HTML yang mencemari layar. Seluruh elemen berwujud komponen UI tingkat lanjut.

Closes #69" \
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
Para Pimpinan BKSDA tidak akan membaca tabel panjang satu-satu. Mereka butuh ringkasan mewah (Dashboard). Kita akan membangun layar penuh grafik untuk Modul BMN ini.

## Task

Kerjakan Issue #069 (Frontend — BMN Dashboard).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/069-frontend-bmn-dashboard.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. (Opsional tapi sering wajib): Jalankan perintah `npm install recharts` di folder `frontend` jika paket tersebut belum ada.
3. Buat file `frontend/src/app/(dashboard)/bmn/page.tsx` lalu tempel kode Dashboard premium tersebut secara bulat-bulat.
4. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
