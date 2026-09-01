"use client";

import { toast } from "sonner";
import { formatDateLong, parseDocDate } from "../_lib/auction-helpers";
import { runSkPagination } from "../_lib/sk-print";
import type {
  SkBuilderItem,
  SkKepalaBalai,
  SkMemutuskan,
} from "../_lib/sk-defaults";
import type { PanitiaAnggota } from "../_lib/sk-panitia-defaults";

interface SkPanitiaDocumentProps {
  skNumber: string;
  skKap: string;
  date?: string;
  menimbang: SkBuilderItem[];
  mengingat: SkBuilderItem[];
  memutuskan: SkMemutuskan;
  kepalaBalai: SkKepalaBalai;
  tembusan: SkBuilderItem[];
  susunanPanitia: PanitiaAnggota[];
}

function renderKeduaText(text: string) {
  return text.split("\n").filter((line) => line.trim().length > 0).map((line, index) => {
    const trimmedLine = line.trim();
    const subItemMatch = trimmedLine.match(/^([a-z]\.)\s+(.*)$/i);
    const numberedItemMatch = trimmedLine.match(/^(\d+\.)\s+(.*)$/);

    if (subItemMatch) {
      return (
        <div className="skp-kedua-item skp-kedua-subitem" key={`${trimmedLine}-${index}`}>
          <span className="skp-kedua-marker">{subItemMatch[1]}</span>
          <span className="skp-kedua-item-text">{subItemMatch[2]}</span>
        </div>
      );
    }

    if (numberedItemMatch) {
      return (
        <div className="skp-kedua-item" key={`${trimmedLine}-${index}`}>
          <span className="skp-kedua-marker">{numberedItemMatch[1]}</span>
          <span className="skp-kedua-item-text">{numberedItemMatch[2]}</span>
        </div>
      );
    }

    return (
      <div className="skp-kedua-line" key={`${trimmedLine}-${index}`}>
        {trimmedLine}
      </div>
    );
  });
}

export function handlePrintSkPanitia() {
  const printContent = document.getElementById("sk-panitia-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen SK Panitia untuk dicetak.");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>SK Panitia Penghapusan BMN</title>
        <style>
          @page { size: A4; margin: 0; }
          @page skp-main { size: A4; margin: 0; }
          @page skp-main:first { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: white; color: black;
            font-family: 'Bookman Old Style', Georgia, serif;
            font-size: 11pt; line-height: 1.25;
          }
          p { margin: 0; padding: 0; }
          .skp-page {
            width: 210mm;
            margin: 0 auto; padding: 5mm 20mm 0;
          }
          .skp-main-document { page: skp-main; position: relative; }
          .skp-print-root .skp-page.skp-main-document.skp-main-paginated {
            height: 297mm !important;
            min-height: 297mm !important;
            padding: 5mm 20mm 28mm !important;
            overflow: hidden !important;
            position: relative !important;
            box-shadow: none !important;
          }
          .skp-print-root .skp-page.skp-main-document.skp-main-paginated.skp-main-continuation-page {
            padding-top: 18mm !important;
          }
          .skp-print-root .skp-main-document.skp-main-page-break {
            page-break-after: always;
            break-after: page;
          }
          .skp-main-flow { width: 100%; }
          .skp-main-paginated .skp-paginated-field-section + .skp-paginated-field-section { margin-top: 0 !important; }
          .skp-main-paginated .skp-paginated-field-section.skp-section-start { margin-top: 0.5rem !important; }
          .skp-page-ttd { padding-bottom: 0; }
          article { margin: 0; }
          .skp-page-break { page-break-after: always; break-after: always; }
          /* KOP */
          .skp-kop {
            margin-top: -5mm; margin-left: -16mm; margin-right: -16mm;
            margin-bottom: 6px; text-align: center;
          }
          .skp-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
          /* Judul SK */
          .skp-title {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 10px; text-align: center; font-weight: bold; line-height: 1.3;
          }
          .skp-title-nomor { font-weight: normal; }
          .skp-title-tentang { margin-top: 10px; }
          /* Sub-judul */
          .skp-subtitle {
            width: 166mm; margin-left: auto; margin-right: auto;
            margin-top: 16px;
          }
          .skp-subtitle > p { text-align: center; font-weight: bold; }
          .skp-subtitle > p + p { margin-top: 6px; }
          /* Body */
          .skp-body { width: 166mm; margin-left: auto; margin-right: auto; }
          table { border-collapse: collapse; width: 100%; }
          td { vertical-align: top; padding: 0; }
          /* Menimbang/Mengingat */
          .skp-field-section {
            display: grid;
            grid-template-columns: 28mm 8mm minmax(0, 1fr);
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .skp-field-section + .skp-field-section { margin-top: 0.5rem; }
          .skp-field-label, .skp-field-colon { padding: 0; }
          .skp-field-colon { text-align: center; }
          .skp-mengingat-list {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .skp-mengingat-item {
            display: grid;
            grid-template-columns: 9mm minmax(0, 1fr);
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            padding-top: 0;
          }
          .skp-mengingat-item:first-child { padding-top: 0; }
          .skp-mengingat-text { text-align: justify; }
          /* Memutuskan */
          .skp-memutuskan { text-align: center; font-weight: bold; margin-bottom: 8px; }
          /* TTD block */
          .skp-ttd { width: 20rem; margin-left: auto; margin-top: 1.25rem; }
          .skp-ttd, .skp-ttd p { font-weight: normal !important; text-align: left !important; }
          .skp-ttd p { margin: 0; padding: 0; line-height: 1.25; }
          .skp-ttd-meta { display: grid !important; grid-template-columns: max-content auto 1fr; column-gap: 0.4rem; line-height: 1.3; }
          .skp-ttd-meta span { font-weight: normal !important; text-align: left !important; }
          .skp-ketiga-group { break-inside: avoid !important; page-break-inside: avoid !important; }
          .skp-signature-name { font-weight: normal !important; }
          .skp-ttd-placeholder { height: 84px; color: #94a3b8; font-weight: normal !important; text-align: left !important; display: flex !important; align-items: center !important; padding-top: 0px !important; padding-left: 1.1cm !important; margin-top: 0.5rem; margin-bottom: 0.5rem; }
          .skp-continuation-word { position: absolute; right: 23mm; bottom: 31mm; width: 163mm; height: 0; line-height: 11pt; overflow: visible; white-space: nowrap; text-align: right !important; margin: 0; padding: 0; font-weight: normal !important; font-size: 11pt; z-index: 20; }
          /* Tembusan */
          .skp-tembusan { margin-top: 1rem; }
          .skp-tembusan, .skp-tembusan p { font-weight: normal !important; text-align: left !important; }
          .skp-tembusan p { margin: 0; padding: 0; line-height: 1.3; }
          /* pre-wrap for KEDUA */
          .skp-kedua-text { display: grid; row-gap: 0; white-space: normal; }
          .skp-kedua-line { text-align: justify; }
          .skp-kedua-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); column-gap: 0; text-align: left; }
          .skp-kedua-subitem { margin-left: 8mm; }
          .skp-kedua-marker { text-align: left; }
          .skp-kedua-item-text { text-align: justify; }
          /* Lampiran */
          .skp-lampiran {
            width: 210mm;
            margin: 0 auto;
            padding: 12mm 20mm 28mm;
            page-break-before: always;
            break-before: page;
          }
          .skp-attachment-meta { width: 109mm; margin-left: auto; text-align: left; }
          .skp-attachment-meta .meta-row { display: grid; grid-template-columns: 24mm 5mm minmax(0, 1fr); align-items: start; }
          .skp-attachment-meta .meta-label { white-space: nowrap; }
          .skp-attachment-meta .meta-colon { text-align: center; }
          .skp-lampiran-title { text-align: center; font-weight: bold; line-height: 1.3; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .skp-panitia-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .skp-panitia-table th, .skp-panitia-table td { border: 1px solid #000; padding: 0.5rem; }
          .skp-panitia-table td { vertical-align: middle; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(
    () =>
      runSkPagination(printWindow, {
        prefix: "skp",
        sectionStartMarginTop: "0.5rem",
        decisionRowLabels: ["KESATU.....", "KEDUA....."],
        finalGroupClass: "skp-ketiga-group",
        finalGroupLabel: "KETIGA.....",
      }),
    600,
  );
}


export function SkPanitiaDocument({
  skNumber,
  skKap,
  date,
  menimbang,
  mengingat,
  memutuskan,
  kepalaBalai,
  tembusan,
  susunanPanitia,
}: SkPanitiaDocumentProps) {
  const docDate = parseDocDate(date);
  const month = String(docDate.getMonth() + 1).padStart(2, "0");
  const skNumberText = `SK.${skNumber.trim() || "____"}/K.18/TU/${skKap.trim() || "KAP.06.01"}/B/${month}/${docDate.getFullYear()}`;

  const mengingatTexts = mengingat.map((m) => m.text);

  const pageStyle: React.CSSProperties = {
    fontFamily: "'Bookman Old Style', Georgia, serif",
    fontSize: "11pt",
    lineHeight: "1.25",
  };

  return (
    <div id="sk-panitia-print-root" className="skp-print-root">
      <style jsx global>{`
        .skp-print-root .skp-page {
          width: 210mm;
          margin-left: auto;
          margin-right: auto;
          box-sizing: border-box;
        }
        .skp-print-root .skp-main-document {
          padding: 5mm 20mm 0 !important;
        }
        .skp-print-root .skp-kop {
          margin-top: -5mm;
          margin-left: -16mm;
          margin-right: -16mm;
          margin-bottom: 4px;
          text-align: center;
        }
        .skp-print-root .skp-kop img {
          width: 196mm !important;
          max-width: 196mm !important;
          height: auto !important;
          display: block;
          margin: 0 auto;
        }
        .skp-print-root .skp-title,
        .skp-print-root .skp-subtitle,
        .skp-print-root .skp-body {
          width: 166mm;
          margin-left: auto;
          margin-right: auto;
        }
        .skp-print-root .skp-title {
          margin-top: 10px;
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
        }
        .skp-print-root .skp-title-nomor {
          font-weight: normal;
        }
        .skp-print-root .skp-title-tentang {
          margin-top: 10px;
        }
        .skp-print-root .skp-subtitle {
          margin-top: 16px;
        }
        .skp-print-root .skp-subtitle > p {
          text-align: center;
          font-weight: bold;
        }
        .skp-print-root .skp-subtitle > p + p {
          margin-top: 6px;
        }
        .skp-print-root p {
          margin: 0;
          padding: 0;
        }
        .skp-print-root table {
          border-collapse: collapse;
          width: 100%;
        }
        .skp-print-root td {
          vertical-align: top;
          padding: 0;
        }
        .skp-print-root .skp-field-section {
          display: grid;
          grid-template-columns: 28mm 8mm minmax(0, 1fr);
          break-inside: auto;
          page-break-inside: auto;
        }
        .skp-print-root .skp-field-section + .skp-field-section {
          margin-top: 0.5rem;
        }
        .skp-print-root .skp-field-colon {
          text-align: center;
        }
        .skp-print-root .skp-mengingat-list {
          break-inside: auto;
          page-break-inside: auto;
        }
        .skp-print-root .skp-mengingat-item {
          display: grid;
          grid-template-columns: 9mm minmax(0, 1fr);
          break-inside: avoid;
          page-break-inside: avoid;
          padding-top: 0;
        }
        .skp-print-root .skp-mengingat-item:first-child {
          padding-top: 0;
        }
        .skp-print-root .skp-mengingat-text {
          text-align: justify;
        }
        .skp-print-root .skp-memutuskan {
          text-align: center;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .skp-print-root .skp-continuation-word {
          text-align: right !important;
          margin-top: 0.5rem;
          font-weight: normal !important;
        }
        .skp-print-root .skp-ttd {
          width: 20rem;
          margin-left: auto;
          margin-top: 1.25rem;
        }
        .skp-print-root .skp-ttd,
        .skp-print-root .skp-ttd p,
        .skp-print-root .skp-tembusan,
        .skp-print-root .skp-tembusan p {
          font-weight: normal !important;
          text-align: left !important;
        }
        .skp-print-root .skp-ttd p,
        .skp-print-root .skp-tembusan p {
          margin: 0;
          padding: 0;
        }
        .skp-print-root .skp-signature-name {
          font-weight: normal !important;
        }
        .skp-print-root .skp-ttd-placeholder {
          box-sizing: border-box;
          height: 84px;
          color: #94a3b8;
          font-weight: normal !important;
          text-align: left !important;
          display: flex !important;
          align-items: center !important;
          padding-top: 0px !important;
          padding-left: 1.1cm !important;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .skp-print-root .skp-tembusan {
          margin-top: 1rem;
        }
        .skp-print-root .skp-tembusan p {
          line-height: 1.3;
        }
        .skp-print-root .skp-kedua-text {
          display: grid;
          row-gap: 0;
          white-space: normal;
        }
        .skp-print-root .skp-kedua-line {
          text-align: justify;
        }
        .skp-print-root .skp-kedua-item {
          display: grid;
          grid-template-columns: 7mm minmax(0, 1fr);
          column-gap: 0;
          text-align: left;
        }
        .skp-print-root .skp-kedua-subitem {
          margin-left: 8mm;
        }
        .skp-print-root .skp-kedua-marker {
          text-align: left;
        }
        .skp-print-root .skp-kedua-item-text {
          text-align: justify;
        }
        .skp-print-root .skp-lampiran {
          page-break-before: always;
          break-before: page;
        }
        .skp-print-root .skp-attachment-meta {
          width: 109mm;
          margin-left: auto;
          text-align: left;
        }
        .skp-print-root .skp-attachment-meta .meta-row {
          display: grid;
          grid-template-columns: 24mm 5mm minmax(0, 1fr);
          align-items: start;
        }
        .skp-print-root .skp-attachment-meta .meta-label {
          white-space: nowrap;
        }
        .skp-print-root .skp-attachment-meta .meta-colon {
          text-align: center;
        }
        .skp-print-root .skp-lampiran-title {
          text-align: center;
          font-weight: bold;
          line-height: 1.3;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .skp-print-root .skp-panitia-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .skp-print-root .skp-panitia-table th, .skp-print-root .skp-panitia-table td { border: 1px solid #000; padding: 0.5rem; }
        .skp-print-root .skp-panitia-table td { vertical-align: middle; }
      `}</style>

      {/* ── HALAMAN SK PANITIA: KOP + Judul + Menimbang + Mengingat + MEMUTUSKAN + TTD + Tembusan ── */}
      <article
        className="skp-page skp-page-ttd skp-main-document mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="skp-kop" style={{ marginTop: "-5mm", marginLeft: "-16mm", marginRight: "-16mm", marginBottom: "4px", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/new-header.png" alt="Kop Surat" style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }} />
        </div>

        <div className="skp-title mx-auto mt-3 w-[166mm] text-center font-bold leading-snug">
          <p className="m-0">KEPUTUSAN KEPALA BALAI</p>
          <p className="m-0">KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
          <p className="skp-title-nomor m-0 font-normal">Nomor : {skNumberText}</p>
          <p className="skp-title-tentang m-0 mt-2">TENTANG</p>
          <p className="m-0">PANITIA PENGHAPUSAN BARANG MILIK NEGARA</p>
          <p className="m-0">BERUPA ALAT ANGKUTAN BERMOTOR</p>
          <p className="m-0">PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
        </div>

        <div className="skp-subtitle skp-body mx-auto mt-3 w-[166mm]">
          <p className="text-center font-bold">DENGAN RAHMAT TUHAN YANG MAHA ESA</p>
          <p className="mt-2 text-center font-bold">
            KEPALA BALAI<br />
            KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,
          </p>

          {/* Menimbang + Mengingat */}
          <div className="mt-2">\n            <div className="skp-field-section">
              <div className="skp-field-label">Menimbang</div>
              <div className="skp-field-colon">:</div>
              <div className="skp-mengingat-list">
                {menimbang.map((item, i) => (
                  <div
                    className="skp-mengingat-item"
                    key={item.id}
                    style={i === 0 ? undefined : { paddingTop: "0.15rem" }}
                  >
                    <div>{String.fromCharCode(97 + i)}.</div>
                    <div className="skp-mengingat-text">{item.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="skp-field-section">
              <div className="skp-field-label">Mengingat</div>
              <div className="skp-field-colon">:</div>
              <div className="skp-mengingat-list">
                {mengingatTexts.map((item, i) => (
                  <div className="skp-mengingat-item" key={i}>
                    <div>{i + 1}.</div>
                    <div className="skp-mengingat-text">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* MEMUTUSKAN */}
          <p className="skp-memutuskan text-center font-bold" style={{ marginTop: "0.75rem" }}>MEMUTUSKAN</p>

          <table className="skp-mengingat-table mt-4 w-full" style={{ borderCollapse: "collapse" }}>
            <tbody>
              <tr className="skp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top" }}>Menetapkan</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top" }}>:</td>
                <td style={{ verticalAlign: "top", textTransform: "uppercase", textAlign: "justify", fontWeight: "bold" }}>
                  {memutuskan.menetapkan}
                </td>
              </tr>
              <tr className="skp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KESATU</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                  {memutuskan.kesatu}
                </td>
              </tr>
              <tr className="skp-mengingat-row">
                <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KEDUA</td>
                <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                  <div className="skp-kedua-text">{renderKeduaText(memutuskan.kedua)}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* KETIGA + TTD + Tembusan grouped */}
          <div className="skp-ketiga-group">
            <table className="skp-mengingat-table mt-0 w-full" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr className="skp-mengingat-row">
                  <td style={{ width: "28mm", verticalAlign: "top", paddingTop: "0.4rem" }}>KETIGA</td>
                  <td style={{ width: "8mm", textAlign: "center", verticalAlign: "top", paddingTop: "0.4rem" }}>:</td>
                  <td style={{ verticalAlign: "top", paddingTop: "0.4rem", textAlign: "justify" }}>
                    {memutuskan.ketiga}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TTD */}
            <div className="skp-ttd signature mt-4 ml-auto w-80">
              <div className="skp-ttd-meta" style={{ display: "grid", gridTemplateColumns: "max-content auto 1fr", columnGap: "0.4rem" }}>
                <span>Ditetapkan di</span>
                <span>:</span>
                <span>Samarinda</span>
                <span>Pada tanggal</span>
                <span>:</span>
                <span>{formatDateLong(docDate)}</span>
              </div>
              <p className="m-0 mt-3">Kepala Balai,</p>
              <div className="skp-ttd-placeholder my-2 flex h-[84px] items-center pt-0 pl-[1.1cm] box-border text-zinc-400">${"{ttd_pengirim}"}</div>
              <p className="skp-signature-name m-0 mt-2">{kepalaBalai.nama}</p>
              <p className="m-0">NIP. {kepalaBalai.nip}</p>
            </div>

            {/* Tembusan */}
            {tembusan.length > 0 && (
              <div className="skp-tembusan mt-4">
                <p className="m-0">Tembusan :</p>
                {tembusan.length === 1 ? (
                  <p className="m-0">{tembusan[0].text}</p>
                ) : (
                  tembusan.map((item, i) => (
                    <p key={item.id} className="m-0">{i + 1}.&nbsp; {item.text}</p>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* ── HALAMAN LAMPIRAN: Susunan Panitia ── */}
      <article
        className="skp-page skp-lampiran mx-auto max-w-[210mm] bg-white px-24 py-9 text-black shadow-xl ring-1 ring-zinc-200"
        style={pageStyle}
      >
        <div className="skp-body mx-auto w-[166mm]">
          {/* Meta header */}
          <div className="skp-attachment-meta ml-auto w-[109mm]">
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span>Lampiran</span><span>:</span><span>Surat Keputusan Kepala Balai KSDA Kalimantan Timur</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span>Nomor</span><span>:</span><span>{skNumberText}</span>
            </div>
            <div className="meta-row grid grid-cols-[24mm_5mm_minmax(0,1fr)]">
              <span>Tanggal</span><span>:</span><span>{formatDateLong(docDate)}</span>
            </div>
          </div>

          {/* Title */}
          <p className="skp-lampiran-title mt-6 text-center font-bold leading-snug">
            PANITIA PENGHAPUSAN BARANG MILIK NEGARA<br />
            BERUPA ALAT ANGKUTAN BERMOTOR<br />
            PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
          </p>

          {/* Susunan Panitia table */}
          <table className="skp-panitia-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "2rem", fontSize: "10pt" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid black", padding: "0.5rem", width: "8mm", textAlign: "center" }}>No.</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center" }}>Nama/NIP/Jabatan</th>
                <th style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center" }}>Jabatan dalam Kegiatan</th>
              </tr>
            </thead>
            <tbody>
              {susunanPanitia.map((item, index) => (
                <tr key={item.id}>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{index + 1}.</td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", verticalAlign: "middle" }}>
                    {item.nama}<br/>
                    NIP. {item.nip}<br/>
                    {item.jabatanInstansi.split("\n").map((line, lineIndex) => (
                      <span key={`${item.id}-jabatan-${lineIndex}`}>
                        {lineIndex > 0 && <br />}
                        {line}
                      </span>
                    ))}
                  </td>
                  <td style={{ border: "1px solid black", padding: "0.5rem", textAlign: "center", verticalAlign: "middle" }}>{item.jabatanKegiatan}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TTD */}
          <div className="skp-ttd signature mt-16 ml-auto w-80">
            <p className="m-0">Kepala Balai,</p>
            <div className="skp-ttd-placeholder my-2 flex h-[84px] items-center pt-0 pl-[1.1cm] box-border text-zinc-400">${"{ttd_pengirim}"}</div>
            <p className="skp-signature-name m-0 mt-2">{kepalaBalai.nama}</p>
            <p className="m-0">NIP. {kepalaBalai.nip}</p>
          </div>
        </div>
      </article>
    </div>
  );
}




