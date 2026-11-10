"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  LayoutGrid,
  List,
  Check,
  Package,
  Camera,
  Loader2,
  Boxes,
  Layers,
  Car,
  Laptop,
  Compass,
  X,
  ArrowRight,
  ShieldAlert,
  User,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { getPrimaryPhoto } from "@/app/bmn/_lib/asset-photos";
import { getAssetUser } from "@/app/bmn/_lib/asset-utils";
export { getPrimaryPhoto, resolvePhotoUrl } from "@/app/bmn/_lib/asset-photos";
export { getAssetUser } from "@/app/bmn/_lib/asset-utils";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";

export interface LoanAsset {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  nup_lama: string | null;
  merk: string | null;
  merk_tipe: string | null;
  tipe?: string | null;
  kondisi: string;
  status_bmn: string;
  pengguna: string | null;
  nama_pengguna?: string | null;
  penanggung_jawab?: {
    id: string;
    nama_lengkap: string;
    nip?: string | null;
  } | null;
  active_loan?: {
    id: string;
    borrower_name: string;
    borrower_nip?: string | null;
    loan_date?: string | null;
    due_date?: string | null;
    status: string;
  } | null;
  no_polisi: string | null;
  lokasi_ruang: string | null;
  jenis_bmn: string | null;
  foto_geotag_url?: string | null;
  foto_geotag_path?: string | null;
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_lokasi_url?: string | null;
  foto_url?: string | null;
}

const NON_LOANABLE_TYPES = new Set([
  "BANGUNAN DAN GEDUNG",
  "TANAH",
  "RUMAH NEGARA",
  "BANGUNAN AIR",
]);

export function formatMerkTipe(merk?: string | null, tipe?: string | null, merkTipe?: string | null): string | null {
  const parts = [merk, tipe, merkTipe].filter(Boolean).join(" ").split(/[\s,]+/).filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join(" ") : null;
}

interface AssetCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: LoanAsset[];
  onAddAssets: (assets: LoanAsset[]) => void;
}

type CategoryType = "all" | "kendaraan" | "it" | "lapangan";

export function AssetCatalogModal({
  open,
  onOpenChange,
  selectedAssets,
  onAddAssets,
}: AssetCatalogModalProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [assets, setAssets] = useState<LoanAsset[]>([]);
  const [tempSelectedMap, setTempSelectedMap] = useState<Record<string, LoanAsset>>({});
  const [failedImgMap, setFailedImgMap] = useState<Record<string, boolean>>({});

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeCategory]);

  // Sync initial selection map whenever modal opens
  useEffect(() => {
    if (open) {
      const initialMap: Record<string, LoanAsset> = {};
      selectedAssets.forEach((a) => {
        initialMap[a.id] = a;
      });
      setTempSelectedMap(initialMap);
    }
  }, [open, selectedAssets]);

  // Fetch assets from backend
  useEffect(() => {
    if (!open) return;

    const fetchAssets = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page,
          per_page: 10,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (activeCategory === "kendaraan") {
          params.jenis_bmn = "ALAT ANGKUTAN BERMOTOR";
        } else if (activeCategory === "it") {
          params.jenis_bmn = "MESIN PERALATAN KHUSUS TIK";
        }

        const res = await api.get("/bmn/assets", { params });
        const rawData: LoanAsset[] = res.data.data || [];
        const lastPage = res.data.meta?.last_page ?? 1;
        const total = res.data.meta?.total ?? null;

        // Exclude unloanable immovable assets (Tanah, Bangunan/Pagar, Rumah Negara)
        const loanable = rawData.filter((item) => {
          if (item.jenis_bmn && NON_LOANABLE_TYPES.has(item.jenis_bmn.toUpperCase())) {
            return false;
          }
          if (activeCategory === "lapangan") {
            const j = (item.jenis_bmn || "").toUpperCase();
            return j === "MESIN PERALATAN NON TIK" || j === "ALAT BESAR" || j === "ALAT PERSENJATAAN";
          }
          return true;
        });

        if (page === 1) {
          setAssets(loanable);
        } else {
          setAssets((prev) => {
            const seen = new Set(prev.map((a) => a.id));
            return [...prev, ...loanable.filter((a) => !seen.has(a.id))];
          });
        }

        setHasMore(page < lastPage);
        setTotalCount(total);
      } catch (err) {
        console.error("Gagal memuat katalog aset", err);
        toast.error("Gagal memuat data katalog aset.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [open, debouncedSearch, activeCategory, page]);

  const toggleSelectAsset = (asset: LoanAsset) => {
    if (asset.active_loan) {
      toast.error(
        `Aset "${asset.nama_barang}" sedang dipinjam oleh ${asset.active_loan.borrower_name}${
          asset.active_loan.due_date ? ` (s.d. ${asset.active_loan.due_date})` : ""
        }. Tidak dapat dipinjam kembali saat ini.`
      );
      return;
    }

    const isDamaged = asset.kondisi === "Rusak Berat";
    if (isDamaged) {
      toast.error(`Aset "${asset.nama_barang}" dalam kondisi Rusak Berat dan tidak layak dipinjam.`);
      return;
    }
    if (asset.status_bmn && asset.status_bmn !== "Aktif") {
      toast.error(`Aset "${asset.nama_barang}" berstatus ${asset.status_bmn} (tidak tersedia).`);
      return;
    }

    setTempSelectedMap((prev) => {
      const next = { ...prev };
      if (next[asset.id]) {
        delete next[asset.id];
      } else {
        next[asset.id] = asset;
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const list = Object.values(tempSelectedMap);
    onAddAssets(list);
    onOpenChange(false);
    toast.success(`${list.length} barang masuk ke daftar peminjaman.`);
  };

  const tempSelectedCount = Object.keys(tempSelectedMap).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-full sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] h-[92vh] max-h-[92vh] p-0 flex flex-col bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-emerald-600" />
                <span>Katalog Aset BMN Layak Pinjam</span>
                {!loading && (
                  <Badge variant="secondary" className="text-xs font-mono font-medium px-2 py-0.5 ml-1">
                    {totalCount ? `${assets.length} dari ${totalCount} Aset` : `${assets.length} Aset`}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Pilih satu atau beberapa aset operasional berfoto untuk diajukan peminjamannya.
              </DialogDescription>
            </div>

            {/* View Switcher */}
            <div className="flex items-center self-start sm:self-auto bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-300/40 dark:border-zinc-700/40 mr-8">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5",
                  viewMode === "grid"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
                title="Tampilan Grid Kartu Berfoto"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-all text-xs font-medium flex items-center gap-1.5",
                  viewMode === "list"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
                title="Tampilan List Baris Kompak"
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Category Chips */}
          <div className="mt-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, merk, tipe, kode barang, NUP, atau nomor polisi..."
                className="pl-10 pr-9 h-11 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus-visible:ring-emerald-500 shadow-sm"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "Semua Layak Pinjam", icon: Layers },
                { id: "kendaraan", label: "Kendaraan Bermotor", icon: Car },
                { id: "it", label: "IT & Komputer", icon: Laptop },
                { id: "lapangan", label: "Peralatan Lapangan", icon: Compass },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as CategoryType)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border",
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </DialogHeader>

        {/* Modal Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/50 dark:bg-zinc-950/40">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-7 h-7 mx-auto mb-3 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Memuat katalog aset...</p>
              <p className="text-xs text-zinc-400 mt-1">Menyiapkan foto dokumentasi dan data BMN</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tidak ada aset ditemukan</p>
              <p className="text-xs text-zinc-400 mt-1">Coba gunakan kata kunci lain atau ubah kategori</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ================= GRID VIEW ================= */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {assets.map((asset) => {
                const photo = getPrimaryPhoto(asset);
                const isSelected = Boolean(tempSelectedMap[asset.id]);
                const isDamaged = asset.kondisi === "Rusak Berat";
                const isLoaned = Boolean(asset.active_loan);
                const isUnavailable = (asset.status_bmn && asset.status_bmn !== "Aktif") || isDamaged || isLoaned;
                const hasValidThumb = Boolean(photo?.url && !failedImgMap[`${asset.id}-${photo.label}`]);
                const userInCharge = getAssetUser(asset);

                return (
                  <div
                    key={`modal-grid-${asset.id}`}
                    onClick={() => toggleSelectAsset(asset)}
                    className={cn(
                      "bg-white dark:bg-zinc-900 rounded-xl border transition-all flex flex-col overflow-hidden relative group select-none shadow-xs",
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-md bg-emerald-50/20 dark:bg-emerald-950/10 cursor-pointer"
                        : isUnavailable
                        ? "opacity-75 cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                    )}
                  >
                    {/* Photo Top Container */}
                    <div className="aspect-[16/10] bg-zinc-100 dark:bg-zinc-800/60 relative flex items-center justify-center overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                      {hasValidThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo!.url}
                          alt={asset.nama_barang}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImgMap((prev) => ({ ...prev, [`${asset.id}-${photo!.label}`]: true }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-zinc-400">
                          <Camera className="w-7 h-7 stroke-[1.5]" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Belum ada foto</span>
                        </div>
                      )}

                      {/* Photo Source Badge */}
                      {photo && (
                        <span className="absolute top-2 left-2 text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-zinc-900/80 text-white backdrop-blur-sm border border-white/20">
                          {photo.label}
                        </span>
                      )}

                      {/* Plate Badge */}
                      {asset.no_polisi && asset.no_polisi !== "-" && (
                        <span className="absolute top-2 right-10 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase bg-blue-600 text-white shadow-sm">
                          {asset.no_polisi}
                        </span>
                      )}

                      {/* Loan Status Banner on Photo */}
                      {isLoaned && (
                        <span className="absolute bottom-2 left-2 text-[8.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500 text-white shadow-md flex items-center gap-1 border border-amber-300/40">
                          <Clock className="w-3 h-3" />
                          Sedang Dipinjam
                        </span>
                      )}

                      {/* Selection Check Circle / Lock */}
                      <div
                        className={cn(
                          "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all border",
                          isLoaned
                            ? "bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-sm"
                            : isSelected
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-md scale-105"
                            : "bg-white/95 dark:bg-zinc-900/95 border-zinc-300 dark:border-zinc-600 text-transparent hover:border-emerald-500"
                        )}
                        title={isLoaned ? `Sedang dipinjam oleh ${asset.active_loan?.borrower_name}` : undefined}
                      >
                        {isLoaned ? <Clock className="w-3 h-3" /> : <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div className="min-w-0">
                        <div className="mb-0.5">
                          <h4
                            className={cn(
                              "text-xs sm:text-sm font-bold line-clamp-1 leading-snug",
                              isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100"
                            )}
                            title={asset.nama_barang}
                          >
                            {asset.nama_barang}
                          </h4>
                        </div>
                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                          <p
                            className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-1 font-medium"
                            title={formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) || ""}
                          >
                            {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap text-[9.5px] font-mono text-zinc-500 dark:text-zinc-400">
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-600 dark:text-zinc-300 font-semibold">
                            {asset.kode_barang}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">NUP {asset.nup}</span>
                          {asset.nup_lama && <span className="text-zinc-400">(Lama: {asset.nup_lama})</span>}
                        </div>

                        {/* Status Pengguna Pegawai */}
                        {userInCharge && (
                          <div
                            className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-200 mt-2 bg-zinc-50 dark:bg-zinc-800/60 px-2 py-1 rounded-md border border-zinc-200/70 dark:border-zinc-700/70"
                            title={`Aset ini ditugaskan/digunakan oleh: ${userInCharge}`}
                          >
                            <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <div className="min-w-0 flex-1 text-[10.5px] leading-tight">
                              <span className="text-zinc-400 font-medium">Pengguna:</span>{" "}
                              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{userInCharge}</span>
                            </div>
                          </div>
                        )}

                        {/* Status Peminjaman Aktif */}
                        {asset.active_loan && (
                          <div className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300 mt-2 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/50">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 text-[10.5px] leading-tight">
                              <span className="font-bold text-amber-900 dark:text-amber-200">Sedang Dipinjam:</span>{" "}
                              <span className="font-semibold block truncate">{asset.active_loan.borrower_name}</span>
                              {asset.active_loan.due_date && (
                                <span className="text-amber-700 dark:text-amber-400 block text-[9.5px] mt-0.5">
                                  Batas: {asset.active_loan.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                        <span
                          className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                            asset.kondisi === "Baik"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                              : asset.kondisi === "Rusak Ringan"
                              ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
                              : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20"
                          )}
                        >
                          {asset.kondisi}
                        </span>

                        {isLoaned ? (
                          <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400">
                            Dipinjam
                          </span>
                        ) : asset.lokasi_ruang ? (
                          <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]" title={asset.lokasi_ruang}>
                            📍 {asset.lokasi_ruang}
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium">Siap Pinjam</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= LIST VIEW ================= */
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {assets.map((asset) => {
                const photo = getPrimaryPhoto(asset);
                const isSelected = Boolean(tempSelectedMap[asset.id]);
                const isDamaged = asset.kondisi === "Rusak Berat";
                const isLoaned = Boolean(asset.active_loan);
                const isUnavailable = (asset.status_bmn && asset.status_bmn !== "Aktif") || isDamaged || isLoaned;
                const hasValidThumb = Boolean(photo?.url && !failedImgMap[`${asset.id}-${photo.label}`]);
                const userInCharge = getAssetUser(asset);

                return (
                  <div
                    key={`modal-list-${asset.id}`}
                    onClick={() => toggleSelectAsset(asset)}
                    className={cn(
                      "p-3.5 flex items-center gap-3.5 transition-colors cursor-pointer group",
                      isSelected
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20"
                        : isUnavailable
                        ? "opacity-75 cursor-not-allowed bg-zinc-50/60 dark:bg-zinc-850/40"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    )}
                  >
                    {/* Checkbox / Loan Lock */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-all border shrink-0",
                        isLoaned
                          ? "bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-sm"
                          : isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-zinc-300 dark:border-zinc-600 text-transparent group-hover:border-emerald-500"
                      )}
                      title={isLoaned ? `Sedang dipinjam oleh ${asset.active_loan?.borrower_name}` : undefined}
                    >
                      {isLoaned ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Small Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 overflow-hidden relative border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs">
                      {hasValidThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo!.url}
                          alt={asset.nama_barang}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImgMap((prev) => ({ ...prev, [`${asset.id}-${photo!.label}`]: true }))}
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-zinc-400 stroke-[1.5]" />
                      )}
                      {photo && (
                        <span className="absolute bottom-1 left-1 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-zinc-900/80 text-white backdrop-blur-xs">
                          {photo.label}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("text-sm font-bold", isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100")}>
                          {asset.nama_barang}
                        </span>
                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            • {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                          </span>
                        )}
                        {asset.no_polisi && asset.no_polisi !== "-" && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                            🚗 {asset.no_polisi}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex-wrap">
                        <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300 font-semibold">
                          {asset.kode_barang}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">NUP {asset.nup}</span>
                        {asset.nup_lama && <span className="text-zinc-400">(Lama: {asset.nup_lama})</span>}
                        {asset.lokasi_ruang && (
                          <span className="text-zinc-500 font-sans">
                            • 📍 <span className="font-medium">{asset.lokasi_ruang}</span>
                          </span>
                        )}
                      </div>

                      {/* Status Pengguna & Status Pinjam Tags */}
                      <div className="flex items-center gap-2 flex-wrap mt-1.5 font-sans">
                        {userInCharge && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200/80 dark:border-zinc-700/80">
                            <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Pengguna: <strong className="font-semibold">{userInCharge}</strong></span>
                          </span>
                        )}

                        {asset.active_loan && (
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50 font-medium">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Sedang Dipinjam: <strong className="font-bold">{asset.active_loan.borrower_name}</strong> {asset.active_loan.due_date ? `(s.d. ${asset.active_loan.due_date})` : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Condition & Availability Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span
                        className={cn(
                          "text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider",
                          asset.kondisi === "Baik"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20"
                            : asset.kondisi === "Rusak Ringan"
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-500/20"
                            : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20"
                        )}
                      >
                        {asset.kondisi}
                      </span>

                      {isLoaned ? (
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          Dipinjam
                        </span>
                      ) : (
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Tersedia
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {!loading && hasMore && (
            <div className="py-6 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl text-xs h-9 px-5 font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-xs"
              >
                <span>Muat Lebih Banyak (+10 Aset)</span>
              </Button>
            </div>
          )}
          {loading && page > 1 && (
            <div className="py-4 text-center">
              <Loader2 className="w-5 h-5 mx-auto animate-spin text-emerald-600" />
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Action Bar */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              {tempSelectedCount} barang dipilih
            </span>
            {tempSelectedCount > 0 && (
              <button
                type="button"
                onClick={() => setTempSelectedMap({})}
                className="text-[11px] text-red-600 hover:underline font-medium ml-2"
              >
                Kosongkan Pilihan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 px-4 rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="text-xs h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <span>Masukkan ke Form Pinjam ({tempSelectedCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
