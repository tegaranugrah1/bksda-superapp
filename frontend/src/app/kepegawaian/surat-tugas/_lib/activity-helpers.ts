/**
 * Helpers untuk activity prefix dan single-day activity detection.
 */
import { SUMBER_DANA_OPTIONS } from "./constants";
import type { StExpenseTemplate } from "./types";

/**
 * Cek apakah activity prefix mengindikasikan kegiatan single-day
 * (mis. "Melaksanakan Kegiatan" di lokasi tertentu, bukan perjalanan dinas).
 */
export function isSingleDayActivityPrefix(prefix: string) {
  return prefix.includes("Melaksanakan Kegiatan");
}

export function cleanMelaksanakanKegiatanPrefix(text: string): string {
  if (!text) return "";
  let trimmed = text.trim();

  // Recursively remove nested "Melaksanakan Perjalanan Dinas dari ... ke ... dalam rangka "
  const pdPattern = /^Melaksanakan\s+Perjalanan\s+Dinas\s+dari\s+.*?\s+ke\s+.*?\s+dalam\s+rangka\s+/i;
  while (pdPattern.test(trimmed)) {
    trimmed = trimmed.replace(pdPattern, "").trim();
  }

  // Recursively remove nested "Melaksanakan Kegiatan ... [pada/di] ..."
  const mkPattern = /^Melaksanakan\s+Kegiatan\s+/i;
  while (mkPattern.test(trimmed)) {
    trimmed = trimmed.replace(mkPattern, "").trim();
  }

  // Recursively remove nested "Menugaskan Staf untuk "
  const msPattern = /^Menugaskan\s+Staf\s+untuk\s+/i;
  while (msPattern.test(trimmed)) {
    trimmed = trimmed.replace(msPattern, "").trim();
  }

  return cleanRepeatingLocations(trimmed);
}

/**
 * Bersihkan pengulangan frasa lokasi yang tidak sengaja terduplikasi (e.g. "di Paser di Paser di Paser")
 */
export function cleanRepeatingLocations(text: string): string {
  if (!text) return "";
  return text.replace(/(\s+(?:di|pada)\s+[^,;]+?)(?:\1)+/gi, "$1");
}


/**
 * Tentukan apakah ST harus dirender sebagai kegiatan single-day:
 * - tanggal mulai === tanggal selesai
 * - DAN: prefix single-day OR template default (bukan bmn-pemeriksaan/beda-hari/plh)
 */
export function shouldRenderAsSingleDayActivity(
  prefix: string,
  startDate?: string | null,
  endDate?: string | null,
  templateType?: string | null,
) {
  return (
    Boolean(startDate) &&
    Boolean(endDate) &&
    startDate === endDate &&
    (isSingleDayActivityPrefix(prefix) ||
      !["bmn-pemeriksaan", "beda-hari", "plh"].includes(templateType || ""))
  );
}

/**
 * Build teks biaya yang sesuai dengan sumber dana + template.
 * Beberapa template (BMN, PLH) tidak punya biaya line.
 */
export function buildBiayaTextFor(
  fundingId: string,
  otherSource: string,
  letterDate: string,
  templateType?: string | null,
  customExpenseTemplates?: StExpenseTemplate[],
) {
  if (templateType === "bmn-pemeriksaan" || templateType === "plh" || fundingId === "dl1") return "";
  
  const tahun = letterDate
    ? new Date(letterDate).getFullYear().toString()
    : new Date().getFullYear().toString();

  if (customExpenseTemplates && customExpenseTemplates.length > 0) {
    const dyn = customExpenseTemplates.find(
      (t) => t.code === fundingId || String(t.id) === fundingId || t.name.toLowerCase() === fundingId.toLowerCase()
    );
    if (dyn) {
      if (!dyn.biaya_text) return "";
      return dyn.biaya_text.replace(/{tahun}/g, tahun);
    }
  }

  const opt = SUMBER_DANA_OPTIONS.find((o) => o.id === fundingId);
  if (opt) {
    if (!opt.biayaText) return "";
    return opt.biayaText.replace(/{tahun}/g, tahun);
  }
  if (fundingId === "other") {
    return otherSource ? `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${otherSource};` : "";
  }
  return "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;";
}
