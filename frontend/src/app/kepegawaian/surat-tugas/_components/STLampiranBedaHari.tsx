"use client";

import { formatDateIndonesian, formatNIP } from "@/lib/letter-utils";

interface Employee {
  id: string;
  nama_lengkap: string;
  name?: string;
  nip: string;
  jabatan: string;
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
  kepalaBalai: { name: string; nip: string };
  judulLampiran?: string;
}

/**
 * Format range tanggal "DD - DD MMM YYYY" jika satu bulan,
 * "DD MMM - DD MMM YYYY" jika beda bulan/tahun.
 */
function formatDateRange(mulai: string, selesai: string): string {
  if (!mulai || !selesai) return "...";
  const start = new Date(mulai);
  const end = new Date(selesai);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "...";

  const sameMonth =
    start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    const startDay = start.getDate();
    const endFormatted = formatDateIndonesian(selesai);
    return `${startDay} – ${endFormatted}`;
  }
  if (sameYear) {
    const startShort = formatDateIndonesian(mulai).replace(/\s\d{4}$/, "");
    const endFormatted = formatDateIndonesian(selesai);
    return `${startShort} – ${endFormatted}`;
  }
  return `${formatDateIndonesian(mulai)} – ${formatDateIndonesian(selesai)}`;
}

export default function STLampiranBedaHari({
  stNumber,
  stCode,
  currentMonth,
  currentYear,
  tanggalSurat,
  selectedEmployees,
  employeeDates,
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
        marginLeft: "1.25cm",
        width: "calc(100% - 2.2cm)",
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
            <th style={cellHeaderStyle("40%")}>Nama/NIP</th>
            <th style={cellHeaderStyle("29%")}>Jabatan</th>
            <th style={cellHeaderStyle("26%")}>Tanggal</th>
          </tr>
        </thead>
        <tbody>
          {selectedEmployees.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ ...cellBodyStyle, textAlign: "center", fontStyle: "italic", color: "#999" }}>
                ( Belum ada pegawai dipilih )
              </td>
            </tr>
          ) : (
            selectedEmployees.map((emp, idx) => {
              const range = employeeDates[emp.id] || { mulai: "", selesai: "" };
              const namaLengkap = emp.nama_lengkap || emp.name || "";
              const formattedNip = formatNIP(emp.nip || "");
              const tanggalRange = formatDateRange(range.mulai, range.selesai);
              return (
                <tr key={emp.id}>
                  <td style={{ ...cellBodyStyle, textAlign: "center" }}>{idx + 1}.</td>
                  <td style={cellBodyStyle}>
                    <span style={{ fontWeight: "bold" }}>{namaLengkap}</span>
                    {formattedNip && (
                      <>
                        <br />
                        <span style={{ whiteSpace: "nowrap" }}>NIP. {formattedNip}</span>
                      </>
                    )}
                  </td>
                  <td style={cellBodyStyle}>{emp.jabatan || "-"}</td>
                  <td style={{ ...cellBodyStyle, whiteSpace: "nowrap", fontSize: "10pt" }}>{tanggalRange}</td>
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
        <p style={{ margin: 0 }}>NIP. {formatNIP(kepalaBalai.nip)}</p>
      </div>
    </div>
  );
}

const cellHeaderStyle = (width: string): React.CSSProperties => ({
  border: "1px solid #000",
  padding: "4px 6px",
  textAlign: "center",
  fontWeight: "bold",
  width,
  lineHeight: "1.2",
});

const cellBodyStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px 6px",
  verticalAlign: "middle",
  lineHeight: "1.2",
  overflowWrap: "break-word",
};
