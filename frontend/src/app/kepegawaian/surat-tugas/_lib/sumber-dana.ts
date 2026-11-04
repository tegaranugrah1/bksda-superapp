import { SUMBER_DANA_OPTIONS } from "./constants";
import type { StExpenseTemplate, StTemplate } from "./types";

export function normalizeSumberDana(
  value: string | null | undefined,
  customExpenseTemplates?: StExpenseTemplate[]
): string {
  if (!value) return "dipa";

  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();

  // 1. Check custom expense templates from database first
  if (customExpenseTemplates && customExpenseTemplates.length > 0) {
    const match =
      customExpenseTemplates.find(
        (t) =>
          t.code.toLowerCase() === normalized ||
          t.name.toLowerCase().replace(/\s+/g, " ").trim() === normalized ||
          String(t.id) === normalized
      ) ||
      (normalized.includes("folu")
        ? customExpenseTemplates.find(
            (t) => t.category === "hibah_folu" || t.code.toLowerCase().includes("folu")
          )
        : undefined);
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

export function isFoluSumberDana(
  sumberDana?: string | null,
  expenseTemplates?: StExpenseTemplate[]
): boolean {
  if (!sumberDana) return false;
  const lower = sumberDana.toLowerCase();
  if (lower.includes("folu")) return true;
  if (expenseTemplates && expenseTemplates.length > 0) {
    const matched = expenseTemplates.find(
      (t) =>
        t.code.toLowerCase() === lower ||
        t.name.toLowerCase().replace(/\s+/g, " ").trim() === lower ||
        String(t.id) === lower
    );
    if (matched?.category === "hibah_folu") return true;
  }
  return false;
}

/**
 * Mencari Template ST secara dinamis berdasarkan relasi `configuration.sumber_dana` di Pengaturan.
 * Jika tidak ada Template ST khusus untuk sumber dana tersebut, fallback ke Template Default (`is_default`).
 */
export function findMatchingTemplateForSumberDana(
  sumberDana: string | null | undefined,
  templates: StTemplate[],
  expenseTemplates?: StExpenseTemplate[]
): StTemplate | undefined {
  if (!templates || templates.length === 0) return undefined;
  const raw = (sumberDana || "").trim().toLowerCase();
  const normalizedCode = normalizeSumberDana(sumberDana, expenseTemplates).toLowerCase();
  const isFolu = isFoluSumberDana(sumberDana, expenseTemplates);

  const candidateCodes = new Set<string>([raw, normalizedCode].filter(Boolean));
  if (isFolu) {
    candidateCodes.add("folu");
    candidateCodes.add("folu_nc23");
  }

  // 1. Cari Template ST (selain PLH/BMN/Beda Hari) yang `configuration.sumber_dana` atau `code`-nya cocok
  const specificMatch = templates.find((t) => {
    if (["plh", "bmn", "beda_hari"].includes(t.type)) return false;
    const tplSumberDana = String(t.configuration?.sumber_dana || "").trim().toLowerCase();
    const tplCode = String(t.code || "").trim().toLowerCase();
    if (tplSumberDana && candidateCodes.has(tplSumberDana)) return true;
    if (tplCode && tplCode !== "default" && candidateCodes.has(tplCode)) return true;
    if (isFolu && (tplSumberDana.includes("folu") || tplCode.includes("folu"))) return true;
    return false;
  });

  if (specificMatch) return specificMatch;

  // 2. Fallback ke Template ST Default umum (is_default = true)
  return templates.find((t) => t.is_default);
}

export function isFundingDasarText(
  text?: string | null,
  expenseTemplates?: StExpenseTemplate[]
): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (expenseTemplates && expenseTemplates.length > 0) {
    const matchedCustom = expenseTemplates.some(
      (t) =>
        Boolean(t.dasar_text && t.dasar_text.trim()) &&
        lower.includes(t.dasar_text!.replace(/{tahun}/g, "").trim().toLowerCase().substring(0, 25))
    );
    if (matchedCustom) return true;
  }

  const STATIC_FUNDING_KEYWORDS = [
    "surat pengesahan dipa",
    "sp dipa",
    "perjanjian kerja",
    "pks.",
    "kideco",
    "jayantara",
    "orangutan protection",
    "tjiwi kimia",
    "bosf",
    "alert",
    "conservation action network",
  ];
  return STATIC_FUNDING_KEYWORDS.some((keyword) => lower.includes(keyword));
}
