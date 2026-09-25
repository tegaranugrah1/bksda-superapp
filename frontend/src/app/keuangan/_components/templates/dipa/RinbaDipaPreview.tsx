"use client";

import {
  Props,
  formatNumber,
  formatNip,
  words,
  calculateDays,
  formatFullDateIndonesia,
  formatIndoDateOptional,
  getDipaTransportBreakdown,
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
  const tanggalSpd = dipaConfig?.spdDate ? formatIndoDateOptional(dipaConfig.spdDate) : formatFullDateIndonesia(travel.startDate);
  const tanggalRinba = formatIndoDateOptional(dipaConfig?.rinbaDate);
  const spdNo = (dipaConfig?.rinbaSpdNo !== undefined ? dipaConfig.rinbaSpdNo : spdNumber?.no)?.trim() || "";
  const spdSuffix = (dipaConfig?.rinbaSpdSuffix !== undefined ? dipaConfig.rinbaSpdSuffix : spdNumber?.suffix) || "/K.18-TU/KEU/01/2026";

  return (
    <div id="rinba-dipa-print-root" className="rinba-dipa-print-root font-['Arial_Narrow',Arial,sans-serif] space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=PT+Sans+Narrow:wght@400;700&display=swap');
        .rinba-dipa-print-root, .rinba-dipa-paper, .rinba-dipa-paper * {
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
            font-size: 11pt !important;
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
        const transportBreakdown = getDipaTransportBreakdown(recipient.dipa);
        const penginapan = (recipient.dipa?.penginapanRate || 0) * (recipient.dipa?.penginapanNights || 0);
        const extraItems = recipient.dipa?.extraItems || [];
        const extraTotal = extraItems.reduce((acc, item) => acc + (item.amount || 0), 0);
        const totalAmount = recipient.amount || (uangHarianTotal + transportBreakdown.total + penginapan + extraTotal);

        let currentNo = 1;
        const uangHarianNo = `${currentNo++}.`;
        const hasTransport = transportBreakdown.items.length > 0 || transportBreakdown.total > 0;
        const transportNo = hasTransport ? `${currentNo++}.` : "";
        const penginapanNo = penginapan > 0 ? `${currentNo++}.` : "";

        return (
          <div
            key={recipient.id || idx}
            className="rinba-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[11pt]"
          >
            {/* Title */}
            <div className="text-center">
              <h1 className="text-[11pt] font-bold uppercase tracking-wider">
                RINCIAN BIAYA PERJALANAN DINAS
              </h1>
            </div>

            {/* Header info */}
            <div className="mt-3 mb-2">
              <table className="w-full border-collapse text-[11pt]">
                <colgroup>
                  <col className="w-10" />
                  <col />
                  <col className="w-36" />
                  <col className="w-48" />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="p-0"></td>
                    <td className="p-0 pb-1 align-top pr-2">Lampiran SPD Nomor</td>
                    <td className="p-0 pb-1 align-top font-mono" colSpan={2}>
                      <div className="flex items-center">
                        <span className="w-4 text-center">:</span>
                        {spdNo ? (
                          <span className="pl-1">SPD. {spdNo}{spdSuffix}</span>
                        ) : (
                          <div className="flex items-center pl-1 font-mono">
                            <span>SPD.</span>
                            <span className="inline-block w-16">&nbsp;</span>
                            <span>{spdSuffix}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-0"></td>
                    <td className="p-0 pb-1 align-top pr-2">Tanggal</td>
                    <td className="p-0 pb-1 align-top" colSpan={2}>
                      <div className="flex items-start">
                        <span className="w-4 text-center">:</span>
                        <span className="pl-1">{tanggalSpd}</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Rincian Biaya */}
            <div className="mt-3">
              <table className="rinba-dipa-table w-full border-collapse border border-black text-[9pt]">
                <colgroup>
                  <col className="w-10" />
                  <col />
                  <col className="w-36" />
                  <col className="w-48" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 text-center font-bold">
                    <th className="border border-black p-1.5 w-10">NO.</th>
                    <th className="border border-black p-1.5">PERINCIAN BIAYA</th>
                    <th className="border border-black p-1.5 w-36">JUMLAH</th>
                    <th className="border border-black p-1.5 w-48">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-center align-top">{uangHarianNo}</td>
                    <td className="border border-black p-2 align-top">
                      <div>Uang Harian :</div>
                      <div>{recipient.dipa?.uangHarianDays || days} x Rp.{formatNumber(dailyRate)},-</div>
                    </td>
                    <td className="border border-black p-2 font-mono align-top">
                      <div className="flex justify-between">
                        <span>Rp.</span>
                        <span>{formatNumber(uangHarianTotal)}</span>
                      </div>
                    </td>
                    <td className="border border-black p-2 align-top text-center">-</td>
                  </tr>

                  {transportBreakdown.items.length > 0 ? (
                    transportBreakdown.items.map((item, tIdx) => (
                      <tr key={item.id || tIdx}>
                        <td className="border border-black p-2 text-center align-top">
                          {tIdx === 0 ? transportNo : ""}
                        </td>
                        <td className="border border-black p-2 align-top">
                          {tIdx === 0 ? "Transportasi" : ""}
                        </td>
                        <td className="border border-black p-2 font-mono align-top">
                          <div className="flex justify-between">
                            <span>Rp.</span>
                            <span>{formatNumber(item.amount)}</span>
                          </div>
                        </td>
                        <td className="border border-black p-2 align-top">
                          {item.label}
                        </td>
                      </tr>
                    ))
                  ) : transportBreakdown.total > 0 ? (
                    <tr>
                      <td className="border border-black p-2 text-center align-top">{transportNo}</td>
                      <td className="border border-black p-2 align-top">Transportasi</td>
                      <td className="border border-black p-2 font-mono align-top">
                        <div className="flex justify-between">
                          <span>Rp.</span>
                          <span>{formatNumber(transportBreakdown.total)}</span>
                        </div>
                      </td>
                      <td className="border border-black p-2 align-top text-center">-</td>
                    </tr>
                  ) : null}

                  {penginapan > 0 && (
                    <tr>
                      <td className="border border-black p-2 text-center align-top">{penginapanNo}</td>
                      <td className="border border-black p-2 align-top">Penginapan</td>
                      <td className="border border-black p-2 font-mono align-top">
                        <div className="flex justify-between">
                          <span>Rp.</span>
                          <span>{formatNumber(penginapan)}</span>
                        </div>
                      </td>
                      <td className="border border-black p-2 align-top">
                        {recipient.dipa?.dpRilEnabled !== false ? "DPRill" : "-"}
                      </td>
                    </tr>
                  )}

                  {extraItems.map((item, eIdx) => (
                    <tr key={item.id || eIdx}>
                      <td className="border border-black p-2 text-center align-top">{currentNo + eIdx}.</td>
                      <td className="border border-black p-2 align-top">{item.label}</td>
                      <td className="border border-black p-2 font-mono align-top">
                        <div className="flex justify-between">
                          <span>Rp.</span>
                          <span>{formatNumber(item.amount)}</span>
                        </div>
                      </td>
                      <td className="border border-black p-2 align-top text-center">-</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2 text-left">
                      JUMLAH :
                    </td>
                    <td className="border border-black p-2 font-mono">
                      <div className="flex justify-between">
                        <span>Rp.</span>
                        <span>{formatNumber(totalAmount)}</span>
                      </div>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                  <tr className="bg-slate-200/90 dark:bg-slate-800 print:bg-slate-200">
                    <td className="border border-black p-2"></td>
                    <td className="border border-black p-2 text-left" colSpan={3}>
                      <span className="font-bold">TERBILANG :</span>{" "}
                      <span className="italic font-semibold">{words(totalAmount)}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tanda Terima Signatures */}
            <div className="mt-6 text-[11pt]">
              <div className="grid grid-cols-2 gap-8">
                <div />
                <div className="text-left">
                  <p>{dipaConfig?.cityDateText || "Samarinda,"} {tanggalRinba || ""}</p>
                </div>

                <div className="text-left">
                  <p>Telah dibayar sejumlah</p>
                  <div className="mt-1 flex items-center gap-4">
                    <span>Rp.</span>
                    <span className="font-mono font-bold">{formatNumber(totalAmount)}</span>
                  </div>
                  <div className="h-4" />
                  <p className="font-semibold">Bendahara Pengeluaran,</p>
                  <div className="h-14" />
                  <p className="font-bold uppercase">{bendahara.name}</p>
                  <p>NIP. {formatNip(bendahara.nik)}</p>
                </div>

                <div className="text-left">
                  <p>Telah menerima jumlah uang sebesar :</p>
                  <div className="mt-1 flex items-center gap-4">
                    <span>Rp.</span>
                    <span className="font-mono font-bold">{formatNumber(totalAmount)}</span>
                  </div>
                  <div className="h-4" />
                  <p className="font-semibold">Yang menerima,</p>
                  <div className="h-14" />
                  <p className="font-bold uppercase">{recipient.name}</p>
                  <p>NIP. {formatNip(recipient.nip || recipient.id)}</p>
                </div>
              </div>
            </div>

            {/* Section: PERHITUNGAN SPD RAMPUNG */}
            <div className="mt-8 border-t border-black pt-4">
              <h2 className="text-[11pt] font-bold uppercase text-center tracking-wider">
                PERHITUNGAN SPD RAMPUNG
              </h2>

              <div className="mt-3">
                <table className="rinba-dipa-table w-full border-collapse border border-black text-[10.5pt]">
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

              <div className="mt-4 flex justify-end text-[11pt]">
                <div className="w-64 text-left">
                  <p>Pejabat Pembuat Komitmen,</p>
                  <div className="h-14" />
                  <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
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
