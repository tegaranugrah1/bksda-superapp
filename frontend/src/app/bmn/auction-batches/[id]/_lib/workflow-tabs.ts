import type { AuctionBatch, ChecklistResponse } from "../../_lib/api";

export interface WorkflowTab {
  value: string;
  label: string;
}

export function getWorkflowTabs(batch: AuctionBatch): WorkflowTab[] {
  return [
    { value: "assets", label: "Aset & Lot" },
    { value: "pre-docs", label: "Dokumen Awal" },
    { value: "valuation", label: "Nilai Taksiran" },
    { value: "post-docs", label: "Setelah Taksiran" },
    { value: "submit", label: "Kunci & Ajukan" },
    ...(batch.status !== "DRAFT" ? [{ value: "schedule", label: "Jadwal Lelang" }] : []),
    ...(batch.status !== "DRAFT" && batch.status !== "DIAJUKAN"
      ? [{ value: "realization", label: "Realisasi & Hasil" }]
      : []),
    { value: "audit", label: "Riwayat Audit" },
  ];
}

export function getBlockedReason(tabValue: string, checklist?: ChecklistResponse | null): string | null {
  if (!checklist) {
    return null;
  }

  if (tabValue === "valuation" && checklist.can_enter_valuation === false) {
    return "Dokumen awal dan lot harus lengkap sebelum nilai taksiran.";
  }

  if (tabValue === "post-docs" && checklist.can_complete_post_valuation_documents === false) {
    return "Semua aset harus memiliki nilai taksiran valid terlebih dahulu.";
  }

  return null;
}
