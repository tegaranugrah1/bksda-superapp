"use client";

import { useState, useMemo, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Loader2, Eye, Trash2, Package, Download, Tag as TagIcon, X, UserRound, Handshake, AlertTriangle, LayoutGrid, Table2, SlidersHorizontal } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { AssetImportDialog } from "@/app/bmn/_components/AssetImportDialog";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import "./assets.css";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatRupiah, deduplicateMerkTipe, shortenLokasi, getAssetUser } from "@/app/bmn/_lib/asset-utils";
import { TagAssignmentDialog } from "@/app/bmn/_components/TagAssignmentDialog";
import { TagFilterCombobox } from "@/app/bmn/_components/TagFilterCombobox";
import { AssetTagsList } from "@/app/bmn/_components/AssetTagsList";
import { type IBmnTag, getTagColorClasses } from "@/app/bmn/_lib/tag-utils";

import { getPrimaryPhoto, type AssetPhotoSource } from "@/app/bmn/_lib/asset-photos";
import { useAssetView } from "./use-asset-view";
import { AssetPhotoPreview } from "./_components/AssetPhotoPreview";

interface IAsset extends AssetPhotoSource {
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
  nama_pengguna?: string;
  tanggal_pajak_stnk?: string;
  tanggal_ganti_plat?: string;
  penanggung_jawab?: { nama_lengkap: string };
  active_loan?: { id: string; borrower_name: string; borrower_nip?: string; loan_date: string; due_date?: string; status: string } | null;
  tags?: IBmnTag[];
  updated_at?: string;
}

interface IResponse {
  data: IAsset[];
  meta: { last_page: number; total: number };
  filter_options?: { years?: number[] };
}

function formatModifiedDate(iso?: string): string | null {
  if (!iso) return null;
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

const KONDISI_OPTIONS = ["Semua", "Baik", "Rusak Ringan", "Rusak Berat"];

import { SIMAN_LOKASI_RUANG_OPTIONS, mergeLokasiOptions } from "@/app/bmn/_lib/location-options";
import { useMasterLocations } from "@/lib/locations";

export default function BmnAssetsPage() {
  const conditionId = useId();
  const [view, setView] = useAssetView();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialPage = Number(searchParams.get("page")) || 1;
  const initialPerPage = searchParams.get("per_page") === "0" ? 0 : Number(searchParams.get("per_page")) || 10;

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [nupTerm, setNupTerm] = useState(searchParams.get("nup") || "");
  const [page, setPageState] = useState(initialPage);
  const [perPage, setPerPageState] = useState(initialPerPage);
  const [kondisiFilter, setKondisiFilter] = useState(searchParams.get("kondisi") || "Semua");
  const [jenisFilter, setJenisFilter] = useState(searchParams.get("jenis_bmn") || "Semua");
  const [lokasiFilter, setLokasiFilter] = useState(searchParams.get("lokasi_ruang") || "Semua");
  const initialTagParam = searchParams.get("tag_ids") || searchParams.get("tag_id") || "";
  const initialTagIds = useMemo(() => {
    if (!initialTagParam || initialTagParam === "Semua") return [];
    return initialTagParam.split(",").filter(Boolean);
  }, [initialTagParam]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [tahunFilter, setTahunFilter] = useState(
    searchParams.get("tahun") || (searchParams.get("tahun_from") || searchParams.get("tahun_to") ? "range" : "Semua")
  );
  const [tahunFrom, setTahunFrom] = useState(searchParams.get("tahun_from") || "");
  const [tahunTo, setTahunTo] = useState(searchParams.get("tahun_to") || "");
  const [modifiedPreset, setModifiedPreset] = useState(
    searchParams.get("modified_preset") || (searchParams.get("modified_from") || searchParams.get("modified_to") ? "custom" : "")
  );
  const [modifiedFrom, setModifiedFrom] = useState(searchParams.get("modified_from") || "");
  const [modifiedTo, setModifiedTo] = useState(searchParams.get("modified_to") || "");
  const [photoFilter, setPhotoFilter] = useState(searchParams.get("photo_status") || "Semua");
  const [loanFilter, setLoanFilter] = useState(searchParams.get("loan_status") || "Semua");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "updated_desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() =>
    Boolean(
      searchParams.get("tahun_from") ||
      searchParams.get("tahun_to") ||
      searchParams.get("modified_from") ||
      searchParams.get("modified_to") ||
      searchParams.get("photo_status") ||
      searchParams.get("loan_status")
    )
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false);
  const [editingAssetForTags, setEditingAssetForTags] = useState<IAsset | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 400);
  const debouncedNup = useDebounce(nupTerm, 400);
  const { hasPermission } = useRole();
  const canCreate = hasPermission("bmn.asset.create");
  const canUpdate = hasPermission("bmn.asset.update");
  const canDispose = hasPermission("bmn.asset.dispose");
  const canImport = hasPermission("bmn.import.review");
  const canWrite = canCreate || canUpdate || canDispose || canImport;
  const queryClient = useQueryClient();

  const { data: tagsList = [] } = useQuery<IBmnTag[]>({
    queryKey: ["bmn-tags"],
    queryFn: async () => {
      const res = await api.get("/bmn/tags");
      return res.data.data || [];
    },
  });

  const { data: assetTypes = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["bmn-asset-types"],
    queryFn: async () => {
      const res = await api.get("/bmn/asset-types");
      return res.data.data || [];
    },
  });

  const { data: locations = [] } = useMasterLocations(true);
  const simanExtraOptions = useMemo(
    () =>
      mergeLokasiOptions([], SIMAN_LOKASI_RUANG_OPTIONS).filter(
        (loc) => !locations.some((m) => m.name.toLowerCase() === loc.toLowerCase())
      ),
    [locations]
  );

  const updateUrl = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams();
    const tagIdsStr = selectedTagIds.join(",");
    const state = {
      page,
      per_page: perPage,
      kondisi: kondisiFilter,
      jenis_bmn: jenisFilter,
      lokasi_ruang: lokasiFilter,
      tag_ids: tagIdsStr,
      search: searchTerm,
      nup: nupTerm,
      tahun: tahunFilter === "range" ? "Semua" : tahunFilter,
      tahun_from: tahunFilter === "range" ? tahunFrom : "",
      tahun_to: tahunFilter === "range" ? tahunTo : "",
      modified_preset: modifiedPreset === "custom" ? "" : modifiedPreset,
      modified_from: modifiedPreset === "custom" ? modifiedFrom : "",
      modified_to: modifiedPreset === "custom" ? modifiedTo : "",
      photo_status: photoFilter,
      loan_status: loanFilter,
      sort: sortBy,
      ...overrides,
    };
    if (state.page && state.page !== 1) params.set("page", String(state.page));
    if (state.per_page !== 10) params.set("per_page", String(state.per_page));
    if (state.kondisi && state.kondisi !== "Semua") params.set("kondisi", String(state.kondisi));
    if (state.jenis_bmn && state.jenis_bmn !== "Semua") params.set("jenis_bmn", String(state.jenis_bmn));
    if (state.lokasi_ruang && state.lokasi_ruang !== "Semua") params.set("lokasi_ruang", String(state.lokasi_ruang));
    if (state.tag_ids && state.tag_ids !== "Semua" && state.tag_ids !== "") params.set("tag_ids", String(state.tag_ids));
    if (state.search) params.set("search", String(state.search));
    if (state.nup) params.set("nup", String(state.nup));
    if (state.tahun && state.tahun !== "Semua" && state.tahun !== "range") params.set("tahun", String(state.tahun));
    if (state.tahun_from) params.set("tahun_from", String(state.tahun_from));
    if (state.tahun_to) params.set("tahun_to", String(state.tahun_to));
    if (state.modified_preset && state.modified_preset !== "custom") params.set("modified_preset", String(state.modified_preset));
    if (state.modified_from) params.set("modified_from", String(state.modified_from));
    if (state.modified_to) params.set("modified_to", String(state.modified_to));
    if (state.photo_status && state.photo_status !== "Semua") params.set("photo_status", String(state.photo_status));
    if (state.loan_status && state.loan_status !== "Semua") params.set("loan_status", String(state.loan_status));
    if (state.sort && state.sort !== "updated_desc") params.set("sort", String(state.sort));
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

  const buildFilterParams = (extra?: Record<string, string | number>) => {
    const params: Record<string, string | number> = { ...extra };
    if (debouncedSearch) params.search = debouncedSearch;
    if (debouncedNup) params.nup = debouncedNup;
    if (kondisiFilter !== "Semua") params.kondisi = kondisiFilter;
    if (jenisFilter !== "Semua") params.jenis_bmn = jenisFilter;
    if (lokasiFilter !== "Semua") params.lokasi_ruang = lokasiFilter;
    if (selectedTagIds.length > 0) params.tag_ids = selectedTagIds.join(",");
    if (tahunFilter === "range") {
      if (tahunFrom) params.tahun_from = tahunFrom;
      if (tahunTo) params.tahun_to = tahunTo;
    } else if (tahunFilter !== "Semua") {
      params.tahun = tahunFilter;
    }
    if (modifiedPreset === "custom") {
      if (modifiedFrom) params.modified_from = modifiedFrom;
      if (modifiedTo) params.modified_to = modifiedTo;
    } else if (modifiedPreset) {
      params.modified_preset = modifiedPreset;
    }
    if (photoFilter !== "Semua") params.photo_status = photoFilter;
    if (loanFilter !== "Semua") params.loan_status = loanFilter;
    if (sortBy && sortBy !== "updated_desc") params.sort = sortBy;
    return params;
  };

  const hasActiveFilters =
    jenisFilter !== "Semua" ||
    lokasiFilter !== "Semua" ||
    kondisiFilter !== "Semua" ||
    selectedTagIds.length > 0 ||
    tahunFilter !== "Semua" ||
    Boolean(tahunFrom || tahunTo || modifiedPreset || modifiedFrom || modifiedTo) ||
    photoFilter !== "Semua" ||
    loanFilter !== "Semua" ||
    sortBy !== "updated_desc" ||
    Boolean(searchTerm || nupTerm);

  const advancedActiveCount =
    (tahunFilter === "range" && (tahunFrom || tahunTo) ? 1 : 0) +
    (modifiedPreset === "custom" && (modifiedFrom || modifiedTo) ? 1 : 0) +
    (photoFilter !== "Semua" ? 1 : 0) +
    (loanFilter !== "Semua" ? 1 : 0);

  const { data: response, isLoading, isFetching } = useQuery<IResponse>({
    queryKey: [
      "bmn-assets",
      debouncedSearch,
      debouncedNup,
      page,
      perPage,
      kondisiFilter,
      jenisFilter,
      lokasiFilter,
      selectedTagIds,
      tahunFilter,
      tahunFrom,
      tahunTo,
      modifiedPreset,
      modifiedFrom,
      modifiedTo,
      photoFilter,
      loanFilter,
      sortBy,
    ],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        page,
        per_page: perPage === 0 ? 2000 : perPage,
        ...buildFilterParams(),
      };
      const res = await api.get("/bmn/assets", { params });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const availableYears = useMemo(() => {
    const base = response?.filter_options?.years || [];
    const extras = [tahunFilter, tahunFrom, tahunTo]
      .map((y) => Number(y))
      .filter((y) => Number.isInteger(y) && y > 1900 && !base.includes(y));
    return [...base, ...extras].sort((a, b) => b - a);
  }, [response?.filter_options?.years, tahunFilter, tahunFrom, tahunTo]);

  const selectedActiveTags = useMemo(() => {
    if (selectedIds.size === 0 || !response?.data) return [];
    const tagCountMap = new Map<string, { tag: IBmnTag; count: number }>();
    response.data.forEach((asset) => {
      if (selectedIds.has(asset.id) && asset.tags) {
        asset.tags.forEach((tag) => {
          const current = tagCountMap.get(tag.id);
          if (current) {
            current.count += 1;
          } else {
            tagCountMap.set(tag.id, { tag, count: 1 });
          }
        });
      }
    });
    return Array.from(tagCountMap.values());
  }, [selectedIds, response]);

  const handleExport = async (includeNupLama: boolean) => {
    try {
      const params = buildFilterParams({ include_nup_lama: includeNupLama ? 1 : 0 });
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
    <div data-module="bmn" className="bmn-assets-ui bmn-assets-enter p-4 sm:p-6 space-y-6">
      {/* 1. Unified Clean Enterprise Header Bar */}
      <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-4 md:px-6 md:py-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
              Data Aset
            </h1>
            <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
              Katalog seluruh Barang Milik Negara BKSDA Kalimantan Timur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Popover open={showExportMenu} onOpenChange={setShowExportMenu}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="bmn-button bmn-secondary bmn-lift rounded-lg gap-2 text-xs">
                <Download className="w-4 h-4" /> Export
              </Button>
            </PopoverTrigger>
            <PopoverContent data-module="bmn" aria-label="Pilihan export aset" align="end" className="bmn-assets-ui bmn-popover w-60 p-1 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-lg">
              {hasActiveFilters && (
                <p className="px-3 py-2 text-xs text-[var(--ds-accent-fg)]">Export sesuai filter aktif</p>
              )}
              <button onClick={() => { handleExport(true); setShowExportMenu(false); }} className="bmn-button bmn-secondary w-full text-left px-3 py-2 text-xs rounded-lg">
                Dengan NUP Lama (80 kolom)
              </button>
              <button onClick={() => { handleExport(false); setShowExportMenu(false); }} className="bmn-button bmn-secondary w-full text-left px-3 py-2 text-xs rounded-lg">
                Tanpa NUP Lama (79 kolom)
              </button>
            </PopoverContent>
          </Popover>
          {canImport && <AssetImportDialog onImportSuccess={() => { setPage(1); queryClient.invalidateQueries({ queryKey: ["bmn-assets"] }); }} />}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
          <input
            type="text"
            aria-label="Cari nama, kode, atau merk aset"
            placeholder="Cari nama, kode, merk..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPageState(1); updateUrl({ search: e.target.value, page: 1 }); }}
            className="w-full h-10 pl-9 pr-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg text-sm text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)] focus:border-[var(--ds-accent-fg)]"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
          <input
            type="text"
            aria-label="Cari NUP baru atau lama"
            placeholder="Cari NUP (baru/lama)..."
            value={nupTerm}
            onChange={(e) => { setNupTerm(e.target.value); setPageState(1); updateUrl({ nup: e.target.value, page: 1 }); }}
            className="w-full h-10 pl-9 pr-4 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-lg text-sm text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)] focus:border-[var(--ds-accent-fg)]"
          />
        </div>
        <div className="flex flex-wrap gap-1 bg-[var(--ds-surface-muted)] p-1 rounded-lg">
          {KONDISI_OPTIONS.map((opt) => {
            const isActive = kondisiFilter === opt;
            return (
              <button
                key={opt}
                type="button"
                aria-pressed={isActive}
                onClick={() => { setKondisiFilter(opt); setPageState(1); updateUrl({ kondisi: opt, page: 1 }); }}
                className={cn(
                  "bmn-filter relative px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer select-none",
                  isActive ? "font-bold" : "text-[var(--ds-fg-muted)]"
                )}
              >
                {isActive && (
                  <motion.span
                    aria-hidden="true"
                    layoutId={`${conditionId}-kondisi`}
                    initial={false}
                    className="pointer-events-none absolute inset-0 bg-[var(--ds-accent-solid)] rounded-lg shadow-xs"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative z-10">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filter jenis BMN"
          value={jenisFilter}
          onChange={(e) => { setJenisFilter(e.target.value); setPageState(1); updateUrl({ jenis_bmn: e.target.value, page: 1 }); }}
          className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)] max-w-[200px]"
        >
          <option value="Semua">Semua Jenis BMN</option>
          {assetTypes && assetTypes.length > 0 ? (
            assetTypes.map((t) => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))
          ) : (
            <>
              <option value="ALAT ANGKUTAN BERMOTOR">Alat Angkutan Bermotor</option>
              <option value="ALAT BESAR">Alat Besar</option>
              <option value="ALAT PERSENJATAAN">Alat Persenjataan</option>
              <option value="BANGUNAN AIR">Bangunan Air</option>
              <option value="BANGUNAN DAN GEDUNG">Bangunan dan Gedung</option>
              <option value="MESIN PERALATAN KHUSUS TIK">Mesin Peralatan TIK</option>
              <option value="MESIN PERALATAN NON TIK">Mesin Peralatan Non TIK</option>
              <option value="RUMAH NEGARA">Rumah Negara</option>
              <option value="TANAH">Tanah</option>
            </>
          )}
        </select>
        <select
          aria-label="Filter lokasi aset"
          value={lokasiFilter}
          onChange={(e) => { setLokasiFilter(e.target.value); setPageState(1); updateUrl({ lokasi_ruang: e.target.value, page: 1 }); }}
          className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)] max-w-[220px]"
        >
          <option value="Semua">Semua Lokasi</option>
          <optgroup label="Unit Kerja, Resor & Ruangan (Master Lokasi)">
            {locations.length > 0 ? (
              locations.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.parent ? `${l.name} (${l.parent.name})` : l.name}
                </option>
              ))
            ) : (
              <>
                <option value="Kantor Balai KSDA Kalimantan Timur">Kantor Balai</option>
                <option value="Seksi KSDA Wilayah I Berau">Wilayah I (Berau)</option>
                <option value="Seksi KSDA Wilayah II Tenggarong">Wilayah II (Tenggarong)</option>
                <option value="Seksi KSDA Wilayah III Balikpapan">Wilayah III (Balikpapan)</option>
              </>
            )}
          </optgroup>
          <optgroup label="Data SIMAN Lama (Ruang)">
            {simanExtraOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </optgroup>
        </select>
        <TagFilterCombobox
          tags={tagsList}
          selectedTagIds={selectedTagIds}
          onToggleTag={(id) => {
            const next = selectedTagIds.includes(id)
              ? selectedTagIds.filter((x) => x !== id)
              : [...selectedTagIds, id];
            setSelectedTagIds(next);
            setPageState(1);
            updateUrl({ tag_ids: next.join(",") || "Semua", page: 1 });
          }}
          onClearAll={() => {
            setSelectedTagIds([]);
            setPageState(1);
            updateUrl({ tag_ids: "Semua", page: 1 });
          }}
        />
        <select
          aria-label="Filter tahun perolehan"
          value={tahunFilter}
          onChange={(e) => {
            const val = e.target.value;
            setTahunFilter(val);
            setPageState(1);
            if (val === "range") {
              setShowAdvancedFilters(true);
              updateUrl({ tahun: "Semua", tahun_from: tahunFrom, tahun_to: tahunTo, page: 1 });
            } else {
              setTahunFrom("");
              setTahunTo("");
              updateUrl({ tahun: val, tahun_from: "", tahun_to: "", page: 1 });
            }
          }}
          className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)]"
        >
          <option value="Semua">Semua Tahun</option>
          <option value="range">Rentang Tahun...</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
        <select
          aria-label="Filter tanggal diubah"
          value={modifiedPreset}
          onChange={(e) => {
            const val = e.target.value;
            setModifiedPreset(val);
            setPageState(1);
            if (val === "custom") {
              setShowAdvancedFilters(true);
              updateUrl({ modified_preset: "", modified_from: modifiedFrom, modified_to: modifiedTo, page: 1 });
            } else {
              setModifiedFrom("");
              setModifiedTo("");
              updateUrl({ modified_preset: val, modified_from: "", modified_to: "", page: 1 });
            }
          }}
          className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)]"
        >
          <option value="">Semua Waktu Diubah</option>
          <option value="today">Diubah Hari Ini</option>
          <option value="7d">7 Hari Terakhir</option>
          <option value="30d">30 Hari Terakhir</option>
          <option value="custom">Rentang Tanggal...</option>
        </select>
        <select
          aria-label="Urutkan daftar aset"
          value={sortBy}
          onChange={(e) => {
            const val = e.target.value;
            setSortBy(val);
            setPageState(1);
            updateUrl({ sort: val, page: 1 });
          }}
          className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)]"
        >
          <option value="updated_desc">Urut: Terbaru Diubah</option>
          <option value="created_desc">Urut: Terbaru Dibuat</option>
          <option value="year_desc">Tahun Perolehan (Terbaru)</option>
          <option value="year_asc">Tahun Perolehan (Terlama)</option>
          <option value="value_desc">Nilai Perolehan Tertinggi</option>
          <option value="code_asc">Kode Barang &amp; NUP</option>
        </select>
        <button
          type="button"
          aria-expanded={showAdvancedFilters}
          onClick={() => setShowAdvancedFilters((prev) => !prev)}
          className={cn(
            "bmn-button h-9 px-3 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 border cursor-pointer",
            showAdvancedFilters || advancedActiveCount > 0
              ? "border-[var(--ds-accent-solid)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
              : "bmn-secondary border-slate-200/80 dark:border-zinc-800"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filter Lanjutan{advancedActiveCount > 0 ? ` (${advancedActiveCount})` : ""}
        </button>
        {selectedTagIds.length > 1 &&
          selectedTagIds.map((id) => {
            const t = tagsList.find((x) => x.id === id);
            if (!t) return null;
            const colorTheme = getTagColorClasses(t.color);
            return (
              <span
                key={t.id}
                className={cn(
                  "h-9 px-3 text-xs font-semibold rounded-lg border flex items-center gap-2 shadow-xs shrink-0",
                  colorTheme.bg,
                  colorTheme.text,
                  colorTheme.border
                )}
              >
                <TagIcon className="w-4 h-4" />
                <span className="truncate max-w-[130px]">{t.label}</span>
                <button
                  type="button"
                  aria-label={`Hapus filter ${t.label}`}
                  title={`Hapus filter ${t.label}`}
                  onClick={() => {
                    const next = selectedTagIds.filter((x) => x !== id);
                    setSelectedTagIds(next);
                    setPageState(1);
                    updateUrl({ tag_ids: next.join(",") || "Semua", page: 1 });
                  }}
                  className="p-1 rounded-full hover:bg-[var(--ds-surface-muted)] transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-3 h-3 opacity-75 hover:opacity-100" />
                </button>
              </span>
            );
          })}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setJenisFilter("Semua");
              setLokasiFilter("Semua");
              setKondisiFilter("Semua");
              setSelectedTagIds([]);
              setSearchTerm("");
              setNupTerm("");
              setTahunFilter("Semua");
              setTahunFrom("");
              setTahunTo("");
              setModifiedPreset("");
              setModifiedFrom("");
              setModifiedTo("");
              setPhotoFilter("Semua");
              setLoanFilter("Semua");
              setSortBy("updated_desc");
              setPageState(1);
              updateUrl({
                jenis_bmn: "Semua",
                lokasi_ruang: "Semua",
                kondisi: "Semua",
                tag_ids: "Semua",
                search: "",
                nup: "",
                tahun: "Semua",
                tahun_from: "",
                tahun_to: "",
                modified_preset: "",
                modified_from: "",
                modified_to: "",
                photo_status: "Semua",
                loan_status: "Semua",
                sort: "updated_desc",
                page: 1,
              });
            }}
            className="bmn-button bmn-secondary h-9 px-3 text-xs font-medium rounded-lg"
          >
            Reset Filter
          </button>
        )}
      </div>

      {showAdvancedFilters && (
        <div className="bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 flex flex-wrap items-end gap-3 shadow-xs">
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ds-fg-muted)] mb-1">Tahun Dari</label>
              <select
                aria-label="Tahun perolehan dari"
                value={tahunFrom}
                onChange={(e) => {
                  const val = e.target.value;
                  setTahunFilter("range");
                  setTahunFrom(val);
                  setPageState(1);
                  updateUrl({ tahun: "Semua", tahun_from: val, page: 1 });
                }}
                className="h-9 px-2.5 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] tabular-nums"
              >
                <option value="">Awal</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ds-fg-muted)] mb-1">Tahun Sampai</label>
              <select
                aria-label="Tahun perolehan sampai"
                value={tahunTo}
                onChange={(e) => {
                  const val = e.target.value;
                  setTahunFilter("range");
                  setTahunTo(val);
                  setPageState(1);
                  updateUrl({ tahun: "Semua", tahun_to: val, page: 1 });
                }}
                className="h-9 px-2.5 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] tabular-nums"
              >
                <option value="">Akhir</option>
                {availableYears.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ds-fg-muted)] mb-1">Diubah Dari</label>
              <input
                type="date"
                aria-label="Tanggal diubah dari"
                value={modifiedFrom}
                onChange={(e) => {
                  const val = e.target.value;
                  setModifiedPreset("custom");
                  setModifiedFrom(val);
                  setPageState(1);
                  updateUrl({ modified_preset: "", modified_from: val, page: 1 });
                }}
                className="h-9 px-2.5 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--ds-fg-muted)] mb-1">Diubah Sampai</label>
              <input
                type="date"
                aria-label="Tanggal diubah sampai"
                value={modifiedTo}
                onChange={(e) => {
                  const val = e.target.value;
                  setModifiedPreset("custom");
                  setModifiedTo(val);
                  setPageState(1);
                  updateUrl({ modified_preset: "", modified_to: val, page: 1 });
                }}
                className="h-9 px-2.5 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)] tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ds-fg-muted)] mb-1">Kelengkapan Foto</label>
            <select
              aria-label="Filter kelengkapan foto"
              value={photoFilter}
              onChange={(e) => {
                const val = e.target.value;
                setPhotoFilter(val);
                setPageState(1);
                updateUrl({ photo_status: val, page: 1 });
              }}
              className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]"
            >
              <option value="Semua">Semua Foto</option>
              <option value="with_photo">Sudah Ada Foto</option>
              <option value="without_photo">Belum Ada Foto</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[var(--ds-fg-muted)] mb-1">Status Peminjaman</label>
            <select
              aria-label="Filter status peminjaman"
              value={loanFilter}
              onChange={(e) => {
                const val = e.target.value;
                setLoanFilter(val);
                setPageState(1);
                updateUrl({ loan_status: val, page: 1 });
              }}
              className="h-9 px-3 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface-muted)] text-[var(--ds-fg)]"
            >
              <option value="Semua">Semua Status</option>
              <option value="borrowed">Sedang Dipinjam</option>
              <option value="available">Tersedia</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {canWrite && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] rounded-lg flex-wrap">
          <span className="text-sm font-semibold text-[var(--ds-accent-fg)] tabular-nums">{selectedIds.size} aset dipilih</span>
          {canUpdate && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="bmn-button bmn-secondary rounded-lg gap-2 text-xs"
                onClick={() => setShowBulkTagDialog(true)}
              >
                <TagIcon className="w-4 h-4" /> Kelola Tag
              </Button>
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
                className="h-8 px-2 text-xs border border-[var(--ds-status-warning-border)] rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)]"
                aria-label="Ubah kondisi aset terpilih"
                defaultValue=""
              >
                <option value="" disabled>Ubah Kondisi...</option>
                <option value="Baik">Baik</option>
                <option value="Rusak Ringan">Rusak Ringan</option>
                <option value="Rusak Berat">Rusak Berat</option>
              </select>
            </>
          )}
          {canDispose && (
            <Button size="sm" variant="destructive" className="bmn-button bmn-danger rounded-lg gap-1 text-xs" onClick={handleBulkDispose}>
              <Trash2 className="w-4 h-4" /> Hapus Terpilih
            </Button>
          )}
          <Button size="sm" variant="outline" className="bmn-button bmn-secondary rounded-lg text-xs" onClick={() => setSelectedIds(new Set())}>Batal</Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--ds-fg-muted)] tabular-nums">{response?.meta ? `${response.meta.total.toLocaleString("id-ID")} aset terdaftar` : isLoading ? "Memuat daftar aset..." : "Daftar aset"}</p>
        <div role="group" aria-label="Tampilan daftar aset" className="flex gap-1 rounded-lg bg-[var(--ds-surface-muted)] p-1">
          <button type="button" disabled={view === null} aria-pressed={view === "table"} onClick={() => setView("table")} className={cn("bmn-button flex items-center gap-2 rounded-lg px-3 text-xs", view === "table" ? "bmn-primary" : "bmn-secondary")}><Table2 className="w-4 h-4" /> Tabel</button>
          <button type="button" disabled={view === null} aria-pressed={view === "grid"} onClick={() => setView("grid")} className={cn("bmn-button flex items-center gap-2 rounded-lg px-3 text-xs", view === "grid" ? "bmn-primary" : "bmn-secondary")}><LayoutGrid className="w-4 h-4" /> Grid</button>
        </div>
      </div>

      {/* Both views share query, selection, filters and pagination. */}
      <div aria-busy={isFetching || view === null} className={cn("relative", view === "table" ? "bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs" : "bmn-grid-panel")}>
        {isFetching && !isLoading && (
          <div className="absolute top-0 left-0 w-full h-1 bg-[var(--ds-surface-muted)] overflow-hidden z-10">
            <div className="h-full bg-[var(--ds-accent-solid)] animate-pulse motion-reduce:animate-none w-1/3 rounded-r-full" />
          </div>
        )}
        {view === null ? (
          <div role="status" aria-label="Menyiapkan tampilan aset" className="bmn-asset-grid">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-72 rounded-3xl bg-[var(--ds-surface-muted)] animate-pulse motion-reduce:animate-none" />)}
          </div>
        ) : view === "grid" ? (
          <>
            {canWrite && (
              <label className="inline-flex items-center gap-2 mb-3 text-xs text-[var(--ds-fg-muted)]">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Pilih semua aset pada halaman ini" className="w-4 h-4 accent-[var(--ds-accent-solid)]" /> Pilih semua pada halaman ini
              </label>
            )}
            {isLoading ? (
              <div role="status" aria-label="Memuat grid aset" className="bmn-asset-grid">
                {[0, 1, 2, 3].map(i => <div key={i} className="h-72 rounded-3xl bg-[var(--ds-surface-muted)] animate-pulse motion-reduce:animate-none" />)}
              </div>
            ) : response?.data?.length === 0 ? (
              <p role="status" className="p-10 text-center text-sm text-[var(--ds-fg-muted)]">Tidak ada data ditemukan</p>
            ) : (
              <div role="list" aria-label="Grid aset BMN" className="bmn-asset-grid">
                {response?.data?.map(asset => {
                  const pengguna = getAssetUser(asset);
                  const modifiedLabel = formatModifiedDate(asset.updated_at);
                  return (
                  <article key={asset.id} role="listitem" className="bmn-asset-card" data-selected={selectedIds.has(asset.id)}>
                    <div className="relative">
                      <AssetPhotoPreview photo={getPrimaryPhoto(asset)} name={asset.nama_barang} nup={asset.nup} />
                      {canWrite && <label className="bmn-card-checkbox"><input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} aria-label={`Pilih aset ${asset.nama_barang} NUP ${asset.nup}`} className="w-4 h-4 accent-[var(--ds-accent-solid)]" /></label>}
                    </div>
                    <div className="bmn-card-body">
                      <Link href={`/bmn/assets/${asset.id}`} className="bmn-card-name" title={asset.nama_barang}>{asset.nama_barang}</Link>
                      {asset.merk_tipe && <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-2">{deduplicateMerkTipe(asset.merk_tipe)}</p>}
                      <p className="bmn-card-code tabular-nums">{asset.kode_barang}<br />NUP: {asset.nup}</p>
                      {asset.nup_lama?.trim() && <p className="text-xs text-[var(--ds-fg-muted)] tabular-nums">NUP Lama: {asset.nup_lama}</p>}
                      <div><AssetCondition value={asset.kondisi} /></div>
                      <p className="text-sm font-semibold break-words tabular-nums">{formatRupiah(asset.nilai_perolehan)}</p>
                      <p className="text-xs text-[var(--ds-fg-muted)] line-clamp-2" title={asset.lokasi_ruang || asset.lokasi_spesifik || "-"}>{shortenLokasi(asset.lokasi_ruang || asset.lokasi_spesifik || "-")}</p>
                      {modifiedLabel && <p className="text-xs text-[var(--ds-fg-muted)] tabular-nums">Diubah: {modifiedLabel}</p>}
                      {pengguna && <p className="text-xs text-[var(--ds-fg-muted)]" title={pengguna}><UserRound className="inline w-3 h-3 mr-1" aria-hidden="true" />Pengguna: {pengguna}</p>}
                      {asset.tags?.length ? <AssetTagsList tags={asset.tags} maxVisible={1} onManageTags={canUpdate ? () => setEditingAssetForTags(asset) : undefined} /> : canUpdate && <button type="button" onClick={() => setEditingAssetForTags(asset)} className="self-start text-xs text-[var(--ds-accent-fg)] inline-flex items-center gap-1"><TagIcon className="w-3 h-3" /> Kelola tag</button>}
                      {asset.active_loan && <span data-status="info" className="text-xs px-2 py-1 rounded-full">Dipinjam: {asset.active_loan.borrower_name}</span>}
                      {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.tanggal_pajak_stnk && <StnkBadge tanggal={asset.tanggal_pajak_stnk} />}
                      <div className="mt-auto pt-2 flex items-center justify-between gap-1">
                        <Link href={`/bmn/assets/${asset.id}`} aria-label={`Lihat detail ${asset.nama_barang}`} className="bmn-icon-action inline-flex items-center gap-1 rounded-lg px-2 min-h-9 text-xs"><Eye className="w-4 h-4" /> Detail</Link>
                        {canDispose && <button type="button" aria-label={`Dispose aset ${asset.nama_barang}`} onClick={() => handleDispose(asset.id)} className="bmn-icon-danger min-h-9 min-w-9 rounded-lg p-2"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </>
        ) : (
        <div className="overflow-x-auto">
          <table aria-label="Daftar aset BMN" aria-busy={isFetching} className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/30">
                {canWrite && (
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Pilih semua aset pada halaman ini" className="w-4 h-4 accent-[var(--ds-accent-solid)]" />
                  </th>
                )}
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Kode / NUP</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Jenis BMN</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Nama Barang</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Kondisi</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-right">Nilai Perolehan</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider">Lokasi</th>
                <th className="px-4 py-3 text-xs font-bold text-[var(--ds-fg-muted)] uppercase tracking-wider text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse motion-reduce:animate-none">
                    <td colSpan={canWrite ? 8 : 7} className="px-6 py-4">
                      <div className="h-10 bg-[var(--ds-surface-muted)] rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : response?.data?.length === 0 ? (
                <tr><td colSpan={canWrite ? 8 : 7} className="p-12 text-center"><Package className="w-10 h-10 mx-auto mb-2 text-[var(--ds-fg-muted)]" /><p className="text-sm text-[var(--ds-fg-muted)]">Tidak ada data ditemukan</p></td></tr>
              ) : (
                response?.data?.map((asset) => (
                  <tr key={asset.id} aria-selected={selectedIds.has(asset.id)} className="bmn-table-row">
                    {canWrite && (
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selectedIds.has(asset.id)} onChange={() => toggleSelect(asset.id)} aria-label={`Pilih aset ${asset.nama_barang} NUP ${asset.nup}`} className="w-4 h-4 accent-[var(--ds-accent-solid)]" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="text-xs font-mono font-bold text-[var(--ds-accent-fg)] tabular-nums">{asset.kode_barang}</p>
                      <p className="text-xs text-[var(--ds-fg-muted)] font-mono tabular-nums">NUP: {asset.nup}</p>
                      {asset.nup_lama && <p className="text-xs text-[var(--ds-fg-muted)] font-mono tabular-nums">NUP Lama: {asset.nup_lama}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-[var(--ds-fg-muted)]">{asset.jenis_bmn || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-[var(--ds-fg)] max-w-[200px] truncate">{asset.nama_barang}</p>
                      <p className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
                        {deduplicateMerkTipe(asset.merk_tipe)}
                        {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.no_polisi && asset.no_polisi !== "-" ? ` • ${asset.no_polisi}` : ""}
                        {" • "}{asset.tahun_perolehan || "-"}
                      </p>
                      {formatModifiedDate(asset.updated_at) && (
                        <p className="text-[11px] text-[var(--ds-fg-muted)] tabular-nums">
                          Diubah: {formatModifiedDate(asset.updated_at)}
                        </p>
                      )}
                      {asset.tags && asset.tags.length > 0 ? (
                        <AssetTagsList
                          tags={asset.tags}
                          maxVisible={2}
                          onManageTags={canUpdate ? () => setEditingAssetForTags(asset) : undefined}
                        />
                      ) : canUpdate ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAssetForTags(asset);
                          }}
                          className="inline-flex items-center gap-1 mt-1 text-xs text-[var(--ds-fg-muted)] hover:text-[var(--ds-accent-fg)] transition-colors cursor-pointer"
                          title="Kelola tag untuk aset ini"
                        >
                          <TagIcon className="w-3 h-3 opacity-60" />
                          <span>+ Tag</span>
                        </button>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <AssetCondition value={asset.kondisi} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-[var(--ds-fg)] tabular-nums">{formatRupiah(asset.nilai_perolehan)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-[var(--ds-fg-muted)]">{shortenLokasi(asset.lokasi_ruang || asset.lokasi_spesifik || "-")}</p>
                      {asset.pengguna && (
                        <p className="text-xs text-[var(--ds-fg-muted)]"><UserRound className="inline w-3 h-3 mr-1" aria-hidden="true" />{asset.pengguna}</p>
                      )}
                      {asset.active_loan && (
                        <span data-status="info" className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold mt-1">
                          <Handshake className="w-3 h-3" aria-hidden="true" /> Dipinjam: {asset.active_loan.borrower_name}
                        </span>
                      )}
                      {asset.jenis_bmn === "ALAT ANGKUTAN BERMOTOR" && asset.tanggal_pajak_stnk && (
                        <StnkBadge tanggal={asset.tanggal_pajak_stnk} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/bmn/assets/${asset.id}`}
                          aria-label={`Lihat detail ${asset.nama_barang}`}
                          className="bmn-icon-action min-h-9 min-w-9 flex items-center justify-center p-2 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canDispose && (
                          <button
                            type="button"
                            onClick={() => handleDispose(asset.id)}
                            aria-label={`Dispose aset ${asset.nama_barang}`}
                            className="bmn-icon-danger min-h-9 min-w-9 flex items-center justify-center p-2 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
        {/* Pagination */}
        <div className="bmn-pagination px-4 py-3 border-t border-slate-200/70 dark:border-zinc-800 flex flex-wrap gap-3 items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-[var(--ds-fg-muted)] text-xs tabular-nums">{response?.data?.length || 0} item ditampilkan</span>
            <select
              aria-label="Jumlah aset per halaman"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); }}
              className="h-8 px-2 text-xs border border-slate-200/80 dark:border-zinc-800 rounded-lg bg-[var(--ds-surface)] text-[var(--ds-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-ring)]"
            >
              <option value={10}>10 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
              <option value={0}>2.000 / halaman</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage(p => p - 1)} className="bmn-button bmn-secondary text-xs rounded-lg">Sebelumnya</Button>
            <span className="flex items-center text-xs text-[var(--ds-fg-muted)] px-2 tabular-nums">Hal {page}{response?.meta?.last_page ? ` / ${response.meta.last_page}` : ""}</span>
            <Button variant="outline" size="sm" disabled={isFetching || page >= (response?.meta?.last_page ?? page)} onClick={() => setPage(p => p + 1)} className="bmn-button bmn-secondary text-xs rounded-lg">Berikutnya</Button>
          </div>
        </div>
      </div>

      {/* Dialog Kelola Tag Massal */}
      <TagAssignmentDialog
        isOpen={showBulkTagDialog}
        onClose={() => setShowBulkTagDialog(false)}
        title={`Kelola Tag untuk ${selectedIds.size} Aset Terpilih`}
        description="Tambah, lepas, atau gantikan tag pada seluruh aset yang sedang dicentang."
        activeTags={selectedActiveTags}
        totalSelectedAssets={selectedIds.size}
        isBulk={true}
        onSave={async (tagIds, action) => {
          try {
            const res = await api.post("/bmn/tags/bulk-assign", {
              asset_ids: Array.from(selectedIds),
              tag_ids: tagIds,
              action,
            });
            toast.success(res.data?.message || "Tag aset berhasil diperbarui.");
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
            queryClient.invalidateQueries({ queryKey: ["bmn-tags"] });
          } catch {
            toast.error("Gagal memperbarui tag aset terpilih.");
          }
        }}
      />

      {/* Dialog Kelola Tag Single Aset (klik badge dari baris tabel) */}
      {editingAssetForTags && (
        <TagAssignmentDialog
          isOpen={Boolean(editingAssetForTags)}
          onClose={() => setEditingAssetForTags(null)}
          title={`Kelola Tag: ${editingAssetForTags.nama_barang}`}
          description={`NUP: ${editingAssetForTags.nup} • Pilih tag yang ingin dipasang atau dilepas.`}
          initialTagIds={editingAssetForTags.tags?.map((t) => t.id) || []}
          totalSelectedAssets={1}
          isBulk={false}
          onSave={async (tagIds) => {
            try {
              await api.post(`/bmn/assets/${editingAssetForTags.id}/tags`, { tag_ids: tagIds });
              toast.success("Tag aset berhasil diperbarui.");
              setEditingAssetForTags(null);
              queryClient.invalidateQueries({ queryKey: ["bmn-assets"] });
              queryClient.invalidateQueries({ queryKey: ["bmn-tags"] });
            } catch {
              toast.error("Gagal memperbarui tag aset.");
            }
          }}
        />
      )}
    </div>
  );
}

function AssetCondition({ value }: { value: string }) {
  const status = value === "Baik" ? "success" : value === "Rusak Ringan" ? "warning" : value === "Rusak Berat" ? "danger" : "neutral";
  return <span data-status={status} className="inline-flex px-2 py-1 rounded-full text-xs font-semibold">{value}</span>;
}

function StnkBadge({ tanggal }: { tanggal: string }) {
  const today = new Date();
  const target = new Date(tanggal);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span data-status="danger" className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold mt-1 tabular-nums">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Pajak expired {Math.abs(diffDays)} hari
      </span>
    );
  }
  if (diffDays <= 30) {
    return (
      <span data-status="warning" className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold mt-1 tabular-nums">
        <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Pajak {diffDays} hari lagi
      </span>
    );
  }
  return null;
}
