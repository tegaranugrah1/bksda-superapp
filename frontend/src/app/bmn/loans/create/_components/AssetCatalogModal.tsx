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
      <DialogContent data-module="bmn" className="bmn-assets-ui bmn-standard-ui bmn-popover w-[96vw] max-w-full sm:max-w-[95vw] md:max-w-[92vw] lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] h-[92vh] max-h-[92vh] p-0 flex flex-col bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)] shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-[var(--ds-fg)] flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[var(--ds-accent-fg)]" />
                <span>Katalog Aset BMN Layak Pinjam</span>
                {!loading && (
                  <Badge variant="secondary" className="text-xs font-mono font-medium px-2 py-0.5 ml-1">
                    {totalCount ? `${assets.length} dari ${totalCount} Aset` : `${assets.length} Aset`}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-[var(--ds-fg-muted)] mt-1">
                Pilih satu atau beberapa aset operasional berfoto untuk diajukan peminjamannya.
              </DialogDescription>
            </div>

            {/* View Switcher */}
            <div className="flex items-center self-start sm:self-auto bg-[var(--ds-surface-muted)]  p-0.5 rounded-lg border border-[var(--ds-border-subtle)] mr-8">
              <button
                type="button"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-colors duration-150 text-xs font-medium flex items-center gap-1.5",
                  viewMode === "grid"
                    ? "bg-[var(--ds-surface-raised)] text-[var(--ds-fg)] shadow-sm"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] "
                )}
                title="Tampilan Grid Kartu Berfoto"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md transition-colors duration-150 text-xs font-medium flex items-center gap-1.5",
                  viewMode === "list"
                    ? "bg-[var(--ds-surface-raised)] text-[var(--ds-fg)] shadow-sm"
                    : "text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)] "
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
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ds-fg-muted)]" />
              <Input
                aria-label="Cari katalog aset"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, merk, tipe, kode barang, NUP, atau nomor polisi..."
                className="pl-10 pr-9 h-11 bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] rounded-xl text-sm focus-visible:ring-[var(--ds-accent-fg)] shadow-sm"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--ds-fg-muted)] hover:text-[var(--ds-fg-secondary)]  p-1 rounded-md"
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
                    aria-pressed={isActive}
                    type="button"
                    onClick={() => setActiveCategory(tab.id as CategoryType)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-150 flex items-center gap-1.5 border",
                      isActive
                        ? "bmn-primary"
                        : "bg-[var(--ds-surface)] text-[var(--ds-fg-muted)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)]"
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[var(--ds-surface-muted)]">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-7 h-7 mx-auto mb-3 animate-spin text-[var(--ds-accent-fg)]" />
              <p className="text-sm font-medium text-[var(--ds-fg-muted)]">Memuat katalog aset...</p>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">Menyiapkan foto dokumentasi dan data BMN</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="py-20 text-center">
              <Package className="w-12 h-12 mx-auto mb-3 text-[var(--ds-fg-muted)]" />
              <p className="text-sm font-semibold text-[var(--ds-fg-muted)]">Tidak ada aset ditemukan</p>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">Coba gunakan kata kunci lain atau ubah kategori</p>
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
                    role="checkbox"
                    tabIndex={isUnavailable ? -1 : 0}
                    aria-checked={isSelected}
                    aria-disabled={Boolean(isUnavailable)}
                    aria-label={`Pilih ${asset.nama_barang} NUP ${asset.nup}`}
                    onKeyDown={(event) => { if (!isUnavailable && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); toggleSelectAsset(asset); } }}
                    onClick={() => { if (!isUnavailable) toggleSelectAsset(asset); }}
                    className={cn(
                      "bmn-choice-card bg-[var(--ds-surface)] rounded-xl border transition-colors duration-150 flex flex-col overflow-hidden relative group select-none shadow-xs",
                      isSelected
                        ? "border-[var(--ds-accent-fg)] bg-[var(--ds-accent-soft)] cursor-pointer"
                        : isUnavailable
                        ? "opacity-75 cursor-default border-[var(--ds-border-subtle)] bg-[var(--ds-surface-muted)]"
                        : "border-[var(--ds-border-subtle)] cursor-pointer"
                    )}
                  >
                    {/* Photo Top Container */}
                    <div className="aspect-[16/10] bg-[var(--ds-surface-muted)] relative flex items-center justify-center overflow-hidden border-b border-[var(--ds-border-subtle)]">
                      {hasValidThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo!.url}
                          alt={asset.nama_barang}
                          className="w-full h-full object-cover "
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImgMap((prev) => ({ ...prev, [`${asset.id}-${photo!.label}`]: true }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[var(--ds-fg-muted)]">
                          <Camera className="w-7 h-7 stroke-[1.5]" />
                          <span className="text-xs font-bold uppercase tracking-wider">Belum ada foto</span>
                        </div>
                      )}

                      {/* Photo Source Badge */}
                      {photo && (
                        <span className="absolute top-2 left-2 text-xs px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-[var(--ds-surface)] text-[var(--ds-fg)] border border-[var(--ds-border-subtle)]">
                          {photo.label}
                        </span>
                      )}

                      {/* Plate Badge */}
                      {asset.no_polisi && asset.no_polisi !== "-" && (
                        <span className="absolute top-2 right-10 text-xs px-2 py-0.5 rounded font-mono font-bold uppercase bg-[var(--ds-fg)] text-[var(--ds-surface)] shadow-sm">
                          {asset.no_polisi}
                        </span>
                      )}

                      {/* Loan Status Banner on Photo */}
                      {isLoaned && (
                        <span data-status="info" className="absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Sedang Dipinjam
                        </span>
                      )}

                      {/* Selection Check Circle / Lock */}
                      <div
                        className={cn(
                          "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-150 border",
                          isLoaned
                            ? "bg-[var(--ds-status-warning-bg)] border-[var(--ds-status-warning-border)] text-[var(--ds-status-warning-fg)] shadow-sm"
                            : isSelected
                            ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                            : "bg-[var(--ds-surface)] border-[var(--ds-border-control)]  text-transparent hover:border-[var(--ds-accent-fg)]"
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
                              isSelected ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg)]"
                            )}
                            title={asset.nama_barang}
                          >
                            {asset.nama_barang}
                          </h4>
                        </div>
                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                          <p
                            className="text-xs text-[var(--ds-fg-muted)] line-clamp-1 mb-1 font-medium"
                            title={formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) || ""}
                          >
                            {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono text-[var(--ds-fg-muted)]">
                          <span className="bg-[var(--ds-surface-muted)] px-1.5 py-0.2 rounded text-[var(--ds-fg-muted)] font-semibold">
                            {asset.kode_barang}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-[var(--ds-accent-fg)]">NUP {asset.nup}</span>
                          {asset.nup_lama && <span className="text-[var(--ds-fg-muted)]">(Lama: {asset.nup_lama})</span>}
                        </div>

                        {/* Status Pengguna Pegawai */}
                        {userInCharge && (
                          <div
                            className="flex items-center gap-1.5 text-xs text-[var(--ds-fg-secondary)]  mt-2 bg-[var(--ds-surface-muted)] px-2 py-1 rounded-md border border-[var(--ds-border-subtle)]"
                            title={`Aset ini ditugaskan/digunakan oleh: ${userInCharge}`}
                          >
                            <User className="w-3 h-3 text-[var(--ds-accent-fg)] shrink-0" />
                            <div className="min-w-0 flex-1 text-xs leading-tight">
                              <span className="text-[var(--ds-fg-muted)] font-medium">Pengguna:</span>{" "}
                              <span className="font-semibold text-[var(--ds-fg)] truncate">{userInCharge}</span>
                            </div>
                          </div>
                        )}

                        {/* Status Peminjaman Aktif */}
                        {asset.active_loan && (
                          <div className="flex items-start gap-1.5 text-xs text-[var(--ds-status-warning-fg)] mt-2 bg-[var(--ds-status-warning-bg)] px-2 py-1 rounded-md border border-[var(--ds-status-warning-border)]">
                            <Clock className="w-3 h-3 text-[var(--ds-status-warning-fg)] shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1 text-xs leading-tight">
                              <span className="font-bold text-[var(--ds-status-warning-fg)]">Sedang Dipinjam:</span>{" "}
                              <span className="font-semibold block truncate">{asset.active_loan.borrower_name}</span>
                              {asset.active_loan.due_date && (
                                <span className="text-[var(--ds-status-warning-fg)] block text-xs mt-0.5">
                                  Batas: {asset.active_loan.due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Info */}
                      <div className="mt-2 pt-2 border-t border-[var(--ds-border-subtle)] flex items-center justify-between">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        >
                          {asset.kondisi}
                        </span>

                        {isLoaned ? (
                          <span className="text-xs font-bold text-[var(--ds-status-warning-fg)]">
                            Dipinjam
                          </span>
                        ) : asset.lokasi_ruang ? (
                          <span className="text-xs text-[var(--ds-fg-muted)] truncate max-w-[120px]" title={asset.lokasi_ruang}>
                            Lokasi: {asset.lokasi_ruang}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--ds-accent-fg)] font-medium">{isUnavailable ? "Tidak tersedia" : "Siap Pinjam"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= LIST VIEW ================= */
            <div className="divide-y divide-[var(--ds-border-subtle)] bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] overflow-hidden">
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
                    role="checkbox"
                    tabIndex={isUnavailable ? -1 : 0}
                    aria-checked={isSelected}
                    aria-disabled={Boolean(isUnavailable)}
                    aria-label={`Pilih ${asset.nama_barang} NUP ${asset.nup}`}
                    onKeyDown={(event) => { if (!isUnavailable && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); toggleSelectAsset(asset); } }}
                    onClick={() => { if (!isUnavailable) toggleSelectAsset(asset); }}
                    className={cn(
                      "bmn-choice-card p-3.5 flex flex-wrap sm:flex-nowrap items-center gap-3.5 transition-colors cursor-pointer group",
                      isSelected
                        ? "bg-[var(--ds-accent-soft)]"
                        : isUnavailable
                        ? "opacity-75 cursor-default bg-[var(--ds-surface-muted)]"
                        : "hover:bg-[var(--ds-surface-muted)]"
                    )}
                  >
                    {/* Checkbox / Loan Lock */}
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-colors duration-150 border shrink-0",
                        isLoaned
                          ? "bg-[var(--ds-status-warning-bg)] border-[var(--ds-status-warning-border)] text-[var(--ds-status-warning-fg)] shadow-sm"
                          : isSelected
                          ? "bg-[var(--ds-accent-solid)] border-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                          : "border-[var(--ds-border-control)]  text-transparent group-hover:border-[var(--ds-accent-fg)]"
                      )}
                      title={isLoaned ? `Sedang dipinjam oleh ${asset.active_loan?.borrower_name}` : undefined}
                    >
                      {isLoaned ? <Clock className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    {/* Small Thumbnail */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[var(--ds-surface-muted)] text-[var(--ds-fg-muted)] flex items-center justify-center shrink-0 overflow-hidden relative border border-[var(--ds-border-subtle)] shadow-xs">
                      {hasValidThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo!.url}
                          alt={asset.nama_barang}
                          className="w-full h-full object-cover "
                          referrerPolicy="no-referrer"
                          onError={() => setFailedImgMap((prev) => ({ ...prev, [`${asset.id}-${photo!.label}`]: true }))}
                        />
                      ) : (
                        <Camera className="w-6 h-6 text-[var(--ds-fg-muted)] stroke-[1.5]" />
                      )}
                      {photo && (
                        <span className="absolute bottom-1 left-1 text-xs px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-[var(--ds-surface)] text-[var(--ds-fg)]">
                          {photo.label}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn("text-sm font-bold", isSelected ? "text-[var(--ds-accent-fg)]" : "text-[var(--ds-fg)]")}>
                          {asset.nama_barang}
                        </span>
                        {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe) && (
                          <span className="text-xs text-[var(--ds-fg-muted)] font-medium">
                            • {formatMerkTipe(asset.merk, asset.tipe, asset.merk_tipe)}
                          </span>
                        )}
                        {asset.no_polisi && asset.no_polisi !== "-" && (
                          <span className="text-xs font-mono font-bold text-[var(--ds-status-info-fg)] bg-[var(--ds-status-info-bg)] px-2 py-0.5 rounded border border-[var(--ds-status-info-border)]">
                            No. Polisi: {asset.no_polisi}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono text-[var(--ds-fg-muted)] flex-wrap">
                        <span className="bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded text-[var(--ds-fg-muted)] font-semibold">
                          {asset.kode_barang}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-[var(--ds-accent-fg)]">NUP {asset.nup}</span>
                        {asset.nup_lama && <span className="text-[var(--ds-fg-muted)]">(Lama: {asset.nup_lama})</span>}
                        {asset.lokasi_ruang && (
                          <span className="text-[var(--ds-fg-muted)] font-sans">
                            • Lokasi: <span className="font-medium">{asset.lokasi_ruang}</span>
                          </span>
                        )}
                      </div>

                      {/* Status Pengguna & Status Pinjam Tags */}
                      <div className="flex items-center gap-2 flex-wrap mt-1.5 font-sans">
                        {userInCharge && (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-fg-secondary)]  bg-[var(--ds-surface-muted)] px-2 py-0.5 rounded-md border border-[var(--ds-border-subtle)]">
                            <User className="w-3 h-3 text-[var(--ds-accent-fg)]" />
                            <span>Pengguna: <strong className="font-semibold">{userInCharge}</strong></span>
                          </span>
                        )}

                        {asset.active_loan && (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--ds-status-warning-fg)] bg-[var(--ds-status-warning-bg)] px-2 py-0.5 rounded-md border border-[var(--ds-status-warning-border)] font-medium">
                            <Clock className="w-3 h-3 text-[var(--ds-status-warning-fg)]" />
                            <span>Sedang Dipinjam: <strong className="font-bold">{asset.active_loan.borrower_name}</strong> {asset.active_loan.due_date ? `(s.d. ${asset.active_loan.due_date})` : ''}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Condition & Availability Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span
                        data-status={asset.kondisi === "Baik" ? "success" : asset.kondisi === "Rusak Ringan" ? "warning" : asset.kondisi === "Rusak Berat" ? "danger" : "neutral"}
                        className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                      >
                        {asset.kondisi}
                      </span>

                      {isLoaned ? (
                        <span data-status="info" className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border border-[var(--ds-status-warning-border)]">
                          Dipinjam
                        </span>
                      ) : (
                        <span data-status={isUnavailable ? "neutral" : "success"} className="text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {isUnavailable ? "Tidak tersedia" : "Tersedia"}
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
                className="rounded-xl text-xs h-9 px-5 font-semibold bg-[var(--ds-surface)] border-[var(--ds-border-subtle)] hover:bg-[var(--ds-surface-muted)] shadow-xs"
              >
                <span>Muat Lebih Banyak (+10 Aset)</span>
              </Button>
            </div>
          )}
          {loading && page > 1 && (
            <div className="py-4 text-center">
              <Loader2 className="w-5 h-5 mx-auto animate-spin text-[var(--ds-accent-fg)]" />
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Action Bar */}
        <div className="px-3 sm:px-6 py-3.5 border-t border-[var(--ds-border-subtle)] bg-[var(--ds-surface)] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--ds-fg-muted)]">
              {tempSelectedCount} barang dipilih
            </span>
            {tempSelectedCount > 0 && (
              <button
                type="button"
                onClick={() => setTempSelectedMap({})}
                className="text-xs text-[var(--ds-status-danger-fg)] hover:underline font-medium ml-2"
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
              disabled={tempSelectedCount === 0}
              onClick={handleConfirm}
              className="text-xs min-h-9 h-auto whitespace-normal px-3 py-2 rounded-xl bmn-primary font-semibold flex items-center gap-1.5"
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
