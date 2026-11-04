"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Wrench, Loader2, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/app/bmn/_lib/asset-utils";

interface IMaintenance {
  id: string;
  tanggal_service: string;
  deskripsi: string;
  biaya: number;
  kondisi_baru?: string;
  asset?: { nama_barang: string; kode_barang: string };
}

interface IResponse { data: IMaintenance[]; last_page: number }

export default function BmnMaintenancePage() {
  const [page, setPage] = useState(1);

  const { data: response, isLoading } = useQuery<IResponse>({
    queryKey: ["bmn-maintenances", page],
    queryFn: async () => { const res = await api.get("/bmn/maintenances", { params: { page } }); return res.data; },
    placeholderData: (prev) => prev,
  });

  return (
    <div className="p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-4 md:px-6 md:py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Barang Milik Negara
            </span>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Pemeliharaan Aset
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Riwayat servis, perbaikan teknis, dan catatan biaya pemeliharaan BMN.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/50">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Tanggal & Aset</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Deskripsi</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider text-right">Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={3} className="px-4 py-4">
                      <div className="h-10 bg-slate-100 dark:bg-zinc-800/60 rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={3} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" /><p className="text-sm text-zinc-400">Belum ada riwayat pemeliharaan.</p></td></tr>
              ) : (
                response?.data?.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" /> {log.tanggal_service}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{log.asset?.nama_barang || "Aset Terhapus"}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{log.asset?.kode_barang}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 max-w-sm truncate">{log.deskripsi}</p>
                      {log.kondisi_baru && (
                        <span className="inline-flex mt-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          → {log.kondisi_baru}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatRupiah(log.biaya)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-200/80 dark:border-zinc-800 flex items-center justify-between text-sm">
          <span className="text-xs text-slate-400">Total {response?.data?.length || 0} catatan servis</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg cursor-pointer">Prev</Button>
            <Button variant="outline" size="sm" disabled={page === response?.last_page} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg cursor-pointer">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
