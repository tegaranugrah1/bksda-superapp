"use client";

import React, { useState, useEffect, useRef } from "react";
import { formatNIP, formatNipLabel, renderFormattedItalic } from "@/lib/letter-utils";
import {
  renderHeaderTitleContent,
  renderMandateLineContent,
  SuratTugasClauseSection,
  SuratTugasEmployeesTable,
  SuratTugasDateLine,
  SuratTugasTembusanBlock,
} from "@/components/SuratTugasA4Parts";
import { resolveKopImageUrl } from "../_lib";
import { buildOrderedAdditionalUntukItems } from "../_lib/untuk-helpers";
import STLampiranBedaHari, { type EmployeeDateRange } from "./STLampiranBedaHari";

function HalamanDivider({ 
  pageNumber = 2, 
  label,
  spacerHeightMm = 0
}: { 
  pageNumber?: number; 
  label?: string;
  spacerHeightMm?: number;
}) {
  return (
    <div 
      className="halaman-divider print:hidden select-none my-0" 
      style={{ 
        marginLeft: "-2.0cm", 
        marginRight: "-1.55cm",
        width: "calc(100% + 3.55cm)",
      }}
    >
      {/* 1. Spacer pendorong halaman agar halaman sebelumnya genap ~297mm seperti fisik A4 */}
      {spacerHeightMm > 0 && (
        <div style={{ height: `${spacerHeightMm}mm` }} />
      )}

      {/* 2. Ruang Kosong Footer BSrE 2.5 cm untuk halaman sebelumnya */}
      <div
        style={{
          height: "25mm",
          padding: "0 1.55cm 4mm 2.0cm",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div className="text-[7.5pt] text-zinc-400 dark:text-zinc-500 italic text-center leading-tight select-none pointer-events-none">
          Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik<br />
          yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).
        </div>
      </div>

      {/* 3. Bilah HALAMAN X persis seperti yang disukai user */}
      <div className="h-8 bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center shadow-inner my-1 w-full">
        <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 tracking-widest uppercase">
          {label || `HALAMAN ${pageNumber}`}
        </span>
      </div>

      {/* 4. Spacer atas halaman berikutnya (15mm, setara thead pada print) */}
      <div style={{ height: "15mm" }} />
    </div>
  );
}



interface Employee {
  id: string | number;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
  is_buruh?: boolean;
}

interface DasarItem {
  id: string;
  text: string;
}

interface PreviewProps {
  stNumber: string;
  stCode: string;
  currentMonth: string;
  currentYear: string;
  menimbangItems: DasarItem[];
  dasarItems: DasarItem[];
  untukItems?: DasarItem[];
  selectedEmployees: Employee[];
  buildUntukText: () => string;
  buildBiayaText?: () => string;
  kotaSurat: string;
  tanggalSurat: string;
  kepalaBalai: { name: string; nip: string };
  tembusanItems?: string[];
  headerTitle?: string;
  penutupText?: string;
  dateFormatStyle?: "inline" | "tabular";
  signerAuthorityMandate?: string | null;
  signerTitle?: string;
  tembusanPosition?: "beside" | "bottom";
  tembusanLabel?: string;
  sumberDana?: string;
  templateType?: string | null;
  employeeDates?: Record<string, EmployeeDateRange>;
  employeeDepartures?: Record<string, string>;
  showDepartureColumn?: boolean;
  defaultTanggalMulai?: string;
  defaultTanggalSelesai?: string;
  judulLampiranBedaHari?: string;
  kopImageUrl?: string | null;
  nomorNumberingType?: "st_pattern" | "naskah_auto";
  customNomorNaskah?: string;
  sertakanLaporan?: boolean;
}

export default function STBuilderPreview({
  stNumber,
  stCode,
  currentMonth,
  currentYear,
  menimbangItems,
  dasarItems,
  untukItems,
  selectedEmployees,
  buildUntukText,
  buildBiayaText,
  kotaSurat,
  tanggalSurat,
  kepalaBalai,
  tembusanItems = [],
  headerTitle = "KEPALA BALAI,",
  penutupText,
  dateFormatStyle,
  signerAuthorityMandate,
  signerTitle = "Kepala Balai,",
  tembusanPosition,
  tembusanLabel,
  sumberDana = "dipa",
  templateType = null,
  employeeDates = {},
  employeeDepartures = {},
  showDepartureColumn,
  defaultTanggalMulai,
  defaultTanggalSelesai,
  judulLampiranBedaHari = "DAFTAR PEGAWAI MENGIKUTI PATROLI",
  kopImageUrl = null,
  nomorNumberingType = "st_pattern",
  customNomorNaskah = "",
  sertakanLaporan = true,
}: PreviewProps) {
  const isFolu = Boolean(sumberDana && sumberDana.toLowerCase().includes("folu"));
  const activeDateFormat = dateFormatStyle || (isFolu ? "tabular" : "inline");
  const activeTembusanPosition = tembusanPosition || (isFolu ? "bottom" : "beside");
  const activeTembusanLabel = tembusanLabel || (isFolu ? "Tembusan Kepada :" : "Tembusan:");
  const activePenutup = penutupText || (isFolu 
    ? "Demikian Surat Perintah Tugas ini dibuat, untuk dapat dipergunakan sebagaimana mestinya dan kepada instansi yang dikunjungi dimohon bantuan seperlunya demi kelancaran pelaksanaan tugas."
    : "Demikian untuk dilaksanakan dengan penuh tanggung jawab.");
  const activeMandate = signerAuthorityMandate !== undefined 
    ? signerAuthorityMandate 
    : (isFolu ? "a.n. Sekretaris Direktorat Jenderal KSDAE\nselaku Koordinator Kegiatan Implementing\nPartner FOLU NC 2&3" : null);
  const isBmnTemplate = templateType === "bmn-pemeriksaan" || templateType === "bmn";
  const isBedaHariTemplate = templateType === "beda-hari" || templateType === "beda_hari";
  const isLampiranActive = isBedaHariTemplate;
  const activeShowDepartureColumn = isBedaHariTemplate && Boolean(showDepartureColumn);
  const isPlhTemplate = templateType === "plh";
  const visibleTembusanItems = tembusanItems.filter(t => t && t.trim());
  const signaturePlaceholderStyle: React.CSSProperties = {
    margin: "14px 0 0",
    height: "125px",
    display: "flex",
    alignItems: "center",
    paddingTop: "0",
    paddingLeft: "1.35cm",
    boxSizing: "border-box",
    color: "#94a3b8",
    fontSize: "9pt",
  };
  const additionalUntukItems = React.useMemo(() => {
    return buildOrderedAdditionalUntukItems({
      templateType,
      biayaText: buildBiayaText?.() || "",
      customTemplateItems: untukItems,
      sertakanLaporan,
    }).map((item) => item.text);
  }, [templateType, buildBiayaText, untukItems, sertakanLaporan]);

  const { isMultiPage, page1SpacerMm } = React.useMemo(() => {
    // Estimasi tinggi isi surat (dalam mm)
    // Tinggi A4 printable adalah ~268mm
    const mLines = menimbangItems.reduce((acc, m) => acc + Math.max(1, Math.ceil((m.text?.length || 0) / 75)), 0);
    const dLines = dasarItems.reduce((acc, d) => acc + Math.max(1, Math.ceil((d.text?.length || 0) / 75)), 0);
    const empCount = Math.max(1, selectedEmployees.length);
    const uCount = Math.max(2, additionalUntukItems.filter(Boolean).length);

    // Part 1: Kop (33mm) + Judul/Nomor/Kepala Balai (28mm) = 61mm + Menimbang + Dasar
    const part1Mm = 61 + (mLines * 5.5) + (dLines * 5.5);
    // Part 2: MEMBERI TUGAS (10mm) + Kepada + Untuk + Penutup (12mm) + TTD (45mm) + Tembusan
    const part2Mm = 10 + (empCount * 22) + (uCount * 12) + 12 + 45 + (visibleTembusanItems.length > 0 ? 15 : 0);

    const isMulti = (part1Mm + part2Mm) > 230;
    // Tinggi A4 = 297mm. Dikurangi footer 25mm, divider 8mm, padding atas 4mm = 260mm.
    const spacer = isMulti ? Math.max(15, Math.min(180, 260 - part1Mm)) : 0;

    return { isMultiPage: isMulti, page1SpacerMm: spacer };
  }, [menimbangItems, dasarItems, selectedEmployees, additionalUntukItems, visibleTembusanItems]);

  const menimbangOverflows = React.useMemo(() => {
    const mLines = menimbangItems.reduce((acc, m) => acc + Math.max(1, Math.ceil((m.text?.length || 0) / 75)), 0);
    return mLines > 16;
  }, [menimbangItems]);

  return (
    <div
      className="w-full selection:bg-blue-100"
      style={{
        fontFamily: "'Bookman Old Style', 'Georgia', serif",
        fontSize: "11pt",
        lineHeight: "1.25",
        color: "#000",
        textAlign: "justify",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "100%" }} />
        </colgroup>
        <thead className="hidden print:table-header-group">
          <tr><td style={{ height: "15mm", border: "none", padding: 0 }}></td></tr>
        </thead>
        <tfoot className="print:table-footer-group">
          <tr>
            <td style={{ height: "25mm", verticalAlign: "bottom", border: "none", padding: "0 1.55cm 4mm 2.0cm" }}>
              <div className="bsre-placeholder print:hidden text-[7.5pt] text-zinc-400 dark:text-zinc-500 italic text-center leading-tight select-none pointer-events-none">
                Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik<br />
                yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).
              </div>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr className="print:break-inside-auto" style={{ breakInside: "auto", pageBreakInside: "auto" }}>
            <td className="align-top">
              {/* === KOP SURAT (only page 1) === */}
              <div className="kop-surat" style={{ width: "100%", marginBottom: "4mm", textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveKopImageUrl(kopImageUrl)}
                  alt="Kop Surat"
                  style={{ width: "188mm", maxWidth: "188mm", height: "auto", display: "block", margin: "0 auto" }}
                />
              </div>
              <div className="surat-content" style={{ padding: "0 1.55cm 0 2.0cm" }}>
              {/* === JUDUL === */}
              <p style={{ textAlign: "center", fontWeight: "bold", fontSize: "11pt", margin: "0 0 2px" }}>
                SURAT TUGAS
              </p>
              <p style={{ textAlign: "center", fontSize: "11pt", margin: "0 0 16px" }}>
                Nomor : {nomorNumberingType === "naskah_auto"
                  ? (customNomorNaskah || "${nomor_naskah}")
                  : `ST.${stNumber?.trim() || "\u00A0\u00A0\u00A0\u00A0"}/${stCode || "\u00A0\u00A0\u00A0\u00A0"}/${currentMonth}/${currentYear}`}
              </p>

              {/* === KEPALA BALAI / HEADER MODULAR === */}
              {renderHeaderTitleContent(headerTitle)}

              <SuratTugasClauseSection label="Menimbang" items={menimbangItems} indexStyle="letter" replaceYear={currentYear || new Date().getFullYear().toString()} />
              <SuratTugasClauseSection label="Dasar" items={dasarItems} indexStyle="number" replaceYear={currentYear || new Date().getFullYear().toString()} />

              {/* === MEMBERI TUGAS === */}
              <p 
                className="print:break-after-avoid break-after-avoid" 
                style={{ 
                  textAlign: "center", 
                  fontWeight: "bold", 
                  margin: "10px 0 2px", 
                  pageBreakAfter: "avoid", 
                  breakAfter: "avoid" 
                }}
              >
                MEMBERI TUGAS,
              </p>

              {/* === KEPADA === */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr style={{ breakInside: "auto", pageBreakInside: "auto" }}>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "1px 0" }}>Kepada</td>
                    <td style={{ width: "12px", verticalAlign: "top", padding: "1px 0" }}>:</td>
                    <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                      {isLampiranActive ? (
                        <div style={{ padding: "2px 0" }}>Daftar nama terlampir.</div>
                      ) : selectedEmployees.length === 0 ? (
                        <div style={{ padding: "4px 0", fontStyle: "italic", color: "#999" }}>
                          ( Belum ada pegawai dipilih )
                        </div>
                      ) : (
                        <SuratTugasEmployeesTable employees={selectedEmployees} dense />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === UNTUK === */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr style={{ breakInside: "auto", pageBreakInside: "auto" }}>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Untuk</td>
                    <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                    <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <tbody>
                          {[
                            buildUntukText(),
                            ...additionalUntukItems,
                          ]
                            .filter(item => item && item.trim())
                            .map((item, idx) => (
                            <tr key={idx} className="untuk-entry" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                              <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>{idx + 1}.</td>
                              <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>{renderFormattedItalic(item)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === PENUTUP + TTD + TEMBUSAN — keep together so TTD never breaks alone === */}
              <div data-break-candidate="penutup-ttd" className="penutup-ttd-group print:break-inside-avoid break-inside-avoid" style={{ display: 'block', breakInside: "avoid", pageBreakInside: "avoid" }}>
                <p className="penutup-surat" style={{ margin: "16px 0 0", textAlign: isFolu || activePenutup.length > 80 ? "justify" : "left" }}>
                  {renderFormattedItalic(activePenutup)}
                </p>

                {/* === TANDA TANGAN + TEMBUSAN === */}
                <div className="ttd-tembusan-wrapper print:break-inside-avoid break-inside-avoid" style={{ display: 'block', breakInside: "avoid", pageBreakInside: "avoid" }}>
                {activeTembusanPosition === "bottom" ? (
                  <>
                    {/* === TTD Layout Tabular / Full Width (seperti FOLU) === */}
                    <div style={{ marginTop: "8px", paddingLeft: "50%" }}>
                      <SuratTugasDateLine dateFormatStyle={activeDateFormat} kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} />

                      {activeMandate && activeMandate.split("\n").map((line, idx) => (
                        <p key={idx} style={{ margin: idx === 0 ? "4px 0 0" : 0 }}>
                          {renderMandateLineContent(line, true)}
                        </p>
                      ))}

                      <p style={{ margin: "0 0 0" }}>{signerTitle || "Kepala Balai,"}</p>
                      <p className="ttd-placeholder" style={signaturePlaceholderStyle}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0 }}>{formatNipLabel(kepalaBalai, true)} {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    <SuratTugasTembusanBlock items={visibleTembusanItems} label={activeTembusanLabel} position="bottom" />
                  </>
                ) : (
                  <>
                    {/* === Default TTD Layout (kanan, dengan tembusan di kiri bawah) === */}
                    <div style={{ marginTop: "8px", marginLeft: "9.2cm", textAlign: "left" }}>
                      <SuratTugasDateLine dateFormatStyle={activeDateFormat} kotaSurat={kotaSurat} tanggalSurat={tanggalSurat} />

                      {activeMandate && activeMandate.split("\n").map((line, idx) => (
                        <p key={idx} style={{ margin: idx === 0 ? "4px 0 0" : 0 }}>
                          {line}
                        </p>
                      ))}

                      <p style={{ margin: "0 0 0" }}>{signerTitle || "Kepala Balai,"}</p>
                      <p className="ttd-placeholder" style={signaturePlaceholderStyle}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0 }}>{formatNipLabel(kepalaBalai, true)} {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    <SuratTugasTembusanBlock items={visibleTembusanItems} label={activeTembusanLabel} position="beside" />
                  </>
                )}
              </div>
              </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* === HALAMAN 2: LAMPIRAN (BEDA HARI / TEMPAT KEBERANGKATAN) === */}
      {isLampiranActive && (
        <div
          className="st-lampiran-page-wrapper"
          style={{
            pageBreakBefore: "always",
            breakBefore: "page",
          }}
        >
          <HalamanDivider 
            pageNumber={isMultiPage ? (menimbangOverflows ? 4 : 3) : 2} 
            label="HALAMAN LAMPIRAN" 
          />
          <STLampiranBedaHari
            stNumber={stNumber}
            stCode={stCode}
            currentMonth={currentMonth}
            currentYear={currentYear}
            tanggalSurat={tanggalSurat}
            selectedEmployees={selectedEmployees}
            employeeDates={employeeDates}
            employeeDepartures={employeeDepartures}
            showDepartureColumn={activeShowDepartureColumn}
            defaultTanggalMulai={defaultTanggalMulai}
            defaultTanggalSelesai={defaultTanggalSelesai}
            defaultKotaAsal={kotaSurat}
            kepalaBalai={kepalaBalai}
            judulLampiran={judulLampiranBedaHari}
            nomorNumberingType={nomorNumberingType}
            customNomorNaskah={customNomorNaskah}
          />
        </div>
      )}
    </div>
  );
}
