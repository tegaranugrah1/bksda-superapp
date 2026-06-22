import { AuctionBatchStatus } from "./api";

export function getStatusLabel(status: AuctionBatchStatus): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "DIAJUKAN":
      return "Diajukan";
    case "JADWAL_DITETAPKAN":
      return "Jadwal Ditetapkan";
    case "LELANG_ULANG":
      return "Lelang Ulang";
    case "REALISASI":
      return "Realisasi";
    case "BATAL":
      return "Batal";
    default:
      return status;
  }
}

export function getStatusColorClass(status: AuctionBatchStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700";
    case "DIAJUKAN":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-900/50";
    case "JADWAL_DITETAPKAN":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/50";
    case "LELANG_ULANG":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-900/50";
    case "REALISASI":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50";
    case "BATAL":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-900/50";
    default:
      return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700";
  }
}

export function isReadOnly(status: AuctionBatchStatus): boolean {
  return status === "REALISASI" || status === "BATAL";
}

export function canEditDraft(status: AuctionBatchStatus): boolean {
  return status === "DRAFT";
}

export function canShowScheduleTab(status: AuctionBatchStatus): boolean {
  return status !== "DRAFT";
}

export function canShowRealizationTab(status: AuctionBatchStatus): boolean {
  return status !== "DRAFT" && status !== "DIAJUKAN";
}

export function getNextActionLabel(status: AuctionBatchStatus): string | null {
  switch (status) {
    case "DRAFT":
      return "Kunci & Ajukan";
    case "DIAJUKAN":
      return "Tetapkan Jadwal";
    case "JADWAL_DITETAPKAN":
      return "Realisasi / Lelang Ulang";
    case "LELANG_ULANG":
      return "Realisasi Lelang Ulang";
    case "REALISASI":
      return null;
    case "BATAL":
      return null;
    default:
      return null;
  }
}
