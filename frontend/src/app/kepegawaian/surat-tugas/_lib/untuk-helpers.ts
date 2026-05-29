/**
 * Helpers untuk item "Untuk" di Surat Tugas.
 * Item Untuk default berbeda per template (PLH vs BMN vs default).
 */
import type { DasarItem } from "./types";

/**
 * Default item terakhir Untuk (laporan/dikonsultasikan) berdasarkan template.
 */
export function getDefaultUntukItem(templateType?: string | null) {
  if (templateType === "plh") {
    return "Hal-hal yang bersifat prinsip agar dikonsultasikan dengan Kepala Balai.";
  }
  if (templateType === "bmn-pemeriksaan") {
    return "Membuat laporan tertulis paling lambat 7 (tujuh) hari setelah selesainya kegiatan tersebut.";
  }
  return "Membuat laporan tertulis paling lambat 7 (tujuh) hari kerja setelah selesainya kegiatan tersebut.";
}

/**
 * Set default Untuk items: 1 item default + 1 item biaya (kalau ada).
 */
export function getDefaultUntukItems(
  templateType?: string | null,
  biayaText = "",
): DasarItem[] {
  const items: DasarItem[] = [
    { id: "untuk-default", text: getDefaultUntukItem(templateType) },
  ];
  if (biayaText.trim()) {
    items.push({ id: "untuk-biaya", text: biayaText });
  }
  return items;
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
