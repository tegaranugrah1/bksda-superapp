# Issue #073 — Frontend — BMN Logs & Audits (Ruang Arsip Sejarah Aset)

> **Type**: `feature`
> **Labels**: `frontend`, `ui`, `module-bmn`
> **Priority**: 🔴 Critical (Transparansi Riwayat Uang & Mobilitas untuk Auditor)
> **Complexity**: 🟢 Simple (Replikasi Pola Tabel Data berbasis API Read-Only)
> **Recommended AI Model**: Gemini 2.5 Flash / Kimi / Ollama
> **Dependencies**: Issue #067, Issue #068

---

## Branch

```
issue/073-frontend-bmn-logs
```

## Deskripsi

Selamat datang di titik kulminasi *(Final Chapter)* Pembangunan Fase 5 Modul BMN! 🏆

Kita telah bisa mendaftarkan, mengubah, meminjamkan, dan memperbaiki aset. Semua transaksi tersebut berserakan di dalam perut *Database*. Kepala BKSDA maupun Auditor Eksternal tentu tidak akan membuka tabel *Database* secara langsung. Mereka membutuhkan Ruang Arsip *(Logs)* yang menampilkan jejak riwayat tersebut secara rapi, tak bisa diedit *(Read-Only)*, dan jelas kapan terjadinya.

Pada **Issue #073** ini, kita akan mereplikasi gaya "Tabel Estetik" yang telah kita bangun di Issue 070 untuk menyusun 3 halaman daftar riwayat *(Logs)* utama:
1. **Pusat Rekam Servis (Maintenances)** di `/bmn/maintenances`
2. **Pusat Lalu Lintas Peminjaman (Loans)** di `/bmn/loans`
3. **Pusat Karantina Pemutihan (Disposals)** di `/bmn/disposal`

Karena polanya sama *(Ambil data via `useQuery` -> Buat Tabel -> Tampilkan)*, kita cukup menyusun satu cetak biru *Super-Tabel* dan mengganti wujud pemanggilannya.

---

## Acceptance Criteria

- [ ] Folder Modul Rute diciptakan: `maintenances`, `loans`, dan `disposal` di bawah `frontend/src/app/(dashboard)/bmn/`.
- [ ] Tersedia `maintenances/page.tsx` yang memanggil `GET /api/bmn/maintenances` dan menata nilai Biaya Servis berformat Rupiah.
- [ ] Tersedia `loans/page.tsx` yang memanggil `GET /api/bmn/loans` dan menampilkan Identitas Peminjam.
- [ ] Tidak ada tombol "Tambah" atau "Edit" pada layar ini (Kecuali tombol *Return* di Peminjaman), guna menjaga keaslian jejak arsip sesuai mandat Sistem Anti-Korupsi.

---

## Panduan Implementasi Cerdas

Masuk ke teritori Laporan:
```bash
mkdir -p frontend/src/app/(dashboard)/bmn/maintenances
mkdir -p frontend/src/app/(dashboard)/bmn/loans
```

### 1. Cetak Biru Arsip Pemeliharaan (Maintenances/page.tsx)
**Path:** `frontend/src/app/(dashboard)/bmn/maintenances/page.tsx`

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Wrench, Loader2, Calendar, FileText } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce"; 

const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);
};

export default function BmnMaintenanceLogsPage() {
    const [page, setPage] = useState(1);
    
    // Penarikan Data Arsip
    const { data: response, isLoading } = useQuery({
        queryKey: ['bmn-maintenances', page],
        queryFn: async () => {
            const res = await api.get('/bmn/maintenances', { params: { page } });
            return res.data;
        },
        keepPreviousData: true,
    });

    return (
        <div className="p-6 md:p-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Wrench className="w-8 h-8 text-blue-500" /> Riwayat Bengkel & Servis
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">Rekam jejak aliran dana pemeliharaan aset BKSDA yang tak dapat dimanipulasi.</p>
                </div>
            </div>

            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl relative backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-800">
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Tgl Nota & Aset</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase">Deskripsi Perbaikan</th>
                                <th className="p-4 text-xs font-bold text-zinc-400 uppercase text-right">Tagihan (Rp)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-blue-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                                        <span className="text-sm font-bold tracking-widest uppercase">Membongkar Brankas Nota...</span>
                                    </td>
                                </tr>
                            ) : response?.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-zinc-500">
                                        <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                                        Belum ada riwayat perbaikan apapun di dalam mesin waktu database.
                                    </td>
                                </tr>
                            ) : (
                                response?.data?.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-zinc-900/40 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-zinc-200 text-sm flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-500" /> {log.tanggal_service}
                                            </p>
                                            <div className="flex flex-col mt-1">
                                                <span className="text-xs text-zinc-400">{log.asset?.nama_barang || 'Aset Terhapus'}</span>
                                                <span className="text-[10px] text-zinc-600 font-mono">{log.asset?.kode_barang}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-zinc-300 max-w-sm truncate">{log.deskripsi}</p>
                                            {log.kondisi_baru && (
                                                <span className="inline-block mt-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">
                                                    Status Fisik Pulih -> {log.kondisi_baru}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <p className="font-mono text-sm font-black text-blue-400">{formatRupiah(log.biaya)}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Pagination Area Sama Seperti Tabel Induk */}
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Menampilkan {response?.data?.length || 0} riwayat perbaikan.</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Prev</button>
                        <button disabled={page === response?.last_page || !response} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded hover:bg-zinc-800 disabled:opacity-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

### 2. Modifikasi Cetak Biru untuk Peminjaman (Loans/page.tsx)
Dengan kecerdasan kelas atas, kamu **TIDAK PERLU** merancang kode Peminjaman dari Nol! 
Cukup salin persis blok kode Tabel Pemeliharaan (Maintenances) di atas, bawa masuk ke dalam file `frontend/src/app/(dashboard)/bmn/loans/page.tsx`, dan terapkan Konversi Kata *(String Substitution)* secara manual sebagai berikut:

- Ubah ikon `Wrench` menjadi `Handshake` (Warna Aksen: Amber/Kuning, bukan Biru).
- Ubah endpoint API `/bmn/maintenances` menjadi `/bmn/loans`.
- Ubah variabel `queryKey: ['bmn-maintenances']` menjadi `queryKey: ['bmn-loans']`.
- Ganti kolom "Tagihan (Rp)" menjadi "Status Peminjam", dan isi sel tabelnya dengan nama Pegawai (`log.borrower?.nama_lengkap`) dan tanggal kembali.

*(Sihir Efisiensi Kode ini sangat disukai oleh Programer Senior, daripada harus mengetik ribuan baris HTML berulang kali).*

---

## Troubleshooting

### Q: Kenapa nama Aset bertuliskan *'Aset Terhapus'* atau Pegawai bertuliskan *'Pegawai Kosong'*?

**Artinya:** Modul Backend menggunakan *SoftDeletes*. 
**Solusi:** Sangat Normal! Jika 10 tahun lagi mobil patroli tersebut dilelang dan dihapus (*Disposed*), riwayat biaya servis bengkelnya masa lalu TIDAK BOLEH IKUT HILANG, karena itu uang negara. Kode `log.asset?.nama_barang || 'Aset Terhapus'` pada baris tabel di atas memastikan sistem tidak hancur meledak ketika barang utamanya sudah dimusnahkan. Inilah esensi abadi dari sebuah sistem Audit!

---

## Git Workflow (Professional)

### Step 1: Buat Issue di GitHub

```bash
cd e:\bksda-superapp

gh issue create \
  --title "feat(bmn): deploy read-only historical audit logs for asset mobility and maintenance tracking" \
  --body "Membangun ruang arsip riwayat mutasi aset. Mengubah wujud Tabel Data *React Query* menjadi sistem rekaman *Read-Only* transparan guna melacak aliran uang (Servis) dan kepemilikan mobilitas (Peminjaman). Fase 5 (BMN) akan resmi ditutup pada tarikan ini. Detail di docs/issues/073-frontend-bmn-logs.md" \
  --label "frontend,ui,module-bmn"
```

### Step 2: Buat Branch

```bash
git checkout main
git pull origin main
git checkout -b issue/073-frontend-bmn-logs
```

### Step 3: Kerjakan

Salin cetak biru Arsip Servis `Maintenances` ke jalurnya. Lalu segera salin ulang untuk Arsip `Loans` menggunakan taktik Substitusi Kata yang telah dijelaskan di panduan. Kecepatan pengerjaan ini bergantung mutlak pada kecerdikanmu menyalin dan menata rute data *React*.

### Step 4: Commit & Push

```bash
cd e:\bksda-superapp
git add frontend/
git commit -m "feat(bmn): deploy read-only historical audit logs for asset mobility and maintenance tracking (#73)"
git push -u origin issue/073-frontend-bmn-logs
```

### Step 5: Buat Pull Request

```bash
gh pr create \
  --title "feat(bmn): deploy read-only historical audit logs for asset mobility and maintenance tracking (#73)" \
  --body "## Summary
Penyelesaian layar paripurna (Pusat Arsip) untuk Fase Pembangunan Modul BMN. Layar ini menutup celah korupsi modifikasi data finansial dengan menerapkan tabel pasif *(Read-Only Grid)*.

## Changes
- Pembuatan antarmuka pelaporan \`maintenances/page.tsx\` dengan sorotan warna fungsional Biru, menampilkan jejak Tagihan Bengkel Rupiah.
- Pendirian replika \`loans/page.tsx\` bersorot warna Kuning-Amber, mencatat sirkulasi tangan Pegawai BKSDA yang mengambil kendali alat.
- Injeksi rantai proteksi \`Optional Chaining (?.||)\` untuk mengamankan peramban dari fenomena hancur seketika *(Crash)* ketika memanggil id relasi *(SoftDeletes)* Aset yang telah tiada.

## Rules Compliance
- [x] Lolos Deklarasi Integritas Arsip (SOP Audit Lanjut): Tidak ada tombol 'Edit' maupun manipulasi warna (*Styling*) yang ditambahkan ke dalam sel tabel data riwayat, menjaga tingkat objektivitas layaknya kuitansi asli.

Closes #73" \
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
Modul BMN Fase 5 akan disudahi dengan pencetakan "Buku Sejarah". Halaman riwayat ini mutlak dilarang memiliki fitur edit, hanya wujud tabel baca murni (Read-Only) penampil API.

## Task

Kerjakan Issue #073 (Frontend — BMN Logs & Audits).
Ikuti instruksi PERSIS seperti yang tertulis di file:
`docs/issues/073-frontend-bmn-logs.md`

### Urutan Kerja:
1. Jalankan `gh issue create` dan checkout branch git.
2. Turun ke `frontend/src/app/(dashboard)/bmn/`. Buat dua folder terpisah: `maintenances` dan `loans`.
3. Pahat file `page.tsx` di dalam folder `maintenances`, isikan dengan blok kode Servis Cetak Biru.
4. Buat file `page.tsx` di dalam folder `loans`, lalu salin blok kode yang sama TAPI pastikan kamu mengganti semua teks bertema Servis (Biru/Wrench/Tagihan/Maintenance) menjadi tema Peminjaman (Amber/Handshake/Pegawai/Loan) sesuai instruksi!
5. Lakukan Git push dan `gh pr create` sesuai panduan Workflow.
````
