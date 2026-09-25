"use client";

import React from "react";
import { toast } from "sonner";

export type TemplateType =
  | "surat_dinas"
  | "nota_dinas"
  | "undangan"
  | "memorandum"
  | "surat_pengantar"
  | "surat_keterangan"
  | "berita_acara"
  | "pengumuman"
  | "surat_pernyataan"
  | "surat_kuasa"
  | "surat_izin"
  | "surat_panggilan"
  | "surat_edaran"
  | "instruksi"
  | "keputusan"
  | "telaah_staf"
  | "laporan"
  | "perjanjian"
  | "piagam"
  | "sertifikat";

export interface TembusanItem {
  id: string;
  text: string;
}

export interface PengantarRow {
  no: number;
  naskah: string;
  banyaknya: string;
  keterangan: string;
}

export interface PersonItem {
  nama: string;
  nip?: string;
  pangkatGol?: string;
  jabatan: string;
  alamat?: string;
  unit?: string;
  instansi?: string;
  idType?: "NIP" | "NIK" | string;
  partyType?: "internal" | "external";
}

export interface SuratDinasData {
  templateType?: TemplateType;
  nomor: string;
  sifat?: string;
  lampiran?: string;
  perihal?: string;
  kotaTanggal: string;
  tujuanKepada?: string;
  tujuanDi?: string;

  // Nota Dinas & Memorandum
  yth?: string;
  dari?: string;

  // Undangan & Panggilan
  acaraHariTanggal?: string;
  acaraWaktu?: string;
  acaraTempat?: string;
  acaraNama?: string;
  keperluanPanggilan?: string;

  // Surat Pengantar
  tabelPengantar?: PengantarRow[];
  penerimaPengantar?: {
    nama: string;
    nip: string;
    jabatan: string;
    telepon?: string;
    instansi?: string;
    idType?: "NIP" | "NIK" | string;
    partyType?: "internal" | "external";
  };

  // Surat Keterangan, Izin, Pernyataan
  subjekPernyataan?: string;
  pejabatMenerangkan?: PersonItem;
  pegawaiDiterangkan?: PersonItem;

  // Surat Kuasa
  pemberiKuasa?: PersonItem;
  penerimaKuasa?: PersonItem;
  materiKuasa?: string;

  // Berita Acara & PKS
  hariTanggalAcara?: string;
  lokasiDibuat?: string;
  pihakPertama?: PersonItem;
  pihakKedua?: PersonItem;
  pihakKetiga?: PersonItem;
  signerCount?: 2 | 3;
  poinBeritaAcara?: string[];
  judulPerjanjian?: string;

  // Regulatif (Edaran, Instruksi, SK, Pengumuman, Telaah, Laporan)
  judulPengumuman?: string;
  judulEdaran?: string;
  judulInstruksi?: string;
  judulKeputusan?: string;
  judulTelaah?: string;
  judulLaporan?: string;

  // Struktur Regulasi / Telaah
  konsideransMenimbang?: string[];
  konsideransMengingat?: string[];
  instruksiKepada?: string[];
  diktumKeputusan?: { diktum: string; isi: string }[];
  sectionTelaah?: {
    persoalan?: string;
    praanggapan?: string;
    fakta?: string;
    analisis?: string;
    kesimpulan?: string;
    saran?: string;
  };
  sectionLaporan?: {
    pendahuluan?: string;
    kegiatan?: string;
    hasil?: string;
    kesimpulan?: string;
  };

  // Sertifikat & Piagam
  diberikanKepada?: string;
  atasPeran?: string;

  // Common Paragraf & TTD
  paragraf: string[];
  jabatanPenandatangan: string;
  namaPenandatangan: string;
  nipPenandatangan: string;
  tembusan: TembusanItem[];
}

export function getTodayIndoDate(date?: Date): string {
  const d = date || new Date();
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatIsoDateToIndo(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return isoStr;
  }
}

export function getDefaultNomorPrefix(type: TemplateType): string {
  switch (type) {
    case "nota_dinas": return "ND.102";
    case "undangan": return "UN.045";
    case "memorandum": return "M.015";
    case "surat_pengantar": return "SP.032";
    case "surat_keterangan": return "SKET.012";
    case "berita_acara": return "BA.028";
    case "pengumuman": return "PG.005";
    case "surat_pernyataan": return "SM.018";
    case "surat_kuasa": return "KS.007";
    case "surat_izin": return "SI.021";
    case "surat_panggilan": return "SG.009";
    case "surat_edaran": return "SE.003";
    case "instruksi": return "INS.002";
    case "keputusan": return "SK.041";
    case "telaah_staf": return "TS.011";
    case "laporan": return "LAP.014";
    case "perjanjian": return "PKS.071";
    case "piagam": return "PGM.001";
    case "sertifikat": return "SRT.005";
    case "surat_dinas":
    default:
      return "S.888";
  }
}

export function getDefaultNomorForTemplate(type: TemplateType, nomorUrut?: string, klasifikasi?: string, date?: Date): string {
  const d = date || new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const prefix = nomorUrut || getDefaultNomorPrefix(type);
  const klas = klasifikasi || "KSA.01.05";

  if (type === "surat_edaran" || type === "instruksi" || type === "keputusan") {
    return `${prefix} TAHUN ${yyyy}`;
  }

  return `${prefix}/K.18/TU/${klas}/B/${mm}/${yyyy}`;
}

export function getDefaultNomorSurat(nomorUrut?: string, klasifikasi?: string, date?: Date): string {
  return getDefaultNomorForTemplate("surat_dinas", nomorUrut, klasifikasi, date);
}

export const DEFAULT_KEPALA_BALAI = {
  jabatan: "Kepala Balai,",
  nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
  pangkatGol: "Pembina Tk. I (IV/b)",
  jabatanLengkap: "Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur",
};

export const DEFAULT_SURAT_DINAS_DATA: SuratDinasData = {
  templateType: "surat_dinas",
  nomor: getDefaultNomorSurat(),
  kotaTanggal: getTodayIndoDate(),
  sifat: "Biasa",
  lampiran: "-",
  perihal: "Pemberitahuan Kegiatan Pembangunan Fasilitas Pengelolaan Konservasi di Suaka Margasatwa Kelian",
  tujuanKepada: "Direktur PT. Hutan Lindung Kelian Lestari",
  tujuanDi: "Kutai Barat",
  paragraf: [
    "Berdasarkan Surat Perjanjian Kerjasama (Kontrak) Nomor : PKS.71/K.18/TU/FOLU.NC-23/KAP.02.06/B/09/2026 dan Surat Perintah Mulai Kerja (SPMK) Nomor : S.737/K.18/TU/FOLU.NC-23/KAP.02.06/B/09/2026, dalam rangka penambahan fasilitas pengelolaan konservasi Badak Kalimantan, kami sampaikan bahwa Balai KSDA Kalimantan Timur akan melakukan Kegiatan Pembangunan Umum, Management Office/Kantor, Pembangunan Dapur dan Ruang Makan dan Pekerjaan Elektrikal Ruang Panel di Suaka Margasatwa Kelian. Pembangunan akan dimulai sejak tanggal 22 September 2026 s.d. 22 Desember 2026. Berkaitan dengan hal tersebut agar Saudara dapat memberikan akses melintas di pos jaga 235.",
    "Demikian kami sampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.",
  ],
  jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
  namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
  nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
  tembusan: [
    { id: "1", text: "Kepala Seksi KSDA Wilayah II di Tenggarong;" },
    { id: "2", text: "Direktur Aliansi Lestari Rimba Terpadu (ALeRT) di Bogor" },
  ],
};

export function getDefaultDataForTemplate(type: TemplateType): SuratDinasData {
  const baseDate = getTodayIndoDate();
  const nomor = getDefaultNomorForTemplate(type);

  switch (type) {
    case "nota_dinas":
      return {
        templateType: "nota_dinas",
        nomor,
        kotaTanggal: baseDate,
        sifat: "Biasa",
        lampiran: "-",
        perihal: "Penyampaian Laporan Hasil Monitoring Populasi Satwa Dilindungi Triwulan III",
        yth: "Para Kepala Seksi Konservasi Wilayah dan Staf",
        dari: DEFAULT_KEPALA_BALAI.jabatanLengkap,
        paragraf: [
          "Sehubungan dengan pelaksanaan program kerja konservasi sumber daya alam hayati dan ekosistemnya di wilayah kerja Balai KSDA Kalimantan Timur untuk periode Triwulan III Tahun 2026, bersama ini kami sampaikan petunjuk pelaksanaan kegiatan sebagaimana terlampir.",
          "Diharapkan kepada seluruh unit kerja untuk memedomani arahan teknis serta meningkatkan intensitas patroli pengamanan kawasan secara terpadu bersama masyarakat mitra.",
          "Demikian nota dinas ini disampaikan untuk dipedomani dan dilaksanakan dengan penuh rasa tanggung jawab.",
        ],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [{ id: "1", text: "Kepala Seksi KSDA Wilayah I Berau" }],
      };

    case "undangan":
      return {
        templateType: "undangan",
        nomor,
        kotaTanggal: baseDate,
        sifat: "Penting",
        lampiran: "1 (satu) Berkas Jadwal",
        perihal: "Undangan Rapat Koordinasi Penanganan Konflik Satwa Liar dan Pengamanan Kawasan Konservasi",
        tujuanKepada: "Para Pejabat Struktural dan Kepala SKW I, II, III",
        tujuanDi: "Samarinda",
        paragraf: [
          "Dalam rangka evaluasi penanganan mitigasi interaksi negatif manusia dan satwa liar serta penyusunan rencana aksi pengamanan kawasan konservasi terpadu menjelang akhir tahun anggaran 2026, dengan hormat mengharap kehadiran Saudara pada rapat koordinasi yang akan dilaksanakan pada:",
          "Mengingat pentingnya agenda rapat ini, dimohon kehadiran tepat waktu dan tidak diwakilkan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.",
        ],
        acaraHariTanggal: "Senin, 05 Oktober 2026",
        acaraWaktu: "09.00 WITA s.d. Selesai",
        acaraTempat: "Ruang Rapat Cendrawasih Balai KSDA Kaltim, Jl. Teuku Umar No. 53 Samarinda",
        acaraNama: "Rapat Koordinasi Penanganan Konflik Satwa Liar dan Pengamanan Kawasan Konservasi",
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [{ id: "1", text: "Kepala Seksi KSDA Wilayah I Berau" }],
      };

    case "memorandum":
      return {
        templateType: "memorandum",
        nomor,
        kotaTanggal: baseDate,
        sifat: "Biasa",
        lampiran: "-",
        perihal: "Permohonan Data Realisasi Anggaran dan Fisik Pengadaan Sarana Konservasi Triwulan III",
        yth: "Kepala Subbagian Tata Usaha",
        dari: DEFAULT_KEPALA_BALAI.jabatanLengkap,
        paragraf: [
          "Guna keperluan sinkronisasi penyusunan laporan capaian kinerja triwulanan dan evaluasi program prioritas penanganan keanekaragaman hayati, kami mohon bantuan data rekonsiliasi realisasi anggaran serta bukti fisik pengadaan sarpras SMART patrol.",
          "Data dimaksud kiranya dapat disampaikan kepada kami paling lambat hari Jumat tanggal 02 Oktober 2026 melalui surat elektronik resmi BKSDA.",
          "Demikian memorandum ini kami sampaikan, atas bantuan dan kerjasamanya diucapkan terima kasih.",
        ],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [{ id: "1", text: "Kepala Seksi KSDA Wilayah I Berau" }],
      };

    case "surat_pengantar":
      return {
        templateType: "surat_pengantar",
        nomor,
        kotaTanggal: baseDate,
        perihal: "Surat Pengantar Pengiriman Berkas Laporan Keuangan",
        tujuanKepada: "Kepala Kantor Pelayanan Perbendaharaan Negara (KPPN) Samarinda",
        tujuanDi: "Samarinda",
        tabelPengantar: [
          { no: 1, naskah: "Laporan Pertanggungjawaban (LPJ) Bendahara Penerimaan Bulan Agustus 2026", banyaknya: "1 (satu) Berkas", keterangan: "Disampaikan dengan hormat untuk diperiksa dan disahkan." },
          { no: 2, naskah: "Rekapitulasi Setoran PNBP Pemanfaatan Jasa Lingkungan Wisata Alam", banyaknya: "1 (satu) Berkas", keterangan: "Sebagai bahan rekonsiliasi penerimaan negara." },
          { no: 3, naskah: "Rekening Koran Operasional Bendahara Penerimaan BKSDA Kaltim", banyaknya: "1 (satu) Lembar Asli", keterangan: "Lampiran verifikasi mutasi bank." },
        ],
        penerimaPengantar: {
          nama: "...........................................",
          nip: "...........................................",
          jabatan: "Petugas Front Office KPPN Samarinda,",
          telepon: "(0541) 741234",
        },
        paragraf: [],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [],
      };

    case "surat_keterangan":
      return {
        templateType: "surat_keterangan",
        nomor,
        kotaTanggal: baseDate,
        perihal: "Surat Keterangan Aktif Bekerja",
        pejabatMenerangkan: {
          nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
          nip: "19740514 199903 1 001",
          jabatan: "Kepala Balai Konservasi Sumber Daya Alam Kalimantan Timur",
        },
        pegawaiDiterangkan: {
          nama: "ANDI SETIAWAN, S.Hut.",
          nip: "19880425 201402 1 003",
          pangkatGol: "Penata Muda Tk. I (III/b)",
          jabatan: "Pengendali Ekosistem Hutan Ahli Pertama",
        },
        paragraf: [
          "Dengan ini menerangkan dengan sesungguhnya bahwa yang bersangkutan adalah benar berstatus sebagai Pegawai Negeri Sipil (PNS) yang aktif bekerja pada Balai Konservasi Sumber Daya Alam Kalimantan Timur sejak tanggal 01 Februari 2014 sampai dengan sekarang dan senantiasa melaksanakan tugas kedinasan dengan penuh tanggung jawab dan berdedikasi tinggi.",
          "Surat keterangan ini diberikan kepada yang bersangkutan untuk keperluan kelengkapan administrasi pengusulan program beasiswa tugas belajar jenjang pascasarjana (S2).",
          "Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "berita_acara":
      return {
        templateType: "berita_acara",
        nomor,
        kotaTanggal: baseDate,
        perihal: "Berita Acara Serah Terima Barang Milik Negara",
        hariTanggalAcara: "Kamis, tanggal dua puluh empat bulan September tahun dua ribu dua puluh enam (24-09-2026)",
        lokasiDibuat: "Samarinda",
        pihakPertama: {
          nama: "HERI SUSANTO, S.Sos.",
          nip: "19790815 200604 1 007",
          jabatan: "Pengurus Barang Pengguna BKSDA Kaltim",
        },
        pihakKedua: {
          nama: "BAMBANG SUDARMONO, S.Hut.",
          nip: "19850311 201012 1 002",
          jabatan: "Kepala Resort Konservasi Wilayah Kutai Barat",
          instansi: "Seksi Konservasi Wilayah II Tenggarong",
        },
        poinBeritaAcara: [
          "PIHAK PERTAMA telah menyerahkan kepada PIHAK KEDUA dan PIHAK KEDUA telah menerima dari PIHAK PERTAMA berupa 5 (lima) unit GPS Garmin 65s dan 10 (sepuluh) unit Kamera Trap Bushnell dalam kondisi baik dan lengkap.",
          "Peralatan tersebut diserahterimakan untuk dipergunakan sebagai sarana inventarisasi keanekaragaman hayati dan patroli SMART di kawasan Suaka Margasatwa Kelian.",
          "Sejak penandatanganan berita acara ini, tanggung jawab pemeliharaan dan pengamanan fisik barang beralih sepenuhnya kepada PIHAK KEDUA sesuai ketentuan BMN yang berlaku.",
        ],
        paragraf: [
          "Demikian Berita Acara ini dibuat dalam rangkap 2 (dua) bermaterai cukup dan memiliki kekuatan hukum yang sama bagi kedua belah pihak.",
        ],
        jabatanPenandatangan: "Kepala Balai BKSDA Kaltim,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "pengumuman":
      return {
        templateType: "pengumuman",
        nomor,
        kotaTanggal: baseDate,
        judulPengumuman: "PENUTUPAN SEMENTARA AKTIVITAS KUNJUNGAN WISATA ALAM DAN PENELITIAN DI KAWASAN SUAKA MARGASATWA KELIAN",
        perihal: "Penutupan Sementara Kunjungan Wisata Alam SM Kelian",
        paragraf: [
          "Berdasarkan hasil pemantauan cuaca ekstrem dari Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) Stasiun Meteorologi Kelas I Sultan Aji Muhammad Sulaiman Sepinggan Balikpapan serta pertimbangan keselamatan pengunjung terhadap potensi pohon tumbang dan luapan debit air sungai,",
          "Dengan ini diumumkan kepada seluruh masyarakat, penggiat wisata alam, lembaga penelitian, dan para pihak terkait bahwa aktivitas kunjungan wisata alam dan penelitian di seluruh kawasan Suaka Margasatwa (SM) Kelian DITUTUP SEMENTARA terhitung mulai tanggal 26 September 2026 sampai dengan 10 Oktober 2026.",
          "Pembukaan kembali akses kunjungan kawasan akan diinformasikan kemudian setelah evaluasi kondisi cuaca dan keamanan jalur patroli dinyatakan kondusif oleh petugas pos lapangan.",
          "Demikian pengumuman ini disampaikan untuk diketahui dan dipedomani oleh seluruh pihak yang berkepentingan.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "surat_pernyataan":
      return {
        templateType: "surat_pernyataan",
        nomor,
        kotaTanggal: baseDate,
        subjekPernyataan: "MELAKSANAKAN TUGAS KEDINASAN",
        perihal: "Surat Pernyataan Melaksanakan Tugas Kedinasan",
        pejabatMenerangkan: {
          nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
          nip: "19740514 199903 1 001",
          pangkatGol: "Pembina Tk. I (IV/b)",
          jabatan: "Kepala Balai KSDA Kalimantan Timur",
        },
        pegawaiDiterangkan: {
          nama: "HENDRA WIJAYA, S.Hut.",
          nip: "19920718 201801 1 002",
          pangkatGol: "Penata Muda (III/a)",
          jabatan: "Polisi Kehutanan Ahli Pertama",
        },
        paragraf: [
          "Dengan ini menyatakan dengan sesungguhnya, bahwa Pegawai Negeri Sipil tersebut di atas secara nyata telah melaksanakan tugas kedinasan sebagai Polisi Kehutanan Ahli Pertama pada Seksi Konservasi Wilayah III Berau Balai KSDA Kalimantan Timur terhitung mulai tanggal 01 September 2026.",
          "Surat Pernyataan ini dibuat dengan sesungguhnya dan apabila di kemudian hari isi pernyataan ini tidak benar yang mengakibatkan kerugian terhadap Negara, saya bersedia menanggung kerugian tersebut sesuai ketentuan peraturan perundang-undangan.",
          "Demikian surat pernyataan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [{ id: "1", text: "Kepala Seksi KSDA Wilayah I Berau" }],
      };

    case "surat_kuasa":
      return {
        templateType: "surat_kuasa",
        nomor,
        kotaTanggal: baseDate,
        perihal: "Surat Kuasa Pengambilan Kendaraan Dinas Operasional",
        pemberiKuasa: {
          nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
          nip: "19740514 199903 1 001",
          jabatan: "Kepala Balai KSDA Kalimantan Timur",
          alamat: "Jl. Teuku Umar No. 53 Samarinda",
        },
        penerimaKuasa: {
          nama: "WAHYU HIDAYAT, A.Md.",
          nip: "19890510 201212 1 001",
          jabatan: "Pengadministrasi Umum BKSDA Kaltim",
          alamat: "Jl. Pangeran Antasari No. 12 Samarinda",
        },
        materiKuasa: "Untuk mewakili Pemberi Kuasa mengambil 1 (satu) unit Kendaraan Dinas Roda 4 Toyota Hilux Double Cabin Nomor Polisi KT 8123 BZ beserta kelengkapan surat STNK dan BPKB dari Bengkel Resmi Auto2000 Samarinda.",
        paragraf: [
          "Surat Kuasa ini dibuat dan ditandatangani untuk dipergunakan sebagaimana mestinya dan berlaku sampai dengan selesainya pengambilan kendaraan dinas tersebut.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "surat_izin":
      return {
        templateType: "surat_izin",
        nomor,
        kotaTanggal: baseDate,
        perihal: "Surat Izin Memasuki Kawasan Konservasi (SIMAKSI)",
        pejabatMenerangkan: {
          nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
          nip: "19740514 199903 1 001",
          pangkatGol: "Pembina Tk. I (IV/b)",
          jabatan: "Kepala Balai KSDA Kalimantan Timur",
        },
        pegawaiDiterangkan: {
          nama: "DR. FITRIANI KUSUMA, M.Si.",
          nip: "19830911 200804 2 001",
          pangkatGol: "Lektor Kepala / Peneliti",
          jabatan: "Ketua Tim Riset Konservasi Primata Universitas Mulawarman",
        },
        paragraf: [
          "Memberikan izin kepada peneliti tersebut di atas bersama 3 (tiga) orang anggota tim untuk memasuki kawasan Cagar Alam Teluk Adang guna melaksanakan kegiatan riset ilmiah bertajuk 'Kajian Populasi Bekantan (Nasalis larvatus) dan Dinamika Habitat Mangrove' terhitung mulai tanggal 01 Oktober 2026 s.d. 15 Oktober 2026.",
          "Pemegang izin diwajibkan melapor kepada Kepala Resort Konservasi Wilayah Paser, mematuhi SOP perlindungan satwa, tidak merusak flora/fauna, serta menyerahkan 1 (satu) eksemplar laporan hasil penelitian kepada Balai KSDA Kaltim.",
          "Demikian Surat Izin ini diberikan untuk dapat dipergunakan sebagaimana mestinya.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [{ id: "1", text: "Kepala Seksi KSDA Wilayah I Berau" }],
      };

    case "surat_panggilan":
      return {
        templateType: "surat_panggilan",
        nomor,
        kotaTanggal: baseDate,
        perihal: "Surat Panggilan Klarifikasi Kedinasan",
        pegawaiDiterangkan: {
          nama: "RUDI HARTONO, A.Md.",
          nip: "19901115 201503 1 002",
          pangkatGol: "Pengatur Tk. I (II/d)",
          jabatan: "Polisi Kehutanan Terampil",
          unit: "Resort Konservasi Wilayah Berau",
        },
        pejabatMenerangkan: {
          nama: DEFAULT_KEPALA_BALAI.nama,
          nip: DEFAULT_KEPALA_BALAI.nip,
          pangkatGol: DEFAULT_KEPALA_BALAI.pangkatGol,
          jabatan: DEFAULT_KEPALA_BALAI.jabatanLengkap,
        },
        acaraHariTanggal: "Rabu, 07 Oktober 2026",
        acaraWaktu: "10.00 WITA",
        acaraTempat: "Ruang Rapat Kepala Balai KSDA Kaltim, Jl. Teuku Umar No. 53 Samarinda",
        keperluanPanggilan: "Klarifikasi dan pembinaan disiplin pegawai terkait pemenuhan target kehadiran finger scan dan laporan log harian patroli pengamanan kawasan bulan Agustus 2026.",
        paragraf: [
          "Mengingat pentingnya agenda pemeriksaan kedinasan ini, kehadiran Saudara bersifat wajib dan tidak dapat diwakilkan.",
          "Demikian surat panggilan ini disampaikan untuk ditaati dan dilaksanakan sebagaimana mestinya.",
        ],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [{ id: "1", text: "Kepala Seksi KSDA Wilayah I Berau" }],
      };

    case "surat_edaran":
      return {
        templateType: "surat_edaran",
        nomor,
        kotaTanggal: baseDate,
        judulEdaran: "PENINGKATAN KEWASPADAAN DAN MITIGASI INTERAKSI NEGATIF MANUSIA DENGAN BUAYA MUARA DI PERAIRAN KALIMANTAN TIMUR",
        tujuanKepada: "1. Para Kepala Seksi Konservasi Wilayah I, II, dan III\n2. Para Kepala Resort KSDA se-Kalimantan Timur\n3. Mitra Lembaga Konservasi dan Satgas Konflik Satwa",
        paragraf: [
          "A. Latar Belakang: Bahwa intensitas perjumpaan satwa liar jenis Buaya Muara (Crocodylus porosus) di wilayah pemukiman pesisir dan muara sungai Kalimantan Timur menunjukkan tren peningkatan yang membutuhkan langkah antisipasi terpadu.",
          "B. Maksud dan Tujuan: Memberikan panduan standar mitigasi keselamatan bagi masyarakat dan respon cepat penanganan satwa liar sesuai koridor konservasi.",
          "C. Ruang Lingkup: Pemasangan papan peringatan dini rawan satwa, patroli sosialisasi warga bantaran sungai, dan koordinasi dengan BPBD serta aparat desa.",
          "D. Penutup: Demikian Surat Edaran ini dikeluarkan untuk menjadi pedoman dan dilaksanakan dengan penuh rasa tanggung jawab.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "instruksi":
      return {
        templateType: "instruksi",
        nomor,
        kotaTanggal: baseDate,
        judulInstruksi: "PELAKSANAAN PATROLI PENGAMANAN INTENSIF KAWASAN SUAKA MARGASATWA KELIAN DAN PENERTIBAN TAMBANG TANPA IZIN",
        instruksiKepada: [
          "Kepala Seksi Konservasi Wilayah II Tenggarong",
          "Komandan Satuan Tugas Polisi Kehutanan Balai KSDA Kaltim",
          "Kepala Resort Konservasi Wilayah Kutai Barat",
        ],
        diktumKeputusan: [
          { diktum: "KESATU", isi: "Melakukan patroli sapu jerat dan pemantauan perbatasan Suaka Margasatwa Kelian secara berkala dengan sistem SMART Patrol." },
          { diktum: "KEDUA", isi: "Berkoordinasi dengan aparat penegak hukum dan pemerintah daerah guna penegakan hukum terhadap aktivitas ilegal di zona inti kawasan." },
          { diktum: "KETIGA", isi: "Melaporkan hasil pelaksanaan instruksi ini kepada Kepala Balai secara tertulis setiap 2 (dua) minggu sekali." },
        ],
        paragraf: [
          "Instruksi ini mulai berlaku sejak tanggal ditetapkan dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diperbaiki sebagaimana mestinya.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "keputusan":
      return {
        templateType: "keputusan",
        nomor,
        kotaTanggal: baseDate,
        judulKeputusan: "PEMBENTUKAN TIM RESIAGA RESPON CEPAT KONFLIK SATWA LIAR BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR TAHUN 2026",
        konsideransMenimbang: [
          "bahwa dalam rangka meningkatkan efektivitas penanganan konflik satwa liar dan manusia di wilayah kerja BKSDA Kaltim diperlukan tim kerja yang responsif dan terpadu;",
          "bahwa berdasarkan pertimbangan sebagaimana dimaksud pada huruf a, perlu menetapkan Keputusan Kepala Balai KSDA Kalimantan Timur;",
        ],
        konsideransMengingat: [
          "Undang-Undang Nomor 5 Tahun 1990 tentang Konservasi Sumber Daya Alam Hayati dan Ekosistemnya;",
          "Peraturan Menteri Kehutanan Nomor 1 Tahun 2025 tentang Tata Naskah Dinas Kementerian Kehutanan;",
        ],
        diktumKeputusan: [
          { diktum: "KESATU", isi: "Membentuk Tim Resiaga Respon Cepat Konflik Satwa Liar Balai KSDA Kalimantan Timur dengan susunan keanggotaan sebagaimana tercantum dalam lampiran keputusan ini." },
          { diktum: "KEDUA", isi: "Tim bertugas melakukan evakuasi, translokasi, medis satwa, serta sosialisasi penanganan satwa liar kepada masyarakat." },
          { diktum: "KETIGA", isi: "Segala biaya yang timbul akibat diterbitkannya Keputusan ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Tahun Anggaran 2026." },
          { diktum: "KEEMPAT", isi: "Keputusan ini berlaku sejak tanggal ditetapkan." },
        ],
        paragraf: [],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "telaah_staf":
      return {
        templateType: "telaah_staf",
        nomor,
        kotaTanggal: baseDate,
        judulTelaah: "OPTIMALISASI PATROLI PARTISIPATIF MASYARAKAT MITRA POLHUT DI WILAYAH KERJA SKW II TENGGARONG",
        sectionTelaah: {
          persoalan: "Keterbatasan jumlah personel polisi kehutanan di SKW II seluas lebih dari 200.000 Ha memerlukan penguatan kelembagaan Masyarakat Mitra Polhut (MMP) berbasis desa penyangga.",
          praanggapan: "Pemberdayaan warga lokal melalui insentif operasional dan pelatihan SMART Mobile terbukti menurunkan angka perambahan hutan secara signifikan di wilayah pilot project.",
          fakta: "Terdapat 4 kelompok MMP aktif di sekitar Suaka Margasatwa Kelian yang telah memiliki SK Kepala Desa namun belum didukung sarana komunikasi radio dan GPS lapangan yang memadai.",
          analisis: "Pengalokasian pos operasional patroli kolaboratif pada DIPA 2027 dapat mengakomodasi pengadaan 15 unit smartphone tangguh dan modul pelatihan lapangan.",
          kesimpulan: "Kemitraan konservasi dengan masyarakat desa sekitar kawasan merupakan instrumen paling efektif dan efisien guna menjamin pengamanan batas kawasan.",
          saran: "Disarankan Kepala Balai menyetujui usulan penambahan alokasi anggaran pembinaan MMP pada Rencana Kerja dan Anggaran (RKA-K/L) TA 2027.",
        },
        paragraf: [],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [],
      };

    case "laporan":
      return {
        templateType: "laporan",
        nomor,
        kotaTanggal: baseDate,
        judulLaporan: "LAPORAN PELAKSANAAN INVENTARISASI POPULASI ORANGUTAN KALIMANTAN (PONGO PYGMAEUS) DI CAGAR ALAM PADANG LUWAY TAHUN 2026",
        sectionLaporan: {
          pendahuluan: "Kegiatan inventarisasi keanekaragaman hayati dilaksanakan berdasarkan DIPA Balai KSDA Kalimantan Timur TA 2026 dengan maksud memperoleh data sebaran sarang dan populasi terkini Orangutan Kalimantan.",
          kegiatan: "Survei jalur transek sepanjang 12 km dilakukan selama 10 hari kerja oleh tim gabungan PEH, Polhut, dan akademisi Fakultas Kehutanan UNMUL.",
          hasil: "Ditemukan sebanyak 24 sarang aktif dan 6 perjumpaan langsung individu orangutan dewasa serta anakan, menunjukkan status populasi yang stabil.",
          kesimpulan: "Kondisi tegakan pakan di CA Padang Luway masih sangat mendukung daya dukung habitat, disarankan pemeliharaan rutin tanda batas zonasi.",
        },
        paragraf: [
          "Demikian laporan ini dibuat sebagai bentuk pertanggungjawaban pelaksanaan tugas kedinasan dan bahan perumusan kebijakan teknis pengelolaan cagar alam.",
        ],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [],
      };

    case "perjanjian":
      return {
        templateType: "perjanjian",
        nomor,
        kotaTanggal: baseDate,
        judulPerjanjian: "PERJANJIAN KERJA SAMA ANTARA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR DENGAN ALIANSI LESTARI RIMBA TERPADU (ALERT) TENTANG PENGUATAN FUNGSI KONSERVASI SUAKA MARGASATWA KELIAN",
        hariTanggalAcara: "Jumat, tanggal dua puluh lima bulan September tahun dua ribu dua puluh enam (25-09-2026)",
        lokasiDibuat: "Samarinda",
        pihakPertama: {
          nama: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
          nip: "19740514 199903 1 001",
          jabatan: "Kepala Balai KSDA Kalimantan Timur, bertindak untuk dan atas nama Balai KSDA Kalimantan Timur",
          alamat: "Jl. Teuku Umar No. 53 Samarinda",
        },
        pihakKedua: {
          nama: "DR. INDRA HERMAWAN",
          jabatan: "Direktur Eksekutif Aliansi Lestari Rimba Terpadu (ALeRT), bertindak untuk dan atas nama ALeRT Indonesia",
          alamat: "Jl. Raya Pajajaran No. 88 Bogor",
        },
        paragraf: [
          "PASAL 1: MAKSUD DAN TUJUAN\nPerjanjian Kerja Sama ini dimaksudkan untuk mengoptimalkan pengelolaan kawasan Suaka Margasatwa Kelian melalui penguatan kapasitas patroli SMART, restorasi habitat, dan monitoring badak kalimantan.",
          "PASAL 2: RUANG LINGKUP\nRuang lingkup kerja sama meliputi pengamanan kawasan, riset ekologi satwa target, pemberdayaan masyarakat desa penyangga, dan penyediaan sarana lapangan penunjang.",
          "PASAL 3: JANGKA WAKTU\nPerjanjian ini berlaku untuk jangka waktu 5 (lima) tahun terhitung sejak tanggal ditandatangani dan dapat diperpanjang atas kesepakatan kedua belah pihak.",
          "Demikian Perjanjian Kerja Sama ini dibuat dalam rangkap 2 (dua) asli bermaterai cukup dan memiliki kekuatan hukum yang mengikat bagi kedua belah pihak.",
        ],
        jabatanPenandatangan: "Kepala Balai,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "piagam":
      return {
        templateType: "piagam",
        nomor,
        kotaTanggal: baseDate,
        diberikanKepada: "DESA PENYANGGA MERABU, KABUPATEN BERAU",
        atasPeran: "Kemitraan dan Konsistensi Masyarakat Hukum Adat dalam Melestarikan Hutan Konservasi dan Perlindungan Satwa Liar Dilindungi di Kawasan Karst Sangkulirang-Mangkalihat",
        paragraf: [
          "Sebagai wujud apresiasi atas integritas, komitmen, dan kontribusi nyata dalam menjaga keanekaragaman hayati dan ekosistem bentang alam Kalimantan Timur.",
        ],
        jabatanPenandatangan: "Kepala Balai KSDA Kalimantan Timur,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "sertifikat":
      return {
        templateType: "sertifikat",
        nomor,
        kotaTanggal: baseDate,
        diberikanKepada: "BAYU ADITYA NUGROHO",
        atasPeran: "Peserta Bimbingan Teknis Pengoperasian Aplikasi SMART Patrol Mobile Versi 7.5 dan Penanganan Konflik Satwa Liar",
        paragraf: [
          "Yang diselenggarakan oleh Balai Konservasi Sumber Daya Alam Kalimantan Timur pada tanggal 22 sampai dengan 24 September 2026 bertempat di Samarinda dengan predikat SANGAT BAIK.",
        ],
        jabatanPenandatangan: "Kepala Balai KSDA Kalimantan Timur,",
        namaPenandatangan: "M. ARI WIBAWANTO, S.Hut., M.Sc.",
        nipPenandatangan: "19740514 199903 1 001",
        tembusan: [],
      };

    case "surat_dinas":
    default:
      return DEFAULT_SURAT_DINAS_DATA;
  }
}

interface SuratDinasDocumentProps {
  data: SuratDinasData;
  onUpdateField?: (field: keyof SuratDinasData, value: any) => void;
}

export const SURAT_DINAS_BASE_CSS = `
  @page { size: A4 portrait; margin: 0 0 20mm 0; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; background: #fff; }
  h1, h2, h3, h4, p { margin: 0; padding: 0; }
  .pkpknl-page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 4mm 20mm 20mm 25mm; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #000; }
  .pkpknl-kop { margin-top: 0; margin-left: -25mm; margin-right: -20mm; margin-bottom: 6px; text-align: center; }
  .pkpknl-kop img { width: 196mm !important; max-width: 196mm !important; height: auto !important; display: block; margin: 0 auto; }
  .pkpknl-meta-container { width: 100%; margin: 14px 0 0; line-height: 1.5; }
  .pkpknl-meta-row { width: 100%; margin: 0; display: flex; align-items: baseline; justify-content: space-between; gap: 6mm; line-height: 1.5; }
  .pkpknl-meta-field { display: flex; align-items: baseline; min-width: 0; line-height: 1.5; }
  .pkpknl-meta-label { width: 21mm; flex-shrink: 0; }
  .pkpknl-meta-colon { width: 4mm; text-align: center; flex-shrink: 0; }
  .pkpknl-meta-nomor { white-space: pre !important; }
  .pkpknl-meta-nomor-long { font-size: 10pt !important; letter-spacing: -0.2px; }
  .pkpknl-meta-nomor-extra-long { font-size: 9.5pt !important; letter-spacing: -0.3px; }
  .pkpknl-meta-tanggal { text-align: right; white-space: nowrap; flex-shrink: 0; margin-left: auto; line-height: 1.5; }
  .pkpknl-perihal-full { width: 100%; margin: 0; display: flex; align-items: baseline; line-height: 1.5; }
  .pkpknl-perihal-content { flex: 1; min-width: 0; text-align: justify; text-justify: inter-word; line-height: 1.5; }
  .pkpknl-yth { width: 100%; margin: 18px 0 0; line-height: 1.4; }
  .pkpknl-yth p { margin: 0; }
  .pkpknl-yth-tempat { padding-left: 1.25rem; }
  .pkpknl-body { width: 100%; margin: 14px 0 0; text-align: justify; text-justify: inter-word; }
  .pkpknl-body p { margin-bottom: 0.85rem; text-indent: 2.5em; line-height: 1.5; }
  .penutup-ttd-group { display: block !important; break-inside: avoid !important; page-break-inside: avoid !important; }
  .pkpknl-ttd { width: 20rem; margin: 1.5rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-ttd p { margin: 0; padding: 0; line-height: 1.15; }
  .pkpknl-ttd .pkpknl-ttd-placeholder { box-sizing: border-box; height: 105px; display: flex; align-items: flex-start; text-align: left; padding-top: 34px; padding-left: 1.35cm; margin-top: 14px; margin-bottom: 0; color: #94a3b8; font-size: 9pt; }
  .pkpknl-ttd .pkpknl-ttd-name { font-weight: bold; }
  .pkpknl-tembusan { width: 100%; margin: 1.2rem 0 0; font-size: 10pt; }
  .pkpknl-tembusan-title { font-weight: normal; margin-bottom: 0.2rem; }
  .pkpknl-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); line-height: 1.4; }
  .pkpknl-tembusan-item.single-item { display: block; }
  table.pengantar-table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  table.pengantar-table th, table.pengantar-table td { border: 1px solid #000; padding: 6px 8px; font-size: 10.5pt; text-align: left; vertical-align: top; }
`;

export function handlePrintSuratDinas() {
  const printContent = document.getElementById("surat-dinas-print-root");
  if (!printContent) {
    toast.error("Tidak ada dokumen naskah dinas untuk dicetak.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Gagal membuka jendela cetak. Pastikan pop-up diizinkan.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Naskah Dinas Resmi Permen Kehutanan</title>
        <style>
          ${SURAT_DINAS_BASE_CSS}
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

function SuratDinasDocumentComponent({ data, onUpdateField }: SuratDinasDocumentProps) {
  const currentTemplate = data.templateType || "surat_dinas";

  const {
    nomor,
    sifat,
    lampiran,
    perihal,
    kotaTanggal,
    tujuanKepada,
    tujuanDi,
    paragraf,
    jabatanPenandatangan,
    namaPenandatangan,
    nipPenandatangan,
    tembusan,
    yth,
    dari,
    acaraHariTanggal,
    acaraWaktu,
    acaraTempat,
    acaraNama,
    keperluanPanggilan,
    tabelPengantar,
    penerimaPengantar,
    subjekPernyataan,
    pejabatMenerangkan,
    pegawaiDiterangkan,
    pemberiKuasa,
    penerimaKuasa,
    materiKuasa,
    hariTanggalAcara,
    pihakPertama,
    pihakKedua,
    pihakKetiga,
    signerCount,
    poinBeritaAcara,
    lokasiDibuat,
    judulPengumuman,
    judulEdaran,
    judulInstruksi,
    judulKeputusan,
    judulTelaah,
    judulLaporan,
    judulPerjanjian,
    konsideransMenimbang,
    konsideransMengingat,
    instruksiKepada,
    diktumKeputusan,
    sectionTelaah,
    sectionLaporan,
    diberikanKepada,
    atasPeran,
  } = data;

  const nomorText = nomor !== undefined && nomor !== null && nomor !== "" ? nomor : getDefaultNomorForTemplate(currentTemplate);
  const nomorClass = nomorText.length > 52
    ? "pkpknl-meta-nomor-extra-long"
    : nomorText.length > 40
      ? "pkpknl-meta-nomor-long"
      : "";

  const cleanTujuanDi = (tujuanDi || "Kutai Barat").replace(/^di\s*[-–—]?\s*/i, "") || "Kutai Barat";

  return (
    <div id="surat-dinas-print-root" className="surat-dinas-print-root font-sans text-[11pt]">
      <style jsx global>{`
        ${SURAT_DINAS_BASE_CSS}
        .surat-dinas-print-root .pkpknl-edit { outline: none; transition: background-color 0.2s; border-radius: 2px; }
        .surat-dinas-print-root .pkpknl-edit:hover { background-color: rgba(243, 244, 246, 0.7); }
        .surat-dinas-print-root .pkpknl-edit:focus { background-color: rgba(224, 242, 254, 0.8); }

        @media print {
          @page { size: A4 portrait; margin: 0 0 20mm 0; }
          body * { visibility: hidden; }
          .surat-dinas-print-root, .surat-dinas-print-root * { visibility: visible; }
          .surat-dinas-print-root { position: absolute; left: 0; top: 0; width: 100%; background: white; color: black; }
          .pkpknl-page { box-shadow: none !important; padding: 4mm 20mm 20mm 25mm !important; border: none !important; }
          .pkpknl-kop { margin-top: 0 !important; margin-left: -25mm !important; margin-right: -20mm !important; }
          .pkpknl-edit { background: none !important; }
          .pkpknl-meta-nomor { white-space: pre !important; }
          .pkpknl-meta-nomor-long { font-size: 10pt !important; letter-spacing: -0.2px; }
          .pkpknl-meta-nomor-extra-long { font-size: 9.5pt !important; letter-spacing: -0.3px; }
          .penutup-ttd-group { display: block !important; break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* ─── Halaman 1: Dokumen Naskah Dinas (A4 Portrait) ─────────────────────── */}
      <article
        className="pkpknl-page mx-auto max-w-[210mm] bg-white pt-4 pb-9 text-black shadow-xl ring-1 ring-zinc-200 rounded-sm"
        style={{ padding: "4mm 20mm 20mm 25mm" }}
      >
        {/* Kop Surat Kementerian Kehutanan & BKSDA Kaltim (Kecuali Sertifikat/Piagam yang memiliki layout tersendiri) */}
        <div className="pkpknl-kop text-center" style={{ marginLeft: "-25mm", marginRight: "-20mm" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/header-paling-baru.png"
            alt="Kop Surat"
            style={{ width: "196mm", maxWidth: "196mm", height: "auto", display: "block", margin: "0 auto" }}
          />
        </div>

        {/* ─── 1. NOTA DINAS & MEMORANDUM (Permen 1/2025 Hal 39 & 42) ──────── */}
        {(currentTemplate === "nota_dinas" || currentTemplate === "memorandum") && (
          <div className="w-full mt-4">
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                {currentTemplate === "nota_dinas" ? "NOTA DINAS" : "MEMORANDUM"}
              </h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5">
                NOMOR :{" "}
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit"
                  onBlur={(e) => onUpdateField?.("nomor", e.currentTarget.innerText)}
                >
                  {nomorText}
                </span>
              </p>
            </div>

            <div className="pb-2 mb-4 space-y-1 text-[11pt]">
              <div className="flex items-baseline">
                <span className="w-24 shrink-0 font-normal">Yth.</span>
                <span className="w-4 text-center shrink-0">:</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit flex-1"
                  onBlur={(e) => onUpdateField?.("yth", e.currentTarget.innerText)}
                >
                  {yth}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 shrink-0 font-normal">Dari</span>
                <span className="w-4 text-center shrink-0">:</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit flex-1"
                  onBlur={(e) => onUpdateField?.("dari", e.currentTarget.innerText)}
                >
                  {dari}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 shrink-0 font-normal">Hal</span>
                <span className="w-4 text-center shrink-0">:</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit flex-1 font-normal"
                  onBlur={(e) => onUpdateField?.("perihal", e.currentTarget.innerText)}
                >
                  {perihal}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 shrink-0 font-normal">Lampiran</span>
                <span className="w-4 text-center shrink-0">:</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit flex-1"
                  onBlur={(e) => onUpdateField?.("lampiran", e.currentTarget.innerText)}
                >
                  {lampiran || "-"}
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="w-24 shrink-0 font-normal">Tanggal</span>
                <span className="w-4 text-center shrink-0">:</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit flex-1"
                  onBlur={(e) => onUpdateField?.("kotaTanggal", e.currentTarget.innerText)}
                >
                  {kotaTanggal}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. SURAT PENGANTAR (Permen 1/2025 Hal 66-67) ───────────────── */}
        {currentTemplate === "surat_pengantar" && (
          <div className="w-full mt-4">
            <div className="flex justify-between items-baseline mb-3">
              <div>
                <span>Nomor : </span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit font-normal"
                  onBlur={(e) => onUpdateField?.("nomor", e.currentTarget.innerText)}
                >
                  {nomorText}
                </span>
              </div>
              <div>{kotaTanggal}</div>
            </div>

            <div className="mb-4">
              <p>Yth. {tujuanKepada}</p>
              <p className="pl-6">di {cleanTujuanDi}</p>
            </div>

            <div className="text-center my-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider">SURAT PENGANTAR</h2>
            </div>

            <table className="w-full border-collapse border border-black my-4 text-xs">
              <thead>
                <tr className="bg-zinc-100 text-center font-bold">
                  <th className="border border-black p-2 w-10">No.</th>
                  <th className="border border-black p-2">Naskah Dinas Yang Dikirimkan</th>
                  <th className="border border-black p-2 w-32">Banyaknya</th>
                  <th className="border border-black p-2 w-44">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {(tabelPengantar || []).map((row, rIdx) => (
                  <tr key={rIdx}>
                    <td className="border border-black p-2 text-center">{row.no || rIdx + 1}</td>
                    <td className="border border-black p-2">{row.naskah}</td>
                    <td className="border border-black p-2 text-center">{row.banyaknya}</td>
                    <td className="border border-black p-2">{row.keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-6 mt-6 text-center text-xs">
              <div>
                <p>Diterima tanggal: ....................</p>
                <p className="font-normal mt-1">Penerima,</p>
                <p className="font-normal">{penerimaPengantar?.jabatan || "Petugas Penerima,"}</p>
                <div className="pkpknl-ttd-placeholder pkpknl-edit flex items-center justify-center text-zinc-400 italic mx-auto" style={{ height: "105px" }}>
                  {penerimaPengantar?.partyType === "internal" ? "${ttd_pengirim}" : "${ttd_penerima}"}
                </div>
                <p className="font-bold">{penerimaPengantar?.nama || "..........................................."}</p>
                <p>{(penerimaPengantar?.idType === "NIK" ? "NIK. " : "NIP. ") + (penerimaPengantar?.nip || "...........................................")}</p>
              </div>
              <div>
                <p>&nbsp;</p>
                <p className="font-normal mt-1">Pengirim,</p>
                <p className="font-normal">{jabatanPenandatangan || DEFAULT_KEPALA_BALAI.jabatan}</p>
                <div className="pkpknl-ttd-placeholder pkpknl-edit flex items-center justify-center text-zinc-400 italic mx-auto" style={{ height: "105px" }}>
                  {"${ttd_pengirim}"}
                </div>
                <p className="font-bold">{namaPenandatangan || DEFAULT_KEPALA_BALAI.nama}</p>
                <p>NIP. {nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── 3. SURAT PERNYATAAN (Permen 1/2025 Hal 79-80) ──────────────── */}
        {currentTemplate === "surat_pernyataan" && (
          <div className="w-full mt-4">
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                SURAT PERNYATAAN {subjekPernyataan ? subjekPernyataan.toUpperCase() : ""}
              </h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5">NOMOR : {nomorText}</p>
            </div>

            <p className="mb-2">Yang bertanda tangan di bawah ini :</p>
            <div className="pl-6 space-y-1 mb-3 text-[11pt]">
              <div className="flex"><span className="w-36">Nama, NIP</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan} ({pejabatMenerangkan?.nip || nipPenandatangan})</span></div>
              <div className="flex"><span className="w-36">Pangkat/Gol.</span><span className="w-4">:</span><span>{pejabatMenerangkan?.pangkatGol || "Pembina Tk. I (IV/b)"}</span></div>
              <div className="flex"><span className="w-36">Jabatan</span><span className="w-4">:</span><span>{pejabatMenerangkan?.jabatan || jabatanPenandatangan}</span></div>
            </div>

            <p className="mb-2">Dengan ini menyatakan dengan sesungguhnya, bahwa :</p>
            <div className="pl-6 space-y-1 mb-4 text-[11pt]">
              <div className="flex"><span className="w-36">Nama, NIP</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama} ({pegawaiDiterangkan?.nip})</span></div>
              <div className="flex"><span className="w-36">Pangkat/Gol.</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.pangkatGol}</span></div>
              <div className="flex"><span className="w-36">Jabatan</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.jabatan}</span></div>
            </div>
          </div>
        )}

        {/* ─── 4. SURAT KUASA (Permen 1/2025 Hal 59-60) ───────────────────── */}
        {currentTemplate === "surat_kuasa" && (
          <div className="w-full mt-4">
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">SURAT KUASA</h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5">NOMOR : {nomorText}</p>
            </div>

            <p className="mb-2">Yang bertanda tangan di bawah ini :</p>
            <div className="pl-6 space-y-1 mb-3 text-[11pt]">
              <div className="flex"><span className="w-32">Nama</span><span className="w-4">:</span><span className="font-bold">{pemberiKuasa?.nama || namaPenandatangan}</span></div>
              <div className="flex"><span className="w-32">NIP</span><span className="w-4">:</span><span>{pemberiKuasa?.nip || nipPenandatangan}</span></div>
              <div className="flex"><span className="w-32">Jabatan</span><span className="w-4">:</span><span>{pemberiKuasa?.jabatan || jabatanPenandatangan}</span></div>
              <div className="flex"><span className="w-32">Alamat</span><span className="w-4">:</span><span>{pemberiKuasa?.alamat || "Samarinda"}</span></div>
            </div>

            <p className="mb-2">Memberi kuasa kepada :</p>
            <div className="pl-6 space-y-1 mb-4 text-[11pt]">
              <div className="flex"><span className="w-32">Nama</span><span className="w-4">:</span><span className="font-bold">{penerimaKuasa?.nama}</span></div>
              <div className="flex"><span className="w-32">NIP</span><span className="w-4">:</span><span>{penerimaKuasa?.nip || "-"}</span></div>
              <div className="flex"><span className="w-32">Jabatan</span><span className="w-4">:</span><span>{penerimaKuasa?.jabatan}</span></div>
              <div className="flex"><span className="w-32">Alamat</span><span className="w-4">:</span><span>{penerimaKuasa?.alamat}</span></div>
            </div>

            <p className="mb-2 font-semibold">Untuk :</p>
            <div className="pl-6 mb-4 text-justify leading-relaxed">
              {materiKuasa}
            </div>
          </div>
        )}

        {/* ─── 5. SURAT IZIN & SURAT PANGGILAN (Hal 75 & 77) ───────────────── */}
        {(currentTemplate === "surat_izin" || currentTemplate === "surat_panggilan") && (
          <div className="w-full mt-4">
            <div className="text-right mb-2">{kotaTanggal}</div>
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                {currentTemplate === "surat_izin" ? "SURAT IZIN" : "SURAT PANGGILAN"}
              </h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5">NOMOR : {nomorText}</p>
            </div>

            {currentTemplate === "surat_panggilan" ? (
              <div className="space-y-3 mb-4 text-[11pt]">
                <p>Dengan hormat kami harapkan kehadiran Saudara :</p>
                <div className="pl-6 space-y-1">
                  <div className="flex"><span className="w-36">Nama, NIP</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama} ({pegawaiDiterangkan?.nip})</span></div>
                  <div className="flex"><span className="w-36">Pangkat/Gol.</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.pangkatGol}</span></div>
                  <div className="flex"><span className="w-36">Jabatan</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.jabatan}</span></div>
                  <div className="flex"><span className="w-36">Unit Organisasi</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.unit || "Balai KSDA Kalimantan Timur"}</span></div>
                </div>

                <p>Untuk menghadap kepada :</p>
                <div className="pl-6 space-y-1">
                  <div className="flex"><span className="w-36">Nama, NIP</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan} ({pejabatMenerangkan?.nip || nipPenandatangan})</span></div>
                  <div className="flex"><span className="w-36">Hari, Tanggal</span><span className="w-4">:</span><span className="font-normal">{acaraHariTanggal}</span></div>
                  <div className="flex"><span className="w-36">Waktu</span><span className="w-4">:</span><span>{acaraWaktu}</span></div>
                  <div className="flex"><span className="w-36">Tempat</span><span className="w-4">:</span><span>{acaraTempat}</span></div>
                  <div className="flex"><span className="w-36">Keperluan</span><span className="w-4">:</span><span className="font-normal">{keperluanPanggilan || perihal}</span></div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-4 text-[11pt]">
                <p>Yang bertanda tangan di bawah ini :</p>
                <div className="pl-6 space-y-1">
                  <div className="flex"><span className="w-36">Nama, NIP</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan} ({pejabatMenerangkan?.nip || nipPenandatangan})</span></div>
                  <div className="flex"><span className="w-36">Jabatan</span><span className="w-4">:</span><span>{pejabatMenerangkan?.jabatan || jabatanPenandatangan}</span></div>
                </div>

                <p>Memberikan izin kepada :</p>
                <div className="pl-6 space-y-1">
                  <div className="flex"><span className="w-36">Nama</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama}</span></div>
                  <div className="flex"><span className="w-36">Jabatan/Institusi</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.jabatan}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── 6. SURAT EDARAN & INSTRUKSI & KEPUTUSAN (Hal 30, 32, 34) ─────── */}
        {(currentTemplate === "surat_edaran" || currentTemplate === "instruksi" || currentTemplate === "keputusan") && (
          <div className="w-full mt-4 text-center">
            {currentTemplate === "surat_edaran" && (
              <>
                <div className="text-left mb-3">
                  <p>Yth.</p>
                  <pre className="font-sans text-xs pl-4 whitespace-pre-wrap">{tujuanKepada}</pre>
                </div>
                <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">SURAT EDARAN</h2>
                <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
                <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
                <h3 className="font-bold text-[11pt] uppercase max-w-lg mx-auto leading-snug m-0 mb-4">{judulEdaran || perihal}</h3>
              </>
            )}

            {currentTemplate === "instruksi" && (
              <>
                <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">INSTRUKSI KEPALA BALAI KSDA KALIMANTAN TIMUR</h2>
                <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
                <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
                <h3 className="font-bold text-[11pt] uppercase max-w-lg mx-auto leading-snug m-0 mb-3">{judulInstruksi || perihal}</h3>
                <div className="text-left my-3 space-y-1.5">
                  <p className="font-semibold">Kepada :</p>
                  {(instruksiKepada || []).map((kpd, idx) => (
                    <p key={idx} className="pl-4">{idx + 1}. {kpd}</p>
                  ))}
                </div>
              </>
            )}

            {currentTemplate === "keputusan" && (
              <>
                <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">KEPUTUSAN KEPALA BALAI KSDA KALIMANTAN TIMUR</h2>
                <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
                <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
                <h3 className="font-bold text-[11pt] uppercase max-w-lg mx-auto leading-snug m-0 mb-4">{judulKeputusan || perihal}</h3>

                <div className="text-left space-y-2 mb-4">
                  <div className="flex">
                    <span className="w-24 shrink-0 font-bold">Menimbang</span>
                    <span className="w-4">:</span>
                    <div className="flex-1 space-y-1">
                      {(konsideransMenimbang || []).map((mb, i) => (
                        <p key={i}><strong>{String.fromCharCode(97 + i)}.</strong> {mb}</p>
                      ))}
                    </div>
                  </div>
                  <div className="flex">
                    <span className="w-24 shrink-0 font-bold">Mengingat</span>
                    <span className="w-4">:</span>
                    <div className="flex-1 space-y-1">
                      {(konsideransMengingat || []).map((mg, i) => (
                        <p key={i}><strong>{i + 1}.</strong> {mg}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-center font-bold tracking-widest my-3">MEMUTUSKAN :</div>
              </>
            )}

            {/* Diktum untuk Instruksi & Keputusan */}
            {(diktumKeputusan || []).length > 0 && (
              <div className="text-left space-y-2 mb-4">
                {diktumKeputusan?.map((dkt, dIdx) => (
                  <div key={dIdx} className="flex">
                    <span className="w-24 shrink-0 font-bold">{dkt.diktum}</span>
                    <span className="w-4">:</span>
                    <p className="flex-1 text-justify">{dkt.isi}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── 7. TELAAH STAF & LAPORAN (Hal 70 & 72) ───────────────────────── */}
        {(currentTemplate === "telaah_staf" || currentTemplate === "laporan") && (
          <div className="w-full mt-4">
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                {currentTemplate === "telaah_staf" ? "TELAAH STAF" : "LAPORAN KEDINASAN"}
              </h2>
              <p className="font-bold text-[10.5pt] leading-snug m-0 mt-1 mb-1">TENTANG</p>
              <h3 className="font-bold text-[11pt] uppercase max-w-lg mx-auto leading-snug m-0 mb-4">
                {judulTelaah || judulLaporan || perihal}
              </h3>
            </div>

            {currentTemplate === "telaah_staf" && sectionTelaah && (
              <div className="space-y-2.5 text-justify text-[11pt]">
                <div><strong className="block mb-0.5">A. Persoalan</strong><p className="pl-4">{sectionTelaah.persoalan}</p></div>
                <div><strong className="block mb-0.5">B. Praanggapan</strong><p className="pl-4">{sectionTelaah.praanggapan}</p></div>
                <div><strong className="block mb-0.5">C. Fakta yang Mempengaruhi</strong><p className="pl-4">{sectionTelaah.fakta}</p></div>
                <div><strong className="block mb-0.5">D. Analisis</strong><p className="pl-4">{sectionTelaah.analisis}</p></div>
                <div><strong className="block mb-0.5">E. Kesimpulan</strong><p className="pl-4">{sectionTelaah.kesimpulan}</p></div>
                <div><strong className="block mb-0.5">F. Saran / Rekomendasi</strong><p className="pl-4">{sectionTelaah.saran}</p></div>
              </div>
            )}

            {currentTemplate === "laporan" && sectionLaporan && (
              <div className="space-y-2.5 text-justify text-[11pt]">
                <div><strong className="block mb-0.5">A. Pendahuluan</strong><p className="pl-4">{sectionLaporan.pendahuluan}</p></div>
                <div><strong className="block mb-0.5">B. Kegiatan yang Dilaksanakan</strong><p className="pl-4">{sectionLaporan.kegiatan}</p></div>
                <div><strong className="block mb-0.5">C. Hasil yang Dicapai</strong><p className="pl-4">{sectionLaporan.hasil}</p></div>
                <div><strong className="block mb-0.5">D. Kesimpulan dan Saran</strong><p className="pl-4">{sectionLaporan.kesimpulan}</p></div>
              </div>
            )}
          </div>
        )}

        {/* ─── 8. PERJANJIAN KERJA SAMA (PKS) (Hal 54-58) ──────────────────── */}
        {currentTemplate === "perjanjian" && (
          <div className="w-full mt-4 text-center">
            <h2 className="font-bold text-[11.5pt] uppercase max-w-lg mx-auto leading-snug m-0">
              {judulPerjanjian || "PERJANJIAN KERJA SAMA"}
            </h2>
            <p className="text-[10.5pt] font-normal leading-snug m-0 mt-0.5 mb-3">NOMOR : {nomorText}</p>

            <div className="text-left text-justify space-y-2 mb-4 text-[10.5pt]">
              <p>Pada hari ini, {hariTanggalAcara || "..."} bertempat di {lokasiDibuat || "Samarinda"}, kami masing-masing:</p>
              <div className="pl-4 space-y-1">
                <p>1. <strong>{pihakPertama?.nama}</strong>, {pihakPertama?.jabatan}, beralamat di {pihakPertama?.alamat}, selanjutnya disebut <strong>PIHAK PERTAMA</strong>.</p>
                <p>2. <strong>{pihakKedua?.nama}</strong>, {pihakKedua?.jabatan}, beralamat di {pihakKedua?.alamat}, selanjutnya disebut <strong>PIHAK KEDUA</strong>.</p>
              </div>
            </div>
          </div>
        )}

        {/* ─── 9. PIAGAM & SERTIFIKAT (Hal 81 & 83) ────────────────────────── */}
        {(currentTemplate === "piagam" || currentTemplate === "sertifikat") && (
          <div className="w-full mt-6 text-center border-4 border-double border-amber-600/60 p-6 rounded-2xl bg-amber-50/20">
            <h2 className="font-sans font-bold text-[18pt] tracking-widest text-amber-900 mb-1">
              {currentTemplate === "piagam" ? "PIAGAM PENGHARGAAN" : "SERTIFIKAT"}
            </h2>
            <p className="font-mono text-xs text-zinc-500 mb-4">NOMOR : {nomorText}</p>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">DIBERIKAN KEPADA :</p>
            <h3 className="font-sans font-bold text-[16pt] text-zinc-900 uppercase underline decoration-amber-600 underline-offset-8 mb-4">
              {diberikanKepada}
            </h3>
            <p className="text-xs text-zinc-600 max-w-md mx-auto leading-relaxed mb-6 font-medium">
              {atasPeran}
            </p>
          </div>
        )}

        {/* ─── 10. SURAT KETERANGAN & BERITA ACARA & PENGUMUMAN (Batch 1) ──── */}
        {currentTemplate === "surat_keterangan" && (
          <div className="w-full mt-4">
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">SURAT KETERANGAN</h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5">NOMOR : {nomorText}</p>
            </div>
            <p className="mt-4 mb-2">Yang bertanda tangan di bawah ini:</p>
            <div className="pl-6 space-y-1 mb-3 text-[11pt]">
              <div className="flex"><span className="w-36">nama</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan}</span></div>
              <div className="flex"><span className="w-36">NIP</span><span className="w-4">:</span><span>{pejabatMenerangkan?.nip || nipPenandatangan}</span></div>
              <div className="flex"><span className="w-36">jabatan</span><span className="w-4">:</span><span>{pejabatMenerangkan?.jabatan || jabatanPenandatangan}</span></div>
            </div>
            <p className="mt-4 mb-2">dengan ini menerangkan bahwa :</p>
            <div className="pl-6 space-y-1 mb-4 text-[11pt]">
              <div className="flex"><span className="w-36">nama</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama}</span></div>
              <div className="flex"><span className="w-36">NIP</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.nip}</span></div>
              <div className="flex"><span className="w-36">pangkat/gol.</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.pangkatGol}</span></div>
              <div className="flex"><span className="w-36">jabatan</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.jabatan}</span></div>
            </div>
          </div>
        )}

        {currentTemplate === "berita_acara" && (
          <div className="w-full mt-4">
            <div className="text-center mb-3">
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">BERITA ACARA</h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5">NOMOR : {nomorText}</p>
            </div>
            <p className="mb-3 text-justify">Pada hari ini, {hariTanggalAcara || "..."} bertempat di {lokasiDibuat || "Samarinda"}, kami masing-masing:</p>
            <div className="pl-4 space-y-2 mb-3 text-justify text-[11pt]">
              <p>1. <strong>{pihakPertama?.nama}</strong>, NIP. {pihakPertama?.nip}, {pihakPertama?.jabatan}, selanjutnya disebut <strong>PIHAK PERTAMA</strong>.</p>
              <p>2. <strong>{pihakKedua?.nama}</strong>, {pihakKedua?.jabatan} {pihakKedua?.instansi || ""}, selanjutnya disebut <strong>PIHAK KEDUA</strong>.</p>
            </div>
            <p className="mb-2 font-medium">Telah melaksanakan/bersepakat mengenai:</p>
            <div className="pl-4 space-y-1.5 mb-4 text-justify">
              {(poinBeritaAcara || []).map((poin, idx) => (
                <div key={idx} className="flex gap-2"><span>{idx + 1}.</span><div>{poin}</div></div>
              ))}
            </div>
          </div>
        )}

        {currentTemplate === "pengumuman" && (
          <div className="w-full mt-4 text-center">
            <h2 className="font-bold text-[13pt] uppercase tracking-widest leading-snug m-0">PENGUMUMAN</h2>
            <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
            <p className="font-bold text-[11pt] tracking-wider leading-snug m-0 mb-1">TENTANG</p>
            <h3 className="font-bold text-[11.5pt] uppercase max-w-lg mx-auto leading-snug m-0 mb-5 border-b border-zinc-200 pb-2">
              {judulPengumuman || perihal}
            </h3>
          </div>
        )}

        {/* ─── 11. SURAT DINAS & UNDANGAN INTERNAL (Header Standar Sifat/Lamp) ── */}
        {(currentTemplate === "surat_dinas" || currentTemplate === "undangan") && (
          <>
            <div className="pkpknl-meta-container">
              <div className="pkpknl-meta-row">
                <div className="pkpknl-meta-field">
                  <span className="pkpknl-meta-label">Nomor</span>
                  <span className="pkpknl-meta-colon">:</span>
                  <span className={`pkpknl-meta-nomor ${nomorClass}`}>{nomorText}</span>
                </div>
                <div className="pkpknl-meta-tanggal">{kotaTanggal}</div>
              </div>

              <div className="pkpknl-meta-row">
                <div className="pkpknl-meta-field">
                  <span className="pkpknl-meta-label">Sifat</span>
                  <span className="pkpknl-meta-colon">:</span>
                  <span>{sifat || "Biasa"}</span>
                </div>
              </div>

              <div className="pkpknl-meta-row">
                <div className="pkpknl-meta-field">
                  <span className="pkpknl-meta-label">Lampiran</span>
                  <span className="pkpknl-meta-colon">:</span>
                  <span>{lampiran || "-"}</span>
                </div>
              </div>
            </div>

            <div className="pkpknl-perihal-full">
              <span className="pkpknl-meta-label">Perihal</span>
              <span className="pkpknl-meta-colon">:</span>
              <span className="pkpknl-perihal-content font-normal">{perihal}</span>
            </div>

            <div className="pkpknl-yth">
              <p>Yth. {tujuanKepada}</p>
              {currentTemplate === "undangan" ? (
                <p className="pkpknl-yth-tempat">di Tempat</p>
              ) : (
                <>
                  <p>Di -</p>
                  <p className="pkpknl-yth-tempat">{cleanTujuanDi}</p>
                </>
              )}
            </div>

            {currentTemplate === "undangan" && (
              <div className="w-full my-3 pl-8 space-y-1 text-[11pt]">
                <div className="flex"><span className="w-32 shrink-0">hari, tanggal</span><span className="w-4">:</span><span className="font-normal">{acaraHariTanggal}</span></div>
                <div className="flex"><span className="w-32 shrink-0">waktu</span><span className="w-4">:</span><span>{acaraWaktu}</span></div>
                <div className="flex"><span className="w-32 shrink-0">tempat</span><span className="w-4">:</span><span>{acaraTempat}</span></div>
                <div className="flex"><span className="w-32 shrink-0">acara</span><span className="w-4">:</span><span className="font-normal">{acaraNama || perihal}</span></div>
              </div>
            )}
          </>
        )}

        {/* ─── PARAGRAF BATANG TUBUH UMUM ──────────────────────────────────── */}
        {currentTemplate !== "surat_pengantar" && (
          <div className="pkpknl-body">
            {paragraf && paragraf.length > 1 ? (
              paragraf.slice(0, -1).map((pText, idx) => (
                <p
                  key={idx}
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit"
                  onBlur={(e) => {
                    const newParas = [...paragraf];
                    newParas[idx] = e.currentTarget.innerText;
                    onUpdateField?.("paragraf", newParas);
                  }}
                >
                  {pText}
                </p>
              ))
            ) : (!paragraf || paragraf.length === 0) ? (
              <p className="text-slate-400 italic">Ketik isi naskah dinas di sini...</p>
            ) : null}
          </div>
        )}

        {/* ─── GRUP PENUTUP + TANDA TANGAN + TEMBUSAN ──────────────────────── */}
        {currentTemplate !== "surat_pengantar" && (
          <div data-break-candidate="penutup-ttd" className="penutup-ttd-group" style={{ display: "block", breakInside: "avoid", pageBreakInside: "avoid" }}>
            {paragraf && paragraf.length > 0 && (
              <div className="pkpknl-body">
                <p
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit"
                  onBlur={(e) => {
                    const newParas = [...paragraf];
                    newParas[newParas.length - 1] = e.currentTarget.innerText;
                    onUpdateField?.("paragraf", newParas);
                  }}
                >
                  {paragraf[paragraf.length - 1]}
                </p>
              </div>
            )}

            {/* Kaki 2/3 Kolom untuk Berita Acara, PKS, dan Surat Kuasa */}
            {(currentTemplate === "berita_acara" || currentTemplate === "perjanjian" || currentTemplate === "surat_kuasa") ? (
              <div className="w-full mt-6">
                <p className="text-right mb-4">Dibuat di {lokasiDibuat || "Samarinda"}</p>
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <p className="font-normal uppercase mb-1">
                      {currentTemplate === "surat_kuasa" ? "PENERIMA KUASA," : "PIHAK KEDUA,"}
                    </p>
                    <div className="pkpknl-ttd-placeholder pkpknl-edit flex items-center justify-center text-zinc-400 text-xs italic mx-auto" style={{ height: "105px" }}>
                      {pihakKedua?.partyType === "internal" || penerimaKuasa?.partyType === "internal" ? "${ttd_pengirim}" : "${ttd_pihak_kedua}"}
                    </div>
                    <p className="font-bold">{pihakKedua?.nama || penerimaKuasa?.nama || ".............................."}</p>
                    {(pihakKedua?.nip || penerimaKuasa?.nip) && (
                      <p className="text-[10pt]">
                        {(pihakKedua?.idType === "NIK" || penerimaKuasa?.idType === "NIK" ? "NIK. " : "NIP. ") + (pihakKedua?.nip || penerimaKuasa?.nip)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="font-normal uppercase mb-1">
                      {currentTemplate === "surat_kuasa" ? "PEMBERI KUASA," : "PIHAK PERTAMA,"}
                    </p>
                    <div className="pkpknl-ttd-placeholder pkpknl-edit flex items-center justify-center text-zinc-400 text-xs italic mx-auto" style={{ height: "105px" }}>
                      {"${ttd_pengirim}"}
                    </div>
                    <p className="font-bold">{pihakPertama?.nama || pemberiKuasa?.nama || namaPenandatangan || DEFAULT_KEPALA_BALAI.nama}</p>
                    <p className="text-[10pt]">NIP. {pihakPertama?.nip || pemberiKuasa?.nip || nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
                  </div>
                </div>

                {currentTemplate === "berita_acara" && signerCount === 3 && (
                  <div className="mt-8 text-center max-w-xs mx-auto">
                    <p className="mb-0.5 font-normal">Mengetahui/Mengesahkan,</p>
                    <p className="font-normal">{pihakKetiga?.jabatan || jabatanPenandatangan || DEFAULT_KEPALA_BALAI.jabatan}</p>
                    <div className="pkpknl-ttd-placeholder pkpknl-edit flex items-center justify-center text-zinc-400 text-xs italic mx-auto" style={{ height: "105px" }}>
                      {"${ttd_pengirim}"}
                    </div>
                    <p className="font-bold">{pihakKetiga?.nama || namaPenandatangan || DEFAULT_KEPALA_BALAI.nama}</p>
                    <p className="text-[10pt]">NIP. {pihakKetiga?.nip || nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Kaki Standar 1 Kolom Kanan Bawah */
              <div className="pkpknl-ttd">
                {(currentTemplate === "surat_keterangan" || currentTemplate === "surat_pernyataan") && (
                  <p className="mb-1 text-zinc-700">Samarinda, {kotaTanggal}</p>
                )}
                {(currentTemplate === "pengumuman" || currentTemplate === "instruksi") && (
                  <div className="mb-1 text-zinc-700">
                    <p>Dikeluarkan di Samarinda</p>
                    <p>pada tanggal {kotaTanggal}</p>
                  </div>
                )}
                {(currentTemplate === "surat_edaran" || currentTemplate === "keputusan") && (
                  <div className="mb-1 text-zinc-700">
                    <p>Ditetapkan di Samarinda</p>
                    <p>pada tanggal {kotaTanggal}</p>
                  </div>
                )}

                {(currentTemplate !== "nota_dinas" && currentTemplate !== "memorandum") && (
                  <p className="pkpknl-edit font-normal">
                    {currentTemplate === "surat_pernyataan"
                      ? "Yang membuat pernyataan,"
                      : (jabatanPenandatangan || DEFAULT_KEPALA_BALAI.jabatan)}
                  </p>
                )}
                <div className="pkpknl-ttd-placeholder pkpknl-edit">
                  {"${ttd_pengirim}"}
                </div>
                <p className="pkpknl-ttd-name pkpknl-edit font-bold">{namaPenandatangan || DEFAULT_KEPALA_BALAI.nama}</p>
                <p className="pkpknl-edit">NIP. {nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
              </div>
            )}

            {/* Tembusan (Hanya untuk template yang memiliki tembusan sesuai Permen Kehutanan 1/2025) */}
            {(
              currentTemplate === "surat_dinas" ||
              currentTemplate === "nota_dinas" ||
              currentTemplate === "memorandum" ||
              currentTemplate === "undangan" ||
              currentTemplate === "surat_izin" ||
              currentTemplate === "surat_panggilan" ||
              currentTemplate === "surat_pernyataan"
            ) && tembusan && tembusan.length > 0 && (
              <div className="pkpknl-tembusan">
                <p className="pkpknl-tembusan-title">Tembusan:</p>
                {tembusan.map((t, i) => (
                  <div
                    className={`pkpknl-tembusan-item ${tembusan.length === 1 ? "single-item" : ""}`}
                    key={t.id || i}
                  >
                    {tembusan.length > 1 && <span>{i + 1}.</span>}
                    <span className="pkpknl-edit">{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </article>
    </div>
  );
}

export const SuratDinasDocument = React.memo(SuratDinasDocumentComponent);
