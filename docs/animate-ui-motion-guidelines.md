# Animate UI & Motion Primitives Design & Implementation Guidelines
**BKSDA SuperApp Enterprise UI/UX Standard**
*Prinsip: /ponytail (Zero New Dependencies, Native & Existing Framer Motion, 60fps Hardware Acceleration)*

---

## 1. Filosofi & Prinsip Gerak (Motion Principles)

Antarmuka BKSDA SuperApp adalah sistem enterprise operasional untuk konservasi sumber daya alam. Animasi dalam sistem ini bertujuan untuk **memberikan kejelasan spasial, umpan balik sentuhan (*tactile feedback*), dan kenyamanan visual**, bukan hiasan (*decorative fluff*) yang memperlambat pekerjaan pengguna.

### Prinsip Utama (The Ponytail Way):
1. **Zero New Dependencies (YAGNI & Rung 5)**:
   - Memanfaatkan library yang telah terpasang resmi di `frontend/package.json`: `framer-motion: ^12.38.0`.
   - Tidak menambahkan package pihak ketiga baru (misal: anime.js, gsap, react-spring, dsb).
2. **GPU-Accelerated Only (No Jank, No Reflow)**:
   - Gerakan hanya boleh memanipulasi properti transform hardware (`transform: translate3d/scale/rotate`) dan `opacity`.
   - Hindari animasi pada `width`, `height`, `top`, `left`, `margin`, atau `padding` kecuali menggunakan `layout` atau `layoutId` yang dioptimasi oleh Framer Motion layout engine.
3. **Ultra-Snappy Durations (120ms – 240ms)**:
   - UI enterprise harus terasa instan:
     - Micro-tap / Hover: `120ms – 160ms`
     - Tab & Panel Transition: `160ms – 200ms`
     - Dialog / Modal pop-up: `180ms – 220ms`
     - Drawer / Sheet slide: `200ms – 260ms`
4. **Spring Physics Over Linear Easing**:
   - Gunakan physics spring (`type: "spring", stiffness: 400-500, damping: 25-32`) untuk memberikan bobot organik alami tanpa efek memantul berlebihan.
5. **Accessibility & Respect `prefers-reduced-motion`**:
   - Semua transisi otomatis nonaktif atau menjadi instan jika sistem operasi pengguna menyalakan fitur pengurangan gerakan (*reduced motion*).

---

## 2. Standar Resep Motion Primitives (7 Reusable Recipes)

Berikut adalah 7 pola animasi standar yang wajib digunakan secara seragam di seluruh modul BKSDA SuperApp:

### Resep 1: Sliding Active Tab / Pill Indicator (`layoutId`)
Digunakan pada bilah navigasi tab (misal: Biodata, Riwayat, Cuti, Uang Makan). Menggantikan pergantian tab kaku dengan pil hijau zamrud (*BKSDA Emerald*) yang meluncur mulus mengikuti tab yang aktif.

```tsx
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
}

export function SlidingTabs({ tabs, activeTab, onChange }: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none",
                isActive
                  ? "text-white"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100/60 dark:hover:bg-slate-800/60"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-emerald-600 text-white shadow-xs rounded-xl"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <Icon className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "relative z-10 px-1.5 py-0.2 rounded-full text-[10px] font-black",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Resep 2: Tactile Elevation & Micro-Press pada Kartu Metrik (`whileHover` + `whileTap`)
Digunakan pada kartu ringkasan eksekutif (Top 4 Metrics Cards) di dashboard dan detail halaman.

```tsx
<motion.div
  whileHover={{ y: -3 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15 }}
  onClick={() => setActiveTab("biodata")}
  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 cursor-pointer transition-colors shadow-2xs hover:shadow-sm group"
>
  <div className="flex items-center justify-between mb-1.5">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Penugasan</span>
    <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
      <FileText className="w-3.5 h-3.5" />
    </div>
  </div>
  <div className="text-xl font-black text-slate-900 dark:text-white">42</div>
  <p className="text-[10px] text-slate-500 mt-0.5 truncate">Surat Tugas Aktif</p>
</motion.div>
```

---

### Resep 3: Smooth Panel & Tab Switch Transition (`AnimatePresence mode="wait"`)
Mencegah perpindahan tab yang tersentak (*jumpy*) dengan efek pudar dan luncuran vertikal lembut sebesar 8px.

```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={activeTab}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.16, ease: "easeOut" }}
  >
    {activeTab === "biodata" && <BiodataSection />}
    {activeTab === "history" && <AssignmentHistorySection />}
    {activeTab === "leave" && <LeaveSection />}
  </motion.div>
</AnimatePresence>
```

---

### Resep 4: 1-Click Action & Copy Feedback Micro-Bounce (`CopyIcon`)
Memberikan umpan balik instan bahwa aksi salin NIP, telepon WhatsApp, email dinas, atau nomor rekening bank telah berhasil disalin ke clipboard pengguna.

```tsx
export function CopyIcon({ copied, checkClass = "text-emerald-600" }: { copied: boolean; checkClass?: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {copied ? (
        <motion.span
          key="check"
          initial={{ scale: 0.5, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0.5 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="inline-flex"
        >
          <Check className={cn("w-3.5 h-3.5", checkClass)} />
        </motion.span>
      ) : (
        <motion.span
          key="copy"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          className="inline-flex"
        >
          <Copy className="w-3.5 h-3.5" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}
```

---

### Resep 5: Live Status Pulsing Badge (Aktivitas Real-Time)
Digunakan pada status persetujuan surat tugas, status sinkronisasi presensi, atau live device telemetry.

```tsx
export function PulseStatusBadge({ status, label }: { status: "pending" | "approved" | "live"; label: string }) {
  const theme = {
    pending: { bg: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", box: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
    approved: { bg: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", box: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800" },
    live: { bg: "bg-blue-500", text: "text-blue-700 dark:text-blue-300", box: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800" },
  }[status];

  return (
    <span className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold border", theme.box, theme.text)}>
      <span className="relative flex h-2 w-2">
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", theme.bg)} />
        <span className={cn("relative inline-flex rounded-full h-2 w-2", theme.bg)} />
      </span>
      <span>{label}</span>
    </span>
  );
}
```

---

### Resep 6: Modal & Slide-over Drawer Backdrop & Entrance
Animasi pembuka dialog modal dan sheet panel drawer yang luwes dengan *spring entrance* dan backdrop blur lembut.

```tsx
<AnimatePresence>
  {isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Modal Dialog Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 450, damping: 30 }}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full z-10"
      >
        {children}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

---

### Resep 7: Staggered Fade-in pada Grid & Table Rows (Inflow Data)
Saat memuat daftar data besar (misal 10 kartu aset BMN, 10 baris surat tugas), setiap elemen muncul dengan keterlambatan bertahap (*stagger 0.03s*) agar transisi terlihat teratur.

```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
};

// Render:
<motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      <CardComponent data={item} />
    </motion.div>
  ))}
</motion.div>
```

---

## 3. Inventaris Menyeluruh Kebutuhan Animate UI per Modul BKSDA SuperApp

Berikut pemetaan lengkap 102 rute/halaman BKSDA SuperApp yang memerlukan penerapan Animate UI motion primitives, dikelompokkan berdasarkan modul, prioritas, dan pola yang direkomendasikan:

| No | Modul | Rute Halaman | Komponen yang Diberi Animasi | Resep Motion | Prioritas | Manfaat UX |
|:---|:---|:---|:---|:---:|:---:|:---|
| **1** | **Kepegawaian** | `/kepegawaian/employees/[id]` | Tab Navigasi, Kartu Metrik, Panel, Tombol Salin NIP/WA/Email/Bank | Resep 1, 2, 3, 4 | **P1 (Selesai)** | Navigasi cepat tanpa refresh kaku, tactile feedback instan saat menyalin nomor penting. |
| **2** | **Kepegawaian** | `/kepegawaian/employees` | Filter Pill Pegawai (Semua/PNS/PPPK/MMP), Baris Tabel Pegawai | Resep 1, 7 | **P1 (High)** | Pergantian filter kategori pegawai mulus dengan sliding pill. |
| **3** | **Kepegawaian** | `/kepegawaian/cuti` | Tab Status Pengajuan Cuti (Diajukan/Disetujui/Ditolak), Saldo Cuti Cards | Resep 1, 2, 3, 5 | **P1 (High)** | Menghindari kebingungan status approval cuti dengan live pulse badge. |
| **4** | **Kepegawaian** | `/kepegawaian/uang-makan` | Tab Rekonsiliasi vs Pembayaran, Kartu Akumulasi Bruto/Pph21/Netto | Resep 1, 2, 3 | **P1 (High)** | Ringkasan nominal uang makan terangkat jelas (*tactile elevation*) saat dipantau. |
| **5** | **Kepegawaian** | `/kepegawaian/surat-tugas/inbox` | Tab Approval ST (Menunggu Verifikasi, Disetujui, Riwayat Ditolak) | Resep 1, 3, 5 | **P1 (High)** | Pejabat penandatangan mudah membedakan surat masuk mendesak. |
| **6** | **Kepegawaian** | `/kepegawaian/surat-tugas/builder/[id]` | Multi-Step Wizard ST (Dasar Hukum, Personel, Lokasi, Pembiayaan DIPA) | Resep 1, 6 | **P1 (High)** | Indikator progres langkah dinamis meluncur (*sliding step*) saat beralih formulir. |
| **7** | **Persuratan** | `/surat/masuk` | Tab Kategori Surat Masuk (Biasa, Rahasia, Undangan), Modal Disposisi | Resep 1, 3, 6 | **P1 (High)** | Alur disposisi persuratan tata naskah dinas terstruktur dan fokus. |
| **8** | **Persuratan** | `/surat/keluar` | Tab Jenis Surat Keluar (Nota Dinas, Surat Tugas, Surat Edaran) | Resep 1, 3 | **P2 (Med)** | Navigasi arsip naskah dinas keluar lebih rapi. |
| **9** | **Persuratan** | `/surat/laporan` | Ringkasan Kartu Disposisi per Bidang, Chart Filter Range | Resep 2, 7 | **P2 (Med)** | Visualisasi rekapitulasi surat masuk/keluar tampil staggered elegan. |
| **10** | **Keuangan** | `/keuangan/spj` | Tab Status SPJ (Draft, Verifikasi PPK, Rampung), Kartu Alokasi Pagu | Resep 1, 2, 3, 5 | **P1 (High)** | Verifikator SPJ cepat mendeteksi berkas yang tertunda dengan pulse status. |
| **11** | **Keuangan** | `/keuangan/spj/[id]` | Tab Rincian Biaya (Riil, Lumsum, Bukti Kuitansi, Visum) | Resep 1, 3, 4 | **P1 (High)** | Salin nomor kuitansi & nomor rekening pelaksana perjalanan dinas 1-click tactile. |
| **12** | **BMN** | `/bmn/assets` | Filter Pill Kategori BMN (Tanah, Bangunan, Kendaraan, Peralatan), Kartu Aset Grid | Resep 1, 2, 7 | **P1 (High)** | Pencarian aset BMN di lapangan responsif dan visual kartu terangkat saat dipilih. |
| **13** | **BMN** | `/bmn/assets/[id]` | Tab Detail Aset (Spesifikasi, Riwayat Peminjaman, Jadwal Servis, QR Code) | Resep 1, 3, 4 | **P1 (High)** | Salin kode NUP dan nomor rangka BMN dengan micro-bounce feedback. |
| **14** | **BMN** | `/bmn/loans` | Tab Permohonan Pinjam Aktif vs Riwayat Pengembalian, Form Pinjam | Resep 1, 3, 6 | **P2 (Med)** | Alur permohonan pinjam kendaraan operasional lapangan lebih terpandu. |
| **15** | **BMN** | `/bmn/disposal` | Tab Usulan Penghapusan, Lelang KPKNL, Berita Acara Pemusnahan | Resep 1, 3, 5 | **P2 (Med)** | Tahapan lelang BMN transparan dengan status live indicator. |
| **16** | **Inventory** | `/inventory/items` | Tab Filter Golongan ATK, Kartu Ringkasan Stok Menipis (Alert) | Resep 1, 2, 5 | **P1 (High)** | Peringatan stok kritis berkedip halus (*pulse*) tanpa mengganggu fokus. |
| **17** | **Inventory** | `/inventory/stock-in` & `stock-out` | Form Mutasi Barang, Riwayat Masuk/Keluar | Resep 3, 6 | **P2 (Med)** | Transisi form penerimaan dan pengeluaran barang persediaan kantor. |
| **18** | **De-Reporting** | `/dereporting/forms` | Tab Formulir Aktif, Arsip, Tanggapan Mitra Masuk | Resep 1, 2, 3 | **P1 (High)** | Navigasi formulir pelaporan mandiri mitra PBPH/IUPHHK. |
| **19** | **De-Reporting** | `/dereporting/forms/[id]/builder` | Drag-and-drop & Step Form Builder (Field Inspector, Preview) | Resep 1, 6 | **P1 (High)** | Pengelola form dinamis melihat transisi preview form secara real-time. |
| **20** | **De-Reporting** | `/dereporting/pemegang-izin` | Tab Evaluasi RKU/RKT, Laporan Realisasi Penanaman | Resep 1, 3, 5 | **P2 (Med)** | Pantauan kepatuhan izin konservasi dengan status badge yang jelas. |
| **21** | **Portal & Publik** | `/portal` | Quick App Launcher Tiles (12 Aplikasi Terpadu) | Resep 2, 7 | **P1 (High)** | Ubin aplikasi terangkat (*tactile elevation*) dengan bayangan halus saat disentuh/di-hover. |
| **22** | **Portal & Publik** | `/(publik)/tsl` & `kawasan` | Galeri Flora/Fauna & Kawasan Konservasi Kalimantan Timur | Resep 2, 7 | **P1 (High)** | Tampilan edukasi publik modern sekelas standar kementerian nasional. |
| **23** | **Drive** | `/drive` | File Explorer (Breadcrumbs, List vs Grid view, Context Menu Drawer) | Resep 1, 6, 7 | **P2 (Med)** | Penjelajah berkas cloud BKSDA Drive terasa seringan native OS explorer. |
| **24** | **Layanan Publik** | `/lapor` | Form Pengaduan Publik Multi-Langkah (Identitas, Kronologi, Bukti Foto) | Resep 3, 6 | **P2 (Med)** | Form pengaduan masyarakat ramah seluler (*mobile-first*) dan tidak membingungkan. |

---

## 4. Panduan Pengujian & Kriteria Kelulusan (Quality Assurance)

Setiap halaman yang ditambahkan animasi Animate UI wajib mematuhi protokol verifikasi:

1. **Zero TypeScript Error (`npx tsc --noEmit`)**:
   - Komponen wajib terbebas dari kesalahan tipe `framer-motion` (hindari tipe `any`, gunakan antarmuka resmi).
2. **Playwright Invariant Check**:
   - Setiap halaman memiliki uji otomatis berbasis Chromium headless yang memverifikasi:
     - Atribut layout `layoutId` terpasang.
     - Tidak ada elemen yang terpotong secara visual (*overflow clipping*).
     - Durasi animasi tidak memblokir interaksi pengguna (`pointer-events` tetap aktif).
3. **Standar Efisiensi /ponytail**:
   - Dilarang membuat wrapper komponen yang berlebihan (*over-abstraction*).
   - Manfaatkan helper `CopyIcon` dan `motion.div` inline bila perubahan cukup dalam 1 baris.
   - Tetap pertahankan komentar `// ponytail:` bila ada simplifikasi terencana.

---
*Dokumen ini merupakan panduan resmi pengembangan antarmuka BKSDA SuperApp.*
