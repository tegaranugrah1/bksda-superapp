"use client";

import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AUCTION_DOCUMENT_WORKFLOW } from "../../_lib/document-workflow";

interface DocumentNumberDateSectionProps {
  documentNumbers: Record<string, string | null>;
  documentDates: Record<string, string | null>;
  canCompletePostValuationDocuments: boolean;
  onDocumentNumbersChange: (values: Record<string, string | null>) => void;
  onDocumentDatesChange: (values: Record<string, string | null>) => void;
}

const documentFields = AUCTION_DOCUMENT_WORKFLOW
  .filter((definition) => definition.number_key || definition.date_key)
  .map((definition) => ({
    key: definition.key,
    title: definition.title,
    numberKey: definition.number_key,
    dateKey: definition.date_key,
    requiresValuation: definition.requires_valuation,
  }));

export function DocumentNumberDateSection({
  documentNumbers,
  documentDates,
  canCompletePostValuationDocuments,
  onDocumentNumbersChange,
  onDocumentDatesChange,
}: DocumentNumberDateSectionProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-[var(--ds-fg-muted)]" />
        <h2 className="text-sm font-bold text-[var(--ds-fg)]">Nomor & Tanggal Dokumen</h2>
      </div>

      <div className="grid gap-3">
        {documentFields.map((field) => {
          const isLocked = field.requiresValuation && !canCompletePostValuationDocuments;

          return (
            <div
              key={field.key}
              className="grid gap-3 rounded-lg border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] p-3 md:grid-cols-[minmax(220px,1fr)_180px_160px]"
            >
              <div>
                <p className="text-xs font-semibold text-[var(--ds-fg)]">{field.title}</p>
                <p className="mt-1 text-xs font-mono text-[var(--ds-fg-muted)]">{field.key}</p>
                {isLocked && <p className="mt-1 text-xs font-semibold text-[var(--ds-status-warning-fg)]">Menunggu nilai taksiran lengkap</p>}
              </div>
              {field.numberKey ? (
                <Input
                  placeholder="Nomor dokumen"
                  value={documentNumbers[field.numberKey] || ""}
                  disabled={isLocked}
                  onChange={(event) =>
                    onDocumentNumbersChange({
                      ...documentNumbers,
                      [field.numberKey as string]: event.target.value || null,
                    })
                  }
                  className="h-9 rounded-lg border-slate-200/80 dark:border-zinc-800 text-xs focus-visible:ring-[var(--ds-accent-fg)] tabular-nums"
                />
              ) : (
                <div />
              )}
              {field.dateKey ? (
                <Input
                  type="date"
                  value={documentDates[field.dateKey] || ""}
                  disabled={isLocked}
                  onChange={(event) =>
                    onDocumentDatesChange({
                      ...documentDates,
                      [field.dateKey as string]: event.target.value || null,
                    })
                  }
                  className="h-9 rounded-lg border-slate-200/80 dark:border-zinc-800 text-xs focus-visible:ring-[var(--ds-accent-fg)] tabular-nums"
                />
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
