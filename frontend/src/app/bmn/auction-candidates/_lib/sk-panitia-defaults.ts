// Default text content for the SK Panitia Penghapusan BMN builder.

import {
  newSkBuilderItem,
  type SkBuilderItem,
  type SkMemutuskan,
} from "./sk-defaults";

export interface PanitiaAnggota {
  id: string;
  nama: string;           // "Dheny Mardiono, S.Hut., M.Sc."
  nip: string;            // "19750314 199903 1 004"
  jabatanInstansi: string; // "Kepala Sub Bagian Tata Usaha"
  jabatanKegiatan: string; // "Ketua" — this is the role in the committee
}

const makeId = () => "id" + Math.random().toString(36).slice(2);

export const DEFAULT_PANITIA_SUSUNAN: PanitiaAnggota[] = [
  { id: makeId(), nama: "Dheny Mardiono, S.Hut., M.Sc.", nip: "19750314 199903 1 004", jabatanInstansi: "Kepala Sub Bagian Tata Usaha", jabatanKegiatan: "Ketua" },
  { id: makeId(), nama: "Heryanto Sumanbowo, S.Hut.", nip: "198305 28200112 1 001", jabatanInstansi: "PEH Ahli Muda", jabatanKegiatan: "Sekretaris" },
  { id: makeId(), nama: "Tegar Anugrah, A.Md.Kom.", nip: "19990707 202506 1 006", jabatanInstansi: "Pranata Komputer Terampil", jabatanKegiatan: "Anggota" },
];

export const DEFAULT_PANITIA_MENIMBANG: SkBuilderItem[] = [
  newSkBuilderItem(
    "bahwa Barang Milik Negara pada Balai Konservasi Sumber Daya Alam Kalimantan Timur berupa Alat Angkutan Bermotor dalam keadaan rusak berat dan tidak ekonomis lagi untuk digunakan lagi, sehingga perlu segera dihapuskan dari daftar inventaris;"
  ),
  newSkBuilderItem(
    "bahwa sehubungan dengan hal tersebut di atas, dipandang perlu membentuk Panitia Penghapusan Barang Milik Negara berupa Alat Angkutan Bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Keputusan Kepala Balai."
  ),
];

export const DEFAULT_PANITIA_MENGINGAT: SkBuilderItem[] = [
  newSkBuilderItem(
    "Undang-Undang RI Nomor 17 Tahun 2003 tentang Keuangan Negara;"
  ),
  newSkBuilderItem(
    "Undang-Undang RI Nomor 1 Tahun 2004 tentang Perbendaharaan Negara;"
  ),
  newSkBuilderItem(
    "Peraturan Pemerintah Nomor 27 Tahun 2014 tentang Pengelolaan Barang Milik Negara/Daerah sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 28 Tahun 2020;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 83/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemusnahan dan Penghapusan Barang Milik Negara;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 173/PMK.06/2020 tentang Penilaian oleh Penilai Pemerintah di Lingkungan Direktorat Jenderal Kekayaan Negara;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 111/PMK.06/2016 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Keuangan Nomor 122 Tahun 2023 tentang Petunjuk Pelaksanaan Lelang;"
  ),
  newSkBuilderItem(
    "Peraturan Menteri Lingkungan Hidup dan Kehutanan Nomor P.11/MENLHK/SETJEN/KAP.3/4/2018 tentang Tata Cara Pelaksanaan Pemindahtanganan Barang Milik Negara Lingkup Kementerian Lingkungan Hidup dan Kehutanan."
  ),
];

export const DEFAULT_PANITIA_MEMUTUSKAN: SkMemutuskan = {
  menetapkan:
    "KEPUTUSAN KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR TENTANG PANITIA PENGHAPUSAN BARANG MILIK NEGARA BERUPA ALAT ANGKUTAN BERMOTOR PADA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR.",
  kesatu:
    "Membentuk Panitia Penghapusan Barang Milik Negara berupa Alat Angkutan Bermotor pada Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan susunan sebagaimana tercantum dalam lampiran Keputusan ini.",
  kedua:
    "Panitia Penghapusan bertugas :\n1. Meneliti/menilai barang inventaris yang akan dihapuskan meliputi :\n    a. Menginventaris / dan meneliti barang yang akan dihapus;\n    b. Meneliti kondisi fisik barang inventaris yang akan dihapus;\n    c. Menetapkan perkiraan nilai barang inventaris yang akan dihapus;\n    d. Membuat berita acara penelitian / penilaian;\n2. Menyusun kelengkapan persyaratan penghapusan;\n3. Berkoordinasi dengan KPKNL setempat dan melaksanakan lelang, dalam hal penghapusan tersebut yang akan ditindaklanjuti dengan penjualan secara lelang;\n4. Menyusun laporan termasuk membuat berita acara hasil pelaksanaan tindak lanjut penghapusan.",
  ketiga: "Keputusan ini mulai berlaku sejak tanggal ditetapkan.",
};

export const DEFAULT_PANITIA_TEMBUSAN: SkBuilderItem[] = [
  newSkBuilderItem("Kepala Biro Umum Kementerian Kehutanan"),
  newSkBuilderItem("Sekretaris Direktorat Jenderal KSDAE"),
  newSkBuilderItem("Yang Bersangkutan"),
];
