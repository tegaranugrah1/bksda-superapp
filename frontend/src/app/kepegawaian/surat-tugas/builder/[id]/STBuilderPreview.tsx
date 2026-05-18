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
        <thead>
          <tr>
            <td>
              {/* === KOP SURAT === */}
              <div style={{ marginTop: "-10px", marginBottom: "2px", marginLeft: "-1.5cm", marginRight: "-1cm" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/header-new.png"
                  alt="Kop Surat"
                  style={{ width: "18.8cm", height: "auto", display: "block" }}
                />
              </div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
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
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px", marginLeft: "0", tableLayout: "fixed" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>Kepada</td>
                    <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
                    <td style={{ verticalAlign: "top", padding: "2px 0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                        <tbody>
                          {selectedEmployees.length === 0 ? (
                            <tr>
                              <td colSpan={2} style={{ padding: "4px 0", fontStyle: "italic", color: "#999" }}>
                                ( Belum ada pegawai dipilih )
                              </td>
                            </tr>
                          ) : (
                            selectedEmployees.map((emp, idx) => (
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
                                          <td style={{ padding: "1px 0" }}>{emp.jabatan}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                                {idx < selectedEmployees.length - 1 && (
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

              {/* === UNTUK === */}
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
                              {buildUntukText()}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ width: "24px", verticalAlign: "top", padding: "2px 0" }}>2.</td>
                            <td style={{ verticalAlign: "top", padding: "2px 0", textAlign: "justify" }}>
                              {buildBiayaText()}
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

              {/* === PENUTUP === */}
              {isFolu ? (
                <p style={{ margin: "28px 0 0", textAlign: "justify" }}>
                  Demikian Surat Perintah Tugas ini dibuat, untuk dapat dipergunakan sebagaimana mestinya dan kepada instansi yang dikunjungi dimohon bantuan seperlunya demi kelancaran pelaksanaan tugas.
                </p>
              ) : (
                <p style={{ margin: "28px 0 0" }}>Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>
              )}

              {/* === TANDA TANGAN + TEMBUSAN === */}
              <div style={{ pageBreakInside: "avoid" }}>
                {isFolu ? (
                  <>
                    {/* === FOLU TTD Layout === */}
                    <div style={{ marginTop: "14px", marginLeft: "7cm", textAlign: "left" }}>
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
                      <p className="ttd-placeholder" style={{ margin: 0, height: "80px", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "9pt" }}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0, fontSize: "10pt" }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    {/* === FOLU Tembusan — di bawah NIP, full width === */}
                    {tembusanItems.length > 0 && (
                      <div style={{ marginTop: "16px" }}>
                        <p style={{ margin: "0 0 4px", fontSize: "10pt" }}>Tembusan Kepada :</p>
                        <table style={{ borderCollapse: "collapse" }}>
                          <tbody>
                            {tembusanItems.filter(t => t && t.trim()).map((item, idx) => (
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
                    {/* === Default TTD (kanan) === */}
                    <div style={{ marginTop: "14px", marginLeft: "9.2cm", textAlign: "left" }}>
                      <p style={{ margin: 0 }}>
                        {kotaSurat || "..."}, {tanggalSurat ? formatDateIndonesian(tanggalSurat) : "... ............. ...."}
                      </p>
                      <p style={{ margin: "0 0 0" }}>Kepala Balai,</p>
                      <p className="ttd-placeholder" style={{ margin: 0, height: "80px", display: "flex", alignItems: "center", color: "#94a3b8", fontSize: "9pt" }}>
                        ${"{ttd_pengirim}"}
                      </p>
                      <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
                      <p style={{ margin: 0, fontSize: "10pt" }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
                    </div>

                    {/* === Tembusan (kiri) sejajar NIP (kanan sudah di atas) === */}
                    {tembusanItems.length > 0 && (
                      <div style={{ marginTop: "-28px" }}>
                        <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "10pt" }}>Tembusan:</p>
                        <table style={{ borderCollapse: "collapse", maxWidth: "8cm" }}>
                          <tbody>
                            {tembusanItems.filter(t => t && t.trim()).map((item, idx) => (
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
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
