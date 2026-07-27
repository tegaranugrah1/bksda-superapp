"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Plus, Search, FileText, Calendar, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SuratKeluar } from "../_lib/surat-types";

const MOCK_SURAT_KELUAR: SuratKeluar[] = [
  {
    id: 1,
    no_surat: "S.450/KSDAE/TU/KAP.06.01/B/07/2026",
    kode_klasifikasi: "KAP.06.01",
    tanggal_surat: "2026-07-22",
    tujuan_surat: "Kepala Balai Besar KSDA Jawa Timur",
    perihal: "Permohonan Koordinasi Data Inventarisasi Satwa Liar",
    sifat: "Biasa",
    lampiran: "1 Berkas",
  },
  {
    id: 2,
    no_surat: "ND.102/K.18/TU/KAP.05.01/B/07/2026",
    kode_klasifikasi: "KAP.05.01",
    tanggal_surat: "2026-07-21",
    tujuan_surat: "Direktur Jenderal KSDAE Jakarta",
    perihal: "Permohonan Persetujuan Penjualan BMN Rusak Berat",
    sifat: "Penting",
    lampiran: "1 (Satu) Berkas",
  },
];

export default function SuratKeluarListPage() {
  const [search, setSearch] = useState("");
  const [suratList] = useState<SuratKeluar[]>(MOCK_SURAT_KELUAR);

  const filtered = suratList.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.no_surat.toLowerCase().includes(q) ||
      s.tujuan_surat.toLowerCase().includes(q) ||
      s.perihal.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Send className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Daftar Surat Keluar
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Penatausahaan dan pengagendaan nomor Surat Keluar resmi BKSDA Kaltim.
          </p>
        </div>

        <Link href="/surat/keluar/create">
          <Button className="h-9 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-600/20">
            <Plus className="mr-1.5 h-4 w-4" />
            Input Surat Keluar Baru
          </Button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no surat, tujuan, perihal..."
            className="pl-9 h-9 text-xs border-zinc-200 focus-visible:ring-blue-500"
          />
        </div>

        <div className="text-xs font-semibold text-zinc-500">
          Menampilkan <span className="text-zinc-900 font-bold dark:text-zinc-50">{filtered.length}</span> Surat Keluar
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Nomor Surat</th>
                <th className="p-3.5">Tanggal Surat</th>
                <th className="p-3.5">Tujuan Surat</th>
                <th className="p-3.5">Perihal</th>
                <th className="p-3.5">Sifat & Lampiran</th>
                <th className="p-3.5 text-right">Penandatangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="p-3.5 font-bold text-blue-600">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span>{item.no_surat}</span>
                    </div>
                  </td>

                  <td className="p-3.5 text-zinc-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-zinc-400" />
                      <span>{item.tanggal_surat}</span>
                    </div>
                  </td>

                  <td className="p-3.5 max-w-[220px] font-semibold text-zinc-800 dark:text-zinc-200">
                    {item.tujuan_surat}
                  </td>

                  <td className="p-3.5 max-w-[280px] text-zinc-700 dark:text-zinc-300">
                    {item.perihal}
                  </td>

                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      {item.sifat || "Biasa"}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {item.lampiran || "-"}
                    </span>
                  </td>

                  <td className="p-3.5 text-right text-zinc-500">
                    <div className="flex items-center justify-end gap-1 text-[11px] font-medium">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Kepala Balai</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
