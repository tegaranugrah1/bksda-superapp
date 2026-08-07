"use client";

import React from "react";

export interface GeneralReportData {
  id?: string;
  judul_laporan: string;
  kota_laporan: string;
  tanggal_laporan: string;
  agenda_pelaksanaan: string;
  dasar_pelaksanaan: string[];
  maksud_tujuan: string;
  pelaksana: Array<{
    no: number;
    nama_lengkap: string;
    nip: string;
    jabatan: string;
  }>;
  waktu_tempat_pelaksanaan: string;
  hasil_pelaksanaan: string[];
  dokumentasi_foto: Array<{
    url: string;
    caption?: string;
  }>;
  st_ref?: {
    id?: string;
    nomor_surat?: string;
    tanggal_surat?: string;
  };

  // COVER MANUAL CONFIGURATION
  use_custom_cover?: boolean;
  cover_mode?: "standard" | "image" | "custom_text";
  custom_cover_image_url?: string;
  custom_cover_title?: string;
  custom_cover_author?: string;
  custom_cover_footer?: string;
}

interface GeneralReportPrintProps {
  data: GeneralReportData;
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

function formatNameWithDegree(fullName: string): string {
  if (!fullName) return "-";
  const parts = fullName.split(",");
  if (parts.length > 1) {
    const name = parts[0].trim().toUpperCase();
    const degree = parts.slice(1).join(",").trim();
    return `${name}, ${degree}`;
  }
  return fullName.toUpperCase();
}

function cleanCoverSubtitle(rawTitle?: string): string {
  if (!rawTitle) return "PELAKSANAAN TUGAS DINAS";
  let cleaned = rawTitle.trim();
  cleaned = cleaned.replace(/^laporan\s+/i, "").trim();
  return cleaned.toUpperCase();
}

function ensureLeadingLaporan(rawTitle?: string): string {
  if (!rawTitle) return "LAPORAN PELAKSANAAN TUGAS";
  let cleaned = rawTitle.trim();
  if (!/^laporan\s+/i.test(cleaned)) {
    cleaned = `LAPORAN ${cleaned}`;
  }
  return cleaned.toUpperCase();
}

export function GeneralReportPrint({ data }: GeneralReportPrintProps) {
  const tanggalFormat = formatDateIndo(data.tanggal_laporan);
  const isCustomImageCover = data.use_custom_cover && data.cover_mode === "image" && data.custom_cover_image_url;

  return (
    <div className="print-report-wrapper bg-white text-black font-sans font-['Arial',sans-serif] text-[12pt] leading-relaxed max-w-[210mm] mx-auto p-0">
      {/* 
        MASTER PRINT ENGINE:
        Menggunakan teknik Master Table (thead/tfoot) untuk memaksa margin atas dan bawah pada SETIAP halaman 
        secara konsisten, terlepas dari pengaturan Margin di Chrome (Default atau None).
        Ini memastikan tabel pelaksana yang terpotong ke halaman berikutnya TETAP memiliki margin atas yang rapi.
      */}
      <style jsx global>{`
        .print-report-wrapper,
        .print-report-wrapper * {
          font-family: Arial, Helvetica, sans-serif !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important; /* Force 0 native margin so Master Table can control the exact spacing */
          }
          /* Hide non-print UI */
          header, nav, aside, footer, button, .no-print, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          html, body {
            width: auto !important;
            height: auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-report-wrapper {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          h3 {
            page-break-after: avoid !important;
            break-after: avoid-page !important;
          }
          thead.content-table-head {
            display: table-header-group !important;
          }
          tbody.content-table-body {
            display: table-row-group !important;
          }
          tr.content-table-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ==================== PAGE 1: COVER ==================== */}
      {isCustomImageCover ? (
        /* MODE COVER MANUAL: FULL-PAGE UPLOADED COVER IMAGE */
        <div className="w-full min-h-[800px] print:min-h-0 print:h-[297mm] flex flex-col items-center justify-center p-0 m-0 overflow-hidden border-none page-break-after relative bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.custom_cover_image_url}
            alt="Cover Manual Laporan"
            className="w-full h-full object-cover object-center block m-0 p-0"
          />
        </div>
      ) : (
        /* MODE COVER STANDAR & CUSTOM SUB-UNIT COVER */
        <div className="w-full min-h-[800px] print:min-h-0 print:h-[297mm] flex flex-col justify-between items-center text-center py-8 print:pt-[15mm] print:pb-[15mm] px-8 print:px-[20mm] border-none overflow-hidden page-break-after bg-white box-border">
          {/* TOP TITLE BLOCK */}
          <div className="w-full space-y-2 pt-4">
            <h1 className="text-[17.5pt] font-bold tracking-wider uppercase font-sans">
              LAPORAN
            </h1>
            <h2 className="text-[12.5pt] font-bold tracking-wide uppercase max-w-lg mx-auto leading-tight mt-2 font-sans">
              {cleanCoverSubtitle(data.judul_laporan)}
            </h2>
          </div>

          {/* BKSDA LOGO */}
          <div className="my-auto py-4 flex justify-center shrink-0">
            <div className="relative w-32 h-32">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo_bksda.png"
                alt="Logo BKSDA"
                className="w-full h-full object-contain mx-auto"
              />
            </div>
          </div>

          {/* DISUSUN OLEH */}
          <div className="w-full space-y-1.5 my-auto pb-4 shrink-0">
            <p className="text-[10.5pt] font-semibold">Disusun Oleh :</p>
            <div className="space-y-0.5 max-h-48 overflow-hidden">
              {data.pelaksana && data.pelaksana.length > 0 ? (
                data.pelaksana.map((p, idx) => (
                  <p key={idx} className="text-[10.5pt] font-bold tracking-wide">
                    {formatNameWithDegree(p.nama_lengkap)}
                  </p>
                ))
              ) : (
                <p className="text-[10.5pt] font-bold tracking-wide">-</p>
              )}
            </div>
          </div>

          {/* FOOTER INSTANSI / SUB-UNIT KERJA */}
          <div className="w-full border-t border-black pt-3 mb-0 space-y-1 mt-auto shrink-0">
            {data.use_custom_cover && data.cover_mode === "custom_text" && data.custom_cover_footer ? (
              <p className="text-[13pt] font-bold tracking-wider uppercase">
                {data.custom_cover_footer}
              </p>
            ) : (
              <>
                <p className="text-[13pt] font-bold tracking-wider uppercase">
                  BALAI KONSERVASI SUMBER DAYA ALAM
                </p>
                <p className="text-[13pt] font-bold tracking-wider uppercase">
                  KALIMANTAN TIMUR
                </p>
              </>
            )}
            <div className="w-full border-b border-black my-1.5"></div>
            <p className="text-[13.5pt] font-bold">
              {data.use_custom_cover && data.cover_mode === "custom_text" ? (data.kota_laporan || "Samarinda") : "Samarinda"}, {tanggalFormat}
            </p>
          </div>
        </div>
      )}

      {/* MASTER TABLE WRAPPER FOR PAGE 2+ */}
      <table className="w-full border-none border-collapse">
        {/* REPEATING HEADER (TOP MARGIN) */}
        <thead className="hidden print:table-header-group">
          <tr><td className="h-[15mm] border-none p-0"></td></tr>
        </thead>
        {/* REPEATING FOOTER (BOTTOM MARGIN) */}
        <tfoot className="hidden print:table-footer-group">
          <tr><td className="h-[15mm] border-none p-0"></td></tr>
        </tfoot>

        <tbody>
          {/* ==================== PAGE 2+: ISI LAPORAN ==================== */}
          <tr className="print:break-inside-auto">
            <td className="p-8 pt-4 print:p-0 print:px-[20mm] border-none align-top">
              <div className="space-y-6">
                {/* HEADER JUDUL ISI LAPORAN */}
                <div className="text-center space-y-1 mb-8 border-b-2 border-black pb-2 pt-2">
                  <h2 className="text-[14pt] font-bold uppercase tracking-wide max-w-xl mx-auto">
                    {ensureLeadingLaporan(data.judul_laporan)}
                  </h2>
                  <p className="text-[14pt] font-bold uppercase">
                    BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
                  </p>
                </div>

                {/* A. AGENDA PELAKSANAAN */}
                <div className="space-y-2 avoid-break">
                  <h3 className="text-[12pt] font-bold uppercase">A. AGENDA PELAKSANAAN</h3>
                  <p className="text-[12pt] pl-4 text-justify leading-relaxed">
                    {data.agenda_pelaksanaan || "-"}
                  </p>
                </div>

                {/* B. DASAR PELAKSANAAN */}
                <div className="space-y-2 avoid-break">
                  <h3 className="text-[12pt] font-bold uppercase">B. DASAR PELAKSANAAN</h3>
                  <ol className="list-decimal pl-9 text-[12pt] space-y-1.5">
                    {data.dasar_pelaksanaan && data.dasar_pelaksanaan.length > 0 ? (
                      data.dasar_pelaksanaan.map((item, idx) => <li key={idx}>{item}</li>)
                    ) : (
                      <li>-</li>
                    )}
                  </ol>
                </div>

                {/* C. MAKSUD DAN TUJUAN */}
                <div className="space-y-2 avoid-break">
                  <h3 className="text-[12pt] font-bold uppercase">C. MAKSUD DAN TUJUAN</h3>
                  <p className="text-[12pt] pl-4 text-justify leading-relaxed whitespace-pre-line">
                    {data.maksud_tujuan || "-"}
                  </p>
                </div>

                {/* D. PELAKSANA KEGIATAN */}
                <div className="space-y-2">
                  <h3 className="text-[12pt] font-bold uppercase">D. PELAKSANA KEGIATAN</h3>
                  <div className="pl-4 overflow-x-visible">
                    <div className="relative pt-[28px]">
                      {/* MAGIC HACK: Cover up the 1 | 2 | 3 row ONLY on the first page to perfectly match MS Word behavior! */}
                      <div className="absolute top-0 left-0 right-0 h-[28px] bg-gray-50 print:bg-white border-b border-black z-10 box-border"></div>
                      <table className="w-full border-collapse border border-black text-[12pt] mt-[-28px] relative z-0">
                        <thead className="content-table-head">
                          <tr className="bg-slate-50 print:bg-white text-center text-[10pt] font-normal content-table-row h-[28px]">
                            <th className="border border-black p-0 w-12 h-[28px] font-normal">1</th>
                            <th className="border border-black p-0 h-[28px] font-normal">2</th>
                            <th className="border border-black p-0 h-[28px] font-normal">3</th>
                          </tr>
                          <tr className="bg-slate-100 print:bg-white text-center font-normal content-table-row">
                            <th className="border border-black px-3 py-1.5 w-12 font-normal">No.</th>
                            <th className="border border-black px-3 py-1.5 font-normal">Nama / NIP</th>
                            <th className="border border-black px-3 py-1.5 font-normal">Jabatan</th>
                          </tr>
                        </thead>
                      <tbody className="content-table-body">
                        {data.pelaksana && data.pelaksana.length > 0 ? (
                          data.pelaksana.map((p, idx) => (
                            <tr key={idx} className="align-top content-table-row">
                              <td className="border border-black px-3 py-2 text-center">{idx + 1}.</td>
                              <td className="border border-black px-3 py-2">
                                <p className="font-normal">{formatNameWithDegree(p.nama_lengkap)}</p>
                                <p className="text-[12pt] text-black font-normal">NIP. {p.nip || "-"}</p>
                              </td>
                              <td className="border border-black px-3 py-2">{p.jabatan || "-"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="content-table-row">
                            <td colSpan={3} className="border border-black px-3 py-2 text-center">-</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

                {/* E. WAKTU DAN TEMPAT PELAKSANAAN */}
                <div className="space-y-2 avoid-break">
                  <h3 className="text-[12pt] font-bold uppercase">E. WAKTU DAN TEMPAT PELAKSANAAN</h3>
                  <p className="text-[12pt] pl-4 text-justify leading-relaxed whitespace-pre-line">
                    {data.waktu_tempat_pelaksanaan || "-"}
                  </p>
                </div>

                {/* F. HASIL PELAKSANAAN */}
                <div className="space-y-2 avoid-break">
                  <h3 className="text-[12pt] font-bold uppercase">F. HASIL PELAKSANAAN</h3>
                  <ol className="list-decimal pl-9 text-[12pt] space-y-2 text-justify leading-relaxed">
                    {data.hasil_pelaksanaan && data.hasil_pelaksanaan.length > 0 ? (
                      data.hasil_pelaksanaan.map((item, idx) => <li key={idx}>{item}</li>)
                    ) : (
                      <li>-</li>
                    )}
                  </ol>
                </div>

                {/* SIGNATURE BLOCK */}
                <div className="pt-4 space-y-4">
                  <p className="text-[12pt] leading-relaxed">
                    Demikian laporan ini dibuat untuk diketahui dan dipergunakan sebagaimana mestinya.
                  </p>

                  <div className="pt-2 flex justify-end">
                    <div className="min-w-[280px] max-w-[340px] text-left space-y-0.5 text-[12pt]">
                      <p className="font-normal">{data.kota_laporan || "Samarinda"}, {tanggalFormat}</p>
                      <p className="font-normal">Pelaksana Kegiatan,</p>

                      {/* Stacked Pelaksana List with Signature Spaces */}
                      <div className="space-y-10">
                        {data.pelaksana && data.pelaksana.length > 0 ? (
                          data.pelaksana.map((p, idx) => (
                            <div key={idx} className="pt-10 space-y-0.5">
                              <p className="font-normal">{formatNameWithDegree(p.nama_lengkap)}</p>
                              <p className="text-[12pt] font-normal">NIP. {p.nip || "-"}</p>
                            </div>
                          ))
                        ) : (
                          <div className="pt-10 space-y-0.5">
                            <p className="font-normal">ANISA RAHMAWATI, S.Tr.Kom.</p>
                            <p className="text-[12pt] font-normal">NIP. 199911032025062012</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* G. DOKUMENTASI FOTO KEGIATAN */}
                {data.dokumentasi_foto && data.dokumentasi_foto.length > 0 && (
                  <div className="page-break space-y-4 avoid-break pt-4">
                    <h3 className="text-[12pt] font-bold uppercase">G. DOKUMENTASI FOTO KEGIATAN</h3>
                    <div className="grid grid-cols-2 gap-4 pl-4 pt-1">
                      {data.dokumentasi_foto.map((foto, idx) => (
                        <div key={idx} className="overflow-hidden">
                          <div className="w-full h-56 relative flex items-center justify-center p-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={foto.url}
                              alt={`Dokumentasi ${idx + 1}`}
                              className="w-full h-full object-contain mx-auto rounded-none border-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
