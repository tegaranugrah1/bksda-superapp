/**
 * Helpers untuk activity prefix, location mode, dan single-day activity detection.
 */
import { SUMBER_DANA_OPTIONS } from "./constants";
import type { StExpenseTemplate } from "./types";

/**
 * Cek apakah activity prefix mengindikasikan kegiatan single-day
 * (mis. "Melaksanakan Kegiatan" di lokasi tertentu, bukan perjalanan dinas).
 */
export function isSingleDayActivityPrefix(prefix: string) {
  return prefix.includes("Melaksanakan Kegiatan") || prefix.includes("kegiatan_1_hari");
}

export function isDalamKawasanTask(jenisOrCode: string) {
  if (!jenisOrCode) return false;
  const s = jenisOrCode.toLowerCase();
  return s === "dalam_kawasan" || s.includes("dalam kawasan");
}

export function isJenisKegiatanTask(jenisOrCode?: string | null): boolean {
  if (!jenisOrCode) return false;
  const s = jenisOrCode.toLowerCase();
  return (
    s === "jenis_kegiatan" ||
    s.includes("pengawasan / pemeriksaan") ||
    s.includes("pengawasan pekerjaan") ||
    s.includes("pemeriksaan pekerjaan")
  );
}

/**
 * Normalisasi nama jenis tugas agar seragam antara master setting, template, dan builder.
 */
export function normalizeTaskTypeName(name?: string | null): string {
  if (!name) return "Perjalanan Dinas Luar Wilayah";
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("pengawasan") ||
    lower.includes("pemeriksaan pekerjaan") ||
    lower === "jenis_kegiatan"
  ) {
    return "Pengawasan / Pemeriksaan Pekerjaan";
  }
  if (lower.includes("luar wilayah") || lower.includes("lebih dari 1 hari")) {
    return "Perjalanan Dinas Luar Wilayah";
  }
  if (lower.includes("dalam kawasan")) {
    return "Perjalanan Dinas Dalam Kawasan / Wilayah";
  }
  if (lower.includes("melaksanakan kegiatan") || lower.includes("kegiatan_1_hari")) {
    return "Melaksanakan Kegiatan (1 Hari)";
  }
  if (lower.includes("menugaskan staf")) {
    return "Menugaskan Staf";
  }
  return trimmed;
}

export function cleanMelaksanakanKegiatanPrefix(text: string): string {
  if (!text) return "";
  let trimmed = text.trim();

  // Recursively remove nested "Melaksanakan Perjalanan Dinas dari ... ke ... dalam rangka "
  const pdPattern = /^Melaksanakan\s+Perjalanan\s+Dinas\s+dari\s+.*?\s+ke\s+.*?\s+dalam\s+rangka\s+/i;
  while (pdPattern.test(trimmed)) {
    trimmed = trimmed.replace(pdPattern, "").trim();
  }

  // Recursively remove nested "Melaksanakan Perjalanan Dinas dari ... ke ... untuk "
  const pdUntukPattern = /^Melaksanakan\s+Perjalanan\s+Dinas\s+dari\s+.*?\s+ke\s+.*?\s+untuk\s+/i;
  while (pdUntukPattern.test(trimmed)) {
    trimmed = trimmed.replace(pdUntukPattern, "").trim();
  }

  // Recursively remove nested "Melaksanakan perjalanan dinas di ... dalam rangka "
  const pdKawasanPattern = /^Melaksanakan\s+perjalanan\s+dinas\s+di\s+.*?\s+dalam\s+rangka\s+/i;
  while (pdKawasanPattern.test(trimmed)) {
    trimmed = trimmed.replace(pdKawasanPattern, "").trim();
  }

  // Recursively remove nested "Melaksanakan Kegiatan ... [pada/di] ..."
  const mkPattern = /^Melaksanakan\s+Kegiatan\s+/i;
  while (mkPattern.test(trimmed)) {
    trimmed = trimmed.replace(mkPattern, "").trim();
  }

  // Recursively remove nested "Menugaskan Staf untuk "
  const msPattern = /^Menugaskan\s+Staf\s*(?:untuk\s+)?/i;
  while (msPattern.test(trimmed)) {
    trimmed = trimmed.replace(msPattern, "").trim();
  }

  return cleanRepeatingLocations(trimmed);
}

/**
 * Bersihkan pengulangan frasa lokasi yang tidak sengaja terduplikasi (e.g. "di Paser di Paser di Paser")
 */
export function cleanRepeatingLocations(text: string): string {
  if (!text) return "";
  return text.replace(/(\s+(?:di|pada)\s+[^,;]+?)(?:\1)+/gi, "$1");
}

export interface BuildKegiatanDiktumParams {
  modeLokasi?: "luar_wilayah" | "dalam_kawasan" | "tempat_saja" | string;
  jenisTugas?: string;
  kotaAsal?: string;
  kotaTujuan?: string;
  tempatSpesifik?: string;
  namaKegiatanText?: string;
  untukKegiatanText?: string;
}

/**
 * Single source of truth untuk membangun kalimat penugasan diktum utama ("Untuk" Poin 1).
 */
export function buildKegiatanDiktumText({
  modeLokasi,
  jenisTugas = "",
  kotaAsal = "",
  kotaTujuan = "",
  tempatSpesifik = "",
  namaKegiatanText = "",
  untukKegiatanText = "",
}: BuildKegiatanDiktumParams): string {
  let cleanNama = cleanMelaksanakanKegiatanPrefix(namaKegiatanText);

  // Strip trailing kotaTujuan or tempatSpesifik if already appended to cleanNama to prevent duplication
  for (let i = 0; i < 2; i++) {
    if (kotaTujuan && kotaTujuan.trim()) {
      const escapedK = kotaTujuan.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanNama = cleanNama.replace(new RegExp(`\\s+di\\s+${escapedK}$`, "i"), "").trim();
    }
    if (tempatSpesifik && tempatSpesifik.trim()) {
      const escapedT = tempatSpesifik.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanNama = cleanNama.replace(new RegExp(`\\s+(?:pada|di)\\s+${escapedT}$`, "i"), "").trim();
    }
  }

  const isJenisKegiatan = isJenisKegiatanTask(jenisTugas);
  const isDalamKawasan = !isJenisKegiatan && (modeLokasi === "dalam_kawasan" || isDalamKawasanTask(jenisTugas));
  const isLuarWilayah =
    !isJenisKegiatan &&
    (modeLokasi === "luar_wilayah" ||
      (!isDalamKawasan &&
        (jenisTugas.toLowerCase().includes("perjalanan dinas") ||
          jenisTugas.toLowerCase().includes("luar wilayah"))));
  const isMelaksanakanKegiatan =
    !isJenisKegiatan &&
    !isDalamKawasan &&
    !isLuarWilayah &&
    (jenisTugas.toLowerCase().includes("melaksanakan kegiatan") ||
      jenisTugas.toLowerCase().includes("kegiatan_1_hari"));

  if (isJenisKegiatan) {
    // Formula: Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {kegiatan} dalam rangka {paket} di {tempat}
    const asal = kotaAsal.trim() || "...";
    const tujuan = kotaTujuan.trim() || "...";
    let kegiatan = (untukKegiatanText || "").trim();
    let paket = cleanNama;

    if (!kegiatan) {
      const match = cleanNama.match(/^(?:untuk\s+)?(.*?)\s+dalam\s+rangka\s+(.*)$/i);
      if (match) {
        kegiatan = match[1].trim();
        paket = match[2].trim();
      } else {
        kegiatan = "Pengawasan Pekerjaan Konstruksi";
      }
    }

    const spesifik = tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : "";
    const paketStr = paket ? ` dalam rangka ${paket}` : "";
    return `Melaksanakan Perjalanan Dinas dari ${asal} ke ${tujuan} untuk ${kegiatan}${paketStr}${spesifik}`;
  }

  if (isDalamKawasan) {
    // Formula: Melaksanakan perjalanan dinas di {kota/kabupaten} dalam rangka {kegiatan} di {kawasan/tempat spesifik}
    const kota = (kotaTujuan || kotaAsal || "").trim() || "...";
    const kegiatan = cleanNama || "...";
    const kawasan = tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : "";
    return `Melaksanakan perjalanan dinas di ${kota} dalam rangka ${kegiatan}${kawasan}`;
  }

  if (isLuarWilayah) {
    // Formula: Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} dalam rangka {kegiatan} di {tempat}
    const asal = kotaAsal.trim() || "...";
    const tujuan = kotaTujuan.trim() || "...";
    const rangka = cleanNama ? ` dalam rangka ${cleanNama}` : "";
    const spesifik = tempatSpesifik.trim() ? ` di ${tempatSpesifik.trim()}` : "";
    return `Melaksanakan Perjalanan Dinas dari ${asal} ke ${tujuan}${rangka}${spesifik}`;
  }

  if (isMelaksanakanKegiatan) {
    const tempat = tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : "";
    const kota = kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : "";
    return `Melaksanakan Kegiatan ${cleanNama || "..."}${tempat}${kota}`;
  }

  // Default / Menugaskan Staf
  const tempat = tempatSpesifik.trim() ? ` pada ${tempatSpesifik.trim()}` : "";
  const kota = kotaTujuan.trim() ? ` di ${kotaTujuan.trim()}` : "";
  return `Menugaskan Staf untuk ${cleanNama || "..."}${tempat}${kota}`;
}

/**
 * Tentukan apakah ST harus dirender sebagai kegiatan single-day:
 * - tanggal mulai === tanggal selesai
 * - DAN: prefix single-day OR template default (bukan bmn-pemeriksaan/beda-hari/plh)
 */
export function shouldRenderAsSingleDayActivity(
  prefix: string,
  startDate?: string | null,
  endDate?: string | null,
  templateType?: string | null,
) {
  return (
    Boolean(startDate) &&
    Boolean(endDate) &&
    startDate === endDate &&
    (isSingleDayActivityPrefix(prefix) ||
      !["bmn-pemeriksaan", "beda-hari", "plh"].includes(templateType || ""))
  );
}

/**
 * Build teks biaya yang sesuai dengan sumber dana + template.
 * Beberapa template (BMN, PLH) tidak punya biaya line.
 */
export function buildBiayaTextFor(
  fundingId: string,
  otherSource: string,
  letterDate: string,
  templateType?: string | null,
  customExpenseTemplates?: StExpenseTemplate[],
) {
  if (templateType === "bmn-pemeriksaan" || templateType === "plh" || fundingId === "dl1") return "";
  
  const tahun = letterDate
    ? new Date(letterDate).getFullYear().toString()
    : new Date().getFullYear().toString();

  if (customExpenseTemplates && customExpenseTemplates.length > 0) {
    const dyn = customExpenseTemplates.find(
      (t) => t.code === fundingId || String(t.id) === fundingId || t.name.toLowerCase() === fundingId.toLowerCase()
    );
    if (dyn) {
      if (!dyn.biaya_text) return "";
      return dyn.biaya_text.replace(/{tahun}/g, tahun);
    }
  }

  const opt = SUMBER_DANA_OPTIONS.find((o) => o.id === fundingId);
  if (opt) {
    if (!opt.biayaText) return "";
    return opt.biayaText.replace(/{tahun}/g, tahun);
  }
  if (fundingId === "other") {
    return otherSource ? `Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada ${otherSource};` : "";
  }
  return "Segala biaya yang timbul akibat Surat Tugas ini dibebankan pada anggaran yang tersedia;";
}
