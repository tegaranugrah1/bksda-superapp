"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Plus, Loader2, Eye, Trash2, Package, Download } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { AssetImportDialog } from "@/app/bmn/_components/AssetImportDialog";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatRupiah, deduplicateMerkTipe, shortenLokasi } from "@/app/bmn/_lib/asset-utils";

interface IAsset {
  id: string;
  kode_barang: string;
  nup: string;
  nup_lama?: string;
  jenis_bmn?: string;
  nama_barang: string;
  merk_tipe?: string;
  tahun_perolehan?: number;
  kondisi: string;
  nilai_perolehan: number;
  lokasi_spesifik?: string;
  lokasi_ruang?: string;
  no_polisi?: string;
  pengguna?: string;
  tanggal_pajak_stnk?: string;
  tanggal_ganti_plat?: string;
  penanggung_jawab?: { nama_lengkap: string };
  active_loan?: { id: string; borrower_name: string; borrower_nip?: string; loan_date: string; due_date?: string; status: string } | null;
}

interface IResponse { data: IAsset[]; last_page: number; total?: number }

const KONDISI_OPTIONS = ["Semua", "Baik", "Rusak Ringan", "Rusak Berat"];

export default function BmnAssetsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialPerPage = Number(searchParams.get("per_page")) || 10;

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [nupTerm, setNupTerm] = useState(searchParams.get("nup") || "");
  const [page, setPageState] = useState(initialPage);
  const [perPage, setPerPageState] = useState(initialPerPage);
  const [kondisiFilter, setKondisiFilter] = useState(searchParams.get("kondisi") || "Semua");
  const [jenisFilter, setJenisFilter] = useState(searchParams.get("jenis_bmn") || "Semua");
  const [lokasiFilter, setLokasiFilter] = useState(searchParams.get("lokasi_ruang") || "Semua");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebounce(searchTerm, 400);
  const debouncedNup = useDebounce(nupTerm, 400);
  const { hasPermission } = useRole();
  const canCreate = hasPermission("bmn.asset.create");
  const canUpdate = hasPermission("bmn.asset.update");
  const canDispose = hasPermission("bmn.asset.dispose");
  const canImport = hasPermission("bmn.import.review");
  const canWrite = canCreate || canUpdate || canDispose || canImport;
  const queryClient = useQueryClient();

  const updateUrl = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const state = { page, per_page: perPage, kondisi: kondisiFilter, jenis_bmn: jenisFilter, lokasi_ruang: lokasiFilter, search: searchTerm, nup: nupTerm, ...overrides };
    if (state.page && state.page !== 1) params.set("page", String(state.page));
    if (state.per_page && state.per_page !== 10) params.set("per_page", String(state.per_page));
    if (state.kondisi && state.kondisi !== "Semua") params.set("kondisi", String(state.kondisi));
    if (state.jenis_bmn && state.jenis_bmn !== "Semua") params.set("jenis_bmn", String(state.jenis_bmn));
    if (state.lokasi_ruang && state.lokasi_ruang !== "Semua") params.set("lokasi_ruang", String(state.lokasi_ruang));
    if (state.search) params.set("search", String(state.search));
    if (state.nup) params.set("nup", String(state.nup));
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const setPage = (p: number | ((prev: number) => number)) => {
    const newPage = typeof p === "function" ? p(page) : p;
    setPageState(newPage);
    updateUrl({ page: newPage });
  };

  const setPerPage = (pp: number) => {
    setPerPageState(pp);
    setPageState(1);
    updateUrl({ page: 1, per_page: pp });
  };

  const { data: response, isLoading, isFetching } = useQuery<IResponse>({
    queryKey: ["bmn-assets", debouncedSearch, debouncedNup, page, perPage, kondisiFilter, jenisFilter, lokasiFilter],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = { page, per_page: perPage === 0 ? 9999 : perPage };
      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedNup) params.nup = debouncedNup;
      if (kondisiFilter !== "Semua") params.kondisi = kondisiFilter;
      if (jenisFilter !== "Semua") params.jenis_bmn = jenisFilter;
      if (lokasiFilter !== "Semua") params.lokasi_ruang = lokasiFilter;
      const res = await api.get("/bmn/assets", { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const handleExport = async (includeNupLama: boolean) => {
    try {
      const params: Record<string, string | number> = { include_nup_lama: includeNupLama ? 1 : 0 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (debouncedNup) params.nup = debouncedNup;
      if (kondisiFilter !== "Semua") params.kondisi = kondisiFilter;
      if (jenisFilter !== "Semua") params.jenis_bmn = jenisFilter;
      if (lokasiFilter !== "Semua") params.lokasi_ruang = lokasiFilter;
      const res = await api.get("/bmn/assets/export", { responseType: "blob", params, timeout: 60000 });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Katalog_Aset_BMN.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success("Export berhasil!");
    } catch { toast.error("Gagal export data."); }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);
  const confirm = useConfirm();

  const handleDispose = async (id: string) => {
    const ok = await confirm({
      title: "Dispose Aset",
      description: "Yakin ingin menghapus/dispose aset ini? Aset akan dipindahkan ke daftar Aset Dihapus.",
      confirmText: "Ya, Dispose",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.delete(`/bmn/assets/${id}/dispose`);
      toast.success("Aset berhasil di-dispose.");
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets-disposed"] });
    } catch { toast.error("Gagal dispose aset."); }
  };

  const handleBulkDispose = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: "Bulk Dispose",
      description: `Yakin ingin menghapus ${selectedIds.size} aset yang dipilih? Semua aset akan dipindahkan ke daftar Aset Dihapus.`,
      confirmText: `Ya, Hapus ${selectedIds.size} Aset`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      await api.post("/bmn/assets/bulk-dispose", { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} aset berhasil di-dispose.`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
      queryClient.invalidateQueries({ queryKey: ["bmn-assets-disposed"] });
    } catch { toast.error("Gagal bulk dispose."); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!response?.data) return;
    const allIds = response.data.map(a => a.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const allSelected = response?.data ? response.data.length > 0 && response.data.every(a => selectedIds.has(a.id)) : false;

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Data Aset</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Katalog seluruh Barang Milik Negara.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs" onClick={() => setShowExportMenu(!showExportMenu)}>
              <Download className="w-3.5 h-3.5" /> Export {(kondisiFilter !== "Semua" || jenisFilter !== "Semua" || lokasiFilter !== "Semua") ? "(filtered)" : ""}
            </Button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-50 w-56 p-1">
                  {(kondisiFilter !== "Semua" || jenisFilter !== "Semua" || lokasiFilter !== "Semua" || debouncedSearch) && (
                    <p className="px-3 py-1.5 text-[9px] text-emerald-600 font-medium border-b border-slate-100 dark:border-slate-800/50 mb-1">
                      ✓ Export sesuai filter aktif
                    </p>
                  )}
                  <button onClick={() => { handleExport(true); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 rounded-lg">
                    Dengan NUP Lama (80 kolom)
                  </button>
                  <button onClick={() => { handleExport(false); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50 rounded-lg">
                    Tanpa NUP Lama (79 kolom)
                  </button>
                </div>
              </>
            )}
          </div>
          {canWrite && (
            <>
              {canImport && <AssetImportDialog onImportSuccess={() => { setPage(1); queryClient.invalidateQueries({ queryKey: ["bmn-assets"] }); }} />}
              {canCreate && (
                <Link href="/bmn/assets/create">
                  <Button size="sm" className="rounded-xl gap-2 text-xs bg-emerald-600 hover:bg-emerald-500">
                    <Plus className="w-3.5 h-3.5" /> Tambah Aset
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, merk..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPageState(1); updateUrl({ search: e.target.value, page: 1 }); }}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari NUP (baru/lama)..."
            value={nupTerm}
            onChange={(e) => { setNupTerm(e.target.value); setPageState(1); updateUrl({ nup: e.target.value, page: 1 }); }}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="flex gap-1">
          {KONDISI_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setKondisiFilter(opt); setPageState(1); updateUrl({ kondisi: opt, page: 1 }); }}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-semibold transition-all",
                kondisiFilter === opt ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-900/50"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={jenisFilter}
          onChange={(e) => { setJenisFilter(e.target.value); setPageState(1); updateUrl({ jenis_bmn: e.target.value, page: 1 }); }}
          className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="Semua">Semua Jenis BMN</option>
          <option value="ALAT ANGKUTAN BERMOTOR">Alat Angkutan Bermotor</option>
          <option value="ALAT BESAR">Alat Besar</option>
          <option value="ALAT PERSENJATAAN">Alat Persenjataan</option>
          <option value="BANGUNAN AIR">Bangunan Air</option>
          <option value="BANGUNAN DAN GEDUNG">Bangunan dan Gedung</option>
          <option value="MESIN PERALATAN KHUSUS TIK">Mesin Peralatan TIK</option>
          <option value="MESIN PERALATAN NON TIK">Mesin Peralatan Non TIK</option>
          <option value="RUMAH NEGARA">Rumah Negara</option>
          <option value="TANAH">Tanah</option>
        </select>
        <select
          value={lokasiFilter}
          onChange={(e) => { setLokasiFilter(e.target.value); setPageState(1); updateUrl({ lokasi_ruang: e.target.value, page: 1 }); }}
          className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="Semua">Semua Lokasi</option>
          <option value="Kantor Balai KSDA Kalimantan Timur">Kantor Balai</option>
          <option value="Seksi KSDA Wilayah I (Berau)">Wilayah I (Berau)</option>
          <option value="Seksi KSDA Wilayah II (Tenggarong)">Wilayah II (Tenggarong)</option>
          <option value="Seksi KSDA Wilayah III (Balikpapan)">Wilayah III (Balikpapan)</option>
        </select>
        {(jenisFilter !== "Semua" || lokasiFilter !== "Semua" || kondisiFilter !== "Semua" || searchTerm || nupTerm) && (
          <button
            onClick={() => { setJenisFilter("Semua"); setLokasiFilter("Semua"); setKondisiFilter("Semua"); setSearchTerm(""); setNupTerm(""); setPageState(1); updateUrl({ jenis_bmn: "Semua", lokasi_ruang: "Semua", kondisi: "Semua", search: "", nup: "", page: 1 }); }}
            className="h-9 px-3 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-100"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">{selectedIds.size} aset dipilih</span>
          {canUpdate && (
            <select
              onChange={async (e) => {
                const newKondisi = e.target.value;
                if (!newKondisi) return;
                const ok = await confirm({
                  title: "Ubah Kondisi",
                  description: `Ubah kondisi ${selectedIds.size} aset terpilih menjadi "${newKondisi}"?`,
                  confirmText: "Ya, Ubah",
                  variant: "warning",
                });
                if (!ok) { e.target.value = ""; return; }
                try {
                  await api.post("/bmn/assets/bulk-update-kondisi", { ids: Array.from(selectedIds), kondisi: newKondisi });
                  toast.success(`${selectedIds.size} aset diubah ke ${newKondisi}.`);
                  setSelectedIds(new Set());
                  queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
                } catch { toast.error("Gagal mengubah kondisi."); }
                e.target.value = "";
              }}
              className="h-8 px-2 text-xs border border-amber-300 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              defaultValue=""
            >
              <option value="" disabled>Ubah Kondisi...</option>
              <option value="Baik">Baik</option>
              <option value="Rusak Ringan">Rusak Ringan</option>
              <option value="Rusak Berat">Rusak Berat</option>
            </select>
          )}
          {canDispose && (
            <Button size="sm" variant="destructive" className="rounded-lg gap-1 text-xs" onClick={handleBulkDispose}>
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => setSelectedIds(new Set())}>Batal</Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden relative">
        {isFetching && !isLoading && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-100 overflow-hidden z-10">
            <div className="h-full bg-emerald-500 animate-pulse w-1/3 rounded-r-full" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
                {canWrite && (
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  </th>
                )}
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kode / NUP</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jenis BMN</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Barang</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kondisi</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Nilai Perolehan</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lokasi</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={canWrite ? 8 : 6} className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-500 mx-auto mb-2" /><p className="text-sm text-slate-400">Memuat data...</p></td></tr>
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={canWrite ? 8 : 6} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-slate-200" /><p className="text-sm text-slate-400">Tidak ada data ditemukan</p></td></tr>
              ) : (
                response?.data?.map((asset) => (
                  <tr key={asset.id} className={cn("hover:bg-slate-50/50 transition-colors group", selectedIds.has(asset.id) && "bg-emerald-50/30")}>
                    {canWrite && (
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">{asset.kode_barang}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NUP: {asset.nup}</p>
                      {asset.nup_lama && <p className="text-[10px] text-slate-300 font-mono">NUP Lama: {asset.nup_lama}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{asset.jenis_bmn || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{asset.nama_barang}</p>
                      <p className="text-[11px] text-slate-400">
                        {deduplicateMerkTipe(asset.merk_tipe)}
                        {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && asset.no_polisi !== "-" ? ` • ${asset.no_polisi}` : ""}
                        {" • "}{asset.tahun_perolehan || "-"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold",
                        asset.kondisi === "Baik" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                        asset.kondisi === "Rusak Ringan" ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                        "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                      )}>{asset.kondisi}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatRupiah(asset.nilai_perolehan)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{shortenLokasi(asset.lokasi_ruang || asset.lokasi_spesifik || "-")}</p>
                      {asset.pengguna && (
                        <p className="text-[10px] text-slate-400">👤 {asset.pengguna}</p>
                      )}
                      {asset.active_loan && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 mt-1">
                          🤝 Dipinjam: {asset.active_loan.borrower_name}
                        </span>
                      )}
                      {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.tanggal_pajak_stnk && (
                        <StnkBadge tanggal={asset.tanggal_pajak_stnk} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/bmn/assets/${asset.id}`} className="p-1.5 rounded-lg hover:bg-blue-50 dark:bg-blue-500/10 text-blue-600"><Eye className="w-4 h-4" /></Link>
                        {canDispose && (
                          <button onClick={() => handleDispose(asset.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:bg-red-500/10 text-red-500"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs">{response?.data?.length || 0} item ditampilkan</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); }}
              className="h-7 px-2 text-xs border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
              <option value={0}>Semua</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs rounded-lg">Prev</Button>
            <span className="flex items-center text-xs text-slate-500 dark:text-slate-400 px-2">Hal {page}{response?.last_page ? ` / ${response.last_page}` : ""}</span>
            <Button variant="outline" size="sm" disabled={page === response?.last_page || perPage === 0} onClick={() => setPage(p => p + 1)} className="text-xs rounded-lg">Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StnkBadge({ tanggal }: { tanggal: string }) {
  const today = new Date();
  const target = new Date(tanggal);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:text-red-400 mt-1">
        🚨 Pajak expired {Math.abs(diffDays)} hari
      </span>
    );
  }
  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:text-amber-400 mt-1">
        ⚠️ Pajak {diffDays} hari lagi
      </span>
    );
  }
  return null;
}
