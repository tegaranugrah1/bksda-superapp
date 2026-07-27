"use client";

import React from "react";

export interface LeaveRequestPrintData {
  id?: number;
  nomor_pengajuan?: string;
  tanggal_pengajuan: string;
  jenis_cuti: string;
  alasan_cuti: string;
  jumlah_hari: number;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alamat_menjalankan_cuti: string;
  telepon?: string;
  masa_kerja?: string;
  status?: string;
  sisa_n2: number;
  sisa_n1: number;
  sisa_n0: number;
  status_pertimbangan_atasan?: string;
  status_pertimbangan_pejabat?: string;
  kasubbag_nama?: string;
  kasubbag_nip?: string;
  kepala_balai_nama?: string;
  kepala_balai_nip?: string;
  employee?: {
    nama_lengkap: string;
    nip: string;
    jabatan?: string;
    satuan_kerja?: string;
    pangkat_golongan?: string;
  };
}

interface FormulirCutiPrintProps {
  data: LeaveRequestPrintData;
}

function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch (e) {
    return dateStr;
  }
}

export function calculateMasaKerja(nip?: string | null, namaLengkap?: string | null): string {
  if (!nip) return "0 Tahun 0 Bulan";
  
  const cleanNip = nip.replace(/\D/g, "");
  if (cleanNip.length < 12) return "0 Tahun 0 Bulan";

  const yearAdmitted = parseInt(cleanNip.substring(8, 12), 10);
  if (isNaN(yearAdmitted) || yearAdmitted < 1950 || yearAdmitted > 2099) {
    return "0 Tahun 0 Bulan";
  }

  const code13_14 = cleanNip.length >= 14 ? parseInt(cleanNip.substring(12, 14), 10) : 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let totalMonths = 0;

  if (code13_14 >= 21) {
    const years = Math.max(0, currentYear - yearAdmitted);
    totalMonths = years * 12;
  } else if (code13_14 >= 1 && code13_14 <= 12) {
    const monthAdmitted = code13_14;
    totalMonths = (currentYear - yearAdmitted) * 12 + (currentMonth - monthAdmitted);
    if (totalMonths < 0) totalMonths = 0;
  } else {
    const years = Math.max(0, currentYear - yearAdmitted);
    totalMonths = years * 12;
  }

  const nama = (namaLengkap || "").toLowerCase();
  if (nama.includes("a.md") || nama.includes("amd")) {
    totalMonths += 36;
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return `${years} Tahun ${months} Bulan`;
}

function getKotaAtasanFromSatuanKerja(satuanKerja?: string) {
  const sk = (satuanKerja || "").toLowerCase();

  let kota = "Samarinda";
  let atasanTitle = "Kasubbag Tata Usaha";
  let atasanNama = "DHENY MARDIONO, S.Hut., M.Sc.";
  let atasanNip = "19750314 199903 1 004";

  if (sk.includes("wilayah iii") || sk.includes("balikpapan")) {
    kota = "Balikpapan";
    atasanTitle = "Kepala Seksi KSDA Wilayah III Balikpapan";
    atasanNama = "BAMBANG HARI TRIMARSITO, S.Si., M.P.";
    atasanNip = "19740626 200112 1 004";
  } else if (sk.includes("wilayah ii") || sk.includes("tenggarong")) {
    kota = "Tenggarong";
    atasanTitle = "Kepala Seksi KSDA Wilayah II Tenggarong";
    atasanNama = "SURIAWATI HALIM, S.Hut., M.P.";
    atasanNip = "19751127 200003 2 001";
  } else if (sk.includes("wilayah i") || sk.includes("berau")) {
    kota = "Tanjung Redeb";
    atasanTitle = "Kepala Seksi KSDA Wilayah I Berau";
    atasanNama = "YULIAN SADONO, S.Hut., M.T.";
    atasanNip = "19800707 200604 1 003";
  }

  return { kota, atasanTitle, atasanNama, atasanNip };
}

export function FormulirCutiPrint({ data }: FormulirCutiPrintProps) {
  const emp = data.employee || {
    nama_lengkap: "TEGAR ANUGRAH, A.Md.Kom.",
    nip: "19990707 202506 1 006",
    jabatan: "PRANATA KOMPUTER TERAMPIL",
    satuan_kerja: "Balai KSDA Kalimantan Timur",
  };

  const currentYear = new Date().getFullYear();
  const { kota: kotaTujuan, atasanTitle, atasanNama, atasanNip } = getKotaAtasanFromSatuanKerja(emp.satuan_kerja);

  const isDefaultDheny = !data.kasubbag_nama || data.kasubbag_nama.includes("DHENY");
  const finalAtasanNama = (isDefaultDheny && atasanNama !== "DHENY MARDIONO, S.Hut., M.Sc.") ? atasanNama : (data.kasubbag_nama || atasanNama);
  const finalAtasanNip = (isDefaultDheny && atasanNip !== "19750314 199903 1 004") ? atasanNip : (data.kasubbag_nip || atasanNip);

  const isTahunan = strMatch(data.jenis_cuti, "tahunan");
  const isBesar = strMatch(data.jenis_cuti, "besar");
  const isSakit = strMatch(data.jenis_cuti, "sakit");
  const isMelahirkan = strMatch(data.jenis_cuti, "melahirkan");
  const isPenting = strMatch(data.jenis_cuti, "penting");
  const isLuarTanggungan = strMatch(data.jenis_cuti, "luar");

  return (
    <div
      id="printable-formulir-cuti"
      className="bg-white text-black p-3 font-sans max-w-[210mm] mx-auto text-[9.5px] leading-snug print:p-0 print:m-0"
    >
      {/* Header Surat Top Left */}
      <div className="flex justify-between items-start mb-3">
        <div className="text-left leading-tight text-[9.5px]">
          <p>{kotaTujuan}, {formatDateIndo(data.tanggal_pengajuan)}</p>
          <p>Kepada</p>
          <p className="font-bold">Kepala Balai KSDA Kaltim</p>
          <p>di -</p>
          <p className="pl-4">Samarinda</p>
        </div>
        <div />
      </div>

      {/* Judul Formulir */}
      <div className="text-center mb-3">
        <h1 className="font-bold text-[11px] uppercase underline tracking-wide">
          FORMULIR PERMINTAAN DAN PEMBERIAN CUTI
        </h1>
      </div>

      {/* Structured HTML Tables with border-collapse for ZERO overlapping borders */}

      {/* I. DATA PEGAWAI */}
      <table className="w-full border-collapse border border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={4} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              I. DATA PEGAWAI
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black">
            <td className="w-24 px-2.5 py-0.5 font-semibold border-r border-black">Nama</td>
            <td className="w-[42%] px-2.5 py-0.5 uppercase border-r border-black">{emp.nama_lengkap}</td>
            <td className="w-20 px-2.5 py-0.5 font-semibold border-r border-black">NIP</td>
            <td className="px-2.5 py-0.5">{emp.nip}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="px-2.5 py-0.5 font-semibold border-r border-black">Jabatan</td>
            <td className="px-2.5 py-0.5 uppercase border-r border-black">{emp.jabatan || "-"}</td>
            <td className="px-2.5 py-0.5 font-semibold border-r border-black">Masa Kerja</td>
            <td className="px-2.5 py-0.5">{data.masa_kerja || calculateMasaKerja(emp.nip, emp.nama_lengkap)}</td>
          </tr>
          <tr>
            <td className="px-2.5 py-0.5 font-semibold border-r border-black">Unit Kerja</td>
            <td colSpan={3} className="px-2.5 py-0.5 uppercase">{emp.satuan_kerja || "Balai KSDA Kalimantan Timur"}</td>
          </tr>
        </tbody>
      </table>

      {/* II. JENIS CUTI YANG DIAMBIL */}
      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={4} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              II. JENIS CUTI YANG DIAMBIL**
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black">
            <td className="px-2.5 py-0.5 w-[40%]">1. Cuti Tahunan</td>
            <td className="w-11 border-l border-r border-black text-center font-bold text-xs h-5.5">{isTahunan ? "✓" : ""}</td>
            <td className="px-2.5 py-0.5 w-[40%] border-l border-black">2. Cuti Besar</td>
            <td className="w-11 border-l border-black text-center font-bold text-xs h-5.5">{isBesar ? "✓" : ""}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="px-2.5 py-0.5">3. Cuti Sakit</td>
            <td className="w-11 border-l border-r border-black text-center font-bold text-xs h-5.5">{isSakit ? "✓" : ""}</td>
            <td className="px-2.5 py-0.5 border-l border-black">4. Cuti Melahirkan</td>
            <td className="w-11 border-l border-black text-center font-bold text-xs h-5.5">{isMelahirkan ? "✓" : ""}</td>
          </tr>
          <tr>
            <td className="px-2.5 py-0.5">5. Cuti Karena Alasan Penting</td>
            <td className="w-11 border-l border-r border-black text-center font-bold text-xs h-5.5">{isPenting ? "✓" : ""}</td>
            <td className="px-2.5 py-0.5 border-l border-black">6. Cuti di Luar Tanggungan Negara</td>
            <td className="w-11 border-l border-black text-center font-bold text-xs h-5.5">{isLuarTanggungan ? "✓" : ""}</td>
          </tr>
        </tbody>
      </table>

      {/* III. ALASAN CUTI */}
      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              III. ALASAN CUTI
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 min-h-9.5 leading-tight">
              {data.alasan_cuti || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* IV. LAMANYA CUTI */}
      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={6} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              IV. LAMANYA CUTI
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td className="py-1 px-2 font-semibold w-20 border-r border-black">SELAMA</td>
            <td className="py-1 px-2 font-bold w-20 border-r border-black">{data.jumlah_hari} HARI</td>
            <td className="py-1 px-2 font-semibold w-28 border-r border-black">MULAI TANGGAL</td>
            <td className="py-1 px-2 font-bold border-r border-black">{formatDateIndo(data.tanggal_mulai)}</td>
            <td className="py-1 px-2 font-semibold w-12 border-r border-black">S.D</td>
            <td className="py-1 px-2 font-bold">{formatDateIndo(data.tanggal_selesai)}</td>
          </tr>
        </tbody>
      </table>

      {/* V. CATATAN CUTI */}
      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={4} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              V. CATATAN CUTI ***
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {/* Left half: Cuti Tahunan / Penting */}
            <td colSpan={2} className="w-1/2 align-top border-r border-black p-0">
              <div className="px-2.5 py-0.5 font-semibold border-b border-black">1. Cuti Karena Alasan Penting / Tahunan</div>
              <table className="w-full text-center border-collapse text-[9px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-black font-semibold">
                    <td className="py-0.5 w-16 border-r border-black">TAHUN</td>
                    <td className="py-0.5 w-16 border-r border-black">SISA</td>
                    <td className="py-0.5 text-left pl-2">KETERANGAN</td>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-black">
                    <td className="py-0.5 border-r border-black">N - 2</td>
                    <td className="py-0.5 font-bold border-r border-black">{data.sisa_n2 || "-"}</td>
                    <td className="py-0.5 text-left pl-2">Tahun {currentYear - 2}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-0.5 border-r border-black">N - 1</td>
                    <td className="py-0.5 font-bold border-r border-black">{data.sisa_n1 || "-"}</td>
                    <td className="py-0.5 text-left pl-2">Tahun {currentYear - 1}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="py-0.5 border-r border-black">N</td>
                    <td className="py-0.5 font-bold text-[9.5px] border-r border-black">{data.sisa_n0}</td>
                    <td className="py-0.5 text-left pl-2">Tahun {currentYear}</td>
                  </tr>
                </tbody>
              </table>
            </td>

            <td colSpan={2} className="w-[48%] align-top p-0">
              <table className="w-full border-collapse text-[9px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="px-2.5 py-0.5">2. Cuti Besar</td>
                    <td className="w-11 border-l border-black h-4.5" />
                  </tr>
                  <tr className="border-b border-black">
                    <td className="px-2.5 py-0.5">3. Cuti Sakit</td>
                    <td className="w-11 border-l border-black h-4.5" />
                  </tr>
                  <tr className="border-b border-black">
                    <td className="px-2.5 py-0.5">4. Cuti Melahirkan</td>
                    <td className="w-11 border-l border-black h-4.5" />
                  </tr>
                  <tr className="border-b border-black">
                    <td className="px-2.5 py-0.5">5. Cuti Tahunan</td>
                    <td className="w-11 border-l border-black h-4.5" />
                  </tr>
                  <tr className="border-b border-black">
                    <td className="px-2.5 py-0.5">6. Cuti di Luar Tanggungan Negara</td>
                    <td className="w-11 border-l border-black h-4.5" />
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={2} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              VI. ALAMAT SELAMA MENJALANKAN CUTI
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="align-top border-r border-black p-0">
              <div className="p-2 min-h-10 leading-tight">
                {data.alamat_menjalankan_cuti || "-"}
              </div>
              <div className="p-1 border-t border-black">
                <span className="font-semibold">TELPON: </span>
                <span>{data.telepon || "-"}</span>
              </div>
            </td>
            <td className="w-70 p-2 text-center align-bottom h-20">
              <div className="flex flex-col justify-between h-full">
                <p className="text-[9px]">Hormat Saya,</p>
                <div className="h-6" />
                <div>
                  <p className="font-bold uppercase text-[9.5px]">{emp.nama_lengkap}</p>
                  <p className="text-[9px]">NIP. {emp.nip}</p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={4} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              VII. PERTIMBANGAN ATASAN LANGSUNG**
            </th>
          </tr>
          <tr className="border-b border-black text-center font-semibold text-[9px]">
            <th className="py-0.5 w-1/4 border-r border-black">DISETUJUI</th>
            <th className="py-0.5 w-1/4 border-r border-black">PERUBAHAN****</th>
            <th className="py-0.5 w-1/4 border-r border-black">DITANGGUHKAN****</th>
            <th className="py-0.5 w-1/4">TIDAK DISETUJUI****</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black text-center font-bold text-xs h-7">
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td />
          </tr>
          <tr>
            <td colSpan={4} className="p-2">
              <div className="flex justify-end">
                <div className="text-center w-70 h-20 flex flex-col justify-between">
                  <p className="text-[9px] font-semibold">{atasanTitle},</p>
                  <div className="h-6" />
                  <div>
                    <p className="font-bold uppercase text-[9.5px]">{finalAtasanNama}</p>
                    <p className="text-[9px]">NIP. {finalAtasanNip}</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-x border-b border-black text-[9.5px]">
        <thead>
          <tr>
            <th colSpan={4} className="bg-gray-100 text-left px-2.5 py-0.5 font-bold uppercase border-b border-black">
              VIII. PERTIMBANGAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI**
            </th>
          </tr>
          <tr className="border-b border-black text-center font-semibold text-[9px]">
            <th className="py-0.5 w-1/4 border-r border-black">DISETUJUI</th>
            <th className="py-0.5 w-1/4 border-r border-black">PERUBAHAN****</th>
            <th className="py-0.5 w-1/4 border-r border-black">DITANGGUHKAN****</th>
            <th className="py-0.5 w-1/4">TIDAK DISETUJUI****</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black text-center font-bold text-xs h-7">
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td className="border-r border-black" />
            <td />
          </tr>
          <tr>
            <td colSpan={4} className="p-2">
              <div className="flex justify-end">
                <div className="text-center w-70 h-20 flex flex-col justify-between">
                  <p className="text-[9px] font-semibold">Kepala Balai,</p>
                  <div className="h-6" />
                  <div>
                    <p className="font-bold uppercase text-[9.5px]">{data.kepala_balai_nama || "M. ARI WIBOWANTO, S.Hut.,M.Sc."}</p>
                    <p className="text-[9px]">NIP. {data.kepala_balai_nip || "19740514 199903 1 001"}</p>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Catatan Kaki */}
      <table className="w-full border-collapse border-x border-b border-black text-[8.5px]">
        <tbody>
          <tr>
            <td className="p-2 text-gray-800 leading-snug space-y-0.5">
              <p className="font-bold">Catatan :</p>
              <p>* Coret yang tidak perlu</p>
              <p>** Pilih salah satu dengan memberi tanda centang ( ✓ )</p>
              <p>*** Diisi oleh pejabat yang menangani bidang kepegawaian sebelum PNS mengajukan cuti</p>
              <p>**** Diberi tanda centang dan alasannya</p>
              <p>N = Cuti tahun berjalan</p>
              <p>N-1 = Sisa Cuti 1 Tahun Sebelumnya</p>
              <p>N-2 = Sisa Cuti Tahunan Sebelumnya</p>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Printable CSS strict 1-page A4 guaranteed fit */}
      <style jsx global>{`
        @media print {
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-formulir-cuti,
          #printable-formulir-cuti * {
            visibility: visible;
          }
          #printable-formulir-cuti {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 7mm 12mm 7mm 12mm;
          }
        }
      `}</style>
    </div>
  );
}

function strMatch(source?: string, term?: string): boolean {
  if (!source || !term) return false;
  return source.toLowerCase().includes(term.toLowerCase());
}
