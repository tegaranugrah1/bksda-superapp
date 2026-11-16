"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Plus,
  Search,
  Printer,
  FileText,
  Calendar,
  Building2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { SuratMasuk } from "../_lib/surat-types";
import { ExportSuratMasukModal } from "./_components/ExportSuratMasukModal";
import { BatchPrintDisposisiModal } from "./_components/BatchPrintDisposisiModal";
import { DiteruskanCellPopover } from "./_components/DiteruskanCellPopover";
import { SifatCellPopover } from "./_components/SifatCellPopover";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const [y, m, d] = String(dateStr).split(/[T ]/)[0].split("-");
  return y && m && d ? `${d}/${m}/${y}` : String(dateStr);
}

const PER_PAGE_OPTIONS = ["10", "20", "50", "all"] as const;

export default function SuratMasukListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  // URL state
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const perPageParam = searchParams.get("per_page") || "10";
  const searchParam = searchParams.get("search") || "";
  const sifatParam = searchParams.get("sifat") || "";

  const [page, setPage] = useState<number>(pageParam > 0 ? pageParam : 1);
  const [perPage, setPerPage] = useState<string>(perPageParam);
  const [searchInput, setSearchInput] = useState<string>(searchParam);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);

  // TanStack Query v5 Server-Side Fetching
  const {
    data: apiResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["surat-masuk", { page, perPage, search: searchInput, sifat: sifatParam }],
    queryFn: async () => {
      const res = await api.get("/surat-masuk", {
        params: {
          page: perPage === "all" ? 1 : page,
          per_page: perPage === "all" ? "all" : parseInt(perPage, 10),
          search: searchInput.trim() || undefined,
          sifat: sifatParam || undefined,
        },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 10000,
  });

  const suratList: SuratMasuk[] = useMemo(() => {
    const raw = apiResponse?.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map((d: any) => ({
      id: d.id,
      no_agenda: d.no_agenda || "",
      tanggal_agenda: d.tanggal_agenda || "",
      indeks: d.indeks || "",
      kode: d.kode || "",
      no_surat: d.no_surat || "",
      referensi: d.referensi || "",
      tanggal_penyelesaian: d.tanggal_penyelesaian || "",
      tanggal_surat: d.tanggal_surat || "",
      isi_ringkas: d.isi_ringkas || "",
      asal_surat: d.asal_surat || "",
      lampiran: d.lampiran || "",
      catatan: d.catatan || "",
      sifat_json: d.sifat_json || ["Penting"],
      disposisi: d.disposisi || undefined,
    }));
  }, [apiResponse]);

  const meta = apiResponse?.meta || {
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: suratList.length,
  };

  const totalCount = meta.total ?? suratList.length;
  const isAll = perPage === "all";
  const totalPages = isAll ? 1 : (meta.last_page || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);

  const startRecord = totalCount === 0 ? 0 : isAll ? 1 : (safePage - 1) * parseInt(perPage, 10) + 1;
  const endRecord = isAll ? totalCount : Math.min(safePage * parseInt(perPage, 10), totalCount);

  // Sync to URL
  const updateUrl = useCallback(
    (newPage: number, newPerPage: string, newSearch: string) => {
      const params = new URLSearchParams();
      if (newPage > 1) params.set("page", String(newPage));
      if (newPerPage !== "10") params.set("per_page", newPerPage);
      if (newSearch.trim()) params.set("search", newSearch.trim());
      const qs = params.toString();
      router.replace(`/surat/masuk${qs ? `?${qs}` : ""}`);
    },
    [router]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    setPage(1);
    updateUrl(1, perPage, val);
  };

  const handlePerPageChange = (val: string) => {
    setPerPage(val);
    setPage(1);
    updateUrl(1, val, searchInput);
  };

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, newPage));
    setPage(clamped);
    updateUrl(clamped, perPage, searchInput);
  };

  const toggleSelectItem = (item: SuratMasuk) => {
    const key = String(item.id || item.no_agenda);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allKeys = suratList.map((s) => String(s.id || s.no_agenda));
    const areAllSelected = allKeys.length > 0 && allKeys.every((k) => selectedIds.has(k));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (areAllSelected) {
        allKeys.forEach((k) => next.delete(k));
      } else {
        allKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleItemUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["surat-masuk"] });
  };

  const selectedSuratItems = useMemo(() => {
    return suratList.filter((s) => selectedIds.has(String(s.id || s.no_agenda)));
  }, [suratList, selectedIds]);

  const handleDeleteSurat = async (item: SuratMasuk) => {
    const ok = await confirm({
      title: "Hapus Surat Masuk",
      contentModule: "persuratan",
      contentClassName: "psr-ui",
      description: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-[var(--ds-fg-muted)]">
            Apakah Anda yakin ingin menghapus data surat masuk ini?
          </p>
          <div className="p-4 rounded-lg bg-[var(--ds-surface-muted)] border border-slate-200/70 dark:border-zinc-800 text-xs font-mono font-semibold text-[var(--ds-fg)] break-all text-center select-all">
            {item.no_surat ? `${item.no_surat}` : `Agenda #${item.no_agenda}`}
          </div>
          <p className="text-xs text-[var(--ds-status-danger-fg)] font-medium">
            Tindakan ini akan mengarsipkan surat dan relasi disposisinya.
          </p>
        </div>
      ),
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!ok) return;

    try {
      if (item.id) {
        await api.delete(`/surat-masuk/${item.id}`);
        queryClient.invalidateQueries({ queryKey: ["surat-masuk"] });
        queryClient.invalidateQueries({ queryKey: ["surat"] });
        toast.success(`Surat Masuk (Agenda ${item.no_agenda}) berhasil dihapus.`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Gagal menghapus surat masuk.");
    }
  };

  return (
    <div className="psr-ui w-full p-4 md:p-6 space-y-6 text-[var(--ds-fg)]">
      {/* Enterprise Header Card */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="kpg-support-icon w-10 h-10 rounded-lg bg-[var(--ds-accent-soft)] border border-[var(--ds-accent-soft-border)] text-[var(--ds-accent-fg)] flex items-center justify-center shrink-0">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[var(--ds-fg)] tracking-tight">
                Agenda Surat Masuk
              </h1>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                Penatausahaan surat masuk, pencatatan agenda, dan penerbitan lembar disposisi resmi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              className="kpg-secondary h-9 px-4 text-xs font-semibold rounded-lg gap-2"
            >
              <FileSpreadsheet className="h-4 w-4 text-[var(--ds-accent-fg)]" />
              Export Excel
            </Button>

            <Button asChild className="h-9 px-4 text-xs font-bold rounded-lg gap-2">
              <Link href="/surat/masuk/create">
                <Plus className="h-4 w-4" />
                Input Surat Masuk
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--ds-fg-muted)]" />
          <Input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari no surat, no agenda, pengirim, perihal..."
            aria-label="Cari surat masuk"
            className="pl-9 h-9 text-xs rounded-lg"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-[var(--ds-fg-muted)]">
          {isFetching && (
            <span className="flex items-center gap-2 text-xs text-[var(--ds-accent-fg)]">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Menyinkronkan...
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Segarkan data agenda surat masuk"
            aria-label="Segarkan data agenda surat masuk"
            className="h-9 w-9 p-0 rounded-lg"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[var(--ds-accent-fg)]" : ""}`} />
          </Button>
          <span>
            Total <span className="text-[var(--ds-fg)] font-bold tabular-nums">{totalCount}</span> Surat Masuk
          </span>
        </div>
      </div>

      {/* Error State Banner */}
      {isError && (
        <div
          role="alert"
          className="rounded-3xl border border-[var(--ds-status-danger-border)] bg-[var(--ds-status-danger-bg)] p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ds-status-danger-fg)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Gagal memuat data agenda surat masuk dari server.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="kpg-secondary h-8 px-3 text-xs font-bold rounded-lg gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </Button>
        </div>
      )}

      {/* Tabel Master (Desktop) & Kartu Tumpuk (Mobile) */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-11 w-full animate-pulse rounded-lg bg-[var(--ds-surface-muted)]" />
            ))}
          </div>
        ) : suratList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Inbox className="h-9 w-9 text-[var(--ds-fg-muted)] mx-auto" />
            <h3 className="text-sm font-bold text-[var(--ds-fg)]">Belum Ada Surat Masuk Terarsip</h3>
            <p className="text-xs text-[var(--ds-fg-muted)]">
              Data surat masuk yang diinput akan muncul di sini.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (Compact for 1366x768) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 dark:bg-zinc-800/30 border-b border-slate-200/70 dark:border-zinc-800 text-[var(--ds-fg-muted)] font-bold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          suratList.length > 0 &&
                          suratList.every((s) => selectedIds.has(String(s.id || s.no_agenda)))
                        }
                        onChange={toggleSelectAll}
                        aria-label="Pilih semua surat"
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">No Agenda</th>
                    <th className="py-3 px-3">Nomor &amp; Tanggal Surat</th>
                    <th className="py-3 px-3">Asal Surat &amp; Lampiran</th>
                    <th className="py-3 px-3">Isi Ringkas / Perihal</th>
                    <th className="py-3 px-3">Sifat</th>
                    <th className="py-3 px-3">Diteruskan Ke</th>
                    <th className="py-3 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-zinc-800">
                  {suratList.map((item) => {
                    const isSelected = selectedIds.has(String(item.id || item.no_agenda));
                    return (
                      <tr
                        key={item.id}
                        aria-selected={isSelected}
                        className={`transition-colors ${
                          isSelected ? "bg-[var(--ds-accent-soft)]" : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-center align-middle">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item)}
                            aria-label={`Pilih surat agenda ${item.no_agenda}`}
                            className="h-4 w-4 rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2 font-semibold text-[var(--ds-accent-fg)] tabular-nums">
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span>{item.no_agenda}</span>
                          </div>
                          <span className="text-xs text-[var(--ds-fg-muted)] block mt-1 tabular-nums">
                            {formatDisplayDate(item.tanggal_agenda)}
                          </span>
                        </td>

                        <td className="py-2 px-3 align-middle max-w-[190px]">
                          <span className="font-semibold text-[var(--ds-fg)] block truncate" title={item.no_surat}>
                            {item.no_surat || "-"}
                          </span>
                          <span className="text-xs text-[var(--ds-fg-muted)] flex items-center gap-1 mt-1 tabular-nums">
                            <Calendar className="h-3 w-3 shrink-0" /> {formatDisplayDate(item.tanggal_surat)}
                          </span>
                        </td>

                        <td className="py-2 px-3 align-middle max-w-[180px]">
                          <span className="font-semibold text-[var(--ds-fg)] flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-[var(--ds-fg-muted)] shrink-0" />
                            <span className="truncate" title={item.asal_surat}>{item.asal_surat || "-"}</span>
                          </span>
                          <span className="text-xs text-[var(--ds-fg-muted)] block mt-1 truncate">
                            Lampiran: {item.lampiran || "-"}
                          </span>
                        </td>

                        <td className="py-2 px-3 align-middle max-w-[230px]">
                          <p className="text-xs text-[var(--ds-fg-secondary)] line-clamp-2 leading-snug" title={item.isi_ringkas}>
                            {item.isi_ringkas || "-"}
                          </p>
                        </td>

                        <td className="py-2 px-3 align-middle whitespace-nowrap">
                          <SifatCellPopover item={item} onUpdated={handleItemUpdated} />
                        </td>

                        <td className="py-2 px-3 align-middle">
                          <DiteruskanCellPopover item={item} onUpdated={handleItemUpdated} />
                        </td>

                        <td className="py-2 px-3 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg"
                            >
                              <Link href={`/surat/masuk/create?id=${item.id}`} title="Edit Surat Masuk">
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Link>
                            </Button>

                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg text-[var(--ds-accent-fg)]"
                            >
                              <Link href={`/surat/masuk/create?id=${item.id}`} title="Cetak Disposisi">
                                <Printer className="mr-1 h-3 w-3" />
                                Cetak
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSurat(item)}
                              aria-label={`Hapus surat agenda ${item.no_agenda}`}
                              title="Hapus Surat Masuk"
                              className="h-9 w-9 p-0 text-[var(--ds-status-danger-fg)] hover:bg-[var(--ds-status-danger-bg)] rounded-lg"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (< sm) */}
            <div className="sm:hidden divide-y divide-slate-200/70 dark:divide-zinc-800">
              {suratList.map((item) => (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(String(item.id || item.no_agenda))}
                        onChange={() => toggleSelectItem(item)}
                        aria-label={`Pilih surat agenda ${item.no_agenda}`}
                        className="h-4 w-4 rounded"
                      />
                      <span className="font-bold text-xs text-[var(--ds-accent-fg)] tabular-nums">
                        Agenda #{item.no_agenda}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--ds-fg-muted)] tabular-nums">
                      {formatDisplayDate(item.tanggal_agenda)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-xs text-[var(--ds-fg)] leading-snug">
                      {item.no_surat}
                    </h3>
                    <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
                      Asal: {item.asal_surat || "-"} • Tanggal: {formatDisplayDate(item.tanggal_surat)}
                    </p>
                    <p className="text-xs text-[var(--ds-fg-secondary)] mt-1 line-clamp-2">
                      {item.isi_ringkas}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <SifatCellPopover item={item} onUpdated={handleItemUpdated} />
                    <DiteruskanCellPopover item={item} onUpdated={handleItemUpdated} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70 dark:border-zinc-800">
                    <Button asChild variant="outline" size="sm" className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg">
                      <Link href={`/surat/masuk/create?id=${item.id}`}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg text-[var(--ds-accent-fg)]">
                      <Link href={`/surat/masuk/create?id=${item.id}`}>
                        <Printer className="mr-1 h-3 w-3" /> Cetak
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSurat(item)}
                      aria-label={`Hapus surat agenda ${item.no_agenda}`}
                      className="h-9 w-9 p-0 text-[var(--ds-status-danger-fg)] rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Server-Side Pagination Footer */}
        {!isLoading && totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-4 border-t border-slate-200/70 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/30 text-xs">
            <div className="text-[var(--ds-fg-muted)] font-medium">
              Menampilkan <span className="font-bold text-[var(--ds-fg)] tabular-nums">{startRecord}</span> -{" "}
              <span className="font-bold text-[var(--ds-fg)] tabular-nums">{endRecord}</span> dari{" "}
              <span className="font-bold text-[var(--ds-fg)] tabular-nums">{totalCount}</span> Surat Masuk
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[var(--ds-fg-muted)] text-xs font-semibold">Tampilkan:</span>
                <div className="flex items-center gap-1 bg-[var(--ds-surface)] border border-slate-200/80 dark:border-zinc-800 p-1 rounded-lg">
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={perPage === opt}
                      onClick={() => handlePerPageChange(opt)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                        perPage === opt
                          ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                          : "text-[var(--ds-fg-secondary)] hover:bg-[var(--ds-surface-muted)]"
                      }`}
                    >
                      {opt === "all" ? "Semua" : opt}
                    </button>
                  ))}
                </div>
              </div>

              {!isAll && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={safePage <= 1}
                    className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Sebelumnya
                  </Button>

                  <span className="px-2 text-xs font-bold text-[var(--ds-fg-secondary)] tabular-nums">
                    Halaman {safePage} dari {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={safePage >= totalPages}
                    className="kpg-secondary h-8 px-3 text-xs font-semibold rounded-lg"
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Excel Modal */}
      <ExportSuratMasukModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentSearch={searchInput}
        totalCurrentItems={totalCount}
      />

      {/* Floating Batch Selection Toolbar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            className="fixed bottom-5 left-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--ds-surface)] text-[var(--ds-fg)] shadow-lg border border-[var(--ds-accent-soft-border)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ds-accent-solid)] text-xs font-bold text-[var(--ds-accent-on-solid)] tabular-nums">
                {selectedIds.size}
              </span>
              <span className="text-xs font-semibold">
                Surat Terpilih ({Math.ceil(selectedIds.size / 2)} Lembar Kertas)
              </span>
            </div>

            <div className="h-4 w-px bg-slate-200/80 dark:bg-zinc-800" />

            <Button
              type="button"
              size="sm"
              onClick={() => setIsBatchPrintModalOpen(true)}
              className="h-8 px-4 text-xs font-bold rounded-lg gap-2"
            >
              <Printer className="h-3.5 w-3.5" />
              Cetak 2-Up ({selectedIds.size} Surat)
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-8 px-3 text-xs rounded-lg"
            >
              Batal
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch 2-Up Print Preview Modal */}
      <BatchPrintDisposisiModal
        isOpen={isBatchPrintModalOpen}
        onClose={() => setIsBatchPrintModalOpen(false)}
        selectedSurat={selectedSuratItems}
      />
    </div>
  );
}
