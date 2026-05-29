/**
 * Helper functions untuk template PLH (Pelaksana Harian).
 */
import type { Employee } from "./types";

/**
 * Extract nama wilayah dari field `position` pegawai.
 * Contoh: "Kepala Seksi KSDA Wilayah III Balikpapan" → "III Balikpapan".
 */
export function extractPlhWilayahFromPosition(position?: string | null) {
  const text = (position || "").trim();
  const match = text.match(/Seksi\s+KSDA\s+Wilayah\s+(.+)$/i);
  return match?.[1]?.trim() || text;
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
