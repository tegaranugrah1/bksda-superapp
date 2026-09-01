"use client";

import { formatRupiah, MOCK_EMPLOYEES } from "@/app/keuangan/_components/finance-data";

interface TransportItem {
  id?: string;
  amount: number;
  label: string;
}

export interface RinbaDetails {
  operasionalDays: number;
  operasionalDailyRate: number;
  transportItems: TransportItem[];
}

interface Recipient {
  id: string;
  name: string;
  description: string;
  evidence: string;
  amount: number;
  rinba?: RinbaDetails;
  bankName?: string;
  accountNo?: string;
  accountHolder?: string;
  nip?: string;
  rank?: string;
  position?: string;
  satuanKerja?: string;
  mengetahui?: MengetahuiOfficial;
}

export interface MengetahuiOfficial {
  name: string;
  nik: string;
  position: string;
}
export interface SpbConfig {
  virtualAccount?: string;
  ppkPosition?: string;
  keperluanPrefix?: string;
  point2Text?: string;
  cityDateText?: string;
}

export interface SpdConfig {
  ppkPoin1Text?: string;
  anggaranHeader?: string;
  instansiPoin9a?: string;
  akunPoin9b?: string;
}

interface Official { name: string; nik: string }
interface Props {
  selectedDocument: string;
  recipients: Recipient[];
  activity: { awpCode: string; name: string };
  travel: { origin: string; destination: string; startDate: string; endDate: string };
  sptNumber: string;
  ppk: Official;
  pdo: Official;
  verifikator?: Official;
  total: number;
  spbNumber?: { no?: string; suffix?: string };
  spdNumber?: { no?: string; suffix?: string };
  spbConfig?: SpbConfig;
  spdConfig?: SpdConfig;
}

const SATUAN_KERJA = "Balai Konservasi Sumber Daya Alam Kalimantan Timur";
const compactDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";
export function formatNip(nip?: string): string {
  if (!nip) return "-";
  const clean = nip.replace(/\D/g, "");
  if (clean.length === 18) {
    return `${clean.slice(0, 8)} ${clean.slice(8, 14)} ${clean.slice(14, 15)} ${clean.slice(15, 18)}`;
  }
  return nip;
}
const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
function terbilang(n: number): string {
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  if (n < 200) return "Seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  if (n < 2000) return "Seribu " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  return terbilang(Math.floor(n / 1000000000)) + " Milyar " + terbilang(n % 1000000000);
}
const words = (value: number) => {
  if (!value || value === 0) return "Nol Rupiah";
  const str = terbilang(Math.floor(value)).replace(/\s+/g, " ").trim();
  return `${str} Rupiah`;
};
const formatNumber = (value: number) => (value ? value.toLocaleString("en-US") : "0");

export function DocumentTemplates({ selectedDocument, recipients, activity, travel, sptNumber, ppk, pdo, verifikator, total, spbNumber, spdNumber, spbConfig, spdConfig }: Props) {
  const doc = (selectedDocument || "").toLowerCase();

  if (doc === "sptjb" || doc.includes("sptjb") || doc.includes("rekap")) {
    return <RekapPreview recipients={recipients} activity={activity} travel={travel} ppk={ppk} pdo={pdo} total={total} />;
  }
  if (doc === "spb" || doc.includes("spb") || doc.includes("persetujuan")) {
    return <SpbPreview recipients={recipients} activity={activity} sptNumber={sptNumber} ppk={ppk} pdo={pdo} verifikator={verifikator} spbNumber={spbNumber} spbConfig={spbConfig} />;
  }
  if (doc === "daftar-isian" || doc.includes("daftar") || doc.includes("isian")) {
    return <DaftarIsianPreview recipients={recipients} activity={activity} travel={travel} />;
  }
  if (doc === "kuitansi" || doc.includes("kuitansi") || doc.includes("kwitansi")) {
    return <KuitansiPreview recipients={recipients} activity={activity} sptNumber={sptNumber} ppk={ppk} pdo={pdo} />;
  }
  if (doc === "rinba" || doc.includes("rinba")) {
    return <RinbaPreview recipients={recipients} travel={travel} sptNumber={sptNumber} ppk={ppk} pdo={pdo} spdNumber={spdNumber} />;
  }
  if (doc === "spd" || doc.includes("spd")) {
    return <SpdPreview recipients={recipients} activity={activity} travel={travel} sptNumber={sptNumber} ppk={ppk} spdNumber={spdNumber} spdConfig={spdConfig} />;
  }

  return <RekapPreview recipients={recipients} activity={activity} travel={travel} ppk={ppk} pdo={pdo} total={total} />;
}

function PrintPage({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="print-page mx-auto min-h-[297mm] max-w-[210mm] border border-slate-300 bg-white p-8 text-[11px] text-slate-900 shadow-md print:min-h-0 print:max-w-none print:border-0 print:p-0 print:shadow-none font-sans">
      <DocHeader title={title} />
      {children}
    </div>
  );
}

function DocHeader({ title }: { title: string }) {
  return (
    <header className="border-b-2 border-slate-900 pb-3 text-center">
      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 text-lg font-black">
        KLH
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider">Kementerian Lingkungan Hidup dan Kehutanan</p>
      <p className="text-sm font-black uppercase">Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem</p>
      <p className="text-sm font-black uppercase">Balai Konservasi Sumber Daya Alam Kalimantan Timur</p>
      <p className="mt-1 text-[8px] text-slate-600">Jl. Teuku Umar RT. 34, Kel. Karang Asam Ilir, Kec. Sungai Kunjang, Kota Samarinda</p>
      <h1 className="mt-5 text-base font-black uppercase tracking-wide">{title}</h1>
    </header>
  );
}

function MetaRows({ activity, travel, sptNumber }: { activity: { awpCode: string; name: string }; travel: { origin: string; destination: string; startDate: string; endDate: string }; sptNumber?: string }) {
  return (
    <div className="mt-5 grid gap-1 text-[10px] sm:grid-cols-2">
      <p><b>Kode AWP</b> : {activity.awpCode}</p>
      <p><b>Nomor</b> : {sptNumber || "-"}</p>
      <p className="sm:col-span-2"><b>Kegiatan</b> : {activity.name}</p>
      <p><b>Asal / Tujuan</b> : {travel.origin} / {travel.destination}</p>
      <p><b>Periode</b> : {compactDate(travel.startDate)} — {compactDate(travel.endDate)}</p>
    </div>
  );
}

function Signatures({ ppk, pdo, receiver }: { ppk: Official; pdo: Official; receiver?: Recipient }) {
  return (
    <div className="mt-14 grid gap-10 text-center text-[10px] sm:grid-cols-2">
      <div>
        <p>Pejabat Pembuat Komitmen,</p>
        <div className="h-16" />
        <p className="font-bold underline">{ppk.name}</p>
        <p>NIP. {ppk.nik}</p>
      </div>
      <div>
        <p>{receiver ? "Yang menerima," : "Pemegang Dana Operasional,"}</p>
        <div className="h-16" />
        <p className="font-bold underline">{receiver?.name || pdo.name}</p>
        <p>NIP. {receiver?.id || pdo.nik}</p>
      </div>
    </div>
  );
}

function RekapPreview({ recipients, activity, ppk, pdo, total }: Omit<Props, "selectedDocument" | "sptNumber">) {
  return (
    <div id="rekap-print-root" className="rekap-print-root font-['Figtree',sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .rekap-print-root, .rekap-paper, .rekap-paper * {
          font-family: 'Figtree', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 10mm 15mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          .rekap-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .rekap-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 0 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Figtree', sans-serif !important;
          }
          table.rekap-table {
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-family: 'Figtree', sans-serif !important;
          }
          table.rekap-table th,
          table.rekap-table td {
            border: 1px solid #000 !important;
            font-family: 'Figtree', sans-serif !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      <div className="rekap-paper mx-auto w-full max-w-[210mm] bg-white p-5 md:p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none font-['Figtree',sans-serif]">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-[10.5pt] font-bold uppercase tracking-wide underline inline-block font-['Figtree',sans-serif]">
            SURAT PERNYATAAN TANGGUNG JAWAB BELANJA
          </h1>
        </div>

        {/* Metadata section */}
        <div className="mt-2.5 mb-2.5 space-y-0.5 text-[8.5pt]">
          <div className="grid grid-cols-[150px_1fr]">
            <span>1. &nbsp;Nama Satuan Kerja</span>
            <span>{SATUAN_KERJA}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span>2. &nbsp;Kode AWP</span>
            <span>{activity.awpCode}</span>
          </div>
          <div className="grid grid-cols-[150px_1fr]">
            <span>3. &nbsp;Kegiatan</span>
            <span>{activity.name}</span>
          </div>
        </div>

        {/* Main Table */}
        <table className="rekap-table w-full border-collapse border border-black text-[8.5pt]">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "6.5%" }} />
            <col style={{ width: "25.5%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className="border border-black px-1 py-1 text-center font-bold align-middle whitespace-nowrap text-[8pt]">
                NO
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1 text-center font-bold align-middle text-[8pt]">
                Penerima
              </th>
              <th rowSpan={2} className="border border-black px-1.5 py-1 text-center font-bold align-middle text-[8pt]">
                Uraian
              </th>
              <th colSpan={2} className="border border-black px-1 py-0.5 text-center font-bold align-middle text-[8pt]">
                Bukti
              </th>
              <th rowSpan={2} className="border border-black px-1 py-1 text-center font-bold align-middle text-[8pt] leading-tight">
                Jumlah<br />(Rp.)
              </th>
              <th colSpan={2} className="border border-black px-0.5 py-0.5 text-center font-bold align-middle text-[7.5pt] leading-tight">
                Pajak Yang Dipungut<br />Bendahara Pengeluaran
              </th>
            </tr>
            <tr>
              <th className="border border-black px-0.5 py-0.5 text-center font-bold align-middle text-[7pt] whitespace-nowrap">
                Tanggal
              </th>
              <th className="border border-black px-1 py-0.5 text-center font-bold align-middle text-[7.5pt]">
                {/* Empty subheader for evidence number */}
              </th>
              <th className="border border-black px-0.5 py-0.5 text-center font-bold align-middle text-[7pt] leading-tight whitespace-nowrap">
                PPN (Rp.)
              </th>
              <th className="border border-black px-0.5 py-0.5 text-center font-bold align-middle text-[7pt] leading-tight whitespace-nowrap">
                PPh (Rp.)
              </th>
            </tr>
          </thead>
          <tbody>
            {recipients.map((recipient, index) => (
              <tr key={recipient.id}>
                <td className="border border-black px-1 py-1 text-center align-top font-normal whitespace-nowrap text-[8pt]">
                  {index + 1}
                </td>
                <td className="border border-black px-1.5 py-1 text-left align-top font-normal text-[8pt] leading-snug">
                  {recipient.name}
                </td>
                <td className="border border-black px-1.5 py-1 text-left align-top font-normal text-[7pt] leading-tight">
                  {recipient.description}
                </td>
                <td className="border border-black px-0.5 py-1 text-center align-top font-normal text-[7pt]">
                  {/* Tanggal Bukti if any */}
                </td>
                <td className="border border-black px-1.5 py-1 text-center align-top font-normal text-[8pt] font-mono tracking-tight whitespace-nowrap">
                  {recipient.evidence || ""}
                </td>
                <td className="border border-black px-1.5 py-1 text-right align-top font-normal whitespace-nowrap text-[8pt]">
                  {formatNumber(recipient.amount)}
                </td>
                <td className="border border-black px-0.5 py-1 text-center align-top font-normal text-[8pt]">
                  -
                </td>
                <td className="border border-black px-0.5 py-1 text-center align-top font-normal text-[8pt]">
                  -
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border border-black px-2 py-1 text-center font-bold text-[8pt]">
                JUMLAH
              </td>
              <td colSpan={2} className="border border-black px-1 py-1 text-center font-bold text-[7.5pt]">
                bukti
              </td>
              <td className="border border-black px-1.5 py-1 text-right font-bold whitespace-nowrap text-[8pt]">
                {formatNumber(total)}
              </td>
              <td className="border border-black px-0.5 py-1 text-center font-bold text-[8pt]">
                -
              </td>
              <td className="border border-black px-0.5 py-1 text-center font-bold text-[8pt]">
                -
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Statement */}
        <p className="mt-2.5 text-[8.5pt]">
          Demikian surat pernyataan ini dibuat dengan sebenarnya.
        </p>

        {/* Signatures */}
        <div className="mt-2.5 grid grid-cols-2 gap-8 text-[8.5pt]">
          <div>
            <p>Samarinda, &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2026</p>
            <p className="mt-0.5">Pejabat Pembuat Komitmen,</p>
            <div className="h-10" />
            <p className="font-bold">{ppk.name}</p>
            <p>NIP. {formatNip(ppk.nik)}</p>
          </div>
          <div>
            <p>&nbsp;</p>
            <p className="mt-0.5">Pemegang Dana Operasional,</p>
            <div className="h-10" />
            <p className="font-bold">{pdo.name}</p>
            <p>NIP. {formatNip(pdo.nik)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpbPreview({ recipients, activity, sptNumber, ppk, pdo, verifikator, spbNumber, spbConfig }: Omit<Props, "selectedDocument" | "travel" | "total">) {
  const verifikatorData = verifikator || { name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053" };
  const rawSuffix = spbNumber?.suffix?.trim() || (sptNumber ? `/SPB/${sptNumber.replace(/^.*?\//, "")}` : "/SPB/K.18/FOLU-NC23/05/2026");
  const cleanSuffix = rawSuffix.startsWith("/") ? rawSuffix : `/${rawSuffix}`;

  const virtualAccount = spbConfig?.virtualAccount?.trim() || "9899410000000115";
  const ppkPosition = spbConfig?.ppkPosition?.trim() || "Pejabat Pembuat Komitmen IP BKSDA Kalimantan Timur";
  const keperluanPrefix = spbConfig?.keperluanPrefix?.trim() || "Pembayaran Biaya";
  const cityDateText = spbConfig?.cityDateText?.trim() || "Samarinda,";

  return (
    <div id="spb-print-root" className="spb-print-root font-['Figtree',sans-serif] space-y-8 print:space-y-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .spb-print-root, .spb-paper, .spb-paper * {
          font-family: 'Figtree', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm 8mm 12mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          .spb-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .spb-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 0 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Figtree', sans-serif !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .spb-paper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {recipients.map((recipient, index) => {
        const cleanDescription = recipient.description.replace(/^Pembayaran Biaya\s*/i, "").trim();
        return (
          <div
            key={recipient.id || index}
            className="spb-paper mx-auto w-full max-w-[210mm] bg-white pt-4 pb-8 px-6 md:pt-4 md:pb-10 md:px-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[9.5pt] leading-normal font-['Figtree',sans-serif]"
          >
            {/* Kop Surat (Header BMN Reports) */}
            <div className="spb-kop text-center mb-3 -mt-2 -mx-2 md:-mx-4 print:-mx-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/new-header.png"
                alt="Kop Surat Balai Konservasi Sumber Daya Alam Kalimantan Timur"
                className="w-full h-auto block mx-auto"
              />
            </div>

            {/* Title */}
            <div className="text-center mt-2">
              <h1 className="text-[11pt] font-bold uppercase tracking-wide">
                SURAT PERSETUJUAN BAYAR
              </h1>
              <p className="text-[9.5pt] mt-0.5 font-normal">
                No: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{spbNumber?.no?.trim() || ""}{cleanSuffix}
              </p>
            </div>

            {/* Preamble */}
            <p className="mt-4 text-[9.5pt]">Yang Bertanda tangan dibawah ini:</p>

            {/* Identity */}
            <div className="mt-2 grid grid-cols-[130px_10px_1fr] text-[9.5pt] gap-y-1">
              <span>Nama</span>
              <span>:</span>
              <span>{ppk.name}</span>

              <span>Jabatan</span>
              <span>:</span>
              <span>{ppkPosition}</span>

              <span>Virtual Account</span>
              <span>:</span>
              <span>{virtualAccount}</span>
            </div>

            {/* Point 1 */}
            <div className="mt-4 text-[9.5pt]">
              <div className="grid grid-cols-[20px_1fr] gap-1">
                <span className="font-normal">1.</span>
                <div>
                  <p>
                    Menyetujui pembayaran sebesar &nbsp; Rp. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>{formatNumber(recipient.amount)}</b> &nbsp;&nbsp; <i>{words(recipient.amount)}</i>
                  </p>
                  <p className="mt-0.5">dengan rincian sebagai berikut :</p>

                  <div className="mt-2 grid grid-cols-[100px_10px_1fr] text-[9.5pt] gap-y-1.5 ml-2">
                    <span>Kode AWP</span>
                    <span>:</span>
                    <div>
                      <span>{activity.awpCode}</span>
                      <span className="ml-8">{activity.name}</span>
                    </div>

                    <span>Nilai</span>
                    <span>:</span>
                    <div>
                      <span>Rp &nbsp;&nbsp; {formatNumber(recipient.amount)}</span>
                    </div>

                    <span>Keperluan</span>
                    <span>:</span>
                    <div className="text-justify leading-snug">
                      <span>
                        {keperluanPrefix} {cleanDescription} atas nama {recipient.name}.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Point 2 */}
            <div className="mt-4 text-[9.5pt]">
              <div className="grid grid-cols-[20px_1fr] gap-1">
                <span className="font-normal">2.</span>
                <div className="text-justify leading-snug whitespace-pre-line">
                  {spbConfig?.point2Text?.trim()
                    ? spbConfig.point2Text.replace("{awpCode}", activity.awpCode)
                    : `Memerintahkan Pemegang Dana Operasional untuk pembayaran dan membebankan pengeluaran pada Annual Work Plan (AWP) Project FOLU-NC 2&3 IP BKSDA Kalimantan Timur untuk Kode AWP ${activity.awpCode} Tahun Anggaran 2026.`}
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="mt-6 grid grid-cols-2 gap-8 text-[9.5pt]">
              {/* Left Column: Pemegang Dana Operasional */}
              <div className="flex flex-col justify-between">
                <div>
                  <p>Pemegang Dana Operasional</p>
                  <p>Tanggal:</p>
                  <div className="h-16" />
                  <p className="font-bold">{pdo.name || "Dilemma Ferti Hidayah, S.E."}</p>
                  <p>NIP. {formatNip(pdo.nik || "19870130 201012 2 005")}</p>
                </div>
              </div>

              {/* Right Column: Verifikator Keuangan & PPK (nempel ke kanan) */}
              <div className="flex flex-col items-end text-left space-y-6">
                <div className="w-56 sm:w-60">
                  <p>Verifikator Keuangan</p>
                  <p>Tanggal:</p>
                  <div className="h-12" />
                  <p className="font-bold">{verifikatorData.name}</p>
                  <p>NIP. {formatNip(verifikatorData.nik)}</p>
                </div>

                <div className="w-56 sm:w-60">
                  <p>{cityDateText}</p>
                  <p>Menyetujui,</p>
                  <p>Pejabat Pembuat Komitmen</p>
                  <p className="italic">Implementing Partner <span className="not-italic">BKSDA KALTIM</span></p>
                  <div className="h-12" />
                  <p className="font-bold">{ppk.name}</p>
                  <p>NIP. {formatNip(ppk.nik)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const BANK_ACCOUNTS: Record<string, { bank: string; accountNo: string; holderName: string }> = {
  "didi susanto": { bank: "Mandiri", accountNo: "1480024359104", holderName: "Didi Susanto" },
  "tegar anugrah": { bank: "Mandiri", accountNo: "1490018015471", holderName: "Tegar Anugrah" },
  "sukma mawarni": { bank: "Mandiri", accountNo: "1490018239012", holderName: "Sukma Mawarni" },
};

function getRecipientBankInfo(name: string) {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(BANK_ACCOUNTS)) {
    if (lower.includes(key)) return val;
  }
  if (lower.includes("uptd") || lower.includes("lab") || lower.includes("kesehatan")) {
    return {
      bank: "BPD Kaltimtara",
      accountNo: "00360012402202040039",
      holderName: "UPTD Lab. Kesehatan Daerah Kota Samarinda",
    };
  }
  return {
    bank: "Mandiri",
    accountNo: "1480024" + String(Math.abs(name.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))).slice(0, 6),
    holderName: name.replace(/,\s*[A-Za-z\.\s]+$/, "").trim(),
  };
}

function calculateDays(startDate?: string, endDate?: string): number {
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    if (diff > 0) return diff;
  }
  return 8;
}

function formatIndonesianDateRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return "-";
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const sDay = String(s.getDate()).padStart(2, "0");
    const eDay = String(e.getDate()).padStart(2, "0");
    const sMonth = months[s.getMonth()];
    const eMonth = months[e.getMonth()];
    const sYear = s.getFullYear();
    const eYear = e.getFullYear();

    if (sMonth === eMonth && sYear === eYear) {
      return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
    }
    return `${sDay} ${sMonth} ${sYear} - ${eDay} ${eMonth} ${eYear}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
}

function getRecipientExecutionDate(recipient: { name: string; description: string }, travel: { startDate: string; endDate: string }): string {
  const match = recipient.description.match(/tanggal\s+(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i);
  if (match && match[1]) {
    return match[1];
  }
  return formatIndonesianDateRange(travel.startDate, travel.endDate);
}

function formatUraianText(recipient: { name: string; description: string }): string {
  let desc = recipient.description.trim();
  if (!desc.toLowerCase().startsWith("pembayaran biaya")) {
    desc = `Pembayaran Biaya ${desc}`;
  }
  if (!desc.toLowerCase().includes("atas nama") && !desc.toLowerCase().includes("a.n ")) {
    desc = `${desc} atas nama ${recipient.name}`;
  }
  return desc;
}

function DaftarIsianPreview({ recipients, activity, travel }: Omit<Props, "selectedDocument" | "sptNumber" | "ppk" | "pdo" | "total">) {
  return (
    <div id="daftar-isian-print-root" className="daftar-isian-print-root font-['Figtree',sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .daftar-isian-print-root, .daftar-isian-paper, .daftar-isian-paper * {
          font-family: 'Figtree', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm 10mm 8mm 10mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          .daftar-isian-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .daftar-isian-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Figtree', sans-serif !important;
          }
          table.daftar-isian-table {
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-family: 'Figtree', sans-serif !important;
          }
          table.daftar-isian-table th,
          table.daftar-isian-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
          table.daftar-isian-meta {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          table.daftar-isian-meta td {
            border: 1px solid #000 !important;
          }
        }
      `}</style>

      <div className="daftar-isian-paper mx-auto w-full max-w-[297mm] bg-white p-6 md:p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[8.5pt] leading-normal font-['Figtree',sans-serif]">
        {/* Title */}
        <h1 className="text-center text-[11pt] font-bold tracking-tight mb-4">
          Daftar Rincian Permintaan Pembayaran
        </h1>

        {/* Top Metadata Table */}
        <table className="daftar-isian-meta w-full border-collapse border border-black text-[8.5pt]">
          <tbody>
            <tr>
              <td className="w-48 border border-black px-2.5 py-1 font-normal bg-white">Kode Kegiatan</td>
              <td className="border border-black px-2.5 py-1 font-normal">{activity.awpCode}</td>
            </tr>
            <tr>
              <td className="w-48 border border-black px-2.5 py-1 font-normal bg-white">Nama Kegiatan</td>
              <td className="border border-black px-2.5 py-1 font-normal">{activity.name}</td>
            </tr>
            <tr>
              <td className="w-48 border border-black px-2.5 py-1 font-normal bg-white">Kode Sub Kegiatan</td>
              <td className="border border-black px-2.5 py-1 font-normal">&nbsp;</td>
            </tr>
            <tr>
              <td className="w-48 border border-black px-2.5 py-1 font-normal bg-white">Nama Sub Kegiatan</td>
              <td className="border border-black px-2.5 py-1 font-normal">&nbsp;</td>
            </tr>
            <tr>
              <td className="w-48 border border-black px-2.5 py-1 font-normal bg-white">Uraian Kegiatan</td>
              <td className="border border-black px-2.5 py-1 font-normal">&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* Main Table */}
        <div className="mt-5">
          <table className="daftar-isian-table w-full border-collapse border border-black text-[8pt] leading-snug">
            <colgroup>
              <col style={{ width: "3.5%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "26.5%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "3%" }} />
              <col style={{ width: "3%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead>
              <tr className="bg-[#d9d9d9] print:bg-[#d9d9d9] text-center font-bold">
                <th className="border border-black px-1 py-2 align-middle">No</th>
                <th className="border border-black px-1.5 py-2 align-middle">Nama</th>
                <th className="border border-black px-1.5 py-2 align-middle">Nomor Rekening</th>
                <th className="border border-black px-1.5 py-2 align-middle">Nama Bank</th>
                <th className="border border-black px-1.5 py-2 align-middle">Rekening Atas Nama</th>
                <th className="border border-black px-2 py-2 align-middle">Uraian</th>
                <th className="border border-black px-1.5 py-2 align-middle">Tanggal Pelaksanaan</th>
                <th className="border border-black px-1.5 py-2 align-middle">Nilai SPJ</th>
                <th className="border border-black px-1 py-2 align-middle">PPN</th>
                <th className="border border-black px-1 py-2 align-middle">PPh</th>
                <th className="border border-black px-1.5 py-2 align-middle">Jumlah Dibayarkan</th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((recipient, index) => {
                const defaultBankInfo = getRecipientBankInfo(recipient.name);
                const accountNo = recipient.accountNo || defaultBankInfo.accountNo;
                const bankName = recipient.bankName || defaultBankInfo.bank;
                const holderName = recipient.accountHolder || defaultBankInfo.holderName;
                const execDate = getRecipientExecutionDate(recipient, travel);
                const formattedUraian = formatUraianText(recipient);
                return (
                  <tr key={recipient.id || index}>
                    <td className="border border-black px-1 py-2 text-center align-top">{index + 1}</td>
                    <td className="border border-black px-1.5 py-2 align-top">{recipient.name}</td>
                    <td className="border border-black px-1.5 py-2 text-center font-mono align-top">{accountNo}</td>
                    <td className="border border-black px-1.5 py-2 text-center align-top">{bankName}</td>
                    <td className="border border-black px-1.5 py-2 align-top">{holderName}</td>
                    <td className="border border-black px-2 py-2 text-justify align-top">{formattedUraian}</td>
                    <td className="border border-black px-1.5 py-2 text-center align-top">{execDate}</td>
                    <td className="border border-black px-1.5 py-2 text-right font-mono align-top">{formatNumber(recipient.amount)}</td>
                    <td className="border border-black px-1 py-2 text-center align-top">-</td>
                    <td className="border border-black px-1 py-2 text-center align-top">-</td>
                    <td className="border border-black px-1.5 py-2 text-right font-mono align-top">{formatNumber(recipient.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const RECIPIENT_NIP: Record<string, string> = {
  "didi susanto": "19880719 202012 1 003",
  "tegar anugrah": "19990707 202506 1 006",
  "sukma mawarni": "19930425 202421 2 053",
};

function getReceiverInfo(recipient: { name: string; id: string; description: string; nip?: string }) {
  if (recipient.nip && recipient.nip.trim()) {
    return {
      name: recipient.name,
      nip: formatNip(recipient.nip.trim()),
    };
  }
  if (recipient.description.toLowerCase().includes("a.n didi susanto")) {
    return {
      name: "Didi Susanto, S.Si.",
      nip: "19880719 202012 1 003",
    };
  }
  const lower = recipient.name.toLowerCase();
  for (const [key, nip] of Object.entries(RECIPIENT_NIP)) {
    if (lower.includes(key)) return { name: recipient.name, nip: formatNip(nip) };
  }
  return {
    name: recipient.name,
    nip: recipient.id.startsWith("employee-") ? "19880719 202012 1 003" : "-",
  };
}

export const PEJABAT_MENGETAHUI_OPTIONS: MengetahuiOfficial[] = [
  {
    position: "Kepala Seksi KSDA Wilayah II",
    name: "Suriawati Halim, S.Hut., M.P.",
    nik: "19751127 200003 2 001",
  },
  {
    position: "Kepala Subbagian Tata Usaha",
    name: "Dheny Mardiono, S.Hut., MSc.",
    nik: "19750314 199903 1 004",
  },
  {
    position: "Kepala Seksi KSDA Wilayah I",
    name: "Yulian Sadono, S.Hut., M.T.",
    nik: "19800707 200604 1 003",
  },
  {
    position: "Kepala Seksi KSDA Wilayah III",
    name: "Bambang Hari Trimarsito, S.Si., M.P.",
    nik: "19740626 200112 1 004",
  },
];

function getMengetahuiOfficial(recipient: Recipient) {
  if (recipient.mengetahui && recipient.mengetahui.name) {
    return recipient.mengetahui;
  }

  const lowerName = (recipient.name || "").toLowerCase();
  const lowerUnit = (recipient.satuanKerja || "").toLowerCase();
  const lowerDesc = (recipient.description || "").toLowerCase();

  // If employee is Subbag TU / Balai Samarinda (Menik, Tegar, Sukma, Dilemma, dll.)
  if (
    lowerName.includes("menik") ||
    lowerName.includes("tegar") ||
    lowerName.includes("sukma") ||
    lowerName.includes("dilemma") ||
    lowerUnit.includes("tata usaha") ||
    lowerUnit.includes("subbag tu") ||
    lowerUnit.includes("balai") ||
    lowerDesc.includes("tata usaha")
  ) {
    return PEJABAT_MENGETAHUI_OPTIONS[1]; // Dheny Mardiono, S.Hut., MSc. (Kepala Subbagian Tata Usaha)
  }

  // If employee is Seksi Wilayah I / Berau
  if (lowerUnit.includes("wilayah i") || lowerUnit.includes("wil 1") || lowerUnit.includes("berau")) {
    return PEJABAT_MENGETAHUI_OPTIONS[2]; // Yulian Sadono, S.Hut., M.T. (Kepala Seksi KSDA Wilayah I)
  }

  // If employee is Seksi Wilayah III / Balikpapan
  if (lowerUnit.includes("wilayah iii") || lowerUnit.includes("wil 3") || lowerUnit.includes("balikpapan")) {
    return PEJABAT_MENGETAHUI_OPTIONS[3]; // Bambang Hari Trimarsito, S.Si., M.P. (Kepala Seksi KSDA Wilayah III)
  }

  // Default for Seksi Wilayah II / Jono / Didi / Tenggarong / Kutai Barat
  return PEJABAT_MENGETAHUI_OPTIONS[0]; // Suriawati Halim, S.Hut., M.P. (Kepala Seksi KSDA Wilayah II)
}

function KuitansiPreview({ recipients, activity, ppk, pdo }: Omit<Props, "selectedDocument" | "travel" | "total">) {
  return (
    <div id="kuitansi-print-root" className="kuitansi-print-root font-['Figtree',sans-serif] space-y-8 print:space-y-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .kuitansi-print-root, .kuitansi-paper, .kuitansi-paper * {
          font-family: 'Figtree', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 10mm 15mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          .kuitansi-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .kuitansi-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 0 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Figtree', sans-serif !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .kuitansi-paper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {recipients.map((recipient, index) => {
        const receiver = getReceiverInfo(recipient);
        const mengetahui = getMengetahuiOfficial(recipient);
        const cleanDescription = recipient.description.replace(/^Pembayaran Biaya\s*/i, "").trim();
        const evidenceDisplay = recipient.evidence?.trim() || `/K.18/FOLU.NC-23/08/2026`;

        return (
          <div
            key={recipient.id || index}
            className="kuitansi-paper mx-auto w-full max-w-[210mm] bg-white p-6 md:p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[9pt] leading-normal font-['Figtree',sans-serif]"
          >
            {/* Outer Box with Border */}
            <div className="border border-black">
              {/* Header Title */}
              <div className="border-b border-black py-2 text-center">
                <h1 className="text-[11pt] font-bold uppercase tracking-wide">
                  KUITANSI PEMBAYARAN
                </h1>
              </div>

              {/* Kotak Kanan Atas (Metadata) */}
              <div className="p-3 border-b border-black flex justify-end">
                <div className="border border-black p-2 w-full max-w-[360px] text-[8.5pt]">
                  <div className="grid grid-cols-[80px_8px_1fr] gap-y-1 items-start">
                    <span>TA</span>
                    <span>:</span>
                    <span>2026</span>

                    <span>Nomor Bukti</span>
                    <span>:</span>
                    <span className="font-mono whitespace-nowrap text-[8pt]">
                      {recipient.evidence?.trim() ? (
                        recipient.evidence.trim().startsWith("/") ? (
                          <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{recipient.evidence.trim()}</>
                        ) : (
                          recipient.evidence.trim()
                        )
                      ) : (
                        <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/K.18/FOLU.NC-23/08/2026</>
                      )}
                    </span>

                    <span>Kode AWP</span>
                    <span>:</span>
                    <span>{activity.awpCode}</span>

                    <span>Kegiatan</span>
                    <span>:</span>
                    <span className="leading-tight">{activity.name}</span>
                  </div>
                </div>
              </div>

              {/* Sub Header */}
              <div className="border-b border-black py-1.5 text-center">
                <h2 className="text-[10pt] font-bold uppercase tracking-wide">
                  KUITANSI / BUKTI PEMBAYARAN
                </h2>
              </div>

              {/* Body Fields */}
              <div className="p-4 space-y-3 text-[9pt]">
                <div className="grid grid-cols-[140px_10px_1fr] gap-y-2.5">
                  <span className="font-normal">Sudah Terima dari</span>
                  <span>:</span>
                  <div className="leading-snug">
                    Pejabat Pembuat Komitmen FOLU RBC NC 2&3<br />
                    IP BKSDA Kalimantan Timur T.A. 2026
                  </div>

                  <span className="font-normal">Jumlah uang</span>
                  <span>:</span>
                  <div className="font-normal">
                    Rp. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>{formatNumber(recipient.amount)}</b> &nbsp;&nbsp; ,-
                  </div>

                  <span className="font-normal">Terbilang</span>
                  <span>:</span>
                  <div className="italic">
                    {words(recipient.amount)}
                  </div>

                  <span className="font-normal">Untuk pembayaran</span>
                  <span>:</span>
                  <div className="text-justify leading-snug">
                    {cleanDescription}
                  </div>
                </div>

                {/* Receiver Signature (Yang Menerima - Kanan) */}
                <div className="pt-4 flex justify-end">
                  <div className="w-56 text-left">
                    <p>Samarinda,</p>
                    <p>Yang menerima</p>
                    <div className="h-16" />
                    <p className="font-bold">{receiver.name}</p>
                    <p>NIP. {receiver.nip}</p>
                  </div>
                </div>
              </div>

              {/* Middle 2-Column Signatures */}
              <div className="border-t border-black grid grid-cols-2 text-[9pt]">
                {/* Left: PPK */}
                <div className="border-r border-black p-3 flex flex-col justify-between">
                  <div>
                    <p>Setuju dibebankan pada mata anggaran berkenaan</p>
                    <p>An. Kuasa Pengguna Anggaran</p>
                    <p>Pejabat Pembuat Komitmen,</p>
                    <div className="h-16" />
                    <p className="font-bold">{ppk.name}</p>
                    <p>NIP. {formatNip(ppk.nik)}</p>
                  </div>
                </div>

                {/* Right: PDO */}
                <div className="p-3 flex flex-col justify-between">
                  <div>
                    <p>Lunas dibayar</p>
                    <p>Pada tanggal.</p>
                    <p>Pemegang Dana Operasional</p>
                    <div className="h-16" />
                    <p className="font-bold">{pdo.name || "Dilemma Ferti Hidayah, S.E."}</p>
                    <p>NIP. {formatNip(pdo.nik || "19870130 201012 2 005")}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Signature: Mengetahui */}
              <div className="border-t border-black p-3 text-[9pt]">
                <p>Barang/pekerjaan tersebut telah diterima/diselesaikan dengan lengkap dan baik</p>
                <p>Mengetahui</p>
                <p>{mengetahui.position}</p>
                <div className="h-14" />
                <p className="font-bold">{mengetahui.name}</p>
                <p>NIP. {formatNip(mengetahui.nik)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getRinbaBreakdown(recipient: { name: string; amount: number; rinba?: RinbaDetails }, travel: { origin: string; destination: string }) {
  if (recipient.rinba) {
    const operasionalDays = recipient.rinba.operasionalDays || 8;
    const operasionalDailyRate = recipient.rinba.operasionalDailyRate || 360000;
    const operasionalTotal = operasionalDays * operasionalDailyRate;
    const transportItems = recipient.rinba.transportItems || [];
    const total = recipient.amount || (operasionalTotal + transportItems.reduce((sum, item) => sum + item.amount, 0));

    return {
      operasionalDays,
      operasionalDailyRate,
      operasionalTotal,
      transportItems,
      total,
    };
  }

  const total = recipient.amount;
  const operasionalDays = 8;
  const operasionalDailyRate = 360000;
  const operasionalTotal = Math.min(total, operasionalDays * operasionalDailyRate);
  const transportTotal = Math.max(0, total - operasionalTotal);

  let transportItems: Array<{ amount: number; label: string }> = [];

  if (transportTotal === 2710000 || recipient.name.toLowerCase().includes("didi")) {
    transportItems = [
      { amount: 200000, label: "Transportasi Samarinda ke Kab. Kubar" },
      { amount: 510000, label: "Transportasi Kab. Kubar ke Samarinda" },
      { amount: 1000000, label: "Transportasi Melak ke SM Kelian" },
      { amount: 1000000, label: "Transportasi SM Kelian ke Melak" },
    ];
  } else if (transportTotal === 710000 || recipient.name.toLowerCase().includes("tegar")) {
    transportItems = [
      { amount: 200000, label: "Transportasi Samarinda ke Kab. Kubar" },
      { amount: 510000, label: "Transportasi Kab. Kubar ke Samarinda" },
    ];
  } else if (transportTotal > 0) {
    if (transportTotal <= 710000) {
      const p1 = Math.min(200000, Math.round(transportTotal * 0.3));
      transportItems = [
        { amount: p1, label: `Transportasi ${travel.origin || "Samarinda"} ke ${travel.destination || "Kab. Kubar"}` },
        { amount: transportTotal - p1, label: `Transportasi ${travel.destination || "Kab. Kubar"} ke ${travel.origin || "Samarinda"}` },
      ];
    } else {
      const p1 = 200000;
      const p2 = 510000;
      const rem = transportTotal - p1 - p2;
      const halfRem = Math.round(rem / 2);
      transportItems = [
        { amount: p1, label: `Transportasi ${travel.origin || "Samarinda"} ke ${travel.destination || "Kab. Kubar"}` },
        { amount: p2, label: `Transportasi ${travel.destination || "Kab. Kubar"} ke ${travel.origin || "Samarinda"}` },
        { amount: halfRem, label: `Transportasi Melak ke SM Kelian` },
        { amount: rem - halfRem, label: `Transportasi SM Kelian ke Melak` },
      ];
    }
  }

  return {
    operasionalDays,
    operasionalDailyRate,
    operasionalTotal,
    transportItems,
    total,
  };
}

function RinbaPreview({ recipients, travel, sptNumber, ppk, pdo, spdNumber }: Omit<Props, "selectedDocument" | "activity" | "total">) {
  const employeeRecipients = recipients.filter((recipient) => recipient.id.startsWith("employee-") || !recipient.id.startsWith("external-"));
  const rawSuffix = spdNumber?.suffix?.trim() || (sptNumber ? `/${sptNumber.replace(/^.*?\//, "")}` : "/K.18-TU/FOLU.NC-23/04/2026");
  const cleanSuffix = rawSuffix.startsWith("/") ? rawSuffix : `/${rawSuffix}`;
  const noDisplay = spdNumber?.no?.trim() ? spdNumber.no.trim() : "                                ";

  return (
    <div id="rinba-print-root" className="rinba-print-root font-['Figtree',sans-serif] space-y-8 print:space-y-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .rinba-print-root, .rinba-paper, .rinba-paper * {
          font-family: 'Figtree', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 15mm 10mm 15mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          .rinba-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .rinba-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 0 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Figtree', sans-serif !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .rinba-paper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {employeeRecipients.map((recipient, index) => {
        const receiver = getReceiverInfo(recipient);
        const breakdown = getRinbaBreakdown(recipient, travel);
        const travelStartDate = travel.startDate ? new Date(travel.startDate) : new Date(2026, 6, 9);
        const padDate = String(travelStartDate.getDate()).padStart(2, "0");
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tanggalSpd = `${padDate} ${months[travelStartDate.getMonth()]} ${travelStartDate.getFullYear()}`;

        return (
          <div
            key={recipient.id || index}
            className="rinba-paper mx-auto w-full max-w-[210mm] bg-white p-6 md:p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[9pt] leading-normal font-['Figtree',sans-serif]"
          >
            {/* Title */}
            <div className="text-center mb-4">
              <h1 className="text-[11pt] font-bold uppercase tracking-wide">
                RINCIAN BIAYA PERJALANAN DINAS
              </h1>
            </div>

            {/* Top Metadata */}
            <div className="mb-3 grid grid-cols-[150px_10px_1fr] text-[8.5pt] gap-y-1">
              <span>Lampiran SPD Nomor</span>
              <span>:</span>
              <span>
                SPD. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{spdNumber?.no?.trim() || ""}{cleanSuffix}
              </span>

              <span>Tanggal</span>
              <span>:</span>
              <span>{tanggalSpd}</span>
            </div>

            {/* Main Table */}
            <div className="border border-black">
              <table className="w-full border-collapse text-[8.5pt]">
                <colgroup>
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "32%" }} />
                  <col style={{ width: "23%" }} />
                  <col style={{ width: "40%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-black text-center font-bold">
                    <th className="border-r border-black p-1.5 align-middle">NO.</th>
                    <th className="border-r border-black p-1.5 align-middle">PERINCIAN BIAYA</th>
                    <th className="border-r border-black p-1.5 align-middle">JUMLAH</th>
                    <th className="p-1.5 align-middle">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Operasional Pengamanan Hutan */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-2 text-center align-top font-normal">1.</td>
                    <td className="border-r border-black p-2 align-top">
                      <p className="font-normal">Operasional Pengamanan Hutan</p>
                      <p className="font-normal">{breakdown.operasionalDays} x Rp. {formatNumber(breakdown.operasionalDailyRate)},-</p>
                    </td>
                    <td className="border-r border-black p-2 align-top">
                      <div className="flex justify-between font-mono">
                        <span>Rp.</span>
                        <span>{formatNumber(breakdown.operasionalTotal)}</span>
                      </div>
                    </td>
                    <td className="p-2 align-top" />
                  </tr>

                  {/* Row 2: Transportasi */}
                  <tr className="border-b border-black">
                    <td className="border-r border-black p-2 text-center align-top font-normal">2.</td>
                    <td className="border-r border-black p-2 align-top font-normal">
                      Transportasi
                    </td>
                    <td className="border-r border-black p-2 align-top space-y-1">
                      {breakdown.transportItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between font-mono">
                          <span>Rp.</span>
                          <span>{formatNumber(item.amount)}</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-2 align-top space-y-1">
                      {breakdown.transportItems.map((item, idx) => (
                        <p key={idx}>{item.label}</p>
                      ))}
                    </td>
                  </tr>

                  {/* Total Row */}
                  <tr className="border-b border-black font-bold">
                    <td colSpan={2} className="border-r border-black p-2 text-left">
                      JUMLAH :
                    </td>
                    <td className="border-r border-black p-2">
                      <div className="flex justify-between font-mono">
                        <span>Rp.</span>
                        <span>{formatNumber(recipient.amount)}</span>
                      </div>
                    </td>
                    <td className="p-2" />
                  </tr>
                </tbody>
              </table>

              {/* Terbilang */}
              <div className="p-2 text-[8.5pt]">
                <span className="font-bold">TERBILANG : </span>
                <span className="italic font-bold ml-2">{words(recipient.amount)}</span>
              </div>
            </div>

            {/* Middle Signatures */}
            <div className="mt-5 grid grid-cols-2 text-[9pt]">
              {/* Left: PDO */}
              <div className="space-y-1">
                <p className="invisible select-none" aria-hidden="true">&nbsp;</p>
                <p>Telah dibayar sejumlah</p>
                <div className="flex items-center gap-6 font-mono font-normal">
                  <span>Rp.</span>
                  <span>{formatNumber(recipient.amount)}</span>
                </div>
                <div className="h-4" />
                <p>Pemegang Dana Operasional,</p>
                <div className="h-14" />
                <p className="font-bold">{pdo.name || "Dilemma Ferti Hidayah, S.E."}</p>
                <p>NIP. {formatNip(pdo.nik || "19870130 201012 2 005")}</p>
              </div>

              {/* Right: Receiver */}
              <div className="space-y-1">
                <p>Samarinda,</p>
                <p>Telah menerima jumlah uang sebesar :</p>
                <div className="flex items-center gap-6 font-mono font-normal">
                  <span>Rp.</span>
                  <span>{formatNumber(recipient.amount)}</span>
                </div>
                <div className="h-4" />
                <p>Yang menerima,</p>
                <div className="h-14" />
                <p className="font-bold">{receiver.name}</p>
                <p>NIP. {formatNip(receiver.nip)}</p>
              </div>
            </div>

            {/* Bottom Calculation Table */}
            <div className="mt-6 border-t border-black pt-2 text-[9pt]">
              <h3 className="text-center font-bold uppercase tracking-wide mb-3">
                PERHITUNGAN SPD RAMPUNG
              </h3>
              <div className="grid grid-cols-[180px_20px_90px_1fr] gap-y-1">
                <span>Ditetapkan sejumlah</span>
                <span>Rp</span>
                <span className="font-mono">{formatNumber(recipient.amount)}</span>
                <span className="italic">{words(recipient.amount)}</span>

                <span>Yang telah dibayar semula</span>
                <span>Rp</span>
                <span className="font-mono">{formatNumber(recipient.amount)}</span>
                <span className="italic">{words(recipient.amount)}</span>

                <span>Sisa kurang / lebih</span>
                <span>Rp</span>
                <span>-</span>
                <span />
              </div>

              {/* PPK Signature */}
              <div className="mt-4 flex justify-end text-[9pt]">
                <div className="w-64 text-left">
                  <p>Pejabat Pembuat Komitmen,</p>
                  <p className="italic">Implementing Partner <span className="not-italic">BKSDA KALTIM</span></p>
                  <div className="h-14" />
                  <p className="font-bold">{ppk.name}</p>
                  <p>NIP. {formatNip(ppk.nik)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getEmployeeSpdInfo(recipient: Recipient, travel: { origin: string; destination: string }) {
  const emp = MOCK_EMPLOYEES.find((e) => e.name.toLowerCase().includes(recipient.name.toLowerCase().split(",")[0]));
  const receiver = getReceiverInfo(recipient);

  let origin = travel.origin || "Samarinda";
  if (recipient.name.toLowerCase().includes("didi") || recipient.description.toLowerCase().includes("tenggarong")) {
    origin = "Tenggarong";
  } else if (recipient.name.toLowerCase().includes("tegar") || recipient.description.toLowerCase().includes("samarinda")) {
    origin = "Samarinda";
  }

  return {
    name: receiver.name,
    nip: receiver.nip,
    rank: recipient.rank?.trim() || emp?.rank || "Penata Muda (III/a)",
    position: recipient.position?.trim() || emp?.position || "Polisi Kehutanan",
    tingkatBiaya: "D",
    origin: origin,
    destination: travel.destination || "Kabupaten Kutai Barat",
  };
}

function formatSingleDate(dateStr: string): string {
  if (!dateStr) return "-";
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function SpdPreview({ recipients, activity, travel, sptNumber, ppk, spdNumber, spdConfig }: { recipients: Props["recipients"]; activity: Props["activity"]; travel: Props["travel"]; sptNumber: string; ppk: Official; spdNumber?: { no?: string; suffix?: string }; spdConfig?: SpdConfig }) {
  const employeeRecipients = recipients.filter((recipient) => recipient.id.startsWith("employee-") || !recipient.id.startsWith("external-"));
  const rawSuffix = spdNumber?.suffix?.trim() || (sptNumber ? `/${sptNumber.replace(/^.*?\//, "")}` : "/K.18-TU/FOLU.NC-23/04/2026");
  const cleanSuffix = rawSuffix.startsWith("/") ? rawSuffix : `/${rawSuffix}`;
  const noDisplay = spdNumber?.no?.trim() ? spdNumber.no.trim() : "                                ";

  return (
    <div id="spd-print-root" className="spd-print-root font-['Figtree',sans-serif] space-y-8 print:space-y-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .spd-print-root, .spd-paper, .spd-paper * {
          font-family: 'Figtree', sans-serif !important;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm 8mm 12mm !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, nav, aside, footer, button, .print\\:hidden, [role="navigation"], [data-sonner-toaster], [data-sonner-toast] {
            display: none !important;
          }
          .spd-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .spd-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 0 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-family: 'Figtree', sans-serif !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .spd-paper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {employeeRecipients.map((recipient, index) => {
        const spdInfo = getEmployeeSpdInfo(recipient, travel);
        const travelStartDate = travel.startDate ? new Date(travel.startDate) : new Date(2026, 6, 9);
        const padDate = String(travelStartDate.getDate()).padStart(2, "0");
        const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const tanggalSpd = `${padDate} ${months[travelStartDate.getMonth()]} ${travelStartDate.getFullYear()}`;
        const tglBerangkat = formatSingleDate(travel.startDate || "2026-07-10");
        const tglKembali = formatSingleDate(travel.endDate || "2026-07-17");
        const daysCount = recipient.rinba?.operasionalDays || calculateDays(travel.startDate, travel.endDate);
        const rawMaksud = recipient.description
          ? recipient.description.replace(/^Biaya\s+/i, "")
          : `Perjalanan dinas dari ${spdInfo.origin} ke ${spdInfo.destination} dalam rangka kegiatan ${activity.name}`;
        const cleanMaksudCore = rawMaksud
          .replace(/,?\s+selama\s+\d+.*$/i, "")
          .replace(/,?\s+terhitung\s+mulai.*$/i, "")
          .trim();
        const maksudPerjalanan = cleanMaksudCore.endsWith(".") ? cleanMaksudCore : `${cleanMaksudCore}.`;

        return (
          <div
            key={recipient.id || index}
            className="spd-paper mx-auto w-full max-w-[210mm] bg-white p-6 md:p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[8.5pt] leading-tight font-['Figtree',sans-serif]"
          >
            {/* Top Header */}
            <div>
              {/* Logo */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo_kemenhut.png"
                alt="Logo Kemenhut"
                className="h-11 w-auto mb-1.5 object-contain"
              />

              {/* Ministry Text & Right Metadata aligned horizontally */}
              <div className="flex items-start justify-between">
                {/* Left: Ministry Text */}
                <div className="font-bold text-[8.5pt] leading-snug uppercase">
                  <p>KEMENTERIAN KEHUTANAN</p>
                  <p>DITJEN KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</p>
                  <p>BALAI KSDA KALIMANTAN TIMUR</p>
                </div>

                {/* Right: Lembar ke / Kode No / Nomor */}
                <div className="text-[8.5pt] leading-snug w-36">
                  <div className="grid grid-cols-[65px_10px_1fr]">
                    <span>Lembar ke</span>
                    <span>:</span>
                    <span />
                    <span>Kode No</span>
                    <span>:</span>
                    <span />
                    <span>Nomor</span>
                    <span>:</span>
                    <span />
                  </div>
                </div>
              </div>
            </div>

            {/* Title & SPD Number */}
            <div className="text-center my-3">
              <h1 className="text-[11pt] font-bold uppercase tracking-wide">
                SURAT PERJALANAN DINAS (SPD)
              </h1>
              <p className="text-[8.5pt] mt-0.5 font-normal">
                Nomor : SPD. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{spdNumber?.no?.trim() || ""}{cleanSuffix}
              </p>
            </div>

            {/* Main 10-Row Table */}
            <table className="w-full border-collapse border border-black text-[8.5pt] leading-tight">
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "56%" }} />
              </colgroup>
              <tbody>
                {/* Row 1 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">1</td>
                  <td className="border-r border-black p-1.5 align-top">Pejabat Pembuat Komitmen</td>
                  <td className="p-1.5 align-top">
                    {spdConfig?.ppkPoin1Text?.trim() || "FOLU RBC NC 2&3 IP BKSDA KALTIM TA 2026"}
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">2</td>
                  <td className="border-r border-black p-1.5 align-top">
                    Nama pegawai yang melaksanakan perjalanan dinas<br />
                    NIP.
                  </td>
                  <td className="p-1.5 align-top">
                    <b>{spdInfo.name}</b><br />
                    {spdInfo.nip}
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">3</td>
                  <td className="border-r border-black p-1.5 align-top">
                    a. Pangkat dan Golongan<br />
                    b. Jabatan / Instansi<br />
                    c. Tingkat Biaya Perjalanan Dinas
                  </td>
                  <td className="p-1.5 align-top">
                    a. {spdInfo.rank}<br />
                    b. {spdInfo.position}<br />
                    c. {spdInfo.tingkatBiaya}
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">4</td>
                  <td className="border-r border-black p-1.5 align-top">Maksud perjalanan dinas</td>
                  <td className="p-1.5 align-top text-justify">
                    {maksudPerjalanan}
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">5</td>
                  <td className="border-r border-black p-1.5 align-top">Alat angkutan yang dipergunakan</td>
                  <td className="p-1.5 align-top">Kendaraan Umum</td>
                </tr>

                {/* Row 6 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">6</td>
                  <td className="border-r border-black p-1.5 align-top">
                    a. Tempat berangkat<br />
                    b. Tempat tujuan
                  </td>
                  <td className="p-1.5 align-top">
                    a. {spdInfo.origin}<br />
                    b. {spdInfo.destination}
                  </td>
                </tr>

                {/* Row 7 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">7</td>
                  <td className="border-r border-black p-1.5 align-top">
                    a. Lamanya perjalanan dinas<br />
                    b. Tanggal berangkat<br />
                    c. Tanggal harus kembali / tiba di tempat baru *)
                  </td>
                  <td className="p-1.5 align-top">
                    a. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {daysCount} Hari<br />
                    b. {tglBerangkat}<br />
                    c. {tglKembali}
                  </td>
                </tr>

                {/* Row 8: Pengikut (Aligned with Main Table Columns) */}
                <tr className="border-b border-black">
                  <td rowSpan={4} className="border-r border-black p-1.5 text-center align-top">8</td>
                  <td className="border-r border-black p-1.5 text-left">Pengikut : &nbsp;&nbsp;&nbsp;&nbsp; Nama</td>
                  <td className="p-0">
                    <div className="grid grid-cols-2 text-center">
                      <span className="border-r border-black p-1.5">Tanggal Lahir</span>
                      <span className="p-1.5">Keterangan</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2 py-0.5">1. &nbsp;&nbsp;&nbsp;&nbsp; -</td>
                  <td className="p-0">
                    <div className="grid grid-cols-2 text-center">
                      <span className="border-r border-black px-2 py-0.5">-</span>
                      <span className="px-2 py-0.5">-</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2 py-0.5">2.</td>
                  <td className="p-0">
                    <div className="grid grid-cols-2 text-center">
                      <span className="border-r border-black px-2 py-0.5">&nbsp;</span>
                      <span className="px-2 py-0.5">&nbsp;</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border-r border-black px-2 py-0.5">3.</td>
                  <td className="p-0">
                    <div className="grid grid-cols-2 text-center">
                      <span className="border-r border-black px-2 py-0.5">&nbsp;</span>
                      <span className="px-2 py-0.5">&nbsp;</span>
                    </div>
                  </td>
                </tr>

                {/* Row 9 */}
                <tr className="border-b border-black">
                  <td className="border-r border-black p-1.5 text-center align-top">9</td>
                  <td className="border-r border-black p-1.5 align-top">
                    Pembebanan anggaran<br /><br />
                    a. Instansi<br />
                    b. Akun
                  </td>
                  <td className="p-1.5 align-top">
                    {spdConfig?.anggaranHeader?.trim() || "Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - TA 2026"}<br /><br />
                    a. {spdConfig?.instansiPoin9a?.trim() || "Balai KSDA Kalimantan Timur"}<br />
                    b. {spdConfig?.akunPoin9b?.trim() ? spdConfig.akunPoin9b.replace("{awpCode}", activity.awpCode) : activity.awpCode}
                  </td>
                </tr>

                {/* Row 10 */}
                <tr>
                  <td className="border-r border-black p-1.5 text-center align-top">10</td>
                  <td className="border-r border-black p-1.5 align-top">Keterangan lain-lain</td>
                  <td className="p-1.5 align-top">
                    <div className="space-y-0.5">
                      <div className="grid grid-cols-[60px_8px_1fr]">
                        <span>a. No. ST</span>
                        <span>:</span>
                        <span className="font-mono">{sptNumber}</span>
                      </div>
                      <div className="grid grid-cols-[60px_8px_1fr]">
                        <span>b. Tgl ST</span>
                        <span>:</span>
                        <span>{tanggalSpd}</span>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Area */}
            <div className="mt-4 flex items-start justify-between text-[8.5pt]">
              <p className="italic text-[8pt]">*) Coret yang tidak perlu</p>

              {/* Right: Signature */}
              <div className="w-64 text-left">
                <div className="grid grid-cols-[80px_8px_1fr] gap-y-0.5">
                  <span>Dikeluarkan di</span>
                  <span>:</span>
                  <span>Samarinda</span>
                  <span>Pada tanggal</span>
                  <span>:</span>
                  <span>{tanggalSpd}</span>
                </div>
                <div className="mt-3">
                  <p>Pejabat Pembuat Komitmen,</p>
                  <p className="italic">Implementing Partner <span className="not-italic">BKSDA Kalimantan Timur</span></p>
                  <div className="h-16" />
                  <p className="font-bold">{ppk.name}</p>
                  <p>NIP. {formatNip(ppk.nik)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
