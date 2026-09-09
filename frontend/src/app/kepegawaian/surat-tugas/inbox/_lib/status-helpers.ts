/**
 * Helpers untuk styling dan label status Surat Tugas di Inbox.
 */

export function getStatusStyle(status: string) {
  switch (status) {
    case "draft":
      return "bg-slate-50 dark:bg-slate-500/10 text-slate-500 border-slate-200 dark:border-slate-500/20";
    case "pending":
      return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20";
    case "approved":
      return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20";
    case "completed":
      return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20";
    case "rejected":
      return "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20";
    default:
      return "bg-slate-50 dark:bg-slate-500/10 text-slate-500 border-slate-100 dark:border-slate-500/20";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending":
      return "Menunggu Persetujuan";
    case "approved":
      return "Diterbitkan";
    case "completed":
      return "Selesai";
    case "rejected":
      return "Ditolak";
    default:
      return status;
  }
}

export function getResolvedTempatTujuan(letter: { tempat_tujuan?: string | null; maksud_tujuan?: string | null }): string {
  if (letter.tempat_tujuan && letter.tempat_tujuan.trim()) {
    return letter.tempat_tujuan;
  }
  const text = letter.maksud_tujuan || "";
  if (text.includes(" ke ")) {
    const keParts = text.split(" ke ")[1];
    if (keParts) {
      const dest = keParts.split(" dalam rangka ")[0]?.split(" di ")[0]?.trim();
      if (dest) return dest;
    }
  }
  if (text.includes(" di ")) {
    const diParts = text.split(" di ");
    const dest = diParts[diParts.length - 1]?.trim();
    if (dest) return dest;
  }
  if (text.includes(" pada ")) {
    const padaParts = text.split(" pada ")[1];
    if (padaParts) {
      const dest = padaParts.split(" di ")[0]?.trim();
      if (dest) return dest;
    }
  }
  return "-";
}

/**
 * Mengekstrak inti kegiatan ("dalam rangka ...") dari teks maksud dan tujuan perjalanan dinas.
 * Contoh input: "Melaksanakan Perjalanan Dinas dari Samarinda ke Kabupaten Kutai Barat dalam rangka Kegiatan Smart Patrol di Suaka Marga Satwa Kelian, selama 4 (empat) hari..."
 * Contoh output: "Kegiatan Smart Patrol di Suaka Marga Satwa Kelian"
 */
export function extractDalamRangka(text?: string | null): string {
  if (!text) return "-";
  const clean = text.trim();

  // 1. Cek apakah ada frasa "dalam rangka"
  const match = clean.match(/dalam\s+rangka\s+([^;]+)/i);
  if (match && match[1]) {
    let result = match[1].trim();
    // Potong akhiran seperti: ", selama ...", "; Membuat laporan...", "; Sumber dana...", "; Segala biaya..."
    result = result.replace(/,?\s*selama\s+\d+.*$/i, "");
    result = result.replace(/,?\s*selama\s+.*$/i, "");
    result = result.replace(/;\s*(?:Membuat|Sumber|Segala|Laporan).*$/i, "");
    result = result.replace(/[;,\.]\s*$/, "").trim();
    if (result) {
      return result.charAt(0).toUpperCase() + result.slice(1);
    }
  }

  // 2. Jika tidak ada frasa "dalam rangka", bersihkan awalan boilerplate "Melaksanakan ..."
  let fallback = clean.split("\n")[0].trim();
  fallback = fallback.replace(/^Melaksanakan\s+(?:Perjalanan\s+Dinas\s+)?/i, "");
  fallback = fallback.replace(/,?\s*selama\s+.*$/i, "");
  fallback = fallback.replace(/;\s*(?:Membuat|Sumber|Segala|Laporan).*$/i, "");
  fallback = fallback.replace(/[;,\.]\s*$/, "").trim();

  return fallback ? fallback.charAt(0).toUpperCase() + fallback.slice(1) : clean;
}

/**
 * Membersihkan teks maksud & tujuan agar hanya menyisakan konteks perjalanan dinas
 * (memotong bagian boilerplate "; Membuat laporan..." dan "Segala biaya/Sumber dana...").
 */
export function cleanMaksudTujuan(text?: string | null): string {
  if (!text) return "";
  let clean = text.trim();
  clean = clean.split(/(?:;?\s*Membuat\s+laporan)/i)[0].trim();
  clean = clean.split(/(?:;?\s*(?:Segala\s+biaya|Sumber\s+dana))/i)[0].trim();
  clean = clean.replace(/[;,\s]+$/, "").trim();
  return clean ? clean + "." : "";
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Format rentang tanggal dinas lengkap (contoh: "24 s/d 27 Agu 2026" atau "19 Agu 2026").
 */
export function formatAssignmentDateRange(
  startStr?: string | null,
  endStr?: string | null,
  fallbackStr?: string | null
): string {
  const parse = (s: string) => {
    const cleaned = s.split("T")[0].trim();
    const parts = cleaned.split("-");
    if (parts.length === 3) {
      return {
        y: parseInt(parts[0], 10),
        m: parseInt(parts[1], 10) - 1,
        d: parseInt(parts[2], 10),
      };
    }
    const dt = new Date(s);
    return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() };
  };

  if (!startStr && !endStr) {
    if (!fallbackStr) return "-";
    const f = parse(fallbackStr);
    return `${f.d} ${SHORT_MONTHS[f.m]} ${f.y}`;
  }

  if (startStr && !endStr) {
    const s = parse(startStr);
    return `${s.d} ${SHORT_MONTHS[s.m]} ${s.y}`;
  }
  if (!startStr && endStr) {
    const e = parse(endStr);
    return `${e.d} ${SHORT_MONTHS[e.m]} ${e.y}`;
  }

  if (startStr && endStr) {
    const s = parse(startStr);
    const e = parse(endStr);

    if (s.y === e.y && s.m === e.m && s.d === e.d) {
      return `${s.d} ${SHORT_MONTHS[s.m]} ${s.y}`;
    }
    if (s.y === e.y && s.m === e.m) {
      return `${s.d} s/d ${e.d} ${SHORT_MONTHS[e.m]} ${s.y}`;
    }
    if (s.y === e.y) {
      return `${s.d} ${SHORT_MONTHS[s.m]} s/d ${e.d} ${SHORT_MONTHS[e.m]} ${e.y}`;
    }
    return `${s.d} ${SHORT_MONTHS[s.m]} ${s.y} s/d ${e.d} ${SHORT_MONTHS[e.m]} ${e.y}`;
  }

  return "-";
}

/**
 * Singkat tampilan sumber dana untuk kolom tabel inbox (misal: "DIPA", "FOLU", "MITRA", dll).
 */
export function formatShortSumberDana(sumberDana?: string | null): string {
  if (!sumberDana) return "-";
  const s = sumberDana.toUpperCase().trim();
  if (s.includes("FOLU")) return "FOLU";
  if (s.includes("DIPA")) return "DIPA";
  if (s.includes("MITRA")) return "MITRA";
  if (s.includes("APBD")) return "APBD";
  if (s.includes("SWADAYA")) return "SWADAYA";
  if (s.includes("KERJASAMA")) return "KERJASAMA";
  if (s.includes("DL 1") || s.includes("TIDAK ADA")) return "NON-BIAYA";
  return s.length > 8 ? s.substring(0, 8) : s;
}

/**
 * Format nama resmi/panjang sumber dana untuk tampilan detail surat tugas
 * (sesuai template resmi di http://localhost:3000/surat-tugas).
 */
export function formatFormalSumberDana(sumberDana?: string | null, other?: string | null): string {
  if (!sumberDana) return "-";
  const s = sumberDana.trim();
  const lower = s.toLowerCase();

  // Jika sudah nama lengkap resmi yang spesifik, kembalikan langsung
  if (s.length > 20 && !lower.startsWith("folu") && !lower.startsWith("dipa")) {
    return s;
  }

  if (lower.includes("folu")) {
    return "Dana Hibah FOLU Net Sink 2030 (NC 2&3)";
  }
  if (lower.includes("dipa")) {
    return "DIPA Balai KSDA Kalimantan Timur (693614)";
  }
  if (lower.includes("kja") || lower.includes("kideco")) {
    return "RKT Kerjasama PT Kideco Jaya Agung";
  }
  if (lower.includes("mja") || lower.includes("multi_jayantara") || lower.includes("jayantara")) {
    return "RKT Kerjasama PT Multi Jayantara Abadi";
  }
  if (lower.includes("cop")) {
    return "Biaya Kerjasama COP (Centre for Orangutan Protection)";
  }
  if (lower.includes("tjiwi")) {
    return "Anggaran PKS PT Pabrik Kertas Tjiwi Kimia Tbk";
  }
  if (lower.includes("bosf")) {
    return "RKT Kerjasama Yayasan BOSF";
  }
  if (lower.includes("can")) {
    return "Biaya Kerjasama CAN (Conservation Action Network)";
  }
  if (lower.includes("alert")) {
    return "RKT Kerjasama ALeRT (Aliansi Lestari Rimba Terpadu)";
  }
  if (lower.includes("dl1") || lower.includes("dl 1") || lower.includes("tidak ada") || lower.includes("tanpa biaya")) {
    return "DL 1 / Tanpa Biaya";
  }
  if (lower === "other" || lower === "lainnya") {
    return other?.trim() ? `Lainnya (${other.trim()})` : "Lainnya";
  }

  return s;
}


