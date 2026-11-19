// Portable letter wording mirrors the web activity helper; parity is regression-tested.
/**
 * Helpers untuk activity prefix, location mode, dan single-day activity detection.
 */

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


export interface PortalEmployee {
  id: string | number;
  name: string;
  nip: string;
  department?: string;
  position?: string;
  is_seksi?: boolean;
  seksi_wilayah?: string | null;
}
export interface PortalTaskType {
  id?: number;
  nama: string;
  kode: string;
  mode_lokasi: "luar_wilayah" | "dalam_kawasan" | "tempat_saja";
  aturan_durasi: "fleksibel" | "wajib_1_hari";
  default_sertakan_laporan: boolean;
  contoh_format?: string | null;
}
export const DEFAULT_TASK_TYPES: PortalTaskType[] = [
  { nama: "Perjalanan Dinas Luar Wilayah", kode: "luar_wilayah", mode_lokasi: "luar_wilayah", aturan_durasi: "fleksibel", default_sertakan_laporan: true },
  { nama: "Perjalanan Dinas Dalam Kawasan / Wilayah", kode: "dalam_kawasan", mode_lokasi: "dalam_kawasan", aturan_durasi: "fleksibel", default_sertakan_laporan: true },
  { nama: "Melaksanakan Kegiatan (1 Hari)", kode: "kegiatan_1_hari", mode_lokasi: "tempat_saja", aturan_durasi: "wajib_1_hari", default_sertakan_laporan: true },
  { nama: "Menugaskan Staf", kode: "staf", mode_lokasi: "tempat_saja", aturan_durasi: "fleksibel", default_sertakan_laporan: true },
  { nama: "Pengawasan / Pemeriksaan Pekerjaan", kode: "jenis_kegiatan", mode_lokasi: "luar_wilayah", aturan_durasi: "fleksibel", default_sertakan_laporan: true },
];
export const DEFAULT_FUNDING = [
  "DIPA", "Dana Hibah FOLU Net Sink 2030 (NC 2&3)", "Dana Kerjasama KJA", "Dana Kerjasama MJA",
  "Dana Kerjasama COP", "Dana Kerjasama PT. Tjiwi Kimia Tbk.", "Dana Kerjasama BOSF",
  "Dana Kerjasama CAN", "Dana Kerjasama ALeRT", "DL 1 / Tidak ada biaya",
].map(name => ({ id: name, label: name })).concat({ id: "other", label: "Lainnya" });
export function isSectionEmployee(emp: PortalEmployee): boolean {
  if (typeof emp.is_seksi === "boolean") return emp.is_seksi;
  const dept = (emp.department || "").toLowerCase();
  return /seksi|skw|wilayah|berau|tenggarong|balikpapan/.test(dept) && !dept.includes("balai");
}
export function isStructuralEmployee(emp: PortalEmployee): boolean {
  return /kepala seksi|kepala subbagian|kasubag/.test((emp.position || "").toLowerCase());
}
export function detectDeparture(employees: PortalEmployee[]): string {
  const cities = [...new Set(employees.map(emp => {
    if (emp.seksi_wilayah === "III") return "Balikpapan";
    if (emp.seksi_wilayah === "II") return "Tenggarong";
    if (emp.seksi_wilayah === "I") return "Berau";
    const text = `${emp.department || ""} ${emp.position || ""}`.toLowerCase();
    if (/wilayah iii|wil iii|seksi iii|skw iii|seksi 3|balikpapan/.test(text)) return "Balikpapan";
    if (/wilayah ii|wil ii|seksi ii|skw ii|seksi 2|tenggarong/.test(text)) return "Tenggarong";
    if (/wilayah i|wil i|seksi i|skw i|seksi 1|berau/.test(text)) return "Berau";
    return "Samarinda";
  }))];
  if (!cities.length) return "Samarinda";
  if (cities.length === 1) return cities[0];
  return `${cities.slice(0, -1).join(", ")} dan ${cities[cities.length - 1]}`;
}
export type PersonDates = Record<string, { mulai: string; selesai: string }>;
export interface PortalAssignmentDraft extends BuildKegiatanDiktumParams {
  employees: PortalEmployee[];
  taskType: PortalTaskType;
  tanggalMulai: string;
  tanggalSelesai: string;
  sumberDana: string;
  sumberDanaOther: string;
  keterangan: string;
  namaPlh: string;
  tandaSetuju: "" | "sudah" | "belum";
  bedaHari: boolean;
  employeeDates: PersonDates;
  jumlahBuruh: number;
}
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validatePortalAssignment(d: PortalAssignmentDraft): string | null {
  if (!d.employees.length || d.employees.length > 50) return "Pilih 1 sampai 50 pegawai untuk ditugaskan.";
  if ((d.namaKegiatanText || "").trim().length < 5) return "Nama kegiatan / maksud tugas minimal 5 karakter.";
  if (d.taskType.mode_lokasi === "luar_wilayah" && !d.kotaAsal?.trim()) return "Kota / lokasi asal wajib diisi.";
  if (d.taskType.mode_lokasi !== "tempat_saja" && !d.kotaTujuan?.trim()) return "Kota / kabupaten tujuan wajib diisi.";
  if (!d.kotaTujuan?.trim() && !d.tempatSpesifik?.trim()) return "Isi kota atau tempat pelaksanaan tugas.";
  if (isJenisKegiatanTask(d.taskType.nama, d.taskType.contoh_format) && !d.untukKegiatanText?.trim()) return "Isi jenis pengawasan / pemeriksaan pekerjaan.";
  if (!isValidDate(d.tanggalMulai) || !isValidDate(d.tanggalSelesai)) return "Isi tanggal mulai dan selesai yang valid.";
  if (d.tanggalSelesai < d.tanggalMulai) return "Tanggal selesai tidak boleh mendahului tanggal mulai.";
  if (d.taskType.aturan_durasi === "wajib_1_hari" && d.tanggalMulai !== d.tanggalSelesai) return "Jenis kegiatan ini hanya untuk satu hari.";
  if (!d.sumberDana || (d.sumberDana === "other" && !d.sumberDanaOther.trim())) return "Lengkapi sumber pembebanan dana.";
  if (d.employees.some(isStructuralEmployee) && !d.namaPlh.trim()) return "Isi nama PLH untuk pejabat struktural yang ditugaskan.";
  if (d.employees.some(isSectionEmployee) && !d.tandaSetuju) return "Pilih status persetujuan Kepala Seksi.";
  if (!Number.isInteger(d.jumlahBuruh) || d.jumlahBuruh < 0 || d.jumlahBuruh > 100) return "Jumlah tenaga lapangan harus antara 1 dan 100 orang.";
  if (d.bedaHari) {
    for (const emp of d.employees) {
      const dates = d.employeeDates[String(emp.id)];
      if (!dates || !isValidDate(dates.mulai) || !isValidDate(dates.selesai)) return `Lengkapi jadwal ${emp.name}.`;
      if (dates.selesai < dates.mulai) return `Tanggal selesai ${emp.name} tidak boleh sebelum tanggal mulai.`;
      if (dates.mulai < d.tanggalMulai || dates.selesai > d.tanggalSelesai) return `Jadwal ${emp.name} harus berada dalam periode penugasan.`;
      if (d.taskType.aturan_durasi === "wajib_1_hari" && dates.mulai !== dates.selesai) return `Jadwal ${emp.name} harus satu hari.`;
    }
  }
  return null;
}
export function personalAssignmentEntries(d: PortalAssignmentDraft): [string, string][] {
  const text = buildKegiatanDiktumText({ ...d, jenisTugas: d.taskType.nama, modeLokasi: d.taskType.mode_lokasi, contohFormat: d.taskType.contoh_format });
  const values: [string, string][] = [
    ["maksud_tujuan", text], ["nama_kegiatan", text],
    ["tempat_tujuan", d.tempatSpesifik?.trim() || d.kotaTujuan?.trim() || d.kotaAsal?.trim() || "Kalimantan Timur"],
    ["tanggal_mulai", d.tanggalMulai], ["tanggal_selesai", d.tanggalSelesai], ["sumber_dana", d.sumberDana],
    ["template_type", d.bedaHari ? "beda-hari" : "standard"], ["jumlah_buruh", String(d.jumlahBuruh)],
    ["sertakan_laporan", (d.taskType.default_sertakan_laporan ?? true) ? "1" : "0"],
    ["has_seksi_employee", d.employees.some(isSectionEmployee) ? "1" : "0"],
  ];
  if (d.taskType.id) values.push(["task_type_id", String(d.taskType.id)]);
  if (d.sumberDana === "other") values.push(["sumber_dana_other", d.sumberDanaOther.trim()]);
  if (d.namaPlh && d.employees.some(isStructuralEmployee)) values.push(["nama_plh", d.namaPlh.trim()]);
  if (d.tandaSetuju && d.employees.some(isSectionEmployee)) values.push(["tanda_setuju", d.tandaSetuju]);
  let notes = d.keterangan.trim();
  if (d.bedaHari) {
    values.push(["template_snapshot[configuration][show_departure_column]", "0"]);
    const people = [...d.employees, ...Array.from({ length: d.jumlahBuruh }, (_, i) => ({ id: `pm-${i + 1}`, name: "PM" }))];
    const lines = people.map((emp, i) => {
      const range = d.employeeDates[String(emp.id)] || { mulai: d.tanggalMulai, selesai: d.tanggalSelesai };
      return `${i + 1}. ${emp.name}: ${formatPortalDate(range.mulai)} s/d ${formatPortalDate(range.selesai)}`;
    });
    notes += `${notes ? "\n\n" : ""}[Jadwal Personel Berbeda Hari]:\n${lines.join("\n")}`;
  }
  if (notes) values.push(["keterangan", notes]);
  d.employees.forEach((emp, i) => {
    values.push([`employees[${i}][id]`, String(emp.id)]);
    if (d.bedaHari) {
      const dates = d.employeeDates[String(emp.id)];
      values.push([`employees[${i}][tanggal_mulai]`, dates.mulai], [`employees[${i}][tanggal_selesai]`, dates.selesai]);
    }
  });
  return values;
}
export function formatPortalDate(value: string): string {
  if (!isValidDate(value)) return value || "Pilih tanggal";
  const [year, month, day] = value.split("-");
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}
export function validateAssignmentFile(file: { name: string; size?: number; mimeType?: string | null }): string | null {
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name) || (file.mimeType && !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.mimeType))) return "Gunakan PDF, JPG, PNG atau WebP.";
  return file.size && file.size > 10 * 1024 * 1024 ? "Ukuran berkas maksimal 10 MB." : null;
}
