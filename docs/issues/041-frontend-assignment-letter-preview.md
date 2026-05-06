# Issue #041 — Frontend — Assignment Letter Preview & Print Component

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-surattugas`, `print`
> **Priority**: 🔴 Critical (Fungsi inti administratif untuk menghasilkan fisik surat)
> **Complexity**: 🟡 Medium (Pengaturan CSS Print Media, Layout A4, dan Integrasi Barcode/QR)
> **Recommended AI Model**: Claude Sonnet / Gemini 2.5 Pro / GPT-4o
> **Dependencies**: Issue #040

---

## Branch

```
issue/041-frontend-assignment-letter-preview
```

## Deskripsi

Setelah sistem mampu merekam pengajuan ke *database* dan menyediakan portal verifikasi publik (Issue 040), tujuan utama akhir dari sebuah dokumen digital instansi pemerintah adalah... **Dicetak ke Kertas Fisik (A4)** untuk dibawa oleh pegawai ke lapangan.

Pada spesifikasi ini, kita akan membuat komponen *Modal/Pop-up* bernama `AssignmentLetterPreview`.
Komponen ini sangat unik karena:
1. **Berwujud Fisik Digital**: Ia didesain tidak menggunakan warna *Dark Mode* atau *Glassmorphism* pada area kertasnya. Ia didesain mutlak berlatar Putih, berukuran presisi Lebar `210mm` dan Tinggi `297mm` (Kertas A4 standar ISO), serta menggunakan *font Serif* layaknya dokumen resmi ketikan Microsoft Word.
2. **KOP Surat Pemerintah**: Memiliki garis batas tebal, menyematkan dua logo instansi (BKSDA & Kemenhut) di ujung kiri-kanan, dan teks kementerian berhuruf kapital.
3. **Pembangkit Kode QR (The QR Generator)**: Komponen ini akan secara otomatis membuat dan menempelkan *QR Code* di sudut kiri bawah kertas. QR ini mengarah mutlak ke URL Publik Pengecekan Dokumen yang kita buat di Issue #040. Jika Surat belum di-*Approve* (masih Draf), QR Code tidak akan muncul dan diganti dengan tulisan *Watermark DRAFT*.
4. **CSS Print Engineering**: Dilengkapi peretasan kelas Tailwind (`print:hidden`, `print:block`) agar ketika pengguna menekan tombol `CTRL + P` atau ikon Cetak, yang masuk ke dalam mesin *Printer* HANYA murni ukuran kertas putihnya saja. Seluruh tombol *website* atau warna abu-abu *background* akan lenyap secara magis.

---

## Acceptance Criteria

- [ ] File komponen terisolasi dibuat di dalam direktori `src/app/(dashboard)/surat-tugas/_components/AssignmentLetterPreview.tsx`.
- [ ] *Library* pembuat Barcode (`npm install react-qr-code`) telah di-*install* pada mesin Frontend.
- [ ] Layar memuat bingkai ukuran kertas `w-[210mm] min-h-[297mm]` menggunakan pias (*padding*) dokumen yang standar.
- [ ] Data nama pegawai dirender menggunakan iterasi `.map()` ke dalam bentuk format Tabel berurut.
- [ ] Tersedia sebuah *Top Bar* hitam (*Toolbar*) yang melayang di atas kertas dengan 2 tombol: "Cetak (A4)" dan "Tutup".
- [ ] Fungsi cetak langsung memicu *Trigger* perintah bawaan peramban `window.print()`.

---

## Langkah Demi Langkah

### Langkah 1: Pasang Mesin Pembuat Kode QR

Kita membutuhkan asisten alat bantu yang teruji dan ringan untuk melukis QR Code ke dalam *Canvas* React.

1. Buka *Terminal / Git Bash*.
2. Arahkan mutlak ke folder Frontend: `cd e:\bksda-superapp\frontend`
3. Jalankan perintah instalasi:
```bash
npm install react-qr-code
```

### Langkah 2: Buat Direktori Sub-Komponen

Karena komponen ini eksklusif hanya untuk ranah Modul Surat Tugas (bukan komponen umum aplikasi), kita letakkan ia di dalam kurungan *folder* lokasinya sendiri.

```bash
mkdir -p src/app/\(dashboard\)/surat-tugas/_components
```

### Langkah 3: Pahatkan Skrip Pencetak Dokumen (The Renderer)

**Path:** `e:\bksda-superapp\frontend\src\app\(dashboard)\surat-tugas\_components\AssignmentLetterPreview.tsx`

**Salin seluruh kode *Engineering* CSS & UI A4 ini ke dalam *file* tersebut secara presisi:**

```tsx
"use client";

import { useRef } from "react";
import { Printer, X } from "lucide-react";
import QRCode from "react-qr-code"; 

interface PreviewProps {
  data: any; // Menerima pasokan data ST lengkap dari API
  onClose: () => void;
}

export default function AssignmentLetterPreview({ data, onClose }: PreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Membangkitkan Jendela Print Bawaan OS / Chrome
    window.print();
  };

  // 🌍 MENGHUBUNGKAN DENGAN ISSUE 040 (Verifikasi Publik)
  const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verifikasi/surat-tugas/${data.id}`;

  return (
    // LAYER MODAL (Z-Index 100 agar menimpa Sidebar). 
    // PERHATIKAN `print:static print:block` sangat vital agar Printer mau mencetak seluruh tinggi kertas!
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-zinc-900/90 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:block print:w-auto print:h-auto">
      
      {/* ---------------------------------------------------- */}
      {/* TOOLBAR KONTROL ATAS (Disembunyikan Mutlak saat di-Print) */}
      {/* ---------------------------------------------------- */}
      <div className="sticky top-0 w-full z-10 flex items-center justify-between px-6 py-4 bg-zinc-900/95 border-b border-zinc-800 shadow-2xl print:hidden backdrop-blur-md">
         <div className="text-white font-medium flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
             <span className="text-sm text-zinc-400 uppercase tracking-widest font-bold">Mode Pratinjau Surat :</span>
             <span className="text-emerald-400 font-mono text-sm">{data.nomor_surat || 'DALAM PENGAJUAN (DRAFT)'}</span>
         </div>
         <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20"
            >
                <Printer className="w-4 h-4" /> <span className="hidden md:inline">Cetak (A4)</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"
              title="Tutup Pratinjau"
            >
                <X className="w-5 h-5" />
            </button>
         </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* KANVAS KERTAS (Hanya bagian ini yang masuk ke Printer) */}
      {/* ---------------------------------------------------- */}
      <div className="py-10 print:py-0 w-full flex justify-center">
         <div 
            ref={printRef}
            // Lebar A4 (210mm), Tinggi A4 (297mm), Font berjenis Times New Roman / Serif
            className="w-[210mm] min-h-[297mm] bg-white p-[25mm] shadow-2xl shadow-black/50 print:shadow-none print:m-0 print:p-[15mm] text-black font-serif relative"
         >
            
            {/* --- 1. KOP SURAT PEMERINTAH --- */}
            <div className="flex items-center justify-between border-b-[4px] border-double border-black pb-4 mb-1">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src="/assets/kemenhut.png" alt="Kemenhut" className="w-[85px] object-contain" />
               
               <div className="text-center flex-1 px-4 tracking-tight">
                  <h1 className="text-base font-bold uppercase tracking-wider">Kementerian Lingkungan Hidup dan Kehutanan</h1>
                  <h2 className="text-sm font-bold uppercase tracking-wider">Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem</h2>
                  <h3 className="text-lg font-black uppercase mt-1">Balai Konservasi Sumber Daya Alam</h3>
                  <p className="text-[11px] mt-1.5 font-sans">Jalan Contoh Birokrasi No. 123, Pusat Pemerintahan. Telp: (0123) 456789</p>
                  <p className="text-[11px] font-sans">Website: www.bksda.go.id | Email: info@bksda.go.id</p>
               </div>

               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src="/assets/logo_bksda.png" alt="BKSDA" className="w-[85px] object-contain" />
            </div>
            {/* Garis Penutup KOP */}
            <div className="border-b-2 border-black mb-8"></div>

            {/* --- 2. JUDUL DOKUMEN --- */}
            <div className="text-center mb-10">
               <h4 className="text-xl font-bold underline underline-offset-[6px] decoration-[1.5px] mb-2 tracking-widest">SURAT TUGAS</h4>
               <p className="text-[15px]">Nomor: {data.nomor_surat || 'SK. ......................../BKSDA/2026'}</p>
            </div>

            {/* --- 3. KONTEN INTI (Menimbang, Menugaskan, Untuk) --- */}
            <div className="space-y-6 text-[15px] leading-relaxed text-justify">
               
               <div className="flex items-start gap-4">
                   <div className="w-[120px] font-bold tracking-widest">Dasar</div>
                   <div className="w-4 font-bold">:</div>
                   <div className="flex-1 whitespace-pre-wrap">{data.dasar_hukum || 'Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya.'}</div>
               </div>

               <div className="text-center font-bold tracking-[0.3em] mt-10 mb-6">M E M E R I N T A H K A N :</div>

               <div className="flex items-start gap-4">
                   <div className="w-[120px] font-bold tracking-widest">Kepada</div>
                   <div className="w-4 font-bold">:</div>
                   <div className="flex-1">
                       <table className="w-full text-[15px]">
                           <tbody>
                               {data.employees?.map((emp: any, index: number) => (
                                   <tr key={emp.id}>
                                       <td className="w-8 align-top py-1">{index + 1}.</td>
                                       <td className="w-[100px] align-top py-1">Nama<br/>NIP<br/>Peran</td>
                                       <td className="align-top font-bold uppercase py-1">
                                          : {emp.nama_lengkap} <br/>
                                          <span className="font-normal normal-case">: {emp.nip}</span> <br/>
                                          <span className="font-normal normal-case">: {emp.pivot?.peran || 'Anggota Tim'}</span>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>

               <div className="flex items-start gap-4 mt-6">
                   <div className="w-[120px] font-bold tracking-widest">Untuk</div>
                   <div className="w-4 font-bold">:</div>
                   <div className="flex-1 whitespace-pre-wrap">{data.maksud_tujuan}</div>
               </div>

               <div className="flex items-start gap-4 mt-2">
                   <div className="w-[120px] font-bold tracking-widest">Waktu</div>
                   <div className="w-4 font-bold">:</div>
                   <div className="flex-1">{data.tanggal_mulai} <span className="mx-2 font-bold">s/d</span> {data.tanggal_selesai}</div>
               </div>
               
               <div className="flex items-start gap-4 mt-2">
                   <div className="w-[120px] font-bold tracking-widest">Tempat</div>
                   <div className="w-4 font-bold">:</div>
                   <div className="flex-1 font-bold">{data.tempat_tujuan}</div>
               </div>
            </div>

            {/* --- 4. AREA TANDA TANGAN & BARCODE VERIFIKASI --- */}
            <div className="mt-20 flex justify-between items-end">
                
                {/* Posisi Kiri: Cap/QR Code (Security Feature) */}
                <div className="text-center">
                    <div className="p-3 border-4 border-double border-zinc-300 inline-block bg-white relative">
                        {data.status === 'approved' || data.status === 'completed' ? (
                            <QRCode value={verifyUrl} size={90} level="M" />
                        ) : (
                            <div className="w-[90px] h-[90px] flex items-center justify-center bg-zinc-100 text-[10px] text-zinc-400 font-bold border border-dashed border-zinc-300 text-center leading-tight">
                                BELUM<br/>DISETUJUI
                            </div>
                        )}
                    </div>
                    <p className="text-[10px] mt-2 font-sans text-zinc-600 font-medium">Dokumen Terverifikasi Elektronik</p>
                </div>

                {/* Posisi Kanan: Area TTD Pejabat */}
                <div className="w-[300px] text-center text-[15px]">
                    <p className="mb-0.5 text-left ml-6">Dikeluarkan di <span className="ml-2">: Ibu Kota Pemerintahan</span></p>
                    <p className="mb-14 text-left ml-6">Pada Tanggal <span className="ml-3">: {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</span></p>
                    
                    <p className="font-bold underline uppercase underline-offset-4">{data.approver?.name || 'KEPALA BALAI BKSDA'}</p>
                    <p className="mt-1">NIP. ........................................</p>
                </div>
            </div>

         </div>
      </div>
      
      {/* ---------------------------------------------------- */}
      {/* CSS MAGIC: Menghapus semua UI website saat ditekan Print */}
      {/* ---------------------------------------------------- */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            body * { visibility: hidden; }
            .print\\:block, .print\\:block * { visibility: visible; }
            .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
            /* Menyembunyikan URL & Header yang biasa tercetak di Chrome */
            @page { size: A4 portrait; margin: 5mm; } 
        }
      `}} />
    </div>
  );
}
```

---

## Troubleshooting

### Q: Tombol Print ditekan tapi layar mencetak Hitam / Latar Hitam.

**Artinya:** Pengaturan peramban (*Browser*) milikmu memaksakan *Background Graphics* dicetak.
**Solusi:** Kodingan peretasan `print:bg-white` pada Container utama seharusnya menangkal ini. Pastikan tidak ada *Plugin Dark Mode* aktif (seperti Dark Reader) saat menekan cetak. Jika jendela Chrome muncul, perhatikan opsi *"Background graphics"*, matikan centangnya.

### Q: Kenapa Kertasnya terlihat mengecil (*Shrink*) di menu Print?

**Artinya:** Margin Printer bentrok dengan margin CSS (`p-[25mm]`).
**Solusi:** Di menu Printer Chrome/Edge, atur "Margins" menjadi **None** atau **Custom (0)**. Hal ini akan membiarkan CSS Padding kita yang berukuran presisi 2,5 CM mengambil kendali mutlak tata letak surat.

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(surat-tugas): dynamic a4 letter generator with print media css" \
  --body "Pembuatan komponen renderer Surat Kertas A4 digital berfasilitas QR Barcode otomatis. Melibatkan rekayasa kelas Tailwind untuk print environment. Detail di docs/issues/041-frontend-assignment-letter-preview.md" \
  --label "frontend,ui,module-surattugas,print"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/041-frontend-assignment-letter-preview
```

### Step 3: Kerjakan

1. Jangan lupa menjalankan `npm install react-qr-code`.
2. Salin *Template* Kertas A4 tersebut ke file letak direktori yang tepat.
3. Pastikan gambar `logo_bksda.png` dan `kemenhut.png` benar-benar ada di dalam folder `frontend/public/assets/`. (Peringatan: Kalau belum ada silakan carikan *dummy* logo gambar sementara agar tidak kotak *broken* putih).

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(surat-tugas): dynamic a4 letter generator with print media css (#41)"
git push -u origin issue/041-frontend-assignment-letter-preview
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(surat-tugas): dynamic a4 letter generator with print media css (#41)" \
  --body "## Summary
Penerjemahan baris kode JSON database ke wujud representasi *Word Document* (A4).

## Changes
- Pembuatan kanvas proporsional \`w-[210mm]\` dan \`min-h-[297mm]\`.
- Integrasi dinamis \`QRCode\` komponen menyambung \`/verifikasi\` (Issue 040).
- Penyuntikkan Global CSS rekayasa persembunyian DOM (\`@media print\`).

## Verification
- [x] Lolos rendering QR tanpa putus/patah.
- [x] Tombol dan Latar Hitam (Glassmorphism) lenyap 100% ketika pratinjau tekan tombol *Cetak*.

Closes #41" \
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
Kita memerlukan kanvas pembentuk Kertas Cetak A4 resmi negara. Ini tidak boleh berhias kelap-kelip web, melainkan murni desain layout *Word Document* berwarna hitam putih dengan fitur tempel Barcode.

## Task

Kerjakan Issue #041 (Frontend — Assignment Letter Preview Component).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/041-frontend-assignment-letter-preview.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Wajib instal pustaka pihak ketiga: `npm install react-qr-code`.
3. Buat file penyimpan direktori komponen `src/app/(dashboard)/surat-tugas/_components/AssignmentLetterPreview.tsx`.
4. Salin ribuan baris kode tata letak KOP Pemerintah Pusat beserta taktik CSS `@media print` nya.
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
