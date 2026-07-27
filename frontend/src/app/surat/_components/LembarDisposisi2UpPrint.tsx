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
  isTwoUpMode = false,
  oneUpPosition = "kiri",
}: LembarDisposisi2UpPrintProps) {
  const secondSurat = surat2 || surat1;
  const secondDiteruskan = surat2 ? diteruskan2 : diteruskan1;
  const secondCatatan = surat2 ? catatan2 : catatan1;

  const isKanan = oneUpPosition === "kanan";

  const showLeftSheet = isTwoUpMode || !isKanan;
  const showRightSheet = isTwoUpMode || isKanan;

  const leftSuratData = surat1;
  const leftDiteruskan = diteruskan1;
  const leftCatatan = catatan1;

  const rightSuratData = isTwoUpMode ? secondSurat : surat1;
  const rightDiteruskan = isTwoUpMode ? secondDiteruskan : diteruskan1;
  const rightCatatan = isTwoUpMode ? secondCatatan : catatan1;

  const isOneUpKanan = !isTwoUpMode && isKanan;

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
            padding: 5mm 4mm !important;
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
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3 w-full h-[182mm] print:w-[322mm] print:h-[196mm] p-1 print:p-0">
        {/* Left Disposisi Sheet Column */}
        <div className={`w-full h-full flex flex-col ${!showLeftSheet ? "invisible print-invisible opacity-0" : ""}`}>
          <LembarDisposisiSheet
            data={leftSuratData}
            customDiteruskanList={leftDiteruskan.length > 0 ? leftDiteruskan : undefined}
            catatanDisposisi={leftCatatan}
          />
        </div>

        {/* Vertical Dashed Cut Line Guide (No Text) */}
        <div className="relative flex items-center justify-center w-5 h-full overflow-hidden">
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l border-dashed border-zinc-400 print:border-black" />
        </div>

        {/* Right Disposisi Sheet Column (Scaled down to 95% when 1-Up Posisi Kanan to protect left border) */}
        <div className={`w-full h-full flex flex-col transition-transform ${!showRightSheet ? "invisible print-invisible opacity-0" : ""} ${isOneUpKanan ? "scale-[0.95] origin-right" : ""}`}>
          <LembarDisposisiSheet
            data={rightSuratData}
            customDiteruskanList={rightDiteruskan.length > 0 ? rightDiteruskan : undefined}
            catatanDisposisi={rightCatatan}
          />
        </div>
      </div>
    </div>
  );
}
