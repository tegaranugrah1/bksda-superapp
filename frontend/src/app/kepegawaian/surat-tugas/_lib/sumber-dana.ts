/**
 * Normalisasi value sumber dana dari API ke ID yang dikenal di SUMBER_DANA_OPTIONS.
 */
import { SUMBER_DANA_OPTIONS } from "./constants";

export function normalizeSumberDana(value: string | null | undefined): string {
  if (!value) return "dipa";

  const normalized = value.toLowerCase().replace(/\s+/g, " ").trim();
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

  return "other";
}
