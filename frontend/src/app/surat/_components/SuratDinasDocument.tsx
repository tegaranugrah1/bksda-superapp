"use client";

import React from "react";
import { toast } from "sonner";
import { formatNipLabel, isPppk } from "@/lib/letter-utils";

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
  | "sertifikat"
  | "surat_izin_cuti";

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
  satuanKerja?: string;
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
  ythList?: string[];
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

  // Surat Izin Cuti Resmi (BKSDA)
  jenisCuti?: string;
  jumlahHari?: number;
  terbilangHari?: string;
  tanggalMulai?: string;
  tanggalSelesai?: string;
  tahunCutiText?: string | null;
  pegawai?: PersonItem;

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

/**
 * Parsing string Yth multi-baris menjadi list nama penerima yang bersih tanpa nomor prefix.
 */
export function parseYthList(ythStr?: string): string[] {
  if (!ythStr || !ythStr.trim()) return [""];
  const lines = ythStr.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [""];
  return lines.map((line) => line.replace(/^[0-9]+[.)\-]\s*/, "").trim());
}

/**
 * Memformat list nama penerima menjadi string Yth bertata naskah dinas resmi.
 * 1 penerima -> tanpa nomor ("Kepala Balai ...")
 * 2 atau lebih -> bernomor urut ("1. ...\n2. ...")
 */
export function formatYthList(items: string[]): string {
  const cleaned = items.map((it) => it.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0];
  return cleaned.map((it, idx) => `${idx + 1}. ${it}`).join("\n");
}

export type PointLevel = 0 | 1 | 2 | 3 | 4;

/**
 * Mendeteksi tingkat hierarki butir poin naskah dinas Permen Kehutanan 1/2025:
 * Level 0: Paragraf teks biasa
 * Level 1: Angka utama (1., 2., 3., dst.)
 * Level 2: Sub-poin huruf (a., b., c., dst.)
 * Level 3: Sub-sub-poin Romawi kecil (i., ii., iii., iv., dst.) ATAU angka kurung (1), 2), 3), dst.)
 * Level 4: Sub-butir huruf kurung (a), b), c), dst.)
 */
export function detectPointLevel(text: string): PointLevel {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Level 4: a), b), c)
  if (/^[a-z]\)(?:\s|$)/i.test(trimmed)) return 4;

  // Level 3: i., ii., iii., iv., v., vi., vii., viii., ix., x. ATAU 1), 2), 3)
  if (/^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.(?:\s|$)/i.test(trimmed) || /^[0-9]+\)(?:\s|$)/.test(trimmed)) {
    return 3;
  }

  // Level 2: a., b., c., d., e., f., g., dst. (kecuali romawi 'i.' yang sudah ditangani di Level 3)
  if (/^[a-z]\.(?:\s|$)/i.test(trimmed)) {
    return 2;
  }

  // Level 1: 1., 2., 3., 10., dst.
  if (/^[0-9]+\.(?:\s|$)/.test(trimmed)) {
    return 1;
  }

  return 0;
}

export function getPointLevelClassName(level: PointLevel): string {
  switch (level) {
    case 1: return "poin-item poin-level-1";
    case 2: return "poin-item poin-level-2";
    case 3: return "poin-item poin-level-3";
    case 4: return "poin-item poin-level-4";
    default: return "";
  }
}

/**
 * Smart Parser untuk memecah teks mentah salin-tempel naskah dinas menjadi array paragraf bertingkat
 */
export function parseRawDocumentText(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];
  const rawLines = rawText.split(/\r?\n/).map((l) => l.trim());
  const paragraphs: string[] = [];
  let currentBuffer = "";

  for (const line of rawLines) {
    if (!line) {
      if (currentBuffer) {
        paragraphs.push(currentBuffer.trim());
        currentBuffer = "";
      }
      continue;
    }

    const isNewPoint =
      /^[0-9]+\.\s/.test(line) ||
      /^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.\s/i.test(line) ||
      /^[a-z]\.\s/i.test(line) ||
      /^[0-9]+\)\s/.test(line) ||
      /^[a-z]\)\s/i.test(line) ||
      /^(?:Demikian)\b/i.test(line);

    if (isNewPoint && currentBuffer) {
      paragraphs.push(currentBuffer.trim());
      currentBuffer = line;
    } else {
      if (currentBuffer) {
        currentBuffer += " " + line;
      } else {
        currentBuffer = line;
      }
    }
  }

  if (currentBuffer) {
    paragraphs.push(currentBuffer.trim());
  }

  return paragraphs;
}

/**
 * Memisahkan nomor/penanda butir dari konten kalimat
 */
export function splitPointMarkerAndText(text: string): { marker: string; content: string } {
  const trimmed = text.trim();
  const m = trimmed.match(
    /^([0-9]+\.|(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.|[a-z]\.|[0-9]+\)|[a-z]\))\s*([\s\S]*)$/i
  );
  if (m) {
    return { marker: m[1], content: m[2] };
  }
  return { marker: "", content: text };
}

/**
 * Menghitung penanda butir berikutnya yang tepat sesuai hierarki tata naskah dinas:
 * - Level 1 ('num'): Berurutan global (1., 2., 3., dst.)
 * - Level 2 ('letter'): Berurutan dalam scope Level 1 saat ini (a., b., c., dst.), SELALU diulang dari 'a.' setiap ada Level 1 baru
 * - Level 3 ('roman'): Berurutan dalam scope Level 2 saat ini (i., ii., iii., dst.), SELALU diulang dari 'i.' setiap di bawah sub-poin baru
 * - Level 3 ('bracket'): Berurutan dalam scope Level 2 saat ini (1), 2), 3), dst.), SELALU diulang dari '1)' setiap di bawah sub-poin baru
 */
export function getNextMarkerForSection(
  paragraphs: string[],
  insertIndex: number,
  type: "num" | "letter" | "roman" | "bracket"
): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const romans = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];

  const preceding = paragraphs.slice(0, insertIndex);

  if (type === "num") {
    let maxNum = 0;
    for (const p of preceding) {
      const m = p.trim().match(/^([0-9]+)\.(?:\s|$)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `${maxNum + 1}. `;
  }

  if (type === "letter") {
    // Cari titik Level 1 terakhir sebelum posisi ini
    let lastLevel1Idx = -1;
    for (let i = preceding.length - 1; i >= 0; i--) {
      if (/^[0-9]+\.(?:\s|$)/.test(preceding[i].trim())) {
        lastLevel1Idx = i;
        break;
      }
    }

    // Hitung huruf HANYA dalam scope Level 1 saat ini
    const scope = lastLevel1Idx >= 0 ? preceding.slice(lastLevel1Idx + 1) : preceding;
    let letterCount = 0;
    for (const p of scope) {
      const trimmed = p.trim();
      // Pastikan Level 2 huruf murni dan bukan romawi 'i.'
      if (/^[a-z]\.(?:\s|$)/i.test(trimmed) && !/^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.(?:\s|$)/i.test(trimmed)) {
        letterCount++;
      }
    }

    const nextChar = letterCount < alphabet.length ? alphabet[letterCount] : "a";
    return `${nextChar}. `;
  }

  if (type === "roman") {
    // Cari sub-poin huruf (Level 2) atau poin utama (Level 1) terakhir sebelum posisi ini
    let lastParentIdx = -1;
    for (let i = preceding.length - 1; i >= 0; i--) {
      const trimmed = preceding[i].trim();
      if (
        (/^[a-z]\.(?:\s|$)/i.test(trimmed) && !/^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.(?:\s|$)/i.test(trimmed)) ||
        /^[0-9]+\.(?:\s|$)/.test(trimmed)
      ) {
        lastParentIdx = i;
        break;
      }
    }

    // Hitung romawi HANYA dalam scope parent sub-poin saat ini
    const scope = lastParentIdx >= 0 ? preceding.slice(lastParentIdx + 1) : preceding;
    let romanCount = 0;
    for (const p of scope) {
      if (/^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.(?:\s|$)/i.test(p.trim())) {
        romanCount++;
      }
    }

    const nextRom = romanCount < romans.length ? romans[romanCount] : "i";
    return `${nextRom}. `;
  }

  if (type === "bracket") {
    // Cari sub-poin huruf (Level 2) atau poin utama (Level 1) terakhir sebelum posisi ini
    let lastParentIdx = -1;
    for (let i = preceding.length - 1; i >= 0; i--) {
      const trimmed = preceding[i].trim();
      if (
        (/^[a-z]\.(?:\s|$)/i.test(trimmed) && !/^(?:i{1,3}|iv|v|vi{0,3}|ix|x)\.(?:\s|$)/i.test(trimmed)) ||
        /^[0-9]+\.(?:\s|$)/.test(trimmed)
      ) {
        lastParentIdx = i;
        break;
      }
    }

    // Hitung kurung HANYA dalam scope parent sub-poin saat ini
    const scope = lastParentIdx >= 0 ? preceding.slice(lastParentIdx + 1) : preceding;
    let bracketCount = 0;
    for (const p of scope) {
      if (/^[0-9]+\)(?:\s|$)/.test(p.trim())) {
        bracketCount++;
      }
    }

    return `${bracketCount + 1}) `;
  }

  return "";
}

/**
 * Normalisasi dan re-index seluruh butir penomoran dalam paragraf sesuai hierarki resmi
 * Tata Naskah Dinas Permen Kehutanan 1/2025:
 * Level 1: 1., 2., 3., dst. (berurutan global tanpa duplikasi)
 * Level 2: a., b., c., dst. (berurutan di dalam scope Level 1 saat ini, selalu reset dari 'a.')
 * Level 3 Romawi: i., ii., iii., dst. (berurutan di dalam scope Level 2 saat ini, reset dari 'i.')
 * Level 3 Kurung: 1), 2), 3), dst. (berurutan di dalam scope Level 2 saat ini, reset dari '1)')
 * Level 4: a), b), c), dst. (berurutan di dalam scope Level 3 saat ini)
 */
export function reindexParagraphMarkers(paragraphs: string[]): string[] {
  let currentNum = 0;
  let currentLetterIdx = 0;
  let currentRomanIdx = 0;
  let currentBracketIdx = 0;
  let currentLevel4Idx = 0;
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const romans = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii", "xiii", "xiv", "xv"];

  return paragraphs.map((p) => {
    const lvl = detectPointLevel(p);
    if (lvl === 0) return p;

    const { content } = splitPointMarkerAndText(p);

    if (lvl === 1) {
      currentNum++;
      currentLetterIdx = 0;
      currentRomanIdx = 0;
      currentBracketIdx = 0;
      currentLevel4Idx = 0;
      return `${currentNum}. ${content}`;
    }

    if (lvl === 2) {
      const char = currentLetterIdx < alphabet.length ? alphabet[currentLetterIdx] : "a";
      currentLetterIdx++;
      currentRomanIdx = 0;
      currentBracketIdx = 0;
      currentLevel4Idx = 0;
      return `${char}. ${content}`;
    }

    if (lvl === 3) {
      currentLevel4Idx = 0;
      const trimmed = p.trim();
      if (/^[0-9]+\)/.test(trimmed)) {
        currentBracketIdx++;
        return `${currentBracketIdx}) ${content}`;
      } else {
        const rom = currentRomanIdx < romans.length ? romans[currentRomanIdx] : "i";
        currentRomanIdx++;
        return `${rom}. ${content}`;
      }
    }

    if (lvl === 4) {
      const char = currentLevel4Idx < alphabet.length ? alphabet[currentLevel4Idx] : "a";
      currentLevel4Idx++;
      return `${char}) ${content}`;
    }

    return p;
  });
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
    case "surat_izin_cuti": return "SI.1";
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
  const klas = klasifikasi || (type === "surat_izin_cuti" ? "PEG.11.01" : "KSA.01.05");

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
        nomor: "ND.246/K.18/TU/PEG.09.01/B/05/2026",
        kotaTanggal: "11 Mei 2026",
        sifat: "Biasa",
        lampiran: "1 (satu) lembar",
        perihal: "Kartu Istri/Kartu Suami Aparatur Sipil Negara Virtual",
        yth: "1. Kepala Seksi KSDA Wilayah I Berau\n2. Kepala Seksi KSDA Wilayah II Tenggarong\n3. Kepala Seksi KSDA Wilayah III Balikpapan",
        ythList: [
          "Kepala Seksi KSDA Wilayah I Berau",
          "Kepala Seksi KSDA Wilayah II Tenggarong",
          "Kepala Seksi KSDA Wilayah III Balikpapan",
        ],
        dari: "Kepala Balai KSDA Kalimantan Timur",
        paragraf: [
          "Menindaklanjuti Nota Dinas Sekretaris Direktorat Jenderal KSDAE Nomor ND.70/SETKSDAE/KKOTL/PEG.10.1/B/01/2025 tanggal 21 Januari 2025 perihal Edaran Kartu Istri/Kartu Suami Aparatur Sipil Negara Virtual, bersama ini disampaikan hal-hal sebagai berikut:",
          "1. Layanan Kartu Istri/Kartu Suami Aparatur Sipil Negara (KARIS/KARSU) dilaksanakan secara digital melalui aplikasi MyASN BKN.",
          "2. Aparatur Sipil Negara (ASN) yang belum pernah memiliki KARIS/KARSU agar melakukan pengajuan penambahan pasangan melalui riwayat keluarga pada aplikasi MyASN BKN.",
          "3. KARIS/KARSU virtual akan terbit secara otomatis pada aplikasi MyASN setelah pengajuan disetujui oleh Biro Kepegawaian.",
          "4. Sehubungan dengan hal tersebut, diminta kepada Saudara/i untuk menyampaikan informasi ini kepada seluruh ASN (PNS dan PPPK) di lingkungan kerja masing-masing, serta memastikan ASN melakukan pembaruan data keluarga pada aplikasi MyASN.",
          "Demikian kami sampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.",
        ],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
        tembusan: [{ id: "1", text: "Sekretaris Direktorat Jenderal KSDAE di Jakarta" }],
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
        ythList: [
          "Kepala Subbagian Tata Usaha",
        ],
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
        judulPerjanjian: "PENGUATAN FUNGSI KONSERVASI SUAKA MARGASATWA KELIAN",
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
          instansi: "ALIANSI LESTARI RIMBA TERPADU (ALERT)",
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

    case "surat_izin_cuti":
      return {
        ...DEFAULT_SURAT_DINAS_DATA,
        templateType: "surat_izin_cuti",
        nomor,
        kotaTanggal: `Samarinda, ${baseDate}`,
        jenisCuti: "Tahunan",
        jumlahHari: 3,
        terbilangHari: "tiga",
        tanggalMulai: baseDate,
        tanggalSelesai: baseDate,
        pegawai: {
          nama: "AGUS PURNOMO, S.Hut.",
          nip: "19850712 201012 1 002",
          pangkatGol: "Penata (III/c)",
          jabatan: "Pengendali Ekosistem Hutan Ahli Muda",
          unit: "Balai Konservasi Sumber Daya Alam Kalimantan Timur",
        },
        paragraf: [],
        jabatanPenandatangan: DEFAULT_KEPALA_BALAI.jabatan,
        namaPenandatangan: DEFAULT_KEPALA_BALAI.nama,
        nipPenandatangan: DEFAULT_KEPALA_BALAI.nip,
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
  @page { size: A4 portrait; margin: 0; }
  @page :first { margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    line-height: 1.35;
    color: #000;
    text-align: justify;
  }
  h1, h2, h3, h4, p { margin: 0; padding: 0; }
  table { width: 100%; border-collapse: collapse; }
  .whitespace-pre { white-space: pre !important; }
  .font-bold { font-weight: bold !important; }
  .font-normal { font-weight: normal !important; }
  .text-center { text-align: center !important; }
  .text-justify { text-align: justify !important; text-justify: inter-word !important; }
  .text-right { text-align: right !important; }
  .uppercase { text-transform: uppercase !important; }

  .kop-surat, .pkpknl-kop {
    width: 210mm !important;
    margin: 2.5mm auto 4mm auto !important;
    text-align: center !important;
  }
  .kop-surat img, .pkpknl-kop img {
    width: 188mm !important;
    max-width: 188mm !important;
    height: auto !important;
    display: block !important;
    margin: 0 auto !important;
  }

  .surat-content {
    width: 210mm !important;
    margin: 0 auto !important;
    padding: 0 1.55cm 0 2.0cm !important;
    box-sizing: border-box !important;
  }

  /* thead disembunyikan pada live screen preview & html2canvas, hanya aktif saat @media print */
  thead {
    display: none;
  }
  thead td {
    height: 0;
    padding: 0;
    border: none;
  }

  tfoot {
    display: table-footer-group;
    height: 25mm;
  }
  tfoot td {
    height: 25mm;
    padding: 0;
    border: none;
  }

  .bsre-placeholder,
  .page-break-indicator,
  .halaman-divider,
  .pkpknl-footer-bsre,
  .print\\:hidden {
    display: none !important;
  }

  .pkpknl-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 0 0 1.5cm 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11pt;
    color: #000;
  }
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

  /* Metadata Nota Dinas & Memorandum */
  .nota-dinas-meta { width: 100%; margin: 8px 0 0; line-height: 1.35 !important; }
  .nota-dinas-meta > div { line-height: 1.35 !important; margin-bottom: 2px !important; }
  .nota-dinas-meta .pkpknl-edit { line-height: 1.35 !important; }
  .nota-dinas-nomor-wrapper { display: inline-block; min-width: 78mm; text-align: left; }

  /* Batang Tubuh Paragraf & Butir Poin — konsisten seragam dengan format Yth s.d. Tanggal (line-height: 1.35) */
  .pkpknl-body { width: 100%; margin: 10px 0 0; text-align: justify; text-justify: inter-word; }
  .pkpknl-body p { margin-bottom: 0.4rem; text-indent: 2.5em; line-height: 1.35; }
  .pkpknl-body p.no-indent { text-indent: 0 !important; }
  .pkpknl-body p.poin-item {
    display: flex !important;
    align-items: flex-start !important;
    margin-bottom: 0.25rem !important;
    line-height: 1.35 !important;
    text-align: justify !important;
    text-justify: inter-word !important;
    text-indent: 0 !important;
    padding-left: 0 !important;
  }
  .pkpknl-body p.poin-item .poin-marker {
    display: inline-block !important;
    flex-shrink: 0 !important;
    font-weight: normal !important;
    text-align: left !important;
    line-height: 1.35 !important;
  }
  .pkpknl-body p.poin-item .poin-content {
    flex: 1 1 0% !important;
    min-width: 0 !important;
    text-align: justify !important;
    text-justify: inter-word !important;
    line-height: 1.35 !important;
  }

  /* Butir Utama Level 1: 1., 2., 3. — spasi marker lebih dekat sesuai gambar acuan */
  .pkpknl-body p.poin-level-1 {
    margin-left: 0 !important;
    margin-bottom: 0.35rem !important;
  }
  .pkpknl-body p.poin-level-1 .poin-marker {
    width: 1.35rem !important; /* Rapat dan dekat dengan awal teks sesuai gambar acuan */
  }

  /* Sub-Poin Level 2: a., b., c. — sejajar dengan teks Level 1, spasi rapat */
  .pkpknl-body p.poin-level-2 {
    margin-left: 1.35rem !important; /* Sejajar dengan teks awal Level 1 */
    margin-bottom: 0.15rem !important; /* Sangat dekat antar-sub-butir seperti gambar acuan */
  }
  .pkpknl-body p.poin-level-2 .poin-marker {
    width: 1.1rem !important; /* Spasi marker rapat */
  }

  /* Sub-sub-poin Level 3: 1), i. — sejajar dengan teks Level 2 */
  .pkpknl-body p.poin-level-3 {
    margin-left: 2.45rem !important; /* Sejajar dengan teks awal Level 2 (1.35rem + 1.1rem) */
    margin-bottom: 0.15rem !important;
  }
  .pkpknl-body p.poin-level-3 .poin-marker {
    width: 1.1rem !important;
  }

  /* Sub-butir Level 4: a) — sejajar dengan teks Level 3 */
  .pkpknl-body p.poin-level-4 {
    margin-left: 3.55rem !important; /* Sejajar dengan teks awal Level 3 (2.45rem + 1.1rem) */
    margin-bottom: 0.15rem !important;
  }
  .pkpknl-body p.poin-level-4 .poin-marker {
    width: 1.1rem !important;
  }
  .pkpknl-footer-bsre {
    margin-top: 2rem;
    padding-top: 0.5rem;
    border-top: 1px solid #cbd5e1;
    font-size: 8pt;
    color: #64748b;
    font-style: italic;
    line-height: 1.35;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  @media print {
    .pkpknl-footer-bsre {
      display: none !important;
    }
  }
  .penutup-ttd-group { display: block !important; break-inside: avoid !important; page-break-inside: avoid !important; margin-top: 1rem; }
  .pkpknl-ttd { width: 20rem; margin: 1rem 0 0 auto; text-align: left; break-inside: avoid; page-break-inside: avoid; }
  .pkpknl-ttd p { margin: 0; padding: 0; line-height: 1.25; }
  .pkpknl-ttd .pkpknl-ttd-placeholder { box-sizing: border-box; height: 105px; display: flex; align-items: flex-start; text-align: left; padding-top: 34px; padding-left: 1.35cm; margin-top: 14px; margin-bottom: 0; color: #94a3b8; font-size: 9pt; }
  .pkpknl-ttd .pkpknl-ttd-name { font-weight: bold; }
  .pkpknl-tembusan { width: 100%; margin: 0.8rem 0 0; font-size: 10pt; line-height: 1.35; }
  .pkpknl-tembusan-title { font-weight: normal; margin-bottom: 0.2rem; }
  .pkpknl-tembusan-item { display: grid; grid-template-columns: 7mm minmax(0, 1fr); line-height: 1.4; }
  .pkpknl-tembusan-item.single-item { display: block; }
  table.pengantar-table { width: 100%; border-collapse: collapse; margin: 14px 0; }
  table.pengantar-table th, table.pengantar-table td { border: 1px solid #000; padding: 6px 8px; font-size: 10.5pt; text-align: left; vertical-align: top; }

  /* Surat Izin Cuti Specific Styles */
  .surat-izin-cuti-header { width: 100%; text-align: center; margin-top: 18px; margin-bottom: 24px; }
  .surat-izin-cuti-title { font-size: 12pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.35; margin: 0; }
  .surat-izin-cuti-nomor { font-size: 11pt; font-weight: normal; margin-top: 4px; line-height: 1.35; }
  .surat-izin-cuti-body { width: 100%; font-size: 11pt; line-height: 1.55; text-align: justify; text-justify: inter-word; }
  .surat-izin-cuti-p { margin: 0 0 14px 0; line-height: 1.55; }
  .surat-izin-cuti-table { width: 100%; border-collapse: collapse; margin: 0 0 14px 0; margin-left: 24px; max-width: calc(100% - 24px); }
  .surat-izin-cuti-table td { padding: 3px 0; vertical-align: top; font-size: 11pt; line-height: 1.45; }
  .surat-izin-cuti-table td.sic-label { width: 175px; white-space: nowrap; }
  .surat-izin-cuti-table td.sic-colon { width: 18px; text-align: center; }
  .surat-izin-cuti-table td.sic-val { text-align: left; }
  .surat-izin-cuti-subtable { width: 100%; border-collapse: collapse; margin: 6px 0 14px 0; margin-left: 24px; max-width: calc(100% - 24px); }
  .surat-izin-cuti-subtable td { padding: 3px 0; vertical-align: top; font-size: 11pt; line-height: 1.45; }
  .surat-izin-cuti-subtable td.sic-sub-bullet { width: 22px; }
  .surat-izin-cuti-subtable td.sic-sub-text { text-align: justify; text-justify: inter-word; }
`;

export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return url;
}

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

  // Clone content and resolve relative image URLs to absolute URLs
  const container = document.createElement("div");
  container.innerHTML = printContent.innerHTML;
  const imgs = container.getElementsByTagName("img");
  for (let i = 0; i < imgs.length; i++) {
    const src = imgs[i].getAttribute("src");
    if (src) {
      imgs[i].setAttribute("src", resolveImageUrl(src));
    }
  }

  // Collect active stylesheets and inline style blocks
  const headElements = typeof document !== "undefined"
    ? Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((el) => el.outerHTML)
        .join("\n")
    : "";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Naskah Dinas Resmi Permen Kehutanan</title>
        ${headElements}
        <style>
          ${SURAT_DINAS_BASE_CSS}
          .surat-dinas-print-root, .pkpknl-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            min-height: auto !important;
            padding: 0 !important;
          }
          .kop-surat, .pkpknl-kop {
            width: 210mm !important;
            margin: -7.5mm auto 4mm auto !important;
            text-align: center !important;
          }
          thead {
            display: table-header-group !important;
          }
          thead td {
            height: 10mm !important;
            padding: 0 !important;
            border: none !important;
          }
          tfoot {
            display: table-footer-group !important;
            height: 10mm !important;
          }
          tfoot td {
            height: 10mm !important;
            padding: 0 !important;
            border: none !important;
          }
          .bsre-placeholder,
          .pkpknl-footer-bsre {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="surat-dinas-print-root" style="width: 210mm; margin: 0 auto; background: white;">
          ${container.innerHTML}
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();

  const printImages = printWindow.document.getElementsByTagName("img");
  let loaded = 0;
  const total = printImages.length;
  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (total === 0) {
    setTimeout(triggerPrint, 300);
  } else {
    for (let i = 0; i < total; i++) {
      if (printImages[i].complete) {
        loaded++;
      } else {
        printImages[i].onload = printImages[i].onerror = () => {
          loaded++;
          if (loaded >= total) triggerPrint();
        };
      }
    }
    if (loaded >= total) {
      setTimeout(triggerPrint, 300);
    }
  }
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
    ythList,
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
    jenisCuti,
    jumlahHari,
    terbilangHari,
    tanggalMulai,
    tanggalSelesai,
    tahunCutiText,
    pegawai,
  } = data;

  const nomorText = nomor !== undefined && nomor !== null && nomor !== "" ? nomor : getDefaultNomorForTemplate(currentTemplate);
  const nomorClass = nomorText.length > 52
    ? "pkpknl-meta-nomor-extra-long"
    : nomorText.length > 40
      ? "pkpknl-meta-nomor-long"
      : "";

  const cleanTujuanDi = (tujuanDi || "Kutai Barat").replace(/^di\s*[-–—]?\s*/i, "") || "Kutai Barat";

  return (
    <div
      id="surat-dinas-print-root"
      className="surat-dinas-print-root pkpknl-page w-[210mm] max-w-[210mm] mx-auto bg-white text-black shadow-xl ring-1 ring-zinc-200 rounded-xs selection:bg-blue-100"
      style={{
        padding: "0 0 1.5cm 0",
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "11pt",
        lineHeight: "1.35",
        color: "#000",
        textAlign: "justify",
        boxSizing: "border-box",
        minHeight: "297mm",
      }}
    >
      <style jsx global>{`
        ${SURAT_DINAS_BASE_CSS}
        .surat-dinas-print-root .pkpknl-edit { outline: none; transition: background-color 0.2s; border-radius: 2px; }
        .surat-dinas-print-root .pkpknl-edit:hover { background-color: rgba(243, 244, 246, 0.7); }
        .surat-dinas-print-root .pkpknl-edit:focus { background-color: rgba(224, 242, 254, 0.8); }

        @media print {
          @page { size: A4 portrait; margin: 0; }
          @page :first { margin: 0; }
          body * { visibility: hidden; }
          .surat-dinas-print-root, .surat-dinas-print-root * { visibility: visible; }
          .surat-dinas-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .kop-surat, .pkpknl-kop {
            width: 210mm !important;
            margin: -7.5mm auto 4mm auto !important;
            text-align: center !important;
          }
          .kop-surat img, .pkpknl-kop img {
            width: 188mm !important;
            max-width: 188mm !important;
            height: auto !important;
            display: block !important;
            margin: 0 auto !important;
          }
          .surat-content {
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 1.55cm 0 2.0cm !important;
            box-sizing: border-box !important;
          }
          thead {
            display: table-header-group !important;
          }
          thead td {
            height: 10mm !important;
            padding: 0 !important;
            border: none !important;
          }
          tfoot {
            display: table-footer-group !important;
            height: 10mm !important;
          }
          tfoot td {
            height: 10mm !important;
            padding: 0 !important;
            border: none !important;
          }
          .pkpknl-edit { background: none !important; }
          .pkpknl-meta-nomor { white-space: pre !important; }
          .nota-dinas-nomor-wrapper { display: inline-block !important; min-width: 78mm !important; text-align: left !important; }
          .whitespace-pre { white-space: pre !important; }
          .pkpknl-meta-nomor-long { font-size: 10pt !important; letter-spacing: -0.2px; }
          .pkpknl-meta-nomor-extra-long { font-size: 9.5pt !important; letter-spacing: -0.3px; }
          .penutup-ttd-group { display: block !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          .bsre-placeholder,
          .pkpknl-footer-bsre,
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── Tabel Pembungkus Multi-Halaman A4 Resmi (Persis STBuilderPreview) ─── */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "100%" }} />
        </colgroup>
        <thead className="hidden print:table-header-group">
          <tr><td style={{ height: "15mm", border: "none", padding: 0 }}></td></tr>
        </thead>
        <tfoot className="print:table-footer-group">
          <tr>
            <td style={{ height: "25mm", verticalAlign: "bottom", border: "none", padding: "0 1.55cm 4mm 2.0cm" }}>
              <div className="bsre-placeholder pkpknl-footer-bsre print:hidden text-[7.5pt] text-zinc-400 dark:text-zinc-500 italic text-center leading-tight select-none pointer-events-none">
                <p className="m-0">Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik</p>
                <p className="m-0">yang diterbitkan oleh Balai Besar Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN).</p>
              </div>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr className="print:break-inside-auto" style={{ breakInside: "auto", pageBreakInside: "auto" }}>
            <td className="align-top">
              {/* Kop Surat Kementerian Kehutanan & BKSDA Kaltim (Kecuali Sertifikat/Piagam yang memiliki layout tersendiri) */}
              <div className="kop-surat pkpknl-kop" style={{ width: "100%", marginBottom: "4mm", textAlign: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveImageUrl("/kop-bksda-alamat.png")}
                  alt="Kop Surat"
                  style={{ width: "188mm", maxWidth: "188mm", height: "auto", display: "block", margin: "0 auto" }}
                />
              </div>

              {/* Surat Content dengan margin standar: Kiri 2.0cm, Kanan 1.55cm */}
              <div className="surat-content" style={{ padding: "0 1.55cm 0 2.0cm" }}>

        {/* ─── 1. NOTA DINAS & MEMORANDUM (Permen 1/2025 Hal 39 & 42) ──────── */}
        {(currentTemplate === "nota_dinas" || currentTemplate === "memorandum") && (
          <div className="w-full mt-4">
            <div className="text-center mb-3 nota-dinas-title-block" style={{ textAlign: "center" }}>
              <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0" style={{ textAlign: "center" }}>
                {currentTemplate === "nota_dinas" ? "NOTA DINAS" : "MEMORANDUM"}
              </h2>
              <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5" style={{ textAlign: "center" }}>
                <span className="nota-dinas-nomor-wrapper inline-block text-left" style={{ minWidth: "78mm", textAlign: "left" }}>
                  {currentTemplate === "nota_dinas" ? "Nomor: " : "NOMOR : "}
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    className="pkpknl-edit"
                    onBlur={(e) => onUpdateField?.("nomor", e.currentTarget.innerText)}
                  >
                    {nomorText}
                  </span>
                </span>
              </p>
            </div>

            <div className="nota-dinas-meta pb-1 mb-2 space-y-0.5 text-[11pt]" data-meta="nota-dinas">
              <div className="flex items-start">
                <span className="w-24 shrink-0 font-normal">Yth.</span>
                <span className="w-4 text-center shrink-0">:</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit flex-1 whitespace-pre-line leading-normal"
                  onBlur={(e) => onUpdateField?.("yth", e.currentTarget.innerText)}
                >
                  {yth || (ythList && ythList.length > 0 ? formatYthList(ythList) : "")}
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
                <p>{(penerimaPengantar?.idType === "NIK" ? "NIK. " : `${formatNipLabel(penerimaPengantar, true)} `) + (penerimaPengantar?.nip || "...........................................")}</p>
              </div>
              <div>
                <p>&nbsp;</p>
                <p className="font-normal mt-1">Pengirim,</p>
                <p className="font-normal">{jabatanPenandatangan || DEFAULT_KEPALA_BALAI.jabatan}</p>
                <div className="pkpknl-ttd-placeholder pkpknl-edit flex items-center justify-center text-zinc-400 italic mx-auto" style={{ height: "105px" }}>
                  {"${ttd_pengirim}"}
                </div>
                <p className="font-bold">{namaPenandatangan || DEFAULT_KEPALA_BALAI.nama}</p>
                <p>{formatNipLabel(nipPenandatangan, true)} {nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
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
              <div className="flex"><span className="w-36">Nama, {formatNipLabel(pejabatMenerangkan || nipPenandatangan)}</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan} ({pejabatMenerangkan?.nip || nipPenandatangan})</span></div>
              <div className="flex"><span className="w-36">Pangkat/Gol.</span><span className="w-4">:</span><span>{pejabatMenerangkan?.pangkatGol || "Pembina Tk. I (IV/b)"}</span></div>
              <div className="flex"><span className="w-36">Jabatan</span><span className="w-4">:</span><span>{pejabatMenerangkan?.jabatan || jabatanPenandatangan}</span></div>
            </div>

            <p className="mb-2">Dengan ini menyatakan dengan sesungguhnya, bahwa :</p>
            <div className="pl-6 space-y-1 mb-4 text-[11pt]">
              <div className="flex"><span className="w-36">Nama, {formatNipLabel(pegawaiDiterangkan)}</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama} ({pegawaiDiterangkan?.nip})</span></div>
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
              <div className="flex"><span className="w-32">{formatNipLabel(pemberiKuasa || nipPenandatangan)}</span><span className="w-4">:</span><span>{pemberiKuasa?.nip || nipPenandatangan}</span></div>
              <div className="flex"><span className="w-32">Jabatan</span><span className="w-4">:</span><span>{pemberiKuasa?.jabatan || jabatanPenandatangan}</span></div>
              <div className="flex"><span className="w-32">Alamat</span><span className="w-4">:</span><span>{pemberiKuasa?.alamat || "Samarinda"}</span></div>
            </div>

            <p className="mb-2">Memberi kuasa kepada :</p>
            <div className="pl-6 space-y-1 mb-4 text-[11pt]">
              <div className="flex"><span className="w-32">Nama</span><span className="w-4">:</span><span className="font-bold">{penerimaKuasa?.nama}</span></div>
              <div className="flex"><span className="w-32">{formatNipLabel(penerimaKuasa)}</span><span className="w-4">:</span><span>{penerimaKuasa?.nip || "-"}</span></div>
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
                  <div className="flex"><span className="w-36">Nama, {formatNipLabel(pegawaiDiterangkan)}</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama} ({pegawaiDiterangkan?.nip})</span></div>
                  <div className="flex"><span className="w-36">Pangkat/Gol.</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.pangkatGol}</span></div>
                  <div className="flex"><span className="w-36">Jabatan</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.jabatan}</span></div>
                  <div className="flex"><span className="w-36">Unit Organisasi</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.unit || "Balai KSDA Kalimantan Timur"}</span></div>
                </div>

                <p>Untuk menghadap kepada :</p>
                <div className="pl-6 space-y-1">
                  <div className="flex"><span className="w-36">Nama, {formatNipLabel(pejabatMenerangkan || nipPenandatangan)}</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan} ({pejabatMenerangkan?.nip || nipPenandatangan})</span></div>
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
                  <div className="flex"><span className="w-36">Nama, {formatNipLabel(pejabatMenerangkan || nipPenandatangan)}</span><span className="w-4">:</span><span className="font-bold">{pejabatMenerangkan?.nama || namaPenandatangan} ({pejabatMenerangkan?.nip || nipPenandatangan})</span></div>
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

        {/* ─── 5.1 SURAT IZIN CUTI RESMI (BKSDA KALTIM) ───────────────────── */}
        {currentTemplate === "surat_izin_cuti" && (
          <div className="w-full surat-izin-cuti-container text-[11pt] text-black">
            <div className="surat-izin-cuti-header text-center">
              <h2 className="surat-izin-cuti-title font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                SURAT IZIN CUTI {(jenisCuti || "TAHUNAN").toUpperCase().replace(/^CUTI\s+/i, "")}
              </h2>
              <p className="surat-izin-cuti-nomor text-[11pt] font-normal leading-snug m-0 mt-0.5">
                Nomor :{" "}
                <span
                  contentEditable
                  suppressContentEditableWarning
                  className="pkpknl-edit pkpknl-meta-nomor font-normal whitespace-pre"
                  onBlur={(e) => onUpdateField?.("nomor", e.currentTarget.innerText)}
                >
                  {nomorText}
                </span>
              </p>
            </div>

            {(() => {
              const jenisCutiClean = (jenisCuti || "Tahunan").replace(/^Cuti\s+/i, "");
              const isTahunan = jenisCutiClean.toLowerCase().includes("tahunan");
              const tipeHari = isTahunan ? "hari kerja" : "hari kalender";

              return (
                <div className="surat-izin-cuti-body text-justify">
                  <p className="surat-izin-cuti-p">
                    1. Diberikan Cuti {jenisCutiClean}{isTahunan && tahunCutiText ? ` ${tahunCutiText}` : ""} kepada {isPppk(pegawai || pegawaiDiterangkan) ? "Pegawai Pemerintah dengan Perjanjian Kerja" : "Pegawai Negeri Sipil"} :
                  </p>

                  <table className="surat-izin-cuti-table">
                    <tbody>
                      <tr>
                        <td className="sic-label">Nama</td>
                        <td className="sic-colon">:</td>
                        <td className="sic-val font-bold">{pegawai?.nama || pegawaiDiterangkan?.nama || "-"}</td>
                      </tr>
                      <tr>
                        <td className="sic-label">{formatNipLabel(pegawai || pegawaiDiterangkan)}</td>
                        <td className="sic-colon">:</td>
                        <td className="sic-val">{pegawai?.nip || pegawaiDiterangkan?.nip || "-"}</td>
                      </tr>
                      <tr>
                        <td className="sic-label">Pangkat /Gol. Ruang</td>
                        <td className="sic-colon">:</td>
                        <td className="sic-val">{pegawai?.pangkatGol || pegawaiDiterangkan?.pangkatGol || "-"}</td>
                      </tr>
                      <tr>
                        <td className="sic-label">Jabatan</td>
                        <td className="sic-colon">:</td>
                        <td className="sic-val">{pegawai?.jabatan || pegawaiDiterangkan?.jabatan || "-"}</td>
                      </tr>
                      <tr>
                        <td className="sic-label">Satuan Kerja</td>
                        <td className="sic-colon">:</td>
                        <td className="sic-val">{pegawai?.satuanKerja || pegawai?.unit || "Balai Konservasi Sumber Daya Alam Kalimantan Timur"}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="surat-izin-cuti-p">
                    Selama {jumlahHari || 0} ({terbilangHari || "..."}) {tipeHari} terhitung mulai tanggal {tanggalMulai || "..."} s.d {tanggalSelesai || "..."}, dengan ketentuan sebagai berikut :
                  </p>

                  <table className="surat-izin-cuti-subtable">
                    <tbody>
                      <tr>
                        <td className="sic-sub-bullet">a.</td>
                        <td className="sic-sub-text">
                          Selama menjalankan Cuti {jenisCutiClean} wajib menyerahkan pekerjaan pada atasan langsungnya atau pejabat lain yang ditunjuk.
                        </td>
                      </tr>
                      <tr>
                        <td className="sic-sub-bullet">b.</td>
                        <td className="sic-sub-text">
                          Setelah selesai menjalankan Cuti {jenisCutiClean} wajib melaporkan diri kepada atasan langsungnya dan bekerja kembali sebagaimana biasa.
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="surat-izin-cuti-p">
                    2. Demikian Surat Izin Cuti {jenisCutiClean} ini dibuat untuk dapat dipergunakan sebagaimana mestinya.
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ─── 6. SURAT EDARAN & INSTRUKSI & KEPUTUSAN (Hal 30, 32, 34) ─────── */}
        {(currentTemplate === "surat_edaran" || currentTemplate === "instruksi" || currentTemplate === "keputusan") && (
          <div className="w-full mt-4 text-center">
            {currentTemplate === "surat_edaran" && (
              <>
                <div className="text-left mb-4 text-[10.5pt] leading-normal">
                  <p>Yth.</p>
                  <pre className="font-sans text-[10.5pt] pl-4 whitespace-pre-wrap m-0 leading-normal">{tujuanKepada}</pre>
                </div>
                <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">SURAT EDARAN</h2>
                <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
                <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
                <h3 className="font-bold text-[11pt] uppercase leading-snug m-0 mb-4">{judulEdaran || perihal}</h3>
              </>
            )}

            {currentTemplate === "instruksi" && (
              <>
                <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                  INSTRUKSI KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
                </h2>
                <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
                <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
                <h3 className="font-bold text-[11pt] uppercase leading-snug m-0 mb-3">{judulInstruksi || perihal}</h3>
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
                <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
                  KEPUTUSAN KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
                </h2>
                <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
                <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
                <h3 className="font-bold text-[11pt] uppercase leading-snug m-0 mb-3">{judulKeputusan || perihal}</h3>
                <p className="font-bold text-[10.5pt] uppercase leading-snug m-0 mb-4">
                  KEPALA BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR,
                </p>

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
                {currentTemplate === "telaah_staf" ? "TELAAH STAF" : "LAPORAN"}
              </h2>
              <p className="font-bold text-[10.5pt] leading-snug m-0 mt-1 mb-1">TENTANG</p>
              <h3 className="font-bold text-[11pt] uppercase leading-snug m-0 mb-4">
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
            <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">
              PERJANJIAN KERJA SAMA
            </h2>
            <p className="font-bold text-[10.5pt] leading-snug m-0 mt-1 mb-1">ANTARA</p>
            <p className="font-bold text-[10.5pt] uppercase leading-snug m-0">
              BALAI KONSERVASI SUMBER DAYA ALAM KALIMANTAN TIMUR
            </p>
            <p className="font-bold text-[10.5pt] leading-snug m-0 my-1">DENGAN</p>
            <p className="font-bold text-[10.5pt] uppercase leading-snug m-0 mb-2">
              {pihakKedua?.instansi || pihakKedua?.nama || "MITRA KERJA SAMA"}
            </p>
            <p className="text-[10.5pt] font-normal leading-snug m-0 mb-2">NOMOR : {nomorText}</p>
            <p className="font-bold text-[10.5pt] leading-snug m-0 mb-1">TENTANG</p>
            <h3 className="font-bold text-[11pt] uppercase leading-snug m-0 mb-4">
              {(judulPerjanjian || perihal || "KERJA SAMA PENGELOLAAN DAN KONSERVASI SUMBER DAYA ALAM")
                .replace(/^PERJANJIAN KERJA SAMA\s+(ANTARA[\s\S]*?TENTANG\s+)?/i, "")
                .replace(/^TENTANG\s+/i, "")}
            </h3>

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
              <div className="flex"><span className="w-36">{formatNipLabel(pejabatMenerangkan || nipPenandatangan)}</span><span className="w-4">:</span><span>{pejabatMenerangkan?.nip || nipPenandatangan}</span></div>
              <div className="flex"><span className="w-36">jabatan</span><span className="w-4">:</span><span>{pejabatMenerangkan?.jabatan || jabatanPenandatangan}</span></div>
            </div>
            <p className="mt-4 mb-2">dengan ini menerangkan bahwa :</p>
            <div className="pl-6 space-y-1 mb-4 text-[11pt]">
              <div className="flex"><span className="w-36">nama</span><span className="w-4">:</span><span className="font-bold">{pegawaiDiterangkan?.nama}</span></div>
              <div className="flex"><span className="w-36">{formatNipLabel(pegawaiDiterangkan)}</span><span className="w-4">:</span><span>{pegawaiDiterangkan?.nip}</span></div>
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
              <p>1. <strong>{pihakPertama?.nama}</strong>, {formatNipLabel(pihakPertama, true)} {pihakPertama?.nip}, {pihakPertama?.jabatan}, selanjutnya disebut <strong>PIHAK PERTAMA</strong>.</p>
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
            <h2 className="font-bold text-[12pt] uppercase tracking-wider leading-snug m-0">PENGUMUMAN</h2>
            <p className="text-[11pt] font-normal leading-snug m-0 mt-0.5 mb-2">NOMOR : {nomorText}</p>
            <p className="font-bold text-[11pt] leading-snug m-0 mb-1">TENTANG</p>
            <h3 className="font-bold text-[11pt] uppercase leading-snug m-0 mb-5">
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
        {currentTemplate !== "surat_pengantar" && currentTemplate !== "surat_izin_cuti" && (
          <div className="pkpknl-body">
            {paragraf && paragraf.length > 1 ? (
              paragraf.slice(0, -1).map((pText, idx) => {
                const lvl = detectPointLevel(pText);
                if (lvl > 0) {
                  const { marker, content } = splitPointMarkerAndText(pText);
                  const lvlClass = getPointLevelClassName(lvl);
                  return (
                    <p
                      key={idx}
                      contentEditable
                      suppressContentEditableWarning
                      className={`pkpknl-edit ${lvlClass}`}
                      onBlur={(e) => {
                        const newParas = [...paragraf];
                        newParas[idx] = e.currentTarget.innerText;
                        onUpdateField?.("paragraf", newParas);
                      }}
                    >
                      <span className="poin-marker">{marker}</span>
                      <span className="poin-content">{content}</span>
                    </p>
                  );
                }
                return (
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
                );
              })
            ) : (!paragraf || paragraf.length === 0) ? (
              <p className="text-slate-400 italic">Ketik isi naskah dinas di sini...</p>
            ) : null}
          </div>
        )}

        {/* ─── GRUP PENUTUP + TANDA TANGAN + TEMBUSAN ──────────────────────── */}
        {currentTemplate !== "surat_pengantar" && (
          <div data-break-candidate="penutup-ttd" className="penutup-ttd-group" style={{ display: "block", breakInside: "avoid", pageBreakInside: "avoid" }}>
            {paragraf && paragraf.length > 0 && currentTemplate !== "surat_izin_cuti" && (
              <div className="pkpknl-body">
                {(() => {
                  const lastP = paragraf[paragraf.length - 1];
                  const lvl = detectPointLevel(lastP);
                  if (lvl > 0) {
                    const { marker, content } = splitPointMarkerAndText(lastP);
                    const lvlClass = getPointLevelClassName(lvl);
                    return (
                      <p
                        contentEditable
                        suppressContentEditableWarning
                        className={`pkpknl-edit ${lvlClass}`}
                        onBlur={(e) => {
                          const newParas = [...paragraf];
                          newParas[newParas.length - 1] = e.currentTarget.innerText;
                          onUpdateField?.("paragraf", newParas);
                        }}
                      >
                        <span className="poin-marker">{marker}</span>
                        <span className="poin-content">{content}</span>
                      </p>
                    );
                  }
                  return (
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
                      {lastP}
                    </p>
                  );
                })()}
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
                        {(pihakKedua?.idType === "NIK" || penerimaKuasa?.idType === "NIK" ? "NIK. " : `${formatNipLabel(pihakKedua || penerimaKuasa, true)} `) + (pihakKedua?.nip || penerimaKuasa?.nip)}
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
                    <p className="text-[10pt]">{formatNipLabel(pihakPertama || pemberiKuasa || nipPenandatangan, true)} {pihakPertama?.nip || pemberiKuasa?.nip || nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
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
                    <p className="text-[10pt]">{formatNipLabel(pihakKetiga || nipPenandatangan, true)} {pihakKetiga?.nip || nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Kaki Standar 1 Kolom Kanan Bawah */
              <div className="pkpknl-ttd">
                {(currentTemplate === "surat_keterangan" || currentTemplate === "surat_pernyataan" || currentTemplate === "surat_izin_cuti") && (
                  <p className="mb-1 text-black font-normal">{kotaTanggal.startsWith("Samarinda") ? kotaTanggal : `Samarinda, ${kotaTanggal}`}</p>
                )}
                {(currentTemplate === "pengumuman" || currentTemplate === "instruksi") && (
                  <div className="mb-1 text-black font-normal">
                    <p>Dikeluarkan di Samarinda</p>
                    <p>pada tanggal {kotaTanggal}</p>
                  </div>
                )}
                {(currentTemplate === "surat_edaran" || currentTemplate === "keputusan") && (
                  <div className="mb-1 text-black font-normal">
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
                <p className="pkpknl-edit">{formatNipLabel(nipPenandatangan, true)} {nipPenandatangan || DEFAULT_KEPALA_BALAI.nip}</p>
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

              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export const SuratDinasDocument = React.memo(SuratDinasDocumentComponent);
