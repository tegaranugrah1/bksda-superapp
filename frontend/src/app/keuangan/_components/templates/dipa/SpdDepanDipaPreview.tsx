"use client";

import {
  Props,
  formatNumber,
  formatNip,
  calculateDays,
  formatFullDateIndonesia,
} from "../shared";

export function SpdDepanDipaPreview({
  recipients,
  activity,
  travel,
  sptNumber,
  ppk,
  spdNumber,
  dipaConfig,
}: Props) {
  const tanggalSpd = dipaConfig?.spdDate || formatFullDateIndonesia(travel.startDate);
  const fullSpdNumber = spdNumber?.no ? `SPD. ${spdNumber.no}${spdNumber.suffix || ""}` : `SPD.          ${spdNumber?.suffix || "/K.18-TU/KEU/01/2026"}`;
  const days = calculateDays(travel.startDate, travel.endDate);
  const year = new Date().getFullYear();

  return (
    <div id="spd-depan-dipa-print-root" className="spd-depan-dipa-print-root font-['Figtree',sans-serif] space-y-6">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');
        .spd-depan-dipa-print-root, .spd-depan-dipa-paper, .spd-depan-dipa-paper * {
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
          .spd-depan-dipa-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .spd-depan-dipa-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 0 20mm 0 !important;
            page-break-after: always !important;
            box-shadow: none !important;
            border: none !important;
          }
          .spd-depan-dipa-paper:last-child {
            page-break-after: auto !important;
          }
          table.spd-dipa-table {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          table.spd-dipa-table th, table.spd-dipa-table td {
            border: 1px solid #000 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      {recipients.map((recipient, idx) => (
        <div
          key={recipient.id || idx}
          className="spd-depan-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none font-['Figtree',sans-serif]"
        >
          {/* Header with Logo */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/header.png"
                alt="Logo Kementerian Kehutanan"
                className="h-14 w-auto object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <p className="text-[10pt] font-bold uppercase tracking-wide">KEMENTERIAN KEHUTANAN</p>
            <p className="text-[9.5pt] font-bold uppercase tracking-wide">DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</p>
            <p className="text-[9.5pt] font-bold uppercase tracking-wide">BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
            <div className="mt-3">
              <h1 className="text-[11pt] font-bold uppercase tracking-wider underline">SURAT PERJALANAN DINAS (SPD)</h1>
              <p className="text-[9pt] font-mono mt-0.5">Nomor : {fullSpdNumber}</p>
            </div>
          </div>

          {/* 10 Points Table */}
          <div className="mt-3">
            <table className="spd-dipa-table w-full border-collapse border border-black text-[8.5pt]">
              <tbody>
                <tr>
                  <td className="border border-black p-1 w-6 text-center align-top">1</td>
                  <td className="border border-black p-1 w-52 align-top">Pejabat Pembuat Komitmen</td>
                  <td className="border border-black p-1 align-top">
                    Balai KSDA Kalimantan Timur Ditjen KSDAE (693614)<br />
                    Tahun Anggaran {year}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">2</td>
                  <td className="border border-black p-1 align-top">
                    Nama pegawai yang melaksanakan perjalanan dinas<br />
                    NIP.
                  </td>
                  <td className="border border-black p-1 align-top font-bold uppercase">
                    {recipient.name}<br />
                    <span className="font-normal font-mono text-[8pt]">{formatNip(recipient.nip || recipient.id)}</span>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">3</td>
                  <td className="border border-black p-1 align-top">
                    a. Pangkat dan Golongan<br />
                    b. Jabatan / Instansi<br />
                    c. Tingkat Biaya Perjalanan Dinas
                  </td>
                  <td className="border border-black p-1 align-top">
                    a. {recipient.rank || "Penata / III c"}<br />
                    b. {recipient.position || "PEH Muda"}<br />
                    c. C
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">4</td>
                  <td className="border border-black p-1 align-top">Maksud perjalanan dinas</td>
                  <td className="border border-black p-1 align-top text-justify leading-snug">
                    {dipaConfig?.maksudTujuan || activity.name}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">5</td>
                  <td className="border border-black p-1 align-top">Alat angkutan yang dipergunakan</td>
                  <td className="border border-black p-1 align-top">
                    {dipaConfig?.transportMode || "Kendaraan Dinas"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">6</td>
                  <td className="border border-black p-1 align-top">
                    a. Tempat berangkat<br />
                    b. Tempat tujuan
                  </td>
                  <td className="border border-black p-1 align-top">
                    a. {travel.origin}<br />
                    b. {travel.destination}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">7</td>
                  <td className="border border-black p-1 align-top">
                    a. Lamanya perjalanan dinas<br />
                    b. Tanggal berangkat<br />
                    c. Tanggal harus kembali / tiba di tempat baru *)
                  </td>
                  <td className="border border-black p-1 align-top">
                    a. {days} Hari<br />
                    b. {formatFullDateIndonesia(travel.startDate)}<br />
                    c. {formatFullDateIndonesia(travel.endDate)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">8</td>
                  <td className="border border-black p-1 align-top">Pengikut : Nama</td>
                  <td className="border border-black p-1 align-top">
                    <div className="grid grid-cols-[1fr_100px_100px] text-[8pt] text-center">
                      <span className="text-left">Tanggal Lahir</span>
                      <span>Keterangan</span>
                    </div>
                    <p className="text-center mt-1 text-slate-500">-</p>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">9</td>
                  <td className="border border-black p-1 align-top">
                    Pembebanan anggaran<br />
                    a. Instansi<br />
                    b. Akun
                  </td>
                  <td className="border border-black p-1 align-top">
                    DIPA Balai KSDA Kalimantan Timur Tahun {year}<br />
                    a. {dipaConfig?.namaSatker || "Balai KSDA Kalimantan Timur"}<br />
                    b. {dipaConfig?.akun || "524111"}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-center align-top">10</td>
                  <td className="border border-black p-1 align-top">Keterangan lain-lain</td>
                  <td className="border border-black p-1 align-top">
                    <div className="grid grid-cols-[80px_8px_1fr]">
                      <span>a. No. ST</span>
                      <span>:</span>
                      <span className="font-mono">{sptNumber}</span>
                    </div>
                    <div className="grid grid-cols-[80px_8px_1fr]">
                      <span>b. Tgl ST</span>
                      <span>:</span>
                      <span>{dipaConfig?.stDate || tanggalSpd}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-3 flex items-start justify-between text-[8.5pt]">
            <p className="italic text-[7.5pt]">*) Coret yang tidak perlu</p>
            <div className="w-64 text-left">
              <div className="grid grid-cols-[80px_8px_1fr]">
                <span>Dikeluarkan di</span>
                <span>:</span>
                <span>Samarinda</span>
              </div>
              <div className="grid grid-cols-[80px_8px_1fr]">
                <span>Pada tanggal</span>
                <span>:</span>
                <span>{tanggalSpd}</span>
              </div>
              <div className="mt-3">
                <p className="font-semibold">Pejabat Pembuat Komitmen,</p>
                <div className="h-14" />
                <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
                <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
