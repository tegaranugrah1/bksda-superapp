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
  paperType?: "full" | "half";
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
  paperType = "full",
}: LembarDisposisi2UpPrintProps) {
  const secondSurat = surat2 || surat1;
  const secondDiteruskan = surat2 ? diteruskan2 : diteruskan1;
  const secondCatatan = surat2 ? catatan2 : catatan1;

  const isKanan = oneUpPosition === "kanan";

  // Dedicated layout when printing on ALREADY HALF-CUT paper (165mm x 215mm / A5 / Statement)
  if (paperType === "half") {
    return (
      <div id="lembar-disposisi-2up-print-root" className="lembar-disposisi-half-root flex justify-center">
        <style jsx global>{`
          @media print {
            @page {
              size: portrait;
              margin: 0 !important;
            }
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
              overflow: hidden !important;
            }
            .no-print {
              display: none !important;
            }
            body * {
              visibility: hidden;
            }
            .lembar-disposisi-half-root,
            .lembar-disposisi-half-root * {
              visibility: visible !important;
            }
            .lembar-disposisi-half-root {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: 100% !important;
              background: white !important;
              padding: 3.5mm 4mm !important;
              box-sizing: border-box !important;
              z-index: 999999 !important;
              display: flex !important;
              justify-content: center !important;
            }
          }
        `}</style>

        <div className="w-full max-w-[160mm] h-[188mm] print:w-full print:h-full p-1 print:p-0 flex flex-col mx-auto">
          <LembarDisposisiSheet
            data={surat1}
            customDiteruskanList={diteruskan1.length > 0 ? diteruskan1 : undefined}
            catatanDisposisi={catatan1}
            isGreenTheme={isGreenTheme}
          />
        </div>
      </div>
    );
  }

  const showLeftSheet = isTwoUpMode || !isKanan;
  const showRightSheet = isTwoUpMode || isKanan;

  const leftSuratData = surat1;
  const leftDiteruskan = diteruskan1;
  const leftCatatan = catatan1;

  const rightSuratData = isTwoUpMode ? secondSurat : surat1;
  const rightDiteruskan = isTwoUpMode ? secondDiteruskan : diteruskan1;
  const rightCatatan = isTwoUpMode ? secondCatatan : catatan1;

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
          .lembar-disposisi-2up-root {
            visibility: visible !important;
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
          .lembar-disposisi-2up-root * {
            visibility: visible !important;
          }
          .print-invisible,
          .print-invisible * {
            visibility: hidden !important;
            opacity: 0 !important;
          }
        }
      `}</style>

      {/* Side-by-side 2-Up / 1-Up Landscape Grid Container (Symmetric 50-50 Grid with 5mm Cut Line Gap) */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3 w-full h-[188mm] print:w-[322mm] print:h-[208mm] p-1 print:p-0">
        {/* Left Disposisi Sheet Column */}
        <div className={`w-full h-full flex flex-col ${!showLeftSheet ? "invisible print-invisible opacity-0" : ""}`}>
          <LembarDisposisiSheet
            data={leftSuratData}
            customDiteruskanList={leftDiteruskan.length > 0 ? leftDiteruskan : undefined}
            catatanDisposisi={leftCatatan}
            isGreenTheme={isGreenTheme}
          />
        </div>

        {/* Vertical Cut Line Guide with Clear Side Padding */}
        <div className="relative flex items-center justify-center w-5 h-full overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-zinc-400 print:border-black" />
          <span className="relative z-10 text-[7px] text-zinc-600 print:text-black font-mono tracking-tighter uppercase whitespace-nowrap rotate-90 bg-white print:bg-white px-1 py-0.5 rounded my-auto border border-zinc-200 print:border-black">
            ✂ POTONG DISINI ✂
          </span>
        </div>

        {/* Right Disposisi Sheet Column */}
        <div className={`w-full h-full flex flex-col ${!showRightSheet ? "invisible print-invisible opacity-0" : ""}`}>
          <LembarDisposisiSheet
            data={rightSuratData}
            customDiteruskanList={rightDiteruskan.length > 0 ? rightDiteruskan : undefined}
            catatanDisposisi={rightCatatan}
            isGreenTheme={isGreenTheme}
          />
        </div>
      </div>
    </div>
  );
}
