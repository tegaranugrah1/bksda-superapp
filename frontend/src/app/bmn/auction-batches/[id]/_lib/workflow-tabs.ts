import type { AuctionBatch, ChecklistResponse } from "../../_lib/api";

export interface WorkflowTab {
  value: string;
  label: string;
}

export function getWorkflowTabs(_batch: AuctionBatch): WorkflowTab[] {
  return [
    { value: "assets", label: "1. Aset & Nilai Taksiran" },
    { value: "documents", label: "2. Pusat Generator Dokumen" },
    { value: "realization", label: "3. Realisasi & Pindah Paket" },
    { value: "audit", label: "Riwayat Audit" },
  ];
}

export function getBlockedReason(_tabValue: string, _checklist?: ChecklistResponse | null): string | null {
  return null;
}
