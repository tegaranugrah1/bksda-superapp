"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Trash2, Loader2, Search, Package, RotateCcw, AlertTriangle } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
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

interface IResponse { data: IDisposedAsset[]; meta?: { last_page: number; total: number }; last_page?: number; total?: number }

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

  const { data: response, isLoading, isFetching, isError, refetch } = useQuery<IResponse>({
    queryKey: ["bmn-assets-disposed", debouncedSearch, page, perPage],
    queryFn: async () => {
      const res = await api.get("/bmn/assets", { params: { status: "disposed", search: debouncedSearch || undefined, page, per_page: perPage } });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const assets = response?.data || [];
  const lastPage = response?.meta?.last_page ?? response?.last_page ?? 1;
  const busy = isRestoring || isDeleting;
  const allSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id));

  const toggleSelect = (id: string) => {
    if (!canWrite) return;
    setConfirmDelete(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!canWrite) return;
    setConfirmDelete(false);
    if (allSelected) {
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
    <div data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-assets-enter p-4 md:p-8 space-y-6">
      {/* Enterprise Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] p-6 rounded-2xl shadow-xs">
        <div className="flex min-w-0 items-start sm:items-center gap-4">
          <div className="shrink-0 p-3 bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] rounded-xl border border-[var(--ds-accent-soft-border)]">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--ds-fg)]">
                Aset Dihapus (Disposal)
              </h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--ds-status-neutral-bg)] text-[var(--ds-status-neutral-fg)] border border-[var(--ds-status-neutral-border)]">
                Arsip Penghapusan
              </span>
            </div>
            <p className="text-sm text-[var(--ds-fg-muted)] mt-1">
              Daftar aset BMN yang telah dihapus buku{canWrite ? ". Dapat di-restore atau dihapus permanen sesuai hak akses." : "."}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
          <input
            aria-label="Cari aset dihapus"
            disabled={busy}
            type="text" placeholder="Cari aset dihapus..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); setSelectedIds(new Set()); setConfirmDelete(false); }}
            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-[var(--ds-surface-muted)] border border-[var(--ds-border-subtle)] rounded-xl text-sm text-[var(--ds-fg)] placeholder-zinc-400  transition-colors duration-150 ease-out"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-[var(--ds-fg-secondary)]">{selectedIds.size} aset dipilih</span>
          {canDispose && <Button
            size="sm"
            onClick={handleRestore}
            disabled={busy || isFetching}
            className="bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] text-xs rounded-lg"
          >
            {isRestoring ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />}
            Restore
          </Button>}
          {canForceDelete && (!confirmDelete ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              disabled={busy || isFetching}
              className="bmn-icon-danger text-xs rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Permanen
            </Button>
          ) : (
            <div role="group" aria-label="Konfirmasi hapus permanen" className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--ds-status-danger-fg)] font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Yakin? Tidak bisa dikembalikan!
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleForceDelete}
                disabled={busy || isFetching}
                className="text-xs rounded-lg"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                Ya, Hapus
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-[var(--ds-fg-muted)]"
              >
                Batal
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[var(--ds-surface)] border border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`${assets.length > 0 ? "bmn-wide-table" : ""} w-full text-left`}>
            <thead>
              <tr className="border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]">
                {canWrite && (
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      aria-label="Pilih semua aset pada halaman ini"
                      checked={allSelected ? true : assets.some((asset) => selectedIds.has(asset.id)) ? "indeterminate" : false}
                      disabled={busy || isFetching}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Tgl Penghapusan</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase">Identitas BMN</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase text-right">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ds-border-subtle)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="h-4 w-4 bg-[var(--ds-surface-muted)] rounded" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 bg-[var(--ds-surface-muted)] rounded" />
                    </td>
                    <td className="px-4 py-3 space-y-1.5">
                      <div className="h-4 w-48 bg-[var(--ds-surface-muted)] rounded" />
                      <div className="h-3 w-32 bg-[var(--ds-surface-muted)] rounded" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-4 w-20 bg-[var(--ds-surface-muted)] rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr><td colSpan={canWrite ? 4 : 3} className="p-8 text-center"><div role="alert" className="text-[var(--ds-status-danger-fg)]">Aset dihapus gagal dimuat.</div><Button variant="outline" className="mt-3" onClick={() => refetch()}>Coba lagi</Button></td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={canWrite ? 4 : 3} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-[var(--ds-fg-muted)]" /><p className="text-sm text-[var(--ds-fg-muted)]">Tidak ada aset yang dihapus.</p></td></tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    aria-selected={selectedIds.has(asset.id)}
                    className="bmn-table-row"
                  >
                    {canWrite && (
                      <td className="px-4 py-3">
                        <Checkbox
                          aria-label={`Pilih ${asset.nama_barang} NUP ${asset.nup}`}
                          disabled={busy || isFetching}
                          checked={selectedIds.has(asset.id)}
                          onCheckedChange={() => toggleSelect(asset.id)}
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-[var(--ds-fg)]">{asset.deleted_at ? new Date(asset.deleted_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--ds-fg)] max-w-[250px] truncate">{asset.nama_barang}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-[var(--ds-fg-muted)]">{asset.kode_barang}</span>
                        <span className="text-xs bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] px-1.5 py-0.5 rounded font-mono">NUP: {asset.nup}</span>
                        {asset.jenis_bmn && <span className="text-xs text-[var(--ds-fg-muted)]">{asset.jenis_bmn}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-[var(--ds-fg)]">{formatRupiah(asset.nilai_buku ?? asset.nilai_perolehan)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[var(--ds-border-subtle)] flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--ds-fg-muted)]">{response?.meta?.total ?? response?.total ?? assets.length} item total</span>
            <select
              value={perPage}
              aria-label="Jumlah aset per halaman"
              disabled={busy}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); setSelectedIds(new Set()); setConfirmDelete(false); }}
              className="text-xs border border-[var(--ds-border-subtle)] rounded-lg px-2 py-1 bg-[var(--ds-surface)] text-[var(--ds-fg-secondary)]"
            >
              <option value={10}>10 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
              <option value={9999}>Semua</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={busy || isFetching || page <= 1} onClick={() => { setPage(p => p - 1); setSelectedIds(new Set()); setConfirmDelete(false); }} className="text-xs rounded-lg">Sebelumnya</Button>
            <span className="text-xs text-[var(--ds-fg-muted)] flex items-center px-2">{page} / {lastPage}</span>
            <Button variant="outline" size="sm" disabled={busy || isFetching || page >= lastPage} onClick={() => { setPage(p => p + 1); setSelectedIds(new Set()); setConfirmDelete(false); }} className="text-xs rounded-lg">Selanjutnya</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
