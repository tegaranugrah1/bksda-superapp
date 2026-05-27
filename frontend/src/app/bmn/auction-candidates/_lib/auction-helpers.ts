export interface AuctionAsset {
  id: string;
  kode_barang: string;
  nup: string;
  nup_lama?: string | null;
  nama_barang: string;
  jenis_bmn?: string | null;
  merk_tipe?: string | null;
  kondisi: string;
  nilai_perolehan: number;
  nilai_buku?: number | null;
  satuan?: string | null;
  lokasi_ruang?: string | null;
  lokasi_spesifik?: string | null;
  tahun_perolehan?: number | null;
  no_polisi?: string | null;
  no_identitas?: string | null;
  no_mesin?: string | null;
  no_rangka?: string | null;
}

export interface AssetResponse {
  data: AuctionAsset[];
  last_page: number;
  total?: number;
}

export interface AttachmentPage {
  assets: AuctionAsset[];
  startIndex: number;
  showColumnNumbers: boolean;
  includeMeta: boolean;
  includeTotal: boolean;
  includeSignature: boolean;
}

export const formatRupiah = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);

export const formatPlainRupiah = (value: number | null | undefined) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value || 0);

export const formatDateLong = (date = new Date()) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

export const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const numberWords = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
];

export function numberToWords(value: number): string {
  if (value < 0) return "";
  if (value < 12) return numberWords[value];
  if (value < 20) return `${numberToWords(value - 10)} Belas`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    return `${numberToWords(tens)} Puluh${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  if (value < 200) return `Seratus${value > 100 ? ` ${numberToWords(value - 100)}` : ""}`;
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    return `${numberToWords(hundreds)} Ratus${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  if (value < 2000) return `Seribu${value > 1000 ? ` ${numberToWords(value - 1000)}` : ""}`;
  if (value < 1_000_000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    return `${numberToWords(thousands)} Ribu${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  if (value < 1_000_000_000) {
    const millions = Math.floor(value / 1_000_000);
    const rest = value % 1_000_000;
    return `${numberToWords(millions)} Juta${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  if (value < 1_000_000_000_000) {
    const billions = Math.floor(value / 1_000_000_000);
    const rest = value % 1_000_000_000;
    return `${numberToWords(billions)} Miliar${rest ? ` ${numberToWords(rest)}` : ""}`;
  }
  const trillions = Math.floor(value / 1_000_000_000_000);
  const rest = value % 1_000_000_000_000;
  return `${numberToWords(trillions)} Triliun${rest ? ` ${numberToWords(rest)}` : ""}`;
}

export function getSpelledDate(date = new Date()) {
  const day = dayNames[date.getDay()];
  const dateText = numberToWords(date.getDate());
  const month = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(date);
  const yearText = numberToWords(date.getFullYear());
  return { day, dateText, month, yearText };
}

export function getBaNumberSuffix(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `K.18/TU/KAP.06.01/B/${month}/${date.getFullYear()}`;
}

export function getSkNumberSuffix(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `K.18/TU/KAP.05/${month}/${date.getFullYear()}`;
}

export function shortenLokasi(value?: string | null) {
  if (!value) return "-";
  return value
    .replace("Kantor Balai KSDA Kalimantan Timur", "Kantor Balai")
    .replace("Seksi KSDA Wilayah I (Berau)", "Seksi Wil. I Berau")
    .replace("Seksi KSDA Wilayah II (Tenggarong)", "Seksi Wil. II Tenggarong")
    .replace("Seksi KSDA Wilayah III (Balikpapan)", "Seksi Wil. III Balikpapan");
}
