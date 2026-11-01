"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trash2, Loader2, Search, Package, RotateCcw, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";

const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka);

interface IDisposedAsset {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  jenis_bmn?: string;
  nilai_buku: number;
  nilai_perolehan: number;
  deleted_at: string;
}

interface IResponse { data: IDisposedAsset[]; last_page: number; total?: number }

export default function BmnDisposalPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRole();
  const canDispose = hasPermission("bmn.asset.dispose");
  const canForceDelete = hasPermission("bmn.asset.force_delete");
  const canWrite = canDispose || canForceDelete;

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data: response, isLoading } = useQuery<IResponse>({
    queryKey: ["bmn-assets-disposed", debouncedSearch, page, perPage],
    queryFn: async () => {
      const res = await api.get("/bmn/assets", { params: { status: "disposed", search: debouncedSearch || undefined, page, per_page: perPage } });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const assets = response?.data || [];

  const toggleSelect = (id: string) => {
    if (!canWrite) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!canWrite) return;
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map((a) => a.id)));
    }
  };

  const handleRestore = async () => {
    if (!canDispose || selectedIds.size === 0) return;
    setIsRestoring(true);
    try {
      await api.post("/bmn/assets/bulk-restore", { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} aset berhasil di-restore.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["bmn-assets-disposed"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
    } catch {
      toast.error("Gagal restore aset.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleForceDelete = async () => {
    if (!canForceDelete || selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await api.post("/bmn/assets/bulk-force-delete", { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} aset dihapus permanen.`);
      setSelectedIds(new Set());
      setConfirmDelete(false);
      queryClient.invalidateQueries({ queryKey: ["bmn-assets-disposed"] });
    } catch {
      toast.error("Gagal menghapus permanen.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Enterprise Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-900/50 shadow-xs">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                Aset Dihapus (Disposal)
              </h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                Arsip Penghapusan
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Daftar aset BMN yang telah dihapus buku{canWrite ? ". Dapat di-restore atau dihapus permanen sesuai hak akses." : "."}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text" placeholder="Cari aset dihapus..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{selectedIds.size} aset dipilih</span>
          <Button
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
          >
            {isRestoring ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
            Restore
          </Button>
          {!confirmDelete ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 text-xs rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Permanen
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Yakin? Tidak bisa dikembalikan!
              </span>
              <Button
                size="sm"
                onClick={handleForceDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Ya, Hapus
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-zinc-500 dark:text-zinc-400"
              >
                Batal
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                {canWrite && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={assets.length > 0 && selectedIds.size === assets.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Tgl Penghapusan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Identitas BMN</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase text-right">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </td>
                    <td className="px-4 py-3 space-y-1.5">
                      <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr><td colSpan={canWrite ? 4 : 3} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" /><p className="text-sm text-zinc-400">Tidak ada aset yang dihapus.</p></td></tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={cn(
                      "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors",
                      selectedIds.has(asset.id) && "bg-red-50/30 dark:bg-red-500/5"
                    )}
                  >
                    {canWrite && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(asset.id)}
                          onCheckedChange={() => toggleSelect(asset.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{asset.deleted_at ? new Date(asset.deleted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 max-w-[250px] truncate">{asset.nama_barang}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-zinc-400">{asset.kode_barang}</span>
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">NUP: {asset.nup}</span>
                        {asset.jenis_bmn && <span className="text-[10px] text-zinc-400">{asset.jenis_bmn}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{formatRupiah(asset.nilai_buku || asset.nilai_perolehan)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{response?.total || assets.length} item total</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            >
              <option value={10}>10 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
              <option value={9999}>Semua</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg">Prev</Button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center px-2">{page} / {response?.last_page || 1}</span>
            <Button variant="outline" size="sm" disabled={page === response?.last_page} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
