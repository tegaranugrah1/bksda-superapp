"use client";

import type { SuratMasuk } from "../_lib/surat-types";
import { LembarDisposisiSheet } from "./LembarDisposisiSheet";

interface LembarDisposisi2UpPrintProps {
  surat1: SuratMasuk;
  diteruskan1?: string[];
  catatan1?: string;

  surat2?: SuratMasuk;
  diteruskan2?: string[];
  catatan2?: string;

  isGreenTheme?: boolean;
  isTwoUpMode?: boolean;
  oneUpPosition?: "kiri" | "kanan";
}

export function LembarDisposisi2UpPrint({
  surat1,
  diteruskan1 = [],
  catatan1 = "",
  surat2,
  diteruskan2 = [],
  catatan2 = "",
  isGreenTheme = false,
  isTwoUpMode = false,
  oneUpPosition = "kiri",
}: LembarDisposisi2UpPrintProps) {
  const secondSurat = surat2 || surat1;
  const secondDiteruskan = surat2 ? diteruskan2 : diteruskan1;
  const secondCatatan = surat2 ? catatan2 : catatan1;

  const isKanan = oneUpPosition === "kanan";

  if (!isTwoUpMode) {
    return (
      <div id="lembar-disposisi-2up-print-root" className="lembar-disposisi-2up-root">
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
              height: 215mm !important;
              min-width: 330mm !important;
              min-height: 215mm !important;
              overflow: hidden !important;
            }
            .no-print {
              display: none !important;
            }
            body * {
              visibility: hidden;
            }
            .lembar-disposisi-2up-root,
            .lembar-disposisi-2up-root * {
              visibility: visible !important;
            }
            .lembar-disposisi-2up-root {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 330mm !important;
              height: 215mm !important;
              min-width: 330mm !important;
              min-height: 215mm !important;
              background: white !important;
              padding: 3.5mm 4mm !important;
              box-sizing: border-box !important;
              z-index: 999999 !important;
            }
          }
        `}</style>

        {/* 1-Up Landscape Grid Container (Positioned Left or Right) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1 w-full h-[188mm] print:w-[322mm] print:h-[208mm] p-1 print:p-0">
          {/* Left Column */}
          {isKanan ? (
            <div className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col">
              <LembarDisposisiSheet
                data={surat1}
                customDiteruskanList={diteruskan1.length > 0 ? diteruskan1 : undefined}
                catatanDisposisi={catatan1}
                isGreenTheme={isGreenTheme}
              />
            </div>
          )}

          {/* Middle Spacer Column */}
          <div className="w-3 h-full" />

          {/* Right Column */}
          {isKanan ? (
            <div className="w-full h-full flex flex-col">
              <LembarDisposisiSheet
                data={surat1}
                customDiteruskanList={diteruskan1.length > 0 ? diteruskan1 : undefined}
                catatanDisposisi={catatan1}
                isGreenTheme={isGreenTheme}
              />
            </div>
          ) : (
            <div className="w-full h-full" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="lembar-disposisi-2up-print-root" className="lembar-disposisi-2up-root">
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
            height: 215mm !important;
            min-width: 330mm !important;
            min-height: 215mm !important;
            overflow: hidden !important;
          }
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .lembar-disposisi-2up-root,
          .lembar-disposisi-2up-root * {
            visibility: visible !important;
          }
          .lembar-disposisi-2up-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 330mm !important;
            height: 215mm !important;
            min-width: 330mm !important;
            min-height: 215mm !important;
            background: white !important;
            padding: 3.5mm 4mm !important;
            box-sizing: border-box !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      {/* Side-by-side 2-Up Landscape Container (Exact F4 330mm x 215mm Fit) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1 w-full h-[188mm] print:w-[322mm] print:h-[208mm] p-1 print:p-0">
        {/* Left Disposisi Sheet */}
        <div className="w-full h-full flex flex-col">
          <LembarDisposisiSheet
            data={surat1}
            customDiteruskanList={diteruskan1.length > 0 ? diteruskan1 : undefined}
            catatanDisposisi={catatan1}
            isGreenTheme={isGreenTheme}
          />
        </div>

        {/* Ultra-Narrow Vertical Cut Line */}
        <div className="relative flex items-center justify-center w-3 h-full overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-zinc-400 print:border-black" />
          <span className="relative z-10 text-[6px] text-zinc-500 print:text-black font-mono tracking-tighter uppercase whitespace-nowrap rotate-90 bg-white print:bg-transparent px-0.5 my-auto">
            ✂ POTONG DISINI ✂
          </span>
        </div>

        {/* Right Disposisi Sheet */}
        <div className="w-full h-full flex flex-col">
          <LembarDisposisiSheet
            data={secondSurat}
            customDiteruskanList={secondDiteruskan.length > 0 ? secondDiteruskan : undefined}
            catatanDisposisi={secondCatatan}
            isGreenTheme={isGreenTheme}
          />
        </div>
      </div>
    </div>
  );
}
