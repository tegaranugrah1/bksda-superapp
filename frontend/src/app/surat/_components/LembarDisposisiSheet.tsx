"use client";

import type { SuratMasuk } from "../_lib/surat-types";
import { DITERUSKAN_OPTIONS, SIFAT_OPTIONS } from "../_lib/surat-types";

interface LembarDisposisiSheetProps {
  data: SuratMasuk;
  customDiteruskanList?: string[];
  catatanDisposisi?: string;
}

// Helper to format date string to DD/MM/YY format (e.g. 2026-07-24 -> 24/07/26)
function formatDateDdMmYy(dateStr?: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const parts = dateStr.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
    }
    return dateStr;
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const shortYear = year.length === 4 ? year.slice(-2) : year;
    return `${day}/${month}/${shortYear}`;
  }
  return dateStr;
}

const FONT_AGENCY = { fontFamily: "'Agency FB', 'Arial Narrow', 'Arial', sans-serif" };
const FONT_ARIAL_NOVA_COND = { fontFamily: "'Arial Nova Cond', 'Arial Nova Condensed', 'Arial Narrow', 'Arial', sans-serif" };

export function LembarDisposisiSheet({
  data,
  customDiteruskanList,
  catatanDisposisi = "",
}: LembarDisposisiSheetProps) {
  const diteruskanItems = customDiteruskanList || DITERUSKAN_OPTIONS;

  return (
    <div
      className="w-full h-full flex flex-col justify-between border-2 border-solid border-black box-border text-black text-[13.5px] leading-snug select-none bg-white"
      style={FONT_AGENCY}
    >
      <div>
        {/* ── 1. Top Header (Right divider boundary at 60% aligns with Right Border of Kilat) ── */}
        <div className="border-b border-black grid grid-cols-[60%_40%] divide-x divide-black">
          {/* Left Header Block (Title + Logos) */}
          <div className="grid grid-cols-[44%_56%] divide-x divide-black">
            {/* Title (Single line LEMBAR DISPOSISI with Agency FB font) */}
            <div className="flex items-center justify-center font-extrabold tracking-wider text-[17px] uppercase px-1.5 py-1 whitespace-nowrap" style={FONT_AGENCY}>
              LEMBAR DISPOSISI
            </div>

            {/* Center Logo Section */}
            <div className="flex items-center justify-center gap-1.5 px-1 py-1 font-bold text-xs">
              {/* Logo Kemenhut (Left) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logokemenhutxl.png"
                alt="Logo Kemenhut"
                className="h-10 w-auto object-contain shrink-0"
              />
              
              <span className="text-center font-black px-0.5 text-[14.5px] uppercase tracking-wider whitespace-nowrap" style={FONT_AGENCY}>
                BKSDA KALTIM
              </span>

              {/* Logo BKSDA (Right) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logobksdaxl.jpg"
                alt="Logo BKSDA"
                className="h-10 w-auto object-contain shrink-0"
              />
            </div>
          </div>

          {/* Tanggal & No Agenda (Each has its own border via divide-y) */}
          <div className="divide-y divide-black whitespace-nowrap">
            <div className="p-1 px-2 flex items-center min-h-6.75">
              <span className="w-22 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Tanggal</span>
              <span className="font-bold text-[17px]" style={FONT_ARIAL_NOVA_COND}>: {formatDateDdMmYy(data.tanggal_agenda || "24/07/26")}</span>
            </div>
            <div className="p-1 px-2 flex items-center min-h-6.75">
              <span className="w-22 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>No Agenda</span>
              <span className="font-bold text-[17px]" style={FONT_ARIAL_NOVA_COND}>: {data.no_agenda || "1004"}</span>
            </div>
          </div>
        </div>

        {/* ── 2. SIFAT (Agency FB) ── */}
        <div className="border-b border-black grid grid-cols-[60%_40%] divide-x divide-black">
          {/* SIFAT Block (6 equal columns of 10% each of total width) */}
          <div>
            {/* Header SIFAT */}
            <div className="border-b border-black text-center font-bold text-[14px] py-0.5 uppercase bg-black/5" style={FONT_AGENCY}>
              SIFAT
            </div>
            {/* SIFAT Labels Row (5 columns = 50%, 6th Kilat = 50%-60%) */}
            <div className="grid grid-cols-[5fr_1fr] divide-x divide-black text-center text-[14px]" style={FONT_AGENCY}>
              {/* First 5 SIFAT Options (0% to 50%) */}
              <div className="grid grid-cols-5 divide-x divide-black">
                {SIFAT_OPTIONS.slice(0, 5).map((item) => {
                  const isSangatPenting = item === "Sangat Penting";
                  return (
                    <div key={item} className="p-0.5 font-bold flex items-center justify-center min-h-6.75 text-[13.5px] leading-tight">
                      {isSangatPenting ? (
                        <span>
                          Sangat<br />Penting
                        </span>
                      ) : (
                        item
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 6th SIFAT Option: Kilat (Starts exactly at 50% unified vertical line) */}
              <div className="p-0.5 font-bold flex items-center justify-center min-h-6.75 text-[14px]">
                Kilat
              </div>
            </div>
          </div>

          {/* Right Empty Cell Area (60% to 100%) */}
          <div className="h-full" />
        </div>

        {/* ── 3. Metadata Surat (Label Agency FB, Value Arial Nova Cond) ── */}
        <div className="border-b border-black grid grid-cols-[50%_50%] divide-x divide-black">
          {/* Left Block: Separate Borders for Indek, Kode, No Surat (0% to 50%) */}
          <div className="divide-y divide-black">
            <div className="p-0.5 px-2 flex items-center min-h-6.5">
              <span className="w-18 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Indek</span>
              <span className="text-[14.5px]" style={FONT_ARIAL_NOVA_COND}>: {data.indeks || ""}</span>
            </div>
            <div className="p-0.5 px-2 flex items-center min-h-6.5">
              <span className="w-18 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Kode</span>
              <span className="text-[14.5px]" style={FONT_ARIAL_NOVA_COND}>: {data.kode || ""}</span>
            </div>
            <div className="p-0.5 px-2 flex items-center min-h-7">
              <span className="w-18 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>No Surat</span>
              <span className="break-all font-bold text-[17px]" style={FONT_ARIAL_NOVA_COND}>: {data.no_surat || "36/APEKLI/VII/2026"}</span>
            </div>
          </div>

          {/* Right Block: Combined Single Box for Referensi, Tanggal Penyelesaian, Tanggal (50% to 100%) */}
          <div className="p-1 px-2 flex flex-col justify-between space-y-0.5">
            <div className="flex items-center">
              <span className="w-36 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Referensi</span>
              <span className="text-[14.5px]" style={FONT_ARIAL_NOVA_COND}>: {data.referensi || ""}</span>
            </div>
            <div className="flex items-center">
              <span className="w-36 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Tanggal Penyelesaian</span>
              <span className="text-[14.5px]" style={FONT_ARIAL_NOVA_COND}>: {data.tanggal_penyelesaian || ""}</span>
            </div>
            <div className="flex items-center whitespace-nowrap">
              <span className="w-36 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Tanggal</span>
              <span className="font-bold text-[17px]" style={FONT_ARIAL_NOVA_COND}>: {formatDateDdMmYy(data.tanggal_surat || "23/07/26")}</span>
            </div>
          </div>
        </div>

        {/* Isi Ringkas Row (Label Agency FB, Value Arial Nova Cond) */}
        <div className="border-b border-black p-1 px-2">
          <div>
            <span className="inline-block w-22 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Isi Ringkas</span>
            <span className="text-[14.5px]" style={FONT_AGENCY}>: </span>
          </div>
          <p className="font-bold text-[17px] mt-0.5 leading-normal" style={FONT_ARIAL_NOVA_COND}>
            {data.isi_ringkas || "Usulan Evaluasi Kouta Ekspor Reptil Konsumsi Tahun 2026 Tahap I"}
          </p>
        </div>

        {/* Asal Surat Row (Has its own bottom border) */}
        <div className="border-b border-black p-0.5 px-2 flex items-center min-h-6.75">
          <span className="w-22 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Asal Surat</span>
          <span className="font-bold text-[17px]" style={FONT_ARIAL_NOVA_COND}>: {data.asal_surat || "Apekli"}</span>
        </div>

        {/* Lampiran Row (Has its own bottom border) */}
        <div className="border-b border-black p-0.5 px-2 flex items-center min-h-6.75">
          <span className="w-22 shrink-0 font-normal text-[14.5px]" style={FONT_AGENCY}>Lampiran</span>
          <span className="font-bold text-[17px]" style={FONT_ARIAL_NOVA_COND}>: {data.lampiran || "3 Set"}</span>
        </div>

        {/* ── 4. Diteruskan Kepada Yth vs Disposisi (Agency FB) ── */}
        <div className="border-b border-black grid grid-cols-[50%_50%] divide-x divide-black text-[13.5px]" style={FONT_AGENCY}>
          {/* Left Column: DITERUSKAN KEPADA YTH (0% to 50%) */}
          <div>
            <div className="border-b border-black font-bold text-center py-0.5 uppercase bg-black/5 text-[14px]">
              DITERUSKAN KEPADA YTH
            </div>
            <div className="divide-y divide-black">
              {diteruskanItems.map((option) => (
                <div key={option} className="grid grid-cols-[1fr_56px] divide-x divide-black min-h-5.25">
                  <span className="p-0.5 px-2 leading-none flex items-center font-normal text-[13.5px]">{option}</span>
                  <div className="h-full" />
                </div>
              ))}
              <div className="p-1 pl-6 space-y-0.5 text-[13px] font-normal">
                <div>1. Sdr/Sdri.</div>
                <div>2. Sdr/Sdri.</div>
                <div>3. Sdr/Sdri.</div>
              </div>
            </div>
          </div>

          {/* Right Column: DISPOSISI (Starts exactly at 50% unified vertical line) */}
          <div>
            <div className="border-b border-black font-bold text-center py-0.5 uppercase bg-black/5 text-[14px]">
              DISPOSISI
            </div>
            <div className="p-2 px-2.5 space-y-2 text-[13.5px]">
              {/* Row 1: Untuk Diselesaikan */}
              <div className="flex items-center gap-2.5">
                <div className="w-16 h-5 border border-black shrink-0" />
                <span className="font-normal">Untuk Diselesaikan</span>
              </div>

              {/* Row 2: Harap Saran/Pertimbangan & Penjelasan */}
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-16 h-5 border border-black shrink-0" />
                  <span className="font-normal">Harap Saran/Pertimbangan</span>
                </div>
                <div className="pl-18.5 text-[11px] font-normal mt-0.5">
                  Penjelasan
                </div>
              </div>

              {/* Row 3: Untuk Diketahui/dipergunakan seperlunya */}
              <div className="flex items-center gap-2.5">
                <div className="w-16 h-5 border border-black shrink-0" />
                <span className="font-normal">Untuk Diketahui/dipergunakan seperlunya</span>
              </div>

              {/* Row 4: Bahas dengan saya */}
              <div className="flex items-center gap-2.5">
                <div className="w-16 h-5 border border-black shrink-0" />
                <span className="font-normal">Bahas dengan saya</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Catatan & TTD Box (Label Agency FB, Value Arial Nova Cond) ── */}
      <div className="divide-y divide-black flex-1 flex flex-col text-[13.5px]">
        {/* Upper Box: Ka Sub Bag TU */}
        <div className="p-1 px-2 flex-1 min-h-10 flex flex-col justify-end">
          <div className="text-right pr-3 font-extrabold text-[15px]" style={FONT_AGENCY}>
            Ka Sub Bag TU
          </div>
        </div>

        {/* Lower Box: Catatan & Kepala Balai */}
        <div className="p-1 px-2 flex-1 min-h-15 flex flex-col justify-between">
          <div>
            <span className="font-bold text-[14.5px]" style={FONT_AGENCY}>Catatan :</span>
            <p className="mt-0.5 italic whitespace-pre-wrap leading-tight text-[14px] font-semibold" style={FONT_ARIAL_NOVA_COND}>
              {catatanDisposisi || data.catatan || ""}
            </p>
          </div>

          <div className="text-right pr-3 font-extrabold text-[15px]" style={FONT_AGENCY}>
            Kepala Balai
          </div>
        </div>
      </div>
    </div>
  );
}
