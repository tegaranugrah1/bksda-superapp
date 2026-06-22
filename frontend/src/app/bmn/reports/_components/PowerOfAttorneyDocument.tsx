"use client";

import { toast } from "sonner";

export interface PowerOfAttorneyAsset {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  merk_tipe?: string | null;
  merk?: string | null;
  tipe?: string | null;
  no_polisi?: string | null;
  no_rangka?: string | null;
  no_mesin?: string | null;
  stnk_document?: {
    path: string;
    mime: string;
    original_name: string;
    preview_path: string | null;
    url: string;
    download_url: string;
    preview_url: string | null;
    preview_urls: string[];
  } | null;
}

export interface PowerOfAttorneyParty {
  name: string;
  nip?: string | null;
  rank?: string | null;
  position?: string | null;
  address?: string | null;
}

interface PowerOfAttorneyDocumentProps {
  documentId?: string;
  number: string;
  documentDate: string;
  firstParty: PowerOfAttorneyParty;
  secondParty: PowerOfAttorneyParty;
  assets: PowerOfAttorneyAsset[];
  notes?: string | null;
  ktpUrl?: string | null;
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function parseDate(value: string) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateIndo(value: string) {
  const date = parseDate(value);
  return `${date.getDate().toString().padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function fallback(value?: string | null) {
  const text = `${value ?? ""}`.trim();
  return text || "-";
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
    .replace(/\bA\.md\.kom\./gi, "A.Md.Kom.")
    .replace(/\bIi\b/g, "II")
    .replace(/\bIii\b/g, "III")
    .replace(/\bIv\b/g, "IV");
}

function signatureName(value?: string | null) {
  const name = displayName(value);
  if (name === "-") return name;
  const [mainName, ...suffix] = name.split(",");
  const upperMain = mainName.trim().toLocaleUpperCase("id-ID");
  return suffix.length > 0 ? `${upperMain},${suffix.join(",")}` : upperMain;
}

function formatNip(nip?: string | null) {
  if (!nip) return "-";
  const clean = nip.replace(/\s+/g, "");
  if (clean.length === 18) {
    return `${clean.substring(0, 8)} ${clean.substring(8, 14)} ${clean.substring(14, 15)} ${clean.substring(15)}`;
  }
  return nip;
}

function assetMerkTipe(asset: PowerOfAttorneyAsset) {
  return fallback(asset.merk_tipe || [asset.merk, asset.tipe].filter(Boolean).join(" "));
}

export function handlePrintPowerOfAttorney(documentId = "power-of-attorney-print-root") {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Tidak ada dokumen Surat Kuasa untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Surat Kuasa Kendaraan</title>
        <style>
          @page { size: A4 portrait; margin: 10mm 0 18mm 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            font-family: "Bookman Old Style", Georgia, Garamond, serif;
            font-size: 11pt;
            line-height: 1.25;
          }
          p { margin: 0; }
          .poa-page { width: 210mm; margin: 0 auto; padding: 0 20mm 14mm; }
          .poa-header { margin: 0 -12mm; text-align: center; }
          .poa-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          .poa-title { margin-top: 6mm; text-align: center; }
          .poa-title-text { font-size: 14pt; font-weight: bold; letter-spacing: 0.5px; }
          .poa-number-text { margin-top: 2px; }
          .poa-body { margin-top: 6mm; text-align: justify; }
          .poa-party { margin: 3mm 0 3mm 0; }
          .poa-gap-before { margin-top: 4mm; }
          .poa-row { display: grid; grid-template-columns: 35mm 5mm minmax(0, 1fr); margin-bottom: 2px; }
          .poa-colon { text-align: center; }
          .poa-table { width: 100%; border-collapse: collapse; table-layout: auto; margin: 4mm 0 4mm; font-size: 9.5pt; text-align: center; }
          .poa-table th, .poa-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
          .poa-table th:nth-child(1), .poa-table td:nth-child(1) { white-space: nowrap; }
          .poa-table th:nth-child(3), .poa-table td:nth-child(3) { white-space: nowrap; }
          .poa-table th:nth-child(4), .poa-table td:nth-child(4) { white-space: nowrap; }
          .poa-table th:nth-child(5), .poa-table td:nth-child(5) { white-space: nowrap; }
          .poa-table th { font-weight: bold; }
          .poa-table thead { display: table-header-group; }
          .poa-table tfoot { display: table-footer-group; }
          .poa-table tr { break-inside: avoid; page-break-inside: avoid; }
          .poa-signature-block { break-inside: avoid; page-break-inside: avoid; margin-top: 8mm; }
          .poa-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
          .poa-sig-col { display: flex; flex-direction: column; align-items: flex-start; padding-left: 5mm; }
          .poa-sig-col p { white-space: nowrap; }
          .poa-sig-col.right { align-items: flex-end; padding-left: 0; padding-right: 5mm; }
          .poa-sig-wrapper { display: inline-block; text-align: left; }
          .poa-date-line { margin-bottom: 4mm; }
          .poa-date-spacer { margin-bottom: 4mm; }
          .signature-name { margin-top: 30mm; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .poa-ktp-page { page-break-before: always; break-before: page; margin-top: 10mm; text-align: center; }
          @page landscape-page { size: A4 landscape; margin: 10mm; }
          .poa-ktp-container { display: block; width: 138mm; max-width: 100%; border: 1px dashed #ccc; padding: 4mm; margin: 0 auto; background: white; }
          .poa-ktp-container img { width: 100%; height: auto; display: block; }
          .poa-stnk-page { page: landscape-page; margin: 0; text-align: center; }
          .poa-stnk-page + .poa-stnk-page { page-break-before: always; break-before: page; }
          .poa-stnk-container { display: block; width: 100%; margin: 0 auto; }
          .poa-stnk-container img { width: 100%; max-width: 270mm; max-height: 170mm; height: auto; object-fit: contain; display: block; margin: 0 auto; }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export function PowerOfAttorneyDocument({
  documentId = "power-of-attorney-print-root",
  number,
  documentDate,
  firstParty,
  secondParty,
  assets,
  notes,
  ktpUrl,
}: PowerOfAttorneyDocumentProps) {
  const formattedDate = formatDateIndo(documentDate);
  const isHardi =
    firstParty?.nip?.replace(/\s+/g, "") === "197202011997031008" ||
    firstParty?.name?.toLowerCase().includes("hardi");
  const finalKtpUrl = ktpUrl || (isHardi ? "/ktp-hardi.jpeg" : null);

  return (
    <div id={documentId}>
      <style jsx global>{`
        .poa-preview .poa-page,
        .poa-preview .poa-ktp-page {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 7mm 20mm 14mm;
          background: white;
          color: black;
          font-family: "Bookman Old Style", Georgia, Garamond, serif;
          font-size: 11pt;
          line-height: 1.25;
        }
        .poa-preview .poa-ktp-page {
          margin-top: 8mm;
          text-align: center;
        }
        .poa-preview .poa-stnk-page {
          width: 297mm;
          max-width: 100%;
          margin: 8mm auto 0;
          padding: 7mm 20mm 14mm;
          background: white;
          color: black;
          font-family: "Bookman Old Style", Georgia, Garamond, serif;
          font-size: 11pt;
          line-height: 1.25;
          text-align: center;
        }
        .poa-preview p { margin: 0; }
        .poa-preview .poa-header { margin: 0 -12mm; text-align: center; }
        .poa-preview .poa-header img { width: 188mm; max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .poa-preview .poa-title { margin-top: 6mm; text-align: center; }
        .poa-preview .poa-title-text { font-size: 14pt; font-weight: bold; letter-spacing: 0.5px; }
        .poa-preview .poa-number-text { margin-top: 2px; }
        .poa-preview .poa-body { margin-top: 6mm; text-align: justify; }
        .poa-preview .poa-party { margin: 3mm 0 3mm 0; }
        .poa-preview .poa-gap-before { margin-top: 4mm; }
        .poa-preview .poa-row { display: grid; grid-template-columns: 35mm 5mm minmax(0, 1fr); margin-bottom: 2px; }
        .poa-preview .poa-colon { text-align: center; }
        .poa-preview .poa-table { width: 100%; border-collapse: collapse; table-layout: auto; margin: 4mm 0 4mm; font-size: 9.5pt; text-align: center; }
        .poa-preview .poa-table th,
        .poa-preview .poa-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
        .poa-preview .poa-table th:nth-child(1), .poa-preview .poa-table td:nth-child(1) { white-space: nowrap; }
        .poa-preview .poa-table th:nth-child(3), .poa-preview .poa-table td:nth-child(3) { white-space: nowrap; }
        .poa-preview .poa-table th:nth-child(4), .poa-preview .poa-table td:nth-child(4) { white-space: nowrap; }
        .poa-preview .poa-table th:nth-child(5), .poa-preview .poa-table td:nth-child(5) { white-space: nowrap; }
        .poa-preview .poa-table th { font-weight: bold; }
        .poa-preview .poa-table thead { display: table-header-group; }
        .poa-preview .poa-table tfoot { display: table-footer-group; }
        .poa-preview .poa-table tr { break-inside: avoid; page-break-inside: avoid; }
        .poa-preview .poa-signature-block { break-inside: avoid; page-break-inside: avoid; margin-top: 8mm; }
        .poa-preview .poa-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
        .poa-preview .poa-sig-col { display: flex; flex-direction: column; align-items: flex-start; padding-left: 5mm; }
        .poa-preview .poa-sig-col p { white-space: nowrap; }
        .poa-preview .poa-sig-col.right { align-items: flex-end; padding-left: 0; padding-right: 5mm; }
        .poa-preview .poa-sig-wrapper { display: inline-block; text-align: left; }
        .poa-preview .poa-date-line { margin-bottom: 4mm; }
        .poa-preview .poa-date-spacer { margin-bottom: 4mm; }
        .poa-preview .signature-name { margin-top: 30mm; }
        .poa-preview .poa-ktp-page {
          page-break-before: always;
          break-before: page;
          margin-top: 15mm;
          text-align: center;
          border-top: 1px dashed #ccc;
          padding-top: 10mm;
        }
        .poa-preview .poa-ktp-container {
          display: block;
          width: 138mm;
          max-width: 100%;
          border: 1px dashed #ccc;
          padding: 4mm;
          margin: 0 auto;
          background: white;
        }
        .poa-preview .poa-ktp-container img {
          width: 100%;
          height: auto;
          display: block;
        }
        .poa-preview .poa-stnk-container {
          display: block;
          width: 100%;
          margin: 0 auto;
        }
        .poa-preview .poa-stnk-container img {
          width: 100%;
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto;
        }
        @media print {
          @page { size: A4 portrait; margin: 10mm 0 18mm 0; }
          @page landscape-page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden; }
          #power-of-attorney-print-root, #power-of-attorney-print-root * { visibility: visible; }
          #power-of-attorney-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; }
          .poa-page, .poa-ktp-page, .poa-stnk-page { box-shadow: none !important; border: none !important; background: transparent !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .poa-preview .poa-ktp-page {
            page-break-before: always;
            break-before: page;
            margin-top: 10mm;
          }
          .poa-preview .poa-stnk-page {
            page: landscape-page;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .poa-preview .poa-stnk-page + .poa-stnk-page {
            page-break-before: always;
            break-before: page;
          }
          .poa-preview .poa-stnk-container img {
            max-width: 270mm;
            max-height: 170mm;
            object-fit: contain;
          }
        }
      `}</style>
      <div className="poa-preview">
        <article className="poa-page shadow-xl ring-1 ring-zinc-200">
          <div className="poa-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/header-terbaru.png" alt="Kop Surat" />
          </div>

          <div className="poa-title">
            <p className="poa-title-text">SURAT KUASA</p>
            <p className="poa-number-text">Nomor : {number || "KS.____/K.18/TU/KAP.03.02/B/__/____"}</p>
          </div>

          <div className="poa-body">
            <p>Yang bertanda tangan dibawah ini :</p>

            <div className="poa-party">
              <div className="poa-row"><span>Nama</span><span className="poa-colon">:</span><span>{signatureName(firstParty.name)}</span></div>
              <div className="poa-row"><span>NIP</span><span className="poa-colon">:</span><span>{formatNip(firstParty.nip)}</span></div>
              <div className="poa-row"><span>Jabatan</span><span className="poa-colon">:</span><span>{fallback(firstParty.position)}</span></div>
              <div className="poa-row"><span>Alamat</span><span className="poa-colon">:</span><span>{fallback(firstParty.address)}</span></div>
            </div>

            <p className="poa-gap-before">Memberikan kuasa kepada :</p>

            <div className="poa-party">
              <div className="poa-row"><span>Nama</span><span className="poa-colon">:</span><span>{signatureName(secondParty.name)}</span></div>
              <div className="poa-row"><span>NIP</span><span className="poa-colon">:</span><span>{formatNip(secondParty.nip)}</span></div>
              <div className="poa-row"><span>Jabatan</span><span className="poa-colon">:</span><span>{fallback(secondParty.position)}</span></div>
              <div className="poa-row"><span>Alamat</span><span className="poa-colon">:</span><span>{fallback(secondParty.address)}</span></div>
            </div>

            <p className="poa-gap-before">
              {notes || "Untuk melakukan pengecekan fisik kendaraan roda 2 (dua) dan 4 (empat) sebagai berikut:"}
            </p>

            <table className="poa-table">
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "32%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Jenis Kendaraan</th>
                  <th>No. Polisi</th>
                  <th>No. Mesin</th>
                  <th>No. Rangka</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={5}>Belum ada kendaraan BMN yang dipilih.</td>
                  </tr>
                ) : assets.map((asset, index) => (
                  <tr className="avoid-break" key={asset.id}>
                    <td>{index + 1}.</td>
                    <td style={{ textAlign: "left" }}>{fallback(asset.nama_barang)} {assetMerkTipe(asset) !== "-" ? ` ${assetMerkTipe(asset)}` : ""}</td>
                    <td>{fallback(asset.no_polisi)}</td>
                    <td>{fallback(asset.no_mesin)}</td>
                    <td>{fallback(asset.no_rangka)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="poa-signature-block">
              <div className="poa-signatures">
                <div className="poa-sig-col">
                  <p className="poa-date-spacer">&nbsp;</p>
                  <p>Yang menerima kuasa,</p>
                  <p className="signature-name">{signatureName(secondParty.name)}</p>
                  <p>NIP. {secondParty.nip ? secondParty.nip.replace(/\s+/g, "") : "-"}</p>
                </div>
                <div className="poa-sig-col right">
                  <div className="poa-sig-wrapper">
                    <p className="poa-date-line">Samarinda, {formattedDate}</p>
                    <p>Yang memberi kuasa,</p>
                    <p className="signature-name">{signatureName(firstParty.name)}</p>
                    <p>NIP. {firstParty.nip ? firstParty.nip.replace(/\s+/g, "") : "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </article>

        {finalKtpUrl && (
          <div className="poa-ktp-page poa-page shadow-xl ring-1 ring-zinc-200">
            <div className="poa-ktp-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={finalKtpUrl} alt="KTP Pemberi Kuasa" />
            </div>
          </div>
        )}

        {assets.map((asset) => {
          const stnkUrls = (() => {
            if (!asset.stnk_document) return [];
            const doc = asset.stnk_document;
            if (doc.preview_urls && doc.preview_urls.length > 0) {
              return doc.preview_urls;
            }
            if (doc.preview_url) {
              return [doc.preview_url];
            }
            if (doc.url) {
              return [doc.url];
            }
            return [];
          })();

          if (stnkUrls.length === 0) return null;

          return stnkUrls.map((url, idx) => (
            <div className="poa-stnk-page shadow-xl ring-1 ring-zinc-200" key={`${asset.id}-stnk-${idx}`}>
              <div className="poa-stnk-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`STNK ${asset.nama_barang} Page ${idx + 1}`} />
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  );
}
