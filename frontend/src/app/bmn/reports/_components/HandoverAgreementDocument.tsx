"use client";

import { toast } from "sonner";

export type HandoverVariant = "general_goods" | "vehicle";

export interface HandoverParty {
  name: string;
  nip?: string | null;
  rank?: string | null;
  position?: string | null;
  address?: string | null;
}

export interface HandoverWitness {
  name?: string | null;
  nip?: string | null;
  position?: string | null;
  label?: string | null;
}

export interface HandoverItem {
  asset_id?: string | null;
  name?: string | null;
  quantity?: number | null;
  nup?: string | null;
  vehicle_type?: string | null;
  merk_tipe?: string | null;
  no_polisi?: string | null;
  no_mesin?: string | null;
  no_rangka?: string | null;
}

interface HandoverAgreementDocumentProps {
  documentId?: string;
  variant: HandoverVariant;
  title: string;
  number: string;
  documentDate: string;
  firstParty: HandoverParty;
  secondParty: HandoverParty;
  items: HandoverItem[];
  description?: string;
}

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const SMALL_NUMBERS = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function spellNumber(value: number): string {
  if (value < 12) return SMALL_NUMBERS[value];
  if (value < 20) return `${spellNumber(value - 10)} Belas`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    return `${spellNumber(tens)} Puluh${rest ? ` ${spellNumber(rest)}` : ""}`;
  }
  if (value < 200) return `Seratus${value > 100 ? ` ${spellNumber(value - 100)}` : ""}`;
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    return `${spellNumber(hundreds)} Ratus${rest ? ` ${spellNumber(rest)}` : ""}`;
  }
  if (value < 2000) return `Seribu${value > 1000 ? ` ${spellNumber(value - 1000)}` : ""}`;
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  return `${spellNumber(thousands)} Ribu${rest ? ` ${spellNumber(rest)}` : ""}`;
}

function parseDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatSpelledDate(value: string) {
  const date = parseDate(value);
  return {
    day: DAYS[date.getDay()],
    dateText: spellNumber(date.getDate()),
    month: MONTHS[date.getMonth()],
    yearText: spellNumber(date.getFullYear()),
  };
}

function fallback(value?: string | number | null) {
  const text = `${value ?? ""}`.trim();
  return text || "-";
}

function dataCell(value?: string | number | null) {
  const text = fallback(value);
  return <td className={text === "-" ? "handover-cell-center" : "handover-cell-left"}>{text}</td>;
}

function displayName(value?: string | null) {
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

function signatureName(value?: string | null) {
  const name = displayName(value);
  if (name === "-") return name;
  const [mainName, ...suffix] = name.split(",");
  const upperMain = mainName.trim().toLocaleUpperCase("id-ID");
  return suffix.length > 0 ? `${upperMain},${suffix.join(",")}` : upperMain;
}

export function handlePrintHandoverAgreement(documentId = "ba-serah-terima-print-root") {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Tidak ada dokumen BA Serah Terima untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>BA Serah Terima BMN</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.22; }
          p { margin: 0; }
          .handover-page { width: 210mm; margin: 0 auto; padding: 0 20mm 10mm; }
          .handover-header { margin: 0 -12mm; text-align: center; }
          .handover-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          .handover-title { margin-top: 5mm; text-align: center; font-weight: 700; }
          .handover-body { margin-top: 5mm; text-align: justify; }
          .handover-party { display: grid; grid-template-columns: 7mm 1fr; column-gap: 4mm; margin: 4mm 0; }
          .handover-rows { display: grid; grid-template-columns: 26mm 5mm minmax(0, 1fr); }
          .handover-colon { text-align: center; }
          .handover-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm; font-size: 8.4pt; text-align: center; }
          .handover-table th, .handover-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
          .handover-table td.handover-cell-left { text-align: left; }
          .handover-table td.handover-cell-center { text-align: center; }
          .handover-table thead tr.table-number-row th { font-weight: 400; padding: 1px 0; font-size: 8.4pt; }
          .handover-table tr { break-inside: avoid; page-break-inside: avoid; }
          .handover-signature-block { break-inside: avoid; page-break-inside: avoid; padding-top: 15mm; margin-top: 2mm; }
          .handover-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; margin-top: 5mm; }
          .handover-signature-name { margin-top: 22mm; font-weight: 700; }
          .page-continuation-spacer { height: 15mm; page-break-before: always; break-before: page; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

function PartyBlock({ index, party, label }: { index: number; party: HandoverParty; label: string }) {
  return (
    <div className="handover-party">
      <div>{index}</div>
      <div>
        <div className="handover-rows"><span>Nama</span><span className="handover-colon">:</span><span>{displayName(party.name)}</span></div>
        <div className="handover-rows"><span>NIP</span><span className="handover-colon">:</span><span>{fallback(party.nip)}</span></div>
        <div className="handover-rows"><span>Jabatan</span><span className="handover-colon">:</span><span>{fallback(party.position)}</span></div>
        <div className="handover-rows"><span>Alamat</span><span className="handover-colon">:</span><span>{fallback(party.address)}</span></div>
        <p>Selanjutnya disebut <strong>{label}</strong></p>
      </div>
    </div>
  );
}

export function HandoverAgreementDocument({
  documentId = "ba-serah-terima-print-root",
  variant,
  title,
  number,
  documentDate,
  firstParty,
  secondParty,
  items,
  description,
}: HandoverAgreementDocumentProps) {
  const { day, dateText, month, yearText } = formatSpelledDate(documentDate);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const itemCountText = `${itemCount} (${spellNumber(itemCount).toLocaleLowerCase("id-ID")})`;
  const itemDescription = (description || (variant === "vehicle" ? "kendaraan" : "barang")).trim();

  // Dynamic pagination threshold
  const PAGE_1_MAX_ITEMS = 17;
  const isMultiPage = items.length > PAGE_1_MAX_ITEMS;
  const page1Items = isMultiPage ? items.slice(0, PAGE_1_MAX_ITEMS) : items;
  const page2Items = isMultiPage ? items.slice(PAGE_1_MAX_ITEMS) : [];

  return (
    <div id={documentId}>
      <style jsx global>{`
        .handover-preview .handover-page { width: 210mm; max-width: 100%; margin: 0 auto; padding: 5mm 20mm 10mm; background: white; color: black; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.22; }
        .handover-preview p { margin: 0; }
        .handover-preview .handover-header { margin: 0 -12mm; text-align: center; }
        .handover-preview .handover-header img { width: 188mm; max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .handover-preview .handover-title { margin-top: 5mm; text-align: center; font-weight: 700; }
        .handover-preview .handover-body { margin-top: 5mm; text-align: justify; }
        .handover-preview .handover-party { display: grid; grid-template-columns: 7mm 1fr; column-gap: 4mm; margin: 4mm 0; }
        .handover-preview .handover-rows { display: grid; grid-template-columns: 26mm 5mm minmax(0, 1fr); }
        .handover-preview .handover-colon { text-align: center; }
        .handover-preview .handover-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm; font-size: 8.4pt; text-align: center; }
        .handover-preview .handover-table th,
        .handover-preview .handover-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
        .handover-preview .handover-table td.handover-cell-left { text-align: left; }
        .handover-preview .handover-table td.handover-cell-center { text-align: center; }
        .handover-preview .handover-table thead tr.table-number-row th { font-weight: 400; padding: 1px 0; font-size: 8.4pt; }
        .handover-preview .handover-table tr { break-inside: avoid; page-break-inside: avoid; }
        .handover-preview .handover-signature-block { break-inside: avoid; page-break-inside: avoid; padding-top: 15mm; margin-top: 2mm; }
        .handover-preview .handover-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; margin-top: 5mm; }
        .handover-preview .handover-signature-name { margin-top: 22mm; font-weight: 700; }
        .handover-preview .page-continuation-spacer { height: 15mm; page-break-before: always; break-before: page; }
        @media print {
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          body * { visibility: hidden; }
          #ba-serah-terima-print-root, #ba-serah-terima-print-root * { visibility: visible; }
          #ba-serah-terima-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; }
          .handover-page { box-shadow: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="handover-preview">
        <article className="handover-page shadow-xl ring-1 ring-zinc-200">
          <div className="handover-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/header-terbaru.png" alt="Kop Surat" />
          </div>

          <div className="handover-title">
            <p>{title.toLocaleUpperCase("id-ID")}</p>
            <p>NOMOR : {number || "BA.___/K.18/TU/KAP.03.02/B/__/____"}</p>
          </div>

          <div className="handover-body">
            <p>Pada hari ini {day} tanggal {dateText} bulan {month} tahun {yearText}, yang bertanda tangan di bawah ini:</p>
            <PartyBlock index={1} party={firstParty} label="PIHAK KESATU" />
            <PartyBlock index={2} party={secondParty} label="PIHAK KEDUA" />

            <p><strong>PIHAK KESATU</strong> telah menyerahkan barang kepada <strong>PIHAK KEDUA</strong> berupa {itemCountText} unit {itemDescription} sebagai berikut:</p>

            {/* Page 1 Table */}
            {variant === "vehicle" ? (
              <table className="handover-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "16%" }} />
                </colgroup>
                <thead>
                  <tr><th>No</th><th>Jenis Kendaraan</th><th>Merk / Tipe</th><th>No. Polisi</th><th>No. Mesin</th><th>No. Rangka</th></tr>
                </thead>
                <tbody>
                  {page1Items.map((item, index) => (
                    <tr key={`${item.vehicle_type}-${index}`}>
                      <td>{index + 1}</td>
                      {dataCell(item.vehicle_type)}
                      {dataCell(item.merk_tipe)}
                      {dataCell(item.no_polisi)}
                      {dataCell(item.no_mesin)}
                      {dataCell(item.no_rangka)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="handover-table">
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "62%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "15%" }} />
                </colgroup>
                <thead>
                  <tr><th>No</th><th>Nama Barang</th><th>Jumlah</th><th>NUP</th></tr>
                </thead>
                <tbody>
                  {page1Items.map((item, index) => (
                    <tr key={`${item.name}-${index}`}>
                      <td>{index + 1}</td>
                      {dataCell(item.name)}
                      {dataCell(item.quantity)}
                      {dataCell(item.nup)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Page 2 Table (if multi-page) */}
            {isMultiPage && (
              <>
                <div className="page-continuation-spacer" />
                {variant === "vehicle" ? (
                  <table className="handover-table">
                    <colgroup>
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "24%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "16%" }} />
                    </colgroup>
                    <thead>
                      <tr className="table-number-row"><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th></tr>
                      <tr><th>No</th><th>Jenis Kendaraan</th><th>Merk / Tipe</th><th>No. Polisi</th><th>No. Mesin</th><th>No. Rangka</th></tr>
                    </thead>
                    <tbody>
                      {page2Items.map((item, index) => (
                        <tr key={`${item.vehicle_type}-${index}`}>
                          <td>{PAGE_1_MAX_ITEMS + index + 1}</td>
                          {dataCell(item.vehicle_type)}
                          {dataCell(item.merk_tipe)}
                          {dataCell(item.no_polisi)}
                          {dataCell(item.no_mesin)}
                          {dataCell(item.no_rangka)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="handover-table">
                    <colgroup>
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "62%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <thead>
                      <tr className="table-number-row"><th>1</th><th>2</th><th>3</th><th>4</th></tr>
                      <tr><th>No</th><th>Nama Barang</th><th>Jumlah</th><th>NUP</th></tr>
                    </thead>
                    <tbody>
                      {page2Items.map((item, index) => (
                        <tr key={`${item.name}-${index}`}>
                          <td>{PAGE_1_MAX_ITEMS + index + 1}</td>
                          {dataCell(item.name)}
                          {dataCell(item.quantity)}
                          {dataCell(item.nup)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            <p style={{ marginTop: "3mm" }}><strong>PIHAK KEDUA</strong> telah menerima barang tersebut dalam keadaan baik dan dapat dipergunakan dengan baik, dengan diserahkan barang tersebut dari <strong>PIHAK KESATU</strong> kepada <strong>PIHAK KEDUA</strong>, maka pengelolaan barang tersebut menjadi tanggung jawab <strong>PIHAK KEDUA</strong>.</p>

            {/* Signature Block (Always keeps closing text TOGETHER with signatures) */}
            <div className="handover-signature-block avoid-break">
              <p style={{ marginTop: "4mm" }}>Demikian Berita Acara Serah Terima Barang ini dibuat dengan sebenarnya, ditandatangani masing-masing kedua belah pihak pada tanggal tersebut di atas untuk dipergunakan sebagaimana mestinya.</p>
              <div className="handover-signatures">
                <div>
                  <p>PIHAK KEDUA</p>
                  <p className="handover-signature-name">{signatureName(secondParty.name)}</p>
                  <p>NIP. {fallback(secondParty.nip)}</p>
                </div>
                <div>
                  <p>PIHAK KESATU</p>
                  <p className="handover-signature-name">{signatureName(firstParty.name)}</p>
                  <p>NIP. {fallback(firstParty.nip)}</p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
