"use client";

import React from "react";
import {
  formatDateIndonesian,
  formatNIP,
  formatNipLabel,
  indexToLetter,
  renderFormattedItalic,
} from "@/lib/letter-utils";

export interface SuratTugasClauseItem {
  id?: string | number;
  text: string;
}

export interface SuratTugasEmployeeRow {
  id: string | number;
  nama_lengkap?: string;
  name?: string;
  nip: string;
  jabatan?: string;
  is_buruh?: boolean;
  is_pppk?: boolean;
  nip_label?: string;
  pivot?: { peran?: string };
}

export function renderHeaderTitleContent(title = "KEPALA BALAI,") {
  const lines = (title || "KEPALA BALAI,").split("\n");
  const regex = /(\*[^*]+\*|IMPLEMENTING PARTNER|Implementing Partner)/g;

  return (
    <div style={{ textAlign: "center", fontWeight: "bold", margin: "16px 0 4px", fontSize: "11pt", lineHeight: "1.35" }}>
      {lines.map((line, i) => (
        <p key={i} style={{ margin: 0 }}>
          {line.split(regex).map((part, j) => {
            if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
              return <span key={j} style={{ fontStyle: "italic" }}>{part.slice(1, -1)}</span>;
            }
            if (part.toUpperCase() === "IMPLEMENTING PARTNER") {
              return <span key={j} style={{ fontStyle: "italic" }}>{part}</span>;
            }
            return <React.Fragment key={j}>{part}</React.Fragment>;
          })}
        </p>
      ))}
    </div>
  );
}

export function renderMandateLineContent(line: string, highlightImplementing = false) {
  if (!highlightImplementing || (!line.includes("Implementing") && !line.includes("Partner"))) {
    return line;
  }
  return line.split(/(Implementing|Partner)/gi).map((part, pIdx) =>
    /^(Implementing|Partner)$/i.test(part) ? (
      <span key={pIdx} style={{ fontStyle: "italic" }}>{part}</span>
    ) : (
      part
    )
  );
}

export function SuratTugasClauseSection({
  label,
  items,
  indexStyle,
  replaceYear,
}: {
  label: "Menimbang" | "Dasar";
  items: SuratTugasClauseItem[];
  indexStyle: "letter" | "number";
  replaceYear?: string;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8px", marginLeft: "0", tableLayout: "fixed" }}>
      <tbody>
        <tr>
          <td style={{ width: "110px", verticalAlign: "top", padding: "2px 0" }}>{label}</td>
          <td style={{ width: "12px", verticalAlign: "top", padding: "2px 0" }}>:</td>
          <td style={{ verticalAlign: "top", padding: "2px 0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <tbody>
                {items.map((item, idx) => {
                  const text = replaceYear
                    ? (item.text || "...").replace(/{tahun}/g, replaceYear)
                    : (item.text || "...");
                  const isMenimbang = indexStyle === "letter";
                  return (
                    <tr key={item.id ?? idx}>
                      <td
                        style={{
                          width: "24px",
                          verticalAlign: "top",
                          padding: isMenimbang ? (idx === 0 ? "0" : "4px 0 0") : "2px 0",
                        }}
                      >
                        {isMenimbang ? indexToLetter(idx) : `${idx + 1}.`}
                      </td>
                      <td
                        style={{
                          verticalAlign: "top",
                          padding: isMenimbang ? (idx === 0 ? "0" : "4px 0 0") : "2px 0",
                          textAlign: "justify",
                        }}
                      >
                        {renderFormattedItalic(text)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function SuratTugasEmployeesTable({
  employees,
  dense = false,
}: {
  employees: SuratTugasEmployeeRow[];
  dense?: boolean;
}) {
  const rowPad = dense ? "0" : "1px 0";
  const rowStyle = dense ? { padding: rowPad, lineHeight: 1.15 } : { padding: rowPad };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      <tbody>
        {employees.map((emp, idx) => {
          const name = emp.nama_lengkap || emp.name;
          const showNip = Boolean(!emp.is_buruh && name !== "PM");
          const jabatan = emp.jabatan || emp.pivot?.peran || (dense ? undefined : "-");

          return (
            <React.Fragment key={emp.id}>
              <tr
                className={dense ? "employee-entry" : undefined}
                style={dense ? { breakInside: "avoid", pageBreakInside: "avoid" } : undefined}
              >
                <td
                  style={{
                    width: "24px",
                    verticalAlign: "top",
                    padding: dense ? (idx === 0 ? "0 0 1px" : "1px 0") : "2px 0",
                    ...(dense ? { breakInside: "avoid", pageBreakInside: "avoid" } : {}),
                  }}
                >
                  {idx + 1}.
                </td>
                <td
                  style={{
                    verticalAlign: "top",
                    padding: dense ? (idx === 0 ? "0 0 1px" : "1px 0") : "2px 0",
                    ...(dense ? { breakInside: "avoid", pageBreakInside: "avoid" } : {}),
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      tableLayout: "fixed",
                      ...(dense ? { breakInside: "avoid", pageBreakInside: "avoid" } : {}),
                    }}
                  >
                    <tbody style={dense ? { breakInside: "avoid", pageBreakInside: "avoid" } : undefined}>
                      <tr>
                        <td style={{ width: "70px", ...rowStyle }}>Nama</td>
                        <td style={{ width: "20px", ...rowStyle }}>:</td>
                        <td style={{ ...rowStyle, fontWeight: "bold" }}>{name}</td>
                      </tr>
                      {showNip && (
                        <tr>
                          <td style={{ width: "70px", ...rowStyle }}>{formatNipLabel(emp)}</td>
                          <td style={{ width: "20px", ...rowStyle }}>:</td>
                          <td style={rowStyle}>{formatNIP(emp.nip)}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ width: "70px", ...rowStyle }}>Jabatan</td>
                        <td style={{ width: "20px", ...rowStyle }}>:</td>
                        <td style={rowStyle}>{jabatan}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              {!dense && idx < employees.length - 1 && (
                <tr>
                  <td colSpan={2} style={{ padding: "4px 0" }} />
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export function SuratTugasDateLine({
  dateFormatStyle,
  kotaSurat,
  tanggalSurat,
  datePlaceholder = "... ............. ....",
}: {
  dateFormatStyle?: "inline" | "tabular" | string;
  kotaSurat?: string;
  tanggalSurat?: string;
  datePlaceholder?: string;
}) {
  const formattedDate = tanggalSurat ? formatDateIndonesian(tanggalSurat) : datePlaceholder;
  if (dateFormatStyle === "tabular") {
    return (
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
            <td style={{ padding: "1px 0" }}>{formattedDate}</td>
          </tr>
        </tbody>
      </table>
    );
  }
  return (
    <p style={{ margin: 0 }}>
      {kotaSurat || "..."}, {formattedDate}
    </p>
  );
}

export function SuratTugasTembusanBlock({
  items,
  label,
  position,
  styledPrintText = false,
}: {
  items: string[];
  label: string;
  position: "bottom" | "beside";
  styledPrintText?: boolean;
}) {
  if (items.length === 0) return null;
  const isBottom = position === "bottom";
  const showNumbers = isBottom || items.length > 1;
  const textStyle: React.CSSProperties = styledPrintText
    ? { fontSize: "10pt", fontWeight: "normal", color: "#000000" }
    : {};

  return (
    <div
      className="tembusan-block"
      style={{
        marginTop: isBottom ? "16px" : "-22px",
        ...(isBottom ? {} : { maxWidth: "9.4cm" }),
        ...textStyle,
      }}
    >
      <p style={{ margin: "0 0 4px", ...textStyle }}>{label}</p>
      <table style={{ borderCollapse: "collapse" }}>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              {showNumbers && (
                <td style={{ width: "20px", verticalAlign: "top", padding: "1px 0", ...(styledPrintText ? { fontSize: "10pt" } : {}) }}>
                  {idx + 1}.
                </td>
              )}
              <td
                style={{
                  verticalAlign: "top",
                  padding: "1px 0",
                  ...(isBottom ? {} : { whiteSpace: "nowrap" }),
                  ...(styledPrintText ? { fontSize: "10pt" } : {}),
                }}
              >
                {item}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
