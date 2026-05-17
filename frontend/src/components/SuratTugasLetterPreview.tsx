"use client";

import React, { useRef } from "react";
import { Printer, X } from "lucide-react";
import {
  formatDateIndonesian,
  formatNIP,
  indexToLetter,
  daysBetween,
  numberToWords,
} from "@/lib/letter-utils";

interface Employee {
  id: string | number;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan?: string;
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
    status: string;
    keterangan?: string | null;
    tembusan?: string[] | null;
    nama_plh?: string | null;
    employees?: Employee[];
    approver?: { name: string; nip?: string };
  };
  onClose: () => void;
}

/** Parse menimbang/dasar field: could be array of {id, text}, array of strings, or a plain string */
function parseItems(value: DasarItem[] | string | null | undefined): DasarItem[] {
  if (!value) return [];
  if (typeof value === "string") {
    // Try JSON parse
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item, idx) => {
        if (typeof item === "string") return { id: String(idx), text: item };
        return { id: item.id || String(idx), text: item.text || String(item) };
      });
    } catch {
      // Single string - split by semicolons or return as single item
      return value.split(";").filter(s => s.trim()).map((s, idx) => ({ id: String(idx), text: s.trim() }));
    }
  }
  if (Array.isArray(value)) {
    return value.map((item, idx) => {
      if (typeof item === "string") return { id: String(idx), text: item };
      return { id: item.id || String(idx), text: item.text || String(item) };
    });
  }
  return [];
}

export default function SuratTugasLetterPreview({ data, onClose }: SuratTugasLetterPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const menimbangItems = parseItems(data.menimbang);
  const dasarItems = parseItems(data.dasar);
  const tembusanItems = data.tembusan || [];

  const employees: Employee[] = data.employees || [];

  // Build "Untuk" text from the letter data
  const untukText = data.maksud_tujuan || "...";

  // Format date for signature
  const tanggalSurat = data.tanggal_surat || data.tanggal_mulai;

  return (
    <div data-print-root className="fixed inset-0 z-[100] flex flex-col items-center bg-zinc-900/90 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:block print:w-auto print:h-auto" onClick={onClose}>
      {/* Toolbar */}
      <div className="sticky top-0 w-full z-10 flex items-center justify-between px-6 py-4 bg-zinc-900/95 border-b border-zinc-800 shadow-2xl print:hidden backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        <div className="text-white font-medium flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <span className="text-sm text-zinc-400 uppercase tracking-widest font-bold">Pratinjau Surat Tugas</span>
          <span className="text-blue-400 font-mono text-sm">
            {data.nomor_surat || "DRAFT"}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
          >
            <Printer className="w-4 h-4" /> <span className="hidden md:inline">Cetak (A4)</span>
          </button>
          <button
            onClick={onClose}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Letter Content */}
      <div data-print-content className="py-10 print:py-0 w-full flex justify-center">
        <div
          onClick={(e) => e.stopPropagation()}
          ref={printRef}
          id="print-letter-area"
          data-print-letter
          className="w-[210mm] min-h-[297mm] bg-white p-[25mm] shadow-2xl shadow-black/50 print:shadow-none print:m-0 print:p-[15mm] text-black relative"
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
              src="/header-new.png"
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

          {/* KEPALA BALAI */}
          <p style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px" }}>KEPALA BALAI,</p>

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
                            <td style={{ verticalAlign: "top", padding: idx === 0 ? "0" : "4px 0 0", textAlign: "justify" }}>{m.text || "..."}</td>
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
                            <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>{d.text || "..."}</td>
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
                                      <td style={{ width: "70px", padding: "1px 0" }}>NIP</td>
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
                          {untukText}
                          {data.tempat_tujuan && (
                            <>, dari Samarinda ke {data.tempat_tujuan}</>
                          )}
                          {data.tanggal_mulai && data.tanggal_selesai && (
                            <>, selama {daysBetween(data.tanggal_mulai, data.tanggal_selesai)} ({numberToWords(daysBetween(data.tanggal_mulai, data.tanggal_selesai))}) hari, dari tanggal {formatDateIndonesian(data.tanggal_mulai)} sampai dengan {formatDateIndonesian(data.tanggal_selesai)}</>
                          )}
                          ;
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>2.</td>
                        <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>
                          {data.sumber_dana
                            ? `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${data.sumber_dana};`
                            : "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;"}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>3.</td>
                        <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>
                          Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* PENUTUP */}
          <p style={{ margin: "28px 0 0" }}>Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>

          {/* TANDA TANGAN */}
          <div style={{ pageBreakInside: "avoid" }}>
            <div style={{ display: "flex", marginTop: "14px" }}>
              <div style={{ marginLeft: "9.2cm", textAlign: "left" }}>
                <p style={{ margin: 0 }}>
                  Samarinda, {formatDateIndonesian(tanggalSurat)}
                </p>
                <p style={{ margin: "0 0 0" }}>Kepala Balai,</p>
                {data.nama_plh && <p style={{ margin: 0, fontSize: "10pt" }}>( PLH )</p>}
                <p style={{ margin: 0, height: "80px", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "9pt" }}>
                  {data.status === "approved" ? "" : "${ttd_pengirim}"}
                </p>
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {data.nama_plh || "M. Ari Wibawanto, S.Hut., M.Sc."}
                </p>
                <p style={{ margin: 0, fontSize: "10pt" }}>
                  NIP. {data.approver?.nip ? formatNIP(data.approver.nip) : "19740514 199903 1 001"}
                </p>
              </div>
            </div>

            {/* TEMBUSAN */}
            {tembusanItems.length > 0 && (
              <div style={{ marginTop: "24px" }}>
                <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "10pt" }}>Tembusan:</p>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    {tembusanItems.filter(t => typeof t === "string" && t.trim()).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{idx + 1}.</td>
                        <td style={{ verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{item}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
            html, body { margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden; }
            #print-letter-area, #print-letter-area * { visibility: visible !important; }
            #print-letter-area {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              min-height: auto !important;
              padding: 10mm 15mm !important;
              margin: 0 !important;
              box-shadow: none !important;
              background: white !important;
              overflow: visible !important;
            }
            #print-letter-area [data-kop] {
              margin-top: 0 !important;
              margin-left: -10mm !important;
              margin-right: -10mm !important;
            }
            @page { size: A4 portrait; margin: 5mm; }
        }
      `,
        }}
      />
    </div>
  );
}
