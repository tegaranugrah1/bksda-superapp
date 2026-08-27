"use client";

import { toast } from "sonner";
import { resolveApiUrl } from "@/lib/api";

export interface UsageAgreementAsset {
  id: string;
  nama_barang: string;
  kode_barang: string;
  nup: string;
  merk_tipe?: string | null;
  merk?: string | null;
  tipe?: string | null;
  kondisi?: string | null;
  no_polisi?: string | null;
  no_rangka?: string | null;
  no_mesin?: string | null;
  foto_depan_url?: string | null;
  foto_belakang_url?: string | null;
  foto_kiri_url?: string | null;
  foto_kanan_url?: string | null;
  foto_geotag_url?: string | null;
  foto_url?: string | null;
  photos?: string[];
}

export interface UsageAgreementParty {
  name: string;
  nip?: string | null;
  rank?: string | null;
  position?: string | null;
}

interface UsageAgreementDocumentProps {
  documentId?: string;
  number: string;
  documentDate: string;
  firstParty: UsageAgreementParty;
  secondParty: UsageAgreementParty;
  assets: UsageAgreementAsset[];
  notes: string;
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

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const SMALL_NUMBERS = [
  "Nol",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
];

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

function displayRank(value?: string | null) {
  const rank = fallback(value);
  if (rank === "-") return rank;

  return rank.replace(
    /\s+\/\s+([IVX]+)\s*([a-e])\b/i,
    (_, roman: string, letter: string) => ` (${roman.toUpperCase()}/${letter.toLowerCase()})`,
  );
}

function assetMerkTipe(asset: UsageAgreementAsset) {
  return fallback(asset.merk_tipe || [asset.merk, asset.tipe].filter(Boolean).join(" "));
}

function convertDriveUrl(url: string): string {
  if (!url.includes("drive.google.com") && !url.includes("docs.google.com")) {
    return url;
  }
  const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (fileIdMatch && fileIdMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w800`;
  }
  return url;
}

function resolvePhotoUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const driveConverted = convertDriveUrl(trimmed);
  if (driveConverted !== trimmed) {
    return driveConverted;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  return resolveApiUrl(trimmed) || trimmed;
}

function getAssetPrintPhotos(asset: UsageAgreementAsset): string[] {
  const rawUrls: string[] = [];

  if (asset.photos && Array.isArray(asset.photos)) {
    rawUrls.push(...asset.photos.filter(Boolean));
  }
  if (asset.foto_depan_url) rawUrls.push(asset.foto_depan_url);
  if (asset.foto_belakang_url) rawUrls.push(asset.foto_belakang_url);
  if (asset.foto_kiri_url) rawUrls.push(asset.foto_kiri_url);
  if (asset.foto_kanan_url) rawUrls.push(asset.foto_kanan_url);
  if (asset.foto_geotag_url) rawUrls.push(asset.foto_geotag_url);
  if (asset.foto_url) rawUrls.push(asset.foto_url);

  const resolved = Array.from(new Set(rawUrls.map(resolvePhotoUrl).filter(Boolean) as string[]));
  return resolved.slice(0, 2);
}

function chunkPhotoAssets<T>(array: T[], size = 3): T[][] {
  if (array.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function handlePrintUsageAgreement(documentId = "ba-pemakaian-print-root") {
  const printContent = document.getElementById(documentId);
  if (!printContent) {
    toast.error("Tidak ada dokumen BA Pemakaian untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>BA Pemakaian BMN</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background: white;
            color: black;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            line-height: 1.22;
          }
          p { margin: 0; }
          .usage-page { width: 210mm; margin: 0 auto; padding: 5mm 20mm 10mm; }
          .usage-header { margin: 0 -12mm; text-align: center; }
          .usage-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          .usage-title { margin-top: 5mm; text-align: center; font-weight: 700; }
          .usage-body { margin-top: 5mm; text-align: justify; }
          .usage-party { margin: 2mm 0 3mm 14mm; }
          .usage-indent { margin-left: 14mm; }
          .usage-gap-before { margin-top: 3mm; }
          .usage-row { display: grid; grid-template-columns: 35mm 5mm minmax(0, 1fr); }
          .usage-colon { text-align: center; }
          .usage-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm; font-size: 8.4pt; text-align: center; }
          .usage-table th, .usage-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
          .usage-table th { font-weight: 400; }
          .usage-table thead tr.table-number-row th { font-weight: 400; padding: 1px 0; font-size: 8.4pt; }
          .usage-table tr { break-inside: avoid; page-break-inside: avoid; }
          .usage-signature-block { break-inside: avoid; page-break-inside: avoid; padding-top: 15mm; margin-top: 2mm; }
          .usage-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; margin-top: 5mm; }
          .signature-name { margin-top: 22mm; font-weight: 700; }
          .page-continuation-spacer { height: 15mm; page-break-before: always; break-before: page; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          
          /* Lampiran Foto Styles */
          .photo-lampiran-page {
            page-break-before: always;
            break-before: page;
            width: 210mm;
            margin: 0 auto;
            padding: 5mm 20mm 10mm;
          }
          .photo-lampiran-title {
            margin-top: 3mm;
            margin-bottom: 5mm;
            text-align: center;
            font-weight: 700;
            font-size: 10pt;
          }
          .photo-asset-block {
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 8mm;
            text-align: center;
          }
          .photo-asset-title {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 10pt;
            font-weight: 400;
            margin-bottom: 3mm;
            text-align: center;
          }
          .photo-grid-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8mm;
          }
          .photo-img {
            width: 82mm;
            height: 60mm;
            object-fit: contain;
            background-color: transparent;
            border: none;
          }
          .photo-placeholder {
            width: 82mm;
            height: 60mm;
            border: 1px dashed #ccc;
            background: #f9fafb;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 8.5pt;
          }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();

  const images = printWindow.document.getElementsByTagName("img");
  let loaded = 0;
  const total = images.length;
  const doPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (total === 0) {
    setTimeout(doPrint, 300);
  } else {
    for (let i = 0; i < total; i++) {
      if (images[i].complete) {
        loaded++;
      } else {
        images[i].onload = images[i].onerror = () => {
          loaded++;
          if (loaded >= total) doPrint();
        };
      }
    }
    if (loaded >= total) {
      setTimeout(doPrint, 300);
    }
  }
}

export function UsageAgreementDocument({
  documentId = "ba-pemakaian-print-root",
  number,
  documentDate,
  firstParty,
  secondParty,
  assets,
  notes,
}: UsageAgreementDocumentProps) {
  const { day, dateText, month, yearText } = formatSpelledDate(documentDate);

  // Dynamic pagination threshold
  const PAGE_1_MAX_ITEMS = 17;
  const isMultiPage = assets.length > PAGE_1_MAX_ITEMS;
  const page1Assets = isMultiPage ? assets.slice(0, PAGE_1_MAX_ITEMS) : assets;
  const page2Assets = isMultiPage ? assets.slice(PAGE_1_MAX_ITEMS) : [];

  // Group assets for Photo Lampiran pages (3 assets per page with Kop Surat header)
  const photoPages = chunkPhotoAssets(assets, 3);

  return (
    <div id={documentId}>
      <style jsx global>{`
        .usage-preview .usage-page {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 5mm 20mm 10mm;
          background: white;
          color: black;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          line-height: 1.22;
        }
        .usage-preview p { margin: 0; }
        .usage-preview .usage-header { margin: 0 -12mm; text-align: center; }
        .usage-preview .usage-header img { width: 188mm; max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .usage-preview .usage-title { margin-top: 5mm; text-align: center; font-weight: 700; }
        .usage-preview .usage-body { margin-top: 5mm; text-align: justify; }
        .usage-preview .usage-party { margin: 2mm 0 3mm 14mm; }
        .usage-preview .usage-indent { margin-left: 14mm; }
        .usage-preview .usage-gap-before { margin-top: 3mm; }
        .usage-preview .usage-row { display: grid; grid-template-columns: 35mm 5mm minmax(0, 1fr); }
        .usage-preview .usage-colon { text-align: center; }
        .usage-preview .usage-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 3mm 0 2mm; font-size: 8.4pt; text-align: center; }
        .usage-preview .usage-table th,
        .usage-preview .usage-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
        .usage-preview .usage-table th { font-weight: 400; }
        .usage-preview .usage-table thead tr.table-number-row th { font-weight: 400; padding: 1px 0; font-size: 8.4pt; }
        .usage-preview .usage-table tr { break-inside: avoid; page-break-inside: avoid; }
        .usage-preview .usage-signature-block { break-inside: avoid; page-break-inside: avoid; padding-top: 15mm; margin-top: 2mm; }
        .usage-preview .usage-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; margin-top: 5mm; }
        .usage-preview .signature-name { margin-top: 22mm; font-weight: 700; }
        .usage-preview .page-continuation-spacer { height: 15mm; page-break-before: always; break-before: page; }
        
        /* Lampiran Foto Styles */
        .usage-preview .photo-lampiran-page {
          page-break-before: always;
          break-before: page;
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 5mm 20mm 10mm;
          background: white;
        }
        .usage-preview .photo-lampiran-title {
          margin-top: 3mm;
          margin-bottom: 5mm;
          text-align: center;
          font-weight: 700;
          font-size: 10pt;
        }
        .usage-preview .photo-asset-block {
          break-inside: avoid;
          page-break-inside: avoid;
          margin-bottom: 8mm;
          text-align: center;
        }
        .usage-preview .photo-asset-title {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          font-weight: 400;
          margin-bottom: 3mm;
          text-align: center;
        }
        .usage-preview .photo-grid-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8mm;
        }
        .usage-preview .photo-img {
          width: 82mm;
          height: 60mm;
          object-fit: contain;
          background-color: transparent;
          border: none;
        }
        .usage-preview .photo-placeholder {
          width: 82mm;
          height: 60mm;
          border: 1px dashed #ccc;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 8.5pt;
        }
        @media print {
          @page { size: A4 portrait; margin: 15mm 0 15mm 0; }
          @page :first { margin-top: 0; }
          body * { visibility: hidden; }
          #ba-pemakaian-print-root, #ba-pemakaian-print-root * { visibility: visible; }
          #ba-pemakaian-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; }
          .usage-page { box-shadow: none !important; }
          .photo-lampiran-page { box-shadow: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="usage-preview">
        <article className="usage-page shadow-xl ring-1 ring-zinc-200">
          <div className="usage-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/header-terbaru.png" alt="Kop Surat" />
          </div>

          <div className="usage-title">
            <p>BERITA ACARA PEMAKAIAN BARANG MILIK NEGARA</p>
            <p>Nomor : {number || "BA.____/K.18/TU/KAP.03.02/B/__/____"}</p>
          </div>

          <div className="usage-body">
            <p>
              Pada hari ini {day} tanggal {dateText} bulan {month} tahun {yearText} kami masing-masing:
            </p>

            <div className="usage-party">
              <div className="usage-row"><span>Nama</span><span className="usage-colon">:</span><span>{displayName(firstParty.name)}</span></div>
              <div className="usage-row"><span>NIP</span><span className="usage-colon">:</span><span>{fallback(firstParty.nip)}</span></div>
              <div className="usage-row"><span>Pangkat/Gol. Ruang</span><span className="usage-colon">:</span><span>{displayRank(firstParty.rank)}</span></div>
              <div className="usage-row"><span>Jabatan</span><span className="usage-colon">:</span><span>{fallback(firstParty.position)}</span></div>
            </div>

            <p className="usage-indent">
              dalam hal ini bertindak atas nama Kuasa Pengguna Barang satuan kerja Balai KSDA Kalimantan Timur selanjutnya disebut sebagai PIHAK PERTAMA
            </p>

            <div className="usage-party">
              <div className="usage-row"><span>Nama</span><span className="usage-colon">:</span><span>{displayName(secondParty.name)}</span></div>
              <div className="usage-row"><span>NIP</span><span className="usage-colon">:</span><span>{fallback(secondParty.nip)}</span></div>
              <div className="usage-row"><span>Pangkat/Gol. Ruang</span><span className="usage-colon">:</span><span>{displayRank(secondParty.rank)}</span></div>
              <div className="usage-row"><span>Jabatan</span><span className="usage-colon">:</span><span>{fallback(secondParty.position)}</span></div>
            </div>

            <p className="usage-indent">
              dalam hal ini bertindak sebagai pemakai Barang Milik Negara, selanjutnya disebut sebagai PIHAK KEDUA
            </p>

            <p className="usage-gap-before">
              Telah melaksanakan serah terima Barang Milik Negara (BMN) yang tercatat pada satuan kerja Balai KSDA Kalimantan Timur dari PIHAK PERTAMA kepada PIHAK KEDUA yang akan dipakai untuk keperluan tugas dan fungsi kedinasan sehari-hari, dengan rincian barang:
            </p>

            {/* Page 1 Table (Items 1-17) */}
            <table className="usage-table">
              <colgroup>
                <col style={{ width: "7%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Uraian Barang</th>
                  <th>Kode Barang</th>
                  <th>NUP</th>
                  <th>Merek /Tipe</th>
                  <th>Kondisi</th>
                  <th>Nomor Polisi</th>
                  <th>Nomor Rangka</th>
                  <th>Nomor Mesin</th>
                </tr>
              </thead>
              <tbody>
                {page1Assets.length === 0 ? (
                  <tr>
                    <td colSpan={9}>Belum ada aset BMN yang dipilih.</td>
                  </tr>
                ) : page1Assets.map((asset, index) => (
                  <tr className="avoid-break" key={asset.id}>
                    <td>{index + 1}</td>
                    <td>{fallback(asset.nama_barang)}</td>
                    <td>{fallback(asset.kode_barang)}</td>
                    <td>{fallback(asset.nup)}</td>
                    <td>{assetMerkTipe(asset)}</td>
                    <td>{fallback(asset.kondisi)}</td>
                    <td>{fallback(asset.no_polisi)}</td>
                    <td>{fallback(asset.no_rangka)}</td>
                    <td>{fallback(asset.no_mesin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Page 2 Section (if multi-page) */}
            {isMultiPage && (
              <>
                <div className="page-continuation-spacer" />
                <table className="usage-table">
                  <colgroup>
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "9%" }} />
                  </colgroup>
                  <thead>
                    <tr className="table-number-row">
                      <th>1</th>
                      <th>2</th>
                      <th>3</th>
                      <th>4</th>
                      <th>5</th>
                      <th>6</th>
                      <th>7</th>
                      <th>8</th>
                      <th>9</th>
                    </tr>
                    <tr>
                      <th>No</th>
                      <th>Uraian Barang</th>
                      <th>Kode Barang</th>
                      <th>NUP</th>
                      <th>Merek /Tipe</th>
                      <th>Kondisi</th>
                      <th>Nomor Polisi</th>
                      <th>Nomor Rangka</th>
                      <th>Nomor Mesin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page2Assets.map((asset, index) => (
                      <tr className="avoid-break" key={asset.id}>
                        <td>{PAGE_1_MAX_ITEMS + index + 1}</td>
                        <td>{fallback(asset.nama_barang)}</td>
                        <td>{fallback(asset.kode_barang)}</td>
                        <td>{fallback(asset.nup)}</td>
                        <td>{assetMerkTipe(asset)}</td>
                        <td>{fallback(asset.kondisi)}</td>
                        <td>{fallback(asset.no_polisi)}</td>
                        <td>{fallback(asset.no_rangka)}</td>
                        <td>{fallback(asset.no_mesin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <p className="usage-gap-before">{notes || "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."}</p>

            {/* Signature Block (Always keeps "Berita Acara ini dibuat..." TOGETHER with signatures) */}
            <div className="usage-signature-block avoid-break">
              <p className="usage-gap-before">Berita Acara ini dibuat dengan sebenar-benarnya.</p>

              <div className="usage-signatures">
                <div>
                  <p>PIHAK KEDUA,</p>
                  <p className="signature-name">{signatureName(secondParty.name)}</p>
                  <p>NIP.{fallback(secondParty.nip)}</p>
                </div>
                <div>
                  <p>PIHAK PERTAMA,</p>
                  <p className="signature-name">{signatureName(firstParty.name)}</p>
                  <p>NIP.{fallback(firstParty.nip)}</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Halaman Baru Lampiran Dokumentasi Foto Aset BMN (3 Aset per Halaman Memenuhi Layar) */}
        {photoPages.map((pageGroup, pageIndex) => (
          <article key={`photo-page-${pageIndex}`} className="photo-lampiran-page shadow-xl ring-1 ring-zinc-200 mt-6">
            <div className="usage-header">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/header-terbaru.png" alt="Kop Surat" />
            </div>

            {/* Title ONLY on pageIndex === 0 */}
            {pageIndex === 0 && (
              <div className="photo-lampiran-title">
                <p>LAMPIRAN DOKUMENTASI FOTO BARANG MILIK NEGARA</p>
              </div>
            )}

            {pageGroup.map((asset) => {
              const photos = getAssetPrintPhotos(asset);
              return (
                <div key={`photo-${asset.id}`} className="photo-asset-block avoid-break">
                  <p className="photo-asset-title">
                    {asset.nama_barang} ( NUP {asset.nup || "-"} )
                  </p>
                  <div className="photo-grid-row">
                    {photos.length > 0 ? (
                      photos.map((photoUrl, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={photoUrl}
                          alt={`${asset.nama_barang} ${idx + 1}`}
                          className="photo-img"
                        />
                      ))
                    ) : (
                      <>
                        <div className="photo-placeholder">
                          <span>Foto 1 (Tampak Depan)</span>
                        </div>
                        <div className="photo-placeholder">
                          <span>Foto 2 (Tampak Belakang)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </article>
        ))}
      </div>
    </div>
  );
}
