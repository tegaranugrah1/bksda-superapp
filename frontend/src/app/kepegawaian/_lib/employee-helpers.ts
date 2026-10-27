/**
 * Helper utilitas untuk perhitungan dan normalisasi data Pegawai & Cuti.
 */
import { isPppk } from "@/lib/letter-utils";
import type { JenisPegawai } from "./employee-constants";

export function isMmpEmployee(emp?: { nip?: string | null; is_mmp?: boolean | null; jenis_pegawai?: string | null; jabatan?: string | null } | null): boolean {
  if (!emp) return false;
  if (emp.is_mmp || emp.jenis_pegawai === "MMP") return true;
  const nip = (emp.nip || "").trim().toUpperCase();
  return nip.startsWith("MMP-");
}

export function detectEmployeeType(emp?: {
  nip?: string | null;
  pangkat_golongan?: string | null;
  jabatan?: string | null;
  is_pppk?: boolean | null;
  is_mmp?: boolean | null;
  jenis_pegawai?: string | null;
} | null): JenisPegawai {
  if (isMmpEmployee(emp)) return "MMP";
  if (isPppk(emp)) return "PPPK";
  return "PNS";
}

/**
 * Deteksi otomatis jenis pegawai saat user mengetik NIP / NIPPPK (18 digit BKN).
 * Digit ke-13 & 14: '21' = PPPK, '01'-'12' = PNS.
 */
export function detectJenisFromNipInput(rawNip: string): JenisPegawai | null {
  const trimmed = rawNip.trim().toUpperCase();
  if (trimmed.startsWith("MMP-")) return "MMP";

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 14) {
    const code13_14 = digits.substring(12, 14);
    if (code13_14 === "21") return "PPPK";
    const num = parseInt(code13_14, 10);
    if (num >= 1 && num <= 12) return "PNS";
  }
  return null;
}

/**
 * Bangun teks Jabatan default untuk MMP berdasarkan pilihan Satuan Kerja / Resor.
 */
export function buildMmpDefaultJabatan(satuanKerja?: string | null): string {
  const sk = (satuanKerja || "").trim();
  const resorMatch = sk.match(/Resor\s+(\d+)\.\s*(.+)$/i);
  if (resorMatch) {
    return `MMP Resor KSDA Wilayah ${resorMatch[1]} ${resorMatch[2].trim()}`;
  }
  return "Masyarakat Mitra Polhut (MMP)";
}

export function isAutoMmpJabatan(jabatan?: string | null): boolean {
  const j = (jabatan || "").trim();
  if (!j) return true;
  if (j === "Masyarakat Mitra Polhut (MMP)" || j === "MMP") return true;
  return /^MMP Resor KSDA Wilayah\b/i.test(j);
}

/**
 * Hitung masa kerja pegawai berdasarkan NIP 18-digit (Format BKN).
 * Digit 8-12: Tahun pengangkatan CPNS
 * Digit 12-14: Bulan pengangkatan CPNS (atau kode PPPK)
 */
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
