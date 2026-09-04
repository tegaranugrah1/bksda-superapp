"use client";

import {
  Props,
  formatNumber,
  formatNip,
  words,
  formatFullDateIndonesia,
  buildDefaultSptjbUraian,
} from "../shared";

export function SpbyDipaPreview({
  recipients,
  activity,
  travel,
  sptNumber,
  ppk,
  pdo,
  total,
  spbNumber,
  dipaConfig,
}: Props) {
  const primaryRecipient = recipients[0] || { name: "-", nip: "" };
  const primaryName = primaryRecipient.name;
  const isDkk = recipients.length > 1;
  const kepadaText = `${primaryName}${isDkk ? ", Dkk" : ""}`;
  const uraian =
    dipaConfig?.uraianSptjb ||
    buildDefaultSptjbUraian(travel, recipients.length, dipaConfig?.maksudTujuan || activity.name);

  const bendahara = dipaConfig?.bendahara || pdo || { name: "SOERENDENG, SE", nik: "19790721 200701 2 001" };
  const noSpby = spbNumber?.no ? `${spbNumber.no}${spbNumber.suffix || ""}` : `          /          / 2026`;
  const tanggalSpby = dipaConfig?.spdDate || formatFullDateIndonesia(travel.startDate);

  return (
    <div id="spby-dipa-print-root" className="spby-dipa-print-root font-['Figtree',sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&display=swap');
        .spby-dipa-print-root, .spby-dipa-paper, .spby-dipa-paper * {
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
          .spby-dipa-print-root {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .spby-dipa-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
      <div className="spby-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none font-['Figtree',sans-serif]">
        {/* Header */}
        <div className="text-center font-bold">
          <p className="text-[11pt] uppercase tracking-wide">KEMENTERIAN KEHUTANAN</p>
          <p className="text-[11pt] uppercase tracking-wide">BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR (693614)</p>
          <div className="mt-3">
            <h1 className="text-[11pt] font-bold uppercase tracking-wider underline inline-block">SURAT PERINTAH BAYAR</h1>
          </div>
        </div>

        {/* Tanggal & Nomor Table */}
        <div className="mt-3 border border-black text-[9.5pt]">
          <div className="grid grid-cols-2 divide-x divide-black">
            <div className="p-1.5 flex gap-2">
              <span className="w-16">Tanggal</span>
              <span>:</span>
              <span>{tanggalSpby}</span>
            </div>
            <div className="p-1.5 flex gap-2">
              <span className="w-16">Nomor</span>
              <span>:</span>
              <span>{noSpby}</span>
            </div>
          </div>
        </div>

        {/* Body Paragraph */}
        <div className="mt-3 text-[9.5pt] leading-relaxed text-justify">
          <p>
            Saya yang bertanda tangan dibawah ini selaku Pejabat Pembuat Komitmen memerintahkan Bendahara Pengeluaran agar melakukan pembayaran sejumlah :
          </p>
        </div>

        {/* Rincian Box */}
        <div className="mt-3 text-[9.5pt] space-y-1.5">
          <div className="grid grid-cols-[130px_10px_1fr]">
            <span className="font-bold">Rp.</span>
            <span>:</span>
            <span className="font-bold">{formatNumber(total)}</span>
          </div>
          <div className="grid grid-cols-[130px_10px_1fr]">
            <span className="italic">Terbilang</span>
            <span>:</span>
            <span className="italic font-semibold">{words(total)}</span>
          </div>
          <div className="grid grid-cols-[130px_10px_1fr] pt-2">
            <span>Kepada</span>
            <span>:</span>
            <span className="font-bold">{kepadaText}</span>
          </div>
          <div className="grid grid-cols-[130px_10px_1fr] pt-1">
            <span>Untuk Pembayaran</span>
            <span>:</span>
            <span className="text-justify leading-snug">{uraian}</span>
          </div>
          <div className="pt-2">
            <p>Atas Dasar :</p>
            <div className="pl-4 mt-0.5 space-y-0.5">
              <div className="grid grid-cols-[200px_10px_1fr]">
                <span>1. Kuitansi/bukti pembayaran</span>
                <span>:</span>
                <span>(Bukti Pembayaran)</span>
              </div>
              <div className="grid grid-cols-[200px_10px_1fr]">
                <span>2. Nota/bukti penerimaan barang/jasa</span>
                <span>:</span>
                <span>- (Bukti Pembelian) / (Bukti lainnya)</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p>Dibebankan pada :</p>
            <div className="pl-4 mt-0.5 space-y-0.5">
              <div className="grid grid-cols-[180px_10px_1fr]">
                <span>Kegiatan, Output, MAK</span>
                <span>:</span>
                <span className="font-mono">{dipaConfig?.klasifikasiMak || "7271.REA.001.524111"}</span>
              </div>
              <div className="grid grid-cols-[180px_10px_1fr]">
                <span>Kode</span>
                <span>:</span>
                <span className="font-mono">{dipaConfig?.kodeMak || "051.F.077"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Column Signatures */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-[9pt] border-t border-black pt-3">
          {/* Kolom 1: Bendahara Pengeluaran */}
          <div className="flex flex-col justify-between">
            <div>
              <p>Setuju/lunas dibayar,</p>
              <p>Tanggal {tanggalSpby}</p>
              <p className="mt-2 font-semibold">Bendahara Pengeluaran,</p>
            </div>
            <div className="mt-14">
              <p className="font-bold uppercase">{bendahara.name}</p>
              <p>NIP. {formatNip(bendahara.nik)}</p>
            </div>
          </div>

          {/* Kolom 2: Penerima Uang */}
          <div className="flex flex-col justify-between">
            <div>
              <p>&nbsp;</p>
              <p>Diterima Tanggal {tanggalSpby}</p>
              <p className="mt-2 font-semibold">Penerima Uang/Uang Muka Kerja,</p>
            </div>
            <div className="mt-14">
              <p className="font-bold uppercase">{primaryRecipient.name}</p>
              <p>NIP. {formatNip(primaryRecipient.nip || primaryRecipient.id)}</p>
            </div>
          </div>

          {/* Kolom 3: PPK */}
          <div className="flex flex-col justify-between">
            <div>
              <p>Samarinda,</p>
              <p>&nbsp;</p>
              <p className="mt-2 font-semibold">a.n. Kuasa Pengguna Anggaran<br />Pejabat Pembuat Komitmen,</p>
            </div>
            <div className="mt-14">
              <p className="font-bold uppercase">{ppk.name || "RUSMANTO, S.Hut"}</p>
              <p>NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
