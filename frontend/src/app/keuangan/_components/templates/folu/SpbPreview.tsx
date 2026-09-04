"use client";

import { Props, formatNumber, formatNip, words, getRecipientBankInfo } from "../shared";

export function SpbPreview({
  recipients,
  activity,
  sptNumber,
  ppk,
  pdo,
  verifikator,
  spbNumber,
  spbConfig,
}: Omit<Props, "selectedDocument" | "travel" | "total">) {
  const verifikatorData = verifikator || { name: "Sukma Mawarni, S.E.", nik: "19930425 202421 2 053" };
  const rawSuffix =
    spbNumber?.suffix?.trim() ||
    (sptNumber ? `/SPB/${sptNumber.replace(/^.*?\//, "")}` : "/SPB/K.18/FOLU-NC23/05/2026");
  const cleanSuffix = rawSuffix.startsWith("/") ? rawSuffix : `/${rawSuffix}`;

  const virtualAccount = spbConfig?.virtualAccount?.trim() || "9899410000000115";
  const ppkPosition = spbConfig?.ppkPosition?.trim() || "Pejabat Pembuat Komitmen IP BKSDA Kalimantan Timur";
  const keperluanPrefix = spbConfig?.keperluanPrefix?.trim() || "Pembayaran Biaya";
  const cityDateText = spbConfig?.cityDateText?.trim() || "Samarinda,";

  return (
    <div id="spb-print-root" className="spb-print-root font-['Figtree',sans-serif] space-y-8 print:space-y-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .spb-print-root, .spb-paper, .spb-paper * {
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
          .spb-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .spb-paper {
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
          .spb-paper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {recipients.map((recipient, index) => {
        const bankInfo = getRecipientBankInfo(recipient.name);
        const accountNo = recipient.accountNo || bankInfo.accountNo;
        const bankName = recipient.bankName || bankInfo.bank;
        const holderName = recipient.accountHolder || bankInfo.holderName;
        const cleanDesc = recipient.description.replace(/^Pembayaran Biaya\s*/i, "").trim();
        const displayDesc = `${keperluanPrefix} ${cleanDesc}`;
        const point2Rendered =
          spbConfig?.point2Text?.trim() ||
          `Kepada Pemegang Dana Operasional (PDO) ${activity.name}`;

        return (
          <div
            key={recipient.id || index}
            className="spb-paper mx-auto w-full max-w-[210mm] bg-white p-6 md:p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[8.5pt] leading-tight font-['Figtree',sans-serif]"
          >
            {/* Header: Kementerian Text Left + Logo Right */}
            <div className="flex items-start justify-between">
              {/* Left: Ministry Hierarchy */}
              <div className="text-left font-bold text-[8.5pt] leading-snug">
                <p>KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN</p>
                <p>DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM</p>
                <p>BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR</p>
                <p>PROGRAM FOLU NET SINK 2030</p>
              </div>

              {/* Right: Logos */}
              <div className="flex items-center gap-2 pl-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo_kemenhut.png"
                  alt="Logo Kementerian"
                  className="h-12 w-auto object-contain"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/folu_logo.png"
                  alt="Logo FOLU Net Sink 2030"
                  className="h-10 w-auto object-contain"
                />
              </div>
            </div>

            {/* Separator Double Line */}
            <div className="my-2 border-b-2 border-black" />

            {/* Document Title */}
            <div className="text-center my-3">
              <h1 className="text-[11pt] font-bold tracking-tight uppercase">
                SURAT PERSETUJUAN BAYAR
              </h1>
              <p className="text-[8.5pt] mt-0.5 font-normal">
                Nomor : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{spbNumber?.no?.trim() || ""}{cleanSuffix}
              </p>
            </div>

            {/* Poin 1 - 6 */}
            <div className="space-y-1.5 text-[8.5pt]">
              {/* Poin 1 */}
              <div className="grid grid-cols-[18px_160px_8px_1fr] items-baseline">
                <span>1.</span>
                <span>Virtual Account</span>
                <span>:</span>
                <span className="font-mono">{virtualAccount}</span>
              </div>

              {/* Poin 2 */}
              <div className="grid grid-cols-[18px_160px_8px_1fr] items-baseline">
                <span>2.</span>
                <span>Setuju Dibebankan pada</span>
                <span>:</span>
                <span className="leading-snug">{point2Rendered}</span>
              </div>

              {/* Poin 3 */}
              <div className="grid grid-cols-[18px_160px_8px_1fr] items-baseline">
                <span>3.</span>
                <span>Kode Kegiatan</span>
                <span>:</span>
                <span>{activity.awpCode}</span>
              </div>

              {/* Poin 4 */}
              <div className="grid grid-cols-[18px_160px_8px_1fr] items-baseline">
                <span>4.</span>
                <span>Jumlah Pembayaran</span>
                <span>:</span>
                <span>
                  <b>Rp. {formatNumber(recipient.amount)} ,-</b>
                </span>
              </div>

              {/* Poin 5: Terbilang */}
              <div className="grid grid-cols-[18px_160px_8px_1fr] items-baseline">
                <span>5.</span>
                <span>Terbilang</span>
                <span>:</span>
                <span className="italic leading-snug">
                  {words(recipient.amount)}
                </span>
              </div>

              {/* Poin 6: Keperluan */}
              <div className="grid grid-cols-[18px_160px_8px_1fr] items-baseline">
                <span>6.</span>
                <span>Keperluan</span>
                <span>:</span>
                <span className="text-justify leading-snug">
                  {displayDesc}
                </span>
              </div>
            </div>

            {/* Penerima Box (Bordered Table-like Box) */}
            <div className="mt-3 border border-black p-2.5 text-[8.5pt]">
              <div className="grid grid-cols-[165px_8px_1fr] gap-y-1 items-baseline">
                <span>Nama Penerima</span>
                <span>:</span>
                <span className="font-bold uppercase">{recipient.name}</span>

                <span>Nama Bank</span>
                <span>:</span>
                <span>{bankName}</span>

                <span>Nomor Rekening</span>
                <span>:</span>
                <span className="font-mono">{accountNo}</span>

                <span>Nama Pemilik Rekening</span>
                <span>:</span>
                <span>{holderName}</span>
              </div>
            </div>

            {/* Bottom 3-Column Signatures */}
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[8.5pt]">
              {/* Kolom 1: Verifikator Keuangan */}
              <div className="flex flex-col justify-between">
                <div>
                  <p className="invisible select-none" aria-hidden="true">&nbsp;</p>
                  <p>Telah Diverifikasi,</p>
                  <p>Verifikator Keuangan</p>
                  <div className="h-12" />
                  <p className="font-bold">{verifikatorData.name}</p>
                  <p>NIP. {formatNip(verifikatorData.nik)}</p>
                </div>
              </div>

              {/* Kolom 2: PDO */}
              <div className="flex flex-col justify-between">
                <div>
                  <p className="invisible select-none" aria-hidden="true">&nbsp;</p>
                  <p>Lunas Dibayar,</p>
                  <p>Pemegang Dana Operasional</p>
                  <div className="h-12" />
                  <p className="font-bold">{pdo.name || "Dilemma Ferti Hidayah, S.E."}</p>
                  <p>NIP. {formatNip(pdo.nik || "19870130 201012 2 005")}</p>
                </div>
              </div>

              {/* Kolom 3: PPK */}
              <div className="flex flex-col justify-between">
                <div>
                  <p>{cityDateText}</p>
                  <p>Menyetujui,</p>
                  <p>Pejabat Pembuat Komitmen</p>
                  <p className="italic">Implementing Partner <span className="not-italic">BKSDA KALTIM</span></p>
                  <div className="h-12" />
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
