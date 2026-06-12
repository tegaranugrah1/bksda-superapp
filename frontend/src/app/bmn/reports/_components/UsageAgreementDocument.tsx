"use client";

import { toast } from "sonner";

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
}

export interface UsageAgreementParty {
  name: string;
  nip?: string | null;
  rank?: string | null;
  position?: string | null;
}

interface UsageAgreementDocumentProps {
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

function assetMerkTipe(asset: UsageAgreementAsset) {
  return fallback(asset.merk_tipe || [asset.merk, asset.tipe].filter(Boolean).join(" "));
}

export function handlePrintUsageAgreement() {
  const printContent = document.getElementById("ba-pemakaian-print-root");
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
          @page { size: A4 portrait; margin: 0 0 18mm 0; }
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
          .usage-page { width: 210mm; margin: 0 auto; padding: 7mm 20mm 14mm; }
          .usage-header { margin: 0 -12mm; text-align: center; }
          .usage-header img { width: 188mm; max-width: 188mm; height: auto; display: block; margin: 0 auto; }
          .usage-title { margin-top: 6mm; text-align: center; font-weight: 700; }
          .usage-body { margin-top: 6mm; text-align: justify; }
          .usage-party { margin: 2mm 0 3mm 14mm; }
          .usage-row { display: grid; grid-template-columns: 35mm 5mm minmax(0, 1fr); }
          .usage-colon { text-align: center; }
          .usage-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4mm 0 2mm; font-size: 8.4pt; text-align: center; }
          .usage-table th, .usage-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
          .usage-table th { font-weight: 400; }
          .usage-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; margin-top: 8mm; }
          .signature-name { margin-top: 27mm; font-weight: 700; }
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

export function UsageAgreementDocument({
  number,
  documentDate,
  firstParty,
  secondParty,
  assets,
  notes,
}: UsageAgreementDocumentProps) {
  const { day, dateText, month, yearText } = formatSpelledDate(documentDate);

  return (
    <div id="ba-pemakaian-print-root">
      <style jsx global>{`
        .usage-preview .usage-page {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto;
          padding: 7mm 20mm 14mm;
          background: white;
          color: black;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10pt;
          line-height: 1.22;
        }
        .usage-preview p { margin: 0; }
        .usage-preview .usage-header { margin: 0 -12mm; text-align: center; }
        .usage-preview .usage-header img { width: 188mm; max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .usage-preview .usage-title { margin-top: 6mm; text-align: center; font-weight: 700; }
        .usage-preview .usage-body { margin-top: 6mm; text-align: justify; }
        .usage-preview .usage-party { margin: 2mm 0 3mm 14mm; }
        .usage-preview .usage-row { display: grid; grid-template-columns: 35mm 5mm minmax(0, 1fr); }
        .usage-preview .usage-colon { text-align: center; }
        .usage-preview .usage-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 4mm 0 2mm; font-size: 8.4pt; text-align: center; }
        .usage-preview .usage-table th,
        .usage-preview .usage-table td { border: 1px solid #000; padding: 2px 3px; vertical-align: middle; overflow-wrap: anywhere; }
        .usage-preview .usage-table th { font-weight: 400; }
        .usage-preview .usage-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 28mm; margin-top: 8mm; }
        .usage-preview .signature-name { margin-top: 27mm; font-weight: 700; }
        @media print {
          @page { size: A4 portrait; margin: 0 0 18mm 0; }
          body * { visibility: hidden; }
          #ba-pemakaian-print-root, #ba-pemakaian-print-root * { visibility: visible; }
          #ba-pemakaian-print-root { position: absolute; inset: 0 auto auto 0; width: 100%; }
          .usage-page { box-shadow: none !important; }
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
              <div className="usage-row"><span>Nama</span><span className="usage-colon">:</span><span>{fallback(firstParty.name)}</span></div>
              <div className="usage-row"><span>NIP</span><span className="usage-colon">:</span><span>{fallback(firstParty.nip)}</span></div>
              <div className="usage-row"><span>Pangkat/Gol. Ruang</span><span className="usage-colon">:</span><span>{fallback(firstParty.rank)}</span></div>
              <div className="usage-row"><span>Jabatan</span><span className="usage-colon">:</span><span>{fallback(firstParty.position)}</span></div>
            </div>

            <p>
              dalam hal ini bertindak atas nama Kuasa Pengguna Barang satuan kerja Balai KSDA Kalimantan Timur selanjutnya disebut sebagai PIHAK PERTAMA
            </p>

            <div className="usage-party">
              <div className="usage-row"><span>Nama</span><span className="usage-colon">:</span><span>{fallback(secondParty.name)}</span></div>
              <div className="usage-row"><span>NIP</span><span className="usage-colon">:</span><span>{fallback(secondParty.nip)}</span></div>
              <div className="usage-row"><span>Pangkat/Gol. Ruang</span><span className="usage-colon">:</span><span>{fallback(secondParty.rank)}</span></div>
              <div className="usage-row"><span>Jabatan</span><span className="usage-colon">:</span><span>{fallback(secondParty.position)}</span></div>
            </div>

            <p>
              dalam hal ini bertindak sebagai pemakai Barang Milik Negara, selanjutnya disebut sebagai PIHAK KEDUA
            </p>

            <p className="mt-2">
              Telah melaksanakan serah terima Barang Milik Negara (BMN) yang tercatat pada satuan kerja Balai KSDA Kalimantan Timur dari PIHAK PERTAMA kepada PIHAK KEDUA yang akan dipakai untuk keperluan tugas dan fungsi kedinasan sehari-hari, dengan rincian barang:
            </p>

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
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={9}>Belum ada aset BMN yang dipilih.</td>
                  </tr>
                ) : assets.map((asset, index) => (
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

            <p>{notes || "Sehingga tanggung jawab atas penggunaan, pengamanan, dan pemeliharaan yang dibebankan pada DIPA satuan kerja berada pada PIHAK KEDUA."}</p>
            <p className="mt-3">Berita Acara ini dibuat dengan sebenar-benarnya.</p>

            <div className="usage-signatures avoid-break">
              <div>
                <p>PIHAK KEDUA,</p>
                <p className="signature-name">{fallback(secondParty.name).toUpperCase()}</p>
                <p>NIP.{fallback(secondParty.nip)}</p>
              </div>
              <div>
                <p>PIHAK PERTAMA,</p>
                <p className="signature-name">{fallback(firstParty.name).toUpperCase()}</p>
                <p>NIP.{fallback(firstParty.nip)}</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
