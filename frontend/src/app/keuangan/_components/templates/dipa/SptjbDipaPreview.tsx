"use client";

import {
  Props,
  formatNumber,
  formatNip,
  formatFullDateIndonesia,
  getRomanMonth,
  buildDefaultSptjbUraian,
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
  const tanggal = dipaConfig?.spdDate || formatFullDateIndonesia(travel.startDate);
  const romanMonth = getRomanMonth(travel.startDate);
  const currentYear = travel.startDate ? travel.startDate.slice(0, 4) : "2026";
  const evidenceStr = primaryRecipient.evidence
    ? primaryRecipient.evidence
    : `/${romanMonth}/${currentYear}`;

  return (
    <div id="sptjb-dipa-print-root" className="sptjb-dipa-print-root font-['Figtree',sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');
        .sptjb-dipa-print-root, .sptjb-dipa-paper, .sptjb-dipa-paper * {
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
          }
          table.sptjb-dipa-table {
            display: table !important;
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          table.sptjb-dipa-table th, table.sptjb-dipa-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      <div className="sptjb-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none font-['Figtree',sans-serif]">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-[11pt] font-bold uppercase tracking-wider underline inline-block">
            SURAT PERNYATAAN TANGGUNG JAWAB BELANJA
          </h1>
        </div>

        {/* Metadata List */}
        <div className="mt-4 text-[9.5pt] space-y-1">
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
            <span className="font-mono">{dipaConfig?.klasifikasiMak || "7271.REA.001.524111"}</span>
          </div>
          <div className="grid grid-cols-[180px_10px_1fr]">
            <span></span>
            <span>:</span>
            <span className="font-mono">{dipaConfig?.kodeMak || "051.F.077"}</span>
          </div>
        </div>

        {/* Statement */}
        <div className="mt-3 text-[9.5pt] text-justify leading-relaxed">
          <p>
            Yang bertanda tangan dibawah ini atas nama Kuasa Pengguna Anggaran Satuan Kerja Balai Konservasi Sumber Daya Alam Kalimantan Timur, menyatakan bahwa saya bertanggungjawab secara formal dan material atas segala pengeluaran yang telah dibayar lunas oleh Bendahara Pengeluaran kepada yang berhak menerima serta kebenaran perhitungan dan setoran pajak yang telah dipungut atas pembayaran tersebut dengan perincian sebagai berikut :
          </p>
        </div>

        {/* Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="sptjb-dipa-table w-full border-collapse border border-black text-[8.5pt]">
            <thead>
              <tr className="bg-slate-50 text-center font-bold">
                <th className="border border-black p-1.5 w-8" rowSpan={2}>No</th>
                <th className="border border-black p-1.5 w-36" rowSpan={2}>Penerima</th>
                <th className="border border-black p-1.5" rowSpan={2}>Uraian</th>
                <th className="border border-black p-1 w-32" colSpan={2}>Bukti</th>
                <th className="border border-black p-1.5 w-24" rowSpan={2}>Jumlah (Rp.)</th>
                <th className="border border-black p-1 w-32" colSpan={2}>Pajak Yang Dipungut Bendahara Pengeluaran</th>
              </tr>
              <tr className="bg-slate-50 text-center font-bold text-[8pt]">
                <th className="border border-black p-1 w-16">Tanggal</th>
                <th className="border border-black p-1 w-16">Nomor</th>
                <th className="border border-black p-1 w-16">PPN (Rp.)</th>
                <th className="border border-black p-1 w-16">PPh (Rp.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 text-center align-top">1</td>
                <td className="border border-black p-2 align-top font-semibold">{penerima}</td>
                <td className="border border-black p-2 align-top text-justify leading-relaxed">{uraian}</td>
                <td className="border border-black p-2 text-center align-top">{tanggal}</td>
                <td className="border border-black p-2 text-center align-top font-mono">{evidenceStr}</td>
                <td className="border border-black p-2 text-right align-top font-mono font-semibold">{formatNumber(total)}</td>
                <td className="border border-black p-2 text-center align-top">-</td>
                <td className="border border-black p-2 text-center align-top">-</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td className="border border-black p-1.5 text-center" colSpan={3}>JUMLAH</td>
                <td className="border border-black p-1.5 text-center" colSpan={2}>1 bukti</td>
                <td className="border border-black p-1.5 text-right font-mono">{formatNumber(total)}</td>
                <td className="border border-black p-1.5 text-center">-</td>
                <td className="border border-black p-1.5 text-center">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Closing */}
        <div className="mt-3 text-[9pt] text-justify leading-relaxed space-y-1">
          <p>
            Bukti-bukti pengeluaran anggaran dan asli setoran pajak (SSP/BPN) tersebut disimpan oleh Pengguna Anggaran/Kuasa Pengguna Anggaran untuk kelengkapan Administrasi dan pemeriksaaan aparat pengawas fungsional.
          </p>
          <p>Demikian surat pernyataan ini dibuat dengan sebenarnya.</p>
        </div>

        {/* Signatures */}
        <div className="mt-6 text-[9.5pt]">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: PPK with Samarinda on top */}
            <div className="text-left">
              <p className="mb-1">{dipaConfig?.cityDateText || "Samarinda,"}</p>
              <p className="font-semibold">Pejabat Pembuat Komitmen,</p>
              <div className="h-16" />
              <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
              <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
            </div>

            {/* Right: Bendahara */}
            <div className="text-left">
              <p className="mb-1 opacity-0 select-none">&nbsp;</p>
              <p className="font-semibold">Bendahara Pengeluaran,</p>
              <div className="h-16" />
              <p className="font-bold uppercase">{bendahara.name}</p>
              <p>NIP. {formatNip(bendahara.nik)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
