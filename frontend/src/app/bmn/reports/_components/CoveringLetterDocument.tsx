"use client";

import { toast } from "sonner";

export interface CoveringLetterItem {
  id?: string;
  title: string;
  quantity?: string | null;
  description?: string | null;
}

export interface CoveringLetterParty {
  name?: string | null;
  idType?: "NIP" | "NIK";
  nip?: string | null;
  role?: string | null;
}

export interface CoveringLetterDocumentProps {
  documentId?: string;
  number: string;
  regarding: string;
  documentDate: string;
  recipientTitle: string;
  recipientLocation: string;
  items: CoveringLetterItem[];
  closingPhrase: string;
  receivedDate?: string | null;
  showSignatures?: boolean;
  sender: CoveringLetterParty;
  receiver?: CoveringLetterParty | null;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function parseDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatIndonesianDate(value?: string | null): string {
  if (!value) return "";
  const date = parseDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function fallback(value?: string | number | null): string {
  const text = `${value ?? ""}`.trim();
  return text || "-";
}

function displayName(value?: string | null): string {
  const text = fallback(value);
  if (text === "-") return text;
  if (/[a-z]/.test(text)) return text;
  return text
    .toLocaleLowerCase("id-ID")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("id-ID"))
    .replace(/\bS\.hut\./gi, "S.Hut.")
    .replace(/\bM\.sc\./gi, "M.Sc.")
    .replace(/\bM\.t\./gi, "M.T.")
    .replace(/\bM\.p\./gi, "M.P.");
}

function signatureName(value?: string | null): string {
  const name = displayName(value);
  if (name === "-") return "";
  const [mainName, ...suffix] = name.split(",");
  const upperMain = mainName.trim().toLocaleUpperCase("id-ID");
  return suffix.length > 0 ? `${upperMain},${suffix.join(",")}` : upperMain;
}

function renderRoleLines(roleText?: string | null) {
  if (!roleText) return null;
  const lines = roleText.split("\n").map((l) => l.trim()).filter(Boolean);
  return (
    <div className="covering-sig-role">
      {lines.map((line, i) => (
        <p key={i}>
          <strong>{line}</strong>
        </p>
      ))}
    </div>
  );
}

export function handlePrintCoveringLetter(documentId = "covering-letter-print-root") {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Tidak ada dokumen Surat Pengantar untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Pengantar BMN</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.35; }
          p { margin: 0; }
          .covering-page { width: 210mm; margin: 0 auto; padding: 0 20mm 10mm; }
          .covering-header { margin: 0 -12mm; text-align: center; }
          .covering-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          
          .covering-meta-row { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 5mm; }
          .covering-meta-left { max-width: 120mm; }
          .covering-meta-right { text-align: right; min-width: 45mm; font-size: 10pt; }
          .covering-meta-item { display: grid; grid-template-columns: 18mm 4mm 1fr; align-items: flex-start; margin-bottom: 1.5mm; }
          .covering-meta-label { font-weight: normal; }
          .covering-meta-colon { text-align: center; }
          .covering-meta-val { text-align: left; word-break: break-word; line-height: 1.3; }

          .covering-recipient-block { margin-top: 6mm; margin-bottom: 5mm; }
          .covering-recipient-block p { margin-bottom: 0.5mm; }

          .covering-table { width: 100%; border-collapse: collapse; margin-top: 4mm; margin-bottom: 4mm; font-size: 9.5pt; }
          .covering-table th, .covering-table td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
          .covering-table th { font-weight: bold; background: transparent; text-align: center; }
          .covering-table tr { break-inside: avoid; page-break-inside: avoid; }

          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .covering-closing-block { margin-top: 4mm; }
          .covering-received-date { margin-top: 5mm; font-size: 10pt; }

          .covering-signatures { display: flex; justify-content: space-between; align-items: flex-start; gap: 20mm; margin-top: 6mm; text-align: left; }
          .covering-sig-left { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; max-width: 48%; }
          .covering-sig-right { display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: fit-content; max-width: 52%; }
          .covering-sig-role { min-height: 10mm; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-start; text-align: left; }
          .covering-sig-role p, .covering-sig-name, .covering-sig-id { white-space: nowrap; }
          .covering-sig-name { margin-top: 18mm; font-weight: bold; text-align: left; white-space: nowrap; }
          .covering-sig-id { white-space: nowrap; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function CoveringLetterDocument({
  documentId = "covering-letter-print-root",
  number,
  regarding,
  documentDate,
  recipientTitle,
  recipientLocation,
  items,
  closingPhrase,
  receivedDate,
  showSignatures = true,
  sender,
  receiver,
}: CoveringLetterDocumentProps) {
  return (
    <div id={documentId} className="covering-document-wrapper">
      <style jsx>{`
        .covering-document-wrapper {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          line-height: 1.35;
          font-size: 10pt;
          width: 100%;
        }
        .covering-page {
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 8mm 12mm 15mm;
          background: #fff;
          box-sizing: border-box;
          position: relative;
        }
        .covering-header {
          margin: 0 -6mm;
          text-align: center;
        }
        .covering-header img {
          width: 100%;
          max-width: 188mm;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        .covering-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 5mm;
          gap: 8px;
        }
        .covering-meta-left {
          flex: 1;
          min-width: 0;
        }
        .covering-meta-right {
          text-align: right;
          white-space: nowrap;
          font-size: 10pt;
        }
        .covering-meta-item {
          display: grid;
          grid-template-columns: 18mm 4mm 1fr;
          align-items: flex-start;
          margin-bottom: 1.5mm;
        }
        .covering-meta-label {
          font-weight: normal;
        }
        .covering-meta-colon {
          text-align: center;
        }
        .covering-meta-val {
          text-align: left;
          word-break: break-word;
          line-height: 1.3;
        }
        .covering-recipient-block {
          margin-top: 5mm;
          margin-bottom: 4mm;
        }
        .covering-recipient-block p {
          margin: 0 0 0.5mm 0;
        }
        .covering-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4mm;
          margin-bottom: 4mm;
          font-size: 9.5pt;
          table-layout: fixed;
        }
        .covering-table th,
        .covering-table td {
          border: 1px solid #000;
          padding: 5px 6px;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .covering-table th {
          font-weight: bold;
          text-align: center;
        }
        .avoid-break {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .covering-closing-block {
          margin-top: 4mm;
        }
        .covering-received-date {
          margin-top: 4mm;
          font-size: 10pt;
        }
        .covering-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-top: 6mm;
          text-align: left;
        }
        .covering-sig-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          width: fit-content;
          max-width: 48%;
        }
        .covering-sig-right {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          width: fit-content;
          max-width: 52%;
        }
        .covering-sig-role {
          min-height: 10mm;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          text-align: left;
        }
        .covering-sig-role p,
        .covering-sig-name,
        .covering-sig-id {
          white-space: nowrap;
        }
        .covering-sig-name {
          margin-top: 18mm;
          font-weight: bold;
          text-align: left;
          white-space: nowrap;
        }
        .covering-sig-id {
          white-space: nowrap;
        }
        @media print {
          .covering-document-wrapper {
            background: transparent;
          }
          .covering-page {
            box-shadow: none !important;
            margin: 0;
            padding: 0 20mm 10mm;
            width: 210mm !important;
            max-width: 210mm !important;
          }
          .covering-header {
            margin: 0 -12mm;
          }
          .covering-header img {
            width: 188mm;
            max-width: 188mm;
          }
          .covering-signatures {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20mm;
            text-align: left;
          }
          .covering-sig-left {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            width: fit-content;
          }
          .covering-sig-right {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
            width: fit-content;
          }
          .covering-sig-role p,
          .covering-sig-name,
          .covering-sig-id {
            white-space: nowrap;
          }
        }
      `}</style>

      <article className="covering-page shadow-xl ring-1 ring-zinc-200">
        <div className="covering-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/header-terbaru.png" alt="Kop Surat" />
        </div>

        <div className="covering-meta-row">
          <div className="covering-meta-left">
            <div className="covering-meta-item">
              <span className="covering-meta-label">Nomor</span>
              <span className="covering-meta-colon">:</span>
              <span className="covering-meta-val">{number || "PL.02.06/S-52/PW17.1/2026"}</span>
            </div>
            <div className="covering-meta-item">
              <span className="covering-meta-label">Hal</span>
              <span className="covering-meta-colon">:</span>
              <span className="covering-meta-val">
                {regarding || "Surat Pengantar Penyerahan Dokumen Permohonan Pengajuan Lelang dan Dokumen Pengumuman Lelang"}
              </span>
            </div>
          </div>
          <div className="covering-meta-right">
            <span>{formatIndonesianDate(documentDate)}</span>
          </div>
        </div>

        <div className="covering-recipient-block">
          <p>Yth. {recipientTitle || "Kepala Kantor Pelayanan Kekayaan Negara dan Lelang"}</p>
          <p>di {recipientLocation || "Samarinda"}</p>
        </div>

        <table className="covering-table">
          <thead style={{ display: "table-header-group" }}>
            <tr>
              <th style={{ width: "6%" }}>No.</th>
              <th style={{ width: "44%" }}>Berkas yang dikirim</th>
              <th style={{ width: "18%" }}>Banyaknya</th>
              <th style={{ width: "32%" }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", color: "#666", padding: "12px" }}>
                  Belum ada berkas ditambahkan.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id || index}>
                  <td style={{ textAlign: "center" }}>{index + 1}.</td>
                  <td style={{ textAlign: "left", whiteSpace: "pre-wrap" }}>{fallback(item.title)}</td>
                  <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>{fallback(item.quantity)}</td>
                  <td style={{ textAlign: "left" }}>{fallback(item.description)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="covering-closing-block avoid-break">
          <p style={{ marginTop: "4mm", textAlign: "justify" }}>
            {closingPhrase || "Demikian kami sampaikan, atas perhatian dan kerja sama yang baik kami mengucapkan terima kasih."}
          </p>

          {receivedDate && (
            <div className="covering-received-date">
              <span>Diterima tanggal &nbsp; : {formatIndonesianDate(receivedDate)}</span>
            </div>
          )}

          {showSignatures && (
            <div className="covering-signatures">
              <div className="covering-sig-left">
                {renderRoleLines(receiver?.role || "Penerima,\nPejabat Lelang")}
                <p className="covering-sig-name">{signatureName(receiver?.name)}</p>
                <p className="covering-sig-id">{receiver?.nip ? `${receiver?.idType === "NIK" ? "NIK." : "NIP."} ${receiver.nip}` : ""}</p>
              </div>

              <div className="covering-sig-right">
                {renderRoleLines(sender.role || "Pengirim,\nPenjual Lelang")}
                <p className="covering-sig-name">{signatureName(sender.name || "Heryanto Sumanbowo, S.Hut.")}</p>
                <p className="covering-sig-id">{sender?.nip ? `${sender?.idType === "NIK" ? "NIK." : "NIP."} ${sender.nip}` : ""}</p>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
