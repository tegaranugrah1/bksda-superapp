"use client";

import {
  Props,
  formatNumber,
  formatNip,
  words,
  getReceiverInfo,
  getRinbaBreakdown,
} from "../shared";

export function RinbaFoluPreview({
  recipients,
  travel,
  sptNumber,
  ppk,
  pdo,
  spdNumber,
}: Omit<Props, "selectedDocument" | "activity" | "total">) {
  const employeeRecipients = recipients.filter(
    (recipient) => recipient.id.startsWith("employee-") || !recipient.id.startsWith("external-")
  );
  const rawSuffix =
    spdNumber?.suffix?.trim() ||
    (sptNumber ? `/${sptNumber.replace(/^.*?\//, "")}` : "/K.18-TU/FOLU.NC-23/04/2026");
  const cleanSuffix = rawSuffix.startsWith("/") ? rawSuffix : `/${rawSuffix}`;

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
