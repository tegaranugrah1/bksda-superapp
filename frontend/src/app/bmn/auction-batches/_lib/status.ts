import { AuctionBatchStatus } from "./api";
export type { AuctionBatchStatus };

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
      return "bg-[var(--ds-status-neutral-bg)] text-[var(--ds-status-neutral-fg)] border-[var(--ds-status-neutral-border)]";
    case "DIAJUKAN":
      return "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]";
    case "JADWAL_DITETAPKAN":
      return "bg-[var(--ds-status-info-bg)] text-[var(--ds-status-info-fg)] border-[var(--ds-status-info-border)]";
    case "LELANG_ULANG":
      return "bg-[var(--ds-status-warning-bg)] text-[var(--ds-status-warning-fg)] border-[var(--ds-status-warning-border)]";
    case "REALISASI":
      return "bg-[var(--ds-status-success-bg)] text-[var(--ds-status-success-fg)] border-[var(--ds-status-success-border)]";
    case "BATAL":
      return "bg-[var(--ds-status-danger-bg)] text-[var(--ds-status-danger-fg)] border-[var(--ds-status-danger-border)]";
    default:
      return "bg-[var(--ds-status-neutral-bg)] text-[var(--ds-status-neutral-fg)] border-[var(--ds-status-neutral-border)]";
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
