"use client";

import { useRef } from "react";
import { Printer, X } from "lucide-react";
import QRCode from "react-qr-code";
import { formatDateIndonesian, formatNIP, daysBetween, numberToWords } from "@/lib/letter-utils";

interface PreviewProps {
  data: {
    id: string;
    nomor_surat?: string;
    dasar_hukum?: string;
    maksud_tujuan: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    tempat_tujuan: string;
    status: string;
    employees?: Array<{
      id: string;
      nama_lengkap: string;
      nip: string;
      pivot?: { peran?: string };
    }>;
    approver?: { name: string };
  };
  onClose: () => void;
}

export default function AssignmentLetterPreview({
  data,
  onClose,
}: PreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verifikasi/surat-tugas/${data.id}`
      : "";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center bg-zinc-900/90 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:block print:w-auto print:h-auto">
      <div className="sticky top-0 w-full z-10 flex items-center justify-between px-6 py-4 bg-zinc-900/95 border-b border-zinc-800 shadow-2xl print:hidden backdrop-blur-md">
        <div className="text-white font-medium flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
          <span className="text-sm text-zinc-400 uppercase tracking-widest font-bold">
            Mode Pratinjau Surat :
          </span>
          <span className="text-blue-400 font-mono text-sm">
            {data.nomor_surat || "DALAM PENGAJUAN (DRAFT)"}
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
          >
            <Printer className="w-4 h-4" />{" "}
            <span className="hidden md:inline">Cetak (A4)</span>
          </button>
          <button
            onClick={onClose}
            className="p-2.5 text-zinc-400 hover:text-white hover:bg-red-500 rounded-xl transition-all"
            title="Tutup Pratinjau"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="py-10 print:py-0 w-full flex justify-center">
        <div
          ref={printRef}
          className="w-[210mm] min-h-[297mm] bg-white p-[25mm] shadow-2xl shadow-black/50 print:shadow-none print:m-0 print:p-[15mm] text-black font-serif relative"
        >
          <div className="flex items-center justify-between border-b-4 border-double border-black pb-4 mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/kemenhut.png"
              alt="Kemenhut"
              className="w-[85px] object-contain"
            />
            <div className="text-center flex-1 px-4 tracking-tight">
              <h1 className="text-base font-bold uppercase tracking-wider">
                Kementerian Lingkungan Hidup dan Kehutanan
              </h1>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Direktorat Jenderal Konservasi Sumber Daya Alam dan Ekosistem
              </h2>
              <h3 className="text-lg font-black uppercase mt-1">
                Balai Konservasi Sumber Daya Alam
              </h3>
              <p className="text-[11px] mt-1.5 font-sans">
                Jalan Contoh Birokrasi No. 123, Pusat Pemerintahan. Telp: (0123)
                456789
              </p>
              <p className="text-[11px] font-sans">
                Website: www.bksda.go.id | Email: info@bksda.go.id
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo_bksda.png"
              alt="BKSDA"
              className="w-[85px] object-contain"
            />
          </div>
          <div className="border-b-2 border-black mb-8"></div>

          <div className="text-center mb-10">
            <h4 className="text-xl font-bold underline underline-offset-[6px] decoration-[1.5px] mb-2 tracking-widest">
              SURAT TUGAS
            </h4>
            <p className="text-[15px]">
              Nomor:{" "}
              {data.nomor_surat || "SK. ......................../BKSDA/2026"}
            </p>
          </div>

          <div className="space-y-6 text-[15px] leading-relaxed text-justify">
            <div className="flex items-start gap-4">
              <div className="w-30 font-bold tracking-widest">Dasar</div>
              <div className="w-4 font-bold">:</div>
              <div className="flex-1 whitespace-pre-wrap">
                {data.dasar_hukum ||
                  "Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya."}
              </div>
            </div>

            <div className="text-center font-bold tracking-[0.3em] mt-10 mb-6">
              M E M E R I N T A H K A N :
            </div>

            <div className="flex items-start gap-4">
              <div className="w-30 font-bold tracking-widest">Kepada</div>
              <div className="w-4 font-bold">:</div>
              <div className="flex-1">
                <table className="w-full text-[15px]">
                  <tbody>
                    {data.employees?.map((emp, index) => (
                      <tr key={emp.id}>
                        <td className="w-8 align-top py-1">{index + 1}.</td>
                        <td className="w-25 align-top py-1">
                          Nama
                          <br />
                          NIP
                          <br />
                          Peran
                        </td>
                        <td className="align-top font-bold uppercase py-1">
                          : {emp.nama_lengkap} <br />
                          <span className="font-normal normal-case">
                            : {formatNIP(emp.nip)}
                          </span>{" "}
                          <br />
                          <span className="font-normal normal-case">
                            : {emp.pivot?.peran || "Anggota Tim"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-4 mt-6">
              <div className="w-30 font-bold tracking-widest">Untuk</div>
              <div className="w-4 font-bold">:</div>
              <div className="flex-1 whitespace-pre-wrap">
                {data.maksud_tujuan}
              </div>
            </div>

            <div className="flex items-start gap-4 mt-2">
              <div className="w-30 font-bold tracking-widest">Waktu</div>
              <div className="w-4 font-bold">:</div>
              <div className="flex-1">
                {formatDateIndonesian(data.tanggal_mulai)} <span className="mx-2 font-bold">s/d</span>{" "}
                {formatDateIndonesian(data.tanggal_selesai)}
                {data.tanggal_mulai && data.tanggal_selesai && (
                  <span className="ml-2 italic text-zinc-600">
                    ({daysBetween(data.tanggal_mulai, data.tanggal_selesai)} / {numberToWords(daysBetween(data.tanggal_mulai, data.tanggal_selesai))} hari)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4 mt-2">
              <div className="w-30 font-bold tracking-widest">Tempat</div>
              <div className="w-4 font-bold">:</div>
              <div className="flex-1 font-bold">{data.tempat_tujuan}</div>
            </div>
          </div>

          <div className="mt-20 flex justify-between items-end">
            <div className="text-center">
              <div className="p-3 border-4 border-double border-zinc-300 inline-block bg-white relative">
                {data.status === "approved" || data.status === "completed" ? (
                  <QRCode value={verifyUrl} size={90} level="M" />
                ) : (
                  <div className="w-[90px] h-[90px] flex items-center justify-center bg-zinc-100 text-[10px] text-zinc-400 font-bold border border-dashed border-zinc-300 text-center leading-tight">
                    BELUM
                    <br />
                    DISETUJUI
                  </div>
                )}
              </div>
              <p className="text-[10px] mt-2 font-sans text-zinc-600 font-medium">
                Dokumen Terverifikasi Elektronik
              </p>
            </div>

            <div className="w-75 text-center text-[15px]">
              <p className="mb-0.5 text-left ml-6">
                Dikeluarkan di{" "}
                <span className="ml-2">: Ibu Kota Pemerintahan</span>
              </p>
              <p className="mb-14 text-left ml-6">
                Pada Tanggal{" "}
                <span className="ml-3">
                  :{" "}
                  {formatDateIndonesian(new Date().toISOString())}
                </span>
              </p>

              <p className="font-bold underline uppercase underline-offset-4">
                {data.approver?.name || "KEPALA BALAI BKSDA"}
              </p>
              <p className="mt-1">
                NIP. ........................................
              </p>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
            body * { visibility: hidden; }
            .print\\:block, .print\\:block * { visibility: visible; }
            .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
            @page { size: A4 portrait; margin: 5mm; }
        }
      `,
        }}
      />
    </div>
  );
}
