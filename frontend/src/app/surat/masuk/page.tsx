"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Inbox, Plus, Search, Printer, FileText, Calendar, Building2, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { SuratMasuk } from "../_lib/surat-types";
import { ExportSuratMasukModal } from "./_components/ExportSuratMasukModal";

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const str = String(dateStr).trim();
  const rawDate = str.includes("T") ? str.split("T")[0] : str.includes(" ") ? str.split(" ")[0] : str;
  const parts = rawDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return rawDate;
}

const PER_PAGE_OPTIONS = ["10", "20", "50", "all"] as const;

function getInitialSuratList(): SuratMasuk[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("bksda_saved_surat_masuk");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

export default function SuratMasukListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [suratList, setSuratList] = useState<SuratMasuk[]>(getInitialSuratList);
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("bksda_saved_surat_masuk");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return false;
      }
    } catch {}
    return true;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteItem, setDeleteItem] = useState<SuratMasuk | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<string>("10");

  const loadData = useCallback(async () => {
    let localItems: SuratMasuk[] = [];
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bksda_saved_surat_masuk");
      if (saved) {
        try {
          localItems = JSON.parse(saved);
        } catch (e) {}
      }
    }

    if (localItems.length === 0) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await api.get(`/surat-masuk?per_page=all`);
      const apiData = res.data?.data || res.data || [];
      const formattedApi: SuratMasuk[] = Array.isArray(apiData)
        ? apiData.map((d: any) => ({
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
          }))
        : [];

      const combined = [...formattedApi];

      // If there are offline/local items not yet in API, merge them
      for (const localItem of localItems) {
        if (!combined.some((item) => String(item.no_agenda) === String(localItem.no_agenda))) {
          combined.push(localItem);
        }
      }

      const uniqueCombined: SuratMasuk[] = [];
      const seenAgenda = new Set<string>();

      combined.forEach((item) => {
        const key = item.no_agenda ? String(item.no_agenda) : (item.id ? `id-${item.id}` : "");
        if (key && !seenAgenda.has(key)) {
          seenAgenda.add(key);
          uniqueCombined.push(item);
        } else if (!key) {
          uniqueCombined.push(item);
        }
      });

      uniqueCombined.sort((a, b) => {
        const numA = parseInt(a.no_agenda || "0", 10);
        const numB = parseInt(b.no_agenda || "0", 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numB - numA;
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("bksda_saved_surat_masuk", JSON.stringify(uniqueCombined));
      }

      setSuratList(uniqueCombined);
      setLoading(false);
      setIsRefreshing(false);
      return;
    } catch (err) {
      console.error("Failed to load surat masuk from API", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteSurat = async (item: SuratMasuk) => {
    try {
      if (item.id) {
        await api.delete(`/api/surat-masuk/${item.id}`).catch(() => {});
      }
    } catch (e) {}

    const updated = suratList.filter((s) => s.id !== item.id && s.no_agenda !== item.no_agenda);
    setSuratList(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("bksda_saved_surat_masuk", JSON.stringify(updated));

      let maxNo = 0;
      updated.forEach((i) => {
        const n = Number(i.no_agenda);
        if (!isNaN(n) && n > maxNo) {
          maxNo = n;
        }
      });

      if (maxNo > 0) {
        localStorage.setItem("bksda_last_no_agenda", String(maxNo));
      } else {
        localStorage.removeItem("bksda_last_no_agenda");
      }
    }
    toast.success(`Surat Masuk (Agenda ${item.no_agenda}) berhasil dihapus.`);
    setDeleteItem(null);
  };

  const filtered = useMemo(() => {
    return suratList.filter((s) => {
      const q = search.toLowerCase();
      return (
        (s.no_surat || "").toLowerCase().includes(q) ||
        (s.no_agenda || "").toLowerCase().includes(q) ||
        (s.asal_surat || "").toLowerCase().includes(q) ||
        (s.isi_ringkas || "").toLowerCase().includes(q)
      );
    });
  }, [suratList, search]);

  // Reset page to 1 when search or perPage changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePerPageChange = (val: string) => {
    setPerPage(val);
    setPage(1);
  };

  // Pagination calculation
  const totalCount = filtered.length;
  const isAll = perPage === "all";
  const pageSize = isAll ? Math.max(1, totalCount) : parseInt(perPage, 10);
  const totalPages = isAll ? 1 : Math.ceil(totalCount / pageSize) || 1;
  const safePage = Math.min(Math.max(1, page), totalPages);

  const paginatedList = useMemo(() => {
    if (isAll) return filtered;
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, isAll, safePage, pageSize]);

  const startRecord = totalCount === 0 ? 0 : isAll ? 1 : (safePage - 1) * pageSize + 1;
  const endRecord = isAll ? totalCount : Math.min(safePage * pageSize, totalCount);

  return (
    <div className="space-y-3.5 px-5 py-4 md:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              <Inbox className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              Daftar Surat Masuk
            </h1>
          </div>
          <p className="text-xs text-zinc-500">
            Kelola arsip surat masuk, pengagendaan, dan disposisi pimpinan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            className="h-9 px-3.5 text-xs font-semibold border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/80 hover:text-emerald-800 dark:border-emerald-900/60 dark:text-emerald-300 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 rounded-xl shadow-2xs gap-1.5"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Export Excel
          </Button>

          <Link href="/surat/masuk/create">
            <Button className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20">
              <Plus className="mr-1.5 h-4 w-4" />
              Input Surat Masuk Baru
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-2.5 md:px-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari no surat, no agenda, pengirim, perihal..."
            className="pl-9 h-9 text-xs border-zinc-200 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          {isRefreshing && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Menyinkronkan...
            </span>
          )}
          <span>
            Total <span className="text-zinc-900 font-bold dark:text-zinc-50">{totalCount}</span> Surat Masuk
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-4 space-y-2.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-11 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Inbox className="h-10 w-10 text-zinc-300 mx-auto" />
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Belum Ada Surat Masuk Terarsip</h3>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-2.5 px-3.5">No Agenda</th>
                  <th className="py-2.5 px-3.5">Nomor & Tanggal Surat</th>
                  <th className="py-2.5 px-3.5">Asal Surat / Pengirim</th>
                  <th className="py-2.5 px-3.5">Isi Ringkas / Perihal</th>
                  <th className="py-2.5 px-3.5">Sifat</th>
                  <th className="py-2.5 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {paginatedList.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3 px-3.5 align-middle font-bold text-emerald-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[13px]">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.no_agenda}</span>
                      </div>
                      <span className="text-[11px] font-normal text-zinc-400 block mt-0.5">
                        {formatDisplayDate(item.tanggal_agenda)}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-middle min-w-36">
                      <span className="font-bold text-[13px] text-zinc-900 dark:text-zinc-100 block truncate max-w-54">
                        {item.no_surat || "-"}
                      </span>
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3 text-zinc-400" /> Tanggal: {formatDisplayDate(item.tanggal_surat)}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-middle max-w-56">
                      <span className="font-semibold text-[13px] text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{item.asal_surat || "-"}</span>
                      </span>
                      <span className="text-[11px] text-zinc-400 block mt-0.5 truncate">
                        Lampiran: {item.lampiran || "-"}
                      </span>
                    </td>

                    <td className="py-3 px-3.5 align-middle max-w-72">
                      <p className="text-[12.5px] text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                        {item.isi_ringkas || "-"}
                      </p>
                    </td>

                    <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(item.sifat_json || ["Penting"]).map((sifat) => (
                          <span
                            key={sifat}
                            className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                          >
                            {sifat}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-3.5 align-middle text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/surat/masuk/create?id=${item.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                        </Link>

                        <Link href={`/surat/masuk/create?id=${item.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300">
                            <Printer className="mr-1 h-3 w-3" />
                            Cetak
                          </Button>
                        </Link>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSurat(item)}
                          className="h-8 w-8 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:px-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-xs">
            {/* Info Text */}
            <div className="text-zinc-500 dark:text-zinc-400 font-medium">
              Menampilkan <span className="font-bold text-zinc-900 dark:text-zinc-100">{startRecord}</span> -{" "}
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{endRecord}</span> dari{" "}
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span> Surat Masuk
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Per Page Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 text-[11px] font-semibold">Tampilkan:</span>
                <div className="flex items-center gap-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-lg shadow-2xs">
                  {PER_PAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handlePerPageChange(opt)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                        perPage === opt
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {opt === "all" ? "Semua" : opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation buttons (hidden if perPage === 'all') */}
              {!isAll && totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="h-8 px-2.5 text-xs font-semibold"
                  >
                    <ChevronLeft className="h-4 w-4 mr-0.5" />
                    Sebelumnya
                  </Button>

                  <span className="px-2 text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    Halaman {safePage} dari {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="h-8 px-2.5 text-xs font-semibold"
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
        currentSearch={search}
        totalCurrentItems={filtered.length}
      />
    </div>
  );
}
