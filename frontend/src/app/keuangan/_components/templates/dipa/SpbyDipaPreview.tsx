"use client";

import {
  Props,
  formatNumber,
  formatNip,
  words,
  formatFullDateIndonesia,
  formatIndoDateOptional,
  formatSpbyNumber,
  getRomanMonth,
  buildDefaultSptjbUraian,
  DEFAULT_DIPA_KLASIFIKASI_MAK,
  computeDipaMak,
  DipaMakItem,
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
  const currentRomanMonth = getRomanMonth(new Date());
  const currentYear = new Date().getFullYear().toString();
  const spbyNo = dipaConfig?.spbyNo?.trim() || "";
  const spbyMonth = dipaConfig?.spbyMonth !== undefined && dipaConfig.spbyMonth !== "" ? dipaConfig.spbyMonth : currentRomanMonth;
  const spbyYear = dipaConfig?.spbyYear !== undefined && dipaConfig.spbyYear !== "" ? dipaConfig.spbyYear : currentYear;
  const tanggalSpby = formatIndoDateOptional(dipaConfig?.spbyDate);
  const rawCity = dipaConfig?.cityDateText?.trim() || "Samarinda,";
  const cityText = rawCity.endsWith(",") ? rawCity : `${rawCity},`;

  const autoMak = computeDipaMak(recipients, travel);
  const klasifikasiMak = dipaConfig?.klasifikasiMak || DEFAULT_DIPA_KLASIFIKASI_MAK;
  const makKode = dipaConfig?.kodeMak?.trim() ? dipaConfig.kodeMak.trim() : autoMak.kodeMak;
  const makDesc = dipaConfig?.makDescription?.trim()
    ? dipaConfig.makDescription.trim()
    : dipaConfig?.kodeMak?.trim()
    ? (autoMak.kodeMak === dipaConfig.kodeMak.trim() ? autoMak.description : "")
    : autoMak.description;

  const makItems: DipaMakItem[] =
    dipaConfig?.makItems && dipaConfig.makItems.length === 1
      ? dipaConfig.makItems
      : [
          {
            kodeMak: makKode,
            description: makDesc,
            hasUangHarian: autoMak.hasUangHarian,
            hasPenginapan: autoMak.hasPenginapan,
            hasTransport: autoMak.hasTransport,
          },
        ];

  return (
    <div id="spby-dipa-print-root" className="spby-dipa-print-root font-['Arial_Narrow',Arial,sans-serif]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=PT+Sans+Narrow:wght@400;700&display=swap');
        .spby-dipa-print-root, .spby-dipa-paper, .spby-dipa-paper * {
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
            font-size: 11pt !important;
          }
        }
      `}</style>
      <div className="spby-dipa-paper mx-auto w-full max-w-[210mm] bg-white p-6 text-slate-950 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-[11pt]">
        <div className="border border-black divide-y divide-black">
          {/* Box 1: Kementerian, Tanggal dan Nomor jadi 1 border */}
          <div className="p-3.5 text-center font-bold">
            <div className="inline-block text-center max-w-full">
              <p className="text-[11pt] uppercase tracking-wide whitespace-nowrap">KEMENTERIAN KEHUTANAN</p>
              <p className="text-[11pt] uppercase tracking-wide whitespace-nowrap">BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR (693614)</p>
              <div className="my-2.5">
                <h1 className="text-[11pt] font-bold uppercase tracking-wider underline inline-block">SURAT PERINTAH BAYAR</h1>
              </div>
              <div className="mt-3 flex justify-between items-center text-[11pt] font-normal text-left w-full">
                <div className="flex items-center gap-2">
                  <span>Tanggal</span>
                  <span>:</span>
                  <span>{tanggalSpby || ""}</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-1.5">Nomor :</span>
                  {dipaConfig?.noSpby && !dipaConfig.spbyNo && !dipaConfig.spbyMonth && !dipaConfig.spbyYear ? (
                    <span className="font-mono whitespace-pre">{dipaConfig.noSpby}</span>
                  ) : spbyNo ? (
                    <span className="font-mono">{`${spbyNo} / ${spbyMonth} / ${spbyYear}`}</span>
                  ) : (
                    <span className="font-mono flex items-center">
                      <span className="inline-block w-14">&nbsp;</span>
                      <span>{`/ ${spbyMonth} / ${spbyYear}`}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Saya yang bertanda tangan sampai terbilang jadi 1 border */}
          <div className="p-3.5 text-[11pt] leading-relaxed text-justify">
            <p>
              Saya yang bertanda tangan dibawah ini selaku Pejabat Pembuat Komitmen memerintahkan Bendahara Pengeluaran agar melakukan pembayaran sejumlah :
            </p>
            <div className="mt-2 space-y-1">
              <div className="grid grid-cols-[140px_10px_1fr]">
                <span>Rp.</span>
                <span>:</span>
                <span className="font-bold">{formatNumber(total)}</span>
              </div>
              <div className="grid grid-cols-[140px_10px_1fr]">
                <span>Terbilang</span>
                <span>:</span>
                <span className="italic font-semibold">{words(total)}</span>
              </div>
            </div>
          </div>

          {/* Box 3: Kepada sampai Kode 051 jadi 1 border */}
          <div className="p-3.5 text-[11pt] space-y-2">
            <div className="grid grid-cols-[140px_10px_1fr]">
              <span>Kepada</span>
              <span>:</span>
              <span className="font-bold">{kepadaText}</span>
            </div>
            <div className="grid grid-cols-[140px_10px_1fr]">
              <span>Untuk Pembayaran</span>
              <span>:</span>
              <span className="text-justify leading-snug">{uraian}</span>
            </div>
            <div className="pt-1">
              <p>Atas Dasar :</p>
              <div className="pl-4 mt-0.5 space-y-0.5">
                <div className="grid grid-cols-[230px_10px_1fr] items-center">
                  <span>1. Kuitansi/bukti pembayaran</span>
                  <span>:</span>
                  <span className="flex items-center">
                    {dipaConfig?.spbyKuitansi ? (
                      <span className="font-mono mr-2">{dipaConfig.spbyKuitansi}</span>
                    ) : (
                      <span className="inline-block w-14">&nbsp;</span>
                    )}
                    <span>(Bukti Pembayaran)</span>
                  </span>
                </div>
                <div className="grid grid-cols-[230px_10px_1fr] items-start">
                  <div>
                    <p>2. Nota/bukti penerimaan barang/jasa</p>
                    <p className="pl-3.5">(Bukti lainnya)</p>
                  </div>
                  <span className="pt-0.5">:</span>
                  <span className="flex items-center pt-0.5">
                    {dipaConfig?.spbyNota ? (
                      <span className="font-mono mr-2">{dipaConfig.spbyNota}</span>
                    ) : (
                      <span className="inline-block w-14">&nbsp;</span>
                    )}
                    <span>(Bukti Pembelian)</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <p>Dibebankan pada :</p>
              <div className="pl-4 mt-0.5 space-y-0.5">
                <div className="grid grid-cols-[180px_10px_1fr]">
                  <span>Kegiatan, Output, MAK</span>
                  <span>:</span>
                  <span className="font-mono">{klasifikasiMak}</span>
                </div>
                {makItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[180px_10px_1fr]">
                    <span>{idx === 0 ? "Kode" : ""}</span>
                    <span>:</span>
                    <div>
                      <span className="font-mono inline-block w-[160px]">{item.kodeMak}</span>
                      <span>{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Box 4: Setuju sampai NIP jadi 1 border */}
          <div className="p-3.5 text-[11pt]">
            <table className="w-full table-fixed border-collapse text-left">
              <tbody>
                {/* Row 29 Excel: Header */}
                <tr>
                  <td className="w-1/3 align-top pr-2">Setuju/lunas dibayar,</td>
                  <td className="w-1/3 align-top pr-2">Diterima Tanggal</td>
                  <td className="w-1/3 align-top"> {cityText}</td>
                </tr>
                {/* Row 30 Excel: Tanggal */}
                <tr>
                  <td className="w-1/3 align-top leading-normal pr-2">
                    {tanggalSpby ? `Tanggal ${tanggalSpby}` : "Tanggal"}
                  </td>
                  <td className="w-1/3 align-top leading-normal pr-2">
                    {tanggalSpby || "\u00A0"}
                  </td>
                  <td className="w-1/3 align-top leading-normal">
                    {tanggalSpby || "\u00A0"}
                  </td>
                </tr>
                {/* Row 31 Excel: Spacer */}
                <tr className="h-2">
                  <td colSpan={3}></td>
                </tr>
                {/* Row 32 Excel: Jabatan Baris 1 */}
                <tr className="font-semibold">
                  <td className="w-1/3 align-top leading-normal pr-2">&nbsp;</td>
                  <td className="w-1/3 align-top leading-normal pr-2">Penerima Uang/</td>
                  <td className="w-1/3 align-top leading-normal">a.n. Kuasa Pengguna Anggaran</td>
                </tr>
                {/* Row 33 Excel: Jabatan Baris 2 */}
                <tr className="font-semibold">
                  <td className="w-1/3 align-top leading-normal pr-2">Bendahara Pengeluaran</td>
                  <td className="w-1/3 align-top leading-normal pr-2">Uang Muka Kerja</td>
                  <td className="w-1/3 align-top leading-normal">Pejabat Pembuat Komitmen,</td>
                </tr>
                {/* Rows 34-36 Excel: Tanda Tangan Spacer */}
                <tr className="h-16">
                  <td colSpan={3}></td>
                </tr>
                {/* Row 37 Excel: Nama Pejabat */}
                <tr className="font-bold uppercase">
                  <td className="w-1/3 align-top pr-2">
                    <span className="underline">{bendahara.name}</span>
                  </td>
                  <td className="w-1/3 align-top pr-2">
                    <span className="underline">{primaryRecipient.name}</span>
                  </td>
                  <td className="w-1/3 align-top">
                    <span className="underline">{ppk.name || "RUSMANTO, S.Hut"}</span>
                  </td>
                </tr>
                {/* Row 38 Excel: NIP */}
                <tr>
                  <td className="w-1/3 align-top pr-2">NIP. {formatNip(bendahara.nik)}</td>
                  <td className="w-1/3 align-top pr-2">NIP. {formatNip(primaryRecipient.nip || primaryRecipient.id)}</td>
                  <td className="w-1/3 align-top">NIP. {formatNip(ppk.nik || "19810907 200012 1 004")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
