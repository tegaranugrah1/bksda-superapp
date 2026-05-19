"use client";

import React from "react";
import {
  formatDateIndonesian,
  formatNIP,
  indexToLetter,
} from "@/lib/letter-utils";

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
  selectedEmployees: Employee[];
  buildUntukText: () => string;
  buildBiayaText: () => string;
  kotaSurat: string;
  tanggalSurat: string;
  kepalaBalai: { name: string; nip: string };
  tembusanItems?: string[];
  headerTitle?: string;
  sumberDana?: string;
}

export default function STBuilderPreview({
  stNumber,
  stCode,
  currentMonth,
  currentYear,
  menimbangItems,
  dasarItems,
  selectedEmployees,
  buildUntukText,
  buildBiayaText,
  kotaSurat,
  tanggalSurat,
  kepalaBalai,
  tembusanItems = [],
  headerTitle = "KEPALA BALAI,",
  sumberDana = "dipa",
}: PreviewProps) {
  const isFolu = sumberDana === "folu";
  const visibleTembusanItems = tembusanItems.filter(t => t && t.trim());
  const shouldNumberDefaultTembusan = visibleTembusanItems.length > 1;

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
        <thead className="page-spacer">
          <tr><td style={{ height: 0, padding: 0, lineHeight: 0, fontSize: 0 }}></td></tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {/* === KOP SURAT (only page 1) === */}
              <div className="kop-surat" style={{ marginTop: "-10px", marginBottom: "2px", marginLeft: "-1.5cm", marginRight: "-1cm" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/header-new.png"
                  alt="Kop Surat"
                  style={{ width: "18.8cm", height: "auto", display: "block" }}
                />
              </div>
              <div className="surat-content">
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
                              <td style={{ verticalAlign: "top", padding: idx === 0 ? "0" : "4px 0 0", textAlign: "justify" }}>{m.text || "..."}</td>
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
                              <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>{d.text || "..."}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* === MEMBERI TUGAS === */}
              <p style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px" }}>MEMBERI TUGAS,</p>

              {/* === KEPADA === */}
              <div
                className="field-section kepada-section"
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 12px 1fr",
                  columnGap: 0,
                  marginBottom: "12px",
                }}
              >
                <div style={{ padding: "2px 0" }}>Kepada</div>
                <div style={{ padding: "2px 0" }}>:</div>
                <div className="kepada-list" style={{ padding: "2px 0" }}>
                  {selectedEmployees.length === 0 ? (
                    <div style={{ padding: "4px 0", fontStyle: "italic", color: "#999" }}>
                      ( Belum ada pegawai dipilih )
                    </div>
                  ) : (
                    selectedEmployees.map((emp, idx) => (
                      <div
                        className="employee-entry"
                        key={emp.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "24px 1fr",
                          padding: idx === 0 ? "0 0 4px" : "4px 0",
                          breakInside: "avoid",
                        }}
                      >
                        <div style={{ padding: "2px 0" }}>{idx + 1}.</div>
                        <div>
                          <div style={{ display: "grid", gridTemplateColumns: "70px 20px 1fr" }}>
                            <div style={{ padding: "1px 0" }}>Nama</div>
                            <div style={{ padding: "1px 0" }}>:</div>
                            <div style={{ padding: "1px 0", fontWeight: "bold" }}>{emp.nama_lengkap || emp.name}</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "70px 20px 1fr" }}>
                            <div style={{ padding: "1px 0" }}>NIP</div>
                            <div style={{ padding: "1px 0" }}>:</div>
                            <div style={{ padding: "1px 0" }}>{formatNIP(emp.nip)}</div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "70px 20px 1fr" }}>
                            <div style={{ padding: "1px 0" }}>Jabatan</div>
                            <div style={{ padding: "1px 0" }}>:</div>
                            <div style={{ padding: "1px 0" }}>{emp.jabatan}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* === UNTUK === */}
              <div
                className="field-section untuk-section"
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 12px 1fr",
                  columnGap: 0,
                  marginBottom: "8px",
                }}
              >
                <div style={{ padding: "2px 0" }}>Untuk</div>
                <div style={{ padding: "2px 0" }}>:</div>
                <div className="untuk-list" style={{ padding: "2px 0" }}>
                  {[
                    buildUntukText(),
                    buildBiayaText(),
                    "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.",
                  ].map((item, idx) => (
                    <div
                      className="untuk-entry"
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "24px 1fr",
                        padding: "2px 0",
                        breakInside: "avoid",
                      }}
                    >
                      <div style={{ padding: "0" }}>{idx + 1}.</div>
                      <div style={{ padding: "0", textAlign: "justify" }}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* === PENUTUP === */}
              {isFolu ? (
                <p className="penutup-surat" style={{ margin: "28px 0 0", textAlign: "justify" }}>
                  Demikian Surat Perintah Tugas ini dibuat, untuk dapat dipergunakan sebagaimana mestinya dan kepada instansi yang dikunjungi dimohon bantuan seperlunya demi kelancaran pelaksanaan tugas.
                </p>
              ) : (
                <p className="penutup-surat" style={{ margin: "28px 0 0" }}>Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>
              )}

              {/* === TANDA TANGAN + TEMBUSAN === */}
              <div className="ttd-tembusan-wrapper" style={{ pageBreakInside: "avoid" }}>
                {isFolu ? (
                  <>
                    {/* === FOLU TTD Layout — Dikeluarkan sejajar a.n., rata kanan === */}
                    <div style={{ marginTop: "14px", paddingLeft: "50%" }}>
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
                      <p className="ttd-placeholder" style={{ margin: "14px 0 0", height: "105px", display: "flex", alignItems: "flex-start", paddingTop: "34px", paddingLeft: "1.35cm", boxSizing: "border-box", color: "#94a3b8", fontSize: "9pt" }}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0, fontSize: "10pt" }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    {/* === FOLU Tembusan — di bawah NIP, full width === */}
                    {visibleTembusanItems.length > 0 && (
                      <div className="tembusan-block" style={{ marginTop: "16px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "10pt" }}>Tembusan Kepada :</p>
                        <table style={{ borderCollapse: "collapse" }}>
                          <tbody>
                            {visibleTembusanItems.map((item, idx) => (
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
                    {/* === Default TTD (kanan) — all in one block === */}
                    <div style={{ marginTop: "14px", marginLeft: "9.2cm", textAlign: "left" }}>
                      <p style={{ margin: 0 }}>
                        {kotaSurat || "..."}, {tanggalSurat ? formatDateIndonesian(tanggalSurat) : "... ............. ...."}
                      </p>
                      <p style={{ margin: "0 0 0" }}>Kepala Balai,</p>
                      <p className="ttd-placeholder" style={{ margin: "14px 0 0", height: "105px", display: "flex", alignItems: "flex-start", paddingTop: "34px", paddingLeft: "1.35cm", boxSizing: "border-box", color: "#94a3b8", fontSize: "9pt" }}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0, fontSize: "10pt" }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    {/* === Tembusan (kiri) sejajar NIP === */}
                    {visibleTembusanItems.length > 0 && (
                      <div className="tembusan-block" style={{ marginTop: "-22px", maxWidth: "8cm" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "10pt" }}>Tembusan:</p>
                        <table style={{ borderCollapse: "collapse" }}>
                          <tbody>
                            {visibleTembusanItems.map((item, idx) => (
                              <tr key={idx}>
                                {shouldNumberDefaultTembusan && (
                                  <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{idx + 1}.</td>
                                )}
                                <td style={{ verticalAlign: "top", padding: "1px 0", fontSize: "10pt" }}>{item}</td>
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
