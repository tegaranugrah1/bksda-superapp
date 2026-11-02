"use client";

import { useState } from "react";
import {
  UtensilsCrossed,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  RefreshCw,
  Search,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  History,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function UangMakanPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "matrix" | "nominatif" | "history">("upload");
  const [selectedMonth, setSelectedMonth] = useState("09");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [filterGroup, setFilterGroup] = useState<"all" | "pns" | "pppk" | "angkatan">("all");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Hitung &amp; Rekonsiliasi Uang Makan
              </h1>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                10/10 Precision Engine
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Otomasi komparasi presensi SIKADIR Kemenhut vs Surat Tugas resmi untuk mencegah temuan dobel bayar BPK/Itjen.
            </p>
          </div>
        </div>

        {/* Global Action / Month Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 focus:outline-hidden"
          >
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 focus:outline-hidden"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "upload"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Upload &amp; Rekonsiliasi
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "matrix"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Matriks Presensi (Sheet 1)
        </button>
        <button
          onClick={() => setActiveTab("nominatif")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "nominatif"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          Daftar Nominatif (Sheet 2)
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "history"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Batch
        </button>
      </div>

      {/* Tab 1: Upload & Reconciliation Area */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-3xl p-10 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col items-center justify-center text-center hover:border-blue-500/50 transition-colors">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tarik atau Pilih File Rekap Presensi SIKADIR Kemenhut
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mt-1">
              Mendukung multi-file HTML export (.xls), berkas Excel (.xlsx), atau arsip ZIP berisi seluruh presensi pegawai per bulan.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <label className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer">
                Pilih File Presensi
                <input type="file" multiple accept=".xls,.xlsx,.zip" className="hidden" />
              </label>
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
              >
                Muat File Contoh (syafey.xls)
              </button>
            </div>
          </div>

          {/* Rule Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cross-Check Surat Tugas</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Otomatis meng-override absensi Hadir (<span className="font-semibold text-blue-600">H</span>) menjadi Perjalanan Dinas (<span className="font-semibold text-amber-600">PD</span>) jika terdaftar di Surat Tugas terbit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Tarif SBM &amp; Pajak PPh 21</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Gol I/II &amp; PPPK: Rp35.000 (0%), Gol III: Rp37.000 (5%), Gol IV: Rp41.000 (15%) dihitung presisi netto.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Download className="w-4 h-4" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">2-Sheet Excel Generator</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Format keluaran Excel identik dengan berkas resmi BKSDA: Sheet Matriks Presensi + Sheet Daftar Nominatif bertandatangan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Matrix Preview */}
      {activeTab === "matrix" && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Matriks Presensi Periode September 2026
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Menampilkan status absensi harian per pegawai dengan kode warna dinas.
              </p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
              <Download className="w-4 h-4" />
              Download .xlsx (2 Sheets)
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full text-xs text-center border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300">
                <tr>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 w-10">NO</th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 text-left min-w-[200px]">NAMA / NIP</th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 min-w-[120px]">JABATAN</th>
                  {Array.from({ length: 30 }, (_, i) => (
                    <th key={i + 1} className="p-1 border border-slate-200 dark:border-zinc-700 w-8">
                      {i + 1}
                    </th>
                  ))}
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold">H</th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold">PD</th>
                  <th className="p-2 border border-slate-200 dark:border-zinc-700 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold">CT/TK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <td className="p-2 border border-slate-200 dark:border-zinc-800 font-semibold">1</td>
                  <td className="p-2 border border-slate-200 dark:border-zinc-800 text-left">
                    <div className="font-bold text-slate-900 dark:text-white">Achmad Syafey N</div>
                    <div className="text-[10px] text-slate-400 font-mono">200009222024211004</div>
                  </td>
                  <td className="p-2 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 text-left">
                    Polhut Ahli Pertama
                  </td>
                  {Array.from({ length: 30 }, (_, i) => {
                    const day = i + 1;
                    const isWeekend = [5, 6, 12, 13, 19, 20, 26, 27].includes(day);
                    const isST = day === 28; // Rekonsiliasi kasus Syafey 28/09
                    if (isWeekend) {
                      return (
                        <td key={day} className="p-1 border border-slate-200 dark:border-zinc-800 bg-slate-200/60 dark:bg-zinc-800/60 text-slate-400 text-[10px]">
                          -
                        </td>
                      );
                    }
                    if (isST) {
                      return (
                        <td key={day} className="p-1 border border-slate-200 dark:border-zinc-800 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold" title="Override dari Hadir -> Dinas Luar berdasarkan Surat Tugas">
                          PD*
                        </td>
                      );
                    }
                    return (
                      <td key={day} className="p-1 border border-slate-200 dark:border-zinc-800 text-emerald-700 dark:text-emerald-400 font-semibold">
                        H
                      </td>
                    );
                  })}
                  <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-emerald-600">21</td>
                  <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-amber-600">1</td>
                  <td className="p-2 border border-slate-200 dark:border-zinc-800 font-bold text-slate-400">0</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Catatan: Tanda bintang (<span className="font-bold">PD*</span>) menandakan tanggal tersebut diubah otomatis dari <b>H</b> (SIKADIR) menjadi <b>PD</b> karena pegawai memiliki Surat Tugas terbit.
            </span>
          </div>
        </div>
      )}

      {/* Tab 3: Daftar Nominatif */}
      {activeTab === "nominatif" && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daftar Nominatif Pembayaran Uang Makan Pegawai
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Perhitungan total hak uang makan berdasarkan tarif SBM per golongan dan potongan PPh 21.
              </p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
              <Download className="w-4 h-4" />
              Export Nominatif Excel
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-zinc-800">
            <table className="w-full text-xs border-collapse">
              <thead className="bg-slate-100 dark:bg-zinc-800 font-bold text-slate-700 dark:text-zinc-300 text-center">
                <tr>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700 w-10">NO</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700 text-left">NAMA / NIP</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700">GOLONGAN</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700">JML HARI</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700 text-right">TARIF</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700 text-right">KOTOR (BRUTO)</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700">PPH 21</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700 text-right">POTONGAN</th>
                  <th className="p-2.5 border border-slate-200 dark:border-zinc-700 text-right font-bold text-emerald-700 dark:text-emerald-400">JUMLAH DITERIMA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                <tr className="hover:bg-slate-50 dark:hover:bg-zinc-800/50">
                  <td className="p-2.5 text-center font-semibold border border-slate-200 dark:border-zinc-800">1</td>
                  <td className="p-2.5 border border-slate-200 dark:border-zinc-800">
                    <div className="font-bold text-slate-900 dark:text-white">Achmad Syafey N</div>
                    <div className="text-[10px] text-slate-400 font-mono">200009222024211004</div>
                  </td>
                  <td className="p-2.5 text-center border border-slate-200 dark:border-zinc-800">PPPK Gol V</td>
                  <td className="p-2.5 text-center font-bold border border-slate-200 dark:border-zinc-800">21 Hari</td>
                  <td className="p-2.5 text-right font-mono border border-slate-200 dark:border-zinc-800">Rp 35.000</td>
                  <td className="p-2.5 text-right font-mono font-semibold border border-slate-200 dark:border-zinc-800">Rp 735.000</td>
                  <td className="p-2.5 text-center border border-slate-200 dark:border-zinc-800">0%</td>
                  <td className="p-2.5 text-right font-mono border border-slate-200 dark:border-zinc-800">Rp 0</td>
                  <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-zinc-800">Rp 735.000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: History Area */}
      {activeTab === "history" && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Riwayat Perhitungan Uang Makan Tersimpan
            </h3>
          </div>
          <div className="p-8 text-center text-slate-400 text-xs">
            Belum ada batch yang disimpan secara permanen ke database. Silakan unggah presensi di tab Upload &amp; Rekonsiliasi.
          </div>
        </div>
      )}
    </div>
  );
}
