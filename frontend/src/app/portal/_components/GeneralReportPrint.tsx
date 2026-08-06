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

export function GeneralReportPrint({ data }: GeneralReportPrintProps) {
  const tanggalFormat = formatDateIndo(data.tanggal_laporan);

  return (
    <div className="print-report-wrapper bg-white text-black font-serif text-[11pt] leading-relaxed max-w-[210mm] mx-auto p-0">
      {/* CSS Styles for Print Page Break */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 20mm 15mm 20mm 20mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ==================== PAGE 1: COVER PAGE (HALAMAN JUDUL) ==================== */}
      <div className="min-h-[270mm] flex flex-col justify-between items-center text-center p-8 border-b print:border-none print:min-h-[250mm] mb-8 print:mb-0">
        <div className="w-full space-y-4 pt-12">
          <h1 className="text-xl font-bold tracking-wider uppercase font-serif">
            LAPORAN
          </h1>
          <h2 className="text-base font-bold tracking-wide uppercase max-w-lg mx-auto leading-normal mt-6 font-serif">
            {data.judul_laporan || "PELAKSANAAN TUGAS DINAS"}
          </h2>
        </div>

        {/* BKSDA LOGO */}
        <div className="my-12 flex justify-center">
          <div className="relative w-36 h-36">
            <Image
              src="/logo_bksda.png"
              alt="Logo BKSDA"
              width={144}
              height={144}
              className="object-contain mx-auto"
              priority
            />
          </div>
        </div>

        {/* DISUSUN OLEH */}
        <div className="w-full space-y-4 my-8">
          <p className="text-sm underline font-semibold">Disusun Oleh :</p>
          <div className="space-y-1">
            {data.pelaksana && data.pelaksana.length > 0 ? (
              data.pelaksana.map((p, idx) => (
                <p key={idx} className="text-sm font-bold tracking-wide uppercase">
                  {p.nama_lengkap}
                </p>
              ))
            ) : (
              <p className="text-sm font-bold tracking-wide uppercase">-</p>
            )}
          </div>
        </div>

        {/* FOOTER INSTANSI */}
        <div className="w-full border-t border-black pt-4 mt-12 mb-6">
          <p className="text-sm font-bold tracking-wider uppercase">
            BALAI KONSERVASI SUMBER DAYA ALAM
          </p>
          <p className="text-sm font-bold tracking-wider uppercase">
            KALIMANTAN TIMUR
          </p>
          <div className="w-full border-b border-black mt-4 mb-2"></div>
          <p className="text-sm font-bold">
            {data.kota_laporan || "Samarinda"}, {tanggalFormat}
          </p>
        </div>
      </div>

      {/* ==================== PAGE 2: ISI LAPORAN ==================== */}
      <div className="page-break p-8 pt-4 space-y-6">
        {/* HEADER JUDUL ISI LAPORAN */}
        <div className="text-center space-y-1 mb-8 border-b-2 border-black pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wide max-w-xl mx-auto">
            {data.judul_laporan || "LAPORAN PELAKSANAAN TUGAS"}
          </h2>
          <p className="text-sm font-bold uppercase">
            BALAI KSDA KALIMANTAN TIMUR
          </p>
        </div>

        {/* A. AGENDA PELAKSANAAN */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm uppercase">A. Agenda Pelaksanaan</h3>
          <p className="text-sm text-justify pl-4">
            {data.agenda_pelaksanaan || "-"}
          </p>
        </div>

        {/* B. DASAR PELAKSANAAN */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm uppercase">B. Dasar Pelaksanaan</h3>
          <ol className="list-decimal list-outside text-sm text-justify pl-9 space-y-1.5">
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
        <div className="space-y-2">
          <h3 className="font-bold text-sm uppercase">C. Maksud dan Tujuan</h3>
          <p className="text-sm text-justify pl-4">
            {data.maksud_tujuan || "-"}
          </p>
        </div>

        {/* D. PELAKSANA */}
        <div className="space-y-2">
          <h3 className="font-bold text-sm uppercase">D. Pelaksana</h3>
          <p className="text-sm pl-4 mb-2">
            Kegiatan pelaksanaan tugas ini dilaksanakan oleh :
          </p>
          <div className="pl-4 pr-2">
            <table className="w-full border-collapse border border-black text-xs text-center">
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
                        <span className="font-bold">{p.nama_lengkap}</span>
                        <br />
                        <span className="text-[10px] text-gray-700">NIP. {p.nip || "-"}</span>
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
        <div className="space-y-2 pt-2">
          <h3 className="font-bold text-sm uppercase">E. Waktu dan Tempat Pelaksanaan</h3>
          <p className="text-sm text-justify pl-4">
            {data.waktu_tempat_pelaksanaan || "-"}
          </p>
        </div>

        {/* F. HASIL PELAKSANAAN */}
        <div className="space-y-2 pt-2">
          <h3 className="font-bold text-sm uppercase">F. Hasil Pelaksanaan</h3>
          <ol className="list-decimal list-outside text-sm text-justify pl-9 space-y-2">
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

        {/* G. DOKUMENTASI (GRID 2-KOLOM PADA PAGE KETIGA) */}
        {data.dokumentasi_foto && data.dokumentasi_foto.length > 0 && (
          <div className="page-break pt-4 space-y-4">
            <h3 className="font-bold text-sm uppercase mb-4">G. Dokumentasi</h3>
            <div className="grid grid-cols-2 gap-4">
              {data.dokumentasi_foto.map((foto, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-2 flex flex-col items-center">
                  <div className="relative w-full h-64 bg-gray-100 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foto.url}
                      alt={`Dokumentasi ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {foto.caption && (
                    <p className="text-[10px] text-gray-600 mt-1.5 text-center font-sans font-medium">
                      {foto.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TANDA TANGAN PELAKSANA */}
        <div className="pt-8 flex justify-end">
          <div className="text-center w-64 space-y-16">
            <div>
              <p className="text-xs">{data.kota_laporan || "Samarinda"}, {tanggalFormat}</p>
              <p className="text-xs font-bold mt-1">Pelaksana Kegiatan,</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold underline">
                {data.pelaksana?.[0]?.nama_lengkap || "Pelaksana"}
              </p>
              <p className="text-[10px] text-gray-700">
                NIP. {data.pelaksana?.[0]?.nip || "-"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
