/**
 * Helpers untuk item "Untuk" di Surat Tugas.
 * Sesuai Tata Naskah Dinas:
 * - Poin 1: Penugasan Kegiatan Utama
 * - Poin 2: Pembebanan Biaya / Anggaran
 * - Poin 3: Poin Tambahan Khusus
 * - Poin Terakhir: Kewajiban Membuat Laporan Tertulis
 */
import type { DasarItem } from "./types";

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
  if (templateType === "bmn-pemeriksaan") {
    return DEFAULT_LAPORAN_BMN_TEXT;
  }
  return DEFAULT_LAPORAN_TEXT;
}

/**
 * Susun urutan item Untuk sesuai Tata Naskah Dinas KSDAE:
 * [Poin 2: Pembebanan Biaya] -> [Poin 3: Poin Tambahan] -> [Poin Terakhir: Laporan/Prinsip]
 */
export function buildOrderedAdditionalUntukItems({
  templateType,
  biayaText = "",
  customTemplateItems = [],
  sertakanLaporan = true,
}: {
  templateType?: string | null;
  biayaText?: string;
  customTemplateItems?: DasarItem[] | null;
  sertakanLaporan?: boolean;
}): DasarItem[] {
  const items: DasarItem[] = [];

  // Poin 2: Biaya (jika ada dan bukan PLH)
  if (biayaText && biayaText.trim()) {
    items.push({ id: "untuk-biaya", text: biayaText.trim() });
  }

  // Poin 3: Custom item dari template (selain biaya atau laporan default)
  if (customTemplateItems && customTemplateItems.length > 0) {
    customTemplateItems.forEach((c, idx) => {
      const text = c.text?.trim() || "";
      if (!text) return;
      if (isGeneratedBiayaItem(text)) return;
      if (text.toLowerCase().includes("membuat laporan tertulis")) return;
      if (text.toLowerCase().includes("hal-hal yang bersifat prinsip")) return;
      items.push({ id: c.id || `custom-u-${idx}`, text });
    });
  }

  // Poin Terakhir: Laporan atau Penutup PLH
  if (templateType === "plh") {
    items.push({ id: "plh-prinsip", text: DEFAULT_PLH_PRINSIP_TEXT });
  } else if (sertakanLaporan) {
    const laporanText =
      templateType === "bmn-pemeriksaan"
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
 * Cek apakah baris ini adalah baris biaya yang di-generate otomatis
 * (untuk bisa di-skip atau diganti saat sumber dana berubah).
 */
export function isGeneratedBiayaItem(value: string) {
  return /^(Segala biaya yang timbul|Sumber dana dibebankan)/i.test(value.trim());
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
