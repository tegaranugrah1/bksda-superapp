"use client";

import {
  Props,
  formatNumber,
  formatNip,
  calculateDays,
  formatFullDateIndonesia,
  formatIndoDateOptional,
} from "../shared";

const angkaTerbilangMap: Record<number, string> = {
  1: "satu",
  2: "dua",
  3: "tiga",
  4: "empat",
  5: "lima",
  6: "enam",
  7: "tujuh",
  8: "delapan",
  9: "sembilan",
  10: "sepuluh",
  11: "sebelas",
  12: "dua belas",
  13: "tiga belas",
  14: "empat belas",
};

export function DpRilDipaPreview({
  recipients,
  travel,
  sptNumber,
  ppk,
  spdNumber,
  dipaConfig,
}: Props) {
  const tanggalSpd = dipaConfig?.spdDate ? formatIndoDateOptional(dipaConfig.spdDate) : formatFullDateIndonesia(travel.startDate);
  const tanggalDpRil = formatIndoDateOptional(dipaConfig?.dpRilDate);
  const fullSpdNumber = spdNumber?.no
    ? `SPD. ${spdNumber.no}${spdNumber.suffix || ""}`
    : `SPD.          ${spdNumber?.suffix || "/K.18-TU/KEU/01/2026"}`;
  const cityDateText = dipaConfig?.cityDateText || "Samarinda,";

  // Filter recipients who have DP Ril enabled or have lodging / extra riil items
  const eligibleRecipients = recipients.filter((r) => {
    if (r.dipa?.dpRilEnabled === false) return false;
    if (r.dipa?.dpRilEnabled === true) return true;
    const hotelRate = r.dipa?.penginapanRate || 0;
    const extraRiil = r.dipa?.dpRilItems?.length || 0;
    return hotelRate > 0 || extraRiil > 0;
  });

  if (eligibleRecipients.length === 0) {
    return (
      <div className="mx-auto max-w-[210mm] bg-white p-8 text-center rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-bold text-slate-800">Daftar Pengeluaran Riil (DP Ril)</h3>
        <p className="text-sm text-slate-500 mt-2">
          Tidak ada personil yang menggunakan penginapan 30% atau pengeluaran riil tanpa bukti kuitansi.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Aktifkan toggle "Sertakan DP Ril" pada Tab DP Ril di form jika ingin mencetak formulir ini.
        </p>
      </div>
    );
  }

  return (
    <div id="dp-ril-dipa-print-root" className="dp-ril-dipa-print-root font-['Arial_Narrow',Arial,sans-serif] space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=PT+Sans+Narrow:wght@400;700&display=swap');
        .dp-ril-dipa-print-root, .dp-ril-dipa-paper, .dp-ril-dipa-paper * {
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
          .dp-ril-dipa-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .dp-ril-dipa-paper {
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
          .dp-ril-dipa-paper:last-child {
            page-break-after: auto !important;
          }
          table.dp-ril-dipa-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          table.dp-ril-dipa-table th, table.dp-ril-dipa-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {eligibleRecipients.map((recipient, idx) => {
        const nights = recipient.dipa?.penginapanNights || 0;
        const terbilangMalam = angkaTerbilangMap[nights] || `${nights}`;
        const hotelSubtotal = (recipient.dipa?.penginapanRate || 0) * nights;
        const province = recipient.dipa?.dpRilProvince || travel.destination || "Provinsi Kalimantan Timur";

        // Custom extra items
        const extraItems = recipient.dipa?.dpRilItems || [];
        const extraSubtotal = extraItems.reduce((acc, it) => acc + (it.amount || 0), 0);
        const grandTotalRiil = hotelSubtotal + extraSubtotal;

        return (
          <div
            key={recipient.id || idx}
            className="dp-ril-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[11pt]"
          >
            {/* Title */}
            <div className="text-center">
              <h1 className="text-[11pt] font-bold uppercase tracking-wider underline">
                DAFTAR PENGELUARAN RIIL
              </h1>
            </div>

            {/* Sub-header Statement */}
            <div className="mt-4 text-[11pt]">
              <p>Yang bertandatangan di bawah ini:</p>
              <div className="mt-2 space-y-1">
                <div className="grid grid-cols-[90px_15px_1fr]">
                  <span>Nama</span>
                  <span>:</span>
                  <span className="font-bold uppercase">{recipient.name}</span>
                </div>
                <div className="grid grid-cols-[90px_15px_1fr]">
                  <span>NIP</span>
                  <span>:</span>
                  <span>{formatNip(recipient.nip || recipient.id)}</span>
                </div>
                <div className="grid grid-cols-[90px_15px_1fr]">
                  <span>Jabatan</span>
                  <span>:</span>
                  <span>{recipient.position || "Pelaksana SPD"}</span>
                </div>
              </div>

              <p className="mt-3 text-justify leading-relaxed">
                Berdasarkan Surat Perjalanan Dinas (SPD) Nomor : {fullSpdNumber} tanggal {tanggalSpd}, dengan ini kami menyatakan dengan sesungguhnya bahwa :
              </p>
            </div>

            {/* Point 1: Biaya table */}
            <div className="mt-2 text-[9.5pt]">
              <p>
                1. Biaya transpor pegawai dan/atau biaya penginapan di bawah ini yang tidak dapat diperoleh bukti-bukti pengeluarannya, meliputi :
              </p>
            </div>

            {/* Table */}
            <div className="mt-2 overflow-x-auto">
              <table className="dp-ril-dipa-table w-full border-collapse border border-black text-[9pt]">
                <thead>
                  <tr className="bg-slate-50 text-center font-bold">
                    <th className="border border-black p-1.5 w-12">NO.</th>
                    <th className="border border-black p-1.5 text-center">URAIAN</th>
                    <th className="border border-black p-1.5 w-40 text-right pr-4">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  {hotelSubtotal > 0 && (
                    <tr>
                      <td className="border border-black p-1.5 text-center align-top">1.</td>
                      <td className="border border-black p-1.5 align-top">
                        <p>
                          {recipient.dipa?.dpRilDescription ||
                            `Biaya penginapan ${nights} (${terbilangMalam}) malam x 30 % tarif hotel di`}
                        </p>
                        <p className="font-semibold text-slate-700">{province}</p>
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono align-top pr-4">
                        Rp. {formatNumber(hotelSubtotal)}
                      </td>
                    </tr>
                  )}

                  {extraItems.map((item, itemIdx) => (
                    <tr key={itemIdx}>
                      <td className="border border-black p-1.5 text-center align-top">
                        {(hotelSubtotal > 0 ? 2 : 1) + itemIdx}.
                      </td>
                      <td className="border border-black p-1.5 align-top">{item.label}</td>
                      <td className="border border-black p-1.5 text-right font-mono align-top pr-4">
                        Rp. {formatNumber(item.amount)}
                      </td>
                    </tr>
                  ))}

                  {/* Empty filler row if needed for height alignment */}
                  <tr>
                    <td className="border border-black p-1.5 text-center">&nbsp;</td>
                    <td className="border border-black p-1.5">&nbsp;</td>
                    <td className="border border-black p-1.5">&nbsp;</td>
                  </tr>

                  {/* Total Row */}
                  <tr className="font-bold bg-slate-50">
                    <td className="border border-black p-1.5 text-right pr-4" colSpan={2}>
                      JUMLAH :
                    </td>
                    <td className="border border-black p-1.5 text-right font-mono pr-4">
                      Rp. {formatNumber(grandTotalRiil)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Point 2: Guarantee and Closing Statement */}
            <div className="mt-3 text-[11pt] space-y-2 text-justify leading-relaxed">
              <p>
                2. Jumlah uang tersebut pada angka 1 di atas benar-benar dikeluarkan untuk pelaksanaan Perjalanan Dinas dimaksud dan apabila di kemudian hari terdapat kelebihan atas pembayaran, kami bersedia untuk menyetorkan kelebihan tersebut ke Kas Negara.
              </p>
              <p>
                Demikian pernyataan ini kami buat dengan sebenarnya, untuk dipergunakan sebagaimana mestinya.
              </p>
            </div>

            {/* Signatures */}
            <div className="mt-6 grid grid-cols-2 gap-8 text-[11pt]">
              <div className="text-left">
                <p>Mengetahui/Menyetujui :</p>
                <p className="font-semibold">Pejabat Pembuat Komitmen,</p>
                <div className="h-16" />
                <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
                <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
              </div>

              <div className="text-left">
                <p>{cityDateText} {tanggalDpRil || ""}</p>
                <p className="font-semibold">Pelaksana SPD,</p>
                <div className="h-16" />
                <p className="font-bold uppercase">{recipient.name}</p>
                <p>NIP. {formatNip(recipient.nip || recipient.id)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
