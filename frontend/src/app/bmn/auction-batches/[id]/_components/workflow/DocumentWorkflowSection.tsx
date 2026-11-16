"use client";

import { ClipboardCheck } from "lucide-react";
import { AUCTION_DOCUMENT_WORKFLOW } from "../../_lib/document-workflow";
import type { WorkflowDocuments, WorkflowDocumentProgress } from "./types";

interface DocumentWorkflowSectionProps {
  documents: WorkflowDocuments;
  canCompletePostValuationDocuments: boolean;
  onChange: (documents: WorkflowDocuments) => void;
}

const statusOptions: { value: NonNullable<WorkflowDocumentProgress["status"]>; label: string }[] = [
  { value: "not_started", label: "Belum mulai" },
  { value: "prepared", label: "Disiapkan" },
  { value: "printed", label: "Dicetak" },
  { value: "signed", label: "Ditandatangani" },
  { value: "completed", label: "Selesai" },
  { value: "skipped", label: "Dilewati" },
];

const phaseLabels: Record<string, string> = {
  pre_valuation: "Sebelum Nilai Taksiran",
  valuation: "Nilai Taksiran",
  post_valuation: "Setelah Nilai Taksiran",
  auction: "Lelang",
};

export function DocumentWorkflowSection({ documents, canCompletePostValuationDocuments, onChange }: DocumentWorkflowSectionProps) {
  const definitions = AUCTION_DOCUMENT_WORKFLOW.filter((definition) => definition.phase !== "valuation");
  const phases = Array.from(new Set(definitions.map((definition) => definition.phase)));

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-[var(--ds-fg-muted)]" />
        <h2 className="text-sm font-bold text-[var(--ds-fg)]">Status Workflow Dokumen</h2>
      </div>

      <div className="space-y-4">
        {phases.map((phase) => (
          <section key={phase} className="space-y-2">
            <h3 className="text-xs font-bold uppercase text-[var(--ds-fg-muted)]">{phaseLabels[phase] || phase}</h3>
            <div className="grid gap-2 lg:grid-cols-2">
              {definitions
                .filter((definition) => definition.phase === phase)
                .map((definition) => {
                  const current = documents[definition.key] || {};
                  const status = current.status || "not_started";
                  const isLocked = definition.requires_valuation && !canCompletePostValuationDocuments;

                  return (
                    <div
                      key={definition.key}
                      className="rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--ds-fg)]">{definition.title}</p>
                          <p className="mt-1 text-xs font-bold uppercase text-[var(--ds-fg-muted)]">{definition.channel}</p>
                          {isLocked && <p className="mt-1 text-xs font-semibold text-[var(--ds-status-warning-fg)]">Menunggu nilai taksiran lengkap</p>}
                        </div>
                        <select
                          value={status}
                          disabled={isLocked}
                          onChange={(event) =>
                            onChange({
                              ...documents,
                              [definition.key]: {
                                ...current,
                                status: event.target.value as WorkflowDocumentProgress["status"],
                              },
                            })
                          }
                          className="h-8 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] px-2 text-xs font-semibold text-[var(--ds-fg)] outline-none focus:border-[var(--ds-accent-fg)] focus:ring-2 focus:ring-[var(--ds-accent-ring)] disabled:cursor-not-allowed disabled:bg-[var(--ds-surface-muted)] disabled:text-[var(--ds-fg-muted)]"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
