"use client";

import {
  Props,
  formatNumber,
  getRecipientBankInfo,
  getRecipientExecutionDate,
  formatUraianText,
} from "../shared";

export function DaftarIsianPreview({
  recipients,
  activity,
  travel,
}: Omit<Props, "selectedDocument" | "sptNumber" | "ppk" | "pdo" | "total">) {
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
