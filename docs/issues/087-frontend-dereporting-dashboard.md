# Issue #087 — Frontend — DeReporting Dashboard (Pusat Komando Laporan)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-dereporting`
> **Priority**: 🔴 Critical (Layar Pertama yang Dilihat Kepala BKSDA Setiap Pagi)
> **Complexity**: 🟡 Medium (Visualisasi Statistik Recharts + API Aggregation)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #084, Issue #068 (Pola Layout Sidebar)

---

## Branch

```
issue/087-frontend-dereporting-dashboard
```

## Deskripsi

Selamat datang di Pusat Komando Intelijen Laporan! 🎯

Kepala BKSDA membuka laptopnya setiap pagi pukul 07.00 WIB. Hal pertama yang ingin ia ketahui:
- "Berapa laporan baru yang masuk semalam?"
- "Bidang mana yang paling banyak mendapat aduan?"
- "Berapa laporan masyarakat yang belum ditinjau?"

Pada **Issue #087** ini, kita akan merakit layar *Dashboard* analitis yang menjawab ketiga pertanyaan tersebut secara instan menggunakan kartu statistik berwarna dan grafik batang visual.

**Catatan Arsitektur:**
Modul DeReporting menggunakan *Layout* tersendiri (Sidebar navigasi khusus) yang polanya identik dengan Layout BMN dari Issue 068. Kita akan membuat `layout.tsx` dan `page.tsx` secara bersamaan di dalam rute grup `(dashboard)/dereporting/`.

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan: `frontend/src/app/(dashboard)/dereporting/`.
- [ ] Tersedia `layout.tsx` yang merangkum Sidebar Navigasi khas Modul Laporan.
- [ ] Tersedia `page.tsx` (Dashboard Utama) yang memanggil endpoint statistik.
- [ ] Terdapat minimal 4 Kartu Statistik: Total Internal, Total Eksternal, Menunggu Tinjauan, dan Total Bidang Aktif.
- [ ] Terdapat 1 Grafik Batang (*Bar Chart*) visualisasi jumlah laporan per Bidang menggunakan `recharts`.

---

## Panduan Implementasi Cerdas

### 1. Cetak Biru Layout Modul DeReporting
**Path:** `frontend/src/app/(dashboard)/dereporting/layout.tsx`

Salin pola dari Issue 068 (BMN Layout) dan modifikasi navigasinya:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Globe, Users, LayoutDashboard } from "lucide-react";

const SIDEBAR_ITEMS = [
    { href: "/dereporting",          label: "Dashboard",        icon: LayoutDashboard },
    { href: "/dereporting/internal", label: "Laporan Internal", icon: FileText },
    { href: "/dereporting/eksternal",label: "Laporan Publik",   icon: Globe },
    { href: "/dereporting/operator", label: "Operator",         icon: Users },
];

export default function DeReportingLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-zinc-950">
            {/* Sidebar Navigasi */}
            <aside className="hidden md:flex flex-col w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 gap-1">
                <div className="flex items-center gap-3 px-3 py-4 mb-4">
                    <BarChart3 className="w-7 h-7 text-violet-500" />
                    <h2 className="text-lg font-black text-white tracking-tight">DeReporting</h2>
                </div>
                {SIDEBAR_ITEMS.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dereporting" && pathname.startsWith(item.href));
                    return (
                        <Link key={item.href} href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            }`}>
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </aside>

            {/* Konten Utama */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
```

### 2. Cetak Biru Dashboard Analitis
**Path:** `frontend/src/app/(dashboard)/dereporting/page.tsx`

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarChart3, FileText, Globe, Clock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Palet Warna Seragam untuk Grafik
const CHART_COLORS = ["#8b5cf6", "#6366f1", "#a78bfa", "#7c3aed", "#818cf8", "#c4b5fd"];

export default function DeReportingDashboardPage() {
    // Penarikan Data Statistik dari Backend
    const { data: stats, isLoading } = useQuery({
        queryKey: ["dr-dashboard-stats"],
        queryFn: async () => {
            // Kita memanggil beberapa endpoint secara paralel untuk kecepatan
            const [internals, ekternals, bidangList] = await Promise.all([
                api.get("/dereporting/internals", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
                api.get("/dereporting/ekternals", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
                api.get("/dereporting/master/bidang", { params: { paginate: "false" } }).catch(() => ({ data: { data: [] } })),
            ]);

            const internalData = internals.data?.data || [];
            const eksternalData = ekternals.data?.data || [];
            const bidangData = bidangList.data?.data || [];

            // Hitung total laporan per bidang (untuk grafik)
            const bidangCounts = bidangData.map((b: any) => ({
                nama: b.nama,
                total: internalData.filter((r: any) => r.bidang_id === b.id).length,
            }));

            return {
                totalInternal: internalData.length,
                totalEksternal: eksternalData.length,
                menungguTinjauan: eksternalData.filter((e: any) => e.status === "Menunggu Tinjauan").length,
                totalBidang: bidangData.length,
                bidangCounts,
            };
        },
    });

    // Kartu Statistik Pembantu
    const STAT_CARDS = [
        { label: "Laporan Internal",    value: stats?.totalInternal ?? 0,     icon: FileText, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
        { label: "Laporan Publik",      value: stats?.totalEksternal ?? 0,    icon: Globe,    color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20" },
        { label: "Menunggu Tinjauan",   value: stats?.menungguTinjauan ?? 0,  icon: Clock,    color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20" },
        { label: "Bidang Aktif",        value: stats?.totalBidang ?? 0,       icon: BarChart3,color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20" },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-violet-500" /> Pusat Komando Laporan
                </h1>
                <p className="text-zinc-400 mt-2 text-sm">Ikhtisar rekapitulasi seluruh laporan internal & publik BKSDA secara real-time.</p>
            </div>

            {/* Grid Kartu Statistik */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {STAT_CARDS.map((card) => (
                            <div key={card.label} className={`${card.bg} border ${card.border} rounded-2xl p-5 flex items-start gap-4 transition-all hover:scale-[1.02]`}>
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg}`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-white">{card.value}</p>
                                    <p className="text-xs text-zinc-400 font-medium mt-0.5">{card.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Grafik Batang: Laporan per Bidang */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-white mb-6">Distribusi Laporan Internal per Bidang</h3>
                        {stats?.bidangCounts?.length ? (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={stats.bidangCounts} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                                    <XAxis dataKey="nama" tick={{ fill: "#71717a", fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                                    <YAxis tick={{ fill: "#71717a", fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px", color: "#fff" }} />
                                    <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                                        {stats.bidangCounts.map((_: any, i: number) => (
                                            <Cell key={`cell-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-zinc-500 text-sm text-center py-12">Belum ada data laporan untuk divisualisasikan.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
```

---

## Troubleshooting

### Q: Grafik muncul tapi batangnya tidak terlihat (Hanya garis sumbu X/Y yang muncul)?

**Artinya:** Data `bidangCounts` kemungkinan mengembalikan array kosong atau properti `total` bernilai 0 semua.
**Solusi:** Pastikan Backend DeReporting (Issue 081) sudah memiliki beberapa data laporan demo. Jika belum ada data sama sekali, grafik memang akan kosong. Gunakan `php artisan tinker` untuk membuat record Internal secara manual:
```php
\App\Modules\DeReporting\Models\Internal::create([...]);
```

### Q: Mengapa Dashboard ini menggunakan `api.ts` (Dengan Token) tapi Formulir Publik (Issue 086) tidak?

**Artinya:** Kamu telah memahami Doktrin Zona Arsitektur dengan benar!
**Solusi:** Dashboard hanya bisa dibuka setelah Login (Zona Pegawai). Oleh karena itu ia memiliki Token dan wajib menggunakan `@/lib/api.ts`. Formulir Publik (Issue 086) berdiri di internet terbuka, tidak punya Token.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(dereporting): deploy executive analytics dashboard with bidang distribution chart" \
  --body "Membangun Pusat Komando Intelijen Laporan DeReporting. Mengorkestrasi 4 Kartu Metrik + Grafik Batang Distribusi Bidang menggunakan Recharts. Detail di docs/issues/087-frontend-dereporting-dashboard.md" \
  --label "frontend,ui,module-dereporting"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/087-frontend-dereporting-dashboard
```

### Step 3: Kerjakan

Pahat dua file sekaligus: `layout.tsx` (Sidebar Navigasi) dan `page.tsx` (Dashboard Analitis). Warna aksen modul DeReporting adalah **Ungu/Violet** (`violet-500`), berbeda dengan BMN (Emerald) dan Inventory (Blue).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(dereporting): deploy executive analytics dashboard with bidang distribution chart (#87)"
git push -u origin issue/087-frontend-dereporting-dashboard
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(dereporting): deploy executive analytics dashboard with bidang distribution chart (#87)" \
  --body "## Summary
Pembangunan Pusat Kendali Eksekutif *(Command Center)* untuk Modul Laporan Kinerja.

## Changes
- Penciptaan \`layout.tsx\` khusus DeReporting menggunakan pola *Sidebar Glassmorphism* bertemakan Ungu/Violet.
- Pembuatan 4 Kartu Statistik dengan kalkulasi agregasi paralel \`Promise.all\`.
- Pendirian Grafik Distribusi Laporan *(Recharts BarChart)* yang memetakan volume aduan per unit Bidang kerja.

## Rules Compliance
- [x] Lolos Doktrin Estetika Premium: Palet warna harmonis Ungu (\`violet-400/500\`) diaplikasikan secara konsisten di seluruh elemen.

Closes #87" \
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
Modul DeReporting butuh layar pertama: Dashboard Eksekutif yang menampilkan statistik laporan masuk.
Warna Aksen modul ini: **Violet/Ungu** (berbeda dari BMN yang Emerald dan Inventory yang Blue).

## Task

Kerjakan Issue #087 (Frontend — DeReporting Dashboard).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/087-frontend-dereporting-dashboard.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder: `frontend/src/app/(dashboard)/dereporting/`.
3. Pahat `layout.tsx` (Sidebar) dan `page.tsx` (Dashboard) secara berurutan.
4. Pastikan semua ikon dan komponen telah diimpor dari `lucide-react` dan `recharts`.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
