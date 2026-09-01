"use client";

import React from "react";

export interface TemuanSatwaLiarItem {
  id: string;
  namaLokal: string;
  namaIlmiah: string;
  tipeTemuan: 'Langsung' | 'Tidak Langsung';
}

export interface SmartPatrolReportData {
  // i. Cover
  coverMode: "standard" | "custom";
  customCoverPreview?: string;

  // ii. Informasi Dasar
  namaKegiatan: string;
  sumberDana: string;
  tanggal: string;
  dinilaiOleh: string;
  disusunOleh: string;

  // iii - v
  kataPengantar: string;
  daftarIsi?: string;
  daftarLampiran?: string;

  // BAB I Pendahuluan
  latarBelakang: string;
  dasarHukum: string;
  maksud: string;
  tujuan: string;
  penerimaManfaat: string;
  output: string;
  indikatorKinerja: string;
  satuanUkur: string;
  volume: string;
  ruangLingkup: string;

  // BAB II Metodologi
  waktuTempat: string;
  pelaksanaKegiatan: string;
  pelaksanaEmployees?: Array<{
    id: string;
    nama_lengkap: string;
    nip: string;
    jabatan: string;
  }>;
  alatBahan: string;
  metodePelaksanaan: string;
  tahapanPelaksanaan: string;

  // BAB III, IV, V
  hasilPelaksanaanIntro: string;
  temuanSatwaLiarIntro: string;
  temuanSatwaLiarTable: TemuanSatwaLiarItem[];
  temuanSatwaLiarOutro: string;
  statusKonservasiKawasan: string;
  temuanAncaman: string;
  kesimpulan: string;
  saran: string;
  penutup: string;

  // Dokumentasi
  dokumentasiPreviews?: string[];
  tallySheetName?: string;
  sptName?: string;
}

interface SmartPatrolPrintProps {
  data: SmartPatrolReportData;
  tallySheetFile?: File | null;
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

function getMonthYearIndo(dateStr?: string | null): string {
  if (!dateStr) return "JULI 2026";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "JULI 2026";
    return d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }).toUpperCase();
  } catch (e) {
    return "JULI 2026";
  }
}

export function SmartPatrolPrint({ data, tallySheetFile }: SmartPatrolPrintProps) {
  const defaultDate = data.tanggal || new Date().toISOString();
  const tanggalFormatted = formatDateIndo(defaultDate);
  const monthYearUpper = getMonthYearIndo(defaultDate);

  // Default values matching sample document
  const defaultNamaKegiatan = data.namaKegiatan || "SMART PATROL/PATROLI PERLINDUNGAN KAWASAN DI KAWASAN SUAKA MARGASATWA KELIAN";
  const defaultSumberDana = data.sumberDana || "ANGGARAN PROYEK FOLU NET SINK 2030 RBC NORWEGIA TAHAP II DAN III (FOLU NC 2&3) PADA AWP KSDAE – TAHUN ANGGARAN 2026";
  const defaultDinilai = data.dinilaiOleh || "Dheny Mardiono, S.Hut., M.Sc.\nNIP. 19750314 199903 1 004";
  const defaultDisusun = data.disusunOleh || "Didi Susanto, S.Si.\nNIP. 19880719 202012 1 003";

  const renderTocRow = (title: string, page: string = "", isBold: boolean = false, isIndent: boolean = false) => (
    <tr key={title}>
      <td className={`py-1 ${isIndent ? 'pl-6' : ''}`}>
        <div className="flex items-baseline">
          <span className={isBold ? 'font-bold' : ''}>{title}</span>
          <div className="flex-1 border-b-[2px] border-dotted border-black mb-[0.35rem] mx-2"></div>
        </div>
      </td>
      <td className="text-right font-normal">{page}</td>
    </tr>
  );

  const renderContent = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const blocks: { type: 'paragraph' | 'list_item'; content: string; marker?: string }[] = [];
    
    let currentBlockContent = "";
    let currentBlockType: 'paragraph' | 'list_item' = 'paragraph';
    let currentMarker = "";
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        if (currentBlockContent.trim() !== '') {
          blocks.push({ type: currentBlockType, content: currentBlockContent.trim(), marker: currentMarker });
          currentBlockContent = "";
        }
        currentBlockType = 'paragraph';
        currentMarker = "";
        return;
      }
      
      const listMatch = line.match(/^([a-zA-Z0-9]+\.|[-*])\s*(.*)$/);
      if (listMatch) {
        if (currentBlockContent.trim() !== '') {
          blocks.push({ type: currentBlockType, content: currentBlockContent.trim(), marker: currentMarker });
        }
        currentBlockType = 'list_item';
        currentMarker = listMatch[1];
        currentBlockContent = listMatch[2];
      } else {
        if (currentBlockContent !== '') {
          currentBlockContent += ' ' + trimmed;
        } else {
          currentBlockContent = trimmed;
        }
      }
    });
    
    if (currentBlockContent.trim() !== '') {
      blocks.push({ type: currentBlockType, content: currentBlockContent.trim(), marker: currentMarker });
    }
    
    return blocks.map((block, i) => {
      if (block.type === 'list_item') {
        const isSubList = /^(?:[a-z]+\.|[-*])$/.test(block.marker || '');
        const paddingClass = isSubList ? 'pl-[80px]' : 'pl-[48px]';
        
        return (
          <div key={i} className={`flex ${paddingClass}`}>
            <span className="w-8 shrink-0">{block.marker}</span>
            <span className="text-justify">{block.content}</span>
          </div>
        );
      }
      return (
        <p key={i} className="indent-[48px] text-justify">
          {block.content}
        </p>
      );
    });
  };

  const renderSectionWithAvoid = (title: string, text: string) => {
    if (!text) return null;
    const elements = renderContent(text);
    if (!Array.isArray(elements) || elements.length === 0) return null;
    
    return (
      <div className="pt-2">
        <div className="break-inside-avoid">
          <h3 className="font-bold text-[12pt] break-after-avoid">{title}</h3>
          <div className="pl-4 pt-1 text-[12pt] leading-normal space-y-1">
            {elements[0]}
          </div>
        </div>
        {elements.length > 1 && (
          <div className="pl-4 text-[12pt] leading-normal space-y-1 mt-1">
            {elements.slice(1)}
          </div>
        )}
      </div>
    );
  };

  const renderMaksudTujuan = () => {
    if (!data.maksud && !data.tujuan) return null;
    const maksudElements = data.maksud ? renderContent(data.maksud) : [];
    const tujuanElements = data.tujuan ? renderContent(data.tujuan) : [];
    
    const mElements = Array.isArray(maksudElements) ? maksudElements : [];
    const tElements = Array.isArray(tujuanElements) ? tujuanElements : [];

    if (mElements.length === 0 && tElements.length === 0) return null;

    const firstElement = mElements.length > 0 ? mElements[0] : tElements[0];
    const restMaksud = mElements.length > 0 ? mElements.slice(1) : [];
    const restTujuan = mElements.length > 0 ? tElements : tElements.slice(1);

    return (
      <div className="pt-2">
        <div className="break-inside-avoid">
          <h3 className="font-bold text-[12pt] break-after-avoid">C. Maksud dan Tujuan</h3>
          <div className="pl-4 pt-1 text-[12pt] leading-normal space-y-1">
            {firstElement}
          </div>
        </div>
        {restMaksud.length > 0 && (
          <div className="pl-4 text-[12pt] leading-normal space-y-1 mt-1">
            {restMaksud}
          </div>
        )}
        {restTujuan.length > 0 && (
          <div className="pl-4 text-[12pt] leading-normal space-y-1 mt-1">
            {restTujuan}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="smart-patrol-print-wrapper bg-white text-black text-[12pt] leading-snug max-w-[210mm] mx-auto p-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <style jsx global>{`
        .smart-patrol-print-wrapper,
        .smart-patrol-print-wrapper * {
          box-sizing: border-box;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .smart-patrol-print-wrapper,
          .smart-patrol-print-wrapper * {
            visibility: visible;
          }

          .smart-patrol-print-wrapper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 1. HALAMAN COVER LAPORAN */}
      {/* ========================================================================= */}
      {data.coverMode === "custom" && data.customCoverPreview ? (
        <div className="cover-page min-h-[297mm] flex items-center justify-center p-0 mb-8" style={{ pageBreakAfter: "always" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.customCoverPreview} alt="Custom Cover" className="w-full h-auto max-h-[297mm] object-contain" />
        </div>
      ) : (
        <div className="cover-page min-h-[297mm] bg-gradient-to-b from-slate-50 via-white to-emerald-900/10 py-16 pl-[25mm] pr-[22mm] flex flex-col justify-between border border-slate-200 relative overflow-hidden mb-8" style={{ pageBreakAfter: "always" }}>
          
          {/* Top Logo Banner */}
          <div className="flex items-center justify-between border-b border-emerald-800/30 pb-4 mb-6">
            <div className="flex items-center gap-3">
              {/* Logo Kementerian Kehutanan */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_bksda.png" alt="Logo Kemenhut" className="h-10 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              <div className="text-[7.5pt] font-extrabold uppercase leading-tight text-emerald-950">
                KEMENTERIAN KEHUTANAN<br/>REPUBLIK INDONESIA
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[8pt] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">bpdlh</div>
              <div className="text-[8pt] font-black text-blue-900">INDONESIA'S <span className="text-emerald-700">FOLU NET SINK 2030</span></div>
              <div className="text-[8pt] font-black text-emerald-900 border-l border-emerald-300 pl-2">BKSDA KALTIM</div>
            </div>
          </div>

          {/* Title Header */}
          <div className="space-y-3 pt-2">
            <h1 className="text-[26pt] font-black text-emerald-950 tracking-tight leading-none">
              LAPORAN <span className="text-[20pt] font-semibold text-emerald-800 block mt-1">Pelaksanaan Kegiatan</span>
            </h1>
            <div className="border-l-4 border-emerald-600 pl-4 py-1">
              <p className="text-[12pt] font-bold text-emerald-900 uppercase leading-snug">
                {defaultNamaKegiatan}
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-900 text-white text-[10pt] font-bold px-4 py-1.5 rounded-full shadow-sm">
                📅 {monthYearUpper}
              </span>
            </div>
          </div>

          {/* Main Photo Frame */}
          <div className="my-6 relative flex justify-center">
            <div className="w-full max-w-lg h-56 rounded-3xl overflow-hidden border-4 border-emerald-800/20 shadow-xl bg-slate-100 flex items-center justify-center">
              {data.dokumentasiPreviews && data.dokumentasiPreviews.length > 0 ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={data.dokumentasiPreviews[0]} alt="Foto Tim Patroli" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-6 text-emerald-900/60">
                  <p className="text-[12pt] font-bold">FOTO TIM PATROLI KAWASAN</p>
                  <p className="text-[9pt]">Suaka Margasatwa Kelian</p>
                </div>
              )}
            </div>
          </div>

          {/* Disusun Oleh Card & Bottom Branding */}
          <div className="space-y-6">
            <div className="bg-white/90 border border-emerald-200 p-4 rounded-2xl max-w-sm shadow-md space-y-1">
              <p className="text-[9.5pt] font-bold text-emerald-950 uppercase">Disusun Oleh:</p>
              <p className="text-[9.5pt] font-medium text-emerald-900 whitespace-pre-line">{defaultDisusun}</p>
            </div>

            <div className="bg-emerald-950 text-white p-5 rounded-2xl space-y-2 relative">
              <p className="text-[8.5pt] font-extrabold uppercase tracking-wider">KEMENTERIAN KEHUTANAN</p>
              <p className="text-[8pt] font-medium opacity-90 leading-tight">
                DIREKTORAT JENDERAL KONSERVASI SUMBER DAYA ALAM DAN EKOSISTEM<br/>
                BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
              </p>
              <div className="pt-2 flex justify-between items-center text-[8pt] font-bold">
                <span>📍 Samarinda</span>
                <span className="bg-emerald-800 px-3 py-1 rounded-full">🗓️ {tanggalFormatted}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HALAMAN -ii- : LEMBAR PERSETUJUAN */}
      {/* ========================================================================= */}
      <div className="page-ii min-h-[297mm] pt-16 pb-16 pl-[25mm] pr-[22mm] flex flex-col relative" style={{ pageBreakAfter: "always" }}>
        <div className="mb-8">
          <div className="text-center text-[12pt] text-black pb-8">-ii-</div>
          <h2 className="text-[14pt] font-bold text-center uppercase tracking-wide mb-8 leading-tight">
            LEMBAR PERSETUJUAN<br/>LAPORAN PELAKSANAAN KEGIATAN
          </h2>

          <p className="mb-4 font-normal">Yang bertanda tangan dibawah :</p>

          <table className="w-full border-collapse mb-8" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td style={{ width: "160px", verticalAlign: "top", padding: "2px 0", fontWeight: "normal" }}>NAMA KEGIATAN</td>
                <td style={{ width: "18px", verticalAlign: "top", padding: "2px 0", fontWeight: "normal" }}>:</td>
                <td style={{ verticalAlign: "top", padding: "2px 0", fontWeight: "bold" }}>
                  {defaultNamaKegiatan}
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: "top", padding: "2px 0", fontWeight: "normal" }}>SUMBER DANA</td>
                <td style={{ verticalAlign: "top", padding: "2px 0", fontWeight: "normal" }}>:</td>
                <td style={{ verticalAlign: "top", padding: "2px 0", fontWeight: "normal" }}>
                  {defaultSumberDana}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ pageBreakInside: "avoid" }}>
          <table className="w-full text-left" style={{ tableLayout: "fixed" }}>
            <tbody>
              <tr>
                <td className="align-top pr-4" style={{ width: "60%" }}>
                  <p className="font-normal mt-4">Dinilai Oleh :</p>
                  <p className="font-normal">Kepala Sub Bagian Tata Usaha</p>
                  <p className="font-normal mb-[72px]">Balai KSDA Kalimantan Timur</p>
                  <p className="font-bold">{defaultDinilai.split('\n')[0]}</p>
                  <p className="font-bold">{defaultDinilai.split('\n')[1] || "NIP. 19750314 199903 1 004"}</p>
                </td>
                <td className="align-top pl-4" style={{ width: "40%" }}>
                  <p className="font-normal mb-2">Samarinda, {tanggalFormatted}</p>
                  <p className="font-normal">Disusun Oleh :</p>
                  <p className="font-normal mb-[96px]">Pelaksana Kegiatan,</p>
                  <p className="font-bold">{defaultDisusun.split('\n')[0]}</p>
                  <p className="font-bold">{defaultDisusun.split('\n')[1] || "NIP. 19880719 202012 1 003"}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. HALAMAN -iii- : KATA PENGANTAR */}
      {/* ========================================================================= */}
      <table className="w-full border-collapse" style={{ pageBreakAfter: "always" }}>
        <thead className="hidden print:table-header-group">
          <tr><td style={{ height: "16mm", border: "none", padding: 0 }}></td></tr>
        </thead>
        <tfoot className="hidden print:table-footer-group">
          <tr><td style={{ height: "16mm", border: "none", padding: 0 }}></td></tr>
        </tfoot>
        <tbody>
          <tr>
            <td className="align-top pl-[25mm] pr-[22mm]">
              <div className="page-iii block relative py-8 print:py-0">
                <div>
                  <div className="text-center text-[10pt] text-gray-500 pb-6">-iii-</div>
                  <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider mb-8">
                    KATA PENGANTAR
                  </h2>
        
                  <div className="text-justify text-[12pt] leading-normal">
                    {data.kataPengantar ? (
                      data.kataPengantar.split(/\n\s*\n/).filter(p => p.trim() !== '').map((p, i) => (
                        <p key={i} className="indent-[48px] mb-1">{p}</p>
                      ))
                    ) : (
                      <p className="indent-[48px]">Belum ada Kata Pengantar.</p>
                    )}
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ========================================================================= */}
      {/* 4. HALAMAN -iv- & -v- : DAFTAR ISI & DAFTAR LAMPIRAN */}
      {/* ========================================================================= */}
      <div className="page-iv min-h-[297mm] pt-16 pb-16 pl-[25mm] pr-[22mm] flex flex-col justify-between relative" style={{ pageBreakAfter: "always" }}>
        <div>
          <div className="text-center text-[10pt] text-gray-500 pb-6">-iv-</div>
          <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider mb-6">
            DAFTAR ISI
          </h2>

          <table className="w-full text-[12pt] border-collapse" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="border-b border-black">
                <th className="text-left py-2 font-bold" style={{ width: "85%" }}>JUDUL</th>
                <th className="text-right py-2 font-bold" style={{ width: "15%" }}>Halaman</th>
              </tr>
            </thead>
            <tbody>
              {renderTocRow("HALAMAN JUDUL", "")}
              {renderTocRow("LEMBAR PERSETUJUAN", "")}
              {data.kataPengantar && renderTocRow("KATA PENGANTAR", "")}
              {renderTocRow("DAFTAR ISI", "")}
              {renderTocRow("DAFTAR LAMPIRAN", "")}

              {/* BAB I */}
              {(data.latarBelakang || data.dasarHukum || data.maksud || data.tujuan || data.penerimaManfaat || data.output || data.indikatorKinerja || data.satuanUkur || data.volume || data.ruangLingkup) && (
                <>
                  <tr><td className="py-1 font-bold pt-3" colSpan={2}>BAB I PENDAHULUAN</td></tr>
                  {data.latarBelakang && renderTocRow("A. Latar Belakang", "", false, true)}
                  {data.dasarHukum && renderTocRow("B. Dasar Hukum", "", false, true)}
                  {(data.maksud || data.tujuan) && renderTocRow("C. Maksud dan Tujuan", "", false, true)}
                  {data.penerimaManfaat && renderTocRow("D. Penerima Manfaat/Sasaran", "", false, true)}
                  {data.output && renderTocRow("E. Output", "", false, true)}
                  {data.indikatorKinerja && renderTocRow("F. Indikator Kinerja Kegiatan", "", false, true)}
                  {data.satuanUkur && renderTocRow("G. Satuan Ukur", "", false, true)}
                  {data.volume && renderTocRow("H. Volume", "", false, true)}
                  {data.ruangLingkup && renderTocRow("I. Ruang Lingkup", "", false, true)}
                </>
              )}

              {/* BAB II */}
              {(data.waktuTempat || data.pelaksanaKegiatan || data.alatBahan || data.metodePelaksanaan || data.tahapanPelaksanaan) && (
                <>
                  <tr><td className="py-1 font-bold pt-3" colSpan={2}>BAB II METODOLOGI</td></tr>
                  {data.waktuTempat && renderTocRow("A. Waktu dan Tempat", "", false, true)}
                  {data.pelaksanaKegiatan && renderTocRow("B. Pelaksana Kegiatan", "", false, true)}
                  {data.alatBahan && renderTocRow("C. Alat dan Bahan", "", false, true)}
                  {data.metodePelaksanaan && renderTocRow("D. Metode Pelaksanaan", "", false, true)}
                  {data.tahapanPelaksanaan && renderTocRow("E. Tahapan Pelaksanaan Kegiatan", "", false, true)}
                </>
              )}

              {/* BAB III */}
              {(data.hasilPelaksanaanIntro || data.temuanSatwaLiarIntro) && (
                <>
                  <tr><td className="py-1 font-bold pt-3" colSpan={2}>BAB III HASIL KEGIATAN</td></tr>
                  {renderTocRow("A. Hasil Pelaksanaan", "", false, true)}
                </>
              )}

              {/* BAB IV */}
              {(data.kesimpulan || data.saran) && (
                <>
                  <tr><td className="py-1 font-bold pt-3" colSpan={2}>BAB IV SIMPULAN DAN SARAN</td></tr>
                  {data.kesimpulan && renderTocRow("A. Kesimpulan", "", false, true)}
                  {data.saran && renderTocRow("B. Saran/Rekomendasi", "", false, true)}
                </>
              )}

              {/* BAB V */}
              {data.penutup && renderTocRow("BAB V PENUTUP", "", true, false)}

              {/* LAMPIRAN */}
              {renderTocRow("LAMPIRAN", "", true, false)}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. BAB I S/D BAB V & LAMPIRAN (MASTER TABLE ENGINE FOR AUTO PAGE BREAK) */}
      {/* ========================================================================= */}
      <table className="w-full border-collapse">
        <thead className="hidden print:table-header-group">
          <tr>
            <td style={{ height: "15mm", border: "none", padding: 0 }}></td>
          </tr>
        </thead>
        <tfoot className="hidden print:table-footer-group">
          <tr>
            <td style={{ height: "15mm", border: "none", padding: 0 }}></td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td className="align-top pb-16 pl-[25mm] pr-[22mm]">
              <div className="space-y-8">

                {/* BAB I PENDAHULUAN */}
                <section className="space-y-4">
                  <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider">BAB I. PENDAHULUAN</h2>
                  
                  <div className="space-y-4 text-justify">
                    <div>
                      <h3 className="font-bold text-[12pt]">A. Latar Belakang</h3>
                      <div className="pl-4 pt-1 text-[12pt] leading-normal text-justify">
                        {renderContent(data.latarBelakang || `Suaka Margasatwa Kelian Lestari adalah salah satu kawasan konservasi yang memiliki nilai strategis dalam menjaga keseimbangan ekosistem serta kelestarian keanekaragaman hayati di Kalimantan Timur. Kawasan ini menyimpan berbagai potensi biodiversitas, baik flora maupun fauna, termasuk jenis satwa liar dilindungi yang berperan penting dalam menjaga kestabilan rantai ekologi. Tidak hanya itu, keberadaan kawasan ini juga memberikan manfaat nyata bagi masyarakat sekitar, mulai dari fungsi tata air, penyediaan jasa ekosistem, hingga nilai sosial budaya yang melekat.

Namun, kondisi Suaka Margasatwa Kelian Lestari tidak terlepas dari berbagai ancaman serius. Bekas aktivitas pertambangan emas yang pernah berlangsung di dalam kawasan meninggalkan kerusakan ekologis yang cukup besar, seperti lubang tambang terbuka, degradasi habitat, serta perubahan bentang alam. Dampak tersebut tidak hanya mengganggu fungsi ekologis kawasan, tetapi juga memicu kerentanan baru, seperti perambahan hutan, penambangan tanpa izin, hingga pembalakan liar. Selain itu, perburuan satwa liar menjadi ancaman lain yang mengikis keberadaan spesies kunci dan berpotensi menurunkan keanekaragaman hayati kawasan.

Meski demikian, berbagai upaya rehabilitasi yang dilakukan sejak tahun 1992 telah menunjukkan hasil yang positif. Program revegetasi, pengendalian aktivitas manusia, dan pemulihan ekosistem pascatambang mulai mengembalikan fungsi ekologis kawasan. Pulihnya vegetasi menjadi habitat baru bagi satwa liar serta mendukung kegiatan pelepasliaran satwa dilindungi yang telah beberapa kali dilakukan. Pelepasliaran tersebut menjadi bukti nyata bahwa kawasan ini berpotensi kembali menjadi habitat yang layak sekaligus menjadi model keberhasilan pemulihan kawasan konservasi.

Dengan melihat kondisi tersebut, perlindungan dan pengamanan kawasan Suaka Margasatwa Kelian Lestari perlu terus ditingkatkan. Ancaman yang masih ada harus dikelola dengan langkah strategis, sementara keberhasilan yang telah diraih harus dipertahankan dan dikembangkan. Melalui patroli rutin, pengawasan intensif, serta pemanfaatan teknologi seperti SMART Patrol, diharapkan kawasan ini tetap lestari dan mampu menjalankan fungsinya sebagai penyangga kehidupan serta warisan alam yang berharga bagi generasi yang akan datang.`)}
                      </div>
                    </div>

                    {renderSectionWithAvoid("B. Dasar Hukum", data.dasarHukum)}
                    {renderMaksudTujuan()}
                    {renderSectionWithAvoid("D. Penerima Manfaat / Sasaran", data.penerimaManfaat)}
                    {renderSectionWithAvoid("E. Output", data.output)}
                    {renderSectionWithAvoid("F. Indikator Kinerja Kegiatan", data.indikatorKinerja)}
                    {renderSectionWithAvoid("G. Satuan Ukur", data.satuanUkur)}
                    {renderSectionWithAvoid("H. Volume", data.volume)}
                    {renderSectionWithAvoid("I. Ruang Lingkup", data.ruangLingkup)}
                  </div>
                </section>

                {/* BAB II METODOLOGI */}
                <section className="space-y-4 pt-6 page-break-before">
                  <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider">BAB II. METODOLOGI</h2>
                  
                  <div className="space-y-4 text-justify">
                    {renderSectionWithAvoid("A. Waktu dan Tempat", data.waktuTempat)}
                    {data.pelaksanaKegiatan && (
                      <div>
                        <h3 className="font-bold text-[12pt]">B. Pelaksana Kegiatan</h3>
                        <div className="pl-4 pt-1 text-[12pt] leading-normal space-y-1">{renderContent(data.pelaksanaKegiatan)}</div>
                        
                        {data.pelaksanaEmployees && data.pelaksanaEmployees.length > 0 && (
                          <div className="pl-4 pt-4 pb-2 text-[11pt] break-inside-avoid">
                            <p className="text-center mb-1 text-[10pt]">Tabel 1. Tim Smart Patrol/Patroli Perlindungan Kawasan di Kawasan Suaka Margasatwa Kelian</p>
                            <table className="w-full border-collapse border border-black text-left">
                              <thead>
                                <tr className="bg-black text-white text-center">
                                  <th className="border border-black p-1.5 w-12 font-bold">No</th>
                                  <th className="border border-black p-1.5 font-bold">Nama</th>
                                  <th className="border border-black p-1.5 font-bold">NIP</th>
                                  <th className="border border-black p-1.5 font-bold">Jabatan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.pelaksanaEmployees.map((emp, idx) => (
                                  <tr key={emp.id || idx}>
                                    <td className="border border-black p-1.5 text-center">{idx + 1}.</td>
                                    <td className="border border-black p-1.5">{emp.nama_lengkap}</td>
                                    <td className="border border-black p-1.5 text-center">{emp.nip}</td>
                                    <td className="border border-black p-1.5">{emp.jabatan}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                    {renderSectionWithAvoid("C. Alat dan Bahan", data.alatBahan)}
                    {renderSectionWithAvoid("D. Metode Pelaksanaan", data.metodePelaksanaan)}
                    {renderSectionWithAvoid("E. Tahapan Pelaksanaan Kegiatan", data.tahapanPelaksanaan)}
                  </div>
                </section>

                {/* BAB III HASIL KEGIATAN */}
                <section className="space-y-4 pt-6 page-break-before">
                  <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider">BAB III. HASIL KEGIATAN</h2>
                  
                  <div className="space-y-4 text-justify">
                    <div>
                      <div className="break-inside-avoid">
                        <h3 className="font-bold text-[12pt] break-after-avoid">A. Hasil Pelaksanaan</h3>
                        <div className="pl-4 pt-1 text-[12pt] leading-normal space-y-1">
                          {renderContent(data.hasilPelaksanaanIntro)?.[0]}
                        </div>
                      </div>
                      
                      <div className="pl-4 pt-1 text-[12pt] leading-normal space-y-1">
                        {(renderContent(data.hasilPelaksanaanIntro) || []).length > 1 && (
                          <div className="mb-2">
                            {renderContent(data.hasilPelaksanaanIntro)?.slice(1)}
                          </div>
                        )}
                        
                        <div className="break-inside-avoid">
                          <p className="font-bold pt-2 break-after-avoid">1. Temuan Satwa Liar</p>
                          {renderContent(data.temuanSatwaLiarIntro)?.[0]}
                        </div>
                        {(renderContent(data.temuanSatwaLiarIntro) || []).length > 1 && (
                          <div className="mt-1">
                            {renderContent(data.temuanSatwaLiarIntro)?.slice(1)}
                          </div>
                        )}
                        
                        {data.temuanSatwaLiarTable && data.temuanSatwaLiarTable.length > 0 && (
                          <div className="pt-2 pb-2 break-inside-avoid">
                            <p className="text-center text-[10pt] mb-1">Tabel 1. Data satwa liar yang teridentifikasi</p>
                            <table className="w-full border-collapse border border-black text-[11pt]">
                              <thead>
                                <tr className="text-center bg-gray-100">
                                  <th className="border border-black p-1" rowSpan={2}>No.</th>
                                  <th className="border border-black p-1" colSpan={2}>Jenis</th>
                                  <th className="border border-black p-1" colSpan={2}>Tipe temuan</th>
                                </tr>
                                <tr className="text-center bg-gray-100">
                                  <th className="border border-black p-1">Nama lokal</th>
                                  <th className="border border-black p-1">Nama ilmiah</th>
                                  <th className="border border-black p-1">Langsung</th>
                                  <th className="border border-black p-1">Tidak<br/>Langsung</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.temuanSatwaLiarTable.map((item, idx) => (
                                  <tr key={item.id} className="text-center">
                                    <td className="border border-black p-1">{idx + 1}</td>
                                    <td className="border border-black p-1 text-left">{item.namaLokal}</td>
                                    <td className="border border-black p-1 text-left italic">{item.namaIlmiah}</td>
                                    <td className="border border-black p-1">{item.tipeTemuan === 'Langsung' ? '√' : ''}</td>
                                    <td className="border border-black p-1">{item.tipeTemuan === 'Tidak Langsung' ? '√' : ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        
                        {renderContent(data.temuanSatwaLiarOutro)}
                        
                        {renderSectionWithAvoid("2. Status Konservasi Kawasan", data.statusKonservasiKawasan)}
                        {renderSectionWithAvoid("3. Temuan Ancaman", data.temuanAncaman)}
                      </div>
                    </div>
                  </div>
                </section>

                {/* BAB IV SIMPULAN DAN SARAN */}
                {(data.kesimpulan || data.saran) && (
                  <section className="space-y-4 pt-6 page-break-before">
                    <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider">BAB IV. SIMPULAN DAN SARAN</h2>
                    <div className="space-y-4 text-justify">
                      {renderSectionWithAvoid("A. Kesimpulan", data.kesimpulan)}
                      {renderSectionWithAvoid("B. Saran/Rekomendasi", data.saran)}
                    </div>
                  </section>
                )}

                {/* BAB V PENUTUP */}
                {data.penutup && (
                  <section className="space-y-4 pt-6 page-break-before">
                    <div className="break-inside-avoid">
                      <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider break-after-avoid">BAB V. PENUTUP</h2>
                      <div className="pl-4 text-[12pt] leading-normal space-y-1 mt-4">
                        {renderContent(data.penutup)?.[0]}
                      </div>
                    </div>
                    {(renderContent(data.penutup) || []).length > 1 && (
                      <div className="pl-4 text-[12pt] leading-normal space-y-1">
                        {renderContent(data.penutup)?.slice(1)}
                      </div>
                    )}
                  </section>
                )}

                {/* LAMPIRAN DOKUMENTASI FOTO */}
                {data.dokumentasiPreviews && data.dokumentasiPreviews.length > 0 && (
                  <section className="pt-8 space-y-4 page-break-before">
                    <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider underline">LAMPIRAN DOKUMENTASI FOTO</h2>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      {data.dokumentasiPreviews.map((url, idx) => (
                        <div key={idx} className="border p-2 rounded text-center space-y-2 bg-gray-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Dokumentasi ${idx + 1}`} className="w-full h-44 object-cover rounded" />
                          <p className="text-[9pt] font-semibold text-gray-700">Foto Dokumentasi #{idx + 1}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* TALLY SHEET RENDERER */}
      {tallySheetFile && (
        <div className="w-full bg-white relative page-break-before pt-8 px-[1.5cm]">
          <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider underline mb-4">LAMPIRAN</h2>
          <h2 className="text-[12pt] font-bold text-center uppercase tracking-wider mb-8">TALLY SHEET</h2>
          <img src="/new-header.png" alt="Kop Surat" className="w-full mb-6" />
          
          {tallySheetFile.type.startsWith('image/') ? (
            <img 
              src={URL.createObjectURL(tallySheetFile)} 
              alt="Tally Sheet" 
              className="w-full h-auto object-contain"
            />
          ) : tallySheetFile.type === 'application/pdf' ? (
            <iframe 
              src={URL.createObjectURL(tallySheetFile) + "#toolbar=0&navpanes=0&scrollbar=0"} 
              className="w-full h-[1100px] border-0"
              title="Tally Sheet PDF"
            />
          ) : (
            <div className="border border-red-300 bg-red-50 text-red-700 p-4 rounded text-center">
              File Tally Sheet tidak dapat ditampilkan secara otomatis (Harus berupa Gambar atau PDF).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
