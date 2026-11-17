"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KepegawaianDialog } from "@/app/kepegawaian/_components/KepegawaianDialog";
import type { SuratMasuk } from "../../_lib/surat-types";
import { Disposisi2UpSheetGrid } from "../../_components/LembarDisposisi2UpPrint";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pair letters two-by-two for 2-Up printing per physical sheet (Letter/Folio Landscape)
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

  // Dedicated Print Content to be teleported directly to document.body
  const printPortalContent = (
    <div id="batch-print-portal-root">
      {/* ── Strict Print Styles (Active ONLY during browser print) ── */}
      <style jsx global>{`
        @media screen {
          #batch-print-portal-root {
            display: none !important;
          }
        }
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
            min-width: 330mm !important;
          }
          /* Strip all other body children from the document flow completely */
          body > *:not(#batch-print-portal-root) {
            display: none !important;
            visibility: hidden !important;
          }
          /* Normal static flow for print root - No ghost elements, no trailing pages */
          #batch-print-portal-root {
            display: block !important;
            position: static !important;
            width: 330mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            visibility: visible !important;
          }
          #batch-print-portal-root * {
            visibility: visible !important;
          }
          .batch-clean-sheet {
            width: 330mm !important;
            height: 213mm !important;
            max-height: 213mm !important;
            padding: 3.5mm 4mm !important;
            box-sizing: border-box !important;
            background: white !important;
            margin: 0 !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Page break ONLY between sheets (adjacent siblings), NEVER on 1st sheet or trailing page! */
          .batch-clean-sheet + .batch-clean-sheet {
            page-break-before: always !important;
            break-before: page !important;
          }
          .batch-clean-grid {
            width: 322mm !important;
            height: 204mm !important;
            max-height: 204mm !important;
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) !important;
            gap: 12px !important;
            align-items: stretch !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-invisible,
          .print-invisible * {
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Render all sheets for physical print */}
      {sheets.map((sheet, idx) => (
        <div key={idx} className="batch-clean-sheet">
          <Disposisi2UpSheetGrid
            leftData={sheet.left}
            rightData={sheet.right || sheet.left}
            leftCatatan={sheet.left.catatan || ""}
            rightCatatan={sheet.right ? sheet.right.catatan || "" : ""}
            showRight={Boolean(sheet.right)}
          />
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* ── Screen Modal UI (Preview on Screen Only, Hidden via .no-print on Print) ── */}
      <KepegawaianDialog
        title={`Pratinjau Cetak 2-Up (${selectedSurat.length} Surat)`}
        onClose={onClose}
        module="persuratan"
        className="no-print sm:max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-zinc-800 px-6 py-4 bg-slate-50/70 dark:bg-zinc-800/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)]">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--ds-fg)] flex items-center gap-2">
                Pratinjau Cetak 2-Up ({selectedSurat.length} Surat)
                <span className="text-xs px-2 py-1 rounded-full bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border border-[var(--ds-accent-soft-border)] font-semibold">
                  {sheets.length} Lembar Kertas
                </span>
              </h2>
              <p className="text-xs text-[var(--ds-fg-muted)] mt-1">
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
              className="kpg-secondary h-9 px-3 text-xs font-semibold rounded-lg"
            >
              <X className="h-4 w-4 mr-1" />
              Tutup
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-4 text-xs font-bold bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)] rounded-lg"
            >
              <Printer className="h-4 w-4 mr-2" />
              Cetak Sekarang ({sheets.length} Lembar)
            </Button>
          </div>
        </div>

        {/* Odd Tail Info Note */}
        {selectedSurat.length % 2 !== 0 && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Jumlah surat ganjil ({selectedSurat.length} surat). Lembar ke-{sheets.length} mencetak Surat Agenda #{sheets[sheets.length - 1]?.left.no_agenda} di sisi kiri saja, dan sisi kanan kosong agar separuh kertas dapat digunakan lagi.
            </span>
          </div>
        )}

        {/* Scrollable Screen Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[var(--ds-surface-muted)]">
          {sheets.map((sheet, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-[var(--ds-fg-muted)]">
                <span className="flex items-center gap-2 text-[var(--ds-fg)]">
                  <FileText className="h-3.5 w-3.5 text-[var(--ds-accent-fg)]" />
                  Lembar Ke-{sheet.sheetIndex} dari {sheets.length}
                </span>
                <span>
                  Kiri: #{sheet.left.no_agenda} {sheet.right ? `| Kanan: #${sheet.right.no_agenda}` : "| Kanan: (Kosong)"}
                </span>
              </div>

              {/* Screen Preview Container */}
              <div className="overflow-x-auto">
                <div className="min-w-[880px] rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-white p-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3">
                  {/* Left */}
                  <div className="w-full h-full flex flex-col">
                    <LembarDisposisiSheet
                      data={sheet.left}
                      catatanDisposisi={sheet.left.catatan || ""}
                    />
                  </div>

                  {/* Cut Line */}
                  <div className="relative flex items-center justify-center w-5 h-full overflow-hidden">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-zinc-300 dark:border-zinc-700" />
                  </div>

                  {/* Right */}
                  {sheet.right ? (
                    <div className="w-full h-full flex flex-col">
                      <LembarDisposisiSheet
                        data={sheet.right}
                        catatanDisposisi={sheet.right.catatan || ""}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg p-6 text-center text-zinc-400">
                      <span className="text-xs font-semibold uppercase tracking-wider block">
                        Sisi Kanan Kosong
                      </span>
                      <span className="text-xs text-zinc-400 mt-1">
                        (Disimpan untuk pencetakan berikutnya)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </KepegawaianDialog>

      {/* ── Teleport Clean Print Root Directly to document.body ── */}
      {mounted && typeof document !== "undefined" && createPortal(printPortalContent, document.body)}
    </>
  );
}
