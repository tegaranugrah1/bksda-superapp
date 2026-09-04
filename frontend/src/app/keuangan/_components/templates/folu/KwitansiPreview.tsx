"use client";

import {
  Props,
  formatNumber,
  formatNip,
  words,
  getReceiverInfo,
  getMengetahuiOfficial,
} from "../shared";

export function KwitansiPreview({
  recipients,
  activity,
  ppk,
  pdo,
  kwitansiConfig,
}: Omit<Props, "selectedDocument" | "travel" | "total">) {
  return (
    <div id="kuitansi-print-root" className="kuitansi-print-root font-['Figtree',sans-serif] space-y-8 print:space-y-0">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');

        .kuitansi-print-root, .kuitansi-paper, .kuitansi-paper * {
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
          .kuitansi-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            font-family: 'Figtree', sans-serif !important;
          }
          .kuitansi-paper {
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
          .kuitansi-paper:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {recipients.map((recipient, index) => {
        const receiver = getReceiverInfo(recipient);
        const mengetahui = getMengetahuiOfficial(recipient);
        const cleanDescription = recipient.description.replace(/^Pembayaran Biaya\s*/i, "").trim();

        return (
          <div
            key={recipient.id || index}
            className="kuitansi-paper mx-auto w-full max-w-[210mm] bg-white p-6 md:p-8 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[9pt] leading-normal font-['Figtree',sans-serif]"
          >
            {/* Outer Box with Border */}
            <div className="border border-black">
              {/* Header Title */}
              <div className="border-b border-black py-2 text-center">
                <h1 className="text-[11pt] font-bold uppercase tracking-wide">
                  KUITANSI PEMBAYARAN
                </h1>
              </div>

              {/* Kotak Kanan Atas (Metadata) */}
              <div className="p-3 border-b border-black flex justify-end">
                <div className="border border-black p-2 w-full max-w-90 text-[8.5pt]">
                  <div className="grid grid-cols-[80px_8px_1fr] gap-y-1 items-start">
                    <span>TA</span>
                    <span>:</span>
                    <span>2026</span>

                    <span>Nomor Bukti</span>
                    <span>:</span>
                    <span className="font-mono whitespace-nowrap text-[8pt]">
                      {recipient.evidence?.trim() ? (
                        recipient.evidence.trim().startsWith("/") ? (
                          <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{recipient.evidence.trim()}</>
                        ) : (
                          recipient.evidence.trim()
                        )
                      ) : (
                        <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/K.18/FOLU.NC-23/08/2026</>
                      )}
                    </span>

                    <span>Kode AWP</span>
                    <span>:</span>
                    <span>{activity.awpCode}</span>

                    <span>Kegiatan</span>
                    <span>:</span>
                    <span className="leading-tight">{activity.name}</span>
                  </div>
                </div>
              </div>

              {/* Sub Header */}
              <div className="border-b border-black py-1.5 text-center">
                <h2 className="text-[10pt] font-bold uppercase tracking-wide">
                  KUITANSI / BUKTI PEMBAYARAN
                </h2>
              </div>

              {/* Body Fields */}
              <div className="p-4 space-y-3 text-[9pt]">
                <div className="grid grid-cols-[140px_10px_1fr] gap-y-2.5">
                  <span className="font-normal">Sudah Terima dari</span>
                  <span>:</span>
                  <div className="leading-snug">
                    {kwitansiConfig?.sudahTerimaDari?.trim() ? (
                      <span className="whitespace-pre-line">{kwitansiConfig.sudahTerimaDari}</span>
                    ) : (
                      <>
                        Pejabat Pembuat Komitmen FOLU RBC NC 2&3<br />
                        IP BKSDA Kalimantan Timur T.A. 2026
                      </>
                    )}
                  </div>

                  <span className="font-normal">Jumlah uang</span>
                  <span>:</span>
                  <div className="font-normal">
                    Rp. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>{formatNumber(recipient.amount)}</b> &nbsp;&nbsp; ,-
                  </div>

                  <span className="font-normal">Terbilang</span>
                  <span>:</span>
                  <div className="italic">
                    {words(recipient.amount)}
                  </div>

                  <span className="font-normal">Untuk pembayaran</span>
                  <span>:</span>
                  <div className="text-justify leading-snug">
                    {cleanDescription}
                  </div>
                </div>

                {/* Receiver Signature (Yang Menerima - Kanan) */}
                <div className="pt-4 flex justify-end">
                  <div className="w-56 text-left">
                    <p>Samarinda,</p>
                    <p>Yang menerima</p>
                    <div className="h-16" />
                    <p className="font-bold">{receiver.name}</p>
                    <p>NIP. {receiver.nip}</p>
                  </div>
                </div>
              </div>

              {/* Middle 2-Column Signatures */}
              <div className="border-t border-black grid grid-cols-2 text-[9pt]">
                {/* Left: PPK */}
                <div className="border-r border-black p-3 flex flex-col justify-between">
                  <div>
                    <p>Setuju dibebankan pada mata anggaran berkenaan</p>
                    <p>An. Kuasa Pengguna Anggaran</p>
                    <p>Pejabat Pembuat Komitmen,</p>
                    <div className="h-16" />
                    <p className="font-bold">{ppk.name}</p>
                    <p>NIP. {formatNip(ppk.nik)}</p>
                  </div>
                </div>

                {/* Right: PDO */}
                <div className="p-3 flex flex-col justify-between">
                  <div>
                    <p>Lunas dibayar</p>
                    <p>Pada tanggal.</p>
                    <p>Pemegang Dana Operasional</p>
                    <div className="h-16" />
                    <p className="font-bold">{pdo.name || "Dilemma Ferti Hidayah, S.E."}</p>
                    <p>NIP. {formatNip(pdo.nik || "19870130 201012 2 005")}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Signature: Mengetahui */}
              <div className="border-t border-black p-3 text-[9pt]">
                <p>Barang/pekerjaan tersebut telah diterima/diselesaikan dengan lengkap dan baik</p>
                <p>Mengetahui</p>
                <p>{mengetahui.position}</p>
                <div className="h-14" />
                <p className="font-bold">{mengetahui.name}</p>
                <p>NIP. {formatNip(mengetahui.nik)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
