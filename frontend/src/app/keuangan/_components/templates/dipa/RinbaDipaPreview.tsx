"use client";

import {
  Props,
  formatNumber,
  formatNip,
  words,
  calculateDays,
  formatFullDateIndonesia,
} from "../shared";

export function RinbaDipaPreview({
  recipients,
  travel,
  sptNumber,
  ppk,
  pdo,
  spdNumber,
  dipaConfig,
}: Props) {
  const bendahara = dipaConfig?.bendahara || pdo || { name: "SOERENDENG, SE", nik: "19790721 200701 2 001" };
  const tanggalSpd = dipaConfig?.spdDate || formatFullDateIndonesia(travel.startDate);
  const fullSpdNumber = spdNumber?.no ? `SPD. ${spdNumber.no}${spdNumber.suffix || ""}` : `SPD.          ${spdNumber?.suffix || "/K.18-TU/KEU/01/2026"}`;

  return (
    <div id="rinba-dipa-print-root" className="rinba-dipa-print-root font-['Figtree',sans-serif] space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');
        .rinba-dipa-print-root, .rinba-dipa-paper, .rinba-dipa-paper * {
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
          .rinba-dipa-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .rinba-dipa-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 20mm 0 !important;
            page-break-after: always !important;
            box-shadow: none !important;
            border: none !important;
          }
          .rinba-dipa-paper:last-child {
            page-break-after: auto !important;
          }
          table.rinba-dipa-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          table.rinba-dipa-table th, table.rinba-dipa-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      {recipients.map((recipient, idx) => {
        const days = calculateDays(travel.startDate, travel.endDate);
        const dailyRate = recipient.dipa?.uangHarianRate || 360000;
        const uangHarianTotal = (recipient.dipa?.uangHarianDays || days) * dailyRate;
        const transportUdara = recipient.dipa?.transportUdara || 0;
        const taksiPp = recipient.dipa?.taksiPp || 0;
        const penginapan = (recipient.dipa?.penginapanRate || 0) * (recipient.dipa?.penginapanNights || 0);
        const extraItems = recipient.dipa?.extraItems || [];
        const extraTotal = extraItems.reduce((acc, item) => acc + (item.amount || 0), 0);
        const totalAmount = recipient.amount || (uangHarianTotal + transportUdara + taksiPp + penginapan + extraTotal);

        return (
          <div
            key={recipient.id || idx}
            className="rinba-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none font-['Figtree',sans-serif]"
          >
            {/* Title */}
            <div className="text-center">
              <h1 className="text-[11pt] font-bold uppercase tracking-wider">
                RINCIAN BIAYA PERJALANAN DINAS
              </h1>
            </div>

            {/* Header info */}
            <div className="mt-3 text-[9.5pt] space-y-1">
              <div className="grid grid-cols-[150px_10px_1fr]">
                <span>Lampiran SPD Nomor</span>
                <span>:</span>
                <span className="font-mono">{fullSpdNumber}</span>
              </div>
              <div className="grid grid-cols-[150px_10px_1fr]">
                <span>Tanggal</span>
                <span>:</span>
                <span>{tanggalSpd}</span>
              </div>
            </div>

            {/* Table Rincian Biaya */}
            <div className="mt-3">
              <table className="rinba-dipa-table w-full border-collapse border border-black text-[9pt]">
                <thead>
                  <tr className="bg-slate-50 text-center font-bold">
                    <th className="border border-black p-1.5 w-10">NO.</th>
                    <th className="border border-black p-1.5">PERINCIAN BIAYA</th>
                    <th className="border border-black p-1.5 w-36">JUMLAH</th>
                    <th className="border border-black p-1.5 w-32">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-center align-top">1.</td>
                    <td className="border border-black p-2 align-top">
                      Biaya Operasional Pengamanan Hutan / Uang Harian<br />
                      {recipient.dipa?.uangHarianDays || days}x Rp. {formatNumber(dailyRate)},-
                    </td>
                    <td className="border border-black p-2 text-right align-top font-mono">
                      Rp. {formatNumber(uangHarianTotal)}
                    </td>
                    <td className="border border-black p-2 align-top text-center">-</td>
                  </tr>
                  {transportUdara > 0 && (
                    <tr>
                      <td className="border border-black p-2 text-center align-top">2.</td>
                      <td className="border border-black p-2 align-top">Transportasi Udara PP</td>
                      <td className="border border-black p-2 text-right align-top font-mono">
                        Rp. {formatNumber(transportUdara)}
                      </td>
                      <td className="border border-black p-2 align-top text-center">-</td>
                    </tr>
                  )}
                  {taksiPp > 0 && (
                    <tr>
                      <td className="border border-black p-2 text-center align-top">3.</td>
                      <td className="border border-black p-2 align-top">Taksi Bandara / Stasiun PP</td>
                      <td className="border border-black p-2 text-right align-top font-mono">
                        Rp. {formatNumber(taksiPp)}
                      </td>
                      <td className="border border-black p-2 align-top text-center">-</td>
                    </tr>
                  )}
                  {penginapan > 0 && (
                    <tr>
                      <td className="border border-black p-2 text-center align-top">4.</td>
                      <td className="border border-black p-2 align-top">
                        Penginapan {recipient.dipa?.penginapanNights || 0} Malam x Rp. {formatNumber(recipient.dipa?.penginapanRate || 0)}
                      </td>
                      <td className="border border-black p-2 text-right align-top font-mono">
                        Rp. {formatNumber(penginapan)}
                      </td>
                      <td className="border border-black p-2 align-top text-center">-</td>
                    </tr>
                  )}
                  {extraItems.map((item, eIdx) => (
                    <tr key={item.id || eIdx}>
                      <td className="border border-black p-2 text-center align-top">{5 + eIdx}.</td>
                      <td className="border border-black p-2 align-top">{item.label}</td>
                      <td className="border border-black p-2 text-right align-top font-mono">
                        Rp. {formatNumber(item.amount)}
                      </td>
                      <td className="border border-black p-2 align-top text-center">-</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                    <td className="border border-black p-2 text-center" colSpan={2}>
                      JUMLAH :
                    </td>
                    <td className="border border-black p-2 text-right font-mono">
                      Rp. {formatNumber(totalAmount)}
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-black p-2" colSpan={4}>
                      <span className="font-bold">TERBILANG :</span>{" "}
                      <span className="italic font-semibold">{words(totalAmount)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tanda Terima Signatures */}
            <div className="mt-6 grid grid-cols-2 gap-8 text-[9.5pt]">
              <div className="text-left">
                <p>Telah dibayar sejumlah</p>
                <p className="font-mono font-bold">Rp. {formatNumber(totalAmount)}</p>
                <div className="h-4" />
                <p className="font-semibold">Bendahara Pengeluaran,</p>
                <div className="h-14" />
                <p className="font-bold underline uppercase">{bendahara.name}</p>
                <p>NIP. {formatNip(bendahara.nik)}</p>
              </div>

              <div className="text-left">
                <p>Samarinda,</p>
                <p>Telah menerima jumlah uang sebesar :</p>
                <p className="font-mono font-bold">Rp. {formatNumber(totalAmount)}</p>
                <p className="mt-2 font-semibold">Yang menerima,</p>
                <div className="h-14" />
                <p className="font-bold underline uppercase">{recipient.name}</p>
                <p>NIP. {formatNip(recipient.nip || recipient.id)}</p>
              </div>
            </div>

            {/* Section: PERHITUNGAN SPD RAMPUNG */}
            <div className="mt-8 border-t border-black pt-4">
              <h2 className="text-[10pt] font-bold uppercase text-center tracking-wider">
                PERHITUNGAN SPD RAMPUNG
              </h2>

              <div className="mt-3">
                <table className="rinba-dipa-table w-full border-collapse border border-black text-[9pt]">
                  <tbody>
                    <tr>
                      <td className="border border-black p-1.5 w-48">Ditetapkan sejumlah</td>
                      <td className="border border-black p-1.5 w-8 text-center">Rp</td>
                      <td className="border border-black p-1.5 w-32 text-right font-mono">{formatNumber(totalAmount)}</td>
                      <td className="border border-black p-1.5 italic">{words(totalAmount)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5">Yang telah dibayar semula</td>
                      <td className="border border-black p-1.5 text-center">Rp</td>
                      <td className="border border-black p-1.5 text-right font-mono">{formatNumber(totalAmount)}</td>
                      <td className="border border-black p-1.5 italic">{words(totalAmount)}</td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5">Sisa kurang / lebih</td>
                      <td className="border border-black p-1.5 text-center">Rp</td>
                      <td className="border border-black p-1.5 text-center">-</td>
                      <td className="border border-black p-1.5"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end text-[9.5pt]">
                <div className="w-64 text-left">
                  <p>Pejabat Pembuat Komitmen,</p>
                  <div className="h-14" />
                  <p className="font-bold underline uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
                  <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
