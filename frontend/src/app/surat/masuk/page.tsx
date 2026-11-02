"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
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

  const handleItemUpdated = (updatedItem: SuratMasuk) => {
    queryClient.invalidateQueries({ queryKey: ["surat-masuk"] });
  };

  const selectedSuratItems = useMemo(() => {
    return suratList.filter((s) => selectedIds.has(String(s.id || s.no_agenda)));
  }, [suratList, selectedIds]);

  const handleDeleteSurat = async (item: SuratMasuk) => {
    const ok = await confirm({
      title: "Hapus Surat Masuk",
      description: (
        <div className="space-y-3 pt-1">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Apakah Anda yakin ingin menghapus data surat masuk ini?
          </p>
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 break-all text-center select-all">
            {item.no_surat ? `${item.no_surat}` : `Agenda #${item.no_agenda}`}
          </div>
          <p className="text-xs text-rose-500 font-medium">
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
    <div className="w-full p-5 md:p-7 space-y-5 text-slate-900 dark:text-zinc-100">
      {/* Enterprise Header Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Agenda Surat Masuk
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
                Penatausahaan surat masuk, pencatatan agenda, dan penerbitan lembar disposisi resmi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportModalOpen(true)}
              className="h-9 px-3.5 text-xs font-semibold border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:text-emerald-300 dark:bg-emerald-950/30 rounded-xl gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Export Excel
            </Button>

            <Link href="/surat/masuk/create">
              <Button className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs shadow-emerald-600/20 gap-1.5">
                <Plus className="h-4 w-4" />
                Input Surat Masuk
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <Input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Cari no surat, no agenda, pengirim, perihal..."
            className="pl-9 h-9 text-xs border-slate-200 dark:border-zinc-700 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          {isFetching && (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Menyinkronkan...
            </span>
          )}
          <span>
            Total <span className="text-slate-900 font-bold dark:text-white">{totalCount}</span> Surat Masuk
          </span>
        </div>
      </div>

      {/* Tabel Master (Desktop) & Kartu Tumpuk (Mobile) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        {isLoading ? (
          <div className="p-4 space-y-2.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-12 w-full animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800/60" />
            ))}
          </div>
        ) : suratList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Inbox className="h-10 w-10 text-slate-300 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300">Belum Ada Surat Masuk Terarsip</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500">
              Data surat masuk yang diinput akan muncul di sini.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-zinc-800/40 border-b border-slate-200/80 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10.5px]">
                  <tr>
                    <th className="py-2.5 px-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          suratList.length > 0 &&
                          suratList.every((s) => selectedIds.has(String(s.id || s.no_agenda)))
                        }
                        onChange={toggleSelectAll}
                        aria-label="Pilih semua surat"
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                    </th>
                    <th className="py-2.5 px-3.5">No Agenda</th>
                    <th className="py-2.5 px-3.5">Nomor & Tanggal Surat</th>
                    <th className="py-2.5 px-3.5">Asal Surat / Pengirim</th>
                    <th className="py-2.5 px-3.5">Isi Ringkas / Perihal</th>
                    <th className="py-2.5 px-3.5">Sifat</th>
                    <th className="py-2.5 px-3.5">Diteruskan Ke</th>
                    <th className="py-2.5 px-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {suratList.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                        selectedIds.has(String(item.id || item.no_agenda))
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20"
                          : ""
                      }`}
                    >
                      <td className="py-3 px-3.5 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(String(item.id || item.no_agenda))}
                          onChange={() => toggleSelectItem(item)}
                          aria-label={`Pilih surat agenda ${item.no_agenda}`}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </td>
                      <td className="py-3 px-3.5 align-middle font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[13px]">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>{item.no_agenda}</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-400 dark:text-zinc-500 block mt-0.5">
                          {formatDisplayDate(item.tanggal_agenda)}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-middle min-w-36">
                        <span className="font-bold text-[13px] text-slate-900 dark:text-zinc-100 block truncate max-w-54">
                          {item.no_surat || "-"}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" /> {formatDisplayDate(item.tanggal_surat)}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-middle max-w-56">
                        <span className="font-semibold text-[13px] text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{item.asal_surat || "-"}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-zinc-500 block mt-0.5 truncate">
                          Lampiran: {item.lampiran || "-"}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 align-middle max-w-72">
                        <p className="text-[12px] text-slate-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                          {item.isi_ringkas || "-"}
                        </p>
                      </td>

                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <SifatCellPopover item={item} onUpdated={handleItemUpdated} />
                      </td>

                      <td className="py-3 px-3.5 align-middle">
                        <DiteruskanCellPopover item={item} onUpdated={handleItemUpdated} />
                      </td>

                      <td className="py-3 px-3.5 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/surat/masuk/create?id=${item.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 rounded-lg"
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          </Link>

                          <Link href={`/surat/masuk/create?id=${item.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 rounded-lg"
                            >
                              <Printer className="mr-1 h-3 w-3" />
                              Cetak
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSurat(item)}
                            className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View (< sm) */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-zinc-800">
              {suratList.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(String(item.id || item.no_agenda))}
                        onChange={() => toggleSelectItem(item)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      />
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        Agenda #{item.no_agenda}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-zinc-500">
                      {formatDisplayDate(item.tanggal_agenda)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                      {item.no_surat}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Asal: {item.asal_surat || "-"} • Tanggal: {formatDisplayDate(item.tanggal_surat)}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-zinc-300 mt-1.5 line-clamp-2">
                      {item.isi_ringkas}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <SifatCellPopover item={item} onUpdated={handleItemUpdated} />
                    <DiteruskanCellPopover item={item} onUpdated={handleItemUpdated} />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <Link href={`/surat/masuk/create?id=${item.id}`}>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold rounded-lg">
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                    </Link>
                    <Link href={`/surat/masuk/create?id=${item.id}`}>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs font-semibold rounded-lg text-emerald-600">
                        <Printer className="mr-1 h-3 w-3" /> Cetak
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSurat(item)}
                      className="h-8 px-2 text-rose-500"
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-xs">
            <div className="text-slate-500 dark:text-zinc-400 font-medium">
              Menampilkan <span className="font-bold text-slate-900 dark:text-zinc-100">{startRecord}</span> -{" "}
              <span className="font-bold text-slate-900 dark:text-zinc-100">{endRecord}</span> dari{" "}
              <span className="font-bold text-slate-900 dark:text-zinc-100">{totalCount}</span> Surat Masuk
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-semibold">Tampilkan:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-0.5 rounded-lg shadow-2xs">
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handlePerPageChange(opt)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        perPage === opt
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {opt === "all" ? "Semua" : opt}
                    </button>
                  ))}
                </div>
              </div>

              {!isAll && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={safePage <= 1}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" />
                    Sebelumnya
                  </Button>

                  <span className="px-2 text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                    Halaman {safePage} dari {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={safePage >= totalPages}
                    className="h-8 px-2.5 text-xs font-semibold rounded-lg"
                  >
                    Selanjutnya
                    <ChevronRight className="h-4 w-4 ml-0.5" />
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
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/95 dark:bg-zinc-800/95 text-white shadow-2xl backdrop-blur-md border border-slate-700 dark:border-zinc-700 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
              {selectedIds.size}
            </span>
            <span className="text-xs font-semibold">
              Surat Terpilih ({Math.ceil(selectedIds.size / 2)} Lembar Kertas)
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 dark:bg-zinc-700" />

          <Button
            type="button"
            size="sm"
            onClick={() => setIsBatchPrintModalOpen(true)}
            className="h-8 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak 2-Up ({selectedIds.size} Surat)
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="h-8 px-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            Batal
          </Button>
        </div>
      )}

      {/* Batch 2-Up Print Preview Modal */}
      <BatchPrintDisposisiModal
        isOpen={isBatchPrintModalOpen}
        onClose={() => setIsBatchPrintModalOpen(false)}
        selectedSurat={selectedSuratItems}
      />
    </div>
  );
}
