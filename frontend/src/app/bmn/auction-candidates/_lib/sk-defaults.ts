// Default text content and helpers for the SK Penghentian builder.

const makeId = () => "id" + Math.random().toString(36).slice(2);

export interface SkBuilderItem {
  id: string;
  text: string;
}

export interface SkMemutuskan {
  menetapkan: string;
  kesatu: string;
  kedua: string;
  ketiga: string;
}

export interface SkKepalaBalai {
  nama: string;
  nip: string;
}

export const DEFAULT_MENIMBANG: SkBuilderItem[] = [
  {
    id: makeId(),
    text: "bahwa terdapat Barang Milik Negara pada Balai Konservasi Sumber Daya Alam Kalimantan Timur berupa Alat Angkutan Bermotor dalam keadaan rusak berat dan tidak ekonomis lagi untuk digunakan;",
  },
  {
    id: makeId(),
    text: "bahwa sehubungan dengan hal tersebut diatas, dipandang perlu untuk menerbitkan Keputusan Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur tentang Penghentian Penggunaan Barang Milik Negara.",
  },
];

export const DEFAULT_MENGINGAT: SkBuilderItem[] = [
  {
    id: makeId(),
    text: "Undang-Undang Republik Indonesia Nomor 17 Tahun 2003 tentang Keuangan Negara;",
  },
  {
    id: makeId(),
    text: "Undang-Undang Republik Indonesia Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;",
  },
  {
    id: makeId(),
    text: "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;",
  },
  {
    id: makeId(),
    text: "Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;",
  },
  {
    id: makeId(),
    text: "Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;",
  },
  {
    id: makeId(),
    text: "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;",
  },
  {
    id: makeId(),
    text: "Peraturan Menteri Keuangan Nomor 111/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara sebagaimana telah diubah dengan Peraturan Menteri Keuangan Nomor 165/PMK.06/2021;",
  },
  {
    id: makeId(),
    text: "Peraturan Menteri Keuangan Nomor 181/PMK.06/2016 tentang Penatausahaan Barang Milik Negara;",
  },
  {
    id: makeId(),
    text: "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan.",
  },
];

export const DEFAULT_MEMUTUSKAN: SkMemutuskan = {
  menetapkan:
    "KEPUTUSAN KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR TENTANG PENGHENTIAN PENGGUNAAN BARANG MILIK NEGARA LINGKUP BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR.",
  kesatu:
    "Menghentikan penggunaan Barang Milik Negara berupa Alat Angkutan Bermotor dalam kondisi rusak berat pada Balai Konservasi Sumber Daya Alam Kalimantan Timur tersebut sebagaimana tercantum dalam lampiran keputusan ini.",
  kedua:
    "Menghentikan biaya pemeliharaan Alat Angkutan Bermotor tersebut sejak dikeluarkan keputusan ini, untuk dilanjutkan pada proses penghapusan.",
  ketiga: "Keputusan ini mulai berlaku sejak tanggal ditetapkan.",
};

export const DEFAULT_KEPALA_BALAI: SkKepalaBalai = {
  nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
};

export const DEFAULT_TEMBUSAN: SkBuilderItem[] = [
  { id: makeId(), text: "Kepala Biro Umum Kementerian Kehutanan" },
  { id: makeId(), text: "Sekretaris Direktorat Jenderal KSDAE" },
];

/**
 * Format a raw NIP (e.g. "197405141999031001") into the spaced format
 * "19740514 199903 1 001" (8 + space + 6 + space + 1 + space + 3).
 *
 * If the input is already partially formatted, all non-digits are stripped
 * before formatting. Inputs that don't have exactly 18 digits are returned
 * trimmed but otherwise unchanged.
 */
export function formatNip(nip: string): string {
  if (!nip) return "";
  const digits = nip.replace(/\D/g, "");
  if (digits.length !== 18) return nip.trim();
  return `${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15, 18)}`;
}

export const newSkBuilderItem = (text = ""): SkBuilderItem => ({
  id: makeId(),
  text,
});
