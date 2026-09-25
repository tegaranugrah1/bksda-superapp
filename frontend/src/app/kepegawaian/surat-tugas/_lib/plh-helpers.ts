/**
 * Helper functions untuk template PLH (Pelaksana Harian).
 */
import type { Employee } from "./types";
import {
  PLH_WILAYAH_PLACEHOLDER,
  PLH_KEGIATAN_KASI_PLACEHOLDER,
  PLH_NOMOR_INDUK_PLACEHOLDERS,
  PLH_TANGGAL_INDUK_PLACEHOLDERS,
} from "./constants";

/**
 * Extract nama wilayah dari field `position` pegawai.
 * Contoh: "Kepala Seksi KSDA Wilayah III Balikpapan" → "III Balikpapan".
 */
export function extractPlhWilayahFromPosition(position?: string | null) {
  const text = (position || "").trim();
  const match = text.match(/Seksi\s+(?:Konservasi\s+Sumber\s+Daya\s+Alam|KSDA)?\s*Wilayah\s+([^()]+)/i);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }
  const fallbackMatch = text.match(/Seksi\s+KSDA\s+Wilayah\s+(.+)$/i);
  return fallbackMatch?.[1]?.trim() || text;
}

/**
 * Bersihkan teks kegiatan Kepala Seksi dari suffix "selama X (kata) hari terhitung..."
 * yang biasanya di-append oleh `buildUntukText`.
 */
export function cleanPlhKegiatanKasi(text?: string | null) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/,?\s*selama\s+\d+\s*\([^)]+\)\s*(?:hari(?:\s+kerja)?\s+)?terhitung.*?(?:;|\.)?$/i, "")
    .replace(/[;.\s]+$/, "")
    .trim();
}

/**
 * Format dan sanitasi teks kegiatan Kepala Seksi untuk dimasukkan ke dalam kalimat template Menimbang.
 *
 * Logika:
 * 1. Jika kalimat template sebelum placeholder sudah memiliki kata "melaksanakan" (misal: "akan melaksanakan {kegiatan...}"):
 *    - Hapus kata 'Melaksanakan' / 'melaksanakan' di awal teks kegiatan agar tidak dobel.
 *    - Contoh: "Melaksanakan Perjalanan Dinas..." -> "Perjalanan Dinas..."
 *      Hasil kalimat: "... akan melaksanakan Perjalanan Dinas..."
 * 2. Jika kalimat template TIDAK memiliki kata "melaksanakan" sebelum placeholder (misal: "akan {kegiatan...}"):
 *    - Jika teks kegiatan diawali kata 'Melaksanakan', ubah huruf kapital 'M' menjadi huruf kecil 'm'.
 *    - Contoh: "Melaksanakan Perjalanan Dinas..." -> "melaksanakan Perjalanan Dinas..."
 *      Hasil kalimat: "... akan melaksanakan Perjalanan Dinas..."
 * 3. Jika teks kegiatan TIDAK diawali kata 'melaksanakan' sama sekali:
 *    - Jika diawali huruf kapital dan kata sebelumnya kata sambung seperti 'akan', jadikan huruf pertama lowercase.
 */
export function formatPlhKegiatanForTemplate(templateSentence: string, kegiatan: string): string {
  const cleanKegiatan = cleanPlhKegiatanKasi(kegiatan);
  if (!cleanKegiatan) return "...";

  const beforePlaceholder = templateSentence.split(PLH_KEGIATAN_KASI_PLACEHOLDER)[0] || "";
  const hasMelaksanakanBefore = /\bmelaksanakan\s*$/i.test(beforePlaceholder.trim()) ||
    /\bmelaksanakan\b/i.test(beforePlaceholder.slice(-25));

  const startsWithMelaksanakan = /^melaksanakan\b/i.test(cleanKegiatan);

  if (hasMelaksanakanBefore) {
    if (startsWithMelaksanakan) {
      const stripped = cleanKegiatan.replace(/^melaksanakan\s+/i, "").trim();
      return stripped || cleanKegiatan;
    }
    return cleanKegiatan;
  } else {
    if (startsWithMelaksanakan) {
      return cleanKegiatan.charAt(0).toLowerCase() + cleanKegiatan.slice(1);
    }
    if (/^[A-Z][a-z]/.test(cleanKegiatan)) {
      return cleanKegiatan.charAt(0).toLowerCase() + cleanKegiatan.slice(1);
    }
    return cleanKegiatan;
  }
}

export interface PlhPlaceholderContext {
  wilayah?: string | null;
  kegiatanKasi?: string | null;
  nomorInduk?: string | null;
  tanggalInduk?: string | null;
}

/**
 * Ganti semua jenis placeholder PLH di teks ({wilayah}, {kegiatan Kepala Seksi}, {nomor surat induk}, {tanggal surat induk}).
 */
export function replacePlhAllPlaceholders(text: string, context: PlhPlaceholderContext): string {
  if (!text) return "";
  let result = text;

  if (result.includes(PLH_WILAYAH_PLACEHOLDER)) {
    result = result.split(PLH_WILAYAH_PLACEHOLDER).join(context.wilayah?.trim() || "...");
  }

  if (result.includes(PLH_KEGIATAN_KASI_PLACEHOLDER)) {
    const formattedKegiatan = formatPlhKegiatanForTemplate(result, context.kegiatanKasi || "");
    result = result.split(PLH_KEGIATAN_KASI_PLACEHOLDER).join(formattedKegiatan);
  }

  for (const ph of PLH_NOMOR_INDUK_PLACEHOLDERS) {
    if (result.includes(ph)) {
      result = result.split(ph).join(context.nomorInduk?.trim() || "...");
    }
  }

  for (const ph of PLH_TANGGAL_INDUK_PLACEHOLDERS) {
    if (result.includes(ph)) {
      result = result.split(ph).join(context.tanggalInduk?.trim() || "...");
    }
  }

  return result;
}

/**
 * Normalisasi data pegawai dari API ke shape Employee yang konsisten.
 * Kadang API balikin `name` instead of `nama_lengkap`, atau `position` instead of `jabatan`.
 */
export function normalizeEmployeeForSelection(employee: Employee): Employee {
  return {
    ...employee,
    nama_lengkap: employee.nama_lengkap || employee.name || "",
    jabatan: employee.jabatan || employee.position || "",
  };
}

