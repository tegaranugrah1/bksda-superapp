import type { ChecklistResponse } from "../../../_lib/api";

export interface Employee {
  id: string | number;
  nama_lengkap?: string | null;
  name?: string | null;
  nip: string | null;
  jabatan: string | null;
  position?: string | null;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface WorkflowDocumentProgress {
  status?: "not_started" | "prepared" | "printed" | "signed" | "completed" | "skipped";
  notes?: string | null;
  completed_at?: string | null;
  [key: string]: unknown;
}

export type WorkflowDocuments = Record<string, WorkflowDocumentProgress>;

export interface FinalSubmitPanelProps {
  checklist?: ChecklistResponse;
  isLoading: boolean;
  isLocking: boolean;
  onLock: () => void;
}
