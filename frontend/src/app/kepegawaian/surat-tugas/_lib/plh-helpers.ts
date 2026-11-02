/**
 * Helper functions untuk template PLH (Pelaksana Harian).
 */
import type { Employee } from "./types";
import {
  PLH_WILAYAH_PLACEHOLDER,
  PLH_KEGIATAN_KASI_PLACEHOLDER,
  PLH_NOMOR_INDUK_PLACEHOLDERS,
  PLH_TANGGAL_INDUK_PLACEHOLDERS,
  PLH_PEJABAT_PLACEHOLDERS,
  PLH_KEGIATAN_PEJABAT_PLACEHOLDERS,
  PLH_KASUBBAG_TU_TITLE,
} from "./constants";

export type PlhTargetRole =
  | "kasubbag_tu"
  | "seksi_1"
  | "seksi_2"
  | "seksi_3"
  | "custom";

export interface PlhTargetOption {
  id: PlhTargetRole;
  label: string;
  shortLabel: string;
  pejabatTitle: string;
  defaultLocation: string;
  wilayah: string;
}

export const PLH_TARGET_OPTIONS: PlhTargetOption[] = [
  {
    id: "kasubbag_tu",
    label: "Kepala Subbagian Tata Usaha",
    shortLabel: "Kasubbag TU",
    pejabatTitle: PLH_KASUBBAG_TU_TITLE,
    defaultLocation: "Samarinda",
    wilayah: "Balai Samarinda",
  },
  {
    id: "seksi_1",
    label: "Kepala Seksi KSDA Wilayah I (Berau)",
    shortLabel: "Kasi Wilayah I",
    pejabatTitle: "Kepala Seksi Konservasi Sumber Daya Alam Wilayah I",
    defaultLocation: "Wilayah I Berau",
    wilayah: "I",
  },
  {
    id: "seksi_2",
    label: "Kepala Seksi KSDA Wilayah II (Tenggarong)",
    shortLabel: "Kasi Wilayah II",
    pejabatTitle: "Kepala Seksi Konservasi Sumber Daya Alam Wilayah II",
    defaultLocation: "Wilayah II Tenggarong",
    wilayah: "II",
  },
  {
    id: "seksi_3",
    label: "Kepala Seksi KSDA Wilayah III (Balikpapan)",
    shortLabel: "Kasi Wilayah III",
    pejabatTitle: "Kepala Seksi Konservasi Sumber Daya Alam Wilayah III",
    defaultLocation: "Wilayah III Balikpapan",
    wilayah: "III",
  },
];

export function isKasubbagTuPosition(text?: string | null): boolean {
  const s = (text || "").toLowerCase();
  return (
    s.includes("kepala subbagian tata usaha") ||
    s.includes("subbagian tata usaha") ||
    s.includes("kasubag tu") ||
    s.includes("kasubbag tu") ||
    s.includes("kepala subbagian tu")
  );
}

export function detectPlhTargetRole(positionOrDept?: string | null): PlhTargetRole {
  const s = (positionOrDept || "").toLowerCase();
  if (isKasubbagTuPosition(s)) {
    return "kasubbag_tu";
  }
  if (s.includes("wilayah i ") || s.includes("wilayah 1") || s.includes("berau")) {
    return "seksi_1";
  }
  if (s.includes("wilayah ii ") || s.includes("wilayah 2") || s.includes("tenggarong")) {
    return "seksi_2";
  }
  if (s.includes("wilayah iii ") || s.includes("wilayah 3") || s.includes("balikpapan")) {
    return "seksi_3";
  }
  return "seksi_1";
}

export function getPlhTargetOption(role: PlhTargetRole): PlhTargetOption {
  return PLH_TARGET_OPTIONS.find((opt) => opt.id === role) || PLH_TARGET_OPTIONS[0];
}

/**
 * Extract nama wilayah dari field `position` pegawai.
 * Contoh: "Kepala Seksi KSDA Wilayah III Balikpapan" → "III Balikpapan".
 */
export function extractPlhWilayahFromPosition(position?: string | null) {
  const text = (position || "").trim();
  if (isKasubbagTuPosition(text)) {
    return "Balai Samarinda";
  }
  const match = text.match(/Seksi\s+(?:Konservasi\s+Sumber\s+Daya\s+Alam|KSDA)?\s*Wilayah\s+([^()]+)/i);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }
  const fallbackMatch = text.match(/Seksi\s+KSDA\s+Wilayah\s+(.+)$/i);
  return fallbackMatch?.[1]?.trim() || text;
}

/**
 * Bersihkan teks kegiatan Kepala Seksi / Kasubbag TU dari suffix "selama X (kata) hari terhitung..."
 * yang biasanya di-append oleh `buildUntukText`.
 */
export function cleanPlhKegiatanKasi(text?: string | null) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/,?\s*selama\s+\d+\s*\([^)]+\)\s*(?:hari(?:\s+kerja)?\s+)?terhitung.*?(?:;|\.)?$/i, "")
    .replace(/[;.\s]+$/, "")
    .trim();
}

/**
 * Format dan sanitasi teks kegiatan Pejabat untuk dimasukkan ke dalam kalimat template Menimbang.
 */
export function formatPlhKegiatanForTemplate(templateSentence: string, kegiatan: string): string {
  const cleanKegiatan = cleanPlhKegiatanKasi(kegiatan);
  if (!cleanKegiatan) return "...";

  let beforePlaceholder = "";
  for (const ph of PLH_KEGIATAN_PEJABAT_PLACEHOLDERS) {
    if (templateSentence.includes(ph)) {
      beforePlaceholder = templateSentence.split(ph)[0] || "";
      break;
    }
  }

  const hasMelaksanakanBefore =
    /\bmelaksanakan\s*$/i.test(beforePlaceholder.trim()) ||
    /\bmelaksanakan\b/i.test(beforePlaceholder.slice(-25));

  const startsWithMelaksanakan = /^melaksanakan\b/i.test(cleanKegiatan);

  if (hasMelaksanakanBefore) {
    if (startsWithMelaksanakan) {
      const stripped = cleanKegiatan.replace(/^melaksanakan\s+/i, "").trim();
      return stripped || cleanKegiatan;
    }
    return cleanKegiatan;
  } else {
    if (startsWithMelaksanakan) {
      return cleanKegiatan.charAt(0).toLowerCase() + cleanKegiatan.slice(1);
    }
    if (/^[A-Z][a-z]/.test(cleanKegiatan)) {
      return cleanKegiatan.charAt(0).toLowerCase() + cleanKegiatan.slice(1);
    }
    return cleanKegiatan;
  }
}

export interface PlhPlaceholderContext {
  targetRole?: PlhTargetRole;
  pejabatTitle?: string | null;
  wilayah?: string | null;
  kegiatanKasi?: string | null;
  nomorInduk?: string | null;
  tanggalInduk?: string | null;
}

/**
 * Ganti semua jenis placeholder PLH di teks ({pejabat_struktural}, {wilayah}, {kegiatan pejabat}, {nomor surat induk}, {tanggal surat induk}).
 */
export function replacePlhAllPlaceholders(text: string, context: PlhPlaceholderContext): string {
  if (!text) return "";
  let result = text;

  const isKasubbag =
    context.targetRole === "kasubbag_tu" ||
    isKasubbagTuPosition(context.pejabatTitle) ||
    isKasubbagTuPosition(context.wilayah);

  const activePejabatTitle =
    context.pejabatTitle?.trim() ||
    (isKasubbag
      ? PLH_KASUBBAG_TU_TITLE
      : `Kepala Seksi Konservasi Sumber Daya Alam Wilayah ${context.wilayah?.trim() || "..."}`);

  // 1. Placeholder Pejabat Struktural Dinamis
  for (const ph of PLH_PEJABAT_PLACEHOLDERS) {
    if (result.includes(ph)) {
      result = result.split(ph).join(activePejabatTitle);
    }
  }

  // 2. Konversi klausul struktural (Kasubbag TU vs Seksi Wilayah)
  if (isKasubbag) {
    result = result
      .replace(/Kepala\s+Seksi\s+(?:Konservasi\s+Sumber\s+Daya\s+Alam|KSDA)\s+Wilayah\s+(?:\{wilayah\}|I{1,3}|[1-3])(?:\s+(?:Berau|Tenggarong|Balikpapan|Samarinda))?/gi, PLH_KASUBBAG_TU_TITLE)
      .replace(/Kepala\s+Seksi\s+Konservasi\s+Sumber\s+Daya\s+Alam\s+Wilayah\s+\{wilayah\}/gi, PLH_KASUBBAG_TU_TITLE)
      .replace(/Kepala\s+Seksi\s+KSDA\s+Wilayah\s+\{wilayah\}/gi, PLH_KASUBBAG_TU_TITLE);
  } else {
    result = result
      .replace(/Kepala\s+Subbagian\s+Tata\s+Usaha(?:\s+Balai\s+Konservasi\s+Sumber\s+Daya\s+Alam\s+Kalimantan\s+Timur)?/gi, activePejabatTitle)
      .replace(/Kepala\s+Seksi\s+(?:Konservasi\s+Sumber\s+Daya\s+Alam|KSDA)\s+Wilayah\s+(?:\{wilayah\}|I{1,3}|[1-3])(?:\s+(?:Berau|Tenggarong|Balikpapan|Samarinda))?/gi, activePejabatTitle);
  }

  // 3. Placeholder Wilayah
  if (result.includes(PLH_WILAYAH_PLACEHOLDER)) {
    result = result.split(PLH_WILAYAH_PLACEHOLDER).join(context.wilayah?.trim() || "...");
  }

  // 4. Placeholder Kegiatan Pejabat
  const formattedKegiatan = formatPlhKegiatanForTemplate(result, context.kegiatanKasi || "");
  for (const ph of PLH_KEGIATAN_PEJABAT_PLACEHOLDERS) {
    if (result.includes(ph)) {
      result = result.split(ph).join(formattedKegiatan);
    }
  }

  // 5. Placeholder Nomor & Tanggal Induk
  for (const ph of PLH_NOMOR_INDUK_PLACEHOLDERS) {
    if (result.includes(ph)) {
      result = result.split(ph).join(context.nomorInduk?.trim() || "...");
    }
  }

  for (const ph of PLH_TANGGAL_INDUK_PLACEHOLDERS) {
    if (result.includes(ph)) {
      result = result.split(ph).join(context.tanggalInduk?.trim() || "...");
    }
  }

  return result;
}

/**
 * Normalisasi data pegawai dari API ke shape Employee yang konsisten.
 */
export function normalizeEmployeeForSelection(employee: Employee): Employee {
  return {
    ...employee,
    nama_lengkap: employee.nama_lengkap || employee.name || "",
    jabatan: employee.jabatan || employee.position || "",
  };
}
