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
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-2">
        <FileText className="h-4.5 w-4.5 text-zinc-400" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Nomor & Tanggal Dokumen</h2>
      </div>

      <div className="grid gap-3">
        {documentFields.map((field) => {
          const isLocked = field.requiresValuation && !canCompletePostValuationDocuments;

          return (
            <div
              key={field.key}
              className="grid gap-3 rounded-xl border border-zinc-100 bg-zinc-50/30 p-3 dark:border-zinc-800 dark:bg-zinc-900/30 md:grid-cols-[minmax(220px,1fr)_180px_160px]"
            >
              <div>
                <p className="text-xs font-semibold text-zinc-850 dark:text-zinc-100">{field.title}</p>
                <p className="mt-0.5 text-[10px] font-mono text-zinc-400">{field.key}</p>
                {isLocked && <p className="mt-1 text-[10px] font-semibold text-amber-600">Menunggu nilai taksiran lengkap</p>}
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
                  className="h-9 rounded-xl border-zinc-200 text-xs focus-visible:ring-emerald-500 dark:border-zinc-800"
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
                  className="h-9 rounded-xl border-zinc-200 text-xs focus-visible:ring-emerald-500 dark:border-zinc-800"
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
