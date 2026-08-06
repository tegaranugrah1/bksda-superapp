"use client";

import React from "react";
import Image from "next/image";

export interface GeneralReportData {
  id?: string;
  judul_laporan: string;
  kota_laporan: string;
  tanggal_laporan: string;
  agenda_pelaksanaan: string;
  dasar_pelaksanaan: string[];
  maksud_tujuan: string;
  pelaksana: Array<{
    no: number;
    nama_lengkap: string;
    nip: string;
    jabatan: string;
  }>;
  waktu_tempat_pelaksanaan: string;
  hasil_pelaksanaan: string[];
  dokumentasi_foto: Array<{
    url: string;
    caption?: string;
  }>;
  st_ref?: {
    id?: string;
    nomor_surat?: string;
    tanggal_surat?: string;
  };
}

interface GeneralReportPrintProps {
  data: GeneralReportData;
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

function formatNameWithDegree(fullName: string): string {
  if (!fullName) return "-";
  const parts = fullName.split(",");
  if (parts.length > 1) {
    const name = parts[0].trim().toUpperCase();
    const degree = parts.slice(1).join(",").trim();
    return `${name}, ${degree}`;
  }
  return fullName.toUpperCase();
}

export function GeneralReportPrint({ data }: GeneralReportPrintProps) {
  const tanggalFormat = formatDateIndo(data.tanggal_laporan);

  return (
    <div className="print-report-wrapper bg-white text-black font-sans font-['Arial',sans-serif] text-[12pt] leading-relaxed max-w-[210mm] mx-auto p-0">
      {/* CSS Styles for Print Page Break & Isolation */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            background: white !important;
            color: black !important;
            font-family: Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-report-wrapper,
          .print-report-wrapper * {
            visibility: visible !important;
            font-family: Arial, sans-serif !important;
          }
          .print-report-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
          }
          .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          h3 {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ==================== PAGE 1: COVER PAGE (HALAMAN JUDUL) ==================== */}
      <div className="min-h-[267mm] h-[267mm] print:h-[267mm] flex flex-col justify-between items-center text-center p-6 pb-2 border-b print:border-none mb-8 print:mb-0 box-border">
        {/* TOP TITLE BLOCK */}
        <div className="w-full space-y-4 pt-6">
          <h1 className="text-[20pt] font-bold tracking-wider uppercase font-sans">
            LAPORAN
          </h1>
          <h2 className="text-[14pt] font-bold tracking-wide uppercase max-w-lg mx-auto leading-normal mt-4 font-sans">
            {data.judul_laporan || "PELAKSANAAN TUGAS DINAS"}
          </h2>
        </div>

        {/* BKSDA LOGO */}
        <div className="my-6 flex justify-center">
          <div className="relative w-32 h-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_bksda.png"
              alt="Logo BKSDA"
              className="w-full h-full object-contain mx-auto"
            />
          </div>
        </div>

        {/* DISUSUN OLEH (No Underline) */}
        <div className="w-full space-y-3 my-4">
          <p className="text-[12pt] font-semibold">Disusun Oleh :</p>
          <div className="space-y-1">
            {data.pelaksana && data.pelaksana.length > 0 ? (
              data.pelaksana.map((p, idx) => (
                <p key={idx} className="text-[12pt] font-bold tracking-wide">
                  {formatNameWithDegree(p.nama_lengkap)}
                </p>
              ))
            ) : (
              <p className="text-[12pt] font-bold tracking-wide">-</p>
            )}
          </div>
        </div>

        {/* FOOTER INSTANSI (Posisi Paling Bawah Halaman 1) */}
        <div className="w-full border-t border-black pt-3 mb-0 space-y-1">
          <p className="text-[14pt] font-bold tracking-wider uppercase">
            BALAI KONSERVASI SUMBER DAYA ALAM
          </p>
          <p className="text-[14pt] font-bold tracking-wider uppercase">
            KALIMANTAN TIMUR
          </p>
          <div className="w-full border-b border-black my-1.5"></div>
          <p className="text-[12pt] font-bold">
            {data.kota_laporan || "Samarinda"}, {tanggalFormat}
          </p>
        </div>
      </div>

      {/* ==================== PAGE 2: ISI LAPORAN ==================== */}
      <div className="page-break p-8 pt-4 space-y-6">
        {/* HEADER JUDUL ISI LAPORAN */}
        <div className="text-center space-y-1 mb-8 border-b-2 border-black pb-2">
          <h2 className="text-[14pt] font-bold uppercase tracking-wide max-w-xl mx-auto">
            {data.judul_laporan || "LAPORAN PELAKSANAAN TUGAS"}
          </h2>
          <p className="text-[14pt] font-bold uppercase">
            BALAI KSDA KALIMANTAN TIMUR
          </p>
        </div>

        {/* A. AGENDA PELAKSANAAN */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="font-bold text-[12pt] uppercase">A. Agenda Pelaksanaan</h3>
          <p className="text-[12pt] text-justify pl-4">
            {data.agenda_pelaksanaan || "-"}
          </p>
        </div>

        {/* B. DASAR PELAKSANAAN */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="font-bold text-[12pt] uppercase">B. Dasar Pelaksanaan</h3>
          <ol className="list-decimal list-outside text-[12pt] text-justify pl-9 space-y-1.5">
            {data.dasar_pelaksanaan && data.dasar_pelaksanaan.length > 0 ? (
              data.dasar_pelaksanaan.map((item, index) => (
                <li key={index} className="pl-1">
                  {item}
                </li>
              ))
            ) : (
              <li>Peraturan Menteri Kehutanan Nomor 4 Tahun 2025 tentang Organisasi dan Tata Kerja Unit Pelaksana Teknis Direktorat Jenderal Konservasi Sumber Daya Alam Kalimantan Timur.</li>
            )}
          </ol>
        </div>

        {/* C. MAKSUD DAN TUJUAN */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="font-bold text-[12pt] uppercase">C. Maksud dan Tujuan</h3>
          <p className="text-[12pt] text-justify pl-4">
            {data.maksud_tujuan || "-"}
          </p>
        </div>

        {/* D. PELAKSANA */}
        <div className="space-y-2 break-inside-avoid">
          <h3 className="font-bold text-[12pt] uppercase">D. Pelaksana</h3>
          <p className="text-[12pt] pl-4 mb-2">
            Kegiatan pelaksanaan tugas ini dilaksanakan oleh :
          </p>
          <div className="pl-4 pr-2">
            <table className="w-full border-collapse border border-black text-[12pt] text-center">
              <thead>
                <tr className="bg-gray-100 font-bold">
                  <th className="border border-black px-2 py-1.5 w-10">No.</th>
                  <th className="border border-black px-3 py-1.5">Nama / NIP</th>
                  <th className="border border-black px-3 py-1.5">Jabatan</th>
                </tr>
              </thead>
              <tbody>
                {data.pelaksana && data.pelaksana.length > 0 ? (
                  data.pelaksana.map((p, i) => (
                    <tr key={i}>
                      <td className="border border-black px-2 py-2">{i + 1}.</td>
                      <td className="border border-black px-3 py-2 text-left">
                        <span className="font-bold">{formatNameWithDegree(p.nama_lengkap)}</span>
                        <br />
                        <span className="text-[12pt] text-black font-normal">NIP. {p.nip || "-"}</span>
                      </td>
                      <td className="border border-black px-3 py-2 text-left font-medium">
                        {p.jabatan || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="border border-black p-2 text-center text-gray-500">
                      Tidak ada data pelaksana
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* E. WAKTU DAN TEMPAT PELAKSANAAN */}
        <div className="space-y-2 pt-2 break-inside-avoid">
          <h3 className="font-bold text-[12pt] uppercase">E. Waktu dan Tempat Pelaksanaan</h3>
          <p className="text-[12pt] text-justify pl-4">
            {data.waktu_tempat_pelaksanaan || "-"}
          </p>
        </div>

        {/* F. HASIL PELAKSANAAN */}
        <div className="space-y-2 pt-2 break-inside-avoid">
          <h3 className="font-bold text-[12pt] uppercase">F. Hasil Pelaksanaan</h3>
          <ol className="list-decimal list-outside text-[12pt] text-justify pl-9 space-y-2">
            {data.hasil_pelaksanaan && data.hasil_pelaksanaan.length > 0 ? (
              data.hasil_pelaksanaan.map((h, idx) => (
                <li key={idx} className="pl-1">
                  {h}
                </li>
              ))
            ) : (
              <li>Melaksanakan kegiatan sesuai penugasan resmi balai.</li>
            )}
          </ol>
        </div>

        {/* KALIMAT PENUTUP & TANDA TANGAN (TERIKAT BERSAMA SAMA) */}
        <div className="break-inside-avoid pt-4 space-y-6">
          <p className="text-[12pt] text-justify">
            Demikian laporan ini dibuat untuk diketahui dan dipergunakan sebagaimana mestinya.
          </p>

          <div className="flex justify-end">
            <div className="text-left w-80 space-y-2">
              <div>
                <p className="text-[12pt]">{data.kota_laporan || "Samarinda"}, {tanggalFormat}</p>
                <p className="text-[12pt] font-normal mt-0.5">Pelaksana Kegiatan,</p>
              </div>
              <div className="space-y-8 pt-12">
                {data.pelaksana && data.pelaksana.length > 0 ? (
                  data.pelaksana.map((p, idx) => (
                    <div key={idx} className="space-y-0.5 pt-10 first:pt-0">
                      <p className="text-[12pt] font-normal">{formatNameWithDegree(p.nama_lengkap)}</p>
                      <p className="text-[12pt] text-black font-normal">NIP. {p.nip || "-"}</p>
                    </div>
                  ))
                ) : (
                  <div className="space-y-0.5 pt-12">
                    <p className="text-[12pt] font-normal">-[ NAMA PELAKSANA ]-</p>
                    <p className="text-[12pt] text-black font-normal">NIP. -</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* G. DOKUMENTASI (GRID 2-KOLOM PADA HALAMAN KETIGA/SELANJUTNYA) */}
        {data.dokumentasi_foto && data.dokumentasi_foto.length > 0 && (
          <div className="page-break pt-4 space-y-4">
            <h3 className="font-bold text-[12pt] uppercase mb-4">G. Dokumentasi</h3>
            <div className="grid grid-cols-2 gap-4">
              {data.dokumentasi_foto.map((foto, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="relative w-full h-64 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
                      alt={`Dokumentasi ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
