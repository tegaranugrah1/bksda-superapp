import type { ThemeColors } from "@/theme/ThemeContext";

export type ToneKey = "accent" | "info" | "warning" | "success" | "danger" | "neutral";

export function getTonePalette(colors: ThemeColors, tone: ToneKey) {
  const map = {
    accent: { bg: colors.accentSoft, fg: colors.accentFg, border: colors.accentSoftBorder },
    info: { bg: colors.infoBg, fg: colors.infoFg, border: colors.infoBorder },
    warning: { bg: colors.warningBg, fg: colors.warningFg, border: colors.warningBorder },
    success: { bg: colors.successBg, fg: colors.successFg, border: colors.successBorder },
    danger: { bg: colors.dangerBg, fg: colors.dangerFg, border: colors.dangerBorder },
    neutral: { bg: colors.neutralBg, fg: colors.neutralFg, border: colors.neutralBorder },
  };
  return map[tone];
}

export function extractSuratTugasDalamRangka(text?: string | null, tempatTujuan?: string | null): string {
  const firstLine = (text || "").trim().split(/\r?\n/)[0]?.split(";")[0]?.trim() || "";
  if (!firstLine) return "";

  let summary = firstLine
    .replace(/,\s*selama\s+\d+(?:\s*\([^)]+\))?\s*hari\b.*$/i, "")
    .replace(/,\s*(?:terhitung\s+mulai|pada\s+tanggal)\b.*$/i, "")
    .trim();

  const rangkaMatch = summary.match(/\bdalam\s+rangka\s+(.+)$/i);
  summary = rangkaMatch
    ? rangkaMatch[1].trim()
    : summary
        .replace(
          /^(?:melaksanakan\s+(?:perjalanan\s+dinas(?:\s+dari\s+.+?\s+ke\s+.+?)?(?:\s+untuk)?|kegiatan)|menugaskan\s+staf(?:\s+untuk)?)\s+/i,
          ""
        )
        .trim();

  for (let i = 0; i < 2; i++) {
    if (tempatTujuan?.trim()) {
      const escaped = tempatTujuan.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      summary = summary.replace(new RegExp(`\\s+(?:di|pada)\\s+${escaped}$`, "i"), "").trim();
    }
    summary = summary.replace(/\s+(?:di|pada)\s+[^,;]+$/i, "").trim();
  }

  const result = summary || firstLine;
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function formatSumberDanaLabel(item: any): string {
  if (item?.sumber_dana_label) return String(item.sumber_dana_label).trim();
  const raw = String(item?.sumber_dana || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "other") return String(item?.sumber_dana_other || "Lainnya").trim();
  if (lower === "dipa") return "DIPA";
  if (lower === "dl1") return "DL 1 / Tidak ada biaya";
  return raw;
}

export function formatDateIndo(dateStr?: string | null): string {
  if (!dateStr) return "-";
  const cleaned = String(dateStr).split("T")[0].trim();
  const parts = cleaned.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }
  return dateStr;
}

export const isRunningSt = (item?: { status?: string | null; kategori?: string | null } | null) =>
  item?.status === "approved" || item?.status === "SEDANG DINAS" || item?.kategori === "running";

export const isCompletedSt = (item?: { status?: string | null; kategori?: string | null } | null) =>
  item?.status === "completed" || item?.kategori === "completed";

export function getLeaveStatusMeta(req: any): {
  kind: "rejected" | "approved" | "verified" | "pending";
  label: string;
  tone: ToneKey;
  canCancel: boolean;
} {
  const status = String(req?.status || "PENGAJUAN").toUpperCase().trim();
  const atasan = String(req?.status_pertimbangan_atasan || "").toUpperCase().trim();

  if (status === "DITOLAK" || status === "REJECTED" || atasan === "DITOLAK" || atasan === "REJECTED") {
    return { kind: "rejected", label: "Ditolak", tone: "danger", canCancel: false };
  }
  if (status === "DISETUJUI" || status === "APPROVED") {
    return { kind: "approved", label: "Disetujui", tone: "success", canCancel: false };
  }
  if (atasan === "DISETUJUI" || atasan === "APPROVED") {
    return {
      kind: "verified",
      label: "Verifikasi Atasan",
      tone: "info",
      canCancel: status === "PENGAJUAN" || status === "PENDING",
    };
  }
  return { kind: "pending", label: "Pengajuan", tone: "warning", canCancel: true };
}
