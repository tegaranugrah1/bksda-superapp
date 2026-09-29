import { SUMBER_DANA_OPTIONS } from "./constants";
import type { StExpenseTemplate } from "./types";

export function normalizeSumberDana(
  value: string | null | undefined,
  customExpenseTemplates?: StExpenseTemplate[]
): string {
  if (!value) return "dipa";

  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();

  // 1. Check custom expense templates from database first
  if (customExpenseTemplates && customExpenseTemplates.length > 0) {
    const match = customExpenseTemplates.find(
      (t) =>
        t.code.toLowerCase() === normalized ||
        t.name.toLowerCase().replace(/\s+/g, " ").trim() === normalized ||
        String(t.id) === normalized
    );
    if (match) return match.code;
  }

  // 2. Check static options
  const exactId = SUMBER_DANA_OPTIONS.find((option) => option.id === normalized);
  if (exactId) return exactId.id;

  const exactLabel = SUMBER_DANA_OPTIONS.find(
    (option) => option.label.toLowerCase() === normalized,
  );
  if (exactLabel) return exactLabel.id;

  if (normalized.includes("folu")) return "folu";
  if (normalized.includes("dipa")) return "dipa";
  if (normalized.includes("kja")) return "kja";
  if (normalized.includes("mja")) return "mja";
  if (normalized.includes("cop")) return "cop";
  if (normalized.includes("tjiwi")) return "tjiwi_kimia";
  if (normalized.includes("bosf")) return "bosf";
  if (normalized.includes("can")) return "can";
  if (normalized.includes("alert")) return "alert";
  if (normalized.includes("dl 1") || normalized.includes("tidak ada biaya")) return "dl1";

  // 3. Preserve custom code if it's a slug or alphanumeric identifier (not generic sentence)
  if (value && value !== "other" && !value.includes(" ") && value.length < 50) {
    return value;
  }

  return "other";
}

export function isFundingDasarText(
  text?: string | null,
  expenseTemplates?: StExpenseTemplate[]
): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (expenseTemplates && expenseTemplates.length > 0) {
    const matchedCustom = expenseTemplates.some(
      (t) => t.dasar_text && lower.includes(t.dasar_text.replace(/{tahun}/g, "").trim().toLowerCase().substring(0, 25))
    );
    if (matchedCustom) return true;
  }

  return (
    lower.includes("surat pengesahan dipa") ||
    lower.includes("sp dipa") ||
    lower.includes("perjanjian kerjasama") ||
    lower.includes("perjanjian kerja sama") ||
    lower.includes("pks.") ||
    lower.includes("kideco") ||
    lower.includes("jayantara") ||
    lower.includes("orangutan protection") ||
    lower.includes("tjiwi kimia") ||
    lower.includes("bosf") ||
    lower.includes("alert") ||
    lower.includes("conservation action network") ||
    lower.includes("folu net sink") ||
    lower.includes("hibah")
  );
}

