"use client";

import React from "react";
import {
  formatDateIndonesian,
  formatNIP,
  indexToLetter,
} from "@/lib/letter-utils";
import STLampiranBedaHari, { type EmployeeDateRange } from "./STLampiranBedaHari";

interface Employee {
  id: string;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
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
  sumberDana?: string;
  templateType?: string | null;
  employeeDates?: Record<string, EmployeeDateRange>;
  judulLampiranBedaHari?: string;
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
  sumberDana = "dipa",
  templateType = null,
  employeeDates = {},
  judulLampiranBedaHari = "DAFTAR PEGAWAI MENGIKUTI PATROLI",
}: PreviewProps) {
  const isFolu = sumberDana === "folu";
  const isBmnTemplate = templateType === "bmn-pemeriksaan";
  const isBedaHariTemplate = templateType === "beda-hari";
  const isPlhTemplate = templateType === "plh";
  const visibleTembusanItems = tembusanItems.filter(t => t && t.trim());
  const shouldNumberDefaultTembusan = visibleTembusanItems.length > 1;
  const signaturePlaceholderStyle: React.CSSProperties = {
    margin: "14px 0 0",
    height: "105px",
    display: "flex",
    alignItems: "flex-start",
    paddingTop: "34px",
    paddingLeft: "1.35cm",
    boxSizing: "border-box",
    color: "#94a3b8",
    fontSize: "9pt",
  };
  const fallbackUntukItems = [
    isPlhTemplate
      ? "Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai."
      : isBmnTemplate
      ? "Membuat laporan tertulis paling lambat 7 (tujuh) hari setelah selesainya kegiatan tersebut."
      : "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.",
    buildBiayaText?.() || "",
  ];
  const additionalUntukItems = untukItems
    ? untukItems.map((item) => item.text)
    : fallbackUntukItems;

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
        <tfoot className="hidden print:table-footer-group">
          <tr><td style={{ height: "15mm", border: "none", padding: 0 }}></td></tr>
        </tfoot>
        <tbody>
          <tr className="print:break-inside-auto" style={{ breakInside: "auto", pageBreakInside: "auto" }}>
            <td className="align-top">
              {/* === KOP SURAT (only page 1) === */}
              <div className="kop-surat" style={{ width: "100%", marginBottom: "4mm", textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/header.png"
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
                Nomor : ST.{stNumber || "..."}/{stCode || "..."}/{currentMonth}/{currentYear}
              </p>

              {/* === KEPALA BALAI / HEADER === */}
              {headerTitle.includes("\n") ? (
                <div style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px" }}>
                  {headerTitle.split("\n").map((line, i) => (
                    <p key={i} style={{ margin: 0 }}>
                      {line.includes("IMPLEMENTING PARTNER") ? (
                        <>
                          {line.split("IMPLEMENTING PARTNER").map((part, j) => (
                            <React.Fragment key={j}>
                              {j > 0 && <span style={{ fontStyle: "italic" }}>IMPLEMENTING PARTNER</span>}
                              {part}
                            </React.Fragment>
                          ))}
                        </>
                      ) : line}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px" }}>{headerTitle}</p>
              )}

              {/* === MENIMBANG === */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Menimbang</td>
                    <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                    <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <tbody>
                          {menimbangItems.map((m, idx) => (
                            <tr key={m.id}>
                              <td style={{ width: "24px", verticalAlign: "top", padding: idx === 0 ? "0" : "4px 0 0" }}>{indexToLetter(idx)}</td>
                              <td style={{ verticalAlign: "top", padding: idx === 0 ? "0" : "4px 0 0", textAlign: "justify" }}>
                                {(m.text || "...").replace(/{tahun}/g, currentYear || new Date().getFullYear().toString())}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === DASAR === */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Dasar</td>
                    <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                    <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <tbody>
                          {dasarItems.map((d, idx) => (
                            <tr key={d.id}>
                              <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>{idx + 1}.</td>
                              <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>
                                {(d.text || "...").replace(/{tahun}/g, currentYear || new Date().getFullYear().toString())}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === MEMBERI TUGAS === */}
              <p className="print:break-after-avoid break-after-avoid" style={{ textAlign: "center", fontWeight: "bold", margin: "10px 0 2px", pageBreakAfter: "avoid", breakAfter: "avoid" }}>MEMBERI TUGAS,</p>

              {/* === KEPADA === */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "1px 0" }}>Kepada</td>
                    <td style={{ width: "12px", verticalAlign: "top", padding: "1px 0" }}>:</td>
                    <td style={{ verticalAlign: "top", padding: "1px 0" }}>
                      {isBedaHariTemplate ? (
                        <div style={{ padding: "2px 0" }}>Daftar nama terlampir.</div>
                      ) : selectedEmployees.length === 0 ? (
                        <div style={{ padding: "4px 0", fontStyle: "italic", color: "#999" }}>
                          ( Belum ada pegawai dipilih )
                        </div>
                      ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                          <tbody>
                            {selectedEmployees.map((emp, idx) => (
                              <tr key={emp.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                                <td style={{ width: "24px", verticalAlign: "top", padding: idx === 0 ? "0 0 1px" : "1px 0" }}>{idx + 1}.</td>
                                <td style={{ verticalAlign: "top", padding: idx === 0 ? "0 0 1px" : "1px 0" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                                    <tbody>
                                      <tr>
                                        <td style={{ width: "70px", padding: "0", lineHeight: 1.15 }}>Nama</td>
                                        <td style={{ width: "20px", padding: "0", lineHeight: 1.15 }}>:</td>
                                        <td style={{ padding: "0", lineHeight: 1.15, fontWeight: "bold" }}>{emp.nama_lengkap || emp.name}</td>
                                      </tr>
                                      <tr>
                                        <td style={{ width: "70px", padding: "0", lineHeight: 1.15 }}>NIP</td>
                                        <td style={{ width: "20px", padding: "0", lineHeight: 1.15 }}>:</td>
                                        <td style={{ padding: "0", lineHeight: 1.15 }}>{formatNIP(emp.nip)}</td>
                                      </tr>
                                      <tr>
                                        <td style={{ width: "70px", padding: "0", lineHeight: 1.15 }}>Jabatan</td>
                                        <td style={{ width: "20px", padding: "0", lineHeight: 1.15 }}>:</td>
                                        <td style={{ padding: "0", lineHeight: 1.15 }}>{emp.jabatan}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === UNTUK === */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "4px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
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
                            <tr key={idx} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                              <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>{idx + 1}.</td>
                              <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>{item}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === PENUTUP + TTD + TEMBUSAN — keep together so TTD never breaks alone === */}
              <div className="penutup-ttd-group print:break-inside-avoid break-inside-avoid" style={{ display: 'block', breakInside: "avoid", pageBreakInside: "avoid" }}>
                {isFolu ? (
                  <p className="penutup-surat" style={{ margin: "16px 0 0", textAlign: "justify" }}>
                    Demikian Surat Perintah Tugas ini dibuat, untuk dapat dipergunakan sebagaimana mestinya dan kepada instansi yang dikunjungi dimohon bantuan seperlunya demi kelancaran pelaksanaan tugas.
                  </p>
                ) : (
                  <p className="penutup-surat" style={{ margin: "16px 0 0" }}>Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>
                )}

                {/* === TANDA TANGAN + TEMBUSAN === */}
                <div className="ttd-tembusan-wrapper print:break-inside-avoid break-inside-avoid" style={{ display: 'block', breakInside: "avoid", pageBreakInside: "avoid" }}>
                {isFolu ? (
                  <>
                    {/* === FOLU TTD Layout — Dikeluarkan sejajar a.n., rata kanan === */}
                    <div style={{ marginTop: "8px", paddingLeft: "50%" }}>
                      <table style={{ borderCollapse: "collapse" }}>
                        <tbody>
                          <tr>
                            <td style={{ padding: "1px 0", width: "120px" }}>Dikeluarkan di</td>
                            <td style={{ padding: "1px 0", width: "14px" }}>:</td>
                            <td style={{ padding: "1px 0" }}>{kotaSurat || "..."}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: "1px 0" }}>Pada tanggal</td>
                            <td style={{ padding: "1px 0" }}>:</td>
                            <td style={{ padding: "1px 0" }}>{tanggalSurat ? formatDateIndonesian(tanggalSurat) : "... ............. ...."}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p style={{ margin: "4px 0 0" }}>a.n. Sekretaris Direktorat Jenderal KSDAE</p>
                      <p style={{ margin: 0 }}>selaku Koordinator Kegiatan <span style={{ fontStyle: "italic" }}>Implementing</span></p>
                      <p style={{ margin: 0 }}><span style={{ fontStyle: "italic" }}>Partner</span> FOLU NC 2&amp;3</p>
                      <p style={{ margin: "0 0 0" }}>Kepala Balai,</p>
                      <p className="ttd-placeholder" style={signaturePlaceholderStyle}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0 }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    {/* === FOLU Tembusan — di bawah NIP, full width === */}
                    {visibleTembusanItems.length > 0 && (
                      <div className="tembusan-block" style={{ marginTop: "16px" }}>
                        <p style={{ margin: "0 0 4px" }}>Tembusan Kepada :</p>
                        <table style={{ borderCollapse: "collapse" }}>
                          <tbody>
                            {visibleTembusanItems.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0" }}>{idx + 1}.</td>
                                <td style={{ verticalAlign: "top", padding: "1px 0" }}>{item}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* === Default TTD (kanan) — all in one block === */}
                    <div style={{ marginTop: "8px", marginLeft: "9.2cm", textAlign: "left" }}>
                      <p style={{ margin: 0 }}>
                        {kotaSurat || "..."}, {tanggalSurat ? formatDateIndonesian(tanggalSurat) : "... ............. ...."}
                      </p>
                      <p style={{ margin: "0 0 0" }}>Kepala Balai,</p>
                      <p className="ttd-placeholder" style={signaturePlaceholderStyle}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0 }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    {/* === Tembusan (kiri) sejajar NIP === */}
                    {visibleTembusanItems.length > 0 && (
                      <div className="tembusan-block" style={{ marginTop: "-22px", maxWidth: "9.4cm" }}>
                        <p style={{ margin: "0 0 4px" }}>Tembusan:</p>
                        <table style={{ borderCollapse: "collapse" }}>
                          <tbody>
                            {visibleTembusanItems.map((item, idx) => (
                              <tr key={idx}>
                                {shouldNumberDefaultTembusan && (
                                  <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0" }}>{idx + 1}.</td>
                                )}
                                <td style={{ verticalAlign: "top", padding: "1px 0", whiteSpace: "nowrap" }}>{item}</td>
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
            </td>
          </tr>
        </tbody>
      </table>

      {/* === HALAMAN 2: LAMPIRAN BEDA HARI === */}
      {isBedaHariTemplate && (
        <div
          className="st-lampiran-page-wrapper"
          style={{
            pageBreakBefore: "always",
            breakBefore: "page",
            paddingTop: "0.2cm",
          }}
        >
          <STLampiranBedaHari
            stNumber={stNumber}
            stCode={stCode}
            currentMonth={currentMonth}
            currentYear={currentYear}
            tanggalSurat={tanggalSurat}
            selectedEmployees={selectedEmployees}
            employeeDates={employeeDates}
            kepalaBalai={kepalaBalai}
            judulLampiran={judulLampiranBedaHari}
          />
        </div>
      )}
    </div>
  );
}
