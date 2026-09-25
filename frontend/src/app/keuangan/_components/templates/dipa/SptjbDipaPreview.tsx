"use client";

import {
  Props,
  formatNumber,
  formatNip,
  formatFullDateIndonesia,
  formatIndoDateOptional,
  getRomanMonth,
  buildDefaultSptjbUraian,
  DEFAULT_DIPA_KLASIFIKASI_MAK,
  computeDipaMak,
  DipaMakItem,
} from "../shared";

export function SptjbDipaPreview({
  recipients,
  activity,
  travel,
  ppk,
  pdo,
  total,
  dipaConfig,
}: Props) {
  const primaryRecipient = recipients[0] || { name: "-", nip: "" };
  const isDkk = recipients.length > 1;
  const penerima = `${primaryRecipient.name}${isDkk ? ", Dkk" : ""}`;
  const uraian =
    dipaConfig?.uraianSptjb ||
    buildDefaultSptjbUraian(travel, recipients.length, dipaConfig?.maksudTujuan || activity.name);

  const bendahara = dipaConfig?.bendahara || pdo || { name: "SOERENDENG, SE", nik: "19790721 200701 2 001" };
  const tanggalSptjb = formatIndoDateOptional(dipaConfig?.sptjbDate);
  const currentRomanMonth = getRomanMonth(new Date());
  const currentYear = new Date().getFullYear().toString();
  const defaultBuktiSptjb = `/${currentRomanMonth}/${currentYear}`;
  const evidenceStr =
    dipaConfig?.buktiSptjb !== undefined
      ? dipaConfig.buktiSptjb
      : defaultBuktiSptjb;

  const autoMak = computeDipaMak(recipients, travel);
  const klasifikasiMak = dipaConfig?.klasifikasiMak || DEFAULT_DIPA_KLASIFIKASI_MAK;
  const makKode = dipaConfig?.kodeMak?.trim() ? dipaConfig.kodeMak.trim() : autoMak.kodeMak;
  const makDesc = dipaConfig?.makDescription?.trim()
    ? dipaConfig.makDescription.trim()
    : dipaConfig?.kodeMak?.trim()
    ? (autoMak.kodeMak === dipaConfig.kodeMak.trim() ? autoMak.description : "")
    : autoMak.description;

  const makItems: DipaMakItem[] =
    dipaConfig?.makItems && dipaConfig.makItems.length === 1
      ? dipaConfig.makItems
      : [
          {
            kodeMak: makKode,
            description: makDesc,
            hasUangHarian: autoMak.hasUangHarian,
            hasPenginapan: autoMak.hasPenginapan,
            hasTransport: autoMak.hasTransport,
          },
        ];

  return (
    <div id="sptjb-dipa-print-root" className="sptjb-dipa-print-root font-['Arial_Narrow',Arial,sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=PT+Sans+Narrow:wght@400;700&display=swap');
        .sptjb-dipa-print-root, .sptjb-dipa-paper, .sptjb-dipa-paper * {
          font-family: 'Arial Narrow', 'PT Sans Narrow', Arial, 'Liberation Sans Narrow', sans-serif !important;
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
          .sptjb-dipa-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .sptjb-dipa-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: 10pt !important;
          }
          table.sptjb-dipa-table {
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 9pt !important;
          }
          table.sptjb-dipa-table th, table.sptjb-dipa-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
            font-size: 9pt !important;
          }
        }
      `}</style>
      <div className="sptjb-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[10pt] leading-normal">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-[10pt] font-bold uppercase tracking-wider underline inline-block">
            SURAT PERNYATAAN TANGGUNG JAWAB BELANJA
          </h1>
        </div>

        {/* Metadata List */}
        <div className="mt-3 text-[10pt] space-y-0.5">
          <div className="grid grid-cols-[180px_10px_1fr]">
            <span>1. Kode Satuan Kerja</span>
            <span>:</span>
            <span>{dipaConfig?.kodeSatker || "143.04.16.693614"}</span>
          </div>
          <div className="grid grid-cols-[180px_10px_1fr]">
            <span>2. Nama Satuan Kerja</span>
            <span>:</span>
            <span>{dipaConfig?.namaSatker || "Balai Konservasi Sumber Daya Alam Kalimantan Timur"}</span>
          </div>
          <div className="grid grid-cols-[180px_10px_1fr]">
            <span>3. Tanggal dan Nomor DIPA</span>
            <span>:</span>
            <span>{dipaConfig?.noSpDipa || "No. SP DIPA- 143.04.2.693614/2025 Tanggal 23 Desember 2025"}</span>
          </div>
          <div className="grid grid-cols-[180px_10px_1fr]">
            <span>4. Klasifikasi Anggaran</span>
            <span>:</span>
            <span className="font-mono">{klasifikasiMak}</span>
          </div>
          {makItems.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[180px_10px_1fr]">
              <span></span>
              <span>:</span>
              <div>
                <span className="font-mono inline-block w-[160px]">{item.kodeMak}</span>
                <span>{item.description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Statement */}
        <div className="mt-2.5 text-[10pt] text-justify leading-relaxed">
          <p>
            Yang bertanda tangan dibawah ini atas nama Kuasa Pengguna Anggaran Satuan Kerja Balai Konservasi Sumber Daya Alam Kalimantan Timur, menyatakan bahwa saya bertanggungjawab secara formal dan material atas segala pengeluaran yang telah dibayar lunas oleh Bendahara Pengeluaran kepada yang berhak menerima serta kebenaran perhitungan dan setoran pajak yang telah dipungut atas pembayaran tersebut dengan perincian sebagai berikut :
          </p>
        </div>

        {/* Table */}
        <div className="mt-2.5 overflow-x-auto">
          <table className="sptjb-dipa-table w-full border-collapse border border-black table-fixed text-[9pt]">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "29%" }} />
              <col style={{ width: "12.5%" }} />
              <col style={{ width: "14.5%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "5%" }} />
              <col style={{ width: "5%" }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 text-center font-bold">
                <th className="border border-black p-1 text-center" rowSpan={2}>No</th>
                <th className="border border-black p-1 text-center" rowSpan={2}>Penerima</th>
                <th className="border border-black p-1 text-center" rowSpan={2}>Uraian</th>
                <th className="border border-black p-1 text-center" colSpan={2}>Bukti</th>
                <th className="border border-black p-1 text-center" rowSpan={2}>Jumlah (Rp.)</th>
                <th className="border border-black p-1 text-center text-[8pt] leading-tight" colSpan={2}>
                  Pajak Yang Dipungut<br />Bendahara Pengeluaran
                </th>
              </tr>
              <tr className="bg-slate-50 text-center font-bold text-[8.5pt]">
                <th className="border border-black p-1 text-center">Tanggal</th>
                <th className="border border-black p-1 text-center">Nomor</th>
                <th className="border border-black p-1 text-center">PPN (Rp.)</th>
                <th className="border border-black p-1 text-center">PPh (Rp.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 text-center align-top">1</td>
                <td className="border border-black p-1 align-top font-semibold">{penerima}</td>
                <td className="border border-black p-1 align-top text-justify leading-snug">{uraian}</td>
                <td className="border border-black p-1 text-center align-top">{tanggalSptjb || ""}</td>
                <td className="border border-black p-1 text-center align-top font-mono">{evidenceStr}</td>
                <td className="border border-black p-1 text-right align-top font-mono font-semibold">{formatNumber(total)}</td>
                <td className="border border-black p-1 text-center align-top">-</td>
                <td className="border border-black p-1 text-center align-top">-</td>
              </tr>
              <tr className="font-bold bg-slate-50 text-[9pt]">
                <td className="border border-black p-1 text-center" colSpan={3}>JUMLAH</td>
                <td className="border border-black p-1 text-center" colSpan={2}>1 bukti</td>
                <td className="border border-black p-1 text-right font-mono">{formatNumber(total)}</td>
                <td className="border border-black p-1 text-center">-</td>
                <td className="border border-black p-1 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing */}
        <div className="mt-2.5 text-[10pt] text-justify leading-relaxed space-y-0.5">
          <p>
            Bukti-bukti pengeluaran anggaran dan asli setoran pajak (SSP/BPN) tersebut disimpan oleh Pengguna Anggaran/Kuasa Pengguna Anggaran untuk kelengkapan Administrasi dan pemeriksaaan aparat pengawas fungsional.
          </p>
          <p>Demikian surat pernyataan ini dibuat dengan sebenarnya.</p>
        </div>

        {/* Signatures */}
        <div className="mt-5 text-[10pt]">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: PPK with Samarinda on top */}
            <div className="text-left">
              <p className="mb-1">{dipaConfig?.cityDateText || "Samarinda,"} {tanggalSptjb || ""}</p>
              <p className="font-semibold">Pejabat Pembuat Komitmen,</p>
              <div className="h-14" />
              <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
              <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
            </div>

            {/* Right: Bendahara */}
            <div className="text-left pl-14 sm:pl-16">
              <p className="mb-1 opacity-0 select-none">&nbsp;</p>
              <p className="font-semibold">Bendahara Pengeluaran,</p>
              <div className="h-14" />
              <p className="font-bold uppercase">{bendahara.name}</p>
              <p>NIP. {formatNip(bendahara.nik)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
