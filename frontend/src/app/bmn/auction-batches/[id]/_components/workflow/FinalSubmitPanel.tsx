"use client";

import { AlertTriangle, CheckCircle, Loader2, Lock, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinalSubmitPanelProps } from "./types";

export function FinalSubmitPanel({ checklist, isLoading, isLocking, onLock }: FinalSubmitPanelProps) {
  const isComplete = checklist?.can_lock_submit ?? checklist?.complete ?? false;
  const sections = checklist?.sections || [];

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-[var(--ds-surface)] p-4 shadow-xs">
      <h3 className="flex items-center gap-2 border-b border-slate-200/70 dark:border-zinc-800 pb-2 text-sm font-bold text-[var(--ds-fg)]">
        <UserCheck className="h-4 w-4 text-[var(--ds-fg-muted)]" />
        Checklist Kunci Paket
      </h3>

      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--ds-accent-fg)]" />
        </div>
      ) : (
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {sections.map((section) => (
            <section key={section.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase text-[var(--ds-fg-muted)]">{section.label}</h4>
                {section.complete ? (
                  <CheckCircle className="h-4 w-4 text-[var(--ds-accent-fg)]" />
                ) : (
                  <Lock className="h-4 w-4 text-[var(--ds-status-danger-fg)]" />
                )}
              </div>
              <div className="space-y-2">
                {section.items.map((item) => {
                  const isWarning = item.key === "document_readiness_reviewed";
                  return (
                    <div key={item.key} className="flex items-start gap-2 rounded-lg bg-[var(--ds-surface-muted)] px-3 py-2 text-xs">
                      {item.passed ? (
                        <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-[var(--ds-accent-fg)]" />
                      ) : isWarning ? (
                        <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-[var(--ds-status-warning-fg)]" />
                      ) : (
                        <Lock className="mt-1 h-4 w-4 shrink-0 text-[var(--ds-status-danger-fg)]" />
                      )}
                      <div>
                        <p className={`font-semibold ${item.passed ? "text-[var(--ds-fg)]" : isWarning ? "text-[var(--ds-status-warning-fg)]" : "text-[var(--ds-status-danger-fg)]"}`}>
                          {item.label}
                        </p>
                        {item.message && <p className="mt-1 text-xs text-[var(--ds-fg-muted)]">{item.message}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <Button
        variant="destructive"
        onClick={onLock}
        disabled={!isComplete || isLocking}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold shadow-xs"
      >
        <Lock className="h-4 w-4" />
        {isLocking ? "Mengunci..." : "Kunci & Ajukan Paket"}
      </Button>
    </div>
  );
}
