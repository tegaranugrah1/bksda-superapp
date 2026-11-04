export interface BankTheme {
  border: string;
  bgBadge: string;
  text: string;
  accent: string;
  tag: string;
  iconText: string;
}

export const POPULAR_BANKS = [
  "BRI",
  "Mandiri",
  "BSI",
  "Bankaltimtara",
  "BNI",
  "BCA",
  "BTN",
  "BJB",
];

export const getBankTheme = (bank: string): BankTheme => {
  const b = (bank || "").toUpperCase().trim();
  if (b.includes("BRI")) {
    return {
      border: "border-blue-200 dark:border-blue-900/60",
      bgBadge: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-400",
      accent: "bg-blue-600 hover:bg-blue-700 text-white",
      tag: "PNS_BRI & PPPK_BRI",
      iconText: "BRI",
    };
  }
  if (b.includes("MANDIRI") || b === "MNDRI") {
    return {
      border: "border-indigo-200 dark:border-indigo-900/60",
      bgBadge: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      text: "text-indigo-700 dark:text-indigo-400",
      accent: "bg-indigo-600 hover:bg-indigo-700 text-white",
      tag: "PNS_MNDRI & PPPK_MNDRI",
      iconText: "MNDR",
    };
  }
  if (b.includes("BSI")) {
    return {
      border: "border-emerald-200 dark:border-emerald-900/60",
      bgBadge: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      accent: "bg-emerald-600 hover:bg-emerald-700 text-white",
      tag: "PNS_BSI & PPPK_BSI",
      iconText: "BSI",
    };
  }
  if (b.includes("KALTIM") || b.includes("BPD")) {
    return {
      border: "border-amber-200 dark:border-amber-900/60",
      bgBadge: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      accent: "bg-amber-600 hover:bg-amber-700 text-white",
      tag: "PNS_KALTIM & PPPK_KALTIM",
      iconText: "BPD",
    };
  }
  if (b.includes("BNI")) {
    return {
      border: "border-orange-200 dark:border-orange-900/60",
      bgBadge: "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      text: "text-orange-700 dark:text-orange-400",
      accent: "bg-orange-600 hover:bg-orange-700 text-white",
      tag: "PNS_BNI & PPPK_BNI",
      iconText: "BNI",
    };
  }
  if (b.includes("BCA")) {
    return {
      border: "border-cyan-200 dark:border-cyan-900/60",
      bgBadge: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
      text: "text-cyan-700 dark:text-cyan-400",
      accent: "bg-cyan-600 hover:bg-cyan-700 text-white",
      tag: "PNS_BCA & PPPK_BCA",
      iconText: "BCA",
    };
  }
  // Generic / Default
  const shortName = b.replace(/[^A-Z0-9]/g, "").slice(0, 4) || "BANK";
  return {
    border: "border-slate-200 dark:border-slate-800",
    bgBadge: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    text: "text-slate-700 dark:text-slate-300",
    accent: "bg-slate-800 hover:bg-slate-900 text-white",
    tag: `PNS_${shortName} & PPPK_${shortName}`,
    iconText: shortName,
  };
};
