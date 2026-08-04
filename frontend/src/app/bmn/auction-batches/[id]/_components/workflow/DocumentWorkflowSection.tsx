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
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="h-4.5 w-4.5 text-zinc-400" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Status Workflow Dokumen</h2>
      </div>

      <div className="space-y-5">
        {phases.map((phase) => (
          <section key={phase} className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase text-zinc-400">{phaseLabels[phase] || phase}</h3>
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
                      className="rounded-xl border border-zinc-100 bg-zinc-50/40 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-100">{definition.title}</p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase text-zinc-400">{definition.channel}</p>
                          {isLocked && <p className="mt-1 text-[10px] font-semibold text-amber-600">Menunggu nilai taksiran lengkap</p>}
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
                          className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] font-semibold text-zinc-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:disabled:bg-zinc-900"
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
