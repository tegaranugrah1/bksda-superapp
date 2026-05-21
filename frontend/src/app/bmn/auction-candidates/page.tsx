"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  FileText,
  Gavel,
  Loader2,
  Package,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { AuctionAsset, AssetResponse } from "./_lib/auction-helpers";
import {
  formatRupiah,
  shortenLokasi,
  getSkNumberSuffix,
} from "./_lib/auction-helpers";
import { ReorderPanel } from "./_components/ReorderPanel";
import { SummaryTile } from "./_components/SummaryTile";
import { CorrectionDocument, handlePrintBa } from "./_components/BaKoreksiDocument";
import { SkPenghentianDocument, handlePrintSk } from "./_components/SkPenghentianDocument";
import { SkPanitiaDocument, handlePrintSkPanitia } from "./_components/SkPanitiaDocument";
import { SkBuilder } from "./_components/SkBuilder";
import {
  DEFAULT_MENIMBANG,
  DEFAULT_MENGINGAT,
  DEFAULT_MEMUTUSKAN,
  DEFAULT_KEPALA_BALAI,
  DEFAULT_TEMBUSAN,
  formatNip,
} from "./_lib/sk-defaults";
import {
  DEFAULT_PANITIA_MENIMBANG,
  DEFAULT_PANITIA_MENGINGAT,
  DEFAULT_PANITIA_MEMUTUSKAN,
  DEFAULT_PANITIA_TEMBUSAN,
  DEFAULT_PANITIA_SUSUNAN,
  type PanitiaAnggota,
} from "./_lib/sk-panitia-defaults";

export default function BmnAuctionCandidatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [showDocument, setShowDocument] = useState(false);
  const [showSkDocument, setShowSkDocument] = useState(false);
  const [showSkPanitia, setShowSkPanitia] = useState(false);
  const [baNumber, setBaNumber] = useState("");
  const [baKap, setBaKap] = useState("KAP.06.01");
  const [skNumber, setSkNumber] = useState("");
  const [skPanitiaNumber, setSkPanitiaNumber] = useState("");
  const [menimbang, setMenimbang] = useState(DEFAULT_MENIMBANG);
  const [mengingat, setMengingat] = useState(DEFAULT_MENGINGAT);
  const [memutuskan, setMemutuskan] = useState(DEFAULT_MEMUTUSKAN);
  const [kepalaBalai, setKepalaBalai] = useState(DEFAULT_KEPALA_BALAI);
  const [tembusan, setTembusan] = useState(DEFAULT_TEMBUSAN);
  const [panitiaMenimbang, setPanitiaMenimbang] = useState(DEFAULT_PANITIA_MENIMBANG);
  const [panitiaMengingat, setPanitiaMengingat] = useState(DEFAULT_PANITIA_MENGINGAT);
  const [panitiaMemutuskan, setPanitiaMemutuskan] = useState(DEFAULT_PANITIA_MEMUTUSKAN);
  const [panitiaTembusan, setPanitiaTembusan] = useState(DEFAULT_PANITIA_TEMBUSAN);
  const [susunanPanitia, setSusunanPanitia] = useState<PanitiaAnggota[]>(DEFAULT_PANITIA_SUSUNAN);
  const debouncedSearch = useDebounce(searchTerm, 400);

  // drag-and-drop refs
  const dragIndexRef = useRef<number | null>(null);
  const dragOverIndexRef = useRef<number | null>(null);

  const { data: response, isLoading, isFetching } = useQuery<AssetResponse>({
    queryKey: ["bmn-auction-candidates", debouncedSearch, page, perPage],
    queryFn: async () => {
      const res = await api.get("/bmn/assets", {
        params: {
          kondisi: "Rusak Berat",
          search: debouncedSearch || undefined,
          page,
          per_page: perPage === 0 ? 9999 : perPage,
        },
      });
      return res.data;
    },
    placeholderData: (prev) => prev,
  });

  const { data: employeesForPanitia = [] } = useQuery<{ id: string | number; nama_lengkap?: string; name?: string; nip?: string | null; jabatan?: string | null; position?: string | null }[]>({
    queryKey: ["employees-select-panitia"],
    queryFn: async () => {
      const res = await api.get("/kepegawaian/employees/select");
      return res.data?.data || res.data || [];
    },
  });

  const sortedEmployeesForPanitia = useMemo(() => {
    const list = Array.isArray(employeesForPanitia) ? [...employeesForPanitia] : [];
    return list.sort((a, b) => {
      const an = (a.nama_lengkap || a.name || "").toLowerCase();
      const bn = (b.nama_lengkap || b.name || "").toLowerCase();
      return an.localeCompare(bn);
    });
  }, [employeesForPanitia]);

  const assets = useMemo(() => response?.data || [], [response?.data]);
  const selectedIds = useMemo(() => new Set(orderedIds), [orderedIds]);

  const assetMap = useMemo(() => {
    const map = new Map<string, AuctionAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  const orderedSelectedAssets = useMemo(
    () => orderedIds.flatMap((id) => (assetMap.has(id) ? [assetMap.get(id)!] : [])),
    [orderedIds, assetMap]
  );

  const selectedTotal = orderedSelectedAssets.reduce((total, asset) => total + (asset.nilai_perolehan || 0), 0);
  const allSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id));

  const toggleSelect = useCallback((id: string) => {
    setOrderedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
    setShowDocument(false);
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setOrderedIds([]);
      setShowDocument(false);
      return;
    }
    setOrderedIds((prev) => {
      const existing = new Set(prev);
      const newIds = assets.filter((a) => !existing.has(a.id)).map((a) => a.id);
      return [...prev, ...newIds];
    });
  }, [allSelected, assets]);

  // reorder helpers
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setOrderedIds((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setOrderedIds((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverIndexRef.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    const from = dragIndexRef.current;
    const to = dragOverIndexRef.current;
    if (from === null || to === null || from === to) {
      dragIndexRef.current = null;
      dragOverIndexRef.current = null;
      return;
    }
    setOrderedIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    dragIndexRef.current = null;
    dragOverIndexRef.current = null;
  }, []);

  const handleProcess = () => {
    if (orderedIds.length === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    setShowDocument(true);
    setShowSkDocument(false);
    setShowSkPanitia(false);
    setTimeout(() => {
      document.getElementById("ba-koreksi-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleProcessSk = () => {
    if (orderedIds.length === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    setShowSkDocument(true);
    setShowDocument(false);
    setShowSkPanitia(false);
    setTimeout(() => {
      document.getElementById("sk-penghentian-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleProcessSkPanitia = () => {
    if (orderedIds.length === 0) {
      toast.error("Pilih minimal satu aset untuk diproses.");
      return;
    }
    setShowSkPanitia(true);
    setShowDocument(false);
    setShowSkDocument(false);
    setTimeout(() => {
      document.getElementById("sk-panitia-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handlePrint = () => handlePrintBa(orderedSelectedAssets);
  const handlePrintSkDoc = () => handlePrintSk(orderedSelectedAssets, skNumber);
  const handlePrintSkPanitiaDoc = () => handlePrintSkPanitia();

  const addPanitiaAnggota = () => {
    setSusunanPanitia((prev) => [
      ...prev,
      { id: "id" + Math.random().toString(36).slice(2), nama: "", nip: "", jabatanInstansi: "", jabatanKegiatan: "" },
    ]);
  };

  const removePanitiaAnggota = (id: string) => {
    setSusunanPanitia((prev) => prev.filter((item) => item.id !== id));
  };

  const updatePanitiaAnggota = (id: string, field: keyof PanitiaAnggota, value: string) => {
    setSusunanPanitia((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectPanitiaEmployee = (id: string, employeeId: string) => {
    if (!employeeId) return;
    const emp = sortedEmployeesForPanitia.find((e) => String(e.id) === employeeId);
    if (!emp) return;
    setSusunanPanitia((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              nama: emp.nama_lengkap || emp.name || "",
              nip: formatNip(emp.nip || ""),
              jabatanInstansi: emp.position || emp.jabatan || "",
            }
          : item
      )
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Aset Akan Di Lelang</h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                Kandidat aset kondisi Rusak Berat untuk proses koreksi dan dokumen lelang.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-2 text-xs"
            onClick={() => {
              setOrderedIds([]);
              setShowDocument(false);
            }}
            disabled={orderedIds.length === 0}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Reset Pilihan
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-2 bg-red-600 text-xs hover:bg-red-500"
            onClick={handleProcess}
            disabled={orderedIds.length === 0}
          >
            <FileText className="h-3.5 w-3.5" />
            Proses BA Koreksi
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-2 bg-amber-600 text-xs hover:bg-amber-500"
            onClick={handleProcessSk}
            disabled={orderedIds.length === 0}
          >
            <FileText className="h-3.5 w-3.5" />
            Proses SK Penghentian
          </Button>
          <Button
            size="sm"
            className="rounded-xl gap-2 bg-teal-600 text-xs hover:bg-teal-500"
            onClick={handleProcessSkPanitia}
            disabled={orderedIds.length === 0}
          >
            <FileText className="h-3.5 w-3.5" />
            Proses SK Panitia
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile label="Total Rusak Berat" value={(response?.total || assets.length).toLocaleString("id-ID")} tone="red" />
        <SummaryTile label="Dipilih" value={orderedIds.length.toLocaleString("id-ID")} tone="emerald" />
        <SummaryTile label="Nilai Terpilih" value={formatRupiah(selectedTotal)} tone="zinc" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari nama, kode barang, NUP..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
              setOrderedIds([]);
              setShowDocument(false);
            }}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-4 text-sm text-zinc-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
            Filter: Rusak Berat
          </span>
          {isFetching && !isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="ba-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Nomor Berita Acara
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">BA.</span>
            <input
              id="ba-number"
              type="text"
              value={baNumber}
              onChange={(event) => setBaNumber(event.target.value)}
              placeholder="____"
              className="mx-1 w-20 bg-transparent text-center font-semibold outline-none"
            />
            <span>/K.18/TU/</span>
            <input
              type="text"
              value={baKap}
              onChange={(event) => setBaKap(event.target.value)}
              className="w-24 bg-transparent text-center font-semibold outline-none"
            />
            <span>/B/{String(new Date().getMonth() + 1).padStart(2, "0")}/{new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Bulan dan tahun otomatis mengikuti tanggal generate dokumen.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="sk-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Nomor SK Penghentian
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SK.</span>
            <input
              id="sk-number"
              type="text"
              value={skNumber}
              onChange={(event) => setSkNumber(event.target.value)}
              placeholder="____"
              className="mx-1 w-20 bg-transparent text-center font-semibold outline-none"
            />
            <span>/{getSkNumberSuffix()}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tahun otomatis mengikuti tanggal generate dokumen.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="sk-panitia-number" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          Nomor SK Panitia Penghapusan
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex h-11 items-center rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
            <span className="font-semibold">SK.</span>
            <input
              id="sk-panitia-number"
              type="text"
              value={skPanitiaNumber}
              onChange={(event) => setSkPanitiaNumber(event.target.value)}
              placeholder="____"
              className="mx-1 w-20 bg-transparent text-center font-semibold outline-none"
            />
            <span>/{getSkNumberSuffix()}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tahun otomatis mengikuti tanggal generate dokumen.
          </p>
        </div>
      </div>

      {orderedIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">{orderedIds.length} aset dipilih</p>
            <p className="text-xs text-red-700/80 dark:text-red-400">Dokumen BA Koreksi akan memakai aset yang dipilih di halaman ini.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-lg bg-red-600 text-xs hover:bg-red-500" onClick={handleProcess}>
              <FileText className="mr-1 h-3.5 w-3.5" />
              Generate BA Koreksi
            </Button>
            <Button size="sm" className="rounded-lg bg-amber-600 text-xs hover:bg-amber-500" onClick={handleProcessSk}>
              <FileText className="mr-1 h-3.5 w-3.5" />
              Generate SK Penghentian
            </Button>
            <Button size="sm" className="rounded-lg bg-teal-600 text-xs hover:bg-teal-500" onClick={handleProcessSkPanitia}>
              <FileText className="mr-1 h-3.5 w-3.5" />
              Generate SK Panitia
            </Button>
            {showDocument && (
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handlePrint}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                Cetak BA
              </Button>
            )}
            {showSkDocument && (
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handlePrintSkDoc}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                Cetak SK
              </Button>
            )}
            {showSkPanitia && (
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handlePrintSkPanitiaDoc}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                Cetak SK Panitia
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                <th className="w-10 px-4 py-3">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Identitas Aset</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Jenis / Lokasi</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Kondisi</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Nilai Perolehan</th>
                <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                    <p className="text-sm text-zinc-400">Memuat aset rusak berat...</p>
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Package className="mx-auto mb-2 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm text-zinc-400">Belum ada aset kondisi Rusak Berat.</p>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className={cn(
                      "transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40",
                      selectedIds.has(asset.id) && "bg-red-50/50 dark:bg-red-500/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <Checkbox checked={selectedIds.has(asset.id)} onCheckedChange={() => toggleSelect(asset.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-75 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{asset.nama_barang}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-red-700 dark:text-red-400">{asset.kode_barang}</span>
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">NUP: {asset.nup}</span>
                        {asset.nup_lama && <span className="font-mono text-[10px] text-zinc-400">NUP Lama: {asset.nup_lama}</span>}
                      </div>
                      {asset.merk_tipe && <p className="mt-1 text-[11px] text-zinc-400">{asset.merk_tipe}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{asset.jenis_bmn || "-"}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{shortenLokasi(asset.lokasi_ruang || asset.lokasi_spesifik)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20">
                        {asset.kondisi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatRupiah(asset.nilai_perolehan)}</p>
                      <p className="text-[10px] text-zinc-400">Buku: {formatRupiah(asset.nilai_buku)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/bmn/assets/${asset.id}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-500/10">
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{response?.total || assets.length} item total</span>
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
                setOrderedIds([]);
                setShowDocument(false);
              }}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-600 outline-none focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <option value={10}>10 / halaman</option>
              <option value={50}>50 / halaman</option>
              <option value={100}>100 / halaman</option>
              <option value={0}>Semua</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)} className="rounded-lg text-xs">Prev</Button>
            <span className="px-2 text-xs text-zinc-500 dark:text-zinc-400">Hal {page} / {response?.last_page || 1}</span>
            <Button variant="outline" size="sm" disabled={page === response?.last_page || perPage === 0} onClick={() => setPage((prev) => prev + 1)} className="rounded-lg text-xs">Next</Button>
          </div>
        </div>
      </div>

      {orderedIds.length > 0 && (
        <ReorderPanel
          orderedIds={orderedIds}
          orderedSelectedAssets={orderedSelectedAssets}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDragEnd={handleDragEnd}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
        />
      )}

      {showDocument && orderedSelectedAssets.length > 0 && (
        <section id="ba-koreksi-preview" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview BA Koreksi Kondisi</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Dokumen pertama untuk aset terpilih: Rusak Ringan menjadi Rusak Berat.</p>
            </div>
            <Button className="rounded-xl gap-2 bg-zinc-900 text-xs hover:bg-zinc-800 dark:bg-white dark:text-zinc-900" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Cetak / Save PDF
            </Button>
          </div>
          <CorrectionDocument assets={orderedSelectedAssets} baNumber={baNumber} baKap={baKap} />
        </section>
      )}

      {showSkDocument && orderedSelectedAssets.length > 0 && (
        <section id="sk-penghentian-preview" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Penghentian Penggunaan BMN</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Keputusan Kepala Balai tentang penghentian penggunaan aset terpilih.</p>
            </div>
            <Button className="rounded-xl gap-2 bg-amber-600 text-xs hover:bg-amber-500" onClick={handlePrintSkDoc}>
              <Printer className="h-3.5 w-3.5" />
              Cetak / Save PDF
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
            <div className="print:hidden">
              <SkBuilder
                menimbang={menimbang}
                setMenimbang={setMenimbang}
                mengingat={mengingat}
                setMengingat={setMengingat}
                memutuskan={memutuskan}
                setMemutuskan={setMemutuskan}
                kepalaBalai={kepalaBalai}
                setKepalaBalai={setKepalaBalai}
                tembusan={tembusan}
                setTembusan={setTembusan}
              />
            </div>
            <div>
              <SkPenghentianDocument
                assets={orderedSelectedAssets}
                skNumber={skNumber}
                menimbang={menimbang}
                mengingat={mengingat}
                memutuskan={memutuskan}
                kepalaBalai={kepalaBalai}
                tembusan={tembusan}
              />
            </div>
          </div>
        </section>
      )}

      {showSkPanitia && orderedIds.length > 0 && (
        <section id="sk-panitia-preview" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Panitia Penghapusan BMN</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Keputusan Kepala Balai tentang pembentukan Panitia Penghapusan BMN.</p>
            </div>
            <Button className="rounded-xl gap-2 bg-teal-600 text-xs hover:bg-teal-500" onClick={handlePrintSkPanitiaDoc}>
              <Printer className="h-3.5 w-3.5" />
              Cetak / Save PDF
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
            <div className="print:hidden">
              <SkBuilder
                menimbang={panitiaMenimbang}
                setMenimbang={setPanitiaMenimbang}
                mengingat={panitiaMengingat}
                setMengingat={setPanitiaMengingat}
                memutuskan={panitiaMemutuskan}
                setMemutuskan={setPanitiaMemutuskan}
                kepalaBalai={kepalaBalai}
                setKepalaBalai={setKepalaBalai}
                tembusan={panitiaTembusan}
                setTembusan={setPanitiaTembusan}
              />

              {/* Susunan Panitia editor */}
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Susunan Panitia</h3>
                  <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addPanitiaAnggota}>
                    <Plus className="h-3 w-3" />
                    Tambah
                  </Button>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Susunan panitia yang akan ditampilkan pada halaman lampiran.
                </p>
                <div className="mt-3 space-y-3">
                  {susunanPanitia.map((item) => (
                    <div key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <div className="flex items-center gap-2">
                        <select
                          value=""
                          onChange={(e) => selectPanitiaEmployee(item.id, e.target.value)}
                          className="h-8 flex-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                        >
                          <option value="">-- Pilih Pegawai --</option>
                          {sortedEmployeesForPanitia.map((emp) => (
                            <option key={emp.id} value={String(emp.id)}>
                              {emp.nama_lengkap || emp.name || "-"}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="xs"
                          variant="destructive"
                          className="rounded-md gap-1"
                          onClick={() => removePanitiaAnggota(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Hapus
                        </Button>
                      </div>
                      <input
                        value={item.jabatanKegiatan}
                        onChange={(e) => updatePanitiaAnggota(item.id, "jabatanKegiatan", e.target.value)}
                        placeholder="Jabatan dalam Kegiatan (Ketua, Sekretaris, Anggota...)"
                        className="mt-2 h-8 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                      {item.nama && (
                        <div className="mt-2 rounded-lg bg-teal-50 px-2.5 py-1.5 text-[11px] text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">
                          <p className="font-semibold">{item.nama}</p>
                          <p>NIP. {item.nip}</p>
                          <p>{item.jabatanInstansi}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {susunanPanitia.length === 0 && (
                    <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400">
                      Belum ada anggota panitia. Klik Tambah untuk menambahkan.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <SkPanitiaDocument
                skNumber={skPanitiaNumber}
                menimbang={panitiaMenimbang}
                mengingat={panitiaMengingat}
                memutuskan={panitiaMemutuskan}
                kepalaBalai={kepalaBalai}
                tembusan={panitiaTembusan}
                susunanPanitia={susunanPanitia}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
