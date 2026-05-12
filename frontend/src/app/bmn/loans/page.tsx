"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Handshake, Loader2, Calendar, Package, CheckCircle, Clock } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ILoan {
  id: string;
  tanggal_pinjam: string;
  tanggal_kembali?: string;
  status: string;
  keterangan?: string;
  asset?: { nama_barang: string; kode_barang: string };
  borrower?: { nama_lengkap: string; nip: string };
}

interface IResponse { data: ILoan[]; last_page: number }

export default function BmnLoansPage() {
  const [page, setPage] = useState(1);
  const { canWrite } = useRole();
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery<IResponse>({
    queryKey: ["bmn-loans", page],
    queryFn: async () => { const res = await api.get("/bmn/loans", { params: { page } }); return res.data; },
    placeholderData: (prev) => prev,
  });

  const returnMutation = useMutation({
    mutationFn: (loanId: string) => api.post(`/bmn/loans/${loanId}/return`),
    onSuccess: () => { toast.success("Aset berhasil dikembalikan."); queryClient.invalidateQueries({ queryKey: ["bmn-loans"] }); },
    onError: () => toast.error("Gagal mengembalikan aset."),
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Handshake className="w-6 h-6 text-amber-500" /> Peminjaman Aset
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Riwayat serah-terima aset kepada pegawai.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Tanggal & Aset</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Peminjam</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                {canWrite && <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={4} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" /><p className="text-sm text-slate-400">Memuat...</p></td></tr>
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">Belum ada riwayat peminjaman.</p></td></tr>
              ) : (
                response?.data?.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {loan.tanggal_pinjam}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{loan.asset?.nama_barang || "Aset Terhapus"}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{loan.asset?.kode_barang}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{loan.borrower?.nama_lengkap || "-"}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{loan.borrower?.nip}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                        loan.status === "dikembalikan" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      )}>
                        {loan.status === "dikembalikan" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {loan.status === "dikembalikan" ? "Dikembalikan" : "Dipinjam"}
                      </span>
                      {loan.tanggal_kembali && <p className="text-[10px] text-slate-400 mt-0.5">Kembali: {loan.tanggal_kembali}</p>}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-center">
                        {loan.status !== "dikembalikan" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] rounded-lg h-7 px-2"
                            onClick={() => returnMutation.mutate(loan.id)}
                            disabled={returnMutation.isPending}
                          >
                            Kembalikan
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
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
