"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Printer, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuctionAsset } from "../_lib/auction-helpers";
import { formatPlainRupiah } from "../_lib/auction-helpers";
import type { EmployeeOption } from "../_hooks/useEmployeeOptions";

interface KertasKerjaAssetSectionProps {
  asset: AuctionAsset;
  worksheetNumber: number;
  employees: EmployeeOption[];
  onClose: () => void;
  initialState?: Partial<WorksheetState> | null;
  isSaving?: boolean;
  onSave?: (payload: { nilaiTaksiran: number; worksheet: WorksheetState }) => void;
}

interface LelangRow {
  data: string;
  kode: string;
  tipe: string;
  harga: string;
  waktu: string;
  lokasi: string;
  kategori: string;
  tahun: string;
  tipeAdj: string;
  merekAdj: string;
  waktuAdj: string;
  lokasiAdj: string;
  tahunAdj: string;
  totalAdj: string;
  nilaiTaksiran: string;
}

interface WorksheetState {
  namaObjek: string;
  lokasiObjek: string;
  roda2Atau3: boolean;
  roda4AtauLebih: boolean;
  merekKendaraan: string;
  tipeKendaraan: string;
  noPolisi: string;
  pemilikDokumen: string;
  penggunaanKendaraan: string;
  keteranganLain: string;
  nup: string;
  kategoriLokasi: string;
  warna: string;
  tahunPembuatan: string;
  bahanBakar: string;
  kondisiKendaraan: "0.5" | "0.6" | "0.7";
  bpkb: boolean;
  stnk: boolean;
  lainnya: boolean;
  tidakAda: boolean;
  masihBerlaku: boolean;
  habisMasa: boolean;
  lelangRows: LelangRow[];
  faktorLimit: string;
  lokasiTanggal: string;
  panitia1: string;
  panitia2: string;
  panitia3: string;
}

const kondisiOptions: Array<{
  value: WorksheetState["kondisiKendaraan"];
  label: string;
}> = [
  { value: "0.5", label: "0,5 (Tingkat kerusakan diatas 90%)" },
  { value: "0.6", label: "0,6 (Tingkat kerusakan diatas 80% - 90%)" },
  { value: "0.7", label: "0,7 (Tingkat kerusakan sampai dengan 80%)" },
];

const indonesianMonths = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTodayLocationDate() {
  const date = new Date();
  return `Samarinda, ${date.getDate()} ${indonesianMonths[date.getMonth()]} ${date.getFullYear()}`;
}

const emptyLelangRow = (): LelangRow => ({
  data: "",
  kode: "",
  tipe: "",
  harga: "",
  waktu: "",
  lokasi: "",
  kategori: "",
  tahun: "",
  tipeAdj: "0%",
  merekAdj: "0%",
  waktuAdj: "0%",
  lokasiAdj: "0%",
  tahunAdj: "0%",
  totalAdj: "0%",
  nilaiTaksiran: "",
});

const getAssetBrand = (asset: AuctionAsset) => {
  const merk = (asset.merk_tipe || "").trim();
  if (!merk) return "";
  return merk.split(/\s+/)[0] || merk;
};

const getAssetType = (asset: AuctionAsset) => {
  const merk = (asset.merk_tipe || "").trim();
  const brand = getAssetBrand(asset);
  return brand && merk.toLowerCase().startsWith(brand.toLowerCase())
    ? merk.slice(brand.length).trim() || merk
    : merk;
};

const createDefaultRows = (asset: AuctionAsset): LelangRow[] => {
  const brand = getAssetBrand(asset) || "Toyota";
  const type = getAssetType(asset) || asset.merk_tipe || asset.nama_barang;
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 3 }, (_, index) => {
    if (index > 2) return emptyLelangRow();

    const year = String((asset.tahun_perolehan || currentYear) + index + 1);
    const basePrice = Math.round((asset.nilai_perolehan || 0) * [0.38, 0.45, 0.36][index]);

    return {
      data: brand,
      kode: ["YBL2KQ", "XGTEX1", "26MRT0434"][index],
      tipe: type,
      harga: basePrice ? formatPlainRupiah(basePrice) : "",
      waktu: year,
      lokasi: index === 2 ? "Bontang" : "Samarinda",
      kategori: "3",
      tahun: String((asset.tahun_perolehan || currentYear) + index),
      tipeAdj: "0%",
      merekAdj: "0%",
      waktuAdj: index === 0 ? "2%" : index === 1 ? "6%" : "0%",
      lokasiAdj: "0%",
      tahunAdj: index === 0 ? "-14%" : index === 1 ? "-21%" : "-14%",
      totalAdj: index === 0 ? "-12%" : index === 1 ? "-15%" : "-14%",
      nilaiTaksiran: basePrice ? formatPlainRupiah(Math.round(basePrice * [0.88, 0.85, 0.86][index])) : "",
    };
  });
};

const createInitialState = (asset: AuctionAsset): WorksheetState => {
  const isMotorcycle = /sepeda\s*motor|motor/i.test(`${asset.nama_barang} ${asset.merk_tipe || ""}`);

  return {
    namaObjek: asset.merk_tipe || asset.nama_barang,
    lokasiObjek: asset.lokasi_spesifik || asset.lokasi_ruang || "Samarinda",
    roda2Atau3: isMotorcycle,
    roda4AtauLebih: !isMotorcycle,
    merekKendaraan: getAssetBrand(asset),
    tipeKendaraan: getAssetType(asset) || asset.merk_tipe || asset.nama_barang,
    noPolisi: asset.no_polisi || "",
    pemilikDokumen: "Kemenhut Ditjen KSDAE BKSDA KALTIM",
    penggunaanKendaraan: "Kendaraan Dinas",
    keteranganLain: "(diisi keterangan tambahan yang berkaitan dengan objek yang akan ditentukan nilai taksirannya)",
    nup: String(asset.nup || ""),
    kategoriLokasi: "3",
    warna: "",
    tahunPembuatan: String(asset.tahun_perolehan || ""),
    bahanBakar: "",
    kondisiKendaraan: "0.7",
    bpkb: true,
    stnk: true,
    lainnya: false,
    tidakAda: false,
    masihBerlaku: true,
    habisMasa: false,
    lelangRows: createDefaultRows(asset),
    faktorLimit: "0.7",
    lokasiTanggal: formatTodayLocationDate(),
    panitia1: "Dheny Mardiono, S.Hut., M.Sc.",
    panitia2: "Heryanto Sumanbowo, S.Hut.",
    panitia3: "Tegar Anugrah, A.Md.Kom.",
  };
};

const inputCls =
  "h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-900 outline-none focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

function parseMoney(value: string) {
  return Number(value.replace(/[^\d-]/g, "")) || 0;
}

function parsePercent(value: string) {
  const normalized = value.replace("%", "").replace(",", ".").trim();
  return Number(normalized) || 0;
}

function formatPercent(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return `${String(rounded).replace(".", ",")}%`;
}

function normalizePercentInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}

function getAdjustmentTotal(row: LelangRow) {
  return (
    parsePercent(row.tipeAdj) +
    parsePercent(row.merekAdj) +
    parsePercent(row.waktuAdj) +
    parsePercent(row.lokasiAdj) +
    parsePercent(row.tahunAdj)
  );
}

function getAdjustedValue(row: LelangRow) {
  const price = parseMoney(row.harga);
  if (!price) return 0;
  return Math.round(price * (1 + getAdjustmentTotal(row) / 100));
}

function WorksheetInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={inputCls} />
    </label>
  );
}

function CellInput({
  value,
  onChange,
  className = "",
  onBlur,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onBlur?: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className={`w-full min-w-0 border border-zinc-300 bg-white px-1 py-0.5 text-center outline-none focus:bg-yellow-50 ${className}`}
    />
  );
}

function CellTextarea({
  value,
  onChange,
  className = "",
  wrapAt = 18,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  wrapAt?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const visualRows = Math.max(
    1,
    ...String(value || "")
      .split(/\r?\n/)
      .map((line) => Math.ceil(Math.max(line.length, 1) / wrapAt)),
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.max(element.scrollHeight, visualRows * 14)}px`;
  }, [value, visualRows]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={visualRows}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full min-w-0 resize-none overflow-hidden border border-zinc-300 bg-white px-1 py-0.5 text-center leading-tight outline-none focus:bg-yellow-50 ${className}`}
    />
  );
}

function CheckedBox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="kk-check inline-flex items-center gap-1.5">
      <span className="kk-box inline-flex h-3 w-3 items-center justify-center border border-black text-[9px] leading-none">
        {checked ? "x" : ""}
      </span>
      <span>{label}</span>
    </span>
  );
}

function WorksheetCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
      />
      <span>{label}</span>
    </label>
  );
}

function EmployeeSelectInput({
  label,
  employees,
  onSelect,
}: {
  label: string;
  employees: EmployeeOption[];
  onSelect: (name: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      <select
        value=""
        onChange={(event) => {
          const employee = employees.find((item) => String(item.id) === event.target.value);
          if (employee) onSelect(employee.nama_lengkap || employee.name || "");
        }}
        className={inputCls}
      >
        <option value="">-- Pilih Pegawai --</option>
        {employees.map((employee) => (
          <option key={employee.id} value={String(employee.id)}>
            {employee.nama_lengkap || employee.name || "-"}
          </option>
        ))}
      </select>
    </label>
  );
}

export function handlePrintKertasKerjaAsset() {
  const printContent = document.getElementById("kertas-kerja-print-root");
  if (!printContent) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const clone = printContent.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("input").forEach((input) => {
    input.setAttribute("value", input.value);
  });
  clone.querySelectorAll("textarea").forEach((textarea) => {
    textarea.textContent = textarea.value;
    const rows = Number(textarea.getAttribute("rows") || "1");
    textarea.style.height = `${Math.max(textarea.scrollHeight, rows * 14)}px`;
  });

  printWindow.document.write(`
    <html>
      <head>
        <title>Kertas Kerja Analisis BMN</title>
        <style>
          @page { size: A4 portrait; margin: 7mm 8mm 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 7.8pt; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #c8c8c8; padding: 1px 2px; vertical-align: top; }
          .kk-page { width: 194mm; margin: 0 auto; border: 1px solid #111; }
          .kk-header { display: grid; grid-template-columns: 32mm 1fr; border-bottom: 1px solid #111; min-height: 19mm; }
          .kk-logo { display: flex; align-items: center; justify-content: center; }
          .kk-logo img { width: 24mm; height: auto; }
          .kk-title { display: flex; flex-direction: column; justify-content: center; text-align: center; font-weight: 700; line-height: 1.25; }
          .kk-content { padding: 3mm 4mm 4mm; }
          .kk-meta { display: grid; grid-template-columns: 31mm 3mm 1fr; width: 60mm; margin-bottom: 1.5mm; }
          .kk-section-title { margin: 1mm 0 .5mm; font-weight: 700; }
          .kk-identitas { display: grid; grid-template-columns: 1fr 1fr; gap: .5mm 8mm; }
          .kk-row { display: grid; grid-template-columns: 39mm 3mm 1fr; min-height: 3.5mm; }
          .kk-row-wide { grid-column: 1 / -1; }
          .kk-row-full { display: grid; grid-template-columns: 39mm 3mm 1fr; grid-column: 1 / -1; min-height: 3.5mm; }
          .kk-right-identitas .kk-row { grid-template-columns: 27mm 3mm 1fr; }
          .kk-checks { display: flex; gap: 8mm; align-items: center; white-space: nowrap; }
          .kk-doc-row .kk-checks { flex-wrap: nowrap; gap: 10mm; }
          .kk-check { display: inline-flex; align-items: center; gap: 1.5mm; white-space: nowrap; }
          .kk-bar { background: #aaa; border: 1px solid #888; text-align: center; font-weight: 700; padding: .5mm; margin-top: 1.2mm; }
          .kk-table { table-layout: fixed; }
          .kk-table th { text-align: center; font-weight: 700; }
          .kk-table th, .kk-table td { font-size: 6.9pt; line-height: 1.05; }
          .kk-table td { height: 4.8mm; }
          .kk-table input { width: 100%; min-width: 0; border: 1px solid #c8c8c8; font: inherit; height: 4mm; padding: 0 1mm; }
          .kk-table textarea { width: 100%; min-width: 0; border: 1px solid #c8c8c8; font: inherit; min-height: 4mm; padding: 0 1mm; overflow: hidden; white-space: normal; overflow-wrap: anywhere; resize: none; }
          .kk-table input, .kk-table textarea { border-color: transparent; background: transparent; }
          .kk-calculated-cell { display: block; width: 100%; min-height: 4mm; border: 1px solid #c8c8c8; padding: 0 1mm; text-align: right; line-height: 4mm; }
          .kk-calculated-cell { border-color: transparent; }
          .kk-calculated-cell.center { text-align: center; }
          .kk-right { text-align: right; }
          .kk-center { text-align: center; }
          .kk-summary { margin-top: 1mm; font-size: 7pt; line-height: 1.12; font-weight: 700; }
          .kk-summary-row { display: grid; grid-template-columns: 46mm 1fr 8mm 13mm 34mm; min-height: 3.4mm; }
          .kk-summary-main { grid-column: 5; text-align: right; }
          .kk-summary-x { grid-column: 3; text-align: center; }
          .kk-summary-factor { grid-column: 4; text-align: center; }
          .kk-summary-result { grid-column: 5; text-align: right; }
          .kk-date-panitia-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 6mm; text-align: center; }
          .kk-date-panitia-row > :first-child { text-align: left; padding-left: 9mm; }
          .kk-date-panitia-row > :nth-child(3) { text-align: center; }
          .kk-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 16mm; text-align: center; }
          .kk-box { display: inline-flex; width: 3mm; height: 3mm; align-items: center; justify-content: center; border: 1px solid #000; font-size: 7pt; line-height: 1; }
          .print-hidden { display: none !important; }
        </style>
      </head>
      <body>${clone.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function KertasKerjaAssetSection({
  asset,
  worksheetNumber,
  employees,
  onClose,
  initialState,
  isSaving = false,
  onSave,
}: KertasKerjaAssetSectionProps) {
  const [state, setState] = useState<WorksheetState>(() => {
    const defaultState = createInitialState(asset);
    if (!initialState) return defaultState;

    return {
      ...defaultState,
      ...initialState,
      lelangRows: initialState.lelangRows?.length ? initialState.lelangRows : defaultState.lelangRows,
    };
  });

  const computedRows = useMemo(
    () =>
      state.lelangRows.map((row) => ({
        row,
        totalAdj: getAdjustmentTotal(row),
        nilaiTaksiran: getAdjustedValue(row),
      })),
    [state.lelangRows],
  );
  const taksiranTotal = computedRows.reduce((sum, item) => sum + item.nilaiTaksiran, 0);
  const filledRows = computedRows.filter((item) => parseMoney(item.row.harga) > 0).length || 1;
  const rataRata = Math.round(taksiranTotal / filledRows);
  const limit = Math.round(rataRata * (Number(state.faktorLimit) || 0));
  const pembulatan = Math.floor(limit / 1000) * 1000;

  const update = <K extends keyof WorksheetState,>(key: K, value: WorksheetState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
  };

  const updateKondisi = (value: WorksheetState["kondisiKendaraan"]) => {
    setState((current) => ({
      ...current,
      kondisiKendaraan: value,
      faktorLimit: value,
    }));
  };

  const updateRow = (index: number, key: keyof LelangRow, value: string) => {
    setState((current) => ({
      ...current,
      lelangRows: current.lelangRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    }));
  };

  const normalizePercentRow = (index: number, key: keyof LelangRow) => {
    setState((current) => ({
      ...current,
      lelangRows: current.lelangRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: normalizePercentInput(String(row[key] || "")) } : row,
      ),
    }));
  };

  const addLelangRow = () => {
    setState((current) => ({
      ...current,
      lelangRows: [...current.lelangRows, emptyLelangRow()],
    }));
  };

  const removeLelangRow = (index: number) => {
    setState((current) => {
      if (current.lelangRows.length <= 3) return current;
      return {
        ...current,
        lelangRows: current.lelangRows.filter((_, rowIndex) => rowIndex !== index),
      };
    });
  };

  return (
    <section id="kertas-kerja-preview" className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Kertas Kerja Analisis Nilai Taksiran BMN</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nomor kertas kerja #{worksheetNumber} mengikuti urutan aset terpilih.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl gap-2 text-xs" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
            Tutup
          </Button>
          {onSave && (
            <Button
              className="rounded-xl gap-2 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={() => onSave({ nilaiTaksiran: pembulatan, worksheet: state })}
              disabled={isSaving}
            >
              {isSaving ? "Menyimpan..." : "Simpan Nilai Taksiran"}
            </Button>
          )}
          <Button className="rounded-xl gap-2 bg-slate-900 text-xs hover:bg-slate-800" onClick={handlePrintKertasKerjaAsset}>
            <Printer className="h-3.5 w-3.5" />
            Cetak / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4 print:hidden">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Identitas Aset</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <WorksheetInput label="Nama Objek" value={state.namaObjek} onChange={(value) => update("namaObjek", value)} />
              <WorksheetInput label="Lokasi Objek" value={state.lokasiObjek} onChange={(value) => update("lokasiObjek", value)} />
              <WorksheetInput label="Kategori Lokasi" value={state.kategoriLokasi} onChange={(value) => update("kategoriLokasi", value)} />
              <WorksheetInput label="Merek Kendaraan" value={state.merekKendaraan} onChange={(value) => update("merekKendaraan", value)} />
              <WorksheetInput label="Tipe Kendaraan" value={state.tipeKendaraan} onChange={(value) => update("tipeKendaraan", value)} />
              <WorksheetInput label="Nomor Polisi" value={state.noPolisi} onChange={(value) => update("noPolisi", value)} />
              <WorksheetInput label="Pemilik Dokumen" value={state.pemilikDokumen} onChange={(value) => update("pemilikDokumen", value)} />
              <WorksheetInput label="Penggunaan Kendaraan" value={state.penggunaanKendaraan} onChange={(value) => update("penggunaanKendaraan", value)} />
              <WorksheetInput label="Keterangan Lain" value={state.keteranganLain} onChange={(value) => update("keteranganLain", value)} />
            </div>
            <div className="mt-4 grid gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <WorksheetCheckbox checked={state.roda2Atau3} label="Roda 2 atau 3" onChange={(checked) => update("roda2Atau3", checked)} />
                <WorksheetCheckbox checked={state.roda4AtauLebih} label="Roda 4 atau lebih" onChange={(checked) => update("roda4AtauLebih", checked)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <WorksheetCheckbox checked={state.bpkb} label="BPKB" onChange={(checked) => update("bpkb", checked)} />
                <WorksheetCheckbox checked={state.stnk} label="STNK" onChange={(checked) => update("stnk", checked)} />
                <WorksheetCheckbox checked={state.lainnya} label="Lainnya" onChange={(checked) => update("lainnya", checked)} />
                <WorksheetCheckbox checked={state.tidakAda} label="Tidak ada" onChange={(checked) => update("tidakAda", checked)} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <WorksheetCheckbox checked={state.masihBerlaku} label="Masih Berlaku" onChange={(checked) => update("masihBerlaku", checked)} />
                <WorksheetCheckbox checked={state.habisMasa} label="Habis Masa" onChange={(checked) => update("habisMasa", checked)} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Fisik & Ringkasan</h3>
            <div className="grid gap-3">
              <WorksheetInput label="Warna" value={state.warna} onChange={(value) => update("warna", value)} />
              <WorksheetInput label="Tahun Pembuatan" value={state.tahunPembuatan} onChange={(value) => update("tahunPembuatan", value)} />
              <WorksheetInput label="Bahan Bakar" value={state.bahanBakar} onChange={(value) => update("bahanBakar", value)} />
              <WorksheetInput label="Lokasi / Tanggal" value={state.lokasiTanggal} onChange={(value) => update("lokasiTanggal", value)} />
            </div>
            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Kondisi Kendaraan</p>
              <div className="grid gap-2">
                {kondisiOptions.map((option) => (
                  <label key={option.value} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-200">
                    <input
                      type="radio"
                      name={`kondisi-${asset.id}`}
                      checked={state.kondisiKendaraan === option.value}
                      onChange={() => updateKondisi(option.value)}
                      className="mt-0.5 h-4 w-4 border-zinc-300 text-red-600 focus:ring-red-500"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Data Lelang</h3>
              <Button size="xs" variant="outline" className="rounded-lg gap-1" onClick={addLelangRow}>
                <Plus className="h-3 w-3" />
                Tambah Baris
              </Button>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Minimal 3 baris. Penyesuaian mengikuti baris data hasil lelang.
            </p>
            <div className="mt-3 space-y-2">
              {state.lelangRows.map((row, index) => (
                <div key={`lelang-control-${index}`} className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    Baris {index + 1}: {row.data || "Kosong"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLelangRow(index)}
                    disabled={state.lelangRows.length <= 3}
                    className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Panitia Penaksir</h3>
            <div className="grid gap-3">
              <EmployeeSelectInput label="Ambil Pegawai 1" employees={employees} onSelect={(name) => update("panitia1", name)} />
              <WorksheetInput label="Nama Panitia 1" value={state.panitia1} onChange={(value) => update("panitia1", value)} />
              <EmployeeSelectInput label="Ambil Pegawai 2" employees={employees} onSelect={(name) => update("panitia2", name)} />
              <WorksheetInput label="Nama Panitia 2" value={state.panitia2} onChange={(value) => update("panitia2", value)} />
              <EmployeeSelectInput label="Ambil Pegawai 3" employees={employees} onSelect={(name) => update("panitia3", name)} />
              <WorksheetInput label="Nama Panitia 3" value={state.panitia3} onChange={(value) => update("panitia3", value)} />
            </div>
          </div>
        </div>

        <div id="kertas-kerja-print-root" className="overflow-x-auto">
          <div className="kk-page mx-auto min-w-[980px] border border-zinc-900 bg-white text-black shadow-xl print:shadow-none">
            <style jsx global>{`
              .kk-page { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; }
              .kk-page table { border-collapse: collapse; width: 100%; }
              .kk-page th, .kk-page td { border: 1px solid #c8c8c8; padding: 2px 3px; vertical-align: top; }
              .kk-header { display: grid; grid-template-columns: 130px 1fr; border-bottom: 1px solid #111; min-height: 78px; }
              .kk-logo { display: flex; align-items: center; justify-content: center; }
              .kk-logo img { width: 94px; height: auto; }
              .kk-title { display: flex; flex-direction: column; justify-content: center; text-align: center; font-weight: 700; line-height: 1.25; }
              .kk-content { padding: 12px 16px 14px; }
              .kk-meta { display: grid; grid-template-columns: 145px 12px 1fr; width: 290px; margin-bottom: 7px; }
              .kk-section-title { margin: 5px 0 2px; font-weight: 700; }
              .kk-identitas { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 34px; }
              .kk-row { display: grid; grid-template-columns: 172px 12px 1fr; min-height: 16px; }
              .kk-row-wide { grid-column: 1 / -1; }
              .kk-row-full { display: grid; grid-template-columns: 172px 12px 1fr; grid-column: 1 / -1; min-height: 16px; }
              .kk-right-identitas .kk-row { grid-template-columns: 112px 12px 1fr; }
              .kk-checks { display: flex; gap: 28px; align-items: center; white-space: nowrap; }
              .kk-doc-row .kk-checks { flex-wrap: nowrap; gap: 44px; }
              .kk-check { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
              .kk-bar { background: #aaa; border: 1px solid #888; text-align: center; font-weight: 700; padding: 2px; margin-top: 6px; }
              .kk-table { table-layout: fixed; }
              .kk-table th { text-align: center; font-weight: 700; }
              .kk-table th, .kk-table td { font-size: 7.1pt; line-height: 1.05; }
              .kk-table td { height: 20px; }
              .kk-table input { width: 100%; min-width: 0; border: 1px solid #c8c8c8; font: inherit; height: 16px; line-height: 1; padding: 0 2px; }
              .kk-table textarea { width: 100%; min-width: 0; border: 1px solid #c8c8c8; font: inherit; min-height: 16px; line-height: 1.05; padding: 0 2px; overflow: hidden; white-space: normal; overflow-wrap: anywhere; resize: none; }
              .kk-calculated-cell { display: block; width: 100%; min-height: 16px; border: 1px solid #c8c8c8; padding: 0 2px; text-align: right; line-height: 16px; }
              .kk-calculated-cell.center { text-align: center; }
              @media print {
                .kk-table input,
                .kk-table textarea,
                .kk-calculated-cell {
                  border-color: transparent !important;
                  background: transparent !important;
                }
                .kk-table textarea {
                  overflow: visible !important;
                }
              }
              .kk-right { text-align: right; }
              .kk-center { text-align: center; }
              .kk-summary { margin-top: 5px; font-size: 9.5px; line-height: 1.12; font-weight: 700; }
              .kk-summary-row { display: grid; grid-template-columns: 220px 1fr 38px 58px 165px; min-height: 14px; }
              .kk-summary-main { grid-column: 5; text-align: right; }
              .kk-summary-x { grid-column: 3; text-align: center; }
              .kk-summary-factor { grid-column: 4; text-align: center; }
              .kk-summary-result { grid-column: 5; text-align: right; }
              .kk-date-panitia-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 24px; text-align: center; }
              .kk-date-panitia-row > :first-child { text-align: left; padding-left: 36px; }
              .kk-date-panitia-row > :nth-child(3) { text-align: center; }
              .kk-sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 58px; text-align: center; }
              .kk-box { display: inline-flex; width: 12px; height: 12px; align-items: center; justify-content: center; border: 1px solid #000; font-size: 9px; line-height: 1; }
              @media print {
                body * { visibility: hidden; }
                #kertas-kerja-print-root, #kertas-kerja-print-root * { visibility: visible; }
                #kertas-kerja-print-root { position: absolute; left: 0; top: 0; width: 100%; }
                .kk-page { width: 194mm !important; min-width: 0 !important; margin: 0 auto; box-shadow: none !important; }
              }
            `}</style>

            <div className="kk-header">
              <div className="kk-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo_kemenhut.png" alt="Logo Kementerian Kehutanan" />
              </div>
              <div className="kk-title">
                <div>KERTAS KERJA ANALISIS PENENTUAN NILAI TAKSIRAN BMN</div>
                <div>KEMENTERIAN KEHUTANAN</div>
                <div>TUJUAN PEMINDAHTANGANAN DENGAN PENJUALAN SECARA LELANG</div>
              </div>
            </div>

            <div className="kk-content">
              <div className="kk-meta">
                <span>Nomor Kertas Kerja</span>
                <span>:</span>
                <strong>{worksheetNumber}</strong>
              </div>

              <div className="kk-section-title">1 Identifikasi</div>
              <div className="kk-identitas">
                <div>
                  <div className="kk-row"><span>a. Nama Objek</span><span>:</span><span>{state.namaObjek}</span></div>
                  <div className="kk-row"><span>b. Lokasi Objek</span><span>:</span><span>{state.lokasiObjek}</span></div>
                  <div className="kk-row"><span>c. Jenis Kendaraan</span><span>:</span><span><CheckedBox checked={state.roda2Atau3} label="Roda 2 atau 3" /></span></div>
                  <div className="kk-row"><span>d. Merek Kendaraan</span><span>:</span><span>{state.merekKendaraan}</span></div>
                  <div className="kk-row"><span>e. Tipe Kendaraan</span><span>:</span><span>{state.tipeKendaraan}</span></div>
                  <div className="kk-row"><span>f. Identitas Kendaraan</span><span>:</span><span></span></div>
                  <div className="kk-row"><span>&nbsp;&nbsp;(i) Nomor Polisi</span><span>:</span><span>{state.noPolisi}</span></div>
                </div>
                <div className="kk-right-identitas">
                  <div className="kk-row"><span>NUP</span><span>:</span><span>{state.nup}</span></div>
                  <div className="kk-row"><span>Kategori Lokasi</span><span>:</span><span>{state.kategoriLokasi}</span></div>
                  <div className="kk-row"><span></span><span></span><span><CheckedBox checked={state.roda4AtauLebih} label="Roda 4 atau lebih" /></span></div>
                </div>
                <div className="kk-row-full kk-doc-row"><span>&nbsp;&nbsp;(ii) Dokumen Kepemilikan</span><span>:</span><span className="kk-checks"><CheckedBox checked={state.bpkb} label="BPKB" /><CheckedBox checked={state.stnk} label="STNK" /><CheckedBox checked={state.lainnya} label="Lainnya" /><CheckedBox checked={state.tidakAda} label="Tidak ada" /></span></div>
                <div className="kk-row-full"><span>&nbsp;&nbsp;(iii) Pemilik Dokumen</span><span>:</span><span>{state.pemilikDokumen}</span></div>
                <div className="kk-row-full"><span>&nbsp;&nbsp;(iv) Masa Berlaku</span><span>:</span><span className="kk-checks"><CheckedBox checked={state.masihBerlaku} label="Masih Berlaku" /><CheckedBox checked={state.habisMasa} label="Habis Masa" /></span></div>
                <div className="kk-row-full"><span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Keterangan</span><span>:</span><span></span></div>
                <div className="kk-row kk-row-wide"><span>&nbsp;&nbsp;(v) Penggunaan Kendaraan</span><span>:</span><span>{state.penggunaanKendaraan}</span></div>
                <div className="kk-row kk-row-wide"><span>&nbsp;&nbsp;(vi) Keterangan Lain</span><span>:</span><span>{state.keteranganLain}</span></div>
              </div>

              <div className="kk-section-title">2 Fisik Kendaraan</div>
              <div className="kk-identitas">
                <div>
                  <div className="kk-row"><span>a. Warna</span><span>:</span><span>{state.warna}</span></div>
                  <div className="kk-row"><span>b. Tahun Pembuatan</span><span>:</span><span>{state.tahunPembuatan}</span></div>
                  <div className="kk-row"><span>c. Bahan Bakar</span><span>:</span><span>{state.bahanBakar}</span></div>
                </div>
                <div>
                  <div className="kk-row"><span>d. Kondisi Kendaraan</span><span>:</span><span className="space-y-0.5">
                    {kondisiOptions.map((option) => (
                      <span key={option.value}>
                        <CheckedBox checked={state.kondisiKendaraan === option.value} label={option.label} />
                        <br />
                      </span>
                    ))}
                  </span></div>
                </div>
              </div>

              <div className="kk-bar">DATA HASIL LELANG</div>
              <table className="kk-table">
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "19%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "9%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Data Hasil Lelang</th>
                    <th>Kode Lelang</th>
                    <th>Tipe</th>
                    <th>Harga Lelang</th>
                    <th>Waktu lelang</th>
                    <th>Kategori Lokasi Lelang</th>
                    <th>Tahun Pembuatan</th>
                  </tr>
                </thead>
                <tbody>
                  {state.lelangRows.map((row, index) => (
                    <tr key={`lelang-${index}`}>
                      <td className="kk-center">{index + 1}</td>
                      <td><CellTextarea value={row.data} onChange={(value) => updateRow(index, "data", value)} /></td>
                      <td><CellInput value={row.kode} onChange={(value) => updateRow(index, "kode", value)} /></td>
                      <td><CellTextarea value={row.tipe} onChange={(value) => updateRow(index, "tipe", value)} /></td>
                      <td><CellInput value={row.harga} onChange={(value) => updateRow(index, "harga", value)} className="text-right" /></td>
                      <td><CellInput value={row.waktu} onChange={(value) => updateRow(index, "waktu", value)} /></td>
                      <td><CellInput value={row.lokasi} onChange={(value) => updateRow(index, "lokasi", value)} /></td>
                      <td><CellInput value={row.tahun} onChange={(value) => updateRow(index, "tahun", value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="kk-bar">PENYESUAIAN</div>
              <table className="kk-table">
                <colgroup>
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "17%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Data Hasil Lelang</th>
                    <th>Tipe</th>
                    <th>Merek</th>
                    <th>Waktu</th>
                    <th>Lokasi</th>
                    <th>Tahun Pembuatan</th>
                    <th>Total</th>
                    <th>Nilai taksiran</th>
                  </tr>
                </thead>
                <tbody>
                  {computedRows.map(({ row, totalAdj, nilaiTaksiran }, index) => (
                    <tr key={`adjust-${index}`}>
                      <td className="kk-center">{index + 1}</td>
                      <td><CellTextarea value={row.data} onChange={(value) => updateRow(index, "data", value)} /></td>
                      <td><CellInput value={row.tipeAdj} onChange={(value) => updateRow(index, "tipeAdj", value)} onBlur={() => normalizePercentRow(index, "tipeAdj")} /></td>
                      <td><CellInput value={row.merekAdj} onChange={(value) => updateRow(index, "merekAdj", value)} onBlur={() => normalizePercentRow(index, "merekAdj")} /></td>
                      <td><CellInput value={row.waktuAdj} onChange={(value) => updateRow(index, "waktuAdj", value)} onBlur={() => normalizePercentRow(index, "waktuAdj")} /></td>
                      <td><CellInput value={row.lokasiAdj} onChange={(value) => updateRow(index, "lokasiAdj", value)} onBlur={() => normalizePercentRow(index, "lokasiAdj")} /></td>
                      <td><CellInput value={row.tahunAdj} onChange={(value) => updateRow(index, "tahunAdj", value)} onBlur={() => normalizePercentRow(index, "tahunAdj")} /></td>
                      <td><span className="kk-calculated-cell center">{formatPercent(totalAdj)}</span></td>
                      <td><span className="kk-calculated-cell">{nilaiTaksiran ? formatPlainRupiah(nilaiTaksiran) : ""}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="kk-summary">
                <div className="kk-summary-row">
                  <span>Nilai Taksiran</span>
                  <span className="kk-summary-main">Rp{formatPlainRupiah(taksiranTotal)},00</span>
                </div>
                <div className="kk-summary-row">
                  <span>Rata-Rata Nilai Taksiran</span>
                  <span className="kk-summary-main">Rp{formatPlainRupiah(rataRata)},00</span>
                </div>
                <div className="kk-summary-row">
                  <span>Taksiran Nilai Limit Lelang</span>
                  <span className="kk-summary-x">x</span>
                  <span className="kk-summary-factor">{state.faktorLimit.replace(".", ",")}</span>
                  <span className="kk-summary-result">Rp{formatPlainRupiah(limit)},00</span>
                </div>
                <div className="kk-summary-row">
                  <span>Pembulatan</span>
                  <span className="kk-summary-result">Rp{formatPlainRupiah(pembulatan)},00</span>
                </div>
              </div>

              <div className="kk-date-panitia-row">
                <span>Panitia Penaksir</span>
                <span></span>
                <span>{state.lokasiTanggal}</span>
              </div>
              <div className="kk-sign">
                <span>{state.panitia1}</span>
                <span>{state.panitia2}</span>
                <span>{state.panitia3}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
