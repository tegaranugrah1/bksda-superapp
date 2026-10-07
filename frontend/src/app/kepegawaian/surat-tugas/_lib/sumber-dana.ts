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

  const KEYWORD_MAP: Array<[string, string]> = [
    ["folu", "folu"],
    ["dipa", "dipa"],
    ["kja", "kja"],
    ["mja", "mja"],
    ["cop", "cop"],
    ["tjiwi", "tjiwi_kimia"],
    ["bosf", "bosf"],
    ["can", "can"],
    ["alert", "alert"],
    ["dl 1", "dl1"],
    ["tidak ada biaya", "dl1"],
  ];
  const matchedKey = KEYWORD_MAP.find(([keyword]) => normalized.includes(keyword));
  if (matchedKey) return matchedKey[1];

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

  const STATIC_FUNDING_KEYWORDS = [
    "dipa",
    "perjanjian kerja",
    "pks.",
    "kideco",
    "jayantara",
    "orangutan protection",
    "tjiwi kimia",
    "bosf",
    "alert",
    "conservation action network",
    "folu net sink",
    "hibah",
  ];
  return STATIC_FUNDING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

