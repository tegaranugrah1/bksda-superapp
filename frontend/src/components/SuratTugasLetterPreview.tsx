"use client";

import React, { useEffect, useRef } from "react";
import { Printer, X } from "lucide-react";
import {
  formatDateIndonesian,
  formatNIP,
  formatNipLabel,
  indexToLetter,
  daysBetween,
  numberToWords,
  renderFormattedItalic,
} from "@/lib/letter-utils";
import {
  resolveKopImageUrl,
  splitStoredUntukItems,
  buildOrderedAdditionalUntukItems,
  buildBiayaTextFor,
  parseLetterItems,
  type StTemplateConfiguration,
} from "@/app/kepegawaian/surat-tugas/_lib";

interface Employee {
  id: string | number;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan?: string;
  is_pppk?: boolean;
  nip_label?: string;
  pangkat_golongan?: string;
  pivot?: { peran?: string };
}

interface DasarItem {
  id?: string;
  text: string;
}

interface SuratTugasLetterPreviewProps {
  data: {
    id: string;
    nomor_surat?: string | null;
    kode_surat?: string | null;
    menimbang?: DasarItem[] | string | null;
    dasar?: DasarItem[] | string | null;
    maksud_tujuan: string;
    tempat_tujuan?: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string;
    tanggal_surat?: string | null;
    sumber_dana?: string | null;
    sumber_dana_other?: string | null;
    template_type?: string | null;
    sertakan_laporan?: boolean | null;
    status: string;
    keterangan?: string | null;
    tembusan?: string[] | null;
    nama_plh?: string | null;
    penandatangan_nama?: string | null;
    penandatangan_nip?: string | null;
    employees?: Employee[];
    approver?: { name: string; nip?: string };
    template_snapshot?: {
      configuration?: StTemplateConfiguration;
      signer?: { name?: string | null; nip?: string | null };
      [key: string]: unknown;
    } | null;
    template?: {
      configuration?: StTemplateConfiguration;
      default_signer_name?: string | null;
      default_signer_nip?: string | null;
      [key: string]: unknown;
    } | null;
  };
  onClose: () => void;
}

export type SuratTugasPreviewData = SuratTugasLetterPreviewProps["data"];

function renderHeaderTitleContent(title: string = "KEPALA BALAI,") {
  const lines = (title || "KEPALA BALAI,").split("\n");

  return (
    <div style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px", fontSize: "11pt", lineHeight: "1.35" }}>
      {lines.map((line, i) => (
        <p key={i} style={{ margin: 0 }}>
          {renderFormattedItalic(line)}
        </p>
      ))}
    </div>
  );
}

export default function SuratTugasLetterPreview({ data, onClose }: SuratTugasLetterPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const config = data.template_snapshot?.configuration || data.template?.configuration || {};
  const headerTitle = typeof config.header_title === "string" ? config.header_title : "KEPALA BALAI,";
  const penutupText = typeof config.penutup_text === "string" ? config.penutup_text : "Demikian untuk dilaksanakan dengan penuh tanggung jawab.";
  const dateFormatStyle = config.date_format_style || "inline";
  const signerAuthorityMandate = typeof config.signer_authority_mandate === "string" ? config.signer_authority_mandate : null;
  const signerTitle = typeof config.signer_title === "string" ? config.signer_title : "Kepala Balai,";
  const tembusanPosition = config.tembusan_position || "beside";
  const tembusanLabel = typeof config.tembusan_label === "string" ? config.tembusan_label : "Tembusan:";
  const kopImageUrl = typeof config.kop_image_url === "string" ? config.kop_image_url : null;
  const signerName = [data.penandatangan_nama, data.template_snapshot?.signer?.name,
    data.template?.default_signer_name, data.approver?.name]
    .find((value): value is string => typeof value === "string" && value.trim() !== "") ?? "M. Ari Wibawanto, S.Hut., M.Sc.";
  const signerNip = [data.penandatangan_nip, data.template_snapshot?.signer?.nip,
    data.template?.default_signer_nip, data.approver?.nip]
    .find((value): value is string => typeof value === "string" && value.trim() !== "") ?? "19740514 199903 1 001";
  const isOfficial = ["approved", "completed", "published", "diterbitkan"].includes(data.status.toLowerCase());

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Clone content and reset kop margins for print
    const clone = printContent.cloneNode(true) as HTMLElement;
    const kopEl = clone.querySelector('[data-kop]') as HTMLElement;
    if (kopEl) {
      kopEl.style.marginTop = '0';
      kopEl.style.marginLeft = '0';
      kopEl.style.marginRight = '0';
    }
    
    const cleanDocTitle = (data.nomor_surat || 'Draft').replace(/[<>&"']/g, '');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Surat Tugas - ${cleanDocTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          html, body { margin: 0; padding: 0; background: #ffffff; }
          body { padding: 4mm 20mm 15mm 20mm; font-family: 'Bookman Old Style', 'Georgia', serif; font-size: 11pt; line-height: 1.25; color: #000; text-align: justify; }
          img { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        </style>
      </head>
      <body>${clone.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const menimbangItems = parseLetterItems(data.menimbang);
  const dasarItems = parseLetterItems(data.dasar);
  const tembusanItems = parseLetterItems(data.tembusan ?? config.tembusan_items).map(item => item.text);

  const employees: Employee[] = data.employees || [];

  // Build "Untuk" text from the letter data
  const storedUntuk = splitStoredUntukItems(data.maksud_tujuan);
  const untukText = storedUntuk[0] || "...";
  // Builder documents already contain the ordered clauses, including intentional omissions.
  const additionalUntuk = data.template_snapshot || storedUntuk.length > 1
    ? storedUntuk.slice(1)
    : buildOrderedAdditionalUntukItems({
        templateType: data.template_type,
        biayaText: data.sumber_dana ? buildBiayaTextFor(
          data.sumber_dana, data.sumber_dana_other || "", data.tanggal_surat || data.tanggal_mulai, data.template_type,
        ) : "",
        sertakanLaporan: data.sertakan_laporan ?? true,
        customTemplateItems: config.untuk,
      }).map((item) => item.text);

  // Format date for signature
  const tanggalSurat = data.tanggal_surat || data.tanggal_mulai;

  return (
    <dialog
      ref={dialogRef}
      data-print-root
      aria-labelledby="st-preview-title"
      className="fixed inset-0 z-[100] m-0 h-dvh max-h-none w-full max-w-none border-0 p-0 flex flex-col items-center bg-zinc-900/90 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:block print:w-auto print:h-auto"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {/* Toolbar */}
      <div className="sticky top-0 w-full z-10 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4 bg-zinc-900/95 border-b border-zinc-800 shadow-2xl print:hidden backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1 text-white font-medium flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <h2 id="st-preview-title" className="text-sm text-zinc-300 uppercase tracking-widest font-bold">Pratinjau Surat Tugas</h2>
          <span className="text-blue-400 font-mono text-sm break-all">
            {data.nomor_surat || "DRAFT"}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            aria-label="Cetak Surat Tugas (A4)"
            onClick={handlePrint}
            className="flex min-h-11 min-w-11 items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
          >
            <Printer className="w-4 h-4" /> <span className="hidden md:inline">Cetak (A4)</span>
          </button>
          <button
            type="button"
            aria-label="Tutup pratinjau Surat Tugas"
            onClick={onClose}
            className="min-h-11 min-w-11 p-2.5 text-zinc-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Letter Content */}
      <div data-print-content role="region" aria-label="Dokumen Surat Tugas, gulir horizontal untuk melihat seluruh halaman" tabIndex={0} className="py-6 sm:py-10 print:py-0 w-full overflow-x-auto shrink-0 focus-visible:outline-2 focus-visible:outline-blue-400">
        <div className="flex w-max min-w-full justify-center print:block print:w-auto">
        <div
          onClick={(e) => e.stopPropagation()}
          ref={printRef}
          id="print-letter-area"
          data-print-letter
          className="w-[210mm] shrink-0 min-h-[297mm] bg-white p-[25mm] shadow-2xl shadow-black/50 print:shadow-none print:m-0 print:p-[15mm] text-black relative"
          style={{
            fontFamily: "'Bookman Old Style', 'Georgia', serif",
            fontSize: "11pt",
            lineHeight: "1.25",
            color: "#000",
            textAlign: "justify",
          }}
        >
          {/* KOP SURAT */}
          <div data-kop className="print:!mt-0 print:!ml-0 print:!mr-0" style={{ marginTop: "-22mm", marginBottom: "2px", marginLeft: "-1.5cm", marginRight: "-1cm" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveKopImageUrl(kopImageUrl)}
              alt="Kop Surat"
              style={{ width: "18.8cm", height: "auto", display: "block" }}
            />
          </div>

          {/* JUDUL */}
          <p style={{ textAlign: "center", fontWeight: "bold", fontSize: "11pt", margin: "0 0 2px" }}>
            SURAT TUGAS
          </p>
          <p style={{ textAlign: "center", fontSize: "11pt", margin: "0 0 16px" }}>
            Nomor : {data.nomor_surat || ".........................................."}
          </p>

          {/* === KEPALA BALAI / HEADER MODULAR === */}
          {renderHeaderTitleContent(headerTitle)}

          {/* MENIMBANG */}
          {menimbangItems.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginLeft: "0", tableLayout: "fixed" }}>
              <tbody>
                <tr>
                  <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Menimbang</td>
                  <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                  <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <tbody>
                        {menimbangItems.map((m, idx) => (
                          <tr key={m.id || idx}>
                            <td style={{ width: "24px", verticalAlign: "top", padding: idx === 0 ? "0" : "4px 0 0" }}>{indexToLetter(idx)}</td>
                            <td style={{ verticalAlign: "top", padding: idx === 0 ? "0" : "4px 0 0", textAlign: "justify" }}>{renderFormattedItalic(m.text || "...")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* DASAR */}
          {dasarItems.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginLeft: "0", tableLayout: "fixed" }}>
              <tbody>
                <tr>
                  <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Dasar</td>
                  <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                  <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                      <tbody>
                        {dasarItems.map((d, idx) => (
                          <tr key={d.id || idx}>
                            <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>{idx + 1}.</td>
                            <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>{renderFormattedItalic(d.text || "...")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          )}

          {/* MEMBERI TUGAS */}
          <p style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px" }}>MEMBERI TUGAS,</p>

          {/* KEPADA */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", marginLeft: "0", tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Kepada</td>
                <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr>
                          <td colSpan={2} style={{ padding: "4px 0", fontStyle: "italic", color: "#999" }}>
                            ( Tidak ada data pegawai )
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp, idx) => (
                          <React.Fragment key={emp.id}>
                            <tr>
                              <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>{idx + 1}.</td>
                              <td style={{ padding: "2px 0" }}>
                                <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ width: "70px", padding: "1px 0" }}>Nama</td>
                                      <td style={{ width: "20px", padding: "1px 0" }}>:</td>
                                      <td style={{ padding: "1px 0", fontWeight: "bold" }}>{emp.nama_lengkap || emp.name}</td>
                                    </tr>
                                    <tr>
                                      <td style={{ width: "70px", padding: "1px 0" }}>{formatNipLabel(emp)}</td>
                                      <td style={{ width: "20px", padding: "1px 0" }}>:</td>
                                      <td style={{ padding: "1px 0" }}>{formatNIP(emp.nip)}</td>
                                    </tr>
                                    <tr>
                                      <td style={{ width: "70px", padding: "1px 0" }}>Jabatan</td>
                                      <td style={{ width: "20px", padding: "1px 0" }}>:</td>
                                      <td style={{ padding: "1px 0" }}>{emp.jabatan || emp.pivot?.peran || "-"}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                            {idx < employees.length - 1 && (
                              <tr><td colSpan={2} style={{ padding: "4px 0" }}></td></tr>
                            )}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* UNTUK */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginLeft: "0", tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Untuk</td>
                <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>1.</td>
                        <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>
                          {(() => {
                            const hasDuration = /selama\s+\d+|terhitung\s+mulai\s+tanggal|pada\s+tanggal/i.test(untukText);
                            if (hasDuration || untukText.endsWith(";")) {
                              return renderFormattedItalic(untukText);
                            }
                            const isSingleDay = data.tanggal_mulai && data.tanggal_selesai && data.tanggal_mulai === data.tanggal_selesai;
                            const days = daysBetween(data.tanggal_mulai, data.tanggal_selesai);
                            return (
                              <>
                                {renderFormattedItalic(untukText)}
                                {data.tempat_tujuan && !untukText.includes(data.tempat_tujuan) && (
                                  <>, dari Samarinda ke {data.tempat_tujuan}</>
                                )}
                                {isSingleDay ? (
                                  <>, selama 1 (satu) hari pada tanggal {formatDateIndonesian(data.tanggal_mulai)};</>
                                ) : days > 1 ? (
                                  <>, selama {days} ({numberToWords(days)}) hari terhitung mulai tanggal {formatDateIndonesian(data.tanggal_mulai)} sampai dengan {formatDateIndonesian(data.tanggal_selesai)};</>
                                ) : (
                                  <>;</>
                                )}
                              </>
                            );
                          })()}
                        </td>
                      </tr>
                      {additionalUntuk.map((text, index) => (
                        <tr key={index}>
                          <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>{index + 2}.</td>
                          <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>
                            {renderFormattedItalic(text)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* PENUTUP */}
          <p style={{ margin: "28px 0 0", textAlign: penutupText.length > 80 ? "justify" : "left" }}>
            {renderFormattedItalic(penutupText)}
          </p>

          {/* TANDA TANGAN */}
          <div style={{ pageBreakInside: "avoid" }}>
            {tembusanPosition === "bottom" ? (
              <>
                {/* === TTD Layout Tabular / Full Width (FOLU) === */}
                <div style={{ marginTop: "14px", paddingLeft: "50%", textAlign: "left" }}>
                  {dateFormatStyle === "tabular" ? (
                    <table style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: "1px 0", width: "120px" }}>Dikeluarkan di</td>
                          <td style={{ padding: "1px 0", width: "14px" }}>:</td>
                          <td style={{ padding: "1px 0" }}>Samarinda</td>
                        </tr>
                        <tr>
                          <td style={{ padding: "1px 0" }}>Pada tanggal</td>
                          <td style={{ padding: "1px 0" }}>:</td>
                          <td style={{ padding: "1px 0" }}>{formatDateIndonesian(tanggalSurat)}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ margin: 0 }}>
                      Samarinda, {formatDateIndonesian(tanggalSurat)}
                    </p>
                  )}

                  {signerAuthorityMandate && signerAuthorityMandate.split("\n").map((line: string, idx: number) => (
                    <p key={idx} style={{ margin: idx === 0 ? "4px 0 0" : 0 }}>
                      {line.includes("Implementing") || line.includes("Partner") ? (
                        line.split(/(Implementing|Partner)/gi).map((part, pIdx) =>
                          /^(Implementing|Partner)$/i.test(part) ? (
                            <span key={pIdx} style={{ fontStyle: "italic" }}>{part}</span>
                          ) : (
                            part
                          )
                        )
                      ) : (
                        line
                      )}
                    </p>
                  ))}

                  <p style={{ margin: "0 0 0" }}>{signerTitle}</p>
                  <p style={{ margin: 0, height: "80px", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "9pt" }}>
                    {isOfficial ? "" : "${ttd_pengirim}"}
                  </p>
                  <p style={{ margin: 0, fontWeight: "bold" }}>
                    {signerName}
                  </p>
                  <p style={{ margin: 0, fontSize: "10pt" }}>
                    {formatNipLabel({ nip: signerNip }, true)} {formatNIP(signerNip)}
                  </p>
                </div>

                {/* === Tembusan Bawah (di bawah NIP, full width) === */}
                {tembusanItems.length > 0 && (
                  <div className="tembusan-block" style={{ marginTop: "16px", fontSize: "10pt", fontWeight: "normal", color: "#000000" }}>
                    <p style={{ margin: "0 0 4px", fontWeight: "normal", fontSize: "10pt", color: "#000000" }}>{tembusanLabel}</p>
                    <table style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        {tembusanItems.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{idx + 1}.</td>
                            <td style={{ verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{item}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* === Default TTD Layout (kanan, dengan tembusan di kiri bawah) === */}
                <div style={{ display: "flex", marginTop: "14px" }}>
                  <div style={{ marginLeft: "9.2cm", textAlign: "left" }}>
                    {dateFormatStyle === "tabular" ? (
                      <table style={{ borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: "1px 0", width: "120px" }}>Dikeluarkan di</td>
                            <td style={{ padding: "1px 0", width: "14px" }}>:</td>
                            <td style={{ padding: "1px 0" }}>Samarinda</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "1px 0" }}>Pada tanggal</td>
                            <td style={{ padding: "1px 0" }}>:</td>
                            <td style={{ padding: "1px 0" }}>{formatDateIndonesian(tanggalSurat)}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ margin: 0 }}>
                        Samarinda, {formatDateIndonesian(tanggalSurat)}
                      </p>
                    )}

                    {signerAuthorityMandate && signerAuthorityMandate.split("\n").map((line: string, idx: number) => (
                      <p key={idx} style={{ margin: idx === 0 ? "4px 0 0" : 0 }}>
                        {line}
                      </p>
                    ))}

                    <p style={{ margin: "0 0 0" }}>{signerTitle}</p>
                    <p style={{ margin: 0, height: "80px", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "9pt" }}>
                      {isOfficial ? "" : "${ttd_pengirim}"}
                    </p>
                    <p style={{ margin: 0, fontWeight: "bold" }}>
                      {signerName}
                    </p>
                    <p style={{ margin: 0, fontSize: "10pt" }}>
                      {formatNipLabel({ nip: signerNip }, true)} {formatNIP(signerNip)}
                    </p>
                  </div>
                </div>

                {/* TEMBUSAN Samping */}
                {tembusanItems.length > 0 && (
                  <div className="tembusan-block" style={{ marginTop: "-22px", maxWidth: "9.4cm", fontSize: "10pt", fontWeight: "normal", color: "#000000" }}>
                    <p style={{ margin: "0 0 4px", fontWeight: "normal", fontSize: "10pt", color: "#000000" }}>{tembusanLabel}</p>
                    <table style={{ borderCollapse: "collapse" }}>
                      <tbody>
                        {tembusanItems.map((item, idx) => (
                          <tr key={idx}>
                            {tembusanItems.length > 1 && (
                              <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{idx + 1}.</td>
                            )}
                            <td style={{ verticalAlign: "top", padding: "1px 0", fontSize: "10pt", whiteSpace: "nowrap" }}>{item}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
            #print-letter-area { 
              padding: 10mm 15mm !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
            @page { size: A4 portrait; margin: 5mm; }
        }
      `,
        }}
      />
    </dialog>
  );
}
