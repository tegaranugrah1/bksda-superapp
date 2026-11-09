/**
 * Helpers untuk item "Untuk" di Surat Tugas.
 * Sesuai aturan susunan Diktum "Untuk":
 * - Poin 1: Penugasan Kegiatan Utama + Waktu Pelaksanaan
 * - Poin 2..k: Butir Tambahan (dari Default Butir Tambahan Template ST atau ditambah manual di Builder)
 * - Poin Berikutnya (turun di bawah Poin 1 / Poin Tambahan): Pembebanan Biaya / Sumber Dana
 * - Poin Paling Terakhir: Kewajiban Membuat Laporan Tertulis (dikontrol toggle)
 */
import type { DasarItem, StExpenseTemplate } from "./types";

/** Read legacy JSON/plain-text lists without passing malformed children to renderers. */
export function parseLetterItems(value: unknown): DasarItem[] {
  if (typeof value === "string") {
    const text = value;
    try { value = JSON.parse(value); }
    catch { value = text.split(";"); }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const text = typeof item === "string" ? item : item && typeof item.text === "string" ? item.text : "";
    if (!text.trim()) return [];
    const id = item && (typeof item.id === "string" || typeof item.id === "number") ? String(item.id) : String(index);
    return [{ id, text: text.trim() }];
  });
}

export const DEFAULT_LAPORAN_TEXT =
  "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.";
export const DEFAULT_LAPORAN_BMN_TEXT =
  "Membuat laporan tertulis paling lambat 7 (tujuh) hari setelah selesainya kegiatan tersebut.";
export const DEFAULT_PLH_PRINSIP_TEXT =
  "Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai.";

/**
 * Default item penutup Untuk (laporan/dikonsultasikan) berdasarkan template.
 */
export function getDefaultUntukItem(templateType?: string | null) {
  if (templateType === "plh") {
    return DEFAULT_PLH_PRINSIP_TEXT;
  }
  if (templateType === "bmn-pemeriksaan" || templateType === "bmn") {
    return DEFAULT_LAPORAN_BMN_TEXT;
  }
  return DEFAULT_LAPORAN_TEXT;
}

/**
 * Cek apakah baris ini adalah baris laporan tertulis otomatis.
 */
export function isGeneratedLaporanItem(value: string) {
  return /^Membuat laporan tertulis paling lambat/i.test(value.trim());
}

/**
 * Cek apakah baris ini adalah baris biaya yang di-generate otomatis
 * (untuk bisa di-skip atau diganti saat sumber dana berubah).
 */
export function isGeneratedBiayaItem(
  value: string,
  expenseTemplates?: StExpenseTemplate[]
) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^(Segala biaya yang timbul|Sumber dana dibebankan|Seluruh biaya|Biaya perjalanan)/i.test(trimmed)) {
    return true;
  }
  if (expenseTemplates && expenseTemplates.length > 0) {
    const lower = trimmed.toLowerCase();
    return expenseTemplates.some((t) => {
      if (!t.biaya_text) return false;
      const sample = t.biaya_text.replace(/\{tahun\}/gi, "").trim().toLowerCase();
      return sample.length > 15 && lower.includes(sample.substring(0, 25));
    });
  }
  return false;
}

/**
 * Ekstrak hanya butir tambahan manual/template dari baris-baris `maksud_tujuan` setelah Poin 1
 * (memisahkan baris biaya otomatis dan baris laporan tertulis otomatis).
 */
export function extractCustomUntukItems(
  additionalLines: string[],
  expenseTemplates?: StExpenseTemplate[]
): DasarItem[] {
  const custom: DasarItem[] = [];
  additionalLines.forEach((line, idx) => {
    const text = line.trim();
    if (!text) return;
    if (isGeneratedBiayaItem(text, expenseTemplates)) return;
    if (isGeneratedLaporanItem(text)) return;
    custom.push({ id: `stored-untuk-${idx}-${Date.now()}`, text });
  });
  return custom;
}

/**
 * Susun urutan item Untuk setelah Poin 1:
 * [Poin 2..k: Poin Tambahan Template/Manual] -> [Biaya (turun di bawah tambahan)] -> [Poin Terakhir: Laporan]
 */
export function buildOrderedAdditionalUntukItems({
  templateType,
  biayaText = "",
  customTemplateItems = [],
  sertakanLaporan = true,
  expenseTemplates,
}: {
  templateType?: string | null;
  biayaText?: string;
  customTemplateItems?: DasarItem[] | null;
  sertakanLaporan?: boolean;
  expenseTemplates?: StExpenseTemplate[];
}): DasarItem[] {
  const items: DasarItem[] = [];

  // 1. Poin 2 dst.: Butir Tambahan dari Template ST atau ditambah manual di Builder
  const customItems = parseLetterItems(customTemplateItems);
  if (customItems.length > 0) {
    customItems.forEach((c, idx) => {
      const text = c.text?.trim() || "";
      if (!text) return;
      if (isGeneratedBiayaItem(text, expenseTemplates)) return;
      if (isGeneratedLaporanItem(text)) return;
      items.push({ id: c.id || `custom-u-${idx}`, text });
    });
  } else if (templateType === "plh") {
    // Fallback default PLH jika belum ada customTemplateItems yang diset
    items.push({ id: "plh-prinsip", text: DEFAULT_PLH_PRINSIP_TEXT });
  }

  // 2. Pembebanan Biaya: tepat di bawah Poin 1 jika tanpa tambahan, atau turun di bawah Poin Tambahan
  if (biayaText && biayaText.trim()) {
    items.push({ id: "untuk-biaya", text: biayaText.trim() });
  }

  // 3. Poin Paling Terakhir: Kewajiban Membuat Laporan Tertulis (dikontrol toggle sertakanLaporan)
  if (sertakanLaporan) {
    const laporanText =
      templateType === "bmn-pemeriksaan" || templateType === "bmn"
        ? DEFAULT_LAPORAN_BMN_TEXT
        : DEFAULT_LAPORAN_TEXT;
    items.push({ id: "untuk-laporan", text: laporanText });
  }

  return items;
}

/**
 * Legacy compatible wrapper for getDefaultUntukItems.
 */
export function getDefaultUntukItems(
  templateType?: string | null,
  biayaText = "",
  templateUntukItems?: DasarItem[] | null,
  sertakanLaporan = true,
): DasarItem[] {
  return buildOrderedAdditionalUntukItems({
    templateType,
    biayaText,
    customTemplateItems: templateUntukItems,
    sertakanLaporan,
  });
}

/**
 * Split string `maksud_tujuan` (newline-delimited) ke array item Untuk.
 */
export function splitStoredUntukItems(value?: string | null) {
  return (value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Convert array of strings ke DasarItem[] dengan unique IDs.
 */
export function toDasarItems(items: string[], prefix: string): DasarItem[] {
  return items.map((text, idx) => ({
    id: `${prefix}-${idx}-${Date.now()}`,
    text,
  }));
}
