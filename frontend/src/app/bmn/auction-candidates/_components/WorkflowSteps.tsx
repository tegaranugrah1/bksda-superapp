"use client";

import { CheckCircle2, ClipboardList, FileText, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStepsProps {
  selectedCount: number;
  generatedDocumentCount: number;
}

const steps = [
  {
    key: "assets",
    label: "Pilih aset",
    Icon: ClipboardList,
  },
  {
    key: "details",
    label: "Atur detail",
    Icon: SlidersHorizontal,
  },
  {
    key: "documents",
    label: "Generate dokumen",
    Icon: FileText,
  },
];

export function WorkflowSteps({ selectedCount, generatedDocumentCount }: WorkflowStepsProps) {
  return (
    <div className="grid gap-3 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs md:grid-cols-3">
      {steps.map(({ key, label, Icon }, index) => {
        const isDone =
          (key === "assets" && selectedCount > 0) ||
          (key === "details" && selectedCount > 0) ||
          (key === "documents" && generatedDocumentCount > 0);
        const isActive =
          (key === "assets" && selectedCount === 0) ||
          (key === "details" && selectedCount > 0 && generatedDocumentCount === 0) ||
          (key === "documents" && generatedDocumentCount > 0);

        return (
          <div
            key={key}
            className={cn(
              "flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2 transition",
              isActive
                ? "border-[var(--ds-accent-soft-border)] bg-[var(--ds-accent-soft)] text-[var(--ds-accent-fg)]"
                : "border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface-muted)] text-[var(--ds-fg-secondary)]",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isDone
                  ? "bg-[var(--ds-accent-solid)] text-[var(--ds-accent-on-solid)]"
                  : "border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] text-[var(--ds-fg-muted)]",
              )}
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--ds-fg-muted)] tabular-nums">
                Langkah {index + 1}
              </p>
              <p className="text-sm font-bold">{label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
