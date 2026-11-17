export interface BankTheme {
  border: string;
  bgBadge: string;
  text: string;
  accent: string;
  tag: string;
  iconText: string;
}

export const getBankTheme = (bank: string): BankTheme => {
  const b = (bank || "").toUpperCase().trim();
  if (b.includes("BRI")) {
    return {
      border: "border-[var(--ds-accent-soft-border)]",
      bgBadge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]",
      text: "text-[var(--ds-accent-fg)]",
      accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_BRI & PPPK_BRI",
      iconText: "BRI",
    };
  }
  if (b.includes("MANDIRI") || b === "MNDRI") {
    return {
      border: "border-[var(--ds-accent-soft-border)]",
      bgBadge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]",
      text: "text-[var(--ds-accent-fg)]",
      accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
      tag: "PNS_MNDRI & PPPK_MNDRI",
      iconText: "MNDR",
    };
  }
  if (b.includes("BSI")) {
    return {
      border: "border-[var(--ds-status-success-border)]",
      bgBadge: "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]",
      text: "text-[var(--ds-status-success-fg)]",
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
      border: "border-[var(--ds-accent-soft-border)]",
      bgBadge: "bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)] border-[var(--ds-accent-soft-border)]",
      text: "text-[var(--ds-accent-fg)]",
      accent: "bg-[var(--ds-accent-solid)] hover:bg-[var(--ds-accent-hover)] text-[var(--ds-accent-on-solid)]",
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
