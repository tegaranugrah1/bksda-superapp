export interface IBmnTag {
  id: string;
  name: string;
  label: string;
  color: string;
  description?: string | null;
  assets_count?: number;
}

export const TAG_COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-500/20",
    ring: "ring-emerald-500/30",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-500/10",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-500/20",
    ring: "ring-green-500/30",
  },
  lime: {
    bg: "bg-lime-50 dark:bg-lime-500/10",
    text: "text-lime-700 dark:text-lime-400",
    border: "border-lime-200 dark:border-lime-500/20",
    ring: "ring-lime-500/30",
  },
  teal: {
    bg: "bg-teal-50 dark:bg-teal-500/10",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-500/20",
    ring: "ring-teal-500/30",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-500/10",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-500/20",
    ring: "ring-cyan-500/30",
  },
  sky: {
    bg: "bg-sky-50 dark:bg-sky-500/10",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-500/20",
    ring: "ring-sky-500/30",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-500/20",
    ring: "ring-blue-500/30",
  },
  indigo: {
    bg: "bg-indigo-50 dark:bg-indigo-500/10",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-500/20",
    ring: "ring-indigo-500/30",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-500/20",
    ring: "ring-violet-500/30",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-500/20",
    ring: "ring-purple-500/30",
  },
  fuchsia: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10",
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    border: "border-fuchsia-200 dark:border-fuchsia-500/20",
    ring: "ring-fuchsia-500/30",
  },
  pink: {
    bg: "bg-pink-50 dark:bg-pink-500/10",
    text: "text-pink-700 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-500/20",
    ring: "ring-pink-500/30",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-500/20",
    ring: "ring-rose-500/30",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-500/20",
    ring: "ring-red-500/30",
  },
  orange: {
    bg: "bg-orange-50 dark:bg-orange-500/10",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-500/20",
    ring: "ring-orange-500/30",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-500/20",
    ring: "ring-amber-500/30",
  },
  yellow: {
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-500/20",
    ring: "ring-yellow-500/30",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    ring: "ring-slate-500/30",
  },
  gray: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    border: "border-gray-200 dark:border-gray-700",
    ring: "ring-gray-500/30",
  },
  zinc: {
    bg: "bg-zinc-100 dark:bg-zinc-800",
    text: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-zinc-700",
    ring: "ring-zinc-500/30",
  },
  neutral: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-300",
    border: "border-neutral-200 dark:border-neutral-700",
    ring: "ring-neutral-500/30",
  },
  stone: {
    bg: "bg-stone-100 dark:bg-stone-800",
    text: "text-stone-700 dark:text-stone-300",
    border: "border-stone-200 dark:border-stone-700",
    ring: "ring-stone-500/30",
  },
};

export const AVAILABLE_TAG_COLORS = [
  // Greens / Nature
  { key: "emerald", label: "Emerald (Zamrud)", class: "bg-emerald-500" },
  { key: "green", label: "Green (Hijau)", class: "bg-green-500" },
  { key: "lime", label: "Lime (Hijau Muda)", class: "bg-lime-500" },
  { key: "teal", label: "Teal (Hijau Laut)", class: "bg-teal-500" },
  // Blues / Water
  { key: "cyan", label: "Cyan (Biru Kehijauan)", class: "bg-cyan-500" },
  { key: "sky", label: "Sky (Biru Langit)", class: "bg-sky-500" },
  { key: "blue", label: "Blue (Biru)", class: "bg-blue-500" },
  { key: "indigo", label: "Indigo (Biru Tua)", class: "bg-indigo-500" },
  // Purples & Pinks
  { key: "violet", label: "Violet (Ungu Terang)", class: "bg-violet-500" },
  { key: "purple", label: "Purple (Ungu)", class: "bg-purple-500" },
  { key: "fuchsia", label: "Fuchsia (Magenta)", class: "bg-fuchsia-500" },
  { key: "pink", label: "Pink (Merah Muda)", class: "bg-pink-500" },
  // Warms / Reds / Yellows
  { key: "rose", label: "Rose (Mawar)", class: "bg-rose-500" },
  { key: "red", label: "Red (Merah)", class: "bg-red-500" },
  { key: "orange", label: "Orange (Jingga)", class: "bg-orange-500" },
  { key: "amber", label: "Amber (Kuning Emas)", class: "bg-amber-500" },
  { key: "yellow", label: "Yellow (Kuning)", class: "bg-yellow-500" },
  // Neutrals / Monochromes
  { key: "slate", label: "Slate (Abu-abu)", class: "bg-slate-500" },
  { key: "gray", label: "Gray (Abu Netral)", class: "bg-gray-500" },
  { key: "zinc", label: "Zinc (Abu Logam)", class: "bg-zinc-500" },
  { key: "neutral", label: "Neutral (Netral)", class: "bg-neutral-500" },
  { key: "stone", label: "Stone (Abu Batu)", class: "bg-stone-500" },
];

export function getTagColorClasses(color?: string) {
  return TAG_COLOR_MAP[color || "emerald"] || TAG_COLOR_MAP.emerald;
}
