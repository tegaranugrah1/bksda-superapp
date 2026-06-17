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
    <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-3">
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
              "flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2 transition",
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-zinc-100 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isDone
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:ring-zinc-700",
              )}
            >
              {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
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
