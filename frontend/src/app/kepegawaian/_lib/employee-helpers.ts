/**
 * Helper utilitas untuk perhitungan dan normalisasi data Pegawai & Cuti.
 */

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
