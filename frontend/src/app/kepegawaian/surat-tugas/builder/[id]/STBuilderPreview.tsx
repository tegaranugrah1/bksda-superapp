"use client";

import React from "react";
import Image from "next/image";
import {
  formatDateIndonesian,
  formatNIP,
  indexToLetter,
} from "@/lib/letter-utils";

interface Employee {
  id: string;
  nama_lengkap: string;
  nip: string;
  jabatan: string;
}

interface DasarItem {
  id: string;
  text: string;
}

interface PreviewProps {
  stNumber: string;
  stCode: string;
  currentMonth: string;
  currentYear: string;
  menimbangItems: DasarItem[];
  dasarItems: DasarItem[];
  selectedEmployees: Employee[];
  buildUntukText: () => string;
  buildBiayaText: () => string;
  kotaSurat: string;
  tanggalSurat: string;
  kepalaBalai: { name: string; nip: string };
}

export default function STBuilderPreview({
  stNumber,
  stCode,
  currentMonth,
  currentYear,
  menimbangItems,
  dasarItems,
  selectedEmployees,
  buildUntukText,
  buildBiayaText,
  kotaSurat,
  tanggalSurat,
  kepalaBalai,
}: PreviewProps) {
  return (
    <div
      id="surat-preview-doc"
      className="w-[210mm] min-h-[297mm] bg-white shadow-2xl p-[0.4cm_1cm_1cm_3cm] text-black font-serif text-[11pt] leading-tight selection:bg-blue-100"
      style={{ fontFamily: "'Bookman Old Style', 'Georgia', serif", textAlign: 'justify', textJustify: 'inter-word' }}
    >
      {/* Kop Surat - Perfectly aligned using offsets */}
      <div className="header-container" style={{ marginTop: '-15px', marginBottom: '12px', marginLeft: '-1.5cm', marginRight: '-1cm' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src="/header-new.png" 
          alt="Kop Surat" 
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* Judul & Nomor - Centered */}
      <div className="text-center mb-6" style={{ textAlign: 'center' }}>
        <h2 className="font-bold uppercase text-[12pt] mb-0 tracking-tight">
          SURAT TUGAS
        </h2>
        <p className="text-[11pt] m-0">
          Nomor : ST. &nbsp;&nbsp; {stNumber || "........"}/{stCode || "........"}/{currentMonth}/{currentYear}
        </p>
      </div>

      {/* Jabatan Pembuat */}
      <div className="text-center font-bold mb-4 uppercase" style={{ textAlign: 'center' }}>
        KEPALA BALAI,
      </div>

      <div className="space-y-4">
        {/* Row Builder for structured sections */}
        <SectionRow label="Menimbang">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {menimbangItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="w-[24px] align-top py-[1px]">{indexToLetter(idx)}</td>
                  <td className="align-top py-[1px]" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>{item.text || '...'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionRow>

        <SectionRow label="Dasar">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {dasarItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="w-[24px] align-top py-[1px]">{idx + 1}.</td>
                  <td className="align-top py-[1px]" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>{item.text || '...'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionRow>

        <div className="text-center font-bold my-4 uppercase tracking-wider" style={{ textAlign: 'center' }}>MEMBERI TUGAS,</div>

        <SectionRow label="Kepada">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              {selectedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-1 italic text-slate-400">( Belum ada pegawai dipilih )</td>
                </tr>
              ) : (
                selectedEmployees.map((emp, idx) => (
                  <React.Fragment key={emp.id}>
                    <tr>
                      <td className="w-[24px] align-top py-[1px] font-bold">{idx + 1}.</td>
                      <td className="py-[1px]">
                        <table className="w-full border-collapse table-fixed">
                          <tbody>
                            <tr>
                              <td className="w-[80px] sub-label-col py-px font-bold">Nama</td>
                              <td className="w-[12px] colon-col py-px">:</td>
                              <td className="font-bold py-px uppercase">{emp.nama_lengkap}</td>
                            </tr>
                            <tr>
                              <td className="sub-label-col py-px">NIP</td>
                              <td className="w-[12px] colon-col py-px">:</td>
                              <td className="py-px">{formatNIP(emp.nip)}</td>
                            </tr>
                            <tr>
                              <td className="sub-label-col py-px">Jabatan</td>
                              <td className="w-[12px] colon-col py-px">:</td>
                              <td className="py-px">{emp.jabatan}</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    {idx < selectedEmployees.length - 1 && <tr className="h-2"></tr>}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </SectionRow>

        <SectionRow label="Untuk">
          <table className="w-full border-collapse table-fixed">
            <tbody>
              <tr>
                <td className="w-[24px] align-top py-[1px]">1.</td>
                <td className="align-top py-[1px]" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>{buildUntukText()}</td>
              </tr>
              <tr>
                <td className="w-[24px] align-top py-[1px]">2.</td>
                <td className="align-top py-[1px]" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>{buildBiayaText()}</td>
              </tr>
              <tr>
                <td className="w-[24px] align-top py-[1px]">3.</td>
                <td className="align-top py-[1px]" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>
                  Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.
                </td>
              </tr>
            </tbody>
          </table>
        </SectionRow>

        {/* Penutup */}
        <p className="mt-8 mb-4" style={{ textAlign: 'justify', textJustify: 'inter-word' }}>Demikian untuk dilaksanakan dengan penuh tanggung jawab.</p>

        {/* Signatory Section */}
        <div className="flex mt-8" style={{ display: 'flex' }}>
          <div className="ml-auto w-[8cm] signatory-block text-left" style={{ marginLeft: 'auto' }}>
            <p className="m-0">{kotaSurat || '...'}, {tanggalSurat ? formatDateIndonesian(tanggalSurat) : '... ............. ....'}</p>
            <p className="m-0 mb-4">Kepala Balai,</p>
            
            <div className="h-20 flex items-center italic text-slate-300 text-xs" style={{ height: '80px', display: 'flex', alignItems: 'center' }}>
              ${"{ttd_pengirim}"}
            </div>

            <p className="m-0 font-bold uppercase underline underline-offset-4 decoration-1 font-bold">{kepalaBalai.name}</p>
            <p className="m-0">NIP. {formatNIP(kepalaBalai.nip)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for aligned rows
function SectionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse table-fixed">
      <tbody>
        <tr>
          <td className="w-[100px] label-col align-top py-[1px] font-normal">{label}</td>
          <td className="w-[12px] colon-col align-top py-[1px] text-center">:</td>
          <td className="align-top py-[1px]">{children}</td>
        </tr>
      </tbody>
    </table>
  );
}
