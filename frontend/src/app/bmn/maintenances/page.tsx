"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Wrench, Loader2, Calendar, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

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
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Wrench className="w-6 h-6 text-blue-500" /> Pemeliharaan
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Riwayat servis dan biaya pemeliharaan aset.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Tanggal & Aset</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Deskripsi</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase text-right">Biaya</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr><td colSpan={3} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" /><p className="text-sm text-zinc-400">Memuat...</p></td></tr>
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
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">{response?.data?.length || 0} item</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg">Prev</Button>
            <Button variant="outline" size="sm" disabled={page === response?.last_page} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
