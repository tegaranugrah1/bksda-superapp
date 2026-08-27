/**
 * Shared constants untuk modul Surat Tugas (builder + create).
 */

import type { KepalaBalaiInfo, SumberDanaOption } from "./types";

export const DEFAULT_KEPALA_BALAI: KepalaBalaiInfo = {
  name: "M. Ari Wibawanto, S.Hut., M.Sc.",
  nip: "19740514 199903 1 001",
};

export const PLH_WILAYAH_PLACEHOLDER = "{wilayah}";
export const PLH_KEGIATAN_KASI_PLACEHOLDER = "{kegiatan Kepala Seksi}";

export const SUMBER_DANA_OPTIONS: SumberDanaOption[] = [
  {
    id: "dipa",
    label: "DIPA",
    dasarText:
      "Surat Pengesahan DIPA Tahun Anggaran {tahun} Balai Konservasi Sumber Daya Alam Kalimantan Timur Nomor: SP DIPA143.04.2.693614/{tahun} tanggal 24 April 2026.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada DIPA Balai KSDA Kalimantan Timur Ditjen KSDAE (693614) Tahun Anggaran {tahun};",
  },
  {
    id: "kja",
    label: "Dana Kerjasama KJA",
    dasarText:
      "Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT Kideco Jaya Agung Nomor : PKS.140/K.18/TU /Teknis/08/2023 dan Nomor : 213/KJA/LGL/CON/VIII/2023 tanggal 08 Agustus 2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Kideco Jaya Agung;",
  },
  {
    id: "mja",
    label: "Dana Kerjasama MJA",
    dasarText:
      "Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Direktur PT Multi Jayantara Abadi Nomor : PKS.36/K.18/TU/Teknis/02/2023 dan Nomor : 001/MJA-Dir/ TPG/II /2023 tanggal 01 Februari 2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan PT Multi Jayantara Abadi;",
  },
  {
    id: "cop",
    label: "Dana Kerjasama COP",
    dasarText:
      "Perjanjian Kerja Sama Antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dan Centre for Orangutan Protection (COP) Nomor: PKS.191/K.18/TU/Teknis/10/2023 dan Nomor 17/HQ10/COP/2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Centre for Orangutan Protection (COP);",
  },
  {
    id: "tjiwi_kimia",
    label: "Dana Kerjasama PT. Tjiwi Kimia Tbk.",
    dasarText:
      "Perjanjian kerjasama antara Balai KSDA Kalimantan Timur dan PT. Pabrik Kertas Tjiwi Kimia Tbk., Nomor PKS.205/K.18/ TU/PK/12/ 2022 dan Nomor: 76/SSE JKT/APP/PKS/12/ 2022 tentang penguatan fungsi Kawasan Cagar Alam Muara Kaman Sedulang dan Pelestarian Keanekaragaman Hayati yang Dilindungi di Wilayah Kerja Balai KSDA Kalimantan Timur.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Anggaran Perjanjian Kerja Sama antara Balai KSDA Kalimantan Timur dan PT Pabrik Kertas Tjiwi Kimia Tbk;",
  },
  {
    id: "bosf",
    label: "Dana Kerjasama BOSF",
    dasarText:
      "Perjanjian Kerjasama antara Kepala Balai KSDA Kalimantan Timur dengan Ketua Pengurus Yayasan Penyelamatan Orangutan Borneo Nomor : PKS.184/K.18/TU/PK12/2021 dan Nomor 176/YBOS /XII/2021 tanggal 6 Desember 2021.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan Yayasan Penyelamatan Orangutan Borneo (BOSF);",
  },
  {
    id: "can",
    label: "Dana Kerjasama CAN",
    dasarText:
      "Perjanjian Kerja Sama antara Balai Konservasi Sumber Daya Alam Kalimantan Timur dengan Conservation Action Network (CAN) Nomor : PKS.45/K.18/TU/KSA.2.5/03/2025 dan 007/K-JAK/PKS/III/2025 tanggal 14 Maret 2025.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Biaya Kerjasama BKSDA Kalimantan Timur dan Conservation Action Network (CAN);",
  },
  {
    id: "alert",
    label: "Dana Kerjasama ALeRT",
    dasarText:
      "Perjanjian Kerjasama Antara Kepala Balai KSDA Kalimantan Timur dengan Direktur Aliansi Lestrai Rimba Terpadu (AleRT) Nomor: PKS.192/K.18/TU/Teknis/10/2023 dan Nomor: 51/PKS-ALeRT/ X/2023.",
    biayaText:
      "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada Rencana Kerja Tahunan (RKT) Kegiatan Kerja Sama antara Balai KSDA Kalimantan Timur dengan ALeRT (Aliansi Lestari Rimba Terpadu);",
  },
  {
    id: "folu",
    label: "Dana Kerjasama FOLU NC 2&3",
    dasarText: "",
    biayaText:
      "Sumber dana dibebankan pada anggaran Proyek FOLU Net Sink 2030 RBC Norwegia Tahap II dan III (FOLU NC 2&3) pada AWP KSDAE - Tahun Anggaran {tahun};",
  },
  {
    id: "dl1",
    label: "DL 1 / Tidak ada biaya",
    dasarText: "",
    biayaText: "",
  },
  {
    id: "other",
    label: "Lainnya",
    dasarText: "",
    biayaText: "",
  },
];
