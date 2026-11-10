# Standar Panduan Warna & Desain Sistem BKSDA SuperApp
**Dokumen Acuan Resmi (Design System Reference)**  
*Status: Disahkan sebagai dokumen acuan (Belum diaplikasikan ke modul lain)*  
*Tanggal: 10 November 2026*

---

## 1. Filosofi & Prinsip Utama Desain

SuperApp BKSDA Kalimantan Timur menyatukan berbagai modul operasional (Kepegawaian, BMN, Keuangan, Persuratan, Surat Tugas, hingga Laporan Konservasi DeReporting). 

Agar pengguna tidak mengalami kelelahan mata (*color fatigue*) saat berpindah antar modul, desain mengadopsi prinsip:
> **"One Unified Canvas, One Distinct Signature Accent per Module"**  
> *(Satu Fondasi Netral yang Sama, Satu Warna Aksen Khas per Modul).*

### Rumus Proporsi Warna 60-30-10 (*Anti-Fatigue Guardrail*)
- **60% Netral Kanvas (*Dominant*)**: Latar belakang abu-abu sejuk (`#F8FAFC` / `slate-50`), permukaan kartu putih bersih (`#FFFFFF`), border abu-abu tenang (`#E2E8F0` / `border-slate-200/80`).
- **30% Tipografi & Struktur (*Structural*)**: Teks hitam/slate pekat (`#0F172A` / `text-slate-900`) untuk judul, abu-abu slate (`#64748B` / `text-slate-500`) untuk subteks dan garis pembagi (*divider*).
- **10% Warna Identitas Modul (*Accent*)**: HANYA boleh disuntikkan pada 4 titik spesifik:
  1. Kotak Ikon Header (*Icon Box*).
  2. Overline kategori modul di atas judul halaman (misal: `SDM & KEPEGAWAIAN`, `BARANG MILIK NEGARA`).
  3. Tombol Aksi Utama (*Primary CTA Button*, misal: *"Buat Surat Tugas"*, *"Peminjaman Aset"*).
  4. Indikator aktif pada tab atau navigasi (*Active Tab Indicator*).

---

## 2. Analisis Sains Kontras & Kalibrasi WCAG 2.1

Berdasarkan pengujian matematis standar aksesibilitas internasional (**WCAG 2.1 Contrast Ratio**), warna biru dan hijau memiliki perbedaan persepsi mata (*luminance*) yang signifikan:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Kontras terhadap Latar Putih (#FFFFFF):                                │
│                                                                        │
│  Blue 600    (#2563eb) : 5.17 : 1  ██████████  [PASS AA Normal Text]   │
│  Emerald 500 (#10b981) : 2.54 : 1  ████        [FAIL - Terlalu pudar]  │
│  Emerald 600 (#059669) : 3.77 : 1  ███████     [PASS Large Text only]  │
│  Emerald 700 (#047857) : 5.48 : 1  ██████████  [PASS AA Normal Text]   │
└────────────────────────────────────────────────────────────────────────┘
```

### Mengapa Kepegawaian (Biru) Lebih Kontras dari BMN (Emerald)?
- **Biru (`#2563eb`)** memiliki panjang gelombang lebih pendek dan *luminance* rendah (~0.15), sehingga teks biru di atas latar putih langsung menghasilkan kontras tinggi **5.17 : 1** (sangat tajam dan stabil di mata).
- **Emerald standar (`#10b981`)** memancarkan pendar (*perceived brightness*) yang sangat tinggi bagi mata manusia, sehingga jika diletakkan di atas putih, rasio kontrasnya anjlok ke **2.54 : 1** (pucat dan menyilaukan).
- **Solusi Kalibrasi:** Untuk modul BMN, warna primer dikunci pada level **Emerald 700 (`#047857`)**, yang menghasilkan rasio kontras **5.48 : 1**, sehingga memiliki ketegasan visual yang setara persis dengan Biru Kepegawaian.

---

## 3. Matriks Warna Identitas per Modul

Berikut adalah daftar palet warna resmi yang telah dikalibrasi untuk masing-masing modul di BKSDA SuperApp:

| Modul | Nama Bidang | Warna Primer (*Primary Accent*) | Nilai Hex | Warna Tint (*Badge/Box*) | Rasio Kontras (ke Putih) | Filosofi & Makna Desain |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **1. SDM & Kepegawaian** | Manajemen Personil | **Royal Blue** (`blue-600`) | `#2563eb` | `bg-blue-50` / `border-blue-200` | **5.17 : 1** (AA) | Otoritas birokrasi, ketertiban administrasi ASN, formal dan terpercaya. |
| **2. BMN & Inventaris** | Pengelolaan Aset Negara | **Forest Emerald** (`emerald-700`) | `#047857` | `bg-emerald-50` / `border-emerald-200` | **5.48 : 1** (AA) | Kelestarian alam BKSDA, aset fisik kawasan hutan, ketahanan fasilitas. |
| **3. Keuangan & DIPA** | Anggaran & Realisasi | **Deep Teal** (`teal-700`) | `#0f766e` | `bg-teal-50` / `border-teal-200` | **5.47 : 1** (AA) | Akuntansi, kestabilan finansial, pembeda jelas dari hijau BMN. |
| **4. Tata Persuratan** | Naskah Dinas & Disposisi | **Indigo** (`indigo-600`) | `#4f46e5` | `bg-indigo-50` / `border-indigo-200` | **6.29 : 1** (AA) | Dokumen resmi kedinasan, korespondensi legal, alur naskah terstruktur. |
| **5. Surat Tugas & SPPD** | Perjalanan Dinas Staf | **Sky Tech** (`sky-700`) | `#0369a1` | `bg-sky-50` / `border-sky-200` | **5.22 : 1** (AA) | Mobilitas staf di lapangan, pengawasan patroli kawasan, operasional dinas. |
| **6. DeReporting & Lapor** | Patroli Konservasi & Satwa | **Amber Earth** (`amber-700`) | `#b45309` | `bg-amber-50` / `border-amber-200` | **5.02 : 1** (AA) | Peringatan dini lapangan, keanekaragaman flora/fauna, penegakan hukum. |
| **7. Portal & CMS Publik** | Gerbang Eksternal | **Slate Navy** (`slate-900`) | `#0f172a` | `bg-slate-100` / `border-slate-200` | **16.1 : 1** (AAA) | Netral, elegan, representasi portal resmi pemerintah dengan aksen hijau balai. |

---

## 4. Warna Semantik Universal (Wajib Seragam di Seluruh Modul)

Warna semantik adalah warna yang melambangkan **status atau hasil kerja**, dan **TIDAK BOLEH** diubah berdasarkan warna modul agar pengguna tidak bingung:

| Status | Makna | Token Background | Token Teks & Border | Contoh Kasus |
| :--- | :--- | :--- | :--- | :--- |
| 🟢 **Aman / Sukses** | Lolos, Baik, Selesai, Disetujui | `bg-emerald-50 dark:bg-emerald-950/60` | `text-emerald-700 dark:text-emerald-300 border-emerald-200` | Aset kondisi baik, Cuti disetujui, STNK aman. |
| 🟡 **Peringatan / Pending** | Perlu perhatian, Menunggu proses | `bg-amber-50 dark:bg-amber-950/60` | `text-amber-700 dark:text-amber-300 border-amber-200` | Cuti pending, Pajak STNK hampir habis, Rusak ringan. |
| 🔴 **Bahaya / Kritis** | Rusak berat, Expired, Ditolak | `bg-rose-50 dark:bg-rose-950/60` | `text-rose-600 dark:text-rose-400 border-rose-200` | STNK expired, Aset rusak berat, Surat tugas ditolak. |
| ⚪ **Netral / Informasi** | Standby, Tidak ada aktivitas | `bg-slate-100 dark:bg-zinc-800` | `text-slate-600 dark:text-zinc-400 border-slate-200` | Log sistem, Keterangan non-kritis, Lokasi ruangan. |

---

## 5. Blueprint Kode Implementasi Header Modul

Setiap halaman modul wajib menggunakan struktur header kartu (*unified header bar*) yang konsisten:

```tsx
/* Blueprint Header Bar Modul */
<div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div className="flex items-start sm:items-center gap-3.5">
    {/* 1. Module Icon Box (10% Accent) */}
    <div className="w-10 h-10 rounded-xl bg-[ACCENT-TINT] text-[ACCENT-COLOR] border border-[ACCENT-BORDER] flex items-center justify-center shrink-0">
      <ModuleIcon className="w-5 h-5" />
    </div>

    {/* 2. Titles & Overline */}
    <div>
      <span className="text-[10px] font-bold uppercase tracking-widest text-[ACCENT-COLOR]">
        {MODULE_CATEGORY}
      </span>
      <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
        {MODULE_TITLE}
      </h1>
      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
        {MODULE_DESCRIPTION}
      </p>
    </div>
  </div>

  {/* 3. Action Buttons */}
  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
    {/* Secondary Action (Neutral Slate) */}
    <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors">
      <SecondaryIcon className="w-4 h-4 text-[ACCENT-COLOR]" />
      <span>{SECONDARY_LABEL}</span>
    </button>

    {/* Primary Action (Solid Module Accent) */}
    <button className="flex items-center gap-2 px-4 py-2.5 bg-[ACCENT-COLOR] hover:brightness-95 text-white font-bold text-xs rounded-xl transition-colors shadow-sm">
      <PrimaryIcon className="w-4 h-4" />
      <span>{PRIMARY_LABEL}</span>
    </button>
  </div>
</div>
```

---

## 6. Checklist Eksekusi di Masa Depan (Bila Hendak Diterapkan)

- [ ] Tidak mengubah kode sebelum ada instruksi spesifik per modul.
- [ ] Modul Kepegawaian tetap menggunakan `blue-600` / `blue-700`.
- [ ] Modul BMN tetap menggunakan `emerald-700` (`#047857`) untuk tombol dan teks primer.
- [ ] Modul Keuangan saat disentuh nanti akan diarahkan ke `teal-700`.
- [ ] Modul Tata Persuratan saat disentuh nanti akan diarahkan ke `indigo-600`.
- [ ] Hindari pewarnaan latar merah/kuning pada daftar item berulang; gunakan kontainer abu-abu netral (`bg-slate-50/80`) dengan status badge berwarna.
