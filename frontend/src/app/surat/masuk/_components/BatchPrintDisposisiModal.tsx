"use client";

import { useMemo } from "react";
import { Printer, X, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SuratMasuk } from "../../_lib/surat-types";
import { LembarDisposisiSheet } from "../../_components/LembarDisposisiSheet";

interface BatchPrintDisposisiModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSurat: SuratMasuk[];
}

export function BatchPrintDisposisiModal({
  isOpen,
  onClose,
  selectedSurat,
}: BatchPrintDisposisiModalProps) {
  // Pair letters two-by-two for 2-Up printing per physical sheet
  const sheets = useMemo(() => {
    const pairs: Array<{ left: SuratMasuk; right?: SuratMasuk; sheetIndex: number }> = [];
    for (let i = 0; i < selectedSurat.length; i += 2) {
      pairs.push({
        left: selectedSurat[i],
        right: selectedSurat[i + 1], // undefined if odd count
        sheetIndex: Math.floor(i / 2) + 1,
      });
    }
    return pairs;
  }, [selectedSurat]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* ── Global Print Styles for Multi-Sheet 2-Up (Folio/Letter 330mm x 215mm) ── */}
      <style jsx global>{`
        @media print {
          @page {
            size: 330mm 215mm;
            margin: 0 !important;
          }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 330mm !important;
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
          }
          .no-print,
          header,
          nav,
          footer,
          aside {
            display: none !important;
          }
          body * {
            visibility: hidden !important;
          }
          #batch-print-modal-content,
          #batch-print-modal-content * {
            visibility: visible !important;
          }
          #batch-print-modal-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 330mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            z-index: 9999999 !important;
          }
          .batch-print-sheet {
            page-break-after: always !important;
            break-after: page !important;
            width: 330mm !important;
            height: 215mm !important;
            min-width: 330mm !important;
            min-height: 215mm !important;
            padding: 3.5mm 4mm !important;
            box-sizing: border-box !important;
            background: white !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
            gap: 12px !important;
          }
          .batch-print-sheet:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          .batch-print-empty-right {
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      <div
        id="batch-print-modal-content"
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header (Hidden when printing) */}
        <div className="no-print flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5 bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                Pratinjau Cetak 2-Up ({selectedSurat.length} Surat)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  {sheets.length} Lembar Kertas
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Format kertas Letter/Folio Landscape (330mm x 215mm) dibagi dua berdampingan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 px-3 text-xs font-semibold rounded-xl"
            >
              <X className="h-4 w-4 mr-1" />
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Cetak Sekarang ({sheets.length} Lembar)
            </Button>
          </div>
        </div>

        {/* Informative Note for Odd Tail (Hidden when printing) */}
        {selectedSurat.length % 2 !== 0 && (
          <div className="no-print mx-5 mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Jumlah surat ganjil ({selectedSurat.length} surat). Lembar ke-{sheets.length} akan mencetak Surat Agenda #{sheets[sheets.length - 1]?.left.no_agenda} di sisi kiri saja, dan sisi kanan dibiarkan kosong agar kertas dapat digunakan lagi.
            </span>
          </div>
        )}

        {/* Scrollable Preview Canvas for All Sheets */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-zinc-100/60 dark:bg-zinc-900/40">
          {sheets.map((sheet, idx) => (
            <div key={idx} className="space-y-2">
              <div className="no-print flex items-center justify-between px-1 text-xs font-semibold text-zinc-500">
                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  Lembar Ke-{sheet.sheetIndex} dari {sheets.length}
                </span>
                <span>
                  Kiri: #{sheet.left.no_agenda} {sheet.right ? `| Kanan: #${sheet.right.no_agenda}` : "| Kanan: (Kosong)"}
                </span>
              </div>

              {/* Physical Sheet Simulation Container */}
              <div className="batch-print-sheet rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-3 shadow-md grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3">
                {/* Left Side Sheet */}
                <div className="w-full h-full flex flex-col">
                  <LembarDisposisiSheet
                    data={sheet.left}
                    catatanDisposisi={sheet.left.catatan || ""}
                  />
                </div>

                {/* Vertical Cut Line */}
                <div className="relative flex items-center justify-center w-5 h-full overflow-hidden">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-zinc-300 dark:border-zinc-700 print:border-black" />
                </div>

                {/* Right Side Sheet */}
                {sheet.right ? (
                  <div className="w-full h-full flex flex-col">
                    <LembarDisposisiSheet
                      data={sheet.right}
                      catatanDisposisi={sheet.right.catatan || ""}
                    />
                  </div>
                ) : (
                  <div className="batch-print-empty-right w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
                    <span className="text-xs font-semibold uppercase tracking-wider block">
                      Sisi Kanan Kosong
                    </span>
                    <span className="text-[11px] text-zinc-400 mt-1">
                      (Disimpan untuk pencetakan berikutnya)
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
