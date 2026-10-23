"use client";

import { formatDateIndonesian, formatNIP, formatNipLabel } from "@/lib/letter-utils";
import { isBuruhEmployee, getEmployeeCity } from "../_lib";

interface Employee {
  id: string | number;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
  is_pppk?: boolean;
  is_buruh?: boolean;
  nip_label?: string;
  pangkat_golongan?: string;
  department?: string;
  satuan_kerja?: string;
  unit_kerja?: string;
  seksi_wilayah?: string | null;
  kota_asal?: string;
}

export interface EmployeeDateRange {
  mulai: string;
  selesai: string;
}

interface STLampiranBedaHariProps {
  stNumber: string;
  stCode: string;
  currentMonth: string;
  currentYear: string;
  tanggalSurat: string;
  selectedEmployees: Employee[];
  employeeDates: Record<string, EmployeeDateRange>;
  employeeDepartures?: Record<string, string>;
  showDepartureColumn?: boolean;
  defaultTanggalMulai?: string;
  defaultTanggalSelesai?: string;
  defaultKotaAsal?: string;
  kepalaBalai: { name: string; nip: string };
  judulLampiran?: string;
}

/**
 * Format range tanggal untuk tabel lampiran.
 * Menampilkan tanggal/hari di baris pertama dan bulan + tahun di baris kedua
 * agar proporsional dan muat sempurna di kolom Tanggal.
 */
function renderDateRange(mulai: string, selesai: string): React.ReactNode {
  if (!mulai && !selesai) return "...";
  if (mulai && !selesai) {
    const d = new Date(mulai);
    if (Number.isNaN(d.getTime())) return mulai;
    const day = d.getDate();
    const monthYear = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return (
      <span style={{ display: "inline-block", lineHeight: "1.25" }}>
        <span>{day}</span>
        <br />
        <span>{monthYear}</span>
      </span>
    );
  }
  if (!mulai && selesai) {
    const d = new Date(selesai);
    if (Number.isNaN(d.getTime())) return selesai;
    const day = d.getDate();
    const monthYear = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return (
      <span style={{ display: "inline-block", lineHeight: "1.25" }}>
        <span>{day}</span>
        <br />
        <span>{monthYear}</span>
      </span>
    );
  }

  const start = new Date(mulai);
  const end = new Date(selesai);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "...";

  if (mulai === selesai || start.getTime() === end.getTime()) {
    const day = start.getDate();
    const monthYear = start.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return (
      <span style={{ display: "inline-block", lineHeight: "1.25" }}>
        <span>{day}</span>
        <br />
        <span>{monthYear}</span>
      </span>
    );
  }

  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const monthYear = end.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return (
      <span style={{ display: "inline-block", lineHeight: "1.25" }}>
        <span>{startDay} – {endDay}</span>
        <br />
        <span>{monthYear}</span>
      </span>
    );
  }

  if (sameYear) {
    const startMonth = start.toLocaleDateString("id-ID", { month: "long" });
    const endMonth = end.toLocaleDateString("id-ID", { month: "long" });
    const year = end.getFullYear();
    return (
      <span style={{ display: "inline-block", lineHeight: "1.25" }}>
        <span>{start.getDate()} {startMonth} –</span>
        <br />
        <span>{end.getDate()} {endMonth} {year}</span>
      </span>
    );
  }

  const startFormatted = start.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const endFormatted = end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  return (
    <span style={{ display: "inline-block", lineHeight: "1.25" }}>
      <span>{startFormatted} –</span>
      <br />
      <span>{endFormatted}</span>
    </span>
  );
}

export default function STLampiranBedaHari({
  stNumber,
  stCode,
  currentMonth,
  currentYear,
  tanggalSurat,
  selectedEmployees,
  employeeDates,
  employeeDepartures = {},
  showDepartureColumn = false,
  defaultTanggalMulai,
  defaultTanggalSelesai,
  defaultKotaAsal = "Samarinda",
  kepalaBalai,
  judulLampiran = "DAFTAR PEGAWAI MENGIKUTI PATROLI",
}: STLampiranBedaHariProps) {
  const fullNomor = `ST.${stNumber || "..."}/${stCode || "..."}/${currentMonth}/${currentYear}`;
  const tanggalText = tanggalSurat ? formatDateIndonesian(tanggalSurat) : "...";

  return (
    <div
      className="st-lampiran-page"
      style={{
        fontFamily: "'Bookman Old Style', 'Georgia', serif",
        fontSize: "11pt",
        lineHeight: "1.25",
        color: "#000",
        padding: "0 1.55cm 2.5cm 2.0cm",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* === Meta block kanan atas === */}
      <div
        className="lampiran-meta"
        style={{
          marginLeft: "7.3cm",
          marginBottom: "0.8rem",
        }}
      >
        <p style={{ margin: 0 }}>Lampiran Surat Tugas Kepala Balai</p>
        <table style={{ borderCollapse: "collapse", marginTop: 2 }}>
          <tbody>
            <tr>
              <td style={{ width: "60px", padding: "1px 12px 1px 0", verticalAlign: "top" }}>Nomor</td>
              <td style={{ width: "10px", padding: "1px 0", verticalAlign: "top" }}>:</td>
              <td style={{ padding: "1px 0 1px 8px", verticalAlign: "top" }}>{fullNomor}</td>
            </tr>
            <tr>
              <td style={{ padding: "1px 12px 1px 0", verticalAlign: "top" }}>Tanggal</td>
              <td style={{ padding: "1px 0", verticalAlign: "top" }}>:</td>
              <td style={{ padding: "1px 0 1px 8px", verticalAlign: "top" }}>{tanggalText}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* === Judul tengah === */}
      <p
        contentEditable
        suppressContentEditableWarning
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "12pt",
          margin: "0 0 0.65rem",
        }}
      >
        {judulLampiran}
      </p>

      {/* === Tabel daftar pegawai === */}
      <table
        className="lampiran-table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontSize: "10.5pt",
        }}
      >
        <thead>
          <tr>
            <th style={cellHeaderStyle("5%")}>No.</th>
            <th style={cellHeaderStyle(showDepartureColumn ? "32%" : "40%")}>Nama / NIP / NIPPPK</th>
            <th style={cellHeaderStyle(showDepartureColumn ? "23%" : "29%")}>Jabatan</th>
            {showDepartureColumn && (
              <th style={cellHeaderStyle("20%")}>Tempat Keberangkatan</th>
            )}
            <th style={cellHeaderStyle(showDepartureColumn ? "20%" : "26%")}>Tanggal</th>
          </tr>
        </thead>
        <tbody>
          {selectedEmployees.length === 0 ? (
            <tr>
              <td
                colSpan={showDepartureColumn ? 5 : 4}
                style={{ ...cellBodyStyle, textAlign: "center", fontStyle: "italic", color: "#999" }}
              >
                ( Belum ada pegawai dipilih )
              </td>
            </tr>
          ) : (
            selectedEmployees.map((emp, idx) => {
              const range =
                employeeDates[String(emp.id)] ||
                employeeDates[emp.id] || {
                  mulai: defaultTanggalMulai || "",
                  selesai: defaultTanggalSelesai || defaultTanggalMulai || "",
                };
              const namaLengkap = emp.nama_lengkap || emp.name || "";
              const isBuruh = isBuruhEmployee(emp);
              const formattedNip = isBuruh ? "" : formatNIP(emp.nip || "");
              const departure =
                employeeDepartures[String(emp.id)] ||
                employeeDepartures[emp.id] ||
                emp.kota_asal ||
                getEmployeeCity(emp, defaultKotaAsal) ||
                defaultKotaAsal ||
                "Samarinda";

              return (
                <tr key={emp.id}>
                  <td style={{ ...cellBodyStyle, textAlign: "center" }}>{idx + 1}.</td>
                  <td style={cellBodyStyle}>
                    <span style={{ fontWeight: "bold" }}>{namaLengkap}</span>
                    {!isBuruh && formattedNip && (
                      <>
                        <br />
                        <span style={{ whiteSpace: "nowrap" }}>{formatNipLabel(emp, true)} {formattedNip}</span>
                      </>
                    )}
                  </td>
                  <td style={cellBodyStyle}>{emp.jabatan || "-"}</td>
                  {showDepartureColumn && (
                    <td style={{ ...cellBodyStyle, textAlign: "center" }}>{departure}</td>
                  )}
                  <td style={{ ...cellBodyStyle, textAlign: "center", fontSize: "10pt" }}>
                    {renderDateRange(range.mulai, range.selesai)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* === TTD Kepala Balai (kanan, mengikuti posisi halaman 1) === */}
      <div
        className="lampiran-ttd"
        style={{
          marginTop: "1.6rem",
          marginLeft: "9.2cm",
          textAlign: "left",
        }}
      >
        <p style={{ margin: "0" }}>Kepala Balai,</p>
        <p
          className="ttd-placeholder"
          style={{
            margin: "14px 0 0",
            height: "105px",
            display: "flex",
            alignItems: "flex-start",
            paddingTop: "34px",
            paddingLeft: "1.35cm",
            boxSizing: "border-box",
            color: "#94a3b8",
            fontSize: "9pt",
          }}
        >
          ${"{ttd_pengirim}"}
        </p>
        <p style={{ margin: 0, fontWeight: "bold" }}>{kepalaBalai.name}</p>
        <p style={{ margin: 0 }}>{formatNipLabel(kepalaBalai, true)} {formatNIP(kepalaBalai.nip)}</p>
      </div>
    </div>
  );
}

const cellHeaderStyle = (width: string): React.CSSProperties => ({
  border: "1px solid #000",
  padding: "4px 5px",
  textAlign: "center",
  fontWeight: "bold",
  width,
  lineHeight: "1.2",
  boxSizing: "border-box",
});

const cellBodyStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 5px",
  verticalAlign: "middle",
  lineHeight: "1.25",
  overflowWrap: "break-word",
  boxSizing: "border-box",
};
