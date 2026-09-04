"use client";

import { Props, SATUAN_KERJA, formatNumber, formatNip } from "../shared";

export function RekapPreview({
  recipients,
  activity,
  ppk,
  pdo,
  total,
}: Omit<Props, "selectedDocument" | "sptNumber">) {
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
