# Issue #068 — Frontend — BMN Layout & Sidebar (Gerbang Antarmuka Aset)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-bmn`
> **Priority**: 🔴 Critical (Navigasi Utama Operator BMN)
> **Complexity**: 🟢 Simple (Pemetaan Rute Sisi Klien & Komponen Layout Next.js)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #021 (Dark Mode), Issue #029 (Module Switcher)

---

## Branch

```
issue/068-frontend-bmn-layout
```

## Deskripsi

*(Catatan: Spesifikasi untuk Rute Backend [Issue 67] telah diresmikan. Kini kita menyeberang ke wilayah Frontend React/Next.js).*

Selamat datang di ranah Visual (Frontend) Modul BMN! Pekerjaan pertama kita untuk mendirikan sebuah modul baru di layar peramban adalah membangun "Rumah"-nya, yakni *Layout* dan *Sidebar*.

Pada **Issue #068** ini, kita akan membuat navigasi khusus yang hanya muncul ketika operator masuk ke wilayah URL `/bmn`. *Sidebar* ini harus menyajikan tombol-tombol yang memetakan segala kebutuhan pengelolaan Barang Milik Negara sesuai instruksi BPK:
1. **Dashboard** (Analitik & Peta Aset)
2. **Master Aset** (Tabel Data Raksasa Aset Negara)
3. **Peminjaman** (Lalu lintas pinjam-kembali Aset)
4. **Pemeliharaan** (Rekam Medis/Servis Aset)
5. **Pemutihan** (Penghapusan/Lelang Aset Rusak)
6. **Laporan & Audit** (Pusat Cetak Dokumen Excel)

---

## Acceptance Criteria

- [ ] Folder Modul diciptakan di dalam struktur Next.js: `frontend/src/app/(dashboard)/bmn`.
- [ ] Berkas `layout.tsx` khusus BMN diciptakan dan berhasil menimpa (*Wrap*) halaman utama.
- [ ] Navigasi *Sidebar* berfungsi penuh mendeteksi rute aktif *(Active State)* menggunakan `usePathname()`.
- [ ] *Sidebar* mengimplementasikan desain Estetika *Glassmorphism* (Batas transparan) ala Vercel/Shadcn sesuai **Aturan Desain SuperApp**.

---

## Panduan Implementasi Cerdas

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\bmn\layout.tsx`

Buat folder penampungnya terlebih dahulu (pastikan ejaan foldernya menggunakan huruf kecil semua). Kemudian salin kanvas *Layout* tingkat tinggi di bawah ini:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  CarFront, 
  Handshake, 
  Wrench, 
  Trash2, 
  FileBox,
  Building2
} from "lucide-react";
import ModuleSwitcher from "@/components/layout/ModuleSwitcher"; // Asumsi komponen ini sudah ada dari Fase 2
import LogoutButton from "@/components/layout/LogoutButton"; // Asumsi dari Fase 2

// Peta Menu Khusus BMN
const bmnMenus = [
    { title: "Dashboard BMN", path: "/bmn", icon: LayoutDashboard },
    { title: "Katalog Master Aset", path: "/bmn/assets", icon: CarFront },
    { title: "Lalu Lintas Peminjaman", path: "/bmn/loans", icon: Handshake },
    { title: "Riwayat Pemeliharaan", path: "/bmn/maintenances", icon: Wrench },
    { title: "Karantina & Pemutihan", path: "/bmn/disposal", icon: Trash2 },
    { title: "Laporan & Audit BPK", path: "/bmn/reports", icon: FileBox },
];

export default function BmnLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen bg-black/95 text-zinc-100 overflow-hidden selection:bg-emerald-500/30">
            
            {/* Sidebar Eksklusif BMN (Glassmorphism Effect) */}
            <aside className="w-72 bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-800/50 flex flex-col relative z-20 shadow-2xl">
                
                {/* Header: Logo & Module Switcher */}
                <div className="p-6 border-b border-zinc-800/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight tracking-tight text-white">BKSDA</h1>
                            <p className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase">Barang Milik Negara</p>
                        </div>
                    </div>
                    
                    {/* Alat berpindah antar Modul (Kepegawaian -> Logistik -> BMN) */}
                    <ModuleSwitcher currentModule="bmn" />
                </div>

                {/* Navigasi Utama */}
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
                    {bmnMenus.map((menu) => {
                        const Icon = menu.icon;
                        // Logika pendeteksi rute aktif yang akurat (Exact Match untuk Dashboard, StartsWith untuk anakannya)
                        const isActive = menu.path === '/bmn' 
                                        ? pathname === '/bmn' 
                                        : pathname.startsWith(menu.path);

                        return (
                            <Link
                                key={menu.path}
                                href={menu.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                                    isActive 
                                    ? "bg-emerald-500/10 text-emerald-400 font-semibold shadow-inner shadow-emerald-500/5" 
                                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                                }`}
                            >
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />
                                <span className="text-sm">{menu.title}</span>
                                
                                {/* Aksen kilauan kecil di sebelah kiri jika aktif */}
                                {isActive && (
                                    <div className="absolute left-0 w-1 h-8 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer: Profil Pengguna & Keluar */}
                <div className="p-4 border-t border-zinc-800/50">
                    <LogoutButton />
                </div>
            </aside>

            {/* Area Kanvas Utama (Konten Anak/Children) */}
            <main className="flex-1 relative z-10 overflow-y-auto bg-gradient-to-br from-black to-zinc-900/50">
                {children}
            </main>
            
        </div>
    );
}
```

---

## Troubleshooting

### Q: `ModuleSwitcher` atau `LogoutButton` mengembalikan peringatan *Module Not Found*!

**Artinya:** Jalur Impor *(Import Path)* meleset dari struktur folder kamu yang sebenarnya.
**Solusi:** Komponen tersebut seharusnya sudah dirakit secara global sejak Fase 2 (Issue 29 & 30). Jika komponen itu berada di tempat lain (misal di folder `src/components/ui/`), maka ubahlah baris `@/components/layout/ModuleSwitcher` agar selaras dengan lokasi nyatanya di komputermu. Jika kamu lupa membuatnya, ubah saja baris itu menjadi tombol biasa untuk sementara waktu.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): architect unified frontend navigation interface adhering to modern glassmorphism heuristics" \
  --body "Merancang *Layout* Antarmuka Utama untuk operator Aset Negara. Mengimplementasikan pendeteksian reaktif URL *(Pathname Matching)* guna melahirkan efek visual Navigasi interaktif berestetika *Dark-Glassmorphism*. Detail di docs/issues/068-frontend-bmn-layout.md" \
  --label "frontend,ui,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/068-frontend-bmn-layout
```

### Step 3: Kerjakan

Salin cetak biru antar-muka di atas ke dalam target file `src/app/(dashboard)/bmn/layout.tsx`. Hati-hati dengan penamaan folder *(dashboard)* yang wajib menggunakan tanda kurung agar tidak terhitung sebagai jalur URL.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): architect unified frontend navigation interface adhering to modern glassmorphism heuristics (#68)"
git push -u origin issue/068-frontend-bmn-layout
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): architect unified frontend navigation interface adhering to modern glassmorphism heuristics (#68)" \
  --body "## Summary
Pembangkitan Gerbang Antarmuka Visual *(Frontend Layout)* eksklusif untuk lalu-lintas operasional Modul BMN.

## Changes
- Penciptaan pembungkus \`BmnLayout\` yang berdiri di atas kerangka \`layout.tsx\` Next.js App Router.
- Pemetaan statis 6 menu hierarki BMN (Dashboard, Aset, Peminjaman, Pemeliharaan, Pemutihan, dan Laporan).
- Penyatuan komponen Hub Global \`ModuleSwitcher\` dan \`LogoutButton\`.

## Rules Compliance
- [x] Mematuhi Aturan Estetika Visual (UI Psychology): Penggunaan efek *Backdrop Blur* (Glassmorphism), aksen kilauan transisi hijau-zamrud (Emerald), serta indikator rute aktif dinamis \`usePathname()\`.

Closes #68" \
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
Fase Backend BMN telah usai seutuhnya. Kita kini berada di teritori Frontend (Next.js). Langkah mutlak pertama adalah mendirikan Sang Rumah/Bingkai Layar (Layout & Sidebar) khusus BMN.

## Task

Kerjakan Issue #068 (Frontend — BMN Layout).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/068-frontend-bmn-layout.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Buat folder baru (jika belum ada) di `frontend/src/app/(dashboard)/bmn`.
3. Pahat file `layout.tsx` di dalam folder tersebut. Susun tata letak *Sidebar* dan panggil ikon-ikon *Lucide React* secara presisi.
4. Koreksi jalur impor `ModuleSwitcher` jika strukturnya berbeda dengan contoh.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
