/**
 * Format string & angka utilitas untuk Modul BMN (Barang Milik Negara).
 */

export const formatRupiah = (angka?: number | null) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka || 0);

/** Remove duplicate words in merk_tipe (e.g. "Sanyo Sanyo" → "Sanyo") */
export function deduplicateMerkTipe(value?: string | null): string {
  if (!value) return "-";
  const words = value.trim().split(/\s+/);
  if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
    return words[0];
  }
  return value;
}

/** Shorten lokasi names for display */
export function shortenLokasi(lokasi?: string | null): string {
  if (!lokasi || lokasi === "-") return "-";
  return lokasi
    .replace("Kantor Balai KSDA Kalimantan Timur", "Kantor Balai")
    .replace("Seksi KSDA Wilayah I (Berau)", "Seksi Wil. I Berau")
    .replace("Seksi KSDA Wilayah II (Tenggarong)", "Seksi Wil. II Tenggarong")
    .replace("Seksi KSDA Wilayah III (Balikpapan)", "Seksi Wil. III Balikpapan")
    .replace("Urusan Umum dan Perlengkapan", "Urusan Umum")
    .replace("Urusan Program dan Perencanaan", "Urusan Program")
    .replace("Resor ", "R.");
}
