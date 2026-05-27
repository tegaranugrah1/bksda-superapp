// Default text content for the SK Tim Penilai (Panitia Penaksir Harga) BMN builder.

import { newSkBuilderItem, type SkBuilderItem } from "./sk-defaults";

export interface TimPenilaiAnggota {
  id: string;
  nama: string;            // "Dheny Mardiono, S.Hut., M.Sc."
  nip: string;             // "19750314 199903 1 004"
  jabatanKegiatan: string; // "Ketua" / "Sekretaris" / "Anggota"
  keterangan: string;      // free-form note (default empty)
}

// SK Tim Penilai uses 4 numbered keputusan (KESATU..KEEMPAT) instead of 3.
export interface SkTimPenilaiMemutuskan {
  menetapkan: string;
  kesatu: string;
  kedua: string;
  ketiga: string;
  keempat: string;
}

const makeId = () => "id" + Math.random().toString(36).slice(2);

export const DEFAULT_TIM_PENILAI_SUSUNAN: TimPenilaiAnggota[] = [
  {
    id: makeId(),
    nama: "Dheny Mardiono, S.Hut., M.Sc.",
    nip: "19750314 199903 1 004",
    jabatanKegiatan: "Ketua",
    keterangan: "",
  },
  {
    id: makeId(),
    nama: "Heryanto Sumanbowo, S.Hut.",
    nip: "19830528 200112 1 001",
    jabatanKegiatan: "Sekretaris",
    keterangan: "",
  },
  {
    id: makeId(),
    nama: "Tegar Anugrah, A.Md.Kom.",
    nip: "19990707 202506 1 006",
    jabatanKegiatan: "Anggota",
    keterangan: "",
  },
];

export const DEFAULT_TIM_PENILAI_MENIMBANG: SkBuilderItem[] = [
  newSkBuilderItem(
    "bahwa dalam rangka melakukan penertiban terhadap Barang Milik Negara yang, rusak berat, tidak ekonomis dan tidak efisien dalam penggunaannya untuk kepentingan dinas serta dilakukan pelelangan baik lelang umum maupun lelang terbatas, perlu menetapkan Keputusan Kepala Balai Balai Konservasi Sumber Daya Alam Kalimantan Timur tentang Pembentukan Panitia Penaksir Harga Barang Milik Negara."
  ),
];

export const DEFAULT_TIM_PENILAI_MENGINGAT: SkBuilderItem[] = [
  newSkBuilderItem("Undang-Undang RI Nomor 17 Tahun 2003 tentang Keuangan Negara;"),
  newSkBuilderItem("Undang-Undang RI Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;"),
  newSkBuilderItem("Peraturan Pemerintah Nomor 71 Tahun 2010 tentang Standar Akuntansi Pemerintahan;"),
  newSkBuilderItem(
    "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;"
  ),
  newSkBuilderItem("Peraturan Presiden Nomor 175 Tahun 2024 tentang Kementerian Kehutanan;"),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 4/PMK.06/2015 tentang Pendelegasian Kewenangan dan Tanggung Jawab Tertentu Dari Pengelola Barang kepada Pengguna Barang;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 246/PMK.06/2014 tentang Tata Cara Pelaksanaan Penggunaan Barang Milik Negara sebagaimana telah diubah dengan Peraturan Menteri Keuangan Nomor 87/PMK.06/2016;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 111/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 173/PMK.06/2020 tentang Penilaian oleh Penilai Pemerintah di Lingkungan Direktorat Jenderal Kekayaan Negara;"
  ),
  newSkBuilderItem("Peraturan Menteri Keuangan Nomor 122 Tahun 2023 tentang Petunjuk Pelaksanaan Lelang;"),
  newSkBuilderItem(
    "Keputusan Menteri Keuangan Republik Indonesia Nomor 375 Tahun 2024 tentang Pedoman Penentuan Nilai Taksiran Barang Milik Negara Selain Tanah Dan/Atau Bangunan Berupa Kendaraan Bermotor Oleh Panitia Penaksir;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan."
  ),
];

export const DEFAULT_TIM_PENILAI_MEMUTUSKAN: SkTimPenilaiMemutuskan = {
  menetapkan:
    "SURAT KEPUTUSAN KEPALA BALAI BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR TENTANG PEMBENTUKAN PANITIA PENAKSIR HARGA BARANG MILIK NEGARA PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR.",
  kesatu:
    "Membentuk Panitia Penaksir Harga Barang Milik Negara pada Satuan Kerja Kantor Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan susunan keanggotaan yang tercantum dalam Lampiran Surat Keputusan ini.",
  kedua:
    "Panitia tersebut bertugas :\n1. Melakukan penelitian terhadap data administratif barang dan dokumen pemilikan serta mencocokan kesesuaian fisik BMN yang akan dijual dengan data administratif;\n2. Menaksir harga jual Barang Milik Negara menurut ketentuan yang berlaku;\n3. Hasil penaksiran dituangkan dalam laporan dan dilaporkan kepada Kuasa Pengguna Barang yang selanjutnya digunakan sebagai dasar penetapan nilai limit penjualan BMN;\n4. Serta tugas panitia lainnya yang dipandang perlu.",
  ketiga:
    "Keputusan Biaya yang timbul atas pelaksanaan Surat Keputusan ini dibebankan pada Anggaran Balai Konservasi Sumber Daya Alam Kalimantan Timur.",
  keempat:
    "Surat Keputusan ini mulai berlaku pada tanggal ditetapkan dengan ketentuan apabila dikemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.",
};

export const DEFAULT_TIM_PENILAI_TEMBUSAN: SkBuilderItem[] = [
  newSkBuilderItem("Kepala Biro Umum Kementerian Kehutanan"),
  newSkBuilderItem("Sekretaris Direktorat Jenderal KSDAE"),
  newSkBuilderItem("Yang Bersangkutan"),
];

export const newTimPenilaiAnggota = (): TimPenilaiAnggota => ({
  id: makeId(),
  nama: "",
  nip: "",
  jabatanKegiatan: "",
  keterangan: "",
});
