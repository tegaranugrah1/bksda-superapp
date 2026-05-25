"use client";

import { FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectedAssetsBannerProps {
  orderedIdsLength: number;
  showDocument: boolean;
  showSkDocument: boolean;
  showSkPanitia: boolean;
  showSptjLimit: boolean;
  showSptjm: boolean;
  showSpTugas: boolean;
  showSkKebenaran: boolean;
  showBaPemeriksaan: boolean;
  onProcess: () => void;
  onProcessSk: () => void;
  onProcessSkPanitia: () => void;
  onProcessSptjLimit: () => void;
  onProcessSptjm: () => void;
  onProcessSpTugas: () => void;
  onProcessSkKebenaran: () => void;
  onProcessBaPemeriksaan: () => void;
  onPrint: () => void;
  onPrintSk: () => void;
  onPrintSkPanitia: () => void;
  onPrintSptjLimit: () => void;
  onPrintSptjm: () => void;
  onPrintSpTugas: () => void;
  onPrintSkKebenaran: () => void;
  onPrintBaPemeriksaan: () => void;
}

export function SelectedAssetsBanner({
  orderedIdsLength,
  showDocument,
  showSkDocument,
  showSkPanitia,
  showSptjLimit,
  showSptjm,
  showSpTugas,
  showSkKebenaran,
  showBaPemeriksaan,
  onProcess,
  onProcessSk,
  onProcessSkPanitia,
  onProcessSptjLimit,
  onProcessSptjm,
  onProcessSpTugas,
  onProcessSkKebenaran,
  onProcessBaPemeriksaan,
  onPrint,
  onPrintSk,
  onPrintSkPanitia,
  onPrintSptjLimit,
  onPrintSptjm,
  onPrintSpTugas,
  onPrintSkKebenaran,
  onPrintBaPemeriksaan,
}: SelectedAssetsBannerProps) {
  if (orderedIdsLength === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-red-800 dark:text-red-300">{orderedIdsLength} aset dipilih</p>
        <p className="text-xs text-red-700/80 dark:text-red-400">Dokumen BA Koreksi akan memakai aset yang dipilih di halaman ini.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-lg bg-red-600 text-xs hover:bg-red-500" onClick={onProcess}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate BA Koreksi
        </Button>
        <Button size="sm" className="rounded-lg bg-amber-600 text-xs hover:bg-amber-500" onClick={onProcessSk}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate SK Penghentian
        </Button>
        <Button size="sm" className="rounded-lg bg-teal-600 text-xs hover:bg-teal-500" onClick={onProcessSkPanitia}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate SK Panitia
        </Button>
        <Button size="sm" className="rounded-lg bg-blue-600 text-xs hover:bg-blue-500" onClick={onProcessSptjLimit}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate SPTJ Limit
        </Button>
        <Button size="sm" className="rounded-lg bg-purple-600 text-xs hover:bg-purple-500" onClick={onProcessSptjm}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate SPTJM
        </Button>
        <Button size="sm" className="rounded-lg bg-pink-600 text-xs hover:bg-pink-500" onClick={onProcessSpTugas}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate SP Tugas
        </Button>
        <Button size="sm" className="rounded-lg bg-cyan-600 text-xs hover:bg-cyan-500" onClick={onProcessSkKebenaran}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate SK Kebenaran
        </Button>
        <Button size="sm" className="rounded-lg bg-orange-600 text-xs hover:bg-orange-500" onClick={onProcessBaPemeriksaan}>
          <FileText className="mr-1 h-3.5 w-3.5" />
          Generate BA Pemeriksaan
        </Button>
        {showDocument && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrint}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak BA
          </Button>
        )}
        {showSkDocument && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintSk}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak SK
          </Button>
        )}
        {showSkPanitia && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintSkPanitia}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak SK Panitia
          </Button>
        )}
        {showSptjLimit && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintSptjLimit}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak SPTJ Limit
          </Button>
        )}
        {showSptjm && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintSptjm}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak SPTJM
          </Button>
        )}
        {showSpTugas && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintSpTugas}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak SP Tugas
          </Button>
        )}
        {showSkKebenaran && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintSkKebenaran}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak SK Kebenaran
          </Button>
        )}
        {showBaPemeriksaan && (
          <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={onPrintBaPemeriksaan}>
            <Printer className="mr-1 h-3.5 w-3.5" />
            Cetak BA Pemeriksaan
          </Button>
        )}
      </div>
    </div>
  );
}
