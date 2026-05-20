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
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
  Gavel,
  GripVertical,
  Loader2,
  Package,
  Printer,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface AuctionAsset {
  id: string;
  kode_barang: string;
  nup: string;
  nup_lama?: string | null;
  nama_barang: string;
  jenis_bmn?: string | null;
  merk_tipe?: string | null;
  kondisi: string;
  nilai_perolehan: number;
  nilai_buku?: number | null;
  satuan?: string | null;
  lokasi_ruang?: string | null;
  lokasi_spesifik?: string | null;
  tahun_perolehan?: number | null;
  no_polisi?: string | null;
}

interface AssetResponse {
  data: AuctionAsset[];
  last_page: number;
  total?: number;
}

const formatRupiah = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

const formatPlainRupiah = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value || 0);

const formatDateLong = (date = new Date()) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const numberWords = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
];

function numberToWords(value: number): string {
  if (value < 12) return numberWords[value];
  if (value < 20) return `${numberToWords(value - 10)} Belas`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    return `${numberToWords(tens)} Puluh${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  if (value < 200) return `Seratus${value > 100 ? ` ${numberToWords(value - 100)}` : ""}`;
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    return `${numberToWords(hundreds)} Ratus${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  if (value < 2000) return `Seribu${value > 1000 ? ` ${numberToWords(value - 1000)}` : ""}`;
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  return `${numberToWords(thousands)} Ribu${rest ? ` ${numberToWords(rest)}` : ""}`;
}

function getSpelledDate(date = new Date()) {
  const day = dayNames[date.getDay()];
  const dateText = numberToWords(date.getDate());
  const month = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(date);
  const yearText = numberToWords(date.getFullYear());
  return { day, dateText, month, yearText };
}

function getBaNumberSuffix(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `K.18/TU/KAP.06.01/B/${month}/${date.getFullYear()}`;
}

function getSkNumberSuffix(date = new Date()) {
  return `K.18/TU/KAP.05/${date.getFullYear()}`;
}

function shortenLokasi(value?: string | null) {
  if (!value) return "-";
  return value
    .replace("Kantor Balai KSDA Kalimantan Timur", "Kantor Balai")
    .replace("Seksi KSDA Wilayah I (Berau)", "Seksi Wil. I Berau")
    .replace("Seksi KSDA Wilayah II (Tenggarong)", "Seksi Wil. II Tenggarong")
    .replace("Seksi KSDA Wilayah III (Balikpapan)", "Seksi Wil. III Balikpapan");
}

export default function BmnAuctionCandidatesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  // orderedIds keeps the user-defined order for the document
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [showDocument, setShowDocument] = useState(false);
  const [showSkDocument, setShowSkDocument] = useState(false);
  const [baNumber, setBaNumber] = useState("");
  const [skNumber, setSkNumber] = useState("");
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

  const assets = useMemo(() => response?.data || [], [response?.data]);

  // selectedIds derived from orderedIds for O(1) lookup
  const selectedIds = useMemo(() => new Set(orderedIds), [orderedIds]);

  // ordered selected assets — this is what the document uses
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
    // preserve existing order, append newly selected
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
    setTimeout(() => {
      document.getElementById("sk-penghentian-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handlePrint = () => {
    if (orderedSelectedAssets.length === 0) {
      toast.error("Tidak ada aset terpilih untuk dicetak.");
      return;
    }
    const printContent = document.getElementById("ba-koreksi-print-root");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>BA Koreksi Kondisi BMN</title>
          <style>
            @page { size: A4; margin: 0; }
            body {
              margin: 0;
              padding: 0;
              background: white;
              color: black;
              font-family: 'Bookman Old Style', Georgia, serif;
              font-size: 11pt;
              line-height: 1.25;
            }
            .ba-page {
              width: 210mm;
              min-height: 297mm;
              box-sizing: border-box;
              margin: 0 auto;
              padding: 5mm 20mm 14mm;
              page-break-after: always;
            }
            .ba-page:last-child { page-break-after: auto; }
            .ba-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
            .ba-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; }
            .ba-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
            .ba-body p { text-align: justify; text-justify: inter-word; }
            .ba-attachment { width: 166mm; margin-left: auto; margin-right: auto; padding-top: 2.5rem; }
            .ba-title { margin-top: 0.75rem; text-align: center; font-weight: 700; }
            .ba-title p { margin: 0; line-height: 1.2; }
            .ba-text-block { margin-top: 1rem; }
            .ba-text-block > * + * { margin-top: 1.25rem; }
            table { border-collapse: collapse; }
            .identity-table td { padding: 0.125rem 0; }
            .identity-table .label-cell { width: 24mm; }
            .identity-table .colon-cell { width: 6mm; text-align: center; }
            .asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; }
            .asset-table th, .asset-table td { border: 1px solid #000; padding: 0.25rem; }
            .asset-table td.text-left { text-align: left; }
            .asset-table td.text-right { text-align: right; }
            .attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
            .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
            .attachment-meta .meta-label { white-space: nowrap; }
            .attachment-meta .meta-colon { text-align: center; }
            .attachment-meta .meta-value { min-width: 0; }
            .attachment-meta .lampiran-value { display: inline-block; max-width: 80mm; }
            .signature { width: 20rem; margin-left: auto; }
            .attachment-signature { margin-top: 3rem; }
            .signature p { margin: 0; padding: 0; line-height: 1.15; }
            .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handlePrintSk = () => {
    if (orderedSelectedAssets.length === 0) {
      toast.error("Tidak ada aset terpilih untuk dicetak.");
      return;
    }
    const printContent = document.getElementById("sk-penghentian-print-root");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>SK Penghentian Penggunaan BMN</title>
          <style>
            @page { size: A4; margin: 0; }
            body {
              margin: 0; padding: 0; background: white; color: black;
              font-family: 'Bookman Old Style', Georgia, serif;
              font-size: 11pt; line-height: 1.4;
            }
            .sk-page {
              width: 210mm; min-height: 297mm; box-sizing: border-box;
              margin: 0 auto; padding: 5mm 20mm 14mm;
              page-break-after: always;
            }
            .sk-page:last-child { page-break-after: auto; }
            .sk-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; text-align: center; }
            .sk-header img { width: 196mm !important; max-width: 196mm !important; height: auto !important; }
            .sk-body { width: 166mm; margin-left: auto; margin-right: auto; }
            .sk-title { margin-top: 0.5rem; text-align: center; font-weight: 700; }
            .sk-title p { margin: 0; line-height: 1.3; }
            table { border-collapse: collapse; }
            .sk-section-table { width: 100%; }
            .sk-section-table td { vertical-align: top; padding: 0.15rem 0; }
            .sk-label { width: 28mm; font-weight: bold; }
            .sk-colon { width: 8mm; text-align: center; }
            .sk-value { }
            .sk-sub-table { width: 100%; }
            .sk-sub-table td { vertical-align: top; padding: 0.1rem 0; }
            .sk-sub-label { width: 6mm; }
            .sk-sub-colon { width: 6mm; text-align: center; }
            .asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; }
            .asset-table th, .asset-table td { border: 1px solid #000; padding: 0.25rem; }
            .asset-table td.text-left { text-align: left; }
            .asset-table td.text-right { text-align: right; }
            .attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
            .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
            .attachment-meta .meta-label { white-space: nowrap; }
            .attachment-meta .meta-colon { text-align: center; }
            .attachment-meta .meta-value { min-width: 0; }
            .signature { width: 20rem; margin-left: auto; }
            .signature p { margin: 0; padding: 0; line-height: 1.15; }
            .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
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
            <span>/{getBaNumberSuffix()}</span>
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
            {showDocument && (
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handlePrint}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                Cetak BA
              </Button>
            )}
            {showSkDocument && (
              <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={handlePrintSk}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                Cetak SK
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

      {/* Reorder panel — visible whenever assets are selected */}
      {orderedIds.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 print:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Urutan Aset Terpilih</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Drag atau gunakan tombol ↑↓ untuk mengatur nomor urut di dokumen.
              </p>
            </div>
            <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {orderedIds.length} aset
            </span>
          </div>
          <ol className="space-y-1.5">
            {orderedSelectedAssets.map((asset, index) => (
              <li
                key={asset.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex cursor-grab items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 transition active:cursor-grabbing active:opacity-60 dark:border-zinc-800 dark:bg-zinc-800/50"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-zinc-400" />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">{asset.nama_barang}</p>
                  <p className="font-mono text-[10px] text-zinc-400">
                    {asset.kode_barang} · NUP {asset.nup}
                    {asset.merk_tipe ? ` · ${asset.merk_tipe}` : ""}
                    {asset.no_polisi ? ` · ${asset.no_polisi}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label="Pindah ke atas"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(index)}
                    disabled={index === orderedIds.length - 1}
                    aria-label="Pindah ke bawah"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-700"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
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
          <CorrectionDocument assets={orderedSelectedAssets} baNumber={baNumber} />
        </section>
      )}

      {showSkDocument && orderedSelectedAssets.length > 0 && (
        <section id="sk-penghentian-preview" className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Preview SK Penghentian Penggunaan BMN</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Keputusan Kepala Balai tentang penghentian penggunaan aset terpilih.</p>
            </div>
            <Button className="rounded-xl gap-2 bg-amber-600 text-xs hover:bg-amber-500" onClick={handlePrintSk}>
              <Printer className="h-3.5 w-3.5" />
              Cetak / Save PDF
            </Button>
          </div>
          <SkPenghentianDocument assets={orderedSelectedAssets} skNumber={skNumber} />
        </section>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: "red" | "emerald" | "zinc" }) {
  const toneClass = {
    red: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20",
    zinc: "bg-zinc-50 text-zinc-700 ring-zinc-100 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={cn("mt-2 inline-flex rounded-xl px-3 py-1 text-lg font-black ring-1", toneClass)}>{value}</p>
    </div>
  );
}

function CorrectionDocument({ assets, baNumber }: { assets: AuctionAsset[]; baNumber: string }) {
  const today = new Date();
  const { day, dateText, month, yearText } = getSpelledDate(today);
  const baNumberText = `BA.${baNumber.trim() || "____"}/${getBaNumberSuffix(today)}`;
  const datePhrase = `${dateText} bulan ${month} tahun ${yearText}`;

  return (
    <div id="ba-koreksi-print-root" className="ba-print-root space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .ba-print-root, .ba-print-root * { visibility: visible; }
          .ba-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white;
            color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt;
            line-height: 1.25;
            margin: 0;
            padding: 0;
          }
          .ba-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 5mm 20mm 14mm;
            box-shadow: none !important;
            page-break-after: always;
          }
          .ba-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .ba-header img { max-width: 196mm !important; }
          .ba-body { width: 166mm; margin-left: auto; margin-right: auto; text-align: justify; text-justify: inter-word; }
          .ba-body p { text-align: justify; text-justify: inter-word; }
          .ba-attachment { width: 166mm; margin-left: auto; margin-right: auto; }
          .attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .attachment-meta .meta-label { white-space: nowrap; }
          .attachment-meta .meta-colon { text-align: center; }
          .attachment-meta .meta-value { min-width: 0; }
          .attachment-meta .lampiran-value { display: inline-block; max-width: 80mm; }
          .ba-page:last-child { page-break-after: auto; }
          .ba-no-print { display: none !important; }
        }
      `}</style>
      <article className="ba-page mx-auto min-h-100 max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200" style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.25" }}>
        <DocumentHeader />
        <div className="ba-title mt-1 text-center font-bold leading-tight">
          <p className="m-0">BERITA ACARA</p>
          <p className="m-0">KOREKSI PERUBAHAN KONDISI BARANG MILIK NEGARA</p>
          <p className="m-0 font-normal">Nomor : {baNumberText}</p>
        </div>
        <div className="ba-body ba-text-block mx-auto mt-4 w-[166mm] space-y-5 text-justify">
          <p>
            Pada hari {day} tanggal {datePhrase}, bertempat di Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur, kami penanggungjawab Unit Penatausahaan Kuasa Pengguna Barang pada Balai Konservasi Sumber Daya Alam Kalimantan Timur :
          </p>
          <table className="identity-table">
            <tbody>
              <tr><td className="label-cell w-24 py-0.5">Nama</td><td className="colon-cell w-6">:</td><td>M. ARI WIBAWANTO, S.Hut., M.Sc.</td></tr>
              <tr><td className="label-cell py-0.5">NIP</td><td className="colon-cell">:</td><td>19740514 199903 1 001</td></tr>
              <tr><td className="label-cell py-0.5">Jabatan</td><td className="colon-cell">:</td><td>Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur</td></tr>
            </tbody>
          </table>
          <p>
            Menyatakan bahwa telah dilakukan koreksi perubahan kondisi dengan cara melakukan koreksi terhadap kondisi Barang Milik Negara
            pada Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur pada tanggal {datePhrase} berdasarkan Penilaian Barang Milik Negara
            dengan hasil (rincian terlampir).
          </p>
          <p>
            Demikian Berita Acara ini dibuat sebagai bahan koreksi perubahan kondisi Barang Milik Negara Semester Satu tahun {yearText},
            dan apabila dikemudian hari terdapat kekeliruan akan dilakukan perbaikan sebagaimana mestinya.
          </p>
        </div>
        <div className="signature mt-20 ml-auto w-80">
          <p className="m-0">Unit Penatausaha Kuasa Pengguna Barang</p>
          <p className="m-0">Kepala Balai,</p>
          <div className="ttd-placeholder mt-4 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
          <p className="m-0">M. ARI WIBAWANTO, S.Hut., M.Sc.</p>
          <p className="m-0">NIP. 19740514 199903 1 001</p>
        </div>
      </article>

      <article className="ba-page mx-auto min-h-100 max-w-[210mm] bg-white px-24 py-12 text-black shadow-xl ring-1 ring-zinc-200" style={{ fontFamily: "'Bookman Old Style', Georgia, serif", fontSize: "11pt", lineHeight: "1.25" }}>
        <div className="ba-attachment mx-auto w-[166mm] pt-10">
          <div className="attachment-meta ml-auto w-[109mm]">
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Lampiran</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0">
                <span className="lampiran-value inline-block max-w-[80mm]">Berita Acara Koreksi Perubahan Kondisi BMN</span>
              </span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Nomor</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0 whitespace-nowrap">{baNumberText}</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Tanggal</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0">{formatDateLong(today)}</span>
            </div>
          </div>
          <AssetConditionTable title="I. Sebelum" assets={assets} mode="before" />
          <AssetConditionTable title="II. Sesudah" assets={assets} mode="after" />
          <div className="signature attachment-signature mt-12 ml-auto w-80">
            <p className="m-0">Kepala Balai,</p>
            <div className="ttd-placeholder mt-4 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="m-0">M. ARI WIBAWANTO, S.Hut., M.Sc.</p>
            <p className="m-0">NIP. 19740514 199903 1 001</p>
          </div>
        </div>
      </article>
    </div>
  );
}

function DocumentHeader() {
  return (
    <div className="ba-header -mx-18 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/header-terbaru.png" alt="Kop Surat" className="mx-auto h-auto w-full max-w-[196mm]" />
    </div>
  );
}

function AssetConditionTable({ title, assets, mode }: { title: string; assets: AuctionAsset[]; mode: "before" | "after" }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-[12px] font-semibold">{title}</p>
      <table className="asset-table w-full border-collapse text-center text-[10px]">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-black px-1 py-1">No.</th>
            <th rowSpan={2} className="border border-black px-1 py-1">Kode Barang</th>
            <th rowSpan={2} className="border border-black px-1 py-1">NUP</th>
            <th rowSpan={2} className="border border-black px-1 py-1">Nama Barang</th>
            <th rowSpan={2} className="border border-black px-1 py-1">Satuan</th>
            <th rowSpan={2} className="border border-black px-1 py-1">Nilai Perolehan (Rp)</th>
            <th colSpan={3} className="border border-black px-1 py-1">Kondisi</th>
          </tr>
          <tr>
            <th className="border border-black px-1 py-1">Baik</th>
            <th className="border border-black px-1 py-1">Rusak Ringan</th>
            <th className="border border-black px-1 py-1">Rusak Berat</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset, index) => (
            <tr key={`${mode}-${asset.id}`}>
              <td className="border border-black px-1 py-1">{index + 1}.</td>
              <td className="border border-black px-1 py-1">{asset.kode_barang}</td>
              <td className="border border-black px-1 py-1">{asset.nup}</td>
              <td className="border border-black px-1 py-1 text-left">{asset.nama_barang}</td>
              <td className="border border-black px-1 py-1">{asset.satuan || "Unit"}</td>
              <td className="border border-black px-1 py-1 text-right">{formatPlainRupiah(asset.nilai_perolehan)}</td>
              <td className="border border-black px-1 py-1">0</td>
              <td className="border border-black px-1 py-1">{mode === "before" ? 1 : 0}</td>
              <td className="border border-black px-1 py-1">{mode === "after" ? 1 : 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkPenghentianDocument({ assets, skNumber }: { assets: AuctionAsset[]; skNumber: string }) {
  const today = new Date();
  const skNumberText = `SK.${skNumber.trim() || "____"}/${getSkNumberSuffix(today)}`;
  const totalNilai = assets.reduce((sum, a) => sum + (a.nilai_perolehan || 0), 0);

  const mengingat = [
    "Undang-Undang Republik Indonesia Nomor 17 Tahun 2003 tentang Keuangan Negara;",
    "Undang-Undang Republik Indonesia Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;",
    "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;",
    "Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;",
    "Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;",
    "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;",
    "Peraturan Menteri Keuangan Nomor 111/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara sebagaimana telah diubah dengan Peraturan Menteri Keuangan Nomor 165/PMK.06/2021;",
    "Peraturan Menteri Keuangan Nomor 181/PMK.06/2016 tentang Penatausahaan Barang Milik Negara;",
    "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan.",
  ];

  const pageStyle = {
    fontFamily: "'Bookman Old Style', Georgia, serif",
    fontSize: "11pt",
    lineHeight: "1.4",
  } as React.CSSProperties;

  return (
    <div id="sk-penghentian-print-root" className="sk-print-root space-y-6">
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .sk-print-root, .sk-print-root * { visibility: visible; }
          .sk-print-root {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.4; margin: 0; padding: 0;
          }
          .sk-page {
            width: 210mm; min-height: 297mm; margin: 0 auto;
            padding: 5mm 20mm 14mm; box-shadow: none !important;
            page-break-after: always;
          }
          .sk-page:last-child { page-break-after: auto; }
          .sk-header { margin-top: -5mm; margin-left: -16mm; margin-right: -16mm; }
          .sk-header img { max-width: 196mm !important; }
          .sk-body { width: 166mm; margin-left: auto; margin-right: auto; }
          .sk-no-print { display: none !important; }
          .asset-table { width: 100%; border-collapse: collapse; text-align: center; font-size: 8.5pt; }
          .asset-table th, .asset-table td { border: 1px solid #000; padding: 0.25rem; }
          .asset-table td.text-left { text-align: left; }
          .asset-table td.text-right { text-align: right; }
          .attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .attachment-meta .meta-label { white-space: nowrap; }
          .attachment-meta .meta-colon { text-align: center; }
          .signature p { margin: 0; padding: 0; line-height: 1.15; }
          .ttd-placeholder { box-sizing: border-box; height: 112px; padding-top: 40px; padding-left: 1.35cm; color: #94a3b8; }
        }
      `}</style>

      {/* ── HALAMAN 1: KOP + Judul + Menimbang + Mengingat ── */}
      <article
        className="sk-page mx-auto min-h-100 max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        {/* KOP */}
        <div className="sk-header -mx-18 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-terbaru.png" alt="Kop Surat" className="mx-auto h-auto w-full max-w-[196mm]" />
        </div>

        {/* Judul SK */}
        <div className="sk-body sk-title mx-auto mt-3 w-[166mm] text-center font-bold leading-snug">
          <p className="m-0">KEPUTUSAN KEPALA BALAI</p>
          <p className="m-0">KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
          <p className="m-0 font-normal">Nomor : {skNumberText}</p>
          <p className="m-0 mt-2">TENTANG</p>
          <p className="m-0">PENGHENTIAN PENGGUNAAN BARANG MILIK NEGARA</p>
          <p className="m-0">PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,</p>
        </div>

        <div className="sk-body mx-auto mt-5 w-[166mm]">
          <p className="text-center font-bold">DENGAN RAHMAT TUHAN YANG MAHA ESA</p>
          <p className="mt-2 text-center font-bold">
            KEPALA BALAI<br />
            KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,
          </p>

          {/* Menimbang */}
          <table className="mt-4 w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="w-28 align-top font-bold">Menimbang</td>
                <td className="w-6 text-center align-top">:</td>
                <td className="align-top">
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <tbody>
                      <tr>
                        <td className="w-5 align-top">a.</td>
                        <td className="align-top text-justify">
                          bahwa terdapat Barang Milik Negara pada Balai Konservasi Sumber Daya Alam Kalimantan Timur berupa Alat Angkutan Bermotor dalam keadaan rusak berat dan tidak ekonomis lagi untuk digunakan;
                        </td>
                      </tr>
                      <tr>
                        <td className="w-5 align-top pt-2">b.</td>
                        <td className="align-top pt-2 text-justify">
                          bahwa sehubungan dengan hal tersebut diatas, dipandang perlu untuk menerbitkan Keputusan Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur tentang Penghentian Penggunaan Barang Milik Negara.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              {/* Mengingat */}
              <tr>
                <td className="w-28 align-top pt-3 font-bold">Mengingat</td>
                <td className="w-6 text-center align-top pt-3">:</td>
                <td className="align-top pt-3">
                  <table className="w-full" style={{ borderCollapse: "collapse" }}>
                    <tbody>
                      {mengingat.map((item, i) => (
                        <tr key={i}>
                          <td className="w-5 align-top pt-1">{i + 1}.</td>
                          <td className="align-top pt-1 text-justify">{item}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      {/* ── HALAMAN 2: MEMUTUSKAN + Menetapkan + KESATU/KEDUA/KETIGA + TTD + Tembusan ── */}
      <article
        className="sk-page mx-auto min-h-100 max-w-[210mm] bg-white px-24 py-12 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="sk-body mx-auto w-[166mm]">
          <p className="text-center font-bold underline">MEMUTUSKAN</p>

          <table className="mt-4 w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td className="w-28 align-top font-bold">Menetapkan</td>
                <td className="w-6 text-center align-top">:</td>
                <td className="align-top font-bold uppercase text-justify">
                  KEPUTUSAN KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR TENTANG PENGHENTIAN PENGGUNAAN BARANG MILIK NEGARA LINGKUP BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR.
                </td>
              </tr>
              <tr>
                <td className="w-28 align-top pt-4 font-bold">KESATU</td>
                <td className="w-6 text-center align-top pt-4">:</td>
                <td className="align-top pt-4 text-justify">
                  Menghentikan penggunaan Barang Milik Negara berupa Alat Angkutan Bermotor dalam kondisi rusak berat pada Balai Konservasi Sumber Daya Alam Kalimantan Timur tersebut sebagaimana tercantum dalam lampiran keputusan ini.
                </td>
              </tr>
              <tr>
                <td className="w-28 align-top pt-4 font-bold">KEDUA</td>
                <td className="w-6 text-center align-top pt-4">:</td>
                <td className="align-top pt-4 text-justify">
                  Menghentikan biaya pemeliharaan Alat Angkutan Bermotor tersebut sejak dikeluarkan keputusan ini, untuk dilanjutkan pada proses penghapusan.
                </td>
              </tr>
              <tr>
                <td className="w-28 align-top pt-4 font-bold">KETIGA</td>
                <td className="w-6 text-center align-top pt-4">:</td>
                <td className="align-top pt-4 text-justify">
                  Keputusan ini mulai berlaku sejak tanggal ditetapkan.
                </td>
              </tr>
            </tbody>
          </table>

          {/* TTD */}
          <div className="mt-12 ml-auto w-80">
            <p className="m-0">Ditetapkan di : Samarinda</p>
            <p className="m-0">Pada tanggal : {formatDateLong(today)}</p>
            <p className="m-0 mt-3">Kepala Balai,</p>
            <div className="ttd-placeholder mt-4 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="m-0 font-bold">M. ARI WIBAWANTO, S.Hut., M.Sc.</p>
            <p className="m-0">NIP. 19740514 199903 1 001</p>
          </div>

          {/* Tembusan */}
          <div className="mt-10">
            <p className="m-0">Tembusan :</p>
            <p className="m-0">1.&nbsp; Kepala Biro Umum Kementerian Kehutanan</p>
            <p className="m-0">2.&nbsp; Sekretaris Direktorat Jenderal KSDAE</p>
          </div>
        </div>
      </article>

      {/* ── HALAMAN 3: Lampiran — Tabel Daftar Penghentian ── */}
      <article
        className="sk-page mx-auto min-h-100 max-w-[210mm] bg-white px-24 py-12 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="sk-body mx-auto w-[166mm]">
          {/* Attachment meta */}
          <div className="attachment-meta ml-auto w-[109mm]">
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Lampiran</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0">Keputusan Kepala Balai KSDA KALTIM</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Nomor</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0 whitespace-nowrap">{skNumberText}</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span className="meta-label whitespace-nowrap">Tanggal</span>
              <span className="meta-colon text-center">:</span>
              <span className="meta-value min-w-0">{formatDateLong(today)}</span>
            </div>
          </div>

          {/* Judul tabel */}
          <p className="mt-6 text-center font-bold text-[11pt] leading-snug">
            DAFTAR PENGHENTIAN PENGGUNAAN BARANG MILIK NEGARA<br />
            PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
          </p>

          {/* Tabel aset */}
          <table className="asset-table mt-4 w-full border-collapse text-center text-[8.5pt]">
            <thead>
              <tr>
                <th className="border border-black px-1 py-1">No</th>
                <th className="border border-black px-1 py-1">Kode Barang</th>
                <th className="border border-black px-1 py-1">NUP</th>
                <th className="border border-black px-1 py-1">Nama Barang</th>
                <th className="border border-black px-1 py-1">Merk / Type</th>
                <th className="border border-black px-1 py-1">No Polisi</th>
                <th className="border border-black px-1 py-1">Tahun Perolehan</th>
                <th className="border border-black px-1 py-1">Nilai Perolehan (Rp)</th>
                <th className="border border-black px-1 py-1">Kondisi</th>
                <th className="border border-black px-1 py-1">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset, index) => (
                <tr key={asset.id}>
                  <td className="border border-black px-1 py-1">{index + 1}.</td>
                  <td className="border border-black px-1 py-1">{asset.kode_barang}</td>
                  <td className="border border-black px-1 py-1">{asset.nup}</td>
                  <td className="border border-black px-1 py-1 text-left">{asset.nama_barang}</td>
                  <td className="border border-black px-1 py-1">{asset.merk_tipe || "-"}</td>
                  <td className="border border-black px-1 py-1">{asset.no_polisi || "-"}</td>
                  <td className="border border-black px-1 py-1">{asset.tahun_perolehan || "-"}</td>
                  <td className="border border-black px-1 py-1 text-right">{formatPlainRupiah(asset.nilai_perolehan)}</td>
                  <td className="border border-black px-1 py-1">{asset.kondisi}</td>
                  <td className="border border-black px-1 py-1">Surat Lengkap</td>
                </tr>
              ))}
              <tr>
                <td colSpan={7} className="border border-black px-1 py-1 text-center font-bold">Jumlah</td>
                <td className="border border-black px-1 py-1 text-right font-bold">{formatPlainRupiah(totalNilai)}</td>
                <td colSpan={2} className="border border-black px-1 py-1"></td>
              </tr>
            </tbody>
          </table>

          {/* TTD lampiran */}
          <div className="signature mt-10 ml-auto w-80">
            <p className="m-0">Kepala Balai,</p>
            <div className="ttd-placeholder mt-4 h-28 box-border pt-10 pl-[1.35cm] text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="m-0 font-bold">M. ARI WIBAWANTO, S.Hut., M.Sc.</p>
            <p className="m-0">NIP. 19740514 199903 1 001</p>
          </div>
        </div>
      </article>
    </div>
  );
}
