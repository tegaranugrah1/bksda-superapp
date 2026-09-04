"use client";

import {
  Props,
  SpdConfig,
  Official,
  formatNip,
  calculateDays,
  getEmployeeSpdInfo,
  formatSingleDate,
} from "../shared";

export function SpdPreview({
  recipients,
  activity,
  travel,
  sptNumber,
  ppk,
  spdNumber,
  spdConfig,
}: {
  recipients: Props["recipients"];
  activity: Props["activity"];
  travel: Props["travel"];
  sptNumber: string;
  ppk: Official;
  spdNumber?: { no?: string; suffix?: string };
  spdConfig?: SpdConfig;
}) {
  const employeeRecipients = recipients.filter(
    (recipient) => recipient.id.startsWith("employee-") || !recipient.id.startsWith("external-")
  );
  const rawSuffix =
    spdNumber?.suffix?.trim() ||
    (sptNumber ? `/${sptNumber.replace(/^.*?\//, "")}` : "/K.18-TU/FOLU.NC-23/04/2026");
  const cleanSuffix = rawSuffix.startsWith("/") ? rawSuffix : `/${rawSuffix}`;

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

                {/* Row 8: Pengikut */}
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
