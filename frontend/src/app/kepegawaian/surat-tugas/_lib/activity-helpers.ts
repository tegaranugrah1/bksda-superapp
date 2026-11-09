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

export function isJenisKegiatanTask(jenisOrCode?: string | null, contohFormat?: string | null): boolean {
  if (contohFormat && /\{(untuk|jenis_kegiatan|paket)\}/i.test(contohFormat)) {
    return true;
  }
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
  if (
    lower.includes("luar wilayah") ||
    lower.includes("lebih dari 1 hari") ||
    lower === "melaksanakan perjalanan dinas" ||
    lower === "perjalanan_dinas"
  ) {
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
  contohFormat?: string | null;
}

/**
 * Single source of truth untuk membangun kalimat penugasan diktum utama ("Untuk" Poin 1).
 * Mendukung pola kustom dari Master Jenis Tugas (`contohFormat`) maupun formula bawaan.
 */

const OFFICIAL_ACRONYMS = new Set([
  "BMN", "SKW", "TSL", "TWR", "KPG", "SPPD", "GPS", "BKSDA", "KSDAE", "KLHK",
  "UPT", "PEH", "ASN", "PNS", "PPNPN", "PPPK", "ATK", "DIPA", "SBM", "SIMAN", "SPD",
  "SP2D", "WRU", "SMART", "TN", "TWA", "SM", "CA", "SATS", "DN", "LN", "SATS-DN", "SATS-LN",
  "KPA", "PPK", "BPP", "BPK", "BKN", "SDM", "TU", "KPH", "KPHP", "KPHL", "BPKH",
  "KAK", "TOR", "PNBP", "SK", "SOP", "MOU", "PKS", "TIK", "IT", "BPJS", "SIMPEG", "SIASN",
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII",
  "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX",
]);

const ACRONYM_MAP = new Map<string, string>();
for (const a of OFFICIAL_ACRONYMS) {
  ACRONYM_MAP.set(a.toLowerCase(), a);
}

const SPECIAL_OFFICIAL_WORDS = new Map<string, string>([
  ["polhut", "Polhut"],
  ["kasubag", "Kasubag"],
  ["kasi", "Kasi"],
  ["kabalai", "Kabalai"],
  ["itjen", "Itjen"],
  ["gakkum", "Gakkum"],
  ["pj", "Pj"],
  ["plh", "Plh"],
  ["plt", "Plt"],
]);

const LOWERCASE_CONNECTING_WORDS = new Set([
  "dan", "atau", "serta", "dengan", "di", "ke", "dari", "pada", "dalam", "rangka",
  "untuk", "tentang", "oleh", "sebagai", "yang", "terhadap", "hingga", "sampai",
  "antar", "secara", "terkait",
]);

/**
 * Otomatis membuat huruf depan kapital (Title Case resmi) sesuai kaidah tata naskah dinas:
 * - Mengkapitalisasi setiap kata penting (e.g. "kabupaten kutai barat" -> "Kabupaten Kutai Barat", "suaka badak kelian" -> "Suaka Badak Kelian")
 * - Mengubah akronim/singkatan umum menjadi huruf kapital penuh (e.g. "bmn" -> "BMN", "skw" -> "SKW")
 * - Mempertahankan preposisi/kata hubung huruf kecil jika berada di tengah frasa (e.g. "dan", "di", "ke", "dalam", "rangka")
 * - Mendukung format teks miring (*kata*)
 */
export function capitalizeOfficialText(text?: string | null): string {
  if (!text) return "";
  return text.replace(/([^\s\-\/,\.;:\(\)]+)/g, (word, _p1, offset) => {
    let prefix = "";
    let suffix = "";
    let core = word;
    while (core.startsWith("*")) {
      prefix += "*";
      core = core.slice(1);
    }
    while (core.endsWith("*")) {
      suffix += "*";
      core = core.slice(0, -1);
    }
    if (!core) return word;

    const lower = core.toLowerCase();
    if (ACRONYM_MAP.has(lower)) return prefix + ACRONYM_MAP.get(lower)! + suffix;
    if (SPECIAL_OFFICIAL_WORDS.has(lower)) return prefix + SPECIAL_OFFICIAL_WORDS.get(lower)! + suffix;
    if (offset > 0 && LOWERCASE_CONNECTING_WORDS.has(lower)) return prefix + lower + suffix;
    return prefix + core.charAt(0).toUpperCase() + core.slice(1).toLowerCase() + suffix;
  });
}

export function buildKegiatanDiktumText({
  modeLokasi,
  jenisTugas = "",
  kotaAsal = "",
  kotaTujuan = "",
  tempatSpesifik = "",
  namaKegiatanText = "",
  untukKegiatanText = "",
  contohFormat = null,
}: BuildKegiatanDiktumParams): string {
  let effKotaAsal = kotaAsal;
  let effKotaTujuan = kotaTujuan;
  let effTempatSpesifik = tempatSpesifik;
  let rawNama = namaKegiatanText;

  // Cek apakah rawNama adalah kalimat lengkap penugasan (misal hasil copy-paste kalimat SK / DIPA):
  const fullSentenceMatch = rawNama.trim().match(
    /^Melaksanakan\s+Perjalanan\s+Dinas\s+dari\s+(.+?)\s+ke\s+(.+?)\s+dalam\s+rangka\s+(.+)$/i
  );
  if (fullSentenceMatch) {
    if (!effKotaAsal || effKotaAsal === "Samarinda") {
      effKotaAsal = fullSentenceMatch[1].trim();
    }
    if (!effKotaTujuan) {
      effKotaTujuan = fullSentenceMatch[2].trim();
    }
    let restOfActivity = fullSentenceMatch[3].trim().replace(/;$/, "");
    const diTempatMatch = restOfActivity.match(/^(.*?)\s+di\s+([^,;]+)$/i);
    if (diTempatMatch && !effTempatSpesifik) {
      restOfActivity = diTempatMatch[1].trim();
      effTempatSpesifik = diTempatMatch[2].trim();
    }
    rawNama = restOfActivity;
  }

  let cleanNama = cleanMelaksanakanKegiatanPrefix(rawNama);

  // Strip custom static prefix from contohFormat if present in cleanNama
  if (contohFormat && contohFormat.includes("{kegiatan}")) {
    const prefixBeforeKegiatan = contohFormat.split("{kegiatan}")[0]?.trim();
    if (
      prefixBeforeKegiatan &&
      !prefixBeforeKegiatan.includes("{") &&
      cleanNama.toLowerCase().startsWith(prefixBeforeKegiatan.toLowerCase())
    ) {
      cleanNama = cleanNama.slice(prefixBeforeKegiatan.length).trim();
    }
  }

  // Strip trailing effKotaTujuan or effTempatSpesifik if already appended to cleanNama to prevent duplication
  for (let i = 0; i < 2; i++) {
    if (effKotaTujuan && effKotaTujuan.trim()) {
      const escapedK = effKotaTujuan.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanNama = cleanNama.replace(new RegExp(`\\s+di\\s+${escapedK}$`, "i"), "").trim();
    }
    if (effTempatSpesifik && effTempatSpesifik.trim()) {
      const escapedT = effTempatSpesifik.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleanNama = cleanNama.replace(new RegExp(`\\s+(?:pada|di)\\s+${escapedT}$`, "i"), "").trim();
    }
  }

  const isJenisKegiatan = isJenisKegiatanTask(jenisTugas, contohFormat);

  // Bersihkan sisa placeholder mentah (misal "{paket}" dari draft lama)
  if (/^\{(paket|kegiatan|untuk|jenis_kegiatan)\}$/i.test(cleanNama.trim())) {
    cleanNama = "";
  }
  const cleanUntuk = /^\{(paket|kegiatan|untuk|jenis_kegiatan)\}$/i.test((untukKegiatanText || "").trim())
    ? ""
    : (untukKegiatanText || "").trim();

  // Format capitalized components for official letter
  const capAsal = capitalizeOfficialText(effKotaAsal.trim()) || "...";
  const capTujuan = capitalizeOfficialText(effKotaTujuan.trim()) || "...";
  const capKota = capitalizeOfficialText((effKotaTujuan || effKotaAsal || "").trim()) || "...";
  const capTempat = capitalizeOfficialText(effTempatSpesifik.trim());
  const capNama = capitalizeOfficialText(cleanNama);
  const capUntuk = capitalizeOfficialText(cleanUntuk);

  // Jika Master Jenis Tugas memiliki contohFormat kustom yang menggunakan placeholder:
  if (
    contohFormat &&
    contohFormat.trim() &&
    /\{(asal|tujuan|kota|tempat|kegiatan|untuk|jenis_kegiatan|paket)\}/i.test(contohFormat)
  ) {
    const asal = capAsal;
    const tujuan = capTujuan;
    const kota = capKota;
    let untukVal = capUntuk;
    let kegiatanVal = capNama || "...";

    if (isJenisKegiatan && !untukVal && cleanNama) {
      const match = cleanNama.match(/^(?:untuk\s+)?(.*?)\s+dalam\s+rangka\s+(.*)$/i);
      if (match) {
        untukVal = capitalizeOfficialText(match[1].trim());
        kegiatanVal = capitalizeOfficialText(match[2].trim()) || "...";
      } else {
        untukVal = "Pengawasan Pekerjaan Konstruksi";
      }
    }

    const hasPaketPlaceholder = /\{paket\}/i.test(contohFormat);
    let built = contohFormat.trim().replace(/[;,.]$/, "");
    built = built
      .replace(/\{asal\}/gi, asal)
      .replace(/\{tujuan\}/gi, tujuan)
      .replace(/\{kota\}/gi, kota);

    if (hasPaketPlaceholder) {
      // Skema DB: "untuk {kegiatan} dalam rangka {paket}" -> {kegiatan}/{untuk} = untukVal, {paket} = kegiatanVal
      built = built
        .replace(/\{(untuk|jenis_kegiatan|kegiatan)\}/gi, untukVal || "Pengawasan Pekerjaan Konstruksi")
        .replace(/\{paket\}/gi, kegiatanVal);
    } else {
      // Skema umum: "untuk {untuk} dalam rangka {kegiatan}" -> {untuk} = untukVal, {kegiatan} = kegiatanVal
      built = built
        .replace(/\{(untuk|jenis_kegiatan)\}/gi, untukVal || "Pengawasan Pekerjaan Konstruksi")
        .replace(/\{kegiatan\}/gi, kegiatanVal);
    }

    if (capTempat) {
      built = built.replace(/\{tempat\}/gi, capTempat);
    } else {
      built = built.replace(/(?:\s+(?:di|pada))?\s*\{tempat\}/gi, "");
    }

    return cleanRepeatingLocations(built.replace(/\s+/g, " ").trim());
  }

  const isDalamKawasan = !isJenisKegiatan && (modeLokasi === "dalam_kawasan" || isDalamKawasanTask(jenisTugas));
  const isMelaksanakanKegiatan =
    !isJenisKegiatan &&
    !isDalamKawasan &&
    (jenisTugas.toLowerCase().includes("melaksanakan kegiatan") ||
      jenisTugas.toLowerCase().includes("kegiatan_1_hari"));
  const isMenugaskanStafExplicit =
    !isJenisKegiatan &&
    !isDalamKawasan &&
    !isMelaksanakanKegiatan &&
    jenisTugas.toLowerCase().includes("menugaskan staf");
  const isLuarWilayah =
    !isJenisKegiatan &&
    !isDalamKawasan &&
    !isMelaksanakanKegiatan &&
    !isMenugaskanStafExplicit &&
    (modeLokasi === "luar_wilayah" ||
      jenisTugas.toLowerCase().includes("perjalanan dinas") ||
      jenisTugas.toLowerCase().includes("luar wilayah") ||
      (Boolean(kotaAsal.trim()) && Boolean(kotaTujuan.trim())));

  if (isJenisKegiatan) {
    // Formula: Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} untuk {kegiatan} dalam rangka {paket} di {tempat}
    const asal = capAsal;
    const tujuan = capTujuan;
    let kegiatan = capUntuk;
    let paket = capNama;

    if (!kegiatan) {
      const match = cleanNama.match(/^(?:untuk\s+)?(.*?)\s+dalam\s+rangka\s+(.*)$/i);
      if (match) {
        kegiatan = capitalizeOfficialText(match[1].trim());
        paket = capitalizeOfficialText(match[2].trim());
      } else {
        kegiatan = "Pengawasan Pekerjaan Konstruksi";
      }
    }

    const spesifik = capTempat ? ` di ${capTempat}` : "";
    const paketStr = paket ? ` dalam rangka ${paket}` : "";
    return `Melaksanakan Perjalanan Dinas dari ${asal} ke ${tujuan} untuk ${kegiatan}${paketStr}${spesifik}`;
  }

  if (isDalamKawasan) {
    // Formula: Melaksanakan perjalanan dinas di {kota/kabupaten} dalam rangka {kegiatan} di {kawasan/tempat spesifik}
    const kota = capKota;
    const kegiatan = capNama || "...";
    const kawasan = capTempat ? ` di ${capTempat}` : "";
    return `Melaksanakan Perjalanan Dinas di ${kota} dalam rangka ${kegiatan}${kawasan}`;
  }

  if (isLuarWilayah) {
    // Formula: Melaksanakan Perjalanan Dinas dari {asal} ke {tujuan} dalam rangka {kegiatan} di {tempat}
    const asal = capAsal;
    const tujuan = capTujuan;
    const rangka = capNama ? ` dalam rangka ${capNama}` : "";
    const spesifik = capTempat ? ` di ${capTempat}` : "";
    return `Melaksanakan Perjalanan Dinas dari ${asal} ke ${tujuan}${rangka}${spesifik}`;
  }

  if (isMelaksanakanKegiatan) {
    const tempat = capTempat ? ` pada ${capTempat}` : "";
    const kota = kotaTujuan.trim() ? ` di ${capTujuan}` : "";
    return `Melaksanakan Kegiatan ${capNama || "..."}${tempat}${kota}`;
  }

  // Default / Menugaskan Staf
  const tempat = capTempat ? ` pada ${capTempat}` : "";
  const kota = kotaTujuan.trim() ? ` di ${capTujuan}` : "";
  return `Menugaskan Staf untuk ${capNama || "..."}${tempat}${kota}`;
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
