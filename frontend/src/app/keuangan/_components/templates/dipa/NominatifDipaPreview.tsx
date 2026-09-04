"use client";

import {
  Props,
  formatNumber,
  formatNip,
  calculateDays,
  formatFullDateIndonesia,
} from "../shared";

export function NominatifDipaPreview({
  recipients,
  travel,
  sptNumber,
  ppk,
  pdo,
  spdNumber,
  dipaConfig,
}: Props) {
  const bendahara = dipaConfig?.bendahara || pdo || { name: "SOERENDENG, SE", nik: "19790721 200701 2 001" };
  const days = calculateDays(travel.startDate, travel.endDate);
  const startStr = formatFullDateIndonesia(travel.startDate);
  const endStr = formatFullDateIndonesia(travel.endDate);

  const totals = recipients.reduce(
    (acc, r) => {
      const dailyRate = r.dipa?.uangHarianRate || 360000;
      const uangHarian = (r.dipa?.uangHarianDays || days) * dailyRate;
      const transportUdara = r.dipa?.transportUdara || 0;
      const taksiPp = r.dipa?.taksiPp || 0;
      const transportSubtotal = transportUdara + taksiPp;
      const penginapan = (r.dipa?.penginapanRate || 0) * (r.dipa?.penginapanNights || 0);
      const extraItems = r.dipa?.extraItems || [];
      const extraTotal = extraItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const rowTotal = r.amount || (uangHarian + transportSubtotal + penginapan + extraTotal);

      return {
        transport: acc.transport + transportSubtotal,
        uangHarian: acc.uangHarian + uangHarian,
        penginapan: acc.penginapan + penginapan,
        grandTotal: acc.grandTotal + rowTotal,
      };
    },
    { transport: 0, uangHarian: 0, penginapan: 0, grandTotal: 0 }
  );

  return (
    <div id="nominatif-dipa-print-root" className="nominatif-dipa-print-root font-['Figtree',sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');
        .nominatif-dipa-print-root, .nominatif-dipa-paper, .nominatif-dipa-paper * {
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
          .nominatif-dipa-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .nominatif-dipa-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          table.nominatif-dipa-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          table.nominatif-dipa-table th, table.nominatif-dipa-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      <div className="nominatif-dipa-paper mx-auto w-full max-w-[297mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none font-['Figtree',sans-serif]">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-[11pt] font-bold uppercase tracking-wider">
            DAFTAR NOMINATIF PERJALANAN DINAS
          </h1>
          <p className="text-[9.5pt] mt-0.5 font-normal">
            Nomor SPD : {spdNumber?.no ? `SPD. ${spdNumber.no}${spdNumber.suffix || ""}` : ""}
          </p>
        </div>

        {/* 10 Column Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="nominatif-dipa-table w-full border-collapse border border-black text-[8pt]">
            <thead>
              <tr className="bg-slate-50 text-center font-bold">
                <th className="border border-black p-1.5 w-8" rowSpan={2}>No</th>
                <th className="border border-black p-1.5 w-44" rowSpan={2}>Nama/NIP/Surat Tugas Pelaksana Kegiatan</th>
                <th className="border border-black p-1.5 w-28" rowSpan={2}>Lokasi Tujuan</th>
                <th className="border border-black p-1.5 w-28" rowSpan={2}>Tgl Pelaksanaan</th>
                <th className="border border-black p-1" colSpan={3}>077</th>
                <th className="border border-black p-1.5 w-20" rowSpan={2}>Uang Harian</th>
                <th className="border border-black p-1.5 w-20" rowSpan={2}>Penginapan</th>
                <th className="border border-black p-1.5 w-24" rowSpan={2}>JUMLAH BIAYA</th>
                <th className="border border-black p-1.5 w-24" rowSpan={2}>Tanda Tangan</th>
              </tr>
              <tr className="bg-slate-50 text-center font-bold text-[7.5pt]">
                <th className="border border-black p-1 w-16">Transport Udara</th>
                <th className="border border-black p-1 w-20">Taksi bandara/ stasiun PP</th>
                <th className="border border-black p-1 w-16">Jumlah</th>
              </tr>
              <tr className="bg-slate-100 text-center text-[7pt] font-semibold">
                <th className="border border-black p-0.5">1</th>
                <th className="border border-black p-0.5">2</th>
                <th className="border border-black p-0.5">3</th>
                <th className="border border-black p-0.5">4</th>
                <th className="border border-black p-0.5">5</th>
                <th className="border border-black p-0.5">6</th>
                <th className="border border-black p-0.5">7</th>
                <th className="border border-black p-0.5">8</th>
                <th className="border border-black p-0.5">9</th>
                <th className="border border-black p-0.5">10 = 7+8+9</th>
                <th className="border border-black p-0.5"></th>
              </tr>
            </thead>
            <tbody>
              {recipients.map((r, idx) => {
                const dailyRate = r.dipa?.uangHarianRate || 360000;
                const uangHarian = (r.dipa?.uangHarianDays || days) * dailyRate;
                const transportUdara = r.dipa?.transportUdara || 0;
                const taksiPp = r.dipa?.taksiPp || 0;
                const transportSubtotal = transportUdara + taksiPp;
                const penginapan = (r.dipa?.penginapanRate || 0) * (r.dipa?.penginapanNights || 0);
                const extraItems = r.dipa?.extraItems || [];
                const extraTotal = extraItems.reduce((acc, item) => acc + (item.amount || 0), 0);
                const rowTotal = r.amount || (uangHarian + transportSubtotal + penginapan + extraTotal);

                return (
                  <tr key={r.id || idx}>
                    <td className="border border-black p-1.5 text-center align-top">{idx + 1}</td>
                    <td className="border border-black p-1.5 align-top">
                      <p className="font-bold uppercase">{r.name}</p>
                      <p className="text-[7.5pt] text-slate-700">NIP. {formatNip(r.nip || r.id)}</p>
                      <p className="text-[7.5pt] text-slate-700">ST. {sptNumber}</p>
                    </td>
                    <td className="border border-black p-1.5 align-top">{travel.destination}</td>
                    <td className="border border-black p-1.5 align-top text-center text-[7.5pt]">
                      <p>{startStr}</p>
                      <p className="my-0.5">s/d</p>
                      <p>{endStr}</p>
                    </td>
                    <td className="border border-black p-1.5 text-right align-top font-mono">{transportUdara > 0 ? formatNumber(transportUdara) : "-"}</td>
                    <td className="border border-black p-1.5 text-right align-top font-mono">{taksiPp > 0 ? formatNumber(taksiPp) : "-"}</td>
                    <td className="border border-black p-1.5 text-right align-top font-mono">{transportSubtotal > 0 ? formatNumber(transportSubtotal) : "-"}</td>
                    <td className="border border-black p-1.5 text-right align-top font-mono font-semibold">{formatNumber(uangHarian)}</td>
                    <td className="border border-black p-1.5 text-right align-top font-mono">{penginapan > 0 ? formatNumber(penginapan) : "-"}</td>
                    <td className="border border-black p-1.5 text-right align-top font-mono font-bold">{formatNumber(rowTotal)}</td>
                    <td className="border border-black p-1.5 align-middle text-left pl-2">
                      <span className="text-[7pt] text-slate-400">{idx + 1}. ....................</span>
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="font-bold bg-slate-50 text-[8pt]">
                <td className="border border-black p-1.5 text-center" colSpan={6}>
                  TOTAL BIAYA
                </td>
                <td className="border border-black p-1.5 text-right font-mono">{totals.transport > 0 ? formatNumber(totals.transport) : "-"}</td>
                <td className="border border-black p-1.5 text-right font-mono">{formatNumber(totals.uangHarian)}</td>
                <td className="border border-black p-1.5 text-right font-mono">{totals.penginapan > 0 ? formatNumber(totals.penginapan) : "-"}</td>
                <td className="border border-black p-1.5 text-right font-mono">{formatNumber(totals.grandTotal)}</td>
                <td className="border border-black p-1.5"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-6 grid grid-cols-2 gap-8 text-[9pt]">
          <div className="text-left">
            <p className="font-semibold">Pejabat Pembuat Komitmen,</p>
            <div className="h-14" />
            <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
            <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
          </div>
          <div className="text-left">
            <p>{dipaConfig?.cityDateText || "Samarinda,"} {dipaConfig?.spdDate || ""}</p>
            <p className="font-semibold">Bendahara Pengeluaran,</p>
            <div className="h-14" />
            <p className="font-bold uppercase">{bendahara.name}</p>
            <p>NIP. {formatNip(bendahara.nik)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
