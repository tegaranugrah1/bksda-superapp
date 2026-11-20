/**
 * Format string & angka utilitas untuk Modul BMN (Barang Milik Negara).
 */

export const formatRupiah = (angka?: number | null) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(angka || 0);

export function getAssetUser(asset: {
  pengguna?: string | null;
  nama_pengguna?: string | null;
  penanggung_jawab?: { nama_lengkap: string } | null;
}): string | null {
  return asset.pengguna || asset.nama_pengguna || asset.penanggung_jawab?.nama_lengkap || null;
}

/** Remove duplicated half-phrase in merk_tipe / nama (e.g. "Sanyo Sanyo" or "Foo Bar Foo Bar"). */
export function deduplicateMerkTipe(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "-";
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const left = words.slice(0, half).join(" ");
    const right = words.slice(half).join(" ");
    if (left.toLowerCase() === right.toLowerCase()) {
      return left;
    }
  }
  return trimmed;
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
